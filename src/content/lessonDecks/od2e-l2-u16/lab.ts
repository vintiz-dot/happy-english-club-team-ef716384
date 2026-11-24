import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 16 "Stubborn Goats"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's grammar, the -est words, said again and
// again as whole sentences, a little faster each round, with Unit 15's comparing phrases
// mixed back in) and one short writing routine that ends by saying the sentences aloud.
// Lessons 2, 4 and 6 end with a recorded talk for home, built on the routine the class just
// did (Lesson 5 already has its own vlog). Time comes from games and repeats, never from the
// book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixBe =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children who then say it again use the fixed form. Make the child fix grammar herself: start the phrase and pause ('The goat ... ?'), point to 'is' on the frame, or hold up a finger for the missing word. Example: a child says 'The goat angry.' You say 'The goat ...' and point to the frame; she says 'is angry.' For a sound, just say it right and let her echo it. Say every final -s clearly yourself (horns, goats, wet feet): children copy what they hear.";

const fixEst =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children who then say it again use the fixed form. Make the child fix grammar herself: say the start and pause ('Zog is ... ?'), touch the word 'the' on the board, or hold up a finger for the missing word. Example: a child says 'Zog is strongest goat.' You say 'Zog is ...' and hold up a finger; she says 'the strongest goat.' Repeat the error with a rising voice ('The happyest?') so she hears it herself and says 'happiest.' For a sound, say it right and let her echo it. Say the final -est and the -s of plurals clearly yourself.";

const fixEr =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children who then say it again use the fixed form. Make the child fix grammar herself: start the phrase and pause ('A horse is ... ?'), point to the -er or -est ending card, or hold up a finger for the missing word. Example: a child says 'A horse is more fast.' You say 'A horse is ...' and point to the -er card; she says 'faster.' If 'the' is dropped ('He is cleanest.'), touch 'the' on the board. For a sound, say it right and let her echo it. Say final -s and -st clearly yourself.";

