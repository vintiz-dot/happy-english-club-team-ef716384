// Class plays: short scripts tied to a unit's words and grammar, performed as an
// EXTENSION of a lesson (the Plays tab), never inside the lesson's own minutes.
// Imports nothing (scripts/pgtest/lesson-plays.test.mjs loads it on its own).
//
// Why plays, and how they are built (docs/CLASS_PLAYS.md, research 25 Nov 2026):
// play works for language when it is GUIDED (a teacher-set language target, not
// free play), when actions MATCH the meaning (embodied learning), and when the same
// language is said again on SPACED occasions with a short teacher fix between
// rounds (task repetition: massed repeats slow speech and breed parroting). So a
// play is rehearsed in rounds that move from script to key words to own words, and
// performed again in a later lesson.
//
// A play is written ONCE for any class size. castPlay(play, n) fits it to the
// children in the room now:
//   - roles without `optional` are always cast; with fewer children than those,
//     children double up (one child reads two parts);
//   - optional roles are cast in the order listed while children remain; an uncast
//     optional role either gives its lines to another role (`give`) or is cut;
//   - group roles ("Bees", max 4) take the children still left: "Bee 1", "Bee 2",
//     each with their own lines in turn, and lines marked `all` said together;
//   - `everyone` lines are the whole cast's refrain.
// Text may name a role as {@id}: it reads as whoever says that role's lines now,
// so "Thank you, {@owl}!" stays right when the Owl's lines went to the Narrator.
// Children's names are put on the parts on screen and on paper only; nothing about
// a child is saved with a play.

export type PlayCourse = "oxford-discover-2e" | "reach-higher" | "hec-ielts-sl" | "look";
/** The age band a play is written for (the class's real grades, not the book's). */
export type AgeBand = "6-8" | "7-9" | "8-12" | "13-16";

export type PlayRole = {
  id: string; // "fox" ([a-z][a-z0-9-]*)
  name: string; // "Fox"
  who?: string; // a casting hint for the teacher: "a confident reader", "few lines"
  // Absent: always cast. `give`: when no child is left for it, its lines go to that
  // role. `cut`: when no child is left for it, its lines are left out.
  optional?: { give: string } | { cut: true };
  // Several children can share it ("Bee 1", "Bee 2"), up to max.
  group?: { max: number };
};

export type PlayLine =
  | { role: string; text: string; do?: string; all?: boolean } // do: the action that shows the meaning
  | { stage: string } // a stage direction, read by nobody
  | { everyone: string; do?: string }; // the whole cast together

export type PlayScene = { title: string; lines: PlayLine[] };

export type Play = {
  id: string; // "od2e-l1-u10-p1"
  course: PlayCourse;
  level: number;
  unit: number;
  afterLesson: number; // the lesson it extends (performed at its end, or the next lesson)
  title: string;
  minutes: number; // the extension, rehearsal and performance together
  band: AgeBand;
  summary: string; // one or two sentences for the teacher and the cast list
  targets: { words: string[]; grammar: string[] }; // the unit's own words and patterns the script carries
  roles: PlayRole[];
  scenes: PlayScene[];
  // Rehearsal rounds, in order (script -> key words -> own words), each timed.
  rehearsal: { round: string; minutes: number; how: string }[];
  focusOnForm: string[]; // the teacher's one-minute fixes between rounds (teacher only)
  props?: string[];
  teacherNote?: string; // teacher only
  encore?: string; // how to perform it again in a later lesson (spaced repetition)
};

// ---------------------------------------------------------------- casting

export type CastPart = { key: string; label: string; role: string; actor: number };
export type CastLine =
  | { kind: "line"; labels: string[]; actors: number[]; text: string; do?: string; together: boolean }
  | { kind: "stage"; text: string };
export type CastScene = { title: string; lines: CastLine[] };
export type Cast = {
  actors: number; // children cast
  parts: CastPart[];
  byActor: { actor: number; parts: string[]; lines: number }[];
  scenes: CastScene[];
  merged: { from: string; into: string }[]; // role names whose lines went to another part
  cut: string[]; // role names left out
  doubled: boolean; // fewer children than the always-cast roles
  minCast: number; // children needed for every always-cast role to have its own child
  maxCast: number; // children the play can give a part of their own
};

