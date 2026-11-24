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
      trim: { "Explorer or not?": 3, "Weather mime and guess": 3, "Word and meaning cards (SB 168 A)": 6 },
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
            title: "Grow my trip sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add where, when or what it was like.",
              "Plan: say your big sentence out loud first. Write it. Check the list.",
              "Read them to your partner, then say them again without looking.",
            ],
            items: [
              { q: "It is windy. (add: where)", answer: "It is windy on the coast." },
              { q: "I saw a waterfall. (add: when)", answer: "Last summer I saw a waterfall." },
              { q: "We sailed. (add: where)", answer: "We sailed to a small island." },
              { q: "There is fog. (add: where and when)", answer: "There is thick fog on the coast this morning." },
            ],
            frames: ["Last ___ I went to ___.", "It was ___ and ___.", "I saw ___ and ___."],
            checklist: [
              "A capital letter at the start and a full stop at the end",
              "'is' or 'was' is there: 'It is windy' (not 'It windy')",
              "Past words for a trip: went, saw, sailed",
            ],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "Expanding a short sentence is a gentle way to move from speaking to writing: the child already knows the idea, and only adds words. Take the first item together on the board. The missing 'is' / 'was' is the slip to watch for; point to it, do not write it for the child.",
            tiers: [
              { level: "Support", task: "Copy and finish the sentences with the frames, then draw the place.", frames: ["Last ___ I went to ___.", "It was ___."] },
              { level: "Core", task: "Write three big sentences about a trip you took, then add a last sentence that says how you felt." },
              { level: "Stretch", task: "Join two with 'and' or 'but': 'We sailed to an island, but it was foggy.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u17-l2": {
      objectives: ["I can retell a journey in three parts, faster each time, and write what the weather was like."],
      trim: { "Home talk and journals": 3, "Why does weather matter?": 3, "Weather chart: Date and Weather": 7, "Our own journal entries": 9 },
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
            title: "Dictogloss: a day at sea",
            routine: "dictogloss",
            mode: "groups",
            minutes: 7,
            steps: [
              "Rule reminder: a day in the past uses -ed or was / were. Time words begin sentences: In the morning, After lunch, By night.",
              "Listen to the short text. Do not write yet; just listen.",
              "Listen again. Write key words only: sailed, clear, calm, clouds, storm, stars.",
              "In your group, rebuild the text. It does not need the same words, but it must be correct and make sense.",
              "Compare with the real text. Check with the list and fix your group's mistakes.",
            ],
            text: {
              title: "A day at sea",
              text: "Today we sailed along the coast. In the morning, the sky was clear and the sea was calm. After lunch, dark clouds came and the wind got stronger. We stayed inside and played cards while the storm passed. By night, the sky was clear again, and we could see a thousand stars.",
            },
            frames: ["In the morning, ___.", "After lunch, ___.", "By night, ___."],
            checklist: [
              "Past verbs are right: sailed, stayed, played, was, were, came",
              "Every sentence has a capital letter and a full stop",
              "Weather words are spelled right: clouds, storm, wind",
            ],
            sayIt: "Read your group's text aloud, then say it again without looking, one sentence each.",
            teacherNote: "Read the text twice at normal speed, with the final -ed and -s sounds clear. Then fold it. Do not read it a third time; the children must remember meaning and notice forms. Groups compare against the text and talk about differences: this noticing is the point, so do not mark it for them.",
            tiers: [
              { level: "Support", task: "Use the key words and frames on the board; rebuild three sentences.", frames: ["In the morning, the sky was ___.", "After lunch, ___ came."] },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it, then add one more sentence about the evening." },
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
      trim: { "Teacher says: directions game": 3, "The lost visitor": 3, "Our big idea": 3 },
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
            title: "Fix the route sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder: through = inside something; around = on the outside; across = from one side to the other.",
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a route word, a capital letter, a full stop, a comma or an apostrophe.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Walk in the park to the pond.", answer: "Walk through the park to the pond." },
              { q: "Go to across the bridge.", answer: "Go across the bridge." },
              { q: "the boat sailed through the island", answer: "The boat sailed around the island." },
              { q: "First go down the hill then walk along the river", answer: "First, go down the hill. Then walk along the river." },
              { q: "Dont run through the puddle", answer: "Don't run through the puddle!" },
            ],
            checklist: [
              "The route word fits: through, around, across, down",
              "Capital letter at the start, full stop or ! at the end",
              "A comma after First, and an apostrophe in Don't",
            ],
            sayIt: "Read your fixed sentences to the class as if you are giving real directions.",
            teacherNote: "The mistakes here are the ones the unit's grammar warns about, and children often say 'in the park' when they mean 'through the park'. Fix the first sentence together on the board and say why. Aim at two or three error types only: route word, capitals and full stops, comma and apostrophe. Do not correct every other thing in a child's own sentences.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 (the route word).", frames: ["Walk ___ the park."] },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
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
