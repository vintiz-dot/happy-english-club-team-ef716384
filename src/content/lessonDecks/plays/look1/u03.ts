// National Geographic Look 1, Unit 3: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U3Plays: Play[] = [
  {
    "id": "look1-u3-p1",
    "course": "look",
    "level": 1,
    "unit": 3,
    "afterLesson": 4,
    "title": "The Blindfold Game",
    "minutes": 16,
    "band": "6-8",
    "summary": "Playtime! The Seeker has a scarf over the eyes and wants to find a best friend, who is small. The Seeker hugs a giggling boy, then a grumpy Music Teacher with a drum (\"No, she isn't!\"), and at last feels a small head down low and works it out.",
    "targets": {
      "words": [
        "boy",
        "girl",
        "woman",
        "teacher",
        "student",
        "classmate",
        "friend"
      ],
      "grammar": [
        "Who's this? Is she my friend?",
        "Is she a ...? Yes, she is. / No, she isn't.",
        "She's a girl. / He's a boy. / She's a teacher. / She's my friend."
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
        "id": "seeker",
        "name": "Seeker",
        "who": "a confident child: eyes covered, arms out; hasty, hugs everyone"
      },
      {
        "id": "friend",
        "name": "Best Friend",
        "who": "a giggly child who can keep a secret"
      },
      {
        "id": "mt",
        "name": "Music Teacher",
        "who": "a grumpy grown-up woman with a drum who laughs in the end; if no child is left, the teacher plays her",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "k",
        "name": "Classmate",
        "who": "they can see everything: cheeky helpers who shout the answers. Classmate 1 is the boy the Seeker hugs: cast a boy",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Who's your friend?",
        "lines": [
          {
            "stage": "The Classmates stand in a big circle. The Seeker stands in the middle with a scarf over the eyes. The Best Friend stands in the circle too. Before the game, the Seeker chose a friend in secret."
          },
          {
            "role": "n",
            "text": "Playtime! The Blindfold Game!",
            "do": "Tie a scarf over your eyes."
          },
          {
            "everyone": "Who's this? Who's this? Is she my friend?",
            "do": "Spin around, arms out, eyes shut."
          },
          {
            "role": "k",
            "text": "Who's your friend?",
            "do": "Cup your hands around your mouth and call.",
            "all": true
          },
          {
            "role": "seeker",
            "text": "She's a girl!",
            "do": "Pull two pigtails."
          },
          {
            "role": "k",
            "text": "Is she a teacher?",
            "do": "Point at a board, like a teacher."
          },
          {
            "role": "seeker",
            "text": "No, she isn't! She's small.",
            "do": "Shake your head, then hold a hand down low."
          },
          {
            "role": "k",
            "text": "Is she your classmate?",
            "do": "Point at the children next to you."
          },
          {
            "role": "seeker",
            "text": "Yes, she is! She's my friend.",
            "do": "Nod, then link your little fingers."
          },
          {
            "stage": "The Best Friend tiptoes out of the circle and crouches behind a chair. The Classmates see it. The Seeker can't."
          },
          {
            "role": "friend",
            "text": "Hee hee! Shh!",
            "do": "Crouch down low and put a finger on your lips."
          },
          {
            "role": "k",
            "text": "Look! Shh!",
            "do": "Point at the chair, then whisper to the audience."
          },
          {
            "everyone": "Who's this? Who's this? Is she my friend?",
            "do": "Spin around, arms out, eyes shut."
          }
        ]
      },
      {
        "title": "Scene 2: Try again!",
        "lines": [
          {
            "role": "n",
            "text": "The Seeker walks. Slowly, slowly.",
            "do": "Walk slowly on the spot, arms out."
          },
          {
            "stage": "The Seeker bumps into Classmate 1, a boy."
          },
          {
            "role": "seeker",
            "text": "Who's this? Is she my friend?",
            "do": "Pat the shoulders, then open your arms for a hug."
          },
          {
            "role": "k",
            "text": "No, she isn't! He's a boy!",
            "do": "Wag a finger, then tip a cap.",
            "member": 2
          },
          {
            "role": "seeker",
            "text": "A boy?",
            "do": "Freeze in the hug."
          },
          {
            "role": "k",
            "text": "Hee hee! I'm your classmate!",
            "do": "Giggle, then point at the children next to you.",
            "member": 1
          },
          {
            "role": "seeker",
            "text": "He's a boy! Oh no!",
            "do": "Let go and jump back."
          },
          {
            "role": "k",
            "text": "Ha ha! Try again!",
            "do": "Hold up one finger."
          },
          {
            "everyone": "Who's this? Who's this? Is she my friend?",
            "do": "Spin around, arms out, eyes shut."
          }
        ]
      },
      {
        "title": "Scene 3: Boom! Boom!",
        "lines": [
          {
            "stage": "{@mt} marches in, banging a drum. Only {@mt} holds the drum."
          },
          {
            "role": "mt",
            "text": "Boom! Boom! Hmph!",
            "do": "Bang the drum and frown."
          },
          {
            "role": "seeker",
            "text": "Who's this? Is she my friend?",
            "do": "Walk to the sound, then hug the drum."
          },
          {
            "role": "k",
            "text": "No, she isn't!",
            "do": "Wag a finger: no, no, no!",
            "all": true
          },
          {
            "role": "k",
            "text": "She's a woman!",
            "do": "Stand tall like a grown-up and fluff your long hair."
          },
          {
            "role": "k",
            "text": "She's a teacher!",
            "do": "Point at a board, like a teacher."
          },
          {
            "role": "seeker",
            "text": "A teacher? Oh no!",
            "do": "Hands on your cheeks."
          },
          {
            "role": "mt",
            "text": "Ha ha! Hello, student!",
            "do": "Laugh and pat the Seeker's head."
          },
          {
            "role": "seeker",
            "text": "Oops! Sorry!",
            "do": "Let go of the drum and bow."
          },
          {
            "role": "k",
            "text": "Ha ha! Try again!",
            "do": "Hold up two fingers."
          },
          {
            "everyone": "Who's this? Who's this? Is she my friend?",
            "do": "Spin around, arms out, eyes shut."
          }
        ]
      },
      {
        "title": "Scene 4: Small!",
        "lines": [
          {
            "role": "n",
            "text": "The Seeker sits down. So sad.",
            "do": "Sit down and make a sad face."
          },
          {
            "role": "seeker",
            "text": "No friend. Boo hoo!",
            "do": "Rub your eyes and cry."
          },
          {
            "stage": "The Best Friend tiptoes out and crouches down low next to the Seeker."
          },
          {
            "role": "friend",
            "text": "Tap, tap!",
            "do": "Tap the Seeker on the shoulder."
          },
          {
            "role": "seeker",
            "text": "Who's this?",
            "do": "Reach out; your hands find a head, down low."
          },
          {
            "role": "seeker",
            "text": "Small... Is she small?",
            "do": "Hold a hand down low."
          },
          {
            "role": "k",
            "text": "Yes, she is!",
            "do": "Nod hard.",
            "all": true
          },
          {
            "role": "seeker",
            "text": "Is she a teacher?",
            "do": "Point at a board, like a teacher."
          },
          {
            "role": "k",
            "text": "No, she isn't!",
            "do": "Wag a finger and laugh.",
            "all": true
          },
          {
            "role": "k",
            "text": "She's a girl!",
            "do": "Pull two pigtails."
          },
          {
            "role": "seeker",
            "text": "Small! A girl! She's my friend!",
            "do": "Hold a hand low, pull pigtails, then hold out your little finger."
          },
          {
            "role": "friend",
            "text": "Yes! I'm your friend!",
            "do": "Link little fingers with the Seeker."
          },
          {
            "stage": "The Seeker pulls off the scarf."
          },
          {
            "role": "seeker",
            "text": "Wow! My friend!",
            "do": "Hug the Best Friend."
          },
          {
            "role": "k",
            "text": "Hooray! Friends!",
            "do": "Clap and jump."
          },
          {
            "everyone": "She's my friend!",
            "do": "Link little fingers with the child next to you."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action and join the chant \"Who's this? Is she my friend?\" and the shout \"No, she isn't!\". Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 5,
        "how": "Perform with scripts. The Classmates make a circle so the Seeker stays safe inside it."
      },
      {
        "round": "Key words",
        "minutes": 3,
        "how": "Perform again with only key words on the board: friend, small, boy, classmate, woman, teacher, girl. Children say the whole lines. If time is short, do this round at the start of the next lesson."
      }
    ],
    "focusOnForm": [
      "\"She's a girl\", not \"She girl\": Vietnamese needs no \"is\" here, so children drop it. Clap on the 's.",
      "he and she: \"He's a boy\" for the boy, \"she\" for the Music Teacher and the girl. Point at the person on every he or she.",
      "\"isn't\" ends in a t: \"No, she isn't!\", not \"No, she isn\". Make the t pop.",
      "Keep the little \"a\": \"a girl\", \"a woman\", \"a teacher\"."
    ],
    "props": [
      "a soft scarf (the Seeker's)",
      "a drum, or a pot and a spoon (the Music Teacher's)",
      "a chair"
    ],
    "teacherNote": "Value: make friends at school. Cast a boy as Classmate 1 (the Seeker hugs him). The Best Friend and the Music Teacher are girls and women in the story whoever plays them; a man teacher playing the Music Teacher wears a scarf. The Seeker may peek under the scarf if nervous; only the audience needs to believe it. Steer the Seeker gently to Classmate 1 in Scene 2. Practice the big \"No, she isn't!\" with a finger wag before you start. The play is about 50 lines: if the class is slow, do the Key words round in the next lesson.",
    "encore": "In a later lesson, play it again with a new Seeker who looks for a big boy (\"He's a boy. He's big.\", \"No, he isn't!\") and a man teacher with a drum (\"He's a man! He's a teacher!\")."
  },
  {
    "id": "look1-u3-p2",
    "course": "look",
    "level": 1,
    "unit": 3,
    "afterLesson": 7,
    "title": "Lost at the Museum",
    "minutes": 18,
    "band": "6-8",
    "summary": "On a school trip, a Lost Student is too small to see over the Crowd. The Tall Guard can see, but does not know her teacher: he finds a man with a red bag, then a girl with a red bag, and when he holds his binoculars the wrong way around the Crowd must shout \"Oh yes, she is!\"",
    "targets": {
      "words": [
        "man",
        "woman",
        "girl",
        "student",
        "teacher"
      ],
      "grammar": [
        "Who's your teacher?",
        "Is she a woman? / Is she a teacher? Yes, she is. / No, she isn't.",
        "He's a man. / She's a girl. / She's a student. / She's my teacher. / He isn't my teacher."
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
        "id": "student",
        "name": "Lost Student",
        "who": "a small, worried child who hops to see"
      },
      {
        "id": "guard",
        "name": "Tall Guard",
        "who": "a slow, booming, stubborn part with binoculars"
      },
      {
        "id": "man",
        "name": "Man with a Red Bag",
        "who": "a funny cameo with a paper beard; with no child for him, the Guard points at a picture card",
        "optional": {
          "cut": true
        }
      },
      {
        "id": "girl",
        "name": "Girl with a Red Bag",
        "who": "a cheerful cameo; with no child for her, the Guard points at a picture card",
        "optional": {
          "cut": true
        }
      },
      {
        "id": "red",
        "name": "Ms. Red",
        "who": "the Student's teacher, a woman, with a red bag; if no child is left, the teacher plays her",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "k",
        "name": "Crowd Member",
        "who": "people looking at a dinosaur; they block the view, then help",
        "group": {
          "max": 7
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Help!",
        "lines": [
          {
            "stage": "The Crowd stands close together, backs to the Lost Student, looking up at a big dinosaur. The Tall Guard stands on a sturdy low step and holds the binoculars. Far away, Ms. Red holds her red bag (with 2 children, she is a picture on the far wall). Picture cards of a man and a girl, each with a red bag, hang far away too."
          },
          {
            "stage": "{@man} holds his own red bag, far away.",
            "if": "man"
          },
          {
            "stage": "{@girl} holds her own red bag, far away.",
            "if": "girl"
          },
          {
            "role": "n",
            "text": "A school trip! A big museum!",
            "do": "Stretch your arms up high."
          },
          {
            "role": "student",
            "text": "Wow! A dinosaur!",
            "do": "Make big claws and roar."
          },
          {
            "role": "k",
            "text": "It's big!",
            "do": "Stand on tiptoe, arms up."
          },
          {
            "role": "student",
            "text": "Where's my teacher? Help!",
            "do": "Jump up and down behind the Crowd."
          },
          {
            "role": "k",
            "text": "Shh!",
            "do": "Finger on your lips and frown."
          },
          {
            "role": "guard",
            "text": "Hello, student! Who's your teacher?",
            "do": "Bend down slowly from the step."
          },
          {
            "role": "student",
            "text": "She's a woman. A red bag!",
            "do": "Stand tall and fluff your long hair, then hold a bag on your shoulder."
          },
          {
            "role": "guard",
            "text": "A woman. A red bag. OK!",
            "do": "Lift the binoculars very slowly."
          },
          {
            "role": "k",
            "text": "A red bag! Look, look!",
            "do": "Make binoculars with your hands and look around."
          },
          {
            "everyone": "Is she a teacher? Look, look, look!",
            "do": "Make binoculars with your hands and turn around."
          }
        ]
      },
      {
        "title": "Scene 2: A red bag!",
        "lines": [
          {
            "stage": "The Guard points the binoculars at the man with the red bag."
          },
          {
            "role": "guard",
            "text": "Look! A red bag!",
            "do": "Point far away with the binoculars."
          },
          {
            "role": "student",
            "text": "Is she a woman?",
            "do": "Stand on tiptoe, hand over your eyes."
          },
          {
            "role": "guard",
            "text": "No! He's a man!",
            "do": "Stand tall and stroke a big beard."
          },
          {
            "stage": "{@man} turns around and waves his red bag.",
            "if": "man"
          },
          {
            "role": "man",
            "text": "Hello! I'm a man!",
            "do": "Stroke your beard and wave the red bag."
          },
          {
            "role": "student",
            "text": "Oh no! He isn't my teacher!",
            "do": "Shake your head, hands on your cheeks."
          },
          {
            "role": "k",
            "text": "Oh no! Look again!",
            "do": "Make binoculars with your hands."
          },
          {
            "everyone": "Is she a teacher? Look, look, look!",
            "do": "Make binoculars with your hands and turn around."
          }
        ]
      },
      {
        "title": "Scene 3: Another red bag!",
        "lines": [
          {
            "stage": "The Guard points the binoculars at the girl with the red bag."
          },
          {
            "role": "guard",
            "text": "Look! A red bag!",
            "do": "Point the other way with the binoculars."
          },
          {
            "role": "student",
            "text": "Is she a woman?",
            "do": "Stand on tiptoe, hand over your eyes."
          },
          {
            "role": "guard",
            "text": "No, she isn't. She's a girl.",
            "do": "Shake your head, then pull two pigtails."
          },
          {
            "role": "student",
            "text": "Is she a teacher?",
            "do": "Stand on tiptoe again, hopeful."
          },
          {
            "role": "guard",
            "text": "No, she isn't. She's a student.",
            "do": "Shake your head, then write in the air like a student."
          },
          {
            "stage": "{@girl} waves her red bag.",
            "if": "girl"
          },
          {
            "role": "girl",
            "text": "Hello! I'm a student!",
            "do": "Wave the red bag, then write in the air."
          },
          {
            "role": "student",
            "text": "Oh no! She isn't my teacher!",
            "do": "Shake your head and sit down, sad."
          },
          {
            "everyone": "Is she a teacher? Look, look, look!",
            "do": "Make binoculars with your hands and turn around."
          }
        ]
      },
      {
        "title": "Scene 4: Oh yes, she is!",
        "lines": [
          {
            "stage": "The Tall Guard turns the binoculars the wrong way around. Everything looks tiny. He points them at Ms. Red."
          },
          {
            "role": "guard",
            "text": "Look! A red bag!",
            "do": "Look through the wrong end of the binoculars."
          },
          {
            "role": "student",
            "text": "Is she a woman?",
            "do": "Stand on tiptoe, hand over your eyes."
          },
          {
            "role": "guard",
            "text": "No, she isn't. She's small. She's a girl.",
            "do": "Hold a hand down low, then pull two pigtails."
          },
          {
            "role": "k",
            "text": "Look! A step!",
            "do": "Point at the Guard's step."
          },
          {
            "role": "student",
            "text": "Up, up! Help, please!",
            "do": "Hold out your hand to the Guard."
          },
          {
            "stage": "The Tall Guard steps down carefully, then holds the Student's hand while she climbs up the sturdy low step. Now the Student can see over the Crowd."
          },
          {
            "role": "student",
            "text": "Look! She's a woman! She's my teacher!",
            "do": "Fluff your long hair, then point at a board and wave."
          },
          {
            "role": "guard",
            "text": "No, she isn't! She's a girl!",
            "do": "Look through the wrong end; fold your arms."
          },
          {
            "role": "k",
            "text": "No! She's a woman!",
            "do": "Stand tall and fluff your long hair."
          },
          {
            "role": "guard",
            "text": "Oh no, she isn't!",
            "do": "Shake your head and stamp."
          },
          {
            "role": "k",
            "text": "Oh yes, she is!",
            "do": "Nod hard and point.",
            "all": true
          },
          {
            "role": "guard",
            "text": "Oh no, she isn't!",
            "do": "Stamp again, very grumpy."
          },
          {
            "role": "k",
            "text": "Oh yes, she is!",
            "do": "Jump and point.",
            "all": true
          },
          {
            "role": "k",
            "text": "Look! This way!",
            "do": "Turn the Guard's binoculars the right way around."
          },
          {
            "role": "guard",
            "text": "Oh! She's a woman! She's a teacher!",
            "do": "Jump in surprise, then point at a board."
          },
          {
            "role": "student",
            "text": "Teacher! Teacher!",
            "do": "Wave both arms."
          },
          {
            "stage": "{@red} walks in with the red bag."
          },
          {
            "role": "red",
            "text": "One, two, three... my student!",
            "do": "Count on your fingers, then open your arms."
          },
          {
            "role": "student",
            "text": "My teacher!",
            "do": "Step down carefully and hug."
          },
          {
            "everyone": "Hello, teacher! She's my teacher!",
            "do": "Wave at Ms. Red and cheer."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action and join the chant \"Is she a teacher? Look, look, look!\" and the \"Oh yes, she is!\" shouts. Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 6,
        "how": "Perform with scripts. The Crowd stands close so the small Student really cannot see; the Guard really holds the binoculars backward in Scene 4."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "The Lost Student looks for a different teacher (\"He's a man. A blue bag!\"). The Guard and the Crowd choose who they see: a boy, a girl, a man, a woman. If time is short, do this round in the next lesson."
      }
    ],
    "focusOnForm": [
      "\"She's a woman\", not \"She woman\": say the 's (Vietnamese needs no \"is\" here).",
      "he for the man, she for the woman and the girl: \"He isn't my teacher\" / \"She isn't my teacher\".",
      "Final sounds: \"isn't\" ends in t, \"is\" ends in a buzzing z: \"Oh yes, she iz!\"",
      "Keep the \"a\": \"a man\", \"a woman\", \"a red bag\"."
    ],
    "props": [
      "binoculars: two paper tubes taped together (the Guard's)",
      "a red bag each for Ms. Red, the man and the girl (each holds only their own)",
      "picture cards of a man and a girl with red bags (for when no child plays them)",
      "a sturdy low step, not a chair (the Guard's, then the Student's)",
      "a dinosaur picture on the wall",
      "a paper beard (the man's)"
    ],
    "teacherNote": "Value: make friends at school; the Crowd stops shushing and starts helping. Safety: use a sturdy low step; nobody lifts anybody, and the Student steps down carefully. The binocular joke carries Scene 4: show the class that the wrong end makes people look tiny before you rehearse. Practice the \"Oh yes, she is! / Oh no, she isn't!\" argument first; children love it. Ms. Red is a woman whoever plays her; a man teacher playing her wears a scarf. With no child for the man or the girl, the Guard points at their picture cards. With no child for Ms. Red, she is a picture on the far wall until you walk in as her at the end. The play is about 55 lines: if the class is slow, do the Own words round in the next lesson.",
    "encore": "Later, play it again: the Student looks for a lost classmate (\"He's a boy. A blue bag!\"), and the Guard finds a man, then a woman, before the boy."
  }
];
