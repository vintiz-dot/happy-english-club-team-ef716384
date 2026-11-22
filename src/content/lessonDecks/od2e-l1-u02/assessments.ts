// Oxford Discover 2nd edition, Level 1, Unit 2 (Friends): the printable grammar
// worksheet for this, that, these and those. Three levels with an answer key.
// Everything here is the school's own writing. Answers marked "e.g." are model
// answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U2Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u02-ws-this-that",
    title: "This, that, these, those",
    grammar: "this / that / these / those",
    deckId: "od2e-l1-u02-l3",
    slide: "This, that, these, those",
    intro: "This and these are near: touch! That and those are far: point! This / that is for one thing. These / those are for more than one.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "___ is a lion. (near, one)  (This / These)  ->  This",
        items: [
          { q: "___ is a zebra. (near, one)", options: ["This", "These"], answer: "This" },
          { q: "___ are lions. (near, two)", options: ["This", "These"], answer: "These" },
          { q: "___ is a tortoise. (far, one)", options: ["That", "Those"], answer: "That" },
          { q: "___ are elephants. (far, two)", options: ["That", "Those"], answer: "Those" },
          { q: "I touch my book. ___ is my book.", options: ["This", "That"], answer: "This" },
          { q: "I point at two birds far away. ___ are birds.", options: ["These", "Those"], answer: "Those" },
          { q: "These are ___.", options: ["pets", "pet"], answer: "pets" },
          { q: "That is a ___.", options: ["rabbit", "rabbits"], answer: "rabbit" },
        ],
      },
      {
        level: "Core",
        instructions: "Write this, that, these or those.",
        example: "___ is my pen. (near)  ->  This",
        items: [
          { q: "___ is a hamster. (near, one)", answer: "This" },
          { q: "___ are goldfish. (near, two)", answer: "These" },
          { q: "___ is a bird. (far, one)", answer: "That" },
          { q: "___ are lizards. (far, two)", answer: "Those" },
          { q: "Write the plural: a kitten -> two ___", answer: "kittens" },
          { q: "Write the singular: two rabbits -> a ___", answer: "rabbit" },
          { q: "Fix it: These is a zebra.", answer: "This is a zebra." },
          { q: "Fix it: Those is a lion. (one lion, far away)", answer: "That is a lion." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "A pet is near you: This is my hamster.",
        items: [
          { q: "Write about one thing near you. Use This.", answer: "e.g. This is my pencil." },
          { q: "Write about one animal far away. Use That.", answer: "e.g. That is an elephant." },
          { q: "Write about two things near you. Use These.", answer: "e.g. These are my shoes." },
          { q: "Write about two animals far away. Use Those.", answer: "e.g. Those are zebras." },
          { q: "Fix the mistake: That are lions.", answer: "Those are lions." },
          { q: "Write one sentence with a pet word and one of this, that, these, those.", answer: "e.g. This is a kitten." },
        ],
      },
    ],
  },
];
