"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate } from "@services/UserService";
import useAuth from "@hooks/useAuth";
import useErrorMessage from "@hooks/useErrorMessage";
import useI18n from "@hooks/useI18n";

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useErrorMessage("");
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError(t("login.missingFields"));
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const loggedInUser = await authenticate(username.trim(), password);
      login(loggedInUser);
      router.replace("/home");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("login.failed"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/90 p-10 shadow-2xl backdrop-blur-md dark:bg-slate-800/90">
        <h1 className="mb-6 text-center text-3xl font-bold text-teal-500">
          {t("login.welcome")}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {error && (
            <p role="alert" className="text-center text-red-500">
              {error}
            </p>
          )}

          <div className="flex flex-col">
            <label htmlFor="username" className="mb-1 font-medium text-gray-700 dark:text-slate-200">
              {t("login.usernameLabel")}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder={t("login.usernamePlaceholder")}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" className="mb-1 font-medium text-gray-700 dark:text-slate-200">
              {t("login.passwordLabel")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-teal-500 py-3 font-semibold text-white shadow-lg transition-colors duration-300 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("common.loading") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
