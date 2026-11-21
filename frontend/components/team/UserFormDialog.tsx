"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@components/ui/Button";
import { Dialog } from "@components/ui/Dialog";
import { Alert } from "@components/ui/Feedback";
import { Field, Input, Select } from "@components/ui/Form";
import { fetcher } from "@services/apiClient";
import { createUser, updateUser } from "@services/users";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import { Role, User } from "@types";

type Form = {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  role: Role;
  position: string;
  maxWeeklyHours: string;
  managerId: string;
};

/** Create or edit an account. Admins can create managers and employees; managers only employees. */
const UserFormDialog = ({ user, open, onClose, onSaved }: { user: User | null; open: boolean; onClose: () => void; onSaved: (user: User) => void }) => {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const managers = useSWR<User[]>(open ? "/users/managers" : null, fetcher);
  const roles: Role[] = me?.role === "ADMIN" ? ["EMPLOYEE", "MANAGER"] : ["EMPLOYEE"];
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  const key = open ? String(user?.id ?? "new") : null;
  if (key !== seed) {
    setSeed(key);
    setError("");
    setForm({
      name: user?.name ?? "",
      username: user?.username ?? "",
      password: "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      role: user?.role ?? "EMPLOYEE",
      position: user?.position ?? "",
      maxWeeklyHours: String(user?.maxWeeklyHours ?? 38),
      managerId: user?.managerId ? String(user.managerId) : me?.role === "MANAGER" ? String(me.id) : "",
    });
  }
  if (!form) return null;
  const set = (patch: Partial<Form>) => setForm((current) => (current ? { ...current, ...patch } : current));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError(t("team.form.nameRequired"));
    if (!user && !/^[a-zA-Z0-9._-]{3,50}$/.test(form.username)) return setError(t("team.form.usernameInvalid"));
    if ((!user || form.password) && form.password.length < 8) return setError(t("team.form.passwordShort"));
    const hours = Number(form.maxWeeklyHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 80) return setError(t("team.form.hoursInvalid"));
    setSaving(true);
    setError("");
    const input = {
      name: form.name.trim(),
      username: user ? undefined : form.username.trim(),
      password: form.password || undefined,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
      position: form.position.trim() || null,
      maxWeeklyHours: hours,
      managerId: form.role === "EMPLOYEE" && form.managerId ? Number(form.managerId) : null,
    };
    try {
      onSaved(user ? await updateUser(user.id, input) : await createUser(input));
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
      size="lg"
      title={user ? t("team.form.editTitle", { name: user.name }) : t("team.form.newTitle")}
      description={user ? undefined : t("team.form.newDescription")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            {user ? t("common.save") : t("team.form.create")}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" autoComplete="off">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("team.form.name")} required>
            <Input value={form.name} onChange={(event) => set({ name: event.target.value })} />
          </Field>
          <Field label={t("team.form.position")} hint={t("team.form.positionHint")}>
            <Input value={form.position} onChange={(event) => set({ position: event.target.value })} />
          </Field>
          <Field label={t("team.form.username")} required={!user} hint={user ? t("team.form.usernameFixed") : t("team.form.usernameHint")}>
            <Input value={form.username} disabled={!!user} autoCapitalize="none" onChange={(event) => set({ username: event.target.value.toLowerCase() })} />
          </Field>
          <Field label={user ? t("team.form.newPassword") : t("team.form.password")} required={!user} hint={user ? t("team.form.passwordKeep") : t("team.form.passwordHint")}>
            <Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => set({ password: event.target.value })} />
          </Field>
          <Field label={t("profile.email")}>
            <Input type="email" value={form.email} onChange={(event) => set({ email: event.target.value })} />
          </Field>
          <Field label={t("profile.phone")}>
            <Input type="tel" value={form.phone} onChange={(event) => set({ phone: event.target.value })} />
          </Field>
          <Field label={t("team.form.role")} required>
            <Select value={form.role} onChange={(event) => set({ role: event.target.value as Role })} disabled={roles.length === 1}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("team.form.hours")} hint={t("team.form.hoursHint")} required>
            <Input type="number" min={1} max={80} value={form.maxWeeklyHours} onChange={(event) => set({ maxWeeklyHours: event.target.value })} />
          </Field>
          {form.role === "EMPLOYEE" && (
            <Field label={t("team.form.manager")} className="sm:col-span-2">
              <Select value={form.managerId} onChange={(event) => set({ managerId: event.target.value })}>
                <option value="">{t("team.form.noManager")}</option>
                {managers.data?.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} · {t(`roles.${manager.role}`)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {user && user.role !== form.role && <Alert tone="warning">{t("team.form.roleChangeWarning")}</Alert>}
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

export default UserFormDialog;
