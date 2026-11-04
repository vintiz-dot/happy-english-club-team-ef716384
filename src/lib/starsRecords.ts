/**
 * What the Stars Sync records screen shows, worked out from the raw log.
 *
 * stars_sync_events says "skipped_unmapped: Pixel Pal child 121 is not
 * matched to an HEC child". This turns that into something a person can
 * work with: whose record it is, in which class, what it says, why it is
 * stuck and what would unstick it - then filters, sorts and groups it.
 *
 * It reads the log and decides nothing about a child's record. Those
 * decisions are in the database (supabase/AGENTS.md); this is only the
 * reading of them.
 *
 * Pure, so it can be tested directly: scripts/pgtest/stars-records.test.mjs.
 */
import { foldText } from "./starsNames";

/** One row of stars_sync_events, as the screen selects it. */
export interface StarsEventRow {
  event_id: string;
  seq: number;
  kind: string;
  outcome: string;
  outcome_note: string | null;
  lesson_date: string | null;
  stars_class_id: string | null;
  stars_student_id: string | null;
  processed_at: string;
  received_at: string;
  attempts: number;
  payload: unknown;
  occurred_at: string | null;
  applied_ref: unknown;
}

export type ResultKey = "settle" | "refused" | "waiting" | "applied" | "withdrawn" | "duplicate" | "before_start";

/** In the order that matters to a person: what needs them comes first. */
export const RESULT_ORDER: ResultKey[] = ["settle", "refused", "waiting", "applied", "withdrawn", "duplicate", "before_start"];

export const RESULT_LABEL: Record<ResultKey, string> = {
  settle: "To settle",
  refused: "Refused",
  waiting: "Waiting",
  applied: "Applied",
  withdrawn: "Withdrawn",
  duplicate: "Duplicate",
  before_start: "Before start date",
};

export type KindKey = "attendance" | "points" | "retraction" | "homework" | "grade" | "other";

export const KIND_LABEL: Record<KindKey, string> = {
  attendance: "Register",
  points: "Points",
  retraction: "Withdrawal",
  homework: "Homework",
  grade: "Grade",
  other: "Other",
};

export const CATEGORY_LABEL: Record<string, string> = {
  homework: "Homework",
  participation: "Participation",
  adjustment: "Adjustment",
  reading_theory: "Reading",
  vocabulary_quiz: "Vocabulary",
};

export type WhyKey =
  | "child_unlinked" | "class_unmapped" | "just_linked"
  | "not_enrolled" | "no_lesson" | "not_started" | "teacher" | "paused"
  | "unsupported" | "no_homework"
  | "late" | "over_limit" | "cancelled" | "too_old" | "future" | "unreadable" | "refused_other"
  | "disagree" | "hec_edited";

export const WHY_LABEL: Record<WhyKey, string> = {
  child_unlinked: "Child not linked",
  class_unmapped: "Class not linked",
  just_linked: "Linked, applies next run",
  not_enrolled: "Not enrolled that day",
  no_lesson: "No lesson in HEC",
  not_started: "Lesson not started",
  teacher: "Teacher cannot record",
  paused: "Class paused",
  unsupported: "HEC cannot take it yet",
  no_homework: "Waiting for its homework",
  late: "Over 24 hours late",
  over_limit: "Over a points limit",
  cancelled: "Lesson cancelled",
  too_old: "Over 60 days old",
  future: "Dated in the future",
  unreadable: "Could not be read",
  refused_other: "Refused by HEC",
  disagree: "Apps disagree",
  hec_edited: "Changed in HEC since",
};

/** Where the admin goes to fix it. Null when there is nothing for them to do. */
export type FixKey = "link_child" | "link_class" | "setup" | "settle";

const WHY_FIX: Partial<Record<WhyKey, FixKey>> = {
  child_unlinked: "link_child",
  class_unmapped: "link_class",
  teacher: "setup",
  paused: "setup",
  disagree: "settle",
};

