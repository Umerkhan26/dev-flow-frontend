import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../components/Modal";
import { apiRequest } from "../lib/api";
import { useAppSelector } from "../hooks/redux";
import type { Issue, Project } from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function ProjectsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!workspaceId) {
      setProjects([]);
      setIssues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, i] = await Promise.all([
        apiRequest<{ projects: Project[] }>(`/api/workspaces/${workspaceId}/projects`, { token }),
        apiRequest<{ issues: Issue[] }>(`/api/workspaces/${workspaceId}/issues`, { token }),
      ]);
      setProjects(p.projects ?? []);
      setIssues(i.issues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !token) return;
    setCreating(true);
    setError(null);
    try {
      const data = await apiRequest<{ project: Project }>(
        `/api/workspaces/${workspaceId}/projects`,
        {
          method: "POST",
          token,
          body: { name, key, description: description || undefined },
        },
      );
      setName("");
      setKey("");
      setDescription("");
      setOpen(false);
      navigate(`/app/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Delivery</p>
          <h1>Projects</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          New project
        </button>
      </header>

      {loading ? <p className="muted">Loading projects…</p> : null}
      {error && !open ? <p className="error">{error}</p> : null}

      {!loading && projects.length === 0 ? (
        <section className="panel">
          <p className="muted">No projects yet. Create one to start tracking issues.</p>
        </section>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => {
            const related = issues.filter((i) => i.projectId === p.id);
            const done = related.filter((i) => i.status === "DONE").length;
            const active = related.filter((i) => i.status === "IN_PROGRESS").length;
            const pct = related.length ? Math.round((done / related.length) * 100) : 0;
            return (
              <Link key={p.id} to={`/app/projects/${p.id}`} className="project-card">
                <div className="project-card-top">
                  <span className="mono pill">{p.key}</span>
                  <span className="muted small">{related.length || p.issueCount || 0} issues</span>
                </div>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description || "No description yet"}</p>
                </div>
                <div className="progress-line">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <div className="project-card-top">
                  <span className="muted small">{pct}% complete</span>
                  <span className="muted small">{active} active</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        title="Create project"
        description="A project groups related issues for one product area."
        onClose={() => setOpen(false)}
      >
        <form onSubmit={onCreate}>
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
                placeholder="ACP"
                required
                minLength={2}
                maxLength={8}
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
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
