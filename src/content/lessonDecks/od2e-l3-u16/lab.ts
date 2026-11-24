import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 16 "Gardens in
// Our Community" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 15's phrases mixed back in) and one
// writing routine (plan, write, check, then say it aloud). Every other lesson ends with a
// recorded talk for home that repeats the class routine. Time comes from games, warm-ups
// and repeats, never from the book pages, the grammar or the checks. All text is original.

const correct =
  "During a round, listen and keep the talk going. Note two or three grammar mistakes (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on; children who say the talk again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('I'm curious a...?'), or hold up a finger for the missing small word or -s. Typical slips in this unit: 'curious for / of', 'happy of', 'surprised on', a missing be ('She happy with the garden') and a missing final -s ('three bean'). For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

const correctGarden =
  "During a round, listen and keep the talk going. Note two or three mistakes (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on. For grammar, prompt the child to fix it: point to the frame, hold up a finger for the missing -s ('three bean...?'), or start the phrase and pause ('There is a garden... ?'). Typical slips here: a missing -s on beans, vines and teenagers, 'There have a garden' for 'There is a garden', a missing a / the, and 'in/on' mixed up. For a sound, say it right and let the child echo it. Say final -s clearly: sweet potatoes, vines, teenagers.";

const correctPlaces =
  "During a round, listen and keep the talk going. Note two or three mistakes (no names). Between rounds 1 and 2 stop for one minute, write them on the board and let the class fix them; then go on. For grammar, prompt the child to fix it: point to the frame and pause ('We keep the cans ... the shed?'), or hold up a finger for the missing word. Typical slips: 'on the garden' for 'in the garden', 'in the table' for 'on the table', a missing 'the' before a place, a missing -s ('plant are important') and 'because' left off a reason. For a sound, say it right and let the child echo it. Model every final -s clearly.";

const correctRetell =
  "During a round, listen and keep the talk going. Note two or three mistakes (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on. For grammar, prompt the child to fix it: point to the sequence word on the card, hold up a finger for the missing -ed ('She plant... ?'), or start the phrase and pause ('At the end, she feels ... ?'). Typical slips here: a missing -s on 'she feels' and 'something happens', a past verb without -ed or a missing be, and 'because' left off a reason. For a sound, say it right and let the child echo it. Say every final -s and -ed clearly yourself.";

const talkLast = "Grown-up: hold the phone and let your child speak; do not say the words for them.";

