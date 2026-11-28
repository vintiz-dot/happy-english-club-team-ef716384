/**
 * Admin > Voices (owner, 26 Nov 2026): the numbers behind the lesson monitor's voice step, read
 * into plain statements. It decides nothing about a child and prices nothing. The voiceprints
 * stay on the school laptop; this page sees only counts, rates and each child's SECONDS of voice.
 * Source: lesson_monitor_voice_overview() (20261126090000), whose "snapshot" is what
 * scripts/lesson-monitor/voice_admin.py publish sent.
 *
 * Pure: no imports. Held by scripts/pgtest/voice-admin.test.mjs.
 */

export interface OverviewChild { student_id: string; name: string; status: "granted" | "withdrawn"; recorded_at: string }
export interface OverviewGroups {
  total: number; answered: number; child: number; several: number; teacher: number; unknown: number;
  suggested: number; suggested_answered_child: number; suggested_right: number; learned: number; waiting_to_learn: number;
}
export interface OverviewClass {
  class_id: string; class_name: string | null; groups: number; answered: number;
  suggested_answered_child: number; suggested_right: number; last_lesson: string | null;
}
export interface SweepPoint { threshold: number; named: number; wrong: number }
export interface ModelAccuracy {
  n: number; threshold: number; named_correct: number; named_wrong: number; not_sure: number;
  named_correct_pct: number | null; named_wrong_pct: number | null; not_sure_pct: number | null;
  sweep?: SweepPoint[];
  shown_vs_blind?: Record<string, { n: number; agreed: number; agreed_pct: number | null }>;
}
/** The Lark engine's health part (owner, 28 Nov 2026; 20261128190000, voice_admin.py health). Numbers only. */
export interface Tally { seconds: number; named_s: number; right_s: number; wrong_s: number; precision: number | null; coverage: number | null; wrong_share: number | null }
export interface HealthLesson { date: string | null; at: string | null; tracks: string[]; residual_ms: Record<string, number | null>; rejected: Record<string, string>; processing_s: number }
export interface Health {
  engine?: string; last_run?: string | null; lessons?: HealthLesson[];
  precision?: { basis?: "blind" | "all"; model?: string; chosen?: (Tally & { threshold: number }) | null; buckets?: Record<string, Tally>; best?: string | null; min_precision?: number };
}
export interface Snapshot {
  published_at: string;
  stats: {
    health?: Health;
    accuracy?: Record<string, ModelAccuracy>;
    enrolment?: { student_id: string; seconds: number; samples: number }[];
    settings?: { shown_model?: string; thresholds?: Record<string, number>; margin?: number; group_min_s?: number; enrol_min_s?: number; models?: string[] | null };
  };
}
export interface Overview {
  children: OverviewChild[];
  reports: { total: number; with_voice_groups: number };
  groups: OverviewGroups;
  by_class: OverviewClass[];
  by_week: { week: string; groups: number; answered: number }[];
  snapshot: Snapshot | null;
}

/** The runbook's rules, in one place: a child is compared after 20 s, a minute is better; judge a model on 150+ answers;
 * wrong more than 1 in 50 of those named is too many (owner, 28 Nov 2026: precision first, at least 98 %; was 1 in 20);
 * a mic lined up worse than 12 ms is left out (align.py). */
export const VOICE_RULES = { enrolMinS: 20, enrolGoodS: 60, judgeAfter: 150, fewAnswers: 30, wrongPctLimit: 2, staleHours: 36, residualMsLimit: 12 } as const;

export const pct = (n: number, d: number): number | null => (d > 0 ? Math.round((1000 * n) / d) / 10 : null);
export const showPct = (x: number | null | undefined): string => (x === null || x === undefined ? "–" : `${x.toFixed(1)}%`);

