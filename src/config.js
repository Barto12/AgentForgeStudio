// src/config.js
// Centralized configuration — all tunable values in one place

import { config as dotenvConfig } from "dotenv";
dotenvConfig();

export const CONFIG = {
  // Server
  port: parseInt(process.env.PORT) || 3001,
  host: process.env.HOST || "localhost",
  isProd: process.env.NODE_ENV === "production",
  logLevel: process.env.LOG_LEVEL || "info",

  // AI defaults
  defaultModel: process.env.DEFAULT_MODEL || "claude-sonnet-4-20250514",
  maxTokens: parseInt(process.env.MAX_TOKENS) || 16384,
  temperature: parseFloat(process.env.TEMPERATURE) || 0.7,

  // Execution limits
  maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
  maxToolRounds: parseInt(process.env.MAX_TOOL_ROUNDS) || 25,
  workflowTimeoutMs: parseInt(process.env.EXECUTION_TIMEOUT_MS) || 300000,
  agentTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS) || 120000,
  commandTimeoutMs: parseInt(process.env.COMMAND_TIMEOUT_MS) || 60000,

  // Rate limiting
  rateLimits: {
    chat: { windowMs: 60_000, max: 20 },
    api: { windowMs: 60_000, max: 120 },
  },

  // Tool output limits
  toolOutput: {
    webSearchMaxResults: 6,
    fetchUrlMaxChars: 12000,
    jsonResponseMaxChars: 16000,
    commandMaxBuffer: 1024 * 1024,
  },

  // WebSocket
  ws: {
    heartbeatIntervalMs: 30000,
    cleanupIntervalMs: 60000,
  },

  // Workspace
  maxRequestBodySize: "2mb",
  maxMessagesPerChat: 100,
  maxMessageLength: 100_000,
  maxWorkflowAgents: 10,
  maxQueryLength: 500,
};
