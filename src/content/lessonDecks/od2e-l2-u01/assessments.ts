// Oxford Discover 2nd edition, Level 2, Unit 1 (Amazing Animals): the printable grammar
// worksheet for They, it and them, in three levels with an answer key. Everything here is
// the school's own writing; nothing from the Student Book or Workbook is reproduced.
// Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U01Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u01-ws-they",
    title: "They, it and them",
    grammar: "they / it / them",
    deckId: "od2e-l2-u01-l3",
    slide: "They, it and them",
    intro:
      "We use it for one animal and they for more than one. They does the action: They swim. Them gets the action: Fins help them swim. Fish have gills. They breathe in water. Gills help them breathe.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "Birds have wings. ___ can fly. (They / It)  ->  They",
        items: [
          { q: "Fish have scales. ___ are shiny.", options: ["They", "It"], answer: "They" },
          { q: "A frog has wet skin. ___ lives near water.", options: ["It", "They"], answer: "It" },
          { q: "Feathers keep birds warm. Feathers keep ___ warm.", options: ["them", "they"], answer: "them" },
          { q: "Wings help birds. Wings help ___.", options: ["them", "they"], answer: "them" },
          { q: "A cat has fur. ___ is soft.", options: ["It", "Them"], answer: "It" },
          { q: "Fins help fish. Fins help ___ swim.", options: ["them", "it"], answer: "them" },
          { q: "Frogs jump. ___ have strong legs.", options: ["They", "Them"], answer: "They" },
          { q: "Which sentence is correct?", options: ["Gills help them breathe.", "Gills help they breathe."], answer: "Gills help them breathe." },
        ],
      },
      {
        level: "Core",
        instructions: "Write It, They or them in each gap.",
        example: "Fish have gills. ___ breathe in water.  ->  They",
        items: [
          { q: "A fish has scales. ___ are shiny.", answer: "They" },
          { q: "A bird has wings. ___ can fly.", answer: "It" },
          { q: "Ducks have feathers. Feathers keep ___ warm.", answer: "them" },
          { q: "Frogs have long legs. Legs help ___ jump.", answer: "them" },
          { q: "My cat has soft fur. ___ is orange.", answer: "It" },
          { q: "Whales are mammals. ___ have babies, not eggs.", answer: "They" },
          { q: "Gills help fish. Gills help ___ breathe in water.", answer: "them" },
          { q: "A snake has no legs. ___ moves on its body.", answer: "It" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Use They, It or them. Check every word.",
        example: "Birds have wings. ___ can fly.  ->  They can fly.",
        items: [
          { q: "Fish have scales. Write what they do in water, with They.", answer: "e.g. They swim in the water." },
          { q: "A frog has strong legs. Write what it does, with It.", answer: "e.g. It jumps high." },
          { q: "Write a sentence with them, about wings and birds.", answer: "e.g. Wings help them fly." },
          { q: "Write a sentence with them, about fur and many cats.", answer: "e.g. Fur keeps them warm." },
          { q: "Correct the mistake: Fins help they swim.", answer: "Fins help them swim." },
          { q: "Correct the mistake: A bird has wings. They can fly.", answer: "A bird has wings. It can fly." },
        ],
      },
    ],
  },
];
