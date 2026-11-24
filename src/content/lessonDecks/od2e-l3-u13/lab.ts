import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 13 "Simple Machines
// and Inventions" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 12's phrases mixed back in) and one
// writing routine (plan, write, check, then say it aloud). Two lessons end with a recorded
// talk for home. Time comes from games, repeats and warm-ups, never from the book pages,
// the grammar or the checks. All text is original.

const fixGrammar =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Then the next round uses the fixed form. For grammar, make the child fix it: point to the frame, start the phrase and pause ('My dad ...?'), hold up a finger for the missing -s, or repeat the error with a rising voice. Typical slips here: 'My dad use' and 'It help us' (the -s), 'People use it for make work easy' (it is 'to make'). For a sound, say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

const fixAgree =
  "Listen for the two small words and the helper. Between rounds 1 and 2, stop for one minute and put two mistakes on the board (no names). The class fixes them, then the next round uses the fixed form. Prompt, do not tell: start the phrase and pause ('I don't, ...?'), point to the frame, or hold up a finger for the helper word. Typical slips: 'I don't, too' (needs either), 'I can, either' (needs too), 'I like, too' (the helper 'do' is missing: 'I do, too'), and 'She is happy, and I do, too' (the helper must match: 'I am, too'). Recast sounds quickly: say 'either' clearly and let the child echo it. Say final -s clearly yourself ('uses', 'doesn't').";

const fixPlural =
  "Listen for the verb after two things joined with 'and'. Between rounds 1 and 2, stop for one minute and put two mistakes on the board (no names). The class fixes them. Prompt, do not tell: say 'A ramp and a lever ... ?' and pause, or hold up two fingers for the two things. Typical slips: 'A ramp and a lever is', 'We was', a missing -s on 'inventions', 'People use it for make work easy' (it is 'to make'). Say your own plural endings and 'are' / 'were' clearly, and let a child echo the sound if they miss it.";

