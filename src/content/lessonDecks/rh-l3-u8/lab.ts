import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 8 "Getting There"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 9-10 and prepare
// for the Hanoi grade-6 entrance exam. Every lesson gets one fluency routine (the
// lesson's grammar as whole sentences, said again and again under gentle time
// pressure, with Unit 7's phrases mixed back in) and one writing routine that also
// practises the exam strand (sentence combining, fix it) and ends in speech. Four
// lessons end with a recorded talk for home. Time comes from warm-ups, games and
// repeats; the book pages, grammar, exam, check and homework slides keep their time.
// All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then speak again use the fixed form. For grammar, make the child fix it themselves (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s, -ed and -t clearly yourself: children copy what they hear. ";

export const rhL3U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u8-l1": {
      objectives: ["I can give advice with should, ought to, had better and If I were you, fast and without stopping."],
      trim: { "Four corners: what gets you to a goal?": 7, "Is it a tool for a goal? (concept formation)": 8 },
      add: [
        {
          after: "The advice clinic",
          slide: {
            kind: "fluency",
            title: "Advice sprint: what should I do?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Hear a problem and give whole-sentence advice at once, fast and smooth.",
            chunks: [
              "You should talk to your teacher about it.",
              "You ought to practise a little every day.",
              "You'd better hurry, or you'll miss the bus.",
              "If I were you, I would make a plan.",
              "What should I do about it?",
            ],
            recycle: ["Luckily, nobody was hurt.", "She was walking home when the rain started.", "He always works extremely carefully."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher reads a problem card, the class gives one whole sentence of advice." },
              { seconds: 60, say: "Pairs: one reads a problem card, the other gives advice. Swap when you hear the clap." },
              { seconds: 45, say: "New partner, faster! Use a different advice phrase each time." },
            ],
            steps: [
              "Read the problem card. Answer with a WHOLE sentence: 'You should ...' or 'If I were you, I would ...'",
              "Use all four ways to advise: should, ought to, had better, If I were you.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'You should to rest') and let the class fix them. Then go on.",
            ],
            prompts: ["I can't sleep.", "I'm nervous about the speaking test.", "I lost my notebook.", "I want to run a 5-kilometer race.", "I never finish my homework."],
            feedback:
              fix +
              "For this unit: after should, ought to and had better the verb has no -s, and only ought takes 'to'. If a child says 'You should to rest', say 'You should ...' and wait, or point to the frame. 'You had better to go' gets a raised finger over the extra word. 'She should goes' is rare: repeat it with rising voice and let the child fix it.",
            teacherNote:
              "Whole sentences only: 'You'd better hurry, or you'll miss the bus' must come out as one piece. Keep the problem cards simple so the children's effort goes into the grammar, not into ideas. Listen for 'ought' without 'to' and 'had better to'. Mix in Unit 7's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Use 'You should ___.' and read from the frame on the board.", frames: ["You should ___.", "If I were you, I would ___."] },
              { level: "Core", task: "Give a different kind of advice each turn without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'You'd better hurry, or you'll miss the bus, because it leaves at six.'" },
            ],
          },
        },
        {
          after: "Exam practice: asking for advice",
          slide: {
            kind: "writing",
            title: "Join the advice",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the short sentences with your partner. Find the joining word.",
              "Join them into one good sentence. Write it.",
              "Check it with the list. Then read it aloud, and say it again without looking.",
            ],
            items: [
              { q: "You'd better hurry. You will miss the bus. (join with: or)", answer: "You'd better hurry, or you will miss the bus." },
              { q: "You should drink water. It is a hot day. (join with: because)", answer: "You should drink water because it is a hot day." },
              { q: "You should practise every day. (start with: If I were you)", answer: "If I were you, I would practise every day." },
              { q: "You ought to stretch. You ought to warm up. (join with: and)", answer: "You ought to stretch and warm up." },
            ],
            frames: ["You'd better ___, or ___.", "You should ___ because ___.", "If I were you, I would ___."],
            checklist: [
              "After should, ought to and had better, the verb is the plain verb (no -s, no -ing)",
              "Ought has 'to'; should and 'd better do not",
              "A comma after 'If I were you' and before 'or'",
            ],
            sayIt: "Read your joined sentences aloud to your partner, then say them again without looking.",
            teacherNote:
              "Sentence combining builds the longer sentences the exam's transformation questions ask for. Do item 1 together first. The most common slip in this group is 'to' after should or had better, so make the checklist the first thing children look at.",
            tiers: [
              { level: "Support", task: "Join items 1 and 2 with the frames." },
              { level: "Core", task: "Join all four items." },
              { level: "Stretch", task: "Write your own two short sentences for a partner to join." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u8-l2": {
      objectives: ["I can tell about something I have achieved, and say when I did it, three times, faster each time."],
      trim: { "Thinking map and reading strategies": 5, "Phonics: suffixes -ant and -ent": 4, "Achievement interviews": 11 },
      add: [
        {
          after: "Achievement interviews",
          slide: {
            kind: "fluency",
            title: "Tell it three times: someone who got there",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about a person who has achieved something, three times, shorter and smoother each time. In every round, Partner A tells it, then Partner B.",
            chunks: [
              "She has already tried very hard, but she hasn't won yet.",
              "She started when she was seven, and she has never stopped.",
              "Have you ever climbed a mountain? Yes, I have.",
              "When did you do it? I did it last summer.",
              "She has learned a lot this year.",
            ],
            recycle: ["You should talk to your teacher about it.", "If I were you, I would make a plan.", "You'd better hurry, or you'll miss the bus."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A tells about the person in the first part of \"Running Shoes\" or about someone you know. Use the key-word cards. Then Partner B tells it. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you did not stop!" },
            ],
            steps: [
              "Put your three key-word cards on your desk: who, what they want, what has happened so far.",
              "Tell the story with the cards. Use 'has / have' for news up to now and the past for 'when'.",
              "The listener has a job: put up a finger each time you hear 'has' or 'have'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'She has went' or 'I have won it last year') and let the class fix them. Then go on to round 2.",
            ],
            prompts: ["(card: who?)", "(card: what does she want?)", "(card: what has happened so far?)"],
            feedback:
              fix +
              "For this unit: 'She has went' - say 'She has ...?' and hold up three fingers for the 3rd form, or point to the frame 'have / has + done'. 'I have won it last year' - point to 'last year' and ask 'Finished time or up to now?' so the child chooses the past. Listen for the -s in 'has' and the -ed in 'learned'; model the final sounds clearly.",
            teacherNote:
              "The same content three times is the point: the second and third tellings are faster because the children are not searching for ideas. Retelling raises fluency, not accuracy on its own, so the one-minute fix between rounds 1 and 2 matters most. Listen for present perfect with a finished time word, and for 'Did you ever climbed'.",
            tiers: [
              { level: "Support", task: "Tell with the frames and point to the cards.", frames: ["She has ___.", "She started when ___."] },
              { level: "Core", task: "Tell all three parts from the cards only." },
              { level: "Stretch", task: "Add a finished time and a tool that helped: 'She did it last year, and her coach helped her.'" },
            ],
          },
        },
        {
          after: "Exam practice: give the correct form",
          slide: {
      "kind": "writing",
      "routine": "paragraph",
      "mode": "solo",
      "minutes": 8,
      "title": "A person who got there: plan, write, check",
      "genre": "description of a person",
      "steps": [
        "Read the model with the teacher. Find the topic sentence, the two details and the closing sentence.",
        "Plan: fill the four boxes with a few words each, not whole sentences.",
        "Write: turn your notes into one paragraph of six or seven sentences. Use has / have for news up to now and the past for a finished time.",
        "Check: tick the checklist. Swap with a partner: they underline one 'has / have' and one finished time word, and tell you one thing they liked.",
        "Teacher: while they write, look only at has / have + the 3rd form and the finished time words. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
      ],
      "text": {
        "title": "Model paragraph: My aunt, the swimmer",
        "text": "My aunt has achieved something very special: she has swum across a big lake. She started swimming when she was fifty, and she has never missed a lesson since then. Last summer she crossed the lake in two hours. She has already won a small medal, but she hasn't won a big race yet. Her next goal is to cross it in ninety minutes, so she trains every morning. I think she is a good example for me, because she never gives up."
      },
      "organiser": [
        {
          "label": "Topic sentence",
          "prompt": "Who is the person, and what have they achieved? (has / have + done)"
        },
        {
          "label": "Detail 1: the start",
          "prompt": "When did they start? What did they do last year or when they were young? (past simple + time)"
        },
        {
          "label": "Detail 2: so far",
          "prompt": "What have they already done? What haven't they done yet? never / already / yet"
        },
        {
          "label": "Closing",
          "prompt": "What is their next goal? Why do you admire them?"
        }
      ],
      "frames": [
        "___ has ___, and she has never ___.",
        "She started ___ when she was ___.",
        "Last ___, she ___. She has already ___, but she hasn't ___ yet.",
        "I think ___ is a good example, because ___."
      ],
      "checklist": [
        "My first sentence says who the person is and what they have achieved",
        "has / have + the 3rd form for news up to now (has swum, not has swam)",
        "A finished time word goes with the past: last summer, when she was fifty",
        "A closing sentence says why I admire the person"
      ],
      "sayIt": "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
      "teacherNote": "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. An entrance-exam paragraph is about 80-100 words, so aim for six or seven sentences. Mark only two targets (has / have + 3rd form, and a finished time word with the past) with a dot on the line; the child finds and fixes it. This paragraph is the script for the recorded talk 'Someone who got there'.",
      "tiers": [
        {
          "level": "Support",
          "task": "Use the four frames: one sentence for each box.",
          "frames": [
            "___ has ___, and she has never ___.",
            "She started ___ when she was ___."
          ]
        },
        {
          "level": "Core",
          "task": "Write the whole paragraph: six or seven sentences."
        },
        {
          "level": "Stretch",
          "task": "Add a sentence with 'since' or 'for' and a sentence about the tool or person who helped: 'Since then, she has trained with a coach.'"
        }
      ]
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Someone who got there",
        prompt: "Tell about a person who has achieved something. Say what they wanted, what has happened so far, and when they did one big thing.",
        length: "60-90 seconds",
        steps: [
          "Choose a person: a family member, a friend or a hero. Write three key words on a card.",
          "Practise three times, a little faster each time. Use 'has / have' for news up to now and the past for 'when'.",
          "Check: did you say the -s in 'has' and the -ed in 'started' and 'finished'?",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell who they are, what they have achieved, and when it happened. Keep talking without long stops.",
        words: ["achieve", "goal", "already", "never", "yet", "so far", "since", "for"],
        grammar: ["Present perfect: has / have + done", "Past simple with a finished time"],
        rubric: [
          { label: "Content", description: "Says who the person is, what they have achieved and when one thing happened.", weight: 3 },
          { label: "Present perfect and past", description: "Uses has / have + done for news up to now and the past with a finished time.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s in has and the -ed in started and finished can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My ___ has ___.", "She started when she was ___.", "She hasn't ___ yet."], tips: ["Look at your card as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ has already ___, and she has never ___.", "She did it in ___ when she was ___."], tips: ["Say one thing up to now and one thing with a time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Since ___, she has ___.", "The tool that helped most was ___."], tips: ["Say which tool or person helped her get there."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u8-l3": {
      objectives: ["I can ask and answer about distance and time (How far? How long does it take?) quickly and clearly."],
      trim: { "Estimate, then check": 12 },
      add: [
        {
          after: "Estimate, then check",
          slide: {
            kind: "fluency",
            title: "Question chain: how far, how long?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going without stops.",
            chunks: [
              "How far is it from Hanoi to Hạ Long?",
              "It's about 160 kilometers.",
              "How long does it take you to get to school?",
              "It takes me twenty minutes to cycle there.",
              "The lake is twice as long as the playground.",
            ],
            recycle: ["Have you ever climbed a mountain? Yes, I have.", "If I were you, I would start early.", "She has already finished the race."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a place card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your place card and the number on it.",
              "Ask the friend on your left a question about the place. They answer with the number on their card and ask the next friend.",
              "The listener has a job: say 'About how long?' or 'About how far?' if you forgot a number or a unit.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'It takes me 20 minutes go') and let the class fix them. Then go on.",
            ],
            prompts: ["How far is it from ___ to ___?", "How long does it take you to ___?", "How long is ___?"],
            feedback:
              fix +
              "For this unit: 'How long does it take to you' - point to the frame and ask 'It takes ... who?' so the child puts 'you' before 'to'. 'It takes me 20 minutes go' - hold up a finger for the missing 'to'. 'twice as far than' - point to 'as ... as'. Model 'kilometers' and 'minutes' with a clear final -s.",
            teacherNote:
              "The chain gives every child many asks and answers in a few minutes, which makes 'How long does it take you to ...?' automatic. Time the whole circle and tell them: children like to beat their own time. Keep the cards realistic: Hanoi to Hạ Long is about 160 kilometers, as in the lesson.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["How far is it from ___ to ___?", "It's about ___ kilometers."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Compare: 'It's twice as far as the park.'" },
            ],
          },
        },
        {
          after: "Exam practice: ask about the words in capitals",
          slide: {
      "kind": "writing",
      "routine": "paragraph",
      "mode": "solo",
      "minutes": 8,
      "title": "My way to school: plan, write, check",
      "genre": "description of a journey",
      "steps": [
        "Read the model with the teacher. Find the topic sentence, the details with numbers and the closing sentence.",
        "Plan: fill the four boxes with a few words and numbers each, not whole sentences.",
        "Write: turn your notes into one paragraph. Use real numbers with units: kilometers, minutes, meters.",
        "Check: tick the checklist. Swap with a partner: they underline one 'It takes ... to' and one 'twice as ... as', and tell you one thing they liked.",
        "Teacher: while they write, look only at 'It takes me ... to + verb' and 'as ... as'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
      ],
      "text": {
        "title": "Model paragraph: How I get to school",
        "text": "My school is about two kilometers from my house, so I go there by bike. It takes me ten minutes to ride to school. It takes my brother twenty minutes to walk there, so he leaves home earlier than I do. On rainy days, my mother drives me, and the trip takes fifteen minutes. The road by the lake is about one kilometer long and very pretty, and riding along it is twice as fast as walking. I like my bike best, because it is quick and I can see the lake every morning."
      },
      "organiser": [
        {
          "label": "Topic sentence",
          "prompt": "How far is your school from your house? How do you go?"
        },
        {
          "label": "Detail 1: how long",
          "prompt": "How long does it take you? How long does it take someone else?"
        },
        {
          "label": "Detail 2: the road",
          "prompt": "How long or wide is a road or place on the way? Compare two ways with 'twice as ... as'."
        },
        {
          "label": "Closing",
          "prompt": "Which way do you like best, and why?"
        }
      ],
      "frames": [
        "My school is about ___ from my house, so I ___.",
        "It takes me ___ to ___.",
        "___ is about ___ long. ___ is twice as ___ as ___.",
        "I like ___ best, because ___."
      ],
      "checklist": [
        "My first sentence says the distance and how I go",
        "It takes me + time + TO + the plain verb",
        "twice as ... AS (not than)",
        "Numbers have units, with the -s in kilometers and minutes"
      ],
      "sayIt": "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
      "teacherNote": "Plan, write, check: the boxes take words and numbers, so the time goes into the paragraph. Familiar topics such as the way to school appear in entrance-exam paragraphs of about 80-100 words. Mark only two targets ('It takes me ... to + verb' and 'as ... as') with a dot on the line; the child finds and fixes the mistake. Keep the numbers real: it is fine to estimate with 'about'.",
      "tiers": [
        {
          "level": "Support",
          "task": "Use the four frames: one sentence for each box.",
          "frames": [
            "My school is about ___ from my house, so I ___.",
            "It takes me ___ to ___."
          ]
        },
        {
          "level": "Core",
          "task": "Write the whole paragraph: six or seven sentences."
        },
        {
          "level": "Stretch",
          "task": "Add a sentence about how long it took you last year, and one with 'half as ... as': 'Last year it took me twenty minutes to get there.'"
        }
      ]
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u8-l4": {
      objectives: ["I can say why I do things with to, in order to and so that, in a talk that gets smoother each time."],
      trim: {
        "Word work: word categories": 3,
        "Read: a myth and a folk tale": 14,
        "Compare settings and book grammar: past tense": 4,
        "Write: my goal toolkit": 12,
      },
      add: [
        {
          after: "Generalize: what tools help us get there?",
          slide: {
            kind: "fluency",
            title: "4-3-2: my goal toolkit",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same talk to three partners. Each time you have less time, and you say it faster and smoother. In every round, Partner A talks, then Partner B.",
            chunks: [
              "I made a plan in order to stay on track.",
              "I write it down so that I can remember it.",
              "I go to bed early to feel fresh for school.",
              "I practise every day in order not to forget.",
              "By the time the test came, I had practised a lot.",
            ],
            recycle: ["If I were you, I would make a plan.", "How long does it take you to get there?", "She has already tried very hard."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A talks about a goal and the tools that help, then Partner B talks. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner. Partner A gives the same talk again, faster, then Partner B. Keep going!" },
            ],
            steps: [
              "Choose one goal and two tools. Write three key words only.",
              "Talk without stopping. The listener only listens and then says one thing they liked.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'in order to not forget' or 'so that pass') and let the class fix them. Then go on to round 2 with the fixed forms.",
              "Say the same talk each round: do not change the topic, change the speed.",
            ],
            prompts: ["My goal is ___.", "The tools that help me are ___."],
            feedback:
              fix +
              "For this unit: 'I studied for pass' - say 'I studied to ...' and pause, or point to the frame 'to + verb'. 'so that pass the test' - hold up a finger for the missing person: 'so that ... who?' 'in order to not' - repeat with rising voice, then show 'in order not to'. Say the final -ed in 'studied' and 'practised' clearly.",
            teacherNote:
              "4-3-2 builds fluency because the content is the same each time; the shrinking time pushes speed. It does not build accuracy by itself, so the minute for correction after round 1 is the most important minute. Listen for purpose phrases and for 'so that' with a person and 'can / could'.",
            tiers: [
              { level: "Support", task: "Use the frames and the three key words.", frames: ["I ___ to ___.", "I ___ so that I can ___."] },
              { level: "Core", task: "Talk from key words only." },
              { level: "Stretch", task: "Add 'in order not to' and a sentence with 'By the time' and 'had'." },
            ],
          },
        },
        {
          after: "Exam practice: rewrite with purpose",
          slide: {
            kind: "writing",
            title: "Fix the purpose sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. There is one mistake in each.",
              "Find it. Use the checklist and the frames.",
              "Write the sentence correctly. Say it aloud together, then say it again without looking.",
            ],
            items: [
              { q: "I went to the library for borrow a book.", answer: "I went to the library to borrow a book." },
              { q: "She studies hard so that pass the exam.", answer: "She studies hard so that she can pass the exam." },
              { q: "He left early in order to not miss the bus.", answer: "He left early in order not to miss the bus." },
              { q: "We bring a map for we don't get lost.", answer: "We bring a map so that we don't get lost." },
            ],
            frames: ["I ___ to ___.", "I ___ in order to ___.", "I ___ so that I can ___."],
            checklist: [
              "to / in order to + the plain verb (no 'for')",
              "so that + a person (subject) + can / could / will",
              "The negative is 'in order not to'",
            ],
            sayIt: "Read your fixed sentences aloud, then say them again without looking.",
            teacherNote:
              "These are common learner errors; Vietnamese children often use 'for' where English needs 'to'. Fix item 1 together first. Keep the explanation short: one rule at a time.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2." },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Write two sentences with a mistake for a partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My goal toolkit: my recorded talk",
        prompt: "Tell us about one goal you have. Say what tools help you reach it and why you use each one.",
        length: "60-90 seconds",
        steps: [
          "Choose one goal and two tools. Write three key words on a card.",
          "Practise three times. Each time, a little faster and smoother.",
          "Check: did you use 'to', 'in order to' or 'so that' to say why?",
          "Record it once. Keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your goal and why each tool helps. Keep talking without long stops.",
        words: ["goal", "plan", "tool", "practise", "remember", "in order to", "so that"],
        grammar: ["to, in order to, so that"],
        rubric: [
          { label: "Content", description: "Says one goal and at least two tools, with a reason for each.", weight: 3 },
          { label: "Purpose phrases", description: "Uses to, in order to or so that correctly to give reasons.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s and -ed endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My goal is ___.", "I ___ to ___.", "I ___ so that I can ___."], tips: ["Look at your card."] },
          { level: "Core", who: "Most children", frames: ["I made a plan in order to ___.", "I write it down so that I can ___."], tips: ["Give a reason for every tool."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I try not to ___ in order not to ___.", "By the time ___, I had already ___."], tips: ["Add a sentence about what you had already done before a test."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u8-l5": {
      objectives: ["I can talk about plans and arrangements with will, going to and I'm meeting, and keep going."],
      add: [
        {
          after: "Diary clash: find a time to train",
          slide: {
            kind: "fluency",
            title: "Diary clash again: new partner, new diary",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same task again with a new partner. Say the future phrases without stopping to build them. In every round, both partners find a time together.",
            chunks: [
              "Are you free on Saturday?",
              "Sorry, I'm meeting my cousin on Saturday morning.",
              "How about Sunday? OK, I'll bring the water.",
              "We're going to train on Sunday and Monday.",
              "When we finish, we'll have lunch.",
            ],
            recycle: ["It takes me twenty minutes to cycle there.", "You'd better start early, or you'll be late.", "She has already run twice this week."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A asks and Partner B answers, then change roles (Partner B asks, Partner A answers). Use your diary card and find a time to train. Then change partners." },
              { seconds: 50, say: "Round 2: new partner, new diary. Partner A asks first, then Partner B. The same task, faster. Then change partners." },
              { seconds: 35, say: "Round 3: new partner again. Partner A asks first, then Partner B. Find a time fast if you can!" },
            ],
            steps: [
              "Look at your diary card: some days are full, some are free.",
              "Use 'I'm ___ing' for fixed plans, 'we're going to' for plans, and 'I'll' for decisions now.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'When I will get home' or 'I'm going to visiting') and let the class fix them. Then go on.",
              "In round 3, count how many days you tried before you found a time.",
            ],
            prompts: ["(diary card: Saturday - football)", "(diary card: Sunday - free)", "(diary card: Monday - dentist)"],
            feedback:
              fix +
              "For this unit: 'When I will get home, I'll call you' - say 'When I ...?' and point to the present form in the time clause. 'I'm going to visiting' - hold up a finger for the extra '-ing' and let the child say the plain verb. 'Look at the sky! It will rain' - point to the sky and ask 'Plan or sign?' so the child chooses going to. Say the final -ing and -s clearly.",
            teacherNote:
              "Repeating the same task with a small change (Bygate) makes the language easier to find each time. Listen for the three future forms and for will after 'when'. Do not repeat it more than three times: space it with the writing routine and tomorrow's retrieval sprint.",
            tiers: [
              { level: "Support", task: "Use the frames on the board with your diary card.", frames: ["Are you free on ___?", "Sorry, I'm ___ing on ___.", "How about ___?"] },
              { level: "Core", task: "Speak without looking at the frames." },
              { level: "Stretch", task: "Add a time clause: 'When we finish, we'll ___.'" },
            ],
          },
        },
        {
          after: "Exam practice: which future?",
          slide: {
            kind: "writing",
            title: "Model: a letter to my future self",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the future forms: will, going to and the present continuous.",
              "Find where after 'when' or 'before' the verb is in the present.",
              "Write four sentences for your own letter. Use the frames.",
              "Read your letter aloud, then say it again without looking.",
            ],
            text: {
              title: "Dear me in 2028",
              text: "Dear me in 2028, I'm writing this on a rainy Monday. Next year I'm going to join a new club, and I think you will still love music. When you read this letter, you will probably be in a new school! Before I close the box, I'll write one promise: I'm going to keep working hard every week. Write back soon!",
            },
            frames: ["Next year I'm going to ___.", "I think you will ___.", "When you read this, you will ___.", "Before I ___, I'll ___."],
            checklist: [
              "going to for plans, will for predictions and promises",
              "After when and before: the present (no will)",
              "going to + the plain verb (no -ing)",
            ],
            sayIt: "Read your letter aloud to a partner, then say it again without looking.",
            teacherNote:
              "The model is read first so children notice the future forms before they write. Keep it to four sentences: the full letter is the main writing task of this lesson.",
            tiers: [
              { level: "Support", task: "Use the frames to write four sentences." },
              { level: "Core", task: "Write four sentences with all three future forms." },
              { level: "Stretch", task: "Add a sentence with 'as soon as' and the present." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u8-l6": {
      objectives: ["I can say what I wish and what I would do, and use unless, fast and clearly."],
      trim: { "Hot seat: Erden Eruç": 10 },
      add: [
        {
          after: "Hot seat: Erden Eruç",
          slide: {
            kind: "fluency",
            title: "Wish sprint: I wish, if I, unless",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "See a card and say the whole wish or condition sentence, fast and smooth.",
            chunks: [
              "I wish I had more time.",
              "I wish I could run faster.",
              "If I lived in Sa Pa, I would climb every week.",
              "Unless you train, you will lose.",
              "Unless we leave now, we won't reach the top.",
            ],
            recycle: ["We're going to train on Saturday.", "When we finish, we'll have lunch.", "It takes me ten minutes to walk there."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a card and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap at the clap." },
              { seconds: 45, say: "New partner, faster! Try a different sentence for each card." },
            ],
            steps: [
              "Look at the card: no bike, can't swim, lives far, does not practise.",
              "Say a WHOLE sentence: 'I wish ...' or 'Unless ...' or 'If ..., I would ...'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I wish I can fly' or 'Unless you don't train') and let the class fix them. Then go on.",
              "In round 3, count your sentences on your fingers.",
            ],
            prompts: ["(card: no bike)", "(card: can't swim)", "(card: lives far from school)", "(card: does not practise)", "(card: no time)"],
            feedback:
              fix +
              "For this unit: after wish the verb goes back one step in time: 'I wish I have a dog' - say 'I wish I ...' and hold up a finger for the past form; 'I wish I can fly' - point to the frame 'could'. After unless there is no 'don't': 'Unless you don't train' - repeat with rising voice and let the child say 'Unless you train'. Say 'I wish I were' clearly as a whole chunk.",
            teacherNote:
              "Wish and unless are the two forms this lesson makes children say again and again. Keep the cards simple. Listen for 'I wish I can', 'I wish I have' and 'Unless ... don't'. Mix in the future forms from the last lesson so they do not fade.",
            tiers: [
              { level: "Support", task: "Say the sentences with the frames on the board.", frames: ["I wish I ___.", "Unless you ___, you will ___."] },
              { level: "Core", task: "Say a different sentence for each card without looking." },
              { level: "Stretch", task: "Add a second sentence: 'I wish I could swim. If I could swim, I would join the club.'" },
            ],
          },
        },
        {
          after: "Exam practice: wish, if and unless",
          slide: {
      "kind": "writing",
      "routine": "paragraph",
      "mode": "solo",
      "minutes": 8,
      "title": "A wish and a plan: plan, write, check",
      "genre": "personal opinion",
      "steps": [
        "Read the model with the teacher. Find the wish, the reason, the plan with 'if' and 'unless', and the closing sentence.",
        "Plan: fill the four boxes with a few words each, not whole sentences.",
        "Write: turn your notes into one paragraph. Use 'I wish' with the past, one 'If I were ...' and one 'unless'.",
        "Check: tick the checklist. Swap with a partner: they underline your wish sentence and your 'unless' sentence, and tell you one thing they liked.",
        "Teacher: while they write, look only at wish + the past (could, were, had) and 'unless' with the present. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
      ],
      "text": {
        "title": "Model paragraph: I wish I could swim faster",
        "text": "I wish I could swim faster, but I am not a strong swimmer yet. I think swimming is the best sport, because it keeps the whole body healthy. If I were a better swimmer, I would join the school team. Unless I practise more, I will not get better, so I go to the pool twice a week. I also wish the pool were closer to my house. Still, I believe that a clear goal and a little practice every week can take anyone far."
      },
      "organiser": [
        {
          "label": "Topic sentence",
          "prompt": "What do you wish you could do? (I wish I could ... / I wish I had ...)"
        },
        {
          "label": "Detail 1: why",
          "prompt": "Why does it matter to you? What do you think about it?"
        },
        {
          "label": "Detail 2: the plan",
          "prompt": "What would you do if you were better? What must you do, or you will not improve? (If I were ... / unless)"
        },
        {
          "label": "Closing",
          "prompt": "What do you believe about goals and practice?"
        }
      ],
      "frames": [
        "I wish I could ___, but ___.",
        "I think ___, because ___.",
        "If I were ___, I would ___. Unless I ___, I will not ___.",
        "Still, I believe that ___."
      ],
      "checklist": [
        "I wish + the past (could, had, were), not the present",
        "If I were ... I would ... (were, not was)",
        "unless + the present, then will (no 'don't' after unless)",
        "A closing sentence says what I believe"
      ],
      "sayIt": "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
      "teacherNote": "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. An opinion paragraph of about 80-100 words is a familiar entrance-exam format. Mark only two targets (wish + the past, and unless + the present) with a dot on the line; the child finds and fixes it. Wish with the past tense is hard because Vietnamese does not change the verb: give time and point at the checklist. Choose a different topic from the book's own writing activity on tools, so the work is not done twice.",
      "tiers": [
        {
          "level": "Support",
          "task": "Use the four frames: one sentence for each box.",
          "frames": [
            "I wish I could ___, but ___.",
            "If I were ___, I would ___."
          ]
        },
        {
          "level": "Core",
          "task": "Write the whole paragraph: six or seven sentences."
        },
        {
          "level": "Stretch",
          "task": "Add a sentence with 'as long as': 'I will improve as long as I practise.'"
        }
      ]
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My wishes and what I would do",
        prompt: "Tell us two things you wish for. Say what you would do if they came true. Then say one thing you must do, using unless.",
        length: "60-90 seconds",
        steps: [
          "Write two wishes and one 'unless' sentence on a card.",
          "Practise three times, a little faster each time.",
          "Check: after 'wish', did you use had, were or could? After 'unless', is there no 'don't'?",
          "Record it once. Keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Say two wishes, what you would do, and one sentence with unless. Keep talking without long stops.",
        words: ["wish", "would", "unless", "goal", "tool", "train"],
        grammar: ["I wish + past", "If + past, would", "Unless + present, will"],
        rubric: [
          { label: "Content", description: "Gives two wishes, what they would do, and one sentence with unless.", weight: 3 },
          { label: "Wish, if and unless", description: "Uses wish + past, if + would and unless + present correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s and -ed endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I wish I ___.", "If I ___, I would ___.", "Unless I ___, I won't ___."], tips: ["Look at your card."] },
          { level: "Core", who: "Most children", frames: ["I wish I could ___. If I could, I would ___.", "Unless I practise, I won't ___."], tips: ["Say a wish and then what you would do."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I wish the ___ were ___, because ___.", "Unless we ___, we won't ___."], tips: ["Give a reason for a wish."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u8-l7": {
      objectives: ["I can tell my story three times, smoother each time, and write speech with the right punctuation."],
      trim: {
        "Read: \"Climbing Toward Her Goal\"": 10,
        "Compare causes and book grammar: will and going to": 4,
        "Plan the story (writing project)": 10,
        "Tell it before you write it": 7,
      },
      add: [
        {
          after: "Tell it before you write it",
          slide: {
            kind: "fluency",
            title: "Tell it again: my story, shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell your planned story to three partners. Each telling is shorter and smoother. In every round, Partner A tells the story, then Partner B.",
            chunks: [
              "This is a story about a girl who wanted to reach the top.",
              "But there was a problem: the path was icy.",
              "Just when she was ready to give up, she heard a voice.",
              "By the time she reached the top, the sun had already risen.",
              "In the end, she smiled and said, \"I did it!\"",
            ],
            recycle: ["While we were walking up, it started to snow.", "Suddenly, the ground started to shake.", "Holding the map, she chose the left path."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A tells the story plan with the key-word cards, then Partner B tells theirs. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Keep going!" },
            ],
            steps: [
              "Look at your story plan and your key-word cards: who, goal, problem, end.",
              "Tell the story with 'Just when ...' and 'By the time ...'.",
              "The listener has a job: ask one follow-up question at the end ('What happened next?').",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'By the time she arrived, he already left') and let the class fix them. Then go on.",
            ],
            prompts: ["(card: who)", "(card: goal)", "(card: problem)", "(card: end)"],
            feedback:
              fix +
              "For this unit: 'By the time she arrived, he already left' - say 'he had ...?' and hold up a finger for 'had', or point to the earlier event on the timeline. Do not stop the telling for written-only mistakes such as speech punctuation. Say the -ed in 'wanted', 'arrived' and 'reached' clearly.",
            teacherNote:
              "Telling the story aloud first makes the draft easier to write. The three tellings give the same language many repetitions under time pressure, which is what builds automaticity; the one-minute fix is what adds accuracy. Do not correct ideas, only the language.",
            tiers: [
              { level: "Support", task: "Tell the story with the frames.", frames: ["This is a story about ___.", "But there was a problem: ___.", "In the end, ___."] },
              { level: "Core", task: "Tell the story from key words only." },
              { level: "Stretch", task: "Add a speech sentence and an -ing opening: 'Holding the map, she said, \"Follow me!\"'" },
            ],
          },
        },
        {
          after: "Exam practice: word formation",
          slide: {
            kind: "writing",
            title: "Fix the story sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. There is one mistake in each.",
              "Find it: a comma, speech marks, a spelling or a wrong opening.",
              "Write the sentence correctly. Read it aloud, then say it again without looking.",
            ],
            items: [
              { q: "\"I'm tired\" she said.", answer: "\"I'm tired,\" she said." },
              { q: "Running to school, the rain started.", answer: "Running to school, I felt the rain start." },
              { q: "It was an importent race.", answer: "It was an important race." },
              { q: "She said \"We are nearly there!\"", answer: "She said, \"We are nearly there!\"" },
            ],
            frames: ["\"___,\" said ___.", "___ said, \"___.\"", "Holding ___, she ___."],
            checklist: [
              "A comma before the speech marks, or inside them when the speech comes first",
              "An -ing opening and the main verb have the same person doing both",
              "-ant / -ent words are spelled correctly (important, different)",
            ],
            sayIt: "Read your fixed sentences aloud, then say them again without looking.",
            teacherNote:
              "These mistakes come from the exam's error-correction format and from children's drafts. Fix item 1 together first. Keep to two or three error types: speech punctuation, the -ing opening and a spelling.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3." },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Write two sentences with speech for a partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u8-l8": {
      objectives: ["I can tell my journey in the past, present and future in one talk, three times, faster each time."],
      trim: {
        "Mock review: explain the answers": 8,
        "Video case: never give up": 8,
        "Unit wrap-up: fill the toolbox": 4,
        "Transfer: test our big idea": 9,
      },
      add: [
        {
          after: "Transfer: test our big idea",
          slide: {
            kind: "fluency",
            title: "4-3-2: my journey so far",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about your English journey: what you have done, what you did, and what you will do. Three partners, less time each time. In every round, Partner A talks, then Partner B.",
            chunks: [
              "I have learned a lot of new words this year.",
              "Last month I took a big test.",
              "While I was practising, my brother was playing music.",
              "By the time the test started, I had already checked my notes.",
              "Next year I'm going to join a new club, and when I get there, I'll make friends.",
            ],
            recycle: ["If I were you, I would make a plan.", "I wish I could run faster.", "Unless I practise, I won't get better."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A tells about their journey with the three key words (so far, last, next), then Partner B tells theirs. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner. Partner A talks faster, then Partner B. Keep going!" },
            ],
            steps: [
              "Write three key words: one for the past, one for now, one for next year.",
              "Talk without stopping. The listener says one thing they liked.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I have seen her yesterday' or 'When I will finish') and let the class fix them. Then go on to round 2.",
              "Say the same talk each round: change the speed, not the topic.",
            ],
            prompts: ["So far ...", "Last ...", "Next ..."],
            feedback:
              fix +
              "For this unit: 'I have seen her yesterday' - point to 'yesterday' and ask 'Finished or up to now?' so the child chooses the past. 'When I will finish' - say 'When I ...?' and point to the present. 'She is knowing' - repeat with rising voice. Say the final -ed and -s clearly.",
            teacherNote:
              "This is the last long speaking task of the level. It mixes past, present perfect and future in one talk, which suits an end-of-level review. The same content three times with less time builds fluency; the one-minute fix between rounds 1 and 2 adds accuracy. Notice who is still stopping to build tenses and plan a few extra sprints for them.",
            tiers: [
              { level: "Support", task: "Use the frames and three key words.", frames: ["So far, I have ___.", "Last ___, I ___.", "Next year, I'm going to ___."] },
              { level: "Core", task: "Talk from key words only." },
              { level: "Stretch", task: "Add a sentence with 'By the time' and a wish." },
            ],
          },
        },
        {
          after: "Exam practice: a tense cloze",
          slide: {
      "kind": "writing",
      "routine": "paragraph",
      "mode": "solo",
      "minutes": 8,
      "title": "My English journey: plan, write, check",
      "genre": "personal recount",
      "steps": [
        "Read the model with the teacher. Find the three times: the past, so far, and the future.",
        "Plan: fill the four boxes with a few words each, not whole sentences.",
        "Write: turn your notes into one paragraph. Use the past for a finished time, has / have for 'so far', and going to or will for the future.",
        "Check: tick the checklist. Swap with a partner: they underline one past verb, one 'have + done' and one future form, and tell you one thing they liked.",
        "Teacher: while they write, look only at the tense that matches each time clue. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
      ],
      "text": {
        "title": "Model paragraph: My English journey",
        "text": "My English journey began three years ago, when I was seven. At first, I knew only a few words, but my teacher made every lesson fun. Last year I won a small prize in a speaking contest, and I felt very proud. So far, I have learned about six hundred words, and I have read two storybooks. Next year, I am going to join a debate club, because I want to speak with more confidence. When I am in grade six, I will keep practising every day."
      },
      "organiser": [
        {
          "label": "Topic sentence",
          "prompt": "When did your English journey begin? (past simple + a finished time)"
        },
        {
          "label": "Detail 1: one big thing",
          "prompt": "What did you do last year or last term? How did you feel?"
        },
        {
          "label": "Detail 2: so far",
          "prompt": "What have you learned or done so far? (have + done)"
        },
        {
          "label": "Closing: the future",
          "prompt": "What are you going to do next year? What will you do when you are older?"
        }
      ],
      "frames": [
        "My English journey began ___, when ___.",
        "Last ___, I ___, and I felt ___.",
        "So far, I have ___ and I have ___.",
        "Next year, I am going to ___, because ___. When ___, I will ___."
      ],
      "checklist": [
        "A finished time word goes with the past (three years ago, last year)",
        "So far / already / yet go with has / have + the 3rd form",
        "going to or will for the future; after when, the present (no will)",
        "One sentence for the past, one for so far and one for the future"
      ],
      "sayIt": "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
      "teacherNote": "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. About 80-100 words is the entrance-exam length. Mark only two targets (the tense that matches the time clue, and the future form) with a dot on the line; the child finds and fixes it. This paragraph is the script for the recorded talk 'My journey so far': children record it after saying it three times.",
      "tiers": [
        {
          "level": "Support",
          "task": "Use the four frames: one sentence for each box.",
          "frames": [
            "My English journey began ___, when ___.",
            "So far, I have ___."
          ]
        },
        {
          "level": "Core",
          "task": "Write the whole paragraph: six or seven sentences."
        },
        {
          "level": "Stretch",
          "task": "Add a sentence with 'By the time': 'By the time I finish this level, I will have a bigger goal.' Check the tense with your partner."
        }
      ]
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My journey so far",
        prompt: "Tell us about your English journey: what you have learned so far, one big thing you did, and what you are going to do next year.",
        length: "90-120 seconds",
        steps: [
          "Write three key words on a card: so far, last, next.",
          "Practise three times, a little faster each time.",
          "Check: did you use 'have' for so far, the past for last, and 'going to' for next year?",
          "Record it once. Keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the past, now and the future of your journey. Keep talking without long stops.",
        words: ["so far", "already", "while", "by the time", "going to", "when"],
        grammar: ["Present perfect", "Past simple and continuous", "going to and will"],
        rubric: [
          { label: "Content", description: "Tells what they have learned, one thing they did, and one plan.", weight: 3 },
          { label: "Tenses", description: "Uses the present perfect, the past and a future form correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s and -ed endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["So far, I have ___.", "Last ___, I ___.", "Next year, I'm going to ___."], tips: ["Look at your card."] },
          { level: "Core", who: "Most children", frames: ["While I was ___, ___.", "When I ___, I'll ___."], tips: ["Say one thing in each time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["By the time ___, I had already ___.", "I wish I could ___."], tips: ["Add a sentence with 'By the time'."] },
        ],
      },
    },
  },
};
