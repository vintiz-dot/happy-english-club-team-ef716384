import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 17 "Shapes in Art"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 16's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Two lessons end with a recorded talk for
// home. Time comes from games and repeats, never from the book pages or the grammar.
// All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice ('There is a lot of stars?'). For a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

const grammarFix =
  " Here: 'There is a lot of stars.' Point to 'stars' and ask 'One star or many?', then start 'There ar...' and pause. For 'There aren't any star.', hold up a finger at the end of the word and wait for the -s. For 'There aren't any paint.', ask 'Can we count paint?' and let the child choose isn't.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u17-l1": {
      objectives: ["I can ask and answer about shapes quickly: 'Is it an oval? Yes, it is.'"],
      trim: { "The mystery bag": 6, "Shape chant and move": 4, "Which go together? Why?": 8 },
      add: [
        {
          after: "Guess my shape",
          slide: {
            kind: "fluency",
            title: "Shape sprint: is it an oval?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Ask and answer about a shape in one smooth sentence, fast and without stops.",
            chunks: ["Is it an oval?", "Yes, it is. It's an oval!", "No, it isn't. It's a spiral.", "It has a straight side.", "It looks like a crescent."],
            recycle: ["This is the funniest story.", "Who is the fastest?"],
            rounds: [
              { seconds: 60, say: "Together: the teacher holds up a shape card, the class asks and answers in one voice." },
              { seconds: 60, say: "Pairs: one hides a shape card behind a book and answers, the other asks. Swap on the clap." },
              { seconds: 45, say: "Faster! New partner. How many shapes can you guess before the bell?" },
            ],
            steps: [
              "Look at the shape card. Say a WHOLE sentence: 'Is it a star?' or 'It's an oval!'",
              "Listen for the clap: it means swap.",
              "In round 3, count your guesses on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board ('It's a oval', 'No, it not') and fix them together; then go on.",
            ],
            prompts: ["(card: star)", "(card: oval)", "(card: spiral)", "(card: crescent)", "(card: circle)"],
            feedback:
              fix +
              " Here: for 'It's a oval', say 'an oval' with a clear 'an' and let the child echo; for 'No, it not', start 'No, it is...' and pause so the child finishes 'isn't'.",
            teacherNote:
              "Whole sentences only, never single words: 'No, it isn't. It's a spiral.' should come out as one smooth piece. Mix in Unit 16's superlatives every few turns so they stay fast. Listen for the vowel sound in 'an oval' and for the final -s in 'sides'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["Is it a ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer alone, without looking at the board." },
              { level: "Stretch", task: "Add a clue: 'It's a crescent. It looks like a thin moon!'", frames: ["It's a ___. It looks like ___!"] },
            ],
          },
        },
        {
          after: "Connect it to my life (SB 169 Think, C)",
          slide: {
            kind: "writing",
            title: "Write a shape riddle",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model riddle with the teacher. Find the answer.",
              "Choose a shape. Write two clues and the question 'What am I?'",
              "Swap with a partner. They guess and write the answer.",
            ],
            text: {
              title: "A shape riddle",
              text: "I am round, and I have no corners. I look like an egg. I am not a circle. What am I? I am an oval!",
            },
            frames: ["I am ___, and I have ___.", "I look like ___.", "What am I? I am a ___!"],
            checklist: ["A capital letter at the start of each sentence", "A or an: an oval, a star", "A question mark after 'What am I?'"],
            sayIt: "Read your riddle to your partner, then say it again without looking.",
            teacherNote:
              "A short model gives children a pattern to copy and change, which is the quickest way into a new kind of writing. Vietnamese has no a / an, so 'a oval' is common: model the clear 'an' when you read it aloud.",
            tiers: [
              { level: "Support", task: "Copy the model, and change the shape and one clue." },
              { level: "Core", task: "Write your own riddle with two clues." },
              { level: "Stretch", task: "Write three clues, and use 'but': 'It is round, but it is not a circle.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u17-l2": {
      objectives: ["I can tell my partner about shapes three times, faster each time.", "I can write a short paragraph about shapes in nature."],
      trim: { "Chant and shape hunt": 6 },
      add: [
        {
          after: "Our shape chart",
          slide: {
            kind: "fluency",
            title: "Shape chart retell: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same shape facts three times. Each time is shorter, smoother and faster.",
            chunks: [
              "A triangle has three straight sides.",
              "A circle has no corners.",
              "A spiral goes round and round.",
              "I see shapes in nature, too.",
            ],
            recycle: ["The giraffe is the tallest animal.", "This is the best picture."],
            rounds: [
              { seconds: 75, say: "Tell your partner what is on our shape chart. Use the picture cards." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 45, say: "New partner. Tell it fast! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the shape chart. Choose three shapes and tell your partner a fact about each one.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner and tell it again, shorter.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: triangle)", "(picture: circle)", "(picture: spiral)", "(picture: a leaf in nature)"],
            feedback:
              fix +
              " Here: for 'A triangle have three side', hold up a finger at 'has' and at the end of 'sides'; the third-person -s and the plural -s are the two to wait for.",
            teacherNote:
              "The same facts three times on purpose: the second and third tellings are faster because the children are not searching for words. The correction minute between round 1 and 2 is where accuracy grows, so do not skip it. Listen for the -s in 'has' and 'sides' and the final sound in 'round'.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["A ___ has ___ straight sides.", "A ___ has no corners."] },
              { level: "Core", task: "Tell three facts without the frames." },
              { level: "Stretch", task: "Compare two shapes: 'A square has four straight sides, but a circle has no corners.'" },
            ],
          },
        },
        {
          after: "Same and different",
          slide: {
            kind: "writing",
            title: "My shapes in nature: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then and At the end.",
              "Plan: in each box draw one shape you see in nature, or write a few words. Tell your partner.",
              "Write: four or five short sentences, one for each part of your plan. Use First, Then, and, but and At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at 'a' or 'an' and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: shapes in nature",
              text: "I see a lot of shapes in nature. First, I see a crescent in the sky, and it is thin and curved. Then I see an egg. It is an oval, but it is not a circle. At the end, I see a spiral on a shell.",
            },
            organiser: [
              { label: "First", prompt: "Draw a shape in the sky or on a tree. What is it called? What is it like?" },
              { label: "Then", prompt: "Draw a shape in the kitchen or the garden. Is it round or straight?" },
              { label: "At the end", prompt: "Draw one more shape. Where do you see it?" },
            ],
            frames: ["I see a lot of shapes in nature.","First, I see a ___ in the ___, and it is ___.","Then I see ___. It is a ___, but it is not a ___.","At the end, I see a ___ on a ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence","a or an: a crescent, an oval","I used First, Then, and or but to join my ideas"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like a nature guide.",
            teacherNote: "A short first paragraph for seven-year-olds: four or five sentences, each planned in a box with a drawing or a few words. It uses the words and sentences from the shape chart and the dictogloss text children met earlier in the lesson. Joining words give it shape: First, Then, and, but, At the end. Mark only two things (a / an and full stops); the dot tells the child where to look and the child finds the mistake. Vietnamese has no a / an, so model the clear 'an oval' when you read the model aloud. This paragraph can also be the script for the recorded talk 'My shape hunt at home'. It replaces the moon and egg dictation, whose text is now the model's pattern.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in one word in each. Draw your plan first.","frames":["First, I see a ___ in the ___.","At the end, I see a ___ on a ___."]},
              {"level":"Core","task":"Write four or five sentences with First, Then, and, but and At the end."},
              {"level":"Stretch","task":"Write five sentences and add a sixth: 'A spiral goes round and round, but a circle has no corners.'"},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My shape hunt at home",
        prompt: "Find three shapes at home or outside. Show each one to the camera and say what it is and what it has.",
        length: "45-90 seconds",
        steps: [
          "Walk around your home with a grown-up and find three shapes: a circle plate, a square window ...",
          "Say what you see three times, each time a little faster, like in class.",
          "Record it once. Show each shape to the camera as you talk.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Show three shapes, say what each one is and what it has, and keep talking without long stops.",
        words: ["crescent", "star", "spiral", "oval", "straight", "nature"],
        grammar: ["It is a ___. It has ___.", "A ___ has ___ straight sides.", "It looks like ___."],
        rubric: [
          { label: "Three shapes", description: "Shows and names three shapes.", weight: 3 },
          { label: "What it has", description: "Says something about each shape with 'has' or 'is': A triangle has three straight sides.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s in 'has' and 'sides' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I see a ___.", "It is a ___."], tips: ["Hold up each shape as you say it."] },
          { level: "Core", who: "Most children", frames: ["I see a ___. It has ___.", "A ___ has ___ straight sides."], tips: ["Say what the shape has."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["A ___ and a ___ are different because ___.", "It looks like ___."], tips: ["Compare two of your shapes."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u17-l3": {
      objectives: ["I can say 'There are a lot of ___' and 'There isn't any ___' fast, without stopping.", "I can write a short paragraph about my collage."],
      trim: { "Can we count it? Mess about": 6 },
      add: [
        {
          after: "Practice with a partner (SB 173 F)",
          slide: {
            kind: "fluency",
            title: "Collage chain: what is in it?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What's in your collage?",
              "There are a lot of stars.",
              "There is a lot of glue.",
              "There aren't any ovals.",
              "There isn't any blue paint.",
            ],
            recycle: ["A triangle has three straight sides.", "Is it an oval? Yes, it is."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a collage card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your collage card so only you can see it.",
              "Ask the friend on your left: 'What's in your collage?'",
              "They answer with one 'a lot of' sentence and one 'any' sentence. Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What's in your collage?", "(card: many stars, no ovals)", "(card: lots of glue, no paint)", "(card: many beads, no string)"],
            feedback: fix + grammarFix,
            teacherNote:
              "The chain makes every child answer many times in a few minutes, which is what makes 'There are / There is a lot of' automatic. Pick the cards so some show things we count (stars, beads) and some show things we cannot count (glue, paint, sand). Listen for the choice of is / are and the final -s on plurals.",
            tiers: [
              { level: "Support", task: "Say one sentence with the frame on the board.", frames: ["There are a lot of ___.", "There is a lot of ___."] },
              { level: "Core", task: "Say two sentences, one with 'a lot of' and one with 'any'." },
              { level: "Stretch", task: "Add 'but': 'There are a lot of stars, but there isn't any glue.'" },
            ],
          },
        },
        {
          after: "Transfer: our own collage shop",
          slide: {
            kind: "writing",
            title: "My collage: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to 'a lot of' and 'any'.",
              "Plan: in each box draw or write a few words. Can we count it? Tell your partner.",
              "Write: four or five short sentences, one for each part of your plan. Use and, but and because.",
              "Check: tick the checklist. Your partner asks 'Can we count it?' about every thing.",
              "Teacher: look only at is / are and the -s on the things. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my collage",
              text: "This is my collage. There are a lot of stars in it, but there aren't any ovals. There is a lot of glue, and there is a lot of glitter, too. There isn't any paint. I like my collage because it is shiny.",
            },
            organiser: [
              { label: "Things I can count", prompt: "Draw the shapes. What are there a lot of? What aren't there?" },
              { label: "Stuff I can't count", prompt: "Draw the glue or the glitter. What is there a lot of?" },
              { label: "None of this stuff", prompt: "Is there any paint? What isn't there?" },
              { label: "I like it", prompt: "Why do you like your collage?" },
            ],
            frames: ["This is my collage.","There are a lot of ___ in it, but there aren't any ___.","There is a lot of ___, and there is a lot of ___, too.","There isn't any ___.","I like my collage because it is ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence","are and -s for things we count (stars); is for stuff we cannot count (glue)","I used and, but or because to join my ideas"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like an artist.",
            teacherNote: "Children turn the collage sentences they have been joining into a paragraph: five sentences, each planned in a box. The boxes sort the things we count from the stuff we cannot count, so the child chooses is or are before writing. The joining words and, but and because link the ideas. It replaces the sentence-combining task: the 'but' and 'and' sentences are now the second and third frames. Mark only two things (is / are and the -s on plural things) and let the child find the mistake from your dot. Ask 'Can we count it?' when you point.",
            tiers: [
              {"level":"Support","task":"Copy three frames and fill in one word in each. Draw your plan first.","frames":["There are a lot of ___ in it.","There isn't any ___."]},
              {"level":"Core","task":"Write four or five sentences with a lot of, any, and, but and because."},
              {"level":"Stretch","task":"Write five sentences and add a sixth: 'I can make a mosaic because there are a lot of squares.'"},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u17-l4": {
      objectives: ["I can say kind words about art, and answer kindly, without stopping."],
      trim: { "Gallery walk: kind words": 3, "Art tools: what can I make?": 4 },
      add: [
        {
          after: "Kind words about art (SB 175 E)",
          slide: {
            kind: "fluency",
            title: "Kind words, three new partners",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say and answer kind words with three partners. In each round both partners talk, and each round is shorter and smoother.",
            chunks: [
              "Wow! What a nice mosaic!",
              "Thank you! I like your drawing, too.",
              "You are very good at origami.",
              "Thanks! And you are good at drawing.",
            ],
            recycle: ["This is the best picture.", "Who is the fastest?"],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A shows an art card and says a kind word, then Partner B does it. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. The same task. Partner A first, then Partner B. Say it smoother." },
              { seconds: 30, say: "Round 3: New partner. Fast and kind! Partner A, then Partner B. Smile and look at your partner." },
            ],
            steps: [
              "Hold up an art card (a mosaic, an origami bird, a drawing, a photograph).",
              "Your partner says a kind word about it. You say thank you and give a kind word back.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Partner A does the task, then Partner B does it. When the bell rings, change partners and do the same task again.",
            ],
            prompts: ["(card: mosaic)", "(card: origami)", "(card: drawing)", "(card: photograph)"],
            feedback:
              fix +
              " Here: for 'You are good origami', start 'You are good a...' and pause so the child adds 'at'; for 'Wow! What a nice mosaics!', ask 'One or many?' and hold up one finger.",
            teacherNote:
              "The same task with a new partner each time is task repetition: the language and the meaning stay the same, so the child can speak faster and smoother. Praise kind faces and kind voices too. Listen for 'good at' (the 'at' is often dropped) and for 'a nice mosaic' with one thing.",
            tiers: [
              { level: "Support", task: "Use the frames on the board with your art card.", frames: ["Wow! What a nice ___!", "Thank you!"] },
              { level: "Core", task: "Say a kind word, and answer with a kind word back." },
              { level: "Stretch", task: "Add a reason: 'You are very good at drawing. I like the colors!'" },
            ],
          },
        },
        {
          after: "What kind of art is it? (SB 174 B)",
          slide: {
            kind: "writing",
            title: "Make my art sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the words in the brackets. Say it first.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I made a mobile. (add: big, red)", answer: "I made a big red mobile." },
              { q: "I like my drawing. (add: new)", answer: "I like my new drawing." },
              { q: "There is a mosaic. (add: in the hall)", answer: "There is a mosaic in the hall." },
              { q: "She took a photograph. (add: of a flower)", answer: "She took a photograph of a flower." },
            ],
            frames: ["I made a ___ ___ ___.", "I like my ___ ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "The adjectives (big, red) come before the thing"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote:
              "Expanding one sentence at a time builds sentence length without new grammar. Vietnamese puts adjectives after the noun, so 'a mobile red' is a common slip: model the English order aloud.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then draw them." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two big sentences about your own art." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u17-l5": {
      objectives: ["I can talk about my art table for three rounds, faster each time.", "I can write a short paragraph about the mosaic I want to make."],
      trim: { "Grammar mystery: Mimi and the art cupboard": 6, "Stock the art cupboard": 5, "Does the rule work here too?": 4 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Art table talk 1-0.75-0.5",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same art table talk to three friends. Each talk is shorter and smoother: 60, 45 and 30 seconds.",
            chunks: [
              "On my art table there are a lot of beads.",
              "There is a lot of glue, but there isn't any glitter.",
              "There aren't any crescents.",
              "I can make a mosaic with them.",
            ],
            recycle: ["It looks like a crescent.", "Who is the fastest?"],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the art table talk, then Partner B. The listener counts the things on their fingers. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells the same talk in less time, then Partner B." },
              { seconds: 30, say: "Round 3: New partner. Fast and smooth! Partner A, then Partner B. The listener says 'Nice!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again in rounds 2 and 3, each time a little shorter.",
            ],
            feedback: fix + grammarFix,
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The correction minute is what turns the extra speed into accuracy as well. Listen for is / are with the right noun and for the -s on plurals.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["There are a lot of ___.", "There isn't any ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a plan: 'I can make a mosaic because there are a lot of squares.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my art cupboard",
          slide: {
            kind: "writing",
            title: "My mosaic plan: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then, so and At the end.",
              "Plan: in each box draw or write a few words about your own mosaic. Tell your partner.",
              "Write: four or five short sentences, one for each part of your plan. Use First, Then, but, so and At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at 'a lot of' and 'any' (is / are and the -s). Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my mosaic",
              text: "I want to make a mosaic. First, I have a lot of tiles, but there isn't any glue. Then I ask my friend, and she has a lot of glue. There aren't any red tiles, so I use blue tiles. At the end, I have a beautiful mosaic!",
            },
            organiser: [
              { label: "First", prompt: "Draw your things. What do you have a lot of? What isn't there?" },
              { label: "Then", prompt: "Who helps you? What do you get?" },
              { label: "So", prompt: "What aren't there? What do you use instead?" },
              { label: "At the end", prompt: "Draw your mosaic. How is it?" },
            ],
            frames: ["I want to make a ___.","First, I have a lot of ___, but there isn't any ___.","Then I ask my friend, and she has a lot of ___.","There aren't any ___, so I use ___.","At the end, I have a ___ ___!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end of every sentence","a lot of, any, is or are: can we count it?","I used First, Then, but, so or At the end to join my ideas"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like an artist.",
            teacherNote: "This paragraph can be the script for the recorded talk 'My art table talk' at home: the child tells it three times, each time a little faster. It replaces the fix-it notes: the common mistakes (is / are, missing -s, 'a lot' without 'of') are now the two things you mark. The boxes carry the story, so no full sentences are written until the Write step. The joining words but and so are new for some children: say the model aloud with a pause before each one. Mark only two things and let the child find the mistake from your dot.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in one word in each. Draw your plan first.","frames":["First, I have a lot of ___.","At the end, I have a ___ ___!"]},
              {"level":"Core","task":"Write four or five sentences with a lot of, any, but, so and At the end."},
              {"level":"Stretch","task":"Write five sentences and add a sixth with 'because': 'I like it because the colors are bright.'"},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My art table talk",
        prompt: "Show your art things at home, or draw them. Say what there is a lot of, and what there isn't any of.",
        length: "45-90 seconds",
        steps: [
          "Put your art things on a table, or draw them: paper, crayons, glue, paint ...",
          "Say your art table talk three times: each time a little faster, like in class.",
          "Record it once. Point to each thing as you talk.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say what there is a lot of and what there isn't any of, and keep talking without long stops.",
        words: ["collage", "mosaic", "sculpture", "pattern", "paint", "glue"],
        grammar: ["There are a lot of ___.", "There is a lot of ___.", "There aren't any ___. / There isn't any ___."],
        rubric: [
          { label: "A lot of", description: "Says what there is a lot of, with is or are to match: There are a lot of beads. There is a lot of glue.", weight: 3 },
          { label: "Any", description: "Says what there isn't any of: There aren't any stars. There isn't any paint.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on plural things (stars, beads) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There are a lot of ___.", "There isn't any ___."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["There are a lot of ___, but there aren't any ___.", "There is a lot of ___, but there isn't any ___."], tips: ["Ask 'Can I count it?' to choose is or are."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I can make ___ because there are a lot of ___.", "I need ___ because there isn't any ___."], tips: ["Say what you can make and what you need."] },
        ],
      },
    },
  },
};
