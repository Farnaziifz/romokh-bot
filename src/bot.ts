import "dotenv/config";
import { Bot } from "grammy";
import type { Context } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { ConversationFlavor } from "@grammyjs/conversations";
import { addTaskConversation } from "./conversations/addTaskConversation.js";
import { editTaskConversation } from "./conversations/editTaskConversation.js";
import { settingsConversation } from "./conversations/settingsConversation.js";
import { quickAdd } from "./handlers/quickAdd.js";
import { listToday, listWeek, listAll, listByCategory } from "./handlers/listTasks.js";
import { handleDoneCallback } from "./handlers/doneCallback.js";
import { doneCommand } from "./handlers/doneCommand.js";
import { deleteCommand, handleUndoCallback } from "./handlers/deleteTask.js";
import { mitCommand, handleMitCallback } from "./handlers/mit.js";
import { reportCommand } from "./handlers/report.js";
import { startScheduler } from "./lib/scheduler.js";
import { START_TEXT, buildStartKeyboard } from "./lib/startMessage.js";

type MyContext = ConversationFlavor<Context>;

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN missing in env");

const allowedIds = (process.env.ALLOWED_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const bot = new Bot<MyContext>(token);

if (allowedIds.length > 0) {
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId || !allowedIds.includes(userId)) return;
    await next();
  });
}

bot.use(conversations());
bot.use(createConversation(addTaskConversation, "addTask"));
bot.use(createConversation(editTaskConversation, "editTask"));
bot.use(createConversation(settingsConversation, "settings"));

bot.command("start", (ctx) =>
  ctx.reply(START_TEXT, { reply_markup: buildStartKeyboard() })
);

bot.command("help", (ctx) =>
  ctx.reply(
    "دستورها:\n\n" +
      "/add متن — اضافه کردن سریع (مثال: خرید نان فردا ساعت ۵)\n" +
      "پیام معمولی هم مثل /add عمل می‌کنه\n" +
      "/addtask — اضافه کردن با تقویم و دسته/اولویت/تکرار\n" +
      "/today /week /all — لیست تسک‌های باز\n" +
      "/category نام — فیلتر بر اساس دسته\n" +
      "/done شماره یا متن — انجام‌شده علامت بزن\n" +
      "/edit شماره — ویرایش تسک\n" +
      "/delete شماره — حذف (با ۱۰ ثانیه فرصت برگشت)\n" +
      "/mit — مهم‌ترین تسک امروز\n" +
      "/report — گزارش هفتگی دستی\n" +
      "/settings — بازه یادآوری و ساعت سکوت\n\n" +
      "هر چند ساعت (قابل تنظیم) یادآوری می‌فرستم برای تسک‌هایی که دان نزدی، جز تو ساعت سکوت."
  )
);

bot.command("add", (ctx) => quickAdd(ctx, ctx.match?.toString() ?? ""));
bot.command("addtask", (ctx) => ctx.conversation.enter("addTask"));
bot.command("today", listToday);
bot.command("week", listWeek);
bot.command("all", listAll);
bot.command("category", listByCategory);
bot.command("done", doneCommand);
bot.command("edit", (ctx) => ctx.conversation.enter("editTask"));
bot.command("delete", deleteCommand);
bot.command("mit", mitCommand);
bot.command("report", reportCommand);
bot.command("settings", (ctx) => ctx.conversation.enter("settings"));

bot.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("done:")) return handleDoneCallback(ctx);
  if (data.startsWith("undo:")) return handleUndoCallback(ctx);
  if (data.startsWith("mit:")) return handleMitCallback(ctx);

  if (data === "start:add") {
    await ctx.answerCallbackQuery();
    return ctx.conversation.enter("addTask");
  }
  if (data === "start:today") {
    await ctx.answerCallbackQuery();
    return listToday(ctx);
  }
  if (data === "start:mit") {
    await ctx.answerCallbackQuery();
    return mitCommand(ctx);
  }
  if (data === "start:settings") {
    await ctx.answerCallbackQuery();
    return ctx.conversation.enter("settings");
  }
  if (data === "start:report") {
    await ctx.answerCallbackQuery();
    return reportCommand(ctx);
  }

  return next();
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return; // unmatched command, don't quick-add garbage
  await quickAdd(ctx, ctx.message.text);
});

bot.catch((err) => console.error("bot error:", err));

async function setupCommandMenu() {
  await bot.api.setMyCommands([
    { command: "start", description: "شروع" },
    { command: "help", description: "لیست کامل دستورها" },
    { command: "add", description: "افزودن سریع تسک" },
    { command: "addtask", description: "افزودن با تقویم، دسته، اولویت" },
    { command: "today", description: "تسک‌های امروز" },
    { command: "week", description: "تسک‌های این هفته" },
    { command: "all", description: "همه تسک‌های باز" },
    { command: "category", description: "فیلتر بر اساس دسته" },
    { command: "done", description: "انجام‌شده علامت بزن" },
    { command: "edit", description: "ویرایش تسک" },
    { command: "delete", description: "حذف تسک" },
    { command: "mit", description: "مهم‌ترین تسک امروز" },
    { command: "report", description: "گزارش هفتگی" },
    { command: "settings", description: "بازه یادآوری و ساعت سکوت" },
  ]);
  await bot.api.setChatMenuButton({ menu_button: { type: "commands" } });
}

startScheduler(bot);
await setupCommandMenu();
bot.start();
console.log("divine-taskbot running");
