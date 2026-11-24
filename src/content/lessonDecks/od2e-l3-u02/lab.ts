import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 2 "Games, Friends
// and Fun" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Lessons 1, 3 and 4 write a whole paragraph (description, opinion, recount).
// Every lesson gets one fluency routine (the unit's grammar, gerunds and question words,
// said again and again as whole sentences with Unit 1's phrases mixed back in) and one
// writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a recorded
// talk for home that repeats the class routine days later. Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; children who then say the same thing again use the fixed form. For grammar, make the child fix it rather than telling them: start the phrase and pause ('Swimming ...?'), point to the frame on the board, hold up a finger for the missing -ing or -s, or repeat the error with a rising voice ('She is good at dance?'). For example, 'Running and jumping is fun' gets two raised fingers and 'Two things, so ... are?'. For a sound, just say it right and let the child echo it. Say every final -ing, -s and -ed clearly yourself: children copy what they hear.";

const askFix =
  "Listen and do not stop the chain. Note two or three question mistakes (no names). After round 1, stop for one minute and put them on the board for the class to fix; then go on, and children who ask again use the fixed form. Make the child self-correct: start the question and pause ('Where ...?'), point to the do / does card, or hold up a finger for the missing word. 'Where you play?' gets 'Where ... you play?' with a raised finger for 'do'. 'Why does she likes it?' gets a rising voice on 'likes?'. For a sound, say it right and let the child echo. Say do / does and the final -s of verbs clearly yourself.";

