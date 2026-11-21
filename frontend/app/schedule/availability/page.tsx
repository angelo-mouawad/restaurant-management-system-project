"use client";

import { CalendarPlus, Copy, Lock, Repeat, X } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import PeriodNavigator from "@components/schedule/PeriodNavigator";
import ScheduleTabs from "@components/schedule/ScheduleTabs";
import { availabilityStyles } from "@components/schedule/availabilityStyles";
import { Button } from "@components/ui/Button";
import { Card, CardBody, CardHeader } from "@components/ui/Card";
import { Dialog } from "@components/ui/Dialog";
import { Alert, ErrorState, Skeleton } from "@components/ui/Feedback";
import { Field, Input, Segmented, Select, Textarea } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import {
  JAVA_WEEKDAYS,
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  formatWeekRange,
  formatWeekday,
  monthEnd,
  monthGrid,
  monthStart,
  shortTime,
  todayISO,
  weekStart,
} from "@lib/dates";
import { cx } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { copyAvailabilityWeek, saveMyAvailability, setRecurringAvailability } from "@services/schedule";
import useI18n from "@hooks/useI18n";
import { Availability, AvailabilityStatus, BulkResult, MyAvailability } from "@types";

type Choice = AvailabilityStatus | "CLEAR";
const MAX_AHEAD_DAYS = 180;

const AvailabilityPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const today = todayISO();
  const lastDay = addDays(today, MAX_AHEAD_DAYS);
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState<string[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const grid = monthGrid(month);
  const range = { from: grid[0][0], to: grid[grid.length - 1][6] };
  const { data, error, isLoading, mutate } = useSWR<MyAvailability>(["/availability/me", range], fetcher);

  const byDate = useMemo(() => new Map((data?.entries ?? []).map((entry) => [entry.date, entry])), [data]);
  const locked = useMemo(() => new Set(data?.lockedWeeks ?? []), [data]);
  const editable = (day: string) => day >= today && day <= lastDay && !locked.has(weekStart(day));

  const toggle = (day: string) => {
    if (!editable(day)) return;
    setSelected((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  };

  const toggleWeek = (week: string[]) => {
    const days = week.filter(editable);
    const allSelected = days.every((day) => selected.includes(day));
    setSelected((current) =>
      allSelected ? current.filter((day) => !days.includes(day)) : Array.from(new Set([...current, ...days])).sort()
    );
  };

  const afterSave = async (result: BulkResult) => {
    await mutate();
    if (result.skippedLockedWeeks.length > 0) {
      notify(t("availability.skippedLocked", { count: result.skippedLockedWeeks.length }), "error");
    } else {
      notify(t("availability.saved"));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("availability.title")}
        description={t("availability.description")}
        actions={
          <>
            <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => setCopyOpen(true)}>
              {t("availability.copyWeek")}
            </Button>
            <Button variant="secondary" icon={<Repeat className="h-4 w-4" />} onClick={() => setRecurringOpen(true)}>
              {t("availability.recurring")}
            </Button>
          </>
        }
      />
      <ScheduleTabs />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <PeriodNavigator
              label={formatMonth(month, locale)}
              onPrevious={() => setMonth(addMonths(month, -1))}
              onNext={() => setMonth(addMonths(month, 1))}
              onToday={() => setMonth(monthStart(today))}
            />
            <Legend />
          </div>

          {isLoading ? (
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          ) : error ? (
            <Card>
              <ErrorState error={error} onRetry={() => mutate()} />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <span />
                {grid[0].map((day) => (
                  <span key={day} className="py-2 text-center">
                    <span className="hidden sm:inline">{formatWeekday(day, locale)}</span>
                    <span className="sm:hidden">{formatWeekday(day, locale, "narrow")}</span>
                  </span>
                ))}
              </div>
              {grid.map((week) => {
                const isLocked = locked.has(week[0]);
                const canSelectWeek = week.some(editable);
                return (
                  <div key={week[0]} className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0 dark:border-slate-700">
                    <div className="flex items-center justify-center border-r border-slate-100 dark:border-slate-700">
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 text-slate-400" aria-label={t("availability.locked")} />
                      ) : canSelectWeek ? (
                        <button
                          type="button"
                          onClick={() => toggleWeek(week)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-slate-700"
                          aria-label={t("availability.selectWeek", { week: formatWeekRange(week[0], locale) })}
                          title={t("availability.selectWeekShort")}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {week.map((day) => (
                      <DayCell
                        key={day}
                        day={day}
                        entry={byDate.get(day)}
                        inMonth={day.slice(0, 7) === month.slice(0, 7)}
                        isToday={day === today}
                        editable={editable(day)}
                        locked={isLocked}
                        selected={selected.includes(day)}
                        onToggle={() => toggle(day)}
                      />
                    ))}
                  </div>
                );
              })}
            </Card>
          )}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("availability.howTo")}</p>
        </div>

        <Editor selected={selected} byDate={byDate} onClear={() => setSelected([])} onSaved={async (result) => { setSelected([]); await afterSave(result); }} />
      </div>

      <CopyWeekDialog open={copyOpen} onClose={() => setCopyOpen(false)} locked={locked} onSaved={afterSave} />
      <RecurringDialog open={recurringOpen} onClose={() => setRecurringOpen(false)} onSaved={afterSave} />
    </PageContainer>
  );
};

const Legend = () => {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
      {(["AVAILABLE", "PREFERRED", "UNAVAILABLE", "NONE"] as const).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cx("h-2.5 w-2.5 rounded-full", availabilityStyles[status].dot)} aria-hidden />
          {t(`availabilityStatus.${status}`)}
        </li>
      ))}
    </ul>
  );
};

