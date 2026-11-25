// National Geographic Look 1, Unit 1: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U1Plays: Play[] = [
  {
    "id": "look1-u1-p1",
    "course": "look",
    "level": 1,
    "unit": 1,
    "afterLesson": 4,
    "title": "The Mystery Bag",
    "minutes": 16,
    "band": "6-8",
    "summary": "The Bag Owner pulls things out of a big bag. \"What's this?\" \"It's a ruler.\" The children guess: \"Is it a pen?\" and then a mouse pops out.",
    "targets": {
      "words": [
        "bag",
        "book",
        "crayon",
        "eraser",
        "pen",
        "pencil",
        "ruler"
      ],
      "grammar": [
        "What's this? It's a ...",
        "Is it a ...? Yes, it is. / No, it isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "owner",
        "name": "Bag Owner",
        "who": "a confident child: the most lines"
      },
      {
        "id": "mouse",
        "name": "Little Mouse",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Guessers",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: What's this?",
        "lines": [
          {
            "stage": "The Bag Owner holds a big bag. The Guessers sit in a half circle."
          },
          {
            "role": "n",
            "text": "This is a bag. A mystery bag!",
            "do": "Tap the bag."
          },
          {
            "everyone": "Open the bag! What's this?",
            "do": "Pretend to open a bag."
          },
          {
            "role": "k",
            "text": "What's this?",
            "do": "Point at the pen."
          },
          {
            "role": "owner",
            "text": "It's a pen.",
            "do": "Hold up the pen and write in the air."
          },
          {
            "role": "k",
            "text": "What's this?",
            "do": "Point at the ruler."
          },
          {
            "role": "owner",
            "text": "It's a ruler.",
            "do": "Measure the air with the ruler."
          },
          {
            "role": "k",
            "text": "What's this?",
            "do": "Point at the book."
          },
          {
            "role": "owner",
            "text": "It's a book.",
            "do": "Open the book and read."
          }
        ]
      },
      {
        "title": "Scene 2: Is it a ...?",
        "lines": [
          {
            "role": "n",
            "text": "The Bag Owner hides something. Guess!",
            "do": "Hold a hand over your eyes."
          },
          {
            "role": "k",
            "text": "Is it a pen?",
            "do": "Shake an imaginary bag."
          },
          {
            "role": "owner",
            "text": "No, it isn't.",
            "do": "Shake your head."
          },
          {
            "role": "k",
            "text": "Is it an eraser?",
            "do": "Rub the air."
          },
          {
            "role": "owner",
            "text": "No, it isn't.",
            "do": "Shake your head."
          },
          {
            "role": "k",
            "text": "Is it a pencil?",
            "do": "Draw a line in the air."
          },
          {
            "role": "owner",
            "text": "No, it isn't!",
            "do": "Shake your head and giggle."
          },
          {
            "role": "k",
            "text": "Is it a crayon?",
            "do": "Cross your fingers."
          },
          {
            "role": "owner",
            "text": "Yes, it is!",
            "do": "Hold up the crayon and cheer."
          },
          {
            "everyone": "Open the bag! What's this?",
            "do": "Pretend to open a bag."
          }
        ]
      },
      {
        "title": "Scene 3: A surprise",
        "lines": [
          {
            "role": "n",
            "text": "Something is in the bag. It moves!",
            "do": "Wiggle your fingers."
          },
          {
            "role": "k",
            "text": "What's this?",
            "do": "Point at the bag, eyes big."
          },
          {
            "role": "mouse",
            "text": "Squeak!",
            "do": "Pop up out of the bag."
          },
          {
            "role": "owner",
            "text": "It's a... mouse!",
            "do": "Jump back and laugh."
          },
          {
            "role": "k",
            "text": "Is it a pencil case?",
            "do": "Point and squint."
          },
          {
            "role": "mouse",
            "text": "Yes, it is! My bag!",
            "do": "Hide in the bag again."
          },
          {
            "role": "n",
            "text": "Pen, ruler, book: all in the bag.",
            "do": "Mime putting things in."
          },
          {
            "everyone": "Take care! Take care!",
            "do": "Hug a book."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly. The children only do the actions; they may join the refrain. Nobody has to speak alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Say each line; the child with that part echoes it with its action. Everyone says the refrain. Then give the one-minute fix."
      },
      {
        "round": "Perform with scripts or picture cards",
        "minutes": 4,
        "how": "Perform with scripts and real school things in a real bag. Say each \"It's a ...\" while holding up the thing."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "The Bag Owner chooses other things (pencil case, crayon, eraser). The Guessers ask \"What's this?\" and \"Is it a ...?\" with their own guesses."
      }
    ],
    "focusOnForm": [
      "\"It's a pen\", not \"It a pen\": clap on the 's.",
      "\"a\" before the thing: \"a ruler\", \"a book\" (\"an eraser\", \"an\" before a vowel).",
      "\"Yes, it is\" / \"No, it isn't\": not \"Yes, is\" or \"No, isn't\"; say all three words."
    ],
    "props": [
      "a big bag",
      "real pens, rulers, a book, a crayon, an eraser",
      "a mouse mask (optional)"
    ],
    "teacherNote": "Use real things so the children can hold the meaning in their hands. A shy child can be the Little Mouse and say two short lines.",
    "encore": "Next lesson, play it with a new set of things from the room, or with picture cards, as a warm-up with no scripts."
  },
  {
    "id": "look1-u1-p2",
    "course": "look",
    "level": 1,
    "unit": 1,
    "afterLesson": 7,
    "title": "Take Care of Your Things",
    "minutes": 16,
    "band": "6-8",
    "summary": "School things are all over the floor. A kind child asks \"What's this?\" and puts each in the pencil case. The pencil case says thank you.",
    "targets": {
      "words": [
        "bag",
        "book",
        "crayon",
        "eraser",
        "pen",
        "pencil case",
        "ruler"
      ],
      "grammar": [
        "What's this? It's a ...",
        "Is it a ...? Yes, it is. / No, it isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "helper",
        "name": "Kind Child",
        "who": "a confident child: asks and tidies"
      },
      {
        "id": "case",
        "name": "Pencil Case",
        "who": "a short, funny part: a big mouth",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Things",
        "who": "children who like to act; each is one school thing",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Oh no!",
        "lines": [
          {
            "stage": "Things lie on the floor. The Things lie down, each with a picture card. The Kind Child comes in."
          },
          {
            "role": "n",
            "text": "Oh no! School things are on the floor.",
            "do": "Look down and shake your head."
          },
          {
            "role": "helper",
            "text": "What's this?",
            "do": "Point at the first Thing."
          },
          {
            "role": "k",
            "text": "It's a pen.",
            "do": "Hold up your pen card, sad face."
          },
          {
            "role": "helper",
            "text": "What's this?",
            "do": "Point at the next Thing."
          },
          {
            "role": "k",
            "text": "It's a ruler.",
            "do": "Hold up your ruler card, sad face."
          },
          {
            "role": "helper",
            "text": "What's this?",
            "do": "Point at the next Thing."
          },
          {
            "role": "k",
            "text": "It's a crayon.",
            "do": "Hold up your crayon card, sad face."
          },
          {
            "role": "helper",
            "text": "What's this?",
            "do": "Point at the next Thing."
          },
          {
            "role": "k",
            "text": "It's a book.",
            "do": "Hold up your book card, sad face."
          },
          {
            "everyone": "Take care of your things!",
            "do": "Hug a book."
          }
        ]
      },
      {
        "title": "Scene 2: Where's the eraser?",
        "lines": [
          {
            "role": "n",
            "text": "The Pencil Case is open. It's hungry!",
            "do": "Open your arms like a big mouth."
          },
          {
            "role": "case",
            "text": "Is it a pen? Yes, it is!",
            "do": "Open wide, then close like a mouth."
          },
          {
            "role": "helper",
            "text": "Pen in the pencil case. Is this a bag?",
            "do": "Put the pen in, then point at a bag."
          },
          {
            "role": "case",
            "text": "No, it isn't! I'm a pencil case!",
            "do": "Shake your head and laugh."
          },
          {
            "role": "k",
            "text": "Is it an eraser?",
            "do": "Look under a chair."
          },
          {
            "role": "k",
            "text": "It's an eraser!",
            "do": "Hold up the eraser card, happy face."
          },
          {
            "role": "helper",
            "text": "Eraser in the pencil case. Thank you!",
            "do": "Put the eraser in."
          },
          {
            "role": "k",
            "text": "It's a pencil case. Thank you!",
            "do": "Bow to the Kind Child."
          }
        ]
      },
      {
        "title": "Scene 3: All clean",
        "lines": [
          {
            "role": "n",
            "text": "Now the things are in the bag.",
            "do": "Mime zipping a bag."
          },
          {
            "role": "k",
            "text": "What's this? It's a bag.",
            "do": "Point, then pat the bag."
          },
          {
            "role": "k",
            "text": "Is it a book? Yes, it is.",
            "do": "Open a book and nod."
          },
          {
            "role": "helper",
            "text": "Take care of your things!",
            "do": "Wag a finger and smile."
          },
          {
            "everyone": "Take care! Take care!",
            "do": "Hug a book."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly. The children only do the actions; they may join the refrain. Nobody has to speak alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Say each line; the child with that part echoes it with its action. Everyone says the refrain. Then give the one-minute fix."
      },
      {
        "round": "Perform with scripts or picture cards",
        "minutes": 4,
        "how": "Perform with scripts and real things on the floor. Each Thing picks itself up when it gets a \"Thank you\"."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children choose different things (a crayon, a ruler, an eraser) and make new questions: \"What's this?\" \"Is it a ...?\" Add one thing you can see in your own bag."
      }
    ],
    "focusOnForm": [
      "\"It's a ...\": say the 's at the end of \"It's\" (not \"It a\").",
      "\"an eraser\": \"an\" before a vowel sound.",
      "Final sounds: \"pen\", \"book\", \"crayon\": ask the child to say the last sound loudly."
    ],
    "props": [
      "a pencil case",
      "school things",
      "picture cards for each Thing"
    ],
    "teacherNote": "The Value is the message: take care of your school things. Let the children finish with a real tidy-up of the classroom.",
    "encore": "In a later lesson, lose a different thing and ask \"What's this?\" again, with new school things on the floor."
  }
];
