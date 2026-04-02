// src/engine/agent.js
// Core Agent class — each agent is an autonomous unit with role, tools, and execution logic
// Uses Anthropic NATIVE tool_use API for real local execution (files, commands, projects)

import { v4 as uuidv4 } from "uuid";
import { ToolRegistry, WORKSPACE_ROOT } from "../tools/registry.js";
import { CONFIG } from "../config.js";

export const AgentStatus = {
  IDLE: "idle",
  THINKING: "thinking",
  EXECUTING: "executing",
  WAITING: "waiting_for_input",
  COMPLETE: "complete",
  ERROR: "error",
};

export class Agent {
  constructor({ id, name, role, systemPrompt, tools = [], config = {} }) {
    this.id = id || uuidv4();
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.config = {
      model: config.model || CONFIG.defaultModel,
      maxTokens: config.maxTokens || CONFIG.maxTokens,
      temperature: config.temperature ?? CONFIG.temperature,
      maxRetries: config.maxRetries || CONFIG.maxRetries,
      maxToolRounds: config.maxToolRounds || CONFIG.maxToolRounds,
      timeoutMs: config.timeoutMs || CONFIG.agentTimeoutMs,
    };
    this.status = AgentStatus.IDLE;
    this.history = [];
    this.output = null;
    this.metadata = {
      createdAt: new Date().toISOString(),
      executionCount: 0,
      totalTokensUsed: 0,
    };
  }

  /**
   * Build the full system prompt — NO more [TOOL:...] syntax.
   * Agents now use Anthropic native tool_use for real local execution.
   */
  buildSystemPrompt(workflowContext = {}) {
    const pipelinePosition = workflowContext.position
      ? `\nTu posición en el pipeline: Agente ${workflowContext.position} de ${workflowContext.totalAgents}.`
      : "";

    const pipelineInstructions = workflowContext.isLast
      ? "\nEres el ÚLTIMO agente. Tu output es el resultado FINAL del workflow. Asegúrate de que sea completo, pulido y listo para entregar."
      : "\nTu output será consumido por el siguiente agente. Estructura tu respuesta de forma clara y accionable.";

    return `${this.systemPrompt}

## Identidad
Eres "${this.name}". Rol: ${this.role}
${pipelinePosition}
${pipelineInstructions}

## Ejecución
Directorio: ${WORKSPACE_ROOT}
Los archivos y comandos son REALES en el disco del usuario.

## REGLAS DE VELOCIDAD (IMPORTANTES)
- ACTÚA PRIMERO, explica después brevemente
- Usa create_project para crear TODOS los archivos de un proyecto en UNA SOLA llamada
- NO escribas el código en texto antes de crear el archivo — ve directo a create_file/create_project
- NO pidas confirmación, ejecuta inmediatamente
- Respuestas de resumen: máximo 5-8 líneas al final
- Contenido COMPLETO en cada archivo, sin placeholders ni "..."`;
  }

