"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import logo from "@assets/images/logo.jpg";
import { Button } from "@components/ui/Button";
import { Alert } from "@components/ui/Feedback";
import { Field, Input } from "@components/ui/Form";
import { login } from "@services/users";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";

const DEMO_ACCOUNTS = [
  { username: "angelo", role: "ADMIN" },
  { username: "sara", role: "MANAGER" },
  { username: "lina", role: "EMPLOYEE" },
];

const LoginForm = () => {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError(t("login.missingFields"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(username.trim(), password);
      await refresh();
      router.replace("/home");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("login.failed"));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src={logo} alt="" width={64} height={64} className="mb-4 rounded-full border-2 border-white shadow-md" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          <form onSubmit={submit} className="space-y-5" noValidate>
            {params.get("session") === "ended" && !error && <Alert tone="info">{t("login.sessionEnded")}</Alert>}
            {error && <Alert>{error}</Alert>}
            <Field label={t("login.username")}>
              <Input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("login.usernamePlaceholder")}
              />
            </Field>
            <Field label={t("login.password")}>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("login.passwordPlaceholder")}
              />
            </Field>
            <Button type="submit" className="w-full" loading={submitting} icon={<LogIn className="h-4 w-4" />}>
              {t("login.submit")}
            </Button>
          </form>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm dark:border-slate-600">
          <p className="font-medium text-slate-700 dark:text-slate-200">{t("login.demoTitle")}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("login.demoHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(`${account.username}123`);
                }}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {account.username} · {t(`roles.${account.role}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => (
  <Suspense>
    <LoginForm />
  </Suspense>
);

export default LoginPage;
