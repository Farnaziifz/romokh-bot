import "dotenv/config";
import { Bot } from "grammy";
import { addTask } from "./handlers/addTask.js";
import { listTasks } from "./handlers/listTasks.js";
import { handleDoneCallback } from "./handlers/doneCallback.js";
import { startScheduler } from "./lib/scheduler.js";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN missing in env");

const allowedIds = (process.env.ALLOWED_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const bot = new Bot(token);

if (allowedIds.length > 0) {
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId || !allowedIds.includes(userId)) return;
    await next();
  });
}

bot.command("start", (ctx) =>
  ctx.reply(
    "سلام! دستورها:\n" +
      "/addtask عنوان | YYYY-MM-DD HH:mm — اضافه کردن تسک\n" +
      "/tasks — لیست تسک‌های باز\n\n" +
      "هر ۳ ساعت یادآوری می‌فرستم برای تسک‌هایی که دان نزدی."
  )
);
bot.command("addtask", addTask);
bot.command("tasks", listTasks);
bot.on("callback_query:data", handleDoneCallback);

bot.catch((err) => console.error("bot error:", err));

startScheduler(bot);
bot.start();
console.log("divine-taskbot running");
