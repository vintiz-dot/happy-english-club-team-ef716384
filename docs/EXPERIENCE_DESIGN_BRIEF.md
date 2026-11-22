# HEC Experience Design Brief

Status: draft for the owner's approval, 22 Nov 2026. Nothing in the app has been built from it yet.

This file is a prompt. Hand it to a Claude Code session together with the part you want built ("Build Phase 1 of docs/EXPERIENCE_DESIGN_BRIEF.md"). It assumes the reader has never seen this app.

Contents

- Part A - Read first: mission, ground truth, hard limits
- Part B - The motion system (the "Signature tier")
- Part C - Teacher brief
- Part D - Admin brief
- Part E - House rules for the family and student rebuild
- Part F - The age engine
- Part G - Student experience, by age band
- Part H - Parent experience
- Part I - Brand affinity playbook
- Part J - Voice, language and sound
- Part K - Build order, checks and shipping
- Part L - Questions only the owner can answer

---

## Part A - Read first

### A1. Mission

Happy English Club (HEC) is an English school in Hanoi. This app is used every day by four kinds of people:

| Person | Device and moment | What "premium" means to them |
|---|---|---|
| Teacher / teaching assistant | Phone or tablet in a classroom, laptop after class | The app answers before they finish the tap, and it notices what they just did |
| Admin (the owner and office staff) | Laptop, many hours, money and records | Certainty: every change is confirmed, nothing is ambiguous |
| Parent | Phone, usually inside Zalo or Facebook's browser, a few minutes | Reassurance and evidence that their child is doing well and cared for |
| Student, age about 4 to 16 | A parent's phone or a shared tablet, a few minutes | It feels made for a child exactly their age, and it is on their side |

Your job is to make each of them feel like a valued client of a first-class school, through motion, reaction and layout, without ever slowing or changing what the app does.

The measure of success is not time spent in the app. It is: homework handed in, lessons attended, parents who can say what their child learned this week, and staff who finish their work faster. A design that raises minutes-in-app but not those four has failed.

### A2. Ground truth about the code (verified 22 Nov 2026)

- Stack: Vite 5, React 18, TypeScript, Tailwind 3.4, shadcn/ui, `framer-motion` 12, `react-router-dom` 7 with `<BrowserRouter>` and `<Routes>` in `src/App.tsx` (not a data router), TanStack Query, Supabase.
- Design system: "Ivory", in `docs/DESIGN_SYSTEM.md`. Tokens live in `src/index.css` (the block headed `"Ivory" design system`) and `tailwind.config.ts` (`hec-*` names). `ROLLOUT_COMPLETE = true` in `src/lib/ivoryScope.ts`: every teacher, admin, family and student route carries `data-hec-theme="ivory"` on `<html>`.
- Shell: `src/components/Layout.tsx`. Admin and teacher get a sidebar; student and family get a top layout. Both branches already sit under `<MotionConfig reducedMotion="user">`.
- Motion pieces that already exist and must be reused, not duplicated:
  - `src/components/fx/AnimatedNumber.tsx` (count-up, honours reduced motion)
  - `src/components/fx/SpotlightCard.tsx` (pointer position into `--mx` / `--my`, no re-render)
  - `src/components/fx/AmbientBackground.tsx` (legacy aurora; only drawn when NOT ivory; do not bring it back)
  - `src/components/student/nova/ivory.ts` (`entrance()`, `reducedMotion()`, the card and button class strings)
  - `src/components/student/CelebrationOverlay.tsx`, `GradeCelebration.tsx`, `SubmitCheckmark.tsx`
  - `src/components/teacher/PointFeedbackAnimation.tsx`
  - `src/lib/soundManager.ts` (Web Audio tones: click, success, checkin, levelUp, questComplete; on/off and volume in localStorage)
  - `src/components/lessonDecks/speech.ts` (browser speech)
  - `src/components/NavProgress.tsx`, `CommandPalette.tsx`, `theme/UserMenu.tsx` (the appearance menu: System / Light / Dark)
- A child's age: `students.date_of_birth` (nullable). `src/hooks/useShellQueries.ts` already loads `id, full_name, date_of_birth` for the shell. `src/pages/StudentDashboard.tsx` has `isYoungLearner()` which turns the birth year into a Vietnamese school grade and sets `data-hec-scale="young"` for Grade 3 and below. That function is the seed of Part F.
- Shared logins: one family account is often used by the parent and by each child. `ProfilePicker` / `ProfileSwitcher` choose the child; the choice is `selected_student_id` in localStorage via `src/contexts/StudentProfileContext.tsx`.
- Student data you may present (never recompute): points and levels (`student_points`, `point_transactions`, `src/lib/levelUtils.ts`, the leaderboard engine through `useClassBoard`), streaks (`student_login_streaks` with `current_streak`, `longest_streak`, `streak_freeze_count`; `student_attendance_streaks`), badges (`AchievementBadges`), quests (`custom_quests`, `DailyChallengesCard`), the wallet (`economy_transactions`, `StudentWallet`).
- There is no i18n framework. Bilingual text exists only where it was written by hand (the `kid` video recorder, Language Support).

### A3. Hard limits. These outrank everything else in this brief.

1. Read `AGENTS.md` at the repo root, `supabase/AGENTS.md` and `src/components/leaderboard/AGENTS.md` before touching anything. Where this brief and those files disagree, those files win.
2. This is a live school with real children and real money. Previews, screenshots and demos use made-up names and figures only. Never sign in as a real person to look at a screen.
3. Presentation only. Do not add a calculation of tuition, payroll, points, levels, discounts or grades in the browser. Every figure comes from where it comes today (`calculate-payroll`, `calculate-tuition` and its `carry.payable`, the leaderboard engine, the approved-report RPCs).
4. Who may see what does not change. A family reads rows about its own children only. Classmates are a name, an avatar and points. Nothing an AI wrote reaches a family before a teacher approves it. Do not add an RLS policy, an RPC or a column to make an effect possible; if an idea needs one, put it in Part L and skip it.
5. Money, a child's name and a destructive button are never animated for effect, never truncated, never ambiguous (design system principle 4). No count-up on a money figure, no celebration on a payment, no motion on a delete button beyond the press state.
6. Out of scope, do not restyle or animate: the three display boards and `ClassBoardWindow` (`src/components/leaderboard/`), the class recorder (`/teacher/recorder`, `src/components/recorder/`), Audit clips, the reception TV (`public/reception-tv/`, ES5 only), every PDF / print template (`src/lib/hecDocs`, `hec-docs/`), the session-guard and cancellation dialogs.
7. Function first, measured: a tap is acknowledged within 100 ms; no animation delays, queues or blocks input; nothing changes layout while a finger is on it; content is usable at the first frame (entrances never set `pointer-events: none`).
8. No new runtime dependency without the owner's yes. Everything in this brief is achievable with what is installed.
9. Ship as `AGENTS.md` says: commit, checks, `git push origin HEAD:main`. Lovable is not used.