export const odL2U16Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u16-l1": {
      objectives: ["I can say sentences about goats, mountains and feelings fast, without stopping."],
      trim: { "Mystery bag: what do you notice?": 5, "Draw three words, swap and guess": 5 },
      add: [
        {
          after: "Stubborn, or not stubborn? Sort the pictures",
          slide: {
            kind: "fluency",
            title: "Goat sprint: say the whole sentence",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say each whole sentence fast and smooth, with no stops and no missing words.",
            chunks: [
              "The goat is on the mountain.",
              "The goat is stubborn and angry.",
              "The sun comes up in the east.",
              "I take two steps forward.",
              "My shoes are wet!",
            ],
            recycle: ["A jet is faster than a train.", "It is easier to push than to pull."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say before the bell?" },
            ],
            steps: [
              "Look at the picture card. Say the WHOLE sentence, not just one word.",
              "Say 'is' and 'are' every time: 'The goat is angry.' Not 'The goat angry.'",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: goat on a mountain)", "(card: angry goat)", "(card: sunrise, east)", "(card: steps forward)", "(card: wet shoes)"],
            feedback: fixBe,
            teacherNote: "Vietnamese has no 'be' before an adjective, so 'The goat angry' and 'My shoes wet' are the slips to listen for; plural -s ('horns') is the other. Whole sentences only: the aim is one smooth piece. Mix in Unit 15's comparing phrases every few turns so last unit's grammar stays fast (spaced retrieval).",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The goat is ___.", "My ___ are wet."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'The goat is angry because it is wet.'", frames: ["The goat is ___ because ___."] },
            ],
          },
        },
        {
          after: "Mountains, rain and stubborn friends (SB 157 Think)",
          slide: {
            kind: "writing",
            title: "A goat on a mountain: model, then write",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find 'is' and 'are' in every sentence.",
              "Write three sentences about your own goat or your own mountain. Use the frames.",
              "Check with the checklist. Then read your sentences aloud and say them again without looking.",
            ],
            text: {
              title: "The goat on the mountain",
              text: "A goat is on a mountain. The goat is stubborn and it is angry. It does not move. Its horns are big and its feet are wet. The sun comes up in the east.",
            },
            frames: ["A goat is on ___.", "The goat is ___.", "Its ___ are ___."],
            checklist: ["A capital letter and a full stop in every sentence", "'is' and 'are' are there: 'The goat is angry.'", "The -s on horns and feet is there"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "A short model gives children the shape to copy, and the checklist asks only for things they can see: capitals, full stops, 'is / are' and the plural -s. Do not correct anything else today.",
            tiers: [
              { level: "Support", task: "Copy two sentences from the model and change one word." },
              { level: "Core", task: "Write three sentences of your own with the frames." },
              { level: "Stretch", task: "Write four sentences and join two with 'and' or 'because'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u16-l2": {
      objectives: ["I can retell the story of the two stubborn goats in three parts, faster each time."],
      trim: { "Push-of-war: what do you notice?": 6 },
      add: [
        {
          after: "Story mountain poster: first, next, at the end",
          slide: {
            kind: "fluency",
            title: "Two goats: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, two goats come to a narrow bridge.",
              "Then neither goat will move.",
              "Both goats are stubborn, so they push and push.",
              "In the end, both goats are in the river.",
            ],
            recycle: ["When we push the same, nothing moves.", "A big force makes it move faster."],
            rounds: [
              { seconds: 75, say: "Tell your partner the whole story. Use your story mountain poster." },
              { seconds: 55, say: "New partner. Tell it again in less time." },
              { seconds: 40, say: "New partner. Fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Point to the poster: first, then, in the end (start, top, end).",
              "The listener has a job: count the three parts on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner.",
            ],
            prompts: ["(picture: two goats and a bridge)", "(picture: goats pushing)", "(picture: the goats find a way)"],
            feedback: fixBe,
            teacherNote: "The same story three times on purpose: the second and third tellings are faster because the children are no longer searching for ideas. Listen for 'The goat angry', dropped plural -s and 'Then neither goat move'. The finger-counting listener makes the telling a real job, not a drill. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each part of the poster and say one sentence.", frames: ["First, ___.", "Then ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add why: 'The goats push and push because they are stubborn.'", frames: ["___ because ___."] },
            ],
          },
        },
        {
          after: "What are the most important parts? (the Think boxes)",
          slide: {
            kind: "writing",
            title: "Hear it, write it: the narrow bridge",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Remember the rule: capital letter, full stop, and 'is / are' with a feeling word.",
              "Listen to the teacher read the short text. Just listen.",
              "Listen again and write the key words. Work with your partner to write the text again.",
              "Compare it with the text. Read it aloud together.",
            ],
            text: {
              title: "The narrow bridge",
              text: "Two goats meet on a narrow bridge. Both goats are stubborn, so they push and push. Nobody moves. It is better to share the bridge.",
            },
            frames: ["Two goats ___ on a ___.", "Both goats are ___, so ___."],
            checklist: ["Capital letters at the start of every sentence", "'Both goats are ...': the -s and 'are'", "A full stop at the end"],
            sayIt: "Read your text to the class in a story voice, then say it again without looking.",
            teacherNote: "Dictogloss works for children after a short rule reminder: they listen twice, write what they can, then rebuild the whole text together. Read at normal speed, not slowly, and say every final -s. Do not give answers during the rebuilding; point to the checklist instead.",
            tiers: [
              { level: "Support", task: "Write the key words you hear, then build two sentences with your partner." },
              { level: "Core", task: "Rebuild the whole text with your partner." },
              { level: "Stretch", task: "Rebuild it, then write one more sentence: what the goats do next." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My two stubborn goats story",
        prompt: "Tell the story of the two stubborn goats at home in three parts: first, then, in the end. Use a drawing, two toys or two fingers for the goats.",
        length: "45-90 seconds",
        steps: [
          "Look at your story mountain poster or draw three small pictures.",
          "Say the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the story in three parts and keep talking without long stops.",
        words: ["goat", "mountain", "stubborn", "angry", "horns", "forward"],
        grammar: ["First / Then / In the end", "The goat is ___ because ___.", "Both goats are ___."],
        rubric: [
          { label: "Three parts", description: "Tells the first part, the middle and the end of the story.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "is / are and -s", description: "Says 'The goat is angry' and 'Both goats are stubborn' with the be word and the -s.", weight: 2 },
          { label: "Unit words", description: "Uses words from the unit: goat, mountain, stubborn, angry, horns.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Then ___.", "In the end, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, two goats ___ on a ___.", "Then ___ because ___.", "In the end, they ___."], tips: ["Say why the goats push."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think the goats are ___ because ___.", "A good idea is ___."], tips: ["Say what the goats should do, and why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u16-l3": {
      objectives: ["I can ask and answer about the biggest, the funniest and the best, fast and right."],
      trim: { "Which is the longest? Pencil lineup": 6, "Zoo superlatives: pass the ball": 6 },
      add: [
        {
          after: "Ask and answer about the pictures (SB 161 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: which is the -est?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Which animal is the tallest?",
              "The giraffe is the tallest.",
              "Is the red bag the heaviest?",
              "Yes, it is. / No, it isn't. The blue bag is.",
              "This is the funniest story.",
            ],
            recycle: ["A jet is faster than a train.", "Is a horse faster than a tortoise? Yes, it is."],
            rounds: [
              { seconds: 80, say: "Slow chain round the circle. Everyone holds a picture card of three things." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your card: three animals or three things.",
              "Ask the friend on your left: 'Which is the ___est?' They answer: 'The ___ is the ___est.'",
              "They turn and ask the next friend with their own card.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Which ___ is the ___est?", "Is the ___ the ___est?"],
            feedback: fixEst,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'the ___est' automatic. Listen for the missing 'the' ('She is tallest'), 'more tall', and spelling slips said aloud ('happyest', 'bigest'). Time the circle and tell the children: beating their own time is a good game.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["The ___ is the ___est."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add why: 'The giraffe is the tallest because its neck is long.'", frames: ["The ___ is the ___est because ___."] },
            ],
          },
        },
        {
          after: "Talk about your family or your group (SB 161 F)",
          slide: {
            kind: "writing",
            title: "Join them: and, but, because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Check the checklist. Then read your sentences aloud to your partner.",
            ],
            items: [
              { q: "The red bag is heavy. The blue bag is heavier. (but)", answer: "The red bag is heavy, but the blue bag is heavier." },
              { q: "Zog is the strongest goat. He eats a lot of grass. (because)", answer: "Zog is the strongest goat because he eats a lot of grass." },
              { q: "This is the happiest picture. This is the funniest picture. (and)", answer: "This is the happiest and the funniest picture." },
              { q: "The giraffe is the tallest animal. The mouse is the smallest animal. (and)", answer: "The giraffe is the tallest animal, and the mouse is the smallest." },
            ],
            checklist: ["'the' is before every -est word", "happy becomes happiest; big becomes biggest", "The joining word is there: and, but or because"],
            sayIt: "Say your joined sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Do item 1 aloud together first, crossing out the repeated words. The checklist is the grammar the whole lesson practised: 'the' and the spelling change.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write one more sentence of your own with 'because': 'My ___ is the ___est because ___.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u16-l4": {
      objectives: ["I can talk about my favorite sport three times, faster and smoother each time."],
      trim: { "Act it, guess it: sports TPR": 4, "Kick, throw, hit: sports chant": 3, "Push or pull? Sports and forces": 4 },
      add: [
        {
          after: "Tell your partner about speed and movement in a sport (SB 163 Write)",
          slide: {
            kind: "fluency",
            title: "Sport talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same sport talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My favorite sport is soccer.",
              "We run, kick and jump.",
              "A ball is faster than a player.",
              "The fastest part is the kick!",
            ],
            recycle: ["It is easier to push than to pull.", "A big force makes it move faster."],
            rounds: [
              { seconds: 60, say: "Partner 1: each of you gives your sport talk in turn (about 30 seconds each). The listener counts your sentences on their fingers." },
              { seconds: 45, say: "Partner 2: each of you gives the same talk in turn, in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! Each of you talks in turn. The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Give the same talk again, a little faster. Do this three times in all.",
            ],
            feedback: fixEr,
            teacherNote: "Same talk, less time, new listener: a short 4-3-2 style routine for seven-year-olds. Saying it again to a new partner keeps the repeat real, and the one-minute fix between round 1 and round 2 is what makes it accurate as well as fast. Do not add new language between rounds. Listen for 'more fast', 'funnyer' and the dropped 'the' before -est.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite sport is ___.", "The fastest part is ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Compare: 'A ball is faster than a player. The fastest part is the serve.'", frames: ["___ is faster than ___."] },
            ],
          },
        },
        {
          after: "Ball toss: say the comparative and the superlative (SB 163 F)",
          slide: {
            kind: "writing",
            title: "Fix the sports sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing 'is', a missing 'the', or a wrong ending.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "A horse is more fast than a dog.", answer: "A horse is faster than a dog." },
              { q: "She is funnyest girl in the team.", answer: "She is the funniest girl in the team." },
              { q: "The tennis ball lighter than the basketball.", answer: "The tennis ball is lighter than the basketball." },
              { q: "He is cleanest player on the team.", answer: "He is the cleanest player on the team." },
            ],
            checklist: ["faster, not 'more fast'", "happy, funny: the y becomes ier or iest", "'the' before every -est word, and 'is' is there"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "Two or three error types at a time: this lesson it is the -er / -est endings, the missing 'the', and the missing 'is'. Fix item 1 together first and say why: short words just add -er. Vietnamese has no comparative ending, so 'more fast' is a natural slip.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 with the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My sport talk",
        prompt: "Tell us about your favorite sport. Say what you do, what moves fast, and what is the fastest part. Show one move with your body.",
        length: "45-90 seconds",
        steps: [
          "Choose your sport and think of three sentences.",
          "Say your sport talk three times: each time a little faster, like in class.",
          "Record it once. Show one move as you speak.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what your sport is, what you do, and which part is the fastest, without long stops.",
        words: ["basketball", "soccer", "tennis", "baseball", "hockey", "golf"],
        grammar: ["My favorite sport is ___.", "___ is faster than ___.", "The fastest part is ___."],
        rubric: [
          { label: "Sport talk", description: "Says what the sport is and what people do in it.", weight: 2 },
          { label: "Faster and fastest", description: "Uses -er and 'the -est' correctly: faster, the fastest, with 'the'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Sport words", description: "Uses sports words from the unit.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite sport is ___.", "We ___ and ___.", "The fastest part is ___."], tips: ["Hold a picture of your sport."] },
          { level: "Core", who: "Most children", frames: ["My favorite sport is ___ because ___.", "___ is faster than ___.", "The ___est part is ___."], tips: ["Say one -er word and one -est word."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think ___ is the best sport because ___.", "In ___, the strongest player ___."], tips: ["Compare two sports and end with a question for the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u16-l5": {
      objectives: ["I can say what is easy or hard to push or pull, again and again, without stopping."],
      trim: { "Easy or hard to push or pull? Test and sort": 4, "Push it forward chant": 3 },
      add: [
        {
          after: "Tell the class about your poster (SB 165 C)",
          slide: {
            kind: "fluency",
            title: "Poster talk: same task, three partners",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same poster talk three times, with three partners. In each round partner A talks, then partner B. Each time it is smoother.",
            chunks: [
              "The ball is easy to push.",
              "The heaviest box is the hardest to push.",
              "I need a big force to move it.",
              "A small force moves it slowly.",
            ],
            recycle: ["The goats push and push.", "A jet is faster than a train."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about the poster, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells the same talk, a little faster, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells the talk again, smooth and clear, then Partner B." },
            ],
            steps: [
              "Hold your poster so your partner can see it.",
              "Point to each picture as you say its sentence.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "The listener gives a thumbs up when they hear 'the hardest' or 'the easiest'.",
            ],
            feedback: fixEst,
            teacherNote: "A task repeat: the same task with new partners. The language does not change, so the child's attention can move from finding words to saying them smoothly. Listen for 'the heaviest box is hardest' (the missing 'the') and 'easy push'.",
            tiers: [
              { level: "Support", task: "Say one sentence for each picture with the frames.", frames: ["The ___ is easy / hard to push."] },
              { level: "Core", task: "Say three sentences without the frames." },
              { level: "Stretch", task: "Add why: 'The heaviest box is the hardest to push because it needs a big force.'", frames: ["The ___ is the ___est to ___ because ___."] },
            ],
          },
        },
        {
          after: "Plan my forces poster (SB 165 B)",
          slide: {
            kind: "writing",
            title: "Make my poster sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the short sentence with the teacher.",
              "Make it bigger: add the word in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "The ball is easy to push. (add: small)", answer: "The small ball is easy to push." },
              { q: "The box is hard to pull. (add: heaviest)", answer: "The heaviest box is hard to pull." },
              { q: "We push the cart. (add: with a big push)", answer: "We push the cart with a big push." },
            ],
            frames: ["The ___ ___ is easy to push.", "The ___est box is hard to ___."],
            checklist: ["A capital letter and a full stop", "'the' before the -est word", "The new word is in the right place"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence shows children that one more word makes a sentence say more. Do item 1 aloud first and ask where the new word goes. Check only the capital letter, the full stop and 'the' before an -est word.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all three items." },
              { level: "Stretch", task: "Write two big sentences about your own poster." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u16-l6": {
      objectives: ["I can say 'the strongest', 'the fastest' and 'the best' sentences fast and right."],
      trim: { "Race to the winner": 7, "Remember it!": 5 },
      add: [
        {
          after: "The Goat Games scoreboard",
          slide: {
            kind: "fluency",
            title: "Champion sprint: the Goat Games",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with 'the' before the -est word.",
            chunks: [
              "Zog is the strongest goat.",
              "Who has the longest rope?",
              "Zig has the longest rope.",
              "The heaviest box is the hardest to push.",
              "The best game is jumping!",
            ],
            recycle: ["A horse is faster than a tortoise.", "Is the red bag the heaviest? Yes, it is."],
            rounds: [
              { seconds: 50, say: "Together: the teacher flashes a card, the class says the whole sentence." },
              { seconds: 50, say: "Girls ask, boys answer. Then swap." },
              { seconds: 35, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            feedback: fixEst,
            teacherNote: "A high-energy recall of the -est words, mixed with Unit 15's comparing phrases (spaced retrieval keeps old grammar from fading). Listen for the dropped 'the', 'goodest' for 'best', and spelling said aloud ('happyest', 'bigest').",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["___ is the ___est goat."] },
              { level: "Core", task: "Say the sentence without the board." },
              { level: "Stretch", task: "Say it and add why: 'Zog is the strongest because he pushes the heaviest box.'" },
            ],
          },
        },
        {
          after: "Say it, then write: the Goat Games report",
          slide: {
            kind: "writing",
            title: "Champion report: model, then my own",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find every 'the ___est'.",
              "Write three sentences about your own champion. Use the frames.",
              "Check with the checklist. Then read aloud and say it again without looking.",
            ],
            text: {
              title: "The champion goat",
              text: "At the Goat Games, Zoe is the fastest goat and Zog is the strongest. Zig has the longest rope, but Zoe jumps the highest. I think Zoe is the champion because she is the fastest and the happiest.",
            },
            frames: ["___ is the ___est goat.", "___ has the ___est ___, but ___.", "I think ___ is the champion because ___."],
            checklist: ["'the' before every -est word", "happy becomes happiest; big becomes biggest", "'because' joins my reason"],
            sayIt: "Read your report to your partner, then say it again without looking.",
            teacherNote: "The model uses the unit's grammar in joined sentences ('but', 'because'). Read it aloud once and let the children find every 'the ___est'. They write about goats or about children in the class, with their own names left out of the board model.",
            tiers: [
              { level: "Support", task: "Copy two sentences from the model and change the names." },
              { level: "Core", task: "Write three sentences of your own." },
              { level: "Stretch", task: "Write four sentences and use 'but' once and 'because' once." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The -est things in my day",
        prompt: "Tell us about the -est things you know. What is the biggest, the fastest or the best thing in your house, your school or your day? Show one thing to the camera.",
        length: "45-90 seconds",
        steps: [
          "Find three things or pictures: one big, one fast, one best.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Show each thing as you talk.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say three 'the -est' sentences with a reason and keep talking without long stops.",
        words: ["strong", "fast", "heavy", "good", "happy", "big"],
        grammar: ["The ___est ___ is ___.", "The best ___ is ___.", "___ because ___."],
        rubric: [
          { label: "The -est words", description: "Says 'the biggest', 'the fastest', 'the best' correctly, with 'the'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with 'because' for at least one sentence.", weight: 2 },
          { label: "Clear endings", description: "The -est ending and the -s of plurals can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The biggest ___ is ___.", "The fastest ___ is ___."], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["The ___est ___ in my house is ___.", "The best ___ is ___ because ___."], tips: ["Give a reason for one thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ is stronger than ___, but ___ is the strongest.", "I think ___ is the champion because ___."], tips: ["Compare two things, then name the winner."] },
        ],
      },
    },
  },
};
