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
| `npx --yes bun test scripts/payrollCalculation.test.ts` | 6 pass, 0 fail; all six scripts/*.test.ts: 28 pass, 0 fail (A0 agent, bun 1.4.4; not re-run by conductor) | | docs/ENHANCEMENT_BASELINE.md |
| production build | initial JS 216.3 KiB gzip; total JS 1474.7 KiB; CSS 44.3 KiB; every Layout page also loads a 392 KiB chunk holding recharts + jsPDF + html2canvas | | docs/ENHANCEMENT_BASELINE.md |

## 5. Task table

Status: todo / running / review / PASS / FAIL / reverted / blocked-owner. Model = implementer / reviewer.

| Id | Task | Model (impl / review) | Files owned | Status | Evidence |
|---|---|---|---|---|---|
| D0 | Inventory of cancel / owe-changing paths | sonnet / fable | docs/evidence/D0-inventory.md | PASS (conductor spot-check) | docs/evidence/D0-inventory.md, 480ad48; 6 claims re-read in code by conductor |
| D1 | Evidence model design; `session_held_evidence` | fable design, opus build / fable | docs/evidence/D1-evidence-model.md; supabase/migrations/2026111209*_session_held_evidence.sql; scripts/pgtest/session-evidence.test.mjs | PASS (fable review 2, 8b9d1a2, no findings; suite 143/0) | docs/evidence/D1-evidence-model.md, 61ce962 |
| D2 | Guard: trigger + `cancel_session_checked` + threat model | fable design, opus build / fable | docs/evidence/D2-*.md; guard migration; manage-session; bulk-cancel-sessions; pgtest | SQL guard: review 2 PASS WITH CHANGES (2 major, 7 minor, no executed bypass of the checked path); revision + edge functions running (opus) | docs/evidence/D2-guard-design.md, D2-threat-model.md |
| D3 | Nudge UI + override review screen | sonnet / opus + fable wording | CancelSessionDialog, SessionActionsModal, EditSessionModal, DeleteSessionDialog, BulkSessionDelete, new review screen | todo | |
| D4 | Other tuition-affecting actions | fable design, opus build / fable | docs/evidence/D4-*.md; migration; affected dialogs | todo | |
| D5 | Invariant audit + regression tests + owner SQL | fable audit, sonnet/opus tests / fable | docs/evidence/D5-audit.md; scripts/pgtest/*; scripts/CHECK-past-cancellations-with-evidence.sql | todo | |
| A0 | Baseline | sonnet (haiku captures) / fable | docs/ENHANCEMENT_BASELINE.md; docs/evidence/A0/ | PASS (sonnet, e4df152; conductor re-ran tsc + pgtest, viewed a screenshot, checked the PDF-import claim) | docs/ENHANCEMENT_BASELINE.md, docs/evidence/A0/ |
| A1 | Plan + critic | fable / fable critic | docs/evidence/A1-plan.md | PASS (fable, 85051bd; conductor read sections 1.3-4 as the critic - no separate critic, see D-8) | docs/evidence/A1-plan.md |
| A2 | Teacher stability: flipbook, tooltips | opus / fable | TeacherBooks + viewer, SkillButton, LiveEngagementHUD, tooltips in TeacherLeaderboards/SmartUpload/Transcripts | todo | |
| A3 | Speed | sonnet bundle, opus data / same-or-higher | set in A1 | todo | |
| A4 | Design system + a11y + dark mode | fable system, opus first screens, sonnet rollout / fable | docs/DESIGN_SYSTEM.md, src/index.css, tailwind.config.ts, student dashboard | todo | HOLD at checkpoint |
| A5 | Security audit, report only | fable x2 / opus verifier | docs/AUDIT_FINDINGS.md | todo | |
| B0 | Harness + vendor research + audio prep | opus, sonnet, haiku / fable | scripts/lesson-eval/; docs/evidence/B0-*.md | DONE (opus, 0241f04; scorer tests 26/26 reported; conductor checked no audio or file names in the repo) | docs/evidence/B0-harness.md, B0-vendors.md |
| B1 | Transcript quality | sonnet runs, opus scorer / fable method | docs/evidence/B1-*.md | todo | vendor rows need Q1 |
| B2 | Speaker identification | opus / fable | scripts/lesson-eval/; docs/evidence/B2-*.md | todo | |
| B2b | CPU-only performance | sonnet / opus, fable decides | docs/evidence/B2b-*.md | todo | |
| B3 | Monitor design, no code | fable / fable critic | docs/LESSON_MONITOR_DESIGN.md | todo | |
| B-GATE | docs/LESSON_MONITOR_REPORT.md, then STOP | fable | docs/LESSON_MONITOR_REPORT.md | todo | |
| C1 | Recorder architecture, schema, RLS, consent | fable / fable critic | docs/evidence/C1-architecture.md; recorder migration; scripts/pgtest/recorder.test.mjs | critic FAIL (opus, 3df105d: 2 blockers, 5 majors, all executed) -> revision 1 running (opus) | docs/evidence/C1-architecture.md, 50ce61b |
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
- Q8. RESOLVED 2026-11-12 (see stage log): today is now excluded; the function turned out never to have run.
- Q9. `normalizeFutureHeld` has never worked (LIKE on a date column). Repair the month filter so wrongly-Held FUTURE lessons are reset to Scheduled, or delete the function? Default: leave as is.
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
- 2026-11-12 D1 revision + D2 SQL guard merged (opus, b95cd12): 20261112090000 revised in place, new 20261112091000_session_cancel_guard.sql (NEITHER applied), session-cancel-guard.test.mjs. Conductor full run on the merged branch: 2157 assertions across 33 suites, 0 failed (was 1925/32). Builder found and fixed a real defect in the first build: the evidence function's access gate let through a caller with no uid and no role (NULL logic). Reported not built: re-runs of stars-sync-engine / stars-sync-homework / ta-standing with D1+D2 loaded (their fixtures lack tables D1's preflight needs); evidence dated on a move's destination day; two-connection locking checked from code order only. Review 2 (fresh fable) running; it stopped once on the usage limit with its placeholder committed and was resumed 07:31.
- 2026-11-12 Q8 / F-1. Owner, verbatim: "yes fix normalizefutureheld too". Done: `.gte('date', today)` -> `.gt('date', today)`, pushed alone to main. Edge-functions type check 5/5. WHILE FIXING, the conductor found F-1 has never fired: the same select filters the DATE column with `.like('date', 'YYYY-MM%')`, which Postgres rejects. Live probe of the REST API with the publishable key (limit=0, no rows): `date=like.2026-11%` -> 42883 "operator does not exist: date ~~ unknown"; control `date=gte.2026-11-01` -> 401 (valid query, no grant). supabase-js returns data = null on that error, so the function returns [] and resets nothing. So no taught lesson was ever un-Held by this path, and equally no wrongly-Held future lesson was ever normalised. The LIKE was deliberately NOT repaired (that would switch on a reset that has never run - owner decision, Q9). NOT redeployed: the deployed behaviour is identical before and after (a no-op either way), and deploying this 856-line function by hand costs usage for no effect; it goes out with the next schedule-sessions deploy.

## 11. Progress meter (owner asked for a percentage after each run)

Units are rough effort weights; a unit counts as done only when merged AND checked by the conductor. Reviews and gates are counted, because they are real work. Total 51.

| Stream | Units | Done | What is done |
|---|---|---|---|
| D money integrity | 18.5 | 6.0 | D0, D1 design, D1 build + revision, D2 design, D2 SQL guard. Left: review 2, edge functions + review, D3 dialogs + review, D4 design/build/review, D5 audit/tests/owner SQL |
| A overhaul | 12.0 | 3.0 | A0 baseline, A1 plan, A3.1 and A3.3 (merged; G5 pending). Left: A1, A2, A3, A4 (system, dashboard, dark mode + a11y), A5 |
| B lesson monitor evaluation | 10.5 | 3.0 | vendor research, audio prep, harness. Left: B1, B2, B2b, B3, report |
| C class recorder | 8.0 | 1.5 | C1 architecture + migration + tests. Left: critic, C2, C3, C4, C5 |
| Final gates and report | 2.0 | 0 | |
| **Total** | **51.0** | **13.5** | **26%** |

Log: 2026-11-12 07:45 - 19%.
Log: 2026-11-12 08:00 - 20% (A0 merged).

- 2026-11-12 A0 baseline merged (sonnet, e4df152): 12 screens x 3 widths x light/dark through the fake client, harness kept at C:\Users\Dell\hec-tools\a0-harness\. Headlines: slowest at 4x CPU are admin Payroll (~21 s) and admin class sessions (~14 s) - dev-server numbers, comparable only against the same harness; at least one critical axe violation on every screen; parent view overflows horizontally at 375; 27 of 38 icon-only buttons unlabelled; 67 `select('*')` in src, 25 in functions. Weak spots: admin Tuition throws against the fake and admin Payroll shows no pay lines (layout cost only); no production-build runtime numbers. Conductor saw in the 375 student-dashboard screenshot a speech bubble covering the child's name - a visible defect for A4.
Log: 2026-11-12 - 22% (D review 2 merged; D1 PASS).

- 2026-11-12 D review 2 merged (fresh fable, 8b9d1a2). D1: PASS, no findings. D2 SQL guard: PASS WITH CHANGES, 0 blocker / 2 major / 7 minor; no executed way to cancel, un-cancel, delete, re-class or date-move a started or evidence lesson outside the checked path; nothing fails open; no existing object changed. Mutation: 43 mutants, 32 caught by FAIL lines, 8 only by a suite crash, 3 survived (one a real untested condition: raw move out of a settled month). Majors: F-1 an admin's raw `UPDATE attendance SET session_id = <other lesson>` strips a taught, paid lesson of its evidence so a later cancel is tier T1 with no review; F-2 until the edge functions are rewired, manage-session still writes with the service key and so takes the automation lane.
- CONDUCTOR RULINGS on review 2: F-1 IS a bypass of correction mode and must be fixed before anything is handed to the owner (re-parenting attendance to another session is refused or counted by `_session_erased_recently`; fail closed). F-2 is closed by the edge-function task, which must call the checked RPCs with the ADMIN'S OWN JWT, never the service key, for every person-initiated change. Also required in the revision: a session's primary key cannot be changed; destination evidence and a settled destination month put a move on the reviewed path; tests that kill the three surviving mutants; fixture calls wrapped so a failure is a FAIL line, not a crash; the 11 contract gaps filled. Deferred with a note: deleting points/transcripts before a cancel is only audited (D4); wiring the recorder view into `session_recording_evidence` happens when the recorder migration ships (C).
- D-6 (2026-11-12, owner, verbatim): "so, I'd say use the most optimized models, optimized for speed, cost and accuracy and finish this project. i change my plan to ultra." Applied from here: the cheapest model that can be verified does each task - sonnet by default, haiku for mechanical jobs with a deterministic check, opus for diagnosis, risky rewrites, harness/recorder core and critics, FABLE only for money / cancellation / tuition design and reviews, consent and biometric decisions, and the gates (the conductor). This departs from the brief's routing in two places, recorded here: plan critics and the recorder (C1) critic now run on opus, with the conductor reading every blocker and major itself. Concurrency raised to four agents; the commit-every-step rule (D-5) stays.
- 2026-11-12 08:30 resumed after another limit stop (nothing lost: both agents had committed): D2 revision + edge functions (opus), A1 plan (fable, half written), B0 harness to completion (opus), new C1 critic (opus, commit-first).
- D-7 (2026-11-12, owner, verbatim): "continue, use your recommendations for any open decision left." Applied - every open policy question takes its recommended default and is no longer blocking:
  - Q1 vendor proxy: recommendation is NOT to deploy `audit-eval-proxy` now, because no vendor's terms are confirmed under the owner's own rule (OpenAI zero-retention unconfirmed for this org, Azure no-training clause not found, Gemini fails). The evaluation runs on local tools; vendor rows are reported "not tested". The proxy is still written and tested so it can be deployed later with one approval.
  - Q9 `normalizeFutureHeld`: left as is (never ran; not repaired, not deleted).
  - D1: all-Absent register = SOFT; Pixel Pal marks = STRONG; credit carried in is not "paid"; homework = SOFT only; Held in a locked payroll month = SOFT + settled.
  - D2: lessons with evidence cannot be deleted (cancel instead); marks are not restored on un-cancel; 15-character reason kept for every cancel; an admin may review their own correction for now; the rebuild never deletes a started lesson; bulk hard-delete only for not-started lessons without evidence.
  - D4 (Q2): two-admin approval built OFF; the threshold proposed by the D4 design becomes the default setting.
  - C: one child without consent = class not recorded; past recordings auto-deleted on consent withdrawal; cover teacher read access 7 days; retention 30 days; one click a day; evaluation recordings only inside timetabled lessons; no playback screen this phase.
  - A: fonts and any other choice raised by the A1 plan take the plan's recommended default, unless it needs a new npm dependency (then it is dropped).
  NOT covered by this instruction, because each is an act only the owner can perform or an explicit gate in the brief: pasting migrations; deploying D's edge functions (they must ship together with the migration paste and the dialogs); the consent wording text and the confirmation that parental consent is on file; the recorder's first real class; MONITOR_GO; the design rollout beyond the checkpoint (the owner has not seen it yet).
Log: 2026-11-12 - 24% (A1 plan merged).

- 2026-11-12 A1 plan merged (fable, 85051bd): 15 active tasks in 4 waves (A2 x3, A3 x7, A4 x5) + the held rollout A4.6. Top items: A3.1 take recharts/jsPDF/html2canvas out of the Layout chunk (392 -> <=150 KiB gzip on every Layout page; chain Layout.tsx:16 -> ClassroomToolsLauncher -> LeaderboardTool -> ClassLeaderboardShared -> StudentAnalyticsModal); A2.2 the "flipbook" is a third-party iframe that is unmounted when the `[user]` loader re-runs on token refresh / refocus, resetting the book to page 1 (hypothesis, A2.1 measures it); A3.3 parent view 78 -> <=40 requests. Dropped by the 5%/low-risk rule: vendor manualChunks, staleTime tuning, the `useAuth` root fix, board re-renders, list virtualisation (new dependency), the other 51 `select('*')`, lazy framer-motion, web-font download.
- D-8: the conductor acted as the A1 critic (read the task specs, proofs, waves and conflicts) instead of spawning a separate one, under D-6. Design defaults adopted under D-7: the logo is leaf GREEN, not navy/brass - navy ink + warm ivory carry the interface, brass is the one interactive accent, the logo green stays for the mark and a darkened leaf for success states; system serif stack for display headings (no font download); dark mode default Light until the rollout finishes; theme remembered per device and user id (no migration); the `useAuth` root fix becomes its own reviewed task after A; speed and stability tasks ship wave by wave once gated.
- A wave 1 launched: A2.1 diagnose (opus), A3.1 (sonnet), A3.3 (sonnet), A4.1 design system (fable).

- D-9 (2026-11-12, owner, verbatim): "you have superbase connected you can push the migrations, all parents have given concent for biometric data, ship all codes and redeploy whatever you need to. i saved a new recording in the lessons file. MONITOR_GO. you can also start the ui/ux design as well."
  What the conductor takes this to authorise:
  - MIGRATIONS: the conductor may apply migrations to the live project through the Supabase connection instead of waiting for a hand paste. Rule kept: only a migration that has passed its review and the full pgtest run on the merged branch is applied; each application is logged here with the file name, time and a post-apply probe.
  - SHIPPING: gated work may be pushed to main and its edge functions deployed without a further question, including workstream D (cancellation) - but D ships as ONE unit (migration + edge functions + dialogs), because the functions fail closed without the migration and the old dialogs break against the new functions.
  - CONSENT: the owner states all parents have consented to biometric (voice) data. Recorded as the owner's statement of 2026-11-12. The recorder's per-class switch still defaults OFF and the consent confirmation is still recorded per class in the app by an admin; the consent WORDING text and the Vietnamese data-protection adviser check remain flagged, not claimed.
  - UI/UX design: started (A4.1 running). The design CHECKPOINT (owner sees before/after of the student dashboard before the rollout to other screens) is kept, because the owner has not seen the design yet; it costs one look.
  NOT taken as authorised: sending children's audio to a vendor. The owner's own rule ("if a vendor cannot offer that, skip it") still fails for every vendor checked, so `audit-eval-proxy` stays undeployed and the evaluation stays local unless the owner says to send audio anyway.

MONITOR_GO
(written by the conductor on the owner's instruction of 2026-11-12, quoted above. The monitor is built after the measurements and the B3 design exist, not before them.)
- D-10 (2026-11-12, owner, verbatim): "find the best vendor and ignore the previous rule, and show me the designs". Applied: the rule "skip a vendor that cannot offer zero retention / no training" is LIFTED by the owner for the evaluation. Vendor testing goes ahead through the temporary admin-only `audit-eval-proxy` (to be written, reviewed, then deployed by the conductor under D-9), using the vendors we hold keys for (Azure Speech, OpenAI, Google/Gemini) with the most private settings each one does offer, codes only, never names, hard caps on calls and minutes, teardown script first in the owner actions. Each vendor's actual retention/training terms are still reported beside its results so the choice is informed. Designs: A4.2 (student dashboard restyle) is pulled forward to run as soon as the A4.1 tokens merge, ahead of A3.5/A3.6 on the same file.
- 2026-11-12 C1 critic merged (opus, 3df105d, docs/evidence/C1-critic.md): FAIL - 2 blockers, 5 majors, 8 minors, every blocker and major executed in pglite. F1 `was_completed` can be faked (one 1-byte chunk claims 90 minutes; the span is the client's claim); F2 a teacher given ONE session of the class (up to 60 days ahead / 7 back) can read every recording of the class; F3 a child's consent wording version is never compared with the current one; F4 the recorder can null `session_id` on an open recording (erases evidence, allows a second live recording); F5 the server accepts capture 20 min before to 30 min after (rule: 5 before to end + grace); F6 the "no files left" check before `deleted` fails OPEN when the function owner cannot bypass RLS (audio orphaned); F7 two mutants survive in the access rule (archived teacher still a teacher; cover window widenable).
- CONDUCTOR RULINGS on the C1 critic: all seven are fixed in one revision before C2 builds on it and before the migration is applied. F1: `was_completed` and the confirmed span must rest on what the SERVER can see (stored objects and their sizes, server timestamps between arm and finalize), never on client-claimed durations; a span longer than the server-side elapsed time is refused. F2: a cover teacher reads only the recording of the session they covered, not the class. F5: server window = 5 minutes before the scheduled start to scheduled end + the grace setting. The recorder is the only source of a "completed recording" evidence item in D1, so it is not wired into D1 until this revision passes a second review.
Log: 2026-11-12 - 25% (B0 harness merged).

- 2026-11-12 B0 harness complete and merged (opus, 0241f04). The owner's new recording is lesson L3: 76.7 min, 48 kHz AAC mono; cross-correlation against the other five files matched 0 of 24 windows (max 0.30-0.36), so it is a separate recording. Unique lesson audio is now THREE recordings, about 300 min. First local identification run (SpeechBrain ECAPA, 23 children enrolled, 3 held out as open-set, synthetic mixes): equal error rate 26-39%; at a 1% false-accept target only 11-53% of turns get a name and the rest stay UNKNOWN; about 100 turns per set is too few to demonstrate a 1% rate (the scorer flags it). Read plainly: with these short, compressed video clips as enrolment, voice identification of children is NOT reliable enough to name speakers - this is an upper-bound setting and it is already weak. B2 must test better embeddings / longer enrolment before any conclusion; the monitor design must assume "unknown" is the common case. pyannote still needs a Hugging Face token (not requested). B2 (opus) is queued behind the A wave-1 agents because eight processes on eight cores would distort every measurement.
- D-11 (2026-11-12, owner, verbatim): "keep everything local and continue." No cloud session. Keep-awake requested for the session; a closed lid still sleeps.
- 2026-11-12 A3.3 merged (sonnet, 127088c): parent view batched to one request per table with the original per-child code kept as fallback (on error or >=1000 rows). Conductor reviewed the diff (same tables, columns, caller client; `maybeSingle` semantics for 0 and >1 rows preserved) and re-ran `npx --yes bun test scripts/familyDashboardBatch.test.ts`: 6 pass, 0 fail - serialised output byte-identical for 1, 2 and 6 children. Requests on the fake: 2 children 11 -> 7; 6 children 30 -> 7. Harness parent-view figure (78 -> about 24) is the agent's calculation; G5 measures it after the wave. Not shipped yet: goes with the wave after G1-G6 on the merged branch.
Log: 2026-11-12 - 26% (A3.1 merged).

- 2026-11-12 A3.1 merged (sonnet, 95b92aa): Layout chunk 391.9 -> 48.3 KiB gzip (target <=150); recharts / jsPDF / html2canvas hits in it 82 / 87 / 23 -> 0 / 0 / 0. JS to first render, summed from chunk files: student dashboard 704.0 -> 503.5 (-28.5%), teacher dashboard -43.5%, admin tuition -52.5%. Total JS across ALL chunks 1474.7 -> 1515.2 (+2.75%, over the plan's 2% line; 231 chunks vs 147). RULING: accepted - no user downloads the total; what each page loads fell by 28-52%. Conductor read the four exporter diffs (TuitionBulkDownload, HomeworkPdfDownload, ProfileShareCard, reportPdf): import lines moved into the handler as `await import(...)`, nothing else changed. NOT proven by the agent: a homework PDF, a profile share image and a tuition bulk PDF generated before/after (the fake client lacks their data) - to be clicked once on the live site after shipping. Follow-ups: StudentClassLeaderboard.tsx still imports StudentAnalyticsModal statically, so recharts still loads on the student dashboard (folded into A3.5); lazyRetry's "new version" toast has no reload button.
- A wave 2 (part): A3.2 entry-chunk diet (sonnet), A3.4 shell asks once (sonnet) launched; A2.2/A2.3 wait for the A2.1 diagnosis. B2 speaker identification (opus) launched.
