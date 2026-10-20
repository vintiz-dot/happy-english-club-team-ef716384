-- Stop "Add to Expenditures" booking the same month's payroll twice.
--
-- THE BUG. PayrollTab's button builds one row per member of staff and
-- calls .insert(). There is no key tying a row to the month it came from,
-- no unique constraint on expenditures that would catch a repeat, and the
-- button is disabled only while the mutation is in flight. Click it again
-- next week - or on a second tab, or after re-running payroll to pick up a
-- corrected session - and October's wage bill is in the books twice. The
-- finance summary reads expenditures directly, so the school's costs are
-- simply wrong, with nothing on screen to suggest it.
--
-- THE FIX IS A NATURAL KEY, not a guard in the client. Two columns naming
-- where a row came from, and a unique constraint over them, so a repeat is
-- an upsert rather than a second cost. Doing it in the database rather
-- than by disabling the button means it also holds for the payroll-close
-- action added in the next migration, and for anything else that books a
-- cost on behalf of something.
--
-- WHY A PLAIN UNIQUE CONSTRAINT AND NOT A PARTIAL INDEX. Hand-entered
-- expenditures have no source and must stay freely repeatable - two
-- identical 50,000 taxi fares on one day are two taxi fares. In Postgres a
-- UNIQUE constraint treats NULLs as distinct, so every row with
-- source_kind NULL is exempt automatically, and no WHERE clause is needed.
-- That matters practically: PostgREST's upsert names a conflict target by
-- column list and cannot attach the predicate a partial index would
-- require, so a partial index here would be unusable from the client.

ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_key text;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenditures_source_unique'
      AND conrelid = 'public.expenditures'::regclass
  ) THEN
    ALTER TABLE public.expenditures
      ADD CONSTRAINT expenditures_source_unique UNIQUE (source_kind, source_key);
  END IF;
END
$do$;

-- Both or neither. A source_key with no source_kind would sit outside the
-- uniqueness rule above without looking like it does.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenditures_source_pair_check'
      AND conrelid = 'public.expenditures'::regclass
  ) THEN
    ALTER TABLE public.expenditures
      ADD CONSTRAINT expenditures_source_pair_check
      CHECK ((source_kind IS NULL) = (source_key IS NULL));
  END IF;
END
$do$;

COMMENT ON COLUMN public.expenditures.source_kind IS
  'What generated this row, e.g. payroll. NULL for a hand-entered expenditure.';
COMMENT ON COLUMN public.expenditures.source_key IS
  'Identifies the thing within source_kind, e.g. 2026-10:teacher:<uuid>. Unique with source_kind, so re-booking updates rather than duplicating.';

-- ------------------------------------------------------- existing damage
--
-- Rows already booked carry no source, so they cannot be de-duplicated
-- automatically: this migration cannot tell a genuine second payment from
-- an accidental second click. It reports them instead, and leaves them
-- alone. Deleting money out of the books on a guess would be worse than
-- the duplicate.
DO $do$
DECLARE
  dupes integer;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT memo, category, date
    FROM public.expenditures
    WHERE category IN ('Teacher Payroll', 'TA Payroll')
      AND source_kind IS NULL
    GROUP BY memo, category, date
    HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'expenditures: % payroll memo/date combination(s) appear more than once and predate source_key. Check them against the Payroll tab and remove the extras by hand; this migration will not guess.', dupes;
  ELSE
    RAISE NOTICE 'expenditures: no duplicated payroll rows found.';
  END IF;
END
$do$;
