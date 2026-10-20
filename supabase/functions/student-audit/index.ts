/**
 * Everything known about one student's money, in one answer.
 *
 * Why this exists as a function rather than queries from the browser:
 *
 *  1. Naming the person. "Who recorded this payment" means turning a
 *     user id into a name, and names come from profiles plus the auth
 *     email — auth.users is not reachable through PostgREST at all. Only
 *     the service role can answer it.
 *  2. There is no single payments table to read. This school records
 *     money two incompatible ways (see below) and reassembling one
 *     honest timeline out of three sources is not something to do with
 *     six round trips from a phone.
 *
 * THE TWO MONEY SYSTEMS. This is the central fact about this schema and
 * everything here is shaped by it:
 *
 *  (A) `payments` rows — proper records, with created_by (who), occurred_at
 *      (when the money moved) and created_at (when it was typed in).
 *      Written only by the family-payment family of functions.
 *  (B) `invoices.recorded_payment` — a single running number per student
 *      per month. The dominant admin flows (RecordPaymentDialog,
 *      BatchPaymentDialog, QuickPayPanel) only add to this scalar. Two
 *      payments of 1,500,000 and one of 3,000,000 are indistinguishable
 *      in it.
 *
 * For (B) the actor, the date and the method survive in exactly one
 * place: the `diff` of a named audit_log row. So the timeline below is a
 * union of payments, ledger_entries and audit_log, and every entry
 * carries `provenance` saying which it came from and how much it can be
 * trusted. An entry we cannot attribute says so rather than guessing.
 *
 * Read-only by construction. It issues no insert, update, upsert or
 * delete — note that `calculate-tuition` could NOT be used here, because
 * it writes the invoice row it returns, and a report must never mutate
 * the thing it is reporting on.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Attendance marks that cost money, and the one that does not. */
const BILLED = new Set(["present", "absent", "late"]);
const FORGIVEN = "excused";

/** Named audit actions that represent money moving, with a readable label. */
const MONEY_ACTIONS: Record<string, string> = {
  record_payment: "Payment recorded",
  payment_correction: "Payment corrected",
  batch_payment: "Batch payment",
  quick_pay: "Quick payment",
  family_payment_allocated: "Family payment allocated",
  family_payment_transfer: "Credit transferred between siblings",
  smart_family_payment: "Family payment",
  payment_deleted: "Payment deleted",
  payment_modified: "Payment modified",
  invoice_confirmed: "Invoice confirmed",
};

interface Actor {
  name: string;
  email: string | null;
  /** False when nobody was recorded, so the UI can say so plainly. */
  known: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Money and attendance for a named child: admins only. A teacher can
    // see their own class's attendance elsewhere; this screen is finance.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const studentId = String(body?.studentId ?? "");
    if (!studentId) return json({ error: "studentId is required" }, 400);

    /* ------------------------------------------------------- the student */

    const { data: student } = await admin
      .from("students")
      .select("id, full_name, family_id")
      .eq("id", studentId)
      .maybeSingle();
    if (!student) return json({ error: "No such student" }, 404);

    /* --------------------------------------------------- the month rows */

    const [invoicesRes, snapshotsRes] = await Promise.all([
      admin
        .from("invoices")
        .select(
          "id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, " +
            "carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt, status, " +
            "confirmation_status, confirmed_at, confirmed_by, created_by, updated_by, " +
            "created_at, updated_at, class_breakdown, number",
        )
        .eq("student_id", studentId)
        .order("month", { ascending: true }),
      // A closed month is frozen here and is the authoritative figure;
      // the invoice row can still drift when calculate-tuition re-runs.
      admin
        .from("monthly_finance_snapshots")
        .select(
          "month, base_amount, total_discount, total_amount, recorded_payment, final_payable, " +
            "carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt, session_count, " +
            "closed_at, closed_by, version, superseded_at",
        )
        .eq("student_id", studentId)
        .is("superseded_at", null)
        .order("month", { ascending: true }),
    ]);

    const invoices = invoicesRes.data ?? [];
    const snapshots = snapshotsRes.data ?? [];
    const snapshotByMonth = new Map(snapshots.map((s) => [s.month, s]));