/** Marks a points reason that is homework by any other name. */
const LOOKS_LIKE_HOMEWORK = /\b(hw|homework|home\s*work|btvn|bai\s*tap|baitap|workbook|assignment)\b/;

export interface RecordContext {
  /** Pixel Pal class number -> HEC class name, for those mapped. */
  classes: Map<string, string>;
  /** Pixel Pal child number -> HEC child, for those linked. */
  children: Map<string, { studentId: string; name: string }>;
  /** Pixel Pal's own names, where its roster or a pasted list gave them. */
  pixelPalChildren?: Map<string, string>;
  pixelPalClasses?: Map<string, string>;
}

export interface StarsRecord {
  id: string;
  seq: number;
  kind: KindKey;
  rawKind: string;
  outcome: string;
  result: ResultKey;
  why: WhyKey | null;
  fix: FixKey | null;
  lessonDate: string | null;
  processedAt: string;
  receivedAt: string;
  occurredAt: string | null;
  attempts: number;

  classRef: string | null;
  className: string;
  classLinked: boolean;

  childRef: string | null;
  /** The name to show: HEC's when linked, otherwise Pixel Pal's. */
  childName: string;
  /** The name Pixel Pal uses, where it is known. */
  pixelPalName: string | null;
  childLinked: boolean;
  studentId: string | null;

  /** "Absent", "+5 homework: workbook", "Withdrew a record". */
  what: string;
  status: string | null;
  points: number | null;
  category: string | null;
  reason: string | null;
  homeworkRef: string | null;
  /** The record this one withdraws, for a withdrawal. */
  withdraws: string | null;
  /** Points or a register row about homework, whatever it was filed under. */
  aboutHomework: boolean;
  /** A points award that reads as homework, but did not arrive as homework. */
  homeworkLookalike: boolean;

