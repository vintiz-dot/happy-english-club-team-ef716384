/**
 * grammarChecker.ts — Reliable grammar gate for Grade 1-4 EAL students.
 *
 * Two-layer approach:
 *   Layer 1 (ALWAYS runs): Rule-based checks that reliably catch the most
 *   common errors young EAL students make. These rules are deterministic,
 *   require zero network/Wasm, and never silently fail.
 *
 *   Layer 2 (BONUS, best-effort): Harper Wasm linter for additional checks.
 *   If Harper fails to load, Layer 1 results are still enforced.
 *
 * Rules enforced:
 *   - Sentence must start with a capital letter
 *   - Sentence must end with proper punctuation (. ! ?)
 *   - Minimum word count (at least 4 real words)
 *   - No excessive repeated words (e.g. "the the the")
 *   - No keyboard spam / gibberish detection
 *   - Basic subject-verb agreement for common patterns
 *   - Must contain at least one verb-like word
 *   - No all-same-word sentences
 */

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
  /** Suggested fix (if any) */
  suggestion?: string;
}

export interface GrammarResult {
  ok: boolean;
  issues: GrammarIssue[];
  /** A single kid-friendly summary of all issues */
  summary: string;
}

// ─── Common English words for validation ────────────────────────────────

/** Minimal set of common English verbs (base forms) for verb-presence check */
const COMMON_VERBS = new Set([
  "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "done",
  "will", "would", "shall", "should", "can", "could",
  "may", "might", "must",
  "go", "goes", "went", "gone", "going",
  "get", "gets", "got", "getting",
  "make", "makes", "made", "making",
  "come", "comes", "came", "coming",
  "take", "takes", "took", "taken", "taking",
  "see", "sees", "saw", "seen", "seeing",
  "know", "knows", "knew", "known", "knowing",
  "think", "thinks", "thought", "thinking",
  "say", "says", "said", "saying",
  "give", "gives", "gave", "given", "giving",
  "tell", "tells", "told", "telling",
  "work", "works", "worked", "working",
  "call", "calls", "called", "calling",
  "try", "tries", "tried", "trying",
  "ask", "asks", "asked", "asking",
  "need", "needs", "needed", "needing",
  "feel", "feels", "felt", "feeling",
  "become", "becomes", "became", "becoming",
  "leave", "leaves", "left", "leaving",
  "put", "puts", "putting",
  "mean", "means", "meant", "meaning",
  "keep", "keeps", "kept", "keeping",
  "let", "lets", "letting",
  "begin", "begins", "began", "begun", "beginning",
  "show", "shows", "showed", "shown", "showing",
  "hear", "hears", "heard", "hearing",
  "play", "plays", "played", "playing",
  "run", "runs", "ran", "running",
  "move", "moves", "moved", "moving",
  "like", "likes", "liked", "liking",
  "live", "lives", "lived", "living",
  "believe", "believes", "believed", "believing",
  "help", "helps", "helped", "helping",
  "want", "wants", "wanted", "wanting",
  "eat", "eats", "ate", "eaten", "eating",
  "drink", "drinks", "drank", "drunk", "drinking",
  "read", "reads", "reading",
  "write", "writes", "wrote", "written", "writing",
  "learn", "learns", "learned", "learning",
  "study", "studies", "studied", "studying",
  "teach", "teaches", "taught", "teaching",
  "walk", "walks", "walked", "walking",
  "talk", "talks", "talked", "talking",
  "sit", "sits", "sat", "sitting",
  "stand", "stands", "stood", "standing",
  "look", "looks", "looked", "looking",
  "watch", "watches", "watched", "watching",
  "love", "loves", "loved", "loving",
  "hate", "hates", "hated", "hating",
  "open", "opens", "opened", "opening",
  "close", "closes", "closed", "closing",
  "stop", "stops", "stopped", "stopping",
  "start", "starts", "started", "starting",
  "sing", "sings", "sang", "sung", "singing",
  "dance", "dances", "danced", "dancing",
  "swim", "swims", "swam", "swum", "swimming",
  "jump", "jumps", "jumped", "jumping",
  "fly", "flies", "flew", "flown", "flying",
  "draw", "draws", "drew", "drawn", "drawing",
  "paint", "paints", "painted", "painting",
  "cook", "cooks", "cooked", "cooking",
  "clean", "cleans", "cleaned", "cleaning",
  "wash", "washes", "washed", "washing",
  "sleep", "sleeps", "slept", "sleeping",
  "wake", "wakes", "woke", "woken", "waking",
  "buy", "buys", "bought", "buying",
  "sell", "sells", "sold", "selling",
  "bring", "brings", "brought", "bringing",
  "carry", "carries", "carried", "carrying",
  "send", "sends", "sent", "sending",
  "build", "builds", "built", "building",
  "fall", "falls", "fell", "fallen", "falling",
  "grow", "grows", "grew", "grown", "growing",
  "cut", "cuts", "cutting",
  "catch", "catches", "caught", "catching",
  "hold", "holds", "held", "holding",
  "pick", "picks", "picked", "picking",
  "use", "uses", "used", "using",
  "find", "finds", "found", "finding",
  "add", "adds", "added", "adding",
  "change", "changes", "changed", "changing",
  "follow", "follows", "followed", "following",
  "spend", "spends", "spent", "spending",
  "win", "wins", "won", "winning",
  "lose", "loses", "lost", "losing",
  "enjoy", "enjoys", "enjoyed", "enjoying",
  "happen", "happens", "happened", "happening",
  "wait", "waits", "waited", "waiting",
  "stay", "stays", "stayed", "staying",
  "finish", "finishes", "finished", "finishing",
  "remember", "remembers", "remembered", "remembering",
  "wear", "wears", "wore", "worn", "wearing",
  "visit", "visits", "visited", "visiting",
  "practice", "practices", "practiced", "practicing",
]);

