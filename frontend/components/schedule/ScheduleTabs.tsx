"use client";

import { CalendarDays, CalendarRange, LayoutGrid, Settings2 } from "lucide-react";
import { TabNav } from "@components/ui/Layout";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";

const ScheduleTabs = () => {
  const { isManagement } = useAuth();
  const { t } = useI18n();
  return (
    <TabNav
      tabs={
        isManagement
          ? [
              { href: "/schedule/planning", label: t("nav.planning"), icon: <LayoutGrid className="h-4 w-4" aria-hidden /> },
              { href: "/schedule/shift-types", label: t("nav.shiftTypes"), icon: <Settings2 className="h-4 w-4" aria-hidden /> },
            ]
          : [
              { href: "/schedule/my", label: t("nav.mySchedule"), icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
              { href: "/schedule/availability", label: t("nav.availability"), icon: <CalendarRange className="h-4 w-4" aria-hidden /> },
            ]
      }
    />
  );
};

export default ScheduleTabs;
