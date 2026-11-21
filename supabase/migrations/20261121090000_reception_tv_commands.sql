-- Reception TV: power buttons in Admin > Reception > Screen.
--
-- The admin page runs in the cloud and cannot reach the TV on the centre's
-- network, so a button leaves a command here; the helper on the centre's
-- computer (scripts/reception-tv.mjs) asks reception-feed for it every 20 s
-- with the display token, carries it out on the TV, and reports back.
--
--   tv_command          'on' | 'off' | 'show' (bring the display to the front)
--   tv_command_at       when the admin pressed it; a command older than 15
--                       minutes is ignored (the helper was not running)
--   tv_command_done_at  when the helper finished it
--   tv_command_result   what happened, in words, for the admin
--   helper_seen_at      the helper's last check-in, so the screen can say
--                       whether anyone is listening
BEGIN;

ALTER TABLE public.reception_settings
  ADD COLUMN IF NOT EXISTS tv_command         text,
  ADD COLUMN IF NOT EXISTS tv_command_at      timestamptz,
  ADD COLUMN IF NOT EXISTS tv_command_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS tv_command_result  text,
  ADD COLUMN IF NOT EXISTS helper_seen_at     timestamptz;

ALTER TABLE public.reception_settings DROP CONSTRAINT IF EXISTS reception_settings_tv_command_check;
ALTER TABLE public.reception_settings ADD CONSTRAINT reception_settings_tv_command_check CHECK (
  (tv_command IS NULL OR tv_command IN ('on', 'off', 'show'))
  AND (tv_command_result IS NULL OR length(tv_command_result) <= 300)
);

COMMIT;
