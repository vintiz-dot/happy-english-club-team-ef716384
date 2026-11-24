import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 1 "Amazing
// Animals" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio
// Grade 6: children in grades 6-7 (ages 11-13) working on a book written for younger
// children, so the Lab raises the demand: longer chunks with two clauses and reasons,
// topics they care about (their city, technology, school, sport, protecting animals),
// a grammar drill in every lesson, full paragraphs in three lessons, and talks that
// give reasons and examples. Every lesson has a fluency routine on the unit's sentences
// about animal groups and they / it / them, said again and again as whole phrases, a
// little faster each round, with Level 1's phrases mixed back in. Time comes from
// dropping the book's games for little ones, never from the book pages or the grammar.
// All text is original.

const correct =
  "During a round, listen and keep the talk going. Note two or three grammar slips (no names): often 'Birds has' or 'They has', 'Gills help they', 'it' for many animals, and a missing final -s. Between rounds 1 and 2, write them on the board and fix them together in one minute: students then say the same thing again with the fixed form. For grammar, prompt the student to fix it instead of saying it for them: start the phrase and pause ('Gills help ...?'), point to the frame, hold up a finger for the missing -s, or repeat the error with a rising voice ('They has?'). Example: a student says 'Wings help they fly'; you say 'Wings help ...?' and point to the word them. For a sound, a quick recast is fine: say it right and the student echoes. Say every final -s clearly yourself (feathers, wings, gills): students copy what they hear.";

