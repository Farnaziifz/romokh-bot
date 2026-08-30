import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { getSettings } from "../lib/settings.js";
import { getMitTaskId, setMit } from "../lib/mit.js";
import { startOfLocalDay } from "../lib/time.js";

export async function mitCommand(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const settings = await getSettings(chatId);
  const now = new Date();

  const currentId = await getMitTaskId(chatId, now, settings.timezone);
  if (currentId) {
    const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE id = $1 AND chat_id = $2", [
      currentId,
      chatId,
    ]);
    const task = rows[0];
    if (task && !task.done) {
      await ctx.reply(`⭐ مهم‌ترین تسک امروز:\n#${task.id} — ${task.title}`);
      return;
    }
  }

  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE", [chatId]);
  if (rows.length === 0) {
    await ctx.reply("هیچ تسک بازی نداری که به عنوان MIT انتخاب کنی.");
    return;
  }

  const dayStart = startOfLocalDay(now, settings.timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const todays = rows.filter((t) => t.due_at && t.due_at.getTime() < dayEnd.getTime());
  const candidates = todays.length > 0 ? todays : rows;

  const kb = new InlineKeyboard();
  for (const t of candidates.slice(0, 20)) {
    kb.text(`#${t.id} ${t.title}`.slice(0, 60), `mit:${t.id}`).row();
  }

  await ctx.reply("مهم‌ترین تسک امروز کدومه؟", { reply_markup: kb });
}

export async function handleMitCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^mit:(\d+)$/);
  if (!m) return;

  const taskId = Number(m[1]);
  const chatId = ctx.chat!.id.toString();

  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE id = $1 AND chat_id = $2", [taskId, chatId]);
  const task = rows[0];
  if (!task) {
    await ctx.answerCallbackQuery({ text: "این تسک پیدا نشد." });
    return;
  }

  const settings = await getSettings(chatId);
  await setMit(chatId, taskId, new Date(), settings.timezone);

  await ctx.answerCallbackQuery({ text: "ثبت شد ⭐" });
  await ctx.editMessageText(`⭐ مهم‌ترین تسک امروز:\n#${taskId} — ${task.title}`);
}
