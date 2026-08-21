import { apiFetch } from "@services/apiClient";
import { AuthenticatedUser, User } from "@types";

export const authenticate = async (
  username: string,
  password: string
): Promise<AuthenticatedUser> =>
  apiFetch<AuthenticatedUser>("/users/login", "Authentication failed.", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logoutUser = async (): Promise<void> => {
  await apiFetch<void>("/users/logout", "Logout failed.", { method: "POST" });
};

export const getUserById = async (id: string | number, init?: RequestInit): Promise<User> =>
  apiFetch<User>(`/users/${encodeURIComponent(id)}`, "Failed to fetch user.", {
    method: "GET",
    ...init,
  });

export const getAllUsers = async (init?: RequestInit): Promise<User[]> =>
  apiFetch<User[]>("/users", "Failed to fetch users.", { method: "GET", ...init });
