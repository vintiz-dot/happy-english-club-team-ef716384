// Oxford Discover 2nd edition, Level 1, Unit 4 (Let's Make Colors!): the
// printable grammar worksheet for in, on, under and next to. Three levels with
// an answer key. Everything here is the school's own writing. Answers marked
// "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U4Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u04-ws-places",
    title: "In, on, under, next to",
    grammar: "in / on / under / next to",
    deckId: "od2e-l1-u04-l3",
    slide: "In, on, under, next to",
    intro: "Where is it? The ball is in the bag. The pencil is on the desk. The cat is under the chair. The bird is next to the tree.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "The ball is ___ the bag. (inside)  (in / on)  ->  in",
        items: [
          { q: "The book is ___ the desk. (on top)", options: ["on", "under"], answer: "on" },
          { q: "The cat is ___ the chair. (below)", options: ["in", "under"], answer: "under" },
          { q: "The pencil is ___ the box. (inside)", options: ["in", "on"], answer: "in" },
          { q: "The bird is ___ the tree. (beside)", options: ["next to", "in"], answer: "next to" },
          { q: "The fish is ___ the water.", options: ["in", "on"], answer: "in" },
          { q: "The hat is ___ my head.", options: ["on", "under"], answer: "on" },
          { q: "The ball is ___ the bed. (below)", options: ["under", "on"], answer: "under" },
          { q: "The dog is ___ the house. (beside)", options: ["next to", "under"], answer: "next to" },
        ],
      },
      {
        level: "Core",
        instructions: "Write in, on, under or next to.",
        example: "The cup is ___ the table. (on top)  ->  on",
        items: [
          { q: "The shell is ___ the sand. (on top)", answer: "on" },
          { q: "The starfish is ___ the rock. (below)", answer: "under" },
          { q: "The crab is ___ the shell. (beside)", answer: "next to" },
          { q: "The fish is ___ the ocean.", answer: "in" },
          { q: "The T-shirt is ___ the bag. (inside)", answer: "in" },
          { q: "The sneakers are ___ the bed. (below)", answer: "under" },
          { q: "Write the question: (the hat / Where)", answer: "Where is the hat?" },
          { q: "Answer: Where is the hat? (on the chair)", answer: "It's on the chair." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "A cat under a chair: The cat is under the chair.",
        items: [
          { q: "Write where your bag is. Use in, on, under or next to.", answer: "e.g. My bag is next to my desk." },
          { q: "Write one sentence with under.", answer: "e.g. The ball is under the bed." },
          { q: "Write one sentence with next to.", answer: "e.g. The cat is next to the door." },
          { q: "Write a question with Where.", answer: "e.g. Where is my hat?" },
          { q: "Fix the mistake: The cat is in the chair. (The cat sits below it.)", answer: "The cat is under the chair." },
          { q: "Write two sentences about one colour thing: where it is, and its colour.", answer: "e.g. The red ball is in the bag. It's red." },
        ],
      },
    ],
  },
];
