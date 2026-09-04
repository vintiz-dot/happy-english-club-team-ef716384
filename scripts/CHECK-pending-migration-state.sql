-- READ-ONLY. Which of the 33 hand-written migrations actually reached the
-- database?
--
-- supabase_migrations.schema_migrations is NOT reliable here: SQL run through
-- the Supabase editor executes without recording a version, and Lovable
-- records its own migrations under regenerated version numbers. We already
-- have proof in both directions -- monthly_finance_snapshots is absent while
-- demo_access is present -- so the only trustworthy test is whether the
-- objects exist.
--
-- Run this and send back the output. "MISSING" rows are genuinely pending.

SELECT
  t.migration,
  t.object,
  CASE WHEN to_regclass('public.' || t.object) IS NULL
       THEN 'MISSING' ELSE 'present' END AS state
FROM (VALUES
  ('20260418100000_add_recurring_expenditures',        'recurring_expenditures'),
  ('20260507120000_add_monthly_finance_snapshots',     'monthly_finance_snapshots'),
  ('20260508120000_add_resource_hub',                  'resources'),
  ('20260508120000_add_resource_hub',                  'resource_class_access'),
  ('20260512140000_add_student_vocabulary_entries',    'student_vocabulary_entries'),
  ('20260512140000_add_student_vocabulary_entries',    'vocab_activity_log'),
  ('20260512170000_vocab_cache_points_and_daily_cap',  'vocab_cache'),
  ('20260512170000_vocab_cache_points_and_daily_cap',  'vocab_image_cache'),
  ('20260521230000_add_teacher_flipbooks',             'teacher_flipbooks'),
  ('20260712090000_data_driven_instruction_pipelines', 'student_work'),
  ('20260712090000_data_driven_instruction_pipelines', 'class_transcripts'),
  ('20260712090000_data_driven_instruction_pipelines', 'transcript_speaker_metrics'),
  ('20260712090000_data_driven_instruction_pipelines', 'student_error_log'),
  ('20260712090000_data_driven_instruction_pipelines', 'srs_cards'),
  ('20260712090000_data_driven_instruction_pipelines', 'srs_reviews'),
  ('20260712090000_data_driven_instruction_pipelines', 'cefr_assessments'),
  ('20260712090000_data_driven_instruction_pipelines', 'student_reports'),
  ('20260715090000_ai_learning_profiles',              'student_learning_profiles'),
  ('20260716090000_transcript_point_suggestions',      'transcript_point_suggestions'),
  ('20260718090000_lesson_overviews',                  'lesson_overviews'),
  ('20260721090000_lesson_context_resources_aliases',  'lesson_resources'),
  ('20260721090000_lesson_context_resources_aliases',  'class_speaker_aliases'),
  ('20260730100000_cefr_level_defense',                'cefr_level_claims'),
  ('20260730100000_cefr_level_defense',                'cefr_defense_tests'),
  ('20260730110000_revoke_demo_privileged_accounts',   'demo_access'),
  ('20260731090000_chat_persistence',                  'chat_conversations'),
  ('20260731090000_chat_persistence',                  'chat_messages'),
  ('20260802090000_student_access_codes',              'student_access_codes')
) AS t(migration, object)
ORDER BY state DESC, t.migration;

-- Column-level checks for migrations that alter rather than create.
SELECT
  c.migration,
  c.tbl || '.' || c.col AS object,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = c.tbl AND column_name = c.col
  ) THEN 'present' ELSE 'MISSING' END AS state
FROM (VALUES
  ('20260418000000_add_celebration_seen', 'homework_submissions', 'celebration_seen'),
  ('20260904090000_student_deactivated_at (mine, expected MISSING)',
                                          'students',             'deactivated_at')
) AS c(migration, tbl, col)
ORDER BY state DESC, c.migration;
