
## Plan: Fix blank homework PDFs and add true long-content pagination

### 1. Replace the current `pdf.html()` path with deterministic page rendering
**File:** `src/components/homework/HomeworkPdfDownload.tsx`

The blank-page issue is most likely coming from the current `jsPDF.html(container, ...)` flow. It is fragile with hidden/off-screen DOM, images, and long rich-text content.

Implementation:
- Stop using `pdf.html(...)` as the primary export path.
- Import and use `html2canvas` directly.
- Keep `jsPDF` only for page assembly and download.
- Render the homework into a hidden but measurable DOM root attached to `document.body`:
  - `position: fixed`
  - `top: 0`
  - `left: 0`
  - `z-index: -1`
  - `opacity: 0`
  - fixed content width matching A4 printable width

This removes the unstable renderer and gives full control over pagination.

---

### 2. Restructure the PDF DOM into logical sections and blocks
Inside the temporary PDF container, split content into explicit printable pieces instead of one giant blob.

Structure:
- Header block: logo + school title
- Metadata block: class / teacher / due date / posted
- Title block
- Instructions title block
- Instruction content blocks derived from the homework body
- Footer block

For the instructions body:
- Parse the rendered HTML into block-level chunks:
  - headings
  - paragraphs
  - lists / list items
  - blockquotes
  - tables
  - code/pre blocks
  - images
- Wrap each chunk with `data-pdf-block` so it can be measured and paginated individually.

This avoids arbitrary slicing and prevents content from being cut mid-block.

---

### 3. Add true pagination for long homework content
Use manual A4 pagination in `HomeworkPdfDownload.tsx`:

- Define A4 page constants:
  - page width / height
  - margins
  - printable width / height
- Iterate block by block.
- For each block:
  - capture it with `html2canvas`
  - convert canvas size to PDF mm
  - if the next block does not fit in remaining page space, start a new page
  - place the block image with `pdf.addImage(...)`

Special handling:
- If a block is taller than a full printable page:
  - do not let it overflow or get cut off
  - split that block further before rendering:
    - paragraph groups into smaller chunks
    - list items into smaller chunks
    - table rows into multiple table fragments
    - large images scaled to fit printable height
- Keep a small vertical gap between blocks for readability.

Result: long homework exports across multiple pages cleanly, with nothing clipped at the bottom.

---

### 4. Preserve visible links and restore clickable PDF links
The earlier requirement for links should still hold.

Implementation:
- Keep the existing “show full URL in parentheses” behavior.
- While rendering each chunk, collect all anchor elements inside that chunk.
- After placing the chunk image in the PDF, translate each anchor’s DOM rect into PDF coordinates and add a `pdf.link(...)` overlay.

That way the PDF keeps:
- obvious visible links
- printed full URLs
- clickable hotspots in the exported PDF

---

### 5. Harden the export against blank pages
Add explicit readiness checks before any capture:

- Wait for all images in the PDF container to load or fail safely
- Wait for `document.fonts.ready`
- Wait at least one layout frame after insertion
- Verify the container and each block have non-zero width/height before capture
- If the logo fails, continue without blocking the export
- If a block captures as empty, skip and log the failure instead of producing a blank whole document

Also sanitize and normalize the homework HTML before rendering so unsupported markup does not destabilize the export.

---

### 6. Keep the current branded look while making it page-safe
Maintain the existing Happy English Club styling, but tune it for multi-page output:

- stable widths
- wrapped links everywhere
- tables forced to printable width
- images constrained to page width
- `pre` / code blocks allowed to wrap instead of overflowing
- predictable margins and section spacing

This keeps the current design but makes it reliable for long homework bodies.

---

### Files to update
- `src/components/homework/HomeworkPdfDownload.tsx` — main rewrite for manual pagination, blank-page fix, and PDF link overlays

Optional only if needed during implementation:
- extract small internal helpers inside the same file or a tiny PDF utility file for:
  - waiting for assets
  - block measurement
  - anchor-to-PDF coordinate mapping

---

### QA to run after implementation
Verify with at least these cases:
1. Short homework: 1-page PDF, not blank
2. Long homework: 2+ pages, no clipped bottom content
3. Extremely long URL: wraps and stays within page width
4. Hyperlinked text: visible as blue underlined text, full URL shown, PDF link clickable
5. Homework with lists / tables / images: no overflow, no blank pages, correct ordering
6. Mobile-triggered download from student and teacher views: same output quality

### Out of scope
- No homework editor redesign
- No app-wide mobile rebuild here
- No database or backend changes
