import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 5 "Then and Now".
// Children are 7-8. Every lesson gets one fluency routine (chunk sprint, retell, question
// chain, 4-3-2, task repeat) and one short writing routine (expand it, dictogloss, fix it,
// sentence combining, model then write), each ending with something said aloud. Unit 4's
// was / were phrases are mixed back in. Lessons 3 and 5 end with a recorded talk for home
// (Lesson 4 already has its own vlog). Time comes from games, chants and repeats, never
// from book pages, grammar or homework. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('Yesterday I play... ?' with a rising voice), point to the frame, or hold up a finger for the missing -ed. For 'didn't + verb', point to the board word 'didn't' and say 'one past word only'. For a sound ('talk-ed' in two beats), just say it right ('talked', one beat) and let the child echo it. Say every final -ed, -s and /t/ clearly yourself: children copy what they hear.";

export const odL2U5Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u05-l1": {
      objectives: ["I can say 'Long ago, ... Now, ...' fast, without stopping."],
      trim: { "The mystery bag: old and new": 6, "Mime it, say it: freeze and point": 3, "What's missing? Then spell it": 5, "Which go together? Why?": 7 },
      add: [
        {
          after: "Which go together? Why?",
          slide: {
            kind: "fluency",
            title: "Long ago, now: sentence sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["Long ago, people sent letters.", "Now, we send text messages.", "Long ago, people rode horses.", "Now, people travel by airplane.", "I come to school by bike."],
            recycle: ["The ice was hard. Now it is water.", "Were the cups open? No, they weren't."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'Long ago, people sent letters.' or 'Now, we send text messages.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then say the best sentence once more.",
            ],
            prompts: ["(card: letter)", "(card: text message)", "(card: horse)", "(card: airplane)", "(card: bike)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'Long ago, people sent letters' should come out as one smooth piece. The two halves (Long ago / Now) give the children a repeating pattern, which is why it speeds up so fast. Listen for a dropped final -s in 'letters', 'horses' and 'messages', and say those endings clearly yourself. Unit 4's was / were phrases come back every few cards so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["Long ago, people ___.", "Now, we ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Join the two halves: 'Long ago, people sent letters, but now we send e-mails.'", frames: ["Long ago, ___, but now ___."] },
            ],
          },
        },
        {
          after: "What do you think the text is about? (SB 49 D)",
          slide: {
            kind: "writing",
            title: "Grow my then-and-now sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add one more thing (a word like slow, big or far, or a place).",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "People sent letters. (add: long ago)", answer: "Long ago, people sent letters." },
              { q: "We send messages. (add: on a phone)", answer: "We send messages on a phone." },
              { q: "People rode horses. (add: to the next town)", answer: "People rode horses to the next town." },
              { q: "The radio told the news. (add: every day)", answer: "The radio told the news every day." },
            ],
            frames: ["Long ago, people ___.", "Now, we ___ on ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "People, letters, horses: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding one sentence at a time lets children add detail without a blank page. Letters, horses and messages are the plural -s that Vietnamese learners often drop, so point to the -s when you read the answers aloud.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and' or 'but': 'Long ago, people sent letters, but now we send e-mails.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u05-l2": {
      objectives: ["I can tell about long ago and now three times, faster each time."],
      trim: { "Chant: Then and Now": 4, "Long ago or now? Run and say": 3, "Our class chart: long ago and now": 8 },
      add: [
        {
          after: "Our class chart: long ago and now",
          slide: {
            kind: "fluency",
            title: "Retell: long ago and now, three times",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same chart three times to three partners. Each time is shorter, smoother and faster (50, 40, then 30 seconds each).",
            chunks: ["Long ago, people sent letters, but now we send e-mails.", "Long ago, people listened to the radio for news.", "Now, we watch the news on the Internet.", "Travel was slow long ago. Now it is fast."],
            recycle: ["The door was open.", "They were at the party."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells what is on our chart, then Partner B tells it. Use the T-chart to help you. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the class T-chart. Partner A tells: Long ago ... Now ... Then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them with the class; then go on.",
              "When the bell rings, change partners. Each round, A talks first, then B.",
              "The listener has a job: count how many Long-ago sentences you say, on their fingers.",
            ],
            prompts: ["(chart: communication)", "(chart: news)", "(chart: travel)"],
            feedback: correct,
            teacherNote: "The same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words, and the one-minute fix between rounds 1 and 2 is what makes them more accurate too, not only faster. Accept short tellings. Listen for 'long ago' + present verb ('Long ago, people send') and prompt with the first word, not the answer.",
            tiers: [
              { level: "Support", task: "Point to each part of the chart and say one sentence for it.", frames: ["Long ago, ___.", "Now, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add your own idea: 'I think now is better because ...'", frames: ["I think now is better because ___."] },
            ],
          },
        },
        {
          after: "Think boxes: main idea and a detail (SB 50)",
          slide: {
            kind: "writing",
            title: "My news paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the joining words (and, because).",
              "Plan: fill the boxes with a drawing or a few words. Say one sentence for each box to your partner.",
              "Write: four sentences, one for each box. Use the frames if you need them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: mark only two targets with a dot (-ed after long ago and capital letters). The child finds the mistake and fixes it.",
            ],
            text: {
              title: "Model: News",
              text: "Long ago, people listened to the radio for the news. They waited for the news every day. Now, we watch the news on the Internet, and it comes fast. I think now is better because I can see pictures.",
            },
            organiser: [
              { label: "Long ago", prompt: "Draw how people got the news long ago. Say: Long ago, people ___ed." },
              { label: "Waiting", prompt: "Draw or write one word: how long did people wait? Say: They waited every day." },
              { label: "Now", prompt: "Draw how we get the news now. Say: Now, we ___." },
              { label: "I think", prompt: "Which is better? Write one word and a reason." },
            ],
            frames: ["Long ago, people ___ed to ___ for the news.","They waited for the news ___.","Now, we ___ the news on ___, and it ___.","I think now is better because ___."],
            checklist: ["Four sentences: long ago, waiting, now, what I think","A capital letter at the start and a full stop at the end of every sentence","-ed for long ago (listened, waited) and a joining word (and, but, because)"],
            sayIt: "Read your news paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A short paragraph of four sentences built from the unit's long-ago and now chart. Each sentence is one box in the plan, and drawing or one word is enough in a box. Mark only two things: -ed after 'long ago' and capital letters. Say every final -ed clearly when you read the model. The unit's sentence-level work (retell, fix it, combining) feeds this paragraph.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["Long ago, people ___ed.","Now, we ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence with but: 'Long ago, news was slow, but now it is fast.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u05-l3": {
      objectives: ["I can say what happened with -ed and what didn't happen with didn't, fast."],
      trim: { "Pass the ball: long ago or now?": 3, "Yesterday detectives: mime and say": 6, "Sound sort: /t/, /d/ or /id/": 4 },
      add: [
        {
          after: "Sound sort: /t/, /d/ or /id/",
          slide: {
            kind: "fluency",
            title: "Question chain: Did you ___ last night?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Did you play football last night?", "Yes, I did. I played football.", "No, I didn't. I cleaned the table.", "I didn't watch TV.", "What did you do?"],
            recycle: ["Was it open? No, it wasn't.", "Were they at the party? Yes, they were."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an action card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your action card so only you can see it.",
              "Ask the friend on your left: 'Did you ___ last night?' (Use the verb on your card.)",
              "They answer: 'Yes, I did. I ___ed.' or 'No, I didn't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Did you ___ last night?", "What did you do?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Did you ...?' and 'didn't' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Did you played?' and 'I didn't played': the verb after did / didn't stays plain. Prompt by pointing to the board word 'didn't' and holding up one finger for 'one past word'.",
            tiers: [
              { level: "Support", task: "Answer 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board." },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a second sentence: 'No, I didn't play football. I watched TV.'" },
            ],
          },
        },
        {
          after: "What did you do last night? (SB 53 E)",
          slide: {
            kind: "writing",
            title: "Fix the yesterday sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing -ed, an extra -ed after didn't, or a capital letter.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Yesterday I play football.", answer: "Yesterday I played football." },
              { q: "I didn't played football.", answer: "I didn't play football." },
              { q: "Did you watched TV last night?", answer: "Did you watch TV last night?" },
              { q: "long ago, people listened to the radio.", answer: "Long ago, people listened to the radio." },
            ],
            checklist: ["It happened: the verb has -ed", "After didn't or Did, the verb is plain (no -ed)", "A capital letter and a full stop"],
            sayIt: "Read your four fixed sentences aloud to your partner, fast.",
            teacherNote: "Two error types only: a missing -ed (Vietnamese verbs do not change for time) and -ed after didn't. Fix item 1 together first and say the final /t/ clearly. A child who can say why 'didn't played' is wrong ('didn't already says it happened') has understood the rule.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 4 with the teacher." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did and didn't do yesterday",
        prompt: "Tell us two things you did yesterday and one thing you didn't do. Show or draw each thing.",
        length: "45-90 seconds",
        steps: [
          "Think of two things you did yesterday and one thing you didn't do.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 120,
        kidSummary: "Say what you did with -ed, say one thing you didn't do with didn't, and keep talking without long stops.",
        words: ["yesterday", "played", "cleaned", "listened", "watched", "didn't"],
        grammar: ["Yesterday I ___ed ___.", "I didn't + plain verb"],
        rubric: [
          { label: "Did and didn't", description: "Says two things that happened and one that didn't.", weight: 3 },
          { label: "Past endings", description: "Uses -ed for what happened (played, cleaned) and a plain verb after didn't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final sound of played, cleaned and watched can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Yesterday I ___ed.", "I didn't ___."], tips: ["Hold up your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["Yesterday I ___ed ___ and I ___ed ___.", "I didn't ___. I ___ed ___."], tips: ["Say a time word at the start: yesterday, last night."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I didn't ___, but I ___ed ___.", "Yesterday was a good day because ___."], tips: ["Join two ideas with but or because."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u05-l4": {
      objectives: ["I can talk about long ago and not now, three times, faster each time."],
      trim: { "Chant: Wheels, wings and horses": 4, "Run and touch: transport": 3, "Whisper chain: say it again!": 3 },
      add: [
        {
          after: "Tell your partner: long ago, not now (SB 55 Write)",
          slide: {
            kind: "fluency",
            title: "Long-ago talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same long-ago talk to three friends. Each talk is shorter and smoother (50, 40, then 30 seconds each).",
            chunks: ["Long ago, people traveled by horse.", "They didn't travel by airplane.", "It was slow and hard.", "Now, we travel by bus and car."],
            recycle: ["Would you repeat that, please?", "I come from Vietnam."],
            rounds: [
              { seconds: 50, say: "Round 1: Line A tells the long-ago talk, then Line B tells theirs. The listener counts the transport words on their fingers. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. Line A tells the same talk in less time, then Line B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Fast and smooth! Line A talks, then Line B. The listener says 'Got it. Thanks!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "The listener may say 'Would you repeat that, please?' once, and the speaker says it again.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 is what makes round 2 more accurate. Listen for 'didn't traveled' and 'It slow': be is missing.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Long ago, people ___ed.", "It was ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a reason: 'Now we travel by airplane because it is fast.'", frames: ["Now we ___ because ___."] },
            ],
          },
        },
        {
          after: "Write: something people did long ago (SB 55 Write, WB 45)",
          slide: {
            kind: "writing",
            title: "My long-ago travel paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the joining word: and.",
              "Plan: fill the boxes with a drawing or a few words. Say one sentence for each box to your partner.",
              "Write: four sentences, one for each box. Use the frames if you need them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: mark only two targets with a dot (didn't + plain verb and the capital letters). The child finds the mistake and fixes it.",
            ],
            text: {
              title: "Model: Travel",
              text: "Long ago, people traveled by horse and by boat. They didn't travel by airplane, and it was slow and hard. Now, we travel by bus, car and airplane. It is fast and easy!",
            },
            organiser: [
              { label: "Long ago", prompt: "Draw how people traveled long ago. Say: Long ago, people ___ed by ___." },
              { label: "They didn't", prompt: "Draw one thing they didn't do. Say: They didn't ___. Then write one word: slow? hard?" },
              { label: "Now", prompt: "Draw how we travel now. Say: Now, we travel by ___." },
              { label: "It is", prompt: "Write two words: fast? easy? fun?" },
            ],
            frames: ["Long ago, people traveled by ___.","They didn't ___, and it was ___.","Now, we travel by ___.","It is ___ and ___!"],
            checklist: ["Four sentences: long ago, didn't, now, how it is","A capital letter at the start and a full stop or ! at the end","didn't + plain verb (didn't travel, never didn't traveled)"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph in this unit, planned in four boxes. It is also the script for the recorded talk ('Vlog: how is it different now?'): children who say it three times at home find the talk easy. The joining word and comes back here. Mark only two things (didn't + plain verb, capital letters) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["Long ago, people traveled by ___.","Now, we travel by ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Join two sentences with because: 'People didn't travel by airplane because they didn't have one.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u05-l5": {
      objectives: ["I can say what happened and what didn't, long ago and now, again and again, without stopping."],
      trim: { "Remember it!": 4, "Time machine hop: did or didn't?": 6 },
      add: [
        {
          after: "Then and now: the information gap",
          slide: {
            kind: "fluency",
            title: "Same talk, three tries: Did Max?",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same Max question-and-answer task three times. Each time, go faster and smoother (60, 45, then 30 seconds each).",
            chunks: ["Did Max walk to school? Yes, he did. He walked.", "Did Max watch TV? No, he didn't.", "Max didn't use a phone. He visited his friends.", "Long ago, people didn't text. They talked."],
            recycle: ["The ice was hard.", "Were they at the party? No, they weren't."],
            rounds: [
              { seconds: 60, say: "Try 1: Partner A asks and Partner B answers about Max's long-ago day, then change roles. Then change partners." },
              { seconds: 45, say: "Try 2: new partner, same questions, less time. A asks, B answers, then change roles. Then change partners." },
              { seconds: 30, say: "Try 3: new partner. A asks, B answers, then change roles. Say the answers in one smooth go!" },
            ],
            steps: [
              "Use the Max cards from the information gap. Ask: 'Did Max ___?'",
              "Answer with a whole sentence: 'Yes, he did. He ___ed.' or 'No, he didn't.'",
              "Teacher: after try 1, stop for one minute. Fix two mistakes on the board (no names), then go on to try 2.",
              "The listener has a job: tick each answer that uses the right ending.",
            ],
            feedback: correct,
            teacherNote: "Same task, new partner, less time (task repetition): the second and third tries are where the language becomes automatic, because the child no longer plans the sentence. The one-minute fix lifts accuracy, too. Prompt 'Did Max walked?' by pointing to 'Did' and holding up one finger: one past word only.",
            tiers: [
              { level: "Support", task: "Use the frames on the board.", frames: ["Did Max ___?", "Yes, he did. He ___ed. / No, he didn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add the 'now': 'Max walked to school. Now, I take the bus.'" },
            ],
          },
        },
        {
          after: "Say it, then write: long ago and now",
          slide: {
            kind: "writing",
            title: "My long-ago paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the joining words (and, because).",
              "Plan: fill the boxes with a drawing or a few words. Say one sentence for each box to your partner.",
              "Write: four sentences, one for each box. Use the frames if you need them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: mark only two targets with a dot (-ed for what happened and didn't + plain verb). The child finds the mistake and fixes it.",
            ],
            text: {
              title: "Model: Long ago and now",
              text: "Long ago, people lived in small villages and walked to the market. They didn't ride in cars, and they didn't have phones. Now, we ride in cars and send messages. I think now is better because it is fast.",
            },
            organiser: [
              { label: "Long ago", prompt: "Draw where or how people lived long ago. Say: Long ago, people ___ed." },
              { label: "They didn't", prompt: "Draw one or two things they didn't do or have. Say: They didn't ___." },
              { label: "Now", prompt: "Draw what we do now. Say: Now, we ___." },
              { label: "I think", prompt: "Which is better, long ago or now? Say: I think ___ is better because ___." },
            ],
            frames: ["Long ago, people ___ed in ___.","They didn't ___, and they didn't ___.","Now, we ___.","I think now is better because ___."],
            checklist: ["Four sentences: long ago, didn't, now, what I think","-ed for what happened, a plain verb after didn't","A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The big step of the unit: a four-sentence paragraph that uses both parts of the grammar, -ed and didn't + plain verb. Planning in four boxes with drawings means no notes are needed. This paragraph is the script for the recorded talk 'Long ago and now: my talk'. Mark only two targets with a dot (-ed, and the verb after didn't) and let the child find and fix the mistake.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["Long ago, people ___ed.","They didn't ___.","Now, we ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a sentence with but: 'Long ago, people wrote letters, but now we send e-mails.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Long ago and now: my talk",
        prompt: "Tell us how one thing was different long ago and now: travel, news or letters. Show a picture or an object.",
        length: "45-90 seconds",
        steps: [
          "Pick one thing: travel, news or letters. Look at your paragraph from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Say what people did and didn't do, then what we do now.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Tell what people did and didn't do long ago, then what we do now, and keep talking without long stops.",
        words: ["long ago", "now", "traveled", "listened", "didn't", "Internet"],
        grammar: ["Long ago, people ___ed.", "They didn't + plain verb", "Now, we ___."],
        rubric: [
          { label: "Then and now", description: "Tells what people did long ago and what we do now.", weight: 3 },
          { label: "Past endings", description: "Uses -ed for what happened and a plain verb after didn't, never both.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Reason", description: "Gives a reason with because or says why it is different.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Long ago, people ___ed.", "Now, we ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["Long ago, people ___ed. They didn't ___.", "Now, we ___."], tips: ["Say one thing people did and one thing they didn't do."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Long ago, ___, but now ___.", "I think now is better because ___."], tips: ["Say which is better and why."] },
        ],
      },
    },
  },
};
