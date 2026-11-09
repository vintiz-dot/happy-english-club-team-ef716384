-- READ-ONLY. One SELECT, no writes. Paste the whole file into the Supabase
-- SQL editor (it shows only the last statement's result, which is this one).
--
-- WHAT IT LISTS
-- calculate-tuition and calculate-tuition-bulk used to load discounts with
-- `effective_from <= first day of NEXT month`, so a discount assignment or
-- referral bonus dated the 1st of month M+1 was also applied to month M's
-- bill. (Fixed to `<`.) One row here = one such 1st-dated discount and the
-- single earlier month it could have leaked into (affected_month). Monthly
-- renewals (Oct 1-31, then Nov 1-30) are the common case: October was
-- discounted twice.
-- Two places can hold the leak:
--   * the saved bill (invoices): only calculate-tuition writes it.
--   * the month-end books (monthly_finance_snapshots): snapshot-monthly-finance
--     copies calculate-tuition-bulk's figures verbatim, and bulk had the same bug.
-- A row is kept only if the old filter's other side also passed
-- (effective_to is NULL or on/after the first day of affected_month).
--
-- HOW TO READ THE COLUMNS
--   source                  'assignment' (discount_assignments) or 'referral' (referral_bonuses)
--   student_name/student_id who is discounted
--   discount_name/type/value/is_active  the discount; referrals are named 'Referral Bonus' and always active.
--                           is_active = false: tuition skips an inactive discount today, so a recalculation adds nothing.
--   row_created_at          when the discount row was created
--   effective_from/to       the dates on the row (from is always the 1st of a month)
--   affected_month          YYYY-MM, the month BEFORE effective_from: the only month the old filter reached
--   invoice_*               the saved bill for affected_month (NULL = no bill saved)
--   tuition_frozen          true = recalculation keeps the saved figures
--   month_closed            true = an active monthly_finance_snapshots row exists for that student+month
--   snapshot_closed_at, snapshot_base/total_discount/total_amount  that snapshot's figures (NULL = not closed)
--   estimated_extra_discount  what the leak would take off the BILL: percent = round(base * value / 100),
--                           amount = value; 0 when the discount is inactive or base is 0. An estimate: it
--                           ignores caps and any other discount on the same bill.
--   last_calc_listed_it     true when the last calculate-tuition run listed this discount's name in the bill's
--                           review_flags (only written when the bill differs from the class rate, and names
--                           are de-duplicated). false is not proof it was not applied.
--   bill_would_rise_by      NULL when there is no bill. When last_calc_listed_it: how much the bill goes UP if
--                           the extra discount is removed: max(0, base - max(discount - estimated, 0)) - total.
--                           Otherwise 0 (the bill does not hold it, so a recalculation would not change it).
--                           When last_calc_listed_it AND same_name_also_covers_month are both true the name
--                           match is ambiguous (the month may legitimately carry the discount once), so
--                           treat the figure as an UPPER BOUND.
--   same_name_also_covers_month  another row for this student with the same name genuinely covers
--                           affected_month (the renewal pattern; the month may hold the discount twice).
--   snapshot_has_it         the month is closed AND the discount is active AND this row was created before the
--                           snapshot was closed AND the snapshot base is > 0: the closed books were built by the
--                           buggy bulk reader, so they carry the leak whether or not the invoice does. Later
--                           edits to the row's dates are ignored (only created_at is compared).
--   snapshot_extra_discount the same estimate on the snapshot's own base amount.
--   verdict                 plain words, see the CASE below
--   bill_state              open / closed / frozen: the bucket used for the bill totals below
--   month_rows, month_total_rise_*, month_total_snapshot_extra  window totals over every row listed for the
--                           same affected_month: row count, sum of bill_would_rise_by split by bill_state,
--                           and sum of snapshot_extra_discount where snapshot_has_it. Rows are not
--                           de-duplicated per student, so a student with two leaking rows counts twice.
--
-- NOTE invoices.updated_at has a trigger, so payments move it too; it shows when the
-- bill row was last touched, not when it was last recalculated.

WITH all_src AS (
  SELECT 'assignment'::text AS source, da.id, da.student_id,
         dd.name AS discount_name, dd.type::text AS discount_type, dd.value AS discount_value,
         dd.is_active, da.effective_from, da.effective_to, da.created_at
  FROM public.discount_assignments da
  JOIN public.discount_definitions dd ON dd.id = da.discount_def_id
  UNION ALL
  SELECT 'referral', rb.id, rb.student_id,
         'Referral Bonus', rb.type::text, rb.value,
         true, rb.effective_from, rb.effective_to, rb.created_at
  FROM public.referral_bonuses rb
),
src AS (
  SELECT s.*,
         to_char(s.effective_from - interval '1 month', 'YYYY-MM') AS affected_month,
         (s.effective_from - interval '1 month')::date AS month_first,
         (s.effective_from - 1) AS month_last
  FROM all_src s
  WHERE EXTRACT(day FROM s.effective_from) = 1
    AND (s.effective_to IS NULL OR s.effective_to >= (s.effective_from - interval '1 month')::date)
),
joined AS (
  SELECT
    s.*,
    st.full_name AS student_name,
    i.id AS invoice_id, i.base_amount, i.discount_amount, i.total_amount, i.recorded_payment,
    i.status AS invoice_status, i.confirmation_status, i.updated_at AS invoice_updated_at,
    COALESCE(i.tuition_frozen, false) AS tuition_frozen,
    (sn.student_id IS NOT NULL) AS month_closed,
    sn.closed_at AS snapshot_closed_at, sn.base_amount AS snapshot_base,
    sn.total_discount AS snapshot_total_discount, sn.total_amount AS snapshot_total_amount,
    CASE
      WHEN i.id IS NULL OR NOT s.is_active OR COALESCE(i.base_amount, 0) = 0 THEN 0
      WHEN s.discount_type = 'percent' THEN round(i.base_amount::numeric * s.discount_value / 100.0)
      ELSE s.discount_value
    END AS estimated_extra_discount,
    CASE
      WHEN sn.student_id IS NULL OR NOT s.is_active OR COALESCE(sn.base_amount, 0) = 0 THEN 0
      WHEN s.discount_type = 'percent' THEN round(sn.base_amount::numeric * s.discount_value / 100.0)
      ELSE s.discount_value
    END AS snapshot_extra_discount,
    (sn.student_id IS NOT NULL AND s.is_active AND s.created_at < sn.closed_at
       AND COALESCE(sn.base_amount, 0) > 0) AS snapshot_has_it,
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(i.review_flags) = 'array' THEN i.review_flags ELSE '[]'::jsonb END) f
      WHERE jsonb_typeof(f -> 'details' -> 'reasons') = 'array'
        AND (f -> 'details' -> 'reasons') @> to_jsonb(s.discount_name)
    ) AS last_calc_listed_it,
    EXISTS (
      SELECT 1 FROM all_src o
      WHERE o.student_id = s.student_id AND o.discount_name = s.discount_name
        AND NOT (o.source = s.source AND o.id = s.id)
        AND o.effective_from <= s.month_last
        AND (o.effective_to IS NULL OR o.effective_to >= s.month_first)
    ) AS same_name_also_covers_month
  FROM src s
  LEFT JOIN public.students st ON st.id = s.student_id
  LEFT JOIN public.invoices i ON i.student_id = s.student_id AND i.month = s.affected_month
  LEFT JOIN LATERAL (
    SELECT m.student_id, m.closed_at, m.base_amount, m.total_discount, m.total_amount
    FROM public.monthly_finance_snapshots m
    WHERE m.student_id = s.student_id AND m.month = s.affected_month AND m.superseded_at IS NULL
    ORDER BY m.version DESC
    LIMIT 1
  ) sn ON true
),
scored AS (
  SELECT j.*,
    CASE WHEN j.invoice_id IS NULL THEN NULL
         WHEN j.last_calc_listed_it
           THEN GREATEST(0, j.base_amount - GREATEST(j.discount_amount - j.estimated_extra_discount, 0)) - j.total_amount
         ELSE 0
    END AS bill_would_rise_by,
    CASE WHEN j.tuition_frozen THEN 'frozen' WHEN j.month_closed THEN 'closed' ELSE 'open' END AS bill_state
  FROM joined j
)
SELECT
  source,
  student_name, student_id,
  discount_name, discount_type, discount_value, is_active,
  created_at AS row_created_at, effective_from, effective_to,
  affected_month,
  invoice_id, base_amount AS invoice_base, discount_amount AS invoice_discount, total_amount AS invoice_total,
  recorded_payment AS invoice_recorded_payment, invoice_status, confirmation_status, invoice_updated_at,
  tuition_frozen, month_closed,
  snapshot_closed_at, snapshot_base, snapshot_total_discount, snapshot_total_amount,
  estimated_extra_discount, bill_would_rise_by,
  last_calc_listed_it, same_name_also_covers_month,
  snapshot_has_it, snapshot_extra_discount,
  CASE
    WHEN tuition_frozen AND last_calc_listed_it THEN 'frozen bill includes the extra discount: stays unless an admin unfreezes'
    WHEN tuition_frozen THEN 'frozen, not in the bill'
    WHEN month_closed AND snapshot_has_it THEN 'closed month: the books (snapshot) include the extra discount'
         || CASE WHEN last_calc_listed_it THEN '; saved bill too' ELSE '' END
    WHEN month_closed THEN 'closed month: not in the snapshot'
         || CASE WHEN last_calc_listed_it THEN '; saved bill lists it' ELSE '' END
    WHEN invoice_id IS NULL THEN 'no bill saved for that month'
    WHEN last_calc_listed_it AND same_name_also_covers_month THEN 'saved bill lists a same-named discount, may be counted twice'
    WHEN last_calc_listed_it THEN 'saved bill includes the extra discount'
    ELSE 'not in the saved bill yet, next recalculation would have added it'
  END
  || CASE WHEN tuition_frozen AND month_closed THEN
       CASE WHEN snapshot_has_it THEN '; closed month: snapshot includes it' ELSE '; closed month: not in the snapshot' END
     ELSE '' END
  || CASE WHEN NOT is_active THEN ' (discount is inactive now: a recalculation will not apply it)' ELSE '' END AS verdict,
  bill_state,
  count(*) OVER w AS month_rows,
  COALESCE(sum(bill_would_rise_by) FILTER (WHERE bill_state = 'open') OVER w, 0) AS month_total_rise_open,
  COALESCE(sum(bill_would_rise_by) FILTER (WHERE bill_state = 'closed') OVER w, 0) AS month_total_rise_closed,
  COALESCE(sum(bill_would_rise_by) FILTER (WHERE bill_state = 'frozen') OVER w, 0) AS month_total_rise_frozen,
  COALESCE(sum(snapshot_extra_discount) FILTER (WHERE snapshot_has_it) OVER w, 0) AS month_total_snapshot_extra
FROM scored
WINDOW w AS (PARTITION BY affected_month)
ORDER BY affected_month DESC, student_name, effective_from;
