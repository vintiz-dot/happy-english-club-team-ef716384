# Lesson monitor - design (B3, no code)

Where I am / next step: DONE (draft 1 abb375b4, critique and revision in section 13). Next: the B-GATE report `docs/LESSON_MONITOR_REPORT.md`, then STOP.

Task B3 of `docs/MASTER_PLAN.md`. Design only: nothing here is built, and nothing may be built until the owner answers the question at the end of `docs/LESSON_MONITOR_REPORT.md`. Codes (S01...) only; no audio, transcript text or voice data in the repo.

Sources: `docs/evidence/B0-harness.md`, `B0-vendors.md`, `B1-transcripts.md`, `B2-identification.md`, `B2b-cpu.md`, the teacher check (MASTER_PLAN stage log, 2026-11-12 night), `docs/evidence/C1-architecture.md` and `docs/RECORDER_RUNBOOK.md` (the class recorder), `supabase/functions/analyze-transcript/index.ts`, root `AGENTS.md` and MASTER_PLAN section 1.

## 1. What the measurements support (and what they do not)

Every feature below is limited to this table. "Measured" means a number exists in the evidence files; "not measured" means nobody has a number.

| Piece | Best result | Basis | Verdict for the monitor |
|---|---|---|---|
| Words, vendor (Azure fast) | about 17 wrong or missed words in about 540 (about 3 %) on what was written; learner errors kept as said in 39 of 40 turns | one teacher, one 5-minute clip of L2 | good on what it writes; it also leaves some speech out entirely and mixes speakers in overlap (teacher's note, not counted) |
| Words, local (faster-whisper large-v3-turbo int8, greedy, VAD 0.25, CPU) | agrees with the vendors 0.873 on clips, 0.786-0.848 on lesson slices; vendors agree with each other 0.863 / 0.812 | B2b; agreement, not accuracy | probably as good as a vendor on words; NOT checked by a person; whether it keeps children's grammar mistakes as said is NOT measured; writes no Vietnamese |
| Speed, local | about 2 h per 90-minute lesson (projected quiet; 1.7 h measured at light load); small model about 1 h, 2-4 points lower | B2b; no quiet run, no full lesson end to end | overnight batch on one machine works; not same-day |
| Speaker turns ("who spoke when"), local | DER 0.57-0.66; wrong speaker count | B2, B2b, synthetic room mixes | poor: a "voice group" is often several children, and the teacher is split into several groups |
| Speaker turns, vendors | DER 0.26-0.30 at 5 % overlap (Azure, Gemini), 0.45-0.56 at 15 %; OpenAI diarize 0.32-0.77; none gets the speaker count right on more than 2 of 3 files | B1 | better than local, still unreliable where children talk over each other |
| Voice groups checked by a teacher | of 11 groups: 5 the teacher, 1 one child (S15), 4 several voices mixed, 1 a TV | teacher Task 2 | grouping without enrolment does not give one group per child |
| Naming a child by voice (ECAPA, AS-norm, 3 voiceprints, T = 6.0) | synthetic upper bound: 18.5 % of single turns named, about half of PURE 10-second groups; wrong child 0.1 %; real lessons: 0 of 12 groups named | B2 | a suggestion for long one-voice stretches at best; UNKNOWN is the normal answer; the threshold does not transfer from synthetic audio |
| Teacher vs children talk time from the recorder's two microphones (lapel vs room) | none | NOT MEASURED (the B evaluation used single-file recordings) | plausible because the lapel is close to the teacher; must pass a check before it is shown (section 12, step 0) |
| Vietnamese in the lesson | only Gemini wrote any (about 4 % of lesson words); Azure and local wrote none | B1 table (d) | the monitor cannot report Vietnamese use; Gemini fails the privacy terms |

What this rules out before any design: a per-child transcript produced by the machine; a per-child talk-time figure produced by the machine; any statement that a child "did not speak"; CEFR or grade estimates (also the hard rule "the model never grades on its own number").

## 2. What the monitor would do for a teacher

One report per recorded lesson, for that lesson's teacher, the morning after. It opens on ONE summary screen; the transcript is underneath, opened only when wanted.

| Feature | What the teacher sees | Built on | How uncertainty is shown |
|---|---|---|---|
| A. Lesson transcript | the lesson as text with times; every line plays that moment; lines the lapel attributes to the teacher marked "T" (once step 0 has passed) | local transcription; lapel/room levels | grey lines where several people talk at once ("words may be wrong or missing"); a band "the room had speech here that was not written down (about 1 min 20 s)"; lines with no matching sound level are shown faded, never hidden |
| B. Talk-time balance (only if step 0 passes) | "Teacher about 65-75 % / others about 25-35 % of speaking time", a two-colour timeline, the longest stretches without speech from the room | per-second levels of lapel vs room | a range, never one number; "others" = everyone not on the lapel, never "children" by name |
| C. Words and structures in the lesson | the lesson's target words (from the lesson's flipbook / homework word list if one exists, otherwise typed by the teacher, optional): heard / not written, with times and "said on the teacher microphone" or "in the room"; counts of a few patterns (questions, "can / can't", past "-ed") | transcript, plain word matching, no AI model | "not written" never means "not said" |
| D. Voice groups (optional) | groups with a 15-second sample each; the teacher may type a code (S07), "T", "several", or skip | local diarization; group embeddings live only inside the job and are discarded with the draft | every group starts "Unknown"; Option B only: "sounds like S07 (score)" on a group the teacher has marked "one voice", above the threshold |
| E. What a child said | only for stretches the teacher has named (D) or around the recorder's name chips (`student_name` markers the teacher tapped in class, if used) | the teacher's own naming | nothing is attributed to a child by the machine alone |
| F. Flags | class-level and factual, each linked to the moment: "no speech from the room for 12 minutes (32:10-44:15)", "3 of 10 target words not written", "room microphone missing after 54:51 - figures cover 0:00-54:51", "teacher microphone too loud for 9 minutes - talk-time may be off" | A-C, recorder markers | no flag is about one child; no flag grades the teacher |

