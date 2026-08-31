import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Priority, Task } from "../lib/db.js";
import { buildPriorityPicker } from "../lib/pickers.js";
import { taskLine } from "../lib/format.js";
import { pickDateTime } from "./pickDateTime.js";
import { pickCategory } from "./pickCategory.js";
import { fetchOpenTasks } from "../handlers/listTasks.js";

type MyContext = ConversationFlavor<Context>;
type MyConversation = Conversation<MyContext, Context>;

export async function editTaskConversation(conversation: MyConversation, ctx: Context, presetId?: number) {
  const chatId = ctx.chat!.id.toString();

  let id: number;
  if (presetId !== undefined) {
    id = presetId;
  } else {
    const openTasks = await fetchOpenTasks(chatId);
    if (openTasks.length === 0) {
      await ctx.reply("تسک بازی نداری.");
      return;
    }
    const kb = new InlineKeyboard();
    openTasks.forEach((t) => kb.text(`#${t.id} — ${t.title}`.slice(0, 60), `taskedit:${t.id}`).row());
    await ctx.reply("کدوم تسک رو ویرایش کنم؟", { reply_markup: kb });
    const pickCq = await conversation.waitForCallbackQuery(/^taskedit:\d+$/);
    id = Number(pickCq.callbackQuery.data.replace("taskedit:", ""));
    await pickCq.answerCallbackQuery();
  }

  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE id = $1 AND chat_id = $2", [id, chatId]);
  const task = rows[0];
  if (!task) {
    await ctx.reply("این تسک پیدا نشد.");
    return;
  }

  const fieldKb = new InlineKeyboard()
    .text("عنوان", "edit:title")
    .row()
    .text("تاریخ/ساعت", "edit:date")
    .row()
    .text("دسته", "edit:cat")
    .row()
    .text("اولویت", "edit:prio")
    .row()
    .text("لغو", "edit:cancel");

  await ctx.reply(`ویرایش #${task.id} — ${task.title}\nچی رو عوض کنم؟`, { reply_markup: fieldKb });
  const fieldCq = await conversation.waitForCallbackQuery(/^edit:/);
  const field = fieldCq.callbackQuery.data.replace("edit:", "");
  await fieldCq.answerCallbackQuery();

  if (field === "cancel") {
    await ctx.reply("باشه، چیزی عوض نشد.");
    return;
  }

  let updated: Task;

  if (field === "title") {
    await ctx.reply("عنوان جدید رو بفرست:");
    const msgCtx = await conversation.waitFor("message:text");
    const { rows: r } = await pool.query<Task>(
      "UPDATE tasks SET title = $1 WHERE id = $2 AND chat_id = $3 RETURNING *",
      [msgCtx.message.text.trim(), id, chatId]
    );
    updated = r[0];
  } else if (field === "date") {
    const deadline = await pickDateTime(conversation, ctx);
    const { rows: r } = await pool.query<Task>(
      "UPDATE tasks SET due_at = $1 WHERE id = $2 AND chat_id = $3 RETURNING *",
      [deadline, id, chatId]
    );
    updated = r[0];
  } else if (field === "cat") {
    const category = await pickCategory(conversation, ctx, chatId);
    const { rows: r } = await pool.query<Task>(
      "UPDATE tasks SET category = $1 WHERE id = $2 AND chat_id = $3 RETURNING *",
      [category, id, chatId]
    );
    updated = r[0];
  } else {
    const prioMsg = await ctx.reply("اولویت جدید؟", { reply_markup: buildPriorityPicker() });
    const prioCq = await conversation.waitForCallbackQuery(/^pick:prio:/);
    const prioValue = prioCq.callbackQuery.data.replace("pick:prio:", "");
    await prioCq.answerCallbackQuery();
    const priority = (prioValue === "__none__" ? null : prioValue) as Priority | null;
    await ctx.api.editMessageText(prioMsg.chat.id, prioMsg.message_id, `اولویت: ${priority ?? "بدون اولویت"}`);
    const { rows: r } = await pool.query<Task>(
      "UPDATE tasks SET priority = $1 WHERE id = $2 AND chat_id = $3 RETURNING *",
      [priority, id, chatId]
    );
    updated = r[0];
  }

  await ctx.reply(`✅ به‌روز شد\n\n${taskLine(updated)}`);
}
