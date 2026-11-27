-- "Your lesson report is ready to review" in the teacher's notification bell (owner, 27 Nov 2026: the teacher's
-- only step after a lesson is to approve the ready report, so the app tells them when it is ready).
--
-- When a lesson's class report draft becomes ready (lesson_report_finish sets status 'ready'; a rebuild with new
-- class work does it again with a new run number) and the report is not approved yet, the lesson's teacher
-- (sessions.teacher_id, else the class's default teacher) gets ONE notification of type 'lesson_report_ready'
-- with the session id; a rebuilt draft replaces that teacher's unread notice for the lesson instead of adding
-- another. The bell (src/components/NotificationBell.tsx) shows it to the teacher and opens
-- /teacher/lesson-report/<session id>. It uses the existing notifications table and its policies (a person reads
-- only their own rows); nothing new reaches a family. The notice names the class and the date, never a child.
-- A failure here never blocks the draft (the notice is skipped).
--
-- PASTE: after 20261127090000, in the Supabase SQL editor. Idempotent. Refuses to install without the lesson
-- reports (20261121130000) or the notifications table. Deploy nothing for it.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.lesson_report_drafts') IS NULL OR to_regclass('public.lesson_reports') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the lesson reports (20261121130000) are not installed';
  END IF;
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: there is no notifications table';
  END IF;
END
$pre$;

CREATE OR REPLACE FUNCTION public.lesson_report__ready_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_class text;
  v_date date;
BEGIN
  IF NEW.status IS DISTINCT FROM 'ready' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'ready' AND OLD.run = NEW.run THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_reports r WHERE r.session_id = NEW.session_id) THEN RETURN NEW; END IF;
  BEGIN
    SELECT t.user_id, c.name, s.date INTO v_user, v_class, v_date
      FROM public.sessions s
      JOIN public.classes c ON c.id = s.class_id
      LEFT JOIN public.teachers t ON t.id = COALESCE(s.teacher_id, c.default_teacher_id)
     WHERE s.id = NEW.session_id;
    IF v_user IS NULL THEN RETURN NEW; END IF;
    DELETE FROM public.notifications
     WHERE user_id = v_user AND type = 'lesson_report_ready' AND is_read = false
       AND metadata ->> 'session_id' = NEW.session_id::text;
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (v_user, 'lesson_report_ready', 'Lesson report ready to review',
            COALESCE(v_class, 'Your class') || COALESCE(', ' || to_char(v_date, 'DD Mon'), '')
              || ': the class report is ready. Check it and approve it.',
            jsonb_build_object('session_id', NEW.session_id, 'class_id', NEW.class_id, 'class_name', v_class,
                               'lesson_date', v_date, 'run', NEW.run));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'lesson report notice skipped: %', SQLSTATE;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_report__ready_notice() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lesson_report_drafts_ready_notice ON public.lesson_report_drafts;
CREATE TRIGGER lesson_report_drafts_ready_notice
  AFTER INSERT OR UPDATE OF status, run ON public.lesson_report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.lesson_report__ready_notice();

COMMIT;
