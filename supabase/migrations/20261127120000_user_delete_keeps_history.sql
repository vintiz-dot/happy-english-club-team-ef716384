-- Deleting a user account (Admin > Users > Delete) failed with Auth's
-- "Database error deleting user" (27 Nov 2026: audit_log_actor_user_id_fkey).
--
-- Why: about fifty "who did this" columns (audit_log.actor_user_id,
-- attendance.marked_by, payments.created_by, invoices.confirmed_by, ...) have
-- a foreign key to auth.users / public.users with NO ACTION, so any account
-- that ever did anything could never be deleted.
--
-- The fix drops those NO ACTION keys and keeps the columns as they are: the
-- history goes on naming the account's id after the account is gone. NOT
-- "ON DELETE SET NULL": attendance.marked_by IS NULL means an automatic
-- placeholder mark that the Stars sync and repair may overwrite, and the
-- audit log would lose who acted. RESTRICT keys (families.primary_user_id)
-- and CASCADE keys are left alone: a family's main login is still refused.
--
-- Safe to run twice. Dry run: the SELECT at the bottom lists what is left.

DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND c.confdeltype = 'a'                      -- NO ACTION only
      AND ns.nspname = 'public'
      AND c.confrelid IN ('auth.users'::regclass, 'public.users'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    RAISE NOTICE 'dropped %.%', r.tbl, r.conname;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'user_delete_keeps_history: % foreign keys dropped', n;
END $$;

-- Should list only families.primary_user_id (RESTRICT) now.
SELECT c.conrelid::regclass AS still_blocks_delete, c.conname
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace ns ON ns.oid = t.relnamespace
WHERE c.contype = 'f' AND c.confdeltype IN ('a', 'r') AND ns.nspname = 'public'
  AND c.confrelid IN ('auth.users'::regclass, 'public.users'::regclass);
