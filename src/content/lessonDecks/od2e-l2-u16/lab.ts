import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 16 "Stubborn Goats"
// (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13), working on a book written for younger children, so
// every Lab slide is pitched up: longer chunks with reasons, examples and contrasts, topics
// from their own lives (school, friends, technology, sport, their city, plans), a grammar
// drill in every lesson (the -est words and comparing, with the past simple and be in the
// first two lessons), full paragraphs in three lessons and sentence work with harder items in
// the others. Three lessons end with a recorded talk of 90-120 seconds, made on their own.
// Time comes from games and young-learner warm-ups, never from the book pages or the
// grammar. All text is original.

const fixBe =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; students who then say it again use the fixed form. Make the student fix the grammar herself: start the phrase and pause ('The goat ... ?'), point to 'is' on the frame, or hold up a finger for the missing word. Example: a student says 'The goat angry.' You say 'The goat ...' and hold up a finger; she says 'is angry.' For a sound, just say it right and let her echo it. Say every final -s clearly yourself (horns, goats, mountains): students copy what they hear.";

const fixPast =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; students who then say it again use the fixed form. Make the student fix the grammar himself: start the phrase and pause ('The goats ... ?'), hold up a finger for the missing -ed, or repeat the error with a rising voice ('They didn't moved?'). Example: a student says 'Neither goat want to move.' You say 'Neither goat ...?' and wait; he says 'wanted to move.' For a sound, just say it right and let him echo it. Say the final -ed and the -s of plurals clearly yourself.";

const fixEst =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; students who then say it again use the fixed form. Make the student fix the grammar herself: say the start and pause ('Zog is ... ?'), touch the word 'the' on the board, or hold up a finger for the missing word. Example: a student says 'Zog is strongest goat.' You say 'Zog is ...' and hold up a finger; she says 'the strongest goat.' Repeat a spelling error with a rising voice ('The happyest?') so she hears it herself and says 'happiest.' For a sound, say it right and let her echo it. Say the final -est and the -s of plurals clearly yourself.";

const fixEr =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; students who then say it again use the fixed form. Make the student fix the grammar himself: start the phrase and pause ('A horse is ... ?'), point to the -er or -est ending card, or hold up a finger for the missing word. Example: a student says 'A horse is more fast.' You say 'A horse is ...' and point to the -er card; he says 'faster.' If 'the' is dropped ('He is cleanest.'), touch 'the' on the board. For a sound, say it right and let him echo it. Say final -s and -st clearly yourself.";

const drillRounds = (extra: string) => [
  { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when, T = change the tense or time, P = change the person or the thing). The class says the new sentence together." },
  { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the signal. Use the cards for T and P too." },
  { seconds: 90, say: extra },
];

export const odL2U16Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u16-l1": {
      objectives: ["I can describe goats, mountains and feelings in longer sentences, give a reason, and say it fast and without stopping."],
      drop: ["Stubborn goat chant", "Mystery bag: what do you notice?", "East, west, forward: compass TPR"],
      add: [
        {
          after: "Stubborn, or not stubborn? Sort the pictures",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with because or although, move it to the past or change the person. Then talk about people and feelings in your own life.",
            chunks: [
              "The goat is stubborn because it wants to cross the river first.",
              "Is your best friend stubborn? No, she isn't, although she sometimes argues about small things.",
              "The mountains aren't dangerous when the weather is clear, but they are very cold at night.",
              "Last winter the path was icy, so the hikers were careful.",
              "I am happy when I reach the top, although my legs are tired.",
              "Are you nervous before a test? Yes, I am, but I feel better when I am ready.",
            ],
            recycle: ["A jet is faster than a train.", "It is easier to push than to pull."],
            rounds: drillRounds("Real talk: tell your partner about someone you know who is stubborn, and about a time you felt nervous or proud. Give a reason, and your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with is / are, X = isn't / aren't, + = add because, although, so or when, T = last year (was / were), P = a new person (I, my brother, they).",
              "Say the WHOLE new sentence, with the be word every time: is, are, was or were.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'The goat angry', 'Is you nervous?' or 'They was tired') and fix them together; then go on.",
              "In round 3 the drill becomes real: describe a real person or a real feeling, give a reason and answer your partner's question.",
            ],
            prompts: ["The goat is angry. (?)", "The path is easy. (X)", "My friend is tired. (+ because)", "We are nervous today. (T)", "The goat is stubborn. (P: my brothers)"],
            feedback: "Prompt, do not tell: for 'The goat angry' point to 'is' on the frame; for 'Is you nervous?' repeat it with a rising voice and let the student fix it; for 'They was tired' hold up two fingers for 'they' and say 'They ...?'. Say the be word and the final -s clearly yourself.",
            teacherNote: "There is no grammar slide in this lesson, so the drill takes the key structure of the word work: be with a feeling or describing word, in the present and the past. Grades 6-7 can take the whole set at speed: questions, negatives, joining words, the past and a change of person. Vietnamese has no 'be' before an adjective, so 'The goat angry' is the slip to listen for. Round 3 is real talk about their own lives.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with frames on the board and one new person at a time.", frames: ["Is / Are ___ ___? Yes, ___ is / are. / No, ___ isn't / aren't.", "___ is ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Last winter the path wasn't easy, although the weather was clear. Why do people climb mountains?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Goat sprint: say the whole sentence",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say each whole sentence fast and smooth, with no stops and no missing words.",
            chunks: [
              "The goat stands on the mountain, and the sun comes up in the east.",
              "I take two steps forward, but my shoes are wet.",
              "The goat is stubborn and angry because it wants to go first.",
              "We walk west in the morning, although the path is steep.",
              "Mountains are beautiful, but they can be dangerous in the rain.",
            ],
            recycle: ["A jet is faster than a train.", "It is easier to push than to pull."],
            rounds: [
              { seconds: 70, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 70, say: "Pairs: one shows a card, the other says the sentence and adds a reason of their own. Swap at the signal." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say with a reason before the bell?" },
            ],
            steps: [
              "Look at the picture card. Say the WHOLE sentence, not just one part.",
              "Say 'is' and 'are' every time: 'The goat is angry.' Not 'The goat angry.'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3, count your sentences with a reason on your fingers.",
            ],
            prompts: ["(card: goat on a mountain)", "(card: angry goat)", "(card: sunrise, east)", "(card: steps forward)", "(card: wet shoes)"],
            feedback: fixBe,
            teacherNote: "Whole sentences only, never single words: the aim is one smooth piece with two parts. Vietnamese has no 'be' before an adjective, so 'The goat angry' and 'My shoes wet' are the slips to listen for; plural -s ('mountains') is the other. Mix in Unit 15's comparing phrases every few turns so last unit's grammar stays fast (spaced retrieval).",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The goat is ___.", "My ___ are wet."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board, and add a reason." },
              { level: "Stretch", task: "Add a reason and a contrast: 'The goat is angry because it is wet, although the sun is out.'", frames: ["___ because ___, although ___."] },
            ],
          },
        },
        {
          after: "Mountains, rain and stubborn friends (SB 157 Think)",
          slide: {
            kind: "writing",
            title: "Is it good to be stubborn? Plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the examples and the closing sentence, and circle the linking words.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion at least once each.",
              "Check: tick the checklist. Your partner underlines one linking word and tells you one example they liked.",
              "Teacher: look only at the be word with a feeling word (is, are, was) and at because / although. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: is it good to be stubborn?",
              text: "Being stubborn can be good or bad. First, a stubborn person never gives up, so she can finish a difficult project. For example, my cousin practiced the guitar every day until she played the whole song. However, stubborn people often refuse to listen, and that causes problems with friends. Also, a group cannot decide anything if nobody changes their mind. In conclusion, I think it is good to be stubborn about your goals, but not about small arguments.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Is being stubborn good, bad, or both? Say it in one sentence." },
              { label: "Detail 1: the good side", prompt: "Give one good thing about being stubborn, with a reason (because, so) and an example." },
              { label: "Detail 2: the bad side", prompt: "Give one problem with being stubborn. Use however or although." },
              { label: "Detail 3: a group or a friendship", prompt: "What happens when two stubborn people meet, like the goats? Use also." },
              { label: "Closing", prompt: "In conclusion, what do you think? When is it good to be stubborn?" },
            ],
            frames: ["Being stubborn can be ___.", "First, a stubborn person ___, so ___.", "For example, ___.", "However, stubborn people ___ because ___.", "Also, ___.", "In conclusion, I think ___."],
            checklist: [
              "A topic sentence first and a closing sentence with in conclusion",
              "At least four linking words: first, also, however, because, for example",
              "The be word is there with a feeling word: she is stubborn, they are angry, he was nervous",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again in one minute, looking only at your five boxes.",
            teacherNote: "A full paragraph for grades 6-7: six to eight sentences, planned in five boxes with words, not sentences. The topic comes from the unit (stubborn goats) and from their own lives (friends, projects, arguments). Mark only two things: the be word with a feeling word, and the joining words because and although; let the student find the mistake from your dot. Keep the finished paragraphs: students can read them aloud again in Lesson 2.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, six sentences in all.", frames: ["Being stubborn can be ___.", "First, a stubborn person ___, so ___.", "In conclusion, I think ___."] },
              { level: "Core", task: "Write six or seven sentences with all the linking words in the checklist." },
              { level: "Stretch", task: "Write eight sentences and add a contrast and a second example: 'Although my brother is stubborn, he is also loyal; for example, he never leaves a friend alone.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u16-l2": {
      objectives: ["I can retell the story of the two goats in the past, with reasons, three times, faster and smoother each time."],
      drop: ["Bridge and river chant", "Push-of-war: what do you notice?"],
      add: [
        {
          after: "Story mountain poster: first, next, at the end",
          slide: {
            kind: "fluency",
            title: "Grammar drill: the goats in the past",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the present or change the person. Then tell a real story about a time you argued or disagreed.",
            chunks: [
              "Yesterday two goats met on a narrow bridge, and neither of them wanted to move.",
              "Did the goats move? No, they didn't, because both of them were stubborn.",
              "The goats pushed and pushed, so they fell into the river.",
              "Although the water was cold, the goats finally started to think.",
              "Why didn't the goats listen to each other? They didn't listen because they were angry.",
              "In the end the goats learned that sharing is better than fighting, so they crossed one by one.",
            ],
            recycle: ["The goat is stubborn because it wants to go first.", "A big force makes it move faster."],
            rounds: drillRounds("Real talk: tell your partner about a time you disagreed with a friend or a family member. Say what happened, why, and how it ended. Your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with did, X = didn't + the basic verb, + = add because, although, so or when, T = the present (Today the goats meet ...), P = a new person (I, my brother, the girls).",
              "Say the WHOLE new sentence, with the -ed or the irregular form (met, fell) and with 'did' or 'didn't' plus the basic verb in questions and negatives.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Did they moved?', 'They didn't wanted' or 'They falled') and fix them together; then go on.",
              "In round 3 the drill becomes real: tell a true story in the past, with a reason, and answer your partner's question.",
            ],
            prompts: ["The goats met on a bridge. (?)", "The goats listened to each other. (X)", "The goats were angry. (+ because)", "The goats push each other. (T)", "The goats fell into the river. (P: I)"],
            feedback: "Prompt, do not tell: for 'Did they moved?' repeat it with a rising voice and let the student fix it; for 'They didn't wanted' hold up a finger and say 'They didn't ...?'; for 'falled' say 'fell' once and let the student echo it. Say the final -ed and the -s of plurals clearly yourself.",
            teacherNote: "There is no grammar slide in this lesson, so the drill takes the key structure of the story: the past simple, regular and irregular, with did / didn't, and a time phrase or a reason. Grades 6-7 can take the whole set at speed. The last round is real: they tell a true story about a disagreement. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with frames on the board.", frames: ["Did ___ ___? Yes, ___ did. / No, ___ didn't.", "___ didn't ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Yesterday I didn't listen to my brother, although he was right. Why do people refuse to change their mind?'" },
            ],
          },
        },
        {
          after: "Grammar drill: the goats in the past",
          slide: {
            kind: "fluency",
            title: "Two goats: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Tell the same story three times, with a reason in every part. Each time is shorter, smoother and faster.",
            chunks: [
              "First, two goats met on a narrow bridge over a fast river.",
              "Then neither goat would move, because both of them wanted to cross first.",
              "Both goats were so stubborn that they pushed and pushed until they fell in.",
              "In the end the goats were wet and cold, although they could have shared the bridge.",
            ],
            recycle: ["When we push the same, nothing moves.", "A big force makes it move faster."],
            rounds: [
              { seconds: 80, say: "Tell your partner the whole story, then swap. Use your story mountain poster and give a reason for every part." },
              { seconds: 70, say: "New partner. Tell it again in less time, then swap." },
              { seconds: 60, say: "New partner. Fast and smooth, then swap. Add what the goats should have done." },
            ],
            steps: [
              "Point to the poster: first, then, in the end (start, top, end).",
              "The listener has a job: count the reasons (because, so, although) on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the signal sounds, find a new partner.",
            ],
            prompts: ["(picture: two goats and a bridge)", "(picture: goats pushing)", "(picture: the goats in the river)"],
            feedback: fixPast,
            teacherNote: "The same story three times on purpose: the second and third tellings are faster because students are no longer searching for ideas. Listen for dropped -ed, 'Neither goat want', 'falled' and a missing 'were'. The finger-counting listener makes the telling a real job. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each part of the poster and say one sentence.", frames: ["First, ___.", "Then ___ because ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames and give two reasons." },
              { level: "Stretch", task: "Add a contrast and what the goats should have done: 'Although they were tired, they didn't stop. They should have shared the bridge.'", frames: ["Although ___, ___.", "They should have ___."] },
            ],
          },
        },
        {
          after: "What are the most important parts? (the Think boxes)",
          slide: {
            kind: "writing",
            title: "My two goats story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the examples and the closing sentence, and circle the linking words.",
              "Plan: look at your story mountain poster. Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, then, because, however, as a result and in conclusion.",
              "Check: tick the checklist. Your partner underlines one linking word and tells you which sentence gives the best reason.",
              "Teacher: look only at the past simple (-ed, met, fell, didn't + basic verb). Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: the two goats",
              text: "The story of the two goats is about a problem and a bad decision. First, two goats met on a narrow bridge, and neither of them wanted to move. They pushed each other because both of them were stubborn. As a result, they fell into the river, and they were wet and cold. However, the story has a lesson. In conclusion, the goats should have listened to each other, because sharing the bridge was a better idea.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is the story about? Name the problem in one sentence." },
              { label: "Detail 1: what happened first", prompt: "Where did the goats meet? Why did neither goat move?" },
              { label: "Detail 2: what happened next", prompt: "What did the goats do? Use because or so." },
              { label: "Detail 3: the result", prompt: "How did it end? Use as a result or however." },
              { label: "Closing", prompt: "In conclusion, what should the goats have done, and why?" },
            ],
            frames: ["The story is about ___.", "First, two goats ___ on a ___, and ___.", "They ___ because ___.", "As a result, ___.", "However, ___.", "In conclusion, the goats should have ___."],
            checklist: [
              "A topic sentence first and a closing sentence with in conclusion",
              "At least four linking words: first, because, so, however, as a result",
              "Past simple: met, pushed, fell, were; and didn't + the basic verb",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your story to your partner. Then tell it again in one minute, looking only at your five boxes.",
            teacherNote: "A full paragraph for grades 6-7: six to eight sentences, planned in five boxes with words. It retells the story of this lesson in the past simple and ends with an opinion. Check the model against the book and change the sentences if the book's story differs. The finished paragraph is the script for the recorded talk at home: students practice it three times, then record.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, six sentences in all.", frames: ["First, two goats ___ on a ___.", "They ___ because ___.", "In conclusion, the goats should have ___."] },
              { level: "Core", task: "Write six or seven sentences with all the linking words in the checklist." },
              { level: "Stretch", task: "Write eight sentences and add a contrast and a lesson for real life: 'Although the goats were strong, they lost. People also lose when they never change their mind; for example, ...'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My two stubborn goats talk",
        prompt: "Retell the story of the two stubborn goats in the past, then say what the goats should have done and why. Give two reasons and an example from your own life of a time when people argued or shared.",
        length: "90-120 seconds",
        steps: [
          "Plan: look at your paragraph and your story mountain poster. Write the three parts of the story, two reasons and one example in a few words each.",
          "Practice your talk three times, in front of a mirror or to a friend on a call. Each time speak a little faster and with fewer stops.",
          "Record it once. Look at the camera, speak clearly and use linking words: first, then, because, however, for example.",
          "Watch it once. Listen for the past forms (met, fell, didn't want) and tell yourself one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Retell the story in the past, then say what the goats should have done. Give reasons and an example, and keep talking without long stops.",
        words: ["goat", "stubborn", "narrow", "bridge", "angry", "forward"],
        grammar: ["First, ___. Then ___. In the end, ___.", "The goats ___ because ___.", "For example, ___."],
        rubric: [
          { label: "The story", description: "Retells the beginning, the middle and the end of the story in the correct order.", weight: 2 },
          { label: "Reasons and examples", description: "Gives a reason (because, so, although) for what happened and an example from their own life.", weight: 3 },
          { label: "Past simple", description: "Uses -ed, irregular forms (met, fell) and didn't + the basic verb correctly.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole, connected sentences, not single words.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: stubborn, narrow, bridge, angry, forward.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["First, ___.", "Then ___ because ___.", "In the end, ___."], tips: ["Write one reason for each part before you record."] },
          { level: "Core", who: "Most students", frames: ["First, two goats met on ___, and ___.", "They pushed because ___. For example, ___.", "The goats should have ___."], tips: ["Give a reason and an example in every part."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although ___, the goats ___.", "If they had ___, they would have ___."], tips: ["Add a contrast and connect the story to a real argument you know."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u16-l3": {
      objectives: ["I can compare and name the biggest, the funniest and the best, with reasons, fast and right."],
      drop: ["Big, bigger, biggest chant", "Zoo superlatives: pass the ball"],
      trim: { "Which is the longest? Pencil lineup": 5 },
      add: [
        {
          after: "Ask and answer about the pictures (SB 161 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: the -est words in real life",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past or change the person or thing. Then give your own opinions about the best and the worst.",
            chunks: [
              "Zog is the strongest goat in the herd, but Zig is the fastest.",
              "Is this the funniest story in the book? Yes, it is, because the ending is a surprise.",
              "Mount Everest is the highest mountain on Earth, although it isn't the easiest to climb.",
              "Last year was the hottest summer in our city, so we stayed inside every afternoon.",
              "What is the best app for studying? I think the simplest one is the best because it doesn't distract me.",
              "My brother is taller than I am, but I am the fastest runner in our family.",
            ],
            recycle: ["A jet is faster than a train.", "Is a horse faster than a tortoise? Yes, it is."],
            rounds: drillRounds("Real talk: give your opinion about the best and the worst things in your school, your city or your phone. Say why, and your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Is ... the -est ...?, X = isn't the -est, + = add because, although, so or when, T = was / last year, P = a new person or thing (my brother, this phone, our school).",
              "Say the WHOLE new sentence, with 'the' before every -est word and the right spelling: happiest, biggest, best.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'He is strongest', 'the most tall' or 'the goodest') and fix them together; then go on.",
              "In round 3 the drill becomes real: say what is really the best and the worst in your life, and give a reason with because.",
            ],
            prompts: ["Zog is the strongest goat. (?)", "This is the funniest story. (X)", "The giraffe is the tallest animal. (+ because)", "Our school is the oldest in the city. (T)", "My brother is the fastest runner. (P: my sister)"],
            feedback: fixEst,
            teacherNote: "The unit's grammar at speed, mixed with Unit 15's comparing phrases. Grades 6-7 can take the whole set: questions, negatives, joining words, the past and a change of person. Listen for the missing 'the' ('She is tallest'), 'the most tall', 'goodest' and spelling slips said aloud ('happyest', 'bigest'). Round 3 is real: opinions about school, city and technology, with a reason.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with frames on the board.", frames: ["Is the ___ the ___est? Yes, it is. / No, it isn't.", "The ___ is the ___est because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Last year this wasn't the busiest street, although it was the noisiest. Why do cities keep getting busier?'" },
            ],
          },
        },
        {
          after: "Grammar drill: the -est words in real life",
          slide: {
            kind: "fluency",
            title: "Question chain: which is the -est?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Which class is the hardest this year, and why?",
              "I think math is the hardest because the problems are the longest.",
              "Who is the funniest person in your family? My uncle is, because he tells the best jokes.",
              "Is this the cheapest phone? No, it isn't, but it is the lightest.",
              "What is the busiest street in your city? I think it is the one near the market.",
            ],
            recycle: ["A jet is faster than a train.", "Is a horse faster than a tortoise? Yes, it is."],
            rounds: [
              { seconds: 80, say: "Slow chain round the circle. Everyone holds a card with a topic (school, phones, sport, your city, food)." },
              { seconds: 70, say: "Swap cards. Go faster, and add a reason to every answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your topic card.",
              "Ask the friend on your left: 'Which ___ is the ___est?' They answer: 'The ___ is the ___est because ___.'",
              "They turn and ask the next friend with their own card.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Which ___ is the ___est?", "Is the ___ the ___est?"],
            feedback: fixEst,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'the ___est' automatic. The topics are their own lives, so the reasons are real. Listen for the missing 'the', 'more tall', and spelling slips said aloud ('happyest', 'bigest'). Time the circle: beating their own time is a good game.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["The ___ is the ___est."] },
              { level: "Core", task: "Ask and answer without looking at the board, with a reason." },
              { level: "Stretch", task: "Add a reason and a contrast: 'The giraffe is the tallest because its neck is long, although it isn't the heaviest.'", frames: ["The ___ is the ___est because ___, although ___."] },
            ],
          },
        },
        {
          after: "Talk about your family or your group (SB 161 F)",
          slide: {
            kind: "writing",
            title: "Join them: because, although, so, which",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences. Join them into ONE longer sentence with the joining word in brackets.",
              "Say your sentence first, then write it. Check 'the' before every -est word.",
              "Compare with your partner. Whose sentence gives the clearest reason?",
              "Then write one more sentence of your own about the best or the biggest thing in your city, with because or although.",
            ],
            items: [
              { q: "My bag is the heaviest in our class. I carry a lot of books. (because)", answer: "My bag is the heaviest in our class because I carry a lot of books." },
              { q: "This is the funniest film I have seen. The ending is a little sad. (although)", answer: "This is the funniest film I have seen, although the ending is a little sad." },
              { q: "Zog is the strongest goat on the mountain. Zig is the fastest. (but)", answer: "Zog is the strongest goat on the mountain, but Zig is the fastest." },
              { q: "Our school is the oldest building in the street. It is also the quietest. (and)", answer: "Our school is the oldest building in the street, and it is also the quietest." },
              { q: "Winter is the coldest season in my city. We wear thick coats. (so)", answer: "Winter is the coldest season in my city, so we wear thick coats." },
            ],
            frames: ["___ is the ___est ___ because ___.", "Although ___, ___ is the ___est.", "___ is the ___est, so ___."],
            checklist: ["'the' is before every -est word", "happy becomes happiest; big becomes biggest; good becomes best", "A comma before but, and and so, and a joining word in every sentence"],
            sayIt: "Read your best sentence to your partner. Then say it again with a different joining word.",
            teacherNote: "Five harder items: a reason (because), a contrast (although, but), an addition (and) and a result (so). Accept any correct joining; the model answers are one way. Mark 'the' before -est and the spelling, not the vocabulary. Do item 1 aloud together first.",
            tiers: [
              { level: "Support", task: "Do items 1, 3 and 5 with the frames." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Do all five, then join three ideas into one sentence: 'My bag is the heaviest in class because I carry my laptop, although my laptop is the lightest model.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u16-l4": {
      objectives: ["I can compare sports and talk about my favorite one with reasons and examples, three times, faster and smoother each time."],
      drop: ["Kick, throw, hit: sports chant", "Act it, guess it: sports TPR"],
      trim: { "Push or pull? Sports and forces": 4 },
      add: [
        {
          after: "Ball toss: say the comparative and the superlative (SB 163 F)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: -er, -est and the sports world",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past or change the person or thing. Then compare sports and players you really know.",
            chunks: [
              "A cheetah is faster than a horse, and it is the fastest animal on land.",
              "Is tennis easier to learn than golf? Yes, it is, but golf is the calmest sport I know.",
              "Last season our team was the youngest in the league, so we weren't the strongest.",
              "The healthiest players eat well and sleep well, although they are sometimes the busiest.",
              "Running is cheaper than swimming because you don't need a pool.",
              "My sister is lazier than I am, but she is the funniest person in our family.",
            ],
            recycle: ["The goat is stubborn because it wants to go first.", "The heaviest box is the hardest to push."],
            rounds: drillRounds("Real talk: compare two sports or two players you know. Use -er and -est, give a reason, and your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Is / Are ...?, X = isn't / aren't, + = add because, although, so or when, T = was / were (last season), P = a new person or thing (my brother, tennis, the players).",
              "Say the WHOLE new sentence. Check the endings: faster, the fastest, lazier, the funniest, bigger.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'more fast', 'funnyer' or a missing 'the') and fix them together; then go on.",
              "In round 3 the drill becomes real: compare two real sports or players and give a reason.",
            ],
            prompts: ["A horse is faster than a dog. (?)", "Golf is easier than tennis. (X)", "Running is cheap. (+ because)", "Our team is the strongest. (T)", "My sister is funnier than I am. (P: my brothers)"],
            feedback: fixEr,
            teacherNote: "The lesson's grammar at speed: the spelling of -er and -est (heavy, heavier, the heaviest; big, bigger, the biggest). Grades 6-7 can take the whole set. Listen for 'more fast', 'funnyer', the missing 'the' before -est and 'than' dropped. Vietnamese has no comparative ending, so 'more fast' is a natural slip. Round 3 is real talk about sports they know.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the ending cards.", frames: ["Is ___ ___er than ___? Yes, it is. / No, it isn't.", "___ is the ___est because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Last season our team wasn't the fastest, although it was the youngest. Does age matter more than practice?'" },
            ],
          },
        },
        {
          after: "Tell your partner about speed and movement in a sport (SB 163 Write)",
          slide: {
            kind: "fluency",
            title: "Sport talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same sport talk to three friends, with a reason and an example. Each talk is shorter and smoother.",
            chunks: [
              "My favorite sport is soccer because it is fast, and the whole team works together.",
              "We run, kick and jump, but the fastest part is the moment before a goal.",
              "A ball is faster than any player, so the players must think quickly.",
              "For example, our best player always looks up before she passes.",
            ],
            recycle: ["It is easier to push than to pull.", "A big force makes it move faster."],
            rounds: [
              { seconds: 80, say: "Partner 1: each of you gives your sport talk in turn. The listener counts your reasons on their fingers." },
              { seconds: 70, say: "Partner 2: each of you gives the same talk in turn, in less time." },
              { seconds: 60, say: "Partner 3: fast and smooth! Each of you talks in turn. The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the signal sounds, line B moves one step to the left: a new partner.",
              "Give the same talk again, a little faster. Do this three times in all.",
            ],
            feedback: fixEr,
            teacherNote: "Same talk, less time, new listener: a 4-3-2 routine. Saying it again to a new partner keeps the repeat real, and the one-minute fix between round 1 and round 2 makes it accurate as well as fast. Do not add new language between rounds. Listen for 'more fast', 'funnyer' and the dropped 'the' before -est.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite sport is ___ because ___.", "The fastest part is ___."] },
              { level: "Core", task: "Say four or five sentences, with a reason and an example, without the board." },
              { level: "Stretch", task: "Compare two sports and add a contrast: 'Soccer is faster than golf, although golf is harder to master. The fastest part of soccer is ...'", frames: ["___ is faster than ___, although ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: -er, -est and the sports world",
          slide: {
            kind: "writing",
            title: "Fix the sports sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. There are two mistakes in every sentence!",
              "Find them: a wrong -er or -est ending, a missing 'the', a missing 'is' or a wrong spelling.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "A horse is more fast than a dog, but it is not the most fast animal.", answer: "A horse is faster than a dog, but it is not the fastest animal." },
              { q: "She is the funnyest girl in the team, and she is also more happy than anyone.", answer: "She is the funniest girl in the team, and she is also happier than anyone." },
              { q: "The tennis ball lighter than the basketball, so it moves more fast.", answer: "The tennis ball is lighter than the basketball, so it moves faster." },
              { q: "Our field is muddyer than the school field, but it is the bigest.", answer: "Our field is muddier than the school field, but it is the biggest." },
              { q: "Baseball is easyer to learn than golf, and it is also the most cheap.", answer: "Baseball is easier to learn than golf, and it is also the cheapest." },
            ],
            checklist: ["faster, not 'more fast'", "happy, funny, muddy, easy: the y becomes ier or iest", "'the' before every -est word, and 'is' is there"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "Five harder items with two mistakes each: the -er / -est endings, the y-to-i spelling, the missing 'the' and the missing 'is'. Fix item 1 together first and say why: short words just add -er. Vietnamese has no comparative ending, so 'more fast' is a natural slip.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 3 and 5 with the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with two mistakes each for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My sport talk",
        prompt: "Tell us about your favorite sport. Say what people do in it, which part is the fastest, and why you like it. Compare it with another sport and give an example from a game you played or watched.",
        length: "90-120 seconds",
        steps: [
          "Plan: choose your sport. Write what people do, one comparison with another sport, a reason and an example in a few words each.",
          "Practice your talk three times, in front of a mirror or to a friend on a call. Each time speak a little faster and with fewer stops.",
          "Record it once. Look at the camera, speak clearly and use linking words: first, also, however, because, for example.",
          "Watch it once. Listen for the -er and -est endings and the 'the' before -est, and tell yourself one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what your sport is, compare it with another sport, and give a reason and an example. Keep talking without long stops.",
        words: ["basketball", "soccer", "tennis", "baseball", "hockey", "golf"],
        grammar: ["My favorite sport is ___ because ___.", "___ is faster than ___, but ___ is the ___est.", "For example, ___."],
        rubric: [
          { label: "The sport", description: "Says what the sport is and what people do in it.", weight: 2 },
          { label: "Reasons and examples", description: "Gives a reason (because, so, although) and an example (for example) for what they say.", weight: 3 },
          { label: "-er and -est", description: "Uses -er and 'the -est' correctly: faster, the fastest, with 'the'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole, connected sentences, not single words.", weight: 3 },
          { label: "Sport words", description: "Uses sports words from the unit.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["My favorite sport is ___ because ___.", "We ___ and ___.", "The fastest part is ___."], tips: ["Write one reason before you record."] },
          { level: "Core", who: "Most students", frames: ["My favorite sport is ___ because ___. For example, ___.", "___ is faster than ___, but ___ is the ___est."], tips: ["Say one -er word and one -est word, each with a reason."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although ___ is faster than ___, I think ___ is the best sport because ___.", "If you want to be the best, you ___."], tips: ["Compare two sports, give your opinion and end with advice for a beginner."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u16-l5": {
      objectives: ["I can explain what is easy or hard to push or pull, with reasons and examples, again and again, without stopping."],
      drop: ["Push it forward chant", "Easy or hard to push or pull? Test and sort"],
      trim: { "Act out an action from a poster (SB 165 D)": 5 },
      add: [
        {
          after: "Tell the class about your poster (SB 165 C)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: forces, easier and harder",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past or change the thing. Then explain forces you use in your own day.",
            chunks: [
              "A heavy box is harder to push than a light one, so we need a bigger force.",
              "Is it easier to pull a cart than to push it? Yes, it is, although it depends on the ground.",
              "The heaviest box in the room isn't the hardest to move if it has wheels.",
              "Last week we tested three toys, and the smallest one was the fastest.",
              "When you push a ball harder, it goes farther, so a big push makes the biggest change.",
              "Does friction make things slower? Yes, it does, because the surfaces rub together.",
            ],
            recycle: ["The goats pushed and pushed.", "A jet is faster than a train."],
            rounds: drillRounds("Real talk: explain to your partner something you push, pull or carry every day (a door, a bag, a bike). Say if it is easy or hard and why, and your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question (Is it ...? Does it ...?), X = isn't / doesn't, + = add because, although, so or when, T = last week (was / were, didn't), P = a new thing (the ball, the cart, two boxes).",
              "Say the WHOLE new sentence. Check 'than' after -er words and 'the' before -est words.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'more easy', a missing 'than' or 'It depend') and fix them together; then go on.",
              "In round 3 the drill becomes real: explain a force from your own day, with a reason and an example.",
            ],
            prompts: ["The ball is easy to push. (?)", "The box is hard to pull. (X)", "The box is hard to push. (+ because)", "We test the toy cars. (T)", "The cart goes faster. (P: the balls)"],
            feedback: fixEst,
            teacherNote: "There is no grammar slide in this wrap-up lesson, so the drill takes the unit's grammar in the context of the forces poster: -er than, the -est, easy / hard to ... and present simple facts. Grades 6-7 can take the whole set at speed. Listen for 'more easy', the missing 'than' and 'the' and the -s in 'it depends'. Round 3 is real talk about forces they use every day.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with frames on the board.", frames: ["Is the ___ easy / hard to push? Yes, it is. / No, it isn't.", "The ___ is ___er than the ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Last week the cart wasn't the easiest to push, although it was the lightest. Why does the ground change the force we need?'" },
            ],
          },
        },
        {
          after: "Grammar drill: forces, easier and harder",
          slide: {
            kind: "fluency",
            title: "Poster talk: same task, three partners",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same poster talk three times, with three partners. In each round partner A talks, then partner B. Each time it is smoother, with a reason and an example.",
            chunks: [
              "The ball is easy to push because it is small, but the box is hard to push because it is heavy.",
              "The heaviest box is the hardest to push, so I need a big force to move it.",
              "A small force moves it slowly, but a big force moves it quickly.",
              "For example, it is easier to push a cart than to carry the same boxes.",
            ],
            recycle: ["The goats pushed and pushed.", "A jet is faster than a train."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about the poster, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells the same talk, a little faster, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 3: New partner. Partner A tells the talk again, smooth and clear, then Partner B." },
            ],
            steps: [
              "Hold your poster so your partner can see it.",
              "Point to each picture as you say its sentence, with a reason.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "The listener gives a thumbs up when they hear 'the hardest', 'the easiest' or 'because'.",
            ],
            feedback: fixEst,
            teacherNote: "A task repeat: the same task with new partners. The language does not change, so attention can move from finding words to saying them smoothly and adding reasons. Listen for 'the heaviest box is hardest' (the missing 'the'), 'more easy' and 'easy push'.",
            tiers: [
              { level: "Support", task: "Say one sentence for each picture with the frames.", frames: ["The ___ is easy / hard to push because ___."] },
              { level: "Core", task: "Say four sentences with a reason and an example, without the frames." },
              { level: "Stretch", task: "Add a contrast: 'The heaviest box is the hardest to push, although it moves easily on wheels because there is less friction.'", frames: ["The ___ is the ___est to ___, although ___."] },
            ],
          },
        },
        {
          after: "Plan my forces poster (SB 165 B)",
          slide: {
            kind: "writing",
            title: "Make my poster sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the short sentence with the teacher.",
              "Make it bigger: add what the brackets say (a reason, a contrast, a place and a time, an example).",
              "Write your big sentence. Check the capital letter, the commas and 'the' before -est.",
              "Read your five sentences to your partner.",
            ],
            items: [
              { q: "The ball is easy to push. (add: a reason with because)", answer: "The ball is easy to push because it is small and light." },
              { q: "The box is hard to pull. (add: a contrast with although)", answer: "The box is hard to pull, although the floor is smooth." },
              { q: "We push the cart. (add: when, where and how)", answer: "Every morning we push the cart across the playground with both hands." },
              { q: "Heavy things need a big force. (add: an example with for example)", answer: "Heavy things need a big force; for example, we need two people to move a piano." },
              { q: "A small force moves it slowly. (add: a contrast with but)", answer: "A small force moves it slowly, but a big force moves it quickly." },
            ],
            frames: ["The ___ is easy / hard to ___ because ___.", "___, although ___.", "For example, ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "'the' before the -est word and 'than' after the -er word", "The new part is in the right place, with a comma where it needs one"],
            sayIt: "Read your best big sentence to your partner, then say it again without looking.",
            teacherNote: "Five harder items: a reason, a contrast, an adverbial of time and place, and an example. Do item 1 aloud first and ask where the new part goes. Check the capital letter, the comma and 'the' / 'than'; accept any correct expansion, since the model answers are one way.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 5 with the teacher." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two big sentences about your own poster, each with a reason and a contrast." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u16-l6": {
      objectives: ["I can say and write 'the strongest', 'the fastest' and 'the best' sentences with reasons and examples, fast and right."],
      drop: ["Race to the winner", "Movement break: Be the -est"],
      trim: { "Remember it!": 5 },
      add: [
        {
          after: "The Goat Games scoreboard",
          slide: {
            kind: "fluency",
            title: "Grammar drill: the Goat Games champions",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it, move it to the past or change the person. Then give your own opinions about winners and champions.",
            chunks: [
              "Zog is the strongest goat on the mountain, although Zig is the fastest.",
              "Who has the longest rope in the group? Zig does, so he wins that game.",
              "Is this the best game of the day? No, it isn't, but it is the funniest.",
              "Yesterday was the wettest day of the week, so we stayed inside.",
              "Which is the heaviest box? The red one is, because it is full of books.",
              "I think the best way to win is to practice every day, although you also need a little luck.",
            ],
            recycle: ["A horse is faster than a tortoise.", "Is the red bag the heaviest? Yes, it is."],
            rounds: drillRounds("Real talk: tell your partner who or what the champion is in your school, your sport or your favorite game, and why. Your partner asks one follow-up question."),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Is / Who has / Which is ...?, X = isn't / doesn't, + = add because, although, so or when, T = was / last year, P = a new person or thing (I, my team, the red box).",
              "Say the WHOLE new sentence, with 'the' before every -est word and the right spelling: wettest, heaviest, best.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Zog is strongest', 'the goodest' or 'the wetest') and fix them together; then go on.",
              "In round 3 the drill becomes real: name a real champion, say why, and answer your partner's question.",
            ],
            prompts: ["Zog is the strongest goat. (?)", "Zig has the longest rope. (X)", "The red box is the heaviest. (+ because)", "Today is the wettest day. (T)", "Zoe is the fastest goat. (P: my team)"],
            feedback: fixEst,
            teacherNote: "The unit's grammar, the -est words, at speed, mixed with Unit 15's comparing phrases for spaced retrieval. Grades 6-7 can take the whole set: questions, negatives, joining words, the past and a change of person. Listen for the dropped 'the', 'goodest' for 'best', and spelling said aloud ('happyest', 'bigest', 'wetest'). Round 3 is real talk about winners they know.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with frames on the board.", frames: ["Who has the ___est ___? ___ does.", "___ is the ___est ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, without the frames." },
              { level: "Stretch", task: "Use two signs at once and add a follow-up question: 'Yesterday wasn't the wettest day, although it was the coldest. Does the best team always win?'" },
            ],
          },
        },
        {
          after: "Grammar drill: the Goat Games champions",
          slide: {
            kind: "fluency",
            title: "Champion sprint: the Goat Games",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with 'the' before the -est word and a reason or a contrast.",
            chunks: [
              "Zoe is the fastest goat, and Zog is the strongest in the herd.",
              "Our school has the biggest gym in the city, so it hosts many games.",
              "The best player isn't always the tallest, but she is usually the one who practices the most.",
              "Which game was the hardest, and why? The tug-of-war was, because the other team was heavier.",
              "This is the happiest team I know because everybody helps everybody else.",
            ],
            recycle: ["A horse is faster than a tortoise.", "Is the red bag the heaviest? Yes, it is."],
            rounds: [
              { seconds: 70, say: "Together: the teacher flashes a card, the class says the whole sentence." },
              { seconds: 70, say: "Row against row: one row asks, the other answers with a reason. Then swap." },
              { seconds: 60, say: "Champion round: one student at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            feedback: fixEst,
            teacherNote: "A high-energy recall of the -est words, mixed with Unit 15's comparing phrases (spaced retrieval keeps old grammar from fading). Listen for the dropped 'the', 'goodest' for 'best', and spelling said aloud ('happyest', 'bigest'). The sentences have two parts, so students practice reasons and contrasts, not just the form.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["___ is the ___est ___."] },
              { level: "Core", task: "Say the sentence without the board and add a reason." },
              { level: "Stretch", task: "Say it and add a reason and a contrast: 'Zog is the strongest because he pushes the heaviest box, although he is the slowest.'" },
            ],
          },
        },
        {
          after: "Say it, then write: the Goat Games report",
          slide: {
            kind: "writing",
            title: "My champion report: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, every 'the ___est' and the closing sentence, and circle the linking words.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion at least once each.",
              "Check: tick the checklist. Your partner points to every 'the' before an -est word.",
              "Teacher: look only at 'the' before -est and the spelling of -iest words and doubled letters (biggest). Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: the Goat Games",
              text: "The Goat Games had three big winners. First, Zoe was the fastest goat, although she was also the smallest. Zog was the strongest because he pushed the heaviest box across the field. However, Zig had the longest rope but he was the slowest runner. For example, he needed ten seconds more than Zoe in the race. In conclusion, I think Zoe was the champion of the day because she was the fastest and the happiest, and she helped every goat at the end.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who or what was in your games? Say how many winners there were." },
              { label: "Detail 1: the fastest", prompt: "Who was the fastest or the strongest? Give a reason with because or although." },
              { label: "Detail 2: another -est", prompt: "Who had the longest, the biggest or the highest? Use however or but." },
              { label: "Detail 3: an example", prompt: "Give one example, with numbers or a short story." },
              { label: "Closing", prompt: "In conclusion, who is the champion, and why?" },
            ],
            frames: ["The Goat Games had ___ winners.", "First, ___ was the ___est goat, although ___.", "___ was the ___est because ___.", "However, ___ had the ___est ___ but ___.", "For example, ___.", "In conclusion, I think ___ was the champion because ___."],
            checklist: [
              "A topic sentence first and a closing sentence with in conclusion",
              "At least four linking words: first, also, however, because, for example",
              "'the' before every -est word, and the right spelling: happiest, biggest, best",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your report to your partner like a sports reporter. Then tell it again in one minute, looking only at your five boxes.",
            teacherNote: "A full paragraph for grades 6-7: six to eight sentences, planned in five boxes with words, using the unit's grammar, the -est words, joined with 'but', 'because' and 'although'. Students write about the goats or about a team or event they know; keep real names off the board model. Mark only two things ('the' before -est and the spelling) and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, six sentences in all.", frames: ["The Goat Games had ___ winners.", "___ was the ___est because ___.", "In conclusion, I think ___ was the champion."] },
              { level: "Core", task: "Write six or seven sentences with all the linking words in the checklist." },
              { level: "Stretch", task: "Write eight sentences and add a contrast and a second example: 'Although Zog was the strongest, he was also the tiredest; for example, ...'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The best and the -est in my life",
        prompt: "Tell us about the -est things you know. What is the biggest, the fastest or the best thing in your school, your city or your day? Give a reason and an example for each one, and say which one you think is the most important.",
        length: "90-120 seconds",
        steps: [
          "Plan: choose three things (one big, one fast, one best). Write a reason and an example for each in a few words.",
          "Practice your talk three times, in front of a mirror or to a friend on a call. Each time speak a little faster and with fewer stops.",
          "Record it once. Look at the camera, speak clearly and use linking words: first, also, however, because, for example.",
          "Watch it once. Listen for 'the' before every -est word and tell yourself one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Say three 'the -est' sentences. Give a reason and an example for each one, and keep talking without long stops.",
        words: ["strong", "fast", "heavy", "good", "happy", "big"],
        grammar: ["The ___est ___ is ___ because ___.", "The best ___ is ___.", "For example, ___."],
        rubric: [
          { label: "The -est words", description: "Says 'the biggest', 'the fastest', 'the best' correctly, with 'the' and the right spelling.", weight: 3 },
          { label: "Reasons and examples", description: "Gives a reason (because, so, although) and an example (for example) for each one.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole, connected sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -est ending and the -s of plurals can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["The biggest ___ is ___ because ___.", "The fastest ___ is ___."], tips: ["Write one reason for each thing before you record."] },
          { level: "Core", who: "Most students", frames: ["The ___est ___ in my school is ___. For example, ___.", "The best ___ is ___ because ___."], tips: ["Give a reason and an example for every thing."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["___ is stronger than ___, but ___ is the strongest because ___.", "Although ___, I think ___ is the most important because ___."], tips: ["Compare two things, then name the winner and defend your choice."] },
        ],
      },
    },
  },
};
