import { pool } from "./db.js";
import type { Task } from "./db.js";

export async function completeTask(taskId: number, chatId: string): Promise<Task | null> {
  const { rows } = await pool.query<Task>(
    "UPDATE tasks SET done = TRUE, completed_at = now() WHERE id = $1 AND chat_id = $2 AND done = FALSE RETURNING *",
    [taskId, chatId]
  );
  const task = rows[0];
  if (!task) return null;

  if (task.is_recurring && task.recurrence_rule && task.due_at) {
    const nextDue = new Date(task.due_at);
    nextDue.setDate(nextDue.getDate() + (task.recurrence_rule === "daily" ? 1 : 7));
    await pool.query(
      `INSERT INTO tasks (chat_id, title, due_at, category, priority, is_recurring, recurrence_rule)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
      [task.chat_id, task.title, nextDue, task.category, task.priority, task.recurrence_rule]
    );
  }

  return task;
}