export const odL3U16Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u16-l1": {
      objectives: ["I can say sentences about gardens and gardeners smoothly, without long stops."],
      trim: { "Match-up memory": 5 },
      add: [
        {
          after: "Talk about your choices (SB 157 C)",
          slide: {
            kind: "fluency",
            title: "Garden sentence sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole garden sentence, fast and smooth, with no stops.",
            chunks: [
              "A gardener looks after the garden.",
              "Our community has a new garden.",
              "I put the beans in the vegetable box.",
              "In summer a garden has sweet potatoes and vines.",
              "A crowd came to see the flowers.",
            ],
            recycle: ["First, fill a small pot with soil.", "I need two bags of soil, please."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one child shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence, not just the word.",
              "Listen for the clap: it means swap or change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: gardener)", "(card: community garden)", "(card: beans)", "(card: sweet potato)", "(card: crowd)"],
            feedback: correctGarden,
            teacherNote: "The garden words are new, so the sentences are short and whole: the children say 'A gardener looks after the garden' as one piece, which fixes the word's job in their memory. Listen for the final -s in vines, beans and teenagers. Mix in the Unit 15 phrases every few turns so last unit's language stays fast.",
            tiers: [
              { level: "Support", task: "Point to the sentence on the board and say it with a friend.", frames: ["A gardener ___.", "Our community has ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second sentence with because: 'A gardener looks after the garden because plants need help.'", frames: ["___ because ___."] },
            ],
          },
        },
        {
          after: "Words in context (SB 157 E)",
          slide: {
            kind: "writing",
            title: "Join the garden sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Think: which joining word fits, 'and' or 'because'? Say your new sentence first, then write it.",
              "Check your sentence with the checklist. Then read it aloud to your partner.",
            ],
            items: [
              { q: "A gardener plants seeds. A gardener waters the plants. (and)", answer: "A gardener plants seeds and waters the plants." },
              { q: "The vines are green. The vines are long. (and)", answer: "The vines are green and long." },
              { q: "I like summer gardens. They have many vegetables. (because)", answer: "I like summer gardens because they have many vegetables." },
              { q: "We have a garden. It is behind our school. (use: behind our school)", answer: "We have a garden behind our school." },
            ],
            frames: ["A gardener ___ and ___.", "I like ___ because ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "Beans, vines, seeds, plants: the -s is there", "'and' or 'because' joins the two ideas"],
            sayIt: "Read your new sentence to your partner, then say it again without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not through rules. Do item 1 together on the board, crossing out the second 'A gardener'. Item 4 shows that combining can also mean moving words, not only adding 'and'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames and the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write one new sentence of your own with 'because' about a garden.", frames: ["I like ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u16-l2": {
      objectives: ["I can retell the story in three parts, smoother and faster each time."],
      trim: { "Home talk: a plant I know": 3, "Talk about it: agree or disagree": 5 },
      add: [
        {
          after: "Retell the plot",
          slide: {
            kind: "fluency",
            title: "Garden story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same plot three times. Each time is shorter, smoother and faster. In each round, both partners tell it.",
            chunks: [
              "At the beginning, we meet Marisol and her garden.",
              "After that, something important happens.",
              "At the end, Marisol feels happy because of the garden.",
              "The story made me feel happy because gardens help people.",
            ],
            recycle: ["First, a seed goes into the soil.", "Plants need water and sun."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the plot, then Partner B. Use your beginning, middle and end cards. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at your plot chart. Say one sentence for the beginning, one for the middle and one for the end.",
              "In each round, Partner A tells the plot, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board and let the class fix them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener has a job: tick each part you hear (beginning, middle, end) and ask one question at the end.",
            ],
            prompts: ["(card: beginning)", "(card: middle)", "(card: end)"],
            feedback: correctRetell,
            teacherNote: "The same plot three times on purpose: the second and third tellings free the children to speak faster because they are no longer searching for ideas. Check the sentences against the story in the book and change the chunks if your class tells it differently. Listen for sequence words (At the beginning, After that, At the end), 'because' and the final -ed in past-tense verbs.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["At the beginning, ___.", "After that, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'The story made me feel hopeful because ...'", frames: ["The story made me feel ___ because ___."] },
            ],
          },
        },
        {
          after: "Talk about it: agree or disagree",
          slide: {
            kind: "writing",
            title: "A day in the garden: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the first sentence (when and where), the middle sentences with First, Then and After that, and the ending.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a real or an imagined day in a garden.",
              "Write: turn your notes into one paragraph. Use First, Then and At the end, and put a feeling in with its small word.",
              "Check: tick the checklist. Swap with a partner: they underline the sequence words and tell you one thing they liked.",
              "Teacher: while they write, look only at the -ed endings and the small word after the feeling (curious about, surprised at, happy with). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A Saturday at the community garden",
              text: "Last Saturday, my family visited the community garden near our home. First, we planted beans in a long box, and I was curious about how fast they would grow. Then my brother watered the plants with a green can. After that, we picked three tomatoes. I was surprised at how sweet they were! At the end, I felt happy with our work, so I want to go again.",
            },
            organiser: [
              { label: "Opening: when and where", prompt: "When did you go to a garden? Who was with you?" },
              { label: "First, Then, After that", prompt: "What did you do? Write three action words." },
              { label: "A feeling and its small word", prompt: "Were you curious about, surprised at or happy with something?" },
              { label: "Ending: At the end, ...", prompt: "How did the day end? How did you feel?" },
            ],
            frames: ["Last Saturday, I went to ___ with ___.","First, we ___. Then ___.","I was curious about ___. I was surprised at ___.","At the end, I felt happy with ___."],
            checklist: [
              "My first sentence says when and where",
              "Sequence words: First, Then, After that, At the end",
              "Past endings are there: visited, planted, watered. The small word fits: curious about, surprised at, happy with",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It grows the story retell from this lesson into a written recount, and it takes the place of the dictogloss here. Mark only two targets, the -ed endings and the small word after the feeling, with a dot on the line; the child finds and fixes the mistake. The paragraph is a good script for the lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Last Saturday, I went to ___ with ___.","At the end, I felt happy with ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with because or so that tells why you felt that way." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tell the garden story",
        prompt: "Tell the story of the Garden of Happiness in three parts: the beginning, what happens next and the end. Say how the story made you feel and why.",
        length: "60-120 seconds",
        steps: [
          "Look at your plot chart from class.",
          "Tell the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going, even if you make a mistake.",
          talkLast,
        ],
        maxSeconds: 180,
        kidSummary: "Tell the beginning, the middle and the end, say how it made you feel, and keep talking without long stops.",
        words: ["garden", "gardener", "community", "beginning", "end", "plot"],
        grammar: ["At the beginning, ... After that, ... At the end, ...", "The story made me feel ___ because ..."],
        rubric: [
          { label: "Three parts", description: "Tells the beginning, the middle and the end, in order.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: garden, gardener, community, crowd.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, even after a mistake.", weight: 3 },
          { label: "Feeling and reason", description: "Says how the story made them feel and gives a reason with because.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["At the beginning, ___.", "After that, ___.", "At the end, ___."], tips: ["Point to your plot chart as you speak."] },
          { level: "Core", who: "Most children", frames: ["At the beginning, Marisol ___.", "After that, ___ happens, so ___.", "At the end, she feels ___ because ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The story made me feel ___ because ___.", "I agree with the story that gardens can ___."], tips: ["Give your opinion about the story and one reason."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u16-l3": {
      objectives: ["I can say 'I'm curious about ...', 'I'm happy with ...' and 'I was surprised at ...' fast and right."],
      trim: { "Mime the feeling": 3, "Class survey": 4, "What does the story teach us?": 3 },
      add: [
        {
          after: "What are you curious about? (SB 161 G)",
          slide: {
            kind: "fluency",
            title: "Question chain: curious, happy, surprised",
            routine: "question chain",
            mode: "whole",
            minutes: 5,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What are you curious about?",
              "I'm curious about how seeds grow.",
              "Are you happy with your garden?",
              "Yes, I am. I'm happy with my tomato plants.",
              "No, I'm not. I'm not happy with the empty pots.",
              "Were you surprised at the size?",
            ],
            recycle: ["I need two bags of soil, please.", "First, fill a small pot with soil."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a picture card (a plant, a pumpkin, an empty pot)." },
              { seconds: 45, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left a question about their card: 'Are you happy with your ___?'",
              "They answer with the feeling and the small word, then turn and ask the next friend.",
              "A 'No' answer needs a reason: 'No, I'm not. I'm not happy with ___ because ...'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What are you curious about?", "Are you happy with ___?", "Were you surprised at ___?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is how the three fixed pairs (curious + about, happy + with, surprised + at) become automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'I curious about' (missing be) and prompt with a finger for the missing word, and for 'happy of': point to the pair on the board and pause.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["I'm curious about ___.", "I'm happy with ___.", "I was surprised at ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason every time: 'I'm curious about bees because they help flowers grow.'", frames: ["I'm ___ about / with / at ___ because ___."] },
            ],
          },
        },
        {
          after: "Circle the right small word (SB 161 F)",
          slide: {
            kind: "writing",
            title: "My small garden: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the opening sentence, the feelings with their small words, and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a real or an imagined garden, big or small.",
              "Write: turn your notes into one paragraph. Use one sentence with curious about, one with happy with and one with surprised at.",
              "Check: tick the checklist. Swap with a partner: they circle each small word and tell you if it fits.",
              "Teacher: while they write, look only at the small word after the feeling (about, with, at) and the verb be. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The pots on our balcony",
              text: "We have a small garden in pots on our balcony. I am happy with my tomato plant because it has five red tomatoes. My sister is curious about the worms in the soil, so she looks at them every day. Last week, we were surprised at a big yellow flower on the bean plant. Gardens are not only for big yards. A small balcony can be a happy place, too!",
            },
            organiser: [
              { label: "Opening: my garden", prompt: "Where is your garden? What is in it?" },
              { label: "I'm happy with ...", prompt: "What are you happy with? Give a reason." },
              { label: "I'm curious about ...", prompt: "What are you or your family curious about?" },
              { label: "I was surprised at ...", prompt: "What surprised you? Finish with one closing sentence." },
            ],
            frames: ["We have a small garden in ___.","I am happy with ___ because ___.","___ is curious about ___.","I was surprised at ___."],
            checklist: [
              "My first sentence says where the garden is",
              "The small word fits the feeling: curious about, happy with, surprised at",
              "The verb be is there: I am, she is, we were",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It grows the expanded feeling sentences from earlier in the unit into a description of a whole garden. Mark only two targets, the small word after the feeling and the verb be, with a dot on the line; the child finds and fixes the mistake. Keep the three pairs on the board while they write.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["We have a small garden in ___.","I am happy with ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with so that tells what you or your family did because of it." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u16-l4": {
      objectives: ["I can give a reason and say where, in a talk of two minutes, without long stops."],
      drop: ["Synonym snap"],
      trim: { "Things we get from plants": 5, "Listen for details (SB 162 B)": 4, "Where does it happen? (SB 163 E)": 7, "Reasons ladder: Why do we need plants?": 7 },
      add: [
        {
          after: "Three important plants (SB 163 C)",
          slide: {
            kind: "fluency",
            title: "Plants matter: 4-3-2 talk",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three friends. Each talk is shorter and smoother. In each round, both partners give the talk.",
            chunks: [
              "Rice is important to me because we eat it every day.",
              "My family uses herbs to cook dinner.",
              "We keep the watering cans in the shed.",
              "Plants give us food, shade and fresh air.",
              "I'm curious about how plants help us.",
            ],
            recycle: ["I need two bags of soil, please.", "First, push a seed into the soil."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the talk about one important plant, then Partner B. The listener counts the reasons on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other: line A and line B. In each round, Partner A (line A) talks, then Partner B (line B) talks. Your talk: what the plant is, where it grows, and why it is important.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one place to the left: a new partner. Then Partner A talks first again.",
              "Listener job: count the reasons on your fingers and ask one question at the end.",
            ],
            feedback: correctPlaces,
            teacherNote: "Same talk, less time, new listener: this is the 4/3/2 activity scaled for eight to ten year olds. The new partner keeps the repetition real. Do not teach new language between rounds; the gain comes from saying the same thing more smoothly. The one-minute fix after round 1 is what makes the second telling more accurate, not only faster. Listen for 'because', in/on, and final -s.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["___ is important to me because ___.", "It grows in the ___.", "My family uses it to ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a second reason and a place: 'Another reason is that ... We keep it on the shelf.'", frames: ["Another reason is that ___."] },
            ],
          },
        },
        {
          after: "Where does it happen? (SB 163 E)",
          slide: {
            kind: "writing",
            title: "Why plants matter: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the opinion sentence, the three reasons and the closing sentence. Underline the place words (in, on).",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a plant you know and where it is.",
              "Write: turn your notes into one paragraph. Use First, Second, Third and That is why, and say where each plant is.",
              "Check: tick the checklist. Swap with a partner: they underline one reason and one place word and tell you one thing they liked.",
              "Teacher: while they write, look only at the place words (in, on) and the plural -s. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Why plants matter",
              text: "Plants are important to me for three reasons. First, they give us food. We grow beans in a box on the balcony, and my mother keeps herbs in a pot on the shelf. Second, they give us shade. In summer, we sit under the big tree in the schoolyard. Third, they make the air fresh. That is why I think we need plants, and I am happy with our class garden.",
            },
            organiser: [
              { label: "Opinion sentence", prompt: "Why are plants important to you? Say 'for three reasons'." },
              { label: "Reason 1: First, ...", prompt: "What do plants give us? Where do you see it: in or on what?" },
              { label: "Reason 2 and 3: Second, Third", prompt: "Give two more reasons. Where does each plant grow or live?" },
              { label: "Closing: That is why ...", prompt: "End with 'That is why I think ...'" },
            ],
            frames: ["Plants are important to me for three reasons.","First, they give us ___. We keep ___ in / on the ___.","Second, ___. Third, ___.","That is why I think ___."],
            checklist: [
              "My first sentence says my opinion",
              "Reasons with First, Second and Third",
              "The place word fits: in the garden, in a pot, on the shelf. The plural -s is there: plants, herbs",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It turns the reasons ladder and the in / on practice of this lesson into one opinion paragraph, and it replaces the shorter pot-garden text. Mark only two targets, in / on and the plural -s, with a dot on the line; the child finds and fixes the mistake. The paragraph is a good script for the lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Plants are important to me for three reasons.","That is why I think ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with Another reason is that, and one more place word." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Why plants matter to me",
        prompt: "Choose one plant that is important to you. Tell us what it is, where it grows or where it lives at home, and two reasons why it is important.",
        length: "60-120 seconds",
        steps: [
          "Choose your plant and draw it or find it at home.",
          "Give your talk three times, each time a little faster, like our 4-3-2 in class.",
          "Record it once. Show your plant to the camera.",
          talkLast,
        ],
        maxSeconds: 180,
        kidSummary: "Say what your plant is, where it is, and give two reasons. Keep talking without long stops.",
        words: ["plant", "garden", "shelf", "shed", "important", "because"],
        grammar: ["___ is important to me because ...", "in the ___ / on the ___", "My family uses it to ..."],
        rubric: [
          { label: "Reasons", description: "Gives at least two reasons with because or another reason is that.", weight: 3 },
          { label: "Where", description: "Says where the plant is or grows, with the right place word: in or on.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time.", weight: 3 },
          { label: "Clear endings", description: "The final -s can be heard on plants, beans and other plural words.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My plant is ___.", "It is in the ___.", "It is important to me because ___."], tips: ["Hold your plant or your drawing."] },
          { level: "Core", who: "Most children", frames: ["___ is important to me because ___.", "Another reason is that ___.", "We keep it in / on the ___."], tips: ["Say two reasons and one place."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The most important reason is ___ because ___.", "I'm curious about how ___."], tips: ["Rank your reasons and add something you are curious about."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u16-l5": {
      objectives: ["I can tell my partner about my plant plate three times, clearer and faster each time."],
      trim: {
        "60-second recall": 3,
        "Big Question video and chart": 6,
        "Test our big ideas": 3,
        "Two circles: talk about your plate": 10,
        "How to write steps in a process": 4,
        "Draw your plant plate (SB 165 C)": 13,
      },
      add: [
        {
          after: "Two circles: talk about your plate",
          slide: {
            kind: "fluency",
            title: "Plant plate: tell it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same plate talk to three partners. It gets smoother every time. In each round, both partners give the talk.",
            chunks: [
              "This is a sweet potato. It comes from under the ground.",
              "I eat it because it is sweet and healthy.",
              "I'm happy with my plate because it has many colors.",
              "I was surprised at how many plants we eat.",
              "Which one are you curious about?",
            ],
            recycle: ["First, fill a small pot with soil.", "I need two bags of soil, please."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the plate talk, then Partner B. The listener points to each food as you say it. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A tells the same talk, smoother, then Partner B. The listener counts how many reasons you give. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B: the same talk, fast and clear! The listener asks one question." },
            ],
            steps: [
              "Hold your plant plate. Say what it is, where it comes from and why you eat it. In each round, Partner A talks, then Partner B talks.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener has a job: point, count or ask a question.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task again with a new listener and a little less time is a well-supported way to build speaking fluency, because the first telling sorts out the ideas and the later tellings can focus on smoothness. The one-minute fix after round 1 improves accuracy as well. Say the final -s and -ed of 'comes', 'eat' and 'was surprised' clearly.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["This is ___.", "It comes from ___.", "I eat it because ___."] },
              { level: "Core", task: "Say four or five sentences without looking." },
              { level: "Stretch", task: "Add a feeling: 'I was surprised at how many plants we eat, so I ...'", frames: ["I was surprised at ___, so ___."] },
            ],
          },
        },
        {
          after: "Plan and write your steps (Workbook)",
          slide: {
            kind: "writing",
            title: "Fix the steps",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find the mistake: a comma, a verb ending, a small word or a joining word.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "First put soil in the pot.", answer: "First, put soil in the pot." },
              { q: "Then, we puts the pot on the shelf.", answer: "Then, we put the pot on the shelf." },
              { q: "We are happy of our garden.", answer: "We are happy with our garden." },
              { q: "Plants are important. Because they give us food.", answer: "Plants are important because they give us food." },
            ],
            checklist: ["A comma after First, Then, Finally", "The verb ending matches who (we put, she puts)", "Small words fit: happy with, curious about, surprised at"],
            sayIt: "Read each fixed sentence aloud with your partner, then say the steps again without looking.",
            teacherNote: "Written correction works best with two or three error types at a time, so this set has just: the comma after sequence words, the verb ending after we / she, and the small word after a feeling. Fix the first one together on the board. 'we puts' is a common over-correction of final -s.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the checklist." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one new step with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u16-l6": {
      objectives: ["I can say what I am curious about, happy with and surprised at, with a reason, without stopping."],
      trim: { "Remember it!": 5, "Pair hunt relay": 7 },
      add: [
        {
          after: "Garden club: ask and fill in",
          slide: {
            kind: "fluency",
            title: "Champion sprint: feelings and reasons",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: feeling, small word, reason.",
            chunks: [
              "Rosa is curious about the seeds.",
              "Are you happy with your garden?",
              "I'm curious about bees because they help flowers.",
              "I was surprised at the giant pumpkin, so I took a photo.",
              "We are happy with our garden because it gives us food.",
            ],
            recycle: ["We keep the watering cans in the shed.", "First, push a seed into the soil."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card, the class says the whole sentence." },
              { seconds: 60, say: "Row A asks, row B answers. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of the whole unit: new pairs (curious about, happy with, surprised at) mixed with Unit 15 and earlier phrases. Mixing old and new is spaced retrieval and keeps last unit's language from fading. Listen for 'because' and 'so' placed correctly, and for final -s and -ed.",
            tiers: [
              { level: "Support", task: "Say the sentence with the pairs on the board." },
              { level: "Core", task: "Say it without looking." },
              { level: "Stretch", task: "Change the sentence: use a new thing and a new reason, 'I'm curious about worms because they help the soil.'", frames: ["I'm ___ about / with / at ___ because ___."] },
            ],
          },
        },
        {
          after: "Write it: a paragraph about my garden",
          slide: {
            kind: "writing",
            title: "Join with because and so",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences. Which is the reason and which is the result?",
              "Join them with 'because' or ', so'. Say your new sentence first, then write it.",
              "Check the pairs and the comma. Read it aloud.",
            ],
            items: [
              { q: "I'm curious about bees. They help flowers. (because)", answer: "I'm curious about bees because they help flowers." },
              { q: "Leo was surprised at the pumpkin. He took a photo. (so)", answer: "Leo was surprised at the pumpkin, so he took a photo." },
              { q: "We are happy with our garden. It gives us food. (because)", answer: "We are happy with our garden because it gives us food." },
              { q: "Ben is not happy with the empty pots. He plants more seeds. (so)", answer: "Ben is not happy with the empty pots, so he plants more seeds." },
            ],
            frames: ["I'm curious about ___ because ___.", "I was surprised at ___, so ___."],
            checklist: ["The right small word: about, with, at", "because (no comma) or , so (with a comma)", "No full stop between the two ideas"],
            sayIt: "Say each new sentence to your partner without looking, then change the sentence to be about you.",
            teacherNote: "Children often write the reason as its own sentence ('...the pumpkin. Because it was big.'). Joining makes one sentence with the right word. Do item 1 together, crossing out the full stop. Use the two sentence shapes on the board: reason after because, result after so.",
            tiers: [
              { level: "Support", task: "Do items 1 and 3 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two new sentences about your own garden, one with because and one with so." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My garden champion talk",
        prompt: "Show a plant, a garden or a drawing of one. Tell us what you are curious about, what you are happy with and what surprised you. Give a reason each time.",
        length: "60-120 seconds",
        steps: [
          "Choose your plant or garden, or draw one.",
          "Say your talk three times, each time a little faster, like our champion rounds in class.",
          "Record it once. Say all three feelings with a reason.",
          talkLast,
        ],
        maxSeconds: 180,
        kidSummary: "Say what you are curious about, happy with and surprised at, with a reason each time. Keep going without long stops.",
        words: ["curious", "happy", "surprised", "garden", "plants", "because"],
        grammar: ["I'm curious about ___ because ...", "I'm happy with ___ because ..., so ...", "I was surprised at ___, so ..."],
        rubric: [
          { label: "Three feelings", description: "Uses curious about, happy with and surprised at, each with the right small word.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or a result with so for each feeling.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time.", weight: 3 },
          { label: "Clear sounds", description: "Final -s and -ed can be heard, and the verb be is not missed out.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I'm curious about ___.", "I'm happy with ___.", "I was surprised at ___."], tips: ["Say each sentence with the pairs on a card in front of you."] },
          { level: "Core", who: "Most children", frames: ["I'm curious about ___ because ___.", "I'm happy with ___ because ___.", "I was surprised at ___, so ___."], tips: ["Give a reason every time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In my opinion, plants are important because ___.", "I would choose ___ because ___, so ___."], tips: ["Add an opinion about plants and a choice with reasons."] },
        ],
      },
    },
  },
};
