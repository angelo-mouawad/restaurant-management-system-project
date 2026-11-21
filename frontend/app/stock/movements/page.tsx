"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Suspense, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import StockTabs from "@components/stock/StockTabs";
import { MOVEMENT_TONES } from "@components/stock/stockLabels";
import { Badge } from "@components/ui/Badge";
import { Card } from "@components/ui/Card";
import { Pagination } from "@components/ui/DataTable";
import { EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { Select } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { formatDateTime } from "@lib/dates";
import { cx, formatNumber } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useI18n from "@hooks/useI18n";
import { Movement, MovementType, Page, StockItem } from "@types";

const TYPES: MovementType[] = ["DELIVERY", "USAGE", "WASTE", "CORRECTION", "INITIAL"];
const PAGE_SIZE = 25;

/** Every recorded stock change, newest first, filtered and paginated on the server. */
const MovementsPage = () => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const itemId = params.get("item") ?? "";
  const [type, setType] = useState("");
  const [days, setDays] = useState("30");
  const [page, setPage] = useState(0);

  const items = useSWR<StockItem[]>(["/stock/items", { includeArchived: true }], fetcher);
  const { data, error, isLoading, mutate } = useSWR<Page<Movement>>(
    ["/stock/movements", { itemId, type, days, page, size: PAGE_SIZE }],
    fetcher,
    { keepPreviousData: true }
  );

  const setItem = (value: string) => {
    setPage(0);
    router.replace(value ? `/stock/movements?item=${value}` : "/stock/movements", { scroll: false });
  };

  return (
    <PageContainer>
      <PageHeader title={t("stock.title")} description={t("movements.description")} />
      <StockTabs />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 md:flex-row">
          <Select aria-label={t("movements.item")} value={itemId} onChange={(event) => setItem(event.target.value)} className="md:w-64">
            <option value="">{t("movements.allItems")}</option>
            {items.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select aria-label={t("movements.type")} value={type} onChange={(event) => { setType(event.target.value); setPage(0); }} className="md:w-48">
            <option value="">{t("movements.allTypes")}</option>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`movementTypes.${option}`)}
              </option>
            ))}
          </Select>
          <Select aria-label={t("movements.period")} value={days} onChange={(event) => { setDays(event.target.value); setPage(0); }} className="md:w-48">
            <option value="7">{t("movements.last7")}</option>
            <option value="30">{t("movements.last30")}</option>
            <option value="90">{t("movements.last90")}</option>
            <option value="">{t("movements.allTime")}</option>
          </Select>
        </div>
        {isLoading && !data ? (
          <TableSkeleton rows={10} columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !data || data.content.length === 0 ? (
          <EmptyState icon={<ArrowRightLeft className="h-5 w-5" />} title={t("movements.empty")} description={t("movements.emptyHint")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-teal-600 text-left text-xs font-semibold uppercase tracking-wide text-white dark:bg-teal-700">
                    <th scope="col" className="px-5 py-3">{t("movements.when")}</th>
                    <th scope="col" className="px-4 py-3">{t("movements.item")}</th>
                    <th scope="col" className="px-4 py-3">{t("movements.type")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("movements.change")}</th>
                    <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">{t("movements.after")}</th>
                    <th scope="col" className="hidden px-4 py-3 md:table-cell">{t("movements.reason")}</th>
                    <th scope="col" className="hidden px-5 py-3 lg:table-cell">{t("movements.by")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800">
                  {data.content.map((movement) => (
                    <tr key={movement.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(movement.createdAt, locale)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/stock?item=${movement.itemId}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                          {movement.itemName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={MOVEMENT_TONES[movement.type]}>{t(`movementTypes.${movement.type}`)}</Badge>
                      </td>
                      <td className={cx("whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums", movement.quantityChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100")}>
                        {movement.quantityChange > 0 ? "+" : ""}
                        {formatNumber(movement.quantityChange, locale)} <span className="text-xs font-normal text-slate-500">{t(`units.${movement.unit}`)}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300 sm:table-cell">{formatNumber(movement.quantityAfter, locale)}</td>
                      <td className="hidden max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-300 md:table-cell">
                        {movement.purchaseOrderId ? (
                          <Link href={`/stock/orders/${movement.purchaseOrderId}`} className="text-teal-700 hover:underline dark:text-teal-300">
                            PO-{movement.purchaseOrderId}
                          </Link>
                        ) : (
                          movement.reason ?? "—"
                        )}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-600 dark:text-slate-300 lg:table-cell">{movement.userName ?? t("movements.system")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pageCount={Math.max(1, data.totalPages)} total={data.totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>
    </PageContainer>
  );
};

const Page_ = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <Suspense>
      <MovementsPage />
    </Suspense>
  </RequireRole>
);

export default Page_;
