import { InlineKeyboard } from "grammy";

export const CATEGORIES = ["Orchid", "Divine Style", "Mont Valier", "Centropy", "Personal"];

export function buildCategoryPicker(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const cat of CATEGORIES) kb.text(cat, `pick:cat:${cat}`).row();
  kb.text("بدون دسته", "pick:cat:__none__");
  return kb;
}

export function buildPriorityPicker(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔴 بالا", "pick:prio:high")
    .text("🟡 متوسط", "pick:prio:med")
    .text("🟢 پایین", "pick:prio:low")
    .row()
    .text("بدون اولویت", "pick:prio:__none__");
}

export function buildRecurrencePicker(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔁 روزانه", "pick:rec:daily")
    .text("🔁 هفتگی", "pick:rec:weekly")
    .row()
    .text("تکرار نشه", "pick:rec:__none__");
}
