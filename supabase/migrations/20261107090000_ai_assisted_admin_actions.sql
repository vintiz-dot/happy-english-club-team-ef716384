-- Admin actions the assistant sets up: it proposes, an admin confirms, and
-- these functions do the writing - all of a plan or none of it - with a log
-- of their own that one click can undo.
--
-- The model never reaches anything that writes. It drafts a plan; the chat
-- function asks ai_action_preview to check it and word the card the admin
-- reads, and that function is STABLE, so Postgres itself refuses to let it
-- write. ai_action_apply checks the same plan again inside the transaction
-- that carries it out, so a stale card, a tampered request or a second
-- click cannot write anything the check would refuse. Everything runs as
-- the calling admin, so auth.uid() is the actor the audit triggers record.
--
-- Undo refuses rather than guesses. It reverses only what nobody has
-- touched since. A student it created is removed only when nothing a
-- person did refers to them: every table with a student_id column is
-- counted, and only the rows the app writes on its own - seeded register
-- marks, bills with no money on them, zero point totals, the family
-- discount working - are cleared along with them.

-- ---------------------------------------------------------- sibling hold

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sibling_discount_from date;

COMMENT ON COLUMN public.students.sibling_discount_from IS
  'First day this student counts for the family sibling discount; NULL means always. Before it, compute-sibling-discounts works the family out as if the student were not in it.';

-- ---------------------------------------------------------- the log

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One proposal, one action: a double click or a retried request finds
  -- the row the first one wrote. A plain UNIQUE, not a partial index.
  proposal_id uuid NOT NULL,
  instruction text NOT NULL,
  plan jsonb NOT NULL,
  summary jsonb NOT NULL,
  effects jsonb NOT NULL,
  -- No foreign key on purpose: the row must outlive an undo that removes
  -- the student it created.
  student_id uuid,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'undone')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  undone_by uuid,
  undone_at timestamptz,
  CONSTRAINT ai_actions_proposal_id_key UNIQUE (proposal_id)
);

CREATE INDEX IF NOT EXISTS ai_actions_created_at_idx ON public.ai_actions (created_at DESC);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read AI actions" ON public.ai_actions;
CREATE POLICY "Admins read AI actions" ON public.ai_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Read-only from the API. Every write goes through the functions below.
REVOKE ALL ON public.ai_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_actions TO authenticated;
GRANT ALL ON public.ai_actions TO service_role;

-- ---------------------------------------------------------- small helpers

