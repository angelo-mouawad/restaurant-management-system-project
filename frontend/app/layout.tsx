import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@styles/global.css";
import { AuthProvider } from "@components/AuthContext";
import AppShell from "@components/layout/AppShell";
import { ToastProvider } from "@components/ui/Toast";
import { I18nProvider } from "@context/I18nContext";
import { ThemeProvider } from "@context/ThemeContext";

export const metadata: Metadata = {
  title: "Restaurant Management System",
  description: "Staff, shift planning, stock and purchase orders for a restaurant.",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <body>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </body>
  </html>
);

export default RootLayout;
