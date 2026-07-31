-- ═══════════════════════════════════════════════════════════════════════
-- Student access codes — front-desk account recovery.
-- ═══════════════════════════════════════════════════════════════════════
--
-- THE PROBLEM
-- Families forget their password AND which email address they signed up
-- with. Every existing recovery path runs through resetPasswordForEmail(),
-- i.e. through the exact thing that is lost, so it can never help them.
--
-- THE MODEL
-- Identity is re-anchored on the STUDENT record, which the school always
-- has. An admin issues a one-time claim code; the family redeems it and
-- chooses their own password.
--
-- WHY A CODE AND NOT AN ADMIN-TYPED PASSWORD
-- The admin must never know a family's password. Otherwise every front-desk
-- staff member accumulates working credentials for children's accounts and
-- impersonation becomes both possible and undetectable. The code is a
-- bearer token for ONE password change, not a credential.
--
-- SECURITY PROPERTIES
--   * The code is stored ONLY as a SHA-256 hash. A dump of this table
--     yields nothing usable. The plaintext is shown to the admin once, at
--     issue time, and is unrecoverable afterwards — reissue instead.
--   * Single use (used_at), expiring (expires_at), revocable (revoked_at).
--   * attempts is incremented on every failed redeem and the code locks at
--     MAX_ATTEMPTS, so a 50-bit code cannot be ground down.
--   * No client may read or write this table at all. Even admins only see
--     it through the edge function, which returns status but never a hash.
--     RLS is therefore deny-all: the functions use the service role.

CREATE TABLE IF NOT EXISTS public.student_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- The auth account the code grants a password change on. Siblings share
  -- one login, so several students can point at the same user_id.
  user_id UUID NOT NULL,
  -- SHA-256 of the normalised code. Never the code itself.
  code_hash TEXT NOT NULL UNIQUE,
  -- Shown on the printed card so staff can match a card to a row without
  -- the code being recoverable (e.g. "issued 2 Aug, expires 5 Aug").
  login_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_student
  ON public.student_access_codes(student_id, created_at DESC);

-- The redeem path looks a code up by hash; this must be fast and unique.
CREATE INDEX IF NOT EXISTS idx_access_codes_hash
  ON public.student_access_codes(code_hash);

-- Only one code may be live per student at a time: issuing a new one
-- revokes the old (handled in the function), and this partial index makes
-- a second live code impossible even if that logic is ever bypassed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_codes_one_live_per_student
  ON public.student_access_codes(student_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.student_access_codes ENABLE ROW LEVEL SECURITY;

-- DELIBERATELY NO POLICIES.
-- RLS with zero policies denies every client, including admins. Access is
-- exclusively through manage-student-access / redeem-access-code, which run
-- on the service role and enforce their own admin checks. There is no
-- legitimate reason for a browser to read this table directly, and the
-- rows are the recovery mechanism for children's accounts.

COMMENT ON TABLE public.student_access_codes IS
  'One-time front-desk account recovery codes. RLS denies all client access '
  'by design; reachable only through the manage-student-access and '
  'redeem-access-code edge functions. code_hash is SHA-256 — the plaintext '
  'code is shown once at issue time and is not recoverable.';

-- ── Marker for synthetic logins ────────────────────────────────────────
-- Accounts created by this flow use a made-up address (e.g. hanh@hanh.com)
-- because the family has no mailbox. Those domains are NOT owned by the
-- school, so a password-reset mail must never be sent to one. Recording
-- which students hold a synthetic login lets the sign-in page refuse
-- "forgot password" for them and point at the school instead.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS has_synthetic_login BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.has_synthetic_login IS
  'True when linked_user_id has a school-generated address with no real '
  'mailbox behind it. Password reset by email is impossible for these '
  'accounts — recovery is by admin-issued access code only.';
