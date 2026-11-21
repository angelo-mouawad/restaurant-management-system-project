"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@components/ui/Button";
import { ConfirmDialog, Dialog } from "@components/ui/Dialog";
import { Alert } from "@components/ui/Feedback";
import { Field, Input, Select, Textarea } from "@components/ui/Form";
import { availabilityStyles } from "@components/schedule/availabilityStyles";
import { formatDay, isPast, shortTime, todayISO, weekStart } from "@lib/dates";
import { cx, formatHours } from "@lib/format";
import { ApiError } from "@services/apiClient";
import { assignShift, deleteShift, updateShift } from "@services/schedule";
import useI18n from "@hooks/useI18n";
import { Planning, Shift, ShiftInput } from "@types";

export type ShiftDraft = { shift?: Shift; userId?: number; date?: string; shiftTypeId?: number };

const CUSTOM = "custom";

/** Assign a new shift or edit an existing one, with availability and hours shown as context. */
const ShiftDialog = ({
  draft,
  planning,
  onClose,
  onSaved,
}: {
  draft: ShiftDraft | null;
  planning: Planning;
  onClose: () => void;
  onSaved: (message: string) => void;
}) => {
  const { t, locale } = useI18n();
  const editing = draft?.shift;
  const activeTypes = planning.shiftTypes.filter((type) => type.active || type.id === editing?.shiftTypeId);

  const [userId, setUserId] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [typeId, setTypeId] = useState<string>(CUSTOM);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const shift = draft.shift;
    const type = planning.shiftTypes.find((candidate) => candidate.id === (shift?.shiftTypeId ?? draft.shiftTypeId)) ??
      (shift ? undefined : activeTypes[0]);
    setUserId(shift?.userId ?? draft.userId ?? "");
    setDate(shift?.date ?? draft.date ?? todayISO());
    setTypeId(type ? String(type.id) : CUSTOM);
    setStart(shortTime(shift?.startTime ?? type?.startTime ?? "09:00"));
    setEnd(shortTime(shift?.endTime ?? type?.endTime ?? "17:00"));
    setNote(shift?.note ?? "");
    setError("");
    setWarnings([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const chooseType = (value: string) => {
    setTypeId(value);
    const type = planning.shiftTypes.find((candidate) => String(candidate.id) === value);
    if (type) {
      setStart(shortTime(type.startTime));
      setEnd(shortTime(type.endTime));
    }
  };

  const employee = planning.employees.find((candidate) => candidate.id === userId);
  const availability = planning.availability.find((entry) => entry.userId === userId && entry.date === date);
  const weekHours = useMemo(() => {
    if (!employee) return 0;
    return planning.shifts
      .filter((shift) => shift.userId === employee.id && weekStart(shift.date) === weekStart(date) && shift.id !== editing?.id)
      .reduce((sum, shift) => sum + shift.hours, 0);
  }, [planning.shifts, employee, date, editing]);

  const submit = async (force: boolean) => {
    if (userId === "") {
      setError(t("planning.pickEmployee"));
      return;
    }
    setSaving(true);
    setError("");
    const type = planning.shiftTypes.find((candidate) => String(candidate.id) === typeId);
    const customised = !type || shortTime(type.startTime) !== start || shortTime(type.endTime) !== end;
    const input: ShiftInput = {
      userId,
      date,
      shiftTypeId: type ? type.id : null,
      startTime: customised ? start : null,
      endTime: customised ? end : null,
      note: note.trim() || null,
      force,
    };
    try {
      if (editing) {
        await updateShift(editing.id, input);
        onSaved(t("planning.shiftUpdated"));
      } else {
        await assignShift(input);
        onSaved(t("planning.shiftAssigned"));
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "SHIFT_WARNINGS") {
        setWarnings(caught.details);
      } else {
        setError(caught instanceof Error ? caught.message : t("errors.generic"));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteShift(editing.id);
      setConfirmDelete(false);
      onSaved(t("planning.shiftDeleted"));
    } catch (caught) {
      setConfirmDelete(false);
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !!editing && isPast(editing.date);

  return (
    <>
      <Dialog
        open={!!draft && !confirmDelete}
        onClose={onClose}
        title={editing ? t("planning.editShift") : t("planning.assignShift")}
        description={editing?.periodStatus === "PUBLISHED" ? t("planning.publishedNotice") : undefined}
        footer={
          warnings.length > 0 ? (
            <>
              <Button variant="secondary" onClick={() => setWarnings([])}>
                {t("planning.goBack")}
              </Button>
              <Button onClick={() => submit(true)} loading={saving} icon={<AlertTriangle className="h-4 w-4" />}>
                {t("planning.saveAnyway")}
              </Button>
            </>
          ) : (
            <>
              {editing && !readOnly && (
                <Button variant="dangerGhost" className="sm:mr-auto" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
                  {t("planning.removeShift")}
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              {!readOnly && (
                <Button onClick={() => submit(false)} loading={saving}>
                  {editing ? t("common.save") : t("planning.assign")}
                </Button>
              )}
            </>
          )
        }
      >
        {warnings.length > 0 ? (
          <Alert tone="warning" title={t("planning.checkFirst")}>
            <ul className="list-disc space-y-1 pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <fieldset disabled={readOnly} className="space-y-4">
            {readOnly && <Alert tone="info">{t("planning.pastShift")}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("planning.employee")} required>
                <Select value={userId} onChange={(event) => setUserId(event.target.value ? Number(event.target.value) : "")}>
                  <option value="">{t("planning.pickEmployee")}</option>
                  {planning.employees.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                      {candidate.position ? ` · ${candidate.position}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("planning.date")} required>
                <Input type="date" value={date} min={todayISO()} onChange={(event) => setDate(event.target.value)} />
              </Field>
            </div>

            {employee && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className={cx("h-2.5 w-2.5 rounded-full", availabilityStyles[availability?.status ?? "NONE"].dot)} aria-hidden />
                  {formatDay(date, locale)}: {t(`availabilityStatus.${availability?.status ?? "NONE"}`)}
                  {availability?.startTime && ` (${shortTime(availability.startTime)}–${shortTime(availability.endTime)})`}
                  {availability?.note && ` · "${availability.note}"`}
                </span>
                <span>
                  {t("planning.hoursThatWeek", { hours: formatHours(weekHours, locale), max: employee.maxWeeklyHours })}
                </span>
              </div>
            )}

            <Field label={t("planning.shiftType")}>
              <Select value={typeId} onChange={(event) => chooseType(event.target.value)}>
                {activeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({shortTime(type.startTime)}–{shortTime(type.endTime)})
                  </option>
                ))}
                <option value={CUSTOM}>{t("planning.customTimes")}</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("planning.start")}>
                <Input type="time" value={start} step={900} onChange={(event) => setStart(event.target.value)} />
              </Field>
              <Field label={t("planning.end")} hint={end <= start ? t("planning.endsNextDay") : undefined}>
                <Input type="time" value={end} step={900} onChange={(event) => setEnd(event.target.value)} />
              </Field>
            </div>
            <Field label={t("planning.note")} hint={t("planning.noteHint")}>
              <Textarea rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
            {error && <Alert>{error}</Alert>}
          </fieldset>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title={t("planning.removeShiftTitle")}
        message={editing?.periodStatus === "PUBLISHED" ? t("planning.removeShiftPublished", { name: editing.userName }) : t("planning.removeShiftDraft")}
        confirmLabel={t("planning.removeShift")}
        loading={saving}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
};

export default ShiftDialog;
