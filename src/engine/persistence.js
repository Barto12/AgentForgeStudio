// src/engine/persistence.js
// SQLite persistence layer for workflows, chat history, and settings
// Uses better-sqlite3 for synchronous, fast, zero-dependency persistence

import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = resolve(__dirname, "..", "..", "data", "agentforge.db");

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      objective TEXT NOT NULL,
      mode TEXT DEFAULT 'sequential',
      status TEXT DEFAULT 'created',
      config TEXT DEFAULT '{}',
      agents_def TEXT DEFAULT '[]',
      results TEXT DEFAULT '[]',
      memory TEXT DEFAULT '{}',
      logs TEXT DEFAULT '[]',
      final_output TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
    CREATE INDEX IF NOT EXISTS idx_workflows_created ON workflows(created_at);
  `);
}

// ─── Workflow Persistence ────────────────────────────
export const WorkflowStore = {
  save(workflow) {
    const d = getDb();
    const stmt = d.prepare(`
      INSERT OR REPLACE INTO workflows (id, name, objective, mode, status, config, agents_def, results, memory, logs, final_output, error, created_at, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      workflow.id,
      workflow.name,
      workflow.objective,
      workflow.mode,
      workflow.status,
      JSON.stringify(workflow.config || {}),
      JSON.stringify((workflow.agents || []).map(a => a.toJSON ? a.toJSON() : a)),
      JSON.stringify(workflow.results || []),
      JSON.stringify(workflow.memory?.getAll ? workflow.memory.getAll() : (workflow.memory || {})),
      JSON.stringify((workflow.logs || []).slice(-200)),
      workflow.finalOutput || null,
      workflow.error || null,
      workflow.createdAt,
      workflow.startedAt || null,
      workflow.completedAt || null
    );
  },

  get(id) {
    const d = getDb();
    const row = d.prepare("SELECT * FROM workflows WHERE id = ?").get(id);
    if (!row) return null;
    return parseWorkflowRow(row);
  },

  list(limit = 50) {
    const d = getDb();
    const rows = d.prepare("SELECT * FROM workflows ORDER BY created_at DESC LIMIT ?").all(limit);
    return rows.map(parseWorkflowRow);
  },

  delete(id) {
    const d = getDb();
    d.prepare("DELETE FROM workflows WHERE id = ?").run(id);
  },
};

function parseWorkflowRow(row) {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    mode: row.mode,
    status: row.status,
    config: JSON.parse(row.config || "{}"),
    agents: JSON.parse(row.agents_def || "[]"),
    results: JSON.parse(row.results || "[]"),
    memory: JSON.parse(row.memory || "{}"),
    logs: JSON.parse(row.logs || "[]"),
    finalOutput: row.final_output,
    error: row.error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ─── Chat Persistence ────────────────────────────────
export const ChatStore = {
  createConversation(id, title = "New chat") {
    const d = getDb();
    const now = new Date().toISOString();
    d.prepare("INSERT INTO chat_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, title, now, now);
    return { id, title, createdAt: now, updatedAt: now };
  },

  updateConversationTitle(id, title) {
    const d = getDb();
    d.prepare("UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?").run(title, new Date().toISOString(), id);
  },

  listConversations(limit = 50) {
    const d = getDb();
    return d.prepare("SELECT * FROM chat_conversations ORDER BY updated_at DESC LIMIT ?").all(limit);
  },

  getConversation(id) {
    const d = getDb();
    return d.prepare("SELECT * FROM chat_conversations WHERE id = ?").get(id);
  },

  deleteConversation(id) {
    const d = getDb();
    d.prepare("DELETE FROM chat_conversations WHERE id = ?").run(id);
  },

  addMessage(conversationId, message) {
    const d = getDb();
    d.prepare("INSERT INTO chat_messages (conversation_id, role, content, tool_calls, timestamp) VALUES (?, ?, ?, ?, ?)").run(
      conversationId,
      message.role,
      message.content,
      message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      message.timestamp || Date.now()
    );
    d.prepare("UPDATE chat_conversations SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), conversationId);
  },

  getMessages(conversationId) {
    const d = getDb();
    const rows = d.prepare("SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC").all(conversationId);
    return rows.map(r => ({
      role: r.role,
      content: r.content,
      toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
      timestamp: r.timestamp,
    }));
  },
};

// ─── Cleanup ─────────────────────────────────────────
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
