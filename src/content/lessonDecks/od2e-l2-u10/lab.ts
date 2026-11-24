import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 10 "Please and
// Thank You" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's polite phrases and grammar said again
// and again as whole sentences, a little faster each round, with Unit 9's phrases mixed
// back in) and one short writing routine (say it, write it, read it back). Three lessons
// end with a recorded talk for home, built on the routine the class just did. Time comes
// from games, chants and repeats, never from the book pages or the grammar. All text is
// original.

const fixStart =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause, or hold up a finger for the missing word. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: children copy what they hear. ";

const feedbackManners =
  fixStart +
  "Here every sentence starts with 'I', so listen for 'I not share' or 'I no shout' for 'I don't share' (start 'I don't ...?' and pause, let the child finish), a missing -s on 'hands' and 'toys' (hold up two fingers), and a dropped 'before' ('I knock I come in': point to the frame).";

const feedbackThird =
  fixStart +
  "Here, listen for 'He ask' and 'She say' (hold up a finger for the -s), 'The monkey rude' for 'The monkey is rude' (point to the 'is' in the frame), and 'That is why' left out. Prompt: 'The rabbit ... happy?' and pause for 'is'.";

const feedbackCanMay =
  fixStart +
  "Here, listen for 'Can I playing?' and 'May I to come in?' (start 'Can I ...' and pause: the child says the plain action word), 'Yes, I can' for 'Yes, you can' (point at the child who asked: 'Yes, YOU ...'), and 'mayn't' for 'may not'. Repeat the error with a rising voice: 'Yes, I can?'";

const feedbackBe =
  fixStart +
  "Here, listen for 'I is', 'They is', 'She were' and 'The boys was' (hold up one finger for one person, two for more than one, and let the child choose am/is/are, was/were). Vietnamese has no 'be' that changes, so 'She happy' with no verb is also common: point to the frame.";

const feedbackRetell =
  fixStart +
  "Here, listen for 'She not follow the rule' for 'She did not follow the rule' (prompt 'She did ... ?'), 'Layla rude' with no 'was', and 'it help' for 'it helps' (finger for the -s).";

