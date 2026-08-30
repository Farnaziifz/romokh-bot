import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { pool } from "../lib/db.js";
import type { Priority, RecurrenceRule, Task } from "../lib/db.js";
import { buildPriorityPicker, buildRecurrencePicker } from "../lib/pickers.js";
import { taskLine } from "../lib/format.js";
import { pickDateTime } from "./pickDateTime.js";
import { pickCategory } from "./pickCategory.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

export async function addTaskConversation(conversation: MyConversation, ctx: Context) {
  const chatId = ctx.chat!.id.toString();

  await ctx.reply("عنوان تسک رو بفرست:");
  const titleCtx = await conversation.waitFor("message:text");
  const title = titleCtx.message.text.trim();

  const deadline = await pickDateTime(conversation, ctx);
  const category = await pickCategory(conversation, ctx, chatId);

  const prioMsg = await ctx.reply("اولویت؟", { reply_markup: buildPriorityPicker() });
  const prioCq = await conversation.waitForCallbackQuery(/^pick:prio:/);
  const prioValue = prioCq.callbackQuery.data.replace("pick:prio:", "");
  const priority = (prioValue === "__none__" ? null : prioValue) as Priority | null;
  await prioCq.answerCallbackQuery();
  await ctx.api.editMessageText(prioMsg.chat.id, prioMsg.message_id, `اولویت: ${priority ?? "بدون اولویت"}`);

  const recMsg = await ctx.reply("تکرار بشه؟", { reply_markup: buildRecurrencePicker() });
  const recCq = await conversation.waitForCallbackQuery(/^pick:rec:/);
  const recValue = recCq.callbackQuery.data.replace("pick:rec:", "");
  const recurrenceRule = (recValue === "__none__" ? null : recValue) as RecurrenceRule | null;
  await recCq.answerCallbackQuery();
  await ctx.api.editMessageText(
    recMsg.chat.id,
    recMsg.message_id,
    `تکرار: ${recurrenceRule === "daily" ? "روزانه" : recurrenceRule === "weekly" ? "هفتگی" : "نه"}`
  );

  const { rows } = await pool.query<Task>(
    `INSERT INTO tasks (chat_id, title, due_at, category, priority, is_recurring, recurrence_rule)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [chatId, title, deadline, category, priority, recurrenceRule !== null, recurrenceRule]
  );

  await ctx.reply(`✅ تسک ثبت شد\n\n${taskLine(rows[0])}`);
}