  /** Why, in words, with the child's name instead of their number. */
  note: string;
  payload: unknown;
  appliedRef: unknown;
  /** Everything folded into one string for searching. */
  haystack: string;
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function resultOf(outcome: string): ResultKey {
  switch (outcome) {
    case "applied": return "applied";
    case "conflict": return "settle";
    case "retracted": return "withdrawn";
    case "rejected": return "refused";
    case "duplicate": return "duplicate";
    case "skipped_before_start": return "before_start";
    default: return "waiting";
  }
}

export function kindOf(kind: string): KindKey {
  return kind === "attendance" || kind === "points" || kind === "retraction" || kind === "homework" || kind === "grade"
    ? kind
    : "other";
}

function whyOf(outcome: string, note: string, classLinked: boolean, childLinked: boolean): WhyKey | null {
  switch (outcome) {
    case "skipped_unmapped":
      // The engine's note says which it was when the record last ran. What
      // is true now decides: an admin may have linked it since.
      if (/ class /.test(note) && / not mapped/.test(note)) return classLinked ? "just_linked" : "class_unmapped";
      return childLinked ? "just_linked" : "child_unlinked";
    case "skipped_not_enrolled": return "not_enrolled";
    case "skipped_no_session": return "no_lesson";
    case "skipped_not_permitted": return /has not started/.test(note) ? "not_started" : "teacher";
    case "skipped_disabled": return "paused";
    case "skipped_unsupported": return "unsupported";
    case "skipped_no_homework": return "no_homework";
    case "conflict": return "disagree";
    case "rejected":
      if (/24 hours/.test(note)) return "late";
      if (/limit/.test(note)) return "over_limit";
      if (/cancelled/.test(note)) return "cancelled";
      if (/60 days/.test(note)) return "too_old";
      if (/in the future/.test(note)) return "future";
      if (/not an? |missing|does not name|without a valid|Withdrawing a withdrawal|never received/.test(note)) return "unreadable";
      if (/(edited|changed) in HEC/.test(note)) return "hec_edited";
      return "refused_other";
    default:
      return null;
  }
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function describeWhat(kind: KindKey, rawKind: string, payload: Record<string, unknown>): string {
  switch (kind) {
    case "attendance":
      return asText(payload.status) ?? "A register mark";
    case "points": {
      const points = asNumber(payload.points);
      const category = asText(payload.category);
      const label = category ? (CATEGORY_LABEL[category] ?? category).toLowerCase() : "points";
      const reason = asText(payload.reason);
      const amount = points === null ? "Points" : `${signed(points)} ${label}`;
      return reason ? `${amount}: ${reason}` : amount;
    }
    case "retraction": {
      const reason = asText(payload.reason);
      if (reason === "changed") return "Withdrew a record: changed in Pixel Pal";
      if (reason === "removed") return "Withdrew a record: removed in Pixel Pal";
      return "Withdrew a record";
    }
    case "homework": {
      const title = asText(payload.title) ?? "Untitled homework";
      return title;
    }
    case "grade": {
      const grade = asText(payload.grade);
      const points = asNumber(payload.points);
      return [grade ? `Grade ${grade}` : "A grade", points === null ? null : `${signed(points)} points`]
        .filter(Boolean).join(", ");
    }
    default:
      return `A "${rawKind}" record`;
  }
}

/** The child's own name wherever the engine wrote their number. */
function describeNote(row: StarsEventRow, why: WhyKey | null, childName: string, className: string): string {
  const raw = row.outcome_note ?? "";
  switch (why) {
    case "child_unlinked":
      return `${childName} is not linked to a child in HEC yet.`;
    case "class_unmapped":
      return `${className} is not linked to a class in HEC yet.`;
    case "just_linked":
      return "Linked now. This applies on the next run.";
    case "unsupported":
      return `HEC does not take "${row.kind}" records yet. It is kept, and applies once it does.`;
    case "no_homework":
      return "Waiting for the homework this grade belongs to.";
    default:
      return raw;
  }
}

export function toRecord(row: StarsEventRow, ctx: RecordContext): StarsRecord {
  const payload = asObject(row.payload);
  const kind = kindOf(row.kind);
  const result = resultOf(row.outcome);

  const classRef = row.stars_class_id;
  const hecClass = classRef ? ctx.classes.get(classRef) : undefined;
  const pixelPalClass = classRef ? ctx.pixelPalClasses?.get(classRef) : undefined;
  const className = hecClass ?? (pixelPalClass ? `${pixelPalClass} (Pixel Pal)` : classRef ? `Pixel Pal class no. ${classRef}` : "—");

  const childRef = row.stars_student_id;
  const linked = childRef ? ctx.children.get(childRef) : undefined;
  const pixelPalName = childRef ? ctx.pixelPalChildren?.get(childRef) ?? null : null;
  const childName = linked?.name ?? pixelPalName ?? (childRef ? `Pixel Pal child no. ${childRef}` : "—");

  const note = row.outcome_note ?? "";
  const why = whyOf(row.outcome, note, Boolean(hecClass), Boolean(linked));
  const fix = why ? WHY_FIX[why] ?? null : null;

  const status = kind === "attendance" ? asText(payload.status) : null;
  const points = asNumber(payload.points);
  const category = kind === "points" ? asText(payload.category) : null;
  const reason = asText(payload.reason);
  const what = describeWhat(kind, row.kind, payload);
  const homeworkLookalike = kind === "points" && category !== "homework"
    && LOOKS_LIKE_HOMEWORK.test(foldText(reason));
  const aboutHomework = kind === "homework" || kind === "grade" || category === "homework" || homeworkLookalike;
  const words = describeNote(row, why, childName, className);

  return {
    id: row.event_id,
    seq: row.seq,
    kind,
    rawKind: row.kind,
    outcome: row.outcome,
    result,
    why,
    fix,
    lessonDate: row.lesson_date,
    processedAt: row.processed_at,
    receivedAt: row.received_at,
    occurredAt: row.occurred_at,
    attempts: row.attempts,
    classRef,
    className,
    classLinked: Boolean(hecClass),
    childRef,
    childName,
    pixelPalName,
    childLinked: Boolean(linked),
    studentId: linked?.studentId ?? null,
    what,
    status,
    points,
    category,
    reason,
    homeworkRef: asText(payload.homework_ref),
    withdraws: kind === "retraction" ? asText(payload.retracts_event_id) : null,
    aboutHomework,
    homeworkLookalike,
    note: words,
    payload: row.payload,
    appliedRef: row.applied_ref,
    haystack: foldText([childName, pixelPalName, childRef, className, classRef, what, words, RESULT_LABEL[result], KIND_LABEL[kind], row.seq]
      .filter((part) => part !== null && part !== undefined).join(" ")),
  };
}

/**
 * The log, read. A withdrawal often names no child of its own, so it takes
 * them from the record it withdraws; and a grade takes its homework's title.
 */
export function toRecords(rows: StarsEventRow[], ctx: RecordContext): StarsRecord[] {
  const records = rows.map((row) => toRecord(row, ctx));
  const byId = new Map(records.map((r) => [r.id, r]));
  const homeworkTitles = new Map<string, string>();
  for (const r of records) {
    if (r.kind === "homework" && r.homeworkRef) homeworkTitles.set(r.homeworkRef, r.what);
  }
  return records.map((r) => {
    if (r.kind === "retraction" && r.withdraws) {
      const target = byId.get(r.withdraws);
      if (target && !r.childRef) {
        return {
          ...r,
          childRef: target.childRef,
          childName: target.childName,
          pixelPalName: target.pixelPalName,
          childLinked: target.childLinked,
          studentId: target.studentId,
          classRef: r.classRef ?? target.classRef,
          className: r.classRef ? r.className : target.className,
          classLinked: r.classRef ? r.classLinked : target.classLinked,
          lessonDate: r.lessonDate ?? target.lessonDate,
          haystack: `${r.haystack} ${foldText(target.childName)}`,
        };
      }
    }
    if (r.kind === "grade" && r.homeworkRef && homeworkTitles.has(r.homeworkRef)) {
      const what = `${r.what} on ${homeworkTitles.get(r.homeworkRef)}`;
      return { ...r, what, haystack: `${r.haystack} ${foldText(what)}` };
    }
    return r;
  });
}

/* ------------------------------------------------------------- the view */

export type SortKey = "lesson" | "child" | "class" | "what" | "result" | "why" | "processed" | "tries" | "seq";
export type GroupKey = "none" | "child" | "class" | "lesson" | "result" | "kind" | "why";
export type ColumnKey = "lesson" | "child" | "class" | "what" | "result" | "why" | "processed" | "tries" | "seq";
export type Density = "comfortable" | "compact";

export const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "lesson", label: "Lesson" },
  { key: "child", label: "Child" },
  { key: "class", label: "Class" },
  { key: "what", label: "What it says" },
  { key: "result", label: "Result" },
  { key: "why", label: "Why" },
  { key: "processed", label: "Last looked at" },
  { key: "tries", label: "Tries" },
  { key: "seq", label: "Record no." },
];

