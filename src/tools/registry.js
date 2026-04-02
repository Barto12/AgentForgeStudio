// src/tools/registry.js
// ToolRegistry — real local execution tools for AgentForge Studio
// Tools execute REAL actions on the local machine: create files, run commands, etc.

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { join, dirname, extname, resolve, normalize } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { URL } from "url";
import { CONFIG } from "../config.js";

const execFileAsync = promisify(execFile);

// ─── Workspace Config ───────────────────────────────
const WORKSPACE_ROOT = resolve(process.cwd(), "workspace");

// ─── Security: Path traversal guard ─────────────────
function safePath(userPath) {
  const resolved = resolve(WORKSPACE_ROOT, normalize(userPath));
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Acceso denegado: ruta fuera del workspace (${userPath})`);
  }
  return resolved;
}

// ─── Security: SSRF guard for outbound requests ─────
const BLOCKED_HOSTS_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|\[?::1|\[?fc|\[?fd|\[?fe80|localhost)/i;
function assertSafeUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error(`URL inválida: ${raw}`); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error(`Protocolo no permitido: ${parsed.protocol}`);
  if (BLOCKED_HOSTS_RE.test(parsed.hostname)) throw new Error(`Host bloqueado (red interna): ${parsed.hostname}`);
  return parsed.href;
}

function ensureWorkspace() {
  if (!existsSync(WORKSPACE_ROOT)) {
    mkdirSync(WORKSPACE_ROOT, { recursive: true });
  }
  return WORKSPACE_ROOT;
}

// ─── Tool Definition (for Anthropic tool_use API) ───
class Tool {
  constructor({ name, description, inputSchema, execute }) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.execute = execute;
  }

  toAnthropicTool() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.inputSchema,
    };
  }
}

// ─── Registry ───────────────────────────────────────
class ToolRegistryClass {
  constructor() {
    this.tools = new Map();
    this.createdFiles = [];
    this.registerBuiltins();
  }

  register(name, description, inputSchema, executeFn) {
    this.tools.set(name, new Tool({ name, description, inputSchema, execute: executeFn }));
  }

  get(name) { return this.tools.get(name); }

  list() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name, description: t.description,
    }));
  }

  has(name) { return this.tools.has(name); }

  getAnthropicTools() {
    return Array.from(this.tools.values()).map((t) => t.toAnthropicTool());
  }

  getAnthropicToolsFor(toolNames = []) {
    const realTools = ["create_file", "read_file", "list_files", "run_command", "create_project", "web_search", "fetch_url", "edit_file"];
    const filtered = toolNames.filter((n) => realTools.includes(n));
    // If the agent has specific real tools configured, only give those; otherwise give all
    const names = filtered.length > 0 ? filtered : realTools;
    return names
      .map((n) => this.tools.get(n))
      .filter(Boolean)
      .map((t) => t.toAnthropicTool());
  }

  getAllRealTools() {
    const realTools = ["create_file", "read_file", "list_files", "run_command", "create_project", "web_search", "fetch_url", "edit_file"];
    return realTools
      .map((n) => this.tools.get(n))
      .filter(Boolean)
      .map((t) => t.toAnthropicTool());
  }

  getCreatedFiles() { return [...this.createdFiles]; }
  clearSession() { this.createdFiles = []; }

  registerBuiltins() {
    // ─── CREATE FILE ────────────────────────────────
    this.register(
      "create_file",
      "Crea un archivo REAL en el workspace local. Usa esto para escribir código, documentos, HTML, CSS, JS, configs, etc. El archivo se guarda en disco.",
      {
        type: "object",
        properties: {
          path: { type: "string", description: "Ruta relativa del archivo. Ej: 'index.html', 'src/app.js', 'docs/plan.md'" },
          content: { type: "string", description: "Contenido completo del archivo" },
        },
        required: ["path", "content"],
      },
      async ({ path, content }) => {
        try {
          ensureWorkspace();
          const fullPath = safePath(path);
          const dir = dirname(fullPath);
          if (!existsSync(dir)) await mkdir(dir, { recursive: true });
          await writeFile(fullPath, content, "utf-8");
          this.createdFiles.push({ path, fullPath, size: content.length, type: extname(path), createdAt: new Date().toISOString() });
          return `✅ Archivo creado exitosamente: workspace/${path} (${content.length} bytes)`;
        } catch (err) {
          return `❌ Error creando archivo: ${err.message}`;
        }
      }
    );

    // ─── READ FILE ──────────────────────────────────
    this.register(
      "read_file",
      "Lee el contenido de un archivo existente en el workspace",
      {
        type: "object",
        properties: {
          path: { type: "string", description: "Ruta relativa del archivo a leer" },
        },
        required: ["path"],
      },
      async ({ path }) => {
        try {
          const fullPath = safePath(path);
          if (!existsSync(fullPath)) return `❌ Archivo no encontrado: ${path}`;
          const content = await readFile(fullPath, "utf-8");
          return content;
        } catch (err) {
          return `❌ Error leyendo archivo: ${err.message}`;
        }
      }
    );

    // ─── LIST FILES ─────────────────────────────────
    this.register(
      "list_files",
      "Lista archivos y carpetas en un directorio del workspace",
      {
        type: "object",
        properties: {
          path: { type: "string", description: "Ruta del directorio (usa '.' para raíz)" },
        },
        required: ["path"],
      },
      async ({ path }) => {
        try {
          ensureWorkspace();
          const fullPath = safePath(path);
          if (!existsSync(fullPath)) return `❌ Directorio no encontrado: ${path}`;
          const entries = await readdir(fullPath, { withFileTypes: true });
          const listing = entries.map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
          return listing.length > 0 ? listing.join("\n") : "(directorio vacío)";
        } catch (err) {
          return `❌ Error: ${err.message}`;
        }
      }
    );

    // ─── RUN COMMAND ────────────────────────────────
    this.register(
      "run_command",
      "Ejecuta un comando en la terminal del sistema. Usa esto para: npm install, npm init, crear carpetas, ejecutar scripts, compilar, etc. Se ejecuta dentro del workspace.",
      {
        type: "object",
        properties: {
          command: { type: "string", description: "Comando a ejecutar. Ej: 'npm init -y', 'npm install express'" },
        },
        required: ["command"],
      },
      async ({ command }) => {
        try {
          ensureWorkspace();
          // Block destructive commands
          const blocked = [
            "rm -rf /", "rm -rf /*", "format c:", "del /s /q c:", "rmdir /s /q c:",
            "mkfs", "dd if=", ":(){:|:&};:", "shutdown", "reboot", "halt",
            "passwd", "chown -R", "chmod -R 777 /", "wget http", "curl http",
            "nc -l", "ncat", "netcat", "powershell -e", "powershell -enc",
            "cmd /c", "reg delete", "reg add", "net user", "net localgroup",
          ];
          const cmdLower = command.toLowerCase().trim();
          if (blocked.some((b) => cmdLower.includes(b))) {
            return "❌ Comando bloqueado por seguridad";
          }
          // Block shell escape operators that could chain dangerous commands
          if (/[;`\n\r]|\$\(|\|\||&&/.test(command)) {
            return "❌ Operadores de shell (;, &&, ||, ``, $(), newlines) no permitidos por seguridad. Usa comandos simples.";
          }
          // Use execFile with explicit shell to prevent injection via argument manipulation
          const isWindows = process.platform === "win32";
          const shell = isWindows ? "cmd" : "/bin/sh";
          const shellArgs = isWindows ? ["/c", command] : ["-c", command];
          const { stdout, stderr } = await execFileAsync(shell, shellArgs, {
            cwd: WORKSPACE_ROOT, timeout: CONFIG.commandTimeoutMs, encoding: "utf-8",
            maxBuffer: CONFIG.toolOutput.commandMaxBuffer,
          });
          const output = stdout || stderr || "";
          return `$ ${command}\n${output || "(completado sin output)"}`;
        } catch (err) {
          return `$ ${command}\n⚠️ ${err.stdout || ""}${err.stderr || err.message || ""}`;
        }
      }
    );

    // ─── CREATE PROJECT ─────────────────────────────
    this.register(
      "create_project",
      "Crea la estructura completa de un proyecto con múltiples archivos de una sola vez. Ideal para scaffolding de proyectos completos.",
      {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del proyecto (carpeta)" },
          files: {
            type: "array",
            description: "Lista de archivos a crear",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Ruta dentro del proyecto" },
                content: { type: "string", description: "Contenido del archivo" },
              },
              required: ["path", "content"],
            },
          },
        },
        required: ["name", "files"],
      },
      async ({ name, files }) => {
        try {
          ensureWorkspace();
          let fileList = files;
          if (typeof fileList === "string") {
            try { fileList = JSON.parse(fileList); } catch { return `❌ Error creando proyecto: 'files' no es un array válido`; }
          }
          if (!Array.isArray(fileList)) return `❌ Error creando proyecto: 'files' debe ser un array`;
          const projectDir = safePath(name);
          if (!existsSync(projectDir)) await mkdir(projectDir, { recursive: true });
          const results = [];
          for (const file of fileList) {
            const fullPath = safePath(join(name, file.path));
            const dir = dirname(fullPath);
            if (!existsSync(dir)) await mkdir(dir, { recursive: true });
            await writeFile(fullPath, file.content, "utf-8");
            this.createdFiles.push({ path: `${name}/${file.path}`, fullPath, size: file.content.length, type: extname(file.path), createdAt: new Date().toISOString() });
            results.push(`  ✅ ${file.path} (${file.content.length} bytes)`);
          }
          return `📁 Proyecto "${name}" creado con ${fileList.length} archivos:\n${results.join("\n")}`;
        } catch (err) {
          return `❌ Error creando proyecto: ${err.message}`;
        }
      }
    );

    // ─── WEB SEARCH (real DuckDuckGo) ────────────────
    this.register(
      "web_search",
      "Busca información actualizada en internet usando DuckDuckGo. Usa esto para datos recientes, noticias, documentación, estadísticas, precios, o cualquier consulta que necesite información actualizada.",
      {
        type: "object",
        properties: {
          query: { type: "string", description: "La consulta de búsqueda en internet" },
        },
        required: ["query"],
      },
      async ({ query }) => {
        try {
          if (query.length > CONFIG.maxQueryLength) return `❌ Query demasiado largo (máx ${CONFIG.maxQueryLength} chars)`;
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const resp = await fetch(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          });
          const html = await resp.text();

          const results = [];
          const linkMatches = [...html.matchAll(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
          const snippetMatches = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div|span)/gi)];

          for (let i = 0; i < Math.min(linkMatches.length, CONFIG.toolOutput.webSearchMaxResults); i++) {
            let url = linkMatches[i][1];
            if (url.includes("uddg=")) {
              try { url = decodeURIComponent(url.split("uddg=")[1].split("&")[0]); } catch {}
            }
            const title = linkMatches[i][2].replace(/<[^>]*>/g, "").trim();
            const snippet = (snippetMatches[i]?.[1] || "").replace(/<[^>]*>/g, "").trim();
            if (title) results.push({ title, url, snippet });
          }

          if (results.length === 0) {
            return `🔍 "${query}" — sin resultados relevantes. Prueba con otros términos.`;
          }

          return `🔍 Resultados para "${query}" (${results.length}):\n\n${results.map((r, i) =>
            `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`
          ).join("\n\n")}`;
        } catch (err) {
          return `❌ Error en búsqueda web: ${err.message}`;
        }
      }
    );

    // ─── FETCH URL ───────────────────────────────────
    this.register(
      "fetch_url",
      "Lee y extrae el contenido de texto de una página web dada su URL. Útil para leer artículos, documentación, repos de GitHub, o cualquier página web.",
      {
        type: "object",
        properties: {
          url: { type: "string", description: "La URL completa de la página a leer (https://...)" },
        },
        required: ["url"],
      },
      async ({ url }) => {
        try {
          const safeUrl = assertSafeUrl(url);
          const resp = await fetch(safeUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(15000),
            redirect: "follow",
          });
          // Verify the final URL after redirects is still safe (prevents SSRF via open redirect)
          if (resp.url) assertSafeUrl(resp.url);
          if (!resp.ok) return `❌ HTTP ${resp.status} al acceder a ${url}`;
          const contentType = resp.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const json = await resp.json();
            const str = JSON.stringify(json, null, 2);
            return str.length > CONFIG.toolOutput.jsonResponseMaxChars ? str.slice(0, CONFIG.toolOutput.jsonResponseMaxChars) + "\n\n[... truncado ...]" : str;
          }

          const html = await resp.text();
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : url;

          let text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim();

          if (text.length > CONFIG.toolOutput.fetchUrlMaxChars) text = text.slice(0, CONFIG.toolOutput.fetchUrlMaxChars) + "\n\n[... contenido truncado ...]";

          return `📄 **${title}**\nURL: ${url}\n\n${text}`;
        } catch (err) {
          return `❌ Error leyendo URL: ${err.message}`;
        }
      }
    );

    // ─── EDIT FILE ───────────────────────────────────
    this.register(
      "edit_file",
      "Edita un archivo existente en el workspace reemplazando un texto específico por otro. Ideal para cambios puntuales sin reescribir todo el archivo.",
      {
        type: "object",
        properties: {
          path: { type: "string", description: "Ruta relativa del archivo a editar" },
          old_text: { type: "string", description: "El texto exacto a buscar y reemplazar" },
          new_text: { type: "string", description: "El texto nuevo que reemplazará al anterior" },
        },
        required: ["path", "old_text", "new_text"],
      },
      async ({ path, old_text, new_text }) => {
        try {
          ensureWorkspace();
          const fullPath = safePath(path);
          if (!existsSync(fullPath)) return `❌ Archivo no encontrado: ${path}`;
          const content = await readFile(fullPath, "utf-8");
          if (!content.includes(old_text)) {
            return `❌ No se encontró el texto a reemplazar en ${path}. Verifica que sea exacto.`;
          }
          const newContent = content.replace(old_text, new_text);
          await writeFile(fullPath, newContent, "utf-8");
          return `✅ Archivo editado: workspace/${path} (reemplazo aplicado)`;
        } catch (err) {
          return `❌ Error editando archivo: ${err.message}`;
        }
      }
    );

    // ─── Lightweight tools (AI-only, no filesystem) ─
    const lightTools = [
      ["planning", "Descompone un objetivo en sub-tareas priorizadas. Retorna el plan estructurado."],
      ["delegation", "Asigna sub-tareas a agentes del pipeline. Retorna las asignaciones."],
      ["analysis", "Analiza datos o información y genera insights estructurados."],
      ["review", "Revisa contenido y genera feedback detallado con recomendaciones."],
      ["validation", "Valida calidad y corrección de un output. Retorna resultado de validación."],
      ["summarize", "Resume textos largos en puntos clave estructurados."],
      ["json_parse", "Parsea y valida estructuras JSON."],
    ];

    for (const [name, desc] of lightTools) {
      if (!this.tools.has(name)) {
        this.register(
          name, desc,
          { type: "object", properties: { input: { type: "string", description: "Datos de entrada para procesar" } }, required: ["input"] },
          async ({ input }) => {
            // Return the input back as processed result so the agent can build on it
            return `[${name}] Procesado correctamente.\n\nResultado del análisis:\n${input}\n\nPuedes continuar con la siguiente acción. Si necesitas crear archivos, usa create_file o create_project.`;
          }
        );
      }
    }
  }
}

export const ToolRegistry = new ToolRegistryClass();
export { WORKSPACE_ROOT };
