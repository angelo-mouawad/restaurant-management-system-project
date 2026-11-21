"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import RequireRole from "@components/layout/RequireRole";
import UserFormDialog from "@components/team/UserFormDialog";
import { ROLE_TONES } from "@components/team/roleTones";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { DataTable } from "@components/ui/DataTable";
import { ConfirmDialog } from "@components/ui/Dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { SearchInput, Select } from "@components/ui/Form";
import { Avatar, PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { formatDate } from "@lib/dates";
import { fetcher } from "@services/apiClient";
import { deleteUser, setUserActive } from "@services/users";
import useI18n from "@hooks/useI18n";
import { Role, User } from "@types";

type Pending = { user: User; action: "deactivate" | "activate" | "delete" };

const TeamPage = () => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<User[]>("/users", fetcher);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter(
      (user) =>
        (!query || [user.name, user.username, user.position, user.email].some((value) => value?.toLowerCase().includes(query))) &&
        (!role || user.role === role) &&
        (status === "all" || (status === "active" ? user.active : !user.active))
    );
  }, [data, search, role, status]);

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === "delete") await deleteUser(pending.user.id);
      else await setUserActive(pending.user.id, pending.action === "activate");
      await mutate();
      notify(t(`team.done.${pending.action}`, { name: pending.user.name }));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("team.title")}
        description={t("team.description")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("team.add")}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder={t("team.search")} className="md:w-72" />
          <Select aria-label={t("team.role")} value={role} onChange={(event) => setRole(event.target.value)} className="md:w-44">
            <option value="">{t("team.allRoles")}</option>
            {(["ADMIN", "MANAGER", "EMPLOYEE"] as Role[]).map((option) => (
              <option key={option} value={option}>
                {t(`roles.${option}`)}
              </option>
            ))}
          </Select>
          <Select aria-label={t("team.status")} value={status} onChange={(event) => setStatus(event.target.value)} className="md:w-44">
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("team.deactivated")}</option>
            <option value="all">{t("common.all")}</option>
          </Select>
          <span className="text-sm text-slate-500 md:ml-auto">{t("team.count", { count: rows.length })}</span>
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/profile/${row.id}`)}
            initialSort={{ key: "name", direction: "asc" }}
            rowClassName={(row) => (row.active ? undefined : "opacity-60")}
            empty={<EmptyState icon={<Users className="h-5 w-5" />} title={t("team.empty")} />}
            columns={[
              {
                key: "name",
                header: t("team.name"),
                sortValue: (row) => row.name.toLowerCase(),
                cell: (row) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/profile/${row.id}`} onClick={(event) => event.stopPropagation()} className="block truncate font-medium text-slate-900 hover:underline dark:text-slate-100">
                        {row.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.position ?? row.username}</p>
                    </div>
                  </div>
                ),
              },
              { key: "role", header: t("team.role"), sortValue: (row) => row.role, cell: (row) => <Badge tone={ROLE_TONES[row.role]}>{t(`roles.${row.role}`)}</Badge> },
              { key: "manager", header: t("team.reportsTo"), sortValue: (row) => row.managerName ?? "", cell: (row) => row.managerName ?? "—", hideBelow: "lg" },
              { key: "contact", header: t("team.contact"), cell: (row) => <span className="text-slate-500 dark:text-slate-400">{row.email ?? row.phone ?? "—"}</span>, hideBelow: "lg" },
              { key: "joined", header: t("team.joined"), sortValue: (row) => row.joinedAt, cell: (row) => formatDate(row.joinedAt, locale), hideBelow: "md" },
              {
                key: "status",
                header: t("team.status"),
                sortValue: (row) => row.active,
                cell: (row) => <Badge tone={row.active ? "green" : "neutral"}>{row.active ? t("common.active") : t("team.deactivated")}</Badge>,
                hideBelow: "sm",
              },
              {
                key: "actions",
                header: "",
                align: "right",
                cell: (row) => (row.canManage ? <RowMenu user={row} onEdit={() => setEditing(row)} onAction={(action) => setPending({ user: row, action })} /> : null),
              },
            ]}
          />
        )}
      </Card>

      <UserFormDialog
        user={editing && editing !== "new" ? editing : null}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={async (user) => {
          const created = editing === "new";
          setEditing(null);
          await mutate();
          notify(created ? t("team.created", { name: user.name }) : t("team.saved"));
        }}
      />
      <ConfirmDialog
        open={!!pending}
        tone={pending?.action === "activate" ? "primary" : "danger"}
        title={pending ? t(`team.confirm.${pending.action}.title`, { name: pending.user.name }) : ""}
        message={pending ? t(`team.confirm.${pending.action}.message`, { name: pending.user.name }) : ""}
        confirmLabel={pending ? t(`team.confirm.${pending.action}.action`) : ""}
        loading={busy}
        onConfirm={run}
        onClose={() => setPending(null)}
      />
    </PageContainer>
  );
};

const RowMenu = ({ user, onEdit, onAction }: { user: User; onEdit: () => void; onAction: (action: Pending["action"]) => void }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60";
  return (
    <div className="relative inline-block" ref={ref} onClick={(event) => event.stopPropagation()}>
      <Button variant="secondary" size="sm" aria-label={t("team.actionsFor", { name: user.name })} aria-haspopup="menu" aria-expanded={open} icon={<MoreHorizontal className="h-4 w-4" />} onClick={() => setOpen((value) => !value)} />
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onEdit(); }}>
            <Pencil className="h-4 w-4" aria-hidden />
            {t("common.edit")}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onAction(user.active ? "deactivate" : "activate"); }}>
            {user.active ? <UserX className="h-4 w-4" aria-hidden /> : <UserCheck className="h-4 w-4" aria-hidden />}
            {user.active ? t("team.deactivate") : t("team.activate")}
          </button>
          <button role="menuitem" type="button" className={`${item} text-red-600 dark:text-red-400`} onClick={() => { setOpen(false); onAction("delete"); }}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("team.remove")}
          </button>
        </div>
      )}
    </div>
  );
};

const Page = () => (
  <RequireRole roles={["ADMIN", "MANAGER"]}>
    <TeamPage />
  </RequireRole>
);

export default Page;
