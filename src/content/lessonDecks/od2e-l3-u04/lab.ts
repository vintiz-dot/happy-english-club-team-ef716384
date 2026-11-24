import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 4 "Why People
// Move" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's places, if / when and because
// sentences said again and again as whole phrases, a little faster each round, with
// Unit 3's can / could / but phrases mixed back in) and one short writing routine
// (plan, write, check, then say it). Every other lesson ends with a recorded talk for
// home, built on the routine the class just did. Time comes from games, warm-ups and
// repeats, never from the book pages or the grammar. All text is original.

const fixPlaces =
  "Listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). In a 4-3-2 or a retell, stop for one minute between rounds 1 and 2, write them on the board and let the class fix them; children then say it again with the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('In a rural area there ...?'), or hold up a finger for the missing word or -s. Typical slips: 'There have a park' (There is a park), 'in urban area' (in an urban area), 'two farm' (two farms). For a sound, just say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const fixIf =
  "Listen and do not stop the talk. Note two or three mistakes (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute. For grammar, prompt the child to fix it: start the sentence and pause ('If it rains, I ...?'), tap the board where the comma goes, or hold up a finger for the missing -s or the missing 'is' ('If he hungry' -> 'If he is hungry'; 'When she is tired, she sleep' -> 'sleeps'). If a child says 'If it will rain', raise your voice on 'will?' and let them choose again: after if and when we use the present. For a sound, say it right and let the child echo. Say every final -s clearly yourself.";

const fixMoved =
  "Listen and do not stop the talk. Note two or three mistakes (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children then tell the story again with the fixed form. For grammar, prompt the child to fix it: start the sentence and pause ('The family move ...?' with a raised voice, then 'moved?'), hold up a finger for the missing -ed, or point to the frame. Typical slips: 'The father get a new job' (got), 'They moved because a new job' (because they got a new job), 'They live in urban area' (an urban area). For a sound, say it right and let the child echo. Say every final -ed and -s clearly yourself: 'moved', 'friends'.";

const fixBecause =
  "Listen and do not stop the talk. Note two or three mistakes (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute. For grammar, prompt the child: point to the frame, start the phrase and pause ('They moved because ...?'), or hold up a finger when a whole 'because' part is missing its verb ('because a new job' -> 'because they got a new job'). For 'Why you like it?' repeat it with a rising voice and 'Why ...?' and wait for 'do'. For a sound, say it right and let the child echo. Say every final -s and -ed clearly yourself: 'moved', 'likes', 'jobs'.";

