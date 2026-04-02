// src/api/websocket.js
// WebSocket manager — streams real-time agent execution events to connected clients

import { WebSocketServer } from "ws";
import { CONFIG } from "../config.js";

export class WSManager {
  constructor(server, logger) {
    this.wss = new WebSocketServer({ server });
    this.logger = logger;
    this.clients = new Map(); // workflowId -> Set<WebSocket>

    this.wss.on("connection", (ws, req) => {
      ws.isAlive = true;

      // Extract workflow ID from URL: /ws/:workflowId
      const urlParts = req.url?.split("/") || [];
      const workflowId = urlParts[urlParts.length - 1];

      if (workflowId && workflowId !== "ws") {
        this.subscribe(ws, workflowId);
      }

      ws.on("pong", () => { ws.isAlive = true; });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "subscribe" && msg.workflowId) {
            this.subscribe(ws, msg.workflowId);
          }
          if (msg.type === "unsubscribe" && msg.workflowId) {
            this.unsubscribe(ws, msg.workflowId);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on("close", () => {
        this.removeClient(ws);
      });

      ws.on("error", (err) => {
        this.logger?.error({ error: err.message }, "WebSocket error");
        this.removeClient(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to AgentForge Studio WebSocket",
        timestamp: new Date().toISOString(),
      }));
    });

    // Heartbeat: ping all clients periodically, terminate dead connections
    this._heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.removeClient(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, CONFIG.ws.heartbeatIntervalMs);

    // Periodic cleanup: remove empty workflow entries from the Map
    this._cleanupInterval = setInterval(() => {
      for (const [workflowId, clientSet] of this.clients) {
        // Remove dead sockets
        for (const ws of clientSet) {
          if (ws.readyState !== ws.OPEN) clientSet.delete(ws);
        }
        if (clientSet.size === 0) this.clients.delete(workflowId);
      }
    }, CONFIG.ws.cleanupIntervalMs);

    this.logger?.info(`WebSocket server initialized (heartbeat: ${CONFIG.ws.heartbeatIntervalMs}ms)`);
  }

  /**
   * Gracefully shut down intervals
   */
  destroy() {
    clearInterval(this._heartbeatInterval);
    clearInterval(this._cleanupInterval);
    this.wss.close();
  }

  subscribe(ws, workflowId) {
    if (!this.clients.has(workflowId)) {
      this.clients.set(workflowId, new Set());
    }
    this.clients.get(workflowId).add(ws);
    
    ws.send(JSON.stringify({
      type: "subscribed",
      workflowId,
      timestamp: new Date().toISOString(),
    }));
  }

  unsubscribe(ws, workflowId) {
    const clientSet = this.clients.get(workflowId);
    if (clientSet) {
      clientSet.delete(ws);
      if (clientSet.size === 0) {
        this.clients.delete(workflowId);
      }
    }
  }

  removeClient(ws) {
    for (const [workflowId, clientSet] of this.clients) {
      clientSet.delete(ws);
      if (clientSet.size === 0) {
        this.clients.delete(workflowId);
      }
    }
  }

  /**
   * Broadcast an event to all clients watching a specific workflow
   */
  broadcast(workflowId, event) {
    const clientSet = this.clients.get(workflowId);
    if (!clientSet || clientSet.size === 0) return;

    const payload = JSON.stringify(event);

    for (const ws of clientSet) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(payload);
        } catch {
          clientSet.delete(ws);
        }
      } else {
        clientSet.delete(ws);
      }
    }
  }

  /**
   * Broadcast to ALL connected clients
   */
  broadcastAll(event) {
    const payload = JSON.stringify(event);
    for (const [, clientSet] of this.clients) {
      for (const ws of clientSet) {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(payload);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  get connectionCount() {
    let count = 0;
    for (const [, clientSet] of this.clients) {
      count += clientSet.size;
    }
    return count;
  }
}
