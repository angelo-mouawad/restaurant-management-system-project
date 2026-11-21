"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, CalendarCheck, ClipboardList, Users } from "lucide-react";
import useSWR from "swr";
import { Badge } from "@components/ui/Badge";
import { ButtonLink } from "@components/ui/Button";
import { Card, CardHeader, Stat } from "@components/ui/Card";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@components/ui/Feedback";
import { Avatar, PageContainer, PageHeader } from "@components/ui/Layout";
import ShiftChip from "@components/schedule/ShiftChip";
import RecentNotifications from "./RecentNotifications";
import { addDays, formatDay, formatWeekRange, todayISO, weekStart } from "@lib/dates";
import { formatMoney, formatNumber } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import { Planning, StockOverview } from "@types";

const ManagerDashboard = () => {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const today = todayISO();
  const thisWeek = weekStart(today);
  const nextWeek = addDays(thisWeek, 7);

  const planning = useSWR<Planning>(["/schedule/planning", { from: thisWeek, to: nextWeek }], fetcher);
  const stock = useSWR<StockOverview>("/stock/overview", fetcher);

  const todayShifts = (planning.data?.shifts ?? []).filter((shift) => shift.date === today);
  const upcomingWarnings = (planning.data?.warnings ?? []).filter((warning) => warning.date >= today);
  const errors = upcomingWarnings.filter((warning) => warning.severity === "ERROR").length;
  const next = planning.data?.periods.find((period) => period.weekStart === nextWeek);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={formatDay(today, locale, { weekday: "long", day: "numeric", month: "long" })}
        title={t("home.greeting", { name: user?.name.split(" ")[0] ?? "" })}
        description={t("home.managerIntro")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planning.isLoading || stock.isLoading ? (
          [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <Stat label={t("home.onShiftToday")} icon={<Users className="h-4 w-4" />} value={todayShifts.length} hint={t("home.peopleScheduled")} />
            <Stat
              label={t("home.planningIssues")}
              icon={<AlertTriangle className="h-4 w-4" />}
              tone={errors > 0 ? "danger" : upcomingWarnings.length > 0 ? "warning" : "good"}
              value={upcomingWarnings.length}
              hint={errors > 0 ? t("home.conflictsToFix", { count: errors }) : t("home.nextTwoWeeks")}
            />
            <Stat
              label={t("home.lowStock")}
              icon={<Boxes className="h-4 w-4" />}
              tone={(stock.data?.lowStockCount ?? 0) > 0 ? "warning" : "good"}
              value={stock.data?.lowStockCount ?? 0}
              hint={t("home.itemsBelowMinimum")}
            />
            <Stat label={t("home.stockValue")} icon={<ClipboardList className="h-4 w-4" />} value={formatMoney(stock.data?.totalValue ?? 0, locale)} hint={t("home.openOrders", { count: stock.data?.openOrderCount ?? 0 })} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader
              title={t("home.todaysTeam")}
              description={formatDay(today, locale, { weekday: "long", day: "numeric", month: "long" })}
              action={
                <ButtonLink href={`/schedule/planning?week=${thisWeek}`} variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                  {t("home.openPlanning")}
                </ButtonLink>
              }
            />
            {planning.isLoading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : planning.error ? (
              <ErrorState error={planning.error} onRetry={() => planning.mutate()} />
            ) : todayShifts.length === 0 ? (
              <EmptyState title={t("home.nobodyToday")} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {todayShifts.map((shift) => (
                  <li key={shift.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Avatar name={shift.userName} size="sm" />
                    <Link href={`/profile/${shift.userId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:underline dark:text-slate-100">
                      {shift.userName}
                    </Link>
                    <ShiftChip shift={shift} className="w-48 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("home.planningIssues")}
              description={t("home.planningIssuesHint")}
              action={
                next && (
                  <Badge tone={next.status === "PUBLISHED" ? "green" : "amber"} icon={<CalendarCheck className="h-3 w-3" />}>
                    {t("home.nextWeekStatus", { week: formatWeekRange(nextWeek, locale), status: t(`periodStatus.${next.status}`) })}
                  </Badge>
                )
              }
            />
            {planning.isLoading ? (
              <TableSkeleton rows={4} columns={2} />
            ) : upcomingWarnings.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title={t("home.noIssues")} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {upcomingWarnings.slice(0, 6).map((warning, index) => (
                  <li key={`${warning.type}-${warning.date}-${index}`}>
                    <Link
                      href={`/schedule/planning?week=${weekStart(warning.date)}`}
                      className="flex items-start gap-3 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      <Badge tone={warning.severity === "ERROR" ? "red" : "amber"} className="mt-0.5">
                        {t(`warnings.${warning.type}`)}
                      </Badge>
                      <span className="text-slate-700 dark:text-slate-200">{warning.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={t("home.runningLow")}
              action={
                <ButtonLink href="/stock?low=1" variant="ghost" size="sm">
                  {t("common.viewAll")}
                </ButtonLink>
              }
            />
            {stock.isLoading ? (
              <TableSkeleton rows={4} columns={2} />
            ) : stock.error ? (
              <ErrorState error={stock.error} onRetry={() => stock.mutate()} />
            ) : (stock.data?.lowStockItems.length ?? 0) === 0 ? (
              <EmptyState icon={<Boxes className="h-5 w-5" />} title={t("home.stockHealthy")} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {stock.data!.lowStockItems.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link href={`/stock?item=${item.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{item.name}</span>
                      <span className="tabular-nums text-red-600 dark:text-red-400">
                        {formatNumber(item.quantity, locale)} / {formatNumber(item.minThreshold, locale)} {t(`units.${item.unit}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <RecentNotifications />
        </div>
      </div>
    </PageContainer>
  );
};

export default ManagerDashboard;
