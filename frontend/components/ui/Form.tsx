"use client";

import { Search } from "lucide-react";
import React, { useId } from "react";
import { cx } from "@lib/format";

const control =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

/** A labelled form control. The child gets the id, so the label and hint are wired up for screen readers. */
export const Field = ({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) => {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": hint || error ? hintId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {(error || hint) && (
        <p id={hintId} className={cx("text-xs", error ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cx(control, "h-10", className)} {...props} />
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cx(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cx(control, "py-2", className)} rows={3} {...props} />
);
Textarea.displayName = "Textarea";

export const SearchInput = ({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) => (
  <div className={cx("relative", className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="pl-9"
    />
  </div>
);

/** A row of mutually exclusive options, like a radio group that looks like buttons. */
export const Segmented = <T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  label: string;
  className?: string;
}) => (
  <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700/60", className)}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cx(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
          value === option.value
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);
