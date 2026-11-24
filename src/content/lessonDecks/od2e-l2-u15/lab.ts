import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 15 "Forces and
// Movement" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's words and the -er than grammar said
// again and again as whole phrases, with Unit 14's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Lessons 2 and 5 end with a recorded
// talk for home (Lesson 4 already has its own). Time comes from games and repeats, never
// from the book pages or the grammar. All text is original.

const fixVerbs =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('A box is heav...?'), hold up a finger for the missing word, or repeat the error with a rising voice ('The box heavy?'). For a sound, just say it right and let them echo it. Say every final sound clearly yourself (pushes, pulled, heavier): children copy what they hear.";

const fixCompare =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). The usual ones in this unit: 'more fast' for 'faster', a missing 'than' ('faster a snail'), 'heavyer' or 'biger' for 'heavier' and 'bigger', and a missing final -s or -ed. Between rounds 1 and 2, write two of them on the board and let the class fix them in one minute; then the children say the same thing again with the fixed form. Prompt, do not tell: start the phrase and pause ('A truck is heav... than...?'), point to the frame 'A ___ is ___er than a ___', or hold up a finger for the missing 'than'. For a sound, say it right and let them echo it. Say the ends of words clearly yourself: faster, heavier, bigger.";

export const odL2U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u15-l1": {
      objectives: ["I can say sentences about push, pull, heavy and light fast, without stopping."],
      trim: {
        "Make it move! (mess about)": 4,
        "Heavy or light? Push or pull? (is / is not sort)": 5,
        "Force Says": 3,
        "Draw it, say it (push and pull)": 3,
        "Listen, point, say, move (SB 148 A)": 7,
      },
      add: [
        {
          after: "Heavy or light? Push or pull? (is / is not sort)",
          slide: {
            kind: "fluency",
            title: "Force sprint: push, pull, heavy, light",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I push the box.", "I pull the wagon.", "The box is heavy.", "The feather is light.", "It is easy to push a pencil."],
            recycle: ["Yesterday I played the drum.", "Did you sing last night? Yes, I did."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I push the box.' or 'The box is heavy.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together with prompts; then go on to round 2.",
            ],
            prompts: ["(card: box)", "(card: wagon)", "(card: feather)", "(card: pencil)", "(card: heavy bag)"],
            feedback: fixVerbs,
            teacherNote: "Whole sentences only, never single words: the point is to say 'The box is heavy' as one smooth piece. Vietnamese children often leave out 'is' ('The box heavy'), so watch for it and prompt with a finger and 'The box i...?'. Mix in Unit 14's past sentences every few turns so last unit's phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I push the ___.", "The ___ is heavy / light."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'The box is heavy. I can't push it far.'", frames: ["The ___ is ___. It is easy / hard to ___."] },
            ],
          },
        },
        {
          after: "Cause and effect game (SB 149 C)",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My push and pull day: plan, write, check",
            genre: "description",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then, but and At the end.",
              "Plan: in each box, draw one thing you push or pull at school and say a few words.",
              "Write: four sentences, one for each box. Join them with and, but, First, Then and At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My push and pull day",
              text: "I push and pull many things at school. First, I push the door, and it opens. Then I pull my chair, and it comes to me. My bag is heavy, but my pencil is light. At the end, I push my chair in.",
            },
            organiser: [
              { label: "First", prompt: "Draw something you push. What happens?" },
              { label: "Then", prompt: "Draw something you pull. What happens?" },
              { label: "But", prompt: "Draw one heavy thing and one light thing." },
              { label: "At the end", prompt: "What do you push or pull at the end of the day?" },
            ],
            frames: ["First, I push the ___, and it ___.", "Then I pull the ___, and it ___.", "My ___ is heavy, but my ___ is light.", "At the end, I ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "push, pull: say and write the last letters", "is: The bag is heavy."],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A short paragraph of four or five sentences, planned by drawing in four boxes, using the unit's words (push, pull, heavy, light) and the joining words and, but, First, Then, At the end. Mark only two things (capital letters and full stops) and let the child find the mistake from your dot. It replaces the one-sentence 'Grow my force sentence'; the best sentence there ('I push the big box') still works as a Support copy line. The Force sprint in this lesson already drills 'The box is heavy', so watch for a missing 'is'.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one word in each.", frames: ["First, I push the ___, and it ___.", "At the end, I ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Write five sentences and add 'because': 'The bag is heavy, so I use a big force.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u15-l2": {
      objectives: ["I can tell what happened in our force lab, faster each time."],
      trim: {
        "Push and pull mime relay": 3,
        "Word slap": 3,
        "Force lab: small push, big push": 10,
      },
      add: [
        {
          after: "Force lab: small push, big push",
          slide: {
            kind: "fluency",
            title: "Force lab retell: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell what happened in the force lab three times. Each time is shorter, smoother and faster.",
            chunks: ["We pushed the car with a small push.", "It went a little way.", "We pushed it with a big push.", "It went far!", "A big force makes it go faster."],
            recycle: ["I like the drum, but I don't like the trumpet.", "Last night I listened to music."],
            rounds: [
              { seconds: 60, say: "Tell your partner what happened in the lab. Use the picture of the small push and the big push." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your lab picture. Say what you did and what happened.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'We push' for 'We pushed', or 'It go far') and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' and gives a thumbs up at the end.",
            ],
            prompts: ["(picture: small push, car goes a little way)", "(picture: big push, car goes far)"],
            feedback: fixVerbs,
            teacherNote: "This is the same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The retelling is in the past ('pushed', 'went'), so it keeps Unit 14's -ed alive. Final -ed sounds (pushed /t/) are easy to lose: say them clearly. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["We pushed it ___.", "It went ___."] },
              { level: "Core", task: "Tell the whole lab without the frames." },
              { level: "Stretch", task: "Say why: 'It went far because we used a big force.'", frames: ["It went ___ because ___."] },
            ],
          },
        },
        {
          after: "Fast and slow speed line (SB 151)",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "Our force lab: plan, write, check",
            genre: "story retell",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then and because.",
              "Plan: in each box, draw one part of the force lab and write a few words.",
              "Write: four or five sentences. Start with In our force lab, First, Then and The car went far because.",
              "Check: tick the checklist. Your partner finds every -ed word (pushed) and says it aloud.",
              "Teacher: look only at the -ed words and the capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Our force lab",
              text: "In our force lab, we pushed a car two times. First, we pushed it with a small push, and it went a little way. Then we pushed it with a big push, and it went far! The car went far because we used a big force.",
            },
            organiser: [
              { label: "Our lab", prompt: "Draw the car. What did we do?" },
              { label: "First", prompt: "Draw the small push. What happened?" },
              { label: "Then", prompt: "Draw the big push. What happened?" },
              { label: "Why", prompt: "Why did the car go far? Say it with 'because'." },
            ],
            frames: ["In our force lab, we pushed ___.", "First, we pushed it with a small push, and it went ___.", "Then we pushed it with a big push, and it went ___!", "It went far because we used ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "Past -ed: pushed. Say it, then write it.", "because: it went far because we used a big force"],
            sayIt: "Read your paragraph to your partner. Then tell the lab again without looking.",
            teacherNote: "The children write what they did in the force lab and the retell just before, so they already have the sentences in their mouths. It replaces the dictogloss; the key idea (a big force moves a thing more) is now their own writing. It is also a good script for the recorded talk 'My push and pull test' at home: say so, and tell children to read it three times, faster each time. Final -ed (pushed) is easy to lose in writing: say it clearly and have the child point to the -ed. Mark only the -ed words and capital letters.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one word in each.", frames: ["First, we pushed it with a small push, and it went ___.", "Then we pushed it with a big push, and it went ___!"] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Write five sentences and add what you think: 'I think a bigger force makes it go faster.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My push and pull test",
        prompt: "Find something at home you can push and pull, like a toy car or a chair. Show what you did and what happened. Say it in the past: I pushed it. It went far.",
        length: "45-90 seconds",
        steps: [
          "Choose one thing to push and pull (ask a grown-up first).",
          "Do a small push, then a big push. Say what happened.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Look at the camera and show the thing.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Tell what you pushed and pulled and what happened, and keep talking without long stops.",
        words: ["push", "pull", "force", "heavy", "light", "movement", "speed"],
        grammar: ["I pushed / pulled the ___. It went ___.", "A big force makes it ___."],
        rubric: [
          { label: "What happened", description: "Says what they pushed or pulled and what happened, with a small push and a big push.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: push, pull, force, heavy, light.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Past endings", description: "Says the -ed at the end: pushed, pulled. The 'ed' sound can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I pushed the ___.", "It went ___."], tips: ["Do the push again as you speak."] },
          { level: "Core", who: "Most children", frames: ["I pushed the ___ with a small push. It went ___.", "I pushed it with a big push. It went ___."], tips: ["Say both pushes, small and big."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It went far because I used a big force.", "The ___ is heavy, so I used a big force."], tips: ["Say why, and add a pull."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u15-l3": {
      objectives: ["I can say 'A ___ is ___er than a ___.' fast and right."],
      trim: {
        "Bigger, smaller, faster song": 3,
        "Which one is more? (compare with real things)": 6,
        "Is it true for ___ too? (transfer)": 4,
        "Listen and sing along (SB 153 D)": 6,
        "Stand up, crouch down (SB 152 C)": 5,
      },
      add: [
        {
          after: "Compare the groups (SB 153 E)",
          slide: {
            kind: "fluency",
            title: "Compare talk 4-3-2: three listeners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same comparing talk to three listeners. Each talk is shorter and smoother.",
            chunks: ["A truck is heavier than a bike.", "A jet is faster than a train.", "A snail is slower than a bike.", "Is a horse faster than a tortoise? Yes, it is."],
            recycle: ["Yesterday I played football.", "I like the drum, but I don't like the trumpet."],
            rounds: [
              { seconds: 60, say: "Line A tells the comparing talk to the first listener, with picture cards. The listener counts the sentences on their fingers." },
              { seconds: 45, say: "Line B moves one step: a new listener. Line A tells the same talk in less time." },
              { seconds: 30, say: "Line B moves again: a third listener. Fast and smooth! The listener says 'True!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks, line B listens. Line A holds three picture cards (for example: a truck, a bike, a snail).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'more fast' or a missing 'than') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new listener each round.",
              "After three rounds, swap jobs: line B talks and line A listens, with three new cards.",
            ],
            prompts: ["(cards: truck, bike, snail, jet, train, elephant, mouse)"],
            feedback: fixCompare,
            teacherNote: "Same talk, less time, new listener: this is the 4/3/2 activity made small for seven-year-olds. It builds speed and smoothness; it does not by itself fix grammar, which is why the one-minute fix in the middle matters. Do not add new language between rounds. Listen for 'than' in every sentence and for the final -er sound.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frame.", frames: ["A ___ is ___er than a ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a question: 'Is a horse faster than a tortoise?' 'Yes, it is.' and a reason with 'because'.", frames: ["A ___ is ___er than a ___ because ___."] },
            ],
          },
        },
        {
          after: "Look around the room (SB 153 F)",
          slide: {
            kind: "writing",
            title: "Join them with 'than'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with -er and 'than'. Say it first, then write it.",
              "Read your sentence to your partner. Is it true?",
            ],
            items: [
              { q: "A jet is fast. A bus is slow. (start: A jet ...)", answer: "A jet is faster than a bus." },
              { q: "An elephant is big. A mouse is small. (start: An elephant ...)", answer: "An elephant is bigger than a mouse." },
              { q: "A truck is heavy. A bike is light. (start: A truck ...)", answer: "A truck is heavier than a bike." },
              { q: "A feather is light. A pencil is heavy. Use 'because': A feather is easy to move ...", answer: "A feather is easy to move because it is lighter than a pencil." },
            ],
            frames: ["A ___ is ___er than a ___."],
            checklist: ["-er on the word, and 'than' after it", "heavy -> heavier, big -> bigger (look at the spelling)", "A capital letter and a full stop"],
            sayIt: "Say your sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining teaches joining and the comparative through use, not rules. Do the first one together, crossing out the second sentence on the board. The common slips here are 'more fast', 'heavyer', 'biger' and a missing 'than': make them a spelling and 'than' check, not a telling off.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frame on the board." },
              { level: "Core", task: "Do items 1 to 3." },
              { level: "Stretch", task: "Do all four, then write two combined sentences of your own about things in the classroom." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u15-l4": {
      objectives: ["I can ask for help and help a friend, round the circle, without stopping."],
      trim: {
        "Help! chant": 3,
        "Push, pull or both? (real classroom things)": 6,
        "Which is more useful: a push or a pull?": 3,
        "Opposites mirror (SB 155 F)": 7,
        "Listen, point, say, move (SB 154 A)": 6,
      },
      add: [
        {
          after: "Let me help you (SB 155 E)",
          slide: {
            kind: "fluency",
            title: "Help chain: I can't, let me help",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer and pass it on. Keep the help chain going with no stops!",
            chunks: ["Phew! I can't push this. It's too heavy.", "Can you help me?", "Let me help you.", "Thanks. That would be great!", "No problem."],
            recycle: ["A truck is heavier than a bike.", "We pushed it hard. It went far."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card of a heavy thing." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Say: 'Phew! I can't push this. It's too heavy.' Then ask the friend on your left: 'Can you help me?'",
              "They answer: 'Let me help you.' You say: 'Thanks. That would be great!' They say: 'No problem.'",
              "Then it is their turn: they show their card and the chain goes on.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together with prompts; then go on to round 2.",
            ],
            prompts: ["(card: piano)", "(card: big box)", "(card: wagon)", "(card: table)"],
            feedback: fixVerbs,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'I can't ... It's too heavy' and 'Let me help you' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Let me helps you' and 'It heavy': prompt with a finger and 'It's too h...?'. Hold the circle to one new idea only: help.",
            tiers: [
              { level: "Support", task: "Say the four sentences with the frames on the board.", frames: ["Phew! I can't ___ this. It's too ___.", "Let me help you."] },
              { level: "Core", task: "Say the whole chain without looking at the board." },
              { level: "Stretch", task: "Say why the thing is hard: 'It's heavier than my bag.'", frames: ["It's ___er than ___."] },
            ],
          },
        },
        {
          after: "Tell your partner (SB 155 Write box)",
          slide: {
            kind: "writing",
            title: "Fix the helper's notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "A helper wrote notes about pushing and pulling, but there are mistakes!",
              "Read each note with your partner and find the mistake.",
              "Write it the right way. Read it aloud together.",
            ],
            items: [
              { q: "I can't push the box. It heavy.", answer: "I can't push the box. It is heavy." },
              { q: "Let me helps you.", answer: "Let me help you." },
              { q: "I pull the wagon. It come toward me.", answer: "I pull the wagon. It comes toward me." },
              { q: "A wagon is more heavy than a ball.", answer: "A wagon is heavier than a ball." },
            ],
            frames: ["I can't push the ___. It is ___.", "Let me help you."],
            checklist: ["'is' is in the sentence: It is heavy.", "He, she, it + a verb: add -s (it comes)", "After 'let me', no -s: Let me help you.", "heavier, not 'more heavy'"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote: "Four slips only: the missing 'is', an extra -s after 'let me', the missing -s on 'it comes' and 'more heavy'. The missing 'is' and -s are common for Vietnamese children, whose first language has no 'is' before an adjective and no verb endings. Fix the first one together and explain it in one sentence, then let pairs do the rest. Praise a child who finds a mistake you did not plan.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u15-l5": {
      objectives: ["I can compare things and say why they need a bigger force, fast and right."],
      trim: {
        "Remember it!": 5,
        "Grammar mystery: Big Push Day": 6,
        "Big push, small push: the sentence game": 8,
        "Does the rule work here too?": 3,
      },
      add: [
        {
          after: "Mystery order: the information gap",
          slide: {
            kind: "fluency",
            title: "Order game again: new partner, same game",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Play the same order game three times with new partners. Ask and answer faster each time.",
            chunks: ["Is a truck heavier than a bike? Yes, it is.", "Is a bike faster than a snail? Yes, it is.", "No, it isn't. A bike is lighter than a truck.", "A heavier thing needs a bigger force."],
            recycle: ["Let me help you.", "We pushed it hard. It went far."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A plays the order game, then Partner B. Find the order of four things, from lightest to heaviest. Then change partners." },
              { seconds: 55, say: "Round 2: new partner, new four things. Partner A plays, then Partner B. Same game, faster. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A plays, then Partner B. Can you find the order in under a minute?" },
            ],
            steps: [
              "In each round, Partner A plays the game, then Partner B plays it. Each partner has half of the information. Ask 'Is a ___ heavier than a ___?' and answer 'Yes, it is.' or 'No, it isn't.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with prompts; then go on.",
              "When the bell rings, find a new partner and a new set of four cards.",
              "At the end, say the whole order in one sentence: 'A bike is lighter than a car, and a car is lighter than a truck.'",
            ],
            prompts: ["(cards: feather, bike, car, truck)", "(cards: mouse, dog, horse, elephant)", "(cards: snail, bike, car, jet; this set is slowest to fastest)"],
            feedback: fixCompare,
            teacherNote: "Task repetition: the same kind of task with new content gives children the same language again, which is what makes the question 'Is a ___ ___er than a ___?' fast. The goal is a smaller pause before 'Yes, it is.' each round. Listen for 'Yes, it is' (not 'Yes, it has') and 'No, it isn't', and for 'than'.",
            tiers: [
              { level: "Support", task: "Use the frames on the board.", frames: ["Is a ___ ___er than a ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add why: 'A truck is heavier than a bike, so it needs a bigger force.'", frames: ["A ___ is ___er than a ___, so it needs a bigger force."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My two things and a force: plan, write, check",
            genre: "description",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find the -er words and the word so.",
              "Plan: in each box, draw your two things and say a few words.",
              "Write: four or five sentences. Use -er than in one sentence. Use so if you can.",
              "Check: tick the checklist. Your partner points to every -er and every than.",
              "Teacher: look only at -er than and capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: A wagon and a ball",
              text: "I have two things: a wagon and a ball. The wagon is heavier than the ball, so I need a bigger force. The ball is lighter, and it is easy to push. First, I push the ball, and it goes far. Then I pull the wagon, but it comes slowly.",
            },
            organiser: [
              { label: "Two things", prompt: "Draw your two things. What are they?" },
              { label: "Heavier or lighter", prompt: "Which is heavier? Which is lighter?" },
              { label: "The force", prompt: "Which thing needs a bigger force? Say it with 'so'." },
              { label: "What happens", prompt: "Draw a push and a pull. What happens? Use First and Then." },
            ],
            frames: ["I have two things: a ___ and a ___.", "The ___ is ___er than the ___, so I need a bigger force.", "The ___ is lighter, and it is easy to ___.", "First, I push the ___, and it ___.", "Then I pull the ___, but it ___."],
            checklist: ["-er and 'than' in the sentence: heavier than", "heavy -> heavier, big -> bigger (look at the spelling)", "A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Plan-write-check as a short paragraph: the children say the idea in the boxes first (which is heavier?), then write four or five sentences with -er than and the joining words so, and, but, First, Then. It replaces the one-model sentence slide; the model keeps its 'so' link from the unit's idea. Do not require 'so'; Support children write the frames. It is a good script for the recorded talk 'Which is heavier?' at home: say so. Mark only -er than and capital letters.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one word in each.", frames: ["The ___ is heavier than the ___.", "First, I push the ___, and it ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Write five sentences and add 'because': 'A truck needs a bigger force because it is heavier than a bike.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Which is heavier? My comparing talk",
        prompt: "Find three things at home, like a bag, a book and a shoe. Compare them with -er than. Then say which one needs the biggest force to push.",
        length: "45-90 seconds",
        steps: [
          "Choose three things (ask a grown-up first). Pick them up and feel which one is heavier.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Hold up each thing as you compare it.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Compare three things with -er than, say which needs a bigger force, and keep talking without long stops.",
        words: ["heavier", "lighter", "bigger", "smaller", "faster", "slower", "force"],
        grammar: ["A ___ is ___er than a ___.", "A heavier thing needs a bigger force."],
        rubric: [
          { label: "Comparing", description: "Compares at least two pairs with -er and 'than': 'A bag is heavier than a shoe.'", weight: 3 },
          { label: "Force idea", description: "Says which thing needs the bigger force, and why.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Word shapes", description: "Says heavier, bigger and lighter with the right ending, not 'more heavy'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ is heavier than a ___.", "A ___ is lighter than a ___."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["A ___ is ___er than a ___.", "A ___ is heavier than a ___, so it needs a bigger force."], tips: ["Compare two pairs, then say the force sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Is a ___ heavier than a ___? Yes, it is.", "It is easier to ___ a ___ than a ___ because ___."], tips: ["Ask the viewer a question and say why."] },
        ],
      },
    },
  },
};
