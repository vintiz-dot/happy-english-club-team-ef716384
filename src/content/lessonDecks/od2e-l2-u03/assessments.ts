// Oxford Discover 2nd edition, Level 2, Unit 3 (Solids, Liquids and Gases): the printable
// grammar worksheet for was and were, in three levels with an answer key. Everything here
// is the school's own writing; nothing from the Student Book or Workbook is reproduced.
// Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U03Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u03-ws-was-were",
    title: "was and were: then and now",
    grammar: "was / were",
    deckId: "od2e-l2-u03-l3",
    slide: "Was and were: then and now",
    intro:
      "Was and were tell us about before. Use was with I, he, she, it and one thing: The ice was hard. Use were with you, we, they and more than one thing: The ice cubes were hard. Now we say is or are: The ice is water now.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle was or were. Then read the sentence aloud.",
        example: "The ice ___ hard. (was / were)  ->  was",
        items: [
          { q: "The water ___ cold yesterday.", options: ["was", "were"], answer: "was" },
          { q: "The ice cubes ___ hard.", options: ["was", "were"], answer: "were" },
          { q: "I ___ at school this morning.", options: ["was", "were"], answer: "was" },
          { q: "They ___ in the kitchen.", options: ["was", "were"], answer: "were" },
          { q: "The ice pop ___ a solid. Now it is a liquid.", options: ["was", "were"], answer: "was" },
          { q: "The two balloons ___ full of gas.", options: ["was", "were"], answer: "were" },
          { q: "She ___ happy. Now she is sad.", options: ["was", "were"], answer: "was" },
          { q: "Which sentence is correct?", options: ["The icicles were long.", "The icicles was long."], answer: "The icicles were long." },
        ],
      },
      {
        level: "Core",
        instructions: "Write was or were. For the last three, write the whole sentence.",
        example: "The candle ___ tall. Now it is short.  ->  was",
        items: [
          { q: "The steam ___ hot. Now it is water.", answer: "was" },
          { q: "The ice cubes ___ solid. Now they are liquid.", answer: "were" },
          { q: "We ___ cold, so we put on coats.", answer: "were" },
          { q: "The popcorn ___ hard. Now it is soft and white.", answer: "was" },
          { q: "Make it a question: The ice was hard. (Start with Was.)", answer: "Was the ice hard?" },
          { q: "Make it a question: The balloons were big. (Start with Were.)", answer: "Were the balloons big?" },
          { q: "Correct the mistake: The ice cubes was cold.", answer: "The ice cubes were cold." },
          { q: "Correct the mistake: The water were hot.", answer: "The water was hot." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Use was or were, and say what it is like now.",
        example: "(ice pop, solid)  ->  The ice pop was a solid. Now it is a liquid.",
        items: [
          { q: "(the puddle, ice, in the morning)", answer: "e.g. The puddle was ice in the morning. Now it is water." },
          { q: "(the ice cubes, in the freezer)", answer: "e.g. The ice cubes were in the freezer. Now they are in my cup." },
          { q: "(the kettle, hot) Write one sentence with was and one with is.", answer: "e.g. The kettle was hot. Now it is cold." },
          { q: "Write a question with Were about two things in your bag.", answer: "e.g. Were your pencils in your bag?" },
          { q: "Write a short answer to this: Was the water cold? (Yes)", answer: "Yes, it was." },
          { q: "Write one true sentence about where you were yesterday afternoon.", answer: "e.g. I was at home with my family." },
        ],
      },
    ],
  },
];
