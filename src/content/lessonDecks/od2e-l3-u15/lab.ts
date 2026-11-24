import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 15 "Plants and
// People" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's language said again and again as
// whole sentences, a little faster each round, with Unit 14's phrases mixed back in) and
// one short writing routine that ends by being said aloud. Two lessons end with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// and repeats, never from the book pages, the grammar or the checks. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it themselves: start the phrase and pause ('a bag ... ?'), point to the frame, hold up a finger for the missing 'of' or the missing -s, or repeat the error with a rising voice ('two bag of rice?'). For a sound, just say it right and let them echo it. Say every final -s and -es clearly yourself ('boxes', 'bottles', 'plants'): Vietnamese speakers often drop final sounds, and children copy what they hear.";

export const odL3U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u15-l1": {
      objectives: ["I can say 'If a plant has no water, it dies' and 'Because ..., the plant ...' fast and clearly."],
      trim: {
        "Can see, cannot see": 5,
        "Draw it, label it, tell it": 5,
        "Which grows faster? (Before You Read, SB 149)": 6,
        "Cause and effect with plants": 5,
      },
      add: [
        {
          after: "What do plants need? (SB 149 F)",
          slide: {
            kind: "fluency",
            title: "Plant sprint: if and because",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 5,
            goal: "Say the whole cause-and-effect sentence, fast and smooth, with no stops.",
            chunks: [
              "If a plant has no water, it dies.",
              "Because the roots take in water, the plant grows.",
              "The leaves use sunlight to make food.",
              "Plants give us oxygen, so we need them.",
              "The stem holds the flower up.",
            ],
            recycle: ["A jet flies faster than a car.", "Before lamps were invented, people used candles."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card (roots, leaves, sun, water) and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not just one word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'the plant no water' or 'the roots takes') and let the class fix them; then go on.",
            ],
            prompts: ["(card: roots and water)", "(card: leaves and sun)", "(card: a plant with no water)", "(card: a stem and a flower)", "(card: oxygen)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words. The unit's cause-and-effect language is the grammar of this lesson; saying it as one smooth piece is what makes it available later when a child wants to explain. Listen for 'has no water' (children say 'no have water'), the -s on 'roots' and 'leaves', and for 'takes' versus 'take' (one plant, many roots). Mix last unit's comparing phrases in every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["If a plant has no ___, it ___.", "Because the ___, the plant ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second reason: 'If a plant has no sun, its leaves turn yellow, so it cannot make food.'", frames: ["If a plant has no ___, then ___, so ___."] },
            ],
          },
        },
        {
          after: "Cause and effect with plants",
          slide: {
            kind: "writing",
            title: "Grow my cause-and-effect sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: read the small sentences with the teacher. In a quick organiser (Plant | needs | what happens) write one word for each.",
              "Write: make each small sentence bigger with 'because' or an 'if' part.",
              "Join three of your big sentences into a short paragraph. Start with 'Plants need water and sun.' and end with 'We must look after plants.'",
              "Check with the list. Then read your paragraph to your partner.",
            ],
            items: [
              { q: "The plant grows. (add: because it gets water and sun)", answer: "The plant grows because it gets water and sun." },
              { q: "The plant dies. (add: if it has no water)", answer: "The plant dies if it has no water." },
              { q: "The leaves are green. (add: because they use sunlight)", answer: "The leaves are green because they use sunlight." },
              { q: "We need plants. (add: because they give us oxygen)", answer: "We need plants because they give us oxygen." },
            ],
            frames: ["The plant ___ because ___.", "If a plant has no ___, it ___.", "Plants need ___ and ___.", "We must look after plants because ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "I wrote 'because' or 'if' and the part after it", "More than one: roots, leaves (the -s or -ves is there)", "My paragraph starts and ends with a sentence about plants"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence with a reason is a quick, low-stress way to practise the cause-and-effect structure the lesson teaches. Check the two error types we are focusing on: the -s on plural plant words, and a missing 'has' ('If a plant no water'). Do not mark spelling today. The paragraph is only three or four sentences: a first sentence, two big sentences and a last sentence.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and underline 'because'." },
              { level: "Core", task: "Write the big sentence for each item, then join three into a paragraph." },
              { level: "Stretch", task: "Write two sentences of your own about a plant, each with 'because' or 'if'.", frames: ["Plants need ___ because ___.", "If ___, then ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u15-l2": {
      objectives: ["I can tell the life of a sunflower in order, shorter and faster each time."],
      trim: { "Tell the story of a seed": 9, "Home talk: show and tell": 4, "I am a sunflower seed (interview)": 8 },
      add: [
        {
          after: "Tell the story of a seed",
          slide: {
            kind: "fluency",
            title: "Sunflower story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same sunflower story three times, each round. In every round partner A tells it, then partner B. Each round is shorter, smoother and faster (75, 60, 45 seconds each).",
            chunks: [
              "First, a seed goes into the soil.",
              "Then the roots grow down and the stem grows up.",
              "After a few weeks, a flower opens.",
              "Because the sunflower gets water and sun, it grows tall.",
              "In the end, the seeds fall down, so new sunflowers can grow.",
            ],
            recycle: ["Clara solved the problem by using glass in a new way.", "Before lamps were invented, people used candles."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole life of a sunflower, then Partner B tells it. Use the five picture cards. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Say fewer extra words, same story. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the five key-picture cards in order: seed, roots and stem, flower, sun and water, new seeds.",
              "Partner A tells the story using the pictures, then Partner B tells it. The listener has a job: count the order words (First, Then, After, In the end) on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board (often 'the roots grows' or a missing 'the') and let the class fix them; then start round 2.",
              "When the bell rings, change partners. Each round, both partners talk.",
            ],
            prompts: ["(card: seed in soil)", "(card: roots and stem)", "(card: flower opens)", "(card: sun and water)", "(card: seeds fall down)"],
            feedback: correct,
            teacherNote: "Retelling the same story three times with less time is what builds speed: the children are no longer searching for ideas, so they can work on saying the words smoothly. Repeating is not enough for accuracy, so the one-minute fix between round 1 and round 2 matters most. Listen for 'the roots grow' (plural, no -s on the verb) versus 'the stem grows' (one thing, -s). Say 'grows' and 'grow' clearly yourself.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it with the frames.", frames: ["First, a seed goes into the ___.", "Then the ___ grow down.", "After a few weeks, ___."] },
              { level: "Core", task: "Tell all five parts without the frames." },
              { level: "Stretch", task: "Add the reason: 'Because the sunflower gets water and sun, it grows tall.'", frames: ["Because ___, the sunflower ___."] },
            ],
          },
        },
        {
          after: "Why does it turn to the sun?",
          slide: {
            kind: "writing",
            title: "Sunflower dictogloss",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Quick reminder: First, Then, After and In the end start a step. Say them with the teacher.",
              "Plan: listen. The teacher reads the short text twice. First time: listen only. Second time: write one key word in each box of your organiser (First | Then | After | In the end).",
              "In your group, rebuild the text together. It does not have to be the same words, but it must have the same steps in order.",
              "Compare with the real text. Check it with the list. Fix your sentences.",
            ],
            text: {
              title: "How a sunflower grows",
              text: "A sunflower begins as a small seed. First, the seed goes into the soil. Then the roots grow down and the stem grows up. After a few weeks, a big yellow flower opens. In the end, the seeds fall down, so new sunflowers can grow.",
            },
            frames: ["First, ___.", "Then ___.", "After a few weeks, ___.", "In the end, ___."],
            checklist: ["My steps are in the right order", "Each order word has a comma after it", "Roots and seeds have an -s; the stem grows"],
            sayIt: "Read your group's text aloud together, then tell it again without looking.",
            teacherNote: "A dictogloss makes children notice grammar while they rebuild meaning together, and the short rule reminder before it focuses their attention. Read at normal speed, not slowly, and say each final -s clearly. Praise groups that keep the order even if the words differ.",
            tiers: [
              { level: "Support", task: "Use the frames and the key-picture cards to rebuild two or three sentences." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text and add one new sentence with 'because' or 'so'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My seed story",
        prompt: "Tell how a seed becomes a plant, in order. Show a seed, a drawing or a plant if you have one!",
        length: "60-90 seconds",
        steps: [
          "Look at the five pictures from class, or draw your own: seed, roots and stem, flower, sun and water, new seeds.",
          "Practise three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the life of a seed in order with First, Then, After and In the end, and keep talking without long stops.",
        words: ["seed", "soil", "roots", "stem", "flower", "sun", "water"],
        grammar: ["First, / Then, / After a few weeks, / In the end,", "Because ___, the plant ___."],
        rubric: [
          { label: "Right order", description: "Tells the steps in order with First, Then, After and In the end.", weight: 3 },
          { label: "Plant words", description: "Uses words from the unit: seed, soil, roots, stem, flower.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on roots and seeds, and 'grows' for one thing, can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, a seed goes into the ___.", "Then the ___ grow.", "In the end, ___."], tips: ["Point to each picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___. Then ___. After a few weeks, ___.", "In the end, ___."], tips: ["Say who and what in every step."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Because the sunflower gets ___, it ___.", "The seeds fall down, so ___."], tips: ["Add a reason with 'because' or 'so', and say why humans like sunflowers."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u15-l3": {
      objectives: ["I can ask and answer with 'a bag of ...' and 'two boxes of ...' fast, round the circle."],
      trim: {
        "Count it or cannot count it?": 4,
        "At the market (role play)": 8,
        "Make a shopping list (SB 153 G)": 8,
        "Cause and effect game": 4,
      },
      add: [
        {
          after: "Make a shopping list (SB 153 G)",
          slide: {
            kind: "fluency",
            title: "Shopping chain: how many bags of ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "How many bottles of water do you need?",
              "I need two bottles of water.",
              "I have a bag of rice and a jar of honey.",
              "Can I have a loaf of bread, please?",
              "Here you are. Anything else?",
            ],
            recycle: ["A jet flies faster than a car.", "I like inventions, and my partner does, too."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a food-and-container card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it (for example: a box of cookies, a bag of rice).",
              "Ask the friend on your left: 'How many ___ of ___ do you need?'",
              "They answer with a number, 'I need ___ ___ of ___.', then turn and ask the next friend.",
              "The listener's job: if you hear 'of' and the -s on the container, tap your head.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'two rice' or 'three box') and fix them together; then go on.",
            ],
            prompts: ["(card: bag of rice)", "(card: bottle of water)", "(card: jar of jam)", "(card: box of cookies)", "(card: loaf of bread)"],
            feedback: correct,
            teacherNote: "The chain gives every child many turns at asking and answering in a few minutes, which makes the measure-word pattern automatic. The three typical errors are leaving out 'of' ('a bag rice'), counting the food instead of the container ('two rices') and a missing -s or -es on the container ('three box'). Prompt with a finger for 'of' and a rising 'three box?'. Time the whole circle; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame and pass the question on.", frames: ["I need ___ ___ of ___.", "How many ___ of ___ do you need?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I need two bags of soil because I want to plant a sunflower.'", frames: ["I need ___ because ___."] },
            ],
          },
        },
        {
          after: "Circle the measure word (SB 153 F)",
          slide: {
            kind: "writing",
            title: "Join the shopping sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read the short sentences. Circle the two things that go together. Underline the reason.",
              "Write: make ONE sentence with 'and' or 'because'. Say it first, then write it.",
              "Then write a short shopping paragraph: a first sentence (I am going shopping.), two of your joined sentences and a last sentence (Now we are ready!).",
              "Check with the list. Then read your paragraph to your partner.",
            ],
            items: [
              { q: "I bought a bag of rice. I bought a jar of honey. (and)", answer: "I bought a bag of rice and a jar of honey." },
              { q: "We need two boxes of cookies. We have a party. (because)", answer: "We need two boxes of cookies because we have a party." },
              { q: "She has a loaf of bread. She has a carton of milk. (and)", answer: "She has a loaf of bread and a carton of milk." },
              { q: "He bought three bottles of water. He is thirsty. (because)", answer: "He bought three bottles of water because he is thirsty." },
            ],
            frames: ["I bought a ___ of ___ and a ___ of ___.", "We need ___ because ___.", "I am going shopping.", "Now we are ready!"],
            checklist: ["Every container has 'of' after it", "More than one container: -s or -es (two boxes)", "A capital letter and a full stop", "My paragraph starts and ends with a short sentence"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I bought'. The checklist targets the two Unit 15 slips: leaving out 'of' and the missing plural ending on the container.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Join three things: 'We need a bag of rice, a bunch of bananas and two bottles of water.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u15-l4": {
      objectives: ["I can explain how to grow a plant with First, Second, Then and Finally, three times, faster each time."],
      trim: { "May I borrow ...? (SB 155 C)": 10, "Explain it to a visitor": 5, "Word families: strong, strength (SB 155 D)": 4 },
      add: [
        {
          after: "Explain it to a visitor",
          slide: {
            kind: "fluency",
            title: "Plant steps 4-3-2: explain it three times",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Explain how to grow a plant to three friends. In each round both partners explain it, one after the other. Each talk is shorter and smoother (75, 60, 45 seconds each).",
            chunks: [
              "First, fill a small pot with soil.",
              "Second, push a seed into the soil.",
              "Next, give the seed a little water every day.",
              "Finally, put the pot near a sunny window.",
              "Plants need water and sun, so don't forget them!",
            ],
            recycle: ["A jet flies faster than a car.", "Because the roots take in water, the plant grows."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A explains how to grow a plant, then Partner B. The listener counts the order words on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A, then Partner B: the same talk in less time. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B: fast and smooth! The listener asks one question at the end: 'Why do plants need sun?'" },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B). Use the four step pictures to remember the order.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'First put soil' with no comma or a missing 'the') and fix them together; then go on.",
              "When both partners have talked and the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again in rounds 2 and 3, each time shorter.",
            ],
            feedback: correct,
            teacherNote: "The same talk, less time, a new listener: the 4/3/2 routine scaled for ten-year-olds. The new partner keeps the repetition real. Do not add new language between rounds: the gain comes from saying the same things more smoothly. The correction minute between round 1 and round 2 is what also raises accuracy. Listen for the pause (comma) after First, Second, Finally, and for the verb: 'give the seed' not 'gives the seed' after First and Next.",
            tiers: [
              { level: "Support", task: "Say four short sentences with the frames and the pictures.", frames: ["First, ___.", "Second, ___.", "Finally, ___."] },
              { level: "Core", task: "Say all the steps without the board." },
              { level: "Stretch", task: "Add a reason for each step: 'Finally, put the pot near a window because plants need sun.'", frames: ["Finally, ___ because ___."] },
            ],
          },
        },
        {
          after: "Human sentence (SB 155 E)",
          slide: {
            kind: "writing",
            title: "Model: how to grow a bean plant",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: think of three steps for growing something. Write one word for each step in a quick organiser.",
              "Read the model with the teacher. Find the first sentence, First, Second, Third, Finally and the last sentence. Find the comma after each order word.",
              "Write: a short paragraph with your own steps in order: a first sentence, three or four steps and a last sentence.",
              "Check with the list. Then read it to your partner.",
            ],
            text: {
              title: "How to grow a bean plant",
              text: "A bean plant is easy to grow. First, put soil in a small pot. Second, push a bean seed into the soil. Third, give it a little water every day. Finally, put the pot near a sunny window. After two weeks, a green sprout comes up. Now you can watch it grow!",
            },
            frames: ["___ is easy to grow.", "First, ___.", "Second, ___.", "Third, ___.", "Finally, ___."],
            checklist: ["My paragraph has a first sentence and a last sentence", "My steps are in the right order", "There is a comma after First, Second, Third and Finally", "Each step starts with an action word (put, push, give)"],
            sayIt: "Read your steps to your partner, then say them again without looking.",
            teacherNote: "Plan, write, check is a strategy children can reuse for any paragraph, and a short model helps them see how the steps are built before they write their own. Praise a child who changes the model's steps to a different plant instead of copying it.",
            tiers: [
              { level: "Support", task: "Copy the model and change one thing (bean to sunflower)." },
              { level: "Core", task: "Write three or four steps for any plant." },
              { level: "Stretch", task: "Write the steps and add a 'because' sentence at the end.", frames: ["Plants need ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u15-l5": {
      objectives: ["I can say what I need for a plant party with 'a bag of', 'two boxes of' and 'because'."],
      trim: { "Market run": 5, "Remember it!": 5 },
      add: [
        {
          after: "Two kitchens: find the differences",
          slide: {
            kind: "fluency",
            title: "Party shopping: say it again, better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same shopping talk with a new partner in each round. In every round Partner A talks, then Partner B. Say it smoother and with fewer mistakes (75, 60, 45 seconds each).",
            chunks: [
              "For my plant party, I will buy a bag of soil.",
              "I need two boxes of cookies because we are hungry.",
              "We have no bread, so I will buy a loaf of bread.",
              "I will buy a bunch of flowers for the party table.",
              "How many bottles of water do you need?",
            ],
            recycle: ["Before lamps were invented, people used candles.", "A good solution is to ask for help."],
            rounds: [
              { seconds: 75, say: "Round 1: Plan for one minute. Then Partner A tells what you will buy for the party and why, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A, then Partner B: do the same talk again, with the fixes. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B: once more, smooth and fast." },
            ],
            steps: [
              "Look at your party shopping list. Plan for one minute with your partner: what you need, how many, and why.",
              "Partner A tells their shopping talk, then Partner B. The listener's job: count the containers (bag, box, bottle) and ask one follow-up question.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'two box of' or 'a bag rice') and fix them together; then go on.",
              "Change partners when you hear the bell, and do it again: in each round both partners talk.",
            ],
            prompts: ["(list: a party for 8 children)", "(list: plants and flowers)"],
            feedback: correct,
            teacherNote: "Repeating the same task with a planning minute and a new partner lets children focus on accuracy the second time, because the ideas are already ready (task repetition). Do not give a new topic in round 3. Listen for 'of' after every container, the plural ending on the container (not on the food), and the 'because' or 'so' part.",
            tiers: [
              { level: "Support", task: "Use the frames and the pictures.", frames: ["I will buy a ___ of ___.", "I need ___ because ___."] },
              { level: "Core", task: "Talk without looking at your list." },
              { level: "Stretch", task: "Add what you do not need, with 'so': 'We have no rice, so I will buy two bags of rice.'", frames: ["We have no ___, so I will buy ___."] },
            ],
          },
        },
        {
          after: "Writing: A shopping paragraph",
          slide: {
            kind: "writing",
            title: "Fix the party list",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing 'of', a missing -s or -es on the container, or a food made plural by mistake.",
              "Write the sentence the right way. Read it aloud together.",
              "Plan, write, check: write your own short paragraph about a plant party. Make a first sentence, three sentences with a container, and a last sentence. Check it with the list.",
            ],
            items: [
              { q: "I need two bag of rice.", answer: "I need two bags of rice." },
              { q: "We bought a box cookies.", answer: "We bought a box of cookies." },
              { q: "She wants three bottles of waters.", answer: "She wants three bottles of water." },
              { q: "There are two loaf of bread on the table.", answer: "There are two loaves of bread on the table." },
              { q: "He needs a bag of soil because he want to plant a seed.", answer: "He needs a bag of soil because he wants to plant a seed." },
            ],
            checklist: ["Every container has 'of' after it", "The container has -s or -es for more than one (the food stays the same)", "He / she / it + a verb: -s (wants)", "My paragraph has a first sentence and a last sentence"],
            sayIt: "Say all your fixed sentences to your partner, fast.",
            teacherNote: "Written correction works best when it focuses on two or three error types with a short explanation, so the checklist has three: 'of', the plural on the container, and the verb -s. Fix item 1 together first. 'Loaves' is a bonus: praise it if a child sees it, but do not make it the lesson.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the checklist beside you." },
              { level: "Core", task: "Fix all five items, then write the paragraph." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My plant party shopping",
        prompt: "You are planning a plant party. Tell us what you will buy, how many, and why. Show the things if you can!",
        length: "60-90 seconds",
        steps: [
          "Make a short shopping list of four things: a bag of ___, two boxes of ___ ...",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Use 'because' or 'so' to give a reason.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you will buy with 'a bag of' and 'two boxes of', give a reason, and keep talking without long stops.",
        words: ["bag", "box", "bottle", "jar", "bunch", "loaf", "soil", "seeds"],
        grammar: ["a / one + measure word + of + food", "two bags of rice, three boxes of cookies", "I need ___ because ___."],
        rubric: [
          { label: "Measure words with of", description: "Says a bag of rice, a jar of honey: the container, then 'of', then the food.", weight: 3 },
          { label: "Plural on the container", description: "Says two bags, three boxes (not two bag, three box); the food does not change.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about three or four things, in whole sentences.", weight: 3 },
          { label: "A reason", description: "Gives at least one reason with 'because' or 'so'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I will buy a ___ of ___.", "I need ___ because ___."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["For my plant party, I will buy a ___ of ___ and two ___ of ___.", "I need ___ because ___."], tips: ["Say a number for at least two things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We have no ___, so I will buy ___.", "Plants give us ___, so ___."], tips: ["Add what you already have and a sentence about why plants matter."] },
        ],
      },
    },
  },
};
