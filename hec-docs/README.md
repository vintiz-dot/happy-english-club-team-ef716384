# HEC Docs

HEC Docs is the document engine for Happy English Club. It is one template-driven service that turns validated JSON into
print-ready, tagged A4 PDFs (and PNG cards). All documents share one design system.

It replaces the app's ad-hoc generators (html2canvas screenshots in jsPDF, and `window.print()` views) with real
vector text, embedded fonts with full Vietnamese support, and a structure tree for screen readers. Content,
numbers and filenames are unchanged: `npm run qa` proves it against the old generators' output.

```
JSON data ──► JSON Schema (per type, semver) ──► Nunjucks template + variant
          ──► HTML using tokens + components ──► Chromium (Paged Media, offline)
          ──► tagged PDF ──► pdf-lib (fixed metadata, language, deterministic IDs)
```

| Layer | Where |
|---|---|
| Design tokens (W3C DTCG) | `tokens/base.tokens.json` → CSS variables (`src/tokens/compile.ts`) |
| Tenant theme | `tenants/<id>/theme.json` + `assets/` |
| Components | `components/ui.njk` (macros), `components/hec.css`, plus `components/ui/*.njk` and `components/css/*.css` |
| Page chrome | `components/layouts/page.njk` (logo lockup, running header, tagline footer, page x / y) |
| Templates | `templates/<type>/` (`template.json`, `schema.json`, `document.njk`, `fixtures/`) |
| Render core | `src/render/` (browser, pdf, png, render) |
| CLI / API | `src/cli.ts`, `src/server.ts` |
| Quality gates | `scripts/qa.ts`, `src/qa/`, `qa/` |

## Setup

Needs Node 24 or later (it runs the `.ts` sources directly) and Playwright's Chromium build 1208.

```bash
cd hec-docs && npm ci && npx playwright install chromium
```

Or use Docker; the image pins the browser:

```bash
docker build -t hec-docs hec-docs && docker run -p 8787:8787 -e HEC_DOCS_API_TOKEN=change-me hec-docs
```

## CLI

```bash
node bin/hec-docs.mjs list
node bin/hec-docs.mjs render homework templates/homework/fixtures/standard.json --variant writing-space --out out/hw.pdf
node bin/hec-docs.mjs validate invoice my-invoice.json
node bin/hec-docs.mjs batch jobs.json --out-dir out/run-1 --concurrency 4
```

The data file is either the bare data object or an envelope: `{ "data": {...}, "variant", "tenant", "generatedAt" }`.

- Every run writes `manifest.json` next to its output. It holds the type, template version, variant, filename, pages, bytes, ms, sha256 and warnings.
- Exit codes: 0 ok, 1 failure, 2 usage, 3 invalid data. Field errors are printed as JSON pointers, e.g. `/invoice/sessions/3/date: is required`.
- When installed (`npm i -g` or `npm link`), the same commands run as `hec-docs …`.

## HTTP API

`node src/server.ts` starts the server, configured by the environment variables below.

| Method | Path | |
|---|---|---|
| GET | `/healthz` | Liveness, browser version, queue depth |
| GET | `/v1/templates` | Types, versions, variants |
| POST | `/v1/render` | `{type, data, variant?, tenant?, generatedAt?}` → the PDF/PNG bytes, with `Content-Disposition` carrying the original filename (UTF-8) |
| POST | `/v1/batch` | `{jobs: [...]}` → manifest JSON with base64 bodies (`?include=manifest` to omit them) |

How requests are handled:
- **Auth:** set `HEC_DOCS_API_TOKEN` and every `/v1` call needs `Authorization: Bearer …`.
- **Idempotency:** send `Idempotency-Key`. The same key with the same body replays the stored result (`Idempotent-Replay: true`); the same key with a different body returns 409.
- **Errors:** JSON `{error: {code, message, fields[], requestId}}`.
  - 400 bad JSON
  - 401 unauthorised
  - 413 too large / too many jobs
  - 415 not JSON
  - 422 invalid document, with field errors
  - 503 queue full
  - 504 timeout

| Variable | Default | |
|---|---|---|
| `HEC_DOCS_PORT` / `HEC_DOCS_HOST` | 8787 / 127.0.0.1 | Docker sets the host to 0.0.0.0 |
| `HEC_DOCS_API_TOKEN` | (none) | Required outside localhost |
| `HEC_DOCS_CONCURRENCY` | 4 | Renders in flight; the rest queue |
| `HEC_DOCS_JOB_TIMEOUT_MS` | 30000 | Per document |
| `HEC_DOCS_MAX_BODY_BYTES` / `HEC_DOCS_MAX_BATCH` | 5 MB / 200 | |
| `HEC_DOCS_IDEMPOTENCY_TTL_MS` | 24 h | In-memory store |
| `HEC_DOCS_DEFAULT_TENANT` / `HEC_DOCS_TENANTS_DIR` | hec / ./tenants | |
| `HEC_DOCS_LOG_LEVEL` | info | JSON lines on stderr; never document data |
| `HEC_DOCS_CHROMIUM_SANDBOX` | true | Leave on; the image runs as an unprivileged user |

## Security

