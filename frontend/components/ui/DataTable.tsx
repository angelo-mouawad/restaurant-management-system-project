"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useMemo, useState } from "react";
import { cx } from "@lib/format";
import useI18n from "@hooks/useI18n";
import { Button } from "./Button";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting. Leave out to make the column unsortable. */
  sortValue?: (row: T) => string | number | boolean | null;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hidden below this breakpoint so tables stay readable on a phone. */
  hideBelow?: "sm" | "md" | "lg";
};

const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

/** Sortable, paginated table on the client. For server-paginated data use {@link Pagination} directly. */
export const DataTable = <T,>({
  rows,
  columns,
  rowKey,
  onRowClick,
  pageSize = 12,
  initialSort,
  empty,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  initialSort?: { key: string; direction: "asc" | "desc" };
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) => {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (left === right) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : left > right ? 1 : -1) * factor;
    });
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((previous) =>
      previous?.key === key ? { key, direction: previous.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
    );
  };

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-teal-600 text-left text-white dark:bg-teal-700">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : undefined}
                    className={cx(
                      "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide first:pl-5 last:pr-5",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.hideBelow && hide[column.hideBelow],
                      column.className
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cx(
                          "inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                          column.align === "right" && "flex-row-reverse"
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort!.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  "bg-white transition-colors dark:bg-slate-800",
                  onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50",
                  rowClassName?.(row)
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(
                      "px-4 py-3 align-middle text-slate-700 first:pl-5 last:pr-5 dark:text-slate-200",
                      column.align === "right" && "text-right tabular-nums",
                      column.align === "center" && "text-center",
                      column.hideBelow && hide[column.hideBelow],
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <Pagination page={current} pageCount={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPage} />
      )}
    </div>
  );
};

export const Pagination = ({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) => {
  const { t } = useI18n();
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <span>{t("common.showing", { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" aria-label={t("common.previous")} disabled={page === 0} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="h-4 w-4" />} />
        <span className="px-2 tabular-nums">
          {page + 1} / {pageCount}
        </span>
        <Button variant="ghost" size="sm" aria-label={t("common.next")} disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} icon={<ChevronRight className="h-4 w-4" />} />
      </div>
    </div>
  );
};
