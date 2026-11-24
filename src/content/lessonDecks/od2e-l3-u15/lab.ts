import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 15 "Plants and
// People" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's language said again and again as
// whole sentences, a little faster each round, with Unit 14's phrases mixed back in) and
// one short writing routine that ends by being said aloud. Two lessons end with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// and repeats, never from the book pages, the grammar or the checks. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it themselves: start the phrase and pause ('a bag ... ?'), point to the frame, hold up a finger for the missing 'of' or the missing -s, or repeat the error with a rising voice ('two bag of rice?'). For a sound, just say it right and let them echo it. Say every final -s and -es clearly yourself ('boxes', 'bottles', 'plants'): Vietnamese speakers often drop final sounds, and children copy what they hear.";

// One grammar drill (ages 8-10): a sentence changed fast by a sign, in chorus, then pairs,
// then real talk. The unit's grammar is drilled; the Level 4 step (the present passive in
// a process) joins in round 3 and the Stretch tier once it has been taught.
function drill(o: {
  title: string;
  minutes?: number;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  fix: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
  step?: boolean;
}): Slide {
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: o.minutes ?? 6,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: `Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or tense, P = change the person${o.step ? ", S = say it the Level 4 way, with is / are + a past-participle verb" : ""}). The class says the new sentence together.` },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with the -s and the little words where they belong.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: `Prompt, do not tell: ${o.fix} For a sound, say it right and let the child echo it. Say every final -s, -es and -ed clearly yourself: Vietnamese has no word endings, so children often leave them off. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.`,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. Keep it brisk and playful (a sign card is a game piece), and stop before it drags. Mark nothing in writing: this is about speed and accuracy in speech. The Stretch tier takes one step toward Oxford Discover 4, where these sentences grow longer.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u15-l1": {
      objectives: ["I can say 'If a plant has no water, it dies' and 'Because ..., the plant ...' fast and clearly."],
      trim: {
        "Can see, cannot see": 3,
        "Draw it, label it, tell it": 3,
        "Which grows faster? (Before You Read, SB 149)": 4,
        "Cause and effect with plants": 3,
      },
      add: [
        {
          after: "What do plants need? (SB 149 F)",
          slide: {
            kind: "fluency",
            title: "Plant sprint: if and because",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 5,
            goal: "Say the whole cause-and-effect sentence, fast and smooth, with no stops.",
            chunks: [
              "If a plant has no water, it dies.",
              "Because the roots take in water, the plant grows.",
              "The leaves use sunlight to make food.",
              "Plants give us oxygen, so we need them.",
              "The stem holds the flower up.",
            ],
            recycle: ["A jet flies faster than a car.", "Before lamps were invented, people used candles."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card (roots, leaves, sun, water) and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not just one word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'the plant no water' or 'the roots takes') and let the class fix them; then go on.",
            ],
            prompts: ["(card: roots and water)", "(card: leaves and sun)", "(card: a plant with no water)", "(card: a stem and a flower)", "(card: oxygen)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words. The unit's cause-and-effect language is the grammar of this lesson; saying it as one smooth piece is what makes it available later when a child wants to explain. Listen for 'has no water' (children say 'no have water'), the -s on 'roots' and 'leaves', and for 'takes' versus 'take' (one plant, many roots). Mix last unit's comparing phrases in every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["If a plant has no ___, it ___.", "Because the ___, the plant ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second reason: 'If a plant has no sun, its leaves turn yellow, so it cannot make food.'", frames: ["If a plant has no ___, then ___, so ___."] },
            ],
          },
        },
        {
          after: "Plant sprint: if and because",
          slide: drill({
            title: "Grammar drill: if, because, so with plants",
            goal: "Change the plant sentence fast and right: ask it, say no, join it with if, because or so, change the time or the person. Then talk about plants you know.",
            chunks: [
              "If a plant has no water, it dies.",
              "Do plants need sun? Yes, they do, because the leaves make food with sunlight.",
              "The roots take in water, so the plant grows.",
              "A plant does not grow well if it has no light.",
              "When the sun comes up, the sunflower turns to it.",
              "If we forget the water, the plant will die, so we must water it every day.",
            ],
            recycle: ["I have never seen a lion dance.", "If we move to the city, I will go to a new school.", "While the bee was flying, it saw a flower."],
            prompts: ["Plants need water. (?)", "A plant grows in the dark. (X)", "The plant has no water. (+ if ... it dies)", "The roots take in water. (T: tomorrow, use will)", "The leaf makes food. (P: the leaves)"],
            real: "Real talk: tell your partner what happens to a plant at home or at school if nobody looks after it. Use if or because. Your partner asks one question.",
            slips: "'the plant no water', 'the roots takes' or 'Do plants needs water'",
            fix: "for 'The plant no water' say 'If a plant has ...?' and point to the frame; for 'The roots takes' repeat it with a rising voice and let the child fix it; for a missing -s tap your wrist.",
            support: ["Do plants need ___? Yes, they do.", "If a plant has no ___, it ___."],
            stretch: "Use if with will, and add a second reason: 'If we do not water it, the plant will die, so we must water it every day.'",
            stretchFrames: ["If we do not ___, the plant will ___.", "___, so we must ___."],
          }),
        },
        {
          after: "Cause and effect with plants",
          slide: {
            kind: "writing",
            title: "Why we need plants: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline one because, one if and one so and tell you one thing they liked.",
              "Teacher: while they write, look only at the cause-and-effect sentences (because, if, so) and the -s on plural plant words. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Plants help us",
              text: "Plants are very important for people. First, plants give us food, such as rice, beans and bananas. Second, the leaves make oxygen, so we can breathe. If a plant has no water, it dies, so we must look after plants. Because plants help us in so many ways, I want to grow a sunflower at home.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Why are plants important? Say it in one sentence." },
              { label: "Reason 1: First, ...", prompt: "What do plants give us? (food, oxygen)" },
              { label: "Reason 2: Second, ... so ...", prompt: "What else do plants do for us? Use so: 'the leaves make oxygen, so we can breathe'." },
              { label: "If a plant has no ...", prompt: "What happens when a plant has no water or sun? Use if. Then say what we must do. Use so." },
              { label: "Closing: Because ...", prompt: "End with 'Because plants help us, I want to ...'" },
            ],
            frames: ["Plants are very important for ___.","First, plants give us ___.","Second, the ___ make ___, so ___.","If a plant has no ___, it ___, so ___.","Because plants ___, I want to ___."],
            checklist: [
              "My first sentence says why plants matter",
              "I used because, if or so, and the part after it is a whole sentence",
              "More than one: plants, leaves, roots (the -s is there)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets, the cause-and-effect sentences (a missing 'has' in 'If a plant has no water', a missing part after because) and the plural -s, with a dot on the line; the child finds and fixes the mistake. This paragraph pulls together the sentences the class practised earlier in the lesson.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["Plants are very important for ___.","First, plants give us ___.","Because plants ___, I want to ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a second cause and effect: 'If a plant has no sun, its leaves turn yellow, so it cannot make food.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u15-l2": {
      objectives: ["I can tell the life of a sunflower in order, shorter and faster each time."],
      trim: { "Tell the story of a seed": 6, "Home talk: show and tell": 3, "I am a sunflower seed (interview)": 4 },
      add: [
        {
          after: "Tell the story of a seed",
          slide: {
            kind: "fluency",
            title: "Sunflower story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same sunflower story three times, each round. In every round partner A tells it, then partner B. Each round is shorter, smoother and faster (75, 60, 45 seconds each).",
            chunks: [
              "First, a seed goes into the soil.",
              "Then the roots grow down and the stem grows up.",
              "After a few weeks, a flower opens.",
              "Because the sunflower gets water and sun, it grows tall.",
              "In the end, the seeds fall down, so new sunflowers can grow.",
            ],
            recycle: ["Clara solved the problem by using glass in a new way.", "Before lamps were invented, people used candles."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole life of a sunflower, then Partner B tells it. Use the five picture cards. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Say fewer extra words, same story. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the five key-picture cards in order: seed, roots and stem, flower, sun and water, new seeds.",
              "Partner A tells the story using the pictures, then Partner B tells it. The listener has a job: count the order words (First, Then, After, In the end) on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board (often 'the roots grows' or a missing 'the') and let the class fix them; then start round 2.",
              "When the bell rings, change partners. Each round, both partners talk.",
            ],
            prompts: ["(card: seed in soil)", "(card: roots and stem)", "(card: flower opens)", "(card: sun and water)", "(card: seeds fall down)"],
            feedback: correct,
            teacherNote: "Retelling the same story three times with less time is what builds speed: the children are no longer searching for ideas, so they can work on saying the words smoothly. Repeating is not enough for accuracy, so the one-minute fix between round 1 and round 2 matters most. Listen for 'the roots grow' (plural, no -s on the verb) versus 'the stem grows' (one thing, -s). Say 'grows' and 'grow' clearly yourself.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it with the frames.", frames: ["First, a seed goes into the ___.", "Then the ___ grow down.", "After a few weeks, ___."] },
              { level: "Core", task: "Tell all five parts without the frames." },
              { level: "Stretch", task: "Add the reason: 'Because the sunflower gets water and sun, it grows tall.'", frames: ["Because ___, the sunflower ___."] },
            ],
          },
        },
        {
          after: "Sunflower story: tell it again, faster",
          slide: drill({
            title: "Grammar drill: First, Then, After, In the end",
            goal: "Change the sunflower sentence fast and right: ask it, say no, join it with because, so or when, change the time or the person. Then talk about something you grew or watched grow.",
            chunks: [
              "First, a seed goes into the soil.",
              "Then the roots grow down, and the stem grows up.",
              "Does the flower open after a few weeks? Yes, it does.",
              "Because the sunflower gets water and sun, it grows tall.",
              "The seeds do not grow if the soil is too dry.",
              "In the end, the seeds fall down, so new sunflowers can grow.",
            ],
            recycle: ["I used to be shy, but now I am able to speak.", "I was reading when a beetle landed on my book.", "It must be solar power."],
            prompts: ["The seed goes into the soil. (?)", "The stem grows down. (X)", "The flower opens. (+ when the sun comes up)", "The roots grow. (T: last week)", "The stem grows up. (P: the roots)"],
            real: "Real talk: tell your partner about a plant or a pet that grew at your home or school. Say what happened first, then next, and what it is like now. Your partner asks one question.",
            slips: "'the roots grows', 'the stem grow' or a missing comma after 'First'",
            fix: "for 'The roots grows' hold up two fingers and say 'The roots ...?'; for 'the stem grow' hold up one finger; for the pause after First, show a comma with your hand.",
            support: ["Does the ___ ___? Yes, it does.", "First, ___. Then ___."],
            stretch: "Use T and a long sentence with after or before: 'After the roots grew down, the stem grew up, and before the flower opened, the leaves turned to the sun.'",
            stretchFrames: ["After the ___ grew, the ___ ___.", "Before the ___ opened, the ___ ___."],
          }),
        },
        {
          after: "Why does it turn to the sun?",
          slide: {
            kind: "writing",
            title: "The life of a sunflower: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline every order word and its comma and tell you one thing they liked.",
              "Teacher: while they write, look only at the order words (First, Then, After a few weeks, In the end) with a comma, and 'the roots grow' / 'the stem grows'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The life of a sunflower",
              text: "A sunflower has an amazing life. First, a seed goes into the soil. Then the roots grow down and the stem grows up. After a few weeks, a big yellow flower opens, and it turns to the sun. In the end, the seeds fall down, so new sunflowers can grow. I like sunflowers because they are tall and bright.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which plant? What is it like? (amazing, tall, bright)" },
              { label: "First, ... Then, ...", prompt: "What happens to the seed first? What grows next?" },
              { label: "After a few weeks, ...", prompt: "What does the plant look like now?" },
              { label: "In the end, ...", prompt: "What happens last? Why do you like this plant?" },
            ],
            frames: ["A ___ has an amazing life.","First, a seed goes into the ___.","Then the ___ grow down and the ___ grows up.","In the end, ___, so ___."],
            checklist: [
              "My steps are in the right order",
              "Each order word has a comma after it",
              "The roots grow, the stem grows (the verb matches)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets, the order words with their commas and the plural / verb match (roots grow, stem grows), with a dot on the line; the child finds and fixes the mistake. The paragraph is also the script for this lesson's recorded talk, My seed story.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["A ___ has an amazing life.","First, a seed goes into the ___.","In the end, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences, with your own plant." },
              { level: "Stretch", task: "Add a reason with because or so: 'Because the sunflower gets water and sun, it grows tall.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My seed story",
        prompt: "Tell how a seed becomes a plant, in order. Show a seed, a drawing or a plant if you have one!",
        length: "60-90 seconds",
        steps: [
          "Look at the five pictures from class, or draw your own: seed, roots and stem, flower, sun and water, new seeds.",
          "Practise three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the life of a seed in order with First, Then, After and In the end, and keep talking without long stops.",
        words: ["seed", "soil", "roots", "stem", "flower", "sun", "water"],
        grammar: ["First, / Then, / After a few weeks, / In the end,", "Because ___, the plant ___."],
        rubric: [
          { label: "Right order", description: "Tells the steps in order with First, Then, After and In the end.", weight: 3 },
          { label: "Plant words", description: "Uses words from the unit: seed, soil, roots, stem, flower.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on roots and seeds, and 'grows' for one thing, can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, a seed goes into the ___.", "Then the ___ grow.", "In the end, ___."], tips: ["Point to each picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___. Then ___. After a few weeks, ___.", "In the end, ___."], tips: ["Say who and what in every step."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Because the sunflower gets ___, it ___.", "The seeds fall down, so ___."], tips: ["Add a reason with 'because' or 'so', and say why humans like sunflowers."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u15-l3": {
      objectives: ["I can ask and answer with 'a bag of ...' and 'two boxes of ...' fast, round the circle."],
      trim: {
        "Count it or cannot count it?": 3,
        "At the market (role play)": 6,
        "Make a shopping list (SB 153 G)": 6,
        "Song time (SB 153 D)": 4,
        "Words in context (SB 152 C)": 4,
        "Cause and effect game": 3,
      },
      add: [
        {
          after: "Measure words: a jar of, a bag of, a box of",
          slide: {
            kind: "grammar",
            title: "Level 4 step: how things are made (is / are + past participle)",
            hook: "Rice does not jump into the bag by itself. People do things to it, and 'is' and 'are' tell that story.",
            form: [
              { label: "One thing", pattern: "The + noun + is + past participle   (The seed is planted.)" },
              { label: "More than one", pattern: "The + nouns + are + past participle   (The seeds are watered.)" },
              { label: "In order", pattern: "First, / Then, / Next, / Finally, + passive   (First, the seeds are planted.)" },
              { label: "No", pattern: "is not / are not + past participle   (The seeds are not watered at night.)" },
              { label: "Question", pattern: "Is / Are + noun + past participle?   (Are the seeds watered every day?)" },
            ],
            explanation: [
              "Sometimes we care more about the thing than about the person who does the job. 'The farmer plants the seeds' tells us about the farmer. 'The seeds are planted' tells us about the seeds, and that is just what we want when we explain how rice, bread or a bean plant gets to us.",
              "We use it to explain a process, one step after another: First, the seeds are planted. Then they are watered. Finally, the rice is cut and put into bags. We take is or are (the same is / are you know from 'There is a bag' and 'There are two bags') and add the verb in its past-participle form: planted, watered, washed, packed, sold. You do not need to say who did it.",
              "This grows out of this unit: the bags and boxes of food you counted today all started somewhere and were made or grown in steps. It is also grammar you will meet again in Oxford Discover 4, where you will use it to explain how things are made and how nature works.",
            ],
            examples: [
              { text: "First, the seeds are planted in the soil." },
              { text: "Then they are watered every day.", note: "'They' means the seeds, so we use are." },
              { text: "The rice plants are cut when the grains are ready." },
              { text: "The rice is washed, and then it is packed into bags.", note: "Rice is one thing, so we use is." },
              { text: "Two boxes of cookies are put on the party table." },
              { text: "Are the bags of rice carried to the market by truck?", note: "The question starts with Are." },
            ],
            pitfalls: [
              { wrong: "The seeds planted in the soil.", right: "The seeds are planted in the soil.", why: "English needs is or are before the past-participle verb. Do not leave it out." },
              { wrong: "The plant is water every day.", right: "The plant is watered every day.", why: "After is / are the verb takes its past-participle ending (-ed for most verbs)." },
              { wrong: "The seeds is planted first.", right: "The seeds are planted first.", why: "Many seeds, so are; one seed, so is. The -s on 'seeds' tells you." },
            ],
          },
        },
        {
          after: "Level 4 step: how things are made (is / are + past participle)",
          slide: drill({
            title: "Grammar drill: a bag of, two boxes of, and how it is made",
            minutes: 7,
            goal: "Change the shopping sentence fast and right: ask it, say no, join it, change the person. Then say how a food is made with is / are, in order.",
            chunks: [
              "I need two bags of rice for the party.",
              "Do you have a loaf of bread? No, I don't, so I will buy one.",
              "How many bottles of water do you need?",
              "She has a jar of honey because her bees made it.",
              "First, the rice is planted, and then it is cut.",
              "The bags of rice are packed and carried to the market.",
              "Is the honey made by bees? Yes, it is.",
            ],
            recycle: ["The loudest drum I have ever heard was in the parade.", "It was so loud that I covered my ears.", "Glass was made by people in ancient times."],
            prompts: ["We have a bag of rice. (?)", "He needs a jar of honey. (X)", "She buys two boxes of cookies. (+ because)", "I buy a loaf of bread. (T: yesterday)", "The farmer waters the plants. (S: the plants are ...)"],
            real: "Real talk: choose a food you like and tell your partner how it is made or grown, step by step, with First, Then and is / are (for example rice, bread or a banana). Say how many bags or boxes you would buy. Your partner asks one question.",
            slips: "'two bag of rice', 'a bag rice', 'the seeds planted' or 'the plant is water'",
            fix: "for 'two bag of rice' hold up two fingers and say 'two bag...s?'; for 'a bag rice' tap the word of in the frame; for 'the seeds planted' say 'The seeds ... planted?' and let the child add are; for 'is water' say 'is wateRED?' stressing the ending.",
            support: ["Do you have a ___ of ___? Yes, I do.", "The ___ is / are ___ed."],
            stretch: "Use S in the pairs round too and add a reason: 'First, the rice is planted, then it is cut, and finally two bags of rice are sold because many people eat it.'",
            stretchFrames: ["First, the ___ is / are ___ed.", "Then ___, and finally ___."],
            step: true,
          }),
        },
        {
          after: "Make a shopping list (SB 153 G)",
          slide: {
            kind: "fluency",
            title: "Shopping chain: how many bags of ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "How many bottles of water do you need?",
              "I need two bottles of water.",
              "I have a bag of rice and a jar of honey.",
              "Can I have a loaf of bread, please?",
              "Here you are. Anything else?",
            ],
            recycle: ["A jet flies faster than a car.", "I like inventions, and my partner does, too."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a food-and-container card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it (for example: a box of cookies, a bag of rice).",
              "Ask the friend on your left: 'How many ___ of ___ do you need?'",
              "They answer with a number, 'I need ___ ___ of ___.', then turn and ask the next friend.",
              "The listener's job: if you hear 'of' and the -s on the container, tap your head.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'two rice' or 'three box') and fix them together; then go on.",
            ],
            prompts: ["(card: bag of rice)", "(card: bottle of water)", "(card: jar of jam)", "(card: box of cookies)", "(card: loaf of bread)"],
            feedback: correct,
            teacherNote: "The chain gives every child many turns at asking and answering in a few minutes, which makes the measure-word pattern automatic. The three typical errors are leaving out 'of' ('a bag rice'), counting the food instead of the container ('two rices') and a missing -s or -es on the container ('three box'). Prompt with a finger for 'of' and a rising 'three box?'. Time the whole circle; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame and pass the question on.", frames: ["I need ___ ___ of ___.", "How many ___ of ___ do you need?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I need two bags of soil because I want to plant a sunflower.'", frames: ["I need ___ because ___."] },
            ],
          },
        },
        {
          after: "Circle the measure word (SB 153 F)",
          slide: {
            kind: "writing",
            title: "Our Saturday market: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence.",
              "Check: tick the checklist. Swap with a partner: they underline every measure word and the 'of' after it and tell you one thing they liked.",
              "Teacher: while they write, look only at 'of' after every container and the plural -s or -es on the container (two bottles, three boxes). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Our Saturday market",
              text: "Every Saturday, I go to the market with my family. First, we buy a bag of rice and two bottles of water. Then my mother gets a loaf of bread and a jar of honey. We always need three boxes of cookies because many friends visit us. At the end, our basket is full, and I feel very happy!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "When and where do you shop, and with whom?" },
              { label: "First, ...", prompt: "What do you buy first? Use a bag of, a bottle of ..." },
              { label: "Then ... (more than one)", prompt: "What else? Use two or three and a container: two jars of ..." },
              { label: "Closing", prompt: "Why do you need it? How do you feel at the end?" },
            ],
            frames: ["Every ___, I go to the ___ with ___.","First, we buy a ___ of ___ and two ___ of ___.","We need ___ because ___.","At the end, ___."],
            checklist: [
              "My first sentence says when and where",
              "Every container has 'of' after it (a bag of rice)",
              "More than one container: -s or -es (two boxes of cookies); the food stays the same",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets, 'of' after the container and the plural ending on the container, with a dot on the line; the child finds and fixes the mistake. Counting the food instead of the container ('two rices') is the slip to listen for as they read aloud. The shopping sentences practised earlier in the lesson feed this paragraph.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Every ___, I go to the ___ with ___.","First, we buy a ___ of ___.","At the end, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with because or so: 'We have no soil, so we buy two bags of soil for our sunflowers.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u15-l4": {
      objectives: ["I can explain how to grow a plant with First, Second, Then and Finally, three times, faster each time."],
      trim: { "Bees and flowers: think and share (Listening, Think)": 3, "May I borrow ...? (SB 155 C)": 7, "Explain it to a visitor": 3, "Word families: strong, strength (SB 155 D)": 3 },
      add: [
        {
          after: "Explain it to a visitor",
          slide: {
            kind: "fluency",
            title: "Plant steps 4-3-2: explain it three times",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Explain how to grow a plant to three friends. In each round both partners explain it, one after the other. Each talk is shorter and smoother (75, 60, 45 seconds each).",
            chunks: [
              "First, fill a small pot with soil.",
              "Second, push a seed into the soil.",
              "Next, give the seed a little water every day.",
              "Finally, put the pot near a sunny window.",
              "Plants need water and sun, so don't forget them!",
            ],
            recycle: ["A jet flies faster than a car.", "Because the roots take in water, the plant grows."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A explains how to grow a plant, then Partner B. The listener counts the order words on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A, then Partner B: the same talk in less time. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B: fast and smooth! The listener asks one question at the end: 'Why do plants need sun?'" },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B). Use the four step pictures to remember the order.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'First put soil' with no comma or a missing 'the') and fix them together; then go on.",
              "When both partners have talked and the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again in rounds 2 and 3, each time shorter.",
            ],
            feedback: correct,
            teacherNote: "The same talk, less time, a new listener: the 4/3/2 routine scaled for ten-year-olds. The new partner keeps the repetition real. Do not add new language between rounds: the gain comes from saying the same things more smoothly. The correction minute between round 1 and round 2 is what also raises accuracy. Listen for the pause (comma) after First, Second, Finally, and for the verb: 'give the seed' not 'gives the seed' after First and Next.",
            tiers: [
              { level: "Support", task: "Say four short sentences with the frames and the pictures.", frames: ["First, ___.", "Second, ___.", "Finally, ___."] },
              { level: "Core", task: "Say all the steps without the board." },
              { level: "Stretch", task: "Add a reason for each step: 'Finally, put the pot near a window because plants need sun.'", frames: ["Finally, ___ because ___."] },
            ],
          },
        },
        {
          after: "Sequence adverbs: First, Second, Finally",
          slide: drill({
            title: "Grammar drill: First, Second, Finally, and the is / are way",
            goal: "Change the plant-steps sentence fast and right: ask it, say no, join it, change the person. Then say the same steps the Level 4 way, with is / are.",
            chunks: [
              "First, fill a small pot with soil.",
              "Second, push a seed into the soil and give it a little water.",
              "Finally, put the pot near a sunny window.",
              "Do we water the seed every day? Yes, we do, because it needs water to grow.",
              "First, the pot is filled with soil, and then the seed is pushed in.",
              "Next, the seed is watered, and finally the pot is put near a window.",
            ],
            recycle: ["A ramp is used for moving heavy things.", "We are flying to Tokyo on Monday.", "There are too many cars and not enough buses."],
            prompts: ["You water the seed every day. (?)", "Put the pot in the dark. (X)", "Water the seed. (+ because it needs water)", "Fill the pot with soil. (S: The pot is ...)", "We put the pot near a window. (P: she)"],
            real: "Real talk: tell your partner how you make something at home (a cup of tea, an egg, a sandwich). Use First, Then and Finally. Say it once with 'you' and once with is / are. Your partner asks one question.",
            slips: "'First put soil' with no pause, 'the seed is water' or 'the pot fill with soil'",
            fix: "for the missing comma after First, pause and show a comma with your hand; for 'the seed is water' say 'is wateRED?' and stress the ending; for 'the pot fill' say 'the pot ... is ...?' and point to the frame.",
            support: ["First, ___. Second, ___. Finally, ___.", "The ___ is ___ed."],
            stretch: "Say all the steps with is / are and add a reason: 'First, the pot is filled with soil because seeds need it. Then the seed is watered, so it can grow.'",
            stretchFrames: ["First, the ___ is ___ed because ___.", "Then ___ is / are ___ed, so ___."],
            step: true,
          }),
        },
        {
          after: "Human sentence (SB 155 E)",
          slide: {
            kind: "writing",
            title: "Model: how to grow a bean plant",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Plan: think of three steps for growing something. Write one word for each step in a quick organiser.",
              "Read the model with the teacher. Find the first sentence, First, Second, Third, Finally and the last sentence. Find the comma after each order word.",
              "Write: a short paragraph with your own steps in order: a first sentence, three or four steps and a last sentence.",
              "Check with the list. Then read it to your partner.",
            ],
            text: {
              title: "How to grow a bean plant",
              text: "A bean plant is easy to grow. First, put soil in a small pot. Second, push a bean seed into the soil. Third, give it a little water every day. Finally, put the pot near a sunny window. After two weeks, a green sprout comes up. Now you can watch it grow!",
            },
            frames: ["___ is easy to grow.", "First, ___.", "Second, ___.", "Third, ___.", "Finally, ___."],
            checklist: ["My paragraph has a first sentence and a last sentence", "My steps are in the right order", "There is a comma after First, Second, Third and Finally", "Each step starts with an action word (put, push, give)"],
            sayIt: "Read your steps to your partner, then say them again without looking.",
            teacherNote: "Plan, write, check is a strategy children can reuse for any paragraph, and a short model helps them see how the steps are built before they write their own. Praise a child who changes the model's steps to a different plant instead of copying it.",
            tiers: [
              { level: "Support", task: "Copy the model and change one thing (bean to sunflower)." },
              { level: "Core", task: "Write three or four steps for any plant." },
              { level: "Stretch", task: "Write the steps and add a 'because' sentence at the end.", frames: ["Plants need ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u15-l5": {
      objectives: ["I can say what I need for a plant party with 'a bag of', 'two boxes of' and 'because'."],
      trim: { "Market run": 3, "Remember it!": 3, "Grammar Champion check": 3 },
      add: [
        {
          after: "Two kitchens: find the differences",
          slide: {
            kind: "fluency",
            title: "Party shopping: say it again, better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same shopping talk with a new partner in each round. In every round Partner A talks, then Partner B. Say it smoother and with fewer mistakes (75, 60, 45 seconds each).",
            chunks: [
              "For my plant party, I will buy a bag of soil.",
              "I need two boxes of cookies because we are hungry.",
              "We have no bread, so I will buy a loaf of bread.",
              "I will buy a bunch of flowers for the party table.",
              "How many bottles of water do you need?",
            ],
            recycle: ["Before lamps were invented, people used candles.", "A good solution is to ask for help."],
            rounds: [
              { seconds: 75, say: "Round 1: Plan for one minute. Then Partner A tells what you will buy for the party and why, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A, then Partner B: do the same talk again, with the fixes. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A, then Partner B: once more, smooth and fast." },
            ],
            steps: [
              "Look at your party shopping list. Plan for one minute with your partner: what you need, how many, and why.",
              "Partner A tells their shopping talk, then Partner B. The listener's job: count the containers (bag, box, bottle) and ask one follow-up question.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (often 'two box of' or 'a bag rice') and fix them together; then go on.",
              "Change partners when you hear the bell, and do it again: in each round both partners talk.",
            ],
            prompts: ["(list: a party for 8 children)", "(list: plants and flowers)"],
            feedback: correct,
            teacherNote: "Repeating the same task with a planning minute and a new partner lets children focus on accuracy the second time, because the ideas are already ready (task repetition). Do not give a new topic in round 3. Listen for 'of' after every container, the plural ending on the container (not on the food), and the 'because' or 'so' part.",
            tiers: [
              { level: "Support", task: "Use the frames and the pictures.", frames: ["I will buy a ___ of ___.", "I need ___ because ___."] },
              { level: "Core", task: "Talk without looking at your list." },
              { level: "Stretch", task: "Add what you do not need, with 'so': 'We have no rice, so I will buy two bags of rice.'", frames: ["We have no ___, so I will buy ___."] },
            ],
          },
        },
        {
          after: "Grammar: measure word + of + food",
          slide: drill({
            title: "Grammar drill: both rules, bags of food and how it is made",
            goal: "Change the sentence fast and right with both of this unit's rules: a bag of / two boxes of, and how things are made with is / are. Ask it, say no, join it, change the time or the person.",
            chunks: [
              "I need three boxes of cookies because many friends are coming.",
              "How many bottles of water do you need?",
              "We don't have any bread, so I will buy a loaf of bread.",
              "First, a bag of rice is bought at the market.",
              "The rice is washed, and then it is cooked in a pot.",
              "Two jars of honey are put on the party table.",
              "Are the cookies made at home, or are they bought at the shop?",
            ],
            recycle: ["The telephone was invented in 1876.", "So do I. / Neither do I.", "By the time the explorers arrived, the ship had left."],
            prompts: ["He has a bag of soil. (?)", "She needs two boxes of cookies. (X)", "I buy a jar of honey. (+ so)", "We bought three bottles of water. (T: tomorrow, use will)", "The farmer cuts the rice. (S: The rice is ...)"],
            real: "Real talk: plan a plant party with your partner. Say what you will buy, how many bags, boxes or bottles, and tell how one of the foods is made, in order, with is / are. Your partner asks one question.",
            slips: "'two box of cookies', 'a bag rice', 'the rice cook' or 'the cookies is made'",
            fix: "for 'two box of' hold up two fingers and say 'two box...?'; for 'a bag rice' tap the word of in the frame; for 'the rice cook' say 'the rice is ...?' and let the child add is cooked; for 'cookies is' hold up two fingers and say 'cookies ...?'.",
            support: ["I need a ___ of ___.", "The ___ is / are ___ed."],
            stretch: "Use two signs together and S: 'Many friends are coming, so two boxes of cookies are bought, and then they are put on the table.'",
            stretchFrames: ["___, so ___ are ___ed.", "Then ___ is / are ___ed."],
            step: true,
          }),
        },
        {
          after: "Writing: A shopping paragraph",
          slide: {
            kind: "writing",
            title: "Fix the party list",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing 'of', a missing -s or -es on the container, or a food made plural by mistake.",
              "Write the sentence the right way. Read it aloud together.",
              "Plan, write, check: write your own short paragraph about a plant party. Make a first sentence, three sentences with a container, and a last sentence. Check it with the list.",
            ],
            items: [
              { q: "I need two bag of rice.", answer: "I need two bags of rice." },
              { q: "We bought a box cookies.", answer: "We bought a box of cookies." },
              { q: "She wants three bottles of waters.", answer: "She wants three bottles of water." },
              { q: "There are two loaf of bread on the table.", answer: "There are two loaves of bread on the table." },
              { q: "He needs a bag of soil because he want to plant a seed.", answer: "He needs a bag of soil because he wants to plant a seed." },
            ],
            checklist: ["Every container has 'of' after it", "The container has -s or -es for more than one (the food stays the same)", "He / she / it + a verb: -s (wants)", "My paragraph has a first sentence and a last sentence", "One sentence tells how a food is made, with is / are (the rice is washed)"],
            sayIt: "Say all your fixed sentences to your partner, fast.",
            teacherNote: "Written correction works best when it focuses on two or three error types with a short explanation, so the checklist has three: 'of', the plural on the container, and the verb -s. Fix item 1 together first. 'Loaves' is a bonus: praise it if a child sees it, but do not make it the lesson.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the checklist beside you." },
              { level: "Core", task: "Fix all five items, then write the paragraph." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My plant party shopping",
        prompt: "You are planning a plant party. Tell us what you will buy, how many, and why. Show the things if you can!",
        length: "60-90 seconds",
        steps: [
          "Make a short shopping list of four things: a bag of ___, two boxes of ___ ...",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Use 'because' or 'so' to give a reason.",
          "Add one sentence about how a party food is made, with is / are: 'The cookies are baked in an oven.'",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you will buy with 'a bag of' and 'two boxes of', give a reason, and keep talking without long stops.",
        words: ["bag", "box", "bottle", "jar", "bunch", "loaf", "soil", "seeds"],
        grammar: ["a / one + measure word + of + food", "two bags of rice, three boxes of cookies", "I need ___ because ___.", "First, the ___ is / are ___ed. (how it is made)"],
        rubric: [
          { label: "Measure words with of", description: "Says a bag of rice, a jar of honey: the container, then 'of', then the food.", weight: 3 },
          { label: "Plural on the container", description: "Says two bags, three boxes (not two bag, three box); the food does not change.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about three or four things, in whole sentences.", weight: 3 },
          { label: "A reason", description: "Gives at least one reason with 'because' or 'so'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I will buy a ___ of ___.", "I need ___ because ___."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["For my plant party, I will buy a ___ of ___ and two ___ of ___.", "I need ___ because ___."], tips: ["Say a number for at least two things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We have no ___, so I will buy ___.", "Plants give us ___, so ___."], tips: ["Add what you already have and a sentence about why plants matter."] },
        ],
      },
    },
  },
};
