# F-23: Content-Security-Policy (report-only first)

Where I am / next step: DONE on branch, not pushed. Policy shipped report-only, browser runs clean (one known, harmless
report), ship plan and the one-line switch below. Next (conductor): push, run the curl checks, read reports for a few days, then enforce.

## How the site is served

- Cloudflare Pages builds `main` of this repo (`vite build`, output `dist/`, preview hosts `*.happy-class-mate.pages.dev`,
  production `user.hanoienglish.com` and `.vip`). `public/` is copied into `dist/`; `public/_redirects` already holds the
  SPA fallback. There was no `_headers` (F-23), so the mechanism is a new `public/_headers`.
- `index.html` has ONE inline script (the A4.6 theme boot) and no inline event handlers; the built page adds only
  `/assets/*.js` and `/assets/*.css`. Git stores `index.html` with LF; a Windows checkout has CRLF, which hashes differently.
- `public/service-worker.js` is registered in production. It answers every GET from the page except `*.supabase.co`, by
  calling `fetch()` itself, so the policy the WORKER is served with decides those fetches (see "Service worker" below).
- The HEC Docs printer (`hec-docs/worker`) opens `https://user.hanoienglish.com/hec-docs/blank` in Cloudflare's browser and
  sets the document's HTML there, so the app's header also covers the printed page. The printed HTML carries its own
  stricter meta policy (`default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:`).

## Inventory: what the app loads and talks to

From `src/`, `index.html`, `public/` and the built `dist/assets/*.js` (strings and dynamic code).

| What | Origin / scheme | Directive | Where |
|---|---|---|---|
| App code, CSS, fonts, icons, manifest, SW | `'self'` | script/style/font/img/manifest/worker | `dist/` |
| Theme-boot inline script | sha256 of its text | script-src | `index.html` |
| Supabase REST, auth, storage, functions | `https://aswgmbefikhsnhogtryv.supabase.co` | connect-src | supabase-js, `auditUploads.ts` (XHR), `FamilyTuitionExplainer.tsx`, `ProfilePictureUpload.tsx` |
| Supabase realtime | `wss://aswgmbefikhsnhogtryv.supabase.co` | connect-src | `supabase.channel(...)` |
| Storage signed/public URLs in pages | same host | img-src, media-src, frame-src | avatars, QR, homework images, `SignedVideo`, `ParentVideos`, exam-report PDF iframe |
| Fetching storage files to blobs | same host | connect-src | `ShareVideoButton`, `StudentExamReportsTab`, `AuditClipsTab`, `hecDocs.imageAsDataUri` |
| ARASAAC search | `https://api.arasaac.org` | connect-src | `languageSupport/arasaac.ts` |
| ARASAAC pictograms | `https://static.arasaac.org` | img-src | `languageSupport/strip.ts` |
| Dictionary lookup + its pronunciation mp3 | `https://api.dictionaryapi.dev` | connect-src, media-src | `VocabularyCreator.tsx` |
| Translation | `https://api.mymemory.translated.net` | connect-src | `VocabularyCreator.tsx` |
| HEC Docs printer | `https://hec-docs-printer.vintizfjes.workers.dev` | connect-src | `hecDocs/index.ts` |
| Azure live pronunciation | `wss://<region>.stt.speech.microsoft.com` | connect-src | `video/livePronunciation.ts` (token from `get-speech-token`) |
| Azure SDK timer worker, recorder + SDK audio worklets | `blob:` | worker-src, script-src | speech SDK, `recorder/worklet.ts` (`audioWorklet.addModule(blob:)`) |
| Recorder FLAC encoder worker | `'self'` | worker-src | `recorder/index.ts` (`/assets/encodeWorker-*.js`) |
| Board fonts | `https://fonts.googleapis.com` CSS, `https://fonts.gstatic.com` files | style-src, font-src | `leaderboard/BoardFrame.tsx` |
| Image search results, vocabulary images, announcement images | any `https:` | img-src | `image-search` results, `VocabularyCreator`, `SplashAnnouncement` |
| Recorded takes, previews, generated PDFs | `blob:` | media-src, img-src, frame-src, connect-src (`fetch(blob:)`) | `VideoRecorder`, `SetupWizard`, PDF export |
| Base64 audio, data images, `fetch(dataUrl)` | `data:` | media-src, img-src, connect-src | `WordExplorer`, `VisemePlayer`, `ProfileShareCard` |
| Teacher Books (flipbooks, Google Slides, Canva, YouTube, anything a teacher pastes) | any `https:` | frame-src | `TeacherBooks.tsx` |
| Audit clips | `https://www.youtube-nocookie.com`, storage | frame-src, media-src | `AuditClipsTab.tsx` |
| Splash announcement HTML | `about:srcdoc` (inherits the page policy), sandbox without scripts | as page | `SplashAnnouncement.tsx` |
| Inline `<style>` (sonner, Quill, Radix, recharts) and `style=""` in sanitised rich text | `'unsafe-inline'` | style-src | many |
| OAuth consent (MCP) | navigation only (`location.href = redirect`) | none (navigation is not governed) | `OAuthConsent.tsx` |
| Forms | all `onSubmit` + `preventDefault` | form-action `'self'` | `Auth.tsx` etc. |

