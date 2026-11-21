import { api } from "@services/apiClient";
import { Notification } from "@types";

export const markNotificationRead = (id: number) =>
  api<Notification>(`/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = () => api<{ updated: number }>("/notifications/read-all", { method: "POST" });