    /* ------------------------------------------- attendance, per month */

    // Sessions the student could have attended, with the mark actually
    // recorded. Counting here rather than trusting the invoice's
    // sessions_count, which omits "Late" (calculate-tuition builds it
    // from Present|Absent only, while Late is billed) and so understates
    // what was charged for.
    const { data: attendance } = await admin
      .from("attendance")
      .select("id, status, marked_at, marked_by, notes, session_id, sessions(id, date, class_id, status, classes(name))")
      .eq("student_id", studentId);

    interface MonthAttendance {
      present: number;
      absent: number;
      late: number;
      excused: number;
      billedSessions: number;
      rows: Array<{
        date: string;
        className: string;
        status: string;
        billed: boolean;
        markedAt: string | null;
        markedBy: string | null;
      }>;
    }
    const attByMonth = new Map<string, MonthAttendance>();
    const attendanceActorIds = new Set<string>();

    for (const a of attendance ?? []) {
      const session = a.sessions as unknown as
        | { date?: string; status?: string; classes?: { name?: string } }
        | null;
      const date = session?.date;
      if (!date) continue;
      const month = String(date).slice(0, 7);

      let bucket = attByMonth.get(month);
      if (!bucket) {
        bucket = { present: 0, absent: 0, late: 0, excused: 0, billedSessions: 0, rows: [] };
        attByMonth.set(month, bucket);
      }

      // Stored marks are Title Case, but a few writers use lower case.
      // Compare folded so a casing slip never silently drops a session.
      const status = String(a.status ?? "").toLowerCase();
      const billed = BILLED.has(status) && session?.status !== "Canceled";

      if (status === "present") bucket.present += 1;
      else if (status === "absent") bucket.absent += 1;
      else if (status === "late") bucket.late += 1;
      else if (status === FORGIVEN) bucket.excused += 1;
      if (billed) bucket.billedSessions += 1;

      if (a.marked_by) attendanceActorIds.add(a.marked_by);
      bucket.rows.push({
        date: String(date),
        className: session?.classes?.name ?? "Unknown class",
        status: String(a.status ?? "Unmarked"),
        billed,
        markedAt: a.marked_at ?? null,
        markedBy: a.marked_by ?? null,
      });
    }

    /* ------------------------------------------------- the money events */

    const events: Array<{
      id: string;
      kind: "payment" | "correction" | "confirmation" | "adjustment";
      label: string;
      amount: number | null;
      /** When the money actually moved, where that is recorded. */
      occurredAt: string | null;
      /** When the row was written. Different thing; often the only one. */
      recordedAt: string;
      month: string | null;
      method: string | null;
      memo: string | null;
      actorId: string | null;
      provenance: "payments" | "ledger" | "audit_log";
      /** True when the amount is a per-transaction figure, not a running total. */
      exact: boolean;
    }> = [];
    const actorIds = new Set<string>();

    // (A) Real payment rows. The best source: an amount, a payer date and
    // an actor, all on one row.
    const { data: payments } = await admin
      .from("payments")
      .select("id, amount, method, memo, occurred_at, created_at, created_by, parent_payment_id")
      .eq("student_id", studentId)
      .order("occurred_at", { ascending: true });

    for (const p of payments ?? []) {
      if (p.created_by) actorIds.add(p.created_by);
      events.push({
        id: `pay:${p.id}`,
        kind: "payment",
        label: p.parent_payment_id ? "Payment (part of a family payment)" : "Payment",
        amount: Number(p.amount ?? 0),
        occurredAt: p.occurred_at ?? null,
        recordedAt: p.created_at,
        month: p.occurred_at ? String(p.occurred_at).slice(0, 7) : null,
        method: p.method ?? null,
        memo: p.memo ?? null,
        actorId: p.created_by ?? null,
        provenance: "payments",
        exact: true,
      });
    }

    // (B) The double-entry ledger, which is the only place a payment is
    // tied to the month it settles. Partial coverage: five code paths
    // write it, so absence here means nothing.
    // ledger_entries.account_id points at ledger_accounts, not at the
    // student — a student has one account per code (AR, CASH, CREDIT…).
    // Resolve the accounts first, or this silently returns nothing.
    const { data: ledgerAccounts } = await admin
      .from("ledger_accounts")
      .select("id, code")
      .eq("student_id", studentId);

