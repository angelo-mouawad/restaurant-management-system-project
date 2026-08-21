"use client";

import React from "react";
import { StockItem } from "@types";
import useI18n from "@hooks/useI18n";

type Props = {
  items: StockItem[];
  onOpenModal?: (index: number | null, type: "add" | "remove" | "new") => void;
  showActions?: boolean;
};

const StockTable: React.FC<Props> = ({ items, onOpenModal, showActions = true }) => {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <table className="min-w-full table-fixed border-collapse">
        <thead className="bg-teal-500 text-white dark:bg-teal-600">
          <tr>
            <th className={`${showActions ? "w-1/3" : "w-1/2"} px-4 py-3 text-left`}>
              {t("stock.table.item")}
            </th>
            <th className={`${showActions ? "w-1/3" : "w-1/2"} px-4 py-3 text-center`}>
              {t("stock.table.quantity")}
            </th>
            {showActions && <th className="w-1/3 px-4 py-3 text-right">{t("stock.table.actions")}</th>}
          </tr>
        </thead>
        <tbody className="bg-gray-50 text-slate-800 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-100">
          {items.map((item, index) => (
            <tr
              key={item.id}
              className="border-t border-gray-200 transition hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <td className="px-4 py-2 text-left font-medium text-gray-700 dark:text-slate-100">
                {item.name}
              </td>
              <td className="px-4 py-2 text-center text-gray-600 dark:text-slate-200">
                {item.quantity}
              </td>
              {showActions && (
                <td className="space-x-2 px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenModal?.(index, "add")}
                    className="rounded-md bg-teal-500 px-3 py-1 text-sm text-white transition hover:bg-teal-600"
                  >
                    {t("stock.table.add")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal?.(index, "remove")}
                    className="rounded-md bg-red-500 px-3 py-1 text-sm text-white transition hover:bg-red-600"
                  >
                    {t("stock.table.remove")}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockTable;
