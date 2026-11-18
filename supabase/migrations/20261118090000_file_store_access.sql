-- File store access: one rule for files in Supabase Storage AND in Cloudflare R2.
--
-- WHY
--   Storage is over the free 1 GB. The big buckets (student work, homework,
--   video homework, lesson recordings) are moving to R2, a bucket at a time.
--   R2 has no idea who a parent or a teacher is, so a small Worker asks this
--   database before it hands out a 5-minute link. The question it asks must
--   get exactly the answer Supabase Storage would give: the S1 fixes put a
--   lot of care into those rules, and a second hand-written copy would drift.
--
-- WHAT THIS ADDS
--   file_access_can(bucket, path, op)   op is 'read', 'write' (a new file) or
--       'delete'. It evaluates the storage.objects policies AS INSTALLED, read
--       from pg_policies at call time, as the caller. So a storage policy
--       changed later applies to R2 the moment it is changed; there is
--       nothing here to keep in step. SECURITY INVOKER on purpose: the policy
--       expressions see auth.uid() and RLS exactly as Storage does.
--   file_objects   one row per file kept in R2: bucket, path, owner (who
--       uploaded it, which some policies test), size and type. It is the R2
--       twin of storage.objects. RLS: the row can be added only by its owner
--       when file_access_can says 'write', removed when it says 'delete',
--       seen by an admin or whoever may read the file.
--
-- RULES IT HOLDS
--   1. No policy, no access: a bucket with no permissive policy for the
--      command answers false. Restrictive policies are honoured (AND-ed).
--   2. A public bucket (storage.buckets.public) is readable by anyone signed
--      in, as its public URL is today.
--   3. A new file must fit the bucket's size limit and allowed types, and its
--      path may not start with '/', contain '..' or '//', or exceed 1024.
--   4. Writing never overwrites: a path already in file_objects is refused
--      (primary key), as the recorder and the upload screens expect.
--   5. The storage.buckets row stays after a bucket has moved (an empty
--      bucket costs nothing): it holds the limits and the public flag.
--
-- Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS public.file_objects (
  bucket_id   text        NOT NULL,
  path        text        NOT NULL,
  owner       uuid,
  size_bytes  bigint      NOT NULL CHECK (size_bytes >= 0),
  mime_type   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_id, path),
  CONSTRAINT file_objects_path_shape CHECK (
    length(path) BETWEEN 1 AND 1024
    AND left(path, 1) <> '/'
    AND position('..' IN path) = 0
    AND position('//' IN path) = 0)
);

-- Who uploaded a file. SECURITY DEFINER so file_access_can can read it from
-- inside file_objects' own policies without recursing into them.
CREATE OR REPLACE FUNCTION public.file_object_owner(_bucket text, _path text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $f$
  SELECT owner FROM public.file_objects WHERE bucket_id = _bucket AND path = _path
$f$;
REVOKE ALL ON FUNCTION public.file_object_owner(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_object_owner(text, text) TO authenticated, service_role;

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
    SELECT public INTO _pub FROM storage.buckets WHERE id = _bucket;
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

-- The same question for up to 200 paths at once: which of them may the
-- caller read / write / delete? One call per gallery, because a free Worker
-- may make only 50 outside calls per request.
CREATE OR REPLACE FUNCTION public.file_access_can_many(_bucket text, _paths text[], _op text)
RETURNS SETOF text
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $f$
BEGIN
  IF cardinality(_paths) > 200 THEN
    RAISE EXCEPTION 'file_access_can_many: at most 200 paths at a time, not %', cardinality(_paths);
  END IF;
  RETURN QUERY SELECT DISTINCT p FROM unnest(_paths) AS p WHERE public.file_access_can(_bucket, p, _op);
END
$f$;
REVOKE ALL ON FUNCTION public.file_access_can_many(text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_access_can_many(text, text[], text) TO authenticated, service_role;

-- A new file fits its bucket's limits.
CREATE OR REPLACE FUNCTION public.file_objects_fit_bucket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $f$
DECLARE _b record;
BEGIN
  SELECT file_size_limit, allowed_mime_types INTO _b FROM storage.buckets WHERE id = NEW.bucket_id;
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
DROP TRIGGER IF EXISTS file_objects_fit_bucket ON public.file_objects;
CREATE TRIGGER file_objects_fit_bucket BEFORE INSERT ON public.file_objects
  FOR EACH ROW EXECUTE FUNCTION public.file_objects_fit_bucket();

ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_objects_read ON public.file_objects;
CREATE POLICY file_objects_read ON public.file_objects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.file_access_can(bucket_id, path, 'read'));

DROP POLICY IF EXISTS file_objects_insert ON public.file_objects;
CREATE POLICY file_objects_insert ON public.file_objects FOR INSERT TO authenticated
  WITH CHECK (owner = auth.uid() AND public.file_access_can(bucket_id, path, 'write'));

DROP POLICY IF EXISTS file_objects_delete ON public.file_objects;
CREATE POLICY file_objects_delete ON public.file_objects FOR DELETE TO authenticated
  USING (public.file_access_can(bucket_id, path, 'delete'));

-- No UPDATE policy: a file is replaced by deleting it and writing it again.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_objects TO authenticated;
GRANT ALL ON public.file_objects TO service_role;

COMMIT;
