import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 1 "Amazing
// Animals" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's sentences about animal groups, and
// they / it / them, said again and again as whole phrases, a little faster each round,
// with Level 1's phrases mixed back in) and one writing routine that ends in a spoken
// step. Two lessons end with a recorded talk for home. Time comes from games and repeats,
// never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and keep the talk going. Note two or three grammar slips (no names): often 'Birds has' or 'They has', 'Gills help they', 'it' for many animals, and a missing final -s. Between rounds 1 and 2, write them on the board and fix them together in one minute: children then say the same thing again with the fixed form. For grammar, prompt the child to fix it instead of saying it for them: start the phrase and pause ('Gills help ...?'), point to the frame, hold up a finger for the missing -s, or repeat the error with a rising voice ('They has?'). Example: a child says 'Wings help they fly'; you say 'Wings help ...?' and point to the word them. For a sound, a quick recast is fine: say it right and the child echoes. Say every final -s clearly yourself (feathers, wings, gills): children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U1Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u01-l1": {
      objectives: ["I can say what animals have, in a whole sentence, fast and smooth."],
      trim: { "The mystery bag": 5, "Slap the word": 5, "Which go together? Why?": 6 },
      add: [
        {
          after: "Clue game: I have ... what am I?",
          slide: {
            kind: "fluency",
            title: "Body cover sprint: what do they have?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about an animal group, fast and smooth, with no stops.",
            chunks: [
              "Fish have scales and gills.",
              "Birds have feathers and wings.",
              "Frogs have wet skin.",
              "Mammals have fur.",
              "Birds lay eggs.",
            ],
            recycle: ["I use my nose to smell.", "You should wash your hands."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an animal picture, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a picture, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture. Say a WHOLE sentence: 'Birds have feathers and wings.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(picture: a fish)", "(picture: a bird)", "(picture: a frog)", "(picture: a cat)", "(picture: a hen with eggs)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: the aim is 'Fish have scales and gills' as one smooth piece. Vietnamese has no plural ending, so children often leave the -s off scales, feathers and wings, or say 'Fish has': say those endings clearly yourself. Mix in two cards from Level 1 Unit 18 ('You should wash your hands.') every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["___ have ___.", "___ have ___ and ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add where they live: 'Fish have scales and gills. They live in water.'", frames: ["___ have ___. They live in ___."] },
            ],
          },
        },
        {
          after: "Same and different (SB 9 C)",
          slide: {
            kind: "writing",
            title: "Grow my animal sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the little words in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "Fish swim. (add: in water)", answer: "Fish swim in water." },
              { q: "Birds have feathers. (add: soft)", answer: "Birds have soft feathers." },
              { q: "Frogs jump. (add: on land)", answer: "Frogs jump on land." },
              { q: "Mammals have fur. (add: warm)", answer: "Mammals have warm fur." },
            ],
            frames: ["___ have ___ ___.", "___ swim / jump in / on ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "Fish, birds, frogs: 'have', not 'has'"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence (where, what kind) is a gentle first step for seven-year-olds: the sentence is already right, so the child adds rather than builds. 'Fish have' is worth a thumbs-up when a child says it, because fish looks singular.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and': 'Fish have scales, and birds have feathers.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u01-l2": {
      objectives: ["I can tell about the four animal groups, faster each time."],
      trim: { "Group chant and freeze": 4, "Same or different? Jump!": 4, "Class chart: four animal groups": 8 },
      add: [
        {
          after: "Class chart: four animal groups",
          slide: {
            kind: "fluency",
            title: "Four groups: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same four-group chart three times. Each time is shorter, smoother and faster.",
            chunks: [
              "Fish live in water and breathe with gills.",
              "Birds have feathers and wings.",
              "Amphibians live in water and on land.",
              "Mammals have fur, and their babies drink milk.",
            ],
            recycle: ["My favorite animal is the ___ because it's ___.", "I think the fox is ___."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells the four groups, then Partner B. Use the class chart to help you. Then change partners." },
              { seconds: 40, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Point to one group on the chart at a time and say a whole sentence for it. In each round Partner A tells it, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, change partners.",
              "The listener counts the groups on their fingers and says 'Four!' at the end.",
            ],
            prompts: ["(chart: fish)", "(chart: birds)", "(chart: amphibians)", "(chart: mammals)"],
            feedback: correct,
            teacherNote: "The same chart is told three times on purpose: by the second and third telling the children are not searching for words, so they speak faster and more smoothly. The minute of fixing between the first and second telling is what makes the retell more accurate, not only quicker. Keep the chart up for Support children. Listen for 'Birds has' and for a missing -s on babies, feathers and wings.",
            tiers: [
              { level: "Support", task: "Point to each group and say one sentence for it.", frames: ["Fish live in ___.", "Birds have ___.", "Mammals have ___."] },
              { level: "Core", task: "Tell all four groups without the frames." },
              { level: "Stretch", task: "Add how a body part helps them: 'Birds have wings. Wings help them fly.'" },
            ],
          },
        },
        {
          after: "Draw it, label it, describe it",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: the wet-skin frog",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Remember: they = many animals, it = one animal.",
              "Listen to the short text. The teacher reads it twice. The first time, only listen. The second time, write the key words.",
              "In your group, build the text again. It does not have to be the same words, but it must be right.",
              "Compare with the real text on the board and fix your own.",
            ],
            text: {
              title: "Frogs",
              text: "Frogs are amphibians. They live in water and on land. Frogs have wet skin, and the skin helps them breathe. Baby frogs swim in the water, but big frogs jump on land.",
            },
            frames: ["Frogs are ___. They live in ___.", "___ have ___, and the ___ helps them ___."],
            checklist: ["They or it is the right one", "The -s on frogs, babies and amphibians", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your group's text aloud together, then say it again without looking.",
            teacherNote: "A dictogloss makes children notice the grammar they need to rebuild the text: here it, they and them. Read at normal speed, with a clear pause between sentences. Do not stop to explain; the comparison with the real text is the learning. Accept different wording if the grammar is right.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and use the frames to build two sentences." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text, then add one more sentence about frogs with 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal group talk",
        prompt: "Choose one animal group: fish, birds, amphibians or mammals. Tell us what they have and where they live. Show a picture or a toy animal if you have one!",
        length: "45-90 seconds",
        steps: [
          "Choose your animal group and look at your class chart or your drawing.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell us what your animal group has and where they live, and keep talking without long stops.",
        words: ["skin", "fur", "feathers", "scales", "wings", "gills", "eggs", "mammals", "amphibians"],
        grammar: ["___ have ___.", "They live in / on ___.", "Wings help them ___."],
        rubric: [
          { label: "Group facts", description: "Says at least two true facts about one animal group: what they have, where they live.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: skin, fur, feathers, scales, wings, gills.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "They and have", description: "Says 'They have ...' and 'Birds have ...' for many animals, with the final -s on the nouns.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ have ___.", "They live in ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ have ___ and ___.", "They live in / on ___.", "Their babies ___."], tips: ["Say three facts."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ have ___. ___ help them ___.", "___ and ___ are the same because both ___."], tips: ["Say how a body part helps them, and compare two groups."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u01-l3": {
      objectives: ["I can ask and answer about animals with 'they' and 'them', fast, round the circle."],
      trim: { "Hot seat: Who am I?": 4, "Pronoun swap game": 5, "Sing along: our animal song (SB 13 D)": 7, "Is it true for a whale? Is it true for a penguin?": 7, "Pass the pattern": 5 },
      add: [
        {
          after: "Pass the pattern",
          slide: {
            kind: "fluency",
            title: "Question chain: what do they have?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What do birds have?",
              "They have feathers and wings.",
              "What helps them fly?",
              "Wings help them fly.",
              "Do gills help fish? Yes, gills help them.",
            ],
            recycle: ["He shouldn't talk to the fox.", "I agree. / I don't agree."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an animal card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your animal card so only you can see it.",
              "Ask the friend on your left: 'What do ___ have?' about the animal on your card.",
              "They answer: 'They have ___.' Then they ask: 'What helps them ___?'",
              "The next friend answers: '___ help them ___.' Then they turn and ask a new question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What do ___ have?", "What helps them ___?", "Do ___ help ___?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'They have ...' and 'Wings help them ...' automatic. Time the whole circle and tell them; children love beating their own time. Listen for 'Wings help they' and for 'It have' when the animal is many. Prompt with a raised finger and 'Wings help ...?'",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["They have ___.", "___ help them ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a second fact: 'They have wings. They live in the sky and in trees.'" },
            ],
          },
        },
        {
          after: "What animals have these things? (SB 13 E)",
          slide: {
            kind: "writing",
            title: "Join them: and, it, they",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Use they, it or them instead of saying the animal again. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "Fish have gills. Gills help fish breathe. (and, them)", answer: "Fish have gills, and gills help them breathe." },
              { q: "A frog has wet skin. The frog is green. (and, it)", answer: "A frog has wet skin, and it is green." },
              { q: "Birds have feathers. Feathers keep birds warm. (and, them)", answer: "Birds have feathers, and feathers keep them warm." },
              { q: "Ducks have wings. Ducks swim too. (and, they)", answer: "Ducks have wings, and they swim too." },
            ],
            checklist: ["I did not say the animal name two times: I used they, it or them", "Many animals: they / them. One animal: it", "A comma before 'and', and a full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words and pronouns through use, not rules. Model item 1 aloud and cross out the second 'fish' on the board. The common slips are 'Gills help they' and 'A frog ... they'; fix those with a finger, not a lecture.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Write two pairs of sentences of your own and join them for your partner." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u01-l4": {
      objectives: ["I can talk about my favorite animal group three times, faster each time."],
      trim: {
        "Body parts: Simon says": 4,
        "Compound words ball game (SB 15 F)": 6,
        "Secret animal: guess it!": 4,
        "Big Question review (SB 15 bottom)": 8,
        "Oh no! Are you OK? (SB 15 E)": 9,
      },
      add: [
        {
          after: "Rehearse: three things about my favorite animal group (SB 15 Write)",
          slide: {
            kind: "fluency",
            title: "Animal group talk 50-40-30: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same talk about your favorite animal group to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My favorite animal group is mammals.",
              "They have fur, and fur keeps them warm.",
              "Their babies drink milk.",
              "I like them because they are soft.",
            ],
            recycle: ["I should go to bed early.", "You shouldn't run at school."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A gives the talk, then Partner B. The listener counts the facts on their fingers. Then change partners." },
              { seconds: 40, say: "Round 2: New partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A, then Partner B: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do three rounds. The talk is a little shorter each round: 50, 40 and 30 seconds each.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: a 4/3/2 activity scaled down for seven-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 matters: without it the children only get faster at their mistakes. This is the rehearsal for the recorded talk, so Support children can keep their three sentences from the Rehearse step.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite animal group is ___.", "They have ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add how a part helps them and why you like them.", frames: ["___ help them ___.", "I like them because ___."] },
            ],
          },
        },
        {
          after: "Write: shared sentence, then your own (SB 15 Write, WB 9)",
          slide: {
            kind: "writing",
            title: "Fix the animal notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each note with your partner. Something is wrong!",
              "Find it: have / has, it / they / them, a capital letter or a missing -s.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Birds has wings.", answer: "Birds have wings." },
              { q: "Fish have gills. Gills help they breathe.", answer: "Fish have gills. Gills help them breathe." },
              { q: "A frog is green. They jump.", answer: "A frog is green. It jumps." },
              { q: "fur keep mammals warm", answer: "Fur keeps mammals warm." },
            ],
            checklist: ["Many animals: 'have'. One animal: 'has'", "they (doer), them (after the verb), it (one animal)", "Capital letter at the start, full stop at the end"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote: "These are common slips for children learning English. Vietnamese has no verb endings, so 'has' / 'have' and the -s on keeps take time. Fix item 1 together first. Corrections work best when children find the mistake themselves, so give the clue ('Look at the verb') and wait.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u01-l5": {
      objectives: ["I can say 'It has ... and they help it ...' about my animal, again and again, without stopping."],
      trim: { "Remember it!": 4, "Grammar mystery: the pond story": 6, "Pond hop: They, it or them?": 8 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion talk again: new partner, new try",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the champion talk again with a new partner. Say it smoother and faster than before.",
            chunks: [
              "The owl has big eyes, and they help it see at night.",
              "Its feathers keep it warm.",
              "It hunts at night.",
              "It is different from a duck because it eats mice.",
            ],
            recycle: ["Wings help them fly.", "Fish have scales and gills."],
            rounds: [
              { seconds: 50, say: "Round 1: Think of your animal's sentences. Partner A tells the talk, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 2: New partner. Partner A tells the same talk again with fewer stops, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it a third time, then Partner B: fast and clear!" },
            ],
            steps: [
              "Choose your animal and say three sentences: what it has, how a part helps it, and how it is different.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'They has' or 'help it' for many animals) and fix them together; then go on.",
              "When the bell rings, change partners. In each round Partner A talks, then Partner B talks.",
              "The listener has a job: tick each time you say 'it' or 'they' correctly. Say how many.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task again with a new partner frees attention for accuracy. The planning minute and the mid-way fix both help. Listen for it / they agreement and for clear final -s on eyes, feathers and wings. The owl sentences are a model, not a script: children use their own animals.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["It has ___.", "They help it ___."] },
              { level: "Core", task: "Say three sentences without the board." },
              { level: "Stretch", task: "Add a comparison with 'but' or 'because'.", frames: ["It is different from ___ because ___."] },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "Animal fact card: look, then write",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find 'it', 'they' and 'but'.",
              "Choose an animal. Write three or four sentences with the frames.",
              "Read your card to your partner. Check it with the checklist.",
            ],
            text: {
              title: "The penguin",
              text: "The penguin is a bird. It has wings, but it can't fly. It swims in cold water, and its feathers keep it warm. Penguins live in big groups, and they keep each other warm.",
            },
            frames: ["The ___ is a ___. It has ___, but it can't ___.", "It ___, and ___ help it ___.", "___ live ___, and they ___."],
            checklist: ["It for one animal, they for many", "have / has and the -s: feathers, wings", "Capital letters and full stops"],
            sayIt: "Read your fact card to your partner, then say it again without looking.",
            teacherNote: "A short model, then children write about their own animal with the same shape: modelled writing is one of the best-supported ways to help young writers. Check that the animal is real and the facts are true, using the class book. Support children can copy the model's shape with their own animal's words.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill it for your animal; draw the animal." },
              { level: "Core", task: "Write three sentences about your animal." },
              { level: "Stretch", task: "Write four sentences and compare it with a second animal." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How my animal's body helps it",
        prompt: "Choose an animal. Tell us what body parts it has and how they help it. Show a picture, a drawing or a toy.",
        length: "45-90 seconds",
        steps: [
          "Choose your animal and look at your fact card from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Say 'it' for one animal or 'they' for many.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell us about your animal's body parts and how they help it. Keep talking without long stops.",
        words: ["skin", "fur", "feathers", "scales", "wings", "gills", "eyes", "legs", "safe", "warm"],
        grammar: ["It has ___. / They have ___.", "___ help(s) it / them ___.", "It is different from ___ because ___."],
        rubric: [
          { label: "Body and help", description: "Names at least two body parts and says how each one helps the animal.", weight: 3 },
          { label: "It, they, them", description: "Uses it, they and them correctly: 'Feathers help them fly', not 'help they'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of feathers, wings and eyes can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It has ___.", "They help it ___."], tips: ["Point to each body part on your picture."] },
          { level: "Core", who: "Most children", frames: ["The ___ has ___, and they help it ___.", "It lives in / on ___."], tips: ["Talk about two body parts."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It is different from ___ because ___.", "___ and ___ are the same because both ___."], tips: ["Compare your animal with another animal."] },
        ],
      },
    },
  },
};
