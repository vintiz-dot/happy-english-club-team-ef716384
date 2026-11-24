import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 3 "Life in the Soil"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 9-10 and preparing
// for the Hanoi grade-6 entrance exam. Every lesson gets one fluency routine (the unit's
// grammar said again and again as whole sentences, with Unit 2's phrases mixed back in)
// and one writing routine (a plan-write-check habit that also practises the exam
// grammar point). Every other lesson ends with a recorded talk for home that repeats the
// class routine. Time comes from the one deck that had room to spare and from small cuts
// in Lesson 7; never from the grammar, the exam practice or the book pages. All text is
// original.

const base =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between the first and second rounds stop for one minute, write two of them on the board and let the class fix them; children then say the same thing again with the fixed form. For grammar, make the child fix it themselves rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice. For a sound, a quick recast is fine: say it right and the child echoes it. Say every final -s, -ed and -t clearly yourself: children copy what they hear. ";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const rhL3U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u3-l1": {
      objectives: ["I can say where things are, fast and without stopping: in, on, next to, among."],
      add: [
        {
          after: "Exam practice: prepositions",
          slide: {
            kind: "fluency",
            title: "Where is it? Place sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole sentence about where things are, fast and smooth, with no stops.",
            chunks: [
              "The seeds are in the soil.",
              "The sprout is above the soil.",
              "The pot is on the windowsill, next to the fish tank.",
              "The lotus grows in the pond, among the reeds.",
              "Where is the plant? It's behind the door.",
            ],
            recycle: [
              "A frog lives in the pond.",
              "If it doesn't rain, the plants will die.",
            ],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture of a garden. Say a whole sentence about each thing the teacher points to." },
              { seconds: 60, say: "Pairs: one points to a thing in the picture, the other says where it is. Swap at the clap." },
              { seconds: 60, say: "New partner, faster! How many place sentences can you say before the bell?" },
            ],
            steps: [
              "Look at the garden picture. Say a WHOLE sentence: 'The seeds are in the soil.'",
              "Listen for the clap: swap jobs.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then play round 2.",
            ],
            prompts: ["(picture: seeds)", "(picture: a sprout)", "(picture: a pot)", "(picture: a lotus)", "(picture: a cat)"],
            feedback:
              base +
              "Here: children often say 'on the soil' for seeds that are under it, 'at Hanoi' or 'on my pocket'. Point to the picture and say 'The seeds are ... ?' and pause, or hold up a finger and ask 'in or on?' Example: child says 'The pot is in the windowsill'; you say 'The pot is ... the windowsill?' and wait.",
            teacherNote:
              "Whole sentences, not single words: 'The seeds are in the soil' should come out as one smooth piece. Saying the same few frames about many different pictures is what makes the place words automatic. Listen for the in / on / at slips and for the final -s on 'seeds' and 'reeds'. Mix in the Unit 2 phrases every few turns so they stay quick.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ is in / on / next to the ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Use two places in one sentence: 'The lotus grows in the pond, among the reeds, opposite the gate.'" },
            ],
          },
        },
        {
          after: "4/3/2: my amazing plant",
          slide: {
            kind: "writing",
            title: "Where is it? Grow the sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the short sentence with your partner.",
              "Make it bigger: add the place words in the brackets.",
              "Write the big sentence. Check the small words with the checklist.",
            ],
            items: [
              { q: "The cactus is on the shelf. (add: next to the clock)", answer: "The cactus is on the shelf next to the clock." },
              { q: "The seeds are in the soil. (add: in a small pot)", answer: "The seeds are in the soil in a small pot." },
              { q: "A frog sits on a leaf. (add: in the middle of the pond)", answer: "A frog sits on a leaf in the middle of the pond." },
              { q: "The lotus grows in the pond. (add: among the reeds)", answer: "The lotus grows in the pond among the reeds." },
            ],
            frames: ["The ___ is in / on / next to the ___.", "___ grows in the ___, among the ___."],
            checklist: [
              "Every place word fits my picture (in, on, next to, among)",
              "A capital letter at the start and a full stop at the end",
              "The -s on plural nouns is there: seeds, reeds, plants",
            ],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote:
              "Expanding a short sentence with a place phrase is the plan-write-check habit in small: first the plan (which place words?), then the writing, then the check. The small words in / on / at are a common slip for Vietnamese learners and a regular exam item, so keep the check on those.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher; copy the big sentence." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two big sentences about your own desk or garden.", frames: ["My ___ is on the ___, next to the ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u3-l2": {
      trim: { "Tell the life cycle, story-style": 9 },
      objectives: ["I can tell the life of a seed in order, using a, an and the, three times, faster each time."],
      add: [
        {
          after: "Exam practice: open cloze (articles)",
          slide: {
            kind: "writing",
            title: "Dictogloss: the sunflower seed",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder (one minute): a before a consonant sound, an before a vowel sound, the for the one we know.",
              "Listen to the text twice. The first time, only listen. The second time, write key words.",
              "With your partner, rebuild the text. Use a, an and the.",
              "Compare with the original on the screen. Circle each article you changed.",
            ],
            text: {
              title: "The sunflower seed",
              text: "A farmer planted a seed in the soil. After an hour of rain, the soil was soft, so the seed began to grow. Soon a small sprout came up, and by summer it was an enormous sunflower. Sunflowers need water and light.",
            },
            frames: ["A ___ planted a ___.", "After an ___, the ___ was ___."],
            checklist: [
              "a before a consonant sound, an before a vowel sound (an hour, an enormous flower)",
              "the for the seed or the soil we already know",
              "No article for plants in general: Sunflowers need water.",
            ],
            sayIt: "Read your text to your partner, then tell the story again from the key words, without looking.",
            teacherNote:
              "Dictogloss works because children must listen to whole sentences and rebuild the grammar themselves, after a short rule reminder. Read at natural speed, with the final sounds clear. Vietnamese has no articles, so a/an/the are the commonest slips; accept any rebuild that is correct English, it need not match word for word.",
            tiers: [
              { level: "Support", task: "Use the first two frames and rebuild the first two sentences." },
              { level: "Core", task: "Rebuild the whole text with your partner." },
              { level: "Stretch", task: "Rebuild it, then add one sentence about what happens next, with a / an / the." },
            ],
          },
        },
        {
          after: "Tell the life cycle, story-style",
          slide: {
            kind: "fluency",
            title: "Life cycle retell: faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the life of a seed three times, to three partners. In each round Partner A tells it, then Partner B. Each round is shorter, smoother and faster.",
            chunks: [
              "A farmer put a seed in the soil.",
              "The rain fell, so the seed drank the water.",
              "A small sprout came up, and the sprout became an enormous sunflower.",
              "In the end, the flower made new seeds, and the cycle began again.",
            ],
            recycle: [
              "There used to be many wolves, but now there are fewer.",
              "If there are no bees, many flowers won't make seeds.",
            ],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole life cycle, then Partner B. Use the four picture cards. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A tells the same story, then Partner B, in less time. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four cards in order: seed, sprout, plant, new seeds.",
              "The listener's job: count how many times you say a, an or the.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on with round 2.",
              "Each round has two turns: Partner A tells the story for 75, 60 or 45 seconds, then Partner B tells it. When both have told it, find a new partner.",
            ],
            prompts: ["(card: a seed in the soil)", "(card: a sprout)", "(card: a sunflower)", "(card: new seeds)"],
            feedback:
              base +
              "Here: listen for a missing article ('Farmer put seed in soil'), 'a hour' and 'an university'. Hold up a finger at the gap and say 'A farmer put ... seed?' and pause; point to the frame for the, 'the sprout we already know'. Example: child says 'The seed drink the water'; you say 'The seed ... the water?' with a finger up for the -ed, then the child repeats.",
            teacherNote:
              "The same story three times on purpose: the second and third tellings free the children from searching for words, so they can speak faster. The one-minute fix between round 1 and 2 is what makes the repeat improve accuracy too, not only speed. Listen for articles and for the final -ed ('planted', 'began' not 'begin').",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["A ___ put a ___ in the ___.", "The ___ came up."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add why: 'The seed began to grow because the soil was warm and wet.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My seed tells its story",
        prompt: "Take a seed from the kitchen (a bean, a pip or a rice grain). Tell its life story in order: what happened to it, and what it became.",
        length: "60-120 seconds",
        steps: [
          "Look at your four life-cycle cards from class, or draw four small pictures.",
          "Say the seed's story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Fix any a / an / the that did not sound right.",
          "Record it once. Watch it back; if you stopped for a long time, record one more time and send the better one.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Tell the seed's life in order, use a, an and the, and keep going without long stops.",
        words: ["seed", "soil", "sprout", "sunlight", "grow", "cycle"],
        grammar: ["a / an / the", "Plants need water and light."],
        rubric: [
          { label: "Life cycle in order", description: "Tells what happens to the seed in the right order, with joining words (first, then, in the end).", weight: 3 },
          { label: "A, an, the", description: "Uses a, an and the in most places they are needed.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: seed, soil, sprout, grow, cycle.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ put a ___ in the ___.", "Then the ___ came up.", "In the end, ___."], tips: ["Point to your cards as you speak."] },
          { level: "Core", who: "Most children", frames: ["Once there was a tiny ___ under the soil.", "The ___ drank the water, so ___.", "In the end, the plant made new ___."], tips: ["Say who or what in every sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["After an hour / a week / a month, ___.", "If the seed had no ___, it would not ___."], tips: ["Add how long it took and what the seed needs."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u3-l3": {
      objectives: ["I can ask and answer 'When ...?' questions quickly, with at, on, in, for and by."],
      add: [
        {
          after: "Exam practice: choose and correct",
          slide: {
            kind: "writing",
            title: "Fix the garden diary",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "A gardener wrote diary lines, but one small word is wrong in each.",
              "Find the wrong word: at, on, in, for or by.",
              "Write the sentence the right way. Say why in your own words.",
            ],
            items: [
              { q: "We plant the seeds in Monday.", answer: "We plant the seeds on Monday." },
              { q: "The first flower opened on May.", answer: "The first flower opened in May." },
              { q: "I waited during three weeks.", answer: "I waited for three weeks." },
              { q: "Please hand in your garden diary until Friday.", answer: "Please hand in your garden diary by Friday." },
            ],
            checklist: [
              "at for clock times, on for days and dates, in for months and seasons",
              "for + how long (for three weeks), by + the last day",
              "Capital letter and full stop in each fixed sentence",
            ],
            sayIt: "Read your fixed sentences to your partner, then say each one again without looking.",
            teacherNote:
              "Fix-it is the exam's error-correction format made small. Two or three error types only: here the time words. Vietnamese has no in / on / at split for time ('vào thứ Hai', 'vào tháng Năm'), so on Monday / in May is learned, not guessed; keep the one-sentence reason short.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the checklist on the board." },
              { level: "Core", task: "Fix all four items and say why." },
              { level: "Stretch", task: "Write two more diary lines with a time mistake for your partner to fix." },
            ],
          },
        },
        {
          after: "When does it happen? Seasons in Vietnam",
          slide: {
            kind: "fluency",
            title: "When? Question chain",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops.",
            chunks: [
              "When do you water the plants? I water them in the morning.",
              "What do you do on Sunday? I work in the garden at ten.",
              "How long did you wait? I waited for two weeks.",
              "When is the harvest? It's in autumn.",
              "We must finish by Friday.",
            ],
            recycle: [
              "I have studied English for three years.",
              "Since last year, my plant has grown a lot.",
            ],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a time card." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card (a time, a day, a month or a number of weeks).",
              "Ask the friend on your left a 'When ...?' question that fits their card.",
              "They answer with the right small word, then turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute: two mistakes on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: 6:30)", "(card: Sunday)", "(card: May)", "(card: three weeks)", "(card: Friday, the last day)"],
            feedback:
              base +
              "Here: in / on / at and for / during. When a child says 'in Monday', point to the card and ask 'in ... Monday?' and pause, or hold up a finger and say 'on?' with rising voice. Example: 'I waited during two weeks'; you say 'I waited ... two weeks?' and wait for 'for'.",
            teacherNote:
              "A chain makes every child ask AND answer many times in a few minutes, which is what makes at / on / in automatic. Time the whole circle and tell the class; children love beating their own time. Use cards that are quick to read so the thinking goes into the small word, not the number.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frame on the board.", frames: ["When do you ___? I ___ at / on / in ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with two time phrases: 'I plant rice in June and harvest it in October, for about four months.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u3-l4": {
      objectives: ["I can say plural nouns correctly and quickly: leaves, tomatoes, children, berries."],
      add: [
        {
          after: "Sound spot: plural endings",
          slide: {
            kind: "writing",
            title: "Write a garden-shop sign",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model sign with the teacher. Underline every plural noun.",
              "Plan: which three plants or foods does your shop sell? How many of each?",
              "Write your own sign with at least five plural nouns.",
              "Check the plural endings with the checklist.",
            ],
            text: {
              title: "Fresh from the garden today!",
              text: "Fresh from the garden today! We have ten boxes of tomatoes, six bunches of herbs and many sweet berries. The leaves of our lettuce are green and crisp. Children can pick two flowers for free. Come before the sun goes down and take home a little bit of the garden.",
            },
            frames: ["We have ___ boxes of ___.", "The ___ of our ___ are ___.", "Children can ___."],
            checklist: [
              "Plural endings: -s, -es (boxes, tomatoes), -ies (berries), -ves (leaves)",
              "Irregular plurals: children, feet, teeth, mice",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your sign to your partner like a shop owner, then say it again without looking.",
            teacherNote:
              "Modelled writing: the children see a good short text, notice its features, then write their own. Vietnamese nouns do not change for number, so the plural ending is a hearing and a spelling habit; three error types only: -s / -es, -ies / -ves, irregular. Read the model aloud with the final sounds clear.",
            tiers: [
              { level: "Support", task: "Copy the model and change the foods and numbers." },
              { level: "Core", task: "Write your own sign with five plural nouns." },
              { level: "Stretch", task: "Add a sentence with an irregular plural: 'Two children and one mouse visited our shop.'" },
            ],
          },
        },
        {
          after: "Generalize: what is so amazing about plants?",
          slide: {
            kind: "fluency",
            title: "Busy garden: tell it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Describe the same garden picture two times, to two partners. In each round Partner A describes it, then Partner B. The second time is smoother and has every plural ending.",
            chunks: [
              "We picked ten tomatoes and five berries.",
              "The leaves fell, and the branches were bare.",
              "The children put the seeds in two boxes.",
              "Two mice and three geese ran across the yard.",
              "Many cities have gardens on their roofs.",
            ],
            recycle: [
              "Seeds need water, light and warm soil.",
              "We plant the seeds on Monday and water them in the morning.",
            ],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A looks at the busy garden picture and tells everything they can see, then Partner B. The listener counts the plural words. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. The same picture and task: Partner A, then Partner B. Fast, smooth and every plural ending clear." },
            ],
            steps: [
              "Look at the picture for ten seconds. Plan three things to say.",
              "Say full sentences with numbers: 'There are four boxes of tomatoes.'",
              "Teacher: after round 1, stop for one minute. Write two plural mistakes on the board (no names), fix them together, then go on.",
              "Each round has two turns: Partner A talks for 75 or 60 seconds, then Partner B. When both have talked, find a new partner. Same picture, same task.",
            ],
            prompts: ["(picture: a busy school garden with boxes, leaves, children, berries, tomatoes)"],
            feedback:
              base +
              "Here: 'leafs', 'childrens', 'two tomato', 'three berry'. Hold up fingers for the count and say 'Three ... ?' with a finger on your lips for the missing ending. Example: child says 'The leafs are red'; you say 'The ... are red?' and wait. For the sound: a quick recast of /z/, /s/ and /ɪz/ (boxes) is fine; children echo it.",
            teacherNote:
              "Task repetition: the same task a second and third time lets children use their attention for accuracy, because planning and word-finding are already done. Keep the picture the same on purpose. Listen for the final -s on every count noun and write your two board examples between round 1 and 2.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and the numbers on the board.", frames: ["There are ___ ___ in the garden.", "The ___ are ___."] },
              { level: "Core", task: "Say five sentences without the board." },
              { level: "Stretch", task: "Add where each plural thing is: 'The boxes of tomatoes are next to the fence.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My market stall of plants",
        prompt: "Pretend you have a market stall. Show or draw what you sell and say how many of each. Describe the leaves, the colors and the smells.",
        length: "60-120 seconds",
        steps: [
          "Draw or collect five things from home or the garden to sell.",
          "Say your stall talk three times to a grown-up or a toy. Each time a little faster, like the busy-garden task.",
          "Check every plural ending: tomatoes, berries, leaves, children.",
          "Record it once. Watch it back; if you stopped for a long time, record one more time and send the better one.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say what you sell and how many, with the right plural endings, and keep going without long stops.",
        words: ["leaves", "tomatoes", "berries", "boxes", "children", "fresh"],
        grammar: ["Plural nouns: -s, -es, -ies, -ves, irregular", "We have ___ boxes of ___."],
        rubric: [
          { label: "What and how many", description: "Names at least four things with numbers.", weight: 2 },
          { label: "Plural endings", description: "Says the plural ending on most nouns: -s, -es, -ies, leaves, children.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Describing words", description: "Adds colors, tastes or smells to the things for sale.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I sell ___ and ___.", "I have ___ boxes of ___."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["We have ___ boxes of ___ and ___ bunches of ___.", "The leaves are ___.", "Children can ___."], tips: ["Say a number before every plural noun."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Come to my stall, because ___.", "Our ___ are the freshest in the market."], tips: ["Add a reason to buy, and use an irregular plural."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u3-l5": {
      trim: { "Desert or rainforest? Odd one out": 9 },
      objectives: ["I can define a person, a thing and a place in one smooth sentence with who, which and where."],
      add: [
        {
          after: "Exam practice: combine with who, which, where",
          slide: {
            kind: "writing",
            title: "Join them: who, which, where",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Decide: person (who), thing (which) or place (where).",
              "Join them in ONE sentence. Say it first, then write it.",
              "Check: no extra 'it', 'she' or 'they' after the joining word.",
            ],
            items: [
              { q: "I have a cactus. It never needs water.", answer: "I have a cactus which never needs water." },
              { q: "A botanist is a scientist. She studies plants.", answer: "A botanist is a scientist who studies plants." },
              { q: "Cà Mau has mangrove forests. Crabs and birds live in them.", answer: "Cà Mau has mangrove forests where crabs and birds live." },
              { q: "My aunt is a farmer. She grows dragon fruit.", answer: "My aunt is a farmer who grows dragon fruit." },
            ],
            frames: ["A ___ is a person who ___.", "A ___ is a thing which ___.", "A ___ is a place where ___."],
            checklist: [
              "who for a person, which for a thing, where for a place",
              "Only one verb after who / which: no extra 'it' or 'she'",
              "Capital letter and full stop in my joined sentence",
            ],
            sayIt: "Say each joined sentence to your partner without looking at the page.",
            teacherNote:
              "Sentence combining has good research support for improving children's sentences, and it is the exam's 'rewrite the sentence' format. Vietnamese says 'một cái cây mà nó leo' so children keep the extra pronoun; point it out, three error types only: who / which, where, and the extra pronoun. Model item 1 aloud, crossing out 'It'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two of your own pairs of short sentences, then join them for a partner to check." },
            ],
          },
        },
        {
          after: "Taboo: define it without the word",
          slide: {
            kind: "fluency",
            title: "Define it 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same mini-talk to three partners. In each round Partner A talks, then Partner B. Each talk is shorter (75, 60, 45 seconds), smoother and still has every word.",
            chunks: [
              "A gardener is a person who looks after plants.",
              "A cactus is a plant which stores water in its stem.",
              "A pond is a place where frogs and fish live.",
              "A bee is an insect that carries pollen from flower to flower.",
            ],
            recycle: [
              "If people cut the trees, the animals will lose their homes.",
              "We plant the seeds in spring and water them every morning.",
            ],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A defines three things: a person, a thing and a place, then Partner B. The listener counts the 'who / which / where'. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A says the same three definitions, then Partner B, in less time. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! Can you still say all three?" },
            ],
            steps: [
              "Choose three things to define: one person, one thing, one place.",
              "Say each in one sentence: 'A ___ is a person who ___.'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In each round Partner A talks, then Partner B. When both have talked, line B moves one step to the left: a new partner.",
            ],
            prompts: ["(a person: farmer, botanist, ranger)", "(a thing: cactus, seed, fern)", "(a place: pond, forest, greenhouse)"],
            feedback:
              base +
              "Here: 'a plant which it climbs', 'a man which grows rice', 'a park where has many trees'. Point to the frame and say 'A plant which ... ?' and pause, with a finger on your lips for the extra 'it'. Example: child says 'a man which grows rice'; you say 'a man ... grows rice?' with rising voice. If who / which / that slips sound strange, a quick recast is fine.",
            teacherNote:
              "Same talk, less time, new listener: Nation's 4/3/2 idea made small for strong ten-year-olds. The new partner keeps the repetition real. Do not add new definitions between rounds; the fluency gain comes from saying the same thing more smoothly. The one-minute fix is what also lifts accuracy. Listen for 'who' with people and for an extra 'it' after 'which'.",
            tiers: [
              { level: "Support", task: "Define two things with the frames on the board.", frames: ["A ___ is a person who ___.", "A ___ is a place where ___."] },
              { level: "Core", task: "Define three things without the board." },
              { level: "Stretch", task: "Add an example: 'A pond is a place where frogs live. For example, the pond in our school.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u3-l6": {
      objectives: ["I can say what is done and who it is done by, fast, with is / are and a past participle."],
      add: [
        {
          after: "Exam practice: active to passive",
          slide: {
            kind: "fluency",
            title: "Passive sprint: what is done?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole passive sentence, fast and smooth, with is or are in the right place.",
            chunks: [
              "Rice is grown in the Mekong Delta.",
              "The school garden is watered every morning.",
              "Hunting is not allowed in the reserve.",
              "Are tigers protected here? Yes, they are.",
              "Paper is made from trees.",
            ],
            recycle: [
              "Since last year, our garden has grown a lot.",
              "When people change one part of nature, other parts change too.",
            ],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card and the class says the whole passive sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner, faster! How many sentences in 60 seconds?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'Rice is grown in the Mekong Delta.'",
              "Use is for one thing and are for more than one.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then play round 2.",
            ],
            prompts: ["(card: rice)", "(card: school garden)", "(card: no hunting sign)", "(card: tigers)", "(card: paper)"],
            feedback:
              base +
              "Here: 'The forest protected', 'Trees is cut down', 'The forest is protect'. Hold up a finger at the gap and say 'The forest ... protected?' with a pause, or point to the frame 'is / are + -ed'. Example: child says 'Coffee grown in Đắk Lắk'; you say 'Coffee ... grown?' with a finger up and wait for 'is'. For the -ed sound in 'protected', a quick recast is fine.",
            teacherNote:
              "The passive in the exam is about the be + participle form, so a sprint of whole sentences makes the pattern automatic. Vietnamese marks passive with 'được / bị', not with a form of be, so is / are is often dropped; listen for it. Mix in the recycled phrases every few turns so the present perfect stays quick.",
            tiers: [
              { level: "Support", task: "Point to the frame and say the sentence with a friend.", frames: ["___ is / are ___ (by ___)."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add who does it: 'The school garden is watered every morning by the students.'" },
            ],
          },
        },
        {
          after: "Guided tour: present the reserve",
          slide: {
            kind: "writing",
            title: "Dictogloss: rules of the garden",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder (one minute): is / are + the past participle: 'Flowers are watered.'",
              "Listen to the text twice. The first time, only listen. The second time, write key words.",
              "With your partner, rebuild the text. Use is / are and the -ed or -en form.",
              "Compare with the original on the screen and circle each passive.",
            ],
            text: {
              title: "Rules of our garden",
              text: "Our school garden is protected by every student. The flowers are watered each morning, and the soil is cleaned on Fridays. Plants are not picked, and trash is not left on the grass. Birds are fed only at the feeder. A garden is a place where everyone can learn, so it is looked after with care.",
            },
            frames: ["The ___ is / are ___ every ___.", "___ are not ___.", "It is looked after by ___."],
            checklist: [
              "is for one, are for more than one",
              "The -ed (or irregular) form after is / are: watered, picked, fed",
              "not goes after is / are in a rule: Plants are not picked.",
            ],
            sayIt: "Read your text to your partner, then say the rules again without looking.",
            teacherNote:
              "Dictogloss after a short rule reminder: children hear whole sentences in the passive and rebuild the grammar themselves. Read at natural speed with the final sounds clear ('watered', 'picked'). Accept any rebuild that is correct English, not only the original wording.",
            tiers: [
              { level: "Support", task: "Rebuild the first three sentences with the frames." },
              { level: "Core", task: "Rebuild the whole text." },
              { level: "Stretch", task: "Rebuild it, then add two more rules for the garden in the passive." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How is my place looked after?",
        prompt: "Choose a place you know: your home garden, a school or a park. Say how it is looked after: what is done, when, and why it matters.",
        length: "60-120 seconds",
        steps: [
          "Choose your place and plan four things that are done there.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like the passive sprint.",
          "Check every is / are and the -ed ending: is watered, are protected.",
          "Record it once. Watch it back; if you stopped for a long time, record one more time and send the better one.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say what is done in your place, with is / are and the -ed form, and keep going without long stops.",
        words: ["protected", "watered", "allowed", "reserve", "garden", "care"],
        grammar: ["Present passive: is / are + past participle", "This is a place where ___."],
        rubric: [
          { label: "What is done", description: "Says at least four things that are done in the place.", weight: 2 },
          { label: "Passive form", description: "Uses is / are + the past participle correctly in most sentences.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Why it matters", description: "Gives at least one reason with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___ every ___.", "The ___ are ___."], tips: ["Point to each place in your drawing."] },
          { level: "Core", who: "Most children", frames: ["This is a place where ___.", "The ___ is / are ___ because ___.", "___ is not allowed."], tips: ["Say one thing that is NOT allowed."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Many ___ are ___ by ___.", "If we do not ___, the ___ will ___."], tips: ["Say who does it, and what will happen if people stop."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u3-l7": {
      objectives: ["I can ask 'How much?' and 'How many?' and answer with a few, a little and a lot of."],
      trim: { "Read: \"Rosie's Reports\" (blog) and compare": 10, "Plan the article (writing project)": 10, "Draft, then edit like an examiner": 22 },
      add: [
        {
          after: "Exam practice: word formation",
          slide: {
            kind: "fluency",
            title: "How much? How many? Chain",
            routine: "question chain",
            mode: "whole",
            minutes: 5,
            goal: "Ask, answer, turn and ask the next friend. Choose much or many in a second.",
            chunks: [
              "How many seeds do you have? I have a few.",
              "How much water does a cactus need? Not much.",
              "There is a lot of sunlight on the balcony.",
              "We need two pots and some soil.",
              "There isn't much shade, so only a few plants grow.",
            ],
            recycle: [
              "A cactus is a plant which stores water.",
              "The forest is protected by law.",
            ],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a picture card: a thing you can count or a thing you cannot." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'How much ___?' or 'How many ___?' Choose the right one for their card.",
              "They answer with a few / a little / a lot of, then ask the next friend.",
              "Teacher: after round 1, stop for one minute: put two mistakes on the board (no names) and fix them together, then go on.",
            ],
            prompts: ["(card: water)", "(card: seeds)", "(card: sunlight)", "(card: pots)", "(card: rice)"],
            feedback:
              base +
              "Here: 'many sunlight', 'three rices', 'much seeds', 'two informations'. Hold up a finger and ask 'How ... sunlight?' and pause, or point to the board where the two lists are (count / noncount). Example: child says 'How much seeds do you have?'; you say 'How ... seeds?' with rising voice and wait for 'many'.",
            teacherNote:
              "Count versus noncount is mostly a matter of speed, because Vietnamese counts with classifiers (một quả, một cái) and the English count / noncount split is new. A chain makes the 'much / many' choice happen dozens of times in five minutes. Keep two lists on the board (seeds, pots, leaves / water, soil, sunlight, rice) for Support children.",
            tiers: [
              { level: "Support", task: "Ask with the frames and the two lists on the board.", frames: ["How many ___ do you have?", "How much ___ do you need?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer in a full sentence with a reason: 'Not much, because the shade is too thick.'" },
            ],
          },
        },
        {
          after: "Say it before you write it: 60-second article",
          slide: {
            kind: "writing",
            title: "Fix the plant-shop notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each note with your partner. One word is wrong in each.",
              "Find the mistake: much, many, a few, a lot of, or a plural.",
              "Write the note the right way and read it aloud.",
            ],
            items: [
              { q: "We bought three rices at the market.", answer: "We bought three bags of rice." },
              { q: "There are many sunlight in my room.", answer: "There is a lot of sunlight in my room." },
              { q: "She gave me two advices about plants.", answer: "She gave me two pieces of advice about plants." },
              { q: "My little brother lost two tooths.", answer: "My little brother lost two teeth." },
            ],
            checklist: [
              "Noncount nouns (water, rice, sunlight, advice, soil) have no a / an and no -s",
              "many + count, much + noncount, a lot of + both",
              "Irregular plurals: teeth, children, feet",
            ],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote:
              "Count / noncount mistakes are common in Vietnamese learners' writing: 'informations', 'advices', 'rices'. Keep it to three error types. A short fix before the article draft helps the children check these in their own writing, too.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the two lists on the board." },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Write a note about your own room with one count and one noncount mistake for a partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u3-l8": {
      trim: { "Transfer: the Most Amazing Plant award": 13 },
      objectives: ["I can give a short speech: 'the most ... plant because ...', in three tellings, faster each time."],
      add: [
        {
          after: "Exam practice: superlatives and the future",
          slide: {
            kind: "fluency",
            title: "Award speech 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same award speech to three partners. In each round Partner A speaks, then Partner B. Each speech is shorter (75, 60, 45 seconds), smoother and still has every reason.",
            chunks: [
              "Bamboo is the most useful plant because we build houses and make baskets from it.",
              "A redwood is one of the tallest trees in the world.",
              "If we protect the forests, our grandchildren will see them.",
              "We're going to plant a tree at school next week.",
            ],
            recycle: [
              "A gardener is a person who looks after plants.",
              "Rice is grown in the Mekong Delta.",
            ],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the award speech: your plant, why it is the most amazing, and one plan. Then Partner B. The listener counts the reasons. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same speech, then Partner B, in less time. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! Keep every reason." },
            ],
            steps: [
              "Choose your plant. Plan three things: why it is the most ___, what will happen if we protect it, what we're going to do.",
              "Say it as a speech, standing up, with your voice up at the end of each idea.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In each round Partner A speaks, then Partner B. When both have spoken, line B moves one step to the left: a new partner.",
            ],
            prompts: ["(a plant: bamboo, sunflower, lotus, cactus)", "(a reason: useful, tall, fast, beautiful)"],
            feedback:
              base +
              "Here: 'the most tall', 'the goodest', 'We going to plant'. Point to the frame and say 'The ... tallest?' and pause, or hold up a finger at the missing 'am / is / are' in 'going to'. Example: child says 'the most big'; you say 'the ... biggest?' with rising voice and wait. A quick recast is fine for the /t/ at the end of 'protected' and 'tallest'.",
            teacherNote:
              "Same speech, less time, new listener: Nation's 4/3/2 for strong ten-year-olds. This is the end-of-unit transfer: the superlative, will and going to together. The one-minute fix between rounds 1 and 2 is what lifts accuracy. Do not add a new idea between rounds; the gain comes from saying the same speech more smoothly.",
            tiers: [
              { level: "Support", task: "Give two sentences with the frames.", frames: ["___ is the most ___ plant because ___.", "We're going to ___."] },
              { level: "Core", task: "Give three or four sentences without the board." },
              { level: "Stretch", task: "Add a comparison: 'It grows faster than any other plant in my garden.'" },
            ],
          },
        },
        {
          after: "Transfer: the Most Amazing Plant award",
          slide: {
            kind: "writing",
            title: "Write your award note",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the superlative, the 'will' and the 'going to'.",
              "Plan: plant, reason, what will happen if we protect it, what we're going to do.",
              "Write your award note in four or five sentences.",
              "Check it with the checklist, then say it aloud.",
            ],
            text: {
              title: "The Most Amazing Plant award",
              text: "The Most Amazing Plant award goes to the lotus. It is the most beautiful flower in our pond, and its leaves are the cleanest I have ever seen, because water runs off them in little drops. If people protect the ponds, our children will see lotuses for many years. Next week we're going to take photos of every flower.",
            },
            frames: ["The award goes to ___.", "It is the most ___ plant because ___.", "If people ___, ___ will ___.", "We're going to ___."],
            checklist: [
              "-est for short adjectives (tallest), the most + long adjective (the most useful)",
              "will + verb, and 'am / is / are going to' with the be",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your award note to your partner, then say the speech again without looking.",
            teacherNote:
              "Modelled writing: the model shows the plan (plant, reason, prediction, plan). Children who struggle with the long note can write the first two sentences. The 'plan, write, check' routine is a habit that also helps in the exam writing task, so name each step aloud.",
            tiers: [
              { level: "Support", task: "Copy the model and change the plant and the reason." },
              { level: "Core", task: "Write four sentences with the frames." },
              { level: "Stretch", task: "Add a second reason and a sentence with 'than'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My most amazing plant award",
        prompt: "Choose the most amazing plant you know. Give it an award: say why it is the most amazing, what will happen if we protect it, and what you're going to do.",
        length: "60-120 seconds",
        steps: [
          "Choose your plant and plan three things to say.",
          "Say your award speech three times to a grown-up or a toy. Each time a little faster, like the 4-3-2 in class.",
          "Check your superlative: the tallest, the most useful, the best.",
          "Record it once. Watch it back; if you stopped for a long time, record one more time and send the better one.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say why your plant is the most amazing, use will and going to, and keep going without long stops.",
        words: ["amazing", "useful", "protect", "forests", "grandchildren", "award"],
        grammar: ["the most + adjective / adjective + -est", "will / going to"],
        rubric: [
          { label: "Reasons", description: "Gives at least two reasons why the plant is the most amazing.", weight: 2 },
          { label: "Superlatives and future", description: "Uses a correct superlative and 'will' or 'going to' at least once each.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -est, -ed and -s endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ is the most ___ plant.", "We're going to ___."], tips: ["Hold a picture of your plant."] },
          { level: "Core", who: "Most children", frames: ["___ is the most ___ plant because ___.", "If people ___, it will ___.", "We're going to ___."], tips: ["Say a reason after every because."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It grows faster than ___.", "In the future, our grandchildren will ___ if we ___."], tips: ["Compare it with another plant, and say what will happen."] },
        ],
      },
    },
  },
};
