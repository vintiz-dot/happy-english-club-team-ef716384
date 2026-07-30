/**
 * reportPdf — turn a rendered report node into a real A4 PDF file.
 *
 * WHY DOM CAPTURE RATHER THAN jsPDF's TEXT API
 * jsPDF's built-in fonts (Helvetica et al.) are WinAnsi-encoded and cannot
 * represent Vietnamese diacritics. Half this school's student names would
 * come out as mojibake, which is worse than useless on a document a parent
 * reads. Rasterising the browser's own rendering keeps every name, and any
 * Vietnamese in the narrative, exactly right. The trade-off is that the text
 * is not selectable — acceptable for a report that is printed or emailed.
 *
 * The output is paginated properly: a long report is sliced across as many
 * A4 pages as it needs instead of being squashed onto one.
 */
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** A4 portrait, in millimetres. */
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 10;

/** Width, in CSS pixels, that the off-screen report is laid out at.
 *  794px ≈ 210mm at 96dpi, so line breaks match what A4 will show. */
export const A4_CONTENT_WIDTH_PX = 794;

/**
 * Rasterise `node` in the LIGHT palette regardless of the app's current theme.
 *
 * Stripping `dark` here is load-bearing, not cosmetic: `.print-muted` (the
 * fallback that darkens secondary text) only exists inside `@media print`, so
 * a capture taken in dark mode would put the theme's pale muted-foreground on
 * a white page and half the report would be unreadable. html2canvas renders a
 * CLONE of the document, so the live page never flickers.
 *
 * Exported separately from the PDF wrapper so it can be verified on its own.
 */
export async function nodeToCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(node, {
    scale: 2, // legible text; 1 is visibly soft when printed
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    onclone: (doc) => {
      doc.documentElement.classList.remove("dark");
      doc.documentElement.style.colorScheme = "light";
    },
  });
}

/**
 * Rasterise `node` and lay it out across A4 pages.
 * Returns the PDF as a Blob so the caller can save it or add it to a zip.
 */
export async function nodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await nodeToCanvas(node);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const contentWMm = PAGE_W_MM - MARGIN_MM * 2;
  const contentHMm = PAGE_H_MM - MARGIN_MM * 2;

  // Scale factor between the captured bitmap and the printed page.
  const pxPerMm = canvas.width / contentWMm;
  const pageSliceHeightPx = Math.floor(contentHMm * pxPerMm);

  let offsetPx = 0;
  let pageIndex = 0;

  while (offsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - offsetPx);

    // Copy just this page's band out of the tall capture.
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("Could not get a 2D canvas context for the PDF");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0, offsetPx, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx,
    );

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      MARGIN_MM,
      MARGIN_MM,
      contentWMm,
      sliceHeightPx / pxPerMm,
    );

    offsetPx += sliceHeightPx;
    pageIndex++;
  }

  return pdf.output("blob");
}

/** Filesystem-safe filename fragment that still keeps Vietnamese readable. */
export function safeFileName(input: string): string {
  return (input || "report")
    .replace(/[\\/:*?"<>|]/g, "-")   // characters Windows rejects outright
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in some browsers before it has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
