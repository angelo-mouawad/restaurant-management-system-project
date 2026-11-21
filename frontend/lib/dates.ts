// Calendar dates travel as "yyyy-mm-dd" strings and are always handled as local dates, so a time
// zone can never shift a shift onto the wrong day.

export const parseDate = (iso: string): Date => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const toISODate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const todayISO = () => toISODate(new Date());

export const addDays = (iso: string, days: number): string => {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

/** The Monday of the week the date falls in. */
export const weekStart = (iso: string): string => {
  const date = parseDate(iso);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toISODate(date);
};

export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

export const monthEnd = (iso: string): string => {
  const date = parseDate(monthStart(iso));
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

export const addMonths = (iso: string, months: number): string => {
  const date = parseDate(monthStart(iso));
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, 1));
};

export const daysBetween = (from: string, to: string): string[] => {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
};

/** Monday-first weeks fully covering a month, as a list of 7-day rows. */
export const monthGrid = (iso: string): string[][] => {
  const start = weekStart(monthStart(iso));
  const end = addDays(weekStart(monthEnd(iso)), 6);
  const days = daysBetween(start, end);
  const rows: string[][] = [];
  for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
  return rows;
};

/** 0 = Monday ... 6 = Sunday. */
export const weekdayIndex = (iso: string) => (parseDate(iso).getDay() + 6) % 7;

export const JAVA_WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export const isPast = (iso: string) => iso < todayISO();

export const isWeekend = (iso: string) => weekdayIndex(iso) >= 5;

/** "17:00:00" or "17:00" to "17:00". */
export const shortTime = (time: string | null | undefined) => (time ? time.slice(0, 5) : "");

const intlLocale = (locale: string) => (locale === "fr" ? "fr-BE" : "en-GB");

export const formatDay = (iso: string, locale: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat(intlLocale(locale), options).format(parseDate(iso));

export const formatDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" }).format(parseDate(iso));

export const formatMonth = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(parseDate(iso));

export const formatWeekday = (iso: string, locale: string, style: "short" | "long" | "narrow" = "short") =>
  new Intl.DateTimeFormat(intlLocale(locale), { weekday: style }).format(parseDate(iso));

export const formatDateTime = (value: string, locale: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const formatWeekRange = (start: string, locale: string) => {
  const end = addDays(start, 6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = formatDay(start, locale, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  return `${from} – ${formatDay(end, locale, { day: "numeric", month: "short", year: "numeric" })}`;
};

/** "3 min ago", "yesterday", or a date for anything older than a week. */
export const formatRelative = (value: string, locale: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDateTime(value, locale);
};
