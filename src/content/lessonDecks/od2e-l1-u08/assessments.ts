import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U8Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u08-ws-i-do",
    title: "I do / I don't / Do you?",
    grammar: "I do, you do, I don't",
    deckId: "od2e-l1-u08-l3",
    slide: "I do, you do, I don't",
    intro: "I and you use the plain action word: I build. I don't build. To ask, say Do you build? The answer is Yes, I do. or No, I don't.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "I ___ a snowman. (build / builds) -> build",
        items: [
          {
            q: "I ___ a snowman.",
            options: [
              "build",
              "builds"
            ],
            answer: "build"
          },
          {
            q: "I ___ eat ice cream in the winter.",
            options: [
              "don't",
              "doesn't"
            ],
            answer: "don't"
          },
          {
            q: "Do you ___ a kite?",
            options: [
              "fly",
              "flies"
            ],
            answer: "fly"
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
            q: "You ___ flowers in the spring.",
            options: [
              "plant",
              "plants"
            ],
            answer: "plant"
          },
          {
            q: "I ___ go to the beach in the winter.",
            options: [
              "don't",
              "not"
            ],
            answer: "don't"
          },
          {
            q: "___ you make apple pie?",
            options: [
              "Do",
              "Does"
            ],
            answer: "Do"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "I ___ a swing. (make) -> make",
        items: [
          {
            q: "I ___ a swing. (make)",
            answer: "make"
          },
          {
            q: "I ___ ride a bicycle in the rain. (do not)",
            answer: "don't"
          },
          {
            q: "___ you bring a book? (Do / Does)",
            answer: "Do"
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
            q: "I don't ___ ice cream in the winter. (eat)",
            answer: "eat"
          },
          {
            q: "You ___ a tree house. (build)",
            answer: "build"
          },
          {
            q: "Fix it: I don't builds a snowman.",
            answer: "I don't build a snowman."
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write one thing you do in the summer.",
            answer: "e.g. I go to the beach in the summer."
          },
          {
            q: "Write one thing you don't do in the winter.",
            answer: "e.g. I don't fly a kite in the winter."
          },
          {
            q: "Write a question for a friend with Do you.",
            answer: "e.g. Do you eat ice cream?"
          },
          {
            q: "Answer your question: Yes or No.",
            answer: "e.g. Yes, I do. / No, I don't."
          },
          {
            q: "Fix it: Do you plants flowers?",
            answer: "Do you plant flowers?"
          },
          {
            q: "Write two sentences: one with I and one with I don't.",
            answer: "e.g. I drink hot chocolate. I don't eat ice cream."
          }
        ]
      }
    ]
  }
];
