import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U11Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u11-ws-has-wants",
    title: "He has, she wants, he needs",
    grammar: "He / she + has, wants, needs; doesn't + short verb",
    deckId: "od2e-l1-u11-l3",
    slide: "He has, she has, he doesn't have",
    intro: "With I, you, we and they: have, want, need. With he or she: has, wants, needs. To say no, use doesn't and the short word: She doesn't have a kite.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "She ___ a kite. (have / has) -> has",
        items: [
          {
            q: "She ___ a kite.",
            options: [
              "have",
              "has"
            ],
            answer: "has"
          },
          {
            q: "He ___ a cow.",
            options: [
              "have",
              "has"
            ],
            answer: "has"
          },
          {
            q: "I ___ a hat.",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "The farmer ___ milk.",
            options: [
              "need",
              "needs"
            ],
            answer: "needs"
          },
          {
            q: "Rosie ___ a drum.",
            options: [
              "want",
              "wants"
            ],
            answer: "wants"
          },
          {
            q: "He ___ have a hat.",
            options: [
              "doesn't",
              "don't"
            ],
            answer: "doesn't"
          },
          {
            q: "They ___ a kite.",
            options: [
              "want",
              "wants"
            ],
            answer: "want"
          },
          {
            q: "She doesn't ___ a pencil.",
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
        example: "He ___ a hat. (have) -> has",
        items: [
          {
            q: "He ___ a hat. (have)",
            answer: "has"
          },
          {
            q: "She ___ a kite. (want)",
            answer: "wants"
          },
          {
            q: "The farmer ___ water. (need)",
            answer: "needs"
          },
          {
            q: "I ___ a drum. (want)",
            answer: "want"
          },
          {
            q: "She ___ have a pencil. (does not)",
            answer: "doesn't"
          },
          {
            q: "He doesn't ___ a hat. (have)",
            answer: "have"
          },
          {
            q: "We ___ milk. (need)",
            answer: "need"
          },
          {
            q: "Fix it: She have a kite.",
            answer: "She has a kite."
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write one thing a farmer has.",
            answer: "e.g. The farmer has a cow."
          },
          {
            q: "Write one thing a girl wants.",
            answer: "e.g. She wants a kite."
          },
          {
            q: "Write one thing a boy needs.",
            answer: "e.g. He needs water."
          },
          {
            q: "Fix it: He doesn't has a hat.",
            answer: "He doesn't have a hat."
          },
          {
            q: "Fix it: She want a drum.",
            answer: "She wants a drum."
          },
          {
            q: "Write two sentences about a make-believe friend: one with has and one with doesn't have.",
            answer: "e.g. She has a doll. She doesn't have a kite."
          }
        ]
      }
    ]
  }
];
