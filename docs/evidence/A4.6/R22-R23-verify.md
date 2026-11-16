# R22 + R23 verification (parent / public flip), on this laptop

Branch `parent-release` = `claude/hec-conductor-setup-efbaa5` (2e88891a, the conductor) + `origin/pc2/r22-r23` (c74dfecc). Checked here, not taken from R22.md / R23.md. Made-up data only (fake client, no network, no sign-in anywhere); nothing pushed or deployed.

## Merge
One conflict: `src/lib/ivoryScope.ts`. Both kept - R21's staff block (45 entries, unchanged) first, then R23's parent + public block (`/family/dashboard`, `/watch/:token`, `/claim`, `/auth`, `/auth/reset-password`, `{ path: "/", roles: ["family"] }`). Every other file merged clean.

## 1. Diff review (every src file, `git diff 2e88891a parent-release -- src`)
| File | Gate | What changes besides classNames |
|---|---|---|
| `pages/Auth.tsx` | route listed (whole page) | decorative aurora `div`s deleted; `htmlFor`/`id="signup-role"` pairs the "I am a" label with its select; `aria-label="Demo password"`; FeatureTile tone map all brass. **Sign-up roles: `type UserRole = "family" \| "student"`, default `"student"`, `SelectItem`s `student` "Student" and `family` "Family" only - unchanged, and the open select shows exactly those two.** Submit path, demo and bootstrap handlers untouched. |
| `pages/FamilyDashboard.tsx` | route listed | CEFR badge `variant="brass"`. No query, hook, figure or text change (fetchChildren block untouched). |
| `pages/ResetPassword.tsx` | route listed | decorative `div`s deleted; `aria-label` on the two show/hide buttons. |
| `pages/ClaimAccess.tsx` | route listed | error `p` gets `role="alert"` and an icon, text inside a `span` (same words); `AlertCircle` import. |
| `pages/ParentVideos.tsx` | route listed | none (classNames, `overflow-hidden` -> `overflow-clip`). |
| `pages/Index.tsx` | `useIvory()` | none (teacher hub stays old: `/` is listed for `family` only). |
| `components/ProfilePicker.tsx` | `useIvory()` | under ivory only: `role="dialog"`, `aria-modal`, `aria-labelledby` + title `id`. |
| `components/ProfileSwitcher.tsx` | `useIvory()` | none. |
| `pages/NotFound.tsx`, `pages/OAuthConsent.tsx` | `useIvory()`, routes NOT listed | inert today (old classes); OAuthConsent's ivory error branch has the same words. |
| `lib/ivoryScope.ts` | - | the six routes above. |

No figure, query, hook, handler, permission or visible text changed. One thing the reviewer should know: ProfileSwitcher sits in the shell header, so on the student routes (ivory since R08) a multi-child account's switcher takes the new look with this release - outside `<main>`, intended by R22.

## 2. Money (FamilyDashboard + the family hub's TuitionCard)
Harness `C:\Users\Dell\hec-tools\r23v-harness` (copy of r21-harness/preview-editor; fake changes in `R22-R23-verify/fake-supabase.r23v.diff`: family RLS stand-in, family-role `calculate-tuition` with a sibling-discount recipient + fixed discount (s-0001), a non-recipient (s-0002), a pending sibling discount (s-0013), `parent-video-page` answers, `fake_guard_once` so a signed-in family can stay on `/`). Before = 2e88891a (scratch worktree, = live state for these screens), after = this branch.

- Numbers in `<main>` (+ open dialogs), before vs after: identical on 100/104 runs at 375/1280 light+dark; the 4 others are the profile picker, which only GAINS its three dates of birth because R22 made it a named dialog (the probe reads dialogs; the dates are on screen in both). Money screens: identical on all 12 (375/1280) and 4 at 320. Requests identical 104/104.
- FamilyDashboard shows no amount (points, attendance, lesson dates only); TuitionCard reads `baseAmount / discounts / totalDiscount / totalAmount / sessionCount / siblingState` only - no balance, credit or `recorded_payment` reaches a parent screen in this release (the fake sends `carry` and `recorded_payment`; nothing of them appears).
- Every amount after, 375/1280/320, light and dark: `ui-sans-serif`, `tabular-nums`, ink, never brass - **after the fix below**. Before the fix the probe found the fixed-discount badge "50000 ₫" in ink-soft, and at 320 px "Sibling discount: -144.000 ₫" broke its ₫ onto the next line (R23 listed the wrap as a leftover).
- **Fix (R23v, 3b7148ce, `components/student/TuitionCard.tsx`, ivory branch only, only importer `Index.tsx`):** the discount amount in a `whitespace-nowrap` span, the value badge `whitespace-nowrap text-hec-ink`. Same text, same numbers (re-run: identical), off-rule 0 on all 16 money runs.

