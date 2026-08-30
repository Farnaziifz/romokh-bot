import type { Task } from "./db.js";

const REMINDER_ESCALATE_THRESHOLD = 3;

const PRIORITY_EMOJI: Record<string, string> = {
  high: "🔴",
  med: "🟡",
  low: "🟢",
};

export function formatDeadline(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function taskLine(task: Task, opts: { isMit?: boolean } = {}): string {
  const now = new Date();
  const parts: string[] = [];

  if (opts.isMit) parts.push("⭐");
  if (task.reminder_count >= REMINDER_ESCALATE_THRESHOLD) parts.push("⚠️");
  if (task.priority) parts.push(PRIORITY_EMOJI[task.priority]);

  const prefix = parts.length > 0 ? parts.join(" ") + " " : "";
  const lines = [`${prefix}#${task.id} — ${task.title}`];

  if (task.due_at) {
    const overdue = task.due_at.getTime() < now.getTime();
    const flag = overdue ? "⏰ گذشته از مهلت" : "🕒 مهلت";
    lines.push(`${flag}: ${formatDeadline(task.due_at)}`);
  }
  if (task.category) lines.push(`🏷 ${task.category}`);
  if (task.is_recurring) lines.push(`🔁 ${task.recurrence_rule === "daily" ? "روزانه" : "هفتگی"}`);

  return lines.join("\n");
}
