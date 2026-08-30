import type { Task } from "./db.js";

const NO_CATEGORY = "بدون دسته";
const STUCK_THRESHOLD_WEEKS = 3;

export interface CategoryStats {
  category: string;
  added: number;
  completed: number;
  open: number;
  completionRate: number | null;
}

export interface StuckTask {
  id: number;
  title: string;
  carriedOverWeeks: number;
}

export interface WeeklyStats {
  addedThisWeek: number;
  completedThisWeek: number;
  stillOpen: number;
  onTime: number;
  late: number;
  completionRate: number | null;
  completionRateDelta: number | null;
  byCategory: CategoryStats[];
  lowestCompletionCategory: string | null;
  overloadWarning: boolean;
  stuckTasks: StuckTask[];
}

/**
 * completionRate is defined as: of the tasks ADDED in this window, what % are now done.
 * (Not "all tasks completed this week / all open" — that would double-count old carried-over work.)
 */
export function computeWeeklyStats(
  tasks: Task[],
  weekStart: Date,
  now: Date,
  previousOpenCount: number | null,
  previousCompletionRate: number | null
): WeeklyStats {
  const addedThisWeek = tasks.filter((t) => t.created_at >= weekStart);
  const completedThisWeek = tasks.filter(
    (t) => t.completed_at && t.completed_at >= weekStart && t.completed_at <= now
  );
  const stillOpen = tasks.filter((t) => !t.done);

  let onTime = 0;
  let late = 0;
  for (const t of completedThisWeek) {
    if (!t.due_at || !t.completed_at) continue;
    if (t.completed_at.getTime() <= t.due_at.getTime()) onTime++;
    else late++;
  }

  const addedAndCompleted = addedThisWeek.filter((t) => t.done).length;
  const completionRate = addedThisWeek.length > 0 ? (addedAndCompleted / addedThisWeek.length) * 100 : null;

  const categories = new Set<string>();
  for (const t of tasks) {
    if (addedThisWeek.includes(t) || stillOpen.includes(t)) categories.add(t.category ?? NO_CATEGORY);
  }

  const byCategory: CategoryStats[] = [...categories].map((category) => {
    const addedInCat = addedThisWeek.filter((t) => (t.category ?? NO_CATEGORY) === category);
    const completedInCat = addedInCat.filter((t) => t.done).length;
    const openInCat = stillOpen.filter((t) => (t.category ?? NO_CATEGORY) === category).length;
    return {
      category,
      added: addedInCat.length,
      completed: completedInCat,
      open: openInCat,
      completionRate: addedInCat.length > 0 ? (completedInCat / addedInCat.length) * 100 : null,
    };
  });

  const ranked = byCategory.filter((c) => c.completionRate !== null);
  const lowestCompletionCategory =
    ranked.length > 0
      ? ranked.reduce((min, c) => (c.completionRate! < min.completionRate! ? c : min)).category
      : null;

  const overloadWarning = previousOpenCount !== null && stillOpen.length > previousOpenCount;

  const stuckTasks: StuckTask[] = stillOpen
    .filter((t) => t.carried_over_weeks >= STUCK_THRESHOLD_WEEKS)
    .map((t) => ({ id: t.id, title: t.title, carriedOverWeeks: t.carried_over_weeks }));

  const completionRateDelta =
    previousCompletionRate !== null && completionRate !== null ? completionRate - previousCompletionRate : null;

  return {
    addedThisWeek: addedThisWeek.length,
    completedThisWeek: completedThisWeek.length,
    stillOpen: stillOpen.length,
    onTime,
    late,
    completionRate,
    completionRateDelta,
    byCategory,
    lowestCompletionCategory,
    overloadWarning,
    stuckTasks,
  };
}

export function formatWeeklyReport(stats: WeeklyStats): string {
  const lines: string[] = [];
  lines.push("📊 گزارش هفتگی");
  lines.push("");
  lines.push(`اضافه‌شده این هفته: ${stats.addedThisWeek}`);
  lines.push(`تکمیل‌شده این هفته: ${stats.completedThisWeek}`);
  lines.push(`هنوز باز: ${stats.stillOpen}`);
  lines.push(
    `نرخ تکمیل: ${stats.completionRate === null ? "—" : stats.completionRate.toFixed(0) + "%"}` +
      (stats.completionRateDelta !== null
        ? ` (${stats.completionRateDelta >= 0 ? "+" : ""}${stats.completionRateDelta.toFixed(0)}٪ نسبت به هفته قبل)`
        : "")
  );
  lines.push(`به‌موقع: ${stats.onTime} | دیرکرد: ${stats.late}`);

  if (stats.byCategory.length > 0) {
    lines.push("");
    lines.push("بر اساس دسته:");
    for (const c of stats.byCategory) {
      const rate = c.completionRate === null ? "—" : `${c.completionRate.toFixed(0)}%`;
      lines.push(`• ${c.category}: اضافه ${c.added}، تکمیل ${c.completed}، باز ${c.open}، نرخ ${rate}`);
    }
  }

  if (stats.lowestCompletionCategory) {
    lines.push("");
    lines.push(`⚠️ کمترین نرخ تکمیل: ${stats.lowestCompletionCategory}`);
  }

  if (stats.overloadWarning) {
    lines.push("");
    lines.push("🚨 تعداد تسک‌های باز نسبت به هفته قبل بیشتر شده — داری عقب می‌افتی.");
  }

  if (stats.stuckTasks.length > 0) {
    lines.push("");
    for (const t of stats.stuckTasks) {
      lines.push(`🚨 این تسک ${t.carriedOverWeeks} هفته پشت سر همه که باز مونده: #${t.id} ${t.title}`);
    }
  }

  return lines.join("\n");
}
