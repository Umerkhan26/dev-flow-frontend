import type { ReactNode } from "react";

export function AuthChrome({
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
