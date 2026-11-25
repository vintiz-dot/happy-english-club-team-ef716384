// National Geographic Look 1, Unit 3: class plays for Mars (grades 1-2). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const look1U3Plays: Play[] = [
  {
    "id": "look1-u3-p1",
    "course": "look",
    "level": 1,
    "unit": 3,
    "afterLesson": 4,
    "title": "Who's This?",
    "minutes": 16,
    "band": "6-8",
    "summary": "A Photo Detective looks at frozen people. \"Who's this?\" \"He's a boy. He's my classmate.\" \"Is she a teacher?\" \"No, she isn't.\" Then a photo sneezes.",
    "targets": {
      "words": [
        "boy",
        "girl",
        "student",
        "classmate",
        "friend",
        "man",
        "woman",
        "teacher"
      ],
      "grammar": [
        "He's a boy. / She's a girl. He's my classmate. She's my friend.",
        "Is he a ...? Yes, he is. / No, he isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "detective",
        "name": "Photo Detective",
        "who": "a confident child: asks the questions"
      },
      {
        "id": "sneeze",
        "name": "Sneezing Photo",
        "who": "a short, funny part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Photos",
        "who": "children who like to act; they freeze like a photo",
        "group": {
          "max": 9
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: Who's this?",
        "lines": [
          {
            "stage": "The Photos stand frozen like photos. The Photo Detective walks along them with a big magnifying glass."
          },
          {
            "role": "n",
            "text": "The Photo Detective looks at the photos.",
            "do": "Hold up a magnifying glass."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point at the first Photo."
          },
          {
            "role": "k",
            "text": "He's a boy. He's my classmate.",
            "do": "Point at a boy photo."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point at the next Photo."
          },
          {
            "role": "k",
            "text": "She's a girl. She's my friend.",
            "do": "Point at a girl photo."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point at the next Photo."
          },
          {
            "role": "k",
            "text": "He's a man. He's a teacher.",
            "do": "Point at a man photo."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Point at the next Photo."
          },
          {
            "role": "k",
            "text": "She's a woman. She's a teacher.",
            "do": "Point at a woman photo."
          },
          {
            "everyone": "Who's this? A friend!",
            "do": "Wave to a friend."
          }
        ]
      },
      {
        "title": "Scene 2: Is he a teacher?",
        "lines": [
          {
            "role": "detective",
            "text": "Is he a student?",
            "do": "Tilt your head at a boy photo."
          },
          {
            "role": "k",
            "text": "Yes, he is. He's a classmate.",
            "do": "Nod and give a thumbs up."
          },
          {
            "role": "detective",
            "text": "Is she a teacher?",
            "do": "Look at a girl photo."
          },
          {
            "role": "k",
            "text": "No, she isn't. She's a student.",
            "do": "Shake your head, then show a book."
          },
          {
            "role": "detective",
            "text": "Is she your friend?",
            "do": "Point at a girl photo."
          },
          {
            "role": "k",
            "text": "Yes, she is!",
            "do": "Wave to her."
          },
          {
            "role": "detective",
            "text": "Is he a girl?",
            "do": "Hold your chin, puzzled."
          },
          {
            "role": "k",
            "text": "No, he isn't. He's a boy!",
            "do": "Laugh and shake your head."
          },
          {
            "role": "k",
            "text": "Is he your friend? Yes, he is!",
            "do": "Wave to him."
          },
          {
            "everyone": "Who's this? A friend!",
            "do": "Wave to a friend."
          }
        ]
      },
      {
        "title": "Scene 3: The sneeze",
        "lines": [
          {
            "role": "n",
            "text": "The last photo moves!",
            "do": "Jump back, surprised."
          },
          {
            "role": "sneeze",
            "text": "Ah-choo!",
            "do": "Sneeze and wiggle."
          },
          {
            "role": "detective",
            "text": "Who's this?",
            "do": "Peek at the photo."
          },
          {
            "role": "sneeze",
            "text": "I'm a friend!",
            "do": "Wave and smile."
          },
          {
            "role": "n",
            "text": "Now everyone is a friend.",
            "do": "Open your arms."
          },
          {
            "everyone": "Who's this? A friend!",
            "do": "Wave to a friend."
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
        "how": "Perform with scripts. The Photos freeze when the Detective looks and move when she says \"A friend!\""
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children choose a partner and say \"He's a boy. He's my classmate.\" or \"She's a girl. She's my friend.\" with their own friends."
      }
    ],
    "focusOnForm": [
      "\"He\" for a boy and \"she\" for a girl: not \"he\" for everyone. Point at the child each time.",
      "\"He's a boy\", not \"He boy\": clap on the 's.",
      "\"Yes, he is\" / \"No, she isn't\": say all three words."
    ],
    "props": [
      "a magnifying glass (cardboard)",
      "photo frames made of cardboard (optional)"
    ],
    "teacherNote": "The Photos must freeze; let them practice \"Freeze!\" first. Use real children in the room so he/she is easy to point at.",
    "encore": "In a later lesson, perform with new Photos and have children whisper \"Who's this?\" to the Detective."
  },
  {
    "id": "look1-u3-p2",
    "course": "look",
    "level": 1,
    "unit": 3,
    "afterLesson": 7,
    "title": "The New Student",
    "minutes": 16,
    "band": "6-8",
    "summary": "The Teacher says there is a new student. The classmates ask \"Is he a student?\" But a man with a big bag walks in by mistake. Then the real new girl arrives and everyone says hello.",
    "targets": {
      "words": [
        "boy",
        "girl",
        "student",
        "classmate",
        "friend",
        "man",
        "woman",
        "teacher"
      ],
      "grammar": [
        "He's a ... / She's a ... He's my classmate. She's my friend.",
        "Is he a ...? Yes, he is. / No, he isn't."
      ]
    },
    "roles": [
      {
        "id": "n",
        "name": "Narrator",
        "who": "the teacher, or a confident reader"
      },
      {
        "id": "teacher",
        "name": "Teacher",
        "who": "a confident child: acts like a teacher",
        "optional": {
          "give": "n"
        }
      },
      {
        "id": "man",
        "name": "Lost Man",
        "who": "a funny part: a grown-up with a big bag",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "girl",
        "name": "New Girl",
        "who": "a confident child: a gentle part",
        "optional": {
          "give": "k"
        }
      },
      {
        "id": "k",
        "name": "Classmates",
        "who": "children who like to act; short lines",
        "group": {
          "max": 8
        }
      }
    ],
    "scenes": [
      {
        "title": "Scene 1: A new student",
        "lines": [
          {
            "stage": "The Classmates sit in rows. The Teacher stands at the front."
          },
          {
            "role": "teacher",
            "text": "Look! A new student!",
            "do": "Point at the door."
          },
          {
            "role": "k",
            "text": "Is he a boy?",
            "do": "Lean forward."
          },
          {
            "role": "teacher",
            "text": "Look! She's a girl.",
            "do": "Point at the door."
          },
          {
            "role": "k",
            "text": "Is she a student?",
            "do": "Look at the door."
          },
          {
            "role": "teacher",
            "text": "Wait!",
            "do": "Hold up your hand."
          },
          {
            "everyone": "Hello, friend! Hello, friend!",
            "do": "Wave to the door."
          }
        ]
      },
      {
        "title": "Scene 2: Oh no, a man!",
        "lines": [
          {
            "role": "n",
            "text": "A man walks in with a big bag.",
            "do": "Hold an imaginary big bag."
          },
          {
            "role": "man",
            "text": "Hello!",
            "do": "Wave and look around."
          },
          {
            "role": "k",
            "text": "Is he a student?",
            "do": "Point at the man."
          },
          {
            "role": "k",
            "text": "No, he isn't. He's a man!",
            "do": "Shake your head and laugh."
          },
          {
            "role": "k",
            "text": "Is he a teacher?",
            "do": "Tilt your head."
          },
          {
            "role": "man",
            "text": "No! I'm lost!",
            "do": "Look at an imaginary map."
          },
          {
            "role": "teacher",
            "text": "He's a man. He's a friend.",
            "do": "Shake the man's hand."
          },
          {
            "role": "k",
            "text": "Is he a woman? No, he isn't!",
            "do": "Giggle and shake your head."
          },
          {
            "role": "k",
            "text": "Bye, man!",
            "do": "Wave goodbye."
          },
          {
            "role": "k",
            "text": "She's a woman. She's a teacher!",
            "do": "Point at the Teacher."
          },
          {
            "everyone": "Hello, friend! Hello, friend!",
            "do": "Wave to the door."
          }
        ]
      },
      {
        "title": "Scene 3: The real new girl",
        "lines": [
          {
            "role": "n",
            "text": "The real new student comes in.",
            "do": "Point at the door."
          },
          {
            "role": "girl",
            "text": "Hello! I'm a student.",
            "do": "Wave shyly."
          },
          {
            "role": "k",
            "text": "She's a girl. She's my classmate!",
            "do": "Point at the girl and smile."
          },
          {
            "role": "k",
            "text": "Is she your friend? Yes, she is!",
            "do": "Hold her hand."
          },
          {
            "role": "k",
            "text": "She's my friend.",
            "do": "Point at the girl."
          },
          {
            "role": "teacher",
            "text": "She's a student. She's my classmate.",
            "do": "Clap your hands."
          },
          {
            "everyone": "Hello, friend! Hello, friend!",
            "do": "Wave to the door."
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
        "how": "Perform with scripts. The Classmates sit in rows and turn when a new person comes in."
      },
      {
        "round": "Own words",
        "minutes": 4,
        "how": "Children swap in other people (a woman, a teacher, a boy) and use \"Is he a ...?\" / \"Is she a ...?\" with their own friends."
      }
    ],
    "focusOnForm": [
      "\"he\" and \"she\": touch the boy or the girl when you say it.",
      "\"He's a boy\", not \"He a boy\": say the 's.",
      "\"classmate\": say the end sound \"mate\"."
    ],
    "props": [
      "a big bag",
      "a map (paper)",
      "a chair"
    ],
    "teacherNote": "Value: make friends at school. A shy child can be the New Girl and say two short lines.",
    "encore": "Later, perform it with a different new student and a different surprise visitor."
  }
];
