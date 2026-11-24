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
        "Insect or not an insect?": 4,
        "Discover Poster 3: what can you see?": 3,
        "Insect mime: freeze and guess": 4,
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
            title: "Make the insect sentence bigger",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add the word in brackets in the right place.",
              "Write your big sentence. Read it aloud, then say it again without looking.",
            ],
            items: [
              { q: "A beetle has a shell. (add: hard)", answer: "A beetle has a hard shell." },
              { q: "A cricket sings. (add when: at night)", answer: "A cricket sings at night." },
              { q: "A bee flies. (add where: over the flowers)", answer: "A bee flies over the flowers." },
              { q: "A grasshopper leaps. (add how far: very far)", answer: "A grasshopper leaps very far." },
            ],
            frames: ["A ___ has a ___ ___.", "A ___ ___s at ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "The -s on has, sings, flies, leaps (one insect = he/she/it)"],
            sayIt: "Read your big sentences to your partner, then say them again without looking.",
            teacherNote: "Expanding a bare sentence (who, where, when, how) is a strong, low-pressure writing routine. Do item 1 together aloud first. Vietnamese verbs do not change for he/she/it, so the -s on 'sings' and 'leaps' is the most likely slip: ask the child to touch the last letter of the verb before writing the full stop.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write a mini-paragraph about one insect: what it is, what it has, what it does, and a closing sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u05-l2": {
      objectives: ["I can tell a partner what a poem is about three times, longer and then shorter, and write what I hear."],
      trim: { "Poets' lives": 3, "Meet the poets and predict (SB 50)": 5 },
      add: [
        {
          after: "Read it aloud with rhythm and actions",
          slide: {
            kind: "fluency",
            title: "Poem talk 4-3-2: what is my poem about?",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same poem talk to three partners. Each talk is shorter, but you say the same things.",
            chunks: [
              "Our poem is called 'The Sleepy Beetle'.",
              "It is about a beetle that cannot sleep.",
              "I can see a tiny green beetle in my mind.",
              "The poet is saying that the night is very quiet.",
              "I like it because the lines rhyme.",
            ],
            recycle: ["If a place has a park, families come.", "My favorite place is the park. It has a big lake."],
            rounds: [
              { seconds: 120, say: "Partner 1: give your poem talk. The listener counts how many times you say 'rhyme' or 'picture'." },
              { seconds: 90, say: "Partner 2: the same talk in less time. Keep the best ideas." },
              { seconds: 60, say: "Partner 3: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Choose one poem from today. Plan your talk with the chunks and the frames on the board: name, topic, picture, reason.",
              "Face a partner. Talker speaks, listener listens with a job: count, then ask one follow-up question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on with round 2.",
              "When the bell rings, the listeners move one seat: a new partner for the shorter talk.",
            ],
            prompts: ["What is the poem called?", "What is it about?", "What can you see in your mind?", "Why do you like it?"],
            feedback: fixPoemTalk,
            teacherNote: "This is the 4/3/2 activity (Nation) for 8 to 10-year-olds. The same content, less time and a new listener each round is what builds speed and smoothness; the one-minute fix between rounds is what adds accuracy, because 4-3-2 alone builds fluency but not accuracy. Do not add new ideas between rounds. Listen for 'The poet says' (-s), 'lines' and 'words' (plural -s) and for the final sound in 'rhyme' and 'picture'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames on the board.", frames: ["Our poem is called ___.", "It is about ___.", "I like it because ___."] },
              { level: "Core", task: "Say four or five sentences without the board and keep going for the whole round." },
              { level: "Stretch", task: "Add the theme and a line from the poem as proof: 'The poet is saying that ... For example, the poem says ...'", frames: ["The theme is that ___.", "For example, the poem says ___."] },
            ],
          },
        },
        {
          after: "Topic or theme? (Organize)",
          slide: {
            kind: "writing",
            title: "Poem dictogloss: build it back",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder: he, she, it + verb: add -s (the poet writes). More than one thing: add -s (lines, words).",
              "Listen to the short text. The teacher reads it twice at normal speed. Write only key words the first time.",
              "In your group, share your notes and write the text again, as close as you can. Check against the checklist.",
              "Teacher: show the text and compare. Mark which -s endings the groups caught.",
            ],
            text: {
              title: "A poem paints a picture",
              text: "A poem can paint a picture with words. The poet writes short lines, and the last words of some lines rhyme. When we read the poem aloud, we hear the rhythm. We can see a bright yellow sun and a tiny green frog in our minds. A good poem makes us feel something, too.",
            },
            frames: ["A poem can ___.", "The poet writes ___.", "We can see ___ in our minds."],
            checklist: ["The -s on writes and makes (one poet / one poem)", "The -s on lines and words (more than one)", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your group's text aloud, then say it again without looking, one sentence each.",
            teacherNote: "Dictogloss (Wajnryb) works well for children after a short rule reminder: they notice grammar by rebuilding meaning together. Read at normal speed and do not slow down on the -s endings; the children have to listen for them, which is the point. The text is the school's own; it does not copy the Student Book.",
            tiers: [
              { level: "Support", task: "Write the key words, then complete the sentence frames with your group." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text, then add one more sentence about a poem you know." },
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
            goal: "Describe the same creature to three different partners. Each time is smoother and faster.",
            chunks: [
              "It's a tiny green grasshopper.",
              "It has two huge black eyes.",
              "There's a small red ladybug on the leaf.",
              "An enormous blue butterfly was flying over the thicket.",
              "It isn't a big brown beetle.",
            ],
            recycle: ["If a place has a park, families come.", "I was reading a poem at six o'clock."],
            rounds: [
              { seconds: 90, say: "Partner 1 describes the secret creature; Partner 2 draws it without looking at the picture." },
              { seconds: 75, say: "New partner: the same description in less time. Does the drawing match?" },
              { seconds: 60, say: "New partner again: fast and clear! Then compare with the picture." },
            ],
            steps: [
              "Look at your creature card. Plan your description with the chunks: size, color, noun, what it was doing.",
              "Describe it. The listener draws and says 'Can you say that again?' if they cannot hear the size or color.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Change partners at the bell. Describe the same creature again, faster and smoother.",
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
            goal: "Tell Bo's day three times. Each retelling is shorter, smoother and faster.",
            chunks: [
              "At six o'clock, Bo was sleeping under a leaf.",
              "At eight, Bo was eating a tiny raisin.",
              "At ten, Bo wasn't sleeping. It was climbing a tall stalk.",
              "At two, the ants were carrying a crumb.",
            ],
            recycle: ["When it rains, we stay inside.", "A tiny green grasshopper was leaping."],
            rounds: [
              { seconds: 90, say: "Tell the whole day to your partner with the four timeline cards." },
              { seconds: 75, say: "New partner. Tell it again in less time, without the frames." },
              { seconds: 60, say: "New partner. Tell it fast and smooth. The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Put the day cards in order: six, eight, ten, two. Use the cards from Bo's busy Saturday.",
              "Tell the day with was or were. The listener ticks each sentence they hear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "At the bell, find a new partner. Tell the same day again, a little faster.",
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
            routine: "model, then write",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the first sentence (time and place), the middle sentences (who was doing what) and the last sentence (how it felt).",
              "PLAN: fill a small organiser with four boxes: Time, Who, What they were doing, How it felt.",
              "WRITE a short paragraph of four or five sentences about your garden moment. Use 'and', 'but', 'because' or 'so' at least once.",
              "CHECK your paragraph against the checklist, then read it aloud.",
            ],
            text: {
              title: "The garden at eight o'clock",
              text: "At eight o'clock on Sunday, the garden was very quiet. A tiny green grasshopper was sitting on a leaf. Two black beetles were walking under the thicket. The bees weren't flying because it was cold. I wasn't sleeping, either. I was watching the garden, so I felt calm.",
            },
            frames: ["At ___ o'clock, the garden was very ___.", "A ___ ___ was ___ing on a ___.", "Two ___ were ___ing in the ___.", "I wasn't ___ing. I was ___ing, so I felt ___."],
            checklist: ["My first sentence says the time and the place", "was with one, were with two or more", "The -ing on the verb", "Size before color if I use two describing words", "My last sentence says how it felt"],
            sayIt: "Read your paragraph to a partner, then say them again without looking.",
            teacherNote: "Planning before writing helps children organise their ideas: the four-box organiser takes about one minute. The model is the school's own and about 60 words: a first sentence, supporting sentences with linking words, and a closing sentence. This is a guided first paragraph; the longer snapshot paragraph that follows builds on it.",
            tiers: [
              { level: "Support", task: "Write three sentences with the frames on the board." },
              { level: "Core", task: "Write four or five sentences with the frames and a linking word." },
              { level: "Stretch", task: "Write five or six sentences, with a negative and a reason: 'The bees weren't flying because it was cold.'" },
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