/** How many children can each have a part of their own (every role, every group full). */
export function maxCast(play: Play): number {
  return play.roles.reduce((n, r) => n + (r.group ? r.group.max : 1), 0);
}
export function minCast(play: Play): number {
  return play.roles.filter((r) => !r.optional).length;
}

/** The play fitted to n children. Pure: same play and n, same cast. */
export function castPlay(play: Play, nIn: number): Cast {
  const n = Math.max(1, Math.floor(Number.isFinite(nIn) ? nIn : 1));
  const byId = new Map(play.roles.map((r) => [r.id, r]));
  const required = play.roles.filter((r) => !r.optional);
  const optional = play.roles.filter((r) => r.optional);
  const doubled = n < required.length;
  const castRoles = doubled ? required : [...required, ...optional.slice(0, n - required.length)];
  const isCast = new Set(castRoles.map((r) => r.id));

  // Where an uncast role's lines go (null = cut).
  const resolve = (id: string): string | null => {
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur && !seen.has(cur)) {
      if (isCast.has(cur)) return cur;
      seen.add(cur);
      const r = byId.get(cur);
      if (!r || !r.optional || "cut" in r.optional) return null;
      cur = r.optional.give;
    }
    return null;
  };

  // Group roles take the children still left, round-robin up to each max.
  const members = new Map<string, number>(castRoles.map((r) => [r.id, 1]));
  let spare = doubled ? 0 : n - castRoles.length;
  const groups = castRoles.filter((r) => r.group && r.group.max > 1);
  while (spare > 0 && groups.length) {
    let grew = false;
    for (const g of groups) {
      if (spare === 0) break;
      if ((members.get(g.id) ?? 1) < g.group!.max) { members.set(g.id, (members.get(g.id) ?? 1) + 1); spare--; grew = true; }
    }
    if (!grew) break;
  }
  // Past every group's max: the extra children join the first group anyway (they share its lines).
  if (spare > 0) {
    const g = groups[0] ?? castRoles.find((r) => r.group) ?? castRoles[0];
    members.set(g.id, (members.get(g.id) ?? 1) + spare);
    spare = 0;
  }

  // Doubling up: the role with the most lines first, each to the child with the fewest so far.
  const owner = new Map<string, number>();
  if (doubled) {
    const weight = new Map<string, number>();
    for (const sc of play.scenes) for (const l of sc.lines) if ("role" in l) { const to = resolve(l.role); if (to) weight.set(to, (weight.get(to) ?? 0) + 1); }
    const load = Array.from({ length: n }, () => 0);
    for (const r of [...castRoles].sort((a, b) => (weight.get(b.id) ?? 0) - (weight.get(a.id) ?? 0))) {
      const a = load.indexOf(Math.min(...load));
      owner.set(r.id, a);
      load[a] += weight.get(r.id) ?? 0;
    }
  }

  const parts: CastPart[] = [];
  const partsOf = new Map<string, CastPart[]>();
  let next = 0;
  for (const r of castRoles) {
    const k = members.get(r.id) ?? 1;
    const ps: CastPart[] = [];
    for (let m = 0; m < k; m++) {
      const actor = doubled ? owner.get(r.id)! : next;
      next++;
      ps.push({ key: k > 1 ? `${r.id}-${m + 1}` : r.id, label: k > 1 ? `${r.name} ${m + 1}` : r.name, role: r.id, actor });
    }
    parts.push(...ps);
    partsOf.set(r.id, ps);
  }
  const all = [...new Set(parts.map((p) => p.actor))];

  const nameFor = (id: string) => {
    const to = resolve(id);
    return byId.get(to ?? id)?.name ?? id;
  };
  const fill = (t: string) => t.replace(/\{@([a-z][a-z0-9-]*)\}/g, (_, id: string) => nameFor(id));

  const turn = new Map<string, number>();
  const scenes: CastScene[] = play.scenes.map((sc) => ({
    title: fill(sc.title),
    lines: sc.lines.flatMap((l): CastLine[] => {
      if ("stage" in l) return [{ kind: "stage", text: fill(l.stage) }];
      if ("everyone" in l) return [{ kind: "line", labels: ["Everyone"], actors: all, text: fill(l.everyone), do: l.do && fill(l.do), together: true }];
      const to = resolve(l.role);
      if (!to) return [];
      const ps = partsOf.get(to)!;
      const r = byId.get(to)!;
      if (ps.length > 1 && l.all) {
        return [{ kind: "line", labels: [`All ${r.name}s`], actors: ps.map((p) => p.actor), text: fill(l.text), do: l.do && fill(l.do), together: true }];
      }
      const t = turn.get(to) ?? 0;
      turn.set(to, t + 1);
      const p = ps[t % ps.length];
      return [{ kind: "line", labels: [p.label], actors: [p.actor], text: fill(l.text), do: l.do && fill(l.do), together: false }];
    }),
  }));

  const count = new Map<number, number>();
  for (const sc of scenes) for (const l of sc.lines) if (l.kind === "line") for (const a of l.actors) count.set(a, (count.get(a) ?? 0) + 1);
  const byActor = all.sort((a, b) => a - b).map((a) => ({
    actor: a, parts: parts.filter((p) => p.actor === a).map((p) => p.label), lines: count.get(a) ?? 0,
  }));
  const merged = optional.filter((r) => !isCast.has(r.id) && resolve(r.id)).map((r) => ({ from: r.name, into: byId.get(resolve(r.id)!)!.name }));
  const cut = optional.filter((r) => !isCast.has(r.id) && !resolve(r.id)).map((r) => r.name);
  return { actors: all.length, parts, byActor, scenes, merged, cut, doubled, minCast: required.length, maxCast: maxCast(play) };
}

