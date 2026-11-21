"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import logo from "@assets/images/logo.jpg";
import { cx } from "@lib/format";
import { fetcher } from "@services/apiClient";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import useTheme from "@hooks/useTheme";
import { Avatar } from "@components/ui/Layout";

type NavItem = { href: string; section: string; label: string; icon: React.ReactNode };

const Header: React.FC = () => {
  const { user, isManagement, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, toggleLocale } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useSWR<{ count: number }>(user ? "/notifications/unread-count" : null, fetcher, {
    refreshInterval: 30000,
  });

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Navigation only lists what the role can actually use; the API enforces the same rules.
  const items: NavItem[] = user
    ? [
        { href: "/home", section: "/home", label: t("nav.home"), icon: <Home className="h-4 w-4" aria-hidden /> },
        {
          href: isManagement ? "/schedule/planning" : "/schedule/my",
          section: "/schedule",
          label: t("nav.schedule"),
          icon: <CalendarDays className="h-4 w-4" aria-hidden />,
        },
        ...(isManagement
          ? [
              { href: "/stock", section: "/stock", label: t("nav.stock"), icon: <Boxes className="h-4 w-4" aria-hidden /> },
              { href: "/team", section: "/team", label: t("nav.team"), icon: <Users className="h-4 w-4" aria-hidden /> },
            ]
          : []),
      ]
    : [];

  const count = unread?.count ?? 0;
  const isDark = theme === "dark";

  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-700 bg-gray-800 text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/home" : "/"} className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          <Image src={logo} alt="" width={36} height={36} priority className="rounded-full border border-white/70" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">{t("common.appName")}</span>
        </Link>

        <nav aria-label={t("nav.main")} className="ml-4 hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const active = pathname === item.section || pathname.startsWith(`${item.section}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
                {active && <span className="sr-only">({t("nav.current")})</span>}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={toggleLocale} className={cx(iconButton, "w-auto px-2.5 text-xs font-semibold")} aria-label={t("nav.switchLanguage")}>
            {locale === "en" ? "FR" : "EN"}
          </button>
          <button type="button" onClick={toggleTheme} className={iconButton} aria-label={isDark ? t("nav.lightMode") : t("nav.darkMode")} aria-pressed={isDark}>
            {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          </button>

          {user && (
            <>
              <Link
                href="/notifications"
                className={cx(iconButton, "relative", pathname.startsWith("/notifications") && "bg-white/10 text-white")}
                aria-label={count > 0 ? t("nav.notificationsUnread", { count }) : t("nav.notifications")}
              >
                <Bell className="h-4 w-4" aria-hidden />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-gray-800">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>

              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="max-w-[10rem] truncate font-medium">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t(`roles.${user.role}`)}</p>
                    </div>
                    <Link role="menuitem" href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60">
                      <UserRound className="h-4 w-4" aria-hidden />
                      {t("nav.profile")}
                    </Link>
                    <button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                      <LogOut className="h-4 w-4" aria-hidden />
                      {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className={cx(iconButton, "md:hidden")} onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={t("nav.menu")}>
                {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
            </>
          )}
        </div>
      </div>

      {user && mobileOpen && (
        <nav aria-label={t("nav.main")} className="border-t border-gray-700 px-4 pb-4 pt-2 md:hidden">
          <div className="mb-2 flex items-center gap-3 px-2 py-3">
            <Avatar name={user.name} />
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-400">{t(`roles.${user.role}`)}</p>
            </div>
          </div>
          {[...items, { href: "/notifications", section: "/notifications", label: t("nav.notifications"), icon: <Bell className="h-4 w-4" aria-hidden /> }, { href: "/profile", section: "/profile", label: t("nav.profile"), icon: <UserRound className="h-4 w-4" aria-hidden /> }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                pathname.startsWith(item.section) ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button type="button" onClick={() => void logout()} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-white/5">
            <LogOut className="h-4 w-4" aria-hidden />
            {t("nav.signOut")}
          </button>
        </nav>
      )}
    </header>
  );
};

export default Header;
