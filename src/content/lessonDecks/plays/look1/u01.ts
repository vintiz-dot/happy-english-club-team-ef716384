// National Geographic Look 1, Unit 1: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U1Plays: Play[] = [
  {
    "id": "look1-u1-p1",
    "course": "look",
    "level": 1,
    "unit": 1,
    "afterLesson": 4,
    "title": "Mouse in the Dark",
    "minutes": 16,
    "band": "6-8",
    "summary": "At night a hungry Mouse feels its way across the sleeping Desks, looking for a cookie: a ruler, a book, and a small thing a sleepy Desk says is a cookie. It bites: it's an eraser! The OW wakes the Desks, who fear a cat, and the same sleepy Desk makes up for it by finding the real cookie in its bag.",
    "targets": {
      "words": [
        "ruler",
        "book",
        "eraser",
        "bag",
        "pencil case",
        "pen",
        "pencil"
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
        "who": "the teacher: holds the flashlight",
        "teacher": true
      },
      {
        "id": "mouse",
        "name": "Mouse",
        "who": "a lively child: squeaky, hungry, in a hurry"
      },
      {
        "id": "desk",
        "name": "Desk",
        "who": "sleepy and grumpy; each Desk kneels and holds the things its own lines name",
        "group": {
          "max": 10
        }
      },
      {
        "id": "clock",
        "name": "Clock",
        "who": "a small part: ticks, then RINGS and wakes everyone",
        "optional": {
          "cut": true
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: A cookie?",
        "lines": [
          {
            "stage": "Night in the classroom. The Desks kneel in a row, heads down. They hold a ruler, a book, an eraser, and a bag with a pencil case and a cookie in it. The lights go off. Only the Narrator has a flashlight, so the Mouse cannot see."
          },
          {
            "stage": "The Clock stands at the back.",
            "if": "clock"
          },
          {
            "role": "n",
            "text": "Shh! It's night.",
            "do": "Switch off the light. Hands by your cheek: sleep."
          },
          {
            "role": "desk",
            "text": "Zzz... zzz...",
            "do": "Heads down. Snore.",
            "member": 1
          },
          {
            "role": "clock",
            "text": "Tick, tock! Tick, tock!",
            "do": "Swing your arm like a clock."
          },
          {
            "role": "mouse",
            "text": "Squeak! A cookie! A cookie!",
            "do": "Sniff the air and rub your tummy."
          },
          {
            "role": "n",
            "text": "It's dark. Feel, Mouse, feel!",
            "do": "Cover your eyes, then feel the air with your hands."
          },
          {
            "role": "mouse",
            "text": "What's this?",
            "do": "Eyes shut. Feel a long, flat thing on a Desk."
          },
          {
            "role": "n",
            "text": "Is it a cookie?",
            "do": "Shine the flashlight on the ruler for the audience."
          },
          {
            "role": "desk",
            "text": "No, it isn't! It's a RULER!",
            "do": "Grumpy. Measure the air, then heads down again.",
            "all": true
          },
          {
            "role": "mouse",
            "text": "A ruler. No cookie.",
            "do": "Sad face. Rub your tummy."
          },
          {
            "role": "mouse",
            "text": "Is it a bag?",
            "do": "Eyes shut. Feel a big, flat thing on the next Desk."
          },
          {
            "role": "desk",
            "text": "No, it isn't. It's a book.",
            "do": "Open the book like a door, then snore.",
            "member": 2
          },
          {
            "role": "clock",
            "text": "Tick, tock!",
            "do": "Swing your arm like a clock."
          },
          {
            "role": "mouse",
            "text": "Oh no! A cookie, please!",
            "do": "Paws together. Beg."
          },
          {
            "role": "mouse",
            "text": "Small! Is it a cookie?",
            "do": "Eyes shut. Feel a small thing on the next Desk. Lick your lips."
          },
          {
            "stage": "The Narrator shines the flashlight so only the audience sees: it is an eraser! The Mouse's eyes are still shut."
          },
          {
            "role": "desk",
            "text": "Yes, it is. Zzz...",
            "do": "Nod without looking, then snore.",
            "member": 3
          },
          {
            "role": "mouse",
            "text": "Yum, yum... OW!",
            "do": "Take a big bite, then hold your teeth."
          },
          {
            "role": "n",
            "text": "Is it a cookie?",
            "do": "Shine the flashlight on it."
          },
          {
            "everyone": "No, it isn't! It's an ERASER!",
            "do": "Rub the air hard, like an eraser."
          },
          {
            "role": "mouse",
            "text": "Oh! Sorry, eraser!",
            "do": "Pat the eraser and put it back on the Desk."
          },
          {
            "role": "clock",
            "text": "RING! RING! RING!",
            "do": "Jump and shake like an alarm clock."
          }
        ]
      },
      {
        "title": "Scene 2: Is it a cat?",
        "lines": [
          {
            "stage": "The noise wakes the Desks. The Mouse climbs onto a Desk's back. In the dark, the Desks cannot see it."
          },
          {
            "role": "desk",
            "text": "Oh! What's this?",
            "do": "Eyes shut. Feel the air above your back.",
            "member": 4
          },
          {
            "role": "mouse",
            "text": "Squeak!",
            "do": "Wiggle your nose."
          },
          {
            "role": "desk",
            "text": "Oh no! Is it a cat?",
            "do": "Shake with fear. Hands up like claws.",
            "member": 5
          },
          {
            "role": "mouse",
            "text": "No! I'm a mouse! Squeak!",
            "do": "Shake your head fast, then wave your paws."
          },
          {
            "role": "desk",
            "text": "A mouse!",
            "do": "Whisper it to the next Desk.",
            "member": 6
          },
          {
            "role": "desk",
            "text": "A mouse!",
            "do": "Say it louder to the next Desk.",
            "member": 7
          },
          {
            "role": "desk",
            "text": "A MOUSE!",
            "do": "Shout it, hands up.",
            "member": 8
          },
          {
            "role": "desk",
            "text": "Shh! Hello, Mouse!",
            "do": "Finger on your lips, then a small wave.",
            "member": 9
          },
          {
            "role": "mouse",
            "text": "Hello! A cookie, please!",
            "do": "Rub your tummy, paws together."
          },
          {
            "role": "desk",
            "text": "A cookie! Hmm...",
            "do": "Tap your chin and think.",
            "member": 10
          }
        ]
      },
      {
        "title": "Scene 3: In the bag",
        "lines": [
          {
            "stage": "The sleepy Desk from before (the one who said \"Yes, it is\") has the bag."
          },
          {
            "role": "desk",
            "text": "Here! It's a bag.",
            "do": "Put the bag in the Mouse's paws. Eyes wide open now.",
            "member": 3
          },
          {
            "role": "mouse",
            "text": "A bag! What's this?",
            "do": "Eyes shut. Put a paw in the bag and feel."
          },
          {
            "role": "desk",
            "text": "It's a pencil case.",
            "do": "Pull a zip along in the air.",
            "member": 3
          },
          {
            "role": "mouse",
            "text": "A pencil case! Is it a pencil?",
            "do": "Feel a thin, long thing inside it."
          },
          {
            "role": "desk",
            "text": "No, it isn't. It's a pen.",
            "do": "Write in the air.",
            "member": 3
          },
          {
            "role": "mouse",
            "text": "A pen! Is it a cookie?",
            "do": "Feel deep in the bag: something round."
          },
          {
            "role": "desk",
            "text": "Yes, it is!",
            "do": "Look into the bag first, then a big nod.",
            "member": 3
          },
          {
            "role": "mouse",
            "text": "Light, please!",
            "do": "Hold up a paw: stop! Check first."
          },
          {
            "role": "n",
            "text": "Look!",
            "do": "Shine the flashlight into the bag."
          },
          {
            "everyone": "It's a cookie! Yum!",
            "do": "Jump up and cheer. The Mouse holds up the cookie."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly, in a whisper for the night. The children only do the actions and join the together lines. Nobody speaks alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with its action. Then give the one-minute fix."
      },
      {
        "round": "Perform with the script",
        "minutes": 4,
        "how": "Perform with the script, real school things and the flashlight. The Mouse keeps its eyes shut and really feels each thing before asking."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "No script. The Desks hold new school things (a crayon, a pencil, a pencil case). The Mouse feels each one with eyes shut and asks \"What's this?\" or \"Is it a ...?\"."
      }
    ],
    "focusOnForm": [
      "\"It's a ruler\", not \"It ruler\" or \"Is ruler\": clap on \"It's\" and on \"a\".",
      "\"an eraser\", not \"a eraser\": \"an\" before a vowel sound. Say it as one word: an-eraser.",
      "\"No, it isn't\", not \"No, it not\": three words, three claps.",
      "Final sounds: \"book\", \"bag\", \"case\". Vietnamese learners drop them: say it again and hold the last sound (boo-k, ba-g)."
    ],
    "props": [
      "a flashlight (or a phone light)",
      "a ruler, a book, an eraser, a bag, a pencil case with a pen in it",
      "a cookie (or a picture of one)",
      "mouse ears (optional)"
    ],
    "teacherNote": "Close the curtains or dim the lights: the dark is the gap. The Mouse keeps its eyes shut, so every question is real; your flashlight shows the audience the truth first, so they enjoy the eraser joke before the Mouse does. Hand out the things after casting: the Desk with the book says the book line, and the sleepy Desk who says \"Yes, it is. Zzz...\" holds the eraser AND the bag, so the Desk that fooled the Mouse is the one that helps it. The \"A mouse!\" whisper runs down the row of Desks, louder each time. You read the Narrator. In a small class the Clock is left out and the Mouse's OW wakes the Desks.",
    "encore": "In a later lesson, play it again with the Desks holding new things, and move the cookie to a new place: in the pencil case, under a book."
  },
  {
    "id": "look1-u1-p2",
    "course": "look",
    "level": 1,
    "unit": 1,
    "afterLesson": 7,
    "title": "Behind Your Back",
    "minutes": 16,
    "band": "6-8",
    "summary": "A Messy Kid throws school things on the floor and runs off. The Classmates hide them behind their backs, and the Kid must guess each one to get it back. But no Classmate has the ruler: it is in the Kid's own bag! Then the Kid hides a surprise: one pencil case for all the things.",
    "targets": {
      "words": [
        "pen",
        "pencil",
        "crayon",
        "eraser",
        "ruler",
        "bag",
        "book",
        "pencil case"
      ],
      "grammar": [
        "Is it a ...? Yes, it is. / No, it isn't.",
        "What's this? It's a ..."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher",
        "teacher": true
      },
      {
        "id": "kid",
        "name": "Messy Kid",
        "who": "a lively child: always in a hurry, then sorry"
      },
      {
        "id": "cl",
        "name": "Classmate",
        "who": "kind but firm; each hides the thing their own lines name",
        "group": {
          "max": 10
        }
      },
      {
        "id": "dog",
        "name": "Puppy",
        "who": "a small, funny part: wants to chew everything",
        "optional": {
          "cut": true
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Bye, bye, things!",
        "lines": [
          {
            "stage": "A desk with school things on it: a pen, a pencil, a book, an eraser, a ruler. The Messy Kid wears a bag on their back. The Classmates sit in a row."
          },
          {
            "role": "n",
            "text": "Look! A pen, a pencil, a book...",
            "do": "Point at each thing on the desk."
          },
          {
            "role": "kid",
            "text": "Pen, bye!",
            "do": "Throw the pen over your shoulder."
          },
          {
            "role": "cl",
            "text": "Oh no! The pen!",
            "do": "Catch the pen and keep it.",
            "member": 1
          },
          {
            "role": "kid",
            "text": "Pencil, bye!",
            "do": "Throw the pencil over your shoulder."
          },
          {
            "role": "cl",
            "text": "Oh no! The pencil!",
            "do": "Catch the pencil and keep it.",
            "member": 3
          },
          {
            "role": "kid",
            "text": "Book, bye!",
            "do": "Drop the book on the floor."
          },
          {
            "role": "cl",
            "text": "Oh no! The book!",
            "do": "Pick up the book and hug it.",
            "member": 2
          },
          {
            "role": "kid",
            "text": "Eraser, bye!",
            "do": "Throw the eraser over your shoulder."
          },
          {
            "role": "cl",
            "text": "Oh no! The eraser!",
            "do": "Catch the eraser and keep it.",
            "member": 4
          },
          {
            "role": "dog",
            "text": "Woof! An eraser! Yum!",
            "do": "Run in on all fours and sniff at the eraser."
          },
          {
            "stage": "The Messy Kid pushes the ruler into the bag on their back and forgets it. The audience can see the ruler; the Kid cannot."
          },
          {
            "role": "kid",
            "text": "Play time! Bye!",
            "do": "Run off, waving."
          },
          {
            "role": "n",
            "text": "Oh no! The Classmates hide the things.",
            "do": "Put your hands behind your back."
          },
          {
            "role": "cl",
            "text": "Shh!",
            "do": "Finger on your lips. Hide the things behind your backs.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 2: Is it a pencil?",
        "lines": [
          {
            "stage": "The Classmates stand in a row, things behind their backs. The Kid cannot see them."
          },
          {
            "role": "n",
            "text": "Now draw, everyone!",
            "do": "Draw a big circle in the air."
          },
          {
            "role": "kid",
            "text": "My pencil! My pen! Oh no!",
            "do": "Pat your pockets, look under the desk."
          },
          {
            "role": "cl",
            "text": "Guess! Guess!",
            "do": "Wiggle your hands behind your back and giggle.",
            "all": true
          },
          {
            "role": "kid",
            "text": "Is it a crayon?",
            "do": "Point behind a Classmate's back. Color in the air."
          },
          {
            "role": "cl",
            "text": "No, it isn't!",
            "do": "Shake your head. Keep your hands behind you.",
            "member": 3
          },
          {
            "role": "kid",
            "text": "Is it a pencil?",
            "do": "Point behind the same Classmate's back. Draw a long line in the air."
          },
          {
            "role": "cl",
            "text": "Yes, it is! Take care of it!",
            "do": "Give the pencil back and wag a finger.",
            "member": 3
          },
          {
            "role": "kid",
            "text": "Thank you!",
            "do": "Hug the pencil."
          },
          {
            "role": "kid",
            "text": "What's this?",
            "do": "Point behind the next Classmate's back."
          },
          {
            "role": "cl",
            "text": "It's an eraser. Take care of it!",
            "do": "Rub the air, then give the eraser back.",
            "member": 4
          },
          {
            "role": "dog",
            "text": "Woof! Yum?",
            "do": "Jump up at the eraser."
          },
          {
            "role": "kid",
            "text": "Thank you! My ruler, please!",
            "do": "Measure the air with your hands."
          },
          {
            "role": "kid",
            "text": "Is it a ruler?",
            "do": "Point behind the next Classmate's back."
          },
          {
            "role": "cl",
            "text": "No, it isn't. It's a pen!",
            "do": "Write in the air, then give the pen back.",
            "member": 1
          },
          {
            "role": "kid",
            "text": "Is it a ruler?",
            "do": "Point behind the next Classmate's back, worried."
          },
          {
            "role": "cl",
            "text": "No, it isn't. It's a book!",
            "do": "Open your hands like a book, then give it back.",
            "member": 2
          },
          {
            "role": "kid",
            "text": "Oh no! My ruler!",
            "do": "Hands on your head."
          },
          {
            "role": "cl",
            "text": "Not me!",
            "do": "Show your empty hands.",
            "member": 9
          },
          {
            "role": "cl",
            "text": "Not me!",
            "do": "Show your empty hands too.",
            "member": 10
          },
          {
            "role": "cl",
            "text": "Look! The bag! The bag!",
            "do": "Point at the bag on the Kid's back.",
            "all": true
          },
          {
            "role": "kid",
            "text": "My bag? What's this?",
            "do": "Turn around and around, trying to see your own back."
          },
          {
            "role": "cl",
            "text": "It's a RULER!",
            "do": "Measure the air and laugh.",
            "member": 5
          },
          {
            "role": "n",
            "text": "Is it a ruler?",
            "do": "Pull the ruler half out of the bag and show the audience."
          },
          {
            "everyone": "YES, IT IS!",
            "do": "Jump and point at the ruler."
          },
          {
            "role": "kid",
            "text": "My ruler! Sorry, ruler!",
            "do": "Pull out the ruler and hug it."
          }
        ]
      },
      {
        "title": "Scene 3: A surprise",
        "lines": [
          {
            "stage": "The Kid runs off and comes back with something behind their back. Now the Classmates cannot see."
          },
          {
            "role": "cl",
            "text": "Is it a crayon?",
            "do": "Try to peek. Color in the air.",
            "member": 6
          },
          {
            "role": "kid",
            "text": "No, it isn't.",
            "do": "Shake your head and smile."
          },
          {
            "role": "cl",
            "text": "Is it a book?",
            "do": "Open your hands like a book.",
            "member": 7
          },
          {
            "role": "kid",
            "text": "No, it isn't.",
            "do": "Shake your head, a bigger smile."
          },
          {
            "role": "cl",
            "text": "What's this?",
            "do": "Hands out: show us!",
            "member": 8
          },
          {
            "role": "kid",
            "text": "It's a pencil case!",
            "do": "Show it and pull the zip open."
          },
          {
            "role": "kid",
            "text": "Pen, pencil, eraser, ruler: in!",
            "do": "Put each thing in, one by one, gently."
          },
          {
            "role": "dog",
            "text": "Woof... no yum.",
            "do": "Sniff the shut pencil case and lie down, sad."
          },
          {
            "role": "n",
            "text": "Take care of your things!",
            "do": "Hold up the shut pencil case."
          },
          {
            "everyone": "It's a pencil case! Take care of it!",
            "do": "Pull a zip shut, then hug the pencil case."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly. The children only do the actions and join the together lines. Nobody speaks alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with its action. Practise the turn on the spot (the Kid looking for their own back). Then give the one-minute fix."
      },
      {
        "round": "Perform with the script",
        "minutes": 4,
        "how": "Perform with the script and real things. The Classmates really hide the things behind their backs, and the ruler really sticks out of the Kid's bag."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "No script. Each Classmate hides a new thing (a crayon, a pencil case, a book). The Kid asks \"What's this?\" or \"Is it a ...?\" until every thing is back."
      }
    ],
    "focusOnForm": [
      "\"Is it a pen?\", not \"It is pen?\": the question starts with \"Is\". Raise your voice at the end.",
      "\"a pencil\" / \"an eraser\": \"an\" before a vowel sound.",
      "\"Yes, it is\" / \"No, it isn't\", not \"Yes\" alone or \"No, it not\": say all three words.",
      "Final sounds: \"pen\", \"book\", \"bag\". Vietnamese learners drop them: say it again and hold the last sound."
    ],
    "props": [
      "a pen, a pencil, a book, an eraser, a ruler",
      "a school bag the ruler can stick out of",
      "a pencil case",
      "puppy ears (optional)"
    ],
    "teacherNote": "The hands behind the backs are the gap: the Kid never sees what a Classmate holds, and later the Classmates cannot see the pencil case. The child who catches a thing in Scene 1 keeps it and gives it back in Scene 2 (the cast list shows who). Make sure the ruler sticks out of the Kid's bag where the audience can see it; let the audience shout \"Look! The bag!\" with the Classmates. You read the Narrator. In a small class the Puppy is left out. End with a real tidy-up of the room.",
    "encore": "In a later lesson, play it again with new hidden things, and hide a different one in the Kid's own bag (a crayon in a pocket, a book under the arm)."
  }
];
