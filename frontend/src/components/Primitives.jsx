import { T, mono } from "./theme.js";

// ─── Primitives ─────────────────────────────────────
export function Dot({ color, pulse: p = false, size = 6, style: sx = {} }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, animation: p ? "pulse 2s ease-in-out infinite" : "none", ...sx }} />;
}

export function Badge({ children, color = T.text2, bg }) {
  return (
    <span style={{ fontSize: 11, lineHeight: "20px", padding: "0 8px", borderRadius: 5, background: bg || T.bg3, color, fontFamily: mono, fontWeight: 500, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
      {children}
    </span>
  );
}

export function SectionHeader({ children, right, style: sx = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, ...sx }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: T.text2, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>{children}</h2>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>}
    </div>
  );
}

export function Btn({ children, onClick, disabled, variant = "default", size = "md", style: sx = {} }) {
  const sizes = {
    sm: { padding: "5px 10px", fontSize: 12, gap: 5 },
    md: { padding: "8px 16px", fontSize: 13, gap: 6 },
    lg: { padding: "10px 22px", fontSize: 14, gap: 8 },
  };
  const s = sizes[size] || sizes.md;
  const base = {
    borderRadius: T.rSm, fontWeight: 500, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1, border: "none", display: "inline-flex",
    alignItems: "center", justifyContent: "center", lineHeight: "20px", whiteSpace: "nowrap", ...s, ...sx,
  };
  const variants = {
    default: { background: T.bg3, color: T.text1, border: `1px solid ${T.border1}` },
    primary: { background: T.accent, color: "#fff", boxShadow: "0 1px 8px rgba(129,140,248,0.18)" },
    danger: { background: T.error, color: "#fff", boxShadow: "0 1px 8px rgba(248,113,113,0.18)" },
    ghost: { background: "transparent", color: T.text2 },
    subtle: { background: T.bg2, color: T.text1, border: `1px solid ${T.border0}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

export const STATUS_MAP = {
  idle: { color: T.text3, label: "Idle" },
  thinking: { color: T.warning, label: "Thinking" },
  executing: { color: T.accent, label: "Running" },
  complete: { color: T.success, label: "Done" },
  error: { color: T.error, label: "Error" },
};
