import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 9 "Sources of
// Energy" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences under gentle time pressure, with Unit 8's phrases mixed back in) and one writing
// routine that ends in speaking. Lessons 2 and 5 end with a recorded talk for home that
// repeats the class routine. Time comes from games and repeats, never from the book pages
// or the grammar. All text is original.

const fixSteps =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

const drillFeedback =
  "Prompt, do not tell: for 'It mights rain' or 'It may to rain' start 'It may ...' and pause, or point to the rule on the board (no -s, no to); for 'It must is solar power' hold up one finger for 'be' ('It must ... be?'); for a missing -s on uses or makes, tap your wrist; for a wrong sound, say it right and let the child echo it. Say the final /t/ of might and must, and the -s, clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

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
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or tense, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with the -s where it belongs.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. Ages 8-10 can take the signs one at a time: start with ? and X, add + and T when the class is quick, and P last. Keep it brisk; a drill that drags loses its point. Each unit's drill also reaches one step toward Oxford Discover 4 (the Level 4 step), so the children meet next level's grammar in small, safe pieces. Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u09-l1": {
      objectives: ["I can say 'The ___ uses energy.' and 'The ___ is a source of energy.' fast, in whole sentences."],
      trim: { "Energy detectives": 4, "Wind power or other power? (SB 88 B)": 6 },
      drop: ["Power sort relay"],
      add: [
        {
          after: "Talk about the big picture (SB 86 B)",
          slide: drill({
            title: "Grammar drill: sure or maybe about energy",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time. Say what will happen and what may or might happen. Then guess about a picture.",
            chunks: [
              "The wind turbine will make power today.",
              "It may be windy, so the turbine might spin fast.",
              "Will the sun shine? It might, but I am not sure.",
              "The sailboat may not move because there is no wind.",
              "Coal makes pollution, so we may use less coal.",
              "This might be a wind farm because I can see tall turbines.",
            ],
            recycle: ["We are flying to Tokyo on Monday.", "The plane leaves at six.", "I think it will rain, because the clouds are dark."],
            prompts: ["The turbine will spin. (?)", "The sun will shine. (X)", "It may be windy. (+ so)", "The sailboat moves. (T: tomorrow, may)", "I may use the fan. (P: she)"],
            real: "Real talk: tell your partner what energy your home may or might use today (a fan, a heater, the lights, a stove) and why. Then guess about the picture card: 'It might be a ... because ...'. Your partner says if they agree.",
            slips: "'It mights rain' or 'The turbine may to spin'",
            support: ["Will the ___ ___? Yes, it will.", "It may / might ___."],
            stretch: "Guess about a picture with two reasons and say what it can't be: 'It might be a wind farm because I can see turbines. It can't be a city, because there are no buildings.'",
            stretchFrames: ["It might be ___ because ___.", "It can't be ___, because ___."],
          }),
        },
        {
          after: "Talk about the big picture (SB 86 B)",
          slide: {
            kind: "fluency",
            title: "Energy sprint: what uses energy?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say each whole sentence fast and smooth, with the -s sounds at the end.",
            chunks: [
              "The wind turbine uses wind to make electricity.",
              "The sailboat uses wind to move.",
              "Coal is a source of energy.",
              "Coal and oil make pollution.",
              "I think this is a city because I can see tall buildings.",
            ],
            recycle: ["I'm going to take my passport to the airport.", "What are you going to do?"],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not just one word.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: wind turbine)", "(card: sailboat)", "(card: coal)", "(card: oil)", "(card: a city street)"],
            feedback: fixSteps + " For example, if a child says 'The turbine use wind', start 'The turbine ...' and pause, or hold up a finger for the missing -s.",
            teacherNote: "Whole sentences only, never single words: the aim is to say 'The sailboat uses wind to move' as one smooth piece. Listen for the -s on uses, for 'is' in 'Coal is a source', and for the final sounds of coal and oil. Mix in a Unit 8 card every few turns so last unit's phrases stay fast. Saying the same sentences many times, a little faster each round, is what moves them from slow to automatic.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ uses ___.", "___ is a source of energy."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'Coal makes pollution, so I don't like it.'", frames: ["___ makes pollution, so ___."] },
            ],
          },
        },
        {
          after: "My sentence (SB 89 C)",
          slide: {
            kind: "writing",
            title: "Grow my energy sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the short sentence with the teacher.",
              "Plan: what can you add? A describing word, or where, or how.",
              "Write the bigger sentence. Check it with the list. Then read it to your partner.",
            ],
            items: [
              { q: "Wind is a source of energy. (add: clean)", answer: "Wind is a clean source of energy." },
              { q: "Coal makes pollution. (add: a lot of)", answer: "Coal makes a lot of pollution." },
              { q: "A wind turbine makes electricity. (add: on the hill)", answer: "A wind turbine on the hill makes electricity." },
              { q: "The sailboat moves. (add: with the wind)", answer: "The sailboat moves with the wind." },
            ],
            frames: ["___ is a ___ source of energy.", "The ___ uses ___ to ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "One thing: uses, makes (the -s is there)", "'is' goes with one thing: Wind IS a source"],
            sayIt: "Read your bigger sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese verbs never change, so the -s on uses and makes is a common slip. Model each final -s clearly when you read the answers. Do the first item together on the board.",
            tiers: [
              { level: "Support", task: "Copy the bigger sentence from the board and draw it." },
              { level: "Core", task: "Make three bigger sentences." },
              { level: "Stretch", task: "Make one sentence with two added things: 'Wind is a clean source of energy because it makes no pollution.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u09-l2": {
      objectives: ["I can explain how a water turbine makes electricity: First, Next, Then, So."],
      trim: {
        "Energy word chain": 3,
        "Draw the energy's journey": 4,
        "Green energy or fossil fuel? Sort what we read": 4,
        "Home talk: where does our electricity come from?": 5,
      },
      drop: ["Quiz show: what do we know now?"],
      add: [
        {
          after: "Explain the diagram: how a water turbine works",
          slide: {
            kind: "fluency",
            title: "Turbine story: tell it three times",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell how a water turbine works three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the water falls and hits the turbine.",
              "Next, the turbine turns.",
              "Then electricity goes along the wires to our homes.",
              "So the water helps to make power.",
              "Water is renewable, so we can use it again and again.",
            ],
            recycle: ["It's night there, so I'll send a message.", "I'm going to call my cousin tomorrow."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells how a water turbine works, then Partner B. Use the diagram. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the diagram. Count the steps on your fingers: First, Next, Then, So.",
              "In each round Partner A tells the story, then Partner B tells it. The listener has a job: hold up a finger for each step you hear. Four fingers is a complete story!",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
            ],
            prompts: ["(diagram: water falls)", "(diagram: turbine turns)", "(diagram: wires to homes)"],
            feedback: fixSteps + " For example, if a child says 'The turbine turn', start 'The turbine ...' and pause, or point to the -s on the board. If a child says 'Then electricity go', repeat it with a rising voice: 'Electricity go?'",
            teacherNote: "This is a retell: the same four-step story, three times, with a new partner each time and less time. The one-minute fix between rounds 1 and 2 is what makes it an accuracy gain as well as a fluency game, because children use the fixed forms when they tell it again. Listen for -s on turns and goes, for 'the' before turbine, and for the sequence words said in the right order. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each part of the diagram and say one sentence for it.", frames: ["First, the ___.", "Next, the ___ turns.", "Then electricity goes ___."] },
              { level: "Core", task: "Tell all four steps without the frames." },
              { level: "Stretch", task: "Add why it is good: 'Water is renewable, so we can use it again and again.'", frames: ["It is good because ___.", "___ is renewable, so ___."] },
            ],
          },
        },
        {
          after: "Turbine story: tell it three times",
          slide: drill({
            title: "Grammar drill: how green energy works",
            goal: "Change the sentence fast and right: ask it, say no, join it with because or so, change the time. Say what is sure and what is only a maybe. Then guess which energy it is.",
            chunks: [
              "The wind turns the blades, so the turbine makes electricity.",
              "Does the turbine use wind? Yes, it does.",
              "Solar panels don't make power at night, although they work well in the day.",
              "Water may turn the turbine, but it might not turn it fast.",
              "Last year the town built a wind farm because the hill is windy.",
              "Which green energy do you like best, and why?",
            ],
            recycle: ["A turbine is a machine that makes electricity.", "While the water was falling, the turbine was turning.", "We are visiting the power plant on Friday."],
            prompts: ["The turbine turns. (?)", "Coal is green energy. (X)", "Wind is clean. (+ because)", "The water hits the turbine. (T: yesterday)", "A solar panel makes power. (P: solar panels)"],
            real: "Real talk: tell your partner which green energy your town may or might use in the future, and why. Then try a guess about a clue: 'It makes power with the sun, so it might be a ...'. Your partner says if they agree.",
            slips: "'The turbine turn', 'Solar panels makes' or 'It mights'",
            support: ["Does the ___ use ___? Yes, it does.", "The ___ makes ___ from ___."],
            stretch: "Guess the energy from a clue with a reason: 'It makes no noise, so it might be solar power. It can't be a wind turbine, because a turbine makes a sound.'",
            stretchFrames: ["It might be ___, so ___.", "It can't be ___, because ___."],
          }),
        },
        {
          after: "Green energy or fossil fuel? Sort what we read",
          slide: {
            kind: "writing",
            title: "How wind makes electricity: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three steps and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Next and Then, and end with why it is good.",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and tell you one thing they liked.",
              "Teacher: while they write, look only at the -s on verbs (the blade turns) and the sequence words with a comma. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A wind turbine",
              text: "A wind turbine makes electricity from the wind. First, the wind blows against the long blades, and they begin to turn. Next, the shaft turns a machine inside the turbine. Then the electricity goes through wires to homes and schools. Wind is renewable, so we can use it again and again. It makes no pollution, and that is good for the air.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which energy do you explain, and what does it make? (a turbine makes electricity)" },
              { label: "Step 1: First, ...", prompt: "What does the water, wind or sun do first?" },
              { label: "Steps 2 and 3: Next, ... Then, ...", prompt: "What turns or moves? Where does the electricity go?" },
              { label: "Closing: So ...", prompt: "Why is it good? (renewable, no pollution)" },
            ],
            frames: ["A ___ makes electricity from ___.", "First, the ___ ___.", "Next, the ___ turns ___. Then ___ goes to ___.", "___ is renewable, so ___."],
            checklist: [
              "My first sentence says which energy and what it makes",
              "First, Next and Then, with a comma, in the right order",
              "One thing: the verb has -s (it turns, it makes)",
              "I say why it is good with so or because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the dictogloss text the class heard earlier into an explanation the child builds alone. Mark only two targets (the -s on verbs with one thing, and the sequence words) with a dot on the line; the child finds and fixes the mistake. The paragraph is a good script for this lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["A ___ makes electricity from ___.", "First, the ___ ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that compares it with coal or oil: 'Coal makes pollution, but wind makes none.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How does energy get to my lamp?",
        prompt: "Choose one kind of energy (water, wind or sun). Tell us in order how it gets to a lamp in a house. Show your drawing from class.",
        length: "60-90 seconds",
        steps: [
          "Look at your energy's journey drawing from class.",
          "Practise three times: First, Next, Then, So. Each time a little faster, like in class.",
          "Record it once. Look at the camera and show your drawing.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the journey in order with First, Next, Then and So, and keep talking without long stops.",
        words: ["turbine", "electricity", "renewable", "power plant", "wires", "pollution"],
        grammar: ["First / Next / Then / So", "Present simple with -s: the turbine turns, electricity goes"],
        rubric: [
          { label: "In order", description: "Tells the journey in order with First, Next, Then and So.", weight: 3 },
          { label: "Energy words", description: "Uses words from the unit: turbine, electricity, renewable, wires.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Verb endings", description: "The -s can be heard on verbs with one thing: the turbine turns, it makes.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the ___.", "Next, the ___.", "Then, electricity ___.", "It is good because ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the wind / water / sun ___.", "Next, the ___ turns / makes ___.", "Then electricity goes to ___.", "So it helps ___."], tips: ["Say who or what in every step."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It is renewable, so ___.", "I think this is the best source because ___."], tips: ["Add why it is good, and compare it with coal or oil."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u09-l3": {
      objectives: ["I can say what I may or might do, fast and without adding -s or to."],
      trim: {
        "Sure or not sure? The line game": 3,
        "Mystery bag guessing game": 4,
        "The future of energy: what might happen?": 3,
        "Our big idea": 3,
        "Song time (SB 93 D)": 4,
        "Think about wind power (SB 92 Think)": 3,
      },
      add: [
        {
          after: "May and might: not sure yet",
          slide: {
            kind: "grammar",
            title: "Level 4 step: must be, might be, can't be",
            hook: "When we can see clues, we can guess what something is: it must be, it might be, it can't be.",
            form: [
              { label: "Nearly sure it is", pattern: "It must be + noun or adjective." },
              { label: "Not sure", pattern: "It might be / may be + noun or adjective." },
              { label: "Nearly sure it is not", pattern: "It can't be + noun or adjective." },
              { label: "Never add", pattern: "No -s after must or can't. Always the plain verb be." },
            ],
            explanation: [
              "Earlier in the unit you used may and might for the future: 'It might rain tomorrow.' We can also use might for a guess about NOW. 'That might be a wind farm.' We do not know, but it is possible.",
              "When we have strong clues, we can be nearly sure. We say must be when the clues say yes: 'I can see tall blades on a hill, so it must be a wind farm.' We say can't be when the clues say no: 'The air is still, so it can't be wind that moves the boat.'",
              "So there is a ladder of guesses: must be (nearly sure it is), might be (maybe), can't be (nearly sure it is not). It grows from this unit's might and may, and it is grammar you will meet again in Oxford Discover 4. Good guessers always give the clue: because ... or so ...",
            ],
            examples: [
              { text: "I can see a lot of solar panels on the roof, so it must be solar power.", note: "strong clue: must be" },
              { text: "The flag is not moving, so it can't be a windy day.", note: "clue says no: can't be" },
              { text: "That building might be a power plant, but I am not sure.", note: "maybe: might be" },
              { text: "It makes a lot of smoke, so it must be a coal power plant.", note: "strong clue" },
              { text: "The sky is full of dark clouds, so it can't be a good day for solar power.", note: "clue says no" },
              { text: "It might be a hydro dam, because I can see a lot of water.", note: "a guess with a reason" },
            ],
            pitfalls: [
              { wrong: "It must is solar power.", right: "It must be solar power.", why: "after must we use the plain verb be" },
              { wrong: "It mustn't be wind.", right: "It can't be wind.", why: "for 'nearly sure it is not' we say can't be; mustn't is for rules" },
              { wrong: "It might be to a wind farm.", right: "It might be a wind farm.", why: "no to after might be" },
            ],
          },
        },
        {
          after: "Level 4 step: must be, might be, can't be",
          slide: drill({
            title: "Grammar drill: may, might and must be",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the person. Rounds 1 and 2 use may and might. In round 3 make a guess from clues with must be, might be and can't be.",
            chunks: [
              "It may rain this weekend, so I might take an umbrella.",
              "She may not go to the museum because it might be closed.",
              "We will have power tonight, but the wind might stop.",
              "I can see a lot of solar panels, so it must be a solar farm.",
              "It can't be wind power, because the air is still.",
              "That might be a power plant, but I am not sure.",
            ],
            recycle: ["If it rains, we will stay home.", "Look at the flags! The wind is going to get stronger.", "We are flying to Tokyo on Monday."],
            prompts: ["It may rain. (?)", "We might go out. (X)", "I may use the fan. (+ because)", "He may help. (P: they)", "(clue card: smoke) It must be ___."],
            real: "Real talk: your partner shows a clue card (smoke, solar panels, a still flag, a lot of water, a long wire). Say a guess with must be, might be or can't be and give the clue: 'There is smoke, so it must be ...'. Then tell your partner what you may or might do tomorrow.",
            slips: "'It mights', 'It may to rain' or 'It must is'",
            support: ["It may / might ___.", "It must be ___, because ___."],
            stretch: "Make a guess and argue against another: 'It must be solar power because of the panels. It can't be wind, because the air is still.'",
            stretchFrames: ["It must be ___ because ___.", "It can't be ___, because ___."],
          }),
        },
        {
          after: "What may or might I do this weekend? (SB 93 G)",
          slide: {
            kind: "fluency",
            title: "Weekend maybe: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say your weekend plan with may and might three times. Each time is smoother and has no stops.",
            chunks: [
              "I may go to the park this weekend.",
              "I might play soccer if it's sunny.",
              "It might rain, so I may read a book.",
              "My friend may come to my house.",
              "I might not go out if it rains.",
            ],
            recycle: ["I'm going to visit my cousin on Saturday.", "We aren't going to take a taxi."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the weekend maybes, then Partner B. Use three sentences. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A says the same maybes a little faster, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A says them again, smooth and fast, then Partner B." },
            ],
            steps: [
              "Choose three things you may or might do this weekend. Plan them on your fingers.",
              "In each round Partner A talks, then Partner B talks. The listener has a job: tick on a finger every time you say may or might with no -s.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Change partners when you hear the bell.",
            ],
            prompts: ["(card: park)", "(card: soccer)", "(card: a book)", "(card: a friend)", "(card: rain)"],
            feedback: fixSteps + " For example, if a child says 'I mights go' or 'I may to go', point to the rule on the board (no -s, no to) and pause after 'I may ...'. If a child says 'She might goes', hold up a finger and say 'might ... go?'",
            teacherNote: "Task repeat means the same task again with a new listener. The fluency comes from repetition; the accuracy comes from the one-minute fix in the middle. Listen for 'mights', 'may to', 'might goes' and 'might will': these are the unit's typical mistakes. Say the final /t/ of 'might' clearly, because it is often dropped. Let children choose their own maybes so that they mean what they say.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frame on the board.", frames: ["I may ___ this weekend.", "I might ___ if ___."] },
              { level: "Core", task: "Say three sentences without looking." },
              { level: "Stretch", task: "Add a reason or a second plan: 'I may go to the park, but I might not go if it rains.'", frames: ["I may ___, but I might not ___ if ___."] },
            ],
          },
        },
        {
          after: "Change the sentences (SB 93 F)",
          slide: {
            kind: "writing",
            title: "How I may save energy: plan, write, check",
            routine: "paragraph",
            genre: "plan",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three ideas and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use may and might for your ideas, and will for the end.",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and tell you one thing they liked.",
              "Teacher: while they write, look only at the plain verb after may and might (no -s, no to) and will for the sure ending. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Saving energy at home",
              text: "There are three ways I may save energy at home. First, I might turn off the lights when I leave my room, because lights use electricity. Next, I may unplug my tablet after I charge it. Then I might ask my family to open the windows instead of using the fan, if the weather is cool. If we all try, we will save a lot of energy, and the air will be cleaner.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "How many ways, and what for? (I may save energy ...)" },
              { label: "Idea 1: First, I might ...", prompt: "What could you turn off or stop using? Why? (because)" },
              { label: "Ideas 2 and 3: Next, I may ... Then, ...", prompt: "What else may you do? Add if for one idea." },
              { label: "Closing: we will ...", prompt: "What is sure to happen if everyone tries?" },
            ],
            frames: ["There are ___ ways I may ___.", "First, I might ___, because ___.", "Next, I may ___. Then I might ___ if ___.", "If we all try, we will ___."],
            checklist: [
              "My first sentence says how many ways and what for",
              "After may and might: the plain verb (no -s, no to)",
              "Will is for the sure ending; may and might are for my ideas",
              "A reason or an if idea, and a full stop at the end of each sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It gives the lesson's practice of may and might a real purpose, so the grammar is used in connected writing. Mark only two targets (the plain verb after may or might, and will for the sure ending) with a dot on the line; the child finds and fixes the mistake.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["There are ___ ways I may ___.", "First, I might ___, because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with a second plan: 'I may walk to school, but I might not if it rains.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
        "od2e-l3-u09-l4": {
      objectives: ["I can ask and answer 'Will you ...?' questions about saving energy, fast and without stopping."],
      trim: {
        "Sentence builder: is, are, was, were": 4,
        "Opposite words (SB 95 D)": 6,
        "Big Question Review (SB 94-95)": 6,
        "Electric things at home (SB 94 Think)": 5,
        "Plan and test your panel": 8,
        "Underline the subject, circle the verb (SB 95 E)": 4,
        "Writing practice (Workbook)": 8,
        "Listen again: missing words (SB 94 B)": 4,
      },
      add: [
        {
          after: "Count and noncount nouns: choose the verb",
          slide: drill({
            title: "Grammar drill: is, are, was and were",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time. Choose is, are, was or were, and the -s on the verb. In round 3 guess what is at home with must be and can't be.",
            chunks: [
              "Electricity is very useful, and it makes our homes work.",
              "Are the lights on? Yes, they are.",
              "Windmills were common long ago, but now we use wind turbines.",
              "Pollution is a problem, so we are using more green energy.",
              "Oil makes pollution, although it is a strong energy.",
              "That must be the fridge, because it is making a noise.",
            ],
            recycle: ["Will you turn off the lights? Yes, I will.", "If we save energy, the air will be cleaner.", "We might use more solar power."],
            prompts: ["Electricity is useful. (?)", "Coal is clean. (X)", "Oil makes pollution. (+ so)", "The windmills are on the hill. (T: long ago)", "Electricity is important. (P: batteries)"],
            real: "Real talk: tell your partner two electric things in your home and say if they are old or new, loud or quiet. Then play a sound game: your partner makes a sound and you guess: 'It must be the ... because ...' or 'It can't be the ..., because ...'.",
            slips: "'Electricity are', 'Windmills was' or 'Oil make pollution'",
            support: ["___ is / are ___.", "It must be the ___."],
            stretch: "Guess with a reason, then change the time: 'It must be the fan, because I can feel wind. It can't be the heater. Long ago, there were no fans.'",
            stretchFrames: ["It must be ___ because ___.", "It can't be ___, because ___.", "Long ago, there ___ no ___."],
          }),
        },
        {
          after: "Ask about the future with will (SB 95 C)",
          slide: {
            kind: "fluency",
            title: "Question chain: Will you save energy?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Will you turn off the lights tomorrow?",
              "Yes, I will. I will turn off the lights, because it saves electricity.",
              "No, I won't. I will turn them off later.",
              "What time will you turn off the TV?",
              "How will you save energy?",
            ],
            recycle: ["It may rain, so I might take an umbrella.", "I'm going to walk to school."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an energy card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left a 'Will you ...?' question about your card.",
              "They answer 'Yes, I will.' or 'No, I won't.' and add one more sentence. Then they ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: lights)", "(card: TV)", "(card: water tap)", "(card: bike)", "(card: heater)"],
            feedback: fixSteps + " For example, if a child says 'Will you turns off?' or 'I will turns', hold up a finger for 'will' and pause 'Will you turn ...?' If a child says 'Yes, I do', point to the frame 'Yes, I will'.",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Will you ...?' and 'I will / I won't' automatic. Time the whole circle and tell them; children like beating their own time. Listen for 'will' followed by the plain verb (no -s, no to), for 'won't' said clearly, and for the final -s of 'saves'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I will.' or 'No, I won't.' and pass the question on with the frame on the board.", frames: ["Will you ___ tomorrow?", "Yes, I will. / No, I won't."] },
              { level: "Core", task: "Ask and answer without looking at the board, and add a reason." },
              { level: "Stretch", task: "Ask 'What time' or 'How' questions: 'How will you save energy?' 'I will walk to school because it saves oil.'" },
            ],
          },
        },
        {
          after: "Underline the subject, circle the verb (SB 95 E)",
          slide: {
            kind: "writing",
            title: "Fix the energy sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong with the verb!",
              "Find the subject. Is it one thing, many things, or a noncount word like electricity?",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Electricity are very useful at home.", answer: "Electricity is very useful at home." },
              { q: "The windmills was on the hill long ago.", answer: "The windmills were on the hill long ago." },
              { q: "Pollution are a big problem.", answer: "Pollution is a big problem." },
              { q: "Coal and oil is fossil fuels.", answer: "Coal and oil are fossil fuels." },
              { q: "Oil make pollution.", answer: "Oil makes pollution." },
            ],
            checklist: ["Noncount words (electricity, pollution, oil) go with is or was", "Many things, or two things joined with and, go with are or were", "One thing or noncount: the verb has -s (makes)"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese learners often drop the -s on verbs and mix up is and are because their first language does not mark them. Fix item 1 together first. Keep to the two or three error types on the checklist today; do not correct other slips unless they get in the way.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 3 with the checklist on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u09-l5": {
      objectives: ["I can give an energy forecast with will, may and might, three times, smoother each time."],
      trim: {
        "Forecast jump: sure or maybe?": 7,
        "Two energy towns: ask and fill in the forecast": 10,
        "Write it: our energy forecast": 8,
        "Champion talk: 3 rounds": 8,
        "Grammar mystery: The Day of the Windy Hill Fair": 6,
        "Remember it!": 4,
        "Grammar detectives: Is / Is Not": 8,
      },
      add: [
        {
          after: "Grammar: will, may and might",
          slide: drill({
            title: "Grammar drill: will, may, might and must be",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Use will for sure, may and might for maybe, and must be and can't be for a guess from clues.",
            chunks: [
              "The sun will shine tomorrow, so the solar panels will make power.",
              "It may rain on Saturday, but we might still go to the fair.",
              "Will the turbines spin tonight? They might, but I am not sure.",
              "We might not use coal because it makes pollution.",
              "The panels are very hot, so it must be a sunny day.",
              "The turbines are not moving, so it can't be a windy day.",
              "It must be wind power, but it might be water power too.",
            ],
            recycle: ["A turbine is a machine that makes electricity.", "If we use green energy, the air will be cleaner.", "The plane leaves at six, but we are taking the train on Friday."],
            prompts: ["The sun will shine. (?)", "It may rain. (X)", "The wind might blow. (+ so)", "The wind will blow. (T: last week)", "She might use solar power. (P: they)"],
            real: "Real talk: say what will happen in your town tomorrow and what may or might happen. Then your partner gives a clue (a still flag, hot panels, dark clouds, smoke) and you guess with must be, might be or can't be: 'The flag is not moving, so it can't be ...'.",
            slips: "'It mights', 'It must is', 'It might will' or 'It may to rain'",
            support: ["It will / may / might ___.", "It must be ___, because ___."],
            stretch: "Give a forecast and then a guess from a clue, using must be and can't be in one turn: 'It will be sunny, so it must be a good day for solar power. It can't be a good day for wind power.'",
            stretchFrames: ["It will ___, so it must be ___.", "It can't be ___, because ___.", "It might be ___ if ___."],
          }),
        },
        {
          after: "Two energy towns: ask and fill in the forecast",
          slide: {
            kind: "fluency",
            title: "Forecast talk 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same forecast to three friends. Each talk is shorter and smoother.",
            chunks: [
              "Tomorrow the sun will shine, so the solar panels will make power.",
              "The wind may blow tonight, so the turbines might spin fast.",
              "We might use more wind power if the weather is windy.",
              "We will not use coal because it makes pollution.",
              "Do you think it might rain on Saturday?",
            ],
            recycle: ["First, the water hits the turbine.", "Will you turn off the lights? Yes, I will."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the forecast, then Partner B. The listener counts will, may and might on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same forecast in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A is fast and smooth, then Partner B. The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Plan your forecast for one town: what will happen, and what may or might happen.",
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
            ],
            feedback: fixSteps + " For example, if a child says 'It might will rain', point to the rule 'will OR might', or if a child says 'It mights rain', start 'It might ...' and pause. Say 'will' and 'might' with a clear final sound yourself.",
            teacherNote: "This is the 4-3-2 activity (here 75, 60 and 45 seconds for each speaker) for eight-to-ten-year-olds. The same talk to a new listener keeps the repetition real. The gain in fluency comes from saying the same thing more smoothly; the gain in accuracy comes from the one-minute fix after round 1. Do not add new language between rounds. Listen for the sure/not sure choice: will for the sure things, may or might for the maybes.",
            tiers: [
              { level: "Support", task: "Say two forecast sentences with the frames.", frames: ["Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___."] },
              { level: "Core", task: "Say four sentences with will, may and might, without the board." },
              { level: "Stretch", task: "Add a plan with a reason: 'We might use more wind power if the weather is windy, because it makes no pollution.'", frames: ["We might ___ if ___, because ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Our town's forecast: plan, write, check",
            routine: "paragraph",
            genre: "forecast",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the sure sentence (will), the maybe sentences (may, might) and the closing opinion.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use so, because and if.",
              "Check: tick the checklist. Swap with a partner: they underline one linking word and tell you one thing they liked.",
              "Teacher: while they write, look only at will for sure things and may or might for maybes. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Our town's forecast",
              text: "Our town will use sun and wind. Tomorrow the sun will shine, so our solar panels will make a lot of power. The wind may blow in the evening, so the turbines might spin fast. If it rains on Saturday, we might use less solar power. I think green energy is good because it makes little pollution.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which energy will your town use? (will)" },
              { label: "Detail 1: Tomorrow ... will ...", prompt: "What is sure to happen? What will it make? (so)" },
              { label: "Detail 2: ... may / might ...", prompt: "What is only a maybe? What if the weather changes? (if)" },
              { label: "Closing: I think ...", prompt: "Which energy is good, and why? (because)" },
            ],
            frames: ["Our town will use ___.", "Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___. It might ___ if ___.", "I think ___ is good because ___."],
            checklist: [
              "My first sentence says which energy my town will use",
              "Sure things use will; maybes use may or might",
              "After will, may and might: the plain verb (no -s, no to)",
              "A comma before so, and a full stop at the end",
              "One sentence with must be, might be or can't be and a clue (Level 4 step)",
            ],
            sayIt: "Read your forecast to your partner, then tell it again without looking.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself, and the child decides what is sure and what is only a maybe before writing. Point to each part on the model (topic sentence, details, closing opinion). Mark only two targets (will against may or might, and the plain verb after them) with a dot on the line; the child finds and fixes the mistake. The paragraph is a good script for this lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Copy the model and change the energy sources and the weather.", frames: ["Our town will use ___.", "Tomorrow the ___ will ___, so ___."] },
              { level: "Core", task: "Write your own forecast with one sure sentence and two maybes." },
              { level: "Stretch", task: "Add a closing sentence about the future: 'In the future, we may use more ___ because ___.'", frames: ["In the future, we may ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My energy forecast talk",
        prompt: "Tell us the forecast for your town or your home for tomorrow. What will happen for sure? What may or might happen? Say which energy you think we will use.",
        length: "60-90 seconds",
        steps: [
          "Look at the forecast you wrote in class.",
          "Practise three times: each time a little faster, like the 4-3-2 in class.",
          "Record it once. Look at the camera and say one 'will' sentence and two 'may' or 'might' sentences.",
          "Finish with one guess from a clue: 'The flag is not moving, so it can't be a windy day.' or 'It must be ...'.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what will happen and what may or might happen, and keep talking without long stops.",
        words: ["solar panel", "wind turbine", "electricity", "pollution", "renewable", "weather"],
        grammar: ["will + plain verb (sure)", "may / might + plain verb (not sure)", "must be / might be / can't be (a guess from clues)"],
        rubric: [
          { label: "Sure and maybe", description: "Uses will for a sure thing and may or might for a maybe.", weight: 3 },
          { label: "Plain verb", description: "No -s and no 'to' after will, may or might (not 'mights', not 'may to go').", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Tomorrow the ___ will ___.", "It may ___.", "It might ___."], tips: ["Hold up your forecast and point to each sentence."] },
          { level: "Core", who: "Most children", frames: ["Tomorrow the ___ will ___, so ___.", "The ___ may ___ because ___.", "We might ___ if ___."], tips: ["Say one sure thing and two maybes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In the future, we may use more ___ because ___.", "I think ___ is the best source because ___."], tips: ["Add your opinion and say what may happen in the future."] },
        ],
      },
    },
  },
};
