-- REPAIR-restore-six-bills-paid-exactly.sql
-- Owner, 24 Nov 2026. Paste into the Supabase SQL editor. Not a migration.
--
-- WHY. On 24 Nov 2026, 09:11 to 09:24 (Hanoi), 25 held closed-month bills
-- were approved in Finance > Tuition, which saved today's pricing over what
-- was charged at the time. Six of those bills had been paid to the dong, and
-- no longer match the payment: three went up (a discount of 94,500, 84,000
-- and 84,000 was lost), three went down (262,500, 63,000 and 52,500 turned
-- into credit). The owner asked for those six to go back to what was charged.
--
-- WHAT IT DOES, for those six bills only (listed by id below):
--   * puts back base, discount, total, class lines, confirmation and review
--     flags exactly as they were the moment before the approval. They are
--     read from the audit log's own copy of the bill (audit_log.diff.old),
--     not typed in here. The paid / partial label is set by the one rule
--     (public.invoice_paid_label) from the payment already on the bill;
--   * LOCKS the bill (tuition_frozen, with a reason), so that it stands as
--     charged and is no longer offered for approval. An admin can unlock it
--     on the child's page (Lock / Unlock), never by SQL.
-- A bill is restored only if it still holds exactly what the approval wrote,
-- still has the same payment on it and is not locked. Anything else is left
-- alone and shows as "skip" in step 1.
--
-- WHAT DOES NOT CHANGE. No payment. The other 19 approvals. Each child's
-- carried balance is recalculated by the database (invoices_carry_sync).
--
-- UNDO. Step 2 copies the six bills, as they are now, into
-- public.invoices_before_restore_20261124. To go back to today's pricing
-- for one of them: unlock it on the child's page, then approve it again in
-- Finance > Tuition.

-- ---------------------------------------------------------------- STEP 1
-- Look first. Changes nothing. Six rows; "will_restore" must say yes.
WITH six(id) AS (VALUES
  ('f92b5ed3-595d-4125-b758-e37e30e7a335'::uuid),  -- 2025-10
  ('35746601-333a-4445-97cc-50de37bbb5e1'::uuid),  -- 2025-10
  ('891b3dc9-7888-4276-9fb0-b3251fc4533a'::uuid),  -- 2025-10
  ('36bcbdfb-cc5f-4d21-bf49-9c8f6cac9737'::uuid),  -- 2025-11
  ('77f8e1fc-abba-4323-8e28-aff2c8da3b78'::uuid),  -- 2026-05
  ('c2a0dbf0-3a82-423c-af74-44af70892063'::uuid)   -- 2026-05
),
was AS (
  -- The audit log's copy of each bill at the approval: old = before, new = after.
  SELECT DISTINCT ON (a.entity_id) a.entity_id::uuid AS id, a.occurred_at, a.diff -> 'old' AS o, a.diff -> 'new' AS n
    FROM public.audit_log a
    JOIN six ON six.id::text = a.entity_id
   WHERE a.entity = 'invoices' AND a.operation = 'UPDATE'
     AND a.changed_fields @> ARRAY['total_amount']
     AND a.diff -> 'new' -> 'review_flags' @> '[{"type": "past_month_repriced"}]'::jsonb
   ORDER BY a.entity_id, a.occurred_at DESC
)
SELECT i.month, st.full_name,
       i.base_amount AS base_now, i.discount_amount AS discount_now, i.total_amount AS total_now,
       (w.o ->> 'base_amount')::int AS base_back, (w.o ->> 'discount_amount')::int AS discount_back, (w.o ->> 'total_amount')::int AS total_back,
       i.recorded_payment AS paid,
       CASE WHEN w.id IS NULL THEN 'skip: no approval found in the audit log'
            WHEN i.tuition_frozen THEN 'skip: already locked'
            WHEN i.base_amount <> (w.n ->> 'base_amount')::int OR i.discount_amount <> (w.n ->> 'discount_amount')::int
              OR i.total_amount <> (w.n ->> 'total_amount')::int THEN 'skip: the bill changed again after the approval'
            WHEN coalesce(i.recorded_payment, 0) <> (w.o ->> 'total_amount')::int THEN 'skip: the payment on it is no longer the old total'
            ELSE 'yes' END AS will_restore
  FROM six
  JOIN public.invoices i ON i.id = six.id
  JOIN public.students st ON st.id = i.student_id
  LEFT JOIN was w ON w.id = i.id
 ORDER BY i.month, st.full_name;

