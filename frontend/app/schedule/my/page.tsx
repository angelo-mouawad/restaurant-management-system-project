"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List } from "lucide-react";
import { Suspense, useMemo } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import PeriodNavigator from "@components/schedule/PeriodNavigator";
import ScheduleTabs from "@components/schedule/ScheduleTabs";
import ShiftChip from "@components/schedule/ShiftChip";
import { Badge, shiftColorClasses } from "@components/ui/Badge";
import { Card } from "@components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "@components/ui/Feedback";
import { Segmented } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import {
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  formatWeekRange,
  formatWeekday,
  monthEnd,
  monthGrid,
  monthStart,
  todayISO,
  weekStart,
} from "@lib/dates";
import { cx, formatHours } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useI18n from "@hooks/useI18n";
import { MySchedule, Shift } from "@types";

type View = "calendar" | "list";

const MySchedulePage = () => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const today = todayISO();
  const focus = params.get("week") ?? today;
  const view: View = params.get("view") === "list" ? "list" : "calendar";

  const setParams = (next: { week?: string; view?: View }) => {
    const search = new URLSearchParams(params.toString());
    if (next.week) search.set("week", next.week);
    if (next.view) search.set("view", next.view);
    router.replace(`/schedule/my?${search.toString()}`, { scroll: false });
  };

  // Calendar: the whole month around the focus date. List: four weeks starting at its week.
  const range = view === "calendar"
    ? { from: weekStart(monthStart(focus)), to: addDays(weekStart(monthEnd(focus)), 6) }
    : { from: weekStart(focus), to: addDays(weekStart(focus), 27) };

  const { data, error, isLoading, mutate } = useSWR<MySchedule>(["/schedule/me", range], fetcher);

  const byDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    data?.shifts.forEach((shift) => map.set(shift.date, [...(map.get(shift.date) ?? []), shift]));
    return map;
  }, [data]);

  const step = (direction: number) =>
    setParams({ week: view === "calendar" ? addMonths(focus, direction) : addDays(weekStart(focus), direction * 28) });

  return (
    <PageContainer>
      <PageHeader title={t("mySchedule.title")} description={t("mySchedule.description")} />
      <ScheduleTabs />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodNavigator
          label={
            view === "calendar"
              ? formatMonth(focus, locale)
              : `${formatDay(range.from, locale, { day: "numeric", month: "short" })} – ${formatDay(range.to, locale, { day: "numeric", month: "short", year: "numeric" })}`
          }
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setParams({ week: today })}
        />
        <Segmented<View>
          label={t("mySchedule.view")}
          value={view}
          onChange={(value) => setParams({ view: value })}
          options={[
            { value: "calendar", label: t("mySchedule.calendar"), icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
            { value: "list", label: t("mySchedule.list"), icon: <List className="h-4 w-4" aria-hidden /> },
          ]}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => mutate()} />
        </Card>
      ) : view === "calendar" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_auto] border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            {monthGrid(focus)[0].map((day) => (
              <div key={day} className="px-2 py-2 text-center">
                <span className="hidden sm:inline">{formatWeekday(day, locale, "short")}</span>
                <span className="sm:hidden">{formatWeekday(day, locale, "narrow")}</span>
              </div>
            ))}
            <div className="hidden px-3 py-2 text-right sm:block">{t("mySchedule.hours")}</div>
          </div>
          {monthGrid(focus).map((week) => {
            const summary = data?.weeks.find((entry) => entry.weekStart === week[0]);
            return (
              <div key={week[0]} className="grid grid-cols-[repeat(7,minmax(0,1fr))_auto] border-b border-slate-100 last:border-b-0 dark:border-slate-700">
                {week.map((day) => {
                  const shifts = byDate.get(day) ?? [];
                  const inMonth = day.slice(0, 7) === focus.slice(0, 7);
                  return (
                    <div
                      key={day}
                      className={cx(
                        "min-h-[5.5rem] border-r border-slate-100 p-1.5 last:border-r-0 dark:border-slate-700 sm:p-2",
                        !inMonth && "bg-slate-50/70 dark:bg-slate-900/30"
                      )}
                    >
                      <span
                        className={cx(
                          "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          day === today ? "bg-teal-600 text-white" : inMonth ? "text-slate-700 dark:text-slate-200" : "text-slate-400"
                        )}
                      >
                        {Number(day.slice(8))}
                      </span>
                      <div className="space-y-1">
                        {shifts.map((shift) => (
                          <div key={shift.id} title={`${shift.shiftTypeName} ${shift.startTime.slice(0, 5)}–${shift.endTime.slice(0, 5)}`}>
                            <ShiftChip shift={shift} className="hidden md:flex" />
                            <span className={cx("block h-1.5 rounded-full md:hidden", (shiftColorClasses[shift.color] ?? shiftColorClasses.slate).dot)} aria-label={shift.shiftTypeName} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="hidden w-20 items-start justify-end px-3 py-2 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200 sm:flex">
                  {summary && summary.hours > 0 ? formatHours(summary.hours, locale) : "—"}
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <div className="space-y-4">
          {(data?.weeks ?? []).map((week) => {
            const shifts = (data?.shifts ?? []).filter((shift) => weekStart(shift.date) === week.weekStart);
            return (
              <Card key={week.weekStart}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatWeekRange(week.weekStart, locale)}</h2>
                  <div className="flex items-center gap-2">
                    {!week.published && <Badge>{t("mySchedule.notPublished")}</Badge>}
                    <Badge tone="teal">{t("mySchedule.weekTotal", { hours: formatHours(week.hours, locale), count: week.shiftCount })}</Badge>
                  </div>
                </div>
                {shifts.length === 0 ? (
                  <EmptyState
                    className="py-8"
                    icon={<CalendarDays className="h-5 w-5" />}
                    title={week.published ? t("mySchedule.noShiftsWeek") : t("mySchedule.notPublishedYet")}
                  />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {shifts.map((shift) => (
                      <li key={shift.id} className={cx("flex items-center gap-4 px-5 py-3", shift.date < today && "opacity-60")}>
                        <div className="w-28 shrink-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatWeekday(shift.date, locale, "long")}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDay(shift.date, locale, { day: "numeric", month: "long" })}</p>
                        </div>
                        <ShiftChip shift={shift} className="flex-1 py-1.5" />
                        <span className="hidden w-14 text-right text-sm tabular-nums text-slate-500 sm:block">{formatHours(shift.hours, locale)}</span>
                        {shift.date === today && <Badge tone="teal">{t("common.today")}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
                {shifts.some((shift) => shift.note) && (
                  <div className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {shifts.filter((shift) => shift.note).map((shift) => (
                      <p key={shift.id}>
                        {formatDay(shift.date, locale)}: {shift.note}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

const Page = () => (
  <RequireRole roles={["EMPLOYEE"]}>
    <Suspense>
      <MySchedulePage />
    </Suspense>
  </RequireRole>
);

export default Page;
