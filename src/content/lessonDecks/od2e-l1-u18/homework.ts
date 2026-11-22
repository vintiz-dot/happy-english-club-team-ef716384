import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 18 "The Gingerbread
// Man": one task per lesson, keyed by deck id. Children are 6-7: draw, label, then copy
// or finish a very short sentence. A grown-up may read the steps aloud. Every task has
// the class version (`base`) and one football edition; which children get it is chosen
// per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const task = (title: string, what: string, steps: string[], frames: string[], success: string[], challenge: string): CreativeTask => ({
  title, task: what, steps, frames, success, challenge,
});
const make = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative", thinking, uses: { words, grammar }, base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL1U18Creative: Record<string, Creative> = {
  "od2e-l1-u18-l1": make("Create", ["run away", "chase", "catch", "stop", "open", "smell"], ["I can ___.", "I run away from the ___.", "Can you ___?"],
    task("A chase picture", "Draw a chase. Say who chases and who runs away.",
      ["Draw a cookie running away.", "Draw an animal that chases it.", "Write: I chase. or I run away.", "Write one more action word: catch or stop."],
      ["I run away from the ___.", "I can ___.", "Can you ___?"],
      ["I drew a chase.", "I wrote two action words.", "I acted it out for a grown-up."],
      "Write: The ___ chases the ___."),
    task("A football chase", "Draw a football game with a chase. Say who chases the ball and who catches it.",
      ["Draw a football rolling away.", "Draw a child who chases it, in an Arsenal scarf.", "Write: I chase. or I run.", "Write one more action word: catch or stop."],
      ["I chase the ___.", "I can ___.", "Can you ___?"],
      ["I drew a chase.", "I wrote two action words.", "I acted it out for a grown-up."],
      "Write: The ___ chases the ball. I catch it.")),

  "od2e-l1-u18-l2": make("Create", ["run away", "chase", "catch", "narrator", "gingerbread", "play"], ["First, ___.", "Next, ___.", "At the end, ___."],
    task("A new ending", "Make a new ending for the gingerbread man story. Draw it and say if it is happy or funny.",
      ["Draw the gingerbread man at the end of the story.", "Choose a new ending, for example he makes a friend.", "Write: At the end, the gingerbread man ___.", "Say if it is happy or funny."],
      ["At the end, the gingerbread man ___.", "It is happy.", "It is funny."],
      ["I drew a new ending.", "I wrote one sentence with At the end.", "I told a grown-up my ending."],
      "Write: First, ___. Then, ___."),
    task("The gingerbread man plays football", "Make a new ending where the gingerbread man plays football. Draw it and say if it is happy or funny.",
      ["Draw the gingerbread man with a football.", "Choose an ending, for example he scores a goal.", "Write: At the end, the gingerbread man ___.", "Say if it is happy or funny."],
      ["At the end, the gingerbread man ___.", "It is happy.", "It is funny."],
      ["I drew a new ending.", "I wrote one sentence with At the end.", "I told a grown-up my ending."],
      "Write: First, ___. Then, ___.")),

  "od2e-l1-u18-l3": make("Argue", ["run away", "chase", "catch", "stop", "cross"], ["He should ___.", "He shouldn't ___.", "He should ___ because ___."],
    task("Advice for the gingerbread man", "Give the gingerbread man advice. Draw him and write one thing he should do and one thing he shouldn't do.",
      ["Draw the gingerbread man by a river.", "Write: He should ___.", "Write: He shouldn't ___.", "Say why to a grown-up."],
      ["He should ___.", "He shouldn't ___.", "He should ___ because ___."],
      ["I drew the gingerbread man.", "I wrote one sentence with should and one with shouldn't.", "I told a grown-up why."],
      "Write: He should ___ because ___."),
    task("Advice for a football player", "Give a young football player advice. Draw the player and write one thing they should do and one thing they shouldn't do.",
      ["Draw a young player with a football.", "Write: He should ___. Use run, stop or catch.", "Write: He shouldn't ___.", "Say why to a grown-up."],
      ["He should ___.", "He shouldn't ___.", "He should ___ because ___."],
      ["I drew a player.", "I wrote one sentence with should and one with shouldn't.", "I told a grown-up why."],
      "Write: He should ___ because ___.")),

  "od2e-l1-u18-l4": make("Evaluate", ["go to bed", "play outside", "healthy food", "junk food", "early", "late"], ["I should ___.", "I shouldn't ___.", "A ___ needs ___."],
    task("My healthy day", "Draw a healthy day. Choose the most important thing and say why.",
      ["Draw three things you do in a healthy day, for example go to bed early, play outside, eat healthy food.", "Write: I should ___.", "Write: I shouldn't eat junk food every day.", "Put a star on the most important thing."],
      ["I should ___.", "I shouldn't ___.", "It is important because ___."],
      ["I drew three healthy things.", "I wrote should and shouldn't.", "I put a star on the most important one."],
      "Write: A ___ needs ___."),
    task("A healthy football player", "Draw a healthy day for a football player. Choose the most important thing and say why.",
      ["Draw three things a player does, for example go to bed early, play outside, eat healthy food.", "Write: He should ___.", "Write: He shouldn't eat junk food every day.", "Put a star on the most important thing."],
      ["He should ___.", "He shouldn't ___.", "It is important because ___."],
      ["I drew three healthy things.", "I wrote should and shouldn't.", "I put a star on the most important one."],
      "Write: A player needs ___.")),

  "od2e-l1-u18-l5": make("Compare and justify", ["living thing", "nonliving thing", "same", "different", "both"], ["A ___ can ___.", "A ___ can't ___.", "Both are ___."],
    task("Same and different", "Draw two things, one living and one nonliving. Say how they are the same and how they are different.",
      ["Draw a living thing and a nonliving thing.", "Write: A ___ can ___. A ___ can't ___.", "Find one thing that is the same, for example both are red.", "Write: Both are ___."],
      ["A ___ can ___.", "A ___ can't ___.", "Both are ___."],
      ["I drew a living thing and a nonliving thing.", "I wrote one difference and one same.", "I told a grown-up why."],
      "Write: A ___ is living because it ___."),
    task("Player and ball", "Draw a football player and a football. Say how they are the same and how they are different.",
      ["Draw an Arsenal player and a football.", "Write: A player can ___. A ball can't ___.", "Find one thing that is the same, for example both are on the pitch.", "Write: Both are ___."],
      ["A player can ___.", "A ball can't ___.", "Both are ___."],
      ["I drew a player and a ball.", "I wrote one difference and one same.", "I told a grown-up why."],
      "Write: A player is living because he ___.")),
};
