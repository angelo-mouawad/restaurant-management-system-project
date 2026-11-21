"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import en from "@locales/en";
import fr from "@locales/fr";
import type { Translations } from "@locales/en";

export type Locale = "en" | "fr";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Looks up a dotted key ("stock.title") and fills in {placeholders}. Falls back to English, then to the key. */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const dictionaries: Record<Locale, Translations> = { en, fr };

const STORAGE_KEY = "preferred-locale";

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const resolveKey = (dictionary: Translations, key: string): string | null => {
  let current: unknown = dictionary;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : null;
};

const interpolate = (value: string, vars?: Record<string, string | number>) =>
  vars ? value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match)) : value;

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "fr") setLocale(stored);
    } catch {
      // Storage unavailable: stay on English.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(resolveKey(dictionaries[locale], key) ?? resolveKey(dictionaries.en, key) ?? key, vars),
    [locale]
  );

  const toggleLocale = useCallback(() => setLocale((previous) => (previous === "en" ? "fr" : "en")), []);

  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t }), [locale, toggleLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
