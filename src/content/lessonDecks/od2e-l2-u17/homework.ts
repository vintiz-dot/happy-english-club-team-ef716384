import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 17 "Shapes in Art":
// one task per lesson, keyed by deck id. The children are 7-8, so every task is
// draw-then-write: a picture first, then two to four short sentences. Every task has the
// class version (`base`) and one football edition; which children get the football
// edition is chosen per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const creative = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative",
  thinking,
  uses: { words, grammar },
  base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL2U17Creative: Record<string, Creative> = {
  // Lesson 1: shapes and nature
  "od2e-l2-u17-l1": creative(
    "Create",
    ["star", "crescent", "spiral", "oval", "straight", "nature", "pattern"],
    ["I see ___, ___ and ___.", "My favourite shape is ___ because ___."],
    {
      title: "A nature picture made of shapes",
      task: "Draw a picture of nature that uses at least three shapes. Write what you see and choose your favourite shape.",
      steps: [
        "Draw a nature picture, for example a garden, a beach or a night sky.",
        "Use at least three shapes, for example a star, an oval and a spiral.",
        "Write what you see.",
        "Choose your favourite shape and say why.",
      ],
      frames: [
        "I see a ___, a ___ and a ___.",
        "The ___ is straight / round.",
        "My favourite shape is the ___.",
        "I like it because ___.",
      ],
      success: [
        "My picture has at least three shapes.",
        "I named the shapes.",
        "I gave a reason with because.",
      ],
      challenge: "Add a pattern to your picture, for example a row of stars, and write one sentence about it.",
    },
    {
      title: "The Emirates Stadium made of shapes",
      task: "Draw the Emirates Stadium on match day using at least three shapes, for example ovals, stars and a crescent moon. Write what you see and choose your favourite shape.",
      steps: [
        "Draw the stadium and the sky above it. Use red and white.",
        "Use at least three shapes, for example a star, an oval and a crescent.",
        "Write what you see.",
        "Choose your favourite shape and say why.",
      ],
      frames: [
        "I see a ___, a ___ and a ___.",
        "The ___ is straight / round.",
        "My favourite shape is the ___.",
        "I like it because ___.",
      ],
      success: [
        "My picture has at least three shapes.",
        "I named the shapes.",
        "I gave a reason with because.",
      ],
      challenge: "Add a pattern to your picture, for example a row of stars for the Gunners fans, and write one sentence about it.",
    },
  ),

  // Lesson 2: shapes in art, same and different
  "od2e-l2-u17-l2": creative(
    "Compare and justify",
    ["star", "spiral", "crescent", "oval", "straight", "sculpture", "pattern"],
    ["___ is the same as ___, but ___", "It has ___ sides / corners.", "because"],
    {
      title: "Which shape for my sculpture?",
      task: "Choose two shapes. Say how they are the same and how they are different. Then choose one for a sculpture and say why.",
      steps: [
        "Choose two shapes, for example a star and a crescent.",
        "Draw them side by side.",
        "Write one sentence about how they are the same and one about how they are different.",
        "Choose one for a big sculpture and say why.",
      ],
      frames: [
        "The ___ and the ___ are both ___.",
        "The ___ is straight, but the ___ is round.",
        "I choose the ___ for my sculpture.",
        "I choose it because ___.",
      ],
      success: [
        "I wrote how the shapes are the same.",
        "I wrote how they are different.",
        "I chose one and gave a reason.",
      ],
      challenge: "Invent a new shape and name it. Write how it is the same as another shape and how it is different.",
    },
    {
      title: "Which shape for the fans' banner?",
      task: "Choose two shapes. Say how they are the same and how they are different. Then choose one for a banner for the Arsenal fans and say why.",
      steps: [
        "Choose two shapes, for example a star and an oval.",
        "Draw them side by side.",
        "Write one sentence about how they are the same and one about how they are different.",
        "Choose one for a big banner at the Emirates Stadium and say why.",
      ],
      frames: [
        "The ___ and the ___ are both ___.",
        "The ___ is straight, but the ___ is round.",
        "I choose the ___ for the banner.",
        "I choose it because ___.",
      ],
      success: [
        "I wrote how the shapes are the same.",
        "I wrote how they are different.",
        "I chose one and gave a reason.",
      ],
      challenge: "Invent a new shape for the Gunners and name it. Write how it is the same as another shape and how it is different.",
    },
  ),

  // Lesson 3: a lot of / any
  "od2e-l2-u17-l3": creative(
    "Design",
    ["collage", "star", "oval", "pattern", "paper", "glue", "sculpture"],
    ["There are a lot of ___.", "There is a lot of ___.", "There aren't any ___. / There isn't any ___."],
    {
      title: "My collage plan",
      task: "Plan a paper collage. Draw it and write what is in it and what is not in it.",
      steps: [
        "Plan a collage. Draw it on your paper.",
        "Write what there is a lot of.",
        "Write what there is not any of.",
        "Say why you left one thing out.",
      ],
      frames: [
        "There are a lot of ___.",
        "There is a lot of ___.",
        "There aren't any ___.",
        "There isn't any ___ because ___.",
      ],
      success: [
        "I used a lot of with a plural and with glue or paper.",
        "I used any in a sentence with aren't or isn't.",
        "My drawing matches my sentences.",
      ],
      challenge: "Plan a magic collage from another planet. Write five sentences with a lot of, any, are and is.",
    },
    {
      title: "A match day collage plan",
      task: "Plan a paper collage of match day at the Emirates Stadium. Draw it and write what is in it and what is not in it.",
      steps: [
        "Plan a collage of the stadium, the fans and the Gunners' red and white. Draw it on your paper.",
        "Write what there is a lot of.",
        "Write what there is not any of.",
        "Say why you left one thing out.",
      ],
      frames: [
        "There are a lot of ___.",
        "There is a lot of ___.",
        "There aren't any ___.",
        "There isn't any ___ because ___.",
      ],
      success: [
        "I used a lot of with a plural and with glue or paper.",
        "I used any in a sentence with aren't or isn't.",
        "My drawing matches my sentences.",
      ],
      challenge: "Plan a collage of a stadium on another planet. Write five sentences with a lot of, any, are and is.",
    },
  ),

  // Lesson 4: kinds of art and kind words
  "od2e-l2-u17-l4": creative(
    "Argue",
    ["photograph", "origami", "drawing", "mobile", "oil painting", "mosaic"],
    ["It has ___, ___ and ___.", "The best present is ___ because ___."],
    {
      title: "The best art for a present",
      task: "Choose a kind of art to make as a present for a friend. Draw it and say why it is the best present.",
      steps: [
        "Choose one kind of art: a drawing, an origami, a mosaic, a mobile or another kind.",
        "Draw the present.",
        "Write a sentence with a list: It has ___, ___ and ___.",
        "Say why it is the best present for your friend.",
      ],
      frames: [
        "The best present is a ___.",
        "It has ___, ___ and ___.",
        "My friend likes ___.",
        "I chose it because ___.",
      ],
      success: [
        "I chose one kind of art.",
        "I used a list with commas.",
        "I gave a reason with because.",
      ],
      challenge: "Say why a different kind of art would not be as good, and say what you would write on a kind card with it.",
    },
    {
      title: "The best art for an Arsenal fan",
      task: "Choose a kind of art to make as a present for a friend who loves the Gunners. Draw it and say why it is the best present.",
      steps: [
        "Choose one kind of art: a drawing, an origami, a mosaic, a mobile or another kind.",
        "Draw the present in red and white.",
        "Write a sentence with a list: It has ___, ___ and ___.",
        "Say why it is the best present for a Gunners fan.",
      ],
      frames: [
        "The best present is a ___.",
        "It has ___, ___ and ___.",
        "My friend loves the Gunners and likes ___.",
        "I chose it because ___.",
      ],
      success: [
        "I chose one kind of art.",
        "I used a list with commas.",
        "I gave a reason with because.",
      ],
      challenge: "Say why a different kind of art would not be as good, and say what you would write on a kind card with it.",
    },
  ),
};
