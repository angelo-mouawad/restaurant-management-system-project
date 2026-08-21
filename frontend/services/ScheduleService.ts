import { apiFetch } from "@services/apiClient";
import { ScheduleItem } from "@types";

export const getScheduleItems = async (init?: RequestInit): Promise<ScheduleItem[]> =>
  apiFetch<ScheduleItem[]>("/scheduleItem", "Failed to fetch schedule items.", {
    method: "GET",
    ...init,
  });

export const assignUserToScheduleItem = async (
  scheduleItemId: number,
  userId: number
): Promise<ScheduleItem> =>
  apiFetch<ScheduleItem>(
    `/scheduleItem/${encodeURIComponent(scheduleItemId)}/assign/${encodeURIComponent(userId)}`,
    "Failed to assign user to schedule item.",
    { method: "POST" }
  );

export const removeUserFromScheduleItem = async (
  scheduleItemId: number
): Promise<ScheduleItem> =>
  apiFetch<ScheduleItem>(
    `/scheduleItem/${encodeURIComponent(scheduleItemId)}/unassign`,
    "Failed to remove user from schedule item.",
    { method: "POST" }
  );
