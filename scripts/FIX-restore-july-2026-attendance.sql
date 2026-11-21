-- Restore July 2026 attendance after the bulk cancellation.
--
-- WHAT HAPPENED. A bulk cancellation of July's lessons fired
-- set_attendance_excused_on_cancel, which turned every non-Excused mark
-- on those lessons into Excused. The lessons were restored afterwards;
-- the marks were not. A trace found 322 overwritten marks and 74 that
-- were already Excused before the cancellation (counts per class below).
-- What each overwritten mark was before (Present, Absent or Late) is not
-- recorded anywhere, and saved bills hold totals, not per-lesson marks.
--
-- WHAT THE OWNER DECIDED (9 Nov 2026):
--   * The overwritten marks become Present.
--   * These stay Excused, to be fixed by hand if needed:
--       Anna, Sun Class          5, 12, 26 July - her pause covers July
--       Baby Three, Mars         29, 31 July    - after enrollment ended
--       Thao Vy-Moon, Sanrio 6   all 7          - billed 4, evidence for 2
--   * The 74 marks that were already Excused stay Excused.
--   * July bills stay as charged: July invoices are frozen first.
--
-- HOW THE OVERWRITTEN MARKS ARE FOUND. The cancel trigger changed only
-- status, and the updated_at trigger stamped every row it touched, so
-- the 322 share one day of updated_at. The marks that were already
-- Excused were not touched and keep older stamps. The script finds the
-- one day whose July Excused marks match the trace's count for EVERY
-- class, and refuses to run if no day, or more than one, does.
--
-- INVOICES. Most July invoices were rewritten on or after that day,
-- several down to 0: repriced from the Excused marks. audit_log (since
-- 20261009130000) keeps old and new figures for every invoice write a
-- person or an edge function made, so the first amount change on or
-- after the cancellation day carries, as its "old" side, the bill as
-- it stood before. Each July invoice then:
--   amounts changed since  -> put back to those figures, and frozen
--   amounts not changed    -> frozen as it is (only balances moved)
--   created on/after day   -> left alone; it has no earlier figures
--   already frozen         -> left alone (frozen deliberately on 6 Nov)
-- scripts/CHECK-july-2026-bills.sql lists every bill this way, as rows.
--
-- UNDO. Every attendance row changed is copied first into
-- public.attendance_restore_2026_07, and every invoice's figures into
-- public.invoice_restore_2026_07 (neither reachable from the API).
--
-- HOW TO RUN. Paste the whole file into the Supabase SQL editor.
--   1. As shipped it is a DRY RUN: it does everything, then rolls back
--      and reports what it would have done as an error message
--      beginning "DRY RUN OK".
--   2. If those numbers are right, change 'on' to 'off' on the
--      dry_run line just below and run it again.
-- Any check that fails rolls the whole thing back and says why.

BEGIN;

SELECT set_config('hec.restore_dry_run', 'off', true);   -- dry_run

-- ---------------------------------------------------------------- 1
-- The trace's counts.

CREATE TEMP TABLE _expected(cls text PRIMARY KEY, overwritten int, already int) ON COMMIT DROP;
INSERT INTO _expected VALUES
  ('jupiter',        68,  4),
  ('mars',           60, 20),
  ('sanrio grade 6', 42,  3),
  ('sky 1',          45, 27),
  ('stars',          32,  4),
  ('sun class',      29,  2),
  ('venus',          46, 14);

