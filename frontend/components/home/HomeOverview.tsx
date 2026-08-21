"use client";

import React from "react";
import { ScheduleItem, StockItem } from "@types";
import ScheduleTable from "@components/schedule/ScheduleTable";
import StockTable from "@components/stock/StockTable";
import NotificationsTable from "./NotificationsTable";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";

type Props = {
  scheduleItems: ScheduleItem[];
  stockItems: StockItem[];
  scheduleError?: string | null;
  stockError?: string | null;
};

const HomeOverview: React.FC<Props> = ({
  scheduleItems,
  stockItems,
  scheduleError,
  stockError,
}) => {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return <p className="text-slate-500 dark:text-slate-400">{t("common.loadingAccount")}</p>;
  }

  if (!user) {
    return <p className="text-red-500">{t("common.accessDeniedLogin")}</p>;
  }

  const isAdmin = user.role === "admin";
  const displayName = user.name || user.username || t("common.roleFallback");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 px-6 py-4 text-white shadow-lg dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold uppercase shadow-inner">
            {initial}
          </div>
          <div>
            <p className="text-sm opacity-80">{t("common.welcomeBack")}</p>
            <p className="text-xl font-semibold leading-tight">{displayName}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-inner">
          {user.role || t("common.roleFallback")}
        </span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <h2 className="mb-4 text-2xl font-semibold text-teal-500">{t("home.schedule")}</h2>
          {scheduleError ? (
            <p className="text-red-500">{t("schedule.failed")}</p>
          ) : scheduleItems.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">{t("schedule.noItems")}</p>
          ) : (
            <ScheduleTable items={scheduleItems} showRemove={false} showActions={false} />
          )}
        </div>

        <div className="flex-1 space-y-8">
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-teal-500">
              {t("home.notifications")}
            </h2>
            <NotificationsTable />
          </div>

          {isAdmin && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-teal-500">{t("home.stock")}</h2>
              {stockError ? (
                <p className="text-red-500">{t("stock.failed")}</p>
              ) : stockItems.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">{t("stock.noItems")}</p>
              ) : (
                <StockTable items={stockItems} showActions={false} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeOverview;