    const accountCode = new Map((ledgerAccounts ?? []).map((a) => [a.id, a.code]));
    const accountIds = [...accountCode.keys()];

    const { data: ledger } = accountIds.length
      ? await admin
          .from("ledger_entries")
          .select("id, account_id, debit, credit, month, occurred_at, created_at, created_by, memo, tx_key")
          .in("account_id", accountIds)
          .order("occurred_at", { ascending: true })
          .limit(500)
      : { data: [] as never[] };

    for (const l of ledger ?? []) {
      if (l.created_by) actorIds.add(l.created_by);
      const credit = Number(l.credit ?? 0);
      const debit = Number(l.debit ?? 0);
      const code = accountCode.get(l.account_id) ?? "";
      events.push({
        id: `led:${l.id}`,
        kind: "adjustment",
        label: `${credit > 0 ? "Credit" : "Charge"}${code ? ` (${code})` : ""}`,
        amount: credit > 0 ? credit : debit,
        occurredAt: l.occurred_at ?? null,
        recordedAt: l.created_at,
        month: l.month ?? null,
        method: null,
        memo: l.memo ?? null,
        actorId: l.created_by ?? null,
        provenance: "ledger",
        exact: true,
      });
    }

    // (C) The audit trail. For most payments in this school this is the
    // ONLY record of who and when, because the write was a bump to
    // invoices.recorded_payment and left nothing else behind.
    const { data: auditRows } = await admin
      .from("audit_log")
      .select("id, action, entity, entity_id, actor_user_id, occurred_at, diff")
      .in("action", Object.keys(MONEY_ACTIONS))
      .order("occurred_at", { ascending: false })
      .limit(1000);

    const invoiceIds = new Set(invoices.map((i) => i.id));
    for (const row of auditRows ?? []) {
      const diff = (row.diff ?? {}) as Record<string, unknown>;

      // These rows are school-wide, so keep only the ones about this
      // student — named directly, or pointing at one of their invoices.
      const mentionsStudent =
        diff.student_id === studentId ||
        (diff.student as { id?: string } | undefined)?.id === studentId ||
        row.entity_id === studentId ||
        (row.entity === "invoices" && row.entity_id && invoiceIds.has(row.entity_id));
      if (!mentionsStudent) continue;

      if (row.actor_user_id) actorIds.add(row.actor_user_id);

      const prev = Number(diff.previous_recorded_payment ?? NaN);
      const next = Number(diff.new_recorded_payment ?? NaN);
      const delta =
        Number.isFinite(prev) && Number.isFinite(next)
          ? next - prev
          : Number(diff.applied ?? diff.amount ?? diff.total_payment ?? NaN);

      events.push({
        id: `aud:${row.id}`,
        kind: row.action === "payment_correction" ? "correction"
          : row.action === "invoice_confirmed" ? "confirmation"
          : "payment",
        label: MONEY_ACTIONS[row.action] ?? row.action,
        amount: Number.isFinite(delta) ? delta : null,
        occurredAt: (diff.payment_date as string) ?? null,
        recordedAt: row.occurred_at,
        month: (diff.month as string) ?? null,
        method: (diff.payment_method as string) ?? null,
        memo: (diff.memo as string) ?? null,
        actorId: row.actor_user_id ?? null,
        provenance: "audit_log",
        exact: Number.isFinite(delta),
      });
    }

    /* --------------------------------------------------- name the people */

    for (const inv of invoices) {
      if (inv.confirmed_by) actorIds.add(inv.confirmed_by);
      if (inv.created_by) actorIds.add(inv.created_by);
      if (inv.updated_by) actorIds.add(inv.updated_by);
    }
    for (const s of snapshots) if (s.closed_by) actorIds.add(s.closed_by);
    for (const id of attendanceActorIds) actorIds.add(id);

