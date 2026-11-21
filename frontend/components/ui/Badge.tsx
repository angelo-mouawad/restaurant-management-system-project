import React from "react";
import { cx } from "@lib/format";

export type Tone = "neutral" | "teal" | "green" | "amber" | "red" | "indigo" | "sky" | "rose" | "slate";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600",
  slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600",
  teal: "bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/30",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30",
  indigo: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-500/30",
  sky: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30",
  rose: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30",
};

export const Badge = ({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      tones[tone],
      className
    )}
  >
    {icon}
    {children}
  </span>
);

/** Solid colour chips for shift types, keyed by the palette name the API stores. */
export const shiftColorClasses: Record<string, { chip: string; dot: string; soft: string }> = {
  teal: { chip: "bg-teal-600 text-white", dot: "bg-teal-500", soft: "bg-teal-50 text-teal-900 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-100 dark:ring-teal-500/30" },
  amber: { chip: "bg-amber-500 text-amber-950", dot: "bg-amber-500", soft: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/30" },
  indigo: { chip: "bg-indigo-600 text-white", dot: "bg-indigo-500", soft: "bg-indigo-50 text-indigo-900 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-500/30" },
  rose: { chip: "bg-rose-600 text-white", dot: "bg-rose-500", soft: "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-500/30" },
  sky: { chip: "bg-sky-600 text-white", dot: "bg-sky-500", soft: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-500/30" },
  slate: { chip: "bg-slate-600 text-white", dot: "bg-slate-500", soft: "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600" },
};
