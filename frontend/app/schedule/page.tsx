"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RequireRole from "@components/layout/RequireRole";
import useAuth from "@hooks/useAuth";

/** Sends each role to its own part of the schedule. */
const SchedulePage = () => {
  const { user, isManagement } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(isManagement ? "/schedule/planning" : "/schedule/my");
  }, [user, isManagement, router]);
  return <RequireRole>{null}</RequireRole>;
};

export default SchedulePage;