export const odL3U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u02-l1": {
      objectives: ["I can say 'My favorite game is ___. I play it with ___ at ___.' fast, and write a short paragraph about it."],
      trim: { "Do it and guess": 3 },
      add: [
        {
          after: "What's your favorite game? (SB 16 C)",
          slide: {
            kind: "fluency",
            title: "Game sprint: my favorite game",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole game sentence fast and smooth, with no stops.",
            chunks: [
              "My favorite game is tag.",
              "I play it with my friends at the park.",
              "It is fun because we run and laugh.",
              "Yes, I agree. Tag is fun.",
              "Actually, I disagree. I think football is more fun.",
            ],
            recycle: ["I think it is fun because we play together.", "The fair is exciting."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a game picture and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says a whole sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the game card. Say a WHOLE sentence about it, not one word.",
              "Say it with the class first, then with your partner, then alone.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on to round 2.",
            ],
            prompts: ["(card: tag)", "(card: hide and seek)", "(card: football)", "(card: skipping rope)", "(card: swimming)"],
            feedback: correct,
            teacherNote: "Whole sentences only: 'I play it with my friends at the park' as one smooth piece, never a list of words. This is the first sprint of the unit, so the children hear the unit's opinion phrases (agree / disagree) said many times before Lesson 3 adds -ing. Listen for 'My favorite game is' (is is often dropped) and the final -s on 'friends'. Mix in Unit 1's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["My favorite game is ___.", "I play it with ___ at ___."] },
              { level: "Core", task: "Say the sentences alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason and disagree politely: 'It is fun because ___. Actually, I think ___ is more fun.'", frames: ["It is fun because ___.", "Actually, I disagree. I think ___ is more fun."] },
            ],
          },
        },
        {
          after: "Our games chart (SB 17 Think)",
          slide: {
            kind: "writing",
            title: "My favorite game: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, how to play, why it is fun and the closing question.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use First, Then and because.",
              "Check: tick the checklist. Swap with a partner: they underline one -s ending and one because, and tell you one thing they liked.",
              "Teacher: while they write, look only at 'is' in 'My favorite game is ...' and plural -s (friends, cousins). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Tag",
              text: "My favorite game is tag, and it is the most exciting game at our school. I play it with my friends at the park after class. First, one player is the chaser and counts to ten. Then everybody runs away, so the chaser cannot touch us. Tag is fun because we enjoy running and laughing, and it is good exercise, too. Do you like tag?",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is your favorite game? What is it like? (fun, exciting, hard)" },
              { label: "Who and where", prompt: "Who do you play it with? Where do you play it?" },
              { label: "How to play: First, ... Then, ...", prompt: "What do you do first? What happens next?" },
              { label: "Why it is fun: because ...", prompt: "Why do you like it? End with a question for the reader." },
            ],
            frames: ["My favorite game is ___.", "I play it with ___ at ___.", "First, ___. Then ___.", "It is fun because ___."],
            checklist: [
              "My first sentence says the game and what it is like",
              "'is' in 'My favorite game is ...'",
              "friends, cousins: the -s is there",
              "First, Then and because join my ideas",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This replaces the one-sentence 'grow it' task: the same check on 'is' and the plural -s now sits in the checklist. Mark only two targets ('is' and plural -s) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. Keep the model on the board while the children write.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["My favorite game is ___.", "I play it with ___ at ___.", "It is fun because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a disagreement or a comparison: 'Some people like football, but I think tag is more fun because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u02-l2": {
      objectives: ["I can tell the story of the ball again, shorter and faster each time."],
      trim: { "Pass the ball chant": 3 },
      add: [
        {
          after: "The ball's journey",
          slide: {
            kind: "fluency",
            title: "Retell the ball's journey",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times to three partners. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the ball was with one child.",
              "Then it traveled to a new place.",
              "People there played a different game with it.",
              "Finally, the ball came back.",
            ],
            recycle: ["The fair was exciting.", "I felt excited."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole story, then Partner B. Use the key-word cards on the board. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Cover the cards if you can. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast and smooth, then Partner B. The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the key-word cards for the journey: first, then, a different game, finally.",
              "Tell the story to your partner: A tells it, then B tells it. The listener has a job: count the places on their fingers.",
              "Teacher: after round 1, stop for one minute. Put two sentences you heard with a mistake on the board (no names) and the class fixes them. Then go on to round 2.",
              "When the bell rings, find a new partner. Each round gets shorter: 75, 60, then 45 seconds each.",
            ],
            prompts: ["(card: first)", "(card: then)", "(card: a different game)", "(card: finally)"],
            feedback: correct,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for what to say. Make the key-word cards from the story as the class read it; do not add new events between rounds. Listen for past tense (-ed and irregular verbs) and for 'the ball' with its article. Accept shorter tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["First, ___.", "Then ___.", "Finally, ___."] },
              { level: "Core", task: "Tell all four parts with the cards, then with the cards turned over." },
              { level: "Stretch", task: "Add how people felt and why: 'Everyone was excited because the game was new.'" },
            ],
          },
        },
        {
          after: "Write the rules",
          slide: {
            kind: "writing",
            title: "Dictogloss: a game with a ball",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Plan: look at the board. Remember: First, Then, If, until are joining words for rules.",
              "Listen: the teacher reads the text once. Just listen.",
              "Listen again and write key words. Then work in your group to rebuild the text.",
              "Check: compare with the real text on the screen and fix your capital letters, full stops and -s endings.",
            ],
            text: {
              title: "A game with a ball",
              text: "Four children play a game with a ball. First, they stand in a circle. Then one child tosses the ball to a friend. The friend must catch it with two hands. If the ball falls, everybody laughs and starts again. They play until the bell rings. It is a simple game, but everybody has fun.",
            },
            frames: ["First, they ___.", "Then one child ___.", "If the ball falls, ___."],
            checklist: ["Every sentence starts with a capital letter and ends with a full stop", "children, friends: the -s is there", "First, Then, If: joining words are in the right place"],
            sayIt: "Read your group's text to another group, then say it again without looking.",
            teacherNote: "Dictogloss works best after a short reminder of the rule or pattern; here it is the sequence words from the rules the class just wrote. Read at natural speed, twice, without repeating a third time. Groups do not need the exact words, only the meaning in good English. Praise 'must' and 'until' when children use them.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and put the three frames in order." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it, then add a last sentence: how do you win?" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Teach me a ball game",
        prompt: "Teach a game you can play with a ball, or with something at home. Say how to play it, step by step, and say why it is fun.",
        length: "60-90 seconds",
        steps: [
          "Look at the rules you wrote in class.",
          "Say the rules three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Use First, Then and You win when.",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Teach a game step by step, say why it is fun, and keep talking without long stops.",
        words: ["ball", "toss", "catch", "circle", "rules", "win"],
        grammar: ["First, ___. Then ___.", "You win when ___.", "You must / must not ___."],
        rubric: [
          { label: "Steps in order", description: "Says how to play in order with First, Then and a way to win.", weight: 3 },
          { label: "Game words", description: "Uses words from the unit: ball, toss, catch, circle, win.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Final -s and -ed can be heard: tosses, children, played.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, you ___.", "Then ___.", "You win when ___."], tips: ["Hold up a finger for each step."] },
          { level: "Core", who: "Most children", frames: ["First, you ___. Then you ___.", "You must ___. You must not ___.", "It is fun because ___."], tips: ["Say why it is fun at the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I learned it when I was ___ years old.", "If ___, you ___. You win when ___."], tips: ["Add who taught you and one tricky rule."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u02-l3": {
      objectives: ["I can say 'Swimming is fun.' and 'I enjoy dancing.' fast and without mistakes."],
      trim: { "Gerund charades": 3, "Rule riddles": 3, "Our big idea: what does -ing do?": 6 },
      add: [
        {
          after: "Fill in the gerund (SB 21 F)",
          slide: {
            kind: "writing",
            title: "The best way to have fun: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the opinion, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with 'In my opinion' and use -ing words as the subject and after enjoy or good at.",
              "Check: tick the checklist. Swap with a partner: they underline one -ing word and tell you if they agree.",
              "Teacher: while they write, look only at is / are with -ing subjects and at -ing after enjoy and good at. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Swimming",
              text: "In my opinion, swimming is the best way to have fun on a hot day. First, swimming is exciting because we jump into the cool water. Also, I enjoy swimming with my cousins, and my brother is good at diving. Running and jumping are fun, too, but they make me very tired. That is why I think swimming is better. What do you think?",
            },
            organiser: [
              { label: "Opinion: In my opinion, ...", prompt: "What is the best way to have fun? Use an -ing word as the subject." },
              { label: "Reason 1: First, ... because ...", prompt: "Why is it fun or exciting?" },
              { label: "Reason 2: Also, I enjoy ...ing / I am good at ...ing", prompt: "Who do you do it with? What are you good at?" },
              { label: "Closing: That is why ...", prompt: "Say your opinion again. Ask the reader a question." },
            ],
            frames: ["In my opinion, ___ing is the best way to ___.", "___ing is ___ because ___.", "I enjoy ___ing with ___.", "That is why I think ___."],
            checklist: [
              "My opinion is in the first sentence",
              "-ing as the subject: one thing is, two things are",
              "After enjoy and good at, the verb has -ing, and the spelling is right (swimming, dancing)",
              "I gave a reason with because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your opinion again without looking, in thirty seconds.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The opinion paragraph lets the children use the unit's gerunds in a real argument, and the joined sentences from the combining task and the fun chart feed its reasons. Mark only two targets (is / are with -ing subjects and -ing after enjoy / good at) with a dot on the line; the child finds and fixes the mistake. Vietnamese learners often write 'Running and jumping is' or 'I enjoy to swim': hold up fingers for these rather than telling them.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["In my opinion, ___ing is the best way to ___.", "___ing is ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a different view: 'Some people like ___ing, but I think ___ing is better because ...'" },
            ],
          },
        },
        {
          after: "My fun chart: six gerunds (SB 21 G)",
          slide: {
            kind: "fluency",
            title: "Fun talk again: -ing sentences",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same fun talk twice, with a new partner each time: better, smoother and without stops.",
            chunks: [
              "Skipping is fun.",
              "I enjoy swimming with my friends.",
              "My sister is good at dancing.",
              "Running and jumping are good for you.",
            ],
            recycle: ["The fair is exciting.", "I feel tired after a race."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells about the fun chart (three -ing sentences), then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A says it again, smoother, and adds one reason with because. Then Partner B. Do not look at the chart." },
            ],
            steps: [
              "Take one minute to plan: choose your three -ing sentences from your fun chart.",
              "Say them to your partner: A talks, then B talks. The listener has a job: tick each -ing word they hear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on.",
              "Change partners for round 2. Say the same ideas again, with the corrections.",
            ],
            feedback: correct,
            teacherNote: "Task repeat: the same task with a new listener after a planning minute. The children already did the chart in the book, so the language is ready; the repeats make it fast. Listen for 'Swim is fun' (no -ing), 'I enjoy to skip' (to instead of -ing) and 'Running and jumping is'. Do not add new vocabulary between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences from your chart with the frames.", frames: ["___ing is fun.", "I enjoy ___ing.", "I am good at ___ing."] },
              { level: "Core", task: "Say three or four sentences, with one reason, without reading." },
              { level: "Stretch", task: "Compare with your partner: 'We both enjoy ___ing, but I am good at ___ing.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u02-l4": {
      objectives: ["I can ask and answer 'What, Where, Who and Why' questions about fun, fast."],
      trim: {
        "Cheer squad": 3,
        "Hot seat: guess my game (SB 23 E)": 6,
        "Verb phrases with get (SB 23 D)": 8,
        "Build the question": 4,
        "Ask and answer: how do you have fun?": 5,
        "Writing practice: how I have fun (Workbook)": 10,
      },
      add: [
        {
          after: "Ask and answer: how do you have fun?",
          slide: {
            kind: "fluency",
            title: "Question chain: how do you have fun?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What do you do for fun?",
              "Where do you play?",
              "Who do you play with?",
              "Why do you like it?",
              "I play at the lake because it is fun.",
            ],
            recycle: ["Skipping is fun.", "I enjoy swimming."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle: ask your friend one question, they answer and ask the next friend." },
              { seconds: 75, say: "Change the question word each time. Go faster!" },
              { seconds: 60, say: "Last chain. Can it go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Ask the friend on your left a question with What, Where, Who or Why.",
              "They answer in a whole sentence, then turn and ask the next friend a new question.",
              "The question words are on cards: use a different one each time.",
              "Teacher: after round 1, stop for one minute. Put two question mistakes on the board and the class fixes them. Then go on to round 2.",
            ],
            prompts: ["What do you do for fun?", "Where do you play?", "Who do you play with?", "Why do you like it?"],
            feedback: askFix,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which makes 'Where do you ...?' automatic. Time the whole circle and tell them: children love beating their own time. Watch for the missing do / does, 'Why does she likes it?' and answers that are one word: ask for a whole sentence with because.",
            tiers: [
              { level: "Support", task: "Ask with the question cards and answer with the frame on the board.", frames: ["I play at ___.", "I play with ___.", "I like it because ___."] },
              { level: "Core", task: "Ask and answer without looking at the cards." },
              { level: "Stretch", task: "Ask a follow-up question: 'How often do you play?' or 'Who taught you?'" },
            ],
          },
        },
        {
          after: "Build the question",
          slide: {
            kind: "writing",
            title: "A game someone taught me: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Then and At the end, and put one question and its answer inside it.",
              "Check: tick the checklist. Swap with a partner: they underline the question and one past verb and tell you one thing they liked.",
              "Teacher: while they write, look only at question word order (do / did) and past verbs (taught, learned). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Hide and seek",
              text: "Last summer, my cousin taught me a game called hide and seek at the lake. First, I asked him, \"How do we play?\" He said, \"One player counts to twenty while the others hide.\" Then I hid behind a big tree, but he found me quickly. It was hard to learn because I laughed too much! At the end he said, \"Good try! You can do it!\" Now I play it with my friends every weekend.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who taught you a game? What game? When and where?" },
              { label: "Detail 1: First, ...", prompt: "What question did you ask? What was the answer?" },
              { label: "Detail 2: Then, ...", prompt: "What happened when you tried it? Was it easy or hard?" },
              { label: "Closing: At the end, ...", prompt: "What did your cousin, friend or teacher say to you? Do you play it now?" },
            ],
            frames: ["Last ___, my ___ taught me a game called ___.", "First, I asked, \"How do we play?\"", "Then I ___. It was hard / easy because ___.", "At the end, ___ said, \"Good try!\""],
            checklist: [
              "My first sentence says who taught me, what game and where",
              "My question has do or did: 'How do we play?' 'What did you play?'",
              "Past verbs: taught, learned, asked, hid, was",
              "First, Then and At the end join my ideas",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This replaces the question-fixing task: the question words now work inside a real recount, with a question and its answer in the text, and the do / did check sits in the checklist. Mark only two targets (do / did in the question and past verbs) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. The paragraph can also be the script for this lesson's recorded fun talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Last ___, my ___ taught me ___.", "First, I asked, \"How do we play?\""] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a second question and answer: 'I asked, \"Who taught you?\" He said, \"My grandfather did.\"'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My fun talk: what, where, who and why",
        prompt: "Tell us how you have fun. Say what you do, where you do it, who you do it with and why you like it.",
        length: "60-90 seconds",
        steps: [
          "Think of one thing you do for fun. Answer What, Where, Who and Why.",
          "Say your answers three times to a grown-up or a toy: each time smoother, like the question chain.",
          "Ask the camera one question: 'What do you do for fun?'",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what, where, who and why in whole sentences, and keep talking without long stops.",
        words: ["fun", "play", "lake", "friends", "because"],
        grammar: ["What / Where / Who / Why do you ___?", "I ___ because ___.", "I enjoy ___ing."],
        rubric: [
          { label: "What, where, who, why", description: "Answers all four questions in whole sentences.", weight: 3 },
          { label: "Questions with do", description: "Asks a question with do or does and the right word order.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; no long pauses to look for words.", weight: 3 },
          { label: "Clear endings", description: "Final -s, -ing and -ed can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I play ___.", "I play at ___.", "I play with ___.", "I like it because ___."], tips: ["Point to a picture for each answer."] },
          { level: "Core", who: "Most children", frames: ["I enjoy ___ing at ___ with ___.", "I like it because ___.", "What do you do for fun?"], tips: ["Say why in a whole sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ taught me when I was ___ years old.", "I am good at ___ing, but ___ is hard for me.", "Why don't you try it?"], tips: ["Add who taught you and say what is hard."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u02-l5": {
      objectives: ["I can talk about my fun place for two minutes, shorter and faster each time."],
      trim: {
        "60-second recall": 3,
        "Rehearse your play": 10,
        "Fun places and friends": 4,
        "Test our big ideas": 3,
        "Big Question video and chart (SB 25 Review A-C)": 7,
      },
      add: [
        {
          after: "Fun places and friends",
          slide: {
            kind: "fluency",
            title: "Fun place talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk about a fun place to three friends. Each talk is shorter and smoother: 75, 60, then 45 seconds.",
            chunks: [
              "My friend and I go to the lake.",
              "We play there because it is fun.",
              "Swimming is my favorite thing to do.",
              "The park is my favorite place to play.",
            ],
            recycle: ["Where do you play?", "I think it is fun because we play together."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the fun place talk, then Partner B. The listener counts the things you do on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A, then Partner B: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, line A talks first, then line B talks. The listener has the other job.",
              "The listener has a job: count the things, then ask one question: 'Why do you like it?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
              "When the bell rings, line B moves one step to the left: a new partner. Then line A talks first again.",
            ],
            feedback: correct,
            teacherNote: "This is the classic 4/3/2 activity, scaled for ten-year-olds: the same talk, less time, a new listener each time. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The one-minute fix after round 1 is what makes it accurate as well as fast: the second telling uses the fixed form.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I go to ___ with ___.", "We ___ there.", "It is fun because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a comparison: '___ is fun, but ___ is more exciting because ___.'" },
            ],
          },
        },
        {
          after: "How to write a play (SB 24 Learn)",
          slide: {
            kind: "writing",
            title: "Model scene: write two lines",
            routine: "model, then write",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read the model scene. Find who is speaking and the question marks.",
              "Write: write two new lines for the scene, one for each speaker.",
              "Check: use the checklist, then read your lines aloud like actors.",
            ],
            text: {
              title: "At the park",
              text: "Scene: A park on Saturday. Two friends meet.\nA: What do you enjoy doing on Saturdays?\nB: I enjoy skipping. What about you?\nA: I am good at swimming, so I go to the lake.\nB: Swimming is fun! Let's go together.",
            },
            frames: ["A: What do you ___?", "B: I enjoy ___ing. What about you?", "A: ___ing is ___ because ___."],
            checklist: ["Each line starts with who is speaking (A: or B:)", "After enjoy and good at, the verb has -ing", "A question mark after a question"],
            sayIt: "Act your two lines with your partner, then say them again without looking.",
            teacherNote: "Modelled writing: the children notice what a short scene does before writing their own, so their lines can go straight into the class play. Point out that each speaker's lines are short and that the question gets an answer. Check enjoy + -ing again: this is where 'I enjoy to skip' comes back.",
            tiers: [
              { level: "Support", task: "Copy the model and change one thing, then act it." },
              { level: "Core", task: "Write two new lines for the scene." },
              { level: "Stretch", task: "Write four lines, with a reason and a polite disagreement." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u02-l6": {
      objectives: ["I can say -ing sentences fast and write a short paragraph about how people have fun."],
      trim: {
        "Grammar mystery: sports day at Blue Lake": 6,
        "Cliff, lake and plain: run and say": 8,
        "Remember it!": 5,
        "Find the match: who enjoys what?": 10,
      },
      add: [
        {
          after: "Cliff, lake and plain: run and say",
          slide: {
            kind: "fluency",
            title: "Champion sprint: -ing sentences",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with the -ing and the is or are.",
            chunks: [
              "Climbing is exciting.",
              "We love dancing in the park.",
              "She is good at diving.",
              "Running and jumping are fun.",
              "What do you enjoy doing?",
            ],
            recycle: ["Where do you play?", "Why do you like it?"],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a word card (climb, dance, dive ...) and the class says a whole sentence." },
              { seconds: 60, say: "Side A asks, side B answers. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. When it flips, say the whole sentence with the -ing word.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "In the last round, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board and fix them together. Then go on to round 2.",
            ],
            prompts: ["(card: climb)", "(card: dance)", "(card: dive)", "(card: run and jump)", "(card: skip)"],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of this unit's grammar mixed with last lesson's questions (spaced retrieval keeps the question words from fading). The cards make the children build -ing sentences from a cue every time. Watch for 'is' with two things, a missing -ing after good at, and spelling slips when they hold the cards (runing).",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, with the frames on the board.", frames: ["___ing is ___.", "I enjoy ___ing.", "She is good at ___ing."] },
              { level: "Core", task: "Say a whole sentence alone for every card." },
              { level: "Stretch", task: "Say two sentences for each card: one with is or are, one with enjoy or good at." },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Dictogloss: how people have fun",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Plan: remember the rule: -ing names the activity. One thing is, two things are.",
              "Listen: the teacher reads the paragraph once. Just listen.",
              "Listen again and write key words. Then rebuild the paragraph in your group.",
              "Check: compare with the text on the screen. Fix the -ing words, is or are, and the spelling.",
            ],
            text: {
              title: "People have fun in many ways",
              text: "People have fun in many ways. Swimming is fun because the water is cool. My cousin enjoys skipping, and she is good at it. Running and jumping are good for you, so we play tag after school. I love dancing with my friends because the music makes me happy. Everybody needs fun, so find a game you enjoy!",
            },
            frames: ["People have fun in many ways.", "___ing is ___ because ___.", "Everybody needs fun, so ___."],
            checklist: ["The paragraph starts with a main idea and ends with a closing sentence", "After enjoy, love and good at, the verb has -ing", "One thing is, two things are"],
            sayIt: "Read your group's paragraph aloud to another group, then say the main idea without looking.",
            teacherNote: "This paragraph is a model for the paragraph the children write next in 'Write it': a topic sentence, supporting sentences with because and so, and a closing sentence. Read it at natural speed, twice. When groups compare, ask which sentence is the topic sentence and which is the closing one, so they use the same shape in their own writing.",
            tiers: [
              { level: "Support", task: "Write the key words and the three frames, then rebuild two sentences." },
              { level: "Core", task: "Rebuild the whole paragraph with your group." },
              { level: "Stretch", task: "Rebuild it, then change two sentences to be about you." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Champion talk: how I have fun",
        prompt: "Tell us how you and your family or friends have fun. Use -ing words, and say why each thing is fun.",
        length: "60-90 seconds",
        steps: [
          "Look at the paragraph you wrote in class.",
          "Say it three times to a grown-up or a toy. Each time a little faster, like in the champion talk.",
          "Use at least three -ing words: ___ing is fun, I enjoy ___ing, I am good at ___ing.",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Use -ing words to say how people have fun, say why, and keep talking without long stops.",
        words: ["swimming", "dancing", "skipping", "running", "climbing", "fun"],
        grammar: ["___ing is ___.", "I enjoy / love ___ing.", "I am good at ___ing.", "Running and jumping are ___."],
        rubric: [
          { label: "-ing sentences", description: "Uses three or more -ing words correctly: -ing is, enjoy + -ing, good at + -ing.", weight: 3 },
          { label: "Reasons", description: "Says why with because or so.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Says is with one thing and are with two things, and the -ing and -s endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ing is fun.", "I enjoy ___ing.", "I am good at ___ing."], tips: ["Point to your paragraph as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ing is ___ because ___.", "I enjoy ___ing with my ___.", "___ing and ___ing are ___."], tips: ["Say one thing and then two things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Everybody needs fun because ___.", "In my opinion, the best way to have fun is ___ because ___."], tips: ["End with your opinion and a reason."] },
        ],
      },
    },
  },
};
