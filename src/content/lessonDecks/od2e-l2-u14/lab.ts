import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 14 "Music and
// Feelings" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's phrases and its past-time grammar said
// again and again as whole sentences, a little faster each round, with Unit 13's phrases
// mixed back in) and one writing routine (say it, write it, read it back). Three lessons
// end with a recorded talk for home, built on the routine the class just did. Time comes
// from warm-ups, games and repeats, never from the book pages, the vocabulary or the
// grammar. All text is original.

const grownUp = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U14Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u14-l1": {
      objectives: ["I can say how music makes me feel in whole sentences, fast and smooth."],
      trim: { "Mystery sounds: how does it feel?": 5, "Music Says: freeze and do it": 4, "What's missing? Pass the bag": 5 },
      add: [
        {
          after: "Concerts and favorite instruments (SB 137, Think)",
          slide: {
            kind: "fluency",
            title: "Feeling sprint: music makes me ___",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole sentence about music and feelings, fast and smooth, with no stops.",
            chunks: [
              "My favorite instrument is the drum.",
              "It sounds loud and fast.",
              "Music makes me feel happy.",
              "I feel worried when I wait.",
              "Slow music makes me feel calm.",
            ],
            recycle: ["Fast music makes me ___.", "My favorite song is ___."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a face card or an instrument card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence: 'Music makes me feel happy.'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
            ],
            prompts: ["(card: a happy face)", "(card: a worried face)", "(card: a drum)", "(card: a calm face)", "(card: a loud trumpet)"],
            feedback:
              "Listen and do not stop the talk. For grammar, prompt the child to fix it instead of saying it for them: for 'Music make me feel happy' hold up one finger and say 'Music make...?' with a rising voice so they add the -s; for 'I worried' point to the frame 'I feel ___' (the child needs feel or am before the feeling word). For a sound, a quick recast is fine: say 'worried' clearly and let them echo it. Say every final -s and -d clearly yourself.",
            teacherNote: "Whole sentences only, never single words: 'Music makes me feel happy' is one smooth piece. Between rounds 1 and 2 the one-minute fix is what turns speed into accuracy too. Watch for a dropped -s in 'makes' and a missing 'feel' or 'am' before worried. Mix in Unit 13's 'Fast music makes me ___' cards every few turns.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["Music makes me feel ___.", "I feel ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I feel worried when I wait for my turn.'", frames: ["I feel ___ when ___."] },
            ],
          },
        },
        {
          after: "Draw it, say it: worried and calm",
          slide: {
            kind: "writing",
            title: "Grow my feeling sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: say when or why. Start with 'when' or 'because'.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I feel worried. (add: when I wait)", answer: "I feel worried when I wait." },
              { q: "Slow music makes me feel calm. (add: at night)", answer: "Slow music makes me feel calm at night." },
              { q: "I like the drum. (add: because it is loud)", answer: "I like the drum because it is loud." },
            ],
            frames: ["I feel ___ when ___.", "I like the ___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "makes: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence with when or because is easy for seven-year-olds and prepares the because-sentences of Lesson 2. Do the first item together on the board. A missing -s on 'makes' is the slip to watch for.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw a face for it." },
              { level: "Core", task: "Write one big sentence of your own with when or because." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u14-l2": {
      objectives: ["I can tell Olga's story in three parts, faster each time."],
      trim: { "Feelings freeze dance": 4, "Music pictures: hummingbirds, rain, snow": 3, "Draw what the music looks like": 4, "Hot seat: talk to the characters": 7 },
      add: [
        {
          after: "Story strips: put it in order",
          slide: {
            kind: "fluency",
            title: "Olga's Flute: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "At the start, Olga played her flute.",
              "She was worried and she cried.",
              "Mr. Perez played the recording.",
              "At the end, Olga was amazed.",
            ],
            recycle: ["Music makes me feel ___.", "Fast music makes me ___."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use your six story strips." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at your story strips. Hold up one finger for the start, two for the middle, three for the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(strip: Olga plays)", "(strip: Mr. Perez tells her)", "(strip: Olga is worried)", "(strip: Olga cries)", "(strip: the recording)", "(strip: Olga is amazed)"],
            feedback:
              "Children use 'played, cried, was' here as whole chunks; the rule comes in Lesson 3. For a missing -ed ('Olga play her flute') start the phrase and pause: 'Olga pla...?' and tap your ear so they listen for the /d/ at the end. For 'She worried' or 'Olga amazed' point to the frame 'She was ___' and hold up a finger for the missing 'was'. For a pronunciation slip ('cried' said as 'cry') a quick recast is fine: say 'cried' with a clear /d/ and let them echo it.",
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 makes the second telling more accurate, not just faster. Listen for the -ed endings and for 'was'. Keep the strips on the board for Support children and accept short tellings.",
            tiers: [
              { level: "Support", task: "Point to each strip and say one sentence for it.", frames: ["At the start, ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add how Olga felt and why, with your own idea.", frames: ["She was ___ because ___."] },
            ],
          },
        },
        {
          after: "Olga's feelings line",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: a girl and her flute",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder: when something already happened, the verb often ends in -ed: played, smiled, waited.",
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again. Write the key words: girl, flute, worried, smiled, waited, calm.",
              "With your partner, rebuild the text with your notes. Then compare it with the real text.",
            ],
            text: {
              title: "A girl and her flute",
              text: "A girl played her flute in the music room. She was worried, but her teacher smiled and waited. Then she played again. The music was soft and she felt calm.",
            },
            frames: ["A girl ___ her flute.", "She was ___, but ___.", "The music was ___ and she felt ___."],
            checklist: ["-ed at the end: played, smiled, waited", "A capital letter at the start and a full stop at the end of each sentence", "'but' joins two different ideas"],
            sayIt: "Read your text to your partner, then say it again without looking.",
            teacherNote: "Dictogloss works best after a short rule reminder, as here: the children listen for meaning first and then rebuild the form together. Read at normal speed, not slowly, and say every -ed clearly. Accept a text with different words if the meaning and the -ed endings are right.",
            tiers: [
              { level: "Support", task: "Rebuild the first two sentences with the frames and the key words on the board." },
              { level: "Core", task: "Rebuild the whole text with your partner." },
              { level: "Stretch", task: "Rebuild it, then write one more sentence: how did the girl feel at the end?" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Olga's Flute: my retelling",
        prompt: "Tell the story of Olga's Flute at home in three parts: the start, the middle and the end. Say how Olga felt in each part. Show a drawing if you have one.",
        length: "45-60 seconds",
        steps: [
          "Look at your story strips or your feelings line from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell the start, the middle and the end, say how Olga felt, and keep talking without long stops.",
        words: ["flute", "worried", "tears", "musician", "recorded", "calm", "amazed"],
        grammar: ["Olga played / was / cried (finished story)", "She was ___ because ___."],
        rubric: [
          { label: "Three parts", description: "Tells the start, the middle and the end of the story in order.", weight: 3 },
          { label: "Feelings", description: "Says how Olga felt, with feeling words from the unit: worried, calm, amazed.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Finished-story verbs", description: "Uses played, was or cried, and the -ed or was can be heard.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["At the start, Olga ___.", "In the middle, she was ___.", "At the end, she was ___."], tips: ["Point to your strips as you speak."] },
          { level: "Core", who: "Most children", frames: ["At the start, Olga played her flute.", "In the middle, she was worried and she ___.", "At the end, ___."], tips: ["Say what Olga did and how she felt in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["She was worried because ___.", "My favorite part is ___ because ___."], tips: ["Add why Olga felt that way, and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u14-l3": {
      objectives: ["I can ask and answer 'When did you ___?' and 'Did you ___?' fast, round the circle."],
      trim: { "Feelings charades": 4, "Time travel line": 8, "Sing along (SB 141 D)": 3 },
      add: [
        {
          after: "Yesterday and today (SB 141 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Did you ___ last night?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "I played the drum yesterday afternoon.",
              "Did you sing last night? Yes, I did.",
              "No, I didn't. I listened to music.",
              "When did you practice? I practiced this morning.",
              "We went to a concert last week.",
            ],
            recycle: ["I read in the morning.", "He listens to music at night."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a time card and an action card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your cards so only you can see them.",
              "Ask the friend on your left: 'Did you ___ last night?' or 'When did you ___?'",
              "They answer with the time word on their card: 'Yes, I did.' or 'No, I didn't.' or 'I played it yesterday.' Then they ask the next friend.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
            ],
            prompts: ["(time: yesterday morning)", "(time: last night)", "(time: last week)", "(action: play the drum)", "(action: sing a song)", "(action: go to a concert)"],
            feedback:
              "Prompt the child to fix the verb, do not say it for them. For 'When did he played?' say 'When did he...?' and pause with a finger up: after did the verb stays plain. For 'Yesterday I play' point to the time card and say 'Yesterday I pla...?' so they add -ed. For 'goed' or 'singed' point to the board where 'went' and 'sang' sit and let them choose. For 'Yes, I have' or 'Yes, I did sing' touch the frame 'Yes, I did.' For the sound of -ed, recast it once ('played', with a clear /d/) and let them echo it.",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Did you ...?' and 'When did you ...?' automatic. Vietnamese has no past endings, so the -ed is often dropped, and the rule 'after did, the verb stays plain' is easy to forget: show both on the board. Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board.", frames: ["Did you ___ last night?", "Yes, I did. / No, I didn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Ask and answer with 'When' and add a time: 'When did you practice?' 'I practiced yesterday afternoon.'" },
            ],
          },
        },
        {
          after: "Our day chart",
          slide: {
            kind: "writing",
            title: "Fix the diary sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: the verb, the time word or a short answer.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Yesterday I play the drum.", answer: "Yesterday I played the drum." },
              { q: "When did he played the piano?", answer: "When did he play the piano?" },
              { q: "Last week we goed to a concert.", answer: "Last week we went to a concert." },
              { q: "I listened to music yesterday night.", answer: "I listened to music last night." },
              { q: "Did you sing last night? Yes, I sing.", answer: "Did you sing last night? Yes, I did." },
            ],
            checklist: ["A finished time word + a verb that is finished (played)", "After did, the verb stays plain (did he play)", "Special verbs: go - went, sing - sang"],
            sayIt: "Say all the fixed sentences to your partner, fast.",
            teacherNote: "Focus on these error types only (the verb ending, the verb after did, the special verbs and the time phrase) and give a short reason for each. Fix the first sentence together. Vietnamese children often leave off the -ed (item 1) and over-use it after did (item 2); item 3 is a normal stage of learning the special verbs, so praise the child who sees it.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 3 and 4 with the board on the wall." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write one more diary sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u14-l4": {
      objectives: ["I can say what a musician did, with 'and' and 'but', the same way three times."],
      trim: {
        "Chant: A musician's day": 3,
        "Simon says: a musician's day": 3,
        "Phrase pair race": 3,
        "Feelings line-up and concerts in our town (SB 142, Think)": 3,
      },
      add: [
        {
          after: "I'm a musician! (SB 143 E)",
          slide: {
            kind: "fluency",
            title: "Musician's day: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say the same musician talk to three friends. Each time is smoother and faster.",
            chunks: [
              "I gave a concert and I signed autographs.",
              "I played the drum, but I made a mistake.",
              "I talked to fans and I was happy.",
              "I did an interview, but I was nervous.",
            ],
            recycle: ["Yesterday morning I played the piano.", "Last night I listened to slow music."],
            rounds: [
              { seconds: 60, say: "Talk 1: tell your musician talk to your first listener. The listener counts the things on their fingers." },
              { seconds: 45, say: "Talk 2: new listener. The same talk in less time." },
              { seconds: 30, say: "Talk 3: new listener. Fast and smooth! The listener says 'Great concert!' at the end." },
            ],
            steps: [
              "Choose three things a musician did. Say each with 'and' or 'but'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, move to a new partner and say the same talk again.",
              "The listener has a job: count the sentences, then ask one question: 'Were you nervous?'",
            ],
            feedback:
              "Prompt the child to fix it. For 'I give a concert' (no -ed) start 'I gav...?' and pause so they use the special verb; for 'I play the drum, but I make a mistake' say 'I played, but I...?' and point to the time word on the board. For 'I was happy' said as 'I happy', hold up a finger for the missing 'was'. For a mix-up of and and but, point to the two signs on the board (= for and, a cross for but) and let the child choose. For a sound, recast once and let them echo it.",
            teacherNote: "This is the same talk, less time, new listener: task repetition scaled for seven-year-olds. Do not add new language between rounds; the gain comes from saying the same thing more smoothly, and the one-minute fix makes the later telling more accurate. Listen for the -ed endings, the special verbs gave, made and did, and was.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I ___ and I ___.", "I ___, but I ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a feeling to each sentence: 'I gave a concert and I was proud.'" },
            ],
          },
        },
        {
          after: "Join the sentences (SB 143 F)",
          slide: {
            kind: "writing",
            title: "Combine it: and or but",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Decide: are the ideas alike (and) or different (but)?",
              "Make ONE sentence. Say it first, then write it.",
            ],
            items: [
              { q: "I play the drum. I sing. (and)", answer: "I play the drum and I sing." },
              { q: "I like the piano. I don't like the trumpet. (but)", answer: "I like the piano, but I don't like the trumpet." },
              { q: "The singer smiled. She waved to the fans. (and)", answer: "The singer smiled and waved to the fans." },
              { q: "I was nervous. I was happy. (but)", answer: "I was nervous, but I was happy." },
            ],
            checklist: ["'and' for ideas that are alike, 'but' for ideas that are different", "A comma before 'but'", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I'. A common error is 'but' for ideas that are alike; ask 'Is it the same idea or a different idea?'",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two of your own pairs of sentences and join them for your partner." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A musician's busy day",
        prompt: "Be a musician for a minute! Tell us what you did at your concert, with 'and' and 'but'. Say how you felt.",
        length: "45-60 seconds",
        steps: [
          "Choose three things a musician did: give a concert, sign an autograph, talk to fans, do an interview ...",
          "Say your musician talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Use 'and' once and 'but' once.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say three things a musician did with 'and' and 'but', say how you felt, and keep talking without long stops.",
        words: ["concert", "autograph", "interview", "fans", "mistake", "nervous", "happy"],
        grammar: ["I gave / signed / played ... (finished past)", "and / but", "I was ___."],
        rubric: [
          { label: "Three things", description: "Says three things the musician did, in whole sentences.", weight: 2 },
          { label: "And and but", description: "Joins ideas with 'and' for alike and 'but' for different, correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Finished verbs", description: "Uses gave, signed, played or made with the right ending, and 'I was ___'.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I gave a concert.", "I signed autographs.", "I was ___."], tips: ["Hold up a finger for each thing."] },
          { level: "Core", who: "Most children", frames: ["I gave a concert and I ___.", "I played the ___, but I made a mistake.", "I was ___."], tips: ["Use 'and' once and 'but' once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I gave a concert, but I was nervous.", "After the concert I talked to fans and I ___."], tips: ["Add what you did after the concert, and why you felt that way."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u14-l5": {
      objectives: ["I can talk about my music mobile for a long time without stopping."],
      trim: {
        "Chant: Music, music, show me": 4,
        "Pass the ball: yesterday and last night": 5,
        "Same and different gallery walk (SB 145 D)": 5,
        "Act it out: story theatre": 9,
      },
      add: [
        {
          after: "Make the mobile (SB 145 B)",
          slide: {
            kind: "fluency",
            title: "Mobile talk: three listeners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk about your music mobile to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My mobile has a drum and a flute.",
              "Music makes me feel calm.",
              "I like the drum, but I don't like the trumpet.",
              "Last night I listened to this music and I felt happy.",
            ],
            recycle: ["I gave a concert and I signed autographs.", "Fast music makes me ___."],
            rounds: [
              { seconds: 60, say: "Talk 1: tell your mobile talk to your first listener. The listener counts how many things you say about your mobile." },
              { seconds: 45, say: "Talk 2: new listener. The same talk in less time." },
              { seconds: 30, say: "Talk 3: new listener. Fast and smooth! The listener says 'Beautiful!' at the end." },
            ],
            steps: [
              "Hold your mobile. Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), let the class fix them, then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds. The listener asks one follow-up question: 'Why do you like it?'",
            ],
            feedback:
              "Prompt the child to fix grammar: for 'Music make me feel calm' hold up a finger and say 'Music make...?' with rising voice so they add the -s; for 'Last night I listen' start 'Last night I listen...?' and tap your ear for the -ed; for 'I like the drum but I no like the trumpet' point to the frame 'I don't ___'. For the pronunciation of 'listened' or 'calm' a quick recast is fine: say it right and let the child echo. Say your own final -s and -ed clearly.",
            teacherNote: "This is the 4/3/2 activity scaled for seven-year-olds: the same talk to three listeners in less time, a new partner each time. It builds fluency but not accuracy on its own, so the one-minute correction between round 1 and round 2 matters: children who then say the same talk again use the fixed form. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["My mobile has ___.", "Music makes me feel ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a 'but' sentence and a time: 'Last night I listened to slow music, but today I like fast music.'" },
            ],
          },
        },
        {
          after: "Tell the class about a picture (SB 145 C)",
          slide: {
            kind: "writing",
            title: "Model it, then write about my music",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the 'but'.",
              "Plan: what is your favorite music, how does it make you feel, and what did you do last night?",
              "Write three or four sentences with the frames. Read them to your partner.",
            ],
            text: {
              title: "My favorite music",
              text: "My favorite music is slow and soft. It makes me feel calm. I listened to it last night, and I felt sleepy. I don't like loud music, but my brother likes it.",
            },
            frames: ["My favorite music is ___.", "It makes me feel ___.", "Last night I ___ and I felt ___.", "I don't like ___, but ___."],
            checklist: ["makes, likes: the -s is there", "-ed for finished things (listened)", "A comma before 'but'", "A capital letter and a full stop"],
            sayIt: "Read your text to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is the routine: the children plan with the frames, write, then check against the list. Check no more than two or three error types in one go. The model uses 'likes' on purpose so the -s can be heard when you read it aloud.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your own music." },
              { level: "Core", task: "Write three sentences about your music with the frames." },
              { level: "Stretch", task: "Write four sentences, including one with 'but' and one with a time word." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u14-l6": {
      objectives: ["I can say what I did yesterday, last night and last week, fast and right."],
      trim: { "Remember it!": 5, "Time machine: now or before?": 8 },
      add: [
        {
          after: "Time machine: now or before?",
          slide: {
            kind: "fluency",
            title: "Past verb sprint: went, sang, had, made",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with the finished verb.",
            chunks: [
              "I went to a concert last week.",
              "She sang a song last night.",
              "We had lunch yesterday.",
              "He made a drum last Saturday.",
              "I listened to music this morning.",
            ],
            recycle: ["I gave a concert and I signed autographs.", "I like the drum, but I don't like the trumpet."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a verb card, the class says the whole sentence." },
              { seconds: 45, say: "Half the class says the sentence, the other half listens for mistakes and shows a thumb. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 2, stop for one minute. Put the two mistakes you heard most on the board (no names), let the class fix them, then go on.",
            ],
            feedback:
              "Prompt the child to fix it, do not say it for them. For 'I goed' or 'She singed' point to the verb card and say 'I w...?' so they find went; for 'I have lunch yesterday' point to the time word and start 'We h...?' to prompt had. For 'When did you played?' hold up a finger: after did the verb stays plain. For the -ed sounds a quick recast is fine: say 'listened' clearly and let them echo it.",
            teacherNote: "A quick, high-energy recall of the unit's finished verbs mixed with earlier phrases: spaced retrieval is what keeps last lesson's grammar from fading. The special verbs go - went, sing - sang, have - had and make - made are said whole, never as a list of single words. Listen for the -ed on listened and played.",
            tiers: [
              { level: "Support", task: "Say the sentence with the verb card in your hand.", frames: ["I ___ yesterday.", "She ___ last night."] },
              { level: "Core", task: "Say the sentence without the card." },
              { level: "Stretch", task: "Add a feeling: 'I went to a concert last week and I was happy.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my music yesterday",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: a music day",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Rule reminder: finished time words (yesterday, last night, last week) go with a finished verb: played, listened, went.",
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again. Write the key words: drum, slow song, calm, concert, solo.",
              "With your partner, rebuild the text. Then compare it with the real text.",
            ],
            text: {
              title: "A music day",
              text: "Yesterday morning my brother played the drum. Last night we listened to a slow song. It made me feel calm. Last week we went to a concert, and he gave a solo.",
            },
            frames: ["Yesterday morning ___ played ___.", "Last night we ___.", "Last week we went to ___."],
            checklist: ["A finished time word + a finished verb", "Special verbs: made, went, gave", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your text to your partner, then say it again without looking.",
            teacherNote: "Dictogloss after a short rule reminder gets the children to notice the finished verbs by listening for them. Read at natural speed and say the final -d of 'played' and 'listened' clearly. Accept a text that differs in words if the verbs are finished and the meaning is right.",
            tiers: [
              { level: "Support", task: "Rebuild the first two sentences with the frames and the key words." },
              { level: "Core", task: "Rebuild the whole text with your partner." },
              { level: "Stretch", task: "Rebuild it, then add one more sentence with a finished time word." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My music: yesterday and last week",
        prompt: "Tell us about your music. Say what you did yesterday, last night and last week, and how the music made you feel.",
        length: "45-60 seconds",
        steps: [
          "Think of three music things you did: played, listened, sang, went to a concert ...",
          "Say them three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Say a time word in every sentence: yesterday, last night, last week.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say what you did yesterday, last night and last week, and how it felt, and keep talking without long stops.",
        words: ["yesterday", "last night", "last week", "listened", "played", "went", "calm"],
        grammar: ["Yesterday / Last night / Last week + I + finished verb", "It made me feel ___."],
        rubric: [
          { label: "Time words", description: "Uses yesterday, last night or last week in each sentence.", weight: 2 },
          { label: "Finished verbs", description: "Uses played, listened, went or sang with the right ending, and does not say 'did played'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Feelings", description: "Says how the music made them feel: It made me feel ___.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Yesterday I ___.", "Last night I ___.", "It made me feel ___."], tips: ["Hold up a finger for each time word."] },
          { level: "Core", who: "Most children", frames: ["Yesterday morning I ___ and ___.", "Last night I listened to ___. It made me feel ___.", "Last week I ___."], tips: ["Use a different time word in every sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Last week I ___, but this morning I ___.", "My favorite part was ___ because ___."], tips: ["Join two times with 'but', and add why."] },
        ],
      },
    },
  },
};