Not loaded, so not allowed:

- **Analytics, Lovable scripts**: none in the build (`lovable-tagger` is development-only; `previewAuthStorage.ts` only
  `postMessage`s to `https://lovable.dev` when framed by the editor, which CSP does not govern).
- **`eval` / `new Function`**: no `'unsafe-eval'`. nunjucks compiles a template with `new Function` only when it is not
  precompiled (`engine.generated.js` ships precompiled ones); jszip's `setImmediate` polyfill only when handed a string. ONE is
  reached: the engine's webpack shim `try { Function("return this")() || (0,eval)("this") } catch { window }`, run once each
  time the HEC Docs engine loads. Refused, its `catch` returns `window`, and the engine works (proven below under enforcement).
  `/csp-report` tags that one report `known: "global-this-probe"`. No WebAssembly.
- **Inline event handlers**: one, `onerror="this.style.display='none'"` on the logo in the fallback homework PDF
  (`HomeworkPdfDownload.tsx:192`). Allowed by `'unsafe-hashes'` plus its exact hash: only that exact code runs as an
  attribute, which an attacker gains nothing from. The guard test finds every `on...="..."` in `src/` and requires each hash.
- **`https://cdn.jsdelivr.net/npm/three@0.170.0/...`** (`VisemePlayer` 3D head): only when `VITE_VISEME_HEAD_URL` is set, which
  it is not in `.env`; and `GLTFLoader.js` imports the bare specifier `three`, which no browser resolves without an import map,
  so that path cannot work today. Left out; if it is ever wanted, the report will name it.
- **`https://cdnjs.cloudflare.com` (pdfobject)**: inside jsPDF's `output("pdfobjectnewwindow")`, which the app never calls.
- **`https://picsum.photos`**: a placeholder image URL saved by `VocabularyCreator` - covered by `img-src https:`.

## The policy (`public/_headers`)

```
/*
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'sha256-MgfrBZQae7SnUdEzeisUq2vYwditKlX4jqhkpiO0hAM=' 'unsafe-hashes' 'sha256-pwQduWxX3Cm7lLbQmAos7n73RLP4QrsCDFejmsBdZ78=' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https://aswgmbefikhsnhogtryv.supabase.co https://api.dictionaryapi.dev; connect-src 'self' data: blob: https://aswgmbefikhsnhogtryv.supabase.co wss://aswgmbefikhsnhogtryv.supabase.co wss://*.stt.speech.microsoft.com https://api.arasaac.org https://api.dictionaryapi.dev https://api.mymemory.translated.net https://hec-docs-printer.vintizfjes.workers.dev; frame-src 'self' blob: https:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; report-uri /csp-report

/service-worker.js
  ! Content-Security-Policy-Report-Only
  ! Content-Security-Policy
```

