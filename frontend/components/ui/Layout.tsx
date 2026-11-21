"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cx, initials } from "@lib/format";

export const PageHeader = ({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <div className="mb-1 text-sm font-medium text-teal-700 dark:text-teal-300">{eyebrow}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
      {description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const PageContainer = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => (
  <div className={cx("mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8", wide ? "max-w-[1600px]" : "max-w-7xl")}>{children}</div>
);

/** Sub navigation between the pages of one section, styled as tabs. */
export const TabNav = ({ tabs }: { tabs: { href: string; label: string; icon?: React.ReactNode; count?: number }[] }) => {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-700 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const avatarTones = [
  "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
];

/** Initials on a colour that stays the same for the same person. */
export const Avatar = ({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) => {
  const tone = avatarTones[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarTones.length];
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        tone,
        size === "sm" && "h-7 w-7 text-xs",
        size === "md" && "h-9 w-9 text-sm",
        size === "lg" && "h-12 w-12 text-base",
        size === "xl" && "h-20 w-20 text-2xl",
        className
      )}
    >
      {initials(name)}
    </span>
  );
};