/** The play as the children get it: no fixes, no teacher note. */
export function studentPlay(play: Play): Play {
  const { teacherNote: _t, focusOnForm: _f, ...rest } = play;
  return { ...rest, focusOnForm: [] };
}

// ---------------------------------------------------------------- which plays a class gets

/**
 * The course and level a class's book label names, for plays: the deck courses'
 * labels ("Oxford Discover 2nd edition, Level 1", "Reach Higher, Level 3",
 * "HEC IELTS Speaking & Listening, Year 1") and National Geographic Look ("Look 1",
 * "National Geographic Look, Level 1"), which has plays but no lesson decks.
 */
export function playCourseOf(label: string | null | undefined): { course: PlayCourse; level: number } | null {
  const t = (label ?? "").trim().toLowerCase();
  const m = (re: RegExp) => { const x = re.exec(t); return x ? Number(x[1]) : NaN; };
  let level: number;
  if (!Number.isNaN(level = m(/^oxford discover 2nd edition, level\s*(\d)\s*$/))) return { course: "oxford-discover-2e", level };
  if (!Number.isNaN(level = m(/^reach higher, level\s*(\d)\s*$/))) return { course: "reach-higher", level };
  if (!Number.isNaN(level = m(/^hec ielts speaking & listening, year\s*(\d)\s*$/))) return { course: "hec-ielts-sl", level };
  if (!Number.isNaN(level = m(/^(?:national geographic\s+)?look(?:,?\s*level)?\s*(\d)\s*$/))) return { course: "look", level };
  return null;
}

export function playsFor(plays: Play[], course: PlayCourse, level: number, unit?: number): Play[] {
  return plays
    .filter((p) => p.course === course && p.level === level && (unit === undefined || p.unit === unit))
    .sort((a, b) => a.unit - b.unit || a.afterLesson - b.afterLesson || a.id.localeCompare(b.id));
}

/** "Unit 3" / "Term 2": what a play's unit is called in its course. */
export const unitWord = (c: PlayCourse) => (c === "hec-ielts-sl" ? "Term" : "Unit");