export const odL3U13Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u13-l1": {
      objectives: ["I can say 'I use a ___ to ...' about the machines around me, fast and smooth."],
      trim: { "Machine mime": 3, "Mystery bag of helpers": 3, "Sort the words (SB 128 B)": 6 },
      add: [
        {
          after: "Classify and categorize (SB 129 D)",
          slide: {
            kind: "writing",
            title: "A machine I use every day: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline one 'to + verb' and tell you one thing they liked.",
              "Teacher: while they write, look only at 'I use it to + verb' and the -s after he / she / it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My bicycle",
              text: "My favorite machine is the bicycle, and I use it every day. It has two wheels, a seat and a chain, and it is made of metal. I use it to ride to school with my sister. The wheels turn when I push the pedals, so we go fast. A bicycle is useful because it saves time and it does not need electricity. I think it is a great invention!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which machine do you use? How often?" },
              { label: "Detail 1: What it looks like", prompt: "What parts does it have? What is it made of?" },
              { label: "Detail 2: What it is for", prompt: "I use it to ... (a verb). Who uses it with you?" },
              { label: "Closing", prompt: "Why is it useful? What do you think of it?" },
            ],
            frames: ["My favorite machine is the ___, and I use it ___.", "It has ___ and it is made of ___.", "I use it to ___.", "A ___ is useful because ___."],
            checklist: [
              "My first sentence says the machine and how often I use it",
              "I use it to + a verb (to ride, to cut, to lift)",
              "-s after he / she / it: it has, it helps, it saves",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. A description paragraph needs only a topic sentence, details and a closing sentence. Mark only two targets (the verb after 'to' and the -s after it) with a dot on the line; the child finds and fixes the mistake. This replaces the sentence-expanding slide: the pairs have already grown sentences, and now they join them.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box. Aim for four sentences.", frames: ["My favorite machine is the ___.", "I use it to ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence about a second machine that helps the first one, or a sentence with because.", frames: ["A ___ helps the ___ because ___."] },
            ],
          },
        },
        {
          after: "Inventions I use every day (SB 129 F)",
          slide: {
            kind: "fluency",
            title: "Machine sprint: I use it to ...",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say each whole sentence about a machine, fast and smooth, with no long stops.",
            chunks: [
              "I use a lever to lift heavy things.",
              "A ramp helps people go up without stairs.",
              "My dad uses an axe to cut wood.",
              "A seesaw goes up and down.",
              "Do you use a light bulb every night? Yes, I do.",
            ],
            recycle: ["It's as loud as a drum.", "I'd like to try the ___ because ..."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card. The class says the whole sentence for it." },
              { seconds: 60, say: "Pairs: one shows a card, the other says a sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say about the cards?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence about the machine, not just the word.",
              "When you hear the clap, swap roles.",
              "In the last round, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes you heard on the board (for example a missing -s: 'my dad use'), then go on with round 2.",
            ],
            prompts: ["(card: lever)", "(card: ramp)", "(card: axe)", "(card: seesaw)", "(card: light bulb)", "(card: doorknob)", "(card: wedge)", "(card: screw)"],
            feedback: fixGrammar,
            teacherNote: "Whole sentences only, never single words: 'a ramp helps people go up' should be one smooth piece, as automatic as a song line. The sprint keeps the machine words coming back many times in a few minutes, which is how a new word becomes easy to say. Mix in a Unit 12 phrase every few cards so last unit's language stays fast. Listen for the -s after a name or he / she.",
            tiers: [
              { level: "Support", task: "Use the frame on the board and one machine.", frames: ["I use a ___.", "A ___ helps us ___."] },
              { level: "Core", task: "Say a whole sentence with 'to' and do not look at the board." },
              { level: "Stretch", task: "Add a because: 'I use a lever to lift a box because it is heavy.'", frames: ["I use a ___ to ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u13-l2": {
      objectives: ["I can retell how a simple machine works, faster and smoother each time."],
      trim: {
        "Which group?": 3,
        "Who am I? Back-card game": 5,
        "Classify what we read": 8,
        "A famous inventor": 3,
        "Home talk: the invention they could not live without": 5,
      },
      add: [
        {
          after: "Listen and read (SB 130-131)",
          slide: {
            kind: "writing",
            title: "How a ramp works: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three steps and the closing sentence.",
              "Plan: choose a simple machine from the reading. Fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Next and So to show the order.",
              "Check: tick the checklist. Swap with a partner: they underline First, Next and So and tell you one thing they liked.",
              "Teacher: while they write, look only at the -s after he / she / it and the order words. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The ramp",
              text: "A ramp is a simple machine that helps us move heavy things up. It is a flat board that goes up, like a hill. First, you put one end of the ramp on a truck. Next, you push the box up the board. So you do not need to lift it. A ramp makes the work easier because you use less force. Workers use ramps every day to load boxes.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is the machine? What does it help us do?" },
              { label: "Detail 1: First, ...", prompt: "What do you do first?" },
              { label: "Detail 2: Next, ... So ...", prompt: "What do you do next? What happens because of it?" },
              { label: "Closing", prompt: "Why is it useful? Who uses it?" },
            ],
            frames: ["A ___ is a simple machine that helps us ___.", "First, you ___.", "Next, you ___. So ___.", "A ___ makes the work easier because ___."],
            checklist: [
              "My first sentence says what the machine is and what it helps us do",
              "First, Next and So show the order of the steps",
              "-s after he / she / it: it helps, it makes, it moves",
              "You + a base verb for the steps: you push, you put",
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, using your hands to show the machine.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. An explanation paragraph says what a thing is, how it works in order, and why it helps. Mark only two targets (the -s after it and the order words) with a dot on the line; the child finds and fixes the mistake. This paragraph is also the script for this lesson's recorded talk, 'How my machine works': the child reads it three times, then tells it without the page.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box. Aim for four sentences.", frames: ["A ___ is a simple machine.", "First, you ___. Next, you ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that says what would happen without the machine: 'Without a ramp, workers would have to lift every box.'", frames: ["Without a ___, people would have to ___."] },
            ],
          },
        },
        {
          after: "Draw it, explain it",
          slide: {
            kind: "fluency",
            title: "Machine retell: faster and smoother",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Explain how one machine works three times, to a new partner each time. In every round, both partners tell it. Each round is shorter, smoother and faster.",
            chunks: [
              "This is a ramp. It helps us go up without stairs.",
              "First, you push the box. Next, it goes up the ramp. So the work is easier.",
              "A lever helps us lift heavy things.",
              "It makes the work easier because we push less.",
            ],
            recycle: ["The ___ is made of ___.", "You play it by ___ing."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells how the machine works, then Partner B. Use your drawing. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Use the fixed sentences. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast, then Partner B. The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Look at your drawing from the last activity. Say what the machine is and what it does.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'It help us'), fix them together, then go on.",
              "In each round, Partner A talks, then Partner B talks. The listener has a job: count how many machine words they hear.",
              "In round 3, say it in less time. Keep the order: what it is, how it works, why it helps.",
            ],
            prompts: ["(drawing: ramp)", "(drawing: lever)", "(drawing: wheel and axle)", "First, ... Next, ... So ..."],
            feedback: fixGrammar,
            teacherNote: "The same explanation told three times to new listeners builds fluency, because the speaker is no longer searching for ideas and can speed up. Fluency alone does not fix grammar, so the one-minute correction between round 1 and round 2 matters: the children tell it again with the fixed sentences. Listen for 'it help' (needs -s) and a missing 'so'. Do not add new content between rounds.",
            tiers: [
              { level: "Support", task: "Point to the drawing and say three short sentences with the frames.", frames: ["This is a ___. It helps us ___.", "First, ___. Next, ___."] },
              { level: "Core", task: "Explain it in order without the frames." },
              { level: "Stretch", task: "Add a comparison: 'A ramp is easier than stairs because it is not as steep.'", frames: ["It makes the work easier because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How my machine works",
        prompt: "Choose a simple machine or an invention at home. Show it or draw it. Tell us what it is, how it works, and how it helps.",
        length: "60-90 seconds",
        steps: [
          "Choose one machine or invention and look at it or your drawing.",
          "Practise three times: what it is, how it works (First, Next, So), and how it helps.",
          "Record it once, with a smile. Show the machine to the camera.",
          "Keep going. If you cannot find a word, use other words and do not stop. You can say 'I mean ...' and go on.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell what your machine is, how it works in order, and how it helps. Keep talking without long stops.",
        words: ["lever", "ramp", "wedge", "screw", "wheel and axle", "light bulb", "doorknob", "slide", "axe", "seesaw"],
        grammar: ["A ___ helps us ___.", "First, ... Next, ... So ...", "It makes the work easier because ..."],
        rubric: [
          { label: "How it works", description: "Explains what the machine is and how it works in order, with First, Next and So.", weight: 3 },
          { label: "Machine words", description: "Uses words from the unit, such as lever, ramp, wheel and axle.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops. If a word is missing, uses other words and goes on.", weight: 3 },
          { label: "Verb endings", description: "Says the -s clearly in 'it helps', 'it makes', 'my dad uses'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is a ___. It helps us ___.", "First, ___. Next, ___."], tips: ["Point to each part of the machine as you talk."] },
          { level: "Core", who: "Most children", frames: ["This is a ___. It helps us ___.", "First, you ___. Next, ___. So ___.", "It makes the work easier because ___."], tips: ["Say the steps in order and give a reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Without a ___, people would have to ___.", "A ___ is better than a ___ because ___."], tips: ["Compare your machine with another one and say what life would be like without it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u13-l3": {
      objectives: ["I can agree with a friend fast: 'I do, too.' and 'I don't, either.'"],
      trim: {
        "Stand up if ...": 3,
        "Agreement chain": 5,
        "Fix the sentence": 3,
        "Our big idea": 6,
        "Group the inventions (SB 132 A)": 6,
      },
      add: [
        {
          after: "Finish with too or either (SB 133 F)",
          slide: {
            kind: "writing",
            title: "Me and my cousin: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three agreements and the closing sentence.",
              "Plan: think of a friend or a cousin. Fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Say what your friend does, then agree with too or either.",
              "Check: tick the checklist. Swap with a partner: they underline one too and one either and tell you one thing they liked.",
              "Teacher: while they write, look only at too / either and the helper word. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Me and my cousin",
              text: "My cousin and I think the same about inventions. My cousin uses a tablet every day, and I do, too. She doesn't like loud machines, and I don't, either. She can fix a bike, and I can, too. I could not live without a light bulb, and my cousin couldn't, either. We both think that inventions make our lives easier because they save time.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who is it about? Do you think the same about inventions?" },
              { label: "Detail 1: positive + too", prompt: "Something your friend does, and you do, too." },
              { label: "Detail 2: negative + either", prompt: "Something your friend doesn't do, and you don't, either." },
              { label: "Closing", prompt: "What do you both think about inventions? Why?" },
            ],
            frames: ["My ___ and I think the same about ___.", "My ___ uses a ___, and I do, too.", "My ___ doesn't ___, and I don't, either.", "We both think ___ because ___."],
            checklist: [
              "Positive first: too at the end",
              "Negative first: either at the end",
              "The helper is the same: do / does, can, am / is / are",
              "A comma before 'and' and before too or either",
            ],
            sayIt: "Read your paragraph to your partner. Your partner says 'too' or 'either' before you finish each sentence.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The children have just worked out the too / either rule in the book, so the paragraph makes them use it several times in one text, on a real person they know. Mark only two targets (too or either, and the helper word) with a dot on the line; the child finds and fixes the mistake. This replaces the sentence-combining slide: the sentences are the same, but now they build one opinion.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box. Aim for four sentences.", frames: ["My ___ uses a ___, and I do, too.", "My ___ doesn't ___, and I don't, either."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add one thing you do NOT agree about: 'My cousin likes ramps, but I like slides.'", frames: ["My ___ likes ___, but I ___."] },
            ],
          },
        },
        {
          after: "Silly sentences: agree with me! (SB 133 G)",
          slide: {
            kind: "fluency",
            title: "Agree chain: me, too! me, either!",
            routine: "question chain",
            mode: "groups",
            minutes: 7,
            goal: "Say something, and the next friend agrees fast. Keep the chain going with no long stops!",
            chunks: [
              "My dad uses a ramp every day, and I do, too.",
              "I don't like loud machines, and my friend doesn't, either.",
              "I can ride a bike. I can, too.",
              "I don't have a screwdriver. I don't, either.",
              "My friend went to the science fair, and I did, too.",
            ],
            recycle: ["A ___ is not as ___ as a ___.", "It's as loud as a drum."],
            rounds: [
              { seconds: 90, say: "Slow chain in your group. One child says a sentence, the next agrees, then says a new sentence." },
              { seconds: 75, say: "Same groups, faster. Keep the chain going." },
              { seconds: 60, say: "New groups. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Say one true sentence about you (positive or negative).",
              "The next friend agrees with 'I do, too.' or 'I don't, either.' (the same helper!). Then they say a new sentence.",
              "If your friend is different, say 'I do.' or 'I don't.' and say a different sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together, then go on.",
            ],
            prompts: ["I use ___ every day.", "I don't like ___.", "I can ___.", "I went to ___ yesterday."],
            feedback: fixAgree,
            teacherNote: "The chain makes every child say a sentence and agree many times in a few minutes, which is what makes the helper match automatic (do / does, can, am, did). A wrong helper is the most common slip: 'I can swim, and I do, too.' Prompt with the first helper word and a pause, not the answer. The sentences should be true: children enjoy finding out what they have in common.",
            tiers: [
              { level: "Support", task: "Use the frames and agree with 'I do, too.' or 'I don't, either.'", frames: ["I ___.", "I do, too. / I don't, either."] },
              { level: "Core", task: "Agree with the right helper: can, am, did, do." },
              { level: "Stretch", task: "Agree and add a reason: 'I don't, either, because it is too loud.'", frames: ["I don't, either, because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u13-l4": {
      objectives: ["I can talk about an invention for a minute and a half and say it better each time."],
      trim: {
        "Listen and number (SB 134 A)": 5,
        "Match the machine (SB 134 B)": 4,
        "How inventions make our lives better (SB 135 C)": 8,
        "Hard g sounds (SB 135 D)": 5,
        "Underline and circle (SB 135 E)": 4,
        "Sentence builder": 3,
        "Writing practice (Workbook)": 8,
        "Plan and pitch your invention": 10,
        "Big Question Review (SB 134-135)": 6,
      },
      add: [
        {
          after: "How inventions make our lives better (SB 135 C)",
          slide: {
            kind: "fluency",
            title: "Invention talk 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same talk about one invention to three friends. In every round, both partners talk. Each round is shorter and smoother.",
            chunks: [
              "I think the wheel makes our lives better because it helps us move things.",
              "A ramp and a lever are simple machines that make work easier.",
              "Imagine life without a light bulb. We would have to use candles.",
              "I don't think we could live without a phone, and I don't think my friend could, either.",
            ],
            recycle: ["I use a ___ to ___.", "I do, too. / I don't, either."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A talks about an invention, then Partner B. The listener counts the reasons. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B: fast and smooth! The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Choose one invention. Plan: say what it is, how it helps, and what life would be like without it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together, then go on.",
              "When the bell rings, Partner A has finished and Partner B talks. After both have talked, change partners: move one step to the left.",
              "The listener's job: count the reasons, and ask 'Why?' or 'How does it help?' at the end.",
            ],
            prompts: ["The invention I choose is ...", "It helps us ...", "Without it, we would have to ..."],
            feedback: fixPlural,
            teacherNote: "This is the 4/3/2 routine: the same talk with a shorter time and a new listener each time. It builds fluency; it does not fix errors on its own, so the one-minute correction between round 1 and round 2 is what gives the gain in accuracy. Do not add new content between rounds. Listen for 'A ramp and a lever is' (needs are) and a missing -s on 'inventions'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I think the ___ makes our lives better.", "It helps us ___."] },
              { level: "Core", task: "Talk for the whole time with a reason." },
              { level: "Stretch", task: "Compare two inventions and say what life would be like without both.", frames: ["The ___ and the ___ are both useful because ___.", "Without them, we would have to ___."] },
            ],
          },
        },
        {
          after: "Sentence builder",
          slide: {
            kind: "writing",
            title: "Fix the verb: two things, are or were",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read each sentence. Count the things before the verb. One thing, or two or more?",
              "Write: find the mistake and write the sentence the right way.",
              "Check: read your fixed sentences with the checklist. Then say them aloud.",
            ],
            items: [
              { q: "A ramp and a lever is simple machines.", answer: "A ramp and a lever are simple machines." },
              { q: "My brother and I was at the science fair.", answer: "My brother and I were at the science fair." },
              { q: "The seesaw and the slide is in the playground.", answer: "The seesaw and the slide are in the playground." },
              { q: "A pen, a ruler and a book is on my desk.", answer: "A pen, a ruler and a book are on my desk." },
            ],
            frames: ["A ___ and a ___ are ___.", "___ and I were ___."],
            checklist: ["Two things with 'and': are / were", "One thing alone: is / was", "A capital letter and a full stop"],
            sayIt: "Read your fixed sentences to your partner, then say them again without looking.",
            teacherNote: "Correction is clearer when it focuses on one error type with a short reason. Here it is just the verb after 'and'. In Vietnamese the verb does not change, so 'is' for two things is a very natural mistake. Do item 1 together and say why: two things, so are. The sayIt step makes the fixed form a spoken habit, not only a written one.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the frames." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix, one with two things and one with three." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u13-l5": {
      objectives: ["I can say 'I do, too' and 'I don't, either' about inventions without stopping."],
      trim: { "Agree and run: the invention race": 7, "Remember it!": 4, "Grammar detectives: Is / Is Not": 8 },
      add: [
        {
          after: "Same or different? The invention match",
          slide: {
            kind: "fluency",
            title: "Same talk, new partner: inventions",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same talk three times with new partners. In every round, both partners talk. Each time, agree faster and say it better.",
            chunks: [
              "I use a bike every day, and my dad does, too.",
              "I don't use a microwave, and my friend doesn't, either.",
              "We both think the light bulb is a great invention.",
              "I could not live without a phone, and I don't think you could, either.",
            ],
            recycle: ["I'd like to try the ___ because ...", "Its ___ is made of ___."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells two things they use and one they don't, then Partner B. The listener agrees, or says 'Really? I do.' Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Same talk, same ideas, in less time. Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Same talk once more, as smooth as you can! Partner A, then Partner B." },
            ],
            steps: [
              "Plan: choose two inventions you use and one you do not use.",
              "Partner A says three sentences, then Partner B says three. The listener agrees with 'too' or 'either', or says they are different.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes on the board (no names), then go on with round 2.",
              "In round 3, finish with a 'We both ...' sentence. How many things do you have in common?",
            ],
            prompts: ["I use a ___ every day.", "I don't use a ___.", "Really? I do. / I do, too.", "We both ___."],
            feedback: fixAgree,
            teacherNote: "Task repetition: the same task again with a new partner means the speaker can pay attention to form and speed, because the ideas are already there. Mix the pairs so no one repeats with the same friend. In rounds 2 and 3 the children should sound more natural. Listen for the helper (do, does, am, can) matching the first sentence, and for the word order of 'We both ...'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and agree with 'I do, too.' or 'I don't, either.'", frames: ["I use a ___.", "I do, too. / I don't, either."] },
              { level: "Core", task: "Say three sentences and agree with the right helper." },
              { level: "Stretch", task: "Add a reason to every agreement: 'I do, too, because it saves time.'", frames: ["I do, too, because ___.", "I don't, either, so ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Read, then write: two friends and inventions",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: read the model. Underline the words 'too', 'either' and 'both'. Then jot three key words about you and a friend.",
              "Write: write a short paragraph of four sentences about you and a friend. Use too, either and both, and finish with a 'We both ...' sentence.",
              "Check: use the checklist. Then read your sentences aloud to your partner.",
            ],
            text: {
              title: "Me and my cousin",
              text: "My cousin and I use a bike every day, and my dad does, too. My mom doesn't ride a bike, and my brother doesn't, either. We all use a light bulb at night because we like to read. We both think the wheel is a great invention.",
            },
            frames: ["My ___ uses ___, and I do, too.", "My ___ doesn't ___, and I don't, either.", "We both ___."],
            checklist: ["Positive first: too. Negative first: either", "The helper matches the first sentence", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your three sentences to your partner. Then say them without looking.",
            teacherNote: "A short model, then a short piece of writing in the same pattern: children copy a pattern they have just read. This is a warm-up for the longer champion paragraph that follows, so keep it to four sentences. Praise the helper match ('does' after 'dad') and listen for a clear spoken 'either'.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill it in, then write one more sentence." },
              { level: "Core", task: "Write four sentences with too, either and both." },
              { level: "Stretch", task: "Write five sentences and add one 'because' reason.", frames: ["I do, too, because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Me, too! Me, either! An invention talk",
        prompt: "Talk to a grown-up or a brother or sister about inventions. Say what you use and don't use, and agree or say you are different. Show the inventions!",
        length: "60-90 seconds",
        steps: [
          "Choose three inventions. Say one sentence about each: I use it or I don't use it.",
          "Practise three times with someone at home: they agree with 'too' or 'either', or say they are different.",
          "Record it once. Keep going. If you cannot find a word, use other words and do not stop.",
          "Say one sentence about what you have in common: 'We both ...'.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you use and don't use. Use too and either correctly, and keep talking without long stops.",
        words: ["lever", "ramp", "light bulb", "wheel and axle", "invention", "useful"],
        grammar: ["___, and I do, too.", "___ doesn't ___, and I don't, either.", "We both ___."],
        rubric: [
          { label: "Too and either", description: "Uses 'too' after a positive sentence and 'either' after a negative one, with the right helper.", weight: 3 },
          { label: "Inventions and reasons", description: "Talks about three inventions with at least one reason.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops. If a word is missing, uses other words and goes on.", weight: 3 },
          { label: "Clear sounds", description: "Says 'either' and the final -s of 'uses', 'doesn't' and 'inventions' clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I use a ___, and my ___ does, too.", "I don't use a ___, and my ___ doesn't, either."], tips: ["Hold up each invention as you say it."] },
          { level: "Core", who: "Most children", frames: ["My ___ uses a ___, and I do, too.", "My ___ doesn't ___, and I don't, either, because ___.", "We both ___."], tips: ["Check that the helper matches the first sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I could not live without a ___, and I don't think you could, either.", "Before ___ was invented, people ___."], tips: ["Add what life was like before the invention."] },
        ],
      },
    },
  },
};
