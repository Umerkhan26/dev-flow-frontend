import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAppSelector } from "../hooks/redux";
import { apiRequest } from "../lib/api";

type OutletCtx = { workspaceId?: string };

type AnalyticsPayload = {
  window: { from: string; to: string };
  filters?: { projectId: string | null };
  summary: {
    projects: number;
    members: number;
    issuesTotal: number;
    issuesOpen: number;
    issuesDone: number;
    issuesUnassigned: number;
    highUrgentOpen: number;
    doneInWindow: number;
    prsOpen: number;
    prsMergedInWindow: number;
    cyclesActive: number;
    cyclesAtRisk: number;
  };
  series?: {
    byDay: Array<{ date: string; done: number; merged: number }>;
  };
  issuesByStatus: Record<string, number>;
  issuesByPriority: Record<string, number>;
  assigneeWip: Array<{ userId: string; name: string; openCount: number }>;
  cycles: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    issueCount: number;
    doneCount: number;
    endDate: string | null;
    atRisk?: boolean;
    project?: { id: string; key: string; name: string };
  }>;
  pullRequests: {
    byState: Record<string, number>;
    draftOpen: number;
    linkedOpen: number;
    unlinkedOpen: number;
    avgMergeHours: number | null;
  };
  projects: Array<{
    id: string;
    key: string;
    name: string;
    open: number;
    done: number;
    completionPct: number;
  }>;
};

