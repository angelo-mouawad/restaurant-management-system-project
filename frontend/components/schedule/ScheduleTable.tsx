"use client";

import React from "react";
import { ScheduleItem } from "@types";
import useI18n from "@hooks/useI18n";

type Props = {
  items: ScheduleItem[];
  onOpenModal?: (index: number) => void;
  onRemove?: (index: number) => void;
  showRemove?: boolean;
  showActions?: boolean;
};

const ScheduleTable: React.FC<Props> = ({
  items,
  onOpenModal,
  onRemove,
  showRemove = false,
  showActions = true,
}) => {
  const { t } = useI18n();
  const columnWidth = showActions ? "w-1/4" : "w-1/3";

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <table className="min-w-full table-fixed border-collapse">
        <thead className="bg-teal-500 text-white dark:bg-teal-600">
          <tr>
            <th className={`${columnWidth} px-4 py-3 text-left`}>{t("schedule.table.day")}</th>
            <th className={`${columnWidth} px-4 py-3 text-center`}>{t("schedule.table.shift")}</th>
            <th className={`${columnWidth} px-4 py-3 text-center`}>{t("schedule.table.name")}</th>
            {showActions && (
              <th className="w-1/4 px-4 py-3 text-right">{t("schedule.table.actions")}</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-gray-50 text-slate-800 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-100">
          {items.map((item, index) => {
            const displayName = item.user?.name || item.name || "";
            const isAssigned = Boolean(displayName || item.userId);

            return (
              <tr
                key={item.id}
                className="border-t border-gray-200 transition hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                <td className="px-4 py-2 text-left font-medium text-gray-700 dark:text-slate-100">
                  {item.day}
                </td>
                <td className="px-4 py-2 text-center text-gray-600 dark:text-slate-200">
                  {item.shift}
                </td>
                <td className="px-4 py-2 text-center text-gray-700 dark:text-slate-100">
                  {displayName}
                </td>
                {showActions && (
                  <td className="px-4 py-2 text-right">
                    {showRemove && isAssigned ? (
                      <button
                        type="button"
                        onClick={() => onRemove?.(index)}
                        className="rounded-md bg-red-500 px-3 py-1 text-sm text-white transition hover:bg-red-600"
                      >
                        {t("schedule.table.remove")}
                      </button>
                    ) : !isAssigned ? (
                      <button
                        type="button"
                        onClick={() => onOpenModal?.(index)}
                        className="rounded-md bg-teal-500 px-3 py-1 text-sm text-white transition hover:bg-teal-600"
                      >
                        {t("schedule.table.assign")}
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
