# T2 live apply (aswgmbefikhsnhogtryv)

Where I am / next step: step 1 done; next step 2 apply migration.

## Step 0 - read
Read T2-live-apply-brief.md, T2-class-recordings-access.md, T2-review.md, T2b-transcribe-gate.md from 7f8004e (detached HEAD).

## Step 1 - pre-checks (read-only)
- P4 mismatched first segment: 0. Not exactly two segments (`audio_storage_path !~ '^[^/\\]+/[^/\\]+$'`, copied from the migration): 0.
- Old policy "staff_manage_class_recordings": exists (1). The five new policies: 0. Helper `class_recordings_staff_can`: absent. Constraint `class_transcripts_audio_path_in_class`: absent.
- P0: live `is_teacher_of_class` standing_tas = true, seven_day_window = true (the 20261111110000 version).
- Counts: objects in `class-recordings` = 11; `class_transcripts` rows with audio = 11.
- All as expected.
