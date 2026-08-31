import type { CommandContext, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { completeTask } from "../lib/completeTask.js";
import { listAll } from "./listTasks.js";

export async function doneCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const arg = ctx.match?.toString().trim();
  if (!arg) {
    await listAll(ctx);
    return;
  }

  if (/^\d+$/.test(arg)) {
    const task = await completeTask(Number(arg), chatId);
    if (!task) {
      await ctx.reply("این تسک پیدا نشد یا قبلاً انجام شده.");
      return;
    }
    await ctx.reply(`✅ انجام شد — #${task.id} ${task.title}`);
    return;
  }

  const { rows } = await pool.query<Task>(
    "SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE AND title ILIKE $2",
    [chatId, `%${arg}%`]
  );

  if (rows.length === 0) {
    await ctx.reply("تسکی با این عنوان پیدا نشد.");
    return;
  }
  if (rows.length > 1) {
    const kb = new InlineKeyboard();
    rows.forEach((t) => kb.text(`#${t.id} — ${t.title}`.slice(0, 60), `done:${t.id}`).row());
    await ctx.reply("چند تا تسک با این عنوان پیدا شد، کدومو انجام بدم؟", { reply_markup: kb });
    return;
  }

  const task = await completeTask(rows[0].id, chatId);
  await ctx.reply(`✅ انجام شد — #${task!.id} ${task!.title}`);
}
