// National Geographic Look 1, Unit 4: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U4Plays: Play[] = [
  {
    "id": "look1-u4-p1",
    "course": "look",
    "level": 1,
    "unit": 4,
    "afterLesson": 4,
    "title": "My Family Photo",
    "minutes": 16,
    "band": "6-8",
    "summary": "Me shows a family photo and says \"I have a mom. I have a dad.\" and \"I don't have a cousin.\" Then a baby cries: \"Oh! I have a baby!\"",
    "targets": {
      "words": [
        "grandpa",
        "grandma",
        "dad",
        "mom",
        "uncle",
        "aunt",
        "baby",
        "cousin"
      ],
      "grammar": [
        "I have a ... / I don't have a ...",
        "His name is ... / Her name is ..."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "me",
        "name": "Me",
        "who": "a confident child: the most lines"
      },
      {
        "id": "baby",
        "name": "Baby",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Family",
        "who": "children who like to act; short lines",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: My family",
        "lines": [
          {
            "stage": "Me stands in front of a photo frame. The Family stand behind it, still."
          },
          {
            "role": "n",
            "text": "This is my family photo. Say cheese!",
            "do": "Pretend to take a photo."
          },
          {
            "role": "me",
            "text": "I have a mom. I have a dad.",
            "do": "Point at a mom, then a dad."
          },
          {
            "role": "k",
            "text": "I'm the mom.",
            "do": "Wave to the class."
          },
          {
            "role": "k",
            "text": "I'm the dad.",
            "do": "Wave to the class."
          },
          {
            "role": "me",
            "text": "I have a grandpa. I have a grandma.",
            "do": "Point at each."
          },
          {
            "role": "k",
            "text": "I'm the grandpa.",
            "do": "Walk with a stick."
          },
          {
            "role": "k",
            "text": "I'm the grandma.",
            "do": "Wave a hand."
          },
          {
            "everyone": "My family! My family!",
            "do": "Hug yourself."
          }
        ]
      },
      {
        "title": "Scene 2: Aunt and uncle",
        "lines": [
          {
            "role": "me",
            "text": "I have an uncle. I have an aunt.",
            "do": "Point at each."
          },
          {
            "role": "k",
            "text": "I'm the uncle. His name is Bobo.",
            "do": "Wave and tip a hat."
          },
          {
            "role": "k",
            "text": "I'm the aunt. Her name is Kiki.",
            "do": "Wave and smile."
          },
          {
            "role": "me",
            "text": "I don't have a cousin.",
            "do": "Shake your head, look around."
          },
          {
            "role": "k",
            "text": "I'm your cousin!",
            "do": "Wave and jump in."
          },
          {
            "role": "me",
            "text": "Oh! I have a cousin!",
            "do": "Hug the cousin."
          },
          {
            "everyone": "My family! My family!",
            "do": "Hug yourself."
          }
        ]
      },
      {
        "title": "Scene 3: The baby",
        "lines": [
          {
            "role": "me",
            "text": "I don't have a baby.",
            "do": "Shake your head, smile."
          },
          {
            "role": "baby",
            "text": "Waaa! Waaa!",
            "do": "Rub your eyes and cry."
          },
          {
            "role": "me",
            "text": "Oh! I have a baby! Her name is Pip.",
            "do": "Pick up the baby and rock her."
          },
          {
            "role": "k",
            "text": "The baby is my cousin.",
            "do": "Point at the baby."
          },
          {
            "role": "k",
            "text": "The baby is my friend.",
            "do": "Wave to the baby."
          },
          {
            "role": "n",
            "text": "One big happy family.",
            "do": "Open your arms."
          },
          {
            "everyone": "My family! My family!",
            "do": "Hug yourself."
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
        "how": "Perform with scripts. The Family can hold a family picture card with their part (mom, dad, grandma...)."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Each child says \"I have a ...\" and \"I don't have a ...\" about their own real family, with picture cards."
      }
    ],
    "focusOnForm": [
      "\"I have a mom\": not \"I has a mom\" or \"I have mom\": say the little word \"a\".",
      "\"I don't have\": not \"I no have\": push out the n't.",
      "\"His name\" / \"Her name\": his for a boy, her for a girl."
    ],
    "props": [
      "a photo frame (cardboard)",
      "family picture cards",
      "a doll for the baby"
    ],
    "teacherNote": "Say that families are all different: some children do not have a dad or a grandma. Let them choose any picture card. Use \"mom\" as in the book.",
    "encore": "Later, perform with each child saying their own \"I have a ...\" line from real life."
  },
  {
    "id": "look1-u4-p2",
    "course": "look",
    "level": 1,
    "unit": 4,
    "afterLesson": 7,
    "title": "The Birthday Cake",
    "minutes": 16,
    "band": "6-8",
    "summary": "It is the baby's birthday party. Mom has a cake but no candles. Each person gives something: \"I have a candle. Here you are!\" Everyone sings and shares.",
    "targets": {
      "words": [
        "grandpa",
        "grandma",
        "dad",
        "mom",
        "uncle",
        "aunt",
        "baby",
        "cousin"
      ],
      "grammar": [
        "I have a ... / I don't have a ...",
        "His name is ... / Her name is ..."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "mom",
        "name": "Mom",
        "who": "a confident child: the most lines"
      },
      {
        "id": "dad",
        "name": "Dad",
        "who": "a funny part"
      },
      {
        "id": "baby",
        "name": "Baby",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Family",
        "who": "children who like to act; short lines",
        "group": {
          "max": 8
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: No candles!",
        "lines": [
          {
            "stage": "Mom and Dad stand by a table with a cake. The Family wait."
          },
          {
            "role": "n",
            "text": "It's the baby's birthday party!",
            "do": "Throw your arms up."
          },
          {
            "role": "mom",
            "text": "I have a cake.",
            "do": "Hold the cake high."
          },
          {
            "role": "dad",
            "text": "I don't have a candle.",
            "do": "Pat your pockets, shrug."
          },
          {
            "role": "mom",
            "text": "Oh no! I don't have a candle!",
            "do": "Put hands on your head."
          },
          {
            "role": "baby",
            "text": "Waaa!",
            "do": "Rub your eyes."
          },
          {
            "everyone": "Give, give, give! Here you are!",
            "do": "Hand something to a friend."
          }
        ]
      },
      {
        "title": "Scene 2: Giving",
        "lines": [
          {
            "role": "k",
            "text": "I have a candle! I'm the aunt.",
            "do": "Hold up a candle."
          },
          {
            "role": "k",
            "text": "I have a candle! I'm the uncle.",
            "do": "Hold up a candle."
          },
          {
            "role": "k",
            "text": "I have a present. I'm the cousin.",
            "do": "Hand over a box."
          },
          {
            "role": "k",
            "text": "I have a present. I'm the grandpa.",
            "do": "Hand over a box."
          },
          {
            "role": "k",
            "text": "I have a song. I'm the grandma.",
            "do": "Clap your hands and sing."
          },
          {
            "role": "mom",
            "text": "Thank you, friends!",
            "do": "Bow."
          },
          {
            "role": "dad",
            "text": "His name is Pip. He has a cake!",
            "do": "Point at the baby, laugh."
          },
          {
            "everyone": "Give, give, give! Here you are!",
            "do": "Hand something to a friend."
          }
        ]
      },
      {
        "title": "Scene 3: Happy birthday",
        "lines": [
          {
            "role": "n",
            "text": "Three, two, one!",
            "do": "Count down on your fingers."
          },
          {
            "role": "baby",
            "text": "Mmm!",
            "do": "Eat a bite and smile."
          },
          {
            "role": "k",
            "text": "The baby has a cake.",
            "do": "Point at the baby."
          },
          {
            "role": "mom",
            "text": "Her name is Kiki. She's my baby.",
            "do": "Pick up the baby."
          },
          {
            "role": "k",
            "text": "I have a friend.",
            "do": "Take a friend's hand."
          },
          {
            "role": "k",
            "text": "I have a mom.",
            "do": "Hug the mom."
          },
          {
            "everyone": "Happy birthday! Give, give, give!",
            "do": "Clap and sing."
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
        "how": "Perform with scripts and a paper cake. People hand each other real things (a candle, a paper present)."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children say \"I have a ...\" and give something real to a friend. Add one family person and one thing you can give."
      }
    ],
    "focusOnForm": [
      "\"I have a candle\": not \"I has\" or \"I have candle\": say \"a\".",
      "\"I don't have\": not \"I no have\": say the n't.",
      "\"His\" and \"her\": point at the boy or the girl."
    ],
    "props": [
      "a paper cake and candles",
      "wrapped boxes",
      "a doll for the baby"
    ],
    "teacherNote": "Value: give things to your friends. Finish with the children really giving something small to a friend.",
    "encore": "Later, play it with a new party (a grandma's birthday) and different gifts."
  }
];
