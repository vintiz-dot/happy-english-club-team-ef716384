import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 17 "Journeys and
// Explorers" (src/lib/lessonDecks/lab.ts puts it into the decks). Class Sky 1, ages 8-10.
// Every lesson gets one fluency routine (chunk sprint, retell, question chain, 4-3-2, task
// repeat) and one writing routine (expand it, dictogloss, fix it, sentence combining, model
// then write), each ending in a spoken step. Lessons 2 and 5 end with a recorded talk for
// home. Time comes from games and repeats, never from the book pages or the grammar.
// Unit 16's phrases are mixed back in. All text is original.

const correctWords =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute and write them on the board; the class fixes them together. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('It ___ windy.'), point to the frame, or hold up a finger for a missing -s or -ed. For a sound, say it right and let the child echo it. Say every final -s clearly yourself (clouds, waterfalls, he walks): children copy what they hear.";

const correctRoute =
  "During a round, do not stop the talk. Listen for the route words: 'Walk in the park' (should be through), 'Go to across the bridge' (should be across), 'through the island' (should be around), and the word order 'Walk the park through'. Between rounds 1 and 2, stop for one minute and put two of these on the board; the class fixes them. Prompt the child to self-correct: point to the route-word card and pause ('Walk ___ the park.'), or repeat the error with a rising voice ('Walk in the park to the pond?') and wait. Do not say the right word first. For a sound, say it right and let the child echo it. Say final -s and -ed clearly yourself (walks, sailed).";

const correctTime =
  "During a round, do not stop the talk. Listen for the past -ed ending (we crossed, we packed), the subject after before / after ('Before arrive at the coast' should be 'Before we arrived'), and the comma when the sentence starts with Before or After. Between rounds 1 and 2, stop for one minute and put two of these on the board; the class fixes them. Prompt the child to self-correct: start the phrase and pause ('After we cross... ?'), hold up a finger for the missing -ed, or repeat the error with a rising voice and wait. For a sound, say it right and let the child echo it. Say every final -ed and -s clearly yourself.";

const drillFeedback =
  "Prompt, do not tell. For a missing -ed, hold up one finger and say the start of the sentence ('Before we ...?'); for a wrong verb, repeat the error with a rising voice and let the child fix it; for a sound, say it right and let the child echo it. Say every final -ed and -s clearly yourself. In round 3 do not correct every slip: note two and use them in the one-minute fix next lesson.";

// One grammar drill (ages 8-10): a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  minutes: 6 | 7;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  slipAdvice: string;
  support: string[];
  core: string;
  stretch: string;
  stretchFrames: string[];
  note: string;
}): Slide {
  const long = o.minutes === 7 ? 90 : 75;
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: o.minutes,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign card (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or tense, P = change the person). The class says the new sentence together." },
      { seconds: long, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: long, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the child with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said.",
    ],
    prompts: o.prompts,
    feedback: `${drillFeedback} Likely slips for Vietnamese learners here: ${o.slipAdvice}`,
    teacherNote: o.note,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: o.core },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

const stepSlide: Slide = {
  kind: "grammar",
  title: "Level 4 step: had + past participle (the earlier past)",
  hook: "Two things happened in the past. Which one was first? Had + past participle shows it.",
  form: [
    { label: "Earlier past", pattern: "had + past participle   (The ship had left.)" },
    { label: "By the time", pattern: "By the time + past simple, + had + past participle   (By the time the explorers arrived, the ship had left.)" },
    { label: "Before / after", pattern: "The first event: had + past participle   (The sailors had eaten before the storm began. After the storm had passed, we sailed on.)" },
    { label: "Negative and question", pattern: "hadn't + past participle   /   Had + subject + past participle?   (They hadn't seen land. Had they seen land?)" },
  ],
  explanation: [
    "In this unit you say two past events with before and after: 'We packed before we left.' The word before or after already tells us the order. Sometimes the order is not clear, or the first event is the important one. Then we show the first event with had + the past participle (the third form: left, seen, gone, eaten).",
    "We use it for the event that was already finished when the other past event happened. 'By the time we arrived, the shop had closed' means the shop closed first, and then we arrived. The event in the by the time part uses the simple past (arrived), and the earlier one uses had + participle (had closed).",
    "It grows out of before and after: you still use the simple past for the story, and now you add had for the part that came first. You will meet the past perfect again in Oxford Discover 4, so you are getting ready for it now.",
  ],
  examples: [
    { text: "By the time the explorers arrived, the ship had left." },
    { text: "The sailors had eaten before the storm began." },
    { text: "After the captain had checked the map, he turned the ship." },
    { text: "We hadn't seen land for ten days, so everyone was excited." },
    { text: "Had the explorers crossed the mountains before the snow came? Yes, they had." },
    { text: "By the time we reached the coast, the fog had gone.", note: "The fog went first, then we reached the coast." },
  ],
  pitfalls: [
    { wrong: "By the time we arrived, the ship left.", right: "By the time we arrived, the ship had left.", why: "The ship left first. Use had + the past participle for the earlier event." },
    { wrong: "The sailors had went home.", right: "The sailors had gone home.", why: "After had we use the past participle (gone, seen, eaten), not the simple past (went, saw, ate)." },
    { wrong: "They hadn't eat, so they were hungry.", right: "They hadn't eaten, so they were hungry.", why: "hadn't is followed by the past participle, with the -en or -ed ending." },
  ],
};

