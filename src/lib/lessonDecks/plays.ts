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
//     children double up: one child reads two parts that never speak one after
//     the other, and when every child is in a part's conversation the teacher
//     reads it, so no child ever asks a question and answers it themself;
//   - each further child goes where it lightens the heaviest part most: the next
//     optional role (cast in the order listed) or one more member of a group role
//     ("Bees", max 4: "Bee 1", "Bee 2", each with their own lines in turn, and lines
//     marked `all` said together); an uncast optional role either gives its lines
//     to another role (`give`) or is cut;
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
  // Always the teacher's part (the Narrator for the youngest classes): no child is
  // cast in it and it counts for no child. Never optional, never a group.
  teacher?: boolean;
};

export type PlayLine =
  // do: the action that shows the meaning. member (a group role's line, 1-based): this
  // line goes to that member, so the child who names a prop is the one who gets it
  // back; with fewer members it wraps (member 3 of 2 is member 1). Unpinned lines rotate.
  | { role: string; text: string; do?: string; all?: boolean; member?: number }
  | { stage: string; if?: string } // a stage direction, read by nobody; with `if`, only when that role is cast
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
  // as: the part a merged line really belongs to ("Mom Crab", said by a Beach Kid).
  | { kind: "line"; labels: string[]; actors: number[]; text: string; do?: string; together: boolean; as?: string; member?: number }
  | { kind: "stage"; text: string };
export type CastScene = { title: string; lines: CastLine[] };
export type Cast = {
  actors: number; // children cast (the teacher, actor -1, is not counted)
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
  return play.roles.filter((r) => !r.teacher).reduce((n, r) => n + (r.group ? r.group.max : 1), 0);
}
export function minCast(play: Play): number {
  return play.roles.filter((r) => !r.optional && !r.teacher).length;
}

