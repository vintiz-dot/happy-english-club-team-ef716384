-- Close two read holes: the vocabulary caches and the gamification settings.
--
-- Both were written with a permissive SELECT because the data "isn't
-- sensitive". That reasoning is wrong in a school app for the same reason
-- twice: a table anyone can SELECT is a table anyone can ENUMERATE, and the
-- rows carry more than the thing they were created to serve.
--
-- ────────────────────────────────────────────────────────────────────────
-- 1. vocab_cache / vocab_image_cache — readable by any signed-in user
-- ────────────────────────────────────────────────────────────────────────
--
-- These are server-side caches. The migration that created them said so:
-- "only the service role writes (edge functions)". What it missed is that
-- only the service role READS them too. Every reader is an edge function
-- holding SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely:
--
--   word-enrichment  — checks vocab_cache before paying OpenAI
--   save-word        — refreshes vocab_cache after a save
--   image-search     — reads/writes vocab_image_cache before fanning out
--                      to the image providers
--
-- Nothing in src/ touches either table. So the authenticated SELECT policy
-- granted a capability no feature ever used, and what it exposed was the
-- school's entire lookup history: every word any child has ever searched,
-- enumerable in one request by any signed-in account, including a student's.
-- That is a behavioural record of children, assembled from a cache.
--
-- Dropping the policy leaves RLS enabled with no SELECT policy, which denies
-- every role except service_role. No feature changes.
--
-- IF A CLIENT SURFACE EVER NEEDS THIS: do not restore `USING (true)`. Route
-- it through an edge function that returns the one word asked for, the way
-- word-enrichment already does. The cache is keyed by word, so a direct
-- client read is always either a single row it could have fetched anyway or
-- a scrape.

DROP POLICY IF EXISTS "vocab_cache_read_all" ON public.vocab_cache;
DROP POLICY IF EXISTS "vocab_image_cache_read_all" ON public.vocab_image_cache;

-- Belt and braces: RLS is the gate, but there is no reason for the grant to
-- exist either. Mirrors the column revokes in 20260711235255.
REVOKE SELECT ON public.vocab_cache FROM anon, authenticated;
REVOKE SELECT ON public.vocab_image_cache FROM anon, authenticated;

COMMENT ON TABLE public.vocab_cache IS
  'Server-side cache of word enrichment payloads. Service role only — read and written exclusively by the word-enrichment and save-word edge functions. Deliberately has no SELECT policy: the row set is a log of what children have looked up.';

COMMENT ON TABLE public.vocab_image_cache IS
  'Server-side cache of image-provider results, keyed by normalized query. Service role only — read and written exclusively by the image-search edge function. Deliberately has no SELECT policy.';

-- ────────────────────────────────────────────────────────────────────────
-- 2. xp_settings / custom_quests — readable by ANYONE, signed in or not
-- ────────────────────────────────────────────────────────────────────────
--
-- `FOR SELECT USING (true)` with no TO clause applies to `anon`, so both
-- tables were served to unauthenticated requests. Anyone who knows the
-- project URL — it ships in the client bundle — could read them.
--
-- The stated reason was "students need to see XP values". That is a fair
-- reason to let students read them. It is not a reason to let the open
-- internet read them, and in any case no student surface reads these tables
-- today: the only consumer in the codebase is XPSettingsManager, which is
-- mounted solely inside the admin Automation tab.
--
-- custom_quests also carries `created_by`, a real auth.users id, so the
-- anon grant leaked staff user ids alongside the quest list.
--
-- Scoped to `authenticated` rather than to admins, because the original
-- intent is sound and a student-facing quest list is a plausible next
-- feature. Signing in is the bar that was missing.

DROP POLICY IF EXISTS "XP settings are publicly readable" ON public.xp_settings;
CREATE POLICY "Signed-in users can read xp_settings"
  ON public.xp_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Custom quests are publicly readable" ON public.custom_quests;
CREATE POLICY "Signed-in users can read custom_quests"
  ON public.custom_quests FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.xp_settings FROM anon;
REVOKE SELECT ON public.custom_quests FROM anon;

-- The admin write policies (20260312152157) are FOR ALL with only USING, so
-- Postgres reuses USING as the WITH CHECK. Restated here with both halves
-- explicit so the next reader does not have to know that rule, and scoped
-- TO authenticated so anon is not even evaluated.
DROP POLICY IF EXISTS "Only admins can modify xp_settings" ON public.xp_settings;
CREATE POLICY "Only admins can modify xp_settings"
  ON public.xp_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can modify custom_quests" ON public.custom_quests;
CREATE POLICY "Only admins can modify custom_quests"
  ON public.custom_quests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
