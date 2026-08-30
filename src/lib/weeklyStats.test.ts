import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeeklyStats } from "./weeklyStats.js";
import type { Task } from "./db.js";

const weekStart = new Date("2026-08-24T00:00:00Z");
const now = new Date("2026-08-31T00:00:00Z");

let nextId = 1;
function makeTask(overrides: Partial<Task>): Task {
  return {
    id: nextId++,
    chat_id: "1",
    title: `task ${nextId}`,
    category: null,
    priority: null,
    due_at: null,
    created_at: weekStart,
    completed_at: null,
    done: false,
    reminder_count: 0,
    carried_over_weeks: 0,
    is_recurring: false,
    recurrence_rule: null,
    ...overrides,
  };
}

test("completion rate is based on tasks added this week, not all open tasks", () => {
  const tasks = [
    makeTask({ created_at: weekStart, done: true, completed_at: new Date("2026-08-25T00:00:00Z") }),
    makeTask({ created_at: weekStart, done: false }),
    // an old carried-over task completed this week should NOT count toward this week's rate
    makeTask({ created_at: new Date("2026-08-01T00:00:00Z"), done: true, completed_at: new Date("2026-08-26T00:00:00Z") }),
  ];

  const stats = computeWeeklyStats(tasks, weekStart, now, null, null);

  assert.equal(stats.addedThisWeek, 2);
  assert.equal(stats.completedThisWeek, 2);
  assert.equal(stats.completionRate, 50); // 1 of 2 added-this-week tasks done
});

test("on-time vs late completion counted against due_at", () => {
  const tasks = [
    makeTask({
      created_at: weekStart,
      done: true,
      due_at: new Date("2026-08-26T00:00:00Z"),
      completed_at: new Date("2026-08-25T00:00:00Z"), // before due -> on time
    }),
    makeTask({
      created_at: weekStart,
      done: true,
      due_at: new Date("2026-08-26T00:00:00Z"),
      completed_at: new Date("2026-08-27T00:00:00Z"), // after due -> late
    }),
  ];

  const stats = computeWeeklyStats(tasks, weekStart, now, null, null);
  assert.equal(stats.onTime, 1);
  assert.equal(stats.late, 1);
});

test("lowest completion category flags the worst-performing category", () => {
  const tasks = [
    makeTask({ category: "Orchid", created_at: weekStart, done: true, completed_at: now }),
    makeTask({ category: "Orchid", created_at: weekStart, done: true, completed_at: now }),
    makeTask({ category: "Personal", created_at: weekStart, done: false }),
    makeTask({ category: "Personal", created_at: weekStart, done: false }),
  ];

  const stats = computeWeeklyStats(tasks, weekStart, now, null, null);
  assert.equal(stats.lowestCompletionCategory, "Personal");
});

test("overload warning fires only when open count grew vs last week", () => {
  const tasks = [makeTask({ done: false }), makeTask({ done: false })];

  const grew = computeWeeklyStats(tasks, weekStart, now, 1, null);
  const steady = computeWeeklyStats(tasks, weekStart, now, 2, null);
  const shrank = computeWeeklyStats(tasks, weekStart, now, 3, null);

  assert.equal(grew.overloadWarning, true);
  assert.equal(steady.overloadWarning, false);
  assert.equal(shrank.overloadWarning, false);
});

test("stuck tasks are open tasks carried 3+ weeks running", () => {
  const tasks = [
    makeTask({ done: false, carried_over_weeks: 3, title: "stuck one" }),
    makeTask({ done: false, carried_over_weeks: 2, title: "not yet stuck" }),
    makeTask({ done: true, carried_over_weeks: 5, title: "done, not stuck" }),
  ];

  const stats = computeWeeklyStats(tasks, weekStart, now, null, null);
  assert.equal(stats.stuckTasks.length, 1);
  assert.equal(stats.stuckTasks[0].title, "stuck one");
});

test("completion rate delta compares against last week when provided", () => {
  const tasks = [makeTask({ created_at: weekStart, done: true, completed_at: now })];
  const stats = computeWeeklyStats(tasks, weekStart, now, null, 40);
  assert.equal(stats.completionRate, 100);
  assert.equal(stats.completionRateDelta, 60);
});

test("no tasks added this week yields null completion rate, not zero", () => {
  const tasks = [makeTask({ created_at: new Date("2026-08-01T00:00:00Z"), done: false })];
  const stats = computeWeeklyStats(tasks, weekStart, now, null, null);
  assert.equal(stats.addedThisWeek, 0);
  assert.equal(stats.completionRate, null);
});
