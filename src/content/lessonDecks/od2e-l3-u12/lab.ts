import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 12 "Instruments
// Around the World" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are
// 8-10. Every lesson gets one fluency routine (the unit's talk about instruments and
// "as ... as" said again and again as whole sentences, a little faster each round, with
// Unit 11's phrases mixed back in) and one short writing routine (plan, write, check, then
// say it aloud). Every other lesson ends with a recorded talk for home. Time comes from
// games and repeats, never from the book pages or the grammar. All text is original.

const fixBase =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, stop for one minute: write two of them on the board and let the class fix them, then go on, so the children use the fixed form in the next telling. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice. For a sound, a quick recast is fine: say it right and let the child echo. Say every final -s, -d and -t clearly yourself: children copy what they hear.";

const asAs =
  " For this unit's grammar: if a child says 'as louder as', hold up a finger at the adjective and pause ('as loud ...?'); for 'as big than', point to the frame and say 'as big ... ?' and wait for 'as'. For 'The panpipes is', say 'The panpipes ...?' and let the child finish with 'are'.";

// Level 4 raise (24 Nov 2026): SKY 1 finishes Oxford Discover 3 ready for Oxford Discover 4
// grammar (B1). Every lesson has a grammar drill, and the unit carries one "Level 4 step":
// so + adjective + that, such a + adjective + noun + that, and too + adjective + to. It sits
// after the unit's main grammar slide in Lesson 3; the drills of Lessons 3 to 6, the talks of
// Lesson 4 and 6 and the paragraph of Lesson 6 use it again. Lessons 1 and 2 come before the
// step, so their drills stay with as ... as and give a taste of ever / never (Unit 1).

const STEP = "Level 4 step: so ... that, such a ... that, too ... to";

const drillFeedback =
  "Prompt, do not tell: for 'It is so loud for hear' hold up one finger and say 'so loud ... ?'; for 'such loud drum' repeat it with a rising voice and let the child fix it; for a missing -s or 'is' tap your wrist. Say the final -s, -d and -t clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
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
  step?: boolean;
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
      {
        seconds: 60,
        say:
          "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or tense, P = change the person" +
          (o.step ? ", S = make it bigger with so ... that, such a ... that or too ... to" : "") +
          "). The class says the new sentence together.",
      },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change it and say the WHOLE new sentence.",
      "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often " + o.slips + "), fix them with the class, then go on.",
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about you, and remember one thing your partner said.",
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

const levelFourStep: Slide = {
  kind: "grammar",
  title: STEP,
  hook: "Three small patterns make a sound HUGE: so loud that, such a loud drum that, too loud to ignore.",
  form: [
    { label: "so ... that", pattern: "so + adjective + that + what happened  (The drum was so loud that I covered my ears.)" },
    { label: "such a ... that", pattern: "such a / an + adjective + noun + that + what happened  (It was such a loud drum that I covered my ears.)" },
    { label: "plural with such", pattern: "such + adjective + plural noun + that ...  (They were such loud drums that we covered our ears.)" },
    { label: "too ... to", pattern: "too + adjective + to + verb  (The tuba is too heavy to carry upstairs.)" },
  ],
  explanation: [
    "These patterns tell us HOW MUCH: how loud, how heavy, how big. With so ... that and such a ... that, the first part says how strong the thing is, and the part after 'that' says the result. With too ... to, the thing is MORE than we can manage, so we can't do something.",
    "We use so with an adjective on its own (so loud) and such a with an adjective AND a noun (such a loud drum). You know 'The drum is as loud as a trumpet', which compares two things; 'The drum is so loud that we cover our ears' tells what the loudness does. It is a step from comparing toward telling what happens because of it.",
    "You will meet these patterns again in Oxford Discover 4, with longer sentences and more kinds of result. Start now: say one sentence about a sound or an instrument every lesson.",
  ],
  examples: [
    { text: "The drum was so loud that I covered my ears.", note: "so + adjective + that + result" },
    { text: "It was such a loud drum that I covered my ears.", note: "such a + adjective + noun + that" },
    { text: "The flute is so light that a small child can carry it.", note: "a good result, not only a bad one" },
    { text: "They were such beautiful panpipes that the whole class stopped to listen.", note: "such + adjective + plural noun" },
    { text: "The tuba is too heavy to carry upstairs.", note: "too + adjective + to + verb: we can't do it" },
    { text: "The room was too noisy to talk in, so we went outside.", note: "too ... to, then a result with so" },
  ],
  pitfalls: [
    { wrong: "It was so a loud drum that I covered my ears.", right: "It was such a loud drum that I covered my ears.", why: "so goes before an adjective on its own; before a / an + noun we need such" },
    { wrong: "The drum was too loud that I covered my ears.", right: "The drum was so loud that I covered my ears.", why: "too is followed by to + verb; the result with 'that' needs so (Vietnamese 'quá ... đến nỗi' is so ... that)" },
    { wrong: "The tuba is too heavy for carry.", right: "The tuba is too heavy to carry.", why: "after too + adjective we say to + the plain verb, not for" },
  ],
};

