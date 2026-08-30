import type { CommandContext, Context } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { completeTask } from "../lib/completeTask.js";

export async function doneCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const arg = ctx.match?.toString().trim();
  if (!arg) {
    await ctx.reply("شماره یا بخشی از عنوان تسک رو بنویس: /done 5  یا  /done خرید نان");
    return;
  }

  if (/^\d+$/.test(arg)) {
    const task = await completeTask(Number(arg));
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
    const list = rows.map((t) => `#${t.id} — ${t.title}`).join("\n");
    await ctx.reply(`چند تا تسک با این عنوان پیدا شد، با شماره مشخص کن:\n${list}`);
    return;
  }

  const task = await completeTask(rows[0].id);
  await ctx.reply(`✅ انجام شد — #${task!.id} ${task!.title}`);
}
