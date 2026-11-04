/**
 * "Who is this child?" - the reasoning behind the Stars Sync link tool.
 *
 * A Pixel Pal record says "child 121". Whether that is Nguyễn Gia Bình is
 * for an admin to say, and getting it wrong moves one child's marks and
 * points onto another. This module's job is to make the question easy: to
 * work out which HEC child each unlinked Pixel Pal child most probably is,
 * say why, and ask the question that is easiest to answer first.
 *
 * IT DECIDES NOTHING. No function here links anybody, and no level of
 * confidence does either. Every link is an admin answering a question
 * (docs/STARS_SYNC_SPEC.md, decision 2).
 *
 * WHAT IT WEIGHS, beyond the name:
 *   - the class: who is enrolled in the HEC class this Pixel Pal class maps to;
 *   - the dates: whether they were enrolled on the days Pixel Pal has records;
 *   - the weekdays: a child who only comes Mondays cannot be marked on Tuesdays;
 *   - the register: days a person marked this child in HEC, against what
 *     Pixel Pal says for the same day. Seeded placeholders say nothing and
 *     are not passed in. Records from before the sync's start date are the
 *     richest here - that is when both apps were being marked by hand;
 *   - the points: the same award on the same day in both apps, counting for
 *     less the more children got it;
 *   - elimination: who else is still unlinked, and who else this child
 *     looks more like. This is what makes it adaptive - every answer
 *     removes a child from everybody else's list, so the next question is
 *     easier than the last.
 *
 * Scores are log-odds: evidence adds, and they become a percentage at the
 * end, against a fixed chance that it is nobody on the list. The percentage
 * is a way of ranking and of choosing how to ask. It is not a measurement.
 *
 * Pure, so it can be tested directly: scripts/pgtest/stars-link.test.mjs.
 */
import { nameAffinity } from "./starsNames";

export interface PixelPalChild {
  ref: string;
  /** Null until Pixel Pal's roster, or a pasted list, has named them. */
  name: string | null;
  classRefs: string[];
  inactive?: boolean;
}

/** One of Pixel Pal's records about an unlinked child. */
export interface PixelPalRecord {
  ref: string;
  classRef: string;
  date: string;
  kind: "attendance" | "points" | "grade";
  status?: string | null;
  points?: number | null;
  /** Still waiting for this link, so linking would apply it. */
  waiting: boolean;
}

export interface HecEnrollment {
  classId: string;
  start: string;
  end: string | null;
  allowedDays: number[] | null;
}

export interface HecChild {
  id: string;
  name: string;
  active: boolean;
  enrollments: HecEnrollment[];
}

/** A mark a person made in HEC. Placeholders are left out by the caller. */
export interface HecMark {
  studentId: string;
  classId: string;
  date: string;
  status: string;
}

/** A point award made in HEC, not one the sync wrote. */
export interface HecAward {
  studentId: string;
  classId: string;
  date: string;
  points: number;
}

export interface LinkInputs {
  children: PixelPalChild[];
  records: PixelPalRecord[];
  hecChildren: HecChild[];
  marks: HecMark[];
  awards: HecAward[];
  /** Pixel Pal class number -> HEC class id. */
  classMap: Map<string, string>;
  /** HEC class id -> its name. */
  classNames: Map<string, string>;
  /** Pixel Pal class number -> its name, where Pixel Pal has told us. */
  pixelPalClassNames?: Map<string, string>;
  /** Pixel Pal child number -> HEC child id, for the links already made. */
  links: Map<string, string>;
  /** Pairs an admin said no to, as `${ref}:${studentId}`. */
  rejected?: Set<string>;
  /** Pixel Pal children an admin said are not in HEC. */
  setAside?: Set<string>;
  today: string;
}

export interface Reason {
  /** +1 for it, -1 against, 0 only worth knowing. */
  sign: 1 | -1 | 0;
  text: string;
}

export interface LinkCandidate {
  studentId: string;
  name: string;
  /** 0 to 1, across this child's list. */
  confidence: number;
  score: number;
  /** Is this name match good enough to be the reason in itself? */
  nameScore: number;
  /** Enrolled in the class Pixel Pal has this child in. */
  inClass: boolean;
  reasons: Reason[];
}

