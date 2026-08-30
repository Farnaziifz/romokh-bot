import cron from "node-cron";
import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "./db.js";
import type { Task } from "./db.js";
import { taskLine } from "./format.js";
import { getSettings } from "./settings.js";
import { getMitTaskId } from "./mit.js";
import { getLocalParts, isWithinQuietHours } from "./time.js";
import { runWeeklyReport } from "./weeklyReport.js";

const WEEKLY_REPORT_WEEKDAY = 4; // Thursday
const WEEKLY_REPORT_HOUR = 21;
const WEEKLY_REPORT_MIN_GAP_MS = 6 * 24 * 60 * 60 * 1000; // guard against re-firing within the same hour window across restarts

export function startScheduler<C extends Context>(bot: Bot<C>) {
  cron.schedule("0 * * * *", () => runHourlyTick(bot).catch((err) => console.error("scheduler tick failed:", err)));
}

async function getActiveChatIds(): Promise<string[]> {
  const { rows } = await pool.query<{ chat_id: string }>(
    "SELECT chat_id FROM settings UNION SELECT chat_id FROM tasks"
  );
  return rows.map((r) => r.chat_id);
}

async function runHourlyTick<C extends Context>(bot: Bot<C>) {
  const now = new Date();
  const chatIds = await getActiveChatIds();

  for (const chatId of chatIds) {
    const settings = await getSettings(chatId);
    const local = getLocalParts(now, settings.timezone);

    await maybeSendMitPrompt(bot, chatId, settings.timezone, local.hour, settings.quiet_hours_end);

    if (
      local.weekday === WEEKLY_REPORT_WEEKDAY &&
      local.hour === WEEKLY_REPORT_HOUR &&
      (!settings.last_report_at || now.getTime() - settings.last_report_at.getTime() > WEEKLY_REPORT_MIN_GAP_MS)
    ) {
      await runWeeklyReport(bot.api, chatId);
    }

    const intervalMs = settings.reminder_interval_hours * 60 * 60 * 1000;
    const dueForReminder =
      !settings.last_reminder_at || now.getTime() - settings.last_reminder_at.getTime() >= intervalMs;
    const quiet = isWithinQuietHours(now, settings.timezone, settings.quiet_hours_start, settings.quiet_hours_end);

    if (dueForReminder && !quiet) {
      await sendReminders(bot, chatId, settings.timezone);
      await pool.query("UPDATE settings SET last_reminder_at = $1 WHERE chat_id = $2", [now, chatId]);
    }
  }
}

async function maybeSendMitPrompt<C extends Context>(
  bot: Bot<C>,
  chatId: string,
  timeZone: string,
  localHour: number,
  wakeHour: number
) {
  if (localHour !== wakeHour) return;

  const now = new Date();
  const existing = await getMitTaskId(chatId, now, timeZone);
  if (existing) return;

  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE", [chatId]);
  if (rows.length === 0) return;

  const kb = new InlineKeyboard();
  for (const t of rows.slice(0, 20)) {
    kb.text(`#${t.id} ${t.title}`.slice(0, 60), `mit:${t.id}`).row();
  }

  try {
    await bot.api.sendMessage(chatId, "☀️ صبح بخیر! مهم‌ترین تسک امروز کدومه؟", { reply_markup: kb });
  } catch (err) {
    console.error(`failed to send MIT prompt to chat ${chatId}`, err);
  }
}

async function sendReminders<C extends Context>(bot: Bot<C>, chatId: string, timeZone: string) {
  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE", [chatId]);
  if (rows.length === 0) return;

  const mitTaskId = await getMitTaskId(chatId, new Date(), timeZone);

  for (const task of rows) {
    const kb = new InlineKeyboard().text("✅ انجام شد", `done:${task.id}`);
    try {
      await bot.api.sendMessage(chatId, `🔔 یادآوری\n${taskLine(task, { isMit: task.id === mitTaskId })}`, {
        reply_markup: kb,
      });
      await pool.query("UPDATE tasks SET reminder_count = reminder_count + 1 WHERE id = $1", [task.id]);
    } catch (err) {
      console.error(`failed to remind chat ${chatId} task ${task.id}`, err);
    }
  }
}
