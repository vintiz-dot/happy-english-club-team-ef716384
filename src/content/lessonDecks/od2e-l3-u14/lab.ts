import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 14 "Glass and
// Clever Ideas" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10.
// Every lesson gets one fluency routine (the unit's grammar said again and again as whole
// sentences, shorter and faster each round, with Unit 13's phrases mixed back in) and one
// writing routine that ends by saying the sentences aloud. Lessons 2, 4 and 6 end with a
// recorded talk for home that repeats the class routine. Time comes from games and
// repeats, never from the book pages, the grammar or the checks. All text is original.

const fixBetween =
  "Between round 1 and round 2, stop for one minute: write two mistakes you heard on the board (no names) and let the class fix them. Children who then say it again use the fixed form. For grammar, make the child fix it themselves rather than saying it for them: start the phrase and pause ('A jet flies fast...'), point to the frame on the board, hold up a finger for the missing word ('more' or 'than' or 'the'), or repeat the error with a rising voice ('more fast?'). For a sound, say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

const fixAfter =
  "Listen and do not stop the talk. Note two or three mistakes (no names). At the end, spend one minute on them: write them on the board and let the class fix them. Make the child fix grammar themselves: start the phrase and pause ('Who runs fast...?'), point to the frame, hold up a finger for the missing word ('more', 'than', 'the'), or repeat the error with a rising voice ('carefullier?'). For a sound, say it right and let the child echo it. Say every final -s and -ed clearly yourself.";

const talkNote = "Grown-up: hold the phone and let your child speak; do not say the words for them.";

