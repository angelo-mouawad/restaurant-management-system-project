"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@services/UserService";
import { AuthContextType, AuthenticatedUser } from "@types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "loggedInUser";

const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.username === "string" && typeof candidate.role === "string";
};

const readStoredUser = (): AuthenticatedUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    if (isAuthenticatedUser(parsed)) {
      return parsed;
    }
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
};

const writeStoredUser = (user: AuthenticatedUser | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (user) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    return;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);
  }, []);

  const login = useCallback((userData: AuthenticatedUser) => {
    writeStoredUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      writeStoredUser(null);
    }

    writeStoredUser(null);
    setUser(null);
    router.replace("/");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
