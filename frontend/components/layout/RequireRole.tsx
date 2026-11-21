"use client";

import React from "react";
import useAuth from "@hooks/useAuth";
import { Forbidden, Skeleton } from "@components/ui/Feedback";
import { PageContainer } from "@components/ui/Layout";
import { Role } from "@types";

/**
 * Renders the page only for the given roles. This is for a clear message in the browser; the API
 * refuses the same requests on its own.
 */
const RequireRole = ({ roles, children }: { roles?: Role[]; children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <PageContainer>
        <Skeleton className="mb-3 h-8 w-64" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageContainer>
    );
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <PageContainer>
        <Forbidden />
      </PageContainer>
    );
  }
  return <>{children}</>;
};

export default RequireRole;
