// National Geographic Look 1, Unit 0 (Look!): class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U0Plays: Play[] = [
  {
    "id": "look1-u0-p1",
    "course": "look",
    "level": 1,
    "unit": 0,
    "afterLesson": 1,
    "title": "Hello, Big and Small",
    "minutes": 16,
    "band": "6-8",
    "summary": "Color Kids say hello, their age and how they are, count to ten, then a big bear tries to hide behind a small box.",
    "targets": {
      "words": [
        "big",
        "small",
        "red",
        "blue",
        "one",
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
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "host",
        "name": "Host",
        "who": "a confident child: asks the questions"
      },
      {
        "id": "mouse",
        "name": "Small Mouse",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "bear",
        "name": "Big Bear",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Color Kids",
        "who": "children who like to act; short lines",
        "group": {
          "max": 8
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Hello!",
        "lines": [
          {
            "stage": "The Host stands by a big box. Each Color Kid holds a color card."
          },
          {
            "role": "n",
            "text": "Hello, everyone! Let's say hello.",
            "do": "Wave to the class."
          },
          {
            "everyone": "Hello! Hello! Hello!",
            "do": "Wave with both hands."
          },
          {
            "role": "host",
            "text": "Hello! What's your name?",
            "do": "Wave, then point at a Color Kid."
          },
          {
            "role": "k",
            "text": "My name's Red.",
            "do": "Hold up a red card."
          },
          {
            "role": "k",
            "text": "My name's Blue.",
            "do": "Hold up a blue card."
          },
          {
            "role": "k",
            "text": "My name's Green.",
            "do": "Hold up a green card."
          },
          {
            "role": "k",
            "text": "My name's Yellow.",
            "do": "Hold up a yellow card."
          },
          {
            "role": "host",
            "text": "How old are you?",
            "do": "Hold up fingers and tilt your head."
          },
          {
            "role": "k",
            "text": "I'm six.",
            "do": "Show six fingers."
          },
          {
            "role": "k",
            "text": "I'm seven.",
            "do": "Show seven fingers."
          },
          {
            "role": "k",
            "text": "I'm eight.",
            "do": "Show eight fingers."
          },
          {
            "role": "k",
            "text": "I'm nine.",
            "do": "Show nine fingers."
          },
          {
            "role": "host",
            "text": "How are you?",
            "do": "Smile and open your hands."
          },
          {
            "role": "k",
            "text": "I'm fine, thanks!",
            "do": "Give a thumbs up."
          },
          {
            "role": "k",
            "text": "I'm fine, thanks!",
            "do": "Give a thumbs up."
          }
        ]
      },
      {
        "title": "Scene 2: Count!",
        "lines": [
          {
            "role": "n",
            "text": "Let's count the colors!",
            "do": "Point at each card."
          },
          {
            "role": "k",
            "text": "One!",
            "do": "Hold up one finger."
          },
          {
            "role": "k",
            "text": "Two!",
            "do": "Hold up two fingers."
          },
          {
            "role": "k",
            "text": "Three!",
            "do": "Hold up three fingers."
          },
          {
            "role": "k",
            "text": "Four!",
            "do": "Hold up four fingers."
          },
          {
            "everyone": "One, two, three, four, five, six, seven, eight, nine, ten!",
            "do": "Count on your fingers."
          }
        ]
      },
      {
        "title": "Scene 3: Big or small?",
        "lines": [
          {
            "role": "n",
            "text": "Look! A big bear and a small mouse.",
            "do": "Point to each."
          },
          {
            "role": "bear",
            "text": "I'm big!",
            "do": "Stand tall, arms up."
          },
          {
            "role": "mouse",
            "text": "I'm small!",
            "do": "Crouch down low."
          },
          {
            "role": "host",
            "text": "Big or small?",
            "do": "Hands wide, then hands close."
          },
          {
            "role": "k",
            "text": "Big!",
            "do": "Open your arms wide."
          },
          {
            "role": "k",
            "text": "Small!",
            "do": "Make a tiny circle with your fingers."
          },
          {
            "role": "n",
            "text": "The bear sees a small blue box.",
            "do": "Point at the box."
          },
          {
            "role": "bear",
            "text": "I'm small! I'm small!",
            "do": "Squeeze behind the box, tummy out."
          },
          {
            "role": "host",
            "text": "No! You're big!",
            "do": "Shake your finger and laugh."
          },
          {
            "everyone": "Big, big, big! Small, small, small!",
            "do": "Hands wide, then hands close."
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
        "how": "Perform once with scripts, then once with only the color cards and number cards."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children say their own color name and their real age, and ask a partner \"How are you?\". Swap big and small things around the room."
      }
    ],
    "focusOnForm": [
      "\"My name's ...\", not \"I name ...\": say it with the card held up.",
      "\"I'm six\", not \"I six\": clap on I'm.",
      "Final sounds: \"fine\", \"thanks\", \"ten\", \"nine\": ask the child to say the last sound loudly."
    ],
    "props": [
      "color cards (red, blue, green, yellow)",
      "a big box and a small box",
      "a bear mask and a mouse mask (optional)"
    ],
    "teacherNote": "The Color Kids can wear a color card on a string. Shy children can play Small Mouse: one short line. Teach the actions in the Listen-and-do round.",
    "encore": "Perform it once with no scripts as a warm-up in a later lesson, and add a new color card or a bigger number."
  }
];
