import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchWorkspaces, logout, setActiveWorkspace } from "../app/store/authSlice";
import { ToastStack, useToasts } from "./ToastStack";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";
import { connectSocket, disconnectSocket, joinWorkspace } from "../lib/socket";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
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

function IconAi() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M8.5 8.5 6 6M15.5 8.5 18 6M8.5 15.5 6 18M15.5 15.5 18 18" strokeLinecap="round" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg {...iconProps}>
      <path d="M4 19V5" strokeLinecap="round" />
      <path d="M4 19h16" strokeLinecap="round" />
      <path d="M8 15v-4M12 15V8M16 15v-7" strokeLinecap="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg {...iconProps}>
      <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1.2 5 2 6H4c.8-1 2-2.5 2-6Z" />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

type NavCounts = {
  projects: number;
  issues: number;
  cycles: number;
  repos: number;
  prs: number;
};

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  countKey?: keyof NavCounts;
  accent?: boolean;
  badge?: number;
};

const PLAN: NavItem[] = [
  {
    to: "/app",
    end: true,
    label: "Overview",
    hint: "Pulse & shortcuts",
    icon: <IconOverview />,
  },
  {
    to: "/app/projects",
    label: "Projects",
    hint: "Product areas",
    icon: <IconProjects />,
    countKey: "projects",
  },
  {
    to: "/app/issues",
    label: "Issues",
    hint: "Work items",
    icon: <IconIssues />,
    countKey: "issues",
  },
  {
    to: "/app/cycles",
    label: "Cycles",
    hint: "Board & sprints",
    icon: <IconCycles />,
    countKey: "cycles",
  },
  {
    to: "/app/notifications",
    label: "Notifications",
    hint: "Live inbox",
    icon: <IconBell />,
  },
];

const SHIP: NavItem[] = [
  {
    to: "/app/repositories",
    label: "Repositories",
    hint: "GitHub links",
    icon: <IconRepos />,
    countKey: "repos",
  },
  {
    to: "/app/pull-requests",
    label: "Pull requests",
    hint: "Review queue",
    icon: <IconPr />,
    countKey: "prs",
  },
];

const INTEL: NavItem[] = [
  {
    to: "/app/ai",
    label: "AI assistant",
    hint: "Summaries & Q&A",
    icon: <IconAi />,
    accent: true,
  },
  {
    to: "/app/analytics",
    label: "Analytics",
    hint: "Delivery signals",
    icon: <IconAnalytics />,
  },
];