export const DEFAULT_COLUMNS: ColumnKey[] = ["lesson", "child", "class", "what", "result", "why"];

export interface RecordsView {
  search: string;
  results: ResultKey[];
  kinds: KindKey[];
  classes: string[];
  children: string[];
  whys: WhyKey[];
  categories: string[];
  from: string | null;
  to: string | null;
  homeworkOnly: boolean;
  sort: SortKey;
  descending: boolean;
  groupBy: GroupKey;
  columns: ColumnKey[];
  density: Density;
  pageSize: number;
}

export const BLANK_VIEW: RecordsView = {
  search: "",
  results: [],
  kinds: [],
  classes: [],
  children: [],
  whys: [],
  categories: [],
  from: null,
  to: null,
  homeworkOnly: false,
  sort: "lesson",
  descending: true,
  groupBy: "none",
  columns: DEFAULT_COLUMNS,
  density: "comfortable",
  pageSize: 50,
};

/** A view read back from storage may be from an older version of this page. */
export function reviveView(value: unknown): RecordsView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const merged = { ...BLANK_VIEW, ...(value as Partial<RecordsView>) };
  const lists: (keyof RecordsView)[] = ["results", "kinds", "classes", "children", "whys", "categories", "columns"];
  for (const key of lists) {
    if (!Array.isArray(merged[key])) return null;
  }
  if (!ALL_COLUMNS.some((c) => (merged.columns as ColumnKey[]).includes(c.key))) merged.columns = DEFAULT_COLUMNS;
  if (![25, 50, 100, 200].includes(merged.pageSize)) merged.pageSize = 50;
  return merged;
}

