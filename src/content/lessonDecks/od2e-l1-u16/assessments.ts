import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 16 (Let's Make Music!): two printable
// grammar worksheets, questions with Are / Is + verb-ing, and contractions. Level 1
// children are 6-7, so items are very short: circle the word, finish one word, write
// one sentence. Everything is the school's own writing. Answers marked "e.g." are
// model answers for open items.

export const odL1U16Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u16-ws-are-you-singing",
    title: "Are you singing?",
    grammar: "Is / Are + verb-ing questions",
    deckId: "od2e-l1-u16-l3",
    slide: "Is she dancing? Are they singing?",
    intro: "To ask what is happening now, put Is or Are first: Is she dancing? Are they singing? Answer: Yes, she is. No, they aren't.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "___ she dancing?  (Is / Are)  ->  Is",
        items: [
          { q: "___ you singing?", options: ["Are", "Is"], answer: "Are" },
          { q: "___ he clapping?", options: ["Is", "Are"], answer: "Is" },
          { q: "___ they dancing?", options: ["Are", "Is"], answer: "Are" },
          { q: "Is she singing? Yes, she ___.", options: ["is", "are"], answer: "is" },
          { q: "Are they playing? No, they ___.", options: ["aren't", "isn't"], answer: "aren't" },
          { q: "Is the clown dancing? Yes, ___ is.", options: ["he", "they"], answer: "he" },
          { q: "Are you clapping? Yes, I ___.", options: ["am", "are"], answer: "am" },
          { q: "Which question is right?", options: ["Is she singing?", "She is singing?"], answer: "Is she singing?" },
        ],
      },
      {
        level: "Core",
        instructions: "Write Is or Are to finish the question. Then write the short answer.",
        example: "___ they dancing?  ->  Are",
        items: [
          { q: "___ you dancing?", answer: "Are" },
          { q: "___ she singing?", answer: "Is" },
          { q: "___ the children clapping?", answer: "Are" },
          { q: "___ the clown dancing?", answer: "Is" },
          { q: "Is he singing? (Yes) Yes, he ___.", answer: "is" },
          { q: "Are they clapping? (No) No, they ___.", answer: "aren't" },
          { q: "Is she dancing? (No) No, she ___.", answer: "isn't" },
          { q: "Are you singing? (Yes) Yes, I ___.", answer: "am" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one question or one answer.",
        example: "Ask about a girl dancing.  ->  Is she dancing?",
        items: [
          { q: "Ask your friend if they are singing.", answer: "Are you singing?" },
          { q: "Ask if a boy is clapping.", answer: "Is he clapping?" },
          { q: "Ask if two children are dancing.", answer: "Are they dancing?" },
          { q: "Answer: Is she singing? (Yes)", answer: "Yes, she is." },
          { q: "Answer: Are they dancing? (No)", answer: "No, they aren't." },
          { q: "Write your own question with Is.", answer: "e.g. Is the clown dancing?" },
        ],
      },
    ],
  },
  {
    id: "od2e-l1-u16-ws-contractions",
    title: "Squash two words: contractions",
    grammar: "contractions (I'm, it's, isn't)",
    deckId: "od2e-l1-u16-l4",
    slide: "Squash two words: contractions",
    intro: "A contraction squashes two words into one. The apostrophe (') takes the place of the missing letters: I am = I'm. It is = It's. Is not = isn't.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right contraction.",
        example: "I am  ->  I'm",
        items: [
          { q: "I am", options: ["I'm", "Im'"], answer: "I'm" },
          { q: "It is", options: ["It's", "Its'"], answer: "It's" },
          { q: "You are", options: ["You're", "Your"], answer: "You're" },
          { q: "She is", options: ["She's", "Shes'"], answer: "She's" },
          { q: "is not", options: ["isn't", "is'nt"], answer: "isn't" },
          { q: "are not", options: ["aren't", "are'nt"], answer: "aren't" },
          { q: "What is", options: ["What's", "Whats'"], answer: "What's" },
          { q: "That is", options: ["That's", "Thats'"], answer: "That's" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the contraction.",
        example: "I am  ->  I'm",
        items: [
          { q: "He is", answer: "He's" },
          { q: "We are", answer: "We're" },
          { q: "They are", answer: "They're" },
          { q: "It is", answer: "It's" },
          { q: "is not", answer: "isn't" },
          { q: "are not", answer: "aren't" },
          { q: "What is", answer: "What's" },
          { q: "I am", answer: "I'm" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write the sentence with a contraction.",
        example: "I am watching a parade.  ->  I'm watching a parade.",
        items: [
          { q: "Make it short: I am playing the drum.", answer: "I'm playing the drum." },
          { q: "Make it short: It is a big circus.", answer: "It's a big circus." },
          { q: "Make it short: She is not dancing.", answer: "She isn't dancing." },
          { q: "Make it short: They are not singing.", answer: "They aren't singing." },
          { q: "Write one sentence with I'm.", answer: "e.g. I'm watching a puppet show." },
          { q: "Write one sentence with It's.", answer: "e.g. It's a happy show." },
        ],
      },
    ],
  },
];
