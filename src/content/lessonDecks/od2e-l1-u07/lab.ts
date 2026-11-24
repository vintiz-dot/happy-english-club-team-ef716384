import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 7 "Seasons All
// Year" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (weather and season sentences said again and
// again as whole phrases, a little faster each round, with Unit 6's phrases mixed back
// in) and one short writing routine (say it, write it, read it back). Lessons 2 and 5
// end with a recorded talk for home (Lesson 4 already has its season vlog). Time comes
// from games and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('It snow...?'), point to the frame, or hold up a finger for the missing -s ('It gets hot' / 'It snows'); for 'It doesn't snows', hold up a finger and say 'doesn't plus...?' so the child takes the s off. For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('gets', 'snows', 'rains'): children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u07-l1": {
      objectives: ["I can say 'It's hot!' and 'Is it cold? No, it isn't.' fast, without stopping."],
      trim: { "Freeze and show": 4, "Whisper chant": 3, "Watch and wow (SB 67 A)": 5, "Time words and weather words (SB 68 C)": 5 },
      add: [
        {
          after: "My favorite season (Think, SB 69)",
          slide: {
            kind: "fluency",
            title: "Weather sprint: Is it hot?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["It's hot!", "Is it cold? No, it isn't.", "Is it rainy? Yes, it is!", "My favorite season is summer."],
            recycle: ["I take care of the orangutan.", "What's this? It's a ball."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a weather card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card and asks 'Is it ___?', the other answers. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the weather card. Make the face and say a WHOLE sentence: 'It's hot!'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Yes, it's' or 'It hot') and let the class fix them; then go on.",
            ],
            prompts: ["(card: hot)", "(card: cold)", "(card: rainy)", "(card: snowy)", "(card: warm)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'It's hot!' is one smooth piece. Listen for 'It hot' (the be verb is missing, as in Vietnamese) and for 'Yes, it's': the short answer is 'Yes, it is.' Point to the frame on the board rather than saying it for the child. Mix in a Unit 6 card ('I take care of the orangutan.') every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It's ___.", "Is it ___? Yes, it is."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a feeling: 'It's cold. I like it!'", frames: ["It's ___. I like it!"] },
            ],
          },
        },
        {
          after: "What will we read? (SB 69 E)",
          slide: {
            kind: "writing",
            title: "Grow my weather sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the word in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see snow. (add: white)", answer: "I see white snow." },
              { q: "It's cold. (add: in winter)", answer: "It's cold in winter." },
              { q: "The sun is hot. (add: big)", answer: "The big sun is hot." },
            ],
            frames: ["I see ___ snow.", "It's ___ in ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "It's: I can hear the little 's'"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'It's hot and sunny in summer.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u07-l2": {
      objectives: ["I can tell about the four seasons, faster each time."],
      trim: { "Slap the season": 5 },
      add: [
        {
          after: "My favorite season: tell a friend",
          slide: {
            kind: "fluency",
            title: "Four seasons: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell about the four seasons three times. Each time is shorter, smoother and faster.",
            chunks: ["In spring, it gets warm.", "In summer, it's hot and sunny.", "In fall, it gets cool.", "In winter, it gets cold."],
            recycle: ["I put out food for the baby.", "I teach the baby to climb."],
            rounds: [
              { seconds: 60, say: "Tell your partner about the four seasons. Use the four picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the four cards in a row: spring, summer, fall, winter. Point and talk.",
              "Teacher: after round 1, stop for one minute. Put two sentences you heard with a mistake on the board; the class fixes them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(card: spring flowers)", "(card: summer sun)", "(card: fall leaves)", "(card: winter snow)"],
            feedback: correct,
            teacherNote: "The same four sentences three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Listen for 'it get warm' (the -s on gets) and for a missing 'it's' in 'In summer hot'. Keep the four cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["In spring, it gets ___.", "In summer, it's ___.", "In fall, it gets ___.", "In winter, it gets ___."] },
              { level: "Core", task: "Tell all four seasons without the frames." },
              { level: "Stretch", task: "Add what you see: 'In spring, it gets warm. I see flowers.'" },
            ],
          },
        },
        {
          after: "Reading detectives",
          slide: {
            kind: "writing",
            title: "Read the model, write a caption",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the capital letters and the full stops.",
              "Choose your favorite season. Write two sentences with the frames.",
              "Read them to your partner. Do they match your picture?",
            ],
            text: { title: "Summer", text: "It's summer. It's hot and sunny. I see a big sun. I like to swim. I like summer!" },
            frames: ["It's ___ and ___.", "I see ___.", "I like ___!"],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation point at the end", "My sentences match my picture"],
            sayIt: "Read your caption to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word each." },
              { level: "Core", task: "Write two sentences of your own." },
              { level: "Stretch", task: "Write three sentences and add 'It gets ___ in ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My season at home",
        prompt: "Show a picture or a real thing from one season. Tell us what the weather is like and what you see.",
        length: "30-60 seconds",
        steps: [
          "Choose one season. Draw a picture or find something from it.",
          "Say your season talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what the weather is like in your season, say what you see, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "hot", "cold", "warm", "cool"],
        grammar: ["In ___, it gets ___.", "In ___, it's ___.", "I see ___."],
        rubric: [
          { label: "Season and weather", description: "Names a season and says what the weather is like.", weight: 3 },
          { label: "Season words", description: "Uses words from the unit: spring, summer, fall, winter, hot, cold, warm, cool.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Gets and it's", description: "Says 'it gets' or 'it's' correctly; the -s in 'gets' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In ___, it's ___.", "I see ___."], tips: ["Hold up your picture and point to it."] },
          { level: "Core", who: "Most children", frames: ["In ___, it gets ___.", "It's ___ and ___.", "I see ___."], tips: ["Say three or four sentences."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In ___, it gets ___, and I like to ___.", "My favorite season is ___ because ___."], tips: ["Add what you like to do and why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u07-l3": {
      objectives: ["I can say what happens in a season: 'It snows in the winter.' and 'It doesn't snow in the summer.'"],
      trim: { "Yes or no walk": 6, "Which season am I?": 6 },
      add: [
        {
          after: "Now tell your partner (SB 73 E)",
          slide: {
            kind: "fluency",
            title: "Season chain: what about the winter?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Say it, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["It gets hot in the summer.", "It snows in the winter.", "It doesn't snow in the summer.", "What about the winter?"],
            recycle: ["What's this? It's a ___.", "I miss my friend."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a season card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your season card so only you can see it.",
              "Say a sentence about your card: 'It snows in the winter.' Then ask the friend on your left: 'What about the summer?'",
              "They say what happens, or what doesn't: 'It doesn't snow in the summer.' Then they ask the next friend.",
              "Teacher: after the first time round the circle, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["It ___s in the ___.", "It doesn't ___ in the ___.", "What about the ___?"],
            feedback: correct,
            teacherNote: "The chain makes every child say a 'does' sentence and a 'doesn't' sentence many times in a few minutes, which is what makes the -s and the bare word after 'doesn't' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'It snow' (hold up a finger and say 'It snow...?') and 'It doesn't snows' (say 'doesn't plus...?' and wait).",
            tiers: [
              { level: "Support", task: "Say the sentence from your card with the frame on the board.", frames: ["It ___s in the ___.", "It doesn't ___ in the ___."] },
              { level: "Core", task: "Say and ask without looking at the board." },
              { level: "Stretch", task: "Say both together: 'It gets hot in the summer, but it doesn't get hot in the winter.'" },
            ],
          },
        },
        {
          after: "Build a sentence",
          slide: {
            kind: "writing",
            title: "Fix the season sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a capital letter, a missing -s, an extra -s, or a missing doesn't.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "It snow in the winter.", answer: "It snows in the winter." },
              { q: "It doesn't snows in the summer.", answer: "It doesn't snow in the summer." },
              { q: "it gets hot in the summer.", answer: "It gets hot in the summer." },
              { q: "It not rain in the winter.", answer: "It doesn't rain in the winter." },
            ],
            checklist: ["Every sentence starts with a capital letter", "It snows, it gets: the -s is there", "After doesn't: no -s"],
            sayIt: "Read your fixed sentences to the class in a weather-reporter voice.",
            teacherNote: "Vietnamese verbs have no endings, so a missing -s on 'snows' and 'gets' is this class's most common slip. Two errors are teaching the same rule from both sides: -s after 'it', no -s after 'doesn't'. Fix item 1 together first, and say each -s clearly.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 (the -s and the capital letter)." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u07-l4": {
      objectives: ["I can tell about my favorite season three times, faster each time."],
      trim: { "Weather charades": 4, "Add a y": 3, "Look out the window": 3 },
      add: [
        {
          after: "Put two words together (SB 75 F)",
          slide: {
            kind: "writing",
            title: "Listen, then write: my summer",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Teacher: say the short rule first: 'It doesn't snow.' Say it, point to 'snow' with no -s. Then read the text at normal speed. Children only listen.",
              "Read it again. Children write the words they remember, or draw and label.",
              "Pairs put their words together to build the text, then check it against the board.",
            ],
            text: { title: "My summer", text: "In summer it is hot and sunny. I swim in the sea with my family. It doesn't snow in summer. I love summer!" },
            frames: ["My favorite season is ___.", "It's ___ and ___.", "I like to ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end of each sentence", "It doesn't snow: no -s after doesn't"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "The text is ours, not the book's; keep it folded until the pairs have tried. It is short on purpose: six-year-olds remember sentences by sound and rhythm. Do not mind spelling at first; check words against the board together, then look at capital letters and full stops.",
            tiers: [
              { level: "Support", task: "Write or draw three words you hear, then copy the text from the board." },
              { level: "Core", task: "Build the text with your partner, then check it." },
              { level: "Stretch", task: "Write your own season text with the same four sentences." },
            ],
          },
        },
        {
          after: "Say it before you write it",
          slide: {
            kind: "fluency",
            title: "Favorite season talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 5,
            goal: "Give the same season talk to three friends. Each talk is shorter and smoother.",
            chunks: ["My favorite season is summer.", "It's hot and sunny.", "I see the sun and I like to swim.", "It doesn't snow in the summer."],
            recycle: ["In winter, it gets cold.", "Do you want to play in the park with me?"],
            rounds: [
              { seconds: 45, say: "Partner 1: tell your season talk. The listener holds up a finger for each sentence." },
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
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and from the one-minute fix between round 1 and round 2.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite season is ___.", "It's ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add what does not happen: 'It doesn't snow in the summer.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u07-l5": {
      objectives: ["I can say 'It gets hot in the summer, but it doesn't snow.' fast and right."],
      add: [
        {
          after: "Pine Hill: ask and tell",
          slide: {
            kind: "fluency",
            title: "Sunny Hill: tell it again with a new friend",
            routine: "task repeat",
            mode: "pairs",
            minutes: 5,
            goal: "Tell about the summer and the winter on Sunny Hill. Same job, new friend, smoother each time.",
            chunks: ["It gets hot in the summer.", "It doesn't snow in the summer.", "It snows in the winter.", "It doesn't get hot in the winter."],
            recycle: ["I take care of the orangutan.", "Is it cold? No, it isn't."],
            rounds: [
              { seconds: 60, say: "Plan in your head, then tell your partner about summer and winter on Sunny Hill." },
              { seconds: 45, say: "New partner. Tell it again, smoother." },
              { seconds: 40, say: "New partner. Last time: fast and clear!" },
            ],
            steps: [
              "Look at the Sunny Hill pictures for summer and winter. Think for one minute: what happens in each season?",
              "Tell your partner. The listener nods for every sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when you hear the bell.",
            ],
            prompts: ["(picture: Sunny Hill in summer)", "(picture: Sunny Hill in winter)"],
            feedback: correct,
            teacherNote: "Task repetition with a planning minute: children get one chance to prepare, then do the same job again with a new friend, so the second and third tellings run on ready-made phrases. Listen for the s on 'gets' and 'snows', and for 'doesn't gets'. Prompt with a finger and wait; do not say the sentence for the child.",
            tiers: [
              { level: "Support", task: "Say one sentence for each season with the frames.", frames: ["It gets ___ in the ___.", "It doesn't ___ in the ___."] },
              { level: "Core", task: "Say two sentences for each season, without the frames." },
              { level: "Stretch", task: "Join them: 'It gets hot in the summer, but it doesn't get hot in the winter.'" },
            ],
          },
        },
        {
          after: "Write it like a champion",
          slide: {
            kind: "writing",
            title: "Join the weather sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Read your sentence to your partner with a weather-reporter voice!",
            ],
            items: [
              { q: "It snows in the winter. It gets cold in the winter. (and)", answer: "It snows and it gets cold in the winter." },
              { q: "It gets hot in the summer. It doesn't snow in the summer. (but)", answer: "It gets hot in the summer, but it doesn't snow." },
              { q: "It rains in the spring. It gets warm in the spring. (and)", answer: "It rains and it gets warm in the spring." },
            ],
            checklist: ["The joining word is there: and, but", "It snows, it gets: the -s is there", "After doesn't: no -s"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'in the winter'. Check that the -s stays on both verbs after 'and' and disappears after 'doesn't'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'It gets cool, it rains and it gets windy in the fall.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Two seasons talk",
        prompt: "Pick two seasons. Tell us what happens in one and what does not happen in the other. Show your drawing!",
        length: "30-60 seconds",
        steps: [
          "Draw two seasons, side by side, or find two things from home.",
          "Practise your two-season talk three times. Each time a little faster, like in class.",
          "Record it once. Say what gets and what doesn't.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what happens in one season and what doesn't happen in another, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "snow", "rain", "hot", "cold"],
        grammar: ["It gets ___ in the ___.", "It ___s in the ___.", "It doesn't ___ in the ___."],
        rubric: [
          { label: "Does and doesn't", description: "Says one thing that happens and one thing that doesn't.", weight: 3 },
          { label: "The -s", description: "Says 'it gets' and 'it snows' with the -s, and 'it doesn't snow' with no -s.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Season words", description: "Uses season and weather words from the unit.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It gets ___ in the ___.", "It doesn't ___ in the ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["It gets ___ in the ___.", "It ___s in the ___.", "It doesn't ___ in the ___."], tips: ["Use one sentence for each season."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In the ___ it gets ___, but in the ___ it doesn't.", "It gets ___ and it ___s in the ___."], tips: ["Join two ideas with 'but' or 'and'."] },
        ],
      },
    },
  },
};
