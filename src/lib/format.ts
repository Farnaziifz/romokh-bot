import type { Task } from "./db.js";

export function parseDeadline(raw: string): Date | null {
  // expects "YYYY-MM-DD HH:mm"
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDeadline(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function taskLine(task: Task): string {
  const now = new Date();
  const overdue = task.deadline.getTime() < now.getTime();
  const flag = overdue ? "⏰ گذشته از مهلت" : "🕒 مهلت";
  return `#${task.id} — ${task.title}\n${flag}: ${formatDeadline(task.deadline)}`;
}