export interface ViewPreset {
  key: string;
  label: string;
  description: string;
  /** Today's date goes in, so "this week" stays this week. */
  build: (today: string) => Partial<RecordsView>;
}

function startOfWeek(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Filters only: picking a preset keeps the columns and density someone chose. */
export const VIEW_PRESETS: ViewPreset[] = [
  {
    key: "attention",
    label: "Needs attention",
    description: "Anything waiting, refused or to settle.",
    build: () => ({ results: ["settle", "refused", "waiting"], sort: "lesson", descending: true, groupBy: "none" }),
  },
  {
    key: "by_child",
    label: "By child",
    description: "What is stuck, child by child.",
    build: () => ({ results: ["settle", "refused", "waiting"], sort: "lesson", descending: true, groupBy: "child" }),
  },
  {
    key: "why",
    label: "By reason",
    description: "Everything stuck, by what is stopping it.",
    build: () => ({ results: ["settle", "refused", "waiting"], sort: "lesson", descending: true, groupBy: "why" }),
  },
  {
    key: "today",
    label: "Today",
    description: "Every record for today's lessons.",
    build: (today) => ({ from: today, to: today, sort: "class", descending: false, groupBy: "class" }),
  },
  {
    key: "week",
    label: "This week",
    description: "This week's lessons, day by day.",
    build: (today) => ({ from: startOfWeek(today), to: today, sort: "lesson", descending: true, groupBy: "lesson" }),
  },
  {
    key: "register",
    label: "Register",
    description: "Register marks only.",
    build: () => ({ kinds: ["attendance"], sort: "lesson", descending: true, groupBy: "none" }),
  },
  {
    key: "points",
    label: "Points",
    description: "Point awards only.",
    build: () => ({ kinds: ["points"], sort: "lesson", descending: true, groupBy: "none" }),
  },
  {
    key: "homework",
    label: "Homework",
    description: "Homework, grades, and awards that read as homework.",
    build: () => ({ homeworkOnly: true, sort: "lesson", descending: true, groupBy: "none" }),
  },
  {
    key: "all",
    label: "Everything",
    description: "All records, newest first.",
    build: () => ({ sort: "seq", descending: true, groupBy: "none" }),
  },
];

const EMPTY_FILTERS: Partial<RecordsView> = {
  search: "",
  results: [],
  kinds: [],
  classes: [],
  children: [],
  whys: [],
  categories: [],
  from: null,
  to: null,
  homeworkOnly: false,
};

/** A preset's filters on a clean slate, keeping how the person likes it laid out. */
export function applyPreset(view: RecordsView, preset: ViewPreset, today: string): RecordsView {
  return { ...view, ...EMPTY_FILTERS, ...preset.build(today) };
}

/** Does this view say exactly what this preset says? */
export function viewMatchesPreset(view: RecordsView, preset: ViewPreset, today: string): boolean {
  const expected = applyPreset(view, preset, today);
  return JSON.stringify(expected) === JSON.stringify(view);
}

export function clearFilters(view: RecordsView): RecordsView {
  return { ...view, ...EMPTY_FILTERS };
}

export function countActiveFilters(view: RecordsView): number {
  return (view.search.trim() ? 1 : 0)
    + (view.results.length > 0 ? 1 : 0)
    + (view.kinds.length > 0 ? 1 : 0)
    + (view.classes.length > 0 ? 1 : 0)
    + (view.children.length > 0 ? 1 : 0)
    + (view.whys.length > 0 ? 1 : 0)
    + (view.categories.length > 0 ? 1 : 0)
    + (view.from || view.to ? 1 : 0)
    + (view.homeworkOnly ? 1 : 0);
}

/** Records with a child use their number; those with none share one bucket. */
export const NO_CHILD = "__none__";
export const childKey = (r: StarsRecord) => r.childRef ?? NO_CHILD;
export const classKey = (r: StarsRecord) => r.classRef ?? NO_CHILD;

type Facet = "results" | "kinds" | "classes" | "children" | "whys" | "categories";

function passes(r: StarsRecord, v: RecordsView, skip?: Facet): boolean {
  if (skip !== "results" && v.results.length > 0 && !v.results.includes(r.result)) return false;
  if (skip !== "kinds" && v.kinds.length > 0 && !v.kinds.includes(r.kind)) return false;
  if (skip !== "classes" && v.classes.length > 0 && !v.classes.includes(classKey(r))) return false;
  if (skip !== "children" && v.children.length > 0 && !v.children.includes(childKey(r))) return false;
  if (skip !== "whys" && v.whys.length > 0 && (!r.why || !v.whys.includes(r.why))) return false;
  if (skip !== "categories" && v.categories.length > 0 && (!r.category || !v.categories.includes(r.category))) return false;
  if (v.homeworkOnly && !r.aboutHomework) return false;
  if (v.from && (!r.lessonDate || r.lessonDate < v.from)) return false;
  if (v.to && (!r.lessonDate || r.lessonDate > v.to)) return false;
  const query = foldText(v.search);
  if (query && !query.split(/\s+/).every((word) => r.haystack.includes(word))) return false;
  return true;
}

export function filterRecords(records: StarsRecord[], view: RecordsView): StarsRecord[] {
  return records.filter((r) => passes(r, view));
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  /** A second line, such as a child's Pixel Pal number. */
  sublabel?: string;
}

export interface Facets {
  results: FacetOption[];
  kinds: FacetOption[];
  classes: FacetOption[];
  children: FacetOption[];
  whys: FacetOption[];
  categories: FacetOption[];
}

/**
 * What each filter can offer and how many each option would show, given
 * every OTHER filter. Ticking "Waiting" does not make "Refused" read 0.
 */
export function computeFacets(records: StarsRecord[], view: RecordsView): Facets {
  const tally = (
    facet: Facet,
    keyOf: (r: StarsRecord) => string | null,
    labelOf: (r: StarsRecord, key: string) => string,
    sublabelOf?: (r: StarsRecord) => string | undefined,
  ): FacetOption[] => {
    const found = new Map<string, FacetOption>();
    for (const r of records) {
      if (!passes(r, view, facet)) continue;
      const key = keyOf(r);
      if (key === null) continue;
      const held = found.get(key);
      if (held) held.count += 1;
      else found.set(key, { value: key, label: labelOf(r, key), count: 1, sublabel: sublabelOf?.(r) });
    }
    // Something ticked stays on the list even when it now matches nothing,
    // or it could not be unticked.
    const selected = view[facet] as string[];
    for (const key of selected) {
      if (found.has(key)) continue;
      const example = records.find((r) => keyOf(r) === key);
      found.set(key, {
        value: key,
        label: example ? labelOf(example, key) : key,
        count: 0,
        sublabel: example ? sublabelOf?.(example) : undefined,
      });
    }
    return [...found.values()];
  };

  const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label);
  const byOrder = <T extends string>(order: readonly T[]) => (a: FacetOption, b: FacetOption) =>
    order.indexOf(a.value as T) - order.indexOf(b.value as T);

  return {
    results: tally("results", (r) => r.result, (r) => RESULT_LABEL[r.result]).sort(byOrder(RESULT_ORDER)),
    kinds: tally("kinds", (r) => r.kind, (r) => KIND_LABEL[r.kind]).sort(byCount),
    classes: tally("classes", classKey, (r) => r.className).sort((a, b) => a.label.localeCompare(b.label)),
    children: tally("children", childKey, (r) => r.childName, (r) => {
      if (!r.childRef) return undefined;
      return r.childLinked ? `Pixel Pal no. ${r.childRef}` : `Pixel Pal no. ${r.childRef} · not linked`;
    }).sort((a, b) => a.label.localeCompare(b.label)),
    whys: tally("whys", (r) => r.why, (r) => (r.why ? WHY_LABEL[r.why] : "")).sort(byCount),
    categories: tally("categories", (r) => r.category, (r) => (r.category ? CATEGORY_LABEL[r.category] ?? r.category : ""))
      .sort(byCount),
  };
}

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

