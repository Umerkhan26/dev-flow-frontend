import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import { formatIssueKey, statusLabel, type Issue } from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function IssuesPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setLoading(false);
        setError("Not signed in");
        return;
      }
      if (!workspaceId) {
        setIssues([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<{ issues: Issue[] }>(
          `/api/workspaces/${workspaceId}/issues`,
          { token },
        );
        if (!cancelled) setIssues(data.issues ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load issues");
          setIssues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, token]);

  const chips = useMemo(() => {
    const open = issues.filter((i) => !["DONE", "CANCELLED"].includes(i.status)).length;
    const review = issues.filter((i) => i.status === "IN_REVIEW").length;
    const high = issues.filter((i) => i.priority === "HIGH" || i.priority === "URGENT").length;
    return [
      { label: "Total", value: issues.length },
      { label: "Open", value: open, tone: "accent" as const },
      { label: "In review", value: review, tone: "warn" as const },
      { label: "High priority", value: high },
    ];
  }, [issues]);

  return (
    <div>
      <PageHeader
        eyebrow="Plan"
        title="Issues"
        description="Every engineering task across projects — status, priority, and links back to PRs when work ships."
        actions={
          <Link className="button-link" to="/app/projects">
            Open project
          </Link>
        }
        chips={chips}
      />

      <div className="hint-strip">
        <strong>Flow:</strong> Pick a project → create issue → move status → link a PR when code is ready.
      </div>

      <section className="panel table-panel">
        <div className="table-head">
          <span>ID</span>
          <span>Title</span>
          <span>Status</span>
        </div>

        {loading ? <p className="muted pad">Loading issues…</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && !workspaceId ? (
          <div className="empty-inline">
            <p className="muted">No workspace selected.</p>
            <Link to="/onboarding">Create a workspace</Link>
          </div>
        ) : null}

        {!loading && workspaceId && issues.length === 0 && !error ? (
          <div className="empty-inline">
            <p className="muted">No issues yet.</p>
            <Link to="/app/projects">Create one from a project</Link>
          </div>
        ) : null}

        <ul className="data-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link to={`/app/issues/${issue.id}`} className="data-row">
                <span className="mono muted">
                  {formatIssueKey(issue.project?.key ?? "PRJ", issue.number)}
                </span>
                <span className="grow">
                  <strong>{issue.title}</strong>
                  <span className="muted block">{issue.project?.name}</span>
                </span>
                <span className={`status status-${issue.status.toLowerCase()}`}>
                  {statusLabel(issue.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
