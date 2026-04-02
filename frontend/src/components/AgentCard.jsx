import { T, mono } from "./theme.js";
import { Icon } from "./Icons.jsx";
import { Dot, Badge, STATUS_MAP } from "./Primitives.jsx";

// ─── Agent Card (selected pipeline agents) ──────────
export function AgentCard({ agent, isActive, onRemove, index, total }) {
  const s = STATUS_MAP[agent.status] || STATUS_MAP.idle;
  const color = agent.color || T.accent;
  return (
    <div style={{
      background: isActive ? T.bgElevated : T.bgCard,
      border: `1px solid ${isActive ? color + "30" : T.border0}`,
      borderRadius: T.r,
      padding: "16px 18px",
      position: "relative",
      transition: "all 0.25s ease",
      animation: `slideUp 0.35s ease ${index * 0.06}s both`,
    }}>
      {onRemove && (
        <button onClick={() => onRemove(index)} style={{ position: "absolute", top: 12, right: 12, background: T.bg3, border: `1px solid ${T.border0}`, width: 22, height: 22, borderRadius: 6, color: T.text3, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.errorMuted; e.currentTarget.style.color = T.error; e.currentTarget.style.borderColor = T.error + "30"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.bg3; e.currentTarget.style.color = T.text3; e.currentTarget.style.borderColor = T.border0; }}
        >×</button>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
            border: `1.5px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color, fontFamily: mono, flexShrink: 0,
          }}>
            {agent.status === "complete" ? Icon.check(15, color) : agent.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.text3, fontFamily: mono }}>{index + 1}/{total}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>{agent.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Dot color={s.color} size={5} pulse={agent.status === "thinking" || agent.status === "executing"} />
              <span style={{ fontSize: 11, color: s.color, fontWeight: 500, fontFamily: mono }}>{s.label}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, margin: "0 0 8px" }}>{agent.role}</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(agent.tools || []).map((t) => <Badge key={t} color={T.text2}>{t}</Badge>)}
          </div>
        </div>
      </div>
    </div>
  );
}
