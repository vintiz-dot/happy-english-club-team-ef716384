import type { Worksheet } from "@/lib/lessonDecks/types";

// Printable grammar worksheets for this unit: Support, Core and Challenge, with answers.
// Original items, very short, picture-free.

export const odL1U7Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u07-ws-it-snows",
    title: "It snows / It doesn't snow",
    grammar: "It + verb with -s; It doesn't + short verb",
    deckId: "od2e-l1-u07-l3",
    slide: "It gets, it snows, it doesn't",
    intro: "After it, the action word takes an s: It snows. To say no, use doesn't and take the s away: It doesn't snow.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "It ___ in the winter. (snow / snows) -> snows",
        items: [
          {
            q: "It ___ in the winter.",
            options: [
              "snow",
              "snows"
            ],
            answer: "snows"
          },
          {
            q: "It ___ in the spring.",
            options: [
              "rain",
              "rains"
            ],
            answer: "rains"
          },
          {
            q: "It gets ___ in the summer.",
            options: [
              "hot",
              "snow"
            ],
            answer: "hot"
          },
          {
            q: "It doesn't ___ in the summer.",
            options: [
              "snow",
              "snows"
            ],
            answer: "snow"
          },
          {
            q: "It ___ get cold in the summer.",
            options: [
              "doesn't",
              "don't"
            ],
            answer: "doesn't"
          },
          {
            q: "It gets ___ in the winter.",
            options: [
              "cold",
              "hot"
            ],
            answer: "cold"
          },
          {
            q: "It ___ hot in the summer.",
            options: [
              "get",
              "gets"
            ],
            answer: "gets"
          },
          {
            q: "It doesn't ___ in the desert.",
            options: [
              "rain",
              "rains"
            ],
            answer: "rain"
          }
        ]
      },
      {
        level: "Core",
        instructions: "Write the missing word.",
        example: "It ___ in the winter. (snow) -> snows",
        items: [
          {
            q: "It ___ in the winter. (snow)",
            answer: "snows"
          },
          {
            q: "It ___ in the spring. (rain)",
            answer: "rains"
          },
          {
            q: "It ___ hot in the summer. (get)",
            answer: "gets"
          },
          {
            q: "It ___ snow in the summer. (doesn't / don't)",
            answer: "doesn't"
          },
          {
            q: "It doesn't ___ in the summer. (rain)",
            answer: "rain"
          },
          {
            q: "It ___ cool in the fall. (get)",
            answer: "gets"
          },
          {
            q: "It doesn't ___ cold in the summer. (get)",
            answer: "get"
          },
          {
            q: "Fix it: It snow in the winter.",
            answer: "It snows in the winter."
          }
        ]
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        items: [
          {
            q: "Write one thing that happens in the winter. Start with It.",
            answer: "e.g. It gets cold in the winter."
          },
          {
            q: "Write one thing that does not happen in the summer. Start with It doesn't.",
            answer: "e.g. It doesn't snow in the summer."
          },
          {
            q: "Fix it: It doesn't snows in Hanoi.",
            answer: "It doesn't snow in Hanoi."
          },
          {
            q: "Fix it: It not rain in the winter.",
            answer: "It doesn't rain in the winter."
          },
          {
            q: "Write a sentence about spring with rains.",
            answer: "e.g. It rains in the spring."
          },
          {
            q: "Write two sentences about your made-up place: one with It ___s and one with It doesn't ___.",
            answer: "e.g. It snows all year. It doesn't rain."
          }
        ]
      }
    ]
  }
];
