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

type RepoOption = { id: string; fullName: string };

export function PullRequestsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("OPEN");
  const [repoFilter, setRepoFilter] = useState("");
  const [linkedFilter, setLinkedFilter] = useState("all");

  useEffect(() => {
    async function loadRepos() {
      if (!token || !workspaceId) return;
      try {
        const data = await apiRequest<{ repositories: RepoOption[] }>(
          `/api/workspaces/${workspaceId}/repositories`,
          { token },
        );
        setRepos((data.repositories ?? []).map((r) => ({ id: r.id, fullName: r.fullName })));
      } catch {
        setRepos([]);
      }
    }
    void loadRepos();
  }, [token, workspaceId]);

  useEffect(() => {
    async function load() {
      if (!token || !workspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (stateFilter) params.set("state", stateFilter);
        if (repoFilter) params.set("repositoryId", repoFilter);
        if (linkedFilter === "linked") params.set("linked", "1");
        if (linkedFilter === "unlinked") params.set("linked", "0");
        const data = await apiRequest<{ pullRequests: PullRequest[] }>(
          `/api/workspaces/${workspaceId}/pull-requests?${params}`,
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
  }, [workspaceId, token, stateFilter, repoFilter, linkedFilter]);

  const chips = useMemo(() => {
    const open = prs.filter((p) => p.state === "OPEN").length;
    const merged = prs.filter((p) => p.state === "MERGED").length;
    const linked = prs.filter((p) => p.issue).length;
    return [
      { label: "Showing", value: prs.length },
      { label: "Open (page)", value: open, tone: "accent" as const },
      { label: "Merged (page)", value: merged, tone: "ok" as const },
      { label: "Linked (page)", value: linked },
    ];
  }, [prs]);

  return (
    <div>
      <PageHeader
        eyebrow="Ship"
        title="Pull requests"
        description="Synced from linked GitHub repos. Filter by state, repo, or issue link."
        actions={
          <Link className="button-link ghost-link" to="/app/repositories">
            Repositories
          </Link>
        }
        chips={chips}
      />

      <div className="filters-bar analytics-filters">
        <label>
          State
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="OPEN">Open</option>
            <option value="MERGED">Merged</option>
            <option value="CLOSED">Closed</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <label>
          Repository
          <select value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)}>
            <option value="">All repos</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Issue link
          <select value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value)}>
            <option value="all">Any</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
        </label>
      </div>

      <section className="panel table-panel" style={{ marginTop: "0.75rem" }}>
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
            <p className="muted">No pull requests match these filters.</p>
            <p className="muted small">Try All states, or sync a repo from Repositories.</p>
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
                    {pr.draft ? " · draft" : ""}
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