/** Common English words (top ~200). Used for gibberish detection. */
const COMMON_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "about", "into", "through", "during",
  "before", "after", "above", "below", "between", "under", "over",
  "i", "me", "my", "mine", "we", "us", "our", "you", "your", "he", "him",
  "his", "she", "her", "it", "its", "they", "them", "their", "this",
  "that", "these", "those", "who", "what", "which", "where", "when",
  "how", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "very", "too", "also",
  "just", "because", "if", "then", "so", "than", "while", "as",
  "here", "there", "now", "today", "yesterday", "tomorrow",
  "always", "never", "sometimes", "often", "usually",
  "big", "small", "long", "short", "old", "new", "young", "good", "bad",
  "happy", "sad", "fast", "slow", "hot", "cold", "warm", "cool",
  "beautiful", "pretty", "nice", "great", "best", "first", "last",
  "many", "much", "little", "lot", "lots",
  "time", "day", "night", "morning", "school", "home", "house", "room",
  "book", "water", "food", "friend", "family", "mother", "father",
  "brother", "sister", "teacher", "student", "child", "children",
  "dog", "cat", "bird", "tree", "flower", "sun", "moon", "star",
  "boy", "girl", "man", "woman", "people", "world", "country", "city",
  "game", "music", "color", "number", "part", "place", "thing",
  ...COMMON_VERBS,
]);

// ─── Rule-based checks ──────────────────────────────────────────────────

