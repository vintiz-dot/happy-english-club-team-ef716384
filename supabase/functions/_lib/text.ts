/**
 * _lib/text.ts — small text/JSON helpers shared by the transcript
 * pipeline (analyze-transcript, transcribe-lesson-audio).
 */

/**
 * Tolerant JSON parse. LLM JSON output can be truncated when it hits the
 * token cap, which makes a plain JSON.parse throw and 500 the whole
 * function. This trims back to the last complete object and balances any
 * still-open brackets so we salvage a valid partial result instead.
 */
export function safeParseJson(content: string): any {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    // continue to repair
  }
  let s = content.trim();
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace === -1) return {};
  s = s.slice(0, lastBrace + 1);

  // Walk the string (string-literal aware) and close any open [ or {.
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" && stack[stack.length - 1] === "{") stack.pop();
    else if (ch === "]" && stack[stack.length - 1] === "[") stack.pop();
  }
  let repaired = s;
  for (let i = stack.length - 1; i >= 0; i--) repaired += stack[i] === "{" ? "}" : "]";
  try {
    return JSON.parse(repaired);
  } catch {
    return {};
  }
}

/** Split raw text into ≤maxChars chunks on line boundaries. */
export function chunkOnLines(raw: string, maxChars: number): string[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (cur.length + line.length + 1 > maxChars && cur) {
      chunks.push(cur);
      cur = "";
    }
    cur += (cur ? "\n" : "") + line;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

/** Split an array into fixed-size batches. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
