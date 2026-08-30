import type { Context } from "grammy";
import { runWeeklyReport } from "../lib/weeklyReport.js";

export async function reportCommand(ctx: Context) {
  await runWeeklyReport(ctx.api, ctx.chat!.id.toString());
}
