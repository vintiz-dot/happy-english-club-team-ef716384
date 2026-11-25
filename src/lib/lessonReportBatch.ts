/**
 * lessonReportBatch - the staff's "download every child's report" for one
 * approved lesson report.
 *
 * Staff of the lesson (admin, a teacher of the class, a TA on the session)
 * read lesson_reports and lesson_report_students under RLS
 * (20261121130000). This turns those rows into one family-view row per child,
 * shaped like get_lesson_reports_for_student returns, so the same
 * toLessonReportView reads it: the class part plus THAT child's part, never
 * staff_part, never a classmate's part. A child the teacher left out of the
 * approval (no lesson_report_students row) gets no file.
 *
 * classReportDocData turns one child's view into the HEC Docs `class-report`
 * data (hec-docs/templates/class-report/schema.json); the PDF is made there,
 * the browser rasteriser only as the fallback.
 *
 * Pure. Tested by scripts/pgtest/lesson-report-batch.test.mjs.
 */
import { attendanceLabel, metChip, toLessonReportView, type LessonReportView } from "./lessonReportView";

export interface ApprovedReportRow {
  id: string;
  session_id: string;
  class_part: unknown;
  photo_ids: string[] | null;
  review_homework_id: string | null;
}
export interface ChildPartRow { student_id: string; part: unknown }
export interface LessonMeta { date: string; start_time: string | null; class_name: string }

export interface ChildReport { studentId: string; name: string; view: LessonReportView }

/** One view per child with a part, sorted by name. Children without a name read "Child". */
export function childReports(
  report: ApprovedReportRow,
  parts: ChildPartRow[],
  names: Record<string, string>,
  lesson: LessonMeta,
): ChildReport[] {
  const out: ChildReport[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (!p?.student_id || seen.has(p.student_id)) continue;
    seen.add(p.student_id);
    const view = toLessonReportView({
      report_id: report.id,
      session_id: report.session_id,
      session_date: lesson.date,
      start_time: lesson.start_time,
      class_name: lesson.class_name,
      class_part: report.class_part,
      part: p.part,
      // Captions come from class_part.photo_captions, as the family function does.
      photos: (report.photo_ids ?? []).map((id) => ({ id })),
      review_homework_id: report.review_homework_id,
    });
    if (!view) continue;
    out.push({ studentId: p.student_id, name: (names[p.student_id] ?? "").trim() || "Child", view });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Windows-safe filename part, Vietnamese kept. */
export function fileSafe(input: string): string {
  return (input || "report").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** File names that never collide: two children of one name get "(2)". */
export function reportFileNames(reports: ChildReport[], lesson: LessonMeta): string[] {
  const used = new Map<string, number>();
  return reports.map((r) => {
    const base = `${fileSafe(r.name)} - ${fileSafe(lesson.class_name || "Class")} ${lesson.date}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return `${base}${n > 1 ? ` (${n})` : ""}.pdf`;
  });
}

export function zipName(lesson: LessonMeta): string {
  return `${fileSafe(lesson.class_name || "Class")} - Class reports ${lesson.date}.zip`;
}

/**
 * The HEC Docs `class-report` data for one child. `pictures` maps a photo or
 * work id to an inlined image (data: URI); one that could not be read is left
 * out rather than printed as a broken box.
 */
export function classReportDocData(r: ChildReport, pictures: Record<string, string | null | undefined>): Record<string, unknown> {
  const v = r.view;
  const c = v.child;
  const pic = (id: string) => {
    const u = pictures[id];
    return typeof u === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(u) ? u : null;
  };
  return {
    variant: "family",
    studentName: r.name,
    className: v.className || "Class",
    date: v.date,
    startTime: v.startTime && /^\d{2}:\d{2}$/.test(v.startTime) ? v.startTime : null,
    title: v.title,
    summary: v.summary,
    child: c ? {
      attendance: c.attendance ? attendanceLabel(c.attendance) : null,
      points: c.points === null ? null : Math.round(c.points),
      highlight: c.highlight,
      teacherComment: c.teacherComment,
      focusNext: c.focusNext,
      work: c.workIds.map(pic).filter((u): u is string => !!u),
    } : null,
    objectives: v.objectives.map((o) => ({ text: o.text, met: metChip(o.met).label })),
    taught: v.taught,
    words: v.words,
    structures: v.structures,
    activities: v.activities,
    photos: v.photos.flatMap((p) => {
      const src = pic(p.id);
      return src ? [{ src, caption: p.caption }] : [];
    }),
    classFocus: v.classFocus,
    tips: v.tips,
    askYourChild: v.askYourChild,
    homework: v.homework.map((h) => ({ title: h.title, dueDate: h.dueDate })),
    reviewQuiz: !!v.reviewHomeworkId,
    nextLesson: v.nextLesson,
  };
}
