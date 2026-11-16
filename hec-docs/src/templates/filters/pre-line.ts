// Port of CSS `white-space: pre-line` for plain text printed as paragraphs
// (ReportDocument.tsx prints the report narrative that way). A blank line
// starts a new paragraph; a single newline is a line break inside one; runs
// of spaces collapse as pre-line collapses them. Every word is kept as is.
// Pure: no clock, no I/O.

/** "a\nb\n\nc" -> [["a", "b"], ["c"]] */
function preLineParagraphs(text: unknown): string[][] {
  const s = String(text ?? "").replace(/\r\n?/g, "\n");
  return s
    .split(/\n[ \t]*\n+/)
    .map((p) => p.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter((l) => l.length))
    .filter((p) => p.length);
}

export const filters = { preLineParagraphs };
