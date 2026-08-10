import { useEffect, useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import type { Cycle, Project } from "../types/engineering";
import { CYCLE_STATUSES } from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function CyclesPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  async function load() {
    if (!token || !workspaceId) {
      setLoading(false);
      setCycles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        apiRequest<{ cycles: Cycle[] }>(`/api/workspaces/${workspaceId}/cycles`, { token }),
        apiRequest<{ projects: Project[] }>(`/api/workspaces/${workspaceId}/projects`, { token }),
      ]);
      setCycles(c.cycles ?? []);
      setProjects(p.projects ?? []);
      if (!projectId && p.projects?.[0]) setProjectId(p.projects[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cycles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    setCreating(true);
    setError(null);
    try {
      const data = await apiRequest<{ cycle: Cycle }>(`/api/projects/${projectId}/cycles`, {
        method: "POST",
        token,
        body: { name, goal: goal || undefined, status },
      });
      setOpen(false);
      setName("");
      setGoal("");
      setCycles((prev) => [data.cycle, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create cycle");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Planning</p>
          <h1>Cycles</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} disabled={projects.length === 0}>
          New cycle
        </button>
      </header>

      {loading ? <p className="muted">Loading cycles…</p> : null}
      {error && !open ? <p className="error">{error}</p> : null}

      {!loading && projects.length === 0 ? (
        <section className="panel">
          <p className="muted">Create a project first, then add a cycle.</p>
          <Link to="/app/projects">Go to projects</Link>
        </section>
      ) : null}

      {!loading && projects.length > 0 && cycles.length === 0 ? (
        <section className="panel">
          <p className="muted">No cycles yet. Create a 1–2 week cycle and pull issues onto the board.</p>
        </section>
      ) : null}

      <div className="projects-grid">
        {cycles.map((cycle) => (
          <Link key={cycle.id} to={`/app/cycles/${cycle.id}`} className="project-card">
            <div className="project-card-top">
              <span className={`status status-${cycle.status.toLowerCase()}`}>{cycle.status}</span>
              <span className="mono muted">{cycle.project?.key}</span>
            </div>
            <div>
              <h3>{cycle.name}</h3>
              <p>{cycle.goal || cycle.project?.name || "No goal set"}</p>
            </div>
            <div className="progress-line">
              <i style={{ width: `${cycle.progress}%` }} />
            </div>
            <div className="project-card-top">
              <span className="muted small">
                {cycle.doneCount}/{cycle.issueCount} done
              </span>
              <span className="muted small">{cycle.progress}%</span>
            </div>
          </Link>
        ))}
      </div>

      <Modal
        open={open}
        title="Create cycle"
        description="Time-box delivery for a project, then manage work on the board."
        onClose={() => setOpen(false)}
      >
        <form onSubmit={onCreate}>
          <div className="stack">
            <label>
              Project
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key} — {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Sprint 12"
                autoFocus
              />
            </label>
            <label>
              Goal
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ship password reset + polish"
              />
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {CYCLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="error">{error}</p> : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create cycle"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
