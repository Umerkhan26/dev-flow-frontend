import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type WorkflowRun = {
  id: string;
  name: string;
  displayTitle: string | null;
  status: string;
  conclusion: string | null;
  event: string | null;
  branch: string | null;
  htmlUrl: string;
  runNumber: number;
  githubUpdatedAt: string | null;
  repository: { id: string; fullName: string; htmlUrl: string };
};

export function ActionsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token || !workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ workflowRuns: WorkflowRun[] }>(
        `/api/workspaces/${workspaceId}/workflow-runs`,
        { token },
      );
      setRuns(data.workflowRuns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow runs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token, workspaceId]);

  if (!workspaceId) {
    return (
      <div className="empty">
        <h1>Select a workspace</h1>
        <p className="muted">GitHub Actions need an active workspace.</p>
      </div>
    );
  }

  const failed = runs.filter(
    (r) => r.conclusion === "failure" || r.conclusion === "timed_out",
  ).length;
  const running = runs.filter((r) => r.status !== "completed").length;

  return (
    <div>
      <PageHeader
        eyebrow="Ship"
        title="GitHub Actions"
        description="Recent workflow runs from linked repositories. Sync a repo to refresh."
        chips={[
          { label: "Runs", value: runs.length },
          { label: "In progress", value: running, tone: running ? "accent" : "default" },
          { label: "Failed", value: failed, tone: failed ? "warn" : "ok" },
        ]}
        actions={
          <div className="row-actions">
            <button type="button" className="ghost btn-sm" onClick={() => void load()}>
              Refresh
            </button>
            <Link className="button-link ghost-link" to="/app/repositories">
              Repositories
            </Link>
          </div>
        }
      />

      {loading ? <p className="muted">Loading workflow runs…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && runs.length === 0 ? (
        <div className="empty panel">
          <h2>No workflow runs yet</h2>
          <p className="muted">
            Link a GitHub repository and click Sync — Actions runs are imported with pull requests.
          </p>
          <Link className="button-link" to="/app/repositories">
            Open repositories
          </Link>
        </div>
      ) : null}

      {runs.length > 0 ? (
        <section className="panel table-panel">
          <ul className="data-list">
            {runs.map((run) => (
              <li key={run.id} className="data-row" style={{ cursor: "default" }}>
                <span className="grow">
                  <strong>
                    {run.displayTitle || run.name}{" "}
                    <span className="muted">#{run.runNumber}</span>
                  </strong>
                  <span className="muted block">
                    {run.repository.fullName}
                    {run.branch ? ` · ${run.branch}` : ""}
                    {run.event ? ` · ${run.event}` : ""}
                    {run.githubUpdatedAt
                      ? ` · ${new Date(run.githubUpdatedAt).toLocaleString()}`
                      : ""}
                  </span>
                </span>
                <span className={`status status-${(run.conclusion || run.status).toLowerCase().replace(/_/g, "-")}`}>
                  {run.conclusion || run.status}
                </span>
                <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="muted small">
                  GitHub
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
