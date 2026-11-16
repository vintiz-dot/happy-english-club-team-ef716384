# PC2 harvest - fixes from the second computer's R15-R20, ported into ours

MONEY: no. Styling only. Base `claude/hec-conductor-setup-efbaa5` at c83ccde9. Nothing pushed, nothing merged, `ivoryScope.ts` untouched.

The second PC restyled the same files (`origin/pc2/R15` ... `R20`, from `conductor/work` 5f233fd4). Our versions were kept. Each pc2 fix was checked against OUR file: (a) ours already handles it, (b) ours had the defect, ported in our own code's shape, (c) not applicable or not a defect.

## Verdicts

| Batch | pc2 commit | What it fixes | Verdict | Reason (ours) / commit |
|---|---|---|---|---|
| R15 | d83fedf1 | name columns squeezed to one letter at 375 | a | ByClass trigger is `flex-col` below sm; ByTeacher name block has no `flex-1` (auto basis takes its own line when it wraps); StarsTools linked row already `basis-48` |
| R15 | 85571fbd | records child column too narrow beside Link | a | our ChildCell wraps (`flex-wrap`) and the name keeps `min-w-[9rem]`; Link drops under it |
| R15 | ee1674b6 | records sort headers under 44 px wide | a | already `min-h-hec-target min-w-hec-target` |
| R16 | 09020cfd | skill panel taller than the height its position is computed for | a | panel is `max-h-[min(280px,calc(100dvh-1.5rem))] overflow-y-auto`; correction reasons already `sm:grid-cols-3` |
| R16 | 9b3b021d, e5f3d2d7 | Log Spend opener widens the score column, names truncate | a | ivory row names wrap (never truncate); the opener sits under the score. The truncation pc2 saw is the legacy board, which must stay as it is |
| R17 | 60f6194b + 9bea9312 | Quill toolbar grey (#444) on the dark toolbar | **b** | measured 2:1 icons, black placeholder, white heading menu in dark. **f0e754f7**: token colours with selectors one class more specific than quill.snow.css (no `!important`, so Quill's hover/active/open blue still shows - pc2's `!important` hid the active state of Bold etc.) |
| R17 | 60f6194b | selects in AssignmentUpload not linked to labels | a | ours already `htmlFor` / `id` on Class, Type, Longest video |
| R17 | 60f6194b | rubric label cut at 375 | **b** | label field 123 px beside weight + remove, 2 of 3 labels cut. **9d01f7bc**: own line below sm (now 241 px). The 44-character fixture label is still longer than one line: it is a text field, it scrolls |
| R18 | 83785f41 | chosen picture unreadable in dark | **b** | chosen tile was `bg-hec-sunken` = 6 % lightness in dark (darker than every other tile, black outlines sink into it; same look as a hovered tile). **cab1f4cd**: `bg-hec-brass/15` wash + brass edge |
| R18 | 320cde51 | Language Support "New set" squeezes the title at 375 | a | already `flex-wrap` + `basis-56` |
| R18 | 2bf44a4b | SmartUpload Approve/Reject cut at 375 | a | already `flex-col gap-2 sm:flex-row` |
| R18 | ad8b60cf | Transcripts award actions squeeze the name | a | already `flex-wrap` + `basis-48`. pc2's other change there (talk-share bar brass -> leaf) is a colour choice, not a defect: brass is the DS progress colour |
| R18 | 3684a7c2 | VocabularyAudit name basis | a | already `basis-40` in a wrapping row |
| R18 | 8dbacc9e | accessible names (selects, Standard toggle, picture buttons, comboboxes) | a | every one already named in ours (Class / Student / Standard / "Assigned student: ..." / "Team members: ..." / "Who was ...?" / "Use the picture ...") |
| R19 | 9ff0cb73 | assistant placeholder cut at 375 | **b** | textarea 42 px, one line; "Ask me anything about your learning..." wraps and its 2nd line was cut. **b58f58a8**: ivory `min-h-24` (the height of the two stacked buttons beside it) |
| R19 | 3beab536 | StudioKit card header one word per line | a | header already `flex-wrap`, title `min-w-[8rem] flex-1`, action `ml-auto` |
| R19 | a6e30d52 | StudioKit segmented labels cut | a | ivory segments already `whitespace-normal break-words` |
| R19 | 6203fffd | slider thumbs / notifications popover / quick-jump name | a | thumbs `aria-label={label}`, popover "Notifications", quick jump has an sr-only "Quick jump" below lg |
| R19 | 6203fffd | Team maker class select has no name | **b** | `aria-label` null in ours. **f683f374**: `aria-label="Class"` (its visible label), ivory only |
| R20 | dc89d156 | mini calendar position at 375 | **b** | fixed with no top: opened at 551-977 px of an 812 px screen, last weeks out of reach. **7e712506**: `max-sm:top-16` (now 64-491) |
| R20 | dc89d156 | chip / block text `aria-hidden` (axe label-content-name-mismatch) | c | not ported: hiding the visible words from assistive tech silences axe but does not meet WCAG 2.5.3 (a speech user says what they see). The real fix is a label that starts with the visible "17:30 Starters 1" - text a person hears, for the conductor (also our R20 leftover) |
| R20 | 00d8735f | PodiumBoard avatar alt | a | already `alt={ivory ? "" : undefined}` |
| R20 | 89ca3302 | frame must keep studio ink for the board | a | checked: Star, Arcade and Night boards at 1280 in the ivory frame, light vs dark. The frame colour the board inherits differs (19,29,53 vs 239,232,215) but every text, svg and border colour inside the board is identical in both themes (`PC2-harvest/board-*-probe.json`): nothing in a display board reads the inherited colour. No change (and no legacy `text-ink` utility in an ivory branch) |
| R20 | 77614915 | header `pb-2` so the board is not shifted | c | in the page flow BoardFrame scales by width and takes the height it needs, so the 4 px is a move, not a clip or a resize; the ivory frame is a new look anyway. Not a defect |
| R20 | 1df6fab1 | month select unlabelled | a | already `aria-label={ivory ? "Month" : undefined}` |

6 fixes ported (7 pc2 items, the Quill pair as one), 19 already handled, 2 not ported.

## Checks
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 (final tree).
- `node scripts/design-tokens-check.mjs`: PASS (70 pairs x 2 themes).
- Screens (375, light and dark, ivory state), before = c83ccde9, after = this branch: `PC2-harvest/{before,after}-<screen>-375-<theme>.png` for chat, teams, mini, quill-asg (+ `quill-asg-picker` dark: the heading menu), quill-exam, rubric, picker. 1280 was shot too (probes in `before-probes.json` / `after-probes.json`): no overflow anywhere, every 1280 probe unchanged except the intended ones (composer 42 -> 94 px; Quill colours).
- Probes, dark: Quill icons #444 -> rgb(189,185,173) on rgb(7,12,23); placeholder rgba(0,0,0,.6) -> ink-faint; heading menu white -> raised. Light: icons rgb(68,77,100) (Quill's #444 was close; nothing lost). Chosen picture rgb(7,12,23) -> brass/15 over raised.
- **Unlisted routes, DOM byte-compare** (`PC2-harvest/inert-dom-before-vs-after-unlisted.txt`, normalised outerHTML, 375/1280 x light/dark):
  - AssistantChat on `/family/dashboard`: identical 4/4.
  - TeamMaker (tools sheet, Teams card) on `/teacher/dashboard`: identical 4/4.
  - MiniCalendar open on `/schedule` (admin, `<main>`): identical 4/4.
  - ExamReportEditor dialog on `/teacher/exam-reports`: identical 4/4.
  - `/student/dashboard` composer: differs by the one class string, as intended - that route is LISTED (the live student area): **this change shows on the live student and parent assistant once merged to main**.
  - AssignmentUpload, VideoRubricEditor, PictogramPicker are staff-only files with no legacy branch (hec classes directly, by the rollout's rule): on their unlisted routes the DOM differs only in the edited class attributes (`outside class attributes: identical`).
- Harness: `C:\Users\Dell\hec-tools\pc2h-harness` (r20 preview + r17 homework fixtures, made-up, every non-local request aborted, ARASAAC answered locally with a made-up black-outline picture). Routes are listed at run time from localStorage in the harness's own `main.tsx` (`PC2-harvest/harness-main.tsx.txt`), so `src/lib/ivoryScope.ts` was never edited. Script `PC2-harvest/pc2h.mjs.txt`, compare `domcmp.mjs.txt`.

## Not verified
- Real ARASAAC pictures (the harness answers with a made-up transparent picture with black outlines, the shape of ARASAAC's); real phone fonts.
- Quill's link tooltip (white with #444 text in both themes: readable, untouched) and colour-swatch menus were not opened.
- The other Quill editors (HomeworkSubmission, JournalEditor, EditHomeworkDialog, ClassHomework) were not in pc2's fix and were not checked; they likely show the same #444 toolbar in dark where they are in the new design (`HomeworkSubmission` is on the live student area). For the conductor.

## Behaviour, not styling (raised in pc2's notes; not fixed here)
- `src/components/admin/AnnouncementManager.tsx` (pc2 R15): deletes an announcement at once from the trash icon, no confirm.
- `src/components/admin/stars/StarsTools.tsx` (pc2 R15): "Unlink" acts at once, no confirm.
- `src/components/admin/assignments/AssignmentByStudentView.tsx` (pc2 R15): table row opens its dialog on click only, not by keyboard.
- `/student/dashboard` announcements (pc2 R15): a banner announcement renders as an empty band under the sticky-header one.
- `src/components/resources/ResourceUploadDialog.tsx` (pc2 R17): vocab-tag `PopoverTrigger asChild` on a plain div (axe critical `aria-allowed-attr`); fixing changes when the popover opens.
- `src/components/teacher/TeacherJournalViewEnhanced.tsx` (pc2 R17): tabs overflow at 375 and its student/class Select has no name.
- `src/pages/TeacherSmartUpload.tsx`, `TeacherTranscripts.tsx`, `src/components/teacher/TeacherProfilePictureUpload.tsx` (pc2 R18): hidden file inputs behind a `<label>` are not reachable by keyboard.
- `src/pages/TeacherTranscripts.tsx` (pc2 R18): "quiet" speaker shown by colour only; a word would be a text change.
- `src/components/NotificationBell.tsx` and `src/components/AdminTopBar.tsx` (pc2 R19 changed them to buttons; ours keeps them, as our R19 listed): notification rows are clickable divs and breadcrumb links are `<a>` without href - neither reachable by keyboard.
- `src/components/calendar/MonthView.tsx`, `TimeGridView.tsx` (pc2 R20, our R20): chip/block `aria-label` order differs from the visible text (WCAG 2.5.3); needs a label rewording.
- `src/pages/FamilyDetail.tsx` (pc2 R20): "Remove" takes a child out of the family at once, no confirm.
- `src/components/calendar/MonthView.tsx` (pc2 R20): month view at 375 cannot give 44 px days; needs a phone layout.
