import { T, mono } from "./theme.js";

// ─── Stats Card ─────────────────────────────────────
export function StatCard({ label, value, sub, color = T.text0 }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.r, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: T.text3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: mono, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
