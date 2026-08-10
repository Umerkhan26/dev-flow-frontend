import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { fetchWorkspaces } from "../app/store/authSlice";
import { Modal } from "../components/Modal";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import { formatIssueKey, statusLabel, type Issue, type Project } from "../types/engineering";

type OutletCtx = { workspaceId?: string; workspace?: { name: string; role: string; slug: string } };

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, workspaces } = useAppSelector((s) => s.auth);
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const { workspaceId, workspace } = ctx;
  const token = useAppSelector((s) => s.auth.accessToken);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      try {
        const [p, i] = await Promise.all([
          apiRequest<{ projects: Project[] }>(`/api/workspaces/${workspaceId}/projects`, { token }),
          apiRequest<{ issues: Issue[] }>(`/api/workspaces/${workspaceId}/issues`, { token }),
        ]);
        setProjects(p.projects);
        setIssues(i.issues);
      } catch {
        // empty dashboard is fine
      }
    }
    void load();
  }, [workspaceId, token]);

  const stats = useMemo(() => {
    const open = issues.filter((i) => !["DONE", "CANCELLED"].includes(i.status)).length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
    const done = issues.filter((i) => i.status === "DONE").length;
    return { open, inProgress, done, total: issues.length };
  }, [issues]);

  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !token) return;
    setCreating(true);
    setError(null);
    try {
      const data = await apiRequest<{ project: Project }>(
        `/api/workspaces/${workspaceId}/projects`,
        { method: "POST", token, body: { name, key } },
      );
      setProjectOpen(false);
      setName("");
      setKey("");
      navigate(`/app/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setCreating(false);
    }
  }

  if (user && workspaces.length === 0) {
    return (
      <div className="empty">
        <h1>No workspace yet</h1>
        <p className="muted">Create a workspace to start planning and connecting repos.</p>
        <Link className="button-link" to="/onboarding">
          Create workspace
        </Link>
      </div>
    );
  }

  const recent = issues.slice(0, 7);

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>{workspace?.name ?? "Dashboard"}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <Link className="button-link ghost-link" to="/app/issues">
            All issues
          </Link>
          <button type="button" onClick={() => setProjectOpen(true)}>
            New project
          </button>
        </div>
      </header>

      <section className="dash-hero">
        <article className="dash-hero-main">
          <h2>Hi {user?.name?.split(" ")[0]}, keep delivery moving</h2>
          <p className="muted">
            Track projects and issues in one workspace. GitHub sync and AI summaries come next.
          </p>
          <div className="dash-actions">
            <button type="button" onClick={() => setProjectOpen(true)}>
              Create project
            </button>
            <Link className="button-link ghost-link" to="/app/projects">
              Browse projects
            </Link>
          </div>
        </article>
        <div className="dash-side">
          <article className="mini-card">
            <div className="k">Role</div>
            <div className="v" style={{ fontSize: "0.95rem" }}>
              {workspace?.role ?? "—"}
            </div>
            <div className="h">Workspace permission</div>
          </article>
          <article className="mini-card">
            <div className="k">Focus</div>
            <div className="v">{stats.inProgress}</div>
            <div className="h">Issues in progress</div>
          </article>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-hint">In workspace</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value">{stats.open}</div>
          <div className="stat-hint">Active issues</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">In progress</div>
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-hint">Currently moving</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Done</div>
          <div className="stat-value">{stats.done}</div>
          <div className="stat-hint">Completed</div>
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-head">
            <h3>Projects</h3>
            <Link to="/app/projects">View all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="muted">No projects yet.</p>
          ) : (
            <ul className="data-list">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link to={`/app/projects/${p.id}`} className="data-row">
                    <span className="mono pill">{p.key}</span>
                    <span className="grow">
                      <strong>{p.name}</strong>
                    </span>
                    <span className="muted">{p.issueCount ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="panel">
          <div className="panel-head">
            <h3>Recent issues</h3>
            <Link to="/app/issues">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted">No issues yet.</p>
          ) : (
            <ul className="data-list">
              {recent.map((issue) => (
                <li key={issue.id}>
                  <Link to={`/app/issues/${issue.id}`} className="data-row">
                    <span className="mono muted">
                      {formatIssueKey(issue.project?.key ?? "PRJ", issue.number)}
                    </span>
                    <span className="grow">
                      <strong>{issue.title}</strong>
                    </span>
                    <span className={`status status-${issue.status.toLowerCase()}`}>
                      {statusLabel(issue.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <Modal
        open={projectOpen}
        title="Create project"
        description="Start a product area inside this workspace."
        onClose={() => setProjectOpen(false)}
      >
        <form onSubmit={onCreateProject}>
          <div className="stack">
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Customer Portal"
                autoFocus
              />
            </label>
            <label>
              Key
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                required
                minLength={2}
                maxLength={8}
                placeholder="ACP"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setProjectOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
