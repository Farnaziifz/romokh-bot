import type { Context } from "grammy";
import { pool } from "../lib/db.js";

export async function handleDoneCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^done:(\d+)$/);
  if (!m) return;

  const id = Number(m[1]);
  const { rowCount } = await pool.query(
    "UPDATE tasks SET done = TRUE WHERE id = $1 AND done = FALSE",
    [id]
  );

  if (rowCount === 0) {
    await ctx.answerCallbackQuery({ text: "این تسک قبلاً انجام شده بود." });
    return;
  }

  await ctx.answerCallbackQuery({ text: "انجام شد ✅" });
  await ctx.editMessageText(`✅ انجام شد — #${id}`);
}
