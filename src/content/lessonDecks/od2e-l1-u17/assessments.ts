import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 17 (Living and Nonliving Things): the
// printable grammar worksheet for can and can't. Level 1 children are 6-7, so items
// are very short: circle the word, finish one word, write one sentence. Everything is
// the school's own writing. Answers marked "e.g." are model answers for open items.

export const odL1U17Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u17-ws-can-cant",
    title: "Can and can't",
    grammar: "can / can't",
    deckId: "od2e-l1-u17-l3",
    slide: "Can and can't",
    intro: "Use can for what a thing is able to do: A bird can fly. Use can't for what it is not able to do: A rock can't fly. Ask: Can a fish swim? Answer: Yes, it can.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "A bird ___ fly.  (can / can't)  ->  can",
        items: [
          { q: "A fish ___ swim.", options: ["can", "can't"], answer: "can" },
          { q: "A rock ___ run.", options: ["can", "can't"], answer: "can't" },
          { q: "A bird ___ fly.", options: ["can", "can't"], answer: "can" },
          { q: "A table ___ jump.", options: ["can", "can't"], answer: "can't" },
          { q: "Can a cat jump? Yes, it ___.", options: ["can", "can't"], answer: "can" },
          { q: "Can a chair run? No, it ___.", options: ["can", "can't"], answer: "can't" },
          { q: "A plant ___ grow.", options: ["can", "can't"], answer: "can" },
          { q: "Which sentence is right?", options: ["A dog can run.", "A dog can runs."], answer: "A dog can run." },
        ],
      },
      {
        level: "Core",
        instructions: "Write can or can't.",
        example: "A bird ___ fly.  ->  can",
        items: [
          { q: "A fish ___ swim.", answer: "can" },
          { q: "A toy car ___ breathe.", answer: "can't" },
          { q: "A rabbit ___ jump.", answer: "can" },
          { q: "A pencil ___ walk.", answer: "can't" },
          { q: "Can a bird fly? Yes, it ___.", answer: "can" },
          { q: "Can a rock grow? No, it ___.", answer: "can't" },
          { q: "I ___ clap my hands.", answer: "can" },
          { q: "A bench ___ move.", answer: "can't" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence or one answer.",
        example: "bird / fly  ->  A bird can fly.",
        items: [
          { q: "Write one thing a fish can do.", answer: "e.g. A fish can swim." },
          { q: "Write one thing a rock can't do.", answer: "e.g. A rock can't run." },
          { q: "Write one thing you can do.", answer: "e.g. I can jump." },
          { q: "Write a question with Can about a cat.", answer: "e.g. Can a cat jump?" },
          { q: "Answer: Can a table run? (No)", answer: "No, it can't." },
          { q: "Write one thing a plant can do.", answer: "e.g. A plant can grow." },
        ],
      },
    ],
  },
];
