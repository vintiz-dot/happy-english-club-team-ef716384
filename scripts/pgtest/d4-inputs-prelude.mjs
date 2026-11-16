// Scaffolding for the D4 step 3B suites (money inputs): d4-money-inputs,
// d4-functions-inputs, d4-reach-oracle. Not a suite: it runs nothing on
// import. It ADDS to d4-prelude.mjs (never edits it): the money-input tables
// with the columns, checks, foreign keys and policies the real migrations
// give them, so the real enrolment RPC migrations (20261106100001,
// 20261113120000), the deactivation trigger (20260403051502) and D4 file 5
// load over D2's prelude.
//
// Sources, table by table:
//   enrollments           20251011192324 + rate_override_vnd, allowed_days, discount_* (types.ts)
//   discount_* / referral 20251012022547:1-45 (auth.users FKs left out)
//   staff_pay_rates       20261021090000:66-98 with the PLAIN unique indexes of 20261021094000
//   teachers / assistants the three mirror columns (types.ts)
//   payments              20251012022547:55 (the columns the delete guard reads)
//   sibling_discount_state 20251012080009:2-11 + the two later columns (types.ts)
//   policies              "Admins manage ..." FOR ALL on each, as live
import { PGlite } from '@electric-sql/pglite';
import { D2_PRELUDE, D4_PEOPLE, D4_EVIDENCE_RLS, D4_ENROLMENT_RPCS, sqlOf, migPath } from './d4-prelude.mjs';

