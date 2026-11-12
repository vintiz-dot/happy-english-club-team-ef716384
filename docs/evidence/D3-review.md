VERDICT: INCOMPLETE

Where I am / next step: mobile defect fixed, item 1 (flow / parseInvokeError) fixed. Next: re-take 375 shots, items 2-10.

Written and checked against the fake-client harness only. No sign-in, no live Supabase, no MCP, no deploy.

Environment note: the SHARED node_modules was partly deleted during this run (no `.bin`, no `@alloc/*`, `@dnd-kit`, pglite); I removed my junction with `cmd //c rmdir` and ran `npm ci --ignore-scripts` INSIDE this worktree, so nothing shared was touched. The harness copy is `C:\Users\Dell\hec-tools\d3-harness\preview-r\` (repointed to this worktree) and Vite must run with cwd = the worktree, or Tailwind's `./src/**` content glob finds nothing and no utility class is generated.

## Known defect: dialog not centred at 375 (FIXED)

Cause, proven from the computed style (`probe-center.mjs`, strong scenario):

```
320x568 during open : transform matrix(0.9989,0,0,0.9989,0,0)  anim spring-in:running  rect left 160 top 284   (= 50% / 50%)
320x568 after 1.5 s : transform matrix(1,0,0,1,-152,-261.3)    no anim                 rect left 8 top 23     (centred)
1280    during open : transform matrix(1.0079,0,0,1.0079,0,0)                           rect left 638 top 397
```

The shared `spring-in` keyframes (`tailwind.config.ts:213`) set `transform: scale(...)`, which REPLACES the centring `translate(-50%,-50%)` of `src/components/ui/dialog.tsx:39` for the 0.4 s of the animation. It is not a mobile variant and not a harness artefact: it happens at every width, and the 375 shot simply caught the animation (the 1280 shot came later). Every Dialog in the app does it, briefly; outside my files (`ui/*`) - reported to the conductor.

Fix (GuardDialog only): centred by `inset-0 m-auto h-fit` with `translate-x-0 translate-y-0`, so there is no translate for the keyframes to remove; the scale then animates around the centre. After the fix, during AND after the animation: 375x812 rect 8,32 359x747, Keep 659-707, Cancel 715-763; 320x568 rect 8,23 304x523, Keep 424-472, Cancel 480-528 (inside 568); 1280 rect 352,40. The body scrolls inside the dialog (`min-h-0 flex-1 overflow-y-auto`), header and footer stay in place, so Keep and the destructive button are always reachable.

## Findings

F-1 MAJOR `src/lib/sessionGuard.ts:606-623` (parseInvokeError) - wrong for three of the four supabase-js outcomes (read against `@supabase/functions-js` 2.75 `FunctionsClient.invoke` / `types.js`):
- a gateway 401 `{code: 401, message: "Invalid JWT"}` was spread over our code (`...body` after `code: "unexpected"`) so `code` became the NUMBER 401: unknown wording, not blocking;
- a not-deployed function (404 `{code:"NOT_FOUND"}`) was shown as an unknown code;
- `FunctionsRelayError` (context = Response with the relay's body) fell to `unexpected`.
Fixed: guard bodies are trusted only when they look like ours (`ok:false` or a known code); otherwise mapped by HTTP status (401 unauthorized, 403 forbidden, 404 function_missing, else http_error), relay -> `relay`, FetchError (TypeError / AbortError context, no body) -> `network`, a body already read is not read twice. Tests use real `Response` objects inside FunctionsError-shaped errors.

F-2 MAJOR `src/lib/sessionGuard.ts:219-220` + `useGuardedChange.ts:134` - after a CONFIRM that ended in a network/relay/5xx-without-body error, the dialog said "Nothing was changed". The request may have committed before the answer was lost. Fixed: those codes (`UNKNOWN_OUTCOME_CODES`) put the dialog in a "Not confirmed" state with "cannot tell whether the lesson was changed ... reload the lesson", and the lists behind it are refreshed. `unexpected` no longer claims nothing changed either.

F-3 MAJOR `useGuardedChange.ts:134-158` - closing the dialog (or reopening it) while a confirm was in flight: the late answer still set `success`/`done` on a dialog that had been reset, and `load()` never cleared `success`, so a reopened dialog could carry the old result. Fixed: answers for a closed/reopened dialog only refresh the queries; `load()` clears `success`. (Closing during submit is also blocked: Keep/X/Escape/outside-click are inert while busy.)

F-4 MINOR `useGuardedChange.ts:166` - "Retry the bill refresh" had no in-flight guard (double click = two refresh calls). Fixed with a ref.

F-5 MAJOR `src/lib/sessionGuard.ts:566` (payrollLine) - when calculate-payroll returned exactly one row for a DIFFERENT teacher, that row was shown as this lesson's teacher's pay. Fixed: a single row is used only if it names no teacher. Test added.

F-6 MINOR `src/lib/sessionGuard.ts:248` - "This change goes to review: another administrator will look at it." is wrong (an admin may review their own correction for now). Now "This change is recorded for review."

F-7 MINOR `GuardDialog.tsx` - focus fell to the page when the footer swapped (result screen, error, stale). Fixed: Done gets focus on the result, Keep on an error or a stale screen; the destructive button's description includes the error banner.
