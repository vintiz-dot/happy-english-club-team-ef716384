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
| D0 | Inventory of cancel / owe-changing paths | sonnet / fable | docs/evidence/D0-inventory.md | running | |
| D1 | Evidence model design; `session_held_evidence` | fable design, opus build / fable | docs/evidence/D1-evidence-model.md; supabase/migrations/2026111209*_session_held_evidence.sql; scripts/pgtest/session-evidence.test.mjs | running (design) | |
| D2 | Guard: trigger + `cancel_session_checked` + threat model | fable design, opus build / fable | docs/evidence/D2-*.md; guard migration; manage-session; bulk-cancel-sessions; pgtest | todo | |
| D3 | Nudge UI + override review screen | sonnet / opus + fable wording | CancelSessionDialog, SessionActionsModal, EditSessionModal, DeleteSessionDialog, BulkSessionDelete, new review screen | todo | |
| D4 | Other tuition-affecting actions | fable design, opus build / fable | docs/evidence/D4-*.md; migration; affected dialogs | todo | |
| D5 | Invariant audit + regression tests + owner SQL | fable audit, sonnet/opus tests / fable | docs/evidence/D5-audit.md; scripts/pgtest/*; scripts/CHECK-past-cancellations-with-evidence.sql | todo | |
| A0 | Baseline | sonnet (haiku captures) / fable | docs/ENHANCEMENT_BASELINE.md; docs/evidence/A0/ | running | |
| A1 | Plan + critic | fable / fable critic | docs/evidence/A1-plan.md | todo | |
| A2 | Teacher stability: flipbook, tooltips | opus / fable | TeacherBooks + viewer, SkillButton, LiveEngagementHUD, tooltips in TeacherLeaderboards/SmartUpload/Transcripts | todo | |
| A3 | Speed | sonnet bundle, opus data / same-or-higher | set in A1 | todo | |
| A4 | Design system + a11y + dark mode | fable system, opus first screens, sonnet rollout / fable | docs/DESIGN_SYSTEM.md, src/index.css, tailwind.config.ts, student dashboard | todo | HOLD at checkpoint |
| A5 | Security audit, report only | fable x2 / opus verifier | docs/AUDIT_FINDINGS.md | todo | |
| B0 | Harness + vendor research + audio prep | opus, sonnet, haiku / fable | scripts/lesson-eval/; docs/evidence/B0-*.md | running (research done, harness + audio prep running) | |
| B1 | Transcript quality | sonnet runs, opus scorer / fable method | docs/evidence/B1-*.md | todo | vendor rows need Q1 |
| B2 | Speaker identification | opus / fable | scripts/lesson-eval/; docs/evidence/B2-*.md | todo | |
| B2b | CPU-only performance | sonnet / opus, fable decides | docs/evidence/B2b-*.md | todo | |
| B3 | Monitor design, no code | fable / fable critic | docs/LESSON_MONITOR_DESIGN.md | todo | |
| B-GATE | docs/LESSON_MONITOR_REPORT.md, then STOP | fable | docs/LESSON_MONITOR_REPORT.md | todo | |
| C1 | Recorder architecture, schema, RLS, consent | fable / fable critic | docs/evidence/C1-architecture.md; recorder migration; scripts/pgtest/recorder.test.mjs | running | |
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
