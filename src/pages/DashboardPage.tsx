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
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const { workspace } = ctx;
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canInvite = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !token) return;
    setInviting(true);
    setError(null);
    setInviteMsg(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        token,
        body: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteMsg(`Invited ${inviteEmail}. Ask them to refresh or log in again.`);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

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
        setProjects(p.projects ?? []);
        setIssues(i.issues ?? []);
      } catch {
        // empty dashboard is fine
      }
    }
    void load();
  }, [workspaceId, token]);

  const stats = useMemo(() => {
    const backlog = issues.filter((i) => i.status === "BACKLOG" || i.status === "TODO").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
    const review = issues.filter((i) => i.status === "IN_REVIEW").length;
    const done = issues.filter((i) => i.status === "DONE").length;
    const open = issues.filter((i) => !["DONE", "CANCELLED"].includes(i.status)).length;
    const high = issues.filter((i) => i.priority === "HIGH" || i.priority === "URGENT").length;
    const total = Math.max(issues.length, 1);
    return {
      backlog,
      inProgress,
      review,
      done,
      open,
      high,
      totalIssues: issues.length,
      pct: {
        backlog: (backlog / total) * 100,
        inProgress: (inProgress / total) * 100,
        review: (review / total) * 100,
        done: (done / total) * 100,
      },
    };
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

  const recent = issues.slice(0, 6);

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Command center</p>
          <h1>{workspace?.name ?? "Dashboard"}</h1>
        </div>
        <div className="topbar-actions">
          {canInvite ? (
            <button type="button" className="ghost" onClick={() => setInviteOpen(true)}>
              Invite member
            </button>
          ) : null}
          <Link className="button-link ghost-link" to="/app/issues">
            All issues
          </Link>
          <button type="button" onClick={() => setProjectOpen(true)}>
            New project
          </button>
        </div>
      </header>

      <section className="dash-grid">
        <article className="hero-card">
          <h2>Hi {user?.name?.split(" ")[0]}, ship with clarity</h2>
          <p>
            One workspace for projects, issues, and delivery signals. GitHub sync and AI summaries
            plug in next.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={() => setProjectOpen(true)}>
              Create project
            </button>
            <Link className="button-link ghost-link" to="/app/projects" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", color: "#fff" }}>
              Browse projects
            </Link>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <div className="k">Projects</div>
              <div className="v">{projects.length}</div>
            </div>
            <div className="hero-metric">
              <div className="k">Open work</div>
              <div className="v">{stats.open}</div>
            </div>
            <div className="hero-metric">
              <div className="k">High priority</div>
              <div className="v">{stats.high}</div>
            </div>
          </div>
        </article>

        <div className="side-stack">
          <article className="insight-card">
            <div className="k">Your role</div>
            <div className="v">{workspace?.role ?? "—"}</div>
            <div className="h">Controls what you can change in this tenant</div>
          </article>
          <article className="insight-card">
            <div className="k">Delivery pipeline</div>
            <div className="pipeline">
              <div className="pipeline-row">
                <span>Todo</span>
                <div className="bar"><i style={{ width: `${stats.pct.backlog}%` }} /></div>
                <span>{stats.backlog}</span>
              </div>
              <div className="pipeline-row">
                <span>Active</span>
                <div className="bar sky"><i style={{ width: `${stats.pct.inProgress}%` }} /></div>
                <span>{stats.inProgress}</span>
              </div>
              <div className="pipeline-row">
                <span>Review</span>
                <div className="bar sky"><i style={{ width: `${stats.pct.review}%` }} /></div>
                <span>{stats.review}</span>
              </div>
              <div className="pipeline-row">
                <span>Done</span>
                <div className="bar ok"><i style={{ width: `${stats.pct.done}%` }} /></div>
                <span>{stats.done}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-hint">Active product areas</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Open issues</div>
          <div className="stat-value">{stats.open}</div>
          <div className="stat-hint">Not done / cancelled</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">In progress</div>
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-hint">Currently moving</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.done}</div>
          <div className="stat-hint">Closed as done</div>
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-head">
            <h3>Projects</h3>
            <Link to="/app/projects">View all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="muted">No projects yet — create your first product area.</p>
          ) : (
            <div className="projects-grid">
              {projects.slice(0, 4).map((p) => {
                const related = issues.filter((i) => i.projectId === p.id);
                const done = related.filter((i) => i.status === "DONE").length;
                const pct = related.length ? Math.round((done / related.length) * 100) : 0;
                return (
                  <Link key={p.id} to={`/app/projects/${p.id}`} className="project-card">
                    <div className="project-card-top">
                      <span className="mono pill">{p.key}</span>
                      <span className="muted small">{related.length || p.issueCount || 0} issues</span>
                    </div>
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.description || "No description"}</p>
                    </div>
                    <div className="progress-line">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <span className="muted small">{pct}% done</span>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Recent activity</h3>
            <Link to="/app/issues">Issues</Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted">Issue updates will appear here.</p>
          ) : (
            recent.map((issue) => (
              <Link key={issue.id} to={`/app/issues/${issue.id}`} className="activity-item" style={{ color: "inherit", textDecoration: "none" }}>
                <span
                  className={`dot${issue.status === "DONE" ? " ok" : issue.status === "IN_PROGRESS" ? " sky" : ""}`}
                />
                <div>
                  <strong>
                    {formatIssueKey(issue.project?.key ?? "PRJ", issue.number)} · {issue.title}
                  </strong>
                  <span>
                    {statusLabel(issue.status)}
                    {issue.assignee ? ` · ${issue.assignee.name}` : " · Unassigned"}
                    {" · "}
                    {issue.project?.name}
                  </span>
                </div>
              </Link>
            ))
          )}
        </article>
      </section>

      <section className="grid-three">
        <Link to="/app/cycles" className="module-card" style={{ color: "inherit", textDecoration: "none" }}>
          <h3>Cycles</h3>
          <p>Time-box work into sprints and track progress on a board.</p>
          <span className="tag">Open cycles</span>
        </Link>
        <Link to="/app/repositories" className="module-card" style={{ color: "inherit", textDecoration: "none" }}>
          <h3>GitHub</h3>
          <p>Connect repos, sync pull requests, and link them to issues.</p>
          <span className="tag">Repositories</span>
        </Link>
        <article className="module-card">
          <h3>AI assistant</h3>
          <p>Summarize issues, PRs, and cycles using real workspace context.</p>
          <span className="tag">Next slice</span>
        </article>
      </section>

      <Modal
        open={inviteOpen}
        title="Invite member"
        description="They must register first with this email, then you invite them into this workspace."
        onClose={() => {
          setInviteOpen(false);
          setError(null);
          setInviteMsg(null);
        }}
      >
        <form onSubmit={onInvite}>
          <div className="stack">
            <label>
              Email
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="teammate@company.com"
                autoFocus
              />
            </label>
            <label>
              Role
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="MEMBER">MEMBER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="GUEST">GUEST</option>
              </select>
            </label>
            {error ? <p className="error">{error}</p> : null}
            {inviteMsg ? <p className="muted small">{inviteMsg}</p> : null}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setInviteOpen(false);
                setError(null);
                setInviteMsg(null);
              }}
            >
              Close
            </button>
            <button type="submit" disabled={inviting}>
              {inviting ? "Inviting…" : "Invite"}
            </button>
          </div>
        </form>
      </Modal>

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
