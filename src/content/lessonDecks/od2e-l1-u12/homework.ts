import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 12 "Wants and Needs":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U12Creative: Record<string, Creative> = {
  "od2e-l1-u12-l1": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: [
        "job",
        "doctor",
        "police officer",
        "teacher",
        "help",
        "water"
      ],
      grammar: [
        "This is a ___.",
        "It helps ___.",
        "I think the ___ is useful."
      ]
    },
    base: {
      title: "A new helper job",
      task: "Invent a new helper job for a robot or an animal. Draw it. Write what it does.",
      steps: [
        "Think of a helper: a robot or an animal.",
        "Draw your helper at work.",
        "Give the job a name.",
        "Copy and finish: This is a ___. It helps ___.",
        "Say to someone at home why this helper is useful."
      ],
      frames: [
        "This is a ___.",
        "It helps ___.",
        "It has a job.",
        "I think the ___ is useful because ___."
      ],
      success: [
        "I can draw a new helper.",
        "I can write: This is a ___. It helps ___.",
        "I can say why it is useful."
      ],
      challenge: "Choose the most useful helper for our school. Write: I think the ___ is useful because ___."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A helper at the stadium",
          task: "Invent a new helper job at the Emirates Stadium for a robot or an animal. Draw it. Write what it does.",
          steps: [
            "Think of a helper at the Gunners' stadium: a robot or an animal.",
            "Draw your helper at work on match day.",
            "Give the job a name.",
            "Copy and finish: This is a ___. It helps ___.",
            "Say to someone at home why this helper is useful."
          ],
          frames: [
            "This is a ___.",
            "It helps the fans ___.",
            "It has a job.",
            "I think the ___ is useful because ___."
          ],
          success: [
            "I can draw a new stadium helper.",
            "I can write: This is a ___. It helps ___.",
            "I can say why it is useful."
          ],
          challenge: "Choose the most useful helper at a football match. Write: I think the ___ is useful because ___."
        }
      }
    ]
  },
  "od2e-l1-u12-l2": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: [
        "want",
        "need",
        "home",
        "food",
        "store",
        "safe"
      ],
      grammar: [
        "I need ___.",
        "I want ___."
      ]
    },
    base: {
      title: "One need and one want",
      task: "Draw one thing you need and one thing you want. Write one sentence for each. Choose one and say why.",
      steps: [
        "Fold a paper in two.",
        "Draw a thing you need on one side, for example food or a home.",
        "Draw a thing you want on the other side, for example a toy.",
        "Copy and finish: I need ___. I want ___.",
        "Choose one and tell someone at home why."
      ],
      frames: [
        "I need ___.",
        "I want ___.",
        "I need ___ because ___.",
        "I want ___ because ___."
      ],
      success: [
        "I can draw a need and a want.",
        "I can write: I need ___. I want ___.",
        "I can say why."
      ],
      challenge: "Draw four pictures: a farm, a truck, a store and a home. Write one sentence for each picture."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A fan's need and want",
          task: "Draw one thing a Gunners fan needs on match day and one thing the fan wants. Write one sentence for each. Choose one and say why.",
          steps: [
            "Fold a paper in two.",
            "Draw a thing the fan needs on one side, for example water or a safe seat.",
            "Draw a thing the fan wants on the other side, for example a new scarf.",
            "Copy and finish: I need ___. I want ___.",
            "Choose one and tell someone at home why."
          ],
          frames: [
            "I need ___.",
            "I want ___.",
            "A fan needs ___ because ___.",
            "I want ___ because ___."
          ],
          success: [
            "I can draw a need and a want.",
            "I can write: I need ___. I want ___.",
            "I can say why."
          ],
          challenge: "Draw four pictures: a farm, a truck, a store and a stadium. Write one sentence for each picture."
        }
      }
    ]
  },
  "od2e-l1-u12-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "has",
        "wants",
        "needs",
        "pencil",
        "does",
        "boy",
        "girl"
      ],
      grammar: [
        "She has ___. She wants ___.",
        "Does she have ___? Yes, she does."
      ]
    },
    base: {
      title: "A child in my story",
      task: "Make up a boy or a girl for a story. Draw them with something they have and something they want. Write two sentences.",
      steps: [
        "Make up a story child. Give them a name.",
        "Draw the child.",
        "Draw one thing the child has and one thing the child wants.",
        "Copy and finish: She has ___. She wants ___. (or He)",
        "Ask someone at home: Does she have ___? Hear the answer: Yes, she does."
      ],
      frames: [
        "She / He has ___.",
        "She / He wants ___.",
        "Does she / he have ___?",
        "Yes, she / he does."
      ],
      success: [
        "I can draw a story child with a thing they have and want.",
        "I can write has and wants sentences.",
        "I can ask: Does she have ___?"
      ],
      challenge: "Say if the thing the child wants is a need or a want, and why."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A young Gunners fan",
          task: "Make up a boy or a girl who loves the Gunners. Draw them with something they have and something they want. Write two sentences.",
          steps: [
            "Make up a young fan. Give them a name.",
            "Draw the fan in red and white.",
            "Draw one thing the fan has and one thing the fan wants.",
            "Copy and finish: She has ___. She wants ___. (or He)",
            "Ask someone at home: Does she have ___? Hear the answer: Yes, she does."
          ],
          frames: [
            "She / He has ___.",
            "She / He wants ___.",
            "Does she / he have ___?",
            "Yes, she / he does."
          ],
          success: [
            "I can draw a young fan with a thing they have and want.",
            "I can write has and wants sentences.",
            "I can ask: Does she have ___?"
          ],
          challenge: "Say if the thing the fan wants is a need or a want, and why."
        }
      }
    ]
  },
  "od2e-l1-u12-l4": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "sandwich",
        "grapes",
        "juice",
        "cookie",
        "chips",
        "need",
        "want"
      ],
      grammar: [
        "We need ___.",
        "We want ___.",
        "The ___ ___s."
      ]
    },
    base: {
      title: "A picnic for a friend",
      task: "Make up a picnic for a toy or an animal friend. Draw it. Write what you need and what you want.",
      steps: [
        "Choose a toy or an animal friend.",
        "Draw the picnic: a sandwich, grapes, juice or a cookie.",
        "Think: what do we need? What do we want?",
        "Copy and finish: We need ___. We want ___.",
        "Say which picnic food is best for your friend, and why."
      ],
      frames: [
        "We need ___.",
        "We want ___.",
        "The ___ eats ___.",
        "The best food is ___ because ___."
      ],
      success: [
        "I can draw a picnic for a friend.",
        "I can write: We need ___. We want ___.",
        "I can say which food is best."
      ],
      challenge: "Write a sentence with a naming word and an action word, like: The rabbit eats grapes. Circle the naming word."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match-day picnic",
          task: "Make up a picnic for a Gunners fan on match day. Draw it. Write what you need and what you want.",
          steps: [
            "Choose a fan: a person, a toy or an animal in red and white.",
            "Draw the picnic: a sandwich, grapes, juice or a cookie.",
            "Think: what do we need? What do we want?",
            "Copy and finish: We need ___. We want ___.",
            "Say which picnic food is best for the fan, and why."
          ],
          frames: [
            "We need ___.",
            "We want ___.",
            "The fan eats ___.",
            "The best food is ___ because ___."
          ],
          success: [
            "I can draw a match-day picnic.",
            "I can write: We need ___. We want ___.",
            "I can say which food is best."
          ],
          challenge: "Write a sentence with a naming word and an action word, like: The fan drinks juice. Circle the naming word."
        }
      }
    ]
  },
  "od2e-l1-u12-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: [
        "needs",
        "wants",
        "chart",
        "food",
        "water",
        "home"
      ],
      grammar: [
        "___ needs ___.",
        "___ wants ___."
      ]
    },
    base: {
      title: "A needs and wants chart",
      task: "Make up a person for a story. Make a small chart with two needs and two wants. Say why they need or want one thing.",
      steps: [
        "Make up a story person. Give them a name.",
        "Draw a chart with two columns: Needs and Wants.",
        "Draw two needs and two wants.",
        "Copy and finish: ___ needs ___. ___ wants ___.",
        "Choose one thing and tell someone at home why they need or want it."
      ],
      frames: [
        "___ needs ___.",
        "___ wants ___.",
        "They need ___ because ___.",
        "They want ___ because ___."
      ],
      success: [
        "I can make a chart with two needs and two wants.",
        "I can write: ___ needs ___.",
        "I can say why."
      ],
      challenge: "Write three sentences about your person: one need, one want and one helper. Say if a want could ever be a need."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A fan's needs and wants chart",
          task: "Make up a Gunners fan for a story. Make a small chart with two needs and two wants. Say why they need or want one thing.",
          steps: [
            "Make up a Gunners fan. Give them a name.",
            "Draw a chart with two columns: Needs and Wants.",
            "Draw two needs and two wants for match day.",
            "Copy and finish: ___ needs ___. ___ wants ___.",
            "Choose one thing and tell someone at home why they need or want it."
          ],
          frames: [
            "___ needs ___.",
            "___ wants ___.",
            "They need ___ because ___.",
            "They want ___ because ___."
          ],
          success: [
            "I can make a chart with two needs and two wants.",
            "I can write: ___ needs ___.",
            "I can say why."
          ],
          challenge: "Write three sentences about your fan: one need, one want and one helper. Say if a want could ever be a need."
        }
      }
    ]
  },

  // Lesson 6: Grammar Champions (Does she have it? What does he want?)
  "od2e-l1-u12-l6": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["need", "want", "water", "money", "clothes", "help"],
      grammar: ["She has ___. He wants ___.", "Does she have ___? Yes, she does."],
    },
    base: {
      title: "My story friend's pocket",
      task: "Make up a story friend. Draw them with something they have and something they want. Write two sentences. Then say if the thing they want is a need or a want, and why.",
      steps: [
        "Make up a story friend, a boy or a girl or an animal. Give them a name.",
        "Draw your friend with one thing they have and one thing they want.",
        "Copy and finish: She has ___. He wants ___. (use she or he)",
        "Ask someone at home: Does she have ___? Hear the answer: Yes, she does.",
        "Say: is the thing a need or a want? Why?",
      ],
      frames: ["She / He has ___.", "She / He wants ___.", "Does she / he have ___?", "It is a need / want because ___."],
      success: ["I can draw a story friend with a thing they have and a thing they want.", "I can write has and wants with an s.", "I can say if it is a need or a want."],
      challenge: "Write one more friend who needs something. Ask: Does he need ___? Write the answer and say who can help.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A young player's pocket",
          task: "Make up a young football player for a story. Draw them with something they have and something they want. Write two sentences. Then say if the thing they want is a need or a want, and why.",
          steps: [
            "Make up a young player. Give them a name.",
            "Draw the player in red and white with one thing they have and one thing they want.",
            "Copy and finish: She has ___. He wants ___. (use she or he)",
            "Ask someone at home: Does she have ___? Hear the answer: Yes, she does.",
            "Say: is the thing a need or a want? Why?",
          ],
          frames: ["She / He has ___.", "She / He wants ___.", "Does she / he have ___?", "It is a need / want because ___."],
          success: ["I can draw a young player with a thing they have and a thing they want.", "I can write has and wants with an s.", "I can say if it is a need or a want."],
          challenge: "Write one more player who needs something. Ask: Does he need ___? Write the answer and say who can help.",
        },
      },
    ],
  },
};
