# MASTER PLAN - conductor ledger

Single ledger for four parallel workstreams (A overhaul, B lesson-monitor evaluation, C class recorder, D cancellation/tuition integrity).
Conductor: Fable 5.2, branch `claude/hec-conductor-setup-efbaa5`. Started 2026-11-11 from `origin/main` c7c5f21.
Re-read this file at each stage and after any context compaction. Nothing is "verified" here unless the Evidence column names a command that was run and its result.

## 1. Hard rules (quoted in every agent brief)

- Payroll is computed only in `supabase/functions/calculate-payroll`.
- Migrations belong in `supabase/migrations/` with explicit GRANTs and tests via `node scripts/pgtest/run.mjs`. Written and tested, NEVER applied: the owner pastes them by hand.
- App type check is `tsc --noEmit -p tsconfig.app.json` (root `tsc --noEmit` loads zero files).
- Nothing derived from a lesson reaches a family until a teacher approves.
- The AI never decides who a child is: a voice match is a suggestion with confidence; low confidence stays "unknown". Never auto-link a child on a guess.
- The model never grades or prices on its own number.
- No family SELECT policy on audio or voiceprints.
- The chat function gets no write/apply/undo path.
- No service role for data a caller could write under RLS.
- Stars Sync names are never persisted.

MONEY RULES
- Never weaken or remove an existing guard: cancelled-lesson attendance trigger with parent-row lock (20261027090000), fail-closed session eligibility helper, closed-payroll expenditure trigger, frozen bills, payment-month confirmation, sibling hold.
- Every new guard fails CLOSED.
- Never rewrite historical sessions, invoices, payments or payroll lines.
- Tuition figures come only from calculate-tuition, payroll figures only from calculate-payroll; never recomputed in the browser.
- Every money-affecting admin write leaves an append-only audit row: who, when, why, before/after snapshot.

