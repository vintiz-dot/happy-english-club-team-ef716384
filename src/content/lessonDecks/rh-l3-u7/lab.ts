import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 7 "Blast! Crash! Splash!"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 9-10 (Jupiter).
// Every lesson gets one fluency routine (the lesson's grammar said again and again as
// whole sentences, a little faster each round, with earlier phrases mixed back in) and one
// short writing routine in the entrance-exam formats where they fit (sentence combining,
// fix it), always ending with a spoken step. Four lessons end with a recorded talk for home
// that repeats the class routine days later. Time comes from games, retellings and the
// speaking slides, never from the book pages, grammar, exams or homework. All text is original.

const base =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice). For a sound, a quick recast is fine: say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear. ";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const rhL3U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u7-l1": {
      objectives: ["I can say how, where and when things happen, in smooth sentences, without stopping."],
      add: [
        {
          after: "Exam practice: adjective or adverb?",
          slide: {
            kind: "writing",
            title: "Join it with an adverb",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the short sentences. The second one gives you the adverb or the idea to add.",
              "Say your one sentence aloud first. Then write it.",
              "Check the position of the adverb: after the verb, or before the main verb for often and always.",
              "Read your sentences aloud, then say them again without looking.",
            ],
            items: [
              { q: "The volcano rumbled. It was loud. (one sentence, -ly)", answer: "The volcano rumbled loudly." },
              { q: "The lava moved. It was slow. It moved to the sea. (one sentence)", answer: "The lava moved slowly to the sea." },
              { q: "We go to the beach. We do it often. (put often before the verb)", answer: "We often go to the beach." },
              { q: "The boats came home. It was early. It was lucky. (start with Luckily)", answer: "Luckily, the boats came home early." },
            ],
            frames: ["The ___ moved / rumbled / rose ___ly.", "We always / often / never ___.", "Luckily, ___."],
            checklist: ["-ly after a verb: loudly, slowly, quietly", "often / always / never go BEFORE the main verb (after is / are)", "A comma after Luckily and Suddenly"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining is a well-researched writing routine: children learn how words fit by building longer sentences themselves. This is also the exam's 'rewrite as one sentence' format. Say the first answer aloud with the -ly clearly voiced. Vietnamese has no -ly ending, so the common slip is 'moved slow'; prompt with a pause after 'moved ...' rather than telling.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more sentences of your own about a storm: one with often or always, one with an -ly word and a place." },
            ],
          },
        },
        {
          after: "4/3/2: the day the Earth moved",
          slide: {
            kind: "fluency",
            title: "Adverb sprint: how, where, when",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each whole sentence fast and smooth, with the adverb in the right place.",
            chunks: [
              "The lava moved slowly down the hill.",
              "The waves crashed loudly on the rocks.",
              "We often watch the sea from here.",
              "Luckily, nobody was hurt.",
              "The storm came very suddenly.",
            ],
            recycle: ["Water puppetry is very old, isn't it?", "It's worth watching a water puppet show at least once."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence in one breath." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! Count your sentences on your fingers." },
            ],
            steps: [
              "Look at the picture card (a volcano, a wave, a beach, a storm). Say a whole sentence with an adverb.",
              "Listen for the clap: it means swap.",
              "If your partner says 'moved slow', hold up one finger for the missing -ly.",
              "Teacher: finish with one minute: put the two mistakes you heard most on the board (no names), prompt the class to fix them, then say each sentence once more.",
            ],
            prompts: ["(card: lava)", "(card: waves)", "(card: beach)", "(card: lucky escape)", "(card: black sky)"],
            feedback:
              base +
              "For this unit's grammar, prompt for the missing -ly: say 'The lava moved ...' and point to the frame, or hold up a finger. If the adverb is in the wrong place ('We go often'), repeat the error with a rising voice: 'We go often?' Example: child says 'The sea looked calmly.' You say 'The sea looked ...?' and point to calm; the child says 'calm'.",
            teacherNote: "Whole sentences only, never single words: the aim is that 'luckily, nobody was hurt' becomes one smooth piece. Sprints give many repetitions in a few minutes, which is how automaticity builds. Listen for the -ly ending, final -s in 'waves', and 'often' before the verb. Mix in the old phrases every few cards so they stay quick.",
            tiers: [
              { level: "Support", task: "Say each sentence with a friend, looking at the frames.", frames: ["The ___ moved ___ly.", "Luckily, ___."] },
              { level: "Core", task: "Say each sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add where or when: 'The lava moved slowly down the hill last night.'", frames: ["The ___ moved ___ly ___ last night."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u7-l2": {
      objectives: ["I can retell a story three times, faster each time, with was / were doing and sequence words."],
      trim: { "Eyewitness interview: the new island": 8 },
      add: [
        {
          after: "Exam practice: story cloze",
          slide: {
            kind: "writing",
            title: "An unusual morning: plan, write, check",
            routine: "paragraph",
            genre: "story",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the background (was / were + -ing), the sudden event and the ending.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of about 80 words. Use at least four sequence words (Suddenly, While, First, After that, In the end).",
              "Check: tick the checklist. Your partner underlines one was / were + -ing and one sequence word, and tells you one thing they liked.",
              "Teacher: while they write, look only at was / were + -ing and the past simple. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: The smoking sea",
              text: "One misty morning, my uncle was fishing near a quiet bay when the sea began to shake. Suddenly, a cloud of black smoke rose from the water. While we were rowing away, hot rocks were falling around the boat. First, I felt afraid, but then I saw a new island growing slowly. After that, the smoke cleared and the sun came out. In the end, we sailed home safely, and I will never forget that amazing morning."
            },
            organiser: [
              { label: "Topic sentence", prompt: "When and where? What was someone doing (was / were + -ing) when something began?" },
              { label: "The sudden event", prompt: "What happened suddenly? (past simple) What were people doing while it happened?" },
              { label: "Then and after that", prompt: "What did you do next? Use First, Then, After that." },
              { label: "Closing: In the end, ...", prompt: "How did it end? How did you feel?" }
            ],
            frames: [
              "One ___ morning, ___ was ___ when ___.",
              "Suddenly, ___.",
              "While we were ___, ___ was ___.",
              "In the end, ___."
            ],
            checklist: [
              "My first sentence says what was happening when something began",
              "was / were + -ing for the background, past simple for the sudden event",
              "A sequence word with a comma: Suddenly, First, After that, In the end",
              "Past forms are right: rose, saw, came, began"
            ],
            sayIt: "Read your paragraph to your partner. Then tell the story again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The entrance exam asks for a short paragraph of about 80 to 100 words, and a story with a clear background, an event and an ending is a format children can control. Mark only two targets (was / were + -ing, and the past simple of the sudden event) with a dot on the line; the child finds and fixes the mistake. The paragraph is also the script for this lesson's recorded talk. The dictogloss practice is replaced because the book's own diary project already gives sentence-level story work.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["One ___ morning, ___ was ___ when ___.", "In the end, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a sentence with While and two long actions, and one with Meanwhile: 'While Dad was driving, I was watching the clouds.'" }
            ]
          },
        },
        {
          after: "Eyewitness interview: the new island",
          slide: {
            kind: "fluency",
            title: "Retell it three times: the new island",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same island story three times (1 minute, 45 seconds, 30 seconds each). Both partners tell it in every round. Each time it is shorter, smoother and faster.",
            chunks: [
              "The fishermen were pulling in their nets when the sea began to bubble.",
              "While the boat was rocking, a cloud of ash was rising into the sky.",
              "First, black rock appeared. After that, it grew taller.",
              "In the end, a new island stood in the sea.",
            ],
            recycle: ["Long ago, puppeteers used to perform only in village ponds.", "Water puppetry has travelled all over the world since then."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the story with the four picture cards on the board, then Partner B tells it. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Fast and smooth: Partner A tells it, then Partner B. The listener holds up a thumb if you did not stop." },
            ],
            steps: [
              "Look at the four pictures in order: boat, bubbles, ash, island.",
              "In each round, Partner A tells the story, then Partner B tells it. The listener's job: count how many times you say was / were + -ing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, prompt the class to fix them, then go on with round 2.",
              "When the bell rings, change partners.",
            ],
            prompts: ["(picture: boat and nets)", "(picture: bubbling sea)", "(picture: ash cloud)", "(picture: new island)"],
            feedback:
              base +
              "For this unit's grammar, the usual slips are a past simple where a long action is needed ('The fishermen pulled in their nets when ...') and 'was' with a plural subject. Prompt: start 'The fishermen were ...' and pause, or hold up two fingers for was / were + -ing. Example: child says 'We were watching TV when the lights were going out.' You say 'The lights ...?' with a rising voice; the child says 'went out'.",
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the child to speak faster because they are not searching for words, and the one-minute fix between round 1 and round 2 is what makes it more accurate too. Fluency alone does not fix grammar. Keep the pictures on the board for Support children; accept shorter tellings, the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence from the frames.", frames: ["___ was ___ing when ___.", "First, ___. After that, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add what someone said or felt, and a sequence word like Meanwhile.", frames: ["Meanwhile, ___ were ___ing.", "Everyone was ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The day my island appeared",
        prompt: "Imagine a new island rising near your town. Tell the story of the first day: what people were doing when it happened, and what happened next.",
        length: "60-90 seconds",
        steps: [
          "Look at your notes or picture from class. Plan four parts: before, the surprise, the next thing, the end.",
          "Tell the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going.",
          "End the recording with one sentence that starts 'In the end, ...'",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Tell the island story with was / were + -ing and sequence words, and keep going without long stops.",
        words: ["island", "erupt", "ash", "lava", "suddenly", "meanwhile"],
        grammar: ["was / were + -ing when + past simple", "First, After that, In the end"],
        rubric: [
          { label: "Story order", description: "Uses sequence words (First, After that, In the end) to tell the story in order.", weight: 2 },
          { label: "Narrative tenses", description: "Uses was / were + -ing for what was happening and past simple for the sudden event.", weight: 3 },
          { label: "Keeps going", description: "Keeps talking without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -ed and -s endings can be heard (erupted, boats).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I was ___ing when ___.", "First, ___. After that, ___. In the end, ___."], tips: ["Point to your picture for each part."] },
          { level: "Core", who: "Most children", frames: ["The fishermen were ___ing when ___.", "While ___ was ___ing, ___ was ___ing.", "Suddenly, ___."], tips: ["Use was / were + -ing at least three times."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Meanwhile, ___ were ___ing.", "Everyone was ___ing because ___."], tips: ["Add a second place and what people felt."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u7-l3": {
      objectives: ["I can say what had already happened before another event, in a smooth sentence."],
      trim: { "Hot seat: the island remembers": 7 },
      add: [
        {
          after: "Exam practice: join with the past perfect",
          slide: {
            kind: "writing",
            title: "Before the storm came: plan, write, check",
            routine: "paragraph",
            genre: "story",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the things people had done, what happened then, and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of about 80 words. Use had + a past participle at least three times, and the past simple for what happened next.",
              "Check: tick the checklist. Your partner underlines one had + participle and one past simple, and tells you which action came first.",
              "Teacher: while they write, look only at had + past participle and the past simple. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: The quiet village",
              text: "By the time the storm reached our village, everyone had already prepared. My grandfather had tied the boats to strong posts, and my mother had packed a bag of food and water. Before the wind became strong, the children had carried their books upstairs. Then the lights went out, and we sat together and listened to the rain. By morning, the storm had passed. Luckily, nobody had been hurt, and the sea had returned to its quiet blue color."
            },
            organiser: [
              { label: "Topic sentence", prompt: "By the time something happened, what had people already done?" },
              { label: "Detail 1: before", prompt: "Two things that had happened earlier (had + participle): who did what?" },
              { label: "Detail 2: then", prompt: "What happened next? (past simple) Use Then or Before." },
              { label: "Closing", prompt: "How did it end? What had changed by the morning?" }
            ],
            frames: [
              "By the time ___, everyone had already ___.",
              "___ had ___ before ___.",
              "Then ___.",
              "By the morning, ___ had ___."
            ],
            checklist: [
              "My first sentence uses By the time and had already",
              "had + past participle only for the EARLIER action: prepared, tied, packed, carried",
              "Past simple for what happened next: went out, sat, listened",
              "No 'had went' or 'had flew': check the irregular participles"
            ],
            sayIt: "Read your paragraph to your partner. Then tell what had happened first and what happened next, without looking.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. The past perfect is a stretch point, so the paragraph keeps most sentences in the past simple and asks for had + participle only for what came earlier. Mark only two targets (the participle form, and had used for the earlier action) with a dot on the line; the child finds and fixes the mistake. If a child still mixes the past simple and past continuous, use the Support tier and do not push the stretch point. The fix-it practice is replaced because the paragraph asks the child to make the same choices in their own writing.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box, with the verb list gone, flown, risen, left.", frames: ["By the time ___, everyone had already ___.", "By the morning, ___ had ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a sentence with had just, had never ... before, or after + had: 'No one had seen such a big wave before.'" }
            ]
          },
        },
        {
          after: "Hot seat: the island remembers",
          slide: {
            kind: "fluency",
            title: "Before and after: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Say what had already happened before the island appeared, three times (75, 60 and 45 seconds each), a little smoother each time. Both partners speak in every round.",
            chunks: [
              "By the time we arrived, the boat had left.",
              "The birds had already flown away before the island erupted.",
              "The villagers had left their homes before the lava arrived.",
              "I had never seen a volcano before that day.",
              "After the lava had cooled, small plants grew.",
            ],
            recycle: ["I was walking home when the first drops of rain fell.", "Luckily, nobody was hurt."],
            rounds: [
              { seconds: 75, say: "Round 1: use the timeline on the board. What had happened before the island appeared? Partner A tells it, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. The same task, a little faster. Partner A tells it, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. The same task once more, smooth and sure. Partner A, then Partner B." },
            ],
            steps: [
              "Look at the timeline: three things happen, then the island appears.",
              "Tell your partner what had happened by the time the island appeared. Use at least two had sentences. In each round, Partner A tells it, then Partner B.",
              "The listener's job: ask one follow-up question ('What had the birds done?').",
              "Teacher: after round 1, stop for one minute. Fix two mistakes on the board (no names) with the class, then go on.",
              "Change partners at the bell, after both partners have spoken.",
            ],
            prompts: ["By the time the island appeared, ...", "Before the lava arrived, ...", "(timeline: birds, boats, villagers)"],
            feedback:
              base +
              "For this unit's grammar, prompt for the missing had: say 'By the time we arrived, the boat ...' and hold up a finger. For a wrong participle ('had went') repeat it with a rising voice: 'had went?' and let the child self-correct to 'had gone'. Example: child says 'By the time we arrived, the show already started.' You say 'the show ... already ...?' and point to had; the child says 'had already started'.",
            teacherNote: "Task repetition (the same task, new partner) lets children spend their thinking on form the second and third time, so the past perfect becomes automatic. It is a stretch point, so keep it light and accept past simple in Support. Use a new timeline when you come back to this later.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames on the board.", frames: ["By the time ___, ___ had ___.", "___ had already ___."] },
              { level: "Core", task: "Say three or four had sentences without the board." },
              { level: "Stretch", task: "Use before, after and by the time in one telling.", frames: ["Before ___, ___ had ___. After ___ had ___, ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u7-l4": {
      objectives: ["I can compare how fast or how well things happen, in whole sentences, without stopping."],
      add: [
        {
          after: "Exam practice: word formation",
          slide: {
            kind: "writing",
            title: "Grow the sentence: comparing and adding",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the small sentence. Say what it needs: a comparison, a reason, a time.",
              "Make it bigger with the idea in brackets. Say it first.",
              "Write it. Check the comparison: faster, more quickly, not 'more faster'.",
              "Read your big sentences aloud.",
            ],
            items: [
              { q: "The lava flowed slowly. (add: more ... than the water)", answer: "The lava flowed more slowly than the water." },
              { q: "We left early. (add: earlier than the others)", answer: "We left earlier than the others." },
              { q: "The volcano is dangerous. (add: very, and a reason with because)", answer: "The volcano is very dangerous because it can erupt without warning." },
              { q: "The scientist made a prediction. (add: when, and what happened soon after)", answer: "The scientist made a prediction last week, and soon afterwards the volcano erupted." },
            ],
            frames: ["___ more quickly / slowly than ___.", "___ faster / harder / earlier than ___.", "___ because ___."],
            checklist: ["-er for short adverbs (faster), more for -ly adverbs (more quickly)", "Never more + -er (not more faster)", "-tion / -ous endings spelled right (prediction, dangerous)"],
            sayIt: "Read your biggest sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence (who, how, when, why) is a strong routine for paragraph-level writing. Here the stress is on correct comparatives. A common Vietnamese-learner slip is 'more faster' or 'quicklier'; prompt with a finger on the word and a rising voice. Check the endings -tion and -ous aloud: they are often dropped.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write one sentence that compares two storms and gives a reason." },
            ],
          },
        },
        {
          after: "Generalize: what forces change Earth?",
          slide: {
            kind: "fluency",
            title: "Question chain: who is faster, who is better?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer and pass the question on, with comparing adverbs and no long stops.",
            chunks: [
              "Who runs faster, you or your partner?",
              "I run faster than my partner, but my partner swims better than me.",
              "The lava moved more slowly than the water.",
              "This island is changing the most quickly.",
              "The scientists have already made a prediction, but the volcano hasn't erupted yet.",
            ],
            recycle: ["Luckily, nobody was hurt.", "By the time we arrived, the boat had left."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle: ask the child on your left a question from the cards." },
              { seconds: 60, say: "New cards. Go faster: answer in a whole sentence." },
              { seconds: 45, say: "Last round: can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Each child has an action card (run, swim, shout, write, draw, arrive).",
              "Ask the child on your left: 'Who ___s faster, you or me?'",
              "They answer in a whole sentence with than, then turn and ask the next friend.",
              "Teacher: finish with one minute: put two mistakes on the board (no names), prompt the class to fix them, then run the chain once more.",
            ],
            prompts: ["Who ___s faster, you or ___?", "Who ___s the most quickly?", "Who has already ___?"],
            feedback:
              base +
              "For this unit's grammar, the slips are 'more faster' and 'quicklier', and 'yet' used in an affirmative sentence. Prompt: say 'I run ...' and hold up a finger on the comparative; the child says 'faster'. Example: child says 'The lava moved more faster.' You say 'moved ...?' with a rising voice and point to faster; the child says 'faster than the water'.",
            teacherNote: "A question chain gives every child many questions and many answers in a few minutes, which is what makes 'faster than' and 'more quickly than' automatic. Time the whole circle and tell the class; children love beating their own time. Check the -s on the verb in 'swims', 'runs'.",
            tiers: [
              { level: "Support", task: "Answer with the frame: 'I ___ faster than ___.'", frames: ["I ___ faster than ___.", "___ ___s more quickly than ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason or a second comparison: 'I draw better than him, but he writes the fastest.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Fast and slow changes",
        prompt: "Choose a fast change (a storm, a landslide) and a slow change (a river, a hill). Compare how they change a place. Use comparing adverbs.",
        length: "60-90 seconds",
        steps: [
          "Pick two changes from class. Write two or three key words, not full sentences.",
          "Say your comparison three times to a grown-up. Each time a little faster.",
          "Record it once. Keep talking and do not stop to read.",
          "Finish with one sentence that says which change is more important, and why.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Compare a fast and a slow change with faster, more quickly, more slowly, and keep going without long stops.",
        words: ["eruption", "prediction", "dangerous", "faster", "more slowly", "eventually"],
        grammar: ["Comparing adverbs: faster than, more quickly than, the most slowly", "already / still / yet"],
        rubric: [
          { label: "Comparing", description: "Compares two changes with comparing adverbs (faster than, more slowly than).", weight: 3 },
          { label: "Correct forms", description: "Uses -er and more correctly: no 'more faster' or 'quicklier'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Reason", description: "Gives a reason with because or so, and finishes the talk.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ changes the land faster than ___.", "A ___ moves more slowly than a ___."], tips: ["Point to your two words as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ changes the land more quickly than ___.", "___ is dangerous because ___.", "Eventually, ___."], tips: ["Say the comparison three different ways."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Of all the changes, ___ happens the most quickly.", "Scientists have already ___, but ___ hasn't ___ yet."], tips: ["Add a prediction about the future."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u7-l5": {
      objectives: ["I can give my opinion and advice for the storm season, in one smooth talk, three times."],
      trim: { "Expert panel: getting ready for the storm season": 8 },
      add: [
        {
          after: "Exam practice: rewrite the advice",
          slide: {
            kind: "writing",
            title: "Our town in storm season: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the opinion, the two pieces of advice and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of about 80 words. Use should, ought to and had better, each at least once.",
              "Check: tick the checklist. Your partner underlines one should / ought to / had better and tells you which advice they would follow.",
              "Teacher: while they write, look only at should / ought to / had better + a plain verb. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: Ready for the storms",
              text: "In my opinion, every family in our town should prepare for the storm season. First, you ought to check the roof and the windows, because strong wind can break them. Second, you had better keep a torch, water and a radio in one bag, or you will sit in the dark. Although the sea looks calm in the morning, it can change very quickly, so families should stay inside when the storm arrives. For these reasons, I believe a little preparation keeps everyone safe."
            },
            organiser: [
              { label: "Opinion sentence", prompt: "What do you think families should do? Start with In my opinion or I believe." },
              { label: "Advice 1: First, ...", prompt: "One piece of advice with ought to or should, and a reason with because." },
              { label: "Advice 2: Second, ...", prompt: "Another piece of advice. Use had better and say what could happen (or ...)." },
              { label: "Closing", prompt: "Use although or despite, then should. End with For these reasons, ..." }
            ],
            frames: [
              "In my opinion, families should ___.",
              "You ought to ___, because ___.",
              "You had better ___, or ___.",
              "For these reasons, I believe ___."
            ],
            checklist: [
              "My first sentence gives my opinion",
              "should / ought to + plain verb; had better + plain verb (no 'had better to')",
              "A reason with because, and a comma after First, Second",
              "Although / Despite used correctly (although + a clause, despite + a noun)"
            ],
            sayIt: "Read your paragraph to your partner. Then give your two pieces of advice again, without looking.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. An opinion paragraph with reasons is one of the commonest short-writing tasks in the entrance exam, so the model gives the whole shape: opinion, two pieces of advice with reasons, a closing line. Mark only two targets (the plain verb after should / ought to / had better, and the comma after First, Second) with a dot on the line. Watch for 'ought go' and 'had better to'. This paragraph is the script for the 4-3-2 in this lesson. It replaces the earlier model-then-write slide, whose best idea (copy the structure, not the words) is kept here.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["In my opinion, families should ___.", "You had better ___, or ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a despite sentence and an although sentence: 'Despite the warning, some people stayed outside.'" }
            ]
          },
        },
        {
          after: "Expert panel: getting ready for the storm season",
          slide: {
            kind: "fluency",
            title: "4-3-2: my storm-season advice",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same advice talk three times (75, 60 and 45 seconds each). Both partners give the talk in every round. Each talk is shorter and smoother.",
            chunks: [
              "In my opinion, families should keep a torch and water ready.",
              "I believe we ought to plant trees on the hills.",
              "You'd better not swim today, or you could get hurt.",
              "Despite the strong wind, the fishers came home safely.",
            ],
            recycle: ["The lava moved more slowly than the water.", "By the time we arrived, the boat had left."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the advice talk, then Partner B. Listener: count the pieces of advice on your fingers. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. The same talk in less time: Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Fast and smooth! Partner A, then Partner B. Ask one follow-up question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) gives the talk, then Partner B (line B) gives the same kind of talk.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, prompt the class to fix them, then go on.",
              "When the bell rings, line B moves one step to the left: a new partner for every child.",
              "Do three rounds in all, each shorter than the last.",
            ],
            feedback:
              base +
              "For this unit's grammar, prompt for the missing or extra word: 'You had better ...' (finger for no 'to'), 'We ought ...' (point to the frame for to). Example: child says 'You had better to leave.' You say 'You had better ...?' with a rising voice and hold up a hand to stop; the child says 'leave'. Pronunciation: model 'should', 'ought' and the 'd of 'd better once and let the child echo.",
            teacherNote: "4/3/2 (Nation) builds fluency because the same talk is given again in less time to a new listener. It does not build accuracy on its own, so the one-minute fix after round 1 is the key move: children who then say the same talk again use the fixed form. Do not add new language between rounds. The listener's job (count, ask) keeps the audience real.",
            tiers: [
              { level: "Support", task: "Give two pieces of advice with the frames.", frames: ["In my opinion, families should ___.", "You had better ___."] },
              { level: "Core", task: "Give three pieces of advice without the board." },
              { level: "Stretch", task: "Add a reason and a despite sentence.", frames: ["I believe ___ because ___.", "Despite ___, ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u7-l6": {
      objectives: ["I can pass on a warning, saying who told whom to do what, fast and without stopping."],
      add: [
        {
          after: "Exam practice: report the warnings",
          slide: {
            kind: "writing",
            title: "Combine it: orders, requests and as soon as",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the pair of ideas. Say the one sentence aloud first.",
              "Write it. Use told / asked + person + to, or as soon as, or until.",
              "Check the pronouns and the tense: no will after as soon as.",
              "Read your sentences aloud, then say them without looking.",
            ],
            items: [
              { q: "The siren sounded. We left. (as soon as, start the sentence with it)", answer: "As soon as the siren sounded, we left." },
              { q: "Stay inside. The wind must stop first. (until)", answer: "Stay inside until the wind stops." },
              { q: "The volunteer spoke to the children. 'Don't touch the wires.' (told ... not to)", answer: "The volunteer told the children not to touch the wires." },
              { q: "Dad spoke to me. 'Please bring the torch.' (asked ... to)", answer: "Dad asked me to bring the torch." },
            ],
            frames: ["She told us to ___. / He asked us not to ___.", "As soon as ___, we ___.", "Stay ___ until ___."],
            checklist: ["told / asked + person + (not) to + verb", "No will after as soon as or until", "Pronouns change: your -> my, here -> there"],
            sayIt: "Read your combined sentences to your partner, then say them without looking.",
            teacherNote: "Sentence combining mirrors the exam's rewrite format with the school's own items. The typical slips are 'told us don't go', 'said me to wait' and 'as soon as it will sound'. Fix those with a short reason (told + person + to) rather than a long rule. Keep to two or three error types.",
            tiers: [
              { level: "Support", task: "Do items 3 and 4 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more sentences: one with as soon as and one with until." },
            ],
          },
        },
        {
          after: "Pass the warning on",
          slide: {
            kind: "fluency",
            title: "Warning sprint: told us to, asked us not to",
            routine: "chunk sprint",
            mode: "groups",
            minutes: 5,
            goal: "Pass the warning on in a whole sentence, fast and right.",
            chunks: [
              "The teacher told us to walk to the stairs.",
              "She asked us not to run.",
              "The volunteer told families to stay on high ground until the water went down.",
              "As soon as the siren sounds, we leave.",
              "He asked me to bring the radio.",
            ],
            recycle: ["In my opinion, families should keep a torch ready.", "You'd better not swim today."],
            rounds: [
              { seconds: 50, say: "Together: the teacher says a warning, the class passes it on with told / asked." },
              { seconds: 50, say: "Groups of four: whisper the warning round the group, the last child says it aloud." },
              { seconds: 40, say: "New group. Faster! How many warnings can your group pass on?" },
            ],
            steps: [
              "The teacher gives a warning: 'Stay away from the beach!'",
              "Pass it on: 'The teacher told us to stay away from the beach.'",
              "If you hear 'told us don't', hold up a finger and say it the right way.",
              "Teacher: finish with one minute: put the two mistakes you heard most on the board (no names), prompt the class to fix them, then say each sentence once more.",
            ],
            prompts: ["(warning: Stay inside!)", "(warning: Please don't shout.)", "(warning: Bring water.)", "(warning: Don't touch the wires.)"],
            feedback:
              base +
              "For this unit's grammar, prompt: say 'The teacher told us ...' and pause, or point to the frame for 'not to'. Example: child says 'He told us don't go.' You say 'He told us ... not ...?' and hold up a finger; the child says 'not to go'. Also listen for the final -s in 'families' and the -ed in 'asked'.",
            teacherNote: "Whole sentences only. The warnings are quick, the sentence frame is the same each time, and this is how reported commands become automatic. Mix the earlier advice phrases back in every few turns so last lesson's language stays fast. Say 'asked' with the clear final /t/.",
            tiers: [
              { level: "Support", task: "Pass the warning on using the frame.", frames: ["___ told us to ___.", "___ asked us not to ___."] },
              { level: "Core", task: "Pass it on without looking at the board." },
              { level: "Stretch", task: "Add as soon as or until: 'The volunteer told us to stay inside until the wind stopped.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Pass the warning on: my recorded talk",
        prompt: "You are a volunteer after a storm. Tell the camera what the rescue team told you and your family to do, and what you should do as soon as the wind stops.",
        length: "60-90 seconds",
        steps: [
          "Think of three warnings: two commands and one request. Write two or three key words.",
          "Say your talk three times. Each time a little faster, like in class.",
          "Record it once. Use told us to, asked us not to, and as soon as.",
          "Finish with one sentence about when it is safe to go outside.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Pass on three warnings with told / asked, say when to act with as soon as, and keep going without long stops.",
        words: ["siren", "volunteer", "shelter", "warning", "as soon as", "until"],
        grammar: ["told / asked + person + (not) to", "as soon as and until + present"],
        rubric: [
          { label: "Reported warnings", description: "Passes on at least three warnings with told / asked + person + to.", weight: 3 },
          { label: "as soon as / until", description: "Uses as soon as or until correctly, with a present tense and no will.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -ed and -s endings can be heard (asked, families).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The volunteer told us to ___.", "She asked us not to ___."], tips: ["Point to a key word for each warning."] },
          { level: "Core", who: "Most children", frames: ["The volunteer told us to ___, and she asked us not to ___.", "As soon as ___, we have to ___."], tips: ["Say each warning in a different way."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We should stay ___ until ___.", "He asked everyone to ___ before ___."], tips: ["Add what you think will happen next."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u7-l7": {
      objectives: ["I can explain how and when something happens or was done, in a clear expert minute."],
      trim: { "Expert minute: say it before you write it": 5, 'Read: "Tsunami" and synthesize': 14 },
      add: [
        {
          after: "Exam practice: prepositions and the passive",
          slide: {
            kind: "writing",
            title: "Fix it: prepositions and the passive",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. There is one mistake in each.",
              "Find it: a wrong preposition, an extra word, or a passive with the wrong ending.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The earthquake happened in Monday night.", answer: "The earthquake happened on Monday night." },
              { q: "Tsunamis are cause by earthquakes under the sea.", answer: "Tsunamis are caused by earthquakes under the sea." },
              { q: "The wave reached to the shore at noon.", answer: "The wave reached the shore at noon." },
              { q: "It rained during three hours.", answer: "It rained for three hours." },
            ],
            checklist: ["on a day, in a year, at night, for a length of time", "Passive: is / was + the -ed or -en form (caused, built, given)", "No to after reach: reached the shore"],
            sayIt: "Read your fixed sentences to your partner, then say them without looking.",
            teacherNote: "Preposition errors (in / on / at, for / during) and a missing -ed in the passive are mistakes children often make in reports. Give one short reason per fix: for a length of time, on a day. The passive ending is a spoken sound as well as a spelling: say 'caused' with the final /d/ clearly.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the preposition list on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake about your own report topic for your partner to fix." },
            ],
          },
        },
        {
          after: "Expert minute: say it before you write it",
          slide: {
            kind: "fluency",
            title: "Expert minute, three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same report facts three times to new partners (50, 40 and 30 seconds each), smoother each time. Both partners speak in every round.",
            chunks: [
              "A tsunami is caused by an earthquake under the sea.",
              "The wave moved across the ocean towards the coast.",
              "The warning was sent by radio during the night.",
              "Earthquakes are measured with a seismometer.",
              "Many boats were damaged after the wave hit.",
            ],
            recycle: ["The teacher told us to walk, not run.", "As soon as the siren sounds, we leave."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells your three report facts, then Partner B. Use the passive at least twice. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. The same facts, a little faster: Partner A, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Same facts again, smooth and clear: Partner A, then Partner B." },
            ],
            steps: [
              "Choose three facts for your report. Write only key words.",
              "Say them to your partner: Partner A first, then Partner B, in every round. The listener's job: tick each time you use is / was + the past participle.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, prompt the class to fix them, then go on.",
              "Change partners at the bell, after both partners have spoken.",
            ],
            prompts: ["A ___ is caused by ___.", "The ___ was ___ed by ___.", "(where? which way? when?)"],
            feedback:
              base +
              "For this unit's grammar, prompt for the preposition or the passive ending: 'The earthquake happened ...?' with a pause, or a finger on the missing -ed. Example: child says 'Tsunamis are cause by earthquakes.' You say 'are ...?' with a rising voice and point to the frame; the child says 'caused'. For a sound, recast it: 'caused', and the child echoes.",
            teacherNote: "This is the same task, new partner, three times: the second and third tellings let children spend thinking on the passive and the prepositions rather than on what to say. It is deliberately short because the lesson is a writing project; its job is to make the facts speakable before they are written. Keep the facts true to the class's own research.",
            tiers: [
              { level: "Support", task: "Say two facts using the frames.", frames: ["A ___ is caused by ___.", "The ___ was ___ed in ___."] },
              { level: "Core", task: "Say three facts, using the passive twice." },
              { level: "Stretch", task: "Add where, which way and when to each fact.", frames: ["The wave moved across ___ towards ___ in ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u7-l8": {
      objectives: ["I can retell a chain of causes and results in whole sentences, faster each time."],
      trim: { "Transfer: test our big idea": 7 },
      add: [
        {
          after: "Exam practice: rewrite the cause",
          slide: {
            kind: "writing",
            title: "A chain of causes: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, each cause and result, and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Draw an arrow between a cause and its result.",
              "Write: turn your notes into one paragraph of about 80 words. Use because of, led to, as a result and due to at least once each.",
              "Check: tick the checklist. Your partner follows your arrows and tells you if every result has a cause.",
              "Teacher: while they write, look only at because of / due to + a noun, and led to / resulted in. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: The landslide",
              text: "Last year, a landslide changed life in a mountain village, and there were clear causes. First, heavy rain fell for four days, so the soil became very wet. Because of the wet soil, a large part of the hill slid onto the road. The landslide led to a second problem: trucks could not bring food to the shop. As a result, families waited two days for fresh vegetables. Due to the damage, the villagers also planted new trees on the hill. In the end, one week of rain caused a long chain of events."
            },
            organiser: [
              { label: "Topic sentence", prompt: "What happened, and where? Say there were causes." },
              { label: "Cause 1 and its result", prompt: "First cause, then the result: because of + noun, or so + clause." },
              { label: "Cause 2 and its result", prompt: "A second link in the chain: led to / resulted in + noun. Then As a result, ..." },
              { label: "Closing", prompt: "What did people do? In the end, what does the chain show?" }
            ],
            frames: [
              "___ changed life in ___, and there were clear causes.",
              "Because of ___, ___.",
              "___ led to ___. As a result, ___.",
              "In the end, ___."
            ],
            checklist: [
              "My first sentence says what happened and that it had causes",
              "because of / due to + a noun; because + a whole clause",
              "led to / resulted in + a noun (not 'resulted to')",
              "A comma after As a result and In the end"
            ],
            sayIt: "Read your paragraph to your partner. Then tell the chain of causes again, using your arrows, without looking.",
            teacherNote: "Plan, write, check: the arrows in the plan turn a list of events into a chain of causes, which is what an explanation paragraph needs. Mark only two targets (because of / due to + noun, and led to / resulted in + noun) with a dot on the line; 'because the typhoon' and 'resulted to' are the usual slips. This paragraph is the script for the recorded talk 'A chain of causes'. The dictogloss is replaced because the paragraph asks children to build the same cause-and-result sentences for themselves.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Because of ___, ___.", "As a result, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a third link to the chain with 'This means that ...' or 'X was caused by Y'." }
            ]
          },
        },
        {
          after: "Transfer: test our big idea",
          slide: {
            kind: "fluency",
            title: "Retell the chain: cause and result",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Retell the same cause chain three times (50, 40 and 30 seconds each): shorter, smoother and faster each time. Both partners retell it in every round.",
            chunks: [
              "Heavy rain led to flooding in the town.",
              "The road closed because of the landslide.",
              "The school closed due to the floods.",
              "The plates moved suddenly. As a result, the ground shook.",
              "Floods are caused by heavy rain.",
            ],
            recycle: ["Earthquakes are measured with a seismometer.", "The warning was sent by radio."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells the chain with the picture cards (rain, river, road, school), then Partner B. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. Tell it again in less time: Partner A, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Fast and smooth, with no long stops: Partner A, then Partner B." },
            ],
            steps: [
              "Look at the picture chain: heavy rain, river rises, road closes, school closes.",
              "Tell it with cause and result words: led to, because of, due to, as a result. In each round, Partner A tells it, then Partner B.",
              "The listener's job: count how many different cause words you use.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard (no names) on the board, prompt the class to fix them, then go on.",
            ],
            prompts: ["(picture: heavy rain)", "(picture: river rising)", "(picture: closed road)", "(picture: closed school)"],
            feedback:
              base +
              "For this unit's grammar, prompt for the missing 'of' or the wrong preposition: 'The road closed because ...?' with a finger, or 'led ...?' and point to the frame. Example: child says 'The school closed because the floods.' You say 'because ...?' and hold up a finger for of; the child says 'because of the floods'. Check the -s in 'floods' and the -ed in 'caused'.",
            teacherNote: "Retelling the same chain three times is the same idea as 4/3/2 for a story: each telling is easier and faster, and the one-minute fix between rounds 1 and 2 raises accuracy. Use this chain as the spoken rehearsal for the unit's final writing. Keep the picture cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Tell the chain with one frame per picture.", frames: ["Heavy rain led to ___.", "Because of ___, ___."] },
              { level: "Core", task: "Tell the whole chain with at least three different cause words." },
              { level: "Stretch", task: "Add a second chain of your own with As a result.", frames: ["___ caused ___. As a result, ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A chain of causes",
        prompt: "Explain a chain of causes and results from this unit or from Vietnam, such as a typhoon, a flood or a volcano. Use cause words and say what happened at the end.",
        length: "60-90 seconds",
        steps: [
          "Choose a chain with at least three links. Draw it as four small pictures.",
          "Say the chain three times to a grown-up. Each time a little faster, like in class.",
          "Record it once. Use led to, because of, due to or as a result.",
          "Finish with one sentence: what can people do to be ready?",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Explain a chain of causes and results with led to, because of and as a result, and keep going without long stops.",
        words: ["cause", "result", "flood", "landslide", "led to", "because of"],
        grammar: ["X causes Y / Y is caused by X", "led to, because of, due to, as a result"],
        rubric: [
          { label: "Cause chain", description: "Explains at least three linked causes and results in order.", weight: 3 },
          { label: "Cause language", description: "Uses at least three different cause words correctly (led to, because of, due to, as a result).", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Clear endings", description: "The -ed and -s endings can be heard (caused, floods).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ led to ___.", "Because of ___, ___."], tips: ["Point to your pictures in order."] },
          { level: "Core", who: "Most children", frames: ["___ caused ___. As a result, ___.", "The ___ closed due to ___."], tips: ["Use a different cause word in each link."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["This means that ___.", "___ is caused by ___, which led to ___."], tips: ["Add what people can do to stop the effect."] },
        ],
      },
    },
  },
};
