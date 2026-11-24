import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 13 "Music and
// Feelings" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's sentences said again and again as
// whole phrases, a little faster each round, with Unit 12's phrases mixed back in) and
// one short writing routine (say it, write it, read it back). Two lessons end with a
// recorded talk for home. Time comes from games, chants and repeats, never from the
// book pages or the grammar. All text is original.

const fixMinute =
  "Between rounds, stop for one minute: put two mistakes you heard on the board (no names) and let the class fix them, then go on; children who say it again use the fixed form. For grammar, prompt the child to fix it (start the phrase and pause, point to the frame, hold up a finger for the missing word) rather than saying it for them; for a sound, just say it right and let them echo. Say every final -s clearly yourself: children copy what they hear.";

const GROWN_UP =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U13Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u13-l1": {
      objectives: ["I can say 'It makes me feel ___.' about my favorite music, fast and smooth."],
      trim: { "Mood music freeze": 3, "Voice orchestra": 5 },
      add: [
        {
          after: "My favorite song (SB 129 Think)",
          slide: {
            kind: "fluency",
            title: "Music sprint: how does it make me feel?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 8,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "My favorite song is fast.",
              "It makes me feel excited.",
              "Slow music makes me sleepy.",
              "A bird makes a high sound.",
              "A big drum makes a low sound.",
            ],
            recycle: ["I keep my books on a shelf.", "We can reuse old things."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "New partner. Faster! How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence about it, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: drum)", "(card: bird)", "(card: pillow)", "(card: party)", "(card: wolf)"],
            feedback:
              "Typical slips here: 'It make me feel excited' (missing -s), 'It makes me excited' (missing feel) and 'Slow music make me sleepy'. Prompt by saying 'It make...?' with rising voice, or hold up a finger for the -s on makes. For a sound such as the end of 'wolf' or 'feelings', say it right and let them echo. " + fixMinute,
            teacherNote: "Whole sentences only: the point is that 'It makes me feel excited' becomes one smooth piece. Listen for the -s on makes and for the sound at the end of wolf and feelings. The two recycle phrases come from Unit 12: slip one in every few cards so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It makes me feel ___.", "___ music makes me ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'Fast music makes me excited because I want to jump.'", frames: ["___ music makes me ___ because ___."] },
            ],
          },
        },
        {
          after: "Squeeze the story",
          slide: {
            kind: "writing",
            title: "Join them with 'because'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'because'. Say it first, then write it.",
              "Read your sentence to your partner. Does it sound right?",
            ],
            items: [
              { q: "I like fast music. It makes me excited. (because)", answer: "I like fast music because it makes me excited." },
              { q: "Pip is sleepy. The music is slow. (because)", answer: "Pip is sleepy because the music is slow." },
              { q: "I like drums. The sound is low. (because)", answer: "I like drums because the sound is low." },
            ],
            checklist: ["Only one full stop, at the end", "'because' joins the two parts", "makes: the -s is there"],
            sayIt: "Say your 'because' sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: they learn joining words by using them. Model item 1 aloud and cross out the full stop in the middle. Do not teach a rule about commas today.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Write one more 'because' sentence about your own favorite music." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u13-l2": {
      objectives: ["I can say how fast and slow music make me feel, three times, faster each time."],
      trim: { "Animal music chant": 3, "Draw what you imagine": 5 },
      add: [
        {
          after: "Our chart: music and feelings",
          slide: {
            kind: "fluency",
            title: "Feelings talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same short talk to three friends: 60, 45, then 30 seconds each. Each talk is shorter and smoother.",
            chunks: [
              "Fast music makes me excited.",
              "Slow music makes me sleepy.",
              "I like this music because it makes me happy.",
              "I imagine a wolf in the forest.",
            ],
            recycle: ["The bottle is in the box.", "We can recycle paper."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A gives the feelings talk, then Partner B. The listener counts the feelings on their fingers. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Partner A, then Partner B: fast and smooth! The listener says 'Me too!' if they feel the same." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do three rounds: 60 seconds, 45 seconds, 30 seconds each. Both partners talk in every round.",
            ],
            feedback:
              "Typical slips: 'Fast music make me excited' (missing -s), 'I am like this music' (be for like), 'Slow music makes me sleep' (the verb instead of sleepy). Prompt with 'Fast music make...?' and a finger for the -s, or point to the frame. A sound slip, such as 'excited' without the last -d, gets a quick recast and an echo. " + fixMinute,
            teacherNote: "Same talk, less time, new listener: 4/3/2 scaled for seven-year-olds. The new partner keeps the repetition real. The fluency gain comes from saying the same thing again, so do not add new language between rounds; the minute's correction is what lifts the accuracy of rounds 2 and 3. Listen for -s on makes and for the ending of excited.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Fast music makes me ___.", "Slow music makes me ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a 'because' sentence and ask: 'How does this music make you feel?'", frames: ["I like ___ music because ___."] },
            ],
          },
        },
        {
          after: "Draw what you imagine",
          slide: {
            kind: "writing",
            title: "Music and feelings dictogloss",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Remember: fast music makes me ___. Slow music makes me ___.",
              "Listen to the short text. Do not write yet.",
              "Listen again and write key words: fast, drum, excited, slow, sleepy.",
              "Work with your group and write the text back. It does not have to be the same word for word, but it must be right.",
            ],
            text: { title: "Music at the party", text: "Fast music is playing at the party. The drum is loud and it makes us excited. Then the music gets slow. Now the song makes the baby sleepy." },
            checklist: ["A capital letter at the start of each sentence", "makes: the -s is there", "A full stop at the end of each sentence"],
            sayIt: "Read your text to the next group, then say it again without looking.",
            teacherNote: "Read the text twice at natural speed and fold it on screen. Dictogloss makes children notice grammar they usually skip, such as the -s on makes, because they must rebuild whole sentences. Show the original at the end and let groups compare.",
            tiers: [
              { level: "Support", task: "Write the key words and the first sentence with the teacher." },
              { level: "Core", task: "Write the text back with your group." },
              { level: "Stretch", task: "Add one more sentence about how you feel." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Music makes me feel",
        prompt: "Play some music at home. Tell us how it sounds and how it makes you feel.",
        length: "45-60 seconds",
        steps: [
          "Find a song at home. Listen to it with a grown-up.",
          "Say your talk three times, a little faster each time, like in class.",
          "Record it once. Smile and look at the camera.",
          GROWN_UP,
        ],
        maxSeconds: 120,
        kidSummary: "Say if the music is fast or slow, say how it makes you feel, and keep talking without long stops.",
        words: ["fast", "slow", "high", "low", "excited", "sleepy", "feelings"],
        grammar: ["Fast / Slow music makes me ___.", "I like it because ___."],
        rubric: [
          { label: "Sound and feeling", description: "Says how the music sounds (fast, slow, high, low) and how it makes them feel.", weight: 3 },
          { label: "Makes me", description: "Says 'It makes me feel ___' or 'Fast music makes me ___' with the -s on makes.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Reason", description: "Gives a reason with because.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My music is ___.", "It makes me feel ___."], tips: ["Move to the music as you speak."] },
          { level: "Core", who: "Most children", frames: ["My music is ___ and ___.", "It makes me feel ___.", "I like it because ___."], tips: ["Say a feeling and a reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Fast music makes me ___, but slow music makes me ___.", "I imagine ___."], tips: ["Compare two kinds of music and say what you imagine."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u13-l3": {
      objectives: ["I can ask 'When do you ...?' and answer with in, at or on, fast and right."],
      trim: { "What time of day? chant": 3, "Time of day line-up": 5, "Listen and sing (SB 133 D)": 7, "Guess the girl (SB 133 E)": 8 },
      add: [
        {
          after: "Ask about Saturdays (SB 133 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: When do you ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "When do you listen to music?",
              "I listen to music in the afternoon.",
              "I sleep at night.",
              "We play football on Saturday.",
              "When does she sing? She sings in the morning.",
            ],
            recycle: ["The bottle is in the bin.", "We should take care of the Earth."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a time card: morning, afternoon, evening, night or Saturday." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your time card so only you can see it.",
              "Ask the friend on your left: 'When do you listen to music?'",
              "They answer with their card: 'I listen to music in the morning.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["When do you ___?", "(card: in the morning)", "(card: at night)", "(card: on Saturday)"],
            feedback:
              "Typical slips: 'on the morning', 'in night', 'at Saturday', and 'She sing' (missing -s). Prompt by starting the phrase and pausing: 'I sleep... ?' and point to the card or the in / at / on frame on the board. Use a finger for the missing -s. Do not say the right word for the child; wait for them to find it. " + fixMinute,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes the 'little word plus time word' group automatic: in the morning, at night, on Saturday. Say the groups as one chunk. Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["I ___ in the morning.", "I ___ at night."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with a whole day: 'I play in the afternoon and I sleep at night.'" },
            ],
          },
        },
        {
          after: "A day for two new friends",
          slide: {
            kind: "writing",
            title: "Fix the time words",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong with in, at or on!",
              "Find it and write the sentence the right way.",
              "Read the fixed sentences aloud together.",
            ],
            items: [
              { q: "I read on the morning.", answer: "I read in the morning." },
              { q: "She sleeps in night.", answer: "She sleeps at night." },
              { q: "We play football at Saturday.", answer: "We play football on Saturday." },
              { q: "He listen to music in the evening.", answer: "He listens to music in the evening." },
            ],
            checklist: ["in the morning / afternoon / evening", "at night", "on + a day; and he / she + verb with -s"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "The three errors in items 1-3 are the ones the Unit 13 grammar slide predicts; the fourth is the third-person -s, which Vietnamese learners often drop. Fix item 1 together first. Keep to these two error types today.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the in / at / on frame on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u13-l4": {
      objectives: ["I can say my opinion about music: 'Please turn down the music!' and 'I love it!'"],
      trim: {
        "Feeling faces chant": 3,
        "Listen, point, say (SB 134 A)": 6,
        "Listen for details (SB 134 C-D)": 9,
        "Because I feel ___, I ___": 5,
        "Giving opinions (SB 135 E)": 9,
        "Same meaning, different word (SB 135 F)": 7,
      },
      add: [
        {
          after: "Giving opinions (SB 135 E)",
          slide: {
            kind: "fluency",
            title: "Opinion talk: say it again, smoother",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same opinion talk two times with two partners: 60 seconds, then 45 seconds each. Make it smoother the second time.",
            chunks: [
              "Please turn down the music!",
              "I don't like it. It's too loud.",
              "I think it's great because it makes me happy.",
              "When I feel nervous, I listen to slow music.",
            ],
            recycle: ["Fast music makes me excited.", "I sleep at night."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A asks to turn the music down or up and gives a reason, then Partner B does the same. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A says the same talk again, a little faster, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Choose one piece of music from the cards. Decide: loud or quiet, like or don't like.",
              "Say your opinion and a reason to your partner. In each round Partner A talks, then Partner B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when the bell rings.",
            ],
            feedback:
              "Typical slips: 'Please turn off down', 'Because I feel nervous, I listening' and 'I am not like it'. Prompt with 'I don't... ?' and a finger for the missing do; point to the frame 'When I feel ___, I ___.' For the sound of 'nervous' or 'great', recast quickly and let them echo. " + fixMinute,
            teacherNote: "Task repetition: the task stays the same and the partner changes, so children can spend their attention on speaking smoothly instead of planning. Listen for 'I don't like it' (do, not be) and for polite 'Please'. Praise a child who keeps going after a slip.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Please turn down ___!", "I don't like ___."] },
              { level: "Core", task: "Say three sentences and a reason without the board." },
              { level: "Stretch", task: "Disagree politely: 'Really? It's my favorite!' and give a reason.", frames: ["Really? It's my favorite because ___."] },
            ],
          },
        },
        {
          after: "Say it before you write it",
          slide: {
            kind: "writing",
            title: "Grow my music sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add how it sounds, when you hear it, or why.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I like music. (add: slow)", answer: "I like slow music." },
              { q: "The song makes me feel happy. (add: because ...)", answer: "The song makes me feel happy because it is fun." },
              { q: "I listen to music. (add: at night)", answer: "I listen to music at night." },
              { q: "The drum is loud. (add: big)", answer: "The big drum is loud." },
            ],
            frames: ["___ music makes me feel ___ because ___.", "I listen to ___ music at night."],
            checklist: ["A capital letter at the start", "A full stop at the end", "makes: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "This is the warm-up for the longer Write about the music activity: children who can grow one sentence orally and on paper arrive ready to write three or four. Show the answers after the children have tried; accept other correct sentences.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences linked with 'and' or 'but'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u13-l5": {
      objectives: ["I can tell about my music day with in, at and on, three times, faster each time."],
      trim: { "Remember it!": 4, "Time hop: music on the floor clock": 7 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Rolo's music day: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same day three times: 60, 45, then 30 seconds each. Each time is shorter, smoother and faster.",
            chunks: [
              "In the morning Rolo plays fast drums.",
              "In the afternoon he sings.",
              "At night he listens to slow music.",
              "On Saturday he dances with the frogs.",
            ],
            recycle: ["We can reuse old things.", "Slow music makes me sleepy."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells Rolo's day with the four picture cards, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four cards in order: morning, afternoon, night, Saturday.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In each round Partner A tells the day, then Partner B. When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and tells one thing they remember.",
            ],
            prompts: ["(card: sun and drum)", "(card: Rolo sings)", "(card: moon and bed)", "(card: frogs dancing)"],
            feedback:
              "Typical slips: 'on the morning', 'in night', 'at Saturday' and 'Rolo play' (missing -s). Prompt by starting the phrase and pausing ('At... ?'), point to the card, or hold up a finger for the -s on plays, sings, listens, dances. Do not say the answer for the child. " + fixMinute,
            teacherNote: "Retelling the same four sentences three times, to a new listener, frees children to say 'in the morning, at night, on Saturday' as ready-made groups. The correction minute after round 1 is what turns the repetition into accuracy too. Keep the cards on the board for Support children and take them down for Stretch.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["In the morning ___.", "At night ___.", "On Saturday ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add how Rolo feels: 'Rolo feels excited in the morning, but sleepy at night.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my music day",
          slide: {
            kind: "writing",
            title: "A music day: model, then write",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find in, at and on.",
              "Write three sentences about your own music day with the frames.",
              "Read them to your partner. Are in, at and on right?",
            ],
            text: { title: "A music day", text: "In the morning I listen to fast music and I feel excited. At night I listen to slow music and I feel sleepy. On Saturday I play the drum with my friend." },
            frames: ["In the morning I ___.", "At night I ___.", "On Saturday I ___."],
            checklist: ["in the morning, at night, on Saturday", "A capital letter and a full stop in each sentence", "I listen: no -s after I; she listens: the -s"],
            sayIt: "Read your three sentences to your partner, then say them without looking.",
            teacherNote: "The model is short on purpose: the children copy its pattern, not its words. Check the three little words first; the verb -s matters only when a child writes about another person.",
            tiers: [
              { level: "Support", task: "Copy the model and change one word." },
              { level: "Core", task: "Write three sentences about your own day." },
              { level: "Stretch", task: "Write four sentences and add how you feel." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My music day",
        prompt: "Tell us about your music day: what you listen to or play in the morning, in the afternoon, at night and on Saturday.",
        length: "45-90 seconds",
        steps: [
          "Look at your 'music day' sentences from class.",
          "Say your music day three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Say in the morning, at night and on Saturday clearly.",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Tell your music day with in, at and on, say how you feel, and keep talking without long stops.",
        words: ["morning", "afternoon", "evening", "night", "Saturday", "excited", "sleepy"],
        grammar: ["in the morning / afternoon / evening", "at night", "on Saturday", "It makes me feel ___."],
        rubric: [
          { label: "In, at, on", description: "Uses in the morning, at night and on Saturday correctly.", weight: 3 },
          { label: "Music and feelings", description: "Says what music they hear or play and how it makes them feel.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s can be heard on verbs such as listens and plays when talking about another person.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In the morning I ___.", "At night I ___.", "On Saturday I ___."], tips: ["Point to your sentences as you speak."] },
          { level: "Core", who: "Most children", frames: ["In the morning I ___ and I feel ___.", "At night I ___.", "On Saturday I ___ and ___."], tips: ["Say a feeling for each time."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My friend ___s in the afternoon.", "Fast music makes me ___, but slow music makes me ___."], tips: ["Add a friend's day and compare two kinds of music."] },
        ],
      },
    },
  },
};