Why each part: `default-src 'self'` covers anything unlisted; `script-src` = own files + the theme-boot hash + one
handler hash (`'unsafe-hashes'`) + `blob:` for AudioWorklet modules, no `'unsafe-eval'`, no remote host; `style-src` /
`font-src` = own + Google Fonts for the board styles (+ `data:` fonts); `img-src` = own, `data:`, `blob:`, any
`https:` (image search, pictograms, storage, announcements); `media-src` = own, `data:`/`blob:` (recordings, base64
TTS), Supabase storage (videos), the dictionary's mp3s; `connect-src` = own, `data:`/`blob:` fetches, Supabase https +
wss, Azure speech wss, ARASAAC API, dictionary, translation, the HEC Docs printer; `frame-src` = own, `blob:` (PDFs),
any `https:` (teachers' books, YouTube, signed PDFs); `worker-src` = own (encoder, service worker) + `blob:` (speech
SDK); `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'self'`
(enforced only once the header is enforcing); `report-uri /csp-report`.

## Experiments on the policy itself (harness, made-up data)

Harness: `C:\Users\Dell\hec-tools\r21-harness\csp\setup.mjs` builds the REAL app (`src/main.tsx`, `index.html` with LF endings,
`public/`) in production mode with only `@/integrations/supabase/client` swapped for the fake client; `run.mjs` serves `dist/`
with exactly the headers Cloudflare would attach (`scripts/csp/cfHeaders.mjs`, the documented `_headers` rules incl. `! ` detach),
passes `POST /csp-report` through the real `functions/csp-report.js`, and drives Chrome with a `securitypolicyviolation`
listener in every frame. Every request leaving 127.0.0.1 is answered by the harness or aborted; every websocket is closed.

1. **report-to drops reports.** With `report-uri /csp-report; report-to csp` + `Reporting-Endpoints`, Chrome used the Reporting
   API only and delivered NOTHING in 80 s (relative or absolute endpoint). With `report-uri` alone the report arrived in 1 s.
   Firefox and Safari use `report-uri` anyway. So the policy reports by `report-uri` only.
2. **The service worker needs its own exemption.** With the page policy also on `/service-worker.js`, the worker's `fetch()` of
   a page image from `static.arasaac.org` and from an unlisted https host was reported as `connect-src` from
   `service-worker.js:83`: enforcing that would break every ARASAAC picture and image-search result for anyone with the PWA
   installed. With both header names detached for `/service-worker.js`: no reports.
3. **The policy refuses what it should** (refused probe, report-only and enforcing): injected inline `<script>`, `onerror=`
   attribute, `javascript:` URL, remote `<script src>`, `eval` and `new Function` from a same-origin script, `fetch` to an
   unlisted host, `<object>`, `<base href>` to another site, an `http:` image, a form posting to another site.
   (DevTools-evaluated code is exempt from the eval check, so eval had to be probed from a served file.)
