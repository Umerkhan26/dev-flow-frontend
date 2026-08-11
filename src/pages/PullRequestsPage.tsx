import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type PullRequest = {
  id: string;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  authorLogin: string;
  htmlUrl: string;
  githubUpdatedAt: string | null;
  repository: { id: string; fullName: string; htmlUrl: string };
  issue: { id: string; number: number; title: string; projectId: string } | null;
};

export function PullRequestsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token || !workspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await apiRequest<{ pullRequests: PullRequest[] }>(
          `/api/workspaces/${workspaceId}/pull-requests`,
          { token },
        );
        setPrs(data.pullRequests ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pull requests");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [workspaceId, token]);

  const chips = useMemo(() => {
    const open = prs.filter((p) => p.state === "OPEN").length;
    const merged = prs.filter((p) => p.state === "MERGED").length;
    const linked = prs.filter((p) => p.issue).length;
    return [
      { label: "Total", value: prs.length },
      { label: "Open", value: open, tone: "accent" as const },
      { label: "Merged", value: merged, tone: "ok" as const },
      { label: "Linked to issues", value: linked },
    ];
  }, [prs]);

  return (
    <div>
      <PageHeader
        eyebrow="Ship"
        title="Pull requests"
        description="Synced from linked GitHub repos. Open a PR to review details and connect it to a DevFlow issue."
        actions={
          <Link className="button-link ghost-link" to="/app/repositories">
            Repositories
          </Link>
        }
        chips={chips}
      />

      <div className="hint-strip">
        <strong>Next:</strong> Open a PR → link an issue → use AI Summarize to explain the change.
      </div>

      <section className="panel table-panel">
        <div className="table-head table-head-pr">
          <span>PR</span>
          <span>Title</span>
          <span className="table-col-repo">Repo</span>
          <span>State</span>
        </div>
        {loading ? <p className="muted pad">Loading…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && prs.length === 0 ? (
          <div className="empty-inline">
            <p className="muted">No pull requests found.</p>
            <p className="muted small">
              Sync worked — these GitHub repos currently have no PRs. Open a PR on GitHub, then
              click Sync now.
            </p>
            <Link to="/app/repositories">Back to repositories</Link>
          </div>
        ) : null}
        <ul className="data-list">
          {prs.map((pr) => (
            <li key={pr.id}>
              <Link to={`/app/pull-requests/${pr.id}`} className="data-row">
                <span className="mono muted">#{pr.number}</span>
                <span className="grow">
                  <strong>{pr.title}</strong>
                  <span className="muted block">
                    {pr.authorLogin}
                    {pr.issue ? ` · linked issue #${pr.issue.number}` : ""}
                  </span>
                </span>
                <span className="muted small table-col-repo">{pr.repository.fullName}</span>
                <span className={`status status-${pr.state.toLowerCase()}`}>{pr.state}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
