-- Immutable per-student monthly finance snapshots.
-- Captures the final_payable + carry state at month-close so audits years
-- later read frozen numbers, not a live recompute that may have drifted
-- after retroactive session/attendance edits.
--
-- Design rules:
--  * Append-only via versioning. Re-closing a month never overwrites — the
--    prior row is marked superseded and a new version is written with a
--    reason, preserving the full audit trail.
--  * source_payload jsonb stores the full calculate-tuition-bulk result
--    so the exact numbers can be replayed forensically.
--  * VND amounts use bigint (VND has no decimals; values can run into
--    millions per family).
--  * Partial unique index enforces "exactly one active version per
--    (student_id, month)".
CREATE TABLE IF NOT EXISTS public.monthly_finance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),

  -- Frozen finance values (all VND, all bigint).
  final_payable BIGINT NOT NULL,
  base_amount BIGINT NOT NULL DEFAULT 0,
  total_discount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  recorded_payment BIGINT NOT NULL DEFAULT 0,
  carry_in_credit BIGINT NOT NULL DEFAULT 0,
  carry_in_debt BIGINT NOT NULL DEFAULT 0,
  carry_out_credit BIGINT NOT NULL DEFAULT 0,
  carry_out_debt BIGINT NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,

  -- Forensic replay payload — the raw edge function output that produced
  -- the values above. Kept as-is so disputes can be re-resolved without
  -- re-running calculations.
  source_payload JSONB NOT NULL,

  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by UUID REFERENCES auth.users(id),
  close_reason TEXT,

  -- Set non-null when this version is replaced by a newer one.
  superseded_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES auth.users(id),
  supersede_reason TEXT,

  UNIQUE (student_id, month, version)
);

-- Exactly one active (non-superseded) snapshot per student per month.
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_finance_snapshots_active
  ON public.monthly_finance_snapshots (student_id, month)
  WHERE superseded_at IS NULL;

-- Hot path 1: Finance Summary aggregating one month across all students.
CREATE INDEX IF NOT EXISTS idx_monthly_finance_snapshots_month_active
  ON public.monthly_finance_snapshots (month)
  WHERE superseded_at IS NULL;

-- Hot path 2: Student card timeline.
CREATE INDEX IF NOT EXISTS idx_monthly_finance_snapshots_student_month
  ON public.monthly_finance_snapshots (student_id, month, version DESC);

ALTER TABLE public.monthly_finance_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin: full access through the edge function.
CREATE POLICY "Admins can read all monthly snapshots"
  ON public.monthly_finance_snapshots
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert monthly snapshots"
  ON public.monthly_finance_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update monthly snapshots"
  ON public.monthly_finance_snapshots
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers: read-only across all students for finance/payroll context.
CREATE POLICY "Teachers can read all monthly snapshots"
  ON public.monthly_finance_snapshots
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

-- Students/families: read their own student rows.
CREATE POLICY "Students read their own monthly snapshots"
  ON public.monthly_finance_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = monthly_finance_snapshots.student_id
        AND s.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Family primary user reads their student snapshots"
  ON public.monthly_finance_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.families f ON f.id = s.family_id
      WHERE s.id = monthly_finance_snapshots.student_id
        AND f.primary_user_id = auth.uid()
    )
  );

-- Explicit table comment so DBAs and audits know this is the source of
-- truth for closed months.
COMMENT ON TABLE public.monthly_finance_snapshots IS
  'Immutable, versioned per-student monthly finance snapshots. Written by the snapshot-monthly-finance edge function from calculate-tuition-bulk output. Closed months are read from here (audit-grade); open months are computed live. Re-closing a month supersedes the prior version rather than overwriting.';