4. **The policy allows what the app needs but the fake client never reaches** (allowed probe, zero violations): Supabase REST,
   auth, functions, storage (fetch, img, video, PDF iframe), realtime `wss:`, Azure `wss://southeastasia.stt.speech.microsoft.com`,
   ARASAAC API and pictures, dictionary fetch and mp3, translation, the printer, `data:` and `blob:` fetches, a Google Fonts
   stylesheet and font file, a `style=""` attribute, YouTube-nocookie and Google Slides iframes, a `blob:` PDF in an iframe
   (Chrome's PDF viewer works under `object-src 'none'`), a `blob:` worker and a `blob:` AudioWorklet module.

## Ship plan

**Step 1 - now: report-only.** Push `public/_headers` and `functions/csp-report.js` together. Report-only cannot block
anything: every browser that understands it only posts what it WOULD have refused; one that does not simply ignores it.
After the push (Cloudflare builds in about a minute), check the header is served and the endpoint answers:

```
curl -sI https://user.hanoienglish.com/ | grep -i content-security-policy-report-only
curl -sI https://user.hanoienglish.com/service-worker.js | grep -ci content-security     # 0: the worker is exempt
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "content-type: application/csp-report" \
  --data '{"csp-report":{"document-uri":"https://user.hanoienglish.com/csp-selftest","effective-directive":"img-src","blocked-uri":"https://selftest.invalid/x.png"}}' \
  https://user.hanoienglish.com/csp-report                                                # 204
```

A 204 means the Pages Function is live (a 200 with the app's HTML would mean the `functions/` folder was not picked up:
then the project's root directory setting in Cloudflare is not the repo root).

**How the conductor reads the reports.** Each report is one log line `csp-violation {"day","directive","blocked","screen",
"source","line","disposition"[,"known"]}` - origins and screen paths only, ids replaced by `:id`, no query strings, referrer,
script sample or policy text, browser-extension noise dropped.
- Live: Cloudflare dashboard > Workers & Pages > the Pages project (happy-class-mate, going by the *.happy-class-mate.pages.dev previews) > the production deployment > Functions > real-time logs,
  or `npx wrangler pages deployment tail --project-name happy-class-mate --search csp-violation`. Pages keeps no history of these.
- Kept for 30 days (recommended, one dashboard step for the owner): create a KV namespace (e.g. `hec-csp-reports`), bind it to
  the Pages project as `CSP_REPORTS` (Settings > Bindings, production), redeploy. Each key is
  `day|disposition|directive|blocked origin|screen` with a count; Storage & databases > KV > the namespace lists them.
  Without the binding the function only logs.
- Zero reports is also visible without either: the project's Functions metrics show the number of `/csp-report` requests.
- Expected, ignorable: `script-src eval` from `/assets/engine.generated-*.js` tagged `known: "global-this-probe"` (one per
  HEC Docs PDF). Browser extensions and in-app browsers that inject scripts into pages (Facebook's, some Zalo builds) can
  report `script-src-elem` for their own hosts - they are the browser's, not the app's, and enforcing simply stops them.
- Anything else is a real gap: add the origin to the right directive in `public/_headers` (and to the guard test if the
  app's code calls it), or list it as unsafe.

**Step 2 - after a few days with no unexplained reports: enforce.** One line in `public/_headers`, the policy line under `/*`:

```
-  Content-Security-Policy-Report-Only: default-src 'self'; ...
+  Content-Security-Policy: default-src 'self'; ...
```

(rename the header, keep the value). The service-worker block already detaches both names, so nothing else changes.
`node scripts/pgtest/csp-headers.test.mjs` passes either way and checks the switched file. Rolling back is the reverse rename.
Enforcing also turns on `frame-ancestors 'self'` (browsers ignore it in report-only), which stops other sites framing the app.

**Zalo and Facebook in-app browsers.** On Android both are the system WebView (Chromium); on iOS both are WKWebView (Safari's
engine). Both implement CSP, including report-only, exactly as Chrome and Safari do, so in step 1 they only send reports and
cannot be affected. Anything they inject through their native APIs (`evaluateJavascript`, WKUserScript) is outside page CSP;
anything they add as `<script src>` to the page would be reported now and refused after step 2, which is harmless to the app.
Not run on a device here.

## Browser runs: screens covered and violations found

Two full runs over 91 screen visits (made-up data, fake client, the built app), once with the policy as shipped
(report-only) and once with the one-line switch applied (enforcing), plus the action screens again in both modes.

- **Admin**: overview and every `?tab=` (classes, assignments, journal, exam reports, finance, payroll, reports, account,
  automation, data, activity, announcements, Stars sync, AI actions, audit clips); class page (calendar, enrolments, homework,
  leaderboard, settings); tuition review; students, student, student tuition; teachers, teacher profile; classes; families,
  family; schedule; tuition; vocabulary.
- **Teacher**: dashboard, class, payroll, attendance, schedule, assignments, journal, exam reports, leaderboards, resources,
  vocabulary audit, smart upload, transcripts, videos, the board window in all three styles (Google Fonts), Books with the
  YouTube book in the iframe and the classroom tools opened over it, Language Support (new set, sentence typed),
  **Class recorder** set-up wizard walked through (microphones allowed, chosen, levels, a 10-second test recording played
  back from two `blob:` audio elements, internet check, saved).
- **Student**: dashboard, homework, journal, lessons, my work, resources, videos, vocabulary, defend my level, Picture Reader;
  **Record my video** (kid recorder: camera on, recording started and finished, Azure live pronunciation opened
  `wss://southeastasia.stt.speech.microsoft.com/...` from the app's own SDK code); exam report **PDF preview** in the iframe
  (Supabase signed URL, Chrome PDF viewer) and download.
- **Family**: dashboard, schedule. **Signed out**: /, /auth, /claim, reset password, /watch, OAuth consent page, 404.
- **Assistant chat** opened and a message sent as admin, family and teacher. **PDF export** buttons on student, tuition,
  reports, teacher assignments (homework PDF), student assignments, teacher payroll, family, student dashboard.
  **Announcements**: a splash (`srcdoc` iframe with its own `<style>`, inline `style=""` and an external image) and an image
  banner, signed in and signed out.
- **HEC Docs printer page**: the HTML the app posted to the printer, set on `/hec-docs/blank` under the policy exactly as the
  Worker does: 0 violations (the printed page carries its own stricter meta policy as well).

Violations:

| Run | Found | Resolution |
|---|---|---|
| 1st, report-only | `script-src-attr inline` from `HomeworkPdfDownload` (the logo's `onerror`) | policy: `'unsafe-hashes'` + that handler's hash |
| 1st, report-only | `script-src eval` from `engine.generated-*.js` (nunjucks' global-object shim) | kept refused; tagged `known` by `/csp-report` |
| 2nd, report-only | only the known shim | - |
| 2nd, enforcing | only the known shim, refused; the homework PDF still downloaded and the printer HTML was still produced; no page error, download or screen differs from the report-only run | - |

So: zero unexplained violations, and enforcement changes nothing a user can see in the screens covered.

Genuinely unsafe things the app does: none that the policy had to accept. What the policy still allows, by necessity:
- `style-src 'unsafe-inline'`: React/Radix/sonner/Quill inject styles and sanitised rich text keeps `style=""`. CSS injection
  stays possible (F-23's first item, the `sanitizeHtml` CSS on the grading screen, is not fixed by this).
- `img-src https:` and `frame-src https:`: image search results and teachers' book links can be any host.
- `script-src blob:`: the recorder and the speech SDK load their AudioWorklet modules from `blob:` URLs (recorder code is
  out of scope here). Minting a `blob:` script needs script already running, so it does not open a door by itself.

## Not exercised in the harness

- Real Supabase traffic (the fake client answers in-page): REST, auth, functions, storage, realtime are covered by the
  allowed-probe requests to the real URLs, not by real sessions. Realtime subscriptions themselves were not opened.
- Image-search results, dictionary/translation lookups and live ARASAAC lookups from the UI (the actions did not trigger
  them with made-up data); their URLs are covered by the allowed probe.
- Audit-clip playback, Canva / Google Slides / flipbook hosts in Books (only YouTube was framed by the app; any `https:` is
  allowed), the profile share card PNG, MCP OAuth consent with a real authorization, passkeys (not governed by CSP).
- The service worker as registered by `main.tsx`: in the harness the fake client's top-level await delays the module past
  the `load` event, so the harness registered the same file at the same scope itself.
- Cloudflare's own `_headers` handling and the Pages Function runtime: emulated (`scripts/csp/cfHeaders.mjs`) and
  unit-tested (`csp-headers.test.mjs`); confirm with the `curl` lines above after the push.
- Safari, Firefox, Zalo and Facebook in-app browsers, real phones. The Lovable-hosted preview (may ignore `_headers`).
