import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 18 "The Gingerbread
// Man" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7. Every lesson
// gets one fluency routine (the unit's action words, story order and should / shouldn't said
// again and again as whole sentences, a little faster each round, with Unit 17's phrases
// mixed back in) and one short writing routine (say it, write it, read it back). Every other
// lesson ends with a recorded talk for home, built on the routine the class just did. Time
// comes from games and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, or hold up a finger for the missing word) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

const verbS =
  " In this lesson: for 'The cookie run away.' hold up one finger for the missing -s and start 'The cookie runs ...?'. For 'I use my hand to catch.' point to the frame and say 'hands' with a strong -s. If a child says 'I smell with my nose' for 'I use my nose to smell', accept it: the meaning is right.";

const shouldFix =
  " In this lesson: for 'She should to close' or 'He shoulds run' point to the frame 'He should ___' and tap the word after should: 'should, then the plain verb'. For 'You not should stay', start 'You should...n't?' and pause. Say 'shouldn't' slowly once, then let the child echo it.";

export const odL1U18Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u18-l1": {
      objectives: ["I can say 'I use my hands to catch.' and 'Can you run? Yes, I can.' fast, without stopping."],
      trim: { "Run and touch": 5, "Bake a cookie in order": 5, "Hands, nose or feet? (SB 176 B)": 8 },
      add: [
        {
          after: "What do you use?",
          slide: {
            kind: "fluency",
            title: "Action sprint: hands, nose, feet",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I use my hands to catch.", "I use my nose to smell.", "I use my feet to run away.", "Can you run? Yes, I can.", "Can you bake? No, I can't."],
            recycle: ["A toy cat doesn't breathe.", "Does it move? Yes, it does."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher mimes an action, the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one mimes, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Watch the mime. Say a WHOLE sentence: 'I use my hands to catch.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute: write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(mime: catch)", "(mime: smell)", "(mime: run away)", "(mime: open)", "(mime: bake)"],
            feedback: correct + verbS,
            teacherNote: "Whole sentences only, never single words: 'I use my feet to run away' should come out as one smooth piece. The mime keeps the meaning in the body, so the sentence is not just a sound. Mix in one Unit 17 card ('Does it move?') every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I use my ___ to ___.", "Can you ___? Yes, I can."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second action: 'I use my feet to run and my hands to catch.'", frames: ["I use my ___ to ___ and my ___ to ___."] },
            ],
          },
        },
        {
          after: "Learn: story order (SB 177 C)",
          slide: {
            kind: "writing",
            title: "My body helps me: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Point to hands, nose and feet.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with I use my.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the -s on hands, feet and verbs. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: My body", text: "I use my hands to catch a ball. I use my nose to smell the cookies. I use my feet to run fast!" },
            organiser: [
              { label: "Hands", prompt: "Draw your hands. What do you catch, open or hold?" },
              { label: "Nose", prompt: "Draw your nose. What do you smell?" },
              { label: "Feet", prompt: "Draw your feet. Where do you run?" },
            ],
            frames: ["I use my hands to ___.","I use my nose to ___.","I use my feet to ___."],
            checklist: ["Three sentences: hands, nose and feet","A capital letter at the start and a full stop at the end","hands, feet: the -s is there"],
            sayIt: "Read your paragraph to your partner. Then say it again without looking.",
            teacherNote: "A first paragraph for six- and seven-year-olds: three short sentences about the child's own body, planned by drawing, so no notes are needed. The three frames are the three sentences; children may copy and complete them. It replaces the earlier expand-it slip: the bigger sentences now grow inside the frames (to catch a ball, to run fast). Mark only two things (capital letters, the -s on hands and feet) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["I use my hands to ___.","I use my feet to ___."] },
              { level: "Core", task: "Write three sentences: hands, nose and feet." },
              { level: "Stretch", task: "Add a fourth sentence: I use my eyes to ___." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u18-l2": {
      objectives: ["I can tell The Gingerbread Man in order, faster each time."],
      trim: { "Little cookie, run!": 4, "Can a cookie run?": 4, "Yellow word hunt": 4, "Chase and freeze": 4, "Sleepy fairy tale": 3 },
      add: [
        {
          after: "Tell the story in order",
          slide: {
            kind: "fluency",
            title: "Cookie story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["First, the old woman bakes a cookie.", "Next, the cookie runs away.", "Then the cow and the horse chase him.", "At the end, the fox catches him.", "The cookie says, 'You can't catch me!'"],
            recycle: ["A cookie can run in a story.", "It doesn't breathe."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the four picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Next, three for Then and four for At the end.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
              "Teacher: after round 1, stop for one minute: write two sentences you heard with a mistake on the board; the class fixes them; then go on.",
            ],
            prompts: ["(picture: the oven)", "(picture: the cookie runs)", "(picture: animals chase)", "(picture: the fox)"],
            feedback: correct + verbS,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Listen for the -s on bakes, runs, chases and catches: Vietnamese has no verb ending, so it drops out often. Keep the four picture cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, ___.", "Next, ___.", "Then ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add what someone says: 'Can you catch me?' 'No, I can't!'" },
            ],
          },
        },
        {
          after: "Beginning, middle, end",
          slide: {
            kind: "writing",
            title: "My gingerbread story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to First, Next, Then and At the end.",
              "Plan: look at your drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with First, Next, Then or At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every -s on a verb.",
              "Teacher: look only at capital letters and the -s on bakes, runs and catches. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The cookie", text: "First, the old woman bakes a cookie. Next, the cookie runs away from her. Then the cow and the horse chase him. At the end, the fox catches the cookie!" },
            organiser: [
              { label: "First", prompt: "Draw the old woman and the cookie. What does she do?" },
              { label: "Next and Then", prompt: "Draw the cookie running. Who chases him?" },
              { label: "At the end", prompt: "Draw the fox. What does he do?" },
            ],
            frames: ["First, the old woman ___ a cookie.","Next, the cookie ___ away.","Then the ___ chase him.","At the end, the fox ___ the cookie!"],
            checklist: ["Four sentences in order: First, Next, Then, At the end","A capital letter at the start and a full stop or ! at the end","bakes, runs, catches: the -s is there"],
            sayIt: "Read your story to your partner in a story voice. Then tell it again without looking.",
            teacherNote: "A second paragraph for six- and seven-year-olds: four short sentences, one for each part of the play, planned by drawing. Children may copy and complete the frames. It replaces the earlier dictogloss; the class still hears the story twice in Listen and read and tells it again in the retell. This paragraph is also the script for the recorded talk at home. Mark only two things (capital letters, the -s on bakes, runs and catches) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["First, the old woman ___ a cookie.","At the end, the fox ___ the cookie!"] },
              { level: "Core", task: "Write four sentences: First, Next, Then and At the end." },
              { level: "Stretch", task: "Add what the cookie says: The cookie says, 'You can't catch me!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My gingerbread story",
        prompt: "Tell The Gingerbread Man at home in four parts: First, Next, Then and At the end. Show a cookie, a toy or your drawing!",
        length: "30-60 seconds",
        steps: [
          "Look at your picture cards or draw four boxes.",
          "Say the story three times to a toy or a grown-up. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 120,
        kidSummary: "Tell First, Next, Then and At the end, and keep talking without long stops.",
        words: ["bake", "run away", "chase", "catch", "open", "smell"],
        grammar: ["First / Next / Then / At the end", "The cookie runs. The fox catches him."],
        rubric: [
          { label: "Story order", description: "Tells the story in order: first, next, then, at the end.", weight: 3 },
          { label: "Action words", description: "Uses words from the unit: bake, run away, chase, catch, open.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on bakes, runs and chases can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Next, ___.", "At the end, ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the old woman bakes ___.", "Next, the cookie runs away.", "Then ___ chase him.", "At the end, ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["'Can you catch me?' 'No, I can't!'", "My favorite part is ___ because ___."], tips: ["Add what the people say, and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u18-l3": {
      objectives: ["I can say what someone should and shouldn't do, fast, round the circle."],
      trim: { "Look and cross": 4, "Chase, catch, stop": 4, "Red card, green card": 6, "Sing: Run Away! (SB 181 D)": 6, "Put the pictures in order (SB 180 B)": 5 },
      add: [
        {
          after: "Look and practice (SB 181 E)",
          slide: {
            kind: "fluency",
            title: "Advice chain: What should he do?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["What should he do?", "He should stop.", "He shouldn't talk to the fox.", "She should close the door.", "You shouldn't run on the road."],
            recycle: ["A cat can run.", "A toy cat can't breathe."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds a picture card (a problem)." },
              { seconds: 45, say: "Swap cards. Go faster!" },
              { seconds: 40, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so your friend can see the picture.",
              "Ask the friend on your left: 'What should he do?' (or she / it).",
              "They answer with should or shouldn't. Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: a hot oven)", "(card: a busy road)", "(card: a hungry cookie)", "(card: a sleepy girl)", "What should he do?"],
            feedback: correct + shouldFix,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'should / shouldn't + plain verb' automatic. Time the whole circle and tell them; children love beating their own time. There is no -s after should for he or she: listen for 'he shoulds'.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["He should ___.", "He shouldn't ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add because: 'He shouldn't run on the road. It's busy!'", frames: ["He should ___ because ___."] },
            ],
          },
        },
        {
          after: "Help the gingerbread man",
          slide: {
            kind: "writing",
            title: "Fix the advice sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a capital letter, a full stop, or a wrong word after should.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "She should to close the door.", answer: "She should close the door." },
              { q: "He shoulds run fast.", answer: "He should run fast." },
              { q: "You not should stay.", answer: "You shouldn't stay." },
              { q: "the fox should stop", answer: "The fox should stop." },
            ],
            checklist: ["should + the plain word (no 'to', no -s)", "shouldn't for a bad idea", "A capital letter and a full stop"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "These are three slips children often make with should: adding 'to', adding -s, and putting 'not' before it. Fix item 1 together first. Two or three kinds of mistake at a time is plenty at this age.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 4 with the frame on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u18-l4": {
      objectives: ["I can say how I should take care of myself three times, faster each time."],
      trim: { "Early bird, sleepy owl": 3, "Six words in action": 4, "Healthy or junk? Early or late?": 6, "Who tells you? (SB 182 Think and C)": 4 },
      add: [
        {
          after: "Advice at school (SB 183 E)",
          slide: {
            kind: "fluency",
            title: "Care talk: same talk, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same care talk to three friends. Each time is smoother.",
            chunks: ["I should go to bed early.", "I should eat healthy food.", "I shouldn't eat junk food every day.", "I should play outside.", "You should go to bed early, too!"],
            recycle: ["He should stop.", "She shouldn't talk to the fox."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your care talk. The listener ticks the good ideas on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk, a little faster." },
              { seconds: 40, say: "Partner 3: smooth and strong! The listener says 'Good idea!' at the end." },
            ],
            steps: [
              "Choose three sentences from the board. Say them in the order you like.",
              "Teacher: after round 1, stop for one minute: write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same talk again. Do not add new words; just say it better.",
            ],
            feedback: correct + shouldFix,
            teacherNote: "Same task, new listener each time: this is task repetition. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix is what makes the second talk more accurate too. Listen for 'I should to go' and for the missing -n't.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I should ___.", "I shouldn't ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add advice for a friend: 'You should go to bed early, too!'" },
            ],
          },
        },
        {
          after: "Word detectives (SB 183 G)",
          slide: {
            kind: "writing",
            title: "Join my care sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner with a strong voice.",
            ],
            items: [
              { q: "I should go to bed early. I should play outside. (and)", answer: "I should go to bed early and play outside." },
              { q: "We should eat healthy food. We should play outside. (and)", answer: "We should eat healthy food and play outside." },
              { q: "My cat should eat. My cat should sleep. (and)", answer: "My cat should eat and sleep." },
            ],
            checklist: ["Only one 'should' in my sentence", "'and' joins the two ideas", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I should'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'I should eat healthy food, play outside and go to bed early.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How I take care of myself",
        prompt: "Show your bed, your fruit or your shoes. Tell us what you should do and what you shouldn't do to take care of yourself.",
        length: "30-60 seconds",
        steps: [
          "Choose two things you should do and one you shouldn't do.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Show your things to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say what you should do, what you shouldn't do, and keep talking without long stops.",
        words: ["go to bed", "play outside", "early", "late", "healthy food", "junk food"],
        grammar: ["I should ___.", "I shouldn't ___.", "should + plain verb"],
        rubric: [
          { label: "Should and shouldn't", description: "Says at least one thing with should and one with shouldn't, with a plain verb after.", weight: 3 },
          { label: "Care words", description: "Uses words from the unit: go to bed, play outside, healthy food, junk food.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Clear sounds", description: "The -n't in shouldn't can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I should ___.", "I shouldn't ___."], tips: ["Point to each picture or thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["I should go to bed ___.", "I should eat ___ food.", "I shouldn't eat ___ every day."], tips: ["Say early or late."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I should ___ because ___.", "You should ___, too!"], tips: ["Say why, and give a friend advice."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u18-l5": {
      objectives: ["I can say what living and nonliving things can and can't do, and how we should take care of them."],
      trim: { "Living, not living": 3, "Gus says": 4, "Hoop Venn (SB 185 B)": 5, "Our Big Question Chart (SB 185 Big Question C)": 5, "Big Question video (SB 185 Big Question A)": 3 },
      add: [
        {
          after: "Tell the class (SB 185 C)",
          slide: {
            kind: "fluency",
            title: "Venn talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same Venn talk to three friends. Each talk is shorter and smoother.",
            chunks: ["A cat is living. A toy cat is nonliving.", "A cat can run and breathe.", "A toy cat can't breathe.", "Both are soft.", "We should take care of living things."],
            recycle: ["He should stop.", "I should go to bed early."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your Venn talk. The listener counts the 'can' sentences on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Yes!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first. Look at your Venn diagram.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct + " In this lesson: for 'A toy cat can breathe' check the picture with the child and prompt 'A toy cat can ...?' with a finger. Say 'can't' clearly, because 'can' and 'can't' sound close.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds. Listen for 'can't' versus 'can' and for 'a cat is' (the be-word children often skip).",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["A ___ can ___.", "A ___ can't ___."] },
              { level: "Core", task: "Say four sentences without the board." },
              { level: "Stretch", task: "Add a care sentence: 'We should take care of living things. We shouldn't run with them!'" },
            ],
          },
        },
        {
          after: "Look at all the diagrams (SB 185 D)",
          slide: {
            kind: "writing",
            title: "My Venn paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the living thing, the nonliving thing and the care sentence.",
              "Plan: look at your Venn diagram and your three drawings. Say one sentence for each box to your partner.",
              "Write: use the frames. Say living or nonliving, and can or can't.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and can or can't matching the diagram. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: Frog and ball", text: "A frog is living and it can jump. A ball is nonliving and it can't breathe. Both are fun. We should take care of frogs." },
            organiser: [
              { label: "Living", prompt: "Draw your living thing. What can it do?" },
              { label: "Nonliving", prompt: "Draw your nonliving thing. What can't it do?" },
              { label: "Both and care", prompt: "Draw what is the same. Then draw how we take care of the living thing." },
            ],
            frames: ["A ___ is living and it can ___.","A ___ is nonliving and it can't ___.","Both are ___.","We should take care of ___."],
            checklist: ["Four sentences: living, nonliving, both, care","can or can't: it matches my diagram","A capital letter at the start and a full stop at the end"],
            sayIt: "Show your diagram to your partner and read your paragraph. Then say it again without looking.",
            teacherNote: "A description paragraph built straight from the child's own Venn diagram, so the content is already there and the drawings are the plan. Four short sentences, one frame each; children may copy and complete them. The last sentence uses the unit's should from Lesson 3. It replaces the earlier model-then-write slip. Mark only two things (capital letters, can or can't matching the diagram) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your words.", frames: ["A ___ is living and it can ___.","A ___ is nonliving and it can't ___."] },
              { level: "Core", task: "Write all four sentences with the frames." },
              { level: "Stretch", task: "Add a because: We should take care of frogs because they are living." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u18-l6": {
      objectives: ["I can say should and shouldn't sentences fast and right, without looking."],
      trim: { "Remember it!": 5, "Grammar mystery: Pim the little bird": 5, "Help Pim get home": 8, "Pet problems and good advice": 10 },
      add: [
        {
          after: "Pet problems and good advice",
          slide: {
            kind: "fluency",
            title: "Champion sprint: should and shouldn't",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["The baby bird should eat.", "Pim shouldn't stay in the nest.", "You should wear a hat in the sun.", "He shouldn't touch the hot oven.", "We should take care of our pets."],
            recycle: ["I should go to bed early.", "A toy cat can't breathe."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a picture, the class says the sentence." },
              { seconds: 45, say: "Side A says the good idea, side B says the not-good idea. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 2, stop for one minute: fix the two mistakes you heard most on the board; then go on.",
            ],
            prompts: ["(card: baby bird)", "(card: Pim in the nest)", "(card: hot sun)", "(card: hot oven)", "(card: a pet)"],
            feedback: correct + shouldFix,
            teacherNote: "A quick, high-energy recall of Units 17 and 18 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. Watch the three should slips: 'to', '-s' and 'not should'.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["___ should ___.", "___ shouldn't ___."] },
              { level: "Core", task: "Say the sentence without the board." },
              { level: "Stretch", task: "Add because: 'He shouldn't touch the oven because it's hot!'" },
            ],
          },
        },
        {
          after: "Write advice for Pim",
          slide: {
            kind: "writing",
            title: "Grow my advice sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add what, where or a describing word.",
              "Write your big sentence. Read it aloud together.",
            ],
            items: [
              { q: "Pim should eat. (add: the red seeds)", answer: "Pim should eat the red seeds." },
              { q: "You should wear a hat. (add: in the sun)", answer: "You should wear a hat in the sun." },
              { q: "I shouldn't run. (add: on the road)", answer: "I shouldn't run on the road." },
              { q: "The puppy should sleep. (add: little)", answer: "The little puppy should sleep." },
            ],
            frames: ["___ should ___ the ___.", "___ shouldn't ___ on the ___."],
            checklist: ["should / shouldn't + the plain verb", "A capital letter and a full stop", "Does my big sentence still make sense?"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences, one with should and one with shouldn't." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Advice for my pet or toy",
        prompt: "Choose a pet or a toy. Show it to the camera. Tell us what it should do and what it shouldn't do.",
        length: "30-60 seconds",
        steps: [
          "Choose your pet or toy. Think of two good ideas and one not-good idea.",
          "Practise your advice three times.",
          "Record it once. Show your pet or toy as you talk.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say what your pet or toy should and shouldn't do, and keep talking without long stops.",
        words: ["pet", "should", "shouldn't", "eat", "sleep", "play outside"],
        grammar: ["He / She / It should ___.", "He / She / It shouldn't ___.", "should + plain verb, no -s"],
        rubric: [
          { label: "Should and shouldn't", description: "Says both a should and a shouldn't sentence, with a plain verb after, no 'to' and no -s.", weight: 3 },
          { label: "About my pet", description: "Gives advice that fits the pet or toy.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Clear sounds", description: "The -n't in shouldn't can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My ___ should ___.", "My ___ shouldn't ___."], tips: ["Hold up your pet or toy."] },
          { level: "Core", who: "Most children", frames: ["My ___ should ___ and ___.", "My ___ shouldn't ___.", "I should ___, too."], tips: ["Say two good ideas and one not-good idea."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My ___ should ___ because ___.", "We should take care of our ___."], tips: ["Say why, and say how you take care of it."] },
        ],
      },
    },
  },
};
