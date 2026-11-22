import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 13 (Where Do We Live?): the printable
// grammar worksheet for possessive 's. Level 1 children are 6-7, so items are very
// short: circle the word, finish one word, write one sentence. Everything is the
// school's own writing. Answers marked "e.g." are model answers for open items.

export const odL1U13Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u13-ws-possessive-s",
    title: "Whose is it? ('s)",
    grammar: "possessive 's",
    deckId: "od2e-l1-u13-l3",
    slide: "Grammar: Whose is it?",
    intro: "We add 's to a name to show who has something: Tom's bag. Mia's house. Ask: Whose is it? Answer: It's Tom's.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "This is Tom___ bag.  ('s / is)  ->  's",
        items: [
          { q: "This is Mia___ house.", options: ["'s", "is"], answer: "'s" },
          { q: "Tom___ bag is red.", options: ["'s", "are"], answer: "'s" },
          { q: "Whose is it? It's ___ pencil.", options: ["Ann's", "Ann"], answer: "Ann's" },
          { q: "This is ___ ball.", options: ["Dan's", "Dan"], answer: "Dan's" },
          { q: "Is this ___ book?", options: ["Lily's", "Lily"], answer: "Lily's" },
          { q: "It's ___ hat.", options: ["Sam's", "Sam"], answer: "Sam's" },
          { q: "___ house is big.", options: ["Mia's", "Mia"], answer: "Mia's" },
          { q: "Which sentence is right?", options: ["It's Tom's bag.", "It's Tom bag."], answer: "It's Tom's bag." },
        ],
      },
      {
        level: "Core",
        instructions: "Write 's or the name with 's to finish the sentence.",
        example: "This is Tom___ house.  ->  's",
        items: [
          { q: "This is Mia___ bag.", answer: "'s" },
          { q: "Whose is it? It's Dan___.", answer: "'s" },
          { q: "This is the cat___ bed.", answer: "'s" },
          { q: "Is this Ann___ pencil?", answer: "'s" },
          { q: "Whose house? It's ___ house. (Lily)", answer: "Lily's" },
          { q: "Whose bag? It's ___ bag. (Sam)", answer: "Sam's" },
          { q: "Whose hat? It's ___ hat. (Tom)", answer: "Tom's" },
          { q: "Whose ball? It's ___ ball. (Mia)", answer: "Mia's" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence with 's.",
        example: "Look at a bag. Whose is it?  ->  It's Tom's bag.",
        items: [
          { q: "Write a sentence about a friend's house.", answer: "e.g. This is Mia's house." },
          { q: "Write a sentence about a friend's bag.", answer: "e.g. It's Tom's bag." },
          { q: "Write a sentence about the teacher's book.", answer: "e.g. This is the teacher's book." },
          { q: "Write a question: Is this ___'s pencil?", answer: "e.g. Is this Ann's pencil?" },
          { q: "Answer: Is this Dan's ball? (Yes)", answer: "Yes, it is." },
          { q: "Write a sentence about your toy's house.", answer: "e.g. This is Teddy's house." },
        ],
      },
    ],
  },
];
