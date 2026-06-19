import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function utcParts(d: Date) {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { y, m, day } = utcParts(d);
  return `${MONTHS[m]} ${day}, ${y}`;
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const sp = utcParts(s), ep = utcParts(e);
  if (sp.y === ep.y && sp.m === ep.m && sp.day === ep.day) {
    return `${MONTHS[sp.m]} ${sp.day}, ${sp.y}`;
  }
  return `${MONTHS[sp.m]} ${sp.day} – ${MONTHS[ep.m]} ${ep.day}, ${ep.y}`;
}

export const DEFAULT_CREW_MEMBERS = ["Dan", "Randy", "Jon", "Ken", "Cody", "Mike", "Tyler"];
export const DEFAULT_JOB_TYPES = [
  "Precast", "Wood Fr", "Leveling", "Radiant Heat", "Prep",
  "Prime/Survey", "Laying Mat", "Site Visit", "Pick Up"
];
