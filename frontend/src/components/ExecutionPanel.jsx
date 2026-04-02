import { useState, useEffect, useRef } from "react";
import { T, mono } from "./theme.js";
import { Icon } from "./Icons.jsx";
import { Dot } from "./Primitives.jsx";

// ─── Execution Panel ────────────────────────────────
export function ExecutionPanel({ events, isRunning, startedAt }) {
  const ref = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [events]);
  useEffect(() => { if (isRunning) setExpanded(true); }, [isRunning]);

  useEffect(() => {
    if (!isRunning) { setElapsed(0); return; }
    const t0 = startedAt || Date.now();
    setElapsed(Math.floor((Date.now() - t0) / 1000));
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [isRunning, startedAt]);

  const statusEvents = events.filter(
    (ev) => ev.type !== "agent_stream" && ev.type !== "subscribed" && ev.type !== "connected" && ev.message
  );
  const streamEvents = events.filter((ev) => ev.type === "agent_stream" && ev.chunk);
  const streamPreview = (() => {
    if (streamEvents.length === 0) return "";
    let text = "";
    for (let i = Math.max(0, streamEvents.length - 40); i < streamEvents.length; i++) {
      text += streamEvents[i].chunk || "";
    }
    return text.length > 500 ? "…" + text.slice(-500) : text;
  })();

  const formatTime = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  const fmtElapsed = (s) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}m ${sec}s` : `${sec}s`; };

  const hasContent = statusEvents.length > 0 || isRunning;
  if (!hasContent && !isRunning) return null;

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border0}`, borderRadius: T.rLg, overflow: "hidden", animation: "slideUp 0.3s ease", marginTop: 20 }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "12px 18px", border: "none", background: "transparent", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: expanded ? `1px solid ${T.border0}` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color={isRunning ? T.accent : T.success} size={6} pulse={isRunning} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{isRunning ? "Executing workflow" : "Execution complete"}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: T.text3, fontFamily: mono }}>{statusEvents.length} events</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning && <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontFamily: mono }}>{fmtElapsed(elapsed)}</span>}
          {expanded ? Icon.chevUp(14, T.text3) : Icon.chevDown(14, T.text3)}
        </div>
      </button>

      {expanded && (
        <div ref={ref} style={{ maxHeight: 360, overflowY: "auto", padding: "12px 18px" }}>
          {isRunning && streamPreview && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: T.accentSoft, border: `1px solid ${T.accent}15`, borderRadius: T.r }}>
              <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <Dot color={T.accent} size={4} pulse />
                Live Output
              </div>
              <div style={{ fontSize: 12, color: T.text1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 100, overflowY: "auto", fontFamily: mono }}>
                {streamPreview}
              </div>
            </div>
          )}

          {statusEvents.map((ev, i) => (
            <div key={i} style={{ padding: "6px 0", display: "flex", gap: 12, animation: "fadeInFast 0.15s ease", borderBottom: i < statusEvents.length - 1 ? `1px solid ${T.border0}` : "none" }}>
              <span style={{ color: T.text3, minWidth: 68, flexShrink: 0, fontSize: 11, fontFamily: mono }}>{formatTime(ev.timestamp)}</span>
              <span style={{
                color: ev.type.includes("error") ? T.error : ev.type.includes("complete") ? T.success : ev.type.includes("start") ? T.accent : T.text1,
                lineHeight: 1.55, wordBreak: "break-word", fontSize: 12,
              }}>{ev.message}</span>
            </div>
          ))}

          {isRunning && statusEvents.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: T.text3, fontSize: 12 }}>Initializing agents...</div>
          )}
        </div>
      )}
    </div>
  );
}
