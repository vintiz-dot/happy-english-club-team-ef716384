/**
 * lessonReportView - turns one row of get_lesson_reports_for_student
 * (migration 20261121131000) into what the family / child screen renders.
 *
 * Pure and import-free. The row's class_part and part are whatever a teacher
 * approved (docs/LESSON_REPORTS.md, "What approval stores"), so every field is
 * optional here: an older or partial report loses a section, never the page.
 * Nothing is priced, scored or worked out - only read, trimmed and paired
 * (English with its Vietnamese).
 *
 * Tested by scripts/pgtest/lesson-report-view.test.mjs.
 */

/** English text with the Vietnamese shown under it (null when there is none or it repeats the English). */
export interface Bilingual { en: string; vi: string | null }

export type ObjectiveMet = "yes" | "partly" | "no" | "unknown";
export type Attendance = "Present" | "Late" | "Absent" | "Excused";

export interface LessonReportView {
  reportId: string;
  sessionId: string;
  /** YYYY-MM-DD, the lesson's date. */
  date: string;
  startTime: string | null;
  className: string;
  title: Bilingual;
  summary: Bilingual | null;
  objectives: Array<{ text: Bilingual; met: ObjectiveMet }>;
  taught: Array<{ topic: string; detail: Bilingual | null }>;
  words: Array<{ en: string; vi: string | null; example: string | null }>;
  structures: Array<{ pattern: string; example: string | null }>;
  activities: Array<{ name: string; description: Bilingual | null }>;
  classFocus: Bilingual[];
  tips: Bilingual[];
  askYourChild: Bilingual[];
  nextLesson: Bilingual | null;
  homework: Array<{ homeworkId: string | null; title: string; dueDate: string | null }>;
  reviewHomeworkId: string | null;
  photos: Array<{ id: string; caption: Bilingual | null }>;
  /** This child's own part; null when the teacher wrote none for them. */
  child: ChildPart | null;
}

export interface ChildPart {
  highlight: Bilingual | null;
  focusNext: Bilingual | null;
  attendance: Attendance | null;
  points: number | null;
  workIds: string[];
  teacherComment: Bilingual | null;
}

type Obj = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const strOrNull = (v: unknown): string | null => str(v) || null;

/** Pair English and Vietnamese. Either alone still shows; both empty is null. */
export function bilingual(en: unknown, vi: unknown): Bilingual | null {
  const e = str(en), v = str(vi);
  if (!e && !v) return null;
  if (!e) return { en: v, vi: null };
  return { en: e, vi: v && v.toLowerCase() !== e.toLowerCase() ? v : null };
}

/** A list of {en, vi} items, as class_focus, tips and ask_your_child are stored. Plain strings pass too. */
function bilingualList(v: unknown): Bilingual[] {
  const out: Bilingual[] = [];
  for (const item of arr(v)) {
    const b = typeof item === "string" ? bilingual(item, null) : bilingual(obj(item).en ?? obj(item).text, obj(item).vi ?? obj(item).text_vi);
    if (b) out.push(b);
  }
  return out;
}

const MET: readonly ObjectiveMet[] = ["yes", "partly", "no", "unknown"];
const ATT: readonly Attendance[] = ["Present", "Late", "Absent", "Excused"];

export function toChildPart(raw: unknown): ChildPart | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Obj;
  const att = str(p.attendance);
  const points = typeof p.points === "number" && Number.isFinite(p.points) ? p.points
    : typeof p.points === "string" && p.points.trim() !== "" && Number.isFinite(Number(p.points)) ? Number(p.points) : null;
  return {
    highlight: bilingual(p.highlight, p.highlight_vi),
    focusNext: bilingual(p.focus_next, p.focus_next_vi),
    attendance: (ATT as readonly string[]).includes(att) ? (att as Attendance) : null,
    points,
    workIds: [...new Set(arr(p.work_ids).map(str).filter((id) => UUID.test(id)))],
    teacherComment: bilingual(p.teacher_comment, p.teacher_comment_vi),
  };
}

