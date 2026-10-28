// Writes a plain-language tuition explanation for a family, for an admin to
// review and send. Figures come ONLY from calculate-tuition (the single
// source of truth); the model words them, it never prices anything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RUN_ID = "X-Lovable-AIG-Run-ID";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const caller = await requireRole(req, sb, ["admin"], corsHeaders, { allowServiceRole: false });
  if (caller instanceof Response) return caller;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json(500, { error: "AI is not configured." });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
  const studentId = String(body?.studentId ?? "");
  const month = String(body?.month ?? "");
  const language = body?.language === "vi" ? "Vietnamese" : "English";
  const notes = String(body?.notes ?? "").slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(studentId) || !/^\d{4}-\d{2}$/.test(month)) {
    return json(400, { error: "A student and a month (YYYY-MM) are required." });
  }

  const { data: student } = await sb.from("students").select("id, full_name, family_id, family:families(name)").eq("id", studentId).maybeSingle();
  if (!student) return json(404, { error: "Student not found." });

  let members: { id: string; full_name: string }[] = [{ id: student.id, full_name: student.full_name }];
  if (student.family_id) {
    const { data } = await sb.from("students").select("id, full_name").eq("family_id", student.family_id).order("full_name");
    if (data?.length) members = data;
  }

  // Same figures the admin sees, computed by the same function, as the admin.
  const auth = req.headers.get("Authorization")!;
  const children = [];
  for (const m of members) {
    const { data, error } = await sb.functions.invoke("calculate-tuition", {
      body: { studentId: m.id, month },
      headers: { Authorization: auth },
    });
    if (error || !data || data.error) return json(502, { error: `Could not load tuition for ${m.full_name}.` });
    if (data.siblingState?.status === "unresolved") {
      return json(409, { error: "The family discount is still being calculated. Try again in a moment." });
    }
    if (!data.sessionCount && !data.totalAmount && m.id !== studentId) continue;
    children.push({
      name: m.full_name,
      sessions: (data.sessionDetails ?? []).map((s: any) => ({ date: s.date, class: s.class_name, status: s.status, rate_vnd: s.rate })),
      classes: (data.breakdown?.classes ?? []).map((c: any) => ({ class: c.class_name, sessions: c.sessions_count, amount_vnd: c.amount_vnd })),
      base_vnd: data.baseAmount,
      discounts: (data.discounts ?? []).map((d: any) => ({ name: d.name, amount_vnd: d.amount, family_discount: !!d.isSiblingWinner })),
      total_payable_vnd: data.totalAmount,
      paid_vnd: data.payments?.cumulativePaidAmount ?? 0,
      balance: data.carry ? { status: data.carry.status, credit_vnd: data.carry.carryOutCredit, owed_vnd: data.carry.carryOutDebt, carried_in_owed_vnd: data.carry.carryInDebt, carried_in_credit_vnd: data.carry.carryInCredit } : null,
    });
  }

  const facts = { school: "Happy English Club", family: (student as any).family?.name ?? null, month, children };
  const instructions =
    `You write tuition explanations that Happy English Club staff send to parents. Write in ${language}. ` +
    "Be warm, clear and brief. Use ONLY the figures in the data; never compute new totals, never invent amounts, dates or policies. " +
    "Format money as Vietnamese đồng with thousands separators (e.g. 1.890.000 ₫). For each child: lessons counted and how attendance affected them " +
    "(Excused lessons are not charged), discounts and why, the amount payable, and any amount paid or still owed. " +
    "Mention the family (sibling) discount where it applies. End with one friendly line inviting questions. Plain text, short paragraphs, no markdown tables.";
  const input = [
    { role: "user", content: `Tuition data (JSON):\n${JSON.stringify(facts)}${notes ? `\n\nNotes from the admin to include:\n${notes}` : ""}` },
  ];

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: req.signal,
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
    }),
  }).catch((e) => (req.signal.aborted ? null : Promise.reject(e)));
  if (!upstream) return new Response(null, { status: 499, headers: corsHeaders });

  const runId = upstream.headers.get(RUN_ID);
  const extra: Record<string, string> = runId ? { [RUN_ID]: runId } : {};
  if (!upstream.ok || !upstream.body) {
    let message = "The explanation could not be written.";
    try { const e = await upstream.json(); message = e?.error?.message || e?.message || message; } catch { /* keep default */ }
    if (upstream.status === 402) message = "AI credits have run out. Add credits in Settings → Plans & credits.";
    if (upstream.status === 429) message = "Too many requests right now. Please try again shortly.";
    return json(upstream.status, { error: message });
  }

  // Forward just the answer text as a plain stream.
  const encoder = new TextEncoder();
  const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
  const stream = new ReadableStream({
    async start(controller) {
      let buf = "";
      let wrote = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let ev: any;
            try { ev = JSON.parse(payload); } catch { continue; }
            if (ev.type === "response.output_text.delta" && ev.delta) {
              wrote = true;
              controller.enqueue(encoder.encode(ev.delta));
            } else if (ev.type === "response.failed" || ev.type === "error") {
              controller.enqueue(encoder.encode("\n\n[The explanation could not be finished.]"));
            }
          }
        }
        if (!wrote) controller.enqueue(encoder.encode("[No explanation was returned.]"));
      } catch {
        // client stopped or connection dropped
      } finally {
        controller.close();
      }
    },
    cancel() { reader.cancel(); },
  });
  return new Response(stream, { headers: { ...corsHeaders, ...extra, "Content-Type": "text/plain; charset=utf-8" } });
});
