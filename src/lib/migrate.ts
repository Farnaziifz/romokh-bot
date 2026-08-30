import "dotenv/config";
import { pool } from "./db.js";

const sql = `
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  title TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_reminder_idx ON tasks (chat_id, done);
`;

async function main() {
  await pool.query(sql);
  console.log("migration done");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
