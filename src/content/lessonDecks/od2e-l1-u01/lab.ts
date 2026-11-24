import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 1 "Families and
// Friends" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7, beginners.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with earlier lessons' phrases mixed back in) and one
// short writing routine (say it, write it, read it back). Lessons 1 and 3 end with a recorded
// talk for home, built on the routine the class just did (Lesson 4 already has its own video).
// Time comes from games and chants, never from the book pages or the grammar. All text is original.

const grammarPrompt =
  "Between rounds 1 and 2, write the two mistakes you heard most on the board (no names) and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it themselves (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the mistake with a rising voice) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final sound and -s clearly yourself: children copy what they hear.";

export const odL1U1Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u01-l1": {
      objectives: ["I can say 'This is my ___.' and 'My family is big.' fast, without stopping."],
      trim: { "Hello chant": 3, "Family chant and freeze": 3, "What's missing?": 4, "Big or small? Stand and show (SB 7 C)": 4 },
      add: [
        {
          after: "Draw my family and friends",
          slide: {
            kind: "writing",
            title: "My family: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Point to each sentence.",
              "Plan: draw in the boxes. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use the frames. You may copy and finish them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My family",
              text: "This is my family. My family is big and kind. I live with my mother, my father, my brother and my sister.",
            },
            organiser: [
              { label: "Who", prompt: "Draw your family. Who is in your picture?" },
              { label: "Big or small", prompt: "Draw your family again. Is it big or small? Is it kind?" },
              { label: "Home", prompt: "Draw your home. Who do you live with?" },
            ],
            frames: ["This is my family.", "My family is ___.", "I live with my ___ and my ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end of each sentence", "The little word 'is' is in my second sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for six-year-olds: three very short sentences planned by drawing, with frames; copying and finishing them is a good result. It replaces the earlier expand-it sentence slide; adding one word (kind, big) is now the second frame. Mark only capital letters and full stops. Keep 'is' clear when you read the model. The paragraph can be the script for the recorded family picture talk at home.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["This is my family.", "My family is ___.", "I live with my ___."] },
              { level: "Core", task: "Write three sentences: who, big or small, who you live with." },
              { level: "Stretch", task: "Add a fourth sentence: 'We play together.'" },
            ],
          },
        },
        {
          after: "Show your picture to a friend",
          slide: {
            kind: "fluency",
            title: "Family sprint: This is my ___",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["This is my mother.", "This is my brother.", "This is my friend.", "My family is big.", "My family is small."],
            recycle: ["Hello, hello!", "Stand up, sit down."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher holds up a family card, the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the family card. Say a WHOLE sentence: 'This is my mother.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: mother)", "(card: brother)", "(card: friend)", "(card: big family)", "(card: small family)"],
            feedback: "For 'This my mother' (no 'is'), do not say it for the child: point to the frame on the board, say 'This ... ' and pause, or hold up one finger for the missing little word. For 'My family big', say 'My family ...' and pause. For a sound, give a quick recast: the child says 'moder', you say 'mother', and the child echoes it. " + grammarPrompt,
            teacherNote: "Whole sentences only, never single words: the aim is 'This is my mother' as one smooth piece. Doing the same sentences over and over, a little faster each time, is how phrases become automatic. Listen for the missing 'is' and for 'fam-ily' said clearly.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["This is my ___.", "My family is ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a second sentence: 'This is my sister. She is nice.'", frames: ["This is my ___. She / He is ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My family picture talk",
        prompt: "Show your family picture to the camera. Tell us who is in it. Say if your family is big or small.",
        length: "30-60 seconds",
        steps: [
          "Look at your family picture from class.",
          "Say 'This is my ___.' for each person. Do it three times, a little faster each time.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say who is in your picture with 'This is my ___.' and keep talking without long stops.",
        words: ["mother", "father", "brother", "sister", "grandmother", "grandfather", "family", "friend"],
        grammar: ["This is my ___.", "My family is big. / My family is small."],
        rubric: [
          { label: "Who is in it", description: "Says 'This is my ___.' for two or more people.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Is", description: "Says the little word 'is': This is my mother. My family is small.", weight: 2 },
          { label: "Clear sounds", description: "Family words are clear, with the end sounds of brother, mother and sister.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___.", "My family is ___."], tips: ["Point to each person in your picture."] },
          { level: "Core", who: "Most children", frames: ["This is my ___. This is my ___.", "My family is ___."], tips: ["Say who they are, then big or small."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["This is my ___. She / He is ___.", "This is my friend ___."], tips: ["Add one word about each person: kind, happy, funny."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u01-l2": {
      objectives: ["I can tell about families and friends three times, faster each time."],
      trim: {
        "Big and small chant": 4,
        "Family Simon says": 3,
        "Family statues": 5,
        "Run and touch: big or small family": 3,
        "Reading groups: find and retell (SB 10-11)": 12,
      },
      add: [
        {
          after: "Good friends (SB 11)",
          slide: {
            kind: "fluency",
            title: "Family and friends: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same short family story three times. Each time is shorter, smoother and faster.",
            chunks: ["I live with my mother and father.", "We play together.", "We help each other.", "My family is big.", "I love my family."],
            recycle: ["This is my friend.", "My family is small."],
            rounds: [
              { seconds: 60, say: "Tell your partner about your family. Use the three picture cards (live, play, help), then add 'My family is big.' if you can." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for 'live', two for 'play', three for 'help'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Nice!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: people at home)", "(picture: children playing)", "(picture: children helping)"],
            feedback: "For 'I live my mother' (no 'with'), hold up a finger and say 'I live ... ' and pause; the child says 'with'. For 'We plays together', say 'We play' with a rising voice and let the child repeat it. For 'my friend' said as 'my friends' for one person, point to the picture and count. For sounds, a quick recast and echo. " + grammarPrompt,
            teacherNote: "The same story three times on purpose: the second and third tellings let children speak faster because they are not searching for words. The one-minute fix between rounds 1 and 2 is what makes the repeat more accurate, not just faster. Accept short tellings; the shrinking time does the work. Keep the picture cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["I live with my ___.", "We play together.", "We help each other."] },
              { level: "Core", task: "Tell all three sentences without the frames." },
              { level: "Stretch", task: "Add two more: 'My family is big. I love my family.'" },
            ],
          },
        },
        {
          after: "Draw and label: together",
          slide: {
            kind: "writing",
            title: "My family together: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Point to each sentence.",
              "Plan: draw in the boxes. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use the frames. You may copy and finish them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the verbs after 'we' (we play, we help). Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My family together",
              text: "My family is small and kind. I live with my mother and my sister. We play together and we help each other.",
            },
            organiser: [
              { label: "My family", prompt: "Draw your family. Is it big or small?" },
              { label: "I live with", prompt: "Draw the people you live with." },
              { label: "We", prompt: "Draw what you do together: play or help." },
            ],
            frames: ["My family is ___.", "I live with my ___ and my ___.", "We play together and we help each other."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end of each sentence", "We play, we help: no -s after 'we'"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph after the reading: three very short sentences planned by drawing. It replaces the dictogloss slide, so the sentences now come from the child's own family. Copying and finishing the frames is a good result for most children. Mark only capital letters and the verb after 'we'. Say 'play' and 'help' clearly, with no -s.",
            tiers: [
              { level: "Support", task: "Copy the three frames and fill in one word in each.", frames: ["My family is ___.", "I live with my ___.", "We play together."] },
              { level: "Core", task: "Write three sentences with the frames." },
              { level: "Stretch", task: "Add a fourth sentence: 'I love my family.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u01-l3": {
      objectives: ["I can say 'I'm six.' 'He's seven.' 'She's six.' without stopping."],
      add: [
        {
          after: "Puppet ages: I'm, he's, she's",
          slide: {
            kind: "fluency",
            title: "Puppet ages: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same puppet task three times with three partners. Each time, say it smoother.",
            chunks: ["I'm six years old.", "He's seven years old.", "She's six years old.", "My family is big.", "My friends are kind."],
            recycle: ["This is my mother.", "We play together.", "We help each other."],
            rounds: [
              { seconds: 60, say: "Choose a puppet card. Tell your partner: who it is and how old." },
              { seconds: 50, say: "New partner, new puppet. The same task, a bit faster." },
              { seconds: 40, say: "New partner. Tell it with no stops!" },
            ],
            steps: [
              "Take a puppet card. Say 'I'm ___ years old' for yourself, then 'He's / She's ___' for the puppet.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner and a new puppet.",
              "The listener points to the puppet and says 'Yes!' if the sentence is right.",
            ],
            prompts: ["(card: boy, seven)", "(card: girl, six)", "(card: big family)", "(card: two kind friends)"],
            feedback: "For 'I six years old', point to the frame and say 'I' ... then pause: the child adds 'm'. For 'He's my sister', point to the picture and ask 'He or she?' with a raised finger. For 'My friends is kind', say 'My friends ... ' with a rising voice and hold up two fingers for 'more than one'. For 'six year', hold up the finger for the -s and ask for the end. " + grammarPrompt,
            teacherNote: "Task repetition (same task, new partner) frees attention for accuracy on the second and third time. Listen for I'm, he's and she's, for is/are with 'family' and 'friends', and for the -s in years. Say 'years' with a clear final sound yourself.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with your partner.", frames: ["I'm ___ years old.", "He's / She's ___."] },
              { level: "Core", task: "Say all three sentences without the board." },
              { level: "Stretch", task: "Add the puppet's family: 'She's six years old. Her family is big.'" },
            ],
          },
        },
        {
          after: "Write about me (SB 13 D)",
          slide: {
            kind: "writing",
            title: "Fix the be sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing little word, a missing -s, or he/she.",
              "Write it the right way. Read it aloud together.",
            ],
            items: [
              { q: "I six years old.", answer: "I'm six years old." },
              { q: "My family big.", answer: "My family is big." },
              { q: "My friends is kind.", answer: "My friends are kind." },
              { q: "My sister is seven. He is kind.", answer: "My sister is seven. She is kind." },
            ],
            checklist: ["I'm, is or are is in my sentence", "One: is. More than one (friends): are", "he for a boy, she for a girl"],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese has no verb 'to be' before an adjective or a number (a family big, I six), so a missing 'am / is / are' is a likely slip, and 'is' for 'friends' may come next. Fix one together first; praise a child who spots the mistake before you point.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Me and my friend: I'm, he's, she's",
        prompt: "Tell us your name and how old you are. Then tell us about a friend or someone in your family: who is it, how old are they, and are they kind?",
        length: "30-60 seconds",
        steps: [
          "Choose one friend or family member and a photo or drawing of them.",
          "Practise three times: 'I'm ___ years old. He's / She's ___ years old.' Each time a little faster.",
          "Record it once. Show the photo or drawing.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 90,
        kidSummary: "Say how old you are and tell about one person with 'He's' or 'She's', and keep talking without long stops.",
        words: ["years old", "family", "friends", "kind", "big", "small", "happy"],
        grammar: ["I'm ___ years old.", "He's / She's ___.", "My family is ___. My friends are ___."],
        rubric: [
          { label: "I'm, he's, she's", description: "Says I'm for self and he's or she's for the other person correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Is and are", description: "Says 'My family is ...' and 'My friends are ...' correctly.", weight: 2 },
          { label: "Years", description: "The -s at the end of 'years' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I'm ___ years old.", "He's / She's ___."], tips: ["Hold up your fingers for the numbers."] },
          { level: "Core", who: "Most children", frames: ["I'm ___ years old. He's / She's ___ years old.", "My family is ___."], tips: ["Say who the person is first: 'This is my ___.'"] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["My friends are ___ and ___.", "He's / She's kind and ___."], tips: ["Add what the person is like, and talk about two people."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u01-l4": {
      objectives: ["I can talk about my family to three friends, faster each time."],
      trim: {
        "Family word ball chant": 4,
        "Listen, point, say (SB 14 A)": 6,
        "Which column? Sort the words (SB 14 B)": 5,
        "Guess who? (family riddles)": 4,
        "Opposites ball game (SB 15 F)": 6,
      },
      add: [
        {
          after: "This is my ... Hello! (SB 15 E)",
          slide: {
            kind: "fluency",
            title: "Family talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same family talk to three friends. Each talk is shorter and smoother.",
            chunks: ["Hello! This is my uncle.", "This is my cousin.", "He's seven years old.", "My parents are kind.", "Nice to meet you!"],
            recycle: ["I'm six years old.", "My family is big.", "We play together.", "I live with my mother and father."],
            rounds: [
              { seconds: 60, say: "Partner 1: give your family talk. The listener counts the people on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Nice to meet you!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first, line B listens.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner for round 2, and again for round 3.",
              "Then swap: line B talks and line A listens, with the same three rounds.",
            ],
            feedback: "For 'My parents is kind', say 'My parents ... ' with a rising voice and hold up two fingers. For 'This is my cousin. She's seven.' about a boy, point to the card and ask 'He or she?'. For 'This my uncle', point to the frame and pause after 'This'. For the end sound of 'cousin' or 'uncle', give a quick recast and let the child echo it. " + grammarPrompt,
            teacherNote: "Same talk, less time, new listener: the 4-3-2 activity made shorter for six-year-olds. The new partner keeps the repetition real. Do not add new words between rounds; the gain comes from saying the same thing more smoothly. Listen for is/are with 'parents' and for the 's' in 'parents' and 'years'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Hello! This is my ___.", "My ___ is kind."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add more: 'My cousin is seven. We play together.'" },
            ],
          },
        },
        {
          after: "Say it before you write (SB 15 Write)",
          slide: {
            kind: "writing",
            title: "Join my family sentences with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "My uncle is kind. My uncle is funny. (and)", answer: "My uncle is kind and funny." },
              { q: "I live with my mother. I live with my father. (and)", answer: "I live with my mother and my father." },
              { q: "My parents are kind. My parents are happy. (and)", answer: "My parents are kind and happy." },
              { q: "We play together. We help each other. (and)", answer: "We play together and we help each other." },
            ],
            checklist: ["Only one 'is', 'are' or 'live with' in each sentence", "'and' joins the two ideas", "A capital letter and a full stop"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is a well-known way to grow sentence writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'My uncle is'. Check 'are' with 'parents': the same finger-for-two prompt as in speaking.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three: 'My family is kind, happy and funny.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u01-l5": {
      objectives: ["I can ask 'How old is he?' and answer it fast, round the circle."],
      trim: { "Run to the mat": 8 },
      add: [
        {
          after: "Photo gap: How old is he?",
          slide: {
            kind: "fluency",
            title: "Question chain: How old is he?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["How old is he?", "He's seven years old.", "How old is she?", "She's my grandmother.", "My friends are kind."],
            recycle: ["I'm six years old.", "This is my aunt."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a person card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your person card so only you can see it.",
              "Ask the friend on your left: 'How old is he?' or 'How old is she?' about your card.",
              "They answer: 'He's seven years old.' Then they turn and ask the next friend about their own card.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["How old is he?", "How old is she?", "(card: boy, seven)", "(card: girl, six)"],
            feedback: "For 'How old he?' (no 'is'), hold up a finger and say 'How old ... ' and pause. For 'She's seven' said about a boy card, point to the picture and ask 'He or she?'. For 'He seven years old', point to the frame: 'He ... ' and the child adds 's. For 'six year', hold up a finger for the -s. " + grammarPrompt,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'How old is he?' automatic. Time the whole circle and tell them; children love beating their own time. Listen for the missing 'is' and the 's in he's and she's.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["How old is he / she?", "He's / She's ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add one more: 'He's seven. He's my cousin.'" },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "My friend: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model with the teacher. Point to each sentence.",
              "Plan: draw in the boxes. Say one sentence for each box to your partner.",
              "Write: one sentence for each box. Use the frames. You may copy and finish them.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at he's and she's and is and are. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My friend Mimi",
              text: "This is my friend Mimi. She's seven years old and very kind. Mimi and I are friends, and we play together.",
            },
            organiser: [
              { label: "Who", prompt: "Draw your friend. What is your friend's name?" },
              { label: "How old and kind", prompt: "Draw your friend's age and a kind face. Is it a boy or a girl?" },
              { label: "We", prompt: "Draw you and your friend. What do you do together?" },
            ],
            frames: ["This is my friend ___.", "He's / She's ___ years old and ___.", "___ and I are friends."],
            checklist: ["He's for a boy, She's for a girl", "is for one, are for two", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The model is ours, not the book's; Mimi is the puppet name used in class. It replaces the earlier model-then-write slide with the same grammar (he's, she's, is, are), now planned by drawing and written as a paragraph of three short sentences. Copying the frames and filling in a name and a number is a good result. Mark only he's / she's and is / are. The paragraph can be the script for the recorded talk about a friend.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your friend's name and age.", frames: ["This is my friend ___.", "He's / She's ___ years old."] },
              { level: "Core", task: "Write three sentences about your friend with the frames." },
              { level: "Stretch", task: "Add a fourth sentence: 'I like my friend.'" },
            ],
          },
        },
      ],
    },
  },
};
