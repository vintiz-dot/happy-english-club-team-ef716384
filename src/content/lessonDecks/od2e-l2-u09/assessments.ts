// Oxford Discover 2nd edition, Level 2, Unit 9: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U9Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u09-ws-whose",
    "title": "Whose is it? Mine, yours, hers, his, ours, theirs",
    "grammar": "Whose ___ is this? / mine, yours, hers, his, ours, theirs",
    "deckId": "od2e-l2-u09-l3",
    "slide": "Mine, yours, hers, his, ours, theirs",
    "intro": "my, your, her, his, our, their go before a thing: This is my book. mine, yours, hers, his, ours, theirs stand alone: This book is mine. We ask: Whose bag is this?",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "This is my pen. The pen is ___. (me / mine)  ->  mine",
        "items": [
          {
            "q": "That is my bag. The bag is ___.",
            "options": [
              "mine",
              "my"
            ],
            "answer": "mine"
          },
          {
            "q": "This is your book. The book is ___.",
            "options": [
              "yours",
              "your"
            ],
            "answer": "yours"
          },
          {
            "q": "That is her hat. The hat is ___.",
            "options": [
              "hers",
              "she"
            ],
            "answer": "hers"
          },
          {
            "q": "This is his ball. The ball is ___.",
            "options": [
              "his",
              "he"
            ],
            "answer": "his"
          },
          {
            "q": "This is our room. The room is ___.",
            "options": [
              "ours",
              "us"
            ],
            "answer": "ours"
          },
          {
            "q": "That is their car. The car is ___.",
            "options": [
              "theirs",
              "them"
            ],
            "answer": "theirs"
          },
          {
            "q": "___ bag is this?",
            "options": [
              "Whose",
              "Who"
            ],
            "answer": "Whose"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "The pencil is mine.",
              "The pencil is my."
            ],
            "answer": "The pencil is mine."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing word: mine, yours, hers, his, ours or theirs.",
        "example": "This is my cap. The cap is ___.  ->  mine",
        "items": [
          {
            "q": "That is your coat. The coat is ___.",
            "answer": "yours"
          },
          {
            "q": "Anna has a red bag. The red bag is ___.",
            "answer": "hers"
          },
          {
            "q": "Tom has a blue ball. The blue ball is ___.",
            "answer": "his"
          },
          {
            "q": "We have a big table. The big table is ___.",
            "answer": "ours"
          },
          {
            "q": "The girls have two kites. The kites are ___.",
            "answer": "theirs"
          },
          {
            "q": "Whose pencil is this? It's ___. (it belongs to me)",
            "answer": "mine"
          },
          {
            "q": "Correct the mistake: This book is my.",
            "answer": "This book is mine."
          },
          {
            "q": "Correct the mistake: Who bag is that?",
            "answer": "Whose bag is that?"
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Check the owner words.",
        "example": "ask: Whose ball? / answer: his  ->  Whose ball is this? It's his.",
        "items": [
          {
            "q": "Write a question with Whose about a thing in your classroom.",
            "answer": "e.g. Whose pencil is this?"
          },
          {
            "q": "Write an answer with hers or his.",
            "answer": "e.g. It's hers."
          },
          {
            "q": "Find and fix two mistakes: 'This is mine bag. That bag is her.'",
            "answer": "This is my bag. That bag is hers."
          },
          {
            "q": "Write two sentences about things you share with a friend, with ours.",
            "answer": "e.g. The ball is ours. The kite is ours, too."
          },
          {
            "q": "Write one sentence with my and one with mine about the same thing.",
            "answer": "e.g. This is my pen. The pen is mine."
          },
          {
            "q": "Your friend says: 'The books are their.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. A word that stands alone needs theirs: The books are theirs."
          }
        ]
      }
    ]
  }
];
