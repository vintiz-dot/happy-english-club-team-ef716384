import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 5 "Animal Homes"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 4's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Two lessons end with a recorded talk for
// home, built on the routine the class just did. Time comes from games and repeats, never
// from the book pages or the grammar. All text is original.

const GROWN_UP = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

// Lessons 1-2: "lives" (third person -s) and "a / in a".
const fixLives =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). The most likely one is a missing -s: 'The eagle live in a nest.' In a retell, write them on the board between rounds 1 and 2 (in a sprint, after the last round) and let the class fix them in one minute; children then say it again with the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('The eagle live...?'), hold up one finger for the missing -s, or point to the frame. Do not say it for them. For a sound (hive, with the /v/), just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

// Lessons 3 and 5: Where's / Where are, It's / They're.
const fixWhere =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Look for 'Where the frog?' (no is), 'Where's the frogs?' (Where's with many) and 'They is in the pond.' Between rounds, write them on the board and let the class fix them in one minute; children then say the same thing again with the fixed form. Prompt, do not tell: start the phrase and pause ('Where ... the frogs?'), hold up one finger for ONE thing or two fingers for MANY, or point to the frame on the board. For a sound, just say it right and let the child echo it. Say every 's, 're and final -s clearly yourself.";

// Lesson 4: plurals.
const fixPlural =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Look for 'two frog' (no -s), 'two mouses', 'three fishes' and 'one mice'. Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children then say the same thing again with the fixed form. Prompt the child to fix it: hold up the right number of fingers and wait, start the phrase and pause ('two frog...?'), or point to the plural box on the board. Do not say it for them. For a sound, just say it right and let them echo it. Say every final -s and -es clearly yourself: children copy what they hear.";

