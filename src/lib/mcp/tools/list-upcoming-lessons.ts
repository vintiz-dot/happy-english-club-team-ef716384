import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_upcoming_lessons",
  title: "List upcoming lessons",
  description: "List upcoming lessons the signed-in user can see, optionally for one class.",
  inputSchema: {
    class_id: z.string().uuid().optional().describe("Only lessons for this class."),
    days: z.number().int().min(1).max(60).optional().describe("How many days ahead to look (default 14)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id, days }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const today = new Date();
    const end = new Date(today.getTime() + (days ?? 14) * 86400000);
    let query = supabase
      .from("sessions")
      .select("id, class_id, date, start_time, end_time, status, classes(name)")
      .gte("date", today.toISOString().slice(0, 10))
      .lt("date", end.toISOString().slice(0, 10))
      .order("date")
      .order("start_time")
      .limit(200);
    if (class_id) query = query.eq("class_id", class_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const lessons = (data ?? []).map((s) => ({
      id: s.id,
      class_id: s.class_id,
      class_name: (s.classes as { name?: string } | null)?.name ?? null,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      status: String(s.status),
    }));
    return { content: [{ type: "text", text: JSON.stringify(lessons) }], structuredContent: { lessons } };
  },
});
