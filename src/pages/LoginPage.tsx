import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearError, login } from "../app/store/authSlice";
import { AuthChrome } from "../components/AuthChrome";
import { useAppDispatch, useAppSelector } from "../hooks/redux";

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
        <p className="muted small" style={{ margin: 0 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthChrome>
  );
}
