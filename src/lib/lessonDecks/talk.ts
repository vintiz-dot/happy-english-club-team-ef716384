// The weekly recorded talk: a deck's vlog slide that carries a rubric, posted as
// in-app video homework (`homeworks.submission_type = 'video'`, migration
// 20261109090000) with its rubric already written (`video_homework_rubrics`), so
// the teacher does not wait for the AI draft. The children record in "Record my
// video"; nothing reaches a family before the teacher approves (as for every video).
// Pure; imports only types (scripts/pgtest/lesson-decks-lab.test.mjs loads it).

import type { Deck, Slide } from "./types";

type Vlog = Extract<Slide, { kind: "vlog" }>;

export type TalkHomework = {
  title: string;
  body: string;
  maxSeconds: number;
  rubric: {
    criteria: { key: string; label: string; description: string; weight: number }[];
    target_vocabulary: string[];
    target_grammar: string[];
    kid_summary: string | null;
  };
};

/** The vlog of a deck that can be posted as a recorded talk, if any. */
export function talkSlide(deck: Deck): Vlog | null {
  return (deck.slides.find((s): s is Vlog => s.kind === "vlog" && !!s.rubric?.length) ?? null);
}

const key = (label: string) => label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

/** The homework and rubric rows for a deck's talk. Text only, no names. */
export function talkHomework(deck: Deck): TalkHomework | null {
  const v = talkSlide(deck);
  if (!v) return null;
  const tier = (t: Vlog["tiers"][number]) => [
    `${t.level.toUpperCase()} (${t.who}):`, ...t.frames.map((f) => `- ${f}`), ...t.tips.map((f) => `* ${f}`),
  ].join("\n");
  const body = [
    v.prompt, "",
    `How long: ${v.length}.`,
    ...(v.steps?.length ? ["", "Before you record:", ...v.steps.map((s, i) => `${i + 1}. ${s}`)] : []),
    ...(v.kidSummary ? ["", `What your teacher is looking for: ${v.kidSummary}`] : []),
    "", ...v.tiers.map(tier).join("\n\n").split("\n"),
  ].join("\n");
  const seen = new Set<string>();
  const criteria = (v.rubric ?? []).slice(0, 6).map((r, i) => {
    let k = key(r.label) || `c${i + 1}`;
    while (seen.has(k)) k = `${k}_${i + 1}`;
    seen.add(k);
    return { key: k, label: r.label.slice(0, 60), description: r.description.slice(0, 240), weight: Math.min(Math.max(r.weight, 1), 10) };
  });
  return {
    title: `Unit ${deck.unit} Lesson ${deck.lesson}: ${v.title}`,
    body,
    maxSeconds: Math.min(Math.max(Math.round(v.maxSeconds ?? 120), 30), 600),
    rubric: {
      criteria,
      target_vocabulary: (v.words ?? []).slice(0, 20),
      target_grammar: (v.grammar ?? []).slice(0, 10),
      kid_summary: v.kidSummary ?? null,
    },
  };
}
