/**
 * The lesson monitor pilot's report, as the teacher's screen shows it
 * (docs/LESSON_MONITOR_DESIGN.md, Option A; made overnight by
 * scripts/lesson-monitor/report.py, schema "hec-lesson-monitor/1").
 *
 * Pure: renaming and formatting over what the report already says. The
 * screen never recomputes a figure, never names a child, and shows every
 * uncertainty in the design's words. A field the report lacks degrades to
 * "not in this report", never to a guess.
 *
 * Pure: no imports.
 */

export const SCHEMA = "hec-lesson-monitor/1";

/** The design's wording (s.2, s.10), in one place so the screen and the tests agree. */
export const WORDING = {
  forYouOnly: "Only you can open these reports. Not the office, not parents, not children.",
  uncertainLine: "Words may be wrong or missing.",
  fadedLine: "No matching sound here - this line may not be speech.",
  unwritten: (dur: string) => `The room had speech here that was not written down (about ${dur}). This is an estimate.`,
  notWritten: "not written",
  notWrittenMeaning: "\"Not written\" does not mean \"not said\".",
  others: "\"Others\" is everyone not on your microphone. The computer does not know who they are.",
  talkRange: (t: [number, number], o: [number, number]) =>
    `You about ${t[0]}-${t[1]} % / others about ${o[0]}-${o[1]} % of speaking time`,
  noTargets: "No target words for this lesson. You can type them before a lesson, below.",
  teacherMic: "T",
  readOnly: "The report is the computer's draft. You cannot edit it; you can delete it.",
  deleted30: "Reports are deleted 30 days after the lesson.",
  sourceOf: { teacher: "the words you typed", homework: "the class's video homework word list", none: "" } as Record<string, string>,
} as const;

export interface ViewLine {
  t: number;
  e: number;
  text: string;
  uncertain: boolean;
  faded: boolean;
  teacher: boolean;
}
export interface ViewBand { t: number; e: number; seconds: number }
export interface ViewWord { word: string; heard: boolean; times: number[]; teacherMic: number | null; room: number | null }
export interface ViewStructure { name: string; count: number; times: number[] }
export interface ViewFlag { kind: string; text: string; t: number | null }
export interface ViewTalk { teacherPct: [number, number]; othersPct: [number, number]; timeline: string; stepS: number }
export interface ReportView {
  ok: boolean;
  durationS: number | null;
  offsetS: number;
  notes: string[];
  lines: ViewLine[];
  unwritten: ViewBand[];
  unwrittenSeconds: number;
  targetSource: string;
  words: ViewWord[];
  structures: ViewStructure[];
  patterns: { questions: number | null; canCant: number | null; pastEd: number | null };
  flags: ViewFlag[];
  talk: ViewTalk | null;
  uncertainCount: number;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const pair = (v: unknown): [number, number] | null => {
  const a = arr(v);
  return a.length === 2 && num(a[0]) !== null && num(a[1]) !== null ? [a[0] as number, a[1] as number] : null;
};

export function toReportView(body: unknown): ReportView {
  const b = obj(body);
  const lesson = obj(b.lesson);
  const lines: ViewLine[] = arr(b.lines).flatMap((x) => {
    const l = obj(x);
    const t = num(l.t), text = str(l.text);
    if (t === null || !text) return [];
    return [{ t, e: num(l.e) ?? t, text, uncertain: l.u === true, faded: l.f === true, teacher: l.who === "T" }];
  });
  const targets = obj(b.targets);
  const words: ViewWord[] = arr(targets.words).flatMap((x) => {
    const w = obj(x);
    if (!str(w.word)) return [];
    return [{ word: str(w.word), heard: w.heard === true, times: arr(w.times).map(num).filter((n): n is number => n !== null),
      teacherMic: num(w.teacher_mic), room: num(w.room) }];
  });
  const structures: ViewStructure[] = arr(targets.structures).flatMap((x) => {
    const s = obj(x);
    return str(s.name) ? [{ name: str(s.name), count: num(s.count) ?? 0, times: arr(s.times).map(num).filter((n): n is number => n !== null) }] : [];
  });
  const tt = obj(b.talk_time);
  const tp = pair(tt.teacher_pct), op = pair(tt.others_pct);
  const p = obj(b.patterns);
  return {
    ok: b.schema === SCHEMA,
    durationS: num(lesson.duration_s),
    offsetS: num(lesson.offset_s) ?? 0,
    notes: arr(b.notes).map(str).filter(Boolean),
    lines,
    unwritten: arr(b.unwritten).flatMap((x) => {
      const u = obj(x);
      const t = num(u.t), e = num(u.e);
      return t === null || e === null ? [] : [{ t, e, seconds: num(u.seconds) ?? e - t }];
    }),
    unwrittenSeconds: num(lesson.unwritten_seconds) ?? 0,
    targetSource: str(targets.source) || "none",
    words,
    structures,
    patterns: { questions: num(p.questions), canCant: num(p.can_cant), pastEd: num(p.past_ed) },
    flags: arr(b.flags).flatMap((x) => {
      const f = obj(x);
      return str(f.text) ? [{ kind: str(f.kind), text: str(f.text), t: num(f.t) }] : [];
    }),
    // Feature B exists only when step 0 passed for it; otherwise it is absent, not warned about.
    talk: tp && op ? { teacherPct: tp, othersPct: op, timeline: str(tt.timeline), stepS: num(tt.step_s) ?? 10 } : null,
    uncertainCount: lines.filter((l) => l.uncertain).length,
  };
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

/** Transcript lines and "not written" bands in time order, for one list. */
export type TranscriptItem = { kind: "line"; line: ViewLine } | { kind: "band"; band: ViewBand };
export function transcriptItems(v: ReportView): TranscriptItem[] {
  const items: TranscriptItem[] = [
    ...v.lines.map((line) => ({ kind: "line" as const, line })),
    ...v.unwritten.map((band) => ({ kind: "band" as const, band })),
  ];
  return items.sort((a, b) => (a.kind === "line" ? a.line.t : a.band.t) - (b.kind === "line" ? b.line.t : b.band.t));
}

export interface ChunkRow { storage_path: string; t_start_ms: number; t_end_ms: number }
/** Which room chunk holds a moment of the lesson, and where in it (seconds). */
export function chunkAt(chunks: ChunkRow[], offsetS: number, lessonT: number): { path: string; at: number } | null {
  const ms = Math.round((offsetS + lessonT) * 1000);
  const c = chunks.find((x) => x.t_start_ms <= ms && ms < x.t_end_ms);
  return c ? { path: c.storage_path, at: (ms - c.t_start_ms) / 1000 } : null;
}

/** Comma- or line-separated words as typed -> what lesson_monitor_set_targets accepts. */
export function parseWords(input: string, max = 40): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,\n;]+/)) {
    const w = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (w && /^[a-z][a-z' -]{0,39}$/.test(w) && !out.includes(w)) out.push(w);
  }
  return out.slice(0, max);
}