## 3. Inertness (`<main>` outerHTML, animations frozen, before vs after)
`/admin`, `/teacher/dashboard`, `/schedule` (teacher), `/student/dashboard`, `/student/journal`, plus `/schedule` as family (unlisted control); 375/1280 light/dark = 24 runs: **24/24 byte-identical**. Only normalisation: on `/student/dashboard` at 375 the 8 avatar `src` URLs carry the checkout's path (`/@fs/<repo>/src/assets/...`), which differs between two trees by construction; with that path replaced they are byte-identical. No React-id normalisation was needed. `<html data-hec-theme>` the same before and after on all of them (staff and student ivory, family `/schedule` none).

## 4. Parent / public screens: axe, overflow, long name
19 screens (auth, sign-up, sign-up with the role select open, forgot, reset waiting / form / typed, claim, claim error, watch, watch empty, watch expired, picker, family dashboard, with switcher open, empty, family hub x3 children) x 375/1280 x light/dark = 76 runs, plus 16 at 320.
- axe critical/serious inside `<main>`: **0 on all 92**. Pages without a `<main>` (claim, reset, watch) are 0 on the whole document. Outside `<main>`: `aria-hidden-focus` x1 only while a Radix select/menu is open (auth role select, profile switcher) - the primitive's focus guard, present before as well; owner: shared UI primitives (R22's known one). Before, the same screens had auth colour-contrast x2, sign-up button-name critical, family hub button-name critical x2 + contrast; all gone.
- Horizontal overflow: none at 375, 1280, 320. Elements off-screen: 0.
- Long name "Nguyễn Hoàng Phương Thảo Nguyên": 0 clipped anywhere; wraps to 2 lines (3 at 320) in the dashboard card title, switcher, picker, watch title, family hub.
- Targets under 44 px: only Auth's Remember-me checkbox (16 px Radix box inside a 44 px label, R22's known).
- Control: the teacher hub on `/` stays old (`data-hec-theme` none) with its old axe findings, unchanged.

## 5. Checks
- `scripts/pgtest/ivory-scope.test.mjs`: patched (R23's patch, plus reset-password, the `/watch` token, `/` with no role, OAuth consent unlisted) - 101 passed, 0 failed.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 (also after the TuitionCard fix).
- `npm run test:bun`: 250 pass, 0 fail (18 files).
- `node scripts/design-tokens-check.mjs`: PASS, 70 pairs x 2 themes.
- `node scripts/pgtest/run.mjs` (once): 6547 assertions, 69 suites, **1 suite failed: `ai spend gate (F-02)` 249/1** - "only the two functions that must be public still opt out of the gateway check" now also finds `reception-feed` (`verify_jwt = false` in `supabase/config.toml`, added by the Reception media commit e2873c44 that came in with the main merge). Not this release (R22/R23 touch no `supabase/` file); the conductor fails it the same way. Owner: the Reception work - either the test learns that the TV feed is public on purpose, or the feed goes behind the gateway. Everything else ok, including d4 floors 213/0, app typecheck, edge functions typecheck and the shared-module mirrors. `ivory-scope.test.mjs` is not in `run.mjs`; run on its own (above).

## For the conductor (not fixed here, not className work)
- `parent-release` vs `origin/main` is not only R22/R23: the conductor's unreleased D4 / S2 work rides along (18 src files, 25 edge functions, 7 migrations - `20261114093000_d4_lesson_pay_guard` and `20261116092000..097000`). Pushing this branch to main ships those. R22/R23's own src files are the 11 listed above + `TuitionCard.tsx` (R23v).
- A family's `/schedule` is not in R23's list (the R21 comment says it "flips with the parent area (R23)"): it keeps the old look, where the header truncates the long name. Decide whether it belongs to this release.
- `/` for a teacher is not listed although the staff flip is live: the teacher hub keeps the old look (button-name critical x4 and contrast in its old schedule widget).
- NotFound and OAuthConsent are restyled behind `useIvory()` but their routes are not listed: no visible change until R24.

Scripts and comparisons: `R22-R23-verify/` (`r23v.mjs` driver, `cmp.mjs`, `dropbad.mjs`, `fake-supabase.r23v.diff`, `cmp-before-after.txt`, `cmp-320-money.txt`). The first pass was cut by the host's network drop (the app's offline screen replaced 105 runs); those runs were thrown away and redone with `navigator.onLine` pinned in the harness.
