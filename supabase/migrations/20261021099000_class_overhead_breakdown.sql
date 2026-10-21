-- "What is my 3,223,881 of overhead actually made of?"
--
-- The Overhead column is a single number, and a single number that moves
-- when the rent changes, when a class runs fewer lessons, or when
-- somebody books a projector to one room is not something an owner can
-- check. This exposes the costs behind it, one line per cost per class,
-- so the column can be opened up.
--
-- THE LINES ARE NOW THE PRIMITIVE. 20261021098000 apportioned each cost
-- across its own target and summed the result per class. That sum is
-- exactly the breakdown, discarded. So the per-cost detail becomes the
-- function, and the per-class total becomes a GROUP BY over it - one
-- implementation, and a total that cannot disagree with the lines it is
-- made of, because it is made of them.
--
-- A CLOSED MONTH FREEZES ITS LINES TOO. class_overhead_allocations keeps
-- what each class was charged; class_overhead_lines keeps what that was
-- made of. Both are written by the same statement inside the same
-- freeze, from the same computation, so they cannot drift.

CREATE TABLE IF NOT EXISTS public.class_overhead_lines (
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  -- Deliberately not a foreign key. The cost it points at can legitimately
  -- be deleted later; the line is a record of what was charged at the
  -- time, which is why the category and memo are copied rather than
  -- joined.
  expenditure_id uuid NOT NULL,

  class_name text NOT NULL,
  category text NOT NULL,
  memo text,
  allocation_mode text NOT NULL,

  -- What the whole cost was, and what this class's part of it was.
  cost_vnd bigint NOT NULL CHECK (cost_vnd >= 0),
  share_vnd bigint NOT NULL CHECK (share_vnd >= 0),

  frozen_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (month, class_id, expenditure_id)
);

COMMENT ON TABLE public.class_overhead_lines IS
  'What a closed month''s per-class overhead was made of: one row per cost per class. Sums to class_overhead_allocations.share_vnd, because both are written from the same computation by the freeze.';