// ------------------------------------------------------------------ the top line
export interface Headline {
  consented: number; withdrawn: number; known: number; reportsWithVoices: number; reportsTotal: number;
  groups: number; answered: number; learned: number; shownRight: number; shownAnswered: number; shownPct: number | null;
}
export function headline(o: Overview): Headline {
  const min = o.snapshot?.stats.settings?.enrol_min_s ?? VOICE_RULES.enrolMinS;
  const secs = new Map((o.snapshot?.stats.enrolment ?? []).map((e) => [e.student_id, e.seconds]));
  const granted = o.children.filter((c) => c.status === "granted");
  return {
    consented: granted.length,
    withdrawn: o.children.length - granted.length,
    known: granted.filter((c) => (secs.get(c.student_id) ?? 0) >= min).length,
    reportsWithVoices: o.reports.with_voice_groups,
    reportsTotal: o.reports.total,
    groups: o.groups.total,
    answered: o.groups.answered,
    learned: o.groups.learned,
    shownRight: o.groups.suggested_right,
    shownAnswered: o.groups.suggested_answered_child,
    shownPct: pct(o.groups.suggested_right, o.groups.suggested_answered_child),
  };
}

// ------------------------------------------------------------------ children
export type ChildState = "withdrawn" | "no-voice" | "learning" | "compared";
export interface ChildRow { id: string; name: string; state: ChildState; seconds: number | null; samples: number; fraction: number; recordedAt: string }
const ORDER: Record<ChildState, number> = { learning: 0, "no-voice": 1, compared: 2, withdrawn: 3 };

