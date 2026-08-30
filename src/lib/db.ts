import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Task {
  id: number;
  chat_id: string;
  title: string;
  deadline: Date;
  done: boolean;
  created_at: Date;
}
