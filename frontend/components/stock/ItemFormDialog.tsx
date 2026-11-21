"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@components/ui/Button";
import { Dialog } from "@components/ui/Dialog";
import { Alert } from "@components/ui/Feedback";
import { Field, Input, Select } from "@components/ui/Form";
import { fetcher } from "@services/apiClient";
import { createItem, updateItem } from "@services/stock";
import useI18n from "@hooks/useI18n";
import { StockCategory, StockItem, StockUnit, Supplier } from "@types";
import { CATEGORIES, UNITS } from "./stockLabels";

type Form = {
  name: string;
  category: StockCategory;
  unit: StockUnit;
  minThreshold: string;
  costPerUnit: string;
  supplierId: string;
  initialQuantity: string;
};

const empty: Form = { name: "", category: "PRODUCE", unit: "KG", minThreshold: "5", costPerUnit: "0", supplierId: "", initialQuantity: "0" };

/** Create an item, or edit everything about one except its quantity (that only changes through movements). */
const ItemFormDialog = ({
  item,
  open,
  onClose,
  onSaved,
}: {
  item: StockItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
}) => {
  const { t } = useI18n();
  const { data: suppliers } = useSWR<Supplier[]>(open ? "/stock/suppliers" : null, fetcher);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  const key = open ? `${item?.id ?? "new"}` : null;
  if (key !== seed) {
    setSeed(key);
    setError("");
    setForm(
      item
        ? {
            name: item.name,
            category: item.category,
            unit: item.unit,
            minThreshold: String(item.minThreshold),
            costPerUnit: String(item.costPerUnit),
            supplierId: item.supplierId ? String(item.supplierId) : "",
            initialQuantity: "",
          }
        : empty
    );
  }

  const set = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const threshold = Number(form.minThreshold);
    const cost = Number(form.costPerUnit);
    const initial = Number(form.initialQuantity || 0);
    if (!form.name.trim()) return setError(t("stock.form.nameRequired"));
    if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(initial) || initial < 0) {
      return setError(t("stock.form.numbersInvalid"));
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        minThreshold: threshold,
        costPerUnit: cost,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        initialQuantity: item ? null : initial,
      };
      onSaved(item ? await updateItem(item.id, input) : await createItem(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? t("stock.form.editTitle", { name: item.name }) : t("stock.form.newTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="item-form" loading={saving}>
            {item ? t("common.save") : t("stock.form.create")}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-4">
        <Field label={t("stock.form.name")} required>
          <Input value={form.name} maxLength={255} onChange={(event) => set({ name: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("stock.form.category")} required>
            <Select value={form.category} onChange={(event) => set({ category: event.target.value as StockCategory })}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("stock.form.unit")} required>
            <Select value={form.unit} onChange={(event) => set({ unit: event.target.value as StockUnit })}>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`unitNames.${unit}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("stock.form.threshold")} hint={t("stock.form.thresholdHint")} required>
            <Input type="number" min={0} step="any" value={form.minThreshold} onChange={(event) => set({ minThreshold: event.target.value })} />
          </Field>
          <Field label={t("stock.form.cost")} required>
            <Input type="number" min={0} step="0.01" value={form.costPerUnit} onChange={(event) => set({ costPerUnit: event.target.value })} />
          </Field>
        </div>
        <Field label={t("stock.form.supplier")}>
          <Select value={form.supplierId} onChange={(event) => set({ supplierId: event.target.value })}>
            <option value="">{t("stock.form.noSupplier")}</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        {!item && (
          <Field label={t("stock.form.initial")} hint={t("stock.form.initialHint")}>
            <Input type="number" min={0} step="any" value={form.initialQuantity} onChange={(event) => set({ initialQuantity: event.target.value })} />
          </Field>
        )}
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

export default ItemFormDialog;
