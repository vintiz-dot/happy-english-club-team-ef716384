-- "Was this class held?" - the one answer, read-only.
--
-- Design: docs/evidence/D1-evidence-model.md (sections 1-4). Build notes
-- and deviations: docs/evidence/D1-build.md.
--
-- WHAT THIS ADDS. Two functions and nothing else. No table, no policy,
-- no trigger, no change to any row:
--
--   session_held_evidence(p_session_id)        the evidence for one lesson:
--                                              a level (NONE / SOFT / STRONG),
--                                              the families behind it, whether
--                                              money has already settled on it,
--                                              the items an admin is shown and
--                                              a snapshot_hash of all of it.
--   session_recording_evidence(p_session_id)   the extension point for the
--                                              lesson recorder (workstream C).
--                                              Ships returning '[]'.
--
-- WHO CALLS IT. D2's cancel guard, the edge functions that cancel and the
-- cancel dialog all call THIS function. Nothing restates the rules - not
-- in TypeScript, not in a view. A new evidence source is a new item here,
-- with a case in scripts/pgtest/session-evidence.test.mjs.
--
-- READ BEFORE THE CANCEL. Cancelling a lesson rewrites every mark on it
-- to Excused (20261027090000, AFTER UPDATE trigger). After that the
-- strongest evidence is gone. Callers read this first, under the session
-- row lock, then cancel.
--
-- READ-ONLY. Both functions are STABLE, so Postgres refuses a write
-- statement written in their own bodies. That alone is NOT enough:
-- Postgres checks volatility per function, not down the call chain, so a
-- STABLE function may call a VOLATILE one that writes (D-review-1 A-2).
-- Two things make the claim true for the one call this function makes
-- out of itself, the recorder helper:
--   * the helper must be STABLE or IMMUTABLE, checked at every call;
--     a VOLATILE replacement makes this function raise 55000 (closed and
--     loud: every cancel then stops until the helper is fixed);
--   * the helper runs inside a sub-transaction that is always rolled
--     back, so any row it, or anything it calls, writes is undone before
--     this function goes on. Only its returned value is kept.
-- Not undone by a rollback: sequence advances and session-level advisory
-- locks. Neither is a row.
-- SECURITY DEFINER so the answer is the same whoever asks; the caller
-- check is inside.
--
-- WHO IS "INTERNAL" (sees the money flags). Decided positively, never
-- from absent claims (D-review-1 A-3): no auth.uid() AND either the JWT
-- role is service_role, or there is no JWT role at all AND the session
-- is not acting as an API role (neither the session user nor the SET
-- ROLE is authenticator / authenticated / anon). The SQL editor and cron
-- qualify; a connection running as authenticated without claims does not.
--
-- THE HASH IS FOR ADMINS AND INTERNAL CALLERS ONLY. It covers the money
-- flags, which the class teacher may not learn; every other input of it
-- is something the teacher already holds, so returning it would let a
-- teacher guess each child's paid / confirmed / frozen state
-- (D-review-1 A-1). The teacher's view carries snapshot_hash = NULL.
--
-- Safe to paste twice: CREATE OR REPLACE throughout, and the recorder
-- helper is created only when it does not exist yet, so a re-paste of
-- this file can never undo workstream C's replacement of it.

BEGIN;

