import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 7 "Subtraction"
// (src/lib/lessonDecks/lab.ts puts it into the decks). The only class on this book is
// Sanrio Grade 6: students in grades 6-7 (ages 11-13) working on a book written for younger
// children, so the Lab raises the language: longer chunks with reasons and contrasts,
// topics from their own lives, a grammar drill in every lesson, full paragraphs in three
// lessons and harder sentence work in the others. Every lesson gets a grammar drill and one
// more fluency routine (the unit's past simple yes/no sentences and take-away sentences
// said again and again as whole phrases, with earlier phrases mixed back in). Two lessons
// end with a recorded talk for home that students make on their own. Time comes from games
// for younger children and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('I didn't ...?'), point to the frame, or tap your wrist for a missing -s or -ed. Example: a student says 'I didn't ate the grapes.' You say 'I didn't ...?' and wait, and the student says 'eat'. For a sound, just say it right and let them echo it. Say every final -s, -ed and n't clearly yourself: grapes, tickets, bought, gave, didn't. Students copy what they hear.";

export const odL2U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u07-l1": {
      objectives: [
        "I can explain what I had, bought, gave away and didn't give away, and say how many are left, in full sentences with a reason.",
      ],
      drop: ["Take-away chant", "The vanishing snack", "Run and touch"],
      trim: {
        "Is it or is it not? (single-digit and double-digit)": 4,
        "Big Question Chart (SB 67 D)": 5,
        "True or false corners (SB 68 B)": 7,
      },
      add: [
        {
          after: "The take-away shop",
          slide: {
            kind: "fluency",
            title: "Take-away shop sprint",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole shop exchange, with its reason, fast and smooth, with no stops.",
            chunks: [
              "I'd like twelve notebooks, please, because we need them for the project.",
              "Here you are. There are eight left, so we can sell them tomorrow.",
              "Twelve take away four is eight, but we still need more.",
              "Although the shop was busy, we sold only nine of the twenty tickets.",
            ],
            recycle: ["Did you walk to school? Yes, I did.", "We traveled by bus because it was raining."],
            rounds: [
              { seconds: 80, say: "Together: the teacher shows a number card and a situation (a school shop, a ticket desk, a bake sale), and the class says the whole exchange with its reason." },
              { seconds: 80, say: "Pairs: the customer asks and gives a reason, the seller takes some away and answers. Swap when you hear the clap." },
              { seconds: 80, say: "New partner. Faster and smoother! Add one more reason or contrast of your own each time." },
            ],
            steps: [
              "Look at the number card. Say a WHOLE exchange, not just the number.",
              "Customer: 'I'd like twelve notebooks, please, because ...' Seller: take some away and say 'Here you are. There are ___ left, so ...'",
              "Listen for the clap: it means change jobs.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: 12 notebooks, take away 4)", "(card: 20 tickets, take away 9)", "(card: 15 posters, take away 6)", "(card: 18 cookies, take away 7)"],
            feedback: correct,
            teacherNote: "Whole sentences with a reason: 'Twelve take away four is eight' is one smooth piece, and the reason after because, so or although is the part that makes this sound like a grade 6-7 student. Listen for the -s on notebooks and tickets (Vietnamese has no plural ending) and for 'There is eight left' instead of 'There are'. Mix in Unit 6's 'Did you ...? Yes, I did.' cards every few turns so last unit's question stays fast.",
            tiers: [
              { level: "Support", task: "Use numbers up to twenty and say each sentence with the frames on the board.", frames: ["I'd like ___, please, because ___.", "___ take away ___ is ___.", "There are ___ left, so ___."] },
              { level: "Core", task: "Say all four sentences without looking at the board, with a different reason each time." },
              { level: "Stretch", task: "Make your own sentences with although or but, and add a follow-up question: 'Although we sold nine, there are eleven left. What should we do with them?'" },
            ],
          },
        },
        {
          after: "Take-away shop sprint",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time and the person. Then use it to talk about your own life.",
            chunks: [
              "I had twelve cards on Monday, but I gave five to my cousin.",
              "Did you have many cards? Yes, I did. / No, I didn't.",
              "I didn't have many cards because I gave most of them away.",
              "Twelve take away five is seven, so I had seven left.",
              "My friend bought three notebooks, although she didn't need them.",
              "We gave away six tickets when the match was free, but we didn't give away the last ones.",
            ],
            recycle: ["I'd like twelve notebooks, please, because we need them.", "We traveled by bus because it was raining."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Did, X = say no with didn't, + = join with because / although / so / when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs at once when you can, for example ? and T." },
              { seconds: 90, say: "Real talk: ask your partner what they had, bought or gave away last week and why. Answer with the short answer and one more sentence with a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Did, X = say no with didn't, + = join with because, although, so or when, T = change the time (last year, yesterday), P = change the person.",
              "Say the WHOLE new sentence. Check the endings: the plain verb after Did and didn't, and the right past form everywhere else.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Did you had' or 'I didn't gave'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really did, and remember one answer to tell the class.",
            ],
            prompts: ["I had fifteen tickets. (?)", "We bought two books. (X)", "She gave away six cards. (+ because)", "They had nine posters. (T: last year)", "I gave my notes to a friend. (P: she)"],
            feedback: "Prompt, do not tell: for 'Did you had ...?' say 'Did you ...?' and wait for the plain verb; for 'I didn't gave' point to didn't and say 'plain verb'; for a missing -s on tickets or notebooks, tap your wrist. Say the n't and the final -s clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students talk about what they really had, bought or gave away, so the form is used for meaning. Students in grades 6-7 can take the full set: questions, short answers, negatives, a reason, a change of time and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with I and you, and the frames on the board.", frames: ["Did you have ___? Yes, I did. / No, I didn't.", "I had ___, but I gave ___ away."] },
              { level: "Core", task: "Change every sentence with all five signs, and say a reason each time you use +." },
              { level: "Stretch", task: "Make a more complex sentence with a second clause or a contrast, then ask a follow-up question: 'Although she had twelve cards, she didn't give any away. Why do you think she kept them?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "Our school sale: plan, write, check",
            routine: "paragraph",
            genre: "report",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three details with numbers and the closing sentence. Circle the linking words.",
              "Plan: fill the five boxes with a few words each, not whole sentences. Choose real numbers that you can check with a take-away sentence.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, However, because, For example and In conclusion.",
              "Check: tick the checklist. Swap with a partner: they underline one past verb and one didn't, and tell you one thing they liked.",
              "Teacher: while they write, look only at past verb forms (sold, gave, bought) and the plain verb after didn't. Put a dot in the margin of a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: The class sale",
              text: "Last month, our class ran a small sale to raise money for a school trip. First, we collected thirty used books from students and teachers. We sold twelve books on the first day, so eighteen were left. Also, we sold nine more on Friday because the price was low. For example, thirty take away twenty-one is nine, so nine books were left. However, we didn't sell the old dictionaries, since nobody wanted them. In conclusion, the sale was a success, and we want to run another one next term.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What did your class sell, when, and why?" },
              { label: "Detail 1: First, ...", prompt: "What did you start with? How many?" },
              { label: "Detail 2: Also, ...", prompt: "What did you sell or give away? How many were left? Add a take-away sentence as an example." },
              { label: "Detail 3: However, ...", prompt: "What didn't you sell or give away, and why?" },
              { label: "Closing: In conclusion, ...", prompt: "How did it go? What would you do next time?" },
            ],
            frames: ["Last ___, our class ran ___ to ___.", "First, we ___ ___ ___.", "Also, we sold / gave away ___ because ___.", "For example, ___ take away ___ is ___.", "However, we didn't ___ since ___.", "In conclusion, ___."],
            checklist: [
              "A topic sentence that says what, when and why",
              "Past forms: sold, gave, bought, collected, and didn't + the plain verb",
              "A correct take-away sentence as an example, with the -s on things",
              "First, Also, However, because, For example and In conclusion in the right places",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute, with the numbers.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets (past verb forms and the plain verb after didn't) with a dot on the line; the student finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. The take-away sentence is a real example inside the paragraph, so the maths and the writing support each other, and the paragraph builds on the shop exchanges and the drill students have just said. Students copy the shape of the model, not its words.",
            tiers: [
              { level: "Support", task: "Use the six frames: one sentence for each part, and fill in a word or number in each.", frames: ["Last ___, our class ran ___ to ___.", "However, we didn't ___ since ___."] },
              { level: "Core", task: "Write six to seven sentences, using the plan and at least four linking words." },
              { level: "Stretch", task: "Write eight sentences, add a contrast with although, and finish with an opinion: 'I think the sale worked because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u07-l2": {
      objectives: [
        "I can explain what subtraction is, with a real example and a way to check it, twice, shorter and smoother the second time.",
      ],
      drop: ["Rocket countdown", "Word slap", "Number-line floor walk"],
      trim: {
        "Rows or columns? T-chart": 6,
        "Word problem theater (SB 71)": 9,
      },
      add: [
        {
          after: "Teach it to a partner",
          slide: {
            kind: "fluency",
            title: "Teach subtraction: tell it again, shorter",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Explain the same subtraction lesson twice, to two partners. The second telling is shorter, and both partners explain it in every round.",
            chunks: [
              "Subtraction means we take a smaller number away from a bigger one, and the answer shows what is left.",
              "We write a minus sign between the numbers because it shows that something goes away.",
              "For example, if a shop has twelve jackets and sells five, seven jackets are left.",
              "Although subtraction looks easy, we should check the answer by adding it back.",
            ],
            recycle: ["Long ago, people traveled by ship because there were no planes.", "Last weekend I visited my grandparents, and we cooked together."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A explains subtraction with a number example, then Partner B explains it with a different example. Then change partners." },
              { seconds: 70, say: "Round 2: new partner. A explains it again in less time, then B. Keep every reason and example." },
            ],
            steps: [
              "Choose your own numbers (a shop, a bus, a phone battery). Say the four sentences while you write the example on paper.",
              "In each round, Partner A explains first, then Partner B. The listener has a job: write down the answer you hear and say 'Check!' when you have added it back.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, change partners and explain it again, A first, then B, using fewer words but keeping the example.",
            ],
            prompts: ["(example: 12 jackets, 5 sold)", "(example: 30 seats, 14 taken)", "(example: 100% battery, 35% used)"],
            feedback: correct,
            teacherNote: "This is the same short explanation twice on purpose (A then B in every round, so each student explains it twice): the second telling is shorter because students are not searching for words. The listener's job (add it back to check) keeps the partner listening. Listen for 'Subtraction mean' (missing -s on means), 'We write minus sign' (missing 'a') and 'How many is left' instead of 'are left'. Accept shorter tellings in round 2, but every telling keeps its reason and its example.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and your own numbers.", frames: ["Subtraction means we ___.", "For example, ___ take away ___ is ___.", "We check it by ___."] },
              { level: "Core", task: "Say all four sentences without the board, with your own example." },
              { level: "Stretch", task: "Add a second example with a contrast and a follow-up question: 'Last week I had fifty points, but I lost eleven. How many were left?'" },
            ],
          },
        },
        {
          after: "Teach subtraction: tell it again, shorter",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change word-problem sentences fast and right: ask them, say no, join them with a reason, change the time and the person. Then use the form for your own stories.",
            chunks: [
              "Yesterday I had fifteen cards, but I gave six to my cousin.",
              "Did you give any cards away? Yes, I did. / No, I didn't.",
              "I didn't give him the rare one because it was my favorite.",
              "Last week we bought nine tickets, although we didn't use all of them.",
              "She took four photos when she saw her friend, but she didn't send any.",
              "Fifteen take away six is nine, so I had nine cards left.",
            ],
            recycle: ["Subtraction means we take some away.", "Did you visit your grandma? Yes, I did."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Try two signs together, for example X and +." },
              { seconds: 90, say: "Real talk: ask your partner about a real word problem from last weekend: what they had, spent or gave away, and why. Answer with the short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. Check the endings: the plain verb after Did and didn't, and the right past form (had, gave, bought, took) everywhere else.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Did you gave' or 'I didn't took'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a real situation, and remember one answer to tell the class.",
            ],
            prompts: ["I had twenty points. (?)", "We bought two tickets. (X)", "He gave away four cards. (+ because)", "She took three photos. (T: last year)", "I didn't give her my notes. (P: they)"],
            feedback: "Prompt, do not tell: for 'Did you gave ...?' say 'Did you ...?' and wait for the plain verb; for 'I didn't took' point to didn't and say 'plain verb'; for a missing -s, tap your wrist. Say the -ed, -s and n't clearly yourself.",
            teacherNote: "The reading lesson is about what subtraction is and where we use it, so the drill uses word-problem sentences students might really say: cards, tickets, points, photos. Round 3 makes it real. Keep it brisk, and use two signs at once with students who are ready.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Did you give ___ away? Yes, I did. / No, I didn't.", "I had ___, but I gave ___ away."] },
              { level: "Core", task: "Change every sentence with all five signs, with a reason each time you use +." },
              { level: "Stretch", task: "Use a more complex form: a second clause, a contrast and a follow-up question. 'Last week I had fifteen cards, although I didn't need them. Why did you keep yours?'" },
            ],
          },
        },
        {
          after: "Subtraction every day (SB 71 end)",
          slide: {
            kind: "writing",
            title: "Explaining subtraction: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three details and the closing sentence. Circle the linking words.",
              "Plan: fill the five boxes with a few words each. Choose a real example with numbers that you can check.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use First, Also, because, For example and In conclusion.",
              "Check: tick the checklist. Your partner adds up your example to check it and underlines one linking word.",
              "Teacher: look only at the -s on means and shows, and at whether the example is correct. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: What subtraction is",
              text: "Subtraction is a way of finding out how many things are left when some go away. First, we write the starting number, and then we write a minus sign and the number we take away. For example, if a school has forty chairs and moves fifteen to another room, we write forty minus fifteen. The answer is twenty-five, so twenty-five chairs are left. Also, we can check the answer by adding fifteen and twenty-five, because we should get forty again. In conclusion, subtraction is useful whenever something is shared, spent or taken away.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is subtraction? Say it in your own words." },
              { label: "Detail 1: First, ...", prompt: "How do we write it? What does the minus sign show?" },
              { label: "Detail 2: For example, ...", prompt: "A real example with numbers: what you have, what goes away and what is left." },
              { label: "Detail 3: Also, ...", prompt: "How can we check the answer? Why is it worth checking?" },
              { label: "Closing: In conclusion, ...", prompt: "When is subtraction useful in real life?" },
            ],
            frames: ["Subtraction is a way of ___.", "First, we ___ and then we ___.", "For example, if ___ has ___ and ___, we write ___.", "Also, we can check the answer by ___, because ___.", "In conclusion, subtraction is useful when ___."],
            checklist: [
              "A topic sentence in your own words, not copied from the book",
              "A real example with numbers, and the answer is correct",
              "The -s on means, shows and tells, and 'are left' for more than one",
              "First, Also, because, For example and In conclusion in the right places",
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, in one minute, as if you were the teacher.",
            teacherNote: "A full paragraph for grades 6-7: five boxes planned in words, and an example students check by adding it back. The paragraph is also the script for the recorded talk at home (Explain subtraction), so tell students to keep it. It builds on 'Teach it to a partner' and the retell. Mark only two things (the -s on third-person verbs and the correct example) and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the five frames, one sentence for each, and fill in a word or number in each.", frames: ["Subtraction is a way of ___.", "For example, if ___ has ___ and ___, we write ___."] },
              { level: "Core", task: "Write six to seven sentences, one or two for each part of the plan." },
              { level: "Stretch", task: "Write eight sentences, add a contrast with although or however, and explain one mistake people make: 'Many people forget to check, although it only takes a minute.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Explain subtraction",
        prompt: "Explain what subtraction is to a younger student who has never heard of it. Use a real example with numbers, say how you check the answer, and give a reason why subtraction is useful.",
        length: "90-120 seconds",
        steps: [
          "Use your paragraph from class as notes, but do not read it. Choose a real example with numbers from your own life.",
          "Practise twice: say what subtraction means, show your example with the number sentence, and say how to check it. Each time, speak a little more smoothly.",
          "Record it once. Put your numbers where the camera can see them, and say every sentence in full.",
          "Watch it back. If you stopped for a long time or the example was wrong, record once more.",
        ],
        maxSeconds: 180,
        kidSummary: "Explain what subtraction is with one real example and a way to check it, give a reason it is useful, and keep talking without long stops.",
        words: ["subtraction", "take away", "minus", "left", "check", "for example"],
        grammar: ["Subtraction means we ___.", "For example, ___ take away ___ is ___.", "There are ___ left, so ___."],
        rubric: [
          { label: "What subtraction is", description: "Says that subtraction means taking some away, in a whole sentence and in his or her own words.", weight: 3 },
          { label: "Reasons and examples", description: "Gives a real example with numbers, says the number sentence and the answer, and gives a reason (because ...) why subtraction is useful or why we check.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Grammar: 'There are'", description: "Says 'There are ___ left' with the -s on the things: chairs, tickets.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["Subtraction means we take some away.", "For example, ___ take away ___ is ___.", "We check it by ___."], tips: ["Write your example on paper and point to it as you speak."] },
          { level: "Core", who: "Most students", frames: ["Subtraction means we ___, and the answer shows ___.", "For example, I had ___ ___ and I ___ ___, so there are ___ left.", "It is useful because ___."], tips: ["Say the number sentence, the answer and one reason."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although subtraction looks easy, many people ___.", "Last week I had ___, but I ___, so ___ were left."], tips: ["Add a contrast and a short story from your own life."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u07-l3": {
      objectives: [
        "I can say what I ate, saw, bought and gave, and what I didn't, with reasons, without stopping.",
      ],
      drop: ["Yesterday song", "Beanbag yesterday toss"],
      trim: {
        "Listen and sing: Cookies! (SB 73 D)": 6,
        "What do you think? (SB 72 Think)": 4,
        "Find the answers and write (SB 72 B, C)": 9,
      },
      add: [
        {
          after: "What did they do? (SB 73 E)",
          slide: {
            kind: "fluency",
            title: "Yesterday talk: same task, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same yesterday talk with two partners. Both partners talk in each round, and the second round is smoother and has more detail.",
            chunks: [
              "I ate lunch at school yesterday, but I didn't eat the vegetables.",
              "I saw my friends at the park, although I didn't see my cousin.",
              "I bought a snack after class because I was hungry.",
              "I gave my notes to a classmate, so she didn't miss the lesson.",
            ],
            recycle: ["We played football in the park, and it was fun.", "Did you walk to school? Yes, I did."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A tells the four yesterday sentences with real details, then Partner B. The listener ticks each one on their fingers and asks one follow-up question. Then change partners." },
              { seconds: 75, say: "Round 2: new partner. A tells the same four sentences a little faster and adds one more reason, then B. The listener says 'Same!' if you said them all." },
            ],
            steps: [
              "Pick one real thing for each verb: ate, saw, bought, gave. Two of your sentences have a 'didn't' part, and each has a reason.",
              "Round 1: Partner A says the four sentences, then Partner B. The listener counts them on their fingers and asks a follow-up question: 'Why did you ...?'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, change partners. Round 2: A says the same four sentences again, with one more reason, then B.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: the same task with a new listener, so the second time students can think about how they say it, not what. Listen for the two classic mistakes: 'I eated / I buyed' (adding -ed to a verb that changes) and 'didn't ate / didn't bought' (past form after didn't). Prompt: say 'I didn't ...?' and pause. Say 'bought', 'gave' and 'ate' clearly yourself. The follow-up question from the listener is what turns the repeat into real conversation.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames on the board.", frames: ["I ate ___, but I didn't eat ___.", "I bought ___ because ___."] },
              { level: "Core", task: "Say four sentences with ate, saw, bought and gave, each with a reason or a contrast." },
              { level: "Stretch", task: "Use a longer sentence with a second clause and a follow-up question: 'I bought ten grapes and ate four, so six were left. Did you buy anything yesterday?'" },
            ],
          },
        },
        {
          after: "Yesterday talk: same task, new partner",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the yesterday sentence fast and right: ask it, say no, join it with a reason, change the time and the person. Then ask about real days.",
            chunks: [
              "I ate breakfast at seven, but I didn't eat lunch because I had a test.",
              "Did you eat breakfast this morning? Yes, I did. / No, I didn't.",
              "She saw her cousin on Sunday, although she didn't see her aunt.",
              "We bought two tickets, so we didn't buy any snacks.",
              "He went to the library, but he didn't take his notebook.",
              "They gave the answer, but they didn't give a reason.",
            ],
            recycle: ["Long ago, people traveled by ship because there were no planes.", "Nine take away three is six."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Did, X = say no with didn't, + = join with because / although / so / when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Mix the irregular verbs: ate, saw, bought, gave, went, took." },
              { seconds: 90, say: "Real talk: ask your partner about yesterday and last weekend: what they ate, saw, bought, gave or took, and what they didn't, with a reason." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. The rule: after Did and didn't the verb is plain (eat, see, buy, give); in a yes sentence it changes (ate, saw, bought, gave).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'didn't ate' or 'Did you saw'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's real day, and remember one answer to tell the class.",
            ],
            prompts: ["I ate rice for lunch. (?)", "We saw the film. (X)", "She bought a ticket. (+ because)", "They gave me a map. (T: last summer)", "I took my notebook. (P: he, X)"],
            feedback: "Prompt, do not tell: for 'didn't ate' hold up one finger and say 'didn't ...?'; for 'Did you saw' say 'Did you ...?' and wait; for 'I eated' repeat it with a rising voice and let the student fix it. Say ate, saw, bought and gave clearly yourself.",
            teacherNote: "The grammar slide gives the rule: yes sentences change the verb, no sentences and questions use the plain one. The drill turns it into speed. Round 3 is the point: students tell each other what they really did, so the rule carries meaning. Grades 6-7 can take all five signs and two signs at once.",
            tiers: [
              { level: "Support", task: "Use only ? and X with ate, saw, bought and gave and the frames on the board.", frames: ["Did you ___ ___? Yes, I did. / No, I didn't.", "I ___ ___, but I didn't ___ ___."] },
              { level: "Core", task: "Change every sentence with all five signs and say a reason each time you use +." },
              { level: "Stretch", task: "Use a more complex form with a second clause and a follow-up question: 'He went to the library, although he didn't have a test. Why do you think he went?'" },
            ],
          },
        },
        {
          after: "What I ate and drank yesterday (SB 73 F)",
          slide: {
            kind: "writing",
            title: "Fix the yesterday sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence aloud with your partner. Something is wrong, and every sentence has at least TWO mistakes.",
              "Find every mistake: a wrong past verb, a wrong verb after didn't, or a missing -s.",
              "Write the sentence the right way. Read it aloud together.",
              "Write a rule in your own words for the mistakes you found most often.",
            ],
            items: [
              { q: "Yesterday I eated rice, but I didn't ate the soup.", answer: "Yesterday I ate rice, but I didn't eat the soup." },
              { q: "She buyed two ticket, although she didn't had much money.", answer: "She bought two tickets, although she didn't have much money." },
              { q: "We seen a film last night, but we didn't went to the cafe.", answer: "We saw a film last night, but we didn't go to the cafe." },
              { q: "He gived his notes to me, so I didn't took any.", answer: "He gave his notes to me, so I didn't take any." },
              { q: "They didn't brought lunch because they forgot it, so they buyed some.", answer: "They didn't bring lunch because they forgot it, so they bought some." },
            ],
            checklist: ["After didn't the verb stays plain: eat, see, buy, give, go, take", "Yes sentences use ate, saw, bought, gave, went, took", "More than one: add -s"],
            sayIt: "Read your fixed sentences to the class in a loud, clear voice.",
            teacherNote: "Focus on two error types: the verb form (ate / bought, not 'eated / buyed') and the plain verb after didn't. Every sentence has two mistakes or more (sentence 2 has three), so students must keep looking after the first one. The missing -s is a bonus: praise it if a student finds it. Fix item 1 together first, and say the correct sentence yourself only at the end, after the students have tried.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the verb pairs on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write three more sentences with two mistakes each for your partner to fix, and write the rule they break." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u07-l4": {
      objectives: [
        "I can tell my take-away story to two partners, with reasons, shorter and smoother the second time, and offer or refuse politely with a reason.",
      ],
      drop: ["How do you feel now?", "Picnic mingle"],
      trim: {
        "Listen, point, say (SB 74 A)": 6,
        "Kittens listening (SB 74 C)": 4,
        "Clap the syllables (SB 75 F)": 6,
      },
      add: [
        {
          after: "Rehearse: our interesting subtraction problem (SB 75 Write)",
          slide: {
            kind: "fluency",
            title: "Subtraction story: tell it twice, shorter",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same take-away story to two friends. The second time is shorter and smoother, and both partners tell it in every round.",
            chunks: [
              "Last Saturday I had twenty dollars, and I spent eight of it on lunch with my friends.",
              "Then I gave three dollars to my brother because he forgot his money.",
              "Twenty take away eleven is nine, so I had nine dollars left.",
              "Although I didn't buy anything for myself, I felt happy because I helped him.",
            ],
            recycle: ["I'd like twelve notebooks, please, because we need them.", "I ate rice, but I didn't eat the soup."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A tells the story with the number sentence and the reasons, then Partner B. The listener writes down the number left. Then change partners." },
              { seconds: 75, say: "Round 2: new partner. A tells the same story in less time but keeps the reasons, then B. The listener checks the number." },
            ],
            steps: [
              "Use your own numbers and your own situation, but keep the same four sentences: what you had and spent, what you gave, the number sentence, and a reason and a feeling.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In each round, Partner A tells first, then Partner B tells. The listener writes the number left and says if it is right.",
              "When the bell rings, line B moves one step to the left: a new partner. Then the next round starts.",
            ],
            feedback: correct,
            teacherNote: "Same story, less time, new listener: the 4/3/2 activity shortened to two rounds for grades 6-7. Fluency grows on its own, but the one-minute fix between round 1 and round 2 is what makes the second telling more accurate too. Do not add new language between the rounds. This story is also the rehearsal for the student's own subtraction problem in the next activity, so the numbers must be right.",
            tiers: [
              { level: "Support", task: "Say two parts with the frames.", frames: ["Last Saturday I had ___ ___.", "Then I gave ___ to ___ because ___."] },
              { level: "Core", task: "Say all four parts without the board, with a reason and a feeling." },
              { level: "Stretch", task: "Add a contrast and a question for your partner: 'Although I had enough money for a game, I gave some away. What would you do?'" },
            ],
          },
        },
        {
          after: "Subtraction story: tell it twice, shorter",
          slide: {
            kind: "fluency",
            title: "Grammar drill: offer it, refuse it, say why",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change offers and answers fast and right: make the offer, refuse politely, add a reason, change the time and the person. Then offer and answer for real.",
            chunks: [
              "Would you like some water? Yes, please, because I'm thirsty.",
              "No, thank you. I just ate some, so I'm not hungry.",
              "How about some fruit? I'm not hungry, although it looks delicious.",
              "I'm hungry because I didn't eat breakfast this morning.",
              "She isn't hungry because she just ate lunch with her friends.",
              "Would you like some more? No, thank you, I'm full.",
            ],
            recycle: ["Last Saturday I had twenty dollars, and I spent eight of it.", "Twenty take away eleven is nine."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says an offer or an answer and shows a sign (? = make it an offer, X = refuse politely, + = add a reason with because / although / so, T = change it to yesterday, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use I, you, he, she and they." },
              { seconds: 90, say: "Real talk: offer your partner something real (a snack, your notes, a seat, a charger). They answer for real with a reason, then offer you something back." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make the offer with Would you like ...? or How about ...?, X = refuse politely with No, thank you, + = add a reason with because, although or so, T = change it to yesterday (was, didn't eat), P = change the person (he, she, they).",
              "Say the WHOLE new sentence, with a polite voice. Check I'm / She's / They're, and the -s on some food words.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'She not hungry' or 'I'm not hungry because I just eat'), fix them together, then go on.",
              "In round 3 the drill becomes real: offer something you really have, and answer honestly with a reason.",
            ],
            prompts: ["I'm thirsty. (? Would you like ...)", "Would you like some fruit? (X)", "I'm full. (+ because)", "I'm hungry. (T: yesterday)", "I just ate some. (P: she)"],
            feedback: "Prompt, do not tell: for 'She not hungry' point to the frame and say 'She ...?'; for 'I just eat' tap your wrist and say 'just ...?'; for a flat voice, show the offer again with a smile. Say the 'm, 's and n't clearly yourself.",
            teacherNote: "This lesson's key structure is the offer and the answer (SB 75 E), plus the feelings words, so the drill changes offers and answers instead of the past simple, and the reasons join them to the unit's 'I just ate some'. Round 3 has students offer real things, so the language is used for meaning. Students in grades 6-7 can combine two signs.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Would you like some ___? Yes, please. I'm ___.", "No, thank you. I just ate some."] },
              { level: "Core", task: "Change every sentence with all five signs and say a reason each time you use +." },
              { level: "Stretch", task: "Use a more complex form with a second clause and a follow-up question: 'No, thank you. Although it looks great, I just ate. Would you like to share it with someone else?'" },
            ],
          },
        },
        {
          after: "Grammar drill: offer it, refuse it, say why",
          slide: {
            kind: "writing",
            title: "Read a model, write my story",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Find the time word, the verb after didn't, the number sentence and the reason.",
              "Plan: say your story to your partner first (who, how many, what happened, why).",
              "Write four to five sentences. Use because, although or so in at least two of them, and include a number sentence.",
              "Check with the list. Then read your story aloud.",
            ],
            text: {
              title: "Trading cards",
              text: "Last Friday, my cousin bought twenty trading cards, and he gave seven to a friend because they were duplicates. He didn't give away the shiny card, although his friend asked for it. Twenty take away seven is thirteen, so he had thirteen cards left. Then he sorted the rest into two piles, one for trading and one for keeping. He felt proud because he helped his friend and kept his favorite.",
            },
            frames: ["Last ___, ___ bought / had ___ ___, and ___ gave ___ to ___ because ___.", "___ didn't ___, although ___.", "___ take away ___ is ___, so ___ had ___ left.", "___ felt ___ because ___."],
            checklist: ["A past time word and bought / gave / had / ate", "didn't + the plain verb, in at least one sentence", "A correct number sentence: ___ take away ___ is ___", "because, although or so in at least two sentences", "The -s on things, a capital letter and a full stop"],
            sayIt: "Read your story to your partner, then tell it again without looking.",
            teacherNote: "Plan, write, check is the strategy: say it first, then write it. This model is the school's own story, so students copy the shape, not the words. Point out how 'He didn't give away the shiny card, although his friend asked for it' is a no-sentence with a contrast that still fits a take-away story. Four or five sentences with joined clauses are harder than the short sentences of the book: expect to help with although.",
            tiers: [
              { level: "Support", task: "Copy the model and change the numbers, the thing and the reason." },
              { level: "Core", task: "Write four or five sentences about your own story, with a number sentence and two joining words." },
              { level: "Stretch", task: "Write six sentences with because, although and so, a number sentence, and an opinion: 'I think it was a good idea because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u07-l5": {
      objectives: [
        "I can ask and answer 'What did you buy? How many are left?' with reasons, and write a full paragraph about my day with a reason for each detail.",
      ],
      drop: ["Remember it!", "Movement break: Yes and no freeze"],
      trim: {
        "Plate race: take away with a sentence": 5,
        "Champion talk: 3 rounds": 9,
      },
      add: [
        {
          after: "Who has what left? The information gap",
          slide: {
            kind: "fluency",
            title: "Question chain: What did you buy?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer with a reason, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What did you buy last weekend, and why did you choose it?",
              "I bought six pencils because my old ones were broken.",
              "How many did you give away? Who did you give them to?",
              "I gave away two to my cousin, so four are left.",
            ],
            recycle: ["Did you walk to school? Yes, I did.", "We saw a film, but we didn't see the ending."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a card with a number and a thing. Answer with a reason and ask a follow-up question." },
              { seconds: 80, say: "Swap cards. Go faster, and ask a different follow-up question." },
              { seconds: 70, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'What did you buy last weekend, and why did you choose it?'",
              "They answer: 'I bought six pencils because ...' Then you ask 'How many did you give away?' and they answer.",
              "Then they turn and ask the next friend.",
              "Teacher: after the first round, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["What did you buy last weekend?", "How many did you give away?", "(card: 8 tickets)", "(card: 15 notebooks)"],
            feedback: correct,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'What did you ...?' automatic. The big mistake to listen for is 'What did you bought?' (past form after did). Prompt: say 'What did you ...?' and point to the frame: after did, the plain verb. The reason (because) and the second question make the chain sound like a real conversation. Time the whole circle and tell the class; they like beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frame and pass the question on.", frames: ["I bought ___ because ___.", "I gave away ___. ___ are left."] },
              { level: "Core", task: "Ask and answer without looking at the board, with a reason each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'I bought six pencils, but I didn't buy a ruler because I had one. What do you use yours for?'" },
            ],
          },
        },
        {
          after: "Question chain: What did you buy?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time and the person. Then use it to tell the truth about your own week.",
            chunks: [
              "I went to the market on Sunday, but I didn't buy anything.",
              "Did you go to the market? Yes, I did. / No, I didn't.",
              "We had nine tickets, and we gave four to our cousins.",
              "She took two notebooks, but she didn't take a pen because she already had one.",
              "They didn't give us an answer, although we asked twice.",
              "Nine take away four is five, so five tickets were left.",
            ],
            recycle: ["I bought six pencils because my old ones were broken.", "Subtraction means we take some away."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Did, X = say no with didn't, + = join with because / although / so / when, T = change the time, P = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Mix go, have, take, eat, see, buy and give, and use two signs at once when you can." },
              { seconds: 90, say: "Real talk: ask your partner about their week: where they went, what they had, took or gave, and what they didn't do, with a reason. Answer with the short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person.",
              "Say the WHOLE new sentence. The rule to remember: didn't + the plain verb, never didn't + went, had or took.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'didn't went' or 'Did you had'), fix them together, then go on.",
              "In round 3 the drill becomes real: tell your partner the truth about your week, and remember one thing to tell the class.",
            ],
            prompts: ["I went to the library. (?)", "We had a test. (X)", "She took her notebook. (+ although)", "They gave us tickets. (T: last year)", "I didn't take a bus. (P: he)"],
            feedback: "Prompt, do not tell: for 'didn't went' hold up one finger and say 'didn't ...?' and let the student find 'go'; for 'Did you had' say 'Did you ...?' and wait; for a missing -s, tap your wrist. Say went, had, took, gave and n't clearly yourself.",
            teacherNote: "Grammar Champions day: the drill covers the whole set (ate, saw, bought, gave, went, had, took) and the rule 'didn't + plain verb'. It sits after the question chain so the questions are warm. Round 3 is the real use: students tell each other the truth about their week, so the form carries meaning. Grades 6-7 should be able to combine two signs and add a second clause.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Did you ___ ___? Yes, I did. / No, I didn't.", "I ___ ___, but I didn't ___ ___."] },
              { level: "Core", task: "Change every sentence with all five signs and say a reason each time you use +." },
              { level: "Stretch", task: "Make a more complex sentence with a second clause or a contrast and add a follow-up question: 'Although we had enough tickets, we didn't give any away. Would you have given some?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "My weekend: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the three details with reasons, the no sentence and the closing sentence. Circle the linking words.",
              "Plan: fill the five boxes with a few words each, not whole sentences. Use things that really happened, and give a reason for each.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use ate, bought, gave or went in the yes sentences, and didn't + the plain verb in the no sentence.",
              "Check: tick the checklist. Swap with a partner: they underline every past verb and every didn't, and tell you one thing they liked.",
              "Teacher: while they write, look only at the past verb forms and the plain verb after didn't. Put a dot in the margin of a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A busy Saturday",
              text: "Last Saturday, I had a busy but enjoyable day. First, I went to the market with my mother, and I bought ten oranges because we wanted fresh juice. Then I gave four oranges to my neighbor, so six were left. For example, ten take away four is six, and that was enough for the whole family. However, I didn't buy any apples, since we still had some at home. In conclusion, it was a simple day, but I felt proud because I helped my family.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "When was it, and what was the day like? (a time and one describing word)" },
              { label: "Detail 1: First, ...", prompt: "Where did you go, and what did you buy or do? Why?" },
              { label: "Detail 2: Then, ...", prompt: "What did you give, eat or take? How many were left? Add a take-away sentence." },
              { label: "Detail 3: However, ...", prompt: "What did you not do or not buy, and why? (didn't + a plain verb)" },
              { label: "Closing: In conclusion, ...", prompt: "How did you feel at the end, and why?" },
            ],
            frames: ["Last ___, I had a ___ day.", "First, I went to ___, and I bought ___ because ___.", "Then I gave / ate ___, so ___ were left.", "For example, ___ take away ___ is ___.", "However, I didn't ___ since ___.", "In conclusion, ___, and I felt ___ because ___."],
            checklist: [
              "A topic sentence with a time and a describing word",
              "ate, bought, gave, went for yes, and didn't + the plain verb for no",
              "A reason (because or since) in at least two sentences",
              "First, Then, However, For example and In conclusion in order, with a capital letter and a full stop in each sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute, as if you were on the radio.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. It uses the unit's yes and no yesterday sentences, a number sentence and the joining words students have used in earlier lessons. The paragraph is also the script for the recorded talk at home (What I did and didn't do). Mark only two things (past verb forms and the plain verb after didn't) and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the six frames, one sentence for each, and fill in a word in each.", frames: ["Last ___, I had a ___ day.", "However, I didn't ___ since ___."] },
              { level: "Core", task: "Write six to seven sentences, using the plan and at least four linking words." },
              { level: "Stretch", task: "Write eight sentences, add a contrast with although, and finish with a plan: 'Next weekend I want to ... because ...'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I did and didn't do",
        prompt: "Tell us about last weekend. Say what you ate, saw, bought or gave, and one thing you did not do, and give a reason for each. Add a take-away sentence if you can.",
        length: "90-120 seconds",
        steps: [
          "Use your paragraph from class as notes, but do not read it. Think of four real things from your weekend: ate, saw, bought or gave, and one 'didn't'. Think of a reason for each.",
          "Practise twice: say them in order, with the reasons. Each time, speak a little more smoothly.",
          "Record it once. Say every sentence in full, and keep going if you make a small mistake.",
          "Watch it back. If you stopped for a long time or left out the reasons, record once more.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you did last weekend and one thing you didn't do, with ate, saw, bought or gave, give a reason or an example for each, and keep talking without long stops.",
        words: ["ate", "saw", "bought", "gave", "went", "because", "left"],
        grammar: ["ate / saw / bought / gave / went", "I didn't + plain verb", "because / although / so", "___ take away ___ is ___."],
        rubric: [
          { label: "Yes sentences", description: "Says at least three things that happened with the right form: ate, saw, bought, gave, went.", weight: 3 },
          { label: "A no sentence", description: "Says one 'didn't' sentence with the plain verb after it: I didn't eat, I didn't buy.", weight: 2 },
          { label: "Reasons and examples", description: "Gives a reason (because, so, although) or a real example for at least three of the sentences.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on things (tickets, oranges) and the end sounds of bought and gave can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["Last weekend I ate ___ because ___.", "I didn't ___ because ___."], tips: ["Look at your verb card as you speak."] },
          { level: "Core", who: "Most students", frames: ["Last weekend I ate ___ and I saw ___ because ___.", "I bought ___, but I didn't buy ___ since ___.", "I gave ___ to ___, so ___ were left."], tips: ["Say three yes sentences and one no sentence, each with a reason."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although I ___, I didn't ___ because ___.", "I bought ___ ___ and I gave away ___, so ___ were left."], tips: ["Add a contrast, a take-away sentence and an opinion about your weekend."] },
        ],
      },
    },
  },
};
