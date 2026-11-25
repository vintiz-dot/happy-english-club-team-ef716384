// National Geographic Look 1, Unit 4: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U4Plays: Play[] = [
  {
    "id": "look1-u4-p1",
    "course": "look",
    "level": 1,
    "unit": 4,
    "afterLesson": 4,
    "title": "The Shadow Family",
    "minutes": 18,
    "band": "6-8",
    "summary": "A Little Cousin from far away brings presents with name tags, but has never met the family, and they are all hiding behind a shadow sheet. The Party Kid knows every shadow (Grandpa, the Aunt) until a GIANT shadow fills the sheet: it is the Baby, and there is no present for the Baby.",
    "targets": {
      "words": [
        "grandpa",
        "aunt",
        "uncle",
        "mom",
        "dad",
        "baby",
        "cousin",
        "me"
      ],
      "grammar": [
        "Who's this? He's my grandpa. / She's my aunt.",
        "What's his name? His name is Bob. / Her name is Pat.",
        "I have a kite for Bob. / I don't have a present."
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
        "id": "cousin",
        "name": "Little Cousin",
        "who": "a gentle child: holds the presents and reads the name tags"
      },
      {
        "id": "kid",
        "name": "Party Kid",
        "who": "a bossy know-it-all: knows every shadow... nearly"
      },
      {
        "id": "baby",
        "name": "Baby",
        "who": "crawls, cries and giggles; if no child is left, the teacher plays the Baby",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "grandpa",
        "name": "Grandpa",
        "who": "a slow, wobbly part with a walking stick; or the teacher",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "aunt",
        "name": "Aunt",
        "who": "a part with a big hat; or the teacher",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "k",
        "name": "Shadow",
        "who": "the rest of the family behind the sheet. Shadow 1 is the Uncle (big muscles)",
        "group": {
          "max": 7
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Presents!",
        "lines": [
          {
            "stage": "A sheet hangs across the room. A cool LED torch on a table shines on it from behind (tape down any cord). The Shadow Family hides behind the sheet. The Little Cousin holds a bag of presents. Only the Cousin can read the name tags."
          },
          {
            "role": "n",
            "text": "A party! A cousin from far away!",
            "do": "Wave to someone far away."
          },
          {
            "role": "kid",
            "text": "Hello, cousin! Presents? Wow!",
            "do": "Wave, then rub your hands."
          },
          {
            "role": "cousin",
            "text": "Hello! I have a kite and a ball.",
            "do": "Hold up a kite, then a ball."
          },
          {
            "role": "kid",
            "text": "Is it for me?",
            "do": "Point at yourself, eyes wide."
          },
          {
            "role": "cousin",
            "text": "No, it isn't. It's for Bob.",
            "do": "Hide the kite; read its tag."
          },
          {
            "role": "kid",
            "text": "Oh no! I don't have a present!",
            "do": "Stamp your foot."
          },
          {
            "role": "k",
            "text": "Hello, cousin! Hee hee!",
            "do": "Wave a hand over the top of the sheet."
          },
          {
            "role": "k",
            "text": "Shh! The shadow game!",
            "do": "Finger on your lips behind the sheet."
          },
          {
            "everyone": "Shadow, shadow, who's this?",
            "do": "Make a shadow bird with your hands."
          }
        ]
      },
      {
        "title": "Scene 2: Who's this?",
        "lines": [
          {
            "stage": "A shadow with a walking stick wobbles on the sheet."
          },
          {
            "role": "cousin",
            "text": "Who's this?",
            "do": "Point at the shadow."
          },
          {
            "role": "kid",
            "text": "He's my grandpa.",
            "do": "Bend over a walking stick."
          },
          {
            "role": "cousin",
            "text": "What's his name?",
            "do": "Hold up the kite's tag."
          },
          {
            "role": "kid",
            "text": "His name is Bob.",
            "do": "Bend over a walking stick and wave."
          },
          {
            "role": "cousin",
            "text": "Bob! I have a kite for Bob!",
            "do": "Hold up the kite."
          },
          {
            "stage": "{@grandpa} wobbles out from behind the sheet. The Cousin gives him the kite."
          },
          {
            "role": "grandpa",
            "text": "A kite? For me? Wow!",
            "do": "Lean on the stick, then fly the kite."
          },
          {
            "role": "cousin",
            "text": "I have a grandpa!",
            "do": "Hug yourself."
          },
          {
            "everyone": "A grandpa! A grandpa!",
            "do": "Bend over a walking stick."
          }
        ]
      },
      {
        "title": "Scene 3: Is she your mom?",
        "lines": [
          {
            "stage": "A shadow with a big hat appears on the sheet."
          },
          {
            "role": "cousin",
            "text": "Who's this? Is she your mom?",
            "do": "Point at the shadow."
          },
          {
            "role": "kid",
            "text": "No, she isn't. She's my aunt.",
            "do": "Shake your head, then put on a big hat."
          },
          {
            "role": "cousin",
            "text": "What's her name?",
            "do": "Hold up the ball's tag."
          },
          {
            "role": "kid",
            "text": "Her name is Pat.",
            "do": "Put on a big hat and wave."
          },
          {
            "role": "cousin",
            "text": "Pat! I have a ball for Pat!",
            "do": "Hold up the ball."
          },
          {
            "stage": "{@aunt} steps out in a big hat. The Cousin gives her the ball."
          },
          {
            "role": "aunt",
            "text": "A ball? For me? Thank you!",
            "do": "Tip your big hat, then bounce the ball."
          },
          {
            "role": "cousin",
            "text": "I have an aunt!",
            "do": "Hug yourself."
          },
          {
            "everyone": "An aunt! An aunt!",
            "do": "Put on a big hat."
          }
        ]
      },
      {
        "title": "Scene 4: A giant!",
        "lines": [
          {
            "stage": "A GIANT shadow fills the sheet. ({@baby} is crawling right next to the torch.)"
          },
          {
            "role": "cousin",
            "text": "Who's this? Is he your uncle?",
            "do": "Look up, way up, and shake."
          },
          {
            "role": "k",
            "text": "No! I'm your uncle!",
            "do": "Pop your head over the sheet and show big muscles.",
            "member": 1
          },
          {
            "role": "kid",
            "text": "Hmm... Is he my dad?",
            "do": "Scratch your head and look at the giant shadow."
          },
          {
            "role": "k",
            "text": "No, he isn't! He's BIG!",
            "do": "Show big muscles, then stretch your arms up high.",
            "member": 1
          },
          {
            "role": "kid",
            "text": "Who's this?",
            "do": "Hide behind the Cousin."
          },
          {
            "role": "baby",
            "text": "Goo goo! Ga ga!",
            "do": "Crawl out from behind the sheet."
          },
          {
            "role": "kid",
            "text": "The baby! His name is Pip!",
            "do": "Rock a baby in your arms."
          },
          {
            "role": "cousin",
            "text": "Oh no! I don't have a present for Pip!",
            "do": "Look into the empty bag."
          },
          {
            "role": "baby",
            "text": "Waaah!",
            "do": "Rub your eyes and cry."
          },
          {
            "role": "cousin",
            "text": "I have a teddy bear. For you!",
            "do": "Hug your own teddy bear, then give it to the Baby."
          },
          {
            "role": "baby",
            "text": "Goo! Ha ha ha!",
            "do": "Hug the teddy bear and rock."
          },
          {
            "role": "cousin",
            "text": "I have a baby cousin!",
            "do": "Hug yourself."
          },
          {
            "everyone": "A baby! A baby!",
            "do": "Rock a baby in your arms."
          }
        ]
      },
      {
        "title": "Scene 5: Presents for the cousin",
        "lines": [
          {
            "stage": "The whole Shadow Family comes out from behind the sheet with presents."
          },
          {
            "role": "k",
            "text": "Thank you! I have a doll for you!",
            "do": "Give the Cousin a doll."
          },
          {
            "role": "k",
            "text": "I have a book for you!",
            "do": "Give the Cousin a book."
          },
          {
            "role": "kid",
            "text": "Is it for me?",
            "do": "Point at yourself, hopeful."
          },
          {
            "role": "k",
            "text": "No, it isn't. It's for the cousin!",
            "do": "Shake your head and laugh."
          },
          {
            "role": "k",
            "text": "I have a train for you!",
            "do": "Give the Cousin a toy train: choo choo!"
          },
          {
            "role": "k",
            "text": "I have a cake for you!",
            "do": "Hold up a big cake."
          },
          {
            "role": "kid",
            "text": "Oh no! I don't have a present!",
            "do": "Fold your arms and sulk."
          },
          {
            "role": "cousin",
            "text": "Look! I'm your present!",
            "do": "Point at yourself and open your arms."
          },
          {
            "role": "kid",
            "text": "Wow! I have a cousin!",
            "do": "Hug the Cousin."
          },
          {
            "everyone": "I have a big family!",
            "do": "Hold hands in a big circle."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action and answer the Cousin's \"I have a grandpa!\" with \"A grandpa! A grandpa!\". Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 6,
        "how": "Perform with scripts and the torch and sheet. The Baby crawls close to the torch so the shadow grows huge."
      },
      {
        "round": "Key words",
        "minutes": 4,
        "how": "Perform again with only key words on the board: grandpa Bob, aunt Pat, uncle, dad, baby Pip, kite, ball, teddy bear. Children say the whole lines. If time is short, do this round at the start of the next lesson."
      }
    ],
    "focusOnForm": [
      "\"He's my grandpa\" / \"She's my aunt\": Vietnamese learners often say he for everyone. Point at the shadow's walking stick or hat on every he or she.",
      "\"His name is Bob\" for a man, \"Her name is Pat\" for a woman: not \"He name\".",
      "\"I don't have a present\", not \"I no have present\": say don't, and keep the a.",
      "\"a kite\" but \"an aunt\": an before a vowel sound. Final sounds: Bob, Pat, Pip end in b, t, p; close your lips or tap your tongue."
    ],
    "props": [
      "a sheet and a cool LED torch on a table (the shadow screen; tape down any cord)",
      "a bag with a kite and a ball, each with a name tag (the Cousin's)",
      "the Cousin's own teddy bear",
      "a walking stick (Grandpa's), a big hat (the Aunt's)",
      "a doll, a book, a toy train and a cake (the Shadow Family's)"
    ],
    "teacherNote": "Value: give things to your friends. Families are all different; say that some children do not have a grandpa or an aunt, and nobody has to play their own family. The Uncle (Shadow 1) has one sign all play: big muscles. The names are short words with a clear last sound (Bob, Pat, Pip) for final-consonant practice. Safety: only a cool LED torch behind the sheet, never a hot lamp; test it first, because a child close to it makes a giant shadow. With no child left for Grandpa, the Aunt or the Baby, you play them behind the sheet with the stick, the hat or a baby cry. The play is about 55 lines: if the class is slow, do the Key words round in the next lesson.",
    "encore": "Later, play it with new shadows and new presents: a grandma with glasses (\"She's my grandma. Her name is Sue. I have a doll for Sue!\") and an uncle with a train."
  },
  {
    "id": "look1-u4-p2",
    "course": "look",
    "level": 1,
    "unit": 4,
    "afterLesson": 7,
    "title": "Who Has the Cake?",
    "minutes": 18,
    "band": "6-8",
    "summary": "At the Birthday Kid's party the lights go off and the cake is gone! The Cake Detective does not know the family; the Kid does. Grandpa hides a book, Cousin Meg hides a teddy bear, and every time the Kid shouts \"Look! The baby!\" the Detective does not believe it.",
    "targets": {
      "words": [
        "grandpa",
        "cousin",
        "mom",
        "baby",
        "me"
      ],
      "grammar": [
        "Who's this? He's my grandpa. / She's my cousin. / He's the baby.",
        "His name is Bob. / Her name is Meg.",
        "Is it my cake? No, it isn't. I don't have a cake. I have a book."
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
        "name": "Birthday Kid",
        "who": "an excited child: it is their birthday and their cake"
      },
      {
        "id": "detective",
        "name": "Cake Detective",
        "who": "a very serious child with a magnifying glass who never looks behind"
      },
      {
        "id": "grandpa",
        "name": "Grandpa",
        "who": "a slow, sleepy part; if no child is left, the teacher plays Grandpa",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "baby",
        "name": "Baby",
        "who": "the sneaky one: crawls and burps; if no child is left, the teacher moves a baby doll",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "mom",
        "name": "Mom",
        "who": "brings the cake; if no child is left, the teacher plays Mom",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "k",
        "name": "Cousin",
        "who": "party guests who see everything and shout. Cousin 1 is Meg, a girl in the story whoever plays her",
        "group": {
          "max": 7
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: My cake!",
        "lines": [
          {
            "stage": "A table with a big birthday cake in the middle. Grandpa and the Cousins stand around it. The Baby sits on the floor with a rattle, looking sweet."
          },
          {
            "role": "n",
            "text": "A birthday party! The cake is in the middle.",
            "do": "Draw a big circle in the air; point to the middle."
          },
          {
            "role": "mom",
            "text": "Look! Your cake!",
            "do": "Hold out both hands to the cake."
          },
          {
            "role": "kid",
            "text": "Thank you, Mom! My cake! Yum!",
            "do": "Hug Mom, then rub your tummy."
          },
          {
            "role": "k",
            "text": "Happy birthday!",
            "do": "Clap your hands."
          },
          {
            "role": "k",
            "text": "A big cake! Yum!",
            "do": "Draw a big cake in the air."
          },
          {
            "stage": "The lights go off. The Baby crawls to the table and takes the cake. The lights come on. Now only the Baby has the cake, behind the table."
          },
          {
            "role": "kid",
            "text": "My cake! Oh no!",
            "do": "Point at the empty table, hands on your cheeks."
          },
          {
            "role": "k",
            "text": "Help! Detective!",
            "do": "Cup your hands around your mouth and call."
          },
          {
            "stage": "The Cake Detective runs in with a magnifying glass."
          },
          {
            "role": "detective",
            "text": "Hello! I'm the Cake Detective!",
            "do": "Hold up the magnifying glass."
          },
          {
            "role": "k",
            "text": "Hello, Detective! Help, please!",
            "do": "Wave, then put your hands together."
          },
          {
            "everyone": "Who has the cake? Who? Who? Who?",
            "do": "Shrug, palms up, and look around."
          }
        ]
      },
      {
        "title": "Scene 2: Hands, please!",
        "lines": [
          {
            "stage": "Grandpa hides a book behind his back."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point the magnifying glass at Grandpa."
          },
          {
            "role": "kid",
            "text": "He's my grandpa. His name is Bob.",
            "do": "Bend over a walking stick."
          },
          {
            "role": "detective",
            "text": "Hands, please!",
            "do": "Hold out your hand."
          },
          {
            "role": "kid",
            "text": "Is it my cake?",
            "do": "Try to peek behind Grandpa's back."
          },
          {
            "role": "grandpa",
            "text": "No, it isn't. I don't have a cake.",
            "do": "Shake your head slowly."
          },
          {
            "role": "grandpa",
            "text": "I have a book. Zzz...",
            "do": "Bring out the book and fall asleep on it."
          },
          {
            "role": "detective",
            "text": "A book. Hmm!",
            "do": "Look at the book through the glass."
          },
          {
            "stage": "Behind the Detective, the Baby crawls past with cake on the nose."
          },
          {
            "role": "kid",
            "text": "Look! The baby!",
            "do": "Point behind the Detective."
          },
          {
            "role": "k",
            "text": "Look! The baby!",
            "do": "Point behind the Detective too.",
            "all": true
          },
          {
            "role": "detective",
            "text": "The baby? Hmm...",
            "do": "Turn around very slowly."
          },
          {
            "role": "baby",
            "text": "Goo goo?",
            "do": "Freeze and smile sweetly; hide the cake."
          },
          {
            "role": "detective",
            "text": "A baby! No, no, no.",
            "do": "Wag your finger and turn back."
          },
          {
            "everyone": "Who has the cake? Who? Who? Who?",
            "do": "Shrug, palms up, and look around."
          }
        ]
      },
      {
        "title": "Scene 3: Hands, please! Again!",
        "lines": [
          {
            "stage": "Cousin 1, Meg, hides her teddy bear behind her back."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point the magnifying glass at Meg."
          },
          {
            "role": "kid",
            "text": "She's my cousin. Her name is Meg.",
            "do": "Hold hands with Meg."
          },
          {
            "role": "detective",
            "text": "Hands, please!",
            "do": "Hold out your hand."
          },
          {
            "role": "kid",
            "text": "Is it my cake?",
            "do": "Try to peek behind her back."
          },
          {
            "role": "k",
            "text": "No, it isn't! I don't have a cake.",
            "do": "Shake your head.",
            "member": 1
          },
          {
            "role": "k",
            "text": "I have a teddy bear!",
            "do": "Bring out the teddy bear and hug it.",
            "member": 1
          },
          {
            "role": "detective",
            "text": "A teddy bear. Hmm!",
            "do": "Look at the teddy bear through the glass."
          },
          {
            "stage": "Behind the Detective, the Baby crawls past again, eating cake."
          },
          {
            "role": "kid",
            "text": "Look! The baby!",
            "do": "Jump and point behind the Detective."
          },
          {
            "role": "k",
            "text": "Look! The baby!",
            "do": "Jump and point too.",
            "all": true
          },
          {
            "role": "detective",
            "text": "The baby? Hmm...",
            "do": "Turn around very slowly."
          },
          {
            "role": "baby",
            "text": "Goo goo?",
            "do": "Freeze and smile sweetly; hide the cake."
          },
          {
            "role": "detective",
            "text": "A baby! No, no, no.",
            "do": "Wag your finger and turn back."
          },
          {
            "everyone": "Who has the cake? Who? Who? Who?",
            "do": "Shrug, palms up, and look around."
          }
        ]
      },
      {
        "title": "Scene 4: Burp!",
        "lines": [
          {
            "stage": "The Baby crawls past a third time and stops, right behind the Detective."
          },
          {
            "role": "kid",
            "text": "Look! The baby!",
            "do": "Jump up and down and point."
          },
          {
            "role": "k",
            "text": "Look! The baby!",
            "do": "Jump up and down and point.",
            "all": true
          },
          {
            "role": "detective",
            "text": "No, no, no. A baby!",
            "do": "Fold your arms; do not turn around."
          },
          {
            "role": "baby",
            "text": "BURP!",
            "do": "Pat your tummy."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Turn around fast."
          },
          {
            "role": "kid",
            "text": "He's the baby. His name is Pip.",
            "do": "Rock a baby in your arms."
          },
          {
            "role": "detective",
            "text": "Look! Cake! On his nose!",
            "do": "Look through the glass, then touch your nose."
          },
          {
            "role": "kid",
            "text": "Is it my cake?",
            "do": "Point at the Baby's nose."
          },
          {
            "role": "baby",
            "text": "Goo goo! Yes!",
            "do": "Bring out the cake from behind your back; a big bite is gone."
          }
        ]
      },
      {
        "title": "Scene 5: Cake for everyone!",
        "lines": [
          {
            "role": "kid",
            "text": "My cake! Oh no! A small cake!",
            "do": "Hold up the cake with the big bite."
          },
          {
            "role": "baby",
            "text": "Waaah!",
            "do": "Rub your eyes and cry."
          },
          {
            "role": "kid",
            "text": "Shh, baby. Cake for you!",
            "do": "Give the Baby a piece."
          },
          {
            "role": "baby",
            "text": "Goo! Ha ha!",
            "do": "Eat and clap."
          },
          {
            "role": "kid",
            "text": "And cake for you, and you!",
            "do": "Give pieces to the Cousins."
          },
          {
            "role": "k",
            "text": "Thank you! Yum!",
            "do": "Eat and rub your tummy."
          },
          {
            "role": "k",
            "text": "Cake for me? Wow!",
            "do": "Point at yourself, then eat."
          },
          {
            "role": "detective",
            "text": "Cake for me? Thank you!",
            "do": "Put down the glass and eat."
          },
          {
            "role": "k",
            "text": "Happy birthday!",
            "do": "Clap your hands."
          },
          {
            "everyone": "Happy birthday! I have a cake! Cake for everyone!",
            "do": "Hold up your piece, then share it with the child next to you."
          }
        ]
      }
    ],
    "rehearsal": [
      {
        "round": "Listen and do",
        "minutes": 4,
        "how": "Read the whole play slowly. The children do every action and join the chant \"Who has the cake?\" and the shout \"Look! The baby!\". Nobody speaks alone yet."
      },
      {
        "round": "Echo",
        "minutes": 4,
        "how": "Read each line; the child with that part echoes it with the action. Then give the one-minute fix."
      },
      {
        "round": "Script",
        "minutes": 6,
        "how": "Perform with scripts. The Detective must really stand with his back to the Baby; the Kid and the Cousins point hard."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Swap what the suspects hide (a ball, a doll, a pencil case) and who they are (\"She's my aunt. Her name is Pat.\"). The Baby still has the cake. If time is short, do this round in the next lesson."
      }
    ],
    "focusOnForm": [
      "\"I don't have a cake\", not \"I no have cake\": say don't, and keep the a.",
      "\"I have\" but \"Who has\": children say \"I has\". I have, you have; who has, he has.",
      "\"He's my grandpa\" / \"She's my cousin\": he for a man or boy, she for a woman or girl. \"His name\" for Grandpa and Pip, \"Her name\" for Meg: not \"He name\".",
      "Final sounds: cake, book, Meg, Pip. Make the last sound, do not swallow it."
    ],
    "props": [
      "a paper cake on a table (the Baby takes it in the dark)",
      "a magnifying glass (the Detective's)",
      "a book (Grandpa's), a teddy bear (Meg's, Cousin 1)",
      "a rattle (the Baby's); a baby doll if no child plays the Baby"
    ],
    "teacherNote": "Value: give things to your friends; the Kid shares the cake with the one who took it. Dramatic irony is the whole joke: the audience always sees the Baby, the Detective never does until the burp. Rehearse the Detective's slow turn and the Baby's freeze first. Cousin 1 is Meg, a girl in the story whoever plays her. With no child left for the Baby, move a baby doll yourself (with 2 children you also read the Cousins' echo, so the doll keeps you from shouting at yourself). With no child for Grandpa or Mom, you play them. The play is about 60 lines: if the class is slow, do the Own words round in the next lesson.",
    "encore": "Later, play it with a stolen birthday present instead of a cake, and new suspects: an aunt with a ball, an uncle with a kite."
  }
];
