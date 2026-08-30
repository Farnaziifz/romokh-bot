import "dotenv/config";
import { Bot } from "grammy";
import type { Context } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { ConversationFlavor } from "@grammyjs/conversations";
import { addTaskConversation } from "./conversations/addTaskConversation.js";
import { listTasks } from "./handlers/listTasks.js";
import { handleDoneCallback } from "./handlers/doneCallback.js";
import { startScheduler } from "./lib/scheduler.js";

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

bot.command("start", (ctx) =>
  ctx.reply(
    "سلام! دستورها:\n" +
      "/addtask — اضافه کردن تسک (عنوان می‌پرسم، بعد تقویم باز میشه)\n" +
      "/tasks — لیست تسک‌های باز\n\n" +
      "هر ۳ ساعت یادآوری می‌فرستم برای تسک‌هایی که دان نزدی."
  )
);
bot.command("addtask", (ctx) => ctx.conversation.enter("addTask"));
bot.command("tasks", listTasks);
bot.on("callback_query:data", handleDoneCallback);

bot.catch((err) => console.error("bot error:", err));

startScheduler(bot);
bot.start();
console.log("divine-taskbot running");
