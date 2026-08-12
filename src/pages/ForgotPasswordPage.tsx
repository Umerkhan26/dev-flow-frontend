import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthChrome } from "../components/AuthChrome";
import { apiRequest } from "../lib/api";

type Step = "email" | "otp" | "password";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    setDevCode(null);
    try {
      const data = await apiRequest<{
        ok: boolean;
        message: string;
        emailSent?: boolean;
        warning?: string;
        devCode?: string;
      }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
        skipAuthRefresh: true,
      });
      setInfo(
        data.emailSent
          ? "We sent a 6-digit code to your Gmail. Enter it below."
          : data.warning ??
              "Email could not be sent. Use the on-screen code if shown, or fix SMTP settings.",
      );
      if (data.devCode) setDevCode(data.devCode);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email, code },
        skipAuthRefresh: true,
      });
      setInfo("Code confirmed. Choose a new password.");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { email, code, password },
        skipAuthRefresh: true,
      });
      setInfo("Password updated. Redirecting to sign in…");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    step === "email"
      ? "Enter your account email. We’ll send a 6-digit code to Gmail."
      : step === "otp"
        ? "Enter the 6-digit code from your email."
        : "Set a new password (min 8 characters).";

  return (
    <AuthChrome
      title="Forgot password"
      subtitle={subtitle}
      footer={
        <>
          Remembered it? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {info ? <p className="muted small">{info}</p> : null}
      {devCode ? (
        <p className="muted small">
          Dev code: <strong>{devCode}</strong>
        </p>
      ) : null}

      {step === "email" ? (
        <form onSubmit={onSendCode} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@gmail.com"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={onVerifyOtp} className="stack">
          <label>
            6-digit code
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              placeholder="123456"
              autoComplete="one-time-code"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Verify code"}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Change email
          </button>
        </form>
      ) : null}

      {step === "password" ? (
        <form onSubmit={onResetPassword} className="stack">
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : null}
    </AuthChrome>
  );
}