const STATUS_ROWS: Array<{ key: string; label: string; bar?: string }> = [
  { key: "BACKLOG", label: "Backlog" },
  { key: "TODO", label: "Todo" },
  { key: "IN_PROGRESS", label: "Active", bar: "sky" },
  { key: "IN_REVIEW", label: "Review", bar: "sky" },
  { key: "DONE", label: "Done", bar: "ok" },
  { key: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_ROWS: Array<{ key: string; label: string }> = [
  { key: "URGENT", label: "Urgent" },
  { key: "HIGH", label: "High" },
  { key: "MEDIUM", label: "Medium" },
  { key: "LOW", label: "Low" },
  { key: "NONE", label: "None" },
];

function formatWindow(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(from).toLocaleDateString(undefined, opts)} – ${new Date(to).toLocaleDateString(undefined, opts)}`;
}

export function AnalyticsPage() {
  const ctx = useOutletContext<OutletCtx>() ?? {};
  const token = useAppSelector((s) => s.auth.accessToken);
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const workspaceId = ctx.workspaceId ?? activeWorkspaceId ?? undefined;

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [projectId, setProjectId] = useState("");
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; key: string; name: string }>>(
    [],
  );

  useEffect(() => {
    async function loadProjects() {
      if (!token || !workspaceId) return;
      try {
        const res = await apiRequest<{ projects: Array<{ id: string; key: string; name: string }> }>(
          `/api/workspaces/${workspaceId}/projects`,
          { token },
        );
        setProjectOptions(res.projects ?? []);
      } catch {
        /* keep empty */
      }
    }
    void loadProjects();
  }, [token, workspaceId]);

  useEffect(() => {
    async function load() {
      if (!token || !workspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const to = new Date();
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        if (projectId) params.set("projectId", projectId);
        const payload = await apiRequest<AnalyticsPayload>(
          `/api/workspaces/${workspaceId}/analytics?${params}`,
          { token },
        );
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, workspaceId, days, projectId]);

  const statusTotal = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      Object.values(data.issuesByStatus).reduce((a, b) => a + b, 0),
      1,
    );
  }, [data]);

  const priorityTotal = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      Object.values(data.issuesByPriority).reduce((a, b) => a + b, 0),
      1,
    );
  }, [data]);

  const maxWip = useMemo(() => {
    if (!data?.assigneeWip.length) return 1;
    return Math.max(...data.assigneeWip.map((a) => a.openCount), 1);
  }, [data]);

  const seriesMax = useMemo(() => {
    const rows = data?.series?.byDay ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => Math.max(r.done, r.merged)), 1);
  }, [data]);

  if (!workspaceId) {
    return (
      <div className="empty">
        <h1>Select a workspace</h1>
        <p className="muted">Analytics need an active workspace.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics"
        description="Delivery signals across issues, cycles, and pull requests — aggregated for this workspace."
        chips={
          data
            ? [
                { label: "Open", value: data.summary.issuesOpen, tone: "accent" },
                { label: "Done (window)", value: data.summary.doneInWindow, tone: "ok" },
                { label: "Open PRs", value: data.summary.prsOpen },
                {
                  label: "At risk",
                  value: data.summary.cyclesAtRisk,
                  tone: data.summary.cyclesAtRisk ? "warn" : "default",
                },
              ]
            : undefined
        }
        actions={
          data ? (
            <span className="muted analytics-window">
              Window {formatWindow(data.window.from, data.window.to)}
            </span>
          ) : null
        }
      />

      <div className="filters-bar analytics-filters">
        <label>
          Range
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 7 | 14 | 30)}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>
        <label>
          Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hint-strip">
        Throughput uses issues marked <strong>DONE</strong> in the selected window. Cycle risk =
        active cycles past end date with unfinished work.
      </div>

      {loading ? <p className="muted">Loading analytics…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && data && data.summary.issuesTotal === 0 && data.summary.projects === 0 ? (
        <div className="empty panel">
          <h2>No delivery data yet</h2>
          <p className="muted">Create a project and link a repo to populate analytics.</p>
          <div className="hero-actions analytics-empty-actions">
            <Link className="button-link" to="/app/projects">
              Projects
            </Link>
            <Link className="button-link ghost-link" to="/app/repositories">
              Repositories
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div className="stat-grid analytics-stat-grid">
            <div className="stat-card">
              <div className="stat-label">Projects</div>
              <div className="stat-value">{data.summary.projects}</div>
              <div className="stat-hint">{data.summary.members} members</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Open issues</div>
              <div className="stat-value">{data.summary.issuesOpen}</div>
              <div className="stat-hint">{data.summary.issuesUnassigned} unassigned</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">High / urgent</div>
              <div className="stat-value">{data.summary.highUrgentOpen}</div>
              <div className="stat-hint">open priority work</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Merged (window)</div>
              <div className="stat-value">{data.summary.prsMergedInWindow}</div>
              <div className="stat-hint">
                {data.pullRequests.avgMergeHours != null
                  ? `avg ${data.pullRequests.avgMergeHours}h to merge`
                  : "no merge timing yet"}
              </div>
            </div>
          </div>

          {data.series?.byDay?.length ? (
            <section className="panel" style={{ marginTop: "0.75rem" }}>
              <div className="panel-head">
                <h3>Throughput by day</h3>
                <span className="muted small">Done issues · merged PRs</span>
              </div>
              <div className="spark-chart" role="img" aria-label="Daily throughput">
                {data.series.byDay.map((day) => (
                  <div
                    key={day.date}
                    className="spark-col"
                    title={`${day.date}: ${day.done} done, ${day.merged} merged`}
                  >
                    <div className="spark-bars">
                      <span
                        className="spark-bar done"
                        style={{ height: `${(day.done / seriesMax) * 100}%` }}
                      />
                      <span
                        className="spark-bar merged"
                        style={{ height: `${(day.merged / seriesMax) * 100}%` }}
                      />
                    </div>
                    <span className="spark-label">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="analytics-grid">
            <article className="panel">
              <div className="panel-head">
                <h3>Issue status</h3>
                <Link to="/app/issues">All issues</Link>
              </div>
              <div className="pipeline">
                {STATUS_ROWS.map((row) => {
                  const count = data.issuesByStatus[row.key] ?? 0;
                  const pct = (count / statusTotal) * 100;
                  return (
                    <div key={row.key} className="pipeline-row">
                      <span>{row.label}</span>
                      <div className={`bar${row.bar ? ` ${row.bar}` : ""}`}>
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>Priority mix</h3>
              </div>
              <div className="pipeline">
                {PRIORITY_ROWS.map((row) => {
                  const count = data.issuesByPriority[row.key] ?? 0;
                  const pct = (count / priorityTotal) * 100;
                  return (
                    <div key={row.key} className="pipeline-row">
                      <span>{row.label}</span>
                      <div className="bar">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>Assignee WIP</h3>
                <span className="muted" style={{ fontSize: "0.7rem" }}>
                  Open issues
                </span>
              </div>
              {data.assigneeWip.length === 0 ? (
                <p className="muted">No assigned open work.</p>
              ) : (
                <div className="pipeline">
                  {data.assigneeWip.map((row) => (
                    <div key={row.userId} className="pipeline-row analytics-wip-row">
                      <span title={row.name}>{row.name}</span>
                      <div className="bar sky">
                        <i style={{ width: `${(row.openCount / maxWip) * 100}%` }} />
                      </div>
                      <span>{row.openCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>Pull requests</h3>
                <Link to="/app/pull-requests">Queue</Link>
              </div>
              <div className="pipeline">
                {(["OPEN", "MERGED", "CLOSED"] as const).map((state) => {
                  const count = data.pullRequests.byState[state] ?? 0;
                  const total = Math.max(
                    Object.values(data.pullRequests.byState).reduce((a, b) => a + b, 0),
                    1,
                  );
                  return (
                    <div key={state} className="pipeline-row">
                      <span>{state === "OPEN" ? "Open" : state === "MERGED" ? "Merged" : "Closed"}</span>
                      <div className={`bar${state === "MERGED" ? " ok" : state === "OPEN" ? " sky" : ""}`}>
                        <i style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="analytics-pr-meta">
                <span>{data.pullRequests.draftOpen} draft open</span>
                <span>{data.pullRequests.linkedOpen} linked</span>
                <span>{data.pullRequests.unlinkedOpen} unlinked</span>
              </div>
            </article>
          </div>

          <div className="analytics-grid analytics-grid-wide">
            <article className="panel">
              <div className="panel-head">
                <h3>Cycles</h3>
                <Link to="/app/cycles">Board</Link>
              </div>
              {data.cycles.length === 0 ? (
                <p className="muted">No active or planned cycles.</p>
              ) : (
                <ul className="analytics-list">
                  {data.cycles.map((cycle) => (
                    <li key={cycle.id}>
                      <div className="analytics-list-main">
                        <Link to={`/app/cycles/${cycle.id}`}>
                          <strong>{cycle.name}</strong>
                        </Link>
                        <span className="muted">
                          {cycle.project?.key ? `${cycle.project.key} · ` : ""}
                          {cycle.status}
                          {cycle.atRisk ? " · at risk" : ""}
                        </span>
                      </div>
                      <div className="analytics-list-bar">
                        <div className={`bar${cycle.atRisk ? "" : " ok"}`}>
                          <i style={{ width: `${cycle.progress}%` }} />
                        </div>
                        <span>
                          {cycle.doneCount}/{cycle.issueCount} · {cycle.progress}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <h3>Projects</h3>
                <Link to="/app/projects">Browse</Link>
              </div>
              {data.projects.length === 0 ? (
                <p className="muted">No projects yet.</p>
              ) : (
                <ul className="analytics-list">
                  {data.projects.map((project) => (
                    <li key={project.id}>
                      <div className="analytics-list-main">
                        <Link to={`/app/projects/${project.id}`}>
                          <strong>
                            {project.key} — {project.name}
                          </strong>
                        </Link>
                        <span className="muted">
                          {project.open} open · {project.done} done
                        </span>
                      </div>
                      <div className="analytics-list-bar">
                        <div className="bar ok">
                          <i style={{ width: `${project.completionPct}%` }} />
                        </div>
                        <span>{project.completionPct}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}
