import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 16 (Stubborn Goats): the printable grammar
// worksheet (three levels, with an answer key). The school's own writing; nothing from
// the Student Book or Workbook is reproduced.

export const odL2U16Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u16-ws-est",
    title: "The -est words",
    grammar: "superlatives: the + adjective + -est",
    deckId: "od2e-l2-u16-l3",
    slide: "The -est words: the biggest, the happiest, the best (SB 161 E)",
    intro:
      "Use the + -est for the number one: the tallest, the fastest. If it ends in y, change y to iest: the happiest. If it is short with one vowel and one letter, double it: the biggest. Remember: good, the best.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "The giraffe is the ___ animal.  (tallest / taller)  ->  tallest",
        items: [
          { q: "The elephant is the ___ land animal.", options: ["biggest", "bigest"], answer: "biggest" },
          { q: "This is the ___ story in our book.", options: ["funniest", "funnyest"], answer: "funniest" },
          { q: "A cheetah is the ___ land animal.", options: ["fastest", "faster"], answer: "fastest" },
          { q: "She is the ___ girl in my group.", options: ["happiest", "happyest"], answer: "happiest" },
          { q: "He has the ___ pencil.", options: ["longest", "longer"], answer: "longest" },
          { q: "This is the ___ ice cream. (good)", options: ["best", "goodest"], answer: "best" },
          { q: "Which is right?", options: ["The whale is the biggest animal.", "The whale is the most big animal."], answer: "The whale is the biggest animal." },
          { q: "Which is right?", options: ["He is the tallest boy in the class.", "He is tallest boy in the class."], answer: "He is the tallest boy in the class." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the -est word. Use the word in brackets.",
        example: "The giraffe is the ___ animal. (tall)  ->  tallest",
        items: [
          { q: "A rocket is the ___ thing in the sky. (fast)", answer: "fastest" },
          { q: "This is the ___ box. (big)", answer: "biggest" },
          { q: "My sister is the ___ girl in my family. (happy)", answer: "happiest" },
          { q: "That is the ___ joke. (funny)", answer: "funniest" },
          { q: "This is the ___ day of the week. (good)", answer: "best" },
          { q: "Make an -est sentence: (the tree / tall / in the park)", answer: "The tree is the tallest in the park." },
          { q: "Correct the mistake: The whale is the bigest animal.", answer: "The whale is the biggest animal." },
          { q: "Correct the mistake: She is the happyest girl.", answer: "She is the happiest girl." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence with the + -est.",
        example: "(a whale / big / animal)  ->  A whale is the biggest animal in the sea.",
        items: [
          { q: "(a cheetah / fast / land animal)", answer: "A cheetah is the fastest land animal." },
          { q: "(a giraffe / tall / animal)", answer: "A giraffe is the tallest animal." },
          { q: "(my pencil / long / in my bag)", answer: "My pencil is the longest in my bag." },
          { q: "Write a question with Which. (animal / small)", answer: "Which animal is the smallest?" },
          { q: "Write about yourself. (the best / I like)", answer: "Pizza is the best food I like." },
          { q: "Write two sentences about the funniest and the happiest thing in your class.", answer: "Our teacher is the funniest person in the class. My friend is the happiest child." },
        ],
      },
    ],
  },
];
