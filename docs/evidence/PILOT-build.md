# PILOT build - lesson monitor Option A (Venus, Victor)

Owner's decision (D-28): "lesson pilo yes. with venus teacher victor."

**Where I am / next step:** migration `20261117090000_lesson_monitor_pilot.sql` + pgtest `lesson-monitor.test.mjs` (168 pass). Next: the Python job under `scripts/lesson-monitor/` (pure parts first, with tests), then step 0, the screen, the runbook.

## Log
- Branch worktree-agent-afb17da402460d041, reset onto the conductor head c35046d8 (efcb3a64 + D-28 ledger).
- Migration: teacher-only reports (`lesson_monitor_reports`, one SELECT policy: the lesson's teacher, still allowed to listen, <= 30 days), pilot switch per class with ONE named teacher (cover lessons refused), the monitor's own per-child consent, target words, run records, append-only audit, one-command delete. No write grants; no family/student/TA/storage policy.
- Deviation from the design, flagged for the owner: design s.3 step 4 keeps the pilot report on the laptop and writes nothing to Supabase; the conductor's brief asks for an in-app, teacher-only report. Built as asked; `nightly.py --no-upload` keeps the design's local-only path.
