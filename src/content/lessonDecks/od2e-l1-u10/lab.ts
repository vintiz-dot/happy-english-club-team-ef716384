import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 10 "Soup, Fruit
// and Adding Up" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's grammar said again and again as
// whole phrases, a little faster each round, with Unit 9's phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Every other lesson ends with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause: 'Do you ...?', or hold up a finger for the missing -s) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

export const odL1U10Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u10-l1": {
      objectives: ["I can say 'I like ___.' and 'I don't like ___.' fast, without stopping."],
      trim: { "Run and touch": 4, "Mystery bag: eat it or not?": 6, "Whisper chant": 3 },
      add: [
        {
          after: "My food, your food",
          slide: {
            kind: "fluency",
            title: "Soup sprint: like it or not?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 8,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I like carrots.", "I don't like onions.", "I like soup!", "Do you like potatoes?", "Yes, I do. / No, I don't."],
            recycle: ["I have a pot.", "I don't have a stone."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I like carrots.' or 'I don't like carrots.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, play 'Fix the soup': two mistakes from the rounds go on the board and the class fixes them.",
            ],
            prompts: ["(card: carrots)", "(card: onions)", "(card: sausages)", "(card: soup)", "(card: potatoes)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: the point is to say 'I don't like onions' as one smooth piece. Mix in Unit 9's 'I have / I don't have' cards every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I like ___.", "I don't like ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I like carrots. They are orange!'", frames: ["I like ___. They are ___!"] },
            ],
          },
        },
        {
          after: "What goes in the soup? (SB 97 E)",
          slide: {
            kind: "writing",
            title: "My soup likes: plan, write, check",
            routine: "paragraph",
            genre: "likes and dislikes",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to what the child likes and what the child does not like.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with I like, My favorite soup has, I don't like.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the plural -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My soup",
              text: "I like hot soup. My favorite soup has carrots and potatoes. I don't like onions in my soup. Hot soup is yummy!",
            },
            organiser: [
              { label: "I like", prompt: "Draw a soup you like. Say: I like ___ soup." },
              { label: "My soup has", prompt: "Draw what is in your favorite soup. Say what it has." },
              { label: "I don't like", prompt: "Draw one food you don't like. Say: I don't like ___." },
            ],
            frames: ["I like ___ soup.","My favorite soup has ___ and ___.","I don't like ___ in my soup.","___ soup is yummy!"],
            checklist: ["Three or four sentences: what I like, what is in my soup, what I don't like","A capital letter at the start and a full stop or ! at the end","More than one: add -s (carrots, onions)"],
            sayIt: "Read your soup paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph about the child's own taste, planned by drawing, so no notes are needed. The three frames are the three sentences; children may copy and complete them. Mark only two things (capital letters, plural -s) and let the child find the mistake from your dot. The sentence-level expand-it practice (hot soup, three carrots) now happens inside the frames.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["I like ___ soup.","I don't like ___ in my soup."] },
              { level: "Core", task: "Write three or four sentences: what you like, what is in your soup, what you don't like, and a happy ending." },
              { level: "Stretch", task: "Add a fourth sentence with a number: 'I have three carrots and two onions.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u10-l2": {
      objectives: ["I can tell Stone Soup in three parts, faster each time.", "I can write the story in three sentences: beginning, middle and end."],
      trim: { "Act it out: our stone soup": 9 },
      add: [
        {
          after: "Tell the story with three fingers",
          slide: {
            kind: "fluency",
            title: "Stone Soup: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["In the beginning, the man has a pot and a stone.", "In the middle, everyone puts food in the pot.", "At the end, they all have soup!", "Do you have a carrot? Yes, I do."],
            recycle: ["I have ___.", "We have ___ together."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the three picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for the beginning, two for the middle, three for the end.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
              "Teacher: after round 3, write two sentences you heard with a mistake on the board; the class fixes them.",
            ],
            prompts: ["(picture: the man and the pot)", "(picture: people with food)", "(picture: everyone eating)"],
            feedback: correct,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Keep the three picture cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add what someone says: 'Do you have a carrot?' 'Yes, I do!'" },
            ],
          },
        },
        {
          after: "Draw and label: three boxes",
          slide: {
            kind: "writing",
            title: "My Stone Soup story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the beginning, the middle and the end.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with In the beginning, In the middle, At the end.",
              "Check: tick the checklist. Your partner points to every capital letter.",
              "Teacher: look only at capital letters and the plural -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Stone Soup",
              text: "In the beginning, a man has a pot and a stone. In the middle, everyone puts food in the pot: carrots, onions and potatoes. At the end, they all have hot soup!",
            },
            organiser: [
              { label: "Beginning", prompt: "Draw the man and the pot. Who is there? What does he have?" },
              { label: "Middle", prompt: "Draw the food. What do people put in the pot?" },
              { label: "End", prompt: "Draw everyone eating. What happens at the end?" },
            ],
            frames: ["In the beginning, a man has ___.", "In the middle, everyone puts ___ in the pot.", "At the end, they all have ___!"],
            checklist: ["Three sentences: beginning, middle and end", "A capital letter at the start and a full stop or ! at the end", "More than one: add -s (carrots, onions)"],
            sayIt: "Read your story to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "A six-year-old's first paragraph: three sentences, one for each part of the story, planned by drawing. The drawings are the plan, so no notes are needed. Mark only two things (capital letters, plural -s) and let the child find the mistake from your dot. This story is also the script for the recorded talk at home.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["In the beginning, a man has ___.", "At the end, they all have ___!"] },
              { level: "Core", task: "Write three sentences: beginning, middle and end." },
              { level: "Stretch", task: "Add a fourth sentence with what someone says: 'Do you have a carrot?' 'Yes, I do!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My Stone Soup story",
        prompt: "Tell the Stone Soup story at home in three parts: the beginning, the middle and the end. Show a pot or a stone if you have one!",
        length: "30-60 seconds",
        steps: [
          "Look at your three-box drawing from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự kể, đừng nhắc từng chữ.",
        ],
        maxSeconds: 120,
        kidSummary: "Tell the beginning, the middle and the end, and keep talking without long stops.",
        words: ["pot", "stone", "soup", "carrots", "onions", "potatoes"],
        grammar: ["In the beginning / In the middle / At the end", "Do you have ___? Yes, I do."],
        rubric: [
          { label: "Three parts", description: "Tells the beginning, the middle and the end of the story.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: pot, stone, soup, carrots, onions, potatoes.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of carrots, onions and potatoes can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the beginning, the man has ___.", "In the middle, ___ puts ___ in the pot.", "At the end, ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["'Do you have a carrot?' 'Yes, I do!'", "My favorite part is ___ because ___."], tips: ["Add what the people say, and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u10-l3": {
      objectives: ["I can ask 'Do you have ___?' and answer fast, round the circle."],
      trim: { "Pass the bag: Do you have ___?": 4, "Find someone who has": 6 },
      add: [
        {
          after: "Ask and answer (SB 101 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Do you have ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Do you have a carrot?", "Yes, I do. I have a carrot.", "No, I don't.", "What do you have?", "I have two stones."],
            recycle: ["I like ___.", "I don't have ___."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a food card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Do you have a ___?'",
              "They answer: 'Yes, I do.' or 'No, I don't.' Then they turn and ask the next friend.",
              "A 'No, I don't' answer adds: 'I have ___.'",
              "Teacher: after the last round, put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Do you have ___?", "What do you have?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Do you ...?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Yes, I have' and prompt with a raised finger and 'Yes, I d...?'",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I do.' or 'No, I don't.' and pass the question on with the frame on the board." },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a number: 'Do you have three onions?' 'No, I don't. I have two onions.'" },
            ],
          },
        },
        {
          after: "Find someone who has",
          slide: {
            kind: "writing",
            title: "My backpack: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to what the child has and what the child does not have.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with This is my backpack, I have, I don't have.",
              "Check: tick the checklist. Your partner points to every capital letter and the question mark.",
              "Teacher: look only at capital letters and 'I don't have'. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My backpack",
              text: "This is my backpack. I have a red pen and two books. I don't have a ruler. Do you have a ruler?",
            },
            organiser: [
              { label: "My backpack", prompt: "Draw your backpack. What color is it?" },
              { label: "I have", prompt: "Draw two or three things you have in it." },
              { label: "I don't have", prompt: "Draw one thing you don't have. Who can you ask?" },
            ],
            frames: ["This is my backpack.","I have a ___ and ___.","I don't have a ___.","Do you have a ___?"],
            checklist: ["Three or four sentences: my backpack, what I have, what I don't have","A capital letter at the start, a full stop or a question mark at the end","'I don't have' and 'Do you have' are right"],
            sayIt: "Read your backpack paragraph to your partner. Your partner answers your last question. Then tell it again without looking.",
            teacherNote: "The paragraph uses the unit's grammar twice: a statement with have and the question Do you have ___? at the end, so the partner's spoken answer closes the task. It replaces the earlier question-and-answer slip; the pairs still ask and answer in the Ask and answer and Question chain slides. Mark only capital letters and the do-support in 'I don't have'.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["This is my backpack.","I have a ___ and ___."] },
              { level: "Core", task: "Write four sentences: my backpack, what I have, what I don't have, and a question for your partner." },
              { level: "Stretch", task: "Add a number sentence: 'I have three pencils.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u10-l4": {
      objectives: ["I can talk about my favorite soup three times, faster each time."],
      trim: { "Fruit bingo": 4, "Fruit market Simon Says": 4, "Listen, point, say (SB 102 A)": 6 },
      add: [
        {
          after: "My favorite soup: tell your partner",
          slide: {
            kind: "fluency",
            title: "Soup talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same soup talk to three friends. Each talk is shorter and smoother.",
            chunks: ["My favorite soup has carrots and onions.", "It's hot and yummy!", "I have three potatoes in my soup.", "Do you like soup? Yes, I do!"],
            recycle: ["Three plus two equals five.", "I don't have a stone."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your soup talk. The listener counts the foods on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Yum!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite soup has ___.", "It's ___!"] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a number sentence: 'I have two carrots and three onions. Two plus three equals five!'" },
            ],
          },
        },
        {
          after: "Say it with feeling! (SB 103 F)",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "I have carrots. I have onions. (and)", answer: "I have carrots and onions." },
              { q: "I like apples. I like bananas. (and)", answer: "I like apples and bananas." },
              { q: "The soup is hot. The soup is yummy. (and)", answer: "The soup is hot and yummy." },
            ],
            checklist: ["Only one 'I have' or 'I like' in my sentence", "'and' joins the two things", "A full stop, or an exclamation point for a strong feeling!"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I have'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'I have carrots, onions and potatoes.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite soup talk",
        prompt: "Show your favorite soup or draw it. Tell us what is in it, how many, and how it tastes.",
        length: "30-60 seconds",
        steps: [
          "Draw your soup or find a bowl at home.",
          "Say your soup talk three times: each time a little faster, like in class.",
          "Record it once. Use 'and' to join your foods.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say what is in your soup with 'and', say how many, and keep talking without long stops.",
        words: ["soup", "carrots", "onions", "potatoes", "sausages", "hot", "yummy"],
        grammar: ["My favorite soup has ___ and ___.", "I have + number + things", "It's ___!"],
        rubric: [
          { label: "What is in it", description: "Names two or more foods, joined with 'and'.", weight: 3 },
          { label: "Numbers", description: "Says how many of a food, with the -s for more than one.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "With feeling", description: "Says how it tastes with a strong voice: It's yummy!", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite soup has ___.", "It's ___!"], tips: ["Point to each food as you say it."] },
          { level: "Core", who: "Most children", frames: ["My favorite soup has ___ and ___.", "I have ___ ___ in my soup.", "It's hot and yummy!"], tips: ["Say a number for one food."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I have two ___ and three ___. Two plus three equals five!", "Do you like soup? I do!"], tips: ["Add a number sentence and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u10-l5": {
      objectives: ["I can say number sentences fast: 'Two plus three equals five.'"],
      trim: { "Act it out in fours": 6 },
      add: [
        {
          after: "How many do we have?",
          slide: {
            kind: "fluency",
            title: "Number sprint: how many together?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the number sentence in one breath, fast and right.",
            chunks: ["I have two carrots.", "You have three carrots.", "Two plus three equals five.", "We have five carrots!"],
            recycle: ["Do you have a pot? Yes, I do.", "I like soup. I don't like onions."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows two hands of counters, the class says the four sentences." },
              { seconds: 60, say: "Pairs: each of you grabs some counters. Say the four sentences about them." },
              { seconds: 45, say: "New partner. Faster: how many number sentences in 45 seconds?" },
            ],
            steps: [
              "Grab some counters or fingers. Say what you have, what your partner has, and how many together.",
              "Change partners when you hear the bell.",
              "Teacher: after round 3, put two mistakes you heard on the board (often 'two carrot' or 'equal') and fix them together.",
            ],
            feedback: correct,
            teacherNote: "This turns the Units 9 and 10 grammar (I have / you have / we have + plural -s) and the number sentence into one smooth routine. Mix in a 'Do you have ...?' card every few turns so the question stays fast too.",
            tiers: [
              { level: "Support", task: "Use numbers up to five and the frames on the board.", frames: ["I have ___.", "___ plus ___ equals ___."] },
              { level: "Core", task: "Use numbers up to ten without the board." },
              { level: "Stretch", task: "Use two foods: 'I have two carrots and one onion. We have three things!'" },
            ],
          },
        },
        {
          after: "Draw your bar graph (SB 105 B)",
          slide: {
            kind: "writing",
            title: "Write about our graph",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Listen to the model. Point to the numbers on the class graph.",
              "Write two sentences about your own graph with the frames.",
              "Read them to your partner. Do they match the graph?",
            ],
            text: { title: "Our class graph", text: "We asked: Do you like apples? Six children like apples. Four children don't like apples. Six plus four equals ten. We have ten answers!" },
            frames: ["___ children like ___.", "___ children don't like ___.", "___ plus ___ equals ___."],
            checklist: ["My numbers match my graph", "children, not 'child', for more than one", "A full stop at the end of each sentence"],
            sayIt: "Show your graph to a partner and say your sentences without reading.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill in your number." },
              { level: "Core", task: "Write two sentences about your graph." },
              { level: "Stretch", task: "Write three sentences and the number sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u10-l6": {
      objectives: ["I can ask and answer 'Do you have ___?' quickly, without looking."],
      trim: { "Soup pot race": 6 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Units 9 and 10",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["Do you have a pot? Yes, I do.", "Do you have a stone? No, I don't.", "I have three onions.", "We have five!"],
            recycle: ["I don't have a kite.", "I like carrots. I don't like sausages."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: finish with the two mistakes you heard most, fixed on the board.",
            ],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of Units 9 and 10 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading.",
          },
        },
        {
          after: "Write my soup sentences",
          slide: {
            kind: "writing",
            title: "Fix Chef Bobo's notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Chef Bobo wrote his shopping notes, but he made mistakes!",
              "Read each note with your partner and find the mistake.",
              "Write it the right way and read it to Chef Bobo (the teacher).",
            ],
            items: [
              { q: "You have a pot?", answer: "Do you have a pot?" },
              { q: "Yes, I have.", answer: "Yes, I do." },
              { q: "No, I no have.", answer: "No, I don't." },
              { q: "I have four potato.", answer: "I have four potatoes." },
            ],
            checklist: ["A question starts with Do", "Short answers: Yes, I do. / No, I don't.", "More than one: -s (potatoes!)"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Kitchen hunt: Do I have it?",
        prompt: "Go to your kitchen with a grown-up. Find three things. Ask 'Do I have a ___?' and answer it. Show each thing to the camera.",
        length: "30-60 seconds",
        steps: [
          "Choose three things in your kitchen: a pot, a spoon, a carrot ...",
          "Practise your questions and answers three times.",
          "Record it once. Show each thing as you talk.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Ask with 'Do', answer 'Yes, I do.' or 'No, I don't.', and say how many.",
        words: ["pot", "food", "carrots", "onions", "potatoes"],
        grammar: ["Do you have ___? Yes, I do. / No, I don't.", "I have + number + things"],
        rubric: [
          { label: "Questions with Do", description: "Asks 'Do I have ___?' or 'Do you have ___?' correctly.", weight: 3 },
          { label: "Short answers", description: "Answers 'Yes, I do.' or 'No, I don't.', not 'Yes, I have.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops about three things.", weight: 2 },
          { label: "Numbers and -s", description: "Says how many, with the -s for more than one.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Do I have a ___? Yes, I do!", "I have a ___."], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["Do I have a ___? Yes, I do. I have ___ ___.", "Do I have a ___? No, I don't."], tips: ["Find one thing you do NOT have too."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Do you have a ___? Ask your grown-up!", "We have ___ together."], tips: ["Ask your grown-up a question and add up your things."] },
        ],
      },
    },
  },
};
