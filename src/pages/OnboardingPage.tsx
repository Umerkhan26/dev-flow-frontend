import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkspace } from "../app/store/authSlice";
import { useAppDispatch } from "../hooks/redux";

export function OnboardingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        </div>
      </section>
    </div>
  );
}
