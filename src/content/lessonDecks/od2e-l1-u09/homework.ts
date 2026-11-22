import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 9 "Numbers All Around":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U9Creative: Record<string, Creative> = {
  "od2e-l1-u09-l1": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: [
        "numbers",
        "plus sign",
        "equals sign",
        "problem",
        "addition",
        "answer"
      ],
      grammar: [
        "I count ___.",
        "I have ___."
      ]
    },
    base: {
      title: "Things I count at home",
      task: "Draw things you can count at home. Write a number by each one. Choose your best thing to count.",
      steps: [
        "Walk round your home with a grown-up.",
        "Pick three things to count, for example chairs, shoes or cups.",
        "Draw each thing and count it.",
        "Write the number by each picture.",
        "Put a star by the thing you like counting best and say why."
      ],
      frames: [
        "I count ___.",
        "I have ___ ___.",
        "There are ___ ___.",
        "I like counting ___ because ___."
      ],
      success: [
        "I can draw three things and count them.",
        "I can write a number by each picture.",
        "I can say which one I like counting best."
      ],
      challenge: "Make a little problem with a picture, like 3 + 2 = ? Ask someone at home for the answer."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Things I count about football",
          task: "Draw football things you can count. Write a number by each one. Choose your best thing to count.",
          steps: [
            "Pick three football things: balls, goals, boots or Gunners scarves.",
            "Draw each thing and count it.",
            "Write the number by each picture.",
            "Put a star by the thing you like counting best.",
            "Say why to someone at home."
          ],
          frames: [
            "I count ___.",
            "I have ___ ___.",
            "There are ___ ___.",
            "I like counting ___ because ___."
          ],
          success: [
            "I can draw three football things and count them.",
            "I can write a number by each picture.",
            "I can say which one I like counting best."
          ],
          challenge: "Make a little problem with football pictures, like 3 + 2 = ? Ask someone at home for the answer."
        }
      }
    ]
  },
  "od2e-l1-u09-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "number line",
        "count by twos",
        "join",
        "group",
        "same amount",
        "addition"
      ],
      grammar: [
        "___ plus ___ equals ___.",
        "I have ___ and ___."
      ]
    },
    base: {
      title: "My adding picture",
      task: "Find two small groups of things at home. Draw them. Write an adding sentence.",
      steps: [
        "Find two small groups: toys, fruit or shoes.",
        "Draw the first group. Count it.",
        "Draw the second group. Count it.",
        "Join them and count them all.",
        "Copy and finish: ___ plus ___ equals ___."
      ],
      frames: [
        "___ plus ___ equals ___.",
        "I have ___ and ___.",
        "Together, I have ___.",
        "The answer is ___."
      ],
      success: [
        "I can draw two groups.",
        "I can write an adding sentence.",
        "I can say the answer."
      ],
      challenge: "Make a problem with three groups. Write it with two plus signs and one equals sign."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Adding on the pitch",
          task: "Draw two groups of football things, for example balls and cones. Write an adding sentence.",
          steps: [
            "Choose two groups: balls and cones, or scarves and boots.",
            "Draw the first group. Count it.",
            "Draw the second group. Count it.",
            "Join them and count them all.",
            "Copy and finish: ___ plus ___ equals ___."
          ],
          frames: [
            "___ plus ___ equals ___.",
            "The Gunners have ___ and ___.",
            "Together, they have ___.",
            "The answer is ___."
          ],
          success: [
            "I can draw two groups of football things.",
            "I can write an adding sentence.",
            "I can say the answer."
          ],
          challenge: "Make a problem with three groups. Write it with two plus signs and one equals sign."
        }
      }
    ]
  },
  "od2e-l1-u09-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "pet",
        "hat",
        "kite",
        "friend",
        "bicycle",
        "sneakers"
      ],
      grammar: [
        "I have ___.",
        "I don't have ___."
      ]
    },
    base: {
      title: "My magic thing",
      task: "Make up a magic thing. Draw it. Write what you have and what you don't have.",
      steps: [
        "Think of a magic thing: a magic hat, a magic kite or magic sneakers.",
        "Draw it.",
        "Copy and finish: I have a magic ___.",
        "Write one more: I don't have a ___.",
        "Say to someone at home what your magic thing can do."
      ],
      frames: [
        "I have a magic ___.",
        "I don't have a ___.",
        "It can ___.",
        "I have two ___."
      ],
      success: [
        "I can draw a magic thing.",
        "I can write: I have a magic ___.",
        "I can write: I don't have a ___."
      ],
      challenge: "Write two I have sentences and two I don't have sentences about things in your room. Use a number in one."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My magic football thing",
          task: "Make up a magic football thing. Draw it. Write what you have and what you don't have.",
          steps: [
            "Think of a magic football thing: magic boots, a magic ball or a magic scarf.",
            "Draw it.",
            "Copy and finish: I have magic ___.",
            "Write one more: I don't have a ___.",
            "Say to someone at home what your magic thing can do for the Gunners."
          ],
          frames: [
            "I have magic ___.",
            "I don't have a ___.",
            "It can ___.",
            "I have two ___."
          ],
          success: [
            "I can draw a magic football thing.",
            "I can write: I have magic ___.",
            "I can write: I don't have a ___."
          ],
          challenge: "Write two I have sentences and two I don't have sentences about football things at home. Use a number in one."
        }
      }
    ]
  },
  "od2e-l1-u09-l4": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: [
        "backpack",
        "pencil",
        "ruler",
        "eleven",
        "twelve",
        "plus"
      ],
      grammar: [
        "I have ___ ___.",
        "I like my ___ because ___."
      ]
    },
    base: {
      title: "My packed backpack",
      task: "Draw a backpack. Put three school things in it. Say how many of each. Choose your best one.",
      steps: [
        "Draw a big backpack.",
        "Draw three school things in it, for example pencils, a ruler and a book.",
        "Write how many of each: I have two pencils.",
        "Put a star by the one you like best.",
        "Say to someone at home: I like my ___ because ___."
      ],
      frames: [
        "I have ___ ___.",
        "I have one ___.",
        "I like my ___.",
        "I like my ___ because ___."
      ],
      success: [
        "I can draw three school things and count them.",
        "I can write: I have ___ ___.",
        "I can say which one I like best."
      ],
      challenge: "Write an adding problem with number words, for example eleven plus five. Write the answer as a word."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football bag",
          task: "Draw a football bag. Put three things in it. Say how many of each. Choose your best one.",
          steps: [
            "Draw a big football bag.",
            "Draw three things in it, for example boots, a ball and a bottle.",
            "Write how many of each: I have two boots.",
            "Put a star by the one you like best.",
            "Say to someone at home: I like my ___ because ___."
          ],
          frames: [
            "I have ___ ___.",
            "I have one ___.",
            "I like my ___.",
            "I like my ___ because ___."
          ],
          success: [
            "I can draw three football things and count them.",
            "I can write: I have ___ ___.",
            "I can say which one I like best."
          ],
          challenge: "Write an adding problem about your bag with number words, for example eleven plus five. Write the answer as a word."
        }
      }
    ]
  }
};
