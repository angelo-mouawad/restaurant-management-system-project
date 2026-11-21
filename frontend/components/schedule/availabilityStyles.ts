import { AvailabilityStatus } from "@types";

/** One colour language for availability everywhere: calendar, planning grid and legends. */
export const availabilityStyles: Record<AvailabilityStatus | "NONE", { cell: string; dot: string; text: string }> = {
  AVAILABLE: {
    cell: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  PREFERRED: {
    cell: "bg-teal-100/80 dark:bg-teal-500/20",
    dot: "bg-teal-600",
    text: "text-teal-900 dark:text-teal-100",
  },
  UNAVAILABLE: {
    cell: "bg-[repeating-linear-gradient(135deg,theme(colors.red.50),theme(colors.red.50)_6px,theme(colors.red.100)_6px,theme(colors.red.100)_12px)] dark:bg-[repeating-linear-gradient(135deg,rgba(239,68,68,0.10),rgba(239,68,68,0.10)_6px,rgba(239,68,68,0.18)_6px,rgba(239,68,68,0.18)_12px)]",
    dot: "bg-red-500",
    text: "text-red-800 dark:text-red-200",
  },
  NONE: {
    cell: "",
    dot: "bg-slate-300 dark:bg-slate-600",
    text: "text-slate-500 dark:text-slate-400",
  },
};
