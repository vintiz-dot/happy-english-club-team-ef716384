import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 15 "Shake, Strike
// and Play" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's words and "I'm shaking / she's
// striking" said again and again as whole sentences, a little faster each round, with
// Unit 14's phrases mixed back in) and one short writing routine (say it, write it, read it
// back). Two lessons end with a recorded talk for home. Time comes from games and repeats,
// never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, or start the phrase and pause ('I'm ... ?', 'She's shak... ?'), or hold up a finger for the missing 'am / is / are' or the missing -ing. Example: a child says 'He play the drum.' Say 'He's ...?' with rising voice and wait; the child says 'He's playing the drum.' For a sound, just say it right and let them echo it (strike, not 'srike'). Say every -ing, -s and final sound clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u15-l1": {
      objectives: ["I can say 'I want a ___, please.' and 'You can strike it.' fast, without stopping."],
      trim: { "The mystery music bag": 4, "Shake it, strike it (Simon says)": 3 },
      add: [
        {
          after: "At the music shop",
          slide: {
            kind: "fluency",
            title: "Instrument shop sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I want a drum, please.", "Here you are.", "You can strike it.", "You can shake it.", "Thank you!"],
            recycle: ["His house is old.", "Is your street quiet?"],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an instrument card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one is the shopper and one is the shopkeeper. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many instruments can you buy?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'I want a drum, please.'",
              "The shopkeeper answers 'Here you are. You can strike it.' and the shopper says 'Thank you!'",
              "Teacher: after round 2, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3, count your sentences on your fingers.",
            ],
            prompts: ["(card: drum)", "(card: tambourine)", "(card: triangle)", "(card: cymbals)", "(card: maracas)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'I want a drum, please' should come out as one smooth piece. Listen for a missing 'a' (I want drum) and a dropped final sound in 'strike it' and 'shake it'. Mix in a Unit 14 card every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I want a ___, please.", "You can ___ it."] },
              { level: "Core", task: "Say the sentences alone, without looking at the board." },
              { level: "Stretch", task: "Add a sound word: 'I want a drum, please. It's loud!'", frames: ["I want a ___, please. It's ___!"] },
            ],
          },
        },
        {
          after: "What will we read? (SB 149 D)",
          slide: {
            kind: "writing",
            title: "Grow my instrument sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a describing word (big, red, small).",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I have a drum. (add: big)", answer: "I have a big drum." },
              { q: "I want a tambourine. (add: red)", answer: "I want a red tambourine." },
              { q: "You can strike the triangle. (add: small)", answer: "You can strike the small triangle." },
            ],
            frames: ["I have a ___ drum.", "I want a ___ tambourine."],
            checklist: ["A capital letter at the start", "A full stop at the end", "a before the instrument: a drum"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I have a big drum and a small bell.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u15-l2": {
      objectives: ["I can talk about my favorite instrument three times, faster each time."],
      trim: { "Percussion band": 3, "Beat leader": 3, "Word hunt: the yellow words": 4 },
      add: [
        {
          after: "My favorite instrument",
          slide: {
            kind: "fluency",
            title: "My instrument 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same instrument talk to three friends. Each talk is shorter and smoother.",
            chunks: ["My favorite instrument is the drum.", "You strike it.", "It has a big, round top.", "I like it!"],
            recycle: ["Her house is big.", "Is your home in the city?"],
            rounds: [
              { seconds: 60, say: "First partner: tell your instrument talk. The listener counts the sentences on their fingers." },
              { seconds: 45, say: "New partner: the same talk in less time." },
              { seconds: 30, say: "Another new partner: fast and smooth! The listener says 'Boom!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "After each round, when the bell rings, line B moves one step to the left: a new partner.",
              "Then swap jobs: line B talks and line A listens, with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. Listen for 'You strike it' with the final sound of 'strike' clear, and 'the' before the instrument.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My favorite instrument is the ___.", "You ___ it."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a detail: 'It has two sticks. It's loud!'" },
            ],
          },
        },
        {
          after: "Draw and label my instrument",
          slide: {
            kind: "writing",
            title: "My favorite instrument: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the first sentence, the details and the ending.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box, then an ending. Start with My favorite instrument is the, You strike it or You shake it, It is.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the word the before the instrument. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: My drum", text: "My favorite instrument is the drum. You strike it with two sticks. It is big and round. It is loud, and I like it!" },
            organiser: [
              { label: "My instrument", prompt: "Draw your favorite instrument. Say: My favorite instrument is the ___." },
              { label: "How you play it", prompt: "Draw your hands playing it. Say: You strike it. / You shake it." },
              { label: "What it is like", prompt: "Draw its shape or color. Say: It is big / small / loud / soft." },
            ],
            frames: ["My favorite instrument is the ___.","You strike it. / You shake it.","It is ___ and ___."],
            checklist: ["Three or four sentences: what it is, how you play it, what it is like","A capital letter at the start and a full stop or ! at the end","the before the instrument: the drum"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking at the page.",
            teacherNote: "A first paragraph about the child's own instrument, planned by drawing, so no notes are needed. The three frames are the three sentences; children may copy and complete them. Mark only two things (capital letters, the before the instrument). The child's paragraph can be the script for the recorded talk 'My favorite instrument talk': they read it once, then say it in their own words. The 3-2-1 fluency slide earlier in the lesson is the oral rehearsal for this text.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["My favorite instrument is the ___.","You ___ it."] },
              { level: "Core", task: "Write three sentences: what it is, how you play it, what it is like." },
              { level: "Stretch", task: "Add a fourth sentence about the sound: 'It is loud, and I like it!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite instrument talk",
        prompt: "Show an instrument or a drawing of one. Tell us its name, how you play it, and why you like it.",
        length: "30-60 seconds",
        steps: [
          "Find an instrument or a pot and a spoon to be your drum. Or look at your drawing from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and show your instrument to the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say your favorite instrument, how you play it, and keep talking without long stops.",
        words: ["drum", "tambourine", "triangle", "cymbals", "strike", "shake"],
        grammar: ["My favorite instrument is the ___.", "You strike it. / You shake it."],
        rubric: [
          { label: "Instrument and how to play", description: "Says the name and 'You strike it.' or 'You shake it.'", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: drum, tambourine, strike, shake.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The sound at the end of 'strike it' and 'shake it' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite instrument is the ___.", "You ___ it."], tips: ["Hold up your instrument as you speak."] },
          { level: "Core", who: "Most children", frames: ["My favorite instrument is the ___.", "You ___ it.", "I like it!"], tips: ["Say all three sentences smoothly."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It has ___.", "It's loud. / It's soft.", "Can you play it?"], tips: ["Add a detail and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u15-l3": {
      objectives: ["I can say what people are doing: 'I'm shaking it. She's striking it.'"],
      trim: { "Freeze and mime": 3, "Mime and guess (SB 153 E)": 7 },
      add: [
        {
          after: "Tell the class what my partner is doing (SB 153 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: What are you doing?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["What are you doing?", "I'm shaking the tambourine.", "What is he doing?", "He's striking the drum.", "I'm not clapping."],
            recycle: ["His bakery is in the city.", "Her home is in the orchard."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone mimes an instrument and answers." },
              { seconds: 60, say: "Swap instruments. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Mime an instrument so only your friends can see.",
              "Ask the friend on your left: 'What are you doing?'",
              "They answer: 'I'm shaking the tambourine.' Then they turn and ask the next friend.",
              "Sometimes ask about someone else: 'What is she doing?' and answer 'She's striking the drum.'",
              "Teacher: after round 2, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What are you doing?", "What is he / she doing?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'I'm + -ing' automatic. Vietnamese does not put a be word before an action word, so children often say 'I playing' or 'He play': listen for the missing be and the missing -ing, and prompt with a raised finger and 'I'm ...?' Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board: 'I'm ___ing the ___.'", frames: ["I'm ___ing the ___.", "He's / She's ___ing the ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a negative: 'I'm not striking it. I'm shaking it.'" },
            ],
          },
        },
        {
          after: "Write what I'm doing (WB 131-133 prep)",
          slide: {
            kind: "writing",
            title: "Our class band: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to every be word: I'm, is, we're.",
              "Plan: look at your three drawings. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Start with This is, I'm, My friend is.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the be word (am, is, are) before the -ing word. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: Our band", text: "This is our class band. I'm shaking the red tambourine. My friend is striking the drum. We're making music, and it's fun!" },
            organiser: [
              { label: "Our band", prompt: "Draw your class band. Say: This is our class band." },
              { label: "Me", prompt: "Draw yourself with an instrument. Say what you are doing: I'm shaking / striking ___." },
              { label: "My friend", prompt: "Draw a friend with an instrument. Say what he or she is doing." },
            ],
            frames: ["This is our class band.","I'm ___ing the ___.","My friend is ___ing the ___."],
            checklist: ["Three or four sentences: our band, me, my friend","am / is / are before the -ing word: I'm shaking, my friend is striking","A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your band paragraph to your partner in a band-leader voice. Then tell it again without looking.",
            teacherNote: "A first present-continuous paragraph: the child looks at a picture or at the band in the room and says what is happening now. Vietnamese does not put a be word before an action word, so the dot is for a missing am / is / are or a missing -ing. The three frames are the three sentences; children may copy and complete them. The earlier fix-it practice now happens inside the checklist.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["I'm ___ing the ___.","My friend is ___ing the ___."] },
              { level: "Core", task: "Write three sentences: our band, what I am doing, what my friend is doing." },
              { level: "Stretch", task: "Add a fourth sentence with 'not': 'I'm not clapping. I'm shaking.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u15-l4": {
      objectives: ["I can say how an instrument sounds: 'A drum is loud.'"],
      trim: { "The conductor says": 3, "Line up A to Z (SB 155 F)": 6, "Fast, slow, loud, soft": 3 },
      add: [
        {
          after: "Tell your partner about an instrument (SB 155 Write)",
          slide: {
            kind: "fluency",
            title: "Sound talk: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same sound talk again with a new partner. It gets smoother each time.",
            chunks: ["A drum is loud.", "A triangle is soft.", "I like the drum.", "You strike it.", "It's loud and fun!"],
            recycle: ["I'm shaking the tambourine.", "She's striking the drum."],
            rounds: [
              { seconds: 45, say: "Round 1: Partner A tells about two instruments (how you play them and how they sound), then Partner B does the same. Then change partners." },
              { seconds: 30, say: "Round 2: new partner. Partner A tells the same two instruments again, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: new partner again. Same talk, smooth and fast! Partner A, then Partner B." },
            ],
            steps: [
              "Pick two instruments. Say what each one is and how it sounds.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round, Partner A talks first, then Partner B. When the bell rings, find a new partner and say the same talk again.",
              "The listener holds up one finger for each sentence they hear.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: same talk, new listener. The children know what to say, so they can spend their attention on saying it smoothly. Listen for 'A drum loud' (missing is) and a lost -d or -t at the end of 'loud' and 'soft'. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["A ___ is ___.", "You ___ it."] },
              { level: "Core", task: "Say four sentences about two instruments without the board." },
              { level: "Stretch", task: "Add a reason of your own: 'I like the drum because it's loud.'", frames: ["I like the ___ because it's ___."] },
            ],
          },
        },
        {
          after: "Write about my instrument (SB 155 Write, WB 135)",
          slide: {
            kind: "writing",
            title: "Dictogloss: the loud drum",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Remember: 'A drum is loud.' We say is after the thing.",
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again and write the key words you hear: drum, striking, tambourine, loud, soft.",
              "In your group, build the text. Then check it with the teacher.",
            ],
            text: { title: "The band", text: "Ollie has a drum. He is striking it. Rosie is shaking a tambourine. The drum is loud. The tambourine is soft." },
            frames: ["___ is striking the ___.", "The ___ is loud / soft."],
            checklist: ["Every sentence starts with a capital letter", "is is there: The drum is loud", "-ing at the end: striking, shaking"],
            sayIt: "Read your group's text aloud, then say it again without looking.",
            teacherNote: "Dictogloss: read the text twice at a natural speed, then let the groups rebuild it from their key words. The talk inside the group is the learning. Keep the text folded on the screen until the groups have finished, then compare. Praise a good version that is not word for word.",
            tiers: [
              { level: "Support", task: "Write the key words and use the frames to make two sentences." },
              { level: "Core", task: "Rebuild the text with your group." },
              { level: "Stretch", task: "Rebuild it, then add one more sentence about a new instrument." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u15-l5": {
      objectives: ["I can tell what the band is doing, three times, faster each time.", "I can write three sentences about the band."],
      trim: { "Freeze band": 7 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Band in the park: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 5,
            goal: "Tell what the band is doing three times. Each time is shorter, smoother and faster.",
            chunks: ["Ollie is striking the drum.", "Rosie is shaking the tambourine.", "They are making music!", "I'm not clapping. I'm listening."],
            recycle: ["Her home is in the orchard.", "I want a drum, please."],
            rounds: [
              { seconds: 40, say: "Round 1: Partner A tells what the band is doing, then Partner B. Use the picture to help you. Then change partners." },
              { seconds: 30, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 20, say: "Round 3: new partner. Tell it fast! Partner A, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the picture of the band. Say what each person is doing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round, Partner A tells it first, then Partner B. When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: the band in the park)"],
            feedback: correct,
            teacherNote: "This is the same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Listen for the missing be ('Ollie striking') and a dropped -ing; prompt with a pause: 'Ollie is ...?' Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each person in the picture and say one sentence.", frames: ["___ is ___ing the ___.", "They are making music!"] },
              { level: "Core", task: "Tell the whole band without the frames." },
              { level: "Stretch", task: "Add a negative and a feeling: 'Rosie isn't clapping. She's shaking. It's fun!'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "The band in the park: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to what each person is doing.",
              "Plan: look at your three drawings of the band in the park. Say one sentence for each box.",
              "Write: one sentence for each box. Start with the name, then is, then the -ing word.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the be word (am, is, are) before the -ing word. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The band in the park", text: "The band is in the park. Ollie is striking the drum. Rosie is shaking the tambourine. They are making music!" },
            organiser: [
              { label: "The band", prompt: "Draw the band in the park. Say: The band is in the park." },
              { label: "Ollie", prompt: "Draw Ollie with his instrument. Say what he is doing." },
              { label: "Rosie", prompt: "Draw Rosie with her instrument. Say what she is doing." },
            ],
            frames: ["The band is in the park.","Ollie is ___ing the ___.","Rosie is ___ing the ___."],
            checklist: ["Three or four sentences: the band, Ollie, Rosie","is before the -ing word: Ollie is striking","A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your band paragraph to your partner. Then tell it again without looking, like a news reporter.",
            teacherNote: "The children tell the 'Band in the park' picture in three parts, the same retelling they just did aloud in the fluency slide, now in writing. Mark only two things (capital letters, the be word before the -ing word) and let the child find the mistake from your dot. The paragraph can also be the first part of the recorded talk 'My band at home'. The earlier sentence-combining work with 'and' moves into the Stretch task.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["Ollie is ___ing the ___.","Rosie is ___ing the ___."] },
              { level: "Core", task: "Write three sentences: the band, Ollie, Rosie." },
              { level: "Stretch", task: "Add a fourth sentence with 'and' or 'not': 'We're clapping and singing.' or 'I'm not playing.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My band at home",
        prompt: "Make a band with things at home (a pot, a box, a spoon). Show the camera what you are doing and what a friend or toy is doing.",
        length: "30-60 seconds",
        steps: [
          "Find things to play: a pot, a box, a spoon, a bottle with rice.",
          "Practise your sentences three times: what you are doing and what a friend or toy is doing.",
          "Record it once. Play while you talk!",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what you are doing and what someone else is doing, and keep talking without long stops.",
        words: ["drum", "tambourine", "shaking", "striking", "clapping", "making music"],
        grammar: ["I'm ___ing the ___.", "He's / She's ___ing the ___.", "I'm not ___ing."],
        rubric: [
          { label: "Am / is / are + -ing", description: "Says 'I'm shaking it.' and 'She's striking it.' with the be word and -ing.", weight: 3 },
          { label: "Me and a friend", description: "Says what they are doing and what someone else is doing.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Not", description: "Adds a sentence with 'not': I'm not clapping.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I'm ___ing the ___.", "It's ___!"], tips: ["Do the action as you say it."] },
          { level: "Core", who: "Most children", frames: ["I'm ___ing the ___.", "My friend is ___ing the ___.", "We're making music!"], tips: ["Say what two people are doing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I'm not ___ing. I'm ___ing the ___.", "It's loud and fun!"], tips: ["Add a sentence with 'not' and a sound word."] },
        ],
      },
    },
  },
};
