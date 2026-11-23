-- READ-ONLY. One plain SELECT, no function calls of ours, nothing is written.
-- Paste it into the Supabase SQL editor (before or after 20261123100000_attendance_proof.sql:
-- it does not need the migration).
--
-- It applies the rule of attendance_proof_rows (20261123100000) to the live tables and
-- returns ONE ROW PER EVIDENCE KIND, so you can see what each kind would do:
--
--   strength              'proof' (would lock a mark) or 'indication' (shown, never locks)
--   child_lessons         (lesson, child) pairs with that evidence, on lessons that have ended
--   on_cancelled          ... of those, on a Canceled lesson
--   not_enrolled          ... on another lesson, the child was not enrolled that day
--                         (first-created enrolment covering the date; allowed_days, 0 = Sunday)
--   no_mark               ... enrolled, no attendance row at all
--   present_late          ... enrolled, marked Present or Late
--   absent                ... enrolled, marked Absent
--   excused               ... enrolled, marked Excused
--   contradicts_person    ... enrolled, Absent/Excused, marked_by is a person
--   contradicts_system    ... enrolled, Absent/Excused, marked_by IS NULL (system)
-- (the last six columns leave out Canceled lessons; every cancelled lesson is Excused.)
-- The guard locks only proof for a child ENROLLED that day, and individual_points needs a staff
-- creator (admin or teacher); the not_enrolled column shows the proof that would never lock.
-- The row "* any proof" counts each (lesson, child) once however many proof kinds it has.
--
-- If lesson_speaker_marks has not been pasted yet (20261121140000), delete the block
-- between "-- speaker marks (start)" and "-- speaker marks (end)" (one block), or the
-- query will say the table does not exist.
--
-- Lesson window: from 15 minutes before the start to 30 minutes after the end, Hanoi time.

