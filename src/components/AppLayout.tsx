import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchWorkspaces, logout, setActiveWorkspace } from "../app/store/authSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
} as const;

function IconOverview() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg {...iconProps}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
    </svg>
  );
}

function IconIssues() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCycles() {
  return (
    <svg {...iconProps}>
      <path d="M20 12a8 8 0 1 1-2.2-5.5" strokeLinecap="round" />
      <path d="M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRepos() {
  return (
    <svg {...iconProps}>
      <path d="M7 4h8.5A2.5 2.5 0 0 1 18 6.5V19l-3-1.5L12 19l-3-1.5L6 19V6.5A2.5 2.5 0 0 1 8.5 4" />
      <path d="M9 8h6M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

function IconPr() {
  return (
    <svg {...iconProps}>
      <circle cx="7" cy="6" r="2.2" />
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="17" cy="18" r="2.2" />
      <path d="M7 8.2v7.6M17 15.8V10a3 3 0 0 0-3-3h-2" strokeLinecap="round" />
    </svg>
  );
}

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, workspaces, activeWorkspaceId, status, error } = useAppSelector((s) => s.auth);
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    void dispatch(fetchWorkspaces());
  }, [dispatch]);

  const workspaceLabel =
    status === "loading" && workspaces.length === 0
      ? "Loading…"
      : active?.name ?? (status === "failed" ? "Failed to load" : "No workspace");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-mark">
              <span className="logo">DF</span>
              <span className="brand">DevFlow AI</span>
            </div>
            <p className="product-tag">Engineering workspace</p>
          </div>

          <div className="workspace-inline">
            <div className="label">Workspace</div>
            {workspaces.length > 1 ? (
              <select
                className="workspace-select"
                value={active?.id}
                onChange={(e) => dispatch(setActiveWorkspace(e.target.value))}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="workspace-name">{workspaceLabel}</p>
            )}
            {active ? (
              <div className="workspace-meta">
                <span className="badge badge-owner">{active.role}</span>
                <span className="badge badge-live">Active</span>
              </div>
            ) : null}
            {workspaces.length === 0 && status !== "loading" ? (
              <Link className="workspace-cta" to="/onboarding">
                Create workspace →
              </Link>
            ) : null}
            {error && status === "failed" ? <p className="workspace-error">{error}</p> : null}
          </div>

          <nav className="sidebar-nav">
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              to="/app"
              end
            >
              <IconOverview />
              Overview
            </NavLink>
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              to="/app/projects"
            >
              <IconProjects />
              Projects
            </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            to="/app/issues"
          >
            <IconIssues />
            Issues
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            to="/app/cycles"
          >
            <IconCycles />
            Cycles
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            to="/app/repositories"
          >
            <IconRepos />
            Repositories
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            to="/app/pull-requests"
          >
            <IconPr />
            Pull requests
          </NavLink>
          </nav>

          <div className="sidebar-block">
            <h4>Roadmap</h4>
            <div className="roadmap-list">
              <div className="roadmap-item">
                <span>AI summaries</span>
                <span>Next</span>
              </div>
              <div className="roadmap-item">
                <span>Realtime</span>
                <span>Soon</span>
              </div>
              <div className="roadmap-item">
                <span>Analytics</span>
                <span>Soon</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <strong>{user?.name}</strong>
            </div>
          </div>
          <button
            type="button"
            className="ghost btn-sm"
            onClick={() => {
              dispatch(logout());
              navigate("/login");
            }}
          >
            Out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="page">
          <Outlet context={{ workspaceId: active?.id, workspace: active }} />
        </div>
      </main>
    </div>
  );
}