  /**
   * Build the messages array for the API call.
   * Includes context window estimation to prevent exceeding model limits.
   */
  buildMessages(objective, contextFromPrevAgent = null, sharedMemory = null) {
    const parts = [];

    if (sharedMemory && Object.keys(sharedMemory).length > 0) {
      parts.push(
        `## Memoria Compartida del Workflow\n${JSON.stringify(sharedMemory, null, 2)}`
      );
    }

    if (contextFromPrevAgent) {
      parts.push(
        `## Output del Agente Anterior\n${contextFromPrevAgent}`
      );
    }

    parts.push(`## Objetivo Principal\n${objective}`);
    parts.push(`\nEjecuta tu rol ahora. Si necesitas crear archivos, código o ejecutar comandos, USA las herramientas disponibles.`);

    const content = parts.join("\n\n");

    // Estimate token count (~4 chars per token) and warn/truncate if too large
    const estimatedTokens = Math.ceil(content.length / 4);
    const MODEL_CONTEXT_LIMITS = {
      "claude-sonnet-4-20250514": 200000,
      "claude-opus-4-20250514": 200000,
      "claude-3-5-sonnet-20241022": 200000,
      "claude-3-haiku-20240307": 200000,
      "gemini-2.0-flash": 1000000,
      "gemini-1.5-pro": 2000000,
    };
    const modelLimit = MODEL_CONTEXT_LIMITS[this.config.model] || 200000;
    // Reserve tokens for system prompt (~2000) + max output tokens
    const availableInputTokens = modelLimit - this.config.maxTokens - 2000;

    if (estimatedTokens > availableInputTokens) {
      // Truncate context from previous agent (largest part) to fit
      const excessChars = (estimatedTokens - availableInputTokens) * 4;
      if (contextFromPrevAgent && contextFromPrevAgent.length > excessChars) {
        const truncated = contextFromPrevAgent.slice(0, contextFromPrevAgent.length - excessChars - 200);
        const truncatedParts = [];
        if (sharedMemory && Object.keys(sharedMemory).length > 0) {
          truncatedParts.push(`## Memoria Compartida del Workflow\n${JSON.stringify(sharedMemory, null, 2)}`);
        }
        truncatedParts.push(`## Output del Agente Anterior (truncado por límite de contexto)\n${truncated}\n\n[... contenido truncado para respetar el límite del modelo ...]`);
        truncatedParts.push(`## Objetivo Principal\n${objective}`);
        truncatedParts.push(`\nEjecuta tu rol ahora. Si necesitas crear archivos, código o ejecutar comandos, USA las herramientas disponibles.`);
        return [{ role: "user", content: truncatedParts.join("\n\n") }];
      }
    }

    return [{ role: "user", content }];
  }

