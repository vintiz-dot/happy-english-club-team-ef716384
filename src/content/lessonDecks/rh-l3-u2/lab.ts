import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 2 "Nature's Balance"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Jupiter, ages 9-10, preparing for
// the Hanoi grade-6 entrance exam. Every lesson gets one fluency routine (the lesson's
// exam grammar point said again and again as whole sentences, with Unit 1's phrases mixed
// back in) and one writing routine (sentence combining, fix it, expand it, dictogloss or
// a model, always ending with a spoken step). Four lessons end with a recorded talk that
// repeats the class routine at home. Time comes from warm-ups, games and repeats, never
// from the book pages, the grammar, the exam practice or the homework. All text is original.

const sound =
  "For a sound (final -s, -ed, the th in 'the'), just say the word right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear, and many Vietnamese speakers drop them.";

const fixMinute =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: ";

export const rhL3U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u2-l1": {
      objectives: ["I can ask a Wh- or How question quickly and correctly, without stopping."],
      add: [
        {
          after: "Exam practice: ask about the underlined part",
          slide: {
            kind: "writing",
            title: "Fix it: questions from the pond",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each question with your partner. Each one has ONE mistake with the helper (do / does / did) or the verb.",
              "Find it and cross it out. Write the question the right way.",
              "Read all four fixed questions aloud together, fast and smooth.",
            ],
            items: [
              { q: "How often do the bees visits the flowers?", answer: "How often do the bees visit the flowers?" },
              { q: "What the frog eat at night?", answer: "What does the frog eat at night?" },
              { q: "How long did the turtle lived?", answer: "How long did the turtle live?" },
              { q: "How many fish is in the pond?", answer: "How many fish are in the pond?" },
            ],
            frames: ["What does a ___ eat?", "How often do ___ ___?", "How long did ___ ___?"],
            checklist: [
              "Every question has a helper: do, does, did, is, are or can",
              "After do, does or did, the verb stays plain: visit, eat, live (no -s, no -ed)",
              "Many fish are: the verb 'are' matches more than one",
            ],
            sayIt: "Read your four fixed questions to your partner. Then cover the page and ask them again from memory.",
            teacherNote: "These are common mistakes for Vietnamese speakers in English questions: dropping the helper (Vietnamese questions do not need one) and putting -s or -ed on the verb after do, does or did. Fix item 1 together first and say aloud why: 'do' already shows the time, so the verb stays plain. Keep to two error types (helper, plain verb); the 'is / are' item is the bonus.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 (plain verb after do and did) with the frames on the board." },
              { level: "Core", task: "Fix all four questions." },
              { level: "Stretch", task: "Fix all four, then write two new questions about an animal that have a mistake for your partner to fix." },
            ],
          },
        },
        {
          after: "Fix it: questions from the pond",
          slide: {
            kind: "fluency",
            title: "Question sprint: ask it fast",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Ask and answer the whole question in one smooth breath, with no stops.",
            chunks: [
              "What do snakes eat?",
              "How often does she water the plants?",
              "How long did the tortoise live?",
              "Where does a camel live?",
              "How many eggs did the bird lay?",
            ],
            recycle: ["She helps her neighbours every Sunday.", "My friends and I carry the bags."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a statement card, the class asks the whole question." },
              { seconds: 60, say: "Pairs: one shows a card, the other asks the question. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many correct questions can you ask?" },
            ],
            steps: [
              "Read the statement card. Turn it into a question: 'Snakes eat rats.' becomes 'What do snakes eat?'",
              "Your partner answers in a whole sentence: 'Snakes eat rats.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3, count your correct questions on your fingers.",
            ],
            prompts: ["Snakes eat rats.", "She waters the plants twice a week.", "The tortoise lived for 150 years.", "A camel lives in the desert.", "The bird laid four eggs."],
            feedback:
              fixMinute +
              "start the question and pause ('Where does a camel ...?'), point to the Wh- + do/does/did + subject + verb frame, or hold up a finger for the missing helper. If a child says 'How often does she waters?', repeat the error with a rising voice ('She waters?') so the child hears the extra -s and takes it off. " +
              sound,
            teacherNote: "Whole questions, never single words: the aim is for 'What does a camel eat?' to come out as one piece. Turning a statement into a question is the exam's own move, so every round also practises the transformation. Listen for the helper (do / does / did) and for a plain verb after it. Mix in Unit 1's sentences every few cards so last unit's -s stays fast.",
            tiers: [
              { level: "Support", task: "Ask with the frame on the board and the picture of the animal.", frames: ["What do ___ eat?", "Where does a ___ live?"] },
              { level: "Core", task: "Ask without looking at the board and answer in a whole sentence." },
              { level: "Stretch", task: "Ask a follow-up question each time: 'How often does she water the plants?' 'Twice a week.' 'How long does she water them?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal interview",
        prompt: "Choose an animal. Be the reporter and the animal. Ask three questions (What, Where, How often or How long) and answer each one in a whole sentence.",
        length: "60-90 seconds",
        steps: [
          "Choose your animal and write three questions with Wh- or How.",
          "Practise the interview three times with a grown-up or a toy, a little faster each time, like in class.",
          "Record it once. Ask the question, then answer as the animal.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 180,
        kidSummary: "Ask three correct questions, answer them in whole sentences, and keep going without long stops.",
        words: ["habitat", "survive", "balance", "food chain", "predator"],
        grammar: ["Wh- and How questions", "What / Where / How often / How long + do / does / did"],
        rubric: [
          { label: "Correct questions", description: "Asks three questions with a helper (do, does, did) and a plain verb.", weight: 3 },
          { label: "Whole answers", description: "Answers in whole sentences, not one word.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; the interview flows from one question to the next.", weight: 3 },
          { label: "Clear endings", description: "The -s and -ed at the end of words can be heard (snakes, lives, lived).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["What does a ___ eat?", "Where does a ___ live?", "It eats ___. / It lives in ___."], tips: ["Look at your three written questions between each one."] },
          { level: "Core", who: "Most children", frames: ["How often does a ___ ___?", "How long did the ___ live?", "I ___ about ___ times a week."], tips: ["Use at least one How question and give a number in the answer."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["How often do you ___?", "How many ___ did you ___ last week?"], tips: ["Ask a follow-up question that comes from the answer, with no notes."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u2-l2": {
      objectives: ["I can tell a cause-and-effect chain with 'so' and 'because', smoothly, three times."],
      trim: { "Chain reaction: one small change": 7 },
      add: [
        {
          after: "Exam practice: rewrite without changing the meaning",
          slide: {
            kind: "fluency",
            title: "Chain reaction: same story, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same chain-reaction story three times. In each round Partner A tells it, then Partner B. Each round is smoother and you say more.",
            chunks: [
              "The flowers died, so the bees left.",
              "The bees left because the flowers died.",
              "Why did the bees leave?",
              "Plant more flowers!",
              "What a sad garden!",
            ],
            recycle: ["She helps her neighbours every day.", "My cousins play chess on Sundays."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells a chain of four events with 'so' and 'because', then Partner B tells theirs. Use the picture cards. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells the same chain again, then Partner B. Fewer stops." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells the same chain, then Partner B. Fast and smooth. Add one command or one exclamation at the end." },
            ],
            steps: [
              "Take the four picture cards (rain stops, river dries, fish die, birds leave). Put them in order.",
              "Tell the chain: 'The rain stopped, so the river dried up. The fish died because the river dried up ...' In each round, Partner A tells it, then Partner B. Then change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "The listener's job: count the 'so' and 'because' sentences and show the number on their fingers.",
            ],
            prompts: ["(card: no rain)", "(card: dry river)", "(card: fish die)", "(card: birds leave)"],
            feedback:
              fixMinute +
              "point to the cause on the card and ask 'What happened first?', hold up two fingers for 'so / because', or start the sentence and pause ('The river dried up, s...?'). If a child says 'Because the river dried up. The fish died.', put one finger on each part and ask 'Is that one idea?' so they join the two parts. " +
              sound,
            teacherNote: "Same chain, three times, three listeners: task repetition frees the child to join ideas more smoothly each time because the content is already decided. The listener's counting job keeps the listener listening. Listen for the order of cause and effect ('so' follows the cause, 'because' follows the effect) and for -ed endings (dried, died).",
            tiers: [
              { level: "Support", task: "Tell the chain with 'so' only and point to the cards.", frames: ["___, so ___.", "Then ___, so ___."] },
              { level: "Core", task: "Use both 'so' and 'because' without looking at the cards." },
              { level: "Stretch", task: "Add a 'Why?' question from the listener and a command: 'Why did the fish die?' 'Because the river dried up. Protect the rivers!'" },
            ],
          },
        },
        {
          after: "Chain-talk in threes",
          slide: {
            kind: "writing",
            title: "Combine it: so and because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences and the joining word in brackets.",
              "Say your new sentence first. Then write it as ONE sentence.",
              "Read all four sentences to your partner with your best voice.",
            ],
            items: [
              { q: "The river dried up. The fish died. (so)", answer: "The river dried up, so the fish died." },
              { q: "The birds left the garden. There were no seeds. (because)", answer: "The birds left the garden because there were no seeds." },
              { q: "The farmers used too much poison. The frogs disappeared. (so)", answer: "The farmers used too much poison, so the frogs disappeared." },
              { q: "Many insects live in the pond. The water is clean. (because)", answer: "Many insects live in the pond because the water is clean." },
            ],
            checklist: [
              "A comma before 'so'",
              "'because' joins the reason to the result: the reason comes after it",
              "A capital letter at the start and a full stop at the end",
            ],
            sayIt: "Say your four joined sentences to your partner, then say one again without looking.",
            teacherNote: "This is the exam's 'rewrite without changing the meaning' in smaller steps, and sentence combining teaches joining words by use, not by rule. Model item 1 aloud, writing the comma before 'so'. Watch for a sentence that starts with 'Because ...' and stops: a fragment is a common slip in this age group.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Do all four, then swap the order of one sentence: 'Because the river dried up, the fish died.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u2-l3": {
      objectives: ["I can describe a before and after with 'fewer', 'less', 'a few' and 'a little' for two minutes."],
      add: [
        {
          after: "Exam practice: choose the quantity word",
          slide: {
            kind: "writing",
            title: "Model, then write: before and after",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the words for many and few, much and little.",
              "Plan: think of a place that changed (a pond, a park, your street). Say your three sentences to a partner.",
              "Write your three sentences with the frames. Check them with the list.",
            ],
            text: {
              title: "Our school pond",
              text: "Our school pond changed last year. At the start there were a lot of frogs and many water plants. Then some visitors threw rubbish in the pond. Now there are fewer frogs and less clean water. The pond looks sad and quiet.",
            },
            frames: ["At the start there were many ___ and a lot of ___.", "Then ___.", "Now there are fewer ___ and less ___."],
            checklist: [
              "fewer / many / a few go with things I can count (frogs, birds)",
              "less / much / a little go with things I can't count (water, rain)",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your three sentences to your partner. Then say them again without looking at the page.",
            teacherNote: "Plan, write, check is the strategy the children keep for the entrance exam's writing. The model is deliberately short so they can notice the quantity words and copy the pattern. The common slip is 'less frogs': prompt with 'Can you count frogs?' rather than correcting it.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks about a pond, with pictures." },
              { level: "Core", task: "Write three sentences about a place you know." },
              { level: "Stretch", task: "Write four sentences and add a reason: 'There are fewer frogs because the water is dirty.'" },
            ],
          },
        },
        {
          after: "Before and after: what changed in the garden?",
          slide: {
            kind: "fluency",
            title: "Before and after 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same before-and-after talk to three partners. In each round Partner A talks, then Partner B talks. Each talk is shorter and smoother.",
            chunks: [
              "At the start there were a lot of bees and many flowers.",
              "In the end there were fewer bees and less honey.",
              "There is less water in the lake than last year.",
              "There are a few fish and a little water left.",
              "How many birds can you see, and how much water is there?",
            ],
            recycle: ["The flowers died, so the bees left.", "What a sad garden!"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the before-and-after talk, then Partner B. The listener counts how many quantity words they hear. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells the same talk in less time, then Partner B." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B. Fast and smooth! The listener says one thing they liked." },
            ],
            steps: [
              "Look at the two garden pictures. Plan five sentences: three for 'before' and two for 'after'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In each round, Partner A talks, then Partner B talks. When the bell rings, line B moves one seat to the left: a new partner. Each child tells the same talk again.",
              "The listener's job: tick a card each time they hear fewer, less, a few or a little.",
            ],
            feedback:
              fixMinute +
              "ask 'Can you count it?' and point to the 'fewer / less' frame when a child says 'less birds'; start the sentence and pause ('There were f...?'). If a child says 'many water', hold up a finger and ask 'Water: many or much?' " +
              sound,
            teacherNote: "This is the 4/3/2 technique shortened for nine-year-olds: the same talk to a new partner in less time each round. Do not add new language between rounds: the gain comes from saying the same things more fluently. The one-minute fix after round 1 matters most, because the children can use the fixed forms straight away when they tell it again. Listen for countable and uncountable choices and for -s on birds and bees.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and point to the pictures.", frames: ["At the start there were ___.", "In the end there were fewer ___."] },
              { level: "Core", task: "Say five sentences with both fewer and less." },
              { level: "Stretch", task: "Add a reason and a result: 'There are fewer bees because there are fewer flowers, so there is less honey.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My place: before and after",
        prompt: "Choose a place that has changed (a park, a street, a pond, your room). Tell us what it was like at the start and what is different now. Show a photo or a drawing if you can.",
        length: "60-90 seconds",
        steps: [
          "Choose your place and write three 'before' words and three 'after' words.",
          "Say your before-and-after talk three times to a grown-up or a toy, a little faster each time.",
          "Record it once. Talk to the camera and use quantity words: a lot of, many, fewer, less.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what the place was like, what changed, and use fewer and less in the right places. Keep going without long stops.",
        words: ["fewer", "less", "a few", "a little", "a lot of", "change"],
        grammar: ["Countable: many, a few, fewer", "Uncountable: much, a little, less", "a lot of"],
        rubric: [
          { label: "Before and after", description: "Says clearly what the place was like before and what is different now.", weight: 2 },
          { label: "Quantity words", description: "Uses fewer with things you can count and less with things you can't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Reasons", description: "Gives at least one reason with 'because' or 'so'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["At the start there were ___.", "Now there are fewer ___ and less ___."], tips: ["Hold up your drawing and point."] },
          { level: "Core", who: "Most children", frames: ["At the start there were many ___ and a lot of ___.", "Now there are fewer ___ because ___.", "There is less ___ than before."], tips: ["Use fewer once and less once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["If people ___, there will be even fewer ___.", "I think this place is better / worse now because ___."], tips: ["Say what will happen next and give your opinion, without notes."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u2-l4": {
      objectives: ["I can say what will happen if something changes, using 'if' and 'will', fast and right."],
      trim: { "Generalize: what happens when one thing changes?": 13, "Story or riddle? Compare the genres": 4 },
      add: [
        {
          after: "Exam practice: conditional rewrites",
          slide: {
            kind: "fluency",
            title: "What will happen if...? Question chain",
            routine: "question chain",
            mode: "groups",
            minutes: 7,
            goal: "Ask 'What will happen if ...?', answer with 'If ..., ... will ...' and pass the chain on with no stops.",
            chunks: [
              "What will happen if we cut down the trees?",
              "If we cut down the trees, the soil will wash away.",
              "What will happen if the rain doesn't come?",
              "If the rain doesn't come, the plants will die.",
              "The plants will die unless we water them.",
            ],
            recycle: ["There were fewer birds and less water.", "The bees left because the flowers died."],
            rounds: [
              { seconds: 75, say: "Groups of four in a circle. Ask the friend on your left a 'What will happen if ...?' question from your card. They answer, then ask the next friend." },
              { seconds: 60, say: "Swap cards. Go faster: can the chain go all the way round before the bell?" },
              { seconds: 45, say: "Make your own 'if' card question. The chain goes round again." },
            ],
            steps: [
              "Take a card: it shows a change (no rain, no trees, too many fish taken from the sea).",
              "Ask: 'What will happen if ...?' The friend answers with 'If ..., ... will ...'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3, add one 'unless' sentence if you can.",
            ],
            prompts: ["(card: no rain)", "(card: no trees)", "(card: too many fish taken)", "(card: a new road through the park)"],
            feedback:
              fixMinute +
              "start the sentence and pause ('If it rains, we ...?'), point to the Condition + comma + will frame, or hold up a finger for the extra 'will'. If a child says 'If it will rain', repeat the error with a rising voice ('If it will rain?') so the child hears it and says 'If it rains'. " +
              sound,
            teacherNote: "Each child asks AND answers many times in a few minutes, which is what makes 'If + present, will + verb' automatic; the chain does the repeating. Time the whole circle and tell them: children like to beat their own time. A common error is 'will' in the if part. Listen for -s on third person in the if part ('If it rains') and the comma pause after the if part.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and point to the card.", frames: ["If ___, ___ will ___.", "What will happen if ___?"] },
              { level: "Core", task: "Ask and answer without looking at the frame." },
              { level: "Stretch", task: "Answer in two steps: 'If we cut down the trees, the soil will wash away, so the river will be dirty.'" },
            ],
          },
        },
        {
          after: "Generalize: what happens when one thing changes?",
          slide: {
            kind: "writing",
            title: "Dictogloss: the empty garden",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder (one minute): the if part uses the present simple. The result uses 'will'. A comma follows the if part.",
              "Listen to the text twice. The first time, just listen. The second time, write key words only.",
              "In your group, rebuild the text with correct 'if' and 'will' sentences. Then compare with the folded text.",
            ],
            text: {
              title: "The empty garden",
              text: "If we pick all the flowers, the bees will not have food. If the bees leave, the plants will not make seeds. The garden will be empty unless we protect the flowers. So we should plant more flowers, and the garden will come back to life.",
            },
            checklist: [
              "After 'if' I use the present simple (pick, leave), not 'will'",
              "A comma after the if part",
              "will + the plain verb (will not have, will come)",
            ],
            sayIt: "Read your group's text aloud. Then one child says the last two sentences without looking.",
            teacherNote: "Read the text twice at natural speed; do not slow down for single words. Dictogloss makes children rebuild the grammar from meaning, which is the strategy for the exam rewrite. A likely rebuilt error is 'If the bees will leave'. Compare with the original together, not child by child.",
            tiers: [
              { level: "Support", task: "Write the key words with the teacher's help; the group adds the 'if' and 'will' words." },
              { level: "Core", task: "Rebuild the text with the group, then compare." },
              { level: "Stretch", task: "Rebuild the text and add one more 'if' sentence of your own." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u2-l5": {
      objectives: ["I can talk about how things used to be and what changed, with 'used to' and the past simple."],
      trim: { "Commands in the wild (Part 2 Language Focus)": 8, "Write: the diary of an old tree": 11 },
      add: [
        {
          after: "Sound spot and rewrites",
          slide: {
            kind: "fluency",
            title: "Used to sprint: then and now",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say each whole sentence fast and right, with a clear -d and -ed at the end.",
            chunks: [
              "Wolves used to hunt in the park.",
              "The farmers killed the wolves, so the elk ate the young trees.",
              "Did you use to have a pet? Yes, I did. / No, I didn't.",
              "I didn't use to like spiders.",
              "We helped, we played and we wanted to stay.",
            ],
            recycle: ["If we cut down the trees, the soil will wash away.", "There were fewer fish and less water."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many correct sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a whole 'used to' sentence about the then-and-now pictures.",
              "Listen for the clap: it means change.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3, count your correct sentences on your fingers.",
            ],
            prompts: ["(card: wolves in a park)", "(card: a farm with no trees)", "(card: a child with a small pet)", "(card: a child afraid of a spider)"],
            feedback:
              fixMinute +
              "point to the frame ('used to' + plain verb), start the phrase and pause ('Wolves used ...?'), or hold up a finger when 'use to' has lost its -d. For 'Did they used to', repeat the error with a rising voice ('Did they used?') and let the child fix it to 'use to'. For the -ed endings in 'helped, played, wanted', recast: say the word right, the child echoes, and exaggerate the /t/, /d/ and /ɪd/ endings. " +
              sound,
            teacherNote: "'Used to' sounds the same as 'use to' in fast speech, so the -d is the hardest part to hear and the most frequently dropped: say it clearly. Mix in the unit's earlier phrases so the conditional and quantity words stay available. Listen for 'use to' in the wrong place and for three different -ed sounds: helped /t/, played /d/, wanted /ɪd/.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame and point to the picture.", frames: ["___ used to ___.", "Did you use to ___?"] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add 'but now': 'Wolves used to hunt in the park, but now the park is quiet.'" },
            ],
          },
        },
        {
          after: "4/3/2: how my neighbourhood used to be",
          slide: {
            kind: "writing",
            title: "Fix it: used to and the past",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Each one has ONE mistake with 'used to' or the past tense.",
              "Find it and write the sentence the right way.",
              "Read the five fixed sentences aloud together.",
            ],
            items: [
              { q: "Wolves use to live in this park.", answer: "Wolves used to live in this park." },
              { q: "Did the farmers used to kill the wolves?", answer: "Did the farmers use to kill the wolves?" },
              { q: "We didn't used to see deer here.", answer: "We didn't use to see deer here." },
              { q: "My grandma use to grow rice.", answer: "My grandma used to grow rice." },
              { q: "The hunters kill the wolves long ago.", answer: "The hunters killed the wolves long ago." },
            ],
            checklist: [
              "In a statement: used to (with -d)",
              "After did or didn't: use to (no -d)",
              "A finished time in the past: the verb ends in -ed or is an irregular past form",
            ],
            sayIt: "Read your fixed sentences to your partner. Then say 'used to' three times fast, with the -d clear.",
            teacherNote: "Two error types only: -d on 'used to' and the past tense -ed. A short explanation helps: after 'did', the past is already shown, so 'use' has no -d. Vietnamese verbs do not change for time, so the -ed (and its sound) is easy to forget; say it with the children.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 4 with the frames on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Fix all five, then write one new 'used to' sentence about your own neighbourhood with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How it used to be",
        prompt: "Tell us about a place, a thing or a person that has changed. What used to be there, what happened, and how is it now? Show a photo if you can.",
        length: "60-90 seconds",
        steps: [
          "Choose what you will talk about and write four key words.",
          "Say your talk three times to a grown-up or a toy, a little faster each time.",
          "Record it once. Use 'used to' at least twice.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 180,
        kidSummary: "Say how it used to be, what happened and how it is now. Say 'used to' clearly and keep going without long stops.",
        words: ["used to", "disappear", "return", "ecosystem", "balance"],
        grammar: ["used to + verb", "Past simple", "didn't use to / Did you use to ...?"],
        rubric: [
          { label: "Used to", description: "Uses 'used to' correctly at least twice and says the -d.", weight: 3 },
          { label: "What happened", description: "Uses the past simple (-ed or irregular) to say what changed.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; connects the sentences with so, because or then.", weight: 3 },
          { label: "Opinion", description: "Gives an opinion about the change with a reason.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There used to be ___.", "Now ___."], tips: ["Point to your photo."] },
          { level: "Core", who: "Most children", frames: ["People used to ___. Then ___, so ___.", "I think it is better / worse now because ___."], tips: ["Say what happened in the middle."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I didn't use to ___, but now I ___.", "If nothing changes, ___ will ___."], tips: ["Add a 'didn't use to' sentence and a prediction, without notes."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u2-l6": {
      objectives: ["I can retell how the park changed, with 'for' and 'since', smoothly and fast."],
      trim: { "Video case: a reef out of balance": 8, "Write: a newspaper report, 30 years later": 11, "Connect two cases: wolves and giant fish": 10 },
      add: [
        {
          after: "Exam practice: compare and rewrite",
          slide: {
            kind: "writing",
            title: "Expand it: since and for",
            routine: "expand it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the short sentence and the words in brackets.",
              "Grow the sentence: add the words to say where, how long or since when.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "The trees have grown. (add: since the wolves returned)", answer: "The trees have grown since the wolves returned." },
              { q: "The elk have moved. (add: away from the river / since the wolves returned)", answer: "The elk have moved away from the river since the wolves returned." },
              { q: "My family has lived in Hanoi. (add: for six years)", answer: "My family has lived in Hanoi for six years." },
              { q: "The river has changed. (add: a lot / since the beavers came)", answer: "The river has changed a lot since the beavers came." },
            ],
            frames: ["___ has / have ___ since ___.", "___ has / have ___ for ___."],
            checklist: [
              "have / has + the third form of the verb (grown, moved, lived)",
              "for + how long (six years), since + the start (the wolves returned)",
              "No finished time like 'yesterday' with have / has",
            ],
            sayIt: "Say your big sentences to your partner, then say the first one again without looking.",
            teacherNote: "Expanding a bare sentence is quicker and safer than writing from nothing. Focus on two ideas: 'have / has' + the past participle, and the difference between 'for' and 'since'. Common errors: 'since six years' and 'have grow'. Prompt with 'Is six years a length or a starting point?'",
            tiers: [
              { level: "Support", task: "Do items 1 and 3 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Do all four, then write one 'How long have you ...?' question and its answer." },
            ],
          },
        },
        {
          after: "Connect two cases: wolves and giant fish",
          slide: {
            kind: "fluency",
            title: "Retell: how the park changed",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Retell the story of the park three times. In each round Partner A retells it, then Partner B. Each retelling is shorter, smoother and faster.",
            chunks: [
              "Since the wolves came back, the elk have moved more.",
              "More young trees have grown since then.",
              "The river has changed because the trees have grown.",
              "How long have you lived here? I've lived here for five years.",
            ],
            recycle: ["The wolves went away, so the elk ate the young trees.", "Wolves used to hunt in the park."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A retells the story with the three-picture timeline (before, when the wolves returned, now), then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A retells it again in less time, then Partner B." },
              { seconds: 40, say: "Round 3: New partner. Partner A, then Partner B. Fast and smooth. Use 'for' or 'since' at least twice." },
            ],
            steps: [
              "Look at the timeline: before the wolves, when the wolves returned, now.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In each round, Partner A retells it, then Partner B. Change partners when you hear the bell.",
              "The listener's job: ask one follow-up question at the end: 'How long ...?'",
            ],
            prompts: ["(picture: a park with no wolves)", "(picture: wolves return)", "(picture: a park with young trees)"],
            feedback:
              fixMinute +
              "point to 'have / has + the third form' on the board, hold up a finger when the participle is missing ('The trees have grow'), or start the phrase and pause ('Since the wolves came back, more trees have ...?'). If a child says 'since six years', repeat it with a rising voice ('since six years?') and let the child change it to 'for'. " +
              sound,
            teacherNote: "A retell means the story and its order are already decided, so the child's attention goes to the language: the present perfect with 'for' and 'since'. Do not add new content between rounds. Listen for 'have grown' versus 'grow', 'for' versus 'since', and the past simple for finished events (the wolves went away). The listener's follow-up question makes the listener real.",
            tiers: [
              { level: "Support", task: "Retell with the timeline pictures and the frames.", frames: ["Before, ___.", "Since the wolves returned, ___.", "Now ___."] },
              { level: "Core", task: "Retell without the frames and use 'for' once and 'since' once." },
              { level: "Stretch", task: "Add a second case (the giant fish) and compare: 'In both cases, ___ because ___.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u2-l7": {
      objectives: ["I can say and write a summary that joins ideas with 'so', 'although' and 'however'."],
      add: [
        {
          after: "Exam practice: combine the sentences",
          slide: {
            kind: "writing",
            title: "Combine it: although and however",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences and the joining word in brackets.",
              "Say your new sentence first. Then write it.",
              "Read your four sentences aloud, with the pause at each comma.",
            ],
            items: [
              { q: "Wolves are dangerous. They help the park. (although)", answer: "Although wolves are dangerous, they help the park." },
              { q: "The river was muddy. We could not see the fish. (so)", answer: "The river was muddy, so we could not see the fish." },
              { q: "The fish are big. They are rare. (however)", answer: "The fish are big. However, they are rare." },
              { q: "The wolves help the river. The beavers help the river. (both ... and)", answer: "Both the wolves and the beavers help the river." },
            ],
            checklist: [
              "Although + a comma, and no 'but' in the same sentence",
              "However starts a new sentence, with a comma after it",
              "A comma before so, and a capital letter at the start",
            ],
            sayIt: "Say your four sentences to your partner. Then say one again without looking.",
            teacherNote: "Contrast is the weak spot in the entrance exam's rewrite tasks, and this is the exam format in small steps. Two error types to listen for: 'Although ..., but ...' and 'however' joined to a sentence with only a comma. Model item 1 aloud and cross out 'but' with a gesture.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Do all four, then write one 'both ... and' sentence about your own park." },
            ],
          },
        },
        {
          after: "Say it before you write it",
          slide: {
            kind: "fluency",
            title: "One-breath summary: three partners",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Say the same short summary to three partners. In each round Partner A says it, then Partner B. Each time it is smoother and the signposts come easily.",
            chunks: [
              "The article is about how wolves changed a park.",
              "First the wolves returned, so the elk moved away from the river.",
              "Although wolves are dangerous, they help the park stay healthy.",
              "Both the wolves and the beavers help the river.",
              "In the end, the park is in balance again.",
            ],
            recycle: ["Since the wolves returned, more trees have grown.", "If we cut down the trees, the soil will wash away."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A says the summary, then Partner B. Use the five signposts: about, first, so, although, in the end. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A says the same summary, smoother, then Partner B." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B. Fast and clear. No notes." },
            ],
            steps: [
              "Take the five signpost cards: The article is about, First, So, Although, In the end.",
              "Say the whole summary with every card. In each round, Partner A says it, then Partner B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "The listener's job: tick each signpost they hear, and say which one was missing.",
            ],
            prompts: ["The article is about ...", "First ...", "So ...", "Although ...", "In the end ..."],
            feedback:
              fixMinute +
              "point to the Although + comma frame, hold up a finger for a missing 'so', or start the sentence and pause ('Although wolves are dangerous, they ...?'). If a child says 'Although ..., but ...', repeat the error with a rising voice ('although, but?') so the child drops the 'but'. " +
              sound,
            teacherNote: "This is the spoken rehearsal of the summary they write next: the same summary said three times, to three listeners, with the signposts as the only support. Task repetition builds fluency; the signposts are the structure for the writing. Listen for 'although' with 'but', for 'however' used with a comma splice, and for the -s on 'wolves' and 'beavers'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the signpost cards and point to them.", frames: ["The article is about ___.", "First ___, so ___.", "In the end, ___."] },
              { level: "Core", task: "Say all five signposts without the cards." },
              { level: "Stretch", task: "Add 'However, ___.' and a 'Both ... and ...' sentence." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My short summary",
        prompt: "Choose a story or a film you know well. Summarize it in five sentences with signposts: It is about ..., First ..., So ..., Although ..., In the end ...",
        length: "60-90 seconds",
        steps: [
          "Choose your story and write the five signposts on a card.",
          "Say your summary three times to a grown-up or a toy, a little faster each time.",
          "Record it once. Look at the camera and use all five signposts.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what it is about, what happened first and next, use 'although' correctly, and keep going without long stops.",
        words: ["summary", "although", "however", "both", "in the end"],
        grammar: ["so / because / although", "However, ...", "both ... and"],
        rubric: [
          { label: "Summary", description: "Says what the story is about and what happened, in the right order.", weight: 2 },
          { label: "Joining words", description: "Uses so, although and in the end correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; the five parts flow.", weight: 3 },
          { label: "Short and clear", description: "Does not retell every detail: only the main ideas.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It is about ___.", "First ___, so ___.", "In the end, ___."], tips: ["Look at your card."] },
          { level: "Core", who: "Most children", frames: ["Although ___, ___.", "First ___, so ___. Then ___.", "In the end, ___."], tips: ["Use 'although' once, with a comma."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["However, ___.", "Both ___ and ___ ___.", "My opinion is ___ because ___."], tips: ["Add an opinion and use 'however', without notes."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u2-l8": {
      objectives: ["I can say 'the more ..., the more ...' and 'too' and 'enough' sentences fast and right."],
      trim: { "Mock review: explain the answers": 9, "Transfer: test our big idea on a new case": 15, "Wonder Wall: which questions can we answer now?": 4 },
      add: [
        {
          after: "Exam practice: change together, too and enough",
          slide: {
            kind: "writing",
            title: "Dictogloss: the dirty river",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Rule reminder (one minute): the more ..., the ... uses two comparatives; 'too' + adjective; 'so ... that' + a result.",
              "Listen twice. The first time just listen. The second time, write key words.",
              "In your group, rebuild the text with the correct structures. Then compare with the folded text.",
            ],
            text: {
              title: "The dirty river",
              text: "The more people throw rubbish in the river, the dirtier the water becomes. The water was so dirty that the fish could not live in it. It was also too dirty for children to swim in. We are not strong enough to clean it alone, but the more we work together, the better the river gets.",
            },
            checklist: [
              "The + comparative, the + comparative (the more, the dirtier)",
              "so + adjective + that + result; too + adjective; adjective + enough",
              "A comma between the two parts of 'the more ..., the ...'",
            ],
            sayIt: "Read your group's text aloud. Then one child says the first sentence without looking.",
            teacherNote: "Read the text twice at natural speed. The structures here are the Unit 2 wrap-up's: 'the more ..., the ...', 'so ... that', 'too', 'enough'. Likely rebuilt errors are 'more we plant, more birds come' (missing 'the') and 'enough tall'. Compare with the original together, not child by child.",
            tiers: [
              { level: "Support", task: "Write the key words with the teacher's help; the group adds the structure words." },
              { level: "Core", task: "Rebuild the text with the group, then compare." },
              { level: "Stretch", task: "Rebuild the text and write one more 'the more ..., the ...' sentence about your own town." },
            ],
          },
        },
        {
          after: "Transfer: test our big idea on a new case",
          slide: {
            kind: "fluency",
            title: "Change together: question chain",
            routine: "question chain",
            mode: "groups",
            minutes: 6,
            goal: "Ask, answer and pass the chain on: whole sentences, with no stops.",
            chunks: [
              "What happens if we plant more trees?",
              "The more trees we plant, the cleaner the air becomes.",
              "Is the water too dirty for the fish?",
              "It was so dry that the plants died.",
              "The pond isn't big enough for the ducks.",
            ],
            recycle: ["If we cut down the trees, the soil will wash away.", "Although wolves are dangerous, they help the park."],
            rounds: [
              { seconds: 75, say: "Groups of four in a circle. Ask your friend a question from your card; they answer with the structure and then ask the next friend." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Make up your own question about a river, a park or a pond." },
            ],
            steps: [
              "Take a card with a picture and a structure (the more / too / enough / so ... that).",
              "Ask a question about the picture. Your friend answers with a whole sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3, use a different structure in every answer.",
            ],
            prompts: ["(card: a dirty river)", "(card: a dry field)", "(card: a small pond)", "(card: a park with new trees)"],
            feedback:
              fixMinute +
              "start the sentence and pause ('The more trees we plant, the ...?'), point to the 'the + comparative, the + comparative' frame, or hold up a finger for the missing 'the'. If a child says 'He is enough tall', repeat the error with a rising voice ('enough tall?') so the child puts 'enough' after the adjective. " +
              sound,
            teacherNote: "This is the whole unit in one chain: children ask and answer many times with this lesson's structures, mixed with conditionals and contrast from earlier. The mock test is fresh in their mind: if two or three mock-test errors are the same, use those as your one-minute fix. Listen for the missing 'the', for 'enough' after the adjective, and for 'so' with 'that'.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and point to the card.", frames: ["The more ___, the ___.", "It was too ___ for ___ to ___."] },
              { level: "Core", task: "Ask and answer without looking at the frame." },
              { level: "Stretch", task: "Answer with two structures: 'The pond was so small that the more ducks came, the more crowded it became.'" },
            ],
          },
        },
      ],
    },
  },
};