-- ---------------------------------------------------------------- STEP 2
-- The restore. Run it only after step 1 shows six rows that say "yes".
-- One transaction: a copy of the six bills as they are now, the restore, then
-- the result (six rows, total = paid, locked). It refuses to run twice (the
-- copy table already exists).
/*
BEGIN;

CREATE TABLE public.invoices_before_restore_20261124 AS
SELECT i.* FROM public.invoices i
 WHERE i.id IN ('f92b5ed3-595d-4125-b758-e37e30e7a335', '35746601-333a-4445-97cc-50de37bbb5e1',
                '891b3dc9-7888-4276-9fb0-b3251fc4533a', '36bcbdfb-cc5f-4d21-bf49-9c8f6cac9737',
                '77f8e1fc-abba-4323-8e28-aff2c8da3b78', 'c2a0dbf0-3a82-423c-af74-44af70892063');
-- The copy is for the owner only: nobody reads it through the app.
ALTER TABLE public.invoices_before_restore_20261124 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoices_before_restore_20261124 FROM PUBLIC, anon, authenticated;

WITH was AS (
  SELECT DISTINCT ON (a.entity_id) a.entity_id::uuid AS id, a.diff -> 'old' AS o, a.diff -> 'new' AS n
    FROM public.audit_log a
    JOIN public.invoices_before_restore_20261124 b ON b.id::text = a.entity_id
   WHERE a.entity = 'invoices' AND a.operation = 'UPDATE'
     AND a.changed_fields @> ARRAY['total_amount']
     AND a.diff -> 'new' -> 'review_flags' @> '[{"type": "past_month_repriced"}]'::jsonb
   ORDER BY a.entity_id, a.occurred_at DESC
)
UPDATE public.invoices i
   SET base_amount = (w.o ->> 'base_amount')::int,
       discount_amount = (w.o ->> 'discount_amount')::int,
       total_amount = (w.o ->> 'total_amount')::int,
       class_breakdown = w.o -> 'class_breakdown',
       status = public.invoice_paid_label(
         coalesce(i.recorded_payment, 0)::bigint,
         ((w.o ->> 'total_amount')::int + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0))::bigint,
         (w.o ->> 'base_amount')::bigint, (w.o ->> 'total_amount')::bigint),
       confirmation_status = w.o ->> 'confirmation_status',
       review_flags = coalesce(w.o -> 'review_flags', '[]'::jsonb),
       tuition_frozen = true,
       frozen_reason = 'Kept as charged and paid: the approval of 24 Nov 2026 was undone (owner)'
  FROM was w
 WHERE i.id = w.id
   AND NOT i.tuition_frozen
   AND i.base_amount = (w.n ->> 'base_amount')::int
   AND i.discount_amount = (w.n ->> 'discount_amount')::int
   AND i.total_amount = (w.n ->> 'total_amount')::int
   AND coalesce(i.recorded_payment, 0) = (w.o ->> 'total_amount')::int;

SELECT i.month, st.full_name, b.total_amount AS total_before, i.total_amount AS total_now, i.recorded_payment AS paid,
       i.tuition_frozen AS locked, i.carry_out_credit, i.carry_out_debt
  FROM public.invoices_before_restore_20261124 b
  JOIN public.invoices i ON i.id = b.id
  JOIN public.students st ON st.id = i.student_id
 ORDER BY i.month, st.full_name;

COMMIT;
*/
