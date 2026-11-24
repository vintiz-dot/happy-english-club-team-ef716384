import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 5 "Poems and
// Insects" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine and one short writing routine: chunk sprint,
// 4-3-2, question chain, task repeat and retell for speaking; expand it, dictogloss,
// sentence combining, fix it and model-then-write for writing. Lessons 2 and 5 end with a
// recorded talk for home. Time comes from games and repeats, never from the book pages,
// the grammar or the checks. All text is original.

const fixInsects =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, make the child fix it: start the phrase and pause ('A beetle ha...?'), hold up one finger for a missing -s ('A cricket sing... at night'), or point to the frame. For 'A beetle have a shell' say 'A beetle ...?' with rising voice and wait. For a sound, say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const fixPoemTalk =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). After round 1, stop for one minute and fix two on the board together; then go on. Make the child repair grammar: start the phrase and pause ('The poet say... ?' with one finger up for the -s; 'It is about ...?'), or point to the frame on the board. Fix pronunciation with a quick recast: say 'rhymes' or 'lines' clearly with the final sound, and the child echoes it. Do not correct during the talk itself; fix between rounds so the child can say it again with the fixed form.";

const fixPastCont =
  "Listen and note two or three mistakes (no names). Between rounds, fix them for one minute on the board. Make the child repair grammar: for 'I playing football' start 'I w...?' and pause; for 'They was singing' point to the frame and ask 'was or were?'; for 'Was you reading?' repeat it with rising voice, 'Was you ...?', and wait; for a missing -ing hold up a finger at the end of the word. Recast only sounds: say 'wasn't' and 'weren't' clearly and let the child echo. Say every -ing ending clearly yourself.";

const fixDescribe =
  "Listen and note two or three mistakes (no names). Stop for one minute after round 1 and fix them on the board. Make the child repair grammar: for 'a green big grasshopper' tap the board where 'size' comes before 'color' and say 'a ... green ...?'; for 'a orange butterfly' say 'a... or an...?' and wait; for 'two greens beetles' hold up a finger on the word 'green' and shake your head (no -s on describing words). Fix a sound with a quick recast ('beetle', 'little': the last part is 'ul') and let the child echo.";

const fixRetell =
  "Listen and note two or three mistakes (no names). After round 1, stop for one minute and fix two on the board together, then let the children tell the story again with the fixed forms. Make the child repair grammar: start 'At seven o'clock, Bo w...?' and pause; for 'The ants was carrying' ask 'was or were?' and point to the plural sign; hold up a finger for a missing -ing. Fix a sound by recasting it ('wasn't', 'weren't') and letting the child echo.";