Never shown: a score per child, a ranking, "child X did not participate", emotion or behaviour, CEFR levels.

## 3. Data flow

```
classroom                  Supabase (live)                      processing computer             teacher
lapel + room --> recorder --> bucket class-recorder-audio --> job: download, transcribe, --> report (summary +
(FLAC 48 kHz,     page        30-day retention;                levels, groups; deletes        transcript), teacher
 30 s chunks,                 RLS: admin, standing teacher,    its audio copy at the end       only
 two tracks)                  teacher of that session                                              |
                                                                                                   v
                                                         (phase 2 only) teacher approves --> existing student
                                                         one item at a time                   record, under the
                                                                                              teacher's name
```

1. The recorder (live since 2026-11-16; no real lesson yet recorded through the app, MASTER_PLAN) stores FLAC chunks per track under `{class_id}/{recording_id}/{track}/`, no name or date in the path. Readers: admin, standing teacher, teacher of that session (`recorder_can_listen`); never a TA, student or family.
2. The job takes `complete` recordings of classes switched on for the monitor. Pilot: it signs in as a person (an admin, the way `vendor_batch.py --login` does), so RLS and the recorder's audit log see who read the audio; it downloads with an authenticated `download()`, never a signed URL (C1 6.4). No service role.
3. It joins the chunks per track, cuts the scheduled lesson out of the 105-minute window, transcribes the room track, measures both tracks' levels per second, makes voice groups. Output = a DRAFT on the processing computer only.
4. Pilot: the teacher reads the report on the processing computer (or a school device on the school network). The report is never sent by Zalo, Facebook, email or a USB stick. Nothing is written to Supabase, nothing reaches a family or a child: the pilot has no approval-to-family step at all.
5. Phase 2 (only after a successful pilot and a separate owner decision): a teacher-only table, no family or student policy, explicit GRANTs and pgtest per the migration rules, written by a narrow machine identity that is a new permission for the owner to approve; a teacher approves single items, which are copied into existing records by the teacher's action.
6. Retention (section 7) deletes the draft and the audio.

The existing `analyze-transcript` function must NOT be the back end. As written today it: (a) sends children's full names and the transcript to OpenAI (`gpt-4o-mini`) and asks the model to "Attribute every utterance to the most likely speaker" by name (lines 139-152) - the AI deciding who a child is; (b) writes `cefr_assessments`, `student_error_log`, `srs_cards` and `lesson_overviews` at once, and families read `cefr_assessments` and `lesson_overviews` (`20260730130000_family_read_learning_data.sql`, `can_view_student` / enrolment) and students read their error log, with no teacher approval in between; (c) stores a CEFR level from a model's answer. Fed with recorder audio, each breaks a hard rule. The monitor reuses only its deterministic ideas (word and question counts) in a new path.

