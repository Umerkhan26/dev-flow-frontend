import { useState } from "react";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type AiPanelProps = {
  title?: string;
  summarizePath: string;
  askHint?: string;
};

function renderMarkdownLite(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
    if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
    if (!line.trim()) return <br key={i} />;
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export function AiPanel({ title = "AI assistant", summarizePath, askHint }: AiPanelProps) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const [summary, setSummary] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<{ summary: string; provider: string }>(summarizePath, {
        method: "POST",
        token,
      });
      setSummary(data.summary);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <button type="button" className="ghost btn-sm" disabled={busy} onClick={() => void summarize()}>
          {busy ? "Thinking…" : "Summarize"}
        </button>
      </div>
      {askHint ? <p className="muted small">{askHint}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {provider ? (
        <p className="muted small ai-provider">
          Source: {provider === "LLM" ? "Language model" : "Built-in heuristic"}
        </p>
      ) : null}
      {summary ? <div className="ai-output">{renderMarkdownLite(summary)}</div> : (
        <p className="muted small">Click Summarize for a workspace-aware brief.</p>
      )}
    </section>
  );
}
