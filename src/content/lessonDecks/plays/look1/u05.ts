// National Geographic Look 1, Unit 5: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U5Plays: Play[] = [
  {
    "id": "look1-u5-p1",
    "course": "look",
    "level": 1,
    "unit": 5,
    "afterLesson": 4,
    "title": "The Robot Builder",
    "minutes": 16,
    "band": "6-8",
    "summary": "The children build a funny robot out of body words. \"This is my head. These are my hands.\" But the robot's hands are on its feet! \"No! These are your hands!\"",
    "targets": {
      "words": [
        "leg",
        "foot",
        "mouth",
        "eye",
        "head",
        "ear",
        "arm",
        "hand"
      ],
      "grammar": [
        "This is my ... / These are my ...s",
        "He has ... hair. / She doesn't have ... eyes."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "builder",
        "name": "Builder",
        "who": "a confident child: calls out the parts"
      },
      {
        "id": "robot",
        "name": "Robot",
        "who": "a funny part: moves like a robot"
      },
      {
        "id": "k",
        "name": "Helpers",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Build a robot",
        "lines": [
          {
            "stage": "The Robot stands stiff. The Builder and the Helpers stand around it with body-part cards."
          },
          {
            "role": "n",
            "text": "Let's build a robot!",
            "do": "Clap and rub your hands."
          },
          {
            "role": "builder",
            "text": "This is my head.",
            "do": "Touch the robot's head, then your own."
          },
          {
            "role": "k",
            "text": "This is my eye.",
            "do": "Point at your eye."
          },
          {
            "role": "k",
            "text": "These are my eyes.",
            "do": "Point at both eyes."
          },
          {
            "role": "k",
            "text": "This is my mouth.",
            "do": "Open your mouth wide."
          },
          {
            "role": "k",
            "text": "These are my ears.",
            "do": "Wiggle both ears."
          },
          {
            "role": "robot",
            "text": "Beep! This is my head.",
            "do": "Touch your head like a robot."
          },
          {
            "everyone": "Head, arms, hands, feet!",
            "do": "Touch each body part."
          }
        ]
      },
      {
        "title": "Scene 2: Oh no!",
        "lines": [
          {
            "role": "builder",
            "text": "This is my arm. These are my legs.",
            "do": "Point at each."
          },
          {
            "role": "robot",
            "text": "These are my hands.",
            "do": "Point at your feet, wrongly."
          },
          {
            "role": "k",
            "text": "No! These are your feet!",
            "do": "Point at the robot's feet and laugh."
          },
          {
            "role": "robot",
            "text": "Beep! This is my foot.",
            "do": "Point at your head, wrongly."
          },
          {
            "role": "k",
            "text": "No! This is your head!",
            "do": "Touch the robot's head."
          },
          {
            "role": "k",
            "text": "This is my arm. These are my arms.",
            "do": "Hold up one arm, then both."
          },
          {
            "role": "k",
            "text": "These are my legs. This is my leg.",
            "do": "Stomp one leg, then both."
          },
          {
            "everyone": "Head, arms, hands, feet!",
            "do": "Touch each body part."
          }
        ]
      },
      {
        "title": "Scene 3: A perfect robot",
        "lines": [
          {
            "role": "robot",
            "text": "This is my head. These are my hands.",
            "do": "Point correctly."
          },
          {
            "role": "k",
            "text": "He has blue eyes!",
            "do": "Point at the robot's eyes."
          },
          {
            "role": "k",
            "text": "He has black hair!",
            "do": "Touch your hair, then the robot's."
          },
          {
            "role": "k",
            "text": "He doesn't have green hair.",
            "do": "Shake your head."
          },
          {
            "role": "builder",
            "text": "Beep! Good robot!",
            "do": "Pat the robot's head."
          },
          {
            "role": "n",
            "text": "The robot dances.",
            "do": "Dance like a robot."
          },
          {
            "everyone": "Head, arms, hands, feet!",
            "do": "Touch each body part."
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
        "how": "Perform with scripts and body-part picture cards. The Robot moves only when it hears the right word."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children swap in other parts and make their own mistakes on purpose: \"These are my hands\" (pointing at their feet). The class says \"No! These are your feet!\""
      }
    ],
    "focusOnForm": [
      "\"This is my head\" (one) / \"These are my hands\" (two): say the -s on two things.",
      "\"He has\" / \"She has\": not \"He have\": say \"has\" for one boy or girl.",
      "Final sounds: \"head\", \"hand\", \"foot\": say the last sound loudly."
    ],
    "props": [
      "body-part picture cards",
      "a robot costume (box or paper)"
    ],
    "teacherNote": "Teach \"This is my...\" for one and \"These are my...\" for two with real body parts. The mistake is the fun: let the Robot point at the wrong part.",
    "encore": "Later, build a new monster (three eyes, two heads) and use \"He has ...\""
  },
  {
    "id": "look1-u5-p2",
    "course": "look",
    "level": 1,
    "unit": 5,
    "afterLesson": 7,
    "title": "Move Your Body",
    "minutes": 16,
    "band": "6-8",
    "summary": "The Coach wakes up a sleepy monster with a body game. \"This is my head. These are my arms.\" The children describe him: \"He has green hair. He doesn't have a mouth.\"",
    "targets": {
      "words": [
        "leg",
        "foot",
        "mouth",
        "eye",
        "head",
        "ear",
        "arm",
        "hand"
      ],
      "grammar": [
        "This is my ... / These are my ...s",
        "He has ... hair. / She doesn't have ... eyes."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "coach",
        "name": "Coach",
        "who": "a confident child: calls the moves"
      },
      {
        "id": "monster",
        "name": "Sleepy Monster",
        "who": "a funny part: yawns and stretches"
      },
      {
        "id": "k",
        "name": "Movers",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Wake up!",
        "lines": [
          {
            "stage": "The Sleepy Monster is asleep on the floor. The Coach and the Movers stand around."
          },
          {
            "role": "n",
            "text": "The monster is sleepy. Wake up!",
            "do": "Snore, then clap."
          },
          {
            "role": "coach",
            "text": "Wake up, head!",
            "do": "Wiggle your head."
          },
          {
            "role": "monster",
            "text": "This is my head.",
            "do": "Touch your head, yawn."
          },
          {
            "role": "coach",
            "text": "Wake up, arms!",
            "do": "Swing your arms."
          },
          {
            "role": "monster",
            "text": "These are my arms.",
            "do": "Stretch both arms."
          },
          {
            "role": "coach",
            "text": "Wake up, legs!",
            "do": "Stomp your legs."
          },
          {
            "role": "monster",
            "text": "These are my legs.",
            "do": "Stand up and wobble."
          },
          {
            "everyone": "Move, move, move your body!",
            "do": "Dance on the spot."
          }
        ]
      },
      {
        "title": "Scene 2: Move your body",
        "lines": [
          {
            "role": "k",
            "text": "This is my hand.",
            "do": "Wave a hand."
          },
          {
            "role": "k",
            "text": "These are my hands.",
            "do": "Clap both hands."
          },
          {
            "role": "k",
            "text": "This is my foot.",
            "do": "Tap one foot."
          },
          {
            "role": "k",
            "text": "These are my feet.",
            "do": "Stomp both feet."
          },
          {
            "role": "k",
            "text": "This is my mouth.",
            "do": "Open and close your mouth."
          },
          {
            "role": "k",
            "text": "These are my eyes.",
            "do": "Blink both eyes."
          },
          {
            "role": "k",
            "text": "This is my ear.",
            "do": "Pull your ear."
          },
          {
            "role": "k",
            "text": "These are my ears.",
            "do": "Wiggle both ears."
          },
          {
            "everyone": "Move, move, move your body!",
            "do": "Dance on the spot."
          }
        ]
      },
      {
        "title": "Scene 3: Who has what?",
        "lines": [
          {
            "role": "n",
            "text": "Look at the monster. Look at his face.",
            "do": "Point at the monster."
          },
          {
            "role": "k",
            "text": "He has green hair.",
            "do": "Touch your hair, point at the monster."
          },
          {
            "role": "k",
            "text": "He has three eyes!",
            "do": "Hold up three fingers at your eyes."
          },
          {
            "role": "k",
            "text": "He doesn't have a mouth.",
            "do": "Cover your mouth and shake your head."
          },
          {
            "role": "monster",
            "text": "I have a big mouth! Aaah!",
            "do": "Open your mouth wide."
          },
          {
            "role": "coach",
            "text": "She doesn't have blue eyes. She has red eyes.",
            "do": "Point at a mask, laugh."
          },
          {
            "everyone": "Move, move, move your body!",
            "do": "Dance on the spot."
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
        "how": "Perform with scripts. The Coach leads real moves; the Movers copy while they say each line."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children make a new monster with their own parts: \"It has red hair. It doesn't have ears.\" The class touches each part."
      }
    ],
    "focusOnForm": [
      "\"These are my arms\": the -s on two arms, two hands, two legs.",
      "\"doesn't have\": not \"doesn't has\": say \"have\" after doesn't.",
      "\"This\" and \"These\": the final sound, /s/ for one and /z/ for two."
    ],
    "props": [
      "a monster mask",
      "picture cards of body parts",
      "music for the dance (optional)"
    ],
    "teacherNote": "Value: be active. Dance on the spot at the end, with real movement.",
    "encore": "Later, use a new monster and have a child be the Coach with their own moves."
  }
];
