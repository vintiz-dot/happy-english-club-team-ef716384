import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 11 "Needs and Wants":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U11Creative: Record<string, Creative> = {
  "od2e-l1-u11-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "farmer",
        "cow",
        "milk",
        "market",
        "sell",
        "buy"
      ],
      grammar: [
        "I sell ___.",
        "I buy ___."
      ]
    },
    base: {
      title: "My market",
      task: "Draw your own market. Draw three things you sell. Write one short sentence.",
      steps: [
        "Draw a market table.",
        "Draw three things you sell, for example milk, apples or hats.",
        "Give your market a name.",
        "Copy and finish: I sell ___, ___ and ___.",
        "Say which thing you sell the most of, and why."
      ],
      frames: [
        "I sell ___.",
        "I sell ___, ___ and ___.",
        "You can buy ___.",
        "I sell a lot of ___ because ___."
      ],
      success: [
        "I can draw a market with three things.",
        "I can write: I sell ___.",
        "I can say what I sell the most of."
      ],
      challenge: "Draw two things we need and two things we want. Write: We need ___. I want ___."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A market for match day",
          task: "Draw a market stall near the Emirates Stadium. Draw three things you sell to the fans. Write one short sentence.",
          steps: [
            "Draw a market stall near the stadium.",
            "Draw three things you sell, for example scarves, balls or milk.",
            "Give your stall a name.",
            "Copy and finish: I sell ___, ___ and ___.",
            "Say which thing you sell the most of, and why."
          ],
          frames: [
            "I sell ___.",
            "I sell ___, ___ and ___.",
            "The fans buy ___.",
            "I sell a lot of ___ because ___."
          ],
          success: [
            "I can draw a stall with three things.",
            "I can write: I sell ___.",
            "I can say what I sell the most of."
          ],
          challenge: "Draw two things fans need and two things fans want. Write: Fans need ___. I want ___."
        }
      }
    ]
  },
  "od2e-l1-u11-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "farmer",
        "dance",
        "hat",
        "dress",
        "money",
        "idea"
      ],
      grammar: [
        "The farmer ___.",
        "First, next, last"
      ]
    },
    base: {
      title: "A new ending for the story",
      task: "Draw your best part of the farmer story. Write one sentence. Then draw a new ending.",
      steps: [
        "Choose your best part of the story.",
        "Draw it.",
        "Copy and finish: The farmer ___.",
        "Draw a new ending. What does the farmer do?",
        "Tell someone at home your new ending."
      ],
      frames: [
        "The farmer ___.",
        "The farmer has ___.",
        "The farmer wants ___.",
        "In my ending, the farmer ___."
      ],
      success: [
        "I can draw a part of the story.",
        "I can write: The farmer ___.",
        "I can tell a new ending."
      ],
      challenge: "Write three sentences about your morning with first, next and last. Draw a picture for each one."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The farmer at the match",
          task: "Draw the farmer at a football match. Write one sentence. Then draw a new ending for the story with a football idea.",
          steps: [
            "Think: the farmer goes to watch the Gunners.",
            "Draw the farmer at the stadium.",
            "Copy and finish: The farmer ___.",
            "Draw a new ending. What idea does the farmer have?",
            "Tell someone at home your new ending."
          ],
          frames: [
            "The farmer ___.",
            "The farmer has ___.",
            "The farmer wants ___.",
            "In my ending, the farmer ___."
          ],
          success: [
            "I can draw the farmer at the match.",
            "I can write: The farmer ___.",
            "I can tell a new ending."
          ],
          challenge: "Write three sentences about your match-day morning with first, next and last. Draw a picture for each one."
        }
      }
    ]
  },
  "od2e-l1-u11-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "has",
        "wants",
        "needs",
        "kite",
        "drum",
        "pencil"
      ],
      grammar: [
        "She has ___.",
        "She wants ___.",
        "She needs ___.",
        "He doesn't have ___."
      ]
    },
    base: {
      title: "My make-believe friend",
      task: "Make up a friend. Draw them. Write what they have, want and need.",
      steps: [
        "Make up a friend. Give them a name.",
        "Draw your friend.",
        "Draw one thing they have, one thing they want and one thing they need.",
        "Copy and finish: She has ___. She wants ___. She needs ___. (or He)",
        "Say which thing your friend needs most, and why."
      ],
      frames: [
        "She / He has ___.",
        "She / He wants ___.",
        "She / He needs ___.",
        "She / He doesn't have ___."
      ],
      success: [
        "I can draw a make-believe friend.",
        "I can write has, wants and needs sentences.",
        "I can say what my friend needs most."
      ],
      challenge: "Write a sentence with doesn't have: She doesn't have ___. Say why she needs it."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My make-believe Gunners fan",
          task: "Make up a friend who loves the Gunners. Draw them. Write what they have, want and need.",
          steps: [
            "Make up a Gunners fan. Give them a name.",
            "Draw your fan in red and white.",
            "Draw one thing they have, one thing they want and one thing they need.",
            "Copy and finish: She has ___. She wants ___. She needs ___. (or He)",
            "Say which thing your fan needs most, and why."
          ],
          frames: [
            "She / He has ___.",
            "She / He wants ___.",
            "She / He needs ___.",
            "She / He doesn't have ___."
          ],
          success: [
            "I can draw a make-believe fan.",
            "I can write has, wants and needs sentences.",
            "I can say what my fan needs most."
          ],
          challenge: "Write a sentence with doesn't have: She doesn't have ___. Say why she needs it."
        }
      }
    ]
  },
  "od2e-l1-u11-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: [
        "games",
        "board game",
        "doll",
        "stickers",
        "borrow",
        "lend"
      ],
      grammar: [
        "I have ___.",
        "I want ___.",
        "Can I borrow ___?"
      ]
    },
    base: {
      title: "My swap shop",
      task: "Make up a swap shop. Draw three things you have. Choose one to swap and say what you want instead.",
      steps: [
        "Draw a swap shop table.",
        "Draw three things you have.",
        "Copy and finish for each one: I have ___.",
        "Choose one to swap. Draw what you want instead.",
        "Say why you want it."
      ],
      frames: [
        "I have ___.",
        "I want ___.",
        "Can I borrow ___?",
        "I want it because ___."
      ],
      success: [
        "I can draw three things I have.",
        "I can write: I have ___.",
        "I can say what I want to swap."
      ],
      challenge: "Write about a friend: He has ___. He wants ___. (or She) Draw your friend."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football swap shop",
          task: "Make up a swap shop for football fans. Draw three things you have. Choose one to swap and say what you want instead.",
          steps: [
            "Draw a swap shop table.",
            "Draw three football things you have, for example stickers, a ball or a scarf.",
            "Copy and finish for each one: I have ___.",
            "Choose one to swap. Draw what you want instead.",
            "Say why you want it."
          ],
          frames: [
            "I have ___.",
            "I want ___.",
            "Can I borrow ___?",
            "I want it because ___."
          ],
          success: [
            "I can draw three things I have.",
            "I can write: I have ___.",
            "I can say what I want to swap."
          ],
          challenge: "Write about a friend who loves the Gunners: He has ___. He wants ___. (or She) Draw your friend."
        }
      }
    ]
  },

  // Lesson 5: Grammar Champions (He has, she wants, he doesn't need)
  "od2e-l1-u11-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["doll", "stickers", "comic book", "board game", "buy", "sell"],
      grammar: ["He / She has ___.", "He / She wants ___.", "He / She needs ___.", "He / She doesn't ___."],
    },
    base: {
      title: "My friend's needs and wants",
      task: "Invent a make-believe friend. Draw your friend. Write what your friend has, wants and needs. Choose the one thing your friend needs the most and say why.",
      steps: [
        "Draw a make-believe friend: a dragon, a robot, a pony or a monster.",
        "Is your friend a he or a she? Write the name.",
        "Write: He / She has ___. He / She wants ___. He / She needs ___.",
        "Write one thing your friend doesn't want: He / She doesn't want ___.",
        "Choose the thing your friend needs the most and say why.",
      ],
      frames: ["He / She has ___.", "He / She wants ___.", "He / She needs ___.", "He / She doesn't want ___.", "He / She needs ___ the most because ___."],
      success: ["I can write has, wants and needs for one friend.", "I can write one sentence with doesn't and a short word.", "I can say what my friend needs most and why."],
      challenge: "Write a sentence about a friend who wants one thing but needs another: He wants ___, but he needs ___. Say which comes first.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football friend",
          task: "Invent a make-believe football friend who loves the Gunners. Draw your friend in red and white. Write what your friend has, wants and needs. Choose the one thing your friend needs the most and say why.",
          steps: [
            "Draw a make-believe football friend in red and white.",
            "Is your friend a he or a she? Write the name.",
            "Write: He / She has ___. He / She wants ___. He / She needs ___.",
            "Write one thing your friend doesn't want: He / She doesn't want ___.",
            "Choose the thing your friend needs the most and say why.",
          ],
          frames: ["He / She has a ___.", "He / She wants ___.", "He / She needs ___.", "He / She doesn't want ___.", "He / She needs ___ the most because ___."],
          success: ["I can write has, wants and needs for one friend.", "I can write one sentence with doesn't and a short word.", "I can say what my football friend needs most and why."],
          challenge: "Write a sentence about a friend who wants a new ball but needs water: He wants ___, but he needs ___. Say which comes first.",
        },
      },
    ],
  }
};
