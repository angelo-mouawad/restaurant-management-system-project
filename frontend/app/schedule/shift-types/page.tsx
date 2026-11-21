"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import ScheduleTabs from "@components/schedule/ScheduleTabs";
import { Badge, shiftColorClasses } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { DataTable } from "@components/ui/DataTable";
import { ConfirmDialog, Dialog } from "@components/ui/Dialog";
import { Alert, EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { Field, Input } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { JAVA_WEEKDAYS, addDays, formatWeekday, shortTime, todayISO, weekStart } from "@lib/dates";
import { cx, formatHours } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { createShiftType, deleteShiftType, updateShiftType } from "@services/schedule";
import useI18n from "@hooks/useI18n";
import { ShiftColor, ShiftType } from "@types";

const ALL_DAYS = JAVA_WEEKDAYS;

const COLORS: ShiftColor[] = ["teal", "amber", "indigo", "rose", "sky", "slate"];

const ShiftTypesPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { data, error, isLoading, mutate } = useSWR<ShiftType[]>("/shift-types", fetcher);
  const [editing, setEditing] = useState<ShiftType | "new" | null>(null);
  const [deleting, setDeleting] = useState<ShiftType | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteShiftType(deleting.id);
      await mutate();
      notify(t("shiftTypes.deleted"));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("shiftTypes.title")}
        description={t("shiftTypes.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("shiftTypes.add")}
          </Button>
        }
      />
      <ScheduleTabs />
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <DataTable
            rows={data ?? []}
            rowKey={(row) => row.id}
            empty={<EmptyState title={t("shiftTypes.empty")} />}
            columns={[
              {
                key: "name",
                header: t("shiftTypes.name"),
                sortValue: (row) => row.name,
                cell: (row) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <span className={cx("h-2.5 w-2.5 rounded-full", shiftColorClasses[row.color]?.dot)} aria-hidden />
                    {row.name}
                  </span>
                ),
              },
              { key: "time", header: t("shiftTypes.time"), sortValue: (row) => row.startTime, cell: (row) => <span className="tabular-nums">{shortTime(row.startTime)}–{shortTime(row.endTime)}</span> },
              { key: "hours", header: t("shiftTypes.length"), align: "right", sortValue: (row) => row.hours, cell: (row) => formatHours(row.hours, locale), hideBelow: "sm" },
              { key: "days", header: t("shiftTypes.days"), cell: (row) => <DaysLabel days={row.days} />, hideBelow: "md" },
              { key: "staff", header: t("shiftTypes.minStaff"), align: "right", sortValue: (row) => row.minStaff, cell: (row) => row.minStaff },
              {
                key: "status",
                header: t("shiftTypes.status"),
                sortValue: (row) => row.active,
                cell: (row) => <Badge tone={row.active ? "green" : "neutral"}>{row.active ? t("common.active") : t("common.inactive")}</Badge>,
                hideBelow: "sm",
              },
              {
                key: "actions",
                header: "",
                align: "right",
                cell: (row) => (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={t("common.edit")} icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(row)} />
                    <Button variant="dangerGhost" size="sm" aria-label={t("common.delete")} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(row)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <ShiftTypeDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await mutate();
          notify(t("shiftTypes.saved"));
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t("shiftTypes.deleteTitle", { name: deleting?.name ?? "" })}
        message={t("shiftTypes.deleteMessage")}
        confirmLabel={t("common.delete")}
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
};

const ShiftTypeDialog = ({ value, onClose, onSaved }: { value: ShiftType | "new" | null; onClose: () => void; onSaved: () => void }) => {
  const { t, locale } = useI18n();
  const existing = value && value !== "new" ? value : null;
  const [form, setForm] = useState({ name: "", startTime: "09:00", endTime: "15:00", minStaff: 1, color: "teal" as ShiftColor, active: true, days: ALL_DAYS });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastValue, setLastValue] = useState<typeof value>(null);

  if (value !== lastValue) {
    setLastValue(value);
    setError("");
    setForm(
      existing
        ? { name: existing.name, startTime: shortTime(existing.startTime), endTime: shortTime(existing.endTime), minStaff: existing.minStaff, color: existing.color, active: existing.active, days: existing.days }
        : { name: "", startTime: "09:00", endTime: "15:00", minStaff: 1, color: "teal", active: true, days: ALL_DAYS }
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("shiftTypes.nameRequired"));
      return;
    }
    if (form.days.length === 0) {
      setError(t("shiftTypes.daysRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (existing) await updateShiftType(existing.id, form);
      else await createShiftType(form);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!value}
      onClose={onClose}
      title={existing ? t("shiftTypes.edit") : t("shiftTypes.add")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="shift-type-form" loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="shift-type-form" onSubmit={submit} className="space-y-4">
        <Field label={t("shiftTypes.name")} required>
          <Input value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("planning.start")} required>
            <Input type="time" step={900} value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          </Field>
          <Field label={t("planning.end")} required hint={form.endTime <= form.startTime ? t("planning.endsNextDay") : undefined}>
            <Input type="time" step={900} value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </Field>
        </div>
        <Field label={t("shiftTypes.minStaff")} hint={t("shiftTypes.minStaffHint")}>
          <Input type="number" min={0} max={50} value={form.minStaff} onChange={(event) => setForm({ ...form, minStaff: Number(event.target.value) })} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t("shiftTypes.days")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((day, index) => {
              const on = form.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setForm({ ...form, days: on ? form.days.filter((d) => d !== day) : ALL_DAYS.filter((d) => d === day || form.days.includes(d)) })}
                  className={cx(
                    "h-9 min-w-[3rem] rounded-lg border px-2 text-sm font-medium transition-colors",
                    on ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-100" : "border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                  )}
                >
                  {formatWeekday(addDays(weekStart(todayISO()), index), locale)}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("shiftTypes.daysHint")}</p>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t("shiftTypes.color")}</legend>
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm({ ...form, color })}
                aria-pressed={form.color === color}
                aria-label={t(`colors.${color}`)}
                className={cx(
                  "h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-800",
                  shiftColorClasses[color].dot,
                  form.color === color ? "ring-2 ring-slate-900 dark:ring-white" : "hover:ring-2 hover:ring-slate-300"
                )}
              />
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          {t("shiftTypes.activeLabel")}
        </label>
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

/** "Every day", "Mon–Fri", or the short names of the days. */
const DaysLabel = ({ days }: { days: string[] }) => {
  const { t, locale } = useI18n();
  if (days.length === 7) return <span>{t("shiftTypes.everyDay")}</span>;
  const monday = weekStart(todayISO());
  const name = (day: string) => formatWeekday(addDays(monday, ALL_DAYS.indexOf(day)), locale);
  const indexes = days.map((day) => ALL_DAYS.indexOf(day)).sort((a, b) => a - b);
  const consecutive = indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
  return <span>{consecutive && days.length > 2 ? `${name(ALL_DAYS[indexes[0]])}–${name(ALL_DAYS[indexes[indexes.length - 1]])}` : indexes.map((i) => name(ALL_DAYS[i])).join(", ")}</span>;
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <ShiftTypesPage />
  </RequireRole>
);

export default Page;
