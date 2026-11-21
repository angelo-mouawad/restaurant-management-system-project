"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  PackageCheck,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import React from "react";
import { formatDay, formatRelative } from "@lib/dates";
import { cx } from "@lib/format";
import useI18n from "@hooks/useI18n";
import { Notification, NotificationType } from "@types";

const icons: Record<NotificationType, { icon: React.ReactNode; tone: string }> = {
  GENERAL: { icon: <Bell className="h-4 w-4" />, tone: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  ACCOUNT_CREATED: { icon: <UserPlus className="h-4 w-4" />, tone: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  ROLE_CHANGED: { icon: <ShieldCheck className="h-4 w-4" />, tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
  AVAILABILITY_SUBMITTED: { icon: <CalendarRange className="h-4 w-4" />, tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  SCHEDULE_PUBLISHED: { icon: <CalendarCheck className="h-4 w-4" />, tone: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  SHIFT_CHANGED: { icon: <CalendarClock className="h-4 w-4" />, tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  LOW_STOCK: { icon: <AlertTriangle className="h-4 w-4" />, tone: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  PURCHASE_ORDER_RECEIVED: { icon: <PackageCheck className="h-4 w-4" />, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

/**
 * The API writes notifications in English with the values they were built from. English shows the
 * stored text; other languages rebuild it from the template for that type.
 */
export const useNotificationText = () => {
  const { t, locale } = useI18n();
  return (notification: Notification) => {
    if (locale === "en" || notification.type === "GENERAL") {
      return { title: notification.title, message: notification.message };
    }
    const params: Record<string, string | number> = { ...notification.params };
    ["date", "week", "from", "to"].forEach((key) => {
      if (typeof params[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(params[key]))) {
        params[key] = formatDay(String(params[key]), locale, { weekday: "short", day: "numeric", month: "short" });
      }
    });
    if (typeof params.role === "string") params.role = t(`roles.${params.role}`);
    if (typeof params.from === "string" && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(String(notification.params.from))) params.from = t(`roles.${notification.params.from}`);
    if (typeof params.to === "string" && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(String(notification.params.to))) params.to = t(`roles.${notification.params.to}`);
    if (typeof params.unit === "string") params.unit = t(`units.${params.unit}`);
    const variant = notification.type === "SHIFT_CHANGED" ? `.${params.change ?? "MODIFIED"}` : "";
    return {
      title: t(`notifications.types.${notification.type}${variant}.title`, params),
      message: t(`notifications.types.${notification.type}${variant}.message`, params),
    };
  };
};

export const NotificationItem = ({
  notification,
  onOpen,
  compact = false,
  action,
}: {
  notification: Notification;
  onOpen?: (notification: Notification) => void;
  compact?: boolean;
  action?: React.ReactNode;
}) => {
  const { t, locale } = useI18n();
  const text = useNotificationText()(notification);
  const style = icons[notification.type] ?? icons.GENERAL;

  const content = (
    <>
      <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.tone)} aria-hidden>
        {style.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={cx("text-sm text-slate-900 dark:text-slate-100", !notification.read && "font-semibold")}>{text.title}</span>
          <time dateTime={notification.createdAt} className="shrink-0 text-xs text-slate-400">
            {formatRelative(notification.createdAt, locale)}
          </time>
        </span>
        <span className={cx("mt-0.5 block text-sm text-slate-600 dark:text-slate-300", compact && "line-clamp-2")}>{text.message}</span>
      </span>
      {!notification.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label={t("notifications.unread")} />
      )}
    </>
  );

  const className = cx(
    "flex w-full gap-3 px-5 py-3.5 text-left transition-colors",
    !notification.read && "bg-teal-50/40 dark:bg-teal-500/5",
    (notification.link || onOpen) && "hover:bg-slate-50 dark:hover:bg-slate-700/40"
  );

  return (
    <li className="flex items-stretch">
      {notification.link ? (
        <Link href={notification.link} onClick={() => onOpen?.(notification)} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => onOpen?.(notification)} className={className}>
          {content}
        </button>
      )}
      {action && <div className="flex items-center pr-4">{action}</div>}
    </li>
  );
};
