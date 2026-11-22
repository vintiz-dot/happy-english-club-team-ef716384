// Oxford Discover 2nd edition, Level 2, Unit 11: the unit's printable grammar worksheets
// (three levels each, with answer keys). Everything here is the school's own writing;
// nothing from the Student Book or Workbook is reproduced. Answers marked "e.g." are
// model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U11Worksheets: Worksheet[] = [
  {
    "id": "od2e-l2-u11-ws-place",
    "title": "Where is it? above, behind, in front of, across from",
    "grammar": "above / behind / in front of / across from",
    "deckId": "od2e-l2-u11-l3",
    "slide": "Where is it? Place words",
    "intro": "Place words tell us where something is. above = higher than. behind = at the back of. in front of = at the front of (note: of!). across from = on the other side. Say: The bin is behind the tree.",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right word. Then read the whole sentence aloud.",
        "example": "The clouds are ___ the hill. (above / behind)  ->  above",
        "items": [
          {
            "q": "The bird is ___ the tree. (higher than the tree)",
            "options": [
              "above",
              "behind"
            ],
            "answer": "above"
          },
          {
            "q": "The bin is ___ the tree. (at the back of it)",
            "options": [
              "behind",
              "above"
            ],
            "answer": "behind"
          },
          {
            "q": "The girl is ___ the board. (at the front of it)",
            "options": [
              "in front of",
              "behind"
            ],
            "answer": "in front of"
          },
          {
            "q": "The shop is ___ the park. (on the other side)",
            "options": [
              "across from",
              "above"
            ],
            "answer": "across from"
          },
          {
            "q": "The tree is in front ___ the bin.",
            "options": [
              "of",
              "to"
            ],
            "answer": "of"
          },
          {
            "q": "Where ___ the bin?",
            "options": [
              "is",
              "are"
            ],
            "answer": "is"
          },
          {
            "q": "Which sentence is right?",
            "options": [
              "The cat is behind the door.",
              "The cat is behind of the door."
            ],
            "answer": "The cat is behind the door."
          },
          {
            "q": "Where are the clouds? They are ___ the hill.",
            "options": [
              "above",
              "across from"
            ],
            "answer": "above"
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write the missing place word: above, behind, in front of or across from.",
        "example": "The plane is ___ the school. (higher)  ->  above",
        "items": [
          {
            "q": "The sun is ___ the mountain.",
            "answer": "above"
          },
          {
            "q": "The bin is ___ the tree, so I can't see it.",
            "answer": "behind"
          },
          {
            "q": "I stand ___ the class when I read.",
            "answer": "in front of"
          },
          {
            "q": "The library is ___ the park. They look at each other.",
            "answer": "across from"
          },
          {
            "q": "The kite is ___ the trees.",
            "answer": "above"
          },
          {
            "q": "The bus stop is ___ the school gate. (at the front)",
            "answer": "in front of"
          },
          {
            "q": "Correct the mistake: The ball is behind of the chair.",
            "answer": "The ball is behind the chair."
          },
          {
            "q": "Correct the mistake: The bin is in front the tree.",
            "answer": "The bin is in front of the tree."
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Use a different place word each time.",
        "example": "a bench / a tree  ->  The bench is behind the tree.",
        "items": [
          {
            "q": "Write a sentence about where your bag is in the classroom.",
            "answer": "e.g. My bag is behind my chair."
          },
          {
            "q": "Write a question with Where about a thing in your bedroom.",
            "answer": "e.g. Where is the lamp?"
          },
          {
            "q": "Find and fix two mistakes: 'The cloud is in front the hill. The shop is above of the park.'",
            "answer": "The cloud is above the hill. The shop is across from the park. (or: in front of the hill)"
          },
          {
            "q": "Write two sentences about a park picture: one with above and one with across from.",
            "answer": "e.g. The birds are above the lake. The shop is across from the park."
          },
          {
            "q": "Write a sentence with in front of and a sentence with behind about the same two things.",
            "answer": "e.g. The tree is in front of the bin. The bin is behind the tree."
          },
          {
            "q": "Your friend says: 'The bin is in front the tree.' Tell your friend what is wrong and write it right.",
            "answer": "e.g. in front of needs of: The bin is in front of the tree."
          }
        ]
      }
    ]
  },
  {
    "id": "od2e-l2-u11-ws-words",
    "title": "Four kinds of words: verb, noun, adjective, pronoun",
    "grammar": "verb, noun, adjective, pronoun",
    "deckId": "od2e-l2-u11-l4",
    "slide": "Four kinds of words",
    "intro": "A verb is an action (reduce, run). A noun is a person, place or thing (park, trash). An adjective tells more about a noun (big, clean). A pronoun takes the place of a noun (we, they, it).",
    "tiers": [
      {
        "level": "Support",
        "instructions": "Circle the right answer. Then read the whole sentence aloud.",
        "example": "In 'The big dog runs', big is a ___. (noun / adjective)  ->  adjective",
        "items": [
          {
            "q": "Which word is a verb?",
            "options": [
              "reduce",
              "park"
            ],
            "answer": "reduce"
          },
          {
            "q": "Which word is a noun?",
            "options": [
              "tree",
              "clean"
            ],
            "answer": "tree"
          },
          {
            "q": "Which word is an adjective?",
            "options": [
              "green",
              "we"
            ],
            "answer": "green"
          },
          {
            "q": "Which word is a pronoun?",
            "options": [
              "they",
              "bin"
            ],
            "answer": "they"
          },
          {
            "q": "In 'We clean the park', We is a ___.",
            "options": [
              "pronoun",
              "noun"
            ],
            "answer": "pronoun"
          },
          {
            "q": "In 'The park is clean', clean is an ___.",
            "options": [
              "adjective",
              "verb"
            ],
            "answer": "adjective"
          },
          {
            "q": "In 'Mai picks up trash', picks up is a ___.",
            "options": [
              "verb",
              "noun"
            ],
            "answer": "verb"
          },
          {
            "q": "In 'They like it', It takes the place of a ___.",
            "options": [
              "noun",
              "verb"
            ],
            "answer": "noun"
          }
        ]
      },
      {
        "level": "Core",
        "instructions": "Write verb, noun, adjective or pronoun.",
        "example": "The word 'bin' is a ___.  ->  noun",
        "items": [
          {
            "q": "The word 'recycle' is a ___.",
            "answer": "verb"
          },
          {
            "q": "The word 'tree' is a ___.",
            "answer": "noun"
          },
          {
            "q": "The word 'healthy' is an ___.",
            "answer": "adjective"
          },
          {
            "q": "The word 'we' is a ___.",
            "answer": "pronoun"
          },
          {
            "q": "In 'The big dog runs in the park', big is a ___.",
            "answer": "adjective"
          },
          {
            "q": "In 'The big dog runs in the park', runs is a ___.",
            "answer": "verb"
          },
          {
            "q": "Fill in with a pronoun: Mai and Nam clean the park. ___ like it.",
            "answer": "They"
          },
          {
            "q": "Fill in with an adjective: The park is very ___. (clean or dirty)",
            "answer": "e.g. clean"
          }
        ]
      },
      {
        "level": "Challenge",
        "instructions": "Write full sentences. Think about each kind of word.",
        "example": "write a sentence with a noun and an adjective  ->  The clean park is big.",
        "items": [
          {
            "q": "Write a sentence with one verb, one noun and one adjective.",
            "answer": "e.g. The big dog runs in the park."
          },
          {
            "q": "Write a sentence with a pronoun about two friends who clean.",
            "answer": "e.g. They clean the park."
          },
          {
            "q": "Underline the pronoun and say who it is: 'Mai is kind. She helps me.'",
            "answer": "She = Mai"
          },
          {
            "q": "Find the adjective, the noun and the verb in: 'The green tree grows.'",
            "answer": "green = adjective; tree = noun; grows = verb"
          },
          {
            "q": "Write two sentences about the Earth: one with reduce and one with a pronoun.",
            "answer": "e.g. We reduce trash. It helps the Earth."
          },
          {
            "q": "Your friend says that 'clean' is always a verb. Is your friend right? Explain with two short sentences.",
            "answer": "e.g. No. In 'The park is clean', it is an adjective. In 'We clean the park', it is a verb."
          }
        ]
      }
    ]
  }
];
