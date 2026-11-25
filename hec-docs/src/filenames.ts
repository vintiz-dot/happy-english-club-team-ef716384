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

/** Strategies also receive the resolved variant (it may come from the request, not the data). */
export const FILENAME_STRATEGIES: Record<string, (d: Data, variant?: string) => string> = {
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
  // Class reports (new; no earlier generator): ClassReportDownload.tsx zips one per child.
  "class-report": (d) => `${safeFileName(d.studentName)} - ${safeFileName(d.className)} ${d.date}.pdf`,
  // Lesson Decks exports (new; no earlier generator). The variant decides the
  // suffix; a sheet made for one child leads with the child's name.
  "lesson-material": (d, variant) => {
    if ((variant ?? d.variant) === "student") {
      const lead = d.studentName ? `${safeFileName(d.studentName)} - ` : "";
      return `${lead}${safeFileName(d.title)} - Student copy.pdf`;
    }
    return `${safeFileName(d.title)} - Teacher copy.pdf`;
  },
};

export function filenameFor(strategy: string, data: Data, variant?: string): string {
  const fn = FILENAME_STRATEGIES[strategy];
  if (!fn) throw new Error(`Unknown filename strategy "${strategy}"`);
  return fn(data, variant);
}