export type QuestionMode =
  /** One child stands out: yes or no. */
  | "confirm"
  /** Several could be: which one. */
  | "choose"
  /** Nobody on the list: go and find them. */
  | "search"
  /** Its class is not mapped, so that comes first. */
  | "class_first";

export interface WaitingSummary {
  records: number;
  marks: number;
  awards: number;
  grades: number;
  pointsTotal: number;
  firstDate: string | null;
  lastDate: string | null;
  absences: string[];
}

export interface LinkQuestion {
  child: PixelPalChild;
  mode: QuestionMode;
  /** The sentence the admin answers. */
  question: string;
  /** What makes this one different, if anything. */
  hint: string | null;
  candidates: LinkCandidate[];
  waiting: WaitingSummary;
  classNames: string[];
  /** How many children an admin has already ruled out for this one. */
  ruledOut: number;
}

const shortDate = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[(m || 1) - 1]}`;
};

const dateList = (dates: string[], max = 3) => {
  const shown = dates.slice(0, max).map(shortDate).join(", ");
  return dates.length > max ? `${shown} and ${dates.length - max} more` : shown;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const isAbsent = (status: string | null | undefined) => status === "Absent" || status === "Excused";

const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
};

/** What a child's name is worth as evidence. A mismatch costs little: nicknames owe nothing to the name on the form. */
function nameEvidence(score: number): number {
  if (score >= 0.99) return 7;
  if (score >= 0.9) return 5.5;
  if (score >= 0.75) return 4;
  if (score >= 0.6) return 2.5;
  if (score >= 0.45) return 1;
  return -0.5;
}

/** Are they enrolled in this class on this date? */
function enrolledOn(child: HecChild, classId: string, date: string): boolean {
  return child.enrollments.some((e) =>
    e.classId === classId && e.start <= date && (!e.end || e.end >= date));
}

interface ScoredPair {
  child: HecChild;
  score: number;
  nameScore: number;
  inClass: boolean;
  reasons: Reason[];
}

const HOW_SURE_NOBODY = 1;

export function displayName(child: Pick<PixelPalChild, "ref" | "name">): string {
  return child.name ?? `Pixel Pal child no. ${child.ref}`;
}

function waitingSummary(records: PixelPalRecord[]): WaitingSummary {
  const waiting = records.filter((r) => r.waiting);
  const dates = waiting.map((r) => r.date).sort();
  return {
    records: waiting.length,
    marks: waiting.filter((r) => r.kind === "attendance").length,
    awards: waiting.filter((r) => r.kind === "points").length,
    grades: waiting.filter((r) => r.kind === "grade").length,
    pointsTotal: waiting.reduce((sum, r) => sum + (r.points ?? 0), 0),
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    absences: [...new Set(waiting.filter((r) => r.kind === "attendance" && isAbsent(r.status)).map((r) => r.date))].sort(),
  };
}

/** Every question worth asking, easiest first. */
export function buildQuestions(input: LinkInputs): LinkQuestion[] {
  const rejected = input.rejected ?? new Set<string>();
  const setAside = input.setAside ?? new Set<string>();
  const linkedChildren = new Set(input.links.values());
  const asking = input.children.filter((c) => !input.links.has(c.ref) && !setAside.has(c.ref));

  const recordsOf = new Map<string, PixelPalRecord[]>();
  for (const record of input.records) {
    const list = recordsOf.get(record.ref) ?? [];
    list.push(record);
    recordsOf.set(record.ref, list);
  }

  const marksOf = new Map<string, Map<string, string>>();
  for (const mark of input.marks) {
    const byDay = marksOf.get(mark.studentId) ?? new Map<string, string>();
    byDay.set(`${mark.classId}|${mark.date}`, mark.status);
    marksOf.set(mark.studentId, byDay);
  }

  const awardsOf = new Map<string, Set<string>>();
  const sharedAward = new Map<string, Set<string>>();
  for (const award of input.awards) {
    const key = `${award.classId}|${award.date}|${award.points}`;
    const own = awardsOf.get(award.studentId) ?? new Set<string>();
    own.add(key);
    awardsOf.set(award.studentId, own);
    const who = sharedAward.get(key) ?? new Set<string>();
    who.add(award.studentId);
    sharedAward.set(key, who);
  }

  const free = input.hecChildren.filter((c) => !linkedChildren.has(c.id));

  // ---------------------------------------------------- first pass, each pair alone
  const pairsFor = new Map<string, ScoredPair[]>();
  for (const child of asking) {
    const records = recordsOf.get(child.ref) ?? [];
    const hecClasses = child.classRefs
      .map((ref) => input.classMap.get(ref))
      .filter((id): id is string => Boolean(id));
    const pairs: ScoredPair[] = [];

    for (const hec of free) {
      if (rejected.has(`${child.ref}:${hec.id}`)) continue;
      const reasons: Reason[] = [];
      const name = child.name ? nameAffinity(child.name, hec.name) : { score: 0, kind: "none" as const, why: "" };
      const inClass = hec.enrollments.some((e) => hecClasses.includes(e.classId));

      // Outside the class, only a good name is worth mentioning at all.
      if (!inClass && name.score < 0.75) continue;

      let score = 0;
      if (child.name) {
        score += nameEvidence(name.score);
        if (name.why) reasons.push({ sign: 1, text: name.why });
      }

      if (inClass) {
        score += 1;
      } else {
        score -= 4;
        reasons.push({ sign: -1, text: `Not enrolled in ${hecClasses.map((id) => input.classNames.get(id) ?? "that class").join(" or ") || "that class"}` });
      }

      if (!hec.active) {
        score -= 2;
        reasons.push({ sign: -1, text: "Archived in HEC" });
      }

      if (inClass) {
        // ------------------------------------------ the dates
        const days = [...new Set(records.map((r) => `${input.classMap.get(r.classRef) ?? ""}|${r.date}`))]
          .map((key) => key.split("|"))
          .filter(([classId]) => classId);
        if (days.length > 0) {
          const missed = days.filter(([classId, date]) => !enrolledOn(hec, classId, date));
          if (missed.length === 0) {
            score += 1.5;
            reasons.push({ sign: 1, text: `Enrolled on all ${plural(days.length, "day")} Pixel Pal has records for` });
          } else {
            score -= (missed.length / days.length) * 3;
            reasons.push({
              sign: -1,
              text: `Not enrolled on ${missed.length} of the ${plural(days.length, "day")} Pixel Pal has records for`,
            });
          }
        }

        // ------------------------------------------ the weekdays
        const allowed = hec.enrollments.filter((e) =>
          hecClasses.includes(e.classId) && e.allowedDays && e.allowedDays.length > 0);
        if (allowed.length > 0 && days.length > 0) {
          const offDays = days.filter(([classId, date]) => {
            const enrolment = allowed.find((e) => e.classId === classId);
            return enrolment && !enrolment.allowedDays!.includes(weekdayOf(date));
          });
          if (offDays.length === 0) {
            score += 1;
            reasons.push({ sign: 1, text: "Only comes on certain days, and Pixel Pal's records all fall on them" });
          } else {
            score -= (offDays.length / days.length) * 2.5;
            reasons.push({ sign: -1, text: `Pixel Pal has records on ${plural(offDays.length, "day")} they do not come` });
          }
        }

        // ------------------------------------------ the register
        const theirMarks = marksOf.get(hec.id);
        if (theirMarks) {
          const bothAbsent: string[] = [];
          const bothHere: string[] = [];
          const disagree: string[] = [];
          for (const record of records) {
            if (record.kind !== "attendance") continue;
            const hecClass = input.classMap.get(record.classRef);
            const mark = hecClass ? theirMarks.get(`${hecClass}|${record.date}`) : undefined;
            if (!mark) continue;
            if (isAbsent(mark) && isAbsent(record.status)) bothAbsent.push(record.date);
            else if (!isAbsent(mark) && !isAbsent(record.status)) bothHere.push(record.date);
            else disagree.push(record.date);
          }
          // Being away is rare, so agreeing on it says far more than
          // agreeing that a child came, which nearly everybody did.
          const registerScore = bothAbsent.length * 2.5 + bothHere.length * 0.25 - disagree.length * 2;
          score += Math.max(-6, Math.min(8, registerScore));
          if (bothAbsent.length > 0) {
            reasons.push({ sign: 1, text: `Absent on the same ${plural(bothAbsent.length, "day")} in both apps: ${dateList(bothAbsent.sort())}` });
          }
          if (bothHere.length > 0) {
            reasons.push({ sign: 1, text: `Marked here on the same ${plural(bothHere.length, "day")} in both apps` });
          }
          if (disagree.length > 0) {
            reasons.push({ sign: -1, text: `The registers disagree on ${plural(disagree.length, "day")}: ${dateList(disagree.sort())}` });
          }
        }

        // ------------------------------------------ the points
        const theirAwards = awardsOf.get(hec.id);
        if (theirAwards) {
          let awardScore = 0;
          const sameDays: string[] = [];
          for (const record of records) {
            if (record.kind !== "points" || !record.points) continue;
            const hecClass = input.classMap.get(record.classRef);
            const key = `${hecClass}|${record.date}|${record.points}`;
            if (hecClass && theirAwards.has(key)) {
              // Worth less the more children got the same award that day.
              awardScore += 1.5 / (sharedAward.get(key)?.size ?? 1);
              sameDays.push(record.date);
            }
          }
          if (sameDays.length > 0) {
            score += Math.min(4.5, awardScore);
            reasons.push({ sign: 1, text: `The same award on ${plural(new Set(sameDays).size, "day")} in both apps` });
          }
        }
      }

      pairs.push({ child: hec, score, nameScore: name.score, inClass, reasons });
    }
    pairsFor.set(child.ref, pairs);
  }

  // ---------------------------------------------------- second pass, against each other
  // A child who fits somebody else much better should not be offered as
  // an equal here. Only real evidence counts for this, not just being in
  // the class, or a class of strangers would all push each other down.
  const bestFit = new Map<string, { ref: string; score: number }>();
  for (const [ref, pairs] of pairsFor) {
    for (const pair of pairs) {
      const held = bestFit.get(pair.child.id);
      if (!held || pair.score > held.score) bestFit.set(pair.child.id, { ref, score: pair.score });
    }
  }
  const nameOf = new Map(asking.map((c) => [c.ref, displayName(c)]));
  for (const [ref, pairs] of pairsFor) {
    for (const pair of pairs) {
      const best = bestFit.get(pair.child.id);
      if (best && best.ref !== ref && best.score >= 4 && best.score - pair.score >= 1.5) {
        pair.score -= 1.5;
        pair.reasons.push({ sign: -1, text: `Looks more like ${nameOf.get(best.ref)}, who is also waiting` });
      }
    }
  }

  // Elimination. Only when both sides are down to one is it strong: one
  // free child in the class while three Pixel Pal children still wait says
  // very little about which of the three.
  const waitingInClass = new Map<string, number>();
  for (const child of asking) {
    for (const classRef of child.classRefs) {
      const classId = input.classMap.get(classRef);
      if (classId) waitingInClass.set(classId, (waitingInClass.get(classId) ?? 0) + 1);
    }
  }
  for (const child of asking) {
    const inClassPairs = (pairsFor.get(child.ref) ?? []).filter((p) => p.inClass);
    if (inClassPairs.length !== 1) continue;
    const classIds = child.classRefs.map((ref) => input.classMap.get(ref)).filter((id): id is string => Boolean(id));
    const className = classIds.map((id) => input.classNames.get(id)).filter(Boolean).join(" / ") || "this class";
    const others = Math.max(...classIds.map((id) => waitingInClass.get(id) ?? 1));
    const pair = inClassPairs[0];
    if (others === 1) {
      pair.score += 3;
      pair.reasons.push({ sign: 1, text: `The only child left in ${className} on either side` });
    } else {
      pair.score += 0.5;
      pair.reasons.push({ sign: 0, text: `The only child in ${className} without a link` });
    }
  }

  // ---------------------------------------------------- the questions
  // Who each child's best guess is, so two children cannot both be offered
  // the same answer as though it were likely for each.
  const bestGuessFor = new Map<string, { ref: string; score: number }[]>();
  for (const [ref, pairs] of pairsFor) {
    const top = pairs.reduce<ScoredPair | null>((best, p) => (!best || p.score > best.score ? p : best), null);
    if (!top) continue;
    const list = bestGuessFor.get(top.child.id) ?? [];
    list.push({ ref, score: top.score });
    bestGuessFor.set(top.child.id, list);
  }

  const questions = asking.map<LinkQuestion>((child) => {
    const records = recordsOf.get(child.ref) ?? [];
    const pairs = pairsFor.get(child.ref) ?? [];
    const total = HOW_SURE_NOBODY + pairs.reduce((sum, p) => sum + Math.exp(p.score), 0);
    const candidates = pairs
      .map<LinkCandidate>((p) => ({
        studentId: p.child.id,
        name: p.child.name,
        confidence: Math.exp(p.score) / total,
        score: p.score,
        nameScore: p.nameScore,
        inClass: p.inClass,
        reasons: p.reasons,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    const classIds = child.classRefs.map((ref) => input.classMap.get(ref)).filter((id): id is string => Boolean(id));
    const classNames = classIds.map((id) => input.classNames.get(id)).filter((n): n is string => Boolean(n));
    const ruledOut = input.hecChildren.filter((h) => rejected.has(`${child.ref}:${h.id}`)).length;
    const who = child.name ? `${child.name} from Pixel Pal` : `Pixel Pal's child no. ${child.ref}`;
    const inClassName = classNames.join(" or ") || "their class";

    let mode: QuestionMode;
    let question: string;
    let hint: string | null = null;
    const [top, second] = candidates;
    const unmappedClass = child.classRefs.length > 0 && classIds.length === 0;
    // Somebody else's best guess too, and this child is not clearly ahead.
    const rival = top
      ? (bestGuessFor.get(top.studentId) ?? []).find((g) => g.ref !== child.ref && g.score >= top.score - 1)
      : undefined;
    if (top && rival) {
      top.reasons = [...top.reasons, { sign: 0, text: `Also the best guess for ${nameOf.get(rival.ref)}` }];
    }

    if (unmappedClass) {
      mode = "class_first";
      const classLabel = child.classRefs
        .map((ref) => input.pixelPalClassNames?.get(ref) ?? `no. ${ref}`).join(", ");
      question = `Pixel Pal class ${classLabel} is not linked yet, so ${who} cannot be placed.`;
      hint = "Link the class first. Their records wait safely until then.";
    } else if (!top) {
      mode = "search";
      question = `Who is ${who} on HEC?`;
      hint = ruledOut > 0
        ? `You have ruled out ${plural(ruledOut, "child", "children")}, and nobody else in ${inClassName} is free.`
        : `Everybody in ${inClassName} already has a link, or nobody is enrolled.`;
    } else if (!rival && top.confidence >= 0.6 && (!second || top.confidence >= second.confidence * 3)) {
      mode = "confirm";
      question = `Is ${who} ${top.name} on HEC?`;
    } else {
      mode = "choose";
      const tied = child.name
        ? candidates.filter((c) => c.nameScore >= 0.6 && top.score - c.score < 1).length
        : 0;
      if (tied >= 2) {
        question = `${tied} children in ${inClassName} could be ${child.name}. Which one is it?`;
      } else {
        question = child.name ? `Which child on HEC is ${child.name} from Pixel Pal?` : `Who is Pixel Pal's child no. ${child.ref}?`;
      }
      if (!child.name) hint = "Pixel Pal has not told us this child's name, so this is from their records alone.";
    }

    return {
      child,
      mode,
      question,
      hint,
      candidates,
      waiting: waitingSummary(records),
      classNames,
      ruledOut,
    };
  });

  // Easiest first: a sure answer also takes a child off everybody else's
  // list, which makes the harder ones easier. Children with records waiting
  // before children with none, and a blocked class last - it needs a
  // different answer.
  const rank = (q: LinkQuestion) => {
    const blocked = q.mode === "class_first" ? 1 : 0;
    const quiet = q.waiting.records > 0 ? 0 : 1;
    return { blocked, quiet, sureness: q.candidates[0]?.confidence ?? 0, records: q.waiting.records };
  };
  return questions.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra.blocked - rb.blocked
      || ra.quiet - rb.quiet
      || rb.sureness - ra.sureness
      || rb.records - ra.records
      || displayName(a.child).localeCompare(displayName(b.child));
  });
}

