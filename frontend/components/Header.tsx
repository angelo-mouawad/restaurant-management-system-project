"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@assets/images/logo.jpg";
import useAuth from "@hooks/useAuth";
import useTheme from "@hooks/useTheme";
import useI18n from "@hooks/useI18n";

const navLinkClasses =
  "relative px-3 py-2 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-teal-400 after:transition-all after:duration-300 hover:after:w-full";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, toggleLocale } = useI18n();

  const isDark = theme === "dark";
  const nextLocaleLabel =
    locale === "en" ? t("common.languageFrench") : t("common.languageEnglish");

  return (
    <header className="border-b border-gray-700 bg-gray-800 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-6">
        <div className="flex items-center gap-5">
          <Image
            src={logo}
            alt="Restaurant Management System logo"
            width={70}
            height={70}
            priority
            className="rounded-full border-2 border-white transition-transform duration-300 hover:scale-110"
          />
          <span className="text-2xl font-bold tracking-wide lg:text-3xl">
            {t("common.appName")}
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-lg font-medium">
          {user && (
            <Link href="/home" className={navLinkClasses}>
              {t("header.home")}
            </Link>
          )}

          {user && (
            <Link href="/schedule" className={navLinkClasses}>
              {t("header.schedule")}
            </Link>
          )}

          {user?.role === "admin" && (
            <Link href="/stock" className={navLinkClasses}>
              {t("header.stock")}
            </Link>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={isDark}
              className="flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:border-teal-300 hover:text-teal-200"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
                {isDark ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M21 14.5a8.5 8.5 0 0 1-11.5-11.5a1 1 0 0 0-1.33-1.33A10.5 10.5 0 1 0 22.83 16a1 1 0 0 0-1.33-1.33Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <circle cx="12" cy="12" r="4" />
                    <path
                      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}
              </span>
              {isDark ? t("common.darkMode") : t("common.lightMode")}
            </button>

            <button
              type="button"
              onClick={toggleLocale}
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:border-teal-300 hover:text-teal-200"
            >
              {nextLocaleLabel}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-white shadow-md transition-colors duration-300 hover:bg-red-600"
              >
                {t("common.logout")}
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
