import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U9Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u09-ws-i-have",
    title: "I have / I don't have",
    grammar: "I have, I don't have",
    deckId: "od2e-l1-u09-l3",
    slide: "Grammar: I have, I don't have",
    intro: "I, you, we and they all say have: I have a kite. To say no, use don't have: I don't have a kite. We add -s to the thing when there are two or more: two kites.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "I ___ a pet. (have / has) -> have",
        items: [
          {
            q: "I ___ a pet.",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "We ___ a kite.",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "I ___ have a bicycle.",
            options: [
              "don't",
              "doesn't"
            ],
            answer: "don't"
          },
          {
            q: "You ___ a hat.",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "They ___ have sneakers.",
            options: [
              "don't",
              "not"
            ],
            answer: "don't"
          },
          {
            q: "I have two ___.",
            options: [
              "kite",
              "kites"
            ],
            answer: "kites"
          },
          {
            q: "I have one ___.",
            options: [
              "hat",
              "hats"
            ],
            answer: "hat"
          },
          {
            q: "We don't ___ a pet.",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "I ___ a friend. (have) -> have",
        items: [
          {
            q: "I ___ a pet. (have)",
            answer: "have"
          },
          {
            q: "We ___ a kite. (have)",
            answer: "have"
          },
          {
            q: "I ___ have a bicycle. (do not)",
            answer: "don't"
          },
          {
            q: "They ___ two hats. (have)",
            answer: "have"
          },
          {
            q: "I have three ___. (kite)",
            answer: "kites"
          },
          {
            q: "You don't ___ sneakers. (have)",
            answer: "have"
          },
          {
            q: "I have two ___. (friend)",
            answer: "friends"
          },
          {
            q: "Fix it: I has a pet.",
            answer: "I have a pet."
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write one thing you have.",
            answer: "e.g. I have a red bicycle."
          },
          {
            q: "Write one thing you don't have.",
            answer: "e.g. I don't have a pet."
          },
          {
            q: "Write a sentence with a number: I have ___ ___.",
            answer: "e.g. I have three pencils."
          },
          {
            q: "Fix it: We doesn't have a kite.",
            answer: "We don't have a kite."
          },
          {
            q: "Write a sentence with We have.",
            answer: "e.g. We have two friends."
          },
          {
            q: "Write two sentences: one with I have and one with I don't have.",
            answer: "e.g. I have a hat. I don't have a kite."
          }
        ]
      }
    ]
  }
];
