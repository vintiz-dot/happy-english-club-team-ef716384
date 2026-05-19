/**
 * grammarChecker.ts — Harper-powered client-side grammar gate.
 *
 * Uses `harper.js` (Wasm-powered, runs in-browser) via WorkerLinter so the
 * main thread stays responsive. The linter is a singleton — the Wasm module
 * is loaded once on first use and reused for subsequent calls.
 *
 * Public API:
 *   checkGrammar(sentence: string): Promise<GrammarResult>
 *
 * The result contains:
 *   - `ok: true`  → sentence is clean
 *   - `ok: false` → list of issues with kid-friendly messages + span info
 */

import { WorkerLinter } from "harper.js";

// ─── Types ──────────────────────────────────────────────────────────────

export interface GrammarIssue {
  /** Human-friendly description of the problem */
  message: string;
  /** Start character index in the original text */
  start: number;
  /** End character index in the original text */
  end: number;
  /** The problematic substring */
  problematicText: string;
  /** Harper's suggestion (if any) */
  suggestion?: string;
}

export interface GrammarResult {
  ok: boolean;
  issues: GrammarIssue[];
  /** A single kid-friendly summary of all issues */
  summary: string;
}

// ─── Singleton linter ───────────────────────────────────────────────────

let _linter: WorkerLinter | null = null;
let _setupPromise: Promise<void> | null = null;

function getLinter(): WorkerLinter {
  if (!_linter) {
    _linter = new WorkerLinter();
    _setupPromise = _linter.setup();
  }
  return _linter;
}

// ─── Kid-friendly message mapping ───────────────────────────────────────

function friendlyMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();

  if (lower.includes("spell") || lower.includes("misspelling") || lower.includes("misspelled")) {
    return "Check your spelling here! 📝";
  }
  if (lower.includes("repeated") || lower.includes("duplicate")) {
    return "Oops, you repeated a word! Try removing one. ✂️";
  }
  if (lower.includes("capitalize") || lower.includes("capital letter")) {
    return "Remember to start sentences with a capital letter! 🔤";
  }
  if (lower.includes("article") || lower.includes("\"a\"") || lower.includes("\"an\"")) {
    return "Check if you need 'a' or 'an' here! 🤔";
  }
  if (lower.includes("comma") || lower.includes("punctuation")) {
    return "Check your punctuation here! ✍️";
  }
  if (lower.includes("subject") || lower.includes("verb")) {
    return "Make sure your sentence sounds right — check who is doing what! 🧩";
  }
  if (lower.includes("space") || lower.includes("whitespace")) {
    return "Check the spacing between your words! 📏";
  }

  // Fallback — sanitize the raw message for kids
  return `Hmm, something looks off here: ${rawMessage} 🔍`;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Runs Harper grammar/spelling/structure checks on a student's sentence.
 *
 * Returns `{ ok: true }` if no issues, or `{ ok: false, issues, summary }`
 * when problems are detected.
 *
 * Gracefully returns `{ ok: true }` if Harper fails to load (e.g. Wasm
 * unsupported) so the save flow isn't permanently blocked.
 */
export async function checkGrammar(sentence: string): Promise<GrammarResult> {
  const trimmed = sentence.trim();

  // Don't gate empty or very short sentences — the word-presence and
  // min-token checks already handle those.
  if (trimmed.length < 5) {
    return { ok: true, issues: [], summary: "" };
  }

  try {
    const linter = getLinter();
    if (_setupPromise) await _setupPromise;

    const lints = await linter.lint(trimmed);

    if (!lints || lints.length === 0) {
      return { ok: true, issues: [], summary: "" };
    }

    const issues: GrammarIssue[] = lints.map((lint: any) => {
      const start = lint.span?.start ?? 0;
      const end = lint.span?.end ?? trimmed.length;
      const problematicText = trimmed.slice(start, end);
      const rawMessage = lint.message || "Unknown issue";

      // Extract first suggestion text if available
      let suggestion: string | undefined;
      if (Array.isArray(lint.suggestions) && lint.suggestions.length > 0) {
        const first = lint.suggestions[0];
        if (typeof first === "string") suggestion = first;
        else if (first?.text) suggestion = first.text;
        else if (first?.ReplaceWith) {
          // Harper uses ReplaceWith variant
          suggestion = Array.isArray(first.ReplaceWith)
            ? first.ReplaceWith.map((c: any) => (typeof c === "string" ? c : c?.char ?? "")).join("")
            : String(first.ReplaceWith);
        }
      }

      return {
        message: friendlyMessage(rawMessage),
        start,
        end,
        problematicText,
        suggestion,
      };
    });

    // Build a kid-friendly summary
    const count = issues.length;
    const summary =
      count === 1
        ? "Almost there! Fix 1 small thing and you're good to go! 💪"
        : `Almost there! Fix ${count} small things and you're good to go! 💪`;

    return { ok: false, issues, summary };
  } catch (err) {
    // If Harper can't load (Wasm issue, old browser, etc.), don't block saves
    console.warn("Harper grammar check unavailable:", err);
    return { ok: true, issues: [], summary: "" };
  }
}
