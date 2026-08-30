import type { Api } from "grammy";
import { pool } from "./db.js";
import type { Task } from "./db.js";
import { getSettings, updateSettings } from "./settings.js";
import { computeWeeklyStats, formatWeeklyReport } from "./weeklyStats.js";

export async function runWeeklyReport(api: Api, chatId: string): Promise<void> {
  const settings = await getSettings(chatId);
  const now = new Date();
  const weekStart = settings.last_report_at ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE chat_id = $1", [chatId]);
  const stats = computeWeeklyStats(
    rows,
    weekStart,
    now,
    settings.last_report_open_count,
    settings.last_report_completion_rate
  );

  await api.sendMessage(chatId, formatWeeklyReport(stats));

  await pool.query("UPDATE tasks SET carried_over_weeks = carried_over_weeks + 1 WHERE chat_id = $1 AND done = FALSE", [
    chatId,
  ]);

  await updateSettings(chatId, {
    last_report_at: now,
    last_report_open_count: stats.stillOpen,
    last_report_completion_rate: stats.completionRate,
  });
}