function compareBy(sort: SortKey, a: StarsRecord, b: StarsRecord): number {
  switch (sort) {
    case "lesson": return (a.lessonDate ?? "").localeCompare(b.lessonDate ?? "");
    case "child": return compareText(a.childName, b.childName);
    case "class": return compareText(a.className, b.className);
    case "what": return compareText(a.what, b.what);
    case "result": return RESULT_ORDER.indexOf(a.result) - RESULT_ORDER.indexOf(b.result);
    case "why": return compareText(a.why ? WHY_LABEL[a.why] : "", b.why ? WHY_LABEL[b.why] : "");
    case "processed": return a.processedAt.localeCompare(b.processedAt);
    case "tries": return a.attempts - b.attempts;
    case "seq": return a.seq - b.seq;
  }
}

export function sortRecords(records: StarsRecord[], sort: SortKey, descending: boolean): StarsRecord[] {
  const direction = descending ? -1 : 1;
  return [...records].sort((a, b) =>
    direction * compareBy(sort, a, b)
    // Newest record first among equals, so a sort is stable between loads.
    || b.seq - a.seq);
}

export interface RecordGroup {
  key: string;
  label: string;
  sublabel: string | null;
  records: StarsRecord[];
  counts: Partial<Record<ResultKey, number>>;
  /** Points on records that have actually been applied. */
  appliedPoints: number;
  /** Points still held up. */
  waitingPoints: number;
  /** Set when the whole group has one thing to fix. */
  linkChild: string | null;
}

