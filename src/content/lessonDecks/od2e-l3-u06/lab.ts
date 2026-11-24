import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 6 "Seeing Like a
// Poet" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's grammar, was / were + -ing with when,
// and action verbs with -s, said again and again as whole sentences, with Unit 5's phrases
// mixed back in) and one writing routine (plan, write, check, then say it). Every other
// lesson ends with a recorded talk for home. Time comes from games and repeats, never from
// the book pages or the grammar. All text is original.

const correctGrammar =
  "Listen and do not stop the talk. Note two or three grammar mistakes (no names). Between round 1 and round 2, fix two of them on the board in one minute; children who then say it again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('I was ... ?'), point to the frame, hold up a finger for the missing word (was / were, or the -s on 'dances'), or repeat the error with a rising voice ('We was playing?'). For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: Vietnamese speakers often drop them, and children copy what they hear.";

const correctWas =
  "Watch for 'We was playing', 'I playing' (no was), 'I was see' (no -ing) and 'the phone ring' (no -ed on the short action). Prompt, do not tell: start 'We ... ?' and pause, point to the frame, or hold up a finger for the missing word. Between round 1 and round 2, put two of these on the board for a one-minute fix. Say 'rang', 'started' and 'played' with a clear final sound, and let the children echo.";

const correctVerbs =
  "Watch for 'The wind dance', 'The sun is shine' and 'The waves crashes'. Prompt the child to fix it: say 'The wind ...' and pause, hold up a finger for the -s, or repeat the error with a rising voice ('The wind dance?'). For a sound, say it right and let the child echo. After round 1, take one minute to put two mistakes on the board and fix them, then go on. Say the final -s of 'dances', 'whispers' and 'smiles' clearly yourself.";

