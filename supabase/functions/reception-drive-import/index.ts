/**
 * Admin > Reception: copy a Google Drive video into HEC storage so the
 * reception TV can play it. Drive's own player does not run on the TV's 2016
 * browser, and Drive does not serve a file for streaming, so the video is
 * copied once, when the admin adds the link.
 *
 * Runs as the calling admin: the upload goes through the storage policy on
 * the `reception-video` bucket with the admin's own token. No service role.
 * The Drive file must be shared as "Anyone with the link".
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_BYTES = 262144000; // the bucket's limit (250 MB)
const TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

/** The file id from any of Drive's link shapes. */
export function driveFileId(link: string): string | null {
  const s = (link || "").trim();
  const m = s.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (!m) return null;
  try {
    const host = new URL(s).hostname;
    if (!/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$|(^|\.)drive\.usercontent\.google\.com$/.test(host)) return null;
  } catch {
    return null;
  }
  return m[1];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { data: isAdmin } = await caller.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Only an admin can add videos to the reception screen." }, 403);

    const { link } = await req.json().catch(() => ({}));
    const id = driveFileId(String(link ?? ""));
    if (!id) return json({ error: "That is not a Google Drive file link." }, 400);

    const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { redirect: "follow" });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const disposition = res.headers.get("content-disposition") ?? "";
    const name = decodeURIComponent((disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ?? disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "").trim());
    if (!res.ok || type.startsWith("text/html") || !res.body) {
      await res.body?.cancel();
      return json({ error: "Drive did not hand over the file. In Drive, set Share > General access to \"Anyone with the link\", then try again." }, 400);
    }
    const ext = (name.split(".").pop() ?? "").toLowerCase();
    const mime = type.startsWith("video/") && Object.values(TYPES).includes(type) ? type : TYPES[ext];
    if (!mime) {
      await res.body.cancel();
      return json({ error: `That file is not a video the TV plays (${name || type || "unknown type"}). Use MP4, MOV or WebM.` }, 400);
    }
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) {
      await res.body.cancel();
      return json({ error: `The video is ${Math.round(length / 1048576)} MB; the limit is 250 MB.` }, 400);
    }

    const path = `drive/${id}-${Date.now()}.${Object.entries(TYPES).find(([, t]) => t === mime)?.[0] ?? "mp4"}`;
    const up = await fetch(`${url}/storage/v1/object/reception-video/${path}`, {
      method: "POST",
      headers: {
        Authorization: auth, apikey: anon, "Content-Type": mime, "x-upsert": "false",
        ...(length ? { "Content-Length": String(length) } : {}),
      },
      body: res.body,
      // @ts-ignore Deno streams a request body with duplex "half"
      duplex: "half",
    });
    if (!up.ok) {
      const msg = await up.text();
      return json({ error: `Could not save the video: ${msg.slice(0, 200)}` }, 502);
    }
    const publicUrl = `${url}/storage/v1/object/public/reception-video/${path}`;
    return json({ url: publicUrl, path, name, bytes: length || null, mime });
  } catch (e) {
    console.error("reception-drive-import", e);
    return json({ error: "Could not copy the video. Try again, or download it and upload the file instead." }, 500);
  }
});
