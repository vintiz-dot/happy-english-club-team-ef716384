-- A child who was in the room cannot be marked absent for that lesson.
--
-- WHY. Tuition bills a lesson only when the child has an attendance row
-- (Present, Absent or Late; supabase/functions/_lib/tuition-session.ts). An old
-- transfer function deleted a child's marks. A paid month was then repriced to 0,
-- although the teacher had given the child in-class points in those lessons.
-- The register had lost what the rest of the app still knew.
--
-- WHAT THIS DOES.
--   1. attendance_proof_rows   THE ONE RULE for "was this child in this lesson".
--                              Everything below calls it.
--   2. attendance_has_proof    yes / no.
--   3. attendance_proof_guard  a trigger on attendance: with proof, a child cannot
--                              be marked Absent or Excused, and a mark cannot be
--                              deleted. A person is told why. A system job is not
--                              stopped with an error: its write is skipped and logged.
--   4. attendance_proof_for_session   what the register screens may show a teacher.
--   5. attendance_evidence_gaps       the lessons where the register and the proof
--                                     disagree (admin).
--   6. attendance_apply_evidence      fills in Present where there is proof and no
--                                     mark; fixes a system-made Absent/Excused.
--                                     Never changes a mark a person made.
--   7. an hourly job for 6 (only where pg_cron exists).
--
-- WHAT COUNTS AS PROOF (strength 'proof'). Only things a member of staff did on
-- purpose, for ONE child, tied to THIS lesson, that staff can take back:
--   individual_points  a participation award (points above 0, made by a person,
--                      not a Pixel Pal copy, not a streak bonus), saved against the
--                      lesson (session_id, never class + date: a class transfer
--                      relabels point rows), made inside the lesson window, and no
--                      other child got a participation award from the same person
--                      for that lesson within 2 seconds. "Award to many" (the live
--                      grid's select-all) writes one row per child in one statement,
--                      and it reaches children who never came: it is NOT proof.
--                      Take-back: the child's point history (delete the award).
--   speaker_mark       "Who's speaking" (lesson_speaker_marks): a teacher or TA
--                      tapped THIS child's tile during the lesson. The server stamps
--                      who and when. One tap can name several children ("several
--                      speak at once"), so only a mark that names exactly ONE child
--                      is proof; a mark naming more is an indication.
--                      Take-back: Undo on the lesson's speakers page.
-- Lesson window = from 15 minutes before the start to 30 minutes after the end,
-- Hanoi time (Asia/Ho_Chi_Minh; sessions.date, start_time and end_time are Hanoi
-- wall-clock, as session_held_evidence reads them).
--
-- WHAT IS ONLY AN INDICATION (strength 'indication'; shown to people, never locks,
-- never marks anything):
--   batch_points      award to many children at once
--   pixel_pal_points  a copy of an award made in Pixel Pal
--   transcript_award  a point applied from a lesson transcript (class + date only)
--   window_points     an individual award with no lesson saved, inside the window
--   skill_score       a skill score saved for the lesson (no screen can delete one,
--                     so a lock on it could never be lifted)
--   class_work        approved work a teacher uploaded, for this class, in the window
--                     (an upload says when the photo was taken, not that the child
--                     came; it might be work done at home)
--   voice_confirmed   the child's voice in a transcript whose speaker a teacher linked
--                     (a transcript is tied to a class and a day, never to a lesson)
--   voice_suggested   the same, but only the model's guess
--   speaker_group_mark  a speaker mark that names several children
--   homework_in_lesson  homework handed in during the window
-- Not built, on purpose: video_in_lesson, vocab_in_lesson (a child does these at
-- home; the columns that would tie them to a lesson are not there).
--
-- THE GUARD AND EVERY WRITER OF attendance. Row triggers fire in name order:
-- guard_attendance_enrollment, guard_cancelled_session_attendance,
-- zz_attendance_evidence_guard, zz_attendance_money_guard, and then this one,
-- zz_attendance_proof_guard (e < m < p). It sees the final NEW. It returns at once when:
-- the session is gone or Canceled, hec.attendance_proof_bypass or
-- hec.attendance_restore is 'on'. It never raises when another trigger or an FK
-- cascade is writing (pg_trigger_depth() > 1): a DELETE passes; an Absent/Excused
-- INSERT is kept as Present, an Absent/Excused UPDATE is skipped, both logged.
-- No person acting (auth.uid() is NULL: service role, cron, the SQL editor): the row
-- is kept as it is and one row goes to attendance_proof_refusals. If the proof lookup
-- itself fails, the write goes through (RAISE WARNING).
--   mark-attendance (teacher)   writes with the SERVICE key, so auth.uid() is NULL:
--                               the guard skips and logs, it does not raise. The
--                               function should ask attendance_has_proof first and
--                               answer 409. (An admin, on their own JWT, gets the
--                               ATTENDANCE_PROOF message.)
--   _money_exec__attendance (set_marks, repair; admin)   refused with the message.
--   _attendance_seed_for_class_dates (depth 2, ON CONFLICT DO NOTHING)   an existing
--                               row passes; a new Excused row for a child with proof
--                               becomes Present.
--   set_attendance_excused_on_cancel   the lesson is Canceled: not guarded.
--   end_enrollment / modify_enrollment_transfer (delete placeholders from a date)
--                               a person acting: a placeholder on a lesson the child
--                               has proof for is refused, and the whole call stops with
--                               the message, nothing half-done (the child was in a
--                               lesson after the date they are being removed from).
--   pause_enrollment (Excused over a window)   refused if any lesson in it has proof.
--   ai_action_undo (deletes placeholders)      refused the same way.
--   admin_merge_students                       sets hec.attendance_restore: passes.
--   stars_sync__apply_event / _resolve_conflict  service role: skipped and logged, the
--                               sync page completes. A person (admin) settling a
--                               conflict is refused with the message.
--   auto-mark-attendance (Present)             never guarded.
--   admin-data-import (restore)                service role: skipped and logged. Set
--                               hec.attendance_proof_bypass to restore on purpose.
--   FK cascades (a lesson or a child deleted)  depth 2: pass.
--   attendance_apply_evidence                  writes Present only.
--
-- Safe to run twice. Paste after 20261123090000.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.attendance') IS NULL OR to_regclass('public.sessions') IS NULL
     OR to_regclass('public.students') IS NULL OR to_regclass('public.enrollments') IS NULL
     OR to_regclass('public.classes') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs attendance, sessions, students, enrollments and classes';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------- tables
CREATE TABLE IF NOT EXISTS public.attendance_proof_refusals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL,
  student_id      uuid NOT NULL,
  op              text NOT NULL,          -- INSERT, UPDATE or DELETE
  attempted_status text,                  -- what the writer wanted (NULL for a delete)
  kept_status     text,                   -- what the register keeps
  summary         text,                   -- the proof, in a sentence
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- No foreign keys on purpose: the log outlives the lesson and the child.
CREATE INDEX IF NOT EXISTS attendance_proof_refusals_created ON public.attendance_proof_refusals (created_at DESC);

CREATE TABLE IF NOT EXISTS public.attendance_evidence_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at          timestamptz NOT NULL DEFAULT now(),
  ran_by          uuid,                   -- NULL = the hourly job or the service role
  from_date       date NOT NULL,
  to_date         date NOT NULL,
  inserted        integer NOT NULL DEFAULT 0,
  corrected       integer NOT NULL DEFAULT 0,
  left_for_admin  integer NOT NULL DEFAULT 0,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS attendance_evidence_runs_ran ON public.attendance_evidence_runs (ran_at DESC);

ALTER TABLE public.attendance_proof_refusals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_evidence_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_proof_refusals, public.attendance_evidence_runs FROM PUBLIC, anon;
GRANT SELECT ON public.attendance_proof_refusals, public.attendance_evidence_runs TO authenticated;
GRANT ALL ON public.attendance_proof_refusals, public.attendance_evidence_runs TO service_role;

-- Admin-only read. (Skipped, with a notice, if has_role is missing: then nobody signed
-- in can read the logs, which is the safe side.)
DO $pol$
BEGIN
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS attendance_proof_refusals_admin_read ON public.attendance_proof_refusals';
    EXECUTE $p$CREATE POLICY attendance_proof_refusals_admin_read ON public.attendance_proof_refusals
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
    EXECUTE 'DROP POLICY IF EXISTS attendance_evidence_runs_admin_read ON public.attendance_evidence_runs';
    EXECUTE $p$CREATE POLICY attendance_evidence_runs_admin_read ON public.attendance_evidence_runs
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  ELSE
    RAISE NOTICE 'has_role(uuid, app_role) not found: the proof logs have no read policy';
  END IF;
END
$pol$;

-- ---------------------------------------------------------------- indexes
-- The guard runs on every register write: it must find a child's points for a
-- lesson by index, not by scanning point_transactions.
DO $idx$
BEGIN
  IF to_regclass('public.point_transactions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS point_transactions_proof_session_student
             ON public.point_transactions (session_id, student_id) WHERE session_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS point_transactions_proof_class_created
             ON public.point_transactions (class_id, created_at)';
  END IF;
  IF to_regclass('public.skill_assessments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS skill_assessments_proof_session
             ON public.skill_assessments (session_id, student_id) WHERE session_id IS NOT NULL';
  END IF;
  IF to_regclass('public.lesson_speaker_marks') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS lesson_speaker_marks_proof_session
             ON public.lesson_speaker_marks (session_id)';
  END IF;
END
$idx$;

-- ---------------------------------------------------------------- 1. the rule
-- The window of each lesson, Hanoi time.
CREATE OR REPLACE FUNCTION public._attendance_proof_lessons(p_ids uuid[])
RETURNS TABLE (lid uuid, lclass uuid, ldate date, wfrom timestamptz, wto timestamptz, lstatus text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN QUERY
  SELECT s.id, s.class_id, s.date,
         ((s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '15 minutes',
         ((s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
           + CASE WHEN s.end_time <= s.start_time THEN interval '1 day' ELSE interval '0' END
           + interval '30 minutes',
         s.status::text
    FROM public.sessions s
   WHERE s.id = ANY (p_ids);
END
$fn$;

-- p_proof_only = true skips the indications: that is what the guard asks for.
CREATE OR REPLACE FUNCTION public.attendance_proof_rows(
  p_session_ids uuid[], p_student_id uuid DEFAULT NULL, p_proof_only boolean DEFAULT false)
RETURNS TABLE (session_id uuid, student_id uuid, kind text, strength text, at timestamptz, summary text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
#variable_conflict use_column
DECLARE
  tz constant text := 'Asia/Ho_Chi_Minh';
BEGIN
  -- ---- PROOF: individual_points
  RETURN QUERY
  SELECT pt.session_id, pt.student_id, 'individual_points'::text, 'proof'::text, min(pt.created_at),
         (sum(pt.points))::text || ' participation points at ' || to_char(min(pt.created_at) AT TIME ZONE tz, 'HH24:MI')
    FROM public.point_transactions pt
    JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lid = pt.session_id
   WHERE (p_student_id IS NULL OR pt.student_id = p_student_id)
     AND pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND pt.created_at BETWEEN l.wfrom AND l.wto
     AND NOT EXISTS (SELECT 1 FROM public.point_transactions o
                      WHERE o.session_id = pt.session_id AND o.type = 'participation'
                        AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                        AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY pt.session_id, pt.student_id;

  -- ---- PROOF: speaker_mark (a mark naming exactly one child)
  IF to_regclass('public.lesson_speaker_marks') IS NOT NULL THEN
    RETURN QUERY
    SELECT m.session_id, m.student_ids[1], 'speaker_mark'::text, 'proof'::text, min(m.at),
           'Named as speaking at ' || to_char(min(m.at) AT TIME ZONE tz, 'HH24:MI')
      FROM public.lesson_speaker_marks m
      JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lid = m.session_id
     WHERE m.kind = 'student' AND cardinality(m.student_ids) = 1
       AND (p_student_id IS NULL OR m.student_ids[1] = p_student_id)
       AND m.at BETWEEN l.wfrom AND l.wto
     GROUP BY m.session_id, m.student_ids[1];
  END IF;

  IF p_proof_only THEN RETURN; END IF;

  -- ---- INDICATIONS: points
  RETURN QUERY
  SELECT pt.session_id, pt.student_id, 'batch_points'::text, 'indication'::text, min(pt.created_at),
         'Points given to several children at once at ' || to_char(min(pt.created_at) AT TIME ZONE tz, 'HH24:MI')
    FROM public.point_transactions pt
    JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lid = pt.session_id
   WHERE (p_student_id IS NULL OR pt.student_id = p_student_id)
     AND pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND EXISTS (SELECT 1 FROM public.point_transactions o
                  WHERE o.session_id = pt.session_id AND o.type = 'participation'
                    AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                    AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY pt.session_id, pt.student_id;

  RETURN QUERY
  SELECT l.lid, pt.student_id, 'pixel_pal_points'::text, 'indication'::text, min(pt.created_at),
         'Points copied from Pixel Pal on ' || to_char(min(pt.date), 'DD Mon')
    FROM public.point_transactions pt
    JOIN public._attendance_proof_lessons(p_session_ids) l
      ON (pt.session_id = l.lid OR (pt.session_id IS NULL AND pt.class_id = l.lclass AND pt.date = l.ldate))
   WHERE (p_student_id IS NULL OR pt.student_id = p_student_id)
     AND pt.type = 'participation' AND pt.points > 0 AND COALESCE(pt.notes, '') LIKE '[Pixel Pal]%'
   GROUP BY l.lid, pt.student_id;

  RETURN QUERY
  SELECT l.lid, pt.student_id, 'transcript_award'::text, 'indication'::text, min(pt.created_at),
         'Point applied from the lesson transcript on ' || to_char(min(pt.date), 'DD Mon')
    FROM public.point_transactions pt
    JOIN public._attendance_proof_lessons(p_session_ids) l
      ON (pt.session_id = l.lid OR (pt.session_id IS NULL AND pt.class_id = l.lclass AND pt.date = l.ldate))
   WHERE (p_student_id IS NULL OR pt.student_id = p_student_id)
     AND pt.type = 'participation' AND pt.points > 0
     AND COALESCE(pt.notes, '') LIKE 'In-class award (from transcript)%'
   GROUP BY l.lid, pt.student_id;

  RETURN QUERY
  SELECT l.lid, pt.student_id, 'window_points'::text, 'indication'::text, min(pt.created_at),
         (sum(pt.points))::text || ' participation points at ' || to_char(min(pt.created_at) AT TIME ZONE tz, 'HH24:MI') || ' (no lesson saved)'
    FROM public.point_transactions pt
    JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lclass = pt.class_id
   WHERE (p_student_id IS NULL OR pt.student_id = p_student_id)
     AND pt.session_id IS NULL
     AND pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND pt.created_at BETWEEN l.wfrom AND l.wto
     AND NOT EXISTS (SELECT 1 FROM public.point_transactions o
                      WHERE o.session_id IS NULL AND o.class_id = pt.class_id AND o.type = 'participation'
                        AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                        AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY l.lid, pt.student_id;

  -- ---- INDICATIONS: skill scores
  IF to_regclass('public.skill_assessments') IS NOT NULL THEN
    RETURN QUERY
    SELECT sa.session_id, sa.student_id, 'skill_score'::text, 'indication'::text, min(COALESCE(sa.created_at, now())),
           'Skill score saved for the lesson'
      FROM public.skill_assessments sa
      JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lid = sa.session_id
     WHERE (p_student_id IS NULL OR sa.student_id = p_student_id)
       AND sa.created_by IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.skill_assessments o
                        WHERE o.session_id = sa.session_id AND o.created_by = sa.created_by AND o.student_id <> sa.student_id
                          AND o.created_at BETWEEN sa.created_at - interval '2 seconds' AND sa.created_at + interval '2 seconds')
     GROUP BY sa.session_id, sa.student_id;
  END IF;

  -- ---- INDICATIONS: class work a teacher uploaded
  IF to_regclass('public.student_work') IS NOT NULL THEN
    RETURN QUERY
    SELECT l.lid, sw.student_id, 'class_work'::text, 'indication'::text, min(sw.created_at),
           'Approved work uploaded by a teacher at ' || to_char(min(sw.created_at) AT TIME ZONE tz, 'HH24:MI')
      FROM public.student_work sw
      JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lclass = sw.class_id
     WHERE (p_student_id IS NULL OR sw.student_id = p_student_id)
       AND sw.status = 'approved' AND sw.student_id IS NOT NULL AND NOT sw.is_teamwork
       AND sw.created_at BETWEEN l.wfrom AND l.wto
       AND EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = sw.uploaded_by AND ur.role IN ('admin'::public.app_role, 'teacher'::public.app_role))
     GROUP BY l.lid, sw.student_id;
  END IF;

  -- ---- INDICATIONS: speaker marks naming several children
  IF to_regclass('public.lesson_speaker_marks') IS NOT NULL THEN
    RETURN QUERY
    SELECT m.session_id, x.sid, 'speaker_group_mark'::text, 'indication'::text, min(m.at),
           'Named with other children as speaking at ' || to_char(min(m.at) AT TIME ZONE tz, 'HH24:MI')
      FROM public.lesson_speaker_marks m
      JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lid = m.session_id
      CROSS JOIN LATERAL unnest(m.student_ids) AS x(sid)
     WHERE m.kind = 'student' AND cardinality(m.student_ids) > 1
       AND (p_student_id IS NULL OR x.sid = p_student_id)
       AND m.at BETWEEN l.wfrom AND l.wto
     GROUP BY m.session_id, x.sid;
  END IF;

  -- ---- INDICATIONS: voice in a transcript (class + day, never the lesson)
  IF to_regclass('public.transcript_speaker_metrics') IS NOT NULL AND to_regclass('public.class_transcripts') IS NOT NULL THEN
    RETURN QUERY
    SELECT l.lid, tsm.student_id, 'voice_confirmed'::text, 'indication'::text, min(ct.created_at),
           'Spoke in the lesson transcript (' || max(tsm.utterance_count) || ' turns), speaker linked by a teacher'
      FROM public.transcript_speaker_metrics tsm
      JOIN public.class_transcripts ct ON ct.id = tsm.transcript_id
      JOIN public._attendance_proof_lessons(p_session_ids) l
        ON (ct.session_id = l.lid OR (ct.session_id IS NULL AND ct.class_id = l.lclass AND ct.transcript_date = l.ldate))
     WHERE (p_student_id IS NULL OR tsm.student_id = p_student_id)
       AND tsm.student_id IS NOT NULL AND NOT tsm.is_teacher AND tsm.utterance_count >= 3
     GROUP BY l.lid, tsm.student_id;

    IF to_regclass('public.transcript_speaker_suggestions') IS NOT NULL THEN
      RETURN QUERY
      SELECT l.lid, tss.suggested_student_id, 'voice_suggested'::text, 'indication'::text, min(ct.created_at),
             'The model thinks this child spoke in the lesson transcript (not confirmed)'
        FROM public.transcript_speaker_suggestions tss
        JOIN public.transcript_speaker_metrics tsm ON tsm.id = tss.metric_id
        JOIN public.class_transcripts ct ON ct.id = tsm.transcript_id
        JOIN public._attendance_proof_lessons(p_session_ids) l
          ON (ct.session_id = l.lid OR (ct.session_id IS NULL AND ct.class_id = l.lclass AND ct.transcript_date = l.ldate))
       WHERE (p_student_id IS NULL OR tss.suggested_student_id = p_student_id)
         AND tss.suggested_student_id IS NOT NULL AND NOT tsm.is_teacher
       GROUP BY l.lid, tss.suggested_student_id;
    END IF;
  END IF;

  -- ---- INDICATIONS: homework handed in during the lesson
  IF to_regclass('public.homework_submissions') IS NOT NULL AND to_regclass('public.homeworks') IS NOT NULL THEN
    RETURN QUERY
    SELECT l.lid, hs.student_id, 'homework_in_lesson'::text, 'indication'::text, min(hs.submitted_at),
           'Homework handed in at ' || to_char(min(hs.submitted_at) AT TIME ZONE tz, 'HH24:MI')
      FROM public.homework_submissions hs
      JOIN public.homeworks h ON h.id = hs.homework_id
      JOIN public._attendance_proof_lessons(p_session_ids) l ON l.lclass = h.class_id
     WHERE (p_student_id IS NULL OR hs.student_id = p_student_id)
       AND hs.submitted_at BETWEEN l.wfrom AND l.wto
     GROUP BY l.lid, hs.student_id;
  END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION public.attendance_has_proof(p_session_id uuid, p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.attendance_proof_rows(ARRAY[p_session_id], p_student_id, true) r
                  WHERE r.strength = 'proof')
$fn$;

REVOKE ALL ON FUNCTION public._attendance_proof_lessons(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_proof_rows(uuid[], uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attendance_has_proof(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._attendance_proof_lessons(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_proof_rows(uuid[], uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_has_proof(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------- 3. the guard
CREATE OR REPLACE FUNCTION public.attendance_proof_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sid uuid;
  v_kid uuid;
  v_new text;
  v_old text;
  v_status text;
  v_uid uuid;
  v_kind text;
  v_summary text;
  v_name text;
  v_hint text;
  v_kept text;
BEGIN
  IF current_setting('hec.attendance_proof_bypass', true) = 'on'
     OR current_setting('hec.attendance_restore', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_sid := CASE WHEN TG_OP = 'DELETE' THEN OLD.session_id ELSE NEW.session_id END;
  v_kid := CASE WHEN TG_OP = 'DELETE' THEN OLD.student_id ELSE NEW.student_id END;
  v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status::text END;
  v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status::text END;

  -- Only these writes are guarded.
  IF TG_OP = 'INSERT' THEN
    IF v_new NOT IN ('Absent', 'Excused') THEN RETURN NEW; END IF;
    -- A row already there: an ON CONFLICT upsert is judged on its UPDATE; a seed that
    -- does nothing must not be disturbed.
    IF EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = v_sid AND a.student_id = v_kid) THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_new NOT IN ('Absent', 'Excused') OR v_new IS NOT DISTINCT FROM v_old THEN RETURN NEW; END IF;
  ELSE
    -- A delete by a cascade (a lesson or a child removed) always passes.
    IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  END IF;

  SELECT s.status::text INTO v_status FROM public.sessions s WHERE s.id = v_sid;
  IF NOT FOUND OR v_status = 'Canceled' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- The lookup may never stop a teacher marking the register: if it fails, let the write through.
  BEGIN
    v_uid := auth.uid();
    SELECT r.kind, r.summary INTO v_kind, v_summary
      FROM public.attendance_proof_rows(ARRAY[v_sid], v_kid, true) r
     WHERE r.strength = 'proof'
     ORDER BY r.kind LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'attendance_proof_guard: proof lookup failed (%), the write is let through', SQLERRM;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END;
  IF v_kind IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF v_uid IS NOT NULL AND pg_trigger_depth() <= 1 THEN
    SELECT st.full_name INTO v_name FROM public.students st WHERE st.id = v_kid;
    v_hint := CASE v_kind
      WHEN 'speaker_mark' THEN 'use Undo on the lesson''s speakers page'
      ELSE 'delete it in the child''s point history' END;
    RAISE EXCEPTION 'ATTENDANCE_PROOF: % was in this lesson: %. If that is a mistake, %, then change the mark.',
      COALESCE(v_name, 'This child'), v_summary, v_hint
      USING ERRCODE = 'P0001';
  END IF;

  -- Nobody signed in is acting (service role, cron, the stars sync, a trigger, the SQL
  -- editor). A raise would abort that whole transaction, so keep the register as it is.
  v_kept := CASE WHEN TG_OP = 'INSERT' THEN 'Present' ELSE OLD.status::text END;
  BEGIN
    INSERT INTO public.attendance_proof_refusals (session_id, student_id, op, attempted_status, kept_status, summary)
    VALUES (v_sid, v_kid, TG_OP, v_new, v_kept, v_summary);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'attendance_proof_guard: could not log the refusal (%)', SQLERRM;
  END;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'Present';
    RETURN NEW;
  END IF;
  RETURN NULL;
END
$fn$;

REVOKE ALL ON FUNCTION public.attendance_proof_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS attendance_proof_guard ON public.attendance;
DROP TRIGGER IF EXISTS zz_attendance_proof_guard ON public.attendance;
CREATE TRIGGER zz_attendance_proof_guard BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.attendance_proof_guard();

-- ---------------------------------------------------------------- who may call
-- Admin, or no person at all (the service role, the hourly job, the SQL editor).
-- A request that came in as anon or authenticated without being an admin is refused.
CREATE OR REPLACE FUNCTION public._attendance_proof_admin_or_system()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_claims text := NULLIF(current_setting('request.jwt.claims', true), '');
  v_role text;
BEGIN
  IF v_uid IS NOT NULL THEN
    RETURN COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false);
  END IF;
  BEGIN
    v_role := COALESCE(v_claims::jsonb ->> 'role', NULLIF(current_setting('request.jwt.claim.role', true), ''));
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;
  RETURN v_role IS NULL OR v_role NOT IN ('anon', 'authenticated');
END
$fn$;
REVOKE ALL ON FUNCTION public._attendance_proof_admin_or_system() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._attendance_proof_admin_or_system() TO service_role;

-- ---------------------------------------------------------------- 4. for a screen
CREATE OR REPLACE FUNCTION public.attendance_proof_for_session(p_session_id uuid)
RETURNS TABLE (student_id uuid, strength text, kinds text[], summary text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_class uuid;
BEGIN
  SELECT s.class_id INTO v_class FROM public.sessions s WHERE s.id = p_session_id;
  IF v_class IS NULL OR v_uid IS NULL
     OR NOT (public.has_role(v_uid, 'admin'::public.app_role) OR public.is_teacher_of_class(v_uid, v_class)) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT r.student_id,
         CASE WHEN bool_or(r.strength = 'proof') THEN 'proof' ELSE 'indication' END,
         array_agg(DISTINCT r.kind ORDER BY r.kind),
         (array_agg(r.summary ORDER BY (r.strength = 'proof') DESC, r.kind))[1]
    FROM public.attendance_proof_rows(ARRAY[p_session_id], NULL, false) r
   GROUP BY r.student_id;
END
$fn$;
REVOKE ALL ON FUNCTION public.attendance_proof_for_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_proof_for_session(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------- 5. the gaps
CREATE OR REPLACE FUNCTION public._attendance_evidence_gaps_core(p_from date, p_to date)
RETURNS TABLE (kind text, session_id uuid, student_id uuid, student_name text, class_id uuid, class_name text,
               lesson_date date, current_status text, marked_by_person boolean, proof_kinds text[], summary text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH les AS (
    SELECT s.id AS sid, s.class_id AS cid, c.name AS cname, s.date AS ldate, s.status::text AS lst
      FROM public.sessions s JOIN public.classes c ON c.id = s.class_id
     WHERE s.date BETWEEN p_from AND p_to
       AND (((s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
            + CASE WHEN s.end_time <= s.start_time THEN interval '1 day' ELSE interval '0' END) < now()
  ),
  ev AS (SELECT r.* FROM public.attendance_proof_rows((SELECT array_agg(l.sid) FROM les l), NULL, false) r),
  pk AS (
    SELECT e.session_id AS sid, e.student_id AS kid, array_agg(DISTINCT e.kind ORDER BY e.kind) AS kinds,
           (array_agg(e.summary ORDER BY e.kind))[1] AS summ
      FROM ev e WHERE e.strength = 'proof' GROUP BY e.session_id, e.student_id),
  ind AS (
    SELECT e.session_id AS sid, e.student_id AS kid, (array_agg(e.summary ORDER BY e.kind))[1] AS summ
      FROM ev e WHERE e.strength = 'indication' GROUP BY e.session_id, e.student_id),
  -- Enrolled on the date: the rule calculate-tuition and tuition_bill_expected use. The
  -- class's first-created enrollment covering the date is the one whose allowed_days
  -- count (0 = Sunday; NULL = every day).
  enr AS (
    SELECT x.sid, x.kid FROM (
      SELECT DISTINCT ON (l.sid, en.student_id) l.sid, en.student_id AS kid, en.allowed_days, l.ldate
        FROM les l
        JOIN public.enrollments en ON en.class_id = l.cid AND en.start_date <= l.ldate
                                  AND (en.end_date IS NULL OR en.end_date >= l.ldate)
       ORDER BY l.sid, en.student_id, en.created_at, en.id) x
     WHERE x.allowed_days IS NULL OR extract(dow FROM x.ldate)::int = ANY (x.allowed_days)),
  att AS (
    SELECT a.session_id AS sid, a.student_id AS kid, a.status::text AS st, a.marked_by AS mb
      FROM public.attendance a WHERE a.session_id IN (SELECT l.sid FROM les l)),
  rows_all AS (
    -- proof, enrolled, no mark
    SELECT 'proof_no_mark'::text AS k, p.sid, p.kid, NULL::text AS st, NULL::boolean AS byp, p.kinds, p.summ
      FROM pk p JOIN les l ON l.sid = p.sid
     WHERE l.lst IN ('Held', 'Scheduled')
       AND EXISTS (SELECT 1 FROM enr e WHERE e.sid = p.sid AND e.kid = p.kid)
       AND NOT EXISTS (SELECT 1 FROM att a WHERE a.sid = p.sid AND a.kid = p.kid)
    UNION ALL
    -- proof against an Absent / Excused mark
    SELECT CASE WHEN a.mb IS NULL THEN 'proof_contradicts_system' ELSE 'proof_contradicts_person' END,
           p.sid, p.kid, a.st, a.mb IS NOT NULL, p.kinds, p.summ
      FROM pk p JOIN les l ON l.sid = p.sid
      JOIN att a ON a.sid = p.sid AND a.kid = p.kid
     WHERE l.lst IN ('Held', 'Scheduled') AND a.st IN ('Absent', 'Excused')
       AND EXISTS (SELECT 1 FROM enr e WHERE e.sid = p.sid AND e.kid = p.kid)
    UNION ALL
    -- a held lesson inside the enrolment with no mark and no proof
    SELECT 'no_mark_no_proof', e.sid, e.kid, NULL, NULL, ARRAY[]::text[],
           CASE WHEN i.summ IS NULL THEN 'No mark and no proof'
                ELSE 'No mark and no proof; an indication exists: ' || i.summ END
      FROM enr e JOIN les l ON l.sid = e.sid
      LEFT JOIN ind i ON i.sid = e.sid AND i.kid = e.kid
     WHERE l.lst = 'Held'
       AND NOT EXISTS (SELECT 1 FROM att a WHERE a.sid = e.sid AND a.kid = e.kid)
       AND NOT EXISTS (SELECT 1 FROM pk p WHERE p.sid = e.sid AND p.kid = e.kid)
    UNION ALL
    -- proof for a child not enrolled that day
    SELECT 'proof_not_enrolled', p.sid, p.kid, a.st, a.mb IS NOT NULL, p.kinds, p.summ
      FROM pk p JOIN les l ON l.sid = p.sid
      LEFT JOIN att a ON a.sid = p.sid AND a.kid = p.kid
     WHERE l.lst IN ('Held', 'Scheduled')
       AND NOT EXISTS (SELECT 1 FROM enr e WHERE e.sid = p.sid AND e.kid = p.kid)
    UNION ALL
    -- proof on a cancelled lesson
    SELECT 'proof_on_cancelled', p.sid, p.kid, a.st, a.mb IS NOT NULL, p.kinds, p.summ
      FROM pk p JOIN les l ON l.sid = p.sid
      LEFT JOIN att a ON a.sid = p.sid AND a.kid = p.kid
     WHERE l.lst = 'Canceled'
  )
  SELECT r.k, r.sid, r.kid, st.full_name, l.cid, l.cname, l.ldate, r.st, r.byp, r.kinds, r.summ
    FROM rows_all r
    JOIN les l ON l.sid = r.sid
    LEFT JOIN public.students st ON st.id = r.kid
   ORDER BY l.ldate, l.cname, st.full_name, r.k;
END
$fn$;
REVOKE ALL ON FUNCTION public._attendance_evidence_gaps_core(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._attendance_evidence_gaps_core(date, date) TO service_role;

CREATE OR REPLACE FUNCTION public.attendance_evidence_gaps(p_from date, p_to date)
RETURNS TABLE (kind text, session_id uuid, student_id uuid, student_name text, class_id uuid, class_name text,
               lesson_date date, current_status text, marked_by_person boolean, proof_kinds text[], summary text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public._attendance_proof_admin_or_system() THEN
    RAISE EXCEPTION 'Only an administrator can read the attendance evidence gaps' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public._attendance_evidence_gaps_core(p_from, p_to);
END
$fn$;
REVOKE ALL ON FUNCTION public.attendance_evidence_gaps(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_evidence_gaps(date, date) TO authenticated, service_role;

-- ---------------------------------------------------------------- 6. apply
CREATE OR REPLACE FUNCTION public.attendance_apply_evidence(p_from date, p_to date, p_dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r record;
  v_ins int := 0;
  v_cor int := 0;
  v_left int := 0;
  v_n int;
  v_rows jsonb := '[]'::jsonb;
  v_months jsonb;
  v_action text;
  v_touched jsonb := '[]'::jsonb;
BEGIN
  IF NOT public._attendance_proof_admin_or_system() THEN
    RAISE EXCEPTION 'Only an administrator can apply attendance evidence' USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public._attendance_evidence_gaps_core(p_from, p_to) LOOP
    v_action := 'left';
    IF r.kind = 'proof_no_mark' THEN
      IF p_dry_run THEN
        v_ins := v_ins + 1; v_action := 'would_insert';
        v_touched := v_touched || jsonb_build_object('student_id', r.student_id, 'month', to_char(r.lesson_date, 'YYYY-MM'));
      ELSE
        BEGIN
          INSERT INTO public.attendance (session_id, student_id, status, marked_by, notes)
          VALUES (r.session_id, r.student_id, 'Present', NULL, 'Auto-marked from evidence: ' || r.summary)
          ON CONFLICT (session_id, student_id) DO NOTHING;
          GET DIAGNOSTICS v_n = ROW_COUNT;
          IF v_n > 0 THEN
            v_ins := v_ins + 1; v_action := 'inserted';
            v_touched := v_touched || jsonb_build_object('student_id', r.student_id, 'month', to_char(r.lesson_date, 'YYYY-MM'));
          ELSE
            v_left := v_left + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_left := v_left + 1; v_action := 'failed: ' || SQLERRM;
        END;
      END IF;
    ELSIF r.kind = 'proof_contradicts_system' THEN
      IF p_dry_run THEN
        v_cor := v_cor + 1; v_action := 'would_correct';
        v_touched := v_touched || jsonb_build_object('student_id', r.student_id, 'month', to_char(r.lesson_date, 'YYYY-MM'));
      ELSE
        BEGIN
          UPDATE public.attendance a
             SET status = 'Present', notes = 'Auto-corrected from evidence: ' || r.summary
           WHERE a.session_id = r.session_id AND a.student_id = r.student_id
             AND a.marked_by IS NULL AND a.status::text IN ('Absent', 'Excused');
          GET DIAGNOSTICS v_n = ROW_COUNT;
          IF v_n > 0 THEN
            v_cor := v_cor + 1; v_action := 'corrected';
            v_touched := v_touched || jsonb_build_object('student_id', r.student_id, 'month', to_char(r.lesson_date, 'YYYY-MM'));
          ELSE
            v_left := v_left + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_left := v_left + 1; v_action := 'failed: ' || SQLERRM;
        END;
      END IF;
    ELSE
      v_left := v_left + 1;
    END IF;
    v_rows := v_rows || jsonb_build_object(
      'kind', r.kind, 'action', v_action, 'session_id', r.session_id, 'student_id', r.student_id,
      'student_name', r.student_name, 'class_name', r.class_name, 'lesson_date', r.lesson_date,
      'current_status', r.current_status, 'summary', r.summary);
  END LOOP;

  SELECT COALESCE(jsonb_agg(DISTINCT t), '[]'::jsonb) INTO v_months FROM jsonb_array_elements(v_touched) t;

  IF NOT p_dry_run THEN
    INSERT INTO public.attendance_evidence_runs (ran_by, from_date, to_date, inserted, corrected, left_for_admin, detail)
    VALUES (auth.uid(), p_from, p_to, v_ins, v_cor, v_left, jsonb_build_object('affected_months', v_months));
  END IF;

  RETURN jsonb_build_object('dry_run', p_dry_run, 'inserted', v_ins, 'corrected', v_cor,
                            'left_for_admin', v_left, 'affected_months', v_months, 'rows', v_rows);
END
$fn$;
REVOKE ALL ON FUNCTION public.attendance_apply_evidence(date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_apply_evidence(date, date, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------- 7. hourly
-- The last 14 days, Hanoi dates. Only where pg_cron exists.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-apply-evidence') THEN
      PERFORM cron.unschedule('attendance-apply-evidence');
    END IF;
    PERFORM cron.schedule(
      'attendance-apply-evidence',
      '40 * * * *',
      $cmd$select public.attendance_apply_evidence(
             ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 14),
             (now() at time zone 'Asia/Ho_Chi_Minh')::date, false)$cmd$
    );
  ELSE
    RAISE NOTICE 'pg_cron is not installed: attendance-apply-evidence is not scheduled';
  END IF;
END
$cron$;

COMMIT;
