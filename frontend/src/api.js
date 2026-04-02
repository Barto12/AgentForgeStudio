// src/api.js
// API client for AgentForge Studio backend

const BASE_URL = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || "API Error");
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request("/health"),

  // Presets
  getPresets: () => request("/presets"),
  getPreset: (id) => request(`/presets/${id}`),

  // Tools
  getTools: () => request("/tools"),

  // Settings
  getSettings: () => request("/settings"),
  saveSettings: (data) => request("/settings", { method: "POST", body: JSON.stringify(data) }),

  // Workflows
  listWorkflows: () => request("/workflows"),
  getWorkflow: (id) => request(`/workflows/${id}`),
  
  createWorkflow: (data) =>
    request("/workflows", { method: "POST", body: JSON.stringify(data) }),
  
  createWorkflowSync: (data) =>
    request("/workflows/sync", { method: "POST", body: JSON.stringify(data) }),
  
  abortWorkflow: (id) =>
    request(`/workflows/${id}/abort`, { method: "POST" }),
  
  getWorkflowLogs: (id) => request(`/workflows/${id}/logs`),
  getWorkflowResults: (id) => request(`/workflows/${id}/results`),

  // Chat History
  listConversations: () => request("/conversations"),
  createConversation: (title) => request("/conversations", { method: "POST", body: JSON.stringify({ title }) }),
  getConversationMessages: (id) => request(`/conversations/${id}/messages`),
  addMessage: (convId, message) => request(`/conversations/${convId}/messages`, { method: "POST", body: JSON.stringify(message) }),
  updateConversationTitle: (id, title) => request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: "DELETE" }),

  // Guardrails
  getGuardrails: () => request("/guardrails"),
  updateGuardrails: (config) => request("/guardrails", { method: "POST", body: JSON.stringify(config) }),
  getGuardrailsAudit: (limit = 50) => request(`/guardrails/audit?limit=${limit}`),
};

// WebSocket connection for real-time events
export function connectWorkflowWS(workflowId, onEvent) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/${workflowId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      // ignore
    }
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  return {
    close: () => ws.close(),
    subscribe: (wfId) => ws.send(JSON.stringify({ type: "subscribe", workflowId: wfId })),
  };
}

// SSE streaming chat
export async function chatStream(messages, systemPrompt, onEvent) {
  const body = { messages };
  if (typeof systemPrompt === "string") body.systemPrompt = systemPrompt;
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || "Chat request failed");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (buffer.includes("\n\n")) {
        const idx = buffer.indexOf("\n\n");
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let event = "message";
        let data = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("event: ")) event = line.slice(7);
          else if (line.startsWith("data: ")) data += line.slice(6);
        }
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (event === "done") gotDone = true;
            onEvent(event, parsed);
          } catch {}
        }
      }
    }
  } finally {
    if (!gotDone) onEvent("done", {});
  }
}
