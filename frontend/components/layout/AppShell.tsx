"use client";

import React from "react";
import useI18n from "@hooks/useI18n";
import Header from "./Header";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
      <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t("nav.skipToContent")}
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="bg-gray-800 py-4 text-center text-sm text-slate-300">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
};

export default AppShell;
