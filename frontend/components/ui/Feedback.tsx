"use client";

import { AlertTriangle, Inbox, RotateCw, ShieldAlert } from "lucide-react";
import React from "react";
import { cx } from "@lib/format";
import useI18n from "@hooks/useI18n";
import { Button } from "./Button";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx("animate-pulse rounded-md bg-slate-200 dark:bg-slate-700", className)} aria-hidden />
);

/** Placeholder rows shaped like a table while it loads. */
export const TableSkeleton = ({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="divide-y divide-slate-100 dark:divide-slate-700" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex items-center gap-4 px-5 py-3.5">
        {Array.from({ length: columns }).map((__, column) => (
          <Skeleton key={column} className={cx("h-4", column === 0 ? "w-1/3" : "w-1/6")} />
        ))}
      </div>
    ))}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cx("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
      {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
    </span>
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) => {
  const { t } = useI18n();
  const message = error instanceof Error ? error.message : t("errors.generic");
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-10 text-center", className)} role="alert">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("errors.loadFailed")}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCw className="h-4 w-4" />} onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
};

export const Forbidden = () => {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
      title={t("errors.forbiddenTitle")}
      description={t("errors.forbidden")}
      className="py-24"
    />
  );
};

/** Inline message under a form or above a table. */
export const Alert = ({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: "error" | "warning" | "info" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={cx(
      "rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset",
      tone === "error" && "bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/30",
      tone === "warning" && "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30",
      tone === "info" && "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-100 dark:ring-sky-500/30",
      tone === "success" && "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30",
      className
    )}
  >
    {title && <p className="font-semibold">{title}</p>}
    {children && <div className={cx(title && "mt-1")}>{children}</div>}
  </div>
);
