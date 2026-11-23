/**
 * Words for the student Lessons, Lesson and Class Reports pages (docs/EXPERIENCE_DESIGN_BRIEF.md G6, J2).
 * Same shape as student.ts. Every Vietnamese line is a developer draft (`draft: true`) until a Vietnamese
 * speaker has read it. Voice (J1): plain, warm, short, never blaming.
 */
import type { CopyEntry } from "@/lib/copy/student";

export const studentLessonsCopy = {
  "lessons.title": { en: "My Lessons", vi: "Bài học của con", draft: true },
  "lessons.subtitle": { en: "Every lesson — what we covered, your feedback, and your work.", vi: "Mỗi buổi học: con đã học gì, nhận xét và bài làm của con.", draft: true },
  "lessons.subtitleShort": { en: "What we did in class.", vi: "Con đã học gì ở lớp.", draft: true },
  "lessons.reports": { en: "Daily class reports", vi: "Báo cáo buổi học", draft: true },
  "lessons.reportsShort": { en: "Class reports", vi: "Báo cáo lớp", draft: true },
  "lessons.homework": { en: "Homework", vi: "Bài tập", draft: true },
  "lessons.empty": { en: "No lessons yet", vi: "Chưa có bài học nào", draft: true },
  "lessons.emptyHelp": { en: "After each class, your teacher's lesson summary and your personal breakdown will appear here.", vi: "Sau mỗi buổi học, phần tóm tắt của cô/thầy và nhận xét riêng cho con sẽ hiện ở đây.", draft: true },
  "lessons.emptyShort": { en: "Your lessons will show up here after class.", vi: "Các bài học của con sẽ hiện ở đây sau giờ học.", draft: true },
  "lessons.error": { en: "We couldn't load your lessons. Please try again in a moment.", vi: "Không tải được bài học. Con thử lại sau một lát nhé.", draft: true },

  "lesson.back": { en: "All lessons", vi: "Tất cả bài học", draft: true },
  "lesson.backToList": { en: "Back to lessons", vi: "Về danh sách bài học", draft: true },
  "lesson.unavailable": { en: "This lesson isn't available.", vi: "Bài học này hiện chưa có.", draft: true },
  "lesson.error": { en: "We couldn't open this lesson. Please try again in a moment.", vi: "Không mở được bài học này. Con thử lại sau một lát nhé.", draft: true },

  "reports.title": { en: "Daily class reports", vi: "Báo cáo buổi học hằng ngày", draft: true },
  "reports.empty": { en: "No class reports yet", vi: "Chưa có báo cáo buổi học", draft: true },
  "reports.emptyHelp": { en: "After a lesson, the teacher checks the report and it appears here.", vi: "Sau buổi học, cô/thầy kiểm tra báo cáo và báo cáo sẽ hiện ở đây.", draft: true },
  "reports.emptyShort": { en: "Class reports will show up here after a lesson.", vi: "Báo cáo lớp sẽ hiện ở đây sau buổi học.", draft: true },
  "reports.error": { en: "We couldn't load the class reports. Please try again in a moment.", vi: "Không tải được báo cáo. Hãy thử lại sau một lát.", draft: true },
  "reports.older": { en: "Older reports", vi: "Báo cáo cũ hơn", draft: true },
} as const satisfies Record<string, CopyEntry>;

export type StudentLessonsKey = keyof typeof studentLessonsCopy;
