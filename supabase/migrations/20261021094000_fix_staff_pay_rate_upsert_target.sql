-- "Could not record the rate change" - the upsert had no usable conflict
-- target.
--
-- 20261021090000 protected one-rate-per-person-per-date with two PARTIAL
-- unique indexes:
--
--   CREATE UNIQUE INDEX ... ON staff_pay_rates (teacher_id, effective_from)
--     WHERE teacher_id IS NOT NULL;
--
-- PayRateHistory saves with
--
--   .upsert(row, { onConflict: "teacher_id,effective_from" })
--
-- which PostgREST sends as INSERT ... ON CONFLICT (teacher_id,
-- effective_from) DO UPDATE. PostgreSQL will only match that conflict
-- target to a partial index if the statement repeats the index's WHERE
-- predicate, and PostgREST's upsert names a conflict target by column list
-- with no way to attach one. So the planner finds no matching index and
-- the statement fails outright with
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- before it ever looks for a conflicting row. Every save failed, not just
-- a backdated one - the conflict target is resolved at plan time, so the
-- date on the form made no difference to it.
--
-- THE PREDICATE WAS NEVER NEEDED. It was there so that assistant rows,
-- which have teacher_id NULL, would not all collide with each other on one
-- effective_from. They would not have anyway: a UNIQUE index in PostgreSQL
-- treats NULLs as distinct, so every row with teacher_id NULL is exempt
-- from (teacher_id, effective_from) automatically. That is the same
-- property 20261021092000 relies on deliberately to leave hand-entered
-- expenditures repeatable - the reasoning was written down there one file
-- earlier and not applied here.
--
-- Dropping the predicate makes the indexes ordinary, which makes them
-- usable as a conflict target, and changes nothing about what they refuse.

DROP INDEX IF EXISTS public.staff_pay_rates_teacher_from_key;
DROP INDEX IF EXISTS public.staff_pay_rates_assistant_from_key;

CREATE UNIQUE INDEX IF NOT EXISTS staff_pay_rates_teacher_from_key
  ON public.staff_pay_rates (teacher_id, effective_from);
CREATE UNIQUE INDEX IF NOT EXISTS staff_pay_rates_assistant_from_key
  ON public.staff_pay_rates (assistant_id, effective_from);

COMMENT ON INDEX public.staff_pay_rates_teacher_from_key IS
  'One rate per teacher per start date. Not partial: assistant rows hold teacher_id NULL and a UNIQUE index treats NULLs as distinct, so they are exempt without a predicate - and an ordinary index can serve as an ON CONFLICT target, which a partial one cannot.';
