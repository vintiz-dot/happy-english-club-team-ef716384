import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

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

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
// Pitched for ages 8-10. Signs: ? ask it, X say no, + join it, T change the time, P change the person.
function drill(o: {
  title: string;
  minutes?: number;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  join: string;
  t: string;
  real: string;
  slips: string;
  fix: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
  note: string;
}): Slide {
  const minutes = o.minutes ?? 7;
  const secs = minutes >= 7 ? [60, 90, 90] : [60, 75, 75];
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: secs[0], say: `Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join it with ${o.join}, T = ${o.t}, P = change the person). The class says the new sentence together.` },
      { seconds: secs[1], say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can, like X + or T P." },
      { seconds: secs[2], say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the child with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said.",
    ],
    prompts: o.prompts,
    feedback: `Prompt, do not tell. ${o.fix} For a sound, say it right yourself and let the child echo it (a recast). Say every -s, -ed and n't clearly yourself: children copy what they hear. In round 3 do not stop to correct every slip: note the two that matter and use them in the one-minute fix next time.`,
    teacherNote: `${o.note} A drill only helps when the last round is real: the children use the form for their own meaning, so it is not just a game with signs. Keep it brisk; a drill that drags loses its point. Mark nothing in writing: this is about speed and accuracy in speech.`,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say each new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence with all the signs, and join two signs together when you can." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u04-l1": {
      objectives: ["I can describe rural, urban and suburban places in whole sentences, without long stops."],
      trim: { "Four corners: where am I?": 3, "Stand on the line": 3 },
      drop: ["Guess my place"],
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
          after: "Place sprint: what is there?",
          slide: drill({
            title: "Grammar drill: a place has, people go",
            goal: "Change the sentence about a place fast and right: ask it, say no, join it with because, change the time or the person. Then talk about the place where you live.",
            chunks: [
              "In a rural area there are farms, and in an urban area there are tall buildings.",
              "If a place has a big park, children play there after school.",
              "Does a rural area have tall buildings? No, it doesn't, but it has big fields.",
              "Many families live in the suburb because it is quiet.",
              "Last year my cousin lived in a village, but now he lives in a city.",
              "Which place do you like better, and why do you like it?",
            ],
            recycle: ["Have you ever lived in a big city?", "We used to live in a small village."],
            prompts: ["A city has busy streets. (?)", "A village has a metro. (X)", "A suburb is quiet. (+ because)", "We live in a city. (T: last year)", "A town has a park. (P: they)"],
            join: "because / so / if",
            t: "change the time: now, last year",
            real: "Real talk: tell your partner about the place where you live. Say what it has, what you like and what you would change. Your partner asks one question.",
            slips: "'There have a park', 'in urban area' or 'Does it has'",
            fix: "For 'There have a park' say 'There ...?' with a rising voice and wait for 'is'; for 'in urban area' hold up one finger for 'an'; for 'Does a village has' say 'Does a village ...?' and wait for 'have'; for a missing -s tap your wrist.",
            support: ["Does a ___ have ___? Yes, it does.", "A ___ doesn't have ___."],
            stretch: "Look ahead with will: 'If a place has a hospital, more families will come.' Then join two signs and add a question.",
            stretchFrames: ["If a place has ___, ___ will ___.", "___, so ___. Do you think ___?"],
            note: "Children who have never met if in this unit can still do it as a whole phrase: 'If a place has a park, ...' is a chunk to repeat, not a rule to explain. The T sign uses the past (last year) here; the future with will appears only in the Stretch, as a first peek at Level 4. Vietnamese has no verb endings, so listen for 'There have', 'does ... has' and the missing -s on farms and fields.",
          }),
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
      trim: { "Class word web": 4, "Look first, then predict": 6, "Word detectives: belongings, immigrant, move abroad, experiences": 3, "Home talk: favorite places": 3, "Moving-day interview": 5 },
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
          after: "The moving story: tell it again",
          slide: drill({
            title: "Grammar drill: why a family moved",
            goal: "Change the sentence about a family that moved fast and right: ask it, say no, join it with because or if, change the time or the person. Then talk about someone you know who moved.",
            chunks: [
              "The family moved from a village to a city because the father got a new job.",
              "Did the family move because of the school? No, they didn't, but the new school is good.",
              "If a family moves to a city, the children go to a new school.",
              "When children miss their friends, they call them.",
              "The mother got a job, so they moved in the summer.",
              "Why did your family move here, and how do you feel about it?",
            ],
            recycle: ["We used to live in a small village.", "I have never seen a really big city."],
            prompts: ["The family moved to a city. (?)", "They moved because of the school. (X)", "The mother got a job. (+ so)", "The children go to a new school. (T: yesterday)", "She misses her friends. (P: they)"],
            join: "because / so / if / when",
            t: "change the time: now, yesterday",
            real: "Real talk: tell your partner about someone you know who moved, or a place you would like to move to. Say where from, where to and why. Your partner asks one question.",
            slips: "'The father get a new job', 'because a new job' or 'They miss'",
            fix: "For 'get a new job' say 'The father ...?' and hold up a finger for -ed or the past form 'got'; for 'because a new job' repeat it with a rising voice and 'because who ...?'; for 'Did they moved' tap the word 'Did' and wait for 'move'.",
            support: ["Did the family ___? Yes, they did.", "They moved because ___."],
            stretch: "Look ahead with will: 'If the family moves, the children will make new friends.' Join two signs and ask your partner what they would do.",
            stretchFrames: ["If a family moves, ___ will ___.", "___ because ___. What will you ___?"],
            note: "This lesson is before the unit's if and when rule, so the if and when sentences are chunks the children say as whole phrases; do not stop to explain them. The reasons with because and so are the main work, in the past tense of the moving story. The will in the Stretch tier is a first peek at the first conditional that Lesson 3 names. Listen for the final -ed in 'moved' and for 'got'.",
          }),
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
      objectives: ["I can ask and answer 'What do you do when ...?' fast, with if and when.", "I can say what will happen next: If it rains tomorrow, I will take an umbrella."],
      trim: { "If I clap, you ...": 4, "Listen and read (SB 41 D)": 8, "Discover the rule (SB 41 E)": 8, "Our big idea": 4 },
      drop: ["If-chain"],
      add: [
        {
          after: "Present real conditional: if and when",
          slide: {
            kind: "grammar",
            title: "Level 4 step: the first conditional with will",
            hook: "The first conditional: If + present, will / won't + verb (If we move to the city, I will go to a new school.). Look into the future: if one thing happens, another thing will happen.",
            form: [
              { label: "If first", pattern: "If + subject + present, + subject + will + verb   (If we move to the city, I will go to a new school.)" },
              { label: "Result first (no comma)", pattern: "Subject + will + verb + if + subject + present   (I will go to a new school if we move to the city.)" },
              { label: "Negative", pattern: "If + subject + present, + subject + won't + verb   (If it is too far, I won't walk.)" },
              { label: "Question", pattern: "What will + subject + do + if + subject + present?   (What will you do if you miss your friends?)" },
            ],
            explanation: [
              "In this unit you said what always happens: 'If I am thirsty, I drink water.' Now we look at something that may happen in the future. The if part says the thing that may happen. The will part says the result.",
              "We use it for plans, warnings and promises: 'If we move to the city, I will go to a new school.' Look at the if part: it stays in the present, just like the rule you learned today. Only the result part gets will (or won't). So it grows out of the same sentence you already know, with one new word.",
              "This is grammar you will meet again in Oxford Discover 4, where you will use it to talk about choices and about what will happen next. Practise saying it as one whole piece: 'If ..., I will ...'.",
            ],
            examples: [
              { text: "If we move to the city, I will go to a new school." },
              { text: "If my friends visit, we will play in the park." },
              { text: "If I miss my old home, I will call my grandmother.", note: "The if part is present: miss, not will miss." },
              { text: "My family will be happy if the new job is good.", note: "Result first: no comma." },
              { text: "If the apartment is too small, we won't stay there.", note: "won't = will not." },
              { text: "What will you do if you feel lonely in a new place?" },
            ],
            pitfalls: [
              { wrong: "If we will move to the city, I will go to a new school.", right: "If we move to the city, I will go to a new school.", why: "After if we use the present. Will goes only in the result part." },
              { wrong: "If we move to the city, I will goes to a new school.", right: "If we move to the city, I will go to a new school.", why: "After will the verb has no -s, no -ed and no 'to'." },
              { wrong: "If it is too far, I will don't walk.", right: "If it is too far, I won't walk.", why: "won't already means will not, so do not add don't." },
            ],
          },
        },
        {
          after: "Level 4 step: the first conditional with will",
          slide: drill({
            title: "Grammar drill: if, when and will",
            goal: "Change the if and when sentence fast and right: ask it, say no, join it, change the person. Then look ahead and say what will happen.",
            chunks: [
              "If I am thirsty, I drink water.",
              "When it rains, we stay inside.",
              "What do you do when you are nervous?",
              "If it is cold tomorrow, I will wear a coat.",
              "If we move to the city, I will go to a new school.",
              "What will you do if you miss your friends?",
            ],
            recycle: ["We used to live in a small village.", "I am good at making new friends."],
            prompts: ["If she is tired, she goes to bed early. (?)", "When it rains, we play outside. (X)", "I am hungry. I eat a snack. (+ if)", "If it is cold, he wears a coat. (P: they)", "Round 3, T: If it rains tomorrow, ... (will)"],
            join: "if / when",
            t: "in round 3 only: look at tomorrow and use will",
            real: "Real talk with will: tell your partner two things you will do if something happens to you this week (If it rains on Saturday, I will ...). Your partner asks 'What will you do if ...?' and says 'Me too!' or 'Not me.'",
            slips: "'If he hungry', 'she sleep' or 'If it will rain'",
            fix: "For 'If he hungry' start 'If he ...?' and wait for 'is'; for 'she sleep' hold up a finger for the -s; for 'If it will rain' raise your voice on 'will?' and let the child say 'rains', because after if we use the present; for 'I will goes' tap your wrist and wait for 'go'.",
            support: ["If I am ___, I ___.", "If it ___ tomorrow, I will ___."],
            stretch: "Use two signs at once, then add a negative and a question: 'If it rains tomorrow, I won't go to the park. What will you do?'",
            stretchFrames: ["If ___, I won't ___.", "What will you do if ___?"],
            note: "Rounds 1 and 2 are the unit's own rule: if and when with the present in both parts. The Level 4 step enters at the T sign in round 3 and in the Stretch tier: the if part stays in the present, and only the result gets will. Keep the contrast alive by saying both: 'If it rains, I stay inside' and 'If it rains tomorrow, I will stay inside'.",
          }),
        },
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
      trim: { "Where does my family come from? (SB 42 Think)": 3, "Suffixes for countries (SB 43 D)": 8 },
      drop: ["Reason relay"],
      add: [
        {
          after: "Why and because: giving reasons",
          slide: drill({
            title: "Grammar drill: because, so and will",
            minutes: 6,
            goal: "Change the sentence with because fast and right: ask it, say no, join it with so or if, change the time or the person. Then use if and will for your own plans.",
            chunks: [
              "Why did they move? Because the mother got a new job.",
              "They moved because the mother got a new job, so the children changed schools.",
              "Why do you like the suburb? Because it is quiet and it has a big park.",
              "They didn't move because of the school.",
              "If the city is too busy, we will live in the suburb because it is quieter.",
              "If you move to a new place, what will you miss, and why?",
            ],
            recycle: ["I enjoy living near a park.", "We used to live in a village."],
            prompts: ["The family moved. (? Why?)", "They moved because of the school. (X)", "I like the park. (+ because)", "We moved last year. (T: next year, will)", "She likes the village. (P: they)"],
            join: "because / so / if",
            t: "change the time: last year, next year with will",
            real: "Real talk: tell your partner one thing you will do if you move to a new place, and why. Use If ... will ... because ... Your partner asks 'Why?' and you answer with because.",
            slips: "'Why you like it?', 'because a new job' or 'so' with because",
            fix: "For 'Why you like it?' repeat it with a rising voice, start 'Why ...?' and wait for 'do'; for 'because a new job' hold up one finger and ask 'because who ...?'; for 'Because it is quiet, so I like it' cross out the 'so' with a finger; for 'I will to go' tap your wrist and wait for 'go'.",
            support: ["Why do you ___? Because ___.", "If ___, I will ___."],
            stretch: "Use two signs at once and stack a reason on a plan: 'If the city is busy, we will move to the suburb because it is quieter, so ...'",
            stretchFrames: ["If ___, we will ___ because ___.", "___, so ___."],
            note: "The unit grammar is why and because; round 3 and the Stretch tier use the Level 4 step again: if in the present, will in the result, and because still needs who + did what. Keep this one at six minutes. Do not teach new words: the children say the sentences they already know with a new sign.",
          }),
        },
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
          "Add one sentence with if and will, like: If I live there, I will play in the park every day.",
          "Record it once. Look at the camera and keep going without long stops.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say which community you like, give two reasons with because, and keep talking.",
        words: ["rural area", "urban area", "suburb", "quiet", "busy", "park", "because", "also"],
        grammar: ["I like ___ the most because ...", "Also, ...", "Why do you like ___? Because ...", "If I live there, I will ___."],
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
      trim: { "60-second recall": 3, "Poster gallery": 5 },
      drop: ["Test our big ideas"],
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
          after: "Poster talk 4-3-2",
          slide: drill({
            title: "Grammar drill: moving plans with if and will",
            goal: "Change the sentence about moving plans fast and right: ask it, say no, join it, change the time or the person. Then promise something to a friend.",
            chunks: [
              "We are moving to a new city because my father got a new job.",
              "If we move to the city, I will go to a new school.",
              "Will you miss your friends? Yes, I will, but I will call them every week.",
              "I won't forget my old friends if I make new ones.",
              "If my friends visit, we will play in the park.",
              "What will you do if you feel lonely in the new place?",
            ],
            recycle: ["I used to live in a small village.", "I enjoy meeting new people.", "Have you ever lived in a big city?"],
            prompts: ["I will miss my friends. (?)", "I will forget my old home. (X: won't)", "I will call you. (+ if you ...)", "We move in June. (T: next summer, will)", "She will go to a new school. (P: they)"],
            join: "if / when / because",
            t: "put it in the future with will or won't",
            real: "Real talk: make a promise or a plan for a friend who is moving away. Say two sentences with If ... I will ... Your partner answers 'Thank you!' and asks one question.",
            slips: "'If we will move', 'I will goes' or 'I will to call'",
            fix: "For 'If we will move' raise your voice on 'will?' and let the child say 'move'; for 'I will goes' hold up a finger and wait for 'go'; for 'Will you to miss' tap the word 'to' and wait for 'miss'; for a sound, say 'won't' yourself and let the child echo it.",
            support: ["Will you ___? Yes, I will. / No, I won't.", "If ___, I will ___."],
            stretch: "Use two signs at once and add when: 'When we move, I will pack my books, and if I feel lonely, I will write to you.'",
            stretchFrames: ["When ___, I will ___.", "If ___, I will ___, and if ___, I will ___."],
            note: "The poster talk just before this lesson's drill used the same moving plans; now the children change the sentences by sign so that 'if + present, will + verb' comes out without thinking. The will sentences are the Level 4 step from Lesson 3. Listen for 'will' said clearly and for the verb after it with no -s and no 'to'.",
          }),
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
      trim: { "Remember it!": 3, "Town builders: build it and say it": 5 },
      drop: ["Statue town: freeze and say"],
      add: [
        {
          after: "Grammar: if and when, with the comma that waits",
          slide: drill({
            title: "Grammar drill: champions, if, when and will",
            goal: "Change the town sentence fast and right: ask it, say no, join it, change the person. Then use both rules: if and when for what always happens, and if and will for what will happen.",
            chunks: [
              "If a town has a clinic, families feel safe.",
              "When a factory opens, the town has more jobs.",
              "If a town has a park, families will stay there.",
              "Families won't come if the town has no jobs.",
              "What will happen if a factory closes?",
              "A town has jobs, so families come.",
            ],
            recycle: ["I have never lived in a big city.", "We used to live in a small town.", "I want to live near my friends."],
            prompts: ["If a town has a school, families stay. (?)", "When a factory opens, the town has more jobs. (X)", "A town has a park. Families come. (+ if)", "If a town has a clinic, families feel safe. (P: towns)", "T: If a town builds a clinic, ... (will)"],
            join: "if / when / so / because",
            t: "look ahead: use will or won't in the result",
            real: "Real talk: you are the mayor of a new town. Tell your partner two things your town has and what will happen if families come. Use If ... will ... once and When ... once. Your partner asks 'What will happen if ...?'",
            slips: "'The town have more jobs', 'If it will' or a comma missing after the if part",
            fix: "For 'The town have' start 'The town ...?' and wait for 'has'; for 'If a town will have' raise your voice on 'will?' and let the child say 'has'; for a missing comma tap the board at the pause and have the child take a tiny breath; for 'will' + -s tap your wrist.",
            support: ["If a town has ___, families ___.", "If ___, families will ___."],
            stretch: "Make a warning and a promise: 'If a town has no jobs, families won't stay. If you build a clinic, families will feel safe.' Join two signs and say what the mayor should do.",
            stretchFrames: ["If a town has no ___, families won't ___.", "If you build ___, ___ will ___."],
            note: "The last lesson of the unit: the drill covers the unit's rule (if and when with the present, the comma that waits) and the Level 4 step (will in the result). Keep the two sounds apart by saying them side by side. Listen for the present after if, 'has' with a town, and the comma pause before the result.",
          }),
        },
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
          "Add one sentence with if and will, like: If a town builds a school, more families will come.",
          "Record it once. Take a tiny breath where the comma is, and keep going.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what the town has, use if or when and because, and keep talking without long stops.",
        words: ["clinic", "factory", "jobs", "families", "park", "safe", "grow", "so"],
        grammar: ["If / When ___, ___.", "___ so ___. / ___ because ___.", "The town has ___.", "If ___, ___ will ___."],
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
