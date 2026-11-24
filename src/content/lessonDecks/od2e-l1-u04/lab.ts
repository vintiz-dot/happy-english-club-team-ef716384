import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 4 "Let's Make
// Colors!" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's sentences said again and again as
// whole phrases, a little faster each round, with Unit 3's phrases mixed back in) and
// one short writing routine (say it, write it, read it back). Every other lesson ends
// with a recorded talk for home, built on the routine the class just did. Time comes
// from games and repeats, never from the book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixBe =
  "Listen for the missing 'is': children often say 'The seaweed green' or 'It orange'. Do not say it for them: start the phrase and pause ('The seaweed ... ?'), or hold up one finger for the missing word, and let the child add 'is'. Also listen for 'a' before the color ('a purple jellyfish'). For the sounds in 'jellyfish', 'starfish' and 'seaweed', say the word right and let the child echo it once. Between rounds, write two mistakes on the board for the class to fix in one minute.";

const fixMix =
  "Listen for a missing 'and' ('Mix blue yellow'), a missing 'make' ('Red and yellow orange') and a missing 'a' or an extra one ('I want a blue paint'). For grammar, prompt: point to the frame 'Mix ___ and ___.' or '___ and ___ make ___.' and pause at the gap, or raise your eyebrows at the error and let the child try again. For the sound of 'orange' and 'purple', give a quick recast: say the word, the child echoes. Between rounds 1 and 2, fix two mistakes on the board in one minute.";

const fixPlace =
  "Listen for 'The ball under the table' (no 'is'), 'in' and 'on' mixed up (Vietnamese uses one word for both), and 'next the bag' (no 'to'). Prompt, do not tell: act the place with a ball and ask 'In? On?' with a rising voice, or point to the frame 'The ___ is ___ the ___.' and pause at the gap. Say 'on' and 'in' very clearly yourself. In the one-minute fix, put two errors on the board and let the class act and correct them.";

const fixClothes =
  "Listen for the missing 'is' in 'My hat red', for the missing -s in 'sneakers', 'shorts' and 'pants', and for a missing 'a' ('I have hat'). Prompt the child to fix it: hold up a finger for the missing word, or start 'I have a ... ?' and pause. Show the final -s by holding up two fingers for 'sneakers'. For the T-shirt and jacket sounds, a quick recast is fine. Fix two mistakes on the board between rounds, in one minute.";

