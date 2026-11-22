/**
 * Words for the parent's screens, written under docs/EXPERIENCE_DESIGN_BRIEF.md (H, J1, J2). Same shape as
 * student.ts: every entry is { en, vi }. Parents get English with the Vietnamese beneath on headings and on every
 * sentence about something that needs action; the components decide where.
 *
 * `draft: true` marks Vietnamese drafted by the developer and not yet read by a Vietnamese speaker: the list is
 * handed to the owner and nothing marked draft is final. Voice (J1): plain, warm, short, no exclamation marks,
 * nothing that persuades near money (I4); "Everything is in order." is only said when it is true.
 */
import type { CopyEntry } from "@/lib/copy/student";

export const familyCopy = {
  "greet.morning": { en: "Good morning", vi: "Chào buổi sáng", draft: true },
  "greet.afternoon": { en: "Good afternoon", vi: "Chào buổi chiều", draft: true },
  "greet.evening": { en: "Good evening", vi: "Chào buổi tối", draft: true },
  "home.heading": { en: "Your family at Happy English Club", vi: "Gia đình bạn tại Happy English Club", draft: true },

  "needs.title": { en: "Does anything need you?", vi: "Có việc gì cần bạn không?", draft: true },
  "needs.ok": { en: "Everything is in order.", vi: "Mọi thứ đều ổn.", draft: true },
  "needs.tuition": { en: "This month's tuition", vi: "Học phí tháng này", draft: true },

  "week.title": { en: "This week", vi: "Tuần này", draft: true },
  "week.lessonNote": { en: "A lesson note was added on {date}.", vi: "Ghi chú buổi học đã được thêm vào {date}.", draft: true },

  "child.reports": { en: "Daily class reports", vi: "Báo cáo buổi học của con", draft: true },
  "child.more": { en: "More about {name}", vi: "Xem thêm về {name}", draft: true },
  "child.less": { en: "Show less", vi: "Thu gọn", draft: true },
  "child.worked": { en: "What we worked on", vi: "Nội dung đã học", draft: true },
  "child.progress": { en: "Progress", vi: "Tiến bộ", draft: true },
  "child.level": { en: "Level confirmed by the teacher: {level}", vi: "Trình độ do giáo viên xác nhận: {level}", draft: true },
  "child.nothingYet": { en: "Nothing to show here yet.", vi: "Chưa có nội dung nào ở đây.", draft: true },
} as const satisfies Record<string, CopyEntry>;

export type FamilyCopyKey = keyof typeof familyCopy;
