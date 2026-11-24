import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 4 "Let's Make
// Colors!" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4 (ages 7-10).
// Every lesson gets one fluency routine (the unit's sentences said again and again as
// whole phrases, a little faster each round, with Unit 3's phrases mixed back in) and
// one short writing routine (say it, write it, read it back). Every other lesson ends
// with a recorded talk for home, built on the routine the class just did. Time comes
// from games and repeats, never from the book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixBe =
  "Listen for the missing 'is': children often say 'The seaweed green' or 'It orange'. Do not say it for them: start the phrase and pause ('The seaweed ... ?'), or hold up one finger for the missing word, and let the child add 'is'. Also listen for 'a' before the color ('a purple jellyfish'). For the sounds in 'jellyfish', 'starfish' and 'seaweed', say the word right and let the child echo it once. Between rounds, write two mistakes on the board for the class to fix in one minute.";

const fixMix =
  "Listen for a missing 'and' ('Mix blue yellow'), a missing 'make' ('Red and yellow orange') and a missing 'a' or an extra one ('I want a blue paint'). For grammar, prompt: point to the frame 'Mix ___ and ___.' or '___ and ___ make ___.' and pause at the gap, or raise your eyebrows at the error and let the child try again. For the sound of 'orange' and 'purple', give a quick recast: say the word, the child echoes. Between rounds 1 and 2, fix two mistakes on the board in one minute.";

const fixPlace =
  "Listen for 'The ball under the table' (no 'is'), 'in' and 'on' mixed up (Vietnamese uses one word for both), and 'next the bag' (no 'to'). Prompt, do not tell: act the place with a ball and ask 'In? On?' with a rising voice, or point to the frame 'The ___ is ___ the ___.' and pause at the gap. Say 'on' and 'in' very clearly yourself. In the one-minute fix, put two errors on the board and let the class act and correct them.";

const fixClothes =
  "Listen for the missing 'is' in 'My hat red', for the missing -s in 'sneakers', 'shorts' and 'pants', and for a missing 'a' ('I have hat'). Prompt the child to fix it: hold up a finger for the missing word, or start 'I have a ... ?' and pause. Show the final -s by holding up two fingers for 'sneakers'. For the T-shirt and jacket sounds, a quick recast is fine. Fix two mistakes on the board between rounds, in one minute.";

const fixDrill =
  "Prompt, do not tell. For a missing 'is' or 'are', hold up one finger and pause at the gap. For a question that is not a question ('You see a jellyfish?'), start the question word yourself and let the child finish. For a missing 'don't' or 'isn't', point to the X sign. For a missing -s on he or she, tap your wrist. Say every final -s and every n't clearly yourself, and let a child echo a sound. In the one-minute fix after round 1, put two mistakes you heard on the board (no names) and let the class fix them.";