- **Offline browser:** Chromium's sandbox stays on. Each job gets a fresh page whose only reachable origin is an in-process asset server holding fonts, styles and the tenant's logo. Every other request is aborted and logged, so a hostile `<img src>` in data cannot fetch anything.
- **No scripts:** templates carry a CSP with no `script-src`.
- **Autoescape:** all data is HTML-escaped. Teacher rich text goes through an allow-list sanitiser, an exact port of the app's `cleanRichHtml`: no scripts, iframes, images or event handlers, and only `http(s)`/`mailto`/`tel` links.
- **Safe tokens:** tenant token values are validated before they reach CSS. Logos must live inside the tenant folder.
- **No secrets in code.** `npm audit --omit=dev` runs in CI.

## Determinism

The same input gives byte-identical output, on one machine or across processes:
- bundled fonts (`fonts/`, OFL, generated by `npm run fonts`)
- a pinned Chromium (Playwright 1.58.2 = build 1208, and the Docker tag)
- `generatedAt` used as the PDF dates and the "Generated on" text
- Chromium's run-specific structure ids renumbered
- the document ID set to a hash of the content

Send `generatedAt` in production calls. If it is omitted, it defaults to now.

## Adding things

**A layout variant**
1. Add it to `variants` in `templates/<type>/template.json` (at most 4).
2. Add the `{% if variant == "…" %}` branch in `document.njk`, built from existing components.
3. Add `fixtures/<variant>.json`.
4. Run `npm run qa -- --only <type> --update-baselines`, review the PNGs in `qa/baselines/<type>/`, and commit them.
5. Bump the template's minor version and add a CHANGELOG entry.

**A document type**
1. Create `templates/<type>/` with:
   - `template.json`: type, semver version, output, `documentTitle`, `lang`, variants, `filename` strategy, `keyField`, `brandStrings`
   - `schema.json`: JSON Schema 2020-12, `$id` ending `/<type>/<version>`, strict `additionalProperties: false`
   - `document.njk`: `{% extends "layouts/page.njk" %}`, `{% import "ui.njk" as ui %}`
   - `fixtures/`
2. Add a filename strategy in `src/filenames.ts` if the app already names the file. Copy its function; do not tidy it.
3. If you are replacing an existing generator, capture its output as `qa/before/<name>/dom.txt` and point a fixture at it (`"before": "<name>"`), so parity is proven, not assumed.
4. Use components. A genuinely new one goes in `components/ui/<component>.njk` and `components/css/<component>.css`, both token-only and named after the component, not the document.
5. Run `npm test` and `npm run qa`.

**A tenant (second brand)**
1. Copy `tenants/hec` to `tenants/<id>` and edit `theme.json`: name, logo file and alt text, tagline, footer, QR target, sign-off, encouragement lines, reassurance copy, locale. Under `tokens`, override any token leaf, e.g. `{"color": {"ink": {"$value": "#1d2b20"}}}`.
2. Render with `--tenant <id>` or `"tenant": "<id>"`.
3. No template changes are needed. If you find you need one, the template is wrong.

## Quality gates

- `npm test` runs the unit, snapshot and end-to-end (CLI and API) suites.
- `npm run qa` runs every fixture through the gates. It writes `qa/REPORT.md`, `qa/report.json`, and rasters (including grayscale) in `qa/out/`.
- `npm run contact-sheet` writes `qa/contact-sheet.pdf` (before and after).

| Gate | How |
|---|---|
| Text parity | Ordered LCS diff of the new reading-order text against the original generator's DOM text (`qa/before/*/dom.txt`), plus every original word present in the PDF's extracted text. Only registered brand strings may be added. Case, digits and diacritics count. |
| Visual QA | Overflow markers, bundled-fonts-only (a fallback font means a missing glyph), A4 page boxes, manual review of rasters |
| Regression | pixelmatch against `qa/baselines/**` (committed); CI fails on any unreviewed diff |
| Accessibility | Tagged PDF, StructTreeRoot, `/Lang`, Title shown in the title bar, every Figure (logo) has alt text; WCAG AA token contrast in unit tests |
| Print | Grayscale rasters; luminance separation of structural colours in unit tests; A4 with safe margins |
| Performance | Render ms and bytes per document; flags over 3 s or 1.5 MB |
| Determinism | Two renders, same sha256 |

veraPDF is not bundled (it needs Java). To run it on the outputs:
`docker run --rm -v "$PWD/qa/out:/data" verapdf/cli --flavour ua1 /data`. The built-in check covers the structural subset listed above.

## Wiring the app to the service

The app is a static site, so Chromium cannot run there. Deploy this service (the Docker image) where Supabase functions or the browser can reach it, then replace each generator's html2canvas/print path with a call to `POST /v1/render`, passing the data the component already builds.

| App generator | Type | Data the app sends |
|---|---|---|
| `HomeworkPdfDownload.tsx` | `homework` | homework + resolved class and teacher names |
| `BulkReportExport.tsx`, `AIReportDialog.tsx` | `progress-report` | studentName, the report row |
| `StudentStatementPrint.tsx` | `statement` | `{audit}` |
| `InvoicePrintView.tsx`, `TuitionBulkDownload.tsx` | `invoice` | InvoiceData + BankInfo, with the VietQR image as a data URI |
| `AccessCardDocument.tsx` | `access-card` | the card props |
| `ProfileShareCard.tsx` | `profile-card` | the card props |

Keep the old buttons until the service is live. Nothing in the app has been changed yet.
