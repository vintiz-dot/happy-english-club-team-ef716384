/**
 * What the Schedule's "Class report" page shows for one lesson, worked out from
 * records that already exist (owner, 25 Nov 2026): the approved lesson report,
 * its draft, the lesson monitor's transcript, the older class transcripts
 * (pasted meeting transcripts and audio transcripts, which never carried a
 * session id), and the "who's speaking" taps.
 *
 * Pure: no imports, no database. The page fetches, this file decides.
 * Nothing here invents a figure. A source that is not there gives null / [],
 * and the page leaves that part empty.
 *
 * Why a transcript is matched to a lesson here and not by an UPDATE of
 * `class_transcripts.session_id`: the 36 transcripts in the table all have a
 * NULL session_id, and a wrong guess written to the table is a wrong record for
 * good. Matching at read time writes nothing, and the rule below says "no
 * match" whenever it is not sure.
 */

/* ------------------------------------------------------------------ parsing a spoken transcript */

export interface Turn { speaker: string; text: string; t: number | null }

const TIME_LINE = /^\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?$/;
const CUE_LINE = /^(\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d+)?\s*-->\s*(\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d+)?/;
// "Victor Moronu: text". A label is short, has no URL or clock time, and starts with a letter.
const LABELLED = /^([A-Za-z\u00C0-\u1EF9][^:\n]{0,39}?):\s+(.*)$/;

function seconds(stamp: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:[.,](\d+))?/.exec(stamp.trim());
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + (m[4] ? Number(`0.${m[4]}`) : 0);
}

/**
 * Reads WebVTT (`<v Teacher>text</v>`), the "Name: text" form Google Meet and Zoom
 * paste as, and Otter's "Speaker 1  0:01" heading form. A line with no speaker
 * belongs to the last speaker. Lines that are only a clock time ("00:29:52") move
 * the clock; they are not speech.
 *
 * "Name: text" is only believed for a name that speaks at least three times:
 * a pasted summary ("Lesson Review: Day and Night", "Class type: Young learners")
 * is full of "Heading: text" lines and is not a conversation.
 */
