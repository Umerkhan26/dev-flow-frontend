import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearError, register } from "../app/store/authSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((s) => s.auth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(register({ name, email, password }));
    if (register.fulfilled.match(result)) navigate("/onboarding");
  }

  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="brand-mark">
          <span className="logo">DF</span>
          <span className="brand">DevFlow AI</span>
        </div>
        <div>
          <h2>Build your team workspace in minutes.</h2>
          <p>
            Invite members, create projects, and manage engineering issues with a clean workflow
            designed for delivery.
          </p>
        </div>
        <div className="auth-visual-footer">
          <span className="auth-chip">Multi-tenant</span>
          <span className="auth-chip">RBAC</span>
          <span className="auth-chip">Issue tracking</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-panel">
          <div className="brand-mark">
            <span className="logo">DF</span>
            <span className="brand">DevFlow AI</span>
          </div>
          <h1>Create account</h1>
          <p className="muted">Start with a workspace for your team.</p>
          <form onSubmit={onSubmit} className="stack">
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Asif"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="auth-foot muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
