import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 16 "Let's Make
// Music!" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 15's phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Every other lesson ends with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause: 'Is she ...?', or hold up a finger for the missing word) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s and -ing clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U16Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u16-l1": {
      objectives: ["I can say 'Can you clap? Yes, I can.' fast, without stopping."],
      trim: { "Slap the card": 3, "Mime it!": 5, "Music Simon Says": 4 },
      add: [
        {
          after: "What can you do?",
          slide: {
            kind: "fluency",
            title: "Music sprint: Can you ___?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["Can you clap?", "Yes, I can. I can clap!", "No, I can't.", "I can sing and dance.", "I like to practice."],
            recycle: ["I want a drum, please.", "You can shake it."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher mimes an action, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one mimes, the other asks 'Can you ___?' and the first answers. Swap on the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Watch the mime or the picture card. Say a WHOLE sentence: 'I can clap.' or 'Can you clap?'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them; then go on.",
            ],
            prompts: ["(card: clap)", "(card: sing)", "(card: dance)", "(card: take pictures)", "(card: practice an instrument)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: the point is to say 'I can sing and dance' as one smooth piece. Listen for 'I can to sing' and 'Yes, I can't'. Prompt with a pause: 'I can ... ?' Mix Unit 15's 'You can shake it' cards in every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I can ___.", "Can you ___?"] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second thing: 'I can sing and I can dance.'", frames: ["I can ___ and I can ___."] },
            ],
          },
        },
        {
          after: "Think and guess (SB 157 Think, D)",
          slide: {
            kind: "writing",
            title: "Grow my 'I can' sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the extra word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I can clap. (add: my hands)", answer: "I can clap my hands." },
              { q: "I can sing. (add: a song)", answer: "I can sing a song." },
              { q: "I can dance. (add: and sing)", answer: "I can dance and sing." },
            ],
            frames: ["I can ___ and ___.", "I can clap my ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "I can + the action word, with no 's' (I can clap, not I can claps)"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I can clap my hands and stamp my feet.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u16-l2": {
      objectives: ["I can tell the problem and the solution, faster each time."],
      add: [
        {
          after: "Problem and solution chart",
          slide: {
            kind: "fluency",
            title: "Problem and solution: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["The children have a problem.", "They have no instruments.", "They think and have an idea.", "They shake the jars and strike the buckets.", "Now they have a band!"],
            recycle: ["You strike it.", "It's loud."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the three picture cards: problem, idea, solution." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for the problem, two for the idea, three for the solution.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them, then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: children with no instruments)", "(picture: a child with an idea)", "(picture: children with jars and boxes)"],
            feedback: correct,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Listen for 'They has' and a dropped -s in 'jars' and 'buckets'. Keep the three picture cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["The problem is ___.", "They have an idea.", "Now they have ___!"] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add a feeling: 'They are sad. Then they are happy!'" },
            ],
          },
        },
        {
          after: "What do they make?",
          slide: {
            kind: "writing",
            title: "Write a problem and a solution",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the problem and the solution.",
              "Write your own problem and solution with the frames.",
              "Read them to your partner. Can they hear the solution?",
            ],
            text: { title: "A small problem", text: "We have a problem. We have no drum! We have an idea. We strike a box and shake a jar. It's loud. Now we have a band!" },
            frames: ["We have a problem. We have no ___.", "We have an idea. We ___.", "Now we have ___!"],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation point at the end", "One problem sentence and one solution sentence"],
            sayIt: "Read your problem and solution to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Copy the first two sentences of the model and change one word." },
              { level: "Core", task: "Write a problem sentence and a solution sentence of your own." },
              { level: "Stretch", task: "Write three sentences: the problem, the idea and the solution." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My problem and my solution",
        prompt: "Tell us a small problem and its solution. Show a jar, a box or a spoon: it can be your drum!",
        length: "30-60 seconds",
        steps: [
          "Look at your problem and solution sentences from class.",
          "Say them three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say your problem, your idea and your solution, and keep talking without long stops.",
        words: ["problem", "solution", "idea", "drum", "shake", "strike"],
        grammar: ["We have a problem.", "We have an idea.", "Now we have ___!"],
        rubric: [
          { label: "Problem and solution", description: "Says a problem and a solution that fixes it.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: problem, solution, idea, shake, strike.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Have and -s", description: "Says 'We have ...', not 'We has', and the -s on jars, boxes or buckets can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["We have a problem.", "We have an idea.", "Now we have ___!"], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["We have a problem. We have no ___.", "We have an idea. We ___ and ___.", "Now we have ___!"], tips: ["Say what you shake or strike."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["First we are sad. Then we are happy!", "My favorite part is ___ because ___."], tips: ["Add how you feel and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u16-l3": {
      objectives: ["I can ask 'Is she dancing?' and 'Are they singing?' and answer fast."],
      trim: { "Mime and ask": 5, "Guess who? (action groups)": 6 },
      add: [
        {
          after: "Choose a person (SB 161 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is she ___ing?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Is she dancing?", "Yes, she is.", "Are they singing?", "No, they aren't.", "Are you clapping? Yes, I am."],
            recycle: ["I'm shaking the tambourine.", "It's loud."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds an action picture." },
              { seconds: 60, say: "Swap pictures. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your picture so only you can see it.",
              "Ask the friend on your left about the picture they hold: 'Is he playing the drum?'",
              "They answer: 'Yes, he is.' or 'No, he isn't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Is he ___ing?", "Is she ___ing?", "Are they ___ing?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Is she ...?' and 'Are they ...?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Are she singing?' and 'Yes, she dancing': prompt with a raised finger and 'Yes, she i...?'",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, he is.' or 'No, he isn't.' and pass the question on with the frame on the board." },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a second sentence: 'No, she isn't. She's clapping.'" },
            ],
          },
        },
        {
          after: "What are your classmates doing? (SB 161 E)",
          slide: {
            kind: "writing",
            title: "Listen and write: the band",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Remember: Is for one person, Are for more than one.",
              "Listen to the short text. Do not write yet.",
              "Listen again and write the words you hear. Then fix the text with your partner.",
            ],
            text: { title: "Look at the band!", text: "Look at the band! Is the girl singing? Yes, she is. Are the boys dancing? No, they aren't. They are playing drums." },
            frames: ["Is the ___ ___ing?", "Yes, she is. / No, he isn't.", "They are ___ing."],
            checklist: ["A question mark after each question", "Is for one person and Are for more than one", "-ing at the end of the action words"],
            sayIt: "Read the fixed text to your partner, then say it again without looking.",
            teacherNote: "A dictogloss for six-year-olds: read the text twice at a natural speed, then let pairs rebuild it. It is a short text on purpose. Remind the class of the Is / Are rule in one sentence before you read, and point to the board while you do. The pairs do not need the exact words: praise any text that says the same things.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and put them in the frames." },
              { level: "Core", task: "Write the whole text with your partner and fix it." },
              { level: "Stretch", task: "Write the text, then add one more question and answer." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u16-l4": {
      objectives: ["I can say 'I'm', 'She's' and 'It's' in a quick, smooth sentence."],
      trim: { "Show time chant": 3, "Show time: guess the show": 3, "Run to the show!": 3, "Squash it! Contraction clap": 3 },
      add: [
        {
          after: "Squash it! Contraction clap",
          slide: {
            kind: "fluency",
            title: "Show time: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same show talk three times. Each time it is smoother.",
            chunks: ["I'm watching the parade.", "She's dancing.", "It's loud!", "They aren't singing.", "What's he doing?"],
            recycle: ["Is she dancing? Yes, she is.", "Are they singing? No, they aren't."],
            rounds: [
              { seconds: 60, say: "Look at the show picture. Tell your partner what you see with the chunks." },
              { seconds: 50, say: "Same picture, same partner. Say it again, smoother." },
              { seconds: 40, say: "New picture, new partner. Say it a third time, fast and clear!" },
            ],
            steps: [
              "Look at the show picture. Say what you see with 'I'm', 'She's', 'It's'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Im' or 'She dancing') and the class fixes them, then go on.",
              "Say it again to the same partner, then to a new partner.",
              "The listener counts the squashed words on their fingers.",
            ],
            prompts: ["(picture: a parade)", "(picture: a puppet show)", "(picture: a concert)"],
            feedback: correct,
            teacherNote: "Task repeat: the same job a second and third time lets children put their attention on sound and grammar. Listen for squashed words said as two words ('I am watching' is fine, but slow) and for 'She dancing'. Say 'I'm' and 'she's' as one quick sound yourself, and for a wrong form just say it right and let them echo.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I'm ___ing.", "It's ___!"] },
              { level: "Core", task: "Say four sentences without the board." },
              { level: "Stretch", task: "Add a no sentence: 'They aren't singing. They're dancing!'" },
            ],
          },
        },
        {
          after: "Write the contractions (SB 163 F)",
          slide: {
            kind: "writing",
            title: "Fix the squashed words",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing apostrophe or a missing capital letter.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Im watching the show.", answer: "I'm watching the show." },
              { q: "she's dancing", answer: "She's dancing." },
              { q: "They arent singing.", answer: "They aren't singing." },
              { q: "Its loud!", answer: "It's loud!" },
            ],
            checklist: ["An apostrophe in the squashed word", "A capital letter at the start", "A full stop or an exclamation point at the end"],
            sayIt: "Read your fixed sentences to the class in a show-time voice.",
            teacherNote: "The apostrophe stands where letters are missing: I'm is I am with the 'a' gone. Fix one together first, then let the pairs go. Praise a child who spots a second mistake in one sentence.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more squashed sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite show",
        prompt: "Show a picture of your favorite show or perform a mini show. Tell us what you like and what is happening.",
        length: "30-60 seconds",
        steps: [
          "Draw your favorite show or find a picture.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use 'I'm', 'She's' and 'It's'.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what show you like and what is happening, with squashed words, and keep talking without long stops.",
        words: ["parade", "show", "dance", "sing", "clap", "loud"],
        grammar: ["I'm ___ing.", "She's / He's ___ing.", "It's ___!"],
        rubric: [
          { label: "My show", description: "Says which show they like and one reason.", weight: 3 },
          { label: "Squashed words", description: "Uses I'm, she's or it's in a sentence.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -ing at the end of the action words can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite show is the ___.", "It's ___!"], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["My favorite show is the ___.", "I'm ___ing the show.", "It's loud and fun!"], tips: ["Say what you are doing in the show."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["She's ___ing and he's ___ing.", "They aren't ___ing. They're ___ing!"], tips: ["Say what two people are doing, and what they aren't doing."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u16-l5": {
      objectives: ["I can tell my partner about the instrument, three times, faster each time."],
      trim: { "Act it out: the music class": 5, "Shake, bang, stop chant": 3, "Project: make a percussion instrument (SB 165 B)": 14 },
      add: [
        {
          after: "Talk about the instruments (SB 165 D)",
          slide: {
            kind: "fluency",
            title: "Instrument talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 5,
            goal: "Give the same instrument talk to three friends. Each talk is shorter and smoother.",
            chunks: ["I like the shaker.", "I'm playing the shaker.", "She's striking the drum.", "What's he doing?", "We're making music!"],
            recycle: ["You can shake it.", "It's soft."],
            rounds: [
              { seconds: 50, say: "Partner 1: give your instrument talk. The listener counts the sentences on their fingers." },
              { seconds: 35, say: "Partner 2: the same talk in less time." },
              { seconds: 25, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. Listen for 'She striking' and 'He play the drum', and for a missing 's in 'She's'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I like the ___.", "I'm ___ing the ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a question: 'What's she doing? She's shaking the jar.'" },
            ],
          },
        },
        {
          after: "Same or different? Talk in groups",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "I'm shaking a jar. I'm striking a box. (and)", answer: "I'm shaking a jar and striking a box." },
              { q: "She's clapping. She's singing. (and)", answer: "She's clapping and singing." },
              { q: "The drum is loud. The drum is fun. (and)", answer: "The drum is loud and fun." },
            ],
            checklist: ["Only one 'I'm' or 'She's' in my sentence", "'and' joins the two things", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I'm'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'I'm shaking, striking and clapping.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u16-l6": {
      objectives: ["I can ask and answer 'Is he dancing?' and 'Are they singing?' quickly."],
      trim: { "Band relay: look, run, ask!": 7, "Remember it!": 5 },
      add: [
        {
          after: "Band practice: find the difference",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Is and Are",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["Is he drumming? Yes, he is.", "Is she singing? No, she isn't.", "Are they dancing? Yes, they are.", "Are you clapping? Yes, I am.", "Look! She's playing the drum."],
            recycle: ["I'm shaking the tambourine.", "You can strike it."],
            rounds: [
              { seconds: 50, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute and fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of Units 15 and 16: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. Listen for 'Are she' and 'Is they', and for 'Yes, I'm' instead of 'Yes, I am'.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["Is he ___ing?", "Are they ___ing?"] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Answer and add what they are doing: 'No, she isn't. She's dancing.'" },
            ],
          },
        },
        {
          after: "Write: ask and answer",
          slide: {
            kind: "writing",
            title: "Write about the band",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the question mark.",
              "Write two questions about the band picture, and the answers.",
              "Swap with your partner. Do the answers match the picture?",
            ],
            text: { title: "The class band", text: "Is the boy drumming? Yes, he is. Are the girls singing? No, they aren't. They are dancing. It's a happy band!" },
            frames: ["Is the ___ ___ing?", "Yes, he is. / No, she isn't.", "Are the ___ ___ing?"],
            checklist: ["Is for one person, Are for more than one", "A question mark at the end of each question", "A capital letter at the start of each sentence"],
            sayIt: "Ask your partner your questions out loud and listen to the answers.",
            tiers: [
              { level: "Support", task: "Copy one question and one answer from the model." },
              { level: "Core", task: "Write two questions and two answers about the picture." },
              { level: "Stretch", task: "Write three questions and add 'No, they aren't. They're ___ing.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Look! What are they doing?",
        prompt: "Go to a window or look at a family photo with a grown-up. Ask 'Is he ___ing?' or 'Are they ___ing?' and answer. Show each one to the camera.",
        length: "30-60 seconds",
        steps: [
          "Choose three people or animals to talk about.",
          "Practise your questions and answers three times.",
          "Record it once. Point to each one as you talk.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Ask with 'Is' or 'Are', answer 'Yes, he is.' or 'No, they aren't.', and say what they are doing.",
        words: ["sing", "dance", "clap", "drum", "play", "watch"],
        grammar: ["Is he / she ___ing? Yes, he is. / No, she isn't.", "Are they ___ing? Yes, they are."],
        rubric: [
          { label: "Questions with Is and Are", description: "Asks 'Is she ___ing?' or 'Are they ___ing?' with the right word first.", weight: 3 },
          { label: "Short answers", description: "Answers 'Yes, she is.' or 'No, they aren't.', not 'Yes, she dancing.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops about three people or animals.", weight: 2 },
          { label: "Clear -ing", description: "The -ing at the end of the action words can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Is he ___ing? Yes, he is!", "Are they ___ing? No, they aren't."], tips: ["Point to each one."] },
          { level: "Core", who: "Most children", frames: ["Is she ___ing? Yes, she is. She's ___ing.", "Are they ___ing? No, they aren't."], tips: ["Find one 'No' answer too."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Are you ___ing? Ask your grown-up!", "We're ___ing together."], tips: ["Ask your grown-up a question and say what you are doing."] },
        ],
      },
    },
  },
};
