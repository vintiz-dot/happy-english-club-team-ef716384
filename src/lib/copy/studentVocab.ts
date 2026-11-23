/**
 * Words for the vocabulary review deck (docs/EXPERIENCE_DESIGN_BRIEF.md G4, J2). Same shape as student.ts.
 * Every Vietnamese line is a developer draft, to be read by a Vietnamese speaker before it is final.
 */
import type { CopyEntry } from "./student";

export type VocabCopyKey = keyof typeof studentVocabCopy;

export const studentVocabCopy = {
  "vocab.showAnswer": { en: "Show answer", vi: "Xem đáp án", draft: true },
  "vocab.tapToReveal": { en: "tap to reveal", vi: "chạm để xem", draft: true },
  "vocab.rate.again": { en: "Again", vi: "Làm lại", draft: true },
  "vocab.rate.hard": { en: "Hard", vi: "Khó", draft: true },
  "vocab.rate.good": { en: "Good", vi: "Tốt", draft: true },
  "vocab.rate.easy": { en: "Easy", vi: "Dễ", draft: true },
  "vocab.knew": { en: "You knew it.", vi: "Con đã nhớ đúng.", draft: true },
  "vocab.again": { en: "This one will come back.", vi: "Thẻ này sẽ quay lại.", draft: true },
  "vocab.finish.early": { en: "All done! See you in class.", vi: "Xong rồi! Hẹn gặp con ở lớp.", draft: true },
  "vocab.finish.young": { en: "You finished your words for today.", vi: "Con đã ôn xong các từ hôm nay.", draft: true },
  "vocab.finish.junior": { en: "No more words today.", vi: "Hôm nay không còn từ nào.", draft: true },
  "vocab.finish.teen": { en: "You're up to date.", vi: "Bạn đã ôn xong.", draft: true },
  "vocab.none.early": { en: "No words today. See you in class.", vi: "Hôm nay chưa có từ nào. Hẹn gặp con ở lớp.", draft: true },
  "vocab.none.young": { en: "No words to review today.", vi: "Hôm nay chưa có từ nào để ôn.", draft: true },
  "vocab.none.junior": { en: "No words to review today.", vi: "Hôm nay chưa có từ nào để ôn.", draft: true },
  "vocab.none.teen": { en: "Nothing to review today.", vi: "Hôm nay không có gì để ôn.", draft: true },
} as const satisfies Record<string, CopyEntry>;
