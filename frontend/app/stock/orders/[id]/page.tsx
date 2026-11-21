"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, PackageCheck, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import OrderFormDialog from "@components/stock/OrderFormDialog";
import { ORDER_TONES } from "@components/stock/stockLabels";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card, CardBody, CardHeader } from "@components/ui/Card";
import { ConfirmDialog } from "@components/ui/Dialog";
import { ErrorState, Skeleton } from "@components/ui/Feedback";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { formatDateTime, formatDay } from "@lib/dates";
import { cx, formatMoney, formatNumber } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { deleteOrder, orderAction } from "@services/stock";
import useI18n from "@hooks/useI18n";
import { PurchaseOrder } from "@types";

type Action = "order" | "receive" | "cancel" | "delete";

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const { data: order, error, isLoading, mutate } = useSWR<PurchaseOrder>(`/stock/orders/${id}`, fetcher);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const run = async (action: Action) => {
    if (!order) return;
    setBusy(true);
    try {
      if (action === "delete") {
        await deleteOrder(order.id);
        notify(t("orders.deleted"));
        router.push("/stock/orders");
        return;
      }
      await orderAction(order.id, action);
      await mutate();
      notify(t(`orders.done.${action}`));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const timeline = order
    ? [
        { label: t("orders.timeline.created"), at: order.createdAt, by: order.createdByName, done: true },
        { label: t("orders.timeline.ordered"), at: order.orderedAt, by: null, done: !!order.orderedAt },
        order.status === "CANCELLED"
          ? { label: t("orders.timeline.cancelled"), at: null, by: null, done: true }
          : { label: t("orders.timeline.received"), at: order.receivedAt, by: order.receivedByName, done: !!order.receivedAt },
      ]
    : [];

  return (
    <PageContainer>
      <Link href="/stock/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("orders.back")}
      </Link>
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : error || !order ? (
        <Card>
          <ErrorState error={error} onRetry={() => mutate()} />
        </Card>
      ) : (
        <>
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                PO-{order.id}
                <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>
              </span>
            }
            description={t("orders.from", { supplier: order.supplierName })}
            actions={
              <>
                {order.status === "DRAFT" && (
                  <>
                    <Button variant="dangerGhost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm("delete")}>
                      {t("common.delete")}
                    </Button>
                    <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
                      {t("common.edit")}
                    </Button>
                    <Button icon={<Send className="h-4 w-4" />} onClick={() => setConfirm("order")}>
                      {t("orders.markOrdered")}
                    </Button>
                  </>
                )}
                {order.status === "ORDERED" && (
                  <>
                    <Button variant="dangerGhost" icon={<Ban className="h-4 w-4" />} onClick={() => setConfirm("cancel")}>
                      {t("orders.cancel")}
                    </Button>
                    <Button icon={<PackageCheck className="h-4 w-4" />} onClick={() => setConfirm("receive")}>
                      {t("orders.receive")}
                    </Button>
                  </>
                )}
              </>
            }
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <CardHeader title={t("orders.lines")} description={t("orders.lineCount", { count: order.lineCount })} />
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                      <th scope="col" className="px-5 py-2.5">{t("orders.item")}</th>
                      <th scope="col" className="px-4 py-2.5 text-right">{t("orders.quantity")}</th>
                      <th scope="col" className="px-4 py-2.5 text-right">{t("orders.unitCost")}</th>
                      <th scope="col" className="px-5 py-2.5 text-right">{t("orders.lineTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {order.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-5 py-3">
                          <Link href={`/stock?item=${line.itemId}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                            {line.itemName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(line.quantity, locale)} {t(`units.${line.unit}`)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatMoney(line.unitCost, locale)}</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(line.total, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {t("orders.total")}
                      </td>
                      <td className="px-5 py-3 text-right text-base font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(order.total, locale)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title={t("orders.details")} />
                <CardBody>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">{t("orders.supplier")}</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{order.supplierName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">{t("orders.expected")}</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{order.expectedAt ? formatDay(order.expectedAt, locale, { weekday: "short", day: "numeric", month: "long" }) : "—"}</dd>
                    </div>
                    {order.note && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">{t("orders.note")}</dt>
                        <dd className="mt-1 text-slate-700 dark:text-slate-200">{order.note}</dd>
                      </div>
                    )}
                  </dl>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t("orders.progress")} />
                <CardBody>
                  <ol className="space-y-4">
                    {timeline.map((step) => (
                      <li key={step.label} className="flex gap-3">
                        <span className={cx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", step.done ? (order.status === "CANCELLED" && step === timeline[2] ? "bg-red-500" : "bg-teal-500") : "bg-slate-300 dark:bg-slate-600")} aria-hidden />
                        <div className="text-sm">
                          <p className={cx("font-medium", step.done ? "text-slate-900 dark:text-slate-100" : "text-slate-400")}>{step.label}</p>
                          {step.at && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(step.at, locale)}
                              {step.by && ` · ${step.by}`}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            </div>
          </div>

          <OrderFormDialog
            open={editOpen}
            order={order}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await mutate();
              notify(t("orders.saved"));
            }}
          />
          <ConfirmDialog
            open={!!confirm}
            tone={confirm === "cancel" || confirm === "delete" ? "danger" : "primary"}
            title={confirm ? t(`orders.confirm.${confirm}.title`, { id: order.id }) : ""}
            message={confirm ? t(`orders.confirm.${confirm}.message`, { count: order.lineCount, supplier: order.supplierName }) : ""}
            confirmLabel={confirm ? t(`orders.confirm.${confirm}.action`) : ""}
            loading={busy}
            onConfirm={() => confirm && run(confirm)}
            onClose={() => setConfirm(null)}
          />
        </>
      )}
    </PageContainer>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <OrderDetailPage />
  </RequireRole>
);

export default Page;
