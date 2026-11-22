import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 18 "Origami and Art
// Tools": one task per lesson, keyed by deck id. The children are 7-8, so every task is
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

export const odL2U18Creative: Record<string, Creative> = {
  // Lesson 1: words for making art
  "od2e-l2-u18-l1": creative(
    "Design",
    ["shiny", "golden", "fold", "crumple", "edge", "crane", "waves"],
    ["I like ___.", "I am good at ___.", "I can make ___."],
    {
      title: "My paper animal",
      task: "Design a paper animal that does not exist. Draw it, name it and write what it looks like and what you can do with the paper.",
      steps: [
        "Think of a paper animal with a funny name.",
        "Draw it. Make it shiny or golden.",
        "Write two sentences about how it looks.",
        "Write one sentence about how you fold or crumple the paper to make it.",
      ],
      frames: [
        "My animal is called ___.",
        "It is shiny / golden.",
        "I fold the paper and I crumple ___.",
        "I can make ___. I am good at ___.",
      ],
      success: [
        "My animal has a name and a picture.",
        "I used at least two of the new words.",
        "I wrote how I make it.",
      ],
      challenge: "Add one more sentence: where does your animal live? Use waves, climb or edge.",
    },
    {
      title: "My paper trophy",
      task: "Design a paper trophy for the Gunners. Draw it, name it and write what it looks like and how you make it.",
      steps: [
        "Think of a shiny, golden trophy for the Emirates Stadium. Give it a funny name.",
        "Draw it.",
        "Write two sentences about how it looks.",
        "Write one sentence about how you fold or crumple the paper to make it.",
      ],
      frames: [
        "My trophy is called ___.",
        "It is shiny / golden.",
        "I fold the paper and I crumple ___.",
        "I can make ___. I am good at ___.",
      ],
      success: [
        "My trophy has a name and a picture.",
        "I used at least two of the new words.",
        "I wrote how I make it.",
      ],
      challenge: "Add one more sentence: where does the Gunners team put the trophy? Use edge or climb.",
    },
  ),

  // Lesson 2: Origami story, a new panel
  "od2e-l2-u18-l2": creative(
    "Create",
    ["fold", "crane", "seal", "waves", "climb", "shiny", "golden"],
    ["She makes a ___.", "First, then, at the end", "because"],
    {
      title: "A new panel for the story",
      task: "Maki folds one more paper animal. Draw a new panel for the story and write what happens.",
      steps: [
        "Choose one more animal for Maki to fold.",
        "Draw the new panel.",
        "Write what Maki makes and what the animal does.",
        "Write how Maki feels at the end.",
      ],
      frames: [
        "Maki folds a ___.",
        "The ___ can ___.",
        "First, ___. Then, ___.",
        "At the end, Maki feels ___ because ___.",
      ],
      success: [
        "My panel has a picture and three or four sentences.",
        "I used first, then or at the end.",
        "I said how Maki feels.",
      ],
      challenge: "Add a friend for the animal. Write one sentence about how they help each other.",
    },
    {
      title: "Maki goes to the stadium",
      task: "Maki folds a paper football and falls into the world of the Emirates Stadium. Draw a new panel for the story and write what happens.",
      steps: [
        "Imagine Maki folds a paper football.",
        "Draw the new panel: Maki at the Emirates Stadium with the Gunners fans.",
        "Write what Maki makes and what happens.",
        "Write how Maki feels at the end.",
      ],
      frames: [
        "Maki folds a ___.",
        "The ___ can ___.",
        "First, ___. Then, ___.",
        "At the end, Maki feels ___ because ___.",
      ],
      success: [
        "My panel has a picture and three or four sentences.",
        "I used first, then or at the end.",
        "I said how Maki feels.",
      ],
      challenge: "Add a friend for Maki in the stadium. Write one sentence about how they help each other.",
    },
  ),

  // Lesson 3: how many / how much, some, any, a few, a lot of
  "od2e-l2-u18-l3": creative(
    "Evaluate",
    ["paper", "glue", "crayons", "paintbrushes", "water", "some", "any", "a few", "a lot of"],
    ["How many ___ are there?", "How much ___ is there?", "There are a few ___. There is a lot of ___."],
    {
      title: "Is the art room ready?",
      task: "Draw an art room with its things. Count what there is, decide what is not enough and say what to buy.",
      steps: [
        "Draw an art room with crayons, paper, glue and paintbrushes.",
        "Write what there is a lot of and what there is a few of.",
        "Write what there isn't any of.",
        "Decide what to buy and say why.",
      ],
      frames: [
        "How many crayons are there? There are ___.",
        "How much glue is there? There is ___.",
        "There aren't any ___.",
        "We need to buy ___ because ___.",
      ],
      success: [
        "I used some, any, a few or a lot of.",
        "I wrote one How many or How much question with an answer.",
        "I decided what to buy and gave a reason.",
      ],
      challenge: "Write three How many and three How much questions about your picture, with the answers.",
    },
    {
      title: "Are we ready to make the banners?",
      task: "The fans are making banners for the Gunners at the Emirates Stadium. Draw the table with paper, paint and glue. Decide what is not enough and say what to buy.",
      steps: [
        "Draw the table with paper, paint, glue and paintbrushes.",
        "Write what there is a lot of and what there is a few of.",
        "Write what there isn't any of.",
        "Decide what to buy and say why.",
      ],
      frames: [
        "How many paintbrushes are there? There are ___.",
        "How much paper is there? There is ___.",
        "There aren't any ___.",
        "We need to buy ___ because ___.",
      ],
      success: [
        "I used some, any, a few or a lot of.",
        "I wrote one How many or How much question with an answer.",
        "I decided what to buy and gave a reason.",
      ],
      challenge: "Write three How many and three How much questions about the banner table, with the answers.",
    },
  ),

  // Lesson 4: art tools and commas in lists
  "od2e-l2-u18-l4": creative(
    "Design",
    ["markers", "scissors", "glue", "chalk", "collage", "mosaic", "sculpture"],
    ["commas in lists", "I have ___, ___ and ___.", "The tool I like most is ___ because ___."],
    {
      title: "My art project and its tools",
      task: "Plan an art project. Draw it and write a list of the tools you need. Use commas in the list.",
      steps: [
        "Choose a kind of art: a collage, a mosaic or a sculpture.",
        "Draw your project.",
        "Write what tools you need, with commas in the list.",
        "Say which tool you like the most and why.",
      ],
      frames: [
        "I am making a ___.",
        "I need glue, ___ and ___.",
        "I use ___, ___ and ___.",
        "I like ___ the most because ___.",
      ],
      success: [
        "I wrote a list with commas and and.",
        "I named three tools.",
        "I gave a reason with because.",
      ],
      challenge: "Invent a new art tool. Draw it, name it and write what it looks like and what you could make with it.",
    },
    {
      title: "My match day art project",
      task: "Plan an art project for match day at the Emirates Stadium. Draw it and write a list of the tools you need. Use commas in the list.",
      steps: [
        "Choose a kind of art for the Gunners: a collage, a mosaic or a sculpture.",
        "Draw your project.",
        "Write what tools you need, with commas in the list.",
        "Say which tool you like the most and why.",
      ],
      frames: [
        "I am making a ___.",
        "I need glue, ___ and ___.",
        "I use ___, ___ and ___.",
        "I like ___ the most because ___.",
      ],
      success: [
        "I wrote a list with commas and and.",
        "I named three tools.",
        "I gave a reason with because.",
      ],
      challenge: "Invent a new art tool for a football fan. Draw it, name it and write what it looks like and what you could make with it.",
    },
  ),

  // Lesson 5: Wrap Up, my art report
  "od2e-l2-u18-l5": creative(
    "Argue",
    ["collage", "mosaic", "mobile", "sculpture", "origami", "markers", "glue"],
    ["commas in lists", "My favourite art is ___ because ___.", "I use ___, ___ and ___."],
    {
      title: "My favourite art report",
      task: "Write a short report about your favourite kind of art. Draw it, list the tools and say why it is the best.",
      steps: [
        "Choose your favourite kind of art.",
        "Draw an example.",
        "Write what you use, with commas in the list.",
        "Say why it is the best kind of art.",
      ],
      frames: [
        "My favourite art is ___.",
        "I use ___, ___ and ___.",
        "It is the best because ___.",
        "You should try it!",
      ],
      success: [
        "I named my favourite art and drew it.",
        "I wrote a list with commas.",
        "I gave a reason with because.",
      ],
      challenge: "Invent a new kind of art with a name. Say what tools it needs and ask a friend: Would you like to make this?",
    },
    {
      title: "My football art report",
      task: "Write a short report about a piece of art for the Gunners fans. Draw it, list the tools and say why it is the best art for match day.",
      steps: [
        "Choose a kind of art for the Emirates Stadium, for example a mosaic or a mobile.",
        "Draw an example.",
        "Write what you use, with commas in the list.",
        "Say why it is the best art for match day.",
      ],
      frames: [
        "My favourite art is ___.",
        "I use ___, ___ and ___.",
        "It is the best because ___.",
        "You should try it!",
      ],
      success: [
        "I named my kind of art and drew it.",
        "I wrote a list with commas.",
        "I gave a reason with because.",
      ],
      challenge: "Invent a new kind of football art with a name. Say what tools it needs and ask a friend: Would you like to make this?",
    },
  ),
};
