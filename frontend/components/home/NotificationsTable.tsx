"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { Notification } from "@types";
import { getNotificationsForUser } from "@services/NotificationService";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";

const formatTimestamp = (value: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const NotificationsTable: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useI18n();
  const username = user?.username ?? null;

  const { data, error, isLoading } = useSWR<Notification[]>(
    username ? ["notifications", username] : null,
    () => getNotificationsForUser(username as string),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const sortedNotifications = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data]);

  const renderBody = () => {
    if (isAuthLoading) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
            {t("common.loadingAccount")}
          </td>
        </tr>
      );
    }

    if (!username) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-6 text-center text-red-500">
            {t("common.accessDeniedLogin")}
          </td>
        </tr>
      );
    }

    if (isLoading) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
            {t("common.loadingNotifications")}
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-6 text-center text-red-500">
            {error instanceof Error ? error.message : t("common.failedNotifications")}
          </td>
        </tr>
      );
    }

    if (sortedNotifications.length === 0) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
            {t("common.noNotifications")}
          </td>
        </tr>
      );
    }

    return sortedNotifications.map((notification) => (
      <tr
        key={notification.id}
        className="border-t border-gray-200 transition hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
      >
        <td className="px-4 py-2 text-left text-gray-700 dark:text-slate-100">
          {notification.message}
        </td>
        <td className="px-4 py-2 text-center text-gray-600 dark:text-slate-300">
          {formatTimestamp(notification.createdAt)}
        </td>
      </tr>
    ));
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <table className="min-w-full table-fixed border-collapse">
        <thead className="bg-teal-500 text-white dark:bg-teal-600">
          <tr>
            <th className="w-2/3 px-4 py-3 text-left">{t("common.message")}</th>
            <th className="w-1/3 px-4 py-3 text-center">{t("common.date")}</th>
          </tr>
        </thead>
        <tbody className="bg-gray-50 text-slate-800 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-100">
          {renderBody()}
        </tbody>
      </table>
    </div>
  );
};

export default NotificationsTable;
