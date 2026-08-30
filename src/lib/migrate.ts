import "dotenv/config";
import { pool } from "./db.js";

const sql = `
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  title TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL DEFAULT now(),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- rename legacy "deadline" -> "due_at" and make it nullable (quick-add may have no date)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE tasks RENAME COLUMN deadline TO due_at;
  END IF;
END $$;
ALTER TABLE tasks ALTER COLUMN due_at DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN due_at DROP DEFAULT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low','med','high'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS carried_over_weeks INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT CHECK (recurrence_rule IN ('daily','weekly'));

CREATE INDEX IF NOT EXISTS tasks_reminder_idx ON tasks (chat_id, done);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks (chat_id, due_at);

CREATE TABLE IF NOT EXISTS settings (
  chat_id TEXT PRIMARY KEY,
  reminder_interval_hours INT NOT NULL DEFAULT 3,
  quiet_hours_start INT NOT NULL DEFAULT 0,
  quiet_hours_end INT NOT NULL DEFAULT 8,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
  last_reminder_at TIMESTAMPTZ,
  last_report_at TIMESTAMPTZ,
  last_report_open_count INT,
  last_report_completion_rate DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS mit (
  chat_id TEXT NOT NULL,
  mit_date DATE NOT NULL,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, mit_date)
);
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
