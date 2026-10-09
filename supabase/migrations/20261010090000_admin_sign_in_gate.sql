-- The admin sign-in gate: passkeys, with a passcode as the fallback.
--
-- What this is for. Each admin now has their own login, so the audit trail
-- already says who did what. The remaining hole is physical: a signed-in
-- browser left open at the front desk is an open admin console for whoever
-- walks past. The gate closes that - once per browser session, prove you
-- are still the person, with Face ID / Touch ID / Windows Hello, or a
-- passcode on a device that cannot do it.
--
-- What it is not. Admin screens write to PostgREST directly, so a gate
-- drawn in React is a gate on the user interface, not on the database: the
-- password holder could always call the API without it. That is the right
-- trade for an opportunistic-bystander threat, and it is why the gate is
-- ALSO enforced server-side on the destructive edge functions, where it is
-- a real boundary rather than a drawn one.
--
-- Every table here is service-role only. RLS is on with no policies at all
-- and the grants are revoked, so PostgREST will not serve these rows to a
-- signed-in user under any circumstances. The hashes in particular must
-- never be reachable from a browser, and the surest way to guarantee that
-- is for there to be no path.

-- --------------------------------------------------------------- passkeys

CREATE TABLE IF NOT EXISTS public.admin_passkeys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- base64url, as the browser reports it.
  credential_id    text NOT NULL UNIQUE,
  -- SPKI from the browser's own getPublicKey(). See _lib/webauthn.ts for
  -- why accepting it from the client is sound here.
  public_key_spki  text NOT NULL,
  public_key_alg   integer NOT NULL,
  sign_count       integer NOT NULL DEFAULT 0,
  -- "Lan's iPhone", so revoking the right one is possible later.
  device_label     text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_used_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_passkeys_user ON public.admin_passkeys (user_id);

COMMENT ON TABLE public.admin_passkeys IS
  'WebAuthn credentials for the admin sign-in gate. One row per person per device. Service-role only.';

-- -------------------------------------------------------------- passcodes

CREATE TABLE IF NOT EXISTS public.admin_passcodes (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- pbkdf2$sha256$<iterations>$<salt>$<hash>, all base64url.
  passcode_hash   text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_passcodes IS
  'Fallback passcode for devices with no biometric. Hashed with PBKDF2-SHA256; the plaintext never reaches the database or the log. Service-role only.';

-- ------------------------------------------------------------- challenges
-- Server-issued, single-use, short-lived. A challenge the client chose, or
-- one that can be used twice, is the difference between a passkey and a
-- replayable token.

CREATE TABLE IF NOT EXISTS public.admin_auth_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge   text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('register', 'authenticate')),
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_challenges_lookup
  ON public.admin_auth_challenges (user_id, purpose, expires_at DESC);

-- ---------------------------------------------------------------- unlocks
-- Proof that this browser session passed the gate. The client holds the
-- raw token in sessionStorage - so closing the tab ends it, which is what
-- "once per browser session" should mean - and the server stores only its
-- hash, so a leaked database row cannot be replayed as a session.

CREATE TABLE IF NOT EXISTS public.admin_unlock_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  method     text NOT NULL CHECK (method IN ('passkey', 'passcode')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  client_ip  text
);

CREATE INDEX IF NOT EXISTS idx_admin_unlock_lookup
  ON public.admin_unlock_sessions (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_unlock_user
  ON public.admin_unlock_sessions (user_id, created_at DESC);

COMMENT ON TABLE public.admin_unlock_sessions IS
  'One row per browser session that passed the gate. Only the SHA-256 of the token is stored. Service-role only.';

-- ------------------------------------------------------- nobody but us
-- RLS on with no policies means authenticated and anon match no rows at
-- all. The revokes make that explicit rather than implicit, so a future
-- policy added by accident still cannot expose a hash.

ALTER TABLE public.admin_passkeys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_passcodes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_auth_challenges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_unlock_sessions   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_passkeys        FROM anon, authenticated;
REVOKE ALL ON public.admin_passcodes       FROM anon, authenticated;
REVOKE ALL ON public.admin_auth_challenges FROM anon, authenticated;
REVOKE ALL ON public.admin_unlock_sessions FROM anon, authenticated;

GRANT ALL ON public.admin_passkeys        TO service_role;
GRANT ALL ON public.admin_passcodes       TO service_role;
GRANT ALL ON public.admin_auth_challenges TO service_role;
GRANT ALL ON public.admin_unlock_sessions TO service_role;

-- ----------------------------------------------------------- housekeeping
-- Spent challenges and dead unlock sessions are not history worth keeping;
-- the audit log records the sign-in itself. Called by the edge function on
-- each issue, so there is nothing to schedule.

CREATE OR REPLACE FUNCTION public.prune_admin_auth_state()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH dead_challenges AS (
    DELETE FROM public.admin_auth_challenges
    WHERE expires_at < now() - INTERVAL '1 hour'
    RETURNING 1
  )
  DELETE FROM public.admin_unlock_sessions
  WHERE expires_at < now() - INTERVAL '7 days';
$function$;

REVOKE EXECUTE ON FUNCTION public.prune_admin_auth_state() FROM anon, authenticated, PUBLIC;
