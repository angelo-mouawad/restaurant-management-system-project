import { api } from "@services/apiClient";
import { Profile, Role, User } from "@types";

export type UserInput = {
  name: string;
  username?: string;
  password?: string;
  email: string | null;
  phone: string | null;
  role: Role;
  position: string | null;
  maxWeeklyHours: number | null;
  managerId: number | null;
};

export const login = (username: string, password: string) =>
  api<{ message: string; username: string }>("/auth/login", {
    method: "POST",
    body: { username, password },
    fallback: "Signing in failed. Please try again.",
  });

export const logout = () => api<void>("/auth/logout", { method: "POST" });

export const createUser = (input: UserInput) => api<User>("/users", { method: "POST", body: input });

export const updateUser = (id: number, input: UserInput) => api<User>(`/users/${id}`, { method: "PUT", body: input });

export const setUserActive = (id: number, active: boolean) =>
  api<User>(`/users/${id}/active`, { method: "PATCH", body: { active } });

export const deleteUser = (id: number) => api<void>(`/users/${id}`, { method: "DELETE" });

export const updateMyProfile = (input: { name: string; email: string | null; phone: string | null }) =>
  api<User>("/users/me", { method: "PUT", body: input });

export const changeMyPassword = (currentPassword: string, newPassword: string) =>
  api<void>("/users/me/password", { method: "PUT", body: { currentPassword, newPassword } });

export type { Profile };
