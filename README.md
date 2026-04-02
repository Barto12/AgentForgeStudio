# ⚡ AgentForge Studio

**Multi-Agent Orchestration Engine by DevNexAI**

Diseña, conecta y ejecuta pipelines de agentes autónomos de IA. No es un chatbot — es un motor de orquestación donde múltiples agentes colaboran para resolver objetivos complejos.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                │
│   Agent Design  │  Pipeline Viz  │  Execution Log        │
└────────┬────────────────┬──────────────────┬─────────────┘
         │ REST API       │ WebSocket        │
┌────────▼────────────────▼──────────────────▼─────────────┐
│                    Backend (Node.js + Express)            │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Orchestrator Engine                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │    │
│  │  │ Agent A  │→│ Agent B  │→│ Agent C          │  │    │
│  │  │ (Strat.) │ │ (Research)│ │ (Builder)        │  │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │    │
│  │         ↕ SharedMemory  ↕  ToolRegistry           │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Anthropic API  │
              │  (Claude)       │
              └─────────────────┘
```

## Modos de Ejecución

| Modo | Patrón | Uso |
|------|--------|-----|
| **Sequential** | A → B → C | Pipeline lineal, cada agente recibe el output del anterior |
| **Parallel** | A \| B \| C | Todos ejecutan simultáneamente, outputs se mergen |
| **Fan-Out/In** | A → (B \| C) → D | Primer agente descompone, paralelo intermedio, síntesis final |

## Setup

### Requisitos
- Node.js ≥ 18
- API Key de Anthropic

### Instalación

```bash
# Clonar o descomprimir el proyecto
cd agentforge-studio

# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend && npm install && cd ..

# Configurar API key
cp .env.example .env
# Editar .env y agregar tu ANTHROPIC_API_KEY
```

### Ejecución

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run frontend
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- WebSocket: ws://localhost:3001/ws/:workflowId

## API Reference

### Endpoints

#### `GET /api/health`
Estado del servidor.

#### `GET /api/presets`
Lista de workflows predefinidos.

#### `GET /api/tools`
Lista de herramientas disponibles para agentes.

#### `POST /api/workflows`
Crea y ejecuta un workflow (asíncrono — usa WebSocket para streaming).

```json
{
  "objective": "Analiza el mercado de AI agents en LATAM",
  "presetId": "research-report"
}
```

o con agentes personalizados:

```json
{
  "name": "Mi Workflow",
  "objective": "Genera un plan de negocio para una startup de AI",
  "mode": "sequential",
  "agents": [
    {
      "name": "Estratega",
      "role": "Define la visión, misión y estrategia del negocio",
      "tools": ["planning"]
    },
    {
      "name": "Analista de Mercado",
      "role": "Investiga el mercado objetivo y competencia",
      "tools": ["web_search", "analysis"]
    },
    {
      "name": "Financiero",
      "role": "Genera proyecciones financieras y modelo de revenue",
      "tools": ["analysis", "json_parse"]
    }
  ]
}
```

#### `POST /api/workflows/sync`
Igual que `/workflows` pero espera a que termine (respuesta síncrona).

#### `POST /api/workflows/:id/abort`
Aborta un workflow en ejecución.

#### `GET /api/workflows/:id/results`
Obtiene los resultados de un workflow completado.

### WebSocket

Conéctate a `ws://localhost:3001/ws/:workflowId` para recibir eventos en tiempo real:

```javascript
const ws = new WebSocket("ws://localhost:3001/ws/workflow-id");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: agent_start | agent_status | agent_stream | agent_complete | workflow_complete
  console.log(data);
};
```

## Estructura del Proyecto

```
agentforge-studio/
├── src/
│   ├── server.js              # Entry point del servidor
│   ├── engine/
│   │   ├── agent.js           # Clase Agent — unidad autónoma de ejecución
│   │   ├── orchestrator.js    # Orchestrator — motor de orquestación multi-agente
│   │   ├── memory.js          # SharedMemory — comunicación inter-agente
│   │   └── presets.js         # Workflows predefinidos
│   ├── api/
│   │   ├── routes.js          # REST API endpoints
│   │   └── websocket.js       # WebSocket manager para streaming
│   └── tools/
│       └── registry.js        # Registry de herramientas + built-ins
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # UI principal
│   │   └── api.js             # Cliente API + WebSocket
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

## Presets Incluidos

| Preset | Agentes | Modo | Descripción |
|--------|---------|------|-------------|
| `research-report` | 4 | Sequential | Investigación profunda + reporte estructurado |
| `code-review-pipeline` | 3 | Sequential | Arquitectura → código → QA review |
| `strategic-analysis` | 4 | Fan-Out/In | Análisis multi-perspectiva con síntesis |
| `content-pipeline` | 3 | Sequential | Estrategia → redacción → edición SEO |

## Extensibilidad

### Agregar herramientas custom

```javascript
// En src/tools/registry.js
ToolRegistry.register(
  "mi_herramienta",
  "Descripción de lo que hace",
  async (params) => {
    // Lógica de la herramienta
    return "resultado";
  }
);
```

### Crear presets custom

```javascript
// En src/engine/presets.js
export const PRESETS = {
  "mi-preset": {
    name: "Mi Workflow Custom",
    mode: "fan_out_in",
    agents: [/* ... */],
  },
};
```

---

**DevNexAI** — AI Agents & Automation
