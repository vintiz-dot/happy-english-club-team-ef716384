CREATE TABLE IF NOT EXISTS public.admin_passkeys (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id    text NOT NULL UNIQUE,
  public_key_spki  text NOT NULL,
  public_key_alg   integer NOT NULL,
  sign_count       integer NOT NULL DEFAULT 0,
  device_label     text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_used_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_admin_passkeys_user ON public.admin_passkeys (user_id);
COMMENT ON TABLE public.admin_passkeys IS
  'WebAuthn credentials for the admin sign-in gate. One row per person per device. Service-role only.';

CREATE TABLE IF NOT EXISTS public.admin_passcodes (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  passcode_hash   text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.admin_passcodes IS
  'Fallback passcode for devices with no biometric. Hashed with PBKDF2-SHA256; the plaintext never reaches the database or the log. Service-role only.';

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