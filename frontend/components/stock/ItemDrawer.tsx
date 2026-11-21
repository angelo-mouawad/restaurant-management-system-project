"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { ConfirmDialog, Drawer } from "@components/ui/Dialog";
import { Alert, EmptyState, ErrorState, Skeleton } from "@components/ui/Feedback";
import { Field, Input, Select, Textarea } from "@components/ui/Form";
import { useToast } from "@components/ui/Toast";
import { formatDateTime } from "@lib/dates";
import { cx, formatMoney, formatNumber } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { archiveItem, recordMovement, restoreItem } from "@services/stock";
import useI18n from "@hooks/useI18n";
import { MovementType, StockItemDetail } from "@types";
import ItemFormDialog from "./ItemFormDialog";
import { MOVEMENT_TONES } from "./stockLabels";

const RECORDABLE: MovementType[] = ["DELIVERY", "USAGE", "WASTE", "CORRECTION"];

/** One item: where it stands, a form to record what happened to it, and its history. */
const ItemDrawer = ({ itemId, onClose, onChanged }: { itemId: number | null; onClose: () => void; onChanged: () => void }) => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { data, error, isLoading, mutate } = useSWR<StockItemDetail>(itemId ? `/stock/items/${itemId}` : null, fetcher);
  const [type, setType] = useState<MovementType>("USAGE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const item = data?.item;
  const unit = item ? t(`units.${item.unit}`) : "";
  const amount = Number(quantity);
  const preview = item && quantity !== "" && Number.isFinite(amount)
    ? type === "DELIVERY" ? item.quantity + amount : type === "CORRECTION" ? amount : item.quantity - amount
    : null;

  const refresh = async () => {
    await mutate();
    onChanged();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (quantity === "" || !Number.isFinite(amount) || amount < 0 || (type !== "CORRECTION" && amount === 0)) {
      setFormError(t("stock.movement.quantityInvalid"));
      return;
    }
    if ((type === "WASTE" || type === "CORRECTION") && !reason.trim()) {
      setFormError(t("stock.movement.reasonRequired"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await recordMovement(item.id, type, amount, reason.trim() || null);
      setQuantity("");
      setReason("");
      await refresh();
      notify(t("stock.movement.recorded"));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await (item.archived ? restoreItem(item.id) : archiveItem(item.id));
      setConfirmArchive(false);
      await refresh();
      notify(item.archived ? t("stock.restored") : t("stock.archived"));
      if (!item.archived) onClose();
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer
        open={itemId !== null && !editOpen && !confirmArchive}
        onClose={onClose}
        title={item?.name ?? t("common.loading")}
        subtitle={item && (
          <span className="flex flex-wrap items-center gap-2">
            {t(`categories.${item.category}`)}
            {item.supplierName && <span>· {item.supplierName}</span>}
            {item.archived && <Badge>{t("stock.archivedBadge")}</Badge>}
          </span>
        )}
        footer={item && (
          <>
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              {t("common.edit")}
            </Button>
            <Button variant={item.archived ? "secondary" : "dangerGhost"} className="ml-auto" icon={item.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />} onClick={() => (item.archived ? toggleArchive() : setConfirmArchive(true))}>
              {item.archived ? t("stock.restore") : t("stock.archive")}
            </Button>
          </>
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : item ? (
          <div className="space-y-6">
            <dl className="grid grid-cols-3 gap-3">
              <div className={cx("rounded-xl p-3", item.low ? "bg-red-50 dark:bg-red-500/10" : "bg-slate-50 dark:bg-slate-900/40")}>
                <dt className="text-xs text-slate-500 dark:text-slate-400">{t("stock.inStock")}</dt>
                <dd className={cx("mt-1 text-lg font-semibold tabular-nums", item.low ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-white")}>
                  {formatNumber(item.quantity, locale)} <span className="text-sm font-normal">{unit}</span>
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <dt className="text-xs text-slate-500 dark:text-slate-400">{t("stock.minimum")}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatNumber(item.minThreshold, locale)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <dt className="text-xs text-slate-500 dark:text-slate-400">{t("stock.value")}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(item.stockValue, locale)}</dd>
              </div>
            </dl>
            {item.low && <Alert tone="warning">{t("stock.belowMinimum")} <Link href={`/stock/orders?new=1&supplier=${item.supplierId ?? ""}&item=${item.id}`} className="font-semibold underline">{t("stock.orderMore")}</Link></Alert>}

            {!item.archived && (
              <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("stock.movement.title")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("stock.movement.type")}>
                    <Select value={type} onChange={(event) => setType(event.target.value as MovementType)}>
                      {RECORDABLE.map((option) => (
                        <option key={option} value={option}>
                          {t(`movementTypes.${option}`)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={type === "CORRECTION" ? t("stock.movement.counted", { unit }) : t("stock.movement.quantity", { unit })}>
                    <Input type="number" min={0} step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                  </Field>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t(`stock.movement.explain.${type}`)}</p>
                <Field label={t("stock.movement.reason")} required={type === "WASTE" || type === "CORRECTION"}>
                  <Textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
                </Field>
                {preview !== null && (
                  <p className={cx("text-sm", preview < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300")}>
                    {preview < 0
                      ? t("stock.movement.notEnough", { quantity: formatNumber(item.quantity, locale), unit })
                      : t("stock.movement.after", { quantity: formatNumber(preview, locale), unit })}
                  </p>
                )}
                {formError && <Alert>{formError}</Alert>}
                <Button type="submit" loading={saving} className="w-full">
                  {t("stock.movement.record")}
                </Button>
              </form>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("stock.history")}</h3>
                <Link href={`/stock/movements?item=${item.id}`} className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-300">
                  {t("common.viewAll")}
                </Link>
              </div>
              {data.recentMovements.length === 0 ? (
                <EmptyState className="py-6" title={t("stock.noMovements")} />
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                  {data.recentMovements.map((movement) => (
                    <li key={movement.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                      <Badge tone={MOVEMENT_TONES[movement.type]} className="mt-0.5 w-24 justify-center">
                        {t(`movementTypes.${movement.type}`)}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 dark:text-slate-200">
                          {movement.reason ?? (movement.purchaseOrderId ? t("stock.fromOrder", { id: movement.purchaseOrderId }) : "—")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(movement.createdAt, locale)}
                          {movement.userName && ` · ${movement.userName}`}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className={cx("font-semibold", movement.quantityChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100")}>
                          {movement.quantityChange > 0 ? "+" : ""}
                          {formatNumber(movement.quantityChange, locale)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">= {formatNumber(movement.quantityAfter, locale)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <ItemFormDialog
        item={item ?? null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          await refresh();
          notify(t("stock.form.saved"));
        }}
      />
      <ConfirmDialog
        open={confirmArchive}
        title={t("stock.archiveTitle", { name: item?.name ?? "" })}
        message={t("stock.archiveMessage")}
        confirmLabel={t("stock.archive")}
        loading={saving}
        onConfirm={toggleArchive}
        onClose={() => setConfirmArchive(false)}
      />
    </>
  );
};

export default ItemDrawer;