export function parseSpokenTranscript(raw: string | null | undefined): Turn[] {
  const lines = String(raw ?? "").split(/\r?\n/).map((l) => l.trim());
  const seen = new Map<string, number>();
  for (const line of lines) {
    const l = LABELLED.exec(line);
    if (l && !/^https?$/i.test(l[1]) && !/\d{1,2}:\d{2}/.test(l[1])) seen.set(l[1].trim(), (seen.get(l[1].trim()) ?? 0) + 1);
  }
  const speakers = new Set([...seen].filter(([, n]) => n >= 3).map(([k]) => k));

  const turns: Turn[] = [];
  let clock: number | null = null;
  let last: Turn | null = null;
  const start = (speaker: string, text: string) => {
    last = { speaker, text, t: clock };
    if (text) turns.push(last);
  };
  for (const line of lines) {
    if (!line || line === "WEBVTT" || /^NOTE\b/.test(line) || /^\d+$/.test(line)) continue;
    if (CUE_LINE.test(line)) { clock = seconds(line); continue; }
    if (TIME_LINE.test(line)) { clock = seconds(line) ?? clock; continue; }
    const v = /^<v\s+([^>]+)>(.*?)(?:<\/v>)?$/.exec(line);
    if (v) { start(v[1].trim(), v[2].trim()); continue; }
    // Otter: "Speaker 1  0:01" on its own line, the words on the lines after it.
    const o = /^([A-Za-z][\w .'-]{0,30}?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(line);
    if (o) { clock = seconds(o[2]); last = { speaker: o[1].trim(), text: "", t: clock }; turns.push(last); continue; }
    const l = LABELLED.exec(line);
    if (l && speakers.has(l[1].trim())) { start(l[1].trim(), l[2].trim()); continue; }
    if (!last) continue;
    last.text = `${last.text} ${line}`.trim();
  }
  return turns.filter((t) => t.text);
}

const wordCount = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export interface SpeakerShare { speaker: string; words: number; pct: number; isTeacher: boolean }
export interface TalkShare {
  /** What was counted. Words, never minutes: a transcript has no reliable clock for every line. */
  basis: "words";
  totalWords: number;
  speakers: SpeakerShare[];
  /** The teacher's share of all words, or null when the transcript does not say which speaker is the teacher. */
  teacherPct: number | null;
  othersPct: number | null;
}

/** Is this speaker label the lesson's teacher? "Teacher", or the teacher's own name (full or one part of it). */
export function isTeacherLabel(label: string, teacherNames: string[]): boolean {
  const a = fold(label);
  if (!a) return false;
  if (a === "teacher") return true;
  for (const n of teacherNames) {
    const b = fold(n);
    if (!b) continue;
    if (a === b) return true;
    const aParts = a.split(" "), bParts = b.split(" ");
    // Two or more matching name parts ("Victor Moronu" vs "Moronu Victor"), or a single-word label that is one part of a full name.
    const shared = aParts.filter((p) => bParts.includes(p)).length;
    if (shared >= 2 || (aParts.length === 1 && shared === 1 && bParts.length >= 2)) return true;
  }
  return false;
}

export function talkShare(turns: Turn[], teacherNames: string[]): TalkShare | null {
  const by = new Map<string, number>();
  for (const t of turns) by.set(t.speaker, (by.get(t.speaker) ?? 0) + wordCount(t.text));
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const speakers = [...by.entries()]
    .map(([speaker, words]) => ({ speaker, words, pct: Math.round((words / total) * 100), isTeacher: isTeacherLabel(speaker, teacherNames) }))
    .sort((a, b) => b.words - a.words);
  const teacherWords = speakers.filter((s) => s.isTeacher).reduce((a, s) => a + s.words, 0);
  const known = speakers.some((s) => s.isTeacher);
  return {
    basis: "words",
    totalWords: total,
    speakers,
    teacherPct: known ? Math.round((teacherWords / total) * 100) : null,
    othersPct: known ? 100 - Math.round((teacherWords / total) * 100) : null,
  };
}

/* ------------------------------------------------------------------ which lesson a transcript belongs to */

export interface TranscriptRow {
  id: string;
  class_id: string;
  session_id: string | null;
  transcript_date: string; // YYYY-MM-DD
  status: string;
  raw_text: string | null;
}
export interface SessionRef { id: string; date: string; start_time: string | null; status?: string }

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/** "Meeting Aug 27, 2026 at 17:26 GMT+07:00 - Transcript" -> the date and time the meeting really started. */
export function meetingStamp(raw: string | null | undefined): { date: string; minutes: number | null } | null {
  const head = String(raw ?? "").slice(0, 400);
  // "Meeting Aug 27, 2026 at 17:26" carries the start time; the line above it, "Aug 27, 2026", is only the date.
  const m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\s+at\s+(\d{1,2}):(\d{2})/i.exec(head)
    ?? /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})/i.exec(head);
  if (!m) return null;
  return {
    date: `${m[3]}-${pad(MONTHS[m[1].toLowerCase().slice(0, 3)])}-${pad(Number(m[2]))}`,
    minutes: m[4] ? Number(m[4]) * 60 + Number(m[5]) : null,
  };
}

