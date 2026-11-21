"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, CalendarX2, Clock3, Lock } from "lucide-react";
import useSWR from "swr";
import { Badge } from "@components/ui/Badge";
import { ButtonLink } from "@components/ui/Button";
import { Card, CardBody, CardHeader, Stat } from "@components/ui/Card";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@components/ui/Feedback";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import ShiftChip from "@components/schedule/ShiftChip";
import RecentNotifications from "./RecentNotifications";
import { addDays, daysBetween, formatDay, formatWeekRange, todayISO, weekStart } from "@lib/dates";
import { formatHours } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import { MyAvailability, MySchedule } from "@types";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const today = todayISO();
  const thisWeek = weekStart(today);
  const horizon = addDays(thisWeek, 27);

  const schedule = useSWR<MySchedule>(["/schedule/me", { from: thisWeek, to: horizon }], fetcher);
  const availability = useSWR<MyAvailability>(["/availability/me", { from: today, to: horizon }], fetcher);

  const upcoming = (schedule.data?.shifts ?? []).filter((shift) => shift.date >= today);
  const next = upcoming[0];
  const weekHours = schedule.data?.weeks.find((week) => week.weekStart === thisWeek)?.hours ?? 0;

  // Weeks in the next four where the employee has not said anything for at least one future day.
  const weeksToFill = [0, 1, 2, 3]
    .map((offset) => addDays(thisWeek, offset * 7))
    .filter((week) => {
      if (availability.data?.lockedWeeks.includes(week)) return false;
      const days = daysBetween(week < today ? today : week, addDays(week, 6));
      return days.some((day) => !availability.data?.entries.some((entry) => entry.date === day));
    });

  return (
    <PageContainer>
      <PageHeader
        eyebrow={formatDay(today, locale, { weekday: "long", day: "numeric", month: "long" })}
        title={t("home.greeting", { name: user?.name.split(" ")[0] ?? "" })}
        description={t("home.employeeIntro")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {schedule.isLoading ? (
          [0, 1, 2].map((index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <Stat
              label={t("home.nextShift")}
              icon={<CalendarDays className="h-4 w-4" />}
              value={next ? formatDay(next.date, locale) : "—"}
              hint={next ? `${next.shiftTypeName} · ${next.startTime.slice(0, 5)}–${next.endTime.slice(0, 5)}` : t("home.noUpcomingShifts")}
            />
            <Stat label={t("home.hoursThisWeek")} icon={<Clock3 className="h-4 w-4" />} value={formatHours(weekHours, locale)} hint={user?.maxWeeklyHours ? t("home.ofMax", { hours: user.maxWeeklyHours }) : undefined} />
            <Stat
              label={t("home.availability")}
              icon={weeksToFill.length > 0 ? <CalendarX2 className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
              tone={weeksToFill.length > 0 ? "warning" : "good"}
              value={weeksToFill.length > 0 ? t("home.weeksToFill", { count: weeksToFill.length }) : t("home.allSet")}
              hint={
                <Link href="/schedule/availability" className="font-medium text-teal-700 hover:underline dark:text-teal-300">
                  {t("home.updateAvailability")}
                </Link>
              }
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={t("home.comingUp")}
            description={t("home.comingUpHint")}
            action={
              <ButtonLink href="/schedule/my" variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                {t("home.fullSchedule")}
              </ButtonLink>
            }
          />
          {schedule.isLoading ? (
            <TableSkeleton rows={4} columns={3} />
          ) : schedule.error ? (
            <ErrorState error={schedule.error} onRetry={() => schedule.mutate()} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={t("home.noUpcomingShifts")} description={t("home.noUpcomingShiftsHint")} />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {upcoming.slice(0, 6).map((shift) => (
                <li key={shift.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDay(shift.date, locale, { weekday: "short" })}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDay(shift.date, locale, { day: "numeric", month: "short" })}</p>
                  </div>
                  <ShiftChip shift={shift} className="flex-1 py-1.5" />
                  {shift.date === today && <Badge tone="teal">{t("common.today")}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("home.availabilityWeeks")} />
            <CardBody className="space-y-2">
              {availability.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                [0, 1, 2, 3].map((offset) => {
                  const week = addDays(thisWeek, offset * 7);
                  const locked = availability.data?.lockedWeeks.includes(week);
                  const missing = weeksToFill.includes(week);
                  return (
                    <div key={week} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{formatWeekRange(week, locale)}</span>
                      {locked ? (
                        <Badge icon={<Lock className="h-3 w-3" />}>{t("availability.locked")}</Badge>
                      ) : missing ? (
                        <Badge tone="amber">{t("home.needsInput")}</Badge>
                      ) : (
                        <Badge tone="green">{t("home.submitted")}</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
          <RecentNotifications />
        </div>
      </div>
    </PageContainer>
  );
};

export default EmployeeDashboard;
