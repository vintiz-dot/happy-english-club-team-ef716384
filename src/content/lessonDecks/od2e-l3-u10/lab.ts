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
      trim: { "Energy detectives": 5 },
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
            title: "Grow my travel sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: read the small sentence and think of a how, a where or a why.",
              "Write: make it bigger and write your new sentence.",
              "Check: use the checklist, then read it to a partner.",
            ],
            items: [
              { q: "I take the train. (add: to the beach)", answer: "I take the train to the beach." },
              { q: "We use a bicycle. (add: three times a week)", answer: "We use a bicycle three times a week." },
              { q: "A train can carry people. (add: more than a taxi)", answer: "A train can carry more people than a taxi." },
              { q: "I never use a helicopter. (add: because it is expensive)", answer: "I never use a helicopter because it is expensive." },
            ],
            frames: ["I take the ___ to ___.", "We use a ___ ___ times a week."],
            checklist: ["A capital letter at the start and a full stop at the end", "The -s is there: times, taxis, buses", "My sentence says how, where or why"],
            sayIt: sayItem,
            tiers: [
              { level: "Support", task: "Copy the big sentence for item 1 and 2 from the board." },
              { level: "Core", task: "Make all four sentences bigger." },
              { level: "Stretch", task: "Write two of your own and add a reason with 'because'." },
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
      },
      add: [
        {
          after: "A new ending",
          slide: {
            kind: "fluency",
            title: "Hector's new ending: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell your new ending to three partners. Each telling is shorter, smoother and faster.",
            chunks: [
              "In my ending, Hector uses the sun's energy.",
              "First, he saves a little energy at school.",
              "Then he tells his friends how to do it.",
              "In the end, everybody feels proud because the town uses less energy.",
            ],
            recycle: ["The sun gives us a lot of energy.", "Wind might help us make power."],
            rounds: [
              { seconds: 120, say: "Tell your new ending to your partner. Use your story notes." },
              { seconds: 90, say: "New partner. Tell the same ending again in less time." },
              { seconds: 60, say: "New partner. Fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at your three story notes: first, then, in the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on with round 2.",
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
            title: "Dictogloss: a bicycle saves energy",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Notice: a few and a little go with different nouns. Listen for them.",
              "Listen to the short text twice. The first time, just listen. The second time, write key words.",
              "In your group, rebuild the text in your own words with the key words.",
              "Check against the original and fix your own mistakes. Then say your text aloud.",
            ],
            text: {
              title: "A bicycle for Hector",
              text: "Hector rides a bicycle to school every day. A bicycle does not need fuel, so it saves a lot of energy. A few of his friends ride with him, and the road has only a few cars. Hector says, \"A little energy saved today helps everyone tomorrow.\"",
            },
            frames: ["Hector rides ___.", "A bicycle does not need ___, so ___.", "A few of his friends ___."],
            checklist: ["Every sentence has a capital letter and a full stop", "I wrote the -s: rides, saves, cars, friends", "a, an or the is in the right place"],
            sayIt: "Read your group's text aloud together, then say it again without looking.",
            teacherNote:
              "Dictogloss works best after a short reminder of the target grammar, so the children listen for it. Read at a natural speed, twice. Do not stop to explain words. Compare groups' versions on the board and let the children notice the differences.",
            tiers: [
              { level: "Support", task: "Write the key words and use the frames to build two sentences." },
              { level: "Core", task: "Rebuild the whole text in your group." },
              { level: "Stretch", task: "Rebuild it and add one more sentence about why energy matters." },
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
      trim: { "Can you count it?": 4, "Snack shop game": 5, "Our big idea": 6 },
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
            title: "Join them: and, so, but",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read the two short sentences. Which joining word fits?",
              "Say your big sentence first. Then write it.",
              "Check: use the checklist and read it to your partner.",
            ],
            items: [
              { q: "I have a few apples. I have a little juice. (and)", answer: "I have a few apples and a little juice." },
              { q: "We have a lot of sun. We make lots of power. (so)", answer: "We have a lot of sun, so we make lots of power." },
              { q: "There is only a little water. We can share it. (but)", answer: "There is only a little water, but we can share it." },
              { q: "We turn off the lights. We save a lot of energy. (so)", answer: "We turn off the lights, so we save a lot of energy." },
            ],
            checklist: ["a few has a plural noun, a little has a noncount noun", "'a lot of' has 'of'", "A comma before so and but, and a full stop at the end"],
            sayIt: sayItem,
            teacherNote:
              "Sentence combining teaches joining words through use, not rules. Do item 1 aloud together first, crossing out the repeated words. A missing 'of' in 'a lot of' and a missing plural -s are the slips to watch for.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write your own pair of sentences about your desk and join them." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u10-l4": {
      objectives: ["I can talk about saving energy for 2 minutes, then 90 and 60 seconds, with a, an and the in the right places."],
      trim: { "Say it twice": 3, "Find your group of four": 6, "Rehearse your paragraph": 5, "True or false? (SB 102 B)": 4 },
      add: [
        {
          after: "Transportation that saves energy (SB 102 C)",
          slide: {
            kind: "fluency",
            title: "Energy talk 4-3-2: the same talk, new partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same talk to three partners. Each time you have less time, so you talk faster and smoother.",
            chunks: [
              "I see a bicycle. The bicycle saves energy.",
              "A bicycle does not need fuel.",
              "The sun gives us a lot of energy.",
              "An electric bus can carry a lot of people.",
              "That is why I think the bicycle is the best way to travel.",
            ],
            recycle: ["The wind might help us make power.", "I use a bicycle about three times a week."],
            rounds: [
              { seconds: 120, say: "Partner 1: give your whole talk. The listener counts how many of the five chunks you use." },
              { seconds: 90, say: "New partner. The same talk, in less time." },
              { seconds: 60, say: "New partner. Fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Choose one way to travel and plan your talk: first a, an, then the.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing a or the) and fix them together; then go on with round 2.",
              "When the bell rings, line B moves one seat to the left: a new partner.",
              "The listener has a job: count the chunks and ask one follow-up question, for example 'Why?'",
            ],
            feedback:
              "Correct between the first and second talk. For a missing article ('I see bicycle'), say 'I see ...?' and pause, or hold up a finger for the small word. For 'a energy bar', repeat the error with a rising voice, or say the pair 'an energy' slowly and let the child echo. For 'A sun gives us light', point to the sun picture and say 'There is only one ...?' For sounds, recast quickly. Say the final -s of buses and bicycles clearly yourself.",
            teacherNote:
              "This is the 4/3/2 routine scaled to 120/90/60 seconds: same talk, less time, new listener. Saying the same talk again in less time builds fluency, but accuracy does not come on its own, so the one-minute fix between rounds 1 and 2 matters. Do not add new language between rounds. Listen for missing articles, 'a' before a vowel, and a dropped final -s.",
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
          "Say the talk three times to a grown-up or a toy, each time a little faster: 2 minutes, then 90 seconds, then 60 seconds, like in class.",
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
            minutes: 6,
            goal: "Say your panel idea three times to three different groups. Each time it gets smoother and you look up more.",
            chunks: [
              "Our panel thinks wind is a good source of energy because there is a lot of it.",
              "We have a few ideas: solar panels, wind turbines and bicycles.",
              "Unlike fossil fuels, the wind will not run out.",
              "That is a great question!",
              "Thank you for listening.",
            ],
            recycle: ["It may rain, so the panels might make less power.", "A bicycle does not need fuel, so it saves energy."],
            rounds: [
              { seconds: 60, say: "Give your panel idea to Group A. The listeners tick each chunk they hear." },
              { seconds: 60, say: "Move to Group B. The same idea, with fewer notes." },
              { seconds: 60, say: "Move to Group C. No notes! Fast and smooth." },
            ],
            steps: [
              "Choose one energy idea and plan three sentences: what it is, why it is good, what we need.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
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