function getWords(sentence: string): string[] {
  return sentence
    .replace(/[^a-zA-Z'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 1);
}

function checkCapitalization(sentence: string): GrammarIssue | null {
  const trimmed = sentence.trim();
  if (trimmed.length === 0) return null;
  const first = trimmed[0];
  if (first !== first.toUpperCase() || first === first.toLowerCase()) {
    // first char is not uppercase (and is a letter)
    if (/[a-z]/.test(first)) {
      return {
        message: "Start your sentence with a capital letter! 🔤",
        start: 0,
        end: 1,
        problematicText: first,
        suggestion: first.toUpperCase(),
      };
    }
  }
  return null;
}

function checkEndPunctuation(sentence: string): GrammarIssue | null {
  const trimmed = sentence.trim();
  if (trimmed.length === 0) return null;
  const last = trimmed[trimmed.length - 1];
  if (!/[.!?]/.test(last)) {
    return {
      message: "End your sentence with a period (.), exclamation mark (!), or question mark (?). ✍️",
      start: trimmed.length - 1,
      end: trimmed.length,
      problematicText: last,
      suggestion: last + ".",
    };
  }
  return null;
}

function checkMinWordCount(sentence: string): GrammarIssue | null {
  const words = getWords(sentence);
  if (words.length < 4) {
    return {
      message: "Your sentence is too short! Try writing at least 4 words to make a complete sentence. 📝",
      start: 0,
      end: sentence.length,
      problematicText: sentence.trim(),
    };
  }
  return null;
}

function checkRepeatedWords(sentence: string): GrammarIssue | null {
  const words = getWords(sentence).map((w) => w.toLowerCase());
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 1) {
      // Allow "very very" but catch "the the", "is is" etc.
      // "had had" is valid English; be lenient with common valid repetitions
      const allowedRepeats = new Set(["very", "had", "that"]);
      if (!allowedRepeats.has(words[i])) {
        const idx = sentence.toLowerCase().indexOf(words[i] + " " + words[i]);
        return {
          message: `Oops! You wrote "${words[i]}" twice in a row. Try removing one! ✂️`,
          start: idx >= 0 ? idx : 0,
          end: idx >= 0 ? idx + words[i].length * 2 + 1 : sentence.length,
          problematicText: `${words[i]} ${words[i]}`,
          suggestion: words[i],
        };
      }
    }
  }
  return null;
}

function checkGibberish(sentence: string): GrammarIssue | null {
  const words = getWords(sentence).map((w) => w.toLowerCase());
  if (words.length === 0) return null;

  // Check 1: Consonant cluster detection — words with no vowels (a,e,i,o,u)
  // are likely gibberish (except common abbreviations)
  const allowedNoVowel = new Set(["my", "by", "gym", "fly", "try", "cry", "dry", "fry", "shy", "sky", "sly", "spy", "why", "thy", "hmm", "shh", "tsk", "psst", "rhythm", "hymn", "myth", "lynx", "gym", "glyph", "crypt", "nymph", "pygmy", "tryst", "gypsy", "lynch", "synth", "lymph"]);
  for (const word of words) {
    if (word.length >= 3 && !/[aeiouy]/i.test(word) && !allowedNoVowel.has(word)) {
      return {
        message: `"${word}" doesn't look like a real English word. Check your spelling! 🔍`,
        start: sentence.toLowerCase().indexOf(word),
        end: sentence.toLowerCase().indexOf(word) + word.length,
        problematicText: word,
      };
    }
  }

  // Check 2: Same character repeated 3+ times (e.g. "aaaa", "hhhh")
  for (const word of words) {
    if (/(.)\1{2,}/.test(word) && !new Set(["ooo", "aaa", "sss"]).has(word)) {
      return {
        message: `"${word}" has too many repeated letters. Did you mean something else? 🤔`,
        start: sentence.toLowerCase().indexOf(word),
        end: sentence.toLowerCase().indexOf(word) + word.length,
        problematicText: word,
      };
    }
  }

  // Check 3: If most words aren't recognized English, flag as meaningless
  const recognized = words.filter((w) => {
    // Recognized if it's in our common words set, or looks like a plausible
    // English word (ends in common suffixes, etc.)
    if (COMMON_WORDS.has(w)) return true;
    // Accept words ending in common English suffixes
    if (/(?:ing|tion|sion|ment|ness|able|ible|ful|less|ous|ive|ly|er|est|ed|es|s)$/.test(w)) return true;
    // Accept short words (articles, prepositions) — likely valid
    if (w.length <= 2) return true;
    return false;
  });

  const recognitionRate = recognized.length / words.length;
  if (words.length >= 3 && recognitionRate < 0.4) {
    return {
      message: "This doesn't look like a real English sentence. Try writing a sentence that makes sense! 🌟",
      start: 0,
      end: sentence.length,
      problematicText: sentence.trim(),
    };
  }

  return null;
}