export function groupRecords(records: StarsRecord[], groupBy: GroupKey, descending: boolean): RecordGroup[] {
  if (groupBy === "none") return [];
  const keyOf = (r: StarsRecord): string => {
    switch (groupBy) {
      case "child": return childKey(r);
      case "class": return classKey(r);
      case "lesson": return r.lessonDate ?? "";
      case "result": return r.result;
      case "kind": return r.kind;
      case "why": return r.why ?? "";
      default: return "";
    }
  };
  const labelOf = (r: StarsRecord): string => {
    switch (groupBy) {
      case "child": return r.childName;
      case "class": return r.className;
      case "lesson": return r.lessonDate ?? "No date";
      case "result": return RESULT_LABEL[r.result];
      case "kind": return KIND_LABEL[r.kind];
      case "why": return r.why ? WHY_LABEL[r.why] : "Nothing stuck";
      default: return "";
    }
  };

  const groups = new Map<string, RecordGroup>();
  for (const r of records) {
    const key = keyOf(r);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: labelOf(r),
        sublabel: groupBy === "child" && r.childRef
          ? (r.childLinked ? `Pixel Pal no. ${r.childRef}` : `Pixel Pal no. ${r.childRef} · not linked`)
          : null,
        records: [],
        counts: {},
        appliedPoints: 0,
        waitingPoints: 0,
        linkChild: groupBy === "child" && r.childRef && !r.childLinked ? r.childRef : null,
      };
      groups.set(key, group);
    }
    group.records.push(r);
    group.counts[r.result] = (group.counts[r.result] ?? 0) + 1;
    if (r.kind === "points" && r.points !== null) {
      if (r.result === "applied") group.appliedPoints += r.points;
      if (r.result === "waiting") group.waitingPoints += r.points;
    }
  }

  const list = [...groups.values()];
  if (groupBy === "lesson") {
    return list.sort((a, b) => (descending ? -1 : 1) * a.key.localeCompare(b.key));
  }
  if (groupBy === "result") {
    return list.sort((a, b) => RESULT_ORDER.indexOf(a.key as ResultKey) - RESULT_ORDER.indexOf(b.key as ResultKey));
  }
  if (groupBy === "child" || groupBy === "class") {
    // Whoever needs the most attention comes first, then by name.
    const stuck = (g: RecordGroup) => (g.counts.waiting ?? 0) + (g.counts.refused ?? 0) + (g.counts.settle ?? 0);
    return list.sort((a, b) => stuck(b) - stuck(a) || compareText(a.label, b.label));
  }
  return list.sort((a, b) => b.records.length - a.records.length || compareText(a.label, b.label));
}

