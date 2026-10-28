import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "List classes",
  description: "List the active classes the signed-in user is allowed to see.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, description, age_range, default_session_length_minutes")
      .eq("is_active", true)
      .order("name")
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const classes = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      age_range: c.age_range,
      session_minutes: c.default_session_length_minutes,
    }));
    return { content: [{ type: "text", text: JSON.stringify(classes) }], structuredContent: { classes } };
  },
});
