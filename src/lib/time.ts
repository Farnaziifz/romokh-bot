export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun..6=Sat
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

export function localDateKey(date: Date, timeZone: string): string {
  const p = getLocalParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function isWithinQuietHours(date: Date, timeZone: string, start: number, end: number): boolean {
  const { hour } = getLocalParts(date, timeZone);
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // wraps past midnight, e.g. 22 -> 6
  return hour >= start || hour < end;
}

export function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  return localDateKey(a, timeZone) === localDateKey(b, timeZone);
}

export function startOfLocalDay(date: Date, timeZone: string): Date {
  const p = getLocalParts(date, timeZone);
  return zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone);
}

// Converts a local wall-clock time in `timeZone` to the correct UTC instant,
// via the standard double-conversion trick (works for fixed-offset zones like Asia/Tehran).
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = getLocalParts(guess, timeZone);
  const asUtcOfParts = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const offset = guess.getTime() - asUtcOfParts;
  return new Date(guess.getTime() + offset);
}
