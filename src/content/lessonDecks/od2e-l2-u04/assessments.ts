// Oxford Discover 2nd edition, Level 2, Unit 4 (Mix It Up): the printable grammar worksheets
// for was and were (yesterday) and for contractions with n't, each in three levels with an
// answer key. Everything here is the school's own writing; nothing from the Student Book or
// Workbook is reproduced. Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U04Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u04-ws-was-were",
    title: "was and were: yesterday",
    grammar: "was / were, questions and short answers",
    deckId: "od2e-l2-u04-l3",
    slide: "Was and were: talking about yesterday",
    intro:
      "Use was with I, he, she, it and one thing: The cake was good. Use were with you, we, they and more than one thing: The snacks were good. Questions: Was it cold? Yes, it was. No, it wasn't. Were they ready? Yes, they were.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle was or were. Then read the sentence aloud.",
        example: "The ice cream ___ cold. (was / were)  ->  was",
        items: [
          { q: "The party ___ yesterday.", options: ["was", "were"], answer: "was" },
          { q: "The children ___ at the party.", options: ["was", "were"], answer: "were" },
          { q: "I ___ very happy.", options: ["was", "were"], answer: "was" },
          { q: "We ___ in the kitchen.", options: ["was", "were"], answer: "were" },
          { q: "The sugar ___ in the bowl.", options: ["was", "were"], answer: "was" },
          { q: "___ the cake sweet? Yes, it was.", options: ["Was", "Were"], answer: "Was" },
          { q: "___ they at school? Yes, they were.", options: ["Was", "Were"], answer: "Were" },
          { q: "Which sentence is correct?", options: ["The plastic bags were closed.", "The plastic bags was closed."], answer: "The plastic bags were closed." },
        ],
      },
      {
        level: "Core",
        instructions: "Write was or were. Then finish the short answers and questions.",
        example: "The mixture ___ cold.  ->  was",
        items: [
          { q: "The ice cream ___ in the freezer.", answer: "was" },
          { q: "My friends ___ at my house yesterday.", answer: "were" },
          { q: "You ___ very kind to your sister.", answer: "were" },
          { q: "___ the cream cold? Yes, it ___.", answer: "Was ... was" },
          { q: "___ the bags open? No, they ___n't.", answer: "Were ... were" },
          { q: "Write a question: Where / the sugar?", answer: "Where was the sugar?" },
          { q: "Write a question: Where / your friends?", answer: "Where were your friends?" },
          { q: "Correct the mistake: The children was happy.", answer: "The children were happy." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Check was and were every time.",
        example: "(the party, fun)  ->  The party was fun.",
        items: [
          { q: "(the children, hungry, yesterday)", answer: "e.g. The children were hungry yesterday." },
          { q: "(the salt, in the bag)", answer: "e.g. The salt was in the bag." },
          { q: "Ask a question with Where about two things: (the cups)", answer: "Where were the cups?" },
          { q: "Answer: Was the mixture cold? (No)", answer: "No, it wasn't." },
          { q: "Answer: Were the bags closed? (Yes)", answer: "Yes, they were." },
          { q: "Write two sentences about a party you went to: one with was and one with were.", answer: "e.g. The food was good. The games were fun." },
        ],
      },
    ],
  },
  {
    id: "od2e-l2-u04-ws-contractions",
    title: "Contractions: isn't, aren't, wasn't, weren't",
    grammar: "contractions with n't",
    deckId: "od2e-l2-u04-l4",
    slide: "Contractions: two words in one",
    intro:
      "A contraction puts two words into one. The o goes and a little mark (an apostrophe) takes its place: is not = isn't, are not = aren't, was not = wasn't, were not = weren't. They mean the same thing.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the sentence aloud.",
        example: "is not = ___  (isn't / is'nt)  ->  isn't",
        items: [
          { q: "was not =", options: ["wasn't", "was'nt"], answer: "wasn't" },
          { q: "are not =", options: ["aren't", "arent"], answer: "aren't" },
          { q: "were not =", options: ["weren't", "wer'nt"], answer: "weren't" },
          { q: "The ice cream ___ hot. It is cold.", options: ["isn't", "aren't"], answer: "isn't" },
          { q: "The bags ___ open. They are closed.", options: ["aren't", "isn't"], answer: "aren't" },
          { q: "I ___ at school yesterday. I was ill.", options: ["wasn't", "weren't"], answer: "wasn't" },
          { q: "We ___ late. We were on time.", options: ["weren't", "wasn't"], answer: "weren't" },
          { q: "Which one is correct?", options: ["It isn't salty.", "It is'nt salty."], answer: "It isn't salty." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the contraction. Then write the two words it comes from.",
        example: "was not  ->  wasn't",
        items: [
          { q: "is not", answer: "isn't" },
          { q: "are not", answer: "aren't" },
          { q: "were not", answer: "weren't" },
          { q: "wasn't =", answer: "was not" },
          { q: "aren't =", answer: "are not" },
          { q: "Write the sentence with a contraction: The pasta is not hot.", answer: "The pasta isn't hot." },
          { q: "Write the sentence with a contraction: The cups were not full.", answer: "The cups weren't full." },
          { q: "Correct the mistake: The salad wasnt big.", answer: "The salad wasn't big." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Use a contraction and circle the apostrophe.",
        example: "(the tea, hot)  ->  The tea isn't hot.",
        items: [
          { q: "(the fruit, sweet) with isn't", answer: "e.g. The fruit isn't sweet." },
          { q: "(the vegetables, soft) with aren't", answer: "e.g. The vegetables aren't soft." },
          { q: "(the pasta, ready, yesterday) with wasn't", answer: "e.g. The pasta wasn't ready yesterday." },
          { q: "(the bags, closed, yesterday) with weren't", answer: "e.g. The bags weren't closed yesterday." },
          { q: "Write a true sentence about your lunch with isn't or wasn't.", answer: "e.g. My lunch wasn't cold." },
          { q: "Make a sentence with but: (the cake, hot) (the ice cream, cold)", answer: "e.g. The cake isn't cold, but the ice cream is." },
        ],
      },
    ],
  },
];
