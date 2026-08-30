import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { jalaaliToDateObject } from "jalaali-js";
import { buildCalendar, buildHourPicker, buildMinutePicker, todayJalaali } from "../lib/calendar.js";
import { toFaDigits } from "../lib/farsiDigits.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

export async function pickDateTime(conversation: MyConversation, ctx: Context): Promise<Date | null> {
  const today = todayJalaali();
  let jy = today.jy;
  let jm = today.jm;
  const dateMsg = await ctx.reply("تاریخ رو انتخاب کن (یا رد کن اگه مهلت نداره):", {
    reply_markup: buildCalendar(jy, jm).row().text("بدون تاریخ", "cal:skip"),
  });

  let pickedDate: string | null = null; // "jy-jm-jd"
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
      jy = y;
      jm = m;
      await cq.answerCallbackQuery();
      await cq.api.editMessageReplyMarkup(dateMsg.chat.id, dateMsg.message_id, {
        reply_markup: buildCalendar(jy, jm).row().text("بدون تاریخ", "cal:skip"),
      });
      continue;
    }

    if (data.startsWith("cal:pick:")) {
      pickedDate = data.replace("cal:pick:", "");
      await cq.answerCallbackQuery();
      await ctx.api.editMessageText(
        dateMsg.chat.id,
        dateMsg.message_id,
        `تاریخ: ${toFaDigits(pickedDate.replace(/-/g, "/"))}`
      );
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

  const [py, pm, pd] = pickedDate.split("-").map(Number);
  const deadline = jalaaliToDateObject(py, pm, pd, Number(h), Number(min));

  await ctx.api.editMessageText(
    hourMsg.chat.id,
    hourMsg.message_id,
    `ساعت: ${toFaDigits(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`)}`
  );

  return deadline;
}
