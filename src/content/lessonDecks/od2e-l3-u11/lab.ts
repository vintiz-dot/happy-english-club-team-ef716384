import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 11 "Orchestras and
// Mystery Sounds" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10
// (Sky 1). Every lesson gets one fluency routine and one writing routine; the unit uses five
// different of each. Lessons 2 and 5 end with a recorded talk for home (Lesson 4 already has
// the unit's vlog). Time comes from games and repeats, never from the book pages, the grammar
// or the checks. The grammar said again and again as whole sentences: comparing with -er /
// -est and more / most, and possessive 's and s'. Unit 10's phrases come back as recycle.
// All text is original.

const fixWords =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('A drum is loud ...?'), point to the frame, or hold up a finger for the missing word. For a sound, just say it right and let them echo it. Say your own final sounds clearly: -s, -ed and -est.";

const fixCompare =
  "Listen for 'more louder' and 'the most noisiest' (two comparing signals in one word), 'bigger that' for 'bigger than', 'gooder' for 'better', and 'Of the three, this one is bigger' where the three needs 'the biggest'. Prompt the fix: point to the frame, start 'A drum is loud ... ' and pause, or hold up one finger for the missing 'the'. Do not say the sentence for them. A quick recast is fine for sounds only: say 'louder' with a clear -er and let the child echo it. Say your own -er, -est and 'than' clearly, because many Vietnamese learners drop final sounds.";

const fixPossessive =
  "Listen for a dropped 's ('the conductor baton'), the apostrophe in the wrong place ('the conductors baton', 'the childrens' songs'), and a possessive 's turned into a plural -s. Prompt the fix: start 'The conductor ...' and pause, point to the owner on the board, or hold up a finger for the missing 's. Do not say the sentence for them. Say it clearly yourself: 'the conductor's baton' has an extra s sound that children often do not hear. Sounds can be recast: say the word right and let them echo it.";

