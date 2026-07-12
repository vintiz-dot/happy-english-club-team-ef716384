// snapshot-monthly-finance
// =========================
// Pure persistence layer for closed-month finance snapshots.
//
// Architectural rule: this function NEVER recomputes tuition. It accepts
// the verbatim payload from calculate-tuition-bulk (consumed by the
// client) and writes it into monthly_finance_snapshots. The bulk function
// remains the single source of truth for finance math; this function only
// freezes its output.
//
// Versioning: re-closing a month does not overwrite. The active row is
// marked superseded and a new version is inserted with a reason. The full
// audit trail is preserved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirrors the shape of one element of calculate-tuition-bulk results.
const BulkResultSchema = z.object({
  studentId: z.string().uuid(),
  baseAmount: z.number().nonnegative().optional().default(0),
  totalDiscount: z.number().nonnegative().optional().default(0),
  totalAmount: z.number().nonnegative().optional().default(0),
  payments: z
    .object({
      monthPayments: z.number().optional().default(0),
      priorPayments: z.number().optional().default(0),
      cumulativePaidAmount: z.number().optional().default(0),
    })
    .optional()
    .default({}),
  carry: z
    .object({
      carryInCredit: z.number().optional().default(0),
      carryInDebt: z.number().optional().default(0),
      carryOutCredit: z.number().optional().default(0),
      carryOutDebt: z.number().optional().default(0),
    })
    .optional()
    .default({}),
  sessionCount: z.number().nonnegative().optional().default(0),
  error: z.boolean().optional(),
}).passthrough();

const InputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  // Verbatim results array from calculate-tuition-bulk { results: [...] }.
  results: z.array(BulkResultSchema).min(1),
  closeReason: z.string().max(500).optional(),
  // When supersedeReason is provided, any existing active snapshot for
  // (student, month) is superseded and a new version is inserted. Without
  // it, students that already have an active snapshot for this month are
  // skipped and reported under `skipped`.
  supersedeReason: z.string().max(500).optional(),
});

type SnapshotInsert = {
  student_id: string;
  month: string;
  version: number;
  final_payable: number;
  base_amount: number;
  total_discount: number;
  total_amount: number;
  recorded_payment: number;
  carry_in_credit: number;
  carry_in_debt: number;
  carry_out_credit: number;
  carry_out_debt: number;
  session_count: number;
  source_payload: unknown;
  closed_by: string | null;
  close_reason: string | null;
};

function deriveFinalPayable(r: z.infer<typeof BulkResultSchema>): number {
  // Mirrors the client-side derivation in useLiveTuitionData.ts:134.
  // Locked here as the single canonical formula, sourced from the edge
  // function output (we are not redefining tuition math).
  const totalAmount = Number(r.totalAmount ?? 0);
  const carryInDebt = Number(r.carry?.carryInDebt ?? 0);
  const carryInCredit = Number(r.carry?.carryInCredit ?? 0);
  return Math.round(totalAmount + carryInDebt - carryInCredit);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: admin only.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id);
    const isAdmin = roleRows?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { month, results, closeReason, supersedeReason } = InputSchema.parse(body);
    const closedBy = claims.user.id;
    const allowSupersede = !!supersedeReason;

    // Pull existing active snapshots for this month in one query so we can
    // decide insert-vs-supersede per student without N round-trips.
    const studentIds = results.map((r) => r.studentId);
    const { data: existing, error: existingErr } = await supabase
      .from("monthly_finance_snapshots")
      .select("id, student_id, version")
      .eq("month", month)
      .in("student_id", studentIds)
      .is("superseded_at", null);
    if (existingErr) throw existingErr;

    const existingByStudent = new Map<string, { id: string; version: number }>(
      (existing ?? []).map((row: any) => [row.student_id, { id: row.id, version: row.version }]),
    );

    const inserts: SnapshotInsert[] = [];
    const supersedeIds: string[] = [];
    const skipped: string[] = [];
    const failed: { studentId: string; reason: string }[] = [];

    for (const r of results) {
      if (r.error) {
        failed.push({ studentId: r.studentId, reason: "Upstream calculate-tuition-bulk reported error" });
        continue;
      }
      const prior = existingByStudent.get(r.studentId);
      if (prior && !allowSupersede) {
        skipped.push(r.studentId);
        continue;
      }

      const nextVersion = (prior?.version ?? 0) + 1;
      if (prior) supersedeIds.push(prior.id);

      inserts.push({
        student_id: r.studentId,
        month,
        version: nextVersion,
        final_payable: deriveFinalPayable(r),
        base_amount: Math.round(Number(r.baseAmount ?? 0)),
        total_discount: Math.round(Number(r.totalDiscount ?? 0)),
        total_amount: Math.round(Number(r.totalAmount ?? 0)),
        recorded_payment: Math.round(Number(r.payments?.monthPayments ?? 0)),
        carry_in_credit: Math.round(Number(r.carry?.carryInCredit ?? 0)),
        carry_in_debt: Math.round(Number(r.carry?.carryInDebt ?? 0)),
        carry_out_credit: Math.round(Number(r.carry?.carryOutCredit ?? 0)),
        carry_out_debt: Math.round(Number(r.carry?.carryOutDebt ?? 0)),
        session_count: Math.round(Number(r.sessionCount ?? 0)),
        source_payload: r,
        closed_by: closedBy,
        close_reason: closeReason ?? null,
      });
    }

    // Two-step write — supersede prior active rows, then insert new ones.
    // We do supersede FIRST so the partial unique index doesn't reject the
    // new inserts.
    if (supersedeIds.length > 0) {
      const { error: supersedeErr } = await supabase
        .from("monthly_finance_snapshots")
        .update({
          superseded_at: new Date().toISOString(),
          superseded_by: closedBy,
          supersede_reason: supersedeReason ?? null,
        })
        .in("id", supersedeIds);
      if (supersedeErr) throw supersedeErr;
    }

    let inserted: any[] = [];
    if (inserts.length > 0) {
      const { data, error: insertErr } = await supabase
        .from("monthly_finance_snapshots")
        .insert(inserts)
        .select("id, student_id, version");
      if (insertErr) throw insertErr;
      inserted = data ?? [];
    }

    return new Response(
      JSON.stringify({
        month,
        insertedCount: inserted.length,
        supersededCount: supersedeIds.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        skipped,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("snapshot-monthly-finance error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
