// src/api/routes.js
// REST API routes for AgentForge Studio

import { Router } from "express";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, resolve, normalize } from "path";
import { ExecutionMode } from "../engine/orchestrator.js";
import { getPreset, listPresets } from "../engine/presets.js";
import { ToolRegistry, WORKSPACE_ROOT } from "../tools/registry.js";
import { CONFIG } from "../config.js";
import { WorkflowStore, ChatStore } from "../engine/persistence.js";
import { v4 as uuidv4 } from "uuid";

// ─── Google Gemini Chat Handler ─────────────────────
async function handleGoogleChat(googleClient, model, systemPrompt, messages, tools, maxTokens, send, aborted, guardrails, onOutputCheck) {
  // Convert messages from Anthropic format to Gemini format
  const geminiHistory = [];
  for (const m of messages) {
    if (m.role === "user") {
      geminiHistory.push({ role: "user", parts: [{ text: m.content || " " }] });
    } else if (m.role === "assistant") {
      geminiHistory.push({ role: "model", parts: [{ text: m.content || " " }] });
    }
  }

  // The last message should be the user's - pop it for sendMessageStream
  const lastMessage = geminiHistory.pop();
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("No se encontró un mensaje de usuario para enviar.");
  }

  const geminiModel = googleClient.getGenerativeModel({
    model: model || "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
    },
  });

  const chat = geminiModel.startChat({
    history: geminiHistory,
  });

  const result = await chat.sendMessageStream(lastMessage.parts[0].text);

  let fullResponseText = "";
  for await (const chunk of result.stream) {
    if (aborted) break;
    const text = chunk.text();
    if (text) {
      fullResponseText += text;
      send("text", { text });
    }
  }

  if (onOutputCheck) onOutputCheck(fullResponseText);
}

// ─── Schema Validation Helpers ─────────────────────
function validateChatBody(body) {
  const errors = [];
  const { messages, systemPrompt } = body;
  if (!Array.isArray(messages) || messages.length === 0) errors.push("messages array is required");
  else {
    if (messages.length > CONFIG.maxMessagesPerChat) errors.push(`Demasiados mensajes (máx ${CONFIG.maxMessagesPerChat}).`);
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m.role || typeof m.content !== "string") { errors.push(`Mensaje [${i}]: debe tener role (string) y content (string).`); break; }
      if (m.content.length > CONFIG.maxMessageLength) { errors.push(`Mensaje [${i}]: demasiado largo (máx ${CONFIG.maxMessageLength} chars).`); break; }
    }
  }
  if (systemPrompt != null && typeof systemPrompt !== "string") errors.push("systemPrompt must be a string");
  return errors;
}

function validateWorkflowBody(body) {
  const errors = [];
  const { objective, agents, presetId, name, mode, config: wfConfig } = body;
  if (!objective || typeof objective !== "string") errors.push("objective is required (string)");
  else if (objective.length > CONFIG.maxMessageLength) errors.push(`objective demasiado largo (máx ${CONFIG.maxMessageLength} chars)`);
  if (!presetId) {
    if (!Array.isArray(agents) || agents.length === 0) errors.push("agents array is required (or use presetId)");
    else {
      if (agents.length > CONFIG.maxWorkflowAgents) errors.push(`Demasiados agentes (máx ${CONFIG.maxWorkflowAgents})`);
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        if (!a.name || typeof a.name !== "string") { errors.push(`Agent [${i}]: name is required (string)`); break; }
        if (!a.role || typeof a.role !== "string") { errors.push(`Agent [${i}]: role is required (string)`); break; }
        if (a.name.length > 100) { errors.push(`Agent [${i}]: name too long (max 100)`); break; }
        if (a.systemPrompt && a.systemPrompt.length > 10000) { errors.push(`Agent [${i}]: systemPrompt too long (max 10000)`); break; }
      }
    }
  }
  if (name !== undefined && (typeof name !== "string" || name.length > 200)) errors.push("name must be a string (max 200 chars)");
  if (mode !== undefined && !["sequential", "parallel", "fan_out_in"].includes(mode)) errors.push("mode must be sequential, parallel, or fan_out_in");
  return errors;
}

