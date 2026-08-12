import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
};

function typeMeta(type: string) {
  switch (type) {
    case "REPO_SYNCED":
      return { label: "Sync", tone: "sky", icon: "↻" };
    case "WORKFLOW_FAILED":
      return { label: "CI", tone: "danger", icon: "!" };
    case "ISSUE_CREATED":
    case "ISSUE_UPDATED":
      return { label: "Issue", tone: "accent", icon: "●" };
    case "PR_LINKED":
      return { label: "PR", tone: "ok", icon: "⎇" };
    case "CYCLE_CREATED":
    case "CYCLE_UPDATED":
      return { label: "Cycle", tone: "sky", icon: "◷" };
    default:
      return { label: "Update", tone: "default", icon: "•" };
  }
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;

  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token || !workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ notifications: Notification[]; unreadCount: number }>(
        `/api/workspaces/${workspaceId}/notifications`,
        { token },
      );
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token, workspaceId]);

  async function markAllRead() {
    if (!token || !workspaceId) return;
    await apiRequest(`/api/workspaces/${workspaceId}/notifications/read`, {
      method: "POST",
      token,
      body: { all: true },
    });
    await load();
    window.dispatchEvent(new CustomEvent("devflow:notifications-updated"));
  }

  async function markOne(id: string) {
    if (!token || !workspaceId) return;
    await apiRequest(`/api/workspaces/${workspaceId}/notifications/read`, {
      method: "POST",
      token,
      body: { ids: [id] },
    });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    window.dispatchEvent(new CustomEvent("devflow:notifications-updated"));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Notifications"
        description="Activity from issues, PRs, cycles, and repo sync — kept in your inbox."
        actions={
          <button type="button" className="ghost" disabled={!unreadCount} onClick={() => void markAllRead()}>
            Mark all read
          </button>
        }
        chips={[
          { label: "Unread", value: unreadCount, tone: unreadCount ? "accent" : "default" },
          { label: "Total", value: items.length },
        ]}
      />

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <section className="panel actions-empty">
          <div className="panel-head">
            <h3>Inbox is clear</h3>
          </div>
          <p className="muted">
            When teammates update issues or a repo sync finds pull requests / CI, they show up here.
          </p>
        </section>
      ) : null}

      {items.length > 0 ? (
        <section className="notify-feed">
          {items.map((n) => {
            const meta = typeMeta(n.type);
            const unread = !n.readAt;
            return (
              <article
                key={n.id}
                className={`notify-card${unread ? " is-unread" : ""}${meta.tone ? ` tone-${meta.tone}` : ""}`}
              >
                <div className={`notify-icon tone-${meta.tone}`} aria-hidden>
                  {meta.icon}
                </div>
                <div className="notify-body">
                  <div className="notify-top">
                    <span className={`notify-badge tone-${meta.tone}`}>{meta.label}</span>
                    <time className="notify-time" dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>
                      {relativeTime(n.createdAt)}
                    </time>
                  </div>
                  <h3 className="notify-title">{n.title}</h3>
                  {n.body ? <p className="notify-copy">{n.body}</p> : null}
                  {n.actor ? <p className="notify-actor">by {n.actor.name}</p> : null}
                </div>
                <div className="notify-actions">
                  {n.link ? (
                    <Link
                      to={n.link}
                      className="button-link ghost-link btn-sm"
                      onClick={() => {
                        if (unread) void markOne(n.id);
                      }}
                    >
                      Open
                    </Link>
                  ) : null}
                  {unread ? (
                    <button type="button" className="ghost btn-sm" onClick={() => void markOne(n.id)}>
                      Mark read
                    </button>
                  ) : (
                    <span className="notify-read-pill">Read</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
