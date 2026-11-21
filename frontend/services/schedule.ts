import { api } from "@services/apiClient";
import { AvailabilityEntry, AvailabilityStatus, BulkResult, Period, Shift, ShiftInput, ShiftType } from "@types";

export const saveMyAvailability = (entries: AvailabilityEntry[]) =>
  api<BulkResult>("/availability/me", { method: "PUT", body: { entries } });

export const copyAvailabilityWeek = (sourceWeekStart: string, targetWeekStarts: string[]) =>
  api<BulkResult>("/availability/me/copy-week", { method: "POST", body: { sourceWeekStart, targetWeekStarts } });

export type RecurringDay = {
  dayOfWeek: string;
  status: AvailabilityStatus;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

export const setRecurringAvailability = (from: string, to: string, pattern: RecurringDay[]) =>
  api<BulkResult>("/availability/me/recurring", { method: "POST", body: { from, to, pattern } });

export const assignShift = (input: ShiftInput) => api<Shift>("/schedule/shifts", { method: "POST", body: input });

export const updateShift = (id: number, input: ShiftInput) =>
  api<Shift>(`/schedule/shifts/${id}`, { method: "PUT", body: input });

export const deleteShift = (id: number) => api<void>(`/schedule/shifts/${id}`, { method: "DELETE" });

export const publishWeek = (weekStart: string) =>
  api<Period>(`/schedule/periods/${weekStart}/publish`, { method: "POST" });

export const setWeekLock = (weekStart: string, locked: boolean) =>
  api<Period>(`/schedule/periods/${weekStart}/${locked ? "lock" : "unlock"}`, { method: "POST" });

export type ShiftTypeInput = Omit<ShiftType, "id" | "hours">;

export const createShiftType = (input: ShiftTypeInput) => api<ShiftType>("/shift-types", { method: "POST", body: input });

export const updateShiftType = (id: number, input: ShiftTypeInput) =>
  api<ShiftType>(`/shift-types/${id}`, { method: "PUT", body: input });

export const deleteShiftType = (id: number) => api<void>(`/shift-types/${id}`, { method: "DELETE" });
