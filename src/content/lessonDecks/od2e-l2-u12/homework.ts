import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 12: one task per
// lesson, keyed by deck id. Each has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app,
// never written here. Children are 7-9, so a task is a drawing plus two to four short
// sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U12Creative: Record<string, Creative> = {
  "od2e-l2-u12-l1": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "carton",
        "paper",
        "shelf",
        "recycling plant",
        "machine",
        "stationery store",
        "rescue"
      ],
      "grammar": [
        "The story is in a ___. It is ___.",
        "A problem in my story is ..."
      ]
    },
    "base": {
      "title": "A setting for my story",
      "task": "Design a setting for a story. Choose one place, draw it and write three describing words. Then say what the problem in your story is.",
      "steps": [
        "Choose one place, for example a recycling plant or a stationery store.",
        "Draw the place and put three labels with describing words on it.",
        "Write: A problem in my story is ...",
        "Say why this problem fits your place."
      ],
      "frames": [
        "My story is in a ___.",
        "It is ___, ___ and ___.",
        "A problem in my story is ___.",
        "This problem fits because ___."
      ],
      "success": [
        "My picture shows one place with three describing words.",
        "I use a new word from the lesson.",
        "I can say why my problem fits my place."
      ],
      "challenge": "Think of three different places. For each one write a sentence that says where the story is. Which place would make the best story? Say why."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A setting at the Gunners' stadium",
          "task": "Design a setting for a story about a football match. Choose one place at the Emirates Stadium, draw it and write three describing words. Then say what the problem in your story is.",
          "steps": [
            "Choose one place: the tunnel, the snack shop or the stands. Draw it with red Arsenal colours.",
            "Put three labels with describing words on it.",
            "Write: A problem in my story is ...",
            "Say why this problem fits your place."
          ],
          "frames": [
            "My story is in the ___ at the stadium.",
            "It is ___, ___ and ___.",
            "A problem in my story is ___.",
            "This problem fits because ___."
          ],
          "success": [
            "My picture shows one place with three describing words.",
            "I use a new word from the lesson.",
            "I can say why my problem fits my place."
          ],
          "challenge": "Think of three different places at a football match. For each one write a sentence that says where the story is. Which place would make the best story? Say why."
        }
      }
    ]
  },
  "od2e-l2-u12-l2": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "diary",
        "carton",
        "shelf",
        "paper",
        "blew",
        "rescued",
        "machines"
      ],
      "grammar": [
        "Dear Diary, ... (where, when, how I feel)",
        "I wish ___ will ___."
      ]
    },
    "base": {
      "title": "Dear Diary, I am a bottle",
      "task": "Create a short diary entry as a thing you use every day, such as your pencil, your bag or a bottle. Say where you are and how you feel.",
      "steps": [
        "Choose a thing you use every day.",
        "Start with the date and Dear Diary.",
        "Write two or three sentences: where you are and how you feel.",
        "Write what you wish will happen next and why."
      ],
      "frames": [
        "Dear Diary, today I am in a ___.",
        "I feel ___ because ___.",
        "I wish a ___ will ___.",
        "That would be good because ___."
      ],
      "success": [
        "My diary starts with the date and Dear Diary.",
        "I say where I am and how I feel.",
        "I give a wish with a reason."
      ],
      "challenge": "Write a second diary entry for a different day in a different place. Show the change of setting and the change of feeling."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Dear Diary, I am a football",
          "task": "Create a short diary entry as a football, a scarf or a boot at the Emirates Stadium. Say where you are and how you feel.",
          "steps": [
            "Choose a football thing: a ball, a scarf or a boot.",
            "Start with the date and Dear Diary.",
            "Write two or three sentences: where you are at the Gunners' stadium and how you feel.",
            "Write what you wish will happen next and why."
          ],
          "frames": [
            "Dear Diary, today I am in the ___.",
            "I feel ___ because ___.",
            "I wish a ___ will ___.",
            "That would be good because ___."
          ],
          "success": [
            "My diary starts with the date and Dear Diary.",
            "I say where I am and how I feel.",
            "I give a wish with a reason."
          ],
          "challenge": "Write a second diary entry for a different match day in a different place. Show the change of setting and the change of feeling."
        }
      }
    ]
  },
  "od2e-l2-u12-l3": {
    "kind": "creative",
    "thinking": "Evaluate",
    "uses": {
      "words": [
        "shelf",
        "carton",
        "paper",
        "machine",
        "recycling plant",
        "stationery store"
      ],
      "grammar": [
        "Where's the ___? It's next to / under / behind the ___.",
        "Is there a ___? Yes, there is. / No, there isn't."
      ]
    },
    "base": {
      "title": "Where is it in my park?",
      "task": "Draw a park with a lake, a bench and a bin. Write four sentences about where things are. Then choose a new thing for the park and decide where it goes.",
      "steps": [
        "Draw a park with a lake, a bench, a bin and a tree.",
        "Write four sentences with place words, for example: The bench is next to the tree.",
        "Invent one more thing for your park and decide where it goes.",
        "Say why that is the best place for it."
      ],
      "frames": [
        "The bench is next to the ___.",
        "The ___ is under / behind / between the ___.",
        "Is there a ___ in the park? Yes, there is.",
        "The ___ goes ___ because ___."
      ],
      "success": [
        "I write four true sentences about my picture.",
        "I use at least three different place words.",
        "I can say why the new thing goes there."
      ],
      "challenge": "Write three questions about your park picture (Where's ...? Is there ...?) and the answers. Include one No answer. Swap with a friend tomorrow and check the pictures match."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Where is it at the football park?",
          "task": "Draw a football park with a pitch, a bench and a bin. Write four sentences about where things are. Then choose a new thing for the Gunners fans and decide where it goes.",
          "steps": [
            "Draw a park with a pitch, a goal, a bench and a bin.",
            "Write four sentences with place words, for example: The bin is next to the goal.",
            "Invent one more thing for the fans and decide where it goes.",
            "Say why that is the best place for it."
          ],
          "frames": [
            "The bench is next to the ___.",
            "The ___ is under / behind / between the ___.",
            "Is there a ___ at the pitch? Yes, there is.",
            "The ___ goes ___ because ___."
          ],
          "success": [
            "I write four true sentences about my picture.",
            "I use at least three different place words.",
            "I can say why the new thing goes there."
          ],
          "challenge": "Write three questions about your football park picture (Where's ...? Is there ...?) and the answers. Include one No answer. Swap with a friend tomorrow and check the pictures match."
        }
      }
    ]
  },
  "od2e-l2-u12-l4": {
    "kind": "creative",
    "thinking": "Compare and justify",
    "uses": {
      "words": [
        "recycled",
        "reused",
        "go",
        "went",
        "going",
        "usually",
        "last week"
      ],
      "grammar": [
        "usually + base verb",
        "now: I'm / He's + verb-ing",
        "last week + past verb"
      ]
    },
    "base": {
      "title": "Usually, now and last week",
      "task": "Draw something that was recycled and what it is now. Write three sentences: one with usually, one with now and one with last week.",
      "steps": [
        "Draw something that was recycled and what it is now.",
        "Write one sentence with usually.",
        "Write one sentence with now and one with last week.",
        "Choose which sentence you like best and say why."
      ],
      "frames": [
        "I usually ___ paper in the blue bin.",
        "I'm ___ now.",
        "Last week I ___ to the ___.",
        "I like the ___ sentence best because ___."
      ],
      "success": [
        "I use the base verb, verb-ing and the past verb correctly.",
        "My three sentences each have a time word.",
        "I can say which sentence I like best and why."
      ],
      "challenge": "Invent a new thing you could make from an old carton. Draw it and write what it was, what it is now and why it is useful. Tell it to someone at home."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Usually, now and last week at the match",
          "task": "Draw something at the Emirates Stadium that was recycled and what it is now. Write three sentences: one with usually, one with now and one with last week.",
          "steps": [
            "Draw something that was recycled and what it is now, for example a bottle that became a flag pole.",
            "Write one sentence with usually about match day.",
            "Write one sentence with now and one with last week.",
            "Choose which sentence you like best and say why."
          ],
          "frames": [
            "On match day I usually ___.",
            "I'm ___ now.",
            "Last week I ___ to the ___.",
            "I like the ___ sentence best because ___."
          ],
          "success": [
            "I use the base verb, verb-ing and the past verb correctly.",
            "My three sentences each have a time word.",
            "I can say which sentence I like best and why."
          ],
          "challenge": "Invent a new thing for Gunners fans you could make from an old carton. Draw it and write what it was, what it is now and why it is useful. Tell it to someone at home."
        }
      }
    ]
  },
  "od2e-l2-u12-l5": {
    "kind": "creative",
    "thinking": "Argue",
    "uses": {
      "words": [
        "paper",
        "carton",
        "machine",
        "rescue",
        "recycling plant",
        "shelf"
      ],
      "grammar": [
        "It was a ___. Now it is a ___.",
        "because for a reason",
        "We can ___ the Earth."
      ]
    },
    "base": {
      "title": "Why my resource is important",
      "task": "Finish your natural resource collage. Write three sentences and argue why your resource is the most important one.",
      "steps": [
        "Look at your collage and name the natural resource.",
        "Write why it is important.",
        "Write one thing we make or do with it and one way to take care of it.",
        "Say why your resource is more important than another one."
      ],
      "frames": [
        "___ is important because ___.",
        "We make / use ___ for ___.",
        "We can take care of it by ___.",
        "I think ___ is more important than ___ because ___."
      ],
      "success": [
        "I write three sentences about my resource.",
        "I give at least one reason with because.",
        "I can compare it with another resource."
      ],
      "challenge": "Invent a new thing made from recycled materials. Draw it and label the parts. Write what it was, what it is now and why people will love it. Share it with someone at home or in class."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Why my resource matters at the match",
          "task": "Choose a natural resource Arsenal fans and players need, such as water, grass or sunlight. Write three sentences and argue why it is the most important one for the Emirates Stadium.",
          "steps": [
            "Choose a natural resource and draw it at the stadium.",
            "Write why it is important for the Gunners' match day.",
            "Write one thing we make or do with it and one way to take care of it.",
            "Say why your resource is more important than another one."
          ],
          "frames": [
            "___ is important at the match because ___.",
            "We make / use ___ for ___.",
            "We can take care of it by ___.",
            "I think ___ is more important than ___ because ___."
          ],
          "success": [
            "I write three sentences about my resource.",
            "I give at least one reason with because.",
            "I can compare it with another resource."
          ],
          "challenge": "Invent a new thing for the stadium made from recycled materials. Draw it and label the parts. Write what it was, what it is now and why fans will love it. Share it with someone at home or in class."
        }
      }
    ]
  },

  // Lesson 6: Grammar Champions (place words, Where's ...? and Is there ...?)
  "od2e-l2-u12-l6": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "carton",
        "paper",
        "shelf",
        "recycling plant",
        "machine",
        "rescue"
      ],
      "grammar": [
        "Where's the ___? It's ___ the ___.",
        "Is there a ___ ___ the ___? Yes, there is. / No, there isn't."
      ]
    },
    "base": {
      "title": "The case of the lost carton",
      "task": "A carton is lost at your school! Write a short detective story. The detective asks three questions to find it: two with Is there and one with Where. At the end the detective finds the carton and puts it in the right bin.",
      "steps": [
        "Draw the detective and the place where the carton is lost.",
        "Write two questions with Is there and say Yes or No for each.",
        "Write one question with Where and an answer with a place word.",
        "Write the ending: the detective finds the carton and puts it in the bin."
      ],
      "frames": [
        "Is there a carton ___ the ___?",
        "Yes, there is. / No, there isn't.",
        "Where's the carton? It's ___ the ___.",
        "The detective puts it in the ___."
      ],
      "success": [
        "I wrote two Is there questions with a place word inside.",
        "My Where question has no place word, and the answer has one.",
        "My ending says what the detective does for the Earth."
      ],
      "challenge": "Add a second lost thing. Write where each one is and use between for the second thing."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "The case of the lost football boot",
          "task": "A football boot is lost at the Emirates Stadium! Write a short detective story. The detective asks three questions to find it: two with Is there and one with Where. At the end the detective finds the boot and puts the paper cups in the recycling bin.",
          "steps": [
            "Draw the detective and the place at the stadium where the boot is lost.",
            "Write two questions with Is there and say Yes or No for each.",
            "Write one question with Where and an answer with a place word.",
            "Write the ending: the detective finds the boot and puts the paper cups in the bin."
          ],
          "frames": [
            "Is there a boot ___ the ___?",
            "Yes, there is. / No, there isn't.",
            "Where's the boot? It's ___ the ___.",
            "The detective puts the cups in the ___."
          ],
          "success": [
            "I wrote two Is there questions with a place word inside.",
            "My Where question has no place word, and the answer has one.",
            "My ending says what the detective does for the Earth."
          ],
          "challenge": "Add a second lost thing, a scarf. Write where each one is and use between for the second thing."
        }
      }
    ]
  }
};
