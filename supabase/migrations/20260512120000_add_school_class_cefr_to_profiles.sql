-- Adds K-12 school class + CEFR level to the profiles table for the
-- vocabulary page's class-selector modal.
--
-- Run via Lovable DB UI or `supabase db push`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_class TEXT,
  ADD COLUMN IF NOT EXISTS cefr_level TEXT
    CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2'));

-- Backfill: leave existing rows NULL. The modal forces selection on first visit.