-- ---------------------------------------------------------------- 0
-- Refuse to install against a schema this does not fit. plpgsql resolves
-- columns at the first call, not at CREATE, so without this a missing
-- column would surface at somebody's first cancellation instead of here.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'session_status' AND e.enumlabel = 'Canceled'
  ) THEN
    v_missing := v_missing || 'enum label session_status.Canceled'::text;
  END IF;

  FOR r IN SELECT unnest(ARRAY[
    'public.has_role(uuid, public.app_role)',
    'public.is_teacher_of_class(uuid, uuid)',
    'public.payroll_month_is_locked(text)',
    'auth.uid()',
    'auth.role()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;

  -- Every column the function reads, table by table.
  FOR r IN
    SELECT * FROM (VALUES
      ('sessions',                    ARRAY['id','class_id','date','start_time','end_time','status','teacher_id']),
      ('attendance',                  ARRAY['session_id','student_id','status','marked_at','marked_by']),
      ('stars_sync_attendance_state', ARRAY['session_id','student_id','status']),
      ('stars_sync_held_flips',       ARRAY['session_id','flipped_at']),
      ('point_transactions',          ARRAY['id','student_id','class_id','session_id','points','type','date','notes','created_by','created_at']),
      ('class_transcripts',           ARRAY['id','class_id','session_id','uploaded_by','transcript_date','status','audio_storage_path','audio_duration_seconds','created_at']),
      ('homeworks',                   ARRAY['id','class_id','due_date','created_by','created_at']),
      ('stars_homework_map',          ARRAY['homework_id']),
      ('homework_submissions',        ARRAY['id','homework_id','student_id','graded_at']),
      ('stars_sync_grade_state',      ARRAY['homework_id','student_id']),
      ('payroll_periods',             ARRAY['month','status','locked_at','locked_by']),
      ('payroll_lines',               ARRAY['id','month','teacher_id','assistant_id']),
      ('session_participants',        ARRAY['session_id','participant_type','teaching_assistant_id','attended']),
      ('invoices',                    ARRAY['student_id','month','status','recorded_payment','confirmation_status','confirmed_at','tuition_frozen','carry_in_credit'])
    ) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      v_missing := v_missing || ('table public.' || r.tbl);
    ELSE
      v_missing := v_missing || ARRAY(
        SELECT 'column public.' || r.tbl || '.' || c
        FROM unnest(r.cols) AS c
        WHERE NOT EXISTS (
          SELECT 1 FROM information_schema.columns ic
          WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = c
        )
      );
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'session_held_evidence cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the migrations that create these first. Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- The recorder's extension point.
--
-- CONTRACT for whoever replaces it (workstream C): CREATE OR REPLACE this
-- function and nothing else. It MUST stay STABLE (or IMMUTABLE):
-- session_held_evidence refuses to run (55000) while it is VOLATILE, and
-- rolls back anything it writes. Row keys may contain any character
-- (they are fingerprinted as a sorted JSON array). Return a jsonb ARRAY, one element per
-- COMPLETED recording of the session:
--
--   { "count": 1, "detail": {...}, "at": "<timestamptz>",
--     "actor_id": "<uuid>", "row_keys": ["<recording id>:<status>", ...] }
--
-- session_held_evidence treats each element as a recording_completed item
-- (family D, STRONG). It overwrites type, strength, family and label_key;
-- drops any element without a non-empty row_keys array; and treats NULL
-- or a non-array as no recordings. row_keys go into the snapshot hash.
--
-- Created only if missing: CREATE OR REPLACE here would quietly put the
-- empty body back over C's on a re-paste of this file, and recordings
-- would stop counting - a false NONE, the unsafe direction.

DO $rec$
BEGIN
  IF to_regprocedure('public.session_recording_evidence(uuid)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.session_recording_evidence(p_session_id uuid)
      RETURNS jsonb
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$ SELECT '[]'::jsonb $body$
    $fn$;
  END IF;
END $rec$;

COMMENT ON FUNCTION public.session_recording_evidence(uuid) IS
  'Extension point: completed recordings of a session, as evidence items for session_held_evidence. Replace with CREATE OR REPLACE only; contract in 20261112090000.';

-- ---------------------------------------------------------------- 2
-- The evidence.

CREATE OR REPLACE FUNCTION public.session_held_evidence(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  -- Session wall-clock is Hanoi time. Same offset as the Asia/Bangkok the
  -- rest of the database uses (UTC+7, no DST).
  c_tz constant text := 'Asia/Ho_Chi_Minh';

  s record;
  v_found boolean;
  v_uid uuid;
  v_role text;
  v_internal boolean;
  v_admin boolean;
  v_teacher boolean;

  v_month text;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_start timestamptz;
  v_end timestamptz;

  v_items jsonb := '[]'::jsonb;      -- output order, items 1..12
  v_hitems jsonb := '[]'::jsonb;     -- [type, count, fp] for the hash
  f_d boolean := false;
  f_r boolean := false;
  f_p boolean := false;
  f_t boolean := false;
  f_h boolean := false;
  v_level text;
  v_rpt int;

  v_cnt int;
  v_fp text;
  v_at timestamptz;
  v_actor uuid;
  v_detail jsonb;
  v_rec jsonb;

  v_locked boolean;
  v_locked_at timestamptz;
  v_locked_by uuid;
  v_paid_as_held boolean := false;
  v_affected int;
  v_settled_students int;
  v_tuition boolean;

  v_hash text;
  v_out jsonb;
  v_rec_vol "char";
  v_rec_ok boolean := false;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'session_held_evidence: a session id is required' USING ERRCODE = '22004';
  END IF;

  v_uid  := auth.uid();
  v_role := NULLIF(auth.role(), '');

  SELECT ss.id, ss.class_id, ss.date, ss.start_time, ss.end_time, ss.status, ss.teacher_id
    INTO s
    FROM public.sessions ss
   WHERE ss.id = p_session_id;   -- plain read, no lock: this is STABLE
  v_found := FOUND;

  -- Service-role edge function, a trigger fired by one, the SQL editor, cron.
  -- Positive test (header, WHO IS "INTERNAL"): a missing claim never
  -- grants the internal view to a session acting as an API role.
  v_internal := v_uid IS NULL
                AND (v_role = 'service_role'
                     OR (v_role IS NULL
                         AND session_user::text NOT IN ('authenticator', 'authenticated', 'anon')
                         AND COALESCE(NULLIF(current_setting('role', true), ''), 'none')
                               NOT IN ('authenticator', 'authenticated', 'anon')));
  v_admin    := v_uid IS NOT NULL AND public.has_role(v_uid, 'admin'::public.app_role);
  v_teacher  := v_found AND v_uid IS NOT NULL AND public.is_teacher_of_class(v_uid, s.class_id);

  -- Before the not-found check: a caller who may not ask gets the same
  -- answer for a real lesson and an invented id.
  IF NOT (v_internal OR v_admin OR v_teacher) THEN
    RAISE EXCEPTION 'session_held_evidence: not allowed' USING ERRCODE = '42501';
  END IF;
  -- Never an empty answer: "no JSON" must not read as "no evidence".
  IF NOT v_found THEN
    RAISE EXCEPTION 'session_held_evidence: lesson not found' USING ERRCODE = 'P0002';
  END IF;

  v_month     := to_char(s.date, 'YYYY-MM');
  v_day_start := (s.date::timestamp AT TIME ZONE c_tz);
  v_day_end   := ((s.date + 1)::timestamp AT TIME ZONE c_tz);
  v_start     := ((s.date + s.start_time) AT TIME ZONE c_tz);
  v_end       := ((s.date + s.end_time) AT TIME ZONE c_tz);
  IF s.end_time <= s.start_time THEN
    v_end := v_end + interval '1 day';
  END IF;

  -- ------------------------------------------------ 1 attendance_present
  -- A person (teacher, admin, or a teacher's Pixel Pal register) marked a
  -- child Present or Late. marked_by IS NULL = seed, auto-mark, repair.
  SELECT count(*)::int,
         md5(string_agg(a.student_id::text || ':' || a.status || ':' || a.marked_by::text, ','
                        ORDER BY (a.student_id::text || ':' || a.status || ':' || a.marked_by::text) COLLATE "C")),
         max(a.marked_at),
         jsonb_build_object(
           'present',   count(*) FILTER (WHERE a.status = 'Present'),
           'late',      count(*) FILTER (WHERE a.status = 'Late'),
           'pixel_pal', count(*) FILTER (WHERE st.session_id IS NOT NULL),
           'hec',       count(*) FILTER (WHERE st.session_id IS NULL),
           'markers',   count(DISTINCT a.marked_by))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.attendance a
    LEFT JOIN public.stars_sync_attendance_state st
           ON st.session_id = a.session_id AND st.student_id = a.student_id AND st.status = a.status
   WHERE a.session_id = p_session_id
     AND a.marked_by IS NOT NULL
     AND a.status IN ('Present', 'Late');
  IF v_cnt > 0 THEN
    SELECT a.marked_by INTO v_actor
      FROM public.attendance a
     WHERE a.session_id = p_session_id AND a.marked_by IS NOT NULL AND a.status IN ('Present', 'Late')
     ORDER BY a.marked_at DESC NULLS LAST, a.student_id
     LIMIT 1;
    f_d := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'attendance_present', 'family', 'D', 'strength', 'strong',
      'label_key', 'evidence.attendance_present', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('attendance_present', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 2 recording_completed
  -- STABLE or IMMUTABLE, or nothing (header, READ-ONLY).
  SELECT p.provolatile INTO v_rec_vol
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.session_recording_evidence(uuid)'::regprocedure;
  IF v_rec_vol IS DISTINCT FROM 's' AND v_rec_vol IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'session_held_evidence: session_recording_evidence must be STABLE (found %)', v_rec_vol
      USING ERRCODE = '55000', HINT = 'Re-create the recorder helper as STABLE; no evidence can be read until then.';
  END IF;
  -- Run it in a sub-transaction that is always rolled back: whatever it
  -- writes is undone, its returned value (a plpgsql variable, which a
  -- rollback does not touch) is kept. Its own errors propagate.
  BEGIN
    v_rec := public.session_recording_evidence(p_session_id);
    v_rec_ok := true;
    RAISE EXCEPTION USING ERRCODE = 'HC0RO', MESSAGE = 'session_held_evidence: discard helper writes';
  EXCEPTION WHEN SQLSTATE 'HC0RO' THEN
    NULL;
  END;
  IF NOT v_rec_ok THEN
    RAISE EXCEPTION 'session_held_evidence: the recorder helper did not return' USING ERRCODE = '55000';
  END IF;
  IF v_rec IS NULL OR jsonb_typeof(v_rec) IS DISTINCT FROM 'array' THEN
    v_rec := '[]'::jsonb;
  END IF;
  WITH el AS (
    SELECT e
      FROM jsonb_array_elements(v_rec) AS e
     WHERE jsonb_typeof(e) = 'object'
       AND jsonb_typeof(e -> 'row_keys') = 'array'
       AND jsonb_array_length(e -> 'row_keys') > 0
  ), keys AS (
    SELECT k #>> '{}' AS key FROM el, jsonb_array_elements(el.e -> 'row_keys') AS k
  )
  SELECT
    (SELECT COALESCE(sum(
              -- A kept recording counts at least once, whatever it says.
              GREATEST(1, COALESCE(CASE WHEN jsonb_typeof(e -> 'count') = 'number'
                                        THEN floor((e ->> 'count')::numeric)::int END, 1))), 0)::int
       FROM el),
    -- A sorted JSON array, not a joined string: ["a","b"] and ["a,b"]
    -- must differ (D-review-1 A-6).
    (SELECT md5(jsonb_agg(to_jsonb(COALESCE(key, '')) ORDER BY COALESCE(key, '') COLLATE "C")::text) FROM keys),
    (SELECT max((e ->> 'at')::timestamptz) FROM el),
    (SELECT (e ->> 'actor_id')::uuid FROM el
      ORDER BY (e ->> 'at')::timestamptz DESC NULLS LAST, (e -> 'row_keys')::text COLLATE "C" LIMIT 1),
    (SELECT jsonb_build_object('recordings',
              COALESCE(jsonb_agg(COALESCE(e -> 'detail', 'null'::jsonb) ORDER BY (e -> 'row_keys')::text COLLATE "C"), '[]'::jsonb))
       FROM el)
    INTO v_cnt, v_fp, v_at, v_actor, v_detail;
  IF v_cnt > 0 THEN
    f_d := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'recording_completed', 'family', 'D', 'strength', 'strong',
      'label_key', 'evidence.recording_completed', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('recording_completed', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 3 transcript_linked
  -- A failed paste proves nothing; a failed AUDIO row still has the file.
  SELECT count(*)::int,
         md5(string_agg(ct.id::text || ':' || ct.status, ',' ORDER BY (ct.id::text || ':' || ct.status) COLLATE "C")),
         max(ct.created_at),
         jsonb_build_object(
           'audio',         count(*) FILTER (WHERE ct.audio_storage_path IS NOT NULL),
           'analyzed',      count(*) FILTER (WHERE ct.status = 'analyzed'),
           'audio_seconds', COALESCE(round(sum(ct.audio_duration_seconds)::numeric), 0))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.class_transcripts ct
   WHERE ct.class_id = s.class_id
     AND ct.session_id = p_session_id
     AND (ct.status <> 'failed' OR ct.audio_storage_path IS NOT NULL);
  IF v_cnt > 0 THEN
    SELECT ct.uploaded_by INTO v_actor
      FROM public.class_transcripts ct
     WHERE ct.class_id = s.class_id AND ct.session_id = p_session_id
       AND (ct.status <> 'failed' OR ct.audio_storage_path IS NOT NULL)
     ORDER BY ct.created_at DESC, ct.id LIMIT 1;
    f_d := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'transcript_linked', 'family', 'D', 'strength', 'strong',
      'label_key', 'evidence.transcript_linked', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('transcript_linked', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 4 attendance_register_only
  -- A person took the register and nobody was there. Only when item 1 is
  -- absent. A person's Excused is not evidence.
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_items) i WHERE i ->> 'type' = 'attendance_present') THEN
    SELECT count(*)::int,
           md5(string_agg(a.student_id::text || ':' || a.status || ':' || a.marked_by::text, ','
                          ORDER BY (a.student_id::text || ':' || a.status || ':' || a.marked_by::text) COLLATE "C")),
           max(a.marked_at),
           jsonb_build_object(
             'absent',    count(*),
             'pixel_pal', count(*) FILTER (WHERE st.session_id IS NOT NULL),
             'hec',       count(*) FILTER (WHERE st.session_id IS NULL),
             'markers',   count(DISTINCT a.marked_by))
      INTO v_cnt, v_fp, v_at, v_detail
      FROM public.attendance a
      LEFT JOIN public.stars_sync_attendance_state st
             ON st.session_id = a.session_id AND st.student_id = a.student_id AND st.status = a.status
     WHERE a.session_id = p_session_id
       AND a.marked_by IS NOT NULL
       AND a.status = 'Absent';
    IF v_cnt > 0 THEN
      SELECT a.marked_by INTO v_actor
        FROM public.attendance a
       WHERE a.session_id = p_session_id AND a.marked_by IS NOT NULL AND a.status = 'Absent'
       ORDER BY a.marked_at DESC NULLS LAST, a.student_id LIMIT 1;
      f_r := true;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'type', 'attendance_register_only', 'family', 'R', 'strength', 'soft',
        'label_key', 'evidence.attendance_register_only', 'count', v_cnt, 'detail', v_detail,
        'at', v_at, 'actor_id', v_actor));
      v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('attendance_register_only', v_cnt, v_fp));
    END IF;
  END IF;

  -- ------------------------------------------------ 5 status_held
  IF s.status = 'Held' THEN
    SELECT f.flipped_at INTO v_at FROM public.stars_sync_held_flips f WHERE f.session_id = p_session_id;
    f_r := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'status_held', 'family', 'R', 'strength', 'soft',
      'label_key', 'evidence.status_held', 'count', 1,
      'detail', jsonb_build_object('flipped_by_stars_sync', FOUND),
      'at', v_at, 'actor_id', NULL));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('status_held', 1, md5('Held')));
  END IF;

  -- ------------------------------------------------ month lock (items 6, 11)
  -- Reuses the one definition of a locked month.
  v_locked := public.payroll_month_is_locked(v_month);
  IF v_locked THEN
    SELECT pp.locked_at, pp.locked_by INTO v_locked_at, v_locked_by
      FROM public.payroll_periods pp WHERE pp.month = v_month;
  END IF;

  -- ------------------------------------------------ 6 payroll_paid_as_held
  -- Per month, not per lesson: payroll_lines has no session id. Wording
  -- help for the admin, never more than SOFT, never arithmetic.
  IF v_locked AND s.status = 'Held' THEN
    SELECT count(*)::int,
           md5(v_month || ',' || string_agg(pl.id::text, ',' ORDER BY pl.id::text COLLATE "C"))
      INTO v_cnt, v_fp
      FROM public.payroll_lines pl
     WHERE pl.month = v_month
       AND (pl.teacher_id = s.teacher_id
            OR pl.assistant_id IN (
                 SELECT sp.teaching_assistant_id FROM public.session_participants sp
                  WHERE sp.session_id = p_session_id
                    AND sp.participant_type = 'teaching_assistant'
                    AND sp.attended
                    AND sp.teaching_assistant_id IS NOT NULL));
    IF v_cnt > 0 THEN
      v_paid_as_held := true;
      f_r := true;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'type', 'payroll_paid_as_held', 'family', 'R', 'strength', 'soft',
        'label_key', 'evidence.payroll_paid_as_held', 'count', 1,
        'detail', jsonb_build_object('month', v_month, 'lines', v_cnt),
        'at', v_locked_at, 'actor_id', v_locked_by));
      v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('payroll_paid_as_held', 1, v_fp));
    END IF;
  END IF;

  -- ------------------------------------------------ 7 points_awarded
  -- Linked to this lesson, or unlinked but awarded by a person. Excludes
  -- the streak bonus and demo rows (no creator, no session), vocabulary
  -- games and homework (wrong type), and negative rows.
  SELECT count(*)::int,
         md5(string_agg(pt.id::text || ':' || pt.points::text, ','
                        ORDER BY (pt.id::text || ':' || pt.points::text) COLLATE "C")),
         max(pt.created_at),
         jsonb_build_object(
           'students',          count(DISTINCT pt.student_id),
           'total_points',      COALESCE(sum(pt.points), 0),
           'linked_to_session', count(*) FILTER (WHERE pt.session_id = p_session_id),
           'pixel_pal',         count(*) FILTER (WHERE pt.notes LIKE '[Pixel Pal]%'),
           'in_lesson_window',  count(*) FILTER (WHERE pt.created_at >= v_start - interval '15 minutes'
                                                  AND pt.created_at <= v_end + interval '30 minutes'))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.point_transactions pt
   WHERE pt.class_id = s.class_id
     AND pt.date = s.date
     AND pt.type IN ('participation', 'correction')
     AND pt.points > 0
     AND (pt.session_id = p_session_id OR (pt.session_id IS NULL AND pt.created_by IS NOT NULL));
  IF v_cnt > 0 THEN
    SELECT pt.created_by INTO v_actor
      FROM public.point_transactions pt
     WHERE pt.class_id = s.class_id AND pt.date = s.date
       AND pt.type IN ('participation', 'correction') AND pt.points > 0
       AND (pt.session_id = p_session_id OR (pt.session_id IS NULL AND pt.created_by IS NOT NULL))
     ORDER BY pt.created_at DESC, pt.id LIMIT 1;
    f_p := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'points_awarded', 'family', 'P', 'strength', 'soft',
      'label_key', 'evidence.points_awarded', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('points_awarded', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 8 transcript_same_day
  -- Unlinked, this class, uploaded that day. transcript_date is the
  -- server's date at upload, so the Hanoi day of created_at counts too.
  SELECT count(*)::int,
         md5(string_agg(ct.id::text || ':' || ct.status, ',' ORDER BY (ct.id::text || ':' || ct.status) COLLATE "C")),
         max(ct.created_at),
         jsonb_build_object(
           'audio',         count(*) FILTER (WHERE ct.audio_storage_path IS NOT NULL),
           'analyzed',      count(*) FILTER (WHERE ct.status = 'analyzed'),
           'audio_seconds', COALESCE(round(sum(ct.audio_duration_seconds)::numeric), 0))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.class_transcripts ct
   WHERE ct.class_id = s.class_id
     AND ct.session_id IS NULL
     AND (ct.transcript_date = s.date OR (ct.created_at >= v_day_start AND ct.created_at < v_day_end))
     AND (ct.status <> 'failed' OR ct.audio_storage_path IS NOT NULL);
  IF v_cnt > 0 THEN
    SELECT ct.uploaded_by INTO v_actor
      FROM public.class_transcripts ct
     WHERE ct.class_id = s.class_id AND ct.session_id IS NULL
       AND (ct.transcript_date = s.date OR (ct.created_at >= v_day_start AND ct.created_at < v_day_end))
       AND (ct.status <> 'failed' OR ct.audio_storage_path IS NOT NULL)
     ORDER BY ct.created_at DESC, ct.id LIMIT 1;
    f_t := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'transcript_same_day', 'family', 'T', 'strength', 'soft',
      'label_key', 'evidence.transcript_same_day', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('transcript_same_day', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 9 homework_assigned
  -- Set that day in Hanoi, not by the Pixel Pal sync (whose created_at is
  -- when the sync ran).
  SELECT count(*)::int,
         md5(string_agg(h.id::text, ',' ORDER BY h.id::text COLLATE "C")),
         max(h.created_at),
         jsonb_build_object('with_due_date', count(*) FILTER (WHERE h.due_date IS NOT NULL))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.homeworks h
   WHERE h.class_id = s.class_id
     AND h.created_at >= v_day_start AND h.created_at < v_day_end
     AND NOT EXISTS (SELECT 1 FROM public.stars_homework_map m WHERE m.homework_id = h.id);
  IF v_cnt > 0 THEN
    SELECT h.created_by INTO v_actor
      FROM public.homeworks h
     WHERE h.class_id = s.class_id
       AND h.created_at >= v_day_start AND h.created_at < v_day_end
       AND NOT EXISTS (SELECT 1 FROM public.stars_homework_map m WHERE m.homework_id = h.id)
     ORDER BY h.created_at DESC, h.id LIMIT 1;
    f_h := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'homework_assigned', 'family', 'H', 'strength', 'aux',
      'label_key', 'evidence.homework_assigned', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', v_actor));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('homework_assigned', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 10 homework_graded
  -- No graded_by column, so no actor. Sync-written grades excluded.
  SELECT count(*)::int,
         md5(string_agg(hs.id::text, ',' ORDER BY hs.id::text COLLATE "C")),
         max(hs.graded_at),
         jsonb_build_object('homeworks', count(DISTINCT hs.homework_id))
    INTO v_cnt, v_fp, v_at, v_detail
    FROM public.homework_submissions hs
    JOIN public.homeworks h ON h.id = hs.homework_id
   WHERE h.class_id = s.class_id
     AND hs.graded_at >= v_day_start AND hs.graded_at < v_day_end
     AND NOT EXISTS (SELECT 1 FROM public.stars_sync_grade_state g
                      WHERE g.homework_id = hs.homework_id AND g.student_id = hs.student_id);
  IF v_cnt > 0 THEN
    f_h := true;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'homework_graded', 'family', 'H', 'strength', 'aux',
      'label_key', 'evidence.homework_graded', 'count', v_cnt, 'detail', v_detail,
      'at', v_at, 'actor_id', NULL));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('homework_graded', v_cnt, v_fp));
  END IF;

  -- ------------------------------------------------ 11 payroll_month_locked
  IF v_locked THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'payroll_month_locked', 'family', 'M', 'strength', 'money',
      'label_key', 'evidence.payroll_month_locked', 'count', 1,
      'detail', jsonb_build_object('month', v_month),
      'at', v_locked_at, 'actor_id', v_locked_by));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('payroll_month_locked', 1, md5(v_month)));
  END IF;

  -- ------------------------------------------------ 12 invoice_settled
  -- Affected = the children a cancellation would move: Present / Absent /
  -- Late on this lesson, seeded rows included (a seeded Present is billed).
  -- recorded_payment is the month's own payment; paid_amount is
  -- cumulative across months and deliberately not read.
  SELECT count(*)::int INTO v_affected
    FROM public.attendance a
   WHERE a.session_id = p_session_id AND a.status IN ('Present', 'Absent', 'Late');

  WITH aff AS (
    SELECT i.student_id,
           (COALESCE(i.recorded_payment, 0) > 0 OR i.status::text IN ('paid', 'partial')) AS paid,
           (i.confirmation_status IN ('confirmed', 'adjusted'))                         AS confirmed,
           COALESCE(i.tuition_frozen, false)                                             AS frozen,
           (COALESCE(i.carry_in_credit, 0) > 0)                                          AS credit,
           i.confirmed_at
      FROM public.attendance a
      JOIN public.invoices i ON i.student_id = a.student_id AND i.month = v_month
     WHERE a.session_id = p_session_id AND a.status IN ('Present', 'Absent', 'Late')
  ), st AS (
    SELECT * FROM aff WHERE paid OR COALESCE(confirmed, false) OR frozen
  )
  SELECT (SELECT count(*)::int FROM st),
         (SELECT md5(string_agg(k, ',' ORDER BY k COLLATE "C"))
            FROM (SELECT st.student_id::text || ':' || (paid::int)::text || (COALESCE(confirmed, false)::int)::text
                         || (frozen::int)::text AS k FROM st) q),
         (SELECT max(confirmed_at) FROM st WHERE COALESCE(confirmed, false)),
         jsonb_build_object(
           'month',                v_month,
           'affected_students',    v_affected,
           'paid',                 (SELECT count(*) FROM st WHERE paid),
           'confirmed',            (SELECT count(*) FROM st WHERE COALESCE(confirmed, false)),
           'frozen',               (SELECT count(*) FROM st WHERE frozen),
           'with_carry_in_credit', (SELECT count(*) FROM aff WHERE credit))
    INTO v_settled_students, v_fp, v_at, v_detail;
  v_tuition := v_settled_students > 0;
  IF v_tuition THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'type', 'invoice_settled', 'family', 'M', 'strength', 'money',
      'label_key', 'evidence.invoice_settled', 'count', v_settled_students, 'detail', v_detail,
      'at', v_at, 'actor_id', NULL));
    v_hitems := v_hitems || jsonb_build_array(jsonb_build_array('invoice_settled', v_settled_students, v_fp));
  END IF;

  -- ------------------------------------------------ level
  v_rpt := f_r::int + f_p::int + f_t::int;
  v_level := CASE
    WHEN f_d OR v_rpt >= 2 THEN 'STRONG'
    WHEN v_rpt = 1 OR f_h  THEN 'SOFT'
    ELSE 'NONE'
  END;

  -- ------------------------------------------------ hash
  -- Before redaction, over every item, money included. Returned ONLY to
  -- admins and internal callers (header, THE HASH). Arrays, not objects;
  -- text keys sorted with COLLATE "C";
  -- no timestamps except through the session's own date and times.
  v_hash := encode(sha256(convert_to(jsonb_build_array(
    1,
    jsonb_build_array(s.id, s.class_id, s.date, s.start_time, s.end_time, s.status, s.teacher_id),
    v_level,
    jsonb_build_array(v_locked, v_paid_as_held, v_tuition),
    (SELECT COALESCE(jsonb_agg(e ORDER BY (e ->> 0) COLLATE "C"), '[]'::jsonb)
       FROM jsonb_array_elements(v_hitems) AS e)
  )::text, 'UTF8')), 'hex');

  v_out := jsonb_build_object(
    'version', 1,
    'session', jsonb_build_object(
      'id', s.id, 'class_id', s.class_id, 'date', to_char(s.date, 'YYYY-MM-DD'),
      'start_time', s.start_time, 'end_time', s.end_time, 'status', s.status,
      'teacher_id', s.teacher_id),
    'level', v_level,
    'families', jsonb_build_object('D', f_d, 'R', f_r, 'P', f_p, 'T', f_t, 'H', f_h),
    'snapshot_hash', v_hash,
    'computed_at', now());

  IF v_admin OR v_internal THEN
    v_out := v_out || jsonb_build_object(
      'settled', jsonb_build_object(
        'any',                  v_locked OR v_tuition,
        'month',                v_month,
        'payroll_month_locked', v_locked,
        'payroll_paid_as_held', v_paid_as_held,
        'tuition',              v_tuition,
        'tuition_students',     v_settled_students,
        'affected_students',    v_affected),
      'items', v_items,
      'viewer', CASE WHEN v_admin THEN 'admin' ELSE 'internal' END,
      'redacted', false);
  ELSE
    -- The class's teacher: no money. Item 6 stays (no amount, and staff
    -- can already read whether a month is closed).
    -- The full hash would let the teacher guess the money flags (A-1):
    -- every other input of it is in this JSON or in their register.
    v_out := v_out || jsonb_build_object(
      'snapshot_hash', NULL,
      'settled', NULL,
      'items', (SELECT COALESCE(jsonb_agg(i ORDER BY n), '[]'::jsonb)
                  FROM jsonb_array_elements(v_items) WITH ORDINALITY AS t(i, n)
                 WHERE i ->> 'family' <> 'M'),
      'viewer', 'teacher',
      'redacted', true);
  END IF;

  RETURN v_out;
END
$fn$;

COMMENT ON FUNCTION public.session_held_evidence(uuid) IS
  'Read-only evidence that a lesson was held: level NONE/SOFT/STRONG, families, settled money flags, items and a snapshot_hash. The only place this question is answered. Design: docs/evidence/D1-evidence-model.md.';

-- ---------------------------------------------------------------- 3
-- Grants. The helper is called only by the definer function above.

REVOKE ALL ON FUNCTION public.session_held_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.session_held_evidence(uuid) TO authenticated, service_role;
-- service_role too: on Supabase the default privileges grant it, and
-- nothing but the definer function above should call the helper.
REVOKE ALL ON FUNCTION public.session_recording_evidence(uuid) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'session_held_evidence'
      AND pronamespace = 'public'::regnamespace AND provolatile = 's' AND prosecdef) AS evidence_installed,
  (SELECT count(*) FROM pg_proc WHERE proname = 'session_recording_evidence'
      AND pronamespace = 'public'::regnamespace AND provolatile = 's' AND prosecdef) AS recording_hook_installed;
