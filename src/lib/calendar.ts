import { InlineKeyboard } from "grammy";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTH_NAMES = [
  "ژانویه", "فوریه", "مارس", "آوریل", "می", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

export function buildCalendar(year: number, month: number): InlineKeyboard {
  // month is 0-indexed
  const kb = new InlineKeyboard();
  kb.text(`${MONTH_NAMES[month]} ${year}`, "cal:ignore").row();
  kb.row(...WEEKDAYS.map((d) => InlineKeyboard.text(d, "cal:ignore")));

  const firstDay = new Date(year, month, 1);
  // JS getDay: 0=Sun..6=Sat, want week starting Saturday to match WEEKDAYS above
  const startOffset = (firstDay.getDay() + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: string[] = new Array(startOffset).fill("");
  for (let d = 1; d <= daysInMonth; d++) cells.push(String(d));
  while (cells.length % 7 !== 0) cells.push("");

  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    kb.row(
      ...week.map((day) =>
        day
          ? InlineKeyboard.text(
              day,
              `cal:pick:${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`
            )
          : InlineKeyboard.text(" ", "cal:ignore")
      )
    );
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  kb.row(
    InlineKeyboard.text("« قبلی", `cal:nav:${prev.getFullYear()}-${prev.getMonth()}`),
    InlineKeyboard.text("بعدی »", `cal:nav:${next.getFullYear()}-${next.getMonth()}`)
  );

  return kb;
}

export function buildHourPicker(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let row = 0; row < 4; row++) {
    const hours = [0, 1, 2, 3, 4, 5].map((i) => row * 6 + i);
    kb.row(...hours.map((h) => InlineKeyboard.text(String(h).padStart(2, "0"), `cal:hour:${h}`)));
  }
  return kb;
}

export function buildMinutePicker(hour: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.row(
    ...[0, 15, 30, 45].map((m) =>
      InlineKeyboard.text(String(m).padStart(2, "0"), `cal:minute:${hour}:${m}`)
    )
  );
  return kb;
}
