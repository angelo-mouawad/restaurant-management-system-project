"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Boxes, ClipboardList, Euro, Plus } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import ItemDrawer from "@components/stock/ItemDrawer";
import ItemFormDialog from "@components/stock/ItemFormDialog";
import StockTabs from "@components/stock/StockTabs";
import { CATEGORIES } from "@components/stock/stockLabels";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card, Stat } from "@components/ui/Card";
import { DataTable } from "@components/ui/DataTable";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@components/ui/Feedback";
import { SearchInput, Select } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { cx, formatMoney, formatNumber } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useI18n from "@hooks/useI18n";
import { StockItem, StockOverview } from "@types";

const StockPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(params.get("low") === "1");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const openItem = params.get("item") ? Number(params.get("item")) : null;

  const overview = useSWR<StockOverview>("/stock/overview", fetcher);
  const items = useSWR<StockItem[]>(["/stock/items", { includeArchived: showArchived }], fetcher);

  const setItem = (id: number | null) => {
    const search = new URLSearchParams(params.toString());
    if (id) search.set("item", String(id));
    else search.delete("item");
    router.replace(`/stock${search.toString() ? `?${search}` : ""}`, { scroll: false });
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (items.data ?? []).filter(
      (item) =>
        (!query || item.name.toLowerCase().includes(query) || item.supplierName?.toLowerCase().includes(query)) &&
        (!category || item.category === category) &&
        (!lowOnly || item.low)
    );
  }, [items.data, search, category, lowOnly]);

  const refresh = () => {
    void items.mutate();
    void overview.mutate();
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("stock.title")}
        description={t("stock.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            {t("stock.newItem")}
          </Button>
        }
      />
      <StockTabs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.isLoading ? (
          [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
        ) : overview.data ? (
          <>
            <Stat label={t("stock.totalValue")} icon={<Euro className="h-4 w-4" />} value={formatMoney(overview.data.totalValue, locale)} hint={t("stock.acrossItems", { count: overview.data.itemCount })} />
            <Stat
              label={t("stock.lowItems")}
              icon={<AlertTriangle className="h-4 w-4" />}
              tone={overview.data.lowStockCount > 0 ? "warning" : "good"}
              value={overview.data.lowStockCount}
              hint={
                overview.data.lowStockCount > 0 ? (
                  <button type="button" className="font-medium text-teal-700 hover:underline dark:text-teal-300" onClick={() => setLowOnly(true)}>
                    {t("stock.showLow")}
                  </button>
                ) : (
                  t("stock.allAboveMinimum")
                )
              }
            />
            <Stat label={t("stock.openOrders")} icon={<ClipboardList className="h-4 w-4" />} value={overview.data.openOrderCount} hint={t("stock.draftOrOrdered")} />
            <Card className="px-5 py-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("stock.recentMovements")}</p>
              <ul className="mt-2 space-y-1">
                {overview.data.recentMovements.slice(0, 3).map((movement) => (
                  <li key={movement.id} className="flex items-center justify-between gap-2 text-xs">
                    <button type="button" onClick={() => setItem(movement.itemId)} className="truncate text-slate-700 hover:underline dark:text-slate-200">
                      {movement.itemName}
                    </button>
                    <span className={cx("shrink-0 tabular-nums font-medium", movement.quantityChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>
                      {movement.quantityChange > 0 ? "+" : ""}
                      {formatNumber(movement.quantityChange, locale)} {t(`units.${movement.unit}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder={t("stock.searchPlaceholder")} className="md:w-72" />
          <Select aria-label={t("stock.form.category")} value={category} onChange={(event) => setCategory(event.target.value)} className="md:w-48">
            <option value="">{t("stock.allCategories")}</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {t(`categories.${option}`)}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />
            {t("stock.lowOnly")}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            {t("stock.showArchived")}
          </label>
          <span className="text-sm text-slate-500 md:ml-auto">{t("stock.itemCount", { count: rows.length })}</span>
        </div>
        {items.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.error ? (
          <ErrorState error={items.error} onRetry={() => items.mutate()} />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => setItem(row.id)}
            initialSort={{ key: "name", direction: "asc" }}
            pageSize={15}
            rowClassName={(row) => (row.archived ? "opacity-60" : undefined)}
            empty={
              <EmptyState
                icon={<Boxes className="h-5 w-5" />}
                title={items.data?.length ? t("stock.noMatches") : t("stock.empty")}
                description={items.data?.length ? t("stock.noMatchesHint") : t("stock.emptyHint")}
              />
            }
            columns={[
              {
                key: "name",
                header: t("stock.columns.item"),
                sortValue: (row) => row.name.toLowerCase(),
                cell: (row) => (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 md:hidden">{t(`categories.${row.category}`)}</p>
                  </div>
                ),
              },
              { key: "category", header: t("stock.columns.category"), sortValue: (row) => row.category, cell: (row) => t(`categories.${row.category}`), hideBelow: "md" },
              {
                key: "quantity",
                header: t("stock.columns.quantity"),
                align: "right",
                sortValue: (row) => (row.minThreshold > 0 ? row.quantity / row.minThreshold : row.quantity),
                cell: (row) => (
                  <span className={cx("font-medium", row.low && "text-red-600 dark:text-red-400")}>
                    {formatNumber(row.quantity, locale)} <span className="text-xs font-normal text-slate-500">{t(`units.${row.unit}`)}</span>
                  </span>
                ),
              },
              { key: "min", header: t("stock.columns.minimum"), align: "right", sortValue: (row) => row.minThreshold, cell: (row) => formatNumber(row.minThreshold, locale), hideBelow: "sm" },
              {
                key: "status",
                header: t("stock.columns.status"),
                sortValue: (row) => (row.archived ? 2 : row.low ? 0 : 1),
                cell: (row) => (row.archived ? <Badge>{t("stock.archivedBadge")}</Badge> : row.low ? <Badge tone="red">{t("stock.low")}</Badge> : <Badge tone="green">{t("stock.ok")}</Badge>),
              },
              { key: "supplier", header: t("stock.columns.supplier"), sortValue: (row) => row.supplierName ?? "", cell: (row) => row.supplierName ?? "—", hideBelow: "lg" },
              { key: "cost", header: t("stock.columns.cost"), align: "right", sortValue: (row) => row.costPerUnit, cell: (row) => formatMoney(row.costPerUnit, locale), hideBelow: "lg" },
              { key: "value", header: t("stock.columns.value"), align: "right", sortValue: (row) => row.stockValue, cell: (row) => formatMoney(row.stockValue, locale), hideBelow: "md" },
            ]}
          />
        )}
      </Card>

      <ItemDrawer itemId={openItem} onClose={() => setItem(null)} onChanged={refresh} />
      <ItemFormDialog
        item={null}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(item) => {
          setCreateOpen(false);
          refresh();
          notify(t("stock.form.created", { name: item.name }));
          setItem(item.id);
        }}
      />
    </PageContainer>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <Suspense>
      <StockPage />
    </Suspense>
  </RequireRole>
);

export default Page;
