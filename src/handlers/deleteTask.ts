import type { CommandContext, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { scheduleDelete, cancelDelete } from "../lib/pendingDelete.js";
import { listAll } from "./listTasks.js";

async function deleteTaskById(ctx: Context, chatId: string, id: number) {
  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE id = $1 AND chat_id = $2", [id, chatId]);
  const task = rows[0];
  if (!task) {
    await ctx.reply("این تسک پیدا نشد.");
    return;
  }

  scheduleDelete(task.id, async () => {
    await pool.query("DELETE FROM tasks WHERE id = $1", [task.id]);
  });

  const kb = new InlineKeyboard().text("↩️ برگردون", `undo:${task.id}`);
  await ctx.reply(`🗑 حذف شد (تا ۱۰ ثانیه میتونی برگردونی)\n#${task.id} — ${task.title}`, {
    reply_markup: kb,
  });
}

export async function deleteCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const arg = ctx.match?.toString().trim();
  if (!arg || !/^\d+$/.test(arg)) {
    await listAll(ctx);
    return;
  }
  await deleteTaskById(ctx, chatId, Number(arg));
}

export async function handleDeleteButtonCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^taskdel:(\d+)$/);
  if (!m) return;

  await ctx.answerCallbackQuery();
  const chatId = ctx.chat!.id.toString();
  await deleteTaskById(ctx, chatId, Number(m[1]));
}

export async function handleUndoCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^undo:(\d+)$/);
  if (!m) return;

  const id = Number(m[1]);
  const restored = cancelDelete(id);

  if (restored) {
    await ctx.answerCallbackQuery({ text: "برگشت داده شد" });
    await ctx.editMessageText(`↩️ حذف لغو شد — #${id}`);
  } else {
    await ctx.answerCallbackQuery({ text: "دیگه دیر شده، حذف انجام شد." });
  }
}
