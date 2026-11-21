const intlLocale = (locale: string) => (locale === "fr" ? "fr-BE" : "en-GB");

export const formatMoney = (value: number, locale: string) =>
  new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format(value);

export const formatNumber = (value: number, locale: string, maxDecimals = 2) =>
  new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxDecimals }).format(value);

export const formatHours = (hours: number, locale: string) => `${formatNumber(hours, locale, 1)} h`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
