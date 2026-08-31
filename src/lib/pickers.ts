import { InlineKeyboard } from "grammy";

export function buildCategoryPicker(existingCategories: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  existingCategories.forEach((cat, i) => kb.text(cat, `pick:cat:idx:${i}`).row());
  kb.text("➕ دسته جدید", "pick:cat:__new__").row();
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

export function buildCategoryFilterPicker(categories: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  categories.forEach((cat) => kb.text(cat, `catpick:${encodeURIComponent(cat)}`).row());
  return kb;
}

export function buildRecurrencePicker(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔁 روزانه", "pick:rec:daily")
    .text("🔁 هفتگی", "pick:rec:weekly")
    .row()
    .text("تکرار نشه", "pick:rec:__none__");
}
