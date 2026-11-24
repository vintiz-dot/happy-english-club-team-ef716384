# Lesson monitor pilot - the owner's runbook

Your decision (D-28, 17 Nov 2026): "lesson pilo yes. with venus teacher victor." That is Option A of `docs/LESSON_MONITOR_DESIGN.md`: one class (Venus), one teacher (Victor), four weeks, the report for Victor only, made overnight on the office laptop, no voiceprints, nothing sent to families or abroad.

Nothing here starts by itself. The pilot begins only when all four conditions in section 1 are true, and you switch it on (section 3).

## What it does, in one paragraph

After a Venus lesson recorded by the class recorder, you start the job on the office laptop in the evening. It signs in as you, downloads that lesson's recording from the app (the same audio the recorder already keeps for 30 days), writes down what was said with a free program on the laptop itself, checks which of the lesson's target words were heard, deletes its copy of the audio, and saves a short report that only Victor can open, under **Lesson reports** in his menu. In the app nobody else can open it: not the office, not parents, not children (you cannot either, as an admin). On the laptop it is different, and you should know it: while the job runs the report is in the laptop's memory, so whoever sits at that laptop can read it, and if a report is kept as a local draft (`--no-upload`, or a save that failed) it is a plain file in `pilot\drafts`, readable by whoever can open that folder. Use the separate Windows account and BitLocker (section 5) for that reason. Reports are deleted 30 days after the lesson. The computer never names a child.

## 1. The four conditions - check each before switching on

### Condition 1 - three Venus lessons recorded with both microphones

1. Finish the hardware checklist `docs/evidence/C5-owner-hardware-checklist.md`.
2. Victor records at least three real Venus lessons with **Class recorder** (both microphones plugged in).
3. Check in the Supabase SQL editor (read-only):

```sql
select r.session_date, r.status,
       (select count(*) from public.class_recording_tracks t
         where t.recording_id = r.id and coalesce(t.chunk_count, 0) > 0) as tracks_with_audio
  from public.class_recordings r join public.classes c on c.id = r.class_id
 where c.name ilike 'Venus%' and r.purpose = 'lesson'
 order by r.session_date desc;
```

Condition 1 is met when at least three rows show `status = complete` and `tracks_with_audio = 2`.

### Condition 2 - the consent lines are on the form, and every Venus parent has answered

Add these lines to the consent form as separate lines, each with its own yes/no box. A parent can say no to one line without saying no to the others. They are version **`monitor-v1-2026-11`** (the app checks this version). A Vietnamese data-protection adviser has not checked this wording yet. Have the adviser check it, and fix the translation, before the form goes out.

> **Lesson notes made by a computer (pilot, Venus class, about four weeks)**
>
> ☐ Yes ☐ No - After a lesson, a computer **at the school** listens to the lesson recording and writes down what was said, so the teacher can look back at the lesson. The recording is not sent to any other company or country.
>
> ☐ Yes ☐ No - The written notes are kept in the school's app for **30 days** and can be opened **only by the class teacher**. They are not shown to parents, children or other staff, and nothing from them is added to my child's record in this pilot.
>
> ☐ Yes ☐ No - The computer does **not** recognise or store anyone's voice. It does not know which child is speaking and never names a child. It may measure how much of the lesson the teacher talked compared with the class as a whole, never for one child.
>
> I can withdraw at any time by telling the office. If I do, the computer stops for the whole class and the notes already made for the class are deleted that day.

Vietnamese draft (the adviser must check it):

