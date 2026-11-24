import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 12 "Wants and
// Needs" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 11's phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Lessons 2, 4 and 6 end with a
// recorded talk for home (Lesson 5 already has its own video). Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const fixIntro =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, spend one minute: write them on the board and let the class fix them, then go on: children who say it again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, hold up a finger for the missing -s, or say the error back with a rising voice) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear. ";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U12Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u12-l1": {
      objectives: ["I can say who helps me, fast and smooth: 'A doctor helps me.'"],
      trim: { "Run and touch": 5 },
      drop: ["Freeze dance with the words"],
      add: [
        {
          after: "Helpers' town role play",
          slide: {
            kind: "fluency",
            title: "Helper sprint: who helps me?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about a helper, fast and smooth, with no stops.",
            chunks: ["A doctor helps me.", "A teacher helps me learn.", "A police officer helps us.", "I help my friend.", "We need water."],
            recycle: ["The farmer has a cow.", "I want to buy a hat."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a helper card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the helper card. Say a WHOLE sentence: 'A doctor helps me.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
            ],
            prompts: ["(card: doctor)", "(card: teacher)", "(card: police officer)", "(card: water)", "(card: me and my friend)"],
            feedback:
              fixIntro +
              "For this unit: one helper needs -s on the action word ('A doctor helps me'). If a child says 'A doctor help me', point to the frame and say 'A doctor help...?' and pause, or hold up one finger for the -s. 'We help' and 'I help' have no -s: show that with two cards.",
            teacherNote:
              "Whole sentences only, never single words: the point is to say 'A teacher helps me' as one smooth piece. One person = helps with -s; many people or I/we = help. Vietnamese has no such ending, so the final -s in 'helps' is the sound to listen for. Mix in a Unit 11 card every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ helps me.", "I help my ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add how they help: 'A doctor helps me get well.'", frames: ["A ___ helps me ___."] },
            ],
          },
        },
        {
          after: "Who helps you? (SB 117 Think)",
          slide: {
            kind: "writing",
            title: "My helpers: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: four short sentences. Start with 'Many helpers help me.'",
              "Check: tick the checklist. Your partner points to every capital letter.",
              "Teacher: look only at capital letters and the -s after one helper. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my helpers",
              text: "Many helpers help me. A doctor helps me get well. A teacher helps me learn at school. I say thank you!",
            },
            organiser: [
              { label: "Helper 1", prompt: "Draw a helper. Who is it? How does this helper help you?" },
              { label: "Helper 2", prompt: "Draw a second helper. How does this helper help you?" },
              { label: "Thank you", prompt: "Draw yourself. Say thank you to your helpers." },
            ],
            frames: ["Many helpers help me.","A ___ helps me ___.","A ___ helps me ___.","I say thank you!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end of every sentence","One helper: helps (with -s)","Many helpers: help (no -s)"],
            sayIt: "Read your helper paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A mini paragraph for six-year-olds: four short sentences. The first says what it is about, two give details, the last is the ending. The drawings are the plan, so no notes are needed. Mark only two things (capital letters, the -s after one helper) and let the child find the mistake from your dot. The first sentence has 'help' with no -s because the helpers are many: a good moment to show both.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one word in each.", frames: ["A ___ helps me ___.","I say thank you!"] },
              { level: "Core", task: "Write four short sentences: the topic, two helpers and a thank you." },
              { level: "Stretch", task: "Add a fifth sentence: 'I help my mom too.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u12-l2": {
      objectives: ["I can say what we need and what I want, three times, faster each time."],
      trim: { "Farm, truck, store, home": 5 },
      add: [
        {
          after: "Who helps us?",
          slide: {
            kind: "fluency",
            title: "Need or want: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same need-or-want talk three times with three partners. Each time is smoother.",
            chunks: ["We need water.", "We need food and clothes.", "Water is a need.", "I want a toy.", "A toy is a want."],
            recycle: ["The cow needs water.", "He doesn't have a hat."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A picks three picture cards and says 'need' or 'want' for each one, in a whole sentence. Then Partner B does the same. Then change partners." },
              { seconds: 30, say: "Round 2: New partner. Partner A says the same three sentences, a little faster. Then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Same again! Partner A, then Partner B. Can you say all three without stopping?" },
            ],
            steps: [
              "Take three cards from the pile. Look at each picture.",
              "Say a WHOLE sentence for each card: 'Water is a need.' or 'A toy is a want.' In each round Partner A talks, then Partner B talks.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
              "When the bell rings, change partners and say the same three again. Partner A first, then Partner B.",
            ],
            prompts: ["(card: water)", "(card: clothes)", "(card: toy)", "(card: game)", "(card: food)"],
            feedback:
              fixIntro +
              "For this unit: children often leave out 'a' or 'is' ('Water need', 'Toy a want'). Point to the frame 'A ___ is a ___.' and pause, or say 'Water is a...?' with a rising voice. Two sentence ideas are enough: 'We need ___.' and 'A ___ is a want.'",
            teacherNote:
              "The same task three times with a new partner is task repetition: the second and third tellings are smoother because children are not searching for words. Keep the language the same between rounds. Listen for the missing 'is' and the final -s in 'needs' on the recycle phrase.",
            tiers: [
              { level: "Support", task: "Say 'I need ___.' or 'I want ___.' for each card, using the frame.", frames: ["I need ___.", "I want ___."] },
              { level: "Core", task: "Say 'A ___ is a need.' or 'A ___ is a want.' without the board." },
              { level: "Stretch", task: "Add a reason: 'We need water. We drink it every day.'" },
            ],
          },
        },
        {
          after: "Find it in the text",
          slide: {
            kind: "writing",
            title: "Our needs and wants: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the needs and to the wants.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: four short sentences. Start with 'We all need and want things.'",
              "Check: tick the checklist. Your partner points to every full stop.",
              "Teacher: look only at capital letters and full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: needs and wants",
              text: "We all need and want things. We need water, food and clothes. We want toys and games. I need water, but I want a toy!",
            },
            organiser: [
              { label: "Needs", prompt: "Draw three things we need. Say: We need ___." },
              { label: "Wants", prompt: "Draw two things we want. Say: We want ___." },
              { label: "Me", prompt: "Draw yourself with one need and one want. Say: I need ___, but I want ___." },
            ],
            frames: ["We all need and want things.","We need ___, ___ and ___.","We want ___ and ___.","I need ___, but I want ___!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end of every sentence","'We need' and 'We want': no -s","'and' and 'but' join the words"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A mini paragraph about the unit's big idea: four short sentences planned by drawing. Needs and wants are the two groups; the last sentence joins one of each with 'but'. This paragraph is the script for the recorded talk at home, 'My needs and wants cards': children hold up their drawings as they say it. Mark only capital letters and full stops.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["We need ___.","We want ___."] },
              { level: "Core", task: "Write four short sentences." },
              { level: "Stretch", task: "Add one more sentence with a reason: 'We need water. We drink it every day.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My needs and wants cards",
        prompt: "Find three things at home. Hold each one up and say if it is a need or a want. Say 'water is a need' and 'a toy is a want'.",
        length: "30-60 seconds",
        steps: [
          "Find three things at home: water, a toy, clothes ...",
          "Practise your three sentences three times, a little faster each time.",
          "Record it once. Hold each thing up as you talk.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say if each thing is a need or a want, and keep talking without long stops.",
        words: ["need", "want", "water", "food", "clothes", "money", "toy"],
        grammar: ["___ is a need. / ___ is a want.", "I need ___. I want ___."],
        rubric: [
          { label: "Need or want", description: "Says need or want for each thing, in a whole sentence.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: water, food, clothes, money.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear is and a", description: "Says 'is' and 'a': 'Water is a need.' Not 'Water need.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I need ___.", "I want ___."], tips: ["Hold up each thing and point to it."] },
          { level: "Core", who: "Most children", frames: ["___ is a need.", "___ is a want."], tips: ["Say 'is a' every time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We need ___ because ___.", "I want ___, but I need ___."], tips: ["Say why we need it, or use 'but'."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u12-l3": {
      objectives: ["I can ask 'Does she have it?' and answer fast, round the circle."],
      trim: { "Secret card: guess the child": 6 },
      add: [
        {
          after: "Choose a girl or a boy (SB 121 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: Does she have it?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Does she have a red pencil?", "Yes, she does.", "No, he doesn't.", "What does he want?", "He wants a game."],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds a card of a boy or a girl." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Does she have a ___?' or 'What does he want?'",
              "They answer: 'Yes, she does.' or 'No, he doesn't.' or 'He wants a ___.' Then they ask the next friend.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
            ],
            prompts: ["Does she have ___?", "Does he want ___?", "What does he want?"],
            feedback:
              fixIntro +
              "For this unit: the two big slips are 'Does she wants...?' and 'Yes, she do.' For the first, point to the frame and say 'Does she w...?' then show 'does' and 'want' as two cards: -s lives in only ONE place. For the second, say 'Yes, she d...?' with a rising voice and let the child finish 'does'. Model 'does' and 'wants' with a clear final sound.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Does she ...?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Does she have a pencil? Yes, she have' and prompt with a raised finger. Mix in Unit 11's 'He has / She wants' cards so those stay fast.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, she does.' or 'No, he doesn't.' and pass the question on with the frame on the board.", frames: ["Does she have ___?", "Yes, she does. / No, she doesn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with more: 'No, she doesn't. She has a blue pencil.'", frames: ["No, he doesn't. He has ___."] },
            ],
          },
        },
        {
          after: "I want, I have: write and change",
          slide: {
            kind: "writing",
            title: "Fix the question mistakes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: is there a missing or extra -s? A wrong word?",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Does she wants a kitten?", answer: "Does she want a kitten?" },
              { q: "She want a bicycle.", answer: "She wants a bicycle." },
              { q: "He have a bus.", answer: "He has a bus." },
              { q: "Yes, she do.", answer: "Yes, she does." },
            ],
            frames: ["Does she want ___?", "She wants ___.", "He has ___."],
            checklist: ["After Does: want and have (no -s)", "In the answer: wants and has (with -s)", "A capital letter and a full stop or a question mark"],
            sayIt: "Read your fixed sentences to the class, with a clear -s on wants and has.",
            teacherNote:
              "Two or three error types at a time: -s after Does (it does not belong), -s on wants and has (it does), and 'does' in the short answer. Vietnamese has no such endings, so children place -s by guess: fix one together first and say the rule in plain words: 'Does takes the -s, so the next word stays short.'",
            tiers: [
              { level: "Support", task: "Fix sentences 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u12-l4": {
      objectives: ["I can tell about our picnic three times, faster each time: 'We want juice. We need water.'"],
      trim: { "Mime hot seat": 4, "Picnic says": 3 },
      add: [
        {
          after: "Picnic role play",
          slide: {
            kind: "fluency",
            title: "Picnic talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same picnic talk to three friends. Each talk is shorter and smoother.",
            chunks: ["We want juice and a sandwich.", "We need water.", "The farmer grows grapes.", "The cook makes a sandwich.", "Yes, we want cookies too!"],
            recycle: ["Can I borrow your ball, please?", "Sure! Here you are."],
            rounds: [
              { seconds: 45, say: "Round 1: Tell your picnic talk to Partner 1. The listener counts the foods on their fingers. Then they tell you theirs. Then change partners." },
              { seconds: 30, say: "Round 2: Partner 2. The same talk in less time. You talk, then your partner talks. Then change partners." },
              { seconds: 20, say: "Round 3: Partner 3. Fast and smooth! You talk, then your partner talks. The listener says 'Yum!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again with the new partner: Line A talks, then Line B talks.",
            ],
            feedback:
              fixIntro +
              "For this unit: one person takes -s on the action word ('The farmer grows grapes', 'The cook makes a sandwich'), a group does not ('The farmers grow grapes'). If a child says 'The farmer grow', start 'The farmer gr...?' and pause, or hold up a finger for -s. 'We want' and 'we need' have no -s: say them clearly and let the class echo.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and from the one minute of correction after round 1. Listen for the final -s on grows and makes, and for 'cookies'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["We want ___.", "We need ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a helper sentence: 'The farmer grows grapes. The cook makes a sandwich.'" },
            ],
          },
        },
        {
          after: "Naming and action words (SB 123 F)",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "The girl drinks juice. The girl eats a cookie. (and)", answer: "The girl drinks juice and eats a cookie." },
              { q: "The farmer grows grapes. The farmer sells grapes. (and)", answer: "The farmer grows and sells grapes." },
              { q: "We want juice. We want a sandwich. (and)", answer: "We want juice and a sandwich." },
              { q: "Doctors help people. Teachers help people. (and)", answer: "Doctors and teachers help people." },
            ],
            frames: ["The ___ drinks ___ and eats ___.", "We want ___ and ___."],
            checklist: ["The first words are only written once","'and' joins the two things", "One person: drinks, eats (-s). More than one: help (no -s)"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote:
              "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'The girl'. Item 4 has TWO people, so help has no -s: a good moment to listen for it.",
            tiers: [
              { level: "Support", task: "Do items 1 and 3 with the teacher." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three: 'We want juice, a sandwich and grapes.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My picnic talk",
        prompt: "Pack a pretend picnic at home. Show what we want and what we need. Say who makes or grows the food.",
        length: "30-60 seconds",
        steps: [
          "Put some food and a bottle of water on a mat: a sandwich, grapes, juice, a cookie.",
          "Say your picnic talk three times: each time a little faster, like in class.",
          "Record it once. Show each thing as you say it.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what we want and what we need for a picnic, and keep talking without long stops.",
        words: ["sandwich", "grapes", "juice", "cookie", "chips", "soda", "water"],
        grammar: ["We want ___. We need ___.", "The ___ + action word with -s: The farmer grows grapes."],
        rubric: [
          { label: "Want and need", description: "Says what we want and what we need, using 'We want' and 'We need'.", weight: 3 },
          { label: "Picnic words", description: "Uses food words from the unit: sandwich, grapes, juice, cookie.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "The -s", description: "The -s can be heard on a helper's action word: grows, makes.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["We want ___.", "We need ___."], tips: ["Point to each food as you say it."] },
          { level: "Core", who: "Most children", frames: ["We want ___ and ___.", "We need ___.", "The ___ makes ___."], tips: ["Use 'and' to join two foods."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The farmer grows ___. The cook makes ___.", "We want ___, but we need ___."], tips: ["Say who grows or makes the food, and use 'but'."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u12-l5": {
      objectives: ["I can tell the class what my friends need and want, three times, faster."],
      trim: { "Swap and act": 4 },
      add: [
        {
          after: "Tell the class (SB 125 C)",
          slide: {
            kind: "fluency",
            title: "Survey retell: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell what your survey showed three times. Each time is shorter, smoother and faster.",
            chunks: ["I asked three friends.", "She needs water.", "He wants a game.", "We all need food.", "I think she wants a toy."],
            recycle: ["What do you need? I need ___.", "Does she have a pencil? Yes, she does."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A tells what the survey chart shows and points to the pictures. Then Partner B tells theirs. Then change partners." },
              { seconds: 30, say: "Round 2: New partner. Partner A tells it again in less time. Then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: New partner. Tell it fast! Partner A, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your survey chart. Point to each friend as you talk.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
              "When the bell rings, change partners. Partner A talks first, then Partner B.",
              "The listener says 'Wow!' at the end and asks one question: 'What does she want?'",
            ],
            prompts: ["(chart: three friends)", "(chart: needs)", "(chart: wants)"],
            feedback:
              fixIntro +
              "For this unit: one friend takes -s on needs and wants ('She needs water', 'He wants a game'). If a child says 'She need water', start 'She ne...?' and pause, or hold up one finger for the -s. If a child says 'What he wants?', point to the frame 'What does he ___?' and let them rebuild it.",
            teacherNote:
              "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one minute of correction between round 1 and 2 is what makes accuracy improve, not only speed. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each friend on the chart and say one sentence for each.", frames: ["She needs ___.", "He wants ___."] },
              { level: "Core", task: "Tell about three friends without the frames." },
              { level: "Stretch", task: "Add what everyone needs: 'We all need water and food. I think she wants a toy.'" },
            ],
          },
        },
        {
          after: "Make the survey chart (SB 125 B)",
          slide: {
            kind: "writing",
            title: "My survey paragraph: plan, write, check",
            routine: "paragraph",
            genre: "survey report",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the two friends on your survey chart.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: four short sentences about your own survey.",
              "Check: tick the checklist. Your partner checks your sentences against the chart.",
              "Teacher: look only at the -s on needs and wants, and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my survey",
              text: "I asked two friends about needs and wants. A girl needs water, but she wants a kite. A boy needs clothes, but he wants a game. We all need food!",
            },
            organiser: [
              { label: "Friend 1", prompt: "Draw the first friend. What does this friend need? What does this friend want?" },
              { label: "Friend 2", prompt: "Draw the second friend. What does this friend need? What does this friend want?" },
              { label: "Everyone", prompt: "Draw something we all need. Say: We all need ___!" },
            ],
            frames: ["I asked two friends about needs and wants.","A ___ needs ___, but she wants ___.","A ___ needs ___, but he wants ___.","We all need ___!"],
            checklist: ["My sentences match my chart","One girl or boy: needs and wants (with -s)","A capital letter at the start and a full stop or ! at the end of every sentence"],
            sayIt: "Show your chart to a partner and tell your paragraph without reading.",
            teacherNote: "A mini paragraph from the survey chart: four short sentences, planned by drawing. The first says what it is about, two give details, the last is the ending. Mark only the -s on needs and wants (one girl or boy) and the full stops; let the child find the mistake from your dot. Children who did not ask a girl and a boy can write 'A friend needs ___, but my friend wants ___.'",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["A ___ needs ___.","We all need ___!"] },
              { level: "Core", task: "Write four short sentences about two friends." },
              { level: "Stretch", task: "Add a fifth sentence: 'I think we all want fun!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u12-l6": {
      objectives: ["I can ask 'Does he have it? What does she want?' and answer quickly, without looking."],
      trim: { "Hop and fix": 6 },
      add: [
        {
          after: "Two pockets: ask over the wall",
          slide: {
            kind: "fluency",
            title: "Pocket sprint: Does she have it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["Does he have a ball? Yes, he does.", "Does she have water? No, she doesn't.", "What does she want? She wants a kite.", "He has a bus. He wants a drum."],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a pocket card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write the two mistakes you heard most on the board, fix them together, then go on.",
            ],
            feedback:
              fixIntro +
              "For this unit: after Does the word stays short ('Does she have'), in the answer it takes -s ('She has', 'She wants'). 'He have a bus' needs 'has': say 'He ha...?' and pause, or hold up a finger. 'Yes, she do' needs 'does': rising voice, let the child finish it.",
            teacherNote:
              "A quick, high-energy recall of the whole unit's grammar, with Unit 11's phrases mixed in (spaced retrieval): this is what keeps 'has' and 'doesn't' from fading. Whole sentences only, one smooth breath. Say every -s clearly yourself.",
            tiers: [
              { level: "Support", task: "Use the pocket cards and the frames on the board.", frames: ["Does he have ___?", "Yes, he does. / No, he doesn't."] },
              { level: "Core", task: "Ask and answer without the board." },
              { level: "Stretch", task: "Answer with more: 'No, she doesn't. She wants a kite.'" },
            ],
          },
        },
        {
          after: "Write like a champion: has and wants",
          slide: {
            kind: "writing",
            title: "Grow the pocket sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add the new word.",
              "Write your big sentence. Say it first, then write it.",
            ],
            items: [
              { q: "She has a ball. (add: red)", answer: "She has a red ball." },
              { q: "He wants a drum. (add: big)", answer: "He wants a big drum." },
              { q: "Does she have a pencil? (add: blue)", answer: "Does she have a blue pencil?" },
              { q: "She wants water. (add: cold)", answer: "She wants cold water." },
            ],
            frames: ["She has a ___ ___.", "He wants a ___ ___."],
            checklist: ["has and wants have -s when it is one girl or boy", "After Does: have (no -s)", "A capital letter and a full stop or a question mark"],
            sayIt: "Read your big sentences to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Write your own: 'He has a big green bus. He wants ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My pocket friend",
        prompt: "Pick a toy or draw a friend. Tell us what he or she has and what he or she wants. Ask one question at the end.",
        length: "30-60 seconds",
        steps: [
          "Choose a toy or draw a pocket friend. Give your friend a name.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Show your friend to the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what your friend has and what he or she wants, ask one question, and keep talking.",
        words: ["has", "wants", "needs", "water", "toy", "game", "pocket"],
        grammar: ["He / She has ___. He / She wants ___.", "Does he / she have ___? Yes, he / she does."],
        rubric: [
          { label: "Has and wants", description: "Says what the friend has and wants, with -s: 'She has a ball. She wants a kite.'", weight: 3 },
          { label: "A question", description: "Asks one question with Does: 'Does she have water?'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Short answers", description: "Answers 'Yes, she does.' or 'No, he doesn't.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is ___.", "He / She has a ___.", "He / She wants a ___."], tips: ["Point to your pocket friend."] },
          { level: "Core", who: "Most children", frames: ["He / She has ___. He / She wants ___.", "Does he / she have ___?"], tips: ["Ask a question and answer it."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["He / She doesn't have ___. He / She needs ___.", "Does he / she want ___? Yes, he / she does."], tips: ["Say one thing the friend does NOT have, and what he or she needs."] },
        ],
      },
    },
  },
};
