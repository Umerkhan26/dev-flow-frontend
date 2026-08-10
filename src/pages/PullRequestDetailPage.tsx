import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AiPanel } from "../components/AiPanel";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type PullRequest = {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  authorLogin: string;
  htmlUrl: string;
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
  mergedAt: string | null;
  repository: {
    id: string;
    fullName: string;
    htmlUrl: string;
    workspaceId: string;
  };
  issue: { id: string; number: number; title: string; projectId: string } | null;
};

type IssueOption = {
  id: string;
  number: number;
  title: string;
  project?: { key: string };
};

export function PullRequestDetailPage() {
  const { pullRequestId } = useParams();
  const token = useAppSelector((s) => s.auth.accessToken);
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [issues, setIssues] = useState<IssueOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!token || !pullRequestId) return;
    setError(null);
    try {
      const data = await apiRequest<{ pullRequest: PullRequest }>(
        `/api/pull-requests/${pullRequestId}`,
        { token },
      );
      setPr(data.pullRequest);
      const issueData = await apiRequest<{ issues: IssueOption[] }>(
        `/api/workspaces/${data.pullRequest.repository.workspaceId}/issues`,
        { token },
      );
      setIssues(issueData.issues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pull request");
    }
  }

  useEffect(() => {
    void load();
  }, [pullRequestId, token]);

  async function linkIssue(issueId: string) {
    if (!token || !pullRequestId) return;
    setSaving(true);
    try {
      const data = await apiRequest<{ pullRequest: PullRequest }>(
        `/api/pull-requests/${pullRequestId}`,
        {
          method: "PATCH",
          token,
          body: { issueId: issueId || null },
        },
      );
      setPr(data.pullRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link issue");
    } finally {
      setSaving(false);
    }
  }

  if (!pr && !error) return <p className="muted">Loading pull request…</p>;
  if (!pr) return <p className="error">{error}</p>;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Link to="/app/pull-requests">Pull requests</Link> / {pr.repository.fullName}
          </p>
          <h1>
            #{pr.number} {pr.title}
          </h1>
          <p className="muted" style={{ marginTop: "0.15rem" }}>
            {pr.authorLogin} · <span className={`status status-${pr.state.toLowerCase()}`}>{pr.state}</span>
            {pr.draft ? " · draft" : ""}
          </p>
        </div>
        <a className="button-link ghost-link" href={pr.htmlUrl} target="_blank" rel="noreferrer">
          Open on GitHub
        </a>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid-two">
        <section className="panel">
          <h2>Description</h2>
          <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem" }}>
            {pr.body || "No description."}
          </p>
        </section>
        <div className="stack">
          <AiPanel
            title="AI summary"
            summarizePath={`/api/ai/summarize/pull-requests/${pr.id}`}
            askHint="What does this PR change? Review focus + linked issue."
          />
          <section className="panel">
            <h2>Details</h2>
            <div className="stack">
              <p className="muted small">
                Repo: <a href={pr.repository.htmlUrl}>{pr.repository.fullName}</a>
              </p>
              <p className="muted small">
                Updated:{" "}
                {pr.githubUpdatedAt ? new Date(pr.githubUpdatedAt).toLocaleString() : "—"}
              </p>
              <label>
                Linked issue
                <select
                  value={pr.issue?.id ?? ""}
                  disabled={saving}
                  onChange={(e) => void linkIssue(e.target.value)}
                >
                  <option value="">None</option>
                  {issues.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      {issue.project?.key ? `${issue.project.key}-` : "#"}
                      {issue.number} {issue.title}
                    </option>
                  ))}
                </select>
              </label>
              {pr.issue ? (
                <Link to={`/app/issues/${pr.issue.id}`}>Open issue #{pr.issue.number}</Link>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
