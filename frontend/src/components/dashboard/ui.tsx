import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@rydex/shared/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-4 sm:flex-row sm:items-end", className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "light",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "light" | "dark" | "lime";
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col justify-between rounded-2xl border p-4 transition sm:p-5",
        tone === "dark"
          ? "border-ink bg-ink text-white"
          : tone === "lime"
            ? "border-lime/60 bg-lime text-ink"
            : "border-line bg-white hover:border-line-strong",
        href && "hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            tone === "dark" ? "text-fg-inverse-subtle" : "text-fg-subtle",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full",
            tone === "dark" ? "bg-surface/10 text-lime" : tone === "lime" ? "bg-surface-muted/10" : "bg-surface-muted text-fg-muted",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-4">
        <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
        {hint && (
          <p className={cn("mt-1 text-[10px]", tone === "dark" ? "text-fg-inverse-subtle" : "text-fg-subtle")}>{hint}</p>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line-strong bg-surface/70 px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
        <Icon className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
      </span>
      <p className="font-display mt-4 text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-fg-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] text-fg-muted">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
          {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function DashboardTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter"
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1.5"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          aria-pressed={value === tab.key}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition",
            value === tab.key ? "bg-ink text-white" : "text-fg-muted hover:bg-surface-muted hover:text-ink",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                value === tab.key ? "bg-lime text-ink" : "bg-surface-muted text-fg-muted",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