## 4. Where processing runs - privacy for each

| | School computer (local) | Rented server (VPS) | Speech vendor (Azure) |
|---|---|---|---|
| Where the audio goes | from Supabase to a computer in the school | from Supabase to a data centre (Hetzner: Germany/Finland or Singapore) | from Supabase to Microsoft for transcription |
| Who could reach it | the school; risks: theft, a shared Windows login, a staff member copying files | the host in principle (disks, backups); we control the software | the vendor. Azure fast transcription: "does not retain or store" (B0); no-training clause NOT found on the pages read. OpenAI: 30-day abuse logs unless zero retention is approved. Gemini: no zero-retention option and terms bar clients likely used by under-18s |
| Children's names | spoken names (roll-call, "Anna, can you...") are in the audio and the transcript; they stay in the school | same audio, abroad | the vendor hears spoken names: "codes only" cannot be honoured for audio |
| Cross-border transfer | none added by the monitor (the recorder already stores audio in Supabase; its region is not recorded in these documents) | a second processor abroad | yes; children's voice to a foreign vendor needs the transfer impact assessment (B0 section 8, adviser to confirm) |
| Voiceprints (Option B) | on this computer only, encrypted disk | not recommended | no vendor in reach: Azure speaker recognition retired 2025-09-30; Speechmatics enrolment exists but no key, terms unconfirmed |
| Running cost | electricity under USD 0.01 per lesson | EUR 30-36 a month (CPX32, 4 vCPU), EUR 49.49 in Singapore | about USD 1.50 per lesson (price UNCONFIRMED) |
| Speed | about 2 h a lesson on this laptop; another computer not measured | 4 vCPU speed not measured | minutes |

Requirements for the school computer, whichever it is: BitLocker (or equivalent) on, a separate Windows account for the job that staff do not use, audio and drafts only under one folder, the job deletes its audio copy when the report is made and checks by listing. For the pilot on this laptop: it is also the staff and development machine, so the pilot runs only on nights with no other heavy work, and BitLocker status must be checked by the owner first (not checked here).

Privacy order: school computer > VPS > vendor. Words: about equal (agreement); only the vendor is teacher-checked. "Who spoke when": vendor better, still unreliable; neither names a child.

## 5. Options

### Option A - class-level monitor, local, no voiceprints (recommended, as a pilot first)

Features A, C, D (teacher types codes, no suggestions), E, F; B only if step 0 passes. Runs on a school computer overnight. No voiceprint is kept: the voice-group embeddings exist only while the job runs and are not compared across lessons. That is still processing of voice; the consent wording says so (section 6).

- Benefit: the transcript, the target-word check and (if it passes) the talk-time balance are what the measurements support; any moment is one click away.
- Cost: pilot USD 0 on this laptop; later a computer (section 9); teacher reading time (section 8).
- Limits: no Vietnamese; per-child content only where the teacher names it; the local transcript and the talk-time split are unchecked until step 0.

### Option B - Option A plus voice suggestions

Adds in-room enrolment: each child about 60 s on the room microphone in their own classroom (B2 verdict (b)), the roll-call at the start of each lesson to set the threshold per class, ECAPA voiceprints on the school computer only. A suggestion is offered only on a group the teacher has already marked "one voice" and only above the class threshold; the teacher accepts or corrects every one. The child who has left the school (teacher check) and any child without the voiceprint consent line are never enrolled.

- Benefit, measured only on synthetic audio: about half of pure 10-second groups would carry a suggestion; wrong child about 0.1 %. Real lessons: 0 of 12 groups.
- Costs: children's biometric data (separate consent line, deletion and breach-notice duties under the 2025 law per B0 section 8); enrolment time in class; the teacher must first mark groups "one voice", so it adds work rather than saving it.
- Verdict: not now. Revisit only after Option A has run and an in-room enrolment has been measured on real lessons.

### Option C - vendor transcription and speaker turns (Azure), the rest local

Azure fast transcription with diarization on the room track; talk-time from the lapel locally; no voiceprints.

- Benefit: words teacher-checked at about 3 % wrong or missed on what it wrote, learner errors kept; better speaker turns (DER 0.26-0.50 against 0.57); results within minutes.
- Costs: about USD 1.50 per lesson (UNCONFIRMED), about USD 195 a month at the assumed volume; every lesson's children's voices and spoken names go abroad; no-training clause unconfirmed; transfer impact assessment needed; `audit-eval-proxy` is an evaluation tool, not a product path, and is to be torn down.
- Verdict: a fallback only if the local transcript fails the teacher's check in step 0.