### A4. What the owner asked for, in their words

"Mind blowing animations and effects and triggers and reactions"; "make the users feel like premium clients"; "cutting edge and captivating, and always feel new, elegant and mesmerizing, but not to interfere with the functionality of the app". For students: "age dependent, so the display should pull the kids age". For parents and students: techniques that build brand affinity.

How this brief reads that: spectacle that repeats is noticed twice and resented by the tenth time. "Always new" is produced by an interface that reacts to the time, the day, the person and what they just did, in one consistent material language. Wonder is spent where it is earned (a finished register, a level reached) and withheld where people are working.

---

## Part B - The motion system: the Signature tier

Ivory's motion rules (`docs/DESIGN_SYSTEM.md` section 9 and the last rows of section 16) allow one fade and an 8 px rise. This brief adds a second tier on top. Phase 0 writes it into the design system as section 9b; until that is merged, section 9 stands.

### B1. Material language

Everything moves as one of four materials. If an effect cannot be described as one of these, it does not belong.

| Material | Token family | How it moves |
|---|---|---|
| Paper | `hec-paper`, `hec-surface`, `hec-raised`, `hec-honey` | Lifts, settles, slides over other paper. Has weight: starts fast, lands slowly. Never stretches, never wobbles (staff, parents, teens). |
| Ink | `hec-ink`, `hec-line` | Is drawn. Ticks, rings, underlines and chart lines draw themselves along their path. Text never flies; it fades. |
| Brass | `hec-brass`, `hec-brass-fill` | Is light. A sheen that travels along an edge, a ring that closes, a dot that breathes. The only thing allowed to glow, and only as a 1 px to 2 px edge, never a halo. |
| Leaf | `hec-leaf` | Grows. Progress fills, sprouts, climbs. Used for growth only (design system principle 3). |

Forbidden materials: glass, blur behind content, gradients as decoration, neon, aurora, coloured shadows, 3D tilt on cards, particles on staff and parent screens. `node scripts/design-rollout-inventory.mjs` counts the legacy utilities (`glass*`, `backdrop-blur*`, `animate-float*`, `hover:scale-*`); that count must not rise.

### B2. Tokens to add (Phase 0)

Add under the same three selectors as the existing motion tokens in `src/index.css`, mirror them in `tailwind.config.ts`, and update `scripts/design-tokens-check.mjs` in the same commit so it knows them.

| Token | Value | Use |
|---|---|---|
| `--hec-dur-4` | 700 ms | a signature moment (the Seal, a Carry between pages) |
| `--hec-dur-5` | 1200 ms | the ceiling for a reward moment |
| `--hec-ease-draw` | `cubic-bezier(0.65, 0, 0.35, 1)` | ink drawing along a path |
| `--hec-stagger` | 40 ms | gap between siblings entering; a group never takes more than 320 ms in all |

Springs for framer-motion, exported from one file (`src/components/fx/motion.ts`), never written inline:

| Name | Config | Use |
|---|---|---|
| `soft` | `{ type: "spring", stiffness: 170, damping: 26 }` | paper settling, layout moves |
| `snappy` | `{ type: "spring", stiffness: 420, damping: 34 }` | press, toggle, tab marker |
| `reward` | `{ type: "spring", stiffness: 300, damping: 18 }` | visible overshoot. Reward moments only, and the two youngest student bands |

Under reduced motion the existing rule holds: nothing runs longer than 0.01 s.

### B3. Motion level: Full / Calm / Off

- One attribute on `<html>`: `data-hec-motion="full" | "calm" | "off"`. CSS effects are written against it; framer-motion effects read it through one hook, `useMotionLevel()`.
- Default: `off` when the device asks for reduced motion; `calm` when the device is weak (`navigator.hardwareConcurrency <= 4`, or `navigator.deviceMemory <= 4`, or `navigator.connection?.saveData`); otherwise `full`.
- The person can change it in `theme/UserMenu.tsx`, beside System / Light / Dark. Stored per signed-in user in localStorage, the same way the theme is (`themeKey` in `src/lib/ivoryScope.ts` is the pattern). The device's reduced-motion request cannot be overridden upward.
- `calm` keeps: press states, the Carry cross-fade, ink draws, the Seal. It drops: ambient effects, pointer-following light, loops, staggers, reward overshoot.
- `off` keeps state changes instant and readable. No information may exist only in an animation.

### B4. Performance budget

- Animate `transform`, `opacity` and `clip-path` only. `box-shadow` changes are done by fading a pseudo-element. Never animate `width`, `height`, `margin`, `top`, `left`, `filter: blur`.
- At most two looping animations on a screen, each paused when its element is off screen (`IntersectionObserver`) or the tab is hidden (`visibilitychange`).
- Pointer-following effects write CSS variables on the element (as `SpotlightCard` does); they never set React state on `mousemove`.
- `will-change` is set when an animation starts and removed when it ends.
- Lists longer than 30 rows get no per-row entrance and no layout animation.
- The motion kit adds no more than 12 kB gzipped to the main bundle. Reward moments are lazy-loaded.
- Target device: a mid-range Android phone from 2020 inside the Zalo in-app browser. If an effect drops frames there, it ships in `calm` form for everyone.

### B5. The kit (create in `src/components/fx/`)

| File | Export | What it is |
|---|---|---|
| `motion.ts` | `soft`, `snappy`, `reward`, `stagger()`, `useMotionLevel()`, `setMotionLevel()` | the only place durations and springs are defined |
| `InkCheck.tsx` | `<InkCheck drawn />` | a tick that draws itself (SVG `pathLength`), 240 ms, `--hec-ease-draw` |
| `InkRing.tsx` | `<InkRing value max />` | a progress ring whose stroke grows; leaf for progress, brass when complete |
| `Seal.tsx` | `<Seal show label />` | the signature completion mark: a brass ring closes clockwise (420 ms), an ink tick draws inside (240 ms), the ring gives one soft pulse of light, done by 700 ms. Renders the label as text for screen readers |
| `BrassEdge.tsx` | `<BrassEdge>` wrapper | a 1 px brass sheen on the card's border that follows the pointer; on touch devices it sweeps once on press. Extends `SpotlightCard`'s technique |
| `PaperPress.tsx` | `pressable` class string | scale to 0.98 and shadow `hec-2` to `hec-1` on press, back with `snappy` |
| `Carry.tsx` | `carry(name)`, `useCarryNavigate()` | shared-element continuity between routes, see B6 |
| `LiveDot.tsx` | `<LiveDot />` | the breathing brass dot for "happening now"; opacity 0.55 to 1 over 2.4 s |
| `NowLine.tsx` | `<NowLine start end />` | a hairline that fills in real time between two clock times; updates once every 30 s, not per frame |
| `Tide.tsx` | `useTide()` | time-of-day warmth, see B7 |
| `Arrive.tsx` | `<Arrive>` / `<ArriveItem>` | the once-per-session assembly of a page in reading order, built on `entrance()` from `nova/ivory.ts` |
| `Tick.tsx` | re-export of `AnimatedNumber` with a `money` guard | throws in development if asked to animate a money value |
| `moments/` | lazy reward moments | see Parts C, G and I |

