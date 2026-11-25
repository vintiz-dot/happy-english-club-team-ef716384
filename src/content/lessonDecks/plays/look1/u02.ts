// National Geographic Look 1, Unit 2: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U2Plays: Play[] = [
  {
    "id": "look1-u2-p1",
    "course": "look",
    "level": 1,
    "unit": 2,
    "afterLesson": 4,
    "title": "Over the Wall",
    "minutes": 16,
    "band": "6-8",
    "summary": "The Wind blows the Kids' toys over a high wall to the Giant next door, and blows the Giant's teddy bear to the Kids. Nobody can see over the wall, so the Giant asks \"Is this your ball?\" and the Kids ask \"Is it a doll?\". The big scary voice has lost a teddy bear, and a big Giant is just right for the kite in the tree.",
    "targets": {
      "words": [
        "ball",
        "doll",
        "kite",
        "plane",
        "train",
        "teddy bear"
      ],
      "grammar": [
        "This is my ...",
        "Is this your ...? Yes, it is. / No, it isn't.",
        "Is it a ...? (Unit 1)"
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
        "id": "giant",
        "name": "Giant",
        "who": "a child who likes a BIG voice: scary at first, then soft"
      },
      {
        "id": "k",
        "name": "Kid",
        "who": "each Kid holds the toy their own lines name; short lines",
        "group": {
          "max": 8
        }
      },
      {
        "id": "wind",
        "name": "Wind",
        "who": "children who like to run and swirl; one short line each",
        "optional": {
          "cut": true
        },
        "group": {
          "max": 3
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Whoosh!",
        "lines": [
          {
            "stage": "A sheet over two chairs is a high wall between two yards. A tree stands above the wall, so everyone can see its top. The Giant next door sleeps on one side, hugging a teddy bear. The Kids play on the other side with a kite, a ball, a plane and a doll. Nobody can see over the wall."
          },
          {
            "role": "n",
            "text": "Look! The Kids and the toys.",
            "do": "Point at each toy."
          },
          {
            "role": "k",
            "text": "Toys! This is my toy!",
            "do": "Each Kid holds up their own toy.",
            "all": true
          },
          {
            "role": "k",
            "text": "This is my kite!",
            "do": "Hold the kite string up high and run.",
            "member": 1
          },
          {
            "role": "k",
            "text": "This is my ball!",
            "do": "Bounce the ball.",
            "member": 2
          },
          {
            "role": "k",
            "text": "This is my plane!",
            "do": "Arms out wide. Fly like a plane.",
            "member": 3
          },
          {
            "role": "k",
            "text": "This is my doll!",
            "do": "Rock the doll in your arms.",
            "member": 4
          },
          {
            "role": "giant",
            "text": "Zzz... my teddy bear... zzz.",
            "do": "Snore, and squeeze the teddy bear."
          },
          {
            "role": "n",
            "text": "Oh no! Wind!",
            "do": "Blow hard and wave your arms."
          },
          {
            "role": "wind",
            "text": "Whoosh! Bye, ball!",
            "do": "Swirl around the Kids and blow the ball over the wall."
          },
          {
            "role": "wind",
            "text": "Whoosh! Bye, doll!",
            "do": "Swirl and blow the doll over the wall."
          },
          {
            "stage": "The ball, the plane and the doll fly over the wall to the Giant's side. The teddy bear flies the other way and lands behind the Kids. The audience can see it; the Kids cannot."
          },
          {
            "role": "wind",
            "text": "Whoosh! Up, up, kite!",
            "do": "Lift the kite high into the tree and spin away."
          },
          {
            "role": "k",
            "text": "Oh no! The toys!",
            "do": "Reach up to the top of the wall."
          },
          {
            "role": "giant",
            "text": "Ow! Toys!",
            "do": "Wake up as toys fall on you. Rub your head."
          },
          {
            "role": "giant",
            "text": "Oh no! My teddy bear!",
            "do": "Look everywhere for the teddy bear, but not over the wall."
          }
        ]
      },
      {
        "title": "Scene 2: Is this your ball?",
        "lines": [
          {
            "stage": "On the Giant's side are the Kids' toys and the Giant's own train. Nobody can see over the wall."
          },
          {
            "role": "k",
            "text": "Hello? Hello?",
            "do": "Knock on the wall."
          },
          {
            "role": "giant",
            "text": "HELLO!",
            "do": "A big, deep voice. Knock back: boom, boom!"
          },
          {
            "role": "k",
            "text": "Oh no! A giant!",
            "do": "Jump back and hug each other.",
            "all": true
          },
          {
            "role": "giant",
            "text": "Is this your ball?",
            "do": "Hold the ball up behind the wall. The Kids cannot see it."
          },
          {
            "role": "k",
            "text": "Yes, it is!",
            "do": "Hands up high.",
            "all": true
          },
          {
            "stage": "The Giant throws the ball over the wall. The Kid whose ball it is catches it."
          },
          {
            "role": "k",
            "text": "Is it a doll?",
            "do": "Rock your arms, and look hard at the wall.",
            "member": 4
          },
          {
            "role": "giant",
            "text": "No, it isn't. It's a plane.",
            "do": "Fly the plane over your head."
          },
          {
            "role": "giant",
            "text": "Is this your plane?",
            "do": "Hold the plane up behind the wall."
          },
          {
            "role": "k",
            "text": "Yes, it is! Thank you!",
            "do": "Catch the plane. Arms out, fly.",
            "member": 3
          },
          {
            "role": "k",
            "text": "Is it a doll?",
            "do": "Rock your arms again. Cross your fingers.",
            "member": 4
          },
          {
            "role": "giant",
            "text": "Yes, it is!",
            "do": "Throw the doll over the wall."
          },
          {
            "role": "k",
            "text": "Thank you, Giant!",
            "do": "Catch the doll and rock it.",
            "member": 4
          },
          {
            "role": "giant",
            "text": "Is this your train?",
            "do": "Push the train along behind the wall, out of sight."
          },
          {
            "role": "k",
            "text": "No, it isn't!",
            "do": "Shake your heads.",
            "all": true
          },
          {
            "role": "giant",
            "text": "Oh! My train. Boo hoo! My teddy bear...",
            "do": "Hug the train. Big, sad giant tears."
          },
          {
            "role": "n",
            "text": "Look! Behind you!",
            "do": "Lead the audience: point behind the Kids."
          },
          {
            "role": "k",
            "text": "Look! A teddy bear!",
            "do": "Turn around, pick up the teddy bear and show the others.",
            "member": 5
          },
          {
            "role": "k",
            "text": "Is this your teddy bear?",
            "do": "Hold the teddy up to the wall, and giggle: a giant?",
            "member": 6
          },
          {
            "role": "giant",
            "text": "YES, IT IS!",
            "do": "Jump for joy. The floor shakes!"
          },
          {
            "role": "n",
            "text": "A big Giant... and a small teddy bear!",
            "do": "Arms wide, then hands close together."
          },
          {
            "stage": "The Kids throw the teddy bear over the wall. The Giant hugs it and comes around the wall, smiling."
          },
          {
            "role": "giant",
            "text": "This is my teddy bear! Thank you!",
            "do": "Hug the teddy bear and smile at the Kids."
          }
        ]
      },
      {
        "title": "Scene 3: The kite",
        "lines": [
          {
            "role": "k",
            "text": "Oh no! The kite!",
            "do": "Point up at the tree.",
            "member": 1
          },
          {
            "role": "n",
            "text": "The kite is in the tree.",
            "do": "Reach up high."
          },
          {
            "role": "k",
            "text": "One, two, three... jump!",
            "do": "Jump for the kite.",
            "member": 7
          },
          {
            "role": "k",
            "text": "One, two, three... JUMP!",
            "do": "Jump higher! Still no kite.",
            "member": 8
          },
          {
            "role": "giant",
            "text": "Look! I'm big!",
            "do": "Stand on tiptoe and reach up, up, up into the tree."
          },
          {
            "role": "giant",
            "text": "Is this your kite?",
            "do": "Hold the kite out to the Kids."
          },
          {
            "role": "k",
            "text": "Yes, it is! Thank you!",
            "do": "Take the kite and hug it.",
            "member": 1
          },
          {
            "everyone": "This is my toy!",
            "do": "Hold up your own toy and hug it. The Wind spins."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly, with the Giant's big voice. The children only do the actions and join the together lines. Nobody speaks alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with its action. Then give the one-minute fix."
      },
      {
        "round": "Perform with the script",
        "minutes": 4,
        "how": "Perform with the script and the wall. The Giant really keeps each toy out of sight until it goes over the wall."
      },
      {
        "round": "Key words",
        "minutes": 4,
        "how": "Perform again with only the key-word cards (ball, plane, doll, train, teddy bear, kite). The Giant may hold up a new toy from the classroom."
      }
    ],
    "focusOnForm": [
      "\"This is my kite\", not \"This my kite\": Vietnamese has no \"is\" here. Clap on \"is\".",
      "\"Is this your ball?\": the question starts with \"Is\", not \"This is your ball?\".",
      "\"Yes, it is\" / \"No, it isn't\", not \"Yes\" alone or \"No, it not\".",
      "Final sounds: \"kite\", \"doll\", \"plane\", \"train\". Say the word again and hold the last sound (ki-t, do-ll)."
    ],
    "props": [
      "a sheet over two chairs (the wall)",
      "a ball, a toy plane, a doll, a toy train, a kite, a teddy bear",
      "a tall chair or stand behind the wall for the tree"
    ],
    "teacherNote": "The wall is the gap, and it works both ways: the Giant can see the toys but not their owners, and the Kids know what they lost but cannot see what the Giant holds. Hand out the toys after casting: each Kid holds the toy their own line names in Scene 1 and gets that toy back. With one Kid, that Kid shows all four toys; you may hold two of them. The Giant should sound scary at first; the laugh comes when this big voice has a teddy bear. You read the Narrator. In a small class the Wind is left out and your \"Oh no! Wind!\" carries the storm.",
    "encore": "In a later lesson, swap the toys: a game, a bat, a train go over the wall, and the Giant's lost toy is something new (a small doll?)."
  },
  {
    "id": "look1-u2-p2",
    "course": "look",
    "level": 1,
    "unit": 2,
    "afterLesson": 7,
    "title": "The Dragon Says Mine",
    "minutes": 16,
    "band": "6-8",
    "summary": "A Little Dragon grabs the Kids' toys: \"This is my ball!\" \"No, it isn't!\" The third grab is the kite, and the kite flies off with the Dragon. The Kids pull it down and the Dragon gives the toys back, but its own shut box holds a game: no fun alone. So everyone shares.",
    "targets": {
      "words": [
        "ball",
        "train",
        "kite",
        "doll",
        "plane",
        "bat",
        "game"
      ],
      "grammar": [
        "This is my ...",
        "Is this your ...? Yes, it is. / No, it isn't.",
        "Is it a ...? What's this? It's a ... (Unit 1)"
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
        "id": "dragon",
        "name": "Little Dragon",
        "who": "a child who likes to be loud and greedy (then kind)"
      },
      {
        "id": "k",
        "name": "Kid",
        "who": "the panto chorus: firm, then kind; each Kid holds the toy their own lines name",
        "group": {
          "max": 9
        }
      },
      {
        "id": "train",
        "name": "Toy Train",
        "who": "a small, noisy part: this child IS the train",
        "optional": {
          "cut": true
        }
      },
      {
        "id": "bird",
        "name": "Bird",
        "who": "a small, cheeky part",
        "optional": {
          "give": "n"
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: This is my ball!",
        "lines": [
          {
            "stage": "The park. The Kids play with their own toys: a ball, a train, a kite. Under a tree (a chair) is a big box with a shut lid. The Little Dragon hides behind the tree."
          },
          {
            "stage": "The Toy Train is a child, not a toy: the Kid with the train holds the Train's shoulders and they chug along together. Every grab is gentle.",
            "if": "train"
          },
          {
            "role": "n",
            "text": "Look! The Kids play in the park.",
            "do": "Point at the Kids."
          },
          {
            "role": "k",
            "text": "Look! A toy box!",
            "do": "Point at the shut box under the tree.",
            "all": true
          },
          {
            "role": "k",
            "text": "This is my ball!",
            "do": "Bounce the ball.",
            "member": 1
          },
          {
            "role": "k",
            "text": "Look! My train!",
            "do": "Chug along with your train.",
            "member": 2
          },
          {
            "role": "train",
            "text": "Choo, choo!",
            "do": "Arms go around like wheels."
          },
          {
            "role": "k",
            "text": "Look! My kite!",
            "do": "Hold the kite string up high.",
            "member": 3
          },
          {
            "role": "dragon",
            "text": "Grr! Toys! Toys!",
            "do": "Peek out from the tree and lick your lips."
          },
          {
            "role": "dragon",
            "text": "This is my ball!",
            "do": "Grab the ball and hug it."
          },
          {
            "role": "k",
            "text": "No, it isn't!",
            "do": "Hands on hips. Shake your heads.",
            "all": true
          },
          {
            "role": "dragon",
            "text": "Yes, it is!",
            "do": "Stamp your foot."
          },
          {
            "role": "k",
            "text": "NO, IT ISN'T!",
            "do": "Stamp your feet back.",
            "all": true
          },
          {
            "role": "dragon",
            "text": "This is my train!",
            "do": "Take the train."
          },
          {
            "role": "train",
            "text": "Help! Choo, choo!",
            "do": "Wave your arms."
          },
          {
            "role": "k",
            "text": "No, it isn't!",
            "do": "Hands on hips. Shake your heads.",
            "all": true
          },
          {
            "role": "dragon",
            "text": "Yes, it is!",
            "do": "Stamp both feet."
          },
          {
            "role": "k",
            "text": "NO, IT ISN'T!",
            "do": "Stamp your feet back.",
            "all": true
          },
          {
            "role": "dragon",
            "text": "This is my KITE!",
            "do": "Grab the kite string."
          },
          {
            "stage": "The wind pulls the kite up, up, up, and the Little Dragon goes up too! (The Dragon stands on tiptoe and flaps, holding the string.)"
          },
          {
            "role": "dragon",
            "text": "Whoa! Help! Help!",
            "do": "Wobble on tiptoe, arms up high."
          },
          {
            "role": "bird",
            "text": "Tweet! Hello, Dragon!",
            "do": "Fly past and wave a wing."
          },
          {
            "role": "k",
            "text": "Look! A dragon kite!",
            "do": "Point up and laugh.",
            "member": 4
          },
          {
            "role": "k",
            "text": "One, two, three, pull!",
            "do": "Pull the string together.",
            "member": 5
          },
          {
            "role": "dragon",
            "text": "Help! Help!",
            "do": "Flap hard."
          },
          {
            "role": "k",
            "text": "One, two, three, PULL!",
            "do": "Pull with your whole body.",
            "member": 6
          },
          {
            "stage": "Bump! The Little Dragon lands on the grass."
          },
          {
            "role": "dragon",
            "text": "Ow! Thank you!",
            "do": "Sit up and rub your bottom."
          }
        ]
      },
      {
        "title": "Scene 2: Is this your ball?",
        "lines": [
          {
            "stage": "The Little Dragon holds the Kids' toys in a pile, with a doll. It grabbed so fast that it does not know whose toy is whose."
          },
          {
            "role": "dragon",
            "text": "Sorry! Is this your ball?",
            "do": "Hold the ball out to a Kid."
          },
          {
            "role": "k",
            "text": "No, it isn't!",
            "do": "Shake your head and pat your empty hands.",
            "member": 2
          },
          {
            "role": "dragon",
            "text": "Is this your ball?",
            "do": "Hold the ball out to the next Kid."
          },
          {
            "role": "k",
            "text": "Yes, it is! Thank you!",
            "do": "Take the ball and bounce it.",
            "member": 1
          },
          {
            "role": "dragon",
            "text": "Is this your train?",
            "do": "Let go of the train."
          },
          {
            "role": "k",
            "text": "Yes, it is! Choo, choo!",
            "do": "Take your train back and chug along.",
            "member": 2
          },
          {
            "role": "train",
            "text": "Choo, choo! Thank you!",
            "do": "Arms go around like wheels."
          },
          {
            "role": "dragon",
            "text": "Is this your kite?",
            "do": "Hold the kite string out to the next Kid."
          },
          {
            "role": "k",
            "text": "Yes, it is!",
            "do": "Take the kite and hold it up high.",
            "member": 3
          },
          {
            "role": "k",
            "text": "Is this YOUR doll, Dragon?",
            "do": "Pick the doll up from the pile and hold it up.",
            "member": 7
          },
          {
            "role": "dragon",
            "text": "Yes, it is. This is my doll.",
            "do": "Look shy. Take the doll and hug it."
          }
        ]
      },
      {
        "title": "Scene 3: The Dragon's box",
        "lines": [
          {
            "stage": "The Little Dragon sits by the big box under the tree, sad. The lid is shut, so the Kids cannot see inside."
          },
          {
            "role": "k",
            "text": "Is it a bat?",
            "do": "Point at the box. Swing a bat.",
            "member": 8
          },
          {
            "role": "dragon",
            "text": "No, it isn't.",
            "do": "Shake your head. Hug the box."
          },
          {
            "role": "bird",
            "text": "Is it a plane?",
            "do": "Arms out wide like a plane."
          },
          {
            "role": "dragon",
            "text": "No, it isn't.",
            "do": "Shake your head, slowly."
          },
          {
            "role": "k",
            "text": "What's this?",
            "do": "Try to peek under the lid.",
            "member": 9
          },
          {
            "role": "dragon",
            "text": "It's a game.",
            "do": "Open the box and hold up the game."
          },
          {
            "role": "dragon",
            "text": "One dragon... no fun.",
            "do": "Roll the dice alone, and sigh."
          },
          {
            "role": "k",
            "text": "My ball, for you!",
            "do": "Roll your ball to the Dragon.",
            "member": 1
          },
          {
            "role": "k",
            "text": "My kite, for you!",
            "do": "Give the Dragon your kite string.",
            "member": 3
          },
          {
            "role": "dragon",
            "text": "Thank you! This is my game... for you!",
            "do": "Put the game in the middle for everyone."
          },
          {
            "stage": "Everyone sits around the game."
          },
          {
            "everyone": "This is my toy... for you!",
            "do": "Hold your own toy out to the person next to you."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play aloud, slowly. The children only do the actions and shout the panto lines (\"No, it isn't!\", \"NO, IT ISN'T!\"). Nobody speaks alone yet."
      },
      {
        "round": "Echo the lines",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with its action. The Dragon practises the grab and the stamp; the Kids practise the stamp back. Then give the one-minute fix."
      },
      {
        "round": "Perform with the script",
        "minutes": 4,
        "how": "Perform with the script and real toys. The box stays shut until \"It's a game\". Invite the audience to join the panto lines."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "No script. The Dragon grabs new toys from the room (\"This is my ...!\"), and gives them back by asking \"Is this your ...?\". The Kids answer as it is true for them."
      }
    ],
    "focusOnForm": [
      "\"This is my ball\", not \"This my ball\": clap on \"is\".",
      "\"Is this your ...?\": start with \"Is\" and raise your voice at the end.",
      "\"No, it isn't\", not \"No, it not\" or \"No isn't\": say all three words.",
      "Final sounds: \"ball\", \"kite\", \"game\", \"bat\". Say the word again and hold the last sound."
    ],
    "props": [
      "a ball, a kite (on a string), a doll, a toy train (only when no child plays the Train)",
      "a big box with a lid and a board game inside",
      "a chair for the tree",
      "a dragon tail or wings (optional)"
    ],
    "teacherNote": "The Dragon's panto grabs are the fun: start the \"No, it isn't!\" yourself and let the audience shout too. Questions stay real: the Dragon does not know whose toy is whose, and nobody can see into the box until it opens. Hand out the toys after casting: each Kid holds the toy their own line names and gets that toy back. With only one Kid, that Kid owns all three toys, so play the first \"No, it isn't!\" as a joke: wrong toy! You read the Narrator, and the Bird's lines when no child is free for it. The value of the unit (share your toys) is the Dragon's gift of the game, not a lecture.",
    "encore": "In a later lesson, the Dragon comes back with a new box (a bat, a teddy bear) and asks to share first: \"Is this your game?\" The Kids grab nothing."
  }
];
