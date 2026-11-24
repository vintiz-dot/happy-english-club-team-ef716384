import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 9 "Sources of
// Energy" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences under gentle time pressure, with Unit 8's phrases mixed back in) and one writing
// routine that ends in speaking. Lessons 2 and 5 end with a recorded talk for home that
// repeats the class routine. Time comes from games and repeats, never from the book pages
// or the grammar. All text is original.

const fixSteps =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

export const odL3U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u09-l1": {
      objectives: ["I can say 'The ___ uses energy.' and 'The ___ is a source of energy.' fast, in whole sentences."],
      trim: { "Energy detectives": 4, "Power sort relay": 5, "Wind power or other power? (SB 88 B)": 6 },
      add: [
        {
          after: "Talk about the big picture (SB 86 B)",
          slide: {
            kind: "fluency",
            title: "Energy sprint: what uses energy?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say each whole sentence fast and smooth, with the -s sounds at the end.",
            chunks: [
              "The wind turbine uses wind to make electricity.",
              "The sailboat uses wind to move.",
              "Coal is a source of energy.",
              "Coal and oil make pollution.",
              "I think this is a city because I can see tall buildings.",
            ],
            recycle: ["I'm going to take my passport to the airport.", "What are you going to do?"],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not just one word.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: wind turbine)", "(card: sailboat)", "(card: coal)", "(card: oil)", "(card: a city street)"],
            feedback: fixSteps + " For example, if a child says 'The turbine use wind', start 'The turbine ...' and pause, or hold up a finger for the missing -s.",
            teacherNote: "Whole sentences only, never single words: the aim is to say 'The sailboat uses wind to move' as one smooth piece. Listen for the -s on uses, for 'is' in 'Coal is a source', and for the final sounds of coal and oil. Mix in a Unit 8 card every few turns so last unit's phrases stay fast. Saying the same sentences many times, a little faster each round, is what moves them from slow to automatic.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ uses ___.", "___ is a source of energy."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'Coal makes pollution, so I don't like it.'", frames: ["___ makes pollution, so ___."] },
            ],
          },
        },
        {
          after: "My sentence (SB 89 C)",
          slide: {
            kind: "writing",
            title: "Grow my energy sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the short sentence with the teacher.",
              "Plan: what can you add? A describing word, or where, or how.",
              "Write the bigger sentence. Check it with the list. Then read it to your partner.",
            ],
            items: [
              { q: "Wind is a source of energy. (add: clean)", answer: "Wind is a clean source of energy." },
              { q: "Coal makes pollution. (add: a lot of)", answer: "Coal makes a lot of pollution." },
              { q: "A wind turbine makes electricity. (add: on the hill)", answer: "A wind turbine on the hill makes electricity." },
              { q: "The sailboat moves. (add: with the wind)", answer: "The sailboat moves with the wind." },
            ],
            frames: ["___ is a ___ source of energy.", "The ___ uses ___ to ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "One thing: uses, makes (the -s is there)", "'is' goes with one thing: Wind IS a source"],
            sayIt: "Read your bigger sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese verbs never change, so the -s on uses and makes is a common slip. Model each final -s clearly when you read the answers. Do the first item together on the board.",
            tiers: [
              { level: "Support", task: "Copy the bigger sentence from the board and draw it." },
              { level: "Core", task: "Make three bigger sentences." },
              { level: "Stretch", task: "Make one sentence with two added things: 'Wind is a clean source of energy because it makes no pollution.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u09-l2": {
      objectives: ["I can explain how a water turbine makes electricity: First, Next, Then, So."],
      trim: {
        "Energy word chain": 4,
        "Quiz show: what do we know now?": 4,
        "Draw the energy's journey": 5,
        "Green energy or fossil fuel? Sort what we read": 6,
        "Home talk: where does our electricity come from?": 5,
      },
      add: [
        {
          after: "Explain the diagram: how a water turbine works",
          slide: {
            kind: "fluency",
            title: "Turbine story: tell it three times",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell how a water turbine works three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the water falls and hits the turbine.",
              "Next, the turbine turns.",
              "Then electricity goes along the wires to our homes.",
              "So the water helps to make power.",
              "Water is renewable, so we can use it again and again.",
            ],
            recycle: ["It's night there, so I'll send a message.", "I'm going to call my cousin tomorrow."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells how a water turbine works, then Partner B. Use the diagram. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the diagram. Count the steps on your fingers: First, Next, Then, So.",
              "In each round Partner A tells the story, then Partner B tells it. The listener has a job: hold up a finger for each step you hear. Four fingers is a complete story!",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
            ],
            prompts: ["(diagram: water falls)", "(diagram: turbine turns)", "(diagram: wires to homes)"],
            feedback: fixSteps + " For example, if a child says 'The turbine turn', start 'The turbine ...' and pause, or point to the -s on the board. If a child says 'Then electricity go', repeat it with a rising voice: 'Electricity go?'",
            teacherNote: "This is a retell: the same four-step story, three times, with a new partner each time and less time. The one-minute fix between rounds 1 and 2 is what makes it an accuracy gain as well as a fluency game, because children use the fixed forms when they tell it again. Listen for -s on turns and goes, for 'the' before turbine, and for the sequence words said in the right order. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each part of the diagram and say one sentence for it.", frames: ["First, the ___.", "Next, the ___ turns.", "Then electricity goes ___."] },
              { level: "Core", task: "Tell all four steps without the frames." },
              { level: "Stretch", task: "Add why it is good: 'Water is renewable, so we can use it again and again.'", frames: ["It is good because ___.", "___ is renewable, so ___."] },
            ],
          },
        },
        {
          after: "Green energy or fossil fuel? Sort what we read",
          slide: {
            kind: "writing",
            title: "Dictogloss: the water power story",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Remember the words First, Next, Then and So. Listen to the text. Do not write yet.",
              "Listen again. Write key words only: nouns and verbs.",
              "In your group, build the text back. Use your key words and the checklist.",
              "Compare with the original text. Which words did you miss?",
            ],
            text: {
              title: "Water power",
              text: "Rivers can make electricity. First, the water falls through a big pipe. Next, it turns a turbine. Then wires carry the electricity to homes and schools. Water is renewable, so we can use it again and again. It makes very little pollution, and that is good for the air.",
            },
            frames: ["First, the ___ ___.", "Next, it ___.", "Then wires ___ the electricity to ___.", "___ is renewable, so ___."],
            checklist: ["First, Next, Then and So are there, with a comma", "One thing: the verb has -s (it turns, it makes)", "Capital letters and full stops"],
            sayIt: "Read your group's text aloud together, then say it again without looking.",
            teacherNote: "Dictogloss works best after a short reminder of the language the text uses: here, the sequence words and the -s on verbs with 'it'. Read the text at natural speed both times and say the final sounds clearly. Groups will not match word for word; correct sentences with the same meaning are a success. A good question when groups differ: 'One wire or many wires?' (wires carry, it carries).",
            tiers: [
              { level: "Support", task: "Use the key words from the board and the frames to rebuild the first three sentences." },
              { level: "Core", task: "Rebuild the whole text in your group." },
              { level: "Stretch", task: "Rebuild the text, then add one sentence of your own about another kind of green energy." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How does energy get to my lamp?",
        prompt: "Choose one kind of energy (water, wind or sun). Tell us in order how it gets to a lamp in a house. Show your drawing from class.",
        length: "60-90 seconds",
        steps: [
          "Look at your energy's journey drawing from class.",
          "Practise three times: First, Next, Then, So. Each time a little faster, like in class.",
          "Record it once. Look at the camera and show your drawing.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the journey in order with First, Next, Then and So, and keep talking without long stops.",
        words: ["turbine", "electricity", "renewable", "power plant", "wires", "pollution"],
        grammar: ["First / Next / Then / So", "Present simple with -s: the turbine turns, electricity goes"],
        rubric: [
          { label: "In order", description: "Tells the journey in order with First, Next, Then and So.", weight: 3 },
          { label: "Energy words", description: "Uses words from the unit: turbine, electricity, renewable, wires.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Verb endings", description: "The -s can be heard on verbs with one thing: the turbine turns, it makes.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the ___.", "Next, the ___.", "Then, electricity ___.", "It is good because ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the wind / water / sun ___.", "Next, the ___ turns / makes ___.", "Then electricity goes to ___.", "So it helps ___."], tips: ["Say who or what in every step."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It is renewable, so ___.", "I think this is the best source because ___."], tips: ["Add why it is good, and compare it with coal or oil."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u09-l3": {
      objectives: ["I can say what I may or might do, fast and without adding -s or to."],
      trim: {
        "Sure or not sure? The line game": 4,
        "Mystery bag guessing game": 6,
        "The future of energy: what might happen?": 4,
        "Our big idea": 4,
        "Song time (SB 93 D)": 6,
      },
      add: [
        {
          after: "What may or might I do this weekend? (SB 93 G)",
          slide: {
            kind: "fluency",
            title: "Weekend maybe: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say your weekend plan with may and might three times. Each time is smoother and has no stops.",
            chunks: [
              "I may go to the park this weekend.",
              "I might play soccer if it's sunny.",
              "It might rain, so I may read a book.",
              "My friend may come to my house.",
              "I might not go out if it rains.",
            ],
            recycle: ["I'm going to visit my cousin on Saturday.", "We aren't going to take a taxi."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the weekend maybes, then Partner B. Use three sentences. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A says the same maybes a little faster, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A says them again, smooth and fast, then Partner B." },
            ],
            steps: [
              "Choose three things you may or might do this weekend. Plan them on your fingers.",
              "In each round Partner A talks, then Partner B talks. The listener has a job: tick on a finger every time you say may or might with no -s.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Change partners when you hear the bell.",
            ],
            prompts: ["(card: park)", "(card: soccer)", "(card: a book)", "(card: a friend)", "(card: rain)"],
            feedback: fixSteps + " For example, if a child says 'I mights go' or 'I may to go', point to the rule on the board (no -s, no to) and pause after 'I may ...'. If a child says 'She might goes', hold up a finger and say 'might ... go?'",
            teacherNote: "Task repeat means the same task again with a new listener. The fluency comes from repetition; the accuracy comes from the one-minute fix in the middle. Listen for 'mights', 'may to', 'might goes' and 'might will': these are the unit's typical mistakes. Say the final /t/ of 'might' clearly, because it is often dropped. Let children choose their own maybes so that they mean what they say.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frame on the board.", frames: ["I may ___ this weekend.", "I might ___ if ___."] },
              { level: "Core", task: "Say three sentences without looking." },
              { level: "Stretch", task: "Add a reason or a second plan: 'I may go to the park, but I might not go if it rains.'", frames: ["I may ___, but I might not ___ if ___."] },
            ],
          },
        },
        {
          after: "Change the sentences (SB 93 F)",
          slide: {
            kind: "writing",
            title: "Join it: so, because, if",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Choose the joining word in the brackets. Say the new sentence first, then write it.",
              "Check it with the list. Read it aloud to your partner.",
            ],
            items: [
              { q: "It is cloudy. It may rain. (so)", answer: "It is cloudy, so it may rain." },
              { q: "I might play outside. The weather is nice. (if)", answer: "I might play outside if the weather is nice." },
              { q: "The wind may stop. The turbines might not spin. (so)", answer: "The wind may stop, so the turbines might not spin." },
              { q: "We may use more solar power. The sun is strong. (because)", answer: "We may use more solar power because the sun is strong." },
            ],
            frames: ["___, so ___ may ___.", "___ might ___ if ___.", "___ may ___ because ___."],
            checklist: ["After may or might: the plain verb (no -s, no to)", "A comma before so", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining teaches joining words by using them, not by rules. Model item 1 aloud, adding the comma and so. The answers show the comma before so; point to it, but do not drill it today. The grammar slide of this lesson already holds the rule for may and might.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write one more pair of short sentences about energy, and join them for your partner.", frames: ["___, so ___.", "___ if ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u09-l4": {
      objectives: ["I can ask and answer 'Will you ...?' questions about saving energy, fast and without stopping."],
      trim: {
        "Sentence builder: is, are, was, were": 4,
        "Opposite words (SB 95 D)": 6,
        "Big Question Review (SB 94-95)": 6,
        "Electric things at home (SB 94 Think)": 5,
        "Plan and test your panel": 8,
      },
      add: [
        {
          after: "Ask about the future with will (SB 95 C)",
          slide: {
            kind: "fluency",
            title: "Question chain: Will you save energy?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Will you turn off the lights tomorrow?",
              "Yes, I will. I will turn off the lights, because it saves electricity.",
              "No, I won't. I will turn them off later.",
              "What time will you turn off the TV?",
              "How will you save energy?",
            ],
            recycle: ["It may rain, so I might take an umbrella.", "I'm going to walk to school."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an energy card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left a 'Will you ...?' question about your card.",
              "They answer 'Yes, I will.' or 'No, I won't.' and add one more sentence. Then they ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: lights)", "(card: TV)", "(card: water tap)", "(card: bike)", "(card: heater)"],
            feedback: fixSteps + " For example, if a child says 'Will you turns off?' or 'I will turns', hold up a finger for 'will' and pause 'Will you turn ...?' If a child says 'Yes, I do', point to the frame 'Yes, I will'.",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Will you ...?' and 'I will / I won't' automatic. Time the whole circle and tell them; children like beating their own time. Listen for 'will' followed by the plain verb (no -s, no to), for 'won't' said clearly, and for the final -s of 'saves'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I will.' or 'No, I won't.' and pass the question on with the frame on the board.", frames: ["Will you ___ tomorrow?", "Yes, I will. / No, I won't."] },
              { level: "Core", task: "Ask and answer without looking at the board, and add a reason." },
              { level: "Stretch", task: "Ask 'What time' or 'How' questions: 'How will you save energy?' 'I will walk to school because it saves oil.'" },
            ],
          },
        },
        {
          after: "Underline the subject, circle the verb (SB 95 E)",
          slide: {
            kind: "writing",
            title: "Fix the energy sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong with the verb!",
              "Find the subject. Is it one thing, many things, or a noncount word like electricity?",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Electricity are very useful at home.", answer: "Electricity is very useful at home." },
              { q: "The windmills was on the hill long ago.", answer: "The windmills were on the hill long ago." },
              { q: "Pollution are a big problem.", answer: "Pollution is a big problem." },
              { q: "Coal and oil is fossil fuels.", answer: "Coal and oil are fossil fuels." },
              { q: "Oil make pollution.", answer: "Oil makes pollution." },
            ],
            checklist: ["Noncount words (electricity, pollution, oil) go with is or was", "Many things, or two things joined with and, go with are or were", "One thing or noncount: the verb has -s (makes)"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese learners often drop the -s on verbs and mix up is and are because their first language does not mark them. Fix item 1 together first. Keep to the two or three error types on the checklist today; do not correct other slips unless they get in the way.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the checklist on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u09-l5": {
      objectives: ["I can give an energy forecast with will, may and might, three times, smoother each time."],
      trim: {
        "Forecast jump: sure or maybe?": 7,
        "Two energy towns: ask and fill in the forecast": 10,
        "Write it: our energy forecast": 8,
        "Champion talk: 3 rounds": 8,
      },
      add: [
        {
          after: "Two energy towns: ask and fill in the forecast",
          slide: {
            kind: "fluency",
            title: "Forecast talk 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same forecast to three friends. Each talk is shorter and smoother.",
            chunks: [
              "Tomorrow the sun will shine, so the solar panels will make power.",
              "The wind may blow tonight, so the turbines might spin fast.",
              "We might use more wind power if the weather is windy.",
              "We will not use coal because it makes pollution.",
              "Do you think it might rain on Saturday?",
            ],
            recycle: ["First, the water hits the turbine.", "Will you turn off the lights? Yes, I will."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the forecast, then Partner B. The listener counts will, may and might on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same forecast in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A is fast and smooth, then Partner B. The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Plan your forecast for one town: what will happen, and what may or might happen.",
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
            ],
            feedback: fixSteps + " For example, if a child says 'It might will rain', point to the rule 'will OR might', or if a child says 'It mights rain', start 'It might ...' and pause. Say 'will' and 'might' with a clear final sound yourself.",
            teacherNote: "This is the 4-3-2 activity (here 75, 60 and 45 seconds for each speaker) for eight-to-ten-year-olds. The same talk to a new listener keeps the repetition real. The gain in fluency comes from saying the same thing more smoothly; the gain in accuracy comes from the one-minute fix after round 1. Do not add new language between rounds. Listen for the sure/not sure choice: will for the sure things, may or might for the maybes.",
            tiers: [
              { level: "Support", task: "Say two forecast sentences with the frames.", frames: ["Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___."] },
              { level: "Core", task: "Say four sentences with will, may and might, without the board." },
              { level: "Stretch", task: "Add a plan with a reason: 'We might use more wind power if the weather is windy, because it makes no pollution.'", frames: ["We might ___ if ___, because ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Model forecast, then write",
            routine: "model, then write",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find the sure sentence (will) and the maybe sentences (may, might).",
              "Plan: make a quick list of three things for your town: one sure, two maybes.",
              "Write your forecast with the frames. Check it with the list.",
            ],
            text: {
              title: "Our town's forecast",
              text: "Our town will use sun and wind. Tomorrow the sun will shine, so our solar panels will make a lot of power. The wind may blow in the evening, so the turbines might spin fast. It might rain on Saturday, and then we may use less solar power. I think green energy is good because it makes little pollution.",
            },
            frames: ["Our town will use ___.", "Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___.", "I think ___ is good because ___."],
            checklist: ["Sure things use will; maybes use may or might", "After will, may and might: the plain verb (no -s, no to)", "A comma before so, and a full stop at the end"],
            sayIt: "Read your forecast to your partner, then say it again without looking.",
            teacherNote: "Model, then write works because children see how a short paragraph is built (topic sentence, supporting sentences, a closing sentence) before they write their own. Point to each part on the model. The plan step matters: it lets children decide what is sure and what is only a maybe before they write.",
            tiers: [
              { level: "Support", task: "Copy the model and change the energy sources and the weather." },
              { level: "Core", task: "Write your own forecast with one sure sentence and two maybes." },
              { level: "Stretch", task: "Write a forecast with a closing sentence about the future: 'In the future, we may use more ___.'", frames: ["In the future, we may ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My energy forecast talk",
        prompt: "Tell us the forecast for your town or your home for tomorrow. What will happen for sure? What may or might happen? Say which energy you think we will use.",
        length: "60-90 seconds",
        steps: [
          "Look at the forecast you wrote in class.",
          "Practise three times: each time a little faster, like the 4-3-2 in class.",
          "Record it once. Look at the camera and say one 'will' sentence and two 'may' or 'might' sentences.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what will happen and what may or might happen, and keep talking without long stops.",
        words: ["solar panel", "wind turbine", "electricity", "pollution", "renewable", "weather"],
        grammar: ["will + plain verb (sure)", "may / might + plain verb (not sure)"],
        rubric: [
          { label: "Sure and maybe", description: "Uses will for a sure thing and may or might for a maybe.", weight: 3 },
          { label: "Plain verb", description: "No -s and no 'to' after will, may or might (not 'mights', not 'may to go').", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Tomorrow the ___ will ___.", "It may ___.", "It might ___."], tips: ["Hold up your forecast and point to each sentence."] },
          { level: "Core", who: "Most children", frames: ["Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___.", "We might ___ if ___."], tips: ["Say one sure thing and two maybes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In the future, we may use more ___ because ___.", "I think ___ is the best source because ___."], tips: ["Add your opinion and say what may happen in the future."] },
        ],
      },
    },
  },
};
