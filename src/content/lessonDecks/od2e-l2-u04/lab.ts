import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 4 "Mix It Up"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8. Every lesson
// gets one fluency routine (cause and effect, was and were and the contractions said
// again and again as whole sentences, a little faster each round, with Unit 3's phrases
// mixed back in) and one writing routine that ends by saying the sentences aloud. Three
// lessons end with a recorded talk for home. Time comes from games and repeats, never
// from the book pages or the grammar. All text is original.

const fixCause =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names): the usual ones are a missing -s ('the ice melt'), 'When it is hot, the ice' with no effect, and a missing 'so'. Between rounds 1 and 2 stop for one minute: write the mistakes on the board and let the class fix them; children then say it again with the fixed form. For grammar, prompt the child to fix it instead of saying it for them: start the phrase and pause ('When it is hot, the ice mel...?'), point to the frame, or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. Say every final -s and -ed yourself, clearly.";

const fixWas =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names): the usual ones are 'They was', 'I were', 'Yes, it were', 'Was the students happy?' and a missing be ('The ice hard'). Between rounds 1 and 2 stop for one minute: write the mistakes on the board and let the class fix them; children then say it again with the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('The cups w...?'), point to the was / were frame, or repeat the error with a rising voice ('They WAS?'). For a sound, say it right and let the child echo it. Say was, were and the -n't of wasn't and weren't clearly yourself.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u04-l1": {
      objectives: ["I can say 'When it is hot, the ice melts.' fast, without stopping."],
      trim: { "Simon says: pour, open, closed": 4, "What's missing? Spell it!": 5 },
      add: [
        {
          after: "Cause and effect talk",
          slide: {
            kind: "fluency",
            title: "Cause and effect sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the cause and the effect in one smooth sentence, fast and right.",
            chunks: [
              "When it is hot, the ice melts.",
              "When it is cold, the water freezes.",
              "I pour the juice, so the cup is full.",
              "The bag is closed, so the sugar stays inside.",
              "I mix the salt and the water, and it is a mixture.",
            ],
            recycle: ["The ice was hard. Now it is water.", "The puddles were ice. Now they are water."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a cause card, the class says the whole sentence with the effect." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say the WHOLE sentence: the cause, then the effect.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Two mistakes from the rounds go on the board and the class fixes them; then go on.",
            ],
            prompts: ["(card: ice in the sun)", "(card: water in the freezer)", "(card: a cup of juice)", "(card: a closed bag)", "(card: salt in water)"],
            feedback: fixCause,
            teacherNote: "Whole sentences only, never single words: 'When it is hot, the ice melts' should come out as one smooth piece. Vietnamese verbs have no -s ending, so the -s on melts and freezes is easy to drop: say it clearly every time and let the children hear it. Mix in Unit 3's 'was / now it is' cards every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["When it is ___, the ___ ___s.", "I ___ the ___, so ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second effect: 'When it is hot, the ice melts, so the water is cold.'" },
            ],
          },
        },
        {
          after: "Omar's day: write the effects (SB 37 D)",
          slide: {
            kind: "writing",
            title: "Join the cause and the effect",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'so'. Say it first, then write it.",
              "Read your sentence to your partner. Then say it again without looking.",
            ],
            items: [
              { q: "The sun is hot. The ice melts. (so)", answer: "The sun is hot, so the ice melts." },
              { q: "The door is open. The cold air comes in. (so)", answer: "The door is open, so the cold air comes in." },
              { q: "I put the juice in the freezer. It freezes. (so)", answer: "I put the juice in the freezer, so it freezes." },
              { q: "I pour the milk. The cup is full. (so)", answer: "I pour the milk, so the cup is full." },
            ],
            frames: ["The ___ is ___, so ___.", "I ___ the ___, so ___."],
            checklist: ["A comma before 'so'", "-s on the effect: melts, freezes, comes", "A capital letter and a full stop"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model item 1 aloud, crossing out the full stop between the two sentences. The cause comes first and 'so' brings the effect: say 'cause, so, effect' as you point. Watch for the missing -s on the effect.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write a new 'so' sentence from your own kitchen." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u04-l2": {
      objectives: ["I can tell the ice cream play in four parts, faster each time."],
      trim: { "Act it out: rehearse and perform": 8, "First, next, then: steps in order": 6 },
      add: [
        {
          after: "First, next, then: steps in order",
          slide: {
            kind: "fluency",
            title: "Ice cream play: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the children want ice cream.",
              "Next, they ask Mr. Jenkins for help.",
              "Then they mix the cream and the sugar.",
              "At the end, the ice cream is cold and yummy.",
            ],
            recycle: ["When it is cold, the water freezes.", "The ice was hard. Now it is water."],
            rounds: [
              { seconds: 75, say: "Tell your partner the play. Use the four picture cards." },
              { seconds: 50, say: "New partner. Tell it again in less time." },
              { seconds: 35, say: "New partner. Tell it fast! Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four picture cards in order. Say one sentence for each card.",
              "Teacher: after round 1, stop for one minute. Put two sentences you heard with a mistake on the board and let the class fix them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(card: the children are hungry)", "(card: they ask for help)", "(card: they mix the cream and the sugar)", "(card: everyone eats)"],
            feedback: fixCause,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The correction minute between the first and second telling is what lifts accuracy as well as speed. Keep the picture cards on the board for Support children. Accept short tellings; the shrinking time does the work. Listen for the 3rd person -s: 'wants', 'asks', 'mixes'.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence with the frames.", frames: ["First, ___.", "Next, ___.", "Then ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add why: 'The ice cream is cold because the ice is cold.'" },
            ],
          },
        },
        {
          after: "What do you think about the play?",
          slide: {
            kind: "writing",
            title: "Write the cold drink steps",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model. Find First, Next and Then.",
              "Write your own three steps for making a cold food or drink. Use the frames.",
              "Read them to your partner, then say them without looking.",
            ],
            text: { title: "How to make a cold drink", text: "First, I pour milk into a cup. Next, I put in a spoon of sugar and stir. Then I put the cup in the freezer. The milk freezes, so it is cold and yummy!" },
            frames: ["First, I ___.", "Next, I ___.", "Then I ___.", "It ___s, so ___."],
            checklist: ["First, Next and Then in the right order", "A capital letter and a full stop in every sentence", "-s on the effect: it freezes, it melts"],
            sayIt: "Say your three steps to your partner without looking at the paper.",
            teacherNote: "Modelled writing: children notice what a short text does before they write their own. Read the model twice and ask 'What happens first?' before they write. Keep it to a cold food they know, so the words are theirs.",
            tiers: [
              { level: "Support", task: "Copy the model, changing the food or drink, and draw it." },
              { level: "Core", task: "Write three steps of your own with First, Next and Then." },
              { level: "Stretch", task: "Add an effect with 'so' at the end: 'It melts, so ...'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How to make a cold treat",
        prompt: "Tell us how to make a cold treat at home: First, Next, Then. Show the food or draw each step.",
        length: "45-90 seconds",
        steps: [
          "Choose a cold treat: ice cream, a fruit drink or ice pops. Draw three pictures, one for each step.",
          "Say the three steps three times to a grown-up or a toy, a little faster each time.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell the steps with First, Next and Then, say what changes, and keep talking without long stops.",
        words: ["cream", "sugar", "pour", "mixture", "freezer"],
        grammar: ["First, Next, Then", "The ___ ___s, so ___."],
        rubric: [
          { label: "Steps in order", description: "Tells at least three steps with First, Next and Then.", weight: 3 },
          { label: "Cause and effect", description: "Says what changes, with 'so' or 'when': It freezes, so it is cold.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of freezes, melts and mixes can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, I ___.", "Next, I ___.", "Then I ___."], tips: ["Point to your pictures as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, I pour ___ into ___.", "Next, I put in ___.", "Then I put it in the freezer, so ___."], tips: ["Say what changes at the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["When it is ___, the ___ ___s.", "It is ___ because ___."], tips: ["Add a 'when' sentence and say why it tastes good."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u04-l3": {
      objectives: ["I can ask and answer 'Was it ___?' and 'Were they ___?' fast, round the circle."],
      trim: { "Yesterday and today: what changed?": 8 },
      add: [
        {
          after: "Picture questions (SB 41 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: was or were?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Was the door open? Yes, it was.",
              "Were the cups full? No, they weren't.",
              "Where was the juice? It was in the fridge.",
              "Where were the ducks? They were in the pond.",
              "I was at school, and you were at the park.",
            ],
            recycle: ["The ice was hard. Now it is water.", "The puddles were ice. Now they are water."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card from yesterday." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Was the ___ ___?' or 'Were the ___ ___?'",
              "They answer: 'Yes, it was.' / 'No, it wasn't.' / 'Yes, they were.' / 'No, they weren't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Was the ___ ___?", "Were the ___ ___?", "Where was the ___?", "Where were the ___?"],
            feedback: fixWas,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes was and were automatic. Time the whole circle and tell them; children like beating their own time. The most common slips are 'Yes, it were' and 'Was the cups ...?': prompt with one finger for one thing and two fingers for more than one.",
            tiers: [
              { level: "Support", task: "Answer with the short answer and pass the question on with the frame on the board.", frames: ["Was the ___ ___? Yes, it was.", "Were the ___ ___? No, they weren't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a 'Where' question and the answer: 'Where was the juice? It was in the fridge.'" },
            ],
          },
        },
        {
          after: "A mixture: what was in it? (SB 41 F)",
          slide: {
            kind: "writing",
            title: "Fix the party sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: was or were, a missing be, or a capital letter.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The cakes was yummy.", answer: "The cakes were yummy." },
              { q: "I were at the party yesterday.", answer: "I was at the party yesterday." },
              { q: "Was the cups full?", answer: "Were the cups full?" },
              { q: "Yes, they was.", answer: "Yes, they were." },
              { q: "The juice cold.", answer: "The juice was cold." },
            ],
            checklist: ["One thing: was. More than one: were.", "I and he, she, it: was", "A be word in every sentence: was or were"],
            sayIt: "Read your fixed sentences to the class in a party voice.",
            teacherNote: "Two or three error types at a time: was / were agreement and the missing be. Vietnamese has no be before an adjective, so 'The juice cold' is a very common slip; do not just correct it, ask 'Where is was or were?' Fix item 1 together first.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 5 with the frame 'The ___ was / were ___.'" },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u04-l4": {
      objectives: ["I can talk about my favorite mixture three times, faster each time."],
      trim: { "Food chant": 3, "We wash / We don't wash (SB 42 B)": 7 },
      add: [
        {
          after: "Say it first: my favorite mixture",
          slide: {
            kind: "fluency",
            title: "Mixture talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same mixture talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My favorite mixture is a fruit salad.",
              "It has apples, bananas and grapes in it.",
              "It isn't a liquid. It is a solid mixture.",
              "The grapes were cold because they were in the fridge.",
            ],
            recycle: ["When it is hot, the ice melts.", "The puddles were ice. Now they are water."],
            rounds: [
              { seconds: 75, say: "Partner 1: tell your mixture talk. The listener counts the foods on their fingers." },
              { seconds: 55, say: "Partner 2: the same talk in less time." },
              { seconds: 40, say: "Partner 3: fast and smooth! The listener says 'Yum!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: "During the talk listen and do not stop it. Note two or three mistakes (no names): the usual ones are a missing -s on foods ('apple, banana'), 'is'nt' or 'isnt' for isn't, and 'They was'. Between rounds 1 and 2 stop for one minute and let the class fix them on the board. Prompt grammar so the child fixes it: start the phrase and pause ('It is...?', then point to isn't on the board), point to the frame, or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. Say the final -s of 'grapes' and the -n't of 'isn't' clearly yourself.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix is what makes it more accurate too.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite mixture is ___.", "It has ___ and ___ in it."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a was / were sentence: 'The grapes were cold because they were in the fridge.'" },
            ],
          },
        },
        {
          after: "Shared writing: write it together",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: the fruit salad",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Remember: isn't = is + not, and the o goes. Weren't = were + not.",
              "Listen to the text once. Do not write.",
              "Listen again and write key words. Then rebuild the text in your group.",
              "Compare with the original. Say it aloud together.",
            ],
            text: { title: "Fruit salad", text: "My fruit salad has apples, grapes and bananas in it. The grapes were cold, but the apples weren't cold. It isn't a liquid. It is a solid mixture, and it tastes sweet!" },
            frames: ["My ___ has ___ in it.", "The ___ were ___, but the ___ weren't ___.", "It isn't a ___."],
            checklist: ["isn't and weren't have the apostrophe in the right place", "-s on apples, grapes, bananas", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your text to the other group, then say it again without looking.",
            teacherNote: "Dictogloss works best straight after a short rule reminder, so the children listen for the contractions and the plurals. Read at normal speed, twice, and do not repeat a third time. Groups will not match word for word: compare the meaning and the grammar, not the exact words.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and use the frames on the board." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text, then change the foods and the temperature." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Yesterday's food",
        prompt: "Tell us about a meal or a snack you had yesterday. What was it? What was in it? Was it hot or cold? Was it yummy?",
        length: "45-90 seconds",
        steps: [
          "Remember yesterday's meal. Find a picture or draw it.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use was and were: The soup was hot. The vegetables were yummy.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say what the food was, what was in it and how it was, with was and were, and keep talking without long stops.",
        words: ["salad", "fruit", "vegetables", "pasta", "tea", "coffee"],
        grammar: ["It was ___. They were ___.", "It wasn't ___. They weren't ___."],
        rubric: [
          { label: "Was and were", description: "Uses was for one thing and were for more than one: The soup was hot. The vegetables were yummy.", weight: 3 },
          { label: "Food words", description: "Uses words from the unit: salad, fruit, vegetables, pasta.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Negatives", description: "Says at least one wasn't or weren't sentence clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Yesterday I had ___.", "It was ___."], tips: ["Hold up your picture."] },
          { level: "Core", who: "Most children", frames: ["Yesterday I had ___. It was ___.", "The ___ were ___.", "It wasn't ___."], tips: ["Say one thing and then more than one thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ were ___, but the ___ wasn't ___.", "I liked it because ___."], tips: ["Compare two foods with 'but' and say why you liked it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u04-l5": {
      objectives: ["I can show my mixture book and say what is in it without stopping."],
      trim: { "Solid, liquid, gas: freeze and melt": 3, "Solid or liquid? Was or were?": 6 },
      add: [
        {
          after: "Make my mixture book (SB 45 B)",
          slide: {
            kind: "writing",
            title: "Grow my mixture sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add what it is made of, how it tastes or why you like it.",
              "Write your big sentence in your book. Read it to your partner.",
            ],
            items: [
              { q: "It is a mixture. (add: of milk and fruit)", answer: "It is a mixture of milk and fruit." },
              { q: "I like it. (add: because it is sweet)", answer: "I like it because it is sweet." },
              { q: "It is a liquid. (add: cold)", answer: "It is a cold liquid." },
              { q: "You need a cup. (add: and a spoon)", answer: "You need a cup and a spoon." },
            ],
            frames: ["It is a mixture of ___ and ___.", "I like it because ___.", "You need ___ and ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "-s on more than one: apples, grapes"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy a big sentence from the board and draw it in your book." },
              { level: "Core", task: "Write one big sentence of your own for your book." },
              { level: "Stretch", task: "Write two big sentences with 'and' and 'because'." },
            ],
          },
        },
        {
          after: "Show and tell: my mixture book (SB 45 C)",
          slide: {
            kind: "fluency",
            title: "Show and tell again: new group",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Say the same show and tell to a new group. Make it smoother each time.",
            chunks: [
              "This is my mixture. It is a mixture of milk and fruit.",
              "It is a liquid.",
              "To make it, you need a cup, a spoon and some ice.",
              "I like it because it is cold and sweet.",
            ],
            recycle: ["The ice was hard. Now it is water.", "The grapes were cold, but the apples weren't."],
            rounds: [
              { seconds: 60, say: "Group 1: plan for one minute with your book. Then tell it." },
              { seconds: 50, say: "New group. Tell the same show and tell again, smoother." },
              { seconds: 40, say: "Last new group. Tell it fast and clear. The listeners give a thumbs up." },
            ],
            steps: [
              "Hold your mixture book. Plan what you will say: what it is, what is in it, solid or liquid, why you like it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, move to a new group.",
              "The listeners ask one question at the end: 'What is in it?'",
            ],
            prompts: ["This is ___.", "It is a mixture of ___ and ___.", "To make it, you need ___.", "I like it because ___."],
            feedback: fixCause,
            teacherNote: "Task repetition: the same task with a new audience lets the child spend attention on getting the words right instead of finding them. The planning minute before round 1 helps; the correction minute between rounds 1 and 2 lifts accuracy. Listen for 'a mixture of' and for the -s on plural foods and on verbs like 'needs'.",
            tiers: [
              { level: "Support", task: "Point to your book and say two sentences with the frames.", frames: ["This is ___.", "It has ___ in it."] },
              { level: "Core", task: "Say four sentences without the frames." },
              { level: "Stretch", task: "Add the steps: 'First, ___. Next, ___. Then ___.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u04-l6": {
      objectives: ["I can say was and were sentences about yesterday fast and right."],
      trim: { "Hop to the answer: was or were?": 7 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: was, were, wasn't, weren't",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "The cups were on the table, but the plate wasn't.",
              "Was the ice cream soft? Yes, it was.",
              "Were the bags open? No, they weren't.",
              "The ice was hard. Now it is water.",
              "You were kind, and I was happy.",
            ],
            recycle: ["When it is hot, the ice melts.", "I pour the juice, so the cup is full."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. The two mistakes you heard most go on the board and the class fixes them; then go on.",
            ],
            feedback: fixWas,
            teacherNote: "A quick, high-energy recall of Units 3 and 4 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. Listen for 'was' said with 'cups' and for 'weren't' said as 'wasn't'.",
            tiers: [
              { level: "Support", task: "Say the sentence with the was / were frames on the board.", frames: ["The ___ was ___.", "The ___ were ___."] },
              { level: "Core", task: "Say the sentence without the board." },
              { level: "Stretch", task: "Change the sentence: 'The cups were on the floor, but the plate wasn't.'" },
            ],
          },
        },
        {
          after: "Write about yesterday: was and were",
          slide: {
            kind: "writing",
            title: "Fix the messy kitchen notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "A cook wrote notes about the messy kitchen, but made mistakes!",
              "Read each note with your partner and find the mistake.",
              "Write it the right way and read it to the cook (the teacher).",
            ],
            items: [
              { q: "The cups was on the floor.", answer: "The cups were on the floor." },
              { q: "You was kind yesterday.", answer: "You were kind yesterday." },
              { q: "Were the ice cream soft?", answer: "Was the ice cream soft?" },
              { q: "The bags wasnt open.", answer: "The bags weren't open." },
              { q: "Yes, it were.", answer: "Yes, it was." },
            ],
            checklist: ["One thing: was. More than one, and you: were.", "Contractions: wasn't, weren't (apostrophe in the right place)", "Short answers: Yes, it was. / No, they weren't."],
            sayIt: "Say all five fixed notes to your partner, fast.",
            teacherNote: "Two or three error types: was / were agreement, the apostrophe in contractions and the short answer. Do the first one together. 'You were' needs saying out loud: it takes were even for one person.",
            tiers: [
              { level: "Support", task: "Fix notes 1, 2 and 5 with the frames on the board." },
              { level: "Core", task: "Fix all five notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Yesterday and now",
        prompt: "Show something that changed. Tell us how it was before and how it is now: The ice was hard. Now it is water.",
        length: "45-90 seconds",
        steps: [
          "Find two or three things that changed: ice, a cold drink, a banana, the room ...",
          "Say what each thing was and what it is now. Practise three times.",
          "Record it once. Show each thing to the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say how things were before and how they are now, with was, were and is, and keep talking without long stops.",
        words: ["freezer", "open", "closed", "mixture", "pour"],
        grammar: ["It was ___. Now it is ___.", "They were ___. Now they are ___.", "It wasn't ___. They weren't ___."],
        rubric: [
          { label: "Was and were", description: "Uses was for one thing and were for more than one; is / are for now.", weight: 3 },
          { label: "Before and now", description: "Says how at least two things were before and how they are now.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Negatives", description: "Says wasn't or weren't clearly at least once.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ was ___. Now it is ___."], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["The ___ was ___. Now it is ___.", "The ___ were ___. Now they are ___."], tips: ["Use one thing and more than one thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It wasn't ___. It was ___.", "It changed because ___."], tips: ["Say why it changed with 'because'."] },
        ],
      },
    },
  },
};
