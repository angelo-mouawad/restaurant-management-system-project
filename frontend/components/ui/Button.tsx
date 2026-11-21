"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import React from "react";
import { cx } from "@lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-600/60 dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60",
  dangerGhost: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
};

const base =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed dark:focus-visible:ring-offset-slate-900";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", icon, loading = false, className, children, disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(base, variants[variant], sizes[size], !children && (size === "sm" ? "w-8 px-0" : "w-10 px-0"), className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export const ButtonLink = ({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <Link href={href} className={cx(base, variants[variant], sizes[size], className)}>
    {icon}
    {children}
  </Link>
);