## 6. Consent

- The recorder's consent (C1 section 4, wording version `v1-2026-11`) covers recording and storage. The owner stated on 2026-11-12 that all parents consented to biometric data (MASTER_PLAN D-9); the wording text and a Vietnamese adviser's check are still flagged as not done.
- The monitor needs the wording to say, as separate lines a parent can refuse one by one: automatic transcription by a computer and where it runs; that voices are grouped within one lesson and not kept; that only the teacher reads it and nothing goes to families without the teacher; Option B only: voiceprints, where kept, how long, how to withdraw; Option C only: the vendor by name and the country.
- Teachers are recorded too and their talk share is measured: they are told in writing what is measured and that the report is theirs (section 11). The owner decides whether admins see more than "report made / reviewed".
- A child without the monitor line: the class is not processed (same rule as the recorder; a room microphone cannot leave one child out).
- Withdrawal: the class's queued and draft reports are deleted at once; Option B: the child's voiceprint too; approved items already in a child's record follow the existing record rules.

## 7. Retention and deletion

| Data | Kept where | How long | Deleted by |
|---|---|---|---|
| Raw lesson audio | Supabase bucket | 30 days after the lesson (live); proposed `min(processed + 7 days, lesson end + 30 days)` (C1 6.5; a later migration) | `recorder-retention` (live) |
| Audio copy on the processing computer | one folder | until the report is made (hours) | the job, checked by a listing |
| Draft report (transcript, levels, groups, 15 s samples) | processing computer | until the teacher closes it, at most 30 days after the lesson | nightly job; teacher's "delete now" |
| Voiceprints (Option B only) | processing computer, encrypted | while the child is enrolled and the line stands; reviewed each term | 7.1 |
| Teacher-approved items (phase 2) | existing student records | existing rules | existing rules |

### 7.1 One-command deletion