  /**
   * Execute the agent against the Anthropic API with NATIVE tool_use loop.
   * Supports multi-turn: agent calls tools → results sent back → agent continues → until done.
   */
  async execute(anthropicClient, { objective, context = null, sharedMemory = null, workflowContext = {}, onStatusChange, onStream }) {
    this.status = AgentStatus.THINKING;
    onStatusChange?.(this.id, this.status);

    const systemPrompt = this.buildSystemPrompt(workflowContext);
    const messages = this.buildMessages(objective, context, sharedMemory);

    // Get Anthropic-format tools for this agent
    const anthropicTools = ToolRegistry.getAnthropicToolsFor(this.tools);

    // Agent-level timeout via AbortController
    const agentAbort = new AbortController();
    const agentTimeout = setTimeout(() => agentAbort.abort(), this.config.timeoutMs);

    let attempt = 0;
    let lastError = null;

    try {
    while (attempt <= this.config.maxRetries) {
      if (agentAbort.signal.aborted) {
        lastError = new Error(`Agent "${this.name}" timeout after ${this.config.timeoutMs}ms`);
        break;
      }
      try {
        this.status = AgentStatus.EXECUTING;
        onStatusChange?.(this.id, this.status);

        const startTime = Date.now();
        let allText = "";
        let allToolResults = [];
        let totalTokens = { input_tokens: 0, output_tokens: 0 };

        // ─── Tool-use loop: keep going until model stops calling tools ───
        let toolRound = 0;
        let keepGoing = true;

        while (keepGoing && toolRound < this.config.maxToolRounds) {
          if (agentAbort.signal.aborted) {
            keepGoing = false;
            break;
          }
          const requestParams = {
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            system: systemPrompt,
            messages,
          };

          if (anthropicTools.length > 0) {
            requestParams.tools = anthropicTools;
          }

          const stream = anthropicClient.messages.stream(requestParams);

          stream.on("text", (text) => {
            allText += text;
            onStream?.(this.id, text, allText);
          });

          const finalMessage = await stream.finalMessage();

          totalTokens.input_tokens += finalMessage.usage?.input_tokens || 0;
          totalTokens.output_tokens += finalMessage.usage?.output_tokens || 0;

          // Check for tool_use blocks
          const toolUseBlocks = finalMessage.content.filter((b) => b.type === "tool_use");

          if (toolUseBlocks.length > 0) {
            // Process tool calls regardless of stop_reason (handles partial max_tokens too)
            toolRound++;
            const toolResultContents = [];

            for (const block of toolUseBlocks) {
              const toolName = block.name;
              const toolInput = block.input;
              const toolId = block.id;

              // Stream a tool execution indicator
              const execMsg = `\n\n🔧 **Ejecutando:** ${toolName}`;
              allText += execMsg;
              onStream?.(this.id, execMsg, allText);

              try {
                const tool = ToolRegistry.get(toolName);
                let result;
                if (tool) {
                  result = await tool.execute(toolInput);
                } else {
                  result = `Tool "${toolName}" not found in registry`;
                }

                allToolResults.push({ tool: toolName, input: toolInput, result, status: "success" });
                toolResultContents.push({
                  type: "tool_result",
                  tool_use_id: toolId,
                  content: typeof result === "string" ? result : JSON.stringify(result),
                });

                const preview = typeof result === "string" ? result.slice(0, 300) : JSON.stringify(result).slice(0, 300);
                const okMsg = `\n✅ ${preview}\n`;
                allText += okMsg;
                onStream?.(this.id, okMsg, allText);
              } catch (err) {
                allToolResults.push({ tool: toolName, input: toolInput, result: err.message, status: "error" });
                toolResultContents.push({
                  type: "tool_result",
                  tool_use_id: toolId,
                  content: `Error: ${err.message}`,
                  is_error: true,
                });

                const errMsg = `\n❌ ${toolName}: ${err.message}\n`;
                allText += errMsg;
                onStream?.(this.id, errMsg, allText);
              }
            }

            // Feed assistant response + tool results back for next turn
            messages.push({ role: "assistant", content: finalMessage.content });
            messages.push({ role: "user", content: toolResultContents });
          } else if (finalMessage.stop_reason === "max_tokens") {
            // Model ran out of tokens mid-generation (no tool calls completed)
            // Continue the conversation so it can finish
            toolRound++;
            const continueMsg = `\n⏳ Continuando generación...\n`;
            allText += continueMsg;
            onStream?.(this.id, continueMsg, allText);

            messages.push({ role: "assistant", content: finalMessage.content });
            messages.push({ role: "user", content: "Continúa EXACTAMENTE donde te quedaste. No repitas lo anterior, no agregues explicación, solo continúa generando desde el punto de corte. Si estabas creando un archivo, usa create_file o create_project para crearlo." });
          } else {
            // end_turn or other stop reason → done
            keepGoing = false;
          }
        }

        const elapsed = Date.now() - startTime;

        // Update agent state
        this.output = allText;
        this.status = AgentStatus.COMPLETE;
        this.metadata.executionCount++;
        this.metadata.totalTokensUsed += totalTokens.input_tokens + totalTokens.output_tokens;

        this.history.push({
          timestamp: new Date().toISOString(),
          objective,
          output: allText,
          tokens: totalTokens,
          elapsed,
          toolCalls: allToolResults.length,
          toolRounds: toolRound,
          attempt,
        });

        onStatusChange?.(this.id, this.status);

        return {
          agentId: this.id,
          agentName: this.name,
          output: allText,
          tokens: totalTokens,
          elapsed,
          toolCalls: allToolResults,
          toolResults: allToolResults,
          createdFiles: ToolRegistry.getCreatedFiles(),
          status: "success",
        };
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt <= this.config.maxRetries) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    // All retries exhausted
    } finally {
      clearTimeout(agentTimeout);
    }

    this.status = AgentStatus.ERROR;
    onStatusChange?.(this.id, this.status);

    return {
      agentId: this.id,
      agentName: this.name,
      output: null,
      error: lastError?.message || "Unknown error after retries",
      status: "error",
    };
  }

  /**
   * Serialize agent for API responses
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      tools: this.tools,
      status: this.status,
      config: this.config,
      metadata: this.metadata,
      historyLength: this.history.length,
      lastOutput: this.output?.slice(0, 200),
    };
  }

  /**
   * Reset agent state for re-execution
   */
  reset() {
    this.status = AgentStatus.IDLE;
    this.output = null;
  }
}
