GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_vocabulary_entries TO authenticated;
GRANT ALL ON public.student_vocabulary_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocab_activity_log TO authenticated;
GRANT ALL ON public.vocab_activity_log TO service_role;