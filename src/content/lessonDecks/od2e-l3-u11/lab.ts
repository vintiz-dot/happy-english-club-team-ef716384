import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 11 "Orchestras and
// Mystery Sounds" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10
// (Sky 1). Every lesson gets one fluency routine and one writing routine; the unit uses five
// different of each. Lessons 2 and 5 end with a recorded talk for home (Lesson 4 already has
// the unit's vlog). Time comes from games and repeats, never from the book pages, the grammar
// or the checks. The grammar said again and again as whole sentences: comparing with -er /
// -est and more / most, and possessive 's and s'. Unit 10's phrases come back as recycle.
// All text is original.

const fixWords =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('A drum is loud ...?'), point to the frame, or hold up a finger for the missing word. For a sound, just say it right and let them echo it. Say your own final sounds clearly: -s, -ed and -est.";

const fixCompare =
  "Listen for 'more louder' and 'the most noisiest' (two comparing signals in one word), 'bigger that' for 'bigger than', 'gooder' for 'better', and 'Of the three, this one is bigger' where the three needs 'the biggest'. Prompt the fix: point to the frame, start 'A drum is loud ... ' and pause, or hold up one finger for the missing 'the'. Do not say the sentence for them. A quick recast is fine for sounds only: say 'louder' with a clear -er and let the child echo it. Say your own -er, -est and 'than' clearly, because many Vietnamese learners drop final sounds.";

const fixPossessive =
  "Listen for a dropped 's ('the conductor baton'), the apostrophe in the wrong place ('the conductors baton', 'the childrens' songs'), and a possessive 's turned into a plural -s. Prompt the fix: start 'The conductor ...' and pause, point to the owner on the board, or hold up a finger for the missing 's. Do not say the sentence for them. Say it clearly yourself: 'the conductor's baton' has an extra s sound that children often do not hear. Sounds can be recast: say the word right and let them echo it.";

