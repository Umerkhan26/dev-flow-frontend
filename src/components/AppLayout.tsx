import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, workspaces, activeWorkspaceId } = useAppSelector((s) => s.auth);
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <span className="logo">DF</span>
            <span className="brand">DevFlow AI</span>
          </div>
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
            <p className="workspace-name">{active?.name ?? "Loading…"}</p>
          )}
        </div>

        <nav>
          <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to="/app" end>
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
          <div className="nav-divider" />
          <span className="nav-item soon">Cycles</span>
          <span className="nav-item soon">Repos · PRs · AI</span>
        </nav>

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
