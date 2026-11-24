import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 18 "Origami and Art
// Tools" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so the
// Lab raises everything it adds: longer chunks with reasons and contrasts, opinions, and full
// paragraphs. Every lesson gets a grammar drill (the unit's structures changed fast and then
// used for real talk), one more fluency routine and one writing routine. Lessons 2, 4 and 6
// end with a recorded talk (90-120 seconds, made alone). Time comes from dropping or trimming
// the games and chants made for younger children, never from the book pages or the grammar.
// All text is original.

const fix = (example: string) =>
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, write them on the board and let the class fix them in one minute: students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: " +
  example +
  " For a sound, just say it right and let the student echo it. Say every final sound clearly yourself (-s, -ed, the t of isn't): students copy what they hear.";

const drillFix = (example: string) =>
  "Prompt, do not tell. " +
  example +
  " In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillSigns =
  "Whole class: the teacher says a sentence and shows a sign (? = make it a question, X = make it negative, + = join with because, although, so or when, T = change the time, P = change the person or the thing). The class says the new sentence together.";

export const odL2U18Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u18-l1": {
      objectives: [
        "I can talk about what I can do with paper and what I like, and give a reason for each.",
        "I can write a short text with linking words (first, then, although, so) about making something from paper.",
      ],
      drop: ["Paper chant", "Freeze and act (TPR)"],
      trim: { "Mystery bag: what do you notice?": 4, "Riddle race, then SB 176 C": 6 },
      add: [
        {
          after: "Fold: is it, or is it not?",
          slide: {
            kind: "fluency",
            title: "Paper sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say a whole sentence with two parts and a reason, fast and smooth, with no stops.",
            chunks: [
              "I fold my notes into small squares because they fit in my pocket.",
              "Although crumpled paper looks messy, it makes a great texture for an art project.",
              "I like shiny paper because it catches the light, but it is hard to write on.",
              "I would like to climb the tallest tree in my neighborhood, although my mom says it is dangerous.",
              "Big waves are exciting to watch, but I would never swim in them.",
            ],
            recycle: ["A circle has no corners, but a square has four.", "Is it a square? No, it isn't. It's a rectangle."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a word card (fold, crumple, shiny, climb, waves) and the class says a whole sentence with a reason." },
              { seconds: 75, say: "Pairs: one shows a card, the other says a TRUE sentence about their own life with a reason or a contrast. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many true sentences with because, although or but can you say?" },
            ],
            steps: [
              "Look at the card. Say a WHOLE sentence with a reason, not just the word.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers and try to beat your own score.",
            ],
            prompts: ["(card: fold)", "(card: crumple)", "(card: shiny)", "(card: climb)", "(card: waves)"],
            feedback: fix("point to the frame on the board, or start the phrase and pause ('I fold my notes into ...?'). If a student says 'I can to fold', hold up a finger for the extra word. Sounds: for 'crumple' say it slowly and let the student echo the -mp-."),
            teacherNote: "Whole sentences with a reason: the aim is one smooth sentence of 12 to 15 words, not five single words. The unit's new words carry the same patterns (can, like, would like), so students can say them quickly without searching. Listen for a missing final sound in 'fold' and 'crumple', for 'I can to fold' and for 'because' used without a second clause. Mix in Unit 17 phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frames on the board and a partner.", frames: ["I like ___ because ___.", "I can ___, but I can't ___."] },
              { level: "Core", task: "Say a sentence with a reason alone, without looking at the board." },
              { level: "Stretch", task: "Add a contrast and an example: 'Although shiny paper is expensive, I use it for gifts because it looks special.'", frames: ["Although ___, ___ because ___."] },
            ],
          },
        },
        {
          after: "Tell me about paper",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about what you can do and like fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about your own life.",
            chunks: [
              "I can fold a paper plane in about a minute, but I can't make a crane yet.",
              "Can you fold a crane? Yes, I can. / No, I can't, but I would like to learn.",
              "I don't like crumpled paper because it looks messy, although I use it for drawings.",
              "I like shiny paper because it makes my projects look professional.",
              "Yesterday I forgot my glue, so I borrowed some from a friend.",
              "My friends can't draw very well, but they are good at making models.",
            ],
            recycle: ["There are a lot of stars in the picture.", "Is it a circle? No, it isn't."],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, my friend, we." },
              { seconds: 90, say: "Real talk: ask your partner what they can do well, what they like making and what they forgot once. Answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Can, Do or Did, X = can't, don't or didn't, + = join with because, although, so or when, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the -s after he and she and the plain verb after do, does or did.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner can do and likes, and remember one answer to tell another pair.",
            ],
            prompts: ["I can fold a paper plane. (?)", "My friend likes shiny paper. (X)", "I forgot my glue. (+ so)", "I can draw well. (+ although)", "I fold a paper plane every day. (T: yesterday)", "I like crumpled paper. (P: my sister)"],
            feedback: drillFix("For 'Do you can fold?' hold up one finger and say 'Can you ...?' with a rising voice. For a missing -s in 'she likes', tap the table once. For 'I didn't forgot', point to didn't and say 'plain verb?'. Say the final -s and the -ed of 'likes' and 'folded' clearly yourself."),
            teacherNote: "Lesson 1 has no grammar slide, so the drill takes the structures of the lesson (can, like, would like, the past of forget) and puts the thinking into the joining words (because, although, so). Students in grades 6-7 hold two clauses easily when the first one is a chunk they know. Round 3 is the point: real answers about real lives. If a student needs a word the unit does not teach, give it and move on.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Can you ___?", "Yes, I can. / No, I can't.", "I don't like ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I can fold a plane, but my brother can fold a crane. Can you fold anything difficult?'" },
            ],
          },
        },
        {
          after: "What paper animals will she make? (SB 177 E)",
          slide: {
            kind: "writing",
            title: "Listen and build: my paper model",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Listen to the text once. Do not write yet.",
              "Listen again. Write the key words you hear: model city, folded, crumpled, although, cousin, team.",
              "In your group, build the text back together. It does not have to be word for word, but it must make sense and keep the linking words.",
              "Read your text aloud, then compare it with the screen. Find one difference and decide which version you prefer.",
            ],
            text: {
              title: "My paper model",
              text: "Last weekend I made a model city from paper and cardboard. First, I folded sheets of shiny paper into tall buildings. Then I crumpled gray paper to make the rough ground, although it took longer than I expected. My cousin wanted to help, so I gave him the scissors and a few easy shapes. In the end, we made a great team.",
            },
            frames: ["First, I ___ . Then I ___, although ___.", "___ wanted to help, so ___."],
            checklist: ["A capital letter at the start of each sentence and a full stop at the end", "Past verbs with -ed (folded, crumpled, wanted) and the irregular ones (made, took, gave)", "A comma after First, Then and In the end"],
            sayIt: "Read your text to the group, then say it again without looking.",
            teacherNote: "A dictogloss makes students listen for whole phrases and then rebuild them with the grammar they heard. Read the text at normal speed both times and say the final sounds clearly. Before reading, remind the class that the text is in the past. Do not correct spelling while they build; correct it when you compare, and ask students to notice the linking words (although, so) because those are the hardest part to remember.",
            tiers: [
              { level: "Support", task: "Build the first three sentences with the key words on the board and the frames." },
              { level: "Core", task: "Build the whole text with your group." },
              { level: "Stretch", task: "Build the text, then add one more sentence with a reason: 'I want to make a model of my school next because it is the building I know best.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u18-l2": {
      objectives: [
        "I can retell Maki's story in the past tense, in order, with a reason for what she did.",
        "I can write a paragraph of six to eight sentences with linking words and give an opinion about the story.",
      ],
      drop: ["Cranes in a row chant"],
      trim: {
        "Panel theatre: freeze frames": 6,
        "Big idea chat: what can art make?": 3,
        "Picture walk: who and where? (before reading)": 4,
        "Think boxes: Maki and me (word web and Venn)": 8,
        "Word detectives: find it, circle it, show it": 5,
        "Close your book: ask me about the panel": 5,
        "Draw and write: a scene and a link to me": 4,
      },
      add: [
        {
          after: "Close your book: ask me about the panel",
          slide: {
            kind: "fluency",
            title: "Maki's story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Tell the same story three times to a new partner. Each telling is shorter, smoother and faster, and keeps the reasons.",
            chunks: [
              "First, Maki woke up and folded paper animals because she wanted some company.",
              "Next, she took them to the sea and played with them, although the water was cold.",
              "Then she saw a boat and climbed in, but the waves were big, so she held on tightly.",
              "In the end, she made a golden sun, which showed that art can turn a scary moment into something beautiful.",
            ],
            recycle: ["There were a lot of stars in the collage.", "I liked it because it was shiny."],
            rounds: [
              { seconds: 75, say: "Tell your partner the story with the four picture cards. Add one reason." },
              { seconds: 65, say: "New partner. Tell it again in less time, with the same reason." },
              { seconds: 60, say: "New partner. Tell it again, fast and smooth, and finish with what you think about the story." },
            ],
            steps: [
              "Put the picture cards in order. Say one or two sentences for each card, with the linking words First, Next, Then, In the end.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on.",
              "When the bell rings, find a new partner.",
              "The listener asks one question at the end ('Why did she climb into the boat?') and the speaker answers it.",
            ],
            prompts: ["(picture: Maki wakes up)", "(picture: paper animals)", "(picture: the sea)", "(picture: a boat and big waves)", "(picture: a golden sun)"],
            feedback: fix("point to the frame, or start the phrase and pause ('Next, she took them to ...?'). For 'she fold' or 'she play', hold up a finger for the -ed. For the irregular verbs (woke, took, saw, made), say the first sound and let the student finish it."),
            teacherNote: "The same story three times on purpose: the second and third tellings free students to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes accuracy improve as well as speed. The story is told in the past, so listen for 'she fold', 'she see' and 'she make' (missing past forms). Keep the picture cards on the board for Support students and remind everyone that each telling should be shorter but keep the because, although or so.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, Maki ___.", "Next, she ___.", "In the end, she ___."] },
              { level: "Core", task: "Tell all the parts with a reason, without the frames." },
              { level: "Stretch", task: "Add how Maki feels and why, and compare with you: 'She was brave because she stayed in the boat, but I think I would be scared.'" },
            ],
          },
        },
        {
          after: "I like ..., but I don't. Do you agree?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about the story and about last week fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about what you made or did.",
            chunks: [
              "Yesterday Maki folded ten paper animals because she wanted to play with them.",
              "Did she play on the beach? Yes, she did. / No, she didn't, but she played in the sea.",
              "She didn't go home when she saw the boat, although the waves were big.",
              "Last weekend I folded a paper crane for my friend, and she put it on her desk.",
              "Did you make anything last week? What did you make, and why?",
              "My brother didn't help me, so I finished the project alone.",
            ],
            recycle: ["I like shiny paper because it catches the light.", "Do you agree? I agree, too."],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the person too: Maki, I, my friend, we." },
              { seconds: 90, say: "Real talk: ask your partner what they made, read or did last weekend. Answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Did, X = didn't, + = join with because, although or so, T = now (present) or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the plain verb after did and didn't (not 'did she played').",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner did last weekend, and remember one answer to tell another pair.",
            ],
            prompts: ["Maki folded paper animals. (?)", "She saw a boat. (X)", "She climbed into the boat. (+ because)", "The waves were big. (+ although)", "I made a crane last week. (T: every week)", "Maki folded paper animals. (P: my friend and I)"],
            feedback: drillFix("For 'Did she played?' hold up one finger and say 'Did she ...?' with a rising voice. For 'She didn't saw', point to didn't and say 'plain verb?'. For a missing -ed in 'folded', tap the table once. Say the final -ed of 'folded' and 'wanted' clearly yourself."),
            teacherNote: "Lesson 2 has no grammar slide, so the drill takes the past tense of the story and puts the thinking into the joining words. The signs let students change one sentence in five ways, which is exactly the control they need for the paragraph that follows. Round 3 makes it real: they say what they actually did. Students in grades 6-7 can hold two clauses easily; expect them to push for longer answers than the book asks for.",
            tiers: [
              { level: "Support", task: "Use only ? and X with Maki and I, with the frames on the board.", frames: ["Did you ___?", "Yes, I did. / No, I didn't.", "I didn't ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'Maki stayed in the boat, but I would have jumped out. What would you have done?'" },
            ],
          },
        },
        {
          after: "Draw and write: a scene and a link to me",
          slide: {
            kind: "writing",
            title: "Maki's story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, First, Then, For example, In the end and In conclusion.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences in the past tense. Use linking words (first, then, however, because, for example, in conclusion) and give a reason or an example for each detail.",
              "Check: tick the checklist. Your partner underlines every past verb and every linking word.",
              "Teacher: look first at the past verbs and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Maki's story",
              text: "Maki's story is about a girl who builds a whole world out of paper. First, she woke up and folded paper animals because she wanted some friends. Then she played in the sea with them, but the waves were big, so she climbed into a boat. For example, the boat stayed safe because she held on to the sides. In the end, she made a golden sun, and the sky became bright again. In conclusion, I think the story shows that art can help us when we feel afraid.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who is the story about, and what is special about her?" },
              { label: "Detail 1", prompt: "What did Maki do first, and why? (First ... because ...)" },
              { label: "Detail 2", prompt: "What problem did she have, and what did she do? (Then ... but ... so ...)" },
              { label: "Example", prompt: "Give one example of how she solved the problem. (For example ...)" },
              { label: "Closing", prompt: "How did the story end, and what do you think about it? (In the end ... In conclusion ...)" },
            ],
            frames: ["___'s story is about ___.", "First, ___ because ___.", "Then ___, but ___, so ___.", "In conclusion, I think ___."],
            checklist: [
              "A capital letter at the start and a full stop at the end of every sentence",
              "Past verbs (woke, folded, played, saw, made): no present verbs by mistake",
              "At least three linking words (first, then, however, because, for example, in conclusion)",
              "A reason or an example for every detail",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the story again without looking, like a storyteller.",
            teacherNote: "A full paragraph of six to eight sentences: a topic sentence, two details with a reason or an example, and a closing opinion. Grades 6-7 can plan with a few words per box instead of drawings. The linking words come from the drill and the retell; ask each student to use at least three. Mark only the past verbs and the linking words and let the student find the mistake from your dot. This paragraph is the script for the recorded talk 'Tell Maki's story': the student keeps three key words per box, not the full text.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill them in; write six sentences.", frames: ["___'s story is about ___.", "First, ___ because ___.", "In the end, ___."] },
              { level: "Core", task: "Write six to eight sentences, one for each box and a detail or an example, with three linking words." },
              { level: "Stretch", task: "Add a sentence about you and a contrast: 'Although Maki was brave, I think I would have been scared, because I don't like deep water.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tell Maki's story",
        prompt: "Tell the story of Maki in the past tense and say what you think about it. Give a reason and an example for what you say.",
        length: "90-120 seconds",
        steps: [
          "Look at your paragraph from class. Write three key words for each part of the story, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read your paragraph word for word.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you said?",
        ],
        maxSeconds: 180,
        kidSummary: "Tell Maki's story in order in the past tense, give a reason or an example for what happens, and say what you think about the story.",
        words: ["fold", "crumple", "crane", "seal", "waves", "boat", "shiny", "golden"],
        grammar: ["First, / Then / However, / In the end,", "Maki folded / played / saw / made (past)", "I think ___ because ___. For example, ___."],
        rubric: [
          { label: "Story order", description: "Tells the parts in order and uses First, Then, However or In the end.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so or for example.", weight: 3 },
          { label: "Past verbs", description: "Uses the past tense (woke, folded, saw, made); the -ed can be heard.", weight: 2 },
          { label: "Unit words", description: "Uses words from the unit: fold, crane, seal, waves, golden.", weight: 1 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["First, Maki ___ because ___.", "Then she ___.", "In the end, she ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["First, Maki ___ because ___. Then ___, but ___.", "For example, ___.", "In the end, ___."], tips: ["Give one reason and one example in the middle of the story."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although Maki was ___, she ___.", "I think the story shows that ___ because ___. For example, ___."], tips: ["Give a contrast, an opinion, and a reason with an example."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u18-l3": {
      objectives: [
        "I can ask and answer questions with How many and How much, and use some, any, a few and a lot of, with a reason or a detail.",
        "I can write a paragraph of six to eight sentences about my desk or my workspace.",
      ],
      drop: ["Back-to-back sentences, then fold a paper boat"],
      trim: {
        "Song: sing along (SB 181 D)": 6,
        "Can we count it? Trays of things": 5,
        "Story order relay (SB 180 B)": 6,
        "What do you think? Stand on the line (SB 180 Think)": 5,
      },
      add: [
        {
          after: "Practice with the pictures (SB 181 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 8,
            goal: "Change a sentence with How many, How much, some, any, a few and a lot of fast and right: ask it, say no, join it with a reason, change the time or the thing. Then talk about your own school and phone.",
            chunks: [
              "How many markers are there in your art box, and how much paper do you have?",
              "There are a few markers on the table, but there isn't any glue, so we can't finish the poster.",
              "Are there any scissors in the classroom? Yes, there are some in the drawer.",
              "Is there any paint left? No, there isn't any, so we need to buy some.",
              "There were a lot of students at the art fair, and there was a lot of noise.",
              "How many apps are there on your phone, and how much time do you spend on them?",
            ],
            recycle: ["There are a lot of stars in the collage.", "There isn't any blue paint left."],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the thing too: markers (count) to glue (can't count) and back." },
              { seconds: 90, say: "Real talk: ask your partner about the things in their bag, on their phone or in their city. Use How many and How much, answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with How many, How much, Is there any or Are there any, X = isn't any, aren't any or don't have any, + = join with because, although or so, T = now or in the past (was, were), P = change the thing.",
              "Say the WHOLE new sentence. Check is or are, some or any, and many or much every time.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out how many and how much your partner has, and remember one answer to tell another pair.",
            ],
            prompts: ["There are five markers on the desk. (?)", "There is a lot of glue. (X)", "There aren't any scissors. (+ so)", "There is some paint. (+ although)", "There are a lot of students here. (T: yesterday)", "There is a lot of paper. (P: markers)"],
            feedback: drillFix("For 'How many paper?' hold up one finger and say 'How m...?'. For 'There are a lot of paper', point to 'paper' and say 'count it?'. For 'Is there any markers?' ask 'one or more?' and let the student fix it. Say the -s of markers and scissors clearly yourself."),
            teacherNote: "The drill makes students choose between How many and How much, is and are, some and any every few seconds, which is what turns the rule into a habit. Use countable and uncountable things in turn (markers, paper, apps, time, homework). Round 3 is the point: real answers about school, phones and the neighborhood. Typical slips: 'How many paper', 'There are a lot of glue', 'There aren't some', 'three seal' (no -s), 'There have'.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["How many ___ are there?", "How much ___ is there?", "There isn't any ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new thing each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'There are a lot of apps on my phone, but I only use a few. How about you?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "My workspace: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, First, Also, However and the closing sentence. Underline what we can count, what we can't count and what is missing.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences. Use are for things you can count and is for things you can't, and give a reason or an example for each detail.",
              "Check: tick the checklist. Your partner underlines every is / are and every some / any.",
              "Teacher: look first at is / are, some / any and a few / a lot of. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: my desk",
              text: "My desk at home is the place where I do my homework and my art projects. First, there are a lot of useful things on it, for example a few markers, six pencils, and two rulers. Also, there is some glue and a lot of paper, but there isn't any paint because it is too messy. However, I need some paint for my next poster, so I am going to ask my teacher if there are any old tubes in the art room. In conclusion, my desk is small, but I use it every day.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Where do you work or make things, and why is it important?" },
              { label: "Things I can count", prompt: "What is on it? How many? (There are a few ... for example ...)" },
              { label: "Things I can't count", prompt: "What is there a lot of or some of? (There is some ... and a lot of ...)" },
              { label: "What is missing", prompt: "What isn't there, and why? What do you need? (However, there isn't any ... because ...)" },
              { label: "Closing", prompt: "What do you think about your workspace? (In conclusion ...)" },
            ],
            frames: ["My ___ is the place where I ___.", "First, there are ___, for example ___.", "Also, there is some ___, but there isn't any ___ because ___.", "In conclusion, ___."],
            checklist: [
              "There are + things I can count, There is + things I can't count",
              "some for what is there, any for what is not (isn't any, aren't any)",
              "At least three linking words (first, also, however, because, for example, in conclusion)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then say it again without looking, like a guide who shows a visitor round the room.",
            teacherNote: "A description of the student's own workspace, planned with a few words per box, so the unit's grammar (How many, How much, some, any, a few, a lot of) is used in connected writing and not in single sentences. The typical slips (how many paper, three seal, don't have some, a lot of paper with are) are exactly what the dot should point at. Mark only is / are, some / any and the linking words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the things from your plan; write six sentences.", frames: ["There are ___.", "There is ___.", "There isn't any ___ because ___."] },
              { level: "Core", task: "Write six to eight sentences, one for each box and a detail or an example." },
              { level: "Stretch", task: "Add a sentence with a contrast and a question: 'Although my desk is small, I like it. How about yours?'" },
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
            minutes: 7,
            goal: "Ask, answer with a reason or a detail, turn and ask the next student. Keep the chain going with no stops!",
            chunks: [
              "How many apps are on your phone? There are about thirty, but I only use a few.",
              "How much homework is there tonight? There is a lot, so I can't play sports.",
              "Is there any glue in the art room? Yes, there is some, although there isn't a lot.",
              "Are there any students in the library at lunch? Yes, there are a few, because it is quiet.",
            ],
            recycle: ["There are a lot of stars.", "There aren't any ovals."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a topic card (school, phones, sport, our city) with a count or a quantity." },
              { seconds: 75, say: "Swap cards. Ask a new question and add a reason. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Each student holds a topic card with a count or a quantity (for example 'phones: 3 apps' or 'homework: a lot').",
              "Show your card to the student on your left and ask 'How many ___ are there?' or 'How much ___ is there?'",
              "They answer with There is or There are and a reason or a detail, then turn and ask the next student about their own card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
            ],
            prompts: ["How many ___ are there?", "How much ___ is there?", "Is there any ___?", "Are there any ___?"],
            feedback: fix("for 'How many glue' hold up a raised finger and say 'How m...?'. For 'There is a lot of markers', point to 'markers' and say 'count it?'. Say the -s of markers and scissors yourself."),
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes the question frames automatic. Time the whole circle and tell the class; students like beating their own time. Use countable and uncountable cards in turn so students must choose between many and much each time, and require a reason or a detail after each answer so the sentences get longer. Watch for 'How many homework' and prompt with a raised finger: 'How m...?'",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on." },
              { level: "Core", task: "Ask and answer with a reason, without looking at the board." },
              { level: "Stretch", task: "Add a contrast: 'There are a few markers, but there is a lot of paper, so we can start.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u18-l4": {
      objectives: [
        "I can talk about the tools I use and why, in a list with commas and a reason.",
        "I can expand a short sentence into a longer one with a list, a reason and a contrast.",
      ],
      drop: ["Art tools chant", "Art shop role play"],
      add: [
        {
          after: "Guess my art (SB 183 E)",
          slide: {
            kind: "fluency",
            title: "Art tools talk: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Give the same talk about your tools and projects to three partners. Each talk is shorter and smoother, and keeps its reasons.",
            chunks: [
              "I like to make posters for my school because they help me express my ideas.",
              "My favorite tool is chalk because it is easy to change, although it makes my hands dirty.",
              "We use scissors to cut paper, and we use glue to join the pieces together.",
              "Digital tools, such as a tablet and a drawing app, are useful, but I still prefer real paper.",
            ],
            recycle: ["I made a sun, a boat, and a crane.", "Thank you! I like your picture, too."],
            rounds: [
              { seconds: 75, say: "Partner 1: give your talk. The listener counts the tools and writes down one reason." },
              { seconds: 65, say: "Partner 2: the same talk in less time, with the same reason." },
              { seconds: 60, say: "Partner 3: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds. Both partners talk in every round.",
            ],
            feedback: fix("point to the list pattern and pause at each comma ('glue, scissors, ... and ...?'). For a missing -s on 'scissors' or 'markers', tap your wrist."),
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity. The new partner keeps the repetition real and the listener's job (count the tools, write one reason) keeps them listening. Do not add new language between rounds; the gain comes from saying the same thing more fluently. In the fix minute, correct the listing sentence: 'glue, scissors, and chalk' with a pause for each comma, the -s on 'scissors' and 'markers', and a reason joined with because or although.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I use ___, ___, and ___.", "My favorite tool is ___ because ___."] },
              { level: "Core", task: "Say four or five sentences with a reason, without the board." },
              { level: "Stretch", task: "Add a comparison and an example: 'I prefer real paper to a tablet because it feels more natural. For example, I can fold it.'" },
            ],
          },
        },
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence with a list fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about the tools and projects you really use.",
            chunks: [
              "I use glue, scissors, and markers to make posters for my school.",
              "What do you use to make your projects? I use a ruler, a pencil, and a lot of patience.",
              "I don't use glitter, paint, or clay because they are messy, although they look great.",
              "Yesterday we cut, folded, and glued a huge paper map of our city.",
              "My friends and I made a poster, a model, and a short video for the science fair.",
              "Do you prefer drawing by hand or on a tablet, and why?",
            ],
            recycle: ["There is some glue, but there isn't any paint.", "How many brushes are there?"],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the list too: three new things each time, with the commas in the right place." },
              { seconds: 90, say: "Real talk: ask your partner what they use to make a project for school or for fun. Answer with a list of three, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with What, Do or Did, X = don't, doesn't or didn't, + = join with because, although or so, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence with a small pause at each comma and 'and' before the last thing.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what tools and materials your partner uses, and remember one answer to tell another pair.",
            ],
            prompts: ["I use glue, scissors, and markers. (?)", "My friend uses chalk. (X)", "We cut, folded, and glued the paper. (+ because)", "I use a tablet. (+ although)", "I use glue, scissors, and markers. (T: yesterday)", "I use glue, scissors, and markers. (P: my sister)"],
            feedback: drillFix("For 'I use glue scissors and chalk', say the sentence with a stop at each comma and let the student echo it. For 'Do you uses?', hold up one finger and say 'Do you ...?'. For a missing -s on 'markers', tap the table once. Say the -s of 'markers' and 'scissors' clearly yourself."),
            teacherNote: "The unit's grammar practice here is the comma list, so the drill puts a list into every sentence and lets the signs change the rest. A comma is a spoken pause: students who say the list with a tiny stop at each comma hear where the commas go. Round 3 is the point: real answers about the tools they really use. Students in grades 6-7 can hold a list, a reason and a contrast in one breath if the first part is a chunk they know.",
            tiers: [
              { level: "Support", task: "Use only ? and X with a list of two, with the frames on the board.", frames: ["What do you use to ___?", "I use ___ and ___.", "I don't use ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a list of three each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I use paper, pencils, and a ruler, but my brother only uses a tablet. What do you prefer, and why?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "Add more to the sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the short sentence with the teacher.",
              "Make it bigger: add a list of two or three more things, then a reason, a contrast or a time.",
              "Check your commas. Write it. Read it to your partner with a little pause at each comma.",
            ],
            items: [
              { q: "I use glue. (add: scissors, chalk; add a reason with because)", answer: "I use glue, scissors, and chalk because they are easy to find at school." },
              { q: "The waves were big. (add: blue, shiny; add a contrast with although)", answer: "The waves were big, blue, and shiny, although the water was very cold." },
              { q: "{s1} made a sun. (add: a boat, a crane; add where)", answer: "{s1} made a sun, a boat, and a crane for the class display." },
              { q: "We can fold. (add: crumple, tear; add a contrast with but)", answer: "We can fold, crumple, and tear paper, but we can't use glue without scissors." },
              { q: "My bag has paper. (add: three markers, a ruler; add when)", answer: "My bag has paper, three markers, and a ruler, so I am ready when the art class starts." },
            ],
            frames: ["I use ___, ___, and ___ because ___.", "We can ___, ___, and ___, but ___."],
            checklist: ["A comma after each thing, except the last", "'and' before the last thing", "A reason or a contrast joined with because, although, but or so", "A capital letter at the start and a full stop at the end"],
            sayIt: "Read your long sentence to your partner, with a little pause at each comma. Then say it without looking.",
            teacherNote: "A comma is a spoken pause: have students say the list with a tiny stop at each comma and they will hear where the commas go. The unit's pattern is thing, thing, and thing, and the extra part turns the list into the longer sentence that students in grades 6-7 should be writing. Check final sounds when reading aloud: scissors, markers, crayons.",
            tiers: [
              { level: "Support", task: "Do items 1, 3 and 4 with the frames and word cards." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two longer sentences about your own art box or desk with four things and a contrast." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My art tools talk",
        prompt: "Talk about the tools and materials you use to make things: which ones you use, which is your favorite and why, and how you use it. Give a reason and an example.",
        length: "90-120 seconds",
        steps: [
          "Choose three tools or materials you really use. Write three key words for each one, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and say your list with small pauses at the commas.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you said?",
        ],
        maxSeconds: 180,
        kidSummary: "Say a list of the tools you use with pauses and 'and' before the last one, say which is your favorite and why, and give an example of how you use it.",
        words: ["glue", "scissors", "chalk", "markers", "paper", "colorful"],
        grammar: ["I use ___, ___, and ___.", "My favorite tool is ___ because ___. For example, ___."],
        rubric: [
          { label: "List of tools", description: "Names three tools in a list with 'and' before the last: glue, scissors, and chalk.", weight: 3 },
          { label: "Reasons and examples", description: "Says a favorite tool and gives at least two reasons or examples with because, although or for example.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of scissors and markers can be heard.", weight: 1 },
          { label: "Unit words", description: "Uses words from the unit: glue, scissors, chalk, markers, colorful.", weight: 1 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["I use ___, ___, and ___.", "My favorite tool is ___ because ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["I use ___, ___, and ___ to make ___.", "My favorite tool is ___ because ___. For example, ___."], tips: ["Give one reason and one example for your favorite tool."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["I prefer ___ to ___ because ___.", "Although ___ is useful, ___."], tips: ["Compare two tools and give an opinion with a reason."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u18-l5": {
      objectives: [
        "I can present my art report to a partner in three tellings, with what it is, what it has and why I like it.",
        "I can write feedback to an artist with a compliment, a reason and a suggestion.",
      ],
      drop: ["Art Club warm-up: Pass the picture"],
      trim: {
        "Act out the story": 10,
        "Gallery walk: find a report you like (SB 185 D)": 6,
        "Big Question 9: How do we make art? (SB 185)": 8,
        "Put it on the wall and tell the class (SB 185 C)": 8,
        "What did they make? Ask me about the story": 5,
      },
      add: [
        {
          after: "What did they make? Ask me about the story",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about the story and the art reports fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about what you made.",
            chunks: [
              "My partner made a poster about our city, and she used markers, paint, and old magazines.",
              "Did you use any glue? Yes, I did. / No, I didn't, because I used tape.",
              "I liked the blue waves in his picture because they looked real, although he only used colored pencils.",
              "There were a lot of reports on the wall, but there weren't any boring ones.",
              "This report has two pictures, three paragraphs, and a title that is easy to read.",
              "How many reports did you read, and which one did you like most?",
            ],
            recycle: ["There are a few markers, but there isn't any glue.", "I use glue, scissors, and chalk."],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the person too: I, my partner, they, we." },
              { seconds: 90, say: "Real talk: ask your partner what they made for their report, what they used and what they liked about someone else's. Answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Did or How many, X = didn't, wasn't or weren't, + = join with because, although or so, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the plain verb after did and didn't and was or were in the right place.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner made and used, and remember one answer to tell another pair.",
            ],
            prompts: ["She made a poster. (?)", "He used glue. (X)", "They used colored pencils. (+ because)", "The report was long. (+ although)", "I make a report every term. (T: last term)", "My partner made a poster. (P: my friends and I)"],
            feedback: drillFix("For 'Did you used?' hold up one finger and say 'Did you ...?' with a rising voice. For 'He didn't used', point to didn't and say 'plain verb?'. For 'There was a lot of reports', ask 'one or more?'. Say the -ed of 'used' and the -s of 'markers' clearly yourself."),
            teacherNote: "Lesson 5 reviews both units and has no grammar slide, so the drill takes the past tense and the lists of the report and puts the thinking into the joining words. Students in grades 6-7 hold two clauses easily. Round 3 makes it real: they talk about what they actually made and used, which is also the plan for the report talk that follows.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Did you ___?", "Yes, I did. / No, I didn't.", "I used ___ because ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I used markers, but my partner used paint, so her colors looked brighter. Which do you prefer?'" },
            ],
          },
        },
        {
          after: "Put it on the wall and tell the class (SB 185 C)",
          slide: {
            kind: "fluency",
            title: "Report talk: three tellings",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Present your art report to three partners. Each telling is smoother and keeps the three parts: what it is, what it has, why you like it.",
            chunks: [
              "This report is about a picture I made of a harbor at sunrise.",
              "It has blue waves, a white sail, and a golden sun, although I didn't use any paint.",
              "I made it with markers and colored pencils because they are easy to control.",
              "I like it because the colors work well together, and it reminds me of a trip with my family.",
            ],
            recycle: ["How many boats are there? There are two boats.", "There is a lot of blue in the sky."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A presents the report, then Partner B. The listener ticks the three parts they hear: what it is, what it has, why you like it. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A presents it, then Partner B. The listener asks one question at the end. Then change partners." },
              { seconds: 60, say: "Round 3: Partner A presents it, then Partner B. Smooth and fast. The listener says one thing they like and one suggestion." },
            ],
            steps: [
              "Stand by your report. In each round, Partner A presents, then Partner B. Cover the three parts: what it is, what it has, why you like it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together. Then go on.",
              "Listeners: tick, then ask one question, then say one thing you like and one suggestion.",
            ],
            feedback: fix("point to the frame, or start the phrase and pause ('It has blue waves, a white sail, ...?'). For a missing -s on a plural or a missing -ed in 'made' and 'used', hold up a finger."),
            teacherNote: "Task repetition: the same task with a new listener lets the student put the planning effort into the words. The listener has a job each time, so they really listen. Use the one-minute fix for the report's grammar: 'It has ___, ___, and ___' (commas as pauses, 'and' before the last thing), the -s on plural things and a reason with because. Do not add new content between rounds.",
            tiers: [
              { level: "Support", task: "Read your three sentences from your report and look up at the end of each one.", frames: ["It is a ___.", "It has ___, ___, and ___.", "I like it because ___."] },
              { level: "Core", task: "Present your report without reading, with a reason." },
              { level: "Stretch", task: "Add how it was made and a comparison: 'I made it with markers because they are faster than paint, but paint would look brighter.'" },
            ],
          },
        },
        {
          after: "Gallery walk: find a report you like (SB 185 D)",
          slide: {
            kind: "writing",
            title: "Write feedback to an artist",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model note with the teacher. Find the four parts: a compliment, a reason, a suggestion and thank you.",
              "Choose a report from the gallery walk. Write feedback to its artist with the frames.",
              "Give the note to the artist and read it aloud together.",
            ],
            text: {
              title: "A note to Mai",
              text: "Dear Mai, I really like your report. The golden sun is my favorite part because it makes the whole picture feel warm. Also, you used blue and white together, so the waves look real. One suggestion: add a title, because it would help people understand your idea faster. Thank you for sharing your work! Best wishes, Ken",
            },
            frames: ["Dear ___, I really like your ___.", "___ is my favorite part because ___.", "One suggestion: ___, because ___.", "Thank you for ___!"],
            checklist: ["Dear ___, with a comma after the name", "A reason with because and a suggestion", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your note aloud to the artist, then say it again without looking.",
            teacherNote: "A modelled note gives students a whole shape to copy while the ideas are their own: a compliment, a reason, a suggestion and a thank you. Point out the comma after the name in the greeting and the full stops. Kind, specific feedback is a real writing skill; ask students to name a part of the report, not just say 'it is nice'. The names in the model are made up; students use a classmate's real name.",
            tiers: [
              { level: "Support", task: "Copy the model and change the details and the name." },
              { level: "Core", task: "Write a note of your own with the frames, with one reason and one suggestion." },
              { level: "Stretch", task: "Write a note with two reasons and a suggestion with although, and a question for the artist." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u18-l6": {
      objectives: [
        "I can say sentences with There is and There are, some, any, a few and a lot of, fast and with a reason.",
        "I can write a paragraph of six to eight sentences about the things I keep and need.",
      ],
      drop: ["Art table race: run to the wall", "Movement break: jump and wave"],
      trim: {
        "Remember it!": 4,
        "Say it, then write: my art box": 9,
      },
      add: [
        {
          after: "Two art cupboards: find the differences",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence with How many, How much, some, any, a few and a lot of fast and right: ask it, say no, join it with a reason, change the time or the thing. Then talk about your own time and things.",
            chunks: [
              "How many brushes are there in the art room, and how much paint is there on the shelf?",
              "There are a few brushes and a lot of paper, but there isn't any glue, so we can't finish the poster.",
              "Are there any scissors in your bag? No, there aren't any, although I need some for tomorrow.",
              "There was a lot of paint on the floor after the class, and there were a few students who helped to clean it.",
              "How many followers does he have, and how much time does he spend online?",
              "I don't have any free time on weekends because I have a lot of homework and a few sports practices.",
            ],
            recycle: ["There are six brushes in my art box.", "There isn't any blue paint left."],
            rounds: [
              { seconds: 75, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence from the board and shows a sign card, B changes it. Swap at the clap. Change the thing too: brushes (count) to paint (can't count) and back." },
              { seconds: 90, say: "Real talk: ask your partner about their week: how many practices, how much homework, how much free time. Answer in full sentences, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with How many, How much, Is there any or Are there any, X = isn't any, aren't any or don't have any, + = join with because, although or so, T = now or in the past (was, were), P = change the thing or the person.",
              "Say the WHOLE new sentence. Check is or are, some or any, and many or much every time.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out how many and how much your partner has, and remember one answer to tell another pair.",
            ],
            prompts: ["There are six brushes on the shelf. (?)", "There is a lot of glue. (X)", "There aren't any scissors. (+ so)", "I have some free time. (+ although)", "There are a few students in the room. (T: yesterday)", "There is a lot of paint. (P: brushes)"],
            feedback: drillFix("For 'How many glue do you need?' hold up one finger and say 'How m...?'. For 'There is five stars', point to 'five' and say 'one or more?'. For 'Is there any markers?' ask 'count it?'. Say the -s of 'brushes' and 'markers' clearly yourself."),
            teacherNote: "The Grammar Champions lesson ends the unit's grammar, so the drill is the fastest way to find out who has the rule and who does not. Students choose between How many and How much, is and are, some and any every few seconds. Round 3 is the point: real answers about the week, with a reason. Mix in a few Unit 17 phrases so last unit's grammar does not fade.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["How many ___ are there?", "How much ___ is there?", "There isn't any ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new thing each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I have a lot of homework, but there is some time to relax at night. How about you?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: art box sentences",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right, with a reason: count it or not?",
            chunks: [
              "There are six brushes in my art box, but there isn't any green paint.",
              "There is a lot of glue, so we can finish the whole poster today.",
              "I have a few markers and some chalk, although I prefer to draw with pencils.",
              "Are there any scissors on the shelf? Yes, there are some, but they aren't sharp.",
              "How many students are there in the art club, and how much space do we have?",
            ],
            recycle: ["There are a lot of stars in the collage.", "There isn't any blue paint left."],
            rounds: [
              { seconds: 75, say: "Together: the teacher flashes a picture card, the class says a whole sentence with a reason." },
              { seconds: 75, say: "The left side of the room says the 'There is' cards, the right side says the 'There are' cards. Then swap sides." },
              { seconds: 60, say: "Champion round: one student at a time, as fast as you can, with a new reason each time." },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, raise a hand and say it the right way.",
              "Teacher: after round 1, stop for one minute and fix the two mistakes you heard most on the board. Then go on.",
            ],
            prompts: ["(card: brushes)", "(card: glue)", "(card: markers and chalk)", "(card: scissors)", "(card: art club)"],
            feedback: fix("for 'There have' or 'There is a lot of markers' point to the frame and ask 'is or are?'. Say the -s of brushes and markers yourself."),
            teacherNote: "A quick, high-energy recall that makes students choose 'is' or 'are' and 'some' or 'any' every few seconds, which is what turns the rule into a habit. Requiring a reason or a contrast in each sentence keeps it at the right level for grades 6-7. Mixing in Unit 17 phrases (spaced retrieval) keeps last unit's grammar from fading. Listen for 'There have' and 'There is a lot of markers'.",
            tiers: [
              { level: "Support", task: "Say the sentences with the picture cards and the frames on the board.", frames: ["There is ___.", "There are ___."] },
              { level: "Core", task: "Say the sentences from the card alone, with a reason." },
              { level: "Stretch", task: "Make a new sentence from each card with a contrast: 'There are six brushes, but there isn't any paint, so we can't start yet.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my art box",
          slide: {
            kind: "writing",
            title: "A place for my things: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, First, Also, However and the closing sentence. Underline what is in the box, what is not and what the writer needs.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences. Use are for things you can count and is for things you can't, and give a reason or an example for each detail.",
              "Check: tick the checklist. Your partner underlines every is / are and every some / any.",
              "Teacher: look first at is / are, some / any and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: my art box",
              text: "I keep my art things in a blue box under my bed, and it is the most useful thing in my room. First, there are a lot of pencils, a few brushes, and some colored markers, so I can draw almost anything. Also, there is a ruler, but there isn't any glue because I use tape instead. However, I need more paper, for example thick paper for posters, so I am going to buy some this weekend. In conclusion, my art box is small, but it helps me finish my projects.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Where do you keep your things, and why is it useful?" },
              { label: "Things I can count", prompt: "What are there a few or a lot of? (There are ... so I can ...)" },
              { label: "Things I can't count", prompt: "What is there some or a lot of? What isn't there, and why? (Also, there is ... but there isn't any ... because ...)" },
              { label: "What I need", prompt: "What do you need, for example, and what will you do? (However, I need ... for example ...)" },
              { label: "Closing", prompt: "What do you think about your things? (In conclusion ...)" },
            ],
            frames: ["I keep my ___ in ___, and it is ___.", "First, there are ___, so I can ___.", "Also, there is ___, but there isn't any ___ because ___.", "In conclusion, ___."],
            checklist: [
              "There are + things I can count, There is + things I can't count",
              "some for what is there, any for what is not (isn't any, aren't any)",
              "At least three linking words (first, also, however, because, for example, in conclusion)",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then say it without looking.",
            teacherNote: "A paragraph about the things the student really keeps, built on the sentences of the drill, the champion talk and the sprint, now joined with because, but, so and however. A few words per box are the plan. Check that a student who writes 'a few markers and a lot of crayons' uses 'There are'. Mark only is / are, some / any and the linking words. This paragraph can be the script for the recorded talk 'My art box talk': the student keeps three key words per box, not the full text.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one or two words in each; write six sentences.", frames: ["There are ___.", "There is ___.", "I need ___ because ___."] },
              { level: "Core", task: "Write six to eight sentences, one for each box and a detail or an example, with three linking words." },
              { level: "Stretch", task: "Add a contrast and a question: 'Although my box is small, it has everything I need. What is in yours?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My art box talk",
        prompt: "Talk about the things you keep in a bag, a box or a drawer for making things: how many, how much, what is not there and what you need. Give a reason and an example.",
        length: "90-120 seconds",
        steps: [
          "Choose a box, bag or drawer you really use. Write three key words for each part of your talk, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read your paragraph word for word.",
          "Record it once. Show each thing as you say it and speak clearly.",
          "Before you send it, check: did you give a reason and an example for what you said?",
        ],
        maxSeconds: 180,
        kidSummary: "Say what is in your box with There is and There are, say what is not in it with any, and give a reason and an example for what you need.",
        words: ["glue", "paper", "markers", "crayons", "scissors", "paint"],
        grammar: ["There are a few / a lot of ___.", "There is some ___. / There isn't any ___ because ___."],
        rubric: [
          { label: "Is or are", description: "Says 'There are' with things you can count and 'There is' with things you can't count.", weight: 3 },
          { label: "Some and any", description: "Uses some for what is in the box and any for what is not: 'There isn't any paint.'", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so or for example.", weight: 3 },
          { label: "Clear -s", description: "Says the -s on markers, crayons and scissors so it can be heard.", weight: 1 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["There are ___.", "There is ___.", "There isn't any ___ because ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["There are a few ___ and a lot of ___.", "There is some ___, but there isn't any ___ because ___."], tips: ["Say one thing that is NOT there and why, with an example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although there is ___, I need ___ because ___.", "For example, ___, so I am going to ___."], tips: ["Give a contrast, a need, and a plan with a reason."] },
        ],
      },
    },
  },
};