export const odL3U11Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u11-l1": {
      objectives: ["I can say what a musician or a worker is and does, in whole sentences, without stopping."],
      trim: { "Mystery sound box": 5, "Music or noise?": 4, "Word webs: instruments and people (SB 108 B)": 6, "Other instruments we know (SB 108 C)": 4 },
      add: [
        {
          after: "Would you like this job?",
          slide: {
            kind: "fluency",
            title: "Job sprint: who is it?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole sentence about each job, fast and smooth, with no stops.",
            chunks: [
              "A conductor is a person who shows the players how to play.",
              "A scientist is a person who studies the world.",
              "An astronaut is a person who travels into space.",
              "A cello is an instrument that you play with a bow.",
              "I would like this job because it is exciting.",
            ],
            recycle: ["We use a lot of energy every day.", "A few of us ride bicycles."],
            rounds: [
              { seconds: 75, say: "Together: the teacher shows a picture, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a picture, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without a stop?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them with the class; then go on.",
            ],
            prompts: ["(picture: conductor)", "(picture: scientist)", "(picture: astronaut)", "(picture: cello)", "Would you like this job? Why?"],
            feedback: fixWords + " Here the common slips are 'A conductor is person who ...' (missing a) and 'A scientist study the world' (missing -s after he or she).",
            teacherNote: "Whole sentences only. 'A ___ is a person who ...' is a chunk that carries the unit's job words, the article a / an and the third-person -s. Listen for the missing 'a' and the missing -s on 'shows', 'studies' and 'travels'; model them clearly. Mix in Unit 10's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ is a person who ___.", "A ___ is an instrument."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I would like this job because ... but I wouldn't like ...'", frames: ["I would like this job because ___."] },
            ],
          },
        },
        {
          after: "Other instruments we know (SB 108 C)",
          slide: {
            kind: "writing",
            title: "Grow my instrument sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a describing word or a place or a reason.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "The cello is an instrument. (add: large, string)", answer: "The cello is a large string instrument." },
              { q: "The conductor holds a baton. (add: thin)", answer: "The conductor holds a thin baton." },
              { q: "The timpani make a sound. (add: deep)", answer: "The timpani make a deep sound." },
              { q: "I like the bassoon. (add: because it sounds friendly)", answer: "I like the bassoon because it sounds friendly." },
            ],
            frames: ["The ___ is a ___ instrument.", "I like the ___ because ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "a or an: 'an instrument', 'a large instrument'", "The -s on plural words (timpani is plural already!) and on 'sounds', 'likes'"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding one short sentence teaches children that sentences grow by adding detail, not by getting more complicated. 'an instrument' (vowel sound) is a good moment to say the sounds aloud: Vietnamese has no articles, so a / an is a common miss.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write two big sentences of your own." },
              { level: "Stretch", task: "Write one sentence with 'because' and one with 'and'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u11-l2": {
      objectives: ["I can tell a mystery story in order, again and again, a little faster each time."],
      trim: { "Instrument families": 3, "Home talk: favorite instruments": 5, "Invent a mystery guest": 10 },
      add: [
        {
          after: "Retell it in 60 seconds",
          slide: {
            kind: "fluency",
            title: "Mystery retell: shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same mystery three times, to three partners. Each telling is shorter (75, 60, then 45 seconds), smoother and faster.",
            chunks: [
              "First, they heard a strange sound.",
              "They thought it was ___, but it wasn't.",
              "Next, they looked for a clue.",
              "Then they found out the truth.",
              "At the end, everybody laughed!",
            ],
            recycle: ["There are a few clues.", "We used a lot of energy to look!"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells your group's mystery guest story, then Partner B tells theirs. Use the sound, the guess and the truth. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Next, three for Then, four for At the end.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then start round 2.",
              "When the bell rings, find a new partner.",
              "The listener has a job: count the sequence words (first, next, then, at the end) on their fingers.",
            ],
            prompts: ["(picture: the sound)", "(picture: the guess)", "(picture: the clue)", "(picture: the truth)"],
            feedback: fixWords + " For this retell, watch the past tense: 'They hear' for 'They heard', 'It was' dropped, and missing -ed ('They look for a clue'). Prompt with 'Yesterday they ...?' and let the child finish.",
            teacherNote: "The second and third tellings free the children to speak faster because they are not searching for the story. The one-minute fix after round 1 is what makes the later tellings more accurate too. The listener's counting job keeps the listener active. Past-tense -ed and irregular past (heard, thought, found) are the likely slips.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, they heard ___.", "They thought it was ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'They felt scared because the sound was deafening.'" },
            ],
          },
        },
        {
          after: "Two emails (writing from a character's view)",
          slide: {
            kind: "writing",
            title: "Dictogloss: the sound in the hall",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Listen to the text once. Do not write.",
              "Listen again and write key words: sounds, guesses, the truth.",
              "With your partner, build the text again with the same meaning. It does not need to be word for word.",
              "Compare with the text on the board and fix one thing.",
            ],
            text: {
              title: "The sound in the hall",
              text: "Mina and her brother heard a deep sound in the school hall. They thought it was thunder, but the sky was blue. Then they heard a soft song. At last they found a big cello behind the curtain, and a girl was playing it.",
            },
            frames: ["First, ... Then, ...", "They thought it was ___, but ___."],
            checklist: ["Past tense words are in the past: heard, thought, found", "A capital letter and a full stop in every sentence", "The words first, then, at last show the order"],
            sayIt: "Read your text to your partner, then tell it again without looking.",
            teacherNote: "Read the text twice at natural speed, 44 words. A dictogloss works best after a short reminder of the form: write 'heard, thought, found' on the board first. Children rebuild the text in pairs and compare, so they notice their own past-tense mistakes.",
            tiers: [
              { level: "Support", task: "Write the key words from the board and build two sentences." },
              { level: "Core", task: "Rebuild the whole text with your partner." },
              { level: "Stretch", task: "Rebuild it and add one more clue to the mystery." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My mystery sound story",
        prompt: "Tell a short mystery story about a strange sound. Say what you heard, what you thought it was, and what it really was. Make the sound if you can!",
        length: "60-90 seconds",
        steps: [
          "Think of a sound at home: a door, a pot, a phone, a clock.",
          "Tell your story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Use first, next, then and at the end.",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell a mystery sound story in order and keep going without long stops.",
        words: ["mystery", "deafening", "clue", "sound", "guess", "truth"],
        grammar: ["First, next, then, at the end", "They heard ___. They thought it was ___. It was ___."],
        rubric: [
          { label: "Story in order", description: "Tells what was heard, the guess and the truth with first, next, then or at the end.", weight: 3 },
          { label: "Past tense", description: "Uses the past: heard, thought, found, was. Final -ed and -s sounds can be heard.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit, such as mystery, deafening, clue and guess.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, I heard ___.", "I thought it was ___.", "It was ___!"], tips: ["Make the sound and point to the thing."] },
          { level: "Core", who: "Most children", frames: ["First, I heard a ___ sound.", "Next, I thought it was ___, but it wasn't.", "At the end, I found out it was ___."], tips: ["Say one clue that helped you."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The sound was louder than ___ and softer than ___.", "At last I found out that it was ___, which was the funniest answer of all!"], tips: ["Compare your mystery sound with two other sounds."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u11-l3": {
      objectives: ["I can ask and answer 'Which is louder?' and 'Which is the loudest?' fast, without stopping."],
      trim: { "Loud, louder, loudest": 4, "Compliment your partner! (SB 113 G)": 7, "Our big idea": 6, "Fix the sentence": 3 },
      add: [
        {
          after: "Rank it: three things",
          slide: {
            kind: "fluency",
            title: "Comparing chain: which is louder?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Which is louder, a drum or a flute?",
              "A drum is louder than a flute.",
              "Is a trombone more interesting than a violin?",
              "Yes, it is. / No, it isn't.",
              "Of the three, the drum is the loudest.",
            ],
            recycle: ["There are a few drums in the room.", "We need a lot of players."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds two picture cards." },
              { seconds: 75, say: "Swap cards with your neighbor. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your two instrument cards.",
              "Ask the friend on your left: 'Which is louder, a ___ or a ___?'",
              "They answer with 'than'. Then they turn and ask the next friend a new question.",
              "In round 3, put your two cards next to your neighbor's card. The answer must say which one of the three is the loudest.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Which is ___er, a ___ or a ___?", "Is a ___ more ___ than a ___?", "Which is the ___est of the three?"],
            feedback: fixCompare,
            teacherNote: "A chain makes every child ask AND answer many times in a few minutes, which is what makes 'louder than' and 'the loudest' automatic. Time the whole circle and tell them; children love beating their own time. Listen for the double marker ('more louder'), the missing 'than' and the missing 'the' before -est.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["A ___ is ___er than a ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Use a long adjective and a reason: 'A trombone is more exciting than a flute because it is louder.'" },
            ],
          },
        },
        {
          after: "Complete the chart (SB 113 F)",
          slide: {
            kind: "writing",
            title: "Join them with than and because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence. Say it first, then write it.",
              "Read your sentence to your partner. Does it sound right?",
            ],
            items: [
              { q: "A drum is loud. A flute is quiet. (than)", answer: "A drum is louder than a flute." },
              { q: "A cello is big. A violin is small. (than)", answer: "A cello is bigger than a violin." },
              { q: "The trombone is exciting. I like it. (because)", answer: "I like the trombone because it is exciting." },
              { q: "The drum is the loudest of the three. I can hear it best. (so)", answer: "The drum is the loudest of the three, so I can hear it best." },
            ],
            checklist: ["-er + than for two things; the + -est for three or more", "A long word takes more or most, not -er or -est", "A capital letter and a full stop"],
            sayIt: "Say your combined sentences to your partner without looking.",
            teacherNote: "Sentence combining has research support as a way to grow children's writing: it teaches how sentences join through use, not rules. Model item 1 aloud, writing 'louder than' on the board and underlining 'than'. The spelling change in 'bigger' (double the g) is worth a quick board example.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frame on the board.", frames: ["A ___ is ___er than a ___."] },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two new sentences of your own: one with than and one with the most." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u11-l4": {
      objectives: ["I can say who owns something and compare things, again and again, in one smooth quiz show."],
      trim: { "Songs we sing (SB 114 Think)": 4, "Possessive match game": 4, "Big Question Review (SB 114-115)": 4, "Compare two things at school": 6 },
      add: [
        {
          after: "Plan and rehearse your quiz show",
          slide: {
            kind: "fluency",
            title: "Quiz show again: three times, three partners",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Give the same quiz show to three groups. Each time is shorter (65, 50, then 35 seconds), smoother and more exact.",
            chunks: [
              "The conductor's baton is white.",
              "The musicians' chairs are in a circle.",
              "The children's choir sings every Friday.",
              "Which is deeper, the bassoon's sound or the flute's?",
              "The bassoon's sound is deeper than the flute's.",
            ],
            recycle: ["A drum is louder than a flute.", "Of the three, the drum is the loudest."],
            rounds: [
              { seconds: 65, say: "Round 1: Group A gives its quiz show with three questions to Group B, then Group B gives theirs. Then change groups." },
              { seconds: 50, say: "Round 2: New group. Group A gives the same quiz show, a bit faster and smoother, then Group B. Then change groups." },
              { seconds: 35, say: "Round 3: New group. Group A goes fast and smooth, then Group B. Can you ask all three questions without stopping?" },
            ],
            steps: [
              "Choose three questions from your quiz show. Each one needs an owner or a comparison.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them with the class; then go on with the same quiz show.",
              "When the bell rings, move to a new group.",
              "The listener has a job: tick each possessive 's and each comparing word you hear.",
            ],
            prompts: ["Whose ___ is it?", "Which is ___er?", "Whose ___ are these?"],
            feedback: fixPossessive,
            teacherNote: "Task repetition: the same task, a new audience, less time. Content stays the same so the children can focus on how they say it. Note the many-owners ending: 'musicians'' sounds the same as 'musicians', so it is a writing point, not a speaking one; do not ask for a pause. Listen for 's dropped and for 'the childrens'.",
            tiers: [
              { level: "Support", task: "Say two questions with the frames.", frames: ["The ___'s ___ is ___.", "Which is ___er, ___ or ___?"] },
              { level: "Core", task: "Say three questions without the board." },
              { level: "Stretch", task: "Add a because: 'The bassoon's sound is deeper than the flute's because it is longer.'" },
            ],
          },
        },
        {
          after: "Choose the possessive noun (SB 115 E)",
          slide: {
            kind: "writing",
            title: "Fix the owner words",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong with the owner word!",
              "Find it: a missing 's, the apostrophe in the wrong place, or a missing -est.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The conductors baton is on the chair. (one conductor)", answer: "The conductor's baton is on the chair." },
              { q: "The musicians chairs are in a circle.", answer: "The musicians' chairs are in a circle." },
              { q: "The childrens choir sings every Friday.", answer: "The children's choir sings every Friday." },
              { q: "Of the three drums, this one is the most loud.", answer: "Of the three drums, this one is the loudest." },
            ],
            checklist: ["One owner: 's. Many owners ending in s: s'", "children, men and women take 's", "-er / -est for short words, more / most for long words"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "Two error types only (owner words and -est), with a short reminder on the board: one owner 's, many owners s'. Fix item 1 together first. In speech 'the conductor's' and 'the conductors' sound the same, so children must decide from the meaning: ask 'How many conductors?'",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the rule on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u11-l5": {
      objectives: ["I can talk about my favorite instrument for a minute and compare it, three times, a little faster each time."],
      trim: { "Remember it!": 4, "Which is it? The class survey puzzle": 10, "The Orchestra Line-up": 8 },
      add: [
        {
          after: "Which is it? The class survey puzzle",
          slide: {
            kind: "fluency",
            title: "Instrument talk 75-60-45: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three friends. Each talk is shorter (75, 60, then 45 seconds) and smoother.",
            chunks: [
              "My favorite instrument is the cello.",
              "It is deeper than the violin.",
              "Of all the instruments, it is the most relaxing.",
              "I like it because it sounds warm.",
              "It is better than the drum for a quiet evening.",
            ],
            recycle: ["The conductor's baton is white.", "A trombone is more exciting than a flute."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the talk, then Partner B gives theirs. The listener counts the comparing words on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A goes fast and smooth, then Partner B. The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) talks, then Partner B (line B) talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step left: a new partner. Then Partner A talks first again.",
              "The listener has a job: count comparing words (-er, -est, more, most) and ask a follow-up question: 'Why do you like it?'",
            ],
            feedback: fixCompare,
            teacherNote: "This is the 4/3/2 activity scaled for ages 8-10: same talk, less time, new listener. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix after round 1 is what makes it more accurate too. Listen for the missing 'the' before -est and for 'better' used right.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite instrument is the ___.", "It is ___er than the ___.", "I like it because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Compare three instruments and pick the most ___ one, with a reason." },
            ],
          },
        },
        {
          after: "Write a comparing paragraph",
          slide: {
            kind: "writing",
            title: "Model, then write: my favorite sound",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the supporting sentences and the closing sentence.",
              "Plan: write your topic and three reasons in a quick organiser.",
              "Write your paragraph. Check it against the checklist.",
              "Read it to your partner.",
            ],
            text: {
              title: "My favorite sound",
              text: "My favorite sound is rain on the window. It is softer than a drum and more relaxing than a song. I think it is the most peaceful sound at night. It helps me sleep, so I like it better than my alarm clock. That is why rain is my favorite sound.",
            },
            frames: ["My favorite sound is ___.", "It is ___er than ___ and more ___ than ___.", "I think it is the most ___ sound because ___.", "That is why ___ is my favorite."],
            checklist: ["Topic sentence, three supporting sentences and a closing sentence", "Comparing words: -er + than, more ... than, the -est, the most", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your paragraph to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is the strategy children are taught step by step. After the Champion paragraph this is a shorter, more personal version, so the child writes what they already said in the 4-3-2. The model is a different topic so nobody copies it word for word.",
            tiers: [
              { level: "Support", task: "Use the frames to write four sentences." },
              { level: "Core", task: "Write a paragraph with a topic sentence, three supporting sentences and a closing sentence." },
              { level: "Stretch", task: "Write a paragraph that compares three sounds and uses 'than', 'the most' and 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Which sound is the best?",
        prompt: "Choose three sounds or instruments. Compare them and tell us which one is the best and why. Play or make each sound if you can!",
        length: "60-90 seconds",
        steps: [
          "Choose three sounds at home or three instruments you know.",
          "Say your comparison three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Look at the camera and keep going.",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Compare three sounds, pick the best one, give a reason and keep talking without long stops.",
        words: ["louder", "softer", "deeper", "more relaxing", "the most exciting", "better", "the best"],
        grammar: ["-er + than / more ... than", "the -est / the most ...", "better, the best"],
        rubric: [
          { label: "Comparing words", description: "Uses -er / more + than for two things and the -est / the most for three.", weight: 3 },
          { label: "A reason", description: "Gives at least one reason with because or so.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Final sounds -er, -est and -s can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___er than the ___.", "The ___ is the best.", "I like it because ___."], tips: ["Hold up each sound or picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ is ___er than the ___.", "The ___ is more ___ than the ___.", "Of the three, the ___ is the ___est because ___."], tips: ["Say one reason for your best sound."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My family's favorite sound is the ___, but mine is the ___, because ___.", "I think the best sound is ___, but you may not agree."], tips: ["Add another person's opinion and your own."] },
        ],
      },
    },
  },
};
