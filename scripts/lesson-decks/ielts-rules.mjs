// The rules every Sun Class (hec-ielts-sl) deck keeps, as plain functions so the
// builder's checker (check-ielts.mjs) and the suite (pgtest/lesson-decks-lib.test.mjs)
// apply the same ones. Each returns a list of problems; empty means fine.
//
// A 120-minute lesson has: a 4/3/2-style warm-up, a language focus, a pronunciation
// micro-focus, an IELTS Speaking part with peer scoring, a listening block with an
// original script, a debate or discussion, reflection, and tiered homework of about
// 2.5 hours a week (the owner's limit, 22 Nov 2026). Every task offers Support,
// Core and Stretch.

export const TIER_ORDER = ["Support", "Core", "Stretch"];

const SLIDE_KEYS = {
  title: ["title", "subtitle", "bigQuestion"], objectives: ["title", "items"],
  activity: ["title", "tag", "mode", "minutes", "steps", "prompts", "frames", "fluencyTip", "book", "teacherNote", "tiers"],
  vocab: ["title", "words", "book"], grammar: ["title", "hook", "form", "explanation", "examples", "pitfalls", "book"],
  speaking: ["title", "mode", "minutes", "frames", "prompts", "fluencyTip", "steps", "book", "teacherNote", "tiers", "ielts"],
  homework: ["title", "items"], vlog: ["title", "prompt", "length", "tiers"], reflect: ["title", "prompts"],
  listening: ["title", "section", "mode", "minutes", "context", "strategy", "script", "questions", "decoding", "tiers"],
  debate: ["title", "mode", "minutes", "stage", "motion", "speeches", "steps", "frames", "tiers", "judging"],
  check: ["title", "assessment", "mode", "minutes", "steps"],
};

const tiersOk = (t) => Array.isArray(t) && t.length === 3 && t.every((x, i) => x.level === TIER_ORDER[i] && typeof x.task === "string" && x.task.length > 10);
const itemsOk = (items) => items.every((i) => i.q && i.answer && (!i.options || i.options.includes(i.answer)));

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Minutes on each day for one tier: an item's weekly minutes shared evenly over its days. */
export function dayMinutes(hw, tier) {
  const out = Object.fromEntries(DAYS.map((d) => [d, 0]));
  for (const h of hw.items.filter((x) => !x.tier || x.tier === tier)) {
    const days = Array.isArray(h.days) && h.days.length ? h.days : [];
    for (const d of days) if (d in out) out[d] += (h.minutes ?? 0) / days.length;
  }
  for (const d of DAYS) out[d] = Math.round(out[d]);
  return out;
}

/** Week totals of a homework slide per tier (untiered items count for everyone). */
export function homeworkMinutes(hw) {
  const out = {};
  for (const lv of TIER_ORDER) out[lv] = hw.items.filter((h) => !h.tier || h.tier === lv).reduce((a, h) => a + (h.minutes ?? 0), 0);
  return out;
}