WITH
les AS (
  SELECT s.id AS sid, s.class_id AS cid, s.date AS ldate, s.status::text AS lst,
         ((s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '15 minutes' AS wfrom,
         ((s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
           + CASE WHEN s.end_time < s.start_time THEN interval '1 day' ELSE interval '0' END
           + interval '30 minutes' AS wto
    FROM public.sessions s
   WHERE ((s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
         + CASE WHEN s.end_time < s.start_time THEN interval '1 day' ELSE interval '0' END < now()
),
ev AS (
  -- PROOF: individual_points
  SELECT pt.session_id AS sid, pt.student_id AS kid, 'individual_points'::text AS kind, 'proof'::text AS strength
    FROM public.point_transactions pt
    JOIN les l ON l.sid = pt.session_id
   WHERE pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND pt.created_at BETWEEN l.wfrom AND l.wto
     AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = pt.created_by AND ur.role IN ('admin', 'teacher'))
     AND NOT EXISTS (SELECT 1 FROM public.point_transactions o
                      WHERE o.session_id = pt.session_id AND o.type = 'participation'
                        AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                        AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY pt.session_id, pt.student_id

  -- speaker marks (start)
  UNION ALL
  SELECT m.session_id, m.student_ids[1], 'speaker_mark', 'proof'
    FROM public.lesson_speaker_marks m JOIN les l ON l.sid = m.session_id
   WHERE m.kind = 'student' AND cardinality(m.student_ids) = 1 AND m.at BETWEEN l.wfrom AND l.wto
   GROUP BY m.session_id, m.student_ids[1]
  UNION ALL
  SELECT m.session_id, x.k, 'speaker_group_mark', 'indication'
    FROM public.lesson_speaker_marks m JOIN les l ON l.sid = m.session_id
   CROSS JOIN LATERAL unnest(m.student_ids) AS x(k)
   WHERE m.kind = 'student' AND cardinality(m.student_ids) > 1 AND m.at BETWEEN l.wfrom AND l.wto
   GROUP BY m.session_id, x.k
  -- speaker marks (end)

  -- INDICATIONS: points
  UNION ALL
  SELECT pt.session_id, pt.student_id, 'batch_points', 'indication'
    FROM public.point_transactions pt JOIN les l ON l.sid = pt.session_id
   WHERE pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND EXISTS (SELECT 1 FROM public.point_transactions o
                  WHERE o.session_id = pt.session_id AND o.type = 'participation'
                    AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                    AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY pt.session_id, pt.student_id
  UNION ALL
  SELECT l.sid, pt.student_id, 'pixel_pal_points', 'indication'
    FROM public.point_transactions pt
    JOIN les l ON (pt.session_id = l.sid OR (pt.session_id IS NULL AND pt.class_id = l.cid AND pt.date = l.ldate))
   WHERE pt.type = 'participation' AND pt.points > 0 AND COALESCE(pt.notes, '') LIKE '[Pixel Pal]%'
   GROUP BY l.sid, pt.student_id
  UNION ALL
  SELECT l.sid, pt.student_id, 'transcript_award', 'indication'
    FROM public.point_transactions pt
    JOIN les l ON (pt.session_id = l.sid OR (pt.session_id IS NULL AND pt.class_id = l.cid AND pt.date = l.ldate))
   WHERE pt.type = 'participation' AND pt.points > 0 AND COALESCE(pt.notes, '') LIKE 'In-class award (from transcript)%'
   GROUP BY l.sid, pt.student_id
  UNION ALL
  SELECT l.sid, pt.student_id, 'window_points', 'indication'
    FROM public.point_transactions pt JOIN les l ON l.cid = pt.class_id
   WHERE pt.session_id IS NULL AND pt.type = 'participation' AND pt.points > 0 AND pt.created_by IS NOT NULL
     AND COALESCE(pt.notes, '') NOT LIKE '[Pixel Pal]%'
     AND COALESCE(pt.notes, '') NOT LIKE 'Attendance streak bonus%'
     AND COALESCE(pt.notes, '') NOT LIKE 'In-class award (from transcript)%'
     AND pt.created_at BETWEEN l.wfrom AND l.wto
     AND NOT EXISTS (SELECT 1 FROM public.point_transactions o
                      WHERE o.session_id IS NULL AND o.class_id = pt.class_id AND o.type = 'participation'
                        AND o.created_by = pt.created_by AND o.student_id <> pt.student_id
                        AND o.created_at BETWEEN pt.created_at - interval '2 seconds' AND pt.created_at + interval '2 seconds')
   GROUP BY l.sid, pt.student_id

  -- INDICATIONS: skill scores, class work
  UNION ALL
  SELECT sa.session_id, sa.student_id, 'skill_score', 'indication'
    FROM public.skill_assessments sa JOIN les l ON l.sid = sa.session_id
   WHERE sa.created_by IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.skill_assessments o
                      WHERE o.session_id = sa.session_id AND o.created_by = sa.created_by AND o.student_id <> sa.student_id
                        AND o.created_at BETWEEN sa.created_at - interval '2 seconds' AND sa.created_at + interval '2 seconds')
   GROUP BY sa.session_id, sa.student_id
  UNION ALL
  SELECT l.sid, sw.student_id, 'class_work', 'indication'
    FROM public.student_work sw JOIN les l ON l.cid = sw.class_id
   WHERE sw.status = 'approved' AND sw.student_id IS NOT NULL AND NOT sw.is_teamwork
     AND sw.created_at BETWEEN l.wfrom AND l.wto
     AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = sw.uploaded_by AND ur.role IN ('admin', 'teacher'))
   GROUP BY l.sid, sw.student_id

  -- INDICATIONS: voice in a transcript, homework in the lesson
  UNION ALL
  SELECT l.sid, tsm.student_id, 'voice_confirmed', 'indication'
    FROM public.transcript_speaker_metrics tsm
    JOIN public.class_transcripts ct ON ct.id = tsm.transcript_id
    JOIN les l ON (ct.session_id = l.sid OR (ct.session_id IS NULL AND ct.class_id = l.cid AND ct.transcript_date = l.ldate))
   WHERE tsm.student_id IS NOT NULL AND NOT tsm.is_teacher AND tsm.utterance_count >= 3
   GROUP BY l.sid, tsm.student_id
  UNION ALL
  SELECT l.sid, tss.suggested_student_id, 'voice_suggested', 'indication'
    FROM public.transcript_speaker_suggestions tss
    JOIN public.transcript_speaker_metrics tsm ON tsm.id = tss.metric_id
    JOIN public.class_transcripts ct ON ct.id = tsm.transcript_id
    JOIN les l ON (ct.session_id = l.sid OR (ct.session_id IS NULL AND ct.class_id = l.cid AND ct.transcript_date = l.ldate))
   WHERE tss.suggested_student_id IS NOT NULL AND NOT tsm.is_teacher
   GROUP BY l.sid, tss.suggested_student_id
  UNION ALL
  SELECT l.sid, hs.student_id, 'homework_in_lesson', 'indication'
    FROM public.homework_submissions hs
    JOIN public.homeworks h ON h.id = hs.homework_id
    JOIN les l ON l.cid = h.class_id
   WHERE hs.submitted_at BETWEEN l.wfrom AND l.wto
   GROUP BY l.sid, hs.student_id
),
ev2 AS (SELECT DISTINCT kind, strength, sid, kid FROM ev WHERE kid IS NOT NULL),
ev3 AS (
  SELECT kind, strength, sid, kid FROM ev2
  UNION ALL
  SELECT DISTINCT '* any proof', 'proof', sid, kid FROM ev2 WHERE strength = 'proof'
),
j AS (
  SELECT e.kind, e.strength, l.lst,
         a.session_id IS NOT NULL AS has_row, a.status::text AS st, a.marked_by AS mb,
         EXISTS (
           SELECT 1 FROM (
             SELECT DISTINCT ON (en.student_id) en.allowed_days
               FROM public.enrollments en
              WHERE en.student_id = e.kid AND en.class_id = l.cid
                AND en.start_date <= l.ldate AND (en.end_date IS NULL OR en.end_date >= l.ldate)
              ORDER BY en.student_id, en.created_at, en.id
           ) x
            WHERE x.allowed_days IS NULL OR extract(dow FROM l.ldate)::int = ANY (x.allowed_days)
         ) AS enrolled
    FROM ev3 e
    JOIN les l ON l.sid = e.sid
    LEFT JOIN public.attendance a ON a.session_id = e.sid AND a.student_id = e.kid
)
SELECT kind, strength,
       count(*)                                                                                  AS child_lessons,
       count(*) FILTER (WHERE lst = 'Canceled')                                                  AS on_cancelled,
       count(*) FILTER (WHERE lst <> 'Canceled' AND NOT enrolled)                                AS not_enrolled,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND NOT has_row)                    AS no_mark,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND st IN ('Present', 'Late'))      AS present_late,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND st = 'Absent')                  AS absent,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND st = 'Excused')                 AS excused,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND st IN ('Absent', 'Excused') AND mb IS NOT NULL) AS contradicts_person,
       count(*) FILTER (WHERE lst <> 'Canceled' AND enrolled AND st IN ('Absent', 'Excused') AND mb IS NULL)     AS contradicts_system
  FROM j
 GROUP BY kind, strength
 ORDER BY (strength = 'proof') DESC, (kind LIKE '* %') DESC, kind;
