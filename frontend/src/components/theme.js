// ─── Design Tokens ──────────────────────────────────
export const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
export const sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const T = {
  bg0: "#08080A",
  bg1: "#0E0E11",
  bg2: "#151518",
  bg3: "#1C1C20",
  bg4: "#27272A",
  bgCard: "#111114",
  bgElevated: "#19191D",
  border0: "rgba(255,255,255,0.045)",
  border1: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.11)",
  text0: "#ECECEF",
  text1: "rgba(255,255,255,0.70)",
  text2: "rgba(255,255,255,0.44)",
  text3: "rgba(255,255,255,0.22)",
  accent: "#818CF8",
  accentHover: "#6366F1",
  accentSoft: "rgba(129,140,248,0.08)",
  accentMuted: "rgba(129,140,248,0.14)",
  success: "#34D399",
  successSoft: "rgba(52,211,153,0.08)",
  successMuted: "rgba(52,211,153,0.14)",
  warning: "#FBBF24",
  warningMuted: "rgba(251,191,36,0.10)",
  error: "#F87171",
  errorMuted: "rgba(248,113,113,0.10)",
  r: 10,
  rSm: 6,
  rLg: 14,
};

export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: ${sans}; background: ${T.bg0}; color: ${T.text0}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInFast { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  textarea, input, select, button { font-family: ${sans}; }
  button { transition: all 0.15s ease; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 5px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
  ::selection { background: ${T.accentMuted}; color: ${T.text0}; }
  a { color: ${T.accent}; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

// ─── XSS-safe text helper ──────────────────────────
export function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
