// National Geographic Look 1, Unit 6: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U6Plays: Play[] = [
  {
    "id": "look1-u6-p1",
    "course": "look",
    "level": 1,
    "unit": 6,
    "afterLesson": 4,
    "title": "Where's the Teddy Bear?",
    "minutes": 16,
    "band": "6-8",
    "summary": "A child cannot find the teddy bear. \"Where's the teddy bear?\" \"It's in the kitchen.\" \"No, it isn't.\" It is hiding in the shower, wearing a hat!",
    "targets": {
      "words": [
        "bathroom",
        "bedroom",
        "kitchen",
        "living room",
        "bed",
        "shower",
        "TV"
      ],
      "grammar": [
        "Where's the ...? It's in the ...",
        "The ... is on / under / next to the ..."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "seeker",
        "name": "Seeker",
        "who": "a confident child: the most lines"
      },
      {
        "id": "teddy",
        "name": "Teddy Bear",
        "who": "a short, funny part",
        "optional": {
          "cut": true
        }
      },
      {
        "id": "k",
        "name": "Home Helpers",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Where is it?",
        "lines": [
          {
            "stage": "The room has five places: bedroom, bathroom, kitchen, living room and the shower. The Home Helpers stand at the places."
          },
          {
            "role": "n",
            "text": "The Seeker has a teddy bear. It's lost!",
            "do": "Look around, sad."
          },
          {
            "role": "seeker",
            "text": "Where's the teddy bear?",
            "do": "Hands out, shrug."
          },
          {
            "role": "k",
            "text": "It's in the bedroom.",
            "do": "Point at the bedroom."
          },
          {
            "role": "seeker",
            "text": "Is it in the bedroom? No, it isn't.",
            "do": "Look and shake your head."
          },
          {
            "role": "k",
            "text": "It's in the kitchen.",
            "do": "Point at the kitchen."
          },
          {
            "role": "seeker",
            "text": "Is it in the kitchen? No, it isn't.",
            "do": "Look and shake your head."
          },
          {
            "everyone": "Where's the teddy bear? Where?",
            "do": "Look left, look right."
          }
        ]
      },
      {
        "title": "Scene 2: Under and on",
        "lines": [
          {
            "role": "k",
            "text": "It's in the living room.",
            "do": "Point at the living room."
          },
          {
            "role": "seeker",
            "text": "The teddy bear is under the bed?",
            "do": "Look under the bed."
          },
          {
            "role": "k",
            "text": "No, it isn't. It's on the TV.",
            "do": "Point at the TV."
          },
          {
            "role": "seeker",
            "text": "Is it on the TV? No, it isn't.",
            "do": "Look up and shake your head."
          },
          {
            "role": "k",
            "text": "It's in the bathroom.",
            "do": "Point at the bathroom."
          },
          {
            "role": "k",
            "text": "It's next to the bed.",
            "do": "Point next to the bed."
          },
          {
            "role": "seeker",
            "text": "No, it isn't!",
            "do": "Shake your head and stamp."
          },
          {
            "everyone": "Where's the teddy bear? Where?",
            "do": "Look left, look right."
          }
        ]
      },
      {
        "title": "Scene 3: In the shower!",
        "lines": [
          {
            "role": "n",
            "text": "Listen! Shh. Something splashes.",
            "do": "Hand to ear, splash."
          },
          {
            "role": "k",
            "text": "It's in the shower!",
            "do": "Point at the shower."
          },
          {
            "role": "teddy",
            "text": "Hello! I'm in the shower!",
            "do": "Pop up in a shower hat."
          },
          {
            "role": "seeker",
            "text": "Oh! It's in the shower!",
            "do": "Laugh and clap."
          },
          {
            "role": "k",
            "text": "Teddy bear in the shower!",
            "do": "Point and laugh."
          },
          {
            "role": "k",
            "text": "It's on the bed!",
            "do": "Point at the bed."
          },
          {
            "role": "seeker",
            "text": "The teddy bear is next to the bed. Good night!",
            "do": "Hug the bear."
          },
          {
            "everyone": "Where's the teddy bear? Here!",
            "do": "Hug a teddy bear."
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
        "how": "Perform with scripts and picture cards or a toy teddy bear that moves around the real classroom."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Hide a real toy in the classroom. The class asks \"Where's the ...?\" and the Helpers answer \"It's in / on / under the ...\" with the places they can see."
      }
    ],
    "focusOnForm": [
      "\"It's in the kitchen\": not \"It in kitchen\": say \"the\" and the little 's.",
      "\"in\" vs \"on\" vs \"under\": show with a hand on each, never mix them.",
      "\"Where's\": say the 's: \"Where is\" together."
    ],
    "props": [
      "a teddy bear toy",
      "room cards (bathroom, bedroom, kitchen, living room)",
      "a paper bed, TV and shower"
    ],
    "teacherNote": "Put the room cards around the classroom. The children move to each room as they say its name.",
    "encore": "Later, hide a different toy and use \"under\", \"on\" and \"next to\" in the real classroom."
  },
  {
    "id": "look1-u6-p2",
    "course": "look",
    "level": 1,
    "unit": 6,
    "afterLesson": 7,
    "title": "Hide and Seek at Home",
    "minutes": 16,
    "band": "6-8",
    "summary": "Friends play hide and seek with toys in a home. \"Where's the ball?\" \"The ball is under the bed.\" A friend hides, too, and everyone has fun.",
    "targets": {
      "words": [
        "bathroom",
        "bedroom",
        "kitchen",
        "living room",
        "bed",
        "cabinet",
        "shower",
        "TV"
      ],
      "grammar": [
        "Where's the ...? It's in the ...",
        "The ... is on / under / next to the ..."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "seeker",
        "name": "Seeker",
        "who": "a confident child: asks where"
      },
      {
        "id": "hider",
        "name": "Silly Friend",
        "who": "a short, funny part: hides badly",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Hiding Friends",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: One, two, three",
        "lines": [
          {
            "stage": "The Seeker covers their eyes. The Hiding Friends hide a toy or themselves around the room."
          },
          {
            "role": "n",
            "text": "Hide and seek! Close your eyes!",
            "do": "Cover your eyes."
          },
          {
            "everyone": "Hide and seek! One, two, three!",
            "do": "Count and cover your eyes."
          },
          {
            "role": "seeker",
            "text": "Where's the ball?",
            "do": "Look around."
          },
          {
            "role": "k",
            "text": "The ball is under the bed.",
            "do": "Point under the bed."
          },
          {
            "role": "seeker",
            "text": "Where's the kite?",
            "do": "Look around."
          },
          {
            "role": "k",
            "text": "The kite is on the TV.",
            "do": "Point at the TV."
          },
          {
            "role": "seeker",
            "text": "Where's the doll?",
            "do": "Look around."
          },
          {
            "role": "k",
            "text": "The doll is next to the cabinet.",
            "do": "Point next to the cabinet."
          }
        ]
      },
      {
        "title": "Scene 2: More places",
        "lines": [
          {
            "role": "seeker",
            "text": "Where's the train?",
            "do": "Look in the kitchen."
          },
          {
            "role": "k",
            "text": "The train is in the kitchen.",
            "do": "Point at the kitchen."
          },
          {
            "role": "seeker",
            "text": "Where's the game?",
            "do": "Look in the living room."
          },
          {
            "role": "k",
            "text": "The game is in the living room.",
            "do": "Point at the living room."
          },
          {
            "role": "seeker",
            "text": "Where's the plane?",
            "do": "Look in the bathroom."
          },
          {
            "role": "k",
            "text": "The plane is in the bathroom.",
            "do": "Point at the bathroom."
          },
          {
            "role": "seeker",
            "text": "Where's the bat?",
            "do": "Look in the bedroom."
          },
          {
            "role": "k",
            "text": "The bat is in the bedroom.",
            "do": "Point at the bedroom."
          },
          {
            "everyone": "Hide and seek! One, two, three!",
            "do": "Count and cover your eyes."
          }
        ]
      },
      {
        "title": "Scene 3: A friend!",
        "lines": [
          {
            "role": "seeker",
            "text": "Where's my friend?",
            "do": "Look around, hands out."
          },
          {
            "role": "n",
            "text": "Look! Two feet under the bed.",
            "do": "Point at the bed."
          },
          {
            "role": "k",
            "text": "The friend is under the bed!",
            "do": "Point and laugh."
          },
          {
            "role": "hider",
            "text": "I'm here! Hello!",
            "do": "Wave from under the bed."
          },
          {
            "role": "seeker",
            "text": "Oh! The friend is next to the shower!",
            "do": "Point at the shower."
          },
          {
            "role": "hider",
            "text": "No! I'm in the cabinet!",
            "do": "Hide in the cabinet."
          },
          {
            "role": "k",
            "text": "Play with your friends!",
            "do": "Hold hands and smile."
          },
          {
            "everyone": "Hide and seek! One, two, three!",
            "do": "Count and cover your eyes."
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
        "how": "Perform with scripts and real toys hidden around the classroom. Each answer points to the real place."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children hide a different toy in the classroom and use \"in\", \"on\", \"under\" and \"next to\" with their own places."
      }
    ],
    "focusOnForm": [
      "\"on\" / \"under\" / \"next to\": show with a hand each time.",
      "\"The ball is under the bed\": not \"Ball under bed\": say \"the\" each time.",
      "\"Where's the ...?\": say the 's and the end of the word."
    ],
    "props": [
      "toys to hide",
      "paper bed, TV, cabinet, shower",
      "room cards"
    ],
    "teacherNote": "Value: play with your friends. Keep the hiding friendly; nobody is left out.",
    "encore": "Later, hide new toys and play it as a real game, with a different Seeker."
  }
];
