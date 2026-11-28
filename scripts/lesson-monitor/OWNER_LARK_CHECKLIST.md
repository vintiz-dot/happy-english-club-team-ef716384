# Four Lark mics in class: the owner's checklist (28 Nov 2026)

The teacher wears the GCK lapel (the recorder's `teacher` track), the S500 stays where it is (`room`), and the four
Hollyland LARK MAX 2 transmitters sit among the children, about 3 children per mic. After class the server lines the
four files up with the room, works out who spoke when, and the report shows talk time again.

## Once

1. **Number stickers 1, 2, 3, 4** on the four transmitters (big, on the front). The number is the mic's name
   everywhere: on the mic board, in the import page, in the report.
2. In the **Hollyland app**, for EACH transmitter:
   - Internal recording: **ON**, format **32-bit float**.
   - Noise cancelling: **OFF** (it removes quiet children).
   - Low-cut: **OFF**.
   - Timecode: **ON** (if your app version offers it).
   - Set the transmitters' clock from the phone if the app offers it (a correct clock helps the first guess).
3. Paste the migration `supabase/migrations/20261128180000_lesson_monitor_report_mics_part.sql` in the Supabase SQL
   editor, **after** `20261127110000_lesson_monitor_report_voice_part.sql` (and after the Lark import and mic board
   migrations, `20261128090000_lesson_mic_seats.sql` and `20261128120000_recorder_lark_tracks.sql`). Until it is pasted the reports
   still save, but without talk time.

## Every lesson

1. Clip the GCK lapel on the teacher, chest height.
2. Put the four transmitters among the children, each in the middle of its 3 children, about 30-50 cm from them,
   not touching the table edge (knocks are loud).
3. Fill in the **mic board** in the app: which child sits at mic 1, 2, 3, 4. If a child moves, move them on the board
   (it is a hint; the server also notices when a child's voice keeps coming from another mic and suggests a fix).
4. Start the in-app recorder as usual, then **start recording on all 4 transmitters**.
5. **Clap 3 times, sharply, in the middle of the room** (about one clap a half second: clap - clap - clap).
6. Teach.
7. At the end, **the same 3 claps** in the middle of the room, BEFORE stopping anything.
8. Stop the 4 transmitters, then the in-app recorder.
9. **Import after class**: on the Lark import page, upload each transmitter's files under its sticker number. The
   server waits for the import (up to 6 hours after the lesson when the mic board was filled in) before it starts.

The claps let the server line the files up to the millisecond and check the transmitters' clocks did not slip.
If they are forgotten it still tries (from the teacher's voice, heard on every mic), and says in the report's
settings if a mic could not be lined up; that mic is then left out.

## Voices: "My voice card" (2-3 minutes a child, 3-4 children a lesson)

So the server can tell the children apart, each child does this once at their mic, with the teacher tapping the
child on "Who's speaking" just before they start (and "stop" after):

1. Read the three sentences on the card aloud (about 40 s).
2. Answer three of the card's questions in full sentences (about 60 s).
3. Talk about the picture, or their weekend, without stopping (about 40 s).

Nobody else talks meanwhile. The cards, by level, are in `scripts/lesson-monitor/enrol.py` (`ACTIVITY_CARDS`).
The report then shows one voice group per child; **nothing is learned until the teacher confirms it** ("this is
<child>") on the review page. A tap alone never teaches a voice.

## Checking it

- `python scripts/lesson-monitor/replay.py <recording id>` (on the server, as the job account) runs the speaker
  engine again on a lesson whose audio is still there, uploads nothing, and prints for each child: named and right,
  named and wrong, unsure, and seconds, against the teacher's taps. The target is under 5 % wrong among named.
- `python scripts/lesson-monitor/voice_admin.py accuracy --engine lark` scores the new engine against every answer
  teachers have given on its voice groups.
