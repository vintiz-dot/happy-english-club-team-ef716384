// National Geographic Look 1, Unit 5: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U5Plays: Play[] = [
  {
    "id": "look1-u5-p1",
    "course": "look",
    "level": 1,
    "unit": 5,
    "afterLesson": 4,
    "title": "The Lost Little Monster",
    "minutes": 18,
    "band": "6-8",
    "summary": "Mama Monster phones the Monster Police: her baby Tod is lost. He has three eyes and big ears, and he doesn't have hair. The Police check the Park Monsters, but Tod is hiding under the Police desk all along, and his hand, his foot and then his head pop up whenever the Police look away.",
    "targets": {
      "words": [
        "head",
        "arm",
        "leg",
        "hand",
        "mouth",
        "foot",
        "eye",
        "ear"
      ],
      "grammar": [
        "This is my head. / These are my arms.",
        "He has three eyes. / He has big ears. / He doesn't have hair.",
        "Is he your baby? Yes, he is. / No, he isn't."
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
        "id": "police",
        "name": "Monster Police",
        "who": "a calm, slow child who writes everything down and never sees behind him in time"
      },
      {
        "id": "little",
        "name": "Little Monster",
        "who": "a cheeky child who hides under the desk and giggles; with 2 children, the teacher works a hand puppet under the desk"
      },
      {
        "id": "mama",
        "name": "Mama Monster",
        "who": "a loud, worried part on the phone; if no child is left, the teacher plays her",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "k",
        "name": "Park Monster",
        "who": "silly monsters who love showing off their bodies",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Ring, ring!",
        "lines": [
          {
            "stage": "The Monster Police sits on a chair in front of a desk, facing the audience, with a phone and a pencil. The Little Monster hides under the desk behind him: the audience can see him, the Police can't. The Park Monsters stand frozen in funny shapes. {@mama} is far away with a phone."
          },
          {
            "role": "n",
            "text": "Ring, ring! Ring, ring!",
            "do": "Shake like a ringing phone."
          },
          {
            "role": "police",
            "text": "Hello! Monster Police!",
            "do": "Pick up the phone and salute."
          },
          {
            "role": "mama",
            "text": "Help! My baby! Oh no!",
            "do": "Hold the phone and cry."
          },
          {
            "role": "police",
            "text": "Your baby? What's his name?",
            "do": "Pick up the pencil."
          },
          {
            "role": "mama",
            "text": "His name is Tod. He's small.",
            "do": "Hold a hand down low."
          },
          {
            "role": "police",
            "text": "Tod. Small. OK!",
            "do": "Write it down."
          },
          {
            "role": "mama",
            "text": "He has three eyes!",
            "do": "Hold up three fingers next to your eyes."
          },
          {
            "role": "police",
            "text": "He has three eyes. OK!",
            "do": "Point at your eyes, then write it down."
          },
          {
            "role": "mama",
            "text": "He has big ears!",
            "do": "Make big ears with your hands."
          },
          {
            "role": "police",
            "text": "He has big ears. Hair?",
            "do": "Write it down, then touch your hair."
          },
          {
            "role": "mama",
            "text": "No! He doesn't have hair!",
            "do": "Rub a bald head."
          },
          {
            "everyone": "He has three eyes! He has big ears!",
            "do": "Three fingers by your eyes, then big ears."
          }
        ]
      },
      {
        "title": "Scene 2: Line up!",
        "lines": [
          {
            "role": "police",
            "text": "Park Monsters! Line up!",
            "do": "Blow a whistle."
          },
          {
            "role": "k",
            "text": "These are my arms!",
            "do": "Wave your arms.",
            "all": true
          },
          {
            "role": "k",
            "text": "This is my head!",
            "do": "Pat your head."
          },
          {
            "role": "k",
            "text": "These are my legs!",
            "do": "March on the spot."
          },
          {
            "role": "k",
            "text": "These are my hands!",
            "do": "Clap your hands."
          },
          {
            "role": "k",
            "text": "This is my mouth! Ahh!",
            "do": "Open your mouth wide."
          },
          {
            "stage": "Behind the Police, the Little Monster's hand pops up from under the desk."
          },
          {
            "role": "k",
            "text": "Look! A hand!",
            "do": "Point at the desk.",
            "all": true
          },
          {
            "role": "police",
            "text": "A hand? Hmm...",
            "do": "Turn around fast. The hand is gone."
          },
          {
            "role": "k",
            "text": "Ha ha! No hand!",
            "do": "Giggle and hide your hands."
          },
          {
            "role": "k",
            "text": "These are my eyes! One, two, three!",
            "do": "Point at your eyes and count.",
            "member": 1
          },
          {
            "role": "k",
            "text": "These are my ears! Small, small!",
            "do": "Make tiny ears with your fingers.",
            "member": 1
          },
          {
            "role": "police",
            "text": "Is he your baby? Three eyes, small ears.",
            "do": "Pick up the phone; three fingers, then tiny ears."
          },
          {
            "role": "mama",
            "text": "No, he isn't! Small ears!",
            "do": "Shake your head and cry."
          },
          {
            "everyone": "He has three eyes! He has big ears!",
            "do": "Three fingers by your eyes, then big ears."
          }
        ]
      },
      {
        "title": "Scene 3: A foot!",
        "lines": [
          {
            "role": "police",
            "text": "Monsters! Hop, please!",
            "do": "Blow the whistle."
          },
          {
            "role": "k",
            "text": "This is my foot! Hop, hop!",
            "do": "Hop on one foot."
          },
          {
            "stage": "Behind the Police, the Little Monster's foot pops up from under the desk."
          },
          {
            "role": "k",
            "text": "Look! A foot!",
            "do": "Hop and point at the desk."
          },
          {
            "role": "police",
            "text": "A foot? Hmm...",
            "do": "Turn around fast. The foot is gone."
          },
          {
            "role": "police",
            "text": "Oh no! No Tod!",
            "do": "Sit on the desk and put your head in your hands."
          },
          {
            "role": "k",
            "text": "Oh no! Mama! Boo hoo!",
            "do": "Rub your eyes and cry."
          },
          {
            "stage": "The desk giggles. The Little Monster's whole head pops up, right next to the Police."
          },
          {
            "role": "k",
            "text": "Look! A head!",
            "do": "Jump up and down and point.",
            "all": true
          },
          {
            "role": "police",
            "text": "A head? Who's this?",
            "do": "Turn around slowly."
          },
          {
            "role": "little",
            "text": "Hee hee! These are my ears!",
            "do": "Flap big ears."
          },
          {
            "role": "k",
            "text": "Look! Three eyes!",
            "do": "Hold up three fingers and point at the Little Monster."
          },
          {
            "role": "police",
            "text": "Big ears! Three eyes! No hair!",
            "do": "Count on your fingers."
          },
          {
            "role": "police",
            "text": "Is he your baby?",
            "do": "Pick up the phone."
          },
          {
            "role": "mama",
            "text": "Yes, he is! My Tod!",
            "do": "Jump for joy with the phone."
          },
          {
            "role": "police",
            "text": "Tod! Your mama!",
            "do": "Point at the phone, then at the door."
          },
          {
            "stage": "{@mama} runs in with open arms."
          },
          {
            "role": "little",
            "text": "Mama! These are my arms!",
            "do": "Open your arms wide and run."
          },
          {
            "everyone": "These are my arms! Hug, hug, hug!",
            "do": "Open your arms wide, then hug yourself."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action, join the chant \"He has three eyes! He has big ears!\" and shout \"Look! A hand!\". Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 6,
        "how": "Perform with scripts. The Police sits with his back to the desk, so the audience sees what he cannot."
      },
      {
        "round": "Key words",
        "minutes": 4,
        "how": "Perform again with only key words on the board: three eyes, big ears, no hair, arms, head, legs, hands, mouth, foot. Children say the whole lines. If time is short, do this round at the start of the next lesson."
      }
    ],
    "focusOnForm": [
      "Plural s: \"These are my arms\", \"three eyes\", \"big ears\". One is \"This is my head\". Hold up fingers and hiss the s.",
      "\"He has three eyes\", not \"He have\": he has, I have.",
      "\"He doesn't have hair\", not \"He no have hair\".",
      "Final sounds: head, hand, foot. Tap the d and the t at the end."
    ],
    "props": [
      "a toy phone each for the Police and Mama",
      "a pencil and paper (the Police's)",
      "a desk with a cloth over it (Tod hides under it)",
      "a whistle (the Police's)"
    ],
    "teacherNote": "Value: be active; the Park Monsters move every body part they name. The joke is dramatic irony: the audience always sees Tod, the Police never does until the head. Rehearse the Police's slow turn and Tod's quick duck first. With 2 children, you work Tod as a hand puppet under the desk. The play is about 50 lines: if the class is slow, do the Key words round in the next lesson. With no child left for Mama Monster, you are Mama on the phone from the side of the room.",
    "encore": "Later, Mama loses a different baby: \"She has two heads! She has small ears! She doesn't have a mouth!\" The Park Monsters change their bodies to match."
  },
  {
    "id": "look1-u5-p2",
    "course": "look",
    "level": 1,
    "unit": 5,
    "afterLesson": 7,
    "title": "Bones in the Bag",
    "minutes": 18,
    "band": "6-8",
    "summary": "At night in the museum, the Skeleton wants to dance, but he sneezes and his bones fly into a bag. He doesn't have eyes, so the Museum Mice pull out the bones for him: a leg he waves like an arm, a hand he wears like an ear, and a ball he says is his head (\"Oh no, it isn't!\").",
    "targets": {
      "words": [
        "arm",
        "leg",
        "hand",
        "ear",
        "head",
        "eye",
        "foot"
      ],
      "grammar": [
        "Is this your arm? Yes, it is. / No, it isn't. It's a leg.",
        "This is my arm. / These are my eyes.",
        "He doesn't have a head. / He has a leg."
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
        "id": "skeleton",
        "name": "Skeleton",
        "who": "a dramatic, wobbly child who wants to dance; sure of everything, often wrong"
      },
      {
        "id": "k",
        "name": "Mouse Helper",
        "who": "squeaky, busy helpers who pull bones out of the bag",
        "group": {
          "max": 11
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Ah-choo!",
        "lines": [
          {
            "stage": "Night in the museum. The Skeleton stands next to a box. The Museum Mice hide around the room. Behind the box is a big bag; the Mice own it."
          },
          {
            "role": "n",
            "text": "Night. The museum. Shh!",
            "do": "Finger on your lips; tiptoe."
          },
          {
            "role": "skeleton",
            "text": "Music! Dance, dance!",
            "do": "Wiggle your bones."
          },
          {
            "role": "skeleton",
            "text": "Ah... ah... AH-CHOO!",
            "do": "Sneeze, then sit down fast and fall to pieces."
          },
          {
            "stage": "The bones fly into the bag. The Skeleton sits on the floor, arms tucked in his shirt, legs folded under him, a cloth over his head. The skull rolls under the box."
          },
          {
            "role": "k",
            "text": "Oh no! The skeleton!",
            "do": "Hands on your cheeks.",
            "all": true
          },
          {
            "role": "k",
            "text": "He doesn't have arms!",
            "do": "Hide your arms behind your back."
          },
          {
            "role": "k",
            "text": "He doesn't have legs!",
            "do": "Kneel down."
          },
          {
            "role": "k",
            "text": "He doesn't have a head!",
            "do": "Cover your head with your hands."
          },
          {
            "role": "skeleton",
            "text": "Help! I don't have eyes!",
            "do": "Wave around blindly under the cloth."
          },
          {
            "role": "k",
            "text": "Bones, bones, in the bag! Is this your arm?",
            "do": "Reach into the bag and hold up a bone.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 2: Is this your arm?",
        "lines": [
          {
            "role": "n",
            "text": "The Mice help. Squeak, squeak!",
            "do": "Make little mouse paws."
          },
          {
            "role": "k",
            "text": "Squeak! A bone!",
            "do": "Peek into the bag."
          },
          {
            "stage": "One Mouse pulls a long paper bone out of the bag. It has a foot at the end, but the Mouse holds that end down."
          },
          {
            "role": "k",
            "text": "Is this your arm?",
            "do": "Hold up the long bone.",
            "member": 1
          },
          {
            "role": "skeleton",
            "text": "Is it big?",
            "do": "Feel the air."
          },
          {
            "role": "k",
            "text": "Yes, it is!",
            "do": "Nod and stretch your arms wide.",
            "member": 1
          },
          {
            "stage": "The Mouse gives the bone to the Skeleton."
          },
          {
            "role": "skeleton",
            "text": "Yes! This is my arm!",
            "do": "Wave the bone like an arm."
          },
          {
            "stage": "The foot swings up. Everyone sees it."
          },
          {
            "role": "k",
            "text": "No, it isn't! It's a leg!",
            "do": "Point at the foot and laugh.",
            "all": true
          },
          {
            "role": "skeleton",
            "text": "A leg? Oh! This is my leg!",
            "do": "Put the bone down, then unfold one leg and wiggle it."
          },
          {
            "role": "k",
            "text": "He has a leg!",
            "do": "Hop on one leg."
          },
          {
            "role": "k",
            "text": "Bones, bones, in the bag! Is this your arm?",
            "do": "Reach into the bag and hold up a bone.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 3: Is this your hand?",
        "lines": [
          {
            "role": "k",
            "text": "Squeak! A bone!",
            "do": "Peek into the bag again."
          },
          {
            "stage": "Another Mouse pulls out a small bone with five fingers."
          },
          {
            "role": "k",
            "text": "Is this your hand?",
            "do": "Hold up the small bone.",
            "member": 2
          },
          {
            "role": "skeleton",
            "text": "Is it small?",
            "do": "Feel the air."
          },
          {
            "role": "k",
            "text": "Yes, it is!",
            "do": "Nod and hold a hand down low.",
            "member": 2
          },
          {
            "stage": "The Mouse gives the bone to the Skeleton."
          },
          {
            "role": "skeleton",
            "text": "Yes! This is my ear!",
            "do": "Put the hand up by your head, like a big ear."
          },
          {
            "role": "k",
            "text": "No, it isn't! It's a hand!",
            "do": "Wave and laugh.",
            "all": true
          },
          {
            "role": "skeleton",
            "text": "A hand? Oh! This is my hand!",
            "do": "Pull one arm out of your shirt and wave the hand."
          },
          {
            "role": "k",
            "text": "He has an arm! He has a hand!",
            "do": "Wave one arm."
          },
          {
            "role": "k",
            "text": "Look! An arm and a hand!",
            "do": "Pull a second arm bone out of the bag."
          },
          {
            "stage": "The Skeleton pulls the other arm out of his shirt."
          },
          {
            "role": "skeleton",
            "text": "These are my arms! These are my hands!",
            "do": "Wave both arms and wiggle your fingers."
          },
          {
            "role": "k",
            "text": "Bones, bones, in the bag! Is this your arm?",
            "do": "Reach into the bag and hold up a bone.",
            "all": true
          }
        ]
      },
      {
        "title": "Scene 4: Is this your head?",
        "lines": [
          {
            "stage": "Another Mouse pulls a round thing out of the bag: a ball. The Skeleton can't see it."
          },
          {
            "role": "k",
            "text": "Is this your head?",
            "do": "Hold up the ball with both hands.",
            "member": 3
          },
          {
            "role": "skeleton",
            "text": "Is it big?",
            "do": "Feel the air with your new hands."
          },
          {
            "role": "k",
            "text": "Yes, it is!",
            "do": "Nod and make a big circle with your arms.",
            "member": 3
          },
          {
            "stage": "The Mouse gives the ball to the Skeleton."
          },
          {
            "role": "skeleton",
            "text": "Yes! This is my head!",
            "do": "Put the ball on top of the cloth."
          },
          {
            "role": "k",
            "text": "No, it isn't! It's a ball!",
            "do": "Bounce an invisible ball.",
            "all": true
          },
          {
            "role": "skeleton",
            "text": "Oh yes, it is!",
            "do": "Hold the ball on your head, proud."
          },
          {
            "role": "k",
            "text": "Oh no, it isn't!",
            "do": "Shake your head hard.",
            "all": true
          },
          {
            "role": "skeleton",
            "text": "Oh yes, it is!",
            "do": "Stamp your foot."
          },
          {
            "stage": "A Mouse peeks under the box and finds a skull."
          },
          {
            "role": "k",
            "text": "Look! A head! Under the box!",
            "do": "Lift the skull up high.",
            "member": 4
          },
          {
            "stage": "The Mouse takes the ball and gives the Skeleton the skull. The Skeleton pulls the cloth off his head."
          },
          {
            "role": "skeleton",
            "text": "Wow! This is my head! These are my eyes!",
            "do": "Pat your head, then point at your eyes."
          },
          {
            "role": "k",
            "text": "He has a head!",
            "do": "Pat your head."
          },
          {
            "role": "k",
            "text": "He has eyes! He has ears!",
            "do": "Point at your eyes, then your ears."
          },
          {
            "role": "k",
            "text": "Look! A leg and a foot!",
            "do": "Pull the last leg bone out of the bag and give it to the Skeleton."
          },
          {
            "role": "skeleton",
            "text": "Look! My feet! Dance, dance!",
            "do": "Unfold your other leg and stand up on both feet."
          },
          {
            "role": "k",
            "text": "Dance, Skeleton, dance!",
            "do": "Clap to the beat."
          },
          {
            "everyone": "These are my arms! These are my legs! Dance!",
            "do": "Wave your arms, kick your legs, then dance."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action and join the chant \"Bones, bones, in the bag! Is this your arm?\" and the \"No, it isn't!\" shouts. Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 6,
        "how": "Perform with scripts and the paper bones. The Skeleton keeps arms tucked in and legs folded until each bone goes back."
      },
      {
        "round": "Key words",
        "minutes": 4,
        "how": "Perform again with only key words on the board: arm, leg, hand, ear, head, eyes, foot, ball. Children say the whole lines. If time is short, do this round at the start of the next lesson."
      }
    ],
    "focusOnForm": [
      "\"This is my arm\" for one, \"These are my arms\" for two: hold up one finger, then two.",
      "\"He doesn't have a head\", not \"He no have head\": say doesn't and the a.",
      "\"an arm\", \"an ear\", but \"a leg\", \"a hand\": an before a vowel sound.",
      "Final sounds: arm, leg, hand, head. Close the word; do not drop the last sound. One foot, two feet: no \"foots\"."
    ],
    "props": [
      "a big bag with paper bones: a leg with a foot, two arms with hands (the Mice's)",
      "a ball in the same bag (the Mice's, until a Mouse gives it to the Skeleton)",
      "a paper skull under the box",
      "a cloth for the Skeleton's head",
      "a box for the Skeleton to stand on"
    ],
    "teacherNote": "Value: be active; the play ends with everyone dancing. Make the bones from paper, and keep the leg's foot hidden until the Mouse lets it swing. The Skeleton must say \"This is my arm!\" with total confidence so the class can shout \"No, it isn't!\". Practice the \"Oh yes, it is! / Oh no, it isn't!\" argument first. Give the Mice who find the bones (members 1 to 4) the bag in turn. Safety: the Skeleton sits or kneels to fall apart; no jumping off the box. The play is about 60 lines: if the class is slow, do the Key words round in the next lesson.",
    "encore": "Later, a second skeleton loses her bones: \"Is this your foot? No, it isn't! It's a hand!\" The Mice can also hide the bones around the room for the Skeleton to find with their help."
  }
];
