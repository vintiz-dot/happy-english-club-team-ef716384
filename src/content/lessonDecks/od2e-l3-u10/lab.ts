import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 10 "Energy Savers on
// the Move" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences under gentle time pressure, with Unit 9's phrases mixed back in) and one short
// writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a recorded
// talk for home that repeats the class routine. Lesson 5 already has the unit vlog. Time
// comes from games, repeats and warm-ups, never from the book pages, grammar or checks.
// All text is original.

const sayItem = "Read it aloud, then say it again without looking.";

export const odL3U10Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u10-l1": {
      objectives: ["I can say sentences about how we travel, fast and smooth, without long stops."],
      trim: { "Energy detectives": 3, "Stand on the line": 6 },
      add: [
        {
          after: "Think about it (SB 97 Think)",
          slide: {
            kind: "fluency",
            title: "Travel sprint: how do you go?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each whole sentence fast and smooth, with no stops and a clear -s at the end of words like times, cars and buses.",
            chunks: [
              "I use a bicycle about three times a week.",
              "A train can carry more people than a taxi.",
              "We never use a helicopter because it is too expensive.",
              "I take the subway to the museum.",
              "Do you ride the elevator? Yes, I do.",
            ],
            recycle: ["It may rain, so I might take the subway.", "I think wind is the best because it is everywhere."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a picture card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the picture. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them; then go on.",
            ],
            prompts: ["(card: bicycle)", "(card: train)", "(card: helicopter)", "(card: subway)", "(card: elevator)"],
            feedback:
              "Fix grammar by prompting, not telling. If a child says 'three time', say 'three ...?' with a rising voice and hold up a finger for the missing -s. If a child says 'A train carry more people', point to the frame on the board and start 'A train can ...' then pause. For a sound, say it right once (for example 'subway') and let the child echo it. Say the final -s of times, taxis and buses clearly yourself.",
            teacherNote:
              "The same whole sentences, said by many different partners, is how a phrase becomes automatic. Keep every sentence a smooth piece, never single words. Listen for a dropped final -s (times, taxis) and for an -s wrongly added after 'can' ('a train cans').",
            tiers: [
              { level: "Support", task: "Look at the board and say the sentence with a friend.", frames: ["I use a ___ about ___ times a week.", "A ___ can carry more people than a ___."] },
              { level: "Core", task: "Say each sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I never use a taxi because it is expensive.'", frames: ["I never use a ___ because ___."] },
            ],
          },
        },
        {
          after: "Words in context (SB 97 E)",
          slide: {
            kind: "writing",
            title: "How I travel: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Say each sentence quietly before you write it.",
              "Check: tick the checklist. Swap with a partner: they circle one -s word and one because, and tell you one thing they liked.",
              "Teacher: while they write, look only at the plural -s (times, ways, Saturdays) and because. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: How I travel",
              text: "I travel in different ways: by bicycle and by subway. I ride a bicycle to school about four times a week because it is fast and it does not need fuel. On Saturdays, my family takes the subway to the museum, and we never use a taxi because it is too expensive. A train can carry more people than a taxi, so it saves a lot of energy. That is why I like to travel without a car.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "How do you travel? Say it in one sentence." },
              { label: "Detail 1: how often", prompt: "What do you use, and how many times a week? Say why." },
              { label: "Detail 2: a comparison", prompt: "Which way is better than another? (can carry more ... than ...)" },
              { label: "Closing: That is why ...", prompt: "What do you like, and why?" },
            ],
            frames: ["I travel in different ways: by ___ and by ___.", "I use a ___ about ___ times a week because ___.", "A ___ can carry more people than a ___.", "That is why I like ___."],
            checklist: [
              "My first sentence says how I travel",
              "I gave a reason with because",
              "The -s is there: times, ways, Saturdays",
              "Capital letters at the start and full stops at the end",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote:
              "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself, and saying each sentence first helps the written one. Mark only two targets (plural -s and because) with a dot on the line; the child finds and fixes the mistake, which works better than marking everything. The paragraph grows the sentence-level work of the lesson (travel words, reasons) into one connected text.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["I travel in different ways: by ___ and by ___.", "I use a ___ about ___ times a week because ___.", "A ___ can carry more people than a ___.", "That is why I like ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences with because." },
              { level: "Stretch", task: "Add a sentence with never and a reason: 'We never use a helicopter because it is too expensive.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u10-l2": {
      objectives: ["I can tell a new ending for Hector's story three times, faster each time."],
      trim: {
        "Question toss": 3,
        "Culture note: solar panels": 3,
        "Word detectives: mask, button, pedal, blades": 3,
        "Question and answer chart": 8,
        "Act it out: Hector and friends": 10,
      },
      add: [
        {
          after: "A new ending",
          slide: {
            kind: "fluency",
            title: "Hector's new ending: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell your new ending to three partners. In each round, Partner A tells it, then Partner B tells it. Each round is shorter, so you get smoother and faster.",
            chunks: [
              "In my ending, Hector uses the sun's energy.",
              "First, he saves a little energy at school.",
              "Then he tells his friends how to do it.",
              "In the end, everybody feels proud because the town uses less energy.",
            ],
            recycle: ["The sun gives us a lot of energy.", "Wind might help us make power."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the new ending, then Partner B tells theirs. Use your story notes. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same ending again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Fast and smooth! Partner A, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at your three story notes: first, then, in the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on with round 2.",
              "In every round, Partner A tells the ending and Partner B listens. Then they swap: Partner B tells and Partner A listens.",
              "When the bell rings, find a new partner.",
              "The listener has a job: count how many of the four chunks you used.",
            ],
            prompts: ["(note: first)", "(note: then)", "(note: in the end)"],
            feedback:
              "Correct between the first and second telling, not during it. For a grammar slip such as 'Hector use' or 'he save', start the phrase and pause ('Hector ...?'), or hold up a finger for the missing -s on the verb. For 'everybody feel', repeat the error with a rising voice. For a sound, say it right and let the child echo it. Say every final -s yourself (uses, saves, tells).",
            teacherNote:
              "Retelling the same story to new listeners is a well-tested way to build fluency, and the one-minute fix between tellings is what also builds accuracy: children who fix two mistakes then say the better version twice more. Listen for dropped -s on verbs (he uses, he saves) and for a missing 'the' or 'a'. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Tell the ending with the three frames and your picture notes.", frames: ["First, ___.", "Then ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add why and a feeling: 'Everybody felt proud because ...'", frames: ["Everybody felt ___ because ___."] },
            ],
          },
        },
        {
          after: "Why does Hector do that?",
          slide: {
            kind: "writing",
            title: "My new ending for Hector: plan, write, check",
            routine: "paragraph",
            genre: "story",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the beginning, the middle and the ending, and the quote at the end.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of your own new ending for Hector.",
              "Write: turn your notes into one paragraph. Use First, Then and In the end.",
              "Check: tick the checklist. Swap with a partner: they underline one a few or a little and one verb with -s, and tell you one thing they liked.",
              "Teacher: while they write, look only at the -s on verbs (he sees, he puts, he asks) and at a few / a little / a lot of. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A new ending",
              text: "In my new ending, Hector wants to save energy at school. First, he sees that the classroom has a lot of lights on, so he asks his friends to switch off a few of them. Then he puts a solar panel on the roof. The panel gives the school a lot of energy from the sun. In the end, everybody feels proud because the school uses less energy. Hector smiles and says, \"A little energy saved today helps everyone tomorrow!\"",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What does Hector want to do in your ending?" },
              { label: "Detail 1: First, ...", prompt: "What does he see or do first? Who helps him?" },
              { label: "Detail 2: Then, ...", prompt: "What does he do next? How much energy does it save? (a lot of / a few / a little)" },
              { label: "Closing: In the end, ...", prompt: "How does everybody feel, and why? What does Hector say?" },
            ],
            frames: ["In my new ending, Hector wants to ___.", "First, he ___, so ___.", "Then he ___.", "In the end, everybody feels ___ because ___."],
            checklist: [
              "My first sentence says what Hector wants to do",
              "First, Then and In the end are in the right places",
              "Verbs about Hector have -s: he sees, he puts, he asks",
              "a lot of, a few or a little is used with the right noun",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your ending again without looking: this is your script for the recorded talk.",
            teacherNote:
              "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (the -s on he/she/it verbs and a few / a little / a lot of) with a dot on the line; the child finds and fixes the mistake. The paragraph is also the script for this lesson's recorded talk and for the retell and the new ending the children tell aloud, so the written version feeds the spoken one.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["In my new ending, Hector wants to ___.", "In the end, everybody feels ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a quote from Hector with a few / a little / a lot of, and a sentence with because." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My new ending for Hector",
        prompt: "Tell a new ending for Hector's story. Show a picture if you like. Say what Hector does, who helps him and how everybody feels in the end.",
        length: "60-120 seconds",
        steps: [
          "Look at your story notes from class: first, then, in the end.",
          "Tell your ending three times to a grown-up, a toy or the mirror. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the whole new ending in order, use story words, and keep talking without long stops.",
        words: ["energy", "pedal", "solar panel", "save", "proud", "everybody"],
        grammar: ["First, ... Then, ... In the end, ...", "Everybody felt ___ because ___.", "a few / a little / a lot of"],
        rubric: [
          { label: "Three parts", description: "Tells a beginning, a middle and an ending in order.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, even after a small mistake.", weight: 3 },
          { label: "Story and energy words", description: "Uses words from the unit, such as energy, pedal, save and solar panel.", weight: 2 },
          { label: "Verbs with -s", description: "Says the -s for he/she/it (Hector uses, he saves, he tells) so it can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, Hector ___.", "Then ___.", "In the end, ___."], tips: ["Point to your picture notes as you speak."] },
          { level: "Core", who: "Most children", frames: ["In my ending, Hector uses ___.", "First, he ___. Then he ___.", "In the end, everybody feels ___."], tips: ["Say what Hector does and why."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Everybody felt ___ because ___.", "Hector saved a lot of ___ and a little ___."], tips: ["Explain why the ending is good and use a few / a little / a lot of."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u10-l3": {
      objectives: ["I can ask and answer 'How many?' and 'How much?' quickly with a lot of, a few and a little."],
      trim: { "Can you count it?": 3, "Snack shop game": 3, "Our big idea": 3 },
      add: [
        {
          after: "What is in my desk? (SB 101 G)",
          slide: {
            kind: "fluency",
            title: "Question chain: How many? How much?",
            routine: "question chain",
            mode: "groups",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going, with no long stops.",
            chunks: [
              "How many pencils do you have? I have a few pencils.",
              "How much water is there? There is a little water.",
              "I have a lot of books in my bag.",
              "We use lots of energy at school.",
              "There are a few pencils and a little glue.",
            ],
            recycle: ["It may rain tomorrow.", "A train can carry more people than a taxi."],
            rounds: [
              { seconds: 90, say: "Slow chain round the group. Everyone holds an item card." },
              { seconds: 60, say: "Swap cards with the next group. Faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Hold your card so only you can see it: a count thing (pencils) or a noncount thing (water).",
              "Ask the friend on your left: 'How many ___ do you have?' or 'How much ___ is there?'",
              "They answer with a lot of, a few or a little. Then they turn and ask the next friend.",
              "The listener has a job: tick if 'many' is with a count thing and 'much' is with a noncount thing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: pencils)", "(card: water)", "(card: books)", "(card: glue)", "(card: energy)"],
            feedback:
              "Prompt, do not tell. For 'a few water', point to the water card and say 'a ...?' and pause, or hold up your hand for 'count it?'. For 'How many energy', repeat the error with a rising voice ('How many energy?') and let the child fix it. For 'There is a few pencils', start 'There ... a few pencils' and pause for 'are'. For a sound, say it right once and let the child echo it. Say the final -s of pencils clearly yourself.",
            teacherNote:
              "The chain makes every child ask and answer many times in a few minutes, and the card tells them which quantifier fits. Time the whole circle and tell them: children enjoy beating their own time. Common slips: 'a lot energy' (missing 'of'), 'a few water', 'How many energy', and a dropped -s on pencils and books.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["How many ___ do you have?", "I have a few ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I have a little glue, so I can fix one poster.'", frames: ["I have a ___ ___, so ___."] },
            ],
          },
        },
        {
          after: "Circle the correct answer (SB 101 F)",
          slide: {
            kind: "writing",
            title: "My desk: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Count your things first.",
              "Write: turn your notes into one paragraph. Use a lot of, a few and a little, and join ideas with and, so or but.",
              "Check: tick the checklist. Swap with a partner: they underline one a few and one a little and tell you one thing they liked.",
              "Teacher: while they write, look only at a few + plural noun, a little + noncount noun, and There is / There are. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My desk",
              text: "My desk is small, but it has everything I need. There are a lot of pencils in the box, and I use them every day. I have a few books on the shelf, so I can read after homework. There is a little glue in the bottle, but I do not need much. I also have lots of paper, and I use it to draw posters about saving energy. I love my desk because it is tidy.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What are you describing? Is it big or small? What does it have?" },
              { label: "Detail 1: a lot of", prompt: "What do you have a lot of? Where is it? What do you use it for?" },
              { label: "Detail 2: a few and a little", prompt: "Something you can count (a few) and something you cannot count (a little)." },
              { label: "Closing: I love ... because ...", prompt: "How do you feel about it, and why?" },
            ],
            frames: ["My ___ is ___, but it has ___.", "There are a lot of ___ in the ___.", "I have a few ___ and a little ___.", "I love my ___ because ___."],
            checklist: [
              "My first sentence says what I describe",
              "a few has a plural noun, a little has a noncount noun",
              "There is / There are matches the noun, and a lot of has of",
              "Capital letters, full stops and -s endings are checked",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote:
              "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Counting the things first makes the choice of a few or a little easy. Mark only two targets (a few / a little with the right noun, and There is / There are) with a dot on the line; the child finds and fixes the mistake. The joining words from the sentence work (and, so, but) now connect a whole paragraph.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["There are a lot of ___ in the ___.", "I have a few ___ and a little ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences with and, so or but." },
              { level: "Stretch", task: "Add a sentence with a reason, for example: 'I have only a little glue, so I use it carefully.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u10-l4": {
      objectives: ["I can talk about saving energy for 75 seconds, then 60 and 45 seconds, with a, an and the in the right places."],
      trim: { "Say it twice": 3, "Find your group of four": 6, "Rehearse your paragraph": 3, "True or false? (SB 102 B)": 4 },
      add: [
        {
          after: "Transportation that saves energy (SB 102 C)",
          slide: {
            kind: "fluency",
            title: "Energy talk 75-60-45: the same talk, new partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three partners. In each round, Partner A talks, then Partner B talks. Each round has less time, so you talk faster and smoother.",
            chunks: [
              "I see a bicycle. The bicycle saves energy.",
              "A bicycle does not need fuel.",
              "The sun gives us a lot of energy.",
              "An electric bus can carry a lot of people.",
              "That is why I think the bicycle is the best way to travel.",
            ],
            recycle: ["The wind might help us make power.", "I use a bicycle about three times a week."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the whole talk, then Partner B. The listener counts how many of the five chunks you use. Then change partners." },
              { seconds: 60, say: "Round 2: the same talk in less time. Partner A talks, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Fast and smooth! Partner A, then Partner B. The listener asks one question at the end." },
            ],
            steps: [
              "Choose one way to travel and plan your talk: first a, an, then the.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing a or the) and fix them together; then go on with round 2.",
              "In every round, Partner A talks and Partner B listens. Then they swap. Both partners give the talk.",
              "When the bell rings, line B moves one seat to the left: a new partner.",
              "The listener has a job: count the chunks and ask one follow-up question, for example 'Why?'",
            ],
            feedback:
              "Correct between the first and second talk. For a missing article ('I see bicycle'), say 'I see ...?' and pause, or hold up a finger for the small word. For 'a energy bar', repeat the error with a rising voice, or say the pair 'an energy' slowly and let the child echo. For 'A sun gives us light', point to the sun picture and say 'There is only one ...?' For sounds, recast quickly. Say the final -s of buses and bicycles clearly yourself.",
            teacherNote:
              "This is the 4/3/2 routine scaled to 75/60/45 seconds for each speaker: same talk, less time, new listener. Saying the same talk again in less time builds fluency, but accuracy does not come on its own, so the one-minute fix between rounds 1 and 2 matters. Do not add new language between rounds. Listen for missing articles, 'a' before a vowel, and a dropped final -s.",
            tiers: [
              { level: "Support", task: "Say three chunks with the frames and your picture.", frames: ["I see a ___. The ___ saves energy.", "The ___ gives us ___."] },
              { level: "Core", task: "Say four or five chunks without the board." },
              { level: "Stretch", task: "Add a comparison: 'A bicycle saves more energy than a car because ...'", frames: ["A ___ saves more energy than a ___ because ___."] },
            ],
          },
        },
        {
          after: "Write a, an or the (SB 103 E)",
          slide: {
            kind: "writing",
            title: "Fix it: a, an and the",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something small is missing or wrong.",
              "Find it and write the sentence the right way.",
              "Check with the checklist. Then read all four aloud together.",
            ],
            items: [
              { q: "I ride bicycle to school.", answer: "I ride a bicycle to school." },
              { q: "She has a energy bar.", answer: "She has an energy bar." },
              { q: "I saw a turbine. A turbine was turning.", answer: "I saw a turbine. The turbine was turning." },
              { q: "A sun gives us light.", answer: "The sun gives us light." },
            ],
            checklist: ["a before a consonant sound, an before a vowel sound", "The first time: a or an. The next time: the", "Only one in the world (the sun): the"],
            sayIt: sayItem,
            teacherNote:
              "Vietnamese has no articles, so a, an and the are common slips for this class. Fix item 1 together first. Pronounce each item clearly so the children hear 'an energy'. Two or three error types at a time is enough: today it is only articles.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the checklist." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two sentences about a turbine or a solar panel with a, an and the, for your partner to check." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The best way to save energy",
        prompt: "Choose one way to travel or one thing at home that saves energy. Show it or draw it. Say what it is, why it saves energy and why you like it.",
        length: "60-120 seconds",
        steps: [
          "Plan your talk with three ideas: what it is, why it saves energy, why you like it.",
          "Say the talk three times to a grown-up or a toy, each time a little faster: 75 seconds, then 60 seconds, then 45 seconds, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what it is, why it saves energy, and use a, an and the; keep talking without long stops.",
        words: ["bicycle", "solar panel", "electric bus", "energy", "fuel", "save"],
        grammar: ["a / an for the first time, the for the next time", "The sun gives us ___.", "a lot of / a few / a little"],
        rubric: [
          { label: "Reasons", description: "Says what it is and gives at least one reason it saves energy.", weight: 3 },
          { label: "a, an and the", description: "Uses a or an the first time and the the next time; says 'the sun'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, even after a small mistake.", weight: 3 },
          { label: "Clear endings", description: "The final -s in words like bicycles and buses can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I see a ___. The ___ saves energy.", "I like it because ___."], tips: ["Hold up your picture and point as you speak."] },
          { level: "Core", who: "Most children", frames: ["A ___ saves energy because ___.", "The ___ does not need ___.", "That is why I like it."], tips: ["Use a or an first, then the."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["A ___ saves more energy than a ___ because ___.", "We use a lot of ___, but only a little ___."], tips: ["Compare two things and use a lot of or a little."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u10-l5": {
      objectives: ["I can give my panel idea three times, smoothly, with clear reasons."],
      trim: {
        "60-second recall": 3,
        "Answer and discuss (SB 104 B)": 6,
        "How to write a speech (SB 104 Learn)": 4,
        "Write it (Workbook)": 13,
        "Speech in groups": 5,
        "Test our big ideas": 3,
      },
      add: [
        {
          after: "Prepare your panel (SB 105 C)",
          slide: {
            kind: "fluency",
            title: "Panel pitch: say it three times",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Say your panel idea three times to three different groups. In each round, one speaker in your pair gives the pitch, then the other. Each time it gets smoother and you look up more.",
            chunks: [
              "Our panel thinks wind is a good source of energy because there is a lot of it.",
              "We have a few ideas: solar panels, wind turbines and bicycles.",
              "Unlike fossil fuels, the wind will not run out.",
              "That is a great question!",
              "Thank you for listening.",
            ],
            recycle: ["It may rain, so the panels might make less power.", "A bicycle does not need fuel, so it saves energy."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the panel idea to Group A, then Partner B gives theirs. The listeners tick each chunk they hear. Then change groups." },
              { seconds: 50, say: "Round 2: Move to Group B. The same idea, with fewer notes. Partner A, then Partner B. Then change groups." },
              { seconds: 40, say: "Round 3: Move to Group C. No notes! Fast and smooth. Partner A, then Partner B." },
            ],
            steps: [
              "Choose one energy idea and plan three sentences: what it is, why it is good, what we need.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In every round, Partner A pitches and then Partner B pitches. Both partners give the idea.",
              "The listeners have a job: tick the chunks, then ask one question starting with How or Why.",
              "Answer the question with 'That is a great question!' and one sentence.",
            ],
            feedback:
              "Between the first and second pitch, give the correction. Prompt grammar slips: for 'There is a lot wind', point to the frame and say 'a lot ...?' and pause for 'of'. For 'wind are good', start 'Wind ...?' and let the child say 'is'. For 'a few idea', hold up a finger for the plural -s. For a sound, say it right once and let the child echo it. Say the final -s of ideas and panels clearly yourself.",
            teacherNote:
              "Task repeat means the same job with a new audience: the second and third pitches are better because the child is no longer searching for words. Listen for noncount nouns with 'is' (wind is, energy is) and for the plural -s on ideas and panels.",
            tiers: [
              { level: "Support", task: "Say three chunks with your notes and the frames.", frames: ["Our panel thinks ___ is a good source of energy because ___.", "Thank you for listening."] },
              { level: "Core", task: "Give the whole pitch with only a few key words." },
              { level: "Stretch", task: "Add one comparison and answer a listener's question: 'Unlike ___, ___ will not ___.'" },
            ],
          },
        },
        {
          after: "Speech in groups",
          slide: {
            kind: "writing",
            title: "Model, then write: my energy idea",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model. Find the idea, two reasons and the closing sentence.",
              "Plan: write the idea and two reasons in a quick organiser.",
              "Write a topic sentence, two or three reasons and a closing sentence about your own energy idea, then check against the checklist.",
            ],
            text: {
              title: "Our school should use the sun",
              text: "Our school should use more solar energy. The sun gives us a lot of energy every day, and the sunlight is free. We have a few panels on the roof, but we need more. That is why I think the sun is the best idea for our school.",
            },
            frames: ["Our school should use ___.", "___ gives us a lot of ___.", "We have a few ___, but we need ___.", "That is why I think ___."],
            checklist: ["My idea, two reasons and a closing sentence are all there", "a lot of, a few and a little are used correctly", "Capital letters, full stops and -s endings are checked"],
            sayIt: "Read your paragraph to a partner, then say your idea again without looking.",
            teacherNote: "This is a short, spoken-first writing step for the busy wrap-up lesson. The model shows the shape: idea, reasons, closing. Say the sentence before writing it, so the spoken form helps the written one.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in your idea." },
              { level: "Core", task: "Write a topic sentence, two or three reasons with linking words (and, so, because) and a closing sentence." },
              { level: "Stretch", task: "Add a sentence that answers 'What might happen if we do not change?' using may or might." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u10-l6": {
      objectives: ["I can say sentences with a lot of, a few and a little fast, without long stops."],
      trim: { "Zone jump: lots, few, little": 8, "Remember it!": 4 },
      add: [
        {
          after: "Two towns, one energy question: ask and fill in",
          slide: {
            kind: "fluency",
            title: "Champion sprint: lots, few, little",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each champion sentence fast and right, with the right word after a lot of, a few and a little.",
            chunks: [
              "There is a lot of wind, so the turbines turn fast.",
              "There are a few batteries in the drawer.",
              "There is a little oil in the lamp.",
              "How many lights are there? There are only a few.",
              "How much energy do we use? We use a lot of energy.",
            ],
            recycle: ["The sun gives us a lot of energy.", "It may rain, so I might take an umbrella."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 60, say: "Pairs: one flashes a card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Champion round: how many sentences without a mistake?" },
            ],
            steps: [
              "Watch the card and say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board and fix them together; then go on.",
            ],
            prompts: ["(card: wind)", "(card: batteries)", "(card: oil)", "(card: lights)", "(card: energy)"],
            feedback:
              "Prompt the self-correction. For 'There is a few batteries', start 'There ... a few batteries' and pause for 'are'. For 'a little batteries', hold up one finger and point to the battery card: 'Can you count it?' For 'How many energy', repeat with a rising voice and let the child fix it. For a sound, say it right once and let the child echo it. Say the final -s of batteries and lights clearly yourself.",
            teacherNote:
              "A quick, high-energy recall of this unit's grammar mixed with Unit 9's may and might (spaced retrieval) keeps both from fading. Keep it fast: whole sentences only. Listen for 'a lot energy', 'a few' with a noncount noun, and a dropped final -s.",
            tiers: [
              { level: "Support", task: "Say the sentences with the frame cards in front of you.", frames: ["There is a lot of ___.", "There are a few ___.", "There is a little ___."] },
              { level: "Core", task: "Say each sentence without the cards." },
              { level: "Stretch", task: "Say the sentence, then add why: 'There is a lot of wind, so ...'" },
            ],
          },
        },
        {
          after: "Zone jump: lots, few, little",
          slide: {
            kind: "writing",
            title: "Fix it: how much, how many",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner and find the mistake.",
              "Write it the right way. Use the checklist.",
              "Read all four fixed sentences aloud together.",
            ],
            items: [
              { q: "We use a lot energy every day.", answer: "We use a lot of energy every day." },
              { q: "There is a few turbines on the hill.", answer: "There are a few turbines on the hill." },
              { q: "I put a few water in the cup.", answer: "I put a little water in the cup." },
              { q: "How many energy do we use?", answer: "How much energy do we use?" },
            ],
            checklist: ["a lot of needs 'of'", "There are a few + plural noun; There is a little + noncount noun", "How many + plural noun; How much + noncount noun"],
            sayIt: sayItem,
            teacherNote: "These four slips are common with this grammar. Fix item 1 together first. Two or three error types at a time is enough, so name them on the board before the children start.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the checklist." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How much? How many? at home",
        prompt: "Walk round your home and find things to count or measure. Say how many or how much you see, and one way to save energy there.",
        length: "60-120 seconds",
        steps: [
          "Choose three places: the kitchen, your room, the hall. Find things to talk about.",
          "Say your talk three times to a grown-up or a toy, each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
        ],
        maxSeconds: 180,
        kidSummary: "Say how many and how much with a lot of, a few and a little, and keep talking without long stops.",
        words: ["energy", "lights", "batteries", "water", "oil", "save"],
        grammar: ["a lot of / a few / a little", "How many ___ are there? How much ___ is there?", "There is ... / There are ..."],
        rubric: [
          { label: "Quantifiers", description: "Uses a lot of, a few and a little correctly: a few with plural nouns, a little with noncount nouns.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, even after a small mistake.", weight: 3 },
          { label: "There is / are", description: "Says 'There is a little ...' and 'There are a few ...' correctly.", weight: 2 },
          { label: "Saving energy", description: "Gives one idea for saving energy at home.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There are a few ___.", "There is a little ___.", "We can save energy."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["There is a lot of ___ here.", "There are a few ___ and a little ___.", "We can save energy by ___."], tips: ["Use one a lot of, one a few and one a little."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["How many ___ are there? There are only a few.", "There is a lot of ___, so ___."], tips: ["Ask a question to your grown-up and give a reason with so."] },
        ],
      },
    },
  },
};
