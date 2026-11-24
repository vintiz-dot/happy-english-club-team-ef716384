import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 8 "Take Away and
// Let Go" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 7's phrases mixed back in) and one
// writing routine (say it, write it, read it back). Three lessons end with a recorded
// talk for home, built on the routine the class just did. Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixPast =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say it again use the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('Did he ...?' and wait for the plain verb), point to the frame, or hold up a finger for the missing word. Do not say it for them. Typical slips: 'He eated', 'Did he went?', 'He didn't stole'. For a sound, say it right and let them echo it. Say the final sounds of took, hid, sold and didn't clearly yourself: children copy what they hear.";

const fixPlace =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Between rounds 1 and 2, stop for one minute and fix them on the board together. For grammar, prompt the child to fix it: point to the frame, or start the sentence and pause ('Where is the monkey? He ...'), or hold up a finger for the missing word. Do not say it for them. Typical slips: 'He hiding' (the is is missing: 'He is hiding') and a dropped final -s in 'bakes' and 'stirs'. For a sound, say it right and let them echo it. Say every final -s clearly yourself.";

const fixRetell =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then tell it again use the fixed form. For grammar, prompt the child to fix it: start the sentence and pause ('He ...'), point to the frame ('In the beginning, ...'), or hold up a finger for the missing -s or the missing 'is'. Do not say it for them. Typical slips: 'He want one more', 'He greedy', 'He cannot let go because he want', and 'He stole' mixed into a telling in the present. For a sound, say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

