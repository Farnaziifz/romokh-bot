import type { CommandContext, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { taskLine } from "../lib/format.js";

export async function listTasks(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const { rows } = await pool.query<Task>(
    "SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE ORDER BY deadline ASC",
    [chatId]
  );

  if (rows.length === 0) {
    await ctx.reply("تسک بازی نداری 🎉");
    return;
  }

  for (const task of rows) {
    const kb = new InlineKeyboard().text("✅ انجام شد", `done:${task.id}`);
    await ctx.reply(taskLine(task), { reply_markup: kb });
  }
}
