import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../components/Modal";
import { apiRequest } from "../lib/api";
import { useAppSelector } from "../hooks/redux";
import type { Project } from "../types/engineering";

type OutletCtx = { workspaceId?: string };

export function ProjectsPage() {
  const { workspaceId } = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!workspaceId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ projects: Project[] }>(
        `/api/workspaces/${workspaceId}/projects`,
        { token },
      );
      setProjects(data.projects);
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

      <section className="panel">
        {loading ? <p className="muted">Loading…</p> : null}
        {error && !open ? <p className="error">{error}</p> : null}
        {!loading && projects.length === 0 ? (
          <p className="muted">No projects yet. Create one to start tracking issues.</p>
        ) : null}
        <ul className="data-list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/app/projects/${p.id}`} className="data-row">
                <span className="mono pill">{p.key}</span>
                <span className="grow">
                  <strong>{p.name}</strong>
                  {p.description ? <span className="muted block">{p.description}</span> : null}
                </span>
                <span className="muted">{p.issueCount ?? 0} issues</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
