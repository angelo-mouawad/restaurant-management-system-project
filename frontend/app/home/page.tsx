"use client";

import RequireRole from "@components/layout/RequireRole";
import EmployeeDashboard from "@components/dashboard/EmployeeDashboard";
import ManagerDashboard from "@components/dashboard/ManagerDashboard";
import useAuth from "@hooks/useAuth";

const HomePage = () => {
  const { isManagement } = useAuth();
  return <RequireRole>{isManagement ? <ManagerDashboard /> : <EmployeeDashboard />}</RequireRole>;
};

export default HomePage;
