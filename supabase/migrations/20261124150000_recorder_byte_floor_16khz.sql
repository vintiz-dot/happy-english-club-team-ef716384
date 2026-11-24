-- The recorder now captures and stores lesson audio as 16 kHz FLAC (about 2.8x smaller than 48 kHz;
-- docs/RECORDER_R2_AND_COMPRESSION.md). At 16 kHz the quietest real room chunks fall to about
-- 3.7 kB/s, under the old floor of 4000 B/s, and would be flagged below_floor and stop counting as
-- evidence. Digital silence is 138 B/s, so 1500 B/s still separates silence from a quiet room.
-- Only moves the floor while it is still the shipped default (4000); a value an admin chose is kept.
-- The floor is copied to a recording when it is armed, so this applies from the next lesson.
UPDATE public.recorder_settings
   SET min_bytes_per_sec_flac = 1500
 WHERE id = 1
   AND min_bytes_per_sec_flac = 4000;
