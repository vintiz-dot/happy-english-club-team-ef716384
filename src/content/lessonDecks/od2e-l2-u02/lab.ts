import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 2 "Animal Adventures"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8. Every lesson gets
// one fluency routine (the unit's grammar said again and again as whole sentences, a little
// faster each round, with Unit 1's phrases mixed back in) and one short writing routine (say
// it, write it, read it back). Every other lesson ends with a recorded talk for home, built
// on the routine the class just did. Time comes from games and repeats, never from the book
// pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixS =
  "Listen and do not stop the talk. Note two or three mistakes (no names), usually a missing -s on he / she / it verbs (a bird peck), a missing 'does' or a misplaced adverb. After the first round stop for one minute and fix them on the board. For grammar, prompt the child to fix it: start the phrase and pause ('A bird peck...?'), point to the frame, or hold up a finger for the missing -s; do not say it for them. For a sound, say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const fixOften =
  "Listen and do not stop the talk. Note two or three mistakes (no names): the adverb in the wrong place (A cat sleeps always), 'is' left out (She always late), a missing -s (He never play), or 'don't never'. After round 1 stop for one minute and fix them on the board. For grammar, prompt the child to fix it: repeat the mistake with a rising voice ('A cat sleeps always...?'), start the phrase and pause ('A cat always ...'), or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. Say every final -s clearly yourself.";