const DayCell = ({
  day,
  entry,
  inMonth,
  isToday,
  editable,
  locked,
  selected,
  onToggle,
}: {
  day: string;
  entry?: Availability;
  inMonth: boolean;
  isToday: boolean;
  editable: boolean;
  locked: boolean;
  selected: boolean;
  onToggle: () => void;
}) => {
  const { t, locale } = useI18n();
  const style = availabilityStyles[entry?.status ?? "NONE"];
  const label = `${formatDay(day, locale, { weekday: "long", day: "numeric", month: "long" })}: ${t(`availabilityStatus.${entry?.status ?? "NONE"}`)}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!editable}
      aria-pressed={selected}
      aria-label={label}
      className={cx(
        "relative min-h-[4.75rem] border-r border-slate-100 p-1.5 text-left transition last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:border-slate-700 sm:min-h-[5.5rem] sm:p-2",
        style.cell,
        !inMonth && "opacity-50",
        !editable && "cursor-default",
        editable && !selected && "hover:ring-2 hover:ring-inset hover:ring-teal-300",
        selected && "ring-2 ring-inset ring-teal-600 dark:ring-teal-400",
        locked && "saturate-50"
      )}
    >
      <span className="flex items-center justify-between">
        <span
          className={cx(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            isToday ? "bg-teal-600 text-white" : day < todayISO() ? "text-slate-400" : "text-slate-700 dark:text-slate-200"
          )}
        >
          {Number(day.slice(8))}
        </span>
        {selected && <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden />}
      </span>
      {entry && (
        <span className={cx("mt-1 block text-[11px] font-medium leading-tight sm:text-xs", style.text)}>
          <span className="hidden sm:inline">{t(`availabilityStatus.${entry.status}`)}</span>
          {entry.startTime && (
            <span className="block tabular-nums opacity-90">
              {shortTime(entry.startTime)}–{shortTime(entry.endTime)}
            </span>
          )}
          {entry.note && <span className="mt-0.5 hidden truncate font-normal opacity-80 sm:block">{entry.note}</span>}
        </span>
      )}
    </button>
  );
};

const Editor = ({
  selected,
  byDate,
  onClear,
  onSaved,
}: {
  selected: string[];
  byDate: Map<string, Availability>;
  onClear: () => void;
  onSaved: (result: BulkResult) => Promise<void>;
}) => {
  const { t, locale } = useI18n();
  const [choice, setChoice] = useState<Choice>("AVAILABLE");
  const [wholeDay, setWholeDay] = useState(true);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("22:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const single = selected.length === 1 ? byDate.get(selected[0]) : undefined;

  const save = async () => {
    setError("");
    if (choice !== "CLEAR" && choice !== "UNAVAILABLE" && !wholeDay && start >= end) {
      setError(t("availability.timeOrder"));
      return;
    }
    setSaving(true);
    try {
      const result = await saveMyAvailability(
        selected.map((date) => ({
          date,
          status: choice === "CLEAR" ? null : choice,
          startTime: choice === "CLEAR" || choice === "UNAVAILABLE" || wholeDay ? null : start,
          endTime: choice === "CLEAR" || choice === "UNAVAILABLE" || wholeDay ? null : end,
          note: choice === "CLEAR" ? null : note.trim() || null,
        }))
      );
      setNote("");
      await onSaved(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader
        title={selected.length === 0 ? t("availability.editorTitle") : t("availability.daysSelected", { count: selected.length })}
        description={
          selected.length === 0
            ? t("availability.editorEmpty")
            : selected.length <= 3
              ? selected.map((day) => formatDay(day, locale)).join(", ")
              : `${formatDay(selected[0], locale)} – ${formatDay(selected[selected.length - 1], locale)}`
        }
        action={
          selected.length > 0 && (
            <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={onClear}>
              {t("availability.clearSelection")}
            </Button>
          )
        }
      />
      <CardBody className="space-y-4">
        {single && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
            {t("availability.currently")}: <strong>{t(`availabilityStatus.${single.status}`)}</strong>
            {single.startTime && ` · ${shortTime(single.startTime)}–${shortTime(single.endTime)}`}
            {single.note && ` · ${single.note}`}
          </p>
        )}
        <fieldset disabled={selected.length === 0} className="space-y-4 disabled:opacity-60">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t("availability.status")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["AVAILABLE", "PREFERRED", "UNAVAILABLE", "CLEAR"] as Choice[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChoice(option)}
                  aria-pressed={choice === option}
                  className={cx(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    choice === option
                      ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-100"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:text-slate-200"
                  )}
                >
                  <span className={cx("h-2.5 w-2.5 rounded-full", option === "CLEAR" ? availabilityStyles.NONE.dot : availabilityStyles[option].dot)} aria-hidden />
                  {option === "CLEAR" ? t("availability.clear") : t(`availabilityStatus.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {(choice === "AVAILABLE" || choice === "PREFERRED") && (
            <div className="space-y-3">
              <Segmented<"day" | "range">
                label={t("availability.hours")}
                value={wholeDay ? "day" : "range"}
                onChange={(value) => setWholeDay(value === "day")}
                options={[
                  { value: "day", label: t("availability.wholeDay") },
                  { value: "range", label: t("availability.between") },
                ]}
              />
              {!wholeDay && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("availability.from")}>
                    <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} step={900} />
                  </Field>
                  <Field label={t("availability.until")}>
                    <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} step={900} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {choice !== "CLEAR" && (
            <Field label={t("availability.note")} hint={t("availability.noteHint")}>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} />
            </Field>
          )}

          {error && <Alert>{error}</Alert>}
          <Button className="w-full" loading={saving} onClick={save} disabled={selected.length === 0}>
            {selected.length === 0 ? t("availability.selectDaysFirst") : t("availability.saveDays", { count: selected.length })}
          </Button>
        </fieldset>
      </CardBody>
    </Card>
  );
};

