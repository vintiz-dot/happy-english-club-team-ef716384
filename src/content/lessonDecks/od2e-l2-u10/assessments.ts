// Oxford Discover 2nd edition, Level 2, Unit 10: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U10Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u10-ws-can-may",
    "title": "Can I...? and May I...?",
    "grammar": "Can I + action? / May I + action?",
    "deckId": "od2e-l2-u10-l3",
    "slide": "Can I...? and May I...? (SB 101 E)",
    "intro": "To ask nicely, say Can I or May I and then the plain verb: Can I play? May I go? Answers: Yes, you can. / No, you can't. Yes, you may. / No, you may not. Add please to be more polite.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "___ I play outside, please? (Can / Does)  ->  Can",
        "items": [
          {
            "q": "___ I borrow a pencil, please?",
            "options": [
              "May",
              "Do"
            ],
            "answer": "May"
          },
          {
            "q": "Can I ___ with the blocks?",
            "options": [
              "play",
              "plays"
            ],
            "answer": "play"
          },
          {
            "q": "May I ___ to the bathroom?",
            "options": [
              "go",
              "going"
            ],
            "answer": "go"
          },
          {
            "q": "Can I sit here? Yes, you ___.",
            "options": [
              "can",
              "does"
            ],
            "answer": "can"
          },
          {
            "q": "May I have some water? Yes, you ___.",
            "options": [
              "may",
              "are"
            ],
            "answer": "may"
          },
          {
            "q": "Can I run in the classroom? No, you ___.",
            "options": [
              "can't",
              "do"
            ],
            "answer": "can't"
          },
          {
            "q": "Which is the most polite?",
            "options": [
              "May I have a sticker, please?",
              "Give me a sticker."
            ],
            "answer": "May I have a sticker, please?"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "Can I help you?",
              "Can I helps you?"
            ],
            "answer": "Can I help you?"
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing words. Use Can I or May I.",
        "example": "___ ___ open the window, please?  ->  Can I / May I",
        "items": [
          {
            "q": "___ I use your crayon, please? (ask politely)",
            "answer": "May"
          },
          {
            "q": "Can I ___ with you? (play)",
            "answer": "play"
          },
          {
            "q": "May I ___ a book, please? (borrow)",
            "answer": "borrow"
          },
          {
            "q": "Can I eat in class? No, you ___.",
            "answer": "can't"
          },
          {
            "q": "May I go outside? Yes, you ___.",
            "answer": "may"
          },
          {
            "q": "You want to sit next to Lan. Ask with May I.",
            "answer": "May I sit next to you, please?"
          },
          {
            "q": "Correct the mistake: Can I plays outside?",
            "answer": "Can I play outside?"
          },
          {
            "q": "Correct the mistake: May I to go home?",
            "answer": "May I go home?"
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Think about who you are asking.",
        "example": "ask a friend to share: Can I ___ ?  ->  Can I share your book?",
        "items": [
          {
            "q": "Write a question with May I to ask your teacher for something.",
            "answer": "e.g. May I go to the bathroom, please?"
          },
          {
            "q": "Write a question with Can I to ask a friend for something.",
            "answer": "e.g. Can I borrow your ruler?"
          },
          {
            "q": "Write a no answer with a reason for: Can I play outside? (it is raining)",
            "answer": "e.g. No, you can't. It is raining."
          },
          {
            "q": "Find and fix two mistakes: 'May I borrows your pen? Yes, you can't.'",
            "answer": "May I borrow your pen? Yes, you may."
          },
          {
            "q": "Write two questions for a dinner at a friend's house: one with Can I and one with May I.",
            "answer": "e.g. Can I help you? May I have some rice, please?"
          },
          {
            "q": "Your friend says that May I is more polite than Can I. Do you agree? Write one or two sentences.",
            "answer": "e.g. Yes, May I sounds a little more polite, but both are fine with please."
          }
        ]
      }
    ]
  },
  {
    "id": "od2e-l2-u10-ws-agree",
    "title": "Subject-verb agreement: am, is, are, was, were",
    "grammar": "I am / he, she, it is / you, we, they are (and was / were)",
    "deckId": "od2e-l2-u10-l4",
    "slide": "Subject-verb agreement (SB 103 F)",
    "intro": "The verb must match who we talk about. I am / I was. he, she, it or one person: is / was. you, we, they or more than one: are / were. Example: The boy is kind. The boys are kind.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "She ___ my friend. (is / are)  ->  is",
        "items": [
          {
            "q": "I ___ at school today.",
            "options": [
              "am",
              "is"
            ],
            "answer": "am"
          },
          {
            "q": "He ___ very kind.",
            "options": [
              "is",
              "are"
            ],
            "answer": "is"
          },
          {
            "q": "We ___ friends.",
            "options": [
              "are",
              "is"
            ],
            "answer": "are"
          },
          {
            "q": "The boys ___ in the classroom.",
            "options": [
              "are",
              "is"
            ],
            "answer": "are"
          },
          {
            "q": "The cat ___ under the table.",
            "options": [
              "is",
              "are"
            ],
            "answer": "is"
          },
          {
            "q": "I ___ at home yesterday.",
            "options": [
              "was",
              "were"
            ],
            "answer": "was"
          },
          {
            "q": "They ___ happy yesterday.",
            "options": [
              "were",
              "was"
            ],
            "answer": "were"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "The girls were in the library.",
              "The girls was in the library."
            ],
            "answer": "The girls were in the library."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write am, is, are, was or were.",
        "example": "My friends ___ nice.  ->  are",
        "items": [
          {
            "q": "I ___ eight years old.",
            "answer": "am"
          },
          {
            "q": "My teacher ___ thoughtful.",
            "answer": "is"
          },
          {
            "q": "Mai and Nam ___ good friends.",
            "answer": "are"
          },
          {
            "q": "The dog ___ in the garden yesterday.",
            "answer": "was"
          },
          {
            "q": "We ___ at the park last week.",
            "answer": "were"
          },
          {
            "q": "You ___ very polite today.",
            "answer": "are"
          },
          {
            "q": "Correct the mistake: The children is happy.",
            "answer": "The children are happy."
          },
          {
            "q": "Correct the mistake: She were at school yesterday.",
            "answer": "She was at school yesterday."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Check every am, is, are, was and were.",
        "example": "the rabbits / hungry  ->  The rabbits are hungry.",
        "items": [
          {
            "q": "Write one sentence about your friends with are.",
            "answer": "e.g. My friends are kind."
          },
          {
            "q": "Write one sentence about yourself yesterday with was.",
            "answer": "e.g. I was at home yesterday."
          },
          {
            "q": "Find and fix two mistakes: 'My mum are tired. The boys was at school.'",
            "answer": "My mum is tired. The boys were at school."
          },
          {
            "q": "Write two sentences about a family: one with is and one with are.",
            "answer": "e.g. My sister is eight. My parents are at work."
          },
          {
            "q": "Write one sentence with they were and one with he was about last weekend.",
            "answer": "e.g. They were at the park. He was at home."
          },
          {
            "q": "Your friend says: 'The books is on the shelf.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. Books is more than one, so we say are: The books are on the shelf."
          }
        ]
      }
    ]
  }
];
