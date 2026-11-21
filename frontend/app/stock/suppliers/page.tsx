"use client";

import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import StockTabs from "@components/stock/StockTabs";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { DataTable } from "@components/ui/DataTable";
import { ConfirmDialog, Dialog } from "@components/ui/Dialog";
import { Alert, EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { Field, Input } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { fetcher } from "@services/apiClient";
import { createSupplier, deleteSupplier, updateSupplier } from "@services/stock";
import useI18n from "@hooks/useI18n";
import { Supplier } from "@types";

const SuppliersPage = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const { data, error, isLoading, mutate } = useSWR<Supplier[]>("/stock/suppliers", fetcher);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteSupplier(deleting.id);
      await mutate();
      notify(t("suppliers.deleted"));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("stock.title")}
        description={t("suppliers.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("suppliers.add")}
          </Button>
        }
      />
      <StockTabs />
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <DataTable
            rows={data ?? []}
            rowKey={(row) => row.id}
            initialSort={{ key: "name", direction: "asc" }}
            empty={<EmptyState icon={<Truck className="h-5 w-5" />} title={t("suppliers.empty")} />}
            columns={[
              { key: "name", header: t("suppliers.name"), sortValue: (row) => row.name.toLowerCase(), cell: (row) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span> },
              { key: "contact", header: t("suppliers.contact"), sortValue: (row) => row.contactName ?? "", cell: (row) => row.contactName ?? "—", hideBelow: "md" },
              {
                key: "email",
                header: t("suppliers.email"),
                cell: (row) => (row.email ? <a href={`mailto:${row.email}`} className="text-teal-700 hover:underline dark:text-teal-300">{row.email}</a> : "—"),
                hideBelow: "lg",
              },
              { key: "phone", header: t("suppliers.phone"), cell: (row) => row.phone ?? "—", hideBelow: "lg" },
              { key: "lead", header: t("suppliers.leadTime"), align: "right", sortValue: (row) => row.leadTimeDays, cell: (row) => t("suppliers.days", { count: row.leadTimeDays }) },
              { key: "items", header: t("suppliers.items"), align: "right", sortValue: (row) => row.itemCount, cell: (row) => row.itemCount, hideBelow: "sm" },
              {
                key: "actions",
                header: "",
                align: "right",
                cell: (row) => (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={t("common.edit")} icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(row)} />
                    <Button variant="dangerGhost" size="sm" aria-label={t("common.delete")} icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(row)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <SupplierDialog value={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await mutate(); notify(t("suppliers.saved")); }} />
      <ConfirmDialog
        open={!!deleting}
        title={t("suppliers.deleteTitle", { name: deleting?.name ?? "" })}
        message={deleting?.itemCount ? t("suppliers.deleteWithItems", { count: deleting.itemCount }) : t("suppliers.deleteMessage")}
        confirmLabel={t("common.delete")}
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
};

const SupplierDialog = ({ value, onClose, onSaved }: { value: Supplier | "new" | null; onClose: () => void; onSaved: () => void }) => {
  const { t } = useI18n();
  const existing = value && value !== "new" ? value : null;
  const blank = { name: "", contactName: "", email: "", phone: "", leadTimeDays: 2 };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastValue, setLastValue] = useState<typeof value>(null);

  if (value !== lastValue) {
    setLastValue(value);
    setError("");
    setForm(existing ? { name: existing.name, contactName: existing.contactName ?? "", email: existing.email ?? "", phone: existing.phone ?? "", leadTimeDays: existing.leadTimeDays } : blank);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError(t("suppliers.nameRequired"));
    setSaving(true);
    setError("");
    const input = {
      name: form.name.trim(),
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      leadTimeDays: form.leadTimeDays,
    };
    try {
      if (existing) await updateSupplier(existing.id, input);
      else await createSupplier(input);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!value}
      onClose={onClose}
      title={existing ? t("suppliers.edit") : t("suppliers.add")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="supplier-form" loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={submit} className="space-y-4">
        <Field label={t("suppliers.name")} required>
          <Input value={form.name} maxLength={255} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("suppliers.contact")}>
            <Input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
          </Field>
          <Field label={t("suppliers.phone")}>
            <Input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
        </div>
        <Field label={t("suppliers.email")}>
          <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label={t("suppliers.leadTime")} hint={t("suppliers.leadTimeHint")}>
          <Input type="number" min={0} max={60} value={form.leadTimeDays} onChange={(event) => setForm({ ...form, leadTimeDays: Number(event.target.value) })} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <SuppliersPage />
  </RequireRole>
);

export default Page;