> **Ghi chép buổi học do máy tính thực hiện (thí điểm, lớp Venus, khoảng bốn tuần)**
>
> ☐ Đồng ý ☐ Không đồng ý - Sau mỗi buổi học, một máy tính **tại trường** nghe bản ghi âm buổi học và ghi lại những gì đã nói, để giáo viên xem lại buổi học. Bản ghi âm không được gửi cho bất kỳ công ty hay quốc gia nào khác.
>
> ☐ Đồng ý ☐ Không đồng ý - Bản ghi chép được lưu trong ứng dụng của trường **30 ngày** và **chỉ giáo viên của lớp** mới mở được. Phụ huynh, học sinh và nhân viên khác không xem được, và trong đợt thí điểm này không có nội dung nào được đưa vào hồ sơ của con tôi.
>
> ☐ Đồng ý ☐ Không đồng ý - Máy tính **không** nhận dạng hay lưu giọng nói của bất kỳ ai. Máy không biết em nào đang nói và không bao giờ ghi tên một em. Máy có thể đo thời gian giáo viên nói so với cả lớp, không bao giờ đo cho riêng một em.
>
> Tôi có thể rút lại sự đồng ý bất cứ lúc nào bằng cách báo cho văn phòng. Khi đó máy tính dừng cho cả lớp và các ghi chép đã có của lớp sẽ bị xóa trong ngày.

All three lines need a yes. **One child without a yes means Venus is not processed.** The room microphone cannot leave one child out. The app refuses to switch on in that case.

