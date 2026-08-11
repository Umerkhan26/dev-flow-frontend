import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createWorkspace, fetchWorkspaces } from "../app/store/authSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";

export function OnboardingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);
  const workspaces = useAppSelector((s) => s.auth.workspaces);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      if (!token) {
        setChecking(false);
        return;
      }
      const result = await dispatch(fetchWorkspaces());
      setChecking(false);
      if (fetchWorkspaces.fulfilled.match(result) && (result.payload.workspaces?.length ?? 0) > 0) {
        navigate("/app", { replace: true });
      }
    }
    void check();
  }, [dispatch, navigate, token]);

  useEffect(() => {
    if (workspaces.length > 0) navigate("/app", { replace: true });
  }, [workspaces.length, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await dispatch(createWorkspace({ name }));
    setLoading(false);
    if (createWorkspace.fulfilled.match(result)) {
      navigate("/app");
    } else {
      setError(result.error.message ?? "Could not create workspace");
    }
  }

  if (checking) {
    return <p className="muted" style={{ padding: "2rem" }}>Checking workspace…</p>;
  }

  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="brand-mark">
          <span className="logo">DF</span>
          <span className="brand">DevFlow AI</span>
        </div>
        <div>
          <h2>Your workspace is the tenant boundary.</h2>
          <p>
            Projects, issues, repositories, and AI context all live inside a workspace your team
            owns.
          </p>
        </div>
        <div className="auth-visual-footer">
          <span className="auth-chip">Step 1 of onboarding</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-panel wide">
          <div className="brand-mark">
            <span className="logo">DF</span>
            <span className="brand">DevFlow AI</span>
          </div>
          <h1>Create your workspace</h1>
          <p className="muted">Name the home for your engineering team.</p>
          <form onSubmit={onSubmit} className="stack">
            <label>
              Workspace name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Engineering"
                required
                minLength={2}
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create workspace"}
            </button>
          </form>
          <p className="muted small" style={{ marginTop: "0.85rem" }}>
            Already invited to a teammate’s workspace? Ask them to invite your email, then{" "}
            <Link to="/app">open the app</Link> (or log out and log in again).
          </p>
        </div>
      </section>
    </div>
  );
}
