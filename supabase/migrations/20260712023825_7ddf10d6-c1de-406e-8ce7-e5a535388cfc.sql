DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.relname);
  END LOOP;
END $$;

-- Restore anon SELECT only on tables that legitimately need it (public/unauth reads)
GRANT SELECT ON public.site_announcements TO anon;
GRANT SELECT ON public.announcement_dismissals TO anon;
GRANT SELECT ON public.bank_info TO anon;

-- Sequences (needed for INSERTs using serial/identity columns)
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', s.relname);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', s.relname);
  END LOOP;
END $$;