import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 6 "Animal
// Reserves" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 5's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Three lessons end with a recorded talk
// for home, built on the routine the class just did. Time comes from games and warm-ups,
// never from the book pages or the grammar. All text is original.

const GROWN_UP = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

// Reserve language (lessons 1, 2, 4, 5): "I take care of the ...", "She puts out food", -s on plurals.
const fixReserve =
  "Listen and do not stop the talk. Note two or three grammar mistakes you hear (no names), such as 'I take care the orangutan' (missing 'of'), 'Dian teach Anak' (missing -s) or 'two orangutan'. Between rounds 1 and 2 put them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('I take care ...?'), point to the frame, or hold up a finger for the missing -s. Do not say the whole sentence for them. For a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

// This / that, What / Who (lessons 3 and 6).
const fixThis =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names), such as 'What this?' (missing 's), 'Is a pond' instead of 'It's a pond', or 'What's this?' for something far away. Between rounds 1 and 2 put them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. Prompt the child to fix it: point to the frame, start 'What's ...?' and pause, repeat the error with a rising voice ('What this?'), or hold your hand near for this and far for that. Do not say the whole question for them. For a sound, say it right and let them echo it. Say 'What's' and 'It's' with the ending clear yourself.";

export const odL1U6Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u06-l1": {
      objectives: ["I can say 'I take care of the orangutan.' and other reserve sentences fast, without stopping."],
      trim: { "What's missing? Freeze dance!": 6, "Orangutan says": 6 },
      add: [
        {
          after: "Keepers at the reserve",
          slide: {
            kind: "fluency",
            title: "Keeper sprint: what do I do?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole keeper sentence, fast and smooth, with no stops.",
            chunks: ["I take care of the orangutan.", "I put out food for the baby.", "I teach the baby to climb.", "I miss my friend."],
            recycle: ["A bird lives in a nest.", "The frog lives in a pond."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card and mimes it; the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one child mimes, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Do the action with your body and say a WHOLE sentence: 'I take care of the orangutan.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: feed the baby)", "(card: climb)", "(card: take care)", "(card: miss)", "(card: nest and pond)"],
            feedback: fixReserve,
            teacherNote: "Whole sentences with the action, never a single word: 'take care of' should come out as one chunk. Mix in Unit 5's 'A ___ lives in a ___' cards every few turns so last unit's phrases stay fast. Listen for 'take care the' without 'of' and for the plural -s.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I take care of the ___.", "I put out food for the ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second sentence: 'I take care of the orangutan. I miss my friend.'", frames: ["I ___. I ___."] },
            ],
          },
        },
        {
          after: "Read and write the words (SB 56 B)",
          slide: {
            kind: "writing",
            title: "Grow my keeper sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the word in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I take care of the orangutan. (add: baby)", answer: "I take care of the baby orangutan." },
              { q: "I put out food. (add: for the orangutans)", answer: "I put out food for the orangutans." },
              { q: "I teach the baby to climb. (add: orangutan)", answer: "I teach the baby orangutan to climb." },
            ],
            frames: ["I take care of the ___.", "I put out food for the ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'take care OF': the word 'of' is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese learners often leave out 'of' in 'take care of' and the -s on 'orangutans'. Underline 'of' on the board and clap the rhythm of the whole phrase.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I put out food and I teach the baby to climb.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u06-l2": {
      objectives: ["I can tell the story of Anak in order, faster each time."],
      add: [
        {
          after: "Story strips",
          slide: {
            kind: "fluency",
            title: "Anak: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["First, Anak is a baby.", "Dian takes care of her.", "Then Anak is four. Dian teaches her to climb.", "At the end, Anak has a baby!"],
            recycle: ["Where's the eagle? It's in the sky.", "A bird lives in a nest."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use your picture strips." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for the start, two for the middle, three for the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(strip: baby Anak)", "(strip: Anak is four)", "(strip: Anak is big)", "(strip: Anak's baby)"],
            feedback: fixReserve,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The fix between rounds is what makes the second telling more correct as well as faster. Listen for the -s on 'takes care' and 'teaches' (Dian is 'she'), which Vietnamese learners often drop. Say those endings clearly yourself.",
            tiers: [
              { level: "Support", task: "Point to each strip and say one sentence for it.", frames: ["First, Anak is a ___.", "Dian takes care of ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add what Dian says: 'I take care of you. I miss you.'", frames: ["Dian says, 'I ___ you.'"] },
            ],
          },
        },
        {
          after: "Find the yellow words (SB 58-59)",
          slide: {
            kind: "writing",
            title: "Dian's day: listen and write",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Listen to the teacher read a short text. Do not write yet.",
              "Listen again. Write the words you hear.",
              "Work with your group to build the text. Check: does it make sense?",
              "Read your text aloud, then say it without looking.",
            ],
            text: { title: "Dian's day", text: "Dian takes care of Anak. She puts out food every day. She teaches Anak to climb. At night, Anak takes a nap." },
            frames: ["Dian takes care of ___.", "She ___ Anak to climb."],
            checklist: ["Dian takes, puts, teaches: the -s is there", "A capital letter at the start of each sentence", "A full stop at the end of each sentence"],
            sayIt: "Read your group's text aloud together, then say it again without looking.",
            teacherNote: "Read the text twice at normal speed, with the final -s clear and a pause after each sentence. Before reading, remind the children in one sentence: for 'she', the action word gets -s. Do not show the text until the groups have tried; fold it open at the end and let them mark their own work.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and use the frames to build the sentences." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text and add one more sentence about Dian." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My Anak story",
        prompt: "Tell the story of Anak at home in three parts: the start, the middle and the end. Show a toy or a picture of an animal if you have one!",
        length: "30-60 seconds",
        steps: [
          "Look at your story strips or draw three pictures.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          GROWN_UP,
        ],
        maxSeconds: 120,
        kidSummary: "Tell the start, the middle and the end of the story, and keep talking without long stops.",
        words: ["orangutan", "reserve", "take care of", "teach", "miss", "take a nap"],
        grammar: ["First, ___. Then, ___. At the end, ___.", "Dian takes care of / teaches ___"],
        rubric: [
          { label: "Three parts", description: "Tells the start, the middle and the end of the story in order.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: orangutan, reserve, take care of, teach, miss.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear -s", description: "Says 'takes' and 'teaches' with the -s when the story is about Dian or Anak.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, Anak is a baby.", "Dian takes care of her.", "At the end, ___."], tips: ["Point to your pictures as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___. Dian ___ Anak.", "Then, Anak is ___. Dian teaches her to ___.", "At the end, ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Dian says, 'I take care of you.'", "My favorite part is ___ because ___."], tips: ["Add what Dian says, and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u06-l3": {
      objectives: ["I can ask 'What's this?' and 'Who's that?' and answer fast, round the circle."],
      trim: { "Feel it! Guess it!": 6, "Baby, four, eight, twelve": 4 },
      add: [
        {
          after: "Ask and answer with a partner (SB 61 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: What's this? Who's that?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["What's this? It's a ball.", "What's that? It's a tree.", "Who's this? It's a baby rabbit.", "Who's that? It's {s1}."],
            recycle: ["Where's the eagle? It's in the sky.", "A frog lives in a pond."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card. Close cards: this. Cards on the wall: that." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card out so everyone can see it.",
              "Ask the friend on your left: 'What's this?' (close) or 'What's that?' (far) or 'Who's this?'",
              "They answer: 'It's a ___.' or 'It's ___.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["What's this?", "What's that?", "Who's this?", "Who's that?"],
            feedback: fixThis,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'What's this?' automatic. Use your hand for this (close) and that (far) so the meaning is clear. Listen for 'What this?' and for 'Is a ball' (a missing 'It'). Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frame on the board.", frames: ["What's this? It's a ___.", "Who's that? It's ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Ask three questions in a row: 'What's this? What's that? Who's that?'" },
            ],
          },
        },
        {
          after: "Look around the classroom (SB 61 F)",
          slide: {
            kind: "writing",
            title: "Fix the reserve signs",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "The reserve signs have mistakes! Read each one with your partner.",
              "Find the mistake: a missing 's, a missing 'It', a capital letter or a question mark.",
              "Write the sign the right way. Read it aloud together.",
            ],
            items: [
              { q: "What this?", answer: "What's this?" },
              { q: "What's that? Is a pond.", answer: "What's that? It's a pond." },
              { q: "who's that?", answer: "Who's that?" },
              { q: "Who's this. It's Dian.", answer: "Who's this? It's Dian." },
            ],
            checklist: ["What's and Who's have 's", "The answer starts with It's", "A question ends with a question mark (?)"],
            sayIt: "Read your fixed signs to your partner, one asks and one answers.",
            teacherNote: "Two types of error today: the missing 's (What this?) and the missing 'It' in the answer. Fix item 1 together before the pairs start. The question mark is worth a quick check, but keep the main focus on those two.",
            tiers: [
              { level: "Support", task: "Fix signs 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four signs." },
              { level: "Stretch", task: "Write one more sign with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u06-l4": {
      objectives: ["I can give three clues about an animal, saying it again faster each time."],
      trim: { "Run to the time of day": 6, "Sun, sun, in the sky": 5 },
      add: [
        {
          after: "Clue game: What is it? (SB 63 E)",
          slide: {
            kind: "fluency",
            title: "Clue talk: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same three clues to three friends. Each time is faster and smoother.",
            chunks: ["It's a bird.", "It lives in the rainforest.", "It sleeps in the day.", "What is it?"],
            recycle: ["The frog lives in a pond.", "A bird lives in a nest."],
            rounds: [
              { seconds: 60, say: "Choose an animal card. Give your partner three clues. They guess." },
              { seconds: 45, say: "New partner. The same three clues, in less time." },
              { seconds: 30, say: "New partner. Fast and smooth! The listener says the animal." },
            ],
            steps: [
              "Pick an animal card. Do not show it. Say: 'It's a ___. It lives in ___. It sleeps in the ___.'",
              "Your partner guesses: 'It's a ___!'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner. Say the same clues again.",
            ],
            prompts: ["(card: owl)", "(card: frog)", "(card: orangutan)", "(card: bat)"],
            feedback: fixReserve,
            teacherNote: "Task repetition: the same clues, a new listener, less time. Do not give a new animal between rounds. Listen for the missing -s in 'lives' and 'sleeps' (it is one animal, so the action word gets -s). Prompt with a finger for the -s; do not say the sentence for the child.",
            tiers: [
              { level: "Support", task: "Say two clues with the frames.", frames: ["It's a ___.", "It lives in ___."] },
              { level: "Core", task: "Say three clues without the board." },
              { level: "Stretch", task: "Add a fourth clue: 'It eats ___.' or 'It's big / small.'", frames: ["It eats ___.", "It's ___."] },
            ],
          },
        },
        {
          after: "Question mark or period? (SB 63 F)",
          slide: {
            kind: "writing",
            title: "Join the clues with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner. Does it make sense?",
            ],
            items: [
              { q: "It's small. It's brown. (and)", answer: "It's small and brown." },
              { q: "It lives in a tree. It sleeps in the day. (and)", answer: "It lives in a tree and it sleeps in the day." },
              { q: "It eats seeds. It eats fruit. (and)", answer: "It eats seeds and fruit." },
            ],
            checklist: ["'and' joins the two things", "The -s is there: lives, sleeps, eats", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud: cross out the second 'It's' and write 'and'. Check the -s on lives, sleeps and eats.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 3." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three clues: 'It's small, brown and quiet.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Guess my animal",
        prompt: "Choose an animal. Give three clues and ask 'What is it?' Show a picture or a toy at the end.",
        length: "30-60 seconds",
        steps: [
          "Choose an animal and draw it, or find a toy.",
          "Say your three clues three times: each time a little faster, like in class.",
          "Record it once. Show your animal at the end!",
          GROWN_UP,
        ],
        maxSeconds: 90,
        kidSummary: "Give three clues about an animal, ask 'What is it?', and keep talking without long stops.",
        words: ["bird", "frog", "rainforest", "day", "night", "morning"],
        grammar: ["It's a ___.", "It lives in ___.", "It sleeps in the ___."],
        rubric: [
          { label: "Three clues", description: "Gives three clues about the animal: what it is, where it lives, when it sleeps.", weight: 3 },
          { label: "Whole sentences", description: "Says 'It lives in ___' and 'It sleeps in the ___', not single words.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; asks 'What is it?' at the end.", weight: 3 },
          { label: "Clear -s", description: "Says the -s in 'lives' and 'sleeps' so it can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It's a ___.", "It lives in ___.", "What is it?"], tips: ["Hold up one finger for each clue."] },
          { level: "Core", who: "Most children", frames: ["It's ___. It lives in ___.", "It sleeps in the ___.", "What is it?"], tips: ["Say the time of day for your animal."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It eats ___. It's ___ and ___.", "I think it's a ___, because ___."], tips: ["Add a clue about food and say what you think."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u06-l5": {
      objectives: ["I can show my animal booklet and say about it three times, faster each time."],
      trim: { "Where do animals live?": 4, "What am I? Animal mime": 4, "Our Big Question Chart (SB 65 C)": 4 },
      add: [
        {
          after: "Show your booklet (SB 65 C)",
          slide: {
            kind: "fluency",
            title: "Booklet talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same booklet talk to three friends. Each talk is shorter and smoother.",
            chunks: ["This is a frog.", "It lives in a pond.", "It's green.", "It eats flies."],
            recycle: ["What's this? It's a ___.", "Who's that? It's ___."],
            rounds: [
              { seconds: 60, say: "Partner 1: show your booklet and say your talk. The listener counts the facts on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fixReserve,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix makes the second telling more correct. Listen for 'lives' and 'eats' (it is one animal) and for the -s on plural foods.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["This is a ___.", "It lives in ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a fifth sentence: 'I like the ___ because it's ___.'", frames: ["I like the ___ because ___."] },
            ],
          },
        },
        {
          after: "Make an animal booklet (SB 65 B)",
          slide: {
            kind: "writing",
            title: "Write a booklet page",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Find the full stops.",
              "Look at your booklet page. Write two sentences with the frames.",
              "Read them to your partner.",
            ],
            text: { title: "A model page", text: "This is a frog. It lives in a pond. It's green and small. It can jump and swim." },
            frames: ["This is a ___.", "It lives in ___.", "It's ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'lives': the -s is there"],
            sayIt: "Read your page to your partner, then say it again without looking.",
            teacherNote: "This is for the booklet children are already making: a short model, then the same pattern about their own animal. Underline the -s on 'lives'.",
            tiers: [
              { level: "Support", task: "Copy the first two sentences of the model and change the animal." },
              { level: "Core", task: "Write two sentences about your own animal." },
              { level: "Stretch", task: "Write three or four sentences. Join with 'and': 'It's green and small.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u06-l6": {
      objectives: ["I can say 'What's this?' and 'Who's that?' fast and right, near and far."],
      trim: { "Remember it!": 5, "Ranger paw-print race": 7 },
      add: [
        {
          after: "Over the wall: reserve maps",
          slide: {
            kind: "fluency",
            title: "Champion sprint: this and that",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion question and answer fast and right: near and far.",
            chunks: ["What's this? It's a leaf.", "What's that? It's a pond.", "Who's this? It's {s1}.", "Who's that? It's a baby orangutan."],
            recycle: ["I take care of the orangutan.", "It lives in the rainforest."],
            rounds: [
              { seconds: 60, say: "Together: the teacher holds a card close (this) or sticks it on the wall (that); the class asks and answers." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Is it close (this) or far (that)? Ask the whole question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
            ],
            feedback: fixThis,
            teacherNote: "A quick, high-energy recall of this unit's grammar mixed with last lessons' phrases: mixing old and new (spaced retrieval) keeps them from fading. Use your hand for this and that. Listen for 'What this?' and a missing 'It's'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["What's this? It's a ___.", "Who's that? It's ___."] },
              { level: "Core", task: "Ask and answer without looking." },
              { level: "Stretch", task: "Ask a friend a question and then answer with a full sentence: 'It's a baby orangutan. It lives in the rainforest.'" },
            ],
          },
        },
        {
          after: "Write like a champion: questions and answers",
          slide: {
            kind: "writing",
            title: "Grow my champion answer",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small answer with the teacher.",
              "Make it bigger: add the word in the brackets.",
              "Write your big answer. Read it to your partner.",
            ],
            items: [
              { q: "It's a leaf. (add: green)", answer: "It's a green leaf." },
              { q: "It's a pond. (add: big)", answer: "It's a big pond." },
              { q: "It's an orangutan. (add: baby)", answer: "It's a baby orangutan." },
            ],
            frames: ["It's a ___ ___.", "What's that? It's a ___."],
            checklist: ["It's has an 's", "A capital letter at the start", "A full stop at the end"],
            sayIt: "Ask 'What's that?' and say your big answer without looking.",
            teacherNote: "Keep it short: a describing word before the thing. Fix item 1 together and clap the rhythm of 'It's a green leaf.'",
            tiers: [
              { level: "Support", task: "Copy the big answer from the board and draw it." },
              { level: "Core", task: "Write one big answer of your own." },
              { level: "Stretch", task: "Write a question and a big answer: 'What's that? It's a big green leaf.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My reserve tour",
        prompt: "Be a guide at a reserve! Point to three things at home and say 'What's this? It's a ___.' Say 'Who's that?' about a person or a toy animal.",
        length: "30-60 seconds",
        steps: [
          "Choose three things and one person or toy animal at home.",
          "Practise your questions and answers three times.",
          "Record it once. Point to each thing as you talk.",
          GROWN_UP,
        ],
        maxSeconds: 90,
        kidSummary: "Ask 'What's this?' and 'Who's that?', answer with 'It's ___.', and keep talking without long stops.",
        words: ["reserve", "orangutan", "rainforest", "pond", "leaf"],
        grammar: ["What's this? / What's that? It's a ___.", "Who's this? / Who's that? It's ___."],
        rubric: [
          { label: "What and who", description: "Asks 'What's ___?' about a thing and 'Who's ___?' about a person or animal.", weight: 3 },
          { label: "Full answers", description: "Answers 'It's a ___.', not just one word.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops about three or four things.", weight: 2 },
          { label: "This and that", description: "Uses this for close things and that for far things.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["What's this? It's a ___.", "Who's that? It's ___."], tips: ["Point to each thing."] },
          { level: "Core", who: "Most children", frames: ["What's this? It's a ___.", "What's that? It's a ___.", "Who's that? It's ___."], tips: ["Walk close to one thing and far from another."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It's a ___. It lives in ___.", "Thank you for the tour!"], tips: ["Add where the animal lives and end the tour politely."] },
        ],
      },
    },
  },
};
