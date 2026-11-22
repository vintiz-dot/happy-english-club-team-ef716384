import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U12Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u12-ws-does-she",
    title: "Does she have it? What does he want?",
    grammar: "Does he / she ...? What does he / she want?",
    deckId: "od2e-l1-u12-l3",
    slide: "Does she have it? What does he want?",
    intro: "To ask about he or she, use does and the short word: Does she have a pencil? Answer Yes, she does. or No, she doesn't. In a plain sentence, add s: She has a pencil. He wants a kite.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "___ she have a pencil? (Do / Does) -> Does",
        items: [
          {
            q: "___ she have a pencil?",
            options: [
              "Do",
              "Does"
            ],
            answer: "Does"
          },
          {
            q: "Does he ___ a kite?",
            options: [
              "want",
              "wants"
            ],
            answer: "want"
          },
          {
            q: "Yes, she ___.",
            options: [
              "does",
              "do"
            ],
            answer: "does"
          },
          {
            q: "No, he ___.",
            options: [
              "doesn't",
              "don't"
            ],
            answer: "doesn't"
          },
          {
            q: "What does he ___?",
            options: [
              "want",
              "wants"
            ],
            answer: "want"
          },
          {
            q: "He ___ a kite.",
            options: [
              "want",
              "wants"
            ],
            answer: "wants"
          },
          {
            q: "She ___ a pencil.",
            options: [
              "have",
              "has"
            ],
            answer: "has"
          },
          {
            q: "Does she have it? ___, she does.",
            options: [
              "Yes",
              "No"
            ],
            answer: "Yes"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "___ he want a kite? -> Does",
        items: [
          {
            q: "___ she have a pencil?",
            answer: "Does"
          },
          {
            q: "Does he ___ water? (need)",
            answer: "need"
          },
          {
            q: "Yes, she ___.",
            answer: "does"
          },
          {
            q: "No, he ___.",
            answer: "doesn't"
          },
          {
            q: "What does she ___? (want)",
            answer: "want"
          },
          {
            q: "She ___ a red pencil. (have)",
            answer: "has"
          },
          {
            q: "He ___ a kite. (want)",
            answer: "wants"
          },
          {
            q: "Fix it: Does she has a pencil?",
            answer: "Does she have a pencil?"
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write a question: ask if a boy has a kite.",
            answer: "Does he have a kite?"
          },
          {
            q: "Write a short answer: Yes.",
            answer: "Yes, he does."
          },
          {
            q: "Write a question with What about a girl.",
            answer: "What does she want?"
          },
          {
            q: "Answer it: She ___.",
            answer: "e.g. She wants a kite."
          },
          {
            q: "Fix it: What does he likes?",
            answer: "What does he like?"
          },
          {
            q: "Write a question and an answer about a story child.",
            answer: "e.g. Does she have a hat? No, she doesn't."
          }
        ]
      }
    ]
  },
  {
    id: "od2e-l1-u12-ws-naming-action",
    title: "Naming word + action word",
    grammar: "Naming word + action word (with and without -s)",
    deckId: "od2e-l1-u12-l4",
    slide: "Naming word + action word",
    intro: "A sentence needs a who or a what (naming word) and a doing word (action word). One person: add s: The farmer runs. More than one: no s: The farmers run.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "The farmer ___. (run / runs) -> runs",
        items: [
          {
            q: "The farmer ___.",
            options: [
              "run",
              "runs"
            ],
            answer: "runs"
          },
          {
            q: "The farmers ___.",
            options: [
              "run",
              "runs"
            ],
            answer: "run"
          },
          {
            q: "The teacher ___ children.",
            options: [
              "help",
              "helps"
            ],
            answer: "helps"
          },
          {
            q: "Doctors ___ people.",
            options: [
              "help",
              "helps"
            ],
            answer: "help"
          },
          {
            q: "Which is the naming word? The cow eats.",
            options: [
              "cow",
              "eats"
            ],
            answer: "cow"
          },
          {
            q: "Which is the action word? The girl drinks juice.",
            options: [
              "girl",
              "drinks"
            ],
            answer: "drinks"
          },
          {
            q: "The boy ___ a sandwich.",
            options: [
              "eat",
              "eats"
            ],
            answer: "eats"
          },
          {
            q: "The children ___ chips.",
            options: [
              "eat",
              "eats"
            ],
            answer: "eat"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "The farmer ___. (run) -> runs",
        items: [
          {
            q: "The farmer ___. (run)",
            answer: "runs"
          },
          {
            q: "The farmers ___. (run)",
            answer: "run"
          },
          {
            q: "The doctor ___ people. (help)",
            answer: "helps"
          },
          {
            q: "Teachers ___ children. (help)",
            answer: "help"
          },
          {
            q: "The girl ___ juice. (drink)",
            answer: "drinks"
          },
          {
            q: "The boys ___ grapes. (eat)",
            answer: "eat"
          },
          {
            q: "Write the naming word: The cow eats.",
            answer: "cow"
          },
          {
            q: "Fix it: The farmer run.",
            answer: "The farmer runs."
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write a sentence about one farmer.",
            answer: "e.g. The farmer grows food."
          },
          {
            q: "Write a sentence about two farmers.",
            answer: "e.g. The farmers grow food."
          },
          {
            q: "Write a sentence about a doctor with a naming word and an action word.",
            answer: "e.g. The doctor helps people."
          },
          {
            q: "Fix it: The teachers helps children.",
            answer: "The teachers help children."
          },
          {
            q: "Write a sentence about your picnic food.",
            answer: "e.g. The children eat sandwiches."
          },
          {
            q: "Write two sentences: one with a person and one with two people.",
            answer: "e.g. The cook drinks juice. The cooks eat cookies."
          }
        ]
      }
    ]
  }
];
