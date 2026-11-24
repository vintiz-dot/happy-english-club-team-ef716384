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
      trim: { "Chant: Then and Now": 4, "Long ago or now? Run and say": 5, "Our class chart: long ago and now": 8 },
      add: [
        {
          after: "Our class chart: long ago and now",
          slide: {
            kind: "fluency",
            title: "Retell: long ago and now, three times",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same chart three times. Each time is shorter, smoother and faster.",
            chunks: ["Long ago, people sent letters, but now we send e-mails.", "Long ago, people listened to the radio for news.", "Now, we watch the news on the Internet.", "Travel was slow long ago. Now it is fast."],
            recycle: ["The door was open.", "They were at the party."],
            rounds: [
              { seconds: 60, say: "Tell your partner what is on our chart. Use the T-chart to help you." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the class T-chart. Tell your partner: Long ago ... Now ...",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them with the class; then go on.",
              "When the bell rings, find a new partner.",
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
            title: "Listen and write: letters then and now",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again. Write the key words you hear (letters, days, text, minute).",
              "With your partner, put the text back together. It does not need to match word for word.",
              "Compare with the text. Which words did you remember?",
            ],
            text: {
              title: "Letters then and now",
              text: "Long ago, people wrote letters and waited many days for an answer. Now, we send a text message and get an answer in one minute. Long ago, a letter traveled by horse. Now, a message travels in a second.",
            },
            frames: ["Long ago, people ___ and ___.", "Now, we ___.", "A letter ___ by ___."],
            checklist: ["I used long ago or now", "People, letters, days: the -s is there", "A capital letter and a full stop in each sentence"],
            sayIt: "Read your text to your partner, then say the main idea without looking: Long ago ... Now ...",
            teacherNote: "Read the text twice at natural speed (not slow). The pair rebuilds it from key words, so they must notice the -ed and -s endings to match what they heard. Keep the text folded on screen until the end. Before the first reading, give a 20-second reminder: 'When it happened before, we say -ed.'",
            tiers: [
              { level: "Support", task: "Write the key words and finish two sentences with the frames." },
              { level: "Core", task: "Rebuild the text in your own words with your partner." },
              { level: "Stretch", task: "Rebuild it, then add one more sentence about news or travel." },
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
      trim: { "Chant: Wheels, wings and horses": 4, "Run and touch: transport": 4, "Whisper chain: say it again!": 4 },
      add: [
        {
          after: "Tell your partner: long ago, not now (SB 55 Write)",
          slide: {
            kind: "fluency",
            title: "Long-ago talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same long-ago talk to three friends. Each talk is shorter and smoother.",
            chunks: ["Long ago, people traveled by horse.", "They didn't travel by airplane.", "It was slow and hard.", "Now, we travel by bus and car."],
            recycle: ["Would you repeat that, please?", "I come from Vietnam."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your long-ago talk. The listener counts the transport words on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Got it. Thanks!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
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
            title: "Join them: but and because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "People wrote letters. We write e-mails. (but, now)", answer: "People wrote letters, but now we write e-mails." },
              { q: "People didn't send e-mails. They didn't have computers. (because)", answer: "People didn't send e-mails because they didn't have computers." },
              { q: "People traveled by horse. It was slow. (and)", answer: "People traveled by horse and it was slow." },
            ],
            checklist: ["One joining word: but, because or and", "A comma before 'but'", "A full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model item 1 aloud, crossing out the second full stop. Item 2 is a stretch: it holds didn't + plain verb twice, and 'because' gives the reason.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 3." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Write your own joined sentence about food, school or play, long ago and now." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u05-l5": {
      objectives: ["I can say what happened and what didn't, long ago and now, again and again, without stopping."],
      trim: { "Remember it!": 5, "Time machine hop: did or didn't?": 8 },
      add: [
        {
          after: "Then and now: the information gap",
          slide: {
            kind: "fluency",
            title: "Same talk, three tries: Did Max?",
            routine: "task repeat",
            mode: "pairs",
            minutes: 5,
            goal: "Do the same Max question-and-answer task three times. Each time, go faster and smoother.",
            chunks: ["Did Max walk to school? Yes, he did. He walked.", "Did Max watch TV? No, he didn't.", "Max didn't use a phone. He visited his friends.", "Long ago, people didn't text. They talked."],
            recycle: ["The ice was hard.", "Were they at the party? No, they weren't."],
            rounds: [
              { seconds: 60, say: "Try 1: ask and answer about Max's long-ago day with your partner." },
              { seconds: 45, say: "Try 2: new partner, same questions, less time." },
              { seconds: 30, say: "Try 3: new partner. Say the answers in one smooth go!" },
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
            title: "Model, then write: my long-ago paragraph",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find: -ed, didn't and now.",
              "Plan: pick one thing (travel, news or letters). Say your three sentences first.",
              "Write three sentences. Check with the checklist.",
            ],
            text: {
              title: "Long ago and now",
              text: "Long ago, people didn't have phones at home. They wrote letters and waited many days. Now, we send a message, and it arrives in a second!",
            },
            frames: ["Long ago, people ___ed.", "They didn't ___.", "Now, we ___."],
            checklist: ["-ed for what happened, plain verb after didn't", "I wrote long ago and now", "A capital letter and a full stop in each sentence"],
            sayIt: "Read your paragraph to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is a routine children can use on their own later. Say the three sentences aloud before writing: speaking first makes the written -ed more likely to appear. Point to the checklist when a child finishes.",
            tiers: [
              { level: "Support", task: "Copy the model and change one word to make it yours." },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Write four sentences with 'but' or 'because'." },
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
