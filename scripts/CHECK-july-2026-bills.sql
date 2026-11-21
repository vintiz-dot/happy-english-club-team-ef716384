-- READ-ONLY companion to FIX-restore-july-2026-attendance.sql. Nothing
-- here writes.
--
-- One row per July 2026 invoice: what it says now, what it said before
-- the bulk cancellation of 28 Oct 2026 (from audit_log), and what the fix
-- will do with it. Run it before the fix to check the bills, or after to
-- confirm (then every bill shows "already frozen").
--
-- "before" is the old side of the first change to the bill's amounts on
-- or after the cancellation day. Blank "before" means the amounts have
-- not changed since - only balances or payments did.

WITH d AS (SELECT DATE '2026-10-28' AS cancel_day)
SELECT
  st.full_name                                        AS student,
  i.total_amount                                      AS total_now,
  (pre.diff -> 'old' ->> 'total_amount')::numeric     AS total_before,
  i.base_amount                                       AS base_now,
  (pre.diff -> 'old' ->> 'base_amount')::numeric      AS base_before,
  i.discount_amount                                   AS discount_now,
  (pre.diff -> 'old' ->> 'discount_amount')::numeric  AS discount_before,
  i.recorded_payment,
  pre.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh'     AS repriced_at,
  coalesce(p.display_name, pre.actor_user_id::text, CASE WHEN pre.diff IS NOT NULL
                             THEN 'edge function / service' END) AS repriced_by,
  CASE
    -- the owner's three decisions of 9 Nov 2026, as in the fix
    WHEN i.tuition_frozen AND st.full_name ILIKE '%thao vy%' AND pre.diff IS NOT NULL
      THEN 'already frozen - put back to "before", stays frozen'
    WHEN NOT i.tuition_frozen AND (st.full_name ILIKE 'thai minh%' OR st.full_name ILIKE 'thanh truc%')
      THEN 'kept at today''s figure (rain day off), then frozen'
    WHEN i.tuition_frozen THEN 'already frozen - left alone'
    WHEN (i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= d.cancel_day
      THEN 'created after the cancellation - left alone'
    WHEN pre.diff IS NOT NULL THEN 'put back to "before", then frozen'
    ELSE 'frozen as it is'
  END                                                 AS fix_will
FROM public.invoices i
CROSS JOIN d
JOIN public.students st ON st.id = i.student_id
LEFT JOIN LATERAL (
  SELECT l.diff, l.occurred_at, l.actor_user_id FROM public.audit_log l
  WHERE l.entity = 'invoices' AND l.entity_id = i.id::text
    AND l.operation = 'UPDATE'
    AND l.occurred_at >= (d.cancel_day::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
    AND l.changed_fields && ARRAY['base_amount','discount_amount','total_amount','class_breakdown']
  ORDER BY l.occurred_at
  LIMIT 1
) pre ON true
LEFT JOIN public.profiles p ON p.id = pre.actor_user_id
WHERE i.month = '2026-07'
ORDER BY (pre.diff IS NULL), st.full_name;
