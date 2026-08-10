import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { AiPanel } from "../components/AiPanel";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import {
  formatIssueKey,
  statusLabel,
  type Issue,
  type IssueComment,
  type Label,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
} from "../types/engineering";

export function IssueDetailPage() {
  const { issueId } = useParams();
  const token = useAppSelector((s) => s.auth.accessToken);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");

  async function load() {
    if (!issueId || !token) return;
    setError(null);
    try {
      const issueRes = await apiRequest<{ issue: Issue }>(`/api/issues/${issueId}`, { token });
      setIssue(issueRes.issue);
      const workspaceId = issueRes.issue.project?.workspaceId;
      const [commentsRes, labelsRes] = await Promise.all([
        apiRequest<{ comments: IssueComment[] }>(`/api/issues/${issueId}/comments`, { token }),
        workspaceId
          ? apiRequest<{ labels: Label[] }>(`/api/workspaces/${workspaceId}/labels`, { token })
          : Promise.resolve({ labels: [] }),
      ]);
      setComments(commentsRes.comments);
      setLabels(labelsRes.labels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issue");
    }
  }

  useEffect(() => {
    void load();
  }, [issueId, token]);

  async function patchIssue(body: Record<string, unknown>) {
    if (!issueId || !token) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiRequest<{ issue: Issue }>(`/api/issues/${issueId}`, {
        method: "PATCH",
        token,
        body,
      });
      setIssue(data.issue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onComment(e: FormEvent) {
    e.preventDefault();
    if (!issueId || !token) return;
    try {
      const data = await apiRequest<{ comment: IssueComment }>(`/api/issues/${issueId}/comments`, {
        method: "POST",
        token,
        body: { body: commentBody },
      });
      setComments((prev) => [...prev, data.comment]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add comment");
    }
  }

  async function onCreateLabel(e: FormEvent) {
    e.preventDefault();
    const workspaceId = issue?.project?.workspaceId;
    if (!workspaceId || !token || !newLabelName.trim()) return;
    try {
      const data = await apiRequest<{ label: Label }>(`/api/workspaces/${workspaceId}/labels`, {
        method: "POST",
        token,
        body: { name: newLabelName.trim(), color: "#2dd4bf" },
      });
      setLabels((prev) => [...prev, data.label]);
      setNewLabelName("");
      const nextIds = [...(issue?.labels.map((l) => l.id) ?? []), data.label.id];
      await patchIssue({ labelIds: nextIds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create label");
    }
  }

  function toggleLabel(labelId: string) {
    if (!issue) return;
    const selected = new Set(issue.labels.map((l) => l.id));
    if (selected.has(labelId)) selected.delete(labelId);
    else selected.add(labelId);
    void patchIssue({ labelIds: [...selected] });
  }

  if (!issue && !error) return <p className="muted">Loading issue…</p>;
  if (!issue) return <p className="error">{error}</p>;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Link to={`/app/projects/${issue.projectId}`}>
              {issue.project?.name ?? "Project"}
            </Link>{" "}
            / {formatIssueKey(issue.project?.key ?? "PRJ", issue.number)}
          </p>
          <h1>{issue.title}</h1>
          <p className="muted">
            Reported by {issue.reporter.name}
            {issue.assignee ? ` · Assigned to ${issue.assignee.name}` : " · Unassigned"}
          </p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="grid-two">
        <section className="panel">
          <h2>Description</h2>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {issue.description || "No description yet."}
          </p>

          <h2 style={{ marginTop: "1.5rem" }}>Comments</h2>
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment">
                <div className="comment-meta">
                  <strong>{c.author.name}</strong>
                  <span className="muted small">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <form className="stack" onSubmit={onComment}>
            <label>
              Add comment
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                required
                rows={3}
              />
            </label>
            <button type="submit">Comment</button>
          </form>
        </section>

        <div className="stack">
          <AiPanel
            title="AI summary"
            summarizePath={`/api/ai/summarize/issues/${issue.id}`}
            askHint="Summarize status, discussion, and linked PRs."
          />
          <section className="panel">
            <h2>Details</h2>
            <div className="stack">
              <label>
                Status
                <select
                  value={issue.status}
                  disabled={saving}
                  onChange={(e) => void patchIssue({ status: e.target.value })}
                >
                  {ISSUE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={issue.priority}
                  disabled={saving}
                  onChange={(e) => void patchIssue({ priority: e.target.value })}
                >
                  {ISSUE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="muted small">Labels</p>
                <div className="label-row">
                  {labels.map((label) => {
                    const active = issue.labels.some((l) => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className={`label-chip${active ? " active" : ""}`}
                        style={{ ["--label-color" as string]: label.color }}
                        onClick={() => toggleLabel(label.id)}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
                <form className="form-row tight" onSubmit={onCreateLabel}>
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="New label"
                  />
                  <button type="submit" className="ghost">
                    Add
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