-- ------------------------------------------------------------- the maths
--
-- Every allocable cost in the month, apportioned across its own target by
-- largest remainder, one row per (cost, class).
CREATE OR REPLACE FUNCTION public.class_overhead_compute_lines(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  expenditure_id uuid,
  category text,
  memo text,
  allocation_mode text,
  cost_vnd bigint,
  share_vnd bigint,
  sessions_count integer,
  pool_vnd bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_month text := substring(p_month from 1 for 7);
  v_start date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_next  date := (to_date(v_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
  v_pool  bigint;
BEGIN
  SELECT COALESCE(SUM(e.amount), 0)::bigint
    INTO v_pool
    FROM public.expenditures e
   WHERE e.date >= v_start
     AND e.date <  v_next
     AND e.allocation_mode IN ('all', 'class', 'staff');

  IF v_pool <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH alloc AS (
    SELECT e.id AS eid,
           e.amount::bigint AS amt,
           e.category AS cat,
           e.memo AS note,
           e.allocation_mode AS mode,
           e.allocation_class_id AS t_class,
           e.allocation_teacher_id AS t_teacher,
           e.allocation_assistant_id AS t_assistant
      FROM public.expenditures e
     WHERE e.date >= v_start
       AND e.date <  v_next
       AND e.allocation_mode IN ('all', 'class', 'staff')
       AND e.amount > 0
  ),
  sess AS (
    SELECT s.id AS sid, s.class_id AS cid, s.teacher_id
      FROM public.sessions s
     WHERE s.date >= v_start
       AND s.date <  v_next
       AND s.status <> 'Canceled'
       AND s.class_id IS NOT NULL
  ),
  -- DISTINCT because a session can carry more than one participant row
  -- for the same assistant; counting those twice would weight their
  -- classes wrongly.
  ta_sess AS (
    SELECT DISTINCT sp.teaching_assistant_id AS taid, s.sid, s.cid
      FROM public.session_participants sp
      JOIN sess s ON s.sid = sp.session_id
     WHERE sp.participant_type = 'teaching_assistant'
       AND sp.teaching_assistant_id IS NOT NULL
  ),
  w AS (
    SELECT a.eid, a.amt, s.cid, COUNT(*)::bigint AS wt
      FROM alloc a CROSS JOIN sess s
     WHERE a.mode = 'all'
     GROUP BY a.eid, a.amt, s.cid
    UNION ALL
    SELECT a.eid, a.amt, a.t_class, 1::bigint
      FROM alloc a
     WHERE a.mode = 'class' AND a.t_class IS NOT NULL
    UNION ALL
    SELECT a.eid, a.amt, s.cid, COUNT(*)::bigint
      FROM alloc a JOIN sess s ON s.teacher_id = a.t_teacher
     WHERE a.mode = 'staff' AND a.t_teacher IS NOT NULL
     GROUP BY a.eid, a.amt, s.cid
    UNION ALL
    SELECT a.eid, a.amt, t.cid, COUNT(DISTINCT t.sid)::bigint
      FROM alloc a JOIN ta_sess t ON t.taid = a.t_assistant
     WHERE a.mode = 'staff' AND a.t_assistant IS NOT NULL
     GROUP BY a.eid, a.amt, t.cid
  ),
  -- ::bigint is load-bearing. SUM() over bigint returns NUMERIC, and a
  -- numeric divisor turns the integer division below into decimal
  -- division: the remainder disappears and the shares quietly add up to
  -- less than the cost.
  tot AS (
    SELECT w.eid, SUM(w.wt)::bigint AS total FROM w GROUP BY w.eid
  ),
  split AS (
    SELECT w.eid, w.cid, w.amt, w.wt,
           (w.amt * w.wt) / t.total AS base,
           (w.amt * w.wt) % t.total AS rem
      FROM w JOIN tot t ON t.eid = w.eid
     WHERE t.total > 0
  ),
  ranked AS (
    SELECT s.*,
           ROW_NUMBER() OVER (PARTITION BY s.eid ORDER BY s.rem DESC, s.wt DESC, s.cid) AS rn,
           s.amt - SUM(s.base) OVER (PARTITION BY s.eid) AS leftover
      FROM split s
  ),
  counts AS (
    SELECT s.cid, COUNT(*)::integer AS cnt FROM sess s GROUP BY s.cid
  )
  SELECT r.cid,
         COALESCE(c.name, 'Deleted class'),
         r.eid,
         a.cat,
         a.note,
         a.mode,
         r.amt,
         (r.base + CASE WHEN r.rn <= r.leftover THEN 1 ELSE 0 END)::bigint,
         COALESCE(k.cnt, 0),
         v_pool
    FROM ranked r
    JOIN alloc a ON a.eid = r.eid
    LEFT JOIN public.classes c ON c.id = r.cid
    LEFT JOIN counts k ON k.cid = r.cid;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_compute_lines(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_compute_lines(text) TO service_role;

-- The per-class total is now a sum of the lines, so the column and the
-- breakdown behind it are the same arithmetic rather than two copies of
-- it.
CREATE OR REPLACE FUNCTION public.class_overhead_compute(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  sessions_count integer,
  share_vnd bigint,
  pool_vnd bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT l.class_id,
         MIN(l.class_name),
         MIN(l.sessions_count),
         SUM(l.share_vnd)::bigint,
         MIN(l.pool_vnd)
    FROM public.class_overhead_compute_lines(p_month) l
   GROUP BY l.class_id;
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_compute(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_compute(text) TO service_role;

-- ------------------------------------------------------ what the UI calls
CREATE OR REPLACE FUNCTION public.class_overhead_breakdown(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  expenditure_id uuid,
  category text,
  memo text,
  allocation_mode text,
  cost_vnd bigint,
  share_vnd bigint,
  frozen boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_month text := substring(p_month from 1 for 7);
BEGIN
  IF NOT public.class_overhead_reader() THEN
    RAISE EXCEPTION 'Only an admin can read class overhead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF public.payroll_month_is_locked(v_month) THEN
    RETURN QUERY
      SELECT l.class_id, l.class_name, l.expenditure_id, l.category, l.memo,
             l.allocation_mode, l.cost_vnd, l.share_vnd, true
        FROM public.class_overhead_lines l
       WHERE l.month = v_month;
  ELSE
    RETURN QUERY
      SELECT c.class_id, c.class_name, c.expenditure_id, c.category, c.memo,
             c.allocation_mode, c.cost_vnd, c.share_vnd, false
        FROM public.class_overhead_compute_lines(v_month) c;
  END IF;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_breakdown(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_breakdown(text) TO authenticated, service_role;

-- ---------------------------------------------------------------- freeze
--
-- Both tables, one statement each, from the same computation, in the same
-- transaction - and still BEFORE the period flips to locked, so the
-- refusal trigger on class_overhead_allocations does not reject the very
-- snapshot that records the close.
CREATE OR REPLACE FUNCTION public.freeze_class_overhead_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status = 'locked'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'locked') THEN
    -- Delete first, not upsert: a re-close after a correction can drop a
    -- class, or a cost, out of the split entirely, and leftovers would
    -- make the month report more than the ledger holds.
    DELETE FROM public.class_overhead_lines WHERE month = NEW.month;
    DELETE FROM public.class_overhead_allocations WHERE month = NEW.month;

    INSERT INTO public.class_overhead_lines
      (month, class_id, expenditure_id, class_name, category, memo,
       allocation_mode, cost_vnd, share_vnd, frozen_at)
    SELECT NEW.month, l.class_id, l.expenditure_id, l.class_name, l.category, l.memo,
           l.allocation_mode, l.cost_vnd, l.share_vnd, now()
      FROM public.class_overhead_compute_lines(NEW.month) l;

    INSERT INTO public.class_overhead_allocations
      (month, class_id, class_name, sessions_count, pool_vnd, share_vnd, frozen_at)
    SELECT NEW.month, c.class_id, c.class_name, c.sessions_count, c.pool_vnd, c.share_vnd, now()
      FROM public.class_overhead_compute(NEW.month) c;
  END IF;
  RETURN NEW;
END
$fn$;

-- The lines stop moving with the month, exactly as the totals do.
DROP TRIGGER IF EXISTS refuse_locked_class_overhead_lines ON public.class_overhead_lines;
CREATE TRIGGER refuse_locked_class_overhead_lines
  BEFORE INSERT OR UPDATE OR DELETE ON public.class_overhead_lines
  FOR EACH ROW EXECUTE FUNCTION public.refuse_write_to_locked_payroll();

-- ------------------------------------------------------------- RLS, grants
ALTER TABLE public.class_overhead_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage class overhead lines" ON public.class_overhead_lines;
CREATE POLICY "Admins manage class overhead lines"
ON public.class_overhead_lines
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_overhead_lines TO authenticated;
GRANT ALL ON public.class_overhead_lines TO service_role;

DO $do$
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; class overhead lines will not be audited.';
    RETURN;
  END IF;
  DROP TRIGGER IF EXISTS audit_class_overhead_lines ON public.class_overhead_lines;
  CREATE TRIGGER audit_class_overhead_lines
    AFTER INSERT OR UPDATE OR DELETE ON public.class_overhead_lines
    FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
END
$do$;

NOTIFY pgrst, 'reload schema';
