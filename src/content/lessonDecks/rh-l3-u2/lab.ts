import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

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

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk
// (Jupiter, ages 9-10 at B1, toward the Level 4 grammar of SKY 1). Lesson-specific text comes
// from each lesson; the shape, the rounds and the tiers are the same.
const drillFeedback =
  "Prompt, do not tell: hold up a finger for the missing word, start the phrase and pause, or repeat the slip with a rising voice and let the child fix it. For a sound, recast: say it right and the child echoes. Say every final -s, -d and -ed clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson. ";

function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  fb: string;
  note: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
}): Slide {
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: 7,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when / unless, T = change the time or the tense, or rewrite it with the same meaning, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change it and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them with the class, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about you, and remember one thing your partner said.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback + o.fb,
    teacherNote: o.note,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const rhL3U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u2-l1": {
      objectives: ["I can ask a Wh- or How question quickly and correctly, without stopping."],
      trim: { "Four corners: how much should people change nature?": 8, "Is it balance? Sort the cards (concept formation)": 11 },
      add: [
        {
          after: "Wh- and How questions",
          slide: drill({
            "title": "Grammar drill: ask it, answer it, ask more",
            "goal": "Change the sentence fast and right: ask about it, say no, join it with a reason, change the time or the person. Then ask real questions about your own week.",
            "chunks": [
              "What do snakes eat, and how often do they eat?",
              "Where does a camel live, and how long can it go without water?",
              "How many eggs did the bird lay, and how long did it sit on them?",
              "Why did the frogs leave the pond? Because the water was dirty.",
              "What ate the roots? A gopher ate them.",
              "How much water does a camel drink, and how many humps does it have?"
            ],
            "recycle": [
              "She helps her neighbours every Sunday.",
              "My friends and I carry the bags."
            ],
            "prompts": [
              "Snakes eat rats. (? what)",
              "The tortoise lived for 150 years. (? how long)",
              "She waters the plants twice a week. (T: last week)",
              "The bird laid four eggs. (? how many)",
              "A gopher ate the roots. (? what ate)",
              "The frogs left the pond. (+ because the water was dirty)"
            ],
            "real": "Real talk: ask your partner four questions about their week or their favourite animal (What, Where, How often, How long or How many). Answer in whole sentences, then say what you think and why.",
            "slips": "'Where does the bird lives?', a missing do / does / did, or 'How many water'",
            "fb": "For a missing helper hold up a finger and say 'What ... the frog eat?'; for 'does she waters' repeat it with a rising voice ('She waters?') so the child takes off the extra -s; for 'How many water' ask 'Can you count water?'. Common Vietnamese-learner slips here: no helper at all (Vietnamese questions do not need one), -s or -ed after do / does / did, and the wrong word order after the Wh- word.",
            "note": "Round 1 is the exam move 'ask about the underlined part': say the statement, point to the underlined words, and the class asks the question. Say the helper (do / does / did) clearly and keep the verb after it plain. Round 3 must be real: children ask questions they do not know the answer to.",
            "support": [
              "What do / does ___ ___?",
              "How often / How long ___?"
            ],
            "stretch": "Use two signs at once and turn it into an exam rewrite: 'The tortoise lived for 150 years.' becomes 'How long did the tortoise live?' Then ask a follow-up question.",
            "stretchFrames": [
              "How long did ___ ___?",
              "How often does ___ ___?"
            ]
          }),
        },
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
      trim: { "Chain reaction: one small change": 5, "Chain-talk in threes": 9, "Write: a chain-reaction story start": 11 },
      add: [
        {
          after: "Four kinds of sentence, and cause with because / so",
          slide: drill({
            "title": "Grammar drill: so, because, what a!",
            "goal": "Change the sentence fast and right: ask why, join with so or because, turn it into a command or an exclamation. Then explain a real cause and effect.",
            "chunks": [
              "The river dried up, so the fish died.",
              "The fish died because the river dried up.",
              "Why did the fish die? Because the river dried up.",
              "Plant more trees, because the birds need homes!",
              "What a sad garden it was!",
              "How quickly the flowers died!",
              "Because it rained, we stayed in."
            ],
            "recycle": [
              "What do snakes eat?",
              "How long did the tortoise live?",
              "She helps her neighbours every Sunday."
            ],
            "prompts": [
              "The flowers died. The bees left. (+ so)",
              "The flowers died. The bees left. (+ because)",
              "The bees left. (? why)",
              "It was a beautiful day. (! What a)",
              "The river is flowing fast. (! How)",
              "The bees left because the flowers died. (T: say it with so)"
            ],
            "real": "Real talk: tell your partner about something that happened to you or in your street this week, and what it caused. Use so and because. Your partner asks 'Why?' once.",
            "slips": "'Because it rained. We stayed in.' (half a sentence), 'What beautiful garden', or so and because the wrong way round",
            "fb": "For a half sentence put one finger on each part and ask 'Is that one idea?'; for 'What beautiful garden' hold up a finger for the missing 'a'; for so / because the wrong way round ask 'What happened first?' and point to the cause. Vietnamese has no a / an, so the missing 'a' after What is the most common slip.",
            "note": "'Rewrite without changing the meaning' is the exam's own format: so and because are two ways to say the same cause and effect, and the T sign switches between them. Keep the exclamations short and loud: they are fun, and they stay in memory.",
            "support": [
              "___, so ___.",
              "___ because ___."
            ],
            "stretch": "Use two signs at once and rewrite in both orders: 'The bees left because the flowers died.' = 'The flowers died, so the bees left.' Then add 'Because ..., ...' at the start.",
            "stretchFrames": [
              "Because ___, ___.",
              "___, so ___. What a ___!"
            ]
          }),
        },
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
      trim: { "Before and after: what changed in the garden?": 7, "Write: a food-chain riddle": 11 },
      add: [
        {
          after: "Quantifiers: countable and uncountable",
          slide: {
            "kind": "grammar",
            "title": "Level 4 step: too many, too much, not enough",
            "hook": "Too many and too much say there is more than we need; not enough says there is less than we need.",
            "form": [
              {
                "label": "too many + plural noun",
                "pattern": "There are too many deer in the park."
              },
              {
                "label": "too much + uncountable noun",
                "pattern": "There is too much rubbish in the pond."
              },
              {
                "label": "(not) enough + noun",
                "pattern": "There isn't enough water. / There are enough plants."
              },
              {
                "label": "adjective + enough (+ to + verb)",
                "pattern": "The pond is warm enough to swim in. / The river isn't clean enough for fish."
              },
              {
                "label": "too + adjective",
                "pattern": "The river is too dirty for fish to live in."
              }
            ],
            "explanation": [
              "Too many and too much tell us that a number or an amount is more than we want, and it causes a problem. Use too many with things we can count (deer, cars, bottles) and too much with things we cannot count (rubbish, noise, water). It is the same split as many and much in this unit.",
              "Enough tells us that something is as much as we need. With a noun, enough comes before it (enough food). With an adjective, enough comes after it (warm enough). 'Not enough' is the problem word, like 'too many': both name a balance that has gone wrong.",
              "This links to Nature's Balance: when there are too many deer and not enough plants, the balance breaks. It also links to 'too ... to' and 'adjective + enough to' in this unit's last lesson, which the entrance exam asks you to rewrite."
            ],
            "examples": [
              {
                "text": "There are too many deer, so the young trees don't grow."
              },
              {
                "text": "There is too much rubbish in the pond, and the fish can't breathe."
              },
              {
                "text": "There isn't enough water for all the plants."
              },
              {
                "text": "The lake is clean enough for ducks to live in."
              },
              {
                "text": "The pond isn't big enough for so many fish, so some have to leave."
              },
              {
                "text": "If there are not enough wolves, the elk will eat too many young trees."
              }
            ],
            "pitfalls": [
              {
                "wrong": "There are too much deer in the park.",
                "right": "There are too many deer in the park.",
                "why": "Deer can be counted, so we use too many, not too much."
              },
              {
                "wrong": "The pond isn't enough big for the ducks.",
                "right": "The pond isn't big enough for the ducks.",
                "why": "With an adjective, enough comes after it. With a noun, enough comes before it (enough water)."
              },
              {
                "wrong": "The water is too much dirty.",
                "right": "The water is too dirty.",
                "why": "Before an adjective we say too, not too much."
              }
            ]
          },
        },
        {
          after: "Level 4 step: too many, too much, not enough",
          slide: drill({
            "title": "Grammar drill: many, much, fewer, less",
            "goal": "Change the sentence fast and right: ask how many or how much, say no, join it with a reason, choose fewer or less. Then compare a real place now and before.",
            "chunks": [
              "There were fewer caterpillars and less colour in the garden.",
              "How many birds can you see, and how much water is there?",
              "There isn't much water, but there are a few fish.",
              "There are fewer trees than last year, so there is less shade.",
              "Is there any water in the pond? No, but there are some puddles.",
              "There are too many deer, and there aren't enough plants."
            ],
            "recycle": [
              "What does a camel eat?",
              "The bees left because the flowers died."
            ],
            "prompts": [
              "There are many birds. (X)",
              "There is a lot of water. (? how much)",
              "There were many fish last year. (T: now, fewer)",
              "There is little water. (+ so the plants are dry)",
              "There are a few trees. (P: in my street)",
              "There are too many cars here. (+ because)"
            ],
            "real": "Real talk: compare your street or your school now and before (or your street and your grandparents' village). Use fewer and less, and say what is too many or not enough. Your partner asks 'How many ...?' or 'How much ...?' once.",
            "slips": "'less people', 'many water' or 'I have many homeworks'",
            "fb": "For 'less people' ask 'Can you count people?'; for 'many water' hold up a finger and ask 'Water: many or much?'; for 'many homeworks' say 'Homework ... a lot of?' with a rising voice. Common Vietnamese-learner slips: treating every noun as countable, because Vietnamese has no plural -s; and 'How many money'.",
            "note": "Today's step (too many / too much / not enough) goes into the last chunk, round 3 and Stretch. The exam format here is 'choose the quantity word' and 'rewrite with fewer / less'; the T sign practises 'There were more fish last year.' = 'There are fewer fish now.' Say the -s on plurals clearly yourself.",
            "support": [
              "How many ___ are there?",
              "There is / There are ___."
            ],
            "stretch": "Use two signs at once and the step: 'There were more fish last year than now.' = 'There are fewer fish now than last year.' Then say what there are too many of and not enough of.",
            "stretchFrames": [
              "There are too many ___ and not enough ___.",
              "There is too much ___."
            ]
          }),
        },
        {
          after: "Exam practice: choose the quantity word",
          slide: {
            kind: "writing",
            title: "A place that changed: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the before and after details, and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Choose a place that changed (a pond, a park, your street).",
              "Write: turn your notes into one paragraph. Use fewer with things you can count and less with things you can't.",
              "Check: tick the checklist. Swap with a partner: they underline one quantity word and tell you one thing they liked.",
              "Teacher: while they write, look only at fewer / less and the plural -s. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Our village pond",
              text: "Our village pond has changed a lot in five years. Five years ago, there were many frogs and a lot of water plants, and the water was clean. Now there are fewer frogs and less clean water because people throw rubbish into the pond. There are only a few fish and a little shade left. If we clean the pond every month, the frogs will come back. I hope our pond will be beautiful again.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which place changed? Say it in one sentence: 'My ___ has changed a lot.'" },
              { label: "Before", prompt: "What was it like at the start? Use many, a lot of, much." },
              { label: "After", prompt: "What is different now? Use fewer, less, a few, a little, and say why with 'because'." },
              { label: "Closing", prompt: "What do you hope or want? Use 'If we ___, ___ will ___.'" },
            ],
            frames: ["My ___ has changed a lot.", "There were many ___ and a lot of ___. Now there are fewer ___ and less ___ because ___.", "If we ___, ___ will ___."],
            checklist: [
              "fewer / many / a few go with things I can count (frogs, trees); less / much / a little go with things I can't count (water, shade)",
              "I wrote one reason with 'because' or 'so'",
              "My last sentence uses 'If ..., ... will ...' with a comma",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. A description of a place before and after is a common exam topic and it uses this lesson's quantity words naturally. Mark only two targets (fewer / less and the plural -s) with a dot on the line; the child finds and fixes the mistake. The common slip is 'less frogs': ask 'Can you count frogs?' The paragraph is a good script for the lesson's vlog 'My place: before and after'.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, with a picture of the place.", frames: ["My ___ has changed a lot.", "Now there are fewer ___ and less ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with 'a few' and 'a little' and one with 'There isn't much ... now.'" },
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
        grammar: ["Countable: many, a few, fewer", "Uncountable: much, a little, less", "a lot of", "too many / too much / not enough"],
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
      trim: { "Generalize: what happens when one thing changes?": 7, "Story or riddle? Compare the genres": 3, "Write: advice for the villagers": 13 },
      add: [
        {
          after: "The first conditional",
          slide: drill({
            "title": "Grammar drill: if, will, unless",
            "goal": "Change the sentence fast and right: ask what will happen, say no, join with if or unless, change the person. Then predict real things.",
            "chunks": [
              "If we cut down the trees, the soil will wash away.",
              "What will happen if the rain doesn't come? The plants will die.",
              "The plants won't grow unless we water them.",
              "If there are too many deer, the young trees won't have enough space.",
              "If it rains tomorrow, we won't go to the park.",
              "Will the birds come back if we plant more flowers? Yes, they will."
            ],
            "recycle": [
              "There were fewer birds and less water.",
              "There are too many cars and not enough trees.",
              "The bees left because the flowers died."
            ],
            "prompts": [
              "We plant trees. The air gets cleaner. (+ if)",
              "If it rains, the pond fills. (X: both parts)",
              "If the rain doesn't come, the plants die. (? what will happen)",
              "If you don't water them, the plants will die. (T: say it with unless)",
              "If I am late, I will miss the bus. (P: she)",
              "There are too many cars. (+ the air will get dirty)"
            ],
            "real": "Real talk: tell your partner what will happen in your street, your school or the sea if people do not change one thing (for example, too much rubbish or too many cars). Use if and unless. Your partner asks 'What will happen if ...?' once.",
            "slips": "'If it will rain', a missing comma after the if part, or 'Unless you don't study'",
            "fb": "For 'If it will rain' repeat it with a rising voice ('If it will rain?') so the child hears it and says 'If it rains'; for a missing comma pause with your hand where the comma goes; for 'Unless you don't' ask 'Unless means if ... what?' and point to the frame. Common Vietnamese-learner slips: will in the if part, and a double negative with unless.",
            "note": "The exam format is 'rewrite with unless / if': 'If you don't hurry, you will miss the bus.' = 'Unless you hurry, you will miss the bus.' The T sign practises it. Round 3 uses the step from Lesson 3 (too many, not enough) as the cause. Listen for the present simple after if and the plain verb after will.",
            "support": [
              "If ___, ___ will ___.",
              "What will happen if ___?"
            ],
            "stretch": "Use two signs at once and the exam rewrite: 'If you don't water the plants, they will die.' = 'Unless you water the plants, they will die.' Add a second result with 'so' and the step.",
            "stretchFrames": [
              "Unless ___, ___ will ___.",
              "If there are too many ___, ___ will ___."
            ]
          }),
        },
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
          after: "Exam practice: conditional rewrites",
          slide: {
            kind: "writing",
            title: "What will happen if...? plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the 'if' sentences and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Choose one change (no trees, dirty water, no bees).",
              "Write: turn your notes into one paragraph. Use 'If ..., ... will ...' at least twice and 'unless' once if you can.",
              "Check: tick the checklist. Swap with a partner: they underline one 'if' sentence and tell you what will happen next.",
              "Teacher: while they write, look only at the present simple after 'if' and the comma. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: If the forest disappears",
              text: "A forest is important because every living thing in it needs the others. If people cut down too many trees, the soil will wash away when it rains. The rivers will become dirty, so the fish won't have clean water. The birds will leave because they won't have homes. Unless we protect the forest, many animals will disappear. We should plant more trees and keep the forest safe for the future.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What do you want to explain? 'A ___ is important because ...'" },
              { label: "First result", prompt: "What will happen if people change it? 'If ___, ___ will ___.'" },
              { label: "Next result", prompt: "What happens after that? Use 'so' or 'because'." },
              { label: "Closing", prompt: "What should we do? Use 'unless' or 'We should ...'" },
            ],
            frames: ["A ___ is important because ___.", "If people ___, ___ will ___.", "Unless we ___, ___ will ___.", "We should ___."],
            checklist: [
              "After 'if' I use the present simple (cut, rains), not 'will'",
              "A comma after the if part",
              "will / won't + the plain verb (will wash, won't have)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: an explanation paragraph is the exam's 'what will happen if' topic in a whole text. The boxes hold words, not sentences, so the time goes into the paragraph. Mark only two targets ('will' after 'if' and the comma) with a dot on the line; the child finds and fixes the mistake. The earlier question chain gives the spoken version, and this paragraph is its written form.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["If people ___, ___ will ___.", "We should ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences with two 'if' sentences." },
              { level: "Stretch", task: "Add 'unless' and a second result with 'so': 'If ..., ... will ..., so ...'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u2-l5": {
      objectives: ["I can talk about how things used to be and what changed, with 'used to' and the past simple."],
      trim: { "Commands in the wild (Part 2 Language Focus)": 5, "Write: the diary of an old tree": 8, "4/3/2: how my neighbourhood used to be": 9 },
      add: [
        {
          after: "Past simple and used to",
          slide: drill({
            "title": "Grammar drill: used to, didn't use to, did you use to",
            "goal": "Change the sentence fast and right: ask with did, say no with didn't use to, join it, change the person. Then talk about how things used to be where you live.",
            "chunks": [
              "Wolves used to hunt in the park, but the farmers killed them.",
              "Did the elk use to eat young trees? Yes, they did.",
              "I didn't use to like spiders, but now I do.",
              "There used to be too many deer, so there weren't enough young trees.",
              "We helped, we played and we wanted to stay.",
              "When I was small, I used to live near a lake."
            ],
            "recycle": [
              "If we cut down the trees, the soil will wash away.",
              "How long did the tortoise live?",
              "There were fewer fish and less water."
            ],
            "prompts": [
              "Wolves used to hunt in the park. (?)",
              "Wolves used to hunt in the park. (X)",
              "The farmers killed the wolves. The elk ate the young trees. (+ so)",
              "I live in Hanoi now. (T: when I was small)",
              "She used to live in Huế. (P: they)",
              "There used to be enough water. (+ but now)"
            ],
            "real": "Real talk: tell your partner how your street, your school or your own habits used to be, and what changed. Use used to, didn't use to and a past-simple sentence for what happened. Your partner asks 'Did you use to ...?' once.",
            "slips": "'use to' in a statement, 'Did you used to', or the -ed dropped in helped and wanted",
            "fb": "For 'Did they used to' repeat it with a rising voice ('Did they used?') and let the child take the -d off; for a missing -d in 'used to' say the -d loudly and ask the child to echo it; for -ed endings recast and exaggerate /t/, /d/ and /ɪd/. Common Vietnamese-learner slips: no -d in 'used to' (it sounds the same in fast speech) and -ed missing from past verbs.",
            "note": "The exam format is 'rewrite with used to': 'My grandfather lived in a village, but now he lives in town.' = 'My grandfather used to live in a village.' The T sign practises it. Say the -d in 'used to' clearly yourself. The step comes back in the fourth chunk and in Stretch (too many, not enough).",
            "support": [
              "___ used to ___.",
              "Did you use to ___?"
            ],
            "stretch": "Use two signs at once and the exam rewrite: 'He doesn't play outside as much as before.' = 'He used to play outside more.' Add 'There used to be enough ___, but now there is too much ___.'",
            "stretchFrames": [
              "I didn't use to ___, but now ___.",
              "There used to be enough ___, but now ___."
            ]
          }),
        },
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
            title: "How it used to be: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the 'used to' sentences and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a place or a thing that changed.",
              "Write: turn your notes into one paragraph. Use 'used to' for the past habit and the past simple for what happened.",
              "Check: tick the checklist. Swap with a partner: they underline one 'used to' sentence and tell you one thing they liked.",
              "Teacher: while they write, look only at the -d in 'used to' and the -ed endings. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My grandparents' village",
              text: "My grandparents' village has changed a lot. When my grandfather was a boy, there used to be wide rice fields and a small river behind the houses. Children used to swim in the river every afternoon. Then a factory opened near the village, and the water became dirty. Now the children don't swim there any more. I didn't use to worry about nature, but now I do. Everyone should look after the river.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What changed? 'My ___ has changed a lot.'" },
              { label: "How it used to be", prompt: "What used to be there? What did people use to do?" },
              { label: "What happened", prompt: "What changed it? Use the past simple: opened, became, moved." },
              { label: "Closing", prompt: "How do you feel now? What should people do?" },
            ],
            frames: ["My ___ has changed a lot.", "There used to be ___. People used to ___.", "Then ___ and ___.", "I didn't use to ___, but now I ___."],
            checklist: [
              "'used to' has a -d in a statement, and 'use to' after did or didn't",
              "The past simple has -ed or the irregular form (opened, became)",
              "I wrote one sentence about what happened and one about now",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: a recount of how a place used to be is the written form of this lesson's 4/3/2 talk and of the vlog 'How it used to be', so the child can use the paragraph as the vlog script. Mark only two targets (the -d in 'used to' and the -ed ending) with a dot on the line; the child finds and fixes the mistake. 'Used to' and 'use to' sound the same in fast speech, so say the -d clearly.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, with a photo or drawing.", frames: ["There used to be ___.", "Then ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with 'didn't use to' and one with 'because' or 'so'." },
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
      trim: { "Video case: a reef out of balance": 5, "Write: a newspaper report, 30 years later": 8, "Connect two cases: wolves and giant fish": 7 },
      add: [
        {
          after: "Present perfect with for and since",
          slide: drill({
            "title": "Grammar drill: have, for, since",
            "goal": "Change the sentence fast and right: ask how long, say no with haven't, choose for or since, change the person. Then talk about things you have done for a long time.",
            "chunks": [
              "Since the wolves returned, more young trees have grown.",
              "How long have you lived here? I've lived here for five years.",
              "She has collected shells since 2023.",
              "The river has changed a lot since the beavers came.",
              "I haven't seen my cousin since last summer.",
              "My cousin lived in Huế in 2020, but he has lived in Hanoi since 2021."
            ],
            "recycle": [
              "Wolves used to hunt in the park.",
              "If the rain doesn't come, the plants will die.",
              "There are too many deer and not enough wolves."
            ],
            "prompts": [
              "The trees have grown. (+ since the wolves returned)",
              "I have lived here. (? how long)",
              "I have seen the wolves. (X + since last year)",
              "I started English in 2021. (T: I have learned it ... since)",
              "He has collected shells for two years. (P: they)",
              "I saw him last June. (T: I haven't seen him since)"
            ],
            "real": "Real talk: tell your partner something you have done, owned or known for a long time. Use for and since, and ask 'How long have you ...?' once. Say how you feel about it and why.",
            "slips": "'since three years', 'have grow', or the past simple with since",
            "fb": "For 'since three years' repeat it with a rising voice ('since three years?') and ask 'A length or a starting point?'; for 'have grow' point to the third column of the verb; for 'I have seen him yesterday' ask 'Is yesterday finished?'. Common Vietnamese-learner slips: for / since mixed up, and no have / has because Vietnamese verbs do not change.",
            "note": "The exam format is 'rewrite with for or since': 'She started learning English in 2021.' = 'She has learned English since 2021.' The T sign practises it. Keep two groups of time words on the board: lengths (for) and starting points (since). The last chunk puts past simple and present perfect side by side.",
            "support": [
              "I've ___ for ___.",
              "I've ___ since ___."
            ],
            "stretch": "Use two signs at once and the exam rewrite: 'The last time I saw him was in June.' = 'I haven't seen him since June.' Then ask a 'How long ...?' question about the answer.",
            "stretchFrames": [
              "I haven't ___ since ___.",
              "How long have you ___?"
            ]
          }),
        },
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
      trim: { "Two stars and a wish": 3, "Say it before you write it": 7, "Write and edit the summary": 21 },
      add: [
        {
          after: "Compound sentences and contrast",
          slide: drill({
            "title": "Grammar drill: but, although, however, both ... and",
            "goal": "Change the sentence fast and right: join with but or although, start a new sentence with however, use both ... and. Then give your own opinion with a contrast.",
            "chunks": [
              "Wolves are dangerous, but they help the park.",
              "Although wolves are dangerous, they help the park stay healthy.",
              "The river was muddy. However, we saw a giant fish.",
              "Both the wolves and the beavers help the river.",
              "We can protect the river, or we can lose the fish forever.",
              "There are too many deer. However, there aren't enough wolves."
            ],
            "recycle": [
              "Since the wolves returned, more trees have grown.",
              "Wolves used to hunt in the park.",
              "The bees left because the flowers died."
            ],
            "prompts": [
              "Wolves are dangerous. They help the park. (+ although)",
              "Wolves are dangerous, but they help the park. (T: say it with however)",
              "The river was muddy. We saw a fish. (+ although)",
              "The wolves help the river. The beavers help the river. (+ both ... and)",
              "We can protect the river. We can lose the fish. (+ or)",
              "Although it was cold, we swam. (T: say it with but)"
            ],
            "real": "Real talk: give your opinion about an animal, a place or a sport. Say one good thing and one bad thing with although or however. Your partner agrees or disagrees with 'I agree because ...' or 'However, I think ...'.",
            "slips": "'Although ..., but ...', however joined with a comma, or a missing comma before but",
            "fb": "For 'Although ..., but ...' repeat it with a rising voice ('although, but?') and let the child cross out the but; for 'however' with only a comma hold up a finger and say 'However starts a ... ?' so the child makes a new sentence; for a missing comma show a pause with your hand. Common Vietnamese-learner slips: Vietnamese uses both words in 'mặc dù ... nhưng ...', so the double joining word feels natural.",
            "note": "The exam format is 'combine the sentences / rewrite with although': 'Although it was cold, we swam.' = 'It was cold, but we swam.' The T sign practises it. Say the pause at each comma and full stop clearly yourself. The step comes back in the last chunk and in Stretch (too many, not enough).",
            "support": [
              "___, but ___.",
              "Although ___, ___."
            ],
            "stretch": "Use two signs at once and the exam rewrite: 'Although the pond was small, many ducks lived there.' = 'The pond was small, but many ducks lived there.' Add 'However, ...' with too many or not enough.",
            "stretchFrames": [
              "Although ___, ___.",
              "However, there aren't enough ___."
            ]
          }),
        },
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
      trim: { "Mock review: explain the answers": 6, "Transfer: test our big idea on a new case": 8, "Wonder Wall: which questions can we answer now?": 3, "Rehearse the self-introduction": 5 },
      add: [
        {
          after: "Change together: the more ..., the more; too, enough, so ... that",
          slide: drill({
            "title": "Grammar drill: the more ..., too, enough, so ... that",
            "goal": "Change the sentence fast and right: use the more ..., the ..., too, enough and so ... that, and rewrite one with another. Then talk about a real problem and how to fix it.",
            "chunks": [
              "The more trees we plant, the cleaner the air becomes.",
              "The water was too dirty for the fish to live in.",
              "The pond isn't big enough for the ducks.",
              "The drought was so long that the river dried up.",
              "The more people throw rubbish, the dirtier the river gets.",
              "There isn't enough water, so the plants are too weak to grow."
            ],
            "recycle": [
              "If we cut down the trees, the soil will wash away.",
              "There are too many deer and not enough wolves.",
              "Although wolves are dangerous, they help the park."
            ],
            "prompts": [
              "We plant trees. The air gets cleaner. (+ the more ..., the ...)",
              "The water was dirty. The fish couldn't live in it. (+ too)",
              "The pond is small. The ducks can't live in it. (+ enough)",
              "The drought was long. The river dried up. (+ so ... that)",
              "The pond is big enough. (X)",
              "The soup was so hot that I couldn't eat it. (T: too ... to)"
            ],
            "real": "Real talk: tell your partner about a real problem in your street or school (too much noise, too many cars, not enough trees). Use the more ..., the ..., too and enough. Say what we can do about it.",
            "slips": "'More we plant, more birds come', 'enough tall', or 'too cold that'",
            "fb": "For a missing 'the' hold up a finger and say 'The more trees we plant, ... more birds?'; for 'enough tall' repeat it with a rising voice so the child puts enough after the adjective; for 'too cold that' ask 'Too or so?'. Common Vietnamese-learner slips: no 'the' in the double comparative, and enough before the adjective.",
            "note": "This is the unit in one drill and the exam format in the T sign: 'The soup was so hot that I couldn't eat it.' = 'The soup was too hot for me to eat.' / 'He is too short to reach the shelf.' = 'He isn't tall enough to reach the shelf.' The step (too many, too much, not enough) comes back in round 3 and Stretch. Mock-test errors from this lesson make a good one-minute fix.",
            "support": [
              "The more ___, the ___.",
              "It was too ___ to ___."
            ],
            "stretch": "Use two signs at once and the exam rewrite: 'He is too short to reach the shelf.' = 'He isn't tall enough to reach the shelf.' Add one sentence with too many, too much or not enough.",
            "stretchFrames": [
              "___ isn't ___ enough to ___.",
              "There is too much ___, so ___."
            ]
          }),
        },
        {
          after: "Exam practice: change together, too and enough",
          slide: {
            kind: "writing",
            title: "A clean river: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, 'so ... that', 'too' and 'the more ..., the ...', and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a river, a park or a pond with a problem.",
              "Write: turn your notes into one paragraph. Use two of the structures: so ... that, too, enough, the more ..., the ...",
              "Check: tick the checklist. Swap with a partner: they underline one structure and tell you one thing they liked.",
              "Teacher: while they write, look only at 'the' in 'the more ..., the ...' and where 'enough' goes. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Our dirty river",
              text: "Our river was so dirty that the fish could not live in it. The water was too dirty for children to swim in, and the smell was bad. The more people threw rubbish into the river, the worse the problem became. One person is not strong enough to clean it alone. However, the more we work together, the cleaner the river gets. Our class now cleans the bank every Saturday. If we keep it clean, the fish will come back.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is the problem? Use 'so ... that' or 'too ...'." },
              { label: "Cause", prompt: "Why did it happen? 'The more ___, the ___.'" },
              { label: "Why one person is not enough", prompt: "Use 'not ... enough' and 'However, ...'." },
              { label: "Closing", prompt: "What will happen if we help? 'If we ___, ___ will ___.'" },
            ],
            frames: ["The ___ was so ___ that ___.", "It was too ___ for ___ to ___.", "The more ___, the ___.", "If we ___, ___ will ___."],
            checklist: [
              "The + comparative, the + comparative, with a comma between the parts (the more ..., the cleaner ...)",
              "so + adjective + that + result; too + adjective; adjective + enough",
              "I used 'However' at the start of a sentence, with a comma after it",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: this paragraph is the unit wrap-up in one text, with the structures from the mock test in a short explanation of a problem. It replaces the dictogloss, whose text is now the model. Mark only two targets (the missing 'the' in 'the more ..., the ...' and the place of 'enough') with a dot on the line; the child finds and fixes the mistake. The model is about 80 words; the entrance exam's paragraph is about 80-100, so let strong children reach that.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["The ___ was so ___ that ___.", "The more ___, the ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences with two of the structures." },
              { level: "Stretch", task: "Use three structures and add a sentence with 'unless'." },
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