export const odL2U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u08-l1": {
      objectives: ["I can say 'Can I have a ___, please?' and 'He is hiding.' fast, without stopping."],
      trim: { "Mystery bag: what do you notice?": 5, "Bandar says: act the words": 5, "Chant: Monkey in the town": 3 },
      add: [
        {
          after: "Role play: the bakery and the kitchen",
          slide: {
            kind: "fluency",
            title: "Bakery sprint: ask, give, find",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["Can I have a muffin, please?", "Here you are.", "Where is the monkey? He is hiding.", "The cook stirs the soup.", "She bakes a big cake."],
            recycle: ["I'd like three, please.", "Ten take away four is six."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, put two mistakes you heard on the board (no names) and the class fixes them in one minute.",
            ],
            prompts: ["(card: muffin)", "(card: the monkey behind a tree)", "(card: a baker with a cake)", "(card: a cook with a pot)", "(card: a customer and a baker)"],
            feedback: fixPlace,
            teacherNote: "Whole sentences only, never single words: 'He is hiding' must come out as one smooth piece. Every few turns, show a Unit 7 card (a take-away picture) so last unit's phrases stay fast. Listen for the missing 'is' ('He hiding') and the dropped -s in 'bakes' and 'stirs'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["Can I have a ___, please?", "He is ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reply: 'Can I have a muffin, please?' 'Here you are. Mmm, thank you!'" },
            ],
          },
        },
        {
          after: "Story strips: the burned cake",
          slide: {
            kind: "writing",
            title: "Listen, remember, write: the cake",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Rule reminder: one person, one -s. 'The baker makes.' 'The cake burns.'",
              "Listen to the short text. Do not write yet.",
              "Listen again. Write the words you remember. Say the beginning, the middle and the end to your partner.",
              "Write the text together. Check it with the teacher's text.",
            ],
            text: { title: "The new cake", text: "In the beginning, a baker makes a cake. In the middle, the cake burns. At the end, the baker makes a new cake and everyone eats it." },
            frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."],
            checklist: ["Three parts: beginning, middle, end", "One person: the -s on makes and burns", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your text to your partner, then tell the story again without looking.",
            teacherNote: "Dictogloss: read at normal speed, twice, and never write it on the board first. The children rebuild the text from memory and meaning, so they notice the -s on 'makes' and 'burns' themselves; Vietnamese has no ending on the verb, so this is the slip to watch for. Read the final -s clearly both times.",
            tiers: [
              { level: "Support", task: "Fill in the frames with the words you remember.", frames: ["In the beginning, a baker ___ a cake."] },
              { level: "Core", task: "Write the whole story in three sentences." },
              { level: "Stretch", task: "Add one more sentence: 'The cake smells good!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u08-l2": {
      objectives: ["I can tell Bandar's story in three parts, faster each time."],
      trim: { "Read around the circle": 10, "Story map: beginning, middle, end": 9, "Freeze frames: four places": 5, "Chant and freeze: Monkey in the town": 4 },
      add: [
        {
          after: "Story map: beginning, middle, end",
          slide: {
            kind: "fluency",
            title: "Bandar retell: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["In the beginning, Bandar is bored.", "He wants one more!", "In the middle, he goes to town and steals things.", "At the end, he cannot let go of the candy.", "He is greedy."],
            recycle: ["Ten take away three is seven.", "There are four left."],
            rounds: [
              { seconds: 90, say: "Tell your partner the story. Use your story map." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 45, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Point to the beginning, the middle and the end on your story map as you speak.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener has a job: say 'Wow!' at the end and ask one question: 'Why can't he let go?'",
            ],
            prompts: ["(map: the beginning)", "(map: the middle)", "(map: the end)"],
            feedback: fixRetell,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Retelling builds fluency but not accuracy on its own, so the one-minute fix between rounds 1 and 2 matters most. Listen for the missing 'is' ('He greedy') and the missing -s on 'goes', 'wants' and 'steals'. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture on your map and say one sentence for it.", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add why, or tell it in the past: 'He cannot let go because he wants one more.' / 'Bandar went to town and stole some candy.'" },
            ],
          },
        },
        {
          after: "Why couldn't he let go?",
          slide: {
            kind: "writing",
            title: "Model, then write: I would let go",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find 'because'.",
              "Plan: what does Bandar want? Why is it hard to let go? What would you do?",
              "Write two or three sentences with the frames.",
              "Check with the list. Then read it to your partner.",
            ],
            text: { title: "What Bandar wants", text: "Bandar wants one more candy. He is greedy, so he cannot let go. I would let go because I do not want to be stuck." },
            frames: ["Bandar wants ___.", "He cannot ___ because ___.", "I would ___ because ___."],
            checklist: ["Bandar WANTS: the -s on wants", "I used 'because' to say why", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your sentences aloud, then say them again without looking.",
            teacherNote: "Model the plan aloud first (plan, write, check). 'Bandar wants' is the target: Vietnamese children often drop the -s on he/she verbs, so tap the -s on the board as you read the model. Praise 'because' every time it appears.",
            tiers: [
              { level: "Support", task: "Copy the model and change one word." },
              { level: "Core", task: "Write three sentences about Bandar and you." },
              { level: "Stretch", task: "Add a lesson: 'It is good to ___ because ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Bandar's story in three parts",
        prompt: "Tell the story of Bandar the monkey in three parts: the beginning, the middle and the end. Say why he cannot let go. Show a drawing if you like.",
        length: "45-60 seconds",
        steps: [
          "Look at your story map from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell the beginning, the middle and the end, say why Bandar cannot let go, and keep talking without long stops.",
        words: ["monkey", "greedy", "candy", "let go", "beginning", "middle", "end"],
        grammar: ["In the beginning / In the middle / At the end", "He wants ___. He cannot ___ because ___."],
        rubric: [
          { label: "Three parts", description: "Tells the beginning, the middle and the end of the story.", weight: 3 },
          { label: "Why", description: "Says why Bandar cannot let go, with 'because'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on 'wants' and 'goes' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the beginning, Bandar is ___.", "In the middle, he goes to ___.", "At the end, he cannot ___ because ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I would let go because ___.", "The lesson of the story is ___."], tips: ["End with what you would do and the lesson."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u08-l3": {
      objectives: ["I can ask 'Did you ___ yesterday?' and answer fast: 'Yes, I did. I ate rice.'"],
      trim: { "Yesterday chant": 4, "Which go together? Sort the verbs": 6, "Circle game: what did he do with the cookies?": 6 },
      add: [
        {
          after: "Follow the lines: ask your partner (SB 81 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Did you ___ yesterday?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Did you go to the park?", "Yes, I did. I went to the park.", "No, I didn't. I went to the shop.", "What did you eat?", "I ate noodles."],
            recycle: ["I saw a cat, but I didn't see a dog.", "I bought some bread."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card (park, shop, noodles, cake)." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Did you ___ yesterday?'",
              "They answer: 'Yes, I did. I ___.' or 'No, I didn't. I ___.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Did you ___ yesterday?", "What did you ___?"],
            feedback: fixPast,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Did you + plain verb' automatic. Time the whole circle and tell them; children like to beat their own time. Watch for 'Did you went?' and 'Yes, I do': prompt with a raised finger and 'Did you ...?' and wait.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board.", frames: ["Did you ___?", "Yes, I did. / No, I didn't."] },
              { level: "Core", task: "Ask and answer without looking at the board, and say what you did." },
              { level: "Stretch", task: "Add a second thing: 'I went to the park and I ate an ice cream.'" },
            ],
          },
        },
        {
          after: "Mini-quiz: your yesterday",
          slide: {
            kind: "writing",
            title: "Join them: and, but, because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Read your sentence to your partner. Check the verb after 'didn't'.",
            ],
            items: [
              { q: "Bandar took the candy. Bandar hid the candy. (and)", answer: "Bandar took the candy and hid it." },
              { q: "I went to the shop. I didn't buy milk. (but)", answer: "I went to the shop, but I didn't buy milk." },
              { q: "He was sick. He ate nine cookies. (because)", answer: "He was sick because he ate nine cookies." },
              { q: "I made a card. I gave it to my friend. (and then)", answer: "I made a card and then I gave it to my friend." },
            ],
            checklist: ["After 'didn't' the verb is plain: didn't buy", "The joining word is there: and / but / because", "A capital letter and a full stop"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model item 1 aloud, crossing out the second 'Bandar'. Two sentences about yesterday joined with 'and' and 'but' also keep the past-tense verb fresh. Accept 'took the candy and hid the candy' for item 1: the second Bandar goes, 'it' is a bonus. Watch for 'didn't bought' and 'eated'.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Write your own two sentences about yesterday and join them." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u08-l4": {
      objectives: ["I can tell my partner about last night three times, faster each time."],
      trim: { "Chant: Move your body": 4, "Think: count the noses": 3, "Thirteen or thirty? Listen for the end": 3, "Ball game: say the contraction": 3, "Crazy subtraction poem (SB 83 E)": 9 },
      add: [
        {
          after: "Tell your partner: last night (SB 83 Write)",
          slide: {
            kind: "fluency",
            title: "Last night talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same talk about last night to three friends. Each talk is shorter and smoother.",
            chunks: ["Last night I ate noodles.", "Then I went to bed.", "I didn't watch TV.", "I made a card for my friend.", "Did you eat noodles too?"],
            recycle: ["I gave two stickers to a friend.", "We didn't see a dog."],
            rounds: [
              { seconds: 90, say: "Partner 1: tell your talk about last night. The listener counts the things you did on their fingers." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 45, say: "Partner 3: fast and smooth! The listener asks one question: 'Did you ...?'" },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fixPast,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity made small for seven-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix is where accuracy comes in. Listen for the past forms (ate, went, made) and for 'didn't' with the plain verb.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Last night I ___.", "Then I ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add what you didn't do: 'I didn't play games because I was tired.'" },
            ],
          },
        },
        {
          after: "Contractions: Learn and write (SB 83 F)",
          slide: {
            kind: "writing",
            title: "Fix it: didn't and the plain verb",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: the apostrophe, a yesterday word, or the verb after didn't.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "I dont eat fish last night.", answer: "I didn't eat fish last night." },
              { q: "She didn't went to school.", answer: "She didn't go to school." },
              { q: "Last night I eated rice.", answer: "Last night I ate rice." },
              { q: "We did'nt buy milk.", answer: "We didn't buy milk." },
            ],
            checklist: ["The apostrophe is in the right place: didn't", "After didn't the verb is plain: go, eat, buy", "Yesterday words: ate, went, bought"],
            sayIt: "Read your fixed sentences to the class in a clear voice, and stress the final sounds.",
            teacherNote: "Focus on two error types only: the verb after didn't, and the ate / eated slip. The apostrophe is a bonus today. Fix item 1 together first and explain in one sentence: 'Did and didn't already tell us it was yesterday, so the verb stays plain.'",
            tiers: [
              { level: "Support", task: "Fix sentences 3 and 4 with the word list on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My last night talk",
        prompt: "Tell us what you did last night and one thing you didn't do. Say it in order: first, then, after that.",
        length: "45-60 seconds",
        steps: [
          "Think about last night: what did you eat, make or do?",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use ate, went or made, and say one thing with didn't.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say three things you did last night with yesterday words, one thing you didn't do, and keep talking without long stops.",
        words: ["last night", "ate", "went", "made", "didn't", "then"],
        grammar: ["Last night I ___ (yesterday word) ___.", "I didn't ___ (plain verb) ___."],
        rubric: [
          { label: "Yesterday words", description: "Uses ate, went, made or took correctly, not 'eated' or 'goed'.", weight: 3 },
          { label: "Didn't + plain verb", description: "Says one thing with 'didn't' and the plain verb: I didn't watch TV.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final sounds in 'didn't' and 'made' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Last night I ___.", "Then I ___.", "I didn't ___."], tips: ["Hold up a drawing of each thing."] },
          { level: "Core", who: "Most children", frames: ["Last night I ate ___ and I went to ___.", "Then I ___.", "I didn't ___ because ___."], tips: ["Say First, then, after that."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Did you ___ last night? Ask your grown-up!", "I made ___ and gave it to ___."], tips: ["Ask your grown-up a question and listen to the answer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u08-l5": {
      objectives: ["I can tell a take-away story fast: 'They had nine. They ate four. Now there are five.'"],
      trim: { "Gone! The counters game": 3, "Act it out: the picnic play": 6, "Make the game (SB 85 B)": 16, "Switch and play (SB 85 C)": 8 },
      add: [
        {
          after: "What did they do? Retell the picnic",
          slide: {
            kind: "fluency",
            title: "Picnic story, again and again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same take-away story three times, a little faster each time.",
            chunks: ["They had nine sandwiches.", "They ate four.", "Nine take away four is five.", "Now there are five left.", "Did they eat them all? No, they didn't."],
            recycle: ["There were ten stars.", "I gave two to a friend."],
            rounds: [
              { seconds: 60, say: "Tell the take-away story with counters: nine, then four go away." },
              { seconds: 45, say: "Same story, new numbers (ten and three). Faster!" },
              { seconds: 45, say: "New partner. Same story, your own numbers. Say it smoothly." },
            ],
            steps: [
              "Put out the counters. Tell the story: at first, what happened, how many are left.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Your partner puts the counters away as they listen. Do the counters match?",
              "Swap jobs and do it again.",
            ],
            prompts: ["(counters: 9 and 4)", "(counters: 10 and 3)", "(your own numbers)"],
            feedback: fixPast,
            teacherNote: "Task repeat: the same story with new numbers, so the language stays the same and only the content changes. Children say 'They had / They ate / Now there are' as one smooth chain. Listen for 'ated', 'There is five' and the missing final -s. The partner who moves the counters has a real listening job.",
            tiers: [
              { level: "Support", task: "Use numbers up to ten and the frames on the board.", frames: ["They had ___.", "They ate ___.", "Now there are ___ left."] },
              { level: "Core", task: "Use numbers up to twenty without the board." },
              { level: "Stretch", task: "Add a question: 'Did they eat them all?' 'No, they didn't. Five are left.'" },
            ],
          },
        },
        {
          after: "Solve the picnic problems",
          slide: {
            kind: "writing",
            title: "Grow the picnic sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the extra words in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "The baker made cakes. (add: ten)", answer: "The baker made ten cakes." },
              { q: "I went to the park. (add: yesterday)", answer: "Yesterday I went to the park." },
              { q: "She took a cookie. (add: big)", answer: "She took a big cookie." },
              { q: "They hid the ball. (add: under the table)", answer: "They hid the ball under the table." },
            ],
            frames: ["The ___ made ___ ___.", "Yesterday I ___."],
            checklist: ["The yesterday word is right: made, went, took, hid", "The number word comes before the thing: ten cakes", "A capital letter and a full stop"],
            sayIt: "Read your big sentences to your partner, then say them again without looking.",
            teacherNote: "Expanding a sentence is a calm way to practise yesterday words and word order together. If a child writes 'ten cake', tap the plural -s and let them fix it: Vietnamese nouns have no plural ending, so this slip is common.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write all four big sentences." },
              { level: "Stretch", task: "Write two big sentences of your own with 'and'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u08-l6": {
      objectives: ["I can say 'Did he take it? Yes, he did.' and 'He didn't take it.' fast."],
      trim: { "Remember it!": 4, "Muffin stall: eyes shut, eyes open": 8 },
      add: [
        {
          after: "Plain side, yesterday side: the jump",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Did and didn't",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["Did he take a muffin? Yes, he did.", "Did she sell a roll? No, she didn't.", "What did he eat? He ate a muffin.", "How many did she sell? She sold twelve.", "He didn't go to the market."],
            recycle: ["I saw a cat, but I didn't see a dog.", "Ten take away three is seven."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Left side asks, right side answers. Then swap." },
              { seconds: 45, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: fixPast,
            teacherNote: "A quick, high-energy recall of Units 7 and 8 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. This is the sprint that checks 'Did + plain verb': prompt with 'Did he ...?' and wait; do not give the verb.",
            tiers: [
              { level: "Support", task: "Use the frames on the board.", frames: ["Did he ___? Yes, he did.", "He didn't ___."] },
              { level: "Core", task: "Say the sentences without the board." },
              { level: "Stretch", task: "Answer with extra: 'Yes, he did. He took two.'" },
            ],
          },
        },
        {
          after: "@grammar",
          slide: {
            kind: "writing",
            title: "Listen, remember, write: the muffins",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Rule reminder: after Did or didn't, the verb is plain. Without them, use the yesterday word: made, sold, ate.",
              "Listen to the short text. Do not write yet.",
              "Listen again. Write the words you remember. Say the numbers to your partner.",
              "Write the text together. Check it with the teacher's text.",
            ],
            text: { title: "The muffin stall", text: "Yesterday the baker made twenty muffins. In the morning she sold twelve of them. Then she ate one, but she didn't sell the rest. Now she has seven muffins." },
            frames: ["Yesterday the ___ made ___.", "She sold ___ and ___.", "Now she has ___."],
            checklist: ["Yesterday words: made, sold, ate", "After didn't the verb is plain: didn't sell", "The numbers are right: twenty, twelve, seven"],
            sayIt: "Read your text to your partner, then tell the take-away story again without looking.",
            teacherNote: "Read at normal speed, twice, and keep the text hidden. The children rebuild it from memory, so they have to choose between 'sold' and 'sell' themselves, which is exactly the rule from the grammar slide. Say the final -d and -s clearly: 'sold', 'has'. Check: 20 - 12 = 8, and 8 - 1 = 7, so seven are left.",
            tiers: [
              { level: "Support", task: "Fill in the frames with the words you remember." },
              { level: "Core", task: "Write the whole text in four sentences." },
              { level: "Stretch", task: "Add a question and answer: 'Did she sell them all? No, she didn't.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Take-away at home",
        prompt: "Find some things at home. Say how many there were, what went away, and how many are left. Show it to the camera.",
        length: "45-60 seconds",
        steps: [
          "Choose some things at home: coins, beans, toys or pencils.",
          "Practise your take-away story three times: at first, what happened, how many are left.",
          "Record it once. Show the things as you talk.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say how many there were, what went away with a yesterday word, and how many are left, and keep talking without long stops.",
        words: ["took", "ate", "gave", "left", "take away", "didn't"],
        grammar: ["There were ___. I took / ate / gave ___.", "Now there are ___ left.", "I didn't ___ (plain verb) ___."],
        rubric: [
          { label: "The story", description: "Says how many at first, what went away, and how many are left.", weight: 3 },
          { label: "Yesterday words", description: "Uses took, ate or gave correctly, and the plain verb after didn't.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear numbers", description: "Says the numbers clearly: thirteen or thirty, with the right ending.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There were ___.", "I took ___.", "Now there are ___ left."], tips: ["Hold the things and move them away as you speak."] },
          { level: "Core", who: "Most children", frames: ["There were ___ ___ in the ___.", "I took / ate / gave ___.", "___ take away ___ is ___."], tips: ["Say the numbers slowly and clearly."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Did I take them all? No, I didn't.", "I didn't ___ because ___."], tips: ["Add a question and say what you didn't do."] },
        ],
      },
    },
  },
};
