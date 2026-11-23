/**
 * Words for the parent's tuition page (docs/EXPERIENCE_DESIGN_BRIEF.md H4, I4). Plain, no persuasion near money.
 * `draft: true`: Vietnamese drafted by the developer, not yet read by a Vietnamese speaker.
 */
import type { CopyEntry } from "@/lib/copy/student";

export const familyTuitionCopy = {
  "tuition.forMonth": { en: "Tuition for {month}", vi: "Học phí: {month}", draft: true },
  "tuition.received": { en: "Received with thanks", vi: "Đã nhận, xin cảm ơn", draft: true },
} as const satisfies Record<string, CopyEntry>;

export type FamilyTuitionCopyKey = keyof typeof familyTuitionCopy;