export const odL1U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u04-l1": {
      objectives: ["I can say 'I see a purple jellyfish and an orange starfish.' fast, without stopping."],
      drop: ["Ocean Simon Says", "Calm ocean breathing"],
      trim: { "What's missing?": 5, "Color splash chant": 4 },
      add: [
        {
          after: "Ocean picture talk",
          slide: {
            kind: "fluency",
            title: "Ocean sprint: I see, there's, it's",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole ocean sentence, with joining words, fast and smooth, with no stops.",
            chunks: [
              "I see a purple jellyfish and an orange starfish.",
              "There's a pink seashell on the sand, but it's small.",
              "The seaweed is green and it's very long.",
              "Do you see the big crab? Yes, I do!",
              "It's a big ocean because it has many animals.",
            ],
            recycle: ["There's a black spider.", "My favorite color is blue."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an ocean card, the class says one whole sentence." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence and asks 'Do you see it?' Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say, with 'and', 'but' or 'because'?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'I see a purple jellyfish and an orange starfish.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: purple jellyfish + orange starfish)", "(card: pink seashell, small)", "(card: green seaweed, long)", "(card: big crab)", "(card: big blue ocean)"],
            feedback: fixBe,
            teacherNote: "Whole sentences only, never single words: the aim is to say 'The seaweed is green and it's very long' as one smooth piece. For children in grades 2-4 the sentences are long on purpose: each one has two ideas joined by 'and', 'but' or 'because'. Mix in Unit 3 cards ('There's a black spider.') every few turns so the old phrases stay fast too. Listen for the missing 'is' and for 'a' before the color word.",
            tiers: [
              { level: "Support", task: "Say one sentence at a time with the frames on the board.", frames: ["I see a ___ ___.", "It's ___."] },
              { level: "Core", task: "Join two ideas in one sentence, without looking at the board.", frames: ["I see a ___ ___ and a ___ ___.", "There's a ___, but it's ___."] },
              { level: "Stretch", task: "Give a reason and ask a question: 'I like the big ocean because it has many animals. Do you like it?'", frames: ["I like the ___ because ___. Do you like it?"] },
            ],
          },
        },
        {
          after: "Listen, point, say (SB 36 A)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the ocean sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about real things.",
            chunks: [
              "I see a purple jellyfish.",
              "Do you see a purple jellyfish?",
              "Yes, I do. / No, I don't.",
              "I don't see a purple jellyfish, but I see an orange starfish.",
              "There's a pink seashell on the sand, and it's small.",
              "There isn't a crab, but there's a big starfish.",
            ],
            recycle: ["There's a black spider.", "It isn't red. It's blue."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join another idea with 'and' or 'but'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about the classroom and the pictures in your book. Answer with a short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't or isn't, + = add 'and ...' or 'but ...'.",
              "Say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'You see a jellyfish?' or 'I no see'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really sees. Remember one answer to tell the class.",
            ],
            prompts: ["I see a jellyfish. (?)", "I see a starfish. (X)", "There's a crab. (X +)", "We see a big shell. (?)", "There's a green leaf. (+ a pink flower)"],
            feedback: fixDrill,
            teacherNote: "A drill only helps when the last step is real: in round 3 children ask about things they can really see in the room, so the form is used for meaning. Children in grades 2-4 can take the full set in the first lesson: statement, question, short answers, negative, and a joined sentence. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you see a ___?", "No, I don't see a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas with 'but'." },
              { level: "Stretch", task: "Use he and she with -s: 'She sees a crab. Does she see a shell? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Finish the sentences (SB 36 C)",
          slide: {
            kind: "writing",
            title: "Grow my ocean sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the color word and join the second idea.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see a jellyfish. (add: purple; join with and: an orange starfish)", answer: "I see a purple jellyfish and an orange starfish." },
              { q: "There's a seashell. (add: pink; add: on the sand)", answer: "There's a pink seashell on the sand." },
              { q: "It's a starfish. (add: big; join with and: it's orange)", answer: "It's a big starfish, and it's orange." },
              { q: "There's a crab. There isn't a fish. (add: red; join with but)", answer: "There's a red crab, but there isn't a fish." },
              { q: "I like the ocean. It has many animals. (join with because)", answer: "I like the ocean because it has many animals." },
            ],
            frames: ["I see a ___ ___ and a ___ ___.", "There's a ___ ___, but there isn't a ___.", "I like the ocean because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "The color word is before the thing", "I used 'and', 'but' or 'because' to join two ideas"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence is a good step for children in grades 2-4: the sentence is already right and they add a word or a second idea. Say aloud that the color comes BEFORE the thing: Vietnamese puts it after. Items 3 to 5 have two clauses and a joining word, so the Core children meet 'and', 'but' and 'because' in their own writing.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames and color the pictures." },
              { level: "Core", task: "Write items 1 to 4." },
              { level: "Stretch", task: "Write all five, then make a new sentence of your own with 'because'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u04-l2": {
      objectives: ["I can say how to make a new color, three times, faster each time, and write about it."],
      drop: ["Ocean freeze and point", "Color whisper"],
      trim: { "Be the color wheel": 11 },
      add: [
        {
          after: "Paint shop role play",
          slide: {
            kind: "fluency",
            title: "Paint shop 60-50-40: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same paint shop talk three times, with a new partner each round. Each talk is shorter and smoother.",
            chunks: [
              "Hello! I want blue paint, please.",
              "OK! Mix blue and yellow, and look! It's green!",
              "Red and yellow make orange, but blue and red make purple.",
              "Do you like purple? Yes, I do, because it's pretty.",
            ],
            recycle: ["Do you like green?", "My favorite color is red."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A is the shopper and says the paint shop talk, then Partner B. The listener points to the colors and asks one question at the end. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A says the same talk in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: Partner A, then Partner B: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A talks first, then Partner B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner, and a new round.",
              "Say the same talk in all three rounds, shorter each time: 60 seconds, 50 seconds, then 40 seconds.",
            ],
            feedback: fixMix,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity for children in grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The talk has two joined ideas and a follow-up question, so the speaker practices 'and', 'but' and 'because' at speed. The one-minute fix in the middle is what builds accuracy.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I want ___ paint.", "Mix ___ and ___.", "It's ___!"] },
              { level: "Core", task: "Say all four sentences without the board, joining two with 'and' or 'but'." },
              { level: "Stretch", task: "Add a reason and a question: 'I like purple because it's pretty. Do you like purple?'", frames: ["I like ___ because ___. Do you like ___?"] },
            ],
          },
        },
        {
          after: "Listen and draw",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the color sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about real colors.",
            chunks: [
              "Red and yellow make orange.",
              "What do red and yellow make? They make orange.",
              "Do blue and yellow make green? Yes, they do.",
              "Red and blue don't make green, but they make purple.",
              "Mix blue and yellow, and it's green!",
              "I like green because it's the color of the seaweed.",
            ],
            recycle: ["There's a black spider.", "I see a purple jellyfish."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and' or 'because'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the colors too." },
              { seconds: 75, say: "Real talk: ask your partner about their favorite colors and the colors in their pencil case. Answer with a short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = say it with don't, + = add 'and ...' or 'because ...'.",
              "Say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Red yellow make orange' or 'Do blue and yellow makes green?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really likes and has. Remember one answer to tell the class.",
            ],
            prompts: ["Red and yellow make orange. (?)", "Blue and yellow make green. (X)", "Red and blue make purple. (+ because)", "Mix red and yellow. (+ and look!)", "I like blue. (? + because)"],
            feedback: fixDrill,
            teacherNote: "The grammar of this lesson is 'A and B make C', with the question 'What do A and B make?' and the negative 'don't make'. Children often say 'Red yellow make orange' (no 'and') or 'makes' for a plural subject; prompt with your hands: two fingers for the two colors. Round 3 is real talk about the children's own likes. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with the frames on the board.", frames: ["Do ___ and ___ make ___?", "___ and ___ make ___."] },
              { level: "Core", task: "Change every sentence, and join two ideas with 'and' or 'because'." },
              { level: "Stretch", task: "Use he and she with -s: 'She mixes red and yellow. Does she mix blue? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "My new color: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the two colors you mix and to the new color.",
              "Plan: write or draw key words in the four boxes: my paints, I mix, the new color, why I like it. Say one sentence for each box to your partner.",
              "Write: four or five sentences. Use the frames and a joining word: and, because, then.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters and joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My new paint",
              text: "I have blue paint and yellow paint. First, I mix the blue paint and the yellow paint. Then I look at the new paint. It's green, and it's the color of the seaweed! I like green because it's fresh.",
            },
            organiser: [
              { label: "My paints", prompt: "Write or draw two key words: the two paints you have." },
              { label: "I mix", prompt: "Key words: first, then, mix. What do you do?" },
              { label: "New color", prompt: "Key words: the new color and one thing with that color." },
              { label: "Why I like it", prompt: "Key words: I like ... because ... Why do you like it?" },
            ],
            frames: ["I have ___ paint and ___ paint.", "First, I mix the ___ paint and the ___ paint. Then I look at it.", "It's ___, and it's the color of ___!", "I like ___ because ___."],
            checklist: ["Four or five sentences: my paints, I mix, the new color, why I like it", "A capital letter at the start and a full stop or ! at the end", "I used 'and', 'then' or 'because' to join ideas", "I wrote 'is' or the short form 'It's' before the color"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, and show your key words.",
            teacherNote: "A first full paragraph for children in grades 2-4: four or five sentences, planned with key words (a quick drawing is fine too), with joining words 'and', 'then' and 'because' in the frames. Children may copy the frames and fill in the colors. Mark only two things (capital letters and the joining words) and let the child find the mistake from your dot. This paragraph is also the script for the recorded paint shop talk at home.",
            tiers: [
              { level: "Support", task: "Copy the first, second and third frames and fill in the colors.", frames: ["I have ___ paint and ___ paint.", "First, I mix the ___ paint and the ___ paint.", "It's ___!"] },
              { level: "Core", task: "Write four sentences, one for each box, with at least one joining word." },
              { level: "Stretch", task: "Write five or six sentences and add a second mix: 'Then I mix red and blue. It's purple, but I like green more.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My paint shop talk",
        prompt: "Be the paint shop helper. Show two colors, say 'Mix ___ and ___.', show the new color and say why you like it. Use paint, crayons or colored paper.",
        length: "60-90 seconds",
        steps: [
          "Choose two or three colors at home: crayons, paper or paint.",
          "Say your paint shop talk three times to a grown-up or a toy. Each time a little faster. Join your ideas with 'and', 'but' or 'because'.",
          "Record it once. Show the colors to the camera. End with a question for the viewer: 'Do you like ___?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say which colors you mix and what new color you make, join your ideas with 'and', 'but' or 'because', and keep talking without long stops.",
        words: ["mix", "paint", "primary colors", "secondary colors", "orange", "green", "purple"],
        grammar: ["Mix ___ and ___.", "___ and ___ make ___.", "I like ___ because ___."],
        rubric: [
          { label: "Two colors", description: "Says which two colors to mix and which new color they make.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Joining ideas", description: "Joins ideas with 'and', 'but' or 'because' at least twice, or asks the viewer a question.", weight: 2 },
          { label: "Mix sentences", description: "Uses 'Mix ___ and ___.' and '___ and ___ make ___.' correctly.", weight: 2 },
          { label: "Clear sounds", description: "Says 'orange', 'green' and 'purple' clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Mix ___ and ___.", "It's ___!"], tips: ["Hold up each color as you say it.", "Do two mixes."] },
          { level: "Core", who: "Most children", frames: ["Hello! I want ___ paint.", "Mix ___ and ___, and look! It's ___.", "I like ___ because ___."], tips: ["Do two mixes and give one reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ and ___ make ___, but ___ and ___ make ___.", "My favorite color is ___ because ___. Do you like ___?"], tips: ["Do three mixes, say your favorite and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u04-l3": {
      objectives: ["I can say, ask and answer 'The ball is in / on / under / next to the bag.' fast and right."],
      drop: ["Quiet Where? game"],
      trim: { "Ball Where? (movement game)": 7, "Hide the bear": 8 },
      add: [
        {
          after: "Choose a picture (SB 41 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the where sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about real things in the room.",
            chunks: [
              "The red ball is on the desk.",
              "Where is the red ball? It's on the desk.",
              "Is the ball under the chair? Yes, it is. / No, it isn't.",
              "The ball isn't in the bag, but it's next to the bag.",
              "The shells are on the sand, and the crab is under the seaweed.",
              "Where are the shells? They're on the sand.",
            ],
            recycle: ["Mix red and yellow. It's orange!", "I see a purple jellyfish."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add another thing with 'and' or 'but'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing and the place too." },
              { seconds: 90, say: "Real talk: ask your partner where their things are: bag, pencil case, book, shoes. Answer with a full sentence and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Where or Is, X = say it with isn't, + = add 'and ...' or 'but ...'.",
              "Say the WHOLE new sentence, with 'is' for one thing and 'are' for more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The ball under the table' or 'Where the ball is?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about things you can really see. Remember one answer to tell the class.",
            ],
            prompts: ["The pencil is in the bag. (?)", "The book is on the desk. (X)", "The cat is under the chair. (X +)", "The bags are next to the door. (?)", "The ball is in the box. (+ the bear is next to it)"],
            feedback: fixDrill,
            teacherNote: "A drill only helps when the last step is real: in round 3 children ask where their own things are, so the form is used for meaning. Children in grades 2-4 can take the full set: statement, Where question, short answers, negative with 'but', and the plural 'are'. Vietnamese needs no 'is' here and uses one word for in and on, so act the place with a toy when a child mixes them up. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'is' and the frames on the board.", frames: ["Where is the ___? It's ___ the ___.", "It isn't ___ the ___."] },
              { level: "Core", task: "Change every sentence, and join two ideas with 'and' or 'but'." },
              { level: "Stretch", task: "Use more than one thing ('are', 'They're') and add a reason: 'The shells are on the sand because the sea is low.'" },
            ],
          },
        },
        {
          after: "Look around the classroom (SB 41 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Where is it?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, add a second idea, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Where is the ball? It's in the bag, and the bag is under the chair.",
              "The red ball is on the desk, but the blue pencil is under the chair.",
              "Where is the cat? It isn't in the bag. It's next to the tree.",
              "The seashells are on the sand because the sea is low.",
              "Is it red? No, it isn't. It's blue.",
            ],
            recycle: ["There's a yellow bag.", "Do you like green? Yes, I do."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone has a small toy and hides it in, on, under or next to something." },
              { seconds: 75, say: "Swap toys. Go faster, and add a second sentence with 'and' or 'but'!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Put your toy somewhere, but do not tell.",
              "Ask the friend on your left: 'Where is the ___?'",
              "They look and answer: 'It's in / on / under / next to the ___.' Then they add one more sentence, turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Where is the ___?", "It's ___ the ___, and / but ___."],
            feedback: fixPlace,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, and the toys make the meaning of in, on, under and next to physical. The second sentence ('and the bag is under the chair') is what makes it harder for children in grades 2-4. Time the whole circle and tell the class; children love beating their own time. Watch for 'It's in the desk' (should be on) and prompt with the toy rather than the rule.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and act it with your toy.", frames: ["It's ___ the ___."] },
              { level: "Core", task: "Answer with the color and the place, then add a second sentence with 'and' or 'but'.", frames: ["The ___ ___ is ___ the ___, and ___."] },
              { level: "Stretch", task: "Answer with 'isn't' and then the real place, and ask a new question: 'It isn't in the bag, but it's next to the bag. Where is yours?'" },
            ],
          },
        },
        {
          after: "Hide the bear",
          slide: {
            kind: "writing",
            title: "Fix the where sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing 'is' or 'are', the wrong place word, a missing 'to', or a question in the wrong order.",
              "Write the sentence the right way. Act it with a toy to check.",
            ],
            items: [
              { q: "The ball under the table and the cat on the chair.", answer: "The ball is under the table, and the cat is on the chair." },
              { q: "The book is in the desk and the pencil is next the bag.", answer: "The book is on the desk, and the pencil is next to the bag." },
              { q: "The shells is on the sand, but the crab are under the seaweed.", answer: "The shells are on the sand, but the crab is under the seaweed." },
              { q: "Where the ball is? It is in the bag.", answer: "Where is the ball? It is in the bag." },
              { q: "The fish in the ocean because it likes water.", answer: "The fish is in the ocean because it likes water." },
            ],
            checklist: ["Is there an 'is' (or 'are') in every part?", "Is the place word right: in, on, under, next to?", "Is the joining word right: and, but, because?", "A capital letter and a full stop"],
            sayIt: "Read your fixed sentences aloud, then say them without looking.",
            teacherNote: "These are the slips Vietnamese-speaking children often make: no 'is' (Vietnamese needs no be here), one word for in and on, 'next to' said as one word, and a question in statement order. Each item has two clauses or a joining word, so children also read 'and', 'but' and 'because' closely. Fix the first together and act it with a toy. Item 3 checks 'is' and 'are'; praise it if a child sees both.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 4 with the frames on the board.", frames: ["The ___ is ___ the ___."] },
              { level: "Core", task: "Fix sentences 1 to 4." },
              { level: "Stretch", task: "Fix all five, then write a new where sentence with a mistake and a joining word for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u04-l4": {
      objectives: ["I can talk about my favorite clothes and colors three times, faster each time, and join my ideas."],
      drop: ["Pass the bag", "Clothes freeze dance"],
      trim: { "Get dressed chant": 4 },
      add: [
        {
          after: "Listen for details (SB 42 C and D)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the clothes sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about your real clothes.",
            chunks: [
              "I have a red hat and white sneakers.",
              "Do you have a red hat? Yes, I do. / No, I don't.",
              "I don't have a jacket, but I have a T-shirt.",
              "My favorite hat is blue because it's big.",
              "What's your favorite hat? My favorite hat is blue.",
              "My pants are black and my sneakers are white.",
            ],
            recycle: ["Red and yellow make orange.", "The red ball is on the desk."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about the clothes they are wearing and the clothes they have at home. Answer with a short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence, with -s on sneakers, shorts and pants.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'My hat red', 'I have hat' or 'Do you has'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really wears. Remember one answer to tell the class.",
            ],
            prompts: ["I have a blue hat. (?)", "I have white sneakers. (X)", "I like my jacket. (+ because)", "We have red T-shirts. (X +)", "My shorts are green. (? what color)"],
            feedback: fixDrill,
            teacherNote: "This is a Communicate lesson with no new grammar slide, so the drill uses the unit's key structures: 'I have ...', 'My ... is ...', 'What's your favorite ...?' and 'Do you have ...?' with the negative and 'but'. Round 3 is real talk about the clothes the children are wearing. Say the -s of sneakers, shorts and pants clearly yourself. Grades 2-4 can take the whole set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you have a ___?", "No, I don't have a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas with 'and' or 'but'." },
              { level: "Stretch", task: "Use he and she with -s and add 'because': 'She has a red hat. Does she have a jacket? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "My favorite clothes talk",
          slide: {
            kind: "fluency",
            title: "Clothes talk again: new partner each time",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same clothes talk in three rounds, with a new partner each time. It gets smoother every time!",
            chunks: [
              "My favorite hat is blue, and I like it because it's big.",
              "I like my red jacket, but I don't have a red hat.",
              "I have white sneakers and black pants.",
              "My pants are black and my sneakers are white.",
              "What's your favorite T-shirt? Why do you like it?",
            ],
            recycle: ["Mix red and yellow. It's orange!", "The red ball is on the desk."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the clothes talk, then Partner B. The listener points to the clothes and asks one question. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A tells the same talk, a little faster, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: Partner A, then Partner B: the same talk again, smooth and clear!" },
            ],
            steps: [
              "Look at your own clothes. Pick three things and say their color.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when you hear the bell.",
              "The listener has a job: say one thing you heard, and ask one question.",
            ],
            feedback: fixClothes,
            teacherNote: "Task repetition: the same task with a new listener each time builds speed because the meaning is already known. For children in grades 2-4 the talk joins ideas with 'and', 'but' and 'because' and ends with a question. Bring one Unit 3 and one Unit 4 phrase back in the middle so the spacing works. Say 'sneakers' and 'pants' with a clear final -s yourself.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and point to your clothes.", frames: ["My favorite ___ is ___.", "I have a ___ ___."] },
              { level: "Core", task: "Say four sentences without the board and join two with 'and' or 'but'.", frames: ["I like my ___ because ___.", "I have a ___ ___ and ___ ___."] },
              { level: "Stretch", task: "Give a reason, ask a question and answer it: 'What's your favorite hat? Why?' 'My favorite hat is green because it's new.'" },
            ],
          },
        },
        {
          after: "Capital letters and periods (SB 43 F)",
          slide: {
            kind: "writing",
            title: "Join my clothes with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in the brackets. Say it first, then write it.",
              "Read your sentence to your partner. Check the capital letter and the full stop.",
            ],
            items: [
              { q: "I have a red hat. I have a blue jacket. (and)", answer: "I have a red hat and a blue jacket." },
              { q: "I like my jacket. It is warm. (because)", answer: "I like my jacket because it is warm." },
              { q: "My hat is red. My sneakers are white. (but)", answer: "My hat is red, but my sneakers are white." },
              { q: "I put on my shorts. I put on my sneakers. (and then)", answer: "I put on my shorts, and then I put on my sneakers." },
              { q: "My pants are black. My sneakers are black. (and)", answer: "My pants and my sneakers are black." },
            ],
            checklist: ["Only one 'I have' or 'I like' in my sentence", "The joining word is right: and, but, because, then", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I have'. Items 2 to 4 use 'because', 'but' and 'then', which children in grades 2-4 need in their paragraphs. Item 5 changes the sentence shape and is only for Stretch children; do not teach the rule for the others.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then items 2 and 3." },
              { level: "Core", task: "Do items 1 to 4." },
              { level: "Stretch", task: "Do all five, then join three things: 'I have a hat, a jacket and shorts.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My clothes and colors show",
        prompt: "Show your favorite clothes to the camera. Say what they are and what color they are. Join your ideas with 'and', 'but' or 'because', and say why you like them.",
        length: "60-90 seconds",
        steps: [
          "Put your favorite clothes on the bed or wear them.",
          "Say your clothes talk three times: each time a little faster, like in class. Use 'and', 'but' or 'because'.",
          "Record it once. Hold up each thing as you say it, and end with a question: 'What's your favorite ___?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what your favorite clothes are and their colors, join your ideas with 'and', 'but' or 'because', ask the viewer a question, and keep talking without long stops.",
        words: ["jacket", "shorts", "sneakers", "T-shirt", "hat", "pants"],
        grammar: ["My favorite ___ is ___.", "I have a ___ ___ and ___ ___.", "I like my ___ because ___."],
        rubric: [
          { label: "Clothes and colors", description: "Names three or more clothes and says their colors.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Joining ideas", description: "Joins ideas with 'and', 'but' or 'because' at least twice, or asks the viewer a question.", weight: 2 },
          { label: "Is and are", description: "Says 'is' or 'are' ('My hat is red', 'My pants are black') and the -s in sneakers and shorts.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite ___ is ___.", "I have a ___ ___."], tips: ["Hold up each clothes item.", "Join two things with 'and'."] },
          { level: "Core", who: "Most children", frames: ["I have a ___ ___ and ___ ___.", "I like my ___ because ___."], tips: ["Say the color of every thing and give one reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like my ___ ___, but I don't have ___.", "What's your favorite ___? Why?"], tips: ["Use 'but' and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u04-l5": {
      objectives: ["I can tell how to make a new color, then say it faster, and write four or five sentences about my chart."],
      drop: ["Color mix chant and freeze", "Color rainbow breathing"],
      trim: { "Be the paint pots: act it out": 8 },
      add: [
        {
          after: "Read and tell the story in groups (SB 44 A)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the color-mix sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about real colors.",
            chunks: [
              "Red and yellow make orange.",
              "What do red and yellow make? They make orange.",
              "Do blue and red make green? No, they don't. They make purple.",
              "I take red and yellow, and I mix them.",
              "The paint is in the pot, but the brush is on the table.",
              "First I mix the paint. Then I look. It's orange!",
            ],
            recycle: ["The red ball is on the desk.", "I have a blue jacket."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'then'). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the colors and the person too." },
              { seconds: 75, say: "Real talk: ask your partner about their favorite colors, what they paint at home and where their paints are. Answer with a short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = say it with don't or isn't, + = add 'and ...', 'but ...' or 'then ...'.",
              "Say the WHOLE new sentence.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Red yellow make orange' or 'The paint in the pot'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really likes and has. Remember one answer to tell the class.",
            ],
            prompts: ["Red and yellow make orange. (?)", "Blue and yellow make green. (X)", "I mix the paint. (+ then)", "The brush is on the table. (? where)", "I take red and blue. (X +)"],
            feedback: fixDrill,
            teacherNote: "Wrap Up has no new grammar, so the drill pulls the unit's language together: 'A and B make C', the story's 'First ... Then ...' and the where sentences from Unit 4. Round 3 is real talk about the children's own colors. Children in grades 2-4 can handle the whole set. Keep it brisk and say every final -s clearly yourself.",
            tiers: [
              { level: "Support", task: "Use only ? and X with the frames on the board.", frames: ["Do ___ and ___ make ___?", "No, they don't. They make ___."] },
              { level: "Core", task: "Change every sentence, and join two ideas with 'and', 'but' or 'then'." },
              { level: "Stretch", task: "Use he and she with -s and add 'because': 'She mixes red and yellow because she likes orange.'" },
            ],
          },
        },
        {
          after: "Be the paint pots: act it out",
          slide: {
            kind: "fluency",
            title: "Color mix retell: faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell how you made a color in three rounds. Each round is shorter, smoother and faster.",
            chunks: [
              "First, I take red and yellow, and I put them in the pot.",
              "Then I mix them with the brush.",
              "Look! It's orange, and I like it because it's bright.",
              "Red and yellow make orange, but blue and yellow make green.",
            ],
            recycle: ["The red ball is on the desk.", "I have a blue jacket."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells how you made a color, then Partner B. Use the three paint pot cards. Then change partners." },
              { seconds: 40, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: Partner A, then Partner B: tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Pick two paint pot cards. Say: 'First, I take ___ and ___.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end, gives a thumbs up and asks one question: 'Do you like it?'",
            ],
            prompts: ["(card: red + yellow)", "(card: blue + yellow)", "(card: red + blue)"],
            feedback: fixMix,
            teacherNote: "The same telling three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. The sentences are long, with 'and', 'then', 'but' and 'because', which suits grades 2-4. Keep the cards on the board for Support children. Accept shorter tellings in round 1; the shrinking time does the work. Listen for the final sounds in 'make' and 'mix' and for 'orange'.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["I take ___ and ___.", "It's ___!"] },
              { level: "Core", task: "Tell all four sentences without the frames, joining two ideas with 'and' or 'then'." },
              { level: "Stretch", task: "Tell two mixes in one story and give a reason: 'First, I take ... Then, I take ... I like ___ because ...'" },
            ],
          },
        },
        {
          after: "Put your chart on the wall and tell (SB 45 C)",
          slide: {
            kind: "writing",
            title: "My color chart: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the sentences on your own chart as you go.",
              "Plan: look at your chart. Write or draw key words in the four boxes: my chart, two mixes, what I like, a question. Say one sentence for each box to your partner.",
              "Write: four or five sentences. Use the frames and a joining word: and, but, because.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters and joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My chart",
              text: "My chart has five colors. Red and yellow make orange, and blue and yellow make green. Blue and red make purple, but I don't like purple much. I like orange because it's bright. What colors do you like?",
            },
            organiser: [
              { label: "My chart", prompt: "Key words: how many colors are on your chart?" },
              { label: "Two mixes", prompt: "Key words: which colors make which new color?" },
              { label: "I like", prompt: "Key words: your favorite color and why you like it." },
              { label: "A question", prompt: "Key words: what do you ask your reader?" },
            ],
            frames: ["My chart has ___ colors.", "___ and ___ make ___, and ___ and ___ make ___.", "I like ___ because ___.", "What colors do you like?"],
            checklist: ["Four or five sentences: my chart, two mixes, what I like, a question", "A capital letter at the start and a full stop, ! or ? at the end", "I used 'and', 'but' or 'because' to join ideas", "The colors match my chart"],
            sayIt: "Show your chart to a partner. Read your paragraph, then tell it again without looking.",
            teacherNote: "Four or five sentences, planned with key words (a quick drawing is fine too), with 'and', 'but' and 'because' in the frames. The speaking at the wall is the plan, so the words are already in the children's heads. Children may copy the frames and fill in the colors from their own chart. Mark only two things (capital letters and the joining words) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the first, second and third frames and fill in the colors from your chart.", frames: ["My chart has ___ colors.", "___ and ___ make ___.", "I like ___ because ___."] },
              { level: "Core", task: "Write four sentences, one for each box, with at least one joining word." },
              { level: "Stretch", task: "Write five or six sentences with 'and', 'but' and 'because', and add a second question." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u04-l6": {
      objectives: ["I can say, ask and write where things are, fast and right: in, on, under, next to."],
      drop: ["Freeze and find a friend", "Crab race: Where is it?"],
      trim: { "Remember it!": 5 },
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the where sentence fast and right: ask it, answer it, say no, and join two ideas. Then talk about real things in the room.",
            chunks: [
              "The red hat is on the sand.",
              "Where is the red hat? It's on the sand.",
              "Is the hat in the bag? No, it isn't. It's on the sand.",
              "The red hats are on the sand, but the blue hat is in the bag.",
              "Where are the red hats? They're on the sand.",
              "The crab isn't under the leaf, but it's next to the shell.",
            ],
            recycle: ["Red and yellow make orange.", "I have a blue jacket."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and' or 'but'). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing and the place too." },
              { seconds: 75, say: "Real talk: ask your partner where their things are, and where things are in the room. Answer with a full sentence and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Where or Is, X = say it with isn't, + = add 'and ...' or 'but ...'.",
              "Say the WHOLE new sentence, with 'is' for one thing and 'are' for more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The ball in the bag' or 'in' for 'on'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about things you can really see. Remember one answer to tell the class.",
            ],
            prompts: ["The crab is under the leaf. (?)", "The ball is in the box. (X)", "The hat is on the sand. (X +)", "The shells are next to the crab. (?)", "The fish is in the ocean. (+ the star is on the sand)"],
            feedback: fixDrill,
            teacherNote: "Champions week: the drill is the fast version of the grammar slide. A drill only helps when the last step is real, so round 3 asks about things the children can see. Grades 2-4 can take the full set: statement, question, short answers, negative with 'but', and the plural 'are'. Act each place word with a toy when a child mixes up in and on. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'is' and the frames on the board.", frames: ["Where is the ___? It's ___ the ___.", "It isn't ___ the ___."] },
              { level: "Core", task: "Change every sentence, and join two ideas with 'and' or 'but'." },
              { level: "Stretch", task: "Use more than one thing ('are', 'They're') and add 'because': 'The shells are on the sand because the sea is low.'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Where is it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with joining words: this unit's and last unit's.",
            chunks: [
              "The red hat is on the sand, and the starfish is under the seaweed.",
              "Where is the crab? It's next to the shell, but it isn't in the ocean.",
              "The blue fish is in the ocean because it likes water.",
              "Is the shell on the sand? Yes, it is, and the hat is next to it.",
            ],
            recycle: ["Red and yellow make orange.", "I have a blue jacket."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 60, say: "Side A asks, side B answers and adds a second idea. Then swap." },
              { seconds: 45, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Fix the two mistakes you heard most on the board, then go on.",
            ],
            feedback: fixPlace,
            teacherNote: "A quick, high-energy recall of the whole unit: mixing old and new phrases (spaced retrieval) keeps the earlier grammar from fading. The sentences join two ideas, which suits grades 2-4. Say 'on' and 'in' very clearly, and do the action with your hand for each place word.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["The ___ is ___ the ___."] },
              { level: "Core", task: "Say the sentence without the frame, and join two ideas.", frames: ["The ___ is ___ the ___, and / but ___."] },
              { level: "Stretch", task: "Say two sentences and add a reason: 'The hat is on the sand because the boy is swimming. The shell is next to the hat.'" },
            ],
          },
        },
        {
          after: "Draw and write: Where is it?",
          slide: {
            kind: "writing",
            title: "My picture: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each thing and each place word.",
              "Plan: write or draw key words in the four boxes: one thing on something, one thing in something, one thing under or next to something, and a question. Say one sentence for each box to your partner.",
              "Write: start with 'Look at my picture!' Then four sentences. Use the frames and a joining word: and, but, because.",
              "Check: tick the checklist. Your partner points to every 'is' and every joining word.",
              "Teacher: look only at 'is' and capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My picture",
              text: "Look at my picture! The red hat is on the desk, and the blue ball is in the bag. The little cat is under the chair, but the big dog is next to the door. Where is your cat?",
            },
            organiser: [
              { label: "On and in", prompt: "Key words: a thing on something, a thing in something, and their colors." },
              { label: "Under or next to", prompt: "Key words: a thing under something, a thing next to something." },
              { label: "A question", prompt: "Key words: Where is ___? Who can you ask?" },
            ],
            frames: ["Look at my picture!", "The ___ ___ is on the ___, and the ___ ___ is in the ___.", "The ___ ___ is under the ___, but the ___ ___ is next to the ___.", "Where is your ___?"],
            checklist: ["Four or five sentences: look, on and in, under and next to, a question", "I wrote 'is' in every where sentence", "I used 'and' or 'but' to join two where sentences", "A capital letter at the start and a full stop, ! or ? at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking and point to your key words or drawings.",
            teacherNote: "A paragraph about a picture: an opening sentence, two longer where sentences with 'and' and 'but', and a question for the reader. Children in grades 2-4 plan with key words (a quick drawing is fine too) and write with frames. Check each child says 'is' aloud as they write it, because Vietnamese needs no 'is' here. Mark only two things ('is' and capital letters). This paragraph is also the script for the recorded home hunt at home.",
            tiers: [
              { level: "Support", task: "Copy the second and third frames and fill in the words.", frames: ["The ___ ___ is on the ___.", "The ___ ___ is in the ___."] },
              { level: "Core", task: "Write the opening sentence, two joined where sentences and a question." },
              { level: "Stretch", task: "Add a sentence with 'next to' and 'because': 'The pink shell is next to the ball because I put it there.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Where is it? Home hunt",
        prompt: "Show three or four things at home. Say where each one is: in, on, under or next to something. Join two ideas and ask the viewer a question.",
        length: "60-90 seconds",
        steps: [
          "Choose three or four things at home: a toy, a book, a shoe ...",
          "Practise your where sentences three times. Join two ideas with 'and' or 'but'.",
          "Record it once. Point to each thing as you talk, and end with a question: 'Where is your ___?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say where three or four things are with 'is' and a place word, join two ideas with 'and' or 'but', ask a question, and keep talking without long stops.",
        words: ["in", "on", "under", "next to", "hat", "ball", "bag"],
        grammar: ["The ___ is in / on / under / next to the ___.", "Where is the ___?"],
        rubric: [
          { label: "Place words", description: "Uses in, on, under or next to correctly for three things.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Joining ideas", description: "Joins two where sentences with 'and' or 'but', or asks the viewer a question.", weight: 2 },
          { label: "Is in every sentence", description: "Says 'The ___ is ___ the ___.', never 'The ball under the table.'", weight: 2 },
          { label: "Colors", description: "Says the color of each thing.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___ the ___."], tips: ["Point to the thing and the place."] },
          { level: "Core", who: "Most children", frames: ["The ___ ___ is ___ the ___, and ___.", "Where is the ___? It's ___ the ___."], tips: ["Add the color of each thing and join two sentences."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ isn't ___ the ___, but it's ___ the ___.", "Where is your ___?"], tips: ["Use 'isn't' and 'but', then ask the viewer a question."] },
        ],
      },
    },
  },
};