- Evaluation data today: `python scripts\lesson-eval\delete_voiceprints.py --yes` (all voiceprints and embeddings) and `delete_all_derived.py --yes` (everything derived), under `C:\Users\Dell\hec-audio-eval\`. When the evaluation ends these should be run, and `audit-eval-proxy` torn down (`scripts/lesson-eval/teardown_audit_eval.md`).
- Product: one command deletes every draft and audio copy; Option B adds one command for all voiceprints and one for one child's voiceprint plus every suggestion that used it. Each prints counts and writes an audit line, never content. (Pilot, fix round 1: after `delete_everything` the audit holds no child ids; it keeps event names, dates, class and recording ids and counts. And "only the teacher can read it" is a promise about the app's database: whoever sits at the laptop while the job runs, and whoever can open `pilot\drafts`, can read a report there. Owner's ruling on spoken names, verbatim: "it's ok to send names. the students use psuedo names in class".)

## 8. Teacher workload

- Target: summary screen 2-3 minutes; whole report 10 minutes at most; NOT measured. For scale: marking 5 minutes of transcript took the teacher about 45 minutes in the check, so a report that needs listening will not be read.
- At the assumed 130 lessons a month, 10 minutes each is about 22 teacher-hours a month across the staff: this is the real cost of the monitor, larger than any machine cost.
- Naming voice groups, typing target words and tapping name chips are all optional. Nothing a teacher skips is sent anywhere.
- The pilot records the minutes the teacher actually spends and whether she used anything from the report.

## 9. Cost

The school's lesson count is not in these documents. Figures use about 5 lessons a day, about 130 a month (the figure the recorder design used for storage); the owner should correct it. The pilot (one class) is about 8-12 lessons a month.

| | Per lesson | Per month, pilot (about 10) | Per month, about 130 lessons | One-off |
|---|---|---|---|---|
| A on this laptop, overnight | under USD 0.01 electricity, about 2 h | under USD 0.10 | does not fit: about 4 lessons a night, about 120 a month at most, and only on quiet nights | none |
| A on a dedicated always-on computer | under USD 0.01 | - | about USD 1-2 electricity; 260 h of processing in a 720-h month if as fast as this laptop (NOT measured) | N100 mini PC USD 160-340 (B0); measure its speed on one lesson before buying more than one |
| A on a VPS | - | EUR 30-36 | EUR 30-36 (4 vCPU) or EUR 59-70 (8 vCPU); speed not measured | none |
| B | as A | as A | as A | as A, plus enrolment time in class |
| C | about USD 1.50 (Azure, UNCONFIRMED) | about USD 15 | about USD 195 | a computer or VPS for the local parts |
| All options | teacher reading time (section 8) | about 2 h of teacher time | about 22 teacher-hours | building phase 2 (screens, table, tests): development time, not costed |

## 10. Failure modes and what the teacher sees

| Failure | What the teacher sees |
|---|---|
| Several children speak at once | grey lines: "several people at once - words may be wrong or missing" |
| Room speech the transcriber did not write | a band: "the room had speech here that was not written down (1 min 20 s)" (estimated from the room level, which itself misses some speech and passes some noise) |
| Words written over noise (Whisper's loop was seen with VAD off) | VAD 0.25 on; lines with no matching level are faded, not hidden |
| Vietnamese | nothing written or wrong English; a fixed line on every report: "Vietnamese is not transcribed" |
| Grammar silently "fixed" by the transcriber | unknown for the local model until step 0; until then the report does not show learner-error counts |
| A voice group mixes children | every group "Unknown" until named; the sample lets the teacher hear it and mark "several" |
| A microphone dropped (the room track ended at 54:51 in the first real class, on the quick recorder) | "room microphone missing after 54:51 - figures cover 0:00-54:51 only" |
| Lapel clipping (peak 0.0 dB in that class) | "teacher microphone too loud for N minutes - talk-time may be off" |
| The computer was off; backlog | "this lesson is waiting"; a lesson whose audio would be deleted before processing is listed to the admin, never silently dropped |
| Consent withdrawn while a lesson is queued | the job refuses the class; no draft is made |
| Step 0 fails for talk-time | feature B is not shown at all (not shown with a warning) |

## 11. What it will NOT do

- Name a child on its own, or treat a suggestion as a name.
- Show anything to a family or a child before a teacher approves it; no family or student policy on any monitor table or on the audio; the pilot sends nothing to families at all.
- Grade, give a CEFR level, or rank children; count a child's errors before the transcriber has been shown to keep them.
- Say a child did not speak.
- Send children's names (typed) to any model or vendor; Option A sends nothing anywhere.
- Use voiceprints outside the school or for anything but suggesting a name to a teacher.
- Judge or pay teachers; the report is the teacher's own (an owner decision to change, told to teachers first).
- Use or extend the existing `analyze-transcript` auto-publish path.
- Run inside a Supabase edge function (2 s CPU, 256 MB: B0 section 6).

## 12. Recommendation

**Option A, piloted: one class, one teacher, four weeks, on this laptop overnight, teacher-only, nothing to families. Not Option B or C now.**

Before the pilot starts, all four must be true:
1. The recorder has recorded at least three real lessons of that class through the app with both tracks complete (owner hardware checklist `docs/evidence/C5-owner-hardware-checklist.md` done).
2. The consent wording carries the monitor lines (section 6) and the parents of that class have received it.
3. Step 0 passes (proposed bars, owner may change): a teacher marks 5 minutes of a LOCAL transcript as in the earlier check - at most about 5 % wrong or missed words on what is written, and grammar mistakes kept as said in at least 9 of 10 cases; and the talk-time split agrees with the teacher's marks of who spoke (teacher / others) within 10 percentage points. The first real class's two files (already under `hec-audio-eval\lessons`) can be used. If words fail: consider Option C. If talk-time fails: drop feature B.
4. The laptop has BitLocker on and a separate account for the job.

The pilot stops early if the teacher's median reading time is over 15 minutes or she reports in two of the four weeks that she used nothing from it. After the pilot: buy one dedicated computer only after timing one full lesson on it; phase 2 (in-app report) is a separate owner decision.

Note on the gate: `MONITOR_GO` was written on 2026-11-12, before any of these measurements existed. This design asks the owner to confirm the specific option rather than rely on it.

Pre-existing finding for the owner, outside the monitor: `analyze-transcript` (Teacher Transcripts page) lets a model attribute speech to children by name, sends names to OpenAI, and publishes CEFR points and lesson overviews that families can read, with no teacher approval. Whether it is used today is not known here.

## 13. Critique of draft 1 and what changed

Draft 1 (commit abb375b4) was read back as a sceptical reviewer looking at privacy, accuracy, teacher workload and cost. Findings and the change made for each:

### Privacy

| # | Finding | Change |
|---|---|---|
| P1 | "On this laptop" puts children's audio on the staff and development machine; BitLocker unknown; how the teacher reads the report was not said, so it would end up sent by Zalo or email. | Section 4 requirements (BitLocker, separate account, one folder, delete by listing); section 3 step 4 (report read on the school network, never sent by chat, mail or USB); recommendation condition 4. |
| P2 | "No biometric data" in Option A was too strong: diarization computes voice embeddings, if only for the length of the job. | Option A now says the embeddings exist only during the job and are not compared across lessons, and that this is still processing of voice; the consent line says so. |
| P3 | The audio contains children's spoken names (roll-call, "Anna, can you..."), so "codes only" cannot hold for audio sent to a vendor. | New row in section 4; Option C costs; section 11 narrowed to typed names. |
| P4 | Teachers are recorded and measured; talk share is a teacher-performance number. | Section 6 (teachers told in writing; owner decides what admins see); flags no longer grade the teacher ("teacher talk above 80 %" removed). |
| P5 | Draft 1's flow had a step copying approved items into family-visible records, without saying the pilot would do it or how it would be authorised. | The pilot has no family step at all; phase 2 is a separate decision with a teacher-only table, GRANTs, pgtest and a machine identity that the owner approves. |
| P6 | Downloading audio with an unnamed credential invites the service role. | The pilot job signs in as a person (admin), no service role, no signed URLs. |

### Accuracy

| # | Finding | Change |
|---|---|---|
| A1 | The local transcript has never been checked by a person, and whether Whisper keeps children's grammar mistakes is unmeasured; feature C counted "patterns in children's speech", which also needs a reliable teacher/children split. | Step 0 (teacher marks 5 minutes of a local transcript); learner-error counts withheld until it passes; C now reports "in the lesson", split only by "teacher microphone / room". |
| A2 | Talk-time from lapel vs room is a guess: children next to the teacher reach the lapel, the teacher reaches the room. | Feature B shown only after step 0, as a range, as "teacher / others" never "children"; if step 0 fails it is not shown at all. |
| A3 | Hiding transcript lines that have no matching sound level could hide real speech. | Faded, never hidden. |
| A4 | Option B's "about half of 10-second groups" is for pure synthetic groups; real groups are mixed, so a suggestion would land on several children. | Suggestions only on groups the teacher has marked "one voice"; the costs line says this adds work. |
| A5 | "Speech not written down" rests on a level detector that itself misses speech and passes noise. | Marked as an estimate in section 10. |

### Teacher workload

| # | Finding | Change |
|---|---|---|
| W1 | The 10-minute target is unmeasured; the earlier check took 45 minutes for 5 minutes of lesson; at the assumed volume this is about 22 teacher-hours a month, the biggest cost. | Summary-first report; section 8 states the hours; the pilot measures minutes and has a stop rule (median over 15 minutes, or nothing used in 2 of 4 weeks). |
| W2 | Name chips and typed target words add work in and after class. (The recorder page does offer name chips: `src/components/recorder/DailyRecorder.tsx:438` writes a `student_name` marker.) | All optional; target words taken from the lesson's existing word list where one exists. |

### Cost

| # | Finding | Change |
|---|---|---|
| C1 | Draft 1 implied the laptop could carry the whole school; at about 2 h a lesson it does about 4 lessons a night, and only on quiet nights. | Section 9 says it does not fit at full volume; the laptop is for the pilot only. |
| C2 | The N100's speed is unmeasured; buying several on the projection is a risk. | Time one full lesson on it before buying more than one. |
| C3 | Hidden costs (teacher time, building phase 2, someone watching the backlog) were missing. | Added to section 9 and section 10 (backlog listed to the admin). |
| C4 | The vendor price is unconfirmed and two tracks would double it. | Only the room track goes to the vendor; price marked UNCONFIRMED. |

### Gate and governance

| # | Finding | Change |
|---|---|---|
| G1 | The recorder has not yet recorded a real lesson through the app; a monitor pilot cannot start before it has. | Recommendation condition 1. |
| G2 | `MONITOR_GO` predates the measurements. | Section 12 asks the owner to confirm the option instead. |
| G3 | The evaluation leaves children's audio, voiceprints and a deployed vendor proxy behind. | Section 7.1 names the deletion commands and the proxy teardown. |

Not changed, on purpose: no option sends audio to Gemini or OpenAI (their terms fail the owner's original rule and Gemini's bars under-18 clients); no option builds on `analyze-transcript`.
