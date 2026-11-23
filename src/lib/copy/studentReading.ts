/**
 * Words for Resources, Picture Reader and Journal (docs/EXPERIENCE_DESIGN_BRIEF.md G6, J1, J2).
 * Every entry is { en, vi, draft: true }: the Vietnamese is drafted by the developer and waits for a Vietnamese
 * speaker (brief J2). `{n}` is filled by `fill()`.
 */
import type { CopyEntry } from "@/lib/copy/student";
import { fill } from "@/lib/copy/student";
import { createElement, type ReactNode } from "react";
import { useAgeBand } from "@/hooks/useAgeBand";

export const studentReadingCopy = {
  // ---- Resources
  "res.title": { en: "My Resources", vi: "Tài liệu của con", draft: true },
  "res.countOne": { en: "{n} thing to explore", vi: "{n} mục để khám phá", draft: true },
  "res.countMany": { en: "{n} things to explore", vi: "{n} mục để khám phá", draft: true },
  "res.search": { en: "Search resources", vi: "Tìm tài liệu", draft: true },
  "res.all": { en: "All", vi: "Tất cả", draft: true },
  "res.emptyNone": { en: "Nothing here yet. Your teacher will add things soon.", vi: "Chưa có gì ở đây. Cô giáo sẽ sớm thêm vào.", draft: true },
  "res.emptyNoMatch": { en: "Nothing found. Try other words.", vi: "Không tìm thấy gì. Con thử từ khác nhé.", draft: true },
  "res.back": { en: "Back", vi: "Quay lại", draft: true },
  "res.next": { en: "Next", vi: "Tiếp", draft: true },

  // ---- Picture Reader
  "pr.title": { en: "Picture Reader", vi: "Đọc qua hình", draft: true },
  "pr.sub": { en: "Read with pictures", vi: "Đọc cùng hình ảnh", draft: true },
  "pr.loading": { en: "Loading", vi: "Đang tải", draft: true },
  "pr.empty": { en: "Your teacher has not shared a picture story yet.", vi: "Cô giáo chưa chia sẻ truyện tranh nào.", draft: true },
  "pr.sentenceOne": { en: "{n} sentence", vi: "{n} câu", draft: true },
  "pr.sentenceMany": { en: "{n} sentences", vi: "{n} câu", draft: true },
  "pr.allStories": { en: "All stories", vi: "Tất cả truyện", draft: true },
  "pr.back": { en: "Back", vi: "Quay lại", draft: true },
  "pr.listen": { en: "Listen", vi: "Nghe", draft: true },
  "pr.next": { en: "Next", vi: "Tiếp", draft: true },
  "pr.end": { en: "The end", vi: "Hết truyện", draft: true },

  // ---- Journal (page wrapper)
  "jr.pick": { en: "Choose a student profile to open the journal.", vi: "Hãy chọn một hồ sơ học sinh để mở nhật ký.", draft: true },
} as const satisfies Record<string, CopyEntry>;

export type StudentReadingKey = keyof typeof studentReadingCopy;

type Vars = Record<string, string | number>;

/** English, and whether the Vietnamese goes beneath it (always for early and young; the device switch for the rest). */
export function useReadingCopy() {
  const { viBeneath, band } = useAgeBand();
  return {
    en: (k: StudentReadingKey, vars?: Vars) => fill(studentReadingCopy[k].en, vars),
    vi: (k: StudentReadingKey, vars?: Vars) => fill(studentReadingCopy[k].vi, vars),
    beneath: viBeneath,
    /** early and young: bigger tap targets and shorter labels. */
    small: band === "early" || band === "young",
    teen: band === "teen",
  };
}

/** English with the Vietnamese beneath in the small type, when the band asks for it. Wraps; never truncates. */
export function readingLine(en: ReactNode, vi: string, beneath: boolean, className?: string) {
  return createElement(
    "span",
    { className: ["inline-block min-w-0 max-w-full break-words", className].filter(Boolean).join(" ") },
    createElement("span", null, en),
    beneath ? createElement("span", { lang: "vi", className: "block text-hec-small font-normal text-hec-ink-soft" }, vi) : null,
  );
}
