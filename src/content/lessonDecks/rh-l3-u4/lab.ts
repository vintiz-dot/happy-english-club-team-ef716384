import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 4 "Let's Work Together"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Class Jupiter, ages 9-10,
// strong children preparing for the Hanoi grade-6 selective-school entrance exam.
// Every lesson gets one fluency routine (the unit's grammar said again and again as
// whole sentences, a little faster each round, with Unit 3's phrases mixed back in)
// and one short writing routine that also practises the exam grammar point in the
// papers' formats (sentence combining, fix it). Every other lesson ends with a
// recorded talk for home. Time comes from slack in the lessons and from one shortened
// reading, never from grammar, checks or homework. All text is original.

const base =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say it again use the fixed form. For grammar, prompt the child to fix it (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice) rather than saying it for them; for a sound, say it right and let them echo it. Say every final -s and -ed clearly yourself: children copy what they hear. ";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const drillFeedback =
  "Prompt, do not tell: for a missing -s or -ed hold up a finger and say the phrase up to the gap with a rising voice; for a wrong pattern point to the frame on the board; for a sound, a quick recast is fine and the child echoes it. Say every final -s, -ed and n't clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

const STEP = "Level 4 step: Agreeing and disagreeing (So do I, Neither do I)";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
// Pitched for ages 9-10 working at B1, with the entrance exam's rewrite format in the T sign and Stretch.
function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  fb: string;
  note: string;
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
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when / unless, T = change the time or tense, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can: X + or T P. B also says it another way with the same meaning when the card shows R (like a rewrite in the exam)." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change it and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them with the class, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about you or give your own opinion, and remember one thing your partner said.",
    ],
    prompts: o.prompts,
    feedback: o.fb + " " + drillFeedback,
    teacherNote: o.note,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const rhL3U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u4-l1": {
      objectives: ["I can say sentences with want to, enjoy -ing and let me fast, without stopping."],
      trim: { "The paper tower challenge": 9, "Is it cooperation? (concept formation)": 9, "Write: a 'help wanted' advert": 13 },
      add: [
        {
          after: "Verb patterns: to + verb, verb-ing, bare verb",
          slide: drill({
            title: "Grammar drill: to, -ing or no to",
            goal: "Change the sentence fast and right: pick to + verb, verb + -ing or the bare verb. In round 3, talk about what you really want, enjoy and are good at.",
            chunks: [
              "I want to join the club because I enjoy working with other people.",
              "She hopes to win, but she doesn't mind losing.",
              "Our coach let us choose the team, so we felt proud.",
              "Do you like cooking? Yes, I do, and I'm good at making soup.",
              "They finished building the bridge without asking for help.",
              "He agreed to share his notes, although he was tired.",
            ],
            recycle: ["Seeds need water, light and warm soil.", "A gardener is a person who looks after plants.", "The school garden is watered every morning."],
            prompts: ["? I want to join the club.", "X She hopes to win.", "+ (because) I enjoy working with other people.", "T They finished building the bridge. (last week)", "P I'm good at making soup. (he)", "R 'Swimming is fun for me.' = I ___ swimming."],
            real: "Real talk: use the signs to tell your partner true things: what you want to do this year, what you enjoy, what you are good at and what you don't mind. Ask two questions and give a reason for each answer.",
            slips: "'I enjoy to play', 'She wants playing', 'My mum let me to go'",
            fb: "For 'I enjoy to play' say 'I enjoy ...?' and draw a small circle in the air for -ing; for 'She wants playing' hold up two fingers for 'to'; for 'let me to go' hold up a hand like a stop sign for the extra 'to'.",
            note: "The Unit 4 verb patterns have to be automatic by the end of the lesson, because the exam punishes the wrong pattern and nobody has time to think in a paper. Vietnamese has no 'to' or '-ing' after the verb, so children need many repeats to hear the difference. The R sign is the exam's rewrite format: say the same meaning in other words ('Swimming is fun for me' = 'I enjoy swimming'; 'My teacher allowed us to choose' = 'My teacher let us choose'). Round 3 must be real: true wants and true opinions.",
            support: ["I want to ___.", "I enjoy ___ing.", "I'm good at ___ing."],
            stretch: "Join with because or although and rewrite one sentence with the same meaning: 'It is fun for me to cook' = 'I enjoy cooking.'",
            stretchFrames: ["I enjoy ___ing because ___.", "I want to ___, although ___."],
          }),
        },
        {
          after: "Exam practice: verb patterns",
          slide: {
            kind: "fluency",
            title: "Verb pattern sprint: to or -ing?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every sentence as one smooth piece, with the right pattern, and do not stop.",
            chunks: [
              "We decided to build a tall tower.",
              "I enjoy working in a team.",
              "She wants to be team captain.",
              "Our teacher let us choose our groups.",
              "Thanks for helping me!",
            ],
            recycle: ["Seeds need water, light and warm soil.", "A gardener is a person who looks after plants."],
            rounds: [
              { seconds: 90, say: "Together: the teacher shows a card (want + play), the class says the whole sentence. Then in pairs, A shows, B says." },
              { seconds: 60, say: "New partner. Same cards, faster. Count your sentences on your fingers." },
              { seconds: 45, say: "New partner. Say it without looking at the board. How many can you say?" },
            ],
            steps: [
              "Look at the card: a verb and a word, like 'enjoy + cook'. Say a WHOLE sentence about you or your team.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I enjoy to play') and fix them with the class; then go on.",
              "Change partners when you hear the bell.",
              "In round 3, listen for your partner's patterns: tick 'to', '-ing' or 'no to' on your fingers.",
            ],
            prompts: ["(card: want + play)", "(card: enjoy + cook)", "(card: decide + share)", "(card: let + us choose)", "(card: thanks for + wait)"],
            feedback:
              base +
              "Here: if a child says 'I enjoy to play', say 'I enjoy ...' and pause so they find 'playing'; for 'She wants playing', point to 'wants' and make the shape of 'to' with your fingers. For 'My mum let me to go', hold up a hand with 'no to' and wait.",
            teacherNote:
              "Whole sentences only: 'enjoy playing' and 'want to play' must become one automatic piece, because the exam punishes the wrong pattern and children cannot stop to think in a paper. Children have no habit of choosing between 'to' and '-ing' (their first language has neither), so they need many repeats to feel the difference. Listen for 'to' dropped after want and decide, and for final -s on wants and enjoys.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and say the sentence with a friend.", frames: ["I want to ___.", "I enjoy ___ing."] },
              { level: "Core", task: "Say the sentence alone, without the board." },
              { level: "Stretch", task: "Add a reason: 'I enjoy cooking because it is fun to cook together.'", frames: ["I enjoy ___ing because ___."] },
            ],
          },
        },
        {
          after: "4/3/2: my best team ever",
          slide: {
            kind: "writing",
            title: "My best team ever: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: who, what did we want, what did we decide?",
              "Write: turn your notes into one paragraph of about 80 words. Use First, Then and Thanks to.",
              "Check: tick the checklist. Swap with a partner: they underline one 'to + verb' and one 'verb + -ing' and tell you one thing they liked.",
              "Teacher: while they write, look only at to or -ing after a verb (want to play, enjoy playing) and at 'let us' with no 'to'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The paper tower",
              text: "Last month, my class decided to build a tall tower from paper, and it was my best team ever. First, we wanted to win, so we planned the jobs together. My friend enjoyed drawing, so she designed the shape. Another girl was good at cutting, so she kept cutting the paper strips. Then we finished building without stopping, and our tower stood up! Our teacher let us take a photo. I love working in a team because everyone learns to listen.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What did your team decide to do? When? Say why it was your best team." },
              { label: "Detail 1: First, ...", prompt: "What did you want to do first? Use 'wanted to' + verb." },
              { label: "Detail 2: Then, ...", prompt: "Who enjoyed or was good at something? Use 'enjoyed ...ing' or 'good at ...ing'." },
              { label: "Closing: I love ...", prompt: "End with what you learned: 'I love working in a team because ...'" },
            ],
            frames: ["Last month, my team decided to ___.", "First, we wanted to ___, so we ___.", "My friend enjoyed ___ing, so ___.", "I love working in a team because ___."],
            checklist: [
              "My first sentence says what we decided to do",
              "After want, decide, need: to + verb. After enjoy, finish, good at: verb + -ing",
              "Our teacher let us + plain verb, with no 'to'",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. The exam asks for about 80-100 words on a familiar topic, and this is the first whole paragraph of the unit, grown from the combining sentences done in earlier lessons. Mark only two targets (to or -ing after the verb, and no 'to' after let) with a dot on the line; the child finds and fixes the mistake. The model is original. This paragraph can be the first draft of the help-wanted advert's opening.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Last month, my team decided to ___.", "I love working in a team because ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a sentence about a problem and how your team fixed it, with 'instead of' + -ing." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u4-l2": {
      objectives: ["I can tell what people usually do and what they are doing right now, with no long stops."],
      trim: { "Write: a day in a family business": 11, "Market reporter": 9 },
      add: [
        {
          after: "Present simple or present continuous?",
          slide: drill({
            title: "Grammar drill: every day or right now?",
            goal: "Change the sentence fast and right: ask it, say no, join it, change the time or the person. In round 3, tell your partner what you usually do and what is different this week.",
            chunks: [
              "My dad usually cooks dinner, but tonight he is cooking noodles for us.",
              "Do you walk to school every day? No, I don't. I go by bike.",
              "Right now, the students are working in groups, and they are not talking about the weekend.",
              "She knows the answer, so she isn't looking at her notes.",
              "We are having a class party on Friday, because it is the end of the unit.",
              "I don't like crowded markets, but I love this one.",
            ],
            recycle: ["I enjoy working in a team.", "We decided to build a tall tower.", "Our teacher let us choose our groups."],
            prompts: ["? My dad usually cooks dinner.", "X She is looking at her notes.", "+ (but) I love this market.", "T We are having a party on Friday. (every Friday)", "P I go by bike. (she)", "R 'It is my cousin's habit to sleep late.' = My cousin usually ___."],
            real: "Real talk: tell your partner what you usually do on a school day and what you are doing differently this week. Ask 'Do you ...?' and 'Are you ...ing ...?' and answer in whole sentences.",
            slips: "'She is knowing', 'Look! The baby sleeps', 'He go to market', a missing is / are",
            fb: "For 'She is knowing' say 'She ... the answer?' and shake your head at 'is knowing' so they find 'knows'; for 'Look! He sleeps' point to 'Look!' on the board so they find 'is sleeping'; for 'He go' hold up one finger for -es.",
            note: "Two tense choices decide many exam items: a habit or a fact is present simple, something happening now or this week is present continuous, and state verbs (know, like, want, need) never take -ing. Vietnamese has no be verb here, so 'She working' is common: listen for the missing is / are and for the -s on he, she, it. The T sign flips a habit into 'now' and back, which is exactly the contrast the exam tests. Round 3 must be true.",
            support: ["Every day I ___.", "Right now I am ___ing.", "I like ___."],
            stretch: "Join a habit with something different today, and rewrite one sentence with the same meaning: 'It is my cousin's habit to sleep late' = 'My cousin usually sleeps late.'",
            stretchFrames: ["Usually ___, but today ___ is ___ing.", "At the moment ___, so ___."],
          }),
        },
        {
          after: "Market reporter",
          slide: {
            kind: "fluency",
            title: "Market reporter: say it twice",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Report on the same market picture twice, with two different partners. Partner A reports, then Partner B. The second report is smoother.",
            chunks: [
              "Every morning, the sellers arrange their fruit.",
              "Right now, a woman is weighing some mangoes.",
              "At the moment, two children are carrying baskets.",
              "Usually the buyers bargain, but today they are in a hurry.",
              "I know that stall, and I like the sweet pineapples.",
            ],
            recycle: ["The school garden is watered every morning.", "Seeds need water, light and warm soil."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A describes the market picture, then Partner B does. What do people do every day, and what are they doing right now? Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same report, then Partner B. Fast and smooth! Listener: tick every 'is / are + -ing' you hear." },
            ],
            steps: [
              "Look at the same market picture each time. In each round, Partner A reports, then Partner B reports. First say what people usually do, then what they are doing now.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'The baby sleeps' for 'Look!') and fix them with the class; then go on.",
              "When the bell rings, change partners and give the same report again (Partner A, then Partner B).",
              "The listener says one thing they liked, then swap.",
            ],
            prompts: ["(picture: a busy morning market)", "Every morning ___.", "Right now ___ is ___ing."],
            feedback:
              base +
              "Here: if a child says 'Look! The baby sleeps', say 'Look! The baby ...?' and point to 'now' on the board so they find 'is sleeping'. For 'He go to market every day', hold up one finger and wait for the -es. For 'She is knowing', say 'know ...?' with a shake of the head and let them find 'knows'.",
            teacherNote:
              "Task repetition is a well-supported route to speed: the same picture means the second report uses words already found, so the child's attention goes to the verb forms. Listen for the -s on he/she/it verbs, the missing 'is' or 'are' (Vietnamese has no be here, so 'She working' is common), and -ing on state verbs like 'knowing'.",
            tiers: [
              { level: "Support", task: "Use the frames and the picture; say one 'every day' and one 'right now' sentence.", frames: ["Every morning, the sellers ___.", "Right now, a woman is ___."] },
              { level: "Core", task: "Give a full report of four or five sentences without the board." },
              { level: "Stretch", task: "Add a contrast: 'Usually she sells fish, but today she is selling flowers.'", frames: ["Usually ___, but today ___ is ___ing."] },
            ],
          },
        },
        {
          after: "Exam practice: give the correct form",
          slide: {
            kind: "writing",
            title: "Fix it: the market reporter's notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "The reporter wrote quickly and made mistakes. Read each note with your partner.",
              "Find the mistake: a missing -s, a missing is / are, or -ing on a verb like know.",
              "Write the note the right way, then read it aloud together.",
            ],
            items: [
              { q: "Look! The baby sleeps.", answer: "Look! The baby is sleeping." },
              { q: "My uncle sell vegetables every day.", answer: "My uncle sells vegetables every day." },
              { q: "She is knowing the seller.", answer: "She knows the seller." },
              { q: "Right now the children helping their mother.", answer: "Right now the children are helping their mother." },
              { q: "Does he works on Sundays?", answer: "Does he work on Sundays?" },
            ],
            checklist: ["Every day, usually, often: verb + -s for he, she, it", "Now, right now, Look!: am / is / are + verb-ing", "know, like, want, need: no -ing"],
            sayIt: "Read the fixed notes to your partner as a news reporter, then say two of them without looking.",
            teacherNote: "This is the exam's 'give the correct form' and 'find the mistake' formats with the errors Vietnamese children make most: the dropped -s and the missing be verb. Fix item 1 together first. Focus on two error types at a time: say 'today we look for the -s and the is / are'.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 4 with the checklist beside you." },
              { level: "Core", task: "Fix all five items." },
              { level: "Stretch", task: "Write two more notes with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My family's market day",
        prompt: "Tell us about a family business or a market you know. Say what people usually do there every day, and what is happening right now in your picture or drawing.",
        length: "60-90 seconds",
        steps: [
          "Draw a quick picture of a market, a shop or a family business.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say what people do every day and what they are doing now. Keep talking without long stops.",
        words: ["market", "seller", "customer", "stall", "bargain", "every morning", "right now"],
        grammar: ["Present simple: every day, usually", "Present continuous: right now, at the moment", "know, like, want: no -ing"],
        rubric: [
          { label: "Every day and right now", description: "Says what people usually do and what they are doing now, with the right tense for each.", weight: 3 },
          { label: "Verb endings", description: "Uses -s after he, she, it and is / are + -ing; the final -s can be heard.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Market words", description: "Uses words from the unit: stall, seller, customer, bargain.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Every morning, the sellers ___.", "Right now, a woman is ___ing."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["Every day, my ___ ___s at the ___.", "At the moment, the customers are ___ing.", "I know the ___ and I like ___."], tips: ["Say two sentences for every day and two for right now."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Usually ___, but today ___ is ___ing.", "I think the busiest time is ___ because ___."], tips: ["Add a contrast and your own opinion."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u4-l3": {
      objectives: ["I can suggest an idea, agree or say no politely, and keep a conversation going."],
      trim: { "Write: the story from a sibling's view": 12, "Plan a surprise in threes": 9 },
      add: [
        {
          after: "Suggestions and teamwork phrasal verbs",
          slide: {
            kind: "grammar",
            title: STEP,
            hook: "Your friend says something about themselves. In three or four short words you can say 'me too', or 'not me', like a grown-up speaker.",
            form: [
              { label: "Same, positive: So + helper + I", pattern: "So + the same helper verb as your friend + I.  (I like markets. So do I.)" },
              { label: "Same, negative: Neither + helper + I", pattern: "Neither + the same helper verb + I.  (I don't like crowds. Neither do I. / I can't swim. Neither can I.)" },
              { label: "Different: I don't / I do", pattern: "I don't. / I do. / I can't. / I am.  (I like crowds. I don't. / I don't like waiting. I do.)" },
              { label: "The helper must match", pattern: "do / does / did · am / is / are · can · will · would · have  (She likes it. So does he. / I'd rather ask. So would I.)" },
            ],
            explanation: [
              "When a friend says something about themselves, we often say in a few words that we are the same, or different. If it is the same and positive, we say 'So do I.' If it is the same and negative, we say 'Neither do I.' If it is different, we say 'I don't' or 'I do'. The answer uses the same helper verb as the speaker: do after 'like', am after 'I'm', can after 'can', would after 'I'd'.",
              "It keeps a talk going, and it sounds natural. 'Me too' is fine, but 'So do I' shows more control, and it often appears in dialogues. The word order is the surprise: after So or Neither the helper verb comes first, then I. The word Neither is already a 'no', so you do not add another one.",
              "This lesson is about suggestions and agreeing in a team: 'Why don't we set up a stall?' 'Sure, why not?' Now you can also share an opinion with a teammate: 'I'd rather ask Dad.' 'So would I.' This is grammar you will meet again at the next level, so every time you practise it now, that level gets easier.",
            ],
            examples: [
              { text: "I like working in a team. So do I.", note: "same, positive: do" },
              { text: "I don't enjoy waiting for others. Neither do I.", note: "same, negative: Neither" },
              { text: "I'm good at drawing posters. So am I.", note: "be: am" },
              { text: "I can't carry this box alone. Neither can I.", note: "can" },
              { text: "I'd rather work in a small group. So would I.", note: "would" },
              { text: "I love crowded markets. I don't. I prefer quiet ones.", note: "different: I don't" },
            ],
            pitfalls: [
              { wrong: "I like markets. So I do.", right: "I like markets. So do I.", why: "After So the helper verb comes first, then I." },
              { wrong: "I don't like crowds. So do I.", right: "I don't like crowds. Neither do I.", why: "The same negative needs Neither. So is only for a positive sentence." },
              { wrong: "I can't swim. Neither don't I.", right: "I can't swim. Neither can I.", why: "Neither already means no, so do not add n't. Use the same helper as your friend." },
            ],
          },
        },
        {
          after: STEP,
          slide: drill({
            title: "Grammar drill: suggest, agree, So do I",
            goal: "Change the sentence fast and right with suggestions and phrasal verbs. In round 3, agree or disagree with your partner using So do I, Neither do I or I don't.",
            chunks: [
              "Why don't we set up a stall? Sure, why not?",
              "How about asking Mum? I'd rather ask Dad, because he is better at maths.",
              "Let's work it out together. Good idea! I don't want to give up.",
              "I like this idea. So do I. I don't mind setting it up.",
              "I can't carry it alone. Neither can I. Let's ask for help.",
              "We turned the offer down because it was too expensive.",
            ],
            recycle: ["Right now, a woman is weighing some mangoes.", "Usually the buyers bargain, but today they are in a hurry.", "I enjoy working in a team."],
            prompts: ["? Why don't we set up a stall?", "X Let's give up.", "+ (because) I'd rather ask Dad.", "T We turned the offer down. (tomorrow: We will ...)", "P I can't carry it alone. (she)", "R 'Let's set up a stall.' = Why don't we ___?"],
            real: "Real talk: plan a surprise for the class with your partner. Make a suggestion, agree or politely say no with a reason. Then the new reply: when your partner says what they like or don't like, answer 'So do I', 'Neither do I', 'I don't' or 'I do'.",
            slips: "'How about go', 'Let's to play', 'turned down it', 'So I do', 'Neither don't I'",
            fb: "For 'How about go' say 'How about ...?' and make a small circle for -ing; for 'Let's to play' hold up a stop hand for 'to'; for 'turned down it' say 'turned it ...?' and point to the gap; for 'So I do' say 'So ... I?' and let them find the helper first.",
            note: "Rounds 1 and 2 practise the lesson's grammar: suggestions, agreeing, refusing politely and where the object goes in a phrasal verb (turned it down, but turned down the offer). Round 3 and Stretch bring in the Level 4 step: So do I / Neither do I. Keep a small table on the board: the speaker's helper (do, am, can, would) and the answer. The R sign is the exam's rewrite format: 'Let's set up a stall' = 'Why don't we set up a stall?' Round 3 must be real: true likes and dislikes.",
            support: ["Why don't we ___?", "I like ___. So do I.", "I don't. I'd rather ___."],
            stretch: "Agree or disagree with a reason, then rewrite one sentence with the same meaning: 'I like it. So do I, because ___.' / 'I don't. I'd rather ___ because ___.'",
            stretchFrames: ["So do I, because ___.", "Neither do I, because ___.", "I don't. I'd rather ___."],
          }),
        },
        {
          after: "Plan a surprise in threes",
          slide: {
            kind: "fluency",
            title: "Suggestion chain: Why don't we ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Suggest, answer, then turn and suggest to the next friend. Keep the chain going.",
            chunks: [
              "Why don't we set up a stall?",
              "Sure, why not? That sounds great.",
              "How about asking {s1} to help?",
              "I'd rather make posters, because I'm good at drawing.",
              "Don't give up! We'll work it out together.",
            ],
            recycle: ["The lotus grows in the pond, among the reeds.", "If people cut the trees, the animals will lose their homes."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds a problem card (our garden has no water)." },
              { seconds: 60, say: "Swap cards. Go faster: suggest, answer, pass." },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle with a problem card. Suggest a plan to the friend on your left: 'Why don't we ___?'",
              "They agree ('Sure, why not?') or say no politely ('I'd rather ___, because ___.'). Then they turn and suggest to the next friend.",
              "Use one phrasal verb in each turn: set up, work out, give up, carry on.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'How about go') and fix them with the class; then go on.",
            ],
            prompts: ["(card: no water for the garden)", "(card: the stall is too hot)", "(card: not enough helpers)", "(card: the poster is too small)"],
            feedback:
              base +
              "Here: for 'How about go swimming?', say 'How about ...?' and make the -ing shape with your hand. For 'Let's to play', say 'Let's ...' and stop at the word 'to', shaking your head. For 'She turned down it', say 'She turned ... down' and point to the word 'it'.",
            teacherNote:
              "A chain makes every child suggest AND answer many times in a few minutes. The polite 'no' is the hard part for children who only know 'No': give a reason every time. Listen for 'How about + -ing', 'Let's' with no 'to', and the position of the pronoun in 'turn it down'.",
            tiers: [
              { level: "Support", task: "Use the frames: suggest with 'Why don't we ___?' and answer 'Sure, why not?'", frames: ["Why don't we ___?", "Sure, why not?"] },
              { level: "Core", task: "Suggest and answer without the frames, with one phrasal verb." },
              { level: "Stretch", task: "Say no politely with a reason, then suggest something better.", frames: ["I'd rather ___ because ___. How about ___ing?"] },
            ],
          },
        },
        {
          after: "Exam practice: dialogues and phrasal verbs",
          slide: {
            kind: "writing",
            title: "Dictogloss: the lemonade stall",
            routine: "dictogloss",
            mode: "groups",
            minutes: 8,
            steps: [
              "Rule reminder: How about + -ing. Phrasal verbs: set up, work out, give up, carry on. Say them once together.",
              "Listen to the text the first time. Do not write. Listen for the plan.",
              "Listen the second time. Write key words only: verbs, numbers, names of things.",
              "In your group, rebuild the text in your own words. It does not need to be exactly the same, but it must be correct.",
              "Compare with the real text on screen. Mark any difference.",
            ],
            text: {
              title: "The lemonade stall",
              text: "Last Saturday, our team set up a lemonade stall. My cousin suggested making posters, so we worked out a plan. The sun was too hot and we nearly gave up, but Mum said, \"How about moving the stall under the tree?\" We carried on, and we sold every cup.",
            },
            frames: ["Last Saturday, our team ___.", "___ suggested ___ing.", "We nearly gave up, but ___."],
            checklist: ["Past tense verbs end in -ed or are irregular (set up, sold)", "How about + verb-ing", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your rebuilt text to another group, then tell it again without looking.",
            teacherNote: "Dictogloss is a well-used routine for children: they hear a model, reconstruct it, and notice the gaps. Read the text at natural speed, not word by word. After the comparison, ask: 'which verb ending did we forget?' The final -ed is often dropped by Vietnamese learners.",
            tiers: [
              { level: "Support", task: "Write down the four phrasal verbs you hear, then build sentences around them." },
              { level: "Core", task: "Rebuild the whole text in your group." },
              { level: "Stretch", task: "Change the ending: what happened next? Write two more sentences with 'How about'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u4-l4": {
      objectives: ["I can retell a story with everyone, each and both, and tell it faster each time."],
      trim: { "Generalize: the best way to get things done": 8, "Write: a team contract": 11, "Word work: super-, pre-, re-": 4 },
      add: [
        {
          after: "Subject-verb agreement with tricky subjects",
          slide: drill({
            title: "Grammar drill: everyone, both, each",
            goal: "Change the sentence fast and right, with the verb that fits the subject. In round 3, describe your class and your family, and agree or disagree with So do I, Neither do I or I don't.",
            chunks: [
              "Everyone in our team has a job, and each of us does it well.",
              "Both of my brothers are good at football, but neither of them is on the school team.",
              "The children play together, but the team captain decides the order.",
              "The price of the mangoes is high, so people are buying fewer.",
              "Nobody likes losing, so everyone tries hard.",
              "Many people think teamwork is easy, but a team needs patience.",
            ],
            recycle: ["Why don't we set up a lemonade stall?", "Right now, a woman is weighing some mangoes.", "We decided to build a tall tower."],
            prompts: ["? Everyone in our team has a job.", "X Both of my brothers are on the team.", "+ (so) Nobody likes losing.", "T The children play together. (yesterday)", "P Each of us does it well. (each of them)", "R 'Every student in the class has a book.' = All the students ___."],
            real: "Real talk: describe your class and your family with everyone, each, both and nobody. After each sentence your partner agrees or disagrees: 'So does my brother', 'So do I', 'Neither do I', 'I don't'.",
            slips: "'Everyone have a book', 'The children plays', 'The box of toys are heavy'",
            fb: "For 'Everyone have' hold up one finger and say 'Everyone ...?' so they find 'has'; for 'The children plays' point to the plural word 'children'; for 'The box of toys are' cover 'of toys' with your hand and ask 'The box ...?'.",
            note: "The rule is simple and the errors are quick, so the drill must be quick. Everyone, each and nobody take the -s verb; both and the children take the plain verb; the verb agrees with the head of the phrase (the price OF the mangoes IS). The R sign is the exam's rewrite format, here between 'every student has' and 'all the students have'. The Level 4 step comes back in round 3: note that the helper changes with the subject (So does my brother, So do I). Round 3 must be real.",
            support: ["Everyone ___s.", "Both ___ are ___.", "Nobody ___s."],
            stretch: "Use neither / either or 'the price of', and agree with So does ...: 'Everyone in my family likes noodles. So does my brother.' Rewrite one sentence with the same meaning: 'Every student has a book' = 'All the students have books.'",
            stretchFrames: ["Neither of ___ is ___.", "Everyone ___s. So does ___.", "None of ___ ___."],
          }),
        },
        {
          after: "Read: \"Ba's Business\" and compare",
          slide: {
            kind: "fluency",
            title: "Retell Ba's story, faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Retell the story of Ba's booth three times (50, 40 and 30 seconds each). Partner A retells, then Partner B. Each retelling is shorter and smoother.",
            chunks: [
              "At the fair, everyone is busy, but nobody stops at Ba's booth.",
              "Both daughters want to help their father.",
              "Each daughter tries her own way to help.",
              "In the end, everyone helps, and the family works as a team.",
              "Nobody wants to work alone.",
            ],
            recycle: ["Many cities have gardens on their roofs.", "The seeds are in the soil."],
            rounds: [
              { seconds: 50, say: "Round 1: Partner A tells the story with the three-part map (the problem, the idea, the end), then Partner B. Then change partners." },
              { seconds: 40, say: "Round 2: new partner. Partner A retells it in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Hold up one finger for the problem, two for the idea, three for the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'Everyone have' or 'Both daughter wants') and fix them with the class; then go on.",
              "When the bell rings, change partners. Partner A tells the story again, then Partner B.",
              "The listener counts how many times you say everyone, each or both, and gives a thumbs up.",
            ],
            prompts: ["(map: problem, idea, end)", "At the beginning ___.", "In the end ___."],
            feedback:
              base +
              "Here: for 'Everyone have a book', say 'Everyone ...?' and hold up one finger for the singular -s. For 'The children plays', hold up many fingers and say 'many children ... play'. For 'The box of toys are heavy', point to 'box' and ask 'what is heavy?'.",
            teacherNote:
              "Retelling builds fluency but not accuracy on its own: the one-minute fix between round 1 and 2 is what makes it accurate. Everyone, each and every feel plural to children because 'everyone' means many people, so the -s on the verb is the key sound to model. Listen for 'both' + no -s and for the verb that agrees with the real subject.",
            tiers: [
              { level: "Support", task: "Use the three-part map and the frames to say one sentence for each part.", frames: ["At the beginning, ___.", "Then ___.", "In the end, ___."] },
              { level: "Core", task: "Retell all three parts with everyone, each or both at least once." },
              { level: "Stretch", task: "Add why it works: 'It works because everyone has a different job.'", frames: ["It works because ___."] },
            ],
          },
        },
        {
          after: "Exam practice: find the mistake",
          slide: {
            kind: "writing",
            title: "What makes our class a team: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the reasons and the closing sentence. Underline the verbs after everyone, each and both.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: who has which job, and what happens when we help?",
              "Write: turn your notes into one paragraph of about 80 words. Use First, Also and That is why.",
              "Check: tick the checklist. Swap with a partner: they underline one verb with -s and one without, and tell you one thing they liked.",
              "Teacher: while they write, look only at the verb after everyone, each or nobody (-s) and after both or two names (no -s). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Everyone has a job",
              text: "Our class is a good team because everyone has a job. Each of us has a different task: one child waters the plants, and two children clean the board. Both of our monitors help us when we ask, so nobody works alone. The box of markers is on the shelf, and everyone knows where to find it. Everybody feels proud when the room is tidy. That is why our class works so well together.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Say what makes your class or family a team. Use 'because everyone ...'." },
              { label: "Reason 1: Each ...", prompt: "Who has which job? Use 'each of us' or 'one child ... and two children ...'." },
              { label: "Reason 2: Both / Nobody ...", prompt: "How do people help each other? Use 'both' or 'nobody'." },
              { label: "Closing: That is why ...", prompt: "End with how everybody feels, then 'That is why ...'." },
            ],
            frames: ["Our class is a good team because everyone ___.", "Each of us ___s.", "Both ___ and ___ help us, so nobody ___s.", "That is why ___."],
            checklist: [
              "My first sentence says why we are a team",
              "Everyone, each, nobody + verb-s (everyone has, nobody works)",
              "Both, A and B, the children + no -s (both help). The box of markers is: the verb agrees with box",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: it grows the earlier model-it sentences into a whole paragraph of about 80 words, the length the exam asks for. Mark only two targets (the -s after everyone and each, and the missing -s after both) with a dot on the line; the child finds and fixes the mistake. It is the lesson's own model-then-write routine made longer, so it is a good script for the team vlog.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Our class is a good team because everyone ___.", "That is why ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a 'The ___ of ___ is ___' sentence and a sentence with neither ... nor." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "The best way to work in a team",
        prompt: "Tell us what a good team does. Use everyone, each and both, and give one example from your class or family.",
        length: "60-90 seconds",
        steps: [
          "Think of a team you know: a class, a family, a football team.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Start with: 'People get things done best when ...'",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say what makes a good team, with an example, and keep talking without long stops.",
        words: ["team", "everyone", "each", "both", "share", "help", "together"],
        grammar: ["Everyone / each + verb-s", "Both + verb (no -s)", "People get things done best when ___", "So do I / Neither do I / I don't"],
        rubric: [
          { label: "Clear idea", description: "Says what a good team does and gives an example.", weight: 3 },
          { label: "Agreement", description: "Uses everyone / each + verb-s and both + verb with no -s correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -s on verbs can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A good team ___.", "Everyone ___s."], tips: ["Say two sentences and point to your drawing."] },
          { level: "Core", who: "Most children", frames: ["People get things done best when ___.", "Everyone in our ___ has ___.", "Both ___ and ___ help."], tips: ["Give one example from home or school."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["However, sometimes ___.", "This usually works because ___."], tips: ["Add a problem and how a team fixes it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u4-l5": {
      objectives: ["I can say rules and advice with must, mustn't, have to and should, fast and right."],
      trim: { "Rules for a school farm": 9, "Write: advice from a grandparent farmer": 11 },
      add: [
        {
          after: "Helping (modal) verbs",
          slide: drill({
            title: "Grammar drill: must, should, have to",
            goal: "Change the sentence fast and right with a modal verb: ask it, say no, join it, change the time. In round 3, make rules and give advice, and agree with So do I or Neither do I.",
            chunks: [
              "You must wear a hat in the sun, so you should bring one.",
              "We don't have to pay, but we mustn't forget to register.",
              "Farmers have to get up early because the animals need food.",
              "She can't come today, so she might join us tomorrow.",
              "You should drink more water, and you could carry a bottle.",
              "Do we have to wear uniforms? No, we don't, but we should look neat.",
            ],
            recycle: ["Everyone in our class wants to help.", "Why don't we set up a stall?", "I can't carry it alone. Neither can I."],
            prompts: ["? You must wear a hat.", "X We have to pay.", "+ (because) Farmers have to get up early.", "T She can't come today. (yesterday: couldn't)", "P You should drink more water. (he)", "R 'It is necessary to wear a helmet.' = You ___ wear a helmet."],
            real: "Real talk: make rules and give advice for your school and your home with must, mustn't, have to, don't have to and should. Start some of your sentences with 'I think we should ...' or 'I don't have to ...'. Your partner agrees or disagrees: 'So do I', 'Neither do I', 'I don't', 'I do'.",
            slips: "'She cans swim', 'You should to rest', 'You mustn't pay' for 'You don't have to pay'",
            fb: "For 'cans' tap your wrist for the extra -s and say 'She ...?'; for 'should to rest' hold up a stop hand for 'to'; for 'mustn't pay' (it is free) write 'not allowed' and 'not necessary' on the board and let the child choose.",
            note: "Mustn't means not allowed; don't have to means not necessary; this one pair costs marks in every entrance paper, so give it extra repeats. The T sign gives had to / will have to, since must has no past. The R sign is the exam's rewrite: 'It is necessary to wear a helmet' = 'You must / have to wear a helmet'; 'It is not necessary to pay' = 'You don't have to pay'. In round 3 the Level 4 step comes back: 'I think we should recycle more.' 'So do I.' Round 3 must be real.",
            support: ["You must ___.", "You mustn't ___.", "You should ___."],
            stretch: "Use the contrast mustn't / don't have to, and agree with Neither do I: 'I don't have to wear a uniform on Friday. Neither do I.' Rewrite one sentence with the same meaning: 'It is not necessary to bring a pen' = 'You don't have to bring a pen.'",
            stretchFrames: ["You don't have to ___, but you should ___.", "You mustn't ___ because ___.", "So do I / Neither do I."],
          }),
        },
        {
          after: "Exam practice: modals and rewrites",
          slide: {
            kind: "fluency",
            title: "Rules sprint: must, mustn't, have to",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each rule as one smooth sentence, with the right helping verb.",
            chunks: [
              "Farmers have to get up early.",
              "You mustn't run near the pond; it's dangerous.",
              "You don't have to come early; the class starts at nine.",
              "We should save water, and we could use rainwater.",
              "She can drive a tractor, but she can't swim.",
            ],
            recycle: ["Why don't we set up a stall?", "Each daughter tries her own way to help."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a rule card (pond, run) and the class says the sentence." },
              { seconds: 60, say: "Pairs: A shows a card, B says the rule. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! Say the rule without looking at the board." },
            ],
            steps: [
              "Look at the card. Say a rule, advice or a 'no need' sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'mustn't pay' for 'don't have to') and fix them with the class; then go on.",
              "Listen for the clap: it means change.",
              "In round 3, listen for your partner's helping verb: no 'to' after must, should and can.",
            ],
            prompts: ["(card: pond + run)", "(card: harvest + early)", "(card: free + pay)", "(card: water + save)"],
            feedback:
              base +
              "Here: for 'She cans swim' or 'You should to rest', say 'She ... swim' and let them find 'can'; for 'You mustn't pay; it's free', say 'It's free, so you ...?' and point to 'don't have to'. Say the contrast clearly yourself: mustn't = no, don't have to = not needed.",
            teacherNote:
              "The hard contrast is mustn't (not allowed) and don't have to (not needed): it is a common exam item, and children say 'mustn't' for both. Repeating both with a clear reason after each ('because it's dangerous' / 'because it's free') makes the meaning stick. Listen for 'to' after modals and the -s on 'has to'.",
            tiers: [
              { level: "Support", task: "Use the frames and say the rule with a friend.", frames: ["You must ___.", "You mustn't ___ because ___."] },
              { level: "Core", task: "Say the rule alone, without the board." },
              { level: "Stretch", task: "Give a rule and advice in one go: 'You don't have to come early, but you should bring water.'", frames: ["You don't have to ___, but you should ___."] },
            ],
          },
        },
        {
          after: "Rules for a school farm",
          slide: {
            kind: "writing",
            title: "Rules for our school garden: plan, write, check",
            routine: "paragraph",
            genre: "rules and advice",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the rules, the advice and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: what is a must, what is not allowed, what is not needed?",
              "Write: turn your notes into one paragraph of about 80 words. Use First, Also and These rules.",
              "Check: tick the checklist. Swap with a partner: they underline one 'must', one 'mustn't' and one 'don't have to' and tell you one thing they liked.",
              "Teacher: while they write, look only at 'to' after must, should and could (there is none) and at mustn't or don't have to. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The school garden",
              text: "Our school garden has a few important rules. First, everyone must wash their hands before touching the plants. You mustn't pick the flowers, because other children want to see them. Gardeners have to water the seeds every morning, but you don't have to bring your own water; there is a tap by the gate. We should also put the tools back, and you could ask a teacher for help. These rules keep our garden safe and beautiful.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What place has rules? Say 'Our ___ has a few important rules.'" },
              { label: "Rule 1: must / mustn't", prompt: "What must everyone do? What is not allowed, and why?" },
              { label: "Rule 2: have to / don't have to", prompt: "What does a worker have to do? What is not needed?" },
              { label: "Advice and closing", prompt: "Give advice with 'should' or 'could'. End with 'These rules keep ...'" },
            ],
            frames: ["Our ___ has a few important rules.", "Everyone must ___. You mustn't ___ because ___.", "You don't have to ___, but you should ___.", "These rules keep ___."],
            checklist: [
              "My first sentence says which place has the rules",
              "After must, should, could: the plain verb, no 'to'",
              "mustn't = not allowed; don't have to = not needed",
              "He, she, it: has to (not have to). A full stop in every sentence",
            ],
            sayIt: "Read your paragraph to your partner in a strong rule voice. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It grows the earlier expand-it rule sentences into a whole paragraph of about 80 words, so the practice of rewriting a bare sentence now lives inside the paragraph. Mark only two targets (no 'to' after a modal, and mustn't against don't have to) with a dot on the line; the child finds and fixes the mistake. The paragraph is a good first draft for the letter from a farmer grandparent.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Our ___ has a few important rules.", "Everyone must ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a sentence with 'may' or 'might' about what could happen if people break a rule." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u4-l6": {
      objectives: ["I can say what I would do if things were different, three times, faster each time."],
      trim: { "If I were the farmer: a debate": 6, "Write: if I ran the school": 11 },
      add: [
        {
          after: "The second conditional",
          slide: drill({
            title: "Grammar drill: if I were, I would",
            goal: "Change the sentence fast and right: ask it, say no, join it, change the person. In round 3, share your own 'if' ideas and agree with So would I, Neither would I or I wouldn't.",
            chunks: [
              "If I were a farmer, I would grow rice and keep ducks.",
              "What would you do if you had a free day? I would visit my cousins.",
              "If everyone helped, the job would take one hour.",
              "If it snowed in Hanoi, people would be surprised, and the children would play outside.",
              "If I were you, I wouldn't give up, because the team needs you.",
              "I would help more if I had time, but I have a lot of homework.",
            ],
            recycle: ["You must wear a hat in the sun.", "Everyone in our class wants to help.", "I can't carry it alone. Neither can I."],
            prompts: ["? If I were a farmer, I would grow rice.", "X If everyone helped, the job would take one hour.", "+ (but) I would help more if I had time.", "T If it snows, people will be surprised. (second conditional: if it snowed)", "P If I were you, I wouldn't give up. (she)", "R 'I don't have time, so I can't help.' = If I ___, I ___."],
            real: "Real talk: tell your partner what you would do if you had a free day, a lot of money or one wish for your school. Your partner agrees or disagrees: 'So would I', 'Neither would I', 'I wouldn't', 'I would'.",
            slips: "'If I would have time', 'If I am rich, I would buy', 'If I was' where the book teaches 'If I were'",
            fb: "For 'If I would have time' say 'If I ... time?' and hold up a stop hand for the extra 'would'; for 'If I am rich, I would' point to 'would' on the board and say 'then the first part is in the past'; for 'If I was' say 'If I ...?' with your hand on 'were'.",
            note: "The second conditional asks for two pasts of different jobs: 'if' + past simple, then 'would' + plain verb. Children say 'would' in the wrong half, so the drill keeps both halves in one breath. The T sign turns a first-conditional sentence into an imagined one, and the R sign is the exam's favourite rewrite: 'I don't have time, so I can't help' = 'If I had time, I would help.' Round 3 uses the Level 4 step with the helper 'would': 'I'd travel to space if I could.' 'So would I.' Round 3 must be true.",
            support: ["If I were ___, I would ___.", "So would I.", "I wouldn't."],
            stretch: "Use two ideas and a reason, agree with So would I or Neither would I, and rewrite one sentence with the same meaning: 'I don't have money, so I can't buy it' = 'If I had money, I would buy it.'",
            stretchFrames: ["If I were ___, I would ___ because ___.", "Neither would I, because ___.", "If I had ___, I would ___."],
          }),
        },
        {
          after: "Exam practice: first or second?",
          slide: {
            kind: "fluency",
            title: "If I were: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same 'if' talk to three partners. Each talk is shorter and smoother.",
            chunks: [
              "If I were a farmer, I would keep ducks in my fields.",
              "If everyone helped, the work would be easy.",
              "If I had more time, I would learn to drive a tractor.",
              "What would you do if you were the principal?",
              "If I were you, I wouldn't give up.",
            ],
            recycle: ["Why don't we set up a stall?", "You mustn't run near the pond; it's dangerous."],
            rounds: [
              { seconds: 60, say: "Partner 1: say your 'if I were' talk. The listener counts the 'would' sentences on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener asks one question at the end: 'What would you do if ...?'" },
            ],
            steps: [
              "Choose three sentences from the chunks or make your own with 'If I were ...'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'If I would have' or 'If I am rich, I would') and fix them with the class; then go on.",
              "When the bell rings, move to a new partner and give the same talk faster.",
              "The listener says 'What would you do if ...?' and you answer in one sentence.",
            ],
            feedback:
              base +
              "Here: for 'If I would have time', say 'If I ...?' and point to the word 'would', crossing your hands, so the child finds 'had'. For 'If I am rich, I would buy a farm', say 'If I ...' and wait for 'were'. Say 'would' clearly (it is often swallowed) and the final -d sound.",
            teacherNote:
              "This is the 4/3/2 (time shrinks, partner changes) for the second conditional: same talk, less time. The one-minute fix between round 1 and 2 is what makes it accurate as well as fast; without it, the child gets faster at the wrong form. Listen for 'would' after if, 'were' for I, and 'would' + plain verb.",
            tiers: [
              { level: "Support", task: "Say two 'If I were ___, I would ___.' sentences with the frame.", frames: ["If I were ___, I would ___."] },
              { level: "Core", task: "Say three or four 'if' sentences without the board." },
              { level: "Stretch", task: "Add a reason: 'If I were the principal, I would give more time for play because children learn when they are happy.'", frames: ["If I were ___, I would ___ because ___."] },
            ],
          },
        },
        {
          after: "If I were the farmer: a debate",
          slide: {
            kind: "writing",
            title: "If I were the principal: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two changes with reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: what is true now, and what would be different?",
              "Write: turn your notes into one paragraph of about 80 words. Use First, Second and That is what I would do.",
              "Check: tick the checklist. Swap with a partner: they underline every 'would' and every 'if' part and tell you one idea they liked.",
              "Teacher: while they write, look only at 'if I were' (not 'if I am') and at 'would' only in the main part, never after 'if'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: If I were the principal",
              text: "If I were the principal of our school, I would make two changes. First, I would plant a small farm behind the playground, so children could grow vegetables. If we grew our own food, we would learn about nature and eat healthy lunches. Second, I would give more time for play, because children learn best when they are happy. If I had enough money, I would also buy new books for the library. That is what I would do if I were the principal.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "'If I were ___, I would make ... changes.'" },
              { label: "Change 1: First, ...", prompt: "What would you do? What would happen if you did it? Use 'would' and 'could'." },
              { label: "Change 2: Second, ...", prompt: "What is another change? Give a reason with 'because'." },
              { label: "Closing: That is what ...", prompt: "End with 'That is what I would do if I were ___.'" },
            ],
            frames: ["If I were ___, I would make ___ changes.", "First, I would ___, so ___ could ___.", "If we had ___, we would ___.", "That is what I would do if I were ___."],
            checklist: [
              "My first sentence says who I would be",
              "If + past simple (had, grew), then would + plain verb",
              "If I / he / she / it were, and never 'would' after 'if'",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It grows the earlier combining sentences (a 'not' fact becomes an imagined 'if' idea) into a whole opinion paragraph of about 80 words, in the exam's short-paragraph format. Mark only two targets (if I were, and no 'would' after 'if') with a dot on the line; the child finds and fixes the mistake. The paragraph is a good script for the lesson's recorded talk and the campaign speech.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["If I were ___, I would make ___ changes.", "That is what I would do if I were ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add a sentence that says what would be hard: 'It would not be easy because ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "If I ran the school",
        prompt: "Tell us what you would change if you ran the school or a farm. Give two ideas and a reason for each.",
        length: "60-90 seconds",
        steps: [
          "Choose two ideas. Write them as 'If I ran ___, I would ___.'",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going.",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say two things you would change with 'If I ... , I would ...', give a reason, and keep going without long stops.",
        words: ["principal", "farmer", "change", "idea", "if", "would"],
        grammar: ["If + past simple, would + verb", "If I were ___", "What would you do if ___?", "So would I / Neither would I"],
        rubric: [
          { label: "If and would", description: "Uses 'if' + past simple and 'would' + plain verb correctly, with 'if I were'.", weight: 3 },
          { label: "Ideas and reasons", description: "Gives two ideas and a reason for each.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear sounds", description: "Says 'would' and the endings clearly.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["If I ran the school, I would ___.", "I would ___ because ___."], tips: ["Say one idea and one reason."] },
          { level: "Core", who: "Most children", frames: ["If I were the principal, I would ___.", "If we had ___, we could ___.", "That would be good because ___."], tips: ["Give two ideas, each with a reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["What would you do if you were the principal?", "However, if ___, then ___."], tips: ["Ask the viewer a question and think of a problem with your idea."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u4-l7": {
      objectives: ["I can say 'He should have ...' and 'If he had ..., he would have ...' fast, and fix mistakes in my essay."],
      trim: { "Read: \"The Ant and the Grasshopper\"": 10, "Draft and edit the essay": 21, "Say it before you write it: the 60-second argument": 8, "Plan the persuasive essay (writing project)": 10 },
      add: [
        {
          after: "Regrets: should have and the third conditional (stretch)",
          slide: drill({
            title: "Grammar drill: should have, if I had",
            goal: "Change the sentence fast and right: ask it, say no, join it, change the person. In round 3, share things you wish you had done, and agree with So do I or So should I.",
            chunks: [
              "The grasshopper should have worked in the summer.",
              "If he had listened to the ant, he would have had food in the winter.",
              "I wish I had started my project earlier.",
              "We shouldn't have waited until the last day.",
              "If we had planned better, we would have finished in time.",
              "I wish I hadn't forgotten my notebook.",
            ],
            recycle: ["If I were a farmer, I would keep ducks.", "You mustn't swim in the canal.", "I enjoy working in a team."],
            prompts: ["? The grasshopper should have worked in the summer.", "X We should have waited until the last day.", "+ (because) We should have planned better.", "T If we plan better, we will finish. (third conditional: if we had planned)", "P I wish I had started earlier. (she)", "R 'He didn't study, so he failed.' = If he ___, he ___."],
            real: "Real talk: tell your partner about a small mistake you made and what you should have done, or what you wish you had done. Say 'I wish I had ...' or 'I should have ...'. Your partner answers with the same helper: after 'I wish', 'So do I' or 'I don't'; after 'I should have', 'So should I' or 'I shouldn't'.",
            slips: "'should worked', 'would have went', 'If he would have worked'",
            fb: "For 'should worked' say 'should ...?' and hold up your hand at 'have'; for 'would have went' point to the third column of the verb list and say 'have ...?'; for 'If he would have worked' hold up a stop hand for the extra 'would'.",
            note: "This is stretch grammar, so the aim is a few automatic chunks, not a rule lesson: 'should have' + the past participle for a regret, and 'if + had + participle, would have + participle' for what did not happen. The chunks double as essay language for the persuasive essay. The R sign is the exam's rewrite: 'He didn't study, so he failed' = 'If he had studied, he wouldn't have failed.' Give the participle on a card for irregular verbs. The Level 4 step comes back with wish and should have: 'I wish I had started earlier.' 'So do I.' / 'I should have started earlier.' 'So should I.' The helper matches the first sentence, so 'So do I' after a should-have sentence is wrong. Round 3 must be true.",
            support: ["I should have ___.", "I wish I had ___.", "So do I. / So should I."],
            stretch: "Say what would have happened, agree with So do I or So should I, and rewrite one sentence with the same meaning: 'He didn't study, so he failed' = 'If he had studied, he wouldn't have failed.'",
            stretchFrames: ["If I had ___, I would have ___.", "I wish I had ___. So do I, because ___.", "I shouldn't have ___."],
          }),
        },
        {
          after: "Exam practice: looking back",
          slide: {
            kind: "fluency",
            title: "Regret sprint: should have, wish",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 5,
            goal: "Say each sentence smooth and fast: the regret sentences and the essay opener.",
            chunks: [
              "He should have worked harder.",
              "She shouldn't have waited so long.",
              "If he had listened, he would have had food.",
              "I wish I had started my project earlier.",
              "I strongly believe that we should work together.",
            ],
            recycle: ["If I were a farmer, I would keep ducks in my fields.", "Farmers have to get up early."],
            rounds: [
              { seconds: 45, say: "Together: the teacher shows a card (grasshopper, play) and the class says the sentence." },
              { seconds: 45, say: "Pairs: A shows a card, B says the regret. Swap." },
              { seconds: 30, say: "New partner. Fast! Say the 'wish' and the 'should have' sentences." },
            ],
            steps: [
              "Look at the card and say a regret or a piece of advice about the grasshopper.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'should worked' or 'If he would have') and fix them with the class; then go on.",
              "Say 'I strongly believe that ...' to finish your last turn.",
            ],
            prompts: ["(card: grasshopper + play)", "(card: ant + work)", "(card: winter + food)"],
            feedback:
              base +
              "Here: for 'He should worked harder', say 'He should ... worked' and hold up a finger for 'have'. For 'If he would have listened', say 'If he ...' and point at 'had'. Say 'should have' as 'should've' clearly so children hear the word 'have'.",
            teacherNote:
              "This is stretch grammar, so keep it short and joyful: the aim is a few automatic chunks, not a rule lesson. The chunks double as essay language. Listen for 'have' after should, and the past participle (worked, listened, started).",
            tiers: [
              { level: "Support", task: "Say the 'should have' sentences with the frame.", frames: ["He should have ___ed."] },
              { level: "Core", task: "Say all five chunks without the board." },
              { level: "Stretch", task: "Make a new regret about yourself: 'I wish I had practiced more.'", frames: ["I wish I had ___ed."] },
            ],
          },
        },
        {
          after: "Say it before you write it: the 60-second argument",
          slide: {
            kind: "writing",
            title: "Fix it: the essay checker",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence from an essay draft. It has one mistake.",
              "Find it and write the sentence the right way.",
              "Then check your own essay for the same three mistakes before you write.",
            ],
            items: [
              { q: "He should worked harder.", answer: "He should have worked harder." },
              { q: "If he would have listened, he would have had food.", answer: "If he had listened, he would have had food." },
              { q: "If I am the principal, I would give more time for play.", answer: "If I were the principal, I would give more time for play." },
              { q: "Everyone in the team have a job.", answer: "Everyone in the team has a job." },
            ],
            checklist: ["should have + past participle", "If + had (past perfect) or if + past simple, never 'would' after if", "Everyone, each + verb-s"],
            sayIt: "Read your fixed sentences aloud, then say one without looking.",
            teacherNote: "Written correction works best on two or three error types at a time: here the three above. Fixing someone else's sentence first makes children notice the same errors in their own essay.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 4 with the checklist beside you." },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Find and fix one of these mistakes in your own draft." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u4-l8": {
      objectives: ["I can tell what someone said with 'said that', and say what I learned about teamwork."],
      trim: { "Transfer: test our big idea": 10, "Mock review: explain the answers": 9, "Video case: cleaning up the coasts": 8 },
      add: [
        {
          after: "Reported statements (stretch)",
          slide: drill({
            title: "Grammar drill: he said that ...",
            goal: "Change the sentence fast and right: report what someone said, change the tense and the person. In round 3, answer what your partner says with So do I or Neither do I, then report it to another pair.",
            chunks: [
              "My friend said that she was tired, so we sat down.",
              "The volunteers said they would clean the beach on Saturday.",
              "My teacher told us that we could leave early.",
              "He said he didn't need any help, but he looked busy.",
              "They told me that the bags were not heavy.",
              "She said that she was reading a book, so I didn't talk.",
            ],
            recycle: ["If I were you, I wouldn't give up.", "The grasshopper should have worked in the summer.", "Everyone in our class wants to help."],
            prompts: ["? My friend said that she was tired.", "X The volunteers said they would clean the beach.", "+ (because) He said he didn't need help.", "T 'I am tired,' she said. = She said she ___.", "P 'I will help,' he said. = He said he ___.", "R 'We will clean the beach,' the volunteers said. = The volunteers said they ___."],
            real: "Real talk: A tells B one true thing about themselves, like 'I like noodles' or 'I can't swim'. B answers first: 'So do I', 'Neither can I', 'I don't', 'I do'. Then B tells the pair next to you: 'She said that she liked noodles.' Swap.",
            slips: "'She said me', 'He said he is hungry' (said earlier), 'I' or 'my' not changed to he / she or his / her",
            fb: "For 'She said me' say 'She told ...?' and point to 'me'; for 'He said he is hungry' point to the time line on the board (said = past) and say 'he ...?'; for a pronoun not changed, ask 'Who is 'I' now?' and point to the speaker.",
            note: "Reported statements are stretch grammar here, so accept 'said that' with was, could and would and do not push the rest. The R sign is the exam's rewrite format: direct speech to reported speech with the same meaning. The shift is one step back (am to was, will to would, can to could) and the pronoun changes with the speaker. The Level 4 step returns in round 3: B first answers A with 'So do I' or 'Neither can I' (the helper matches A's sentence), then reports A's words to the next pair in the past ('She said that she liked noodles'), so children use both in real talk. Round 3 must be true.",
            support: ["She said (that) ___.", "He told me ___.", "So do I."],
            stretch: "Report two things someone said, with their reasons, and agree with So do I or Neither do I; rewrite one sentence with the same meaning: 'I will help,' he said = He said he would help.",
            stretchFrames: ["She said (that) ___ because ___.", "He told me (that) ___.", "Neither do I, because ___."],
          }),
        },
        {
          after: "Exam practice: report it",
          slide: {
            kind: "fluency",
            title: "Pass the message: he said that ...",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Pass the same messages three times. Each time you report them faster and right.",
            chunks: [
              "He said that he was tired.",
              "They said they would help.",
              "She said she could swim.",
              "She told me that the bags were not heavy.",
              "I said that I was ready.",
            ],
            recycle: ["If everyone helped, the work would be easy.", "I'd rather make posters, because I'm good at drawing."],
            rounds: [
              { seconds: 60, say: "Partner A reads a message card out loud ('I am tired'); B reports it ('He said that he was tired')." },
              { seconds: 45, say: "New partner. The same cards, faster. Swap roles." },
              { seconds: 45, say: "New partner. Fast and smooth! Listener: tick every 'said that' or 'told me' you hear." },
            ],
            steps: [
              "Take a message card: the speaker says it in the present. Report it in the past.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'He said he is hungry' or 'She said me') and fix them with the class; then go on.",
              "Change partners when you hear the bell and report the same cards again.",
              "In round 3, add 'told me': 'She told me that the bags were not heavy.'",
            ],
            prompts: ["(card: \"I am tired.\")", "(card: \"We will help.\")", "(card: \"I can swim.\")", "(card: \"The bags are not heavy.\")"],
            feedback:
              base +
              "Here: for 'He said he is hungry', say 'He said he ...' and point back with your thumb for the past 'was'. For 'She said me she was busy', say 'She ... me' and hold up your finger for 'told'. For a missing final -ed or -d in 'asked', echo the sound clearly.",
            teacherNote:
              "This is stretch grammar, so aim for accurate chunks, not the whole rule. Repeating the same cards to three partners (task repetition) builds the speed, and the one-minute fix between rounds makes it accurate. Listen for the shift of the verb (am to was, will to would, can to could) and 'told me' with a person.",
            tiers: [
              { level: "Support", task: "Use the frame and keep the first message card in front of you.", frames: ["He said that he was ___.", "They said they would ___."] },
              { level: "Core", task: "Report each message without the board." },
              { level: "Stretch", task: "Make a message of your own and report your partner's.", frames: ["She told me that ___."] },
            ],
          },
        },
        {
          after: "Transfer: test our big idea",
          slide: {
            kind: "writing",
            title: "What people said at the clean-up: plan, write, check",
            routine: "paragraph",
            genre: "report",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the things people said and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: who said what? Change is to was, will to would, can to could.",
              "Write: turn your notes into one paragraph of about 80 words. Use said that, told us that and I think.",
              "Check: tick the checklist. Swap with a partner: they underline every 'said that' and 'told us that' and tell you one thing they liked.",
              "Teacher: while they write, look only at the past form after 'said that' (was, would, could) and at 'told' with a person. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: After the clean-up",
              text: "On Saturday, our class joined a clean-up on the beach, and afterwards I wrote about it. A volunteer told us that the sand was dirty, so we started right away. One boy said that he could carry two bags at once. A girl said that she was tired but happy. Our teacher told us that we were a great team, and she said that we would come again next month. I think everyone learned that small jobs make a big difference.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What event did you join, and when? Say what you are going to report." },
              { label: "Said 1: A person told us ...", prompt: "What did a grown-up tell the group? Use 'told us that' + past form." },
              { label: "Said 2: One child said ...", prompt: "What did a child say? Use 'said that' + was, could or would." },
              { label: "Closing: I think ...", prompt: "End with what you think everyone learned." },
            ],
            frames: ["On ___, our class joined ___.", "A volunteer told us that ___ was ___.", "One boy said that he could ___.", "I think everyone learned that ___."],
            checklist: [
              "My first sentence says what the event was",
              "said that + past form: was, would, could, never 'is' or 'will'",
              "told us that, with a person; never 'said us'",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It replaces the earlier dictogloss; the idea of rebuilding what was said now happens in the plan boxes, which children fill from the video case and the mock review. Reported statements are stretch grammar, so accept 'said that' with was, could and would and do not push the rest. Mark only two targets (the past form after said that, and told with a person) with a dot on the line; the child finds and fixes the mistake. The model is original and names no real person.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["On ___, our class joined ___.", "One boy said that he could ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, about 80 words." },
              { level: "Stretch", task: "Add two more things people said, one with 'could' and one with 'would'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I learned about working together",
        prompt: "Tell us what you learned about teamwork in this unit. Say what you used to think, what you think now, and what a classmate said.",
        length: "60-90 seconds",
        steps: [
          "Think of one team job you did this unit: the paper tower, the stall, the contract.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Start with: 'I used to think ..., but now I think ...'",
          grownUp,
        ],
        maxSeconds: 180,
        kidSummary: "Say what you learned about teamwork, use 'I used to think ... but now I think ...', and keep talking without long stops.",
        words: ["teamwork", "learn", "idea", "change", "share", "together"],
        grammar: ["I used to think ___, but now I think ___", "If we did it again, we would ___", "My friend said that ___"],
        rubric: [
          { label: "What I learned", description: "Says what changed in their thinking, with a clear example.", weight: 3 },
          { label: "Unit grammar", description: "Uses 'If we did it again, we would ...' or 'said that ...' with the right verb form.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -s and -ed can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I used to think ___, but now I think ___.", "I learned ___."], tips: ["Say two sentences about one team job."] },
          { level: "Core", who: "Most children", frames: ["If we did it again, we would ___.", "A classmate said that ___.", "My team ___ed because ___."], tips: ["Give one example and one 'if we did it again' idea."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I wish we had ___ed earlier.", "She told me that ___."], tips: ["Add a regret and what someone told you."] },
        ],
      },
    },
  },
};
