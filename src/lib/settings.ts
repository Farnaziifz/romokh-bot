import { pool } from "./db.js";
import type { Settings } from "./db.js";

export async function getSettings(chatId: string): Promise<Settings> {
  const { rows } = await pool.query<Settings>("SELECT * FROM settings WHERE chat_id = $1", [chatId]);
  if (rows[0]) return rows[0];

  const { rows: inserted } = await pool.query<Settings>(
    "INSERT INTO settings (chat_id) VALUES ($1) ON CONFLICT (chat_id) DO UPDATE SET chat_id = EXCLUDED.chat_id RETURNING *",
    [chatId]
  );
  return inserted[0];
}

export async function updateSettings(chatId: string, patch: Partial<Settings>): Promise<Settings> {
  await getSettings(chatId); // ensure row exists
  const fields = Object.keys(patch);
  if (fields.length === 0) return getSettings(chatId);

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = fields.map((f) => (patch as Record<string, unknown>)[f]);
  const { rows } = await pool.query<Settings>(
    `UPDATE settings SET ${setClause} WHERE chat_id = $1 RETURNING *`,
    [chatId, ...values]
  );
  return rows[0];
}
