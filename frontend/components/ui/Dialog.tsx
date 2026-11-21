"use client";

import { X } from "lucide-react";
import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cx } from "@lib/format";
import useI18n from "@hooks/useI18n";
import { Button } from "./Button";

const useModalBehaviour = (open: boolean, onClose: () => void, panel: React.RefObject<HTMLDivElement | null>, focusPanel = false) => {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panel.current) {
        // Keep keyboard focus inside the dialog.
        const focusable = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      // Dialogs focus their first field; drawers focus the panel so reading starts at the top.
      const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? (focusPanel ? panel.current : panel.current?.querySelector<HTMLElement>("input, select, textarea, button"));
      target?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, panel, focusPanel]);
};

export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { t } = useI18n();
  useModalBehaviour(open, onClose, panel);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-800 sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>}
          </div>
          <Button variant="ghost" size="sm" aria-label={t("common.close")} onClick={onClose} icon={<X className="h-4 w-4" />} />
        </div>
        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-700 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/** Asks before anything destructive happens. */
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) => {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div>{message}</div>
        {children}
      </div>
    </Dialog>
  );
};

/** A panel that slides in from the right, for details next to a list. */
export const Drawer = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { t } = useI18n();
  useModalBehaviour(open, onClose, panel, true);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl outline-none dark:bg-slate-800"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" aria-label={t("common.close")} onClick={onClose} icon={<X className="h-4 w-4" />} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-700">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
