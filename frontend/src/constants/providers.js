export const PROVIDERS = [
  { key: "anthropic", name: "Anthropic", description: "Claude models (Sonnet, Opus, Haiku)", color: "#D4A574",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    ],
  },
  { key: "openai", name: "OpenAI", description: "GPT-4o, GPT-4, o1 models", color: "#74AA9C",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "o1-preview", name: "o1 Preview" },
      { id: "o1-mini", name: "o1 Mini" },
    ],
  },
  { key: "google", name: "Google AI", description: "Gemini Pro, Flash, Ultra", color: "#4285F4",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
  },
];