const CopyWeekDialog = ({
  open,
  onClose,
  locked,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  locked: Set<string>;
  onSaved: (result: BulkResult) => Promise<void>;
}) => {
  const { t, locale } = useI18n();
  const thisWeek = weekStart(todayISO());
  const weeks = Array.from({ length: 10 }, (_, index) => addDays(thisWeek, index * 7));
  const [source, setSource] = useState(thisWeek);
  const [targets, setTargets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await copyAvailabilityWeek(source, targets);
      setTargets([]);
      onClose();
      await onSaved(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("availability.copyTitle")}
      description={t("availability.copyDescription")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={saving} disabled={targets.length === 0}>
            {t("availability.copyTo", { count: targets.length })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("availability.copyFrom")}>
          <Select value={source} onChange={(event) => { setSource(event.target.value); setTargets((current) => current.filter((week) => week !== event.target.value)); }}>
            {weeks.map((week) => (
              <option key={week} value={week}>
                {formatWeekRange(week, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t("availability.copyTargets")}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {weeks.filter((week) => week !== source).map((week) => {
              const isLocked = locked.has(week);
              return (
                <label key={week} className={cx("flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600", isLocked && "opacity-50")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    disabled={isLocked}
                    checked={targets.includes(week)}
                    onChange={(event) => setTargets((current) => (event.target.checked ? [...current, week] : current.filter((w) => w !== week)))}
                  />
                  <span className="flex-1">{formatWeekRange(week, locale)}</span>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label={t("availability.locked")} />}
                </label>
              );
            })}
          </div>
        </fieldset>
        {error && <Alert>{error}</Alert>}
      </div>
    </Dialog>
  );
};

type PatternRow = { status: AvailabilityStatus | "SKIP"; start: string; end: string };

const RecurringDialog = ({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (result: BulkResult) => Promise<void>;
}) => {
  const { t, locale } = useI18n();
  const today = todayISO();
  const [from, setFrom] = useState(addDays(weekStart(today), 7));
  const [to, setTo] = useState(monthEnd(addMonths(today, 2)));
  const [rows, setRows] = useState<PatternRow[]>(
    JAVA_WEEKDAYS.map((_, index) => ({ status: index < 5 ? "AVAILABLE" : "SKIP", start: "", end: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const referenceWeek = weekStart(today);

  const update = (index: number, patch: Partial<PatternRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async () => {
    setError("");
    const pattern = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status !== "SKIP")
      .map(({ row, index }) => ({
        dayOfWeek: JAVA_WEEKDAYS[index],
        status: row.status as AvailabilityStatus,
        startTime: row.status !== "UNAVAILABLE" && row.start && row.end ? row.start : null,
        endTime: row.status !== "UNAVAILABLE" && row.start && row.end ? row.end : null,
      }));
    if (pattern.length === 0) {
      setError(t("availability.patternEmpty"));
      return;
    }
    setSaving(true);
    try {
      const result = await setRecurringAvailability(from, to, pattern);
      onClose();
      await onSaved(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t("availability.recurringTitle")}
      description={t("availability.recurringDescription")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={saving}>
            {t("availability.applyPattern")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("availability.patternFrom")}>
            <Input type="date" value={from} min={today} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label={t("availability.patternTo")}>
            <Input type="date" value={to} min={from} max={addDays(today, MAX_AHEAD_DAYS)} onChange={(event) => setTo(event.target.value)} />
          </Field>
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {rows.map((row, index) => (
            <div key={JAVA_WEEKDAYS[index]} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[7rem_1fr_auto]">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatWeekday(addDays(referenceWeek, index), locale, "long")}</span>
              <Select aria-label={t("availability.status")} value={row.status} onChange={(event) => update(index, { status: event.target.value as PatternRow["status"] })}>
                <option value="SKIP">{t("availability.leaveAsIs")}</option>
                <option value="AVAILABLE">{t("availabilityStatus.AVAILABLE")}</option>
                <option value="PREFERRED">{t("availabilityStatus.PREFERRED")}</option>
                <option value="UNAVAILABLE">{t("availabilityStatus.UNAVAILABLE")}</option>
              </Select>
              <div className={cx("flex items-center gap-1.5", (row.status === "SKIP" || row.status === "UNAVAILABLE") && "invisible")}>
                <Input type="time" aria-label={t("availability.from")} className="w-28" value={row.start} onChange={(event) => update(index, { start: event.target.value })} />
                <span className="text-slate-400">–</span>
                <Input type="time" aria-label={t("availability.until")} className="w-28" value={row.end} onChange={(event) => update(index, { end: event.target.value })} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("availability.patternHint")}</p>
        {error && <Alert>{error}</Alert>}
      </div>
    </Dialog>
  );
};

const Page = () => (
  <RequireRole roles={["EMPLOYEE"]}>
    <AvailabilityPage />
  </RequireRole>
);

export default Page;
