// src/server.js
// AgentForge Studio — Main Server
// Multi-Agent Orchestration Engine by DevNexAI

import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pino from "pino";
import { CONFIG } from "./config.js";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Orchestrator } from "./engine/orchestrator.js";
import { createRoutes } from "./api/routes.js";
import { WSManager } from "./api/websocket.js";
import { createGuardrails } from "./engine/guardrails.js";

// ─── Configuration ────────────────────────────────────
config(); // Load .env

const PORT = CONFIG.port;
const HOST = CONFIG.host;

// ─── Logger ───────────────────────────────────────────
const logger = pino({
  level: CONFIG.logLevel,
  transport: {
    target: "pino/file",
    options: { destination: 1 }, // stdout
  },
});

// ─── Validate API Key ─────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  logger.warn("╔══════════════════════════════════════════════╗");
  logger.warn("║  ANTHROPIC_API_KEY not set in .env            ║");
  logger.warn("║  You can configure API keys from the UI       ║");
  logger.warn("║  Settings → API Keys                          ║");
  logger.warn("╚══════════════════════════════════════════════╝");
}

// ─── Anthropic Client ─────────────────────────────────
let anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Dynamic settings store (in-memory, configurable from UI)
const dynamicSettings = {
  apiKeys: {},
  provider: "anthropic",
  model: "",
};

function getActiveAnthropicClient() {
  // Frontend-configured key takes priority
  if (dynamicSettings.apiKeys.anthropic) {
    return new Anthropic({ apiKey: dynamicSettings.apiKeys.anthropic });
  }
  return anthropic;
}

function getActiveGoogleClient() {
  const key = dynamicSettings.apiKeys.google;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function getActiveClient() {
  const provider = dynamicSettings.provider || "anthropic";
  if (provider === "google") return { provider: "google", client: getActiveGoogleClient() };
  return { provider: "anthropic", client: getActiveAnthropicClient() };
}

// ─── Express App ──────────────────────────────────────
const IS_PROD = CONFIG.isProd;
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: IS_PROD ? undefined : false,  // disable CSP in dev for hot-reload
  crossOriginEmbedderPolicy: false,
}));

// CORS — only allow same-origin in prod
app.use(cors({
  origin: IS_PROD ? `http://${HOST}:${PORT}` : true,
  credentials: true,
}));

app.use(express.json({ limit: CONFIG.maxRequestBodySize }));

// Rate limiting — protect AI endpoints from abuse (per IP)
const chatLimiter = rateLimit({ windowMs: CONFIG.rateLimits.chat.windowMs, max: CONFIG.rateLimits.chat.max, message: { error: "Demasiadas peticiones. Espera un momento." }, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs: CONFIG.rateLimits.api.windowMs, max: CONFIG.rateLimits.api.max, standardHeaders: true, legacyHeaders: false });
app.use("/api/chat", chatLimiter);
app.use("/api/workflows", chatLimiter);
app.use("/api", apiLimiter);

// Disable x-powered-by
app.disable("x-powered-by");

// ─── Request ID Tracking ──────────────────────────────
app.use((req, res, next) => {
  req.id = randomBytes(8).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
});

// ─── Security: Suspicious Pattern Detection ───────────
const suspiciousPatterns = [
  /\.\.\//g,                        // path traversal
  /<script[\s>]/i,                  // XSS
  /javascript\s*:/i,               // XSS via protocol
  /on\w+\s*=\s*["']/i,            // event handler injection
  /\0/g,                           // null byte
];

app.use((req, res, next) => {
  // Check URL for suspicious patterns
  const url = decodeURIComponent(req.originalUrl || "");
  for (const pat of suspiciousPatterns) {
    if (pat.test(url)) {
      logger.warn({ msg: "Suspicious URL pattern blocked", url: req.originalUrl, requestId: req.id });
      return res.status(400).json({ error: "Bad request" });
    }
  }
  // Check for overly large headers (slowloris / header bomb prevention)
  const headerSize = Object.entries(req.headers).reduce((sum, [k, v]) => sum + k.length + String(v).length, 0);
  if (headerSize > 16384) {
    logger.warn({ msg: "Oversized headers blocked", size: headerSize, requestId: req.id });
    return res.status(431).json({ error: "Request header fields too large" });
  }
  next();
});

// ─── Security: Referrer Policy & Permissions ──────────
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// ─── Initialize Guardrails Engine ─────────────────────
const guardrails = createGuardrails(logger);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      elapsed: `${Date.now() - start}ms`,
    });
  });
  next();
});

