import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 9 "Numbers All
// Around" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 8's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Two lessons end with a recorded talk
// for home, built on the routine the class just did. Time comes from warm-ups, games and
// repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('I don't ...?'), or hold up a finger for the missing -s. For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('pencils', 'erasers', 'socks'): children copy what they hear.";

const haveFix =
  " This unit's slips: 'I no have' or 'I don't has' (start 'I don't ...' and pause, point at don't + have), 'two pencil' (hold up two fingers, then tap the -s on the board), a missing a/an ('I have kite': point to the frame 'a ___').";

export const odL1U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u09-l1": {
      objectives: ["I can count and say 'Two is an even number.' fast, without stopping."],
      trim: { "Count with me": 4, "Number hunt": 5, "Odd and even hop": 5 },
      add: [
        {
          after: "Count and tell (SB 87 C)",
          slide: {
            kind: "fluency",
            title: "Number sprint: count and say",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I can count to ten.", "Two is an even number.", "Three is an odd number.", "I count five pencils.", "We count six children."],
            recycle: ["I build a tree house.", "I make apple pie."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a number card and the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the number card. Say a WHOLE sentence: 'Two is an even number.' or 'Three is an odd number.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["(card: 2)", "(card: 3)", "(card: 5 pencils)", "(card: 6 children)", "(card: 10)"],
            feedback:
              correct +
              " Here: if a child says 'Two is a even number', say 'an' with the 'an' card up, then let them say it again; if they say 'I count five pencil', hold up five fingers and tap the -s.",
            teacherNote:
              "Whole sentences only, never single numbers: the aim is 'Three is an odd number' as one smooth piece. Listen for 'an' before odd and even, and for the -s on pencils. Mix in Unit 8's cards every few turns so those phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["___ is an odd number.", "___ is an even number."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a count: 'Four is an even number. I count four pencils.'", frames: ["___ is an ___ number. I count ___ ___."] },
            ],
          },
        },
        {
          after: "Circle the answer (SB 88 B)",
          slide: {
            kind: "writing",
            title: "My number: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the four sentences.",
              "Plan: draw your favorite number, your things and you counting. Say one sentence for each box to your partner.",
              "Write: four short sentences with the frames.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and 'an' before even and odd. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My favorite number",
              text: "Six is my favorite number. Six is an even number. I have six pencils and six erasers. I can count to ten!",
            },
            organiser: [
              { label: "My number", prompt: "Draw your favorite number. What is it?" },
              { label: "Odd or even", prompt: "Draw the number in dots. Is it odd or even? Say it." },
              { label: "My things", prompt: "Draw that many pencils or toys. What do you have?" },
            ],
            frames: ["___ is my favorite number.", "___ is an ___ number.", "I have ___ ___ and ___ ___.", "I can count to ___!"],
            checklist: ["Four sentences, and each one starts with a capital letter", "A full stop or ! at the end of every sentence", "'an' before odd and even (an even number)"],
            sayIt: "Read your sentences to your partner. Then say them again without looking.",
            teacherNote: "A first paragraph for six-year-olds: four very short sentences planned by drawing in three boxes, so no notes are needed. Mark only two things (capital letters and 'an') and let the child find the mistake from your dot. Children may copy the model and change the number.",
            tiers: [
              { level: "Support", task: "Copy the model and change the number and the things.", frames: ["___ is my favorite number.", "I have ___ ___."] },
              { level: "Core", task: "Write four sentences about your own number." },
              { level: "Stretch", task: "Add a fifth sentence: 'I count my ___ every day.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u09-l2": {
      objectives: ["I can tell a partner an adding sentence three times, faster each time."],
      trim: { "Odd foot, even feet": 4, "Walk the number line": 5 },
      add: [
        {
          after: "Make a problem for your partner",
          slide: {
            kind: "fluency",
            title: "Adding talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same adding talk to three friends. Each talk is shorter and smoother.",
            chunks: ["I have two pencils and three erasers.", "Two plus three equals five.", "The answer is five!", "What is four plus one?"],
            recycle: ["I build a snowman in winter.", "I don't build a snowman in the summer."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A tells the adding talk, then Partner B tells theirs. The listener counts the things on their fingers. Then change partners." },
              { seconds: 30, say: "Round 2: Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: Partner A, then Partner B: fast and smooth! The listener says 'Five!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A talks, then Partner B talks.", "Choose some counters or pencils. Say what you have and add them up.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same three rounds with each new partner: A talks, then B talks, then change partners.",
            ],
            feedback:
              correct +
              " Here: 'Two plus three equal five' is very common: say 'equals' with a clear -s and let the child echo it. For 'two pencil', hold up two fingers and pause.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix in the middle is what makes it more accurate too.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I have ___ and ___.", "___ plus ___ equals ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Ask your partner a problem at the end: 'What is two plus four?'" },
            ],
          },
        },
        {
          after: "How do we use addition every day? (SB 91)",
          slide: {
            kind: "writing",
            title: "My adding paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the sentence that tells what it is about, then the two details and the end.",
              "Plan: draw what you have, draw the adding, draw the answer. Say one sentence for each box to your partner.",
              "Write: four short sentences with the frames.",
              "Check: tick the checklist. Your partner counts your things: is your answer right?",
              "Teacher: look only at 'equals' with its -s and the plural -s (pencils, erasers). Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Adding in my bag",
              text: "In my bag, I have two pencils and three erasers. Two plus three equals five. The answer is five! I have five things in all.",
            },
            organiser: [
              { label: "What I have", prompt: "Draw two groups of things from your bag. How many in each group?" },
              { label: "Add them", prompt: "Draw the two groups together. Say: ___ plus ___." },
              { label: "The answer", prompt: "Write the answer number and circle all the things. How many in all?" },
            ],
            frames: ["In my bag, I have ___ ___ and ___ ___.", "___ plus ___ equals ___.", "The answer is ___!", "I have ___ things in all."],
            checklist: ["Four sentences, and each one starts with a capital letter", "A full stop or ! at the end of every sentence", "More than one: -s (pencils, erasers) and 'equals' has -s"],
            sayIt: "Read your adding paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The paragraph is the script for the recorded adding talk at home: the children read it, then tell it faster without looking. Plan by drawing, so no notes are needed. Mark only two things ('equals' and the plural -s). Check the adding together: a wrong sum is a good chance to count again.",
            tiers: [
              { level: "Support", task: "Copy the model and change the numbers.", frames: ["In my bag, I have ___ ___ and ___ ___.", "___ plus ___ equals ___."] },
              { level: "Core", task: "Write four sentences about your own things." },
              { level: "Stretch", task: "Add a question for your partner: 'What is ___ plus ___?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My counting and adding talk",
        prompt: "Find some things at home: pencils, spoons, toys. Count them, say what you have and add two groups together.",
        length: "30-60 seconds",
        steps: [
          "Find two small groups of things at home.",
          "Say your adding talk three times: each time a little faster, like in class.",
          "Record it once. Show the things to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say what you have, add two groups, and keep talking without long stops.",
        words: ["count", "plus", "equals", "pencils", "answer", "odd", "even"],
        grammar: ["I have ___ and ___.", "___ plus ___ equals ___."],
        rubric: [
          { label: "What I have", description: "Says what they have with a number, using 'I have ___ ___.'", weight: 2 },
          { label: "Adding sentence", description: "Says one adding sentence: 'Two plus three equals five.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of pencils and equals can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I have ___ ___.", "___ plus ___ equals ___."], tips: ["Count the things with your finger."] },
          { level: "Core", who: "Most children", frames: ["I have ___ ___ and ___ ___.", "___ plus ___ equals ___. The answer is ___!"], tips: ["Say it in one smooth sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["What is ___ plus ___? The answer is ___.", "___ is an odd number. / ___ is an even number."], tips: ["Ask the viewer a problem, then answer it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u09-l3": {
      objectives: ["I can say 'I have ___.' and 'I don't have ___.' fast, again and again."],
      trim: { "Show me with fingers": 3, "Ball toss: I have ...": 6, "Me too! Find your match": 6 },
      add: [
        {
          after: "Ball toss: I have ...",
          slide: {
            kind: "fluency",
            title: "Same task again: I have, I don't have",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same card task three times. Each time is smoother, with fewer stops.",
            chunks: ["I have a pet.", "I don't have a kite.", "You have a pencil.", "We have two hats.", "They have bicycles."],
            recycle: ["I don't build a snowman in the summer.", "Do you make apple pie? No, I don't."],
            rounds: [
              { seconds: 45, say: "Round 1: Take three picture cards. Partner A tells about each card: 'I have ___.' or 'I don't have ___.' Then Partner B. Then change partners." },
              { seconds: 30, say: "Round 2: New partner. The same three cards, the same sentences, in less time. Partner A, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: New partner. Same again: smooth and fast, no stops! Partner A, then Partner B." },
            ],
            steps: [
              "Pick three picture cards. Put them face up.",
              "Say a whole sentence for each card: 'I have ___.' for things you have, 'I don't have ___.' for the others.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round Partner A talks, then Partner B talks. When you hear the bell, find a new partner. Keep the same cards.",
            ],
            prompts: ["(card: pet)", "(card: kite)", "(card: pencil)", "(card: two hats)", "(card: bicycles)"],
            feedback: correct + haveFix,
            teacherNote:
              "Task repetition: the same task with a new listener lets the child use the words they already found, so the second and third rounds are faster and smoother. Keep the cards the same all three times; changing them would turn practice into a new task. Say 'don't have' clearly yourself, with the final t.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["I have a ___.", "I don't have a ___."] },
              { level: "Core", task: "Say all three sentences alone, without the board." },
              { level: "Stretch", task: "Add 'You have' and 'We have' sentences: 'You have a pencil. We have two hats.'" },
            ],
          },
        },
        {
          after: "Look and check (SB 93 E)",
          slide: {
            kind: "writing",
            title: "Fix the 'I have' sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing word, a missing a, or a missing -s.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "I no have a pet.", answer: "I don't have a pet." },
              { q: "I have kite.", answer: "I have a kite." },
              { q: "We have two kite.", answer: "We have two kites." },
              { q: "I don't has a pencil.", answer: "I don't have a pencil." },
            ],
            checklist: ["'I don't have', not 'I no have'", "A word like a before one thing", "More than one: -s", "A full stop at the end"],
            sayIt: "Read your fixed sentences to your partner, then say them again without looking.",
            teacherNote:
              "Vietnamese has no 'do' for negatives and no plural ending, so 'I no have' and 'two kite' are this class's most common slips. Fix item 1 together first, then let pairs do the rest. Keep it to these four kinds of mistake so the children can check for them.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the teacher." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u09-l4": {
      objectives: ["I can ask and answer 'How old are you?' and talk about my things, fast."],
      trim: { "Zip, zip, my backpack": 3, "Mystery backpack": 4, "What's missing? (SB 94 B)": 3, "How many in our class? (SB 94 Think)": 3 },
      add: [
        {
          after: "How old are you? (SB 95 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: How old are you?",
            routine: "question chain",
            mode: "whole",
            minutes: 5,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["How old are you?", "I'm seven years old.", "I'm seven, too!", "How about you?", "I have two pencils."],
            recycle: ["I have a pet.", "I don't have a kite."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds a number card for their age." },
              { seconds: 45, say: "Swap cards. Go faster!" },
              { seconds: 30, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your age card so only you can see it.",
              "Ask the friend on your left: 'How old are you?'",
              "They answer: 'I'm ___ years old.' Then they say 'How about you?' to the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["How old are you?", "How about you?"],
            feedback:
              correct +
              " Here: 'I'm seven year old' misses the -s: hold up seven fingers and tap the -s. 'I'm seven' without 'years old' is fine for now.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'How old are you?' automatic. Time the whole circle and tell them; children love beating their own time. Age cards mean nobody has to find a number word on the spot.",
            tiers: [
              { level: "Support", task: "Answer with 'I'm ___.' and pass the question on with the frame on the board.", frames: ["I'm ___ years old.", "How about you?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a sentence about your things: 'I'm seven. I have two pencils.'" },
            ],
          },
        },
        {
          after: "Tell your partner about your things (SB 95 Write)",
          slide: {
            kind: "writing",
            title: "Read, then write about my things",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Find the full stops.",
              "Write two sentences about your own things with the frames.",
              "Read them to your partner, then say them without looking.",
            ],
            text: { title: "My school things", text: "I have three pencils and two erasers. I don't have a ruler. I'm seven years old." },
            frames: ["I have ___ ___.", "I don't have a ___.", "I'm ___ years old."],
            checklist: ["A capital letter at the start", "More than one: -s (pencils, erasers)", "A full stop at the end of every sentence"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill in your number." },
              { level: "Core", task: "Write two sentences about your things." },
              { level: "Stretch", task: "Write three sentences and tell your age." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u09-l5": {
      objectives: ["I can tell about my backpack three times, faster each time."],
      trim: { "Remember it!": 5, "Grab and count champions": 8 },
      add: [
        {
          after: "Backpack secrets",
          slide: {
            kind: "writing",
            title: "My backpack: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the sentence that says what it is about, then the details and the ending.",
              "Plan: draw your backpack, the things you have, and one thing you don't have. Say one sentence for each box to your partner.",
              "Write: four short sentences with the frames.",
              "Check: tick the checklist. Your partner points to every capital letter and every -s.",
              "Teacher: look only at 'don't have' and the plural -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My backpack",
              text: "My backpack is red. I have three pencils and two erasers. I don't have a ruler. I like my backpack!",
            },
            organiser: [
              { label: "My backpack", prompt: "Draw your backpack. What color is it?" },
              { label: "I have", prompt: "Draw the things you have. How many of each?" },
              { label: "I don't have", prompt: "Draw one thing you don't have, with a cross on it." },
            ],
            frames: ["My backpack is ___.", "I have ___ ___ and ___ ___.", "I don't have a ___.", "I like my backpack!"],
            checklist: ["Four sentences, and each one starts with a capital letter", "A full stop or ! at the end of every sentence", "'I don't have', not 'I no have'; more than one: -s"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This paragraph is the script for the recorded talk at home ('I have, I don't have: my things'): the child reads it, then tells it without looking. Plan by drawing in three boxes; the drawings are the plan. Mark only two things ('don't have' and the plural -s). Children may copy the model and change the words.",
            tiers: [
              { level: "Support", task: "Copy the model and change the color and the things.", frames: ["My backpack is ___.", "I have ___ ___."] },
              { level: "Core", task: "Write four sentences about your own backpack." },
              { level: "Stretch", task: "Add a question: 'Do you have a ruler?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Retell my backpack: three times",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell what is in your backpack three times. Each time is shorter, smoother and faster.",
            chunks: ["I have three pencils.", "I don't have a ruler.", "Do you have an eraser? Yes, I do.", "We have six things in all!"],
            recycle: ["Do you watch leaves fall? Yes, I do.", "Do you bring your friends? Yes, I do."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A tells what is in the backpack, then Partner B. Use your cards or things. Then change partners." },
              { seconds: 30, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Take your backpack things or three picture cards.",
              "Tell your partner what you have and what you don't have. In each round Partner A talks, then Partner B talks.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on to round 2.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(card: pencils)", "(card: ruler)", "(card: eraser)"],
            feedback: correct + haveFix + " For 'Yes, I have' to 'Do you have ...?', start 'Yes, I d...' and pause: they finish with 'do'.",
            teacherNote:
              "Retelling the same information to three new partners gives the speed of repeating without a script: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix in the middle helps accuracy as well as speed. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["I have ___.", "I don't have ___."] },
              { level: "Core", task: "Tell all your things without the frames." },
              { level: "Stretch", task: "Add a question and a total: 'Do you have an eraser? We have six things!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "I have, I don't have: my things",
        prompt: "Show three things you have and one thing you don't have. Count them and say how many you have in all.",
        length: "30-60 seconds",
        steps: [
          "Find three things at home that you have, like pencils, toys or books.",
          "Say what you have and what you don't have three times: each time a little faster, like in class.",
          "Record it once. Show each thing to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say 'I have' and 'I don't have' with numbers, and keep talking without long stops.",
        words: ["have", "don't have", "pencils", "erasers", "ruler", "count"],
        grammar: ["I have ___ ___.", "I don't have a ___.", "We have ___ in all!"],
        rubric: [
          { label: "I have", description: "Says what they have with numbers: 'I have three pencils.'", weight: 3 },
          { label: "I don't have", description: "Says one thing they do not have: 'I don't have a ruler.', not 'I no have'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 2 },
          { label: "Clear endings", description: "The -s at the end of pencils and erasers can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I have ___ ___.", "I don't have a ___."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["I have ___ ___ and ___ ___.", "I don't have a ___. We have ___ in all!"], tips: ["Say how many in all."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Do you have a ___? Ask your grown-up!", "You have ___. We have ___ together."], tips: ["Ask your grown-up a question and count your things together."] },
        ],
      },
    },
  },
};
