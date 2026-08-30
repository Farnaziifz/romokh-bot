import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { buildCategoryPicker } from "../lib/pickers.js";
import { getCategories } from "../lib/categories.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

export async function pickCategory(conversation: MyConversation, ctx: Context, chatId: string): Promise<string | null> {
  const categories = await getCategories(chatId);
  const catMsg = await ctx.reply("دسته‌بندی؟ (اگه چیزی نداری، اول باید یکی بسازی)", {
    reply_markup: buildCategoryPicker(categories),
  });
  const catCq = await conversation.waitForCallbackQuery(/^pick:cat:/);
  const data = catCq.callbackQuery.data;
  await catCq.answerCallbackQuery();

  let category: string | null;
  if (data === "pick:cat:__none__") {
    category = null;
  } else if (data === "pick:cat:__new__") {
    await ctx.reply("اسم دسته جدید رو بفرست:");
    const msgCtx = await conversation.waitFor("message:text");
    category = msgCtx.message.text.trim();
  } else {
    const idx = Number(data.replace("pick:cat:idx:", ""));
    category = categories[idx] ?? null;
  }

  await ctx.api.editMessageText(catMsg.chat.id, catMsg.message_id, `دسته: ${category ?? "بدون دسته"}`);
  return category;
}