export function createRoutes(orchestrator, wsManager, getClient, dynamicSettings, guardrails) {
  const router = Router();

  // ─── Health ───────────────────────────────────────────
  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      version: "1.0.0",
      engine: "AgentForge Studio",
      uptime: process.uptime(),
    });
  });

  // ─── Chat (SSE streaming with tool use) ───────────────
  router.post("/chat", async (req, res) => {
    const { messages, systemPrompt } = req.body;
    const activeClient = getClient?.();

    if (!activeClient || !activeClient.client) {
      return res.status(400).json({ error: "No hay API key configurada. Ve a Settings para agregar tu API key." });
    }

    const { provider, client } = activeClient;
    const chatErrors = validateChatBody(req.body);
    if (chatErrors.length > 0) {
      return res.status(400).json({ error: chatErrors[0] });
    }

    // ─── Guardrails: Input Rail ─────────────────────
    if (guardrails) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.content) {
        const inputCheck = guardrails.checkInput(lastUserMsg.content);
        if (!inputCheck.allowed) {
          return res.status(400).json({
            error: "Guardrail: input blocked",
            guardrail: true,
            violations: guardrails.formatViolationsForClient(inputCheck.violations),
          });
        }
        // Send warnings (PII etc) as part of response later
        if (inputCheck.violations.length > 0) {
          req._guardrailWarnings = guardrails.formatViolationsForClient(inputCheck.violations);
        }
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => { aborted = true; });

    const send = (event, data) => {
      if (!aborted) {
        try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
      }
    };

    // Send guardrail warnings if any
    if (req._guardrailWarnings) {
      send("guardrail", { type: "warning", violations: req._guardrailWarnings });
    }

    const chatSystem = systemPrompt || `Eres un asistente AI avanzado integrado en AgentForge Studio. Tienes acceso a herramientas reales:

🔍 web_search — Buscar información actualizada en internet
🌐 fetch_url — Leer contenido de páginas web/URLs
📄 create_file — Crear archivos reales en disco (código, docs, configs)
✏️ edit_file — Editar archivos existentes
📁 create_project — Crear proyectos completos con múltiples archivos
🖥️ run_command — Ejecutar comandos de terminal (npm, python, git, etc.)
📂 read_file / list_files — Leer y explorar archivos del workspace

Instrucciones:
- Responde en el MISMO IDIOMA que el usuario
- Para información actualizada, USA web_search
- Para leer una URL, USA fetch_url
- Para crear código/archivos, USA create_file o create_project
- Sé conciso pero completo. Actúa primero, explica después.
- Si buscas en internet, menciona las fuentes
- Contenido COMPLETO en archivos, sin placeholders ni "..."
- Usa create_project para crear TODOS los archivos de un proyecto en UNA SOLA llamada
- IMPORTANTE: Crea exactamente lo que el usuario pide. NO copies ni te inspires en proyectos existentes del workspace. Cada solicitud es independiente.`;

    const tools = ToolRegistry.getAllRealTools();
    const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
    const model = dynamicSettings?.model || CONFIG.defaultModel;
    const maxTokens = CONFIG.maxTokens;

    try {
      if (provider === "google") {
        // ─── Google Gemini Streaming ──────────────────
        await handleGoogleChat(client, model, chatSystem, apiMessages, tools, maxTokens, send, aborted, guardrails, fullResponseText => {
          if (guardrails && fullResponseText) {
            const outputCheck = guardrails.checkOutput(fullResponseText);
            if (outputCheck.violations.length > 0) {
              send("guardrail", {
                type: outputCheck.allowed ? "warning" : "blocked",
                violations: guardrails.formatViolationsForClient(outputCheck.violations),
              });
            }
          }
        });
        send("done", { rounds: 0, model });
        res.end();
      } else {
        // ─── Anthropic Streaming (original) ───────────
        let keepGoing = true;
        let round = 0;
        let fullResponseText = "";

        while (keepGoing && round < 25 && !aborted) {
          const requestParams = {
            model,
            max_tokens: maxTokens,
            temperature: 0.4,
            system: chatSystem,
            messages: apiMessages,
          };
          if (tools.length > 0) requestParams.tools = tools;

          const stream = client.messages.stream(requestParams);
          stream.on("text", (text) => {
            fullResponseText += text;
            send("text", { text });
          });

          const finalMessage = await stream.finalMessage();
          const toolUseBlocks = finalMessage.content.filter((b) => b.type === "tool_use");

          if (toolUseBlocks.length > 0 && !aborted) {
            round++;
            const toolResults = [];

            for (const block of toolUseBlocks) {
              send("tool_start", { tool: block.name, input: block.input, id: block.id });

              try {
                const tool = ToolRegistry.get(block.name);
                const result = tool ? await tool.execute(block.input) : `Tool "${block.name}" not found`;
                const resultStr = typeof result === "string" ? result : JSON.stringify(result);
                send("tool_result", { tool: block.name, result: resultStr.slice(0, 2000), id: block.id, status: "success" });
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultStr });
              } catch (err) {
                send("tool_result", { tool: block.name, result: err.message, id: block.id, status: "error" });
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true });
              }
            }

            apiMessages.push({ role: "assistant", content: finalMessage.content });
            apiMessages.push({ role: "user", content: toolResults });
          } else if (finalMessage.stop_reason === "max_tokens" && !aborted) {
            round++;
            apiMessages.push({ role: "assistant", content: finalMessage.content });
            apiMessages.push({ role: "user", content: "Continúa exactamente donde te quedaste. No repitas." });
          } else {
            keepGoing = false;
          }
        }

        // ─── Guardrails: Output Rail ────────────────────
        if (guardrails && fullResponseText) {
          const outputCheck = guardrails.checkOutput(fullResponseText);
          if (outputCheck.violations.length > 0) {
            send("guardrail", {
              type: outputCheck.allowed ? "warning" : "blocked",
              violations: guardrails.formatViolationsForClient(outputCheck.violations),
            });
          }
        }

        send("done", { rounds: round, model });
        res.end();
      }
    } catch (err) {
      send("error", { message: err.message });
      res.end();
    }
  });

  // ─── Presets ──────────────────────────────────────────
  router.get("/presets", (req, res) => {
    res.json({ presets: listPresets() });
  });

  router.get("/presets/:id", (req, res) => {
    const preset = getPreset(req.params.id);
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
  });

  // ─── Tools ────────────────────────────────────────────
  router.get("/tools", (req, res) => {
    res.json({ tools: ToolRegistry.list() });
  });

  // ─── Workflows ────────────────────────────────────────

  // List all workflows
  router.get("/workflows", (req, res) => {
    res.json({ workflows: orchestrator.listWorkflows() });
  });

  // Get specific workflow
  router.get("/workflows/:id", (req, res) => {
    const workflow = orchestrator.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    
    res.json({
      id: workflow.id,
      name: workflow.name,
      objective: workflow.objective,
      status: workflow.status,
      mode: workflow.mode,
      agents: workflow.agents.map((a) => a.toJSON()),
      results: workflow.results.map((r) => ({
        agentId: r.agentId,
        agentName: r.agentName,
        status: r.status,
        output: r.output,
        outputPreview: r.output?.slice(0, 500),
        tokens: r.tokens,
        elapsed: r.elapsed,
      })),
      memory: workflow.memory.getAll(),
      logs: workflow.logs.slice(-50),
      createdAt: workflow.createdAt,
      completedAt: workflow.completedAt,
      error: workflow.error,
    });
  });

  // Create and execute a workflow
  router.post("/workflows", async (req, res) => {
    const { name, objective, agents, mode, presetId, config } = req.body;

    const wfErrors = validateWorkflowBody(req.body);
    if (wfErrors.length > 0) {
      return res.status(400).json({ error: wfErrors[0] });
    }

    try {
      let workflowDef;

      if (presetId) {
        // Load from preset
        const preset = getPreset(presetId);
        if (!preset) return res.status(404).json({ error: `Preset "${presetId}" not found` });
        
        workflowDef = {
          name: name || preset.name,
          objective,
          agents: preset.agents,
          mode: preset.mode || ExecutionMode.SEQUENTIAL,
          config,
        };
      } else {
        // Custom workflow
        if (!agents || agents.length === 0) {
          return res.status(400).json({ error: "agents array is required (or use presetId)" });
        }

        workflowDef = {
          name: name || `Workflow ${new Date().toISOString()}`,
          objective,
          agents,
          mode: mode || ExecutionMode.SEQUENTIAL,
          config,
        };
      }

      const workflow = orchestrator.createWorkflow(workflowDef);

      // Execute asynchronously — stream events through WebSocket
      const executionPromise = orchestrator.executeWorkflow(workflow.id, {
        onEvent: (event) => {
          // Broadcast to all connected WebSocket clients watching this workflow
          wsManager?.broadcast(workflow.id, event);
        },
      });

      // Return immediately with workflow ID — client connects via WebSocket for updates
      res.status(201).json({
        workflowId: workflow.id,
        status: workflow.status,
        message: "Workflow created and executing. Connect via WebSocket for real-time updates.",
        wsUrl: `ws://${req.headers.host}/ws/${workflow.id}`,
        agents: workflow.agents.map((a) => a.toJSON()),
      });

      // Handle completion/error in background
      executionPromise
        .then((result) => {
          wsManager?.broadcast(workflow.id, {
            type: "workflow_final_result",
            workflowId: workflow.id,
            ...result,
          });
        })
        .catch((err) => {
          wsManager?.broadcast(workflow.id, {
            type: "workflow_error",
            workflowId: workflow.id,
            error: err.message,
          });
        });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute a workflow synchronously (wait for completion)
  router.post("/workflows/sync", async (req, res) => {
    const { name, objective, agents, mode, presetId, config } = req.body;

    const wfErrors = validateWorkflowBody(req.body);
    if (wfErrors.length > 0) {
      return res.status(400).json({ error: wfErrors[0] });
    }

    try {
      let workflowDef;

      if (presetId) {
        const preset = getPreset(presetId);
        if (!preset) return res.status(404).json({ error: `Preset "${presetId}" not found` });
        workflowDef = {
          name: name || preset.name,
          objective,
          agents: preset.agents,
          mode: preset.mode || ExecutionMode.SEQUENTIAL,
          config,
        };
      } else {
        if (!agents || agents.length === 0) {
          return res.status(400).json({ error: "agents array is required" });
        }
        workflowDef = { name: name || "Sync Workflow", objective, agents, mode: mode || ExecutionMode.SEQUENTIAL, config };
      }

      const workflow = orchestrator.createWorkflow(workflowDef);
      const result = await orchestrator.executeWorkflow(workflow.id, {
        onEvent: (event) => wsManager?.broadcast(workflow.id, event),
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Abort a workflow
  router.post("/workflows/:id/abort", (req, res) => {
    const success = orchestrator.abortWorkflow(req.params.id);
    if (success) {
      res.json({ message: "Workflow aborted" });
    } else {
      res.status(404).json({ error: "Workflow not found or not running" });
    }
  });

  // Get workflow logs
  router.get("/workflows/:id/logs", (req, res) => {
    const workflow = orchestrator.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    res.json({ logs: workflow.logs });
  });

  // Get workflow results
  router.get("/workflows/:id/results", (req, res) => {
    const workflow = orchestrator.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    res.json({
      status: workflow.status,
      results: workflow.results,
      memory: workflow.memory.getAll(),
    });
  });

  // ─── Workspace / Created Files ────────────────────────

  // List all files in workspace (recursive)
  router.get("/workspace/files", async (req, res) => {
    try {
      if (!existsSync(WORKSPACE_ROOT)) {
        return res.json({ files: [], root: WORKSPACE_ROOT });
      }
      const files = [];
      async function walk(dir) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          const relPath = relative(WORKSPACE_ROOT, fullPath).replace(/\\/g, "/");
          if (entry.isDirectory()) {
            files.push({ path: relPath, type: "directory" });
            await walk(fullPath);
          } else {
            const info = await stat(fullPath);
            files.push({ path: relPath, type: "file", size: info.size, modified: info.mtime });
          }
        }
      }
      await walk(WORKSPACE_ROOT);
      res.json({ files, root: WORKSPACE_ROOT, createdByAgents: ToolRegistry.getCreatedFiles() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Read a specific file from workspace
  router.get("/workspace/file", async (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) return res.status(400).json({ error: "path query param required" });
      const fullPath = resolve(WORKSPACE_ROOT, normalize(filePath));
      if (!fullPath.startsWith(WORKSPACE_ROOT)) return res.status(403).json({ error: "Access denied" });
      if (!existsSync(fullPath)) return res.status(404).json({ error: "File not found" });
      const content = await readFile(fullPath, "utf-8");
      res.json({ path: filePath, content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download a file from workspace
  router.get("/workspace/download", (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: "path query param required" });
    const fullPath = resolve(WORKSPACE_ROOT, normalize(filePath));
    if (!fullPath.startsWith(WORKSPACE_ROOT)) return res.status(403).json({ error: "Access denied" });
    if (!existsSync(fullPath)) return res.status(404).json({ error: "File not found" });
    res.download(fullPath);
  });

  // ─── Guardrails API ─────────────────────────────────

  // Get guardrails config & stats
  router.get("/guardrails", (req, res) => {
    if (!guardrails) return res.json({ enabled: false });
    res.json({
      config: guardrails.getConfig(),
      stats: guardrails.getStats(),
    });
  });

  // Update guardrails config
  router.post("/guardrails", (req, res) => {
    if (!guardrails) return res.status(503).json({ error: "Guardrails not available" });
    guardrails.updateConfig(req.body);
    res.json({ success: true, config: guardrails.getConfig() });
  });

  // Get audit log
  router.get("/guardrails/audit", (req, res) => {
    if (!guardrails) return res.json({ log: [] });
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json({ log: guardrails.getAuditLog(limit) });
  });

  // ─── Chat History Persistence ──────────────────────

  // List conversations
  router.get("/conversations", (req, res) => {
    try {
      const conversations = ChatStore.listConversations();
      res.json({ conversations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create conversation
  router.post("/conversations", (req, res) => {
    try {
      const id = uuidv4();
      const title = req.body.title || "New chat";
      const conv = ChatStore.createConversation(id, title);
      res.status(201).json(conv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get conversation messages
  router.get("/conversations/:id/messages", (req, res) => {
    try {
      const conv = ChatStore.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      const messages = ChatStore.getMessages(req.params.id);
      res.json({ conversation: conv, messages });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add message to conversation
  router.post("/conversations/:id/messages", (req, res) => {
    try {
      const conv = ChatStore.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      const { role, content, toolCalls, timestamp } = req.body;
      if (!role || !content) return res.status(400).json({ error: "role and content required" });
      ChatStore.addMessage(req.params.id, { role, content, toolCalls, timestamp: timestamp || Date.now() });
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update conversation title
  router.patch("/conversations/:id", (req, res) => {
    try {
      const conv = ChatStore.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (req.body.title) ChatStore.updateConversationTitle(req.params.id, req.body.title);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete conversation
  router.delete("/conversations/:id", (req, res) => {
    try {
      ChatStore.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
