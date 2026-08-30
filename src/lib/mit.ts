import { pool } from "./db.js";
import { localDateKey } from "./time.js";

export async function getMitTaskId(chatId: string, now: Date, timeZone: string): Promise<number | null> {
  const dateKey = localDateKey(now, timeZone);
  const { rows } = await pool.query<{ task_id: number }>(
    "SELECT task_id FROM mit WHERE chat_id = $1 AND mit_date = $2",
    [chatId, dateKey]
  );
  return rows[0]?.task_id ?? null;
}

export async function setMit(chatId: string, taskId: number, now: Date, timeZone: string): Promise<void> {
  const dateKey = localDateKey(now, timeZone);
  await pool.query(
    `INSERT INTO mit (chat_id, mit_date, task_id) VALUES ($1, $2, $3)
     ON CONFLICT (chat_id, mit_date) DO UPDATE SET task_id = EXCLUDED.task_id`,
    [chatId, dateKey, taskId]
  );
}