function checkAllSameWord(sentence: string): GrammarIssue | null {
  const words = getWords(sentence).map((w) => w.toLowerCase());
  if (words.length < 2) return null;
  const unique = new Set(words);
  if (unique.size === 1) {
    return {
      message: "Your sentence uses the same word over and over! Try writing a real sentence with different words. 📖",
      start: 0,
      end: sentence.length,
      problematicText: sentence.trim(),
    };
  }
  return null;
}

function checkHasVerb(sentence: string): GrammarIssue | null {
  const words = getWords(sentence).map((w) => w.toLowerCase());
  if (words.length < 3) return null; // Too short to judge

  const hasVerb = words.some((w) => COMMON_VERBS.has(w));
  // Also check for words ending in common verb suffixes
  const hasVerbLike = words.some((w) =>
    /(?:ing|ed|es|ize|ise|ify|ate)$/.test(w) && w.length > 3,
  );

  if (!hasVerb && !hasVerbLike) {
    return {
      message: "Your sentence needs a verb (action word) like 'is', 'run', 'eat', 'play', etc. Every sentence needs one! 🏃",
      start: 0,
      end: sentence.length,
      problematicText: sentence.trim(),
    };
  }
  return null;
}

/** Catch common "he go" / "she eat" patterns — 3rd person singular missing -s */
function checkBasicSubjectVerb(sentence: string): GrammarIssue | null {
  const words = getWords(sentence).map((w) => w.toLowerCase());

  const thirdPersonSingular = new Set(["he", "she", "it"]);
  const baseFormsNeedS = new Set([
    "go", "eat", "run", "play", "like", "want", "need", "have",
    "make", "take", "come", "give", "think", "say", "know",
    "see", "get", "find", "tell", "ask", "work", "call",
    "try", "leave", "feel", "become", "keep", "let",
    "begin", "show", "hear", "move", "live", "believe",
    "happen", "walk", "talk", "sit", "stand", "look",
    "watch", "love", "hate", "open", "close", "stop",
    "start", "sing", "dance", "swim", "jump", "fly",
    "draw", "paint", "cook", "clean", "wash", "sleep",
    "wake", "buy", "sell", "bring", "carry", "send",
    "build", "fall", "grow", "cut", "catch", "hold",
    "pick", "use", "add", "change", "follow", "spend",
    "win", "lose", "enjoy", "wait", "stay", "finish",
    "remember", "wear", "visit", "practice", "drink",
    "read", "write", "learn", "study", "teach",
  ]);

  for (let i = 0; i < words.length - 1; i++) {
    if (thirdPersonSingular.has(words[i]) && baseFormsNeedS.has(words[i + 1])) {
      const verb = words[i + 1];
      let suggestion: string;
      if (verb === "go") suggestion = "goes";
      else if (verb === "have") suggestion = "has";
      else if (verb === "do") suggestion = "does";
      else if (verb.endsWith("y") && !/[aeiou]y$/.test(verb))
        suggestion = verb.slice(0, -1) + "ies";
      else if (/(?:s|x|z|ch|sh)$/.test(verb)) suggestion = verb + "es";
      else suggestion = verb + "s";

      const subjIdx = sentence.toLowerCase().indexOf(words[i]);
      const verbIdx = sentence.toLowerCase().indexOf(verb, subjIdx + words[i].length);

      return {
        message: `With "${words[i]}", the verb should be "${suggestion}" instead of "${verb}". 🧩`,
        start: verbIdx >= 0 ? verbIdx : 0,
        end: verbIdx >= 0 ? verbIdx + verb.length : sentence.length,
        problematicText: verb,
        suggestion,
      };
    }
  }

  // Check "I is" / "I are" patterns
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === "i" && (words[i + 1] === "is" || words[i + 1] === "are")) {
      const verbIdx = sentence.toLowerCase().indexOf(words[i + 1], i > 0 ? sentence.toLowerCase().indexOf(words[i]) + 1 : 0);
      return {
        message: `With "I", use "am" instead of "${words[i + 1]}". 🧩`,
        start: verbIdx >= 0 ? verbIdx : 0,
        end: verbIdx >= 0 ? verbIdx + words[i + 1].length : sentence.length,
        problematicText: words[i + 1],
        suggestion: "am",
      };
    }
  }

  return null;
}

