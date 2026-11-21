-- READ-ONLY. One SELECT, no writes. Paste the whole file into the Supabase SQL
-- editor (it shows only the last statement's result, which is this one).
--
-- WHAT IT LOOKS FOR
-- The tuition month a payment counts toward lives in ONE place: invoices.
-- recorded_payment for that student+month. `payments` has no month column.
-- Which code writes what (so you know where the evidence is):
--   * Record payment / Quick Pay / Batch payment / Recorded Payment Manager and the
--     in-app assistant write ONLY invoices.recorded_payment (+ an audit_log row
--     whose diff holds month, amount, payment_date, method, memo). They do NOT
--     write the `payments` table.
--   * family-payment / smart-family-payment write a `payments` row (the family
--     total, under the first sibling, with family_id) + payment_allocations (the
--     per-child split) + invoices.recorded_payment for each child.
--   * modify-payment and delete-payment change `payments` / the ledger but never
--     touch recorded_payment, so a deleted or modified family payment leaves its
--     money on the bill.
-- This query therefore treats "payment records" as: the payments table PLUS the
-- audit_log money rows (record_payment, batch_record_payment, quickpay_record_payment,
-- payment_correction = signed amounts; update_recorded_payment / reverse_recorded_payment
-- = the change they made). A family is "payments table rows of the family's
-- children or with its family_id" + "audit rows about its children".
--
-- ROW KINDS (column row_kind)
--   month  one student-month whose bill looks wrong:
--            (a) the month charges nothing (total 0) but holds a payment, or
--            (b) the payment is bigger than this month's charge PLUS any debt carried in
--                from earlier months (so part of it belongs to some other month), or
--            (r) the bill was repriced DOWN on/after 28 Oct 2026 (audit_log) while paid, or
--            (j) July 2026 with a payment and a 0 charge (wiped by the 28 Oct bulk cancellation), or
--            (e) base 0 with a payment AND the student had lessons that month (see
--                attendance columns): the bill, not the payment, may be wrong.
--   group  one family (or one student with no family) whose total payment records
--          differ from the total recorded_payment on all its bills (c).
--          Expect MANY of these: payments made before audit logging, or edited in the
--          Recorded Payment Manager, have no record. Biggest gaps sort first.
--   pair   two payment records for the same student (or a family payment and a
--          sibling's own record) with the same amount and receipt dates within 45 days (d).
--          Pairs of ordinary monthly fees (two different months that each charge at
--          least the amount) are dropped as normal; siblings paying equal fees are not listed.
--
-- COLUMNS (all money is VND, bigint, so no overflow)
--   priority_note        'example: ...' marks the two reported students; 'July 2026' marks the paused group
--   student_name/_id, family_name/_id   who (group rows list the children)
--   month                the invoice month (YYYY-MM); for pair rows the month the later record was logged against
--   invoice_base/_total/_recorded_payment   the saved bill: lessons charge, after discounts, paid in THAT month
--   snapshot_recorded_payment   frozen figure if the month is closed (NULL = open)
--   balance_before_month sum of (recorded_payment - total) over the student's EARLIER months; negative = owed
--   excess_on_this_month recorded_payment - total - earlier debt = the part not explained by this month's own bill
--   student_balance_all  all recorded_payment minus all totals for this student, every month (positive = family ahead)
--   candidate_months     the student's OTHER months that are under-paid, nearest first, with how short;
--                        [closed] = month has an active monthly_finance_snapshots row; [frozen charges] =
--                        invoices.tuition_frozen (locks the charge, NOT the payment, so it does not stop a move)
--   repriced_at, total_before_reprice, total_after_reprice  from audit_log, for EVERY month: the earliest logged UPDATE
--                        on/after 2026-10-28 (Hanoi) that changed this bill's total (the 28 Oct bulk cancellation repriced
--                        July bills to 0; this shows whether other months were hit too). Blank = no logged change.
--   payment_equals_old_total  recorded_payment = the total before that repricing (true = the payment paid the OLD charge)
--   excess_if_charge_restored  recorded_payment minus the old total: >0 overpaid once the charge is restored, 0 exact, <0 short
--   rp_last_changed_at/rp_last_change  latest logged change to recorded_payment (old -> new): tells "payment was typed or
--                        moved on this month" (recent) from "the charge shrank" (payment older than the repricing).
--                        Logging by the invoices trigger starts when migration 20261009130000 was applied; older history is not there.
--   month_logged_in_audit  net of audit_log money rows logged against this student+month (0 = no dialog record)
--   att_sessions         Scheduled/Held sessions in a class the student was enrolled in that month, using the
--                        same matching as calculate-tuition: enrollment dated start<=date<=end, allowed_days,
--                        a paying rate; billable per isBillableTuitionSession (Present/Absent/Late)
--   att_no_row           of those, sessions with NO attendance row; att_billable = rows that would be charged now
--   source_closed        this month has an active monthly_finance_snapshots row
--   source_frozen_charges  invoices.tuition_frozen
--   group_payment_rows_net  net amount in `payments` for the family/student (reversals are negative)
--   group_audit_logged_net  net of audit money rows for the family/student, every month
--   group_recorded_payment  sum of recorded_payment over every bill of the family/student
--   group_gap            group_recorded_payment - (payments rows + audit rows). POSITIVE = money on bills with no record.
--                        NEGATIVE = a record with no bill.
--   family_payment_unallocated  family-payment rows' amount minus their payment_allocations (leftover held as credit by design)
--   evidence             the payment rows that could explain it: date, amount, method, memo, where it was logged
--   flags                A / B / E (attendance) / R (repriced down) / J (July 2026 charge wiped) / C+ / C- / D, any that apply
--   verdict              plain words. Rows are sorted: do-not-move rows FIRST (wiped or repriced charge, attendance gap), then the two
--                        reported students, then July 2026, then everything else by size.
--
-- NOTE ON "closed": ai_month_closed treats a month closed when an active (superseded_at IS NULL)
-- snapshot exists; the same test is used here, per student.

WITH
stu AS (
  SELECT s.id AS student_id, s.full_name AS student_name, s.family_id, f.name AS family_name,
         COALESCE(s.family_id::text, s.id::text) AS grp
  FROM public.students s
  LEFT JOIN public.families f ON f.id = s.family_id
),
inv0 AS (
  SELECT i.id AS invoice_id, i.student_id, i.month,
         (substr(i.month, 1, 4)::int * 12 + substr(i.month, 6, 2)::int) AS mi,
         to_date(i.month || '-01', 'YYYY-MM-DD') AS month_first,
         COALESCE(i.base_amount, 0)::bigint AS base,
         COALESCE(i.total_amount, 0)::bigint AS ta,
         COALESCE(i.recorded_payment, 0)::bigint AS rp,
         COALESCE(i.tuition_frozen, false) AS frozen,
         COALESCE(SUM(COALESCE(i.recorded_payment, 0)::bigint - COALESCE(i.total_amount, 0)::bigint)
           OVER (PARTITION BY i.student_id ORDER BY i.month
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::bigint AS bal_before,
         SUM(COALESCE(i.recorded_payment, 0)::bigint - COALESCE(i.total_amount, 0)::bigint)
           OVER (PARTITION BY i.student_id)::bigint AS bal_all,
         SUM(GREATEST(COALESCE(i.total_amount, 0)::bigint - COALESCE(i.recorded_payment, 0)::bigint, 0))
           OVER (PARTITION BY i.student_id)::bigint AS short_all
  FROM public.invoices i
  WHERE i.month ~ '^\d{4}-(0[1-9]|1[0-2])$'
),
inv AS (
  SELECT v.*, st.student_name, st.family_id, st.family_name, st.grp,
         (sn.student_id IS NOT NULL) AS closed, sn.rp AS snap_rp,
         rpr.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS repriced_at,
         rpr.old_total, rpr.new_total,
         lrp.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS rp_changed_at,
         lrp.old_rp, lrp.new_rp,
         (v.rp - v.ta - GREATEST(-v.bal_before, 0))::bigint AS excess,
         (v.short_all - GREATEST(v.ta - v.rp, 0))::bigint AS short_others
  FROM inv0 v
  LEFT JOIN stu st ON st.student_id = v.student_id
  LEFT JOIN LATERAL (
    SELECT m.student_id, m.recorded_payment::bigint AS rp
    FROM public.monthly_finance_snapshots m
    WHERE m.student_id = v.student_id AND m.month = v.month AND m.superseded_at IS NULL
    ORDER BY m.version DESC LIMIT 1
  ) sn ON true
  -- Earliest logged change to the bill's TOTAL on or after the 28 Oct 2026 bulk cancellation
  -- (any month, not only July). Written by the audit_row_change trigger: entity 'invoices',
  -- operation 'UPDATE', diff -> 'old' / 'new'. No row = no logged change (or logged before the trigger existed).
  LEFT JOIN LATERAL (
    SELECT l.occurred_at,
           CASE WHEN l.diff -> 'old' ->> 'total_amount' ~ '^-?\d+(\.\d+)?$' THEN (l.diff -> 'old' ->> 'total_amount')::numeric::bigint END AS old_total,
           CASE WHEN l.diff -> 'new' ->> 'total_amount' ~ '^-?\d+(\.\d+)?$' THEN (l.diff -> 'new' ->> 'total_amount')::numeric::bigint END AS new_total
    FROM public.audit_log l
    WHERE l.entity = 'invoices' AND l.entity_id = v.invoice_id::text AND l.operation = 'UPDATE'
      AND l.occurred_at >= (DATE '2026-10-28')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
      AND l.changed_fields && ARRAY['total_amount']
    ORDER BY l.occurred_at LIMIT 1
  ) rpr ON true
  -- Latest logged change to recorded_payment (separates "payment typed/moved here" from "charge shrank").
  LEFT JOIN LATERAL (
    SELECT l.occurred_at,
           CASE WHEN l.diff -> 'old' ->> 'recorded_payment' ~ '^-?\d+$' THEN (l.diff -> 'old' ->> 'recorded_payment')::bigint END AS old_rp,
           CASE WHEN l.diff -> 'new' ->> 'recorded_payment' ~ '^-?\d+$' THEN (l.diff -> 'new' ->> 'recorded_payment')::bigint END AS new_rp
    FROM public.audit_log l
    WHERE l.entity = 'invoices' AND l.entity_id = v.invoice_id::text AND l.operation = 'UPDATE'
      AND l.changed_fields && ARRAY['recorded_payment']
    ORDER BY l.occurred_at DESC LIMIT 1
  ) lrp ON true
),
-- Attendance-gap check: only months with money on them and no lesson charge.
gap AS (
  SELECT c.invoice_id,
         count(DISTINCT s.id)::int AS att_sessions,
         count(DISTINCT s.id) FILTER (WHERE a.id IS NULL)::int AS att_no_row,
         count(DISTINCT s.id) FILTER (WHERE a.status IN ('Present', 'Absent', 'Late'))::int AS att_billable
  FROM inv c
  JOIN public.enrollments e
    ON e.student_id = c.student_id
   AND (e.end_date IS NULL OR e.end_date >= c.month_first)
  JOIN public.sessions s
    ON s.class_id = e.class_id
   AND s.date >= c.month_first
   AND s.date < (c.month_first + interval '1 month')::date
   AND s.status IN ('Scheduled', 'Held')
   AND e.start_date <= s.date
   AND (e.end_date IS NULL OR e.end_date >= s.date)
   AND (e.allowed_days IS NULL OR EXTRACT(dow FROM s.date)::int = ANY (e.allowed_days))
  JOIN public.classes cl ON cl.id = s.class_id
  LEFT JOIN public.attendance a ON a.session_id = s.id AND a.student_id = c.student_id
  WHERE c.rp > 0 AND c.base = 0
    AND COALESCE(e.rate_override_vnd, cl.session_rate_vnd, 0) > 0
  GROUP BY c.invoice_id
),
-- Payment records: the payments table and the audit_log money rows.
ev AS (
  SELECT p.id::text AS ev_key, 'payments'::text AS src, p.student_id,
         COALESCE(p.family_id::text, st.grp, p.student_id::text) AS grp,
         p.amount::bigint AS amount,
         (p.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS ev_date,
         NULL::text AS ev_month, p.method, p.memo,
         p.parent_payment_id::text AS parent_key,
         (p.family_id IS NOT NULL AND p.parent_payment_id IS NULL) AS is_family_row,
         CASE WHEN p.family_id IS NOT NULL AND p.parent_payment_id IS NULL THEN 'family payment row'
              WHEN p.parent_payment_id IS NOT NULL THEN 'payments row (reversal/modification)'
              ELSE 'payments row' END AS tag
  FROM public.payments p
  LEFT JOIN stu st ON st.student_id = p.student_id
  UNION ALL
  SELECT al.id::text, 'audit', x.sid, COALESCE(st.grp, x.sid::text),
         x.amt, x.dt, x.mth, x.method, x.memo, NULL, false,
         'audit_log ' || al.action
  FROM public.audit_log al
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN al.diff ->> 'student_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           THEN (al.diff ->> 'student_id')::uuid END AS sid,
      CASE WHEN al.diff ->> 'month' ~ '^\d{4}-(0[1-9]|1[0-2])$' THEN al.diff ->> 'month' END AS mth,
      COALESCE(
        CASE WHEN al.diff ->> 'payment_amount' ~ '^-?\d+(\.\d+)?$' THEN (al.diff ->> 'payment_amount')::numeric END,
        CASE WHEN al.diff ->> 'new_recorded_payment' ~ '^-?\d+(\.\d+)?$'
              AND COALESCE(al.diff ->> 'previous_recorded_payment', al.diff ->> 'old_recorded_payment') ~ '^-?\d+(\.\d+)?$'
             THEN (al.diff ->> 'new_recorded_payment')::numeric
                - COALESCE(al.diff ->> 'previous_recorded_payment', al.diff ->> 'old_recorded_payment')::numeric END
      )::bigint AS amt,
      CASE WHEN al.diff ->> 'payment_date' ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])'
           THEN (left(al.diff ->> 'payment_date', 7) || '-01')::date + (substr(al.diff ->> 'payment_date', 9, 2)::int - 1)
           ELSE (al.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date END AS dt,
      al.diff ->> 'payment_method' AS method,
      al.diff ->> 'memo' AS memo
  ) x
  LEFT JOIN stu st ON st.student_id = x.sid
  WHERE al.action IN ('record_payment', 'batch_record_payment', 'quickpay_record_payment',
                      'payment_correction', 'update_recorded_payment', 'reverse_recorded_payment')
    AND x.sid IS NOT NULL AND x.amt IS NOT NULL
),
ev2 AS (
  SELECT e.*, i.ta AS ev_ta
  FROM ev e
  LEFT JOIN inv i ON i.student_id = e.student_id AND i.month = e.ev_month
),
pairs AS (
  SELECT a.ev_key AS a_key, b.ev_key AS b_key, a.student_id AS a_student, b.student_id AS b_student,
         a.grp, a.amount, a.ev_date AS a_date, b.ev_date AS b_date,
         a.src AS a_src, b.src AS b_src, a.ev_month AS a_month, b.ev_month AS b_month,
         a.tag AS a_tag, b.tag AS b_tag, a.method AS a_method, b.method AS b_method,
         (a.student_id = b.student_id) AS same_student
  FROM ev2 a
  JOIN ev2 b ON a.grp = b.grp AND a.amount = b.amount AND a.amount > 0
            AND a.ev_key < b.ev_key
            AND abs(a.ev_date - b.ev_date) <= 45
  WHERE (a.student_id = b.student_id
         OR (a.src <> b.src AND (a.is_family_row OR b.is_family_row)))
    AND NOT COALESCE(a.parent_key = b.ev_key OR b.parent_key = a.ev_key
                     OR (a.parent_key IS NOT NULL AND a.parent_key = b.parent_key), false)
    AND NOT (a.src = 'audit' AND b.src = 'audit' AND a.ev_month IS DISTINCT FROM b.ev_month
             AND COALESCE(a.ev_ta, 0) >= a.amount AND COALESCE(b.ev_ta, 0) >= b.amount)
),
dup_months AS (
  SELECT a_student AS student_id, a_month AS month FROM pairs WHERE a_month IS NOT NULL AND same_student
  UNION
  SELECT b_student, b_month FROM pairs WHERE b_month IS NOT NULL AND same_student
),
grp_tot AS (
  SELECT g.grp,
         COALESCE((SELECT sum(e.amount) FROM ev2 e WHERE e.grp = g.grp AND e.src = 'payments'), 0)::bigint AS pay_net,
         COALESCE((SELECT sum(e.amount) FROM ev2 e WHERE e.grp = g.grp AND e.src = 'audit'), 0)::bigint AS aud_net,
         COALESCE((SELECT sum(i.rp) FROM inv i WHERE i.grp = g.grp), 0)::bigint AS rp_tot,
         COALESCE((SELECT sum(i.ta) FROM inv i WHERE i.grp = g.grp), 0)::bigint AS ta_tot,
         COALESCE((SELECT sum(p.amount::bigint - COALESCE((SELECT sum(pa.allocated_amount::bigint)
                      FROM public.payment_allocations pa WHERE pa.parent_payment_id = p.id), 0))
                   FROM public.payments p
                   WHERE p.family_id IS NOT NULL AND p.parent_payment_id IS NULL
                     AND p.family_id::text = g.grp), 0)::bigint AS unalloc,
         (SELECT string_agg(DISTINCT s.student_name, ', ') FROM stu s WHERE s.grp = g.grp) AS names,
         (SELECT min(s.student_id::text) FROM stu s WHERE s.grp = g.grp
            AND NOT EXISTS (SELECT 1 FROM stu s2 WHERE s2.grp = g.grp AND s2.student_id <> s.student_id)) AS only_student,
         (SELECT min(s.family_name) FROM stu s WHERE s.grp = g.grp) AS family_name,
         (SELECT min(s.family_id::text) FROM stu s WHERE s.grp = g.grp) AS family_id
  FROM (SELECT grp FROM stu UNION SELECT grp FROM ev2) g
),
gap_months AS (
  SELECT i.grp, string_agg(i.student_name || ' ' || i.month, '; ' ORDER BY i.month) AS months
  FROM inv i JOIN gap g ON g.invoice_id = i.invoice_id
  WHERE g.att_billable + g.att_no_row > 0
  GROUP BY i.grp
),
flagged AS (
  SELECT i.*,
         (i.ta = 0 AND i.rp > 0) AS fa,
         (i.ta > 0 AND i.excess > 0) AS fb,
         (COALESCE(g.att_billable, 0) + COALESCE(g.att_no_row, 0) > 0 AND i.rp > 0 AND i.base = 0) AS fe,
         (i.rp > 0 AND i.old_total IS NOT NULL AND i.new_total < i.old_total) AS fr,
         (i.month = '2026-07' AND i.ta = 0 AND i.rp > 0) AS fj,
         COALESCE(g.att_sessions, 0) AS att_sessions, COALESCE(g.att_no_row, 0) AS att_no_row,
         COALESCE(g.att_billable, 0) AS att_billable,
         (dm.student_id IS NOT NULL) AS has_dup
  FROM inv i
  LEFT JOIN gap g ON g.invoice_id = i.invoice_id
  LEFT JOIN dup_months dm ON dm.student_id = i.student_id AND dm.month = i.month
  WHERE (i.ta = 0 AND i.rp > 0) OR (i.ta > 0 AND i.excess > 0)
     OR (COALESCE(g.att_billable, 0) + COALESCE(g.att_no_row, 0) > 0 AND i.rp > 0 AND i.base = 0)
     OR (i.rp > 0 AND i.old_total IS NOT NULL AND i.new_total < i.old_total)
),
cand AS (
  SELECT r.invoice_id,
         string_agg(r.month || ' short ' || to_char(r.short_by, 'FM999,999,999,999,990')
                    || CASE WHEN r.closed THEN ' [closed]' ELSE '' END
                    || CASE WHEN r.frozen THEN ' [frozen charges]' ELSE '' END,
                    '; ' ORDER BY r.rk) AS cands,
         bool_or(r.closed) AS any_closed
  FROM (
    SELECT f.invoice_id, o.month, (o.ta - o.rp) AS short_by, o.closed, o.frozen,
           row_number() OVER (PARTITION BY f.invoice_id ORDER BY abs(o.mi - f.mi), o.month) AS rk
    FROM flagged f
    JOIN inv o ON o.student_id = f.student_id AND o.invoice_id <> f.invoice_id AND o.ta > o.rp
  ) r
  WHERE r.rk <= 5
  GROUP BY r.invoice_id
),
month_rows AS (
  SELECT
    'month'::text AS row_kind, 1 AS ord,
    CASE WHEN f.fj OR f.fr OR f.fe THEN 0 ELSE 1 END AS att_rank,
    f.student_name, f.student_id, f.family_name, f.family_id::text AS family_id,
    f.month, f.invoice_id,
    f.base AS invoice_base, f.ta AS invoice_total, f.rp AS invoice_recorded_payment, f.snap_rp AS snapshot_recorded_payment,
    f.bal_before AS balance_before_month, f.excess AS excess_on_this_month, f.bal_all AS student_balance_all,
    c.cands AS candidate_months,
    f.repriced_at, f.old_total AS total_before_reprice, f.new_total AS total_after_reprice,
    CASE WHEN f.old_total IS NULL THEN NULL ELSE (f.rp = f.old_total) END AS payment_equals_old_total,
    CASE WHEN f.old_total IS NULL THEN NULL ELSE (f.rp - f.old_total) END AS excess_if_charge_restored,
    f.rp_changed_at AS rp_last_changed_at,
    CASE WHEN f.rp_changed_at IS NULL THEN NULL ELSE COALESCE(f.old_rp::text, '?') || ' -> ' || COALESCE(f.new_rp::text, '?') END AS rp_last_change,
    (SELECT COALESCE(sum(e.amount), 0) FROM ev2 e WHERE e.student_id = f.student_id AND e.src = 'audit' AND e.ev_month = f.month)::bigint AS month_logged_in_audit,
    f.att_sessions, f.att_no_row, f.att_billable,
    f.closed AS source_closed, f.frozen AS source_frozen_charges,
    t.pay_net AS group_payment_rows_net, t.aud_net AS group_audit_logged_net, t.rp_tot AS group_recorded_payment,
    (t.rp_tot - t.pay_net - t.aud_net) AS group_gap, t.unalloc AS family_payment_unallocated,
    (SELECT string_agg(q.line, ' | ' ORDER BY q.d DESC)
       FROM (SELECT e.ev_date AS d,
                    e.ev_date::text || ' ' || to_char(e.amount, 'FM999,999,999,999,990') || ' ' || COALESCE(e.method, '?')
                    || COALESCE(' "' || left(e.memo, 40) || '"', '') || ' [' || e.tag
                    || CASE WHEN e.src = 'audit' THEN ' for ' || COALESCE(e.ev_month, '?') ELSE '' END || ']' AS line
             FROM ev2 e
             WHERE (e.student_id = f.student_id AND (e.src = 'payments' OR e.ev_month = f.month))
                OR (e.src = 'payments' AND e.grp = f.grp)
             ORDER BY e.ev_date DESC LIMIT 8) q) AS evidence,
    concat_ws('+', CASE WHEN f.fa THEN 'A' END, CASE WHEN f.fb THEN 'B' END, CASE WHEN f.fe THEN 'E' END, CASE WHEN f.fr THEN 'R' END, CASE WHEN f.fj THEN 'J' END,
              CASE WHEN f.has_dup THEN 'D' END) AS flags,
    CASE
      WHEN f.fj THEN 'charge wiped by the 28 Oct bulk cancellation; the July restore will put it back: do not move this payment'
           || CASE WHEN f.old_total IS NULL THEN ' (no audit evidence of the earlier total found: confirm with the July restore check)'
                   WHEN f.rp = f.old_total THEN ' (earlier charge ' || to_char(f.old_total, 'FM999,999,999,999,990') || ' equals the payment exactly)'
                   WHEN f.rp > f.old_total THEN ' (earlier charge ' || to_char(f.old_total, 'FM999,999,999,999,990') || '; once restored the payment is OVER by ' || to_char(f.rp - f.old_total, 'FM999,999,999,999,990') || ': an overpayment to review, not a misplaced month)'
                   ELSE ' (earlier charge ' || to_char(f.old_total, 'FM999,999,999,999,990') || '; once restored the payment is SHORT by ' || to_char(f.old_total - f.rp, 'FM999,999,999,999,990') || ')' END
      WHEN f.fr THEN 'bill was repriced down on ' || to_char(f.repriced_at, 'YYYY-MM-DD HH24:MI') || ' (Hanoi) from '
           || to_char(f.old_total, 'FM999,999,999,999,990') || ' to ' || to_char(f.new_total, 'FM999,999,999,999,990') || '; '
           || CASE WHEN f.rp = f.old_total THEN 'the payment matches the earlier charge: restore the charge, do not move the payment'
                   ELSE 'the payment (' || to_char(f.rp, 'FM999,999,999,999,990') || ') differs from the earlier charge by ' || to_char(f.rp - f.old_total, 'FM999,999,999,999,990') || ': restore the charge first, then judge the difference' END
           || CASE WHEN f.rp_changed_at IS NULL THEN '; no logged change to the payment'
                   WHEN f.rp_changed_at < f.repriced_at THEN '; the payment was last changed ' || to_char(f.rp_changed_at, 'YYYY-MM-DD') || ', BEFORE the repricing (the charge shrank)'
                   ELSE '; the payment was last changed ' || to_char(f.rp_changed_at, 'YYYY-MM-DD') || ', AFTER the repricing' END
      WHEN f.fe THEN 'bill may be missing lessons (attendance gap): do not move this payment - '
           || f.att_sessions || ' lesson(s) this month fall in an enrollment, ' || f.att_no_row
           || ' with no attendance row, ' || f.att_billable || ' already marked billable but the bill says base 0 (recalculate after the attendance restore)'
      WHEN f.has_dup THEN 'possible duplicate payment: the same amount is recorded twice for this student within 45 days (see pair rows); family is ahead by '
           || to_char(f.bal_all, 'FM999,999,999,999,990')
      WHEN f.excess > 0 AND f.short_others >= f.excess THEN 'only the month label looks wrong: '
           || to_char(f.excess, 'FM999,999,999,999,990') || ' fits the under-paid month(s) in candidate_months; overall balance is '
           || to_char(f.bal_all, 'FM999,999,999,999,990') || CASE WHEN f.bal_all <= 0 THEN ' (nothing extra paid)' ELSE ' (family ahead)' END
      WHEN f.excess > 0 THEN 'family is ahead by ' || to_char(f.bal_all, 'FM999,999,999,999,990')
           || ': under-paid months can take only ' || to_char(f.short_others, 'FM999,999,999,999,990')
           || ' of the ' || to_char(f.excess, 'FM999,999,999,999,990')
           || ' - an advance for a month not billed yet, or an extra payment (check pair rows and evidence)'
      ELSE 'this month charges nothing but its payment only pays down earlier debt: the money may belong to the older month (see balance_before_month)'
    END
    || CASE WHEN f.rp > 0 AND NOT EXISTS (SELECT 1 FROM ev2 e WHERE e.student_id = f.student_id AND e.src = 'audit' AND e.ev_month = f.month)
            THEN '; no payment-dialog log for this month (came from a family payment, an edit, or was never logged)' ELSE '' END
    || CASE WHEN f.closed THEN '; involves a closed month: SOURCE month is closed (books frozen at ' || COALESCE(f.snap_rp::text, '?') || ' paid)' ELSE '' END
    || CASE WHEN COALESCE(c.any_closed, false) THEN '; some candidate target months are closed' ELSE '' END
    AS verdict
  FROM flagged f
  LEFT JOIN cand c ON c.invoice_id = f.invoice_id
  LEFT JOIN grp_tot t ON t.grp = f.grp
),
pair_rows AS (
  SELECT
    'pair'::text, 2, 1,
    sb.student_name, p.b_student, sb.family_name, sb.family_id::text,
    COALESCE(p.b_month, p.a_month), NULL::uuid,
    NULL::bigint, NULL::bigint, NULL::bigint, NULL::bigint,
    NULL::bigint, NULL::bigint, NULL::bigint,
    NULL::text,
    NULL::timestamp, NULL::bigint, NULL::bigint, NULL::boolean, NULL::bigint, NULL::timestamp, NULL::text,
    NULL::bigint,
    NULL::int, NULL::int, NULL::int,
    NULL::boolean, NULL::boolean,
    t.pay_net, t.aud_net, t.rp_tot, (t.rp_tot - t.pay_net - t.aud_net), t.unalloc,
    to_char(p.amount, 'FM999,999,999,999,990') || ' on ' || p.a_date::text || ' (' || p.a_tag || COALESCE(', month ' || p.a_month, '') || COALESCE(', ' || p.a_method, '')
      || ') and on ' || p.b_date::text || ' (' || p.b_tag || COALESCE(', month ' || p.b_month, '') || COALESCE(', ' || p.b_method, '') || ')',
    'D',
    'possible duplicate payment: ' || to_char(p.amount, 'FM999,999,999,999,990') || ' recorded twice, '
      || abs(p.a_date - p.b_date) || ' day(s) apart'
      || CASE WHEN p.same_student THEN ' for the same student' ELSE ' (family payment vs a sibling record)' END
      || CASE WHEN p.a_month IS NOT DISTINCT FROM p.b_month AND p.a_month IS NOT NULL THEN ', both on ' || p.a_month || ': strong'
              WHEN p.a_month IS NULL OR p.b_month IS NULL THEN ': one has no month (payments table), check which bill it landed on'
              ELSE ', on ' || p.a_month || ' and ' || p.b_month || ' (not both explained by their own bills)' END
  FROM pairs p
  LEFT JOIN stu sb ON sb.student_id = p.b_student
  LEFT JOIN grp_tot t ON t.grp = p.grp
),
group_rows AS (
  SELECT
    'group'::text, 3, 1,
    t.names, t.only_student::uuid, t.family_name, t.family_id,
    NULL::text, NULL::uuid,
    NULL::bigint, NULL::bigint, NULL::bigint, NULL::bigint,
    NULL::bigint, NULL::bigint, (t.rp_tot - t.ta_tot),
    NULL::text,
    NULL::timestamp, NULL::bigint, NULL::bigint, NULL::boolean, NULL::bigint, NULL::timestamp, NULL::text,
    NULL::bigint,
    NULL::int, NULL::int, NULL::int,
    NULL::boolean, NULL::boolean,
    t.pay_net, t.aud_net, t.rp_tot, (t.rp_tot - t.pay_net - t.aud_net), t.unalloc,
    (SELECT string_agg(q.line, ' | ' ORDER BY q.d DESC)
       FROM (SELECT e.ev_date AS d,
                    e.ev_date::text || ' ' || to_char(e.amount, 'FM999,999,999,999,990') || ' ' || COALESCE(e.method, '?')
                    || COALESCE(' "' || left(e.memo, 40) || '"', '') || ' [' || e.tag || COALESCE(' for ' || e.ev_month, '') || ']' AS line
             FROM ev2 e WHERE e.grp = t.grp ORDER BY e.ev_date DESC LIMIT 10) q),
    CASE WHEN t.rp_tot - t.pay_net - t.aud_net > 0 THEN 'C+' ELSE 'C-' END,
    CASE
      WHEN t.rp_tot - t.pay_net - t.aud_net > 0 THEN
        'money on the bills with no payment record: bills hold ' || to_char(t.rp_tot, 'FM999,999,999,999,990')
        || ' paid, records show ' || to_char(t.pay_net + t.aud_net, 'FM999,999,999,999,990')
        || ' (older than audit logging, an edit in Recorded Payment Manager, or a deleted/modified family payment, which never lowers the bill)'
      WHEN t.unalloc > 0 AND -(t.rp_tot - t.pay_net - t.aud_net) <= t.unalloc THEN
        'payment records exceed the bills by ' || to_char(-(t.rp_tot - t.pay_net - t.aud_net), 'FM999,999,999,999,990')
        || ', within the family-payment leftover held as credit (' || to_char(t.unalloc, 'FM999,999,999,999,990') || '): by design, no action'
      ELSE
        'payment with no bill: records show ' || to_char(t.pay_net + t.aud_net, 'FM999,999,999,999,990')
        || ', bills hold only ' || to_char(t.rp_tot, 'FM999,999,999,999,990')
        || ' (payment never reached a bill, or the bill was lowered afterwards)'
    END
    || COALESCE('; attendance-gap months for this family: ' || gm.months || ' - fix lessons before judging the money', '')
  FROM grp_tot t
  LEFT JOIN gap_months gm ON gm.grp = t.grp
  WHERE t.rp_tot <> t.pay_net + t.aud_net
)
SELECT
  row_kind,
  concat_ws(' / ',
    CASE WHEN student_id IN ('b41542f5-12d2-40c3-87ec-017bd6f0b046', 'd227cfea-71f9-410a-9cc7-9eafe2ed996c')
         THEN 'example: reported student' END,
    CASE WHEN month = '2026-07' THEN 'July 2026 group' END,
    CASE WHEN att_rank = 0 THEN 'DO NOT MOVE: fix the bill first' END) AS priority_note,
  student_name, student_id, family_name, family_id, month, invoice_id,
  invoice_base, invoice_total, invoice_recorded_payment, snapshot_recorded_payment,
  balance_before_month, excess_on_this_month, student_balance_all,
  candidate_months,
  repriced_at, total_before_reprice, total_after_reprice, payment_equals_old_total, excess_if_charge_restored,
  rp_last_changed_at, rp_last_change,
  month_logged_in_audit,
  att_sessions, att_no_row, att_billable,
  source_closed, source_frozen_charges,
  group_payment_rows_net, group_audit_logged_net, group_recorded_payment, group_gap, family_payment_unallocated,
  evidence, flags, verdict
FROM (
  SELECT * FROM month_rows
  UNION ALL SELECT * FROM pair_rows
  UNION ALL SELECT * FROM group_rows
) u
ORDER BY att_rank,
         (student_id IN ('b41542f5-12d2-40c3-87ec-017bd6f0b046', 'd227cfea-71f9-410a-9cc7-9eafe2ed996c')) DESC,
         (month = '2026-07') DESC NULLS LAST,
         ord,
         abs(COALESCE(excess_on_this_month, group_gap, 0)) DESC,
         student_name, month;
