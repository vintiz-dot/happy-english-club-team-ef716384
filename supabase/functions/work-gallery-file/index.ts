/**
 * work-gallery-file - serves the file of one APPROVED class-gallery share to a
 * classmate (or their family).
 *
 * A classmate has no Storage read on another child's file, and must not get
 * one: the storage policies stay exactly as they are. Instead this function
 * asks work_share_file() AS THE CALLER (their JWT). The database answers only
 * when the share is approved and the caller can view a child enrolled in the
 * share's class today. Only then is the file read, with the service key, from
 * R2 or Supabase (_lib/file-store.ts), and returned.
 *
 * Input:  { share_id: string }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in first" }, 401);

  const body = await req.json().catch(() => ({}));
  const shareId = String(body.share_id ?? "").trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(shareId)) return json({ error: "share_id is required" }, 400);

  // As the caller: the database decides.
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: where, error } = await asCaller.rpc("work_share_file", { p_share_id: shareId });
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
        // Private: the link is the caller's own session, so no shared cache.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "File not found" }, 404);
  }
});