/** One row per child with a voiceprint consent record. seconds is null until the laptop has published. */
export function childRows(o: Overview): ChildRow[] {
  const min = o.snapshot?.stats.settings?.enrol_min_s ?? VOICE_RULES.enrolMinS;
  const have = new Map((o.snapshot?.stats.enrolment ?? []).map((e) => [e.student_id, e]));
  const rows = o.children.map((c): ChildRow => {
    const e = have.get(c.student_id);
    const seconds = o.snapshot ? e?.seconds ?? 0 : null;
    const state: ChildState = c.status === "withdrawn" ? "withdrawn"
      : !seconds ? "no-voice" : seconds >= min ? "compared" : "learning";
    return { id: c.student_id, name: c.name, state, seconds, samples: e?.samples ?? 0,
      fraction: seconds ? Math.min(1, seconds / VOICE_RULES.enrolGoodS) : 0, recordedAt: c.recorded_at };
  });
  return rows.sort((a, b) => ORDER[a.state] - ORDER[b.state] || (b.seconds ?? 0) - (a.seconds ?? 0) || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------------ models
export type Verdict = "no-answers" | "too-few" | "too-many-wrong" | "usable";
export interface ModelRow {
  model: string; shown: boolean; n: number; threshold: number;
  right: number | null; wrong: number | null; notSure: number | null; verdict: Verdict; sweep: SweepPoint[];
  /** The lowest swept threshold at which at most 1 in 50 of those named is the wrong child (null: none, or too few). */
  saferThreshold: number | null;
}
const VERDICT_RANK: Record<Verdict, number> = { usable: 0, "too-many-wrong": 1, "too-few": 2, "no-answers": 3 };

export function modelRows(o: Overview): ModelRow[] {
  const acc = o.snapshot?.stats.accuracy ?? {};
  const shown = o.snapshot?.stats.settings?.shown_model ?? "ecapa";
  const rows = Object.entries(acc).map(([model, a]): ModelRow => {
    const sweep = a.sweep ?? [];
    const verdict: Verdict = a.n === 0 ? "no-answers"
      : a.n < VOICE_RULES.fewAnswers ? "too-few"
      : (a.named_wrong_pct ?? 0) > VOICE_RULES.wrongPctLimit ? "too-many-wrong" : "usable";
    const safe = sweep.find((p) => p.named >= 5 && (100 * p.wrong) / p.named <= VOICE_RULES.wrongPctLimit);
    return { model, shown: model === shown, n: a.n, threshold: a.threshold, right: a.named_correct_pct, wrong: a.named_wrong_pct,
      notSure: a.not_sure_pct, verdict, sweep, saferThreshold: a.n >= VOICE_RULES.fewAnswers && safe ? safe.threshold : null };
  });
  return rows.sort((x, y) => VERDICT_RANK[x.verdict] - VERDICT_RANK[y.verdict] || (y.right ?? -1) - (x.right ?? -1) || x.model.localeCompare(y.model));
}

/** Whether the table is ready to pick a model to show (the runbook: after 150 to 200 answered groups). */
export function readyToChoose(o: Overview): { ready: boolean; answers: number; best: string | null } {
  const rows = modelRows(o);
  const answers = rows.reduce((m, r) => Math.max(m, r.n), 0);
  const usable = rows.filter((r) => r.verdict === "usable");
  const best = usable.length ? usable.reduce((b, r) => ((r.right ?? 0) > (b.right ?? 0) ? r : b)).model : null;
  return { ready: answers >= VOICE_RULES.judgeAfter && best !== null, answers, best };
}

// ------------------------------------------------------------------ the Lark engine's health
export interface HealthView {
  engine: string | null; lastRun: string | null;
  lessons: { date: string | null; tracks: string[]; residuals: { mic: string; ms: number | null; rejected: string | null; bad: boolean }[]; minutes: number }[];
  precision: { basis: "blind" | "all" | null; model: string | null; threshold: number | null; precisionPct: number | null; coveragePct: number | null;
    meetsTarget: boolean; buckets: { label: string; seconds: number; precisionPct: number | null; coveragePct: number | null }[] } | null;
}
const pct1 = (x: number | null | undefined): number | null => (x === null || x === undefined ? null : Math.round(1000 * x) / 10);

/** What the health part says, read for the page. null when the laptop/server has not published one yet. */
export function healthView(o: Overview): HealthView | null {
  const h = o.snapshot?.stats.health;
  if (!h) return null;
  const lessons = (h.lessons ?? []).map((l) => {
    const mics = Array.from(new Set([...Object.keys(l.residual_ms ?? {}), ...Object.keys(l.rejected ?? {})])).sort();
    return {
      date: l.date, tracks: l.tracks ?? [], minutes: Math.round((l.processing_s ?? 0) / 6) / 10,
      residuals: mics.map((mic) => {
        const ms = l.residual_ms?.[mic] ?? null;
        const rejected = l.rejected?.[mic] ?? null;
        return { mic, ms, rejected, bad: rejected !== null || (ms !== null && ms > VOICE_RULES.residualMsLimit) };
      }),
    };
  });
  const p = h.precision;
  const c = p?.chosen ?? null;
  const precisionPct = pct1(c?.precision);
  return {
    engine: h.engine ?? null, lastRun: h.last_run ?? null, lessons,
    precision: p ? {
      basis: p.basis ?? null, model: p.model ?? null, threshold: c?.threshold ?? null, precisionPct, coveragePct: pct1(c?.coverage),
      meetsTarget: precisionPct !== null && precisionPct >= 100 - VOICE_RULES.wrongPctLimit,
      buckets: Object.entries(p.buckets ?? {}).map(([label, b]) => ({ label, seconds: b.seconds, precisionPct: pct1(b.precision), coveragePct: pct1(b.coverage) })),
    } : null,
  };
}

// ------------------------------------------------------------------ the snapshot's age
export function snapshotAge(o: Overview, now: Date): { hours: number | null; stale: boolean } {
  if (!o.snapshot) return { hours: null, stale: true };
  const hours = Math.max(0, (now.getTime() - new Date(o.snapshot.published_at).getTime()) / 3_600_000);
  return { hours, stale: hours > VOICE_RULES.staleHours };
}

// ------------------------------------------------------------------ what to do next
export interface Step { done: boolean; text: string }
/** Where the voice step stands, as a short list in the order things must happen. */
export function nextSteps(o: Overview): Step[] {
  const h = headline(o);
  const taught = o.snapshot?.stats.enrolment?.some((e) => e.seconds > 0) ?? false;
  return [
    { done: h.consented > 0, text: "Record each class's voiceprint consent (only with the signed line for every child)." },
    { done: !!o.snapshot, text: "The laptop publishes its numbers (voice_admin.py publish, or one overnight run)." },
    { done: taught, text: "Teach the laptop each child's voice: tap Who's speaking in a recorded lesson, about a minute per child." },
    { done: h.reportsWithVoices > 0, text: "Run the overnight job on a lesson that was recorded after the voice code was installed." },
    { done: h.answered > 0, text: "Teachers answer the voice groups on the lesson monitor report (Yes, another child, Several, Me)." },
    { done: readyToChoose(o).answers >= VOICE_RULES.judgeAfter, text: `About ${VOICE_RULES.judgeAfter} answered groups, then compare the models and pick the one to show.` },
  ];
}
