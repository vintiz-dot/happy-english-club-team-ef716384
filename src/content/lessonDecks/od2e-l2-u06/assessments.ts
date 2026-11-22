// Oxford Discover 2nd edition, Level 2, Unit 6 (Travel Long Ago and Now): the printable
// grammar worksheet for Did ...? questions in the simple past, in three levels with an
// answer key. Everything here is the school's own writing; nothing from the Student Book
// or Workbook is reproduced. Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U06Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u06-ws-did",
    title: "Did you ...? questions and answers",
    grammar: "simple past questions with did",
    deckId: "od2e-l2-u06-l3",
    slide: "Simple past: Did you travel by ship?",
    intro:
      "To ask about the past, use Did and the plain verb: Did you visit your aunt? Do not add -ed after did. Answer: Yes, I did. or No, I didn't. In a statement, add -ed: I visited my aunt. You can start with Where, How or What: Where did you go?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the sentence aloud.",
        example: "Did you ___ the bus? (take / took)  ->  take",
        items: [
          { q: "Did you ___ to school?", options: ["walk", "walked"], answer: "walk" },
          { q: "Did they ___ at the station?", options: ["arrive", "arrived"], answer: "arrive" },
          { q: "Did she ___ the clerk?", options: ["ask", "asked"], answer: "ask" },
          { q: "Did you visit your aunt? Yes, I ___.", options: ["did", "do"], answer: "did" },
          { q: "Did he enter the room? No, he ___.", options: ["didn't", "doesn't"], answer: "didn't" },
          { q: "Yesterday I ___ my grandpa.", options: ["visited", "visit"], answer: "visited" },
          { q: "Which question is correct?", options: ["Did you travel by ship?", "Did you travelled by ship?"], answer: "Did you travel by ship?" },
          { q: "Which answer is correct?", options: ["No, I didn't.", "No, I didn't did."], answer: "No, I didn't." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words. For the last three, write the whole sentence.",
        example: "___ you visit your aunt?  ->  Did",
        items: [
          { q: "___ you arrive late? No, I didn't.", answer: "Did" },
          { q: "Did they ___ at the clerk? (ask) Yes, they did.", answer: "ask" },
          { q: "Where ___ you go yesterday?", answer: "did" },
          { q: "Yesterday we (visit) ___ the market.", answer: "visited" },
          { q: "Last week the family (arrive) ___ at the station.", answer: "arrived" },
          { q: "Make a question: you / check / the clock", answer: "Did you check the clock?" },
          { q: "Make a question with Where: they / enter", answer: "Where did they enter?" },
          { q: "Correct the mistake: Did you visited your grandpa?", answer: "Did you visit your grandpa?" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Use the plain verb after did.",
        example: "(you, travel, by ship)  ->  Did you travel by ship?",
        items: [
          { q: "(your family, visit, the market)", answer: "e.g. Did your family visit the market?" },
          { q: "How (you, travel, to school)", answer: "e.g. How did you travel to school?" },
          { q: "Answer for yourself: Did you walk to school yesterday?", answer: "e.g. Yes, I did. / No, I didn't." },
          { q: "Write a statement about yesterday with -ed.", answer: "e.g. I visited my cousin." },
          { q: "Write a question for a grandpa about long ago, with Did.", answer: "e.g. Did you travel by bus?" },
          { q: "Write a question with How about a trip, and a short answer.", answer: "e.g. How did you arrive? We travelled by train." },
        ],
      },
    ],
  },
];
