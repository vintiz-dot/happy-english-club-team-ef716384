// Oxford Discover 2nd edition, Level 1, Unit 6 (Animal Reserves): the printable
// grammar worksheet for What's this? and Who's that? Three levels with an answer
// key. Everything here is the school's own writing. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U6Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u06-ws-what-who",
    title: "What's this? Who's that?",
    grammar: "What's this/that? Who's this/that?",
    deckId: "od2e-l1-u06-l3",
    slide: "Grammar: What's this? Who's that?",
    intro: "Things get WHAT: What's this? It's a nest. People and animal friends get WHO: Who's that? It's Anak. This is near. That is far.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "___ this? It's a pond. (What's / Who's)  ->  What's",
        items: [
          { q: "___ this? It's a nest. (a thing)", options: ["What's", "Who's"], answer: "What's" },
          { q: "___ that? It's Dian. (a person)", options: ["What's", "Who's"], answer: "Who's" },
          { q: "___ this? It's a hive. (a thing)", options: ["What's", "Who's"], answer: "What's" },
          { q: "___ that? It's Anak, the orangutan. (an animal friend)", options: ["What's", "Who's"], answer: "Who's" },
          { q: "___ this? It is an orangutan, close to you. (an animal friend)", options: ["What's", "Who's"], answer: "Who's" },
          { q: "The tree is far away. What's ___?", options: ["this", "that"], answer: "that" },
          { q: "The ball is near. What's ___?", options: ["this", "that"], answer: "this" },
          { q: "What's means:", options: ["What is", "Who is"], answer: "What is" },
        ],
      },
      {
        level: "Core",
        instructions: "Write What's or Who's. Then answer.",
        example: "___ this? (a pond)  ->  What's this? It's a pond.",
        items: [
          { q: "___ that? (a person far away: Dian)", answer: "Who's" },
          { q: "___ this? (a thing near you: a tree)", answer: "What's" },
          { q: "___ that? (a thing far away: a nest)", answer: "What's" },
          { q: "___ this? (a toy friend near you)", answer: "Who's" },
          { q: "Write the short form: Who is", answer: "Who's" },
          { q: "Write the short form: What is", answer: "What's" },
          { q: "Answer: What's this? (a hive)", answer: "It's a hive." },
          { q: "Fix it: Who's this? It's a nest.", answer: "What's this? It's a nest." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one question or one answer.",
        example: "What's that? It's a nest.",
        items: [
          { q: "Write a question about a thing near you.", answer: "e.g. What's this?" },
          { q: "Write a question about a person far away.", answer: "e.g. Who's that?" },
          { q: "Answer: Who's that? (a friend)", answer: "e.g. It's Mai." },
          { q: "Write one question and answer about an animal in a reserve.", answer: "e.g. What's that? It's an orangutan." },
          { q: "Fix the mistake: What's that? It's Anak. (Anak is an animal friend.)", answer: "Who's that? It's Anak." },
          { q: "Write a mini talk with two lines: one question and one answer.", answer: "e.g. What's this? It's a pond." },
        ],
      },
    ],
  },
];