// ─── Harper bonus layer (best-effort) ───────────────────────────────────

let _harperAvailable: boolean | null = null; // null = untested
let _linter: any = null;
let _setupPromise: Promise<void> | null = null;

async function tryHarperLint(sentence: string): Promise<GrammarIssue[]> {
  // If we already know Harper doesn't work, skip
  if (_harperAvailable === false) return [];

  try {
    if (!_linter) {
      const { WorkerLinter } = await import("harper.js");
      _linter = new WorkerLinter();
      _setupPromise = _linter.setup();
    }
    if (_setupPromise) await _setupPromise;

    const lints = await _linter.lint(sentence);
    _harperAvailable = true;

    if (!lints || lints.length === 0) return [];

    return lints.map((lint: any) => {
      const start = lint.span?.start ?? 0;
      const end = lint.span?.end ?? sentence.length;
      return {
        message: friendlyHarperMessage(lint.message || "Something looks off here"),
        start,
        end,
        problematicText: sentence.slice(start, end),
        suggestion: extractSuggestion(lint),
      };
    });
  } catch {
    _harperAvailable = false;
    console.warn("Harper grammar checker unavailable — relying on rule-based checks only");
    return [];
  }
}

function friendlyHarperMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("spell")) return "Check your spelling here! 📝";
  if (lower.includes("repeat") || lower.includes("duplicate")) return "You repeated a word! ✂️";
  if (lower.includes("capital")) return "Start with a capital letter! 🔤";
  if (lower.includes("article")) return "Check if you need 'a' or 'an' here! 🤔";
  if (lower.includes("comma") || lower.includes("punctuation")) return "Check your punctuation! ✍️";
  if (lower.includes("space")) return "Check the spacing! 📏";
  return `${raw} 🔍`;
}

function extractSuggestion(lint: any): string | undefined {
  if (!Array.isArray(lint.suggestions) || lint.suggestions.length === 0) return undefined;
  const first = lint.suggestions[0];
  if (typeof first === "string") return first;
  if (first?.text) return first.text;
  if (first?.ReplaceWith) {
    return Array.isArray(first.ReplaceWith)
      ? first.ReplaceWith.map((c: any) => (typeof c === "string" ? c : c?.char ?? "")).join("")
      : String(first.ReplaceWith);
  }
  return undefined;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Runs grammar/spelling/structure checks on a student's sentence.
 *
 * Layer 1 (rule-based) ALWAYS runs and catches the most common issues.
 * Layer 2 (Harper Wasm) runs as a bonus — if it fails, Layer 1 still works.
 */
export async function checkGrammar(sentence: string): Promise<GrammarResult> {
  const trimmed = sentence.trim();

  // Skip very short input — other checks (min-token, word-presence) handle these
  if (trimmed.length < 3) {
    return { ok: true, issues: [], summary: "" };
  }

  const issues: GrammarIssue[] = [];

  // ── Layer 1: Rule-based checks (always reliable) ──

  const checks = [
    checkAllSameWord(trimmed),
    checkGibberish(trimmed),
    checkMinWordCount(trimmed),
    checkCapitalization(trimmed),
    checkEndPunctuation(trimmed),
    checkRepeatedWords(trimmed),
    checkHasVerb(trimmed),
    checkBasicSubjectVerb(trimmed),
  ];

  for (const issue of checks) {
    if (issue) issues.push(issue);
  }

  // ── Layer 2: Harper Wasm bonus (best-effort) ──

  // Only run Harper if Layer 1 found no issues — avoids double-flagging
  if (issues.length === 0) {
    const harperIssues = await tryHarperLint(trimmed);
    issues.push(...harperIssues);
  }

  if (issues.length === 0) {
    return { ok: true, issues: [], summary: "" };
  }

  const summary =
    issues.length === 1
      ? "Almost there! Fix 1 small thing and you're good to go! 💪"
      : `Almost there! Fix ${issues.length} small things and you're good to go! 💪`;

  return { ok: false, issues, summary };
}
