/**
 * Words for the Defend My Level page (docs/EXPERIENCE_DESIGN_BRIEF.md G4, J2). Vietnamese is a draft until a
 * Vietnamese speaker has read it. English lines already on the page stay as they are in the page itself; these
 * are the new words: the Seal after the last stage, and the Vietnamese shown beneath key labels.
 */
import type { CopyEntry } from "@/lib/copy/student";

export const studentDefendCopy = {
  "defend.sealSent": { en: "Sent to your teacher", vi: "Đã gửi cho thầy cô", draft: true },
  "defend.title": { en: "Defend My Level", vi: "Bảo vệ cấp độ", draft: true },
  "defend.intro": {
    en: "Prove your English level in an adaptive challenge — the questions adjust to how well you do.",
    vi: "Cho thấy trình độ tiếng Anh của con qua thử thách thích ứng — câu hỏi thay đổi theo bài làm của con.",
    draft: true,
  },
  "defend.stage": { en: "Stage {n} of {total}", vi: "Chặng {n} trên {total}", draft: true },
  "defend.answered": { en: "{n}/{total} answered", vi: "Đã trả lời {n}/{total}", draft: true },
  "defend.submitStage": { en: "Submit stage", vi: "Nộp chặng này", draft: true },
  "defend.finish": { en: "Finish & send to my teacher", vi: "Hoàn thành và gửi cho thầy cô", draft: true },
} satisfies Record<string, CopyEntry>;

export type StudentDefendKey = keyof typeof studentDefendCopy;
