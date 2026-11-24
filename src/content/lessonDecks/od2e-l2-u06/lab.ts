import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 6 "Travel Long Ago
// and Now" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's grammar, -ed and "Did you ...?", said
// again and again as whole sentences, with Unit 5's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Lessons 2, 4 and 6 end with a recorded
// talk for home (Lesson 5 already has its own). Time comes from games and repeats, never
// from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, write them on the board and let the class fix them in one minute: children who then say it again use the fixed form. For grammar, prompt the child to fix it: point to the frame, start the phrase and pause ('Did you ...?'), hold up a finger for the missing -ed, or repeat the error with a rising voice ('Did you played?'). Do not say the right form for them. For a sound, just say it right and let them echo it. Say every final -ed and -s clearly yourself: Vietnamese speakers often leave off the -ed of 'visited' and 'traveled', so exaggerate it a little ('visit-ed', 'travel-d').";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U6Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u06-l1": {
      objectives: ["I can say where I go, how I go and why, fast, in whole sentences."],
      trim: { "Run and touch": 4, "Travel says: act the words": 5, "Old way, new way: the picture puzzle": 5, "Chant: Here we go!": 4 },
      add: [
        {
          after: "Trip game: where, how, why?",
          slide: {
            kind: "fluency",
            title: "Trip sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole trip sentence, fast and smooth, with no stops.",
            chunks: ["I visit my aunt in Hue.", "I go by train.", "I like it because it is fast.", "The bus is crowded.", "We arrive at seven o'clock."],
            recycle: ["I come to school by bike.", "Long ago, people wrote letters."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a trip card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many trip sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: train)", "(card: bus, crowded)", "(card: aunt in Hue)", "(card: clock, seven o'clock)", "(card: plane, fast)"],
            feedback: correct,
            teacherNote: "Whole sentences only: 'I go by train' should come out as one smooth piece. Say the final sounds clearly yourself ('visit', 'arrive', 'o'clock') and listen for 'I go to train' (by, not to) and 'It crowded' (the missing is). Mix in a Unit 5 card every few turns so old phrases stay quick.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I go by ___.", "I visit my ___ in ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I go by train because it is fast.'", frames: ["I go by ___ because it is ___."] },
            ],
          },
        },
        {
          after: "First, next, last: story strips",
          slide: {
            kind: "writing",
            title: "Grow my trip sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add where, when or why.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I visit my aunt. (add: in Hue)", answer: "I visit my aunt in Hue." },
              { q: "We arrive. (add: at seven o'clock)", answer: "We arrive at seven o'clock." },
              { q: "The bus is crowded. (add: today)", answer: "The bus is crowded today." },
              { q: "I go by train. (add: because it is fast)", answer: "I go by train because it is fast." },
            ],
            frames: ["I visit my ___ in ___.", "I go by ___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "The little word 'by' or 'in' is there"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence with where, when and why is a gentle way to grow children's writing: they keep a sentence they already know and add one piece. Model the first item on the board.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw the trip." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'First' and 'Next'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u06-l2": {
      objectives: ["I can retell the story of Grandpa and the ship, shorter and faster each time."],
      trim: { "Word chant and mime: Where am I?": 4, "Draw and order: the human timeline": 7, "Then and now: Carlo and Henry chart": 9, "Why? Think about it together": 6 },
      add: [
        {
          after: "Then and now: Carlo and Henry chart",
          slide: {
            kind: "fluency",
            title: "Grandpa's story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["Long ago, Carlo traveled by ship.", "The ship was crowded.", "Carlo asked a question.", "At the end, the ship arrived."],
            recycle: ["Long ago, people listened to the radio.", "Now, we send e-mails."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the four picture cards." },
              { seconds: 50, say: "New partner. Tell it again in less time." },
              { seconds: 45, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the four picture cards: ship, crowded, question, arrive.",
              "Tell the story. When the bell rings, find a new partner.",
              "The listener has a job: show one finger for each part you tell.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on with round 2.",
            ],
            prompts: ["(picture: Carlo on the ship)", "(picture: people on the ship)", "(picture: Carlo and a question)", "(picture: the ship arrives)"],
            feedback: correct,
            teacherNote: "Same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what lifts accuracy as well as speed, so do not skip it. Keep the picture cards on the board for Support children and listen for the -ed on 'traveled' and 'asked'.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["Long ago, ___ traveled by ___.", "The ship was ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add a feeling and a why: 'Carlo felt happy because the ship arrived.'" },
            ],
          },
        },
        {
          after: "Postcard from the ship",
          slide: {
            kind: "writing",
            title: "Write a postcard from my trip",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model postcard with the teacher. Find 'I see' and 'It is'.",
              "Plan: where are you, what do you see, how do you feel?",
              "Write your postcard with the frames. Read it aloud to your partner.",
            ],
            text: { title: "A postcard from the ship", text: "Hello! I am on a big ship. I see the sea and a lot of people. It is crowded, but I feel happy. Love from Mai." },
            frames: ["Hello! I am on a ___.", "I see ___.", "It is ___, but I feel ___.", "Love from ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end of each sentence", "I wrote 'I am happy', not 'I happy'", "I said it aloud and it sounds right"],
            sayIt: "Read your postcard to your partner, then say it again without looking.",
            teacherNote: "Plan, write, check is a routine young writers can learn: they plan with a partner, write from a model, then check against a short list. Vietnamese has no 'be' in sentences like 'She happy', so watch for 'I happy' and 'It crowded' and prompt with a finger for the missing word.",
            tiers: [
              { level: "Support", task: "Copy the model and change the place and the feeling." },
              { level: "Core", task: "Write your own three-sentence postcard with the frames." },
              { level: "Stretch", task: "Add a 'but' sentence and a question to Grandpa.", frames: ["Grandpa, ___?"] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Long ago and now: my travel talk",
        prompt: "Tell how people traveled long ago and how we travel now. Show a picture of a ship or a plane if you have one.",
        length: "45-90 seconds",
        steps: [
          "Look at your story cards or your postcard from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say how people traveled long ago and how we travel now, and keep talking without long stops.",
        words: ["ship", "crowded", "arrive", "visit", "travel"],
        grammar: ["Long ago, people traveled by ___.", "Now, we travel by ___.", "It is ___ because ___."],
        rubric: [
          { label: "Then and now", description: "Says what was true long ago and what is true now.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: ship, crowded, arrive, visit.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -ed of 'traveled' and the -s of 'people' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Long ago, people traveled by ___.", "Now, we travel by ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["Long ago, people traveled by ___. It was ___.", "Now, we travel by ___. It is ___."], tips: ["Say how it feels or looks in each part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think now is better because ___.", "My grandpa traveled by ___."], tips: ["Give a reason and tell about someone in your family."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u06-l3": {
      objectives: ["I can ask and answer 'Did you ...?' quickly and say what I did."],
      trim: { "Yesterday chant": 4, "Mime and ask: Did you ...?": 6, "Class survey: how did we travel?": 5, "Listen and sing: the song (SB 61 D)": 5 },
      add: [
        {
          after: "Where did they go? Practice (SB 61 E)",
          slide: {
            kind: "fluency",
            title: "Did-chain: what did you do?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Did you walk to school?", "Yes, I did. I walked to school.", "No, I didn't. I traveled by bus.", "Where did you play?", "I played in the park."],
            recycle: ["I listened to a story last night.", "I didn't watch TV."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds an action card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Did you ___?'",
              "They answer: 'Yes, I did.' or 'No, I didn't.' and say one more sentence. Then they turn and ask the next friend.",
              "The listener has a job: tick on your fingers when you hear 'did' and then the plain verb.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Did you ___?", "Where did you ___?", "(cards: walk, play, visit, arrive, ask)"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Did you ...?' automatic. The common slip is 'Did you visited?' (the -ed is already in 'did'). Prompt it with a raised finger and 'Did you visit...?' with a rising voice, and let the child repeat it. Time the whole circle and tell them: children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board.", frames: ["Did you ___?", "Yes, I did. / No, I didn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a where or how: 'No, I didn't. I traveled by bus.'" },
            ],
          },
        },
        {
          after: "How did you travel to school? (SB 61 F)",
          slide: {
            kind: "writing",
            title: "Fix the Did sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: is the verb after 'did' or 'didn't' plain? Is the -ed there for a finished action?",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Did you visited your aunt?", answer: "Did you visit your aunt?" },
              { q: "Yesterday I walk to school.", answer: "Yesterday I walked to school." },
              { q: "She didn't walked.", answer: "She didn't walk." },
              { q: "Yes, I did visited.", answer: "Yes, I did." },
              { q: "Where did they went?", answer: "Where did they go?" },
            ],
            checklist: ["After did or didn't, the verb is plain (no -ed)", "A finished action in a statement has -ed", "A question ends with a question mark"],
            sayIt: "Read your fixed sentences to the class, then say two of them without looking.",
            teacherNote: "Children often put the past marker twice ('Did you visited') or leave it off ('Yesterday I walk'). Fix one together first and say the rule in a few words: 'did takes the plain verb'. Correct only these two kinds of mistake today; do not teach irregular verbs (the last item is a bonus: praise it if a child sees it).",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 with the frame 'did + plain verb'." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write one more sentence with a Did mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u06-l4": {
      objectives: ["I can tell my partner about a trip with -ed verbs, then tell it again without stopping."],
      trim: { "Furniture freeze": 4, "Is it? Is it not? Home sort": 5, "My room, long ago and now": 6, "Match the clues (SB 62 D)": 5 },
      add: [
        {
          after: "Where did you travel? Practice (SB 63 E)",
          slide: {
            kind: "fluency",
            title: "Trip talk again: new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same trip to a new partner, smoother and with more detail each time.",
            chunks: ["Yesterday I visited my aunt.", "We traveled by bus.", "We arrived at seven o'clock.", "The bus arrived late.", "We entered the museum and asked a question."],
            recycle: ["Did you walk to school? Yes, I did.", "Long ago, people traveled by ship."],
            rounds: [
              { seconds: 60, say: "Plan for a minute with your partner: choose a trip, then say 2 or 3 sentences about it." },
              { seconds: 45, say: "Tell the trip to a NEW partner. Say it smoothly, with no stops." },
              { seconds: 45, say: "Tell it to a third partner. Add one new detail: when, where or why." },
            ],
            steps: [
              "Round 1: plan with a partner. Use the sentences on the board.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Round 2: new partner. Same trip, smoother.",
              "The listener has a job: show a thumb up for each -ed word you hear.",
              "Round 3: new partner. Add one new detail.",
            ],
            prompts: ["(card: visit)", "(card: travel)", "(card: arrive)", "(card: enter)", "(card: ask)"],
            feedback: correct,
            teacherNote: "Task repetition: the same task again with a new partner lets children spend less effort finding words and more on saying the -ed clearly. Listen for the -ed on 'visited', 'traveled', 'arrived', 'entered' and 'asked', and for a plain 'visit' after 'Yesterday'. The -ed is said three ways: -t (asked), -d (traveled) or -id (visited).",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and the pictures.", frames: ["Yesterday I ___ed ___.", "We ___ed by ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a because sentence: 'The bus arrived late because it was crowded.'" },
            ],
          },
        },
        {
          after: "Complete with -ed (SB 63 F)",
          slide: {
            kind: "writing",
            title: "Join my trip sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Read your sentence to your partner. Is the -ed there?",
            ],
            items: [
              { q: "I visited my aunt. I played with my cousin. (and)", answer: "I visited my aunt and played with my cousin." },
              { q: "We traveled by bus. It was cheap. (because)", answer: "We traveled by bus because it was cheap." },
              { q: "We arrived at noon. We entered the museum. (and then)", answer: "We arrived at noon and then entered the museum." },
              { q: "The bus arrived late. It was crowded. (because)", answer: "The bus arrived late because it was crowded." },
            ],
            checklist: ["Every finished action has -ed", "The joining word is there: and, because or and then", "A full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: they learn joining words through use, not rules. Model the first item aloud, crossing out the second 'I'. Check the -ed on every verb, especially when the second verb follows 'and' (children often drop it there).",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three sentences: 'We arrived, entered the museum and asked a question.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did yesterday",
        prompt: "Tell us about a trip or a place you went to. Say where you went, how you traveled and what you did.",
        length: "45-90 seconds",
        steps: [
          "Think of a trip: the park, a shop, your aunt's house.",
          "Say your trip talk three times: each time a little faster, like in class.",
          "Record it once. Use 'and' and 'because' to join your sentences.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell where you went and what you did with -ed verbs, and keep talking without long stops.",
        words: ["visit", "arrive", "enter", "ask", "crowded", "travel"],
        grammar: ["Yesterday I ___ed ___.", "We traveled by ___.", "I ___ed and ___ed."],
        rubric: [
          { label: "What happened", description: "Tells where they went, how they traveled and what they did.", weight: 3 },
          { label: "Past verbs", description: "Uses -ed for finished actions: visited, traveled, arrived.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 2 },
          { label: "Joining", description: "Joins ideas with and or because.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Yesterday I visited ___.", "We traveled by ___."], tips: ["Point to a picture of the place as you speak."] },
          { level: "Core", who: "Most children", frames: ["Yesterday I visited ___ and ___ed ___.", "We traveled by ___ and arrived at ___."], tips: ["Join two actions with 'and'."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ was crowded, so we ___ed ___.", "I liked it because ___."], tips: ["Say why, and say one thing that did not happen: 'We didn't ___.'"] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u06-l5": {
      objectives: ["I can tell three friends what I asked and learned in an interview, faster each time."],
      add: [
        {
          after: "Plan your interview questions (SB 65 B)",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: Grandma's school days",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again. Write key words only: verbs with -ed, people, places.",
              "With your group, build the text again. Check every -ed and every -s.",
              "Compare with the real text on the screen.",
            ],
            text: { title: "Grandma's school days", text: "Long ago, my grandma walked to school. She didn't travel by bus. She played with her friends and listened to the radio. Now, children travel by bus and watch videos." },
            frames: ["Long ago, ___ walked to ___.", "She / He didn't ___.", "Now, children ___."],
            checklist: ["Every finished action has -ed", "After didn't, the verb is plain", "Capital letters and full stops"],
            sayIt: "Read your group's text aloud, then say it again without looking.",
            teacherNote: "Read the text twice at natural speed, the second time with short pauses. A dictogloss works best after a short rule reminder: say it in a few words before you read ('long ago: -ed; didn't: plain verb'). The group talk while rebuilding is itself useful speaking practice, so let it be noisy. Say the final -ed and -s clearly.",
            tiers: [
              { level: "Support", task: "Write the verbs you hear and build one sentence with the frames." },
              { level: "Core", task: "Rebuild all of the text with your group." },
              { level: "Stretch", task: "Rebuild it, then change it to talk about your own grandpa or grandma." },
            ],
          },
        },
        {
          after: "Mock interview: ask an adult",
          slide: {
            kind: "fluency",
            title: "Interview report 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same interview report to three friends. Each telling is shorter and smoother.",
            chunks: ["I asked my grandma three questions.", "She walked to school.", "She didn't have a phone.", "She played outside and listened to the radio."],
            recycle: ["People listened to the radio long ago.", "People didn't travel by airplane."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your interview report. The listener counts the questions on their fingers." },
              { seconds: 50, say: "Partner 2: the same report in less time." },
              { seconds: 45, say: "Partner 3: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same report, less time, new listener: the 4/3/2 activity made small for seven-year-olds. The new partner keeps the repetition real. Accuracy rises because of the one-minute fix between rounds 1 and 2: fix the same two mistakes on the board and tell the children to listen for them. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I asked ___ ___ questions.", "She / He ___ed ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a then-and-now sentence: 'Long ago, she didn't have a phone. Now, she has a phone!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u06-l6": {
      objectives: ["I can say 'Long ago, people ___ed ___' and 'Did you ___?' fast, without looking."],
      trim: { "Remember it!": 4 },
      add: [
        {
          after: "Then and now: Ben and Mia",
          slide: {
            kind: "fluency",
            title: "Champion sprint: -ed and Did",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: ["Long ago, people traveled by ship.", "Yesterday I played in the park.", "Did you walk to school? Yes, I did.", "She didn't arrive on time.", "Where did they play? They played in the yard."],
            recycle: ["People listened to the radio long ago.", "We didn't watch TV in class."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 45, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute: put the two mistakes you heard most on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: long ago + ship)", "(card: yesterday + park)", "(card: Did you ...?)", "(card: didn't + arrive)"],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of Units 5 and 6 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. Listen for 'didn't arrived' and 'Did you played', and prompt with a finger and a rising voice rather than telling the child.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["Long ago, people ___ed ___.", "Did you ___?"] },
              { level: "Core", task: "Say it alone without looking." },
              { level: "Stretch", task: "Add a but sentence: 'Long ago, people traveled by ship, but now they travel by plane.'" },
            ],
          },
        },
        {
          after: "Write it: then and now",
          slide: {
            kind: "writing",
            title: "Champion editors: fix Pip's diary",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Pip wrote in his diary, but he made mistakes!",
              "Read each line with your partner. Find the mistake: -ed missing, or -ed after did?",
              "Write it the right way and read it to Pip (the teacher).",
            ],
            items: [
              { q: "Yesterday Pip walk to the market.", answer: "Yesterday Pip walked to the market." },
              { q: "He didn't arrived late.", answer: "He didn't arrive late." },
              { q: "Did he visited the clerk?", answer: "Did he visit the clerk?" },
              { q: "He ask a question yesterday.", answer: "He asked a question yesterday." },
              { q: "Long ago, people travel by ship.", answer: "Long ago, people traveled by ship." },
            ],
            checklist: ["A finished action in a statement has -ed", "After did or didn't, the verb is plain", "Capital letters and full stops"],
            sayIt: "Read all five fixed lines to your partner, fast.",
            teacherNote: "This is proof-reading, not new teaching: the children use a short checklist on sentences they can already say. Fix one together first. Use it after the children's own writing too: 'Check your own sentences in the same two ways.'",
            tiers: [
              { level: "Support", task: "Fix lines 1, 2 and 3 with the checklist." },
              { level: "Core", task: "Fix all five lines." },
              { level: "Stretch", task: "Write a new diary line with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Champion talk: long ago and yesterday",
        prompt: "Tell us what people did long ago and what you did yesterday. Then ask the viewer a question with Did.",
        length: "45-90 seconds",
        steps: [
          "Say one sentence about long ago and two sentences about yesterday.",
          "Practise three times, a little faster each time.",
          "Record it once. End with a question: 'Did you ...?'",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say what people did long ago and what you did yesterday with -ed, then ask a Did question.",
        words: ["travel", "visit", "arrive", "ask", "enter", "crowded"],
        grammar: ["Long ago, people ___ed ___.", "Yesterday I ___ed ___.", "Did you ___? / I didn't ___."],
        rubric: [
          { label: "Then and now", description: "Says what people did long ago and what they did yesterday.", weight: 2 },
          { label: "Past verbs", description: "Uses -ed for finished actions and a plain verb after did or didn't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Question", description: "Asks a Did question the right way.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Long ago, people ___ed ___.", "Yesterday I ___ed ___."], tips: ["Look at your champion notes."] },
          { level: "Core", who: "Most children", frames: ["Long ago, people ___ed ___, but yesterday I ___ed ___.", "Did you ___ yesterday?"], tips: ["Say two things you did yesterday."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I didn't ___ yesterday. I ___ed ___.", "Things are different now because ___."], tips: ["Say one thing you didn't do and give a reason."] },
        ],
      },
    },
  },
};
