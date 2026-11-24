import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 9 "Numbers All
// Around" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10; Venus). Every lesson gets a grammar drill (a cue sentence changed fast: asked,
// answered, said in the negative, joined with and/but/because, then used in real talk about
// the children themselves) and one more fluency routine (the unit's phrases said again and
// again as longer sentences, a little faster each round, with Unit 8's phrases mixed back
// in). Writing is a paragraph of four to six sentences with joining words (lessons 1, 2 and
// 5) or a sentence routine of four or five items (lessons 3 and 4). Two lessons end with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// made for younger children, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('I don't ...?'), or hold up a finger for the missing -s. For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('pencils', 'erasers', 'socks'): children copy what they hear.";

const haveFix =
  " This unit's slips: 'I no have' or 'I don't has' (start 'I don't ...' and pause, point at don't + have), 'two pencil' (hold up two fingers, then tap the -s on the board), a missing a/an ('I have kite': point to the frame 'a ___'), and 'she have' (tap the -s on has).";

export const odL1U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u09-l1": {
      objectives: [
        "I can count and say 'Two is an even number.' fast, without stopping.",
        "I can join my ideas with 'and', 'but' and 'because' when I talk and write about numbers.",
      ],
      trim: { "Count with me": 3, "Number hunt": 5 },
      drop: ["Odd and even hop", "Whisper count"],
      add: [
        {
          after: "Count and tell (SB 87 C)",
          slide: {
            kind: "fluency",
            title: "Number sprint: count and say",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops. Join two ideas with 'and', 'but' or 'because'.",
            chunks: [
              "Two is an even number, and three is an odd number.",
              "I can count to twenty, and I can count by twos.",
              "Six is an even number because I can make three pairs.",
              "I count five pencils, but my friend counts six erasers.",
              "How many children do we count? We count twelve children.",
            ],
            recycle: ["I build a tree house, and I make apple pie.", "I don't build a snowman in the summer."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a number card (or two cards) and the class says the whole sentence, with the joining word." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap. Use 'and', 'but' or 'because' in every sentence." },
              { seconds: 75, say: "Faster! New partner. How many long sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the number card. Say a WHOLE sentence: 'Two is an even number, and three is an odd number.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["(cards: 2 and 3)", "(card: 20)", "(card: 6, three pairs)", "(cards: 5 pencils, 6 erasers)", "(card: 12 children)"],
            feedback:
              correct +
              " Here: if a child says 'Two is a even number', say 'an' with the 'an' card up, then let them say it again; if they say 'I count five pencil', hold up five fingers and tap the -s; if a child stops after 'because', point to the cards and let them finish the reason.",
            teacherNote:
              "Whole sentences only, never single numbers: the aim is 'Six is an even number because I can make three pairs' as one smooth piece. The joining word is the new step for grades 2-4: children who used to stop after one idea now carry on after 'and', 'but' or 'because'. Listen for 'an' before odd and even, and for the -s on pencils. Mix in Unit 8's cards every few turns so those phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Say the sentence alone with the frame on the board, then say it again without looking.", frames: ["___ is an even number, and ___ is an odd number.", "I count ___ ___."] },
              { level: "Core", task: "Join two ideas with 'and' or 'but': 'Four is an even number, and I count four pencils.'", frames: ["___ is an ___ number, and ___.", "I count ___ ___, but ___."] },
              { level: "Stretch", task: "Give a reason with 'because' and ask your partner a follow-up question: 'Six is an even number because I can make three pairs. Is seven an even number?'", frames: ["___ is an ___ number because ___.", "Is ___ an even number?"] },
            ],
          },
        },
        {
          after: "Circle the answer (SB 88 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: odd, even and counting",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, then join two sentences. Then use it for real.",
            chunks: [
              "Two is an even number.",
              "Is two an even number? Yes, it is.",
              "Three isn't an even number. It's an odd number.",
              "Four is an even number, but five is an odd number.",
              "I count six pencils. Do you count six pencils? No, I don't.",
              "She counts eight erasers, and he counts nine.",
            ],
            recycle: ["I build a tree house.", "I don't build a snowman in the summer."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with isn't or don't, + = add 'and', 'but' or 'because' and more). The class says the new sentence together. Then the teacher changes the person: I, we, she." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use all three signs, and change the person too: I, you, we, they, she." },
              { seconds: 90, say: "Real talk: ask your partner about real numbers: Is your favorite number odd or even? Do you count by twos? How many pencils do you have? Answer in a full sentence, then add one more with 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Is or Do, X = say no with isn't or don't, + = add 'and', 'but' or 'because' and more.",
              "Say the WHOLE new sentence out loud. Listen for the -s: she counts, he counts.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Two is a even number' or 'Is two even number?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's favorite number and remember one answer to tell the class.",
            ],
            prompts: [
              "Two is an even number. (?)",
              "Three is an odd number. (X)",
              "Five is an odd number. (+ six is even)",
              "I count five pencils. (?)",
              "We count six children. (she)",
              "Eight is an even number. (+ because I can make four pairs)",
            ],
            feedback:
              "Prompt, do not tell: for 'Is two even number?' hold up the 'an' card and say 'Is two ...?' and pause; for 'Three isn't a odd number' tap the 'an' card; for 'She count eight' tap your wrist and say 'she counts' once; for a sentence that stops after 'but', point to the cards and let the child finish. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about their own favorite number and counting, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, isn't and don't, a joined sentence and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'is' and 'I count', with the frames on the board.", frames: ["Is ___ an even number?", "___ isn't an ___ number."] },
              { level: "Core", task: "Change every sentence with all three signs and all persons: I, you, we and they." },
              { level: "Stretch", task: "Use she and he with -s, and 'because': 'She counts eight erasers because she has eight friends. He counts nine pencils, but he doesn't count ten.'" },
            ],
          },
        },
        {
          after: "Grammar drill: odd, even and counting",
          slide: {
            kind: "writing",
            title: "My number: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the five sentences and circle the joining words: because, and, but.",
              "Plan: write your key words in the boxes (a quick drawing is fine, too). Say one sentence for each box to your partner.",
              "Write: five or six sentences with the frames. Use 'because', 'and' or 'but' at least twice.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, 'an' before even and odd, and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My favorite number",
              text: "Six is my favorite number. It is an even number because I can make three pairs. I have six pencils, and I have six erasers, too. I can count to twenty, but I can't count to a hundred yet. What is your favorite number?",
            },
            organiser: [
              { label: "My number", prompt: "Write your favorite number. Draw it in dots if you like. Is it odd or even?" },
              { label: "Because", prompt: "Write two key words that say why it is odd or even (pairs, one left over)." },
              { label: "My things", prompt: "Write one thing you have and how many (pencils, toys, books)." },
              { label: "I can count", prompt: "Write how far you can count, and one number you can't count to yet." },
            ],
            frames: [
              "___ is my favorite number.",
              "It is an ___ number because ___.",
              "I have ___ ___, and I have ___ ___, too.",
              "I can count to ___, but I can't count to ___ yet.",
              "What is your favorite number?",
            ],
            checklist: [
              "Five or six sentences, and each one starts with a capital letter",
              "A full stop, ? or ! at the end of every sentence",
              "At least two joining words: and, but, because",
              "'an' before odd and even (an even number)",
              "-s for more than one (pencils, erasers)",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, using your key words.",
            teacherNote:
              "A paragraph for grades 2-4: five or six sentences planned with key words (a drawing is optional), with joining words in the frames and the checklist. Mark only three things (capital letters, 'an' and the joining words) and let the child find the mistake from your dot. Children may copy the model and change the number, the things and the counting; the fast writers add a reason or a question.",
            tiers: [
              { level: "Support", task: "Copy the model and change the number, the things and the counting.", frames: ["___ is my favorite number.", "It is an ___ number because ___.", "I have ___ ___."] },
              { level: "Core", task: "Write five sentences about your own number, with 'because' and with 'and' or 'but'." },
              { level: "Stretch", task: "Write six sentences and end with a question and its answer: 'Is seven an even number? No, it's an odd number because one is left over.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u09-l2": {
      objectives: [
        "I can tell a partner an adding story three times, faster each time.",
        "I can ask a follow-up question and write an adding paragraph with 'and', 'but', 'so' and 'because'.",
      ],
      trim: { "Odd foot, even feet": 3 },
      drop: ["Walk the number line", "Twos lullaby"],
      add: [
        {
          after: "Crabs and shells (SB 91 problems)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: plus, equals, ask and answer",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the adding sentence fast and right: ask it, answer it, say no, then join two sentences. Then use it for real.",
            chunks: [
              "Two plus three equals five.",
              "What is two plus three? The answer is five.",
              "Does two plus three equal five? Yes, it does. / No, it doesn't.",
              "Two plus three doesn't equal six.",
              "I have two pencils, and my friend has three erasers.",
              "We have five things in all because two plus three equals five.",
            ],
            recycle: ["I build a snowman in winter, but I don't build a snowman in the summer."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says an adding sentence and shows a sign (? = ask it with What is ...? or Does ... equal ...?, X = say it with doesn't equal, + = add 'and', 'but' or 'because' and more). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the numbers and the person too: I have, you have, we have, my friend has." },
              { seconds: 90, say: "Real talk: ask your partner about real things in your bags: How many pencils do you have? Do you have an eraser? Add your things together. Answer in a full sentence, then add one more with 'and', 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it, X = say it with doesn't equal or don't have, + = add 'and', 'but' or 'because' and more.",
              "Say the WHOLE new sentence, with the -s on equals and has, and on more than one thing.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Two plus three equal five' or 'Does two plus three equals five?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has, add it to your own, and remember the total to tell the class.",
            ],
            prompts: [
              "Two plus three equals five. (?)",
              "Four plus one equals five. (X + six)",
              "I have two pencils. (+ my friend has three erasers)",
              "We have five things. (+ because two plus three equals five)",
              "Three plus three equals six. (?)",
            ],
            feedback:
              "Prompt, do not tell: for 'Two plus three equal five' hold up a finger and say 'equal...?' with a rising voice, then tap the -s; for 'Does it equals?' say 'Does it equ...?' and pause so the child finishes with 'equal'; for 'my friend have' tap your wrist and let the child say 'has'. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children add up the things they really have. Grades 2-4 can take the full set: questions with What is and Does, short answers, doesn't equal, a joined sentence and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'I', with the frames on the board.", frames: ["What is ___ plus ___?", "___ plus ___ doesn't equal ___."] },
              { level: "Core", task: "Change every sentence with all three signs and all persons: I have, you have, we have, they have." },
              { level: "Stretch", task: "Use he and she with -s, and 'because': 'She has two pencils, and he has three. They have five things because two plus three equals five.'" },
            ],
          },
        },
        {
          after: "Make a problem for your partner",
          slide: {
            kind: "fluency",
            title: "Adding talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same adding talk to three friends. Each talk is shorter and smoother, and it ends with a question.",
            chunks: [
              "In my bag, I have two pencils and three erasers, but I don't have a ruler.",
              "Two plus three equals five, so I have five things in all.",
              "The answer is five because two plus three equals five.",
              "What is four plus one? Do you know the answer?",
            ],
            recycle: ["I build a snowman in winter, but I don't build a snowman in the summer."],
            rounds: [
              { seconds: 55, say: "Round 1: Partner A tells the adding talk, then Partner B tells theirs. The listener counts the things on their fingers and answers the question at the end. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A, then Partner B: fast and smooth! The listener says the answer to the question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Partner A talks, then Partner B talks.",
              "Choose some counters or pencils. Say what you have, add them up and end with a question for your partner.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same three rounds with each new partner: A talks, then B talks, then change partners.",
            ],
            feedback:
              correct +
              " Here: 'Two plus three equal five' is very common: say 'equals' with a clear -s and let the child echo it. For 'two pencil', hold up two fingers and pause. If the talk stops after 'but' or 'because', point to the counters and let the child finish.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix in the middle is what makes it more accurate too. The question at the end gives the listener something real to answer.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, then ask the question.", frames: ["I have ___ and ___.", "___ plus ___ equals ___.", "What is ___ plus ___?"] },
              { level: "Core", task: "Join your sentences with 'but', 'so' or 'because' and end with a question for your partner.", frames: ["I have ___, but I don't have ___.", "___ plus ___ equals ___, so ___."] },
              { level: "Stretch", task: "Tell two adding stories, give a reason with 'because', and ask your partner to solve a new problem: 'What is four plus six? I think the answer is ten because ...'" },
            ],
          },
        },
        {
          after: "How do we use addition every day? (SB 91)",
          slide: {
            kind: "writing",
            title: "My adding paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the sentence that tells what is in the bag, the adding, the details and the question at the end. Circle the joining words.",
              "Plan: write your key words in the boxes (a quick drawing is fine, too). Say one sentence for each box to your partner.",
              "Write: five or six sentences with the frames. Use 'and', 'but', 'so' or 'because' at least twice.",
              "Check: tick the checklist. Your partner counts your things: is your answer right?",
              "Teacher: look only at 'equals' and 'has' with their -s, the plural -s and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Adding in my bag",
              text: "In my bag, I have two pencils and three erasers. Two plus three equals five, so I have five things in all. I don't have a ruler, but I have a pen. My friend has four pencils, and she has two erasers. What is four plus two? The answer is six because four plus two equals six!",
            },
            organiser: [
              { label: "What I have", prompt: "Write two groups of things from your bag and how many in each (key words, or a quick drawing)." },
              { label: "Add them", prompt: "Write the adding: ___ plus ___. What is the answer?" },
              { label: "What I don't have", prompt: "Write one thing you don't have, and one thing you have instead." },
              { label: "My friend", prompt: "Write what your friend has, and make a problem for your reader." },
            ],
            frames: [
              "In my bag, I have ___ ___ and ___ ___.",
              "___ plus ___ equals ___, so I have ___ things in all.",
              "I don't have a ___, but I have a ___.",
              "My friend has ___ ___, and she / he has ___ ___.",
              "What is ___ plus ___? The answer is ___ because ___ plus ___ equals ___!",
            ],
            checklist: [
              "Five or six sentences, and each one starts with a capital letter",
              "A full stop, ? or ! at the end of every sentence",
              "At least two joining words: and, but, so, because",
              "'equals' and 'has' have -s; more than one thing: -s (pencils, erasers)",
              "My adding is right",
            ],
            sayIt: "Read your adding paragraph to your partner. Then tell it again without looking, and let your partner answer your question.",
            teacherNote:
              "The paragraph is the script for the recorded adding talk at home: the children read it, then tell it faster without looking. Plan with key words (a drawing is optional). Mark only three things ('equals' and 'has' with -s, the plural -s and the joining words). Check the adding together: a wrong sum is a good chance to count again.",
            tiers: [
              { level: "Support", task: "Copy the model and change the numbers and the things.", frames: ["In my bag, I have ___ ___ and ___ ___.", "___ plus ___ equals ___, so I have ___ things in all."] },
              { level: "Core", task: "Write five sentences about your own things, with 'and', 'but' or 'because' at least twice." },
              { level: "Stretch", task: "Write six sentences and a second problem with its answer: 'What is five plus five? The answer is ten because I have two hands.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My counting and adding talk",
        prompt: "Find some things at home: pencils, spoons, toys. Count them, say what you have, add two groups together and ask the viewer a problem.",
        length: "60-90 seconds",
        steps: [
          "Find two small groups of things at home.",
          "Say your adding talk three times: each time a little faster, like in class.",
          "Join your ideas with 'and', 'but', 'so' or 'because', and finish with a question for the viewer: 'What is four plus one?'",
          "Record it once. Show the things to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say what you have, add two groups, join your ideas with 'and', 'but' or 'because', and ask a question.",
        words: ["count", "plus", "equals", "pencils", "answer", "odd", "even"],
        grammar: ["I have ___ and ___.", "___ plus ___ equals ___, so ___.", "What is ___ plus ___?"],
        rubric: [
          { label: "What I have", description: "Says what they have with numbers, using 'I have ___ ___.'", weight: 2 },
          { label: "Adding sentence", description: "Says an adding sentence: 'Two plus three equals five.'", weight: 2 },
          { label: "Joins ideas", description: "Uses 'and', 'but', 'so' or 'because' to join two ideas, and asks the viewer a question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of pencils and equals can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I have ___ ___ and ___ ___.", "___ plus ___ equals ___."], tips: ["Count the things with your finger."] },
          { level: "Core", who: "Most children", frames: ["I have ___ ___, but I don't have ___.", "___ plus ___ equals ___, so I have ___ things in all."], tips: ["Join two ideas in one smooth sentence, then ask a question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["What is ___ plus ___? The answer is ___ because ___.", "___ is an odd number, but ___ is an even number."], tips: ["Ask the viewer a problem, then give the answer and the reason."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u09-l3": {
      objectives: [
        "I can say 'I have ___.' and 'I don't have ___.' fast, again and again.",
        "I can ask 'Do you have ___?' and join my sentences with 'and' and 'but'.",
      ],
      trim: { "Show me with fingers": 3, "Ball toss: I have ...": 6 },
      drop: ["Me too! Find your match", "Counters goodnight"],
      add: [
        {
          after: "Ball toss: I have ...",
          slide: {
            kind: "fluency",
            title: "Same task again: I have, I don't have",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same card task three times. Each time is smoother, with fewer stops. Join your ideas with 'and' and 'but'.",
            chunks: [
              "I have a pet fish, and I don't have a kite.",
              "You have a pencil, but you don't have an eraser.",
              "We have two hats, and they have two bicycles.",
              "Do you have a pet? Yes, I do. I have a cat because I like cats.",
              "We don't have a pet in our classroom, but we have a plant.",
            ],
            recycle: ["I build a snowman in winter, but I don't build a snowman in the summer.", "Do you make apple pie? No, I don't."],
            rounds: [
              { seconds: 55, say: "Round 1: Take four picture cards. Partner A tells about each card with 'I have ___, and ...' or 'I don't have ___, but ...'. Then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. The same four cards, the same sentences, in less time. Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Same again: smooth and fast, no stops! Partner A, then Partner B." },
            ],
            steps: [
              "Pick four picture cards. Put them face up.",
              "Say a whole sentence for each pair of cards: 'I have ___, and I don't have ___.' or 'You have ___, but you don't have ___.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round Partner A talks, then Partner B talks. When you hear the bell, find a new partner. Keep the same cards.",
            ],
            prompts: ["(cards: pet fish, kite)", "(cards: pencil, eraser)", "(cards: two hats, two bicycles)", "(card: cat) Do you have a pet?", "(cards: pet, plant)"],
            feedback: correct + haveFix,
            teacherNote:
              "Task repetition: the same task with a new listener lets the child use the words they already found, so the second and third rounds are faster and smoother. Keep the cards the same all three times; changing them would turn practice into a new task. Grades 2-4 can join two ideas in one sentence with 'and' and 'but'. Say 'don't have' clearly yourself, with the final t.",
            tiers: [
              { level: "Support", task: "Say one sentence for each card with the frame on the board, then join two cards with 'and'.", frames: ["I have a ___.", "I don't have a ___, but I have a ___."] },
              { level: "Core", task: "Say sentences with 'You have' and 'We have', and join two ideas with 'and' or 'but', without the board.", frames: ["I have ___, and I don't have ___.", "You have ___, but you don't have ___."] },
              { level: "Stretch", task: "Add a question and a reason: 'Do you have a pet? Yes, I do. I have a cat because I like cats.' Use she and he with -s: 'She has a cat, but she doesn't have a dog.'" },
            ],
          },
        },
        {
          after: "Look and check (SB 93 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: have, don't have, do you have",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, then join two sentences. Then ask about real things.",
            chunks: [
              "I have a pet.",
              "Do you have a pet? Yes, I do. / No, I don't.",
              "I don't have a pet, but I have a plant.",
              "We have two hats, and they have three bicycles.",
              "Do they have a kite? No, they don't, but they have a ball.",
              "She has a pencil, but she doesn't have an eraser.",
            ],
            recycle: ["I like soup, but I don't like onions.", "Two plus three equals five."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Do, X = say it with don't, + = add 'and', 'but' or 'because' and more). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about real things: pets, bikes, school things. Answer with the short answer and one more sentence with 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and', 'but' or 'because' and more.",
              "Say the WHOLE new sentence, with -s on things when there are more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you has' or 'Yes, I have'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has, and remember one answer to tell the class.",
            ],
            prompts: ["I have a pot. (?)", "You have a kite. (X)", "We have hats. (?)", "They have a bag. (X + they have a box)", "I have two pencils. (+ an eraser)", "She has a pet. (X + a plant)"],
            feedback:
              "Prompt, do not tell: for 'You have a pet?' hold up one finger and say 'D...?'; for 'Yes, I have.' repeat it with a rising voice and let the child fix it; for a missing -s, tap your wrist; for 'She have' say 'She h...?' and pause. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about things they really have, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you have a ___?", "No, I don't have a ___."] },
              { level: "Core", task: "Change every sentence with all three signs, with I, you, we and they." },
              { level: "Stretch", task: "Use he and she with -s too, and 'because': 'She has a pot. Does she have a pot? No, she doesn't. She has a pan because she likes soup.'" },
            ],
          },
        },
        {
          after: "Grammar drill: have, don't have, do you have",
          slide: {
            kind: "writing",
            title: "Fix the 'I have' sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing word, a missing a, a missing -s, or a wrong have, has or don't.",
              "Write the sentence the right way. Keep the joining word (and, but). Read it aloud together.",
            ],
            items: [
              { q: "I no have a pet, but I have a fish.", answer: "I don't have a pet, but I have a fish." },
              { q: "I have kite and I have a ball.", answer: "I have a kite, and I have a ball." },
              { q: "We have two kite, and they have two hats.", answer: "We have two kites, and they have two hats." },
              { q: "I don't has a pencil, but I have a pen.", answer: "I don't have a pencil, but I have a pen." },
              { q: "Do you has a bike? No, I no have.", answer: "Do you have a bike? No, I don't." },
            ],
            checklist: ["'I don't have', not 'I no have' or 'I don't has'", "A word like a before one thing", "More than one: -s", "The joining word (and, but) is still there", "A full stop or ? at the end"],
            sayIt: "Read your fixed sentences to your partner, then say them again without looking.",
            teacherNote:
              "Vietnamese has no 'do' for negatives and no plural ending, so 'I no have' and 'two kite' are this class's most common slips. Fix item 1 together first, then let pairs do the rest. Items 1 to 4 have two clauses: the joining word is right, and the child fixes the mistake inside one of them. Keep it to these kinds of mistake so the children can check for them.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the teacher." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with 'and' or 'but' and one mistake each for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u09-l4": {
      objectives: [
        "I can ask and answer 'How old are you?' and talk about my things, fast.",
        "I can write four sentences about my things and join them with 'and', 'but' and 'because'.",
      ],
      trim: { "Zip, zip, my backpack": 3, "What's missing? (SB 94 B)": 3, "How many in our class? (SB 94 Think)": 3 },
      drop: ["Mystery backpack", "Count down to bed"],
      add: [
        {
          after: "How old are you? (SB 95 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: How old are you?",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, then join two sentences. Then ask about real ages and things.",
            chunks: [
              "I'm seven years old.",
              "How old are you? How old is she?",
              "Are you seven years old? Yes, I am. / No, I'm not.",
              "I'm not eight years old. I'm seven.",
              "I'm seven years old, but my brother is ten.",
              "I have three pencils, and she has two erasers.",
            ],
            recycle: ["I have a pet, but I don't have a kite.", "Do you have a bicycle? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with not or don't, + = add 'and', 'but' or 'because' and more). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we." },
              { seconds: 90, say: "Real talk: ask your partner real questions: How old are you? How old is your brother or sister? Do you have a pet? Answer in a full sentence, then add one more with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it with How old, Are or Do, X = say no with not or don't, + = add 'and', 'but' or 'because' and more.",
              "Say the WHOLE new sentence, with the years: seven years old.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I'm seven year old' or 'You are seven years old?' said as a question without Are), fix them together, then go on.",
              "In round 3 the drill becomes real: ask your partner about real ages and things, and remember one answer to tell the class.",
            ],
            prompts: ["I'm seven years old. (?)", "You're eight years old. (X + nine)", "She's ten years old. (?)", "I have three pencils. (+ she has two erasers)", "He's eight years old. (X)"],
            feedback:
              "Prompt, do not tell: for 'You are eight years old?' say 'A...?' and pause so the child makes 'Are you ...?'; for 'I'm seven year old' hold up seven fingers and tap the -s; for 'she have' tap your wrist and say 'she h...?'. Say the -s and 'not' clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about their own ages and things. Grades 2-4 can take the full set: questions with How old, Are you, short answers, not, a joined sentence and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["How old are you?", "I'm ___ years old.", "I'm not ___. I'm ___."] },
              { level: "Core", task: "Change every sentence with all three signs, with I, you, he, she and we." },
              { level: "Stretch", task: "Use he and she with -s, and 'because': 'He isn't ten years old. He's nine because his birthday is in June.'" },
            ],
          },
        },
        {
          after: "Grammar drill: How old are you?",
          slide: {
            kind: "fluency",
            title: "Question chain: How old are you?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops, and add something more each time!",
            chunks: [
              "How old are you? How about you?",
              "I'm seven years old, and I have three pencils.",
              "I'm seven, too! But I don't have a ruler.",
              "How many erasers do you have? I have two erasers.",
              "I'm eight years old, but my sister is ten.",
            ],
            recycle: ["I have a pet, but I don't have a kite.", "Do you have a bicycle? Yes, I do."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a number card for their age and a school-thing card." },
              { seconds: 75, say: "Swap cards. Go faster, and add a second sentence with 'and' or 'but'!" },
              { seconds: 75, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your cards so only you can see them.",
              "Ask the friend on your left: 'How old are you?'",
              "They answer: 'I'm ___ years old, and I have ___.' Then they say 'How about you?' to the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["How old are you?", "How about you?", "How many erasers do you have?"],
            feedback:
              correct +
              " Here: 'I'm seven year old' misses the -s: hold up seven fingers and tap the -s. 'I'm seven' without 'years old' is fine for now. If a child stops after 'and' or 'but', point to the school-thing card and let them finish.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'How old are you?' automatic. Time the whole circle and tell them; children love beating their own time. Age cards mean nobody has to find a number word on the spot. The second sentence with 'and' or 'but' is the step up for grades 2-4.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board, then say 'How about you?'", frames: ["How old are you?", "I'm ___ years old.", "How about you?"] },
              { level: "Core", task: "Add a sentence about your things with 'and' or 'but': 'I'm seven, and I have two pencils.'", frames: ["I'm ___, and I have ___ ___.", "I'm ___, but I don't have a ___."] },
              { level: "Stretch", task: "Add a follow-up question and a reason: 'I'm eight, but my sister is ten. How many pencils do you have? I have four because I like drawing.'" },
            ],
          },
        },
        {
          after: "Tell your partner about your things (SB 95 Write)",
          slide: {
            kind: "writing",
            title: "Read, then write about my things",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the full stops and circle the joining words: and, but, because.",
              "Write four sentences about your own things with the frames. Join two ideas in at least two of them.",
              "Read them to your partner, then say them without looking.",
            ],
            text: {
              title: "My school things",
              text: "I have three pencils and two erasers, but I don't have a ruler. I'm seven years old, and my sister is ten. I have a big backpack because I have many school things. Do you have a big backpack?",
            },
            frames: [
              "I have ___ ___ and ___ ___, but I don't have a ___.",
              "I'm ___ years old, and my sister / brother is ___.",
              "I have a ___ because ___.",
              "Do you have a ___?",
            ],
            checklist: ["Four sentences, and each one starts with a capital letter", "More than one: -s (pencils, erasers)", "At least two joining words: and, but, because", "A full stop or ? at the end of every sentence"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in your numbers and things." },
              { level: "Core", task: "Write four sentences about your things, with 'and', 'but' or 'because' in two of them." },
              { level: "Stretch", task: "Write five sentences, with 'because' and a question for your partner, and tell your age." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u09-l5": {
      objectives: [
        "I can tell about my backpack three times, faster each time.",
        "I can write a paragraph about my backpack with 'and', 'but', 'so' and 'because'.",
      ],
      trim: { "Remember it!": 3, "Grab and count champions": 6, "Write like a champion": 9 },
      drop: ["Freeze and count"],
      add: [
        {
          after: "Grab and count champions",
          slide: {
            kind: "fluency",
            title: "Grammar drill: have, don't have, ask it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, then join two sentences. Then ask about real things.",
            chunks: [
              "I have three pencils.",
              "Do you have three pencils? Yes, I do. / No, I don't.",
              "I don't have a ruler, but I have two pens.",
              "We have four crayons, and they have five.",
              "Do they have a pet? No, they don't, but they have a plant.",
              "He has a red eraser, but he doesn't have a blue one.",
            ],
            recycle: ["Two plus three equals five.", "I'm seven years old."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Do, X = say it with don't, + = add 'and', 'but' or 'because' and more). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 90, say: "Real talk: ask your partner about their backpack: What do you have? Do you have a ruler? How many pencils do you have? Answer with a full sentence and one more with 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and', 'but' or 'because' and more.",
              "Say the WHOLE new sentence, with -s on things when there are more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Yes, I have' or 'I no have'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has in the backpack, and remember one answer to tell the class.",
            ],
            prompts: ["I have a ruler. (?)", "You have a pen. (X + a pencil)", "We have crayons. (?)", "They have a pet. (X + a plant)", "I have two erasers. (+ because I like drawing)", "She has a bag. (X)"],
            feedback:
              "Prompt, do not tell: for 'Yes, I have.' repeat it with a rising voice and say 'Yes, I d...' and pause; for 'I no have' start 'I don't ...' and pause; for a missing -s on pencils, tap your wrist; for 'he have' say 'he h...?'. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about the things they really carry, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but', 'and' and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you have a ___?", "No, I don't. I have a ___."] },
              { level: "Core", task: "Change every sentence with all three signs, with I, you, we and they." },
              { level: "Stretch", task: "Use he and she with -s, and 'because': 'She has a ruler. Does she have a pen? No, she doesn't. She has a pencil because she likes drawing.'" },
            ],
          },
        },
        {
          after: "Backpack secrets",
          slide: {
            kind: "writing",
            title: "My backpack: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the sentence that says what it is about, then the details, the question and the ending. Circle the joining words.",
              "Plan: write your key words in the boxes (a quick drawing is fine, too). Say one sentence for each box to your partner.",
              "Write: five or six sentences with the frames. Use 'and', 'but', 'so' or 'because' at least twice.",
              "Check: tick the checklist. Your partner points to every capital letter, every -s and every joining word.",
              "Teacher: look only at 'don't have', the plural -s and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My backpack",
              text: "My backpack is red and big. I have three pencils and two erasers, but I don't have a ruler. My friend has a ruler, so we share it. Do you have a ruler in your backpack? I like my backpack because it has many pockets.",
            },
            organiser: [
              { label: "My backpack", prompt: "Write the color and size of your backpack (key words, or a quick drawing)." },
              { label: "I have", prompt: "Write the things you have and how many of each." },
              { label: "I don't have", prompt: "Write one thing you don't have. Who has it? Can you share it?" },
              { label: "My question and ending", prompt: "Write one question for your reader and one thing you like about your backpack." },
            ],
            frames: [
              "My backpack is ___ and ___.",
              "I have ___ ___ and ___ ___, but I don't have a ___.",
              "My friend has a ___, so we share it.",
              "Do you have a ___ in your backpack?",
              "I like my backpack because ___.",
            ],
            checklist: [
              "Five or six sentences, and each one starts with a capital letter",
              "A full stop, ? or ! at the end of every sentence",
              "At least two joining words: and, but, so, because",
              "'I don't have', not 'I no have'; more than one: -s",
            ],
            sayIt: "Read your paragraph to your partner. Your partner answers your question. Then tell it again without looking, using your key words.",
            teacherNote:
              "This paragraph is the script for the recorded talk at home ('I have, I don't have: my things'): the child reads it, then tells it without looking. Plan with key words in the boxes; a drawing is optional. Mark only three things ('don't have', the plural -s and the joining words). Children may copy the model and change the words.",
            tiers: [
              { level: "Support", task: "Copy the model and change the color, the things and the reason.", frames: ["My backpack is ___.", "I have ___ ___, but I don't have a ___."] },
              { level: "Core", task: "Write five sentences about your own backpack, with 'and', 'but' or 'because' at least twice." },
              { level: "Stretch", task: "Write six sentences and answer your own question: 'Do you have a ruler? Yes, I do, but it is at home.'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Retell my backpack: three times",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell what is in your backpack three times. Each time is shorter, smoother and faster, and it ends with a question.",
            chunks: [
              "In my backpack, I have three pencils and two erasers, but I don't have a ruler.",
              "Do you have an eraser? Yes, I do, and I have a pen, too.",
              "You have four crayons, and I have two, so we have six things in all!",
              "I like my backpack because it's big.",
            ],
            recycle: ["Do you watch leaves fall? Yes, I do.", "Do you bring your friends? Yes, I do."],
            rounds: [
              { seconds: 55, say: "Round 1: Partner A tells what is in the backpack, then Partner B. Use your cards or things. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Take your backpack things or four picture cards.",
              "Tell your partner what you have and what you don't have, and end with a question. In each round Partner A talks, then Partner B talks.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board; the class fixes them. Then go on to round 2.",
              "The listener answers the question and gives a thumbs up.",
            ],
            prompts: ["(card: pencils)", "(card: ruler)", "(card: eraser)", "(card: crayons)"],
            feedback: correct + haveFix + " For 'Yes, I have' to 'Do you have ...?', start 'Yes, I d...' and pause: they finish with 'do'.",
            teacherNote:
              "Retelling the same information to three new partners gives the speed of repeating without a script: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix in the middle helps accuracy as well as speed. Grades 2-4 join their ideas with 'but', 'and', 'so' and 'because' and finish with a question for the listener. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it, then ask 'Do you have ...?'", frames: ["I have ___.", "I don't have ___.", "Do you have ___?"] },
              { level: "Core", task: "Tell all your things in joined sentences, with 'and', 'but' or 'so', and end with a question.", frames: ["I have ___ ___ and ___ ___, but I don't have a ___.", "___ plus ___ equals ___, so we have ___ things!"] },
              { level: "Stretch", task: "Add a reason and a follow-up question: 'I like my backpack because it's big. Do you have a big backpack? What do you have in it?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "I have, I don't have: my things",
        prompt: "Show three things you have and one thing you don't have. Count them, say how many you have in all and ask the viewer a question.",
        length: "60-90 seconds",
        steps: [
          "Find three things at home that you have, like pencils, toys or books.",
          "Say what you have and what you don't have three times: each time a little faster, like in class.",
          "Join your ideas with 'and', 'but', 'so' or 'because', and finish with a question: 'Do you have a ruler?'",
          "Record it once. Show each thing to the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say 'I have' and 'I don't have' with numbers, join your ideas with 'and', 'but' or 'because', and ask a question.",
        words: ["have", "don't have", "pencils", "erasers", "ruler", "count"],
        grammar: ["I have ___ ___, but I don't have a ___.", "We have ___ in all!", "Do you have a ___?"],
        rubric: [
          { label: "I have", description: "Says what they have with numbers: 'I have three pencils.'", weight: 2 },
          { label: "I don't have", description: "Says one thing they do not have: 'I don't have a ruler.', not 'I no have'.", weight: 3 },
          { label: "Joins ideas", description: "Uses 'and', 'but', 'so' or 'because' to join two ideas, and asks the viewer a question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 2 },
          { label: "Clear endings", description: "The -s at the end of pencils and erasers can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I have ___ ___.", "I don't have a ___."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["I have ___ ___ and ___ ___, but I don't have a ___.", "We have ___ in all! Do you have a ___?"], tips: ["Say how many in all, then ask a question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Do you have a ___? Ask your grown-up!", "You have ___, and I have ___, so we have ___ together because ___."], tips: ["Ask your grown-up a question, add up your things together and give a reason."] },
        ],
      },
    },
  },
};
