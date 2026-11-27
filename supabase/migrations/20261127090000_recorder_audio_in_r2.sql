-- The class recorder's audio may live in Cloudflare R2 as well as in Supabase Storage
-- (owner, 27 Nov 2026: recordings go to R2 and are deleted when done;
-- docs/RECORDER_R2_AND_COMPRESSION.md section 2).
--
-- A file in R2 is a public.file_objects row (bucket_id, path, size_bytes), written by the
-- hec-files Worker as the caller after file_access_can said yes; a file in Supabase is a
-- storage.objects row. Until now the recorder's SQL looked only at storage.objects, so once
-- `class-recorder-audio` is in R2_BUCKETS (src/lib/files.ts) every chunk would be refused
-- ("The file is not in storage"). This file teaches the four places to look in both:
--
--   recorder_confirm_chunk               "is the chunk there, at the size the recorder made?"
--   recorder__recording_before_update    complete: manifest there; every confirmed chunk still
--                                        there at its stored size. deleted: nothing left under
--                                        {class}/{recording}/ in EITHER store.
--   recorder__recording_before_delete    the row goes only when nothing is left in either store.
--   recorder_import_finish               every imported chunk there at its size.
--
-- Two helpers hold the one rule (SECURITY DEFINER, row_security off, like the functions that
-- call them: a store that cannot be read raises, so the checks fail closed, never open):
--   recorder__object_size(path)          the size Supabase reports, else the R2 row's size;
--                                        NULL when the file is in neither.
--   recorder__object_present(path)       the file is in either store.
--   recorder__has_objects_under(prefix)  any file under the prefix, in either store.
-- file_objects.size_bytes is the size the Worker signed the PUT for (the Worker refuses a body of
-- another length and removes one that ends short), so it is the stored size. As before, the database
-- cannot see the bytes themselves: the page's read-back hash (which fetches them from R2) is the proof.
--
-- Nothing else changes: who may upload, read or delete (file_access_can evaluates the recorder's
-- storage policies as installed, so R2 follows them), the paths, the sizes, the retention rule
-- (recorder_transcribed_audio_deletable, 3 hours after the report) and the evidence rules.
-- The functions are patched in their INSTALLED text (each storage.objects test replaced by a helper
-- call, found exactly once), as 20261124140000 and 20261125090000 did, so nothing else in them drifts.
--
-- PASTE: after 20261126090000, in the Supabase SQL editor, BEFORE the app build that adds
-- `class-recorder-audio` to R2_BUCKETS. Idempotent. It REFUSES to install (nothing changed) when the
-- class recorder, the import (20261125090000) or file_objects (20261118090000) is missing, or when a
-- function is not the one this file was written against. Deploy nothing for it.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.class_recordings') IS NULL
     OR to_regprocedure('public.recorder_confirm_chunk(uuid,text)') IS NULL
     OR to_regprocedure('public.recorder__recording_before_update()') IS NULL
     OR to_regprocedure('public.recorder__recording_before_delete()') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the class recorder (20261112100000) is not installed';
  END IF;
  IF to_regprocedure('public.recorder_import_finish(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the recording import (20261125090000) is not installed';
  END IF;
  IF to_regclass('public.file_objects') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the file store (20261118090000, public.file_objects) is not installed';
  END IF;
END
$pre$;

-- ================================================================ 1. the rule
CREATE OR REPLACE FUNCTION public.recorder__object_size(p_path text)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(o.metadata ->> 'size', '')::bigint FROM storage.objects o
      WHERE o.bucket_id = 'class-recorder-audio' AND o.name = p_path LIMIT 1),
    (SELECT f.size_bytes FROM public.file_objects f
      WHERE f.bucket_id = 'class-recorder-audio' AND f.path = p_path));
$function$;

CREATE OR REPLACE FUNCTION public.recorder__object_present(p_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  SELECT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'class-recorder-audio' AND o.name = p_path)
      OR EXISTS (SELECT 1 FROM public.file_objects f WHERE f.bucket_id = 'class-recorder-audio' AND f.path = p_path);
$function$;

