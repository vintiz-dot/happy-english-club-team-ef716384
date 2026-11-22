// Oxford Discover 2nd edition, Level 2, Unit 7: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U7Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u07-ws-yesterday",
    "title": "Yesterday words: ate, saw, bought, gave and didn't",
    "grammar": "yesterday words (ate, saw, bought, gave) and didn't + plain verb",
    "deckId": "od2e-l2-u07-l3",
    "slide": "Yesterday words: yes and no",
    "intro": "For something that happened yesterday, some verbs change: eat > ate, see > saw, buy > bought, give > gave. For NO we say didn't, and the verb goes back to its plain form: I didn't eat.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "Yesterday I ___ an apple. (eat / ate)  ->  ate",
        "items": [
          {
            "q": "Yesterday I ___ a banana.",
            "options": [
              "eat",
              "ate"
            ],
            "answer": "ate"
          },
          {
            "q": "We ___ a big bird in the park yesterday.",
            "options": [
              "saw",
              "see"
            ],
            "answer": "saw"
          },
          {
            "q": "She ___ some bread last night.",
            "options": [
              "buy",
              "bought"
            ],
            "answer": "bought"
          },
          {
            "q": "He ___ me a sticker yesterday.",
            "options": [
              "gave",
              "give"
            ],
            "answer": "gave"
          },
          {
            "q": "I didn't ___ my soup.",
            "options": [
              "eat",
              "ate"
            ],
            "answer": "eat"
          },
          {
            "q": "They didn't ___ the cat.",
            "options": [
              "see",
              "saw"
            ],
            "answer": "see"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "I bought a pen.",
              "I buyed a pen."
            ],
            "answer": "I bought a pen."
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "She didn't gave me a cake.",
              "She didn't give me a cake."
            ],
            "answer": "She didn't give me a cake."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing word. Use the verb in brackets.",
        "example": "Yesterday we ___ three birds. (see)  ->  saw",
        "items": [
          {
            "q": "Yesterday I ___ two cookies. (eat)",
            "answer": "ate"
          },
          {
            "q": "My mum ___ some milk last night. (buy)",
            "answer": "bought"
          },
          {
            "q": "We ___ a film on Sunday. (see)",
            "answer": "saw"
          },
          {
            "q": "Tom ___ his pencil to Anna. (give)",
            "answer": "gave"
          },
          {
            "q": "I didn't ___ any cake. (eat)",
            "answer": "eat"
          },
          {
            "q": "She didn't ___ a dog. (see)",
            "answer": "see"
          },
          {
            "q": "Correct the mistake: I eated a pear.",
            "answer": "I ate a pear."
          },
          {
            "q": "Correct the mistake: He didn't bought a hat.",
            "answer": "He didn't buy a hat."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write a full sentence for each one. Check every verb.",
        "example": "eat / not / rice  ->  I didn't eat rice.",
        "items": [
          {
            "q": "Write a sentence with ate about your lunch yesterday.",
            "answer": "e.g. I ate rice and fish for lunch yesterday."
          },
          {
            "q": "Write a sentence with saw and a sentence with didn't see, about one place.",
            "answer": "e.g. I saw a cat in the park. I didn't see a dog."
          },
          {
            "q": "Find and fix two mistakes: 'Yesterday I buyed a book. I didn't gave it to my friend.'",
            "answer": "I bought a book. I didn't give it to my friend."
          },
          {
            "q": "Write two sentences about a friend: one with bought and one with didn't buy.",
            "answer": "e.g. Mai bought a red pen. She didn't buy a blue pen."
          },
          {
            "q": "Write one sentence with gave and one with didn't give.",
            "answer": "e.g. I gave my brother a toy. I didn't give him a sweet."
          },
          {
            "q": "Your friend says: 'I didn't ate lunch.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. After didn't the verb goes back to its plain form: I didn't eat lunch."
          }
        ]
      }
    ]
  }
];
