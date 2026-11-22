import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 14 (City and Country): the printable
// grammar worksheet for his, her and your. Level 1 children are 6-7, so items are
// very short: circle the word, finish one word, write one sentence. Everything is the
// school's own writing. Answers marked "e.g." are model answers for open items.

export const odL1U14Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u14-ws-his-her-your",
    title: "His, her and your",
    grammar: "his / her / your",
    deckId: "od2e-l1-u14-l3",
    slide: "His, her and your",
    intro: "Use his for a boy and her for a girl: His house is old. Her house is new. Use your when you talk to a person: Is your house big?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "Boy Bear has a house. ___ house is old.  (His / Her)  ->  His",
        items: [
          { q: "Boy Bear has a bike. ___ bike is red.", options: ["His", "Her"], answer: "His" },
          { q: "Girl Bear has a hat. ___ hat is blue.", options: ["His", "Her"], answer: "Her" },
          { q: "Is ___ home in the city? (I ask you.)", options: ["your", "her"], answer: "your" },
          { q: "Grandma has a cornfield. ___ cornfield is big.", options: ["His", "Her"], answer: "Her" },
          { q: "Grandpa has a car. ___ car is old.", options: ["His", "Her"], answer: "His" },
          { q: "Is ___ street quiet? (I ask you.)", options: ["your", "his"], answer: "your" },
          { q: "The mouse is a girl. ___ home is small.", options: ["His", "Her"], answer: "Her" },
          { q: "Which sentence is right?", options: ["Her house is new.", "Him house is new."], answer: "Her house is new." },
        ],
      },
      {
        level: "Core",
        instructions: "Write his, her or your.",
        example: "Boy Bear has a cap. ___ cap is red.  ->  His",
        items: [
          { q: "Girl Bear has a bag. ___ bag is green.", answer: "Her" },
          { q: "Boy Bear has a bed. ___ bed is big.", answer: "His" },
          { q: "I ask my friend: Is ___ house new?", answer: "your" },
          { q: "Grandma has a cat. ___ cat is black.", answer: "Her" },
          { q: "City Mouse is a boy. ___ home is in the city.", answer: "His" },
          { q: "I ask my friend: Is ___ neighborhood noisy?", answer: "your" },
          { q: "Country Mouse is a girl. ___ home is in the country.", answer: "Her" },
          { q: "Grandpa has a hat. ___ hat is old.", answer: "His" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence with his, her or your.",
        example: "Boy Bear / house / old  ->  His house is old.",
        items: [
          { q: "Write about Boy Bear's bike. Use His.", answer: "e.g. His bike is red." },
          { q: "Write about Girl Bear's house. Use Her.", answer: "e.g. Her house is big." },
          { q: "Ask your friend about a street. Use Is your ...?", answer: "e.g. Is your street quiet?" },
          { q: "Write about Grandma's cornfield. Use Her.", answer: "e.g. Her cornfield is green." },
          { q: "Write about City Mouse's home. Use His.", answer: "e.g. His home is in the city." },
          { q: "Ask your friend about a house. Use Is your ...?", answer: "e.g. Is your house new?" },
        ],
      },
    ],
  },
];
