-- Who pays for this cost?
--
-- 20261021097000 gave a recurring template one switch: share it across
-- every class that ran, or share it with nobody. That cannot say "this
-- belongs to one class", which is most of what an admin actually wants to
-- say - and the help text on that switch even invited it ("turn it off
-- for a cost that belongs to one class"), while turning it off charges
-- that class nothing at all.
--
-- FOUR ANSWERS, NOT TWO.
--
--   none    School-wide. In the ledger and in net profit; no class is
--           charged. Marketing, the owner's costs.
--   all     Every class that ran, in proportion to its sessions. Rent,
--           electricity, internet.
--   class   One named class takes the whole cost. Materials or equipment
--           bought for one room.
--   staff   The classes one teacher or assistant actually worked in that
--           month, in proportion to their sessions in each. A stipend, a
--           training fee, an agency charge. Named rather than pinned to a
--           class list, so it follows them when the timetable changes
--           instead of quietly going stale.
--
-- THE INTENT LIVES ON THE EXPENDITURE, NOT ON THE TEMPLATE. 20261021097000
-- derived the pool by joining expenditures back to the template that
-- generated them, which meant a hand-entered one-off could never reach a
-- class at all, and deleting a template rewrote history. The row now
-- carries its own answer; the template carries the default that is copied
-- onto each row it books. Changing a template therefore affects what it
-- books NEXT, and a month already booked is changed by editing the cost
-- itself - which is the behaviour that can be explained in one sentence.
--
-- EVERY COST IS SPLIT ON ITS OWN. One pool divided once would be wrong
-- the moment two costs have different targets. Each row is apportioned
-- across its own target by largest remainder, and the per-class figures
-- are the sum of those. So every individual cost is fully distributed,
-- and the column still adds up to the ledger to the dong.

-- ------------------------------------------------------- the four answers
DO $do$
BEGIN
  IF to_regclass('public.recurring_expenditures') IS NULL THEN
    RAISE EXCEPTION
      'public.recurring_expenditures is missing. Run 20261021095000 and 20261021097000 first, then this file.';
  END IF;
END
$do$;

ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS allocation_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS allocation_class_id uuid REFERENCES public.classes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS allocation_teacher_id uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS allocation_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE RESTRICT;

ALTER TABLE public.recurring_expenditures
  ADD COLUMN IF NOT EXISTS allocation_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS allocation_class_id uuid REFERENCES public.classes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS allocation_teacher_id uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS allocation_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE RESTRICT;

-- ------------------------------------------- carry the old switch across
--
-- allocate_to_classes said all-or-nothing. Its two states are the first
-- two of the four, so nothing is lost and nothing needs re-deciding.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'recurring_expenditures'
       AND column_name = 'allocate_to_classes'
  ) THEN
    EXECUTE $sql$
      UPDATE public.recurring_expenditures
         SET allocation_mode = CASE WHEN allocate_to_classes THEN 'all' ELSE 'none' END
       WHERE allocation_mode = 'none'
    $sql$;

    -- Costs already booked keep behaving as they did: the template's
    -- answer at this moment is stamped onto them.
    EXECUTE $sql$
      UPDATE public.expenditures e
         SET allocation_mode = t.allocation_mode
        FROM public.recurring_expenditures t
       WHERE t.id = e.source_template_id
         AND e.allocation_mode = 'none'
    $sql$;

    ALTER TABLE public.recurring_expenditures DROP COLUMN allocate_to_classes;
  END IF;
END
$do$;

-- ------------------------------------------------- what a valid answer is
DO $do$
BEGIN
  ALTER TABLE public.expenditures DROP CONSTRAINT IF EXISTS expenditures_allocation_target;
  ALTER TABLE public.expenditures ADD CONSTRAINT expenditures_allocation_target CHECK (
    (allocation_mode = 'class'
       AND allocation_class_id IS NOT NULL
       AND allocation_teacher_id IS NULL AND allocation_assistant_id IS NULL)
    OR (allocation_mode = 'staff'
       AND allocation_class_id IS NULL
       AND (allocation_teacher_id IS NULL) <> (allocation_assistant_id IS NULL))
    OR (allocation_mode IN ('none', 'all')
       AND allocation_class_id IS NULL
       AND allocation_teacher_id IS NULL
       AND allocation_assistant_id IS NULL)
  );

  -- Wages are already charged to each class from that class's own
  -- sessions, by the class report. Allocating a payroll row as well would
  -- charge the same money twice - the exact fault 20261021092000 and the
  -- expenditure split were written to stop - so the schema refuses it
  -- rather than relying on nobody ticking the wrong box.
  ALTER TABLE public.expenditures DROP CONSTRAINT IF EXISTS expenditures_payroll_not_allocated;
  ALTER TABLE public.expenditures ADD CONSTRAINT expenditures_payroll_not_allocated CHECK (
    source_kind IS DISTINCT FROM 'payroll' OR allocation_mode = 'none'
  );

  ALTER TABLE public.recurring_expenditures DROP CONSTRAINT IF EXISTS recurring_allocation_target;
  ALTER TABLE public.recurring_expenditures ADD CONSTRAINT recurring_allocation_target CHECK (
    (allocation_mode = 'class'
       AND allocation_class_id IS NOT NULL
       AND allocation_teacher_id IS NULL AND allocation_assistant_id IS NULL)
    OR (allocation_mode = 'staff'
       AND allocation_class_id IS NULL
       AND (allocation_teacher_id IS NULL) <> (allocation_assistant_id IS NULL))
    OR (allocation_mode IN ('none', 'all')
       AND allocation_class_id IS NULL
       AND allocation_teacher_id IS NULL
       AND allocation_assistant_id IS NULL)
  );
