import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 16 "Stubborn Goats":
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

export const odL2U16Creative: Record<string, Creative> = {
  // Lesson 1: goats, mountains, stubborn
  "od2e-l2-u16-l1": creative(
    "Create",
    ["goat", "mountain", "stubborn", "angry", "horns", "east", "west"],
    ["It has ___.", "on the east / west mountain", "wants ___ because ___"],
    {
      title: "My goat on the mountain",
      task: "Invent a goat and draw it on a mountain. Write what it looks like and what it wants.",
      steps: [
        "Draw a goat with big horns on the east or west mountain.",
        "Show how it feels: stubborn or angry?",
        "Write what your goat looks like.",
        "Write what your goat wants and why.",
      ],
      frames: [
        "My goat has ___ horns.",
        "It is on the east / west mountain.",
        "It feels stubborn / angry.",
        "It wants ___ because ___.",
      ],
      success: [
        "My picture has a goat, horns and a mountain.",
        "I used east or west.",
        "I said what the goat wants.",
      ],
      challenge: "Invent a second goat on the other mountain. Write one sentence to say how it is different from the first goat.",
    },
    {
      title: "The goat that loves the Gunners",
      task: "Invent a goat that wants to go to the Emirates Stadium to see the Gunners. Draw it on a mountain and write what it looks like and what it wants.",
      steps: [
        "Draw a goat with big horns on a mountain. Give it a red and white scarf.",
        "Show how it feels: stubborn or angry?",
        "Write what your goat looks like.",
        "Write what your goat wants and why.",
      ],
      frames: [
        "My goat has ___ horns.",
        "It is on the east / west mountain.",
        "It feels stubborn / angry.",
        "It wants to go to the Emirates Stadium because ___.",
      ],
      success: [
        "My picture has a goat, horns and a mountain.",
        "I used east or west.",
        "I said what the goat wants.",
      ],
      challenge: "Invent a second goat on the other mountain that supports a different team. Write one sentence to say how it is different from the first goat.",
    },
  ),

  // Lesson 2: the two stubborn goats, a better ending
  "od2e-l2-u16-l2": creative(
    "Argue",
    ["stubborn", "angry", "goat", "forward", "wet", "horns", "mountain"],
    ["First, then, at the end", "You should ___ because ___."],
    {
      title: "Words for the two goats",
      task: "The two goats are both stubborn on the bridge. Write a short message to convince them to stop. Draw a new ending.",
      steps: [
        "Draw the two goats on the bridge. Show how they feel.",
        "Think of a good reason for them to stop pushing.",
        "Write a message to the goats with You should ... because ....",
        "Draw a new, happy ending.",
      ],
      frames: [
        "Dear goats, you are ___.",
        "You should ___ because ___.",
        "First, ___. Then, ___.",
        "At the end, the goats ___.",
      ],
      success: [
        "I gave the goats a good reason.",
        "I used You should and because.",
        "My new ending is happy.",
      ],
      challenge: "Write what each goat says when it says sorry. Make the two sentences different.",
    },
    {
      title: "Words for two goats at the stadium",
      task: "Two stubborn goats both want to kick the football first. Write a short message to convince them to take turns. Draw a new ending.",
      steps: [
        "Draw the two goats with a football at the Emirates Stadium. Show how they feel.",
        "Think of a good reason for them to take turns.",
        "Write a message to the goats with You should ... because ....",
        "Draw a new, happy ending.",
      ],
      frames: [
        "Dear goats, you are ___.",
        "You should ___ because ___.",
        "First, ___. Then, ___.",
        "At the end, the goats ___.",
      ],
      success: [
        "I gave the goats a good reason.",
        "I used You should and because.",
        "My new ending is happy.",
      ],
      challenge: "Write what each goat says when it says sorry. Make the two sentences different.",
    },
  ),

  // Lesson 3: superlatives
  "od2e-l2-u16-l3": creative(
    "Create",
    ["biggest", "happiest", "funniest", "tallest", "best", "longest"],
    ["the + adjective + -est", "the happiest, the funniest", "the best"],
    {
      title: "The record-breaking animal",
      task: "Invent an animal that is the biggest, the happiest or the funniest in the world. Draw it and write three sentences with -est words.",
      steps: [
        "Invent a new animal. Draw it with its name.",
        "Choose three -est words for it, for example the biggest, the happiest, the funniest.",
        "Write a sentence for each one.",
        "Say why it is the best animal in your story.",
      ],
      frames: [
        "My animal is the ___est animal in the world.",
        "It has the ___est ___.",
        "It is the happiest / funniest ___.",
        "It is the best because ___.",
      ],
      success: [
        "I used three -est words.",
        "My animal has a name and a picture.",
        "I gave a reason with because.",
      ],
      challenge: "Make a Record Quiz with three questions, for example Which animal is the tallest? Ask someone at home.",
    },
    {
      title: "The record-breaking Arsenal fan",
      task: "Invent a fan of the Gunners who is the loudest, the happiest or the funniest at the Emirates Stadium. Draw them and write three sentences with -est words.",
      steps: [
        "Invent a fan. Draw them with their name, in red and white.",
        "Choose three -est words, for example the loudest, the happiest, the funniest.",
        "Write a sentence for each one.",
        "Say why the fan is the best fan.",
      ],
      frames: [
        "My fan is the ___est fan at the stadium.",
        "He / She has the ___est ___.",
        "He / She is the happiest / funniest ___.",
        "He / She is the best because ___.",
      ],
      success: [
        "I used three -est words.",
        "My fan has a name and a picture.",
        "I gave a reason with because.",
      ],
      challenge: "Make a Record Quiz with three questions, for example Who has the biggest flag? Ask someone at home.",
    },
  ),

  // Lesson 4: sports words, faster / fastest
  "od2e-l2-u16-l4": creative(
    "Compare and justify",
    ["basketball", "tennis", "hockey", "golf", "baseball", "faster", "fastest", "heavier", "heaviest"],
    ["fast, faster, the fastest", "heavy, heavier, the heaviest", "big, bigger, the biggest"],
    {
      title: "The best sport for sports day",
      task: "Choose the best sport for our sports day. Draw three sports balls and compare them. Say which sport you choose and why.",
      steps: [
        "Draw three balls from three sports.",
        "Write one sentence with an -er word and one with an -est word.",
        "Choose the best sport for sports day.",
        "Give a reason.",
      ],
      frames: [
        "The ___ is bigger than the ___.",
        "The ___ is the heaviest / lightest ball.",
        "I choose ___ because ___.",
        "It is the best sport because ___.",
      ],
      success: [
        "I used an -er word and an -est word.",
        "I checked the spelling of my -er and -est words.",
        "I chose a sport and gave a reason.",
      ],
      challenge: "Write one more sentence about a sport that is NOT good for sports day and say why.",
    },
    {
      title: "Is football the best sport?",
      task: "Compare football with two other sports, for example tennis and basketball. Draw the three balls and decide if football is the best sport for the Gunners fans.",
      steps: [
        "Draw a football and two other balls.",
        "Write one sentence with an -er word and one with an -est word.",
        "Decide if football is the best sport.",
        "Give a reason.",
      ],
      frames: [
        "The football is bigger than the ___.",
        "The ___ is the heaviest / lightest ball.",
        "I think football is the best sport because ___.",
        "It is the best because ___.",
      ],
      success: [
        "I used an -er word and an -est word.",
        "I checked the spelling of my -er and -est words.",
        "I chose a sport and gave a reason.",
      ],
      challenge: "Write one more sentence about what a fan feels at a match at the Emirates Stadium that they do not feel at other sports.",
    },
  ),

  // Lesson 5: Wrap Up, the forces poster
  "od2e-l2-u16-l5": creative(
    "Design",
    ["push", "pull", "heavy", "light", "easy", "mountain", "forward"],
    ["It is easy / hard to push / pull.", "My machine pushes / pulls ___.", "because"],
    {
      title: "My push and pull machine",
      task: "Design a machine that does the hardest push or pull job for you. Draw it and write why it is the best.",
      steps: [
        "Think of the hardest push or pull job, for example moving a heavy thing up a mountain.",
        "Draw your machine and label two parts.",
        "Write what it pushes or pulls.",
        "Say why it is the best machine.",
      ],
      frames: [
        "My machine pushes / pulls ___.",
        "It is easy for the machine because ___.",
        "The ___ is heavy, but the machine is strong.",
        "It is the best machine because ___.",
      ],
      success: [
        "My machine has a picture and two labels.",
        "I said what it pushes or pulls.",
        "I gave a reason with because.",
      ],
      challenge: "Write a short play with two stubborn characters who both push the same way and a clever friend who helps.",
    },
    {
      title: "A machine for the stadium gate",
      task: "Design a machine that does the hardest push or pull job at the Emirates Stadium. Draw it and write why it is the best.",
      steps: [
        "Think of a hard push or pull job on match day, for example moving a heavy gate.",
        "Draw your machine and label two parts.",
        "Write what it pushes or pulls.",
        "Say why it is the best machine for the Gunners fans.",
      ],
      frames: [
        "My machine pushes / pulls ___.",
        "It is easy for the machine because ___.",
        "The ___ is heavy, but the machine is strong.",
        "It is the best machine because ___.",
      ],
      success: [
        "My machine has a picture and two labels.",
        "I said what it pushes or pulls.",
        "I gave a reason with because.",
      ],
      challenge: "Write a short play with two stubborn fans who both push the same way and a clever friend who helps.",
    },
  ),
};
