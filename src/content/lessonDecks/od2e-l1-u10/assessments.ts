import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U10Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u10-ws-do-you-have",
    title: "Do you have ...?",
    grammar: "Do you have ...? Yes, I do. No, I don't.",
    deckId: "od2e-l1-u10-l3",
    slide: "Do you have...?",
    intro: "To ask, put Do first: Do you have a pot? To say yes, answer Yes, I do. To say no, answer No, I don't. To ask what, say What do you have?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "___ you have a pot? (Do / Does) -> Do",
        items: [
          {
            q: "___ you have a pot?",
            options: [
              "Do",
              "Does"
            ],
            answer: "Do"
          },
          {
            q: "Do you ___ a ruler?",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "Yes, I ___.",
            options: [
              "do",
              "does"
            ],
            answer: "do"
          },
          {
            q: "No, I ___.",
            options: [
              "don't",
              "doesn't"
            ],
            answer: "don't"
          },
          {
            q: "Do you have carrots? Yes, I ___.",
            options: [
              "do",
              "don't"
            ],
            answer: "do"
          },
          {
            q: "What do you ___?",
            options: [
              "have",
              "has"
            ],
            answer: "have"
          },
          {
            q: "I ___ carrots.",
            options: [
              "have",
              "do"
            ],
            answer: "have"
          },
          {
            q: "Do you have a stone? ___, I don't.",
            options: [
              "No",
              "Yes"
            ],
            answer: "No"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "___ you have a pot? -> Do",
        items: [
          {
            q: "___ you have a ruler?",
            answer: "Do"
          },
          {
            q: "Do you ___ a pencil?",
            answer: "have"
          },
          {
            q: "Yes, I ___.",
            answer: "do"
          },
          {
            q: "No, I ___.",
            answer: "don't"
          },
          {
            q: "What do you ___?",
            answer: "have"
          },
          {
            q: "I ___ onions. (have)",
            answer: "have"
          },
          {
            q: "Do you have potatoes? Write Yes.",
            answer: "Yes, I do."
          },
          {
            q: "Fix it: Does you have a pot?",
            answer: "Do you have a pot?"
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write a question: ask a friend if they have a pencil.",
            answer: "Do you have a pencil?"
          },
          {
            q: "Write a short answer: No.",
            answer: "No, I don't."
          },
          {
            q: "Write a question with What.",
            answer: "What do you have?"
          },
          {
            q: "Answer it: I have ___.",
            answer: "e.g. I have carrots."
          },
          {
            q: "Fix it: Do you has a pot?",
            answer: "Do you have a pot?"
          },
          {
            q: "Write a question and a Yes answer about soup food.",
            answer: "e.g. Do you have onions? Yes, I do."
          }
        ]
      }
    ]
  }
];
