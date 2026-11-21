"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@components/ui/Button";
import { Dialog } from "@components/ui/Dialog";
import { Alert } from "@components/ui/Feedback";
import { Field, Input, Select, Textarea } from "@components/ui/Form";
import { formatMoney } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { createOrder, updateOrder } from "@services/stock";
import useI18n from "@hooks/useI18n";
import { PurchaseOrder, StockItem, Supplier } from "@types";

type Line = { itemId: string; quantity: string; unitCost: string };

/** Build a new draft order, or edit an existing draft. Low items of the chosen supplier can be added in one go. */
const OrderFormDialog = ({
  open,
  order,
  initialSupplierId,
  initialItemId,
  onClose,
  onSaved,
}: {
  open: boolean;
  order?: PurchaseOrder | null;
  initialSupplierId?: string;
  initialItemId?: string;
  onClose: () => void;
  onSaved: (order: PurchaseOrder) => void;
}) => {
  const { t, locale } = useI18n();
  const suppliers = useSWR<Supplier[]>(open ? "/stock/suppliers" : null, fetcher);
  const items = useSWR<StockItem[]>(open ? "/stock/items" : null, fetcher);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  const key = open ? `${order?.id ?? "new"}-${initialItemId ?? ""}` : null;
  if (key !== seed && (!open || items.data || order)) {
    setSeed(key);
    setError("");
    if (order) {
      setSupplierId(String(order.supplierId));
      setExpectedAt(order.expectedAt ?? "");
      setNote(order.note ?? "");
      setLines(order.lines.map((line) => ({ itemId: String(line.itemId), quantity: String(line.quantity), unitCost: String(line.unitCost) })));
    } else {
      const item = items.data?.find((candidate) => String(candidate.id) === initialItemId);
      setSupplierId(initialSupplierId || (item?.supplierId ? String(item.supplierId) : ""));
      setExpectedAt("");
      setNote("");
      setLines(item ? [{ itemId: String(item.id), quantity: String(Math.max(item.minThreshold * 2 - item.quantity, 1)), unitCost: String(item.costPerUnit) }] : [{ itemId: "", quantity: "", unitCost: "" }]);
    }
  }

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const pickItem = (index: number, itemId: string) => {
    const item = items.data?.find((candidate) => String(candidate.id) === itemId);
    updateLine(index, { itemId, unitCost: item ? String(item.costPerUnit) : "" });
  };

  const addLowItems = () => {
    const low = (items.data ?? []).filter(
      (item) => item.low && (!supplierId || String(item.supplierId) === supplierId) && !lines.some((line) => line.itemId === String(item.id))
    );
    setLines((current) => [
      ...current.filter((line) => line.itemId),
      ...low.map((item) => ({
        itemId: String(item.id),
        quantity: String(Math.max(Math.ceil(item.minThreshold * 2 - item.quantity), 1)),
        unitCost: String(item.costPerUnit),
      })),
    ]);
  };

  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const filled = lines.filter((line) => line.itemId);
    if (!supplierId) return setError(t("orders.form.supplierRequired"));
    if (filled.length === 0) return setError(t("orders.form.linesRequired"));
    if (filled.some((line) => !(Number(line.quantity) > 0))) return setError(t("orders.form.quantityInvalid"));
    setSaving(true);
    setError("");
    const input = {
      supplierId: Number(supplierId),
      expectedAt: expectedAt || null,
      note: note.trim() || null,
      lines: filled.map((line) => ({ itemId: Number(line.itemId), quantity: Number(line.quantity), unitCost: line.unitCost === "" ? null : Number(line.unitCost) })),
    };
    try {
      onSaved(order ? await updateOrder(order.id, input) : await createOrder(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const supplierItems = (items.data ?? []).filter((item) => !supplierId || item.supplierId === null || String(item.supplierId) === supplierId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={order ? t("orders.form.editTitle", { id: order.id }) : t("orders.form.newTitle")}
      description={t("orders.form.description")}
      footer={
        <>
          <span className="mr-auto self-center text-sm text-slate-600 dark:text-slate-300">
            {t("orders.total")}: <strong className="tabular-nums">{formatMoney(total, locale)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="order-form" loading={saving}>
            {order ? t("common.save") : t("orders.form.saveDraft")}
          </Button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("orders.supplier")} required>
            <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">{t("orders.form.pickSupplier")}</option>
              {suppliers.data?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("orders.expected")} hint={t("orders.form.expectedHint")}>
            <Input type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("orders.lines")}</p>
            <Button variant="ghost" size="sm" onClick={addLowItems} disabled={!items.data}>
              {t("orders.form.addLow")}
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, index) => {
              const item = items.data?.find((candidate) => String(candidate.id) === line.itemId);
              return (
                <div key={index} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
                  <Select aria-label={t("orders.item")} value={line.itemId} onChange={(event) => pickItem(index, event.target.value)}>
                    <option value="">{t("orders.form.pickItem")}</option>
                    {supplierItems.map((candidate) => (
                      <option key={candidate.id} value={candidate.id} disabled={lines.some((other, i) => i !== index && other.itemId === String(candidate.id))}>
                        {candidate.name}
                        {candidate.low ? ` (${t("stock.low")})` : ""}
                      </option>
                    ))}
                  </Select>
                  <div className="relative">
                    <Input aria-label={t("orders.quantity")} type="number" min={0} step="any" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} placeholder={t("orders.quantity")} className="pr-8" />
                    {item && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">{t(`units.${item.unit}`)}</span>}
                  </div>
                  <Input aria-label={t("orders.unitCost")} type="number" min={0} step="0.01" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} placeholder="€" />
                  <Button variant="ghost" size="md" aria-label={t("common.remove")} icon={<Trash2 className="h-4 w-4" />} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1} />
                </div>
              );
            })}
          </div>
          <Button variant="secondary" size="sm" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => setLines((current) => [...current, { itemId: "", quantity: "", unitCost: "" }])}>
            {t("orders.form.addLine")}
          </Button>
        </div>

        <Field label={t("orders.note")}>
          <Textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

export default OrderFormDialog;