Each component takes no data of its own: it renders what it is given.

### B6. Carry: continuity between pages

- Use the View Transitions API through one helper. Because the app uses `<BrowserRouter>` (not a data router), do not rely on React Router's `viewTransition` prop until you have confirmed it works with this router; the safe form is `document.startViewTransition(() => flushSync(() => navigate(to)))` inside `useCarryNavigate()`. Do not migrate the router for this.
- The element that carries gets `style={{ viewTransitionName: carry(id) }}` on both pages: a class card's title becomes the class page's title; a student row's avatar becomes the profile avatar; a homework card becomes the homework header.
- Only one named element carries per navigation. Everything else cross-fades in 240 ms.
- Where the API is missing (older Safari, some in-app browsers), navigation is instant. Never polyfill.
- Back navigation carries in reverse.

### B7. Tide: the interface knows what time it is

A single CSS variable `--hec-tide` (0 to 1) set on `<html>` from the Hanoi clock: 0 at 07:00, 1 at 19:00. It may do exactly two things: shift `hec-paper`'s warmth by at most 2 % in lightness and 4 degrees in hue, and choose the greeting line. Contrast must still pass the table in design system section 3 at both ends; `scripts/design-tokens-check.mjs` gains a check for both extremes. In dark mode Tide does nothing.

### B8. "Always new" without novelty for its own sake