// One grammar drill (Level 4 raise): a sentence changed fast by a sign, in chorus, then
// pairs, then used in real talk about the children's own lives. Ages 8-10.
function drill(o: {
  title: string;
  minutes: 6 | 7;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  r1?: string;
  r2?: string;
  real: string;
  slips: string;
  fix: string;
  note: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
}): Slide {
  const s = o.minutes === 6 ? 75 : 90;
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: o.minutes,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and holds up a sign card (? = ask it, X = say no, + = join with because, so or when, T = change the time, P = change the person). The class says the new sentence together." + (o.r1 ? " " + o.r1 : "") },
      { seconds: s, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap." + (o.r2 ? " " + o.r2 : "") },
      { seconds: s, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often " + o.slips + "), fix them together, then go on.",
      "In round 2 swap roles at the clap: the child with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: "Prompt, do not tell. " + o.fix + " In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next time.",
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the sentence is used for meaning. For ages 8-10 start with the ? and X signs, then add + with because and so, and bring in T and P when the class is quick. Keep it brisk and cheerful; a drill that drags loses its point. Nothing is written: this is about speed and accuracy in speech. " + o.note,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, join it with because or so, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U6Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u06-l1": {
      objectives: ["I can say 'I can see ___ in my mind.' fast, with a poet word, without stopping."],
      trim: { "Stand on the line: what is a poem?": 5, "Poem or not a poem?": 4, "Noun, verb or adjective? Stand, act, wave": 4 },
      add: [
        {
          after: "Think back to the poems (SB 57 Think)",
          slide: drill({
            title: "Grammar drill: I was looking at the moon when ...",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it, change the time or the person. Then tell your partner what you were doing at a real moment.",
            chunks: [
              "I was looking at the moon when the bell rang.",
              "Were you listening to the rain? Yes, I was.",
              "We were watching the river when a bird flew by.",
              "I wasn't sleeping when the wind started to whisper.",
              "The poet was walking by the lake when she saw a bright star.",
              "What were you doing when it began to rain?",
            ],
            recycle: ["While the bee was flying, it saw a flower.", "I enjoy drawing pictures of nature.", "I have never seen a shooting star."],
            prompts: ["I was looking at the moon. (?)", "We were watching the river. (X)", "I was drawing a tree. (+ when the bell rang)", "I was looking at the moon. (T: now)", "I was singing. (P: they)"],
            real: "Real talk: tell your partner what you were doing at a special moment, like seven o'clock last night. Say what happened too: 'I was ___-ing when ___.' Your partner asks one question: 'What were you doing when ___?'",
            slips: "'We was' or 'I looking' with no was",
            fix: "For 'We was watching', say 'We ...?' and pause, hold up a finger for the missing word, or repeat it with a rising voice. For 'I looking at the moon', point to the frame and show two fingers: was + -ing. Say 'rang', 'flew' and 'started' with a clear final sound and let the class echo.",
            note: "Today the children meet the poet words, so keep the sentences about nature. This keeps Unit 5's was / were + -ing alive before the unit's grammar page in Lesson 3. The Stretch tier uses while with two people, one step toward Level 4's longer sentences.",
            support: ["I was ___-ing when ___.", "Were you ___-ing? Yes, I was."],
            stretch: "Use two signs at once and add a second person: 'While I was looking at the moon, my brother was drawing it, so I looked at his picture.'",
            stretchFrames: ["While I was ___-ing, my ___ was ___-ing.", "___, so ___."],
          }),
        },
        {
          after: "Listen, point, say (SB 56 A)",
          slide: {
            kind: "fluency",
            title: "Picture sprint: I can see it in my mind",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about a picture in your mind, fast and smooth, with no stops.",
            chunks: [
              "I can see a bright moon in my mind.",
              "I can hear the rain on the roof.",
              "I can smell the sweet flowers.",
              "The poet makes a picture with words.",
              "What can you see in your mind?",
            ],
            recycle: ["A big brown kangaroo was hopping across the picture.", "Were you watching the shooting star? Yes, I was."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a word card and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a word card, the other says a whole sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the word card. Close your eyes for two seconds, then say a WHOLE sentence about the picture you see.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on. After round 3, say the best sentence once more as a class.",
            ],
            prompts: ["(card: moon)", "(card: rain)", "(card: flowers)", "(card: wind)", "(card: river)"],
            feedback: correctGrammar,
            teacherNote: "Whole sentences only, never single words: the aim is to say 'I can see a bright moon in my mind' as one smooth piece. The unit's poet words go inside the sentences, so children practise vocabulary and sentence at the same time. Mix in a recycled phrase from Unit 5 every few cards so last unit's grammar stays fast. Listen for the final -s in 'flowers' and the 'the' before 'roof'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I can see ___ in my mind.", "I can hear ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a feeling: 'I can see a bright moon. It makes me feel calm.'", frames: ["I can see ___. It makes me feel ___."] },
            ],
          },
        },
        {
          after: "What else is in nature? (SB 56 C)",
          slide: {
            kind: "writing",
            title: "Grow my poet sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: look at the small sentence and think of one exact word to add.",
              "Write: make the sentence bigger with a describing word and a place.",
              "Check: look at the checklist. Is everything there?",
              "Read your big sentence to a partner. Does it make a picture?",
            ],
            items: [
              { q: "I see a moon. (add: bright, in the sky)", answer: "I see a bright moon in the sky." },
              { q: "The rain falls. (add: soft, on the roof)", answer: "The soft rain falls on the roof." },
              { q: "A bird sings. (add: tiny, in the tall tree)", answer: "A tiny bird sings in the tall tree." },
              { q: "The river runs. (add: cold, through the forest)", answer: "The cold river runs through the forest." },
            ],
            frames: ["I see a ___ ___ in the ___.", "The ___ ___ falls on the ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "A describing word before the noun", "A place: in, on or through the ___"],
            sayIt: "Read your big sentence to your partner, then close your eyes and say it again without looking.",
            teacherNote: "Expanding a short sentence is a gentle way into 'exact words', which is the poet's skill in this unit. Model the first item aloud, adding one piece at a time. Listen for a missing 'the' or 'a' (Vietnamese has no articles) and prompt with a finger.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Expand all four sentences." },
              { level: "Stretch", task: "Expand one sentence twice, then write three sentences of your own about one place, as a tiny poem." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u06-l2": {
      objectives: ["I can tell my partner how to write a haiku, three times, faster each time."],
      trim: { "Draw what you hear": 3, "Poem forms chart": 10, "Do rules help a poet?": 3, "Culture note: counting poems": 3, "Gallery talk: how to write this poem": 7, "Word detectives: observe, imagine, describe, exact": 3 },
      add: [
        {
          after: "Do rules help a poet?",
          slide: drill({
            title: "Grammar drill: counting syllables when ...",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it, change the time or the person. Then tell your partner about a real time you wrote or drew something.",
            chunks: [
              "I was counting syllables when my friend asked a question.",
              "The poet was watching the rain when she thought of a haiku.",
              "Were you reading the poem when the bell rang? No, I wasn't.",
              "We were drawing what we heard while the teacher was reading.",
              "What was the poet looking at when she wrote it?",
              "I was thinking about the lake when I wrote the first line.",
            ],
            recycle: ["I enjoy writing short poems.", "I decided to write about the sea.", "If we write a haiku, we will read it aloud."],
            prompts: ["I was counting syllables. (?)", "The poet was watching the rain. (X)", "We were drawing. (+ while the teacher was reading)", "I was counting syllables. (T: now)", "She was thinking of a haiku. (P: we)"],
            real: "Real talk: tell your partner what you were doing the last time you wrote or drew something. Say what happened, then say why: 'I was ___-ing when ___, so ___.' Your partner asks one question and tells the class one thing they remember.",
            slips: "'The poet was watch' or 'We was drawing'",
            fix: "For 'The poet was watch', say 'The poet was ...?' and tap your wrist for the -ing ending. For 'We was drawing', repeat it with a rising voice ('We was?') and point to were. Say 'syllables' with the final -s clearly yourself.",
            note: "The sentences are about the haiku the class has just read. Recycled phrases come from Units 2 and 4, so the grammar stays spaced. The Stretch tier joins two ideas with so or because, one step toward Level 4's longer sentences.",
            support: ["I was ___-ing when ___.", "The poet was ___-ing when ___."],
            stretch: "Join with so or because and add a feeling: 'I was counting syllables when my friend asked a question, so I started again. I felt silly because I lost count.'",
            stretchFrames: ["___ when ___, so ___.", "I felt ___ because ___."],
          }),
        },
        {
          after: "Expert groups: teach the rules",
          slide: {
            kind: "fluency",
            title: "Teach the haiku: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same how-to-write-a-haiku talk three times, to three partners. Both partners talk in every round. Each time it is shorter, smoother and faster.",
            chunks: [
              "To write a haiku, first you look at something closely.",
              "Then you count the syllables: five, seven, five.",
              "Next you choose exact words for a picture.",
              "Last, you read it and see it in your mind.",
            ],
            recycle: ["A tiny green grasshopper was leaping across the path.", "What were you doing at seven o'clock?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells how to write a haiku, then Partner B. Use the four picture cards: first, then, next, last. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Hold up one finger for 'first', two for 'then', three for 'next' and four for 'last'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s in 'syllables'), fix them together, then go on.",
              "In each round, Partner A talks, then Partner B talks. When the bell rings, change partners.",
              "The listener has a job: tick one box for every step the speaker says, and ask one question at the end.",
            ],
            prompts: ["(card 1: look closely)", "(card 2: count syllables)", "(card 3: choose exact words)", "(card 4: read and picture it)"],
            feedback: correctGrammar,
            teacherNote: "The same talk three times, with a one-minute fix between the first and second telling, helps the later tellings become faster and more accurate. The new partner keeps each repeat meaningful. Keep the four step cards on the board for Support children. Do not add new content between rounds; the gain comes from saying the same thing more smoothly.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["First, you ___.", "Then you ___.", "Next you ___.", "Last, you ___."] },
              { level: "Core", task: "Tell all four steps without the frames." },
              { level: "Stretch", task: "Add why each step helps: 'First, you look closely because you need a picture.'" },
            ],
          },
        },
        {
          after: "Culture note: counting poems",
          slide: {
            kind: "writing",
            title: "How to write a haiku: plan, write, check",
            routine: "paragraph",
            genre: "instructions",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the four steps (First, Next, Then, Last) and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Next, Then and Last, and start each step with a verb.",
              "Check: tick the checklist. Swap with a partner: they underline your four linking words and tell you one thing they liked.",
              "Teacher: while they write, look only at the linking words and the plural -s on 'lines' and 'syllables'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: How to write a haiku",
              text: "A haiku is a short poem with three lines, and it is easy to write. First, look closely at something, like the moon or the rain. Next, count the syllables on your fingers: five, seven, five. Then choose exact words that make a picture. Last, read your haiku aloud and see it in your mind. If you follow these steps, you can write a haiku, too!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is a haiku? Say one thing about it." },
              { label: "Step 1: First, ...", prompt: "What do you do first? (observe)" },
              { label: "Steps 2 and 3: Next, ... Then ...", prompt: "What do you do next? Which exact words help?" },
              { label: "Closing: Last, ...", prompt: "What is the last step? Say why the steps help." },
            ],
            frames: ["A haiku is ___.", "First, look closely at ___.", "Next, count ___. Then choose ___.", "Last, ___."],
            checklist: [
              "A topic sentence that says what a haiku is",
              "Four steps with First, Next, Then and Last, in order",
              "Each step starts with a verb: look, count, choose, read",
              "The plural -s is there: three lines, syllables, words",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the four steps again without looking, in one minute.",
            teacherNote: "Instructions in order are the natural genre for this lesson: the children have just taught the rules in expert groups and retold them, so the content is ready and the time goes into the paragraph itself. Plan, write, check: the boxes take words, not sentences. Mark only two targets (the linking words and the plural -s) with a dot on the line; the child finds and fixes the mistake. The paragraph is also the script for this lesson's recorded talk, 'How to write a haiku'.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each step.", frames: ["First, look closely at ___.", "Next, count ___.", "Then choose ___.", "Last, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add why for two steps: 'Choose exact words because they make a clear picture.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How to write a haiku",
        prompt: "Show a grown-up how to write a haiku. Say the steps, then read your own haiku and tell what you see in your mind.",
        length: "60-90 seconds",
        steps: [
          "Look at your haiku from class.",
          "Say the how-to-write steps three times to a grown-up or a toy: first, then, next, last.",
          "Record it once. Read your haiku slowly and tell what you see in your mind.",
          "Look at the camera, speak clearly and do not stop for a long time. (Grown-up: just hold the phone and listen.)",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the steps to write a haiku, read yours, and keep talking without long stops.",
        words: ["haiku", "syllable", "observe", "imagine", "describe", "exact"],
        grammar: ["To write a haiku, first you ___.", "he / she / it + verb with -s"],
        rubric: [
          { label: "The steps", description: "Says at least three steps in order: first, then, next, last.", weight: 3 },
          { label: "Poet words", description: "Uses unit words such as haiku, syllable, observe, imagine, exact.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on words like syllables and the verb endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, you ___.", "Then you ___.", "My haiku is about ___."], tips: ["Point to your haiku as you speak."] },
          { level: "Core", who: "Most children", frames: ["To write a haiku, first you ___. Then you ___.", "Next you ___. Last, you ___.", "In my mind, I can see ___."], tips: ["Say all four steps, then read your haiku."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Rules help a poet because ___.", "My favorite word in my haiku is ___ because ___."], tips: ["Explain why one rule helps, and why you chose one exact word."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u06-l3": {
      objectives: ["I can say what I was doing when something happened, fast and with was / were.", "I can say more about a person, a thing or a place with who, that and where."],
      trim: { "Favorite poem vote": 3, "Interrupt! Mime and say": 3, "Could you be a poet?": 3, "Words in context (SB 60 C)": 4, "Discover the rule": 7, "Our big idea": 5 },
      add: [
        {
          after: "Past continuous and simple past",
          slide: {
            kind: "grammar",
            title: "Level 4 step: who, which, that and where",
            hook: "One small word, who, which, that or where, lets you say exactly which person, thing or place you mean.",
            form: [
              { label: "Person: noun + who + verb", pattern: "the poet who wrote it" },
              { label: "Thing: noun + which / that + verb", pattern: "a poem that rhymes / a poem which rhymes" },
              { label: "Place: noun + where + subject + verb", pattern: "the place where we sat" },
              { label: "The new part comes right after the noun it tells about", pattern: "The girl who was singing stopped." },
              { label: "Do not say he, she, it or there again", pattern: "the poem that makes me smile (not: that it makes me smile)" },
            ],
            explanation: [
              "A relative clause tells us more about a noun. It answers the question: which one? 'The poet who wrote it' tells us which poet. 'A poem that rhymes' tells us which kind of poem. 'The place where we sat' tells us which place.",
              "We use who for people, which or that for things, and where for places. The new part comes straight after the noun, and the little word takes the place of he, she, it or there, so we do not say that word again. In this unit you say what was happening with was / were + -ing and when. Now the same sentences can say who or what: 'The girl who was reading the poem stopped when the lights went out.'",
              "This is grammar you will meet in Oxford Discover 4. The readings and the grammar pages there use these clauses all the time, so every time you say one now, Level 4 gets a little easier.",
            ],
            examples: [
              { text: "A poet is a person who sees pictures in words." },
              { text: "A haiku is a short poem that has three lines." },
              { text: "The poem which I read today made me feel calm." },
              { text: "The garden where we were sitting was full of birds." },
              { text: "I know a boy who was drawing the moon when the bell rang." },
              { text: "A syllable is a part of a word that you can clap." },
            ],
            pitfalls: [
              { wrong: "The poet who he wrote this poem is famous.", right: "The poet who wrote this poem is famous.", why: "Who already stands for the poet, so do not add he or she. English does not say the person twice." },
              { wrong: "A poem who rhymes is fun.", right: "A poem that rhymes is fun.", why: "Who is for people. For things and animals use that or which." },
              { wrong: "This is the park where we sat there.", right: "This is the park where we sat.", why: "Where already means 'in that place', so do not say there again." },
            ],
          },
        },
        {
          after: "Level 4 step: who, which, that and where",
          slide: drill({
            title: "Grammar drill: was / were + -ing, then who and which",
            minutes: 6,
            goal: "Change the sentence fast and right, then say more about a person, a thing or a place with who, that or where.",
            chunks: [
              "I was reading a poem when the lights went out.",
              "What were you doing when the bell rang?",
              "We weren't playing when it started to rain.",
              "The girl who was reading the poem stood up.",
              "I like the poem that makes me think of the sea.",
              "That is the room where we were singing when the lights went out.",
            ],
            recycle: ["If it rains, we will stay inside.", "I used to be afraid of the dark.", "While the bee was flying, it saw a flower."],
            prompts: ["I was reading a poem when the lights went out. (?)", "We were playing football when it rained. (X)", "I like the poem. It rhymes. (+ that)", "I know a girl. She was singing. (+ who)", "This is the room. We sat there. (+ where)"],
            r1: "Rounds 1 and 2 are the unit grammar, was / were + -ing and when (chunks 1 to 3). Round 3 and Stretch use who, that and where (chunks 4 to 6).",
            r2: "Say the signs ? X + T P with the first three sentences.",
            real: "Real talk: tell your partner about a person who ..., a thing that ... and a place where ... in your own life: 'My favorite poem is the one that ...' 'The place where I was sitting when ...' Then ask 'What were you doing when ...?' and answer.",
            slips: "'The girl who she was singing' or 'a poem who rhymes'",
            fix: "For 'the girl who she was singing', repeat it with a rising voice and cover 'she' with one finger: who already means she. For 'a poem who rhymes', point to the who / that card: who is for people. For 'the park where we sat there', say 'the park where we sat ...?' and wait. Say 'rang', 'sat' and 'started' with a clear final sound.",
            note: "This is the first lesson of the Level 4 step, who / which / that / where. Keep round 2 on was / were + -ing and when so the book's grammar is secure, and give the new clauses only in round 3. Do not teach the clauses with non-defining commas; that is Level 4's job.",
            support: ["I was ___-ing when ___.", "I like the ___ that ___.", "A ___ is a person who ___."],
            stretch: "Put both in one sentence: 'I was reading the poem that my friend wrote when the lights went out.'",
            stretchFrames: ["I was ___-ing the ___ that ___ when ___.", "The ___ who ___ was ___-ing when ___."],
          }),
        },
        {
          after: "Match the sentence parts (SB 61 F)",
          slide: {
            kind: "fluency",
            title: "What was happening? Three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same 'what was happening' talk to three friends. Both partners talk in every round. Each talk is shorter and smoother.",
            chunks: [
              "I was reading a poem when the lights went out.",
              "My brother was drawing when the bell rang.",
              "We were playing football when it started to rain.",
              "I wasn't sleeping when the phone rang.",
              "What were you doing when the lights went out?",
            ],
            recycle: ["Were you eating breakfast at seven? Yes, I was.", "A tiny green grasshopper was leaping across the path."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the 'what was happening' talk, then Partner B. The listener counts the long actions on their fingers. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Fast and smooth! Partner A talks, then Partner B. The listener asks 'What did you do next?'" },
            ],
            steps: [
              "Choose a moment: what were you doing when something happened? Plan it with a picture on your paper.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In each round, Partner A talks, then Partner B talks. When the bell rings, line B moves one step to the left: a new partner.",
              "The listener has a job: count the 'was / were' sentences and ask one follow-up question.",
            ],
            feedback: correctWas,
            teacherNote: "The same talk, less time, new listener: this is the 4-3-2 activity, which builds fluency but not accuracy by itself. The one-minute fix between rounds 1 and 2 is what raises accuracy. Expect long and short action to be mixed up; prompt with 'the long action: was + -ing; the short action: simple past'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I was ___ when ___.", "I wasn't ___ when ___."] },
              { level: "Core", task: "Say four sentences without the board." },
              { level: "Stretch", task: "Add a reason and a feeling: 'I was reading when the lights went out, so I lit a candle. I felt surprised.'" },
            ],
          },
        },
        {
          after: "My list: what was happening when ... (SB 61 G)",
          slide: {
            kind: "writing",
            title: "What was happening: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use was / were + -ing for what you were doing, and when for the surprise.",
              "Check: tick the checklist. Swap with a partner: they underline one was / were + -ing and one short action, and tell you one thing they liked.",
              "Teacher: while they write, look only at was / were + -ing and the past form of the short action. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The lights went out",
              text: "Last Friday evening, I was doing my homework when the lights went out. At first, I felt surprised. My sister was reading in her room, and she asked what happened. Then my dad found a candle, and we sat together in the kitchen. While we were waiting, we told funny stories. After an hour, the lights came back on. In the end, it was a strange night, but I was happy.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "When was it? What were you doing when something happened?" },
              { label: "Detail 1: At first, ...", prompt: "What did you feel? What was someone else doing? (was / were + -ing)" },
              { label: "Detail 2: Then, ...", prompt: "What did you do next? (past verbs)" },
              { label: "Closing: After ..., In the end, ...", prompt: "How did it end? How did you feel?" },
            ],
            frames: ["Last ___, I was ___-ing when ___.", "At first, I felt ___. My ___ was ___-ing.", "Then ___. While we were ___-ing, ___.", "In the end, ___."],
            checklist: [
              "My first sentence says what I was doing when it happened",
              "was / were + -ing for the long action (I was doing, we were waiting)",
              "The short action is past: went, found, asked, came",
              "Linking words: when, while, then, after",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "A recount of one moment follows the fluency talk, so the children already have the sentences in their mouths. Plan, write, check: the boxes take words, not sentences. Mark only two targets (was / were + -ing, and the past form of the short action) with a dot on the line; the child finds and fixes it, which works better than correcting everything. This replaces the sentence-combining slide: the 'when' joining is now practised inside the paragraph.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Last ___, I was ___-ing when ___.", "In the end, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a 'while' sentence and a feeling: 'While I was reading, my brother was drawing. I felt calm.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u06-l4": {
      objectives: ["I can ask 'What do you think of ___?' and answer with a reason, round the circle."],
      trim: { "Rhyme chain": 3, "Syllable cards": 3, "How many syllables? (SB 63 D)": 7, "Match the rhymes (SB 62 A)": 6, "Describe it, draw it, guess it": 5 },
      add: [
        {
          after: "Action verbs",
          slide: drill({
            title: "Grammar drill: the wind whispers",
            minutes: 6,
            goal: "Change the action sentence fast and right: ask it, say no, join it, change the time or the person. Then tell your partner about a poem, a song or a place you like.",
            chunks: [
              "The wind whispers in the tall trees.",
              "The waves crash on the sand.",
              "Does the moon smile over the river? Yes, it does.",
              "The rain doesn't sing, but it taps on the roof.",
              "A poem that rhymes sounds like a song.",
              "I like the poet who writes about the rain.",
            ],
            recycle: ["I enjoy listening to the rain.", "I was reading when a beetle landed on my book.", "If it rains, I will read a poem."],
            prompts: ["The wind whispers. (?)", "The waves crash. (X)", "The moon smiles. (+ because it is bright)", "The rain taps on the roof. (T: last night)", "The river runs. (P: the rivers)"],
            r1: "Say the -s on whispers, taps and smiles loudly: he / she / it needs it, 'they' does not.",
            real: "Real talk: tell your partner about a poem, a song or a place you like. Use who, that or where: 'I like the song that ...' 'My favorite place is the park where ...' Your partner asks one question: 'Why do you like it?'",
            slips: "'The wind dance' or 'The waves crashes'",
            fix: "For 'The wind dance', say 'The wind ...?' and hold up a finger for the -s. For 'The waves crashes', make a wave with your hand to show many and say 'The waves ...?'. For 'a poem who rhymes', point to the thing card: that or which. Say the final -s of 'whispers' and 'taps' clearly yourself.",
            note: "The lesson's grammar, action verbs with -s, is in rounds 1 and 2; round 3 and Stretch use the Level 4 step (who, which, that, where) again, so the clauses come back a day after Lesson 3 and grow. Vietnamese verbs do not change, so the -s is the slip to listen for.",
            support: ["The ___ ___s on the ___.", "I like the ___ that ___."],
            stretch: "Join an action sentence to a who / that / where sentence: 'The wind that whispers in the trees sounds like a friend who tells a secret.'",
            stretchFrames: ["The ___ that ___s ___.", "I like the poet who ___s about ___."],
          }),
        },
        {
          after: "Asking for opinions (SB 63 C)",
          slide: {
            kind: "fluency",
            title: "Opinion chain: What do you think?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next friend. Keep the chain going with no long stops!",
            chunks: [
              "What do you think of this poem?",
              "I think it is beautiful because the wind dances.",
              "In my opinion, the rain is quiet.",
              "Do you agree? Yes, I do. / No, I don't, because ...",
              "The moon smiles over the quiet river.",
            ],
            recycle: ["I was reading a poem when the lights went out.", "What were you doing when the bell rang?"],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a poem line card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Read your poem line card silently.",
              "Ask the friend on your left: 'What do you think of this poem?'",
              "They answer with an opinion and a reason, then turn and ask the next friend.",
              "The listener has a job: say 'Do you agree?' and tick yes or no.",
              "Teacher: after round 1, stop for one minute: fix two mistakes (for example 'the wind dance') on the board, then go on to round 2.",
            ],
            prompts: ["(card: The wind whispers in the tall trees.)", "(card: The rain taps on the roof.)", "(card: The waves crash on the sand.)"],
            feedback: correctVerbs,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which makes the question and the 'because' reason automatic. Time the whole circle and tell them; children love beating their own time. Listen for the -s on action verbs with one subject: 'the wind dances', but 'the waves crash'.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["I think it is ___ because ___.", "I agree."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Give two reasons and disagree politely: 'No, I don't, because the line is too long.'" },
            ],
          },
        },
        {
          after: "Make sentences come alive (SB 63 E)",
          slide: {
            kind: "writing",
            title: "Fix the poem lines",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each line with your partner. Something is wrong!",
              "Find the mistake: a missing -s on the verb, a wrong word, or an extra word.",
              "Write the line the right way. Read it aloud with feeling.",
            ],
            items: [
              { q: "The wind dance on the lake.", answer: "The wind dances on the lake." },
              { q: "The sun is shine in the morning.", answer: "The sun shines in the morning." },
              { q: "The waves crashes on the sand.", answer: "The waves crash on the sand." },
              { q: "The rain it falls on the roof.", answer: "The rain falls on the roof." },
            ],
            checklist: ["One thing + action verb: add -s (wind dances)", "More than one thing: no -s on the verb (waves crash)", "Do not add 'it' or 'is' before the action verb"],
            sayIt: "Read your fixed lines aloud in your best poet voice, then say two of them without looking.",
            teacherNote: "This targets the most common slips here: the missing -s on the verb (Vietnamese verbs do not change), 'is' + a verb, and a repeated subject ('the rain it'). Fix one together first. Only two or three error types, so the checklist stays checkable.",
            tiers: [
              { level: "Support", task: "Fix lines 1 and 2 with the checklist." },
              { level: "Core", task: "Fix all four lines." },
              { level: "Stretch", task: "Write one new line with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The poem that talks",
        prompt: "Tell about something in nature that has a surprising action, like a wind that whispers. Say two or three action sentences and tell what you think of your idea.",
        length: "60-90 seconds",
        steps: [
          "Look outside or at a picture of nature. Find three things.",
          "Say a sentence for each thing with an action verb, like 'The wind whispers.' Practise three times.",
          "Record it once. Tell what you think of your poem and why.",
          "Say one sentence with who, that or where, like 'I like the poem that ...' or 'My favorite place is the park where ...'.",
          "Look at the camera, speak clearly and keep going. (Grown-up: just hold the phone and listen.)",
        ],
        maxSeconds: 180,
        kidSummary: "Say action sentences about nature, say what you think, and keep talking without long stops.",
        words: ["whisper", "dance", "crash", "tap", "smile", "quiet"],
        grammar: ["He / she / it + action verb with -s: The wind whispers.", "I think ___ because ___.", "A poem that rhymes / a poet who writes ...: who, that, which"],
        rubric: [
          { label: "Action sentences", description: "Says at least three sentences with an action verb about nature.", weight: 3 },
          { label: "Verb -s", description: "Uses -s for one thing (the moon smiles) and no -s for many (the waves crash).", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 2 },
          { label: "Opinion", description: "Says what they think and gives a reason with because.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ ___s.", "I think it is ___."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["The ___ ___s on the ___.", "I think my poem is ___ because ___."], tips: ["Say three action sentences, then an opinion."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ ___s and the ___ ___.", "In my opinion, ___ because ___. Do you agree?"], tips: ["Join two actions and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u06-l5": {
      objectives: ["I can say my poem and why I wrote it three times, smoother each time."],
      drop: ["60-second recall", "Test our big ideas"],
      add: [
        {
          after: "Answer and discuss (SB 64 B)",
          slide: drill({
            title: "Grammar drill: my poem, who, that and where",
            minutes: 6,
            goal: "Change the sentence fast and right, then say more about your own poem with who, that and where.",
            chunks: [
              "I was writing my poem when I saw a silver bird.",
              "I chose the moon because it makes me feel calm.",
              "The poem that I wrote is about the quiet river.",
              "The poet who wrote it was sitting by the lake.",
              "This is the place where I was sitting when I thought of the first line.",
              "What were you thinking when you chose this topic?",
            ],
            recycle: ["I'm good at drawing pictures with words.", "I didn't use to like poems, but now I do.", "If I read it slowly, I will remember it."],
            prompts: ["I was writing my poem. (?)", "I chose the moon. (X)", "I like the poem. It makes me calm. (+ that)", "The poet was sitting by the lake. (T: now)", "I chose the topic. (P: she)"],
            real: "Real talk: tell your partner about your own poem. Use who, that and where: 'My poem is about a bird that ...' 'I thought of it in the place where ...' Your partner asks 'Why did you choose ___?' and says one line they can picture.",
            slips: "'The poem that I wrote it' or 'the place where I sat there'",
            fix: "For 'the poem that I wrote it', repeat it with a rising voice and put a finger over 'it': that already means it. For 'the place where I sat there', say 'the place where I sat ...?' and wait. Say 'chose' and 'wrote' with a clear sound and let the class echo.",
            note: "This lesson has no grammar page, so the drill keeps the unit grammar (was / were + -ing, when) and the Level 4 step alive in the children's own poem talk. The Stretch tier puts two clauses in one sentence, which is how Level 4 readings sound.",
            support: ["My poem is about ___.", "I chose ___ because ___.", "I like the ___ that ___."],
            stretch: "Say two clauses in one sentence: 'The poem that I wrote is about a river that runs through the place where I was sitting.'",
            stretchFrames: ["The poem that ___ is about ___.", "I was ___-ing in the place where ___."],
          }),
        },
        {
          after: "Illustrate and rehearse your poem (SB 65 C)",
          slide: {
            kind: "fluency",
            title: "Poem showtime: say it again, smooth",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say your poem and why you wrote it to three partners. Both partners talk in every round. Each time it is smoother, with no long stops.",
            chunks: [
              "My poem is about the quiet moon.",
              "I chose this topic because it makes me feel calm.",
              "The action verb 'whispers' makes the night seem soft.",
              "When you hear it, I want you to see a silver river in your mind.",
            ],
            recycle: ["I was reading a poem when the lights went out.", "What do you think of this poem?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A says the poem and why, then Partner B. The listener has a job: say one line you can picture. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A says it again, a little faster and clearer, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Smooth and with feeling! Partner A talks, then Partner B. Look up at your listener." },
            ],
            steps: [
              "Look at your own poem and the sentence 'I chose this topic because ...'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example a missing -s on 'whispers'), fix them together, then go on.",
              "In each round, Partner A talks, then Partner B talks. When the bell rings, change partners.",
              "The listener asks one follow-up question: 'Why did you choose ___?'",
            ],
            feedback: correctVerbs,
            teacherNote: "This is a task repeat: the same job three times, a little faster each time, with a new listener. Do not change the poem between rounds; the gain comes from the speaker meeting the same language again with less effort. Listen for a flat voice (ask for feeling) and for a dropped -s on action verbs.",
            tiers: [
              { level: "Support", task: "Read your poem aloud, then say one sentence about why.", frames: ["I chose this topic because ___.", "I want you to see ___."] },
              { level: "Core", task: "Say your poem, why you wrote it and what you want people to see, looking up." },
              { level: "Stretch", task: "Say it from memory and add how the action verb makes the topic seem." },
            ],
          },
        },
        {
          after: "Write it (Workbook)",
          slide: {
            kind: "writing",
            title: "Model paragraph: why I wrote my poem",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model. Find the topic sentence, the reasons and the closing sentence.",
              "Plan: fill in a quick organiser: topic, two reasons, how I feel.",
              "Write your own paragraph about your poem, with the frames if you need them.",
              "Check the checklist, then read your paragraph aloud to your partner.",
            ],
            text: {
              title: "Why I wrote about the moon",
              text: "I wrote my poem about the moon. I chose this topic because the moon makes me feel calm. First, it is bright and quiet in the dark sky. Then it shines on the river, so I can see silver light in my mind. The action verb 'whispers' makes the night seem soft. That is why I wrote about the moon.",
            },
            frames: ["I wrote my poem about ___.", "I chose this topic because ___.", "The action verb ___ makes ___ seem ___.", "That is why ___."],
            checklist: ["A topic sentence at the start and a closing sentence at the end", "At least two linking words: because, so, first, then", "Verbs with one thing have -s: it shines, it makes"],
            sayIt: "Read your paragraph to your partner, then say it again without looking at the page.",
            teacherNote: "Modelled writing plus a quick plan (organiser: topic, two reasons, feeling) is one of the best-evidenced routines for writers this age. Keep the model on screen while the children write. Listen when they read aloud for the -s on 'makes' and 'shines'.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks for your poem." },
              { level: "Core", task: "Write a paragraph of four to five sentences with because and so." },
              { level: "Stretch", task: "Write a paragraph of six sentences and add what you want your reader to see." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u06-l6": {
      objectives: ["I can say what I was doing when something happened, with was / were, without stopping."],
      trim: { "Freeze and tell: the interrupt game": 3, "Remember it!": 5, "Does the rule work here too?": 3, "Grammar mystery: Ollie and the strange night": 5, "Grammar detectives: Is / Is Not": 8, "Champion talk: 3 rounds": 9 },
      add: [
        {
          after: "Grammar: was / were + -ing, and when",
          slide: drill({
            title: "Grammar drill: champions with when, who and that",
            minutes: 7,
            goal: "Change the sentence fast and right with both champion grammars: was / were + -ing with when, and who, that and where. Then tell your partner about a surprising moment.",
            chunks: [
              "I was drawing a robin when the brush fell.",
              "While I was cooking, my cousin was setting the table.",
              "What were you doing when the lights went out?",
              "The girl who was singing stopped when the rain began.",
              "The poem that I was reading made me feel calm.",
              "The kitchen is the place where we were sitting when the lights went out.",
            ],
            recycle: ["If the lights go out, I will light a candle.", "I used to be afraid of the dark.", "I have never seen a power cut at night."],
            prompts: ["I was drawing a robin when the brush fell. (?)", "We were singing when the rain began. (X)", "I met a boy. He was cooking. (+ who)", "She was reading a poem. It rhymed. (+ that)", "This is the kitchen. We sat there. (+ where)"],
            r1: "Use both grammars: sentences 1 to 3 are the unit grammar, sentences 4 to 6 are the Level 4 step.",
            r2: "Try two signs at once, like X + who.",
            real: "Real talk, champion round: tell your partner about a surprising moment. Use was / were + -ing and when, and also a person who ..., a thing that ... or a place where ... Your partner asks 'What were you doing when ...?'",
            slips: "'We was singing' or 'the boy who he was cooking'",
            fix: "For 'We was singing', say 'We ...?' and hold up two fingers for were. For 'the boy who he was cooking', cover 'he' with a finger: who already means he. For 'the kitchen where we sat there', say 'where we sat ...?' and wait. Say the past endings, rang, sat and began, with a clear final sound.",
            note: "The unit's last lesson covers both: the book's was / were + -ing and when, and the Level 4 step, who / which / that / where. If the class is not ready for two signs at once, keep to one sign per sentence. In the paragraph that follows, children are asked for one sentence with who, which, that or where.",
            support: ["I was ___-ing when ___.", "I met a ___ who ___.", "I like the ___ that ___."],
            stretch: "Put the unit grammar and the step in one sentence and add a reason: 'I was reading the poem that my friend wrote when the lights went out, so I lit a candle.'",
            stretchFrames: ["I was ___-ing the ___ that ___ when ___, so ___."],
          }),
        },
        {
          after: "The power cut mystery: ask and answer",
          slide: {
            kind: "fluency",
            title: "Champion sprint: when the lights went out",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right: this unit's, last unit's and the question.",
            chunks: [
              "What were you doing when the lights went out?",
              "I was drawing a robin when the brush fell.",
              "We were singing when the rain began.",
              "While I was cooking, my cousin was setting the table.",
              "I wasn't sleeping when you called.",
            ],
            recycle: ["A tiny green grasshopper was leaping across the path.", "Were you watching the shooting star? Yes, I was."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card and the class says the sentence." },
              { seconds: 60, say: "Pairs: one asks the question, the other answers with a whole sentence. Swap." },
              { seconds: 45, say: "Champion round: new partner, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: draw)", "(card: sing)", "(card: cook)", "(card: sleep)", "(card: read)"],
            feedback: correctWas,
            teacherNote: "A quick, high-energy recall of the unit's grammar: was / were + -ing for the long action, the simple past for the interruption. Mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. The 'While ... , ... was' sentence is the hardest: keep it for Stretch if the class is not ready.",
            tiers: [
              { level: "Support", task: "Use the frames on the board with a friend.", frames: ["I was ___-ing when ___.", "We were ___-ing when ___."] },
              { level: "Core", task: "Say the sentences without the board." },
              { level: "Stretch", task: "Say a 'while' sentence: 'While I was drawing, my friend was reading.'" },
            ],
          },
        },
        {
          after: "Write a moment paragraph",
          slide: {
            kind: "writing",
            title: "A surprising moment: plan, write, check",
            routine: "paragraph",
            genre: "story",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the opening, the long action, the surprise and the ending.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use was / were + -ing for the long action and the simple past for what happened.",
              "Check: tick the checklist. Swap with a partner: they underline one when sentence and one while sentence, and tell you one thing they liked.",
              "Teacher: while they write, look only at was / were and the -ed or past form of the short action. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The rainbow",
              text: "One windy afternoon, I was walking home from school when I saw a rainbow over the river. I stopped and watched it. Suddenly, a small brown dog ran past me while it was chasing a ball. The dog was barking, and I was laughing. Then the owner called, and the dog came back. Next, the rain stopped and the rainbow got bigger. I felt surprised and happy. What a beautiful afternoon!",
            },
            organiser: [
              { label: "Opening", prompt: "When and where? What were you doing? (was / were + -ing)" },
              { label: "The surprise", prompt: "What happened? (past verb) What was happening around you?" },
              { label: "What happened next", prompt: "What did you or someone else do? Use Then or Next." },
              { label: "Ending", prompt: "How did you feel? How did it end?" },
            ],
            frames: ["One ___ afternoon, I was ___-ing when ___.", "Suddenly, ___ while ___ was ___-ing.", "Then ___. Next, ___.", "I felt ___."],
            checklist: [
              "The opening says what I was doing when something happened",
              "was / were matches: I was, it was, the dog was, we were",
              "The short action is past: saw, ran, called, stopped",
              "At least one when or while sentence, and Then or Next",
              "One sentence with who, which, that or where: a person who ..., a thing that ..., a place where ...",
            ],
            sayIt: "Read your story to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Today's paragraph is a short story, so it is a different genre from the recount in Lesson 3: it needs a surprise and an ending. It replaces the fix-it slide; the four common slips from that slide (a missing was, 'we was', -ing on the short action, a missing -ed) are now the checklist items. Plan, write, check: the boxes take words, not sentences. Mark only two targets (was / were and the past form of the short action) with a dot on the line; the child finds and fixes the mistake.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["One ___ afternoon, I was ___-ing when ___.", "I felt ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a 'while' sentence about a second person: 'While I was running, my friend was filming.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What was I doing when ...?",
        prompt: "Tell a short story about a surprising moment. Say what you were doing when something happened, and what you did next.",
        length: "60-90 seconds",
        steps: [
          "Think of a moment: what were you doing when something surprising happened?",
          "Say your story three times to a grown-up or a toy: what you were doing, what happened, what you did next.",
          "Record it once. Say how you felt and why.",
          "Say one sentence with who, that or where, like 'The boy who was cooking dropped the plate' or 'I was in the room where we eat'.",
          "Look at the camera, speak clearly and keep going. (Grown-up: just hold the phone and listen.)",
        ],
        maxSeconds: 180,
        kidSummary: "Tell what you were doing when something happened, what you did next, and keep talking without long stops.",
        words: ["suddenly", "surprised", "lights", "rain", "bell", "phone"],
        grammar: ["I was ___-ing when ___.", "We were ___-ing when ___.", "While I was ___, my ___ was ___.", "The ___ who / that ___ was ___-ing when ___."],
        rubric: [
          { label: "Was / were + -ing", description: "Says what they were doing with was / were and a verb ending in -ing.", weight: 3 },
          { label: "The short action", description: "Says what happened with the simple past: rang, fell, went.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Feelings and reasons", description: "Says how they felt and why, with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I was ___-ing when ___.", "Then I ___."], tips: ["Draw two pictures first: the long action and the surprise."] },
          { level: "Core", who: "Most children", frames: ["I was ___-ing when ___.", "I felt ___ because ___, so I ___."], tips: ["Say what you did next and how you felt."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["While I was ___, my ___ was ___.", "I wasn't ___-ing when ___."], tips: ["Add a second person and a negative sentence."] },
        ],
      },
    },
  },
};