export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const minutesOf = (hhmm: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * Which of `classSessions` (this class's lessons, any status) a transcript is
 * about, or null. A stored session_id always wins. Otherwise:
 *  - a pasted meeting says when it started: that date;
 *  - else the transcript's own date, and if the class had no lesson that day, the
 *    day before (transcripts are filed the morning after: 17 of the 36 in the table);
 *  - a cancelled lesson never matches;
 *  - two lessons on that day and nothing to tell them apart -> null (left empty).
 */
export function resolveTranscriptSession(t: TranscriptRow, classSessions: SessionRef[]): string | null {
  if (t.session_id) return t.session_id;
  const live = classSessions.filter((s) => s.status !== "Canceled");
  const stamp = meetingStamp(t.raw_text);
  const dates = stamp ? [stamp.date] : [t.transcript_date, addDays(t.transcript_date, -1)];
  for (const d of dates) {
    const day = live.filter((s) => s.date === d);
    if (day.length === 1) return day[0].id;
    if (day.length > 1) {
      if (stamp?.minutes == null) return null;
      const close = day
        .map((s) => ({ s, gap: Math.abs((minutesOf(s.start_time) ?? 1e9) - stamp.minutes!) }))
        .sort((a, b) => a.gap - b.gap);
      // Within an hour of one lesson's start and clearly closer than the other.
      return close[0].gap <= 60 && close[0].gap + 30 <= close[1].gap ? close[0].s.id : null;
    }
  }
  return null;
}

/** The best transcript among those that resolve to one lesson: analysed first, then the fullest text. A placeholder ("processing") is not a transcript. */
export function bestTranscript<T extends TranscriptRow>(rows: T[]): T | null {
  const usable = rows.filter((r) => (r.raw_text ?? "").trim().length >= 200);
  usable.sort((a, b) => (Number(b.status === "analyzed") - Number(a.status === "analyzed")) || (b.raw_text!.length - a.raw_text!.length));
  return usable[0] ?? null;
}

/* ------------------------------------------------------------------ "who's speaking" taps */

export interface SpeakerMark { kind: "student" | "teacher" | "chorus" | "stop"; student_ids: string[]; at: string; offset_ms: number | null }
export interface MarkShare {
  basis: "taps";
  /** Seconds each kind of speaker was marked as talking (a pause of more than `capS` counts as `capS`). */
  teacherS: number;
  childrenS: number;
  chorusS: number;
  teacherPct: number;
  childrenPct: number;
  chorusPct: number;
  perStudentS: Record<string, number>;
}

/**
 * The taps say who started talking at a moment. A speaker is counted until the
 * next tap, at most `capS` seconds, because a forgotten "stop" must not turn
 * ten minutes of silence into one child's talk. Needs two or more taps.
 */
export function markShare(marks: SpeakerMark[], capS = 90): MarkShare | null {
  const sorted = [...marks].sort((a, b) => (a.offset_ms ?? Date.parse(a.at)) - (b.offset_ms ?? Date.parse(b.at)));
  if (sorted.length < 2) return null;
  let teacherS = 0, childrenS = 0, chorusS = 0;
  const perStudentS: Record<string, number> = {};
  const at = (m: SpeakerMark) => (m.offset_ms != null ? m.offset_ms : Date.parse(m.at)) / 1000;
  for (let i = 0; i < sorted.length - 1; i++) {
    const m = sorted[i];
    if (m.kind === "stop") continue;
    const dur = Math.min(capS, Math.max(0, at(sorted[i + 1]) - at(m)));
    if (m.kind === "teacher") teacherS += dur;
    else if (m.kind === "chorus") chorusS += dur;
    else {
      childrenS += dur;
      const each = dur / Math.max(1, m.student_ids.length);
      for (const id of m.student_ids) perStudentS[id] = (perStudentS[id] ?? 0) + each;
    }
  }
  const total = teacherS + childrenS + chorusS;
  if (total <= 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  return { basis: "taps", teacherS, childrenS, chorusS, teacherPct: pct(teacherS), childrenPct: pct(childrenS), chorusPct: pct(chorusS), perStudentS };
}

/* ------------------------------------------------------------------ matching a speaker label to an enrolled child */

/**
 * A speaker label ("Jack", "Nguyen Minh Anh") -> the one enrolled child it means,
 * or null. Full name, or one part of the name that no other child shares.
 * Never a guess between two children.
 */
export function matchStudent(label: string, students: { id: string; full_name: string }[]): string | null {
  const a = fold(label);
  if (!a || a === "unknown" || a === "teacher" || a === "student" || a === "students") return null;
  const exact = students.filter((s) => fold(s.full_name) === a);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;
  const hit = students.filter((s) => fold(s.full_name).split(" ").includes(a));
  if (hit.length === 1) return hit[0].id;
  // "Capybara", "hana": a nickname that is also a name part is covered above; a label of several words must share two parts.
  const parts = a.split(" ");
  if (parts.length >= 2) {
    const two = students.filter((s) => parts.filter((p) => fold(s.full_name).split(" ").includes(p)).length >= 2);
    if (two.length === 1) return two[0].id;
  }
  return null;
}

/* ------------------------------------------------------------------ the class-level report, from whichever source has one */

export type ReportSource = "approved" | "draft" | "transcript";
export interface ClassReportView {
  source: ReportSource;
  title: string;
  summary: string;
  objectives: { text: string; met?: string }[];
  taught: { topic: string; detail: string }[];
  words: { en: string; vi?: string; example?: string }[];
  structures: { pattern: string; example?: string }[];
  activities: { name: string; description: string }[];
  materials: string[];
  homework: string[];
  chronology: { phase: string; detail: string }[];
  understanding: string;
  misconceptions: string[];
  nextSteps: string[];
}

const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown): string[] => arr(v).map(str).filter(Boolean);

/** An approved report's `class_part`, or a draft's `body`: the same field names. Staff-only fields (gaps, evidence) are left out here as they are in what families get. */
export function viewFromReportBody(body: unknown, source: "approved" | "draft"): ClassReportView | null {
  const b = obj(body);
  const lesson = obj(b.lesson);
  const v: ClassReportView = {
    source,
    title: str(lesson.title),
    summary: str(lesson.summary),
    objectives: arr(b.objectives).flatMap((o) => (str(obj(o).text) ? [{ text: str(obj(o).text), met: str(obj(o).met) || undefined }] : [])),
    taught: arr(b.taught).flatMap((x) => (str(obj(x).topic) ? [{ topic: str(obj(x).topic), detail: str(obj(x).detail) }] : [])),
    words: arr(b.words).flatMap((x) => (str(obj(x).en) ? [{ en: str(obj(x).en), vi: str(obj(x).vi) || undefined, example: str(obj(x).example) || undefined }] : [])),
    structures: arr(b.structures).flatMap((x) => (str(obj(x).pattern) ? [{ pattern: str(obj(x).pattern), example: str(obj(x).example) || undefined }] : [])),
    activities: arr(b.activities).flatMap((x) => (str(obj(x).name) ? [{ name: str(obj(x).name), description: str(obj(x).description) }] : [])),
    materials: [],
    homework: arr(b.homework).map((h) => str(obj(h).title)).filter(Boolean),
    chronology: [],
    understanding: "",
    misconceptions: [],
    nextSteps: str(obj(obj(b.parents).next_lesson).en) ? [str(obj(obj(b.parents).next_lesson).en)] : [],
  };
  return hasContent(v) ? v : null;
}

/** An old `class_transcripts.analysis`: summary, materials, homework and a `lesson_report` block when the analysis made one. */
export function viewFromTranscriptAnalysis(analysis: unknown, title: string | null, summary: string | null): ClassReportView | null {
  const a = obj(analysis);
  const lr = obj(a.lesson_report);
  const materials = arr(a.materials).flatMap((m) => {
    if (typeof m === "string") return str(m) ? [str(m)] : [];
    const o = obj(m);
    const name = str(o.name);
    return name ? [str(o.pages) ? `${name} (${str(o.pages)})` : name] : [];
  });
  const hw = a.homework;
  const homework = typeof hw === "string" ? (str(hw) ? [str(hw)] : []) : strs(hw).length ? strs(hw) : arr(hw).map((h) => str(obj(h).title) || str(obj(h).description)).filter(Boolean);
  const v: ClassReportView = {
    source: "transcript",
    title: str(title),
    summary: str(a.summary) || str(summary),
    objectives: strs(lr.objectives).map((text) => ({ text })),
    taught: [], words: [], structures: [], activities: [],
    materials,
    homework,
    chronology: arr(lr.chronology).flatMap((c) => (str(obj(c).detail) ? [{ phase: str(obj(c).phase), detail: str(obj(c).detail) }] : [])),
    understanding: str(lr.general_understanding),
    misconceptions: strs(lr.misconceptions),
    nextSteps: strs(lr.next_steps),
  };
  return hasContent(v) ? v : null;
}

function hasContent(v: ClassReportView): boolean {
  return !!(v.title || v.summary || v.objectives.length || v.taught.length || v.words.length || v.structures.length || v.activities.length
    || v.materials.length || v.homework.length || v.chronology.length || v.understanding || v.misconceptions.length || v.nextSteps.length);
}

/* ------------------------------------------------------------------ one row per child */

export interface StudentRow {
  studentId: string | null;
  name: string;
  attendance: string | null;
  /** The child's share of words / tapped time, when the sources name them. */
  wordPct: number | null;
  tappedS: number | null;
  highlight: string;
  focusNext: string;
  teacherComment: string;
  contribution: string;
  level: string;
  errors: number | null;
  points: number | null;
}

/** A child from a draft / approved report part, a transcript analysis entry, or only the register. */
export interface StudentNote {
  highlight?: string; focusNext?: string; teacherComment?: string; contribution?: string; level?: string; errors?: number | null; points?: number | null; attendance?: string | null;
}

export function noteFromReportPart(part: unknown): StudentNote {
  const p = obj(part);
  return {
    highlight: str(p.highlight), focusNext: str(p.focus_next), teacherComment: str(p.teacher_comment),
    attendance: str(p.attendance) || null, points: typeof p.points === "number" ? p.points : null,
  };
}

export function noteFromAnalysisStudent(s: unknown): StudentNote & { name: string } {
  const o = obj(s);
  return {
    name: str(o.name),
    highlight: strs(o.highlights).join(" "),
    contribution: str(o.contribution),
    focusNext: str(o.recommendation),
    level: str(o.cefr_estimate),
    errors: Array.isArray(o.errors) ? o.errors.length : null,
  };
}

export function buildStudentRows(args: {
  enrolled: { id: string; full_name: string }[];
  attendance: Record<string, string>;
  notes: Record<string, StudentNote>;
  /** Transcript analysis entries by their own name ("Jack"), not yet tied to a child. */
  analysisNotes: (StudentNote & { name: string })[];
  share: TalkShare | null;
  marks: MarkShare | null;
  points: Record<string, number>;
}): StudentRow[] {
  const wordsBy: Record<string, number> = {};
  if (args.share) {
    for (const sp of args.share.speakers) {
      if (sp.isTeacher) continue;
      const id = matchStudent(sp.speaker, args.enrolled);
      if (id) wordsBy[id] = (wordsBy[id] ?? 0) + sp.words;
    }
  }
  const byAnalysis: Record<string, StudentNote> = {};
  for (const n of args.analysisNotes) {
    const id = matchStudent(n.name, args.enrolled);
    if (id && !byAnalysis[id]) byAnalysis[id] = n;
  }
  return args.enrolled.map((s) => {
    const n = args.notes[s.id] ?? {};
    const a = byAnalysis[s.id] ?? {};
    return {
      studentId: s.id,
      name: s.full_name,
      attendance: args.attendance[s.id] ?? n.attendance ?? null,
      wordPct: args.share && wordsBy[s.id] ? Math.round((wordsBy[s.id] / args.share.totalWords) * 100) : null,
      tappedS: args.marks && args.marks.perStudentS[s.id] ? Math.round(args.marks.perStudentS[s.id]) : null,
      highlight: n.highlight || a.highlight || "",
      focusNext: n.focusNext || a.focusNext || "",
      teacherComment: n.teacherComment || "",
      contribution: n.contribution || a.contribution || "",
      level: n.level || a.level || "",
      errors: n.errors ?? a.errors ?? null,
      points: args.points[s.id] ?? n.points ?? null,
    };
  });
}