export const odL1U5Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u05-l1": {
      objectives: ["I can say 'The eagle lives in a nest.' fast, without stopping."],
      trim: { "Chant: Home, home, home!": 3, "Flashcard slap and What's missing?": 4, "Animals and places (SB 48 B)": 5, "Look and guess: title and picture (SB 49 C-D)": 8 },
      add: [
        {
          after: "Who lives here? (home match)",
          slide: {
            kind: "fluency",
            title: "Home sprint: who lives where?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 8,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["The eagle lives in a nest.", "The honeybee lives in a hive.", "The crab lives in a shell.", "The opossum lives in a tree hollow.", "Where does the chick live?"],
            recycle: ["The ball is on the desk.", "It's under the chair."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an animal card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the animal card. Say a WHOLE sentence: 'The eagle lives in a nest.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, play 'Fix the home': two mistakes from the rounds go on the board and the class fixes them in one minute.",
            ],
            prompts: ["(card: eagle)", "(card: honeybee)", "(card: crab)", "(card: opossum)", "(card: chick)"],
            feedback: fixLives,
            teacherNote: "Whole sentences only, never single words: the point is to say 'The crab lives in a shell' as one smooth piece. Listen for the -s on 'lives' and for the /v/ in 'hive' and 'lives'. Every few turns slip in a Unit 4 card ('The ball is on the desk') so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ lives in a ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add where the home is: 'The eagle lives in a nest. The nest is in a tree.'", frames: ["The ___ lives in a ___. The ___ is in a ___."] },
            ],
          },
        },
        {
          after: "Draw and label",
          slide: {
            kind: "writing",
            title: "My animal home: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the animal, the home and the last sentence.",
              "Plan: draw in the three boxes. Say one sentence for each box to your partner.",
              "Write: use the frames. Start with I like the ___.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the -s on 'lives'. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The eagle", text: "I like the eagle. The eagle lives in a big nest. The nest is high in a tree. It is a safe home!" },
            organiser: [
              { label: "Animal", prompt: "Draw your animal. Say its name." },
              { label: "Home", prompt: "Draw its home. Say where it lives." },
              { label: "Safe", prompt: "Draw why the home is good. Is it high, warm or safe?" },
            ],
            frames: ["I like the ___.","The ___ lives in a ___.","The ___ is ___ in a ___.","It is a safe home!"],
            checklist: ["Three or four sentences about one animal","A capital letter at the start and a full stop or ! at the end","'lives' has an -s"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph about one animal: an opening sentence, what it is about, and an ending, planned by drawing. Mark only two things (capital letters and the -s on 'lives') and let the child find the mistake from your dot.",
            tiers: [
              {"level":"Support","task":"Copy the three frames and fill in one word in each.","frames":["I like the ___.","The ___ lives in a ___."]},
              {"level":"Core","task":"Write three or four sentences about your animal and its home."},
              {"level":"Stretch","task":"Add a sentence about why the home is good: 'The nest is high, so it is safe.'"},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u05-l2": {
      objectives: ["I can tell my partner about an animal home, faster each time."],
      trim: { "Fact hunt: touch it!": 5 },
      add: [
        {
          after: "Home experts",
          slide: {
            kind: "fluency",
            title: "Home facts: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell what you learned about one animal home three times. Each time is shorter, smoother and faster.",
            chunks: ["The eagle lives in a nest.", "The nest is high in a tree.", "The honeybees live in a hive.", "The crab has a shell. It is a safe home.", "Animals live in different homes."],
            recycle: ["The blue pencil is in the bag.", "Where is the starfish? It's under the seaweed."],
            rounds: [
              { seconds: 60, say: "Tell your partner about your animal and its home. Use your picture card." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Choose one animal card. Say its name, where it lives and one more fact.",
              "The listener has a job: count the facts on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner for rounds 2 and 3.",
            ],
            prompts: ["(card: eagle)", "(card: honeybee)", "(card: crab)", "(card: opossum)"],
            feedback: fixLives,
            teacherNote: "Same facts three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Retelling builds fluency but not accuracy on its own, which is why the one-minute fix sits between round 1 and round 2. Listen for 'lives' with its -s and for 'honeybees live' (no -s on live).",
            tiers: [
              { level: "Support", task: "Point to your card and say two sentences with the frames.", frames: ["The ___ lives in a ___.", "It is ___."] },
              { level: "Core", task: "Say three facts without the frames." },
              { level: "Stretch", task: "Add why the home is good: 'The nest is high, so it is safe.'", frames: ["The ___ is ___, so it is safe."] },
            ],
          },
        },
        {
          after: "Fact hunt: touch it!",
          slide: {
            kind: "writing",
            title: "Listen and build the home facts",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again and write the key words: hive, warm, nest, high, chicks.",
              "With your partner, build the text back. It does not have to be the same, but it must make sense.",
              "Compare with the teacher's text. Fix your capital letters and full stops.",
            ],
            text: { title: "Safe homes", text: "The honeybees live in a hive. The hive is warm and safe. The eagle lives in a nest. The nest is high in a tree. The chicks are in the nest." },
            checklist: ["Capital letter at the start of each sentence", "A full stop at the end", "'lives' / 'live' and 'chicks' with the -s"],
            sayIt: "Read your text to the class. Then say it again without looking.",
            teacherNote: "Dictogloss works best after a short reminder of the rule: one animal 'lives', many animals 'live'. Read the text twice at normal speed, not slowed down. Children rebuild meaning in pairs, then compare. Accept any sensible version.",
            tiers: [
              { level: "Support", task: "Write the key words and the first two sentences with a partner." },
              { level: "Core", task: "Build all five sentences with a partner." },
              { level: "Stretch", task: "Build the text, then add one sentence about the crab." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal's home",
        prompt: "Choose an animal. Tell us its name, where it lives and why that home is good. Show a picture or a toy animal!",
        length: "30-60 seconds",
        steps: [
          "Choose your animal and look at the picture you drew in class.",
          "Say your facts three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          GROWN_UP,
        ],
        maxSeconds: 90,
        kidSummary: "Tell the name of your animal, where it lives, and why the home is good. Keep talking without long stops.",
        words: ["eagle", "chick", "nest", "honeybee", "hive", "crab", "shell"],
        grammar: ["The ___ lives in a ___.", "The ___ is ___ and safe."],
        rubric: [
          { label: "Animal and home", description: "Says the animal and where it lives in a whole sentence.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: nest, hive, shell, tree hollow.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear 'lives'", description: "The -s at the end of 'lives' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is a ___.", "It lives in a ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ lives in a ___.", "The home is ___.", "It is safe."], tips: ["Say where the home is, too."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ lives in a ___. It is ___, so it is safe.", "I like the ___ because ___."], tips: ["Say why the home is good and which animal you like."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u05-l3": {
      objectives: ["I can ask 'Where's the ___?' and 'Where are the ___?' and answer fast."],
      trim: { "Hide it! Where is the toy?": 5, "Ball toss: ask and throw": 5, "TPR: Freeze and point": 5 },
      add: [
        {
          after: "Look at the picture, ask your partner (SB 53 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: Where's it? Where are they?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Where's the eagle?", "It's in the sky.", "Where are the chicks?", "They're in the nest.", "It's under the tree."],
            recycle: ["The eagle lives in a nest.", "The honeybee lives in a hive."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds an animal card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Put your animal card on the floor in a place: in, on, under or next to something.",
              "Look at the card in front of the friend on your left. Ask: 'Where's the ___?' (one) or 'Where are the ___?' (many).",
              "They answer with 'It's ...' or 'They're ...'. Then they turn and ask the next friend.",
              "Teacher: after the last round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Where's the ___?", "Where are the ___?"],
            feedback: fixWhere,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Where's ...?' automatic. Time the whole circle and tell them; children love beating their own time. Use one card and two cards so the children must choose between 'Where's' and 'Where are'. Listen for 'It' without the 's.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["It's in / on / under the ___.", "They're in / on / under the ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a second place: 'It's in the nest. The nest is in the tree.'" },
            ],
          },
        },
        {
          after: "Ball toss: ask and throw",
          slide: {
            kind: "writing",
            title: "My animal map: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to each animal on the map.",
              "Plan: draw three animals in the boxes. Say where each one is.",
              "Write: start with Look at my animal map. Then one sentence for each box. One animal: is. More than one: are.",
              "Check: tick the checklist. Your partner points to every is and every are.",
              "Teacher: look only at is / are and the -s on more than one animal. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The pond map", text: "Look at my animal map. The frogs are in the pond. The fox is under the tree. The chicks are in the nest." },
            organiser: [
              { label: "Animal 1", prompt: "Draw one or more animals and the place. Say where they are." },
              { label: "Animal 2", prompt: "Draw another animal and its place. In, on, under or next to?" },
              { label: "Animal 3", prompt: "Draw a third animal and its place." },
            ],
            frames: ["Look at my animal map.","The ___ is / are ___ the ___.","The ___ is / are ___ the ___.","The ___ is / are ___ the ___."],
            checklist: ["One thing: is. More than one: are","The -s on more than one animal","A capital letter at the start and a full stop at the end"],
            sayIt: "Show your map to your partner and read your paragraph. Then tell it again without looking.",
            teacherNote: "Vietnamese learners often drop 'be' ('The frog in the pond'), so listen for is / are. The drawings are the plan. Mark only two things and let the child find the mistake from your dot.",
            tiers: [
              {"level":"Support","task":"Copy the frames and fill in the animal and the place."},
              {"level":"Core","task":"Write three or four sentences about your map."},
              {"level":"Stretch","task":"Add a question and its answer: 'Where are the mice? They're in the field.'"},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u05-l4": {
      objectives: ["I can say 'I see two frogs and three foxes.' with the -s sounds."],
      trim: { "Chant: Who lives here?": 3, "Many animals: plurals game (SB 55 F)": 6, "Freeze dance: one and many": 3 },
      add: [
        {
          after: "Tell your partner about an animal home",
          slide: {
            kind: "fluency",
            title: "Pond talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same animal talk to three friends. Each talk is shorter and smoother.",
            chunks: ["I see two frogs in the pond.", "Three foxes sleep in the woods.", "There are five fish in the pond.", "The mice live in the field."],
            recycle: ["Where are the chicks? They're in the nest.", "Where's the eagle? It's in the sky."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your animal talk. The listener counts the animals on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "After each round, line B moves one step to the left: a new partner for every round.",
              "Then line B talks, with the same three rounds.",
            ],
            feedback: fixPlural,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. 4-3-2 builds fluency, not accuracy, so the one-minute fix between round 1 and 2 is where the plural -s gets better. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I see two ___.", "They live in the ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a question: 'Where are the mice? They're in the field.'" },
            ],
          },
        },
        {
          after: "Many animals: plurals game (SB 55 F)",
          slide: {
            kind: "writing",
            title: "Join the animals with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner. Is the -s there?",
            ],
            items: [
              { q: "I see a frog. I see a fish. (and)", answer: "I see a frog and a fish." },
              { q: "Frogs live in a pond. Fish live in a pond. (and)", answer: "Frogs and fish live in a pond." },
              { q: "The mouse is small. The mouse is gray. (and)", answer: "The mouse is small and gray." },
              { q: "Foxes live in the woods. Squirrels live in the woods. (and)", answer: "Foxes and squirrels live in the woods." },
            ],
            checklist: ["Only one 'I see' or 'live' in my sentence", "'and' joins the two things", "Many things: -s, -es, mice or fish"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining has good research support as a way to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I see'. Foxes and squirrels also practise the -es ending.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three animals: 'I see frogs, fish and mice.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u05-l5": {
      objectives: ["I can ask and answer 'Where's the ___? Where are the ___?' three times, faster."],
      trim: { "Hide and find the animals": 5, "Remember it!": 5 },
      add: [
        {
          after: "Animal map: where are they?",
          slide: {
            kind: "fluency",
            title: "Animal map again: three tries",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same animal map talk three times with new partners. Each time, say it more smoothly.",
            chunks: ["Where's the frog? It's on a log.", "Where are the frogs? They're in the pond.", "Where's the squirrel? It's next to the tree.", "Where are the mice? They're under the leaves."],
            recycle: ["Watch out! It's a hive.", "Three foxes sleep in the woods."],
            rounds: [
              { seconds: 60, say: "Partner 1: use the animal map. Ask and answer about every animal." },
              { seconds: 50, say: "New partner. The same map, a little faster." },
              { seconds: 40, say: "New partner. Can you do it without stopping?" },
            ],
            steps: [
              "Look at the animal map. Ask 'Where's the ...?' for one animal and 'Where are the ...?' for two or more.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes on the board, then go on.",
              "Change partners when you hear the bell.",
              "The listener ticks each question and answer they hear.",
            ],
            feedback: fixWhere,
            teacherNote: "Task repetition: the same task with new partners makes the grammar automatic without making it boring. Spacing matters, so mix in one old phrase from Unit 4 or the warning phrases from Lesson 4. Listen for 'Where's' versus 'Where are' and for the final -s.",
            tiers: [
              { level: "Support", task: "Use the frames and point to the map.", frames: ["Where's the ___? It's ___.", "Where are the ___? They're ___."] },
              { level: "Core", task: "Ask and answer without looking at the frames." },
              { level: "Stretch", task: "Add a comment: 'Where's the frog? It's on a log. Be careful!'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Find my animals: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each animal and its place.",
              "Plan: draw three animals in the boxes. Say a sentence for each box.",
              "Write: use the frames. The last box is a question and its answer.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop or question mark.",
              "Teacher: look only at Where's / Where are and the plural -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: Find my animals", text: "The squirrel is next to the big tree. The mice are under the leaves. Where's the frog? It's in the pond!" },
            organiser: [
              { label: "Squirrel", prompt: "Draw one animal and its place. Say where it is." },
              { label: "Mice", prompt: "Draw two or more animals and their place." },
              { label: "Question", prompt: "Draw a hidden animal. Ask: where is it?" },
            ],
            frames: ["The ___ is ___ the ___.","The ___ are ___ the ___.","Where's the ___?","It's ___ the ___!"],
            checklist: ["One thing: Where's / is. More than one: Where are / are","The -s on more than one animal","A capital letter at the start and a full stop, ? or ! at the end"],
            sayIt: "Read your paragraph to your partner. Your partner says where the hidden animal is.",
            teacherNote: "Mark only two things (Where's / Where are and the plural -s) and let the child find the mistake from your dot. The paragraph can be the script for the recorded talk at home.",
            tiers: [
              {"level":"Support","task":"Copy the first two frames and fill in one animal each."},
              {"level":"Core","task":"Write three or four sentences, with a question at the end."},
              {"level":"Stretch","task":"Add a sentence about a fourth animal, with 'next to' or 'on'."},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Where are the toys?",
        prompt: "Hide one toy animal and two more toy animals at home. Ask 'Where's the ___?' and 'Where are the ___?' and show the answers to the camera.",
        length: "30-60 seconds",
        steps: [
          "Hide one toy and two other toys in a place at home.",
          "Practise your questions and answers three times, a little faster each time.",
          "Record it once. Show each place as you talk.",
          GROWN_UP,
        ],
        maxSeconds: 90,
        kidSummary: "Ask where one thing is and where many things are, and answer with in, on, under or next to.",
        words: ["in", "on", "under", "next to", "nest", "pond", "tree"],
        grammar: ["Where's the ___? It's ___ the ___.", "Where are the ___? They're ___ the ___."],
        rubric: [
          { label: "Where's / Where are", description: "Asks about one and about many things correctly.", weight: 3 },
          { label: "Place words", description: "Uses in, on, under or next to in the answers.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about two or three things.", weight: 3 },
          { label: "Clear endings", description: "The 's, 're and the final -s can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Where's the ___?", "It's ___ the ___."], tips: ["Point to each place."] },
          { level: "Core", who: "Most children", frames: ["Where's the ___? It's ___ the ___.", "Where are the ___? They're ___ the ___."], tips: ["Ask about one thing and about two things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Where's the ___? It's ___ the ___, next to the ___.", "Watch out! Be careful!"], tips: ["Ask your grown-up a question and add a warning."] },
        ],
      },
    },
  },
};
