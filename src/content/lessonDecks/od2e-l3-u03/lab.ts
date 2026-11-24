import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 3 "Moving to a New
// Place" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (class Sky 1).
// Every lesson gets one fluency routine (the unit's language said again and again as whole
// sentences, with a one-minute correction between the first and second telling) and one
// writing routine (plan or notice, write, check, then say it aloud). The unit uses all five
// fluency routines and all five writing routines. Two lessons end with a recorded talk for
// home that repeats the class routine days later (Lesson 4 already has its own vlog). Time
// comes from warm-ups, games and repeats, never from the book pages, grammar or checks.
// All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, stop for one minute: write them on the board and let the class fix them. Children then say the same thing again with the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('Last year I c...?'), point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice ('She can swims?'). For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: Vietnamese speakers often drop them, and children copy what they hear.";

const correctCanCould =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). The common ones for this unit: 'Yesterday I can ride', 'She can swims', 'I didn't could', 'He can to dance', and a dropped -s or -ed. Between round 1 and round 2, stop for one minute and fix two of them on the board together. Prompt, do not tell: point to the time word and ask 'Now or before?'; hold up one finger for can (now) or two for could (before); repeat the error with a rising voice ('didn't could?'); start the phrase and pause ('Last year she c...?'). The verb after can and could never changes: tap the table once and say it plain, 'can swim'. For a sound, say it right and let the child echo it. Say every final -s and -ed clearly yourself.";