export const odL3U5Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u05-l1": {
      objectives: ["I can say sentences about insects fast and smooth, and write them with details."],
      trim: {
        "Poem or story? Move and decide": 3,
        "Insect or not an insect?": 3,
        "Discover Poster 3: what can you see?": 3,
        "Insect mime: freeze and guess": 3,
        "Silly sentences (SB 48 C)": 5,
        "Think and answer (SB 46 C)": 5,
      },
      add: [
        {
          after: "Describe the insects (SB 48 B)",
          slide: {
            kind: "fluency",
            title: "Insect sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say each whole sentence about an insect smoothly, with the -s you can hear.",
            chunks: [
              "A ladybug is small and red.",
              "A grasshopper can leap very far.",
              "A beetle has a hard shell.",
              "A cricket sings at night.",
              "Is a bee an insect? Yes, it is.",
              "A kangaroo is not an insect.",
            ],
            recycle: ["If a place has a park, families come.", "When it rains, we stay inside."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows an insect card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not just the word.",
              "Listen for the clap: it means swap cards and partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them; then go on.",
              "In round 3, count your sentences on your fingers. The listener ticks each smooth one.",
            ],
            prompts: ["(card: ladybug)", "(card: grasshopper)", "(card: beetle)", "(card: cricket)", "(card: bee)", "(card: kangaroo)"],
            feedback: fixInsects,
            teacherNote: "Whole sentences only: 'A beetle has a hard shell' said as one smooth piece, never a list of words. Repeating the same six sentences with a new partner each round is what makes them automatic. Listen for the he/she/it -s (has, sings, flies) and for 'can leap', with no -s after can. Mix the two Unit 4 phrases in every few cards so they stay fast. All facts here are true: a kangaroo is a mammal, a bee is an insect.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ is ___.", "A ___ has ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second sentence with 'because': 'A bee is an insect because it has six legs.'", frames: ["A ___ is an insect because ___."] },
            ],
          },
        },
        {
          after: "Silly sentences (SB 48 C)",
          slide: {
            kind: "writing",
            title: "My favorite insect: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline one -s word and one describing word and tell you one fact they learned.",
              "Teacher: while they write, look only at the -s on has / lives / eats and at size before color. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The ladybug",
              text: "The ladybug is my favorite insect because it is small, red and very pretty. It has six legs and two bright wings with black spots. A ladybug lives in the garden, and it eats tiny green bugs. It can fly from leaf to leaf, but it is not fast. I like it because it helps the plants. Do you like ladybugs?",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which insect is your favorite? What is it like? (two describing words)" },
              { label: "Detail 1: its body", prompt: "What does it have? (legs, wings, a shell)" },
              { label: "Detail 2: what it does", prompt: "Where does it live? What does it eat? Can it fly, leap or sing?" },
              { label: "Closing", prompt: "Why do you like it? Ask the reader a question." },
            ],
            frames: ["The ___ is my favorite insect because it is ___ and ___.", "It has ___ and ___.", "A ___ lives in ___, and it ___s.", "I like it because ___."],
            checklist: [
              "My first sentence names the insect and says what it is like",
              "-s on has, lives, eats (one insect = he / she / it)",
              "Size before color if I use two describing words",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. A description paragraph is easier than a story because the order is simple: what it is, what it has, what it does, why you like it. Mark only two targets (the -s on he / she / it verbs and size before color) with a dot on the line; the child finds and fixes the mistake. Vietnamese verbs do not change for he / she / it, so the -s is the likely slip.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["The ___ is my favorite insect because it is ___ and ___.", "I like it because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with but or because and one more fact: 'It is tiny, but it is very strong.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u05-l2": {
      objectives: ["I can tell a partner what a poem is about three times, longer and then shorter, and write what I hear."],
      trim: { "Poets' lives": 3, "Meet the poets and predict (SB 50)": 5, "Home talk: a poem or song I know by heart": 3 },
      add: [
        {
          after: "Read it aloud with rhythm and actions",
          slide: {
            kind: "fluency",
            title: "Poem talk 4-3-2: what is my poem about?",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same poem talk to three partners. In each round both partners talk: one minute, then 45 seconds, then 30 seconds each. You say the same things, but faster.",
            chunks: [
              "Our poem is called 'The Sleepy Beetle'.",
              "It is about a beetle that cannot sleep.",
              "I can see a tiny green beetle in my mind.",
              "The poet is saying that the night is very quiet.",
              "I like it because the lines rhyme.",
            ],
            recycle: ["If a place has a park, families come.", "My favorite place is the park. It has a big lake."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the poem talk, then Partner B does. The listener counts how many times you say 'rhyme' or 'picture'. Then change partners." },
              { seconds: 45, say: "Round 2: Partner A tells the same talk in less time, then Partner B. Keep the best ideas. Then change partners." },
              { seconds: 30, say: "Round 3: Partner A, then Partner B. Fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Choose one poem from today. Plan your talk with the chunks and the frames on the board: name, topic, picture, reason.",
              "Face a partner. In each round Partner A talks, then Partner B talks. The listener has a job: count, then ask one follow-up question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on with round 2.",
              "When the bell rings, change partners: a new partner for the shorter talk. Both partners talk again.",
            ],
            prompts: ["What is the poem called?", "What is it about?", "What can you see in your mind?", "Why do you like it?"],
            feedback: fixPoemTalk,
            teacherNote: "This is the 4/3/2 activity (Nation) for 8 to 10-year-olds. The same content, less time and a new listener each round is what builds speed and smoothness; the one-minute fix between rounds is what adds accuracy, because 4-3-2 alone builds fluency but not accuracy. Do not add new ideas between rounds. Listen for 'The poet says' (-s), 'lines' and 'words' (plural -s) and for the final sound in 'rhyme' and 'picture'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames on the board.", frames: ["Our poem is called ___.", "It is about ___.", "I like it because ___."] },
              { level: "Core", task: "Say four or five sentences without the board and keep going for the whole round." },
              { level: "Stretch", task: "Add one more reason with also: 'Also, the poem is short and easy to remember.'", frames: ["The theme is that ___.", "For example, the poem says ___."] },
            ],
          },
        },
        {
          after: "Topic or theme? (Organize)",
          slide: {
            kind: "writing",
            title: "A poem I want to share: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the opinion, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a poem, a song or a rhyme you know.",
              "Write: turn your notes into one paragraph. Start with 'I want to share ...' and use because and so.",
              "Check: tick the checklist. Swap with a partner: they underline one -s word and one because / so and tell you one thing they liked.",
              "Teacher: while they write, look only at the -s on the poet uses / it paints / it makes and at the plurals (lines, words). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A poem about the rain",
              text: "I want to share a poem about the rain with my class because it paints a bright picture. The poet uses short lines, and the last words of some lines rhyme. When I read it aloud, I can hear a happy rhythm. I can see a gray cloud and a tiny silver drop in my mind. This poem makes me smile, so I think my friends like it, too.",
            },
            organiser: [
              { label: "Opinion", prompt: "Which poem would you share? Why? (because ...)" },
              { label: "Reason 1: the words", prompt: "What does the poet do? (short lines, rhyme, rhythm)" },
              { label: "Reason 2: the picture", prompt: "What can you see in your mind? How does it feel?" },
              { label: "Closing: so ...", prompt: "What do other people think or feel?" },
            ],
            frames: ["I want to share ___ because it ___.", "The poet uses ___, and ___.", "I can see ___ in my mind.", "This poem makes me ___, so ___."],
            checklist: [
              "My first sentence says which poem and gives a reason with because",
              "-s on the poet uses / it paints / it makes (one poet, one poem)",
              "-s on lines and words (more than one)",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. An opinion paragraph gives children a reason to use because and so, and the poem words from this lesson. Mark only two targets (the -s on he / she / it verbs and plural -s) with a dot on the line; the child finds and fixes the mistake. The paragraph is also the script for this lesson's recorded talk, My poem picture talk: they read it, then tell it again without looking.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["I want to share ___ because it ___.", "This poem makes me ___, so ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add one more reason with also: 'Also, the poem is short and easy to remember.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My poem picture talk",
        prompt: "Choose a poem, a song or a rhyme you know. Tell us what it is about and what picture you see in your mind. Say two lines from it if you can.",
        length: "60-90 seconds",
        steps: [
          "Choose your poem, song or rhyme and read it once.",
          "Practise your talk three times with a family member or a toy: each time a little faster and smoother, like 4-3-2 in class.",
          "Use the chunks: It is about ___. I can see ___ in my mind. The poet is saying that ___.",
          "Record it once. Look at the camera and keep going without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what your poem is about and what you see in your mind, and keep going without long stops.",
        words: ["poem", "poet", "rhyme", "rhythm", "lines", "picture"],
        grammar: ["It is about ___.", "The poet is saying that ___.", "I can see ___ in my mind."],
        rubric: [
          { label: "What it is about", description: "Says what the poem is about and what picture it paints.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Poem words", description: "Uses words from the unit: poem, poet, rhyme, rhythm, lines.", weight: 2 },
          { label: "Verb -s and plurals", description: "Says 'The poet says' and 'the lines' with the final -s clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My poem is called ___.", "It is about ___.", "I like it because ___."], tips: ["Look at your notes between sentences, then look up and speak."] },
          { level: "Core", who: "Most children", frames: ["My poem is called ___. It is about ___.", "I can see ___ in my mind.", "The poet is saying that ___."], tips: ["Say your best line from the poem with rhythm."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The theme is that ___.", "For example, the poem says ___.", "I would share this poem because ___."], tips: ["Give a reason and an example from the poem."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u05-l3": {
      objectives: ["I can ask and answer 'What were you doing at ___?' quickly, and join two ideas in one sentence."],
      trim: {
        "Freeze frame!": 4,
        "Alibi game: who ate the raisins?": 6,
        "Our big idea": 4,
        "My favorite poem (SB 52 Think)": 5,
        "How does 'Colour' help you be creative? (SB 52 B)": 7,
      },
      add: [
        {
          after: "What were you doing this morning? (SB 53 G)",
          slide: {
            kind: "fluency",
            title: "Question chain: What were you doing?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no long stops.",
            chunks: [
              "What were you doing at seven o'clock?",
              "I was eating breakfast.",
              "Were you sleeping? No, I wasn't.",
              "Yes, I was.",
              "I wasn't sleeping. I was reading a poem.",
            ],
            recycle: ["When it rains, we stay inside.", "A cricket sings at night."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a time card and an action card." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your cards so only you can see them: a time and an action.",
              "Ask the friend on your left: 'What were you doing at ___?'",
              "They answer with their cards: 'I was ___ing.' Then they turn and ask the next friend.",
              "Sometimes ask a yes/no question: 'Were you ___ing?' The answer is 'Yes, I was.' or 'No, I wasn't. I was ___ing.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on. After the last round, fix the two you heard most.",
            ],
            prompts: ["What were you doing at ___?", "Were you ___ing?", "(cards: 7:00 / eat breakfast, 9:00 / read a poem, 12:00 / play football)"],
            feedback: fixPastCont,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which makes 'What were you doing' and 'I was ___ing' automatic. Time the whole circle and tell them: children like beating their own time. Listen for the three slips Vietnamese learners make here: a missing helper (I playing), was/were mix-ups with you, they and we, and a dropped -ing or double letter (runing). Do not correct in the middle of a turn: write what you hear and fix it between rounds.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["What were you doing at ___?", "I was ___ing."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I wasn't sleeping because I was reading a poem.'", frames: ["I wasn't ___ing because ___."] },
            ],
          },
        },
        {
          after: "Fix the sentence",
          slide: {
            kind: "writing",
            title: "Join two moments: and, but, because, while",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences. Which joining word is in brackets?",
              "Say your combined sentence aloud first. Then write it.",
              "Check: was or were? Does the verb end in -ing?",
            ],
            items: [
              { q: "My sister was reading. My brother was drawing. (and)", answer: "My sister was reading, and my brother was drawing." },
              { q: "I was eating lunch. I wasn't watching TV. (but)", answer: "I was eating lunch, but I wasn't watching TV." },
              { q: "The crickets were singing. It was dark. (because)", answer: "The crickets were singing because it was dark." },
              { q: "I was painting. My mother was cooking. (while)", answer: "I was painting while my mother was cooking." },
            ],
            frames: ["___ was ___ing, and ___ was ___ing.", "___ was ___ing while ___ was ___ing."],
            checklist: ["was with I, he, she, it; were with you, we, they", "The -ing on the verb", "A comma before 'and' or 'but' when the second part has its own subject"],
            sayIt: "Read your sentences aloud, then say each one again without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not through rules, and is a well-supported routine in writing-instruction research. Do item 1 aloud first, crossing out the repeated words on the board. Mention the comma before 'and' and 'but' lightly and do not drill it.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two sentences of your own about what you and your family were doing at six o'clock, joined with 'while'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u05-l4": {
      objectives: ["I can describe a creature with size, color and a clear picture, and fix describing-word mistakes in writing."],
      trim: {
        "A silly question: what color is the house? (SB 54 C)": 3,
        "Build a creature": 4,
        "Big Question Review (SB 55)": 4,
        "Words that end in -le (SB 55 E)": 6,
      },
      add: [
        {
          after: "Build a creature",
          slide: {
            kind: "fluency",
            title: "Creature description: say it again, faster",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Describe the same creature to two different partners. In each round both partners describe: 90 seconds, then 60 seconds each. The second time is smoother and faster.",
            chunks: [
              "It's a tiny green grasshopper.",
              "It has two huge black eyes.",
              "There's a small red ladybug on the leaf.",
              "An enormous blue butterfly was flying over the thicket.",
              "It isn't a big brown beetle.",
            ],
            recycle: ["If a place has a park, families come.", "I was reading a poem at six o'clock."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A describes the secret creature while Partner B draws it without looking at the picture. Then Partner B describes and Partner A draws. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same description in less time, then Partner B. Fast and clear! Then compare the drawing with the picture." },
            ],
            steps: [
              "Look at your creature card. Plan your description with the chunks: size, color, noun, what it was doing.",
              "Describe it. The listener draws and says 'Can you say that again?' if they cannot hear the size or color. Then swap: Partner B describes and Partner A draws.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Change partners at the bell. Both partners describe the same creature again, faster and smoother.",
            ],
            prompts: ["(card: a tiny green grasshopper)", "(card: two huge black beetles)", "(card: an enormous blue butterfly)", "(card: a small red ladybug)"],
            feedback: fixDescribe,
            teacherNote: "Task repetition (Bygate): the same job, new listener, less time. The second and third tellings are smoother because the child is not searching for words, so attention is free for size before color and a/an. Do not change the picture between rounds. The drawing gives the listener a real job and a reason to speak clearly. Listen for the -s slip on describing words (two greens beetles) and for a orange.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames on the board.", frames: ["It's a ___ ___ ___.", "It has ___."] },
              { level: "Core", task: "Describe the creature in four or five sentences without the board." },
              { level: "Stretch", task: "Add what it was doing, using was or were + -ing, and your opinion word: 'A beautiful little red ladybug was walking on my book.'", frames: ["A ___ ___ ___ was ___ing on ___."] },
            ],
          },
        },
        {
          after: "Number the adjectives (SB 55 F)",
          slide: {
            kind: "writing",
            title: "Fix the creature sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each phrase with your partner. Something is wrong!",
              "Find it: order (size before color), a or an, or an extra -s on a describing word.",
              "Write it the right way. Read it aloud together.",
            ],
            items: [
              { q: "a green big grasshopper", answer: "a big green grasshopper" },
              { q: "two greens beetles", answer: "two green beetles" },
              { q: "a orange butterfly", answer: "an orange butterfly" },
              { q: "a black tiny cricket", answer: "a tiny black cricket" },
              { q: "a red small bee", answer: "a small red bee" },
            ],
            checklist: ["Size comes before color", "a before a consonant sound; an before a vowel sound", "No -s on describing words (green beetles, not greens beetles)"],
            sayIt: "Read your fixed phrases aloud to your partner, then say them again without looking.",
            teacherNote: "These fix-it phrases use typical errors of Vietnamese learners. In Vietnamese, describing words usually come after the noun and do not take a plural -s, so both the order slip and the extra -s are very likely. Fix item 1 together aloud. Focus on only these three error types; do not add others today.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the size-color-noun frame on the board." },
              { level: "Core", task: "Fix all five." },
              { level: "Stretch", task: "Write two more phrases with a mistake for your partner to fix, then write your own creature sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u05-l5": {
      objectives: ["I can retell a busy day with was and were, and write a snapshot after a plan."],
      trim: {
        "Snapshot statues": 5,
        "Remember it!": 4,
        "Does the rule work here too?": 4,
      },
      add: [
        {
          after: "Beetle Bo's busy Saturday",
          slide: {
            kind: "fluency",
            title: "Bo's day: retell it three times",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell Bo's day three times. In each round both partners tell it: one minute, then 45 seconds, then 30 seconds each. Each retelling is shorter, smoother and faster.",
            chunks: [
              "At six o'clock, Bo was sleeping under a leaf.",
              "At eight, Bo was eating a tiny raisin.",
              "At ten, Bo wasn't sleeping. It was climbing a tall stalk.",
              "At two, the ants were carrying a crumb.",
            ],
            recycle: ["When it rains, we stay inside.", "A tiny green grasshopper was leaping."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the whole day with the four timeline cards, then Partner B tells it. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells it again in less time, without the frames, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Partner A, then Partner B. Tell it fast and smooth. The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Put the day cards in order: six, eight, ten, two. Use the cards from Bo's busy Saturday.",
              "Partner A tells the day with was or were, then Partner B does. The listener ticks each sentence they hear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "At the bell, find a new partner. Both partners tell the same day again, a little faster.",
            ],
            prompts: ["(card: 6:00)", "(card: 8:00)", "(card: 10:00)", "(card: 2:00)"],
            feedback: fixRetell,
            teacherNote: "Retelling is the same story three times on purpose: by the second and third telling the child is not searching for words, so the sentences come faster and the was/were choice becomes automatic. Keep the timeline cards on the board for Support children. The four times and actions come from Bo's busy Saturday cards (6:00, 8:00, 10:00 and 2:00); if your cards differ, swap in the actions on your cards, because the grammar stays the same. Listen for was/were with Bo and the ants, and for 'weren't' and 'wasn't'.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["At ___, Bo was ___ing.", "At ___, the ants were ___ing."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a reason to each part: 'Bo wasn't sleeping because it was hungry.'", frames: ["Bo wasn't ___ing because ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Plan, write, check: a snapshot",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the first sentence (time and place), the middle sentences (who was doing what) and the last sentence (how it felt).",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph about your garden moment. Use 'and', 'but', 'because' or 'so' at least once.",
              "Check: tick the checklist. Swap with a partner: they underline one was and one were and tell you one thing they liked.",
              "Teacher: while they write, look only at was / were and the -ing ending. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The garden at eight o'clock",
              text: "At eight o'clock on Sunday, the garden was very quiet. A tiny green grasshopper was sitting on a leaf. A little brown cricket was singing in the grass. Two black beetles were walking under the thicket. The bees weren't flying because it was cold. I wasn't sleeping, either. I was watching the garden, so I felt calm.",
            },
            organiser: [
              { label: "Time and place", prompt: "What time was it? Where were you? How was the place?" },
              { label: "Who was doing what", prompt: "Which animals or people were there? What were they doing? (was / were + -ing)" },
              { label: "Not doing, and why", prompt: "What wasn't or weren't happening? Why? (because)" },
              { label: "Closing: how it felt", prompt: "What were you doing? How did you feel? (so)" },
            ],
            frames: ["At ___ o'clock, the garden was very ___.", "A ___ ___ was ___ing on a ___.", "Two ___ were ___ing in the ___.", "The ___ weren't ___ing because ___.", "I was ___ing, so I felt ___."],
            checklist: ["My first sentence says the time and the place", "was with one, were with two or more", "The -ing on the verb", "Size before color if I use two describing words", "My last sentence says how it felt"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (was / were and the -ing ending) with a dot on the line; the child finds and fixes the mistake. The model is the school's own, about 55 words: a first sentence, supporting sentences with linking words, and a closing sentence. The paragraph is also useful as notes for this lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["At ___ o'clock, the garden was very ___.", "I was ___ing, so I felt ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences with a linking word." },
              { level: "Stretch", task: "Add a negative and a reason: 'The bees weren't flying because it was cold.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What was I doing yesterday?",
        prompt: "Choose one moment from yesterday, for example seven o'clock, lunchtime or nine at night. Tell us what you and your family were doing. Say what you weren't doing too.",
        length: "60-90 seconds",
        steps: [
          "Choose your moment and look at the clock in your mind. Say who was there and what they were doing.",
          "Practise your talk three times with a family member or a toy: each time a little faster and smoother, like in class.",
          "Use: At ___, I was ___ing. My ___ was ___ing, and we were ___ing. I wasn't ___ing because ___.",
          "Record it once. Look at the camera and keep going without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell what you and your family were doing at one moment yesterday, with was, were, wasn't and weren't.",
        words: ["was", "were", "wasn't", "weren't", "yesterday", "because"],
        grammar: ["At ___, I was ___ing.", "My ___ and I were ___ing.", "I wasn't ___ing because ___."],
        rubric: [
          { label: "Was and were", description: "Uses was/were + -ing correctly: I was, we were, they weren't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Details and reasons", description: "Gives a time, who was there, and a reason with 'because' or 'so'.", weight: 2 },
          { label: "Clear endings", description: "The -ing and the -n't at the end of words can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["At ___ o'clock, I was ___ing.", "My ___ was ___ing."], tips: ["Point to a clock or a picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["At ___, I was ___ing in the ___.", "My ___ and I were ___ing.", "I wasn't ___ing because ___."], tips: ["Say who was with you and one thing you were not doing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["At ___, ___ was ___ing, so I ___.", "I felt ___ because ___."], tips: ["Add a feeling with 'because' and one question for the viewer: 'What were you doing?'"] },
        ],
      },
    },
  },
};