export const odL2U10Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u10-l1": {
      objectives: ["I can say what polite children do, fast and without stopping: 'I knock before I come in.'", "I can write a short paragraph about being polite at a friend's house."],
      trim: {
        "Knock, knock chant": 3,
        "Mystery bag: what do you notice?": 5,
        "Thumbs up, thumbs down (TPR)": 4,
        "Flashcard slap and What's missing?": 5,
      },
      add: [
        {
          after: "What do you do at a friend's house?",
          slide: {
            kind: "fluency",
            title: "Polite sprint: what I do at a friend's house",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole polite sentence, fast and smooth, with no stops.",
            chunks: [
              "I knock before I come in.",
              "I wash my hands before lunch.",
              "I share my toys with my friend.",
              "I say please and thank you.",
              "I don't shout. It is rude.",
            ],
            recycle: ["At school I can't run in the hall.", "Rules help us because they keep us safe."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I knock before I come in.'",
              "For a rude picture, say: 'I don't ___. It is rude.'",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["(card: knocking on a door)", "(card: washing hands)", "(card: sharing toys)", "(card: shouting)", "(card: saying thank you)"],
            feedback: feedbackManners,
            teacherNote:
              "Whole sentences only, never single words: the point is to say 'I wash my hands before lunch' as one smooth piece. Say the end of every word clearly yourself ('knock', 'wash', 'share'). Mix in two or three of Unit 9's rule sentences so last unit's phrases stay quick (spaced retrieval). Every sentence here starts with 'I', so no verb ending is needed; the real traps are 'I not share' and a dropped 'before'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I ___ before I come in.", "I don't ___. It is rude."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I don't shout. It is rude, and my friend is sad.'", frames: ["I don't ___. It is rude because ___."] },
            ],
          },
        },
        {
          after: "Which animal is rude? (SB 97 D)",
          slide: {
            kind: "writing",
            title: "My polite visit: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then and At the end.",
              "Plan: in each box draw one thing you do at a friend's house, or write a few words. Tell your partner.",
              "Write: five short sentences, one for each part of your plan. Use First, Then, because and At the end.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at \"I don't\" and the full stops. Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: my polite visit",
              text: "I am polite at my friend's house. First, I knock before I come in. Then I wash my hands and share my toys. I don't shout because it is rude. At the end, I say thank you and goodbye.",
            },
            organiser: [
              { label: "First", prompt: "Draw the door. What do I do before I come in?" },
              { label: "Then", prompt: "Draw inside the house. What do I do? What do I share?" },
              { label: "I don't", prompt: "Draw one rude thing. Why is it rude?" },
              { label: "At the end", prompt: "Draw saying goodbye. What do I say?" },
            ],
            frames: ["I am polite at my friend's house.","First, I ___ before I come in.","Then I ___ and I ___.","I don't ___ because it is rude.","At the end, I say ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence","After I don't comes a plain action word (I don't shout)","I used First, Then or because to join my ideas"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, like a polite guest.",
            teacherNote: "A first short paragraph for seven-year-olds: five sentences, each one planned in a box. The drawings or a few words are the plan, so no full sentences are written until the Write step. The joining words First, Then and because give the paragraph its shape. Mark only two things (I don't + plain verb, and full stops); the dot tells the child where to look and the child finds the mistake. This replaces the single-sentence expand task: the best sentence, 'I don't ___ because it is rude', is now the fourth frame.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word in each. Draw your plan first.", frames: ["First, I ___ before I come in.","I don't ___ because it is rude."] },
              { level: "Core", task: "Write four or five sentences with First, Then, because and At the end." },
              { level: "Stretch", task: "Write five sentences and add a sixth with 'but': 'I want the toy, but my friend is using it.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u10-l2": {
      objectives: ["I can tell a polite animal story three times, faster each time.", "I can write a short story paragraph: the polite animal, the rude animal and the theme."],
      trim: { "Animal action chant": 3 },
      add: [
        {
          after: "Same as me, different from me",
          slide: {
            kind: "fluency",
            title: "Animal poem story: tell it 3-2-1",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same short animal story to three friends. Each telling is shorter and smoother.",
            chunks: [
              "The rabbit is polite. He says please and thank you.",
              "The monkey is rude. He shouts and takes the toys.",
              "He asks before he takes a turn.",
              "That is why everyone likes the rabbit.",
              "I think the theme is being kind.",
            ],
            recycle: ["Rules help us because they keep us safe.", "At home I have to help my family."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell the animal story. The listener holds up a finger for each animal they hear." },
              { seconds: 45, say: "New partner: the same story in less time." },
              { seconds: 30, say: "New partner: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Choose one polite animal and one rude animal. Say what each one does.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner.",
              "End with 'That is why ...' and say the theme.",
            ],
            prompts: ["(picture: a polite rabbit)", "(picture: a rude monkey)", "(picture: friends sharing)"],
            feedback: feedbackThird,
            teacherNote:
              "The same story three times, less time each, with a new listener: the 4-3-2 activity scaled for seven-year-olds. Fluency can grow without accuracy growing too, which is why the one-minute fix goes between rounds 1 and 2. Listen for the third-person -s (says, shouts, takes, asks): Vietnamese has no verb endings, so it is easy to drop. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Tell two sentences with the frames and point to the pictures.", frames: ["The ___ is polite. He ___.", "The ___ is rude. He ___."] },
              { level: "Core", task: "Tell the polite animal, the rude animal and the theme without the board." },
              { level: "Stretch", task: "Add 'That is why ...' and say how you are like or different from the animal.", frames: ["That is why ___.", "I am like the ___ because I ___."] },
            ],
          },
        },
        {
          after: "What is the theme? (the four Think boxes)",
          slide: {
            kind: "writing",
            title: "My animal story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the polite animal, the rude animal and the theme.",
              "Plan: in each box draw or write a few words. Say your story to your partner, one box at a time.",
              "Write: four or five sentences. Use because, but, First and That is why.",
              "Check: tick the checklist. Your partner points to every -s in says, shouts and takes.",
              "Teacher: look only at the -s on the verbs and the capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: the polite rabbit",
              text: "The rabbit is polite because he says please and thank you. First, he asks before he takes a turn. The monkey is rude, but he shouts and takes the toys. In the end, the other animals play with the rabbit. That is why everyone likes him.",
            },
            organiser: [
              { label: "Polite animal", prompt: "Draw the polite animal. What does he or she do?" },
              { label: "Rude animal", prompt: "Draw the rude animal. What does he or she do?" },
              { label: "What happens", prompt: "Draw the end of the story. Who plays with who?" },
              { label: "Theme", prompt: "Draw a happy face. What is the theme? That is why ..." },
            ],
            frames: ["The ___ is polite because ___.","First, he / she ___ before ___.","The ___ is rude, but ___.","In the end, ___.","That is why ___."],
            checklist: ["The -s is on the verbs: says, asks, shouts, takes","I used because or but at least once","A capital letter at the start and a full stop at the end of every sentence"],
            sayIt: "Read your story to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "Children retell the animal poems as a paragraph: the polite animal, the rude animal, what happens and the theme. This paragraph is also the script for the recorded talk 'My polite animal story' at home: the child tells it three times, each time a little faster. It replaces the dictogloss 'The polite bear' because a retell in the child's own words does the same work (a story rebuilt from memory) and ends with a paragraph the child owns. Vietnamese has no verb endings, so mark only the -s on the third-person verbs and the capital letters.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the animal names and one action in each.", frames: ["The ___ is polite because ___.","That is why ___."] },
              { level: "Core", task: "Write four or five sentences with because, but and That is why." },
              { level: "Stretch", task: "Add a sentence about you: 'I am like the rabbit because I say please.'", frames: ["I am like the ___ because I ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My polite animal story",
        prompt: "Tell a short story about a polite animal and a rude animal. Say what each one does and what the theme is. Show a drawing or a toy animal!",
        length: "45-90 seconds",
        steps: [
          "Look at your drawing from class. Choose one polite animal and one rude animal.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera. End with 'That is why ...'.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 130,
        kidSummary: "Tell about a polite animal and a rude animal, say the theme, and keep talking without long stops.",
        words: ["polite", "rude", "share", "please", "thank you", "theme"],
        grammar: ["The ___ is polite / rude.", "He / She + verb with -s", "That is why ___."],
        rubric: [
          { label: "Two animals", description: "Tells what a polite animal and a rude animal do.", weight: 3 },
          { label: "Theme", description: "Says the theme with 'That is why' or 'I think the theme is ...'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear -s", description: "The -s at the end of words like says, asks and takes can be heard.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is polite. He ___.", "The ___ is rude. He ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ is polite. He says ___ and ___.", "The ___ is rude. He ___.", "That is why ___."], tips: ["Say what each animal does, then the theme."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I am like the ___ because I ___.", "I think the theme is ___ because ___."], tips: ["Say how you are like one animal and give a reason for the theme."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u10-l3": {
      objectives: ["I can ask 'Can I ...?' and 'May I ...?' and answer fast, round the circle.", "I can write a short paragraph about what I ask at school and at home."],
      trim: { "Please-and-thank-you chant": 3 },
      add: [
        {
          after: "Role play: May I? Can I? (SB 101 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Can I? May I?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Can I play with the blocks, please?",
              "May I go to the bathroom, please?",
              "Yes, you can.",
              "Yes, you may.",
              "No, you can't. It's raining.",
            ],
            recycle: ["Whose bag is this? It's mine.", "They're ours!"],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card (a thing to ask for)." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your picture card.",
              "Ask the friend on your left: 'Can I ___, please?' (friend) or 'May I ___, please?' (teacher voice).",
              "They answer with YOU: 'Yes, you can.' / 'No, you can't. ___.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["Can I ___, please?", "May I ___, please?"],
            feedback: feedbackCanMay,
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Can I ...?' and 'May I ...?' automatic. Time the whole circle and tell them; children love beating their own time. The big trap is the answer: the child asked 'I', so the answer is 'YOU'. Point at the asker: 'Yes, YOU ...'. Say 'may' for teacher and grown-up voices, 'can' for friends, and let children swap voices.",
            tiers: [
              { level: "Support", task: "Ask with the frame on the board and answer 'Yes, you can.'", frames: ["Can I ___, please?", "Yes, you can."] },
              { level: "Core", task: "Ask and answer both ways without looking at the board." },
              { level: "Stretch", task: "Say no politely with a reason: 'No, you may not. It is time for class.'", frames: ["No, you may not. It is ___."] },
            ],
          },
        },
        {
          after: "What do I need to ask at home? (SB 101 F)",
          slide: {
            kind: "writing",
            title: "Asking first: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the two questions and the two answers.",
              "Plan: in each box draw or write what you ask, and who answers. Tell your partner.",
              "Write: four or five sentences. Say who you ask, what you ask and the answer.",
              "Check: tick the checklist. Your partner checks every question mark.",
              "Teacher: look only at the plain action word after Can I / May I and the word you in the answer. Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: asking first",
              text: "At school I say, 'May I go out, please?' to my teacher. She says, 'Yes, you may.' At home I say, 'Can I play?' to my brother, but he says, 'No, you can't. It is my turn.' I ask first because it is polite.",
            },
            organiser: [
              { label: "At school", prompt: "Draw your teacher. What do you ask? May I ...?" },
              { label: "The answer", prompt: "What does she say? Yes, you may. / No, you may not." },
              { label: "At home", prompt: "Draw a person at home. What do you ask? Can I ...?" },
              { label: "Why", prompt: "Draw a happy face. Why do you ask first?" },
            ],
            frames: ["At school I say, 'May I ___, please?' to my teacher.","She says, 'Yes, you ___.'","At home I say, 'Can I ___?' to my ___.","He / She says, 'No, you ___. It is ___.'","I ask first because ___."],
            checklist: ["After Can I / May I comes a plain action word (play, go, sit)","The answer says YOU: 'Yes, you can.'","A question mark at the end of a question, a full stop at the end of a sentence"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Builds on the old 'write what I ask' task: the child still writes one school question and one home question, now inside a short paragraph with an answer and a reason. Point out that after 'May I' the action word has no ending ('May I play', never 'May I plays') and that the answer turns I into YOU. Mark only two targets.",
            tiers: [
              { level: "Support", task: "Copy the five frames and fill in one word in each.", frames: ["At school I say, 'May I ___, please?'","At home I say, 'Can I ___?'"] },
              { level: "Core", task: "Write four or five sentences with a school question, a home question and a reason." },
              { level: "Stretch", task: "Add what happens if the answer is no: 'No, you may not. It is ___.' and say what you do next.", frames: ["No, you may not. It is ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u10-l4": {
      objectives: ["I can ask politely to use something, and say it better the second time."],
      add: [
        {
          after: "Ask for something in a polite way (SB 103 E, Track 2•23)",
          slide: {
            kind: "fluency",
            title: "Ask nicely, then ask again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the polite asking talk, plan one minute, then do it again with a new partner, smoother.",
            chunks: [
              "Are you using the tablet?",
              "Yes, I am, but we can share it.",
              "No, I'm not. You may use it.",
              "May I use it, please?",
              "Thank you! You are kind.",
            ],
            recycle: ["Can I play with the blocks, please? Yes, you can.", "I knock before I come in."],
            rounds: [
              { seconds: 60, say: "Round 1: talk with your first partner. One of you has the tablet, the other asks." },
              { seconds: 45, say: "Plan quietly for a short moment, then talk with a new partner. Swap who asks." },
              { seconds: 45, say: "New partner again. Say it smoother and faster!" },
            ],
            steps: [
              "Hold a toy tablet or a picture. Ask: 'Are you using the ___?'",
              "Answer with a full sentence: 'Yes, I am, but we can share it.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "Round 3: say 'Thank you! You are kind.' at the end, with a smile.",
            ],
            prompts: ["(picture: tablet)", "(picture: camera)", "(picture: computer)", "(picture: headphones)"],
            feedback: feedbackBe,
            teacherNote:
              "Task repetition (Bygate): the same task again with a new partner, after a minute of planning, tends to give smoother speech and often better grammar. Listen for 'Are you use the tablet?' and 'Yes, I using' (hold up fingers: 'Are you ... using?'). The short answer 'Yes, I am' is a chunk: say it as one piece. Remind the class that 'am' goes with 'I', 'is' with one, 'are' with 'you' and more than one.",
            tiers: [
              { level: "Support", task: "Use the frames and point to the picture.", frames: ["Are you using the ___?", "Yes, I am, but we can share it."] },
              { level: "Core", task: "Ask and answer without the frames, and say thank you." },
              { level: "Stretch", task: "Add a feeling: 'I feel happy when my friends share.'", frames: ["I feel ___ when ___."] },
            ],
          },
        },
        {
          after: "Sentence halves: who goes with which verb?",
          slide: {
            kind: "writing",
            title: "Fix the am, is and are sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: am, is, are, was or were.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "I is happy today.", answer: "I am happy today." },
              { q: "My friends is kind.", answer: "My friends are kind." },
              { q: "She were thoughtful.", answer: "She was thoughtful." },
              { q: "The boys was at the party.", answer: "The boys were at the party." },
            ],
            checklist: ["I = am (or was)", "One person or thing = is (or was)", "More than one = are (or were)"],
            sayIt: "Read your fixed sentences to your partner, fast.",
            teacherNote: "Two error types only, to keep it light: the right form of 'be' for the person, and now or before (am/is/are or was/were). Fix the first one together and say the rule in one short line: 'One friend: is. Two friends: are.'",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 with the rule on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two new sentences about thoughtful people, one with 'was' and one with 'were'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My thoughtful person",
        prompt: "Tell us about a thoughtful person you know. Say who they are, what they do, and how you feel about it.",
        length: "45-90 seconds",
        steps: [
          "Think of a thoughtful person. Find a photo or draw them.",
          "Tell about them three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Say what they do and how you felt.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 130,
        kidSummary: "Say who is thoughtful, what they do, and how you feel, and keep talking without long stops.",
        words: ["thoughtful", "kind", "polite", "share", "friend"],
        grammar: ["My thoughtful person is ___.", "He / She is ... / He / She + verb with -s", "I felt ___."],
        rubric: [
          { label: "Who and what", description: "Says who the person is and what they do that is thoughtful.", weight: 3 },
          { label: "Right form of be", description: "Says is / are / was / were correctly (She is kind. They are kind.).", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Feeling", description: "Says how they felt with 'I felt ___.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My thoughtful person is ___.", "He / She ___.", "I felt ___."], tips: ["Point to the photo or drawing."] },
          { level: "Core", who: "Most children", frames: ["My thoughtful person is ___. She is ___.", "She ___ when ___.", "That is thoughtful because ___."], tips: ["Tell one thing they do, with the -s on the verb."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Yesterday she was ___ and I felt ___.", "I want to be thoughtful too because ___."], tips: ["Tell a time they were thoughtful, then say how you can be thoughtful too."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u10-l5": {
      objectives: ["I can retell what Layla did and how to fix it, faster each time."],
      add: [
        {
          after: "How would you fix it? Layla's chart",
          slide: {
            kind: "fluency",
            title: "Layla's day: retell and fix it",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Retell what Layla did, what she should do, and what she can do next time. Each telling is shorter.",
            chunks: [
              "Layla was rude. She did not follow the rule.",
              "She should say thank you.",
              "Next time she can ask first.",
              "It is important to be polite because it helps people get along.",
            ],
            recycle: ["May I use it, please? Yes, you may.", "Always say please. Don't push."],
            rounds: [
              { seconds: 60, say: "Tell your partner what Layla did and how to fix it. Use the chart." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at Layla's chart. Choose one thing she did that was rude.",
              "Say: what she did, what she should do, what she can do next time.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "The listener says 'Good idea!' and gives a thumbs up at the end.",
            ],
            prompts: ["(chart: what Layla did in picture 1)", "(chart: what Layla did in picture 3)", "(chart: what Layla did in picture 5)"],
            feedback: feedbackRetell,
            teacherNote:
              "Retelling the same events three times, shorter each time, frees the child from searching for words, so speech gets faster and smoother. The one-minute fix between round 1 and 2 is what carries accuracy: without it children get faster at their mistakes. Listen for the third-person -s on 'helps' and for 'was' (children say 'Layla rude').",
            tiers: [
              { level: "Support", task: "Use the chart and the frames to say two sentences.", frames: ["Layla ___. That was rude.", "She should ___."] },
              { level: "Core", task: "Retell all three parts without the frames." },
              { level: "Stretch", task: "Add why it matters: 'It is important to be polite because it helps people.'", frames: ["It is important to ___ because ___."] },
            ],
          },
        },
        {
          after: "Gallery walk: say one thing about each poster (SB 105 D)",
          slide: {
            kind: "writing",
            title: "Join the rule sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Join them into ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "I say please. It is polite. (because)", answer: "I say please because it is polite." },
              { q: "I ask first. I take a turn. (and then)", answer: "I ask first and then I take a turn." },
              { q: "I want the pencil. My friend is using it. (but)", answer: "I want the pencil, but my friend is using it." },
              { q: "We share the books. We are friends. (because)", answer: "We share the books because we are friends." },
            ],
            checklist: ["One sentence, not two", "The joining word is there (because, and then, but)", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking, then say it once more, faster.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the full stop and the second capital. Use the children's own rule poster ideas where you can: 'because' gives the reason for a rule.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Join three sentences into one: 'I say please, and I wait, because it is polite.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u10-l6": {
      objectives: ["I can ask 'Can I ...?' and 'May I ...?' and answer with 'you', fast and right."],
      trim: { "Remember it!": 4, "The Gatekeeper's steps: ask and move": 7 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Can I? May I?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "May I have a turn, please?",
              "Can I sit next to you? Yes, you can.",
              "Can I open the window, please? No, you may not. It is cold.",
              "Yes, you may. Thank you!",
            ],
            recycle: ["Whose bag is this? It's mine.", "She was kind. They were kind."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 45, say: "Boys ask, girls answer. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            feedback: feedbackCanMay,
            teacherNote: "A quick, high-energy recall of Unit 9 and Unit 10 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. The answer is 'you': point at the asker each time.",
            tiers: [
              { level: "Support", task: "Say the sentence with the card in your hand.", frames: ["May I ___, please?", "Yes, you may."] },
              { level: "Core", task: "Say the sentence when the card flips, without help." },
              { level: "Stretch", task: "Say no politely with a reason: 'No, you may not. It is cold.'" },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "Fix the asking notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Milo wrote notes about asking, but he made mistakes!",
              "Read each note with your partner and find the mistake.",
              "Write it the right way and read it to Milo (the teacher).",
            ],
            items: [
              { q: "I can go out?", answer: "Can I go out?" },
              { q: "Can I plays outside?", answer: "Can I play outside?" },
              { q: "Yes, I can. (answer to: Can I sit here?)", answer: "Yes, you can." },
              { q: "No, you mayn't.", answer: "No, you may not." },
            ],
            checklist: ["The question starts with Can or May", "After Can I / May I the action word has no ending", "The answer says YOU"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote: "Three error types, each with a one-line rule. The 'Yes, I can' mistake is the hardest for this class: it is correct English in another question ('Can you swim?'), so explain that the answer turns the 'I' into 'you'.",
            tiers: [
              { level: "Support", task: "Fix notes 1 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all four notes." },
              { level: "Stretch", task: "Write a new note with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "I ask first at home",
        prompt: "Show three things you ask a grown-up before you use or do them. Ask each one politely with 'Can I' or 'May I', and say the answer you get.",
        length: "45-90 seconds",
        steps: [
          "Choose three things at home: the tablet, a snack, going outside ...",
          "Practise your questions and the answers three times.",
          "Record it once. Show each thing as you ask.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 130,
        kidSummary: "Ask with 'May I' or 'Can I', say the answer with 'you', and keep talking without long stops.",
        words: ["please", "thank you", "borrow", "turn", "ask", "polite"],
        grammar: ["Can I ___? / May I ___?", "Yes, you can / may. No, you can't / may not.", "I ask first because ___."],
        rubric: [
          { label: "Questions", description: "Asks 'Can I ___?' or 'May I ___?' with a plain action word (not 'Can I plays').", weight: 3 },
          { label: "Answers with you", description: "Says 'Yes, you can.' or 'No, you may not.' (not 'Yes, I can.').", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops about three things.", weight: 2 },
          { label: "Reason", description: "Says why you ask first with 'because'.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["May I ___, please?", "Yes, you may. Thank you!"], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["Can I ___? Yes, you can.", "May I ___, please? No, you may not. It is ___."], tips: ["Find one thing the answer is no for."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I ask first because ___.", "At school I say 'May I ___?' but with my friend I say 'Can I ___?'"], tips: ["Say why you ask first, and who you say 'may' to."] },
        ],
      },
    },
  },
};
