-- Audit voice clips: an admin-only store of video/audio clips of children,
-- each tagged to a student, for the speaker-identification audit.
--
-- WHAT THIS ADDS
--   audit_clip_subjects   one row per child in the audit: a stable code
--                         (S01, S02 ...) and the admin's record that the
--                         parents consented. No code, no upload.
--   audit_clips           one row per file: which child, clip number, size,
--                         an optional delete-after date.
--   audit-clips (bucket)  private. Path is {code}/{clip}-{filename}, so the
--                         file store itself never carries a name or a
--                         student id.
--
-- RULES IT HOLDS
--   1. Admin only. There is no teacher, family or student policy anywhere:
--      not on the tables, not on the bucket.
--   2. A clip cannot be added for a child whose consent has not been
--      recorded (trigger), whatever the client sends.
--   3. Clip numbers and codes are assigned by the database, so the files
--      export as S01_clip1.mp4 and match the audit folder's naming.
--   4. Withdrawing consent removes the subject row; the clips go with it
--      (ON DELETE CASCADE). The page removes the files from storage first.
--
-- Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_clip_subjects (
  student_id           uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  code                 text NOT NULL UNIQUE CHECK (code ~ '^S[0-9]{2,}$'),
  consent_confirmed_at timestamptz NOT NULL DEFAULT now(),
  consent_note         text,
  confirmed_by         uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_clips (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES public.audit_clip_subjects(student_id) ON DELETE CASCADE,
  clip_no        integer NOT NULL,
  storage_path   text NOT NULL UNIQUE,
  original_name  text,
  mime_type      text,
  size_bytes     bigint,
  source_note    text,
  delete_after   date,
  uploaded_by    uuid,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_clips_number_per_child UNIQUE (student_id, clip_no)
);

CREATE INDEX IF NOT EXISTS idx_audit_clips_student ON public.audit_clips (student_id, clip_no);
CREATE INDEX IF NOT EXISTS idx_audit_clips_expiry ON public.audit_clips (delete_after)
  WHERE delete_after IS NOT NULL;

-- Next clip number for a child, assigned in the database so two uploads
-- at once cannot both become clip 3.
CREATE OR REPLACE FUNCTION public.audit_clips_assign_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.audit_clip_subjects WHERE student_id = NEW.student_id) THEN
    RAISE EXCEPTION 'Consent has not been recorded for this student';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('audit_clips:' || NEW.student_id::text));
  SELECT COALESCE(MAX(clip_no), 0) + 1 INTO NEW.clip_no
  FROM public.audit_clips WHERE student_id = NEW.student_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_clips_assign_number ON public.audit_clips;
CREATE TRIGGER audit_clips_assign_number
  BEFORE INSERT ON public.audit_clips
  FOR EACH ROW EXECUTE FUNCTION public.audit_clips_assign_number();

-- Record consent for a child and give them their code. Idempotent: asking
-- again returns the same code.
CREATE OR REPLACE FUNCTION public.audit_clip_enrol(p_student uuid, p_consent_note text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_next integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only an admin can add a child to the audit';
  END IF;
  IF p_consent_note IS NULL OR btrim(p_consent_note) = '' THEN
    RAISE EXCEPTION 'Say how the parents consented (for example "written, 3 Nov")';
  END IF;

  SELECT code INTO v_code FROM public.audit_clip_subjects WHERE student_id = p_student;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('audit_clip_subjects'));
  SELECT COALESCE(MAX(substring(code from 2)::integer), 0) + 1 INTO v_next
  FROM public.audit_clip_subjects;
  v_code := 'S' || lpad(v_next::text, 2, '0');

  INSERT INTO public.audit_clip_subjects (student_id, code, consent_note, confirmed_by)
  VALUES (p_student, v_code, btrim(p_consent_note), auth.uid());
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_clip_enrol(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_clip_enrol(uuid, text) TO authenticated;

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.audit_clip_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_clip_subjects_admin ON public.audit_clip_subjects;
CREATE POLICY audit_clip_subjects_admin ON public.audit_clip_subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS audit_clips_admin ON public.audit_clips;
CREATE POLICY audit_clips_admin ON public.audit_clips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 20260712023825 revoked the public defaults, so grant explicitly.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_clip_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_clips TO authenticated;
GRANT ALL ON public.audit_clip_subjects TO service_role;
GRANT ALL ON public.audit_clips TO service_role;

-- ---------------------------------------------------------------- storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audit-clips', 'audit-clips', false, 262144000,
        ARRAY['video/mp4', 'video/webm', 'video/quicktime',
              'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS audit_clips_storage_insert ON storage.objects;
CREATE POLICY audit_clips_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-clips' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS audit_clips_storage_select ON storage.objects;
CREATE POLICY audit_clips_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audit-clips' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS audit_clips_storage_delete ON storage.objects;
CREATE POLICY audit_clips_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audit-clips' AND public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
