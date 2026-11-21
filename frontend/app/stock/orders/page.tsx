"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import OrderFormDialog from "@components/stock/OrderFormDialog";
import StockTabs from "@components/stock/StockTabs";
import { ORDER_TONES } from "@components/stock/stockLabels";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { DataTable } from "@components/ui/DataTable";
import { EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { Segmented } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { formatDateTime, formatDay } from "@lib/dates";
import { formatMoney } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useI18n from "@hooks/useI18n";
import { PurchaseOrder, PurchaseOrderStatus } from "@types";

type Filter = "OPEN" | "ALL" | PurchaseOrderStatus;

const OrdersPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [createOpen, setCreateOpen] = useState(params.get("new") === "1");
  const { data, error, isLoading, mutate } = useSWR<PurchaseOrder[]>("/stock/orders", fetcher);

  const rows = useMemo(
    () =>
      (data ?? []).filter((order) =>
        filter === "ALL" ? true : filter === "OPEN" ? order.status === "DRAFT" || order.status === "ORDERED" : order.status === filter
      ),
    [data, filter]
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("stock.title")}
        description={t("orders.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            {t("orders.new")}
          </Button>
        }
      />
      <StockTabs />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto border-b border-slate-200 p-4 dark:border-slate-700">
          <Segmented<Filter>
            label={t("orders.filter")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "OPEN", label: t("orders.open") },
              { value: "RECEIVED", label: t("orderStatus.RECEIVED") },
              { value: "CANCELLED", label: t("orderStatus.CANCELLED") },
              { value: "ALL", label: t("common.all") },
            ]}
          />
        </div>
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/stock/orders/${row.id}`)}
            initialSort={{ key: "created", direction: "desc" }}
            empty={<EmptyState icon={<ClipboardList className="h-5 w-5" />} title={t("orders.empty")} description={t("orders.emptyHint")} />}
            columns={[
              { key: "id", header: t("orders.number"), sortValue: (row) => row.id, cell: (row) => <span className="font-medium text-slate-900 dark:text-slate-100">PO-{row.id}</span> },
              { key: "supplier", header: t("orders.supplier"), sortValue: (row) => row.supplierName, cell: (row) => row.supplierName },
              { key: "status", header: t("orders.status"), sortValue: (row) => row.status, cell: (row) => <Badge tone={ORDER_TONES[row.status]}>{t(`orderStatus.${row.status}`)}</Badge> },
              { key: "lines", header: t("orders.lines"), align: "right", sortValue: (row) => row.lineCount, cell: (row) => row.lineCount, hideBelow: "sm" },
              { key: "total", header: t("orders.total"), align: "right", sortValue: (row) => row.total, cell: (row) => formatMoney(row.total, locale) },
              { key: "expected", header: t("orders.expected"), sortValue: (row) => row.expectedAt ?? "", cell: (row) => (row.expectedAt ? formatDay(row.expectedAt, locale) : "—"), hideBelow: "md" },
              { key: "created", header: t("orders.created"), sortValue: (row) => row.createdAt, cell: (row) => formatDateTime(row.createdAt, locale), hideBelow: "lg" },
            ]}
          />
        )}
      </Card>

      <OrderFormDialog
        open={createOpen}
        initialSupplierId={params.get("supplier") ?? undefined}
        initialItemId={params.get("item") ?? undefined}
        onClose={() => {
          setCreateOpen(false);
          if (params.get("new")) router.replace("/stock/orders", { scroll: false });
        }}
        onSaved={(order) => {
          setCreateOpen(false);
          void mutate();
          notify(t("orders.created_toast", { id: order.id }));
          router.push(`/stock/orders/${order.id}`);
        }}
      />
    </PageContainer>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <Suspense>
      <OrdersPage />
    </Suspense>
  </RequireRole>
);

export default Page;