-- Every July Excused mark in those classes on a lesson that is not
-- cancelled now. Only these can be restored.
CREATE TEMP TABLE _july_all ON COMMIT DROP AS
SELECT a.id, a.session_id, a.student_id, a.status, a.updated_at,
       (a.updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS touched_on,
       s.date, lower(btrim(c.name)) AS cls, st.full_name,
       (s.status = 'Canceled') AS on_cancelled
FROM public.attendance a
JOIN public.sessions s  ON s.id = a.session_id
JOIN public.classes c   ON c.id = s.class_id
JOIN public.students st ON st.id = a.student_id
WHERE s.date >= DATE '2026-07-01' AND s.date < DATE '2026-08-01'
  AND a.status = 'Excused'
  AND lower(btrim(c.name)) IN (SELECT cls FROM _expected);

CREATE TEMP TABLE _july ON COMMIT DROP AS
SELECT * FROM _july_all WHERE NOT on_cancelled;

-- ---------------------------------------------------------------- 2
-- Find the cancellation day.

DO $$
DECLARE v_days date[]; v_missing text; v_dist text;
BEGIN
  SELECT string_agg(e.cls, ', ') INTO v_missing
  FROM _expected e
  WHERE NOT EXISTS (SELECT 1 FROM public.classes c WHERE lower(btrim(c.name)) = e.cls);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'No class named: %. Nothing changed.', v_missing;
  END IF;

  SELECT array_agg(d.touched_on) INTO v_days
  FROM (SELECT DISTINCT touched_on FROM _july) d
  WHERE NOT EXISTS (
    SELECT 1 FROM _expected e
    WHERE e.overwritten IS DISTINCT FROM
          (SELECT count(*) FROM _july j WHERE j.cls = e.cls AND j.touched_on = d.touched_on)
  );

  IF coalesce(array_length(v_days, 1), 0) <> 1 THEN
    SELECT string_agg(format('%s %s=%s', touched_on, cls, n), '; ' ORDER BY touched_on, cls)
      INTO v_dist
    FROM (SELECT touched_on, cls, count(*) n FROM _july GROUP BY 1, 2) x;
    RAISE EXCEPTION 'Expected exactly one day whose Excused marks match the trace for every class, found %. July Excused marks by day last changed and class: %. Nothing changed.',
      coalesce(array_length(v_days, 1), 0), v_dist;
  END IF;

  PERFORM set_config('hec.restore_cancel_day', v_days[1]::text, true);
END $$;

CREATE TEMP TABLE _overwritten ON COMMIT DROP AS
SELECT * FROM _july
WHERE touched_on = current_setting('hec.restore_cancel_day')::date;

-- The marks that were already Excused should be everything else,
-- including those on lessons that are still cancelled (Stars, 9 July,
-- the rain cancellation). Those stay as they are.
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(format('%s: %s, trace says %s', e.cls, n, e.already), '; ') INTO v_bad
  FROM _expected e
  CROSS JOIN LATERAL (SELECT count(*) n FROM _july_all j
                      WHERE j.cls = e.cls
                        AND (j.on_cancelled
                             OR j.touched_on <> current_setting('hec.restore_cancel_day')::date)) x
  WHERE x.n <> e.already;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Already-Excused marks do not match the trace (%). Nothing changed.', v_bad;
  END IF;
END $$;

-- ---------------------------------------------------------------- 3
-- The three that stay Excused, each checked against the count the trace
-- gave, so a name that matches nobody - or somebody else - stops here.

CREATE TEMP TABLE _keep ON COMMIT DROP AS
SELECT id, 'Anna' AS who FROM _overwritten
 WHERE cls = 'sun class' AND full_name ILIKE '%anna%'
UNION ALL
SELECT id, 'Baby Three' FROM _overwritten
 WHERE cls = 'mars' AND full_name ILIKE '%baby three%'
   AND date IN (DATE '2026-07-29', DATE '2026-07-31')
UNION ALL
SELECT id, 'Thao Vy' FROM _overwritten
 WHERE cls = 'sanrio grade 6'
   AND (full_name ILIKE '%thao vy%' OR full_name ILIKE '%thảo vy%');

DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(format('%s: %s marks, expected %s', w.who, coalesce(k.n, 0), w.want), '; ')
    INTO v_bad
  FROM (VALUES ('Anna', 3), ('Baby Three', 2), ('Thao Vy', 7)) w(who, want)
  LEFT JOIN (SELECT who, count(*) n FROM _keep GROUP BY who) k USING (who)
  WHERE coalesce(k.n, 0) <> w.want;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'The marks kept Excused do not match (%). Check the names in section 3. Nothing changed.', v_bad;
  END IF;
END $$;

CREATE TEMP TABLE _restore ON COMMIT DROP AS
SELECT o.* FROM _overwritten o WHERE o.id NOT IN (SELECT id FROM _keep);

-- ---------------------------------------------------------------- 4
-- July bills back to what they were before the cancellation, then frozen.

CREATE TEMP TABLE _bill ON COMMIT DROP AS
SELECT i.id, st.full_name, i.tuition_frozen,
       i.base_amount, i.discount_amount, i.total_amount, i.class_breakdown,
       (i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         >= current_setting('hec.restore_cancel_day')::date AS created_after,
       pre.diff -> 'old' AS pre
FROM public.invoices i
JOIN public.students st ON st.id = i.student_id
LEFT JOIN LATERAL (
  SELECT l.diff FROM public.audit_log l
  WHERE l.entity = 'invoices' AND l.entity_id = i.id::text
    AND l.operation = 'UPDATE'
    AND l.occurred_at >= (current_setting('hec.restore_cancel_day')::date::timestamp
                          AT TIME ZONE 'Asia/Ho_Chi_Minh')
    AND l.changed_fields && ARRAY['base_amount','discount_amount','total_amount','class_breakdown']
  ORDER BY l.occurred_at
  LIMIT 1
) pre ON true
WHERE i.month = '2026-07';

CREATE TABLE IF NOT EXISTS public.invoice_restore_2026_07 (
  invoice_id      uuid PRIMARY KEY,
  old_base        numeric,
  old_discount    numeric,
  old_total       numeric,
  old_breakdown   jsonb,
  old_frozen      boolean NOT NULL,
  restored_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_restore_2026_07 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_restore_2026_07 FROM PUBLIC, anon, authenticated;

-- Owner's decisions on the bill check (9 Nov 2026):
--   Thai Minh, Thanh Truc (Stars): their 28 Oct change took the 9 July
--     rain-cancelled lesson off (1,890,000 -> 1,680,000). That one was
--     right; it matches Gia Khoa and Hong Diem. Keep 1,680,000, freeze.
--   Daisy, Emma: put back 1,040,000 (the default; nothing special).
--   Thao Vy - Moon: frozen at 0 on 6 Nov, after the cancellation had
--     zeroed it. Put back 1,620,000 and keep it frozen.
CREATE TEMP TABLE _hold ON COMMIT DROP AS
SELECT b.* FROM _bill b
WHERE NOT b.tuition_frozen
  AND (b.full_name ILIKE 'thai minh%' OR b.full_name ILIKE 'thanh truc%');

CREATE TEMP TABLE _thao ON COMMIT DROP AS
SELECT b.* FROM _bill b
WHERE b.tuition_frozen AND b.full_name ILIKE '%thao vy%' AND b.pre IS NOT NULL;

DO $$
DECLARE v_bad text;
BEGIN
  IF (SELECT count(*) FROM _hold) <> 2
     OR EXISTS (SELECT 1 FROM _hold
                WHERE total_amount <> 1680000
                   OR (pre ->> 'total_amount')::numeric IS DISTINCT FROM 1890000) THEN
    SELECT string_agg(format('%s now %s before %s', full_name, total_amount, pre ->> 'total_amount'), '; ')
      INTO v_bad FROM _hold;
    RAISE EXCEPTION 'Expected Thai Minh and Thanh Truc at 1680000 (1890000 before); found: %. Nothing changed.',
      coalesce(v_bad, 'neither');
  END IF;
  IF (SELECT count(*) FROM _thao) <> 1
     OR (SELECT (pre ->> 'total_amount')::numeric FROM _thao LIMIT 1) IS DISTINCT FROM 1620000 THEN
    SELECT string_agg(format('%s before %s', full_name, pre ->> 'total_amount'), '; ')
      INTO v_bad FROM _thao;
    RAISE EXCEPTION 'Expected one frozen Thao Vy bill that was 1620000 before; found: %. Nothing changed.',
      coalesce(v_bad, 'none');
  END IF;
END $$;

INSERT INTO public.invoice_restore_2026_07(invoice_id, old_base, old_discount, old_total, old_breakdown, old_frozen)
SELECT id, base_amount, discount_amount, total_amount, class_breakdown::jsonb, tuition_frozen
FROM _bill
WHERE (NOT tuition_frozen AND NOT created_after) OR id IN (SELECT id FROM _thao)
ON CONFLICT (invoice_id) DO NOTHING;

CREATE TEMP TABLE _repriced ON COMMIT DROP AS
SELECT b.* FROM _bill b
WHERE NOT b.tuition_frozen AND NOT b.created_after AND b.pre IS NOT NULL
  AND b.id NOT IN (SELECT id FROM _hold)
UNION ALL
SELECT * FROM _thao;

-- keep_frozen_invoice_amounts would hold Thao Vy's frozen 0 against
-- this (auth.uid() is null in the SQL editor, so it never sees an
-- admin). It is off for this one statement, inside this transaction.
ALTER TABLE public.invoices DISABLE TRIGGER keep_frozen_invoice_amounts;

UPDATE public.invoices i
SET base_amount     = (r.pre ->> 'base_amount')::numeric,
    discount_amount = (r.pre ->> 'discount_amount')::numeric,
    total_amount    = (r.pre ->> 'total_amount')::numeric,
    class_breakdown = r.pre -> 'class_breakdown'
FROM _repriced r
WHERE i.id = r.id;

ALTER TABLE public.invoices ENABLE TRIGGER keep_frozen_invoice_amounts;

CREATE TEMP TABLE _frozen_now ON COMMIT DROP AS
SELECT id FROM _bill WHERE NOT tuition_frozen AND NOT created_after
UNION ALL
SELECT id FROM _thao;

UPDATE public.invoices i
SET tuition_frozen = true,
    frozen_reason  = 'July 2026: a bulk cancellation on ' || current_setting('hec.restore_cancel_day')
                     || ' reset attendance to Excused and repriced this bill. Attendance and the bill as charged before it were restored on 9 Nov 2026.'
WHERE i.id IN (SELECT id FROM _frozen_now);

-- ---------------------------------------------------------------- 5
-- Keep the old values, then restore.

CREATE TABLE IF NOT EXISTS public.attendance_restore_2026_07 (
  attendance_id  uuid PRIMARY KEY,
  session_id     uuid NOT NULL,
  student_id     uuid NOT NULL,
  old_status     text NOT NULL,
  old_updated_at timestamptz NOT NULL,
  restored_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_restore_2026_07 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_restore_2026_07 FROM PUBLIC, anon, authenticated;

INSERT INTO public.attendance_restore_2026_07(attendance_id, session_id, student_id, old_status, old_updated_at)
SELECT id, session_id, student_id, status, updated_at FROM _restore
ON CONFLICT (attendance_id) DO NOTHING;

-- marked_by and marked_at are left alone: these are the teachers' marks,
-- put back. The enrollment guard still runs. It raises for a teacher's
-- mark on a lesson the child is not enrolled for (the whole script rolls
-- back) and silently keeps Excused for an automatic one, which the
-- check below catches.
UPDATE public.attendance a
SET status = 'Present'
WHERE a.id IN (SELECT id FROM _restore);

-- ---------------------------------------------------------------- 6
-- Check, then commit or (dry run) roll back.

DO $$
DECLARE
  v_want int; v_got int; v_stuck text; v_summary text; v_unfrozen text;
BEGIN
  SELECT count(*) INTO v_want FROM _restore;
  SELECT count(*) INTO v_got FROM public.attendance a
   WHERE a.id IN (SELECT id FROM _restore) AND a.status = 'Present';

  IF v_got <> v_want THEN
    SELECT string_agg(format('%s %s %s', r.cls, r.full_name, r.date), '; ') INTO v_stuck
    FROM _restore r JOIN public.attendance a ON a.id = r.id
    WHERE a.status <> 'Present';
    RAISE EXCEPTION 'Only % of % marks became Present; the enrollment guard kept these Excused: %. Nothing changed.',
      v_got, v_want, v_stuck;
  END IF;

  SELECT string_agg(format('%s %s', e.cls,
           (SELECT count(*) FROM _restore r WHERE r.cls = e.cls)), ', ' ORDER BY e.cls)
    INTO v_summary FROM _expected e;

  SELECT string_agg(full_name, ', ') INTO v_unfrozen FROM _bill WHERE created_after;

  v_summary := format(
    'cancellation day %s; %s marks restored to Present (%s); %s kept Excused; July invoices: %s total, %s put back to their pre-cancellation figures (total %s now -> %s), %s kept at today''s figure (Thai Minh, Thanh Truc), %s frozen, %s already frozen and left alone, created after the cancellation and left alone: %s. Per-bill detail: scripts/CHECK-july-2026-bills.sql',
    current_setting('hec.restore_cancel_day'), v_got, v_summary,
    (SELECT count(*) FROM _keep),
    (SELECT count(*) FROM _bill),
    (SELECT count(*) FROM _repriced),
    (SELECT coalesce(sum(total_amount), 0) FROM _repriced),
    (SELECT coalesce(sum((pre ->> 'total_amount')::numeric), 0) FROM _repriced),
    (SELECT count(*) FROM _hold),
    (SELECT count(*) FROM _frozen_now),
    (SELECT count(*) FROM _bill WHERE tuition_frozen AND id NOT IN (SELECT id FROM _thao)),
    coalesce(v_unfrozen, 'none'));

  IF current_setting('hec.restore_dry_run') = 'on' THEN
    RAISE EXCEPTION 'DRY RUN OK, nothing saved: %', v_summary;
  END IF;

  RAISE NOTICE 'RESTORED: %', v_summary;
END $$;

COMMIT;

SELECT
  (SELECT count(*) FROM public.attendance_restore_2026_07)              AS marks_restored,
  (SELECT count(*) FROM public.invoice_restore_2026_07)                 AS invoices_saved_for_undo,
  (SELECT count(*) FROM public.invoices
    WHERE month = '2026-07' AND tuition_frozen)                         AS july_invoices_frozen,
  (SELECT count(*) FROM public.invoices
    WHERE month = '2026-07' AND NOT tuition_frozen)                     AS july_invoices_unfrozen;
