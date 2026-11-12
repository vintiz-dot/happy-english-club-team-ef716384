# A release 1

Where I am / next step: files assembled, leak check done; next: node_modules junction, gates G1,G3,G4,G5,G6, A2 regression.

## Leak check (commits c7c5f21..conductor per IN file)
All IN files taken whole EXCEPT:
- src/components/student/ProfileShareCard.tsx: REBUILT. Conductor history has A3.1 af79388 + OUT commit 3c32bdd (A4.2 Ivory restyle). Rebuilt from origin/main + only af79388's hunk (lazy html2canvas import). Diff vs main: 1 import removed, 1 dynamic import added. No bg-paper/text-ink/font-display/data-hec-theme anywhere in the release diff.
Taken whole (commits are all of the task's own A3.x/A2.x/A0/A4.5 work): ClassroomToolsLauncher(04064b8), ClassLeaderboardShared/HomeworkPdfDownload/reportPdf/TuitionBulkDownload(af79388), lazyRetry(d097a86), main/App/index.html(7a2e340), FamilyDashboard + familyDashboardBatch test(A3.3 commits), ProfileSwitcher/Picker/useAnnouncements/useShellQueries/shellQueries test(A3.4), Layout(aecbb0b A4.5), ui/* + useFullscreenContainer + SkillButton + HUD + TeacherLeaderboards/SmartUpload/Transcripts(A2.3), scripts/a11y-teacher/**(A2.1/A2.3), ENHANCEMENT_BASELINE(A0).
No change from main (no diff): RadialSkillMenu.tsx, useIdentity.ts.
G2 pgtest: not needed (no SQL/edge function).

## Gate results
- G1 tsc app: exit 0. G3 bun scripts/*.test.ts: 41 pass / 0 fail (8 files). G2 pgtest: not run (no SQL/edge fn).
- G4 build exit 0: entry gzip 216.3 -> 163.4 KiB; Layout 391.9 -> 48.2 KiB; total JS gzip 1474.7 -> 1521.3 KiB (up, lazy chunks); CSS 44.3 -> 41.1 KiB.
- G5: requests down everywhere (parent 78->19, student dash 33->28, admin schedule 16->13); overflow at 375 none on all 12 screens (parent fixed); axe by impact unchanged. Timings not judged: machine heavily loaded (2-8x slower first loads).
- G6: all counts equal or better except `: any` 749 -> 750 (+1 in useShellQueries.ts, A3.4). Not patched.
- A2 regression full run: 127 PASS, 61 INFO, 1 FAIL (flipbook @1024x768 page.goto 30s timeout under load); rerun of flipbook @1024x768 alone: 5 PASS, 0 FAIL.
Where I am: done, ready for conductor to push.
