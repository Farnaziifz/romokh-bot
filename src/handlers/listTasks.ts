import type { CommandContext, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { pool } from "../lib/db.js";
import type { Task } from "../lib/db.js";
import { taskLine } from "../lib/format.js";
import { getSettings } from "../lib/settings.js";
import { getMitTaskId } from "../lib/mit.js";
import { startOfLocalDay } from "../lib/time.js";
import { getCategories } from "../lib/categories.js";
import { buildCategoryFilterPicker } from "../lib/pickers.js";

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.due_at ? a.due_at.getTime() : Infinity;
    const bDue = b.due_at ? b.due_at.getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    const aPrio = a.priority ? PRIORITY_RANK[a.priority] : 3;
    const bPrio = b.priority ? PRIORITY_RANK[b.priority] : 3;
    return aPrio - bPrio;
  });
}

export async function fetchOpenTasks(chatId: string): Promise<Task[]> {
  const { rows } = await pool.query<Task>("SELECT * FROM tasks WHERE chat_id = $1 AND done = FALSE", [chatId]);
  return rows;
}

async function renderTasks(ctx: Context, chatId: string, tasks: Task[], emptyMessage: string) {
  if (tasks.length === 0) {
    await ctx.reply(emptyMessage);
    return;
  }

  const mitTaskId = await getMitTaskId(chatId, new Date(), (await getSettings(chatId)).timezone);
  for (const task of sortTasks(tasks)) {
    const kb = new InlineKeyboard()
      .text("✅ انجام شد", `done:${task.id}`)
      .row()
      .text("✏️ ویرایش", `taskedit:${task.id}`)
      .text("🗑 حذف", `taskdel:${task.id}`);
    await ctx.reply(taskLine(task, { isMit: task.id === mitTaskId }), { reply_markup: kb });
  }
}

export async function listToday(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const settings = await getSettings(chatId);
  const dayStart = startOfLocalDay(new Date(), settings.timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await fetchOpenTasks(chatId);
  const filtered = tasks.filter((t) => t.due_at && t.due_at.getTime() < dayEnd.getTime());
  await renderTasks(ctx, chatId, filtered, "برای امروز تسکی نداری 🎉");
}

export async function listWeek(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const settings = await getSettings(chatId);
  const dayStart = startOfLocalDay(new Date(), settings.timezone);
  const weekEnd = new Date(dayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tasks = await fetchOpenTasks(chatId);
  const filtered = tasks.filter((t) => t.due_at && t.due_at.getTime() < weekEnd.getTime());
  await renderTasks(ctx, chatId, filtered, "برای این هفته تسکی نداری 🎉");
}

export async function listAll(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const tasks = await fetchOpenTasks(chatId);
  await renderTasks(ctx, chatId, tasks, "تسک بازی نداری 🎉");
}

export async function renderCategoryTasks(ctx: Context, chatId: string, category: string) {
  const tasks = await fetchOpenTasks(chatId);
  const filtered = tasks.filter((t) => (t.category ?? "").toLowerCase() === category.toLowerCase());
  await renderTasks(ctx, chatId, filtered, `تسکی تو دسته «${category}» نداری`);
}

export async function listByCategory(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id.toString();
  const category = ctx.match?.toString().trim();
  if (!category) {
    await categoryFilterMenu(ctx);
    return;
  }
  await renderCategoryTasks(ctx, chatId, category);
}

export async function categoryFilterMenu(ctx: Context) {
  const chatId = ctx.chat!.id.toString();
  const categories = await getCategories(chatId);
  if (categories.length === 0) {
    await ctx.reply("هنوز دسته‌ای نساختی.");
    return;
  }
  await ctx.reply("کدوم دسته؟", { reply_markup: buildCategoryFilterPicker(categories) });
}

export async function handleCategoryFilterCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const m = data?.match(/^catpick:(.+)$/);
  if (!m) return;

  await ctx.answerCallbackQuery();
  const chatId = ctx.chat!.id.toString();
  const category = decodeURIComponent(m[1]);
  await renderCategoryTasks(ctx, chatId, category);
}
