import { pool } from "./db.js";

export async function getCategories(chatId: string): Promise<string[]> {
  const { rows } = await pool.query<{ category: string }>(
    "SELECT DISTINCT category FROM tasks WHERE chat_id = $1 AND category IS NOT NULL ORDER BY category",
    [chatId]
  );
  return rows.map((r) => r.category);
}

export async function deleteCategory(chatId: string, category: string): Promise<number> {
  const { rowCount } = await pool.query(
    "UPDATE tasks SET category = NULL WHERE chat_id = $1 AND category = $2",
    [chatId, category]
  );
  return rowCount ?? 0;
}
