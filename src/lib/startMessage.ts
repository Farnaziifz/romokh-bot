import { InlineKeyboard } from "grammy";

export const START_TEXT =
  "👋 خوش اومدی!\n\n" +
  "من ربات مدیریت تسکتم. اینجا هیچ کاری زیر پات نمی‌مونه. 🎯\n\n" +
  "💎 اضافه کردن سریع، فقط با یه پیام\n" +
  "💎 تقویم شمسی + دسته‌بندی + اولویت\n" +
  "💎 یادآوری هوشمند، نه فقط هر چند ساعت یه بوق\n" +
  "💎 گزارش هفتگی که راستشو می‌گه، نه فقط عدد\n\n" +
  "بزن بریم 🚀";

export function buildStartKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🚀 اولین تسک رو بساز", "start:add")
    .row()
    .text("📋 امروز", "start:today")
    .text("⭐ MIT", "start:mit")
    .row()
    .text("⚙️ تنظیمات", "start:settings")
    .text("📊 گزارش", "start:report");
}
