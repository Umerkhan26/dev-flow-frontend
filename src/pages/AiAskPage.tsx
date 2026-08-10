import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type AiStatus = {
  llmConfigured: boolean;
  model: string | null;
  mode: string;
  message: string;
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

const SUGGESTIONS = [
  "What open PRs should we review?",
  "How is cycle delivery looking?",
  "Any high-priority blockers?",
  "Summarize open issues in this workspace",
];

export function AiAskPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;

  const [status, setStatus] = useState<AiStatus | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void apiRequest<AiStatus>("/api/ai/status", { token })
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [token]);

  async function ask(q: string) {
    if (!token || !workspaceId || !q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<{ answer: string; provider: string }>(
        `/api/workspaces/${workspaceId}/ai/ask`,
        { method: "POST", token, body: { question: q.trim() } },
      );
      setAnswer(data.answer);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1>AI assistant</h1>
          <p className="muted" style={{ marginTop: "0.15rem" }}>
            Ask about issues, PRs, and cycle delivery using only this workspace’s data.
          </p>
        </div>
      </header>

      {status ? <p className="muted small">{status.message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <form className="stack" onSubmit={onSubmit}>
          <label>
            Question
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. “Yeh PR kya change karti hai?” or “Any blockers this cycle?”'
            />
          </label>
          <div className="form-row">
            <button type="submit" disabled={busy || !workspaceId}>
              {busy ? "Thinking…" : "Ask"}
            </button>
          </div>
        </form>
        <div className="ai-suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="ghost btn-sm"
              disabled={busy}
              onClick={() => {
                setQuestion(s);
                void ask(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {answer ? (
        <section className="panel ai-panel" style={{ marginTop: "0.75rem" }}>
          <div className="panel-head">
            <h2>Answer</h2>
            {provider ? (
              <span className="muted small">
                {provider === "LLM" ? "Language model" : "Built-in heuristic"}
              </span>
            ) : null}
          </div>
          <div className="ai-output">{renderMarkdownLite(answer)}</div>
        </section>
      ) : null}
    </div>
  );
}
