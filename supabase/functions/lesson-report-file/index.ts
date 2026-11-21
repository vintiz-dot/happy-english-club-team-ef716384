/**
 * lesson-report-file - serves one picture of an approved lesson report to a
 * family or a child: a photo the teacher ticked to share, or that child's own
 * work listed in their part.
 *
 * Families have no Storage read on lesson photos or on a classmate's work, and
 * must not get one. This function asks lesson_report_file() AS THE CALLER
 * (their JWT); the database answers only for a shared photo of a lesson of a
 * class the child was in that day, or the child's own work listed in their own
 * part, and only when the caller can view that child (staff of the lesson may
 * fetch any of its photos). Only then is the file read, with the service key,
 * from R2 or Supabase (_lib/file-store.ts), and returned.
 *
 * Input:  { kind: "photo" | "work", id: string, student_id?: string }
 * Output: the file's bytes, Content-Type from its name. 403 when not allowed.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { downloadFile, fileStoreEnvFromDeno } from "../_lib/file-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", pdf: "application/pdf",
};
const UUID = /^[0-9a-fA-F-]{36}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in first" }, 401);

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "");
  const id = String(body.id ?? "").trim();
  const student = body.student_id == null || body.student_id === "" ? null : String(body.student_id).trim();
  if (kind !== "photo" && kind !== "work") return json({ error: "kind is photo or work" }, 400);
  if (!UUID.test(id)) return json({ error: "id is required" }, 400);
  if (student !== null && !UUID.test(student)) return json({ error: "student_id is not an id" }, 400);

  // As the caller: the database decides.
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: where, error } = await asCaller.rpc("lesson_report_file", {
    p_kind: kind, p_id: id, p_student: student,
  });
  if (error) return json({ error: "Could not check access" }, 500);
  if (!where?.bucket || !where?.path) return json({ error: "Not available" }, 403);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const file = await downloadFile(sb, fileStoreEnvFromDeno(), String(where.bucket), String(where.path));
    const ext = String(where.path).split(".").pop()?.toLowerCase() ?? "";
    return new Response(file, {
      headers: {
        ...corsHeaders,
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        // Private: the answer depends on the caller's own session, so no shared cache.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "File not found" }, 404);
  }
});
