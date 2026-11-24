import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 7 "Time and the
// Earth" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases and the future with will said
// again and again as whole sentences, with Unit 6's phrases mixed back in) and one writing
// routine (plan, write, check, then say it aloud). Lessons 3 and 5 end with a recorded
// talk for home that repeats the class routine days later (Lesson 4 already has its vlog).
// Time comes from games and repeats, never from the book pages or the grammar. All text
// is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('In two hours, it will ...'), point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice ('It will rains?'). Typical slips here: 'it will five o'clock' (be is missing), 'will rises' (no -s after will), 'it will don't', and a dropped final -s on minutes, hours and seconds. For a sound, just say it right and let the child echo it. Say every final -s and -t clearly yourself (minutes, hours, won't): children copy what they hear.";

export const odL3U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u07-l1": {
      objectives: ["I can say how long things take, fast and smooth, without stopping."],
      trim: { "Time tools table": 3, "Word and meaning pairs": 4, "Day and night with a flashlight": 5 },
      add: [
        {
          after: "How much time does it take? (SB 68 B)",
          slide: {
            kind: "fluency",
            title: "Time sprint: it takes me ...",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "It takes me five minutes to brush my teeth.",
              "It takes me one hour to do my homework.",
              "It takes about sixty seconds to run around the yard.",
              "That's true. It takes me an hour, too.",
              "I'm not so sure. It takes me ten minutes.",
            ],
            recycle: ["I was reading when the lights went out.", "What were you doing when the bell rang?"],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an action card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the action card. Say a WHOLE sentence: 'It takes me ___ to ...'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (a missing 'to', a dropped -s on minutes or hours) and let the class fix them, then go on.",
            ],
            prompts: ["(card: brush my teeth)", "(card: do my homework)", "(card: eat lunch)", "(card: walk to school)", "(card: read a book)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'It takes me ten minutes to walk to school' should come out as one smooth piece. Listen for the dropped final -s in 'minutes' and 'hours' and for the missing 'to'. Mix in Unit 6's 'was ... when' cards every few turns so those phrases stay quick. The times on the cards are the children's own, so the answers are never wrong; only the sentence is checked.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It takes me ___ to ...", "It takes about ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Agree or disagree with your partner: 'That's true. It takes me ___, too.' or 'I'm not so sure. It takes me ___.'", frames: ["That's true. It takes me ___, too.", "I'm not so sure. It takes me ___."] },
            ],
          },
        },
        {
          after: "Match the sentence to the word (SB 69 C)",
          slide: {
            kind: "writing",
            title: "Grow my time sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Think and plan: read the small sentence and ask 'Where? When? How long?'",
              "Write: make it bigger with the words in brackets, then add one more detail of your own.",
              "Check: look at your checklist. Read your sentence to a partner.",
            ],
            items: [
              { q: "It takes me ten minutes. (add: to walk to school)", answer: "It takes me ten minutes to walk to school." },
              { q: "I eat lunch. (add: at noon)", answer: "I eat lunch at noon." },
              { q: "The Earth spins. (add: every day)", answer: "The Earth spins every day." },
              { q: "It takes the Earth a year. (add: to orbit the sun)", answer: "It takes the Earth a year to orbit the sun." },
            ],
            frames: ["It takes me ___ to ...", "It takes the Earth ___ to ..."],
            checklist: ["A capital letter at the start and a full stop at the end", "Minutes, hours, seconds: the -s is there when there is more than one", "'It takes me ___ to + a verb'"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese has no plural ending, so 'ten minute' is a common slip with time words: model the final -s aloud when you read the answers. Do item 1 together first.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write the four big sentences." },
              { level: "Stretch", task: "Write two sentences of your own about how long things take, joined with 'and'.", frames: ["It takes me ___ to ..., and it takes me ___ to ..."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u07-l2": {
      objectives: ["I can explain how the Earth makes day and night, again and again, a little faster each time."],
      trim: { "Time zone quiz": 6, "Human time ladder": 4, "Multiplying time: a challenge": 5 },
      add: [
        {
          after: "Explain a diagram",
          slide: {
            kind: "fluency",
            title: "Day and night: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Explain the same diagram three times. Each time is shorter, smoother and faster.",
            chunks: [
              "The Earth spins once every day.",
              "When our side faces the sun, it is day.",
              "When our side turns away from the sun, it is night.",
              "The Earth orbits the sun once a year.",
              "This diagram shows that the Earth never stops moving.",
            ],
            recycle: ["The rain taps on the roof.", "The wind whispers in the trees."],
            rounds: [
              { seconds: 90, say: "Explain the diagram to your partner. Use the key-word cards: spin, day, night, orbit, year." },
              { seconds: 75, say: "New partner. Explain it again in less time." },
              { seconds: 60, say: "New partner. Explain it fast! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the diagram and the five key-word cards. Point as you speak.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'The Earth spin' or 'it is night' said as 'it night') and let the class fix them, then go on.",
              "When the bell rings, find a new partner. The listener has a job: count how many of the five key words you used, then tell you.",
              "In round 3, try to use all five key words.",
            ],
            prompts: ["spin", "day", "night", "orbit", "year"],
            feedback: correct,
            teacherNote: "This is the same explanation three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what turns the extra speed into more accurate speech. Listen for 'spins' (the -s after the Earth) and 'is' in 'it is day'. Keep the key-word cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to the diagram and say one sentence for each key word.", frames: ["The Earth spins ...", "It is day when ...", "It is night when ..."] },
              { level: "Core", task: "Explain all of it using the key words, without the frames." },
              { level: "Stretch", task: "Add a reason or an example: 'It is important because ...', or say what it is like in Tokyo at the same time.", frames: ["It is important because ...", "At the same time in Tokyo, ..."] },
            ],
          },
        },
        {
          after: "Read the diagram: close to the sun, far from the sun",
          slide: {
            kind: "writing",
            title: "Dictogloss: the spinning Earth",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Remind: day and night come from the Earth spinning. We say 'it takes one year to ...'.",
              "Listen to the text once. Do not write. Listen for the key words.",
              "Listen again and write key words. Then work in your group to rebuild the text as close to the original as you can.",
              "Check: compare with the real text. Underline what you missed.",
            ],
            text: {
              title: "The spinning Earth",
              text: "Every day, the Earth spins like a top. When our part of the Earth faces the sun, it is day. When our part turns away, it is night. The Earth also travels around the sun. It takes one year to go all the way round. So the Earth spins and travels at the same time.",
            },
            frames: ["Every day, the Earth ...", "When our part ..., it is ...", "It takes one year to ..."],
            checklist: ["Every sentence has a capital letter and a full stop", "'spins', 'faces', 'turns', 'travels': the -s is there after the Earth", "'it is day' and 'it is night': is is there"],
            sayIt: "Read your group's text aloud together, then say it again without looking at the page.",
            teacherNote: "Read at a natural speed, twice, without slowing down or stressing endings. After the first reading, children list key words; after the second, they rebuild. Marking: the meaning and the -s and 'is' endings matter more than every word being the same. Read the original aloud with clear final sounds.",
            tiers: [
              { level: "Support", task: "Work from the key words and the frames on the board.", frames: ["Every day, the Earth ...", "When our part ..., it is ..."] },
              { level: "Core", task: "Rebuild the text from the key words in your notes." },
              { level: "Stretch", task: "Rebuild the text, then add one sentence of your own about why we need clocks." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u07-l3": {
      objectives: ["I can say what will happen tomorrow, in one smooth talk, three times."],
      trim: { "Will and won't ping-pong": 4, "True or false time facts": 4 },
      add: [
        {
          after: "Now and later chart (SB 73 G)",
          slide: {
            kind: "fluency",
            title: "4-3-2: my plan for tomorrow",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Tell your plan for tomorrow to three partners. The same talk, a little shorter and smoother each time.",
            chunks: [
              "Tomorrow, I will get up at six o'clock.",
              "In one hour, it will be seven o'clock, so I will go to school.",
              "At noon, I will eat lunch with my friends.",
              "I won't play games until I finish my homework.",
              "Tomorrow night, I will go to bed at nine o'clock.",
            ],
            recycle: ["I was reading when the lights went out.", "It takes me ten minutes to walk to school."],
            rounds: [
              { seconds: 120, say: "Talk to partner 1 for two minutes about your plan for tomorrow. The listener only listens." },
              { seconds: 90, say: "New partner 2. Tell the same plan in one minute and a half." },
              { seconds: 60, say: "New partner 3. Tell it in one minute. Keep going, and use your best sentences." },
            ],
            steps: [
              "Plan: think of four things you will do tomorrow and the time for each. Draw four small clocks, not words.",
              "Talk: tell your plan. Use 'will' for later and 'won't' for no.",
              "Listen: the listener's job is to count how many times you said 'will' and tell you at the end.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'it will five o'clock' or 'I will goes') and let the class fix them. Then start round 2.",
            ],
            prompts: ["(small clock: six o'clock)", "(small clock: seven o'clock)", "(small clock: noon)", "(small clock: nine o'clock)"],
            feedback: correct,
            teacherNote: "The 4-3-2 works because the same ideas come out faster each round; it builds speed but not accuracy by itself. The one-minute fix between round 1 and round 2 is what makes the second telling more correct, not just quicker. Listen for 'will be' with a clock time and for the plain verb after will. Say 'won't' and 'minutes' with a clear final sound yourself.",
            tiers: [
              { level: "Support", task: "Use the four clocks and the frames. Say a short sentence for each clock.", frames: ["Tomorrow, I will ... at ___ o'clock.", "At noon, I will ..."] },
              { level: "Core", task: "Talk from the four clocks only, without reading." },
              { level: "Stretch", task: "Add 'so' and 'because' and a thing you won't do: 'It will be six, so ...', 'I won't ... because ...'", frames: ["In ___ hours, it will be ___, so I will ...", "I won't ... because ..."] },
            ],
          },
        },
        {
          after: "Complete the future facts (SB 73 F)",
          slide: {
            kind: "writing",
            title: "Join the sentences with so, because and when",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Think and plan: read the two short sentences. Which one is the reason? Which one is what happens next?",
              "Write: join them with the word in brackets. Check that the verb after 'will' is plain and that 'be' is there before a time.",
              "Check: read your new sentence aloud with your partner.",
            ],
            items: [
              { q: "It will be noon soon. We will eat lunch. (use so)", answer: "It will be noon soon, so we will eat lunch." },
              { q: "It will be dark at six. We won't play outside. (use so)", answer: "It will be dark at six, so we won't play outside." },
              { q: "We won't be late. The bus will come at seven. (use because)", answer: "We won't be late because the bus will come at seven." },
              { q: "It is noon in Hanoi. It will be two o'clock in Tokyo. (use when, start with 'When')", answer: "When it is noon in Hanoi, it will be two o'clock in Tokyo." },
            ],
            frames: ["___, so we will ...", "We won't ... because ...", "When it is ___ in Hanoi, it will be ___ in ..."],
            checklist: ["A comma before 'so'; no comma before 'because'", "After will: the plain verb, no -s ('will eat', not 'will eats')", "'will be' before a time on the clock"],
            sayIt: "Read your joined sentences aloud, then say each one again without looking.",
            teacherNote: "Combining makes children handle two clauses in one sentence, which is exactly what they need for longer talk. Keep two or three error types in view only: the plain verb after will, 'be' before a clock time, and the comma. Read each joined sentence aloud with clear final sounds.",
            tiers: [
              { level: "Support", task: "Join sentences 1 and 2 with 'so'. Use the frame." },
              { level: "Core", task: "Join all four sentences." },
              { level: "Stretch", task: "Write your plan for tomorrow as a short paragraph: a first sentence, three sentences joined with so, because or when, and a last sentence." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tomorrow, at ___ o'clock",
        prompt: "Tell a grown-up your plan for tomorrow, like in class. Say four things you will do, and the time for each. Say one thing you won't do.",
        length: "60-90 seconds",
        steps: [
          "Look at the four little clocks you drew in class. Say your plan out loud.",
          "Say it three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you will do tomorrow, with the time for each, and keep talking without long stops.",
        words: ["tomorrow", "noon", "hour", "minute", "will", "won't"],
        grammar: ["Tomorrow, I will ___ at ___ o'clock.", "In ___ hours, it will be ___.", "I won't ___ because ___."],
        rubric: [
          { label: "Four plans", description: "Says four things for tomorrow, each with a time.", weight: 2 },
          { label: "Will and won't", description: "Uses 'will' with the plain verb and 'it will be' before a time, and says at least one 'won't'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final sounds in 'minutes', 'hours' and 'won't' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Tomorrow, I will ___ at ___ o'clock.", "At noon, I will ___.", "I won't ___."], tips: ["Point to your four clocks as you speak."] },
          { level: "Core", who: "Most children", frames: ["Tomorrow, I will ___ at ___ o'clock, and then I will ___.", "In ___ hours, it will be ___, so I will ___.", "I won't ___ until ___."], tips: ["Say the time for every thing you will do."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["When I ___, my friend in Tokyo will ___.", "I won't ___ because ___."], tips: ["Add what it will be in another time zone, and a reason with 'because'."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u07-l4": {
      objectives: ["I can ask and answer about tomorrow's weather and time, round the circle, without stopping."],
      trim: { "Weather forecast show": 5, "Plan and practice your call": 5, "Word families with -tion (SB 75 D)": 4 },
      add: [
        {
          after: "Pick a city and talk about tomorrow (SB 75 C)",
          slide: {
            kind: "fluency",
            title: "Question chain: what will it be like tomorrow?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going all the way round with no stops!",
            chunks: [
              "What will the weather be like in Tokyo tomorrow?",
              "It will be sunny, and the high will be thirty degrees.",
              "Will it rain in Singapore tomorrow? No, it won't.",
              "What time will the sun rise tomorrow?",
              "It will rise at six in the morning, and it will set at six in the evening.",
            ],
            recycle: ["It takes me ten minutes to walk to school.", "The wind whispers in the tall trees."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a city card with a weather picture." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Hold your city card. Ask the child next to you: 'What will the weather be like in ___ tomorrow?'",
              "Answer with a whole sentence, then turn and ask the next friend a new question.",
              "The listener has a job: tick the card if the answer used 'will' and a weather word.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'It will rains' or 'It will sunny') and let the class fix them. Then go on.",
            ],
            prompts: ["(card: Tokyo, sunny)", "(card: Singapore, rainy)", "(card: Beijing, cloudy)", "(card: Dubai, hot)", "(card: Hanoi, windy)"],
            feedback: correct,
            teacherNote: "A chain gives every child a turn at both the question and the answer, and the whole class hears many models of the same sentences. Keep the question and the answer as whole sentences, not words. Listen for 'will be' before a weather word and for the plain verb after will. If a child stops, point to the frame and let them start again: the chain is more important than perfect words.",
            tiers: [
              { level: "Support", task: "Read the question frame and answer with the frame.", frames: ["What will the weather be like in ___ tomorrow?", "It will be ___."] },
              { level: "Core", task: "Ask and answer without reading, and add the high temperature." },
              { level: "Stretch", task: "Add a second sentence with 'but' or 'so': 'It won't rain, but it will be cloudy.'", frames: ["It won't ___, but it will be ___.", "It will be ___, so I will ..."] },
            ],
          },
        },
        {
          after: "Put in the where needed (SB 75 E)",
          slide: {
            kind: "writing",
            title: "Fix it: will, be and the",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: is 'the' missing or too many? Is 'be' missing after will? Is there an extra -s?",
              "Write the sentence the right way. Check, then read it aloud together.",
            ],
            items: [
              { q: "My aunt lives in United States.", answer: "My aunt lives in the United States." },
              { q: "We will fly to the Japan next year.", answer: "We will fly to Japan next year." },
              { q: "Sun will rise at six tomorrow.", answer: "The sun will rise at six tomorrow." },
              { q: "Our friends live in Philippines.", answer: "Our friends live in the Philippines." },
              { q: "Tomorrow it will to be cloudy in Turkey.", answer: "Tomorrow it will be cloudy in Turkey." },
            ],
            checklist: ["'the' with the sun, the moon, the Earth and names like the United States", "No 'the' with most countries (Vietnam, Japan, Turkey)", "After will: the plain verb, no 'to'"],
            sayIt: "Read your fixed sentences aloud, then say each one again without looking.",
            teacherNote: "Focus on two or three error types only: 'the' with country names, 'the sun', and 'will be'. Vietnamese has no articles, so 'the' is often dropped; children may also add 'the' to a name like Japan after learning the rule, so praise the child who notices it. Explain each correction in one sentence.",
            tiers: [
              { level: "Support", task: "Fix sentences 2, 3 and 5 (the board has the rule cards)." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with mistakes about countries for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u07-l5": {
      objectives: ["I can talk about the day camp and the time zones with 'will', again and again, without stopping."],
      trim: { "Clock hop": 6, "Grammar mystery: The Clock Keeper of Sun Hill": 6 },
      add: [
        {
          after: "The Moon Bay day camp: ask and fill in",
          slide: {
            kind: "fluency",
            title: "Day camp again: ask, answer, swap",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the day camp task again with a new partner, with the same sentences and fewer mistakes.",
            chunks: [
              "What will the campers do at nine o'clock?",
              "At nine o'clock, they will make a sundial.",
              "Will they swim at noon? No, they won't. They will eat lunch.",
              "When it is noon in Hanoi, it will be two o'clock in Tokyo.",
              "In three hours, it will be four o'clock, so they will go home.",
            ],
            recycle: ["It takes me ten minutes to walk to school.", "The Earth spins once every day."],
            rounds: [
              { seconds: 60, say: "Planning minute: look at the day camp plan, choose five questions and practice the answers quietly." },
              { seconds: 75, say: "Task with partner 1: ask and answer about the camp plan." },
              { seconds: 60, say: "After the one-minute fix: same task with partner 2, smoother and faster. Use different times!" },
            ],
            steps: [
              "Plan: in the planning minute, say your questions and answers in a whisper.",
              "Do the task: ask 'What will the campers do at ___ o'clock?' and answer with a whole sentence.",
              "Teacher: after the first task, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then swap partners and do the task again.",
              "The listener has a job: ask one follow-up question ('Why not?' or 'What time will it be in Tokyo?').",
            ],
            prompts: ["(camp plan: nine o'clock)", "(camp plan: noon)", "(camp plan: three o'clock)", "(time zone card: Tokyo, +2)"],
            feedback: correct,
            teacherNote: "Task repeat works because the second time the children already know what to say, so they can spend attention on how they say it. The planning minute makes the first telling better; the one-minute fix makes the second more accurate. Listen for the plain verb after will, 'will be' before a time, and the answer shape 'No, they won't. They will ...'.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and read the questions.", frames: ["What will the campers do at ___ o'clock?", "They will ___."] },
              { level: "Core", task: "Ask and answer without reading." },
              { level: "Stretch", task: "Add a time zone sentence and a reason: 'When it is ___ in Hanoi, it will be ___ in Tokyo, so ...'", frames: ["When it is ___ in Hanoi, it will be ___ in ...", "They will ___ because ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Read a model, then write: a day in two cities",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model. Notice: it has a first sentence about tomorrow, a time in each city, and a last sentence with a plan.",
              "Plan: draw two small clocks, one for Hanoi and one for Tokyo, and write the times.",
              "Write a short paragraph: a first sentence, three or four middle sentences, and a last sentence. Use the frames, then check with the checklist.",
            ],
            text: {
              title: "A day in two cities",
              text: "Tomorrow, I will wake up at six o'clock in Hanoi. In one hour, it will be seven o'clock, so I will eat breakfast. At that time in Tokyo, it will be nine o'clock. My friend will be at school! I won't call her then, because she will be busy. I will call her at noon. Then it will be two o'clock in Tokyo, and she will eat lunch.",
            },
            frames: ["Tomorrow, I will ___ at ___ o'clock in Hanoi.", "At that time in ___, it will be ___.", "I won't ___ because ___.", "I will ___ at ___.", "So tomorrow will be a ___ day!"],
            checklist: ["A first sentence that says what the paragraph is about, and a last sentence that ends it", "'will be' before a clock time", "The plain verb after will and won't", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your sentences aloud to a partner, then tell them again without looking.",
            teacherNote: "Reading a short model first, then writing a text like it, helps children see how a paragraph is built. Read the model aloud together once, then let the children underline the 'will' phrases. It is the lead-in to the longer message later in the lesson, so keep it to one short paragraph.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them with your two clocks." },
              { level: "Core", task: "Write the paragraph in your own words with the frames: five or six sentences." },
              { level: "Stretch", task: "Write seven sentences and add 'so' and 'because'.", frames: ["It will be ___, so ...", "I won't ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "When it is noon in Hanoi",
        prompt: "Tell a grown-up what time it will be in two other cities when it is noon in Hanoi, and what people there will do. Explain why the time is different.",
        length: "60-90 seconds",
        steps: [
          "Look at your time zone card from class: Tokyo is two hours ahead, Dubai is three hours behind.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what time it will be in two cities when it is noon in Hanoi, with a reason, and keep going without long stops.",
        words: ["noon", "time zone", "spin", "orbit", "hour", "will"],
        grammar: ["When it is ___ in Hanoi, it will be ___ in ___.", "They will ___ because ___.", "It won't be ___ ."],
        rubric: [
          { label: "Two cities", description: "Gives the time for two cities, correct for the time zone card.", weight: 2 },
          { label: "Will and be", description: "Uses 'it will be' before a time and the plain verb after will, and says one 'won't'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "A reason", description: "Gives a reason with 'because' or 'so', for example that the Earth spins.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["When it is noon in Hanoi, it will be ___ in Tokyo.", "In Dubai, it will be ___.", "They will ___."], tips: ["Look at your time zone card as you speak."] },
          { level: "Core", who: "Most children", frames: ["When it is noon in Hanoi, it will be ___ in Tokyo, so they will ___.", "In Dubai, it will be ___, so people will ___."], tips: ["Say what people will do in each city."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The time is different because the Earth ___.", "It won't be ___ in ___ because ___."], tips: ["Explain why the time is different, and use 'won't' with a reason."] },
        ],
      },
    },
  },
};
