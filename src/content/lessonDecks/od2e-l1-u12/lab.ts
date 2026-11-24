import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 12 "Wants and
// Needs" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10), so the Lab asks for full sets of forms, joined sentences and real talk.
// Every lesson gets a grammar drill (the unit's grammar or the lesson's key structure:
// say it, ask it, say no, join it, then talk about real things), one fluency routine
// (the unit's phrases said again and again as longer sentences, a little faster each
// round, with Unit 11's phrases mixed back in) and one writing routine (say it, write it,
// read it back). Lessons 2, 4 and 6 end with a recorded talk for home (Lesson 5 already
// has its own video). Time comes from games and repeats, never from the book pages or the
// grammar. All text is original.

const fixIntro =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, spend one minute: write them on the board and let the class fix them, then go on: children who say it again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, hold up a finger for the missing -s, or say the error back with a rising voice) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear. ";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U12Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u12-l1": {
      objectives: ["I can say who helps me and how, in whole sentences: 'A doctor helps me get well.'"],
      drop: ["Freeze dance with the words", "Run and touch", "Quiet helpers whisper chant"],
      add: [
        {
          after: "Helpers' town role play",
          slide: {
            kind: "fluency",
            title: "Helper sprint: who helps me?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence about a helper, fast and smooth, and join two ideas with 'and' or 'because'.",
            chunks: [
              "A doctor helps me when I am sick.",
              "A teacher helps me learn, and a police officer helps us stay safe.",
              "I help my friend because she needs a pencil.",
              "Who helps you at school? A teacher helps me.",
              "We need food, and the farmer grows it.",
            ],
            recycle: ["The farmer has a cow.", "I want to buy a hat."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a helper card, the class says the whole sentence, with the joined part." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence and the follow-up question. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many joined sentences can you say?" },
            ],
            steps: [
              "Look at the helper card. Say a WHOLE sentence: 'A doctor helps me when I am sick.'",
              "Listen for the clap: it means change.",
              "In round 3, count your joined sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
            ],
            prompts: ["(card: doctor)", "(card: teacher + police officer)", "(card: me and my friend)", "(card: school)", "(card: farmer + food)"],
            feedback:
              fixIntro +
              "For this unit: one helper needs -s on the action word ('A doctor helps me'). If a child says 'A doctor help me', point to the frame and say 'A doctor help...?' and pause, or hold up one finger for the -s. 'We help' and 'I help' have no -s: show that with two cards.",
            teacherNote:
              "Whole sentences only, never single words: the point is to say 'A teacher helps me learn, and a police officer helps us stay safe' as one smooth piece. One person = helps with -s; many people or I/we = help. Vietnamese has no such ending, so the final -s in 'helps' is the sound to listen for. Mix in a Unit 11 card every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Say one whole sentence with the frame on the board.", frames: ["A ___ helps me.", "I help my ___."] },
              { level: "Core", task: "Say how they help and join two helpers: 'A doctor helps me get well.'", frames: ["A ___ helps me ___, and a ___ helps me ___."] },
              { level: "Stretch", task: "Give a reason with 'because' and ask your partner a follow-up question.", frames: ["I help my ___ because ___. Who helps you?"] },
            ],
          },
        },
        {
          after: "Look, read and write (SB 116 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: one helper, many helpers",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, say it for many helpers, join it. Then talk about the people who really help you.",
            chunks: [
              "A doctor helps me.",
              "Doctors help us.",
              "Who helps you? A teacher helps me.",
              "Does a teacher help you? Yes, a teacher does.",
              "A farmer doesn't help me learn, but a teacher helps me learn.",
              "A police officer helps us because we need to stay safe.",
            ],
            recycle: ["The farmer has a cow.", "I want to buy a hat."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, 2 = many helpers, + = add 'and' or 'because'). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the helper too: doctor, teacher, cook, farmer." },
              { seconds: 75, say: "Real talk: tell your partner who really helps you at home and at school, and how. Ask 'Who helps you?' and 'Does your mom help you?' Answer with a short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, 2 = many helpers (no -s), + = add 'and' or 'because'.",
              "Say the WHOLE new sentence, with -s on helps when it is one helper.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'A doctor help me' or 'Does a doctor helps you'), fix them together, then go on.",
              "In round 3 the drill becomes real: say who really helps you, and remember one answer to tell the class.",
            ],
            prompts: ["A doctor helps me. (?)", "A teacher helps me. (X)", "A cook helps us. (+ because)", "A farmer grows food. (2)", "A police officer helps us. (? and answer)"],
            feedback:
              "Prompt, do not tell: for 'A doctor help me' point to the frame and say 'A doctor h...?' and pause; for 'Does a teacher helps you?' hold up one finger and say 'Does a teacher h...?' (the -s lives in Does); for 'A farmer don't help me' repeat it with a rising voice and let the child find 'doesn't'. Say every -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children say who really helps them, so the form is used for meaning. Grades 2-4 can take the full set: statements, questions, short answers, negatives, 'and' and 'because', and one helper against many. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one helper, with the frames on the board.", frames: ["Does a ___ help you?", "A ___ helps me."] },
              { level: "Core", task: "Change every sentence, with one helper and many helpers, and join with 'and'." },
              { level: "Stretch", task: "Add 'because', and answer with one more sentence: 'Yes, a doctor does. A doctor helps me get well because I am sick.'", frames: ["A ___ helps me ___ because ___."] },
            ],
          },
        },
        {
          after: "Who helps you? (SB 117 Think)",
          slide: {
            kind: "writing",
            title: "My helpers: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the joining words: when, and, so.",
              "Plan: write the key words for each box (a quick drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences. Start with 'Many helpers help me every day.'",
              "Check: tick the checklist. Your partner points to every capital letter and every joining word.",
              "Teacher: look only at capital letters, the -s after one helper and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my helpers",
              text: "Many helpers help me every day. A doctor helps me get well when I am sick. A teacher helps me learn at school, and a cook makes food for my family. I need all my helpers, so I say thank you!",
            },
            organiser: [
              { label: "Helper 1", prompt: "Key words: who is it? How does this helper help you? When?" },
              { label: "Helper 2", prompt: "Key words: a second helper. How does this helper help you? Join it with 'and'." },
              { label: "Thank you", prompt: "Key words: why you need your helpers. Finish with 'so I say thank you!'" },
            ],
            frames: ["Many helpers help me every day.", "A ___ helps me ___ when ___.", "A ___ helps me ___, and a ___ ___.", "I need my helpers, so I say thank you!"],
            checklist: [
              "A capital letter at the start and a full stop or ! at the end of every sentence",
              "One helper: helps (with -s). Many helpers: help (no -s)",
              "At least one joining word: and, when, because or so",
            ],
            sayIt: "Read your helper paragraph to your partner. Then tell it again without looking.",
            teacherNote:
              "A short paragraph for grades 2-4: four to six sentences. The first says what it is about, the middle ones give details joined with and, when or because, the last is the ending. Key words are the plan, so children think before they write; a drawing is allowed for those who like it. Mark only three things (capital letters, the -s after one helper, the joining words) and let the child find the mistake from your dot. The first sentence has 'help' with no -s because the helpers are many: a good moment to show both.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one or two words in each.", frames: ["A ___ helps me ___.", "I say thank you!"] },
              { level: "Core", task: "Write four or five sentences: the topic, two helpers joined with 'and' or 'when', and a thank you." },
              { level: "Stretch", task: "Write six sentences. Add a reason with 'because' and a question for the reader: 'Who helps you?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u12-l2": {
      objectives: ["I can say what we need and what I want, and why, with 'but' and 'because'."],
      trim: { "Farm, truck, store, home": 5 },
      drop: ["Need or want? Run to the mat"],
      add: [
        {
          after: "Who helps us?",
          slide: {
            kind: "fluency",
            title: "Need or want: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same need-or-want talk three times with three partners. Each time is smoother, and each time you say why.",
            chunks: [
              "We need water, and we need food.",
              "Water is a need because we drink it every day.",
              "I want a toy, but I need clothes.",
              "A toy is a want because we can live without it.",
              "Do you need water? Yes, I do.",
            ],
            recycle: ["The cow needs water.", "He doesn't have a hat."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A picks three picture cards and says 'need' or 'want' for each one, with a reason. Then Partner B does the same. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A says the same three sentences, a little faster. Then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: New partner. Same again, and the listener asks one question! Partner A, then Partner B. Can you say all three without stopping?" },
            ],
            steps: [
              "Take three cards from the pile. Look at each picture.",
              "Say a WHOLE sentence for each card, with a reason: 'Water is a need because we drink it every day.' In each round Partner A talks, then Partner B talks.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
              "When the bell rings, change partners and say the same three again. Partner A first, then Partner B.",
            ],
            prompts: ["(card: water)", "(card: clothes)", "(card: toy)", "(card: game)", "(card: food)"],
            feedback:
              fixIntro +
              "For this unit: children often leave out 'a' or 'is' ('Water need', 'Toy a want') or the joining word. Point to the frame 'A ___ is a ___ because ___.' and pause, or say 'Water is a...?' with a rising voice. Two sentence ideas are enough: 'We need ___.' and 'A ___ is a want because ___.'",
            teacherNote:
              "The same task three times with a new partner is task repetition: the second and third tellings are smoother because children are not searching for words. Keep the language the same between rounds; the listener's question in round 3 keeps the last partner awake. Listen for the missing 'is', the 'because' and the final -s in 'needs' on the recycle phrase.",
            tiers: [
              { level: "Support", task: "Say 'A ___ is a need.' or 'A ___ is a want.' for each card, using the frame.", frames: ["A ___ is a need.", "A ___ is a want."] },
              { level: "Core", task: "Add a reason: 'Water is a need because we drink it every day.'", frames: ["A ___ is a ___ because ___."] },
              { level: "Stretch", task: "Join a need and a want with 'but', then ask your partner a question: 'I need clothes, but I want a toy. What do you need?'", frames: ["I need ___, but I want ___. What do you ___?"] },
            ],
          },
        },
        {
          after: "Find it in the text",
          slide: {
            kind: "fluency",
            title: "Grammar drill: need, want and the -s",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the story's sentence fast and right: ask it, say no, join it, change the person. Then ask about real needs and wants.",
            chunks: [
              "We need water and food.",
              "Do you need a coat? Yes, I do. / No, I don't.",
              "I don't need a toy, but I want one.",
              "She needs water, but she wants juice.",
              "Does he want a toy? Yes, he does.",
              "We need food because we get hungry.",
            ],
            recycle: ["The cow needs water.", "He doesn't have a hat."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but' or 'because', he/she = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 75, say: "Real talk: ask your partner what they really need and want today (water, sleep, a pencil, a new bag). Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Do or Does, X = say it with don't or doesn't, + = add 'but' or 'because'.",
              "Say the WHOLE new sentence, with -s after he and she: 'She needs, he wants'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'She need water' or 'Does he wants'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really needs and wants, and remember one answer to tell the class.",
            ],
            prompts: ["I need water. (?)", "We want a toy. (X)", "You need a coat. (+ because)", "I want a game. (she)", "They need food. (? then answer)"],
            feedback:
              "Prompt, do not tell: for 'She need water' hold up one finger and say 'She ne...?'; for 'Does he wants a toy?' point to 'Does' and say 'Does he w...?'; for 'Yes, I need' repeat it with a rising voice and let the child fix it to 'Yes, I do.' Say every -s and n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about what they really need and want, so the form is used for meaning. Grades 2-4 can take the full set: statements, questions, short answers, negatives, 'but' and 'because', and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you need ___?", "I don't need ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he and she with -s, then join with 'because': 'She needs water because she is thirsty.'", frames: ["He / She needs ___ because ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: need, want and the -s",
          slide: {
            kind: "writing",
            title: "Our needs and wants: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the needs, the wants and the joining words.",
              "Plan: write key words in each box (a quick drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences. Start with 'We all need and want things.'",
              "Check: tick the checklist. Your partner points to every full stop and every joining word.",
              "Teacher: look only at capital letters, full stops and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: needs and wants",
              text: "We all need and want things. We need water, food and clothes because we cannot live without them. We want toys and games, but we do not need them. I need water, but I want a toy! What do you need and want?",
            },
            organiser: [
              { label: "Needs", prompt: "Key words: three things we need, and why. Say: We need ___ because ___." },
              { label: "Wants", prompt: "Key words: two things we want. Say: We want ___, but we do not need them." },
              { label: "Me", prompt: "Key words: one need and one want for you. Say: I need ___, but I want ___." },
            ],
            frames: ["We all need and want things.", "We need ___, ___ and ___ because ___.", "We want ___ and ___, but ___.", "I need ___, but I want ___!", "What do you need and want?"],
            checklist: [
              "A capital letter at the start and a full stop, ! or ? at the end of every sentence",
              "'We need' and 'We want': no -s",
              "'and', 'but' and 'because' join the ideas",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote:
              "A short paragraph about the unit's big idea: four to six sentences planned with key words. Needs and wants are the two groups; 'because' gives the reason, 'but' separates a want from a need, and the last sentence asks the reader a question. This paragraph is the script for the recorded talk at home, 'My needs and wants cards': children hold up their things as they say it. Mark only capital letters, full stops and the joining words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one or two words in each.", frames: ["We need ___.", "We want ___."] },
              { level: "Core", task: "Write four or five sentences, using 'because' once and 'but' once." },
              { level: "Stretch", task: "Write six sentences. Add a second reason with 'because' and a sentence with 'then': 'Then we need sleep.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My needs and wants cards",
        prompt: "Find three or four things at home. Hold each one up, say if it is a need or a want, and say why. Join two ideas with 'but' or 'because'.",
        length: "60-90 seconds",
        steps: [
          "Find three or four things at home: water, a toy, clothes, a book ...",
          "Practise your sentences three times, a little faster each time. Say why: 'Water is a need because I drink it every day.'",
          "Record it once. Hold each thing up as you talk.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say if each thing is a need or a want, say why, and keep talking without long stops.",
        words: ["need", "want", "water", "food", "clothes", "money", "toy"],
        grammar: ["___ is a need. / ___ is a want.", "I need ___, but I want ___.", "We need ___ because ___."],
        rubric: [
          { label: "Need or want", description: "Says need or want for each thing, in a whole sentence.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: water, food, clothes, money.", weight: 2 },
          { label: "Joins ideas", description: "Joins ideas with 'but' or 'because': 'I need water, but I want a toy.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear is and a", description: "Says 'is' and 'a': 'Water is a need.' Not 'Water need.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I need ___.", "I want ___."], tips: ["Hold up each thing and point to it."] },
          { level: "Core", who: "Most children", frames: ["___ is a need because ___.", "___ is a want."], tips: ["Say 'is a' every time and give one reason."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["We need ___ because ___.", "I want ___, but I need ___. What do you need?"], tips: ["Join with 'but' and 'because', and end with a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u12-l3": {
      objectives: ["I can ask 'Does she have it?' and answer with a full sentence, fast, round the circle."],
      drop: ["Secret card: guess the child", "Quiet song whisper"],
      add: [
        {
          after: "Does she have it? What does he want?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Does, answer it, say it with doesn't, and join it with 'but'. Then ask about real friends and family.",
            chunks: [
              "She has a red pencil.",
              "Does she have a red pencil? Yes, she does.",
              "She doesn't have a red pencil, but she has a blue one.",
              "What does he want? He wants a game because he likes to play.",
              "He wants a drum, and she wants a kite.",
              "Does he want a drum? No, he doesn't. He wants a bus.",
            ],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but' or 'because', I/you/they = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: he, she, I, you, they." },
              { seconds: 75, say: "Real talk: ask your partner about a real friend or family member (no names needed): 'Does your sister have a pet? What does your brother want?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, + = add 'but' or 'because'.",
              "Say the WHOLE new sentence: after Does the word stays short ('Does she have'), in the answer it takes -s ('She has').",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does she wants' or 'Yes, she do'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about people you really know, and remember one answer to tell the class.",
            ],
            prompts: ["She has a pencil. (?)", "He wants a drum. (X)", "She has a bus. (+ but)", "I want a kite. (she)", "They have a ball. (he, ?)"],
            feedback:
              "Prompt, do not tell: for 'Does she wants a kitten?' point to 'Does' and say 'Does she w...?' then show 'does' and 'want' as two cards; for 'Yes, she do' say 'Yes, she d...?' with a rising voice; for 'He have a bus' say 'He ha...?' and hold up a finger. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about real friends and family, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and 'because', and a change of person. 'Does' takes the -s, so the next word stays short: say that rule in plain words once. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with she and he, with the frames on the board.", frames: ["Does she have ___?", "She doesn't have ___."] },
              { level: "Core", task: "Change every sentence, with he, she, I, you and they, and join with 'but'." },
              { level: "Stretch", task: "Add 'because' and a follow-up question: 'He wants a drum because he likes music. Does he have a drum?'", frames: ["He / She wants ___ because ___."] },
            ],
          },
        },
        {
          after: "Choose a girl or a boy (SB 121 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: Does she have it?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, add one more sentence, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Does she have a red pencil? Yes, she does. She has a red pencil and a blue pencil.",
              "Does he have a drum? No, he doesn't. He has a kite, but he wants a drum.",
              "No, he doesn't. He wants a game, but he has a kite.",
              "What does she want? Why does she want it?",
              "He wants a game because he likes to play.",
            ],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a card of a boy or a girl. Answer and add one more sentence." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Does she have a ___?' or 'What does he want?'",
              "They answer: 'Yes, she does.' or 'No, he doesn't.' or 'He wants a ___ because ___.' Then they ask the next friend.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
            ],
            prompts: ["Does she have ___?", "Does he want ___?", "What does he want?", "Why does she want it?"],
            feedback:
              fixIntro +
              "For this unit: the two big slips are 'Does she wants...?' and 'Yes, she do.' For the first, point to the frame and say 'Does she w...?' then show 'does' and 'want' as two cards: -s lives in only ONE place. For the second, say 'Yes, she d...?' with a rising voice and let the child finish 'does'. Model 'does' and 'wants' with a clear final sound.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Does she ...?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'Does she have a pencil? Yes, she have' and prompt with a raised finger. Mix in Unit 11's 'He has / She wants' cards so those stay fast.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, she does.' or 'No, he doesn't.' and pass the question on with the frame on the board.", frames: ["Does she have ___?", "Yes, she does. / No, she doesn't."] },
              { level: "Core", task: "Answer with more: 'No, she doesn't. She has a blue pencil.'", frames: ["No, he doesn't. He has ___."] },
              { level: "Stretch", task: "Chain two questions: 'Does he have a bus? No, he doesn't. What does he have?'", frames: ["Does ___ have ___? No, ___ doesn't. What does ___ have?"] },
            ],
          },
        },
        {
          after: "I want, I have: write and change",
          slide: {
            kind: "writing",
            title: "Fix the question mistakes",
            routine: "fix it",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: is there a missing or extra -s? A wrong word? Some sentences have two mistakes.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Does she wants a kitten?", answer: "Does she want a kitten?" },
              { q: "She want a bicycle, but he have a bus.", answer: "She wants a bicycle, but he has a bus." },
              { q: "Yes, she do. She have a red pencil.", answer: "Yes, she does. She has a red pencil." },
              { q: "He wants a drum because he like music.", answer: "He wants a drum because he likes music." },
              { q: "She doesn't has a ball, but she have a kite.", answer: "She doesn't have a ball, but she has a kite." },
            ],
            frames: ["Does she want ___?", "She wants ___, but he has ___.", "He wants ___ because he likes ___."],
            checklist: [
              "After Does and doesn't: want and have (no -s)",
              "In the answer: wants, has and likes (with -s)",
              "A capital letter and a full stop or a question mark",
            ],
            sayIt: "Read your fixed sentences to the class, with a clear -s on wants, has and likes.",
            teacherNote:
              "Two or three error types at a time: -s after Does and doesn't (it does not belong), -s on wants, has and likes (it does), and 'does' in the short answer. Vietnamese has no such endings, so children place -s by guess: fix one together first and say the rule in plain words: 'Does takes the -s, so the next word stays short.' Items 2 to 5 have two clauses, so there can be two mistakes in one sentence.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix sentences 1 to 4." },
              { level: "Stretch", task: "Fix all five, then write one more sentence with two mistakes for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u12-l4": {
      objectives: ["I can tell about our picnic three times, faster each time, and say why: 'We want juice, but we need water.'"],
      drop: ["Mime hot seat", "Picnic says", "Quiet picnic whisper"],
      add: [
        {
          after: "Picnic role play",
          slide: {
            kind: "fluency",
            title: "Picnic talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same picnic talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "We want juice and a sandwich, but we need water.",
              "The farmer grows grapes, and the cook makes a sandwich.",
              "We need water because we get thirsty.",
              "Yum! Do you want a cookie too?",
              "Yes, we want cookies, and we want grapes too!",
            ],
            recycle: ["Can I borrow your ball, please?", "Sure! Here you are."],
            rounds: [
              { seconds: 60, say: "Round 1: Tell your picnic talk to Partner 1. The listener counts the foods on their fingers and asks one question. Then they tell you theirs. Then change partners." },
              { seconds: 45, say: "Round 2: Partner 2. The same talk in less time. You talk, then your partner talks. Then change partners." },
              { seconds: 30, say: "Round 3: Partner 3. Fast and smooth! You talk, then your partner talks. The listener says 'Yum!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round Line A talks first, then Line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same again with the new partner: Line A talks, then Line B talks.",
            ],
            feedback:
              fixIntro +
              "For this unit: one person takes -s on the action word ('The farmer grows grapes', 'The cook makes a sandwich'), a group does not ('The farmers grow grapes'). If a child says 'The farmer grow', start 'The farmer gr...?' and pause, or hold up a finger for -s. 'We want' and 'we need' have no -s: say them clearly and let the class echo.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity scaled for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and from the one minute of correction after round 1. Listen for the joining words and for the final -s on grows and makes.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["We want ___.", "We need ___.", "The ___ makes ___."] },
              { level: "Core", task: "Say four or five sentences and join two with 'and' or 'but', without the board." },
              { level: "Stretch", task: "Give a reason with 'because' and end with a question: 'We need water because we get thirsty. Do you want a cookie too?'", frames: ["We need ___ because ___. Do you want ___?"] },
            ],
          },
        },
        {
          after: "Naming word + action word",
          slide: {
            kind: "fluency",
            title: "Grammar drill: one person, more than one",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: one person or more than one, ask it, say no, join it. Then tell about real people who help your family.",
            chunks: [
              "The farmer grows grapes.",
              "The farmers grow grapes.",
              "Does the farmer grow grapes? Yes, the farmer does.",
              "The cook doesn't grow food, but the cook makes a sandwich.",
              "The truck driver brings fruit, and the cook makes lunch.",
              "We want juice because we are thirsty.",
            ],
            recycle: ["Can I borrow your ball, please?", "Sure! Here you are."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, 2 = more than one person, + = add 'and', 'but' or 'because'). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the helper too: farmer, cook, teacher, truck driver." },
              { seconds: 75, say: "Real talk: tell your partner what real people at home do: 'My mom cooks dinner, and my dad washes the dishes.' Ask one question: 'Who cooks at your home?'" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, 2 = more than one person (no -s on the action word), + = add 'and', 'but' or 'because'.",
              "Say the WHOLE new sentence. One person: -s on the action word. More than one: no -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The farmer grow' or 'The farmers grows'), fix them together, then go on.",
              "In round 3 the drill becomes real: say what people you know really do, and remember one answer to tell the class.",
            ],
            prompts: ["The farmer grows grapes. (?)", "The cook makes a sandwich. (X)", "The teacher helps us. (2)", "The driver brings fruit. (+ because)", "The doctors help people. (1, ?)"],
            feedback:
              "Prompt, do not tell: for 'The farmer grow grapes' start 'The farmer gr...?' and pause, or hold up one finger for the -s; for 'The farmers grows' hold up two fingers and say 'More than one: grow...?'; for 'Does the farmer grows?' point to 'Does' and say 'Does takes the -s.' Say every -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children say what real people do, so the form is used for meaning. Grades 2-4 can take the full set: statements, questions, short answers, negatives, 'and', 'but' and 'because', and one person against many. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use one person only, with ? and X, and the frames on the board.", frames: ["The ___ ___s ___.", "Does the ___ ___?"] },
              { level: "Core", task: "Change every sentence, with one person and more than one, and join with 'and' or 'but'." },
              { level: "Stretch", task: "Add 'because' and a follow-up question: 'The cook makes lunch because we are hungry. Who makes lunch at your home?'", frames: ["The ___ ___s ___ because ___."] },
            ],
          },
        },
        {
          after: "Naming and action words (SB 123 F)",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "The girl drinks juice. The girl eats a cookie. (and)", answer: "The girl drinks juice and eats a cookie." },
              { q: "The farmer grows grapes. The cook makes a sandwich. (and)", answer: "The farmer grows grapes, and the cook makes a sandwich." },
              { q: "We want juice. We need water. (but)", answer: "We want juice, but we need water." },
              { q: "Doctors help people. Teachers help people. (and)", answer: "Doctors and teachers help people." },
              { q: "We need water. We get thirsty. (because)", answer: "We need water because we get thirsty." },
            ],
            frames: ["The ___ drinks ___ and eats ___.", "We want ___, but we need ___.", "We need ___ because ___."],
            checklist: [
              "The first words are only written once when the same person does both things",
              "'and', 'but' and 'because' join the two parts",
              "A comma before 'and' or 'but' when two full sentences join",
              "One person: drinks, eats (-s). More than one: help (no -s)",
            ],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote:
              "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'The girl'. Item 4 has TWO people, so help has no -s: a good moment to listen for it. Items 2, 3 and 5 join two full ideas, so they need a comma before 'and' or 'but' and none before 'because'.",
            tiers: [
              { level: "Support", task: "Do items 1, 3 and 5 with the teacher." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Join three: 'We want juice, a sandwich and grapes, but we need water.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My picnic talk",
        prompt: "Pack a pretend picnic at home. Show what we want and what we need, and say why. Say who makes or grows the food.",
        length: "60-90 seconds",
        steps: [
          "Put some food and a bottle of water on a mat: a sandwich, grapes, juice, a cookie.",
          "Say your picnic talk three times: each time a little faster, like in class. Join two ideas with 'and', 'but' or 'because'.",
          "Record it once. Show each thing as you say it.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what we want and what we need for a picnic, join your ideas, and keep talking without long stops.",
        words: ["sandwich", "grapes", "juice", "cookie", "chips", "soda", "water"],
        grammar: ["We want ___, but we need ___.", "The ___ + action word with -s: The farmer grows grapes.", "We need ___ because ___."],
        rubric: [
          { label: "Want and need", description: "Says what we want and what we need, using 'We want' and 'We need'.", weight: 3 },
          { label: "Picnic words", description: "Uses food words from the unit: sandwich, grapes, juice, cookie.", weight: 2 },
          { label: "Joins ideas", description: "Joins ideas with 'and', 'but' or 'because': 'We want juice, but we need water.'", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "The -s", description: "The -s can be heard on a helper's action word: grows, makes.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["We want ___.", "We need ___."], tips: ["Point to each food as you say it."] },
          { level: "Core", who: "Most children", frames: ["We want ___ and ___, but we need ___.", "The ___ makes ___."], tips: ["Use 'and' and 'but' to join your ideas."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The farmer grows ___, and the cook makes ___.", "We need ___ because ___. Do you want ___?"], tips: ["Say who grows or makes the food, give a reason with 'because' and end with a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u12-l5": {
      objectives: ["I can tell the class what my friends need and want, and join my ideas with 'but' and 'because'."],
      drop: ["Swap and act", "Thank-you circle"],
      add: [
        {
          after: "What do you need? What do you want?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: needs, wants and the -s",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it, change the person. Then ask about real needs and wants for your survey.",
            chunks: [
              "I need water.",
              "She needs water, and he needs clothes.",
              "Do you want a game? Yes, I do. / No, I don't.",
              "Does she want a game? No, she doesn't. She wants a kite.",
              "He doesn't need a toy, but he wants one.",
              "We all need food because we get hungry.",
            ],
            recycle: ["What do you need? I need ___.", "Does she have a pencil? Yes, she does."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but' or 'because', he/she = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 75, say: "Real talk: ask your partner what they really need and want. Answer with the full short answer and one more sentence. Then tell your partner's answer back: 'She needs ___, but she wants ___.'" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Do or Does, X = say it with don't or doesn't, + = add 'but' or 'because'.",
              "Say the WHOLE new sentence, with -s after he and she.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'She need water' or 'What he wants'), fix them together, then go on.",
              "In round 3 the drill becomes real: it is the survey. Remember your partner's answer so you can tell it to the class.",
            ],
            prompts: ["I need water. (?)", "She wants a kite. (X)", "We need food. (+ because)", "They want a game. (he)", "You need a pencil. (? then answer)"],
            feedback:
              "Prompt, do not tell: for 'She need water' hold up one finger and say 'She ne...?'; for 'What he wants?' point to the frame 'What does he ___?' and let the child rebuild it; for 'Yes, she want' say 'Yes, she d...?' with a rising voice. Say every -s and n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 is the survey itself, so the form is used for meaning and the children have something true to say in the retell that follows. Grades 2-4 can take the full set: statements, questions, short answers, negatives, 'but' and 'because', and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you need ___?", "I don't need ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he and she with -s, join with 'but' or 'because' and ask a follow-up question: 'She needs water, but she wants juice. Does he want juice too?'", frames: ["He / She needs ___, but he / she wants ___."] },
            ],
          },
        },
        {
          after: "Tell the class (SB 125 C)",
          slide: {
            kind: "fluency",
            title: "Survey retell: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell what your survey showed three times. Each time is shorter, smoother and faster, and you join your ideas.",
            chunks: [
              "I asked three friends about needs and wants.",
              "She needs water, but she wants a toy.",
              "He needs clothes, and he wants a game too.",
              "We all need food because we get hungry.",
              "I think she wants a kite, but does he want one?",
            ],
            recycle: ["What do you need? I need ___.", "Does she have a pencil? Yes, she does."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells what the survey chart shows and points to the pictures. Then Partner B tells theirs. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells it again in less time. Then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Tell it fast! Partner A, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your survey chart. Point to each friend as you talk.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board, fix them together, then go on.",
              "When the bell rings, change partners. Partner A talks first, then Partner B.",
              "The listener says 'Wow!' at the end and asks one question: 'What does she want?'",
            ],
            prompts: ["(chart: three friends)", "(chart: needs)", "(chart: wants)"],
            feedback:
              fixIntro +
              "For this unit: one friend takes -s on needs and wants ('She needs water', 'He wants a game'). If a child says 'She need water', start 'She ne...?' and pause, or hold up one finger for the -s. If a child says 'What he wants?', point to the frame 'What does he ___?' and let them rebuild it.",
            teacherNote:
              "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one minute of correction between round 1 and 2 is what makes accuracy improve, not only speed. Accept shorter tellings in rounds 2 and 3; the shrinking time does the work, but the joining words should stay.",
            tiers: [
              { level: "Support", task: "Point to each friend on the chart and say one sentence for each.", frames: ["She needs ___.", "He wants ___."] },
              { level: "Core", task: "Tell about three friends and join a need and a want with 'but' or 'and'.", frames: ["She needs ___, but she wants ___."] },
              { level: "Stretch", task: "Add what everyone needs and a question: 'We all need water and food. I think she wants a toy, but does he want one?'", frames: ["We all need ___ because ___. Does he ___?"] },
            ],
          },
        },
        {
          after: "Make the survey chart (SB 125 B)",
          slide: {
            kind: "writing",
            title: "My survey paragraph: plan, write, check",
            routine: "paragraph",
            genre: "survey report",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the two friends on your survey chart and to the joining words.",
              "Plan: write key words in each box (a quick drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences about your own survey.",
              "Check: tick the checklist. Your partner checks your sentences against the chart.",
              "Teacher: look only at the -s on needs and wants, the full stops and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my survey",
              text: "I asked two friends about needs and wants. A girl needs water, but she wants a kite. A boy needs clothes, and he wants a game too. We all need food because we get hungry. What do you need and want?",
            },
            organiser: [
              { label: "Friend 1", prompt: "Key words: who is the first friend? What does this friend need? What does this friend want? Join them with 'but'." },
              { label: "Friend 2", prompt: "Key words: the second friend. What does this friend need? What does this friend want? Join them with 'and' or 'but'." },
              { label: "Everyone", prompt: "Key words: something we all need, and why. Then one question for the reader." },
            ],
            frames: [
              "I asked two friends about needs and wants.",
              "A ___ needs ___, but she wants ___.",
              "A ___ needs ___, and he wants ___ too.",
              "We all need ___ because ___.",
              "What do you need and want?",
            ],
            checklist: [
              "My sentences match my chart",
              "One girl or boy: needs and wants (with -s)",
              "A capital letter at the start and a full stop, ! or ? at the end of every sentence",
              "At least two joining words: and, but or because",
            ],
            sayIt: "Show your chart to a partner and tell your paragraph without reading.",
            teacherNote:
              "A short paragraph from the survey chart: four to six sentences, planned with key words. The first says what it is about, two give details joined with but or and, then a reason with because, and a question for the reader. Mark only the -s on needs and wants (one girl or boy), the full stops and the joining words; let the child find the mistake from your dot. Children who did not ask a girl and a boy can write 'A friend needs ___, but my friend wants ___.'",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one or two words in each.", frames: ["A ___ needs ___.", "We all need ___!"] },
              { level: "Core", task: "Write four or five sentences about two friends, with 'but' and 'because'." },
              { level: "Stretch", task: "Write six sentences. Add a third friend and a 'then' sentence: 'Then I asked my teacher.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u12-l6": {
      objectives: ["I can ask 'Does he have it? What does she want?' and answer with a full sentence and one more, without looking."],
      drop: ["Hop and fix", "Pocket freeze"],
      add: [
        {
          after: "Grammar: Does she want it? She wants it!",
          slide: {
            kind: "fluency",
            title: "Grammar drill: has, wants, does, doesn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with doesn't, join it and change the person. Then ask about real people you know.",
            chunks: [
              "Kiki has a ball, and she wants a kite.",
              "Does Kiki have a ball? Yes, she does.",
              "What does Ollie want? He wants a bed because he is tired.",
              "Ollie doesn't have a bed, but he has a pillow.",
              "I have a pencil, but my friend doesn't have one.",
              "Do they want water? Yes, they do.",
            ],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but' or 'because', I/you/they = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, they." },
              { seconds: 75, say: "Real talk: ask your partner about their family and friends: 'Does your brother have a bike? What does your mom want?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Do or Does, X = say it with don't or doesn't, + = add 'but' or 'because'.",
              "Say the WHOLE new sentence: after Do, Does, don't and doesn't the word stays short; after he and she in a statement it takes -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'He have a bus' or 'What she wants'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about people you really know, and remember one answer to tell the class.",
            ],
            prompts: ["Kiki has a ball. (?)", "Ollie wants a bed. (X)", "She has a kite. (+ but)", "He wants a drum. (they)", "I have a pencil. (she, ?)"],
            feedback:
              "Prompt, do not tell: for 'He have a bus' say 'He ha...?' and hold up a finger; for 'What she wants?' point to the frame 'What does she ___?' and let the child rebuild it; for 'Yes, she do' say 'Yes, she d...?' with a rising voice. Say every -s and n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about real family and friends, so the form is used for meaning. This is the lesson's own grammar at full strength: questions, short answers, negatives, 'but' and 'because', and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with she and he, with the frames on the board.", frames: ["Does he have ___?", "He doesn't have ___."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she and they, and join with 'but'." },
              { level: "Stretch", task: "Add 'because' and a follow-up question: 'She wants a kite because she likes to fly it. Does she have a kite?'", frames: ["He / She wants ___ because ___."] },
            ],
          },
        },
        {
          after: "Two pockets: ask over the wall",
          slide: {
            kind: "fluency",
            title: "Pocket sprint: Does she have it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with the follow-up: this unit's and last unit's.",
            chunks: [
              "Does he have a ball? Yes, he does. He has a ball and a drum.",
              "Does she have water? No, she doesn't. She needs water.",
              "What does she want? She wants a kite because she likes to fly it.",
              "He has a bus, and he wants a drum.",
              "Does he want a bed? No, he doesn't, but he wants a pillow.",
            ],
            recycle: ["The farmer has a cow.", "She doesn't want a drum."],
            rounds: [
              { seconds: 75, say: "Together: the teacher flashes a pocket card, the class says the question, the answer and the next sentence." },
              { seconds: 60, say: "Boys ask, girls answer. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write the two mistakes you heard most on the board, fix them together, then go on.",
            ],
            feedback:
              fixIntro +
              "For this unit: after Does the word stays short ('Does she have'), in the answer it takes -s ('She has', 'She wants'). 'He have a bus' needs 'has': say 'He ha...?' and pause, or hold up a finger. 'Yes, she do' needs 'does': rising voice, let the child finish it.",
            teacherNote:
              "A quick, high-energy recall of the whole unit's grammar, with Unit 11's phrases mixed in (spaced retrieval): this is what keeps 'has' and 'doesn't' from fading. Whole sentences only, one smooth breath, and now with the extra sentence after the answer. Say every -s clearly yourself.",
            tiers: [
              { level: "Support", task: "Use the pocket cards and the frames on the board.", frames: ["Does he have ___?", "Yes, he does. / No, he doesn't."] },
              { level: "Core", task: "Answer with more, without the board: 'No, she doesn't. She wants a kite.'" },
              { level: "Stretch", task: "Answer, add a reason and ask a follow-up question: 'She wants a kite because she likes to fly it. What does he want?'", frames: ["He / She wants ___ because ___. What does ___ want?"] },
            ],
          },
        },
        {
          after: "Write like a champion: has and wants",
          slide: {
            kind: "writing",
            title: "Grow the pocket sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add the new words and the joining word.",
              "Write your big sentence. Say it first, then write it.",
            ],
            items: [
              { q: "She has a ball. (add: red)", answer: "She has a red ball." },
              { q: "He wants a drum. (add: big, because he likes music)", answer: "He wants a big drum because he likes music." },
              { q: "Does she have a pencil? (add: blue)", answer: "Does she have a blue pencil?" },
              { q: "She wants water. (add: cold, and she wants a snack)", answer: "She wants cold water, and she wants a snack." },
              { q: "He has a bus. (add: yellow, but he wants a truck)", answer: "He has a yellow bus, but he wants a truck." },
            ],
            frames: ["She has a ___ ___, and he has a ___ ___.", "He wants ___ because ___.", "She has ___, but she wants ___."],
            checklist: [
              "has and wants have -s when it is one girl or boy",
              "After Does: have (no -s)",
              "'and', 'but' and 'because' join the two parts",
              "A capital letter and a full stop or a question mark",
            ],
            sayIt: "Read your big sentences to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Write your own: 'He has a big green bus, but he wants ___ because ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My pocket friend",
        prompt: "Pick a toy or draw a friend. Tell us what he or she has and what he or she wants, and say why. Ask one question at the end.",
        length: "60-90 seconds",
        steps: [
          "Choose a toy or draw a pocket friend. Give your friend a name.",
          "Say your talk three times: each time a little faster, like in class. Join two ideas with 'and', 'but' or 'because'.",
          "Record it once. Show your friend to the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what your friend has and what he or she wants, join your ideas, ask one question, and keep talking.",
        words: ["has", "wants", "needs", "water", "toy", "game", "pocket"],
        grammar: ["He / She has ___. He / She wants ___.", "Does he / she have ___? Yes, he / she does.", "He / She wants ___ because ___."],
        rubric: [
          { label: "Has and wants", description: "Says what the friend has and wants, with -s: 'She has a ball. She wants a kite.'", weight: 3 },
          { label: "Joins ideas", description: "Joins ideas with 'and', 'but' or 'because': 'She has a ball, but she wants a kite.'", weight: 3 },
          { label: "A question", description: "Asks one question with Does: 'Does she have water?'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Short answers", description: "Answers 'Yes, she does.' or 'No, he doesn't.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is ___.", "He / She has a ___.", "He / She wants a ___."], tips: ["Point to your pocket friend."] },
          { level: "Core", who: "Most children", frames: ["He / She has ___, but he / she wants ___.", "Does he / she have ___?"], tips: ["Join with 'but', then ask a question and answer it."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["He / She doesn't have ___, but he / she needs ___ because ___.", "Does he / she want ___? Yes, he / she does."], tips: ["Say one thing the friend does NOT have, what he or she needs, and why."] },
        ],
      },
    },
  },
};