export const odL3U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u04-l1": {
      objectives: ["I can describe rural, urban and suburban places in whole sentences, without long stops."],
      trim: { "Four corners: where am I?": 4, "Stand on the line": 5, "Guess my place": 5 },
      add: [
        {
          after: "Live or work? (SB 36 B)",
          slide: {
            kind: "fluency",
            title: "Place sprint: what is there?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each whole sentence about a place fast and smooth, with no stops.",
            chunks: [
              "In a rural area there are farms and fields.",
              "In an urban area there are tall buildings and busy streets.",
              "There is a big park near my home.",
              "People work at the hospital and live in the suburb.",
              "I like a quiet place because it is calm.",
            ],
            recycle: ["I can ride a bike now, but I couldn't last year.", "I can help you."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a place card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the place card. Say a WHOLE sentence, not just the word.",
              "Say 'There is' for one thing and 'There are' for more than one.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, take one minute to put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["(card: farm)", "(card: skyscraper)", "(card: park)", "(card: hospital)", "(card: suburb)"],
            feedback: fixPlaces,
            teacherNote: "Whole sentences only, never single words: 'In an urban area there are tall buildings' should come out as one smooth piece. Vietnamese children often say 'There have' and drop the plural -s, so say 'farms', 'fields' and 'buildings' clearly yourself, and listen for 'an urban' (the linked n). Mix in a Unit 3 phrase every few turns so can / could stays fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say the sentence with a friend.", frames: ["In a ___ area there are ___.", "There is a ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'In an urban area there are tall buildings, so many people work there.'" },
            ],
          },
        },
        {
          after: "My favorite place",
          slide: {
            kind: "writing",
            title: "Plan, write, check: my favorite place",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the first sentence (the main idea), the details and the last sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Join two details with 'and'.",
              "Check: tick the checklist. Swap with a partner: they underline one place word and tell you one detail they liked.",
              "Teacher: while they write, look only at the -s on more than one thing and at 'a' or 'an'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The library",
              text: "The library is my favorite place in our community. It is a quiet building in an urban area, and it has thousands of books and many colorful tables. People can read stories, borrow books and do their homework there. I also like the library because it is calm and warm in winter. It is a perfect place for me.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which place is your favorite? Say it is in our community." },
              { label: "Detail 1: It has ...", prompt: "What is it like (quiet? big?) and what can you see there? Use two things, with -s." },
              { label: "Detail 2: People can ...", prompt: "What can people do there?" },
              { label: "Closing: I like it because ...", prompt: "Why is it perfect for you? Use because and a word like calm, warm or fun." },
            ],
            frames: ["The ___ is my favorite place in our community.","It has ___ and ___.","People can ___ there.","I like it because ___."],
            checklist: [
              "My first sentence says my favorite place and the main idea",
              "There is / There are or has, and the -s for more than one",
              "'a' before a consonant sound and 'an' before a vowel sound (an urban area)",
              "A capital letter and a full stop in every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking: the main idea and two details.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Link back to Main idea and details: the first sentence is the main idea, the middle sentences are details. Mark only two targets (the -s on more than one thing, and a / an) with a dot on the line; the child finds and fixes the mistake. A description is the easiest first paragraph because the child already knows the place.",
            tiers: [
              {"level":"Support","task":"Copy the model and change the place and two details. Use the four frames.","frames":["The ___ is my favorite place.","It has ___.","People can ___ there."]},
              {"level":"Core","task":"Write the whole paragraph: five sentences, one for each box and one more detail."},
              {"level":"Stretch","task":"Write six or seven sentences. Add a second reason: 'Also, ...' or 'It is better than a ___ because ...'."},
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u04-l2": {
      objectives: ["I can tell why a family moved, three times, faster each time."],
      trim: { "Class word web": 7, "Look first, then predict": 6, "Word detectives: belongings, immigrant, move abroad, experiences": 4, "Home talk: favorite places": 4, "Moving-day interview": 7 },
      add: [
        {
          after: "Where from, where to, why?",
          slide: {
            kind: "fluency",
            title: "The moving story: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same moving story three times (75, 60 and 45 seconds each). Both partners tell it in every round. Each time is shorter, smoother and faster.",
            chunks: [
              "The family moved from a village to a city.",
              "The reason was that the father got a new job.",
              "Now they live in an urban area.",
              "They miss their old friends, but they like the new school.",
            ],
            recycle: ["I couldn't speak English last year, but now I can.", "Could you help me, please?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the story with the four picture cards (from, to, why, now), then Partner B tells it. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same story in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A, then Partner B. Tell it fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the four picture cards: the old home, the new home, the reason, now.",
              "Partner A tells the story, then Partner B tells it. The listener's job: count how many cards the speaker uses.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, change partners. Partner A tells the story again, then Partner B, in less time.",
            ],
            prompts: ["(card: village)", "(card: city)", "(card: job)", "(card: new school)"],
            feedback: fixMoved,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words, and the one-minute fix between round 1 and round 2 gives the children a chance to improve accuracy as well as speed. Listen for the past tense 'moved' (the final -ed) and for 'got', not 'get'. Keep the picture cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["The family moved from ___ to ___.", "The reason was that ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add how the family feels: 'They miss ___, but they look forward to ___.'" },
            ],
          },
        },
        {
          after: "Moving-day interview",
          slide: {
            kind: "writing",
            title: "Plan, write, check: why a family moved",
            routine: "paragraph",
            genre: "recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the reason with because, the details and the last sentence.",
              "Plan: fill the four boxes with a few words each. They match your four picture cards: from, to, why, now.",
              "Write: turn your notes into one paragraph. Use First and Then for what happened, and because for the reason.",
              "Check: tick the checklist. Swap with a partner: they underline the word because and tell you one thing they liked.",
              "Teacher: while they write, look only at the past verbs (moved, packed, got) and at who + did what after because. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A family on the move",
              text: "Last summer, a family moved from a small village to a big city. They moved because the mother got a new job at a hospital. First, they packed their belongings in big boxes. Then they took a long bus ride to their new apartment. The children miss their old friends, but they like their new school. Now they live in an urban area, and there is a park near their home.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who moved, when, from where and to where?" },
              { label: "Reason: because ...", prompt: "Why did they move? After because say who did what." },
              { label: "Details: First, ... Then, ...", prompt: "What did they do on moving day? Use past verbs." },
              { label: "Closing: Now ...", prompt: "How do they feel? What do they miss, and what do they like? Where do they live now?" },
            ],
            frames: ["Last ___, a family moved from ___ to ___.","They moved because ___.","First, they ___. Then they ___.","They miss ___, but they like ___."],
            checklist: [
              "My first sentence says who moved, from where and to where",
              "because + who + did what (a verb!)",
              "Past verbs: moved, packed, took, got",
              "A comma before 'but', and First / Then for the order",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the story again without looking, using your picture cards.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This paragraph is the script for the recorded talk 'Why a family moved: my story', so the children say it at home as well. Mark only two targets (past verbs, and who + did what after because) with a dot on the line; the child finds and fixes the mistake. The dictogloss in Lesson 6 keeps the whole-text rebuilding practice.",
            tiers: [
              {"level":"Support","task":"Use the four frames: one sentence for each box.","frames":["A family moved from ___ to ___.","They moved because ___.","They miss ___, but they like ___."]},
              {"level":"Core","task":"Write the whole paragraph: five or six sentences."},
              {"level":"Stretch","task":"Add how the family felt on moving day and one more sentence with 'when': 'When they arrived, the children felt nervous.'"},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Why a family moved: my story",
        prompt: "Tell a story about a family who moved, real or invented. Say where they moved from and to, why they moved, and how they feel now. Show a drawing or a photo if you can.",
        length: "60-90 seconds",
        steps: [
          "Look at your four picture cards from class: from, to, why, now.",
          "Tell the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell where the family moved from and to, say why, and keep talking without long stops.",
        words: ["village", "city", "move", "job", "urban area", "rural area", "miss", "belongings"],
        grammar: ["moved from ___ to ___", "They moved because ...", "___, but ___"],
        rubric: [
          { label: "Whole story", description: "Says where from, where to, why and how they feel now.", weight: 3 },
          { label: "Because", description: "Gives the reason with 'because' and a full clause: because the father got a new job.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -ed in moved and the -s in jobs and friends can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A family moved from ___ to ___.", "They moved because ___.", "Now they live in ___."], tips: ["Point to your picture cards as you speak."] },
          { level: "Core", who: "Most children", frames: ["A family moved from ___ to ___ because ___.", "They miss ___, but they like ___.", "Now they live in a(n) ___ area."], tips: ["Join your ideas with because and but."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["If they miss their friends, they ...", "When they feel nervous, they ...", "I think it was a good move because ..."], tips: ["Add what they do when they miss home, and your opinion."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u04-l3": {
      objectives: ["I can ask and answer 'What do you do when ...?' fast, with if and when."],
      trim: { "If I clap, you ...": 4, "Listen and read (SB 41 D)": 8, "Discover the rule (SB 41 E)": 8, "If-chain": 5, "Our big idea": 6 },
      add: [
        {
          after: "What do you do when ...? (SB 41 G)",
          slide: {
            kind: "fluency",
            title: "If and when question chain",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What do you do when you're thirsty?",
              "When I'm thirsty, I drink water.",
              "If I'm nervous, I take a deep breath.",
              "When it rains, we stay inside.",
              "What does your friend do when she is tired?",
            ],
            recycle: ["I couldn't draw well last year, but now I can.", "Could you help me, please?"],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone has a feeling card: hungry, sleepy, nervous, thirsty, excited." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your feeling card so only you can see it.",
              "Ask the friend on your left: 'What do you do when you're ___?'",
              "They answer: 'When I'm ___, I ...' and then ask the next friend.",
              "Listener's job: say 'Me too!' or 'Not me.' after every answer.",
              "Teacher: after the last round, put two mistakes you heard on the board (no names) and fix them in one minute.",
            ],
            prompts: ["What do you do when ...?", "(card: hungry)", "(card: nervous)", "(card: sleepy)"],
            feedback: fixIf,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes the 'When I'm ..., I ...' pattern automatic. Time the whole circle and tell them; children love beating their own time. Listen for the comma pause after the if / when part (a tiny breath) and for the 3rd-person -s when you ask about a friend: 'she drinks water'.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board: 'When I'm ___, I ___.'", frames: ["What do you do when you're ___?", "When I'm ___, I ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with if AND when: 'If I'm nervous, I breathe. When I'm calm, I smile.'", frames: ["If I'm ___, I ___. When I'm ___, I ___."] },
            ],
          },
        },
        {
          after: "Match the halves (SB 41 F)",
          slide: {
            kind: "writing",
            title: "Join the halves: if and when",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder: if or when at the start needs a comma after the first part. After the comma, say what happens.",
              "Read the two short sentences. Say the joined sentence first.",
              "Write it with 'if' or 'when' at the start. Do not forget the comma!",
              "Read your sentence to your partner. Does it sound right?",
            ],
            items: [
              { q: "It rains. We stay inside. (when)", answer: "When it rains, we stay inside." },
              { q: "I am thirsty. I drink water. (if)", answer: "If I am thirsty, I drink water." },
              { q: "She is tired. She goes to bed early. (when)", answer: "When she is tired, she goes to bed early." },
              { q: "Water gets very cold. It turns into ice. (if)", answer: "If water gets very cold, it turns into ice." },
            ],
            frames: ["If / When ___, ___.", "___ when ___."],
            checklist: ["A comma after the if / when part", "The present tense (rains, not will rain)", "The -s on he / she / it verbs"],
            sayIt: "Say each joined sentence to your partner, then say it again without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud. The comma, the present tense after if (not 'will rain') and the -s on 'she goes' are the three things to check; Vietnamese learners often drop the -s. Stretch: swap the order ('We stay inside when it rains.') and notice the comma disappears.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Do all four, then write the same sentences with the result first (no comma)." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u04-l4": {
      objectives: ["I can give reasons with 'because' for my favorite place, again and again, more smoothly each time."],
      trim: { "Reason relay": 4, "Where does my family come from? (SB 42 Think)": 4, "Suffixes for countries (SB 43 D)": 8 },
      add: [
        {
          after: "My favorite kind of community (SB 43 C)",
          slide: {
            kind: "fluency",
            title: "Because talk: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Give your reasons to a new partner two times (90 and 60 seconds each). Both partners talk in each round. Say it more smoothly the second time.",
            chunks: [
              "I like a suburb the most because it has a big park.",
              "Why do you like the city? Because there are many things to do.",
              "They moved because the mother got a new job.",
              "Because it is quiet, I like the village.",
              "Also, it is close to my school.",
            ],
            recycle: ["If I'm nervous, I take a deep breath.", "When it rains, we stay inside."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A tells your favorite kind of community and two reasons, then Partner B does. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A says the same talk again, a little smoother, then Partner B. Keep going without stopping!" },
            ],
            steps: [
              "Choose your favorite kind of community: rural, urban or suburb. Think of two reasons.",
              "Partner A tells: 'I like ___ the most because ... Also, ...' Then Partner B tells.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, change partners. Partner A says the same talk again, then Partner B.",
              "Listener's job: ask one follow-up question: 'Why do you like that?'",
            ],
            prompts: ["Why do you like ___?", "(cards: rural, urban, suburb)"],
            feedback: fixBecause,
            teacherNote: "Task repetition: the same task with a new listener each time makes the language more automatic because the speaker has already found the words. Do not add new language between rounds. Listen for a full clause after because (a subject and a verb, not 'because a park') and for 'Why do you ...?' in the listener's question.",
            tiers: [
              { level: "Support", task: "Give one reason with the frame.", frames: ["I like ___ because ___.", "Also, ___."] },
              { level: "Core", task: "Give two reasons without the board." },
              { level: "Stretch", task: "Give two reasons and compare: 'I like the suburb more than the city because it is quieter.'" },
            ],
          },
        },
        {
          after: "Complete sentences (SB 43 E)",
          slide: {
            kind: "writing",
            title: "Plan, write, check: my favorite community",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the opinion in the first sentence, the two reasons and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start each reason with First or Also, and use because.",
              "Check: tick the checklist. Swap with a partner: they underline every because and check that a verb comes after it.",
              "Teacher: while they write, look only at because + who + did what, and the comma after When or If. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The suburb",
              text: "I like the suburb the most because it is quiet and friendly. First, there is a big park near my house. I can play soccer there with my friends after school. Also, the streets are safe because there are not many cars. When I want to see a movie, we take the bus to the city. For these reasons, the suburb is the best community for me.",
            },
            organiser: [
              { label: "Opinion", prompt: "Which kind of community do you like the most? Say why in a few words." },
              { label: "Reason 1: First, ...", prompt: "What is one good thing about it? Say who or what and what happens." },
              { label: "Reason 2: Also, ... because ...", prompt: "What is another good thing? Why is it good?" },
              { label: "When / If sentence", prompt: "When or if you want something, what do you do? (When ..., ... / If ..., ...)" },
              { label: "Closing: For these reasons, ...", prompt: "Say your opinion again in new words." },
            ],
            frames: ["I like ___ the most because ___.","First, ___.","Also, ___ because ___.","When I ___, I ___.","For these reasons, ___."],
            checklist: [
              "My first sentence says my opinion with because",
              "After every because: who + did what (a verb!)",
              "A comma after When / If at the start (When I want to see a movie, we ...)",
              "No full stop before because, and no 'so' with because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your opinion again without looking, with two reasons.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. An opinion paragraph is where because earns its place: each reason needs who + did what. This paragraph is the script for the recorded talk 'My favorite kind of community', so say so to the class. Mark only two targets (a verb after because, and the comma after When / If) with a dot on the line; the child finds and fixes the mistake. The common slips (a full stop before because, 'so' with because) are on the grammar slide, so say them aloud once.",
            tiers: [
              {"level":"Support","task":"Write one sentence for each of three boxes with the frames: opinion, one reason, closing.","frames":["I like ___ the most because ___.","First, ___.","For these reasons, ___."]},
              {"level":"Core","task":"Write the whole paragraph: five or six sentences."},
              {"level":"Stretch","task":"Compare two places: 'I like the suburb more than the city because it is quieter.' Add one more reason."},
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite kind of community",
        prompt: "Tell us which kind of community you like the most: rural, urban or suburb. Give two reasons with because. Show a drawing of it if you can.",
        length: "60-90 seconds",
        steps: [
          "Choose your community and two reasons. Write three key words on a card.",
          "Say your talk three times to a grown-up or a toy. Each time a little smoother, like in class.",
          "Record it once. Look at the camera and keep going without long stops.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say which community you like, give two reasons with because, and keep talking.",
        words: ["rural area", "urban area", "suburb", "quiet", "busy", "park", "because", "also"],
        grammar: ["I like ___ the most because ...", "Also, ...", "Why do you like ___? Because ..."],
        rubric: [
          { label: "Two reasons", description: "Gives two reasons for the choice, one with 'because' and one with 'also'.", weight: 3 },
          { label: "Because clauses", description: "After because, says who and what happens: because it has a big park.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s in parks and has can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I like ___ because ___.", "Also, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["I like a(n) ___ the most because ___.", "Also, ___ because ___.", "It is ___ and ___."], tips: ["Say who and what in every reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like the ___ more than the ___ because ...", "If I lived there, I could ... because ...", "Why do you like your community? Tell me!"], tips: ["Compare two places and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u04-l5": {
      objectives: ["I can talk about why we are moving to a new place, three times, faster each time."],
      trim: { "60-second recall": 3, "Test our big ideas": 4, "Poster gallery": 9 },
      add: [
        {
          after: "Make the poster (SB 45 C)",
          slide: {
            kind: "fluency",
            title: "Poster talk 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give your poster talk to three friends (75, 60 and 45 seconds each). Both partners talk in every round. Each talk is shorter and smoother.",
            chunks: [
              "Our poster shows a family moving to a new place.",
              "We are moving because the father got a new job.",
              "We will miss our friends, but we are looking forward to a new school.",
              "I like the picture because it is bright and happy.",
            ],
            recycle: ["If a place has a park, families come.", "When it rains, we stay inside."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the poster talk, then Partner B. The listener counts the reasons on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A, then Partner B. Fast and smooth! The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "The listener asks the follow-up question after each talk. In the Poster gallery, Line B gives its talk first.",
            ],
            feedback: fixBecause,
            teacherNote: "4/3/2: the same talk, less time, new listener each round. The shrinking time pushes automaticity, and the one-minute fix between rounds 1 and 2 gives the children a chance to improve accuracy as well as speed. Do not add new language between rounds. Listen for 'We are moving' (be + -ing), the final -s in 'friends', and a full clause after because.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Our poster shows ___.", "We are moving because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add what you will miss and look forward to, and why.", frames: ["I will miss ___, but I'm looking forward to ___ because ___."] },
            ],
          },
        },
        {
          after: "How to write a letter (SB 44 Learn)",
          slide: {
            kind: "writing",
            title: "Grow my letter sentences",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a place word, a describing word or a reason with 'because'.",
              "Write your big sentence. Check it. Then read it aloud to your partner.",
            ],
            items: [
              { q: "I am moving. (add: to a new city, because ...)", answer: "I am moving to a new city because my mother got a new job." },
              { q: "I will miss my friends. (add: very much)", answer: "I will miss my friends very much." },
              { q: "The new school is big. (add: but I like it)", answer: "The new school is big, but I like it." },
              { q: "Please write to me. (add: when you can)", answer: "Please write to me when you can." },
            ],
            frames: ["I am moving to ___ because ___.", "I will miss ___, but ___.", "Please write to me when ___."],
            checklist: ["A comma before 'but'", "After because: who + did what", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your big sentences to your partner, then say your favorite one without looking.",
            teacherNote: "Expanding a bare sentence (who, where, why, how) is a quick way to grow long, accurate sentences before the 15-minute letter. Use sentences from the class letter plan so the children can use them straight away.",
            tiers: [
              { level: "Support", task: "Expand items 1 and 2 with the frames." },
              { level: "Core", task: "Expand all four sentences." },
              { level: "Stretch", task: "Write three big sentences of your own for your letter." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u04-l6": {
      objectives: ["I can say 'If / When ..., ...' and 'so' and 'because' sentences fast and right, with the comma pause."],
      trim: { "Remember it!": 5, "Town builders: build it and say it": 7 },
      add: [
        {
          after: "Maple Hill: ask and fill in",
          slide: {
            kind: "fluency",
            title: "Champion sprint: if, when, so, because",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with a little breath where the comma is.",
            chunks: [
              "If a town has a clinic, families feel safe.",
              "When a factory opens, the town has more jobs.",
              "A town has jobs, so families come.",
              "Families come because a town has jobs.",
              "What happens in a town when a factory opens?",
            ],
            recycle: ["I couldn't swim last year, but now I can.", "I like the suburb because it has a big park."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a town card, the class says the sentence." },
              { seconds: 60, say: "Boys ask, girls answer. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "Take a tiny breath where the comma is: 'If a town has a clinic, (breath) families feel safe.'",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: finish with the two mistakes you heard most, fixed on the board in one minute.",
            ],
            prompts: ["(card: clinic)", "(card: factory)", "(card: park)", "(card: school)"],
            feedback: fixIf,
            teacherNote: "A quick, high-energy recall of if / when, so and because together: mixing old and new phrases (spaced retrieval) keeps this unit's and Unit 3's grammar from fading. Listen for 'the town has' (not 'have') and for the present tense after if and when. The comma pause helps rhythm and writing at the same time.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["If a town has ___, ___.", "A town has ___, so ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Say the same idea two ways: with if, then with because." },
            ],
          },
        },
        {
          after: "Town builders: build it and say it",
          slide: {
            kind: "writing",
            title: "Dictogloss: the town that grew",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder: if or when first needs a comma. If the result comes first, there is no comma.",
              "Listen the first time. Do not write.",
              "Listen the second time. Write key words only: clinic, jobs, families, park, safe.",
              "In your group, build the text back. Check it against the folded text.",
            ],
            text: {
              title: "The town that grew",
              text: "If a small town has a clinic, families feel safe. When a factory opens, the town has more jobs, so more families come. People stay because there is a park near the school. The town grows when families are happy.",
            },
            frames: ["If a town has ___, ___.", "When ___, ___.", "People come because ___."],
            checklist: ["A comma after the if / when part", "The -s on has, opens and grows", "No comma when the result comes first"],
            sayIt: "Read your group's text aloud, then say it again to a new partner using only your key words.",
            teacherNote: "Read at a natural speed, twice, with clear final sounds ('has', 'feel'). The children rebuild a text full of this unit's grammar; accept different wording if the meaning and grammar are right. This also prepares the paragraph the children write later in the lesson.",
            tiers: [
              { level: "Support", task: "Write the key words and build two sentences with the frames." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild the text and add one more sentence with 'so' or 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What happens when a town grows",
        prompt: "Tell us about a town, real or invented, that families move to. Say what the town has, what happens when families come, and why you would or would not move there. Show a drawing if you can.",
        length: "60-90 seconds",
        steps: [
          "Plan three things your town has. Write them as key words on a card.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Take a tiny breath where the comma is, and keep going.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what the town has, use if or when and because, and keep talking without long stops.",
        words: ["clinic", "factory", "jobs", "families", "park", "safe", "grow", "so"],
        grammar: ["If / When ___, ___.", "___ so ___. / ___ because ___.", "The town has ___."],
        rubric: [
          { label: "If or when", description: "Uses if or when with the comma pause: If a town has a clinic, families feel safe.", weight: 3 },
          { label: "So and because", description: "Gives a reason with so or because and a full clause.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s in has, feels and families can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The town has ___.", "If a town has ___, ___.", "I like it because ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["If a town has ___, families ___.", "When ___ opens, the town has ___, so ___.", "I would move there because ___."], tips: ["Use both if and when once each."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["A town has ___, so families come. Families come because ...", "If a town has no ___, families ...", "Would you move there? Why?"], tips: ["Say the same idea with so and because, and ask the viewer a question."] },
        ],
      },
    },
  },
};
