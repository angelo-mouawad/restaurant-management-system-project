import { apiFetch } from "@services/apiClient";
import { Notification } from "@types";

export const getNotificationsForUser = async (
  username: string,
  init?: RequestInit
): Promise<Notification[]> => {
  if (!username.trim()) {
    throw new Error("Username is required to fetch notifications.");
  }

  return apiFetch<Notification[]>(
    `/notifications/${encodeURIComponent(username)}`,
    "Failed to fetch notifications.",
    { method: "GET", ...init }
  );
};

export const createNotification = async (
  username: string,
  message: string,
  stockItemId: number | null
): Promise<Notification> => {
  if (!username.trim() || !message.trim()) {
    throw new Error("Username and message are required to create a notification.");
  }

  return apiFetch<Notification>("/notifications", "Failed to create notification.", {
    method: "POST",
    body: JSON.stringify({ username, message, stockItemId }),
  });
};
