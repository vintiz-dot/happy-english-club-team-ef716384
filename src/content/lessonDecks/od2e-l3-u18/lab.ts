import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 18 "Exploring the
// Ocean" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (SKY 1).
// Every lesson gets one fluency routine (the unit's language said again and again as whole
// sentences, a little faster each round, with Unit 17's phrases mixed back in) and one
// short writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a
// recorded talk for home that repeats the class routine. Time comes from games, warm-ups and
// repeats, never from the book pages or the grammar. All text is original.

const fixTip =
  "Say every final -s and -ed clearly yourself: children copy what they hear, and many Vietnamese learners drop final sounds.";

const feedbackSea =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). For grammar, prompt the child to fix it instead of saying it for them: start the phrase and pause ('The water hurt...?' with rising voice), point to the frame on the board, or hold up a finger for the missing -s or -ed. Example: a child says 'The water hurt my eyes' about today: say 'Today the water ...?' and wait for 'hurts'. For a sound, a quick recast is fine: say 'goggles' clearly and the child echoes it. After the last round, stop for one minute: put two mistakes on the board and let the class fix them. " +
  fixTip;

const feedbackRetell =
  "During a telling, listen and do not stop the talk. Note two or three mistakes (no names). Between round 1 and round 2, stop for one minute: write two sentences with a mistake on the board ('The explorer want to see the ocean.' 'The result was that she see amazing fish.') and let the class fix them; children then use the fixed form in round 2. Prompt, do not tell: start the phrase and pause ('The explorer wanted ...?'), point to the frame, or hold up a finger for the missing -ed. For a sound, say it right and let the child echo it. " +
  fixTip;

const feedbackWant =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Prompt the child to fix grammar: with he, she or it, hold up a finger and say 'She want...?' with rising voice until the child adds -s ('wants'); for 'She wants go', point to the word to on the frame card; for 'Does she has to ...?', repeat it with rising voice, then say 'Does she ...?' and pause for 'have'. For a sound, a quick recast is fine ('needs' with its clear -z, then the child echoes). After the last round, stop for one minute: put two mistakes on the board and let the class fix them. " +
  fixTip;

const feedbackAlthough =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Prompt the child to fix it: for 'Although it was cold, but we swam', cover the word but with your finger and say 'Although it was cold, ...?' and pause; for 'We swam. Although it was cold.', point to the frame and say 'We swam although ...?'; for a dropped -ed ('Although the water freeze'), hold up a finger for the ending. Between round 1 and round 2, stop for one minute: put two mistakes on the board and let the class fix them. For a sound, say it right and let the child echo it. " +
  fixTip;

const feedbackTalk =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Between round 1 and round 2, stop for one minute: put two mistakes on the board ('Our group want to explore the deep sea.' 'We need take a camera.') and let the class fix them; children then say the fixed form in rounds 2 and 3. Prompt, do not tell: start the phrase and pause ('Our group wants ...?'), point to the word to on the frame, or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. " +
  fixTip;

