-- File store fix: read a bucket's settings with the owner's rights.
--
-- WHAT WENT WRONG (18 Nov 2026, first Smart Upload through R2)
--   storage.buckets has row security and no policy, so a signed-in person
--   sees no bucket rows at all. Two parts of 20261118090000 read it as the
--   caller:
--     - file_objects_fit_bucket (size limit, file types) found no bucket and
--       refused every upload: "No bucket called student-work". Homework
--       uploads through R2 failed the same way.
--     - file_access_can's "public bucket" check read NULL, so a public
--       bucket would have been treated as private (none is in R2 yet).
--   The tests ran as the database owner, which sees every bucket;
--   file-store-access.test.mjs now turns row security on for buckets, as
--   Supabase has it.
--
-- THE FIX
--   file_store_bucket(bucket): public flag, size limit and allowed types,
--   read with the owner's rights. It says nothing about any file and only
--   what the bucket list in the dashboard already shows to staff.
--   file_objects_fit_bucket and file_access_can use it. Nothing else changes.
--
-- Safe to run twice.

BEGIN;

CREATE OR REPLACE FUNCTION public.file_store_bucket(_bucket text)
RETURNS TABLE (is_public boolean, file_size_limit bigint, allowed_mime_types text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $f$
  SELECT coalesce(b.public, false), b.file_size_limit, b.allowed_mime_types
    FROM storage.buckets b WHERE b.id = _bucket
$f$;
REVOKE ALL ON FUNCTION public.file_store_bucket(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_store_bucket(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.file_objects_fit_bucket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $f$
DECLARE _b record;
BEGIN
  SELECT * INTO _b FROM public.file_store_bucket(NEW.bucket_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No bucket called %', NEW.bucket_id;
  END IF;
  IF _b.file_size_limit IS NOT NULL AND NEW.size_bytes > _b.file_size_limit THEN
    RAISE EXCEPTION 'File is % bytes; % allows %', NEW.size_bytes, NEW.bucket_id, _b.file_size_limit;
  END IF;
  IF _b.allowed_mime_types IS NOT NULL AND cardinality(_b.allowed_mime_types) > 0
     AND NOT (coalesce(NEW.mime_type, '') = ANY (_b.allowed_mime_types)) THEN
    RAISE EXCEPTION '% does not take % files', NEW.bucket_id, coalesce(NEW.mime_type, 'untyped');
  END IF;
  RETURN NEW;
END
$f$;

CREATE OR REPLACE FUNCTION public.file_access_can(_bucket text, _path text, _op text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $f$
DECLARE
  _cmds    text[];
  _perm    text[] := '{}';
  _restr   text[] := '{}';
  _owner   uuid;
  _pub     boolean;
  _pol     record;
  _expr    text;
  _out     boolean;
BEGIN
  IF _bucket IS NULL OR _path IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF length(_path) NOT BETWEEN 1 AND 1024 OR left(_path, 1) = '/'
     OR position('..' IN _path) > 0 OR position('//' IN _path) > 0 THEN
    RETURN false;
  END IF;

  _cmds := CASE _op
    WHEN 'read'   THEN ARRAY['SELECT', 'ALL']
    WHEN 'write'  THEN ARRAY['INSERT', 'ALL']
    WHEN 'delete' THEN ARRAY['DELETE', 'ALL']
  END;
  IF _cmds IS NULL THEN
    RAISE EXCEPTION 'file_access_can: op must be read, write or delete, not %', _op;
  END IF;

  IF _op = 'read' THEN
    SELECT is_public INTO _pub FROM public.file_store_bucket(_bucket);
    IF coalesce(_pub, false) THEN RETURN true; END IF;
  END IF;

  -- A new file is owned by whoever writes it, as Storage records it.
  _owner := CASE WHEN _op = 'write' THEN auth.uid()
                 ELSE public.file_object_owner(_bucket, _path) END;

  FOR _pol IN
    SELECT cmd, permissive, qual, with_check
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND cmd = ANY (_cmds)
       AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['authenticated']::name[])
  LOOP
    _expr := CASE WHEN _op = 'write' THEN coalesce(_pol.with_check, _pol.qual)
                  ELSE _pol.qual END;
    CONTINUE WHEN _expr IS NULL;
    IF _pol.permissive = 'PERMISSIVE' THEN
      _perm := _perm || ('(' || _expr || ')');
    ELSE
      _restr := _restr || ('(' || _expr || ')');
    END IF;
  END LOOP;

  IF cardinality(_perm) = 0 THEN RETURN false; END IF;

  -- The policies' own text, evaluated against a one-row stand-in for
  -- storage.objects. Values go in as parameters, never into the text.
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM (SELECT $1::text AS bucket_id, $2::text AS name, '
    '$3::uuid AS owner, $3::text AS owner_id) AS objects WHERE (%s)%s)',
    array_to_string(_perm, ' OR '),
    CASE WHEN cardinality(_restr) > 0
         THEN ' AND ' || array_to_string(_restr, ' AND ') ELSE '' END)
    INTO _out
    USING _bucket, _path, _owner;
  RETURN coalesce(_out, false);
END
$f$;
REVOKE ALL ON FUNCTION public.file_access_can(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_access_can(text, text, text) TO authenticated, service_role;

COMMIT;
