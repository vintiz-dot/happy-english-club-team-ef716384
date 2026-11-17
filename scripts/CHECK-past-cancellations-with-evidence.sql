-- D5 - lessons already CANCELLED that show signs of having been taught.
--
-- Asked for by the D1 design (section 7.4) and the D2 guard design (7.4:
-- "before step (2) the owner should run D5's read-only check of past
-- cancellations"). The cancellation guard protects every cancel from now on;
-- this looks BACK at the ones made before it, and at the ones made through it.
--
-- READ-ONLY. ONE statement, SELECT only. It calls one function,
-- public.session_held_evidence (STABLE; it refuses any write in its body and
-- rolls back its one helper call), once per cancelled lesson. Paste it into
-- the Supabase SQL editor and run it; it changes nothing. Aggregates only:
-- months, counts and levels - no names, no ids.
--
-- WHY TWO SOURCES (D1 7.4). Cancelling a lesson rewrites every register mark
-- on it to Excused (trg_cancel_session_excused), so the register no longer
-- shows what the teacher marked. The mark a PERSON made survives only in
-- audit_log (entity 'attendance'), and only since the audit trigger went on
-- (20261009130000). The trigger's own rewrite to Excused is not logged there
-- (writes made by a trigger are skipped), so the last logged value before the
-- cancel IS the person's mark. Points, transcripts and homework are not
-- rewritten by a cancel: session_held_evidence still sees them, so its level
-- NOW is the evidence that is left apart from the register.
--
-- COLUMNS
--   period             before_guard     cancelled before the D2 guard went on
--                                        (no evidence was read at the time)
--                      checked          cancelled through the guard: the
--                                        evidence was read and kept then
--                      unchecked_after_guard  cancelled after the guard went on
--                                        with no checked row - must be 0 lessons
--   lesson_month       the lesson's month, or 'all months'
--   lessons            cancelled lessons
--   person_marked_present   lessons where a PERSON's last logged mark before
--                      the cancel was Present or Late for at least one child:
--                      very probably taught. These are the ones to look at.
--   children_present   (lesson, child) pairs behind that column
--   any_logged_mark    lessons with any logged register row before the cancel
--                      (placeholders included)
--   before_audit       lessons cancelled before the audit trigger existed:
--                      their register history cannot be known
--   d1_soft_now / d1_strong_now   session_held_evidence level today (points,
--                      transcripts, homework; the register is all Excused)
--   settled_now        the evidence function's settled.any today (a locked
--                      payroll month or a paid / confirmed / frozen bill in
--                      that month for a child of the lesson)
--   payroll_locked     of those, the lesson's payroll month is closed
--   strong_at_cancel   checked cancels whose stored evidence was STRONG
WITH
params AS (
  SELECT (SELECT min(e.created_at) FROM public.session_cancel_override_events e
           WHERE e.kind = 'guard_installed')                              AS guard_on,
         (SELECT min(a.occurred_at) FROM public.audit_log a
           WHERE a.entity = 'attendance' AND a.operation IS NOT NULL)     AS audit_since
),
cancelled AS (
  SELECT s.id, s.date,
         coalesce((SELECT max(a.occurred_at) FROM public.audit_log a
                    WHERE a.entity = 'sessions' AND a.entity_id = s.id::text AND a.operation = 'UPDATE'
                      AND a.diff -> 'new' ->> 'status' = 'Canceled'
                      AND a.diff -> 'old' ->> 'status' IS DISTINCT FROM 'Canceled'),
                  s.canceled_at)                                          AS cancelled_at,
         (SELECT o.level FROM public.session_cancel_overrides o
           WHERE o.session_id = s.id AND o.action = 'cancel'
           ORDER BY o.created_at DESC, o.id DESC LIMIT 1)                 AS level_at_cancel
    FROM public.sessions s
   WHERE s.status = 'Canceled'
),
classified AS (
  SELECT c.*,
         CASE WHEN c.level_at_cancel IS NOT NULL THEN 'checked'
              WHEN p.guard_on IS NULL OR c.cancelled_at IS NULL OR c.cancelled_at < p.guard_on THEN 'before_guard'
              ELSE 'unchecked_after_guard' END                            AS period,
         (p.audit_since IS NULL OR c.cancelled_at IS NULL OR c.cancelled_at < p.audit_since) AS before_audit
    FROM cancelled c, params p
),
-- The last logged register row per lesson and child, at or before the cancel.
last_mark AS (
  SELECT DISTINCT ON (c.id, a.diff -> 'new' ->> 'student_id')
         c.id AS session_id,
         a.diff -> 'new' ->> 'status'                   AS status,
         (a.diff -> 'new' ->> 'marked_by') IS NOT NULL  AS by_person
    FROM classified c
    JOIN public.audit_log a
      ON a.entity = 'attendance' AND a.operation IN ('INSERT', 'UPDATE')
     AND a.diff -> 'new' ->> 'session_id' = c.id::text
     AND (c.cancelled_at IS NULL OR a.occurred_at <= c.cancelled_at)
   ORDER BY c.id, a.diff -> 'new' ->> 'student_id', a.occurred_at DESC, a.id DESC
),
per_lesson AS (
  SELECT c.id, c.period, to_char(c.date, 'YYYY-MM') AS lesson_month, c.before_audit, c.level_at_cancel,
         (SELECT count(*) FROM last_mark m WHERE m.session_id = c.id AND m.by_person AND m.status IN ('Present', 'Late')) AS present_children,
         EXISTS (SELECT 1 FROM last_mark m WHERE m.session_id = c.id) AS any_mark,
         public.session_held_evidence(c.id) AS ev
    FROM classified c
)
SELECT period,
       coalesce(lesson_month, 'all months')                                          AS lesson_month,
       count(*)                                                                      AS lessons,
       count(*) FILTER (WHERE present_children > 0)                                  AS person_marked_present,
       coalesce(sum(present_children), 0)                                            AS children_present,
       count(*) FILTER (WHERE any_mark)                                              AS any_logged_mark,
       count(*) FILTER (WHERE before_audit)                                          AS before_audit,
       count(*) FILTER (WHERE ev ->> 'level' = 'SOFT')                               AS d1_soft_now,
       count(*) FILTER (WHERE ev ->> 'level' = 'STRONG')                             AS d1_strong_now,
       count(*) FILTER (WHERE (ev -> 'settled' ->> 'any')::boolean)                  AS settled_now,
       count(*) FILTER (WHERE (ev -> 'settled' ->> 'payroll_month_locked')::boolean) AS payroll_locked,
       count(*) FILTER (WHERE level_at_cancel = 'STRONG')                            AS strong_at_cancel
  FROM per_lesson
 GROUP BY GROUPING SETS ((period, lesson_month), (period))
 ORDER BY 1, 2;
