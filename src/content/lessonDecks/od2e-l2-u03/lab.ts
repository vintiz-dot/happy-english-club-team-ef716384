import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 3 "Solids, Liquids
// and Gases" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so the
// Lab raises the language, the topics and the length of the talk, never the book pages.
// Lessons 1-2 automatise the cause-and-effect sentences of the reading (present simple,
// third person -s: "the ice melts"); Lessons 3-5 automatise was / were / wasn't / weren't
// in "then and now" sentences. Every lesson gets a grammar drill (say it, ask it, say no,
// join it, change the time or the person, then real talk), one more fluency routine and
// one writing routine; Lessons 2 and 5 end with a recorded talk for home that repeats the
// class routine days later (Lesson 4 already has its own vlog). Time comes from games and
// repeats, never from the book pages, the grammar or the homework. All text is original.

const correctNow =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on; students who say it again use the fixed form. For grammar, prompt the student to fix it: start the phrase and pause ('When it is hot, the ice mel...?'), point to the frame, or hold up a finger for the missing -s. Do not say it for them. The mistakes to listen for: 'The ice melt' (final -s on melts, freezes, flows), 'Does the ice melts?' and 'It doesn't melts' (no -s after does / doesn't), and 'When hot, the ice melts' (missing 'it is'). For a sound (the -s of 'melts', the /z/ of 'freezes'), just say it right and let the student echo it. Say every final -s clearly yourself: students copy what they hear.";

const correctWas =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on; students who say it again use the fixed form. For grammar, prompt the student to fix it: start the phrase and pause ('The ice cubes w...?'), point to the one-thing / more-than-one frame, or raise your voice on the error ('The ice cubes WAS?'). Do not say it for them. The mistakes to listen for: 'The ice were hard' and 'They was cold' (was / were), 'You was late' (you takes were), 'The ice hard' (missing was), 'Now it was water' (now needs is), and 'It not was' for 'It wasn't'. For a sound (the final -s of 'cubes', the /nt/ of 'wasn't'), just say it right and let the student echo it. Say every ending clearly yourself: students copy what they hear.";

