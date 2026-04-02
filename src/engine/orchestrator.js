// src/engine/orchestrator.js
// Orchestrator — manages multi-agent workflow execution
// Supports sequential pipelines, parallel fan-out/fan-in, and conditional routing

import { v4 as uuidv4 } from "uuid";
import { Agent, AgentStatus } from "./agent.js";
import { SharedMemory } from "./memory.js";
import { ToolRegistry } from "../tools/registry.js";
import { CONFIG } from "../config.js";
import { WorkflowStore } from "./persistence.js";

export const WorkflowStatus = {
  CREATED: "created",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
  ABORTED: "aborted",
};

export const ExecutionMode = {
  SEQUENTIAL: "sequential",   // A → B → C
  PARALLEL: "parallel",       // A, B, C all at once, then merge
  FAN_OUT_IN: "fan_out_in",   // A → (B, C, D) → E
};

export class Orchestrator {
  constructor(anthropicClient, logger) {
    this.client = anthropicClient;
    this.logger = logger;
    this.workflows = new Map();
    this.activeExecutions = new Map();
  }

  /**
   * Create a new workflow from a definition
   */
  createWorkflow({ name, objective, agents, mode = ExecutionMode.SEQUENTIAL, config = {} }) {
    const workflowId = uuidv4();
    
    const agentInstances = agents.map((agentDef) => 
      new Agent({
        id: agentDef.id || uuidv4(),
        name: agentDef.name,
        role: agentDef.role,
        systemPrompt: agentDef.systemPrompt || this.buildDefaultPrompt(agentDef),
        tools: agentDef.tools || [],
        config: agentDef.config || {},
      })
    );

    const workflow = {
      id: workflowId,
      name,
      objective,
      agents: agentInstances,
      mode,
      config: {
        timeout: config.timeout || CONFIG.workflowTimeoutMs,
        onFailure: config.onFailure || "stop", // "stop" | "skip" | "retry"
        maxParallel: config.maxParallel || 5,
        ...config,
      },
      status: WorkflowStatus.CREATED,
      memory: new SharedMemory(),
      results: [],
      logs: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
    };

    this.workflows.set(workflowId, workflow);
    this.log(workflow, "system", `Workflow "${name}" creado con ${agentInstances.length} agentes [${mode}]`);

    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId, { onEvent }) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (workflow.status === WorkflowStatus.RUNNING) throw new Error("Workflow already running");

    workflow.status = WorkflowStatus.RUNNING;
    workflow.startedAt = new Date().toISOString();

    // Clear previous file session
    ToolRegistry.clearSession();

    // Set up abort controller
    const abortController = new AbortController();
    this.activeExecutions.set(workflowId, abortController);

    // Timeout guard
    const timeoutId = setTimeout(() => {
      abortController.abort();
      workflow.status = WorkflowStatus.FAILED;
      workflow.error = "Execution timeout";
      this.log(workflow, "error", `Workflow abortado por timeout (${workflow.config.timeout}ms)`);
    }, workflow.config.timeout);

    const emitEvent = (event) => {
      this.log(workflow, event.type, event.message);
      onEvent?.(event);
    };

    try {
      emitEvent({
        type: "workflow_start",
        workflowId,
        message: `Iniciando workflow "${workflow.name}" con ${workflow.agents.length} agentes`,
        timestamp: new Date().toISOString(),
      });

      let finalOutput;

      switch (workflow.mode) {
        case ExecutionMode.SEQUENTIAL:
          finalOutput = await this.executeSequential(workflow, abortController.signal, emitEvent);
          break;
        case ExecutionMode.PARALLEL:
          finalOutput = await this.executeParallel(workflow, abortController.signal, emitEvent);
          break;
        case ExecutionMode.FAN_OUT_IN:
          finalOutput = await this.executeFanOutIn(workflow, abortController.signal, emitEvent);
          break;
        default:
          finalOutput = await this.executeSequential(workflow, abortController.signal, emitEvent);
      }

      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        workflow.status = WorkflowStatus.ABORTED;
      } else {
        workflow.status = WorkflowStatus.COMPLETED;
      }

      workflow.completedAt = new Date().toISOString();

      // Persist completed workflow to SQLite
      try { WorkflowStore.save({ ...workflow, finalOutput }); } catch (e) { this.logger?.warn("Failed to persist workflow: " + e.message); }

      emitEvent({
        type: "workflow_complete",
        workflowId,
        message: `Workflow completado — ${workflow.results.length} agentes ejecutados`,
        finalOutput,
        allResults: workflow.results.map((r) => ({
          agentId: r.agentId,
          agentName: r.agentName,
          output: r.output,
          tokens: r.tokens,
          elapsed: r.elapsed,
          status: r.status,
        })),
        createdFiles: ToolRegistry.getCreatedFiles(),
        timestamp: new Date().toISOString(),
      });

