import { T } from "./theme.js";
import { Dot } from "./Primitives.jsx";

// ─── Pipeline Progress ──────────────────────────────
export function PipelineBar({ agents, activeAgentId }) {
  if (agents.length === 0) return null;
  const done = agents.filter((a) => a.status === "complete").length;
  const pct = agents.length > 0 ? (done / agents.length) * 100 : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>{done}/{agents.length} agents complete</span>
        {pct > 0 && <span style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}>{Math.round(pct)}%</span>}
      </div>
      <div style={{ height: 3, background: T.bg3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", background: `linear-gradient(90deg, ${T.accent}, ${T.success})`, borderRadius: 3, width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
        {agents.map((a, i) => {
          const isActive = activeAgentId === a.id;
          const isDone = a.status === "complete";
          const color = a.color || T.accent;
          return (
            <div key={a.id || i} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
              background: isActive ? `${color}10` : isDone ? T.successSoft : T.bg2,
              border: `1px solid ${isActive ? color + "30" : isDone ? T.success + "20" : T.border0}`,
              borderRadius: T.rSm, flexShrink: 0, transition: "all 0.3s ease",
            }}>
              <Dot color={isDone ? T.success : isActive ? color : T.text3} size={5} pulse={isActive} />
              <span style={{ fontSize: 11, fontWeight: 500, color: isDone ? T.success : isActive ? color : T.text2 }}>{a.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
