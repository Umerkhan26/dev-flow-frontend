import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { API_URL, apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type GithubStatus = {
  configured: boolean;
  connected: boolean;
  connection: { githubLogin: string; updatedAt: string } | null;
};

type GithubRepoOption = {
  githubRepoId: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  linked: boolean;
};

type Repository = {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  prCount: number;
};

export function RepositoriesPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;
  const [params] = useSearchParams();

  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [available, setAvailable] = useState<GithubRepoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!token || !workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [st, linked] = await Promise.all([
        apiRequest<GithubStatus>(`/api/integrations/github/status?workspaceId=${workspaceId}`, {
          token,
        }),
        apiRequest<{ repositories: Repository[] }>(
          `/api/workspaces/${workspaceId}/repositories`,
          { token },
        ),
      ]);
      setStatus(st);
      setRepos(linked.repositories ?? []);

      if (st.connected) {
        try {
          const avail = await apiRequest<{ repos: GithubRepoOption[] }>(
            `/api/workspaces/${workspaceId}/github/repos`,
            { token },
          );
          setAvailable(avail.repos ?? []);
        } catch {
          setAvailable([]);
        }
      } else {
        setAvailable([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  useEffect(() => {
    const oauthError = params.get("error");
    if (oauthError) setError(decodeURIComponent(oauthError));
  }, [params]);

  async function connectGithub() {
    if (!token) {
      setError("Session expired. Sign in again, then connect GitHub.");
      return;
    }
    if (!workspaceId) {
      setError("Select a workspace first.");
      return;
    }
    setBusy("connect");
    setError(null);
    try {
      // Auth'd prepare → one-time ticket URL (no Bearer needed on browser redirect)
      const data = await apiRequest<{ startPath: string }>("/api/integrations/github/prepare", {
        method: "POST",
        token,
        body: { workspaceId },
      });
      window.location.href = `${API_URL}${data.startPath}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start GitHub OAuth";
      setError(
        message === "Missing access token" || /token|unauthorized|expired/i.test(message)
          ? "Session expired. Sign out, sign in again, then connect GitHub."
          : message,
      );
      setBusy(null);
    }
  }

  async function linkRepo(repo: GithubRepoOption) {
    if (!token || !workspaceId) return;
    setBusy(repo.githubRepoId);
    setError(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/repositories`, {
        method: "POST",
        token,
        body: {
          githubRepoId: repo.githubRepoId,
          fullName: repo.fullName,
          name: repo.name,
          owner: repo.owner,
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.defaultBranch,
          htmlUrl: repo.htmlUrl,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link repository");
    } finally {
      setBusy(null);
    }
  }

  async function syncRepo(id: string) {
    if (!token) return;
    setBusy(id);
    try {
      await apiRequest(`/api/repositories/${id}/sync`, { method: "POST", token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ship"
        title="Repositories"
        description="Connect GitHub, link the repos you care about, and sync pull requests into this workspace."
        actions={
          status?.connected ? (
            <Link className="button-link ghost-link" to="/app/pull-requests">
              View PRs
            </Link>
          ) : (
            <button type="button" onClick={() => void connectGithub()} disabled={busy === "connect"}>
              {busy === "connect" ? "Redirecting…" : "Connect GitHub"}
            </button>
          )
        }
        chips={[
          {
            label: "GitHub",
            value: status?.connected ? "Connected" : status?.configured ? "Ready" : "Setup",
            tone: status?.connected ? "ok" : "warn",
          },
          { label: "Linked", value: repos.length, tone: "accent" },
          {
            label: "PRs synced",
            value: repos.reduce((n, r) => n + (r.prCount || 0), 0),
          },
        ]}
      />

      <div className="hint-strip">
        <strong>Safe sync:</strong> DevFlow only reads PRs from GitHub — it does not change your repos.
      </div>

      {params.get("connected") ? (
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          GitHub connected successfully.
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && status && !status.configured ? (
        <section className="panel">
          <h2>GitHub OAuth not configured</h2>
          <p className="muted">
            Add <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> to{" "}
            <code>backend/.env</code>, then restart the API. See{" "}
            <code>docs/github-setup.md</code>.
          </p>
        </section>
      ) : null}

      {!loading && status?.configured && !status.connected ? (
        <section className="panel">
          <h2>Connect your GitHub account</h2>
          <p className="muted">
            Managers and owners can authorize GitHub, then link repositories to this workspace.
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <button type="button" onClick={() => void connectGithub()}>
              Connect GitHub
            </button>
          </div>
        </section>
      ) : null}

      {status?.connected ? (
        <section className="panel" style={{ marginBottom: "0.75rem" }}>
          <div className="panel-head">
            <h3>Connected as @{status.connection?.githubLogin}</h3>
          </div>
          <p className="muted small">Linked repositories sync pull requests into DevFlow.</p>
        </section>
      ) : null}

      {repos.length > 0 ? (
        <section className="panel" style={{ marginBottom: "0.75rem" }}>
          <div className="panel-head">
            <h3>Linked repositories</h3>
          </div>
          <ul className="data-list">
            {repos.map((repo) => (
              <li key={repo.id} className="data-row" style={{ cursor: "default" }}>
                <span className="grow">
                  <strong>{repo.fullName}</strong>
                  <span className="muted block">
                    {repo.syncStatus}
                    {repo.lastSyncedAt
                      ? ` · synced ${new Date(repo.lastSyncedAt).toLocaleString()}`
                      : ""}
                    {repo.prCount ? ` · ${repo.prCount} PRs` : ""}
                  </span>
                  {repo.lastSyncError ? (
                    <span className="muted block" style={{ color: "var(--danger)" }}>
                      {repo.lastSyncError}
                    </span>
                  ) : null}
                </span>
                <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="muted small">
                  GitHub
                </a>
                <button
                  type="button"
                  className="ghost btn-sm"
                  disabled={busy === repo.id}
                  onClick={() => void syncRepo(repo.id)}
                >
                  {busy === repo.id ? "Syncing…" : "Sync now"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status?.connected ? (
        <section className="panel">
          <div className="panel-head">
            <h3>Available from GitHub</h3>
          </div>
          {available.length === 0 ? (
            <p className="muted">No repositories returned (or insufficient GitHub access).</p>
          ) : (
            <ul className="data-list">
              {available
                .filter((r) => !r.linked)
                .slice(0, 30)
                .map((repo) => (
                  <li key={repo.githubRepoId} className="data-row" style={{ cursor: "default" }}>
                    <span className="grow">
                      <strong>{repo.fullName}</strong>
                      <span className="muted block">
                        {repo.private ? "Private" : "Public"}
                        {repo.description ? ` · ${repo.description}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn-sm"
                      disabled={busy === repo.githubRepoId}
                      onClick={() => void linkRepo(repo)}
                    >
                      {busy === repo.githubRepoId ? "Linking…" : "Link"}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
