"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  History,
  Lock,
  LockOpen,
  Plus,
  Send,
} from "lucide-react";
import { Suspense, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import PlanningGrid from "@components/planning/PlanningGrid";
import ShiftDialog, { ShiftDraft } from "@components/planning/ShiftDialog";
import PeriodNavigator from "@components/schedule/PeriodNavigator";
import ScheduleTabs from "@components/schedule/ScheduleTabs";
import { availabilityStyles } from "@components/schedule/availabilityStyles";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card, CardHeader } from "@components/ui/Card";
import { ConfirmDialog, Drawer } from "@components/ui/Dialog";
import { Alert, EmptyState, ErrorState, Skeleton } from "@components/ui/Feedback";
import { Segmented } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { addDays, formatDateTime, formatDay, formatWeekRange, todayISO, weekStart } from "@lib/dates";
import { cx } from "@lib/format";
import { ApiError, fetcher } from "@services/apiClient";
import { publishWeek, setWeekLock, updateShift } from "@services/schedule";
import useI18n from "@hooks/useI18n";
import { Planning, Shift, ShiftChange } from "@types";

type View = "week" | "month";

const PlanningPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const today = todayISO();
  const week = weekStart(params.get("week") ?? today);
  const view: View = params.get("view") === "month" ? "month" : "week";
  const highlight = params.get("employee") ? Number(params.get("employee")) : undefined;

  const from = week;
  const to = addDays(week, view === "week" ? 6 : 27);
  const { data, error, isLoading, mutate } = useSWR<Planning>(["/schedule/planning", { from, to }], fetcher, {
    keepPreviousData: true,
  });

  const [draft, setDraft] = useState<ShiftDraft | null>(null);
  const [pendingMove, setPendingMove] = useState<{ shift: Shift; userId: number; date: string; warnings: string[] } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  const setParams = (next: { week?: string; view?: View }) => {
    const search = new URLSearchParams(params.toString());
    if (next.week) search.set("week", next.week);
    if (next.view) search.set("view", next.view);
    search.delete("employee");
    router.replace(`/schedule/planning?${search.toString()}`, { scroll: false });
  };

  const period = data?.periods.find((candidate) => candidate.weekStart === week);
  const weekShifts = (data?.shifts ?? []).filter((shift) => weekStart(shift.date) === week);
  const visibleWarnings = (data?.warnings ?? []).filter((warning) => warning.date >= from && warning.date <= to && warning.date >= today);
  const weekErrors = visibleWarnings.filter((warning) => warning.severity === "ERROR" && weekStart(warning.date) === week);
  const weekEmployees = new Set(weekShifts.map((shift) => shift.userId)).size;

  const move = async (shift: Shift, userId: number, date: string, force: boolean) => {
    try {
      // A drag keeps the shift exactly as it is and only changes who works it and when.
      await updateShift(shift.id, {
        userId,
        date,
        shiftTypeId: shift.shiftTypeId,
        startTime: shift.startTime.slice(0, 5),
        endTime: shift.endTime.slice(0, 5),
        note: shift.note,
        force,
      });
      setPendingMove(null);
      await mutate();
      notify(t("planning.shiftMoved"));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "SHIFT_WARNINGS") {
        setPendingMove({ shift, userId, date, warnings: caught.details });
      } else {
        setPendingMove(null);
        notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
      }
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await publishWeek(week);
      setConfirmPublish(false);
      await mutate();
      notify(t("planning.published", { count: weekEmployees }));
    } catch (caught) {
      setConfirmPublish(false);
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async () => {
    if (!period) return;
    setBusy(true);
    try {
      await setWeekLock(week, !period.availabilityLocked);
      await mutate();
      notify(period.availabilityLocked ? t("planning.unlocked") : t("planning.lockedToast"));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  };

  const moveTarget = pendingMove && data?.employees.find((employee) => employee.id === pendingMove.userId);

  return (
    <PageContainer wide>
      <PageHeader
        title={t("planning.title")}
        description={t("planning.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ date: week < today ? today : week })}>
            {t("planning.assignShift")}
          </Button>
        }
      />
      <ScheduleTabs />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodNavigator
            label={view === "week" ? formatWeekRange(week, locale) : `${formatDay(from, locale, { day: "numeric", month: "short" })} – ${formatDay(to, locale, { day: "numeric", month: "short", year: "numeric" })}`}
            onPrevious={() => setParams({ week: addDays(week, view === "week" ? -7 : -28) })}
            onNext={() => setParams({ week: addDays(week, view === "week" ? 7 : 28) })}
            onToday={() => setParams({ week: weekStart(today) })}
          />
          <Segmented<View>
            label={t("planning.view")}
            value={view}
            onChange={(value) => setParams({ view: value })}
            options={[
              { value: "week", label: t("planning.week"), icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
              { value: "month", label: t("planning.fourWeeks"), icon: <CalendarRange className="h-4 w-4" aria-hidden /> },
            ]}
          />
        </div>

        {period && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-slate-500 dark:text-slate-400">{t("planning.weekOf", { week: formatDay(week, locale, { day: "numeric", month: "short" }) })}</span>
            <Badge tone={period.status === "PUBLISHED" ? "green" : "amber"} icon={period.status === "PUBLISHED" ? <CalendarCheck className="h-3 w-3" /> : undefined}>
              {t(`periodStatus.${period.status}`)}
            </Badge>
            {period.availabilityLocked && <Badge icon={<Lock className="h-3 w-3" />}>{t("planning.availabilityLocked")}</Badge>}
            {period.status === "DRAFT" && (
              <Button variant="secondary" size="sm" loading={busy && !confirmPublish} onClick={toggleLock} icon={period.availabilityLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}>
                {period.availabilityLocked ? t("planning.unlock") : t("planning.lock")}
              </Button>
            )}
            {period.status === "PUBLISHED" ? (
              <Button variant="secondary" size="sm" icon={<History className="h-4 w-4" />} onClick={() => setLogOpen(true)}>
                {t("planning.changeLog")}
                {period.changeCount > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs dark:bg-slate-700">{period.changeCount}</span>}
              </Button>
            ) : (
              <Button size="sm" icon={<Send className="h-4 w-4" />} onClick={() => setConfirmPublish(true)} disabled={weekShifts.length === 0}>
                {t("planning.publish")}
              </Button>
            )}
          </div>
        )}
      </div>

      {view === "month" && data && (
        <div className="mb-3 flex flex-wrap gap-2">
          {data.periods.map((candidate) => (
            <button
              key={candidate.weekStart}
              type="button"
              onClick={() => setParams({ week: candidate.weekStart, view: "week" })}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:border-teal-400 dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{formatWeekRange(candidate.weekStart, locale)}</span>
              <Badge tone={candidate.status === "PUBLISHED" ? "green" : "amber"}>{t(`periodStatus.${candidate.status}`)}</Badge>
            </button>
          ))}
        </div>
      )}

      {isLoading && !data ? (
        <Skeleton className="h-[32rem] w-full rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => mutate()} />
        </Card>
      ) : data && data.employees.length === 0 ? (
        <Card>
          <EmptyState title={t("planning.noEmployees")} description={t("planning.noEmployeesHint")} />
        </Card>
      ) : data ? (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="overflow-hidden">
            <PlanningGrid
              planning={data}
              from={from}
              to={to}
              compact={view === "month"}
              highlightUserId={highlight}
              onCellClick={(userId, date) => setDraft({ userId, date })}
              onShiftClick={(shift) => setDraft({ shift })}
              onShiftDrop={(shift, userId, date) => void move(shift, userId, date, false)}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {(["AVAILABLE", "PREFERRED", "UNAVAILABLE", "NONE"] as const).map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span className={cx("h-3 w-4 rounded-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-600", availabilityStyles[status].cell || "bg-white dark:bg-slate-800")} aria-hidden />
                  {t(`availabilityStatus.${status}`)}
                </span>
              ))}
              <span className="ml-auto hidden sm:inline">{t("planning.dragHint")}</span>
            </div>
          </Card>

          <Card className="h-fit">
            <CardHeader
              title={t("planning.issues")}
              description={visibleWarnings.length === 0 ? t("planning.noIssues") : t("planning.issuesCount", { count: visibleWarnings.length })}
            />
            {visibleWarnings.length === 0 ? (
              <EmptyState className="py-8" icon={<CalendarCheck className="h-5 w-5" />} title={t("planning.allGood")} />
            ) : (
              <>
                <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                  {(showAllWarnings ? visibleWarnings : visibleWarnings.slice(0, 12)).map((warning, index) => (
                    <li key={`${warning.type}-${warning.date}-${warning.shiftId ?? warning.shiftTypeId ?? warning.userId}-${index}`} className="flex gap-3 px-5 py-3 text-sm">
                      <AlertTriangle className={cx("mt-0.5 h-4 w-4 shrink-0", warning.severity === "ERROR" ? "text-red-500" : "text-amber-500")} aria-hidden />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t(`warnings.${warning.type}`)}</p>
                        <p className="text-slate-600 dark:text-slate-300">{warning.message}</p>
                        {warning.shiftId && (
                          <button
                            type="button"
                            className="mt-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
                            onClick={() => {
                              const shift = data.shifts.find((candidate) => candidate.id === warning.shiftId);
                              if (shift) setDraft({ shift });
                            }}
                          >
                            {t("planning.openShift")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {visibleWarnings.length > 12 && (
                  <div className="border-t border-slate-200 px-5 py-2 dark:border-slate-700">
                    <Button variant="ghost" size="sm" onClick={() => setShowAllWarnings((value) => !value)}>
                      {showAllWarnings ? t("common.showLess") : t("common.showAll", { count: visibleWarnings.length })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      ) : null}

      {data && <ShiftDialog draft={draft} planning={data} onClose={() => setDraft(null)} onSaved={async (message) => { setDraft(null); await mutate(); notify(message); }} />}

      <ConfirmDialog
        open={!!pendingMove}
        tone="primary"
        title={t("planning.moveAnywayTitle")}
        message={pendingMove && moveTarget ? t("planning.moveAnywayMessage", { name: moveTarget.name, day: formatDay(pendingMove.date, locale) }) : ""}
        confirmLabel={t("planning.saveAnyway")}
        onConfirm={() => pendingMove && void move(pendingMove.shift, pendingMove.userId, pendingMove.date, true)}
        onClose={() => setPendingMove(null)}
      >
        <ul className="list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-200">
          {pendingMove?.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmPublish}
        tone="primary"
        title={t("planning.publishTitle", { week: formatWeekRange(week, locale) })}
        message={t("planning.publishMessage", { shifts: weekShifts.length, people: weekEmployees })}
        confirmLabel={t("planning.publish")}
        loading={busy}
        onConfirm={publish}
        onClose={() => setConfirmPublish(false)}
      >
        {weekErrors.length > 0 && <Alert tone="warning">{t("planning.publishWithErrors", { count: weekErrors.length })}</Alert>}
      </ConfirmDialog>

      <ChangeLog open={logOpen} week={week} onClose={() => setLogOpen(false)} />
    </PageContainer>
  );
};

const ChangeLog = ({ open, week, onClose }: { open: boolean; week: string; onClose: () => void }) => {
  const { t, locale } = useI18n();
  const { data, error, isLoading } = useSWR<ShiftChange[]>(open ? `/schedule/periods/${week}/changes` : null, fetcher);
  return (
    <Drawer open={open} onClose={onClose} title={t("planning.changeLog")} subtitle={formatWeekRange(week, locale)}>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" />} title={t("planning.noChanges")} description={t("planning.noChangesHint")} />
      ) : (
        <ol className="relative space-y-5 border-l border-slate-200 pl-5 dark:border-slate-700">
          {data.map((change) => (
            <li key={change.id} className="relative">
              <span className={cx("absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-800", change.changeType === "REMOVED" ? "bg-red-500" : change.changeType === "ASSIGNED" ? "bg-emerald-500" : "bg-amber-500")} aria-hidden />
              <p className="text-sm text-slate-800 dark:text-slate-100">{change.description}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t(`changeType.${change.changeType}`)} · {change.changedByName ?? "—"} · {formatDateTime(change.changedAt, locale)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <Suspense>
      <PlanningPage />
    </Suspense>
  </RequireRole>
);

export default Page;
