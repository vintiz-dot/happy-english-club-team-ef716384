import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 12 "Reuse and
// Recycle" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's phrases said again and again as
// whole sentences, a little faster each round, with Unit 11's place words mixed back in)
// and one short writing routine (say it, write it, read it back). Lessons 2, 4 and 6 end
// with a recorded talk for home, built on the routine the class just did (Lesson 5
// already has its own video). Time comes from games, chants and repeats, never from the
// book pages or the grammar. All text is original.

const fix = (example: string) =>
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them; children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: " +
  example +
  " For a sound, just say it right and let the child echo it. Say every final sound clearly yourself (-s, -ed, -t): children copy what they hear.";

const grownUp = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U12Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u12-l1": {
      objectives: ["I can say sentences with the new recycling words fast, without stopping."],
      trim: { "Reuse and recycle chant": 3, "Mystery bag: what do you notice?": 5, "Freeze and act (TPR)": 4, "Pass the bag and What's missing?": 5 },
      add: [
        {
          after: "Tell me about these things",
          slide: {
            kind: "fluency",
            title: "Word sprint: say the whole sentence",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say each whole sentence, fast and smooth, with no stops.",
            chunks: [
              "I keep my diary on the shelf.",
              "I can blow a big bubble.",
              "The carton goes to the recycling plant.",
              "I buy paper at the stationery store.",
              "The machine is loud!",
            ],
            recycle: ["The bin is behind the tree.", "The shop is across from the park."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence, not just the word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class; then go on.",
            ],
            prompts: ["(card: diary and shelf)", "(card: bubble)", "(card: carton)", "(card: stationery store)", "(card: machine)"],
            feedback: fix("point to the frame on the board, or start the phrase and pause ('I keep my diary ...?'). If a child says 'on shelf', hold up a finger for the missing 'the'. Sounds: for 'machine' say ma-SHEEN and let the child echo."),
            teacherNote: "Whole sentences only: the aim is 'I keep my diary on the shelf' as one smooth piece, not nine single words. Listen for the missing the, the dropped -s in plurals, and 'machine' said with a ch sound instead of sh. Mix in last unit's place phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I keep my ___ on the shelf.", "I can blow ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I keep my diary on the shelf because it is safe there.'", frames: ["I ___ because ___."] },
            ],
          },
        },
        {
          after: "What is a setting? (SB 117 C)",
          slide: {
            kind: "writing",
            title: "My thing on the shelf: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to what the thing is, where it is and what you do with it.",
              "Plan: fill the boxes with a drawing or a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: four or five sentences, one for each box. Use and and because to join your ideas.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and one grammar target. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My diary",
              text: "I have a blue diary. It is on the shelf in my room. I use it every night, and I draw pictures in it, too. I like it because it is my favorite thing. I love my diary!",
            },
            organiser: [
              { label: "My thing", prompt: "Draw one thing you keep. Say: I have a ___." },
              { label: "Where", prompt: "Draw the shelf or the place. Say: It is on the ___." },
              { label: "What I do", prompt: "Draw yourself using it. Say what you do with it." },
              { label: "Why I like it", prompt: "Draw a happy face. Say: I like it because ___." },
            ],
            frames: ["I have a ___ ___.","It is on the ___ in my ___.","I use it every day, and I ___.","I like it because ___."],
            checklist: ["Four or five sentences: my thing, where it is, what I do, why I like it","A capital letter at the start and a full stop at the end of every sentence","my, a and the: no small word is missing"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph about a thing the child knows well, planned with pictures. Vietnamese has no a / an / the, so say each sentence aloud before it is written and mark missing small words with a dot. Use the nine recycling words where they fit (shelf, diary, paper, stationery store). The expand-it practice (adding a describing word before the noun) now happens inside the frames and the model.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in one word in each.","frames":["I have a ___ ___.","It is on the ___.","I like it because ___."]},
              {"level":"Core","task":"Write four or five sentences, one for each box."},
              {"level":"Stretch","task":"Add a sentence with but: 'It is small, but I like it.'"},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u12-l2": {
      objectives: ["I can retell the carton's journey three times, faster each time."],
      trim: { "Where is the carton? Journey chant": 3, "Setting tracker: where, when, how does it feel? (Organize)": 9, "Talk about litter and recycling": 6, "A bottle's journey: story strip": 10 },
      add: [
        {
          after: "Setting tracker: where, when, how does it feel? (Organize)",
          slide: {
            kind: "fluency",
            title: "Carton journey: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same journey three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the carton is on the shelf.",
              "Then someone puts it in the bin.",
              "Next, it goes to the recycling plant.",
              "At the end, the machines make it into new paper.",
            ],
            recycle: ["Where's the bin? It's behind the tree.", "The shop is across from the park."],
            rounds: [
              { seconds: 60, say: "Tell your partner the journey. Use the four picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four picture cards in order. Say one sentence for each card.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and counts how many steps on their fingers.",
            ],
            prompts: ["(picture: carton on a shelf)", "(picture: carton in a bin)", "(picture: recycling plant)", "(picture: new paper)"],
            feedback: fix("start the phrase and pause ('Then someone put...?') or hold up a finger for the missing -s in 'puts' and 'goes'. Repeat the error with a rising voice ('She go to the plant?') and let the child say it again."),
            teacherNote: "Same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The fix between rounds 1 and 2 is what turns speed into accurate speed. Listen for the missing -s on goes and puts, and for 'in the bin' said without 'the'.",
            tiers: [
              { level: "Support", task: "Point to each card and say its sentence with the frame.", frames: ["First, the ___ is ___.", "Then ___.", "Next, it goes to ___."] },
              { level: "Core", task: "Tell all four steps without the frames." },
              { level: "Stretch", task: "Add how the carton feels: 'At the end, it is happy because it is useful again.'" },
            ],
          },
        },
        {
          after: "Why? Think boxes and talk (SB 118-119)",
          slide: {
            kind: "writing",
            title: "A carton's journey: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to first, then, next and at the end.",
              "Plan: fill the boxes with a drawing or a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with First, Then, Next, At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every -s on goes and puts.",
              "Teacher: look only at capital letters and one grammar target. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: A bottle's journey",
              text: "First, a bottle is in the park. Then a girl puts it in the bin, and a truck takes it away. Next, it goes to the recycling plant. At the end, the bottle is a new blue bag, and the girl feels happy!",
            },
            organiser: [
              { label: "First", prompt: "Draw the carton or bottle. Where is it?" },
              { label: "Then", prompt: "Draw who takes it. What happens?" },
              { label: "Next", prompt: "Draw the machine or the plant. Where does it go?" },
              { label: "At the end", prompt: "Draw the new thing. How does it feel?" },
            ],
            frames: ["First, the ___ is in the ___.","Then ___ puts it in the ___.","Next, it goes to the ___.","At the end, it is a new ___."],
            checklist: ["Four sentences in order: First, Then, Next, At the end","A capital letter at the start and a full stop at the end of every sentence","puts, goes, takes: the -s is there for he / she / it"],
            sayIt: "Read your journey to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "The paragraph retells the carton's journey with joining words, so it also uses the sentence-combining idea (then, and, because). Children plan with four drawings, so no notes are needed. Mark only capital letters and the -s on he / she / it verbs. This paragraph is the script for the recorded talk at home, 'My carton's journey': the child tells it in four steps.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in one word in each.","frames":["First, the ___ is in the ___.","At the end, it is a new ___."]},
              {"level":"Core","task":"Write four sentences, one for each box."},
              {"level":"Stretch","task":"Add a fifth sentence with because: 'The girl feels happy because the park is clean.'"},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My carton's journey",
        prompt: "Choose a carton, a bottle or a piece of paper at home. Tell its journey in four steps: first, then, next and at the end. Show the thing to the camera!",
        length: "45-90 seconds",
        steps: [
          "Look at your story strip from class, or draw four small pictures.",
          "Tell the journey three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Show the thing and smile.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the journey in four steps, say where the thing is each time, and keep talking without long stops.",
        words: ["carton", "paper", "shelf", "machine", "recycling plant", "rescue"],
        grammar: ["First / Then / Next / At the end", "It goes to the ___. (the -s on goes)", "It is on / in / next to the ___."],
        rubric: [
          { label: "Four steps", description: "Tells the journey in order with first, then, next and at the end.", weight: 3 },
          { label: "Place words", description: "Says where the thing is with on, in, behind or next to.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Verb endings", description: "The -s on goes and puts can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the ___ is ___.", "Then ___.", "At the end, ___."], tips: ["Point to each picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the ___ is on the ___.", "Then it goes to the ___.", "Next, ___.", "At the end, it is a new ___."], tips: ["Say where the thing is in every step."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It feels ___ because ___.", "I think recycling is good because ___."], tips: ["Say how the thing feels and why recycling is important."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u12-l3": {
      objectives: ["I can ask 'Is there a ___ under the ___?' and answer fast, round the circle."],
      trim: { "Where's my hat? Place chant": 3, "Hide the toy: guess where it is": 6 },
      add: [
        {
          after: "Where is it? Look at the recycling picture (SB 121)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is there a ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Where's the bin?",
              "It's next to the tree.",
              "Is there a bottle under the bench?",
              "Yes, there is.",
              "No, there isn't. There's a bottle behind the bin.",
            ],
            recycle: ["The shop is across from the park.", "I keep my diary on the shelf."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card that shows one thing and a place (a bottle under a bench)." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Is there a ___ under / behind / next to the ___?'",
              "They answer: 'Yes, there is.' or 'No, there isn't. There's a ___ ...' Then they turn and ask the next friend.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then do the faster rounds.",
            ],
            prompts: ["Is there a ___ + place word + the ___?", "Where's the ___?"],
            feedback: fix("point to the frame, or start the answer and pause ('Yes, there ...?'). If a child says 'Yes, it is' or 'There have', hold up a finger and say 'Yes, there ...?' with a rising voice. Pronunciation: say 'isn't' clearly, with the final t, and let the child echo."),
            teacherNote: "The chain gives every child many turns at asking AND answering in a few minutes, which is what makes 'Is there a ...?' automatic. Vietnamese children often say 'There have' (from 'có') and 'Yes, it is'; give the right form quickly and move on. Time the whole circle and tell them: children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, there is.' or 'No, there isn't.' and pass the question on with the frame on the board.", frames: ["Is there a ___ ___ the ___?", "Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "After 'No, there isn't.' say where it is: 'There's a bottle in front of the bin.'" },
            ],
          },
        },
        {
          after: "Three things: where are they? (SB 121 F)",
          slide: {
            kind: "writing",
            title: "My favorite place: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to every place word (in, on, next to, behind).",
              "Plan: fill the boxes with a drawing or a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: four or five sentences, one for each box. Use place words to say where things are.",
              "Check: tick the checklist. Your partner points to every place word and checks it with the picture.",
              "Teacher: look only at capital letters and one grammar target. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My room",
              text: "My room is small, but I love it. My bed is next to the window. There is a shelf behind the door, and my books are on it. Is there a toy in my room? Yes, there is!",
            },
            organiser: [
              { label: "My place", prompt: "Draw your room or your classroom. Say: My ___ is ___." },
              { label: "Big things", prompt: "Draw two big things. Say where they are: next to, behind, under." },
              { label: "Small things", prompt: "Draw some small things, like books. Say where they are." },
              { label: "My question", prompt: "Draw one more thing. Write: Is there a ___ in my ___?" },
            ],
            frames: ["My ___ is ___.","The ___ is next to the ___.","There is a ___ behind the ___.","Is there a ___ in my ___? Yes, there is!"],
            checklist: ["Four or five sentences: my place, big things, small things, my question","A capital letter at the start and a full stop or ? at the end of every sentence","next to, behind, under: the place word and the small word after it are right"],
            sayIt: "Read your paragraph to your partner. Your partner points to the picture for every place word.",
            teacherNote: "The unit's place words and Is there ...? questions in one short text. Typical slips to dot: 'behind of', 'next the', 'There have' and 'Yes, it is' for 'Is there ...?'. Children ask the question in the last sentence and answer it in the same sentence, which keeps the paragraph short. Mark only capital letters and the place words.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in one word in each.","frames":["My ___ is ___.","The ___ is next to the ___.","There is a ___ behind the ___."]},
              {"level":"Core","task":"Write four or five sentences, one for each box."},
              {"level":"Stretch","task":"Add a sentence with but or because: 'My room is small, but it is clean.'"},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u12-l4": {
      objectives: ["I can say what I usually do, what I did and what I am doing now."],
      trim: { "Tick-tock clock chant": 3, "Set the clock game": 4, "Ball game: go, went, going": 4 },
      add: [
        {
          after: "Write the correct verb form (SB 123 F)",
          slide: {
            kind: "fluency",
            title: "Time talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same time talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "We usually recycle paper on Friday.",
              "Last week I went to the park.",
              "I cleaned the benches.",
              "Now I'm putting a bottle in the bin.",
            ],
            recycle: ["Is there a bench under the tree? Yes, there is.", "We reduce trash."],
            rounds: [
              { seconds: 60, say: "Partner 1: give your time talk. The listener counts the verbs on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener asks one question: 'Did you ...?'" },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'I go' for 'I went', or 'recycle' for 'recycled') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fix("start the phrase and pause ('Last week I w...?'), or say the error back with a rising voice ('I goed?') and let the child try again. For -ed, hold up a finger at the end of the word. Sounds: model 'cleaned' with a clear d and 'recycled' with a clear d, and let the child echo."),
            teacherNote: "Same talk, less time, new listener: this is the 4/3/2 activity scaled for seven-year-olds. The fix between rounds 1 and 2 matters most here because the past tense is where children slip: Vietnamese verbs do not change for time, so 'Yesterday I go' and the dropped -ed are expected. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["We usually ___.", "Last week I ___.", "Now I'm ___."] },
              { level: "Core", task: "Say four sentences without the board." },
              { level: "Stretch", task: "Add a because: 'Last week I went to the park because I wanted to help.'" },
            ],
          },
        },
        {
          after: "Say it first: I was a ... Now I am a ...",
          slide: {
            kind: "writing",
            title: "Grow my past sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the words in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I went to the park. (add: last Saturday)", answer: "I went to the park last Saturday." },
              { q: "We recycled bottles. (add: at school)", answer: "We recycled bottles at school." },
              { q: "I was a bottle. (add: green)", answer: "I was a green bottle." },
              { q: "I am a notebook. (add: new)", answer: "I am a new notebook." },
            ],
            frames: ["Last ___ I went to ___.", "I was a ___. Now I am a ___."],
            checklist: ["went, was, cleaned: the verb shows the past", "A capital letter at the start", "A full stop at the end"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "This is a warm-up for the main writing task that follows. 'last Saturday', 'at school' and 'now' show children that time words help the verb. Listen for 'I go' where 'I went' is needed.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences, one about before and one about now.", frames: ["Before, I was a ___. Now I am a ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did last week",
        prompt: "Tell us what you did last week to help or to have fun. Say what you usually do, what you did, and what you are doing now. Show something you reused or recycled!",
        length: "45-90 seconds",
        steps: [
          "Choose something you reused or recycled, or draw it.",
          "Say your talk three times: usually, last week, now. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what you usually do, what you did last week and what you are doing now, and keep talking without long stops.",
        words: ["recycle", "reuse", "paper", "bottle", "bin", "went", "cleaned"],
        grammar: ["We usually ___ on ___.", "Last week I went / cleaned / ate ... (past)", "Now I'm ___ing."],
        rubric: [
          { label: "Three times", description: "Talks about usually, last week and now, in three groups of sentences.", weight: 3 },
          { label: "Past verbs", description: "Uses went, cleaned or recycled for last week; the -ed can be heard.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Topic words", description: "Uses words from the unit: paper, bottle, bin, reuse, recycle.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["We usually ___.", "Last week I ___.", "Now I'm ___."], tips: ["Hold up the thing you recycled."] },
          { level: "Core", who: "Most children", frames: ["We usually recycle ___ on ___.", "Last week I went to ___. I cleaned / reused ___.", "Now I'm ___ing."], tips: ["Say a time word in each part: usually, last week, now."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I did it because ___.", "Next time I want to ___."], tips: ["Say why you did it, and what you want to do next."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u12-l5": {
      objectives: ["I can say why a natural resource is important, three times, smoother each time."],
      trim: { "Tidy-up chant": 3, "Stand up, sit down: true or false?": 4 },
      add: [
        {
          after: "Tell the class about your collage (SB 125 C)",
          slide: {
            kind: "fluency",
            title: "Collage talk: same task, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about your collage three times to three partners. Keep going, and make it smoother each time.",
            chunks: [
              "This is my water collage.",
              "Water is an important natural resource.",
              "We use water to drink and to wash.",
              "We should take care of it because we need it.",
            ],
            recycle: ["Last week I went to the park.", "Where's the bin? It's next to the tree."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell about your collage. The listener points to the part you talk about." },
              { seconds: 45, say: "New partner. The same task. Can you say it without stopping?" },
              { seconds: 45, say: "New partner. Smooth and clear! The listener asks one question: 'Why is it important?'" },
            ],
            steps: [
              "Hold your collage up. Say the four sentences in order.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them with the class; then go on.",
              "When the bell rings, find a new partner.",
              "In round 3, answer the listener's question with 'We should ... because ...'.",
            ],
            prompts: ["(your collage)", "Why is it important?"],
            feedback: fix("point to the frame on the board, or start the phrase and pause ('We should take care ...?'). For a missing 'to' in 'We use water to drink', hold up a finger. Sounds: say 'resource' clearly (ri-SORS) and let the child echo."),
            teacherNote: "Task repetition: the same task with a new listener each time builds fluency, because children already know what to say and put their attention on saying it smoothly. The one-minute fix between rounds adds accuracy. Listen for 'important' said clearly and for 'We should' with a verb in its plain form (We should take care, not takes).",
            tiers: [
              { level: "Support", task: "Say the first two sentences with the frames on the board.", frames: ["This is my ___ collage.", "___ is an important natural resource."] },
              { level: "Core", task: "Say all four sentences without looking." },
              { level: "Stretch", task: "Add one more: 'We should not waste it. We should turn off the tap.'" },
            ],
          },
        },
        {
          after: "Plan your collage: choose a natural resource (SB 125 B)",
          slide: {
            kind: "writing",
            title: "Model: a resource paragraph",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find: what it is, how we use it, what we should do.",
              "Write your own three sentences about your natural resource with the frames.",
              "Read them to your partner. Do they match your collage?",
            ],
            text: { title: "Trees", text: "Trees are an important natural resource. We use trees to make paper and to get shade. We should take care of them because we need them." },
            frames: ["___ is an important natural resource.", "We use ___ to ___.", "We should take care of it because ___."],
            checklist: ["I wrote what it is, how we use it and what we should do", "is for one thing, are for more than one", "A capital letter and a full stop in every sentence"],
            sayIt: "Show your collage to a partner and say your three sentences without reading.",
            teacherNote: "Plan, write, check: the model shows the order in three sentences. Water is one thing (is), trees are many (are): a short chance to practise be with a plural subject, where Vietnamese children often say 'Trees is'.",
            tiers: [
              { level: "Support", task: "Copy the first frame and the third frame, and fill them in." },
              { level: "Core", task: "Write three sentences about your resource." },
              { level: "Stretch", task: "Write four sentences and add a because to the second one.", frames: ["We use ___ to ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u12-l6": {
      objectives: ["I can say where things are, quickly and correctly: 'The bottle is under the bench.'"],
      trim: { "Remember it!": 4, "Grammar mystery: Zed and the lost bin": 6, "Zed's clean-up relay: ask to win": 7 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Units 11 and 12",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "Where's the recycling box? It's behind the tree.",
              "Is there a bottle under the bench? Yes, there is.",
              "No, there isn't. There's a bottle in front of the bin.",
              "The shop is across from the park.",
            ],
            recycle: ["Last week I went to the park.", "We should take care of the Earth because we need it."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a picture, the class says the sentence." },
              { seconds: 45, say: "Left side asks, right side answers. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the picture. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumb down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board and fix them; then go on.",
            ],
            feedback: fix("start the phrase and pause ('No, there is...?'), or point to the frame. For 'behind of' or 'next the' hold up a finger for the missing or extra word. Sounds: say 'isn't' and 'there's' clearly and let the child echo."),
            teacherNote: "A quick, high-energy recall of Units 11 and 12 together: mixing old and new phrases (spaced retrieval) keeps last unit's place words from fading. Listen for 'Where the bin is' and 'There have'.",
          },
        },
        {
          after: "Write it: where things are",
          slide: {
            kind: "writing",
            title: "Fix the park notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Zed wrote notes about the park, but he made mistakes!",
              "Read each note with your partner and find the mistake.",
              "Write it the right way and read it to Zed (the teacher).",
            ],
            items: [
              { q: "The bin is behind of the tree.", answer: "The bin is behind the tree." },
              { q: "Where the bench is?", answer: "Where's the bench?" },
              { q: "Is there a can next the bin? No, there isn't.", answer: "Is there a can next to the bin? No, there isn't." },
              { q: "Is there a bag under the bench? Yes, it is.", answer: "Is there a bag under the bench? Yes, there is." },
            ],
            checklist: ["behind, next to, in front of: the small words are right", "Yes, there is. / No, there isn't.", "Where's the ___? starts with Where's"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote: "The same four slips as the rule on the board; this time the children are the editors. Fix note 1 together first.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Where is it in my room?",
        prompt: "Show us three things in your room or your house. Say where each one is, and ask a question: 'Is there a ___ under the ___?' Answer it!",
        length: "45-90 seconds",
        steps: [
          "Choose three things in your room: a book, a bottle, a toy ...",
          "Practise your sentences three times. Each time a little faster, like in class.",
          "Record it once. Point to each thing as you say where it is.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say where three things are with place words, ask and answer one 'Is there ...?' question, and keep talking without long stops.",
        words: ["bin", "bench", "shelf", "bottle", "paper", "behind", "under", "next to"],
        grammar: ["The ___ is behind / under / next to the ___.", "Is there a ___ ___ the ___? Yes, there is. / No, there isn't."],
        rubric: [
          { label: "Place words", description: "Says where things are with behind, under, next to, in front of or between.", weight: 3 },
          { label: "Is there question", description: "Asks and answers an Is there question: Yes, there is. / No, there isn't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Small words", description: "Says 'the' after the place word (behind the tree), not 'behind of'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___ the ___.", "Is there a ___? Yes, there is."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["The ___ is ___ the ___, but the ___ is ___ the ___.", "Is there a ___ ___ the ___? No, there isn't. There's a ___ ..."], tips: ["Say one thing that is NOT there."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My room is clean because ___.", "Where's the ___? Ask your grown-up!"], tips: ["Ask your grown-up a Where question, and say why a clean room is good."] },
        ],
      },
    },
  },
};
