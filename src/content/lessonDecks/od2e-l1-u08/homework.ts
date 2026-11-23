import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 8 "The Four Seasons":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U8Creative: Record<string, Creative> = {
  "od2e-l1-u08-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "build a snowman",
        "build a tree house",
        "make a swing",
        "make apple pie",
        "grow",
        "bring"
      ],
      grammar: [
        "I build a ___.",
        "I make a ___."
      ]
    },
    base: {
      title: "My own tree",
      task: "Draw your own big tree. Draw one thing to build or make at your tree. Write one short sentence.",
      steps: [
        "Draw a big tree on a piece of paper.",
        "Choose one thing to build or make at your tree: a tree house, a swing or a pie.",
        "Draw it at the tree.",
        "Copy and finish: I build a ___. or I make a ___.",
        "Tell someone at home why you chose it."
      ],
      frames: [
        "I build a ___.",
        "I make a ___.",
        "I bring ___.",
        "I like it because ___."
      ],
      success: [
        "I can draw a tree and one thing to build or make.",
        "I can write: I build a ___. or I make a ___.",
        "I can say why I chose it."
      ],
      challenge: "Draw two things that fall from your tree. Write: The ___ fall."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A tree at the training ground",
          task: "Draw a big tree next to a football pitch. Draw one thing to build or make for the Gunners' fans. Write one short sentence.",
          steps: [
            "Draw a big tree beside a football pitch.",
            "Choose one thing to build or make: a tree house to watch the match, a swing or a pie for the fans.",
            "Draw it at the tree.",
            "Copy and finish: I build a ___. or I make a ___.",
            "Tell someone at home why you chose it."
          ],
          frames: [
            "I build a ___.",
            "I make a ___.",
            "I bring ___ to the match.",
            "I like it because ___."
          ],
          success: [
            "I can draw a tree, a pitch and one thing to build or make.",
            "I can write: I build a ___. or I make a ___.",
            "I can say why I chose it."
          ],
          challenge: "Draw two things that fall from your tree. Write: The ___ fall."
        }
      }
    ]
  },
  "od2e-l1-u08-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: [
        "tree",
        "spring",
        "winter",
        "flowers",
        "watch",
        "make"
      ],
      grammar: [
        "My tree in the ___.",
        "I watch ___."
      ]
    },
    base: {
      title: "My tree in a season I choose",
      task: "Draw your own tree in the season you like best. Write one short caption. Say why you chose that season.",
      steps: [
        "Choose one season: spring, summer, fall or winter.",
        "Draw your tree in that season.",
        "Copy and finish the caption: My tree in the ___.",
        "Draw yourself at the tree.",
        "Say to someone at home why you chose that season."
      ],
      frames: [
        "My tree in the ___.",
        "In the ___, the tree has ___.",
        "I watch ___.",
        "I like the ___ because ___."
      ],
      success: [
        "I can draw a tree in one season.",
        "I can write a caption: My tree in the ___.",
        "I can say why I chose that season."
      ],
      challenge: "Draw your tree in a second season. Write a caption. Say one way the two trees are different."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A tree by the stadium",
          task: "Draw a tree outside the Emirates Stadium in the season you like best for a match. Write one short caption. Say why you chose that season.",
          steps: [
            "Choose one season: spring, summer, fall or winter.",
            "Draw a tree outside the stadium in that season.",
            "Copy and finish the caption: My tree in the ___.",
            "Draw yourself and the Gunners fans at the tree.",
            "Say to someone at home why you chose that season."
          ],
          frames: [
            "My tree in the ___.",
            "In the ___, the tree has ___.",
            "I watch the match in the ___.",
            "I like the ___ because ___."
          ],
          success: [
            "I can draw a tree by the stadium in one season.",
            "I can write a caption: My tree in the ___.",
            "I can say why I chose that season."
          ],
          challenge: "Draw the same tree in a second season. Write a caption. Say one way the two trees are different."
        }
      }
    ]
  },
  "od2e-l1-u08-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "build a snowman",
        "make a swing",
        "make apple pie",
        "grow",
        "fall",
        "bring"
      ],
      grammar: [
        "I ___.",
        "I don't ___.",
        "Do you ___? Yes, I do. No, I don't."
      ]
    },
    base: {
      title: "What I do and what I don't do",
      task: "Draw yourself at your tree. Write one thing you do and one thing you don't do.",
      steps: [
        "Draw yourself at your own tree.",
        "Think: what do you do there? What don't you do there?",
        "Draw one thing you do and one thing you don't do.",
        "Copy and finish: I ___. I don't ___.",
        "Read your sentences to someone at home."
      ],
      frames: [
        "I ___.",
        "I don't ___.",
        "I ___ in the ___.",
        "I don't ___ in the ___."
      ],
      success: [
        "I can draw what I do and what I don't do.",
        "I can write: I ___.",
        "I can write: I don't ___."
      ],
      challenge: "Ask someone at home: Do you ___? Write their answer: Yes, I do. or No, I don't."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "What I do and don't do on match day",
          task: "Draw yourself at a football match. Write one thing you do and one thing you don't do.",
          steps: [
            "Draw yourself at the Emirates Stadium on match day.",
            "Think: what do you do there? What don't you do there?",
            "Draw one thing you do and one thing you don't do.",
            "Copy and finish: I ___. I don't ___.",
            "Read your sentences to someone at home."
          ],
          frames: [
            "I ___.",
            "I don't ___.",
            "I bring ___ to the match.",
            "I don't bring ___ to the match."
          ],
          success: [
            "I can draw what I do and what I don't do.",
            "I can write: I ___.",
            "I can write: I don't ___."
          ],
          challenge: "Ask someone at home: Do you watch football? Write their answer: Yes, I do. or No, I don't."
        }
      }
    ]
  },
  "od2e-l1-u08-l4": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "ride a bicycle",
        "go to the beach",
        "eat ice cream",
        "drink hot chocolate",
        "fly a kite",
        "plant flowers"
      ],
      grammar: [
        "I ___, ___ and ___."
      ]
    },
    base: {
      title: "A new thing to do in my season",
      task: "Invent a new thing to do in the season you like best. Draw it. Write one sentence with three things.",
      steps: [
        "Choose your best season.",
        "Draw three things you do in it.",
        "Think of one new thing to do and draw it too.",
        "Copy and finish: I ___, ___ and ___.",
        "Tell someone at home why it is fun."
      ],
      frames: [
        "I ___, ___ and ___.",
        "In the ___, I ___.",
        "It's fun because ___.",
        "I don't ___ in the ___."
      ],
      success: [
        "I can draw three things I do in my season.",
        "I can write a list with commas and and.",
        "I can say why it is fun."
      ],
      challenge: "Write about a season you do not like. Write two things you do and one thing you don't do."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match-day list",
          task: "Draw a season day with a football match. Write one sentence with three things you do.",
          steps: [
            "Choose a season for a Gunners match day.",
            "Draw three things you do that day: ride a bicycle to the stadium, eat ice cream, drink hot chocolate.",
            "Think of one new thing to do and draw it too.",
            "Copy and finish: I ___, ___ and ___.",
            "Tell someone at home why it is fun."
          ],
          frames: [
            "I ___, ___ and ___.",
            "In the ___, I ___ to the match.",
            "It's fun because ___.",
            "I don't ___ on match day."
          ],
          success: [
            "I can draw three things I do on match day.",
            "I can write a list with commas and and.",
            "I can say why it is fun."
          ],
          challenge: "Write about a match day in a season you do not like. Write two things you do and one thing you don't do."
        }
      }
    ]
  },
  "od2e-l1-u08-l5": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "spring",
        "summer",
        "winter",
        "build",
        "make",
        "bring"
      ],
      grammar: [
        "It's ___.",
        "I ___ in the ___."
      ]
    },
    base: {
      title: "A season in a make-believe land",
      task: "Make up a land with its own season. Draw it. Write what people do there.",
      steps: [
        "Make up a land. Give it a name.",
        "Draw the land and its season.",
        "Draw people doing two things there.",
        "Copy and finish: In ___, it's ___. We ___ in the ___.",
        "Tell someone at home why you made it like this."
      ],
      frames: [
        "It's ___.",
        "We ___ in the ___.",
        "People ___, ___ and ___.",
        "I made it ___ because ___."
      ],
      success: [
        "I can draw a land and its season.",
        "I can write what people do there.",
        "I can say why I made it that way."
      ],
      challenge: "Add one thing people do not do there. Write: We don't ___ in ___."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Gunners' season land",
          task: "Make up a football land with its own season. Draw it. Write what the fans do there.",
          steps: [
            "Make up a football land. Give it a name.",
            "Draw the land, a stadium and its season.",
            "Draw fans doing two things there.",
            "Copy and finish: In ___, it's ___. The fans ___ in the ___.",
            "Tell someone at home why you made it like this."
          ],
          frames: [
            "It's ___.",
            "The fans ___ in the ___.",
            "They ___, ___ and ___.",
            "I made it ___ because ___."
          ],
          success: [
            "I can draw a football land and its season.",
            "I can write what the fans do there.",
            "I can say why I made it that way."
          ],
          challenge: "Add one thing the fans do not do there. Write: They don't ___ in ___."
        }
      }
    ]
  },

  // Lesson 6: Grammar Champions (I do, you do, I don't, Do you?)
  "od2e-l1-u08-l6": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["fly a kite", "plant flowers", "eat ice cream", "drink hot chocolate", "build a snowman", "ride a bicycle"],
      grammar: ["I ___ in the ___.", "I don't ___.", "Do you ___?"]
    },
    base: {
      title: "Do and don't poster",
      task: "Make a poster for one season. Draw two things you do and one thing you don't do. Choose the season and say why.",
      steps: [
        "Choose one season. Write its name at the top of your paper.",
        "Draw two things you do in that season. Write: I ___.",
        "Draw one thing you don't do. Cross it out and write: I don't ___.",
        "Write a question for a friend: Do you ___?",
        "Tell someone at home why you chose this season."
      ],
      frames: [
        "In ___, I ___.",
        "I don't ___.",
        "Do you ___?",
        "I chose ___ because ___."
      ],
      success: [
        "I can write what I do and one thing I don't do.",
        "I can write a question with Do you.",
        "I can say why I chose my season."
      ],
      challenge: "Make a second poster for a different season. Write one thing you do in both seasons."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match day do and don't poster",
          task: "Make a match day poster for one season. Draw two things you do and one thing you don't do. Choose the season and say why.",
          steps: [
            "Choose one season for a match day. Write its name at the top of your paper.",
            "Draw two things you do at the match. Write: I ___.",
            "Draw one thing you don't do. Cross it out and write: I don't ___.",
            "Write a question for a friend: Do you ___?",
            "Tell someone at home why you chose this season."
          ],
          frames: [
            "In ___, I ___ at the match.",
            "I don't ___.",
            "Do you ___?",
            "I chose ___ because ___."
          ],
          success: [
            "I can write what I do and one thing I don't do.",
            "I can write a question with Do you.",
            "I can say why I chose my season."
          ],
          challenge: "Make a second poster for a different season. Write one thing you do at both matches."
        }
      }
    ]
  }
};
