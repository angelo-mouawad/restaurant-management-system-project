import React from "react";
import { cx } from "@lib/format";

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <section
    className={cx(
      "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800",
      className
    )}
  >
    {children}
  </section>
);

export const CardHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cx("flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700", className)}>
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {action}
  </div>
);

export const CardBody = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cx("px-5 py-4", className)}>{children}</div>
);

/** One figure with a label, for the summary rows at the top of a page. */
export const Stat = ({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "good";
}) => (
  <Card className="px-5 py-4">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {icon && (
        <span
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone === "neutral" && "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
            tone === "good" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
            tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
            tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
          )}
        >
          {icon}
        </span>
      )}
    </div>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </Card>
);
