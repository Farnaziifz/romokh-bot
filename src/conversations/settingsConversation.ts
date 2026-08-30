import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getSettings, updateSettings } from "../lib/settings.js";
import { buildHourPicker } from "../lib/calendar.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

const INTERVAL_CHOICES = [1, 2, 3, 4, 6, 8, 12];

function buildIntervalPicker(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const h of INTERVAL_CHOICES) kb.text(`${h} ساعت`, `set:interval:${h}`);
  return kb;
}

function summary(s: { reminder_interval_hours: number; quiet_hours_start: number; quiet_hours_end: number }) {
  return (
    `⚙️ تنظیمات فعلی:\n` +
    `بازه یادآوری: هر ${s.reminder_interval_hours} ساعت\n` +
    `ساعت سکوت: ${String(s.quiet_hours_start).padStart(2, "0")}:00 تا ${String(s.quiet_hours_end).padStart(2, "0")}:00`
  );
}

export async function settingsConversation(conversation: MyConversation, ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  let settings = await conversation.external(() => getSettings(chatId));

  while (true) {
    const menuKb = new InlineKeyboard()
      .text("بازه یادآوری", "set:menu:interval")
      .row()
      .text("ساعت شروع سکوت", "set:menu:qstart")
      .row()
      .text("ساعت پایان سکوت", "set:menu:qend")
      .row()
      .text("تمام", "set:menu:done");

    await ctx.reply(summary(settings), { reply_markup: menuKb });
    const menuCq = await conversation.waitForCallbackQuery(/^set:menu:/);
    const choice = menuCq.callbackQuery.data.replace("set:menu:", "");
    await menuCq.answerCallbackQuery();

    if (choice === "done") {
      await ctx.reply("باشه، تنظیمات ذخیره‌ست ✅");
      return;
    }

    if (choice === "interval") {
      await ctx.reply("هر چند ساعت یادآوری بشه؟", { reply_markup: buildIntervalPicker() });
      const cq = await conversation.waitForCallbackQuery(/^set:interval:\d+$/);
      const hours = Number(cq.callbackQuery.data.split(":")[2]);
      await cq.answerCallbackQuery();
      settings = await conversation.external(() => updateSettings(chatId, { reminder_interval_hours: hours }));
      continue;
    }

    if (choice === "qstart" || choice === "qend") {
      await ctx.reply("ساعت رو انتخاب کن:", { reply_markup: buildHourPicker() });
      const cq = await conversation.waitForCallbackQuery(/^cal:hour:\d+$/);
      const hour = Number(cq.callbackQuery.data.split(":")[2]);
      await cq.answerCallbackQuery();
      const patch = choice === "qstart" ? { quiet_hours_start: hour } : { quiet_hours_end: hour };
      settings = await conversation.external(() => updateSettings(chatId, patch));
      continue;
    }
  }
}