CREATE OR REPLACE FUNCTION public.ai_try_date(p text)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p IS NULL OR p !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
  RETURN p::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.ai_try_uuid(p text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p IS NULL OR p !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NULL; END IF;
  RETURN p::uuid;
END $$;

CREATE OR REPLACE FUNCTION public.ai_date_label(p date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT to_char(p, 'FMDD Mon YYYY') $$;

CREATE OR REPLACE FUNCTION public.ai_month_label(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT to_char(to_date(p || '-01', 'YYYY-MM-DD'), 'Mon YYYY') $$;

CREATE OR REPLACE FUNCTION public.ai_vnd(p bigint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT replace(to_char(p, 'FM999,999,999,990'), ',', '.') || ' ₫' $$;

-- A month is closed once its finance snapshot exists.
CREATE OR REPLACE FUNCTION public.ai_month_closed(p_month text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.monthly_finance_snapshots
    WHERE month = p_month AND superseded_at IS NULL
  )
$$;

-- Keys of an object that are not on its list.
CREATE OR REPLACE FUNCTION public.ai_unknown_keys(p jsonb, allowed text[])
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(k ORDER BY k), '{}')
  FROM jsonb_object_keys(CASE WHEN jsonb_typeof(p) = 'object' THEN p ELSE '{}'::jsonb END) AS k
  WHERE NOT k = ANY (allowed)
$$;

-- A JSON number that is a whole number inside a range, or NULL.
CREATE OR REPLACE FUNCTION public.ai_whole(p jsonb, lo numeric, hi numeric)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN jsonb_typeof(p) = 'number' AND (p #>> '{}')::numeric = trunc((p #>> '{}')::numeric)
     AND (p #>> '{}')::numeric BETWEEN lo AND hi
    THEN (p #>> '{}')::bigint
  END
$$;

-- ---------------------------------------------------------- the check

-- Checks a plan and words it. Returns problems (any one stops it),
-- warnings, the card's lines, the nudges for afterwards, and the plan in
-- the only form ai_action_apply will act on.
CREATE OR REPLACE FUNCTION public.ai_plan_check(p_plan jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_this_month text := to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM');
  problems text[] := '{}';
  warnings text[] := '{}';
  lines text[] := '{}';
  nudges text[] := '{}';
  normal jsonb := '{}';
  s jsonb := p_plan -> 'student';
  x jsonb;
  bad text[];
  st record;
  c record;
  f record;
  inv record;
  v_student uuid;
  v_new boolean := false;
  v_name text;
  v_dob date;
  v_active boolean := true;
  v_family_now uuid;
  v_family_now_name text;
  v_family_after uuid;
  v_hold_now date;
  v_class uuid;
  v_start date;
  v_pct bigint;
  v_count bigint;
  v_first text;
  v_months text[];
  v_from date;
  v_to date;
  v_hold date;
  v_amount bigint;
  v_pay_month text;
  v_method text;
  v_paid_on date;
  v_note text;
  v_due bigint;
  v_owed bigint;
BEGIN
  IF p_plan IS NULL OR jsonb_typeof(p_plan) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('ok', false, 'problems', jsonb_build_array('The plan could not be read.'));
  END IF;
  IF (p_plan ->> 'version') IS DISTINCT FROM '1' THEN
    problems := problems || 'The plan is in a format this database does not know.'::text;
  END IF;
  bad := public.ai_unknown_keys(p_plan, ARRAY['version','student','enrol','discount','family','sibling_hold','payment']);
  IF cardinality(bad) > 0 THEN
    problems := problems || format('Not something the assistant may do: %s.', array_to_string(bad, ', '));
  END IF;

  -- The student: one that exists, or one to create.
  IF jsonb_typeof(s) IS DISTINCT FROM 'object' OR ((s ? 'id') = (s ? 'new')) THEN
    RETURN jsonb_build_object('ok', false, 'problems', to_jsonb(problems || 'The plan must name one student, new or existing.'::text));
  END IF;
  bad := public.ai_unknown_keys(s, ARRAY['id','new','allow_same_name']);
  IF cardinality(bad) > 0 THEN problems := problems || format('Unknown student detail: %s.', array_to_string(bad, ', ')); END IF;

  IF s ? 'id' THEN
    v_student := public.ai_try_uuid(s ->> 'id');
    SELECT id, full_name, is_active, family_id, sibling_discount_from INTO st
    FROM public.students WHERE id = v_student;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'problems', to_jsonb(problems || 'That student does not exist.'::text));
    END IF;
    v_name := st.full_name;
    v_active := st.is_active;
    v_family_now := st.family_id;
    v_hold_now := st.sibling_discount_from;
    lines := lines || format('Student: %s', v_name);
  ELSE
    v_new := true;
    bad := public.ai_unknown_keys(s -> 'new', ARRAY['full_name','date_of_birth']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown student detail: %s.', array_to_string(bad, ', ')); END IF;
    v_name := btrim(regexp_replace(coalesce(s -> 'new' ->> 'full_name', ''), '\s+', ' ', 'g'));
    IF length(v_name) < 2 OR length(v_name) > 120 OR v_name ~ '[[:cntrl:]<>{}]' THEN
      problems := problems || 'The new student needs a proper name.'::text;
    END IF;
    IF coalesce(jsonb_typeof(s -> 'new' -> 'date_of_birth'), 'null') <> 'null' THEN
      v_dob := public.ai_try_date(s -> 'new' ->> 'date_of_birth');
      IF v_dob IS NULL OR v_dob > v_today OR v_dob < v_today - interval '100 years' THEN
        problems := problems || 'The date of birth is not a real date in the past.'::text;
      END IF;
    ELSE
      warnings := warnings || 'No date of birth: it can be added on the student page later.'::text;
    END IF;
    IF EXISTS (SELECT 1 FROM public.students WHERE lower(btrim(full_name)) = lower(v_name))
       AND (s -> 'allow_same_name') IS DISTINCT FROM 'true'::jsonb THEN
      problems := problems || format('There is already a student called %s. Say so if this is a different child.', v_name);
    END IF;
    lines := lines || format('Create student: %s%s', v_name,
      CASE WHEN v_dob IS NOT NULL THEN ', born ' || public.ai_date_label(v_dob) ELSE '' END);
    nudges := nudges || 'No login yet: open Account on the student page if this student needs one.'::text;
  END IF;
  v_family_after := v_family_now;

  -- Family first: the sibling hold below needs to know the family.
  x := p_plan -> 'family';
  IF coalesce(jsonb_typeof(x), 'null') <> 'null' THEN
    bad := public.ai_unknown_keys(x, ARRAY['family_id']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown family detail: %s.', array_to_string(bad, ', ')); END IF;
    SELECT id, name, is_active INTO f FROM public.families WHERE id = public.ai_try_uuid(x ->> 'family_id');
    IF NOT FOUND OR NOT f.is_active THEN
      problems := problems || 'That family does not exist or is no longer active.'::text;
    ELSE
      IF NOT v_active THEN problems := problems || format('%s has left the school.', v_name); END IF;
      IF v_family_now = f.id THEN
        problems := problems || format('%s is already in %s.', v_name, f.name);
      ELSIF v_family_now IS NOT NULL THEN
        SELECT name INTO v_family_now_name FROM public.families WHERE id = v_family_now;
        lines := lines || format('Move from family %s to family %s', coalesce(v_family_now_name, '(unnamed)'), f.name);
        warnings := warnings || format('This moves %s out of %s.', v_name, coalesce(v_family_now_name, 'their current family'));
      ELSE
        lines := lines || format('Add to family: %s', f.name);
      END IF;
      v_family_after := f.id;
      normal := normal || jsonb_build_object('family', jsonb_build_object(
        'family_id', f.id, 'family_name', f.name, 'before_id', v_family_now));
    END IF;
  END IF;

  x := p_plan -> 'sibling_hold';
  IF coalesce(jsonb_typeof(x), 'null') <> 'null' THEN
    bad := public.ai_unknown_keys(x, ARRAY['from','lift']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown hold detail: %s.', array_to_string(bad, ', ')); END IF;
    IF NOT v_active THEN problems := problems || format('%s has left the school.', v_name); END IF;
    IF (x -> 'lift') = 'true'::jsonb THEN
      IF v_hold_now IS NULL THEN
        problems := problems || format('%s has no sibling discount hold to lift.', v_name);
      ELSE
        lines := lines || 'Sibling discount: hold lifted, counts for the family from now'::text;
        normal := normal || jsonb_build_object('sibling_hold', jsonb_build_object('from', NULL, 'before', v_hold_now));
      END IF;
    ELSE
      v_hold := public.ai_try_date(x ->> 'from');
      IF v_hold IS NULL OR extract(day FROM v_hold) <> 1 THEN
        problems := problems || 'A sibling discount hold has to end on the first day of a month.'::text;
      ELSIF to_char(v_hold, 'YYYY-MM') <= v_this_month OR v_hold > v_today + interval '3 years' THEN
        problems := problems || 'A sibling discount hold has to end in a later month, within three years.'::text;
      ELSIF v_family_after IS NULL THEN
        problems := problems || format('%s is not in a family, so there is no sibling discount to hold.', v_name);
      ELSE
        lines := lines || format('Sibling discount: on hold until %s', public.ai_date_label(v_hold));
        normal := normal || jsonb_build_object('sibling_hold', jsonb_build_object('from', v_hold, 'before', v_hold_now));
      END IF;
    END IF;
  END IF;

  x := p_plan -> 'enrol';
  IF coalesce(jsonb_typeof(x), 'null') <> 'null' THEN
    bad := public.ai_unknown_keys(x, ARRAY['class_id','start_date']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown enrolment detail: %s.', array_to_string(bad, ', ')); END IF;
    v_class := public.ai_try_uuid(x ->> 'class_id');
    v_start := public.ai_try_date(x ->> 'start_date');
    SELECT id, name, is_active, max_students INTO c FROM public.classes WHERE id = v_class;
    IF NOT FOUND OR NOT c.is_active THEN
      problems := problems || 'That class does not exist or is no longer active.'::text;
    ELSIF v_start IS NULL OR v_start < v_today - 120 OR v_start > v_today + 366 THEN
      problems := problems || 'The start date has to be a real date, from four months ago to a year ahead.'::text;
    ELSE
      IF NOT v_active THEN problems := problems || format('%s has left the school.', v_name); END IF;
      IF v_student IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.student_id = v_student AND e.class_id = v_class
          AND (e.end_date IS NULL OR e.end_date >= v_start)
      ) THEN
        problems := problems || format('%s is already enrolled in %s.', v_name, c.name);
      END IF;
      IF public.ai_month_closed(to_char(v_start, 'YYYY-MM')) THEN
        problems := problems || format('%s is closed, so nobody can be enrolled from then.', public.ai_month_label(to_char(v_start, 'YYYY-MM')));
      END IF;
      IF v_start < v_today THEN
        warnings := warnings || format('The start date is in the past: lessons since %s will count as attended and be billed.', public.ai_date_label(v_start));
      END IF;
      IF c.max_students IS NOT NULL AND (
        SELECT count(*) FROM public.enrollments e
        WHERE e.class_id = v_class AND (e.end_date IS NULL OR e.end_date >= v_today)
      ) >= c.max_students THEN
        warnings := warnings || format('%s is already full (%s students).', c.name, c.max_students);
      END IF;
      lines := lines || format('Enrol in %s from %s', c.name, public.ai_date_label(v_start));
      nudges := nudges || 'Open Tuition on the student page so the bill is worked out again.'::text;
      normal := normal || jsonb_build_object('enrol', jsonb_build_object(
        'class_id', v_class, 'class_name', c.name, 'start_date', v_start));
    END IF;
  END IF;

  x := p_plan -> 'discount';
  IF coalesce(jsonb_typeof(x), 'null') <> 'null' THEN
    bad := public.ai_unknown_keys(x, ARRAY['percent','first_month','months']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown discount detail: %s.', array_to_string(bad, ', ')); END IF;
    v_pct := public.ai_whole(x -> 'percent', 1, 100);
    v_count := public.ai_whole(x -> 'months', 1, 24);
    v_first := x ->> 'first_month';
    IF v_pct IS NULL THEN problems := problems || 'The discount has to be a whole percentage from 1 to 100.'::text; END IF;
    IF v_count IS NULL THEN problems := problems || 'The discount has to last from 1 to 24 months.'::text; END IF;
    IF v_first IS NULL OR v_first !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      problems := problems || 'The discount needs a first month.'::text;
    ELSIF v_first < to_char(v_today - interval '3 months', 'YYYY-MM') THEN
      problems := problems || 'A discount cannot start more than three months back.'::text;
    ELSIF v_pct IS NOT NULL AND v_count IS NOT NULL THEN
      IF NOT v_active THEN problems := problems || format('%s has left the school.', v_name); END IF;
      SELECT array_agg(to_char(to_date(v_first || '-01', 'YYYY-MM-DD') + make_interval(months => i::int), 'YYYY-MM') ORDER BY i)
        INTO v_months FROM generate_series(0, v_count - 1) AS i;
      IF EXISTS (SELECT 1 FROM unnest(v_months) m WHERE public.ai_month_closed(m)) THEN
        problems := problems || 'One of those months is closed, so its bill cannot change.'::text;
      END IF;
      -- The 2nd, not the 1st. calculate-tuition picks up any discount that
      -- starts on or before the first day of the NEXT month, so one dated
      -- the 1st would also come off the bill before. A discount is always
      -- applied to whole bills, so the day inside the month is otherwise moot.
      v_from := (v_first || '-02')::date;
      v_to := (to_date(v_months[v_count::int] || '-01', 'YYYY-MM-DD') + interval '1 month' - interval '1 day')::date;
      IF v_student IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.discount_assignments da
        JOIN public.discount_definitions dd ON dd.id = da.discount_def_id
        WHERE da.student_id = v_student AND dd.is_active
          AND da.effective_from <= v_to AND (da.effective_to IS NULL OR da.effective_to >= v_from)
      ) THEN
        warnings := warnings || format('%s already has another discount on some of these months; both would apply.', v_name);
      END IF;
      IF v_student IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.student_id = v_student AND i.month = ANY (v_months) AND (to_jsonb(i) ->> 'tuition_frozen') = 'true'
      ) THEN
        warnings := warnings || 'Some of those bills are frozen and will not change.'::text;
      END IF;
      lines := lines || format('Discount: %s%% on %s', v_pct,
        CASE WHEN v_count <= 4
          THEN (SELECT string_agg(public.ai_month_label(m), ', ' ORDER BY m) FROM unnest(v_months) m) || ' bills'
          ELSE format('%s bills, %s to %s', v_count, public.ai_month_label(v_months[1]), public.ai_month_label(v_months[v_count::int]))
        END);
      nudges := nudges || 'Open Tuition on the student page so the bill is worked out again.'::text;
      normal := normal || jsonb_build_object('discount', jsonb_build_object(
        'percent', v_pct, 'months', to_jsonb(v_months), 'effective_from', v_from, 'effective_to', v_to));
    END IF;
  END IF;

  x := p_plan -> 'payment';
  IF coalesce(jsonb_typeof(x), 'null') <> 'null' THEN
    bad := public.ai_unknown_keys(x, ARRAY['amount','month','method','paid_on','note']);
    IF cardinality(bad) > 0 THEN problems := problems || format('Unknown payment detail: %s.', array_to_string(bad, ', ')); END IF;
    v_amount := public.ai_whole(x -> 'amount', 1, 1000000000);
    v_pay_month := x ->> 'month';
    v_method := x ->> 'method';
    v_paid_on := public.ai_try_date(x ->> 'paid_on');
    v_note := nullif(btrim(coalesce(x ->> 'note', '')), '');
    IF v_amount IS NULL THEN problems := problems || 'The payment has to be a whole amount of dong, more than nothing.'::text; END IF;
    IF v_pay_month IS NULL OR v_pay_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      problems := problems || 'The payment needs the month it is for.'::text;
    ELSIF v_pay_month < to_char(v_today - interval '24 months', 'YYYY-MM') OR v_pay_month > to_char(v_today + interval '12 months', 'YYYY-MM') THEN
      problems := problems || 'The payment month has to be within two years back or one year ahead.'::text;
    ELSIF public.ai_month_closed(v_pay_month) THEN
      problems := problems || format('%s is closed, so a payment cannot be recorded against it.', public.ai_month_label(v_pay_month));
    END IF;
    IF v_method IS NULL OR v_method NOT IN ('Cash', 'Bank Transfer', 'Card', 'Other') THEN
      problems := problems || 'The payment method has to be Cash, Bank Transfer, Card or Other.'::text;
    END IF;
    IF v_paid_on IS NULL OR v_paid_on > v_today OR v_paid_on < v_today - interval '1 year' THEN
      problems := problems || 'The payment date has to be a real date within the last year.'::text;
    END IF;
    IF length(coalesce(v_note, '')) > 500 THEN problems := problems || 'The payment note is too long.'::text; END IF;

    IF v_amount IS NOT NULL AND v_pay_month ~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      IF v_student IS NOT NULL THEN
        SELECT total_amount, recorded_payment, carry_in_debt, carry_in_credit INTO inv
        FROM public.invoices WHERE student_id = v_student AND month = v_pay_month;
        IF NOT FOUND THEN
          warnings := warnings || format('There is no bill for %s yet, so this will show as credit until tuition is worked out.', public.ai_month_label(v_pay_month));
        ELSE
          v_due := coalesce(inv.total_amount, 0) + coalesce(inv.carry_in_debt, 0) - coalesce(inv.carry_in_credit, 0);
          v_owed := greatest(v_due - coalesce(inv.recorded_payment, 0), 0);
          IF v_amount > v_owed THEN
            warnings := warnings || format('That is more than the %s still owed for %s; the rest becomes credit.', public.ai_vnd(v_owed), public.ai_month_label(v_pay_month));
          END IF;
        END IF;
      END IF;
      lines := lines || format('Record tuition payment: %s for %s, %s, paid %s',
        public.ai_vnd(v_amount), public.ai_month_label(v_pay_month), coalesce(v_method, '?'),
        coalesce(public.ai_date_label(v_paid_on), '?'));
      nudges := nudges || 'Open Tuition on the student page to check the balance.'::text;
      normal := normal || jsonb_build_object('payment', jsonb_build_object(
        'amount', v_amount, 'month', v_pay_month, 'method', v_method, 'paid_on', v_paid_on, 'note', v_note));
    END IF;
  END IF;

  IF NOT v_new AND NOT (normal ?| ARRAY['family','sibling_hold','enrol','discount','payment']) AND cardinality(problems) = 0 THEN
    problems := problems || 'There is nothing to do for this student.'::text;
  END IF;

  normal := normal || jsonb_build_object('student', jsonb_build_object(
    'id', v_student, 'new', v_new, 'full_name', v_name, 'date_of_birth', v_dob,
    'family_before', v_family_now, 'hold_before', v_hold_now));

  RETURN jsonb_build_object(
    'ok', cardinality(problems) = 0,
    'problems', to_jsonb(problems),
    'warnings', to_jsonb(warnings),
    'summary', to_jsonb(lines),
    'nudges', (SELECT coalesce(jsonb_agg(DISTINCT n), '[]') FROM unnest(nudges) n),
    'normal', normal
  );
END $$;

-- ---------------------------------------------------------- preview

-- What the chat function calls. STABLE: Postgres refuses any write in it.
CREATE OR REPLACE FUNCTION public.ai_action_preview(p_plan jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  RETURN public.ai_plan_check(p_plan) - 'normal';
END $$;

-- ---------------------------------------------------------- apply

CREATE OR REPLACE FUNCTION public.ai_action_apply(p_proposal_id uuid, p_instruction text, p_plan jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prior public.ai_actions%ROWTYPE;
  chk jsonb;
  n jsonb;
  inv record;
  v_student uuid;
  v_enrol uuid;
  v_def uuid;
  v_assign uuid;
  v_invoice uuid;
  v_amount bigint;
  v_month text;
  v_prev bigint;
  v_total bigint;
  v_payable bigint;
  v_created boolean := false;
  effects jsonb := '{}';
  v_action uuid;
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  IF p_proposal_id IS NULL THEN RAISE EXCEPTION 'A proposal id is required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_proposal_id::text, 0));
  SELECT * INTO v_prior FROM public.ai_actions WHERE proposal_id = p_proposal_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true, 'action_id', v_prior.id,
      'student_id', v_prior.student_id, 'summary', v_prior.summary,
      'nudges', coalesce(v_prior.effects -> 'nudges', '[]'),
      'open_path', '/students/' || v_prior.student_id);
  END IF;

  -- Lock the student before checking, so the check holds until commit.
  PERFORM 1 FROM public.students WHERE id = public.ai_try_uuid(p_plan -> 'student' ->> 'id') FOR UPDATE;

  chk := public.ai_plan_check(p_plan);
  IF NOT (chk ->> 'ok')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'problems', chk -> 'problems');
  END IF;
  n := chk -> 'normal';

  IF (n -> 'student' ->> 'new')::boolean THEN
    INSERT INTO public.students (full_name, date_of_birth, created_by)
    VALUES (n -> 'student' ->> 'full_name', (n -> 'student' ->> 'date_of_birth')::date, v_actor)
    RETURNING id INTO v_student;
    v_created := true;
  ELSE
    v_student := (n -> 'student' ->> 'id')::uuid;
  END IF;
  effects := jsonb_build_object('student_id', v_student, 'student_created', v_created, 'nudges', chk -> 'nudges');

  IF n ? 'family' THEN
    UPDATE public.students SET family_id = (n -> 'family' ->> 'family_id')::uuid, updated_by = v_actor
    WHERE id = v_student;
    effects := effects || jsonb_build_object('family', jsonb_build_object(
      'before', n -> 'family' -> 'before_id', 'after', n -> 'family' -> 'family_id'));
  END IF;

  IF n ? 'sibling_hold' THEN
    UPDATE public.students SET sibling_discount_from = (n -> 'sibling_hold' ->> 'from')::date, updated_by = v_actor
    WHERE id = v_student;
    effects := effects || jsonb_build_object('sibling_hold', jsonb_build_object(
      'before', n -> 'sibling_hold' -> 'before', 'after', n -> 'sibling_hold' -> 'from'));
  END IF;

  IF n ? 'enrol' THEN
    INSERT INTO public.enrollments (student_id, class_id, start_date, created_by)
    VALUES (v_student, (n -> 'enrol' ->> 'class_id')::uuid, (n -> 'enrol' ->> 'start_date')::date, v_actor)
    RETURNING id INTO v_enrol;
    effects := effects || jsonb_build_object('enrollment_id', v_enrol);
  END IF;

  IF n ? 'discount' THEN
    INSERT INTO public.discount_definitions (name, type, value, cadence, start_month, end_month, is_active, created_by)
    VALUES (
      format('%s%% for %s months - %s', n -> 'discount' ->> 'percent',
        jsonb_array_length(n -> 'discount' -> 'months'), n -> 'student' ->> 'full_name'),
      'percent', (n -> 'discount' ->> 'percent')::numeric, 'monthly',
      n -> 'discount' -> 'months' ->> 0,
      n -> 'discount' -> 'months' ->> (jsonb_array_length(n -> 'discount' -> 'months') - 1),
      true, v_actor)
    RETURNING id INTO v_def;
    INSERT INTO public.discount_assignments (student_id, discount_def_id, effective_from, effective_to, note, created_by)
    VALUES (v_student, v_def, (n -> 'discount' ->> 'effective_from')::date,
      (n -> 'discount' ->> 'effective_to')::date, 'Set up by the assistant', v_actor)
    RETURNING id INTO v_assign;
    effects := effects || jsonb_build_object('discount', jsonb_build_object(
      'definition_id', v_def, 'assignment_id', v_assign, 'months', n -> 'discount' -> 'months'));
  END IF;

  IF n ? 'payment' THEN
    v_amount := (n -> 'payment' ->> 'amount')::bigint;
    v_month := n -> 'payment' ->> 'month';
    SELECT id, recorded_payment, total_amount, carry_in_debt, carry_in_credit INTO inv
    FROM public.invoices WHERE student_id = v_student AND month = v_month FOR UPDATE;
    IF NOT FOUND THEN
      -- Same shape RecordPaymentDialog writes when there is no bill yet.
      INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount,
        recorded_payment, paid_amount, status, created_by)
      VALUES (v_student, v_month, 0, 0, 0, v_amount, 0, 'partial', v_actor)
      RETURNING id INTO v_invoice;
      v_prev := 0;
      effects := effects || jsonb_build_object('payment', jsonb_build_object(
        'invoice_id', v_invoice, 'month', v_month, 'amount', v_amount, 'invoice_created', true));
    ELSE
      v_invoice := inv.id;
      v_prev := coalesce(inv.recorded_payment, 0);
      v_total := v_prev + v_amount;
      v_payable := coalesce(inv.total_amount, 0) + coalesce(inv.carry_in_debt, 0) - coalesce(inv.carry_in_credit, 0);
      UPDATE public.invoices
      SET recorded_payment = v_total,
          status = (CASE WHEN v_total >= v_payable AND v_payable > 0 THEN 'paid'
                         WHEN v_total > 0 THEN 'partial' ELSE 'issued' END)::invoice_status,
          updated_at = now(), updated_by = v_actor
      WHERE id = v_invoice;
      effects := effects || jsonb_build_object('payment', jsonb_build_object(
        'invoice_id', v_invoice, 'month', v_month, 'amount', v_amount, 'invoice_created', false));
    END IF;
    INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
    VALUES ('invoice', v_invoice::text, 'record_payment', v_actor, jsonb_build_object(
      'student_id', v_student, 'month', v_month, 'previous_recorded_payment', v_prev,
      'payment_amount', v_amount, 'new_recorded_payment', v_prev + v_amount,
      'payment_date', n -> 'payment' -> 'paid_on', 'payment_method', n -> 'payment' -> 'method',
      'memo', n -> 'payment' -> 'note', 'invoice_created', (effects -> 'payment' ->> 'invoice_created')::boolean,
      'type', 'payment', 'via', 'assistant'));
  END IF;

  INSERT INTO public.ai_actions (proposal_id, instruction, plan, summary, effects, student_id, created_by)
  VALUES (p_proposal_id, left(coalesce(btrim(p_instruction), ''), 4000), p_plan, chk -> 'summary', effects, v_student, v_actor)
  RETURNING id INTO v_action;

  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('ai_action', v_action::text, 'ai_action_apply', v_actor,
    jsonb_build_object('student_id', v_student, 'summary', chk -> 'summary'));

  RETURN jsonb_build_object('ok', true, 'action_id', v_action, 'student_id', v_student,
    'summary', chk -> 'summary', 'warnings', chk -> 'warnings', 'nudges', chk -> 'nudges',
    'open_path', '/students/' || v_student);
END $$;

-- ---------------------------------------------------------- undo

-- Anything a person did that refers to the student, by table. Seeded
-- register marks, bills with no money on them, zero point totals and the
-- family discount working are not people's work and do not count.
CREATE OR REPLACE FUNCTION public.ai_student_activity(p_student uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_n bigint;
  v_extra text;
  found text[] := '{}';
BEGIN
  FOR r IN
    SELECT DISTINCT tbl, col FROM (
      SELECT c.table_name::text AS tbl, c.column_name::text AS col
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.data_type = 'uuid' AND c.column_name LIKE '%student_id'
      UNION
      SELECT cl.relname::text, a.attname::text
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace AND ns.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
      WHERE con.contype = 'f' AND con.confrelid = 'public.students'::regclass AND cardinality(con.conkey) = 1
    ) refs
    WHERE tbl NOT IN ('students', 'ai_actions', 'sibling_discount_state')
    ORDER BY tbl
  LOOP
    v_extra := CASE r.tbl
      WHEN 'attendance' THEN ' AND (marked_by IS NOT NULL OR status IS DISTINCT FROM ''Present'')'
      WHEN 'invoices' THEN ' AND (coalesce(recorded_payment, 0) <> 0 OR coalesce(paid_amount, 0) <> 0)'
      WHEN 'student_points' THEN ' AND coalesce(total_points, 0) <> 0'
      ELSE ''
    END;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1%s', r.tbl, r.col, v_extra)
      INTO v_n USING p_student;
    IF v_n > 0 THEN
      found := found || format('%s %s', v_n, CASE r.tbl
        WHEN 'attendance' THEN 'lesson mark(s) made by a person'
        WHEN 'invoices' THEN 'bill(s) with money on them'
        WHEN 'payments' THEN 'payment(s)'
        WHEN 'point_transactions' THEN 'points award(s)'
        WHEN 'homework_submissions' THEN 'homework submission(s)'
        WHEN 'enrollments' THEN 'enrolment(s) added since'
        WHEN 'discount_assignments' THEN 'discount(s) added since'
        WHEN 'monthly_finance_snapshots' THEN 'closed month record(s)'
        ELSE replace(r.tbl, '_', ' ') || ' row(s)'
      END);
    END IF;
  END LOOP;
  RETURN found;
END $$;

CREATE OR REPLACE FUNCTION public.ai_action_undo(p_action_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  a public.ai_actions%ROWTYPE;
  e jsonb;
  v_student uuid;
  reasons text[] := '{}';
  inv record;
  en record;
  v_class_name text;
  v_amount bigint;
  v_month text;
  v_left bigint;
  v_payable bigint;
  v_n bigint;
  v_now_family uuid;
  v_now_hold date;
  v_login boolean;
  v_since text;
  v_activity text[];
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO a FROM public.ai_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array('That action does not exist.'));
  END IF;
  IF a.status = 'undone' THEN
    RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array('This was already undone.'));
  END IF;
  e := a.effects;
  v_student := (e ->> 'student_id')::uuid;
  v_since := to_char(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM');

  -- All of it or none of it. Each step adds to `reasons` instead of
  -- stopping, so the admin hears every blocker at once; the RAISE at the
  -- end then rolls back whatever the steps before had already reversed.
  BEGIN
    PERFORM 1 FROM public.students WHERE id = v_student FOR UPDATE;

    IF e ? 'payment' THEN
      v_amount := (e -> 'payment' ->> 'amount')::bigint;
      v_month := e -> 'payment' ->> 'month';
      SELECT * INTO inv FROM public.invoices WHERE id = (e -> 'payment' ->> 'invoice_id')::uuid FOR UPDATE;
      IF public.ai_month_closed(v_month) THEN
        reasons := reasons || format('%s has been closed, so its payment cannot be taken back.', public.ai_month_label(v_month));
      ELSIF NOT FOUND THEN
        reasons := reasons || format('The %s bill this payment was on no longer exists.', public.ai_month_label(v_month));
      ELSIF coalesce(inv.recorded_payment, 0) < v_amount THEN
        reasons := reasons || format('Only %s is recorded for %s now, less than the %s this added.',
          public.ai_vnd(coalesce(inv.recorded_payment, 0)), public.ai_month_label(v_month), public.ai_vnd(v_amount));
      ELSE
        v_left := inv.recorded_payment - v_amount;
        IF (e -> 'payment' ->> 'invoice_created')::boolean AND v_left = 0
           AND coalesce(inv.total_amount, 0) = 0 AND coalesce(inv.base_amount, 0) = 0 THEN
          DELETE FROM public.invoices WHERE id = inv.id;
        ELSE
          v_payable := coalesce(inv.total_amount, 0) + coalesce(inv.carry_in_debt, 0) - coalesce(inv.carry_in_credit, 0);
          UPDATE public.invoices
          SET recorded_payment = v_left,
              status = (CASE WHEN v_left >= v_payable AND v_payable > 0 THEN 'paid'
                             WHEN v_left > 0 THEN 'partial' ELSE 'issued' END)::invoice_status,
              updated_at = now(), updated_by = v_actor
          WHERE id = inv.id;
        END IF;
        INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
        VALUES ('invoice', inv.id::text, 'payment_correction', v_actor, jsonb_build_object(
          'student_id', v_student, 'month', v_month, 'previous_recorded_payment', inv.recorded_payment,
          'payment_amount', -v_amount, 'new_recorded_payment', v_left,
          'memo', 'Undo of an assistant action', 'type', 'correction', 'via', 'assistant'));
      END IF;
    END IF;

    IF e ? 'sibling_hold' THEN
      SELECT sibling_discount_from INTO v_now_hold FROM public.students WHERE id = v_student;
      IF v_now_hold IS DISTINCT FROM (e -> 'sibling_hold' ->> 'after')::date THEN
        reasons := reasons || 'Someone has changed the sibling discount hold since.'::text;
      ELSE
        UPDATE public.students SET sibling_discount_from = (e -> 'sibling_hold' ->> 'before')::date, updated_by = v_actor
        WHERE id = v_student;
      END IF;
    END IF;

    IF e ? 'family' THEN
      SELECT family_id INTO v_now_family FROM public.students WHERE id = v_student;
      IF v_now_family IS DISTINCT FROM (e -> 'family' ->> 'after')::uuid THEN
        reasons := reasons || 'Someone has moved this student to another family since.'::text;
      ELSE
        UPDATE public.students SET family_id = (e -> 'family' ->> 'before')::uuid, updated_by = v_actor
        WHERE id = v_student;
        -- Any family discount worked out while the student counted is
        -- wrong now. Clear the open months so the next tuition read works
        -- it out again; closed months keep what was billed.
        DELETE FROM public.sibling_discount_state s
        WHERE s.family_id IN ((e -> 'family' ->> 'after')::uuid, (e -> 'family' ->> 'before')::uuid)
          AND s.month >= greatest(v_since, coalesce(left(e -> 'sibling_hold' ->> 'after', 7), v_since))
          AND NOT public.ai_month_closed(s.month);
      END IF;
    END IF;

    IF e ? 'discount' THEN
      IF EXISTS (SELECT 1 FROM public.discount_assignments WHERE id = (e -> 'discount' ->> 'assignment_id')::uuid) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(e -> 'discount' -> 'months') m WHERE public.ai_month_closed(m)) THEN
          reasons := reasons || 'A month the discount covers has been closed.'::text;
        ELSIF EXISTS (
          SELECT 1 FROM public.invoices i
          WHERE i.student_id = v_student AND coalesce(i.recorded_payment, 0) > 0
            AND i.month IN (SELECT jsonb_array_elements_text(e -> 'discount' -> 'months'))
        ) THEN
          reasons := reasons || 'A payment has been recorded on a month the discount covers, so removing it would change a bill that has been paid.'::text;
        ELSE
          DELETE FROM public.discount_assignments WHERE id = (e -> 'discount' ->> 'assignment_id')::uuid;
          DELETE FROM public.discount_definitions d
          WHERE d.id = (e -> 'discount' ->> 'definition_id')::uuid
            AND NOT EXISTS (SELECT 1 FROM public.discount_assignments x WHERE x.discount_def_id = d.id);
        END IF;
      END IF;
    END IF;

    IF e ? 'enrollment_id' THEN
      SELECT * INTO en FROM public.enrollments WHERE id = (e ->> 'enrollment_id')::uuid FOR UPDATE;
      IF FOUND THEN
        SELECT name INTO v_class_name FROM public.classes WHERE id = en.class_id;
        IF en.end_date IS NOT NULL THEN
          reasons := reasons || format('The %s enrolment has been changed since.', coalesce(v_class_name, 'class'));
        ELSE
          SELECT count(*) INTO v_n
          FROM public.attendance at JOIN public.sessions se ON se.id = at.session_id
          WHERE at.student_id = v_student AND se.class_id = en.class_id
            AND (at.marked_by IS NOT NULL OR at.status IS DISTINCT FROM 'Present');
          IF v_n > 0 THEN
            reasons := reasons || format('%s %s lesson(s) have been marked by a person since.', v_n, coalesce(v_class_name, ''));
          ELSIF EXISTS (
            SELECT 1 FROM public.monthly_finance_snapshots
            WHERE student_id = v_student AND month >= to_char(en.start_date, 'YYYY-MM') AND superseded_at IS NULL
          ) THEN
            reasons := reasons || 'A month this enrolment was billed in has been closed.'::text;
          ELSE
            DELETE FROM public.attendance at USING public.sessions se
            WHERE se.id = at.session_id AND at.student_id = v_student AND se.class_id = en.class_id
              AND at.marked_by IS NULL AND at.status = 'Present';
            DELETE FROM public.enrollments WHERE id = en.id;
          END IF;
        END IF;
      END IF;
    END IF;

    IF (e ->> 'student_created')::boolean AND cardinality(reasons) = 0 THEN
      SELECT (linked_user_id IS NOT NULL OR secondary_user_id IS NOT NULL) INTO v_login
      FROM public.students WHERE id = v_student;
      IF v_login THEN reasons := reasons || 'A login has been set up for this student since.'::text; END IF;
      v_activity := public.ai_student_activity(v_student);
      IF cardinality(v_activity) > 0 THEN
        reasons := reasons || format('People have added records for this student since: %s.', array_to_string(v_activity, ', '));
      END IF;
      IF cardinality(reasons) = 0 THEN
        DELETE FROM public.attendance WHERE student_id = v_student AND marked_by IS NULL AND status = 'Present';
        DELETE FROM public.invoices WHERE student_id = v_student;
        DELETE FROM public.student_points WHERE student_id = v_student;
        DELETE FROM public.sibling_discount_state WHERE winner_student_id = v_student AND NOT public.ai_month_closed(month);
        DELETE FROM public.students WHERE id = v_student;
      END IF;
    END IF;

    IF cardinality(reasons) > 0 THEN
      RAISE EXCEPTION 'ai_undo_blocked';
    END IF;
  EXCEPTION
    WHEN raise_exception THEN
      IF cardinality(reasons) = 0 THEN reasons := ARRAY[SQLERRM]; END IF;
      RETURN jsonb_build_object('ok', false, 'reasons', to_jsonb(reasons));
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array(
        'Something else in the app still points at this, so nothing was changed.'));
  END;

  UPDATE public.ai_actions SET status = 'undone', undone_by = v_actor, undone_at = now() WHERE id = a.id;
  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('ai_action', a.id::text, 'ai_action_undo', v_actor,
    jsonb_build_object('student_id', v_student, 'summary', a.summary));

  RETURN jsonb_build_object('ok', true, 'student_removed', (e ->> 'student_created')::boolean,
    'open_path', CASE WHEN (e ->> 'student_created')::boolean THEN '/students' ELSE '/students/' || v_student END);
END $$;

CREATE OR REPLACE FUNCTION public.ai_action_mark_reviewed(p_action_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ai_actions SET reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_action_id AND reviewed_at IS NULL;
END $$;

-- The AI actions screen: the log, with names for who did and undid each.
CREATE OR REPLACE FUNCTION public.ai_actions_list(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid, created_at timestamptz, instruction text, summary jsonb, nudges jsonb, status text,
  student_id uuid, student_exists boolean, reviewed_at timestamptz, undone_at timestamptz,
  created_by_me boolean, created_by_name text, undone_by_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.created_at, a.instruction, a.summary, coalesce(a.effects -> 'nudges', '[]'::jsonb), a.status, a.student_id,
         EXISTS (SELECT 1 FROM public.students s WHERE s.id = a.student_id),
         a.reviewed_at, a.undone_at,
         a.created_by = auth.uid(),
         coalesce((SELECT nullif(btrim(p.display_name), '') FROM public.profiles p WHERE p.id = a.created_by), 'An admin'),
         (SELECT coalesce(nullif(btrim(p.display_name), ''), 'An admin') FROM public.profiles p WHERE p.id = a.undone_by)
  FROM public.ai_actions a
  ORDER BY a.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END $$;

-- ---------------------------------------------------------- who may call what

REVOKE EXECUTE ON FUNCTION public.ai_plan_check(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_student_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_try_date(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_try_uuid(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_date_label(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_month_label(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_vnd(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_month_closed(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_unknown_keys(jsonb, text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_whole(jsonb, numeric, numeric) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.ai_action_preview(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_action_apply(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_action_undo(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_action_mark_reviewed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_actions_list(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_action_preview(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_action_apply(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_action_undo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_action_mark_reviewed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_actions_list(integer) TO authenticated;
