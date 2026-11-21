"use client";

import Link from "next/link";
import { CalendarDays, KeyRound, Lock, Mail, Pencil, Phone, Users } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import ShiftChip from "@components/schedule/ShiftChip";
import UserFormDialog from "@components/team/UserFormDialog";
import { ROLE_TONES } from "@components/team/roleTones";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card, CardBody, CardHeader } from "@components/ui/Card";
import { Dialog } from "@components/ui/Dialog";
import { Alert, EmptyState, ErrorState, Skeleton } from "@components/ui/Feedback";
import { Field, Input } from "@components/ui/Form";
import { Avatar, PageContainer } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { formatDate, formatDay, todayISO } from "@lib/dates";
import { formatHours } from "@lib/format";
import { fetcher } from "@services/apiClient";
import { changeMyPassword, updateMyProfile } from "@services/users";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import { Profile } from "@types";

/** A person's profile. What shows depends on who is looking: contact details only for management and the person themselves. */
const ProfileView = ({ userId }: { userId: number }) => {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { refresh } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<Profile>(`/users/${userId}/profile`, fetcher);
  const [editOpen, setEditOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageContainer>
    );
  }
  if (error || !data) {
    return (
      <PageContainer>
        <Card>
          <ErrorState error={error} onRetry={() => mutate()} />
        </Card>
      </PageContainer>
    );
  }

  const { user, self } = data;
  const today = todayISO();

  return (
    <PageContainer>
      <Card className="mb-6">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Avatar name={user.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{user.name}</h1>
              <Badge tone={ROLE_TONES[user.role]}>{t(`roles.${user.role}`)}</Badge>
              {!user.active && <Badge>{t("team.deactivated")}</Badge>}
              {self && <Badge tone="teal">{t("profile.you")}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {[user.position, t("profile.joined", { date: formatDate(user.joinedAt, locale) })].filter(Boolean).join(" · ")}
            </p>
            {user.managerName && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("profile.reportsTo")}{" "}
                <Link href={`/profile/${user.managerId}`} className="font-medium text-teal-700 hover:underline dark:text-teal-300">
                  {user.managerName}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {self && (
              <>
                <Button variant="secondary" icon={<KeyRound className="h-4 w-4" />} onClick={() => setPasswordOpen(true)}>
                  {t("profile.changePassword")}
                </Button>
                <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
                  {t("profile.editInfo")}
                </Button>
              </>
            )}
            {!self && user.canManage && (
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setManageOpen(true)}>
                {t("profile.editAccount")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title={t("profile.details")} />
          <CardBody>
            {user.contactVisible ? (
              <dl className="space-y-3 text-sm">
                <Row icon={<Mail className="h-4 w-4" />} label={t("profile.email")} value={user.email ? <a href={`mailto:${user.email}`} className="text-teal-700 hover:underline dark:text-teal-300">{user.email}</a> : "—"} />
                <Row icon={<Phone className="h-4 w-4" />} label={t("profile.phone")} value={user.phone ? <a href={`tel:${user.phone}`} className="hover:underline">{user.phone}</a> : "—"} />
                <Row label={t("profile.username")} value={user.username ?? "—"} />
                <Row label={t("profile.maxHours")} value={user.maxWeeklyHours ? `${user.maxWeeklyHours} h` : "—"} />
              </dl>
            ) : (
              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("profile.contactHidden")}
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {data.upcomingShifts && (
            <Card>
              <CardHeader
                title={self ? t("profile.myUpcoming") : t("profile.upcoming")}
                description={data.hoursThisWeek !== null ? t("profile.hoursThisWeek", { hours: formatHours(data.hoursThisWeek, locale) }) : undefined}
                action={self && <Link href="/schedule/my" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-300">{t("home.fullSchedule")}</Link>}
              />
              {data.upcomingShifts.length === 0 ? (
                <EmptyState className="py-8" icon={<CalendarDays className="h-5 w-5" />} title={t("profile.noUpcoming")} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {data.upcomingShifts.map((shift) => (
                    <li key={shift.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-28 shrink-0 text-sm font-medium text-slate-800 dark:text-slate-100">{formatDay(shift.date, locale)}</span>
                      <ShiftChip shift={shift} className="flex-1" />
                      {shift.periodStatus === "DRAFT" && <Badge tone="amber">{t("periodStatus.DRAFT")}</Badge>}
                      {shift.date === today && <Badge tone="teal">{t("common.today")}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {user.role !== "EMPLOYEE" && (
            <Card>
              <CardHeader title={t("profile.team")} description={t("profile.teamCount", { count: data.team.length })} />
              {data.team.length === 0 ? (
                <EmptyState className="py-8" icon={<Users className="h-5 w-5" />} title={t("profile.noTeam")} />
              ) : (
                <ul className="grid gap-px bg-slate-100 dark:bg-slate-700 sm:grid-cols-2">
                  {data.team.map((member) => (
                    <li key={member.id} className="bg-white dark:bg-slate-800">
                      <Link href={`/profile/${member.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <Avatar name={member.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.position ?? t(`roles.${member.role}`)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {self && (
        <>
          <EditInfoDialog
            open={editOpen}
            initial={{ name: user.name, email: user.email ?? "", phone: user.phone ?? "" }}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              setEditOpen(false);
              await Promise.all([mutate(), refresh()]);
              notify(t("profile.saved"));
            }}
          />
          <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onSaved={() => { setPasswordOpen(false); notify(t("profile.passwordChanged")); }} />
        </>
      )}
      {!self && user.canManage && (
        <UserFormDialog user={user} open={manageOpen} onClose={() => setManageOpen(false)} onSaved={async () => { setManageOpen(false); await mutate(); notify(t("team.saved")); }} />
      )}
    </PageContainer>
  );
};

const Row = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      {icon}
      {label}
    </dt>
    <dd className="truncate text-right font-medium text-slate-800 dark:text-slate-100">{value}</dd>
  </div>
);

const EditInfoDialog = ({ open, initial, onClose, onSaved }: { open: boolean; initial: { name: string; email: string; phone: string }; onClose: () => void; onSaved: () => void }) => {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(initial);
      setError("");
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError(t("team.form.nameRequired"));
    setSaving(true);
    setError("");
    try {
      await updateMyProfile({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null });
      onSaved();
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
      title={t("profile.editInfo")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="profile-form" loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} className="space-y-4">
        <Field label={t("team.form.name")} required>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label={t("profile.email")}>
          <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label={t("profile.phone")}>
          <Input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("profile.otherFieldsHint")}</p>
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

const PasswordDialog = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setCurrent("");
    setNext("");
    setRepeat("");
    setError("");
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next.length < 8) return setError(t("team.form.passwordShort"));
    if (next !== repeat) return setError(t("profile.passwordMismatch"));
    setSaving(true);
    setError("");
    try {
      await changeMyPassword(current, next);
      setCurrent("");
      setNext("");
      setRepeat("");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title={t("profile.changePassword")}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="password-form" loading={saving}>
            {t("profile.updatePassword")}
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} className="space-y-4">
        <Field label={t("profile.currentPassword")} required>
          <Input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </Field>
        <Field label={t("profile.newPassword")} hint={t("team.form.passwordHint")} required>
          <Input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
        </Field>
        <Field label={t("profile.repeatPassword")} required>
          <Input type="password" autoComplete="new-password" value={repeat} onChange={(event) => setRepeat(event.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
};

export default ProfileView;
