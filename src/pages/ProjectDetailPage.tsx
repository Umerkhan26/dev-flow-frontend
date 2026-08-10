import { useEffect, useState, type FormEvent } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import {
  formatIssueKey,
  statusLabel,
  type Issue,
  type Project,
  ISSUE_PRIORITIES,
} from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { workspaceId } = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<{ id: string; user: { id: string; name: string } }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NONE");
  const [assigneeId, setAssigneeId] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!projectId || !token || !workspaceId) return;
    setError(null);
    try {
      const [projectRes, issuesRes, membersRes] = await Promise.all([
        apiRequest<{ project: Project }>(`/api/projects/${projectId}`, { token }),
        apiRequest<{ issues: Issue[] }>(`/api/projects/${projectId}/issues`, { token }),
        apiRequest<{ members: { id: string; user: { id: string; name: string } }[] }>(
          `/api/workspaces/${workspaceId}/members`,
          { token },
        ),
      ]);
      setProject(projectRes.project);
      setIssues(issuesRes.issues);
      setMembers(membersRes.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    }
  }

  useEffect(() => {
    void load();
  }, [projectId, token, workspaceId]);

  async function onCreateIssue(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !token) return;
    setCreating(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectId}/issues`, {
        method: "POST",
        token,
        body: {
          title,
          description: description || undefined,
          priority,
          assigneeId: assigneeId || null,
        },
      });
      setTitle("");
      setDescription("");
      setPriority("NONE");
      setAssigneeId("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create issue");
    } finally {
      setCreating(false);
    }
  }

  if (!project && !error) return <p className="muted">Loading project…</p>;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Link to="/app/projects">Projects</Link> / {project?.key}
          </p>
          <h1>{project?.name ?? "Project"}</h1>
          {project?.description ? (
            <p className="muted" style={{ marginTop: "0.15rem" }}>
              {project.description}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          New issue
        </button>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Issues</h2>
          <span className="muted">{issues.length}</span>
        </div>
        {error && !open ? <p className="error">{error}</p> : null}
        {issues.length === 0 ? <p className="muted">No issues in this project yet.</p> : null}
        <ul className="data-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link to={`/app/issues/${issue.id}`} className="data-row">
                <span className="mono muted">
                  {formatIssueKey(project?.key ?? "PRJ", issue.number)}
                </span>
                <span className="grow">
                  <strong>{issue.title}</strong>
                </span>
                <span className={`status status-${issue.status.toLowerCase()}`}>
                  {statusLabel(issue.status)}
                </span>
                <span className="muted">{issue.assignee?.name ?? "Unassigned"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={open}
        title="Create issue"
        description={`Add work to ${project?.key ?? "this project"}.`}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={onCreateIssue}>
          <div className="stack">
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
                placeholder="Implement password reset"
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
                rows={3}
              />
            </label>
            <div className="form-row">
              <label className="grow">
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {ISSUE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grow">
                Assignee
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? <p className="error">{error}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create issue"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