/** Problems with one deck. `lesson` is its row of programme.ts LESSONS (or undefined). */
export function deckProblems(d, lesson) {
  const p = [];
  const need = (c, msg) => { if (!c) p.push(msg); };
  const s = d.slides ?? [];
  need(d.curriculum === "hec-ielts-sl", "curriculum is hec-ielts-sl");
  need(d.id === `hec-ielts-y${d.level}-t${d.unit}-l${d.lesson}`, `id is hec-ielts-y${d.level}-t${d.unit}-l${d.lesson}`);
  need(d.minutes === 120, "a 120-minute lesson");
  const timed = s.filter((x) => typeof x.minutes === "number").reduce((a, x) => a + x.minutes, 0);
  need(timed >= 105 && timed <= 120, `timed slides add up to 105-120 min (got ${timed})`);
  for (const x of s) if (typeof x.minutes === "number") need(x.minutes >= 3 && x.minutes <= 30, `"${x.title}" is 3-30 minutes (got ${x.minutes})`);
  need(Array.isArray(d.book) && d.book.length === 0, "book is [] (the course has no book pages to cite)");
  need(!d.covers, "no covers (there is no curriculum_lessons row for this course)");
  need(Array.isArray(d.inquiryPhases) && d.inquiryPhases.length > 0, "inquiry phases set");
  need(s[0]?.kind === "title" && s[1]?.kind === "objectives", "starts with a title slide and objectives");
  if (lesson) {
    need(d.title === lesson.theme, `title matches the pacing guide ("${lesson.theme}")`);
    const deb = s.find((x) => x.kind === "debate");
    if (lesson.motion && deb) need(deb.motion === lesson.motion || /^Chosen by|showcase/i.test(lesson.motion), `debate motion matches the pacing guide ("${lesson.motion}")`);
    if (lesson.mock) need(s.some((x) => x.kind === "check"), "a mock lesson runs its mock from a check slide");
    const lis = s.find((x) => x.kind === "listening");
    if (lis) need(lis.section === lesson.listening.section, `listening is modelled on Part ${lesson.listening.section}`);
  }
  // The seven blocks of every lesson.
  const warm = s.find((x) => x.kind === "activity" && x.tag === "Warm-up");
  const pron = s.find((x) => x.kind === "activity" && x.tag === "Pronunciation");
  const speak = s.filter((x) => x.kind === "speaking" && x.ielts);
  const lis = s.filter((x) => x.kind === "listening");
  const deb = s.filter((x) => x.kind === "debate");
  need(!!warm, "a Warm-up activity (fluency routine)");
  need(s.some((x) => x.kind === "grammar" || x.kind === "vocab"), "a language focus (grammar or vocab slide)");
  need(!!pron, "a Pronunciation activity");
  need(speak.length > 0, "an IELTS speaking slide (speaking with `ielts`)");
  if (!lesson?.mock) need(speak.some((x) => x.ielts.peerScore), "peer scoring on an IELTS speaking slide");
  need(lis.length > 0, "a listening slide");
  need(deb.length > 0, "a debate slide");
  need(s.some((x) => x.kind === "reflect"), "a reflect slide");
  const vlog = s.find((x) => x.kind === "vlog");
  need(!!vlog && TIER_ORDER.every((l) => vlog.tiers.some((t) => t.level === l)), "a vlog (recorded speaking) with Support, Core and Stretch");
  // Tiers on every task.
  for (const x of [warm, pron, ...speak, ...lis, ...deb].filter(Boolean)) need(tiersOk(x.tiers), `"${x.title}" has Support, Core, Stretch tiers in that order`);
  for (const x of s) if ((x.kind === "activity" || x.kind === "speaking") && x.tiers) need(tiersOk(x.tiers), `"${x.title}" tiers are Support, Core, Stretch`);
  for (const x of lis) {
    need(x.script.length >= 6 && x.script.every((l) => l.speaker && l.text), `"${x.title}": a script of 6+ lines, each with a speaker`);
    need(x.questions.items.length >= 5 && itemsOk(x.questions.items), `"${x.title}": 5+ questions, each answered (a choice's answer is an option)`);
    need(x.strategy.steps.length >= 3, `"${x.title}": a strategy with 3+ steps`);
    need(x.section >= 1 && x.section <= 4, `"${x.title}": section 1-4`);
  }
  for (const x of deb) need(x.speeches.length >= 2 && x.speeches.every((q) => q.role && q.seconds > 0 && q.job) && x.frames.length >= 3 && x.steps.length >= 3, `"${x.title}": running order, steps and frames`);
  for (const x of speak) if (x.ielts.part === 2) need(!!x.ielts.cueCard && x.ielts.cueCard.points.length >= 3, `"${x.title}": a Part 2 slide has a cue card`);
  // Homework: every strand, timed, within the owner's 2.5 hours for Core.
  const hw = s.find((x) => x.kind === "homework");
  need(!!hw, "a homework slide");
  if (hw) {
    need(hw.items.every((h) => typeof h.minutes === "number" && h.minutes > 0), "every homework item has its minutes a week");
    const m = homeworkMinutes(hw);
    need(m.Core >= 120 && m.Core <= 160, `Core homework is about 2.5 hours a week (got ${m.Core} min)`);
    need(m.Support <= m.Core && m.Stretch >= m.Core && m.Stretch <= 240, `Support <= Core <= Stretch <= 240 min (got ${m.Support}/${m.Core}/${m.Stretch})`);
    const labels = hw.items.map((h) => `${h.label} ${h.detail}`).join(" | ");
    for (const [re, what] of [[/listening/i, "daily listening"], [/log/i, "a listening log"], [/shadow/i, "shadowing"], [/record|video/i, "a recorded speaking task"], [/vocab|retriev/i, "vocabulary retrieval"], [/debate/i, "debate prep"]]) need(re.test(labels), `homework includes ${what}`);
    // Day by day, and built so handing it to an AI gains nothing (owner, 22 Nov 2026):
    // evidence in the student's own voice, at a set moment, checked live in class.
    need(hw.items.every((h) => Array.isArray(h.days) && h.days.length > 0 && h.days.every((d) => DAYS.includes(d))), "every homework item names the days it is done (Mon-Sun)");
    need(hw.items.every((h) => typeof h.check === "string" && h.check.length >= 20), "every homework item says how the teacher checks it (`check`)");
    for (const lv of TIER_ORDER) {
      const perDay = dayMinutes(hw, lv);
      const worst = Math.max(...Object.values(perDay));
      const cap = lv === "Stretch" ? 40 : 30; // Stretch is the optional extra for students who can do more
      need(worst <= cap, `${lv} homework is at most ${cap} minutes on any day (got ${worst}: ${JSON.stringify(perDay)})`);
      if (lv === "Core") need(Object.values(perDay).filter((m) => m > 0).length >= 5, "Core homework is spread over at least 5 days");
    }
    const all = hw.items.map((h) => `${h.label} ${h.detail} ${h.check ?? ""}`).join(" | ");
    for (const [re, what] of [
      [/timestamp|at minute|\b\d{1,2}:\d{2}\b/i, "a listening log tied to a moment in the recording (a timestamp and what was said there)"],
      [/voice note|voice memo|record(ed|ing)? (a |your )?voice|audio/i, "a short voice note in the student's own voice"],
      [/one take|single take|no cuts|no editing/i, "a recording made in one take"],
      [/code word|today's word|word from (the )?class/i, "a code word only given out in class, said in the recording"],
      [/keyword|key word/i, "debate prep as keyword cards, not written paragraphs"],
      [/\bAI\b/, "an open rule on AI (when it may be used and how it is logged)"],
    ]) need(re.test(all), `anti-AI homework: ${what}`);
  }
  // From the second lesson on, the class checks last week's homework live, so an
  // outsourced week shows: two students talk about their log, the class is quizzed.
  if (lesson && lesson.n > 1) {
    const chk = s.find((x) => x.kind === "activity" && /^Homework check/i.test(x.title ?? ""));
    need(!!chk && chk.minutes >= 3 && chk.minutes <= 8, "a 3-8 minute in-class \"Homework check\" activity (live questions on the log, a retrieval quiz)");
  }
  // Shapes.
  for (const [j, x] of s.entries()) {
    const allowed = SLIDE_KEYS[x.kind];
    const extra = allowed ? Object.keys(x).filter((k) => k !== "kind" && !allowed.includes(k)) : [`unknown kind ${x.kind}`];
    need(extra.length === 0, `slide ${j + 1} (${x.kind}): only fields its kind has (${extra.join(", ")})`);
    if (x.kind === "vocab") need(x.words.every((w) => w.word && w.meaning && w.example && Object.keys(w).length === 3), `slide ${j + 1}: vocab words have word, meaning, example`);
    if (x.kind === "grammar") need(!!x.hook && x.form.length > 0 && x.examples.length >= 3 && (x.pitfalls ?? []).length > 0, `slide ${j + 1}: grammar has hook, form, 3+ examples, pitfalls`);
    if (x.kind === "homework") need(x.items.every((h) => h.label && h.detail && Object.keys(h).every((k) => ["label", "detail", "minutes", "tier", "days", "check"].includes(k))), `slide ${j + 1}: homework items are label, detail, minutes, tier, days, check`);
  }
  const titles = s.map((x) => x.title).filter(Boolean);
  need(new Set(titles).size === titles.length, "slide titles are unique");
  const json = JSON.stringify(d);
  need(!/\{s(?:0|[1-9]\d)\}|\{s\}/.test(json), "no slot beyond {s9} or malformed token");
  need(!/\.(mp3|wav|m4a|pdf|jpg|png)"/i.test(json), "no audio, image or book files referenced");
  return p;
}

/** Problems with an assessment used by these decks (a diagnostic or a mock). */
export function assessmentProblems(a) {
  const p = [];
  const need = (c, msg) => { if (!c) p.push(`${a.id}: ${msg}`); };
  need(a.kind === "formative", "Sun Class mocks run inside a lesson (kind formative)");
  need(a.minutes > 0 && a.minutes <= 120, "fits a lesson");
  need(a.sections.length > 0 && a.sections.every((x) => x.items.length && itemsOk(x.items)), "every item answered; a choice's answer is an option");
  const lis = a.sections.filter((x) => x.skill === "Listening");
  need(lis.length > 0 && lis.every((x) => (x.script ?? []).length >= 8 && !x.passage), "listening sections carry a script (8+ lines) and no printed passage");
  need(!!a.speaking && a.speaking.rubric.length === 4 && a.speaking.rubric.every((r) => r.bands.length === 4), "a speaking task scored on the four criteria");
  return p;
}
