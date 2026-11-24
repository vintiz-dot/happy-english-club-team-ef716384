import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 3 "Solids, Liquids
// and Gases" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Lessons 1-2 automatise the cause-and-effect sentences of the reading (present simple,
// third person -s: "the ice melts"); Lessons 3-5 automatise was / were / wasn't / weren't
// in "then and now" sentences. Every lesson gets one fluency routine and one writing
// routine; Lessons 2 and 5 end with a recorded talk for home that repeats the class
// routine days later (Lesson 4 already has its own vlog). Time comes from games and
// repeats, never from the book pages, the grammar or the homework. All text is original.

const correctNow =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on; children who say it again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('When it is hot, the ice mel...?'), point to the frame, or hold up a finger for the missing -s. Do not say it for them. The mistakes to listen for: 'The ice melt' (final -s on melts, freezes, flows), 'The ice is melts' and 'When hot, the ice melts' (missing 'it is'). For a sound (the -s of 'melts', the /z/ of 'freezes'), just say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const correctWas =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on; children who say it again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('The ice cubes w...?'), point to the one-thing / more-than-one frame, or raise your voice on the error ('The ice cubes WAS?'). Do not say it for them. The mistakes to listen for: 'The ice were hard' and 'They was cold' (was / were), 'The ice hard' (missing was), 'Now it was water' (now needs is), and 'Yes, it was' answered as 'Yes, it do'. For a sound (the final -s of 'cubes', the /nt/ of 'wasn't'), just say it right and let the child echo it. Say every ending clearly yourself: children copy what they hear.";

export const odL2U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u03-l1": {
      objectives: ["I can say 'When it is hot, the ice melts.' fast, without stopping."],
      trim: { "Chant and freeze, melt, heat": 5 },
      add: [
        {
          after: "Cause and effect (SB 29 Think and C)",
          slide: {
            kind: "writing",
            title: "My day with ice: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the sentence about hot and the sentence about cold.",
              "Plan: look at your four boxes. Draw or write a few words in each box. Say one sentence for each box to your partner.",
              "Write: five sentences about ice and water. Use and, so and when to join your ideas.",
              "Check: tick the checklist. Your partner points to every -s on melts, freezes and flows.",
              "Teacher: look only at the final -s and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Ice and water",
              text: "Ice is a solid. It is hard and cold. When it is hot, the ice melts, and then it is water. Water is a liquid, so it flows. When it is very cold, the water freezes, and it is ice again!",
            },
            organiser: [
              { label: "Ice", prompt: "Draw an ice cube. Is it a solid? Is it hard or soft?" },
              { label: "Hot", prompt: "Draw the sun. What happens to the ice when it is hot?" },
              { label: "Water", prompt: "Draw the water. Is it a liquid? What does it do?" },
              { label: "Cold", prompt: "Draw the freezer. What happens to the water when it is cold?" },
            ],
            frames: ["___ is a solid.", "It is ___ and ___.", "When it is hot, the ___ melts, and then ___.", "Water is a liquid, so it ___.", "When it is cold, the water ___."],
            checklist: ["Five sentences, and each one starts with a capital letter and ends with a full stop", "The -s on melts, freezes and flows", "A joining word: and, so, then"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in your own words.",
            teacherNote: "A first short paragraph: five sentences, planned in four boxes by drawing, with the cause-and-effect pattern of the unit. It uses the words and the cause-and-effect sentences the children met in the lesson, so the words are ready. Mark only two things (the final -s on melts, freezes and flows, and the full stops) and let the child find the mistake from your dot. Keep the model on the board while they write.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["Ice is a solid.", "When it is hot, the ice melts.", "Water is a liquid, so it flows."] },
              { level: "Core", task: "Write five sentences, one for each frame." },
              { level: "Stretch", task: "Add a sixth sentence with because: 'The ice melts because the sun is hot.'" },
            ],
          },
        },
        {
          after: "Cause and effect ping-pong",
          slide: {
            kind: "fluency",
            title: "Hot and cold sprint: what happens?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole cause-and-effect sentence, fast and smooth, with no stops.",
            chunks: [
              "When it is hot, the ice melts.",
              "When it is cold, the water freezes.",
              "I heat the water. It makes steam.",
              "Water flows, but ice is a solid.",
            ],
            recycle: ["The cat sometimes sleeps in the garden.", "A fish never climbs a tree."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card (ice, puddle, kettle, freezer), the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence about it, with 'When it is ...'.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: ice cube in the sun)", "(card: puddle on a cold night)", "(card: kettle)", "(card: a river)"],
            feedback: correctNow,
            teacherNote: "Whole sentences only, never single words: 'When it is hot, the ice melts' must become one smooth piece. The cause-and-effect pattern is the engine of the whole unit, so it is worth saying fifty times today. Mix in a 'sometimes / never' card from Unit 2 every few turns so last unit's frequency words stay fast. Listen for the final -s of melts, freezes and flows.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["When it is ___, the ___ ___s."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add the result: 'When it is hot, the ice melts, and the water flows.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u03-l2": {
      objectives: ["I can tell the journey of water three times, faster each time."],
      trim: { "What's missing? Words from last time": 4, "Cause calls, effect moves": 4, "Mystery state": 5 },
      add: [
        {
          after: "Show me where it says (SB 30)",
          slide: {
            kind: "writing",
            title: "The journey of water: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the words First, Then, Next and At the end.",
              "Plan: look at your four boxes. Draw the ice in the pot, the hot pot, the water and the steam. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with First, Then, Next and At the end.",
              "Check: tick the checklist. Your partner points to every joining word.",
              "Teacher: look only at the joining words and the final -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My ice cube",
              text: "First, my ice cube is in a pot. It is hard and cold. Then the pot is hot, and the ice melts. Next, the water is a liquid, and it flows in the pot. At the end, the water is very hot, and it goes up as steam.",
            },
            organiser: [
              { label: "First", prompt: "Draw the ice cube in the pot. What is it like?" },
              { label: "Then", prompt: "Draw the hot pot. What happens to the ice?" },
              { label: "Next", prompt: "Draw the water in the pot. What does it do?" },
              { label: "At the end", prompt: "Draw the steam. Where does the hot water go?" },
            ],
            frames: ["First, my ice cube is ___ and ___.", "Then the pot is hot, and the ice ___.", "Next, the water is a liquid, and it ___.", "At the end, the water is hot, and it goes up as ___."],
            checklist: ["Four or five sentences, and they start with First, Then, Next and At the end", "The -s on melts and flows", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Plan, write, check: the children turn the journey of water into a paragraph of four sentences. It is also the script for the recorded talk at home, so say so: they read it first, then tell it. The four picture boxes are the plan, so no notes are needed. Mark only two things (the joining words and the final -s) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["First, my ice cube is hard and cold.", "Then the pot is hot, and the ice ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence with because: 'The ice melts because the pot is hot.'" },
            ],
          },
        },
        {
          after: "Our class chart: solid, liquid, gas",
          slide: {
            kind: "fluency",
            title: "The journey of water: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the journey of water three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the ice is a solid.",
              "Then the sun is hot, and the ice melts.",
              "Next, the water is a liquid. It flows.",
              "At the end, the water goes up as steam.",
            ],
            recycle: ["First, ___. Then ___.", "Birds hardly ever walk far."],
            rounds: [
              { seconds: 75, say: "Tell your partner the whole journey. Use the four picture cards in order." },
              { seconds: 50, say: "New partner. Tell it again in less time." },
              { seconds: 35, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Point to each picture as you tell: ice, melting, water, steam.",
              "The listener has a job: count the changes on your fingers (there are three).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
            ],
            prompts: ["(picture: ice cube)", "(picture: ice melting in the sun)", "(picture: water in a glass)", "(picture: steam above a pot)"],
            feedback: correctNow,
            teacherNote: "The same journey three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Telling it again does not make it more accurate by itself; the one-minute fix between round 1 and round 2 is what does that. Keep the four pictures on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, the ___ is a ___.", "Then ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add the cause each time: 'The ice melts because it is hot.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The journey of my ice cube",
        prompt: "Tell the journey of an ice cube at home: where it starts, what happens when it is hot, and where the water goes. Show an ice cube in a glass if you can, with a grown-up next to you.",
        length: "45-90 seconds",
        steps: [
          "Put an ice cube in a glass, or draw the four pictures from class.",
          "Tell the journey three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 120,
        kidSummary: "Tell what the ice does, step by step, with 'when it is hot', and keep talking without long stops.",
        words: ["ice", "solid", "liquid", "gas", "melt", "freeze", "steam", "flow"],
        grammar: ["When it is hot, the ice melts.", "First, then, next, at the end", "Final -s: melts, freezes, flows"],
        rubric: [
          { label: "Steps in order", description: "Tells at least three steps with First, Then, Next or At the end.", weight: 2 },
          { label: "Cause and effect", description: "Says what makes it change: 'When it is hot, the ice melts.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of melts, freezes and flows can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the ice is a ___.", "Then it melts.", "Now it is ___."], tips: ["Point to your pictures as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___. Then, when it is ___, the ice ___.", "At the end, the water ___."], tips: ["Use 'when it is hot' in one sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ice melts because ___.", "If I put it in the freezer, the water ___."], tips: ["Add what happens when it is cold, too."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u03-l3": {
      objectives: ["I can say 'It was hard. Now it is water.' and 'They were ice. Now they are water.' fast."],
      trim: { "Chant: then and now": 3 },
      add: [
        {
          after: "What was it? What is it now? (SB 33 E)",
          slide: {
            kind: "writing",
            title: "My ice pop then and now: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find was, were, is and am.",
              "Plan: look at your four boxes. Draw your ice pop then and now. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use and, but and because.",
              "Check: tick the checklist. Your partner points to every was, were and is.",
              "Teacher: look only at was / were and now + is. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My ice pop",
              text: "This morning, my ice pop was hard and cold. Now it is soft, because the day is hot. My hands were wet, and the stick was wet too. At first I was sad, but now I am happy, because I have a new ice pop!",
            },
            organiser: [
              { label: "Then", prompt: "Draw your ice pop this morning. What was it like?" },
              { label: "Now", prompt: "Draw your ice pop now. What is it like? Why?" },
              { label: "Things", prompt: "Draw your hands or the stick. What were they like?" },
              { label: "Me", prompt: "Draw your face. How were you then? How are you now?" },
            ],
            frames: ["This morning, my ___ was ___ and ___.", "Now it is ___, because the day is ___.", "My ___ were ___, and the ___ was ___ too.", "At first I was ___, but now I am ___."],
            checklist: ["Then = was / were. Now = is / am / are.", "Four or five sentences, and each one starts with a capital letter and ends with a full stop", "A joining word: and, but, because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The paragraph uses was / were and is / am in real then-and-now sentences, so the grammar of the lesson is in a child's own writing. The slip to watch for is 'Now it was ...'. Mark only two things (was / were and now + is) and let the child find the mistake from your dot. Children may use any thing that changed (a candle, a puddle, a drawing) in place of the ice pop.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["This morning, my ice pop was ___.", "Now it is ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence with but: 'It was red, but now it is pink.'" },
            ],
          },
        },
        {
          after: "Classroom detectives (SB 33 F)",
          slide: {
            kind: "fluency",
            title: "Then and now: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same then-and-now talk three times. Each time it is smoother and faster.",
            chunks: [
              "The ice was hard. Now it is water.",
              "The puddles were ice. Now they are water.",
              "I was at the door. Now I am at my table.",
              "Was it cold? Yes, it was.",
            ],
            recycle: ["The cat sometimes sleeps in the garden.", "The parrot is usually loud."],
            rounds: [
              { seconds: 50, say: "Round 1: Choose three pictures (ice, puddles, soup). Partner A says a then-and-now sentence for each, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 2: Same three pictures, new partner. Partner A says the sentences again, faster, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Same three pictures, new partner. Partner A, then Partner B. Fast and smooth, no stops!" },
            ],
            steps: [
              "Look at your three pictures. In each round, Partner A talks, then Partner B talks. Say: It was ___. Now it is ___.",
              "The listener's job: tick a box each time you say was or were correctly.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3, count the ticks. Can you get all three?",
            ],
            prompts: ["(picture: ice, then water)", "(picture: puddles, then dry ground)", "(picture: hot soup, then cool soup)"],
            feedback: correctWas,
            teacherNote: "Task repeat: the same task, with the same pictures, three times with a new listener. The second and third go faster because the words are already found. The new listener keeps the repetition real. Do not add new pictures between rounds; the gain comes from saying the same thing more fluently, and the minute of correction in the middle is what makes it more accurate too.",
            tiers: [
              { level: "Support", task: "Say it with the frames on the board.", frames: ["It was ___. Now it is ___.", "They were ___. Now they are ___."] },
              { level: "Core", task: "Say all three sentences without the frames." },
              { level: "Stretch", task: "Add why: 'The ice was hard. Now it is water because the sun was hot.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u03-l4": {
      objectives: ["I can tell my partner about a thing that changes, three times, faster each time."],
      trim: { "Mystery bag, round two": 5, "Noun or verb? (SB 35 F)": 6, "Big Question review (SB 35 A-B)": 6 },
      add: [
        {
          after: "Noun or verb? (SB 35 F)",
          slide: {
            kind: "writing",
            title: "Read the model, write about a thing that changes",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find where it says what changes and why.",
              "Choose your own thing: an ice pop, a candle, a balloon.",
              "Write three sentences with the frames: what it is, what happens, what it was.",
              "Check your list, then read it to a partner.",
            ],
            text: {
              title: "The candle",
              text: "A candle is a solid. When it is hot, it melts. It was hard and white. Now it is a liquid. The flame makes the wax hot.",
            },
            frames: ["A ___ is a ___.", "When it is ___, it ___s.", "It was ___. Now it is ___."],
            checklist: ["Was / is: one thing, one verb", "The -s on melts and freezes", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your three sentences to your partner, then say them again without looking.",
            teacherNote: "The model is short and has the same shape as the frames, so every child can copy the shape and put in their own thing. This feeds the main writing task in this lesson and the recorded talk. The common slips to catch: a dropped -s on 'melts' and 'Now it was a liquid' instead of 'Now it is a liquid'.",
            tiers: [
              { level: "Support", task: "Copy the model and change one word for your own thing." },
              { level: "Core", task: "Write three sentences about your own thing with the frames." },
              { level: "Stretch", task: "Write four sentences. Add why it changes: 'It melts because the heat changes it.'" },
            ],
          },
        },
        {
          after: "Tell your partner (SB 35 Write)",
          slide: {
            kind: "fluency",
            title: "Thing that changes: 4-3-2 with three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "An ice pop is a solid.",
              "When it is hot, it melts.",
              "It was hard. Now it is a liquid.",
              "The heat changes it.",
            ],
            recycle: ["I put the ice in the glass. It melts.", "Can you pass the ___, please?"],
            rounds: [
              { seconds: 75, say: "Partner 1: tell your talk about one thing that changes. The listener counts the changes on their fingers." },
              { seconds: 50, say: "Partner 2: the same talk in less time." },
              { seconds: 35, say: "Partner 3: fast and smooth! The listener asks one question at the end: 'What changes it?'" },
            ],
            steps: [
              "Pick one thing: an ice pop, a candle, a balloon or butter. Say what it is, what happens and what it was.",
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
            ],
            feedback: correctWas,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. Fluency gains are real, but accuracy does not rise on its own; the correction minute between rounds 1 and 2 is what does that. The listener's job (count the changes, then ask one follow-up question) keeps the child listening, which is real practice too. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["A ___ is a ___.", "When it is hot, it ___s."] },
              { level: "Core", task: "Say all four sentences without the board." },
              { level: "Stretch", task: "Add a because: 'It melts because the heat changes it.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u03-l5": {
      objectives: ["I can ask and answer 'Was it ...?' and 'Were they ...?' fast, without looking."],
      trim: { "Remember it!": 4 },
      add: [
        {
          after: "Then and now gap: What was it?",
          slide: {
            kind: "fluency",
            title: "Question chain: Was it? Were they?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Was it hard? Yes, it was.",
              "Were they cold? No, they weren't.",
              "What was it? It was ice.",
              "What were they? They were puddles.",
            ],
            recycle: ["Does it melt? Yes, it does.", "When it is hot, the ice melts."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card (one thing or two or more)." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Was it ___?' (one thing) or 'Were they ___?' (more than one).",
              "They answer: 'Yes, it was.' / 'No, it wasn't.' / 'Yes, they were.' / 'No, they weren't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["Was it ___?", "Were they ___?", "What was it?", "What were they?"],
            feedback: correctWas,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Was it ...? / Were they ...?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Yes, it do' and 'Were it ...?' and prompt with a raised finger: 'Yes, it w...?' Listen for the /nt/ at the end of wasn't and weren't.",
            tiers: [
              { level: "Support", task: "Answer with the short answers on the board and pass the question on.", frames: ["Yes, it was. / No, it wasn't.", "Yes, they were. / No, they weren't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'No, it wasn't. It was soft.'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "Fix the champion notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: was or were, or the not.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The ice cubes was hard.", answer: "The ice cubes were hard." },
              { q: "They was cold.", answer: "They were cold." },
              { q: "The puddle not was water.", answer: "The puddle wasn't water." },
              { q: "You was at the door.", answer: "You were at the door." },
            ],
            checklist: ["One thing = was. More than one = were. You = were.", "Not true then: wasn't / weren't", "A capital letter and a full stop"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "The mistakes here are slips common with children who speak Vietnamese: 'was' for everything (one form for all) and 'not was'. Fix one together first and say the correct version with a strong 'were' so the sound sticks. Two or three error types at a time is plenty: do not add the other slips today.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one new sentence with a was / were mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Then and now at home",
        prompt: "Show us two things that changed. Tell us what each one was then and what it is now. Use a picture, a toy or the thing itself, with a grown-up next to you.",
        length: "45-90 seconds",
        steps: [
          "Choose two things: ice and water, a candle, a puddle, a drawing.",
          "Say 'It was ___. Now it is ___.' for each one, three times, a little faster each time.",
          "Record it once. Show each thing to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 120,
        kidSummary: "Say what it was then and what it is now, with was and were, and keep talking without long stops.",
        words: ["ice", "water", "steam", "melt", "freeze", "was", "were", "wasn't", "weren't"],
        grammar: ["It was ___. Now it is ___.", "They were ___. Now they are ___.", "It wasn't ___. They weren't ___."],
        rubric: [
          { label: "Then and now", description: "Says what it was and what it is now, for at least two things.", weight: 3 },
          { label: "Was and were", description: "Uses was for one thing and were for more than one, and wasn't or weren't at least once.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Now needs is", description: "Says 'Now it is ...', not 'Now it was ...'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It was ___. Now it is ___.", "They were ___. Now they are ___."], tips: ["Hold up the picture, then the thing it became."] },
          { level: "Core", who: "Most children", frames: ["The ___ was ___. It wasn't ___. Now it is ___.", "The ___ were ___. Now they are ___."], tips: ["Say one thing and one group of things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It changed because ___.", "Was it ___? Yes, it was! (ask your grown-up a question)"], tips: ["Say why it changed, and ask your grown-up a was / were question."] },
        ],
      },
    },
  },
};
