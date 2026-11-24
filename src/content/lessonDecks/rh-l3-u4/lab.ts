import type { UnitLab } from "@/lib/lessonDecks/lab";

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

export const rhL3U4Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u4-l1": {
      objectives: ["I can say sentences with want to, enjoy -ing and let me fast, without stopping."],
      add: [
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
            title: "Combine it: team sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 8,
            steps: [
              "Read the two short sentences. Find the joining word in brackets.",
              "Say your ONE sentence aloud first, then write it.",
              "Check your sentence with the checklist, then read it to your partner.",
            ],
            items: [
              { q: "We wanted to win. We decided to share the jobs. (so)", answer: "We wanted to win, so we decided to share the jobs." },
              { q: "Nam enjoys cooking. Lan enjoys cooking. (and)", answer: "Nam and Lan enjoy cooking." },
              { q: "Our teacher said yes. We could choose our groups. (let)", answer: "Our teacher let us choose our groups." },
              { q: "Thank you. You waited for us. (Thanks for)", answer: "Thanks for waiting for us." },
            ],
            frames: ["We wanted to ___, so we decided to ___.", "Our teacher let us ___."],
            checklist: ["After want, decide and hope: to + verb", "After enjoy, finish and thanks for: verb + -ing", "After let: no 'to' (let us choose)"],
            sayIt: "Read your four sentences to your partner, then say item 1 again without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced routines for children's writing and is the exam's own format (join the sentences). Model item 1 on the board first. Item 2 also checks the verb ending: 'Nam and Lan enjoy' has no -s.",
            tiers: [
              { level: "Support", task: "Do items 1 and 3 with the frames on the board." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more pairs for your partner to combine, with 'enjoy' and 'want'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u4-l2": {
      objectives: ["I can tell what people usually do and what they are doing right now, with no long stops."],
      add: [
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
      add: [
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
      add: [
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
            title: "Model it: our class team",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Underline the verbs that go with everyone, each and both.",
              "Write three sentences about your own team with everyone, each and both.",
              "Check with the checklist, then read them to your partner.",
            ],
            text: {
              title: "Everyone has a job",
              text: "Everyone in our class has a job. Each of us has a different task: one child waters the plants, and two children clean the board. Both teachers help us if we ask. The box of markers is on the shelf, so nobody forgets where it is.",
            },
            frames: ["Everyone in our team ___s.", "Each of us ___s.", "Both ___ and ___ are ___."],
            checklist: ["Everyone, each, nobody: verb + -s", "Both, A and B: no -s on the verb", "The box of markers IS: the verb agrees with box"],
            sayIt: "Read your three sentences to your partner, then say them again without looking.",
            teacherNote: "A short model first lets children notice the pattern before they produce it. Point out that 'The box of markers is' is a common exam trap: the noun next to the verb is not the subject.",
            tiers: [
              { level: "Support", task: "Copy the first frame and finish it about your team." },
              { level: "Core", task: "Write three sentences with everyone, each and both." },
              { level: "Stretch", task: "Add a 'The ___ of ___ is ___' sentence." },
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
        grammar: ["Everyone / each + verb-s", "Both + verb (no -s)", "People get things done best when ___"],
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
      add: [
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
            title: "Grow it: farm rules",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentence. It has no helping verb yet.",
              "Make it bigger with the words in brackets. Say it first, then write it.",
              "Check the helping verb: no 'to' after must and should.",
            ],
            items: [
              { q: "Farmers work. (add: have to, hard, in the rainy season)", answer: "Farmers have to work hard in the rainy season." },
              { q: "You wear a helmet. (add: must, on the bike)", answer: "You must wear a helmet on the bike." },
              { q: "We use water. (add: should, less, at home)", answer: "We should use less water at home." },
              { q: "Visitors pay. (add: don't have to, to enter the farm)", answer: "Visitors don't have to pay to enter the farm." },
            ],
            frames: ["You mustn't ___ because ___.", "Everyone has to ___."],
            checklist: ["After must, should, can: the plain verb, no 'to'", "mustn't = not allowed; don't have to = not needed", "He, she, it: has to (not have to)"],
            sayIt: "Read your four rules to your partner in a strong rule voice, then say two without looking.",
            teacherNote: "Expanding a bare sentence is easier than a blank page, and it practises the exam's rewrite format. Model item 1 on the board. Note that item 4 needs 'don't have to', not 'mustn't': ask children why.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two farm rules of your own with must and don't have to." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u4-l6": {
      objectives: ["I can say what I would do if things were different, three times, faster each time."],
      add: [
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
            title: "Combine it: real or imagined?",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 8,
            steps: [
              "Read the two facts. They are true now.",
              "Make ONE 'if' sentence that imagines something different.",
              "Say it first, write it, then check the checklist.",
            ],
            items: [
              { q: "I am not a farmer. I don't keep ducks.", answer: "If I were a farmer, I would keep ducks." },
              { q: "We don't have a garden. We can't grow tomatoes.", answer: "If we had a garden, we could grow tomatoes." },
              { q: "It doesn't snow in Hanoi. People don't wear big coats.", answer: "If it snowed in Hanoi, people would wear big coats." },
              { q: "I don't have much time. I don't join the club.", answer: "If I had more time, I would join the club." },
            ],
            frames: ["If I were ___, I would ___.", "If we had ___, we could ___."],
            checklist: ["If + past simple (had, snowed), then would + plain verb", "If I / he / she / it were", "Never 'would' after 'if'"],
            sayIt: "Read your four sentences to your partner, then say them again without looking.",
            teacherNote: "This is the exam's 'sentence combining' format for the second conditional: two true facts become one imagined sentence. Model item 1 first. Point out the pattern: a 'not' in the fact becomes a positive in the 'if' part.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more true facts for your partner to turn into 'if' sentences." },
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
        grammar: ["If + past simple, would + verb", "If I were ___", "What would you do if ___?"],
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
      trim: { "Read: \"The Ant and the Grasshopper\"": 10 },
      add: [
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
      add: [
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
            title: "Dictogloss: after the clean-up",
            routine: "dictogloss",
            mode: "groups",
            minutes: 8,
            steps: [
              "Rule reminder: present becomes past (is to was), will becomes would, can becomes could. Say it once together.",
              "Listen to the text the first time. Do not write.",
              "Listen the second time. Write key words only: who, what, when.",
              "In your group, rebuild the text in your own words. It must be correct.",
              "Compare with the real text on screen and mark any difference.",
            ],
            text: {
              title: "After the clean-up",
              text: "After the beach clean-up, a reporter asked the volunteers some questions. One girl said that she was tired but happy. A boy said that he would come again next month. Their teacher told the reporter that the children worked very hard. The reporter said that she could not believe it.",
            },
            frames: ["A reporter asked the volunteers ___.", "One girl said that ___.", "A boy said that he would ___."],
            checklist: ["said that + past form (was, would, could)", "told + a person: told the reporter", "The final -ed on asked and worked can be seen"],
            sayIt: "Read your rebuilt text to another group, then tell it again without looking.",
            teacherNote: "Dictogloss on a short original text lets children notice the reporting verbs. After the comparison, ask: 'which verb changed from the speaker's words?' The text names no real person.",
            tiers: [
              { level: "Support", task: "Write the four 'said that' phrases you hear, then build sentences from them." },
              { level: "Core", task: "Rebuild the whole text in your group." },
              { level: "Stretch", task: "Add two more reported sentences of your own about the clean-up." },
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
