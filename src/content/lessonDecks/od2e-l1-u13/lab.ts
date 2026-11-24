import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 13 "Where Do We
// Live?" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 12's phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Lessons 2 and 5 end with a
// recorded talk for home (lesson 4 already has its own vlog). Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const fix =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on, so the children who speak again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause, point to the frame, or hold up a finger for the missing sound. For a sound, just say it right and let them echo it. Say every final sound (-s, town, world) clearly yourself: children copy what they hear.";

export const odL1U13Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u13-l1": {
      objectives: ["I can say where I live, fast and without stopping: 'I live in a ___.'"],
      trim: { "Hello, neighbor!": 4, "Run to the picture": 4, "Small to big (SB 128 C)": 6 },
      add: [
        {
          after: "Show me, tell me",
          slide: {
            kind: "fluency",
            title: "Place sprint: I live in a ___",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I live in a house.", "I live in an apartment.", "I live in a big city.", "I live in a small town.", "This is a street."],
            recycle: ["A helper helps me.", "I need water."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence and does the action." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I live in a house.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I live house' or 'I live in apartment') and fix them together; then go on.",
            ],
            prompts: ["(card: house)", "(card: apartment)", "(card: city)", "(card: town)", "(card: a street)"],
            feedback: fix + " In this unit, the usual slips are a missing 'in' ('I live house'), a missing a/an ('I live in apartment') and a dropped end sound ('tow', 'worl'). Example: the child says 'I live in apartment.' You say 'I live in ... ?' and hold up one finger for the small word: the child says 'I live in an apartment.'",
            teacherNote: "Whole sentences only, never single words: 'I live in an apartment' should come out as one smooth piece. Pictures on the cards stop children translating in their heads, and the clap keeps the pressure gentle. Mix in Unit 12's 'I need ___' cards every few turns so last unit's phrases stay fast. Listen for the end sounds of 'town', 'city' and 'world'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I live in a ___.", "I live in an ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a feeling: 'I live in a big city. I like it!'", frames: ["I live in a ___. I like it!"] },
            ],
          },
        },
        {
          after: "What is the text about? (SB 129 E)",
          slide: {
            kind: "writing",
            title: "Grow my place sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a describing word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I live in a town. (add: small)", answer: "I live in a small town." },
              { q: "I see a building. (add: tall)", answer: "I see a tall building." },
              { q: "This is a street. (add: long)", answer: "This is a long street." },
              { q: "I live in a house. (add: red)", answer: "I live in a red house." },
            ],
            frames: ["I live in a ___ town.", "I see a ___ building."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'a' before the describing word: a small town"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and': 'I see a tall building and a long street.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u13-l2": {
      objectives: ["I can tell my partner about the country, a town and a city, faster each time."],
      trim: { "Up and down the street": 3, "What's missing?": 4, "Post a letter": 5, "Town, country, city corners": 5 },
      add: [
        {
          after: "Meet the children",
          slide: {
            kind: "fluency",
            title: "Three places: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same three-place story three times. Each time is shorter, smoother and faster.",
            chunks: ["In the country, there are farms.", "In a town, there are shops.", "In a city, there are tall buildings.", "I live in a city. I like it!"],
            recycle: ["I live in a house.", "A helper helps me."],
            rounds: [
              { seconds: 60, say: "Tell your partner about the three places. Use the three picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put three cards in a row: the country, a town, a city.",
              "Say one sentence for each card. When the bell rings, find a new partner.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'In the city, have buildings') and fix them together; then go on.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: a farm)", "(picture: a small town street)", "(picture: tall buildings)"],
            feedback: fix + " The grammar here is 'there are' and the plural -s. Example: the child says 'In the city, have buildings.' Point to the frame on the board, say 'In the city, there ... ?' and pause: the child says 'In the city, there are tall buildings.' For 'farm' and 'farms', hold up one finger, then two fingers, and let the child hear the difference.",
            teacherNote: "The same three sentences three times on purpose: the second and third tellings free the children to speak faster because they are no longer searching for words. Many Vietnamese learners say 'There have' because Vietnamese uses one word for 'have' and 'there is'; model 'There are' slowly and let them see it on the frame. Keep the picture cards up for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["In the country, there are ___.", "In a town, there are ___.", "In a city, there are ___."] },
              { level: "Core", task: "Tell all three places without the frames." },
              { level: "Stretch", task: "Add where you live: 'I live in a city. In my city, there are tall buildings.'" },
            ],
          },
        },
        {
          after: "My pretend address (SB 131)",
          slide: {
            kind: "writing",
            title: "Listen and build: Pip's town",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Remember: 'There is' for one thing, 'There are' for more than one.",
              "Listen to the short text. Do not write yet.",
              "Listen again and write key words: town, red house, shops, park.",
              "In your group, build the text back. Read it to the class. Does it match?",
            ],
            text: { title: "Pip's town", text: "Pip lives in a small town. There is a red house on the street. There are two shops. There is a big park. Pip likes the town!" },
            frames: ["Pip lives in a ___.", "There is a ___.", "There are ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation mark at the end", "'There is' for one, 'There are' for more than one"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "A dictogloss works because children must listen for meaning AND for the small grammar words to rebuild the text. Read it at normal speed twice, with clear final sounds in 'lives', 'shops' and 'likes'; do not slow down so much that it sounds like single words. Accept a text that is not word for word if it keeps the meaning, then compare with the original and notice the -s together.",
            tiers: [
              { level: "Support", task: "Use the key words and the frames; build two sentences." },
              { level: "Core", task: "Build the whole text with your group." },
              { level: "Stretch", task: "Build the text, then write one more sentence about the town." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My home and my street",
        prompt: "Show us where you live: your door, your window or your street. Say what kind of place it is and what is near your home. There is no need to say your address.",
        length: "30-60 seconds",
        steps: [
          "Look at your home or your street with a grown-up. Find two or three things near it.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Show each thing as you talk.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say where you live and what is near your home, and keep talking without long stops.",
        words: ["street", "neighborhood", "town", "city", "the country", "apartment", "building", "world"],
        grammar: ["I live in a ___.", "There is a ___. / There are ___."],
        rubric: [
          { label: "Where I live", description: "Says what kind of place the home is in: 'I live in a ___.'", weight: 3 },
          { label: "There is / There are", description: "Says what is near home with 'There is' or 'There are', not 'There have'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The end sound of town, city and the -s in shops can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I live in a ___.", "There is a ___."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["I live in a ___. I like it!", "There is a ___ and there are ___."], tips: ["Say one thing and then more than one thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In my neighborhood, there are ___ and ___.", "My favorite place is the ___."], tips: ["Add your favorite place and say why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u13-l3": {
      objectives: ["I can ask and answer 'Is this Pip's hat?' fast, round the circle."],
      trim: { "City and country chant": 4, "Whose is it? Mystery bag": 6, "Whose is it? Group game": 6 },
      add: [
        {
          after: "Practice with a partner (SB 133 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is this Pip's hat?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Whose hat is this?", "It's Pip's hat.", "Is this Max's hat?", "Yes, it is.", "No, it isn't. It's Nina's hat."],
            recycle: ["Does she have a red pencil? Yes, she does.", "What does he want? He wants a game."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds a thing with a name card." },
              { seconds: 60, say: "Swap things. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Each thing has a name card: Pip, Max, Nina, Bo.",
              "Ask the friend on your left: 'Is this Max's hat?'",
              "They answer: 'Yes, it is.' or 'No, it isn't. It's Nina's hat.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Is this ___'s ___?", "Whose ___ is this?"],
            feedback: fix + " The usual slips here are 'Pip hat' (no 's), 'The hat Pip' and 'Yes, it's'. Example: the child says 'It's Pip hat.' You point to the 's on the board, say 'It's Pip ... ?' and pause with your voice going up: the child says 'It's Pip's hat.' For 'Yes, it's', hold up a finger and say 'Yes, it ... ?'",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Is this ___'s ___?' automatic. Time the whole circle and tell them; children love beating their own time. Write the 's on the board in a different color and say it with a clear /s/ or /z/ sound: Vietnamese has no ending like it, so children miss it unless they hear it again and again.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["Is this ___'s ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer 'No' and say whose it is: 'No, it isn't. It's Nina's hat. Nina's house is in the city.'" },
            ],
          },
        },
        {
          after: "Label the houses",
          slide: {
            kind: "writing",
            title: "Fix the apostrophe notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each note with your partner. Something is wrong!",
              "Find it: a missing 's or a wrong answer word.",
              "Write the note the right way. Read it aloud together.",
            ],
            items: [
              { q: "This is Nina house.", answer: "This is Nina's house." },
              { q: "Is this Max bag?", answer: "Is this Max's bag?" },
              { q: "Yes, it's.", answer: "Yes, it is." },
              { q: "No, it isn't. It's Pip hat.", answer: "No, it isn't. It's Pip's hat." },
            ],
            checklist: ["The owner has 's: Nina's house", "Short answers: Yes, it is. / No, it isn't.", "A capital letter and a full stop or a question mark"],
            sayIt: "Read your four fixed notes to your partner, then say them again without looking.",
            teacherNote: "Two error types only, so the fixing stays easy: the missing 's and the short answer. 'Yes, it's' is a very common slip because we do shorten 'it is' elsewhere; show that a short answer ends with the full 'is'. Fix the first note together on the board, saying the 's aloud as you write it.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 3 with the teacher." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write one more note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u13-l4": {
      objectives: ["I can talk about where I live three times, faster each time."],
      trim: { "Noisy, quiet chant": 3, "Noisy or quiet? Sort and move": 4, "Listen for the details (SB 134 Think, C, D)": 8, "Do-it word or thing word? (SB 135 F)": 7 },
      add: [
        {
          after: "Tell me about where you live",
          slide: {
            kind: "fluency",
            title: "My place talk 45-30-20: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same place talk to three friends. In each round you talk, then your partner talks. Each talk is shorter and smoother.",
            chunks: ["I live in a big city.", "My neighborhood is noisy and interesting.", "My room is quiet.", "I like my room!"],
            recycle: ["It's Pip's hat. Whose is it?", "In a town, there are shops."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A tells the place talk, then Partner B. The listener counts the sentences on their fingers. Then change partners." },
              { seconds: 30, say: "Round 2: Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: Partner A, then Partner B. Fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When both partners have talked, the bell rings. Line B moves one step to the left: a new partner.",
              "Do the same in rounds 2 and 3: A talks, then B, then change partners.",
            ],
            feedback: fix + " Here the usual slips are 'My room quiet' (no 'is'), 'I live in big city' and 'noisy' said as 'noi'. Example: the child says 'My room quiet.' You say 'My room ... ?' and hold up a finger for the missing little word: the child says 'My room is quiet.'",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The 'is' is the word to listen for: Vietnamese does not need a word for 'be' before a describing word, so 'She happy' and 'My room quiet' are very common.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I live in a ___.", "My room is ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a compliment: 'My room is quiet and safe. Do you like it?'" },
            ],
          },
        },
        {
          after: "What are these places like? (SB 134 B)",
          slide: {
            kind: "writing",
            title: "Join the place words with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "The library is quiet. The library is safe. (and)", answer: "The library is quiet and safe." },
              { q: "The market is noisy. The market is interesting. (and)", answer: "The market is noisy and interesting." },
              { q: "My street is long. My street is quiet. (and)", answer: "My street is long and quiet." },
              { q: "I like my room. I like my bed. (and)", answer: "I like my room and my bed." },
            ],
            checklist: ["I say the repeated words only once: 'is quiet AND safe'", "'and' joins the two words", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'The library is'. Notice with the children that the repeated words ('is', 'I like') stay only once.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three words: 'My street is long, quiet and safe.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u13-l5": {
      objectives: ["I can say whose house it is, three times, without stopping: 'It's Nina's house.'"],
      trim: { "Remember it!": 5, "Send it home!": 7, "Over the fence: Whose house?": 10 },
      add: [
        {
          after: "Over the fence: Whose house?",
          slide: {
            kind: "fluency",
            title: "Whose house? Do it again, faster",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same house game three times with new partners. Each time, say it faster and smoother.",
            chunks: ["Whose house is this?", "It's Nina's house.", "Nina's house is in the city.", "Max's farm is in the country."],
            recycle: ["I live in an apartment.", "Is this Pip's hat? Yes, it is."],
            rounds: [
              { seconds: 60, say: "Partner A points to a house card and asks 'Whose house is this?' Partner B answers and says where it is." },
              { seconds: 45, say: "New partner. Same game, a little faster." },
              { seconds: 40, say: "New partner. Same game, as smooth as you can!" },
            ],
            steps: [
              "Each pair has four house cards: Nina, Max, Bo and Pip, each with a place.",
              "Ask 'Whose house is this?' and answer with a whole sentence, then say where it is.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner and do it again.",
            ],
            prompts: ["(card: Nina, the city)", "(card: Max, the country)", "(card: Bo, a small town)", "(card: Pip, an apartment)"],
            feedback: fix + " The slips to listen for are 'Nina house' and 'It's Max.' for 'It's Max's.' Example: the child says 'It's Max.' You say 'Yes! It's Max ... ?' and point to the 's on the board: the child says 'It's Max's house.' A quick recast is fine for sounds: if 'farm' comes out as 'far', say 'farm' and let the child echo it.",
            teacherNote: "Task repetition (the same task again with a new partner) is one of the best ways to build fluency, and the second and third times children also fix their own grammar because they are not planning what to say. Do not change the cards between rounds. This is the last lesson of the unit, so listen especially for the 's, which is the hardest ending for Vietnamese speakers.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and point to the card.", frames: ["Whose house is this?", "It's ___'s house."] },
              { level: "Core", task: "Ask and answer, and say where the house is, without the board." },
              { level: "Stretch", task: "Add a describing word: 'It's Max's house. Max's house is big and quiet.'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "A postcard from a friend's house",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model postcard. Find the three 's words.",
              "Plan: choose a friend's house (Nina, Max, Bo or Pip) and where it is.",
              "Write two short sentences with the frames. Check with the list.",
              "Read your postcard to your partner.",
            ],
            text: { title: "A postcard from Bo's house", text: "This is Bo's house. Bo's house is in a small town. It's a red house. I like Bo's house!" },
            frames: ["This is ___'s house.", "___'s house is in ___.", "I like ___'s house!"],
            checklist: ["The owner has 's: Bo's house", "A capital letter at the start of each sentence", "A full stop or an exclamation mark at the end"],
            sayIt: "Read your postcard to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check: a short plan before writing and a checklist after it help young writers more than extra time. Keep the checklist to the three things the children can see. Praise every 's you find, and read one postcard aloud as a model for the class.",
            tiers: [
              { level: "Support", task: "Copy the model and change the name and the place." },
              { level: "Core", task: "Write two sentences about a friend's house." },
              { level: "Stretch", task: "Write three sentences and add a describing word: 'It's a big red house.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Whose is it? A tour of my home",
        prompt: "Find three things at home. Show each one to the camera and say whose it is: 'This is my mom's bag. It's my brother's ball.'",
        length: "30-60 seconds",
        steps: [
          "Choose three things at home that belong to different people.",
          "Practise saying whose each thing is three times, a little faster each time.",
          "Record it once. Show each thing as you say it.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say whose each thing is with 's, and keep talking without long stops.",
        words: ["house", "apartment", "street", "city", "town", "the country"],
        grammar: ["This is my ___'s ___.", "It's ___'s.", "Whose ___ is this?"],
        rubric: [
          { label: "Owner + 's", description: "Says whose each thing is with 's: 'my mom's bag', not 'my mom bag'.", weight: 3 },
          { label: "Whole sentences", description: "Says whole sentences ('This is my dad's cup.'), not single words.", weight: 2 },
          { label: "Keeps going", description: "Talks about three things without long stops.", weight: 3 },
          { label: "Clear endings", description: "The 's at the end of the owner's name can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___'s ___.", "It's ___'s."], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["This is my ___'s ___. Whose ___ is this? It's ___'s.", "My ___'s ___ is ___."], tips: ["Ask 'Whose is it?' and answer it yourself."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Is this my ___'s ___? No, it isn't. It's my ___'s.", "My ___'s room is ___."], tips: ["Ask a question and answer it, and say where something is."] },
        ],
      },
    },
  },
};