export const odL3U18Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u18-l1": {
      objectives: ["I can say why people use goggles and what sea animals do, fast and without stopping."],
      trim: {
        "Dive into what we know": 5,
        "Stand on the line": 6,
        "Sea sort: animal or plant? Group, describe, name": 6,
        "Have you seen it? (SB 176 B)": 8,
        "Where in the world? (SB 177 Think)": 3,
        "Who am I? Clue game": 3,
      },
      add: [
        {
          after: "Why do people use goggles? (SB 176 C)",
          slide: {
            kind: "fluency",
            title: "Goggles sprint: say it all in one breath",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "People use goggles because the water hurts their eyes.",
              "Without goggles, the water gets in my eyes.",
              "I wore goggles when I swam in the pool.",
              "The otter floats on its back and eats.",
              "I want to see a humpback whale!",
            ],
            recycle: ["First, go along the river. Then walk up the hill.", "We sailed past the lighthouse."],
            rounds: [
              { seconds: 90, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence two times, the second time faster." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! The listener counts the sentences on their fingers. How many can you say?" },
            ],
            steps: [
              "Look at the picture card. Say the WHOLE sentence, not just the word.",
              "Listen for the clap: it means change.",
              "In round 3, the listener counts your sentences. Try to beat your own number.",
              "Teacher: after the last round, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them.",
            ],
            prompts: ["(card: goggles)", "(card: pool)", "(card: otter)", "(card: whale)", "(card: eyes)"],
            feedback: feedbackSea,
            teacherNote: "Whole sentences only: the aim is for 'People use goggles because ...' to come out as one smooth piece. Every few turns mix in a Unit 17 route sentence so the old phrases stay fast too (spaced retrieval). Listen for the -s on goggles, otters and hurts, and the -ed on past verbs like hurt, played or wanted when children tell about before: model them clearly yourself.",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, with the frames on the board.", frames: ["People use goggles because ___.", "I wore goggles when I ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second reason: 'People use goggles because the water hurts their eyes, and they want to see the fish.'", frames: ["People use ___ because ___, and ___."] },
            ],
          },
        },
        {
          after: "Sea sort: animal or plant? Group, describe, name",
          slide: {
            kind: "writing",
            title: "Grow a sea sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Think and plan: read the small sentence. What can you add: where, what or why?",
              "Write your bigger sentence. Use because to give a reason.",
              "Check it with the checklist. Then read it to your partner.",
            ],
            items: [
              { q: "Penguins swim. (add: where)", answer: "Penguins swim in the cold sea." },
              { q: "The otter eats. (add: how and what)", answer: "The otter floats on its back and eats a crab." },
              { q: "I wore goggles. (add: when and why)", answer: "I wore goggles when I swam in the pool because the water hurt my eyes." },
              { q: "Small fish hide. (add: where and why)", answer: "Small fish hide in the coral because big fish cannot reach them." },
            ],
            frames: ["___ swim in the ___ because ___.", "I wore goggles when I ___ because ___."],
            checklist: [
              "A capital letter at the start and a full stop at the end",
              "More than one animal: the -s is there (penguins, otters). One animal doing something: swims, hides",
              "I used because to give my reason",
            ],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence (who, where, when, why) is a quick, low-stress way to build longer written sentences, and it keeps the unit's because-reasons in use. Do item 1 together on the board before they start alone.",
            tiers: [
              { level: "Support", task: "Expand items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Expand all four items, then write one sentence about an animal you know." },
              { level: "Stretch", task: "Write two sentences about one sea animal and join them with because or when." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u18-l2": {
      objectives: ["I can retell an explorer's problem, idea and result three times, faster each time."],
      trim: {
        "Picture walk": 5,
        "What do I know about diving?": 3,
        "Monitor and clarify: question-mark notes": 6,
        "Read it in different ways": 6,
        "Gist talk": 4,
        "Organize: problem, idea, result": 8,
        "Poster talks": 10,
      },
      add: [
        {
          after: "Gist talk",
          slide: {
            kind: "fluency",
            title: "Explorer story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Retell the same explorer story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "The explorer wanted to see the deep ocean.",
              "The problem was that people could not breathe underwater.",
              "Her idea was to find a way to bring air down.",
              "The result was that she saw amazing sea life.",
              "I think exploring is important because we learn about the sea.",
            ],
            recycle: ["The journey started in ... and ended in ...", "Before we sailed, we packed a map."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the story with the key-word cards: problem, idea, result. Then Partner B tells it. The listener counts the three parts on their fingers. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. The listener says one thing that was better this time. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it fast and smooth, then Partner B. The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Look at the key-word cards on the board: wanted, problem, idea, result. Use them, not your notes.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and let the class fix them; then go on with round 2.",
              "In each round, Partner A tells the story, then Partner B tells it. When the bell rings, find a new partner.",
              "Listener jobs: count the three parts, then say what was better, then ask one question.",
            ],
            prompts: ["(card: wanted)", "(card: problem)", "(card: idea)", "(card: result)"],
            feedback: feedbackRetell,
            teacherNote: "It is the same story three times on purpose: by the second and third telling the children are not searching for words, so they speak faster and more smoothly. Fluency alone does not fix grammar, so the one-minute fix between round 1 and round 2 is the key step: children can use a correction straight away when it comes between the first and second telling. Use the explorer from the lesson's reading; the chunks only give the shape. Listen for -ed on wanted and -s on 'the result was'.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["The explorer wanted to ___.", "The problem was that ___.", "Her idea was to ___.", "The result was that ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add why it matters: 'I think it is important because ...'", frames: ["I think exploring is important because ___."] },
            ],
          },
        },
        {
          after: "Organize: problem, idea, result",
          slide: {
            kind: "writing",
            title: "A diver's day: listen and rebuild",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder: wanted to + plain verb ('She wanted to see') and -ed for the past.",
              "Listen to the text the first time. Do not write.",
              "Listen the second time and write key words: verbs, sea words and numbers.",
              "In your group, rebuild the text. Check it against the checklist, then read your text aloud.",
            ],
            text: {
              title: "A diver's day",
              text: "A young diver loved the sea. She wanted to see the deep water, but she had a problem. She could not stay down for long. So she wore a tank and swam slowly past the kelp. At last she saw bright coral and a shy octopus. She smiled and said, 'The ocean is amazing!'",
            },
            checklist: [
              "Every sentence starts with a capital letter and ends with a full stop",
              "-ed or a past form on the verbs (wanted, loved, swam)",
              "wanted to + the plain verb (wanted to see, not wanted to saw)",
            ],
            sayIt: "Read your group's text aloud together, then close the page and say it again from your key words.",
            teacherNote: "Dictogloss (read twice, rebuild in groups) makes children notice the exact grammar they did not hear. Read at natural speed, with clear final -ed and -s. Children's versions will differ from the original: accept any version with the same meaning and correct grammar, and show the original text last.",
            tiers: [
              { level: "Support", task: "Get the key words on the board and rebuild three sentences.", frames: ["A diver ___ the sea.", "She wanted to ___."] },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it and write a new ending with 'although'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My explorer story",
        prompt: "Tell the story of an ocean explorer, from our reading or from your own idea. Say the problem, the idea and the result. Show a drawing of the explorer.",
        length: "60-90 seconds",
        steps: [
          "Look at your notes and the key words from class: wanted, problem, idea, result.",
          "Practise your story three times to a grown-up or a toy. Each time say it a little faster and smoother.",
          "Record it once. Look at the camera and keep talking, even if you make a small mistake.",
          "The last time, say it without looking at your notes.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the problem, the idea and the result of an explorer's story, and keep talking without long stops.",
        words: ["explorer", "diver", "goggles", "coral", "octopus", "freezing"],
        grammar: ["wanted to + verb", "The problem was ... / The result was ..."],
        rubric: [
          { label: "Three parts", description: "Tells the problem, the idea and the result of the story in order.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "wanted to", description: "Uses wanted to + a plain verb correctly at least once, with clear -ed.", weight: 2 },
          { label: "Sea words", description: "Uses words from the unit: diver, goggles, coral, octopus.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The explorer wanted to ___.", "The problem was that ___.", "The result was that ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["The explorer wanted to ___ but the problem was that ___.", "Her idea was to ___.", "The result was that ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Although it was hard, she wanted to ___.", "I think exploring is important because ___."], tips: ["Add your opinion and use 'although' once."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u18-l3": {
      objectives: ["I can ask and answer questions with want to, need to and have to, fast and without stopping."],
      trim: {
        "Which ocean animal? (SB 180 Think)": 3,
        "A floating research lab (SB 180 B)": 6,
        "Song time (SB 181 D)": 5,
        "Choice or must? Traffic lights": 3,
        "Our big idea": 4,
      },
      add: [
        {
          after: "Want and need chart (SB 181 G)",
          slide: {
            kind: "fluency",
            title: "Question chain: want, need, have to",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Do you want to dive with a dolphin? Yes, I do. / No, I don't.",
              "What do you need to take on a dive?",
              "I need to take goggles, so I can see.",
              "She wants to swim, but she has to wait for the boat.",
              "Does he have to wear a life jacket? Yes, he does.",
            ],
            recycle: ["Walk around the pond and then across the bridge.", "How do I get to the library?"],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds an explorer card. Ask your friend on the left." },
              { seconds: 75, say: "Swap cards. Go faster! Add 'He / She wants to ...' to tell about your friend's answer." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Do you want to ___?' or 'What do you need to take?'",
              "They answer, then turn and ask the next friend.",
              "Tell the class one thing about the friend on your right: 'He wants to ___.' or 'She needs to ___.'",
              "Teacher: after the last round, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them.",
            ],
            prompts: ["Do you want to ___?", "What do you need to take?", "Does she have to ___?"],
            feedback: feedbackWant,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Do you want to ...?' and the 'wants / needs / has to' endings automatic. Time the whole circle and tell them; children like to beat their own time. Listen for the -s on wants, needs and has (many Vietnamese learners drop it), and for 'Does she has to'. Mix in two Unit 17 route sentences so those stay fast too.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board and pass the question on.", frames: ["Do you want to ___?", "I need to ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'He needs to take goggles because the water hurts his eyes.'", frames: ["He / She needs to ___ because ___."] },
            ],
          },
        },
        {
          after: "Learn Grammar and circle (SB 181 F)",
          slide: {
            kind: "writing",
            title: "Fix the explorer's notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "An explorer wrote some notes, but there are mistakes! Read each note with your partner.",
              "Find the mistake: a missing -s, a missing to, or a wrong word after does.",
              "Write the note the right way. Check it with the checklist. Read it aloud together.",
            ],
            items: [
              { q: "My sister want to see a whale.", answer: "My sister wants to see a whale." },
              { q: "A diver need to check her air.", answer: "A diver needs to check her air." },
              { q: "Does he has to wear goggles?", answer: "Does he have to wear goggles?" },
              { q: "I want go to the coral reef.", answer: "I want to go to the coral reef." },
            ],
            checklist: [
              "With he, she or it: wants, needs, has to",
              "to is there, and the verb after it has no -s",
              "After does, the verb stays plain (Does he have to ...?)",
            ],
            sayIt: "Say all four fixed sentences to your partner, fast, without looking.",
            teacherNote: "Focus on only these three error types today, with a short reason for each. Vietnamese verbs do not change for he and she, so the -s on wants, needs and has to is the most common slip in this unit; 'Does he has' is a related slip. Fix item 1 together first.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 2 with the frames on the board.", frames: ["She wants to ___.", "He needs to ___."] },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Write one more note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u18-l4": {
      objectives: ["I can join ideas with although and say it fast, with no stops."],
      trim: {
        "Adventure chain": 3,
        "Think: adventures (SB 182 Think)": 3,
        "Listening for detail (SB 182 A)": 6,
        "Compound nouns (SB 183 D)": 8,
        "Underline the two parts (SB 183 F)": 3,
        "Although chain": 5,
        "Pick your place": 6,
      },
      add: [
        {
          after: "Although chain",
          slide: {
            kind: "fluency",
            title: "Although talk: plan once, say it twice",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say an although sentence about an explorer. Plan it once, then say it again to a new partner, smoother.",
            chunks: [
              "Although the water was freezing, the explorer wanted to swim.",
              "She needed to wear a suit, although it was hard to move.",
              "Although I feel nervous, I want to try.",
              "I like octopuses although I have never seen one.",
              "Although it was dangerous, the diver had to go down.",
            ],
            recycle: ["After we crossed the river, we wrote in the journal.", "Before we sailed, we packed a map."],
            rounds: [
              { seconds: 75, say: "Round 1: One minute to plan. Then Partner A tells three although sentences about an explorer, then Partner B. Use the chunks on the board for ideas. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A says the same three sentences again, smoother, with no stops. Then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A says them again, fast and smooth. Then Partner B. The listener ticks each although sentence." },
            ],
            steps: [
              "Plan: choose three although ideas. Write one key word for each, not whole sentences.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them; then go on with round 2.",
              "In each round, Partner A talks, then Partner B talks. When the bell rings, find a new partner.",
              "Listener job: tick each although sentence and say if the comma is in the right place.",
            ],
            feedback: feedbackAlthough,
            teacherNote: "Task repetition: the same task with a new partner and less planning lets children spend their attention on fluency and form in rounds 2 and 3. Do not add new language between rounds. Listen for 'Although ..., but ...' (a common mistake: Vietnamese uses a pair of linking words) and for the comma pause after a first although part.",
            tiers: [
              { level: "Support", task: "Say two although sentences with the frames.", frames: ["Although ___, I want to ___.", "I like ___ although ___."] },
              { level: "Core", task: "Say three sentences without the board." },
              { level: "Stretch", task: "Say three sentences and add a reason: 'Although it was hard, I wanted to try because I love the sea.'.", frames: ["Although ___, ___ because ___."] },
            ],
          },
        },
        {
          after: "Underline the two parts (SB 183 F)",
          slide: {
            kind: "writing",
            title: "Join them with although",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences. What is the surprise?",
              "Make ONE sentence with although. Say it first, then write it.",
              "Check the comma and that you did not use but. Read your sentence aloud.",
            ],
            items: [
              { q: "It was cold. We swam. (although)", answer: "Although it was cold, we swam." },
              { q: "The diver felt nervous. She went down. (although)", answer: "Although the diver felt nervous, she went down." },
              { q: "I have never seen a whale. I love whales. (although, in the middle)", answer: "I love whales although I have never seen one." },
              { q: "The boat was small. It was safe. (although, in the middle)", answer: "The boat was safe although it was small." },
            ],
            frames: ["Although ___, ___.", "___ although ___."],
            checklist: [
              "A comma when although comes first; no comma when it is in the middle",
              "No but in the same sentence as although",
              "Each part has its own verb: it was cold, we swam",
            ],
            sayIt: "Say your although sentences to your partner without looking.",
            teacherNote: "Sentence combining teaches a joining word through use. Show both orders with item 1 on the board and move your hand to show the part that stays in place. If a child writes 'Although it was cold, but we swam', cover the but and let them see it still works.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames; the teacher helps with the comma." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two more although sentences about your own adventure." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Although I was nervous, I tried it",
        prompt: "Tell us about something you did although it was hard or scary: a swim, a climb, a first day, a trip. Say what it was, how you felt and what happened.",
        length: "60-90 seconds",
        steps: [
          "Choose one adventure. Write three key words, not sentences.",
          "Say your talk three times to a grown-up or a toy. Each time, a little faster and smoother, like in class.",
          "Record it once. Use although at least two times.",
          "The last time, say it without looking at your key words.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell about an adventure with although, and keep talking without long stops.",
        words: ["adventure", "freezing", "nervous", "dangerous", "explore", "ocean"],
        grammar: ["Although + idea 1, idea 2.", "Idea 2 although idea 1."],
        rubric: [
          { label: "Although sentences", description: "Uses although to join two ideas at least twice, with no but in the same sentence.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Story", description: "Says what the adventure was, how the child felt and what happened.", weight: 2 },
          { label: "Clear endings", description: "The -ed on past verbs and -s on plural words can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Although it was ___, I ___.", "I felt ___ and it was ___."], tips: ["Say one although sentence, then one more."] },
          { level: "Core", who: "Most children", frames: ["Although I felt ___, I ___.", "I ___ although ___.", "At the end, I felt ___."], tips: ["Use although at the start and in the middle."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Although ___, I wanted to ___ because ___.", "Next time, I want to ___."], tips: ["Add a reason and what you want to do next time."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u18-l5": {
      objectives: ["I can talk about my exploration plan three times, faster each time."],
      trim: {
        "Two units in 60 seconds": 3,
        "Read the interview (SB 184 A)": 6,
        "Answer and trace the route (SB 184 B)": 5,
        "Interview role play": 6,
        "Project: plan an exploration (SB 185 C)": 6,
        "Big Question review (SB 185 A-C)": 8,
        "Test our big ideas": 3,
      },
      add: [
        {
          after: "Project: plan an exploration (SB 185 C)",
          slide: {
            kind: "fluency",
            title: "Exploration talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 11,
            goal: "Give the same exploration talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "Our group wants to explore the deep sea.",
              "We chose it because we want to see new animals.",
              "We need to take a camera, so we can show everyone.",
              "We have to be careful because the water is deep.",
              "Although it is dangerous, we want to go!",
            ],
            recycle: ["Let's go to ... because ...", "First, go along the river. Then walk up the hill."],
            rounds: [
              { seconds: 120, say: "Partner 1: give your exploration talk. The listener counts the reasons on their fingers." },
              { seconds: 90, say: "Partner 2: the same talk in less time. The listener says one thing that was better." },
              { seconds: 60, say: "Partner 3: fast and smooth! The listener asks one follow-up question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A gives the talk three times, once to each new partner; line B listens. Then line B gives the talk the same way.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and let the class fix them; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner for line A.",
              "Swap jobs: line B gives the talk, and line A moves at each bell.",
            ],
            feedback: feedbackTalk,
            teacherNote: "This is the 4/3/2 routine scaled for 8-10 year olds: same talk, less time, a new listener each time, so the repetition feels real. It builds fluency; the one-minute fix after round 1 is what builds accuracy, so do not skip it. It is also the rehearsal for the group presentations that follow: children say the group's plan to the whole class more smoothly. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Our group wants to explore ___.", "We chose it because ___.", "We need to take ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a danger and a reason: 'Although it is dangerous, we want to go because ...'", frames: ["Although ___, we want to ___ because ___."] },
            ],
          },
        },
        {
          after: "How to write an interview (Learn box)",
          slide: {
            kind: "writing",
            title: "Write three interview questions",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model. Find the three question words and the question marks.",
              "Plan: think of an explorer and write one key word for each question.",
              "Write three questions. Check them against the checklist. Then ask a partner your questions.",
            ],
            text: {
              title: "A short interview",
              text: "Interviewer: Good morning! Thank you for talking to us. Where did you go? Explorer: I went to the deep sea. Interviewer: Why did you want to go? Explorer: I wanted to see new animals. Interviewer: What did you need to take? Explorer: I needed to take a light, because it is dark down there.",
            },
            frames: ["Where did you ___?", "Why did you want to ___?", "What did you need to take?"],
            checklist: [
              "Each question starts with a question word: Where, Why or What",
              "A question mark at the end, and did + a plain verb (Where did you go?)",
              "Capital letters at the start",
            ],
            sayIt: "Ask your partner your three questions out loud, then say them again without looking.",
            teacherNote: "Modelled writing: children notice what a good interview does, then copy the pattern with their own ideas. Many learners drop the do / did in questions ('Where you went?'): point to did in the model. The three questions are a warm-up for the interview role play.",
            tiers: [
              { level: "Support", task: "Copy and complete the three frames with your own words." },
              { level: "Core", task: "Write three questions of your own." },
              { level: "Stretch", task: "Write four questions, including one with although or because." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u18-l6": {
      objectives: ["I can say sentences with want to, need to and have to, fast and right."],
      trim: { "Remember it!": 3, "Pack the submarine": 8 },
      add: [
        {
          after: "Pack the submarine",
          slide: {
            kind: "fluency",
            title: "Champion sprint: want, need, have to",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right, with the little word to and the right ending.",
            chunks: [
              "The explorer wants to find a new kind of fish.",
              "Divers need to check their air, so they are safe.",
              "We have to wear life jackets on the boat.",
              "Does she have to carry the rope? Yes, she does.",
              "He doesn't need to take a coat. The water is warm.",
            ],
            recycle: ["Don't walk across the ice! It may break.", "The ship sailed past the lighthouse."],
            rounds: [
              { seconds: 90, say: "Together: the teacher shows a card, the class says the whole sentence two times." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Champion round: new partner, as fast as you can. Count your sentences on your fingers." },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Listen for the clap: it means change.",
              "Teacher: after the last round, stop for one minute. Put the two mistakes you heard most on the board (no names) and let the class fix them.",
            ],
            prompts: ["(card: find a new fish)", "(card: check air)", "(card: life jackets)", "(card: carry the rope)", "(card: take a coat)"],
            feedback: feedbackWant,
            teacherNote: "A high-energy recall that mixes this unit's grammar with Unit 17's route words: mixing old and new phrases (spaced retrieval) keeps both from fading. Whole sentences only. Listen for the same three slips as all week: the -s on wants, needs and has, the word to, and does + plain verb.",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, with the frames on the board.", frames: ["The explorer wants to ___.", "Divers need to ___."] },
              { level: "Core", task: "Say the sentence alone, without the board." },
              { level: "Stretch", task: "Add because or so: 'We have to wear life jackets, so we are safe.'", frames: ["We have to ___, so ___."] },
            ],
          },
        },
        {
          after: "Explorer cards: ask and fill in",
          slide: {
            kind: "writing",
            title: "Grow the explorer sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Think and plan: read the short sentence. What can you add: where, what or why?",
              "Write your bigger sentence. Use because or so for the reason.",
              "Check it with the checklist. Then read it to your partner.",
            ],
            items: [
              { q: "The explorer wants to dive. (add: where and why)", answer: "The explorer wants to dive in the warm sea because she wants to see coral." },
              { q: "Divers need to check. (add: what and why)", answer: "Divers need to check their air because they cannot breathe underwater." },
              { q: "We have to wear. (add: what, where and so)", answer: "We have to wear life jackets on the boat, so we are safe." },
              { q: "She doesn't need to take. (add: what and why)", answer: "She doesn't need to take a coat because the water is warm." },
            ],
            frames: ["___ wants to ___ because ___.", "We have to ___, so ___."],
            checklist: [
              "wants, needs, has to with he, she or it: the -s is there",
              "to + a plain verb, and doesn't + a plain verb",
              "A comma before so; because and so each join my reason",
            ],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a short sentence is a quick way to practise the grammar in writing before the longer plan. Choose two or three error types for feedback, not everything: the -s on wants and needs, the word to, and the comma before so. Do item 1 together first.",
            tiers: [
              { level: "Support", task: "Expand items 1 and 2 with the frames on the board." },
              { level: "Core", task: "Expand all four items." },
              { level: "Stretch", task: "Write two more sentences about your own exploration with because and so." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My explorer kit",
        prompt: "Pack a bag (a real one or a drawing) for an exploration. Tell us where you want to go, what you need to take, and what you have to do before you go.",
        length: "60-90 seconds",
        steps: [
          "Pack your bag or draw it. Choose three things for your exploration.",
          "Say your talk three times to a grown-up or a toy. Each time, a little faster and smoother, like in class.",
          "Record it once. Show each thing as you talk.",
          "The last time, say it without looking at your drawing.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you want to do, what you need to take and what you have to do, and keep talking without long stops.",
        words: ["explore", "goggles", "camera", "rope", "life jacket", "dangerous"],
        grammar: ["want to + verb", "need to + verb", "have to + verb", "because / so"],
        rubric: [
          { label: "want, need, have to", description: "Uses want to, need to and have to with the little word to and a plain verb.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or so at least twice.", weight: 2 },
          { label: "Clear endings", description: "The -s on wants, needs and has to can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I want to explore ___.", "I need to take ___.", "I have to ___."], tips: ["Hold up each thing from your bag."] },
          { level: "Core", who: "Most children", frames: ["I want to explore ___ because ___.", "I need to take ___, so ___.", "I have to ___ before I go."], tips: ["Give a reason for each thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My friend doesn't need to take ___ because ___.", "Although it is ___, I want to ___."], tips: ["Tell about a friend too, and use although once."] },
        ],
      },
    },
  },
};
