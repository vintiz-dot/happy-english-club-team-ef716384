import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 17 "Journeys and
// Explorers" (src/lib/lessonDecks/lab.ts puts it into the decks). Class Sky 1, ages 8-10.
// Every lesson gets one fluency routine (chunk sprint, retell, question chain, 4-3-2, task
// repeat) and one writing routine (expand it, dictogloss, fix it, sentence combining, model
// then write), each ending in a spoken step. Lessons 2 and 5 end with a recorded talk for
// home. Time comes from games and repeats, never from the book pages or the grammar.
// Unit 16's phrases are mixed back in. All text is original.

const correctWords =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute and write them on the board; the class fixes them together. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('It ___ windy.'), point to the frame, or hold up a finger for a missing -s or -ed. For a sound, say it right and let the child echo it. Say every final -s clearly yourself (clouds, waterfalls, he walks): children copy what they hear.";

const correctRoute =
  "During a round, do not stop the talk. Listen for the route words: 'Walk in the park' (should be through), 'Go to across the bridge' (should be across), 'through the island' (should be around), and the word order 'Walk the park through'. Between rounds 1 and 2, stop for one minute and put two of these on the board; the class fixes them. Prompt the child to self-correct: point to the route-word card and pause ('Walk ___ the park.'), or repeat the error with a rising voice ('Walk in the park to the pond?') and wait. Do not say the right word first. For a sound, say it right and let the child echo it. Say final -s and -ed clearly yourself (walks, sailed).";

const correctTime =
  "During a round, do not stop the talk. Listen for the past -ed ending (we crossed, we packed), the subject after before / after ('Before arrive at the coast' should be 'Before we arrived'), and the comma when the sentence starts with Before or After. Between rounds 1 and 2, stop for one minute and put two of these on the board; the class fixes them. Prompt the child to self-correct: start the phrase and pause ('After we cross... ?'), hold up a finger for the missing -ed, or repeat the error with a rising voice and wait. For a sound, say it right and let the child echo it. Say every final -ed and -s clearly yourself.";