export type ResultCounts = Record<ResultKey, number>;

export function countResults(records: StarsRecord[]): ResultCounts {
  const counts: ResultCounts = { settle: 0, refused: 0, waiting: 0, applied: 0, withdrawn: 0, duplicate: 0, before_start: 0 };
  for (const r of records) counts[r.result] += 1;
  return counts;
}

export interface Blocker {
  key: string;
  why: WhyKey;
  fix: FixKey | null;
  count: number;
  points: number;
  /** "Bin (Pixel Pal no. 121) is not linked", in words. */
  headline: string;
  childRef: string | null;
  classRef: string | null;
}

/**
 * What is holding the most records up, biggest first, so the screen can
 * lead with "link this one child and 40 records apply".
 */
export function findBlockers(records: StarsRecord[]): Blocker[] {
  const blockers = new Map<string, Blocker>();
  for (const r of records) {
    if (!r.why || r.result === "applied" || r.result === "withdrawn" || r.result === "duplicate") continue;
    // Not something a person can act on again.
    if (r.why === "just_linked" || r.why === "not_started") continue;

    let key: string = r.why;
    let headline: string = WHY_LABEL[r.why];
    let childRef: string | null = null;
    let classRef: string | null = null;

    if (r.why === "child_unlinked" && r.childRef) {
      key = `child:${r.childRef}`;
      childRef = r.childRef;
      headline = r.pixelPalName
        ? `${r.pixelPalName} (Pixel Pal no. ${r.childRef}) is not linked`
        : `Pixel Pal child no. ${r.childRef} is not linked`;
    } else if (r.why === "class_unmapped" && r.classRef) {
      key = `class:${r.classRef}`;
      classRef = r.classRef;
      headline = `${r.className} is not linked to a class in HEC`;
    } else if (r.why === "not_enrolled" && r.childRef) {
      key = `enrol:${r.childRef}:${r.classRef}`;
      childRef = r.childRef;
      classRef = r.classRef;
      headline = `${r.childName} is not enrolled in ${r.className} on some lesson days`;
    } else if (r.why === "no_lesson" && r.classRef) {
      key = `lesson:${r.classRef}`;
      classRef = r.classRef;
      headline = `${r.className} has Pixel Pal records on days with no lesson in HEC`;
    } else if (r.why === "unsupported") {
      key = `kind:${r.rawKind}`;
      headline = `HEC does not take "${r.rawKind}" records yet`;
    }

    const held = blockers.get(key);
    const points = r.kind === "points" && r.points ? r.points : 0;
    if (held) {
      held.count += 1;
      held.points += points;
    } else {
      blockers.set(key, { key, why: r.why, fix: r.fix, count: 1, points, headline, childRef, classRef });
    }
  }
  // On a tie, what somebody can fix from here comes first.
  return [...blockers.values()].sort((a, b) =>
    b.count - a.count
    || (a.fix ? 0 : 1) - (b.fix ? 0 : 1)
    || a.headline.localeCompare(b.headline));
}
