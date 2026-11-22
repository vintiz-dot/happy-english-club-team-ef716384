// Oxford Discover 2nd edition, Level 2, Unit 8: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U8Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u08-ws-did",
    "title": "Did he go? He went.",
    "grammar": "Did + person + plain verb ...? / yesterday words",
    "deckId": "od2e-l2-u08-l3",
    "slide": "Simple past: Did he go? He went.",
    "intro": "To ask about yesterday we say Did, and the verb stays plain: Did he go? In the answer the verb changes: He went. Short answers: Yes, he did. / No, he didn't.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "Did he ___ to the bakery? (go / went)  ->  go",
        "items": [
          {
            "q": "Did he ___ to the shop?",
            "options": [
              "go",
              "went"
            ],
            "answer": "go"
          },
          {
            "q": "He ___ to the bakery yesterday.",
            "options": [
              "went",
              "go"
            ],
            "answer": "went"
          },
          {
            "q": "Did Bandar ___ the candy?",
            "options": [
              "take",
              "took"
            ],
            "answer": "take"
          },
          {
            "q": "He ___ the candy from the jar.",
            "options": [
              "took",
              "take"
            ],
            "answer": "took"
          },
          {
            "q": "Did the baker make a cake? Yes, he ___.",
            "options": [
              "did",
              "does"
            ],
            "answer": "did"
          },
          {
            "q": "Did the cook hide the cookies? No, she ___.",
            "options": [
              "didn't",
              "doesn't"
            ],
            "answer": "didn't"
          },
          {
            "q": "Which question is right?",
            "options": [
              "Did she eat the bread?",
              "Did she ate the bread?"
            ],
            "answer": "Did she eat the bread?"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "The monkey stole a banana.",
              "The monkey stealed a banana."
            ],
            "answer": "The monkey stole a banana."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing word. Use the verb in brackets.",
        "example": "___ he go to the shop? (go)  ->  Did",
        "items": [
          {
            "q": "___ the monkey eat the cookies? Yes, he ___.",
            "answer": "Did / did"
          },
          {
            "q": "The baker ___ a big cake yesterday. (make)",
            "answer": "made"
          },
          {
            "q": "Did the cook ___ the jar? (hide)",
            "answer": "hide"
          },
          {
            "q": "The children ___ to the market on Saturday. (go)",
            "answer": "went"
          },
          {
            "q": "What did Bandar ___ ? (take)",
            "answer": "take"
          },
          {
            "q": "Bandar ___ the candy in his hand. (take)",
            "answer": "took"
          },
          {
            "q": "Correct the mistake: Did he went to the shop?",
            "answer": "Did he go to the shop?"
          },
          {
            "q": "Correct the mistake: She buyed some bread.",
            "answer": "She bought some bread."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Check every verb.",
        "example": "ask: she / eat / the cake  ->  Did she eat the cake?",
        "items": [
          {
            "q": "Write a question with Did about what a friend ate yesterday.",
            "answer": "e.g. Did you eat rice yesterday?"
          },
          {
            "q": "Write a question with What did ... and a plain verb about Bandar.",
            "answer": "e.g. What did Bandar take?"
          },
          {
            "q": "Find and fix two mistakes: 'Did the baker made a cake? Yes, he did. He selled it.'",
            "answer": "Did the baker make a cake? ... He sold it."
          },
          {
            "q": "Write a short answer (Yes or No) and one more sentence: Did you go to school yesterday?",
            "answer": "e.g. Yes, I did. I went to school at seven o'clock."
          },
          {
            "q": "Write two sentences about the market: one with sold and one with bought.",
            "answer": "e.g. The man sold apples. I bought two."
          },
          {
            "q": "Your friend says: 'Did he went home?' Tell your friend what is wrong and write it right.",
            "answer": "e.g. After Did the verb stays plain: Did he go home?"
          }
        ]
      }
    ]
  }
];