const drillFeedback =
  "Prompt, do not tell: for 'Do fish has gills?' hold up one finger and say 'Do fish ...?'; for 'Gills help they' repeat it with a rising voice and let the student fix it; for a missing -s, tap your wrist. Say the -s and the n't clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
}): Slide {
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: 7,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when, T = change the tense or time, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with the -s where it belongs.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: give your own opinion or experience, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has students talk about their own lives and opinions, so the form is used for meaning. Grades 6-7 can take the full set: a question, a short answer, a negative, a join with because / although / so / when, a change of time and a change of person. Keep it brisk; a drill that drags loses its point. Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL2U1Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u01-l1": {
      objectives: ["I can say what animals have, with a reason, in a whole sentence, fast and smooth."],
      trim: { "The mystery bag": 5 },
      drop: ["Slap the word", "Which go together? Why?"],
      add: [
        {
          after: "Clue game: I have ... what am I?",
          slide: {
            kind: "fluency",
            title: "Body cover sprint: what do they have?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about an animal group, with a reason, fast and smooth, with no stops.",
            chunks: [
              "Fish have scales, and scales protect them in the water.",
              "Birds have feathers, so they stay warm and can fly.",
              "Frogs have wet skin, but they also breathe through it.",
              "Most mammals have fur, although some, like whales, have very little.",
              "Most birds lay eggs, but mammals usually give birth to babies.",
            ],
            recycle: ["I should ___, because ___.", "You shouldn't ___ if ___."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a photo, the class says the whole sentence with the reason." },
              { seconds: 75, say: "Pairs: one shows a photo, the other says the sentence and adds a reason. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many different sentences can you say?" },
            ],
            steps: [
              "Look at the photo. Say a WHOLE sentence with a reason: 'Birds have feathers, so they stay warm.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers and beat your own number from round 2.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(photo: a salmon)", "(photo: an eagle)", "(photo: a frog)", "(photo: a whale)", "(photo: a hen with eggs)"],
            feedback: correct,
            teacherNote: "Whole sentences with a reason, never single words: the aim is 'Birds have feathers, so they stay warm' as one smooth piece. Vietnamese has no plural ending, so students often leave the -s off scales, feathers and wings, or say 'Fish has': say those endings clearly yourself. Mix in two cards from Level 1 every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["___ have ___, and ___.", "___ have ___, so they ___."] },
              { level: "Core", task: "Say the sentence alone, with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a contrast with 'but' or 'although': 'Whales live in the sea, but they are mammals, so they breathe air.'", frames: ["___, but ___.", "___, although ___."] },
            ],
          },
        },
        {
          after: "Body cover sprint: what do they have?",
          slide: drill({
            title: "Grammar drill: say it, ask it, say no",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about real animals you know.",
            chunks: [
              "Birds have feathers, and they help them stay warm and fly.",
              "Do birds have feathers? Yes, they do, and feathers keep them warm.",
              "Fish don't have fur, although they live in cold water.",
              "A frog has wet skin, so it must live near water.",
              "Last week we watched a documentary about whales because our teacher asked us to.",
              "Which animal do you like most, and why do you like it?",
            ],
            recycle: ["My favorite animal is the ___ because it's ___.", "I think the fox is ___."],
            prompts: ["Owls have big eyes. (?)", "Frogs have wet skin. (X)", "Penguins live in cold places. (+ because)", "Bees make honey. (T: last summer)", "A turtle has a hard shell. (P: they)"],
            real: "Real talk: tell your partner about an animal you have seen in real life (in your city, at a zoo, on a trip, or online). Say what it has, what you think of it and why. Your partner asks one question.",
            slips: "'Do birds has' or 'They has'",
            support: ["Do ___ have ___? Yes, they do.", "___ don't have ___."],
            stretch: "Use two signs at once and a follow-up question: 'Last week I saw a turtle because ... Did it have a hard shell?'",
            stretchFrames: ["___, although ___.", "___, so ___. Do you think ___?"],
          }),
        },
        {
          after: "Same and different (SB 9 C)",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My favorite animal: plan, write, check",
            genre: "description",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details with a reason and an example, and the closing sentence.",
              "Plan: choose an animal. Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every linking word and every they / it / them and tells you one thing they liked.",
              "Teacher: look only at 'have' (not 'has') for many animals and at they / it / them. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: My favorite animal",
              text: "My favorite animal is the dolphin because it is clever and friendly. Dolphins are mammals, so they breathe air, although they live in the ocean. They have smooth skin, and they can swim very fast. For example, a dolphin can jump high above the water. They also help each other when one of them is hurt. However, many dolphins are in danger because of pollution. In conclusion, I admire dolphins, and I think people should protect them.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which animal is it, and what is your opinion of it? Use because." },
              { label: "Detail 1", prompt: "What group is it in? What does it have? Use so or although." },
              { label: "Example", prompt: "What can it do? Give one example. Start with For example." },
              { label: "Detail 2", prompt: "Add another fact or a problem the animal has. Start with Also or However." },
              { label: "Closing", prompt: "What do you think people should do? Start with In conclusion." },
            ],
            frames: ["My favorite animal is the ___ because it is ___.", "___ are ___, so they ___, although ___.", "For example, ___ can ___.", "However, ___ because ___.", "In conclusion, I ___, and I think ___."],
            checklist: [
              "Six to eight sentences: topic sentence, details with an example, closing",
              "Linking words: first, also, however, because, for example, in conclusion",
              "Many animals: 'have' and the final -s (feathers, wings)",
              "They / it / them used correctly, with no repeated animal name",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Students grow from short sentences to a real paragraph: six to eight sentences about one animal, planned in five boxes with a few words in each. The linking words (because, for example, however, in conclusion) are the new step. Mark only two things (have / has and they / it / them) and let the student find the mistake from your dot. The model is not a script: students choose their own animal and check the facts with a book or a trusted website.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["My favorite animal is the ___ because it is ___.", "___ are ___, so they ___.", "For example, ___ can ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with although or however, and a second example.", frames: ["Although ___, ___.", "However, ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u01-l2": {
      objectives: ["I can tell about the four animal groups with reasons and examples, faster each time."],
      trim: { "Class chart: four animal groups": 8, "Draw it, label it, describe it": 6 },
      drop: ["Group chant and freeze", "Same or different? Jump!"],
      add: [
        {
          after: "Class chart: four animal groups",
          slide: {
            kind: "fluency",
            title: "Four groups: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same four-group chart three times. Each time is shorter, smoother and faster.",
            chunks: [
              "Fish live in water and breathe with gills, so they can stay under water all their lives.",
              "Birds have feathers and wings, but not all birds can fly: penguins swim instead.",
              "Amphibians, such as frogs, begin life in water and later live on land.",
              "Mammals have fur or hair, and their babies drink milk, which is why mothers care for them.",
            ],
            recycle: ["My favorite animal is the ___ because it's ___.", "I think ___ because ___."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the four groups, then Partner B. Use the class chart to help you. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Point to one group on the chart at a time and say a whole sentence for it, with a fact and a reason or example. In each round Partner A tells it, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, change partners.",
              "The listener counts the groups on their fingers and says one fact they remember at the end.",
            ],
            prompts: ["(chart: fish)", "(chart: birds)", "(chart: amphibians)", "(chart: mammals)"],
            feedback: correct,
            teacherNote: "The same chart is told three times on purpose: by the second and third telling students are not searching for words, so they speak faster and more smoothly. The minute of fixing between the first and second telling is what makes the retell more accurate, not only quicker. Keep the chart up for Support students. Listen for 'Birds has' and for a missing -s on babies, feathers and wings.",
            tiers: [
              { level: "Support", task: "Point to each group and say one sentence for it.", frames: ["Fish live in ___ and ___.", "Birds have ___, but ___.", "Mammals have ___, and ___."] },
              { level: "Core", task: "Tell all four groups, with a reason or an example for each, without the frames." },
              { level: "Stretch", task: "Compare two groups and say how a body part helps: 'Birds have wings, but fish have fins. Fins help them swim, although wings help them fly.'", frames: ["___ have ___, but ___ have ___."] },
            ],
          },
        },
        {
          after: "Think boxes: same or different? (SB 10 and 11 Think)",
          slide: drill({
            title: "Grammar drill: group facts, ask it, say no",
            goal: "Change the sentence about an animal group fast and right: ask it, say no, join it with a reason, change the time or the person. Then give your own opinion.",
            chunks: [
              "Mammals have fur, and their babies drink milk.",
              "Do mammals have fur? Yes, they do, because fur keeps them warm.",
              "Fish don't have lungs, so they breathe with gills.",
              "Amphibians live in water and on land, although fish stay in water.",
              "Last year we visited a wildlife park, and we saw several amphibians there.",
              "Which group do you find the most interesting, and why?",
            ],
            recycle: ["I like ___ because ___.", "My favorite animal is the ___ because it's ___."],
            prompts: ["Birds lay eggs. (?)", "Fish have fur. (X)", "Frogs live near water. (+ because)", "Mammals care for their babies. (T: last year)", "A bird has wings. (P: they)"],
            real: "Real talk: tell your partner which animal group you find the most interesting and why, and give one example. Your partner agrees or disagrees with a reason.",
            slips: "'Birds has' or 'They lives'",
            support: ["Do ___ have ___? Yes, they do.", "___ don't have ___, so ___."],
            stretch: "Use two signs at once and a follow-up question: 'Fish don't have fur, although ... Do you think ...?'",
            stretchFrames: ["___ don't ___, although ___.", "I agree because ___. / I disagree because ___."],
          }),
        },
        {
          after: "Draw it, label it, describe it",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "My animal group: plan, write, check",
            genre: "description",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the facts, the examples, the contrast and the closing sentence.",
              "Plan: choose one animal group. Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every linking word and every they / it / them and tells you one thing they liked.",
              "Teacher: look only at 'they' for many animals and at the final -s. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Birds",
              text: "Birds are an interesting group of animals because they are so different from each other. All birds have feathers and wings, and most of them lay eggs. For example, eagles use their wings to hunt, while penguins use them to swim. Also, feathers keep birds warm and dry, so they can live in very cold places. However, not all birds can fly, because some of them are too heavy. In conclusion, I like birds because they show how animals change to fit their homes.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which group is it? Why is it interesting? Use because." },
              { label: "What they have", prompt: "What do they have? What do they lay or feed their babies? Use and." },
              { label: "Examples", prompt: "Name two animals in the group and say what each one does. Start with For example." },
              { label: "A contrast or a reason", prompt: "What is different or surprising? Start with Also or However. Use because or so." },
              { label: "Closing", prompt: "What do you think about the group? Start with In conclusion." },
            ],
            frames: ["___ are an interesting group of animals because ___.", "All ___ have ___, and ___.", "For example, ___ use ___ to ___, while ___ use them to ___.", "However, not all ___ can ___, because ___.", "In conclusion, I ___ because ___."],
            checklist: [
              "Six to eight sentences: topic sentence, facts, examples, contrast, closing",
              "Linking words: first, also, however, because, for example, in conclusion",
              "'They' and 'them' for many animals (they have, use them)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "This paragraph is the script for the recorded talk 'My animal group talk': the student practices it here, then records it as a talk with reasons and examples. Mark only two things (they / them and the final -s) and let the student find the mistake from your dot. Accept any group the student can say true facts about; check the facts with the class chart.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["___ are an interesting group of animals because ___.", "All ___ have ___, and ___.", "For example, ___ use ___ to ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences and compare your group with a second group using 'while' or 'however'.", frames: ["___, while ___.", "However, ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal group talk",
        prompt: "Choose one animal group: fish, birds, amphibians or mammals. Tell us what they have, where they live and why you find them interesting. Give two examples of animals in the group. Show a photo or a drawing if you have one.",
        length: "90-120 seconds",
        steps: [
          "Choose your animal group and read your paragraph from class. Underline the reason and the two examples.",
          "Practice your talk out loud three times, a little faster and smoother each time, like in class. Do not read it word for word.",
          "Record it once. Look at the camera and give at least one reason and two examples.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell us what your animal group has and where they live, with reasons and two examples, and keep talking without long stops.",
        words: ["skin", "fur", "feathers", "scales", "wings", "gills", "eggs", "mammals", "amphibians", "interesting"],
        grammar: ["___ have ___, and they ___ because ___.", "For example, ___ use ___ to ___.", "However, not all ___ can ___."],
        rubric: [
          { label: "Group facts", description: "Says at least three true facts about one animal group: what they have, where they live, how they live.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least one reason with 'because' or 'so' and two examples with 'for example' or by naming animals.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: skin, fur, feathers, scales, wings, gills.", weight: 1 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time, without reading word for word.", weight: 2 },
          { label: "They and have", description: "Says 'They have ...' and 'Birds have ...' for many animals, with the final -s on the nouns.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["___ have ___.", "They live in ___, so ___."], tips: ["Point to your photo or drawing as you speak."] },
          { level: "Core", who: "Most students", frames: ["___ have ___ and ___ because ___.", "For example, ___ and ___."], tips: ["Say four facts, one reason and two examples."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["___ have ___. However, ___ because ___.", "___ and ___ are the same because both ___, but ___."], tips: ["Compare two groups and give a contrast with however or although."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u01-l3": {
      objectives: ["I can ask and answer about animals with 'they' and 'them', with reasons, fast, round the circle."],
      trim: { "Sing along: our animal song (SB 13 D)": 7, "Is it true for a whale? Is it true for a penguin?": 7, "Pass the pattern": 5 },
      drop: ["Hot seat: Who am I?", "Pronoun swap game"],
      add: [
        {
          after: "Pass the pattern",
          slide: {
            kind: "fluency",
            title: "Question chain: what do they have?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer with a reason, turn and ask the next student. Keep the chain going with no stops!",
            chunks: [
              "What do birds have, and how does it help them?",
              "They have wings, and wings help them fly long distances.",
              "Do you think zoos help animals? Why or why not?",
              "I think they do, because zoos protect them, although some animals need more space.",
              "Which animals do you see in your city? I often see pigeons, and I like watching them.",
            ],
            recycle: ["I agree because ___. / I don't agree because ___.", "He shouldn't ___ because ___."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an animal card." },
              { seconds: 75, say: "Swap cards. Go faster, and add a reason to every answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your animal card so only you can see it.",
              "Ask the student on your left about the animal on your card: 'What do ___ have, and how does it help them?'",
              "They answer with a reason: 'They have ___, and ___ help them ___.' Then they ask a new question: 'Do you think ___? Why?'",
              "The next student answers with 'because' and then turns and asks a new question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What do ___ have, and how does it help them?", "Do you think ___ ? Why or why not?", "Which animals do you see in ___ ?"],
            feedback: correct,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'They have ...' and 'Wings help them ...' automatic. Time the whole circle and tell them; students like beating their own time. Listen for 'Wings help they' and for 'It have' when the animal is many. Prompt with a raised finger and 'Wings help ...?'",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["They have ___.", "___ help them ___."] },
              { level: "Core", task: "Ask and answer with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a second fact and an opinion with 'although': 'They have wings, and wings help them fly, although some birds can't fly.'", frames: ["___, although ___.", "I think ___ because ___."] },
            ],
          },
        },
        {
          after: "What animals have these things? (SB 13 E)",
          slide: {
            kind: "writing",
            title: "Join them: because, although, so",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentences.",
              "Make ONE sentence with the joining word in brackets. Use they, it or them instead of saying the animal again. Say it first, then write it.",
              "Read your sentence to your partner. Is there another way to say it?",
            ],
            items: [
              { q: "A turtle has a hard shell. The shell protects the turtle from danger. (because, it)", answer: "A turtle has a hard shell because the shell protects it from danger." },
              { q: "Penguins live in very cold places. Thick feathers keep penguins warm. (although, them)", answer: "Although penguins live in very cold places, thick feathers keep them warm." },
              { q: "Dolphins are clever. Scientists study dolphins. (so, them)", answer: "Dolphins are clever, so scientists study them." },
              { q: "Bees make honey. We eat the honey. Bees need the honey in winter. (and, but, it, they)", answer: "Bees make honey, and we eat it, but they need it in winter." },
              { q: "Whales are mammals. People often think whales are fish. (although, they)", answer: "Whales are mammals, although people often think they are fish." },
            ],
            checklist: ["I did not say the animal name two times: I used they, it or them", "Many animals: they / them. One animal: it", "A comma where it is needed, and a full stop at the end", "The joining word shows the right meaning (reason, contrast or result)"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words and pronouns through use, not rules. Model item 1 aloud and cross out the second 'turtle' on the board. The common slips are 'protects they' and 'A turtle ... they'; fix those with a finger, not a lecture. Several answers are possible: accept any correct sentence with the joining word.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the teacher." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Write two groups of sentences of your own about animals in your city and join them for your partner." },
            ],
          },
        },
        {
          after: "Join them: because, although, so",
          slide: drill({
            title: "Grammar drill: they, it, them, ask it, say no",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about animals in your own city.",
            chunks: [
              "Owls have big eyes, and they help them see at night.",
              "Do big eyes help owls? Yes, they do, and they help them find food in the dark.",
              "Turtles don't have teeth, but their hard shells protect them.",
              "A rabbit hears very well, so it can escape from danger.",
              "Yesterday I saw some pigeons in the park, and I watched them for ten minutes.",
              "Which animals do you often see in your city, and what do you think about them?",
            ],
            recycle: ["I agree because ___. / I don't agree because ___.", "He shouldn't ___ because ___."],
            prompts: ["Frogs have wet skin. (?)", "Gills help fish breathe. (X)", "A turtle has a shell. (+ because it)", "Pigeons live in the city. (T: yesterday)", "A rabbit hears well. (P: they)"],
            real: "Real talk: tell your partner about animals you see in your city or at home. Say how you feel about them and why, and how people treat them. Your partner asks one question with they or them.",
            slips: "'Gills help they' or 'It have'",
            support: ["Do ___ help ___? Yes, they help them.", "___ doesn't ___, so ___."],
            stretch: "Use two signs at once and a follow-up question: 'Yesterday I saw ..., and I watched them because ... Do you like them?'",
            stretchFrames: ["___, although ___.", "I watched them because ___. Do you ___?"],
          }),
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u01-l4": {
      objectives: ["I can talk about my favorite animal group with reasons and examples, three times, faster each time."],
      trim: {
        "Compound words ball game (SB 15 F)": 6,
        "Big Question review (SB 15 bottom)": 8,
        "Oh no! Are you OK? (SB 15 E)": 9,
      },
      drop: ["Body parts: Simon says", "Secret animal: guess it!"],
      add: [
        {
          after: "Listening detectives (SB 14 C, D)",
          slide: drill({
            title: "Grammar drill: body parts, ask it, say no",
            goal: "Change the sentence about body parts fast and right: ask it, say no, join it with a reason, change the time or the person. Then give your own opinion.",
            chunks: [
              "Fish have fins, and fins help them swim fast.",
              "Do fish have legs? No, they don't, but frogs do, and they use them to jump.",
              "A bird doesn't have teeth, although it can eat hard seeds.",
              "Last weekend my cousin took photos of some birds because he wanted to study them.",
              "Elephants have long trunks, so they can drink and pick things up.",
              "Which animal body part do you think is the most useful, and why?",
            ],
            recycle: ["I should ___ because ___.", "You shouldn't ___ if ___."],
            prompts: ["Birds have wings. (?)", "Frogs have fur. (X)", "Elephants have trunks. (+ so)", "A bat uses its wings. (T: last night)", "A fish has gills. (P: they)"],
            real: "Real talk: tell your partner which animal body part you think is the most useful, and why. Compare it with a part of the human body. Your partner agrees or disagrees with a reason.",
            slips: "'Fish has fins' or 'help they'",
            support: ["Do ___ have ___? Yes, they do.", "___ don't have ___, but ___."],
            stretch: "Use two signs at once and a follow-up question: 'A bird doesn't have teeth, although ... Do you think ...?'",
            stretchFrames: ["___ don't have ___, although ___.", "I think ___ is more useful because ___."],
          }),
        },
        {
          after: "Rehearse: three things about my favorite animal group (SB 15 Write)",
          slide: {
            kind: "fluency",
            title: "Animal group talk 60-50-40: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same talk about your favorite animal group, with a reason and an example, to three partners. Each talk is shorter and smoother.",
            chunks: [
              "My favorite animal group is mammals, because they are so varied.",
              "They have fur or hair, and fur keeps them warm.",
              "For example, whales are mammals, although they live in the sea.",
              "I admire them because they take care of their babies.",
            ],
            recycle: ["I should ___ because ___.", "You shouldn't ___ if ___."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the talk, then Partner B. The listener counts the facts on their fingers. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: New partner. Partner A, then Partner B: fast and smooth! The listener tells you the best fact they heard." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do three rounds. The talk is a little shorter each round: 60, 50 and 40 seconds each.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: a 4/3/2 activity scaled down for a 90-minute lesson. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 matters: without it students only get faster at their mistakes. This is the rehearsal for the recorded talk, so Support students can keep their three sentences from the Rehearse step.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite animal group is ___ because ___.", "They have ___.", "For example, ___."] },
              { level: "Core", task: "Say four or five sentences with a reason and an example, without the board." },
              { level: "Stretch", task: "Add how a part helps them and a contrast with 'although' or 'however'.", frames: ["___ help them ___.", "However, ___."] },
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
            minutes: 6,
            steps: [
              "Read each note with your partner. Something is wrong, and some notes have more than one mistake!",
              "Find every mistake: have / has, it / they / them, a missing -s, a capital letter or a full stop.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Birds has wings, and they use it to fly.", answer: "Birds have wings, and they use them to fly." },
              { q: "Fish have gills. Gills help they breathe under water.", answer: "Fish have gills. Gills help them breathe under water." },
              { q: "A frog is green, although they can change color.", answer: "A frog is green, although it can change color." },
              { q: "fur keep mammals warm because they live in cold place", answer: "Fur keeps mammals warm because they live in cold places." },
              { q: "My sister love penguins, so she watch it every day at the zoo.", answer: "My sister loves penguins, so she watches them every day at the zoo." },
            ],
            checklist: ["Many animals: 'have'. One animal: 'has'", "they (doer), them (after the verb), it (one animal)", "The final -s on verbs and on plural nouns", "Capital letter at the start, full stop at the end"],
            sayIt: "Say all five fixed notes to your partner, fast.",
            teacherNote: "These are common slips for learners of English. Vietnamese has no verb endings, so 'has' / 'have' and the -s on keeps take time. Fix item 1 together first. Corrections work best when students find the mistake themselves, so give the clue ('Look at the verb') and wait.",
            tiers: [
              { level: "Support", task: "Fix notes 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five notes." },
              { level: "Stretch", task: "Write two new notes with a mistake each, for your partner to fix, and explain the rule." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u01-l5": {
      objectives: ["I can say 'It has ... and they help it ...' about my animal, with reasons and examples, again and again, without stopping."],
      trim: { "Remember it!": 3, "Grammar mystery: the pond story": 6 },
      drop: ["Pond hop: They, it or them?", "Movement break: Look at them!"],
      add: [
        {
          after: "Zoo helpers: the information gap",
          slide: drill({
            title: "Grammar drill: they, it, them, ask it, say no",
            goal: "Change the sentence fast and right with it, they and them: ask it, say no, join it with a reason, change the time or the person. Then give your own view.",
            chunks: [
              "The owl has big eyes, and they help it see at night.",
              "Does the owl see well in the dark? Yes, it does, and big eyes help it.",
              "Penguins can't fly, although they have wings, because they use them to swim.",
              "Last summer we watched some bees, and I was careful with them because they can sting.",
              "A turtle's shell protects it, so it feels safe.",
              "Which animal would you like to protect, and what can people do to help it?",
            ],
            recycle: ["I think ___ because ___.", "It is different from ___ because ___."],
            prompts: ["The owl has big eyes. (?)", "Wings help ducks fly. (X)", "A turtle has a shell. (+ so)", "Bees make honey. (T: last summer)", "The rabbit hears well. (P: they)"],
            real: "Real talk: tell your partner about an animal that needs protection. Say why it needs help and what people can do. Your partner asks one question with it or them.",
            slips: "'They has' or 'help they'",
            support: ["Does it ___? Yes, it does.", "___ doesn't ___, so ___."],
            stretch: "Use two signs at once and a follow-up question: 'Last summer I saw ..., and I helped it because ... What can we do to help them?'",
            stretchFrames: ["___, although ___.", "People can help them by ___."],
          }),
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion talk again: new partner, new try",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the champion talk again with a new partner. Say it smoother and faster than before, with reasons.",
            chunks: [
              "The owl has big eyes, and they help it see in the dark.",
              "Its soft feathers keep it warm, and they make it almost silent.",
              "It is different from a duck because it hunts mice at night.",
              "I think owls are amazing because they are well designed for their lives.",
            ],
            recycle: ["Wings help them fly.", "Fish have scales and gills."],
            rounds: [
              { seconds: 60, say: "Round 1: Think of your animal's sentences. Partner A tells the talk, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A tells the same talk again with fewer stops, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: New partner. Partner A tells it a third time, then Partner B: fast and clear!" },
            ],
            steps: [
              "Choose your animal and say four sentences: what it has, how a part helps it, how it is different, and your opinion with a reason.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'They has' or 'help it' for many animals) and fix them together; then go on.",
              "When the bell rings, change partners. In each round Partner A talks, then Partner B talks.",
              "The listener has a job: tick each time you say 'it' or 'they' correctly. Say how many.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task again with a new partner frees attention for accuracy. The planning minute and the mid-way fix both help. Listen for it / they agreement and for clear final -s on eyes, feathers and wings. The owl sentences are a model, not a script: students use their own animals.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["It has ___.", "They help it ___.", "I like it because ___."] },
              { level: "Core", task: "Say four sentences with a reason, without the board." },
              { level: "Stretch", task: "Add a comparison and a contrast with 'because', 'but' or 'although'.", frames: ["It is different from ___ because ___.", "___, although ___."] },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            routine: "paragraph",
            mode: "solo",
            title: "How my animal's body helps it: plan, write, check",
            genre: "description",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find 'it', 'they', 'so' and the example.",
              "Plan: choose an animal. Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every 'it', 'they' and 'them' and says if each one is right.",
              "Teacher: look only at it / they and at 'help it' (not 'help they'). Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: The rabbit",
              text: "The rabbit is a small mammal with a body that is perfect for its life. First, it has long ears, and they help it hear danger from far away. Also, strong back legs let it run and jump quickly, so it can escape from foxes. For example, a rabbit can reach a speed of more than forty kilometers an hour. Its soft fur also keeps it warm in winter. In conclusion, every part of the rabbit helps it stay safe, and that is why I find it fascinating.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which animal is it, and what group is it in? Say why its body is special." },
              { label: "Body part 1", prompt: "Name one body part. How does it help the animal? Start with First and use 'and they help it'." },
              { label: "Body part 2 and example", prompt: "Name a second body part. Give an example of what it can do. Start with Also and For example." },
              { label: "Another detail", prompt: "Add one more fact or a contrast. Use so, because or however." },
              { label: "Closing", prompt: "What do you think of the animal? Start with In conclusion." },
            ],
            frames: ["The ___ is a ___ with a body that is ___.", "First, it has ___, and they help it ___.", "Also, ___ let it ___, so it can ___.", "For example, ___ can ___.", "In conclusion, every part of the ___ helps it ___."],
            checklist: [
              "Six to eight sentences: topic sentence, body parts with an example, closing",
              "'It' for one animal, 'they' for many; 'help it', not 'help they'",
              "Linking words: first, also, however, because, for example, in conclusion",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "This paragraph is the script for the recorded talk 'How my animal's body helps it'. It uses the unit's grammar (it, they, them) in connected writing. Mark only two things (it / they and 'help it') and let the student find the mistake from your dot. Check that the animal is real and the facts are true with the class book. The rabbit model is not a script: students write about their own animal.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["The ___ is a ___ with a body that is ___.", "First, it has ___, and they help it ___.", "Also, ___ let it ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences and compare your animal with a second animal using 'but', 'because' or 'however'.", frames: ["However, ___.", "It is different from ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How my animal's body helps it",
        prompt: "Choose an animal. Tell us what body parts it has and how they help it, with an example of each. Say why you find the animal interesting. Show a photo or a drawing if you have one.",
        length: "90-120 seconds",
        steps: [
          "Choose your animal and read your paragraph from class. Underline the reasons and the examples.",
          "Practice your talk out loud three times, a little faster each time. Do not read it word for word.",
          "Record it once. Say 'it' for one animal or 'they' for many, and give at least two reasons and an example.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell us about your animal's body parts and how they help it, with reasons and examples. Keep talking without long stops.",
        words: ["skin", "fur", "feathers", "scales", "wings", "gills", "eyes", "legs", "safe", "warm"],
        grammar: ["It has ___. / They have ___.", "___ help(s) it / them ___ because ___.", "For example, ___ can ___.", "It is different from ___ because ___."],
        rubric: [
          { label: "Body and help", description: "Names at least two body parts and says how each one helps the animal.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons with 'because' or 'so' and an example with 'for example'.", weight: 3 },
          { label: "It, they, them", description: "Uses it, they and them correctly: 'Feathers help them fly', not 'help they'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time, without reading word for word.", weight: 2 },
          { label: "Clear endings", description: "The -s at the end of feathers, wings and eyes can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["It has ___.", "They help it ___.", "I like it because ___."], tips: ["Point to each body part on your photo or drawing."] },
          { level: "Core", who: "Most students", frames: ["The ___ has ___, and they help it ___ because ___.", "For example, ___ can ___."], tips: ["Talk about two body parts with a reason and an example each."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["It is different from ___ because ___.", "___ and ___ are the same because both ___, but ___."], tips: ["Compare your animal with another animal and give a contrast with however or although."] },
        ],
      },
    },
  },
};