export const odL3U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u03-l1": {
      objectives: ["I can talk about why a family moves and how they feel, in whole sentences, without long stops."],
      drop: ["Moving-day relay"],
      trim: {
        "Pack the suitcase": 3,
        "Moving words I already know (SB 29 C)": 3,
        "Indoors, outdoors or both? (SB 28 B)": 6,
      },
      add: [
        {
          after: "Indoors, outdoors or both? (SB 28 B)",
          slide: {
            kind: "fluency",
            title: "Moving sprint: say the whole idea",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about a family that is moving, fast and smooth, with no stops.",
            chunks: [
              "The family is packing the boxes.",
              "Maybe they are moving because Dad has a new job.",
              "They might feel nervous because everything is new.",
              "She is meeting the new neighbors and shopping for a warm coat.",
              "People move to new places because they want a better life.",
            ],
            recycle: ["Skipping is fun.", "We enjoy dancing together.", "What do you do for fun?"],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture of a moving family and the class says the matching sentence." },
              { seconds: 60, say: "Pairs: one child points to a picture, the other says the whole sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many whole sentences can you say in one minute? Count them on your fingers." },
            ],
            steps: [
              "Look at the picture. Listen to the teacher say the sentence, then say it back as one smooth piece.",
              "Say the sentence with the chorus, then with your partner, then alone.",
              "Mix in last unit's sentences when the teacher holds up a game card.",
              "Teacher: after round 2, stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them. Then go on to round 3.",
            ],
            prompts: ["(picture: boxes)", "(picture: a father with a job letter)", "(picture: a nervous girl)", "(picture: a girl meeting the new neighbors)", "(picture: a big city street)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'Maybe they are moving because Dad has a new job' should come out as one smooth piece. This lesson introduces no new grammar, so the sprint is where the Big Question language (maybe, might, because) becomes fast. Listen for a dropped -s in 'neighbors' and 'boxes', and for 'Dad have' instead of 'Dad has'. Say the final sounds clearly yourself.",
            tiers: [
              { level: "Support", task: "Say the sentences with the frames on the board, together with a friend.", frames: ["The family is ___.", "They are moving because ___."] },
              { level: "Core", task: "Say the sentences alone, without looking at the board." },
              { level: "Stretch", task: "Say two sentences in one breath: 'They are moving because Dad has a new job, so they are packing the boxes.'", frames: ["They are moving because ___, so ___."] },
            ],
          },
        },
        {
          after: "Letters to a friend (SB 29 F)",
          slide: {
            kind: "writing",
            title: "Our moving day: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three steps and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Second and Third, and say how the child felt with because.",
              "Check: tick the checklist. Swap with a partner: they underline your First, Second and Third and tell you one thing they liked.",
              "Teacher: while they write, look only at the order words (First, Second, Third) and the -s on plurals (boxes, neighbors). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The big truck",
              text: "Last summer, a family moved to a new town, and it was a very busy day. First, they packed all the boxes and put them in a big truck. Second, they said goodbye to their neighbors because they liked them so much. Third, they drove for two hours and looked at their new house. At the end of the day, they ate noodles on the floor and laughed together, but the child still felt nervous because everything was new.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "When did a family move, and what was the day like? (busy, long, sad, exciting)" },
              { label: "First, ...", prompt: "What did the family do first? (packing the boxes?)" },
              { label: "Second, ...", prompt: "What happened next? Who did they meet or leave? Say why with because." },
              { label: "Third, ...", prompt: "What did they do or see third?" },
              { label: "Closing", prompt: "How did the child feel at the end? Why?" },
            ],
            frames: ["Last ___, a family moved to ___, and it was a ___ day.", "First, they ___.", "Second, ___ because ___.", "Third, ___.", "At the end, the child felt ___ because ___."],
            checklist: [
              "My first sentence says the move and what the day was like",
              "First, Second and Third are at the start of the steps",
              "Because tells the reason for a feeling or an action",
              "Plurals have the -s: boxes, neighbors, friends",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The paragraph uses the sequence words from SB 29 D, so children practice them in a whole text. Mark only two targets (the order words and the -s on plurals) with a dot on the line; the child finds and fixes the mistake. It is about an invented family, so the children write about a family they imagine.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["Last ___, a family moved to ___, and it was a ___ day.", "First, they ___.", "At the end, the child felt ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences." },
              { level: "Stretch", task: "Add a sentence with maybe or might: 'Maybe they moved because Dad has a new job.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u03-l2": {
      objectives: ["I can retell the story of the letters in order, three times, a little faster each time."],
      drop: ["Letter or message?"],
      trim: {
        "Two very different places": 3,
        "The feelings line": 5,
      },
      add: [
        {
          after: "Retell it with closed books",
          slide: {
            kind: "fluency",
            title: "Letters retell: shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the story of the letters in three rounds. In each round you tell it, then your partner tells it. Each round is shorter, smoother and faster.",
            chunks: [
              "First, she moved to a new town and she felt shy.",
              "Next, she wrote to her friend because she missed her.",
              "After a few months, she had new friends at school.",
              "In the last letter, she feels happy because she has a place of her own.",
            ],
            recycle: ["Swimming is fun.", "I enjoy reading stories.", "Where do you like to play?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole story with the four key-word cards (first, next, after a few months, last letter). Then Partner B tells it. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, with only two key-word cards. Then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast and smooth, with no cards. Then Partner B. The listener counts the time words on their fingers." },
            ],
            steps: [
              "Look at the key-word cards on the board: First / Next / After a few months / In the last letter.",
              "In every round, both partners talk: Partner A tells the story, then Partner B. The listener has a job: count the time words and give one thumb up at the end.",
              "Teacher: after round 1 (both partners have talked), stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them. Then go on to round 2.",
              "When the bell rings after each round, find a new partner.",
            ],
            prompts: ["(card: First)", "(card: Next)", "(card: After a few months)", "(card: In the last letter)"],
            feedback: correct,
            teacherNote: "This is a retell with the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. A fix between the first and second telling is what makes accuracy improve too; without it, fluency grows but the mistakes stay. Listen for a dropped -ed ('moved', 'missed'), 'she feel' for 'she feels', and the missing 'because' part.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["First, she ___.", "Next, ___.", "In the last letter, she feels ___ because ___."] },
              { level: "Core", task: "Tell all four parts with the time words and no frames." },
              { level: "Stretch", task: "Add why the feelings changed: 'At first she felt shy, but after a few months she felt happy because she had friends.'" },
            ],
          },
        },
        {
          after: "The feelings line",
          slide: {
            kind: "writing",
            title: "My first day somewhere new: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three time words and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a first day at school, a camp or a club.",
              "Write: turn your notes into one paragraph. Use At first, Then and After a few days, and say how you felt with because.",
              "Check: tick the checklist. Swap with a partner: they underline one -ed word and one time word and tell you one thing they liked.",
              "Teacher: while they write, look only at the -ed past endings and the time words. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A new school",
              text: "When I started at a new school, I felt shy on the first day. At first, I sat alone at lunch because I did not know anyone. Then a girl asked me to play with her, and I said yes. After a few days, I had two new friends and we laughed a lot. In the end, I felt happy because the school was not scary any more. Now I wave to my friends every morning.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Where did you go, and how did you feel on the first day?" },
              { label: "At first, ...", prompt: "What was hard at the start? Why? (because)" },
              { label: "Then / After a few days, ...", prompt: "What changed? Who helped you? (an -ed word)" },
              { label: "Closing", prompt: "How do you feel now, and why?" },
            ],
            frames: ["When I started ___, I felt ___ on the first day.", "At first, I ___ because ___.", "Then ___ asked me to ___.", "After a few days, I ___.", "In the end, I felt ___ because ___."],
            checklist: [
              "My first sentence says where I went and how I felt",
              "Time words: At first, Then, After a few days",
              "Past verbs have -ed: asked, laughed, started; the past of have is had",
              "Because tells the reason for a feeling",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The model uses the language of the letters story (time words, -ed, feelings with because) but is the child's own experience, not a reply letter, so it does not repeat the Write back activity. Mark only two targets (-ed endings and the time words) with a dot on the line; the child finds and fixes the mistake. The paragraph can also be the script for this lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["When I started ___, I felt ___ on the first day.", "After a few days, I ___.", "In the end, I felt ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences." },
              { level: "Stretch", task: "Add a sentence that shows how your feeling changed: 'At first I felt shy, but after a few days I felt happy.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A letter to a friend, spoken",
        prompt: "Pretend you moved to a new town. Say a letter to a friend far away: first, next, after a few months, and how you feel now and why.",
        length: "60-120 seconds",
        steps: [
          "Look at your retell cards from class: First / Next / After a few months / In the last letter.",
          "Say your letter three times to a grown-up or a toy. Each time a little faster and smoother, like in class.",
          "Think about how your feelings change in the letter, and why.",
          "Record it once. Look at the camera and keep talking.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your letter in order with time words, say how you feel and why, and keep going without long stops.",
        words: ["moving", "neighbors", "classmate", "shy", "happy", "letter"],
        grammar: ["First, next, after a few months", "I feel ___ because ___", "Past tense with -ed"],
        rubric: [
          { label: "In order", description: "Tells the events in order with time words: first, next, after a few months.", weight: 3 },
          { label: "Feelings and reasons", description: "Says how he or she feels and why, with because.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -ed and -s endings can be heard: moved, missed, neighbors.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, I moved to ___.", "Next, I met ___.", "Now I feel ___ because ___."], tips: ["Point to your retell cards as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, I moved to ___ and I felt ___ because ___.", "After a few months, I ___.", "In my last letter, I feel ___ because ___."], tips: ["Use a time word at the start of every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["At first I felt ___, but after a few months I felt ___ because ___.", "I hope we can ___ together."], tips: ["Say how your feelings changed, and end with a hope for your friend."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u03-l3": {
      objectives: ["I can say what I could and couldn't do before, and what I can do now, fast and without stopping."],
      drop: ["Find someone who ..."],
      trim: {
        "Baby, now, baby, now": 3,
      },
      add: [
        {
          after: "My then-and-now chart (SB 33 G)",
          slide: {
            kind: "fluency",
            title: "Then-and-now talk: 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same then-and-now talk to three friends. In each round both partners talk, and each talk is shorter and smoother (75, 60, 45 seconds).",
            chunks: [
              "When I was little, I couldn't ride a bike, but now I can.",
              "Last year I couldn't read long stories, but now I can.",
              "Last year my sister couldn't swim, but now she can swim very well.",
              "My grandfather could run very fast when he was young.",
            ],
            recycle: ["Swimming is fun.", "I enjoy dancing.", "What do you do for fun?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the then-and-now talk, then Partner B. The listener counts how many times you say can and could on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A gives the talk fast and smooth, then Partner B. The listener asks one follow-up question at the end: 'How did you learn it?'" },
            ],
            steps: [
              "Stand in two lines facing each other. In each round line A talks first, then line B.",
              "Use your then-and-now chart from SB 33 G: two things you couldn't do, two things you can do.",
              "Teacher: after round 1 (both lines have talked), stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them. Then go on to round 2.",
              "When the bell rings after each round, line B moves one step to the left: a new partner.",
            ],
            feedback: correctCanCould,
            teacherNote: "Same talk, less time, new listener: Nation's 4/3/2 made for eight- to ten-year-olds. The repeat makes can, can't, could and couldn't automatic. The one-minute fix in the middle is what also makes the grammar more accurate. Do not add new language between rounds. Listen for 'Last year I can', 'I didn't could' and 'she can swims'. Always have the child say the plain verb after can and could.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and your chart.", frames: ["I couldn't ___, but now I can.", "When I was little, I could ___."] },
              { level: "Core", task: "Say four or five sentences about yourself without the board." },
              { level: "Stretch", task: "Add a because part and a second person: 'I can swim now because I practiced, but my cousin couldn't swim last year.'", frames: ["I can ___ now because ___.", "My ___ couldn't ___, but now ___."] },
            ],
          },
        },
        {
          after: "Fix the sentence",
          slide: {
            kind: "writing",
            title: "Then and now: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the then part, the now part and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of a little brother or sister, a cousin or yourself.",
              "Write: turn your notes into one paragraph. Use couldn't and could for then, and can and can't for now.",
              "Check: tick the checklist. Swap with a partner: they underline one could or couldn't and one can or can't and tell you one thing they liked.",
              "Teacher: while they write, look only at can and could (now or before?) and the plain verb after them. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My little cousin",
              text: "My little cousin is very different now. When he was a baby, he couldn't walk or talk, but he could smile at everyone. Now he can run very fast and he can say a lot of words. He can't ride a bike yet, but he is learning with my uncle. Last year he couldn't count to ten. Now he can count to twenty, and he is very proud of himself!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who is your paragraph about? How are they different now?" },
              { label: "Then: could / couldn't", prompt: "What could or couldn't they do before?" },
              { label: "Now: can / can't", prompt: "What can or can't they do now?" },
              { label: "Closing", prompt: "How do they feel, or how do you feel about it?" },
            ],
            frames: ["My ___ is very different now.", "When ___ was little, ___ couldn't ___, but ___ could ___.", "Now ___ can ___.", "___ can't ___ yet, but ___.", "___ is very proud of ___."],
            checklist: [
              "My first sentence says who and how they are different now",
              "Before is could or couldn't; now is can or can't",
              "The verb after can or could is plain: can run, not can runs",
              "A comma comes before but",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This puts the can and could grammar into a whole text, after the then-and-now chart. Mark only two targets (can or could for the right time, and the plain verb after it) with a dot on the line; the child finds and fixes the mistake. The paragraph can be the script for the 4-3-2 talk in this lesson.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["My ___ is very different now.", "When ___ was little, ___ couldn't ___.", "Now ___ can ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences." },
              { level: "Stretch", task: "Add a sentence with because: 'Now he can ride a bike because he practiced every day.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u03-l4": {
      objectives: ["I can ask for help politely and say why people move to a town, with and without notes."],
      trim: {
        "Un- mime and guess (SB 35 D)": 6,
        "Big Question Review (SB 35)": 6,
        "Home talk: then and now": 5,
        "Oral rehearsal: why people move to our town": 6,
        "Plan and try out your welcome talk": 8,
      },
      add: [
        {
          after: "Asking for help (SB 34 C)",
          slide: {
            kind: "fluency",
            title: "Help chain: could you help me?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask for help, answer and pass it on. Keep the chain going, polite and smooth, with no stops!",
            chunks: [
              "Excuse me, could you help me, please?",
              "Of course. What do you need?",
              "Could you show me how to find the library?",
              "Sure, no problem. First you go straight, then you turn left.",
              "Thank you so much! You're welcome.",
            ],
            recycle: ["I couldn't ___, but now I can.", "People move to new places because ___."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a help card (a place or a thing to find)." },
              { seconds: 60, say: "Swap cards. Go faster! Pass the question on right away." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit or stand in a circle. Hold your help card so only you can see it.",
              "Ask the friend on your left: 'Excuse me, could you help me, please?'",
              "They answer: 'Of course. What do you need?' You say what you need, they help, and then they turn and ask the next friend.",
              "The listener across the circle has a job: say 'Thank you' or 'You're welcome' at the right time and nod if the question was polite.",
              "Teacher: after the first round, stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them. Then go on to round 2.",
            ],
            prompts: ["(card: the library)", "(card: the market)", "(card: the bus stop)", "(card: how to open the door)", "(card: how to use the bus card)"],
            feedback: correctCanCould,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes the polite request automatic. Time the whole circle and tell the children; they love beating their own time. Listen for 'Could you helping me', 'Could you to show me', and 'Can you help me please' without could. Prompt with a raised finger for the plain verb after could, or start the phrase and pause: 'Could you sh...?'",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board and pass the question on.", frames: ["Could you help me, please?", "Of course. What do you need?"] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Give directions with First and then: 'First you go straight, then you turn left at the shop.'", frames: ["First you ___, then you ___."] },
            ],
          },
        },
        {
          after: "Oral rehearsal: why people move to our town",
          slide: {
            kind: "writing",
            title: "Plan, write, check: why people move here",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the topic sentence, three details and the closing sentence.",
              "Plan: fill a quick organiser with one reason, two details and one then-and-now idea about your town.",
              "Write your short paragraph with the frames. Use because and but.",
              "Check it with the checklist. Then read it aloud to your partner and say it again without looking.",
            ],
            text: {
              title: "A town by the sea",
              text: "Seaside is a good town for families. People move here because there is a big beach. Children can swim and play on the sand every weekend. Parents can also find jobs at the harbor. Long ago, people couldn't buy fresh fruit here, but now there is a market on every street. That is why many families like Seaside.",
            },
            frames: ["___ is a good place for families.", "People move here because ___.", "You can ___ and ___.", "Long ago people couldn't ___, but now they can ___.", "That is why ___."],
            checklist: ["A topic sentence at the start and a closing sentence at the end", "Because gives a reason; a comma comes before but", "Can or couldn't is followed by the plain verb"],
            sayIt: "Read your paragraph aloud, then say your three best sentences again without looking.",
            teacherNote: "A short model, then a plan, then writing, then a check against a few items is plan-write-check strategy instruction, which is among the best-evidenced routines for children's writing. Let the children find the parts of the paragraph before you name them. The model is about an invented town, not the children's own town, so they have to write their own. Check the organiser before they write. This prepares the Workbook writing practice that comes next.",
            tiers: [
              { level: "Support", task: "Fill the organiser and write three sentences with the frames.", frames: ["My town is a good place because ___.", "You can ___.", "That is why ___."] },
              { level: "Core", task: "Write a paragraph of five or six sentences with a topic sentence and a closing sentence." },
              { level: "Stretch", task: "Add a then-and-now sentence with but and a because reason." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u03-l5": {
      objectives: ["I can say what a family could do before and can do now in a new place, again and again, in whole sentences."],
      trim: {
        "Remember it!": 3,
        "Time machine: now or before?": 8,
      },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion talk again: plan, then go",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Plan, then give the champion talk again with new partners. Both partners talk in each round, with a better plan and fewer stops.",
            chunks: [
              "When I was little, I couldn't swim, but now I can swim very well.",
              "In the old place people couldn't buy fresh bread, but in the new place they can.",
              "Now he can ride the bus alone because he learned the way, so he feels proud.",
              "People move to new places because they want better jobs and schools.",
            ],
            recycle: ["Excuse me, could you help me, please?", "First she moved, then she felt happy."],
            rounds: [
              { seconds: 45, say: "Round 1: plan in silence. Look at your notes and choose the four sentences you will say. Write three key words, not sentences. Partner A says the plan aloud in one sentence, then Partner B. Then change partners." },
              { seconds: 75, say: "Round 2: Partner A gives the champion talk, then Partner B. The listener counts your because and but sentences. Then change partners." },
              { seconds: 60, say: "Round 3: Partner A gives the same talk again with the plan and the fixes, then Partner B. Try fewer stops this time." },
            ],
            steps: [
              "Choose a family that moved (one of the six movers, or your own idea). Say why they moved and what they could and can do.",
              "Plan with three key words, not full sentences.",
              "Talk to your partner: Partner A talks, then Partner B. The listener asks one follow-up question: 'Why did they move?'",
              "Teacher: after round 1 (both partners have talked), stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them. Then go on to the second talk.",
            ],
            prompts: ["Why did the family move?", "What couldn't they do before?", "What can they do now?"],
            feedback: correctCanCould,
            teacherNote: "Task repetition (Bygate) is the same speaking task again after a planning minute and a fix: the second telling is more fluent and more accurate because the child has thought about what to say and heard the mistakes. A new partner keeps the repetition real. Listen for the plain verb after can and could, a clear 'couldn't', and a because part with a real reason. Do not give new language: the gain comes from saying the same thing better.",
            tiers: [
              { level: "Support", task: "Talk about one family with the frames and your notes.", frames: ["In the old place ___ couldn't ___.", "In the new place ___ can ___."] },
              { level: "Core", task: "Talk about one family with a because reason, without looking at the board." },
              { level: "Stretch", task: "Compare two families and say which move changed life the most and why." },
            ],
          },
        },
        {
          after: "Freeze: before and now",
          slide: {
            kind: "writing",
            title: "Fix the can and could notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each note with your partner. Something is wrong with can, could or the verb!",
              "Find the mistake. Ask: now or before? Is the verb plain?",
              "Write the sentence the right way. Read it aloud together.",
              "Say all the fixed sentences again to another pair, fast.",
            ],
            items: [
              { q: "Last year my sister can't swim.", answer: "Last year my sister couldn't swim." },
              { q: "Now she can swims in the pool.", answer: "Now she can swim in the pool." },
              { q: "My grandfather didn't could use a phone.", answer: "My grandfather couldn't use a phone." },
              { q: "We could to see the sea from our old house.", answer: "We could see the sea from our old house." },
              { q: "Yesterday I can play with my cousins.", answer: "Yesterday I could play with my cousins." },
            ],
            checklist: ["Before is could or couldn't; now is can or can't", "After can or could, the plain verb: no -s, no to", "A capital letter and a full stop in every sentence"],
            sayIt: "Say all the fixed sentences to the other pair, fast and clear.",
            teacherNote: "Written correction works best on two or three error types at a time, with a short reason. Here: the time word (can or could), the plain verb, and not 'didn't could'. Fix item 1 together first and say the reason aloud: 'Last year is before, so couldn't.' These mistakes are typical for Vietnamese speakers because the verb never changes in Vietnamese, so be patient with 'swims'.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 5 with the checklist.", frames: ["Last year / Yesterday -> could", "Now -> can"] },
              { level: "Core", task: "Fix all five items." },
              { level: "Stretch", task: "Write two new notes with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A family that moved: then and now",
        prompt: "Pretend a family moved from a small village to a big city. Tell why they moved, what they couldn't do before, what they can do now and how they feel.",
        length: "60-120 seconds",
        steps: [
          "Look at your notes from the champion talk and think of a family that moved.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster and smoother, like in class.",
          "Use because to say why they moved and but to join then and now.",
          "Record it once. Then tell a grown-up one thing you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell about a family that moved: why, what they couldn't do before, what they can do now, with because and but, and keep talking.",
        words: ["moved", "neighbors", "library", "hospital", "city", "village"],
        grammar: ["I couldn't ___, but now I can ___", "can / could + plain verb", "because"],
        rubric: [
          { label: "Then and now", description: "Says what the family couldn't do before and can do now.", weight: 3 },
          { label: "Can and could", description: "Uses can, couldn't and could correctly, with a plain verb after them.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because for why they moved or why they are happy.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The family moved to ___.", "Before, they couldn't ___.", "Now they can ___."], tips: ["Point to your notes as you speak."] },
          { level: "Core", who: "Most children", frames: ["The family moved because ___.", "In the old place they couldn't ___, but in the new place they can ___.", "They feel ___ because ___."], tips: ["Say a reason for the move and a reason for how they feel."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["They can ___ now, so ___.", "I think the move changed ___ the most because ___."], tips: ["Say what they miss and what the best change is."] },
        ],
      },
    },
  },
};