// ─── Engine ───────────────────────────────────────────
const orchestrator = new Orchestrator(null, logger); // Client will be resolved dynamically

// ─── HTTP Server + WebSocket ──────────────────────────
const httpServer = createServer(app);
const wsManager = new WSManager(httpServer, logger);

// ─── Settings API ─────────────────────────────────────
app.get("/api/settings", (req, res) => {
  res.json({
    provider: dynamicSettings.provider,
    model: dynamicSettings.model,
    configuredProviders: {
      anthropic: !!(dynamicSettings.apiKeys.anthropic || process.env.ANTHROPIC_API_KEY),
      openai: !!dynamicSettings.apiKeys.openai,
      google: !!dynamicSettings.apiKeys.google,
    },
  });
});

app.post("/api/settings", (req, res) => {
  const { apiKeys, provider, model } = req.body;
  if (apiKeys && typeof apiKeys === "object") {
    // Only accept known provider keys, trim whitespace
    const allowed = ["anthropic", "openai", "google"];
    const sanitized = {};
    for (const k of allowed) {
      if (typeof apiKeys[k] === "string" && apiKeys[k].trim()) {
        sanitized[k] = apiKeys[k].trim();
      }
    }
    dynamicSettings.apiKeys = sanitized;
    logger.info(`API keys updated: ${Object.keys(sanitized).join(", ")}`);
    const activeAnthropicClient = getActiveAnthropicClient();
    if (activeAnthropicClient) {
      orchestrator.client = activeAnthropicClient;
    }
  }
  if (typeof provider === "string") dynamicSettings.provider = provider;
  if (typeof model === "string") dynamicSettings.model = model;
  res.json({ success: true, provider: dynamicSettings.provider, model: dynamicSettings.model });
});

// ─── Routes ───────────────────────────────────────────
// Resolve client before each workflow
app.use("/api", (req, res, next) => {
  const anthropicClient = getActiveAnthropicClient();
  if (anthropicClient && !orchestrator.client) {
    orchestrator.client = anthropicClient;
  }
  next();
});
app.use("/api", createRoutes(orchestrator, wsManager, getActiveClient, dynamicSettings, guardrails));

// ─── Serve Frontend (built files) ─────────────────────
const publicPath = join(__dirname, "..", "public");
app.use(express.static(publicPath));

// SPA fallback — serve index.html for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(join(publicPath, "index.html"));
});

// ─── Error Handler ────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({ error: err.message, stack: err.stack });
  res.status(500).json({
    error: "Internal server error",
    ...(IS_PROD ? {} : { message: err.message }),
  });
});

// ─── Start ────────────────────────────────────────────
httpServer.listen(PORT, HOST, () => {
  logger.info("╔══════════════════════════════════════════════╗");
  logger.info("║     ⚡ AgentForge Studio v1.0                ║");
  logger.info("║     Multi-Agent Orchestration Engine          ║");
  logger.info("║     by DevNexAI                               ║");
  logger.info("╠══════════════════════════════════════════════╣");
  logger.info(`║  HTTP:  http://${HOST}:${PORT}               `);
  logger.info(`║  WS:    ws://${HOST}:${PORT}                 `);
  logger.info(`║  Docs:  http://${HOST}:${PORT}/              `);
  logger.info("╚══════════════════════════════════════════════╝");
});

// ─── Graceful Shutdown ────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down`);
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
