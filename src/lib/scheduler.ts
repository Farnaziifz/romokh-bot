import cron from "node-cron";
import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "./db.js";
import type { Task } from "./db.js";
import { taskLine } from "./format.js";

export function startScheduler(bot: Bot<Context>) {
  // every 3 hours, on the hour
  cron.schedule("0 */3 * * *", () => runReminders(bot));
}

export async function runReminders(bot: Bot<Context>) {
  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE done = FALSE");

  for (const task of rows) {
    const kb = new InlineKeyboard().text("✅ انجام شد", `done:${task.id}`);
    try {
      await bot.api.sendMessage(task.chat_id, `🔔 یادآوری\n${taskLine(task)}`, {
        reply_markup: kb,
      });
    } catch (err) {
      console.error(`failed to remind chat ${task.chat_id} task ${task.id}`, err);
    }
  }
}