const drillFeedback =
  "Prompt, do not tell: for 'A jet flies more fast' start the phrase and pause ('A jet flies ...?'); for a missing 'than' hold up a finger and point to the frame; for 'The telephone invented' repeat it with a rising voice ('The telephone invented?') and let the child add 'was'. Watch the small words Vietnamese learners drop: than, the, was / were, and the final -s and -ed. For a sound, a quick recast is fine: say it right and the child echoes. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  minutes?: 6 | 7;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  note1?: string;
  real: string;
  slips: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
  extra?: string;
}): Slide {
  const six = o.minutes === 6;
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: six ? 6 : 7,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      {
        seconds: 60,
        say:
          "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or the tense, P = change the person). The class says the new sentence together." +
          (o.note1 ? " " + o.note1 : ""),
      },
      { seconds: six ? 75 : 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can, for example X and P." },
      { seconds: six ? 75 : 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with every small word (than, the, was, were) and the -s or -ed where it belongs.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. Draw the five signs big on cards and keep the pace brisk; a drill that drags loses its point. Children aged 8-10 enjoy the sign cards, so let them hold the cards in round 2. Mark nothing in writing: this is about speed and accuracy in speech. The Stretch tier and round 3 take the grammar one step toward Oxford Discover 4." +
      (o.extra ? " " + o.extra : ""),
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence with the signs, add a reason with because, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

// The unit's one Level 4 step: where the grammar of this unit grows next.
const step: Slide = {
  kind: "grammar",
  title: "Level 4 step: the past passive",
  hook: "Put the thing first: 'The telephone was invented in 1876.'",
  form: [
    { label: "One thing", pattern: "thing + was + past participle (+ by + person)   (The vase was made by a glassblower.)" },
    { label: "More than one thing", pattern: "things + were + past participle (+ by + person)   (Windows were made of glass.)" },
    { label: "Question", pattern: "Was / Were + thing + past participle ...?   (Was the telephone invented in 1876?)" },
    { label: "No", pattern: "thing + wasn't / weren't + past participle   (The first car wasn't made of plastic.)" },
  ],
  explanation: [
    "Until now you said who did something: 'A glassblower made the vase.' In the past passive the thing comes first, because the thing is the star of the sentence: 'The vase was made by a glassblower.' We use was or were, and then the past participle, the verb's third form: made, built, invented, broken.",
    "We use it when the thing matters more than the person, when we do not know who did it, or when the person is not important: 'The window was broken last night.' We only add by + a person when that is interesting. We often add a time too: in 1876, long ago, in ancient times.",
    "You have already met it in this unit: 'Before lamps were invented ...' is a past passive! Now you can build your own. It grows out of the past tense and was / were, and it is grammar you will meet again in Oxford Discover 4, where books tell the stories of inventions and history.",
  ],
  examples: [
    { text: "Glass was made by people in ancient times." },
    { text: "The telephone was invented in 1876.", note: "No 'by' here: we do not need to say who." },
    { text: "The first windows were made of small pieces of glass." },
    { text: "The vases were made by a glassblower in Venice." },
    { text: "Was the lamp invented before the telephone?  No, it wasn't." },
    { text: "Windows weren't made of plastic long ago." },
  ],
  pitfalls: [
    { wrong: "The telephone invented in 1876.", right: "The telephone was invented in 1876.", why: "English needs was or were before the past participle. In Vietnamese the meaning can be carried by 'được' or 'bị', but English always says the verb be." },
    { wrong: "The windows was made of glass.", right: "The windows were made of glass.", why: "More than one thing needs were, as in 'the windows were' and 'the vases were'." },
    { wrong: "The vase was maked by a glassblower.", right: "The vase was made by a glassblower.", why: "Many past participles are irregular: made, built, written, broken. Learn them as whole chunks, like 'was made by'." },
  ],
};

export const odL3U14Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u14-l1": {
      objectives: ["I can say sentences about glass fast and smoothly, without long stops."],
      trim: { "Glass spotting": 4, "Stand on the line": 5, "Two word webs": 6 },
      add: [
        {
          after: "Think about it (SB 137 Think)",
          slide: {
            kind: "fluency",
            title: "Glass sentence sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each whole sentence fast and smooth, with the endings clear.",
            chunks: [
              "A window is made of glass.",
              "Glass is clear, but it breaks easily.",
              "A glassblower works in a very hot workshop.",
              "My grandmother wears eyeglasses when she reads.",
              "Long ago, people didn't have glass windows.",
            ],
            recycle: ["A lever and a ramp help people carry heavy things.", "I like machines, and my friend does, too."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher points to a picture, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one points to a picture, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! Count how many whole sentences you can say." },
            ],
            steps: [
              "Look at the picture. Say the WHOLE sentence, not just one word.",
              "Say it again, a little faster, with the same words.",
              "Listen for the clap: change roles.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then do round 2.",
            ],
            prompts: ["(picture: a window)", "(picture: a glass cup)", "(picture: a glassblower)", "(picture: a grandmother reading)", "(picture: a house long ago)"],
            feedback: fixBetween + " For this unit: listen for 'glassblower work' (it needs 'works'), 'made by glass' (it is 'made of glass'), and 'didn't had'.",
            teacherNote: "Whole sentences only. The aim is to say 'A glassblower works in a very hot workshop' as one smooth piece. Vietnamese speakers often drop the final -s of 'works', 'wears' and 'windows', so say those endings clearly and let the children echo. Mix in last unit's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Look at the sentence on the board and say it with a friend.", frames: ["A ___ is made of glass.", "Glass is ___, but ..."] },
              { level: "Core", task: "Say each sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'A window is made of glass because we can see through it.'", frames: ["___ is made of glass because ___."] },
            ],
          },
        },
        {
          after: "Glass sentence sprint",
          slide: drill({
            title: "Grammar drill: glass is harder than ..., ask it, say no",
            goal: "Compare glass things in whole sentences, and change each sentence fast with a sign.",
            chunks: [
              "Glass is harder than paper.",
              "A glass cup is heavier than a paper cup.",
              "A window is clearer than a wall.",
              "Glass breaks more easily than wood.",
              "A glassblower works more carefully than a beginner.",
              "Long ago, glass was more expensive than it is today.",
            ],
            recycle: [
              "Have you ever seen a glassblower at work? No, I have never seen one.",
              "I like clear glass. So do I.",
              "The workshop was so hot that we opened the door.",
            ],
            prompts: ["(picture: glass and paper)", "(picture: a glass cup and a paper cup)", "(picture: a window and a wall)", "(picture: glass and wood)", "(picture: a glassblower and a beginner)", "(picture: a glass factory long ago and today)"],
            note1: "Use the first four sentences. The unit's new grammar (more carefully than, the fastest) comes in lesson 3, so today only listen to it in sentence 5.",
            real: "Real talk: compare two things you have at home or at school (your cup and your bottle, your bag and your friend's bag). Say two sentences, then ask 'Which do you like more, and why?' Remember one answer to tell the class.",
            slips: "'more hard', a missing 'than', 'breaks easy', and a missing -s on 'works' and 'breaks'",
            support: ["___ is harder / heavier / clearer than ___.", "Is ___ harder than ___?  Yes, it is. / No, it isn't."],
            stretch: "Make the comparison stronger with much or a bit (Level 4 grammar): 'Glass is much harder than paper. A glass cup is a bit heavier than a paper cup.'",
            stretchFrames: ["___ is much / a bit ___er than ___.", "___ is far more ___ than ___."],
            extra: "In this lesson the sentences are comparisons of things; the same shape grows into adverbs ('more carefully than') in lesson 3.",
          }),
        },
        {
          after: "Summarize it (SB 137 D)",
          slide: {
            kind: "writing",
            title: "Grow a glass sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentence with your partner.",
              "Make it bigger: add the words in brackets. Say the big sentence first, then write it.",
              "Check your sentence with the checklist. Read it aloud.",
            ],
            items: [
              { q: "Glass breaks. (add: easily)", answer: "Glass breaks easily." },
              { q: "A glassblower works. (add: in a hot workshop)", answer: "A glassblower works in a hot workshop." },
              { q: "I wear eyeglasses. (add: when I read)", answer: "I wear eyeglasses when I read." },
              { q: "The vase is on the table. (add: blue)", answer: "The blue vase is on the table." },
            ],
            frames: ["___ breaks easily.", "A ___ works in a ___.", "I wear ___ when I ___."],
            checklist: ["A capital letter at the start and a full stop at the end", "The -s on a verb with he, she or it (works, breaks)"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence is a common, well-supported way to grow children's writing: it shows where details go through use. Do item 1 together first, saying it aloud before writing.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more bare sentences about glass and make your partner grow them." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u14-l2": {
      objectives: ["I can retell Clara's story in three parts, faster each time."],
      trim: { "Home talk: glass things": 3, "Expressive reading": 4, "Skits: Clara, her father and Mr. Lombardi": 6, "A new ending": 6, "Culture note: glass from Venice": 3 },
      add: [
        {
          after: "Story map: beginning, middle, end",
          slide: {
            kind: "fluency",
            title: "Retell Clara's story: three tellings",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the story three times, to three partners. In each round both partners tell it. Each time it is shorter, smoother and faster.",
            chunks: [
              "In the beginning, Clara bumped the delicate vases.",
              "In the middle, Clara had a clever idea.",
              "Clara solved the problem by using glass in a new way.",
              "At the end, everybody was happy.",
            ],
            recycle: ["A lever and a ramp help people lift things.", "I can't ride a unicycle, and my partner can't, either."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the story, then Partner B. Use your story map. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast and smooth, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your story map. Tell the beginning, the middle and the end. In every round, Partner A tells it, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard (often a missing -ed or -s) on the board and let the class fix them. Then go on to round 2.",
              "When the bell rings, find a new partner. Partner A tells it again, then Partner B.",
              "The listener has a job: count the three parts on your fingers and ask one question at the end.",
            ],
            prompts: ["(story map: beginning)", "(story map: middle)", "(story map: end)"],
            feedback: fixBetween + " For this lesson: listen for 'Clara bump' (it needs 'bumped'), 'the vase break' and a missing 'the' before 'beginning'.",
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words, and the one-minute fix in the middle helps the second telling be more accurate too. Keep your own story map on the board for Support children. Adjust the chunks to match what your class wrote on its maps.",
            tiers: [
              { level: "Support", task: "Point to each box on the story map and say one sentence for it.", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add how people felt and why: 'Her father was upset because ...'", frames: ["He felt ___ because ___."] },
            ],
          },
        },
        {
          after: "Retell Clara's story: three tellings",
          slide: drill({
            title: "Grammar drill: Clara ran faster than ..., ask it, say no",
            goal: "Compare the people in Clara's story with whole sentences, and change each sentence fast with a sign.",
            chunks: [
              "Clara ran faster than her father.",
              "Her father worked more carefully than Clara.",
              "Clara spoke more quietly than Mr. Lombardi.",
              "The workers carried the vases more slowly than the children.",
              "Clara listened more carefully than before.",
              "Of all the workers, her father worked the hardest.",
            ],
            recycle: [
              "While Clara was walking, she bumped a vase.",
              "If the glass breaks, we will help her.",
              "I don't like broken glass. Neither do I.",
            ],
            prompts: ["(picture: Clara and her father running)", "(picture: her father at work)", "(picture: Clara and Mr. Lombardi talking)", "(picture: workers and children with vases)", "(picture: Clara listening)", "(picture: the workshop)"],
            note1: "Keep the sentences in the past tense for the story. Use the T sign to jump to today: 'Clara ran faster than her father' becomes 'I run faster than my father.'",
            real: "Real talk: talk about your own family or class. Who walks faster, you or a friend? Who speaks more quietly? Who works the most carefully? Give a reason with because. Remember one thing your partner said.",
            slips: "'more fast', 'carefullier', a missing 'than', and no -ed on 'walked' or 'listened'",
            support: ["___ ran / worked / spoke faster / more ___ly than ___.", "Did ___ run faster than ___?  Yes, ___ did. / No, ___ didn't."],
            stretch: "Add much, a bit or far to the comparison (Level 4 grammar): 'Her father worked far more carefully than Clara.' Then say why with so ... that: 'He worked so carefully that nothing broke.'",
            stretchFrames: ["___ worked much / a bit / far more ___ly than ___.", "___ worked so ___ly that ___."],
          }),
        },
        {
          after: "Word detectives: delicate, bumped, pounded, footsteps",
          slide: {
            kind: "writing",
            title: "Clara's story: plan, write, check",
            routine: "paragraph",
            genre: "story summary",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the beginning, the middle and the end, and the sentence about what you think.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use In the beginning, In the middle, At the end.",
              "Check: tick the checklist. Swap with a partner: they underline the three parts and tell you one thing they liked.",
              "Teacher: while they write, look only at the two targets in the checklist. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: What happens in Clara's Invention",
              text: "Clara's Invention is a story about a girl and her father, a glassblower. In the beginning, Clara bumped the delicate vases, and they broke. Her father was upset. In the middle, she had a clever idea. She used the broken glass in a new way. At the end, everybody was happy. I like this story because Clara was clever.",
            },
            organiser: [
              { label: "The story", prompt: "What is the story called? Who is in it?" },
              { label: "Beginning", prompt: "What happened first? What was the problem?" },
              { label: "Middle and end", prompt: "What was the clever idea? How did everybody feel?" },
              { label: "I think ...", prompt: "Did you like it? Say why with 'because'." },
            ],
            frames: ["___ is a story about ___.","In the beginning, ___ ___ed the ___.","In the middle, ___ had a clever idea.","At the end, everybody was ___. I like it because ___."],
            checklist: ["The past tense with a clear -ed or the right form: bumped, used, had","In the beginning, In the middle, At the end: three parts in order","was with one person, were with more than one: her father was upset, the vases were delicate","A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your paragraph to your partner. Then tell the story again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It turns the story map and the three retellings into writing. Mark only two targets (the -ed past tense and the three part words) with a dot in the margin; the child finds and fixes the mistake. The paragraph is a good script for the lesson's recorded talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["In the beginning, ___ ___ed the ___.","At the end, everybody was ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add how people felt and why, and what you would do if you were Clara." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Clara's story in three parts",
        prompt: "Tell Clara's story to someone at home in three parts: the beginning, the middle and the end. Show your story map if you have it.",
        length: "60-120 seconds",
        steps: [
          "Look at your story map from class.",
          "Tell the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going.",
          talkNote,
        ],
        maxSeconds: 180,
        kidSummary: "Tell the beginning, the middle and the end, with words like first, then and in the end, and keep talking without long stops.",
        words: ["glassblower", "delicate", "bumped", "vase", "clever idea", "eyeglasses"],
        grammar: ["Past tense: bumped, pounded, solved", "In the beginning / In the middle / At the end"],
        rubric: [
          { label: "Three parts", description: "Tells the beginning, the middle and the end of the story in order.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: delicate, bumped, vase, clever, eyeglasses.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Past tense", description: "Says the past tense with a clear -ed or the right irregular form (had, felt).", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."], tips: ["Point to your story map as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the beginning, Clara ___ the ___.", "Then she had a clever idea: ___.", "In the end, everybody ___."], tips: ["Say who and what happened in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Her father was ___ because ___.", "If I were Clara, I would ___."], tips: ["Say how people felt and what you would do."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u14-l3": {
      objectives: ["I can compare people with 'faster than' and 'the fastest' quickly, without stopping."],
      trim: { "Action race": 3, "Family race game": 3, "Our big idea": 3, "Compare yourself with two classmates (SB 141 G)": 8, "Discover the rule": 7 },
      add: [
        { after: "Comparative and superlative adverbs", slide: step },
        {
          after: "Level 4 step: the past passive",
          slide: drill({
            title: "Grammar drill: faster than, the fastest, and was made by",
            goal: "Say and change sentences with faster than and the fastest, then use the new past passive in real talk.",
            chunks: [
              "A jet flies faster than a train.",
              "A glassblower works more carefully than a beginner.",
              "A cheetah runs the fastest of all land animals.",
              "The telephone was invented in 1876.",
              "Glass was made by people in ancient times.",
              "The first windows were made of small pieces of glass.",
              "Was the lamp invented before the telephone?",
            ],
            recycle: [
              "Have you ever tried to blow glass? No, I have never tried.",
              "I enjoy making things, and I want to learn glassblowing.",
              "A phone is much faster than a letter.",
            ],
            prompts: ["(picture: a jet and a train)", "(picture: a glassblower and a beginner)", "(picture: a cheetah)", "(picture: an old telephone)", "(picture: ancient glass)", "(picture: a window made of small pieces)", "(picture: a lamp and a telephone)"],
            note1: "Rounds 1 and 2 use sentences 1 to 3 (the unit's grammar). Sentences 4 to 7 are the new step, the past passive: they come in round 3. Today the T sign in round 2 can also mean 'say it the passive way': 'A glassblower made it.' becomes 'It was made by a glassblower.'",
            real: "Round 3, the new step: tell your partner two true sentences with was or were + a past participle ('My bowl was made by my grandmother. The windows at school were cleaned last week.'). Then compare two things with faster than or more carefully than. Remember one thing your partner said.",
            slips: "'more fast', a missing 'than', 'the telephone invented' with no was, and 'the windows was made'",
            support: ["A ___ works faster than a ___.", "The ___ was invented in ___."],
            stretch: "Join the two grammars in one sentence: 'The telephone was invented in 1876, and it sends messages more quickly than a letter.' Then ask a question: 'Was it made by hand?'",
            stretchFrames: ["The ___ was invented ___, and it ___ more ___ly than ___.", "Was / Were ___ made by ___?  Yes, it was. / No, it wasn't."],
            extra: "Rounds 1 and 2 practise the unit's comparative and superlative adverbs; round 3 and the Stretch tier practise the Level 4 past passive. Say 'was' and 'were' clearly yourself and let the children echo them.",
          }),
        },
        {
          after: "Circle the correct words (SB 141 F)",
          slide: {
            kind: "writing",
            title: "Who works the fastest? Plan, write, check",
            routine: "paragraph",
            genre: "comparison",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the three helpers, the two comparisons and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use faster than, more ... than and the fastest / the most ... of the three.",
              "Check: tick the checklist. Swap with a partner: they underline one comparison and tell you one thing they liked.",
              "Teacher: while they write, look only at the two targets in the checklist. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Three message helpers",
              text: "A phone, a letter and a messenger on a bicycle all carry words to a friend. A phone sends a message more quickly than a letter, so people can talk at once. A messenger on a bicycle travels faster than a person on foot, but he works more slowly than a phone. Of the three, the phone works the fastest. That is why I call my grandmother when I have good news.",
            },
            organiser: [
              { label: "Three helpers", prompt: "Choose three helpers or machines. Say what they all do." },
              { label: "Compare two", prompt: "Which works faster or more carefully than the other? Say why." },
              { label: "Compare again", prompt: "Compare a different pair. Use 'than'." },
              { label: "The top: of the three", prompt: "Which works the fastest or the most carefully? End with 'That is why ...'" },
            ],
            frames: ["A ___, a ___ and a ___ all help people ___.","A ___ works faster / more ___ly than a ___.","Of the three, the ___ works the fastest / the most ___ly.","That is why ___."],
            checklist: ["than after faster / more ___ly","the before fastest / the most ___ly (not 'more fast')","My first sentence names all three helpers","A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, as a mini talk.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It grows the join-and-compare sentences into a whole paragraph and uses the same grammar as the Circle task. Mark only two targets (than, and the before the superlative, which Vietnamese learners skip most) with a dot in the margin; the child finds and fixes the mistake. The speaking task that follows lets children say what they wrote.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["A ___ works faster than a ___.","Of the three, the ___ works the fastest."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a reason with because, and one comparison with a long -ly word." },
            ],
          },
        },
        {
          after: "Compare yourself with two classmates (SB 141 G)",
          slide: {
            kind: "fluency",
            title: "Who does it best? Question chain",
            routine: "question chain",
            mode: "groups",
            minutes: 6,
            goal: "Ask, answer and pass the question on. Keep the chain going with no stops.",
            chunks: [
              "Who runs faster, you or me?",
              "I run faster than you.",
              "Who jumps the highest in our group?",
              "{s1} jumps the highest.",
              "Who writes more carefully, you or me?",
            ],
            recycle: ["Two subjects: {s2} and {s3} are good inventors.", "I like glass, and my friend does, too."],
            rounds: [
              { seconds: 75, say: "Slow chain round the group. Do the action, then ask the question." },
              { seconds: 60, say: "New group. Faster! Use a different action each turn." },
              { seconds: 60, say: "New group. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Stand in a group of four. Do an action together: run on the spot, jump, write in the air, hop.",
              "Ask the next child: 'Who ___ faster, you or me?' They answer with a whole sentence.",
              "They turn and ask the next child a new question.",
              "Teacher: after the last round, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Who ___ faster, you or me?", "Who ___ the fastest in our group?", "Who ___ more carefully, you or me?"],
            feedback: fixAfter + " Listen especially for 'more fast', 'the fastest' without 'the', and 'faster a friend' (missing 'than').",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which helps make 'faster than' and 'the fastest' automatic. Time the whole group and tell them; children love beating their own time. Ask for whole sentences, not 'me!'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["Who ___ faster, you or me?", "I ___ faster than you."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I write more carefully than you because I check my work.'", frames: ["I ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u14-l4": {
      objectives: ["I can talk about life before and after an invention three times, faster each time."],
      drop: ["Before and after board game"],
      trim: {
        "How the invention changed life": 3,
        "My favourite invention (SB 142 Think)": 3,
        "Who likes which invention? (SB 142 A)": 7,
        "Listen again for the reason (SB 142 B)": 7,
        "Suffixes -ful and -less (SB 143 D)": 9,
        "Writing practice: an invention that changed our lives (Workbook)": 11,
      },
      add: [
        {
          after: "before and after",
          slide: drill({
            title: "Grammar drill: before and after, was invented, ask it, say no",
            goal: "Say and change before-and-after sentences about inventions, and use the past passive (was / were invented) in real talk.",
            chunks: [
              "Before lamps were invented, people used candles.",
              "After the telephone was invented, people could talk from far away.",
              "Before cars were invented, people travelled more slowly than we do.",
              "The first glass was made by people in ancient times.",
              "Glass windows were made for rich people long ago.",
              "Was the lamp invented before the telephone?",
              "Eyeglasses were invented a very long time ago.",
            ],
            recycle: [
              "Before the lamp, people used to read by candles.",
              "A phone is used for sending messages.",
              "A jet flies faster than a train.",
            ],
            prompts: ["(picture: a candle and a lamp)", "(picture: an old telephone)", "(picture: a horse and a car)", "(picture: ancient glass)", "(picture: an old glass window)", "(picture: a lamp and a telephone)", "(picture: eyeglasses)"],
            note1: "Rounds 1 and 2: the unit's before / after sentences, with the comma after the Before part. The T sign can also mean 'say it the passive way': 'People invented the lamp.' becomes 'The lamp was invented.'",
            real: "Round 3: use the Level 4 step. Choose something in your home (a lamp, a phone, a cup) and say when or by whom it was made, and what people used before it: 'My lamp was made in a factory. Before lamps were invented, people used candles.' Remember one thing your partner said.",
            slips: "'before cars invented' with no were, 'the lamp invented' with no was, 'were' and 'was' mixed up, and no comma pause after the Before part",
            support: ["Before ___ were invented, people ___ed.", "The ___ was invented ___."],
            stretch: "Ask and answer with was and were, and add because: 'Were windows made of glass long ago? Yes, they were, because glass lets in light.'",
            stretchFrames: ["Was / Were ___ made of / by ___?  Yes, it was. / No, it wasn't.", "___ was invented because ___."],
            extra: "Rounds 1 and 2 practise before and after; round 3 and the Stretch tier use the past passive, taught in lesson 3. Make sure every child says 'was' or 'were' before the past participle.",
          }),
        },
        {
          after: "Before or after? (SB 143 E)",
          slide: {
            kind: "writing",
            title: "Life before and after: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the Before part, the After part and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start your first sentence with Before, your next part with After, and end with That is why.",
              "Check: tick the checklist. Swap with a partner: they underline your Before sentence and your After sentence.",
              "Teacher: while they write, look only at the two targets in the checklist. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Life before the lamp",
              text: "Before lamps were invented, people used candles to see at night. Candles were not very bright, and they could start a fire. After lamps were invented, people could read and study safely. Life was harder then, but now it is easier. Without lamps, I couldn't do my homework in the evening. That is why the lamp is a useful invention.",
            },
            organiser: [
              { label: "Invention", prompt: "Which invention will you write about? Say what it is." },
              { label: "Before ...", prompt: "Before it was invented, what did people use or do? Add one problem." },
              { label: "After ...", prompt: "After it was invented, what could people do? Use 'could'." },
              { label: "Closing: That is why ...", prompt: "End with 'That is why the ___ is a useful invention.'" },
            ],
            frames: ["Before ___ was / were invented, people ___ed.","After ___ was invented, people could ___.","Life was ___ then, but now it is ___.","That is why the ___ is a useful invention."],
            checklist: ["A comma after the Before / After part","The past tense: used, walked, started (-ed)","was with one thing, were with more than one","After could, the verb has no ending (could read)"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It grows the fix-it work on Before and After sentences into a whole paragraph. Mark only two targets (the -ed past tense and the comma after the Before part) with a dot in the margin; the child finds and fixes the mistake. The paragraph is a good script for the lesson's recorded talk, and a first draft for the Workbook writing practice.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Before ___ was invented, people ___ed.","After ___ was invented, people could ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a comparison: 'It works more quickly than the old way.'" },
            ],
          },
        },
        {
          after: "How the invention changed life",
          slide: {
            kind: "fluency",
            title: "Life before and after: 4-3-2 talk",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three partners. In each round both partners give the talk. Each talk is shorter and smoother.",
            chunks: [
              "Before lamps were invented, people used candles.",
              "After lamps were invented, people could read at night.",
              "Life was hard then, but now it's easier.",
              "Without lamps, I couldn't read in the dark.",
            ],
            recycle: ["A jet flies faster than a car.", "{s1} can't swim, and I can't, either."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the talk about one invention, then Partner B. The listener counts the 'before' and 'after' sentences on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: the same talk in less time, Partner A then Partner B. The listener asks one question at the end. Then change partners." },
              { seconds: 45, say: "Round 3: fast and smooth! Partner A then Partner B. The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Choose one invention. Say what people used to do before it and what they could do after it.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them together. Then go on.",
              "When the bell rings, change partners: one line moves one place to the left. Partner A gives the same talk again, shorter, then Partner B.",
            ],
            feedback: fixBetween + " For this lesson: listen for 'before cars invented' (needs 'were'), 'people walk' (needs 'walked'), and a missing comma pause after the Before part.",
            teacherNote: "The 4/3/2 activity scaled for 8 to 10 year olds: the same talk, less time, new listener. The new partner keeps the repetition real. 4/3/2 alone builds fluency, not accuracy, so the one-minute fix between rounds is not optional. Half the class gives the talk and half listens in each round; the listeners give their own talk in the home recording. Do not add new language between rounds. Listen for the past tense endings and say them clearly yourself.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, looking at the board.", frames: ["Before ___ were invented, people ___.", "After ___ was invented, people could ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a comparison: 'A phone sends a message more quickly than a letter.'", frames: ["It works ___ than the old way."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Life before and after my invention",
        prompt: "Choose one invention at home. Show it to the camera. Tell us how people lived before it and how life changed after it.",
        length: "60-120 seconds",
        steps: [
          "Choose one invention at home (a lamp, a phone, a fridge, eyeglasses).",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like the 4-3-2 in class.",
          "Say one sentence with was or were and a past participle, such as 'My lamp was made in a factory.'",
          "Record it once. Show the invention and keep going.",
          talkNote,
        ],
        maxSeconds: 180,
        kidSummary: "Say what life was like before the invention and what changed after it, and keep talking without long stops.",
        words: ["invented", "before", "after", "candle", "easier", "without"],
        grammar: ["Before ___ was / were invented, people ___ed.", "After ___ was invented, people could ___.", "The past passive: The ___ was / were made / invented (by ___)."],
        rubric: [
          { label: "Before and after", description: "Says what life was like before the invention and what changed after it.", weight: 3 },
          { label: "Grammar: before and after", description: "Uses Before / After with the past tense and a clear -ed (used, walked, could), and says one passive sentence with was or were.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time.", weight: 3 },
          { label: "Reason", description: "Gives a reason with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___.", "Before it, people ___.", "After it, people could ___."], tips: ["Hold up the invention as you speak."] },
          { level: "Core", who: "Most children", frames: ["Before ___ was invented, people used to ___.", "After it was invented, people could ___.", "I like it because ___."], tips: ["Say two things for 'before' and two for 'after'."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It works ___er than / more ___ly than the old way.", "Without it, I couldn't ___."], tips: ["Compare the invention with the old way."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u14-l5": {
      objectives: ["I can give my opinion about an invention in one minute, and say it better the second time."],
      trim: { "60-second recall": 3, "Test our big ideas": 3, "Answer and discuss (SB 144 B)": 5, "The Commercial Showtime": 9 },
      add: [
        {
          after: "Answer and discuss (SB 144 B)",
          slide: {
            kind: "fluency",
            title: "My opinion in one minute: three tellings",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same opinion to three partners. In each round both partners give their opinion. Each time is clearer and faster.",
            chunks: [
              "In my opinion, the phone is the most useful invention.",
              "Before phones were invented, people wrote letters.",
              "A phone sends a message more quickly than a letter.",
              "That is why I think it changed our lives the most.",
            ],
            recycle: ["A good solution is to ask for help.", "I like inventions, and my partner does, too."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives an opinion with a reason, then Partner B. The listener counts the reasons. Then change partners." },
              { seconds: 60, say: "Round 2: the same opinion in less time, Partner A then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: short, clear and fast! Partner A then Partner B." },
            ],
            steps: [
              "Choose an invention. Say your opinion, then one reason, then 'before and after'.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them together. Then go on.",
              "Change partners when the bell rings. Partner A says it again, a little faster, then Partner B.",
              "The listener has a job: count your reasons and ask one follow-up question.",
            ],
            feedback: fixBetween + " Listen for 'the most useful' without 'the', 'more quick' for 'more quickly', and 'people wrote' said as 'people write'.",
            teacherNote: "Task repetition: the same task again, with a new partner, so the language gets smoother each time. This is also your rehearsal for the commercial and the opinion essay later in the lesson, so the children will write what they have already said three times.",
            tiers: [
              { level: "Support", task: "Say the opinion and one reason with the frames.", frames: ["In my opinion, the ___ is the most useful invention.", "I think so because ___."] },
              { level: "Core", task: "Say the opinion, one reason and a before / after sentence." },
              { level: "Stretch", task: "Add a comparison and an example: 'It works faster than ... For example, ...'" },
            ],
          },
        },
        {
          after: "My opinion in one minute: three tellings",
          slide: drill({
            title: "Grammar drill: which works best? was invented, ask it, say no",
            goal: "Say and change opinion sentences with faster than and the most, and use the past passive about inventions.",
            chunks: [
              "A phone sends a message more quickly than a letter.",
              "A robot cleans more quietly than a person.",
              "Which invention works the hardest for us?",
              "The lamp was invented before the telephone.",
              "Glass was made by people in ancient times, and it is still used today.",
              "Which was invented first, the lamp or the telephone?",
            ],
            recycle: [
              "My phone is a bit smaller than yours.",
              "If we use less plastic, the sea will be cleaner.",
              "A phone is used for sending messages.",
            ],
            prompts: ["(picture: a phone and a letter)", "(picture: a robot cleaning)", "(picture: three inventions)", "(picture: a lamp and a telephone)", "(picture: ancient glass)", "(picture: a lamp and a telephone with dates)"],
            note1: "Rounds 1 and 2 use sentences 1 to 3. The T sign can also mean 'say it the passive way'. Sentences 4 to 6 are the past passive, and they are for round 3.",
            real: "Round 3: give your opinion in two sentences: which invention was invented first, and which works the best for you? Use one passive sentence ('The lamp was invented ...') and one comparison. Remember one thing your partner said.",
            slips: "'more quick' for 'more quickly', a missing 'the' before 'most', and 'was invented' said without 'was'",
            support: ["A ___ works faster than a ___.", "The ___ was invented ___."],
            stretch: "Put the passive and the comparison in one sentence with although: 'Although the lamp was invented long ago, it is still the most useful invention in my house.'",
            stretchFrames: ["Although the ___ was invented ___, it ___ more ___ly than ___.", "In my opinion, the ___ is the most useful because ___."],
            extra: "Use today's opinion talk as the rehearsal for the opinion paragraph: the same sentences go into the writing next.",
          }),
        },
        {
          after: "How to write an opinion essay (SB 144 Learn)",
          slide: {
            kind: "writing",
            title: "Plan, write, check: an opinion paragraph",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Find the opinion, the two reasons and the closing sentence.",
              "Plan first: fill a quick box with your invention, your opinion and two reasons.",
              "Write your opening sentence and your first reason.",
              "Check with the checklist, then read it aloud.",
            ],
            text: {
              title: "A model opinion paragraph",
              text: "In my opinion, the lamp is a very useful invention. First, it lets people read and study at night. Second, it makes our homes safer because we can see where we walk. That is why I think the lamp changed our lives.",
            },
            frames: ["In my opinion, the ___ is a very useful invention.", "First, ___.", "Second, ___ because ___.", "That is why I think ___."],
            checklist: ["My opinion is in the first sentence", "First and Second, each with a reason", "A closing sentence that starts 'That is why'"],
            sayIt: "Read your paragraph to your partner. Then say it again without looking, as a mini speech.",
            teacherNote: "Teaching children to plan, write and check is a well-supported way to improve young writers' texts. This is a short warm-up for the longer Write it task: the children plan and write the opening and first reason here, then continue in the Workbook.",
            tiers: [
              { level: "Support", task: "Copy the frame and fill in your invention and one reason." },
              { level: "Core", task: "Write the opinion and two reasons." },
              { level: "Stretch", task: "Write the whole paragraph with a closing sentence and one comparison with 'more ... than'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u14-l6": {
      objectives: ["I can say 'faster than', 'the fastest' and 'more carefully than' fast and right."],
      drop: ["Body ladder: freeze and show"],
      trim: { "Invention race: run and say": 5, "Remember it!": 4 },
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Champion sentence sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say each champion sentence fast and right, with the small words (the, than, more).",
            chunks: [
              "A jet flies faster than a car.",
              "A glassblower works more carefully than a beginner.",
              "A cheetah runs the fastest of all land animals.",
              "A phone sends a message more quickly than a letter.",
              "Who works the most carefully of the three?",
            ],
            recycle: ["Before lamps were invented, people used candles.", "I can't draw well, and my friend can't, either."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture, the class says the whole sentence." },
              { seconds: 60, say: "Boys say the first half, girls say the second half. Then swap." },
              { seconds: 60, say: "Champion round: pairs, as fast as you can!" },
            ],
            steps: [
              "Look at the picture. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write the two mistakes you heard most on the board and fix them together. Then do round 2.",
            ],
            prompts: ["(picture: a jet and a car)", "(picture: a glassblower and a beginner)", "(picture: a cheetah)", "(picture: a phone and a letter)", "(picture: three robots)"],
            feedback: fixBetween + " For this lesson: listen for 'more fast', 'carefullier', a missing 'than', and a missing 'the' before 'fastest' or 'most carefully'.",
            teacherNote: "A cheetah really is the fastest land animal, so the children can check it. This is a quick, high-energy recall straight after the rule; mixing in Unit 14's earlier phrases helps old grammar stay fresh. The small words 'the', 'than' and 'more' are the ones Vietnamese learners skip, so exaggerate them when you model.",
            tiers: [
              { level: "Support", task: "Say each sentence with the frame on the board.", frames: ["A ___ flies faster than a ___.", "A ___ runs the fastest of ___."] },
              { level: "Core", task: "Say each sentence without the board." },
              { level: "Stretch", task: "Make your own sentence about two machines and say it as fast as you can." },
            ],
          },
        },
        {
          after: "@grammar",
          slide: drill({
            title: "Grammar drill: champion sentences, was invented, ask it, say no",
            goal: "Say and change champion sentences with faster than, the fastest and more carefully than, and join them with the past passive.",
            chunks: [
              "A jet flies faster than a car.",
              "A glassblower works more carefully than a beginner.",
              "A cheetah runs the fastest of all land animals.",
              "Who works the most carefully of the three?",
              "The first telephone was invented in 1876.",
              "Glass windows were made by hand long ago.",
              "Which was invented first, the lamp or the telephone?",
            ],
            recycle: [
              "That is the cleverest idea I have ever heard.",
              "We are visiting a glass museum on Saturday.",
              "The robot worked so quickly that nobody saw it move.",
            ],
            prompts: ["(picture: a jet and a car)", "(picture: a glassblower and a beginner)", "(picture: a cheetah)", "(picture: three robots)", "(picture: an old telephone)", "(picture: a glass window)", "(picture: a lamp and a telephone)"],
            note1: "Both grammars today: sentences 1 to 4 (the unit's grammar) in rounds 1 and 2, and the past passive in sentences 5 to 7 with the T sign. Say 'was' and 'were' clearly.",
            real: "Round 3, both grammars: tell your partner about two inventions in four sentences. Say which works faster or more carefully (comparison), and when or by whom each was invented (past passive). Remember one thing your partner said.",
            slips: "'more fast', a missing 'than' or 'the', 'the telephone invented' with no was, and 'were' and 'was' mixed up",
            support: ["A ___ works faster than a ___.", "The ___ was invented ___."],
            stretch: "Join both grammars in one sentence: 'Although the telephone was invented long ago, it sends messages more quickly than a letter.' Then ask a partner a question with Which was invented first ...?",
            stretchFrames: ["Although the ___ was invented ___, it ___ more ___ly than ___.", "Which was invented first, the ___ or the ___?"],
            extra: "This is the last lesson of the unit: listen for both grammars together and note which children still drop 'than' or 'was'.",
          }),
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Grow a champion sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the short sentence. Say the big sentence out loud first.",
              "Make it a champion sentence: add the comparison in brackets. Write it.",
              "Check it, then read it aloud.",
            ],
            items: [
              { q: "A jet flies fast. (add: compare with a bus)", answer: "A jet flies faster than a bus." },
              { q: "A glassblower works carefully. (add: compare with a beginner)", answer: "A glassblower works more carefully than a beginner." },
              { q: "A cheetah runs fast. (add: the top, of all land animals)", answer: "A cheetah runs the fastest of all land animals." },
              { q: "A robot works quietly. (add: the top, of the three machines)", answer: "A robot works the most quietly of the three machines." },
            ],
            frames: ["A ___ flies faster than a ___.", "A ___ works more ___ly than a ___.", "A ___ runs the fastest of ___."],
            checklist: ["than after faster / more ___ly", "the before fastest / the most ___ly", "A capital letter and a full stop"],
            sayIt: "Read your champion sentences to your partner, then say item 1 again without looking.",
            teacherNote: "This is a short warm-up for the paragraph that follows. Do item 1 together and say it aloud before writing. Look for the three Vietnamese-learner slips: no 'than', no 'the' before the superlative, and 'more fast'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more bare sentences about machines and grow them into champion sentences." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Who does it better? Two helpers",
        prompt: "Choose two helpers at home or two machines (for example a phone and a letter, a fan and a window). Show them to the camera and compare how they work.",
        length: "60-120 seconds",
        steps: [
          "Choose two helpers or two machines and look at them.",
          "Say your comparison three times to a grown-up or a toy. Each time a little faster.",
          "Say one sentence with was or were and a past participle about one of them, such as 'The phone was invented in 1876.'",
          "Record it once. Say which one works the best and why.",
          talkNote,
        ],
        maxSeconds: 180,
        kidSummary: "Compare two helpers with 'faster than' and 'more carefully than', say which works the best, and keep talking without long stops.",
        words: ["faster", "more carefully", "the fastest", "the most carefully", "better", "invention"],
        grammar: ["A ___ works faster / more ___ly than a ___.", "A ___ works the fastest / the most ___ly of the two (three).", "The past passive: The ___ was / were made / invented (by ___)."],
        rubric: [
          { label: "Comparison grammar", description: "Uses faster than or more carefully than correctly, with 'than'.", weight: 3 },
          { label: "The best one", description: "Says which one works the fastest or the most carefully, with 'the'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time.", weight: 3 },
          { label: "Reason", description: "Gives a reason with because or so.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ works faster than a ___.", "The ___ works the fastest."], tips: ["Hold up each helper as you say it."] },
          { level: "Core", who: "Most children", frames: ["A ___ works more carefully than a ___.", "The ___ works the fastest because ___.", "In my opinion, the ___ is the best helper."], tips: ["Say one fast comparison and one careful comparison."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Before ___ was invented, people ___. Now ___ does it ___er than people.", "I think ___ because ___."], tips: ["Use a before and after sentence and your opinion."] },
        ],
      },
    },
  },
};
