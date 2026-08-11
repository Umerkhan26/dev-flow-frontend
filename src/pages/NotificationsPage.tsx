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
        description="Live activity from issues, pull requests, cycles, and repo sync — stored for your inbox."
        actions={
          <button type="button" className="ghost" disabled={!unreadCount} onClick={() => void markAllRead()}>
            Mark all read
          </button>
        }
        chips={[
          { label: "Unread", value: unreadCount, tone: unreadCount ? "accent" : "ok" },
          { label: "Total", value: items.length },
        ]}
      />

      <div className="hint-strip">
        <strong>Realtime:</strong> Keep this tab open to receive live toasts when teammates update work.
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="panel table-panel">
        {!loading && items.length === 0 ? (
          <div className="empty-inline">
            <p className="muted">No notifications yet.</p>
            <p className="muted small">Create an issue or sync a repo to generate activity.</p>
          </div>
        ) : null}
        <ul className="data-list">
          {items.map((n) => (
            <li key={n.id}>
              <div className={`data-row notify-row${n.readAt ? "" : " unread"}`}>
                <span className="grow">
                  <strong>{n.title}</strong>
                  <span className="muted block">
                    {n.body || n.type}
                    {n.actor ? ` · ${n.actor.name}` : ""}
                    {" · "}
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
                {n.link ? (
                  <Link
                    to={n.link}
                    className="muted small"
                    onClick={() => {
                      if (!n.readAt) void markOne(n.id);
                    }}
                  >
                    Open
                  </Link>
                ) : null}
                {!n.readAt ? (
                  <button type="button" className="ghost btn-sm" onClick={() => void markOne(n.id)}>
                    Read
                  </button>
                ) : (
                  <span className="muted small">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