DATA RULES
- Audio lives only in `C:\Users\Dell\hec-audio-eval\` (outside the repo). No audio, video, transcripts or voice data in the repo, ever.
- Never read `key.txt`, `videos\key.txt`, `videos\videos\key.txt` (real names). Codes (S01...) only.
- Never search for, print, log or store any secret. Vendor keys exist only as Supabase secrets.
- Do not touch `/admin?tab=audit-clips` or the `audit-clips` bucket (another session owns them).
- No real user data from the live database. Previews use the fake Supabase client only.

## 2. Release policy

Push to main + deploy touched edge functions ONLY for gated tasks that change no figure, permission, RLS policy or data access and are not a design rollout (speed, alt text, tooltip and flipbook fixes). Re-fetch before every push.
Everything else WAITS for the owner: design rollout beyond the checkpoint, the recorder's first release, every migration, every cancellation/tuition behaviour change (all of D), any permission change, anything that records children in production, deploying `audit-eval-proxy`.

## 3. Owner approvals (verbatim from the brief, 2026-11-11)

1. "Children's voice audio may be sent to ANY AI vendor for the evaluation (Azure Speech, OpenAI, others) plus local tools. Before each vendor is used, record its current retention and training-on-customer-data terms from current documentation (with the date) and use the most private settings: logging off, zero/minimal retention, no training. If a vendor cannot offer that, skip it and say why. Send codes (S01...) only, never real names."
2. "Audio lives only in C:\Users\Dell\hec-audio-eval\ (OUTSIDE the repo). Never copy audio, video, transcripts or voice data into the repo or commit them; add the extensions to .gitignore."
3. `audit-eval-proxy`: "It spends vendor credit and handles children's audio, so DO NOT deploy without the owner's explicit approval in the ledger." -> **NOT APPROVED YET** (see section 8, Q1).
4. "Voiceprints are children's biometric data: enrolment artefacts stay outside the repo and are deletable in one command; produce the deletion script."
5. Subagents and Workflows: "You are authorised to use subagents and Workflows; this message is that opt-in."
6. MONITOR_GO: **not written**. The monitor is not built until the owner writes `MONITOR_GO` on its own line in section 8.

## 4. Baseline numbers

Filled by A0 into `docs/ENHANCEMENT_BASELINE.md`; headline figures copied here once verified by the conductor.

| Check | Baseline | After | Evidence |
|---|---|---|---|
| `tsc --noEmit -p tsconfig.app.json` | exit 0, 3m21s (conductor, 9ba819f) | | conductor run 2026-11-11 |
| `node scripts/pgtest/run.mjs` | 1611 assertions, 30 suites, 0 failed (conductor, 9ba819f) | | conductor run 2026-11-11 |
| `bun test scripts/payrollCalculation.test.ts` | pending (bun is NOT installed on this machine; see D-3) | | |
| production build, initial JS gzip | pending | | |

## 5. Task table

Status: todo / running / review / PASS / FAIL / reverted / blocked-owner. Model = implementer / reviewer.

| Id | Task | Model (impl / review) | Files owned | Status | Evidence |
|---|---|---|---|---|---|
| D0 | Inventory of cancel / owe-changing paths | sonnet / fable | docs/evidence/D0-inventory.md | PASS (conductor spot-check) | docs/evidence/D0-inventory.md, 480ad48; 6 claims re-read in code by conductor |
| D1 | Evidence model design; `session_held_evidence` | fable design, opus build / fable | docs/evidence/D1-evidence-model.md; supabase/migrations/2026111209*_session_held_evidence.sql; scripts/pgtest/session-evidence.test.mjs | review FAIL (1 major: hash leaks bill state to the class teacher; 2 surviving mutants) -> revision 1 running (opus) | docs/evidence/D1-evidence-model.md, 61ce962 |
| D2 | Guard: trigger + `cancel_session_checked` + threat model | fable design, opus build / fable | docs/evidence/D2-*.md; guard migration; manage-session; bulk-cancel-sessions; pgtest | design PASS WITH CHANGES (8 required, no bypass found); SQL build running (opus) | docs/evidence/D2-guard-design.md, D2-threat-model.md |
| D3 | Nudge UI + override review screen | sonnet / opus + fable wording | CancelSessionDialog, SessionActionsModal, EditSessionModal, DeleteSessionDialog, BulkSessionDelete, new review screen | todo | |
| D4 | Other tuition-affecting actions | fable design, opus build / fable | docs/evidence/D4-*.md; migration; affected dialogs | todo | |
| D5 | Invariant audit + regression tests + owner SQL | fable audit, sonnet/opus tests / fable | docs/evidence/D5-audit.md; scripts/pgtest/*; scripts/CHECK-past-cancellations-with-evidence.sql | todo | |
| A0 | Baseline | sonnet (haiku captures) / fable | docs/ENHANCEMENT_BASELINE.md; docs/evidence/A0/ | running | |
| A1 | Plan + critic | fable / fable critic | docs/evidence/A1-plan.md | todo | |
| A2 | Teacher stability: flipbook, tooltips | opus / fable | TeacherBooks + viewer, SkillButton, LiveEngagementHUD, tooltips in TeacherLeaderboards/SmartUpload/Transcripts | todo | |
| A3 | Speed | sonnet bundle, opus data / same-or-higher | set in A1 | todo | |
| A4 | Design system + a11y + dark mode | fable system, opus first screens, sonnet rollout / fable | docs/DESIGN_SYSTEM.md, src/index.css, tailwind.config.ts, student dashboard | todo | HOLD at checkpoint |
| A5 | Security audit, report only | fable x2 / opus verifier | docs/AUDIT_FINDINGS.md | todo | |
| B0 | Harness + vendor research + audio prep | opus, sonnet, haiku / fable | scripts/lesson-eval/; docs/evidence/B0-*.md | research + audio prep done; harness PAUSED at 5da845e (D-5) | docs/evidence/B0-harness.md, B0-vendors.md |
| B1 | Transcript quality | sonnet runs, opus scorer / fable method | docs/evidence/B1-*.md | todo | vendor rows need Q1 |
| B2 | Speaker identification | opus / fable | scripts/lesson-eval/; docs/evidence/B2-*.md | todo | |
| B2b | CPU-only performance | sonnet / opus, fable decides | docs/evidence/B2b-*.md | todo | |
| B3 | Monitor design, no code | fable / fable critic | docs/LESSON_MONITOR_DESIGN.md | todo | |
| B-GATE | docs/LESSON_MONITOR_REPORT.md, then STOP | fable | docs/LESSON_MONITOR_REPORT.md | todo | |
| C1 | Recorder architecture, schema, RLS, consent | fable / fable critic | docs/evidence/C1-architecture.md; recorder migration; scripts/pgtest/recorder.test.mjs | built; conductor ran recorder suite 191/191; critic running | docs/evidence/C1-architecture.md, 50ce61b |
| C2 | Capture core | opus / fable | src/lib/recorder/ | todo | |
| C3 | Plug-and-play UI | sonnet / opus | src/components/recorder/ | todo | |
| C4 | Tests | sonnet / opus | recorder tests | todo | |
| C5 | Runbook + owner checklist | sonnet / fable | docs/RECORDER_RUNBOOK.md, docs/RECORDER_OWNER_CHECKLIST.md | todo | |

File ownership: A = overhaul files; B = scripts/lesson-eval/, docs/LESSON_MONITOR_*, analyze-transcript; C = src/components/recorder/, src/lib/recorder/, supabase/functions/recorder-*, its migrations; D = session/tuition guard migrations, manage-session, bulk-cancel-sessions, the session dialogs and their tests. A restyles D's dialogs only after D3 is merged. Shared files (Layout.tsx, App.tsx, types.ts, index.css, tailwind.config.ts, scripts/pgtest/run.mjs): conductor merges, small commits, re-fetch first.

Migration timestamp blocks (so parallel writers never collide): D = 202611120900xx-202611120959xx, C = 202611121000xx, B (audit-eval bucket) = 202611121100xx.

## 6. Decisions

- D-1 (2026-11-11): each agent works in its own git worktree and commits to its own branch; the conductor merges into `claude/hec-conductor-setup-efbaa5` and runs the gates there. Nothing goes to main except under the release policy.
- D-2: worktrees have no node_modules; link with `cmd //c mklink //J node_modules "<main checkout>\node_modules"`, remove with `cmd //c rmdir node_modules` (never `Remove-Item -Recurse`).
- D-3: `bun` is not on PATH on this machine. A0 must find a way to run `scripts/payrollCalculation.test.ts` (e.g. `npx bun`) or record it as not runnable; it may not be silently skipped.
- D-4: reviewers return an explicit PASS/FAIL; a missing verdict is FAIL. Agents append findings to their evidence file as they go so a death mid-run leaves something.

