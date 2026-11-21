"use client";

import { useRouter } from "next/navigation";
import React, { createContext, useCallback, useEffect, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@services/apiClient";
import { logout as logoutRequest } from "@services/users";
import { Role, User } from "@types";

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isManagement: boolean;
  hasRole: (...roles: Role[]) => boolean;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The signed-in user always comes from the API (GET /auth/me), never from browser storage, so a
 * role change or deactivation shows up on the next load.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const { data, isLoading, mutate } = useSWR<User>("/auth/me", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: true,
  });

  const clear = useCallback(async () => {
    await mutate(undefined, { revalidate: false });
    // Drop every cached response so the next person to sign in on this browser sees nothing of the last.
    await globalMutate(() => true, undefined, { revalidate: false });
  }, [mutate, globalMutate]);

  useEffect(() => {
    const onSessionEnded = () => {
      void clear().then(() => {
        router.replace("/?session=ended");
      });
    };
    window.addEventListener("rms:session-ended", onSessionEnded);
    return () => window.removeEventListener("rms:session-ended", onSessionEnded);
  }, [clear, router]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      await clear();
      router.replace("/");
    }
  }, [clear, router]);

  const value = useMemo<AuthContextType>(() => {
    const user = data ?? null;
    return {
      user,
      isLoading,
      isManagement: user?.role === "ADMIN" || user?.role === "MANAGER",
      hasRole: (...roles: Role[]) => !!user && roles.includes(user.role),
      refresh: () => mutate(),
      logout,
    };
  }, [data, isLoading, mutate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