export const odL3U12Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u12-l1": {
      objectives: ["I can say why two instruments might sound the same, smoothly and without long stops."],
      trim: { "Sound detectives": 3, "Stand on the line": 4, "Find someone who ...": 5, "Mime and guess": 3 },
      add: [
        {
          after: "Which two might sound the same? (SB 116 C)",
          slide: {
            kind: "fluency",
            title: "Instrument sprint: might sound the same",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "The flute and the clarinet might sound the same because both are woodwinds.",
              "The djembe and the snare drum are both made of wood and skin.",
              "You play both of them by hitting.",
              "The erhu and the violin both have strings and a bow.",
              "Have you ever played a drum? Yes, I have. / No, I haven't, but I'd like to.",
            ],
            recycle: ["The trombone is louder than the violin.", "Which is louder, a drum or a flute?"],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows two instrument cards, the class says the whole sentence." },
              { seconds: 75, say: "Pairs: one shows two cards, the other says the sentence. Swap on the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the two cards. Say a WHOLE sentence about them: 'The ___ and the ___ might sound the same because both ...'",
              "Listen for the clap: it means swap or change partner.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them with the class, then go on.",
            ],
            prompts: ["(cards: flute, clarinet)", "(cards: djembe, snare drum)", "(cards: erhu, violin)", "(cards: tuba, didgeridoo)", "(cards: panpipes, zummara)"],
            feedback:
              fixBase +
              " For this lesson: if a child says 'You play both by hit', hold up a finger for the ending and wait for 'hitting'; if they say 'Both is woodwinds', point to 'both are' on the frame.",
            teacherNote:
              "Whole sentences only, never single words: 'might sound the same because both ...' must come out as one smooth piece. Say the end of 'woodwinds' and 'strings' clearly so the final -s is heard. Mix in two of Unit 11's comparing phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame and say it with a friend.", frames: ["The ___ and the ___ both ___.", "They are both made of ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the frame." },
              { level: "Stretch", task: "Add a second reason: 'They both have strings, and you play both of them with a bow.'", frames: ["They might sound the same because both ___ and both ___."] },
            ],
          },
        },
        {
          after: "Instrument sprint: might sound the same",
          slide: drill({
            title: "Grammar drill: as ... as, might sound the same",
            goal: "Change the sentence fast and right: ask it, say no, join it with so, change the time. Then compare two real sounds or things from your own life.",
            chunks: [
              "The flute is as light as a feather.",
              "Is the flute as heavy as the tuba? No, it isn't.",
              "The erhu isn't as big as the cello, but it sounds just as sweet.",
              "The djembe is as loud as the snare drum, so they might sound the same.",
              "Yesterday the drum was as loud as thunder.",
              "Have you ever heard an instrument as loud as a drum?",
            ],
            recycle: ["Have you ever played a drum? I have never played the tuba.", "I enjoy playing the recorder, and I want to learn the violin."],
            prompts: [
              "The flute is as light as a feather. (?)",
              "The drum is as loud as the trumpet. (X)",
              "The violin and the erhu both have strings. (+ so they might sound the same)",
              "The tuba is as heavy as a bike. (T: yesterday)",
              "My drum is as heavy as your drum. (P: their)",
            ],
            real: "Real talk: compare two sounds or things from your own life (a motorbike and a thunderstorm, your voice and your teacher's voice). Use as ... as or not as ... as and say why you think so. Your partner asks one question.",
            slips: "'as louder as', 'as big than' or 'The panpipes is'",
            fb: "For this lesson: if a child says 'as louder as', hold up a finger at the adjective and pause ('as loud ...?'); for 'as big than', point to the frame and say 'as big ... ?' and wait for 'as'; for 'The panpipes is', say 'The panpipes ...?' and let the child finish with 'are'; for 'It isn't as loud the drum', hold up a finger for the second 'as'.",
            note: "Today as ... as is only a taste: the rule comes in Lesson 3, so children copy the chunks as whole sentences, and Unit 11's comparing phrases are the base. The chunk 'Have you ever heard an instrument as loud as a drum?' is a sneak peek at a Level 4 pattern (ever and never, from Unit 1 of Oxford Discover 4 grammar): children copy it in round 3 or Stretch, nothing more. Round 3 must be real. Keep it brisk; a drill that drags loses its point.",
            support: ["The ___ is as ___ as the ___.", "The ___ isn't as ___ as the ___."],
            stretch: "Use two signs at once and add a question with ever: 'The tuba isn't as light as the flute. Have you ever carried a tuba?'",
            stretchFrames: ["___ isn't as ___ as ___. Have you ever ___?", "Yes, I have. / No, I have never ___."],
          }),
        },
        {
          after: "Compare and contrast (SB 117 D)",
          slide: {
            kind: "writing",
            title: "My favorite instrument: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details about how it is made and played, and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use 'made of', 'You play it with' and 'That is why'.",
              "Check: tick the checklist. Swap with a partner: they underline one detail and tell you one thing they liked.",
              "Teacher: while they write, look only at two targets (the -s on 'has' and 'sounds', and 'is made of'). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The erhu",
              text: "The erhu is a beautiful instrument from China. It is made of wood and snake skin, and it has only two strings. You play it with a bow, so it sounds like a person singing. The erhu is not as big as a cello, but it is as sweet as a violin. Its sound is soft and a little sad. That is why I think the erhu is a wonderful instrument.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which instrument? Where is it from? Say one word about it: 'beautiful', 'loud'." },
              { label: "What it is made of", prompt: "Wood, metal, skin? How many strings or parts does it have?" },
              { label: "How you play it and how it sounds", prompt: "Blow, hit, pluck or bow? Use 'so' or 'because' to join the ideas." },
              { label: "Closing: That is why ...", prompt: "End with 'That is why I like ...'" },
            ],
            frames: ["The ___ is a ___ instrument from ___.", "It is made of ___, and it has ___.", "You play it with ___, so it sounds ___.", "That is why I think ___."],
            checklist: [
              "My first sentence names the instrument and says where it is from",
              "'is made of' and 'has' are correct: it has, it sounds",
              "At least one joining word: and, so or because",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the expand-a-sentence idea (where from, made of, how it sounds) into a whole description. Mark only two targets (the -s on 'has' and 'sounds', and 'is made of', which Vietnamese learners often drop) with a dot on the line; the child finds and fixes the mistake. Today's paragraph is a base for Lesson 4's instrument description talk. The Student Book writing project in Lesson 5 is a separate, longer piece.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["The ___ is a ___ instrument from ___.", "That is why I think ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that compares your instrument with another one, with a reason." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u12-l2": {
      objectives: ["I can tell my group about an instrument three times, faster and clearer each time."],
      trim: { "Home talk: two sentences each": 3, "Class comparison chart": 6, "Mystery instrument riddles": 5 },
      add: [
        {
          after: "Expert groups",
          slide: {
            kind: "fluency",
            title: "Expert retell: three partners",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell about the same instrument three times. Each time it is shorter, smoother and faster.",
            chunks: [
              "Let me tell you about the erhu.",
              "It comes from China and it is made of wood and snake skin.",
              "You play it with a bow, and it can sound like a person singing.",
              "The most interesting thing is that it has only two strings.",
              "Did you know that the didgeridoo makes a deep hum?",
            ],
            recycle: ["The trombone is louder than the violin.", "Which is longer, a flute or a clarinet?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells it, then Partner B. Use your expert card. Look at the card if you need to. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Put the card face down. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! The listener ticks every fact they hear." },
            ],
            steps: [
              "Use your expert card. Say who, where it comes from, what it is made of, how you play it and what it sounds like.",
              "The listener has a job: tick each fact on a finger, then ask one follow-up question.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and fix them with the class, then go on.",
              "When the bell rings, find a new partner and tell the same talk again.",
            ],
            prompts: ["(card: instrument name)", "country", "material", "how you play it", "sound"],
            feedback:
              fixBase +
              " For this lesson: if a child says 'It make of wood', point to the frame and hold up a finger for 'is made'; if they say 'It come from China', hold a finger at the verb and wait for 'comes'.",
            teacherNote:
              "This is the 4/3/2 idea for a retell: same content, new listener, less time. The first telling is slow because the child is finding words; after the one-minute fix, the second and third tellings are where accuracy and speed rise together. The final -s in 'comes', 'plays' and 'strings' is the sound to listen for: Vietnamese speakers often drop it.",
            tiers: [
              { level: "Support", task: "Say three facts from your card with the frames.", frames: ["It comes from ___.", "It is made of ___.", "You play it with ___."] },
              { level: "Core", task: "Say four or five facts, with the card face down in round 3." },
              { level: "Stretch", task: "Add a comparison: 'It isn't as big as a cello, but it's as beautiful.'", frames: ["It isn't as ___ as ___, but ..."] },
            ],
          },
        },
        {
          after: "Expert retell: three partners",
          slide: drill({
            title: "Grammar drill: as ... as, ask it and say no",
            goal: "Change the sentence fast and right: ask it, say no, join it with so, change the time. Then compare two instruments from the reading or from your life.",
            chunks: [
              "The erhu isn't as big as the cello.",
              "Is the erhu as long as the violin? No, it isn't.",
              "The djembe is as loud as the snare drum, so it can be heard at the back.",
              "The panpipes are as light as a feather, so you can carry them anywhere.",
              "Last week I heard a band, and the drums were as loud as thunder.",
              "I have never seen an instrument as strange as the didgeridoo.",
            ],
            recycle: ["If we practice every day, we will play well.", "The man who plays the erhu is my uncle."],
            prompts: [
              "The erhu is as sweet as a violin. (?)",
              "The cello is as small as the erhu. (X)",
              "The flute is light. (+ so it is easy to carry)",
              "The djembe is as loud as a snare drum. (T: last week)",
              "The panpipes are as light as a feather. (P: my recorder)",
            ],
            real: "Real talk: choose two instruments from the reading or from your life and compare them with as ... as or not as ... as. Say what is the same, what is different and which one you like more. Your partner asks one question.",
            slips: "'The erhu isn't as big the cello' or 'It come from China'",
            fb: "For this lesson: if a child says 'The erhu isn't as big the cello', hold up a finger for the second 'as'; if they say 'as bigger as', pause at the adjective ('as big ...?'); if they drop the -s ('It come from China'), hold a finger at the verb and wait for 'comes'.",
            note: "The drill uses the facts from today's reading, so children say as ... as about instruments they have just met. The rule is taught in Lesson 3, so today they copy the chunks as whole sentences. 'I have never seen an instrument as strange as ...' is a taste of a Level 4 pattern (never, from Unit 1 of Oxford Discover 4 grammar): copy it in round 3 or Stretch. Keep it brisk.",
            support: ["The ___ is as ___ as the ___.", "The ___ isn't as ___ as the ___."],
            stretch: "Use two signs at once and finish with a Level 4 sentence: 'I have never heard an instrument as sweet as the erhu, so I want to learn it.'",
            stretchFrames: ["I have never ___ as ___ as ___.", "___, so I want to ___."],
          }),
        },
        {
          after: "Class comparison chart",
          slide: {
            kind: "writing",
            title: "Rebuild the text: dictogloss",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Listen: the teacher reads the short text once at normal speed. Just listen.",
              "Listen again and write key words only: nouns, verbs and numbers.",
              "In your group, rebuild the text from your notes. It does not need the same words, but it must be correct and make sense.",
              "Check against the text, and fix your capital letters, full stops and -s endings.",
            ],
            text: {
              title: "Two instruments",
              text: "The djembe is a drum from West Africa. People play it with their hands. Its sound is deep and warm. The erhu comes from China. It has two strings and a bow. It is not as big as a cello, but it can sound like a person singing.",
            },
            frames: ["The ___ is a ___ from ___.", "It has ___ and ___.", "It is not as ___ as ___, but ..."],
            checklist: ["Every sentence has a capital letter and a full stop", "'comes', 'has': the -s with he / she / it is there", "its (belonging) and it's (it is) are in the right places"],
            sayIt: "Read your group's text aloud, then say it again to your partner without looking.",
            teacherNote:
              "Dictogloss works best after a short reminder of the grammar: remind the class that with it, the verb ends in -s (comes, has). Read at natural speed, twice, with the folded text kept hidden. Praise correct versions that use different words.",
            tiers: [
              { level: "Support", task: "Write the key words from the board, then build two sentences with the frames." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it, then add one sentence about a third instrument." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite instrument",
        prompt: "Tell us about an instrument you like: where it comes from, what it is made of, how you play it and how it sounds. Show a picture or the real thing.",
        length: "60-90 seconds",
        steps: [
          "Look at your expert card from class.",
          "Practise the whole talk three times to a grown-up or a toy: each time a little faster and clearer.",
          "Record it once. Look at the camera and speak without reading.",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell us three or more facts about one instrument, keep talking without long stops, and say the endings of words clearly.",
        words: ["instrument", "strings", "bow", "drum", "woodwind", "made of", "sounds"],
        grammar: ["It comes from ___. It is made of ___.", "You play it with / by ___ing.", "It is not as ___ as ___."],
        rubric: [
          { label: "Facts", description: "Says three or more facts about the instrument: where from, what it is made of, how you play it, how it sounds.", weight: 3 },
          { label: "Instrument words", description: "Uses words from the unit: strings, bow, woodwind, drum, vibrates.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s in comes, has and strings can be heard.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It comes from ___.", "It is made of ___.", "You play it with ___."], tips: ["Look at your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ comes from ___ and is made of ___.", "You play it by ___ing. It sounds ___."], tips: ["Say how it sounds and why you like it."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It isn't as ___ as a ___, but it's as ___ as a ___.", "Did you know that ...?"], tips: ["Compare it with another instrument and add a surprising fact."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u12-l3": {
      objectives: ["I can use 'as ... as' and 'not as ... as' in fast, correct sentences."],
      trim: { "Object face-off": 3, "Song time (SB 121 D)": 4, "As ... as battle": 9, "Prove it!": 3, "Our big idea": 3 },
      add: [
        {
          after: "As ... as battle",
          slide: {
            kind: "fluency",
            title: "Say it again: as ... as pitch",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Give the same comparing talk two times to two partners, with fewer stops the second time.",
            chunks: [
              "The tuba is not as small as the flute.",
              "The panpipes are as light as a feather.",
              "The erhu isn't as big as the cello.",
              "Is the violin as long as the didgeridoo? No, it isn't.",
              "A drum is as loud as a trumpet.",
            ],
            recycle: ["Of the three drums, the big one is the loudest.", "This song is more interesting than that one."],
            rounds: [
              { seconds: 60, say: "Round 1: plan for one minute. Then Partner A tells three sentences comparing two instruments, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells the same comparison again, then Partner B. Fix your mistakes. Smoother and faster!" },
            ],
            steps: [
              "Choose two instruments. Plan three sentences with 'as ... as' or 'not as ... as'.",
              "Round 1: Partner A tells it, then Partner B. The listener's job: count how many 'as ... as' sentences you hear.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes on the board with the class (no names), then go on.",
              "Change partner on the bell. Round 2: Partner A tells the same talk again, then Partner B.",
            ],
            feedback: fixBase + asAs,
            teacherNote:
              "Task repetition (the same task with a new partner, after planning) frees the child's attention: the second time they can attend to accuracy and speed because the ideas are already there. Do not give new language between rounds; the one-minute fix is only for mistakes you heard. Listen for the mistakes on the grammar slide: 'as louder as', 'as ... than', a missing second 'as', and 'The panpipes is'.",
            tiers: [
              { level: "Support", task: "Say two sentences using the frames on the board.", frames: ["A ___ is as ___ as a ___.", "A ___ is not as ___ as a ___."] },
              { level: "Core", task: "Say three sentences with both 'as ... as' and 'not as ... as'." },
              { level: "Stretch", task: "Say four sentences and give a reason: 'The flute isn't as heavy as the tuba, so it is easier to carry.'", frames: ["..., so ...", "..., because ..."] },
            ],
          },
        },
        {
          after: "Comparing with as ... as",
          slide: levelFourStep,
        },
        {
          after: "Level 4 step: so ... that, such a ... that, too ... to",
          slide: drill({
            title: "Grammar drill: as ... as, then so ... that",
            goal: "Rounds 1 and 2: change the as ... as sentence fast and right. Round 3: say how loud, big or heavy a real thing is with so ... that, such a ... that or too ... to.",
            chunks: [
              "The djembe is as loud as the snare drum.",
              "The flute isn't as heavy as the tuba, so it's easier to carry.",
              "Is the violin as long as the didgeridoo? No, it isn't.",
              "The drum was so loud that I covered my ears.",
              "It was such a loud drum that I couldn't hear my friend.",
              "The tuba is too heavy to carry upstairs.",
            ],
            recycle: ["While I was practicing, one string broke.", "A drum is an instrument that you hit.", "It must be a drum, because it can't be a flute."],
            prompts: [
              "The drum is as loud as the trumpet. (?)",
              "The flute is as heavy as the tuba. (X)",
              "The tuba is heavy. (+ so that: so heavy that I could not lift it)",
              "The drum is as loud as a trumpet. (T: yesterday)",
              "The panpipes are as light as a feather. (P: my recorder)",
              "The music was loud. (S: so loud that ...)",
            ],
            real: "Round 3 is the Level 4 step: tell your partner about the loudest, biggest, heaviest or quietest thing you know. Use so ... that, such a ... that or too ... to once or twice. Your partner asks one question.",
            slips: "'so a loud drum', 'too loud that' or 'as louder as'",
            fb: "For this lesson: if a child says 'as louder as', pause at the adjective ('as loud ...?'); for 'It was so a loud drum', hold up a finger at 'so' and say 'such ... ?'; for 'too loud that I covered', say 'so loud ... that ...' slowly; for 'too heavy for carry', point to the frame and wait for 'to carry'.",
            note: "The first two rounds drill the unit's own grammar; round 3 and the Stretch tier use today's Level 4 step, which grows out of it: comparing two things becomes telling what happens because of a thing. Do not drill the step in rounds 1 and 2: the S sign is for round 3. Round 3 must be real: a true sound, a true heavy bag. Keep it brisk.",
            support: ["The ___ is as ___ as the ___.", "It was so ___ that I ___."],
            stretch: "Use two signs at once and all three step patterns: 'It was such a heavy tuba that I couldn't lift it. It was too heavy to carry alone, so we asked a teacher.'",
            stretchFrames: ["It was so ___ that ___.", "It was such a ___ ___ that ___.", "It was too ___ to ___."],
            step: true,
          }),
        },
        {
          after: "Is as or is not as? (SB 121 F-G)",
          slide: {
            kind: "writing",
            title: "Two instruments: plan, write, check",
            routine: "paragraph",
            genre: "comparison",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the sentence that introduces both instruments, the 'as ... as' sentences and the closing sentence.",
              "Plan: choose two instruments. Fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use 'as ... as', 'not as ... as' and 'but'.",
              "Check: tick the checklist. Swap with a partner: they underline one 'as ... as' sentence and say if it is true.",
              "Teacher: while they write, look only at two targets ('as' before AND after the adjective, and 'is' or 'are'). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The flute and the tuba",
              text: "I am comparing two instruments, the flute and the tuba. The flute is not as big as the tuba, so it is easy to carry. It is as light as a feather. The tuba is not as high as the flute, but it is as loud as a drum. The sound of the tuba is deep and strong, and the sound of the flute is soft and sweet. I like both of them because they are so different.",
            },
            organiser: [
              { label: "Introduction", prompt: "Which two instruments? Say: 'I am comparing ...'" },
              { label: "Size and weight", prompt: "Which is bigger or lighter? Use 'not as ... as' or 'as ... as'." },
              { label: "Sound", prompt: "Which is louder or higher? Use 'but' to join two ideas." },
              { label: "Closing", prompt: "Which one do you like? End with 'I like ... because ...'" },
            ],
            frames: ["I am comparing the ___ and the ___.", "The ___ is not as ___ as the ___, so ___.", "The ___ is as ___ as ___, but ___.", "I like ___ because ___."],
            checklist: [
              "Both instruments are named in my first sentence",
              "'as' comes BEFORE and AFTER the adjective: as loud as",
              "The adjective stays plain (loud, not louder) and 'is' or 'are' matches the noun",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the sentence-combining work into a whole comparison, so the 'as ... as' practice just done gets used in context. Mark only two targets ('as' before and after the adjective, and the verb 'is' or 'are') with a dot on the line; the child finds and fixes the mistake. Watch for 'as louder as' and 'as big than'. The paragraph can also be a script for the Lesson 4 instrument description.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["I am comparing the ___ and the ___.", "The ___ is not as ___ as the ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence about a third instrument, with a reason." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u12-l4": {
      objectives: ["I can describe my instrument for two minutes, a little better each time."],
      trim: { "-dge tongue twister": 3, "Homemade instruments (SB 122 A)": 6, "Listen for the missing words (SB 122 B)": 6, "Instrument maker interviews": 5, "Plan and pitch your instrument": 4 },
      add: [
        {
          after: "Describe it, guess it (SB 122 C)",
          slide: {
            kind: "fluency",
            title: "Instrument talk 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 10,
            goal: "Give the same instrument talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My instrument is made of a box, a stick and four strings.",
              "It looks like a small guitar, and it sounds high and sweet.",
              "It's as light as a feather, but it isn't as loud as a drum.",
              "Its best part is the bridge, and it's easy to play.",
              "You play it by plucking the strings with your fingers.",
            ],
            recycle: ["The trombone is louder than the violin.", "I like to sing at home with my family."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A gives the whole talk, then Partner B. The listener counts the 'as ... as' sentences and nods. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Fewer stops. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B. Fast and smooth! The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Plan your talk with the frames: what is it made of, what does it look like, how does it sound, how do you play it?",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them with the class, especially the -s on verbs; then go on.",
              "In each round, Partner A talks, then Partner B talks. On the bell, partners change: line B moves one place to the left.",
              "The talks get shorter: 90, 60 and 45 seconds each.",
            ],
            feedback:
              fixBase +
              " For this lesson: if a child says 'It sound high', hold up a finger for the -s; if they say 'It have four strings', point to the frame and wait for 'has'. Do not try to catch its / it's by ear: the two sound the same.",
            teacherNote:
              "The 4/3/2 for an eight-to-ten-year-old: the same talk, three listeners, less time. The one-minute correction between rounds 1 and 2 is what makes the later rounds more accurate as well as faster. 'its' and 'it's' sound the same, so you cannot catch that mistake by ear: it is practised in the writing step that follows.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["It's made of ___.", "It sounds ___.", "You play it by ___ing."] },
              { level: "Core", task: "Say five sentences, without looking at the frames." },
              { level: "Stretch", task: "Add a comparison with a reason: 'It's as ___ as a ___, but it isn't as ___ as a ___, so ...'", frames: ["It's as ___ as ___, but it isn't as ___ as ___."] },
            ],
          },
        },
        {
          after: "its or it's?",
          slide: drill({
            title: "Grammar drill: it's, its and so ... that",
            goal: "Change the sentence fast and right: ask it, say no, join it, change the time. Then describe a real instrument or sound with it's, its and so ... that.",
            chunks: [
              "It's a djembe, and its skin is made of goat leather.",
              "It's got four strings, and its sound is high and sweet.",
              "Is it as loud as a drum? No, it isn't, but it's so sweet that everyone listens.",
              "Its case is too heavy to carry alone.",
              "It was such a lovely sound that we stopped to listen.",
              "Its best part is the bridge, because it's so strong that it never breaks.",
            ],
            recycle: ["If you practice every day, you will be able to play a song soon.", "We are playing at the Instrument Expo on Friday."],
            prompts: [
              "It's a loud drum. (?)",
              "It's got a long neck. (X)",
              "Its sound is sweet. (+ so that: so sweet that everyone listens)",
              "It's a lovely song. (T: yesterday)",
              "My violin is old and its case is broken. (P: their)",
              "It's a heavy case. (S: too heavy to carry)",
            ],
            real: "Real talk: describe a real instrument or sound you know, with it's and its, and say how loud, sweet or big it is with so ... that or too ... to. Your partner asks one question.",
            slips: "'It have four strings', 'it's skin' for 'its skin' or 'too heavy for carry'",
            fb: "Its and it's sound the same, so you cannot catch that slip by ear: ask 'Can I say it is here?' and show the spelling on the board in the writing step. For 'It have four strings', hold up a finger at 'have' and wait for 'has' or 'it's got'; for 'so a lovely sound', say 'such ... ?'; for 'too heavy for carry', point to the frame and wait for 'to carry'.",
            note: "Today's grammar slide is its and it's, which cannot be told apart by ear, so the drill uses them in whole sentences about a real instrument and puts the Level 4 step on top: describing how strong a sound is. The S sign is for round 3. Keep it brisk; a drill that drags loses its point.",
            support: ["It's ___. Its ___ is ___.", "It's so ___ that ___."],
            stretch: "Use two signs at once, with a result: 'Its case was too heavy to carry alone, so I asked a friend to help.'",
            stretchFrames: ["Its ___ was too ___ to ___.", "It was such a ___ ___ that ___."],
            step: true,
          }),
        },
        {
          after: "its or it's? (SB 123 E)",
          slide: {
            kind: "writing",
            title: "Find the mistake: its or it's",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Plan: read each sentence with your partner. Ask: can I say 'it is' here? If yes, it's. If it belongs to the thing, its.",
              "Write the sentence the right way.",
              "Check with the checklist and read each fixed sentence aloud.",
            ],
            items: [
              { q: "The flute is in it's box.", answer: "The flute is in its box." },
              { q: "Its very loud!", answer: "It's very loud!" },
              { q: "The tuba is heavy. It's case has wheels.", answer: "The tuba is heavy. Its case has wheels." },
              { q: "The erhu have two strings", answer: "The erhu has two strings." },
              { q: "The panpipes is as light as a feather", answer: "The panpipes are as light as a feather." },
            ],
            checklist: ["Can I say 'it is' here? Yes: it's. No: its", "The verb matches: the erhu has, the panpipes are", "A capital letter and a full stop"],
            sayIt: "Read your fixed sentences to your partner, then say them again without looking.",
            teacherNote:
              "Focus on two or three error types at a time: today its / it's and the verb form (has, are). Give the 'can I say it is?' test and let children apply it. Item 4 is a common learner slip (have for has); item 5 is a verb that does not match a plural noun.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the 'it is' test on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two sentences about your own instrument, one with its and one with it's, for your partner to check." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Describe my instrument",
        prompt: "Show or draw an instrument. Tell us what it is made of, what it looks like, how it sounds and how you play it. Say one 'as ... as' sentence.",
        length: "60-90 seconds",
        steps: [
          "Draw your instrument or find a real one at home.",
          "Practise your talk three times to a grown-up or a toy, each time a little faster and smoother, like in class.",
          "Record it once. Hold up your picture and speak without reading.",
          "Add one sentence with so ... that, such a ... that or too ... to: 'It's so light that I can carry it.'",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Describe your instrument with 'as ... as', say how you play it, and keep talking without long stops.",
        words: ["instrument", "made of", "strings", "sounds", "looks like", "plays", "vibrates"],
        grammar: ["It's made of ___.", "It's as ___ as ___. It isn't as ___ as ___.", "its / it's", "It's so ___ that ___. / It's such a ___ ___ that ___. / It's too ___ to ___."],
        rubric: [
          { label: "Description", description: "Says what it is made of, what it looks like, how it sounds and how you play it.", weight: 3 },
          { label: "As ... as", description: "Uses 'as ... as' or 'not as ... as' correctly with a plain adjective.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -s in sounds, plays and strings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It's made of ___.", "It sounds ___.", "You play it by ___ing."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["It looks like a ___ and it sounds ___.", "It's as ___ as a ___."], tips: ["Add one 'as ... as' sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It isn't as ___ as a ___, but it's as ___ as a ___.", "Its best part is ___ because ___."], tips: ["Use its and give a reason."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u12-l5": {
      objectives: ["I can present my instrument and answer questions without long stops."],
      trim: { "60-second recall": 3, "Test our big ideas": 3, "The Instrument Expo: present and visit": 11 },
      add: [
        {
          after: "Build it (SB 125 C)",
          slide: {
            kind: "fluency",
            title: "Expo question chain",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no long stops.",
            chunks: [
              "What is your instrument made of?",
              "I made it from a box, a stick and some string.",
              "How do you play it?",
              "When I hit it, it vibrates and makes a low sound.",
              "It's as long as my arm, but it isn't as heavy as a drum.",
            ],
            recycle: ["The djembe is as loud as the snare drum.", "Which is longer, a flute or a clarinet?"],
            rounds: [
              { seconds: 120, say: "Slow chain round the circle. Everyone holds their own instrument or a picture of it." },
              { seconds: 90, say: "Swap instruments with your neighbor. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Ask the friend on your left: 'What is your instrument made of?'",
              "They answer with a whole sentence, then ask the next friend: 'How do you play it?'",
              "Keep the chain moving: ask one question, answer one question.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them, then go on.",
            ],
            prompts: ["What is it made of?", "How do you play it?", "What does it sound like?", "Is it as ___ as ___?"],
            feedback:
              fixBase +
              " For this lesson: if a child asks 'How you play it?', start the question and pause ('How do ...?') and let them finish; if they say 'It vibrate', hold up a finger for the -s.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes the questions automatic before the Expo. Time the circle and tell the class: children love beating their own time. Watch for the missing 'do' in 'How you play it?' and for the final -s in 'vibrates'.",
            tiers: [
              { level: "Support", task: "Answer with a whole sentence and ask the next question from the frame.", frames: ["It's made of ___.", "You play it by ___ing."] },
              { level: "Core", task: "Ask and answer without looking at the frames." },
              { level: "Stretch", task: "Answer with a comparison: 'It isn't as big as a drum, but it's as loud.'", frames: ["It isn't as ___ as ___, but ..."] },
            ],
          },
        },
        {
          after: "Expo question chain",
          slide: drill({
            title: "Grammar drill: so ... that, too ... to",
            goal: "Change the sentence fast and right: ask it, say no, join it, change the time. Then say what you built or tried, and how hard or big it was, with so ... that, such a ... that and too ... to.",
            chunks: [
              "My instrument is as long as my arm, but it isn't as heavy as a drum.",
              "The box was so strong that it didn't break when I hit it.",
              "It was such a hard job that we needed two days to build it.",
              "The string was too thin to make a loud sound, so I used two.",
              "When I hit it, it makes such a deep sound that everyone turns round.",
              "Is your instrument as easy to play as a recorder? Yes, it is.",
            ],
            recycle: ["A drum is an instrument that you hit.", "While we were building it, the glue was drying on the table.", "We are showing our instruments to the visitors on Friday."],
            prompts: [
              "The box was so strong that it didn't break. (?)",
              "The job was too hard to finish. (X)",
              "The string was thin. (+ so that: so thin that it broke)",
              "The sound is so deep that we feel it. (T: yesterday)",
              "The drum was so loud that I covered my ears. (P: they)",
              "The stick was long. (S: so long that ...)",
            ],
            real: "Real talk: tell your partner about something you built, made or tried (an instrument, a model, a school project). Say how hard, big or heavy it was with so ... that, such a ... that or too ... to, and what you did next. Your partner asks one question.",
            slips: "'so a hard job', 'too thin for make' or 'too loud that'",
            fb: "For this lesson: if a child says 'It was so a hard job', hold up a finger at 'so' and say 'such ... ?'; for 'too thin for make', point to the frame and wait for 'to make'; for 'The box was too strong that it did not break', say 'so strong ... that ...' slowly; for a missing -s ('It make a deep sound'), hold a finger at the verb.",
            note: "The Expo comes straight after, so the drill gives them the sentences for how hard, big or strong their instrument was, using the Level 4 step again. The S sign is for round 3. Listen for 'too' used where 'so' is needed: Vietnamese 'quá ... đến nỗi' is so ... that, and too ... to means we cannot do it.",
            support: ["The ___ was so ___ that ___.", "The ___ was too ___ to ___."],
            stretch: "Use two signs at once and two step patterns in one story: 'It was such a big box that it was too heavy to carry, so we pushed it.'",
            stretchFrames: ["It was such a ___ ___ that ___.", "It was too ___ to ___, so ___."],
            step: true,
          }),
        },
        {
          after: "Talk about the model (SB 124 B)",
          slide: {
            kind: "writing",
            title: "Plan my paragraph",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the facts and the closing sentence.",
              "Plan: fill in a quick organiser with five boxes: instrument, fact 1, fact 2, fact 3 and closing idea.",
              "Write your first two sentences with the frames, then check with the checklist.",
            ],
            text: {
              title: "A model paragraph",
              text: "The djembe is a drum from West Africa. It is made of wood and animal skin. You play it with your hands, and it makes a deep, warm sound. It is not as big as a bass drum, but it is as loud as a snare drum. I think the djembe is a wonderful instrument because anyone can play it.",
            },
            frames: ["The ___ is a ___ from ___.", "It is made of ___.", "You play it with ___, and it sounds ___.", "It is as ___ as ___, but it is not as ___ as ___.", "I think ___ because ___."],
            checklist: ["A topic sentence that names the instrument", "Three facts and one 'as ... as' sentence", "A closing sentence with 'because'", "Capital letters, full stops and -s endings"],
            sayIt: "Read your first two sentences aloud to your partner, then say them again without looking.",
            teacherNote:
              "A plan-write-check routine: the quick organiser (instrument, three facts, closing idea) takes the load off writing, and the checklist gives each child something clear to check. The full paragraph is written in the workbook slide that follows, so today ends with two good sentences and a plan, not a draft left half done.",
            tiers: [
              { level: "Support", task: "Copy the topic sentence frame and write two facts with the frames." },
              { level: "Core", task: "Write the topic sentence and three facts." },
              { level: "Stretch", task: "Write the topic sentence, three facts, an 'as ... as' sentence and a closing sentence with 'because'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u12-l6": {
      objectives: ["I can say and write 'as ... as' sentences with a reason, smoothly and correctly."],
      trim: { "Remember it!": 3, "Balance game: arms level or tip!": 4, "Pretend sound scores: ask and fill in": 7 },
      add: [
        {
          after: "Balance game: arms level or tip!",
          slide: {
            kind: "fluency",
            title: "Champion sprint: as ... as and reasons",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say every champion sentence fast and right: as ... as, not as ... as, and a reason.",
            chunks: [
              "The djembe is as loud as the snare drum, so we put them at the back.",
              "The flute isn't as heavy as the tuba, so it is easier to carry.",
              "Are the panpipes as long as the didgeridoo? No, they aren't.",
              "I chose the clarinet because it isn't as big as the tuba.",
              "Together our band is as happy as two birds!",
            ],
            recycle: ["Of the three drums, the big one is the loudest.", "Is a trumpet more exciting than a violin?"],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows two instrument cards and a symbol (= or not =), the class says the sentence." },
              { seconds: 60, say: "Pairs: one shows the cards, the other says the sentence with a reason. Swap on the clap." },
              { seconds: 45, say: "New partner. Champion round: as many correct sentences as you can!" },
            ],
            steps: [
              "Watch the cards and symbol. Say the whole sentence, then add 'so' or 'because'.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Put two mistakes on the board and fix them with the class, then go on.",
            ],
            feedback: fixBase + asAs,
            teacherNote:
              "Mixed practice: old and new phrases together (spaced retrieval) keep Unit 11's comparatives from fading while the new 'as ... as' becomes automatic. Add the reason ('so' / 'because') last: it makes the sentence longer without changing its core.",
            tiers: [
              { level: "Support", task: "Say the sentence without the reason, with the frame.", frames: ["The ___ is as ___ as the ___.", "The ___ isn't as ___ as the ___."] },
              { level: "Core", task: "Say the sentence and add a reason with 'so' or 'because'." },
              { level: "Stretch", task: "Say two linked sentences with a reason, then a question and its short answer.", frames: ["..., so ...", "Is the ___ as ___ as the ___? No, it isn't."] },
            ],
          },
        },
        {
          after: "Grammar: as ... as and not as ... as",
          slide: drill({
            title: "Grammar drill: champions with as ... as and so ... that",
            goal: "Say everything the champions know, fast and right: as ... as, not as ... as, a reason, and then so ... that, such a ... that and too ... to.",
            chunks: [
              "The djembe is as loud as the snare drum, so we put them at the back.",
              "The flute isn't as heavy as the tuba, so it is easier to carry.",
              "Are the panpipes as long as the didgeridoo? No, they aren't.",
              "The tuba was so loud that the whole room shook.",
              "It was such a good band that everyone clapped.",
              "The stage was too small to fit the whole band.",
            ],
            recycle: ["It must be a drum, because it can't be a flute.", "There are too many drums and not enough chairs.", "That drum is the loudest one I have ever heard."],
            prompts: [
              "The panpipes are as long as the flute. (?)",
              "The drum is as loud as the tuba. (X)",
              "The tuba is heavy. (+ so that: so heavy that we need two people)",
              "The band was so good that everyone clapped. (T: last week)",
              "The stage was too small to fit the band. (P: our stage)",
              "The sound was loud. (S: such a loud sound that ...)",
            ],
            real: "Real talk: your class band. Say why you choose one instrument with as ... as or not as ... as, and then say how loud, big or strong it is with so ... that, such a ... that or too ... to. Your partner asks one question.",
            slips: "'as louder as', 'The panpipes is', 'so a good band' or 'too small for fit'",
            fb: "For this lesson: if a child says 'as louder as' or 'as big than', pause at the adjective ('as big ...?') and wait for 'as'; for 'The panpipes is', say 'The panpipes ...?' and let the child finish with 'are'; for 'so a good band', hold up a finger at 'so' and say 'such ... ?'; for 'too small for fit', point to the frame and wait for 'to fit'.",
            note: "This is the last lesson of the unit, so the drill covers both: the unit's own as ... as in rounds 1 and 2, and the Level 4 step in round 3 and the Stretch tier. The Level 4 step will return in Oxford Discover 4 with longer sentences, so aim for correct, whole sentences. Round 3 must be real: the class band is a true choice. Keep it brisk.",
            support: ["The ___ is as ___ as the ___.", "It was so ___ that ___."],
            stretch: "Use two signs at once and both parts: 'The tuba wasn't as light as the flute, so it was too heavy to carry, but it made such a deep sound that we chose it.'",
            stretchFrames: ["The ___ isn't as ___ as the ___, so ___.", "It was so ___ that ___. It was too ___ to ___."],
            step: true,
          }),
        },
        {
          after: "Pretend sound scores: ask and fill in",
          slide: {
            kind: "writing",
            title: "Our class band: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the choice, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Ask yourself: why this instrument?",
              "Write: turn your notes into one paragraph. Use First, Second and That is why.",
              "Check: tick the checklist. Swap with a partner: they underline one reason and tell you one thing they liked.",
              "Teacher: while they write, look only at two targets ('so' and 'because' used the right way round, and the plural -s). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A drum for our band",
              text: "Our class band needs a good instrument for the show, and I choose the djembe. First, it is as loud as a snare drum, so everyone can hear it. Second, it isn't as heavy as a tuba, so it is easy to carry to the stage. That is why I choose the djembe for our band.",
            },
            organiser: [
              { label: "Choice", prompt: "Which instrument do you choose for the band?" },
              { label: "Reason 1: First, ...", prompt: "Use 'as ... as' and 'so'." },
              { label: "Reason 2: Second, ...", prompt: "Use 'not as ... as' and 'because' or 'so'." },
              { label: "Closing: That is why ...", prompt: "End with 'That is why I choose ...'" },
            ],
            frames: ["Our class band needs ___, and I choose ___.", "First, it is as ___ as ___, so ___.", "Second, it isn't as ___ as ___, so ___.", "That is why I choose ___."],
            checklist: [
              "My first sentence says which instrument I choose",
              "Two reasons with First and Second",
              "'so' and 'because' are in the right places, and the adjective stays plain (loud, not louder)",
              "One sentence with so ... that, such a ... that or too ... to: 'It is so loud that everyone can hear it.'",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It grows the sentence-joining work (so, because) into a whole opinion with reasons. Mark only two targets ('so' and 'because' used the right way round, and the plural -s) with a dot on the line; the child finds and fixes the mistake. This paragraph is the script for the lesson's recorded talk 'Choose an instrument for our band': children practise it aloud three times, then record.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Our class band needs ___, and I choose ___.", "That is why I choose ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence that says why you did not choose another instrument." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Choose an instrument for our band",
        prompt: "Pick two instruments for a class band. Compare them with 'as ... as' and 'not as ... as', then tell us which one you choose and why.",
        length: "60-90 seconds",
        steps: [
          "Choose two instruments and draw or find pictures of them.",
          "Practise your talk three times to a grown-up or a toy, each time a little faster and smoother.",
          "Record it once. Say your reason with 'because' or 'so'.",
          "Add one sentence with so ... that, such a ... that or too ... to: 'The drum is so loud that everyone can hear it.'",
          "Grown-up: hold the phone and let your child speak; please do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Compare two instruments with 'as ... as', choose one with a reason, and keep talking without long stops.",
        words: ["instrument", "band", "loud", "heavy", "easy", "choose", "because"],
        grammar: ["A is as ___ as B.", "A isn't as ___ as B.", "I choose ___ because ___.", "It is so ___ that ___. / It is such a ___ ___ that ___. / It is too ___ to ___."],
        rubric: [
          { label: "Comparisons", description: "Compares the two instruments with 'as ... as' and 'not as ... as', with a plain adjective.", weight: 3 },
          { label: "Choice and reason", description: "Chooses one instrument and gives a reason with 'because' or 'so'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -s in plurals (strings, panpipes) and verbs (has, sounds) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is as ___ as the ___.", "I choose the ___."], tips: ["Point to your pictures."] },
          { level: "Core", who: "Most children", frames: ["The ___ is as ___ as the ___, but it isn't as ___ as the ___.", "I choose the ___ because ___."], tips: ["Give a reason for your choice."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ isn't as ___ as the ___, so ___.", "Together our band is as ___ as ___."], tips: ["Add a result with 'so' and describe your whole band."] },
        ],
      },
    },
  },
};
