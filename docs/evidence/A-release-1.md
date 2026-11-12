# A release 1

Where I am / next step: files assembled, leak check done; next: node_modules junction, gates G1,G3,G4,G5,G6, A2 regression.

## Leak check (commits c7c5f21..conductor per IN file)
All IN files taken whole EXCEPT:
- src/components/student/ProfileShareCard.tsx: REBUILT. Conductor history has A3.1 af79388 + OUT commit 3c32bdd (A4.2 Ivory restyle). Rebuilt from origin/main + only af79388's hunk (lazy html2canvas import). Diff vs main: 1 import removed, 1 dynamic import added. No bg-paper/text-ink/font-display/data-hec-theme anywhere in the release diff.
Taken whole (commits are all of the task's own A3.x/A2.x/A0/A4.5 work): ClassroomToolsLauncher(04064b8), ClassLeaderboardShared/HomeworkPdfDownload/reportPdf/TuitionBulkDownload(af79388), lazyRetry(d097a86), main/App/index.html(7a2e340), FamilyDashboard + familyDashboardBatch test(A3.3 commits), ProfileSwitcher/Picker/useAnnouncements/useShellQueries/shellQueries test(A3.4), Layout(aecbb0b A4.5), ui/* + useFullscreenContainer + SkillButton + HUD + TeacherLeaderboards/SmartUpload/Transcripts(A2.3), scripts/a11y-teacher/**(A2.1/A2.3), ENHANCEMENT_BASELINE(A0).
No change from main (no diff): RadialSkillMenu.tsx, useIdentity.ts.
G2 pgtest: not needed (no SQL/edge function).
