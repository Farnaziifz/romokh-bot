import type { CommandContext, Context } from "grammy";
import { pool } from "../lib/db.js";
import { parseDeadline, formatDeadline } from "../lib/format.js";

export async function addTask(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const raw = ctx.match?.toString().trim() ?? "";
  const parts = raw.split("|").map((p) => p.trim());

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    await ctx.reply(
      "فرمت درست:\n/addtask عنوان تسک | YYYY-MM-DD HH:mm\n\nمثال:\n/addtask خرید نان | 2026-09-01 18:00"
    );
    return;
  }

  const [title, deadlineRaw] = parts;
  const deadline = parseDeadline(deadlineRaw);
  if (!deadline) {
    await ctx.reply("فرمت تاریخ نامعتبره. باید مثل این باشه: 2026-09-01 18:00");
    return;
  }

  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO tasks (chat_id, title, deadline) VALUES ($1, $2, $3) RETURNING id",
    [chatId, title, deadline]
  );

  await ctx.reply(`✅ تسک ثبت شد #${rows[0].id}\n${title}\nمهلت: ${formatDeadline(deadline)}`);
}