/** One row of get_lesson_reports_for_student. Returns null only when the row has no report or lesson id. */
export function toLessonReportView(row: unknown): LessonReportView | null {
  const r = obj(row);
  const reportId = str(r.report_id), sessionId = str(r.session_id);
  if (!reportId || !sessionId) return null;
  const c = obj(r.class_part);
  const lesson = obj(c.lesson);
  const parents = obj(c.parents);
  const captions = obj(c.photo_captions);
  const className = str(r.class_name) || "Class";

  return {
    reportId,
    sessionId,
    date: str(r.session_date).slice(0, 10),
    startTime: strOrNull(r.start_time)?.slice(0, 5) ?? null,
    className,
    title: bilingual(lesson.title, lesson.title_vi) ?? { en: `${className} lesson`, vi: null },
    summary: bilingual(lesson.summary ?? c.summary, lesson.summary_vi ?? c.summary_vi),
    objectives: arr(c.objectives).flatMap((o) => {
      const x = obj(o);
      const text = typeof o === "string" ? bilingual(o, null) : bilingual(x.text, x.text_vi);
      if (!text) return [];
      const met = str(x.met).toLowerCase();
      return [{ text, met: (MET as readonly string[]).includes(met) ? (met as ObjectiveMet) : "unknown" }];
    }),
    taught: arr(c.taught).flatMap((t) => {
      const x = obj(t);
      const topic = typeof t === "string" ? str(t) : str(x.topic);
      const detail = bilingual(x.detail, x.detail_vi);
      if (!topic && !detail) return [];
      return [{ topic: topic || detail!.en, detail: topic ? detail : null }];
    }),
    words: arr(c.words).flatMap((w) => {
      const x = obj(w);
      const en = typeof w === "string" ? str(w) : str(x.en);
      return en ? [{ en, vi: strOrNull(x.vi), example: strOrNull(x.example) }] : [];
    }),
    structures: arr(c.structures).flatMap((s) => {
      const x = obj(s);
      const pattern = typeof s === "string" ? str(s) : str(x.pattern);
      return pattern ? [{ pattern, example: strOrNull(x.example) }] : [];
    }),
    activities: arr(c.activities).flatMap((a) => {
      const x = obj(a);
      const name = str(x.name);
      const description = bilingual(x.description, x.description_vi);
      if (!name && !description) return [];
      return [{ name: name || description!.en, description: name ? description : null }];
    }),
    classFocus: bilingualList(c.class_focus),
    tips: bilingualList(parents.tips),
    askYourChild: bilingualList(parents.ask_your_child),
    nextLesson: typeof parents.next_lesson === "string"
      ? bilingual(parents.next_lesson, null)
      : bilingual(obj(parents.next_lesson).en, obj(parents.next_lesson).vi),
    homework: arr(c.homework).flatMap((h) => {
      const x = obj(h);
      const title = str(x.title);
      const id = str(x.homework_id);
      if (!title && !id) return [];
      return [{ homeworkId: UUID.test(id) ? id : null, title: title || "Homework", dueDate: strOrNull(x.due_date)?.slice(0, 10) ?? null }];
    }),
    reviewHomeworkId: UUID.test(str(r.review_homework_id)) ? str(r.review_homework_id) : null,
    photos: arr(r.photos).flatMap((p) => {
      const x = obj(p);
      const id = str(x.id);
      if (!UUID.test(id)) return [];
      const cap = obj(captions[id]);
      return [{ id, caption: bilingual(x.caption ?? cap.caption, x.caption_vi ?? cap.caption_vi) }];
    }),
    child: toChildPart(r.part),
  };
}

/** Every row that maps, newest first as the function returned them. */
export function toLessonReportViews(rows: unknown): LessonReportView[] {
  return arr(rows).map(toLessonReportView).filter((v): v is LessonReportView => v !== null);
}

/** The friendly chip for an objective's met state. */
export function metChip(met: ObjectiveMet): { label: Bilingual; tone: "good" | "partly" | "next" | "plain" } {
  switch (met) {
    case "yes": return { label: { en: "Achieved", vi: "Đã đạt" }, tone: "good" };
    case "partly": return { label: { en: "Getting there", vi: "Đang tiến bộ" }, tone: "partly" };
    case "no": return { label: { en: "Next time", vi: "Buổi sau" }, tone: "next" };
    default: return { label: { en: "Practised", vi: "Đã luyện tập" }, tone: "plain" };
  }
}

/** The attendance line, in both languages. */
export function attendanceLabel(a: Attendance): Bilingual {
  switch (a) {
    case "Present": return { en: "In class", vi: "Có mặt" };
    case "Late": return { en: "Came a little late", vi: "Đến muộn một chút" };
    case "Absent": return { en: "Absent", vi: "Vắng mặt" };
    case "Excused": return { en: "Absent (excused)", vi: "Vắng có phép" };
  }
}

/** True when the report has something in the "what we learned" section. */
export function hasLearned(v: LessonReportView): boolean {
  return v.taught.length + v.words.length + v.structures.length + v.activities.length > 0;
}