export const odL3U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u17-l1": {
      objectives: ["I can say sentences about weather and places fast and smoothly, and write a longer sentence about a trip."],
      trim: { "Explorer or not?": 3, "Word and meaning cards (SB 168 A)": 6, "Talk about the big picture (SB 166 B)": 5, "My long trip (SB 169 F)": 6 },
      drop: ["Weather mime and guess"],
      add: [
        {
          after: "More weather words (SB 169 C)",
          slide: {
            kind: "fluency",
            title: "Weather sprint: say the whole sentence",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say the whole sentence, fast and smooth, with no long stops.",
            chunks: [
              "It is windy on the coast.",
              "I can see a big waterfall.",
              "There is fog on the island.",
              "The storm is very loud!",
              "Last summer I went to an island.",
            ],
            recycle: ["I'm curious about plants because they help us.", "We need plants because they give us food."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'It windy' or 'There have fog') and let the class fix them. Then go on.",
            ],
            prompts: ["(card: coast + wind)", "(card: waterfall)", "(card: island + fog)", "(card: storm)", "(card: a summer trip)"],
            feedback: correctWords + " Example for this unit: if a child says 'It windy on the coast', point to the frame and pause: 'It ___ windy.' If they say 'There have fog', hold up one finger and say 'There ...?' and wait.",
            teacherNote: "Whole sentences only: 'It is windy on the coast' as one smooth piece. Vietnamese learners often leave out 'is' ('It windy') and say 'There have' for 'There is'; listen for both. Mix in Unit 16's phrases every few cards so last unit's language stays fast. The first sentence comes back in Lesson 2 as a recycled phrase, so say it again then.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It is ___ on the ___.", "There is ___ on the ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason or a feeling: 'It is windy, so we stay inside.'", frames: ["It is ___, so we ___."] },
            ],
          },
        },
        {
          after: "Weather sprint: say the whole sentence",
          slide: drill({
            title: "Grammar drill: before, after and the past",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it with before, after or because, change the time or the person. Then tell your partner about a real trip.",
            chunks: [
              "We packed our bags before we went to the coast.",
              "After the storm stopped, we walked on the beach.",
              "Did you see a waterfall? No, we didn't, but we saw a river.",
              "It was foggy, so we stayed inside until lunch.",
              "Before it got dark, we sat around the fire.",
              "I felt happy because the sea was calm.",
            ],
            recycle: ["Have you ever been to a festival?", "We have grown tomatoes since May."],
            prompts: ["We saw an island. (?)", "We sailed in the storm. (X)", "We packed a map. (+ before we left)", "We sail to the island. (T: last summer)", "I looked at the sea. (P: they)"],
            real: "Real talk: tell your partner about a trip you took. Say one thing you did BEFORE something and one thing you did AFTER something. Your partner asks: 'Which happened first?'",
            slips: "'We pack before we go' for a past trip, 'Did you saw' or 'We didn't saw'",
            slipAdvice: "the past -ed is dropped ('We pack our bags'), the verb after did / didn't is put in the past ('Did you saw'), and the subject is left out after before or after ('Before arrive'). Hold up a finger for the ending, or point to 'did' and say 'Did you ...?' and wait.",
            support: ["Did you see ___? Yes, we did. / No, we didn't.", "We ___ before we ___."],
            core: "Change every sentence, join it with before or after, and change the person too.",
            stretch: "Say which thing happened first and put both in one sentence: 'The storm started before we arrived at the coast.' Then ask your partner: 'Which was first, the storm or the arrival?'",
            stretchFrames: ["___ before ___.", "Which was first, ___ or ___?"],
            note: "A drill only helps when the last step is real: round 3 has the children talk about a true trip, so before and after carry meaning. The small push toward Level 4 is 'Which happened first?': children learn to name the first event, which is the idea behind the had + past participle step in Lesson 4. Do not teach had here. Keep it brisk and only note speech, not writing.",
          }),
        },
        {
          after: "My long trip (SB 169 F)",
          slide: {
            kind: "writing",
            title: "A place I saw on a trip: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the place, the land, the weather and the feeling.",
              "Plan: fill the boxes with a few words each, not whole sentences. Think: what did you see, and what was the weather?",
              "Write: turn your notes into one paragraph. Start with where the place is. Use is for how it looks now and was for the day you went.",
              "Check: tick the checklist. Swap with a partner: they underline one landform word and tell you one thing they could see.",
              "Teacher: while they write, look only at 'is' and 'was' and the plural -s (hills, waves). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The little island",
              text: "My favorite place is a little island near the coast. It is windy there, and the beaches are long and sandy. Last summer, we sailed to the island with my family. I saw a tall waterfall and a thick forest. It was sunny in the morning, but it was foggy at night. I felt excited because everything was new.",
            },
            organiser: [
              { label: "Place sentence", prompt: "What is the place? Where is it? Say 'My favorite place is ... near ...'" },
              { label: "What it looks like", prompt: "Which land words? Use 'It is ...' or 'The ... are ...'." },
              { label: "The day I went", prompt: "When did you go? What was the weather? Use 'Last ... I ...' and 'It was ...'" },
              { label: "How I felt", prompt: "End with 'I felt ... because ...'" },
            ],
            frames: ["My favorite place is ___ near ___.","It is ___ there, and the ___ are ___.","Last ___, I went to ___. It was ___.","I felt ___ because ___."],
            checklist: [
              "My first sentence says the place and where it is",
              "'is' for now and 'was' for the day I went: 'It was foggy.'",
              "Land and weather words from the unit, and the plural -s: hills, waves",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the earlier expand-a-sentence idea (where, when, what it was like) into a whole paragraph, and it uses the lesson's weather and landform words. Mark only two targets ('is' / 'was' and the plural -s) with a dot on the line; the child finds and fixes the mistake. The model is original and about an imaginary island. The paragraph is a good base for the 'My long trip' talk.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["My favorite place is ___ near ___.","It was ___ and I felt ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with 'but' or 'so': 'It was foggy, so we stayed inside.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u17-l2": {
      objectives: ["I can retell a journey in three parts, faster each time, and write what the weather was like."],
      trim: { "Why does weather matter?": 3, "Weather chart: Date and Weather": 7, "Our own journal entries": 5, "Read your journal aloud": 6 },
      drop: ["Home talk and journals"],
      add: [
        {
          // Anchored on the book's slide: the retell below is added after it later, so it lands in front of this drill.
          after: "Retell the journey",
          slide: drill({
            title: "Grammar drill: before, after and the voyage",
            minutes: 6,
            goal: "Change the sentence about the voyage fast and right: ask it, say no, join it with before, after or so, change the time or the person. Then tell your partner about yesterday.",
            chunks: [
              "The sailors checked the ship before they left the port.",
              "After the storm came, the sky turned dark.",
              "Did the ship arrive in the morning? No, it didn't. It arrived at night.",
              "The sea was calm, so we looked at the stars.",
              "We were tired, but we kept sailing because we wanted to arrive.",
              "Before we ate dinner, we wrote in the journal.",
            ],
            recycle: ["While the bee was flying, it saw a flower.", "The telephone was invented in 1876."],
            prompts: ["The ship left the port. (?)", "The sailors sailed in the dark. (X)", "We wrote in the journal. (+ after we ate)", "The ship sails past the island. (T: yesterday)", "The sailor looked at the map. (P: we)"],
            real: "Real talk: tell your partner two things you did yesterday, one before something and one after something. Your partner asks one question with 'Did you ...?'",
            slips: "'The ship arrive' or 'Did the ship arrived'",
            slipAdvice: "the -ed is dropped on a past verb ('The ship arrive'), -ed is added after did ('Did the ship arrived'), and the final -ed is not pronounced (sailed, looked). Hold up a finger, or say 'Did the ship ...?' and wait; say the -ed sound clearly yourself.",
            support: ["Did the ___ ___? Yes, it did.", "The ___ didn't ___."],
            core: "Change every sentence, join it with before or after, and change the person too.",
            stretch: "Use By the time to show which thing came first: 'By the time we ate dinner, it was dark.' Then say a second sentence about the same day.",
            stretchFrames: ["By the time ___, it was ___.", "___ before ___."],
            note: "Round 3 is real talk about yesterday, so before and after are used for meaning. The push toward Level 4 is By the time + past simple, a pattern the children will use again with had in Lesson 4 (By the time we arrived, the ship had left). Only the simple past here: children who can say 'By the time we ate, it was dark' are ready for the next step. Note speech only; do not mark writing.",
          }),
        },
        {
          after: "Retell the journey",
          slide: {
            kind: "fluency",
            title: "Retell the voyage, shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same journey three times: 75, 60 and 45 seconds each. Each time it is shorter, smoother and faster.",
            chunks: [
              "The journey started on a ship, and it was very long.",
              "In the middle, the weather was bad, but the sailors kept going.",
              "They sailed through a narrow strait and past an island.",
              "At the end, the ship arrived and everyone was tired but proud.",
            ],
            recycle: ["It is windy on the coast.", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the journey, then Partner B. Use the key-word cards: ship, storm, strait, arrive. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Keep going! Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four key-word cards in order: ship, storm, strait, arrive.",
              "Tell the journey with one whole sentence for each card. In each round, Partner A tells it, then Partner B tells it.",
              "When the bell rings, change partners. The listener says 'Wow!' at the end.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'The ship sail' or 'They arrive' for the past) and let the class fix them. Then go on to rounds 2 and 3.",
            ],
            prompts: ["(card: ship)", "(card: storm)", "(card: strait)", "(card: arrive)"],
            feedback: correctWords + " Example for this unit: if a child says 'They sail through the strait' for a past event, say 'They ...?' and hold up a finger for -ed. If a child says 'The weather bad', point to the frame and pause: 'The weather ___ bad.'",
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the child to speak faster because they are not searching for ideas. Change a chunk to match what your class read in the journal; the chunks are a safe outline, not book text. Retelling on its own mostly trains speed; the one-minute fix between rounds 1 and 2 gives the later rounds a chance to be more correct too. Listen for past -ed endings and the 'was' in 'it was very long'.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["The journey started ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'The sailors felt worried because the storm was loud.'", frames: ["The sailors felt ___ because ___."] },
            ],
          },
        },
        {
          after: "Why does weather matter?",
          slide: {
            kind: "writing",
            title: "A day at sea: plan, write, check",
            routine: "paragraph",
            genre: "journal entry",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the three parts of the day and the feeling at the end.",
              "Plan: fill the boxes with a few words each, not whole sentences. Think about a day on a ship: morning, after lunch, night.",
              "Write: turn your notes into one paragraph. Use In the morning, After lunch and By night, and was / were or an -ed verb for the past.",
              "Check: tick the checklist. Swap with a partner: they underline one past verb and tell you the part they liked best.",
              "Teacher: while they write, look only at 'was' / 'were' and the -ed on past verbs. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A day on the Silver Wave",
              text: "Today was a long day at sea. In the morning, the sky was gray and the wind was strong. After lunch, we sailed past a small island, and I saw hundreds of birds. By night, the sea was calm, so we looked at the stars. I felt tired but happy. I hope we arrive soon.",
            },
            organiser: [
              { label: "Opening", prompt: "How was the day? Say 'Today was ...'" },
              { label: "In the morning", prompt: "What was the weather? What did you see?" },
              { label: "After lunch / By night", prompt: "What did you do? Use -ed verbs and a time word." },
              { label: "Closing", prompt: "How did you feel? What do you hope?" },
            ],
            frames: ["Today was a ___ day at sea.","In the morning, the sky was ___.","After lunch, we ___. By night, ___.","I felt ___. I hope ___."],
            checklist: [
              "My first sentence says what kind of day it was",
              "Three parts of the day with In the morning, After lunch and By night",
              "'was' / 'were' and -ed verbs: sailed, looked, stayed",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. It replaces the earlier dictogloss; the idea of rebuilding a day in order now happens in the plan boxes, from the weather chart and the story. The model is original, about an imaginary ship. Mark only two targets ('was' / 'were' and the -ed ending) with a dot on the line. The finished paragraph is the script for the lesson's vlog, 'My day on a long journey'.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["In the morning, it was ___.","After lunch, we ___. By night, ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with before or after: 'Before the storm came, we stayed inside.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My day on a long journey",
        prompt: "Imagine you are on a long journey by ship. Tell what the weather was like in the morning, after lunch and at night, and what you did. Show a drawing of your day if you can!",
        length: "60-120 seconds",
        steps: [
          "Look at the dictogloss text and your journal entry from class.",
          "Say your day three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. If your child stops for a long time, wait, then ask 'What happened next?'",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the morning, the afternoon and the night, say what the weather was like, and keep talking without long stops.",
        words: ["sailed", "storm", "clouds", "coast", "fog", "windy", "island"],
        grammar: ["It was windy / It was foggy", "We sailed / We stayed / We played", "In the morning / After lunch / By night"],
        rubric: [
          { label: "Three parts", description: "Tells the morning, the afternoon and the night, in order.", weight: 2 },
          { label: "Weather words", description: "Uses weather and place words from the unit: storm, clouds, fog, windy, coast, island.", weight: 2 },
          { label: "Past words", description: "Uses was / were and -ed verbs for the journey: it was foggy, we sailed.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the morning, it was ___.", "After lunch, we ___.", "By night, ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the morning, the sky was ___ and the sea was ___.", "After lunch, ___ came, so we ___.", "By night, we could see ___."], tips: ["Say what the weather was like and what you did, every time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I felt ___ because ___.", "Before the storm came, we ___."], tips: ["Add a feeling, a reason, and a before or after sentence."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u17-l3": {
      objectives: ["I can ask for and give directions fast with down, through and around, and write them correctly."],
      trim: { "Teacher says: directions game": 3, "Our big idea": 3, "What was most interesting? (Think)": 6, "Back-to-back map game": 9 },
      drop: ["The lost visitor"],
      add: [
        {
          after: "Prepositions of movement: down, through, around",
          slide: drill({
            title: "Grammar drill: down, through, around",
            minutes: 6,
            goal: "Change the route sentence fast and right: ask it, say no, join it with because or after, change the time or the person. Then give real directions in your school.",
            chunks: [
              "Go down the corridor and through the big door.",
              "Don't walk across the road without looking!",
              "Which way is the library? Go up the stairs and along the hall.",
              "We walked around the pond because the grass was wet.",
              "After we went through the park, we walked around the pond.",
              "Before we arrived at the gate, we ran past the shop.",
            ],
            recycle: ["We are flying to Tokyo on Monday.", "If we move to the city, I will go to a new school."],
            prompts: ["We walk through the park. (?)", "Go across the road. (X)", "Walk around the pond. (+ because it is wet)", "We walk past the shop. (T: yesterday)", "I go down the stairs. (P: they)"],
            real: "Real talk: give your partner real directions in your school or on your street, with two route words and a warning. Your partner says the route back with 'After ... and before ...'.",
            slips: "'Walk in the park' for through, 'Go to across the road', 'We walk' for a past trip",
            slipAdvice: "in is used for through ('Walk in the park'), an extra to comes before across or around ('Go to across'), the word order is wrong ('Walk the park through'), and the past -ed is dropped when the route is told as a story. Point to the route-word card and pause ('Walk ___ the park.'), or repeat the error with a rising voice.",
            support: ["How do I get to the ___? Go ___ the ___.", "Don't ___ the ___."],
            core: "Change every sentence, join it with because or after, and change the person too.",
            stretch: "Tell the route as a story and name the first thing that happened: 'By the time we reached the gate, the bell rang.' Then give your partner the story of a real walk.",
            stretchFrames: ["After we went ___ the ___, we ___.", "By the time we ___, ___."],
            note: "Round 3 is real talk: a true route in the school or the street, so down, through and around carry meaning. The push toward Level 4 is the T sign told as a story, first with After and then with By the time + past simple; Lesson 4 adds had to the first event. Only note speech: 'through' for inside and 'around' for outside are the main traps.",
          }),
        },
        {
          after: "Act it out (SB 172 C)",
          slide: {
            kind: "fluency",
            title: "Direction chain: How do I get to ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no long stops!",
            chunks: [
              "How do I get to the library?",
              "Go down the corridor and through the big door.",
              "Then walk around the pond.",
              "Don't run through the puddle!",
              "Thanks! Is it far?",
            ],
            recycle: ["What are you curious about?", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds a place card (library, pond, gym) and answers for it." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Ask the child on your right: 'How do I get to the ___?'",
              "They answer with a route: 'Go ___ the ___ and ___ the ___.' Then they turn and ask the next child.",
              "Use down, through and around in the route. Do not say 'Walk in the park'.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then go on.",
            ],
            prompts: ["(card: library)", "(card: pond)", "(card: gym)", "(card: cafeteria)", "(card: playground)"],
            feedback: correctRoute,
            teacherNote: "Whole sentences only: the route is one smooth piece, 'Go down the corridor and through the big door.' The chain gives every child many turns, but they do not all speak at once, so a quiet child can listen first and still join in. Mix in Unit 16's phrases every few turns. Listen for 'through' versus 'in' and the missing 'the'.",
            tiers: [
              { level: "Support", task: "Say the route with the route-word card in front of you.", frames: ["Go down the ___.", "Go through the ___."] },
              { level: "Core", task: "Say a two-step route alone, without looking at the card." },
              { level: "Stretch", task: "Give a three-step route and a warning: 'Go down the stairs, through the door and around the pond. Don't run!'", frames: ["First, ___. Then ___. Don't ___!"] },
            ],
          },
        },
        {
          after: "How does Juan get to the deck? (SB 173 E)",
          slide: {
            kind: "writing",
            title: "My way to school: plan, write, check",
            routine: "paragraph",
            genre: "route description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Underline the route words with your finger. Find the order words.",
              "Plan: fill the boxes with a few words each, not whole sentences. Draw your way to school or home on a small map first, then write the stops.",
              "Write: turn your notes into one paragraph. Use First, Then, After that and Finally. Use a route word in every step.",
              "Check: tick the checklist. Swap with a partner: they trace your route on your map with a finger. Is it clear?",
              "Teacher: while they write, look only at the route word (through, around, across, along) and the comma after First. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My way to school",
              text: "I walk to school every morning with my brother. First, we go down our street and past the small shop. Then we walk through the park, but we go around the pond because it is wet. After that, we go across the bridge and along the river. Finally, we arrive at the big blue gate. I like my way to school because it is quiet and beautiful.",
            },
            organiser: [
              { label: "Opening", prompt: "How do you go? With who? 'I walk / ride to ... with ...'" },
              { label: "First, ...", prompt: "Where do you go first? Use down, past or along." },
              { label: "Then / After that, ...", prompt: "Use through, around or across. Add a reason with 'because'." },
              { label: "Finally, ... and closing", prompt: "Where do you arrive? What do you think of the way?" },
            ],
            frames: ["I walk to ___ with ___.","First, we go ___ the ___.","Then we walk ___ the ___ because ___.","Finally, we arrive at ___."],
            checklist: [
              "My first sentence says how I go and with who",
              "Steps are in order: First, Then, After that, Finally",
              "Route words fit: down, through, around, across, along, past",
              "A comma after First and After that, and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: draw first, then write; the boxes take words, not sentences. It replaces the earlier fix-it routine, whose route-word traps now appear in the checklist (through = inside, around = outside). The model is original. Mark only two targets (the route word and the comma after First) with a dot on the line. Lesson 5 returns to routes with 'because' and warnings, so keep this paragraph about an everyday way, in the present.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box.", frames: ["First, we go ___ the ___.","Finally, we arrive at ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a reason and a warning: 'We go around the pond because it is wet. Don't run!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u17-l4": {
      objectives: ["I can tell about a trip with before and after, three times, smoothly, and join two sentences with before or after."],
      trim: {
        "Congratulations and compliments (SB 175 D)": 9,
        "Say it, then swap it (SB 175 E)": 9,
        "Write about a trip (Workbook)": 9,
        "Big Question video and chart (SB 174-175)": 6,
        "Discover: first or second?": 5,
        "Plan and pitch your exploration": 4,
      },
      drop: ["Guess the date"],
      add: [
        {
          after: "Complex sentences with before and after",
          slide: stepSlide,
        },
        {
          after: "Level 4 step: had + past participle (the earlier past)",
          slide: drill({
            title: "Grammar drill: before, after and had",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with before or after, change the person. In round 3, say which thing happened FIRST with had and by the time.",
            chunks: [
              "We packed our bags before we left home.",
              "After we crossed the river, we had lunch.",
              "By the time we reached the coast, the ship had left.",
              "Had the explorers seen land before the storm began? No, they hadn't.",
              "The sailors hadn't eaten, so they were very hungry.",
              "After the captain had checked the map, he turned the ship.",
            ],
            recycle: ["Have you ever been to a festival?", "I like maps. So do I.", "While the bee was flying, it saw a flower."],
            prompts: ["We crossed the river. (?)", "We saw the waterfall. (X)", "We packed. We left. (+ before)", "We reached the coast. The ship left first. (+ by the time)", "I looked at the map. (P: they)"],
            real: "Real talk: tell your partner about a time when you were late: 'By the time I arrived, the film had started.' Use 'By the time I ..., ... had ...'. Your partner asks 'Had you ...?' and you answer 'Yes, I had.' or 'No, I hadn't.'",
            slips: "'By the time we arrived, the ship left', 'had went' or 'hadn't eat'",
            slipAdvice: "had is left out ('the ship left' for the earlier event), the simple past is used after had ('had went', 'had saw') instead of the past participle (gone, seen), and the -en / -ed ending is dropped ('hadn't eat'). Hold up a finger and say 'the ship had ...?' and wait; for an irregular word show the third-form card (gone, seen, eaten).",
            support: ["We ___ before we ___.", "By the time we ___, the ___ had ___."],
            core: "Rounds 1 and 2: change every sentence with before or after and the other signs. Round 3: say two true past events and put had on the one that came first.",
            stretch: "Use two signs at once, with had in the question and the answer: 'Had the shop closed by the time you arrived? Yes, it had, so I bought nothing.'",
            stretchFrames: ["Had ___ ___ by the time ___? Yes, ___ had. / No, ___ hadn't.", "By the time ___, ___ had ___, so ___."],
            note: "Rounds 1 and 2 drill before and after as in the book; round 3 and the Stretch tier bring in the step you taught on the slide above (had + past participle). Keep the participle card (gone, seen, eaten, left, closed) on the board: the main trap is 'had went'. Children at this level need to hear had in your own speech first, so recast every earlier-past slip with 'the ship had left', stress had a little, and let them echo. Keep it brisk and note speech only.",
          }),
        },
        {
          after: "Circle before or after (SB 175 F)",
          slide: {
            kind: "writing",
            title: "Join it with before or after",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the two short sentences. Which happened first?",
              "Join them with before or after into one sentence.",
              "Check the comma: Before / After at the START of the sentence needs a comma. In the MIDDLE it does not.",
              "Read your sentence aloud, then say it again without looking.",
            ],
            items: [
              { q: "We packed our bags. We left home. (use: before)", answer: "We packed our bags before we left home." },
              { q: "We crossed the river. We had lunch. (use: After at the start)", answer: "After we crossed the river, we had lunch." },
              { q: "I looked at the map. I asked for help. (use: before)", answer: "I looked at the map before I asked for help." },
              { q: "The sky got dark. We went inside. (use: Before at the start)", answer: "Before the sky got dark, we went inside." },
            ],
            frames: ["___ before ___.", "After ___, ___."],
            checklist: [
              "The past verb ends in -ed (or is a past word: went, saw)",
              "A comma when Before or After starts the sentence",
              "Capital letter and full stop",
            ],
            sayIt: "Read your joined sentences to your partner, then say them again without looking.",
            teacherNote: "Sentence combining makes children use the target structure to say something they already understand. Do item 1 on the board and ask: 'What if we start with before?' to show both orders. The most common slips are a missing -ed ('We cross the river'), a missing subject after before / after ('Before arrive'), and a missing comma. Keep to those three.",
            tiers: [
              { level: "Support", task: "Join items 1 and 2 with the frames.", frames: ["We ___ before we ___.", "After we ___, we ___."] },
              { level: "Core", task: "Join all four sentences." },
              { level: "Stretch", task: "Write two of your own pairs from your trip and join them." },
            ],
          },
        },
        {
          after: "Write about a trip (Workbook)",
          slide: {
            kind: "fluency",
            title: "4-3-2: my trip with before and after",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about your trip three times: 60, 50 and 40 seconds each. Each time the time is shorter, so you speak smoother and faster.",
            chunks: [
              "Before we left, we packed a map and a big bag.",
              "After we crossed the river, we had lunch.",
              "We saw the waterfall after we walked along the coast.",
              "Before it got dark, we sat around the fire.",
              "After we came home, I wrote in my journal.",
            ],
            recycle: ["We need plants because they give us food.", "I'm curious about ___ because ..."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about the trip, then Partner B. Use before and after. The listener does not speak. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A tells the same trip again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: Partner A tells it a third time, faster and smoother, then Partner B!" },
            ],
            steps: [
              "Plan quickly: draw three small pictures of your trip, in order. Say one before or after sentence for each.",
              "Round 1: Partner A tells the trip, then Partner B. The listener has a job: count how many before / after sentences they hear. Then change partners.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'After we cross the river' or a missing comma) and let the class fix them. Then go on to rounds 2 and 3.",
              "Rounds 2 and 3: Partner A tells it, then Partner B, then change partners. Same trip, less time.",
            ],
            prompts: ["(picture 1: packing)", "(picture 2: the journey)", "(picture 3: the best part)"],
            feedback: correctTime + " Example for this unit: if a child says 'Before we leave, we pack a map' for a past trip, say 'Before we ...?' and hold up a finger for -ed, or repeat 'Before we leave?' with a rising voice.",
            teacherNote: "4-3-2 means the same talk to three partners with less time each round. The repeat makes the words come easily, and the shrinking time makes the child push. The repeat is meant to build fluency; the one-minute correction between rounds 1 and 2 gives the later rounds a chance to be more accurate, so do not skip it. The listener's job (count the before / after sentences, then ask one question) keeps the partner active. Accept short tellings in round 3.",
            tiers: [
              { level: "Support", task: "Point to your three pictures and say one sentence for each.", frames: ["Before we ___, we ___.", "After we ___, we ___."] },
              { level: "Core", task: "Tell about your whole trip with before and after, without looking at the frames." },
              { level: "Stretch", task: "Add a feeling and a reason: 'After we saw the waterfall, I felt happy because it was beautiful.'", frames: ["After ___, I felt ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u17-l5": {
      objectives: ["I can give a route with route words, again and again, without stopping, and write a clear route."],
      trim: { "Write it: a route note for a new explorer": 8, "Remember it!": 4 },
      drop: ["Freeze and travel: movement break"],
      add: [
        {
          after: "Grammar: route words (down, through, around, across, along, past)",
          slide: drill({
            title: "Grammar drill: routes and had",
            minutes: 7,
            goal: "Change the route sentence fast and right with the unit's route words, then with had and by the time. Then tell a real story about an earlier past.",
            chunks: [
              "First, go along the river. Then walk through the forest.",
              "Don't walk across the ice because it is thin!",
              "We sailed around the island because the rocks were dangerous.",
              "By the time we reached the lighthouse, the sun had set.",
              "After we had walked along the beach, we climbed up the hill.",
              "Had the explorers crossed the mountains before the snow came? Yes, they had.",
            ],
            recycle: ["It must be solar power. It can't be wind.", "We have grown tomatoes since May.", "The telephone was invented in 1876."],
            prompts: ["We walk through the forest. (?)", "Sail across the lake. (X)", "Walk around the lake. (+ because it is deep)", "We reached the beach. The sun set first. (+ by the time)", "I walked along the river. (P: they)"],
            real: "Real talk: tell your partner about a trip or a time when you were late. Use route words and 'By the time we ..., ... had ...'. Your partner asks 'Had ...?' and you answer 'Yes, ... had.' or 'No, ... hadn't.'",
            slips: "'Walk in the tunnel' for through, 'By the time we arrived, the sun set', 'had went'",
            slipAdvice: "in is used for through ('Walk in the tunnel'), had is left out for the earlier event ('the sun set'), the simple past is put after had ('had went', 'had saw') instead of the past participle, and the -en / -ed ending is dropped ('hadn't eat'). Point to the route-word card, or hold up a finger and say 'the sun had ...?' and wait.",
            support: ["First, go ___ the ___. Then walk ___ the ___.", "By the time we ___, the ___ had ___."],
            core: "Rounds 1 and 2: change every sentence with the route words and the other signs. Round 3: tell a true story with a route word and one sentence with had.",
            stretch: "Join a route and an earlier past in one story: 'We walked around the lake, but by the time we arrived, the boat had gone.' Then say what you did next.",
            stretchFrames: ["We walked ___ the ___ because ___.", "By the time ___, ___ had ___, so ___."],
            note: "The last drill of the unit covers both grammars: rounds 1 and 2 use the route words from the Grammar Champions slide, round 3 and the Stretch tier use the Level 4 step (had + past participle) again. Keep the participle card (gone, seen, eaten, left, set) on the board. Note speech only and keep it brisk; the one-minute fix is for the route words and the 'had went' trap.",
          }),
        },
        {
          after: "Two maps, one route: ask and answer",
          slide: {
            kind: "fluency",
            title: "Route repeat: plan, tell, tell again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same route two times, 75 and 60 seconds each, with a new partner each time. The second time it is smoother.",
            chunks: [
              "First, go down the hill. Then walk through the forest.",
              "Walk around the lake because it is deep.",
              "We sailed past the lighthouse.",
              "Don't walk across the ice!",
              "Finally, go along the river and you will arrive.",
            ],
            recycle: ["Before we left, we packed a map.", "After we crossed the river, we had lunch."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the route, then Partner B. Use at least three route words. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same route again, smoother, then Partner B. Can you do it without stopping?" },
            ],
            steps: [
              "Planning minute: look at your map card and choose a route with three or four steps. Say it quietly to yourself.",
              "Round 1: Partner A tells the route, then Partner B. The listener draws the route in the air with a finger.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Walk in the lake' or 'We sail past') and let the class fix them. Then go on to round 2.",
              "Round 2: change partners. Partner A tells the same route, then Partner B. Same route, same meaning, smoother words.",
            ],
            prompts: ["(map card: hill, forest, lake)", "(map card: river, lighthouse, beach)", "(map card: ice, bridge, tunnel)"],
            feedback: correctRoute + " Example for this unit: if a child says 'We sail past the lighthouse' for a past trip, say 'We ...?' with a finger for -ed. If a child says 'Walk the lake around', point to the route-word card and ask 'Where does around go?'",
            teacherNote: "Task repetition helps because the child has already worked out WHAT to say, so the repeat leaves more attention for HOW to say it: smoother, more accurate, faster. Keep the map card the same across the two rounds; change only the partner. Use the planning minute to let Support children finish their route. Space this with Lesson 3's Direction chain: the language is the same, but the task is new.",
            tiers: [
              { level: "Support", task: "Say a two-step route with the frames.", frames: ["First, go ___ the ___.", "Then walk ___ the ___."] },
              { level: "Core", task: "Say a three-step route without looking at the frames." },
              { level: "Stretch", task: "Add a reason and a warning: 'Walk around the lake because it is deep. Don't walk across the ice!'", frames: ["Walk ___ the ___ because ___.", "Don't ___!"] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Model route note, then your own",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model route note. Underline the route words with your finger.",
              "What does the note do? Say: it gives steps in order, and it warns about danger.",
              "Plan: choose a start and an end on your map, and three steps in between.",
              "Write your own short route note with the frames. Then check it against the list.",
              "Read it aloud, then say it again without looking.",
            ],
            text: {
              title: "How to get to the lighthouse",
              text: "How to get to the lighthouse. First, go down the hill and through the small forest. Then walk around the lake because the water is deep. Finally, go along the beach and past the cafe. Don't walk across the rocks because they are wet. You will see the lighthouse on your left.",
            },
            frames: ["First, go ___ the ___ and ___ the ___.", "Then walk ___ the ___ because ___.", "Don't ___ because ___."],
            checklist: [
              "Steps are in order: First, Then, Finally",
              "Route words fit: down, through, around, across, along, past",
              "A first sentence that says where the route goes, a comma after First, and a last sentence that says what you will see",
              "A full stop at the end of each sentence",
            ],
            sayIt: "Read your route note to your partner, then say it again without looking, as if you were giving real directions.",
            teacherNote: "A short model helps children see the shape of a text before they write their own, and it feeds the grammar from the lesson into the writing task that follows. Point out the order words and the 'because' reason, then let the children use the same shape. Check that each route word makes sense on the child's own map: 'through' for inside, 'around' for outside. Two or three error types only.",
            tiers: [
              { level: "Support", task: "Write three sentences with the frames, then read them aloud.", frames: ["First, go ___ the ___.", "Then walk ___ the ___.", "Finally, go ___ the ___."] },
              { level: "Core", task: "Write a route note of four or five sentences." },
              { level: "Stretch", task: "Write a route note with a reason and a warning, and a final sentence that says what you will see." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Show me the way",
        prompt: "Draw a small map of your home, school or a place you like. Then tell a friend how to get from one place to another, step by step, with route words. Show your map to the camera!",
        length: "60-120 seconds",
        steps: [
          "Look at your map and the route note from class.",
          "Say your route three times to a grown-up or a toy. Each time a little smoother and faster.",
          "Record it once. Point to your map as you speak.",
          "Add one sentence about an earlier past with had: 'By the time we arrived, the shop had closed.'",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. If your child stops for a long time, wait, then ask 'What comes next?'",
        ],
        maxSeconds: 180,
        kidSummary: "Give a route with at least three route words, say first, then and finally, and keep talking without long stops.",
        words: ["down", "through", "around", "across", "along", "past", "first", "then", "finally"],
        grammar: ["Go / Walk + route word + the place", "First, ... Then ... Finally, ...", "Don't + go / walk + route word + the place", "By the time + past simple, + had + past participle"],
        rubric: [
          { label: "Clear route", description: "Gives the route in order with First, Then and Finally, so a friend could follow it.", weight: 3 },
          { label: "Route words", description: "Uses at least three route words correctly: down, through, around, across, along, past.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final -s and -ed sounds can be heard (walks, sailed).", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, go ___ the ___.", "Then walk ___ the ___.", "Finally, ___."], tips: ["Point to the map as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, go ___ the ___ and ___ the ___.", "Then walk ___ the ___ because ___.", "Finally, you arrive at the ___."], tips: ["Use at least three different route words."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Don't go ___ the ___ because ___.", "The route is easy / hard because ___, so you should ___.", "By the time ___, ___ had ___."], tips: ["Add a warning, a reason, your advice and a sentence with had."] },
        ],
      },
    },
  },
};
