# divine-taskbot

Telegram bot for task management. Add tasks with deadlines; every 3 hours the bot reminds you of everything not marked done. Mark done and reminders stop for that task.

## Setup

```bash
cp .env.example .env
# fill BOT_TOKEN (from @BotFather) and ALLOWED_USER_IDS (your telegram user id)
```

Local dev (needs local Postgres, or run `docker compose up db`):

```bash
npm install
npm run migrate
npm run dev
```

## Deploy (VPS, docker compose)

```bash
docker compose up -d --build
docker compose exec bot npm run migrate
```

## Usage

- `/addtask عنوان | 2026-09-01 18:00` — add a task with a deadline
- `/tasks` — list open tasks, each with a "✅ انجام شد" button
- Every 3 hours (`0 */3 * * *`), the bot messages every open task in this chat. Tap done to stop future reminders for it.