export const D4_INPUTS = `
  CREATE TYPE public.discount_type AS ENUM ('percent', 'amount');
  CREATE TYPE public.discount_cadence AS ENUM ('once', 'monthly');

  ALTER TABLE public.enrollments
    ADD COLUMN rate_override_vnd integer,
    ADD COLUMN discount_type public.discount_type,
    ADD COLUMN discount_value integer,
    ADD COLUMN discount_cadence public.discount_cadence;
  ALTER TABLE public.enrollments ALTER COLUMN class_id SET NOT NULL, ALTER COLUMN student_id SET NOT NULL,
    ALTER COLUMN start_date SET NOT NULL;

  ALTER TABLE public.classes ADD COLUMN name text, ADD COLUMN description text, ADD COLUMN is_active boolean NOT NULL DEFAULT true,
    ADD COLUMN session_rate_vnd integer NOT NULL DEFAULT 0;
  ALTER TABLE public.classes ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ALTER TABLE public.families ADD COLUMN email text, ADD COLUMN phone text, ADD COLUMN address text,
    ADD COLUMN primary_user_id uuid, ADD COLUMN created_by uuid, ADD COLUMN updated_by uuid,
    ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  ALTER TABLE public.students ADD COLUMN email text, ADD COLUMN phone text, ADD COLUMN date_of_birth date, ADD COLUMN notes text,
    ADD COLUMN created_by uuid, ADD COLUMN updated_by uuid;
  -- 20251011192324:34: a family delete un-links its children (so the family guard sees it)
  ALTER TABLE public.students DROP CONSTRAINT students_family_id_fkey;
  ALTER TABLE public.students ADD CONSTRAINT students_family_id_fkey FOREIGN KEY (family_id)
    REFERENCES public.families(id) ON DELETE SET NULL;
  ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_fk FOREIGN KEY (student_id)
    REFERENCES public.students(id) ON DELETE CASCADE;
  ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_class_fk FOREIGN KEY (class_id)
    REFERENCES public.classes(id) ON DELETE RESTRICT;

  CREATE TABLE public.discount_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, type public.discount_type NOT NULL,
    cadence public.discount_cadence NOT NULL, value integer NOT NULL, start_month text NOT NULL, end_month text,
    amortize_yearly boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid, updated_by uuid);
  CREATE TABLE public.discount_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    discount_def_id uuid NOT NULL REFERENCES public.discount_definitions(id) ON DELETE CASCADE,
    effective_from date NOT NULL DEFAULT CURRENT_DATE, effective_to date, note text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid, updated_by uuid);
  CREATE TABLE public.referral_bonuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type public.discount_type NOT NULL, cadence public.discount_cadence NOT NULL, value integer NOT NULL,
    effective_from date NOT NULL DEFAULT CURRENT_DATE, effective_to date, note text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid, updated_by uuid);

  ALTER TABLE public.teachers ADD COLUMN pay_rate_type text NOT NULL DEFAULT 'hourly',
    ADD COLUMN hourly_rate_vnd integer NOT NULL DEFAULT 0, ADD COLUMN per_session_rate_vnd integer NOT NULL DEFAULT 0;
  ALTER TABLE public.teaching_assistants ADD COLUMN pay_rate_type text NOT NULL DEFAULT 'hourly',
    ADD COLUMN hourly_rate_vnd integer NOT NULL DEFAULT 0, ADD COLUMN per_session_rate_vnd integer NOT NULL DEFAULT 0;
  CREATE TABLE public.staff_pay_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
    assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    effective_from date NOT NULL, pay_rate_type text NOT NULL DEFAULT 'hourly',
    hourly_rate_vnd integer NOT NULL DEFAULT 0, per_session_rate_vnd integer NOT NULL DEFAULT 0,
    note text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    CONSTRAINT staff_pay_rates_one_subject_check CHECK ((teacher_id IS NOT NULL) <> (assistant_id IS NOT NULL)),
    CONSTRAINT staff_pay_rates_type_check CHECK (pay_rate_type IN ('hourly', 'per_session')),
    CONSTRAINT staff_pay_rates_rate_set_check CHECK (
      (pay_rate_type = 'hourly' AND hourly_rate_vnd > 0 AND per_session_rate_vnd = 0) OR
      (pay_rate_type = 'per_session' AND per_session_rate_vnd > 0 AND hourly_rate_vnd = 0)));
  CREATE UNIQUE INDEX staff_pay_rates_teacher_from_key ON public.staff_pay_rates (teacher_id, effective_from);
  CREATE UNIQUE INDEX staff_pay_rates_assistant_from_key ON public.staff_pay_rates (assistant_id, effective_from);

  CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    family_id uuid, amount integer NOT NULL DEFAULT 0, method text NOT NULL DEFAULT 'cash', memo text,
    occurred_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);

  -- 20251012080009:2-11 (+ winner_class_id, projected_base_snapshot from types.ts): the stored
  -- family discount the family guard reads (review M-1: a lone child still named as the winner)
  CREATE TABLE public.sibling_discount_state (
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE, month text NOT NULL,
    status text NOT NULL CHECK (status IN ('assigned', 'pending', 'none')),
    winner_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL, winner_class_id uuid,
    sibling_percent int NOT NULL, projected_base_snapshot integer, reason text,
    computed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (family_id, month));

  -- what manage-demo-student touches besides the guarded tables
  CREATE TABLE public.users (id uuid PRIMARY KEY, role text);
  CREATE TABLE public.demo_access (id boolean PRIMARY KEY DEFAULT true, enabled boolean NOT NULL DEFAULT false,
    password_set_at timestamptz, password_set_by uuid, updated_at timestamptz);

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

  DO $rls$
  DECLARE t text;
  BEGIN
    FOREACH t IN ARRAY ARRAY['enrollments', 'discount_definitions', 'discount_assignments', 'referral_bonuses',
                             'staff_pay_rates', 'teachers', 'teaching_assistants', 'students', 'families', 'classes',
                             'invoices', 'payments', 'pause_windows', 'sibling_discount_state'] LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                        USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
                     'admins_manage_' || t, t);
    END LOOP;
  END $rls$;
  -- staff read the classes they teach, families their own children (enough for "a teacher / a parent cannot")
  CREATE POLICY teachers_read_enrollments ON public.enrollments FOR SELECT TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY family_reads_students ON public.students FOR SELECT TO authenticated USING (linked_user_id = auth.uid());
`;

export const ENROL_NO_AUTO = '20261106100000_attendance_guard_no_auto_changes.sql';
export const ENROL_RPCS = '20261106100001_date_aware_enrollment_changes.sql';
export const PAUSE = '20261113120000_pause_enrollment_admin_only.sql';
export const DEACTIVATE = '20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql';
export const INPUTS = '20261114094000_d4_money_inputs_guard.sql';

/**
 * A fresh pglite for the money-input suites: D2's prelude, the D4 people and
 * evidence policies, the money-input tables, then the named migration files
 * in order (real files, read as they are on disk).
 */
export async function makeInputsDb(migrations = []) {
  const d = new PGlite();
  await d.exec(D2_PRELUDE);
  await d.exec(D4_PEOPLE);
  await d.exec(D4_EVIDENCE_RLS);
  await d.exec(D4_ENROLMENT_RPCS);
  await d.exec(D4_INPUTS);
  for (const m of migrations) await d.exec(sqlOf(m.includes('/') || m.includes('\\') ? m : migPath(m)));
  return d;
}
