import type { Context } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { getSettings } from "../lib/settings.js";
import { parseTaskText } from "../lib/dateParseFa.js";
import { taskLine } from "../lib/format.js";

export async function quickAdd(ctx: Context, rawText: string) {
  const text = rawText.trim();
  if (!text) {
    await ctx.reply("متن تسک رو بنویس. مثال:\nخرید نان فردا ساعت ۵");
    return;
  }

  const chatId = ctx.chat!.id.toString();
  const settings = await getSettings(chatId);
  const { cleanTitle, dueAt } = parseTaskText(text, new Date(), settings.timezone);

  const { rows } = await pool.query<Task>(
    "INSERT INTO tasks (chat_id, title, due_at) VALUES ($1, $2, $3) RETURNING *",
    [chatId, cleanTitle, dueAt]
  );

  await ctx.reply(`✅ تسک ثبت شد\n\n${taskLine(rows[0])}`);
}
