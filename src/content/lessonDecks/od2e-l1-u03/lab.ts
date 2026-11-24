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
      trim: { "Run and touch": 3, "Simon says: colors": 3, "Rainbow whisper": 3 },
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
            title: "My red things: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the color word in every sentence.",
              "Plan: pick your favorite color. Draw a crayon in box 1, two things you see in box 2 and two things you like in box 3. Say one sentence for each box to your partner.",
              "Write: copy the frames and fill in the blanks. Put the color word BEFORE the thing: a red kite.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my favorite color",
              text: "My favorite color is red. I see a red kite and a red bird. I like the red bag and the red apple!",
            },
            organiser: [
              { label: "My color", prompt: "Draw your favorite color. Say: My favorite color is ___." },
              { label: "I see", prompt: "Draw two things in that color. Say: I see a ___ ___ and a ___ ___." },
              { label: "I like", prompt: "Draw two things you like in that color. Say: I like the ___ ___ and the ___ ___." },
            ],
            frames: ["My favorite color is ___.", "I see a ___ ___ and a ___ ___.", "I like the ___ ___ and the ___ ___!"],
            checklist: ["Three sentences: my color, I see, I like", "The color word comes BEFORE the thing", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then say it again without looking.",
            teacherNote: "A first paragraph for six-year-olds: three short sentences, planned by drawing, so no notes are needed. Children may copy the frames and complete them. This is where 'Grow my color sentence' leads: the same big sentences, now three in a row. In Vietnamese the color comes after the thing, so say 'red kite' with a clap on each word before writing. Mark only capital letters and full stops.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["My favorite color is ___.", "I see a ___ ___."] },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Add a fourth sentence: 'I love red!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u03-l2": {
      objectives: ["I can say my favorite color three times, faster each time."],
      trim: { "Freeze and point": 3, "Draw a tree": 5, "Puppet time: Who's in the tree?": 6 },
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
            title: "All about my color: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find the color before the thing in every sentence.",
              "Plan: draw your color, two things you can see outside and two things you have. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with My favorite color is, I like the, I like my.",
              "Check: tick the checklist. Your partner points to every capital letter.",
              "Teacher: look only at the color word before the thing and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: all about blue",
              text: "My favorite color is blue. I like the blue sky and the blue sea. I like my blue bag and my blue kite!",
            },
            organiser: [
              { label: "My color", prompt: "Draw your favorite color. Say: My favorite color is ___." },
              { label: "Outside", prompt: "Draw two things you can see outside in that color. Say: I like the ___ ___ and the ___ ___." },
              { label: "My things", prompt: "Draw two things you have in that color. Say: I like my ___ ___ and my ___ ___." },
            ],
            frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___.", "I like my ___ ___ and my ___ ___!"],
            checklist: ["Three sentences: my color, outside, my things", "The color word comes BEFORE the thing", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking. This is also your script for the color video at home.",
            teacherNote: "The paragraph can be the script for this lesson's recorded talk 'My color video'. Three sentences, planned by drawing. Children may copy and complete the frames. It follows the poems and the spoken 'My favorite color' talk, so the words are already in their mouths. Mark only two things: the color before the thing and full stops.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["My favorite color is ___.", "I like the ___ ___."] },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Add a fourth sentence: 'I love blue!'" },
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
      trim: { "What's in the bush?": 5 },
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
            title: "My class zoo: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find 'There is' for one and 'There are' for more.",
              "Plan: draw one animal, two animals and three animals in your zoo. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use the frames. Add -s when there is more than one.",
              "Check: tick the checklist. Your partner points to every -s on the animals.",
              "Teacher: look only at is/are and the plural -s. Put a dot next to a line with a mistake; the child finds it and fixes it ('There have' is the classic slip).",
            ],
            text: {
              title: "Model: my zoo",
              text: "In my zoo there is a black spider. There are two green frogs by the door. There are three brown hamsters!",
            },
            organiser: [
              { label: "One", prompt: "Draw one animal. What color is it? Say: There is a ___ ___." },
              { label: "Two", prompt: "Draw two animals. Say: There are two ___ ___s by the door." },
              { label: "Three", prompt: "Draw three animals. Say: There are three ___ ___s." },
            ],
            frames: ["In my zoo there is a ___ ___.", "There are two ___ ___s by the door.", "There are three ___ ___s!"],
            checklist: ["One thing: There is. More than one: There are", "More than one animal: add -s (frogs, hamsters)", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your zoo to your partner. Then tell it again without looking, pointing to your drawings.",
            teacherNote: "This replaces the sentence-fixing slide: children met the same mistakes (There have, There is two, a missing -s) and now use the rule in a paragraph of their own. Three sentences, planned by drawing, with frames: children may copy and complete. Say every final -s clearly yourself. Mark only is/are and the plural -s.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["In my zoo there is a ___ ___.", "There are two ___ ___s by the door."] },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Add a fourth sentence: 'I like my zoo!'" },
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
              { seconds: 45, say: "Round 1: Partner A says the invitation, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 2: new partner. Partner A says the same talk, smoother, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Same talk again: Partner A, then Partner B. Can you say it without looking?" },
            ],
            steps: [
              "Choose a game: ball, kite or cards. In each round Partner A says the invitation, then Partner B says it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and the class fixes them; then go on.",
              "When the bell rings, change partners and do it again: Partner A, then Partner B.",
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
              { seconds: 40, say: "Round 1: Partner A tells about the garden picture with the key-word cards, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your garden picture. Pick three key-word cards: one thing, two things, three things.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s) and the class fixes them; then go on.",
              "When the bell rings, change partners. Partner A tells it, then Partner B.",
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