export const odL3U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u17-l1": {
      objectives: ["I can say sentences about weather and places fast and smoothly, and write a longer sentence about a trip."],
      trim: { "Explorer or not?": 3, "Word and meaning cards (SB 168 A)": 6 },
      drop: ["Weather mime and guess"],
      add: [
        {
          after: "More weather words (SB 169 C)",
          slide: {
            kind: "fluency",
            title: "Weather sprint: say the whole sentence",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no long stops.",
            chunks: [
              "It is windy on the coast.",
              "I can see a big waterfall.",
              "There is fog on the island.",
              "The storm is very loud!",
              "Last summer I went to an island.",
            ],
            recycle: ["I'm curious about plants because they help us.", "We need plants because they give us food."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'It windy' or 'There have fog') and let the class fix them. Then go on.",
            ],
            prompts: ["(card: coast + wind)", "(card: waterfall)", "(card: island + fog)", "(card: storm)", "(card: a summer trip)"],
            feedback: correctWords + " Example for this unit: if a child says 'It windy on the coast', point to the frame and pause: 'It ___ windy.' If they say 'There have fog', hold up one finger and say 'There ...?' and wait.",
            teacherNote: "Whole sentences only: 'It is windy on the coast' as one smooth piece. Vietnamese learners often leave out 'is' ('It windy') and say 'There have' for 'There is'; listen for both. Mix in Unit 16's phrases every few cards so last unit's language stays fast. The first sentence comes back in Lesson 2 as a recycled phrase, so say it again then.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It is ___ on the ___.", "There is ___ on the ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason or a feeling: 'It is windy, so we stay inside.'", frames: ["It is ___, so we ___."] },
            ],
          },
        },
        {
          after: "My long trip (SB 169 F)",
          slide: {
            kind: "writing",
            title: "A place I saw on a trip: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the place, the land, the weather and the feeling.",
              "Plan: fill the boxes with a few words each, not whole sentences. Think: what did you see, and what was the weather?",
              "Write: turn your notes into one paragraph. Start with where the place is. Use is for how it looks now and was for the day you went.",
              "Check: tick the checklist. Swap with a partner: they underline one landform word and tell you one thing they could see.",
              "Teacher: while they write, look only at 'is' and 'was' and the plural -s (hills, waves). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The little island",
              text: "My favorite place is a little island near the coast. It is windy there, and the beaches are long and sandy. Last summer, we sailed to the island with my family. I saw a tall waterfall and a thick forest. It was sunny in the morning, but it was foggy at night. I felt excited because everything was new.",
            },
            organiser: [
              { label: "Place sentence", prompt: "What is the place? Where is it? Say 'My favorite place is ... near ...'" },
              { label: "What it looks like", prompt: "Which land words? Use 'It is ...' or 'The ... are ...'." },
              { label: "The day I went", prompt: "When did you go? What was the weather? Use 'Last ... I ...' and 'It was ...'" },
              { label: "How I felt", prompt: "End with 'I felt ... because ...'" },
            ],
            frames: ["My favorite place is ___ near ___.","It is ___ there, and the ___ are ___.","Last ___, I went to ___. It was ___.","I felt ___ because ___."],
            checklist: [
              "My first sentence says the place and where it is",
              "'is' for now and 'was' for the day I went: 'It was foggy.'",
              "Land and weather words from the unit, and the plural -s: hills, waves",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the earlier expand-a-sentence idea (where, when, what it was like) into a whole paragraph, and it uses the lesson's weather and landform words. Mark only two targets ('is' / 'was' and the plural -s) with a dot on the line; the child finds and fixes the mistake. The model is original and about an imaginary island. The paragraph is a good base for the 'My long trip' talk.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["My favorite place is ___ near ___.","It was ___ and I felt ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with 'but' or 'so': 'It was foggy, so we stayed inside.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u17-l2": {
      objectives: ["I can retell a journey in three parts, faster each time, and write what the weather was like."],
      trim: { "Why does weather matter?": 3, "Weather chart: Date and Weather": 7, "Our own journal entries": 9 },
      drop: ["Home talk and journals"],
      add: [
        {
          after: "Retell the journey",
          slide: {
            kind: "fluency",
            title: "Retell the voyage, shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same journey three times: 75, 60 and 45 seconds each. Each time it is shorter, smoother and faster.",
            chunks: [
              "The journey started on a ship, and it was very long.",
              "In the middle, the weather was bad, but the sailors kept going.",
              "They sailed through a narrow strait and past an island.",
              "At the end, the ship arrived and everyone was tired but proud.",
            ],
            recycle: ["It is windy on the coast.", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the journey, then Partner B. Use the key-word cards: ship, storm, strait, arrive. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Keep going! Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four key-word cards in order: ship, storm, strait, arrive.",
              "Tell the journey with one whole sentence for each card. In each round, Partner A tells it, then Partner B tells it.",
              "When the bell rings, change partners. The listener says 'Wow!' at the end.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'The ship sail' or 'They arrive' for the past) and let the class fix them. Then go on to rounds 2 and 3.",
            ],
            prompts: ["(card: ship)", "(card: storm)", "(card: strait)", "(card: arrive)"],
            feedback: correctWords + " Example for this unit: if a child says 'They sail through the strait' for a past event, say 'They ...?' and hold up a finger for -ed. If a child says 'The weather bad', point to the frame and pause: 'The weather ___ bad.'",
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the child to speak faster because they are not searching for ideas. Change a chunk to match what your class read in the journal; the chunks are a safe outline, not book text. Retelling on its own mostly trains speed; the one-minute fix between rounds 1 and 2 gives the later rounds a chance to be more correct too. Listen for past -ed endings and the 'was' in 'it was very long'.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["The journey started ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'The sailors felt worried because the storm was loud.'", frames: ["The sailors felt ___ because ___."] },
            ],
          },
        },
        {
          after: "Why does weather matter?",
          slide: {
            kind: "writing",
            title: "A day at sea: plan, write, check",
            routine: "paragraph",
            genre: "journal entry",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the three parts of the day and the feeling at the end.",
              "Plan: fill the boxes with a few words each, not whole sentences. Think about a day on a ship: morning, after lunch, night.",
              "Write: turn your notes into one paragraph. Use In the morning, After lunch and By night, and was / were or an -ed verb for the past.",
              "Check: tick the checklist. Swap with a partner: they underline one past verb and tell you the part they liked best.",
              "Teacher: while they write, look only at 'was' / 'were' and the -ed on past verbs. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A day on the Silver Wave",
              text: "Today was a long day at sea. In the morning, the sky was gray and the wind was strong. After lunch, we sailed past a small island, and I saw hundreds of birds. By night, the sea was calm, so we looked at the stars. I felt tired but happy. I hope we arrive soon.",
            },
            organiser: [
              { label: "Opening", prompt: "How was the day? Say 'Today was ...'" },
              { label: "In the morning", prompt: "What was the weather? What did you see?" },
              { label: "After lunch / By night", prompt: "What did you do? Use -ed verbs and a time word." },
              { label: "Closing", prompt: "How did you feel? What do you hope?" },
            ],
            frames: ["Today was a ___ day at sea.","In the morning, the sky was ___.","After lunch, we ___. By night, ___.","I felt ___. I hope ___."],
            checklist: [
              "My first sentence says what kind of day it was",
              "Three parts of the day with In the morning, After lunch and By night",
              "'was' / 'were' and -ed verbs: sailed, looked, stayed",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It replaces the earlier dictogloss; the idea of rebuilding a day in order now happens in the plan boxes, from the weather chart and the story. The model is original, about an imaginary ship. Mark only two targets ('was' / 'were' and the -ed ending) with a dot on the line. The finished paragraph is the script for the lesson's vlog, 'My day on a long journey'.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["In the morning, it was ___.","After lunch, we ___. By night, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with before or after: 'Before the storm came, we stayed inside.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My day on a long journey",
        prompt: "Imagine you are on a long journey by ship. Tell what the weather was like in the morning, after lunch and at night, and what you did. Show a drawing of your day if you can!",
        length: "60-120 seconds",
        steps: [
          "Look at the dictogloss text and your journal entry from class.",
          "Say your day three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. If your child stops for a long time, wait, then ask 'What happened next?'",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the morning, the afternoon and the night, say what the weather was like, and keep talking without long stops.",
        words: ["sailed", "storm", "clouds", "coast", "fog", "windy", "island"],
        grammar: ["It was windy / It was foggy", "We sailed / We stayed / We played", "In the morning / After lunch / By night"],
        rubric: [
          { label: "Three parts", description: "Tells the morning, the afternoon and the night, in order.", weight: 2 },
          { label: "Weather words", description: "Uses weather and place words from the unit: storm, clouds, fog, windy, coast, island.", weight: 2 },
          { label: "Past words", description: "Uses was / were and -ed verbs for the journey: it was foggy, we sailed.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the morning, it was ___.", "After lunch, we ___.", "By night, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the morning, the sky was ___ and the sea was ___.", "After lunch, ___ came, so we ___.", "By night, we could see ___."], tips: ["Say what the weather was like and what you did, every time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I felt ___ because ___.", "Before the storm came, we ___."], tips: ["Add a feeling, a reason, and a before or after sentence."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u17-l3": {
      objectives: ["I can ask for and give directions fast with down, through and around, and write them correctly."],
      trim: { "Teacher says: directions game": 3, "Our big idea": 3 },
      drop: ["The lost visitor"],
      add: [
        {
          after: "Act it out (SB 172 C)",
          slide: {
            kind: "fluency",
            title: "Direction chain: How do I get to ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no long stops!",
            chunks: [
              "How do I get to the library?",
              "Go down the corridor and through the big door.",
              "Then walk around the pond.",
              "Don't run through the puddle!",
              "Thanks! Is it far?",
            ],
            recycle: ["What are you curious about?", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds a place card (library, pond, gym) and answers for it." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Ask the child on your right: 'How do I get to the ___?'",
              "They answer with a route: 'Go ___ the ___ and ___ the ___.' Then they turn and ask the next child.",
              "Use down, through and around in the route. Do not say 'Walk in the park'.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then go on.",
            ],
            prompts: ["(card: library)", "(card: pond)", "(card: gym)", "(card: cafeteria)", "(card: playground)"],
            feedback: correctRoute,
            teacherNote: "Whole sentences only: the route is one smooth piece, 'Go down the corridor and through the big door.' The chain gives every child many turns, but they do not all speak at once, so a quiet child can listen first and still join in. Mix in Unit 16's phrases every few turns. Listen for 'through' versus 'in' and the missing 'the'.",
            tiers: [
              { level: "Support", task: "Say the route with the route-word card in front of you.", frames: ["Go down the ___.", "Go through the ___."] },
              { level: "Core", task: "Say a two-step route alone, without looking at the card." },
              { level: "Stretch", task: "Give a three-step route and a warning: 'Go down the stairs, through the door and around the pond. Don't run!'", frames: ["First, ___. Then ___. Don't ___!"] },
            ],
          },
        },
        {
          after: "How does Juan get to the deck? (SB 173 E)",
          slide: {
            kind: "writing",
            title: "My way to school: plan, write, check",
            routine: "paragraph",
            genre: "route description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Underline the route words with your finger. Find the order words.",
              "Plan: fill the boxes with a few words each, not whole sentences. Draw your way to school or home on a small map first, then write the stops.",
              "Write: turn your notes into one paragraph. Use First, Then, After that and Finally. Use a route word in every step.",
              "Check: tick the checklist. Swap with a partner: they trace your route on your map with a finger. Is it clear?",
              "Teacher: while they write, look only at the route word (through, around, across, along) and the comma after First. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My way to school",
              text: "I walk to school every morning with my brother. First, we go down our street and past the small shop. Then we walk through the park, but we go around the pond because it is wet. After that, we go across the bridge and along the river. Finally, we arrive at the big blue gate. I like my way to school because it is quiet and beautiful.",
            },
            organiser: [
              { label: "Opening", prompt: "How do you go? With who? 'I walk / ride to ... with ...'" },
              { label: "First, ...", prompt: "Where do you go first? Use down, past or along." },
              { label: "Then / After that, ...", prompt: "Use through, around or across. Add a reason with 'because'." },
              { label: "Finally, ... and closing", prompt: "Where do you arrive? What do you think of the way?" },
            ],
            frames: ["I walk to ___ with ___.","First, we go ___ the ___.","Then we walk ___ the ___ because ___.","Finally, we arrive at ___."],
            checklist: [
              "My first sentence says how I go and with who",
              "Steps are in order: First, Then, After that, Finally",
              "Route words fit: down, through, around, across, along, past",
              "A comma after First and After that, and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: draw first, then write; the boxes take words, not sentences. It replaces the earlier fix-it routine, whose route-word traps now appear in the checklist (through = inside, around = outside). The model is original. Mark only two targets (the route word and the comma after First) with a dot on the line. Lesson 5 returns to routes with 'because' and warnings, so keep this paragraph about an everyday way, in the present.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["First, we go ___ the ___.","Finally, we arrive at ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a reason and a warning: 'We go around the pond because it is wet. Don't run!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u17-l4": {
      objectives: ["I can tell about a trip with before and after, three times, smoothly, and join two sentences with before or after."],
      trim: {
        "Guess the date": 3,
        "Congratulations and compliments (SB 175 D)": 9,
        "Say it, then swap it (SB 175 E)": 10,
        "Write about a trip (Workbook)": 10,
        "Big Question video and chart (SB 174-175)": 6,
        "Discover: first or second?": 5,
        "Plan and pitch your exploration": 5,
      },
      add: [
        {
          after: "Circle before or after (SB 175 F)",
          slide: {
            kind: "writing",
            title: "Join it with before or after",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences. Which happened first?",
              "Join them with before or after into one sentence.",
              "Check the comma: Before / After at the START of the sentence needs a comma. In the MIDDLE it does not.",
              "Read your sentence aloud, then say it again without looking.",
            ],
            items: [
              { q: "We packed our bags. We left home. (use: before)", answer: "We packed our bags before we left home." },
              { q: "We crossed the river. We had lunch. (use: After at the start)", answer: "After we crossed the river, we had lunch." },
              { q: "I looked at the map. I asked for help. (use: before)", answer: "I looked at the map before I asked for help." },
              { q: "The sky got dark. We went inside. (use: Before at the start)", answer: "Before the sky got dark, we went inside." },
            ],
            frames: ["___ before ___.", "After ___, ___."],
            checklist: [
              "The past verb ends in -ed (or is a past word: went, saw)",
              "A comma when Before or After starts the sentence",
              "Capital letter and full stop",
            ],
            sayIt: "Read your joined sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining makes children use the target structure to say something they already understand. Do item 1 on the board and ask: 'What if we start with before?' to show both orders. The most common slips are a missing -ed ('We cross the river'), a missing subject after before / after ('Before arrive'), and a missing comma. Keep to those three.",
            tiers: [
              { level: "Support", task: "Join items 1 and 2 with the frames.", frames: ["We ___ before we ___.", "After we ___, we ___."] },
              { level: "Core", task: "Join all four sentences." },
              { level: "Stretch", task: "Write two of your own pairs from your trip and join them." },
            ],
          },
        },
        {
          after: "Write about a trip (Workbook)",
          slide: {
            kind: "fluency",
            title: "4-3-2: my trip with before and after",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Tell about your trip three times: 75, 60 and 45 seconds each. Each time the time is shorter, so you speak smoother and faster.",
            chunks: [
              "Before we left, we packed a map and a big bag.",
              "After we crossed the river, we had lunch.",
              "We saw the waterfall after we walked along the coast.",
              "Before it got dark, we sat around the fire.",
              "After we came home, I wrote in my journal.",
            ],
            recycle: ["We need plants because they give us food.", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells about the trip, then Partner B. Use before and after. The listener does not speak. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same trip again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it a third time, faster and smoother, then Partner B!" },
            ],
            steps: [
              "Plan quickly: draw three small pictures of your trip, in order. Say one before or after sentence for each.",
              "Round 1: Partner A tells the trip, then Partner B. The listener has a job: count how many before / after sentences they hear. Then change partners.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'After we cross the river' or a missing comma) and let the class fix them. Then go on to rounds 2 and 3.",
              "Rounds 2 and 3: Partner A tells it, then Partner B, then change partners. Same trip, less time.",
            ],
            prompts: ["(picture 1: packing)", "(picture 2: the journey)", "(picture 3: the best part)"],
            feedback: correctTime + " Example for this unit: if a child says 'Before we leave, we pack a map' for a past trip, say 'Before we ...?' and hold up a finger for -ed, or repeat 'Before we leave?' with a rising voice.",
            teacherNote: "4-3-2 means the same talk to three partners with less time each round. The repeat makes the words come easily, and the shrinking time makes the child push. The repeat is meant to build fluency; the one-minute correction between rounds 1 and 2 gives the later rounds a chance to be more accurate, so do not skip it. The listener's job (count the before / after sentences, then ask one question) keeps the partner active. Accept short tellings in round 3.",
            tiers: [
              { level: "Support", task: "Point to your three pictures and say one sentence for each.", frames: ["Before we ___, we ___.", "After we ___, we ___."] },
              { level: "Core", task: "Tell about your whole trip with before and after, without looking at the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'After we saw the waterfall, I felt happy because it was beautiful.'", frames: ["After ___, I felt ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u17-l5": {
      objectives: ["I can give a route with route words, again and again, without stopping, and write a clear route."],
      trim: { "Write it: a route note for a new explorer": 10 },
      add: [
        {
          after: "Two maps, one route: ask and answer",
          slide: {
            kind: "fluency",
            title: "Route repeat: plan, tell, tell again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same route two times, 75 and 60 seconds each, with a new partner each time. The second time it is smoother.",
            chunks: [
              "First, go down the hill. Then walk through the forest.",
              "Walk around the lake because it is deep.",
              "We sailed past the lighthouse.",
              "Don't walk across the ice!",
              "Finally, go along the river and you will arrive.",
            ],
            recycle: ["Before we left, we packed a map.", "After we crossed the river, we had lunch."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the route, then Partner B. Use at least three route words. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same route again, smoother, then Partner B. Can you do it without stopping?" },
            ],
            steps: [
              "Planning minute: look at your map card and choose a route with three or four steps. Say it quietly to yourself.",
              "Round 1: Partner A tells the route, then Partner B. The listener draws the route in the air with a finger.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Walk in the lake' or 'We sail past') and let the class fix them. Then go on to round 2.",
              "Round 2: change partners. Partner A tells the same route, then Partner B. Same route, same meaning, smoother words.",
            ],
            prompts: ["(map card: hill, forest, lake)", "(map card: river, lighthouse, beach)", "(map card: ice, bridge, tunnel)"],
            feedback: correctRoute + " Example for this unit: if a child says 'We sail past the lighthouse' for a past trip, say 'We ...?' with a finger for -ed. If a child says 'Walk the lake around', point to the route-word card and ask 'Where does around go?'",
            teacherNote: "Task repetition helps because the child has already worked out WHAT to say, so the repeat leaves more attention for HOW to say it: smoother, more accurate, faster. Keep the map card the same across the two rounds; change only the partner. Use the planning minute to let Support children finish their route. Space this with Lesson 3's Direction chain: the language is the same, but the task is new.",
            tiers: [
              { level: "Support", task: "Say a two-step route with the frames.", frames: ["First, go ___ the ___.", "Then walk ___ the ___."] },
              { level: "Core", task: "Say a three-step route without looking at the frames." },
              { level: "Stretch", task: "Add a reason and a warning: 'Walk around the lake because it is deep. Don't walk across the ice!'", frames: ["Walk ___ the ___ because ___.", "Don't ___!"] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Model route note, then your own",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model route note. Underline the route words with your finger.",
              "What does the note do? Say: it gives steps in order, and it warns about danger.",
              "Plan: choose a start and an end on your map, and three steps in between.",
              "Write your own short route note with the frames. Then check it against the list.",
              "Read it aloud, then say it again without looking.",
            ],
            text: {
              title: "How to get to the lighthouse",
              text: "How to get to the lighthouse. First, go down the hill and through the small forest. Then walk around the lake because the water is deep. Finally, go along the beach and past the cafe. Don't walk across the rocks because they are wet. You will see the lighthouse on your left.",
            },
            frames: ["First, go ___ the ___ and ___ the ___.", "Then walk ___ the ___ because ___.", "Don't ___ because ___."],
            checklist: [
              "Steps are in order: First, Then, Finally",
              "Route words fit: down, through, around, across, along, past",
              "A first sentence that says where the route goes, a comma after First, and a last sentence that says what you will see",
              "A full stop at the end of each sentence",
            ],
            sayIt: "Read your route note to your partner, then say it again without looking, as if you were giving real directions.",
            teacherNote: "A short model helps children see the shape of a text before they write their own, and it feeds the grammar from the lesson into the writing task that follows. Point out the order words and the 'because' reason, then let the children use the same shape. Check that each route word makes sense on the child's own map: 'through' for inside, 'around' for outside. Two or three error types only.",
            tiers: [
              { level: "Support", task: "Write three sentences with the frames, then read them aloud.", frames: ["First, go ___ the ___.", "Then walk ___ the ___.", "Finally, go ___ the ___."] },
              { level: "Core", task: "Write a route note of four or five sentences." },
              { level: "Stretch", task: "Write a route note with a reason and a warning, and a final sentence that says what you will see." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Show me the way",
        prompt: "Draw a small map of your home, school or a place you like. Then tell a friend how to get from one place to another, step by step, with route words. Show your map to the camera!",
        length: "60-120 seconds",
        steps: [
          "Look at your map and the route note from class.",
          "Say your route three times to a grown-up or a toy. Each time a little smoother and faster.",
          "Record it once. Point to your map as you speak.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. If your child stops for a long time, wait, then ask 'What comes next?'",
        ],
        maxSeconds: 180,
        kidSummary: "Give a route with at least three route words, say first, then and finally, and keep talking without long stops.",
        words: ["down", "through", "around", "across", "along", "past", "first", "then", "finally"],
        grammar: ["Go / Walk + route word + the place", "First, ... Then ... Finally, ...", "Don't + go / walk + route word + the place"],
        rubric: [
          { label: "Clear route", description: "Gives the route in order with First, Then and Finally, so a friend could follow it.", weight: 3 },
          { label: "Route words", description: "Uses at least three route words correctly: down, through, around, across, along, past.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final -s and -ed sounds can be heard (walks, sailed).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, go ___ the ___.", "Then walk ___ the ___.", "Finally, ___."], tips: ["Point to the map as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, go ___ the ___ and ___ the ___.", "Then walk ___ the ___ because ___.", "Finally, you arrive at the ___."], tips: ["Use at least three different route words."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Don't go ___ the ___ because ___.", "The route is easy / hard because ___, so you should ___."], tips: ["Add a warning, a reason and your advice."] },
        ],
      },
    },
  },
};
