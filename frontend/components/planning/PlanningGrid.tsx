"use client";

import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { shiftColorClasses } from "@components/ui/Badge";
import { availabilityStyles } from "@components/schedule/availabilityStyles";
import { Avatar } from "@components/ui/Layout";
import { JAVA_WEEKDAYS, daysBetween, formatDay, formatWeekday, isPast, shortTime, todayISO, weekStart, weekdayIndex } from "@lib/dates";
import { cx, formatHours } from "@lib/format";
import useI18n from "@hooks/useI18n";
import { Planning, PlanningWarning, Shift } from "@types";

/**
 * Employees down the side, days across the top. Each cell is tinted with that person's availability
 * and holds their shifts. Shifts can be dragged to another person or day; clicking an empty part of a
 * cell assigns a new one.
 */
const PlanningGrid = ({
  planning,
  from,
  to,
  compact,
  highlightUserId,
  onCellClick,
  onShiftClick,
  onShiftDrop,
}: {
  planning: Planning;
  from: string;
  to: string;
  compact: boolean;
  highlightUserId?: number;
  onCellClick: (userId: number, date: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDrop: (shift: Shift, userId: number, date: string) => void;
}) => {
  const { t, locale } = useI18n();
  const days = daysBetween(from, to);
  const today = todayISO();
  const [dragging, setDragging] = useState<Shift | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>();
    planning.shifts.forEach((shift) => {
      const key = `${shift.userId}|${shift.date}`;
      map.set(key, [...(map.get(key) ?? []), shift]);
    });
    return map;
  }, [planning.shifts]);

  const availabilityByCell = useMemo(
    () => new Map(planning.availability.map((entry) => [`${entry.userId}|${entry.date}`, entry])),
    [planning.availability]
  );

  const warningsByShift = useMemo(() => {
    const map = new Map<number, PlanningWarning[]>();
    planning.warnings.forEach((warning) => {
      if (warning.shiftId) map.set(warning.shiftId, [...(map.get(warning.shiftId) ?? []), warning]);
    });
    return map;
  }, [planning.warnings]);

  const activeTypes = planning.shiftTypes.filter((type) => type.active && type.minStaff > 0);

  const hoursFor = (employeeId: number) => {
    const weeks = Array.from(new Set(days.map(weekStart)));
    const hours = weeks.reduce((sum, week) => sum + (planning.employees.find((e) => e.id === employeeId)?.hoursByWeek[week] ?? 0), 0);
    return { hours, weeks: weeks.length };
  };

  const column = compact ? "minmax(3.25rem,1fr)" : "minmax(8.5rem,1fr)";
  const gridTemplate = { gridTemplateColumns: `minmax(11rem,14rem) repeat(${days.length}, ${column})` };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" role="grid" aria-label={t("planning.gridLabel")}>
        {/* Day headers */}
        <div className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" style={gridTemplate} role="row">
          <div className="sticky left-0 z-10 flex items-end bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400" role="columnheader">
            {t("planning.employee")}
          </div>
          {days.map((day) => (
            <div
              key={day}
              role="columnheader"
              className={cx(
                "border-l border-slate-200 px-2 py-2 text-center dark:border-slate-700",
                weekStart(day) === day && compact && "border-l-2 border-l-slate-300 dark:border-l-slate-600",
                day === today && "bg-teal-50 dark:bg-teal-500/10"
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {formatWeekday(day, locale, compact ? "narrow" : "short")}
              </div>
              <div className={cx("text-sm font-semibold tabular-nums", day === today ? "text-teal-700 dark:text-teal-300" : "text-slate-800 dark:text-slate-100")}>
                {compact ? Number(day.slice(8)) : formatDay(day, locale, { day: "numeric", month: "short" })}
              </div>
            </div>
          ))}
        </div>

        {/* One row per employee */}
        {planning.employees.map((employee) => {
          const { hours, weeks } = hoursFor(employee.id);
          const max = employee.maxWeeklyHours * weeks;
          const over = planning.warnings.some((warning) => warning.type === "OVER_HOURS" && warning.userId === employee.id && days.includes(warning.date));
          return (
            <div
              key={employee.id}
              role="row"
              className={cx(
                "grid border-b border-slate-100 dark:border-slate-700",
                highlightUserId === employee.id && "bg-amber-50/60 dark:bg-amber-500/5"
              )}
              style={gridTemplate}
            >
              <div className="sticky left-0 z-[5] flex items-center gap-2.5 border-r border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800" role="rowheader">
                <Avatar name={employee.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${employee.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline dark:text-slate-100">
                    {employee.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden>
                      <div className={cx("h-full rounded-full", over ? "bg-red-500" : "bg-teal-500")} style={{ width: `${Math.min(100, (hours / Math.max(max, 1)) * 100)}%` }} />
                    </div>
                    <span className={cx("text-xs tabular-nums", over ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
                      {formatHours(hours, locale)} / {max} h
                    </span>
                  </div>
                </div>
              </div>

              {days.map((day) => {
                const key = `${employee.id}|${day}`;
                const shifts = shiftsByCell.get(key) ?? [];
                const availability = availabilityByCell.get(key);
                const past = isPast(day);
                const label = `${employee.name}, ${formatDay(day, locale)}: ${t(`availabilityStatus.${availability?.status ?? "NONE"}`)}`;
                return (
                  <div
                    key={day}
                    role="gridcell"
                    aria-label={label}
                    onDragOver={(event) => {
                      if (!dragging || past) return;
                      event.preventDefault();
                      setDropTarget(key);
                    }}
                    onDragLeave={() => setDropTarget((current) => (current === key ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDropTarget(null);
                      if (dragging && !past && (dragging.userId !== employee.id || dragging.date !== day)) {
                        onShiftDrop(dragging, employee.id, day);
                      }
                      setDragging(null);
                    }}
                    className={cx(
                      "group relative border-l border-slate-100 p-1 dark:border-slate-700",
                      compact ? "min-h-[3rem]" : "min-h-[4.25rem]",
                      availabilityStyles[availability?.status ?? "NONE"].cell,
                      weekStart(day) === day && compact && "border-l-2 border-l-slate-300 dark:border-l-slate-600",
                      past && "opacity-60",
                      dropTarget === key && "ring-2 ring-inset ring-teal-500"
                    )}
                  >
                    {!compact && availability?.startTime && (
                      <div className={cx("px-1 text-[10px] font-medium tabular-nums", availabilityStyles[availability.status].text)}>
                        {shortTime(availability.startTime)}–{shortTime(availability.endTime)}
                      </div>
                    )}
                    <div className="space-y-1">
                      {shifts.map((shift) => {
                        const problems = warningsByShift.get(shift.id) ?? [];
                        const severe = problems.some((problem) => problem.severity === "ERROR");
                        const palette = shiftColorClasses[shift.color] ?? shiftColorClasses.slate;
                        return (
                          <button
                            key={shift.id}
                            type="button"
                            draggable={!past}
                            onDragStart={(event) => {
                              setDragging(shift);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(shift.id));
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setDropTarget(null);
                            }}
                            onClick={() => onShiftClick(shift)}
                            title={[`${shift.shiftTypeName} ${shortTime(shift.startTime)}–${shortTime(shift.endTime)}`, ...problems.map((p) => p.message)].join("\n")}
                            className={cx(
                              "flex w-full items-center gap-1 rounded-md text-left text-xs shadow-sm ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                              compact ? "justify-center px-1 py-1" : "px-1.5 py-1",
                              palette.chip,
                              "ring-black/5",
                              severe && "ring-2 ring-red-500",
                              !past && "cursor-grab active:cursor-grabbing",
                              shift.periodStatus === "DRAFT" && "opacity-90"
                            )}
                          >
                            {severe && <AlertCircle className="h-3 w-3 shrink-0" aria-label={t("planning.hasConflict")} />}
                            {compact ? (
                              <span className="font-semibold">{shift.shiftTypeName.charAt(0)}</span>
                            ) : (
                              <span className="min-w-0 truncate">
                                <span className="font-semibold">{shift.shiftTypeName}</span>{" "}
                                <span className="tabular-nums opacity-90">
                                  {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
                                </span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!past && (
                      <button
                        type="button"
                        onClick={() => onCellClick(employee.id, day)}
                        aria-label={t("planning.assignFor", { name: employee.name, day: formatDay(day, locale) })}
                        className={cx(
                          "mt-1 flex w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 opacity-0 transition hover:border-teal-500 hover:text-teal-600 focus-visible:opacity-100 group-hover:opacity-100 dark:border-slate-600",
                          compact ? "h-5" : "h-6",
                          "[@media(hover:none)]:opacity-100"
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Staffing per shift type */}
        {activeTypes.map((type) => (
          <div key={type.id} className="grid border-b border-slate-100 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40" style={gridTemplate} role="row">
            <div className="sticky left-0 z-[5] flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" role="rowheader">
              <span className={cx("h-2 w-2 rounded-full", (shiftColorClasses[type.color] ?? shiftColorClasses.slate).dot)} aria-hidden />
              {t("planning.staffing", { name: type.name })}
            </div>
            {days.map((day) => {
              const count = planning.shifts.filter((shift) => shift.date === day && shift.shiftTypeId === type.id).length;
              const runs = type.days.includes(JAVA_WEEKDAYS[weekdayIndex(day)]);
              const short = runs && count < type.minStaff;
              if (!runs && count === 0) {
                return (
                  <div key={day} role="gridcell" aria-label={t("planning.notRunning")} className={cx("border-l border-slate-100 py-1.5 text-center text-xs text-slate-300 dark:border-slate-700 dark:text-slate-600", weekStart(day) === day && compact && "border-l-2 border-l-slate-300 dark:border-l-slate-600")}>
                    —
                  </div>
                );
              }
              return (
                <div
                  key={day}
                  role="gridcell"
                  className={cx(
                    "border-l border-slate-100 py-1.5 text-center text-xs tabular-nums dark:border-slate-700",
                    weekStart(day) === day && compact && "border-l-2 border-l-slate-300 dark:border-l-slate-600",
                    short && !isPast(day) ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {runs ? `${count}/${type.minStaff}` : count}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanningGrid;
