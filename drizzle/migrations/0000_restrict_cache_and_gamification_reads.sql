DROP POLICY IF EXISTS "vocab_cache_read_all" ON public.vocab_cache;
DROP POLICY IF EXISTS "vocab_image_cache_read_all" ON public.vocab_image_cache;

REVOKE SELECT ON public.vocab_cache FROM anon, authenticated;
REVOKE SELECT ON public.vocab_image_cache FROM anon, authenticated;

COMMENT ON TABLE public.vocab_cache IS
  'Server-side cache of word enrichment payloads. Service role only — read and written exclusively by the word-enrichment and save-word edge functions. Deliberately has no SELECT policy: the row set is a log of what children have looked up.';

COMMENT ON TABLE public.vocab_image_cache IS
  'Server-side cache of image-provider results, keyed by normalized query. Service role only — read and written exclusively by the image-search edge function. Deliberately has no SELECT policy.';

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