## 7. Migrations to paste (owner, in order) - none applied by any agent

(filled as they are written and pass pgtest)

## 8. Open owner questions / approvals needed

- Q1. Deploy the temporary admin-only `audit-eval-proxy` edge function (spends vendor credit, sends children's audio under codes to Azure/OpenAI/others)? Until approved: local tools only, vendor rows "not tested". To approve write `AUDIT_EVAL_PROXY_GO` here.
- Q2. Two-admin approval for high-impact tuition changes: threshold and default (built OFF) - asked in D4.
- Q3. Design checkpoint: approve the rollout beyond the student dashboard (A4).
- Q4. Recorder first real-class use; parental consent on file per class (C).
- Q5. MONITOR_GO (B-GATE).
- Q7. RESOLVED 2026-11-11. Owner, verbatim: "continue, also fix watch-sibling-threshold fix is an admin or cron-secret check." Done: 6853e4a on main, deployed as version 4, live probe with the public key returns 401.
- Q8. F-1: approve changing `normalizeFutureHeld` so it never resets a lesson dated today (or already started) from Held to Scheduled?
- Q6. ARASAAC non-commercial licence (pre-existing, from AGENTS.md) - not part of this work, still open.

## 9. Reverted / dropped tasks

(none yet)

## 10. Stage log

- 2026-11-11 Conductor baseline: `tsc --noEmit -p tsconfig.app.json` exit 0 (3m21s) at 9ba819f.
- 2026-11-11 B0-R vendor research merged (sonnet, ba9e3b0, docs/evidence/B0-vendors.md; read by conductor as a report, method review pending). Headlines, all from pages read 2026-11-11:
  - Azure Speaker Recognition (enrolled voices) was RETIRED 2025-09-30, so "Azure with enrolled voices" cannot be tested; identification must be a local embedding approach or another vendor (Speechmatics documents enrolment-based speaker ID; we hold no key - owner decision).
  - Azure fast transcription: nothing stored; no-training clause UNCONFIRMED. OpenAI: 30-day abuse logs by default, ZDR only after sales approval - UNCONFIRMED for our org. Gemini: FAILS the owner's rule (logging, no ZDR, terms bar under-18 targeted use) - skip. Google Chirp 3: UNCONFIRMED.
  - Supabase edge limits: 256 MB, 2 s CPU, 150 s (free) / 400 s (paid) wall clock -> one invocation per 10-15 minute piece.
  - Under the owner's rule ("if a vendor cannot offer that, skip it"), NO vendor is fully confirmed yet; Q1 now also asks the owner to check the OpenAI dashboard for ZDR and accept or decline Azure on its retention terms alone.
- 2026-11-11 B0 audio prep done (haiku; conductor spot-checked names and one WAV format). 35 WAVs at 16 kHz mono under hec-audio-eval\work\wav16k\ (30 clips, 5 lessons); 63 sources, 28 byte-duplicates (a nested videos\videos copy, and S21_clip2 = S21_clip1). DIFFERS from the brief's inventory: S26 is now present with four clips (clip2-clip5, no clip1), so 27 children / 30 unique clips / 69.2 min, not 26 / 27 / ~75. Lessons total 536 min.
- 2026-11-11 Usage limit hit mid-wave (D0, A0, B0 harness, audio prep stopped with nothing committed); resumed 16:33 after the owner said continue.
- 2026-11-11 D0 merged (sonnet, 480ad48): 28 session paths, 26 owe-changing paths. All four known gaps CONFIRMED; conductor re-read manage-session :126/:164/:210/:315, bulk-cancel-sessions :15-16/:99, the admin FOR ALL policy on sessions (20251012023454:146). New gaps D2 must cover: admin client writes straight to `sessions` (SessionActionsModal:134 delete, EditSessionModal:122, GlobalCalendar:191) and manage-session `delete` with no guard; un-cancel triggers no tuition refresh and leaves attendance Excused; hard delete and reschedule skip the refresh; "attendance exists" is not evidence (auto-mark, repair and the seed trigger all write rows). supabase/functions/generate-sessions/index.ts is an empty file.
- SECURITY FINDING for the owner (not fixed - a permission change needs approval): `watch-sibling-threshold` has no role check (conductor grep found none), only verify_jwt, which the public anon key satisfies; it upserts sibling state and posts retro credits. Proposed fix: requireRole admin or the cron secret. Goes to A5 as well. See Q7.
- 2026-11-11 Q7 fixed on the owner's instruction: `watch-sibling-threshold` now requires an admin, the service-role key or `x-cron-secret`. Checks run by the conductor: edge-functions type check 5/5; no cron job in the live database calls it (cron.job read: names and booleans only); no caller in the repo; cherry-picked alone onto main (6853e4a), deployed v4; POST with the publishable key -> 401, with a wrong cron secret -> 401. NOT tested: a real admin token (no admin session available).
- 2026-11-11 D1 design merged (fable, 61ce962). Level = pure function of evidence families: STRONG if a person marked a child Present/Late, a linked transcript or a completed recording exists, or two of {register/Held, points, same-day transcript}; SOFT for one of those or homework; rows with marked_by NULL never count. `settled` (locked payroll month / settled invoice) is a separate flag. Conductor additions for D2: (1) STRONG means acknowledge-and-explain, never an absolute block; (2) a PAST-dated lesson with NONE evidence still requires a reason and confirmation, because a taught-but-unmarked lesson is NONE by design; (3) evidence is read before the cancel and the JSON stored, since cancelling rewrites marks to Excused.
- D1 owner questions (defaults in force until answered): all-Absent register = SOFT; Pixel Pal marks = STRONG; credit carried in does not count as "paid"; homework = SOFT only; Held in a locked payroll month = SOFT + settled. Open fact: does Pixel Pal pre-fill Present?
- 2026-11-11 C1 merged (fable, 50ce61b): design + migration 20261112100000_class_recorder.sql (NOT applied) + recorder.test.mjs. Conductor ran the suite with its migrations: 191 passed, 0 failed. Decisions: page in the existing app (Chrome/Edge), no wrapper; one click a day then lessons arm themselves; Opus 128k WebM vs FLAC to be measured in C2 (provisional FLAC); direct upload to private bucket `class-recordings` under the teacher's JWT; retention 30 days after lesson end (setting); TAs no access; class switch off by default and arming refused server-side unless switch + consent confirmation + every enrolled child's consent. D1 contract: view `recorder_session_evidence`, column `was_completed`. Fact for D2: the 09:00 Hanoi rebuild job deletes today's sessions (so recordings use ON DELETE SET NULL). Fresh fable critic launched.
- C owner questions (defaults built): consent wording text (needed before any class is switched on); one child without consent = class not recorded; auto-delete past recordings on withdrawal (recommended yes, currently per-request); cover teacher can read the class's recordings for 7 days; 30-day retention and its storage cost; one click a day; evaluation recordings only inside timetabled lessons; no playback screen this phase. 13 real-hardware checks listed in C1 section 9.2.
- D-5 (2026-11-11, owner, verbatim): "ok start from money work, then make them commit as often as posibble and stop if they're about to run out of token and commit the work. no more lost works". Applied: D1 build and D2 design keep running and WIP-commit after every step; A0, B0 harness and the C1 critic told to commit and pause until D work lands. At most 2-3 agents at once from here; every brief carries the WIP-commit rule and a "Where I am / next step" line. Agents cannot see the remaining quota, so the conductor paces them.
- 2026-11-11 D2 design + threat model merged (fable). Decisions: the trigger accepts a change only when a `session_cancel_overrides` row for that session, action and transaction exists (only the definer RPC can insert it; RPC granted to authenticated admins, not service_role); token = sha256 over action, session, caller, tier, D1 snapshot_hash and the session's own fields; a raw cancel is never allowed, a raw delete only for a not-started Scheduled session with NONE evidence; tiers T0-T3 (T3 = STRONG + settled: correction reason + review queue); a date move of a started/evidence/settled lesson goes through the checked path; un-cancel via RPC only, to Scheduled, with reason + audit + refresh, attendance NOT restored; a session with evidence cannot be deleted (cancel instead); NO kill switch (owner rollback script + status banner). Adding the guard would break fixtures in cancelled-lessons.test.mjs and class-overhead.test.mjs if they loaded it; they do not today.
- D2 owner questions (defaults in the design): OQ-1 allow deleting lessons with evidence at all (default no); OQ-2 restore marks on un-cancel (no); OQ-3 keep the 15-character reason for future cancels (yes); OQ-4 may an admin review their own correction (yes for now); OQ-5 may the rebuild delete started lessons (no); OQ-6 keep bulk hard-delete (only for not-started lessons without evidence).
- FINDING F-1 for the owner (payroll; NOT fixed - a behaviour change): `normalizeFutureHeld` in schedule-sessions/index.ts:402-425 resets every non-manual Held session with `date >= today` to Scheduled each time the month is scheduled. "Today" is included, so a lesson taught and marked Held this morning goes back to Scheduled when the schedule runs later that day (the nightly rebuild runs 09:00 Hanoi; an admin can also run it). Conductor read the code and confirms the `.gte('date', today)`. Not established: how often this has actually happened live, and whether anything re-flips it. Proposed fix: only touch dates after today, or lessons that have not started. See Q8.
- 2026-11-11 B0 harness paused and merged as WIP (opus, 5da845e; 26 scorer tests reported passing - not re-run by the conductor yet). Reported: Recording = outp1ut_compressed and Untitled = output_compressed (lag 0, no drift); Recording is also the first 86.9 min of Untitled; "je,ch,sa,po" is separate - so TWO unique lessons (~223.5 min), not three or five. 15 children have 50 s+ of speech for a held-out test, 13 clean (S20 and S21 carry a lot of adult-pitch speech; S23 shows no child-pitch speech). Local stack installed: faster-whisper, SpeechBrain ECAPA, torch CPU; whisper-small runs slower than real time here (RTF 1.5). pyannote needs a Hugging Face token (not requested).
- 2026-11-12 D1 build merged (opus, a2387d0): migration 20261112090000_session_held_evidence.sql (NOT applied) + session-evidence.test.mjs. Conductor full run with D1 and C1 merged: 1925 assertions across 32 suites, 0 suite(s) failed (baseline 1611/30/0). Fresh fable review of the function and the D2 design launched (docs/evidence/D-review-1.md). A0 WIP committed by the conductor in its worktree (87c3cab, 5 screens measured); C1 critic lost a second time before writing anything - to be restarted with a commit-first brief.
- 2026-11-12 D review 1 merged (fresh fable, fec657e, docs/evidence/D-review-1.md). A (built function): FAIL, 0 blocker / 1 major / 6 minor - the redacted view returned to a class teacher still carries the full snapshot_hash, from which each child's paid/confirmed/frozen state can be recovered by guessing (probe executed); mutation run 28 mutants, 25 caught, 2 survived. B (guard design): PASS WITH CHANGES, 0 blocker / 5 major / 7 minor; no bypass found (override row + flag + txid prototype executed; cascades and TRUNCATE reach the triggers).
- CONDUCTOR RULINGS on review 1: all eight required changes are adopted as part of the D2 spec. On change 2 the fail-closed option is taken: a signed-in person never gets the raw delete/move lane (that lane is for automation with no auth.uid() only); a person always goes through the checked path with a reason. D1 gets its one revision (A-1 fixed, A-2/A-3/A-6 fixed, tests added to kill the two surviving mutants). Out of D2's scope and recorded for D4: D0 paths S7, S15-S17, S19, S24, S25, O15, O16 and F-1 (Held -> Scheduled, raw attendance edits, time/teacher edits of Held lessons).