function NavGroup({
  title,
  items,
  counts,
}: {
  title: string;
  items: NavItem[];
  counts: NavCounts | null;
}) {
  return (
    <div className="nav-group">
      <p className="nav-group-label">{title}</p>
      <div className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            end={item.end}
            to={item.to}
            className={({ isActive }) =>
              `nav-item${isActive ? " active" : ""}${item.accent ? " nav-accent" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-copy">
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </span>
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span className="nav-count nav-unread">{item.badge}</span>
            ) : item.countKey && counts ? (
              <span className="nav-count">{counts[item.countKey]}</span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, workspaces, activeWorkspaceId, status, error, accessToken } = useAppSelector(
    (s) => s.auth,
  );
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const [counts, setCounts] = useState<NavCounts | null>(null);
  const [unread, setUnread] = useState(0);
  const { toasts, pushToast, dismiss } = useToasts();
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    void dispatch(fetchWorkspaces());
  }, [dispatch]);

  async function refreshUnread(workspaceId: string, token: string) {
    try {
      const data = await apiRequest<{ unreadCount: number }>(
        `/api/workspaces/${workspaceId}/notifications?unread=1`,
        { token },
      );
      setUnread(data.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!accessToken || !active?.id) {
        setCounts(null);
        return;
      }
      try {
        const [projects, issues, cycles, repos, prs] = await Promise.all([
          apiRequest<{ projects: unknown[] }>(`/api/workspaces/${active.id}/projects`, {
            token: accessToken,
          }),
          apiRequest<{ issues: unknown[] }>(`/api/workspaces/${active.id}/issues`, {
            token: accessToken,
          }),
          apiRequest<{ cycles: unknown[] }>(`/api/workspaces/${active.id}/cycles`, {
            token: accessToken,
          }),
          apiRequest<{ repositories: unknown[] }>(`/api/workspaces/${active.id}/repositories`, {
            token: accessToken,
          }),
          apiRequest<{ pullRequests: unknown[] }>(`/api/workspaces/${active.id}/pull-requests`, {
            token: accessToken,
          }),
        ]);
        if (!cancelled) {
          setCounts({
            projects: projects.projects?.length ?? 0,
            issues: issues.issues?.length ?? 0,
            cycles: cycles.cycles?.length ?? 0,
            repos: repos.repositories?.length ?? 0,
            prs: prs.pullRequests?.length ?? 0,
          });
        }
        await refreshUnread(active.id, accessToken);
      } catch {
        if (!cancelled) setCounts(null);
      }
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [accessToken, active?.id]);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    const sock = connectSocket(accessToken, {
      onNotification: (n) => {
        pushToast({
          id: n.id,
          title: n.title,
          body: n.body,
          link: n.link ?? undefined,
        });
        setUnread((c) => c + 1);
      },
    });

    const onConnect = () => {
      if (active?.id) joinWorkspace(active.id);
    };
    sock.on("connect", onConnect);
    if (sock.connected && active?.id) joinWorkspace(active.id);

    const onUpdated = () => {
      if (accessToken && active?.id) void refreshUnread(active.id, accessToken);
    };
    window.addEventListener("devflow:notifications-updated", onUpdated);

    return () => {
      sock.off("connect", onConnect);
      window.removeEventListener("devflow:notifications-updated", onUpdated);
    };
  }, [accessToken, active?.id, pushToast]);

  useEffect(() => {
    if (accessToken && active?.id) joinWorkspace(active.id);
  }, [accessToken, active?.id]);

  const planItems = PLAN.map((item) =>
    item.to === "/app/notifications" ? { ...item, badge: unread } : item,
  );

  const workspaceLabel =
    status === "loading" && workspaces.length === 0
      ? "Loading…"
      : active?.name ?? (status === "failed" ? "Failed to load" : "No workspace");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-brand">
            <div className="brand-mark">
              <span className="logo">DF</span>
              <div>
                <span className="brand">DevFlow AI</span>
                <p className="product-tag">Plan · ship · understand</p>
              </div>
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
              <p className="workspace-name">{workspaceLabel}</p>
            )}
            {active ? (
              <div className="workspace-meta">
                <span className="badge badge-owner">{active.role}</span>
                <span className="badge badge-live">Live</span>
              </div>
            ) : null}
            {workspaces.length === 0 && status !== "loading" ? (
              <Link className="workspace-cta" to="/onboarding">
                Create workspace →
              </Link>
            ) : null}
            {error && status === "failed" ? <p className="workspace-error">{error}</p> : null}
          </div>

          <NavGroup title="Plan" items={planItems} counts={counts} />
          <NavGroup title="Ship" items={SHIP} counts={counts} />
          <NavGroup title="Intelligence" items={INTEL} counts={counts} />

          <div className="sidebar-tip">
            <p className="sidebar-tip-kicker">Today</p>
            <p className="sidebar-tip-title">Stay in sync live</p>
            <p className="sidebar-tip-body">
              Issue moves, PR links, and repo syncs appear as toasts and in your notification inbox.
            </p>
            <div className="sidebar-tip-actions">
              <Link to="/app/notifications">Inbox</Link>
              <Link to="/app/ai">Ask AI</Link>
            </div>
          </div>

          <div className="sidebar-block">
            <h4>Capability map</h4>
            <div className="roadmap-list">
              <div className="roadmap-item">
                <span>Core delivery</span>
                <span className="roadmap-pill live">Live</span>
              </div>
              <div className="roadmap-item">
                <span>GitHub sync</span>
                <span className="roadmap-pill live">Live</span>
              </div>
              <div className="roadmap-item">
                <span>AI summaries</span>
                <span className="roadmap-pill live">Live</span>
              </div>
              <div className="roadmap-item">
                <span>Realtime</span>
                <span className="roadmap-pill live">Live</span>
              </div>
              <div className="roadmap-item">
                <span>Analytics</span>
                <span className="roadmap-pill live">Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="ghost btn-sm"
            onClick={() => {
              disconnectSocket();
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
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
