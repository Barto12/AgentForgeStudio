import { Component } from "react";

// ─── Error Boundary ──────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ color: "#F87171", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 20 }}>{this.state.error?.message || "Unexpected error"}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#818CF8", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