Record the answers. Keep the signed forms in the office, and write down where (for example "office folder M"). In a terminal, from the repo folder (`PY` is the pilot's Python, see condition 4):

```powershell
PY scripts\lesson-monitor\pilot_admin.py find --class Venus --teacher Victor          # prints the class id and Victor's teacher id
PY scripts\lesson-monitor\pilot_admin.py consent-all --class-id <Venus id> --note "signed monitor lines, office folder M"
```

It asks for your app email and password (hidden). It prints how many children it recorded and how many are still missing. The missing number must be 0. A parent who says no, or later withdraws:

```powershell
PY scripts\lesson-monitor\pilot_admin.py consent --student-id <id from the child's page address /students/<id>> --withdrawn --note "parent phoned, 21 Nov"
```

A withdrawal switches Venus off and deletes Venus's reports straight away. A new child joining Venus without the lines stops that night's processing until you record theirs.

**Victor is recorded too.** Give him the teacher notice in section 8 in writing before the first night.

### Condition 3 - step 0: Victor checks 5 minutes of the laptop's transcript

This checks the free program before anything is shown. You can use the first real class's two files already under `C:\Users\Dell\hec-audio-eval\lessons` (the lapel file and the room file of the same lesson), or a recorded Venus lesson once the monitor lines are signed.

```powershell
PY scripts\lesson-monitor\step0.py make --teacher "<lapel file>" --room "<room file>" --start 600
#   or:  PY scripts\lesson-monitor\step0.py make --recording <recording id> --start 600
```

It takes about 15 minutes. It makes a folder under `pilot\step0\`. Give Victor `INSTRUCTIONS.txt`, `sample_listen.wav`, `marking_words.csv` and `marking_talk.csv` **on the laptop itself**, never by Zalo, email or USB. He needs about 45 minutes. He marks:

- per line: words wrong or missing; children's grammar mistakes he heard; how many of those were written as said;
- per 10 seconds: T (him), O (others), B (both) or - (nobody).

Then:

```powershell
PY scripts\lesson-monitor\step0.py score
```

| Bar (from the design; you may change them) | Result |
|---|---|
| At most 5 % of written words wrong or missing | must pass, or the pilot does not start (then consider Option C) |
| Children's grammar mistakes kept as said in at least 9 of 10 (at least 10 cases; if fewer, mark a second sample) | must pass, or the pilot does not start |
| Teacher's share of speaking time within 10 points of Victor's own marks | if it fails, the talk-time part is simply left out of every report |

The result is saved in `pilot\step0\result.json`. The overnight job refuses to start until words and grammar have passed.

**Your ruling, 20 Nov 2026:** Victor's check of 12 Nov stands for step 0. He marked a 5-minute clip: about 17 wrong or missed words in about 540 (about 3 %), and children's mistakes kept as said in 39 of 40 turns. Both pass the bars above. That clip was the Azure transcript (the evaluation), not the laptop's own program, which agrees with Azure about 87 % on clips but has not been checked by a person. `result.json` records it that way, and talk-time is left out of every report (it was never marked per 10 seconds).

### Condition 4 - BitLocker on, and a separate Windows account for the job

**BitLocker.** Open PowerShell **as administrator** and run `manage-bde -status C:`. It must say `Protection Status: Protection On` and `Conversion Status: Fully Encrypted`. Or open Settings > Privacy & security > Device encryption (or Control Panel > BitLocker Drive Encryption): it must say **On** for drive C:. If it is off, turn it on there and keep the recovery key somewhere safe away from the laptop. This was not checked during the build.

**A separate account** that staff do not use:

1. Settings > Accounts > Other users > Add account > "I don't have this person's sign-in information" > "Add a user without a Microsoft account". Name it `hec-pilot`, give it a password only you know, and leave it as a **Standard** user.
2. Sign in as `hec-pilot` once. Create `C:\hec-pilot\`. Right-click > Properties > Security: remove every user except `hec-pilot`, SYSTEM and Administrators.
3. As `hec-pilot`, install the pilot's own copy (not the evaluation folder, which holds the evaluation's children's data):
   ```powershell
   py -3.13 -m venv C:\hec-pilot\.venv
   C:\hec-pilot\.venv\Scripts\python.exe -m pip install faster-whisper==1.2.1 soundfile scipy numpy pytest
   ```
   Copy only the model folder `C:\Users\Dell\hec-audio-eval\models\faster-whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo` to `C:\hec-pilot\models\faster-whisper\` (as the Dell account, then fix the permissions as in step 2). Copy the repo's `scripts\lesson-monitor\` and `scripts\lesson-eval\common.py` to `C:\hec-pilot\code\scripts\` with the same folder names.
4. In the `hec-pilot` account, set these once (Start > "Edit environment variables for your account"):
   `HEC_EVAL_ROOT = C:\hec-pilot` · `HEC_SUPABASE_URL` and `HEC_SUPABASE_PUBLISHABLE_KEY` = the two **public** values from the repo's `.env` lines `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (the same ones the website uses; they are not secrets).
5. From then on `PY` means `C:\hec-pilot\.venv\Scripts\python.exe`, and the commands run from `C:\hec-pilot\code\`. Everything the pilot makes goes to `C:\hec-pilot\pilot\` and nowhere else.
6. Check it: `PY -m pytest scripts\lesson-monitor\tests -q` should pass (it uses made-up data only).

## 2. Paste the database change and release the screen

1. Paste `supabase/migrations/20261117090000_lesson_monitor_pilot.sql` into the Supabase SQL editor and run it. It refuses to install if the class recorder is not there. It is safe to run twice.
   Then paste `supabase/migrations/20261120090000_lesson_monitor_cover_earlier.sql` (it lets `switch-on --from` cover lessons already recorded). It refuses to install without the first one, and is safe to run twice.
2. Publish the app: the new screen is `/teacher/lesson-reports` ("Lesson reports"). It appears in the menu only for a teacher of a pilot class.
3. No edge function is added or changed.

## 3. Switch it on (after all four conditions)

```powershell
PY scripts\lesson-monitor\pilot_admin.py switch-on --class-id <Venus id> --teacher-id <Victor's teacher id> --note "signed monitor lines, office folder M"
#   cover lessons already recorded too (your ruling, 20 Nov: "cover all available recordings"):
PY scripts\lesson-monitor\pilot_admin.py switch-on --class-id <Venus id> --teacher-id <Victor's teacher id> --note "held by the school's lawyer" --from 2026-11-19
```

It runs for 28 days from today. The app refuses if any Venus child lacks the lines, if the note is empty, or if the teacher does not teach Venus. Only lessons **Victor** taught, from today on (or from the `--from` date, at most 30 days back), are processed. With `--from`, every earlier recorded lesson must also have had every child in it consented on that day, or nothing is moved. A lesson a cover teacher taught is refused: that teacher was not asked.

## 4. Each evening

1. Sign in to Windows as `hec-pilot`. Plug the laptop in. Do not run other heavy work that night.
2. In PowerShell: `cd C:\hec-pilot\code` and run `PY scripts\lesson-monitor\nightly.py`.
3. The first time, type your app email and password. They are hidden and never saved. From 24 Nov 2026 every script (`nightly.py`, `pilot_admin.py`, `voice_admin.py`) then remembers the sign-in on this Windows account and stops asking. It keeps the app's session, never the password, sealed by Windows in `%USERPROFILE%\.hec-pilot\session.bin`, which another account or computer cannot open. It asks again only if the session is refused (you signed out of all devices, changed your password, or did not use it for a long time). `py -3 scripts\lesson-monitor\supa.py forget` makes it forget.
4. It prints how many lessons are waiting, which it will do tonight (oldest first, as many as finish by 07:00, at most 3), and any it refuses (a missing consent, a cover teacher). About **2 hours per lesson**. Leave the window open and the laptop awake (set Settings > System > Power > "When plugged in, put my device to sleep after" to **Never** in this account).
5. In the morning, look at the last lines of `C:\hec-pilot\pilot\logs\nightly-<date>.log`. Each lesson ends with `report saved` and `audio copy deleted (0 files left)`. The log holds ids and counts, never words from the lesson.

Other ways to run it:
- `nightly.py --list`: show what is waiting; do nothing.
- `nightly.py --token`: paste an access token instead of the password. It cannot be renewed and lasts about an hour, so reports that finish later stay as local drafts. Then run `nightly.py --upload-drafts` the next day.
- `nightly.py --no-upload`: the design's original local-only way. The report stays on this laptop as `pilot\drafts\<id>.html`, for Victor to read on the laptop.
- A line `AT RISK` means a waiting lesson's audio will be deleted by the recorder within 3 days. Run another night, or accept that it will not get a report.

## 5. What Victor sees

**Lesson reports** in his menu, one per processed lesson, newest first. Each opens on a summary:
- fixed lines: written by a computer, words may be wrong or missing; Vietnamese is not transcribed; the computer does not know who is speaking and never names a child; "not written" does not mean "not said";
- flags about the class, each linked to the moment. For example: no speech from the room for 12 minutes; 3 of 10 target words not written; room microphone missing after 54:51; teacher microphone too loud;
- target words: heard (with times he can click to listen) or "not written". They come from the words he typed for that lesson, or else from the class's video homework word list. He can type words for coming lessons on the same screen;
- only if step 0 passed for it: "You about 65-75 % / others about 25-35 % of speaking time", always as a range, with a strip showing when;
- the transcript underneath, opened only when he wants it. Grey lines: words may be wrong or missing. Faded lines: no matching sound. Dashed bands: room speech that was not written down (an estimate). Clicking a time plays that moment of the recording, for as long as the recorder keeps the audio (30 days).

He can delete a report at once (it is not made again). After each report he can note how many minutes it took and whether he used anything from it. **Only those two answers reach you**, never the report. He can also stop the pilot himself (**Stop the pilot**).

## 6. Stop rules (from the design)

Stop the pilot early if Victor's **median reading time is over 15 minutes**, or if in **two of the four weeks he used nothing** from it. To check:

```powershell
PY scripts\lesson-monitor\pilot_admin.py status
```

It prints, per class: reports made, how many Victor opened, his median minutes, the weeks with nothing used, and `stop: True/False` with the reason. It also counts the job's runs: saved, refused (with the reason) and failed.

## 7. Stopping and deleting

**Kill switch (stop now, delete nothing):**
- Victor: **Stop the pilot** on his screen.
- You, on the laptop: `PY scripts\lesson-monitor\stop.py on --class-id <Venus id>`. This switches Venus off in the app and also creates `pilot\STOP`. A job that is running stops within seconds and deletes its audio copy, and no job starts while the file is there. `stop.py on` without `--class-id` stops only this laptop. `stop.py off` removes the laptop switch but never switches Venus back on. Switching back on is `pilot_admin.py switch-on` again, with the same checks.
- Or `pilot_admin.py switch-off --class-id <Venus id>`.

**Delete everything the pilot made (one command):**

```powershell
PY scripts\lesson-monitor\delete_pilot.py               # type YES; signs in as you (admin)
PY scripts\lesson-monitor\delete_pilot.py --consents    # also the monitor consent records
```

In the app, this deletes every pilot report (the transcripts), the target words, the run records and the class switch. On the laptop, it deletes everything under `pilot\`: audio copies, drafts, step 0 samples and sheets, and logs. It then lists the folder again and prints how many files are left, which must be 0. It leaves the kill switch ON. It does not touch the recorder's own recordings (they follow the recorder's 30-day retention), the evaluation folders or the repo. The app's audit log is not deleted, but after this command it holds no child ids (every `student_id` in it is cleared); it keeps event names, dates, class and recording ids and counts. If the sign-in or the app call fails, the laptop part still runs and the command prints `app: NOT DONE` and exits 2: run it again, signed in, to clear the app's rows. Supabase's own backups may still hold deleted rows for their retention period (not checked).

When the evaluation itself ends, delete its data too: `delete_voiceprints.py --yes`, `delete_all_derived.py --yes`, and the `audit-eval-proxy` teardown (`scripts/lesson-eval/teardown_audit_eval.md`). That is separate from this pilot.

## 8. Teacher notice for Victor (give it in writing before the first night)

> During the lesson monitor pilot (Venus, about four weeks), the school laptop writes down what was said in your Venus lessons from the class recorder's recordings, overnight, and gives you a report the next morning under **Lesson reports**. The report is yours. In the app only you can open it: not the office, not the owner, not parents or children. On the school laptop, while the job runs overnight, whoever is sitting at the laptop could read it, and if a copy is kept as a local file in the pilot folder, whoever can open that folder could read it; the laptop is a separate locked account for this reason. It is deleted 30 days after the lesson, or sooner if you delete it. If a check passes, it shows a rough range of how much of the speaking time was yours and how much was the class's. That is for you to use. It is not used to judge or pay you. The office sees only the number of minutes you say each report took and whether you used anything from it. You can stop the pilot at any time from the screen.

## 9. Not done or not checked in this build

- Not run on any real lesson. It was tested with made-up audio and lines, a fake database and storage, and the database rules in an in-process Postgres. The real model was loaded offline once, on synthetic noise.
- The speed on a full real lesson is the B2b projection (about 2 hours). It was not measured end to end.
- BitLocker, the separate account and the consent wording (and its Vietnamese) were not checked. They are your conditions 2 and 4.
- **Where the report is kept differs from the design.** The design's pilot (s.3, step 4) kept the report on the laptop and wrote nothing to the app. This build saves it in the app, readable only by Victor, as asked when the pilot was approved. The transcript can contain names that were spoken in class ("Anna, can you..."), so they are now in the app's database, next to the audio the recorder already keeps there. **Owner's ruling (N-1), verbatim:** "it's ok to send names. the students use psuedo names in class". So spoken names in transcript lines are allowed; the database still refuses a report body with a student id or name FIELD. The conductor's ruling is that the report stays in the app. `nightly.py --no-upload` stays only because it now obeys every rule: it keeps a report on the laptop only when the database says, at that moment, that the class is on and every child has consent; it deletes the draft at the next start when the database no longer allows it; and `stop.py on` and `delete_pilot.py` remove it. Whoever can open `pilot\drafts` can read such a draft.
- **Withdrawal and the kill switch reach a running job.** The job asks the database (`lesson_monitor_may_continue`) between chunks, while it transcribes and before it keeps or saves anything. If the answer is no, it stops, deletes its audio copy and any draft of that lesson. If the database cannot be reached for more than 2 minutes, it also stops and deletes (silence is not a yes); with `--token` the pasted token lasts about an hour, so the job must finish inside it. Not everything can be checked in code: a visitor or a child who is not enrolled on the lesson date is recorded without a consent record, and the server treats such a lesson as lacking consent only for children it knows of.
- **Step 0** obeys the kill switch, goes through the same database check as the job (`lesson_monitor_begin`, which also writes the audit line), and deletes the 5-minute audio and the sheets when it fails and when you run `step0.py score` (only `result.json` stays).
- Voice groups (design feature D) and per-child stretches (E) are not built. Option A as approved names nobody, so neither is needed.
- The class recorder must keep working as it does now. The pilot only reads what it stores.

## 10. Voices: who said each line (added 24 Nov 2026, design Option B)

You asked for this on 24 Nov 2026 ("include voice biometrics"). It changes one line of section 5: with voices switched on, the report **does** put children's names on lines. A name comes from the teacher's tap, from the teacher's answer, or, shown as a question ("Bee?"), from the computer's guess.

**What it can do (measured before it was built, test B2 in the design):** a short answer of 2 seconds is recognised about 1 time in 6. A child who speaks for 8 seconds or more is recognised about 8 times in 10, and the wrong child is named about 1 time in 100. When children talk over each other, a voice group may hold more than one child. So most short answers stay unnamed until the teacher names their group, and every guess waits for the teacher's yes.

**Set-up, once:**
1. Paste `supabase/migrations/20261124120000_lesson_monitor_voiceprints.sql` in the SQL editor. Until you do, the job prints `voices: off` and reports look as before.
2. For each class, record the **voiceprint** consent. It is separate from the monitor consent, so a parent can refuse one and keep the other. Record it only when you hold that signed line for every child:
   ```powershell
   PY scripts\lesson-monitor\voice_admin.py consent-all --class-id <class id> --note "signed voiceprint lines, office folder M"
   ```
   A single child's withdrawal: `voice_admin.py consent --student-id <id> --withdrawn --note "parent phoned <date>"`. This clears that child from every guess at once and deletes the child's voiceprint on this laptop.
3. Teach the laptop each child's voice. In a recorded lesson, open **Who's speaking** on the recorder screen, tap one child, let them talk for about a minute (introduce themselves, read a page), then tap the next child. The overnight job learns each tapped turn of a child with voiceprint consent. Check who is known well enough: `voice_admin.py list` shows each child's seconds of voice. A child is compared only after 20 seconds; a minute or more is better.

**Each night, nothing new to do:** `nightly.py` now also:
- deletes the voiceprint of any child without voiceprint consent;
- learns from the voices the teacher named in the app since the last run;
- groups each lesson's children's lines by voice and guesses a name only when one child is clearly closest.

It adds about 1-2 seconds per child's line (the voice model loads once, in about 40 seconds).

**Tapping during a lesson is now lighter:** a tap on a child means "this child now". The next child's tap ends the last one's turn, so nobody needs tapping off. The teacher never taps themself, because their microphone shows when they speak. A child's turn ends on its own when the teacher speaks, or after a minute. Hold a name to add a second child for a conversation.

**What the teacher sees:** under the summary, **Voices in this lesson**. Each voice group shows a few of its lines (click a time to listen), the computer's guess ("Sounds like Bee?") or "not sure", and buttons: **Yes, Bee**, another child, **Several voices**, **Me (the teacher)**, **Don't know**. One answer names every line of that group in the transcript, and **Change** undoes it. A named child with voiceprint consent becomes better known to the laptop, and a changed answer takes the wrong voice samples back out.

**Is it getting it right?** `voice_admin.py accuracy` counts the guesses the teacher answered: how many were the right child, another child, or not one child. If "another child" is more than about 1 in 20, raise the threshold in `scripts/lesson-monitor/voice.py` (`group_threshold`) and tell me.

**Where the voiceprints are, and deleting them:** they are only on this laptop, in `pilot\voiceprints\`, encrypted with Windows (DPAPI) for the `hec-pilot` account, so a copy is unreadable on another computer or account. They are numbers made from voices, not audio, but they are still a child's biometric data. To delete them:
- one child: `voice_admin.py delete --student-id <id>`;
- all: `voice_admin.py delete --all --yes`;
- `delete_pilot.py` deletes them along with everything else under `pilot\`.

In the app, the voice groups are deleted with their report (30 days, a withdrawal, the teacher's delete, delete everything). `delete_pilot.py --consents` also deletes the voiceprint consents.

**Not proven yet:**
- How well it recognises voices on real lessons with in-class enrolment. B2 measured made-up mixes, and real lessons then named 0 of 12 groups without enrolment. The first weeks' `accuracy` will tell.
- The thresholds are B2's, not tuned on your classes.
- DPAPI was checked on this laptop's own account, not on `hec-pilot`.
