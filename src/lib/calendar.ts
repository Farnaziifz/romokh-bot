import { InlineKeyboard } from "grammy";
import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";
import { toFaDigits } from "./farsiDigits.js";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function todayJalaali(): { jy: number; jm: number; jd: number } {
  return toJalaali(new Date());
}

export function buildCalendar(jy: number, jm: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text(`${MONTH_NAMES[jm - 1]} ${toFaDigits(jy)}`, "cal:ignore");
  kb.row(...WEEKDAYS.map((d) => InlineKeyboard.text(d, "cal:ignore")));

  const { gy, gm, gd } = toGregorian(jy, jm, 1);
  const firstDay = new Date(gy, gm - 1, gd);
  // JS getDay: 0=Sun..6=Sat, want week starting Saturday to match WEEKDAYS above
  const startOffset = (firstDay.getDay() + 1) % 7;
  const daysInMonth = jalaaliMonthLength(jy, jm);
  const today = todayJalaali();

  const cells: number[] = new Array(startOffset).fill(0);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(0);

  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    kb.row(
      ...week.map((day) => {
        if (!day) return InlineKeyboard.text(" ", "cal:ignore");
        const isToday = day === today.jd && jm === today.jm && jy === today.jy;
        const label = isToday ? `•${toFaDigits(day)}•` : toFaDigits(day);
        return InlineKeyboard.text(label, `cal:pick:${jy}-${String(jm).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      })
    );
  }

  const prevMonth = jm === 1 ? 12 : jm - 1;
  const prevYear = jm === 1 ? jy - 1 : jy;
  const nextMonth = jm === 12 ? 1 : jm + 1;
  const nextYear = jm === 12 ? jy + 1 : jy;
  kb.row(
    InlineKeyboard.text("« قبلی", `cal:nav:${prevYear}-${prevMonth}`),
    InlineKeyboard.text("بعدی »", `cal:nav:${nextYear}-${nextMonth}`)
  );

  return kb;
}

export function buildHourPicker(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let row = 0; row < 4; row++) {
    const hours = [0, 1, 2, 3, 4, 5].map((i) => row * 6 + i);
    kb.row(...hours.map((h) => InlineKeyboard.text(toFaDigits(String(h).padStart(2, "0")), `cal:hour:${h}`)));
  }
  return kb;
}

export function buildMinutePicker(hour: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.row(
    ...[0, 15, 30, 45].map((m) =>
      InlineKeyboard.text(toFaDigits(String(m).padStart(2, "0")), `cal:minute:${hour}:${m}`)
    )
  );
  return kb;
}
