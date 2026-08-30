import { getLocalParts, zonedTimeToUtc } from "./time.js";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

// [\s‌]* also matches the ZWNJ ("‌") Persian uses to join compounds like سه‌شنبه
const S = "[\\s\\u200C]*";

const DAY_OFFSET_WORDS: [RegExp, number][] = [
  [new RegExp(`پس${S}فردا`), 2],
  [/فردا/, 1],
  [/امروز/, 0],
];

// weekday -> JS-style 0=Sun..6=Sat
const WEEKDAY_WORDS: [RegExp, number][] = [
  [new RegExp(`یک${S}شنبه`), 0],
  [new RegExp(`دو${S}شنبه`), 1],
  [new RegExp(`سه${S}شنبه`), 2],
  [new RegExp(`چهار${S}شنبه`), 3],
  [new RegExp(`پنج${S}شنبه`), 4],
  [/جمعه/, 5],
  [/شنبه/, 6], // must come after یک/دو/سه/چهار/پنج‌شنبه so those match first
];

const TIME_RE = new RegExp(
  `ساعت${S}(\\d{1,2})(?:[:٫.](\\d{2}))?(?:${S}(و${S}نیم))?${S}(صبح|بعدازظهر|بعد${S}از${S}ظهر|عصر|شب)?`
);

export interface ParsedTask {
  cleanTitle: string;
  dueAt: Date | null;
}

export function parseTaskText(raw: string, now: Date, timeZone: string): ParsedTask {
  const text = normalizeDigits(raw.trim());
  let rest = text;
  let dayOffset: number | null = null;
  let targetWeekday: number | null = null;

  for (const [re, offset] of DAY_OFFSET_WORDS) {
    if (re.test(rest)) {
      dayOffset = offset;
      rest = rest.replace(re, " ");
      break;
    }
  }

  if (dayOffset === null) {
    for (const [re, weekday] of WEEKDAY_WORDS) {
      if (re.test(rest)) {
        targetWeekday = weekday;
        rest = rest.replace(re, " ");
        break;
      }
    }
  }

  let hour: number | null = null;
  let minute = 0;
  const timeMatch = rest.match(TIME_RE);
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    if (timeMatch[2]) minute = Number(timeMatch[2]);
    if (timeMatch[3]) minute = 30; // "و نیم"
    const meridiem = timeMatch[4];
    if (meridiem && meridiem !== "صبح" && hour < 12) hour += 12;
    // no am/pm word and an hour in 1-7: bias to PM, this is how tasks/reminders are usually meant
    else if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
    rest = rest.replace(TIME_RE, " ");
  }

  const cleanTitle = rest.replace(/[|,،]+/g, " ").replace(/\s+/g, " ").trim();

  if (dayOffset === null && targetWeekday === null && hour === null) {
    return { cleanTitle: cleanTitle || raw.trim(), dueAt: null };
  }

  const nowLocal = getLocalParts(now, timeZone);
  let year = nowLocal.year;
  let month = nowLocal.month;
  let day = nowLocal.day;
  const h = hour ?? 9; // default 09:00 when only a date/weekday was given
  const mi = hour === null ? 0 : minute;

  if (dayOffset !== null) {
    const base = new Date(Date.UTC(year, month - 1, day));
    base.setUTCDate(base.getUTCDate() + dayOffset);
    year = base.getUTCFullYear();
    month = base.getUTCMonth() + 1;
    day = base.getUTCDate();
  } else if (targetWeekday !== null) {
    let delta = (targetWeekday - nowLocal.weekday + 7) % 7;
    const base = new Date(Date.UTC(year, month - 1, day));
    base.setUTCDate(base.getUTCDate() + delta);
    year = base.getUTCFullYear();
    month = base.getUTCMonth() + 1;
    day = base.getUTCDate();
  }

  let dueAt = zonedTimeToUtc(year, month, day, h, mi, timeZone);

  // bare time with no date word, already passed today by more than a few minutes: assume tomorrow
  if (dayOffset === null && targetWeekday === null && hour !== null && dueAt.getTime() < now.getTime() - 5 * 60 * 1000) {
    dueAt = zonedTimeToUtc(year, month, day + 1, h, mi, timeZone);
  }

  return { cleanTitle: cleanTitle || raw.trim(), dueAt };
}