const drillFeedback =
  "Prompt, do not tell: for 'more louder' hold up one finger and say 'A drum is loud ...?'; for a missing 'the' before -est, hold up one finger; for 'bigger that' tap your ear and say 'than'. Say your own -er, -est, 's and final sounds clearly. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then in pairs, then real talk (ages 8-10).
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
  note: string;
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
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or the tense, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the child with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say your own idea or story, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback + " Likely slips here: " + o.slips + ".",
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. " + o.note + " Keep it brisk; a drill that drags loses its point. Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U11Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u11-l1": {
      objectives: ["I can say what a musician or a worker is and does, in whole sentences, without stopping."],
      trim: { "Mystery sound box": 3, "Music or noise?": 3, "Word webs: instruments and people (SB 108 B)": 4, "Other instruments we know (SB 108 C)": 3, "Think and answer (SB 106 C)": 4, "Big Question Chart: know and want to know (SB 106 D)": 4, "Making inferences (SB 109 D)": 8, "Words in context: scan first (SB 109 E)": 4 },
      add: [
        {
          after: "Would you like this job?",
          slide: {
            kind: "fluency",
            title: "Job sprint: who is it?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole sentence about each job, fast and smooth, with no stops.",
            chunks: [
              "A conductor is a person who shows the players how to play.",
              "A scientist is a person who studies the world.",
              "An astronaut is a person who travels into space.",
              "A cello is an instrument that you play with a bow.",
              "I would like this job because it is exciting.",
            ],
            recycle: ["We use a lot of energy every day.", "A few of us ride bicycles."],
            rounds: [
              { seconds: 75, say: "Together: the teacher shows a picture, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a picture, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without a stop?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means swap.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them with the class; then go on.",
            ],
            prompts: ["(picture: conductor)", "(picture: scientist)", "(picture: astronaut)", "(picture: cello)", "Would you like this job? Why?"],
            feedback: fixWords + " Here the common slips are 'A conductor is person who ...' (missing a) and 'A scientist study the world' (missing -s after he or she).",
            teacherNote: "Whole sentences only. 'A ___ is a person who ...' is a chunk that carries the unit's job words, the article a / an and the third-person -s. Listen for the missing 'a' and the missing -s on 'shows', 'studies' and 'travels'; model them clearly. Mix in Unit 10's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ is a person who ___.", "A ___ is an instrument."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I would like this job because ... but I wouldn't like ...'", frames: ["I would like this job because ___."] },
            ],
          },
        },
        {
          after: "Job sprint: who is it?",
          slide: drill({
            title: "Grammar drill: compare jobs and sounds",
            goal: "Change the sentence fast and right: ask it, say no, join it with because, change the time or the person. Then talk about the sounds and jobs you like.",
            chunks: [
              "A drum is louder than a flute.",
              "Is a conductor more important than a drummer? Yes, he is.",
              "A flute isn't louder than a drum, so I can hear it less.",
              "The drum is the loudest instrument because it is the biggest.",
              "A scientist is more interesting than a cook, so I like that job more.",
              "Yesterday the music was louder than the traffic.",
            ],
            recycle: ["There are too many cars and not enough buses.", "It must be a drum; it can't be a flute.", "Have you ever heard a live orchestra?"],
            prompts: ["A violin is quieter than a drum. (?)", "A cello is louder than a drum. (X)", "A conductor is a good job. (+ because)", "The music is loud today. (T: yesterday)", "She is the best player. (P: they)"],
            real: "Real talk: tell your partner which job or sound you like best and which one is the loudest or the quietest. Compare it with one more and say why with because. Your partner says if they agree.",
            slips: "'more louder', 'bigger that' for 'bigger than' and a missing 'the' before -est",
            support: ["A ___ is ___er than a ___.", "Is a ___ ___er than a ___? Yes, it is."],
            stretch: "A small step toward Level 4: say HOW MUCH. 'A drum is much louder than a flute, but a bit quieter than a trumpet.'",
            stretchFrames: ["A ___ is much ___er than a ___.", "It is a bit ___er than a ___."],
            note: "This lesson comes before the unit's comparing grammar, so keep to the easy adjectives (loud, quiet, big, small, good) and the frame on the board. Stretch gives a first taste of much and a bit, which Lesson 3 teaches properly.",
          }),
        },
        {
          after: "Other instruments we know (SB 108 C)",
          slide: {
            kind: "writing",
            title: "My job: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: choose one job from this lesson and fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with 'A ___ is a person who ...'.",
              "Check: tick the checklist. Swap with a partner: they underline one verb with -s and tell you one thing they liked.",
              "Teacher: while they write, look only at a / an and the -s on verbs after he, she or it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The conductor",
              text: "A conductor is a person who leads an orchestra. The conductor stands in front of the musicians and holds a thin white baton. The conductor's baton shows the players when to start, when to play loudly and when to play softly. A conductor also listens very carefully to every instrument. I would like this job because it is exciting and I love music.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which job is it? A ___ is a person who ..." },
              { label: "Detail 1: What the person does", prompt: "What does this person do? (a verb with -s)" },
              { label: "Detail 2: Tools or place", prompt: "What does this person use, or where does this person work? (the conductor's baton)" },
              { label: "Closing: my opinion", prompt: "Would you like this job? Why? (I would like this job because ...)" },
            ],
            frames: ["A ___ is a person who ___.","The ___ uses a ___ to ___.","A ___ also ___.","I would / wouldn't like this job because ___."],
            checklist: [
              "My first sentence says the job: A ___ is a person who ...",
              "Verbs after he, she or it have -s: leads, holds, shows",
              "a or an is right: a conductor, an astronaut, an instrument",
              "An owner word has 's: the conductor's baton",
              "My last sentence gives my opinion with because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (a / an and the -s on verbs after he, she or it) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. This replaces the single-sentence expanding task: the best of it, adding a describing word, is now the details box.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["A ___ is a person who ___.","I would like this job because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that compares two jobs with because: 'A conductor's job is different from a drummer's job because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u11-l2": {
      objectives: ["I can tell a mystery story in order, again and again, a little faster each time."],
      trim: { "Instrument families": 3, "Home talk: favorite instruments": 3, "Invent a mystery guest": 7, "Reading circle: the Think boxes (SB 110-111)": 10, "Inference chart: sound, clue, guess, truth": 8, "Two emails (writing from a character's view)": 8 },
      add: [
        {
          after: "Retell it in 60 seconds",
          slide: {
            kind: "fluency",
            title: "Mystery retell: shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same mystery three times, to three partners. Each telling is shorter (75, 60, then 45 seconds), smoother and faster.",
            chunks: [
              "First, they heard a strange sound.",
              "They thought it was ___, but it wasn't.",
              "Next, they looked for a clue.",
              "Then they found out the truth.",
              "At the end, everybody laughed!",
            ],
            recycle: ["There are a few clues.", "We used a lot of energy to look!"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells your group's mystery guest story, then Partner B tells theirs. Use the sound, the guess and the truth. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Next, three for Then, four for At the end.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then start round 2.",
              "When the bell rings, find a new partner.",
              "The listener has a job: count the sequence words (first, next, then, at the end) on their fingers.",
            ],
            prompts: ["(picture: the sound)", "(picture: the guess)", "(picture: the clue)", "(picture: the truth)"],
            feedback: fixWords + " For this retell, watch the past tense: 'They hear' for 'They heard', 'It was' dropped, and missing -ed ('They look for a clue'). Prompt with 'Yesterday they ...?' and let the child finish.",
            teacherNote: "The second and third tellings free the children to speak faster because they are not searching for the story. The one-minute fix after round 1 is what makes the later tellings more accurate too. The listener's counting job keeps the listener active. Past-tense -ed and irregular past (heard, thought, found) are the likely slips.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, they heard ___.", "They thought it was ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'They felt scared because the sound was deafening.'" },
            ],
          },
        },
        {
          after: "Mystery retell: shorter each time",
          slide: drill({
            title: "Grammar drill: compare the mystery sounds",
            goal: "Change the sentence fast and right: ask it, say no, join it with because or so, change the time or the person. Then talk about a strange sound you have heard.",
            chunks: [
              "The second sound was louder than the first sound.",
              "Was the sound quieter than the rain? No, it wasn't.",
              "It was the strangest sound in the hall.",
              "The story was more exciting than the film because the sound was a surprise.",
              "Which clue was easier, the sound or the smell?",
              "The hall was quieter than the street, so we heard every sound.",
            ],
            recycle: ["While we were listening, we heard a strange sound.", "I was reading when I heard a noise.", "The hall was big enough for the whole school."],
            prompts: ["The sound was louder than the wind. (?)", "The second clue was easier. (X)", "The sound was strange. (+ so)", "The door is loud now. (T: yesterday)", "I was scared. (P: they)"],
            real: "Real talk: tell your partner about a strange or loud sound you heard at home or on the street. Was it louder or quieter than another sound? What did you think it was?",
            slips: "'more loud', 'It was loud than' and a present verb for the past ('hear' for 'heard')",
            support: ["The sound was ___er than ___.", "Was it ___er than ___? Yes, it was."],
            stretch: "A small step toward Level 4: say HOW MUCH. 'It was much louder than the fan, but a bit quieter than the thunder.'",
            stretchFrames: ["It was much ___er than ___.", "It was a bit ___er than ___, but ___."],
            note: "The story lesson uses the past: was / were with a comparing word. Keep 'than' on the board. Stretch gives a first taste of much and a bit, which Lesson 3 teaches properly.",
          }),
        },
        {
          after: "Two emails (writing from a character's view)",
          slide: {
            kind: "writing",
            title: "The mystery sound: plan, write, check",
            routine: "paragraph",
            genre: "story",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the beginning, the clues and the ending.",
              "Plan: use your mystery guest from the group talk. Fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Next, Then and At the end.",
              "Check: tick the checklist. Swap with a partner: they underline two past-tense verbs and tell you one thing they liked.",
              "Teacher: while they write, look only at past-tense verbs (heard, thought, found) and the order words. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The sound behind the curtain",
              text: "One Saturday, my friend and I went to the school hall. First, we heard a deep sound behind the curtain. We thought it was thunder, but the sky was blue. Next, we heard a soft song that was quieter than the first sound, so we looked for a clue. Then we found a girl with a big cello! At the end, everybody clapped, and the mystery was over. It was the best surprise of the week.",
            },
            organiser: [
              { label: "Beginning", prompt: "When and where were you? Who was with you?" },
              { label: "Clue 1: First, ...", prompt: "What sound did you hear? What did you think it was?" },
              { label: "Clue 2: Next / Then, ...", prompt: "What happened next? What did you find?" },
              { label: "Ending: At the end, ...", prompt: "What was the truth? How did everybody feel?" },
            ],
            frames: ["One ___, we went to ___.","First, we heard ___. We thought it was ___, but ___.","Next, we ___. Then we found ___.","At the end, ___."],
            checklist: [
              "My first sentence says when and where",
              "Past verbs: went, heard, thought, found, looked",
              "A sound can be compared: quieter than, the best",
              "First, Next, Then and At the end show the order",
              "My ending tells the truth about the sound",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the story again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (past-tense verbs and the order words) with a dot on the line; the child finds and fixes the mistake. This paragraph is the script for this lesson's recorded talk, 'My mystery sound story': children read it once to a partner, then tell it without looking before recording. It replaces the dictogloss; the dictogloss text's good verbs (heard, thought, found) are in the checklist.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["First, we heard ___.","At the end, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences." },
              { level: "Stretch", task: "Add a sentence with so or because: 'We were scared, so we held hands.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My mystery sound story",
        prompt: "Tell a short mystery story about a strange sound. Say what you heard, what you thought it was, and what it really was. Make the sound if you can!",
        length: "60-90 seconds",
        steps: [
          "Think of a sound at home: a door, a pot, a phone, a clock.",
          "Tell your story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Use first, next, then and at the end.",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell a mystery sound story in order and keep going without long stops.",
        words: ["mystery", "deafening", "clue", "sound", "guess", "truth"],
        grammar: ["First, next, then, at the end", "They heard ___. They thought it was ___. It was ___."],
        rubric: [
          { label: "Story in order", description: "Tells what was heard, the guess and the truth with first, next, then or at the end.", weight: 3 },
          { label: "Past tense", description: "Uses the past: heard, thought, found, was. Final -ed and -s sounds can be heard.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit, such as mystery, deafening, clue and guess.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, I heard ___.", "I thought it was ___.", "It was ___!"], tips: ["Make the sound and point to the thing."] },
          { level: "Core", who: "Most children", frames: ["First, I heard a ___ sound.", "Next, I thought it was ___, but it wasn't.", "At the end, I found out it was ___."], tips: ["Say one clue that helped you."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The sound was louder than ___ and softer than ___.", "At last I found out that it was ___, which was the funniest answer of all!"], tips: ["Compare your mystery sound with two other sounds."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u11-l3": {
      objectives: ["I can ask and answer 'Which is louder?' and 'Which is the loudest?' fast, without stopping."],
      trim: { "Loud, louder, loudest": 4, "Compliment your partner! (SB 113 G)": 7, "Our big idea": 6, "Fix the sentence": 3, "Rank it: three things": 8, "Discover the rule: card sort": 9 },
      add: [
        {
          after: "Rank it: three things",
          slide: {
            kind: "fluency",
            title: "Comparing chain: which is louder?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Which is louder, a drum or a flute?",
              "A drum is louder than a flute.",
              "Is a trombone more interesting than a violin?",
              "Yes, it is. / No, it isn't.",
              "Of the three, the drum is the loudest.",
            ],
            recycle: ["There are a few drums in the room.", "We need a lot of players."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds two picture cards." },
              { seconds: 75, say: "Swap cards with your neighbor. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your two instrument cards.",
              "Ask the friend on your left: 'Which is louder, a ___ or a ___?'",
              "They answer with 'than'. Then they turn and ask the next friend a new question.",
              "In round 3, put your two cards next to your neighbor's card. The answer must say which one of the three is the loudest.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Which is ___er, a ___ or a ___?", "Is a ___ more ___ than a ___?", "Which is the ___est of the three?"],
            feedback: fixCompare,
            teacherNote: "A chain makes every child ask AND answer many times in a few minutes, which is what makes 'louder than' and 'the loudest' automatic. Time the whole circle and tell them; children love beating their own time. Listen for the double marker ('more louder'), the missing 'than' and the missing 'the' before -est.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["A ___ is ___er than a ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Use a long adjective and a reason: 'A trombone is more exciting than a flute because it is louder.'" },
            ],
          },
        },
        {
          after: "Comparing things: -er / -est and more / most",
          slide: {
            kind: "grammar",
            title: "Level 4 step: much louder, the loudest I have ever heard",
            hook: "Is it a bit louder or much louder? And what is the loudest sound you have ever heard?",
            form: [
              { label: "A small difference", pattern: "a bit / a little + comparative + than (a bit quieter than)" },
              { label: "A big difference", pattern: "much / far + comparative + than (much louder than, far more exciting than)" },
              { label: "My best so far", pattern: "the + superlative + noun + I have ever + past participle (the loudest drum I have ever heard)" },
              { label: "Asking", pattern: "What is the ___est ___ you have ever ___? (What is the funniest song you have ever heard?)" },
            ],
            explanation: [
              "You already know that louder than compares two things. Now you can say HOW MUCH louder. A bit and a little show a small difference. Much and far show a big difference. They go in front of the comparing word: much louder, a bit quieter, far more exciting.",
              "You also know the loudest of three. Now you can say the loudest in your whole life! After the superlative we add a short clause: I have ever heard, I have ever seen, I have ever played. Ever means in all my life until now, and we use have + the past participle (heard, seen, played), as in Unit 1.",
              "Watch this: much, a bit, a little and far sit in front of -er or more and say how big the difference is. We never use two comparing signals together: much louder, not much more louder. You will meet this grammar again in Oxford Discover Level 4, so it is a good habit to start now.",
            ],
            examples: [
              { text: "The drum is much louder than the flute." },
              { text: "The cello is a bit quieter than the trombone." },
              { text: "This concert was far more exciting than the last one.", note: "far + more + long adjective" },
              { text: "That is the loudest drum I have ever heard." },
              { text: "It was the most beautiful song I have ever listened to." },
              { text: "What is the funniest sound you have ever heard?" },
            ],
            pitfalls: [
              { wrong: "The drum is much more louder than the flute.", right: "The drum is much louder than the flute.", why: "Louder already has the comparing signal -er. Add much, not more." },
              { wrong: "It is the loudest drum I ever hear.", right: "It is the loudest drum I have ever heard.", why: "After ever we need have + the past participle: heard." },
              { wrong: "A drum is very louder than a flute.", right: "A drum is much louder than a flute.", why: "Very does not go with a comparing word. Use much, far, a bit or a little." },
            ],
          },
        },
        {
          after: "Level 4 step: much louder, the loudest I have ever heard",
          slide: drill({
            title: "Grammar drill: much, a bit and the loudest",
            goal: "Change the sentence fast and right. Rounds 1 and 2: comparing with -er, -est, more and most. Round 3: say HOW MUCH and say the best you have ever heard.",
            chunks: [
              "A trombone is louder than a violin.",
              "Is the drum the loudest of the three? Yes, it is.",
              "A drum is much louder than a flute.",
              "The cello is a bit quieter than the trombone.",
              "That is the loudest drum I have ever heard.",
              "It was the most exciting concert I have ever seen.",
            ],
            recycle: ["There are too many drums and not enough chairs.", "It must be a trumpet; it can't be a violin.", "Have you ever played the cello? No, I have never played it."],
            prompts: ["A drum is louder than a flute. (?)", "The cello is bigger than the violin. (X)", "I like the trumpet. (+ because)", "The song is a bit quieter. (T: yesterday)", "A flute is a bit quieter than a drum. (P: they)"],
            real: "Real talk: tell your partner the loudest, funniest or best thing you have ever heard or seen. Use 'the ___est ... I have ever ...' and say how much it was better than something else, with much or a bit.",
            slips: "'much more louder', 'the loudest drum I ever hear' and a missing 'the' before -est",
            support: ["A ___ is much ___er than a ___.", "It is the ___est ___ I have ever ___."],
            stretch: "Use a long adjective and a reason: 'It is far more beautiful than the piano, and it is the most relaxing sound I have ever heard.'",
            stretchFrames: ["It is far more ___ than ___.", "It is the most ___ ___ I have ever ___."],
            note: "Rounds 1 and 2 keep the Lesson 3 grammar fast; round 3 and Stretch carry the Level 4 step (much / a bit / far and I have ever heard). Do not teach the present perfect again here: the children know have + past participle from Unit 1.",
          }),
        },
        {
          after: "Complete the chart (SB 113 F)",
          slide: {
            kind: "writing",
            title: "Join them with than and because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence. Say it first, then write it.",
              "Read your sentence to your partner. Does it sound right?",
            ],
            items: [
              { q: "A drum is loud. A flute is quiet. (than)", answer: "A drum is louder than a flute." },
              { q: "A cello is big. A violin is small. (than)", answer: "A cello is bigger than a violin." },
              { q: "The trombone is exciting. I like it. (because)", answer: "I like the trombone because it is exciting." },
              { q: "The drum is the loudest of the three. I can hear it best. (so)", answer: "The drum is the loudest of the three, so I can hear it best." },
            ],
            checklist: ["-er + than for two things; the + -est for three or more", "A long word takes more or most, not -er or -est", "A capital letter and a full stop"],
            sayIt: "Say your combined sentences to your partner without looking.",
            teacherNote: "Sentence combining has research support as a way to grow children's writing: it teaches how sentences join through use, not rules. Model item 1 aloud, writing 'louder than' on the board and underlining 'than'. The spelling change in 'bigger' (double the g) is worth a quick board example.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frame on the board.", frames: ["A ___ is ___er than a ___."] },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two new sentences of your own: one with than and one with the most." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u11-l4": {
      objectives: ["I can say who owns something and compare things, again and again, in one smooth quiz show."],
      trim: { "Songs we sing (SB 114 Think)": 4, "Possessive match game": 3, "Big Question Review (SB 114-115)": 4, "Compare two things at school": 3, "Listen and match: names and voices (SB 114 A)": 6, "Listen again: voices and meanings (SB 114 B)": 4, "Writing practice (Workbook)": 8, "Comparative questions (SB 114 C)": 8, "From verb to adjective: suffix -ing (SB 115 D)": 6, "Choose the possessive noun (SB 115 E)": 4 },
      add: [
        {
          after: "Plan and rehearse your quiz show",
          slide: {
            kind: "fluency",
            title: "Quiz show again: three times, three partners",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Give the same quiz show to three groups. Each time is shorter (65, 50, then 35 seconds), smoother and more exact.",
            chunks: [
              "The conductor's baton is white.",
              "The musicians' chairs are in a circle.",
              "The children's choir sings every Friday.",
              "Which is deeper, the bassoon's sound or the flute's?",
              "The bassoon's sound is deeper than the flute's.",
            ],
            recycle: ["A drum is louder than a flute.", "Of the three, the drum is the loudest."],
            rounds: [
              { seconds: 65, say: "Round 1: Group A gives its quiz show with three questions to Group B, then Group B gives theirs. Then change groups." },
              { seconds: 50, say: "Round 2: New group. Group A gives the same quiz show, a bit faster and smoother, then Group B. Then change groups." },
              { seconds: 35, say: "Round 3: New group. Group A goes fast and smooth, then Group B. Can you ask all three questions without stopping?" },
            ],
            steps: [
              "Choose three questions from your quiz show. Each one needs an owner or a comparison.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them with the class; then go on with the same quiz show.",
              "When the bell rings, move to a new group.",
              "The listener has a job: tick each possessive 's and each comparing word you hear.",
            ],
            prompts: ["Whose ___ is it?", "Which is ___er?", "Whose ___ are these?"],
            feedback: fixPossessive,
            teacherNote: "Task repetition: the same task, a new audience, less time. Content stays the same so the children can focus on how they say it. Note the many-owners ending: 'musicians'' sounds the same as 'musicians', so it is a writing point, not a speaking one; do not ask for a pause. Listen for 's dropped and for 'the childrens'.",
            tiers: [
              { level: "Support", task: "Say two questions with the frames.", frames: ["The ___'s ___ is ___.", "Which is ___er, ___ or ___?"] },
              { level: "Core", task: "Say three questions without the board." },
              { level: "Stretch", task: "Add a because: 'The bassoon's sound is deeper than the flute's because it is longer.'" },
            ],
          },
        },
        {
          after: "Possessive nouns: 's and s'",
          slide: drill({
            title: "Grammar drill: whose is it, which is louder",
            goal: "Change the sentence fast and right. Rounds 1 and 2: owner words with 's and s'. Round 3: compare, say HOW MUCH, and say the best you have ever seen.",
            chunks: [
              "The conductor's baton is white.",
              "The musicians' chairs are in a circle.",
              "Is this the conductor's baton? No, it isn't. It is the drummer's stick.",
              "The children's choir is much louder than the band.",
              "The cello's sound is a bit deeper than the violin's.",
              "The loudest drum I have ever heard is the school's big drum.",
            ],
            recycle: ["If it rains, we will practice inside.", "Look at the clouds: it is going to rain.", "The room is big enough for the whole choir."],
            prompts: ["The conductor's baton is white. (?)", "The musicians' chairs are red. (X)", "The children's choir sings well. (+ because)", "The drummer's stick is long. (T: yesterday)", "The conductor's baton is thin. (P: the conductors')"],
            real: "Real talk: tell your partner about something that belongs to a person in your family or class and compare it with something of someone else: 'My mother's phone is much newer than my father's.' Then say the best thing you have ever seen at school.",
            slips: "'the conductors baton' for 'the conductor's baton', 'the childrens' songs' and 'much more louder'",
            support: ["The ___'s ___ is ___.", "Is this the ___'s ___? Yes, it is."],
            stretch: "Use two owners and the step: 'The conductor's baton is much longer than the drummer's stick, and it is the thinnest baton I have ever seen.'",
            stretchFrames: ["The ___'s ___ is much ___er than the ___'s.", "It is the ___est ___ I have ever ___."],
            note: "Rounds 1 and 2 keep the possessive 's and s' fast. In speech 's and s' sound the same, so listen for the dropped 's and check the owner by asking 'How many conductors?'. Round 3 and Stretch bring back the Level 4 step: much / a bit and I have ever seen.",
          }),
        },
        {
          after: "Choose the possessive noun (SB 115 E)",
          slide: {
            kind: "writing",
            title: "Our orchestra: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: think of an orchestra, a band or a choir. Fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use an owner word ('s or s') and a comparing word in it.",
              "Check: tick the checklist. Swap with a partner: they underline one owner word and one comparing word and tell you one thing they liked.",
              "Teacher: while they write, look only at the owner words ('s and s') and -er / -est. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Our school orchestra",
              text: "Our school orchestra has twenty children, and it practices every Friday. The conductor's baton is white, and the musicians' chairs are in a big circle. The cello's sound is deeper than the violin's, but the drums are the loudest instruments of all. The children's favorite song is a fast one. I like our orchestra because everybody listens and plays together.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What group is it, how many people are in it, and when does it practice?" },
              { label: "Detail 1: Owner words", prompt: "Whose things do you see? (the conductor's baton, the musicians' chairs)" },
              { label: "Detail 2: Comparing", prompt: "Which sound is louder or softer? Which one is the loudest? (-er than, the -est)" },
              { label: "Closing: my opinion", prompt: "Why do you like this group?" },
            ],
            frames: ["Our ___ has ___, and it ___.","The ___'s ___ is ___.","The ___ is ___er than the ___.","I like our ___ because ___."],
            checklist: [
              "One owner: 's (the conductor's baton). Many owners ending in s: s' (the musicians' chairs)",
              "children takes 's: the children's favorite song",
              "-er than for two things, the -est for three or more",
              "My last sentence says why I like the group with because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (the owner words and -er / -est) with a dot on the line; the child finds and fixes the mistake. In speech 'the conductor's' and 'the conductors' sound the same, so the owner words are a writing point: ask 'How many conductors?'. This replaces the fix-it task: the same errors now appear in the children's own writing, where they matter more.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["The ___'s ___ is ___.","I like our ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that compares three things with the -est or most: 'The trumpet is the loudest instrument we have.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u11-l5": {
      objectives: ["I can talk about my favorite instrument for a minute and compare it, three times, a little faster each time."],
      trim: { "Remember it!": 4, "Which is it? The class survey puzzle": 10, "The Orchestra Line-up": 7, "Grammar detectives: Is / Is Not": 8, "Champion talk: 3 rounds": 9, "Write a comparing paragraph": 10 },
      add: [
        {
          after: "Which is it? The class survey puzzle",
          slide: {
            kind: "fluency",
            title: "Instrument talk 75-60-45: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk to three friends. Each talk is shorter (75, 60, then 45 seconds) and smoother.",
            chunks: [
              "My favorite instrument is the cello.",
              "It is deeper than the violin.",
              "Of all the instruments, it is the most relaxing.",
              "I like it because it sounds warm.",
              "It is better than the drum for a quiet evening.",
            ],
            recycle: ["The conductor's baton is white.", "A trombone is more exciting than a flute."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the talk, then Partner B gives theirs. The listener counts the comparing words on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A goes fast and smooth, then Partner B. The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) talks, then Partner B (line B) talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step left: a new partner. Then Partner A talks first again.",
              "The listener has a job: count comparing words (-er, -est, more, most) and ask a follow-up question: 'Why do you like it?'",
            ],
            feedback: fixCompare,
            teacherNote: "This is the 4/3/2 activity scaled for ages 8-10: same talk, less time, new listener. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix after round 1 is what makes it more accurate too. Listen for the missing 'the' before -est and for 'better' used right.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite instrument is the ___.", "It is ___er than the ___.", "I like it because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Compare three instruments and pick the most ___ one, with a reason." },
            ],
          },
        },
        {
          after: "Grammar: comparing with -er, -est, more and most",
          slide: drill({
            title: "Grammar drill: compare, pick the best, say how much",
            goal: "Change the sentence fast and right. Use the whole Unit 11 grammar and the Level 4 step: -er, -est, more, most, much, a bit and 'the ___est ... I have ever ...'.",
            chunks: [
              "Of the three, the bassoon is the deepest.",
              "The cello is much deeper than the violin.",
              "The trumpet is a bit louder than the trombone.",
              "It was the most exciting concert I have ever been to.",
              "Is that the best song you have ever heard?",
              "The drummer's solo was far louder than the choir's song.",
            ],
            recycle: ["We are playing at the festival on Saturday.", "That is the girl who plays the cello.", "It must be a flute; it can't be a drum."],
            prompts: ["The bassoon is deeper than the flute. (?)", "The cello is the loudest. (X)", "The concert was exciting. (+ because)", "The drum is much louder than the flute. (T: last year)", "I think the drum is the best. (P: she)"],
            real: "Champion round: choose the best sound or instrument you have ever heard. Compare it with two others, using much and a bit, and say why with because. Your partner agrees or disagrees with a reason.",
            slips: "'much more louder', 'the most noisiest', 'I ever heard' and a missing 'the' before -est",
            support: ["A ___ is much ___er than a ___.", "It is the ___est ___ I have ever ___."],
            stretch: "Join it all with a long adjective and although: 'The cello is the most relaxing sound I have ever heard, although it is a bit quieter than the piano.'",
            stretchFrames: ["It is the most ___ ___ I have ever ___, although ___.", "It is far more ___ than ___."],
            note: "The last lesson of the unit covers both: the Unit 11 comparing grammar in rounds 1 and 2, and the Level 4 step (much / a bit / far and 'the ___est ... I have ever ...') in round 3 and Stretch. Listen for 'ever' with a past participle: 'I have ever heard', not 'I ever hear'.",
          }),
        },
        {
          after: "Write a comparing paragraph",
          slide: {
            kind: "writing",
            title: "Model, then write: my favorite sound",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the supporting sentences and the closing sentence.",
              "Plan: write your topic and three reasons in a quick organiser.",
              "Write your paragraph. Check it against the checklist.",
              "Read it to your partner.",
            ],
            text: {
              title: "My favorite sound",
              text: "My favorite sound is rain on the window. It is much softer than a drum and more relaxing than a song. I think it is the most peaceful sound I have ever heard. It helps me sleep, so I like it better than my alarm clock. That is why rain is my favorite sound.",
            },
            frames: ["My favorite sound is ___.", "It is ___er than ___ and more ___ than ___.", "I think it is the most ___ sound because ___.", "It is the most ___ sound I have ever ___.", "That is why ___ is my favorite."],
            checklist: ["Topic sentence, three supporting sentences and a closing sentence", "Comparing words: -er + than, more ... than, the -est, the most", "One sentence with the Level 4 step: much / a bit + -er, or 'the ___est ... I have ever heard'", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your paragraph to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is the strategy children are taught step by step. After the Champion paragraph this is a shorter, more personal version, so the child writes what they already said in the 4-3-2. The model is a different topic so nobody copies it word for word.",
            tiers: [
              { level: "Support", task: "Use the frames to write four sentences." },
              { level: "Core", task: "Write a paragraph with a topic sentence, three supporting sentences and a closing sentence." },
              { level: "Stretch", task: "Write a paragraph that compares three sounds and uses 'than', 'the most' and 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Which sound is the best?",
        prompt: "Choose three sounds or instruments. Compare them and tell us which one is the best and why. Play or make each sound if you can!",
        length: "60-90 seconds",
        steps: [
          "Choose three sounds at home or three instruments you know.",
          "Say your comparison three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Look at the camera and keep going. Say one sentence with 'the ___est ... I have ever heard'.",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Compare three sounds, pick the best one, give a reason and keep talking without long stops.",
        words: ["louder", "softer", "deeper", "more relaxing", "the most exciting", "better", "the best"],
        grammar: ["-er + than / more ... than", "much / a bit + -er than", "the -est / the most ...", "the loudest ... I have ever heard", "better, the best"],
        rubric: [
          { label: "Comparing words", description: "Uses -er / more + than for two things (with much or a bit when it fits) and the -est / the most for three, and one sentence with 'I have ever ...'.", weight: 3 },
          { label: "A reason", description: "Gives at least one reason with because or so.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Final sounds -er, -est and -s can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___er than the ___.", "The ___ is the best.", "I like it because ___."], tips: ["Hold up each sound or picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ is much ___er than the ___.", "The ___ is more ___ than the ___.", "Of the three, the ___ is the ___est because ___."], tips: ["Say one reason for your best sound."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My family's favorite sound is the ___, but mine is the ___, because ___.", "It is the ___est sound I have ever heard, but you may not agree."], tips: ["Add another person's opinion and your own."] },
        ],
      },
    },
  },
};
