import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 5 "Then and Now".
// The class is Sanrio Grade 6: students in grades 6-7 (ages 11-13) working on a book written
// for younger children, so the Lab raises the language, topics and tasks to their age. Every
// lesson gets a grammar drill ("say it, ask it, say no", then real talk) and a fluency routine
// (chunk sprint, retell, question chain, 4-3-2, task repeat) with longer two-clause chunks,
// plus a writing routine: a planned full paragraph (lessons 2, 4 and 5) or a sentence-level
// routine with harder items (lessons 1 and 3). Unit 4's was / were phrases are mixed back in.
// Lessons 3 and 5 end with a recorded talk of 90-120 seconds that students record on their
// own (Lesson 4 already has its own vlog). Time comes from games, chants and repeats pitched
// at younger children, never from book pages, grammar, checks or homework. All text is original.

export const odL2U5Lab: UnitLab = {
  decks: {
    "od2e-l2-u05-l1": {
      "objectives": [
        "I can compare long ago and now in longer sentences with because and although, fast and without stopping."
      ],
      "drop": [
        "Mime it, say it: freeze and point",
        "What's missing? Then spell it"
      ],
      "trim": {
        "The mystery bag: old and new": 6,
        "Which go together? Why?": 7
      },
      "add": [
        {
          "after": "Which go together? Why?",
          "slide": {
            "kind": "fluency",
            "title": "Long ago, now: sentence sprint",
            "routine": "chunk sprint",
            "mode": "whole",
            "minutes": 6,
            "goal": "Say the whole sentence, fast and smooth, with a reason or a contrast and no stops.",
            "chunks": [
              "Long ago, people sent letters because they had no phones.",
              "Now, we send messages in seconds, although some people still write letters.",
              "My grandfather rode a bike to school because the bus was expensive.",
              "I think the Internet is useful, but I need a break from my phone.",
              "In my city, most people travel by motorbike, so the streets are busy."
            ],
            "recycle": [
              "The ice was hard. Now it is water.",
              "Were the cups open? No, they weren't."
            ],
            "rounds": [
              {
                "seconds": 80,
                "say": "Everyone together: the teacher shows a picture card, the class says the whole sentence with its reason."
              },
              {
                "seconds": 80,
                "say": "Pairs: one shows a card, the other says the sentence and adds an example of their own. Swap when you hear the clap."
              },
              {
                "seconds": 70,
                "say": "New partner. Faster! Say the sentence and give your own opinion with 'I think ... because ...'."
              }
            ],
            "steps": [
              "Look at the picture card. Say a WHOLE sentence with its reason: 'Long ago, people sent letters because they had no phones.'",
              "Listen for the clap: it means change partner.",
              "In round 3, add your own opinion: 'I think ... because ...'.",
              "Teacher: after round 3, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on."
            ],
            "prompts": [
              "(card: letter)",
              "(card: text message)",
              "(card: bicycle)",
              "(card: smartphone)",
              "(card: motorbike)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or tap the board where the -ed is missing. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the student echo it. Say every final -ed, -s and /t/ clearly yourself: students copy what they hear.",
            "teacherNote": "Whole sentences with a reason, never single words: each chunk has two clauses, so the joining word (because, although, so, but) has to come out smoothly. Students aged 11 to 13 enjoy the opinion step in round 3 because it is about their own city and phones. Listen for a dropped final -s in 'letters' and 'messages', and for 'Long ago' with a present verb; say those endings clearly yourself. Unit 4's was / were phrases come back every few cards so they stay fast.",
            "tiers": [
              {
                "level": "Support",
                "task": "Say each sentence with a partner, using the frames on the board.",
                "frames": [
                  "Long ago, people ___ because ___.",
                  "Now, we ___."
                ]
              },
              {
                "level": "Core",
                "task": "Say the sentence alone, without looking at the board, and add one reason."
              },
              {
                "level": "Stretch",
                "task": "Join the two halves and add an opinion: 'Long ago, people sent letters, but now we send e-mails, so news travels faster.'",
                "frames": [
                  "Long ago, ___, but now ___, so ___."
                ]
              }
            ]
          }
        },
        {
          "after": "Long ago, now: sentence sprint",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: say it, ask it, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change the sentence fast and right: ask it, say no, join two ideas, move it to the past or present, then talk about your own life.",
            "chunks": [
              "Long ago, people sent letters because they had no phones.",
              "Did people send messages long ago? No, they didn't. They sent letters.",
              "Now, we send messages in seconds, although some people still write letters.",
              "Last year, my cousin traveled by train, but I went by bus.",
              "We don't wait for the news now. We read it online when it happens."
            ],
            "recycle": [
              "Was the ice hard? Yes, it was.",
              "They weren't at the party."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Chorus: the teacher says a sentence and shows a sign. The class says the new sentence together. Signs: ? = make it a question, X = make it negative, + = join with because / although / so / when, T = change the tense or the time, P = change the person."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and holds up a sign card, B changes it. Swap at the clap. Change the person too (I, you, we, they, he, she) and the time word."
              },
              {
                "seconds": 120,
                "say": "Real talk: use the same forms to ask your partner about your own lives, opinions and experiences. Answer with a full sentence and a reason, then ask a follow-up question."
              }
            ],
            "steps": [
              "Listen to the sentence and look at the sign. Change it, and say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 2, hold up the sign cards for your partner and change the person or the time as well.",
              "In round 3 the drill becomes real: ask about what your partner really does, and remember one answer to tell the class."
            ],
            "prompts": [
              "Long ago, people sent letters. (?)",
              "We send messages now. (T)",
              "My grandfather read the news. (X + because)",
              "I travel by bus. (P: she)",
              "People waited for the news. (+ although)"
            ],
            "feedback": "Prompt, do not tell: for 'Did you watched?' hold up one finger and say 'one past word only'; for a missing -ed, start the sentence and pause with a rising voice; for a missing 'did' in a question, point to the ? sign. Say every -ed, didn't and final -s clearly yourself. In round 3 listen for meaning too: ask a follow-up question and let the student answer it.",
            "teacherNote": "A drill only helps when the last step is real: in round 3 students ask about their own phones, trips and news habits, so the forms carry meaning. This is the first lesson of the unit, so the past simple is used as a chunk ('sent', 'rode', 'traveled') before it is taught in Lesson 3; do not explain the rule yet. Keep it brisk: a drill that drags loses its point.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and T with I and we, with the frames on the board.",
                "frames": [
                  "Did people ___ long ago?",
                  "Now, we ___."
                ]
              },
              {
                "level": "Core",
                "task": "Change every sentence with any sign, and change the person too."
              },
              {
                "level": "Stretch",
                "task": "Use two signs at once and add a follow-up question: 'Did you send letters last year? No, I didn't, because I use messages. Do you?'"
              }
            ]
          }
        },
        {
          "after": "What do you think the text is about? (SB 49 D)",
          "slide": {
            "kind": "writing",
            "title": "Grow my then-and-now sentence",
            "routine": "expand it",
            "mode": "solo",
            "minutes": 6,
            "steps": [
              "Read the short sentence with the teacher.",
              "Make it longer: add the thing in brackets. Use a joining word (because, although, but, so) where it fits.",
              "Write your long sentence. Read it to your partner.",
              "Check that the verb matches the time: long ago = past, now = present."
            ],
            "items": [
              {
                "q": "People sent letters. (add: long ago + a reason with because)",
                "answer": "Long ago, people sent letters because they had no phones."
              },
              {
                "q": "We send messages. (add: a device + although)",
                "answer": "We send messages on our phones, although some people still write letters."
              },
              {
                "q": "My grandfather rode a bike. (add: when + where + why)",
                "answer": "When he was young, my grandfather rode a bike to school because the bus was expensive."
              },
              {
                "q": "The radio reported the news. (add: how often + a contrast with now)",
                "answer": "Long ago, the radio reported the news every evening, but now we read it online all day."
              },
              {
                "q": "Travel is fast. (add: now + an example + a result)",
                "answer": "Now travel is fast; for example, a flight from Hanoi to Seoul takes only a few hours, so people visit more places."
              }
            ],
            "frames": [
              "Long ago, people ___ because ___.",
              "Now, we ___, although ___."
            ],
            "checklist": [
              "A capital letter at the start and a full stop at the end",
              "A joining word that fits (because, although, but, so)",
              "Past verb after long ago, present verb after now",
              "Plurals have their -s (letters, messages)"
            ],
            "sayIt": "Read your longest sentence to your partner, then say it again without looking.",
            "teacherNote": "Expanding one sentence at a time lets students add detail without a blank page, and the joining words prepare the paragraphs of Lessons 2, 4 and 5. Letters, messages and phones carry the plural -s that Vietnamese learners often drop, so point to the -s when you read the answers aloud.",
            "tiers": [
              {
                "level": "Support",
                "task": "Grow three sentences with the frames and the words in brackets.",
                "frames": [
                  "Long ago, people ___ because ___."
                ]
              },
              {
                "level": "Core",
                "task": "Grow all five sentences."
              },
              {
                "level": "Stretch",
                "task": "Write two long sentences of your own about your city, then and now, with although or but."
              }
            ]
          }
        }
      ]
    },
    "od2e-l2-u05-l2": {
      "objectives": [
        "I can retell what changed from long ago to now, with reasons and examples, three times, faster each time.",
        "I can write a paragraph about the news, then and now."
      ],
      "drop": [
        "Chant: Then and Now",
        "Long ago or now? Run and say",
        "Draw and say: long ago and now"
      ],
      "trim": {
        "Our class chart: long ago and now": 8
      },
      "add": [
        {
          "after": "Show me where it says ...",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: then and now, ask it, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change the sentence fast and right: ask it, say no, join it with a reason, move it to another time or person, then talk about your own life.",
            "chunks": [
              "Long ago, people listened to the radio because they had no Internet.",
              "Did people watch the news on a phone long ago? No, they didn't.",
              "People didn't have phones, so they waited a day for the news.",
              "Last night, I watched a video about my city, although I was tired.",
              "Now, my friends and I share the news in seconds, but we don't always check it."
            ],
            "recycle": [
              "The door was open.",
              "They were at the party."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Chorus: the teacher says a sentence and shows a sign. The class says the new sentence together. Signs: ? = make it a question, X = make it negative, + = join with because / although / so / when, T = change the tense or the time, P = change the person."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and holds up a sign card, B changes it. Swap at the clap. Change the person too (I, you, we, they, he, she) and the time word."
              },
              {
                "seconds": 120,
                "say": "Real talk: use the same forms to ask your partner about your own lives, opinions and experiences. Answer with a full sentence and a reason, then ask a follow-up question."
              }
            ],
            "steps": [
              "Listen to the sentence and look at the sign. Change it, and say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 2, hold up the sign cards for your partner and change the person or the time as well.",
              "In round 3 ask your partner about their own news habits, and tell the class one thing you found out."
            ],
            "prompts": [
              "People listened to the radio. (?)",
              "I read the news every morning. (T: last year)",
              "They traveled by ship. (X + because)",
              "My teacher watched the news. (P: we)",
              "Long ago, news was slow. (+ although)"
            ],
            "feedback": "Prompt, do not tell: for 'Did you watched?' hold up one finger and say 'one past word only'; for a missing -ed, start the sentence and pause with a rising voice; for a missing 'did' in a question, point to the ? sign. Say every -ed, didn't and final -s clearly yourself. In round 3 listen for meaning too: ask a follow-up question and let the student answer it.",
            "teacherNote": "The grammar here is the unit's long-ago past (the -ed ending and didn't + plain verb), practiced before it is taught formally in Lesson 3, so treat the forms as chunks. Round 3 asks students about their own news habits, which keeps the drill meaningful. Grades 6 and 7 can take the full set of signs; keep the pace up.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with I and they, with the frames on the board.",
                "frames": [
                  "Did people ___ long ago?",
                  "They didn't ___."
                ]
              },
              {
                "level": "Core",
                "task": "Change every sentence with any sign and change the person too."
              },
              {
                "level": "Stretch",
                "task": "Add a contrast and a follow-up question: 'I didn't read the news yesterday, although my teacher asked us to. Did you?'"
              }
            ]
          }
        },
        {
          "after": "Think boxes: main idea and a detail (SB 50)",
          "slide": {
            "kind": "writing",
            "title": "My news paragraph: plan, write, check",
            "routine": "paragraph",
            "genre": "compare and contrast",
            "mode": "solo",
            "minutes": 10,
            "steps": [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the linking words and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences. Tell your partner one sentence for each box.",
              "Write: turn your notes into one paragraph of six to eight sentences. Start with your topic sentence and use linking words (first, also, however, because, for example, in conclusion).",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and one past verb, and tell you one thing they liked.",
              "Teacher: mark only two targets with a dot (past simple after long ago, and didn't + plain verb). The student finds the mistake and fixes it."
            ],
            "text": {
              "title": "Model paragraph: News",
              "text": "Long ago, people got their news in very different ways. First, they listened to the radio or waited for a newspaper, so they didn't hear about events until a day later. Also, news from other countries could take weeks to arrive because it traveled by ship. Now, we read the news on our phones, and it appears within minutes. For example, I watched a video of a soccer game while it was still happening. However, fast news is not always true, so we must check it. In conclusion, I think today's news is better, although we need to be careful."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "What did people do long ago to get the news? Use the past simple."
              },
              {
                "label": "Detail 1: First, ...",
                "prompt": "One way people got news long ago, and what they didn't have. Say: They didn't ___."
              },
              {
                "label": "Detail 2: Also, ...",
                "prompt": "A second long-ago detail with a reason (because)."
              },
              {
                "label": "Now + example",
                "prompt": "How do we get news now? Give one example (For example, ...) and one problem (However, ...)."
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "Which is better, then or now? Give your opinion with although or because."
              }
            ],
            "frames": [
              "Long ago, people ___ed / got their news ___.",
              "First, they ___ so they didn't ___.",
              "Also, ___ because ___.",
              "Now, we ___. For example, ___.",
              "However, ___.",
              "In conclusion, I think ___, although ___."
            ],
            "checklist": [
              "A topic sentence first and a closing sentence with in conclusion",
              "Past simple for long ago: -ed verbs (listened, traveled) and irregular ones (got)",
              "didn't + plain verb, never didn't + -ed",
              "Linking words: first, also, however, because, for example"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again from your boxes, without looking, in one minute.",
            "teacherNote": "A full paragraph built from the unit's long-ago and now comparison: topic sentence, supporting details with reasons and examples, and a closing opinion. Boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two things (the past after long ago, and didn't + plain verb) with a dot in the margin; the student finds and fixes the mistake. Say every final -ed clearly when you read the model. The retell below feeds the same ideas orally.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the six frames: one sentence for each frame, six sentences in all.",
                "frames": [
                  "Long ago, people ___.",
                  "First, they ___ so they didn't ___.",
                  "Now, we ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write the whole paragraph: six to eight sentences with at least three linking words."
              },
              {
                "level": "Stretch",
                "task": "Add a counter-argument: 'Some people say ___, but I disagree because ___.'"
              }
            ]
          }
        },
        {
          "after": "Our class chart: long ago and now",
          "slide": {
            "kind": "fluency",
            "title": "Retell: long ago and now, three times",
            "routine": "retell",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Tell the same chart three times to three partners. Each time is shorter, smoother and faster (60, 45, then 35 seconds each).",
            "chunks": [
              "Long ago, people sent letters, but now we send e-mails, so news travels much faster.",
              "Long ago, people listened to the radio for news because they had no Internet.",
              "Now, we watch the news on our phones, although we don't always check it.",
              "Travel was slow long ago. Now it is fast, for example a flight takes a few hours."
            ],
            "recycle": [
              "The door was open.",
              "They were at the party."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Round 1: Partner A tells what is on our chart, with a reason or an example for each point, then Partner B tells it. Use the T-chart to help you. Then change partners."
              },
              {
                "seconds": 45,
                "say": "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners."
              },
              {
                "seconds": 35,
                "say": "Round 3: new partner. Partner A tells it fast and adds an opinion, then Partner B. Thumbs up if you didn't stop."
              }
            ],
            "steps": [
              "Look at the class T-chart. Partner A tells: Long ago ... Now ... because ... Then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, change partners. Each round, A talks first, then B.",
              "The listener has a job: count how many reasons or examples you give, on their fingers."
            ],
            "prompts": [
              "(chart: communication)",
              "(chart: news)",
              "(chart: travel)"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or tap the board where the -ed is missing. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the student echo it. Say every final -ed, -s and /t/ clearly yourself: students copy what they hear.",
            "teacherNote": "The same telling three times on purpose: the second and third tellings free students to speak faster because they are not searching for words, and the one-minute fix between rounds 1 and 2 makes them more accurate too, not only faster. Accept short tellings at first, but push for a reason or an example in each part. Listen for 'long ago' + present verb ('Long ago, people send') and prompt with the first word, not the answer.",
            "tiers": [
              {
                "level": "Support",
                "task": "Point to each part of the chart and say one sentence for it.",
                "frames": [
                  "Long ago, ___.",
                  "Now, ___."
                ]
              },
              {
                "level": "Core",
                "task": "Tell all three parts, each with a reason or an example."
              },
              {
                "level": "Stretch",
                "task": "Add your own opinion and a contrast: 'I think now is better because ..., although ...'",
                "frames": [
                  "I think now is better because ___, although ___."
                ]
              }
            ]
          }
        }
      ]
    },
    "od2e-l2-u05-l3": {
      "objectives": [
        "I can say what happened and what didn't happen with the past simple, with reasons, fast.",
        "I can record a talk of about two minutes with reasons and examples."
      ],
      "drop": [
        "Pass the ball: long ago or now?",
        "Yesterday detectives: mime and say"
      ],
      "trim": {
        "Sound sort: /t/, /d/ or /id/": 4
      },
      "add": [
        {
          "after": "What did you do last night? (SB 53 E)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: say it, ask it, say no",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person, then talk about your own life.",
            "chunks": [
              "Last night, I watched a video because I was tired.",
              "Did you watch a video last night? Yes, I did. / No, I didn't.",
              "I didn't watch a video last night because I studied for a test.",
              "Yesterday, my friends played soccer after school, although it rained.",
              "Long ago, people didn't text their friends, so they visited them.",
              "My classmate and I talked about the match, and then we cleaned the room."
            ],
            "recycle": [
              "Was it open? No, it wasn't.",
              "Were they at the party? Yes, they were."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Chorus: the teacher says a sentence and shows a sign. The class says the new sentence together. Signs: ? = make it a question, X = make it negative, + = join with because / although / so / when, T = change the tense or the time, P = change the person."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and holds up a sign card, B changes it. Swap at the clap. Change the person too (I, you, we, they, he, she) and the time word."
              },
              {
                "seconds": 120,
                "say": "Real talk: use the same forms to ask your partner about your own lives, opinions and experiences. Answer with a full sentence and a reason, then ask a follow-up question."
              }
            ],
            "steps": [
              "Listen to the sentence and look at the sign. Change it, and say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 2, hold up the sign cards for your partner and change the person or the time as well.",
              "In round 3 the drill becomes real: ask about what your partner really did last night or last weekend, and remember one answer to tell the class."
            ],
            "prompts": [
              "I listened to music. (?)",
              "She played soccer yesterday. (X + because)",
              "We cleaned the room last night. (T: every day)",
              "They talked about the match. (P: I)",
              "I didn't text my friend. (+ although)"
            ],
            "feedback": "Prompt, do not tell: for 'Did you watched?' hold up one finger and say 'one past word only'; for a missing -ed, start the sentence and pause with a rising voice; for a missing 'did' in a question, point to the ? sign. Say every -ed, didn't and final -s clearly yourself. In round 3 listen for meaning too: ask a follow-up question and let the student answer it.",
            "teacherNote": "This is the lesson's grammar (the past simple with regular verbs: -ed and didn't + plain verb), so the drill is where it becomes automatic. Round 3 has students ask about their real evenings, weekends and friends. Watch for 'Did you played?' and 'I didn't played': the verb after did / didn't stays plain. Grades 6 and 7 can take the full set; push the Stretch tier for contrast and follow-up questions.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with I and you, with the frames on the board.",
                "frames": [
                  "Did you ___ last night?",
                  "No, I didn't. I ___ed."
                ]
              },
              {
                "level": "Core",
                "task": "Change every sentence with any sign and add a reason with because."
              },
              {
                "level": "Stretch",
                "task": "Use a contrast and a follow-up question: 'I didn't watch it, although my friends did. Why did you watch it?'"
              }
            ]
          }
        },
        {
          "after": "Grammar drill: say it, ask it, say no",
          "slide": {
            "kind": "writing",
            "title": "Fix the yesterday sentences",
            "routine": "fix it",
            "mode": "pairs",
            "minutes": 6,
            "steps": [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing -ed, an extra -ed after didn't or did, a missing capital letter or a missing full stop.",
              "Write the sentence the right way. Read it aloud together.",
              "Say why the mistake was wrong in one sentence."
            ],
            "items": [
              {
                "q": "Last weekend my cousin visit us, although he didn't has much time.",
                "answer": "Last weekend my cousin visited us, although he didn't have much time."
              },
              {
                "q": "Did you finished your homework before you watched the match?",
                "answer": "Did you finish your homework before you watched the match?"
              },
              {
                "q": "People didn't traveled far long ago because the roads were dangerous.",
                "answer": "People didn't travel far long ago because the roads were dangerous."
              },
              {
                "q": "yesterday we listen to a podcast and then we talk about it",
                "answer": "Yesterday we listened to a podcast, and then we talked about it."
              },
              {
                "q": "My brother no played games last night, so he finished the project.",
                "answer": "My brother didn't play games last night, so he finished the project."
              }
            ],
            "checklist": [
              "It happened: the verb has -ed (or an irregular past)",
              "After didn't or Did, the verb is plain (no -ed)",
              "A capital letter at the start and a full stop at the end",
              "The joining word (because, although, so, and then) is in the right place"
            ],
            "sayIt": "Read your five fixed sentences aloud to your partner, fast, then explain one mistake.",
            "teacherNote": "Two error types dominate: a missing -ed (Vietnamese verbs do not change for time) and -ed after didn't. Fix item 1 together first and say the final /t/ clearly. A student who can say why 'didn't played' is wrong ('didn't already says it happened') has understood the rule. Each sentence has two clauses on purpose, so students fix the grammar inside the longer sentences they will write in the paragraph lessons.",
            "tiers": [
              {
                "level": "Support",
                "task": "Fix sentences 2, 3 and 5 with the teacher."
              },
              {
                "level": "Core",
                "task": "Fix all five sentences."
              },
              {
                "level": "Stretch",
                "task": "Write two more sentences with a mistake for your partner to fix, each with because or although."
              }
            ]
          }
        },
        {
          "after": "Sound sort: /t/, /d/ or /id/",
          "slide": {
            "kind": "fluency",
            "title": "Question chain: Did you ___ last night?",
            "routine": "question chain",
            "mode": "whole",
            "minutes": 6,
            "goal": "Ask, answer with a reason, turn and ask the next student. Keep the chain going with no stops!",
            "chunks": [
              "Did you watch the match last night? Yes, I did, and it was exciting.",
              "No, I didn't. I studied for a test because it was important.",
              "What did you do after school yesterday, and why?",
              "I didn't play games because I finished my homework first.",
              "Did your friends text you? Yes, they did. We talked about our plans for the weekend."
            ],
            "recycle": [
              "Was it open? No, it wasn't.",
              "Were they at the party? Yes, they were."
            ],
            "rounds": [
              {
                "seconds": 75,
                "say": "Slow chain round the circle. Everyone holds a topic card (sport, homework, friends, technology, family)."
              },
              {
                "seconds": 75,
                "say": "Swap cards. Go faster, and give a reason with every answer."
              },
              {
                "seconds": 60,
                "say": "Swap again. Can the chain go all the way round before the bell?"
              }
            ],
            "steps": [
              "Sit in a circle. Hold your topic card so only you can see it.",
              "Ask the student on your left a question about your topic: 'Did you ___ last night?'",
              "They answer with a reason: 'Yes, I did, because ...' or 'No, I didn't. I ___ed because ...' Then they turn and ask the next student.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on."
            ],
            "prompts": [
              "Did you ___ last night?",
              "What did you do after school, and why?"
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or tap the board where the -ed is missing. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the student echo it. Say every final -ed, -s and /t/ clearly yourself: students copy what they hear.",
            "teacherNote": "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Did you ...?' and 'didn't' automatic. Time the whole circle and tell them; students like beating their own time. Watch for 'Did you played?' and 'I didn't played': the verb after did / didn't stays plain. Prompt by pointing to the board word 'didn't' and holding up one finger for 'one past word'. Push for a reason with every answer.",
            "tiers": [
              {
                "level": "Support",
                "task": "Answer 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board."
              },
              {
                "level": "Core",
                "task": "Ask and answer without looking at the board, with a reason."
              },
              {
                "level": "Stretch",
                "task": "Add a second sentence and a follow-up question: 'No, I didn't play soccer. I watched a movie because it rained. What about you?'"
              }
            ]
          }
        }
      ],
      "talk": {
        "kind": "vlog",
        "title": "What I did and didn't do yesterday",
        "prompt": "Tell us about yesterday: two things you did, one thing you didn't do, and why. Give a reason or an example for each part.",
        "length": "90-120 seconds",
        "steps": [
          "Think of two things you did yesterday and one thing you didn't do. Write one reason or example for each in a few words.",
          "Practice your talk three times alone or to a friend. Each time try to say it a little faster and with fewer stops.",
          "Record it once. Look at the camera and speak clearly; do not read from a script.",
          "Listen to it once. If you hear a missing -ed or a 'didn't + -ed' mistake, record it again."
        ],
        "maxSeconds": 180,
        "kidSummary": "Say what you did with -ed, say what you didn't do with didn't, give a reason or an example for each, and keep talking without long stops.",
        "words": [
          "yesterday",
          "played",
          "cleaned",
          "listened",
          "watched",
          "didn't",
          "because",
          "although"
        ],
        "grammar": [
          "Yesterday I ___ed ___ because ___.",
          "I didn't + plain verb"
        ],
        "rubric": [
          {
            "label": "Did and didn't",
            "description": "Says two things that happened and one that didn't.",
            "weight": 3
          },
          {
            "label": "Past endings",
            "description": "Uses -ed for what happened (played, cleaned) and a plain verb after didn't.",
            "weight": 3
          },
          {
            "label": "Reasons and examples",
            "description": "Gives a reason (because) or an example for each part.",
            "weight": 3
          },
          {
            "label": "Keeps going",
            "description": "Talks for 90 seconds or more without long stops; whole sentences, not single words.",
            "weight": 2
          }
        ],
        "tiers": [
          {
            "level": "Support",
            "who": "Students who need the frames",
            "frames": [
              "Yesterday I ___ed.",
              "I didn't ___ because ___."
            ],
            "tips": [
              "Keep a few notes in front of you."
            ]
          },
          {
            "level": "Core",
            "who": "Most students",
            "frames": [
              "Yesterday I ___ed ___ because ___.",
              "I didn't ___. I ___ed ___ instead."
            ],
            "tips": [
              "Say a time word at the start: yesterday, last night, after school."
            ]
          },
          {
            "level": "Stretch",
            "who": "Students who are ready for more",
            "frames": [
              "I didn't ___, although ___.",
              "For example, ___.",
              "Yesterday was a good day because ___."
            ],
            "tips": [
              "Join two ideas with although or because, and give one example."
            ]
          }
        ]
      }
    },
    "od2e-l2-u05-l4": {
      "objectives": [
        "I can compare travel long ago and now with reasons and examples, three times, faster each time.",
        "I can write a full paragraph about travel, then and now."
      ],
      "drop": [
        "Chant: Wheels, wings and horses",
        "Run and touch: transport",
        "Whisper chain: say it again!"
      ],
      "trim": {
        "Listen, point, say (SB 54 A)": 7,
        "Words in alphabetical order (SB 55 F)": 6
      },
      "add": [
        {
          "after": "Tell your partner: long ago, not now (SB 55 Write)",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: travel then and now",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person, then talk about your own trips.",
            "chunks": [
              "Long ago, people traveled by horse because there were no cars.",
              "Did people travel by airplane long ago? No, they didn't.",
              "I didn't hear you. Would you repeat that, please?",
              "Last summer, my family traveled to the coast, although it rained all week.",
              "Now, we travel by bus and train, so trips are faster and cheaper."
            ],
            "recycle": [
              "I come from Vietnam.",
              "Say that again. / OK. / Got it. Thanks."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Chorus: the teacher says a sentence and shows a sign. The class says the new sentence together. Signs: ? = make it a question, X = make it negative, + = join with because / although / so / when, T = change the tense or the time, P = change the person."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and holds up a sign card, B changes it. Swap at the clap. Change the person too (I, you, we, they, he, she) and the time word."
              },
              {
                "seconds": 120,
                "say": "Real talk: use the same forms to ask your partner about your own lives, opinions and experiences. Answer with a full sentence and a reason, then ask a follow-up question."
              }
            ],
            "steps": [
              "Listen to the sentence and look at the sign. Change it, and say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 2, hold up the sign cards for your partner and change the person or the time as well.",
              "In round 3 the drill becomes real: ask about your partner's own trips and how they travel to school, and remember one answer to tell the class."
            ],
            "prompts": [
              "People traveled by boat. (?)",
              "My family visited the coast last summer. (X + because)",
              "We travel by bus now. (T: long ago)",
              "My cousin traveled by train. (P: we)",
              "They traveled by horse. (+ although)"
            ],
            "feedback": "Prompt, do not tell: for 'Did you watched?' hold up one finger and say 'one past word only'; for a missing -ed, start the sentence and pause with a rising voice; for a missing 'did' in a question, point to the ? sign. Say every -ed, didn't and final -s clearly yourself. In round 3 listen for meaning too: ask a follow-up question and let the student answer it.",
            "teacherNote": "This lesson has no grammar slide, so the drill uses the unit's key structure: the past simple with -ed and didn't + plain verb, with 'Would you repeat that, please?' mixed in as a polite request. Round 3 is about the students' own trips, which is the topic they care about most. Keep it brisk; grades 6 and 7 can take every sign.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with I and they, with the frames on the board.",
                "frames": [
                  "Did people ___ long ago?",
                  "They didn't ___."
                ]
              },
              {
                "level": "Core",
                "task": "Change every sentence with any sign and add a reason."
              },
              {
                "level": "Stretch",
                "task": "Add a contrast and a follow-up question: 'We didn't fly last summer, although my cousins did. Where did you go?'"
              }
            ]
          }
        },
        {
          "after": "Grammar drill: travel then and now",
          "slide": {
            "kind": "fluency",
            "title": "Long-ago talk 3-2-1: three partners",
            "routine": "4-3-2",
            "mode": "pairs",
            "minutes": 8,
            "goal": "Give the same long-ago talk to three partners. Each talk is shorter and smoother (60, 50, then 40 seconds each).",
            "chunks": [
              "Long ago, people traveled by horse and by boat because there were no cars.",
              "They didn't travel by airplane, so a trip was slow and hard.",
              "Now, we travel by bus, car and train, for example from Hanoi to Hue.",
              "I think modern travel is better, although it is not always good for the environment."
            ],
            "recycle": [
              "Would you repeat that, please?",
              "I come from Vietnam."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Round 1: Line A tells the long-ago talk, then Line B tells theirs. The listener counts the reasons and examples on their fingers. Then change partners."
              },
              {
                "seconds": 50,
                "say": "Round 2: new partner. Line A tells the same talk in less time, then Line B. Then change partners."
              },
              {
                "seconds": 40,
                "say": "Round 3: new partner. Fast and smooth! Line A talks, then Line B. The listener says 'Got it. Thanks!' and asks one follow-up question."
              }
            ],
            "steps": [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, Line B moves one step to the left: a new partner.",
              "The listener may say 'Would you repeat that, please?' once, and the speaker says it again."
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or tap the board where the -ed is missing. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the student echo it. Say every final -ed, -s and /t/ clearly yourself: students copy what they hear.",
            "teacherNote": "Same talk, less time, new listener: the 4/3/2 activity scaled for grades 6 and 7. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 is what makes round 2 more accurate. Listen for 'didn't traveled' and 'It slow': be is missing. Push for a reason and an example in the first telling so the later ones have content to compress.",
            "tiers": [
              {
                "level": "Support",
                "task": "Say three sentences with the frames.",
                "frames": [
                  "Long ago, people ___ed.",
                  "They didn't ___, so ___."
                ]
              },
              {
                "level": "Core",
                "task": "Say four or five sentences without the board, with one reason."
              },
              {
                "level": "Stretch",
                "task": "Add an example and an opinion: 'Now we travel by airplane because it is fast. For example, ... I think ..., although ...'",
                "frames": [
                  "Now we ___ because ___.",
                  "I think ___, although ___."
                ]
              }
            ]
          }
        },
        {
          "after": "Write: something people did long ago (SB 55 Write, WB 45)",
          "slide": {
            "kind": "writing",
            "title": "My long-ago travel paragraph: plan, write, check",
            "routine": "paragraph",
            "genre": "compare and contrast",
            "mode": "solo",
            "minutes": 9,
            "steps": [
              "Read the model with the teacher. Find the topic sentence, the details, the linking words and the closing opinion.",
              "Plan: fill the boxes with a few words each, not whole sentences. Tell your partner one sentence for each box.",
              "Write: turn your notes into one paragraph of six to eight sentences. Start with your topic sentence and use linking words (first, also, however, because, for example, in conclusion).",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and one past verb, and tell you one thing they liked.",
              "Teacher: mark only two targets with a dot (didn't + plain verb and the past simple after long ago). The student finds the mistake and fixes it."
            ],
            "text": {
              "title": "Model paragraph: Travel",
              "text": "Travel was very different a hundred years ago. First, most people traveled by horse, by boat or on foot, so a short trip often took a whole day. They didn't have airplanes, and the roads were rough and dangerous. Also, families visited their relatives only a few times a year because the journey was so long. Now, we can fly across the world in hours, for example from Hanoi to Tokyo. However, fast travel is expensive and it is not always good for the environment. In conclusion, I think modern travel is better, although we should use trains more often."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "How was travel different long ago? Use was / were or the past simple."
              },
              {
                "label": "Detail 1: First, ...",
                "prompt": "How did people travel, and why was it slow? (because / so)"
              },
              {
                "label": "Detail 2: They didn't ...",
                "prompt": "One thing they didn't have, and one problem. Say: They didn't ___."
              },
              {
                "label": "Now + example",
                "prompt": "How do we travel now? Give an example (For example, ...) and one problem (However, ...)."
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "Which is better, then or now? Give your opinion with although or because."
              }
            ],
            "frames": [
              "Travel was very different ___.",
              "First, people ___ed by ___, so ___.",
              "They didn't ___, and ___.",
              "Now, we ___, for example ___.",
              "However, ___.",
              "In conclusion, I think ___, although ___."
            ],
            "checklist": [
              "A topic sentence first and a closing sentence with in conclusion",
              "Past simple after long ago: -ed verbs (traveled, visited) and was / were",
              "didn't + plain verb, never didn't + -ed",
              "Linking words: first, also, however, because, for example"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again from your boxes, without looking, in one minute.",
            "teacherNote": "A full paragraph in this unit, planned in five boxes. It is also the script for the recorded talk ('Vlog: how is it different now?'): students who say it three times alone find the talk easy. Mark only two things (didn't + plain verb, the past after long ago) and let the student find the mistake from your dot. The 4-3-2 talk before it gives students the ideas and the reasons orally first.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the six frames: one sentence for each frame.",
                "frames": [
                  "Travel was very different ___.",
                  "First, people ___ed by ___.",
                  "Now, we ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write the whole paragraph: six to eight sentences with at least three linking words."
              },
              {
                "level": "Stretch",
                "task": "Add a counter-argument and a solution: 'Some people think ___, but I disagree because ___.'"
              }
            ]
          }
        }
      ]
    },
    "od2e-l2-u05-l5": {
      "objectives": [
        "I can say what happened and what didn't, long ago and now, with reasons, again and again, without stopping.",
        "I can record a talk of about two minutes with reasons and examples."
      ],
      "drop": [
        "Time machine hop: did or didn't?",
        "Movement break: Max says!"
      ],
      "trim": {
        "Remember it!": 4,
        "Say it, then write: long ago and now": 11
      },
      "add": [
        {
          "after": "Then and now: the information gap",
          "slide": {
            "kind": "fluency",
            "title": "Grammar drill: it happened, it didn't, ask it",
            "routine": "grammar drill",
            "mode": "pairs",
            "minutes": 7,
            "goal": "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person, then talk about your own life.",
            "chunks": [
              "Long ago, Max's grandfather walked to school because there were no buses.",
              "Did he walk to school? Yes, he did. He walked for an hour every day.",
              "He didn't use a phone, so he visited his friends.",
              "Last night, I didn't text my cousin, but I talked to her on a video call.",
              "Did your parents use the Internet when they were young? No, they didn't."
            ],
            "recycle": [
              "The ice was hard.",
              "Were they at the party? No, they weren't."
            ],
            "rounds": [
              {
                "seconds": 60,
                "say": "Chorus: the teacher says a sentence and shows a sign. The class says the new sentence together. Signs: ? = make it a question, X = make it negative, + = join with because / although / so / when, T = change the tense or the time, P = change the person."
              },
              {
                "seconds": 90,
                "say": "Pairs: A says a sentence and holds up a sign card, B changes it. Swap at the clap. Change the person too (I, you, we, they, he, she) and the time word."
              },
              {
                "seconds": 120,
                "say": "Real talk: use the same forms to ask your partner about your own lives, opinions and experiences. Answer with a full sentence and a reason, then ask a follow-up question."
              }
            ],
            "steps": [
              "Listen to the sentence and look at the sign. Change it, and say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 2, hold up the sign cards for your partner and change the person or the time as well.",
              "In round 3 the drill becomes real: ask about your partner's family and own life, and remember one answer to tell the class."
            ],
            "prompts": [
              "Max walked to school. (?)",
              "People listened to the radio. (X + because)",
              "I cleaned my room yesterday. (T: every week)",
              "My grandfather lived in a village. (P: we)",
              "She didn't use a phone. (+ although)"
            ],
            "feedback": "Prompt, do not tell: for 'Did you watched?' hold up one finger and say 'one past word only'; for a missing -ed, start the sentence and pause with a rising voice; for a missing 'did' in a question, point to the ? sign. Say every -ed, didn't and final -s clearly yourself. In round 3 listen for meaning too: ask a follow-up question and let the student answer it.",
            "teacherNote": "This is the unit's whole grammar in one routine: -ed for what happened, didn't + plain verb for what didn't, and Did ... ? for questions, with the rule 'one past word only'. Round 3 asks about students' own lives and families, which makes the forms meaningful. Prompt 'Did he walked?' by pointing to 'Did' and holding up one finger. Grades 6 and 7 can take every sign at speed.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use only ? and X with he and I, with the frames on the board.",
                "frames": [
                  "Did he ___?",
                  "Yes, he did. / No, he didn't."
                ]
              },
              {
                "level": "Core",
                "task": "Change every sentence with any sign, with a reason."
              },
              {
                "level": "Stretch",
                "task": "Use a contrast and a follow-up question: 'He didn't use a phone, although he had a radio. How did your grandparents get the news?'"
              }
            ]
          }
        },
        {
          "after": "Grammar drill: it happened, it didn't, ask it",
          "slide": {
            "kind": "fluency",
            "title": "Same talk, three tries: Did Max?",
            "routine": "task repeat",
            "mode": "pairs",
            "minutes": 8,
            "goal": "Do the same Max question-and-answer task three times. Each time, go faster and smoother (70, 55, then 40 seconds each).",
            "chunks": [
              "Did Max walk to school? Yes, he did. He walked because there were no buses.",
              "Did Max watch TV? No, he didn't. He listened to the radio instead.",
              "Max didn't use a phone, so he visited his friends and talked with them.",
              "Long ago, people didn't text. They talked, although it took more time."
            ],
            "recycle": [
              "The ice was hard.",
              "Were they at the party? No, they weren't."
            ],
            "rounds": [
              {
                "seconds": 70,
                "say": "Try 1: Partner A asks and Partner B answers about Max's long-ago day, with a reason, then change roles. Then change partners."
              },
              {
                "seconds": 55,
                "say": "Try 2: new partner, same questions, less time. A asks, B answers, then change roles. Then change partners."
              },
              {
                "seconds": 40,
                "say": "Try 3: new partner. A asks, B answers, then change roles. Say the answers in one smooth go, then give your own opinion!"
              }
            ],
            "steps": [
              "Use the Max cards from the information gap. Ask: 'Did Max ___?'",
              "Answer with a whole sentence and a reason: 'Yes, he did. He ___ed because ...' or 'No, he didn't. He ___ed instead.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "The listener has a job: tick each answer that uses the right ending and has a reason."
            ],
            "feedback": "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or tap the board where the -ed is missing. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the student echo it. Say every final -ed, -s and /t/ clearly yourself: students copy what they hear.",
            "teacherNote": "Same task, new partner, less time (task repetition): the second and third tries are where the language becomes automatic, because the student no longer plans the sentence. The one-minute fix lifts accuracy, too. Prompt 'Did Max walked?' by pointing to 'Did' and holding up one finger: one past word only. Push for a reason with every answer so the sentences are longer than the book's examples.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the frames on the board.",
                "frames": [
                  "Did Max ___?",
                  "Yes, he did. He ___ed. / No, he didn't."
                ]
              },
              {
                "level": "Core",
                "task": "Ask and answer without looking at the board, with a reason."
              },
              {
                "level": "Stretch",
                "task": "Add the 'now' and an opinion: 'Max walked to school because there were no buses. Now, I take the bus, and I think it is better because ...'"
              }
            ]
          }
        },
        {
          "after": "Say it, then write: long ago and now",
          "slide": {
            "kind": "writing",
            "title": "My long-ago paragraph: plan, write, check",
            "routine": "paragraph",
            "genre": "compare and contrast",
            "mode": "solo",
            "minutes": 10,
            "steps": [
              "Read the model with the teacher. Find the topic sentence, the details, the linking words and the closing opinion.",
              "Plan: fill the boxes with a few words each, not whole sentences. Tell your partner one sentence for each box.",
              "Write: turn your notes into one paragraph of six to eight sentences. Start with your topic sentence and use linking words (first, also, however, because, for example, in conclusion).",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and one past verb, and tell you one thing they liked.",
              "Teacher: mark only two targets with a dot (-ed for what happened and didn't + plain verb). The student finds the mistake and fixes it."
            ],
            "text": {
              "title": "Model paragraph: Long ago and now",
              "text": "Life in a village a hundred years ago was very different from my life today. First, people lived in small houses and walked to the market every morning, so they didn't need a car. Also, they didn't have phones, so they visited their friends to share news. For example, my great-grandmother talked with her neighbors every evening. Now, we message our friends in seconds, although we sometimes forget to talk face to face. However, I don't think life was easier long ago because people worked very hard. In conclusion, both times have good and bad points, but I prefer today."
            },
            "organiser": [
              {
                "label": "Topic sentence",
                "prompt": "How was life long ago different from life today? Use the past simple."
              },
              {
                "label": "Detail 1: First, ...",
                "prompt": "Where or how did people live? What did they do, and why? (because / so)"
              },
              {
                "label": "Detail 2: They didn't ...",
                "prompt": "One or two things they didn't do or have, and an example (For example, ...)."
              },
              {
                "label": "Now + however",
                "prompt": "What do we do now? Give one good point and one problem (However, ...)."
              },
              {
                "label": "Closing: In conclusion, ...",
                "prompt": "Which is better, long ago or now? Give your opinion with although or because."
              }
            ],
            "frames": [
              "Life long ago was very different from ___.",
              "First, people ___ed in ___, so ___.",
              "They didn't ___, so ___. For example, ___.",
              "Now, we ___, although ___.",
              "However, ___.",
              "In conclusion, I think ___ because ___."
            ],
            "checklist": [
              "A topic sentence first and a closing sentence with in conclusion",
              "-ed for what happened, a plain verb after didn't, never both",
              "Linking words: first, also, however, because, for example",
              "A capital letter at the start and a full stop at the end of every sentence"
            ],
            "sayIt": "Read your paragraph to your partner. Then tell it again from your boxes, without looking, in one minute.",
            "teacherNote": "The big step of the unit: a full paragraph that uses both parts of the grammar, -ed and didn't + plain verb, with reasons, an example and a closing opinion. Planning in five boxes with notes means students write from ideas, not from a blank page. This paragraph is the script for the recorded talk 'Long ago and now: my talk'. Mark only two targets with a dot (-ed, and the verb after didn't) and let the student find and fix the mistake.",
            "tiers": [
              {
                "level": "Support",
                "task": "Use the six frames: one sentence for each frame.",
                "frames": [
                  "Long ago, people ___ed.",
                  "They didn't ___.",
                  "Now, we ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write the whole paragraph: six to eight sentences with at least three linking words."
              },
              {
                "level": "Stretch",
                "task": "Add a counter-argument: 'Some people think ___, but I disagree because ___.'"
              }
            ]
          }
        }
      ],
      "talk": {
        "kind": "vlog",
        "title": "Long ago and now: my talk",
        "prompt": "Tell us how one thing was different long ago and now: travel, news or communication. Say what people did and didn't do, then what we do now, and give a reason and an example.",
        "length": "90-120 seconds",
        "steps": [
          "Pick one thing: travel, news or communication. Look at your paragraph from class and write a few notes.",
          "Practice your talk three times alone or to a friend. Each time try to say it a little faster and with fewer stops.",
          "Record it once. Say what people did and didn't do, then what we do now, with a reason and an example.",
          "Listen to it once. If you hear a missing -ed or a 'didn't + -ed' mistake, record it again."
        ],
        "maxSeconds": 180,
        "kidSummary": "Tell what people did and didn't do long ago, then what we do now, give a reason and an example, and keep talking without long stops.",
        "words": [
          "long ago",
          "now",
          "traveled",
          "listened",
          "didn't",
          "Internet",
          "because",
          "although"
        ],
        "grammar": [
          "Long ago, people ___ed.",
          "They didn't + plain verb",
          "Now, we ___."
        ],
        "rubric": [
          {
            "label": "Then and now",
            "description": "Tells what people did long ago and what we do now.",
            "weight": 3
          },
          {
            "label": "Past endings",
            "description": "Uses -ed for what happened and a plain verb after didn't, never both.",
            "weight": 3
          },
          {
            "label": "Reasons and examples",
            "description": "Gives a reason with because or although and at least one example.",
            "weight": 3
          },
          {
            "label": "Keeps going",
            "description": "Talks for 90 seconds or more without long stops; whole sentences, not single words.",
            "weight": 2
          }
        ],
        "tiers": [
          {
            "level": "Support",
            "who": "Students who need the frames",
            "frames": [
              "Long ago, people ___ed.",
              "Now, we ___."
            ],
            "tips": [
              "Keep a few notes in front of you."
            ]
          },
          {
            "level": "Core",
            "who": "Most students",
            "frames": [
              "Long ago, people ___ed. They didn't ___ because ___.",
              "Now, we ___. For example, ___."
            ],
            "tips": [
              "Say one thing people did and one thing they didn't do, with a reason."
            ]
          },
          {
            "level": "Stretch",
            "who": "Students who are ready for more",
            "frames": [
              "Long ago, ___, but now ___.",
              "I think now is better because ___, although ___."
            ],
            "tips": [
              "Say which is better, why, and what the problem is."
            ]
          }
        ]
      }
    },
  },
};