export type LinkWorry = "not_enrolled" | "name_elsewhere";

export interface LinkAudit {
  ref: string;
  pixelPalName: string | null;
  studentId: string;
  studentName: string;
  worry: LinkWorry;
  detail: string;
}

/**
 * Links already made that look wrong. A wrong link is the expensive
 * mistake, so this looks for the two signs of one:
 *   - the linked child is not enrolled in the class Pixel Pal has records
 *     for, and those records are waiting because of it;
 *   - the name has nothing to do with the linked child, while it is a
 *     near-perfect match for somebody else in the class. A name that merely
 *     looks unrelated proves nothing; every nickname does that.
 */
export function auditLinks(input: {
  links: Map<string, string>;
  names: Map<string, string>;
  hecChildren: HecChild[];
  classRefsOf: Map<string, string[]>;
  classMap: Map<string, string>;
  classNames: Map<string, string>;
  notEnrolledWaiting: Map<string, number>;
}): LinkAudit[] {
  const byId = new Map(input.hecChildren.map((c) => [c.id, c]));
  const out: LinkAudit[] = [];
  for (const [ref, studentId] of input.links) {
    const hec = byId.get(studentId);
    if (!hec) continue;
    const pixelPalName = input.names.get(ref) ?? null;
    const stuck = input.notEnrolledWaiting.get(ref) ?? 0;
    if (stuck > 0) {
      out.push({
        ref,
        pixelPalName,
        studentId,
        studentName: hec.name,
        worry: "not_enrolled",
        detail: `${plural(stuck, "record")} waiting because ${hec.name} is not enrolled in that class on those days. Either the enrolment is missing, or this is the wrong child.`,
      });
      continue;
    }
    if (!pixelPalName) continue;
    const own = nameAffinity(pixelPalName, hec.name).score;
    if (own >= 0.4) continue;
    const classIds = (input.classRefsOf.get(ref) ?? [])
      .map((c) => input.classMap.get(c))
      .filter((id): id is string => Boolean(id));
    const better = input.hecChildren
      .filter((c) => c.id !== studentId && c.enrollments.some((e) => classIds.includes(e.classId)))
      .map((c) => ({ child: c, score: nameAffinity(pixelPalName, c.name).score }))
      .filter((c) => c.score >= 0.8)
      .sort((a, b) => b.score - a.score)[0];
    if (better) {
      out.push({
        ref,
        pixelPalName,
        studentId,
        studentName: hec.name,
        worry: "name_elsewhere",
        detail: `Pixel Pal calls this child ${pixelPalName}. That looks much more like ${better.child.name} than ${hec.name}.`,
      });
    }
  }
  return out;
}

/** Which HEC class a Pixel Pal class most probably is, by name. */
export function suggestClass(
  pixelPalClassName: string | null | undefined,
  hecClasses: { id: string; name: string }[],
): { id: string; name: string; score: number } | null {
  if (!pixelPalClassName) return null;
  const scored = hecClasses
    .map((c) => ({ ...c, score: nameAffinity(pixelPalClassName, c.name).score }))
    .sort((a, b) => b.score - a.score);
  const [top, second] = scored;
  if (!top || top.score < 0.6) return null;
  // Stars and Stars 2 are both "Stars". A tie is not a suggestion.
  if (second && second.score >= top.score - 0.02 && top.score < 1) return null;
  return top;
}
