// src/engine/guardrails.js
// NeMo Guardrails-inspired safety system for AgentForge Studio
// Provides input/output rails, topic control, jailbreak detection, and PII filtering

import { createRequire } from "module";

// ─── Default Configuration ──────────────────────────
const DEFAULT_CONFIG = {
  enabled: true,
  input: {
    jailbreakDetection: true,
    promptInjection: true,
    piiDetection: true,
    topicControl: true,
    maxInputLength: 100_000,
  },
  output: {
    contentSafety: true,
    piiMasking: true,
    codeExecutionWarning: true,
  },
  blockedTopics: [],
  allowedTopics: [], // empty = all topics allowed
  customBlockedPatterns: [],
  auditLog: true,
};

// ─── Pattern Databases ──────────────────────────────

// Jailbreak / prompt-injection patterns (case-insensitive)
const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|prompts|rules|programming)/i,
  /you\s+are\s+now\s+(DAN|jailbr[eo]ken|unfiltered|uncensored|evil)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a\s+)?(DAN|evil|unrestricted|unfiltered)/i,
  /act\s+as\s+(a\s+)?(DAN|jailbr[eo]ken|unrestricted|unfiltered)/i,
  /developer\s+mode\s+(enabled|activated|on)/i,
  /bypass\s+(your|all|the|any)\s+(safety|content|ethical)\s+(filters?|restrictions?|guidelines?)/i,
  /override\s+(your|all|the|any)\s+(safety|content|ethical)\s+(filters?|restrictions?|guidelines?|rules?)/i,
  /from\s+now\s+on\s+you\s+(will|must|should)\s+(ignore|disregard|bypass)/i,
  /\bdo\s+anything\s+now\b/i,
  /\bsystem\s*:\s*you\s+are\s+now/i,
  /\]\s*\}\s*system\s*:/i, // JSON injection attempts
  /forget\s+(everything|all)\s+(you|about)\s+(know|were|have)/i,
];

// Prompt injection - attempts to manipulate system behavior
const INJECTION_PATTERNS = [
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
  /\bsystem\s*prompt\s*:\s*/i,
  /\bnew\s+instructions?\s*:\s*/i,
  /\bhuman\s*:\s*.*\bassistant\s*:/is,
  /\bignore\s+the\s+above\b/i,
  /\bdo\s+not\s+follow\s+your\s+(rules|instructions|guidelines)\b/i,
  /恢复出厂设置/i, // reset to factory settings (Chinese injection)
  /초기화/i, // initialization (Korean injection)
];

