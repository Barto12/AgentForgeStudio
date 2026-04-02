import { T, mono, sans, escapeHtml } from "./theme.js";
import { Icon } from "./Icons.jsx";

// ─── Markdown Renderer ──────────────────────────────
export function RenderedMarkdown({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div style={{ color: T.text1, fontSize: 13.5, lineHeight: 1.8, fontFamily: sans }}>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const lang = match?.[1] || "";
          const code = match?.[2] || part.slice(3, -3);
          return (
            <div key={i} style={{ position: "relative", margin: "18px 0", borderRadius: T.r, overflow: "hidden", border: `1px solid ${T.border1}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: T.bg3 }}>
                <span style={{ fontSize: 11, color: T.text2, fontFamily: mono, fontWeight: 500 }}>{lang || "code"}</span>
                <button onClick={() => navigator.clipboard?.writeText(code.trim())} style={{ padding: "3px 10px", borderRadius: T.rSm, border: "none", background: T.bg4, color: T.text2, cursor: "pointer", fontSize: 11, fontFamily: mono, display: "flex", alignItems: "center", gap: 4 }}>{Icon.copy(11)} Copy</button>
              </div>
              <pre style={{ background: T.bg0, padding: "14px 16px", overflowX: "auto", fontSize: 12.5, lineHeight: 1.7, fontFamily: mono, color: T.text0, margin: 0 }}>
                <code>{code.trim()}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={i}>
            {part.split("\n").map((line, j) => {
              if (line.startsWith("### ")) return <h4 key={j} style={{ fontSize: 14, fontWeight: 600, color: T.text0, margin: "22px 0 6px" }}>{renderInline(line.slice(4))}</h4>;
              if (line.startsWith("## ")) return <h3 key={j} style={{ fontSize: 15.5, fontWeight: 600, color: T.text0, margin: "26px 0 8px" }}>{renderInline(line.slice(3))}</h3>;
              if (line.startsWith("# ")) return <h2 key={j} style={{ fontSize: 17, fontWeight: 700, color: T.text0, margin: "30px 0 10px" }}>{renderInline(line.slice(2))}</h2>;
              if (/^---+$/.test(line.trim())) return <hr key={j} style={{ border: "none", borderTop: `1px solid ${T.border1}`, margin: "24px 0" }} />;
              if (/^\s*[-*]\s/.test(line)) {
                const indent = (line.match(/^\s*/)?.[0].length || 0) / 2;
                const content = line.replace(/^\s*[-*]\s/, "");
                return <div key={j} style={{ paddingLeft: 16 + indent * 16, display: "flex", gap: 8, margin: "4px 0" }}><span style={{ color: T.accent, flexShrink: 0, fontSize: 8, marginTop: 7 }}>●</span><span>{renderInline(content)}</span></div>;
              }
              if (/^\s*\d+[.)]\s/.test(line)) {
                const num = line.match(/^\s*(\d+)[.)]\s/)?.[1];
                const content = line.replace(/^\s*\d+[.)]\s/, "");
                return <div key={j} style={{ paddingLeft: 16, display: "flex", gap: 10, margin: "4px 0" }}><span style={{ color: T.text2, fontWeight: 600, fontFamily: mono, flexShrink: 0, minWidth: 20, fontSize: 12 }}>{num}.</span><span>{renderInline(content)}</span></div>;
              }
              if (line.trim() === "") return <div key={j} style={{ height: 12 }} />;
              return <p key={j} style={{ margin: "4px 0" }}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function renderInline(text) {
  if (!text) return text;
  const safeText = typeof text === "string" ? escapeHtml(text) : String(text);
  const parts = [];
  let remaining = safeText;
  let key = 0;
  while (remaining.length > 0) {
    let match = remaining.match(/^(.*?)`([^`]+)`([\s\S]*)$/);
    if (match) {
      if (match[1]) parts.push(<span key={key++} dangerouslySetInnerHTML={undefined}>{unescapeForReact(match[1])}</span>);
      parts.push(<code key={key++} style={{ background: T.bg3, border: `1px solid ${T.border1}`, borderRadius: 5, padding: "2px 6px", fontSize: 12, fontFamily: mono, color: T.accent }}>{unescapeForReact(match[2])}</code>);
      remaining = match[3];
      continue;
    }
    match = remaining.match(/^(.*?)\*\*(.+?)\*\*([\s\S]*)$/);
    if (match) {
      if (match[1]) parts.push(<span key={key++}>{unescapeForReact(match[1])}</span>);
      parts.push(<strong key={key++} style={{ color: T.text0, fontWeight: 600 }}>{unescapeForReact(match[2])}</strong>);
      remaining = match[3];
      continue;
    }
    parts.push(<span key={key++}>{unescapeForReact(remaining)}</span>);
    break;
  }
  return parts;
}

// Convert escaped HTML entities back to text for React rendering (React auto-escapes)
function unescapeForReact(str) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