export const odL2U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u02-l1": {
      objectives: ["I can say what animals do, and ask 'Does it ___?', fast and without stopping."],
      trim: {
        "Mystery bag: what do you notice?": 5,
        "Animal moves: do what I say": 5,
        "Flashcard slap and what's missing?": 6,
        "Is it an animal? Is it something animals do? Sort": 8,
      },
      add: [
        {
          after: "Who does what?",
          slide: {
            kind: "fluency",
            title: "Animal sprint: what does it do?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with the -s at the end.",
            chunks: ["A cat creeps.", "A bird pecks seeds.", "It hunts for food.", "Does it escape? Yes, it does.", "Does it squawk? No, it doesn't."],
            recycle: ["They have feathers.", "My favorite animal is the parrot."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an animal card and does the action; the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'A bird pecks seeds.' Do the action too.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: cat)", "(card: bird)", "(card: fox)", "(card: parrot)", "(card: mouse)"],
            feedback: fixS,
            teacherNote: "Whole sentences only, never single words: 'A bird pecks seeds' is one smooth piece. The final -s on pecks, creeps and hunts is a sound many Vietnamese learners drop, so say it clearly and listen for it. Mix in two Unit 1 phrases every few turns so last unit's language stays fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ ___s.", "Does it ___? Yes, it does."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a place: 'A bird pecks seeds on the ground.'", frames: ["A ___ ___s ___ in / on ___."] },
            ],
          },
        },
        {
          after: "Think: how can animals help people? (SB 17)",
          slide: {
            kind: "writing",
            title: "Make the animal sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add where, what or a describing word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "A bird pecks. (add: seeds, on the ground)", answer: "A bird pecks seeds on the ground." },
              { q: "A cat creeps. (add: quiet)", answer: "A quiet cat creeps." },
              { q: "A mouse escapes. (add: from the cat, through a hole)", answer: "A mouse escapes from the cat through a hole." },
              { q: "A fox hunts. (add: at night)", answer: "A fox hunts at night." },
            ],
            frames: ["A ___ ___s ___.", "A ___ ___ ___s."],
            checklist: ["A capital letter at the start", "A full stop at the end", "One animal: the verb has -s (pecks, hunts)"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence shows children that a sentence can carry more information while the grammar stays the same. Check the -s on the verb: it is the error we want to catch.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw the animal." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and': 'A bird pecks seeds and a worm escapes.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u02-l2": {
      objectives: ["I can tell the adventure in order, faster each time."],
      trim: {
        "Chant: creep, peck, hunt": 4,
        "Act it out in threes": 7,
        "Word detectives: the highlighted words": 8,
        "Same and different: the character Venn (SB 18 Think)": 10,
      },
      add: [
        {
          after: "Tell it in order",
          slide: {
            kind: "fluency",
            title: "Adventure retell: 4-3-2 style",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same adventure three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the two friends go out to play.",
              "Then they see a fox and they feel nervous.",
              "Next, they run and escape.",
              "At the end, one friend helps the other.",
            ],
            recycle: ["They have feathers.", "I like frogs because they jump."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the adventure, then Partner B. Use your four picture cards. Then change partners." },
              { seconds: 45, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Tell it fast! Partner A, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put four cards in a row: First, Then, Next, At the end.",
              "In each round, Partner A tells the adventure, then Partner B tells it. The listener counts the order words on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, find a new partner and tell it again, shorter.",
            ],
            prompts: ["(card: First)", "(card: Then)", "(card: Next)", "(card: At the end)"],
            feedback: fixS,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes it accurate as well as fast. Listen for the order words and the -s on 'sees', 'runs' and 'helps'. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["First, ___.", "Then ___.", "Next, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add why: 'They run because they feel nervous.'", frames: ["They ___ because ___."] },
            ],
          },
        },
        {
          after: "Why do they act this way?",
          slide: {
            kind: "writing",
            title: "My adventure story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then, Next and At the end.",
              "Plan: look at your four boxes. Draw or write a few words in each box. Say one sentence for each box to your partner.",
              "Write: four or five sentences. Start with First, Then, Next, At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at the order words and the -s on he / she / it verbs (sees, runs, flies). Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: A bird's adventure",
              text: "First, a little bird goes out to play. Then it sees a fox and feels nervous. Next, the bird flies up to a tall tree. At the end, the bird is safe and the fox goes away. It is happy because it can fly!",
            },
            organiser: [
              { label: "First", prompt: "Draw the animal and where it is. What does it do first?" },
              { label: "Then", prompt: "Draw the problem. What does the animal see? How does it feel?" },
              { label: "Next", prompt: "Draw what the animal does. How does it escape or help?" },
              { label: "At the end", prompt: "Draw the end. Is the animal safe? How does it feel?" },
            ],
            frames: ["First, a ___ goes out to ___.", "Then it sees a ___ and feels ___.", "Next, the ___ ___s to ___.", "At the end, the ___ is ___.", "It is ___ because ___."],
            checklist: ["Four or five sentences with joining words", "A capital letter at the start and a full stop at the end of every sentence", "He / she / it: the doing word has -s (sees, runs, flies)"],
            sayIt: "Read your adventure to your partner. Then tell it again without looking, with your four order words.",
            teacherNote: "A first full paragraph for these children: the retell they have just told aloud, now in four or five sentences. The four boxes are the four order words from the retell slide, so the planning is already done. Mark only two things (the order words and the -s) and let the child find the mistake from your dot. This paragraph is also the script for the recorded talk at home, so say so when the children finish.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["First, a ___ goes out to ___.", "Then it sees a ___.", "At the end, the ___ is ___."] },
              { level: "Core", task: "Write four sentences with First, Then, Next and At the end." },
              { level: "Stretch", task: "Add a fifth sentence with because: 'It is happy because it is safe.'", frames: ["It is ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My adventure, in order",
        prompt: "Tell an animal adventure at home in four parts: First, Then, Next, At the end. Use a toy or your drawing to show it.",
        length: "45-90 seconds",
        steps: [
          "Look at your four cards from class: First, Then, Next, At the end.",
          "Tell the adventure three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the adventure in order, with First, Then, Next and At the end, and keep talking without long stops.",
        words: ["creep", "escape", "hunt", "peck", "squawk", "nervous"],
        grammar: ["First, Then, Next, At the end", "One animal + verb with -s (it creeps, it escapes)"],
        rubric: [
          { label: "In order", description: "Uses First, Then, Next and At the end to tell the parts in order.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: creep, escape, hunt, peck, squawk.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Verb -s", description: "Says the -s on the verb for one animal: it creeps, she runs.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Then ___.", "At the end, ___."], tips: ["Point to your card as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, a ___ ___s.", "Then it sees a ___.", "Next, they ___.", "At the end, ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["They run because they feel ___.", "My favorite part is ___ because ___."], tips: ["Say why, and say your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u02-l3": {
      objectives: ["I can say how often with always, usually, sometimes, hardly ever and never, fast and in the right place."],
      trim: {
        "Pass the story ball": 4,
        "Finger frequency: a game and a chant": 6,
        "Listen and sing: the song (SB 21 D)": 6,
        "Put the story in order (SB 20 C)": 6,
      },
      add: [
        {
          after: "Practice with your partner (SB 21 E table)",
          slide: {
            kind: "fluency",
            title: "How often? Say it again, say it better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell your partner how often, then do it again with a new partner, smoother.",
            chunks: [
              "I always smile at my friends.",
              "My partner usually plays at break.",
              "A cat sometimes sleeps in the garden.",
              "A tiger hardly ever eats fruit.",
              "A fish never climbs a tree.",
            ],
            recycle: ["Wings help them fly.", "Fish have gills. They swim."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells five sentences about how often animals or you do things, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 2: The same five sentences, smoother. Partner A, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Faster! Partner A, then Partner B. Say them without looking at your notes." },
            ],
            steps: [
              "Think quietly for 30 seconds before round 1. Choose five sentences with the five words: always, usually, sometimes, hardly ever, never.",
              "In each round, Partner A says the sentences, then Partner B. The listener shows fingers: four for always, down to a fist for never.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "Change partner when you hear the bell and say the same sentences again.",
            ],
            prompts: ["I always ...", "My partner usually ...", "A ___ never ..."],
            feedback: fixOften,
            teacherNote: "A short planning time and a new partner each round is task repetition: the second and third telling are fluent because the content is already there. The one-minute fix lets children say the corrected form straight away. Keep the sentences about animals and about yourself, so no child is teased in a 'never' sentence. Listen for the word position, 'is' after the adverb (She is always late) and the -s on he / she / it.",
            tiers: [
              { level: "Support", task: "Say three sentences with the table on the board.", frames: ["I always ___.", "A ___ sometimes ___s.", "A ___ never ___s."] },
              { level: "Core", task: "Say five sentences, one for each word, without looking." },
              { level: "Stretch", task: "Add but: 'A cat usually sleeps in the sun, but it sometimes plays.'", frames: ["A ___ usually ___s, but it sometimes ___s."] },
            ],
          },
        },
        {
          after: "Tell the class about your partner (SB 21 F)",
          slide: {
            kind: "writing",
            title: "All about me: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to always, usually, sometimes, hardly ever and never.",
              "Plan: look at your four boxes. Draw or write a few words in each box. Say one sentence for each box to your partner.",
              "Write: four or five sentences. Use at least three of the how-often words.",
              "Check: tick the checklist. Your partner points to every how-often word and says: before the doing word, or after am.",
              "Teacher: look only at the place of the how-often word and the capital letters and full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: About me",
              text: "I am a happy child. I always walk to school, and I usually eat rice for lunch. I sometimes play football after class, but I hardly ever watch TV. I never go to bed late because I get up early.",
            },
            organiser: [
              { label: "I am", prompt: "Draw yourself. Say how you feel at school." },
              { label: "Always, usually", prompt: "Draw two things you do every day. Say them with always and usually." },
              { label: "Sometimes, hardly ever", prompt: "Draw one thing you do sometimes and one thing you hardly ever do." },
              { label: "Never", prompt: "Draw one thing you never do. Say why." },
            ],
            frames: ["I am ___.", "I always ___, and I usually ___.", "I sometimes ___, but I hardly ever ___.", "I never ___ because ___."],
            checklist: ["Four or five sentences with joining words", "A capital letter at the start and a full stop at the end of every sentence", "The how-often word goes before the doing word and after am / is / are"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Children write about their own routine, so the content is easy and the grammar from this lesson does the work. The four boxes match the four frames. Keep the topic safe (school day, food, play) so no child is teased in a 'never' sentence. Mark only two things (the place of the how-often word and the capital letters and full stops) and let the child find the mistake from your dot. The word-order fix practice now comes from the child finding their own dotted line.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["I always ___.", "I sometimes ___.", "I never ___."] },
              { level: "Core", task: "Write four sentences with at least three how-often words." },
              { level: "Stretch", task: "Add but: 'I usually walk to school, but I sometimes ride a bike.'", frames: ["I usually ___, but I sometimes ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u02-l4": {
      objectives: ["I can describe an animal with it and they, three times, faster each time."],
      trim: {
        "Chant: strong, gentle, patient": 3,
        "Act like an animal": 4,
        "Pronoun swap": 5,
        "Listen, point, say (SB 22 A)": 5,
        "Listen for the details (SB 22 D)": 6,
      },
      add: [
        {
          after: "Describe an animal (SB 23 E)",
          slide: {
            kind: "fluency",
            title: "Animal talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same animal talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "This is a lion. It is strong and fierce.",
              "It has sharp teeth and it can hunt.",
              "Lions live in groups. They sleep a lot.",
              "It is in the mammal group.",
            ],
            recycle: ["My favorite animal is the parrot.", "Birds have wings. They can fly."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the animal talk, then Partner B. The listener counts the describing words on their fingers. Then change partners." },
              { seconds: 45, say: "Round 2: The same talk in less time. Partner A, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Fast and smooth! Partner A, then Partner B. The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Choose an animal. Plan three or four sentences with it and they.",
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, often it / they, and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner. Both lines talk again, A then B, with the same three rounds.",
            ],
            feedback:
              "Listen for it / they: 'Birds are small. It has wings.' After round 1, stop for one minute and put two sentences on the board. For grammar, prompt the child to fix it: point to the word and ask 'One bird or many?', start the phrase and pause ('Birds are small. They ...'), or hold up a finger for the missing -s ('A lion hunt...?'). For a sound, say it right and let the child echo it. Say every final -s clearly yourself.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The correction minute between round 1 and round 2 is what makes it more accurate too.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["This is a ___. It is ___.", "It has ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a group of animals: 'Lions live in groups. They sleep a lot.'", frames: ["___ live in ___. They ___."] },
            ],
          },
        },
        {
          after: "Write the pronouns (SB 23 F)",
          slide: {
            kind: "writing",
            title: "Join them: and, but, so",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Use it or they for the second animal word. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "Lions are fierce. Lions sleep a lot. (but, they)", answer: "Lions are fierce, but they sleep a lot." },
              { q: "A turtle is slow. A turtle is calm. (and)", answer: "A turtle is slow and calm." },
              { q: "Birds have wings. Birds can fly. (and, they)", answer: "Birds have wings and they can fly." },
              { q: "Fish live in water. Fish can't walk. (so, they)", answer: "Fish live in water, so they can't walk." },
            ],
            frames: ["___ are ___, but they ___.", "A ___ is ___ and ___."],
            checklist: ["I used it for one animal and they for many", "The joining word is there: and, but or so", "A capital letter and a full stop"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules, and it removes the repeated noun that makes young writing sound stiff. Model the first one aloud, crossing out the second 'Lions'. Watch it / they: 'Birds have wings and it can fly' is the typical slip.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three ideas: 'A fox is quiet and clever, and it hunts at night.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Animal riddle talk",
        prompt: "Choose an animal. Tell us about it without saying its name: what it is like, what it has and what it can do. Can we guess it?",
        length: "45-90 seconds",
        steps: [
          "Choose an animal and draw it or find a toy. Do not say its name.",
          "Say your riddle three times: each time a little faster, like in class.",
          "Record it once. At the end, say: What is it?",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Describe an animal with it and they, say what it has and can do, and keep talking without long stops.",
        words: ["strong", "gentle", "fierce", "calm", "patient", "group"],
        grammar: ["It is ___. It has ___. It can ___.", "They live in ___. They ___."],
        rubric: [
          { label: "Describes the animal", description: "Says what it is like, what it has and what it can do.", weight: 3 },
          { label: "It and they", description: "Uses it for one animal and they for many animals correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on has, lives and hunts can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It is ___.", "It has ___.", "What is it?"], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["It is ___ and ___. It has ___.", "It can ___. It lives in ___."], tips: ["Say two things it is like."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["These animals live in groups. They ___.", "It is ___, but it is sometimes ___."], tips: ["Talk about a group of animals and use they."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u02-l5": {
      objectives: ["I can ask and answer questions about an animal quickly, round the circle."],
      trim: { "Animal group chant and sort": 4 },
      add: [
        {
          after: "Guess my animal: card game (SB 25 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: guess the animal",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Is it a mammal? Yes, it is.",
              "Does it have fur? No, it doesn't.",
              "Can it fly? Yes, it can.",
              "It is a bird! You are right!",
            ],
            recycle: ["The parrot is usually loud.", "A fish never climbs a tree."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an animal card that only they can see." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left a question about their animal: Is it ___? Does it ___? Can it ___?",
              "They answer with a short answer. When you guess it, say: It is a ___!",
              "Then they turn and ask the next friend about their card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Is it a ___?", "Does it ___?", "Can it ___?"],
            feedback:
              "Listen for 'Does it has...?' (the -s is not needed after does), 'Yes, it have' and a missing 'does'. After round 1, stop for one minute and fix two sentences on the board. For grammar, prompt the child to fix it: start the phrase and pause ('Does it ...?'), point to the frame, or hold up a finger for the short answer ('Yes, it d...?'). For a sound, say it right and let the child echo it. Say every final -s clearly yourself.",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Does it ...?' automatic. Time the whole circle and tell them; children love beating their own time. Mix in a 'How often does it ...?' question now and then so the unit's how-often words stay fast too.",
            tiers: [
              { level: "Support", task: "Answer 'Yes, it is.' or 'No, it isn't.' and pass the question on with the frame on the board.", frames: ["Is it a ___?", "Does it ___?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a fact: 'No, it doesn't. It has feathers.'", frames: ["No, it doesn't. It has ___."] },
            ],
          },
        },
        {
          after: "Put your cards on the wall: gallery talk (SB 25 C)",
          slide: {
            kind: "writing",
            title: "Write my pet card",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the group, the body part and the how-often word.",
              "Write three sentences about your animal with the frames.",
              "Swap with your partner. Do they know which animal it is?",
            ],
            text: {
              title: "Pet card",
              text: "This is a rabbit. It is in the mammal group. It has soft fur and long ears. It usually eats carrots, but it sometimes eats grass.",
            },
            frames: ["This is a ___. It is in the ___ group.", "It has ___ and ___.", "It usually ___s, but it sometimes ___s."],
            checklist: ["It for one animal", "The how-often word goes before the doing word", "-s on has, eats, sleeps"],
            sayIt: "Say your pet card to your partner without looking at it.",
            teacherNote: "A model first, then children write their own with frames. Let them notice the model before they copy it: Where does 'usually' go? What does 'but' do? Use the child's own animal card from the main task so the writing has something real to say.",
            tiers: [
              { level: "Support", task: "Copy the model and change the animal and one body part." },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Write four sentences and use 'because' once: 'It is calm because it sleeps a lot.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u02-l6": {
      objectives: ["I can say how often animals do things, fast and in the right place: Grammar Champions."],
      trim: {
        "Remember it!": 5,
        "Zookeeper's line: run and say": 6,
        "Grammar mystery: a week at Sunny Zoo": 7,
      },
      add: [
        {
          after: "Zookeeper's line: run and say",
          slide: {
            kind: "fluency",
            title: "Champion sprint: how often?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "A cat always sleeps in the sun.",
              "A penguin never flies.",
              "A tortoise hardly ever runs.",
              "The giraffe is usually calm.",
              "How often does it sleep?",
            ],
            recycle: ["Birds have wings. They can fly.", "Does it hunt? Yes, it does."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes an animal card with a how-often word; the class says the sentence." },
              { seconds: 45, say: "Half the class asks 'How often does it sleep?', the other half answers. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute and fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: fixOften,
            teacherNote: "A quick, high-energy recall of the unit with the five words in their places, plus Unit 1's they / it phrases (spaced retrieval keeps them fast). Listen for the adverb before the verb and after is, and the -s. The question 'How often does it ...?' is new for some children: prompt with a finger for 'does'.",
            tiers: [
              { level: "Support", task: "Say the sentence with the ladder on the board.", frames: ["A ___ always / never ___s.", "The ___ is usually ___."] },
              { level: "Core", task: "Say the sentence without looking." },
              { level: "Stretch", task: "Add but: 'A tortoise hardly ever runs, but it always walks.'" },
            ],
          },
        },
        {
          after: "Write it: how often?",
          slide: {
            kind: "writing",
            title: "My animal paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the how-often words and to it.",
              "Plan: choose an animal. Draw or write a few words in each of your four boxes. Say one sentence for each box to your partner.",
              "Write: four or five sentences about your animal. Use it for one animal.",
              "Check: tick the checklist. Your partner points to every capital letter and every -s on a doing word.",
              "Teacher: look only at the place of the how-often word and the -s on the doing word. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: The tortoise",
              text: "The tortoise is a slow animal. It always walks slowly, and it usually eats leaves. It sometimes sleeps in the sun, but it hardly ever runs. It never flies because it has no wings.",
            },
            organiser: [
              { label: "My animal", prompt: "Draw your animal. Say its name and one word to describe it." },
              { label: "Always, usually", prompt: "Draw what it always and usually does." },
              { label: "Sometimes, hardly ever", prompt: "Draw what it sometimes does and what it hardly ever does." },
              { label: "Never", prompt: "Draw one thing it never does. Say why." },
            ],
            frames: ["The ___ is a ___ animal.", "It always ___s, and it usually ___s.", "It sometimes ___s, but it hardly ever ___s.", "It never ___s because ___."],
            checklist: ["Four or five sentences with joining words", "A capital letter at the start and a full stop at the end of every sentence", "One animal: the doing word has -s (it always sleeps)"],
            sayIt: "Read your animal paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The paragraph is the script for the recorded talk at home ('My animal: how often?'), so tell the children to keep it. It uses the whole grammar set in a short text with it and the verb -s. Mark only two things (the place of the how-often word and the -s) and let the child find the mistake from your dot. The unit's common mistakes are now found and fixed in the children's own writing.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["The ___ is a ___ animal.", "It always ___s.", "It never ___s."] },
              { level: "Core", task: "Write four sentences about your animal with at least three how-often words." },
              { level: "Stretch", task: "Add a fifth sentence about a different animal: 'A ___ is different because ...'", frames: ["A ___ is different because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal: how often?",
        prompt: "Choose an animal, your pet or a favorite one. Tell us how often it does things: what it always, usually, sometimes, hardly ever and never does.",
        length: "45-90 seconds",
        steps: [
          "Choose an animal and find a picture or a toy.",
          "Say your five sentences three times: each time a little faster, like in class.",
          "Record it once. Show the animal to the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say how often an animal does things with always, usually, sometimes, hardly ever and never, and keep talking without long stops.",
        words: ["always", "usually", "sometimes", "hardly ever", "never", "creep", "hunt"],
        grammar: ["always / usually / sometimes / hardly ever / never before a doing word", "is / are + always, usually ...", "he / she / it + verb with -s"],
        rubric: [
          { label: "How-often words", description: "Uses at least three of the five words and puts them in the right place.", weight: 3 },
          { label: "Verb -s", description: "Says the -s for one animal: it sleeps, it never flies.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Animal words", description: "Uses words from the unit: creep, hunt, peck, strong, calm.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My ___ always ___s.", "It never ___s."], tips: ["Hold up fingers for each word."] },
          { level: "Core", who: "Most children", frames: ["My ___ always ___s and usually ___s.", "It sometimes ___s, but it never ___s."], tips: ["Use at least three of the five words."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It is usually ___, but it is sometimes ___.", "A ___ is different from a ___ because ..."], tips: ["Say how your animal is different from another one."] },
        ],
      },
    },
  },
};
