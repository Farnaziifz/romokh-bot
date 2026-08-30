import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { buildCalendar, buildHourPicker, buildMinutePicker } from "../lib/calendar.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

export async function pickDateTime(conversation: MyConversation, ctx: Context): Promise<Date | null> {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  const dateMsg = await ctx.reply("تاریخ رو انتخاب کن (یا رد کن اگه مهلت نداره):", {
    reply_markup: buildCalendar(year, month).row().text("بدون تاریخ", "cal:skip"),
  });

  let pickedDate: string | null = null;
  let dateSkipped = false;
  while (!pickedDate && !dateSkipped) {
    const cq = await conversation.waitForCallbackQuery(/^cal:(nav|pick|ignore|skip)/);
    const data = cq.callbackQuery.data;

    if (data === "cal:ignore") {
      await cq.answerCallbackQuery();
      continue;
    }

    if (data === "cal:skip") {
      dateSkipped = true;
      await cq.answerCallbackQuery();
      await ctx.api.editMessageText(dateMsg.chat.id, dateMsg.message_id, "بدون مهلت");
      continue;
    }

    if (data.startsWith("cal:nav:")) {
      const [, , ym] = data.split(":");
      const [y, m] = ym.split("-").map(Number);
      year = y;
      month = m;
      await cq.answerCallbackQuery();
      await cq.api.editMessageReplyMarkup(dateMsg.chat.id, dateMsg.message_id, {
        reply_markup: buildCalendar(year, month).row().text("بدون تاریخ", "cal:skip"),
      });
      continue;
    }

    if (data.startsWith("cal:pick:")) {
      pickedDate = data.replace("cal:pick:", "");
      await cq.answerCallbackQuery();
      await ctx.api.editMessageText(dateMsg.chat.id, dateMsg.message_id, `تاریخ: ${pickedDate}`);
    }
  }

  if (!pickedDate) return null;

  const hourMsg = await ctx.reply("ساعت رو انتخاب کن:", { reply_markup: buildHourPicker() });
  const hourCq = await conversation.waitForCallbackQuery(/^cal:hour:\d+$/);
  const hour = Number(hourCq.callbackQuery.data.split(":")[2]);
  await hourCq.answerCallbackQuery();
  await ctx.api.editMessageReplyMarkup(hourMsg.chat.id, hourMsg.message_id, {
    reply_markup: buildMinutePicker(hour),
  });

  const minCq = await conversation.waitForCallbackQuery(/^cal:minute:\d+:\d+$/);
  const [, , h, min] = minCq.callbackQuery.data.split(":");
  await minCq.answerCallbackQuery();

  const [y, mo, d] = pickedDate.split("-").map(Number);
  const deadline = new Date(y, mo - 1, d, Number(h), Number(min));

  await ctx.api.editMessageText(
    hourMsg.chat.id,
    hourMsg.message_id,
    `ساعت: ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
  );

  return deadline;
}
