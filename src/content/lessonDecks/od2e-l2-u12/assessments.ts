// Oxford Discover 2nd edition, Level 2, Unit 12: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U12Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u12-ws-place",
    "title": "Where is it? Place words",
    "grammar": "Where's the ___? / Is there a ___? with place words",
    "deckId": "od2e-l2-u12-l3",
    "slide": "Where is it? Place words",
    "intro": "Place words: in, on, under, behind, in front of, next to, between, across from. Ask: Where's the bin? Answer: It's next to the tree. Ask: Is there a bench? Answer: Yes, there is. / No, there isn't.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "The bin is ___ the tree. (next to / is)  ->  next to",
        "items": [
          {
            "q": "The ball is ___ the table. (below it)",
            "options": [
              "under",
              "between"
            ],
            "answer": "under"
          },
          {
            "q": "The bin is ___ the tree. (beside it)",
            "options": [
              "next to",
              "above"
            ],
            "answer": "next to"
          },
          {
            "q": "The cat is ___ the door. (at the back of it)",
            "options": [
              "behind",
              "across from"
            ],
            "answer": "behind"
          },
          {
            "q": "The boy is ___ Mai and Nam. (one on each side)",
            "options": [
              "between",
              "under"
            ],
            "answer": "between"
          },
          {
            "q": "Where's the bench? ___ next to the lake.",
            "options": [
              "It's",
              "Yes,"
            ],
            "answer": "It's"
          },
          {
            "q": "Is there a bin? Yes, there ___.",
            "options": [
              "is",
              "it is"
            ],
            "answer": "is"
          },
          {
            "q": "Is there a duck on the lake? No, there ___.",
            "options": [
              "isn't",
              "aren't"
            ],
            "answer": "isn't"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "The cat is behind the tree.",
              "The cat is behind of the tree."
            ],
            "answer": "The cat is behind the tree."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing words.",
        "example": "___ the bin? It's next to the tree.  ->  Where's",
        "items": [
          {
            "q": "The book is ___ the table. (on top of)",
            "answer": "on"
          },
          {
            "q": "The lamp is ___ the sofa and the shelf. (one on each side)",
            "answer": "between"
          },
          {
            "q": "The library is ___ the park. (on the other side)",
            "answer": "across from"
          },
          {
            "q": "The school is ___ the park. The park is in front of it.",
            "answer": "behind"
          },
          {
            "q": "Is there a bin near the tree? Yes, there ___.",
            "answer": "is"
          },
          {
            "q": "Is there a ball under the chair? No, there ___.",
            "answer": "isn't"
          },
          {
            "q": "Correct the mistake: Where the bench is?",
            "answer": "Where's the bench?"
          },
          {
            "q": "Correct the mistake: The cat is behind of the door.",
            "answer": "The cat is behind the door."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Use a different place word each time.",
        "example": "a hat / a chair  ->  The hat is on the chair.",
        "items": [
          {
            "q": "Write a question with Where's about a thing in your room.",
            "answer": "e.g. Where's my bag?"
          },
          {
            "q": "Write a full answer with a place word.",
            "answer": "e.g. It's under the bed."
          },
          {
            "q": "Write a No answer with a correction: Is there a ball under the chair?",
            "answer": "e.g. No, there isn't. There's a ball behind the door."
          },
          {
            "q": "Find and fix two mistakes: 'The bin is in front the tree. Is there a bench? Yes, it is.'",
            "answer": "The bin is in front of the tree. ... Yes, there is."
          },
          {
            "q": "Write two sentences about a park picture: one with between and one with across from.",
            "answer": "e.g. The bench is between two trees. The library is across from the park."
          },
          {
            "q": "Your friend says: 'Under the table is the toy.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. Say the thing first: The toy is under the table."
          }
        ]
      }
    ]
  },
  {
    "id": "od2e-l2-u12-ws-time",
    "title": "Verbs show time: go, going, went",
    "grammar": "usually (go) / now (am going) / before (went)",
    "deckId": "od2e-l2-u12-l4",
    "slide": "Verbs show time: go, going, went",
    "intro": "The verb changes with the time. usually: I go. now: I'm going. before: I went. Many verbs add -ed for before (played, reused). Some change a lot: go > went, eat > ate.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "Yesterday I ___ to school. (go / went)  ->  went",
        "items": [
          {
            "q": "I usually ___ to school by bus.",
            "options": [
              "go",
              "went"
            ],
            "answer": "go"
          },
          {
            "q": "I'm ___ to school now.",
            "options": [
              "going",
              "went"
            ],
            "answer": "going"
          },
          {
            "q": "Last week I ___ to the park.",
            "options": [
              "went",
              "go"
            ],
            "answer": "went"
          },
          {
            "q": "We usually ___ paper on Friday.",
            "options": [
              "recycle",
              "recycled"
            ],
            "answer": "recycle"
          },
          {
            "q": "Mai is ___ a bottle in the bin now.",
            "options": [
              "putting",
              "put"
            ],
            "answer": "putting"
          },
          {
            "q": "Last week we ___ boxes.",
            "options": [
              "reused",
              "reuse"
            ],
            "answer": "reused"
          },
          {
            "q": "We ___ rice at school today. (it already happened)",
            "options": [
              "ate",
              "eat"
            ],
            "answer": "ate"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "I went to the park.",
              "I goed to the park."
            ],
            "answer": "I went to the park."
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the verb in the right form. Use the time word to help you.",
        "example": "Now I ___ (go) to school.  ->  am going / 'm going",
        "items": [
          {
            "q": "Every day I ___ to school. (go)",
            "answer": "go"
          },
          {
            "q": "Now we ___ a bottle in the bin. (put)",
            "answer": "are putting / 're putting"
          },
          {
            "q": "Last week they ___ boxes. (reuse)",
            "answer": "reused"
          },
          {
            "q": "Yesterday I ___ to the recycling plant. (go)",
            "answer": "went"
          },
          {
            "q": "Last Monday we ___ the bench. (clean)",
            "answer": "cleaned"
          },
          {
            "q": "Today I ___ rice for lunch. (eat, it already happened)",
            "answer": "ate"
          },
          {
            "q": "Correct the mistake: Yesterday I go to the park.",
            "answer": "Yesterday I went to the park."
          },
          {
            "q": "Correct the mistake: I going to school now.",
            "answer": "I'm going to school now."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Check the verb form for the time.",
        "example": "usually / paper / blue bin  ->  I usually put paper in the blue bin.",
        "items": [
          {
            "q": "Write a sentence with usually about what you do on Friday.",
            "answer": "e.g. I usually recycle paper on Friday."
          },
          {
            "q": "Write a sentence with now about what you are doing.",
            "answer": "e.g. I'm writing a sentence now."
          },
          {
            "q": "Write a sentence with last week about a place you went to.",
            "answer": "e.g. Last week I went to the park."
          },
          {
            "q": "Find and fix two mistakes: 'Last week we recycle bottles. Now I going home.'",
            "answer": "Last week we recycled bottles. Now I'm going home."
          },
          {
            "q": "Write the same idea three times (usually, now, last week) with the verb eat.",
            "answer": "e.g. I usually eat rice. I'm eating rice now. Last week I ate rice."
          },
          {
            "q": "Your friend says: 'I goed to the zoo.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. Go is a special verb: it does not add -ed. I went to the zoo."
          }
        ]
      }
    ]
  }
];
