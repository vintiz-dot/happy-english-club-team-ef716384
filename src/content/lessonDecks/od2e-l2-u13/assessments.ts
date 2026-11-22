import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 13 (Music and Feelings): the printable
// grammar worksheet (three levels, with an answer key). The school's own writing;
// nothing from the Student Book or Workbook is reproduced.

export const odL2U13Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u13-ws-when",
    title: "When? in / at / on",
    grammar: "in the morning / afternoon / evening, at night, on Saturday",
    deckId: "od2e-l2-u13-l3",
    slide: "When? In the morning, at night, on Saturday",
    intro:
      "We say in the morning, in the afternoon and in the evening. We say at night. We say on Saturday. Ask: When do you listen to music? Answer: In the evening.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "I read ___ the morning.  (in / on)  ->  in",
        items: [
          { q: "I listen to music ___ the evening.", options: ["in", "on"], answer: "in" },
          { q: "She sleeps ___ night.", options: ["at", "in"], answer: "at" },
          { q: "We play football ___ Saturday.", options: ["on", "at"], answer: "on" },
          { q: "He plays the drum ___ the afternoon.", options: ["in", "at"], answer: "in" },
          { q: "When do you sing? ___ the morning.", options: ["In", "On"], answer: "In" },
          { q: "I yawn ___ night.", options: ["at", "on"], answer: "at" },
          { q: "They dance ___ Saturday.", options: ["on", "in"], answer: "on" },
          { q: "Which is right?", options: ["He listens to music in the evening.", "He listens to music on the evening."], answer: "He listens to music in the evening." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words (in the, at or on).",
        example: "We sing ___ ___ morning.  ->  in the",
        items: [
          { q: "I play the piano ___ ___ afternoon.", answer: "in the" },
          { q: "She listens to slow music ___ night.", answer: "at" },
          { q: "We go to the park ___ Saturday.", answer: "on" },
          { q: "He feels sleepy ___ ___ evening.", answer: "in the" },
          { q: "They sing a song ___ ___ morning.", answer: "in the" },
          { q: "When does she dance? ___ Saturday.", answer: "On" },
          { q: "Correct the mistake: I listen to music on the morning.", answer: "I listen to music in the morning." },
          { q: "Correct the mistake: He yawns in night.", answer: "He yawns at night." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence. Use the time word in brackets.",
        example: "(in the morning)  ->  I eat breakfast in the morning.",
        items: [
          { q: "Write about music. (in the afternoon)", answer: "I listen to music in the afternoon." },
          { q: "Write about sleep. (at night)", answer: "I sleep at night." },
          { q: "Write about your weekend. (on Saturday)", answer: "I play with my friends on Saturday." },
          { q: "Write a question with When. (do you sing)", answer: "When do you sing?" },
          { q: "Answer the question: When does a dog sleep? (at night)", answer: "A dog sleeps at night." },
          { q: "Write two sentences about a friend: one with in the evening and one with on Saturday.", answer: "My friend plays the drum in the evening. She dances on Saturday." },
        ],
      },
    ],
  },
];
