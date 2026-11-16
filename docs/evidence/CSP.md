# F-23: Content-Security-Policy (report-only first)

Where I am / next step: policy, endpoint and guard test committed; probe experiments done (below: report-to dropped, the
service worker exempted, eval detection proven). Next: full screen run, report-only and enforcing, then the ship plan.

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
- **`eval` / `new Function`**: two copies in the bundle, neither reached. nunjucks compiles a template with `new Function` only
  when it is not precompiled (`engine.generated.js` ships precompiled ones); jszip's `setImmediate` polyfill only when handed a
  string. So no `'unsafe-eval'`. No WebAssembly.
- **`https://cdn.jsdelivr.net/npm/three@0.170.0/...`** (`VisemePlayer` 3D head): only when `VITE_VISEME_HEAD_URL` is set, which
  it is not in `.env`; and `GLTFLoader.js` imports the bare specifier `three`, which no browser resolves without an import map,
  so that path cannot work today. Left out; if it is ever wanted, the report will name it.
- **`https://cdnjs.cloudflare.com` (pdfobject)**: inside jsPDF's `output("pdfobjectnewwindow")`, which the app never calls.
- **`https://picsum.photos`**: a placeholder image URL saved by `VocabularyCreator` - covered by `img-src https:`.

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