/** The play fitted to n children. Pure: same play and n, same cast. */
export function castPlay(play: Play, nIn: number): Cast {
  const n = Math.max(1, Math.floor(Number.isFinite(nIn) ? nIn : 1));
  const byId = new Map(play.roles.map((r) => [r.id, r]));
  const teacherRoles = play.roles.filter((r) => r.teacher);
  const required = play.roles.filter((r) => !r.optional && !r.teacher);
  const optional = play.roles.filter((r) => r.optional && !r.teacher);
  const doubled = n < required.length;

  // Where an uncast role's lines go when `cast` are the roles cast (null = cut).
  const resolveIn = (cast: Set<string>, id: string): string | null => {
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur && !seen.has(cur)) {
      if (cast.has(cur)) return cur;
      seen.add(cur);
      const r = byId.get(cur);
      if (!r || !r.optional || "cut" in r.optional) return null;
      cur = r.optional.give;
    }
    return null;
  };
  const soloLines = play.scenes.flatMap((sc) => sc.lines).filter((l): l is Extract<PlayLine, { role: string }> => "role" in l && !l.all);

  // Each child past the always-cast roles goes where it lightens the load most (the
  // heaviest child first, then the next): the next optional role (in the order listed) or one more member of a group.
  // A tie goes to the optional role. So a group does not carry half the play alone
  // while cameos with two lines each take the other children.
  const members = new Map<string, number>(play.roles.map((r) => [r.id, 1]));
  let k = 0;
  const heaviest = (kk: number, m: Map<string, number>) => {
    const cast = new Set([...teacherRoles, ...required, ...optional.slice(0, kk)].map((r) => r.id));
    const lines = new Map<string, number>();
    // The teacher's voice counts too: a cameo that would fall to the teacher is a part a child could have.
    let teacher = 0;
    for (const l of soloLines) { const to = resolveIn(cast, l.role); if (to && byId.get(to)!.teacher) teacher++; else if (to) lines.set(to, (lines.get(to) ?? 0) + 1); }
    // Each child's lines, heaviest first (a group's lines shared among its members).
    const each: number[] = [];
    for (const [id, c] of lines) { const k = m.get(id) ?? 1; for (let i = 0; i < k; i++) each.push(Math.floor(c / k) + (i < c % k ? 1 : 0)); }
    if (teacher) each.push(teacher);
    return each.sort((x, y) => y - x);
  };
  let spare = doubled ? 0 : n - required.length;
  while (spare > 0) {
    const castNow = [...required, ...optional.slice(0, k)];
    const options: { k: number; m: Map<string, number> }[] = [];
    if (k < optional.length) options.push({ k: k + 1, m: members });
    for (const g of castNow) if (g.group && (members.get(g.id) ?? 1) < g.group.max) options.push({ k, m: new Map(members).set(g.id, (members.get(g.id) ?? 1) + 1) });
    if (!options.length) break;
    // Lighter = the heaviest child lighter, then the next, and so on. Three lines or
    // fewer is light enough: past that, a cameo (a moment of a child's own) wins the tie.
    const LIGHT = 3;
    const lighter = (x: number[], y: number[]) => { for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = Math.max(LIGHT, x[i] ?? 0) - Math.max(LIGHT, y[i] ?? 0); if (d) return d < 0; } return false; };
    let best = options[0], bestLoad = heaviest(best.k, best.m);
    for (const o of options.slice(1)) { const load = heaviest(o.k, o.m); if (lighter(load, bestLoad)) { best = o; bestLoad = load; } }
    k = best.k;
    for (const [id, c] of best.m) members.set(id, c);
    spare--;
  }
  const childRoles = doubled ? required : [...required, ...optional.slice(0, k)];
  const castRoles = [...teacherRoles, ...childRoles];
  const isCast = new Set(castRoles.map((r) => r.id));
  const resolve = (id: string) => resolveIn(isCast, id);
  const groups = childRoles.filter((r) => r.group && r.group.max > 1);
  // Past every group's max: the extra children join the first group anyway (they share its lines).
  if (spare > 0) {
    const g = groups[0] ?? childRoles.find((r) => r.group) ?? childRoles[0];
    members.set(g.id, (members.get(g.id) ?? 1) + spare);
    spare = 0;
  }

  // Doubling up. Two lines said one after the other are a conversation (a stage
  // direction between them does not end it), so their roles never go to one child:
  // a child never asks a question and answers it as another part. The roles are
  // handed out so that no two parts that talk go to one voice, and only when no child
  // is free does the TEACHER take a part (actor -1), the lightest one that fits. From two children up a conversation of three
  // parts never has one voice twice; a play's own test holds every play to that.
  const owner = new Map<string, number>(teacherRoles.map((r) => [r.id, -1]));
  if (doubled) {
    const weight = new Map<string, number>();
    const talksTo = new Map<string, Set<string>>(castRoles.map((r) => [r.id, new Set<string>()]));
    for (const sc of play.scenes) {
      let prev: string | null = null;
      for (const l of sc.lines) {
        if ("stage" in l) continue;
        if ("everyone" in l || l.all) { prev = null; continue; }
        const to = resolve(l.role);
        if (!to) continue;
        weight.set(to, (weight.get(to) ?? 0) + 1);
        if (prev && prev !== to) { talksTo.get(prev)!.add(to); talksTo.get(to)!.add(prev); }
        prev = to;
      }
    }
    // Every way of handing the parts to the children and the teacher is tried (at most
    // 4 parts and 3 children, so a few hundred), best first by: fewest pairs of parts
    // that talk to each other in one voice, no child left without a part, the fewest
    // lines for the teacher, the lightest heaviest child.
    const ids = childRoles.map((r) => r.id);
    const choice = Array.from({ length: ids.length }, () => -1);
    let best: number[] | null = null;
    let bestScore: number[] = [];
    const score = (c: number[]) => {
      const at = new Map(ids.map((id, i) => [id, c[i]]));
      for (const r of teacherRoles) at.set(r.id, -1);
      let clashes = 0;
      for (const [x, ys] of talksTo) for (const y of ys) if (x < y && at.get(x) === at.get(y)) clashes++;
      const load = Array.from({ length: n }, () => 0);
      let teacher = 0;
      ids.forEach((id, i) => { if (c[i] < 0) teacher += weight.get(id) ?? 0; else load[c[i]] += weight.get(id) ?? 0; });
      return [clashes, load.filter((l, i) => !c.includes(i)).length, teacher, Math.max(...load)];
    };
    const better = (x: number[], y: number[]) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i]; return false; };
    const walk = (i: number) => {
      if (i === ids.length) { const sc = score(choice); if (!best || better(sc, bestScore)) { best = [...choice]; bestScore = sc; } return; }
      for (const a of [...Array.from({ length: n }, (_, x) => x), -1]) { choice[i] = a; walk(i + 1); }
    };
    walk(0);
    ids.forEach((id, i) => owner.set(id, best![i]));
  }

  const parts: CastPart[] = [];
  const partsOf = new Map<string, CastPart[]>();
  let next = 0;
  for (const r of castRoles) {
    const k = members.get(r.id) ?? 1;
    const ps: CastPart[] = [];
    for (let m = 0; m < k; m++) {
      const actor = r.teacher ? -1 : doubled ? owner.get(r.id)! : next++;
      ps.push({ key: k > 1 ? `${r.id}-${m + 1}` : r.id, label: k > 1 ? `${r.name} ${m + 1}` : r.name, role: r.id, actor });
    }
    parts.push(...ps);
    partsOf.set(r.id, ps);
  }
  const all = [...new Set(parts.map((p) => p.actor))].filter((a) => a >= 0);

  // A mention reads as whoever says that role's lines now; when the teacher says them,
  // the teacher plays that character, so it keeps its own name ("Grandpa", not "Narrator").
  const nameFor = (id: string) => {
    const to = resolve(id);
    return to && byId.get(to)!.teacher && to !== id ? byId.get(id)?.name ?? id : byId.get(to ?? id)?.name ?? id;
  };
  const fill = (t: string) => t.replace(/\{@([a-z][a-z0-9-]*)\}/g, (_, id: string) => nameFor(id));

  const turn = new Map<string, number>();
  const scenes: CastScene[] = play.scenes.map((sc) => ({
    title: fill(sc.title),
    lines: sc.lines.flatMap((l): CastLine[] => {
      if ("stage" in l) return l.if && !isCast.has(l.if) ? [] : [{ kind: "stage", text: fill(l.stage) }];
      if ("everyone" in l) return [{ kind: "line", labels: ["Everyone"], actors: all, text: fill(l.everyone), do: l.do && fill(l.do), together: true }];
      const to = resolve(l.role);
      if (!to) return [];
      const ps = partsOf.get(to)!;
      const r = byId.get(to)!;
      if (ps.length > 1 && l.all) {
        return [{ kind: "line", labels: [`All ${r.name}s`], actors: ps.map((p) => p.actor), text: fill(l.text), do: l.do && fill(l.do), together: true, ...(to !== l.role ? { as: byId.get(l.role)!.name } : {}) }];
      }
      let p: CastPart;
      if (l.member && to === l.role) p = ps[(l.member - 1) % ps.length];
      else { const t = turn.get(to) ?? 0; turn.set(to, t + 1); p = ps[t % ps.length]; }
      return [{ kind: "line", labels: [p.label], actors: [p.actor], text: fill(l.text), do: l.do && fill(l.do), together: false, ...(to !== l.role ? { as: byId.get(l.role)!.name } : {}), ...(l.member && to === l.role ? { member: l.member } : {}) }];
    }),
  }));

  const count = new Map<number, number>();
  for (const sc of scenes) for (const l of sc.lines) if (l.kind === "line") for (const a of l.actors) count.set(a, (count.get(a) ?? 0) + 1);
  const readers = [...new Set(parts.map((p) => p.actor))].sort((a, b) => a - b);
  const byActor = readers.map((a) => ({
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
