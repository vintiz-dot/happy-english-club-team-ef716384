import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 18 "Origami and Art
// Tools" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8. Every lesson
// gets one fluency routine (the unit's words and grammar said again and again as whole
// phrases, a little faster each round, with Unit 17's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Lessons 2, 4 and 6 end with a recorded
// talk for home, built on the routine the class just did (Lesson 5 already has its own video).
// Time comes from games, chants and repeats, never from the book pages or the grammar.
// All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('How much paper is ...?'), or hold up a finger for the missing word or -s. Typical slips here: 'How many paper', 'There are a lot of glue', 'There aren't some', 'three seal' (no -s), 'There have'. For a sound, say it right and let the child echo it. Say every final -s clearly yourself: markers, scissors, crayons.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL2U18Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u18-l1": {
      objectives: ["I can say what I can do with paper, fast and without stopping: 'I can fold paper.'"],
      trim: { "Paper chant": 3, "Mystery bag: what do you notice?": 5, "Freeze and act (TPR)": 4, "Riddle race, then SB 176 C": 6 },
      add: [
        {
          after: "Fold: is it, or is it not?",
          slide: {
            kind: "fluency",
            title: "Paper sprint: what can I do?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "I can fold paper.",
              "I can crumple paper into a ball.",
              "I like shiny paper.",
              "I can climb a big tree.",
              "I would like to see big waves.",
            ],
            recycle: ["A circle has no corners.", "Is it a square? Yes, it is."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a word card (fold, crumple, shiny, climb, waves) and the class says a whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says a sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence, not one word: 'I can fold paper.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
            ],
            prompts: ["(card: fold)", "(card: crumple)", "(card: shiny)", "(card: climb)", "(card: waves)"],
            feedback: correct,
            teacherNote: "Whole sentences only: the aim is that 'I can crumple paper' comes out as one smooth piece. The words are the unit's new vocabulary, so the same sentence pattern carries many words and the children can say it quickly without searching. Listen for a missing final sound in 'fold' and 'crumple' and for 'I can to fold'. Mix in Unit 17 cards every few turns so those phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I can ___ paper.", "I like ___ paper."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I like shiny paper because it is pretty.'", frames: ["I like ___ because ___."] },
            ],
          },
        },
        {
          after: "What paper animals will she make? (SB 177 E)",
          slide: {
            kind: "writing",
            title: "Listen and build: my paper",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again. Write the key words you hear: paper, fold, crumple, boat, ball.",
              "In your group, build the text back together. It does not have to be word for word, but it must make sense.",
              "Read your text aloud, then compare with the screen.",
            ],
            text: {
              title: "My paper",
              text: "I have a piece of shiny paper. I can fold it into a boat. I can crumple it into a ball. I like paper because I can make a lot of things.",
            },
            frames: ["I have ___. I can ___ it into a ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end", "'fold' and 'crumple' have all their letters"],
            sayIt: "Read your text to the group, then say it again without looking.",
            teacherNote: "A dictogloss makes children listen for whole phrases and then use the grammar they heard. Read the text at normal speed both times and say the final sounds clearly. Before reading, remind the class of the pattern 'I can ___ it into a ___.' Do not correct spelling while they build; correct it when you compare.",
            tiers: [
              { level: "Support", task: "Build two sentences with the key words on the board and the frame." },
              { level: "Core", task: "Build the whole text with your group." },
              { level: "Stretch", task: "Build the text, then add one more sentence: 'I can fold it into a crane, too.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u18-l2": {
      objectives: ["I can tell Maki's story in four parts, faster each time."],
      trim: {
        "Cranes in a row chant": 3,
        "Panel theatre: freeze frames": 5,
        "Big idea chat: what can art make?": 3,
        "Picture walk: who and where? (before reading)": 4,
        "Think boxes: Maki and me (word web and Venn)": 8,
      },
      add: [
        {
          after: "Close your book: ask me about the panel",
          slide: {
            kind: "fluency",
            title: "Maki's story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, Maki wakes up.",
              "Next, she folds paper animals.",
              "Then she plays in the sea.",
              "She sees a boat.",
              "At the end, she makes a golden sun.",
            ],
            recycle: ["There are a lot of stars in the collage.", "I like it because it is shiny."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the picture cards in order. Say one sentence for each card.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: Maki wakes up)", "(picture: paper animals)", "(picture: the sea)", "(picture: a boat)", "(picture: a golden sun)"],
            feedback: correct,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes accuracy improve as well as speed. Listen for 'she fold' (missing -s) and 'play in sea' (missing the). Keep the picture cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, ___.", "Next, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all the parts without the frames." },
              { level: "Stretch", task: "Add how Maki feels: 'She is happy because she is in a paper world.'" },
            ],
          },
        },
        {
          after: "Draw and write: a scene and a link to me",
          slide: {
            kind: "writing",
            title: "Join the Maki sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in the brackets. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "Maki folds paper. Maki makes a seal. (and)", answer: "Maki folds paper and makes a seal." },
              { q: "Maki likes boats. I like trains. (but)", answer: "Maki likes boats, but I like trains." },
              { q: "Maki likes the sun. The sun is golden. (because)", answer: "Maki likes the sun because it is golden." },
              { q: "I like cranes. Maki likes cranes. (and)", answer: "Maki and I like cranes." },
            ],
            frames: ["___ and ___.", "___, but ___.", "___ because ___."],
            checklist: ["One capital letter and one full stop in my sentence", "My joining word is there: and, but or because", "'Maki likes' and 'she folds': the -s is there"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first item aloud and cross out the second 'Maki'. Vietnamese children often drop the -s on 'folds', 'makes' and 'likes'; make the -s a clear, slightly long sound when you read the items. The 'but' item links to the lesson's 'Maki and me' work.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write your own pair of sentences about you and a friend, and join them with 'but'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tell Maki's story",
        prompt: "Tell the story of Maki at home in four parts. Show a paper animal or a drawing for each part.",
        length: "45-90 seconds",
        steps: [
          "Look at your picture cards or your drawing from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell Maki's story in order with First, Next, Then and At the end, and keep talking without long stops.",
        words: ["fold", "crumple", "crane", "seal", "waves", "boat", "shiny", "golden"],
        grammar: ["First, / Next, / Then / At the end,", "Maki folds / plays / sees (-s on she)"],
        rubric: [
          { label: "Story order", description: "Tells the parts in order and uses First, Next, Then or At the end.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: fold, crane, seal, waves, golden.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear -s", description: "Says 'she folds', 'she plays', 'she sees' with the -s that can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, Maki ___.", "Then she ___.", "At the end, she ___."], tips: ["Point to each picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, Maki wakes up. Next, she ___.", "Then she ___ and sees ___.", "At the end, she makes ___."], tips: ["Say what Maki sees and what she makes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Maki likes ___, but I like ___.", "My favorite part is ___ because ___."], tips: ["Add one thing that is the same or different for you and Maki."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u18-l3": {
      objectives: ["I can ask and answer with 'How many' and 'How much' fast, round the circle."],
      add: [
        {
          after: "Practice with the pictures (SB 181 E)",
          slide: {
            kind: "writing",
            title: "Fix the art table sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Ask: can we count it? Then find the mistake.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "How many paper do you have?", answer: "How much paper do you have?" },
              { q: "There are three seal on the table.", answer: "There are three seals on the table." },
              { q: "I don't have some glue.", answer: "I don't have any glue." },
              { q: "There are a lot of paper.", answer: "There is a lot of paper." },
            ],
            checklist: ["Can I count it? How many + things with -s", "Can't count it: How much + paper, glue, water", "No sentence: any, not some"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "These four are the slips Vietnamese learners make most with this grammar: counting an uncountable noun, a missing plural -s, 'some' in a no-sentence, and 'are' with 'a lot of paper'. Fix item 1 together first, using the count-or-not question. Name the reason each time (count it or not, plural -s, any or some) so children learn what to check.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write a sentence with a mistake about the classroom for your partner to fix." },
            ],
          },
        },
        {
          after: "Look around the classroom (SB 181 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: How many? How much?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "How many crayons are there? There are five.",
              "How much paper is there? There is a lot.",
              "Is there any glue? Yes, there is some.",
              "Are there any scissors? No, there aren't any.",
            ],
            recycle: ["There are a lot of stars.", "There aren't any ovals."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card of art things." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Each child holds a picture card of art things, with the number shown (for example five crayons) or a lot (for example paper, glue).",
              "Show your card to the friend on your left and ask: 'How many ___ are there?' or 'How much ___ is there?'",
              "They look at your card and answer with There is or There are, then turn and ask the next friend about their own card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
            ],
            prompts: ["How many ___ are there?", "How much ___ is there?", "Is there any ___?", "Are there any ___?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes the question frames automatic. Time the whole circle and tell them; children love beating their own time. Use countable and uncountable cards in turn (crayons, markers, paper, glue, water) so children must choose between 'many' and 'much' each time. Watch for 'How many glue' and prompt with a raised finger: 'How m...?'",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on." },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a few or a lot of: 'There are a few markers, but there is a lot of paper.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u18-l4": {
      objectives: ["I can talk about my art tools three times, faster each time."],
      trim: { "Art tools chant": 3, "Art shop role play": 6 },
      add: [
        {
          after: "Guess my art (SB 183 E)",
          slide: {
            kind: "fluency",
            title: "Art tools talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same art tools talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "I like to make pictures.",
              "I use glue, scissors, and chalk.",
              "My favorite tool is chalk because it is colorful.",
              "We use scissors to cut paper.",
            ],
            recycle: ["Wow! What a nice picture!", "Thank you! I like your picture, too."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your art tools talk. The listener counts the tools on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. The new partner keeps the repetition real and the listener's job (count the tools) keeps them listening. Do not add new language between rounds; the gain comes from saying the same thing more fluently. In the fix minute, correct the listing sentence: 'glue, scissors, and chalk' with a pause for each comma, and the -s on 'scissors' and 'markers'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I use ___, ___, and ___.", "My favorite tool is ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add how you use a tool: 'We use glue to join paper. It is sticky!'" },
            ],
          },
        },
        {
          after: "@grammar",
          slide: {
            kind: "writing",
            title: "Add more to the list",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the short sentence with the teacher.",
              "Make it bigger: add two or three more things to make a list.",
              "Check your commas. Write it. Read it to your partner.",
            ],
            items: [
              { q: "I use glue. (add: scissors, chalk)", answer: "I use glue, scissors, and chalk." },
              { q: "The waves are big. (add: blue, shiny)", answer: "The waves are big, blue, and shiny." },
              { q: "{s1} made a sun. (add: a boat, a crane)", answer: "{s1} made a sun, a boat, and a crane." },
              { q: "We can fold. (add: crumple, climb)", answer: "We can fold, crumple, and climb." },
            ],
            frames: ["I use ___, ___, and ___.", "I can ___, ___, and ___."],
            checklist: ["A comma after each thing, except the last", "'and' before the last thing", "A capital letter at the start and a full stop at the end"],
            sayIt: "Read your list sentence to your partner, with a little pause at each comma. Then say it without looking.",
            teacherNote: "A comma is a spoken pause: have children say the list with a tiny stop at each comma and they will hear where the commas go. The unit's pattern is thing, thing, and thing. Check final sounds when reading aloud: scissors, markers, crayons.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames and word cards." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write a list sentence about your own art box with four things." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My art tools talk",
        prompt: "Show three art tools at home or draw them. Tell us what you use and what your favorite tool is.",
        length: "45-90 seconds",
        steps: [
          "Find or draw three art tools.",
          "Say your art tools talk three times: each time a little faster, like in class.",
          "Record it once. Use commas in your list: say it with little pauses.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Say a list of your art tools with little pauses and 'and' before the last one, and keep talking without long stops.",
        words: ["glue", "scissors", "chalk", "markers", "paper", "colorful"],
        grammar: ["I use ___, ___, and ___.", "My favorite tool is ___ because ___."],
        rubric: [
          { label: "List of tools", description: "Names three tools in a list with 'and' before the last: glue, scissors, and chalk.", weight: 3 },
          { label: "Favorite and why", description: "Says a favorite tool and gives a reason with because.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of scissors, markers and crayons can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I use ___ and ___.", "My favorite tool is ___."], tips: ["Hold up each tool as you say it."] },
          { level: "Core", who: "Most children", frames: ["I use ___, ___, and ___.", "My favorite tool is ___ because ___."], tips: ["Pause a little at each comma."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We use ___ to ___.", "I made a ___ with ___, ___, and ___."], tips: ["Say what each tool is for and what you made."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u18-l5": {
      objectives: ["I can tell my art report to three friends: 'It is a ___. It has ___.'"],
      trim: {
        "Art Club warm-up: Pass the picture": 3,
        "Act out the story": 9,
        "Gallery walk: find a report you like (SB 185 D)": 6,
        "Big Question 9: How do we make art? (SB 185)": 8,
        "Put it on the wall and tell the class (SB 185 C)": 8,
      },
      add: [
        {
          after: "Put it on the wall and tell the class (SB 185 C)",
          slide: {
            kind: "fluency",
            title: "Report talk: three tellings",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Tell your art report to three friends. Each time it sounds smoother.",
            chunks: [
              "This is my report. It is about my picture.",
              "It is a drawing of a boat.",
              "It has blue waves, a white sail, and a golden sun.",
              "I like it because it is shiny and bright.",
            ],
            recycle: ["How many boats are there? There are two boats.", "There is a lot of paper."],
            rounds: [
              { seconds: 60, say: "Tell your report to partner 1. The listener ticks the three parts they hear: what it is, what it has, why you like it." },
              { seconds: 50, say: "New partner. The same report. The listener asks one question at the end." },
              { seconds: 40, say: "New partner. The same report, smooth and fast. The listener says one thing they like." },
            ],
            steps: [
              "Stand by your report. Tell the three parts: what it is, what it has, why you like it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together. Then go on.",
              "Listeners: tick, then ask one question, then say one thing you like.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task with a new listener lets the child put the planning effort into the words. The listener has a job each time, so they really listen. Use the one-minute fix for the report's grammar: 'It has ___, ___, and ___' (commas as pauses, 'and' before the last thing) and the -s on plural things. Do not add new content between rounds.",
            tiers: [
              { level: "Support", task: "Read your three sentences from your report and look up at the end of each one.", frames: ["It is a ___.", "It has ___ and ___.", "I like it because ___."] },
              { level: "Core", task: "Tell your report without reading." },
              { level: "Stretch", task: "Add how many or how much: 'There are three boats and a lot of blue.'" },
            ],
          },
        },
        {
          after: "Gallery walk: find a report you like (SB 185 D)",
          slide: {
            kind: "writing",
            title: "Write a kind note to an artist",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model note with the teacher. Find the three parts: what you like, why, and thank you.",
              "Choose a report from the gallery walk. Write a kind note to its artist with the frames.",
              "Give the note to the artist and read it aloud together.",
            ],
            text: {
              title: "A note to Mai",
              text: "Dear Mai, I like your report. It has a lot of blue and a golden sun. I like the sun because it is bright. Thank you!",
            },
            frames: ["Dear ___, I like your ___.", "It has ___ and ___.", "I like the ___ because ___.", "Thank you!"],
            checklist: ["Dear ___, with a comma after the name", "I wrote because and a reason", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your note aloud to the artist, then say it again without looking.",
            teacherNote: "A modelled note gives children a whole shape to copy while the ideas are their own. Point out the comma after the name in the greeting and the full stops. The model uses the lesson's own sentences: 'It has ___ and ___.' and 'I like ___ because ___.' The name in the model is made up; children use a classmate's real name.",
            tiers: [
              { level: "Support", task: "Copy the model and change the colors and the name." },
              { level: "Core", task: "Write a note of your own with the frames." },
              { level: "Stretch", task: "Write a note with two reasons joined with 'and', and a question for the artist." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u18-l6": {
      objectives: ["I can say 'There is' and 'There are' sentences fast, with some, any, a few and a lot of."],
      trim: {
        "Remember it!": 5,
        "Art table race: run to the wall": 7,
        "Two art cupboards: find the differences": 10,
        "Say it, then write: my art box": 10,
      },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: art box sentences",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: count it or not?",
            chunks: [
              "There are six brushes.",
              "There is a lot of glue.",
              "There aren't any scissors.",
              "There isn't any green paint.",
              "I have a few markers and some chalk.",
            ],
            recycle: ["There are a lot of stars in the collage.", "There isn't any blue paint left."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a picture card, the class says the sentence." },
              { seconds: 45, say: "The left side of the room says the 'There is' cards, the right side says the 'There are' cards. Then swap sides." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute and fix the two mistakes you heard most on the board. Then go on.",
            ],
            feedback: correct,
            teacherNote: "A quick, high-energy recall that makes children choose 'is' or 'are' and 'some' or 'any' every few seconds, which is what turns the rule into a habit. Mixing in Unit 17 phrases (spaced retrieval) keeps last unit's grammar from fading. Listen for 'There have' and 'There is a lot of markers'.",
            tiers: [
              { level: "Support", task: "Say the sentences with the picture cards and the frames on the board.", frames: ["There is ___.", "There are ___."] },
              { level: "Core", task: "Say the sentences from the card alone." },
              { level: "Stretch", task: "Make a new sentence from each card: 'There are six brushes, but there isn't any paint.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my art box",
          slide: {
            kind: "writing",
            title: "Join the art box sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in the brackets. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "There is some glue. There isn't any paint. (but)", answer: "There is some glue, but there isn't any paint." },
              { q: "There are a few markers. There are a lot of crayons. (and)", answer: "There are a few markers and a lot of crayons." },
              { q: "We need glue. There isn't any in the box. (because)", answer: "We need glue because there isn't any in the box." },
            ],
            frames: ["There is ___, but there isn't any ___.", "There are ___ and ___."],
            checklist: ["There is + can't count, There are + more than one", "My joining word is there: and, but or because", "A capital letter and a full stop"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "This keeps the writing close to the speaking: the same sentences from the champion sprint, now joined. Model the first item aloud and point to the comma before 'but'. In the second item, 'a few markers and a lot of crayons' are both things we can count, so check that children say 'There are'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher." },
              { level: "Core", task: "Do all three items." },
              { level: "Stretch", task: "Write two of your own joined sentences about your art box, one with 'but' and one with 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My art box talk",
        prompt: "Open a box, bag or drawer with art things. Tell us what is in it: how many, how much, and what is not in it.",
        length: "45-90 seconds",
        steps: [
          "Find or draw an art box with some tools in it.",
          "Say your art box talk three times: each time a little faster.",
          "Record it once. Show each thing as you say it.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what is in your art box with There is and There are, say what is not in it with any, and keep talking without long stops.",
        words: ["glue", "paper", "markers", "crayons", "scissors", "paint"],
        grammar: ["There are ___ (a few / a lot of ___ things).", "There is some ___. / There isn't any ___."],
        rubric: [
          { label: "Is or are", description: "Says 'There are' with things you can count and 'There is' with things you can't count.", weight: 3 },
          { label: "Some and any", description: "Uses some for what is in the box and any for what is not: 'There isn't any paint.'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear -s", description: "Says the -s on markers, crayons and scissors so it can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["There are ___.", "There is ___.", "There isn't any ___."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["There are a few ___ and a lot of ___.", "There is some ___, but there isn't any ___."], tips: ["Say one thing that is NOT in your box."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["How many ___ do you have? I have ___.", "I need ___ because there isn't any ___."], tips: ["Ask the watcher a question and say what you need."] },
        ],
      },
    },
  },
};
