import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 17 "Shapes in Art"
// (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so
// the Lab raises the language, not the topic. Every lesson gets a grammar drill (say it,
// ask it, say no, join it, change the time or the person, then real talk) and a longer,
// more mature fluency routine. Three lessons write a full planned paragraph, the other two
// work at sentence level with harder items. Two lessons end with a recorded talk for
// home that students make on their own. Time comes from games and repeats for younger
// children, never from the book pages or the grammar. All text is original.

export const odL2U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u17-l1": {
      "objectives": [
        "I can ask and answer about shapes and give a reason in a full sentence: 'It isn't a circle, although it looks round.'"
      ],
      "drop": [
        "Shape chant and move"
      ],
      "trim": {
        "The mystery bag": 5,
        "Which go together? Why?": 7
      },
      "add": [
        {
          "after": "Circle the correct word (SB 168 B)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: say it, ask it, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change each sentence fast and correctly: ask it, say no, join two ideas, change the time or the person. Then talk about real shapes in your school and your city.",
            "chunks": [
              "It's an oval, and it has no corners.",
              "Is it an oval? Yes, it is. / No, it isn't.",
              "It isn't a circle, although it looks round from here.",
              "It looks like a crescent because it is thin and curved.",
              "When I look at a shell, I see a spiral.",
              "It was a square last week, but now it is an oval."
            ],
            "recycle": [
              "This is the most interesting picture I've seen.",
              "Who is the fastest runner in your class?"
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can (X +, ? T)."
              },
              {
                "seconds": 90,
                "say": "Real talk: ask your partner about the shapes in your school, your street or your city. Answer with a short answer and one more sentence with because or although."
              }
            ],
            "steps": [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = make it negative, + = join it to another idea with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with every ending (-s, -ed, n't) clear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3 the drill becomes real: find out which shape your partner notices most in the city, and remember why."
            ],
            "prompts": [
              "It is an oval. (?)",
              "It looks like a circle. (X)",
              "It is a spiral. (+ because it goes round and round)",
              "It was a square. (T: now)",
              "I think it is an oval. (P: she)"
            ],
            "feedback": "Prompt, do not tell: for 'It's a oval' say 'an oval' with a clear 'an' and let the student echo; for 'No, it not' start 'No, it is...' and pause so the student finishes 'isn't'; for 'Is it oval?' hold up one finger at the missing 'an'; for a missing 'although' clause, point to the sign + and wait. Say the 'an' and the n't clearly yourself.",
            "teacherNote": "A drill only helps when the last round is real: students use the forms to say what they actually see around them. Grades 6-7 can take the full set of signs, including two at once. Keep it brisk; a drill that drags loses its point. Vietnamese has no a / an, so listen for 'an oval' and for the final -s on 'sides' and 'corners'.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with 'it', with the frames on the board.",
                "frames": [
                  "Is it a ___? / Is it an ___?",
                  "Yes, it is. / No, it isn't.",
                  "It isn't a ___."
                ]
              },
              {
                "level": "Core",
                "task": "Use every sign, and join two ideas with because, although or so."
              },
              {
                "level": "Stretch",
                "task": "Add a second clause and a follow-up question: 'It isn't a circle, although it looks round. Why do you think it looks round?'",
                "frames": [
                  "It isn't a ___, although ___."
                ]
              }
            ]
          }
        },
        {
          "after": "Guess my shape",
          "slide": {
            "kind": "fluency",
            "title": "Shape sprint: what does it look like?",
            "routine": "chunk sprint",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Describe a shape in one long, smooth sentence with a reason, fast and without stops, and ask a question back.",
            "chunks": [
              "I think it's an oval because it's longer than it is wide.",
              "It isn't a circle, although it looks round from here.",
              "The roof of my school has a straight side and a curved side.",
              "In my city, there's a famous bridge that looks like a long crescent.",
              "It looks like a spiral because it goes round and round."
            ],
            "recycle": [
              "This is the most interesting picture I've seen.",
              "Who is the fastest runner in your class?"
            ],
            "rounds": [
              {
                "seconds": 80,
                "say": "Together: the teacher holds up a picture (a building, a bridge, a logo) and the class describes its shape in one voice."
              },
              {
                "seconds": 80,
                "say": "Pairs: one hides a picture behind a book and answers, the other asks and guesses. Swap on the clap."
              },
              {
                "seconds": 70,
                "say": "Faster! New partner. Describe the shape and give one reason before the bell."
              }
            ],
            "steps": [
              "Look at the picture card. Say a WHOLE sentence with a reason: 'I think it's a crescent because it's thin and curved.'",
              "Listen for the clap: it means swap.",
              "In round 3, ask your partner a question back: 'Do you agree?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on."
            ],
            "prompts": [
              "(picture: a stadium roof)",
              "(picture: a spiral staircase)",
              "(picture: the moon)",
              "(picture: a bridge)",
              "(picture: a logo)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear. Here: for 'It's a oval', say 'an oval' with a clear 'an' and let the student echo; for 'It looks like crescent', point to the gap before 'crescent' and wait for 'a'.",
            "teacherNote": "Whole sentences with a reason, never single words: 'It isn't a circle, although it looks round' should come out as one smooth piece. Mix in Unit 16's superlatives every few turns so they stay fast. Listen for the vowel sound in 'an oval' and for the final -s in 'sides'.",
            "tiers": [
              {
                "level": "Support",
                "task": "Point to the frame on the board and say it with a friend.",
                "frames": [
                  "I think it's a ___ because ___.",
                  "It looks like ___."
                ]
              },
              {
                "level": "Core",
                "task": "Describe each picture alone, with a reason, without looking at the board."
              },
              {
                "level": "Stretch",
                "task": "Add a contrast and a follow-up question: 'It looks like a circle, although it is really an oval. What do you think?'",
                "frames": [
                  "It looks like ___, although ___."
                ]
              }
            ]
          }
        },
        {
          "after": "Connect it to my life (SB 169 Think, C)",
          "slide": {
            "kind": "writing",
            "title": "Join two ideas about a shape",
            "routine": "sentence combining",
            "mode": "solo",
            "minutes": 6,
            "steps": [
              "Read the two short sentences. Say the one longer sentence you could make.",
              "Join them with the word in the brackets. You may change the order or a word.",
              "Write the sentence. Read it to your partner.",
              "Then write one more sentence of your own about a shape you know, using although or because."
            ],
            "items": [
              {
                "q": "It is round. It is not a circle. (although)",
                "answer": "Although it is round, it is not a circle."
              },
              {
                "q": "The moon looks like a crescent. It is thin and curved. (because)",
                "answer": "The moon looks like a crescent because it is thin and curved."
              },
              {
                "q": "A triangle has straight sides. A circle has no corners. (but)",
                "answer": "A triangle has straight sides, but a circle has no corners."
              },
              {
                "q": "I saw a spiral on a shell. I was at the beach. (when)",
                "answer": "I saw a spiral on a shell when I was at the beach."
              },
              {
                "q": "The bridge is a long curve. We can see it from our school. (that)",
                "answer": "The bridge that we can see from our school is a long curve."
              }
            ],
            "frames": [
              "Although ___, ___.",
              "___ because ___.",
              "___, but ___.",
              "___ when ___."
            ],
            "checklist": [
              "A capital letter at the start and a full stop at the end",
              "A comma after an 'Although ...' clause",
              "a or an: a crescent, an oval"
            ],
            "sayIt": "Read your longest sentence to your partner, then say it again without looking.",
            "teacherNote": "Combining sentences is the quickest way to longer, more mature writing without new grammar. Accept any correct order. Vietnamese has no a / an, so 'a oval' is common: model the clear 'an' when you read aloud.",
            "tiers": [
              {
                "level": "Support",
                "task": "Do items 1-3 with the frames."
              },
              {
                "level": "Core",
                "task": "Do all five items."
              },
              {
                "level": "Stretch",
                "task": "Do all five, then write two more sentences with although or when about shapes in your city."
              }
            ]
          }
        }
      ]
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u17-l2": {
      "objectives": [
        "I can tell my partner facts about shapes in nature three times, faster each time, with a reason or an example.",
        "I can write a full paragraph about shapes in nature."
      ],
      "drop": [
        "Chant and shape hunt"
      ],
      "trim": {
        "Make a shape collage": 6
      },
      "add": [
        {
          "after": "Our shape chart",
          "slide": {
            "kind": "fluency",
            "title": "Shape chart retell: tell it again",
            "routine": "retell",
            "mode": "pairs",
            "minutes": 9,
            "goal": "Tell the same shape facts three times, with a reason or an example. Each time is shorter, smoother and faster.",
            "chunks": [
              "A triangle has three straight sides, so it is a very strong shape.",
              "A circle has no corners, but it has one curved side that never stops.",
              "A spiral goes round and round, and you can see one on a shell or in a plant.",
              "I see shapes in nature every day, for example on leaves and on shells."
            ],
            "recycle": [
              "The giraffe is the tallest animal I know.",
              "This is the best picture in the room."
            ],
            "rounds": [
              {
                "seconds": 80,
                "say": "Tell your partner what is on our shape chart and give one example from nature. Use the picture cards."
              },
              {
                "seconds": 70,
                "say": "New partner. Tell it again in less time."
              },
              {
                "seconds": 60,
                "say": "New partner. Tell it fast and smooth, without stopping."
              }
            ],
            "steps": [
              "Look at the shape chart. Choose three shapes and tell your partner a fact and an example for each one.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner and tell it again, shorter. Both partners tell it in every round.",
              "The listener gives one short comment at the end, for example 'I didn't know that' or 'I agree because ...'."
            ],
            "prompts": [
              "(picture: triangle)",
              "(picture: circle)",
              "(picture: spiral)",
              "(picture: a leaf in nature)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear. Here: for 'A triangle have three side', hold up a finger at 'has' and at the end of 'sides'; the third-person -s and the plural -s are the two to wait for.",
            "teacherNote": "The same facts three times on purpose: the second and third tellings are faster because the students are not searching for words. The correction minute between round 1 and 2 is where accuracy grows, so do not skip it. Listen for the -s in 'has' and 'sides' and the final sound in 'round'.",
            "tiers": [
              {
                "level": "Support",
                "task": "Point to each picture and say one sentence for it.",
                "frames": [
                  "A ___ has ___ straight sides.",
                  "A ___ has no corners."
                ]
              },
              {
                "level": "Core",
                "task": "Tell three facts, each with a reason or an example, without the frames."
              },
              {
                "level": "Stretch",
                "task": "Compare two shapes and give a reason: 'A square has four straight sides, but a circle has no corners, so a circle rolls.'"
              }
            ]
          }
        },
        {
          "after": "Think: shapes I see every day (SB 170-171 Think)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: has it, ask it, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change each sentence about shapes fast and correctly: ask it, say no, join two ideas, change the time or the person. Then talk about shapes you really see.",
            "chunks": [
              "A triangle has three straight sides and three corners.",
              "Does a circle have any corners? No, it doesn't.",
              "A circle doesn't have any corners, although it looks perfect.",
              "Shells have spirals because they grow round and round.",
              "Last summer I saw a spiral on a shell when I was at the beach.",
              "Some shapes look simple, so a lot of people never notice them."
            ],
            "recycle": [
              "It isn't a circle, although it looks round.",
              "I think it's an oval because it's longer than it is wide."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can (X +, ? T)."
              },
              {
                "seconds": 90,
                "say": "Real talk: ask your partner about shapes they see on the way to school or at home. Answer with a short answer and one more sentence with because or although."
              }
            ],
            "steps": [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = make it negative, + = join it to another idea with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with every ending (-s, -ed, n't) clear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3 find out which shape your partner likes best, and remember the reason to tell the class."
            ],
            "prompts": [
              "A triangle has three sides. (?)",
              "A circle has corners. (X)",
              "A square has four straight sides. (+ so it is easy to draw)",
              "The leaf has a curved edge. (T: last week)",
              "A shell has a spiral. (P: shells)"
            ],
            "feedback": "Prompt, do not tell: for 'A triangle have three sides' hold up a finger at 'has'; for 'Does a circle has corners?' repeat it with a rising voice and let the student fix it; for a missing -s on 'sides' tap your wrist. Say the -s and the n't clearly yourself.",
            "teacherNote": "The facts from the shape chart are the drill, so students hear has / have, does / doesn't have and the plural -s in words they already know. Round 3 makes it real. Grades 6-7 can take the full set, including the past and a change of person. Keep it brisk.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with one shape, with the frames on the board.",
                "frames": [
                  "A ___ has ___ sides.",
                  "Does a ___ have any ___? No, it doesn't."
                ]
              },
              {
                "level": "Core",
                "task": "Use every sign, and join two ideas with because, although or so."
              },
              {
                "level": "Stretch",
                "task": "Add a second clause and a follow-up question: 'A circle doesn't have any corners, although it looks perfect. Is there a perfect circle in nature?'"
              }
            ]
          }
        },
        {
          "after": "Same and different",
          "slide": {
            "kind": "writing",
            "title": "My shapes in nature: plan, write, check",
            "routine": "paragraph",
            "genre": "description",
            "mode": "solo",
            "minutes": 10,
            "steps": [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the example and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, However, For example and In conclusion.",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and tell you one thing they liked.",
              "Teacher: look only at has / have and the plural -s. Put a dot next to a line with a mistake; the student finds it and fixes it."
            ],
            "text": {
              "title": "Model: shapes in nature",
              "text": "Shapes appear everywhere in nature. First, the moon is often a thin crescent, and it looks like a smile in the dark sky. Also, a shell has a beautiful spiral because it grows round and round. However, a leaf is not a circle, although some leaves look quite round. For example, an oak leaf has curved sides and a pointed end. In conclusion, nature is full of shapes, and I can find a new one every day."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "What do you want to say about shapes in nature?"
              },
              {
                "label": "Detail 1: First, ...",
                "prompt": "A shape in the sky or the sea. What is it called, and why does it look like that?"
              },
              {
                "label": "Detail 2: Also, ...",
                "prompt": "A shape on a plant or an animal. What has it got?"
              },
              {
                "label": "Contrast and example: However, ... For example, ...",
                "prompt": "A shape that is different from what people think. Give one example."
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "What do you think about shapes in nature now?"
              }
            ],
            "frames": [
              "___ appear everywhere in nature.",
              "First, ___ has ___ because ___.",
              "Also, ___ has ___.",
              "However, ___ is not ___, although ___.",
              "For example, ___ has ___.",
              "In conclusion, ___."
            ],
            "checklist": [
              "A topic sentence and a closing sentence that match",
              "has / have, and -s on plural things (sides, shells, leaves)",
              "a or an: a crescent, an oval",
              "First, Also, However, For example, In conclusion in order"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again without looking, like a nature guide, in one minute.",
            "teacherNote": "A full paragraph of six to eight sentences, planned in five boxes of notes so the time goes into the writing itself. It uses the facts from the shape chart. Mark only two things (has / have and the plural -s) with a dot on the line; the student finds and fixes the mistake. Vietnamese has no a / an, so model the clear 'an oval' when you read the model aloud. The paragraph can also be the script for the recorded talk 'My shape hunt'.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the frames: one sentence for each box, six sentences in all.",
                "frames": [
                  "First, ___ has ___ because ___.",
                  "In conclusion, ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write the whole paragraph: six or seven sentences with a linking word in each box."
              },
              {
                "level": "Stretch",
                "task": "Write eight sentences and add a contrast with although and a second example: 'For example, a snail shell has a spiral, although a clam shell does not.'"
              }
            ]
          }
        }
      ],
      "talk": {
        "kind": "vlog",
        "title": "My shape hunt",
        "prompt": "Find three shapes at home, at school or on your way to school. Show each one to the camera, say what it is and what it has, and give a reason or an example for each.",
        "length": "90-120 seconds",
        "steps": [
          "Find three shapes you can see: a round clock, a square window, a spiral staircase, a leaf.",
          "Plan one or two sentences for each: what it is, what it has, and where you see it. Add a reason or an example with because or for example.",
          "Practise twice, a little faster each time, like in class. Start with a short introduction and finish with one sentence about which shape you like best and why.",
          "Record it once, showing each shape to the camera as you talk. Watch it back; record again if you stopped for a long time."
        ],
        "maxSeconds": 180,
        "kidSummary": "Describe three shapes, give a reason or an example for each, and keep talking for about two minutes without long stops.",
        "words": [
          "crescent",
          "spiral",
          "oval",
          "straight",
          "curved",
          "nature"
        ],
        "grammar": [
          "It is a ___. It has ___.",
          "A ___ has ___ straight sides.",
          "It looks like ___ because ___."
        ],
        "rubric": [
          {
            "label": "Three shapes",
            "description": "Shows and names three shapes.",
            "weight": 2
          },
          {
            "label": "What it has",
            "description": "Says something about each shape with 'has' or 'is': A triangle has three straight sides.",
            "weight": 2
          },
          {
            "label": "Reasons and examples",
            "description": "Gives a reason with because or an example with for example for at least two shapes.",
            "weight": 3
          },
          {
            "label": "Keeps going",
            "description": "Talks for 90-120 seconds without long stops, in whole sentences, not single words.",
            "weight": 3
          },
          {
            "label": "Clear endings",
            "description": "The -s in 'has' and 'sides' can be heard.",
            "weight": 1
          }
        ],
        "tiers": [
          {
            "level": "Support",
            "who": "Students who need the frames",
            "frames": [
              "I see a ___.",
              "It is a ___. It has ___.",
              "I like it because ___."
            ],
            "tips": [
              "Hold up each shape as you say it."
            ]
          },
          {
            "level": "Core",
            "who": "Most students",
            "frames": [
              "I see a ___. It has ___, so ___.",
              "A ___ has ___ straight sides. For example, ___."
            ],
            "tips": [
              "Give one reason or example for every shape."
            ]
          },
          {
            "level": "Stretch",
            "who": "Students who are ready for more",
            "frames": [
              "A ___ and a ___ are different because ___.",
              "It looks like ___, although ___."
            ],
            "tips": [
              "Compare two of your shapes and end with your opinion."
            ]
          }
        ]
      }
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u17-l3": {
      "objectives": [
        "I can say 'There are a lot of ___' and 'There isn't any ___', and ask 'Are there any ___?', fast and without stopping.",
        "I can write a full paragraph about my collage."
      ],
      "drop": [
        "Can we count it? Mess about"
      ],
      "trim": {
        "Song with actions and Track 3•27 (SB 173 D)": 4,
        "Sort: Can we count it?": 6
      },
      "add": [
        {
          "after": "Practice with a partner (SB 173 F)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: a lot of, any, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change each sentence fast and correctly with a lot of and any: ask it, say no, join two ideas, change the time. Then talk about what is really in your room or school bag.",
            "chunks": [
              "There are a lot of stars in the collage, but there aren't any ovals.",
              "Are there any stars in your collage? Yes, there are. / No, there aren't.",
              "There is a lot of glue on the table because we made a mess.",
              "There isn't any blue paint left, so we are using green.",
              "Is there any glitter? There isn't any, although there is a lot of glue.",
              "There were a lot of tiles yesterday, but there weren't any this morning."
            ],
            "recycle": [
              "A triangle has three straight sides, so it is a strong shape.",
              "I think it's an oval because it's longer than it is wide."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can (X +, ? T)."
              },
              {
                "seconds": 90,
                "say": "Real talk: ask your partner what there is a lot of, and what there isn't any of, in their bedroom, school bag or classroom. Answer with a short answer and one more sentence with because or although."
              }
            ],
            "steps": [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = make it negative, + = join it to another idea with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with every ending (-s, -ed, n't) clear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3 ask about real things: what is in your school bag? Remember one surprising answer to tell the class."
            ],
            "prompts": [
              "There are a lot of stars. (?)",
              "There is a lot of glue. (X)",
              "There are a lot of tiles. (+ but there isn't any glue)",
              "There is a lot of paint. (T: yesterday)",
              "There aren't any ovals. (?)"
            ],
            "feedback": "Prompt, do not tell: for 'There is a lot of stars' ask 'One star or many?' and hold up a finger; for 'Are there some stars?' as a question, point to 'any'; for 'There aren't any paint' ask 'Can we count paint?'. Say the -s on plurals and the n't clearly yourself.",
            "teacherNote": "A drill only helps when the last round is real: students say what there really is in their own things. The questions to keep asking are: can we count it, one or many, is there or are there. Grades 6-7 can take the full set, including a question with any, the past tense and a second clause. Keep it brisk.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X, with the frames on the board.",
                "frames": [
                  "There are a lot of ___.",
                  "There is a lot of ___.",
                  "There aren't any ___. / There isn't any ___."
                ]
              },
              {
                "level": "Core",
                "task": "Use every sign, and join two ideas with but, because or so."
              },
              {
                "level": "Stretch",
                "task": "Add a second clause and a follow-up question: 'There isn't any glitter, although there is a lot of glue. Is there any paint?'"
              }
            ]
          }
        },
        {
          "after": "Transfer: our own collage shop",
          "slide": {
            "kind": "fluency",
            "title": "Collage chain: what is in it?",
            "routine": "question chain",
            "mode": "whole",
            "minutes": 7,
            "goal": "Ask, answer with a reason, turn and ask the next student. Keep the chain going with no stops.",
            "chunks": [
              "What's in your collage, and why did you choose it?",
              "There are a lot of stars because I love the night sky.",
              "There is a lot of glue, but there isn't any glitter.",
              "Are there any ovals? No, there aren't any, although there are a lot of circles.",
              "There isn't any blue paint, so I used green."
            ],
            "recycle": [
              "A triangle has three straight sides, so it is a strong shape.",
              "It isn't a circle, although it looks round."
            ],
            "rounds": [
              {
                "seconds": 90,
                "say": "Slow chain round the circle. Everyone holds a collage card."
              },
              {
                "seconds": 90,
                "say": "Swap cards. Go faster, and add a reason every time."
              },
              {
                "seconds": 80,
                "say": "Swap again. Can the chain go all the way round before the bell?"
              }
            ],
            "steps": [
              "Sit in a circle. Hold your collage card so only you can see it.",
              "Ask the student on your left: 'What's in your collage, and why did you choose it?'",
              "They answer with one 'a lot of' sentence, one 'any' sentence and a reason. Then they turn and ask the next student.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on."
            ],
            "prompts": [
              "What's in your collage?",
              "(card: many stars, no ovals)",
              "(card: lots of glue, no paint)",
              "(card: many beads, no string)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear. Here: 'There is a lot of stars.' Point to 'stars' and ask 'One star or many?', then start 'There ar...' and pause. For 'There aren't any star.', hold up a finger at the end of the word and wait for the -s. For 'There aren't any paint.', ask 'Can we count paint?' and let the student choose isn't.",
            "teacherNote": "The chain makes every student answer many times in a few minutes, which is what makes 'There are / There is a lot of' automatic. Pick the cards so some show things we count (stars, beads) and some show things we cannot count (glue, paint, sand). Listen for the choice of is / are and the final -s on plurals.",
            "tiers": [
              {
                "level": "Support",
                "task": "Say one sentence with the frame on the board.",
                "frames": [
                  "There are a lot of ___.",
                  "There is a lot of ___."
                ]
              },
              {
                "level": "Core",
                "task": "Say two sentences, one with 'a lot of' and one with 'any', and give a reason."
              },
              {
                "level": "Stretch",
                "task": "Add a contrast and a question back: 'There are a lot of stars, but there isn't any glue. Are there any in yours?'"
              }
            ]
          }
        },
        {
          "after": "Collage chain: what is in it?",
          "slide": {
            "kind": "writing",
            "title": "My collage: plan, write, check",
            "routine": "paragraph",
            "genre": "description",
            "mode": "solo",
            "minutes": 10,
            "steps": [
              "Read the model with the teacher. Point to 'a lot of' and 'any', and find the topic sentence, the example and the closing sentence.",
              "Plan: fill the five boxes with a few words each. Can we count it? Tell your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, However, For example and In conclusion.",
              "Check: tick the checklist. Your partner asks 'Can we count it?' about every thing and underlines one linking word.",
              "Teacher: look only at is / are and the -s on the things. Put a dot next to a line with a mistake; the student finds it and fixes it."
            ],
            "text": {
              "title": "Model: my collage",
              "text": "This is my collage about the night sky, and it took me a whole afternoon. There are a lot of stars in it, but there aren't any planets because I ran out of paper. First, I used a lot of glitter, so the stars are shiny. Also, there is a lot of glue on the back because I wanted everything to stay. However, there isn't any blue paint left, although I wanted a darker sky. For example, I used black paper instead. In conclusion, I like my collage because it is different."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "What is your collage about, and how long did it take?"
              },
              {
                "label": "Things I can count",
                "prompt": "What are there a lot of? What aren't there any of, and why?"
              },
              {
                "label": "Stuff I can't count",
                "prompt": "What is there a lot of? What isn't there any of?"
              },
              {
                "label": "However / For example",
                "prompt": "What was a problem, and what did you do instead?"
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "Why do you like your collage?"
              }
            ],
            "frames": [
              "This is my collage about ___.",
              "There are a lot of ___, but there aren't any ___ because ___.",
              "There is a lot of ___, so ___.",
              "However, there isn't any ___, although ___.",
              "For example, I used ___ instead.",
              "In conclusion, I like my collage because ___."
            ],
            "checklist": [
              "are and -s for things we count (stars); is for stuff we cannot count (glue)",
              "any in negative sentences: There aren't any stars. There isn't any paint.",
              "First, Also, However, For example, In conclusion",
              "A topic sentence and a closing sentence that match"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again without looking, like an artist presenting a work, in one minute.",
            "teacherNote": "Students turn the collage sentences they have been joining into a full paragraph of six to eight sentences, planned in five boxes of notes. The boxes sort the things we count from the stuff we cannot count, so the student chooses is or are before writing. Mark only two things (is / are and the -s on plural things) and let the student find the mistake from your dot. Ask 'Can we count it?' when you point.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the frames: one sentence for each box, six sentences in all.",
                "frames": [
                  "There are a lot of ___ in it.",
                  "There isn't any ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write six or seven sentences with a lot of, any and a linking word in each box."
              },
              {
                "level": "Stretch",
                "task": "Write eight sentences and add a sentence with because and another contrast: 'I can make a mosaic because there are a lot of squares, although there aren't any red ones.'"
              }
            ]
          }
        }
      ]
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u17-l4": {
      "objectives": [
        "I can give a compliment about art, answer it, and give a reason, without stopping."
      ],
      "drop": [
        "Art tools: what can I make?",
        "Gallery walk: kind words"
      ],
      "trim": {
        "Draw it, say it, example, non-example": 6
      },
      "add": [
        {
          "after": "What kind of art is it? (SB 174 B)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: good at, need, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change each sentence fast and correctly: ask it, say no, join two ideas, change the time or the person. Then talk about what you are really good at.",
            "chunks": [
              "You are very good at drawing, and I really like your colors.",
              "Are you good at origami? Yes, I am. / No, I'm not.",
              "I'm not good at painting, although I enjoy it.",
              "You need paper and glue to make a collage.",
              "She was good at photography when she was ten, so she took a lot of photographs.",
              "That mosaic is impressive because it has a lot of tiny tiles."
            ],
            "recycle": [
              "There are a lot of stars, but there isn't any glue.",
              "It isn't a circle, although it looks round."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can (X +, ? T)."
              },
              {
                "seconds": 90,
                "say": "Real talk: ask your partner what art, sport or hobby they are good at, and what they need to do it. Answer with a short answer and one more sentence with because or although."
              }
            ],
            "steps": [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = make it negative, + = join it to another idea with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with every ending (-s, -ed, n't) clear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3 find out what your partner is good at and what they need for it, and remember one fact to tell the class."
            ],
            "prompts": [
              "You are good at drawing. (?)",
              "I am good at painting. (X)",
              "You need paper to make a collage. (+ because paper is cheap)",
              "He is good at origami. (T: when he was ten)",
              "I am good at photography. (P: they)"
            ],
            "feedback": "Prompt, do not tell: for 'You are good origami' start 'You are good a...' and pause so the student adds 'at'; for 'Are you good at draw?' point to the -ing gap; for 'You need glue make a collage' hold up a finger at the missing 'to'. Say the 'at', 'to' and n't clearly yourself.",
            "teacherNote": "Students use 'good at' with a noun or -ing, 'need ... to make' and a reason, so compliments sound natural and not like a list. Round 3 is real: they say what they are really good at. Grades 6-7 can take the full set, including the past and a change of person. Listen for 'at' (often dropped) and 'to'.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with 'you' and 'I', with the frames on the board.",
                "frames": [
                  "Are you good at ___?",
                  "Yes, I am. / No, I'm not.",
                  "You need ___ to make ___."
                ]
              },
              {
                "level": "Core",
                "task": "Use every sign, and join two ideas with because, although or so."
              },
              {
                "level": "Stretch",
                "task": "Add a second clause and a follow-up question: 'I'm not good at painting, although I enjoy it. What do you need to paint well?'"
              }
            ]
          }
        },
        {
          "after": "Grammar drill: good at, need, say no",
          "slide": {
            "kind": "writing",
            "title": "Make my art sentence bigger",
            "routine": "expand it",
            "mode": "solo",
            "minutes": 6,
            "steps": [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the words and the idea in the brackets. Say it first.",
              "Write your big sentence. Read it to your partner.",
              "Choose one item and write a second big sentence about your own art or hobby."
            ],
            "items": [
              {
                "q": "I made a mobile. (add: large, colorful, and why: because I wanted to decorate my room)",
                "answer": "I made a large, colorful mobile because I wanted to decorate my room."
              },
              {
                "q": "She took a photograph. (add: of the old bridge, and when: when she visited the city last summer)",
                "answer": "She took a photograph of the old bridge when she visited the city last summer."
              },
              {
                "q": "There is a mosaic. (add: huge, in the school hall, and although: hardly anybody notices it)",
                "answer": "There is a huge mosaic in the school hall, although hardly anybody notices it."
              },
              {
                "q": "My drawing is good. (add: although I am not good at painting)",
                "answer": "My drawing is good, although I am not good at painting."
              },
              {
                "q": "He is good at origami. (add: very, and so: he made gifts for all his friends)",
                "answer": "He is very good at origami, so he made gifts for all his friends."
              }
            ],
            "frames": [
              "I made a ___, ___ ___ because ___.",
              "___, although ___.",
              "___, so ___."
            ],
            "checklist": [
              "A capital letter at the start and a full stop at the end",
              "The adjectives (large, colorful) come before the thing, with a comma between them",
              "A comma before although and so"
            ],
            "sayIt": "Read your longest sentence to your partner, then say it again without looking.",
            "teacherNote": "Expanding one sentence at a time builds sentence length and variety without new grammar. Vietnamese puts adjectives after the noun, so 'a mobile red' is a common slip: model the English order aloud.",
            "tiers": [
              {
                "level": "Support",
                "task": "Do items 1, 2 and 4 with the frames."
              },
              {
                "level": "Core",
                "task": "Do all five items."
              },
              {
                "level": "Stretch",
                "task": "Do all five, then write two big sentences about your own art, each with although or because."
              }
            ]
          }
        },
        {
          "after": "Kind words about art (SB 175 E)",
          "slide": {
            "kind": "fluency",
            "title": "Kind words, three new partners",
            "routine": "task repeat",
            "mode": "pairs",
            "minutes": 9,
            "goal": "Give a compliment about a piece of art and a reason, and answer it, with three partners. In each round both partners talk, and each round is shorter and smoother.",
            "chunks": [
              "That's a really impressive mosaic. I like how you used the colors.",
              "Thank you! I like your drawing, too, because the lines are so clear.",
              "You are very good at origami, and I think the bird looks real.",
              "Thanks! I practiced a lot, but you are good at drawing, too."
            ],
            "recycle": [
              "This is the best picture in the room.",
              "Who is the fastest runner in your class?"
            ],
            "rounds": [
              {
                "seconds": 80,
                "say": "Round 1: Partner A shows an art card and gives a compliment with a reason, then Partner B answers and does the same. Then change partners."
              },
              {
                "seconds": 70,
                "say": "Round 2: New partner. The same task. Partner A first, then Partner B. Say it smoother."
              },
              {
                "seconds": 60,
                "say": "Round 3: New partner. Fast and friendly! Partner A, then Partner B. Look at your partner."
              }
            ],
            "steps": [
              "Hold up an art card (a mosaic, an origami bird, a drawing, a photograph).",
              "Your partner gives a compliment and a reason. You say thank you and give a compliment back.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Partner A does the task, then Partner B does it. When the bell rings, change partners and do the same task again."
            ],
            "prompts": [
              "(card: mosaic)",
              "(card: origami)",
              "(card: drawing)",
              "(card: photograph)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear. Here: for 'You are good origami', start 'You are good a...' and pause so the student adds 'at'; for 'That's a really impressive mosaics', ask 'One or many?' and hold up one finger.",
            "teacherNote": "The same task with a new partner each time is task repetition: the language and the meaning stay the same, so the student can speak faster and smoother. Praise kind faces and kind voices too. Listen for 'good at' (the 'at' is often dropped) and for 'a ... mosaic' with one thing.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the frames on the board with your art card.",
                "frames": [
                  "That's a really nice ___.",
                  "I like ___ because ___.",
                  "Thank you!"
                ]
              },
              {
                "level": "Core",
                "task": "Give a compliment with a reason, and answer with a compliment back."
              },
              {
                "level": "Stretch",
                "task": "Add a question about how it was made: 'You are very good at drawing. How long did it take you?'"
              }
            ]
          }
        }
      ]
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u17-l5": {
      "objectives": [
        "I can talk about my art table for three rounds, faster each time, with a reason.",
        "I can write a full paragraph about the mosaic I want to make."
      ],
      "drop": [
        "Grammar mystery: Mimi and the art cupboard",
        "Stock the art cupboard",
        "Movement break: Count or pour!"
      ],
      "add": [
        {
          "after": "Collage detectives: draw what I say",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: a lot of, any, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change each sentence fast and correctly with a lot of and any: ask it, say no, join two ideas, change the time. Then talk about what is really in your school bag or your home.",
            "chunks": [
              "There are a lot of beads in the cupboard, but there isn't any string.",
              "Is there any glue? Yes, there is a lot of it. / No, there isn't any.",
              "Are there any tiles? There aren't any, so we can't make a mosaic.",
              "There isn't any paint left because we used it all yesterday.",
              "When there is a lot of glue, we make a collage.",
              "There were a lot of crayons last week, but there aren't any now."
            ],
            "recycle": [
              "I'm not good at painting, although I enjoy it.",
              "It looks like a spiral because it goes round and round."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can (X +, ? T)."
              },
              {
                "seconds": 90,
                "say": "Real talk: ask your partner what there is a lot of, and what there isn't any of, in their school bag, kitchen or room. Answer with a short answer and one more sentence with because or although."
              }
            ],
            "steps": [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = make it negative, + = join it to another idea with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with every ending (-s, -ed, n't) clear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3 ask about real things: what is in your bag today? Remember one answer to tell the class."
            ],
            "prompts": [
              "There is a lot of glue. (?)",
              "There are a lot of beads. (X)",
              "There aren't any tiles. (+ so we can't make a mosaic)",
              "There is a lot of paint. (T: last week)",
              "There are a lot of crayons. (?)"
            ],
            "feedback": "Prompt, do not tell: for 'There is a lot of beads' ask 'One bead or many?'; for 'Is there some glue?' as a question, point to 'any'; for 'There aren't any glue' ask 'Can we count glue?'. Say the -s and the n't clearly yourself.",
            "teacherNote": "Same grammar as lesson 3 in new words and a new setting, so the form comes back without feeling like repetition. Round 3 is real: they say what they really have. Grades 6-7 can take the full set. Keep it brisk, and use the art cupboard pictures for the whole-class round.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X, with the frames on the board.",
                "frames": [
                  "Is there any ___? / Are there any ___?",
                  "Yes, there is. / No, there isn't.",
                  "There aren't any ___. / There isn't any ___."
                ]
              },
              {
                "level": "Core",
                "task": "Use every sign, and join two ideas with but, because or so."
              },
              {
                "level": "Stretch",
                "task": "Add a second clause and a follow-up question: 'There isn't any paint left because we used it all yesterday. Who has some?'"
              }
            ]
          }
        },
        {
          "after": "Champion talk: 3 rounds",
          "slide": {
            "kind": "fluency",
            "title": "Art table talk 80-70-60",
            "routine": "4-3-2",
            "mode": "pairs",
            "minutes": 9,
            "goal": "Give the same art table talk to three students, with a reason. Each talk is shorter and smoother: 80, 70 and 60 seconds.",
            "chunks": [
              "On my art table there are a lot of beads, but there isn't any string.",
              "There is a lot of glue, so I can make a mosaic.",
              "There aren't any crescents, although I need some for my moon.",
              "I can make a mosaic with them because the beads are small and shiny."
            ],
            "recycle": [
              "It looks like a crescent because it is thin and curved.",
              "Who is the fastest runner in your class?"
            ],
            "rounds": [
              {
                "seconds": 80,
                "say": "Round 1: Partner A tells the art table talk, then Partner B. The listener counts the things on their fingers. Then change partners."
              },
              {
                "seconds": 70,
                "say": "Round 2: New partner. Partner A tells the same talk in less time, then Partner B."
              },
              {
                "seconds": 60,
                "say": "Round 3: New partner. Fast and smooth! Partner A, then Partner B. The listener asks one question at the end."
              }
            ],
            "steps": [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again in rounds 2 and 3, each time a little shorter."
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear. Here: 'There is a lot of stars.' Point to 'stars' and ask 'One star or many?', then start 'There ar...' and pause. For 'There aren't any star.', hold up a finger at the end of the word and wait for the -s. For 'There aren't any paint.', ask 'Can we count paint?' and let the student choose isn't.",
            "teacherNote": "Same talk, less time, new listener: the 4/3/2 activity scaled for grades 6-7. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The correction minute is what turns the extra speed into accuracy as well. Listen for is / are with the right noun and for the -s on plurals.",
            "tiers": [
              {
                "level": "Support",
                "task": "Say three sentences with the frames.",
                "frames": [
                  "There are a lot of ___.",
                  "There isn't any ___.",
                  "I can make ___ with them."
                ]
              },
              {
                "level": "Core",
                "task": "Say four or five sentences without the board, with a reason."
              },
              {
                "level": "Stretch",
                "task": "Add a plan and a contrast: 'I can make a mosaic because there are a lot of squares, although there aren't any red ones.'"
              }
            ]
          }
        },
        {
          "after": "Say it, then write: my art cupboard",
          "slide": {
            "kind": "writing",
            "title": "My mosaic plan: plan, write, check",
            "routine": "paragraph",
            "genre": "plan",
            "mode": "solo",
            "minutes": 10,
            "steps": [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the example and the closing sentence.",
              "Plan: fill the five boxes with a few words each about your own mosaic. Tell your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, For example, However and In conclusion.",
              "Check: tick the checklist. Your partner underlines one linking word and tells you one thing they liked.",
              "Teacher: look only at 'a lot of' and 'any' (is / are and the -s). Put a dot next to a line with a mistake; the student finds it and fixes it."
            ],
            "text": {
              "title": "Model: my mosaic",
              "text": "Next month, I want to make a mosaic for our classroom wall. First, I need a lot of small tiles, but there aren't any at home. Also, there is a lot of glue in the art cupboard, so I only need to collect the tiles. For example, my friends can cut colored paper into small squares. However, there isn't any space on the wall yet, because the board is full of posters. In conclusion, if we plan well, our mosaic will be colorful and useful."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "What do you want to make, and where will it go?"
              },
              {
                "label": "First: what I need",
                "prompt": "What are there a lot of? What aren't there any of?"
              },
              {
                "label": "Also: what I have",
                "prompt": "What is there a lot of? Who can help you?"
              },
              {
                "label": "For example / However",
                "prompt": "Give an example of how you will solve a problem. What is the problem?"
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "What will your mosaic be like, and why?"
              }
            ],
            "frames": [
              "I want to make a ___ for ___.",
              "First, I need a lot of ___, but there aren't any ___.",
              "Also, there is a lot of ___, so ___.",
              "For example, my friends can ___.",
              "However, there isn't any ___, because ___.",
              "In conclusion, ___."
            ],
            "checklist": [
              "a lot of, any, is or are: can we count it?",
              "-s on plural things (tiles, squares); no -s on stuff (glue, paint)",
              "First, Also, For example, However, In conclusion",
              "A topic sentence and a closing sentence that match"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again without looking, like a project leader, in one minute.",
            "teacherNote": "This paragraph can be the script for the recorded talk 'My art table talk' at home: the student tells it three times, each time a little faster. The common mistakes (is / are, missing -s, 'a lot' without 'of') are the two things you mark. The boxes carry the plan, so no full sentences are written until the Write step. Mark only two things and let the student find the mistake from your dot.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the frames: one sentence for each box, six sentences in all.",
                "frames": [
                  "First, I need a lot of ___.",
                  "In conclusion, ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write six or seven sentences with a lot of, any and a linking word in each box."
              },
              {
                "level": "Stretch",
                "task": "Write eight sentences and add a contrast with although and a reason with because: 'I like this plan because it is cheap, although it takes time.'"
              }
            ]
          }
        }
      ],
      "talk": {
        "kind": "vlog",
        "title": "My art table talk",
        "prompt": "Show your art things, your desk or your school bag at home. Say what there is a lot of, what there isn't any of, and what you can make or why you need more, with a reason.",
        "length": "90-120 seconds",
        "steps": [
          "Put your art things, desk things or school bag things on a table, or draw them: paper, pens, glue, paint ...",
          "Plan: what there is a lot of, what there isn't any of, and what you can make or need. Add a reason with because or an example with for example.",
          "Practise twice, a little faster each time, like in class. Then record once, pointing to each thing as you talk and ending with a plan for what you will do next.",
          "Watch it back; record again if you stopped for a long time."
        ],
        "maxSeconds": 180,
        "kidSummary": "Say what there is a lot of and what there isn't any of, give a reason or an example, and keep talking for about two minutes without long stops.",
        "words": [
          "collage",
          "mosaic",
          "sculpture",
          "pattern",
          "paint",
          "glue"
        ],
        "grammar": [
          "There are a lot of ___.",
          "There is a lot of ___.",
          "There aren't any ___. / There isn't any ___."
        ],
        "rubric": [
          {
            "label": "A lot of",
            "description": "Says what there is a lot of, with is or are to match: There are a lot of beads. There is a lot of glue.",
            "weight": 2
          },
          {
            "label": "Any",
            "description": "Says what there isn't any of: There aren't any stars. There isn't any paint.",
            "weight": 2
          },
          {
            "label": "Reasons and examples",
            "description": "Gives a reason with because or an example with for example, at least twice.",
            "weight": 3
          },
          {
            "label": "Keeps going",
            "description": "Talks for 90-120 seconds without long stops, in whole sentences, not single words.",
            "weight": 3
          },
          {
            "label": "Clear endings",
            "description": "The -s on plural things (stars, beads) can be heard.",
            "weight": 1
          }
        ],
        "tiers": [
          {
            "level": "Support",
            "who": "Students who need the frames",
            "frames": [
              "There are a lot of ___.",
              "There isn't any ___.",
              "I can make ___."
            ],
            "tips": [
              "Point to each thing as you say it."
            ]
          },
          {
            "level": "Core",
            "who": "Most students",
            "frames": [
              "There are a lot of ___, but there aren't any ___.",
              "There is a lot of ___, so I can ___."
            ],
            "tips": [
              "Ask 'Can I count it?' to choose is or are, and give a reason."
            ]
          },
          {
            "level": "Stretch",
            "who": "Students who are ready for more",
            "frames": [
              "I can make ___ because there are a lot of ___, although ___.",
              "I need ___ because there isn't any ___."
            ],
            "tips": [
              "Say what you can make, what you need, and compare two plans."
            ]
          }
        ]
      }
    },
  },
};
