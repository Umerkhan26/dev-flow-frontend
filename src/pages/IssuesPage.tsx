import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import { formatIssueKey, statusLabel, type Issue } from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function IssuesPage() {
  const { workspaceId } = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      setLoading(true);
      try {
        const data = await apiRequest<{ issues: Issue[] }>(
          `/api/workspaces/${workspaceId}/issues`,
          { token },
        );
        setIssues(data.issues);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [workspaceId, token]);

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Delivery</p>
          <h1>Issues</h1>
        </div>
        <Link className="button-link" to="/app/projects">
          Open project
        </Link>
      </header>

      <section className="panel">
        {loading ? <p className="muted">Loading…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && issues.length === 0 ? (
          <p className="muted">
            No issues yet. Create a project, then add your first issue.
          </p>
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
