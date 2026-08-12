import { useState } from "react";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type AiPanelProps = {
  title?: string;
  summarizePath: string;
  reviewPath?: string;
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

export function AiPanel({ title = "AI assistant", summarizePath, reviewPath, askHint }: AiPanelProps) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const [summary, setSummary] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [busy, setBusy] = useState<"summary" | "review" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "summary" | "review") {
    if (!token) return;
    const path = kind === "review" ? reviewPath : summarizePath;
    if (!path) return;
    setBusy(kind);
    setError(null);
    try {
      const data = await apiRequest<{ summary?: string; review?: string; provider: string }>(path, {
        method: "POST",
        token,
      });
      setSummary(data.review ?? data.summary ?? "");
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <div className="row-actions">
          <button
            type="button"
            className="ghost btn-sm"
            disabled={busy !== null}
            onClick={() => void run("summary")}
          >
            {busy === "summary" ? "Thinking…" : "Summarize"}
          </button>
          {reviewPath ? (
            <button
              type="button"
              className="ghost btn-sm"
              disabled={busy !== null}
              onClick={() => void run("review")}
            >
              {busy === "review" ? "Reviewing…" : "Review tips"}
            </button>
          ) : null}
        </div>
      </div>
      {askHint ? <p className="muted small">{askHint}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {provider ? (
        <p className="muted small ai-provider">
          Source: {provider === "LLM" ? "Language model" : "Built-in heuristic"}
        </p>
      ) : null}
      {summary ? (
        <div className="ai-output">{renderMarkdownLite(summary)}</div>
      ) : (
        <p className="muted small">
          {reviewPath
            ? "Summarize the PR or generate review suggestions."
            : "Click Summarize for a workspace-aware brief."}
        </p>
      )}
    </section>
  );
}