      return {
        workflowId,
        status: workflow.status,
        results: workflow.results,
        finalOutput,
        createdFiles: ToolRegistry.getCreatedFiles(),
        memory: workflow.memory.getAll(),
        elapsed: new Date(workflow.completedAt) - new Date(workflow.startedAt),
        logs: workflow.logs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      workflow.status = WorkflowStatus.FAILED;
      workflow.error = error.message;
      workflow.completedAt = new Date().toISOString();

      // Persist failed workflow
      try { WorkflowStore.save({ ...workflow, finalOutput: null }); } catch (e) { this.logger?.warn("Failed to persist workflow: " + e.message); }

      emitEvent({
        type: "workflow_error",
        workflowId,
        message: `Workflow falló: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    } finally {
      this.activeExecutions.delete(workflowId);
    }
  }

  /**
   * Sequential execution: A → B → C
   * Each agent receives the output of the previous one
   */
  async executeSequential(workflow, signal, emitEvent) {
    let previousOutput = null;

    for (let i = 0; i < workflow.agents.length; i++) {
      if (signal.aborted) break;

      const agent = workflow.agents[i];
      const isLast = i === workflow.agents.length - 1;

      emitEvent({
        type: "agent_start",
        workflowId: workflow.id,
        agentId: agent.id,
        agentName: agent.name,
        position: i + 1,
        message: `${agent.name} iniciando ejecución (${i + 1}/${workflow.agents.length})`,
        timestamp: new Date().toISOString(),
      });

      const result = await agent.execute(this.client, {
        objective: workflow.objective,
        context: previousOutput,
        sharedMemory: workflow.memory.getAll(),
        workflowContext: {
          position: i + 1,
          totalAgents: workflow.agents.length,
          isLast,
        },
        onStatusChange: (agentId, status) => {
          emitEvent({
            type: "agent_status",
            workflowId: workflow.id,
            agentId,
            agentName: agent.name,
            status,
            message: `${agent.name} → ${status}`,
            timestamp: new Date().toISOString(),
          });
        },
        onStream: (agentId, chunk, fullText) => {
          emitEvent({
            type: "agent_stream",
            workflowId: workflow.id,
            agentId,
            agentName: agent.name,
            chunk,
            fullTextLength: fullText.length,
            timestamp: new Date().toISOString(),
          });
        },
      });

      workflow.results.push(result);

      if (result.status === "error") {
        emitEvent({
          type: "agent_error",
          workflowId: workflow.id,
          agentId: agent.id,
          agentName: agent.name,
          error: result.error,
          message: `${agent.name} falló: ${result.error}`,
          timestamp: new Date().toISOString(),
        });

        if (workflow.config.onFailure === "stop") {
          throw new Error(`Agent "${agent.name}" failed: ${result.error}`);
        }
        // If "skip", continue to next agent with same context
        continue;
      }

      // Store agent output in shared memory
      workflow.memory.set(`agent:${agent.id}:output`, result.output);
      workflow.memory.set(`agent:${agent.id}:tokens`, result.tokens);

      previousOutput = result.output;

      emitEvent({
        type: "agent_complete",
        workflowId: workflow.id,
        agentId: agent.id,
        agentName: agent.name,
        output: result.output,
        outputPreview: result.output?.slice(0, 300),
        tokens: result.tokens,
        elapsed: result.elapsed,
        message: `${agent.name} completó en ${result.elapsed}ms (${result.tokens?.output_tokens || 0} tokens)`,
        timestamp: new Date().toISOString(),
      });
    }

    return previousOutput;
  }

  /**
   * Parallel execution: A, B, C all at once
   * All agents receive the same objective, outputs are merged
   */
  async executeParallel(workflow, signal, emitEvent) {
    emitEvent({
      type: "parallel_start",
      workflowId: workflow.id,
      message: `Ejecutando ${workflow.agents.length} agentes en paralelo`,
      timestamp: new Date().toISOString(),
    });

    const promises = workflow.agents.map((agent, i) =>
      agent.execute(this.client, {
        objective: workflow.objective,
        context: null,
        sharedMemory: workflow.memory.getAll(),
        workflowContext: {
          position: i + 1,
          totalAgents: workflow.agents.length,
          isLast: false,
          executionMode: "parallel",
        },
        onStatusChange: (agentId, status) => {
          emitEvent({
            type: "agent_status",
            workflowId: workflow.id,
            agentId,
            agentName: agent.name,
            status,
            message: `[Paralelo] ${agent.name} → ${status}`,
            timestamp: new Date().toISOString(),
          });
        },
        onStream: (agentId, chunk) => {
          emitEvent({
            type: "agent_stream",
            workflowId: workflow.id,
            agentId,
            agentName: agent.name,
            chunk,
            timestamp: new Date().toISOString(),
          });
        },
      })
    );

    const results = await Promise.allSettled(promises);
    
    const successfulResults = results
      .filter((r) => r.status === "fulfilled" && r.value.status === "success")
      .map((r) => r.value);

    workflow.results.push(...successfulResults);

    // Merge all outputs
    const mergedOutput = successfulResults
      .map((r) => `## ${r.agentName}\n${r.output}`)
      .join("\n\n---\n\n");

    return mergedOutput;
  }

  /**
   * Fan-out/Fan-in: First agent → parallel middle agents → last agent synthesizes
   */
  async executeFanOutIn(workflow, signal, emitEvent) {
    if (workflow.agents.length < 3) {
      return this.executeSequential(workflow, signal, emitEvent);
    }

    const firstAgent = workflow.agents[0];
    const middleAgents = workflow.agents.slice(1, -1);
    const lastAgent = workflow.agents[workflow.agents.length - 1];

    // Step 1: First agent decomposes the objective
    emitEvent({
      type: "fan_out_start",
      message: `Fan-out: ${firstAgent.name} descomponiendo objetivo`,
      timestamp: new Date().toISOString(),
    });

    const firstResult = await firstAgent.execute(this.client, {
      objective: workflow.objective,
      sharedMemory: workflow.memory.getAll(),
      workflowContext: { position: 1, totalAgents: workflow.agents.length, isLast: false },
      onStatusChange: (id, status) => emitEvent({ type: "agent_status", agentId: id, agentName: firstAgent.name, status, message: `${firstAgent.name} → ${status}`, timestamp: new Date().toISOString() }),
    });
    workflow.results.push(firstResult);
    workflow.memory.set(`agent:${firstAgent.id}:output`, firstResult.output);

    // Step 2: Middle agents execute in parallel with first agent's output as context
    emitEvent({
      type: "fan_parallel",
      message: `Ejecutando ${middleAgents.length} agentes en paralelo`,
      timestamp: new Date().toISOString(),
    });

    const parallelPromises = middleAgents.map((agent, i) =>
      agent.execute(this.client, {
        objective: workflow.objective,
        context: firstResult.output,
        sharedMemory: workflow.memory.getAll(),
        workflowContext: { position: i + 2, totalAgents: workflow.agents.length, isLast: false, executionMode: "parallel" },
        onStatusChange: (id, status) => emitEvent({ type: "agent_status", agentId: id, agentName: agent.name, status, message: `[Paralelo] ${agent.name} → ${status}`, timestamp: new Date().toISOString() }),
      })
    );

    const parallelResults = await Promise.allSettled(parallelPromises);
    const successParallel = parallelResults
      .filter((r) => r.status === "fulfilled" && r.value.status === "success")
      .map((r) => r.value);
    workflow.results.push(...successParallel);

    // Step 3: Last agent synthesizes everything
    const mergedContext = successParallel
      .map((r) => `### ${r.agentName}\n${r.output}`)
      .join("\n\n");

    emitEvent({
      type: "fan_in",
      message: `Fan-in: ${lastAgent.name} sintetizando resultados`,
      timestamp: new Date().toISOString(),
    });

    const lastResult = await lastAgent.execute(this.client, {
      objective: workflow.objective,
      context: `## Resultado del Análisis Inicial (${firstAgent.name})\n${firstResult.output}\n\n## Resultados Paralelos\n${mergedContext}`,
      sharedMemory: workflow.memory.getAll(),
      workflowContext: { position: workflow.agents.length, totalAgents: workflow.agents.length, isLast: true },
      onStatusChange: (id, status) => emitEvent({ type: "agent_status", agentId: id, agentName: lastAgent.name, status, message: `${lastAgent.name} → ${status}`, timestamp: new Date().toISOString() }),
    });
    workflow.results.push(lastResult);

    return lastResult.output;
  }

  /**
   * Abort a running workflow
   */
  abortWorkflow(workflowId) {
    const controller = this.activeExecutions.get(workflowId);
    if (controller) {
      controller.abort();
      const workflow = this.workflows.get(workflowId);
      if (workflow) {
        workflow.status = WorkflowStatus.ABORTED;
        workflow.agents.forEach((a) => {
          if (a.status === AgentStatus.EXECUTING || a.status === AgentStatus.THINKING) {
            a.status = AgentStatus.IDLE;
          }
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Get workflow state
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * List all workflows
   */
  listWorkflows() {
    return Array.from(this.workflows.values()).map((w) => ({
      id: w.id,
      name: w.name,
      status: w.status,
      agentCount: w.agents.length,
      mode: w.mode,
      createdAt: w.createdAt,
      completedAt: w.completedAt,
    }));
  }

  /**
   * Build a default system prompt for an agent
   */
  buildDefaultPrompt(agentDef) {
    return `Eres un agente autónomo especializado en: ${agentDef.role || agentDef.name}.
Tu objetivo es ejecutar tu rol con precisión y entregar resultados accionables.
Responde siempre en español profesional.`;
  }

  /**
   * Internal logging
   */
  log(workflow, type, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    workflow.logs.push(entry);
    this.logger?.info({ workflowId: workflow.id, ...entry });
  }
}
