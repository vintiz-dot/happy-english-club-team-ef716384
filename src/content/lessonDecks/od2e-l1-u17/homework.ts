import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 17 "Living and
// Nonliving Things": one task per lesson, keyed by deck id. Children are 6-7: draw,
// label, then copy or finish a very short sentence. A grown-up may read the steps
// aloud. Every task has the class version (`base`) and one football edition; which
// children get it is chosen per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const task = (title: string, what: string, steps: string[], frames: string[], success: string[], challenge: string): CreativeTask => ({
  title, task: what, steps, frames, success, challenge,
});
const make = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative", thinking, uses: { words, grammar }, base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL1U17Creative: Record<string, Creative> = {
  "od2e-l1-u17-l1": make("Compare and justify", ["living", "nonliving", "breathe", "move", "plant", "people"], ["A ___ is living.", "A ___ is nonliving.", "It moves. / It doesn't move."],
    task("Living or nonliving?", "Draw one living thing and one nonliving thing. Write which is which and say how you know.",
      ["Draw a living thing, for example a plant or a cat.", "Draw a nonliving thing, for example a chair or a toy.", "Write living or nonliving under each picture.", "Copy: A ___ is living. A ___ is nonliving."],
      ["A ___ is living.", "A ___ is nonliving.", "It breathes. / It doesn't breathe."],
      ["I drew a living thing and a nonliving thing.", "I wrote living and nonliving in the right places.", "I told a grown-up how I know."],
      "Write: A ___ moves. A ___ doesn't move."),
    task("Fan or football?", "Draw a football fan and a football. Say which is living and which is nonliving, and how you know.",
      ["Draw an Arsenal fan with a red scarf.", "Draw a football.", "Write living or nonliving under each picture.", "Copy: A fan is living. A football is nonliving."],
      ["A ___ is living.", "A ___ is nonliving.", "It breathes. / It doesn't breathe."],
      ["I drew a fan and a football.", "I wrote living and nonliving in the right places.", "I told a grown-up how I know."],
      "Write: A fan moves. A football doesn't move by itself.")),

  "od2e-l1-u17-l2": make("Create", ["living", "nonliving", "change", "move", "plant"], ["My ___ is alive!", "It can ___.", "It changes."],
    task("A toy that comes alive", "Imagine a toy that comes alive at night. Draw it and write what it does.",
      ["Choose a toy and draw it.", "Draw three things it does when it is alive.", "Write: My ___ is alive!", "Write one thing it can do."],
      ["My ___ is alive!", "It can ___.", "It moves."],
      ["I drew a toy and three things it does.", "I wrote two sentences.", "I told a grown-up my story."],
      "Write: In the morning, it is nonliving again."),
    task("A football that comes alive", "Imagine a football that comes alive at night. Draw it and write what it does.",
      ["Draw a football with eyes and legs.", "Draw three things it does when it is alive, for example run, jump, kick.", "Write: My ball is alive!", "Write one thing it can do."],
      ["My ___ is alive!", "It can ___.", "It moves."],
      ["I drew a football and three things it does.", "I wrote two sentences.", "I told a grown-up my story."],
      "Write: In the morning, it is nonliving again.")),

  "od2e-l1-u17-l3": make("Design", ["living", "nonliving", "move", "breathe", "plant", "people"], ["A ___ can ___.", "A ___ can't ___.", "Can it ___?"],
    task("My funny creature", "Design a funny animal. Say what it can do and what it can't do.",
      ["Draw your funny animal.", "Choose three things it can do and draw them.", "Write: My animal can ___.", "Write one thing it can't do: My animal can't ___."],
      ["My animal can ___.", "My animal can't ___.", "Can it ___? Yes, it can."],
      ["I drew a funny animal.", "I wrote can and can't.", "I asked a grown-up: Can it ___?"],
      "Draw a nonliving thing too. Write: A ___ can't ___."),
    task("My football creature", "Design a funny football-loving animal. Say what it can do and what it can't do.",
      ["Draw your funny animal in an Arsenal scarf.", "Choose three things it can do, for example kick, run, jump, and draw them.", "Write: My animal can ___.", "Write one thing it can't do: My animal can't ___."],
      ["My animal can ___.", "My animal can't ___.", "Can it ___? Yes, it can."],
      ["I drew a funny animal.", "I wrote can and can't.", "I asked a grown-up: Can it ___?"],
      "Draw a football too. Write: A football can't ___.")),

  "od2e-l1-u17-l4": make("Evaluate", ["noisy", "quiet", "old", "new", "lovely", "bench"], ["It is ___.", "A ___ is living.", "I like the ___."],
    task("A living thing or a nonliving thing?", "Draw a park with two living things and two nonliving things. Say which you like best.",
      ["Draw a park.", "Add two living things, for example a rose and a bird.", "Add two nonliving things, for example a bench and a fountain.", "Write: A ___ is living. A ___ is nonliving."],
      ["A ___ is living.", "A ___ is nonliving.", "It is ___."],
      ["My park has living and nonliving things.", "I wrote two sentences.", "I told a grown-up which thing I like best."],
      "Write a describing word for each thing: It is old. It is lovely."),
    task("A park with a football game", "Draw a park with a football game. Show two living things and two nonliving things. Say which you like best.",
      ["Draw a park with children playing football.", "Add two living things, for example a child and a rose.", "Add two nonliving things, for example a football and a bench.", "Write: A ___ is living. A ___ is nonliving."],
      ["A ___ is living.", "A ___ is nonliving.", "It is ___."],
      ["My park has living and nonliving things.", "I wrote two sentences.", "I told a grown-up which thing I like best."],
      "Write a describing word for each thing: It is old. It is lovely.")),

  "od2e-l1-u17-l5": make("Compare and justify", ["living", "nonliving", "breathe", "move", "change"], ["A ___ can ___.", "A ___ can't ___.", "It's ___ because it can't ___."],
    task("My robot: living or nonliving?", "Invent a robot. Draw it. Say what it can do and what it can't do, then decide if it is living or nonliving and say why.",
      ["Draw your robot.", "Write one thing it can do: My robot can ___.", "Write one thing it can't do: My robot can't ___.", "Write: It's living. Or: It's nonliving. Tell a grown-up why."],
      ["My robot can ___.", "My robot can't ___.", "It's nonliving because it can't ___."],
      ["I drew a robot.", "I wrote can and can't.", "I said if it is living or nonliving and why."],
      "Imagine your robot can grow and breathe. Write: Now it is ___ because it can ___."),
    task("My robot footballer: living or nonliving?", "Invent a robot footballer. Draw it. Say what it can do and what it can't do, then decide if it is living or nonliving and say why.",
      ["Draw your robot footballer in a red-and-white shirt.", "Write one thing it can do: My robot can ___, for example kick or run.", "Write one thing it can't do: My robot can't ___.", "Write: It's living. Or: It's nonliving. Tell a grown-up why."],
      ["My robot can ___.", "My robot can't ___.", "It's nonliving because it can't ___."],
      ["I drew a robot footballer.", "I wrote can and can't.", "I said if it is living or nonliving and why."],
      "Imagine your robot can grow and breathe. Write: Now it is ___ because it can ___.")),
};
