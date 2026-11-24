import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 8 "The Four
// Seasons" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's "I do / you do / I don't / Do you?"
// language said again and again as whole sentences, a little faster each round, with
// Unit 7's season phrases mixed back in) and one short writing routine (say it, write it,
// read it back). Every other lesson also ends with a recorded talk for home. Time comes
// from warm-ups, games and repeats, never from the book pages or the grammar. All text is
// original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds, give one minute: write them on the board and let the class fix them, then children say it again with the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, or hold up a finger for the missing word) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final sound clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u08-l1": {
      objectives: ["I can say what I do in the seasons, in a whole sentence, fast."],
      trim: { "Four seasons chant": 3, "Seasons Simon Says": 5 },
      add: [
        {
          after: "Mime and say",
          slide: {
            kind: "fluency",
            title: "Season sprint: I build, I make, I grow",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I build a snowman.", "I make a swing.", "I grow flowers.", "I watch birds.", "You bring a book."],
            recycle: ["It gets hot in the summer.", "It snows in the winter."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card and does the action. The class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence and does the action. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Do the action and say a WHOLE sentence: 'I build a snowman.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 2, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: snowman)", "(card: swing)", "(card: flowers)", "(card: birds)", "(card: book)"],
            feedback:
              fix + " Example: a child says 'I build snowman.' Point to the board frame 'I build a ___.' and pause at 'a'. For 'I make a swing' with a missing /ng/ or /k/ sound, say it right once and let the child echo.",
            teacherNote:
              "Whole sentences only, never single words: the point is to say 'I build a snowman' as one smooth piece. Use big actions so meaning is clear and children are moving. Mix in Unit 7's 'It gets hot / It snows' cards every few turns so last unit's phrases stay fast. Listen for a missing 'a' and for final sounds (build, grow, watch).",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I ___ a ___.", "I ___ ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a season: 'In winter, I build a snowman.'", frames: ["In ___, I ___."] },
            ],
          },
        },
        {
          after: "Look at the captions (SB 77 C)",
          slide: {
            kind: "writing",
            title: "My summer paragraph: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the season, the two sentences about what I do, and the ending.",
              "Plan: draw three boxes. Say one sentence for each box to your partner.",
              "Write: four short sentences. Use the frames. Copy and finish them if you need help.",
              "Check: tick the checklist. Your partner points to every capital letter.",
              "Teacher: look only at capital letters and I make / I build with no -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my summer",
              text: "I like the summer. I make a swing and I build a tree house. I watch birds in the tree. Summer is fun!",
            },
            organiser: [
              { label: "My season", prompt: "Draw the season you like. Say its name." },
              { label: "What I do", prompt: "Draw two things you do. Say: I make ... I build ..." },
              { label: "My ending", prompt: "Draw your face. Do you feel happy? Say: ___ is fun!" },
            ],
            frames: ["I like the ___.", "I make a ___ and I build a ___.", "I watch ___ in the tree.", "___ is fun!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end", "I make, I build, I grow: no -s after I", "Four short sentences: season, two things I do, my ending"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for six-year-olds: four short sentences planned by drawing in three boxes (the middle box gives two sentences). Children may copy the frames and finish them. Mark only two things (capital letters, no -s after I) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["I like the ___.", "I ___ a ___.", "___ is fun!"] },
              { level: "Core", task: "Write four sentences: season, two things I do, my ending." },
              { level: "Stretch", task: "Add one more sentence: 'I watch birds with my friend.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u08-l2": {
      objectives: ["I can tell what happens to a tree in the four seasons, faster each time."],
      add: [
        {
          after: "Class chart: what do we see?",
          slide: {
            kind: "fluency",
            title: "Tree seasons: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same four seasons three times. Each time is shorter, smoother and faster.",
            chunks: ["In spring, flowers grow.", "In summer, I make a swing.", "In fall, apples fall.", "In winter, I build a snowman."],
            recycle: ["It gets cold in the winter.", "It rains in the spring."],
            rounds: [
              { seconds: 60, say: "Tell your partner the four seasons. Use the four picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for spring, two for summer, three for fall, four for winter.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(picture: spring flowers)", "(picture: summer swing)", "(picture: fall apples)", "(picture: winter snowman)"],
            feedback:
              fix + " Example: a child says 'In fall, apple fall.' Hold up a finger for the missing -s and say 'Apples ...?' with rising voice.",
            teacherNote:
              "This is the same telling three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes the second telling more accurate too. Keep the four picture cards on the board for Support children. Listen for the plural -s in flowers and apples.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["In spring, ___.", "In summer, ___.", "In fall, ___.", "In winter, ___."] },
              { level: "Core", task: "Tell all four seasons without the frames." },
              { level: "Stretch", task: "Add what you don't do: 'In winter, I build a snowman. I don't make a swing.'" },
            ],
          },
        },
        {
          after: "Which season? Picture hunt",
          slide: {
            kind: "writing",
            title: "My tree paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Point to the tree sentence and then to each season.",
              "Plan: draw four boxes. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with In spring, In summer, In winter.",
              "Check: tick the checklist. Your partner points to every capital letter.",
              "Teacher: look only at capital letters and I make / I build with no -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my tree",
              text: "I have a tree. In spring, I watch birds. In summer, I make a swing. In winter, I build a snowman.",
            },
            organiser: [
              { label: "My tree", prompt: "Draw your tree. Say: I have a tree." },
              { label: "Spring", prompt: "Draw what you do in spring. Say it in a whole sentence." },
              { label: "Summer", prompt: "Draw what you do in summer. Say it in a whole sentence." },
              { label: "Winter", prompt: "Draw what you do in winter. Say it in a whole sentence." },
            ],
            frames: ["I have a ___.", "In spring, I ___ ___.", "In summer, I ___ a ___.", "In winter, I ___ a ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "I make, I grow, I build: no -s after I", "One sentence for each box"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Four short sentences, one for each drawing, so the drawings are the plan. This paragraph is the script for the recorded talk at home, My tree in four seasons. Mark only two things (capital letters, no -s after I) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["In spring, I ___ ___.", "In winter, I ___ a ___."] },
              { level: "Core", task: "Write four sentences: tree, spring, summer, winter." },
              { level: "Stretch", task: "Add fall: 'In fall, I bring a book to my tree.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My tree in four seasons",
        prompt: "Show your picture of a tree. Tell what you do by the tree in spring, summer, fall and winter.",
        length: "30-60 seconds",
        steps: [
          "Look at your tree picture from class.",
          "Say your four seasons three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Tell what you do in each season and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "build", "make", "grow", "watch"],
        grammar: ["In spring, I ___.", "I build / make / grow / watch ___."],
        rubric: [
          { label: "Four seasons", description: "Says something about spring, summer, fall and winter.", weight: 3 },
          { label: "I do it", description: "Uses 'I' with the action word: I build, I make, I grow. No -s after I.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of flowers and apples can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In spring, I ___.", "In summer, I ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["In spring, I grow ___.", "In summer, I make ___.", "In fall, I watch ___."], tips: ["Say one sentence for every season."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In winter, I build a ___. I don't ___.", "My favorite season is ___."], tips: ["Say something you don't do, and your favorite season."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u08-l3": {
      objectives: ["I can ask 'Do you ___?' and answer 'Yes, I do.' or 'No, I don't.' fast."],
      trim: { "Find someone who...": 6 },
      add: [
        {
          after: "Now ask and answer (SB 81 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Do you ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Do you build a snowman?", "Yes, I do.", "No, I don't.", "Do you fly a kite?", "I don't build a snowman in the summer."],
            recycle: ["It snows in the winter.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds an action card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Do you ___?' Use the action on your card.",
              "They answer: 'Yes, I do.' or 'No, I don't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["Do you ___?", "Yes, I do. / No, I don't."],
            feedback:
              fix + " Example: a child says 'Do you watching birds?' or 'Yes, I like.' Prompt with a finger and 'Do you ...?' and pause, then 'Yes, I d...?' so the child finishes the answer. A recast is fine for the sound in 'don't'.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Do you ...?' automatic. Time the whole circle and tell them: children love beating their own time. Watch for 'Yes, I like' and for 'Do you watching': both are common because Vietnamese questions do not use 'do'. Listen for the /t/ in 'don't'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I do.' or 'No, I don't.' and pass the question on with the frame on the board.", frames: ["Do you ___?", "Yes, I do. / No, I don't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a sentence: 'No, I don't. I don't build a snowman in the summer.'" },
            ],
          },
        },
        {
          after: "Imagine you have a tree (SB 81 E)",
          slide: {
            kind: "writing",
            title: "What I like and don't like: plan, write, check",
            routine: "paragraph",
            genre: "likes and dislikes",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the season I like, what I do, what I don't do, and the ending.",
              "Plan: draw three boxes. Say one sentence for each box to your partner.",
              "Write: one sentence for each box, and an ending. Use the frames.",
              "Check: tick the checklist. Your partner points to every capital letter and every don't.",
              "Teacher: look only at capital letters and don't + a short action word. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my winter",
              text: "I like the winter. I build a big snowman. I don't make a swing in the winter. I love winter!",
            },
            organiser: [
              { label: "I like", prompt: "Draw your favorite season. Say: I like the ___." },
              { label: "I do", prompt: "Draw one thing you do. Say: I build a ___." },
              { label: "I don't", prompt: "Draw one thing you don't do. Cross it out. Say: I don't ___." },
            ],
            frames: ["I like the ___.", "I ___ a ___.", "I don't ___ a ___ in the ___.", "I love ___!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end", "After don't, the action word is short: I don't make", "Four sentences: I like, I do, I don't, my ending"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This puts today's grammar, I do and I don't, into a short paragraph. The crossed-out drawing helps children see the I don't sentence. Mark only two things (capital letters, don't + short action word) and let the child find the mistake from your dot. If a child writes 'I don't makes' or 'I no make', point to the frame.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["I like the ___.", "I ___ a ___.", "I don't ___ a ___."] },
              { level: "Core", task: "Write four sentences: I like, I do, I don't, my ending." },
              { level: "Stretch", task: "Add one more thing you do: 'I watch birds in the winter.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u08-l4": {
      objectives: ["I can talk about what I do in a season three times, faster each time."],
      trim: { "Run and touch": 4, "Season actions chant": 3 },
      add: [
        {
          after: "What do you do in the spring? (SB 83 E)",
          slide: {
            kind: "fluency",
            title: "Season talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same season talk to three friends. Each talk is shorter and smoother.",
            chunks: ["In summer, I go to the beach.", "I eat ice cream and I swim.", "I don't drink hot chocolate in summer.", "Do you go to the beach? Yes, I do!"],
            recycle: ["I build a snowman.", "I grow flowers."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your season talk. The listener counts the things you do on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Me too!' if they do it too." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback:
              fix + " Example: a child says 'In summer, I goes to the beach.' Hold up a finger and say 'I ...?' and pause so the child says 'go'. If 'ice cream' sounds like 'ice clean', say it right and let the child echo.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The one-minute fix after round 1 is what turns fluency into more accurate fluency. Listen for no -s after I and for the final sounds in 'beach' and 'don't'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["In summer, I ___.", "I don't ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a question for the listener: 'Do you ride a bicycle in summer?'" },
            ],
          },
        },
        {
          after: "Commas jump (SB 83 F)",
          slide: {
            kind: "writing",
            title: "Join them: and, and commas",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the short sentences.",
              "Make ONE sentence. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "I ride a bicycle. I fly a kite. (and)", answer: "I ride a bicycle and fly a kite." },
              { q: "I drink hot chocolate. I build a snowman. (and)", answer: "I drink hot chocolate and build a snowman." },
              { q: "In summer, I eat ice cream. I go to the beach. (and)", answer: "In summer, I eat ice cream and go to the beach." },
              { q: "I plant flowers. I fly a kite. I ride a bicycle. (commas and and)", answer: "I plant flowers, fly a kite, and ride a bicycle." },
            ],
            checklist: ["Only one 'I' in my sentence", "'and' joins the things I do", "A full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I'. After 'and', the action word has no -s (I ride and fly).",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do items 1, 2 and 3." },
              { level: "Stretch", task: "Do all four, then join three things of your own with commas." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I do and what I don't do",
        prompt: "Pick a season. Tell us two things you do and one thing you don't do. Show a picture if you can!",
        length: "30-60 seconds",
        steps: [
          "Draw your season or find a picture at home.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use 'I' and 'I don't'.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what you do and what you don't do in a season, and keep talking without long stops.",
        words: ["summer", "winter", "beach", "ice cream", "hot chocolate", "kite", "bicycle"],
        grammar: ["In ___, I ___.", "I don't ___.", "Do you ___?"],
        rubric: [
          { label: "Do and don't", description: "Says two things he or she does and one thing he or she does not do.", weight: 3 },
          { label: "I don't + action", description: "Uses 'I don't' with a short action word: I don't ride, not 'I no ride'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Season words", description: "Uses words from the unit: beach, kite, hot chocolate, ice cream.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In ___, I ___.", "I don't ___."], tips: ["Point to each picture as you say it."] },
          { level: "Core", who: "Most children", frames: ["In ___, I ___ and I ___.", "I don't ___ in ___."], tips: ["Say the season in every sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In ___, I ___, ___, and ___.", "Do you ___? I do!"], tips: ["Say three things you do, and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u08-l5": {
      objectives: ["I can say what I do in my favorite season, then say it again better."],
      add: [
        {
          after: "Show your journal (SB 85 C)",
          slide: {
            kind: "fluency",
            title: "Journal talk: say it again, better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say your journal talk, plan for one minute, then say it again to a new partner.",
            chunks: ["My favorite season is summer.", "I go to the beach and I swim.", "I don't build a snowman.", "Do you like summer?"],
            recycle: ["In spring, I grow flowers.", "It snows in the winter."],
            rounds: [
              { seconds: 60, say: "Say your journal talk to your partner. Point to your pictures." },
              { seconds: 45, say: "New partner. The same talk, one more sentence if you can." },
            ],
            steps: [
              "Look at your seasons journal. Pick the page you like best.",
              "Say your talk to your partner. The listener asks one question: 'Do you ___?'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "Find a new partner and say the same talk again, a little faster.",
            ],
            feedback:
              fix + " Example: a child says 'I not build a snowman.' Point to the frame 'I don't ___.' and pause. A child who says 'I like beach' gets a quick recast 'the beach' and echoes.",
            teacherNote:
              "Task repetition: the same task a second time with a new partner is easier, so the child's attention moves to speed and accuracy. The planning minute is the correction. The listener's job (one question) keeps the partner active. Listen for I / I don't, and for the missing 'the' before beach (accept it today).",
            tiers: [
              { level: "Support", task: "Say two sentences from your journal with the frames.", frames: ["My favorite season is ___.", "I ___."] },
              { level: "Core", task: "Say three sentences, one with 'I don't'." },
              { level: "Stretch", task: "Say four sentences and answer the listener's question: 'Yes, I do.'" },
            ],
          },
        },
        {
          after: "Make a seasons journal (SB 85 B)",
          slide: {
            kind: "writing",
            title: "Model, then my journal page",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model. Find the word 'I' and the word 'don't'.",
              "Write three sentences about your favorite season with the frames.",
              "Read them to your partner. Do they match your picture?",
            ],
            text: {
              title: "My favorite season",
              text: "My favorite season is fall. I watch the leaves fall. I make apple pie. I don't build a snowman.",
            },
            frames: ["My favorite season is ___.", "I ___.", "I don't ___."],
            checklist: ["Every sentence starts with a capital letter", "Every sentence ends with a full stop", "After 'I don't', a short action word"],
            sayIt: "Read your page to a partner, then say it again without looking.",
            teacherNote: "Children write a model-shaped text of their own, so the frames carry the grammar. Point out that the model uses 'I' and 'I don't' and that the action word stays short. Accept a picture with labels from Support children.",
            tiers: [
              { level: "Support", task: "Copy the first frame and draw your season." },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Write four sentences and add 'because': 'I like fall because it is pretty.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u08-l6": {
      objectives: ["I can ask and answer 'Do you ___?' quickly, without looking."],
      trim: { "Jump the line": 8 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Units 7 and 8",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["In spring, I plant flowers.", "Do you fly a kite? Yes, I do.", "Do you ride a bicycle? No, I don't.", "I don't go to the beach in winter."],
            recycle: ["It gets hot in the summer.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 2, stop for one minute. Fix the two mistakes you heard most on the board, then go on.",
            ],
            feedback:
              fix + " Example: a child says 'Yes, I am.' for 'Do you fly a kite?' Hold up a finger and start 'Yes, I d...' and pause. For 'I don't' with a missing 't', say it right and let the child echo.",
            teacherNote:
              "A quick, high-energy recall of Units 7 and 8 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. Listen for 'Yes, I am' (it comes from 'Are you?') and for a missing 'do' in questions.",
            tiers: [
              { level: "Support", task: "Say the sentences with the cards in your hand." },
              { level: "Core", task: "Say the sentences when the card flips, without help." },
              { level: "Stretch", task: "Make your own sentence with 'but': 'I fly a kite, but I don't ride a bicycle.'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "Grow my champion sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add the words in the brackets.",
              "Write your big sentence. Say it to your partner.",
            ],
            items: [
              { q: "I plant flowers. (add: in the spring)", answer: "I plant flowers in the spring." },
              { q: "I don't go to the beach. (add: in the winter)", answer: "I don't go to the beach in the winter." },
              { q: "Do you fly a kite? (add: in the fall)", answer: "Do you fly a kite in the fall?" },
              { q: "I eat ice cream. (add: in the summer)", answer: "I eat ice cream in the summer." },
            ],
            frames: ["I ___ in the ___.", "Do you ___ in the ___?"],
            checklist: ["A capital letter at the start", "A full stop or a question mark at the end", "After 'I don't', a short action word"],
            sayIt: "Say all four big sentences to your partner, fast.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write a new small sentence for your partner to grow." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My season clues video",
        prompt: "Tell us two things you do and one thing you don't do in a season. Do not say the season! Can your grown-up guess it?",
        length: "30-60 seconds",
        steps: [
          "Choose a season and think of two things you do and one thing you don't do.",
          "Practise your clues three times, a little faster each time.",
          "Record it once. At the end, ask: 'Do you know my season?'",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Give clues with 'I' and 'I don't', ask a question at the end, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "kite", "beach", "snowman"],
        grammar: ["I ___.", "I don't ___.", "Do you know my season?"],
        rubric: [
          { label: "Clues", description: "Gives two things he or she does and one thing he or she does not do.", weight: 3 },
          { label: "I and I don't", description: "Says 'I ___' and 'I don't ___' with a short action word.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "A question", description: "Asks the viewer a question with 'Do you ...?'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I ___.", "I don't ___.", "Do you know my season?"], tips: ["Hold up a picture for each clue."] },
          { level: "Core", who: "Most children", frames: ["I ___ and I ___.", "I don't ___.", "Do you know my season?"], tips: ["Do not say the season until the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In my season, I ___ and I ___, but I don't ___.", "Do you ___ in my season?"], tips: ["Ask your grown-up a question about their season."] },
        ],
      },
    },
  },
};
