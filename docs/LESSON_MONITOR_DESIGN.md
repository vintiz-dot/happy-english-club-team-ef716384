# Lesson monitor - design (B3, no code)

Where I am / next step: draft 1 written (sections 1-12). Next: read it back as a sceptical reviewer (privacy, accuracy, teacher workload, cost), revise, record the critique in section 13.

Task B3 of `docs/MASTER_PLAN.md`. Design only: nothing here is built, and nothing may be built until the owner answers the question in `docs/LESSON_MONITOR_REPORT.md`. Codes (S01...) only; no audio, transcript text or voice data in the repo.

Sources: `docs/evidence/B0-harness.md`, `B0-vendors.md`, `B1-transcripts.md`, `B2-identification.md`, `B2b-cpu.md`, the teacher check (MASTER_PLAN stage log, 2026-11-12 night), `docs/evidence/C1-architecture.md` and `docs/RECORDER_RUNBOOK.md` (the class recorder), `supabase/functions/analyze-transcript/index.ts`, root `AGENTS.md` and MASTER_PLAN section 1.

## 1. What the measurements support (and what they do not)

Every feature below is limited to this table. "Measured" means a number exists in the evidence files; "not measured" means nobody has a number.

| Piece | Best result | Basis | Verdict for the monitor |
|---|---|---|---|
| Words, vendor (Azure fast) | about 17 wrong or missed words in about 540 (about 3 %) on what was written; learner errors kept as said in 39 of 40 turns | one teacher, one 5-minute clip of L2 | good on what it writes; it also leaves some speech out entirely, and mixes speakers in overlap (teacher's note, not counted) |
| Words, local (faster-whisper large-v3-turbo int8, greedy, VAD 0.25, CPU) | agrees with the vendors 0.873 on clips, 0.786-0.848 on lesson slices; vendors agree with each other 0.863 / 0.812 | B2b, agreement not accuracy; no teacher has marked a local transcript | probably as good as a vendor on words; NOT checked by a person; writes no Vietnamese at all |
| Speed, local | about 2 h per 90-minute lesson (projected quiet; 1.7 h measured at light load); small model about 1 h, 2-4 points lower | B2b, no quiet run, no full lesson end to end | overnight batch on one machine works; not same-day |
| Speaker turns ("who spoke when"), local | DER 0.57-0.66; wrong speaker count | B2, B2b on synthetic room mixes | poor: a "voice group" is often several children, and the teacher splits into several groups |
| Speaker turns, vendors | DER 0.26-0.30 at 5 % overlap (Azure, Gemini), 0.45-0.56 at 15 %; OpenAI diarize 0.32-0.77; none gets the speaker count right on more than 2 of 3 files | B1 | better than local, still unreliable in a real classroom where children talk over each other |
| Voice groups checked by a teacher | of 11 groups: 5 the teacher, 1 one child (S15), 4 several voices mixed, 1 a TV | teacher Task 2 | grouping without enrolment does not give one group per child |
| Naming a child by voice (ECAPA, AS-norm, 3 voiceprints, T = 6.0) | synthetic upper bound: 18.5 % of single turns named, about half of 10-second groups; wrong child 0.1 %; real lessons: 0 of 12 groups named | B2 | a suggestion for long stretches at best; UNKNOWN is the normal answer; the threshold is not transferable from synthetic audio |
| Teacher vs children talk time from the recorder's two microphones (lapel vs room) | none | NOT MEASURED | plausible (the lapel is close to the teacher), must be measured before it is shown |
| Vietnamese in the lesson | only Gemini wrote any (about 4 % of lesson words); Azure and local wrote none | B1 table (d) | the monitor cannot report Vietnamese use; Gemini fails the privacy terms |

What this rules out, before any design: a per-child transcript produced by the machine; a per-child talk-time figure produced by the machine; any statement that a child "did not speak"; CEFR or grade estimates (also forbidden by the hard rule "the model never grades on its own number").

## 2. What the monitor would do for a teacher

One report per recorded lesson, for the class's teacher, the morning after.

| Feature | What the teacher sees | Built on | Confidence shown |
|---|---|---|---|
| A. Lesson transcript | the lesson as text with times, every line clickable to hear that moment; teacher lines marked when the lapel says so | local transcription; lapel/room levels for "Teacher" | grey lines where several people talk at once ("words may be wrong or missing"); a band "speech not written down here" where the room has speech and the transcript has none |
| B. Talk-time balance | "Teacher about 70 % / children about 30 % of speaking time", a timeline of the lesson in two colours, the longest stretches without children's speech | lapel vs room levels per second (to be measured, section 1) | a range, not a single number, until the pilot has checked it against a teacher's marks |
| C. Words and structures used | target words of the lesson (typed by the teacher, or taken from the lesson's flipbook/homework word list) heard / not heard, with times; counts of simple patterns (questions, "can / can't", past "-ed") in children's speech | transcript, plain word matching, no AI model | "heard" means the transcriber wrote it; "not heard" means only that it was not written |
| D. Who spoke (optional) | voice groups with a 15-second sample each; the teacher may type a code (S07), "T", "several" or skip; with Option B, a suggestion "sounds like S07 (score)" when the score is above the threshold | local diarization (+ voiceprints in Option B) | every group starts as "Unknown"; a name appears only when the teacher types or accepts it |
| E. What each child said | only for stretches the teacher has named (D) or the recorder's name chips (`student_name` markers the teacher tapped in class) | teacher's own naming | nothing is attributed to a child by the machine alone |
| F. Flags for the teacher | class-level and factual: "teacher talk above 80 %", "no children's speech for 12 minutes (32:10-44:15)", "3 of 10 target words not heard", "room microphone missing after 54:51 - figures cover 0:00-54:51" | A-C | each flag links to the moment; no flag is about one child |

Out of the report, and never shown: a score per child, a ranking of children, "child X did not participate", emotion or behaviour, CEFR levels.

## 3. Data flow

```
classroom                    Supabase (already live)                  processing place              teacher
lapel + room mics --> recorder page --> bucket class-recorder-audio --> (A) school computer  --> report
(FLAC 48 kHz, 30 s chunks,              30-day retention,              (B) + voiceprints         (teacher only)
 two tracks, never mixed)               RLS: admin / class teacher     (C) vendor for words          |
                                                                                                     v
                                                                        teacher approves items --> existing student
                                                                                                   records (families
                                                                                                   see only these)
```

1. The recorder (live since 2026-11-16) stores FLAC chunks per track under `{class_id}/{recording_id}/{track}/`. No name or date in the path. Who may read: admin, standing teacher, teacher of that session (`recorder_can_listen`); never a TA or a family.
2. A processing job takes `complete` recordings of classes switched on for the monitor, reads the chunks with an authenticated download (never a signed URL, C1 6.4), joins them per track, cuts the scheduled lesson out of the 105-minute window.
3. It produces, per lesson: transcript, per-second levels of both tracks, voice groups, and (Option B) suggestions. These are DRAFTS: they live where the processing runs, and in phase 2 in a teacher-only table with no family or student policy.
4. The teacher opens the report, listens, corrects, and may approve single items to be kept (for example "S07 used past tense correctly", a new-word list for the class). Only an approved item is copied into an existing record a family can read, and it is copied by the teacher's action, under the teacher's name.
5. The draft and the audio are then deleted on the retention clock (section 7).

The existing `analyze-transcript` function must NOT be the back end of this flow. Read today, it: (a) sends children's full names and the transcript to OpenAI (`gpt-4o-mini`) and asks the model to decide who said each line ("Attribute every utterance to the most likely speaker", lines 140-152) - the AI deciding who a child is; (b) writes `cefr_assessments`, `student_error_log`, `srs_cards` and `lesson_overviews` at once, and families read `cefr_assessments` and `lesson_overviews` through `can_view_student` / enrolment policies (`20260730130000_family_read_learning_data.sql`) with no teacher approval in between; (c) estimates CEFR levels from a model's answer. For recorder audio each of these breaks a hard rule. The monitor reuses its deterministic parts only (word counts, question counts) in a new path. Whether teachers use the Transcripts page today is not known here; that is a separate question for the owner (section 12).

## 4. Where processing runs - three places, and privacy for each

| | School computer (local) | Rented server (VPS) | Speech vendor |
|---|---|---|---|
| Where the children's audio goes | from Supabase to a computer in the school; nowhere else | from Supabase to a server in a data centre (Hetzner: Germany/Finland, or Singapore) | from Supabase to the vendor (Azure) for transcription |
| Who could reach it | the school; risk = theft or a shared login on the computer | the host company in principle (disk, backups); we control the software | the vendor; Azure fast transcription says nothing is stored; no-training clause not found on the pages read (B0); OpenAI keeps 30-day abuse logs unless zero retention is approved; Gemini has no zero-retention option and its terms bar clients likely to be used by under-18s |
| Cross-border transfer under Vietnamese law | none added by the monitor (note: the recorder already stores audio in Supabase; its region is not recorded in these documents) | yes, a second processor abroad | yes; children's voice to a foreign vendor needs the transfer impact assessment dossier (B0 section 8, to be confirmed by an adviser) |
| Voiceprints (Option B) | stay on this computer only | would sit on a foreign server: not recommended | no vendor in reach offers enrolment except Speechmatics (no key, unconfirmed); Azure's speaker recognition was retired 2025-09-30 |
| Cost | electricity under USD 0.01 per lesson; the computer (section 9) | EUR 30-36 a month (CPX32), EUR 49.49 in Singapore | about USD 1.50 per lesson for Azure (price UNCONFIRMED) |
| Speed | about 2 h a lesson on this laptop; a dedicated box not measured | 4 vCPU not measured | minutes |

Privacy order: school computer > VPS > vendor. Accuracy on words: about equal (agreement), vendor teacher-checked, local not. Accuracy on "who spoke when": vendor better but still unreliable; neither names a child.

## 5. Options

### Option A - class-level monitor, all local, no voiceprints (recommended first)

Features A, B, C, D (teacher types codes; no suggestions), E, F. Runs on a school computer overnight. No biometric data is created: voice groups are made fresh per lesson and thrown away with the draft; nothing compares a voice across lessons.

- Benefit: the transcript, the talk-time balance and the target-word check are what the measurements support. A teacher can hear any moment in one click.
- Cost: a computer (section 9); about 2 h of its time per lesson; teacher reading time (section 8).
- Limits: no Vietnamese; per-child content only where the teacher names it; talk-time balance is unmeasured until the pilot checks it.

### Option B - Option A plus voice suggestions

Adds in-room enrolment: each child says about 60 s on the room microphone in their own classroom (B2 verdict (b)), plus the roll-call at the start of each lesson to set the threshold per class. ECAPA voiceprints stay on the school computer; a suggestion appears only above the threshold, the teacher accepts or corrects every one.

- Benefit, measured only on synthetic audio: about half of 10-second voice groups could carry a suggestion; wrong child about 0.1 %. Real lessons: 0 of 12 groups.
- Costs: biometric data of children (separate consent line, deletion duty, breach notification duty under the 2025 law per B0 section 8); enrolment time in class; a teacher still confirms everything; the local diarizer gives mixed groups, so a suggestion often names a group that is several children.
- Verdict: not until Option A has run and an in-room enrolment has been measured on real lessons.

### Option C - vendor transcription and speaker turns (Azure), the rest local

Azure fast transcription with diarization on the room track; talk-time from the lapel locally; no voiceprints.

- Benefit: words teacher-checked at about 3 % error on what it wrote; better speaker turns (DER 0.26-0.50 vs 0.57); results in minutes, not overnight.
- Costs: about USD 1.50 per lesson (UNCONFIRMED); children's voice leaves the country to Microsoft for every lesson; the no-training clause is not confirmed; a transfer impact assessment is needed; `audit-eval-proxy` is an evaluation tool, not a product path.
- Verdict: only if Option A's local transcripts fail the teacher's check in the pilot.

## 6. Consent

- The recorder's consent (C1 section 4, wording version `v1-2026-11`) covers recording and storage. The owner stated on 2026-11-12 that all parents consented to biometric data (MASTER_PLAN D-9); the wording text itself and a Vietnamese adviser's check are still flagged as not done.
- The monitor needs the wording to say, as separate lines: automatic transcription of the lesson by a computer; where it runs (school computer / vendor by name); that the teacher reads it and nothing goes to families without the teacher; and, for Option B only, voiceprints: what they are, where they are kept, how long, how to withdraw.
- A child without consent for the monitor: the class is not processed (same rule as the recorder: a room microphone cannot leave one child out).
- Withdrawal: the child's voiceprint (Option B) and every draft of that class's lessons since enrolment are deleted at once; approved items already in the child's record follow the existing record rules.

## 7. Retention and deletion

| Data | Kept where | How long | Deleted by |
|---|---|---|---|
| Raw lesson audio | Supabase bucket | 30 days after the lesson (live rule); proposed `min(processed + 7 days, lesson end + 30 days)` (C1 6.5, a later migration) | `recorder-retention` (live) |
| Working copy of the audio on the processing computer | processing computer | deleted when the report is made (hours) | the job itself, checked by a listing |
| Draft report (transcript, levels, voice groups, samples) | processing computer (pilot) / teacher-only table (phase 2) | until the teacher closes the report, at most 30 days after the lesson | nightly job |
| Voiceprints (Option B only) | processing computer only, encrypted disk | while the child is enrolled and consent stands; reviewed each term | one command for all, one for one child (section 7.1) |
| Teacher-approved items | existing student records | existing rules | existing rules |

### 7.1 One-command deletion

- Evaluation data today: `python scripts\lesson-eval\delete_voiceprints.py --yes` (all voiceprints and embeddings), `delete_all_derived.py --yes` (everything derived).
- Product (to build in Option B): one command removes all voiceprints; one removes one child's voiceprint and every suggestion that used it; both print what they removed (counts) and leave an audit line, never the audio.

## 8. Teacher workload

- Reading the report: the target is 10 minutes per lesson, not measured. For scale: marking 5 minutes of transcript took the teacher about 45 minutes in the check.
- Naming voice groups is optional. A report is useful without it.
- Nothing a teacher skips is sent anywhere.

## 9. Cost

The school's lesson count is not in these documents. Figures use about 5 lessons a day, about 130 a month (the figure the recorder design used for storage); the owner should correct it.

| | Per lesson | Per month at about 130 lessons | One-off |
|---|---|---|---|
| A on this laptop, overnight | under USD 0.01 electricity, about 2 h | under USD 1; but 130 lessons x 2 h = 260 h, more than the laptop's nights (about 4 lessons a night) | none |
| A on a dedicated computer, running day and night | under USD 0.01 | about USD 1-2 electricity | N100 mini PC USD 160-340 (B0; speed NOT measured, slower per core than this laptop) |
| A on a VPS | - | EUR 30-36 (CPX32), may need 8 vCPU EUR 59-70 | none |
| B | as A | as A | as A, plus enrolment time in class |
| C | about USD 1.50 (Azure, UNCONFIRMED) | about USD 195 | none, plus a computer for the local parts |

## 10. Failure modes and what the teacher sees

| Failure | What the teacher sees |
|---|---|
| Several children speak at once | grey lines: "several people at once - words may be wrong or missing" |
| Speech in the room the transcriber did not write | a band: "speech here was not written down (1 min 20 s)" |
| Whisper writes words over noise (seen with no VAD) | VAD threshold 0.25; lines with no matching speech level are hidden by default and countable |
| Vietnamese spoken | nothing written, or wrong English words; a fixed note on every report: "Vietnamese is not transcribed" |
| A voice group mixes children | every group is "Unknown" until named; the sample lets the teacher hear that it is mixed and mark "several" |
| A microphone dropped (room ended at 54:51 in the first class) | "room microphone missing after 54:51 - figures cover 0:00-54:51 only" |
| Lapel clipping (peak 0.0 dB in the first class) | "teacher microphone too loud for N minutes - talk-time may be off" |
| The computer was off; backlog | "this lesson is waiting to be processed"; a lesson whose audio will be deleted before processing is listed to the admin |
| Consent withdrawn while a lesson is queued | the job refuses the class; the draft is never made |

## 11. What it will NOT do

- Name a child on its own, or treat a suggestion as a name.
- Show anything to a family or a child before a teacher approves it; there is no family or student policy on any monitor table or on the audio.
- Grade, give a CEFR level, or rank children.
- Say a child did not speak.
- Send children's names to any model or vendor; codes only, if anything leaves.
- Use voiceprints outside the school, across schools, or for anything but suggesting a name to a teacher.
- Judge or pay teachers (the report is the teacher's own; changing this is an owner decision to be told to teachers first).
- Feed the existing `analyze-transcript` auto-publish path.

## 12. Recommendation (draft)

Option A, piloted with one class and one teacher for four weeks, on this laptop overnight, before buying anything. Option B and C not now.

Pre-existing finding for the owner, outside the monitor: `analyze-transcript` (Teacher Transcripts page) lets a model attribute speech to children's names, sends names to OpenAI, and publishes CEFR points and lesson overviews that families can read, without a teacher's approval.
