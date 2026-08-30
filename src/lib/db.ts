import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type Priority = "low" | "med" | "high";
export type RecurrenceRule = "daily" | "weekly";

export interface Task {
  id: number;
  chat_id: string;
  title: string;
  category: string | null;
  priority: Priority | null;
  due_at: Date | null;
  created_at: Date;
  completed_at: Date | null;
  done: boolean;
  reminder_count: number;
  carried_over_weeks: number;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
}

export interface Settings {
  chat_id: string;
  reminder_interval_hours: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
  last_reminder_at: Date | null;
  last_report_at: Date | null;
  last_report_open_count: number | null;
  last_report_completion_rate: number | null;
}

export interface Mit {
  chat_id: string;
  mit_date: string; // YYYY-MM-DD, local to settings.timezone
  task_id: number;
}
