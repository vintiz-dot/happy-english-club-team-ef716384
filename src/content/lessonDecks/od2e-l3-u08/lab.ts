import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 8 "Travel and Time
// Zones" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases and the going to plan said
// again and again as whole sentences, with Unit 7's will phrases mixed back in) and one
// short writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a
// recorded talk for home that repeats the class routine. Time comes from games and
// warm-ups, never from the book pages, the grammar or the checks. All text is original.

const goingTo =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, stop for one minute: write them on the board and let the class fix them; children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('I am ...?'), point to the frame on the board, hold up a finger for the missing word, or repeat the error with a rising voice ('She is going to buys?'). Typical slips: 'I going to fly' (missing am), 'She is going to buys' (verb after to must stay plain), 'Yes, I going' (the short answer is 'Yes, I am.'). For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

export const odL3U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u08-l1": {
      objectives: ["I can say doctor and patient sentences fast, without stopping.", "I can write a long, clear sentence about a health problem."],
      trim: { "Ache charades": 3, "Airport or doctor? Four corners": 4, "What is a problem? Is / Is not sort": 6, "Dictionary duo": 3 },
      add: [
        {
          after: "Doctor, doctor! Role-play",
          slide: {
            kind: "fluency",
            title: "Doctor sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole doctor and patient sentence, fast and smooth, with no stops.",
            chunks: [
              "What's the matter? I have a headache.",
              "I have a fever and an earache.",
              "Where does it hurt? It hurts here.",
              "You should take some medicine and rest.",
              "Thank you, doctor. I'll go home and sleep.",
            ],
            recycle: ["In two hours, it will be six o'clock.", "It won't be dark at noon."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture (a sick patient), the class says the whole sentence." },
              { seconds: 90, say: "Pairs: Doctor and Patient. The Doctor shows a picture, the Patient answers with a whole sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say before the bell?" },
            ],
            steps: [
              "Look at the picture card. Say the whole sentence, not one word.",
              "Say it again at the clap, a little faster.",
              "Listener's job: count the sentences on your fingers and tick the ones with no long stop.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them with the class, then go on to round 2.",
            ],
            prompts: ["(card: headache)", "(card: fever)", "(card: earache)", "(card: sneezing)", "(card: sick, in bed)"],
            feedback:
              "Listen for 'I have a headache' (not 'I headache'), the a / an before the word (a fever, an earache), and 'should take' with a plain verb. Prompt it: point to the frame and say 'I ... ?' and wait; hold up a finger for the missing 'a'. A pronunciation slip, such as the final -s in 'headaches' or the th in 'thank you', gets a quick recast: say it right once and the child echoes. Say the endings clearly yourself.",
            teacherNote:
              "The chunks are whole sentences, so the child practices saying 'You should take some medicine' as one smooth piece. The three rounds are the same sentences with less time, so the second and third are easier and faster. Mix in last unit's will phrases every few turns so they stay quick.",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, looking at the frame.", frames: ["I have a ___.", "You should take some ___."] },
              { level: "Core", task: "Say each whole sentence alone, without looking." },
              { level: "Stretch", task: "Add a reason: 'I have a fever, so I should rest.'", frames: ["I have a ___, so I should ___."] },
            ],
          },
        },
        {
          after: "Helping at home (SB 77 F)",
          slide: {
            kind: "writing",
            title: "Grow the doctor sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Think: what do I want to add? Who, when, how bad, or why?",
              "Read the short sentence. Write it bigger with the words in the brackets.",
              "Check your sentence with the checklist. Then say it to your partner.",
            ],
            items: [
              { q: "I have a fever. (add: bad, today)", answer: "I have a bad fever today." },
              { q: "The doctor gives me medicine. (add: kind, some)", answer: "The kind doctor gives me some medicine." },
              { q: "My sister has an earache. (add: little, after the flight)", answer: "My little sister has an earache after the flight." },
              { q: "The passenger shows a passport. (add: tired, at the airport)", answer: "The tired passenger shows a passport at the airport." },
            ],
            frames: ["The ___ doctor gives me ___.", "I have a ___ headache because ___."],
            checklist: ["A capital letter and a full stop", "a or an before the word (an earache)", "The -s on words like has and gives"],
            sayIt: "Read your long sentence to your partner, then say it again without looking.",
            teacherNote:
              "Expanding a bare sentence trains children to add detail before they write. Vietnamese learners often leave out a / an and the -s on has, so make these two items of the checklist the focus.",
            tiers: [
              { level: "Support", task: "Expand items 1 and 2 with the teacher and copy the big sentence." },
              { level: "Core", task: "Expand all four sentences." },
              { level: "Stretch", task: "Write one more bare sentence and expand it three times, adding a new detail each time." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u08-l2": {
      objectives: ["I can retell Molly's story three times, faster each time.", "I can plan and write a short paragraph that explains why a message is better than a call."],
      trim: { "Gist check": 3, "Pass the passport": 3, "Who looks after the home?": 3, "Text-message detectives": 6, "The story in fives": 11, "Look first, then predict": 7 },
      add: [
        {
          after: "The story in fives",
          slide: {
            kind: "fluency",
            title: "Molly's story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times (about 60, 50 and 40 seconds each). Each time is shorter, smoother and faster.",
            chunks: [
              "Molly's mother is going to travel, and she is worried.",
              "Molly's father is sick, so Molly has a problem.",
              "It's day here, but it's night there, so Molly sends a message.",
              "Molly sends a text, and that is a good solution.",
            ],
            recycle: ["It's noon here, so it's two o'clock there.", "I'll call you tomorrow."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the story with the four key-word cards: mother, father, time, solution. Then Partner B tells it. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A, then Partner B: tell it fast and smooth! The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four key-word cards in order. In each round, Partner A tells the story in their own words, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When both partners have told the story, find a new partner.",
              "Listener's job: ask one follow-up question at the end, for example 'Why was she worried?'",
            ],
            prompts: ["(card: mother)", "(card: father)", "(card: time)", "(card: solution)"],
            feedback: goingTo,
            teacherNote:
              "The same story three times with a shrinking time limit is the evidence-based way to get fluency: the second and third tellings are faster because children are no longer searching for ideas. The one-minute fix between round 1 and round 2 is what adds accuracy, so do not skip it. Listen for 'is going to travel' (not 'is going to travels'), 'is sick', and the -s on messages.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["Molly's mother is ___.", "Molly's father is ___.", "It's ___ there, so ___."] },
              { level: "Core", task: "Tell all four parts in your own words, without the frames." },
              { level: "Stretch", task: "Add why Molly's idea works and what you would do.", frames: ["I think ___ because ___.", "I would ___ too."] },
            ],
          },
        },
        {
          after: "Problem and solution map",
          slide: {
            kind: "writing",
            title: "Why send a message? Plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Use your own friend or cousin and a city far away.",
              "Write: turn your notes into one paragraph. Use so and because to join the reasons.",
              "Check: tick the checklist. Swap with a partner: they underline one is / are + going to and tell you one thing they understood.",
              "Teacher: while they write, look only at is / are before going to and a plain verb after it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: Why Kim sends a message",
              text: "Time zones can make a call hard. Kim lives in Hanoi, and her aunt lives in Tokyo. Tokyo is two hours ahead, so it is already late there when it is evening here. Kim is going to send a message, because her aunt is going to sleep. In the morning, her aunt is going to read it and call back. That is why a message is often better than a call.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is hard about talking to someone in a different time zone?" },
              { label: "Who and where", prompt: "Who lives far away? Which city? How many hours ahead or behind?" },
              { label: "Reasons: so, because", prompt: "What is the time there? What is the person going to do? (going to)" },
              { label: "Closing: That is why ...", prompt: "What is better, a message or a call? Say why." },
            ],
            frames: ["___ lives in ___, and I live in ___.","___ is ___ hours ahead, so it is ___ there.","I am going to ___, because ___.","That is why ___."],
            checklist: [
              "A topic sentence at the start and a closing sentence at the end",
              "am / is / are before going to",
              "A plain verb after going to (send, sleep, read)",
              "Capital letters for names and cities"
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. An explanation paragraph states a point, gives reasons with so and because, and closes with the point again. Mark only two targets (is / are before going to, and a plain verb after it) with a dot on the line; the child finds and fixes the mistake. Tokyo is two hours ahead of Hanoi, so check that children's times are possible. This paragraph replaces the dictogloss, so the story work earlier in the lesson carries the listening.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["___ lives in ___, and I live in ___.","That is why ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with a time in two cities: 'When it is noon here, it is two o'clock there.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tell Molly's story again",
        prompt: "Tell Molly's story at home to a grown-up or a toy. Use four parts: her mother, her father, the time difference and the solution. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Look at your four key-word cards from class (mother, father, time, solution).",
          "Tell the story three times: each time a little faster and smoother, like in class.",
          "Think about what you want to say in each part before you press record.",
          "Record it once. Look at the camera and keep talking, without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the four parts of Molly's story in your own words and keep talking without long stops.",
        words: ["doctor", "sick", "fever", "passport", "airport", "problem", "solution"],
        grammar: ["is / are + going to + plain verb", "It's ___ here, so it's ___ there.", "because / so"],
        rubric: [
          { label: "Four parts", description: "Tells the mother, the father, the time difference and the solution in order.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Going to", description: "Uses is / are + going to + plain verb correctly at least twice.", weight: 2 },
          { label: "Linking words", description: "Joins ideas with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Molly's mother is ___.", "Molly's father is ___.", "It's ___ there, so ___."], tips: ["Point to your key-word cards as you speak.", "Say each sentence slowly and clearly."] },
          { level: "Core", who: "Most children", frames: ["Molly's mother is going to ___, and she is worried.", "Molly's father is ___, so ___.", "Molly sends a text because ___."], tips: ["Use because or so at least twice.", "Look at the camera, not at your cards."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think Molly is smart because ___.", "I would do the same because ___.", "What would you do?"], tips: ["No cards: tell it naturally.", "Add your opinion and a question for the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u08-l3": {
      objectives: ["I can ask and answer 'What are you going to do?' quickly, without looking.", "I can join two ideas with because or so in a sentence."],
      trim: { "Mime my plan": 3, "Guess my plan": 3, "Our big idea": 4, "How have you helped? (SB 80 Think)": 4 },
      add: [
        {
          after: "Guess my plan",
          slide: {
            kind: "fluency",
            title: "Plan chain: What are you going to do?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What are you going to do on Saturday?",
              "I'm going to visit my cousin.",
              "Are you going to travel by train? Yes, I am. / No, I'm not.",
              "Where is she going to stay?",
              "We aren't going to take a taxi; we're going to take the bus.",
            ],
            recycle: ["In one hour, it will be noon.", "Will it be night in Tokyo? No, it won't."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a plan card: a place and a way to travel." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your plan card so only you can see it.",
              "Ask the friend on your left: 'What are you going to do on Saturday?' Your friend answers with a whole sentence.",
              "Then your friend turns and asks the next question to the friend on their left.",
              "Listener's job: ask one yes / no question to the friend, such as 'Are you going to travel by train?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: Tokyo, plane)", "(card: grandma's house, bus)", "(card: the beach, car)", "(card: the airport, taxi)", "What are you going to ___?", "Where are you going to ___?"],
            feedback: goingTo,
            teacherNote:
              "A chain makes every child ask AND answer many times in a few minutes, which is what makes 'am / is / are + going to' automatic. Time the whole circle and tell the class, so they try to beat their own time. Listen especially for the missing 'am / are' ('I going to ...') and the short answer ('Yes, I am', not 'Yes, I going'). Prompt it with a finger and 'Yes, I a...?'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frame on the board.", frames: ["What are you going to ___?", "I'm going to ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason or a second plan: 'I'm going to take the bus because it's cheap. Then I'm going to visit my cousin.'" },
            ],
          },
        },
        {
          after: "My plans chart (SB 81 G)",
          slide: {
            kind: "writing",
            title: "My plans for Saturday: plan, write, check",
            routine: "paragraph",
            genre: "plan",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the plans and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Use your own plans for next Saturday.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use First, Then and At the end.",
              "Check: tick the checklist. Swap with a partner: they underline one going to phrase and one because or so, and tell you one plan they liked.",
              "Teacher: while they write, look only at am / is / are before going to and a plain verb after it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: A busy Saturday",
              text: "Next Saturday is going to be a great day. First, my family is going to drive to Hai Phong, because I want to see my grandmother. Then my sister and I are going to play cards in the car, and my dad is going to listen to music. In the afternoon, we're going to cook dinner together. At the end of the day, I'm going to be tired, but I'm going to be very happy!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which day? What do you think it is going to be like?" },
              { label: "First, ...", prompt: "What are you going to do first? Why? (because)" },
              { label: "Then, ...", prompt: "What are you going to do next? Who is going with you?" },
              { label: "Closing: At the end, ...", prompt: "How are you going to feel at the end of the day?" },
            ],
            frames: ["Next ___ is going to be ___.","First, I'm going to ___ because ___.","Then ___ is going to ___.","At the end of the day, I'm going to ___."],
            checklist: [
              "A topic sentence that names the day",
              "am / is / are before going to",
              "A plain verb after going to (drive, play, cook)",
              "First, and At the end of the day, with a comma after them"
            ],
            sayIt: "Read your paragraph to your partner. Then tell your plans again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It joins the sentence work from earlier (because and so) into a whole text. Mark only two targets (am / is / are before going to, and a plain verb after it) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Next ___ is going to be ___.","First, I'm going to ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a plan that changes: 'We aren't going to take the bus, so we're going to walk.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u08-l4": {
      objectives: ["I can tell my trip plan three times, faster each time.", "I can find and fix mistakes with capital letters and contractions."],
      trim: { "Contraction chain": 4, "Announcements everywhere (SB 82 Think)": 4 },
      add: [
        {
          after: "Say your trip first",
          slide: {
            kind: "fluency",
            title: "Trip talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same trip talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "Next summer I'm going to visit Tokyo.",
              "I'll travel by plane, and it'll take about five hours.",
              "I'm going to see a museum when I get there.",
              "When it's noon here, it's two o'clock there.",
              "You're going to love it!",
            ],
            recycle: ["It won't be dark at noon.", "Will it be afternoon in Tokyo?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the whole trip talk, then Partner B gives theirs. The listener counts the plans on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B: fast and smooth! The listener asks one follow-up question." },
            ],
            steps: [
              "Choose a real or an imaginary city. Plan four sentences: where, how, how long, what to do.",
              "Stand in two lines facing each other. In each round, line A talks first, then line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When both partners have talked, line B moves one step to the left: a new partner each round. Next lesson, line B talks first.",
            ],
            feedback: goingTo,
            teacherNote:
              "This is the 4/3/2 activity (Nation) in a short form: the same talk, less time, new listener. The new partner keeps the repetition meaningful. Fluency improves without new language, but accuracy improves only with the one-minute fix between rounds, so keep it. Listen for the contractions I'm / it'll / you're: say them clearly so children can copy them.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Next summer I'm going to ___.", "I'll go by ___.", "It'll take ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a problem and a solution: 'It's night there, so I'll send a message.'" },
            ],
          },
        },
        {
          after: "Capital letters for places",
          slide: {
            kind: "writing",
            title: "Fix the postcard",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find the mistake: a capital letter, a contraction or a plain verb.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "i live in hanoi, vietnam.", answer: "I live in Hanoi, Vietnam." },
              { q: "Im going to fly to tokyo on friday.", answer: "I'm going to fly to Tokyo on Friday." },
              { q: "Your going to love the airport in singapore.", answer: "You're going to love the airport in Singapore." },
              { q: "Shell meet us at the airport.", answer: "She'll meet us at the airport." },
              { q: "They going to take the train.", answer: "They are going to take the train." },
            ],
            checklist: ["Capital letters for cities, countries, days and I", "The apostrophe in I'm, you're and she'll", "am / is / are before going to"],
            sayIt: "Read your fixed postcard sentences to the class in a happy travel voice.",
            teacherNote:
              "Written correction works best on two or three error types at a time, so this page asks for only three: capital letters, apostrophes and the be verb. Fix item 1 together first and say why. The your / you're and their / they're mix-up is common and good to point out aloud.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 4 with the checklist." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How do I get there?",
        prompt: "Pick a place in your town: a park, a shop or a school. Tell a friend how to get there, where it is, and what you are going to do there. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Choose your place. Draw a very small map with two or three things on the way.",
          "Say your directions three times: each time a little faster, like in class.",
          "Record it once. Point to your map as you talk.",
          "Look at the camera and keep going, without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Say where the place is, how to get there and what you're going to do there, without long stops.",
        words: ["next to", "across from", "near", "far", "airport", "bus", "train"],
        grammar: ["Excuse me, where's the ___?", "It's next to / across from the ___.", "I'm going to ___ when I get there."],
        rubric: [
          { label: "Clear directions", description: "Says where the place is using next to, across from, near or far.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Going to and contractions", description: "Uses I'm going to and contractions such as it's, you're and I'll correctly.", weight: 2 },
          { label: "Clear endings", description: "The ending sounds (-s, -ed) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is next to the ___.", "It's near / far.", "I'm going to ___."], tips: ["Point to your map.", "Say each place name slowly."] },
          { level: "Core", who: "Most children", frames: ["Excuse me, where's the ___? It's across from the ___.", "You'll go by ___ and it'll take ___.", "I'm going to ___ when I get there."], tips: ["Use two directions words.", "Say how long it takes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["First go ___, then ___.", "I'm going to ___ because ___.", "Are you going to come with me?"], tips: ["No map: talk naturally.", "End with a question for the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u08-l5": {
      objectives: ["I can sell a trip in a short ad and say it again with a new partner.", "I can write a short travel ad with a plan, a check and a say-it step."],
      trim: { "Sixty-second recall": 3, "Test our big ideas": 3, "Ad showtime": 9 },
      add: [
        {
          after: "Ad showtime",
          slide: {
            kind: "fluency",
            title: "Ad showtime: say it again, better",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Give your travel ad again with a new group. Say it more smoothly and with more feeling.",
            chunks: [
              "Come with us to Tokyo!",
              "We're going to fly there in five hours.",
              "It's two o'clock there when it's noon here.",
              "You'll see big buildings and eat great food.",
              "Would you like to join us?",
            ],
            recycle: ["It's noon here, so it's two o'clock there.", "She is going to take the bus."],
            rounds: [
              { seconds: 75, say: "Plan one minute. Round 1: Group A gives the ad, then Group B gives theirs. Then change groups." },
              { seconds: 60, say: "Round 2: new group. Same ad, say it again, smoother and with more voice and without looking at your notes. Group A gives the ad, then Group B. Then change groups." },
            ],
            steps: [
              "Use your ad from the project. Choose the best four sentences.",
              "Give your ad to a new group, then listen to theirs. The listeners each have a job: one counts the 'going to' sentences, one tells you one good thing.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 2, say your ad again to the next group, then listen to theirs. Try to look up, not down.",
            ],
            feedback: goingTo,
            teacherNote:
              "Task repetition (Bygate): the second telling of the same task is freer and more accurate because the child already has the language. Give the planning minute before round 1 only. The listener jobs keep the audience active, which matters in a talk to a group. Listen for 'We are going to fly' and for 'when it's noon here, it's two o'clock there' (the present, not will).",
            tiers: [
              { level: "Support", task: "Give your ad with the frames on the card.", frames: ["Come with us to ___!", "We're going to ___.", "Would you like to join us?"] },
              { level: "Core", task: "Give your ad with only a few key words." },
              { level: "Stretch", task: "Give your ad, then answer one question from the group about the trip." },
            ],
          },
        },
        {
          after: "Make the travel ad (SB 85 Project)",
          slide: {
            kind: "writing",
            title: "Write my ad: model, then plan, write, check",
            routine: "paragraph",
            genre: "advertisement",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the invitation at the start, the plans and the closing question.",
              "Plan: fill the four boxes with a few words each, not whole sentences: the place, how you go, the time there and what you'll do.",
              "Write: turn your notes into one ad paragraph with the frames. Make the reader want to come!",
              "Check: tick the checklist. Swap with a partner: they underline one going to phrase and tell you one thing that made them want to come.",
              "Teacher: while they write, look only at am / is / are before going to and capital letters for places. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: Come to Tokyo!",
              text: "Come with us to Tokyo! We are going to fly there next summer, and the flight is going to take about five hours. When it is noon in Hanoi, it is two o'clock in Tokyo. We are going to visit a big museum and eat noodles. You are going to love the food and the tall buildings! Would you like to join us?",
            },
            organiser: [
              { label: "Invitation", prompt: "Which place? Who do you want to come?" },
              { label: "How and when", prompt: "How are you going to travel? When? How long is it going to take?" },
              { label: "Time there", prompt: "When it is ___ here, what time is it there?" },
              { label: "Plans and question", prompt: "What are you going to do? End with a question to the reader." },
            ],
            frames: ["Come with us to ___!","We are going to ___ next ___.","When it is ___ here, it is ___ there.","Would you like to join us?"],
            checklist: [
              "Capital letters for places and days",
              "am / is / are before going to",
              "A question mark and an exclamation mark in the right places",
              "The time difference is possible for the place"
            ],
            sayIt: "Read your ad to your partner, then say it without looking at the page.",
            teacherNote: "Plan, write, check (strategy instruction) is one of the best-evidenced ways to improve young writers: the organiser is the plan, the checklist is the check. The model is original and not from the book. The paragraph is the script for the ad showtime later in the lesson. Children may use a different place; check that the time difference is possible for it. Mark only two targets (am / is / are before going to, and capital letters for places) with a dot in the margin.",
            tiers: [
              { level: "Support", task: "Fill the organiser, then write the first and last sentence with the frames.", frames: ["Come with us to ___!","Would you like to join us?"] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a problem and a solution, and one 'because' sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u08-l6": {
      objectives: ["I can say am, is and are with going to fast and right.", "I can join plans with because and so and say them out loud."],
      trim: { "Gates game: am, is or are?": 6, "Remember it!": 5 },
      add: [
        {
          after: "Gates game: am, is or are?",
          slide: {
            kind: "fluency",
            title: "Champion sprint: going to",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every going to sentence fast and right: with I, he, she, we and they.",
            chunks: [
              "I am going to wake up at six tomorrow.",
              "She is going to take the train.",
              "They are going to stay at home.",
              "We aren't going to fly; we're going to drive.",
              "Are you going to leave at seven? Yes, I am.",
            ],
            recycle: ["In two hours, it will be six o'clock.", "I'm going to take a taxi because I'm late."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a picture and a name; the class says the whole sentence." },
              { seconds: 75, say: "Pairs: one shows the card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! One sentence for each card. How many can you say?" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then do round 2.",
            ],
            prompts: ["(card: I, six o'clock)", "(card: she, train)", "(card: they, home)", "(card: we, drive)", "(card: you?, seven)"],
            feedback: goingTo,
            teacherNote:
              "This is a high-energy recall of the unit's one grammar rule in many persons: am / is / are + going to + plain verb. Mixing the old will phrases in every few turns spaces the retrieval, so last unit's grammar does not fade. Listen for the missing be verb and the extra -s on the verb after going to.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["I am going to ___.", "She is going to ___."] },
              { level: "Core", task: "Say the whole sentence without looking at the board." },
              { level: "Stretch", task: "Add 'because' and a reason to every sentence." },
            ],
          },
        },
        {
          after: "Write it: my trip plan",
          slide: {
            kind: "writing",
            title: "Join my trip plan",
            routine: "sentence combining",
            mode: "solo",
            minutes: 6,
            steps: [
              "Look at your trip plan. Find two short sentences that can be joined.",
              "Join them with because, so or and. Say it first, then write it.",
              "Check with the checklist and say your best sentence to your partner.",
            ],
            items: [
              { q: "I'm going to take a jacket. It will be cold. (because)", answer: "I'm going to take a jacket because it will be cold." },
              { q: "We're going to take the bus. It's cheap. (because)", answer: "We're going to take the bus because it's cheap." },
              { q: "He's going to go to the airport. He's going to meet his aunt. (and)", answer: "He's going to go to the airport and he's going to meet his aunt." },
              { q: "It's night there. I'll send a message. (so)", answer: "It's night there, so I'll send a message." },
            ],
            frames: ["I'm going to ___ because ___.", "___, so I'm going to ___."],
            checklist: ["A comma before so", "am / is / are before going to", "A plain verb after going to (take, not takes)"],
            sayIt: "Read your best joined sentence to your partner, then say it without looking.",
            teacherNote:
              "Item 3 joins two going to clauses with and: both are correct as written, and it shows that the be verb repeats. Children may combine in other correct ways: accept any joined sentence that is correct and clear. Model item 1 aloud before they start.",
            tiers: [
              { level: "Support", task: "Join items 1 and 2 with the teacher, using because." },
              { level: "Core", task: "Join all four pairs." },
              { level: "Stretch", task: "Join three sentences from your trip plan into one paragraph of five sentences." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My plan for next weekend",
        prompt: "Tell us your plan for next weekend. Say where you are going to go, who is going to come, how you are going to get there and why. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Plan four sentences on paper: where, who, how and why.",
          "Say your plan three times: each time a little faster and smoother, like in class.",
          "Record it once. Look at the camera, not at the paper.",
          "Keep going, even if you make a small mistake. Do not stop to start again.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your weekend plan with going to, say why with because or so, and keep talking without long stops.",
        words: ["airport", "passenger", "passport", "destination", "doctor", "medicine"],
        grammar: ["am / is / are + going to + plain verb", "because / so", "First, next, then"],
        rubric: [
          { label: "Going to plan", description: "Says at least three plans with am / is / are + going to + a plain verb.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or joins ideas with so.", weight: 2 },
          { label: "Clear sounds", description: "The ending sounds and the contractions (I'm, we're, she's) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["On Saturday, I'm going to ___.", "I'm going to go by ___.", "I'm going to ___."], tips: ["Look at your paper if you need to.", "Say each sentence slowly and clearly."] },
          { level: "Core", who: "Most children", frames: ["First I'm going to ___, next I'm going to ___, then I'm going to ___.", "I'm going to ___ because ___.", "We're going to go by ___, so ___."], tips: ["Use because at least once.", "Look at the camera."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["If it rains, I'll ___ instead.", "My family isn't going to ___ because ___.", "What are you going to do?"], tips: ["No paper: talk naturally.", "Add a second plan and a question for the viewer."] },
        ],
      },
    },
  },
};
