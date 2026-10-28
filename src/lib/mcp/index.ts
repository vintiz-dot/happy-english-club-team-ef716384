import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listClassesTool from "./tools/list-classes";
import listUpcomingLessonsTool from "./tools/list-upcoming-lessons";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "happy-english-club-team",
  title: "happy-english-club-team",
  version: "0.1.0",
  instructions:
    "Read-only tools for Happy English Club. They act as the signed-in user and only return what that account may already see in the app: account roles, classes and upcoming lessons.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listClassesTool, listUpcomingLessonsTool],
});
