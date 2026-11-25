// National Geographic Look 1, Unit 0 (Look!): class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U0Plays: Play[] = [
  {
    "id": "look1-u0-p1",
    "course": "look",
    "level": 1,
    "unit": 0,
    "afterLesson": 1,
    "title": "Boom in the Big Box",
    "minutes": 16,
    "band": "6-8",
    "summary": "A big red box knocks, and a BIG voice says its name is Boom and it is ten. The Kids count to three, to five, then to ten to open it, and the box is empty: Boom is behind them, small, blue and six, just like them.",
    "targets": {
      "words": [
        "big",
        "small",
        "red",
        "blue",
        "one",
        "six",
        "ten"
      ],
      "grammar": [
        "Hello! What's your name? My name's ...",
        "How old are you? I'm six.",
        "How are you? I'm fine, thanks."
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
        "id": "boom",
        "name": "Boom",
        "who": "a child who likes funny voices: a BIG voice in the box, a tiny voice out of it"
      },
      {
        "id": "k",
        "name": "Kid",
        "who": "curious and kind; short lines, good for shy children",
        "group": {
          "max": 10
        }
      },
      {
        "id": "cat",
        "name": "Sleepy Cat",
        "who": "a small, funny part: sleeps on the box and hates noise",
        "optional": {
          "cut": true
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Knock, knock!",
        "lines": [
          {
            "stage": "A big red box with a lid stands in the middle (or a red sheet over two chairs). Boom hides inside it. Boom cannot see the Kids, and the Kids cannot see Boom."
          },
          {
            "stage": "The Sleepy Cat sleeps on the lid.",
            "if": "cat"
          },
          {
            "role": "n",
            "text": "Look! A big box.",
            "do": "Draw a big box in the air."
          },
          {
            "role": "k",
            "text": "A red box!",
            "do": "Point at the red.",
            "all": true
          },
          {
            "role": "n",
            "text": "Big or small?",
            "do": "Hands wide apart, then hands close together."
          },
          {
            "role": "k",
            "text": "BIG! It's BIG!",
            "do": "Throw your arms out wide.",
            "all": true
          },
          {
            "role": "cat",
            "text": "Meow... Zzz...",
            "do": "Curl up on the lid and snore."
          },
          {
            "stage": "Knock, knock! Boom knocks on the box from inside."
          },
          {
            "role": "k",
            "text": "Oh no! Hello?",
            "do": "Jump back, then wave at the box."
          },
          {
            "role": "boom",
            "text": "HELLO!",
            "do": "Use a big, deep voice. Bang the box: boom!"
          },
          {
            "role": "k",
            "text": "What's your name?",
            "do": "Cup a hand by your ear and lean to the box.",
            "all": true
          },
          {
            "role": "boom",
            "text": "My name's BOOM!",
            "do": "Bang the box with both fists: boom, boom!"
          },
          {
            "role": "k",
            "text": "Boom? Big or small?",
            "do": "Hands wide, then close, with a puzzled face. You cannot see in."
          },
          {
            "role": "boom",
            "text": "I'm BIG! Big, big, BIG!",
            "do": "Stomp inside the box like a giant."
          },
          {
            "role": "k",
            "text": "Oh no! Big!",
            "do": "Hug yourself and shake."
          },
          {
            "role": "cat",
            "text": "Shh! Zzz...",
            "do": "Finger on your lips, then snore again."
          },
          {
            "role": "k",
            "text": "How old are you?",
            "do": "Hold up your fingers and tilt your head.",
            "all": true
          },
          {
            "role": "boom",
            "text": "I'm TEN!",
            "do": "Wiggle ten fingers above the lid."
          },
          {
            "role": "n",
            "text": "Ten! Big or small?",
            "do": "Show ten fingers, then hands wide and hands close."
          },
          {
            "role": "k",
            "text": "BIG! It's BIG!",
            "do": "Stomp like a giant.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 2: Boom asks",
        "lines": [
          {
            "stage": "Boom cannot see out of the box, so Boom asks too."
          },
          {
            "role": "boom",
            "text": "Hello? What's your name?",
            "do": "Knock on the lid. Big voice."
          },
          {
            "role": "k",
            "text": "My name's (your name)!",
            "do": "Point to yourself and say your own name."
          },
          {
            "role": "boom",
            "text": "How old are you?",
            "do": "Wiggle your fingers above the lid."
          },
          {
            "role": "k",
            "text": "I'm six!",
            "do": "Hold up six fingers.",
            "all": true
          },
          {
            "role": "boom",
            "text": "Six! Ha, ha! Small!",
            "do": "A big laugh, hands on your tummy."
          },
          {
            "role": "boom",
            "text": "How are you?",
            "do": "Knock on the lid. Big, bossy voice."
          },
          {
            "role": "k",
            "text": "I'm fine, thanks!",
            "do": "Thumbs up at the box.",
            "all": true
          },
          {
            "role": "k",
            "text": "How are you?",
            "do": "Open your hands and smile at the box."
          },
          {
            "role": "boom",
            "text": "I'm fine... I'm FINE!",
            "do": "Say it in a tiny voice, then cough and say it BIG."
          }
        ]
      },
      {
        "title": "Scene 3: Open the box!",
        "lines": [
          {
            "role": "n",
            "text": "Let's open the box!",
            "do": "Lift a lid in the air."
          },
          {
            "role": "k",
            "text": "One, two, three... open!",
            "do": "Count on your fingers, then pull at the lid."
          },
          {
            "role": "boom",
            "text": "NO!",
            "do": "Pull the lid down hard. Big voice."
          },
          {
            "role": "k",
            "text": "Oh no! Boom says NO!",
            "do": "Jump back from the box."
          },
          {
            "role": "cat",
            "text": "Meow! Shh!",
            "do": "Jump up, cross, then lie down again."
          },
          {
            "role": "k",
            "text": "One, two, three, four, five... open!",
            "do": "Count on your fingers, then pull at the lid."
          },
          {
            "role": "boom",
            "text": "NO! NO! NO!",
            "do": "Hold the lid down with both hands."
          },
          {
            "role": "n",
            "text": "Eyes shut! Count to ten!",
            "do": "Cover your eyes with your hands."
          },
          {
            "stage": "The Kids shut their eyes. Boom creeps out of the back of the box, silently. The audience can see it; the Kids cannot."
          },
          {
            "role": "k",
            "text": "One, two, three, four, five, six, seven, eight, nine, TEN!",
            "do": "Eyes shut, count on your fingers.",
            "all": true
          },
          {
            "stage": "The Kids open the lid. The box is empty! Boom stands behind them."
          },
          {
            "role": "k",
            "text": "Oh no! No Boom!",
            "do": "Look into the box, hands on your cheeks."
          },
          {
            "role": "n",
            "text": "Behind you! Behind you!",
            "do": "Lead the audience: point behind the Kids."
          },
          {
            "role": "boom",
            "text": "Hello!",
            "do": "Tap a Kid on the shoulder. A tiny, squeaky voice."
          },
          {
            "role": "k",
            "text": "Wow! Hello!",
            "do": "Turn around, see Boom, and kneel down to look."
          },
          {
            "role": "k",
            "text": "Blue! A blue Boom!",
            "do": "Point at something blue on Boom."
          },
          {
            "role": "n",
            "text": "Big or small?",
            "do": "Hands wide, then hands close."
          },
          {
            "role": "k",
            "text": "SMALL! Small, small, small!",
            "do": "Crouch down low and make a tiny circle with your fingers.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 4: Hello, Boom",
        "lines": [
          {
            "role": "k",
            "text": "What's your name?",
            "do": "Tilt your head at the small Boom: is it really Boom?"
          },
          {
            "role": "boom",
            "text": "My name's Boom.",
            "do": "A tiny wave and a tiny voice."
          },
          {
            "role": "k",
            "text": "How old are you?",
            "do": "Hold up your fingers and tilt your head."
          },
          {
            "role": "boom",
            "text": "I'm six.",
            "do": "Show six fingers and look at the floor."
          },
          {
            "role": "k",
            "text": "How are you, Boom?",
            "do": "Open your hands and smile."
          },
          {
            "role": "boom",
            "text": "I'm small... and I'm fine, thanks!",
            "do": "Make yourself tiny, then give a big thumbs up."
          },
          {
            "role": "cat",
            "text": "Meow! Hello, Boom!",
            "do": "Wake up, stretch, and wave a paw."
          },
          {
            "role": "k",
            "text": "Hello, Boom! I'm six, too!",
            "do": "Show six fingers to Boom and wave.",
            "all": true
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly, with Boom's big and tiny voices. The children only do the actions and join the together lines. Nobody speaks alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with its action. Everyone tries the big Boom voice and the tiny Boom voice. Then give the one-minute fix."
      },
      {
        "round": "Perform with the script",
        "minutes": 4,
        "how": "Perform with the script, the box and the lid. In the count to ten the Kids really shut their eyes, so Boom can creep out."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "No script. A new child goes in the box and chooses a new name and age. The Kids say their real names and ages, and ask \"How are you?\"."
      }
    ],
    "focusOnForm": [
      "\"I'm six\", not \"I six\": Vietnamese has no \"am\". Clap once on \"I'm\".",
      "\"My name's ...\", not \"My name ...\": hiss the s on \"name's\".",
      "\"How old are you?\", not \"How old you?\": four words, tap four fingers.",
      "Final sounds: \"five\", \"nine\", \"ten\", \"fine\", \"big\". Vietnamese learners drop them: the child says the word again and holds the last sound (fi-v, te-n, bi-g)."
    ],
    "props": [
      "a big red box with a lid (or a red sheet over two chairs)",
      "something blue for Boom (a scarf, a hat or a mask)",
      "cat ears (optional)"
    ],
    "teacherNote": "The box is what makes every question real: Boom cannot see the Kids and the Kids cannot see Boom, so both sides ask. Seat the audience so they see Boom creep out at the back during the count to ten; you lead them in \"Behind you!\". Boom stays silent in every Kid chorus, even about itself. Give Boom to a child who enjoys voices. You read the Narrator. In a small class the Cat is left out.",
    "encore": "In a later lesson, turn it around: a tiny voice in the box says \"I'm small! I'm one!\", and a very BIG Boom comes out. Or hide a new animal with a new name, age and color."
  }
];
