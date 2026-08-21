"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type Locale = "en" | "fr";

type Translations = {
  [key: string]: string | Translations;
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const dictionaries: Record<Locale, Translations> = {
  en: {
    common: {
      appName: "Restaurant Management",
      accessDeniedLogin: "Access denied. Please login.",
      accessDeniedAdmin: "Access denied. Admin only.",
      failedToLoad: "Failed to load.",
      loadingAccount: "Loading account information...",
      loading: "Loading...",
      cancel: "Cancel",
      confirm: "Confirm",
      selectUser: "Select a user",
      noNotifications: "No notifications yet.",
      loadingNotifications: "Loading notifications...",
      failedNotifications: "Failed to load notifications.",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      languageEnglish: "EN",
      languageFrench: "FR",
      logout: "Logout",
      welcomeBack: "Welcome back",
      roleFallback: "User",
      message: "Message",
      date: "Date",
      close: "Close",
      actionFailed: "That action could not be completed. Please try again.",
      retry: "Retry",
    },
    header: {
      home: "Home",
      schedule: "Schedule",
      stock: "Stock",
    },
    home: {
      schedule: "Schedule",
      stock: "Stock",
      notifications: "Notifications",
    },
    login: {
      welcome: "Welcome, Login Here!",
      usernameLabel: "Username",
      usernamePlaceholder: "Your username",
      passwordLabel: "Password",
      passwordPlaceholder: "Your password",
      submit: "Login",
      missingFields: "Please fill in both username and password fields.",
      failed: "Login failed. Please try again.",
    },
    schedule: {
      title: "Schedule Management",
      noItems: "No available items in schedule.",
      failed: "Failed to load schedule.",
      table: {
        day: "Day",
        shift: "Shift",
        name: "Name",
        actions: "Actions",
        remove: "Remove",
        assign: "Assign",
      },
      modal: {
        title: "Assign User",
        selectUser: "Select a user",
        missingUser: "Please select a user.",
      },
    },
    stock: {
      title: "Stock Management",
      noItems: "No available items in stock.",
      failed: "Failed to load stock.",
      table: {
        item: "Item",
        quantity: "Stock",
        actions: "Actions",
        add: "Add",
        remove: "Remove",
        addNew: "Add New Item",
      },
      modal: {
        add: "Add Quantity",
        remove: "Remove Quantity",
        create: "Add New Item",
        missingFields: "Name and quantity are required.",
        missingQuantity: "Quantity cannot be empty.",
        invalidQuantity: "Quantity must be a positive number.",
        namePlaceholder: "Enter item name",
        quantityPlaceholder: "Enter quantity",
      },
    },
    footer: {
      copyright: "© {year} Restaurant Management System",
    },
  },
  fr: {
    common: {
      appName: "Gestion de Restaurant",
      accessDeniedLogin: "Accès refusé. Veuillez vous connecter.",
      accessDeniedAdmin: "Accès refusé. Réservé aux administrateurs.",
      failedToLoad: "Échec du chargement.",
      loadingAccount: "Chargement des informations du compte...",
      loading: "Chargement...",
      cancel: "Annuler",
      confirm: "Confirmer",
      selectUser: "Sélectionnez un utilisateur",
      noNotifications: "Pas encore de notifications.",
      loadingNotifications: "Chargement des notifications...",
      failedNotifications: "Échec du chargement des notifications.",
      lightMode: "Mode clair",
      darkMode: "Mode sombre",
      languageEnglish: "EN",
      languageFrench: "FR",
      logout: "Déconnexion",
      welcomeBack: "Bon retour",
      roleFallback: "Utilisateur",
      message: "Message",
      date: "Date",
      close: "Fermer",
      actionFailed: "Cette action n'a pas pu être effectuée. Veuillez réessayer.",
      retry: "Réessayer",
    },
    header: {
      home: "Accueil",
      schedule: "Horaire",
      stock: "Stock",
    },
    home: {
      schedule: "Horaire",
      stock: "Stock",
      notifications: "Notifications",
    },
    login: {
      welcome: "Bienvenue, connectez-vous !",
      usernameLabel: "Nom d'utilisateur",
      usernamePlaceholder: "Votre nom d'utilisateur",
      passwordLabel: "Mot de passe",
      passwordPlaceholder: "Votre mot de passe",
      submit: "Se connecter",
      missingFields: "Veuillez remplir le nom d'utilisateur et le mot de passe.",
      failed: "Échec de la connexion. Veuillez réessayer.",
    },
    schedule: {
      title: "Gestion de l'horaire",
      noItems: "Aucun élément disponible dans l'horaire.",
      failed: "Échec du chargement de l'horaire.",
      table: {
        day: "Jour",
        shift: "Quart",
        name: "Nom",
        actions: "Actions",
        remove: "Retirer",
        assign: "Assigner",
      },
      modal: {
        title: "Assigner un utilisateur",
        selectUser: "Sélectionnez un utilisateur",
        missingUser: "Veuillez sélectionner un utilisateur.",
      },
    },
    stock: {
      title: "Gestion du stock",
      noItems: "Aucun article disponible en stock.",
      failed: "Échec du chargement du stock.",
      table: {
        item: "Article",
        quantity: "Stock",
        actions: "Actions",
        add: "Ajouter",
        remove: "Retirer",
        addNew: "Ajouter un article",
      },
      modal: {
        add: "Ajouter une quantité",
        remove: "Retirer une quantité",
        create: "Ajouter un nouvel article",
        missingFields: "Le nom et la quantité sont requis.",
        missingQuantity: "La quantité ne peut pas être vide.",
        invalidQuantity: "La quantité doit être un nombre positif.",
        namePlaceholder: "Entrez le nom de l'article",
        quantityPlaceholder: "Entrez la quantité",
      },
    },
    footer: {
      copyright: "© {year} Système de Gestion de Restaurant",
    },
  },
};

const STORAGE_KEY = "preferred-locale";

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const resolveKey = (dictionary: Translations, key: string): string | null => {
  const parts = key.split(".");
  let current: string | Translations | undefined = dictionary;

  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return null;
    }
    current = current[part];
  }

  return typeof current === "string" ? current : null;
};

const interpolate = (value: string, vars?: Record<string, string | number>) => {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, varName) => {
    const replacement = vars[varName];
    return replacement !== undefined ? String(replacement) : match;
  });
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "fr") {
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dictionary = dictionaries[locale];
      const resolved = resolveKey(dictionary, key);
      if (!resolved) {
        return key;
      }
      return interpolate(resolved, vars);
    },
    [locale]
  );

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "fr" : "en"));
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, toggleLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
