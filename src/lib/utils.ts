import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? parseISO(start) : start;
  const e = typeof end === "string" ? parseISO(end) : end;
  if (format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd")) {
    return format(s, "MMM d, yyyy");
  }
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

export const DEFAULT_CREW_MEMBERS = ["Dan", "Randy", "Jon", "Ken", "Cody", "Mike", "Tyler"];
export const DEFAULT_JOB_TYPES = [
  "Precast", "Wood Fr", "Leveling", "Radiant Heat", "Prep",
  "Prime/Survey", "Laying Mat", "Site Visit", "Pick Up"
];
