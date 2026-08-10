import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearError, login } from "../app/store/authSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";

function AuthChrome({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="brand-mark">
          <span className="logo">DF</span>
          <span className="brand">DevFlow AI</span>
        </div>
        <div>
          <h2>Engineering work, finally in one place.</h2>
          <p>
            Plan issues, track delivery, and connect repository activity with AI assistance built
            for software teams.
          </p>
        </div>
        <div className="auth-visual-footer">
          <span className="auth-chip">Projects & issues</span>
          <span className="auth-chip">GitHub sync</span>
          <span className="auth-chip">AI summaries</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-panel">
          <div className="brand-mark">
            <span className="logo">DF</span>
            <span className="brand">DevFlow AI</span>
          </div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <div className="auth-foot muted">{footer}</div>
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) navigate("/app");
  }

  return (
    <AuthChrome
      title="Welcome back"
      subtitle="Sign in to continue to your engineering workspace."
      footer={
        <>
          No account? <Link to="/register">Create one</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="stack">
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
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthChrome>
  );
}
