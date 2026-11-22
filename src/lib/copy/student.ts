/**
 * Words for the student surfaces, written under docs/EXPERIENCE_DESIGN_BRIEF.md (J2). One small typed
 * dictionary: every entry is { en, vi }. Only strings written or rewritten under the brief live here.
 *
 * `draft: true` marks Vietnamese drafted by the developer and not yet read by a Vietnamese speaker (brief J2,
 * Part L question 9): the list is handed to the owner, and nothing marked draft is final.
 *
 * Voice (J1): plain, warm, short. No exclamation marks for adults, at most one per screen for children; say what
 * happened and what to do; never blame ("This is the next thing", not "This is late").
 * `{name}` style placeholders are filled by `fill()`.
 */
export interface CopyEntry {
  en: string;
  vi: string;
  /** Vietnamese drafted by the developer; a Vietnamese speaker has not read it yet. */
  draft?: true;
}

export const studentCopy = {
  // ---- Look (Profile)
  "look.title": { en: "Look", vi: "Giao diện", draft: true },
  "look.help": { en: "Choose how your page looks.", vi: "Chọn giao diện cho trang của con.", draft: true },
  "look.playful": { en: "Playful", vi: "Vui nhộn", draft: true },
  "look.classic": { en: "Classic", vi: "Cổ điển", draft: true },
  "look.pip": { en: "Show Pip", vi: "Hiện Pip", draft: true },
  "look.vi": { en: "Vietnamese under the English", vi: "Tiếng Việt dưới tiếng Anh", draft: true },

  // ---- Moving up (F3)
  "moving.line": { en: "A new school year. Your space has grown with you.", vi: "Năm học mới. Không gian của con đã lớn lên cùng con.", draft: true },
} as const satisfies Record<string, CopyEntry>;

export type StudentCopyKey = keyof typeof studentCopy;

/** Fills {name} style placeholders. */
export function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, k) => (k in vars ? String(vars[k]) : whole));
}
