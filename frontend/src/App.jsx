import { useState, useEffect, useRef, useCallback } from "react";
import { api, connectWorkflowWS, chatStream } from "./api.js";

// ─── Component & constant imports ───────────────────
import { T, mono, sans, globalCSS } from "./components/theme.js";
import { Icon } from "./components/Icons.jsx";
import { Dot, Badge, SectionHeader, Btn, STATUS_MAP } from "./components/Primitives.jsx";
import { RenderedMarkdown, renderInline } from "./components/RenderedMarkdown.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { AgentCard } from "./components/AgentCard.jsx";
import { ExecutionPanel } from "./components/ExecutionPanel.jsx";
import { PipelineBar } from "./components/PipelineBar.jsx";
import { StatCard } from "./components/StatCard.jsx";
import { AGENT_PALETTE } from "./constants/agentPalette.js";
import { PROVIDERS } from "./constants/providers.js";


// ─── Main App ───────────────────────────────────────
export default function App() {
  const [view, setView] = useState("chat");
  const [agents, setAgents] = useState([]);
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState("sequential");
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [finalOutput, setFinalOutput] = useState("");
  const [presets, setPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [agentResults, setAgentResults] = useState([]);
  const [createdFiles, setCreatedFiles] = useState([]);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [runStartedAt, setRunStartedAt] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const [apiKeys, setApiKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agentforge_api_keys") || "{}"); } catch { return {}; }
  });
  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem("agentforge_provider") || "anthropic");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("agentforge_model") || "");
  const [showKey, setShowKey] = useState({});
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const [chatToolCalls, setChatToolCalls] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [chatSystemPrompt, setChatSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState(null);
  const [guardrailAlerts, setGuardrailAlerts] = useState([]);
  const [guardrailConfig, setGuardrailConfig] = useState(null);
  const [guardrailStats, setGuardrailStats] = useState(null);
  const [guardrailAudit, setGuardrailAudit] = useState([]);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    api.health().then(() => setBackendStatus("online")).catch(() => setBackendStatus("offline"));
    api.getPresets().then((data) => setPresets(data.presets || [])).catch(() => {});
    // Load saved conversations
    api.listConversations().then((data) => setConversations(data.conversations || [])).catch(() => {});
    // Load guardrails config
    api.getGuardrails().then((data) => {
      if (data.config) setGuardrailConfig(data.config);
      if (data.stats) setGuardrailStats(data.stats);
    }).catch(() => {});
    // Sync saved API keys to backend on startup
    const savedKeys = (() => { try { return JSON.parse(localStorage.getItem("agentforge_api_keys") || "{}"); } catch { return {}; } })();
    const savedProvider = localStorage.getItem("agentforge_provider") || "anthropic";
    const savedModel = localStorage.getItem("agentforge_model") || "";
    if (Object.keys(savedKeys).some((k) => savedKeys[k])) {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: savedKeys, provider: savedProvider, model: savedModel }),
      }).catch(() => {});
    }
  }, []);

  const fetchWorkspaceFiles = useCallback(async () => {
    try {
      const resp = await fetch("/api/workspace/files");
      const data = await resp.json();
      setWorkspaceFiles(data.files || []);
      if (data.createdByAgents) setCreatedFiles(data.createdByAgents);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { if (view === "files") fetchWorkspaceFiles(); }, [view, fetchWorkspaceFiles]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, chatStreamText, chatToolCalls]);

  const addAgent = (template) => {
    const id = Math.random().toString(36).slice(2, 10);
    setAgents((prev) => [...prev, { ...template, id, status: "idle" }]);
  };

  const removeAgent = (index) => setAgents((prev) => prev.filter((_, i) => i !== index));

  const loadPreset = async (presetId) => {
    try {
      const preset = await api.getPreset(presetId);
      const newAgents = preset.agents.map((a, i) => ({
        ...a,
        id: Math.random().toString(36).slice(2, 10),
        color: AGENT_PALETTE[i % AGENT_PALETTE.length].color,
        status: "idle",
      }));
      setAgents(newAgents);
      setMode(preset.mode || "sequential");
      setShowPresets(false);
    } catch (err) { setError(err.message); }
  };

  const executeWorkflow = async () => {
    if (agents.length === 0 || !objective.trim()) return;
    setIsRunning(true);
    setRunStartedAt(Date.now());
    setEvents([]);
    setFinalOutput("");
    setAgentResults([]);
    setError(null);
    setAgents((prev) => prev.map((a) => ({ ...a, status: "idle" })));

    try {
      const result = await api.createWorkflow({
        name: `Workflow ${new Date().toLocaleTimeString()}`,
        objective,
        agents: agents.map((a) => ({ name: a.name, role: a.role, systemPrompt: a.systemPrompt, tools: a.tools })),
        mode,
      });

      setCurrentWorkflowId(result.workflowId);

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const wf = await api.getWorkflow(result.workflowId);
          if (wf.status === "completed" || wf.status === "failed" || wf.status === "aborted") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setIsRunning((running) => {
              if (running) {
                if (wf.results?.length > 0) {
                  setAgentResults(wf.results.map((r) => ({ agentName: r.agentName, output: r.output, tokens: r.tokens, elapsed: r.elapsed })));
                }
                if (wf.error) setError(wf.error);
                setAgents((prev) => prev.map((a) => ({ ...a, status: wf.status === "completed" ? "complete" : "error" })));
                setActiveAgentId(null);
                setView(wf.status === "completed" ? "output" : "studio");
                return false;
              }
              return running;
            });
          }
        } catch (e) { /* polling error, ignore */ }
      }, 5000);

      const ws = connectWorkflowWS(result.workflowId, (event) => {
        setEvents((prev) => [...prev, event]);

        if (event.type === "agent_status" || event.type === "agent_start") {
          const evStatus = event.type === "agent_start" ? "executing" : event.status;
          setAgents((prev) => prev.map((a) => (a.name === event.agentName ? { ...a, status: evStatus } : a)));
          if (evStatus === "executing" || evStatus === "thinking") {
            const matched = agents.find((a) => a.name === event.agentName);
            setActiveAgentId(matched?.id || event.agentId);
          }
        }

        if (event.type === "agent_complete") {
          setAgents((prev) => prev.map((a) => a.name === event.agentName ? { ...a, status: "complete" } : a));
          if (event.output) {
            setAgentResults((prev) => [...prev, { agentName: event.agentName, output: event.output, tokens: event.tokens, elapsed: event.elapsed }]);
          }
        }

        if (event.type === "workflow_final_result") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setFinalOutput(event.finalOutput || "");
          if (event.createdFiles) setCreatedFiles(event.createdFiles);
          if (event.results) setAgentResults(event.results.map((r) => ({ agentName: r.agentName, output: r.output, tokens: r.tokens, elapsed: r.elapsed })));
          setIsRunning(false);
          setActiveAgentId(null);
          setView("output");
        }

        if (event.type === "workflow_error") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setError(event.error); setIsRunning(false); setActiveAgentId(null);
        }

        if (event.type === "workflow_complete") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (event.finalOutput) setFinalOutput(event.finalOutput);
          if (event.createdFiles) setCreatedFiles(event.createdFiles);
          if (event.allResults?.length > 0) {
            setAgentResults(event.allResults.map((r) => ({ agentName: r.agentName, output: r.output, tokens: r.tokens, elapsed: r.elapsed })));
          }
          setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })));
          setIsRunning(false);
          setActiveAgentId(null);
          setView("output");
        }
      }, result.wsToken);
      wsRef.current = ws;
    } catch (err) {
      setError(err.message);
      setIsRunning(false);
      try {
        setEvents((prev) => [...prev, { type: "info", message: "Fallback: synchronous mode", timestamp: new Date().toISOString() }]);
        const syncResult = await api.createWorkflowSync({ name: `Workflow ${new Date().toLocaleTimeString()}`, objective, agents: agents.map((a) => ({ name: a.name, role: a.role, systemPrompt: a.systemPrompt, tools: a.tools })), mode });
        setFinalOutput(syncResult.finalOutput || "");
        setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })));
        if (syncResult.logs) setEvents((prev) => [...prev, ...syncResult.logs.map((l) => ({ ...l, timestamp: l.timestamp || new Date().toISOString() }))]);
      } catch (syncErr) { setError(syncErr.message); }
      setIsRunning(false);
    }
  };

  const abortWorkflow = () => {
    if (wsRef.current) wsRef.current.close();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setIsRunning(false);
    setActiveAgentId(null);
    setEvents((prev) => [...prev, { type: "abort", message: "Workflow aborted by user", timestamp: new Date().toISOString() }]);
  };

  const resetAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setEvents([]);
    setFinalOutput("");
    setAgentResults([]);
    setCreatedFiles([]);
    setWorkspaceFiles([]);
    setError(null);
    setAgents((prev) => prev.map((a) => ({ ...a, status: "idle" })));
  };

  // ─── API Key Management ──────────────────────────

  const saveApiKeys = async () => {
    try {
      localStorage.setItem("agentforge_api_keys", JSON.stringify(apiKeys));
      localStorage.setItem("agentforge_provider", selectedProvider);
      localStorage.setItem("agentforge_model", selectedModel);
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys, provider: selectedProvider, model: selectedModel }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
      // Re-check backend health
      api.health().then(() => setBackendStatus("online")).catch(() => setBackendStatus("offline"));
    } catch (err) {
      setError("Failed to save settings: " + err.message);
    }
  };

  // ─── Chat Functions ──────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatStreaming) return;
    const userMsg = { role: "user", content: chatInput.trim(), timestamp: Date.now() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatStreaming(true);
    setChatStreamText("");
    setChatToolCalls([]);
    setError(null);

    // Auto-create conversation if none active
    let convId = activeConversationId;
    if (!convId) {
      try {
        const title = chatInput.trim().slice(0, 60) || "New chat";
        const conv = await api.createConversation(title);
        convId = conv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [conv, ...prev]);
      } catch { /* continue without persistence */ }
    }

    // Persist user message
    if (convId) {
      api.addMessage(convId, userMsg).catch(() => {});
    }

    let fullText = "";
    let tools = [];

    try {
      await chatStream(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        chatSystemPrompt.trim() || undefined,
        (event, data) => {
          if (event === "text") {
            fullText += data.text;
            setChatStreamText(fullText);
          }
          if (event === "tool_start") {
            tools = [...tools, { name: data.tool, input: data.input, id: data.id, status: "running" }];
            setChatToolCalls([...tools]);
          }
          if (event === "tool_result") {
            tools = tools.map((t) => t.id === data.id ? { ...t, result: data.result, status: data.status === "error" ? "error" : "done" } : t);
            setChatToolCalls([...tools]);
          }
          if (event === "done") {
            const assistantMsg = { role: "assistant", content: fullText, toolCalls: tools.length > 0 ? tools : undefined, timestamp: Date.now(), model: data.model };
            setChatMessages((prev) => [...prev, assistantMsg]);
            setChatStreamText("");
            setChatToolCalls([]);
            setIsChatStreaming(false);
            // Persist assistant message
            if (convId) api.addMessage(convId, assistantMsg).catch(() => {});
          }
          if (event === "error") {
            setError(data.message);
            if (fullText) {
              const assistantMsg = { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() };
              setChatMessages((prev) => [...prev, assistantMsg]);
              if (convId) api.addMessage(convId, assistantMsg).catch(() => {});
            }
            setChatStreamText("");
            setChatToolCalls([]);
            setIsChatStreaming(false);
          }
          if (event === "guardrail") {
            setGuardrailAlerts((prev) => [...prev, { ...data, timestamp: Date.now() }]);
          }
        }
      );
    } catch (err) {
      // Check if it's a guardrail block
      if (err.message && err.message.includes("Guardrail")) {
        setGuardrailAlerts((prev) => [...prev, { type: "blocked", violations: [{ type: "input_blocked", severity: "high", message: err.message }], timestamp: Date.now() }]);
      }
      setError(err.message);
      if (fullText) {
        const assistantMsg = { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() };
        setChatMessages((prev) => [...prev, assistantMsg]);
        if (convId) api.addMessage(convId, assistantMsg).catch(() => {});
      }
      setIsChatStreaming(false);
      setChatStreamText("");
      setChatToolCalls([]);
    }
  };

  const stopChat = () => {
    setIsChatStreaming(false);
    if (chatStreamText) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: chatStreamText, toolCalls: chatToolCalls.length > 0 ? chatToolCalls : undefined, timestamp: Date.now() }]);
    }
    setChatStreamText("");
    setChatToolCalls([]);
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatStreamText("");
    setChatToolCalls([]);
    setChatInput("");
    setActiveConversationId(null);
    setEditingMessageIdx(null);
  };

  const regenerateLastMessage = async () => {
    if (isChatStreaming || chatMessages.length < 2) return;
    // Remove last assistant message, re-send
    const lastUserIdx = chatMessages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const trimmed = chatMessages.slice(0, lastUserIdx + 1);
    setChatMessages(trimmed);
    setIsChatStreaming(true);
    setChatStreamText("");
    setChatToolCalls([]);
    setError(null);
    let fullText = "";
    let tools = [];
    const convId = activeConversationId;
    try {
      await chatStream(
        trimmed.map((m) => ({ role: m.role, content: m.content })),
        chatSystemPrompt.trim() || undefined,
        (event, data) => {
          if (event === "text") { fullText += data.text; setChatStreamText(fullText); }
          if (event === "tool_start") { tools = [...tools, { name: data.tool, input: data.input, id: data.id, status: "running" }]; setChatToolCalls([...tools]); }
          if (event === "tool_result") { tools = tools.map((t) => t.id === data.id ? { ...t, result: data.result, status: data.status === "error" ? "error" : "done" } : t); setChatToolCalls([...tools]); }
          if (event === "done") {
            const assistantMsg = { role: "assistant", content: fullText, toolCalls: tools.length > 0 ? tools : undefined, timestamp: Date.now(), model: data.model };
            setChatMessages((prev) => [...prev, assistantMsg]);
            setChatStreamText(""); setChatToolCalls([]); setIsChatStreaming(false);
            if (convId) api.addMessage(convId, assistantMsg).catch(() => {});
          }
          if (event === "error") {
            setError(data.message);
            if (fullText) { setChatMessages((prev) => [...prev, { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() }]); }
            setChatStreamText(""); setChatToolCalls([]); setIsChatStreaming(false);
          }
          if (event === "guardrail") { setGuardrailAlerts((prev) => [...prev, { ...data, timestamp: Date.now() }]); }
        }
      );
    } catch (err) {
      if (err.message && err.message.includes("Guardrail")) setGuardrailAlerts((prev) => [...prev, { type: "blocked", violations: [{ type: "input_blocked", severity: "high", message: err.message }], timestamp: Date.now() }]);
      setError(err.message);
      if (fullText) setChatMessages((prev) => [...prev, { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() }]);
      setIsChatStreaming(false); setChatStreamText(""); setChatToolCalls([]);
    }
  };

  const deleteMessage = (idx) => {
    setChatMessages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitEditMessage = async (idx) => {
    if (!editingMessageText.trim()) return;
    // Trim conversation to the edited message, re-send
    const edited = chatMessages.slice(0, idx);
    const userMsg = { role: "user", content: editingMessageText.trim(), timestamp: Date.now() };
    const newMessages = [...edited, userMsg];
    setChatMessages(newMessages);
    setEditingMessageIdx(null);
    setEditingMessageText("");
    setIsChatStreaming(true);
    setChatStreamText("");
    setChatToolCalls([]);
    setError(null);
    let fullText = "";
    let tools = [];
    const convId = activeConversationId;
    try {
      await chatStream(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        chatSystemPrompt.trim() || undefined,
        (event, data) => {
          if (event === "text") { fullText += data.text; setChatStreamText(fullText); }
          if (event === "tool_start") { tools = [...tools, { name: data.tool, input: data.input, id: data.id, status: "running" }]; setChatToolCalls([...tools]); }
          if (event === "tool_result") { tools = tools.map((t) => t.id === data.id ? { ...t, result: data.result, status: data.status === "error" ? "error" : "done" } : t); setChatToolCalls([...tools]); }
          if (event === "done") {
            const assistantMsg = { role: "assistant", content: fullText, toolCalls: tools.length > 0 ? tools : undefined, timestamp: Date.now(), model: data.model };
            setChatMessages((prev) => [...prev, assistantMsg]);
            setChatStreamText(""); setChatToolCalls([]); setIsChatStreaming(false);
            if (convId) api.addMessage(convId, assistantMsg).catch(() => {});
          }
          if (event === "error") {
            setError(data.message);
            if (fullText) { setChatMessages((prev) => [...prev, { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() }]); }
            setChatStreamText(""); setChatToolCalls([]); setIsChatStreaming(false);
          }
          if (event === "guardrail") { setGuardrailAlerts((prev) => [...prev, { ...data, timestamp: Date.now() }]); }
        }
      );
    } catch (err) {
      if (err.message && err.message.includes("Guardrail")) setGuardrailAlerts((prev) => [...prev, { type: "blocked", violations: [{ type: "input_blocked", severity: "high", message: err.message }], timestamp: Date.now() }]);
      setError(err.message);
      if (fullText) setChatMessages((prev) => [...prev, { role: "assistant", content: fullText, toolCalls: tools, timestamp: Date.now() }]);
      setIsChatStreaming(false); setChatStreamText(""); setChatToolCalls([]);
    }
  };

  const exportConversation = () => {
    if (chatMessages.length === 0) return;
    const md = chatMessages.map((m) => {
      const role = m.role === "user" ? "**User**" : "**Assistant**";
      const tools = m.toolCalls?.length > 0 ? `\n\n_Tools: ${m.toolCalls.map((t) => t.name).join(", ")}_` : "";
      return `### ${role}\n\n${m.content}${tools}`;
    }).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadConversation = async (convId) => {
    try {
      const data = await api.getConversationMessages(convId);
      setChatMessages(data.messages || []);
      setActiveConversationId(convId);
      setShowConversations(false);
    } catch (err) {
      setError("Failed to load conversation: " + err.message);
    }
  };

  const deleteConversation = async (convId) => {
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        setChatMessages([]);
        setActiveConversationId(null);
      }
    } catch (err) {
      setError("Failed to delete conversation: " + err.message);
    }
  };

  const TOOL_ICONS = { web_search: "🔍", fetch_url: "🌐", create_file: "📄", create_project: "📁", edit_file: "✏️", run_command: "🖥️", read_file: "📖", list_files: "📂" };

  // Computed
  const hasApiKey = Object.values(apiKeys).some((k) => k && k.trim());
  const totalTokens = agentResults.reduce((sum, r) => sum + (r.tokens?.output_tokens || 0), 0);
  const totalElapsed = agentResults.reduce((sum, r) => sum + (r.elapsed || 0), 0);

  const modes = [
    { key: "sequential", label: "Sequential" },
    { key: "parallel", label: "Parallel" },
    { key: "fan_out_in", label: "Fan-Out/In" },
  ];

  const viewTabs = [
    { key: "chat", label: "Chat", icon: Icon.chat },
    { key: "studio", label: "Studio", icon: Icon.layers },
    { key: "output", label: "Output", icon: Icon.sparkle },
    { key: "files", label: "Files", icon: Icon.file, count: createdFiles.length },
    { key: "settings", label: "Settings", icon: Icon.settings },
  ];

  return (
    <ErrorBoundary>
    <div style={{ minHeight: "100vh", background: T.bg0 }}>
      <style>{globalCSS}</style>

      {/* ─── Header ─── */}
      <header style={{
        padding: "0 36px", height: 68, borderBottom: `1px solid ${T.border0}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.bg1, position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="./logo.jpg"
            alt="AgentForge"
            style={{
              width: 44, height: 44, borderRadius: 11, objectFit: "cover",
              boxShadow: "0 3px 14px rgba(129,140,248,0.30)",
              border: `2px solid ${T.accent}20`,
            }}
          />
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.text0, letterSpacing: "-0.03em" }}>AgentForge</span>
            <span style={{ fontSize: 14, fontWeight: 400, color: T.text3, marginLeft: 6 }}>Studio</span>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 2, height: "100%" }}>
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              style={{
                padding: "0 22px", border: "none", background: "transparent",
                color: view === tab.key ? T.text0 : T.text3,
                cursor: "pointer", fontSize: 14, fontWeight: 500,
                borderBottom: view === tab.key ? `2px solid ${T.accent}` : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 7,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { if (view !== tab.key) e.currentTarget.style.color = T.text2; }}
              onMouseLeave={(e) => { if (view !== tab.key) e.currentTarget.style.color = T.text3; }}
            >
              {tab.icon(14, view === tab.key ? T.accent : "currentColor")}
              {tab.label}
              {tab.count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: T.accentMuted, color: T.accent }}>{tab.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
            borderRadius: 20, background: backendStatus === "online" ? T.successSoft : T.errorMuted,
            border: `1px solid ${backendStatus === "online" ? T.success + "15" : T.error + "15"}`,
          }}>
            <Dot color={backendStatus === "online" ? T.success : backendStatus === "offline" ? T.error : T.warning} size={5} pulse={backendStatus === "checking"} />
            <span style={{ fontSize: 11, fontWeight: 500, color: backendStatus === "online" ? T.success : T.error }}>
              {backendStatus === "online" ? "Connected" : backendStatus === "offline" ? "Offline" : "Connecting"}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Error Banner ─── */}
      {error && (
        <div style={{
          margin: 0, padding: "10px 28px", background: T.errorMuted,
          borderBottom: `1px solid ${T.error}15`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          animation: "fadeIn 0.2s ease",
        }}>
          <span style={{ color: T.error, fontSize: 13, fontWeight: 500 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: T.error, cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1, opacity: 0.7 }}>×</button>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main style={{ padding: view === "chat" ? "0" : "0 0 80px" }}>

        {/* ═══ CHAT VIEW ═══ */}
        {view === "chat" && (
          <div style={{ display: "flex", height: "calc(100vh - 108px)" }}>
            {/* Conversation sidebar */}
            {showConversations && (
              <div style={{
                width: 280, borderRight: `1px solid ${T.border0}`, background: T.bg1,
                display: "flex", flexDirection: "column", flexShrink: 0,
              }}>
                <div style={{ padding: "16px 16px 8px", borderBottom: `1px solid ${T.border0}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>Conversations</span>
                    <button onClick={() => { clearChat(); }} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, cursor: "pointer", color: T.text2, fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }} title="New conversation">
                      {Icon.plus(12)} New
                    </button>
                  </div>
                  <div style={{ position: "relative", marginBottom: 4 }}>
                    <input
                      type="text" value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)}
                      placeholder="Search conversations..."
                      style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${T.border0}`, background: T.bg2, color: T.text1, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                    />
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.text3 }}>{Icon.search(13)}</span>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {conversations.filter((c) => !conversationSearch || (c.title || "").toLowerCase().includes(conversationSearch.toLowerCase())).length === 0 && (
                    <p style={{ fontSize: 12, color: T.text3, textAlign: "center", padding: 16 }}>{conversationSearch ? "No matches" : "No conversations yet"}</p>
                  )}
                  {conversations.filter((c) => !conversationSearch || (c.title || "").toLowerCase().includes(conversationSearch.toLowerCase())).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversation(c.id)}
                      style={{
                        padding: "10px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                        background: activeConversationId === c.id ? T.accentSoft : "transparent",
                        border: activeConversationId === c.id ? `1px solid ${T.accent}25` : "1px solid transparent",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (activeConversationId !== c.id) e.currentTarget.style.background = T.bg2; }}
                      onMouseLeave={(e) => { if (activeConversationId !== c.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontSize: 13, color: T.text1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title || "Untitled"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: T.text3 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, fontSize: 11, padding: "2px 4px" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = T.error}
                          onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ flex: 1, maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column" }}>
            {/* Chat toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 36px", borderBottom: `1px solid ${T.border0}`, background: T.bg1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setShowConversations((p) => !p)} style={{ background: showConversations ? T.accentSoft : T.bg3, border: `1px solid ${showConversations ? T.accent + "25" : T.border0}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: showConversations ? T.accent : T.text2, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  {Icon.chat(13)} History
                </button>
                <button onClick={clearChat} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: T.text2, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  {Icon.plus(13)} New Chat
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setShowSystemPrompt((p) => !p)} style={{ background: showSystemPrompt ? T.accentSoft : T.bg3, border: `1px solid ${showSystemPrompt ? T.accent + "25" : T.border0}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: showSystemPrompt ? T.accent : T.text2, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }} title="Custom system prompt">
                  {Icon.sliders(13)} System
                </button>
                {chatMessages.length > 0 && (
                  <button onClick={exportConversation} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: T.text2, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }} title="Export conversation">
                    {Icon.download(13)} Export
                  </button>
                )}
              </div>
            </div>

            {/* System prompt editor */}
            {showSystemPrompt && (
              <div style={{ padding: "12px 36px", borderBottom: `1px solid ${T.border0}`, background: T.bg2, animation: "slideUp 0.2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text2, textTransform: "uppercase", letterSpacing: "0.05em" }}>System Prompt</span>
                  {chatSystemPrompt.trim() && <button onClick={() => setChatSystemPrompt("")} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 11 }}>Clear</button>}
                </div>
                <textarea
                  value={chatSystemPrompt}
                  onChange={(e) => setChatSystemPrompt(e.target.value)}
                  placeholder="Custom instructions for the AI... (leave empty for default)"
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border1}`, background: T.bgCard, color: T.text1, fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: sans }}
                />
              </div>
            )}
            {/* API key warning */}
            {!hasApiKey && (
              <div style={{
                margin: "12px 36px 0", padding: "10px 16px", borderRadius: 8,
                background: "#FEF3C7", border: "1px solid #F59E0B40",
                display: "flex", alignItems: "center", gap: 10, fontSize: 13,
              }}>
                <span>⚠️</span>
                <span style={{ color: "#92400E" }}>No API key configured.</span>
                <button onClick={() => setView("settings")} style={{
                  background: "none", border: "none", color: "#D97706", fontWeight: 600,
                  cursor: "pointer", textDecoration: "underline", fontSize: 13,
                }}>Go to Settings</button>
              </div>
            )}
            {/* Messages area */}
            <div ref={chatScrollRef} style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
              {/* Guardrail Alerts */}
              {guardrailAlerts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {guardrailAlerts.slice(-3).map((alert, i) => (
                    <div key={i} style={{
                      padding: "10px 16px", borderRadius: T.r, marginBottom: 6,
                      background: alert.type === "blocked" ? "#DC2626" + "18" : "#F59E0B" + "18",
                      border: `1px solid ${alert.type === "blocked" ? "#DC2626" + "40" : "#F59E0B" + "40"}`,
                      display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                      animation: "fadeIn 0.25s ease",
                    }}>
                      {Icon.shield(16, alert.type === "blocked" ? "#DC2626" : "#F59E0B")}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: alert.type === "blocked" ? "#DC2626" : "#F59E0B" }}>
                          {alert.type === "blocked" ? "Guardrail Blocked" : "Guardrail Warning"}
                        </span>
                        {alert.violations && alert.violations.map((v, j) => (
                          <div key={j} style={{ color: T.text2, fontSize: 12, marginTop: 2 }}>{v.message}</div>
                        ))}
                      </div>
                      <button onClick={() => setGuardrailAlerts((p) => p.filter((_, idx) => idx !== guardrailAlerts.length - 3 + i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4, fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {chatMessages.length === 0 && !isChatStreaming && (
                <div style={{ textAlign: "center", paddingTop: 72, animation: "fadeIn 0.35s ease" }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>⚡</div>
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text0, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                    ¿Qué quieres crear hoy?
                  </h1>
                  <p style={{ fontSize: 15, color: T.text2, maxWidth: 480, margin: "0 auto 36px" }}>
                    Puedo buscar en internet, crear proyectos, escribir código, ejecutar comandos y mucho más.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 580, margin: "0 auto" }}>
                    {[
                      { emoji: "🔍", label: "Busca las últimas tendencias en AI 2025", color: "#818CF8" },
                      { emoji: "💻", label: "Crea una landing page moderna en React", color: "#4ADE80" },
                      { emoji: "📊", label: "Analiza los pros y contras de Rust vs Go", color: "#FB923C" },
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(s.label); }}
                        style={{
                          padding: "18px 16px", borderRadius: T.r, textAlign: "left",
                          border: `1px solid ${T.border0}`, background: T.bgCard,
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color + "40"; e.currentTarget.style.background = T.bg2; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border0; e.currentTarget.style.background = T.bgCard; }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 10 }}>{s.emoji}</div>
                        <div style={{ fontSize: 13, color: T.text1, lineHeight: 1.55 }}>{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered messages */}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 28, animation: "fadeIn 0.25s ease", position: "relative" }}
                  onMouseEnter={() => setHoveredMsgIdx(i)} onMouseLeave={() => setHoveredMsgIdx(null)}>
                  {msg.role === "user" ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                        {editingMessageIdx === i ? (
                          <div style={{ maxWidth: "78%", width: "100%" }}>
                            <textarea value={editingMessageText} onChange={(e) => setEditingMessageText(e.target.value)} rows={3}
                              style={{ width: "100%", padding: "14px 20px", borderRadius: T.rLg, border: `2px solid ${T.accent}`, background: T.bg2, color: T.text0, fontSize: 15, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                              <Btn size="sm" variant="ghost" onClick={() => { setEditingMessageIdx(null); setEditingMessageText(""); }}>Cancel</Btn>
                              <Btn size="sm" variant="primary" onClick={() => submitEditMessage(i)}>Send</Btn>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            maxWidth: "78%", padding: "14px 20px", borderRadius: T.rLg,
                            background: T.accent, color: "#fff", fontSize: 15, lineHeight: 1.7,
                            borderBottomRightRadius: 4, whiteSpace: "pre-wrap",
                          }}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                      {/* User message actions */}
                      {hoveredMsgIdx === i && editingMessageIdx !== i && !isChatStreaming && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 4, animation: "fadeInFast 0.1s ease" }}>
                          <button onClick={() => { setEditingMessageIdx(i); setEditingMessageText(msg.content); }} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Edit & resend">
                            {Icon.edit(11)} Edit
                          </button>
                          <button onClick={() => navigator.clipboard?.writeText(msg.content)} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Copy">
                            {Icon.copy(11)} Copy
                          </button>
                          <button onClick={() => deleteMessage(i)} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Delete">
                            {Icon.trash(11)}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ maxWidth: "92%" }}>
                      {msg.toolCalls?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          {msg.toolCalls.map((tc, j) => (
                            <div key={j} style={{
                              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
                              borderRadius: 20, background: T.bg2, border: `1px solid ${T.border1}`, fontSize: 12,
                            }}>
                              <span>{TOOL_ICONS[tc.name] || "🔧"}</span>
                              <span style={{ color: T.text1, fontWeight: 500 }}>{tc.name.replace(/_/g, " ")}</span>
                              <Dot color={tc.status === "error" ? T.error : T.success} size={5} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{
                        background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                        padding: "18px 24px", borderBottomLeftRadius: 4,
                      }}>
                        <RenderedMarkdown text={msg.content} />
                      </div>
                      {/* Assistant message actions + metadata */}
                      {hoveredMsgIdx === i && !isChatStreaming && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, animation: "fadeInFast 0.1s ease" }}>
                          <button onClick={() => navigator.clipboard?.writeText(msg.content)} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Copy">
                            {Icon.copy(11)} Copy
                          </button>
                          {i === chatMessages.length - 1 && (
                            <button onClick={regenerateLastMessage} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Regenerate">
                              {Icon.refresh(11)} Regenerate
                            </button>
                          )}
                          <button onClick={() => deleteMessage(i)} style={{ background: T.bg3, border: `1px solid ${T.border0}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.text3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }} title="Delete">
                            {Icon.trash(11)}
                          </button>
                          {msg.model && (
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: mono, marginLeft: 8 }}>{msg.model}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming state */}
              {isChatStreaming && (
                <div style={{ marginBottom: 28, animation: "fadeIn 0.2s ease", maxWidth: "92%" }}>
                  {chatToolCalls.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {chatToolCalls.map((tc, j) => (
                        <div key={j} style={{
                          display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
                          borderRadius: 20,
                          background: tc.status === "running" ? T.accentSoft : tc.status === "error" ? T.errorMuted : T.bg2,
                          border: `1px solid ${tc.status === "running" ? T.accent + "25" : T.border1}`,
                          fontSize: 12, transition: "all 0.3s",
                        }}>
                          <span>{TOOL_ICONS[tc.name] || "🔧"}</span>
                          <span style={{ color: tc.status === "running" ? T.accent : T.text1, fontWeight: 500 }}>{tc.name.replace(/_/g, " ")}</span>
                          {tc.status === "running" ? <Dot color={T.accent} size={5} pulse /> : <Dot color={tc.status === "error" ? T.error : T.success} size={5} />}
                        </div>
                      ))}
                    </div>
                  )}
                  {chatStreamText ? (
                    <div style={{
                      background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                      padding: "18px 24px", borderBottomLeftRadius: 4,
                    }}>
                      <RenderedMarkdown text={chatStreamText} />
                      <span style={{ display: "inline-block", width: 6, height: 18, background: T.accent, borderRadius: 2, animation: "pulse 1s ease-in-out infinite", marginLeft: 2, verticalAlign: "text-bottom" }} />
                    </div>
                  ) : (
                    <div style={{
                      background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                      padding: "18px 24px", borderBottomLeftRadius: 4,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <Dot color={T.accent} size={6} pulse />
                      <span style={{ color: T.text2, fontSize: 14 }}>Pensando...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ padding: "14px 36px 22px", borderTop: `1px solid ${T.border0}`, background: T.bg1 }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "flex-end",
                background: T.bgCard, border: `1px solid ${T.border1}`, borderRadius: T.rLg,
                padding: "4px 4px 4px 20px", transition: "border-color 0.2s",
              }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
                  disabled={isChatStreaming}
                  rows={1}
                  style={{
                    flex: 1, border: "none", background: "transparent", color: T.text0,
                    fontSize: 15, lineHeight: 1.6, resize: "none", outline: "none",
                    padding: "12px 0", maxHeight: 150, overflow: "auto",
                  }}
                  onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"; }}
                />
                <button
                  onClick={isChatStreaming ? stopChat : sendChatMessage}
                  disabled={!isChatStreaming && !chatInput.trim()}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "none",
                    background: isChatStreaming ? T.error : chatInput.trim() ? T.accent : T.bg4,
                    color: isChatStreaming || chatInput.trim() ? "#fff" : T.text3,
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    opacity: (!isChatStreaming && !chatInput.trim()) ? 0.4 : 1,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.2s", flexShrink: 0, marginBottom: 4,
                  }}
                >
                  {isChatStreaming ? Icon.stop(14, "#fff") : Icon.arrowRight(14, chatInput.trim() ? "#fff" : T.text3)}
                </button>
              </div>
              {chatMessages.length > 0 && !isChatStreaming && (
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8 }}>
                  <button
                    onClick={regenerateLastMessage}
                    disabled={chatMessages.length < 2}
                    style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12, fontWeight: 500, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, opacity: chatMessages.length < 2 ? 0.3 : 1 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = T.text2}
                    onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
                  >
                    {Icon.refresh(12)} Regenerate
                  </button>
                  <button
                    onClick={clearChat}
                    style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12, fontWeight: 500, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = T.text2}
                    onMouseLeave={(e) => e.currentTarget.style.color = T.text3}
                  >
                    {Icon.plus(12)} New chat
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* ═══ STUDIO VIEW ═══ */}
        {view === "studio" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 36px" }}>

            {/* Objective Hero */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                background: T.bgCard, border: `1px solid ${T.border1}`, borderRadius: T.rLg,
                overflow: "hidden",
              }}>
                <textarea
                  value={objective} onChange={(e) => setObjective(e.target.value)} disabled={isRunning}
                  placeholder="What do you want your agents to build?"
                  rows={5}
                  style={{
                    width: "100%", padding: "26px 28px 20px", resize: "none", outline: "none",
                    border: "none", background: "transparent", color: T.text0, fontSize: 17,
                    lineHeight: 1.75, boxSizing: "border-box", fontWeight: 400,
                  }}
                />
                <div style={{
                  padding: "10px 14px", borderTop: `1px solid ${T.border0}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: T.bg2,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {modes.map((m) => (
                      <button
                        key={m.key} onClick={() => setMode(m.key)} disabled={isRunning}
                        style={{
                          padding: "5px 12px", borderRadius: 20, border: "none",
                          background: mode === m.key ? T.accentMuted : "transparent",
                          color: mode === m.key ? T.accent : T.text3,
                          fontSize: 12, fontWeight: 500, cursor: isRunning ? "default" : "pointer",
                          transition: "all 0.15s",
                        }}
                      >{m.label}</button>
                    ))}
                    <div style={{ width: 1, height: 18, background: T.border1, margin: "0 4px" }} />
                    <Btn onClick={() => setShowPresets(!showPresets)} variant="ghost" size="sm" style={{ borderRadius: 20, color: T.text3 }}>
                      Presets {showPresets ? Icon.chevUp(12) : Icon.chevDown(12)}
                    </Btn>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {(events.length > 0 || agentResults.length > 0) && (
                      <Btn onClick={resetAll} disabled={isRunning} variant="ghost" size="sm" style={{ borderRadius: 20 }}>Reset</Btn>
                    )}
                    <button
                      onClick={isRunning ? abortWorkflow : executeWorkflow}
                      disabled={!isRunning && (agents.length === 0 || !objective.trim() || backendStatus !== "online")}
                      style={{
                        padding: "6px 20px", borderRadius: 20, border: "none",
                        background: isRunning ? T.error : agents.length > 0 && objective.trim() ? T.accent : T.bg4,
                        color: isRunning || (agents.length > 0 && objective.trim()) ? "#fff" : T.text3,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        opacity: (!isRunning && (agents.length === 0 || !objective.trim() || backendStatus !== "online")) ? 0.4 : 1,
                        boxShadow: isRunning ? "0 2px 10px rgba(248,113,113,0.2)" : agents.length > 0 && objective.trim() ? "0 2px 10px rgba(129,140,248,0.2)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isRunning ? Icon.stop(13, "#fff") : Icon.play(13, agents.length > 0 && objective.trim() ? "#fff" : T.text3)}
                      {isRunning ? "Stop" : "Run"}
                    </button>
                  </div>
                </div>
              </div>

              {showPresets && (
                <div style={{ marginTop: 8, background: T.bgCard, border: `1px solid ${T.border1}`, borderRadius: T.r, overflow: "hidden", animation: "slideUp 0.2s ease" }}>
                  {presets.map((p, i) => (
                    <button
                      key={p.id} onClick={() => loadPreset(p.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "14px 18px",
                        borderBottom: i < presets.length - 1 ? `1px solid ${T.border0}` : "none",
                        border: "none", background: "transparent", color: T.text0, cursor: "pointer",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.bg3}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>{p.description} · {p.agentCount} agents</div>
                    </button>
                  ))}
                  {presets.length === 0 && (
                    <div style={{ color: T.text3, fontSize: 12, textAlign: "center", padding: 20 }}>Backend offline — no presets available</div>
                  )}
                </div>
              )}
            </div>

            {/* Agent Builder */}
            <SectionHeader right={agents.length > 0 && <span style={{ fontSize: 12, color: T.text3, fontFamily: mono }}>{agents.length} in pipeline</span>}>
              Add Agents
            </SectionHeader>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
              {AGENT_PALETTE.map((t) => (
                <button
                  key={t.name} onClick={() => addAgent(t)} disabled={isRunning}
                  style={{
                    padding: "18px 20px", borderRadius: T.r, textAlign: "left",
                    border: `1px solid ${T.border0}`, background: T.bgCard,
                    cursor: isRunning ? "not-allowed" : "pointer", opacity: isRunning ? 0.35 : 1,
                    transition: "all 0.2s ease", position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={(e) => { if (!isRunning) { e.currentTarget.style.borderColor = t.color + "35"; e.currentTarget.style.background = T.bg2; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border0; e.currentTarget.style.background = T.bgCard; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: `linear-gradient(135deg, ${t.color}20, ${t.color}08)`,
                      border: `1.5px solid ${t.color}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: t.color, fontFamily: mono,
                    }}>{t.name[0]}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>{t.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.role}</div>
                  <div style={{ position: "absolute", top: 14, right: 14, color: T.text3, opacity: 0.5 }}>{Icon.plus(14)}</div>
                </button>
              ))}
            </div>

            {/* Selected Pipeline */}
            {agents.length > 0 && (
              <>
                <SectionHeader>Your Pipeline</SectionHeader>
                <PipelineBar agents={agents} activeAgentId={activeAgentId} />
                <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
                  {agents.map((agent, i) => (
                    <AgentCard key={agent.id} agent={agent} isActive={activeAgentId === agent.id} onRemove={isRunning ? null : removeAgent} index={i} total={agents.length} />
                  ))}
                </div>
              </>
            )}

            {agents.length === 0 && (
              <div style={{
                textAlign: "center", padding: "48px 32px", color: T.text3, fontSize: 13,
                border: `1.5px dashed ${T.border1}`, borderRadius: T.rLg,
                background: `repeating-linear-gradient(135deg, transparent, transparent 10px, ${T.bg1} 10px, ${T.bg1} 11px)`,
              }}>
                <div style={{ marginBottom: 8, opacity: 0.5 }}>{Icon.layers(28, T.text3)}</div>
                <div style={{ fontWeight: 500 }}>Select agents above to build your pipeline</div>
                <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>or load a preset to get started quickly</div>
              </div>
            )}

            {/* Execution Panel */}
            <ExecutionPanel events={events} isRunning={isRunning} startedAt={runStartedAt} />
          </div>
        )}

        {/* ═══ OUTPUT VIEW ═══ */}
        {view === "output" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 36px" }}>
            {agentResults.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 24, animation: "fadeIn 0.3s ease" }}>
                <StatCard label="Agents" value={agentResults.length} sub={`of ${agents.length} total`} color={T.accent} />
                <StatCard label="Time" value={totalElapsed > 0 ? `${(totalElapsed / 1000).toFixed(1)}s` : "—"} sub="total execution" color={T.warning} />
                <StatCard label="Tokens" value={totalTokens > 0 ? totalTokens.toLocaleString() : "—"} sub="output tokens" color={T.success} />
                {createdFiles.length > 0 && (
                  <StatCard label="Files" value={createdFiles.length} sub={<span style={{ cursor: "pointer", color: T.accent }} onClick={() => setView("files")}>view files →</span>} color={T.text0} />
                )}
              </div>
            )}

            <SectionHeader right={
              (agentResults.length > 0 || finalOutput) && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const full = agentResults.length > 0 ? agentResults.map((r) => `# ${r.agentName}\n\n${r.output}`).join("\n\n---\n\n") : finalOutput;
                    navigator.clipboard?.writeText(full);
                  }}>{Icon.copy(12)} Copy all</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const full = agentResults.length > 0 ? agentResults.map((r) => `# ${r.agentName}\n\n${r.output}`).join("\n\n---\n\n") : finalOutput;
                    const blob = new Blob([full], { type: "text/markdown" }); const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "agentforge-output.md"; a.click(); URL.revokeObjectURL(url);
                  }}>{Icon.download(12)} Export .md</Btn>
                </div>
              )
            }>Results</SectionHeader>

            {agentResults.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {agentResults.map((result, idx) => {
                  const agentDef = AGENT_PALETTE.find((p) => p.name === result.agentName) || {};
                  const color = agentDef.color || T.accent;
                  const isExpanded = expandedResult === null || expandedResult === idx;
                  return (
                    <div key={idx} style={{
                      background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                      overflow: "hidden", animation: `slideUp 0.35s ease ${idx * 0.08}s both`,
                    }}>
                      <button
                        onClick={() => setExpandedResult(expandedResult === idx ? null : idx)}
                        style={{
                          width: "100%", padding: "14px 20px", border: "none", background: "transparent", cursor: "pointer",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          borderBottom: isExpanded ? `1px solid ${T.border0}` : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                            border: `1.5px solid ${color}30`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, color, fontFamily: mono,
                          }}>{result.agentName?.[0]}</div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>{result.agentName}</div>
                            <div style={{ fontSize: 11, color: T.text3, fontFamily: mono }}>
                              {result.elapsed ? `${(result.elapsed / 1000).toFixed(1)}s` : ""}
                              {result.tokens?.output_tokens ? ` · ${result.tokens.output_tokens.toLocaleString()} tokens` : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Btn variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(result.output); }} style={{ borderRadius: 20 }}>
                            {Icon.copy(11)} Copy
                          </Btn>
                          {isExpanded ? Icon.chevUp(14, T.text3) : Icon.chevDown(14, T.text3)}
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: "20px 24px", animation: "fadeIn 0.2s ease" }}>
                          <RenderedMarkdown text={result.output} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : finalOutput ? (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg, padding: "24px 28px" }}>
                <RenderedMarkdown text={finalOutput} />
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "80px 32px", color: T.text3, fontSize: 13,
                border: `1.5px dashed ${T.border1}`, borderRadius: T.rLg,
              }}>
                <div style={{ marginBottom: 8, opacity: 0.4 }}>{Icon.sparkle(32, T.text3)}</div>
                <div style={{ fontWeight: 500 }}>No results yet</div>
                <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Execute a workflow in the Studio to see agent outputs here</div>
              </div>
            )}

            {createdFiles.length > 0 && (
              <div style={{ marginTop: 16, background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.r, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Dot color={T.success} size={5} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{createdFiles.length} file{createdFiles.length !== 1 ? "s" : ""} created</span>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => setView("files")} style={{ borderRadius: 20 }}>View files {Icon.arrowRight(12)}</Btn>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {createdFiles.slice(0, 10).map((f, i) => <Badge key={i} color={T.text2}>{f.path}</Badge>)}
                  {createdFiles.length > 10 && <Badge color={T.text3}>+{createdFiles.length - 10} more</Badge>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ FILES VIEW ═══ */}
        {view === "files" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 36px" }}>
            <SectionHeader right={
              <Btn variant="ghost" size="sm" onClick={fetchWorkspaceFiles} style={{ borderRadius: 20 }}>{Icon.refresh(12)} Refresh</Btn>
            }>Workspace Files</SectionHeader>

            {createdFiles.length > 0 && (
              <div style={{ marginBottom: 16, background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg, overflow: "hidden", animation: "fadeIn 0.3s ease" }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border0}`, display: "flex", alignItems: "center", gap: 8, background: T.successSoft }}>
                  <Dot color={T.success} size={5} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.success }}>Created by agents</span>
                  <Badge color={T.success} bg={T.successMuted}>{createdFiles.length}</Badge>
                </div>
                {createdFiles.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px",
                    borderBottom: i < createdFiles.length - 1 ? `1px solid ${T.border0}` : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bg2}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: T.text3 }}>{Icon.file(14)}</span>
                      <span style={{ fontSize: 13, color: T.text1, fontFamily: mono, fontWeight: 500 }}>{f.path}</span>
                      {f.size && <span style={{ fontSize: 11, color: T.text3, fontFamily: mono }}>{f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn variant="ghost" size="sm" style={{ borderRadius: 20 }} onClick={async () => {
                        try { const resp = await fetch(`/api/workspace/file?path=${encodeURIComponent(f.path)}`); const data = await resp.json(); if (data.content) navigator.clipboard?.writeText(data.content); } catch (e) { /* ignore */ }
                      }}>{Icon.copy(11)} Copy</Btn>
                      <a href={`/api/workspace/download?path=${encodeURIComponent(f.path)}`} download style={{
                        padding: "5px 10px", borderRadius: 20, border: "none", background: "transparent",
                        color: T.text2, fontSize: 12, fontWeight: 500, textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>{Icon.download(11)} Download</a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {workspaceFiles.length > 0 && (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border0}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>All files</span>
                  <span style={{ fontSize: 11, color: T.text3, marginLeft: 6 }}>({workspaceFiles.filter((f) => f.type === "file").length} files)</span>
                </div>
                {workspaceFiles.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px",
                    borderBottom: i < workspaceFiles.length - 1 ? `1px solid ${T.border0}` : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bg2}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: T.text3 }}>{f.type === "directory" ? Icon.folder(14) : Icon.file(14)}</span>
                      <span style={{ fontSize: 13, color: f.type === "directory" ? T.text0 : T.text1, fontFamily: mono, fontWeight: f.type === "directory" ? 600 : 400 }}>{f.path}</span>
                      {f.size != null && <span style={{ fontSize: 11, color: T.text3, fontFamily: mono }}>{f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}</span>}
                    </div>
                    {f.type === "file" && (
                      <a href={`/api/workspace/download?path=${encodeURIComponent(f.path)}`} download style={{
                        fontSize: 12, color: T.text3, textDecoration: "none", fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>{Icon.download(11)}</a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {createdFiles.length === 0 && workspaceFiles.length === 0 && (
              <div style={{
                textAlign: "center", padding: "80px 32px", color: T.text3, fontSize: 13,
                border: `1.5px dashed ${T.border1}`, borderRadius: T.rLg,
              }}>
                <div style={{ marginBottom: 8, opacity: 0.4 }}>{Icon.folder(32, T.text3)}</div>
                <div style={{ fontWeight: 500 }}>No files in workspace</div>
                <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Agents will create real files here when they execute</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS VIEW ═══ */}
        {view === "settings" && (
          <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 36px" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text0, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
                {Icon.settings(22, T.accent)} Settings
              </h1>
              <p style={{ fontSize: 14, color: T.text2, margin: 0 }}>Configure your API keys and preferred AI provider</p>
            </div>

            {/* Provider Selection */}
            <SectionHeader>AI Provider</SectionHeader>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setSelectedProvider(p.key);
                    if (!selectedModel || !p.models.find((m) => m.id === selectedModel)) {
                      setSelectedModel(p.models[0]?.id || "");
                    }
                  }}
                  style={{
                    padding: "20px", borderRadius: T.rLg, textAlign: "left", cursor: "pointer",
                    border: `1.5px solid ${selectedProvider === p.key ? p.color + "50" : T.border0}`,
                    background: selectedProvider === p.key ? p.color + "08" : T.bgCard,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (selectedProvider !== p.key) e.currentTarget.style.borderColor = T.border2; }}
                  onMouseLeave={(e) => { if (selectedProvider !== p.key) e.currentTarget.style.borderColor = T.border0; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${p.color}22, ${p.color}08)`,
                      border: `1.5px solid ${p.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: p.color, fontFamily: mono,
                    }}>{p.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text0 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: T.text2 }}>{p.description}</div>
                    </div>
                  </div>
                  {selectedProvider === p.key && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Dot color={p.color} size={6} />
                      <span style={{ fontSize: 11, color: p.color, fontWeight: 600 }}>Active</span>
                    </div>
                  )}
                  {apiKeys[p.key] && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: selectedProvider === p.key ? 4 : 10 }}>
                      <Dot color={T.success} size={5} />
                      <span style={{ fontSize: 11, color: T.success, fontWeight: 500 }}>Key configured</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* API Keys */}
            <SectionHeader>{Icon.key(14, T.text2)} API Keys</SectionHeader>
            <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
              {PROVIDERS.map((p) => (
                <div key={p.key} style={{
                  background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                  padding: "20px 24px", transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: p.color }}>{p.name}</span>
                      {apiKeys[p.key] && <Badge color={T.success} bg={T.successSoft}>✓ Set</Badge>}
                    </div>
                    <button
                      onClick={() => setShowKey((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4, display: "flex", alignItems: "center" }}
                    >
                      {showKey[p.key] ? Icon.eyeOff(16, T.text3) : Icon.eye(16, T.text3)}
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showKey[p.key] ? "text" : "password"}
                      value={apiKeys[p.key] || ""}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.key]: e.target.value }))}
                      placeholder={`Enter your ${p.name} API key...`}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: T.r, outline: "none",
                        border: `1px solid ${T.border1}`, background: T.bg2, color: T.text0,
                        fontSize: 14, fontFamily: mono, boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = p.color + "50"}
                      onBlur={(e) => e.currentTarget.style.borderColor = T.border1}
                    />
                  </div>
                  {apiKeys[p.key] && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: T.text3 }}>Key: </span>
                      <code style={{ fontSize: 12, color: T.text2, fontFamily: mono }}>
                        {apiKeys[p.key].slice(0, 8)}{"•".repeat(20)}{apiKeys[p.key].slice(-4)}
                      </code>
                      <button
                        onClick={() => setApiKeys((prev) => { const n = { ...prev }; delete n[p.key]; return n; })}
                        style={{ marginLeft: "auto", fontSize: 11, color: T.error, background: "none", border: "none", cursor: "pointer", fontWeight: 500, opacity: 0.7 }}
                      >Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Model Selection */}
            <SectionHeader>Model</SectionHeader>
            <div style={{
              background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
              padding: "20px 24px", marginBottom: 32,
            }}>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>
                Select the default model for <strong style={{ color: PROVIDERS.find((p) => p.key === selectedProvider)?.color }}>{PROVIDERS.find((p) => p.key === selectedProvider)?.name}</strong>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(PROVIDERS.find((p) => p.key === selectedProvider)?.models || []).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                      borderRadius: T.r, cursor: "pointer", textAlign: "left",
                      border: `1.5px solid ${selectedModel === m.id ? T.accent + "40" : T.border0}`,
                      background: selectedModel === m.id ? T.accentSoft : T.bg2,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (selectedModel !== m.id) e.currentTarget.style.background = T.bg3; }}
                    onMouseLeave={(e) => { if (selectedModel !== m.id) e.currentTarget.style.background = T.bg2; }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: selectedModel === m.id ? T.accent : T.bg4,
                      border: selectedModel === m.id ? "none" : `1.5px solid ${T.border2}`,
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: selectedModel === m.id ? T.text0 : T.text1 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: T.text3, fontFamily: mono }}>{m.id}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
              <button
                onClick={saveApiKeys}
                style={{
                  padding: "14px 36px", borderRadius: T.rLg, border: "none",
                  background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600,
                  cursor: "pointer", boxShadow: "0 4px 16px rgba(129,140,248,0.25)",
                  display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.accentHover}
                onMouseLeave={(e) => e.currentTarget.style.background = T.accent}
              >
                {settingsSaved ? Icon.check(16, "#fff") : Icon.key(16, "#fff")}
                {settingsSaved ? "Saved!" : "Save Settings"}
              </button>
              {settingsSaved && (
                <span style={{ fontSize: 13, color: T.success, fontWeight: 500, animation: "fadeIn 0.2s ease" }}>
                  Settings saved successfully
                </span>
              )}
            </div>

            {/* Info */}
            <div style={{
              marginTop: 32, padding: "18px 22px", background: T.bg2,
              border: `1px solid ${T.border0}`, borderRadius: T.r,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8 }}>ℹ️ About API Keys</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.text2, lineHeight: 1.8 }}>
                <li>API keys are stored in your browser's local storage and sent securely to your local backend</li>
                <li>Keys are never sent to any third-party server — only to the AI provider's API directly from your backend</li>
                <li>You can also set keys via the <code style={{ background: T.bg3, padding: "2px 6px", borderRadius: 4, fontFamily: mono, fontSize: 12, color: T.accent }}>.env</code> file on the backend</li>
                <li>Frontend-configured keys take priority over <code style={{ background: T.bg3, padding: "2px 6px", borderRadius: 4, fontFamily: mono, fontSize: 12, color: T.accent }}>.env</code> keys</li>
              </ul>
            </div>

            {/* ═══ GUARDRAILS SECTION ═══ */}
            <div style={{ marginTop: 48 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text0, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
                {Icon.shield(20, "#F59E0B")} Guardrails
              </h2>
              <p style={{ fontSize: 14, color: T.text2, margin: "0 0 24px" }}>NeMo-style safety rails for input/output filtering, jailbreak detection, and PII protection</p>

              {guardrailConfig && (
                <>
                  {/* Master Toggle */}
                  <div style={{
                    background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                    padding: "20px 24px", marginBottom: 16,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text0 }}>Enable Guardrails</div>
                      <div style={{ fontSize: 12, color: T.text2 }}>Master toggle for all safety rails</div>
                    </div>
                    <button onClick={() => {
                      const newConfig = { ...guardrailConfig, enabled: !guardrailConfig.enabled };
                      setGuardrailConfig(newConfig);
                      api.updateGuardrails({ enabled: newConfig.enabled }).catch(() => {});
                    }} style={{
                      width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                      background: guardrailConfig.enabled ? T.success : T.bg4,
                      position: "relative", transition: "background 0.2s",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: "#fff",
                        position: "absolute", top: 3,
                        left: guardrailConfig.enabled ? 25 : 3,
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                  </div>

                  {/* Input Rails */}
                  <SectionHeader>Input Rails</SectionHeader>
                  <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                    {[
                      { key: "jailbreakDetection", label: "Jailbreak Detection", desc: "Block attempts to bypass safety constraints" },
                      { key: "promptInjection", label: "Prompt Injection", desc: "Detect manipulation of system instructions" },
                      { key: "piiDetection", label: "PII Detection", desc: "Warn when personal data (SSN, cards, phones) is sent" },
                      { key: "topicControl", label: "Topic Control", desc: "Block messages about restricted topics" },
                    ].map((rail) => (
                      <div key={rail.key} style={{
                        background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.r,
                        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{rail.label}</div>
                          <div style={{ fontSize: 12, color: T.text3 }}>{rail.desc}</div>
                        </div>
                        <button onClick={() => {
                          const newInput = { ...guardrailConfig.input, [rail.key]: !guardrailConfig.input[rail.key] };
                          const newConfig = { ...guardrailConfig, input: newInput };
                          setGuardrailConfig(newConfig);
                          api.updateGuardrails({ input: { [rail.key]: newInput[rail.key] } }).catch(() => {});
                        }} style={{
                          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                          background: guardrailConfig.input[rail.key] ? T.success : T.bg4,
                          position: "relative", transition: "background 0.2s",
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%", background: "#fff",
                            position: "absolute", top: 3,
                            left: guardrailConfig.input[rail.key] ? 21 : 3,
                            transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Output Rails */}
                  <SectionHeader>Output Rails</SectionHeader>
                  <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                    {[
                      { key: "contentSafety", label: "Content Safety", desc: "Flag unsafe patterns (malware, exploits, dangerous commands)" },
                      { key: "piiMasking", label: "PII Masking", desc: "Mask personal data in AI responses" },
                      { key: "codeExecutionWarning", label: "Code Execution Warning", desc: "Warn about dangerous code in output" },
                    ].map((rail) => (
                      <div key={rail.key} style={{
                        background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.r,
                        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: T.text0 }}>{rail.label}</div>
                          <div style={{ fontSize: 12, color: T.text3 }}>{rail.desc}</div>
                        </div>
                        <button onClick={() => {
                          const newOutput = { ...guardrailConfig.output, [rail.key]: !guardrailConfig.output[rail.key] };
                          const newConfig = { ...guardrailConfig, output: newOutput };
                          setGuardrailConfig(newConfig);
                          api.updateGuardrails({ output: { [rail.key]: newOutput[rail.key] } }).catch(() => {});
                        }} style={{
                          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                          background: guardrailConfig.output[rail.key] ? T.success : T.bg4,
                          position: "relative", transition: "background 0.2s",
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%", background: "#fff",
                            position: "absolute", top: 3,
                            left: guardrailConfig.output[rail.key] ? 21 : 3,
                            transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Blocked Topics */}
                  <SectionHeader>Blocked Topics</SectionHeader>
                  <div style={{
                    background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                    padding: "20px 24px", marginBottom: 24,
                  }}>
                    <div style={{ fontSize: 12, color: T.text3, marginBottom: 10 }}>
                      Add topics to block (one per line). Messages containing these topics will be rejected.
                    </div>
                    <textarea
                      value={(guardrailConfig.blockedTopics || []).join("\n")}
                      onChange={(e) => {
                        const topics = e.target.value.split("\n").filter((t) => t.trim());
                        setGuardrailConfig((prev) => ({ ...prev, blockedTopics: topics }));
                      }}
                      placeholder="e.g.:\nweapons\nillegal activities"
                      rows={4}
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: T.r,
                        border: `1px solid ${T.border1}`, background: T.bg2, color: T.text0,
                        fontSize: 13, fontFamily: mono, resize: "vertical", boxSizing: "border-box",
                      }}
                    />
                    <button onClick={() => {
                      api.updateGuardrails({ blockedTopics: guardrailConfig.blockedTopics }).catch(() => {});
                    }} style={{
                      marginTop: 10, padding: "8px 20px", borderRadius: T.r, border: "none",
                      background: T.accent, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}>Save Topics</button>
                  </div>

                  {/* Stats */}
                  {guardrailStats && (
                    <>
                      <SectionHeader>Guardrail Stats</SectionHeader>
                      <div style={{
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24,
                      }}>
                        {[
                          { label: "Input Checks", value: guardrailStats.inputChecks, color: T.accent },
                          { label: "Output Checks", value: guardrailStats.outputChecks, color: T.accent },
                          { label: "Input Blocked", value: guardrailStats.inputBlocked, color: "#DC2626" },
                          { label: "Output Blocked", value: guardrailStats.outputBlocked, color: "#DC2626" },
                          { label: "PII Detected", value: guardrailStats.piiDetected, color: "#F59E0B" },
                          { label: "Jailbreak Attempts", value: guardrailStats.jailbreakAttempts, color: "#DC2626" },
                        ].map((s, i) => (
                          <div key={i} style={{
                            background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.r,
                            padding: "16px 18px", textAlign: "center",
                          }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: mono }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => {
                        api.getGuardrails().then((data) => {
                          if (data.stats) setGuardrailStats(data.stats);
                        }).catch(() => {});
                      }} style={{
                        padding: "8px 20px", borderRadius: T.r, border: `1px solid ${T.border1}`,
                        background: T.bg2, color: T.text1, fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 24,
                      }}>
                        {Icon.refresh(14, T.text2)} Refresh Stats
                      </button>
                    </>
                  )}

                  {/* Audit Log */}
                  <SectionHeader>Audit Log</SectionHeader>
                  <div style={{
                    background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg,
                    padding: "16px 20px", maxHeight: 300, overflowY: "auto",
                  }}>
                    {guardrailAudit.length === 0 ? (
                      <div style={{ fontSize: 13, color: T.text3, textAlign: "center", padding: "20px 0" }}>
                        No audit entries yet
                      </div>
                    ) : (
                      guardrailAudit.map((entry, i) => (
                        <div key={i} style={{
                          padding: "8px 0", borderBottom: i < guardrailAudit.length - 1 ? `1px solid ${T.border0}` : "none",
                          fontSize: 12,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Badge color={entry.direction === "input" ? "#818CF8" : "#4ADE80"}
                              bg={entry.direction === "input" ? "#818CF8" + "18" : "#4ADE80" + "18"}>
                              {entry.direction}
                            </Badge>
                            <span style={{ color: T.text3, fontFamily: mono, fontSize: 11 }}>
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {entry.violations.map((v, j) => (
                            <div key={j} style={{ color: v.severity === "high" ? "#DC2626" : v.severity === "medium" ? "#F59E0B" : T.text2, fontSize: 12, marginLeft: 8 }}>
                              • {v.message}
                            </div>
                          ))}
                          {entry.textPreview && (
                            <div style={{ color: T.text3, fontSize: 11, marginTop: 4, marginLeft: 8, fontFamily: mono }}>
                              {entry.textPreview}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <button onClick={() => {
                      api.getGuardrailsAudit(100).then((data) => setGuardrailAudit(data.log || [])).catch(() => {});
                    }} style={{
                      marginTop: 12, padding: "8px 20px", borderRadius: T.r, border: `1px solid ${T.border1}`,
                      background: T.bg2, color: T.text1, fontSize: 12, cursor: "pointer", width: "100%",
                    }}>Load Audit Log</button>
                  </div>
                </>
              )}

              {!guardrailConfig && (
                <div style={{ padding: "24px 0", color: T.text3, fontSize: 14 }}>
                  Loading guardrails configuration...
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 40,
        padding: "0 28px", borderTop: `1px solid ${T.border0}`,
        background: T.bg1,
        display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 40,
      }}>
        <span style={{ fontSize: 11, color: T.text3, fontWeight: 400 }}>AgentForge Studio</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: mono }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""} · {mode}
          </span>
          <Dot color={isRunning ? T.accent : T.text3} size={5} pulse={isRunning} />
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