// PII patterns
const PII_PATTERNS = [
  { type: "ssn", pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, description: "Social Security Number" },
  { type: "credit_card", pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, description: "Credit Card Number" },
  { type: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, description: "Email Address" },
  { type: "phone_mx", pattern: /\b(?:\+?52\s?)?(?:\d{2,3}\s?)?\d{4}[-\s]?\d{4}\b/g, description: "Phone (MX)" },
  { type: "phone_us", pattern: /\b(?:\+?1[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g, description: "Phone (US)" },
  { type: "curp", pattern: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}\b/g, description: "CURP (MX)" },
  { type: "rfc", pattern: /\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b/g, description: "RFC (MX)" },
];

// Unsafe content patterns for output filtering
const UNSAFE_OUTPUT_PATTERNS = [
  { type: "malware_code", pattern: /(?:virus|trojan|keylogger|ransomware|exploit)\s*(?:code|script|payload)/i, severity: "high" },
  { type: "credential_leak", pattern: /(?:password|secret|token|api_?key)\s*[:=]\s*["']?[^\s"']{8,}/i, severity: "medium" },
  { type: "dangerous_command", pattern: /(?:rm\s+-rf\s+\/|format\s+[cC]:|del\s+\/[sfq]\s+[cC]:|::\(\)\s*\{|fork\s*bomb)/i, severity: "high" },
  { type: "sql_injection_output", pattern: /(?:DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+.*SET\s+.*WHERE|INSERT\s+INTO).*(?:--|;)/i, severity: "medium" },
];

// ─── Precompiled Combined Patterns (performance optimization) ──
// Instead of looping through 20+ individual patterns, combine into single regex where possible
const JAILBREAK_COMBINED = new RegExp(
  JAILBREAK_PATTERNS.map(p => `(?:${p.source})`).join("|"), "i"
);

const INJECTION_COMBINED = new RegExp(
  INJECTION_PATTERNS.map(p => `(?:${p.source})`).join("|"), "is"
);

const UNSAFE_OUTPUT_COMBINED_HIGH = new RegExp(
  UNSAFE_OUTPUT_PATTERNS.filter(p => p.severity === "high").map(p => `(?:${p.pattern.source})`).join("|"), "i"
);

const UNSAFE_OUTPUT_COMBINED_MEDIUM = new RegExp(
  UNSAFE_OUTPUT_PATTERNS.filter(p => p.severity === "medium").map(p => `(?:${p.pattern.source})`).join("|"), "i"
);

// ─── Guardrails Engine ──────────────────────────────
class GuardrailsEngine {
  constructor(logger) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG };
    this.auditLog = [];
    this.stats = {
      inputChecks: 0,
      outputChecks: 0,
      inputBlocked: 0,
      outputBlocked: 0,
      piiDetected: 0,
      jailbreakAttempts: 0,
    };
  }

  // ─── Configuration ──────────────────────────────
  updateConfig(newConfig) {
    // Deep merge with current config
    if (newConfig.input) this.config.input = { ...this.config.input, ...newConfig.input };
    if (newConfig.output) this.config.output = { ...this.config.output, ...newConfig.output };
    if (typeof newConfig.enabled === "boolean") this.config.enabled = newConfig.enabled;
    if (Array.isArray(newConfig.blockedTopics)) this.config.blockedTopics = newConfig.blockedTopics;
    if (Array.isArray(newConfig.allowedTopics)) this.config.allowedTopics = newConfig.allowedTopics;
    if (Array.isArray(newConfig.customBlockedPatterns)) {
      this.config.customBlockedPatterns = newConfig.customBlockedPatterns;
    }
    if (typeof newConfig.auditLog === "boolean") this.config.auditLog = newConfig.auditLog;
  }

  getConfig() {
    return { ...this.config };
  }

  getStats() {
    return { ...this.stats };
  }

  getAuditLog(limit = 50) {
    return this.auditLog.slice(-limit);
  }

  // ─── Input Rail ─────────────────────────────────
  // Returns { allowed: boolean, violations: [], sanitizedInput: string }
  checkInput(text) {
    if (!this.config.enabled) return { allowed: true, violations: [], sanitizedInput: text };

    this.stats.inputChecks++;
    const violations = [];

    // Length check
    if (text.length > this.config.input.maxInputLength) {
      violations.push({
        type: "input_too_long",
        severity: "medium",
        message: `Input exceeds maximum length (${text.length}/${this.config.input.maxInputLength})`,
      });
    }

    // Jailbreak detection (precompiled single-pass regex)
    if (this.config.input.jailbreakDetection) {
      if (JAILBREAK_COMBINED.test(text)) {
        violations.push({
          type: "jailbreak_attempt",
          severity: "high",
          message: "Jailbreak attempt detected",
        });
        this.stats.jailbreakAttempts++;
      }
    }

    // Prompt injection detection (precompiled single-pass regex)
    if (this.config.input.promptInjection) {
      if (INJECTION_COMBINED.test(text)) {
        violations.push({
          type: "prompt_injection",
          severity: "high",
          message: "Prompt injection attempt detected",
        });
      }
    }

    // PII detection (warn, don't block)
    if (this.config.input.piiDetection) {
      for (const pii of PII_PATTERNS) {
        const matches = text.match(pii.pattern);
        if (matches) {
          violations.push({
            type: "pii_detected",
            severity: "low",
            message: `PII detected: ${pii.description} (${matches.length} instance(s))`,
            piiType: pii.type,
            count: matches.length,
          });
          this.stats.piiDetected += matches.length;
        }
      }
    }

    // Topic control
    if (this.config.input.topicControl) {
      const topicViolation = this._checkTopics(text);
      if (topicViolation) violations.push(topicViolation);
    }

    // Custom blocked patterns
    for (const custom of this.config.customBlockedPatterns) {
      try {
        const re = new RegExp(custom, "i");
        if (re.test(text)) {
          violations.push({
            type: "custom_blocked",
            severity: "medium",
            message: `Matched custom blocked pattern`,
          });
        }
      } catch {
        // Invalid regex, skip
      }
    }

    const hasBlockingViolation = violations.some((v) => v.severity === "high");
    if (hasBlockingViolation) this.stats.inputBlocked++;

    // Audit log
    if (this.config.auditLog && violations.length > 0) {
      this._audit("input", violations, text.slice(0, 200));
    }

    return {
      allowed: !hasBlockingViolation,
      violations,
      sanitizedInput: text,
    };
  }

  // ─── Output Rail ────────────────────────────────
  // Returns { allowed: boolean, violations: [], sanitizedOutput: string }
  checkOutput(text) {
    if (!this.config.enabled) return { allowed: true, violations: [], sanitizedOutput: text };

    this.stats.outputChecks++;
    const violations = [];
    let sanitized = text;

    // Content safety (precompiled single-pass)
    if (this.config.output.contentSafety) {
      if (UNSAFE_OUTPUT_COMBINED_HIGH.test(text)) {
        // Find which specific pattern matched for reporting
        for (const pattern of UNSAFE_OUTPUT_PATTERNS.filter(p => p.severity === "high")) {
          if (pattern.pattern.test(text)) {
            violations.push({ type: pattern.type, severity: pattern.severity, message: `Unsafe content detected: ${pattern.type}` });
          }
        }
      }
      if (UNSAFE_OUTPUT_COMBINED_MEDIUM.test(text)) {
        for (const pattern of UNSAFE_OUTPUT_PATTERNS.filter(p => p.severity === "medium")) {
          if (pattern.pattern.test(text)) {
            violations.push({ type: pattern.type, severity: pattern.severity, message: `Unsafe content detected: ${pattern.type}` });
          }
        }
      }
    }

    // PII masking in output
    if (this.config.output.piiMasking) {
      for (const pii of PII_PATTERNS) {
        const matches = sanitized.match(pii.pattern);
        if (matches) {
          // Mask PII by type
          sanitized = sanitized.replace(pii.pattern, (match) => {
            if (pii.type === "email") return match.slice(0, 3) + "***@***";
            if (pii.type === "credit_card") return "****-****-****-" + match.slice(-4);
            if (pii.type === "ssn") return "***-**-" + match.slice(-4);
            return "*".repeat(match.length);
          });
          violations.push({
            type: "pii_masked",
            severity: "info",
            message: `PII masked in output: ${pii.description}`,
            piiType: pii.type,
          });
        }
      }
    }

    // Code execution warning
    if (this.config.output.codeExecutionWarning) {
      const dangerousCodePatterns = [
        /```(?:bash|sh|shell|powershell|cmd|bat)\n.*(?:rm\s|del\s|format\s|fdisk|mkfs|dd\s+if)/is,
        /```(?:python|py)\n.*(?:os\.system|subprocess\.|exec\(|eval\()/is,
        /```(?:javascript|js|node)\n.*(?:child_process|exec\(|eval\(|Function\()/is,
      ];
      for (const pat of dangerousCodePatterns) {
        if (pat.test(text)) {
          violations.push({
            type: "dangerous_code",
            severity: "medium",
            message: "Output contains potentially dangerous code execution patterns",
          });
          break;
        }
      }
    }

    const hasBlockingViolation = violations.some((v) => v.severity === "high");
    if (hasBlockingViolation) this.stats.outputBlocked++;

    if (this.config.auditLog && violations.length > 0) {
      this._audit("output", violations, text.slice(0, 200));
    }

    return {
      allowed: !hasBlockingViolation,
      violations,
      sanitizedOutput: sanitized,
    };
  }

  // ─── Topic Control ──────────────────────────────
  _checkTopics(text) {
    const lower = text.toLowerCase();

    // Check blocked topics
    for (const topic of this.config.blockedTopics) {
      if (lower.includes(topic.toLowerCase())) {
        return {
          type: "blocked_topic",
          severity: "high",
          message: `Blocked topic detected: "${topic}"`,
          topic,
        };
      }
    }

    return null;
  }

  // ─── Audit Logging ─────────────────────────────
  _audit(direction, violations, textPreview) {
    const entry = {
      timestamp: new Date().toISOString(),
      direction,
      violations: violations.map((v) => ({ type: v.type, severity: v.severity, message: v.message })),
      textPreview: textPreview.slice(0, 100) + (textPreview.length > 100 ? "..." : ""),
    };
    this.auditLog.push(entry);
    // Keep audit log bounded
    if (this.auditLog.length > 500) this.auditLog = this.auditLog.slice(-400);

    if (this.logger) {
      const level = violations.some((v) => v.severity === "high") ? "warn" : "info";
      this.logger[level]({
        msg: `Guardrail ${direction} violation`,
        violations: violations.map((v) => v.type),
      });
    }
  }

  // ─── Summary for SSE events ─────────────────────
  formatViolationsForClient(violations) {
    if (!violations || violations.length === 0) return null;
    return violations.map((v) => ({
      type: v.type,
      severity: v.severity,
      message: v.message,
    }));
  }
}

// Singleton
let instance = null;

export function createGuardrails(logger) {
  instance = new GuardrailsEngine(logger);
  return instance;
}

export function getGuardrails() {
  return instance;
}

export { DEFAULT_CONFIG as GUARDRAILS_DEFAULT_CONFIG };