CREATE OR REPLACE FUNCTION public.recorder__has_objects_under(p_prefix text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  -- The prefix is '{class uuid}/{recording uuid}/': no LIKE wildcards can occur in it.
  SELECT EXISTS (SELECT 1 FROM storage.objects o
                  WHERE o.bucket_id = 'class-recorder-audio' AND o.name LIKE p_prefix || '%')
      OR EXISTS (SELECT 1 FROM public.file_objects f
                  WHERE f.bucket_id = 'class-recorder-audio' AND f.path LIKE p_prefix || '%');
$function$;

REVOKE ALL ON FUNCTION public.recorder__object_size(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recorder__object_present(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recorder__has_objects_under(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recorder__object_size(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recorder__object_present(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recorder__has_objects_under(text) TO service_role;

-- ================================================================ 2. the patches
-- Each (function, pattern, replacement) must match exactly once in the installed text, or the
-- function must already carry the replacement (a second paste). Patterns allow any whitespace
-- (the SQL editor keeps whatever line endings were pasted).
CREATE TEMP TABLE recorder_r2_patch (fn text, pat text, rep text, mark text) ON COMMIT DROP;
INSERT INTO recorder_r2_patch VALUES
  ('public.recorder__recording_before_update()',
   $p$NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s*=\s*NEW\.manifest_path\s*\)$p$,
   'NOT public.recorder__object_present(NEW.manifest_path)',
   'recorder__object_present(NEW.manifest_path)'),
  ('public.recorder__recording_before_update()',
   $p$NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s*=\s*c\.storage_path\s+AND\s+NULLIF\(o\.metadata\s*->>\s*'size',\s*''\)::bigint\s*=\s*c\.stored_size\s*\)$p$,
   'NOT COALESCE(public.recorder__object_size(c.storage_path) = c.stored_size, false)',
   'recorder__object_size(c.storage_path) = c.stored_size, false)'),
  ('public.recorder__recording_before_update()',
   $p$EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s+LIKE\s+OLD\.class_id::text\s*\|\|\s*'/'\s*\|\|\s*OLD\.id::text\s*\|\|\s*'/%'\s*\)$p$,
   'public.recorder__has_objects_under(OLD.class_id::text || ''/'' || OLD.id::text || ''/'')',
   'recorder__has_objects_under(OLD.class_id::text'),
  ('public.recorder__recording_before_delete()',
   $p$EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s+LIKE\s+OLD\.class_id::text\s*\|\|\s*'/'\s*\|\|\s*OLD\.id::text\s*\|\|\s*'/%'\s*\)$p$,
   'public.recorder__has_objects_under(OLD.class_id::text || ''/'' || OLD.id::text || ''/'')',
   'recorder__has_objects_under(OLD.class_id::text'),
  ('public.recorder_confirm_chunk(uuid,text)',
   $p$SELECT\s+NULLIF\(o\.metadata\s*->>\s*'size',\s*''\)::bigint\s+INTO\s+v_size\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s*=\s*v_row\.storage_path\s*;\s*IF\s+NOT\s+FOUND\s+THEN$p$,
   E'v_size := public.recorder__object_size(v_row.storage_path);\n  IF NOT public.recorder__object_present(v_row.storage_path) THEN',
   'recorder__object_present(v_row.storage_path)'),
  ('public.recorder_import_finish(uuid)',
   $p$NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+storage\.objects\s+o\s+WHERE\s+o\.bucket_id\s*=\s*'class-recorder-audio'\s+AND\s+o\.name\s*=\s*c\.storage_path\s+AND\s+NULLIF\(o\.metadata\s*->>\s*'size',\s*''\)::bigint\s*=\s*c\.byte_size\s*\)$p$,
   'NOT COALESCE(public.recorder__object_size(c.storage_path) = c.byte_size, false)',
   'recorder__object_size(c.storage_path) = c.byte_size, false)');

DO $check$
DECLARE
  p record;
  v_def text;
  v_n integer;
BEGIN
  FOR p IN SELECT * FROM recorder_r2_patch LOOP
    v_def := pg_get_functiondef(p.fn::regprocedure);
    IF strpos(v_def, p.mark) > 0 THEN CONTINUE; END IF;  -- pasted before
    SELECT count(*) INTO v_n FROM regexp_matches(v_def, p.pat, 'g');
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'Refusing to install: % is not the function this file was written against (a storage check found % times)', p.fn, v_n;
    END IF;
  END LOOP;
END
$check$;

DO $patch$
DECLARE
  v_fn text;
  v_def text;
  p record;
BEGIN
  FOR v_fn IN SELECT DISTINCT fn FROM recorder_r2_patch LOOP
    v_def := pg_get_functiondef(v_fn::regprocedure);
    FOR p IN SELECT * FROM recorder_r2_patch WHERE fn = v_fn LOOP
      IF strpos(v_def, p.mark) = 0 THEN
        -- regexp_replace treats \ and & in the replacement specially; none of ours contains them.
        v_def := regexp_replace(v_def, p.pat, p.rep);
      END IF;
    END LOOP;
    -- pg_get_functiondef writes CREATE OR REPLACE with SECURITY DEFINER, search_path and row_security
    -- exactly as installed, so only the replaced tests change.
    EXECUTE v_def;
  END LOOP;
END
$patch$;

-- ================================================================ 3. check before commit
DO $post$
DECLARE
  v_fn text;
  v_def text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['public.recorder__recording_before_update()', 'public.recorder__recording_before_delete()',
                              'public.recorder_confirm_chunk(uuid,text)', 'public.recorder_import_finish(uuid)'] LOOP
    v_def := pg_get_functiondef(v_fn::regprocedure);
    IF v_def ~ 'FROM\s+storage\.objects' THEN
      RAISE EXCEPTION '% still reads storage.objects directly after the patch: nothing installed', v_fn;
    END IF;
    IF v_def NOT LIKE '%SECURITY DEFINER%' THEN
      RAISE EXCEPTION '% lost SECURITY DEFINER: nothing installed', v_fn;
    END IF;
  END LOOP;
  IF pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) NOT LIKE '%recorder_transcribed_audio_deletable%' THEN
    RAISE EXCEPTION 'The 3-hour deletion rule is missing from the recording update trigger: nothing installed';
  END IF;
END
$post$;

COMMIT;