- Variation pools: each signature moment has three to five hand-made variations of presentation (the Seal's ring may close clockwise, from the top, from two sides). The variation is chosen by a seed of date + user id, so it is stable within a day and different tomorrow. What is earned never varies; only how it is drawn.
- Context: greetings, empty states and end states read the time of day, the weekday, the season of the school year (first week of term, last week before Tet, exam weeks), and what the person just did.
- Rarity: a milestone moment (100th lesson taught, one year at HEC, a class's first full-attendance week) plays once ever per person and is recorded in localStorage by id and number only, never by name.
- Restraint: no more than one signature moment per screen visit. If two are due, the more important plays and the other becomes a quiet line of text.

---

## Part C - Teacher brief

Character: a skilled colleague's instrument. Fast, precise, warm. The teacher is often standing in front of children with one hand free.

Scope: every route in the teacher sidebar in `Layout.tsx` except the recorder. Read each page and its components before changing it.

### C1. Shell (`Layout.tsx`, sidebar branch)

- Sidebar: the active marker is one shared element that glides between items (`layoutId`, `snappy`). Hovered items get a `hec-sunken` wash, 140 ms. No icon animation.
- Page change: `Carry` where a shared element exists, otherwise a 240 ms cross-fade of `<main>` only. The sidebar and header never animate on navigation.
- `NavProgress` stays; restyle it as a brass hairline.
- Mobile header: the menu opens as paper sliding down, 240 ms; closing is 140 ms.
- First arrival of the day (per user, per device): `Arrive` assembles the page in reading order within 320 ms. Every later visit that day renders instantly.

### C2. Dashboard (`src/pages/TeacherDashboard.tsx`)

| Element | Trigger | Reaction |
|---|---|---|
| "Today's class" card | a lesson is in progress | `LiveDot` beside the "In Progress" badge; `NowLine` along the card's bottom edge from start time to end time |
| | next lesson is within 60 minutes | a calm countdown in words ("starts in 25 minutes"), updated each minute, no ticking seconds |
| | no more classes today | the end state in Part I7: one line, varied by time of day |
| "Mark attendance" button | press | `PaperPress`; then `Carry` the class name to the attendance page |
| Stat tiles: Sessions, Active Classes, Pending Grading | first arrival of the day, or the value changes | `Tick` counts to the value in 600 ms |
| Stat tiles: Earned, Projected | always | no count-up, ever. They honour `FinancialPrivacy`; revealing fades the figure in over 140 ms |
| Pending Grading reaches 0 | value goes from above 0 to 0 while on screen or since last visit | `Seal` in the tile, label "All graded" |
| Projected progress bar | first arrival | leaf fill grows once, 420 ms |
| "My Classes" cards, Quick Actions | pointer | `BrassEdge`; chevron slides 2 px right |
| | press | `Carry` the class name to `/teacher/classes/:id` |
| Today's Agenda rows | lesson ends while on screen | the row's dot turns from brass to ink-faint, the row eases to the completed style in 240 ms |
| Schedule / Leaderboards tabs | switch | the tab marker glides; content cross-fades 140 ms out, 240 ms in. Do not touch the leaderboard's own rendering |

Remove from this page the per-item `initial={{ x: -8 }}` and `x: 8` entrances; `Arrive` replaces them.

### C3. Attendance (`TeacherAttendance.tsx`, `teacher/AttendanceMarking.tsx`)

This is the screen used with a room full of children waiting. Speed is the luxury.

- Marking a child: the response is optimistic and inside 100 ms. Present: `InkCheck` draws in leaf. Late: the same tick in warn with the word "Late". Absent: an ink dash; no red flourish. The row's state is always also written in words.
- A register ring (`InkRing`) in the header counts children marked out of children enrolled.
- Rapid marking: animations never queue. A second tap during an animation finishes the first instantly.
- When the last child is marked and the save succeeds: one `Seal`, label "Register complete". If the save fails, no Seal, and the error is the existing error, unanimated.
- Optional `checkin` tone from `soundManager`, off by default for staff.

### C4. In-class tools (`TeacherClassDetail.tsx`, `LiveAssessmentGrid.tsx`, `RadialSkillMenu.tsx`, `SkillButton.tsx`, `PointFeedbackAnimation.tsx`, `LiveEngagementHUD.tsx`)

The children can see this screen. It is the one staff surface where delight is the function.

- Awarding points: the existing pill becomes a small brass token that travels from the tapped skill to the child's avatar (420 ms, `--hec-ease`), the avatar gives one press-pulse, the child's score ticks up. Removing points: an ink token leaves the avatar and fades; no shake, no red flash.
- Ten awards in two seconds must stay smooth: cap live tokens at 6; beyond that, update the numbers and skip the flight.
- The radial menu opens from the finger: items fan out with a 20 ms stagger, 240 ms in all; closing is 140 ms.
- A child's rank changing inside this grid: rows glide to their new place (`layout`, `soft`). Never animate rank changes in the display boards from here.
- Homework from a lesson deck goes only to children marked Present or Late (see `AGENTS.md`); do not let an animation suggest otherwise.

### C5. Assignments and grading (`TeacherAssignments.tsx`, `HomeworkGrading.tsx`, `HomeworkGradingList.tsx`, `GradeOfflineDialog.tsx`)

- The grading list is a queue: grading one submission slides it out to the left and the next rises into place (`soft`). A slim `InkRing` shows graded out of total.
- Saving a grade: the button's label fades to an `InkCheck` and back in 900 ms; the button stays pressable.
- Last submission graded: `Seal`, "All graded". This is the same moment as the dashboard tile; it plays in whichever place the teacher is.
- Video review (`VideoReviewQueue`, `TeacherVideoDashboard.tsx`): approving feedback plays the Seal with "Sent to family". Nothing here may imply a report is visible to a family before approval.

### C6. Journal, reports, Smart Upload, transcripts, vocabulary audit

- Long writing surfaces get no ambient motion at all. Autosave shows as a small "Saved" that fades in and out, with an `InkCheck`.
- Smart Upload and transcripts already use framer-motion; bring their durations and easings onto the tokens. Work in progress shows honest stages named in words; never a fake progress bar. If the real progress is unknown, show the stage name and a `LiveDot`.
- Approving AI drafts (CEFR points, vocabulary, feedback): each approval is a small `InkCheck`; approving the last one in a batch is a `Seal`.

### C7. Payroll (`TeacherPayroll.tsx`, `TeacherPayrollCalendar.tsx`)

The most restrained teacher screen. Month changes slide the calendar in the direction of travel (240 ms). Figures appear; they do not count, pulse or highlight. "Figure unavailable" is never animated. A closed month shows a small closed-lock glyph, drawn in ink, static.

### C8. Flipbooks and lesson decks (`TeacherBooks.tsx`, `src/components/lessonDecks/`)

- Slides advance with paper sliding over paper, 240 ms, direction-aware. Projected in class, so `calm` and `full` look the same here: no pointer effects.
- The flipbook frame is another site's; do not animate or overlay it.

### C9. Teacher milestones (moments, once each)

First register of a new term; 100th, 500th, 1000th lesson held (from figures the payroll function already returns; do not query for it); a class's first week with every child present. Each is one line of serif text and a Seal, shown on the dashboard, dismissed by doing nothing.

---

## Part D - Admin brief

Character: a control room for people responsible for children's records and a school's money. Premium here is certainty and speed. Motion confirms; it never entertains.

Scope: `src/pages/Admin.tsx` and every tab in `src/components/admin/tabs/`, plus `/students`, `/teachers`, `/families`, `/schedule`, `/tuition`. Excluded: Audit clips, the recorder, session-guard and cancellation dialogs.

### D1. Shell

- The same sidebar behaviour as C1. With 27 items, the sidebar gets no entrance animation at all.
- `AdminTopBar` and `CommandPalette`: the palette opens in 140 ms from the top edge; results cross-fade as they filter, they do not shuffle.
- Tab changes inside `/admin?tab=`: cross-fade of the content area, 140 ms out, 240 ms in. No Carry between tabs.

### D2. Tables and lists (the bulk of admin)

- Rows never animate in on load. A row that is added while the admin watches rises 8 px and fades in, with a brass left edge that fades over 2 s so the eye can find it. A removed row collapses in 240 ms.
- A value that changes after a save gets a brass underline that draws under it and fades in 1.5 s. This replaces count-ups everywhere in admin.
- Sorting and filtering are instant.
- Loading: skeletons the exact shape of the content, cross-fading to it. A skeleton never shimmers for more than 3 s without a line of text saying what is being waited for.

### D3. Money surfaces (Finance, Payroll, Tuition, Families, payments, the Audit register)

- No count-up, no pulse, no colour change for effect. A figure is either there or "figure unavailable".
- Recording a payment: on success, a `Seal` with "Recorded" in the form's footer, and the bill's row gets the brass underline. On conflict (the compare-and-set described in `AGENTS.md`), no animation: the existing message and reload.
- Closing a payroll month (`PayrollMonthLock`): the lock glyph closes once, 420 ms. A closed month that shows drift keeps its existing notice, unanimated.
- Destructive and irreversible actions follow design system section 14 exactly. The confirm dialog opens with the standard dialog motion and nothing else.
- Frozen bills, historical payments, audit decisions: state shown in words and a static glyph.

### D4. AI actions (`AiActionsTab.tsx`, the assistant's confirm card)

- The plan card arrives as paper, 240 ms. Each step in the card is a line of ink.
- `ai_action_apply` does all of it or none of it in one transaction. So on Confirm: the button shows a `LiveDot` and "Applying", then one `Seal` for the whole card. Do not tick steps off one by one; that would show progress that is not real.
- Undo: the card returns to its pre-confirm look with an ink strike through the title, 240 ms.

### D5. Overview and reports

- Charts draw once when first seen (lines draw left to right in 700 ms, bars grow in 420 ms), never on re-render or filter change. Series colours are outside the design system; leave them.
- KPI tiles that are not money may use `Tick`. Money tiles may not.

### D6. Students, Teachers, Classes, Families

- List to profile: `Carry` the avatar and the name.
- The student edit drawer slides in as paper from the right, 240 ms.
- A missing date of birth is the one data-quality gap this brief cares about: add a quiet filter chip "No date of birth" to the Students list (reads the column the list already loads; if it does not load it, add the column to the existing select, nothing more). See Part F.

### D7. Reception, Stars Sync, Automation, Data, Activity

Token alignment only (durations, easings, press states). No new effects.

---

## Part E - House rules for the family and student rebuild

These are the rules of this brief. They sit beside the design system, not above `AGENTS.md`.

1. One question per screen. Student home answers "What do I do now?". Parent home answers "How is my child doing, and does anything need me?".
2. Age decides form, never access. Every band can reach every function it can reach today. Bands change layout, words, size, motion and tone.
3. Calm is the parent's luxury. Delight is the child's. Neither gets the other's.
4. Reward effort and finishing. Never reward rank alone, and never punish absence.
5. Every visit has a finish line. When the work is done the app says so and lets the child go.
6. Predictable rewards, surprising presentation. What a child earns follows rules they can explain. Only the way it is celebrated varies.
7. A child is never shown as last, behind, or failing in front of others.
8. The teacher is present. Praise carries a real teacher's name and real approved words, or it is not shown.
9. Money belongs to grown-ups. Tuition and the wallet's money figures are reachable but are not part of a young child's home.
10. Nothing is truncated. Vietnamese names wrap; line heights from design system section 4 hold.
11. Phone first, 375 px, one thumb, Zalo's browser, a slow connection.
12. Every figure comes from where it comes today (A3.3). Every privacy rule holds (A3.4).

Rebuild means: new information architecture, layouts, components and motion for `/student/*`, `/family/dashboard`, the family hub at `/`, `/tuition` and `/schedule` as families see them, and the student / family branch of `Layout.tsx`. It does not mean new queries, tables or permissions. Keep each page's data hooks; replace what they render. Keep `StudentNavBar`'s routes; replace its form per band.

---

## Part F - The age engine

### F1. One pure module

Create `src/lib/ageBand.ts`. It imports nothing but types. It replaces `isYoungLearner()` in `StudentDashboard.tsx`.

```ts
export type AgeBand = "early" | "young" | "junior" | "teen";
export interface AgeProfile {
  band: AgeBand;
  /** Vietnamese school grade this school year; 0 or below = pre-school. null when unknown. */
  grade: number | null;
  /** false when date_of_birth is missing or implausible */
  known: boolean;
  /** the design system's young scale: true for early and young */
  youngScale: boolean;
}
export function ageProfile(dateOfBirth: string | null | undefined, today: { year: number; month: number }): AgeProfile;
```

Rules:

- Grade, not birthday. A Vietnamese child starts Grade 1 in the September of the year they turn 6. In school year Y (Sept Y to Aug Y+1), grade = Y - birth year - 5. Classmates therefore share a band, and nobody's screen changes on their birthday. This is the rule `isYoungLearner()` already uses.
- `today` is the date in Hanoi (use `dayjs` from `@/lib/date` at the call site; the module itself takes plain numbers so it can be tested).

| Band (internal name, never shown to a child) | Grade | Typical age | Reading |
|---|---|---|---|
| `early` | pre-school and Grade 1 | 4 to 6 | not yet reading English |
| `young` | Grades 2 and 3 | 7 to 8 | simple sentences |
| `junior` | Grades 4 to 6 | 9 to 11 | reads independently |
| `teen` | Grade 7 and above | 12 and over | adult interface |

- `youngScale` is true for `early` and `young`, which is exactly today's rule (Grade 3 and below), so `data-hec-scale="young"` keeps its meaning and its contrast table.
- Missing date of birth: `known: false`, band `junior`, standard scale. `junior` is the safe middle: readable by a seven-year-old, not insulting to a fourteen-year-old.
- Implausible date of birth (computed age under 3 or over 19, or a date in the future): treated as missing.
- The band is derived in the browser from the child's own row. Never store it, never send it anywhere, never add date of birth to anything a classmate's device receives (the class leaderboard, the video wall, the class gallery).

### F2. Where it is applied

- A provider in the student / family branch of the shell computes the profile for the selected child (`StudentProfileContext`'s `studentId`, using the `date_of_birth` that `useShellQueries` already loads) and sets `data-hec-band="early|young|junior|teen"` and, when `youngScale`, `data-hec-scale="young"` on the scoped root.
- Shared logins: when the profile switcher changes child, the band changes with a 240 ms cross-fade of the whole student area. Each child gets their own look on the same phone.
- Components read the band through `useAgeBand()`. CSS reads the attribute. Add Tailwind variants `early:`, `junior:`, `teen:` beside the existing `young:` in `tailwind.config.ts`. Note the existing `young:` variant matches the scale attribute (early and young together); keep it so.
- A parent's own screens (Part H) are never banded. A child's card inside the parent's home may borrow one accent from the child's band.

### F3. Moving up

- The band can change only at the start of a school year (1 September). On the first visit after it does, one moment plays: the page "turns" (paper slides away to reveal the new layout) with the line "A new school year. Your space has grown with you." Recorded per student id in localStorage so it plays once.
- A child may choose an older look than their band (never a younger one is forced on them, and never is the word for the band shown): Profile > "Look" offers "Playful" and "Classic". "Classic" renders the next band up. Stored per student id in localStorage. A choice that follows the child across devices needs a column and is in Part L.

### F4. Tests

`scripts/ageBand.test.ts` (bun; it is picked up by `node scripts/run-bun-tests.mjs`). Cases: each grade boundary on 31 August and 1 September; born in December versus January of adjacent years; missing, malformed, future and implausible dates; that `youngScale` equals the old `isYoungLearner()` answer for every birth year from 2008 to 2023 at three dates in the school year.

---

## Part G - Student experience, by age band

Shared by all four bands:

- Home is built from the same data hooks `StudentDashboard.tsx` uses today.
- The first card is always "the next thing": the most urgent open homework, or the next lesson, or the finished state.
- Handing in homework always ends in a designed finish (I7).
- The teacher's approved words appear with the teacher's name and photo.
- Sound follows J3. Motion follows the band's column below and the person's motion level.

### G1. Summary

| | `early` | `young` | `junior` | `teen` |
|---|---|---|---|---|
| Home is | three big doors | a path for the week | a quest board | a briefing |
| Navigation | bottom bar, 3 picture buttons + Grown-ups | bottom bar, 4 + More | bottom bar, 5 + More | top rail as today, text labels |
| Smallest tap target | 56 px, primary 72 px | 56 px | 44 px | 44 px |
| Type | young scale, bold serif headings | young scale | standard | standard |
| Words | 3 to 6 words, Vietnamese beneath, Listen button | short sentences, Vietnamese beneath key labels | English, Vietnamese on request | English |
| Mascot | centre stage, speaks | companion beside the next thing | small, optional | off unless chosen |
| Motion character | soft and bouncy (`reward` spring allowed everywhere) | playful, small overshoot | crisp; overshoot in rewards only | the staff Signature tier |
| Progress shown as | stars filling a jar | stickers on a weekly path, level title | XP ring, level, badges, streak | CEFR level, skills, trend lines |
| Classmates shown as | "our class" total only | podium of three, and me | my neighbours (rank one above, one below), podium | full table, default view is my own trend |
| Reward moment | big, up to 1.2 s, sound | up to 1.2 s | under 1 s | a Seal, 700 ms |
| Money | behind Grown-ups | behind Grown-ups | behind Grown-ups | in the menu as today |

### G2. `early` (pre-school and Grade 1)

A child who cannot yet read English, on a parent's phone, with the parent often beside them.

- Home: the mascot greets by first name. Below it, at most three doors, each a full-width card with a large picture, two or three words in English, Vietnamese beneath, and a Listen button that says the English aloud (`lessonDecks/speech.ts`): "My homework", "Make my video" (the existing `kid` recorder at `/student/record`), "My stars". A door that has nothing behind it today is not drawn.
- One task at a time. Opening homework shows one piece, never a list. When it is done, the finish screen appears; there is no "next" pushed at the child.
- "My stars": a jar that fills with the child's points as stars. Stars drop in with weight and settle (`reward` spring), a soft tone each. At each level the jar is sealed and placed on a shelf; a new jar begins. The numbers behind it are the leaderboard engine's.
- This week: seven circles, Monday to Sunday. A day the child opened their homework gets a sticker. A missed day stays an empty circle, with no mark, no colour and no words. Monday starts a new strip.
- Classmates: one line, "Our class has 1,240 stars", from `student_points` totals. No ranks, no names.
- Navigation: three picture buttons with a word under each, and a fourth, smaller, labelled "Grown-ups" (Vietnamese beneath), which opens everything else: tuition, schedule, reports, account, the full menu.
- Motion: everything a finger touches squashes slightly and springs back. Cards enter by rising 16 px (this band may exceed the 8 px rule). Nothing moves until touched, except the mascot's slow blink.
- Forbidden here: countdowns, streak numbers, ranks, percentages, red, the word "late" shown to the child (overdue work is simply "the next thing").

### G3. `young` (Grades 2 and 3)

- Home: "the next thing" card with the mascot beside it; then the weekly path: a winding ink line with a stop for each lesson and each homework this week, done stops stamped in leaf, the next stop marked in brass with a `LiveDot`. Tapping a stop opens it with `Carry`.
- Level title from `getLevelTitle` shown as a ribbon under the name; the level ring fills in leaf.
- Badges: a shelf with the earned ones and at most three outlined empty places for the nearest unearned ones. Never the whole locked catalogue.
- Streak: the weekly sticker strip as in `early`, plus "Best: 12 days" as a quiet fact. No flame that goes out.
- Classmates: the top three on a podium, and "You: 310 points". No rank number for anyone outside the three.
- Navigation: Home, Homework, Record, Me, and More. Emoji stay out of navigation (design system section 16); pictures are drawn icons.
- Motion: paper with a little spring. Reward moments may use up to 24 DOM elements of brass and leaf confetti-paper that falls and settles, once, under 1.2 s, skippable by doing nothing.

### G4. `junior` (Grades 4 to 6)

Children who want mastery, collections and fair competition. Several are preparing for selective-school entrance exams; treat their effort seriously.

- Home: a quest board. "Next thing" first; then open quests (homework, `DailyChallengesCard`, `custom_quests`) as cards with what each is worth; then the XP ring (`LevelProgressRing`) with "140 XP to Level 6".
- Goal in sight: when the next level is within 20 %, the ring's unfilled part shows a faint brass edge and the line names exactly what would reach it ("one homework would do it"), using only the point values the app already knows from `xp_settings`. If the app cannot state it truthfully, show the distance only.
- Streak: the number, with the freeze shown when `streak_freeze_count` is above 0. After a break the card says "Welcome back. Your best is 12 days." and starts counting again. It never says a streak was lost.
- Classmates: the podium, then the child with the one above and the one below. A child in the last place sees themselves and the one above only, and the copy speaks about their own gain this week.
- Vocabulary (`SrsReviewDeck`, `/student/vocabulary`): cards turn as paper; a correct answer draws an `InkCheck`; a wrong one shows the answer calmly and the card returns to the deck with no shake.
- "Defend My Level" keeps its function; give it the gravity of a formal step: serif heading, a Seal on a successful defence.
- Motion: crisp and quick. Overshoot only inside reward moments.

### G5. `teen` (Grade 7 and above)

A teenager will leave an interface that talks down to them. This band is the adult product with their data in it.

- Home: a briefing. Next lesson and what is due; the teacher's latest approved feedback in full; a skills panel (approved CEFR points only, from the approved-report paths; never an AI draft); a trend of points by week.
- No mascot and no emoji unless they switch them on in Profile > Look. No confetti. Reward is the Seal and a line of serif text.
- Sun Class (IELTS) students: targets are targets. Nothing on this screen may promise or predict a band (`AGENTS.md`, Lesson decks).
- Classmates: the full class table is available; the default tab is "My progress".
- Portfolio: My Work and My Videos presented as a portfolio with dates. `ProfileShareCard` becomes "Share my progress": first name only by default, no classmates, no scores of others.
- Navigation and motion: as the staff shell, Signature tier.

### G6. Pages in every band

| Page | Rebuild note |
|---|---|
| `/student/assignments` | `early`: one at a time. Others: due soonest first, done ones folded under "Finished". `GradeCelebration` becomes the band's reward moment and shows only an approved grade |
| `/student/record`, `/student/videos` | keep the recorder's logic and the `kid` mode. `early` and `young` always use `kid`. The upload's finish is a Seal. The class wall shows videos, never scores |
| `/student/lessons`, `/student/lesson-reports` | a timeline of lessons; each opens with `Carry`. Only published, approved content |
| `/student/my-work`, `/student/class-gallery` | a wall of paper cards; opening one lifts it. `early` and `young`: "My wall" |
| `/student/language-support` (Picture Reader) | keep the ARASAAC attribution line exactly as it is |
| `/student/journal`, `/student/resources` | token alignment and band type scale |
| `/student/dashboard?tab=achievements`, `?tab=reports`, `?tab=schedule` | become pages under "Me" for `early`, `young`, `junior`; stay tabs for `teen`. The URLs keep working |
| `/tuition`, wallet | no banding. Adult presentation always. Reached through Grown-ups in the three younger bands |

---

## Part H - Parent experience

Character: a private client's statement from a school that knows their child. Quiet, exact, warm. Vietnamese parents on a phone, often inside Zalo, often in a spare two minutes.

### H1. Family home (`/family/dashboard`, and the family hub at `/`)

Order of the page, top to bottom:

1. Greeting by time of day, and "Your family at Happy English Club" (keep the existing heading).
2. "Does anything need you?" One card.
   - If something does (a payable amount from `calculate-tuition`'s `carry.payable`, a form, an unread message from the school): it is stated in one sentence with one button. No red unless it is the existing overdue state, no countdown, no exclamation mark.
   - If nothing does: "Everything is in order." with a small ink tick. This is the parent's reward; give it room.
3. One card per child (keep the existing card's data: name, avatar, points with the points-history button, daily class reports, latest lesson note). Add "This week" in three plain facts the page can already read: lessons attended out of held, homework handed in out of set, and the teacher's latest approved note with the teacher's name. A fact the page cannot read truthfully is left out, never estimated.
4. The assistant (`AssistantChat`) keeps its place and its rules.
5. Schedule for the week.

### H2. Motion for parents

Design system section 9 as written, plus only: `Carry` from a child's card to the child's page; `InkRing` and `InkCheck` drawing once on first view; the Seal on a completed action of their own (a message sent, a feedback given). No pointer effects, no loops, no ambient motion, no Tide.

### H3. A child's page as the parent sees it

- Header: the child's name in full, class, teacher's name and photo, level.
- "What we worked on": the latest published lesson reports.
- "Teacher's notes": approved notes only, each with name and date.
- "Work": approved work and approved, shared videos of this child.
- "Progress": the approved level of a published report (`get_my_published_reports`), and class figures only as `get_class_skill_summary` gives them. No other child is named.
- Points history as today.

### H4. Tuition as the parent sees it (`/tuition`)

No persuasion of any kind on this screen (I4). Amounts from the function, status in words, the month named in full, receipts listed plainly. After a payment appears on the bill: one line, "Received with thanks", and an ink tick. Nothing celebrates.

---

## Part I - Brand affinity playbook

The owner asked for social engineering techniques that build affinity. This section uses the behavioural principles that work, and draws a line: every technique here makes something true easier to see or a good habit easier to keep. Techniques that work by exploiting a child's fear, impulsiveness or social anxiety, or a parent's guilt, are listed in I4 and are not to be built, whoever asks.

The reason is commercial as much as ethical: these are children, their parents are watching the same phone, and a parent who notices their six-year-old being manipulated by the school's app stops trusting the school.

### I1. Principles, and where each is applied

| # | Principle | For students | For parents | Guardrail |
|---|---|---|---|---|
| 1 | Peak-end rule: people remember the best moment and the last one | every visit ends on the finish screen (I7); the reward moment is the peak | the last thing on the home page is calm; a monthly recap ends on the teacher's warmest approved line | the end is honest: unfinished work is not hidden to fake a happy ending, it is simply not the last thing shown |
| 2 | Goal gradient: effort rises as the goal nears | "one homework would do it" near a level (G4); the weekly path's next stop | "2 of 3 lessons attended this week" | only true distances; never move a goal |
| 3 | Progress already made counts | a new path starts with what the child has really done already stamped (enrolled, first lesson attended) | "Member since March 2025", lessons attended to date | never grant fake progress to create momentum |
| 4 | Ownership (the IKEA effect) | avatar, featured badge, "Look", status message, "My wall" of best work | choosing the language; the family name on the home page | choices are real and remembered |
| 5 | Identity and belonging | level titles; "our class"; "Happy English Club member" on the profile card | "Your family at Happy English Club"; family anniversaries | belonging is never made conditional on spending or rank |
| 6 | Competence: specific, earned praise | the teacher's approved words, with name and photo, tied to a piece of work | the same words, shown as evidence | no generic or machine-made praise presented as a teacher's |
| 7 | Autonomy | which task first (except `early`); Look; whether the mascot shows | motion level; language; what to be notified about | no choice whose options are rigged |
| 8 | Relatedness: a real person on the other side | teacher's face on feedback; classmates' approved videos | "Ms Lan reviewed Minh's video on Tuesday" | only real events from real records |
| 9 | Operational transparency: effort made visible | "Your teacher is looking at this" after hand-in, only while the submission's status is `submitted` | the care behind the service: reviewed, noted, prepared | state what happened; never invent activity |
| 10 | Fresh start | Monday resets the weekly strip; a new term opens with a clean path | a new month's summary | the past is never displayed as debt or shame |
| 11 | Distinctive assets and mere exposure | one mascot, one Seal, one three-note chime (J3), the same on every screen | the same Seal on reports, receipts and the app | consistency; no re-skin per feature |
| 12 | Collection and completion | the badge shelf with at most three empty places | - | never show a wall of locked items; never sell a slot |
| 13 | Reciprocity | - | the school gives first: evidence, clarity, a useful assistant, before it asks for anything | nothing is given in order to be withheld |
| 14 | Reassurance as reward | "All done for today" | "Everything is in order" | only when it is true |
| 15 | Rituals | the same greeting, the same finish | the monthly recap arrives on the same day | - |
| 16 | Advocacy at a true peak | "Share my progress" card after a level or a strong report | the same, offered once, at most once a month | first name only by default; no other child; declining is one tap and is remembered; no reward for sharing unless the owner sets up a scheme (Part L) |
| 17 | Being asked | "Was this homework too easy, just right, too hard?" (one tap, optional, stored only if a place for it already exists; else leave out) | an invitation to the existing `/feedback` page after a milestone; later, "You said, we did" | never gate anything behind giving feedback |

### I2. The mascot

`MascotCompanion.tsx` is the brand's face for children. Rules:

- It is always pleased to see the child, including after a long absence: "Welcome back" and nothing more.
- It never expresses sadness, disappointment, loneliness or worry. It never says it missed the child, never says a streak is in danger, never asks the child to come back.
- It praises what was done ("You finished your reading") rather than what the child is ("You are so smart").
- Its lines come from a pool chosen by context (B8), a different line each day, written in the voice of J1.
- A drawn character would be the single most valuable brand asset in this brief. Today it is an emoji on an ink disc. See Part L.

### I3. Moments (lazy-loaded, in `src/components/fx/moments/`)

| Moment | Who | Trigger (from data that already exists) | Form |
|---|---|---|---|
| Hand-in | student | a submission saves | band's reward moment, then the finish screen |
| Level reached | student | level from the leaderboard engine rises | band's reward moment; `teen`: Seal and a serif line |
| Approved feedback arrives | student, parent | a teacher approves | the teacher's photo, name and words open as a letter of paper |
| Moving up | student | F3 | page turn |
| Anniversary | family | whole years since the earliest enrolment the page can already read | one serif line and a Seal on the family home, that week only |
| Monthly recap | parent | first visit in a new month | a short page per child: lessons attended, work handed in, the level, one approved note. Approved facts only; if there is too little to say, it is not shown |
| A class's full week | teacher, class | C9 | Seal |

One moment per visit (B8).

### I4. Not to be built

| Technique | Why it is excluded |
|---|---|
| Loss-framed streaks ("you will lose your 12 days", a flame going out, a broken streak shown) | trains anxiety in children; turns learning into debt |
| Random or variable rewards (mystery boxes, spins, random bonus points) | the mechanism of gambling, applied to minors |
| Countdown timers, "only today", limited-time anything | manufactured urgency |
| A sad, lonely or guilt-giving mascot | emotional manipulation of a child |
| Any prompt that leads a child to ask a parent to pay, renew or upgrade | pester power |
| Showing a child as last, or naming who has not handed in | public shame; also a privacy breach here |
| Fake social proof or fake activity ("12 classmates are online") | a lie |
| Pull-back notifications designed to raise visits; any notification to a child at night | the app serves the lesson, not the reverse |
| Infinite feeds, autoplay to the next thing | removes the finish line |
| Guilt copy on a declined choice ("No thanks, I don't care about my progress") | confirmshaming |
| Any persuasion on a tuition or payment screen | money decisions get facts only |
| Tracking or scoring a parent's engagement to target them | not what a school does to its families |

If a later instruction asks for one of these, stop and tell the owner which row it is.

### I5. Leaderboards for children

Ranking is the sharpest tool here. Use the bands' rules in G1. Additionally: celebrate "most improved this week" and class totals wherever the existing data can state them truthfully; frame the class as a team against its own last week, not children against each other, for `early` and `young`.

### I6. Reassurance copy for parents (examples of the register)

- "Everything is in order."
- "Minh attended both lessons this week."
- "Ms Lan wrote on Tuesday: ..." followed by the approved note, unedited.
- "Tuition for November: paid. Received with thanks."

### I7. The finish line

Every band has an end state, shown when there is nothing left to do today:

- `early`: the mascot waves. "All done! See you in class." Vietnamese beneath. No buttons except Home.
- `young`: "You finished everything for today." The weekly path with today's stop stamped.
- `junior`: "Nothing left today." and one optional line: "Want more? 10 vocabulary cards are ready." (only if they are).
- `teen`: "You're up to date."
- Teacher (C2): "No more classes today." varied by time of day.
- Parent: "Everything is in order."

The finish screen is the last frame most visits end on. It gets as much design care as the home page.

---

## Part J - Voice, language and sound

### J1. Voice

- Plain, warm, short. A school that respects the reader. No exclamation marks for adults; at most one per screen for children.
- Say what happened and what to do. "Homework handed in. Your teacher will look at it." not "Awesome job, superstar!".
- Never blame. "This is the next thing" not "This is late".
- Buttons name the action: "Hand in my homework", "Mark attendance", "Keep the lesson" / "Cancel the lesson" (design system section 16).

### J2. Language

- There is no i18n framework. Do not install one. Create `src/lib/copy/` with one small typed dictionary per surface (`student.ts`, `family.ts`), each entry `{ en, vi }`, and a `useCopy()` hook. Only strings written or rewritten under this brief go through it.
- `early` and `young`: English first, Vietnamese beneath in `text-hec-small`, as the `kid` recorder already does.
- `junior`, `teen`: English, with a per-device switch for Vietnamese beneath.
- Parents: see Part L for the default. Until answered: English with Vietnamese beneath on headings and on every sentence about money or something that needs action.
- Vietnamese is written by a person or checked by one before it ships. Mark every machine-drafted Vietnamese string in the dictionary with `draft: true` and list them for the owner.

### J3. Sound

- All sound goes through `src/lib/soundManager.ts`. Add one sonic mark: the existing `success` chord (C-E-G), reserved for the Seal.
- Staff and parents: off by default.
- Students: see Part L for the default; until answered, off, with a visible speaker button on the student home in `early` and `young`.
- Sound never plays without a tap first on that visit, never loops, never above the stored volume.
- Haptics: `navigator.vibrate(10)` on a reward for students where supported and where motion level is `full`. Never for staff.

---

## Part K - Build order, checks and shipping

Each phase is one or more commits that leave the app working, and ends with the checks in K2 and a push to main (K3). Show the owner screenshots from a preview with made-up data before the first push of each phase that changes how a screen looks.

### K1. Phases

| Phase | What | Done when |
|---|---|---|
| 0. Foundations | design system section 9b; tokens (B2) and the token check; the kit (B5) with a preview page of every piece on made-up data; motion level (B3) in `UserMenu`; `ageBand.ts` and its tests (F1, F4); Tailwind band variants | every kit piece renders in light, dark, `calm`, `off` and at 375 px; no screen has changed yet |
| 1. Teacher shell and dashboard | C1, C2 | the dashboard shows C2's table working; first-arrival logic verified across two visits |
| 2. Teacher in class | C3, C4 | 30 rapid attendance marks and 10 rapid point awards stay smooth on a throttled CPU (4x slowdown in dev tools) |
| 3. Teacher, the rest | C5 to C9 | each listed page aligned; payroll shows no animated figure |
| 4. Admin shell, tables, money | D1 to D3 | a recorded payment shows the Seal on success and nothing on conflict |
| 5. Admin, the rest | D4 to D7 | AI action confirm shows one Seal for the whole plan |
| 6. Student shell and home | F2, F3, G1 to G5 for the home page and navigation, I2, I7 | four screenshots of the same made-up child's data at four birth years, plus missing date of birth; the profile switch changes band |
| 7. Student pages | G6 | each page in each band; all old URLs still open |
| 8. Parent | H1 to H4 | the "needs you" card shows the function's `carry.payable`, never a figure added up in the browser |
| 9. Moments and copy | I3, J1 to J3 | each moment plays once and is skippable; the Vietnamese draft list is handed to the owner |
| 10. Audit | performance (B4), accessibility, a pass on a real mid-range Android phone inside Zalo | bundle growth reported; the inventory's legacy count has not risen |

Phases 1 to 5 and 6 to 9 are independent after Phase 0.

### K2. Checks before every push

- `node scripts/pgtest/run.mjs` (includes the app type-check; `tsc --noEmit` at the root checks nothing).
- `node scripts/run-bun-tests.mjs`.
- `node scripts/design-tokens-check.mjs` and `node scripts/design-rollout-inventory.mjs`.
- By hand in the preview: 375 px width; light and dark; motion `full`, `calm`, `off`; the OS reduced-motion setting; keyboard only, with visible focus (design system section 10); a screen reader hears every state an animation shows.
- Nothing in A3 was touched: no new query for an effect, no figure computed in the browser, no excluded surface changed.

### K3. Shipping

- Front-end only, so: commit, pass K2, `git push origin HEAD:main`. Cloudflare builds from main. Then confirm the live bundle actually changed.
- No edge function changes are expected. If a phase turns out to need one, or a migration, stop: migrations are pasted by the owner, and Part L is where the question goes.
- After each push, tell the owner what is live, in plain words, with the screenshots.

---

## Part L - Questions only the owner can answer

Defaults are stated so work is never blocked; each default is the cautious choice.

| # | Question | Default until answered |
|---|---|---|
| 1 | Signature tier, or louder? This brief assumes the Signature tier (B1) | Signature tier |
| 2 | Sound for children: on or off by default? On is more delightful at home and a nuisance in a waiting room | off, with a visible speaker button |
| 3 | Parents' default language: Vietnamese first or English first? | English with Vietnamese beneath |
| 4 | A drawn HEC mascot (I2). It needs an illustrator; it would also serve the reception TV and printed reports | keep the emoji on an ink disc |
| 5 | Should a child's chosen "Look" follow them across devices? Needs one nullable column on `students` and a migration you would paste | per device only |
| 6 | Is tuition allowed to move behind "Grown-ups" for children under Grade 7 (E9)? It stays one tap away | yes |
| 7 | Is there, or will there be, a referral scheme? I1 row 16 offers sharing with no reward | no reward |
| 8 | Children with no date of birth get the `junior` look. Will the office fill in the missing dates (D6 adds the filter)? | `junior` |
| 9 | Who checks the Vietnamese (J2)? | drafts are listed and flagged, not shipped as final |
| 10 | The ARASAAC licence question in `AGENTS.md` is still open and touches Picture Reader | unchanged |
