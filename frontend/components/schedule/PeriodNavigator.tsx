"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { Button } from "@components/ui/Button";
import useI18n from "@hooks/useI18n";

/** Previous / today / next with a label for the period on screen. */
const PeriodNavigator = ({
  label,
  onPrevious,
  onNext,
  onToday,
}: {
  label: React.ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
        <Button variant="ghost" size="sm" className="rounded-r-none" aria-label={t("common.previous")} onClick={onPrevious} icon={<ChevronLeft className="h-4 w-4" />} />
        <Button variant="ghost" size="sm" className="rounded-none border-x border-slate-300 dark:border-slate-600" onClick={onToday}>
          {t("common.today")}
        </Button>
        <Button variant="ghost" size="sm" className="rounded-l-none" aria-label={t("common.next")} onClick={onNext} icon={<ChevronRight className="h-4 w-4" />} />
      </div>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
    </div>
  );
};

export default PeriodNavigator;
