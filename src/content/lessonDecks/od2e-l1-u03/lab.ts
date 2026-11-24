import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 3 "Colors All
// Around" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 2's phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Lessons 2 and 5 end with a
// recorded talk for home (Lesson 4 already has its own "My colors" video). Time comes
// from games and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('There ... ?'), or hold up a finger for the missing -s. For a sound, just say it right and let them echo it. Say every final -s clearly yourself (birds, frogs, butterflies): children copy what they hear.";

export const odL1U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u03-l1": {
      objectives: ["I can ask 'What color is it?' and answer fast: 'It's red.'"],
      trim: { "Run and touch": 3, "Simon says: colors": 4 },
      add: [
        {
          after: "What color is it?",
          slide: {
            kind: "fluency",
            title: "Color sprint: what color is it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["What color is it?", "It's red.", "Is it blue? No, it isn't.", "Yes, it is. It's blue!"],
            recycle: ["This is a zebra.", "Do you like animals? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher holds up a crayon, the class asks and answers." },
              { seconds: 60, say: "Pairs: one holds a crayon behind their back, the other guesses. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many colors can you say?" },
            ],
            steps: [
              "Look at the crayon. Say the WHOLE sentence: 'It's red.'",
              "Guess like a detective: 'Is it blue?' 'No, it isn't.' 'Is it green?' 'Yes, it is!'",
              "Listen for the clap: it means change.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and the class fixes them; then go on.",
            ],
            prompts: ["(crayon: red)", "(crayon: yellow)", "(crayon: purple)", "(crayon: brown)", "(crayon: black)"],
            feedback: correct + " For example: if a child says 'No, it not', say 'No, it ...?' and wait for 'isn't'.",
            teacherNote: "Whole sentences only, never single words: the aim is 'Is it blue? No, it isn't.' as one smooth piece. Say the final 't' of 'isn't' and the -s of 'It's' clearly. Mix in a Unit 2 card now and then so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["What color is it?", "It's ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Guess, then say a color thing: 'Is it green? No, it isn't. It's a purple kite!'", frames: ["Is it ___? No, it isn't. It's ___."] },
            ],
          },
        },
        {
          after: "Which picture? (SB 28 B)",
          slide: {
            kind: "writing",
            title: "Grow my color sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: put the color word BEFORE the thing.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see a bird. (add: blue)", answer: "I see a blue bird." },
              { q: "It's a frog. (add: green)", answer: "It's a green frog." },
              { q: "I like the kite. (add: yellow)", answer: "I like the yellow kite." },
              { q: "This is a bag. (add: purple)", answer: "This is a purple bag." },
            ],
            frames: ["I see a ___ ___.", "It's a ___ ___."],
            checklist: ["The color word comes BEFORE the thing", "A capital letter at the start", "A full stop at the end"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "In Vietnamese the color comes after the thing (con chim xanh), in English before it (a blue bird). This is the pattern the whole unit builds on, so let the children say 'blue bird' with a clap on each word before they write.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and color the picture." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I see a red kite and a blue bird.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u03-l2": {
      objectives: ["I can say my favorite color three times, faster each time."],
      trim: { "Freeze and point": 3, "Draw a tree": 5 },
      add: [
        {
          after: "My favorite color",
          slide: {
            kind: "fluency",
            title: "Color talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same color talk to three friends. Each talk is shorter and smoother.",
            chunks: ["My favorite color is blue.", "I like the blue sky.", "I like the blue fish.", "Do you like blue? Yes, I do!"],
            recycle: ["That is a lion.", "I like animals."],
            rounds: [
              { seconds: 45, say: "Partner 1: tell your color talk with your own color. The listener holds up a finger for each thing you like." },
              { seconds: 35, say: "Partner 2: the same talk in less time." },
              { seconds: 25, say: "Partner 3: fast and smooth! The listener says 'Nice!' at the end." },
            ],
            steps: [
              "Pick your color and two things you like in that color.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing 'the' or the color after the thing) and fix them together; then go on.",
              "When the bell rings, one line moves one step to the left: a new partner.",
              "Say the same talk again, faster. Do not add new things: say it smoother.",
            ],
            feedback: correct + " For example: if a child says 'I like fish blue', say 'I like the blue ...?' with a pause and let them find 'fish'.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity made small for six-year-olds. The new partner keeps the repetition real. The gain comes from saying the same thing more smoothly, so do not add new language between rounds. Listen for the color word going before the thing.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite color is ___.", "I like the ___ ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add where you see it: 'I like the blue sky. I can see blue in the sea.'" },
            ],
          },
        },
        {
          after: "More poems (SB 31)",
          slide: {
            kind: "writing",
            title: "Listen and write: what I see",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Remember the rule: the color goes BEFORE the thing. Many things end in -s.",
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again. Write the key words you hear: numbers, colors, animals.",
              "With your partner, build the text again. Then check it with the teacher.",
            ],
            text: { title: "A color walk", text: "I see two red butterflies. I see three brown birds. I see a black spider. I like the green frogs!" },
            frames: ["I see ___ ___ ___.", "I like the ___ ___."],
            checklist: ["The color goes before the animal", "More than one: butterflies, birds, frogs all end in -s", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your text to the class in a walking voice, then say it again without looking.",
            teacherNote: "Read the text twice at a natural pace, with a clear -s on 'birds' and 'frogs'. Do not read it a third time: children rebuild the meaning together, which is the point of a dictogloss. Accept any rebuilding that keeps the colors, numbers and animals.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and use the frames." },
              { level: "Core", task: "Rebuild the whole text with a partner." },
              { level: "Stretch", task: "Rebuild it, then add one more thing you see in your own color." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My color video",
        prompt: "Show two things in your favorite color. Say what the color is, what you like and where you can see it.",
        length: "30-60 seconds",
        steps: [
          "Find two things at home in your favorite color.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Hold up each thing as you talk.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say your favorite color, say what you like in that color, and keep talking without long stops.",
        words: ["red", "blue", "green", "yellow", "purple", "black", "brown", "white"],
        grammar: ["My favorite color is ___.", "I like the + color + thing"],
        rubric: [
          { label: "Favorite color", description: "Says 'My favorite color is ___.' and names at least one thing.", weight: 3 },
          { label: "Color before thing", description: "Says 'the blue sky', not 'the sky blue'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear sounds", description: "The sounds at the end of words can be heard: black, red, birds.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite color is ___.", "I like the ___ ___."], tips: ["Hold up your thing as you speak."] },
          { level: "Core", who: "Most children", frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___.", "Do you like ___?"], tips: ["Say two things and ask a question at the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I can see ___ in the ___.", "I see a ___ ___ in my room."], tips: ["Say where you can see your color."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u03-l3": {
      objectives: ["I can say 'There is a ___' and 'There are ___s' fast, round the circle."],
      add: [
        {
          after: "Look around (SB 33 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: what can you see?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["What can you see?", "Look! There's a green frog.", "Look! There are two green frogs.", "There are three blue birds."],
            recycle: ["What color is it? It's red.", "These are zebras."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds an animal card with a number and a color." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'What can you see?'",
              "They look at their card and answer: 'Look! There's a ...' or 'Look! There are two ...' Then they turn and ask the next friend.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: one black spider)", "(card: two green frogs)", "(card: three brown birds)", "(card: one red butterfly)", "(card: four yellow flowers)"],
            feedback: correct + " For example: if a child says 'There is two frogs', hold up two fingers, say 'There ... ?' and wait for 'are'.",
            teacherNote: "The chain makes every child say 'There is' and 'There are' many times in a few minutes, which is what makes the choice automatic. One thing: 'There is' for one, 'There are' for more than one. Vietnamese learners often say 'There have', so say 'There is / There are' yourself, clearly, again and again. Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frames on the board and pass the question on.", frames: ["Look! There's a ___ ___.", "Look! There are ___ ___s."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Say two things: 'There's a red kite and there are two blue birds.'" },
            ],
          },
        },
        {
          after: "Practice with a partner (SB 33 D)",
          slide: {
            kind: "writing",
            title: "Fix the zoo sign sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "The zoo signs have mistakes! Read each one with your partner.",
              "Find the mistake: 'is' or 'are', a missing -s or 'have'.",
              "Write the sign the right way. Read it aloud together.",
            ],
            items: [
              { q: "There have a black spider.", answer: "There is a black spider." },
              { q: "There is two green frogs.", answer: "There are two green frogs." },
              { q: "There are three white bird.", answer: "There are three white birds." },
              { q: "There are a red kite.", answer: "There is a red kite." },
            ],
            checklist: ["One thing: There is", "More than one: There are + -s", "A capital letter and a full stop"],
            sayIt: "Say all four fixed signs to your partner, fast.",
            teacherNote: "Focus on only two error types today: is/are and the plural -s. 'There have' is the classic Vietnamese slip, because 'có' means both 'have' and 'there is'; say it out loud once, kindly, and move on. Fix sentence 1 together first.",
            tiers: [
              { level: "Support", task: "Fix signs 1 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all four signs." },
              { level: "Stretch", task: "Write one new zoo sign with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u03-l4": {
      objectives: ["I can invite a friend and answer: 'Sure! Let's play!'"],
      add: [
        {
          after: "Invite three friends",
          slide: {
            kind: "fluency",
            title: "Invite again: new friend, same talk",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same invitation talk with new friends. Each time it is smoother.",
            chunks: ["Do you want to play with me?", "Sure! Let's play with the ball.", "OK. Good idea!", "Look! There are pink fireworks!"],
            recycle: ["There's a green frog.", "What color is it? It's red."],
            rounds: [
              { seconds: 60, say: "Plan with your partner: what will you play? Then say the invitation." },
              { seconds: 45, say: "New partner. The same talk, smoother." },
              { seconds: 45, say: "New partner. Same talk again. Can you say it without looking?" },
            ],
            steps: [
              "Choose a game: ball, kite or cards. Say the invitation.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and the class fixes them; then go on.",
              "When the bell rings, find a new partner and do it again.",
              "The one who answers says 'Sure!' with a big smile.",
            ],
            feedback: correct + " For example: if a child says 'Do you want play with me?', point to the frame and say 'Do you want to ...?' and wait for 'to play'.",
            teacherNote: "Task repeat: the same task with new partners after a short planning minute. The repeat lets children free their attention from finding words to saying them smoothly. Keep the language the same on purpose. Listen for 'to' in 'want to' and the sound at the end of 'Let's'.",
            tiers: [
              { level: "Support", task: "Say the invitation and answer with the frames.", frames: ["Do you want to play with me?", "Sure! Let's play ___."] },
              { level: "Core", task: "Say the whole talk without the board." },
              { level: "Stretch", task: "Add what you see: 'Look! There are two pink fireworks!'" },
            ],
          },
        },
        {
          after: "Rhyme and write (SB 35 Write)",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "There is a pink cat. There is a pink hat. (and)", answer: "There is a pink cat and a pink hat." },
              { q: "The sky is dark. The sky is gray. (and)", answer: "The sky is dark and gray." },
              { q: "There are red fireworks. There are orange fireworks. (and)", answer: "There are red fireworks and orange fireworks." },
            ],
            checklist: ["Only one 'There is' or 'There are' in my sentence", "'and' joins the two things", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'There is'. Accept 'red and orange fireworks' for item 3. Link it to the class poem: a rhyming pair like 'cat and hat' is just two things joined with 'and'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'There is a pink cat, a pink hat and a pink bag.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u03-l5": {
      objectives: ["I can tell about my garden: 'There is a ___. There are ___s.'"],
      add: [
        {
          after: "Two gardens",
          slide: {
            kind: "fluency",
            title: "Garden retell: shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 5,
            goal: "Tell about your garden three times. Each time is shorter, smoother and faster.",
            chunks: ["In my garden there is a red flower.", "There are three yellow butterflies.", "There are two brown birds.", "Look! Colors everywhere!"],
            recycle: ["Do you want to play with me? Sure!", "These are zebras."],
            rounds: [
              { seconds: 45, say: "Tell your partner about your garden picture with the key-word cards." },
              { seconds: 35, say: "New partner. Tell it again in less time." },
              { seconds: 25, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your garden picture. Pick three key-word cards: one thing, two things, three things.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s) and the class fixes them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(card: one red flower)", "(card: three yellow butterflies)", "(card: two brown birds)"],
            feedback: correct + " For example: if a child says 'There are two bird', hold up two fingers and say 'two bir...?' and wait for the -s.",
            teacherNote: "Same garden three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. Keep the key-word cards on the board for Support children. Accept short tellings; the shrinking time does the work. Listen for 'is' with one and 'are' with more than one.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["There is a ___ ___.", "There are three ___ ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add a question: 'Is there a red flower in your garden?'", frames: ["Is there a ___ ___? Yes, there is."] },
            ],
          },
        },
        {
          after: "Seeds and flowers",
          slide: {
            kind: "writing",
            title: "Write my garden",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Listen to the model. Find 'There is' and 'There are'.",
              "Write two sentences about your garden with the frames.",
              "Read them to your partner. Do they match your picture?",
            ],
            text: { title: "My garden", text: "In my garden there is a red flower. There are three yellow butterflies. There are two brown birds. I like my garden!" },
            frames: ["In my garden there is a ___ ___.", "There are three ___ ___."],
            checklist: ["One thing: There is", "More than one: There are + -s", "A capital letter and a full stop"],
            sayIt: "Show your picture to a partner and say your sentences without reading.",
            teacherNote: "Notice with the class first: one flower, 'There is'; three butterflies, 'There are'. Then children write their own with the frames. The spoken step at the end keeps the writing tied to the talk from the garden retell.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill in your color and thing." },
              { level: "Core", task: "Write two sentences about your garden." },
              { level: "Stretch", task: "Write three sentences and finish with 'Look! Colors everywhere!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My colorful garden",
        prompt: "Show your garden, a park or your room. Say what there is and what there are, and what colors you can see.",
        length: "30-60 seconds",
        steps: [
          "Draw a garden or look around your home or a park.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Point to each thing as you say it.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say 'There is' for one thing and 'There are' for many things, and keep talking without long stops.",
        words: ["flower", "butterflies", "birds", "frogs", "spider", "red", "yellow", "green"],
        grammar: ["There is a + color + thing", "There are + number + color + things-s"],
        rubric: [
          { label: "There is / There are", description: "Uses 'There is' for one and 'There are' for more than one.", weight: 3 },
          { label: "Colors and -s", description: "Says a color before the thing and the -s on more than one: yellow butterflies.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Numbers", description: "Says how many: two, three, four.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There is a ___ ___.", "There are two ___ ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["In my garden there is a ___ ___.", "There are two ___ ___.", "I like my garden!"], tips: ["Say one thing and two groups of things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Is there a ___ ___? Yes, there is.", "There is a ___ ___ and there are ___ ___s."], tips: ["Ask the watcher a question and join two ideas with 'and'."] },
        ],
      },
    },
  },
};
