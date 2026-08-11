import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { AiPanel } from "../components/AiPanel";
import { Modal } from "../components/Modal";
import { StatusChangeModal } from "../components/StatusChangeModal";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import {
  BOARD_COLUMNS,
  CYCLE_STATUSES,
  formatIssueKey,
  statusLabel,
  type Cycle,
  type Issue,
} from "../types/engineering";

type Board = Record<string, Issue[]>;

export function CycleDetailPage() {
  const { cycleId } = useParams();
  const token = useAppSelector((s) => s.auth.accessToken);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [board, setBoard] = useState<Board>({});
  const [projectIssues, setProjectIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    issue: Issue;
    toStatus: string;
  } | null>(null);

  async function load() {
    if (!cycleId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cycleRes, boardRes] = await Promise.all([
        apiRequest<{ cycle: Cycle }>(`/api/cycles/${cycleId}`, { token }),
        apiRequest<{ board: Board }>(`/api/cycles/${cycleId}/board`, { token }),
      ]);
      setCycle(cycleRes.cycle);
      setBoard(boardRes.board ?? {});

      const issuesRes = await apiRequest<{ issues: Issue[] }>(
        `/api/projects/${cycleRes.cycle.projectId}/issues`,
        { token },
      );
      setProjectIssues(issuesRes.issues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cycle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [cycleId, token]);

  const unassigned = useMemo(
    () => projectIssues.filter((i) => i.cycleId !== cycleId && i.status !== "CANCELLED"),
    [projectIssues, cycleId],
  );

  async function confirmMove(note: string) {
    if (!token || !pendingMove) return;
    const { issue, toStatus } = pendingMove;
    const prev = board;
    setSaving(true);
    setBoard((current) => {
      const next: Board = {};
      for (const col of BOARD_COLUMNS) {
        next[col] = (current[col] ?? []).filter((i) => i.id !== issue.id);
      }
      next[toStatus] = [{ ...issue, status: toStatus }, ...(next[toStatus] ?? [])];
      return next;
    });

    try {
      await apiRequest(`/api/issues/${issue.id}`, {
        method: "PATCH",
        token,
        body: { status: toStatus },
      });
      if (note) {
        await apiRequest(`/api/issues/${issue.id}/comments`, {
          method: "POST",
          token,
          body: {
            body: `Status: ${statusLabel(issue.status)} → ${statusLabel(toStatus)}\n${note}`,
          },
        });
      }
      setPendingMove(null);
    } catch (err) {
      setBoard(prev);
      setError(err instanceof Error ? err.message : "Could not move issue");
    } finally {
      setSaving(false);
    }
  }

  async function onAddIssues(e: FormEvent) {
    e.preventDefault();
    if (!token || !cycleId || selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/cycles/${cycleId}/issues`, {
        method: "POST",
        token,
        body: { issueIds: selected },
      });
      setSelected([]);
      setAddOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add issues");
    } finally {
      setSaving(false);
    }
  }

  async function updateCycleStatus(nextStatus: string) {
    if (!token || !cycleId) return;
    try {
      const data = await apiRequest<{ cycle: Cycle }>(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      });
      setCycle(data.cycle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update cycle");
    }
  }

  if (loading) return <p className="muted">Loading cycle board…</p>;
  if (!cycle) return <p className="error">{error ?? "Cycle not found"}</p>;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Link to="/app/cycles">Cycles</Link> / {cycle.project?.key}
          </p>
          <h1>{cycle.name}</h1>
          <p className="muted" style={{ marginTop: "0.15rem" }}>
            {cycle.goal || "No goal set"} · {cycle.doneCount}/{cycle.issueCount} done
          </p>
        </div>
        <div className="topbar-actions">
          <select
            value={cycle.status}
            onChange={(e) => void updateCycleStatus(e.target.value)}
            style={{ width: "auto", marginTop: 0 }}
          >
            {CYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setAddOpen(true)}>
            Add issues
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel" style={{ marginBottom: "0.75rem" }}>
        <div className="progress-line">
          <i style={{ width: `${cycle.progress}%` }} />
        </div>
        <p className="muted small" style={{ marginTop: "0.35rem" }}>
          {cycle.progress}% complete
        </p>
      </section>

      <div style={{ marginBottom: "0.75rem" }}>
        <AiPanel
          title="AI cycle summary"
          summarizePath={`/api/ai/summarize/cycles/${cycle.id}`}
          askHint="Delivery health, blockers, and what to focus on next."
        />
      </div>

      <div className="board">
        {BOARD_COLUMNS.map((column) => (
          <div key={column} className="board-column">
            <div className="board-column-head">
              <strong>{statusLabel(column)}</strong>
              <span>{board[column]?.length ?? 0}</span>
            </div>
            <div className="board-column-body">
              {(board[column] ?? []).map((issue) => (
                <article key={issue.id} className="board-card">
                  <Link to={`/app/issues/${issue.id}`} className="board-card-title">
                    <span className="mono muted">
                      {formatIssueKey(issue.project?.key ?? cycle.project?.key ?? "PRJ", issue.number)}
                    </span>
                    <strong>{issue.title}</strong>
                  </Link>
                  <div className="board-card-meta">
                    <span className="muted small">{issue.assignee?.name ?? "Unassigned"}</span>
                    <select
                      value={issue.status}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === issue.status) return;
                        setPendingMove({ issue, toStatus: next });
                      }}
                      aria-label="Move issue"
                    >
                      {BOARD_COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={addOpen}
        title="Add issues to cycle"
        description="Pull existing project issues onto this board."
        onClose={() => setAddOpen(false)}
      >
        <form onSubmit={onAddIssues}>
          <div className="stack">
            {unassigned.length === 0 ? (
              <p className="muted">All project issues are already in this cycle (or none exist).</p>
            ) : (
              unassigned.map((issue) => {
                const checked = selected.includes(issue.id);
                return (
                  <label key={issue.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((prev) =>
                          checked ? prev.filter((id) => id !== issue.id) : [...prev, issue.id],
                        )
                      }
                      style={{ width: "auto", marginTop: 0 }}
                    />
                    <span>
                      <strong>
                        {formatIssueKey(issue.project?.key ?? "PRJ", issue.number)}
                      </strong>{" "}
                      {issue.title}
                    </span>
                  </label>
                );
              })
            )}
            {error ? <p className="error">{error}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving || selected.length === 0}>
              {saving ? "Adding…" : `Add ${selected.length || ""}`.trim()}
            </button>
          </div>
        </form>
      </Modal>

      <StatusChangeModal
        open={Boolean(pendingMove)}
        issueKey={formatIssueKey(
          pendingMove?.issue.project?.key ?? cycle?.project?.key ?? "PRJ",
          pendingMove?.issue.number ?? 0,
        )}
        issueTitle={pendingMove?.issue.title ?? ""}
        fromStatus={pendingMove?.issue.status ?? "TODO"}
        toStatus={pendingMove?.toStatus ?? "TODO"}
        saving={saving}
        onClose={() => setPendingMove(null)}
        onConfirm={confirmMove}
      />
    </div>
  );
}