END
$do$;

COMMENT ON COLUMN public.expenditures.allocation_mode IS
  'Who carries this cost in the class report: none (school-wide), all (every class that ran, by session count), class (one named class), staff (the classes one teacher or assistant worked in that month).';
COMMENT ON COLUMN public.recurring_expenditures.allocation_mode IS
  'The answer copied onto each cost this template books. Changing it affects future bookings; a month already booked is changed by editing the cost itself.';

-- ------------------------------------------------------------- the maths
--
-- Each cost is apportioned across its own target, then summed per class.
-- Largest remainder per cost, so every individual amount is distributed
-- in full and the column still ties to the ledger.
CREATE OR REPLACE FUNCTION public.class_overhead_compute(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  sessions_count integer,
  share_vnd bigint,
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
    -- all: every class that ran, weighted by its sessions
    SELECT a.eid, a.amt, s.cid, COUNT(*)::bigint AS wt
      FROM alloc a CROSS JOIN sess s
     WHERE a.mode = 'all'
     GROUP BY a.eid, a.amt, s.cid
    UNION ALL
    -- class: the whole amount, whether or not the class ran anything
    SELECT a.eid, a.amt, a.t_class, 1::bigint
      FROM alloc a
     WHERE a.mode = 'class' AND a.t_class IS NOT NULL
    UNION ALL
    -- staff, a teacher: the classes they taught, by sessions taught
    SELECT a.eid, a.amt, s.cid, COUNT(*)::bigint
      FROM alloc a JOIN sess s ON s.teacher_id = a.t_teacher
     WHERE a.mode = 'staff' AND a.t_teacher IS NOT NULL
     GROUP BY a.eid, a.amt, s.cid
    UNION ALL
    -- staff, an assistant: the classes they assisted in
    SELECT a.eid, a.amt, t.cid, COUNT(DISTINCT t.sid)::bigint
      FROM alloc a JOIN ta_sess t ON t.taid = a.t_assistant
     WHERE a.mode = 'staff' AND a.t_assistant IS NOT NULL
     GROUP BY a.eid, a.amt, t.cid
  ),
  -- ::bigint is load-bearing. SUM() over bigint returns NUMERIC, and a
  -- numeric divisor turns the integer division below into decimal
  -- division: every base becomes 3.333..., the remainder disappears, and
  -- the shares quietly add up to less than the cost.
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
  per_class AS (
    SELECT r.cid,
           SUM(r.base + CASE WHEN r.rn <= r.leftover THEN 1 ELSE 0 END)::bigint AS share
      FROM ranked r
     GROUP BY r.cid
  ),
  counts AS (
    SELECT s.cid, COUNT(*)::integer AS cnt FROM sess s GROUP BY s.cid
  )
  SELECT p.cid,
         COALESCE(c.name, 'Deleted class'),
         COALESCE(k.cnt, 0),
         p.share,
         v_pool
    FROM per_class p
    LEFT JOIN public.classes c ON c.id = p.cid
    LEFT JOIN counts k ON k.cid = p.cid;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_compute(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_compute(text) TO service_role;

COMMENT ON FUNCTION public.class_overhead_compute(text) IS
  'Live split of a month''s allocated costs across classes - each cost apportioned across its own target. Internal; call class_overhead_for_month, which honours a closed month''s frozen figures.';

-- The allocable total for the month, by the same definition, so the
-- report can name what did not land on any class rather than dropping it.
CREATE OR REPLACE FUNCTION public.class_overhead_pool(p_month text)
RETURNS bigint
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
  IF NOT public.class_overhead_reader() THEN
    RAISE EXCEPTION 'Only an admin can read class overhead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF public.payroll_month_is_locked(v_month) THEN
    SELECT COALESCE(MAX(a.pool_vnd), 0) INTO v_pool
      FROM public.class_overhead_allocations a
     WHERE a.month = v_month;
    RETURN v_pool;
  END IF;

  SELECT COALESCE(SUM(e.amount), 0)::bigint
    INTO v_pool
    FROM public.expenditures e
   WHERE e.date >= v_start
     AND e.date <  v_next
     AND e.allocation_mode IN ('all', 'class', 'staff');

  RETURN v_pool;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_pool(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_pool(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
