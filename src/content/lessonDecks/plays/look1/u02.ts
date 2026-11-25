// National Geographic Look 1, Unit 2: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U2Plays: Play[] = [
  {
    "id": "look1-u2-p1",
    "course": "look",
    "level": 1,
    "unit": 2,
    "afterLesson": 4,
    "title": "Whose Toy Is This?",
    "minutes": 16,
    "band": "6-8",
    "summary": "The Toy Keeper holds up lost toys. \"Is this your ball?\" \"No, it isn't.\" \"Is this your doll?\" \"Yes, it is! This is my doll!\" Then a teddy bear says it is NOT a toy.",
    "targets": {
      "words": [
        "ball",
        "bat",
        "doll",
        "kite",
        "plane",
        "teddy bear",
        "train"
      ],
      "grammar": [
        "This is my ... / Is this your ...? Yes, it is. / No, it isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "keeper",
        "name": "Toy Keeper",
        "who": "a confident child: holds the toys, asks the questions"
      },
      {
        "id": "teddy",
        "name": "Teddy Bear",
        "who": "a short, funny part: sits very still",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Toy Owners",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Lost toys",
        "lines": [
          {
            "stage": "The Toy Keeper stands behind a table of toys. The Toy Owners wait."
          },
          {
            "role": "n",
            "text": "Many toys are lost! Whose toy is this?",
            "do": "Look at the toys, hands out."
          },
          {
            "role": "keeper",
            "text": "Is this your ball?",
            "do": "Hold up the ball."
          },
          {
            "role": "k",
            "text": "No, it isn't.",
            "do": "Shake your head."
          },
          {
            "role": "keeper",
            "text": "Is this your kite?",
            "do": "Hold up the kite."
          },
          {
            "role": "k",
            "text": "No, it isn't.",
            "do": "Shake your head and fly a kite in the air."
          },
          {
            "role": "keeper",
            "text": "Is this your doll?",
            "do": "Hold up the doll."
          },
          {
            "role": "k",
            "text": "Yes, it is! This is my doll!",
            "do": "Hug the doll."
          },
          {
            "everyone": "Whose toy? My toy!",
            "do": "Hold your hands out, then hug yourself."
          }
        ]
      },
      {
        "title": "Scene 2: More toys",
        "lines": [
          {
            "role": "keeper",
            "text": "Is this your train?",
            "do": "Roll the train."
          },
          {
            "role": "k",
            "text": "Yes, it is! This is my train!",
            "do": "Go choo-choo."
          },
          {
            "role": "keeper",
            "text": "Is this your plane?",
            "do": "Hold up the plane."
          },
          {
            "role": "k",
            "text": "No, it isn't.",
            "do": "Shake your head."
          },
          {
            "role": "keeper",
            "text": "Is this your bat?",
            "do": "Hold up the bat."
          },
          {
            "role": "k",
            "text": "Yes, it is! This is my bat!",
            "do": "Swing the bat."
          },
          {
            "role": "keeper",
            "text": "Is this your game?",
            "do": "Hold up the game."
          },
          {
            "role": "k",
            "text": "Yes, it is! This is my game!",
            "do": "Roll the dice."
          },
          {
            "role": "k",
            "text": "This is my plane!",
            "do": "Fly the plane in the air."
          },
          {
            "everyone": "Whose toy? My toy!",
            "do": "Hold your hands out, then hug yourself."
          }
        ]
      },
      {
        "title": "Scene 3: The teddy bear",
        "lines": [
          {
            "role": "keeper",
            "text": "Is this your teddy bear?",
            "do": "Hold up the teddy bear."
          },
          {
            "role": "teddy",
            "text": "No, it isn't! I'm not a toy!",
            "do": "Wriggle free and stand up."
          },
          {
            "role": "keeper",
            "text": "Oh! This is my... friend!",
            "do": "Shake the bear's hand."
          },
          {
            "role": "k",
            "text": "This is my teddy bear!",
            "do": "Hug a toy bear."
          },
          {
            "role": "n",
            "text": "All the toys have a home.",
            "do": "Hands together, smile."
          },
          {
            "everyone": "Whose toy? My toy!",
            "do": "Hold your hands out, then hug yourself."
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
        "how": "Perform with scripts and real toys (or picture cards). The Toy Owners say \"This is my ...\" while holding their toy."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Each child brings or draws a toy. The Keeper asks \"Is this your ...?\" and the owner answers with their own words."
      }
    ],
    "focusOnForm": [
      "\"This is my train\": not \"This my train\" or \"This is me train\": touch your chest on \"my\".",
      "\"Is this your ...?\": start with \"Is\", not \"This your ...?\".",
      "\"Yes, it is\" / \"No, it isn't\": say all three words."
    ],
    "props": [
      "toys or picture cards (ball, bat, doll, game, kite, plane, teddy bear, train)",
      "a table",
      "a teddy bear mask (optional)"
    ],
    "teacherNote": "For \"Is this your ...?\" the Keeper holds up the toy with a big face. Do a pretend-wrong guess so the children can say \"No, it isn't.\"",
    "encore": "In a later lesson, perform it with real toys from home or the shelf, and have the Keeper pick a new toy."
  },
  {
    "id": "look1-u2-p2",
    "course": "look",
    "level": 1,
    "unit": 2,
    "afterLesson": 7,
    "title": "Share the Train",
    "minutes": 16,
    "band": "6-8",
    "summary": "A grumpy child keeps every toy: \"This is my train!\" Kind friends ask \"Is this your kite?\" until the grumpy child learns to share.",
    "targets": {
      "words": [
        "ball",
        "doll",
        "kite",
        "plane",
        "teddy bear",
        "train",
        "game"
      ],
      "grammar": [
        "This is my ... / Is this your ...? Yes, it is. / No, it isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "grump",
        "name": "Grumpy Child",
        "who": "a confident child: a funny grumpy face"
      },
      {
        "id": "kind",
        "name": "Kind Child",
        "who": "a confident child: shares first"
      },
      {
        "id": "k",
        "name": "Toy Friends",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: All mine!",
        "lines": [
          {
            "stage": "The Grumpy Child sits on a pile of toys, arms crossed. The Toy Friends watch."
          },
          {
            "role": "n",
            "text": "The Grumpy Child has many toys.",
            "do": "Point to the pile."
          },
          {
            "role": "grump",
            "text": "This is my train! This is my ball!",
            "do": "Hug the train and ball."
          },
          {
            "role": "k",
            "text": "Is this your kite?",
            "do": "Point at the kite."
          },
          {
            "role": "grump",
            "text": "Yes, it is! This is my kite!",
            "do": "Pull the kite close."
          },
          {
            "role": "k",
            "text": "Is this your doll?",
            "do": "Point at the doll."
          },
          {
            "role": "grump",
            "text": "Yes, it is! This is my doll!",
            "do": "Pull the doll close."
          },
          {
            "role": "k",
            "text": "Is this your game?",
            "do": "Point at the game."
          },
          {
            "role": "grump",
            "text": "Yes, it is! This is my game!",
            "do": "Hug the game, grumpy face."
          },
          {
            "everyone": "Share, share, share!",
            "do": "Hold both hands out."
          }
        ]
      },
      {
        "title": "Scene 2: Hello, friend",
        "lines": [
          {
            "role": "kind",
            "text": "Is this your plane?",
            "do": "Smile and point at the plane."
          },
          {
            "role": "grump",
            "text": "No, it isn't. It's... my friend's.",
            "do": "Look away, then peek."
          },
          {
            "role": "k",
            "text": "Is this your teddy bear?",
            "do": "Point at the teddy bear."
          },
          {
            "role": "grump",
            "text": "No, it isn't. This is your teddy bear!",
            "do": "Hand over the bear, surprised."
          },
          {
            "role": "kind",
            "text": "This is my train. Play with me!",
            "do": "Roll the train to the Grumpy Child."
          },
          {
            "role": "k",
            "text": "This is my kite. Play with me!",
            "do": "Fly the kite to the Grumpy Child."
          },
          {
            "role": "k",
            "text": "This is my ball. Play with me!",
            "do": "Roll the ball to the Grumpy Child."
          },
          {
            "role": "k",
            "text": "This is my doll. Play with me!",
            "do": "Offer the doll with both hands."
          }
        ]
      },
      {
        "title": "Scene 3: Happy together",
        "lines": [
          {
            "role": "grump",
            "text": "This is my train! Is this your game?",
            "do": "Smile, hold up the train and the game."
          },
          {
            "role": "kind",
            "text": "Yes, it is. Play with me!",
            "do": "Nod and sit down."
          },
          {
            "role": "n",
            "text": "The Grumpy Child has a smile now.",
            "do": "Smile wide."
          },
          {
            "role": "k",
            "text": "This is my plane!",
            "do": "Fly the plane in the air."
          },
          {
            "role": "k",
            "text": "Is this your game? Yes, it is!",
            "do": "Nod and smile."
          },
          {
            "role": "grump",
            "text": "Share, share, share!",
            "do": "Open your arms and hand a toy over."
          },
          {
            "everyone": "Share, share, share!",
            "do": "Hold both hands out."
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
        "how": "Perform with scripts and real toys. The Grumpy Child keeps a toy until a friend asks nicely, then hands it over."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children choose other toys and say \"This is my ...\" and \"Is this your ...?\". They hand over a toy and say \"Play with me.\""
      }
    ],
    "focusOnForm": [
      "\"This is my ...\": not \"This my ...\" or \"This is me ...\".",
      "\"Is this your ...?\": start with \"Is\".",
      "\"my\" and \"your\": touch your chest on \"my\", point at the friend on \"your\"."
    ],
    "props": [
      "toys or picture cards",
      "a pile of toys on a chair"
    ],
    "teacherNote": "Value: share your toys. Let the children share a real toy at the end of the play.",
    "encore": "Later, perform with the Grumpy Child and Kind Child swapped, and with new toys from the box."
  }
];