export const odL2U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u03-l1": {
      objectives: ["I can explain what happens to ice and why, with 'when', 'because' and 'although', without stopping."],
      trim: { "The mystery bag": 5 },
      drop: ["Chant and freeze, melt, heat"],
      add: [
        {
          after: "Cause and effect (SB 29 Think and C)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person. Then talk about your own life.",
            chunks: [
              "When the temperature rises, the ice melts, and the water starts to flow.",
              "Does the ice melt when it is cold? No, it doesn't. It stays solid.",
              "The water doesn't freeze in my kitchen because the room is warm.",
              "Ice melts fast in summer, so I always put extra ice in my drink.",
              "Although the freezer is cold, a bag of ice melts if the door stays open.",
              "Does a kettle make steam when it boils? Yes, it does.",
            ],
            recycle: ["I usually take the bus to school, although it is slow.", "My friends sometimes play football after class."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and holds up a sign. ? = ask it, X = say no, + = join with because, although, so or when, T = change the time (in summer, in winter, every day), P = change the person (I, we, ice cubes). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it and says the whole new sentence. Swap at the clap." },
              { seconds: 90, say: "Real talk: ask your partner about their own life: drinks, food, the weather in your city, how they keep cool or warm. Answer with the full short answer and one more sentence with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with does, X = say no with doesn't, + = join with a second idea, T = change the time, P = change the person.",
              "Say the WHOLE new sentence, with the -s where it belongs (melts, freezes, flows, but 'does it melt?' and 'it doesn't melt').",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Does the ice melts?') and fix them together; then go on.",
              "In round 3 the drill becomes real: ask about what your partner really does, and remember one answer to tell the class.",
            ],
            prompts: ["The ice melts in the sun. (?)", "Water freezes at night. (X)", "A puddle dries in the sun. (+ because)", "The kettle makes steam. (T: every morning)", "Snow melts in spring. (P: ice cubes)"],
            feedback: "Prompt, do not tell: for 'Does the ice melts?' hold up one finger and say 'Does the ice mel...?'; for 'The ice melt' tap your wrist and wait; for 'It doesn't melts' say it again with a rising voice and let the student fix it. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students talk about their own drinks, food and weather, so the form is used for meaning. Grades 6-7 can take the whole set at speed: questions, short answers, negatives, joined ideas and a change of time and person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Does the ___ ___? Yes, it does. / No, it doesn't.", "The ___ doesn't ___ because ___."] },
              { level: "Core", task: "Change every sentence, with all five signs, without looking at the board." },
              { level: "Stretch", task: "Join two signs in one go: 'Does ice melt when it is cold? No, it doesn't, although it starts to melt if you hold it.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "How ice changes: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three details with their examples and the closing sentence.",
              "Plan: fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every -s on melts, freezes and flows and tells you one thing that was clear.",
              "Teacher: look only at the -s and at 'when it is ..., the ... melts'. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Ice and heat",
              text: "Ice changes a lot when the temperature changes. First, ice is a solid, so it is hard and keeps its shape. When the weather is hot, for example in my city in July, the ice melts quickly, and then it becomes a liquid. A liquid flows, so a glass of iced tea soon looks like plain water. However, when the water is very cold, it freezes again, because the freezer takes the heat away. In conclusion, ice and water are the same thing in two different states.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What do you want to explain? Say it in one sentence: what happens to ice, and why." },
              { label: "Detail 1: the solid", prompt: "What is ice like? Give one example you know." },
              { label: "Detail 2: heat", prompt: "What happens when it is hot? What does it become? Give an example from your city." },
              { label: "Detail 3: cold", prompt: "What happens when it is very cold? Say why." },
              { label: "Closing: In conclusion, ...", prompt: "What is the big idea? Finish with one sentence." },
            ],
            frames: ["___ changes a lot when ___.", "First, ___ is a ___, so ___.", "When it is ___, for example ___, the ___ ___s, and then ___.", "However, when ___, it ___s again, because ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences: a topic sentence, three details and a closing sentence",
              "Linking words: first, also, however, because, for example, in conclusion",
              "'When it is ..., the ... melts / freezes': the -s on every verb for one thing",
              "Each sentence starts with a capital letter and ends with a full stop",
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, in one minute.",
            teacherNote: "A full paragraph of six to eight sentences, planned in five boxes with notes and examples, with the cause-and-effect pattern of the unit. It uses the words and sentences the students met in the lesson, so the words are ready. Mark only two things (the final -s and the 'when it is ...' clause) and let the student find the mistake from your dot. Keep the model on the board while they write.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, then add one example.", frames: ["___ is a solid, so ___.", "When it is hot, the ice ___, and then ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Add a contrast and a reason: 'Although ice looks different from water, it is the same material, because only the temperature changes.'" },
            ],
          },
        },
        {
          after: "Cause and effect ping-pong",
          slide: {
            kind: "fluency",
            title: "Hot and cold sprint: what happens?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole cause-and-effect sentence, fast and smooth, with no stops, and add a reason or an example.",
            chunks: [
              "When it is hot in my city, the ice in my drink melts quickly.",
              "When the temperature drops below zero, water freezes and becomes ice.",
              "I heat the water, so it makes steam and the window gets wet.",
              "Water flows, but ice stays hard because it is a solid.",
            ],
            recycle: ["My brother sometimes plays games after school.", "I never drink hot tea in summer."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a picture card (ice in a drink, a puddle at night, a kettle, a freezer), the class says the whole sentence with a reason." },
              { seconds: 90, say: "Pairs: one shows a card, the other says the sentence and an example from their own life. Swap when you hear the clap." },
              { seconds: 90, say: "New partner. Longer! Say two linked sentences about each card, with because or although." },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence about it, with 'When it is ...'.",
              "Add a reason or an example: 'because the sun is strong', 'for example in July'.",
              "Listen for the clap: it means change.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: ice cube in a hot drink)", "(card: puddle on a cold night)", "(card: kettle)", "(card: a river in winter)"],
            feedback: correctNow,
            teacherNote: "Whole sentences only, never single words: 'When it is hot, the ice melts' must become one smooth piece, and at this age it grows a reason or an example every round. The cause-and-effect pattern is the engine of the whole unit, so it is worth saying fifty times today. Mix in a 'sometimes / never' sentence from Unit 2 every few turns so last unit's frequency words stay fast. Listen for the final -s of melts, freezes and flows.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a partner.", frames: ["When it is ___, the ___ ___s.", "It ___s because ___."] },
              { level: "Core", task: "Say the sentence alone, with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a contrast: 'When it is hot, the ice melts, although the glass stays cold for a while.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u03-l2": {
      objectives: ["I can explain the journey of water three times, with reasons and examples, faster each time."],
      drop: ["What's missing? Words from last time", "Cause calls, effect moves"],
      trim: { "Mystery state": 5 },
      add: [
        {
          after: "Hot, cold and what happens (SB 31)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person. Then ask about real things.",
            chunks: [
              "When the sun heats a lake, some of the water turns into a gas.",
              "Does steam turn back into water when it touches a cold window? Yes, it does.",
              "Ice doesn't flow, but water does, because a liquid has no fixed shape.",
              "A gas fills the whole room, so we can smell soup from the kitchen.",
              "When I leave a glass of water in the freezer, it freezes in a few hours.",
              "Although a puddle disappears in the sun, the water doesn't vanish.",
            ],
            recycle: ["First, I do my homework. Then I relax.", "My cousin rarely wakes up early, although he has school."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and holds up a sign. ? = ask it, X = say no, + = join with because, although, so or when, T = change the time (in winter, at night), P = change the person (I, we, ice cubes). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it and says the whole new sentence. Swap at the clap. Change the person too: it, they, we, I." },
              { seconds: 90, say: "Real talk: ask your partner about real things: how they keep a drink cold, what they do when it is very hot, what happens to wet clothes on a sunny day. Answer with the full short answer and one more sentence with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with does or do, X = say no with doesn't or don't, + = join with a second idea, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Watch the -s: 'A gas fills', 'gases fill', 'does it fill?'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Does it turns?') and fix them together; then go on.",
              "In round 3 the drill becomes real: ask about what your partner really does, and remember one answer to tell the class.",
            ],
            prompts: ["Ice melts in a warm room. (?)", "Steam is a liquid. (X, then say what it is)", "Water freezes in the freezer. (+ because)", "A river flows to the sea. (T: in winter)", "A gas fills the room. (P: gases)"],
            feedback: correctNow,
            teacherNote: "The drill moves the same cause-and-effect pattern through questions, negatives, joined ideas, other times and other persons, which is what makes it automatic. Round 3 turns it into real talk about the students' own drinks, clothes and weather. Grades 6-7 should finish the whole cycle at speed. In a lesson without a grammar slide, the unit's key structure is what we drill.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Does ___ ___? Yes, it does. / No, it doesn't.", "___ doesn't ___, but ___ does."] },
              { level: "Core", task: "Change every sentence with all five signs, without looking at the board." },
              { level: "Stretch", task: "Join two signs in one go: 'Does a gas have a fixed shape? No, it doesn't, so it fills any room.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "The journey of water: plan, write, check",
            routine: "paragraph",
            genre: "process explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three stages and the closing sentence.",
              "Plan: fill the five boxes with a few words each. Say each stage to your partner in one sentence.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, then, next, however, because and in conclusion.",
              "Check: tick the checklist. Your partner points to every joining word.",
              "Teacher: look only at the joining words and the final -s. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: One ice cube, three states",
              text: "My ice cube has an interesting journey in a hot kitchen. First, it is a solid, so it is hard and cold in the pot. Then the stove heats the pot, and the ice melts into a liquid. Next, the water flows around the pot, and it gets hotter and hotter. Also, when the water boils, it turns into steam, which is a gas. However, the steam does not stay in the pot, because it rises into the air and cools. In conclusion, one ice cube can be a solid, a liquid and a gas in only a few minutes.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Whose journey is it (an ice cube, a drop of rain)? Where does it start?" },
              { label: "Stage 1: First, ...", prompt: "What is it like at the start? Which state is it?" },
              { label: "Stage 2: Then / Next, ...", prompt: "What makes it change? What does it become?" },
              { label: "Stage 3: Also / However, ...", prompt: "What happens at the end of the journey? Say why." },
              { label: "Closing: In conclusion, ...", prompt: "What is the big idea? Finish with one sentence." },
            ],
            frames: ["My ___ has an interesting journey in ___.", "First, it is a ___, so ___.", "Then ___ heats it, and it ___s.", "However, ___ does not stay ___, because ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences: a topic sentence, three stages and a closing sentence",
              "Linking words: first, then, next, also, however, because, in conclusion",
              "The -s on melts, flows, turns and rises (one thing)",
              "'When' with the present simple: 'when the water boils, it turns into steam'",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Plan, write, check: students turn the journey of water into a paragraph of six to eight sentences. It is also the script for the recorded talk, so say so: they read it first, then explain it. The five boxes are the plan, so no other notes are needed. Mark only two things (the joining words and the final -s) and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each, then add one sentence of your own.", frames: ["First, it is a ___, so ___.", "Then the stove heats the pot, and the ice ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, one for each box and one example." },
              { level: "Stretch", task: "Add a contrast and a reason: 'Although the water looks the same, it is hotter, because the stove keeps heating it.'" },
            ],
          },
        },
        {
          after: "Our class chart: solid, liquid, gas",
          slide: {
            kind: "fluency",
            title: "The journey of water: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Explain the journey of water three times. Each time is smoother and faster, with a reason and an example.",
            chunks: [
              "First, the ice is a solid, so it is hard and cold.",
              "Then the sun is hot, and the ice melts, which is why the water flows.",
              "Next, the water is a liquid, and it flows across the table.",
              "At the end, the water goes up as steam, because the heat turns it into a gas.",
            ],
            recycle: ["First, ___. Then ___.", "Birds hardly ever walk far."],
            rounds: [
              { seconds: 80, say: "Explain the whole journey to your partner. Use the four picture cards in order and add a reason to each step." },
              { seconds: 70, say: "New partner. Explain it again in less time, and add one example from real life." },
              { seconds: 60, say: "New partner. Explain it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Point to each picture as you explain: ice, melting, water, steam.",
              "The listener has a job: count the states on your fingers (there are three) and ask one question at the end: 'Why does it change?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
            ],
            prompts: ["(picture: ice cube)", "(picture: ice melting in the sun)", "(picture: water on a table)", "(picture: steam above a pot)"],
            feedback: correctNow,
            teacherNote: "The same journey three times on purpose: the second and third tellings free the students to speak faster because they are not searching for words, and they can add a reason or an example. Telling it again does not make it more accurate by itself; the one-minute fix between round 1 and round 2 is what does that. Keep the four pictures on the board for the Support group. Both partners explain in every round, so the listener always becomes the speaker.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, the ___ is a ___.", "Then ___."] },
              { level: "Core", task: "Explain all four parts, with a reason, without the frames." },
              { level: "Stretch", task: "Add the cause and a contrast each time: 'The ice melts because it is hot, although the pot is still cold.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How water changes: my explanation",
        prompt: "Explain what happens to an ice cube in a hot kitchen, step by step. Say what changes and why, and give one example from your own life: a drink, a freezer, a hot day in your city.",
        length: "90-120 seconds",
        steps: [
          "Write four keywords, not sentences: solid, liquid, gas and one example from your life.",
          "Practice twice, out loud. Each time, say it faster and smoother, with fewer stops.",
          "Record it once. Look at the camera and speak clearly.",
          "Watch it back. Did you give a reason with 'because' and at least one example? If not, record it again.",
        ],
        maxSeconds: 180,
        kidSummary: "Explain what the ice does, step by step, with 'when it is hot' and 'because', and give an example.",
        words: ["ice", "solid", "liquid", "gas", "melt", "freeze", "steam", "flow"],
        grammar: ["When it is hot, the ice melts.", "First, then, next, however, in conclusion", "Final -s: melts, freezes, flows"],
        rubric: [
          { label: "Steps in order", description: "Explains at least three steps with First, Then, Next or At the end.", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons with 'because' or 'so' and one example from real life.", weight: 3 },
          { label: "Cause and effect", description: "Says what makes it change: 'When it is hot, the ice melts.'", weight: 3 },
          { label: "Keeps going", description: "Talks for at least 90 seconds without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Clear endings", description: "The -s at the end of melts, freezes and flows can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["First, the ice is a ___.", "When it is hot, it melts, because ___.", "For example, ___."], tips: ["Look at your four keywords as you speak."] },
          { level: "Core", who: "Most students", frames: ["First, ___. Then, when it is ___, the ice ___.", "At the end, the water ___, because ___.", "For example, in my city ___."], tips: ["Use 'when it is hot' in one sentence and 'because' in two."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although the ice looks different from water, ___.", "If I put it in the freezer, the water ___, so ___."], tips: ["Add a contrast with although and say what happens when it is cold, too."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u03-l3": {
      objectives: ["I can say what things were and what they are now, with because and although, fast."],
      drop: ["Chant: then and now", "Then-and-now game"],
      add: [
        {
          after: "What was it? What is it now? (SB 33 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right with was and were: ask it, say no, join two ideas, change the time or the person. Then talk about your own day.",
            chunks: [
              "The ice was hard this morning, but now it is water because the room is warm.",
              "Was the soup hot? No, it wasn't. It was warm, so I ate it.",
              "The puddles weren't deep, but they were cold, and my shoes were wet.",
              "We were at home at eight o'clock, and now we are in English class.",
              "Were you at the park last weekend? Yes, I was, and my friends were there too.",
              "Although the weather was bad, the match wasn't cancelled.",
            ],
            recycle: ["I usually walk to school, although it is far.", "When it is hot, the ice melts."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and holds up a sign. ? = ask it (Was it ...? Were they ...?), X = say no (wasn't, weren't), + = join with because, although, so or when, T = change the time (last night, last summer, now), P = change the person (I, you, we, the noodles). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it and says the whole new sentence. Swap at the clap. Change the person too: I, you, he, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about yesterday and last weekend. Where were you at six o'clock? Was it a good day? Why? Were your friends with you? Answer with the full short answer and one more sentence with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with was or were, X = say no with wasn't or weren't, + = join with a second idea, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. One thing = was, you and more than one = were, and 'now' needs is or are.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'You was' or 'Now it was') and fix them together; then go on.",
              "In round 3 the drill becomes real: ask about what your partner really did, and remember one answer to tell the class.",
            ],
            prompts: ["The ice was hard. (?)", "The puddles were deep. (X)", "I was late. (+ because)", "We were at school. (T: last Sunday)", "The soup was hot. (P: the noodles)"],
            feedback: correctWas,
            teacherNote: "A drill only helps when the last step is real: round 3 has students tell each other about yesterday and the weekend, so was / were carry real meaning. Grades 6-7 take the whole set at speed: questions, short answers, negatives, joined ideas and a change of time and person. The slip to watch for is 'Now it was ...'. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Was it ___? Yes, it was. / No, it wasn't.", "Were they ___? Yes, they were. / No, they weren't."] },
              { level: "Core", task: "Change every sentence, with all five signs, without looking at the board." },
              { level: "Stretch", task: "Join two signs in one go: 'Was the match on Saturday? No, it wasn't, because it was raining, although we were ready.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "My neighborhood then and now: plan, write, check",
            routine: "paragraph",
            genre: "comparison",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find was, were, wasn't, weren't, is and are.",
              "Plan: fill the five boxes with a few words each, not whole sentences. Say one sentence for each box to your partner.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner points to every was, were and 'now' + is / are.",
              "Teacher: look only at was / were and now + is / are. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: My neighborhood",
              text: "When I was seven, my neighborhood was very different from now. First, the street near my house was quiet, and there were only a few shops. Also, the park wasn't clean, because people weren't careful with trash. However, now the street is busy, and there are two big cafes. For example, my friends and I were at the new cafe last Saturday, and it was full of students. In conclusion, my neighborhood was smaller then, but now it is lively and modern.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which place, and when was it different? Say it in one sentence." },
              { label: "Detail 1: then", prompt: "What was it like? Say two things (was / were)." },
              { label: "Detail 2: what wasn't there", prompt: "What wasn't there, or what weren't people doing? Say why." },
              { label: "Detail 3: now", prompt: "What is it like now? Give an example (now + is / are)." },
              { label: "Closing: In conclusion, ...", prompt: "What changed most? Is it better now? Why?" },
            ],
            frames: ["When I was ___, my ___ was very different from now.", "First, the ___ was ___, and there were ___.", "The ___ wasn't ___, because ___.", "However, now the ___ is ___. For example, ___.", "In conclusion, ___ was ___ then, but now ___."],
            checklist: [
              "Six to eight sentences: a topic sentence, three details and a closing sentence",
              "Then = was / were / wasn't / weren't. Now = is / are",
              "Linking words: first, also, however, because, for example, in conclusion",
              "Each sentence starts with a capital letter and ends with a full stop",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "The paragraph uses was / were / wasn't / weren't and is / are in real then-and-now sentences about a place the student knows, so the grammar of the lesson is in their own writing. The slip to watch for is 'Now it was ...'. Mark only two things (was / were and now + is / are) and let the student find the mistake from your dot. Students may use any place or thing that changed (school, a shop, a park, their city) in place of the neighborhood.",
            tiers: [
              { level: "Support", task: "Use the frames: one sentence for each box, then add one example.", frames: ["When I was ___, my ___ was very different from now.", "Now the ___ is ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Add a contrast and a reason: 'Although the park was small, it was my favorite place, because my friends were always there.'" },
            ],
          },
        },
        {
          after: "Classroom detectives (SB 33 F)",
          slide: {
            kind: "fluency",
            title: "Then and now: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same then-and-now talk three times, with a new partner. Each time it is smoother, faster and a little longer.",
            chunks: [
              "The ice was hard. Now it is water, because the room is warm.",
              "The puddles were ice this morning. Now they are water.",
              "My school was small when I was seven. Now it is big, and there are more students.",
              "Was your city busy then? Yes, it was, although the streets were smaller.",
            ],
            recycle: ["My cousin sometimes sleeps late on Sundays.", "My uncle is usually late."],
            rounds: [
              { seconds: 60, say: "Round 1: Choose three things that changed (ice, a puddle, your school, a shop, your phone). Partner A says a then-and-now sentence with a reason for each, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: Same three things, new partner. Partner A says the sentences again, faster and with an extra detail, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 3: Same three things, new partner. Partner A, then Partner B. Fast and smooth, no stops!" },
            ],
            steps: [
              "Choose your three things. In each round, Partner A talks, then Partner B talks. Say: It was ___. Now it is ___, because ___.",
              "The listener's job: tick a box each time you say was or were correctly.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3, count the ticks. Can you get all three?",
            ],
            prompts: ["(picture: ice, then water)", "(picture: puddles, then dry ground)", "(your own idea: a place or a thing that changed)"],
            feedback: correctWas,
            teacherNote: "Task repeat: the same task, with the same three things, three times with a new listener. The second and third go faster because the words are already found. The new listener keeps the repetition real. Do not add new topics between rounds; the gain comes from saying the same thing more fluently, and the minute of correction in the middle is what makes it more accurate too. Both partners speak in every round.",
            tiers: [
              { level: "Support", task: "Say it with the frames on the board.", frames: ["It was ___. Now it is ___.", "They were ___. Now they are ___."] },
              { level: "Core", task: "Say all three sentences with a reason, without the frames." },
              { level: "Stretch", task: "Add a contrast: 'The ice was hard. Now it is water because the sun was hot, although the room wasn't warm.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u03-l4": {
      objectives: ["I can explain a thing that changes, with reasons and an example, three times, faster each time."],
      drop: ["Mystery bag, round two"],
      trim: {
        "Noun or verb? (SB 35 F)": 6,
        "Big Question review (SB 35 A-B)": 6,
        "Which state is the most useful?": 6,
        "Tell your partner (SB 35 Write)": 6,
        "Can you pass the ___, please? (SB 35 E)": 9,
      },
      add: [
        {
          after: "Can you pass the ___, please? (SB 35 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas, change the time or the person. Then talk about real things.",
            chunks: [
              "Can you pass the water, please? I'm really thirsty because it's hot.",
              "The chocolate was hard in the fridge, but now it is soft because the room is warm.",
              "When we heat butter, it melts, but it doesn't turn into a gas.",
              "Does ice cream melt faster in the sun? Yes, it does, so we eat it quickly.",
              "The candle wasn't tall after the party, although it was new.",
              "Can you pass the ice, please? My drink isn't cold enough.",
            ],
            recycle: ["I always bring water to school.", "My friends were at the game last night."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and holds up a sign. ? = ask it, X = say no, + = join with because, although, so or when, T = change the time (now, last night, in summer), P = change the person (I, we, the butter). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it and says the whole new sentence. Swap at the clap. Change the person too." },
              { seconds: 90, say: "Real talk: ask your partner for things politely ('Can you pass ...?') and ask what they do when food gets too hot or too cold. Answer with the full short answer and one more sentence with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question, X = say no, + = join with a second idea, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Check the verb: melts, doesn't melt, was, wasn't.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In round 3 the drill becomes real: ask your partner for something, then ask about food and drinks they know.",
            ],
            prompts: ["Butter melts in a warm room. (?)", "The ice cream was cold. (X)", "The chocolate melts. (+ because)", "The candle is short. (T: last night)", "Ice melts in a warm room. (P: the butter)"],
            feedback: correctNow,
            teacherNote: "This lesson has no grammar slide, so the drill carries the unit's grammar (present simple cause and effect, was / were) together with the polite request of the book page. Round 3 is real: students ask each other for things and talk about their own food and drinks. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Can you pass the ___, please?", "Does ___ ___? Yes, it does. / No, it doesn't."] },
              { level: "Core", task: "Change every sentence with all five signs, without looking at the board." },
              { level: "Stretch", task: "Join two signs in one go: 'Was the chocolate soft? No, it wasn't, although the bag was warm, so I didn't put it in the fridge.'" },
            ],
          },
        },
        {
          after: "Noun or verb? (SB 35 F)",
          slide: {
            kind: "writing",
            title: "Read the model, write about a thing that changes",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find where it says what changes, why, and what it was.",
              "Choose your own thing: chocolate, butter, a candle, ice cream.",
              "Write four or five sentences with the frames: what it is, what happens, why, what it was and what it is now.",
              "Check your list, then read it to a partner.",
            ],
            text: {
              title: "The chocolate bar",
              text: "Chocolate is a solid at room temperature, but it changes easily. When it is hot, it melts and becomes a liquid. It was hard in my bag this morning, and now it is soft because the weather is warm. Although it looks different, it is still chocolate. When it cools in the fridge, it becomes solid again.",
            },
            frames: ["___ is a ___, but it changes easily.", "When it is ___, it ___s.", "It was ___. Now it is ___ because ___.", "Although it looks ___, it is still ___."],
            checklist: ["Was / is: one thing, one verb", "The -s on melts and becomes", "A reason with because and a contrast with although", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "The model is short and has the same shape as the frames, so every student can copy the shape and put in their own thing. This feeds the main writing task in this lesson and the recorded talk. The common slips to catch: a dropped -s on 'melts' and 'Now it was soft' instead of 'Now it is soft'.",
            tiers: [
              { level: "Support", task: "Copy the model and change two or three words for your own thing." },
              { level: "Core", task: "Write four sentences about your own thing with the frames." },
              { level: "Stretch", task: "Write five sentences. Add a reason and a contrast: 'It melts because the heat changes it, although the box stays cold.'" },
            ],
          },
        },
        {
          after: "Tell your partner (SB 35 Write)",
          slide: {
            kind: "fluency",
            title: "Thing that changes: 4-3-2 with three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same talk to three classmates. Each talk is shorter, smoother and has a reason and an example.",
            chunks: [
              "Chocolate is a solid, but it changes easily.",
              "When it is hot, it melts, because the heat makes it soft.",
              "It was hard in my bag. Now it is soft, so I put it in the fridge.",
              "For example, on a hot day in my city, a chocolate bar changes in minutes.",
            ],
            recycle: ["I put the ice in the glass. It melts.", "Can you pass the ___, please?"],
            rounds: [
              { seconds: 90, say: "Partner 1: give your talk about one thing that changes. The listener counts the steps on their fingers." },
              { seconds: 70, say: "Partner 2: the same talk in less time." },
              { seconds: 50, say: "Partner 3: fast and smooth! The listener asks one question at the end: 'What changes it?'" },
            ],
            steps: [
              "Pick one thing: chocolate, butter, a candle, ice cream or a snowman. Say what it is, what happens, why, and what it was.",
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
            ],
            feedback: correctWas,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity at grades 6-7 pace. Fluency gains are real, but accuracy does not rise on its own; the correction minute between rounds 1 and 2 is what does that. The listener's job (count the changes, then ask one follow-up question) keeps the student listening, which is real practice too. Both partners speak in every round. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["___ is a ___.", "When it is hot, it ___s because ___."] },
              { level: "Core", task: "Say all four sentences without the board." },
              { level: "Stretch", task: "Add a contrast: 'It melts because the heat changes it, although it stays chocolate.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u03-l5": {
      objectives: ["I can ask and answer 'Was it ...?' and 'Were they ...?' fast, and explain why something changed."],
      trim: { "Remember it!": 4 },
      drop: ["Then and now: run to the mat", "Freeze, melt, steam: say it!"],
      add: [
        {
          after: "Then and now gap: What was it?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right with was, were, wasn't and weren't. Then ask about your own life.",
            chunks: [
              "The ice cube was hard, and now it is water because the room is warm.",
              "Was the museum open yesterday? No, it wasn't, so we were at the park instead.",
              "The puddles weren't deep, but they were cold, and my shoes were wet.",
              "Where were you at six o'clock? I was at home, although my sister wasn't.",
              "Were your friends at school on Monday? Yes, they were, and the teacher was there too.",
              "Although the lake wasn't frozen, the water was very cold.",
            ],
            recycle: ["When it is hot, the ice melts.", "I sometimes read before bed."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and holds up a sign. ? = ask it (Was it ...? Were they ...?), X = say no (wasn't, weren't), + = join with because, although, so or when, T = change the time (last night, last year, now), P = change the person (I, you, we, they). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it and says the whole new sentence. Swap at the clap." },
              { seconds: 90, say: "Real talk: ask your partner about last weekend, last year and their old school. Where were you? Who was with you? Was it fun? Why? Answer with the full short answer and one more sentence with because or although." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it, X = say no with wasn't or weren't, + = join with a second idea, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. One thing = was. More than one and you = were. Now = is or are.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'You was' or 'It not was') and fix them together; then go on.",
              "In round 3 the drill becomes real: ask about what your partner really did, and remember one answer to tell the class.",
            ],
            prompts: ["The ice cube was hard. (?)", "The puddles were deep. (X)", "The lake was cold. (+ although)", "We were at school. (T: last Sunday)", "The soup was hot. (P: the noodles)"],
            feedback: correctWas,
            teacherNote: "Grammar Champions drills was, were, wasn't and weren't at speed: questions, short answers, negatives, joined ideas and a change of time and person. Round 3 is real talk about last weekend and the old school, so the forms carry meaning. The slips to watch for are 'You was', 'It not was' and 'Now it was'. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Was it ___? Yes, it was. / No, it wasn't.", "Were they ___? Yes, they were. / No, they weren't."] },
              { level: "Core", task: "Change every sentence, with all five signs, without looking at the board." },
              { level: "Stretch", task: "Join two signs in one go: 'Were the puddles deep? No, they weren't, although it rained all night, because the water ran into the river.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Question chain: Was it? Were they?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next classmate. Keep the chain going with no stops!",
            chunks: [
              "Was it hard? Yes, it was, and it was cold too.",
              "Were they cold? No, they weren't, because the room was warm.",
              "What was it? It was ice, although it looked like glass.",
              "What were they? They were puddles, so my shoes were wet.",
            ],
            recycle: ["Does it melt? Yes, it does.", "When it is hot, the ice melts."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card (one thing or two or more). Answer with a reason." },
              { seconds: 90, say: "Swap cards. Go faster, and add a detail." },
              { seconds: 75, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the classmate on your left: 'Was it ___?' (one thing) or 'Were they ___?' (more than one).",
              "They answer: 'Yes, it was.' / 'No, it wasn't.' / 'Yes, they were.' / 'No, they weren't.' Then they add a reason or a detail and ask the next classmate.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["Was it ___?", "Were they ___?", "What was it?", "What were they?"],
            feedback: correctWas,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Was it ...? / Were they ...?' automatic. The answers are longer now: a short answer plus a reason or a detail. Time the whole circle and tell them; students like beating their own time. Watch for 'Yes, it do' and 'Were it ...?' and prompt with a raised finger: 'Yes, it w...?' Listen for the /nt/ at the end of wasn't and weren't.",
            tiers: [
              { level: "Support", task: "Answer with the short answers on the board and pass the question on.", frames: ["Yes, it was. / No, it wasn't.", "Yes, they were. / No, they weren't."] },
              { level: "Core", task: "Ask and answer with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a reason and a contrast: 'No, it wasn't. It was soft, although it looked hard.'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "Fix the champion notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong, and in some sentences there is more than one mistake!",
              "Find it: was or were, the not, or 'now' with the wrong verb.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The ice cubes was hard this morning, but now they is water.", answer: "The ice cubes were hard this morning, but now they are water." },
              { q: "Although the museum wasn't open, we was at the door.", answer: "Although the museum wasn't open, we were at the door." },
              { q: "My phone not was ready because the battery were empty.", answer: "My phone wasn't ready because the battery was empty." },
              { q: "You was late yesterday, so the teacher were angry.", answer: "You were late yesterday, so the teacher was angry." },
              { q: "The puddles was ice at six o'clock, but now it was water.", answer: "The puddles were ice at six o'clock, but now they are water." },
            ],
            checklist: ["One thing = was. More than one = were. You = were.", "Not true then: wasn't / weren't", "'Now' needs is or are", "A capital letter and a full stop"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "The mistakes here are slips common with students who speak Vietnamese: 'was' for everything (one form for all), 'not was' and 'now' with a past verb. Fix one together first and say the correct version with a strong 'were' so the sound sticks. Two or three error types at a time is plenty: do not add other slips today.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 4 with the frames on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences, each with a was / were mistake and a joining word, for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Then and now: a change I know",
        prompt: "Talk about two things that changed: one from science (ice, water, weather) and one from your own life (your school, your city, a hobby). Say what each one was then, what it is now and why it changed, and give an example.",
        length: "90-120 seconds",
        steps: [
          "Choose two things: for example ice and water, and your old school and your school now. Write four keywords, not sentences.",
          "Practice twice, out loud. Say 'It was ___. Now it is ___ because ___.' for each one, and a little faster the second time.",
          "Record it once. Look at the camera and speak clearly.",
          "Watch it back. Did you use was and were correctly, and give a reason and an example? If not, record it again.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what it was then and what it is now, with was and were, give reasons and examples, and keep talking without long stops.",
        words: ["ice", "water", "steam", "melt", "freeze", "was", "were", "wasn't", "weren't"],
        grammar: ["It was ___. Now it is ___.", "They were ___. Now they are ___.", "It wasn't ___. They weren't ___."],
        rubric: [
          { label: "Then and now", description: "Says what it was and what it is now, for at least two things.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons with 'because' or 'although' and one example.", weight: 3 },
          { label: "Was and were", description: "Uses was for one thing and were for more than one, and wasn't or weren't at least once.", weight: 3 },
          { label: "Keeps going", description: "Talks for at least 90 seconds without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Now needs is", description: "Says 'Now it is ...', not 'Now it was ...'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["It was ___. Now it is ___.", "They were ___. Now they are ___.", "It changed because ___."], tips: ["Look at your keywords, then say the sentences again without them."] },
          { level: "Core", who: "Most students", frames: ["The ___ was ___. It wasn't ___. Now it is ___ because ___.", "The ___ were ___. Now they are ___. For example, ___."], tips: ["Say one thing and one group of things, each with a reason."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although it was ___, it wasn't ___, because ___.", "I think it changed because ___, so ___."], tips: ["Add a contrast with although and say what you think about the change."] },
        ],
      },
    },
  },
};
