// Output filenames, ported verbatim from the app so a regenerated document
// keeps exactly the name the old generator gave it. Each template.json names
// one of these strategies; do not "tidy" them into one rule.

/** src/lib/reportPdf.ts safeFileName: keeps Vietnamese, drops what Windows rejects. */
export function safeFileName(input: string): string {
  return (input || "report")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** src/components/admin/TuitionBulkDownload.tsx sanitizeFilename. */
export function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "_");
}

type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const FILENAME_STRATEGIES: Record<string, (d: Data) => string> = {
  // HomeworkPdfDownload.tsx
  homework: (d) => `${String(d.homework.title).replace(/[^a-zA-Z0-9]/g, "_")}_homework.pdf`,
  // BulkReportExport.tsx (single student)
  "progress-report": (d) => `${safeFileName(d.studentName)} - Progress Report.pdf`,
  // StudentAccessManager.tsx
  "access-card": (d) => `${safeFileName(d.studentName)} - Access Card.pdf`,
  // TuitionBulkDownload.tsx (per-invoice name inside the ZIP)
  invoice: (d) => `${sanitizeFilename(d.invoice.student.full_name ?? d.invoice.student.name ?? "")}_${d.invoice.month}.pdf`,
  // ProfileShareCard.tsx
  "profile-card": (d) => `${d.name}-profile.png`,
  // Print-only documents had no filename (the browser's "Save as PDF" names
  // them from the page title). We use a safeFileName of the title.
  statement: (d) => `${safeFileName(d.audit.student.name)} - Account Statement.pdf`,
};

export function filenameFor(strategy: string, data: Data): string {
  const fn = FILENAME_STRATEGIES[strategy];
  if (!fn) throw new Error(`Unknown filename strategy "${strategy}"`);
  return fn(data);
}
