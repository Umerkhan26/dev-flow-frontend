import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchWorkspaces } from "../app/store/authSlice";
import { PageHeader } from "../components/PageHeader";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string; workspace?: { name: string; role: string; slug: string } };

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
};

type AuditEntry = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: string;
  actor?: { id: string; name: string; email: string } | null;
};

const ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "GUEST"] as const;

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const role = ctx.workspace?.role ?? "";
  const canAdmin = role === "OWNER" || role === "ADMIN";

  const [name, setName] = useState(ctx.workspace?.name ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token || !workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const membersRes = await apiRequest<{ members: Member[] }>(
        `/api/workspaces/${workspaceId}/members`,
        { token },
      );
      setMembers(membersRes.members ?? []);

      if (canAdmin) {
        const logsRes = await apiRequest<{ logs: AuditEntry[] }>(
          `/api/workspaces/${workspaceId}/audit-logs?limit=40`,
          { token },
        );
        setLogs(logsRes.logs ?? []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setName(ctx.workspace?.name ?? "");
  }, [ctx.workspace?.name]);

  useEffect(() => {
    void load();
  }, [token, workspaceId, canAdmin]);

  async function onRename(e: FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !canAdmin) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        token,
        body: { name: name.trim() },
      });
      setMsg("Workspace name updated");
      await dispatch(fetchWorkspaces());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename");
    } finally {
      setSaving(false);
    }
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !canAdmin) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        token,
        body: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteEmail("");
      setMsg("Member invited");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRoleChange(memberId: string, nextRole: string) {
    if (!token || !workspaceId || !canAdmin) return;
    setError(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        token,
        body: { role: nextRole },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change role");
    }
  }

  async function onRemove(memberId: string) {
    if (!token || !workspaceId || !canAdmin) return;
    if (!window.confirm("Remove this member from the workspace?")) return;
    setError(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
        token,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    }
  }

  if (!workspaceId) {
    return (
      <div className="empty">
        <h1>No workspace</h1>
        <p className="muted">Select or create a workspace first.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Rename the workspace, manage members, and review important activity."
        chips={[
          { label: "Members", value: members.length },
          { label: "Your role", value: role || "—", tone: "accent" },
        ]}
      />

      {error ? <p className="error">{error}</p> : null}
      {msg ? <p className="muted">{msg}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      <div className="analytics-grid" style={{ marginTop: "0.75rem" }}>
        <article className="panel">
          <div className="panel-head">
            <h3>Workspace</h3>
          </div>
          {canAdmin ? (
            <form className="stack" onSubmit={onRename}>
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </label>
              <p className="muted small">Slug: {ctx.workspace?.slug ?? "—"}</p>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save name"}
              </button>
            </form>
          ) : (
            <div>
              <p>
                <strong>{ctx.workspace?.name}</strong>
              </p>
              <p className="muted small">Only owners and admins can rename this workspace.</p>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>Invite member</h3>
          </div>
          {canAdmin ? (
            <form className="stack" onSubmit={onInvite}>
              <label>
                Email (must already have an account)
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="teammate@company.com"
                />
              </label>
              <label>
                Role
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="MEMBER">Member</option>
                  <option value="GUEST">Guest</option>
                </select>
              </label>
              <button type="submit" disabled={saving}>
                Invite
              </button>
            </form>
          ) : (
            <p className="muted small">You need admin access to invite people.</p>
          )}
        </article>
      </div>

      <section className="panel table-panel" style={{ marginTop: "0.75rem" }}>
        <div className="panel-head">
          <h3>Members</h3>
        </div>
        <ul className="data-list">
          {members.map((m) => (
            <li key={m.id}>
              <div className="data-row" style={{ cursor: "default" }}>
                <span className="grow">
                  <strong>{m.user.name}</strong>
                  <span className="muted block">{m.user.email}</span>
                </span>
                {canAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => void onRoleChange(m.id, e.target.value)}
                    style={{ width: "auto", margin: 0 }}
                    aria-label={`Role for ${m.user.name}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`status status-${m.role.toLowerCase()}`}>{m.role}</span>
                )}
                {canAdmin ? (
                  <button type="button" className="ghost btn-sm" onClick={() => void onRemove(m.id)}>
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canAdmin ? (
        <section className="panel table-panel" style={{ marginTop: "0.75rem" }}>
          <div className="panel-head">
            <h3>Audit trail</h3>
          </div>
          {logs.length === 0 ? (
            <p className="muted pad">No workspace audit events yet.</p>
          ) : (
            <ul className="data-list">
              {logs.map((log) => (
                <li key={log.id}>
                  <div className="data-row" style={{ cursor: "default" }}>
                    <span className="grow">
                      <strong>{log.action}</strong>
                      <span className="muted block">
                        {log.actor?.name ?? "System"}
                        {" · "}
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
