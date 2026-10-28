import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Show the signed-in account's email and its roles in Happy English Club.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", ctx.getUserId() ?? "");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const roles = (data ?? []).map((r) => String(r.role));
    const result = { email: ctx.getUserEmail() ?? null, roles };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