    const actors: Record<string, Actor> = {};
    const ids = [...actorIds].filter(Boolean);
    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      await Promise.all(
        ids.map(async (id) => {
          let email: string | null = null;
          try {
            const { data } = await admin.auth.admin.getUserById(id);
            email = data?.user?.email ?? null;
          } catch {
            // A deleted account still appears in history; it just has no email.
          }
          const name = nameById.get(id) || email;
          actors[id] = {
            name: name || `Unknown (${id.slice(0, 8)})`,
            email,
            known: !!name,
          };
        }),
      );
    }

    /* ------------------------------------------------- assemble the months */

    const months = invoices.map((inv) => {
      const snap = snapshotByMonth.get(inv.month);
      const att = attByMonth.get(inv.month);
      const breakdown = Array.isArray(inv.class_breakdown)
        ? (inv.class_breakdown as Array<Record<string, unknown>>)
        : [];

      const charged = Number(snap?.total_amount ?? inv.total_amount ?? 0);
      const paid = Number(snap?.recorded_payment ?? inv.recorded_payment ?? 0);

      return {
        month: inv.month,
        invoiceId: inv.id,
        invoiceNumber: inv.number,

        // Where these numbers come from, so the screen can say so. A
        // closed month is frozen and will not move; an open one is
        // whatever calculate-tuition last wrote.
        source: snap ? "snapshot" : "invoice",
        closedAt: snap?.closed_at ?? null,
        closedBy: snap?.closed_by ?? null,

        baseAmount: Number(snap?.base_amount ?? inv.base_amount ?? 0),
        discountAmount: Number(snap?.total_discount ?? inv.discount_amount ?? 0),
        charged,
        paid,
        carryInCredit: Number(snap?.carry_in_credit ?? inv.carry_in_credit ?? 0),
        carryInDebt: Number(snap?.carry_in_debt ?? inv.carry_in_debt ?? 0),
        carryOutCredit: Number(snap?.carry_out_credit ?? inv.carry_out_credit ?? 0),
        carryOutDebt: Number(snap?.carry_out_debt ?? inv.carry_out_debt ?? 0),

        status: inv.status,
        confirmationStatus: inv.confirmation_status,
        confirmedAt: inv.confirmed_at,
        confirmedBy: inv.confirmed_by,
        updatedAt: inv.updated_at,
        updatedBy: inv.updated_by,

        classes: breakdown.map((c) => ({
          classId: String(c.class_id ?? ""),
          className: String(c.class_name ?? "Unknown class"),
          // The invoice's own count, kept for comparison, but the
          // attendance-derived figure below is the one to trust.
          sessionsCountStored: Number(c.sessions_count ?? 0),
          amount: Number(c.amount_vnd ?? 0),
        })),

        attendance: att
          ? {
              present: att.present,
              absent: att.absent,
              late: att.late,
              excused: att.excused,
              billedSessions: att.billedSessions,
              rows: att.rows.sort((a, b) => a.date.localeCompare(b.date)),
            }
          : null,
      };
    });

    /* ------------------------------------------------------------ totals */

    const totalCharged = months.reduce((s, m) => s + m.charged, 0);
    const totalPaid = months.reduce((s, m) => s + m.paid, 0);
    const last = months[months.length - 1];

    return json({
      ok: true,
      student: { id: student.id, name: student.full_name, familyId: student.family_id },
      months,
      events: events.sort((a, b) =>
        String(b.occurredAt ?? b.recordedAt).localeCompare(String(a.occurredAt ?? a.recordedAt)),
      ),
      actors,
      totals: {
        charged: totalCharged,
        paid: totalPaid,
        // Positive means the family is ahead, negative means they owe.
        balance: totalPaid - totalCharged,
        outstanding: last ? Number(last.carryOutDebt ?? 0) : 0,
        credit: last ? Number(last.carryOutCredit ?? 0) : 0,
        months: months.length,
      },
      // Said out loud so the screen never implies more certainty than
      // the data supports.
      caveats: {
        scalarPayments: (payments ?? []).length === 0 && events.length > 0,
        auditOnlyEvents: events.filter((e) => e.provenance === "audit_log").length,
        unattributedEvents: events.filter((e) => !e.actorId).length,
      },
    });
  } catch (error) {
    console.error("student-audit failed:", error);
    return json({ error: (error as Error).message ?? "Unexpected error" }, 500);
  }
});
