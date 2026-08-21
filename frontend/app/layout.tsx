import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@styles/global.css";
import Header from "@components/Header";
import Footer from "@components/Footer";
import { AuthProvider } from "@components/AuthContext";
import { ThemeProvider } from "@context/ThemeContext";
import { I18nProvider } from "@context/I18nContext";

export const metadata: Metadata = {
  title: "Restaurant Management System",
  description: "Manage restaurant stock, staff schedules and notifications.",
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <Header />
              <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
};

export default RootLayout;
