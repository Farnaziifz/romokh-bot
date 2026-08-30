import type { Context } from "grammy";
import { completeTask } from "../lib/completeTask.js";

export async function handleDoneCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^done:(\d+)$/);
  if (!m) return;

  const id = Number(m[1]);
  const chatId = ctx.chat!.id.toString();
  const task = await completeTask(id, chatId);

  if (!task) {
    await ctx.answerCallbackQuery({ text: "این تسک قبلاً انجام شده بود." });
    return;
  }

  await ctx.answerCallbackQuery({ text: "انجام شد ✅" });
  await ctx.editMessageText(`✅ انجام شد — #${id} ${task.title}`);
}
