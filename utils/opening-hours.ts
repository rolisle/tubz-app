import type { OpeningHours, WeekDay } from "../types";

export const WEEK_DAYS: WeekDay[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const DAY_LABELS: Record<WeekDay, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_FULL: Record<WeekDay, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** JS getDay() (0 = Sunday) → WeekDay */
const JS_TO_WEEKDAY: WeekDay[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export function fmt12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m
    ? `${h12}:${m.toString().padStart(2, "0")}${period}`
    : `${h12}${period}`;
}

/**
 * Parse loose time input into "HH:MM".
 * Accepts: "9", "09", "900", "0900", "9:00", "09:00", "9:30", "930"
 */
export function parseTimeInput(raw: string): string | null {
  const cleaned = raw.replace(":", "").replace(".", "").trim();
  if (!/^\d{1,4}$/.test(cleaned)) return null;
  let h: number, m: number;
  if (cleaned.length <= 2) {
    h = parseInt(cleaned, 10);
    m = 0;
  } else {
    h = parseInt(cleaned.slice(0, cleaned.length - 2), 10);
    m = parseInt(cleaned.slice(-2), 10);
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;
  color: string;
}

export function getOpenStatus(
  hours: OpeningHours | undefined,
): OpenStatus | null {
  if (!hours || Object.keys(hours).length === 0) return null;

  const now = new Date();
  const jsDay = now.getDay();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const todayKey = JS_TO_WEEKDAY[jsDay];
  const todayHours = hours[todayKey];

  if (todayHours) {
    const openMins = timeToMinutes(todayHours.open);
    const closeMins = timeToMinutes(todayHours.close);

    if (currentMins >= openMins && currentMins < closeMins) {
      return {
        isOpen: true,
        label: `Closes ${fmt12(todayHours.close)}`,
        color: "#22c55e",
      };
    }
    if (currentMins < openMins) {
      return {
        isOpen: false,
        label: `Opens ${fmt12(todayHours.open)}`,
        color: "#ef4444",
      };
    }
  }

  // Find next opening across the week
  for (let i = 1; i <= 7; i++) {
    const nextJsDay = (jsDay + i) % 7;
    const nextKey = JS_TO_WEEKDAY[nextJsDay];
    const nextHours = hours[nextKey];
    if (nextHours) {
      const prefix = i === 1 ? "Tomorrow" : DAY_LABELS[nextKey];
      return {
        isOpen: false,
        label: `Opens ${prefix} ${fmt12(nextHours.open)}`,
        color: "#ef4444",
      };
    }
  }

  return { isOpen: false, label: "Closed", color: "#ef4444" };
}
