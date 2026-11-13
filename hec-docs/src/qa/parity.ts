// Text parity: the regenerated document must say everything the original
// said, in the same order, and add nothing except registered brand strings.
//
// Text is compared as word tokens after Unicode NFC normalisation and
// whitespace collapsing, so line wrapping and layout do not matter but every
// word, digit, currency sign and diacritic does. Case matters too: content
// is never restyled with text-transform (only brand eyebrows are).

export interface ParityReport {
  ok: boolean;
  /** Original words absent from the new text (after an LCS alignment). */
  missing: string[];
  /** New words that are neither original content nor allowed brand text. */
  unexpected: string[];
  originalWords: number;
  newWords: number;
}

export function words(text: string): string[] {
  return text
    .normalize("NFC")
    .replace(/[  ]/g, " ")
    // Split punctuation that layout may detach (bullets, separators) into tokens.
    .replace(/([•·→—–|/()[\]:,;"“”])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Remove every occurrence of the given phrases (case-insensitive). */
export function stripPhrases(stream: string[], phrases: string[][]): string[] {
  const sorted = [...phrases].filter((p) => p.length).sort((a, b) => b.length - a.length);
  let out = stream;
  for (const p of sorted) {
    const lower = p.map((w) => w.toLowerCase());
    const next: string[] = [];
    for (let i = 0; i < out.length; ) {
      if (lower.every((w, j) => out[i + j]?.toLowerCase() === w)) i += p.length;
      else next.push(out[i++]);
    }
    out = next;
  }
  return out;
}

/** Tokens of a not in b and of b not in a, aligned by longest common subsequence. */
export function lcsDiff(a: string[], b: string[]): { onlyA: string[]; onlyB: string[] } {
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) onlyA.push(a[i++]);
    else onlyB.push(b[j++]);
  }
  while (i < n) onlyA.push(a[i++]);
  while (j < m) onlyB.push(b[j++]);
  return { onlyA, onlyB };
}

/**
 * Ordered comparison of reading-order text. Brand phrases are removed from
 * both sides first: where the original printed the tagline as content, the
 * new design prints it in the page footer, which `containsAll` checks in the
 * PDF instead.
 */
export function compareText(original: string, regenerated: string, brandStrings: string[] = []): ParityReport {
  const phrases = brandStrings.map(words);
  const orig = stripPhrases(words(original), phrases);
  const next = stripPhrases(words(regenerated), phrases);
  const { onlyA, onlyB } = lcsDiff(orig, next);
  return { ok: onlyA.length === 0 && onlyB.length === 0, missing: onlyA, unexpected: onlyB, originalWords: orig.length, newWords: next.length };
}

/**
 * Every word of the original must be present in the PDF's extracted text
 * (as often as in the original), brand words included. pdf.js may join
 * runs without spaces, so the haystack ignores whitespace.
 */
export function containsAll(original: string, extracted: string): { ok: boolean; missing: string[] } {
  const hay = extracted.normalize("NFC").replace(/\s+/g, "");
  const counts = new Map<string, number>();
  for (const w of words(original)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const missing: string[] = [];
  for (const [w, n] of counts) {
    const found = hay.split(w).length - 1;
    if (found < n) missing.push(n > 1 ? `${w} (x${n - found})` : w);
  }
  return { ok: missing.length === 0, missing };
}
