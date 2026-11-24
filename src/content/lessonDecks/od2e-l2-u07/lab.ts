import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 7 "Subtraction"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8. Every lesson
// gets one fluency routine (the unit's words and its yes/no yesterday sentences said again
// and again as whole phrases, with Unit 6's phrases mixed back in) and one short writing
// routine (say it, write it, read it back). Two lessons end with a recorded talk for home
// (Lesson 4 already has the unit's own video). Time comes from games and repeats, never
// from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('I didn't ...?'), point to the frame, or hold up a finger for the missing -s. Example: a child says 'I didn't ate the grapes.' You say 'I didn't ...?' and wait, and the child says 'eat'. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: grapes, stickers, bought, gave. Children copy what they hear.";

export const odL2U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u07-l1": {
      objectives: ["I can say take-away sentences fast: 'Six take away two is four.'"],
      trim: {
        "Take-away chant": 3,
        "The vanishing snack": 4,
        "Run and touch": 3,
        "Is it or is it not? (single-digit and double-digit)": 4,
        "Big Question Chart (SB 67 D)": 5,
        "True or false corners (SB 68 B)": 7,
      },
      add: [
        {
          after: "The take-away shop",
          slide: {
            kind: "fluency",
            title: "Take-away shop sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole shop sentence, fast and smooth, with no stops.",
            chunks: [
              "I'd like six apples, please.",
              "Here you are. There are four left.",
              "Six take away two is four.",
              "Ten take away three is seven.",
            ],
            recycle: ["Did you walk to school? Yes, I did.", "We traveled by bus."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a number card and a picture, and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: the shopper asks, the shopkeeper takes some away and answers. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many take-away sentences can you say?" },
            ],
            steps: [
              "Look at the number card. Say a WHOLE sentence, not just the number.",
              "Shopper: 'I'd like six apples, please.' Shopkeeper: take two away and say 'Here you are. There are four left.'",
              "Listen for the clap: it means change jobs.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: 6 apples, take away 2)", "(card: 9 grapes, take away 4)", "(card: 10 stickers, take away 3)", "(card: 8 cookies, take away 5)"],
            feedback: correct,
            teacherNote: "Whole sentences only: 'Six take away two is four' is one smooth piece, not three words. Listen for the -s on apples, grapes and stickers (Vietnamese has no plural ending) and for 'There is four left' instead of 'There are'. Mix in Unit 6's 'Did you ...? Yes, I did.' cards every few turns so last unit's question stays fast.",
            tiers: [
              { level: "Support", task: "Use numbers up to ten and say the sentence with the frame on the board.", frames: ["I'd like ___, please.", "___ take away ___ is ___."] },
              { level: "Core", task: "Say all four sentences without looking at the board." },
              { level: "Stretch", task: "Use numbers up to twenty and add 'There are ___ left.' each time." },
            ],
          },
        },
        {
          after: "Take-away shop sprint",
          slide: {
            kind: "writing",
            title: "My take-away shop: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the shop, the things, the friend and the number left.",
              "Plan: draw four boxes. Draw your shop, your things, a friend and what is left. Say one sentence for each box to your partner.",
              "Write: one sentence for each box, five sentences in all. Use 'and' to join two things.",
              "Check: tick the checklist. Your partner points to every number and every -s on the things.",
              "Teacher: look only at capital letters and the -s on things. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My shop",
              text: "I have a shop. I have nine apples and six bananas. A girl says, \"I'd like four apples, please.\" I take four away, and there are five apples left. Then she says thank you!",
            },
            organiser: [
              { label: "My shop", prompt: "Draw your shop. What is it? Who works there?" },
              { label: "My things", prompt: "Draw what you have. How many of each thing?" },
              { label: "My friend", prompt: "Draw a friend. What does your friend ask for?" },
              { label: "What is left", prompt: "Draw what is left. How many are left?" },
            ],
            frames: ["I have a ___.", "I have ___ ___ and ___ ___.", "A friend says, \"I'd like ___ ___, please.\"", "I take ___ away, and there are ___ ___ left.", "Then my friend says ___!"],
            checklist: ["Five sentences, and each one starts with a capital letter and ends with a full stop or !", "A number and then the -s: nine apples, six bananas", "'There are' for more than one"],
            sayIt: "Read your shop story to your partner. Then tell it again without looking, like a shopkeeper.",
            teacherNote: "A short paragraph for seven-year-olds: five sentences planned in four drawn boxes, built on the shop sentences the children have just said in the sprint. The take-away number sentence is inside the story, so the maths and the writing support each other. Mark only two things (capital letters, the -s on things) and let the child find the mistake from your dot. The children do not copy the model, they copy its shape.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word or number in each.", frames: ["I have a ___.", "I take ___ away, and there are ___ left."] },
              { level: "Core", task: "Write five sentences, one for each part of the plan." },
              { level: "Stretch", task: "Add a sixth sentence with the number sentence: 'Nine take away four is five.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u07-l2": {
      objectives: ["I can tell a partner what subtraction is, three times, faster each time."],
      trim: {
        "Rocket countdown": 4,
        "Word slap": 3,
        "Rows or columns? T-chart": 6,
        "Number-line floor walk": 6,
        "Word problem theater (SB 71)": 9,
      },
      add: [
        {
          after: "Teach it to a partner",
          slide: {
            kind: "fluency",
            title: "Teach subtraction: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same subtraction lesson three times, to three partners. Each round is shorter, and both partners tell it in every round.",
            chunks: [
              "Subtraction means we take some away.",
              "We write a minus sign.",
              "The answer tells us how many are left.",
              "Nine take away three is six.",
            ],
            recycle: ["Long ago, people traveled by ship.", "Did you visit your grandma? Yes, I did."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A teaches what subtraction is with counters, then Partner B teaches it. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. A teaches it again in less time, then B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. A, then B. Fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Take nine counters. Say the four sentences while you move the counters.",
              "In each round, Partner A teaches first, then Partner B teaches. The listener has a job: say 'Left!' and hold up the number of fingers for the answer.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, change partners and teach it again, A first, then B.",
            ],
            prompts: ["(counters: 9, take away 3)", "(counters: 7, take away 2)", "(counters: 10, take away 6)"],
            feedback: correct,
            teacherNote: "This is the same short lesson three times on purpose (A then B in every round, so each child teaches three times): the second and third tellings are faster because the children are not searching for words. The listener's job (fingers for the answer) keeps the partner listening. Listen for 'Subtraction mean' (missing -s on means), 'We write minus sign' (missing 'a') and 'How many is left' instead of 'are left'. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and move the counters.", frames: ["Subtraction means we ___.", "___ take away ___ is ___."] },
              { level: "Core", task: "Say all four sentences without the board." },
              { level: "Stretch", task: "Add a story: 'I had nine counters. I gave away three. Six are left.'" },
            ],
          },
        },
        {
          after: "Subtraction every day (SB 71 end)",
          slide: {
            kind: "writing",
            title: "What subtraction is: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then and At the end.",
              "Plan: draw four boxes. Draw what subtraction means, the things you have, the minus sign and the answer. Say one sentence for each box to your partner.",
              "Write: one sentence for each box, five sentences in all. Use First, Then and At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the -s on means and tells. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Subtraction",
              text: "Subtraction means we take some away. First, we look at how many things we have. Then we take some away and write a minus sign. At the end, the answer tells us how many are left. Nine take away three is six.",
            },
            organiser: [
              { label: "What it means", prompt: "Draw things going away. What does subtraction mean?" },
              { label: "First", prompt: "Draw the things you have. How many?" },
              { label: "Then", prompt: "Draw the minus sign and the things you take away." },
              { label: "At the end", prompt: "Draw what is left. How many are left?" },
            ],
            frames: ["Subtraction means we ___.", "First, we look at ___.", "Then we ___ and write a ___ sign.", "At the end, the answer tells us ___.", "___ take away ___ is ___."],
            checklist: ["Five sentences, and each one starts with a capital letter and ends with a full stop", "First, Then and At the end are in the right place", "The -s on means and tells: 'Subtraction means', 'The answer tells'"],
            sayIt: "Read your paragraph to your partner. Then teach it again without looking, like a little teacher.",
            teacherNote: "A short paragraph for seven-year-olds: five sentences planned in four drawn boxes, using First, Then and At the end. The paragraph is also the script for the recorded talk at home (Teach a toy subtraction), so tell the children to keep it. It builds on what they said in 'Teach it to a partner' and the retell. Mark only two things (capital letters and the -s on means and tells) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word or number in each.", frames: ["Subtraction means we ___.", "___ take away ___ is ___."] },
              { level: "Core", task: "Write five sentences, one for each part of the plan." },
              { level: "Stretch", task: "Add a sixth sentence about when we use subtraction: 'We use subtraction when we share cookies.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Teach a toy subtraction",
        prompt: "Teach a toy, a pet or a grown-up what subtraction is. Use counters, coins or grapes to show how many we take away and how many are left.",
        length: "45-90 seconds",
        steps: [
          "Pick nine small things from home: counters, beans or cards.",
          "Practise three times: say 'Subtraction means we take some away,' then show a take-away problem. Each time a little faster.",
          "Record it once. Show the things and say the answer.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Tell what subtraction is, show one take-away problem with things, and keep talking without long stops.",
        words: ["subtraction", "take away", "minus", "left", "how many"],
        grammar: ["Subtraction means we ___.", "___ take away ___ is ___.", "There are ___ left."],
        rubric: [
          { label: "What subtraction is", description: "Says that subtraction means taking some away, in a whole sentence.", weight: 3 },
          { label: "A real problem", description: "Shows one take-away problem and says the number sentence and how many are left.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Grammar: 'There are'", description: "Says 'There are ___ left' with the -s on the things: grapes, beans.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Subtraction means we take some away.", "___ take away ___ is ___."], tips: ["Move the things with your hands as you say it."] },
          { level: "Core", who: "Most children", frames: ["Subtraction means we ___.", "I have ___ ___. I take away ___.", "There are ___ left."], tips: ["Say the number sentence and the answer."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We use subtraction when we ___.", "Yesterday I gave away ___, so ___ are left."], tips: ["Add when we use subtraction, and one yesterday story."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u07-l3": {
      objectives: ["I can say what I ate, saw, bought and gave, and what I didn't, without stopping."],
      trim: {
        "Yesterday song": 4,
        "Beanbag yesterday toss": 6,
        "Listen and sing: Cookies! (SB 73 D)": 6,
        "What do you think? (SB 72 Think)": 4,
        "Find the answers and write (SB 72 B, C)": 9,
      },
      add: [
        {
          after: "What did they do? (SB 73 E)",
          slide: {
            kind: "fluency",
            title: "Yesterday talk: same task, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same yesterday talk with two partners. Both partners talk in each round, and the second round is smoother.",
            chunks: [
              "I ate rice for lunch yesterday.",
              "I saw a bird, but I didn't see a cat.",
              "I bought a pen. I didn't buy a book.",
              "I gave a sticker to a friend.",
            ],
            recycle: ["We played in the park.", "Did you walk to school? Yes, I did."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A says the four yesterday sentences, then Partner B. The listener ticks each one on their fingers. Then change partners." },
              { seconds: 55, say: "Round 2: new partner. A says the same four sentences a little faster, then B. The listener says 'Same!' if you said them all." },
            ],
            steps: [
              "Pick one thing for each verb: ate, saw, bought, gave. Two of your sentences have a 'didn't' part.",
              "Round 1: Partner A says the four sentences, then Partner B. The listener counts them on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, change partners. Round 2: A says the same four sentences again, then B.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task with a new listener, so the second and third time the children can think about how they say it, not what. Listen for the two classic mistakes: 'I eated / I buyed' (adding -ed to a verb that changes) and 'didn't ate / didn't bought' (past form after didn't). Prompt: say 'I didn't ...?' and pause. Say 'bought', 'gave' and 'ate' clearly yourself.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames on the board.", frames: ["I ate ___.", "I didn't eat ___."] },
              { level: "Core", task: "Say four sentences with ate, saw, bought and gave." },
              { level: "Stretch", task: "Add a take-away sentence: 'I bought ten grapes and ate four. Six are left.'" },
            ],
          },
        },
        {
          after: "What I ate and drank yesterday (SB 73 F)",
          slide: {
            kind: "writing",
            title: "Fix the yesterday sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence aloud with your partner. Something is wrong!",
              "Find the mistake: a wrong verb, a wrong verb after didn't, or a missing -s.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "I eated rice yesterday.", answer: "I ate rice yesterday." },
              { q: "She didn't ate the soup.", answer: "She didn't eat the soup." },
              { q: "We buyed three apple.", answer: "We bought three apples." },
              { q: "He didn't saw the cat.", answer: "He didn't see the cat." },
            ],
            checklist: ["After didn't the verb stays plain: eat, see, buy, give", "YES sentences use ate, saw, bought, gave", "More than one: add -s"],
            sayIt: "Read your fixed sentences to the class in a loud, clear voice.",
            teacherNote: "Focus on two error types only: the verb form (ate / bought, not 'eated / buyed') and the plain verb after didn't. The missing -s is a bonus: praise it if a child finds it. Fix item 1 together first, and say the correct sentence yourself only at the end, after the children have tried.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the verb pairs on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u07-l4": {
      objectives: ["I can tell my take-away story to three friends, shorter and smoother each time."],
      trim: {
        "How do you feel now?": 3,
        "Listen, point, say (SB 74 A)": 6,
        "Kittens listening (SB 74 C)": 4,
        "Picnic mingle": 4,
        "Clap the syllables (SB 75 F)": 6,
      },
      add: [
        {
          after: "Rehearse: our interesting subtraction problem (SB 75 Write)",
          slide: {
            kind: "fluency",
            title: "Subtraction story 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same take-away story to three friends. Each round is shorter and smoother, and both partners tell it in every round.",
            chunks: [
              "Yesterday I had nine grapes.",
              "Then I gave three to a friend.",
              "Nine take away three is six.",
              "Now I have six left.",
            ],
            recycle: ["I'd like six apples, please.", "I ate rice, but I didn't eat soup."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells the story, then Partner B. The listener counts the grapes on their fingers. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. A tells the same story in less time, then B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. A, then B. Fast and smooth! The listener says 'Six!' at the end." },
            ],
            steps: [
              "Use your own numbers and your own things, but keep the same four parts: had, gave, number sentence, left.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In each round, Partner A tells first, then Partner B tells.",
              "When the bell rings, line B moves one step to the left: a new partner. Then the next round starts.",
            ],
            feedback: correct,
            teacherNote: "Same story, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. Fluency grows on its own, but the one-minute fix between round 1 and round 2 is what makes the second telling more accurate too. Do not add new language between the rounds. This story is also the rehearsal for the child's own subtraction problem in the next activity.",
            tiers: [
              { level: "Support", task: "Say two parts with the frames.", frames: ["Yesterday I had ___ ___.", "Then I gave ___ to ___."] },
              { level: "Core", task: "Say all four parts without the board." },
              { level: "Stretch", task: "Use ate, saw or bought as well: 'I bought ten grapes and ate four. Six are left.'" },
            ],
          },
        },
        {
          after: "Subtraction story 3-2-1: three partners",
          slide: {
            kind: "writing",
            title: "Read a model, write my story",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the yesterday word and the number sentence.",
              "Plan: say your story to your partner first (who, how many, what happened).",
              "Write two or three sentences. Use 'and' or 'then' to link them.",
              "Check with the list. Then read your story aloud.",
            ],
            text: {
              title: "Stickers",
              text: "Yesterday a boy bought ten stickers. He gave four stickers to his sister. He didn't give her the star sticker. Now he has six stickers left. Ten take away four is six.",
            },
            frames: ["Yesterday ___ bought / had ___ ___.", "___ gave ___ to ___, then ___.", "Now ___ has ___ left."],
            checklist: ["A yesterday word and ate / gave / bought / saw", "A number sentence: ___ take away ___ is ___", "The -s on things: stickers, grapes", "A capital letter and a full stop"],
            sayIt: "Read your story to your partner, then tell it again without looking.",
            teacherNote: "Plan, write, check is the strategy: say it first, then write it. This model is the school's own story, so the children copy the shape, not the words. Point out how 'He didn't give her the star sticker' is a no-sentence that still fits a take-away story.",
            tiers: [
              { level: "Support", task: "Copy the model and change the numbers and the thing." },
              { level: "Core", task: "Write two or three sentences about your own story." },
              { level: "Stretch", task: "Write four sentences with 'then' and 'but', and a number sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u07-l5": {
      objectives: ["I can ask and answer 'What did you buy? How many are left?' round the circle."],
      trim: {
        "Remember it!": 4,
        "Plate race: take away with a sentence": 8,
        "Champion talk: 3 rounds": 9,
      },
      add: [
        {
          after: "Who has what left? The information gap",
          slide: {
            kind: "fluency",
            title: "Question chain: What did you buy?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What did you buy yesterday?",
              "I bought six grapes.",
              "How many did you give away?",
              "I gave away two. Four are left.",
            ],
            recycle: ["Did you walk to school? Yes, I did.", "We saw a bird, but we didn't see the owl."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a card with a number and a thing." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'What did you buy yesterday?'",
              "They answer: 'I bought six grapes.' Then you ask 'How many did you give away?' and they answer.",
              "Then they turn and ask the next friend.",
              "Teacher: after the first round, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["What did you buy yesterday?", "How many did you give away?", "(card: 8 cookies)", "(card: 5 stickers)"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'What did you ...?' automatic. The big mistake to listen for is 'What did you bought?' (past form after did). Prompt: say 'What did you ...?' and point to the frame: after did, the plain verb. Time the whole circle and tell the children; they love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame and pass the question on.", frames: ["I bought ___.", "I gave away ___. ___ are left."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a no-sentence: 'I bought six grapes, but I didn't buy any apples.'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "My yesterday: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the yes sentences, the no sentence and the number sentence.",
              "Plan: draw four boxes. Draw what you bought, what you ate and gave, what you did not do, and what was left. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use ate, bought and gave, and one sentence with didn't. Join two ideas with 'and' or 'because'.",
              "Check: tick the checklist. Your partner points to every ate, bought or gave, and every didn't.",
              "Teacher: look only at capital letters and the plain verb after didn't. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Yesterday",
              text: "Yesterday I bought ten grapes at the shop. I ate four grapes, and I gave two grapes to my friend. I didn't buy any apples because I like grapes. At the end, I had four grapes left. Ten take away six is four.",
            },
            organiser: [
              { label: "I bought", prompt: "Draw what you bought yesterday. How many?" },
              { label: "I ate and gave", prompt: "Draw what you ate and what you gave to a friend." },
              { label: "I didn't", prompt: "Draw one thing you did not do or did not buy." },
              { label: "What was left", prompt: "Draw what was left. How many?" },
            ],
            frames: ["Yesterday I bought ___ ___.", "I ate ___, and I gave ___ to ___.", "I didn't ___ because ___.", "At the end, I had ___ left.", "___ take away ___ is ___."],
            checklist: ["ate, bought, gave for yes, and didn't + the plain verb for no", "Five sentences, and each one starts with a capital letter and ends with a full stop", "The -s on things: grapes, stickers"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like a news reporter.",
            teacherNote: "A short paragraph for seven-year-olds: five sentences planned in four drawn boxes, using the unit's yes and no yesterday sentences and a number sentence. The joining words (and, but, because) from the sentence-level practice in earlier lessons feed it: children join two ideas while they write. The paragraph is also the script for the recorded talk at home (What I did and didn't do). Mark only two things (capital letters and the plain verb after didn't) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word in each.", frames: ["Yesterday I bought ___.", "I ate ___, and I gave ___ to ___."] },
              { level: "Core", task: "Write five sentences, one for each part of the plan." },
              { level: "Stretch", task: "Add a sixth sentence with 'but': 'I saw a cat, but I didn't see a dog.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did and didn't do",
        prompt: "Tell us about yesterday. Say what you ate, saw, bought or gave, and one thing you did not do. Add a take-away sentence if you can.",
        length: "45-90 seconds",
        steps: [
          "Think of four things from yesterday: ate, saw, bought or gave, and one 'didn't'.",
          "Say them three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Say every sentence in full.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say what you did yesterday and one thing you didn't do, with ate, saw, bought or gave, and keep talking without long stops.",
        words: ["ate", "saw", "bought", "gave", "yesterday", "left"],
        grammar: ["ate / saw / bought / gave", "I didn't + plain verb", "___ take away ___ is ___."],
        rubric: [
          { label: "Yes sentences", description: "Says at least two things that happened with the right form: ate, saw, bought, gave.", weight: 3 },
          { label: "A no sentence", description: "Says one 'didn't' sentence with the plain verb after it: I didn't eat, I didn't buy.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on things (grapes, stickers) and the end sounds of bought and gave can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Yesterday I ate ___.", "I didn't ___."], tips: ["Look at your verb card as you speak."] },
          { level: "Core", who: "Most children", frames: ["Yesterday I ate ___ and I saw ___.", "I bought ___, but I didn't buy ___.", "I gave ___ to ___."], tips: ["Say two yes sentences and one no sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I bought ___ ___ and I gave away ___. ___ are left.", "___ take away ___ is ___."], tips: ["Add a take-away story with a number sentence."] },
        ],
      },
    },
  },
};
