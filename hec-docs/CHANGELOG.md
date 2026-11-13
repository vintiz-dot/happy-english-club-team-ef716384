# Changelog

All notable changes to HEC Docs: the engine, and each template with its own semver. A template's version is its schema's `$id` (`https://hec-docs.invalid/schemas/<type>/<version>`).
- **Major:** breaking data contract.
- **Minor:** new variant or optional field.
- **Patch:** visual change with the same data.

## Engine 1.0.0 (2026-11-13)

First release. HTML + CSS Paged Media → headless Chromium (Playwright 1.58.2, build 1208) → tagged PDF. Includes:
- W3C design tokens compiled to CSS variables
- multi-tenant themes
- a Nunjucks component library
- strict JSON Schema validation with field-level errors
- the CLI (`render`, `batch`, `validate`, `list`) and the HTTP API (`/v1/render`, `/v1/batch`, `/v1/templates`, `/healthz`)
- idempotency keys and a concurrency queue
- per-job timeouts and JSON logs
- run manifests
- deterministic output
- quality gates

### Templates

| Type | Version | Variants | Replaces |
|---|---|---|---|
| homework | 1.0.0 | standard, writing-space, prompt-card | `HomeworkPdfDownload.tsx` |

## What could not be preserved exactly

Content, numbers, dates, currency formatting and filenames are unchanged; `npm run qa` checks every fixture against the original generator's text. The items below are the deliberate or unavoidable differences.

### Every document
- **Brand elements are added:** the header lockup, the running header on pages 2+, the tagline footer, page numbers, and per document an encouragement line, reassurance line, Teacher Victor sign-off and QR to hanoienglish.com. They are registered as brand strings and excluded from parity.
- **The logo is recoloured.** The master (`Logo HEC.pdf`) is pure yellow #FFF200, which is illegible on light paper. Documents use the same vector artwork in navy, with the swoosh in print-safe yellow (`tenants/hec/assets/logo.svg`); the master is kept unchanged beside it. The old raster `public/images/hec_logo.png` is no longer used.
- **Text is real, selectable and tagged** instead of a JPEG screenshot. Copy/paste and screen readers now get the words. Rendering was previously via html2canvas, so nothing a reader saw is lost.

### Homework
- **Filename unchanged, quirk included:** every non-ASCII-alphanumeric character still becomes `_` (e.g. `Unit_6__My_Weekend___B_i_t_p_v__nh__tu_n_2_homework.pdf`). It now has a test.
- **Teacher text is printed through an exact port of the app's `cleanRichHtml`.** Like the app, it drops table structure and a pasted table's header row; the text of the cells runs together as it does on screen. This keeps the content identical to what students see. Improving it is an app change, not a visual one.
- **No anti-AI verification anchors existed** in the original generator, so none were added or changed.
- **The footer line** "Happy English Club • Generated on …" keeps its wording. The date comes from the request's `generatedAt` (default: now), as before.
