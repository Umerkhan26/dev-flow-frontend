import type { ReactNode } from "react";

type Chip = { label: string; value: string | number; tone?: "default" | "accent" | "ok" | "warn" };

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  chips?: Chip[];
};

export function PageHeader({ eyebrow, title, description, actions, chips }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
        {actions ? <div className="topbar-actions">{actions}</div> : null}
      </div>
      {chips && chips.length > 0 ? (
        <div className="page-chips">
          {chips.map((chip) => (
            <div key={chip.label} className={`page-chip tone-${chip.tone ?? "default"}`}>
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