export const odL1U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u04-l1": {
      objectives: ["I can say 'I see a purple jellyfish.' and 'It's orange.' fast, without stopping."],
      trim: { "Ocean Simon Says": 4, "What's missing?": 5, "Color splash chant": 4 },
      add: [
        {
          after: "Ocean picture talk",
          slide: {
            kind: "fluency",
            title: "Ocean sprint: I see, there's, it's",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole ocean sentence, fast and smooth, with no stops.",
            chunks: [
              "I see a purple jellyfish.",
              "There's an orange starfish.",
              "There's a pink seashell on the sand.",
              "The seaweed is green.",
              "It's a big ocean!",
            ],
            recycle: ["There's a black spider.", "My favorite color is blue."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an ocean card, the class says one whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'I see a purple jellyfish.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: purple jellyfish)", "(card: orange starfish)", "(card: pink seashell on the sand)", "(card: green seaweed)", "(card: big blue ocean)"],
            feedback: fixBe,
            teacherNote: "Whole sentences only, never single words: the aim is to say 'The seaweed is green' as one smooth piece. Mix in Unit 3 cards ('There's a black spider.') every few turns so the old phrases stay fast too. Listen for the missing 'is' and for 'a' before the color word.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I see a ___ ___.", "It's ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Join two: 'I see a purple jellyfish and an orange starfish.'", frames: ["I see a ___ ___ and a ___ ___."] },
            ],
          },
        },
        {
          after: "Finish the sentences (SB 36 C)",
          slide: {
            kind: "writing",
            title: "Grow my ocean sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the color word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see a jellyfish. (add: purple)", answer: "I see a purple jellyfish." },
              { q: "There's a seashell. (add: pink)", answer: "There's a pink seashell." },
              { q: "It's a starfish. (add: big)", answer: "It's a big starfish." },
              { q: "There's a crab on the sand. (add: red)", answer: "There's a red crab on the sand." },
            ],
            frames: ["I see a ___ jellyfish.", "There's a ___ seashell."],
            checklist: ["A capital letter at the start", "A full stop at the end", "The color word is before the thing"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence is a gentle first step for six-year-olds: the sentence is already right and they only add one word. Say aloud that the color comes BEFORE the thing: Vietnamese puts it after.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and color the picture." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u04-l2": {
      objectives: ["I can say how to make a new color, three times, faster each time."],
      add: [
        {
          after: "Paint shop role play",
          slide: {
            kind: "fluency",
            title: "Paint shop 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same paint shop talk to three friends. Each talk is shorter and smoother.",
            chunks: ["Hello! I want blue paint.", "OK! Mix blue and yellow.", "Look! It's green!", "Red and yellow make orange."],
            recycle: ["Do you like green?", "My favorite color is red."],
            rounds: [
              { seconds: 60, say: "Partner 1: be the shopper. Say the paint shop talk. The listener points to the colors." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A is the shopper and talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner, and a new round.",
              "Line A says the same talk three times, shorter each time. Then swap: line B is the shopper.",
            ],
            feedback: fixMix,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. Repetition builds speed, but the one-minute fix in the middle is what builds accuracy.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I want ___ paint.", "Mix ___ and ___."] },
              { level: "Core", task: "Say all four sentences without the board." },
              { level: "Stretch", task: "Add a question: 'Do you like green?' 'Yes, I do!'" },
            ],
          },
        },
        {
          after: "Listen and draw",
          slide: {
            kind: "writing",
            title: "Listen, fold, write: the new color",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Look at the three colors on the board: blue, yellow, green. Say them.",
              "Listen to the teacher read the short text. Do not write yet!",
              "Listen again. Write the words you hear, then compare with your partner.",
              "Open the text and check: capital letters, full stops, color words.",
            ],
            text: { title: "A new color", text: "Mix blue and yellow. Look! The paint is green. Green is a secondary color. I like it!" },
            frames: ["Mix ___ and ___.", "The paint is ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation point at the end", "The color words are there"],
            sayIt: "Read the text with your partner, then say it again without looking.",
            teacherNote: "Dictogloss with a very short text: read it twice at natural speed, folded on screen, children write what they catch and rebuild it in pairs. Teach no new rule first; the words 'mix' and 'secondary color' come from today's reading. Listen for the final sounds in 'mix' and 'paint', and for 'green'.",
            tiers: [
              { level: "Support", task: "Write the color words you hear and draw the paint." },
              { level: "Core", task: "Write as many sentences as you can, then check." },
              { level: "Stretch", task: "Write the whole text, then add one new sentence: 'Red and yellow make orange.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My paint shop talk",
        prompt: "Be the paint shop helper. Show two colors, say 'Mix ___ and ___.' and show the new color. Use paint, crayons or colored paper.",
        length: "30-60 seconds",
        steps: [
          "Choose two colors at home: crayons, paper or paint.",
          "Say your paint shop talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Show the colors to the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say which two colors you mix and what new color you make, and keep talking without long stops.",
        words: ["mix", "paint", "primary colors", "secondary colors", "orange", "green", "purple"],
        grammar: ["Mix ___ and ___.", "___ and ___ make ___.", "It's ___!"],
        rubric: [
          { label: "Two colors", description: "Says which two colors to mix and which new color they make.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Mix sentences", description: "Uses 'Mix ___ and ___.' and '___ and ___ make ___.' correctly.", weight: 2 },
          { label: "Clear sounds", description: "Says 'orange', 'green' and 'purple' clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Mix ___ and ___.", "It's ___!"], tips: ["Hold up each color as you say it."] },
          { level: "Core", who: "Most children", frames: ["Hello! I want ___ paint.", "Mix ___ and ___. Look! It's ___."], tips: ["Do two mixes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ and ___ make ___. ___ and ___ make ___.", "My favorite color is ___ because ___."], tips: ["Do three mixes and say your favorite."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u04-l3": {
      objectives: ["I can say 'The ball is in / on / under / next to the bag.' fast and right."],
      add: [
        {
          after: "Look around the classroom (SB 41 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Where is it?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Where is the ball? It's in the bag.",
              "The red ball is on the desk.",
              "The blue pencil is under the chair.",
              "The cat is next to the tree.",
              "The seashells are on the sand.",
            ],
            recycle: ["There's a yellow bag.", "Is it red? No, it isn't. It's blue."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone has a small toy and hides it in, on, under or next to something." },
              { seconds: 60, say: "Swap toys. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Put your toy somewhere, but do not tell.",
              "Ask the friend on your left: 'Where is the ___?'",
              "They look and answer: 'It's in / on / under / next to the ___.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Where is the ___?", "It's ___ the ___."],
            feedback: fixPlace,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, and the toys make the meaning of in, on, under and next to physical. Time the whole circle and tell the class; children love beating their own time. Watch for 'It's in the desk' (should be on) and prompt with the toy rather than the rule.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and act it with your toy.", frames: ["It's ___ the ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with the color: 'The red ball is under the chair.'" },
            ],
          },
        },
        {
          after: "Hide the bear",
          slide: {
            kind: "writing",
            title: "Fix the where sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing 'is', the wrong place word or a missing 'to'.",
              "Write the sentence the right way. Act it with a toy to check.",
            ],
            items: [
              { q: "The ball under the table.", answer: "The ball is under the table." },
              { q: "The book is in the desk.", answer: "The book is on the desk." },
              { q: "The cat is next the bag.", answer: "The cat is next to the bag." },
              { q: "The shells is on the sand.", answer: "The shells are on the sand." },
            ],
            checklist: ["Is there an 'is' (or 'are')?", "Is the place word right: in, on, under, next to?", "A capital letter and a full stop"],
            sayIt: "Read your fixed sentences aloud, then say them without looking.",
            teacherNote: "These are the slips Vietnamese children often make: no 'is' (Vietnamese needs no be here), one word for in and on, and 'next to' said as one word. Fix the first together and act it with a toy. Item 4 is a bonus: praise it if a child sees 'are', but do not teach the rule today.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 with the frames on the board.", frames: ["The ___ is ___ the ___."] },
              { level: "Core", task: "Fix sentences 1 to 3." },
              { level: "Stretch", task: "Fix all four, then write a new where sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u04-l4": {
      objectives: ["I can talk about my favorite clothes and colors three times, faster each time."],
      trim: { "Get dressed chant": 4, "Pass the bag": 6 },
      add: [
        {
          after: "My favorite clothes talk",
          slide: {
            kind: "fluency",
            title: "Clothes talk again: new partner each time",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same clothes talk with three partners. It gets smoother every time!",
            chunks: [
              "My favorite hat is blue.",
              "I like my red jacket.",
              "I have white sneakers.",
              "My pants are black.",
              "What's your favorite T-shirt?",
            ],
            recycle: ["Mix red and yellow. It's orange!", "The red ball is on the desk."],
            rounds: [
              { seconds: 45, say: "Partner 1: tell your clothes talk. The listener points to the clothes." },
              { seconds: 45, say: "Partner 2: the same talk, a little faster." },
              { seconds: 35, say: "Partner 3: the same talk again, smooth and clear!" },
            ],
            steps: [
              "Look at your own clothes. Pick two things and say their color.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when you hear the bell.",
              "The listener has a job: say one thing you heard the speaker say.",
            ],
            feedback: fixClothes,
            teacherNote: "Task repetition: the same task with a new listener each time builds speed because the meaning is already known. Bring one Unit 3 and one Unit 4 phrase back in the middle so the spacing works. Say 'sneakers' and 'pants' with a clear final -s yourself.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and point to your clothes.", frames: ["My favorite ___ is ___.", "I have a ___ ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Ask your partner a question and answer: 'What's your favorite hat?' 'My favorite hat is green.'" },
            ],
          },
        },
        {
          after: "Capital letters and periods (SB 43 F)",
          slide: {
            kind: "writing",
            title: "Join my clothes with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner. Check the capital letter and the full stop.",
            ],
            items: [
              { q: "I have a red hat. I have a blue jacket. (and)", answer: "I have a red hat and a blue jacket." },
              { q: "I like my jacket. I like my sneakers. (and)", answer: "I like my jacket and my sneakers." },
              { q: "My hat is red. My hat is big. (and)", answer: "My hat is red and big." },
              { q: "My pants are black. My sneakers are black. (and)", answer: "My pants and my sneakers are black." },
            ],
            checklist: ["Only one 'I have' or 'I like' in my sentence", "'and' joins the two things", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I have'. Item 4 changes the sentence shape and is only for Stretch children; do not teach the rule for the others.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do items 1 to 3." },
              { level: "Stretch", task: "Do all four, then join three things: 'I have a hat, a jacket and shorts.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My clothes and colors show",
        prompt: "Show your favorite clothes to the camera. Say what they are and what color they are. Use 'and' to tell about two things.",
        length: "30-60 seconds",
        steps: [
          "Put your favorite clothes on the bed or wear them.",
          "Say your clothes talk three times: each time a little faster, like in class.",
          "Record it once. Hold up each thing as you say it.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what your favorite clothes are and their colors, join two things with 'and', and keep talking without long stops.",
        words: ["jacket", "shorts", "sneakers", "T-shirt", "hat", "pants"],
        grammar: ["My favorite ___ is ___.", "I have a ___ ___ and ___ ___.", "My pants are ___."],
        rubric: [
          { label: "Clothes and colors", description: "Names two or more clothes and says their colors.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Is and are", description: "Says 'is' or 'are' ('My hat is red', 'My pants are black') and the -s in sneakers and shorts.", weight: 2 },
          { label: "Joining with and", description: "Joins two things with 'and' at least once.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite ___ is ___.", "I have a ___ ___."], tips: ["Hold up each clothes item."] },
          { level: "Core", who: "Most children", frames: ["I have a ___ ___ and ___ ___.", "My favorite ___ is ___."], tips: ["Say the color of every thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like my ___ ___ because it's ___.", "What's your favorite ___?"], tips: ["Say why you like it and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u04-l5": {
      objectives: ["I can tell how to make a new color, then say it faster, and write about my chart."],
      add: [
        {
          after: "Be the paint pots: act it out",
          slide: {
            kind: "fluency",
            title: "Color mix retell: faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 5,
            goal: "Tell how you made a color three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, I take red and yellow.",
              "Then I mix them.",
              "Look! It's orange!",
              "Red and yellow make orange.",
            ],
            recycle: ["The red ball is on the desk.", "I have a blue jacket."],
            rounds: [
              { seconds: 60, say: "Tell your partner how you made a color. Use the three paint pot cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Pick two paint pot cards. Say: 'First, I take ___ and ___.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(card: red + yellow)", "(card: blue + yellow)", "(card: red + blue)"],
            feedback: fixMix,
            teacherNote: "The same short telling three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. Keep the cards on the board for Support children. Accept short tellings; the shrinking time does the work. Listen for the final sounds in 'make' and 'mix' and for 'orange'.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["I take ___ and ___.", "It's ___!"] },
              { level: "Core", task: "Tell all four sentences without the frames." },
              { level: "Stretch", task: "Tell two mixes in one story: 'First, I take ... Then, I take ...'" },
            ],
          },
        },
        {
          after: "Put your chart on the wall and tell (SB 45 C)",
          slide: {
            kind: "writing",
            title: "Write about my color chart",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model. Point to the colors on your chart.",
              "Write two sentences about your own chart with the frames.",
              "Read them to your partner. Do they match the chart?",
            ],
            text: { title: "My color chart", text: "My chart has three colors. Red and yellow make orange. Blue and yellow make green. I like green!" },
            frames: ["My chart has ___ colors.", "___ and ___ make ___."],
            checklist: ["My colors match my chart", "A capital letter at the start", "A full stop at the end of each sentence"],
            sayIt: "Show your chart to a partner and say your sentences without reading.",
            teacherNote: "Modelled writing: read the model aloud, point to the chart as you go, then children write their own version with the frames. The writing is the speaking they just did, so the words are already in their heads.",
            tiers: [
              { level: "Support", task: "Copy the second sentence and draw the colors." },
              { level: "Core", task: "Write two sentences about your chart." },
              { level: "Stretch", task: "Write three sentences and add 'I like ___!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u04-l6": {
      objectives: ["I can say where things are, fast and right: in, on, under, next to."],
      trim: { "Crab race: Where is it?": 7, "Remember it!": 5 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Where is it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "The red hat is on the sand.",
              "The starfish is under the seaweed.",
              "Where is the crab? It's next to the shell.",
              "The blue fish is in the ocean.",
            ],
            recycle: ["Red and yellow make orange.", "I have a blue jacket."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 35, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Fix the two mistakes you heard most on the board, then go on.",
            ],
            feedback: fixPlace,
            teacherNote: "A quick, high-energy recall of the whole unit: mixing old and new phrases (spaced retrieval) keeps the earlier grammar from fading. Say 'on' and 'in' very clearly, and do the action with your hand for each place word.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["The ___ is ___ the ___."] },
              { level: "Core", task: "Say the sentence without the frame." },
              { level: "Stretch", task: "Say two sentences: 'The hat is on the sand. The shell is next to the hat.'" },
            ],
          },
        },
        {
          after: "Draw and write: Where is it?",
          slide: {
            kind: "writing",
            title: "Grow my where sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the color or size word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "The hat is on the sand. (add: red)", answer: "The red hat is on the sand." },
              { q: "The crab is under the leaf. (add: little)", answer: "The little crab is under the leaf." },
              { q: "The fish is in the ocean. (add: blue)", answer: "The blue fish is in the ocean." },
              { q: "The shells are next to the ball. (add: pink)", answer: "The pink shells are next to the ball." },
            ],
            frames: ["The ___ ___ is ___ the ___."],
            checklist: ["The color word is before the thing", "I wrote 'is' (or 'are')", "A capital letter and a full stop"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "The sentences are already correct: children add one word and keep the 'is' and the place word. Check each child says 'is' aloud as they write it, because Vietnamese needs no 'is' here and it is the most common missing word.",
            tiers: [
              { level: "Support", task: "Copy sentence 1 from the board and draw it." },
              { level: "Core", task: "Write two big sentences of your own." },
              { level: "Stretch", task: "Write three big sentences and join two with 'and'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Where is it? Home hunt",
        prompt: "Show three things at home. Say where each one is: in, on, under or next to something.",
        length: "30-60 seconds",
        steps: [
          "Choose three things at home: a toy, a book, a shoe ...",
          "Practise your where sentences three times.",
          "Record it once. Point to each thing as you talk.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say where three things are with 'is' and a place word, and keep talking without long stops.",
        words: ["in", "on", "under", "next to", "hat", "ball", "bag"],
        grammar: ["The ___ is in / on / under / next to the ___.", "Where is the ___?"],
        rubric: [
          { label: "Place words", description: "Uses in, on, under or next to correctly for three things.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Is in every sentence", description: "Says 'The ___ is ___ the ___.', never 'The ball under the table.'", weight: 2 },
          { label: "Colors", description: "Says the color of each thing.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___ the ___."], tips: ["Point to the thing and the place."] },
          { level: "Core", who: "Most children", frames: ["The ___ ___ is ___ the ___.", "Where is the ___? It's ___ the ___."], tips: ["Add the color of each thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Where is the ___? It's ___ the ___.", "The ___ and the ___ are next to the ___."], tips: ["Ask yourself the question, then answer it."] },
        ],
      },
    },
  },
};
