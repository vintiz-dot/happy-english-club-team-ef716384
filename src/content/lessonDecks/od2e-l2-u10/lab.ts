import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 10 "Please and
// Thank You" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so the
// Lab raises everything it adds: longer chunks with reasons and contrasts, opinions, and full
// paragraphs. Every lesson gets a grammar drill (the unit's polite habits, Can I / May I and
// be, changed fast and then used for real talk), one more fluency routine and one writing
// routine. Lessons 2, 4 and 6 end with a recorded talk (90-120 seconds, made alone). Time
// comes from dropping or trimming the games made for younger children, never from the book
// pages or the grammar. All text is original.

const fixStart =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, write them on the board and let the class fix them in one minute: students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: point to the frame, start the phrase and pause, or hold up a finger for the missing word. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: students copy what they hear. ";

const feedbackManners =
  fixStart +
  "Here, listen for 'I not interrupt' or 'I no use my phone' for 'I don't interrupt' (start 'I don't ...' and pause, let the student finish), a missing -s on 'he' and 'she' sentences (hold up one finger), a dropped 'because' ('I knock it shows respect': point to the frame), and a missing -ed in the past ('I visit my cousin last weekend': tap your wrist).";

const feedbackThird =
  fixStart +
  "Here, listen for 'He say' and 'She ask' (hold up a finger for the -s), 'The monkey rude' for 'The monkey is rude' (point to the 'is' in the frame), 'Does the rabbit says?' for 'Does the rabbit say?' (repeat it with a rising voice), and 'That is why' or 'although' left out.";

const feedbackCanMay =
  fixStart +
  "Here, listen for 'Can I borrowing?' and 'May I to ask?' (start 'Can I ...' and pause: the student says the plain action word), 'Yes, I can' for 'Yes, you can' (point at the student who asked: 'Yes, YOU ...'), and 'mayn't' for 'may not'. Repeat the error with a rising voice: 'Yes, I can?' But 'Can you ...?' correctly gets 'Yes, I can': say so when it comes up.";

const feedbackBe =
  fixStart +
  "Here, listen for 'I is', 'They is', 'She were' and 'The students was' (hold up one finger for one person, two for more than one, and let the student choose am/is/are, was/were). Vietnamese has no 'be' that changes, so 'She happy' with no verb is also common: point to the frame. Listen for 'There is two phones' too.";

const feedbackRetell =
  fixStart +
  "Here, listen for 'She not follow the rule' for 'She did not follow the rule' (prompt 'She did ... ?'), 'Layla rude' with no 'was', 'May I to try' and 'it help' for 'it helps' (finger for the -s). In round 3 do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillFeedbackManners =
  "Prompt, do not tell. For 'Do you always knocks?' hold up one finger and say 'Do you ...?' with a rising voice. For a missing -s in the present ('she wash'), tap the table once. For 'I didn't visited', point to didn't and say 'plain verb?'. For a missing -ed in a statement about last weekend, tap your wrist (it is over) and wait. Say the final -s, -ed and the n't of don't clearly yourself. In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillFeedbackCanMay =
  "Prompt, do not tell. For 'Can I borrowing?' hold up one finger and say 'Can I ...?' and pause for the plain verb. For 'Yes, I can' as the answer to 'Can I ...?', point to the asker and say 'Yes, YOU ...'. For 'No, you mayn't', repeat it with a rising voice. Say the 't of can't and the 'ou' of you clearly yourself. In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillFeedbackBe =
  "Prompt, do not tell. For 'She were tired' hold up one finger and say 'One person: ...?' and wait. For 'The students was noisy' hold up two fingers. For 'There is two phones', point to 'phones' and say 'How many?'. For a missing be ('She tired'), point to the gap in the frame. Say the final -s of 'students' and the n't of isn't and wasn't clearly yourself. In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillFeedbackStory =
  "Prompt, do not tell. For 'Layla didn't followed' point to didn't and say 'plain verb?'. For 'She should to ask' repeat it with a rising voice and let the student fix it. For 'Did Layla was rude?' hold up one finger and say 'Was she ...?'. Say the final -ed of 'followed', 'apologized' and 'embarrassed' clearly yourself. In round 3, do not correct during an answer: note the mistake and give it back in the next fix minute.";

const drillSigns =
  "Whole class: the teacher says a sentence and shows a sign (? = make it a question, X = make it negative, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.";

export const odL2U10Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u10-l1": {
      objectives: [
        "I can talk about polite and rude behavior at a friend's house, and say why, in sentences with a reason.",
        "I can write a full paragraph about being a good guest.",
      ],
      drop: ["Knock, knock chant", "Thumbs up, thumbs down (TPR)", "Flashcard slap and What's missing?"],
      trim: {
        "Mystery bag: what do you notice?": 5,
      },
      add: [
        {
          after: "What do you do at a friend's house?",
          slide: {
            kind: "fluency",
            title: "Polite sprint: how I behave and why",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say a whole sentence about polite behavior with a reason, fast and smooth, with no stops.",
            chunks: [
              "I knock before I come in because it shows respect.",
              "I wash my hands and I offer to help when I visit a friend.",
              "I don't use my phone at the table, although my friends sometimes do.",
              "I say please and thank you because it makes people feel good.",
              "It is rude to shout in someone's home, so I speak quietly.",
            ],
            recycle: ["At school I can't run in the hall because it isn't safe.", "Rules help us because they keep everyone safe."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a topic card, the class says the whole sentence with its reason." },
              { seconds: 90, say: "Pairs: one shows a topic card, the other says a sentence about their own life with a reason. Swap when you hear the clap." },
              { seconds: 90, say: "Faster! New partner. Say as many true sentences with because, although or so as you can." },
            ],
            steps: [
              "Look at the topic card. Say a WHOLE sentence with a reason: 'I knock before I come in because it shows respect.'",
              "For a rude behavior, use: 'I don't ___, although ___.' or 'It is rude to ___, so I ___.'",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["(card: arriving at a friend's house)", "(card: using your phone)", "(card: eating together)", "(card: a loud group)", "(card: saying goodbye)"],
            feedback: feedbackManners,
            teacherNote:
              "Whole sentences with a reason: 'I knock' is not enough at this age; push for 'because', 'although' or 'so'. Say the end of every word clearly yourself ('knock', 'wash', 'respect'). Mix in two or three of Unit 9's rule sentences so last unit's phrases stay quick (spaced retrieval). The real traps are 'I not use my phone' and a dropped 'because'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a partner.", frames: ["I ___ before I ___ because ___.", "I don't ___. It is rude."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board, with a reason." },
              { level: "Stretch", task: "Add a contrast: 'I don't use my phone at the table, although my friends do, because it is rude to ignore people.'", frames: ["I don't ___, although ___, because ___."] },
            ],
          },
        },
        {
          after: "Polite sprint: how I behave and why",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a polite-behavior sentence fast and right: ask it, say no, join it with a reason, then say it about last weekend. Then talk about your own life.",
            chunks: [
              "I always knock before I come into a friend's house because it shows respect.",
              "Do you always knock before you come in? Yes, I do. / No, I don't.",
              "I don't interrupt my friends when they talk, although I often want to share my idea.",
              "Last weekend I visited my cousin, and I said thank you when his mother gave me a drink.",
              "Did you say thank you? Yes, I did. / No, I forgot because I was in a hurry.",
              "My brother doesn't wash his hands before lunch, so my mother reminds him every day.",
            ],
            recycle: ["I can't talk now because I have to study.", "Rules help us because they keep everyone safe."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, my brother." },
              { seconds: 90, say: "Real talk: ask your partner about their own habits when they visit friends or have guests. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Do or Did, X = don't, doesn't or didn't, + = join with because, although or so, T = now or last weekend, P = a new person.",
              "Say the WHOLE new sentence, with the -s of he and she in the present and the -ed in the past.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner does when they are a guest, and remember one answer to tell another pair.",
            ],
            prompts: ["I knock before I come in. (?)", "My cousin shares his snacks. (X)", "I wash my hands. (+ because)", "We visit my aunt on Sundays. (T: last Sunday)", "I say thank you. (P: she)"],
            feedback: drillFeedbackManners,
            teacherNote:
              "This lesson has no grammar slide, so the drill takes the unit's structures in advance: the present habit, the past version of the same sentence (visit / visited, say / said) and the negative with don't, doesn't and didn't. Grades 6-7 know the basic rule from earlier years, so keep it brisk and put the thinking in the reason (because, although, so). Round 3 is the point: real answers about real visits. If a student needs an irregular verb (said, gave), give it and move on.",
            tiers: [
              { level: "Support", task: "Use only ? and X and the time change, with the frames on the board.", frames: ["Do you ___?", "Last weekend I ___ed ___."] },
              { level: "Core", task: "Change every sentence with all five signs, with I, you, we and my brother." },
              { level: "Stretch", task: "Add a second clause or a contrast: 'I usually knock, but last weekend the door was open, so I called out instead.'" },
            ],
          },
        },
        {
          after: "Which animal is rude? (SB 97 D)",
          slide: {
            kind: "writing",
            title: "Being a good guest: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the linking words and the closing sentence.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences about being a good guest. Use linking words (first, also, however, for example, in conclusion) and at least one 'because'.",
              "Check: tick the checklist. Your partner underlines every verb in the present and every linking word.",
              "Teacher: look first at the topic sentence and the verbs after he, she and don't. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: being a good guest",
              text: "Being a good guest is important to me because my friends' families always make me feel welcome. First, I knock and say hello before I come in. Also, I take off my shoes and offer to help. For example, last week I visited my friend, and her mother gave me a drink, so I said thank you. However, I never use my phone at the table, although my friends sometimes do. In conclusion, polite behavior costs nothing, and it makes everyone feel happy.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Why is it important to be a good guest? Say it in one sentence." },
              { label: "First and also", prompt: "What do you do when you arrive? Add one reason." },
              { label: "Example", prompt: "Give one real example of a visit. (For example ...)" },
              { label: "However", prompt: "What do you never do, even if others do it? (However, I don't ...)" },
              { label: "Closing", prompt: "What do you want the reader to remember? (In conclusion ...)" },
            ],
            frames: ["Being a good guest is important because ___.", "First, I ___ before I ___.", "For example, last week I ___ed ___, so ___.", "However, I don't ___, although ___.", "In conclusion, ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "The verb after he, she or it has -s, and after don't it is plain (I don't use)",
              "Finished actions have -ed or the right past form (visited, said, gave)",
              "At least three linking words, for example first, also, however, because, for example",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again from your boxes, without looking at the text.",
            teacherNote:
              "A first full paragraph for grades 6-7: topic sentence, supporting details with a reason or an example, and a closing sentence. The unit's grammar is the present habit with don't and the past with a time phrase, so two of the four checks are on it. Mark only the topic sentence, the verbs and the linking words; let the student find the mistake from your dot. Listen for 'I not use my phone' and for the missing -ed in 'visited'.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them in, then add one 'because' sentence.", frames: ["First, I ___ before I ___.", "However, I don't ___ because ___."] },
              { level: "Core", task: "Write six sentences: topic, first and also, example, however, closing." },
              { level: "Stretch", task: "Write eight sentences and add a contrast with 'although' and a second example." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u10-l2": {
      objectives: [
        "I can retell a poem story with a polite and a rude character, and say the theme with a reason.",
        "I can write a full paragraph about a story and its message.",
      ],
      drop: ["Animal action chant"],
      trim: { "Polite and rude T-chart": 7, "Picture walk: what do you notice? (SB 98-99)": 5, "Show me where it says...": 6 },
      add: [
        {
          after: "Show me where it says...",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence about the poems fast and right: ask it, say no, join it with a reason, change the person or the time. Then talk about real behavior.",
            chunks: [
              "The rabbit is polite because he always says please and thank you.",
              "Does the rabbit say thank you? Yes, he does. / No, he doesn't.",
              "The monkey doesn't wait for his turn, so the other animals get angry.",
              "Although the monkey is rude, he feels sorry at the end of the poem.",
              "In the poem the animals were noisy, but they were friendly in the end.",
              "I think the writer wants us to see that kindness matters more than winning.",
            ],
            recycle: ["Rules help us because they keep everyone safe.", "At home I have to help my family."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a poem and shows a sign card, B changes it. Swap at the clap. Change the character too: the rabbit, the monkey, I, my friends." },
              { seconds: 90, say: "Real talk: ask your partner about a person they know who is very polite, or very rude. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Does, Do or Is, X = doesn't, don't or isn't, + = join with because, although, so or when, T = now or in the poem, P = a new character.",
              "Say the WHOLE new sentence, with the -s of he and she and the right form of be.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: describe someone polite or rude you know, without saying their name, and remember one answer to tell the class.",
            ],
            prompts: ["The rabbit asks first. (?)", "The monkey shares his toys. (X)", "The monkey is rude. (+ although)", "The animals are friendly. (T: in the poem)", "The rabbit says thank you. (P: my friends)"],
            feedback: drillFeedbackManners,
            teacherNote:
              "This lesson has no grammar slide, so the drill takes the unit's structures in advance: the third person -s (says, asks, takes), does / doesn't, and be. The poems are the source of the sentences, but the thinking is in the joining: because, although, so and when. Round 3 is the point: a real polite or rude person, described without a name. Keep the drill brisk; it ends before it gets boring.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Does the ___ ___?", "The ___ doesn't ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new character each time." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'The monkey is rude, although he is clever. Do you know anyone like that?'" },
            ],
          },
        },
        {
          after: "What is the theme? (the four Think boxes)",
          slide: {
            kind: "writing",
            title: "A story with a message: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the linking words and the theme in the closing sentence.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences about one poem story. Use linking words (first, also, however, for example, in conclusion) and at least one 'because'.",
              "Check: tick the checklist. Your partner underlines every -s on a verb and every linking word.",
              "Teacher: look first at the topic sentence and the -s on the verbs. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: the rabbit and the monkey",
              text: "In the poem about the rabbit and the monkey, the writer shows why politeness matters. The rabbit is polite because he always says please and thank you. For example, he asks before he takes a turn. However, the monkey is rude, so he shouts and grabs the toys. In the end, the other animals walk away from the monkey, but they play happily with the rabbit. In conclusion, the theme is that kindness makes friends, and rudeness loses them.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which poem is it, and what does the writer want us to think about?" },
              { label: "The polite character", prompt: "What does he or she do? Add a reason and an example." },
              { label: "The rude character", prompt: "What does he or she do? (However ...)" },
              { label: "What happens", prompt: "What happens in the end? Who plays with who?" },
              { label: "Theme", prompt: "What is the theme, and do you agree? (In conclusion ...)" },
            ],
            frames: ["In the poem about ___, the writer shows ___.", "The ___ is polite because ___.", "However, the ___ is rude, so ___.", "In the end, ___.", "In conclusion, the theme is that ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "The -s is on the verbs after he, she and it (says, asks, takes, shouts)",
              "The right form of be: the rabbit is, the animals are",
              "At least three linking words, for example first, also, however, because, for example",
            ],
            sayIt: "Read your paragraph to your partner. Then tell the story again from your boxes, without looking at the text.",
            teacherNote:
              "Students retell one poem as a paragraph: a topic sentence, the polite and the rude character with a reason and an example, what happens, and the theme in the closing sentence. This paragraph is also the script for the recorded talk at home. Vietnamese has no verb endings, so mark the -s on the third-person verbs, the linking words and the topic sentence. Accept a different poem or a different pair of characters: the shape matters, not the animals.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them in, then add one 'because' sentence.", frames: ["The ___ is polite because ___.", "In conclusion, the theme is that ___."] },
              { level: "Core", task: "Write six sentences: topic, polite character, rude character, ending, theme." },
              { level: "Stretch", task: "Write eight sentences and add a sentence about whether you agree with the theme, with an example from your own life." },
            ],
          },
        },
        {
          after: "Same as me, different from me",
          slide: {
            kind: "fluency",
            title: "Poem story: tell it 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 9,
            goal: "Tell the same story and its message to three partners. Each telling is shorter and smoother.",
            chunks: [
              "The rabbit is polite because he always says please and thank you, and he asks before he takes a turn.",
              "The monkey is rude, so he shouts, takes the toys and doesn't listen to the others.",
              "Although the monkey is clever, the other animals don't want to play with him.",
              "That is why everyone likes the rabbit, and I think the theme is that kindness makes friends.",
              "I agree with the writer because people who respect others usually have better friendships.",
            ],
            recycle: ["Rules help us because they keep everyone safe.", "At home I have to help my family because we live together."],
            rounds: [
              { seconds: 90, say: "Partner 1: tell the story and its theme, with a reason. The listener counts the linking words (because, so, although) on their fingers." },
              { seconds: 70, say: "New partner: the same story and theme in less time." },
              { seconds: 50, say: "New partner: fast and smooth! The listener gives one piece of feedback at the end: one thing that was clear." },
            ],
            steps: [
              "Choose one polite and one rude character from the poems. Say what each one does and why.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner.",
              "End with 'That is why ...' or 'I think the theme is ...' and give a reason for it.",
            ],
            prompts: ["(picture: a polite rabbit)", "(picture: a rude monkey)", "(picture: friends sharing)"],
            feedback: feedbackThird,
            teacherNote:
              "The same story three times, less time each, with a new listener: the 4-3-2 activity at the pace of grades 6-7. Fluency can grow without accuracy growing too, which is why the one-minute fix goes between rounds 1 and 2. Listen for the third-person -s (says, shouts, takes, asks): Vietnamese has no verb endings, so it is easy to drop. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Tell the polite character, the rude character and the theme with the frames, and look at the pictures.", frames: ["The ___ is polite. He ___.", "The ___ is rude, so he ___.", "That is why ___."] },
              { level: "Core", task: "Tell the polite character, the rude character, the ending and the theme without the board." },
              { level: "Stretch", task: "Add a contrast and your opinion: 'Although the monkey is clever, ... I agree with the writer because ...'", frames: ["Although ___, ___.", "I agree with the writer because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A story with a message",
        prompt: "Tell a short story about a polite character and a rude character. Say what each one does, what the theme is, and whether you agree with it. Give at least two reasons or examples.",
        length: "90-120 seconds",
        steps: [
          "Look at your paragraph from class. Write three key words for each part (polite, rude, theme), not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read your paragraph word for word.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for the theme?",
        ],
        maxSeconds: 180,
        kidSummary: "Tell a story with a polite and a rude character, say the theme, and support your opinion with reasons and examples.",
        words: ["polite", "rude", "respect", "theme", "although", "kindness"],
        grammar: ["The ___ is polite because he / she ___.", "Although ___, ___.", "I think the theme is ___ because ___.", "For example, ___."],
        rubric: [
          { label: "Two characters", description: "Tells what a polite character and a rude character do, with the -s on the verbs.", weight: 3 },
          { label: "Theme", description: "Says the theme clearly and says whether they agree.", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so or for example.", weight: 3 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["The ___ is polite. He ___ because ___.", "The ___ is rude. He ___.", "I think the theme is ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["The ___ is polite because ___. For example, ___.", "The ___ is rude, so ___.", "That is why ___."], tips: ["Give one reason and one example for the theme."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although ___, ___.", "I agree with the writer because ___. For example, ___."], tips: ["Give a contrast, an opinion, and a reason with an example from your own life."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u10-l3": {
      objectives: [
        "I can ask for permission with 'Can I ...?' and 'May I ...?', answer with 'you', and give a reason.",
        "I can write a full paragraph about what I ask at school and at home.",
      ],
      drop: ["Please-and-thank-you chant", "Magic yes and no: the Can I game"],
      add: [
        {
          after: "Role play: May I? Can I? (SB 101 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a permission sentence fast and right: ask it, say yes or no with YOU, give a reason, say it about yesterday. Then ask about real things.",
            chunks: [
              "Can I borrow your charger, please? Yes, you can, but please give it back before lunch.",
              "May I leave the room early? Yes, you may. / No, you may not, because we have a test.",
              "I can't come to the park today because I have to finish my project.",
              "Yesterday I asked my teacher, 'May I leave early?', and she said yes because I was ill.",
              "Can I sit with you at lunch? Of course you can! / I'm sorry, you can't. This seat is taken.",
              "May I ask a question now, or should I wait until you finish?",
            ],
            recycle: ["Whose jacket is this? It's mine.", "That book is hers, and these pens are ours."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, my sister." },
              { seconds: 90, say: "Real talk: ask your partner for permission to use or borrow something real (a pen, a charger, a seat), and say yes or no with a reason. Then swap." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it with Can I or May I, X = say no with a reason, + = join with because, although or so, T = say what happened yesterday, P = a new person.",
              "Say the WHOLE new sentence. The answer to 'Can I ...?' starts with YOU.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: ask for something you really need, and remember one answer to tell the class.",
            ],
            prompts: ["I can borrow your pen. (?)", "You can use my phone. (X + because)", "I may leave early. (?)", "She asks, 'May I come in?' (T: yesterday)", "I can't come because I have homework. (P: we)"],
            feedback: drillFeedbackCanMay,
            teacherNote:
              "A drill only helps when the last step is real: round 3 has students ask for things they really need, so the form is used for meaning. Grades 6-7 can take the full set: questions, answers with YOU, negatives with a reason, and the past report. The big trap is the answer: the student asked 'I', so the answer is 'YOU'. Say 'may' for teacher and adult voices, 'can' for friends, and let students swap voices. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with Can I and May I, with the frames on the board.", frames: ["Can I ___, please?", "Yes, you can. / No, you can't because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, with I, you, we and my sister." },
              { level: "Stretch", task: "Add a second clause or a follow-up question: 'May I leave early? No, you may not, because we have a test, but you may leave after class. Is that OK?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Question chain: asking permission",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next student. Keep the chain going with no stops!",
            chunks: [
              "Can I borrow your notes, please? Yes, you can, but I need them back tomorrow.",
              "May I go to the library after class? Yes, you may, if you finish your work.",
              "Can I sit next to you? I'm sorry, you can't. My friend is coming.",
              "May I use your phone to call my mother? Yes, of course you may.",
              "Can I copy your notes? No, you can't, because it's my only copy, but you may take a photo of it.",
            ],
            recycle: ["Whose phone is this? It's mine.", "These seats are ours."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a card (a thing to ask for). Answer with a reason." },
              { seconds: 90, say: "Swap cards. Go faster, and ask a follow-up question." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Look at your card.",
              "Ask the student on your left: 'Can I ___, please?' (friend) or 'May I ___, please?' (teacher voice).",
              "They answer with YOU and a reason: 'Yes, you can, but ___.' / 'No, you can't because ___.' Then they turn and ask the next student.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            prompts: ["Can I ___, please?", "May I ___, please?", "(card: a pen, a seat, a charger, a minute to talk)"],
            feedback: feedbackCanMay,
            teacherNote:
              "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Can I ...?' and 'May I ...?' automatic. Time the whole circle and tell them; students like beating their own time. Push for a reason in every answer. The big trap is the answer: the student asked 'I', so the answer is 'YOU'. Point at the asker: 'Yes, YOU ...'.",
            tiers: [
              { level: "Support", task: "Ask with the frame on the board and answer 'Yes, you can.'", frames: ["Can I ___, please?", "Yes, you can, but ___."] },
              { level: "Core", task: "Ask and answer both ways, with a reason, without looking at the board." },
              { level: "Stretch", task: "Say no politely and offer another way: 'No, you may not, because ___, but you can ___.'", frames: ["No, you may not, because ___, but you can ___."] },
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
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two questions with their answers, and the closing sentence.",
              "Plan: write a few words in each box. Say one sentence for each box to your partner.",
              "Write: six to eight sentences. Say who you ask, what you ask, the answer and a reason. Use linking words (first, also, however, for example, in conclusion).",
              "Check: tick the checklist. Your partner checks every question mark and every answer.",
              "Teacher: look first at the plain action word after Can I / May I and the word you in the answer. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: asking first",
              text: "Asking for permission is part of life at school and at home. At school I say, 'May I leave the room, please?' to my teacher, and she usually says yes. At home, however, I say, 'Can I use the computer?' to my brother, but he often answers, 'No, you can't. It's my turn.' For example, last week I asked my mother, 'May I go to the library?', and she said, 'Yes, you may, but come home before dinner.' In conclusion, I ask first because it shows respect, and people help me when I am polite.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Why do people ask for permission? Say it in one sentence." },
              { label: "At school", prompt: "What do you ask, and who do you ask? What is the answer? (May I ...?)" },
              { label: "At home", prompt: "What do you ask, and who do you ask? What is the answer? (Can I ...?)" },
              { label: "For example", prompt: "Give one real example, with the answer and a reason." },
              { label: "Closing", prompt: "Why do you ask first? (In conclusion ...)" },
            ],
            frames: ["Asking for permission is ___ because ___.", "At school I say, 'May I ___, please?' to my ___.", "At home, however, I say, 'Can I ___?' to my ___.", "For example, last week I asked ___, and he / she said, 'Yes, you ___.'", "In conclusion, I ask first because ___."],
            checklist: [
              "Six to eight sentences, each with a capital letter and a full stop",
              "After Can I / May I comes a plain action word (play, go, sit, borrow)",
              "The answer says YOU: 'Yes, you can.' / 'No, you may not.'",
              "A question mark at the end of a question, and at least three linking words",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again from your boxes, without looking at the text.",
            teacherNote:
              "Builds on the old 'write what I ask' task: the student still writes one school question and one home question, now inside a full paragraph with the answers, an example and a reason. Point out that after 'May I' the action word has no ending ('May I play', never 'May I plays') and that the answer turns I into YOU. Mark the topic sentence, those two targets and the linking words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them in, then add one 'because' sentence.", frames: ["At school I say, 'May I ___, please?'", "At home I say, 'Can I ___?'"] },
              { level: "Core", task: "Write six sentences: topic, school, home, example, answer with a reason, closing." },
              { level: "Stretch", task: "Write eight sentences and add what you do when the answer is no, with 'although' and a second example." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u10-l4": {
      objectives: [
        "I can ask politely to use something, give a reason, and say it better the second time.",
        "I can use am, is, are, was and were correctly when I talk about people and technology.",
      ],
      drop: ["Tap, click, say: technology chant", "What is it? Mystery picture riddle"],
      add: [
        {
          after: "Ask for something in a polite way (SB 103 E, Track 2•23)",
          slide: {
            kind: "fluency",
            title: "Ask nicely, then ask again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 9,
            goal: "Do the polite asking talk, plan one minute, then do it again with a new partner, smoother and with better reasons.",
            chunks: [
              "Are you using the laptop at the moment? I need it to finish my project.",
              "Yes, I am, but I will be done in ten minutes, so please wait a little.",
              "No, I'm not. You can use it if you give it back before class.",
              "May I borrow your charger, please? My battery is almost dead.",
              "Thank you so much! I really appreciate your help.",
            ],
            recycle: ["Can I borrow your notes, please? Yes, you can.", "I knock before I come in because it shows respect."],
            rounds: [
              { seconds: 75, say: "Round 1: talk with your first partner. One of you has a device, the other asks politely and gives a reason." },
              { seconds: 75, say: "Plan quietly for a short moment, then talk with a new partner. Swap who asks. Give a better reason this time." },
              { seconds: 60, say: "New partner again. Say it smoother and faster, and end with a polite thank you." },
            ],
            steps: [
              "Hold a picture of a device (laptop, tablet, charger). Ask: 'Are you using the ___ at the moment?'",
              "Answer with a full sentence and a reason: 'Yes, I am, but I will be done in ten minutes.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "Round 3: end with 'Thank you so much! I really appreciate your help.'",
            ],
            prompts: ["(picture: laptop)", "(picture: camera)", "(picture: charger)", "(picture: headphones)"],
            feedback: feedbackBe,
            teacherNote:
              "Task repetition (Bygate): the same task again with a new partner, after a minute of planning, tends to give smoother speech and often better grammar. At grades 6-7 the second round should bring a better reason, not only a faster delivery. Listen for 'Are you use the laptop?' and 'Yes, I using' (hold up fingers: 'Are you ... using?'). The short answer 'Yes, I am' is a chunk: say it as one piece. Remind the class that 'am' goes with 'I', 'is' with one, 'are' with 'you' and more than one.",
            tiers: [
              { level: "Support", task: "Use the frames and point to the picture.", frames: ["Are you using the ___?", "Yes, I am, but we can share it."] },
              { level: "Core", task: "Ask and answer without the frames, with a reason, and say thank you." },
              { level: "Stretch", task: "Offer a deal and add your feeling: 'You can use it after I finish, and I feel more confident when I ask politely.'", frames: ["You can use it after ___.", "I feel ___ when ___."] },
            ],
          },
        },
        {
          after: "Sentence halves: who goes with which verb?",
          slide: {
            kind: "writing",
            title: "Fix the am, is, are, was and were sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Each one has at least one mistake!",
              "Find it: am, is, are, was or were.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "My friends is always polite, but my brother are not.", answer: "My friends are always polite, but my brother is not." },
              { q: "Yesterday the students was noisy, so the teacher were not happy.", answer: "Yesterday the students were noisy, so the teacher was not happy." },
              { q: "Was your parents at the school meeting last week?", answer: "Were your parents at the school meeting last week?" },
              { q: "I am not sure why he were angry, although his friends was kind to him.", answer: "I am not sure why he was angry, although his friends were kind to him." },
              { q: "There is two new phones on the table, but they isn't mine.", answer: "There are two new phones on the table, but they aren't mine." },
            ],
            checklist: ["I = am (or was)", "One person or thing = is (or was)", "More than one = are (or were)", "Is the sentence about now or before?"],
            sayIt: "Read your fixed sentences to your partner, fast.",
            teacherNote:
              "Two error types, with harder sentences than the book's: the right form of 'be' for the person, and now or before (am/is/are or was/were). Several sentences have two mistakes, so students must read the whole sentence. Fix the first one together and say the rule in one short line: 'One friend: is. Two friends: are.' The 'There is two phones' item is the common trap.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 3 with the rule on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences about thoughtful people, one with 'was' and one with 'were', each with a reason." },
            ],
          },
        },
        {
          after: "Fix the am, is, are, was and were sentences",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a sentence with am, is, are, was or were fast and right: ask it, say no, join it with a reason, say it about yesterday. Then talk about real people and technology.",
            chunks: [
              "I am nervous before a test, but my friends are always calm.",
              "Is your phone new? Yes, it is. / No, it isn't, because it was my brother's.",
              "Were you at the match yesterday? Yes, I was, and the stadium was crowded.",
              "My sister isn't careful with her things, although she is very generous.",
              "The students were noisy in the corridor, so the teacher wasn't happy.",
              "We aren't allowed to use phones in class, but we are allowed to use them at break.",
            ],
            recycle: ["Can I borrow your pen? Yes, you can.", "At school I can't run in the hall because it isn't safe."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, my friends, the teacher." },
              { seconds: 90, say: "Real talk: ask your partner about the people and technology in their life now and last year. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with am, is, are, was or were, X = isn't, aren't, wasn't or weren't, + = join with because, although, so or when, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the right form of be for the person.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner's life was like last year and how it is now, and remember one answer to tell another pair.",
            ],
            prompts: ["I am tired today. (?)", "My friends are late. (X)", "The teacher is kind. (+ because)", "We are in the library. (T: yesterday)", "I was nervous. (P: they)"],
            feedback: drillFeedbackBe,
            teacherNote:
              "The drill takes the unit's subject-verb agreement and makes it automatic. Grades 6-7 know the forms, so the errors that remain are speed errors: 'She were tired' and 'The students was noisy' appear when the student is thinking about meaning. Round 3 is the point: a real comparison of last year and now. Keep the drill brisk; it ends before it gets boring.",
            tiers: [
              { level: "Support", task: "Use only ? and X and the time change, with the frames on the board.", frames: ["Are you ___?", "I was ___ yesterday."] },
              { level: "Core", task: "Change every sentence with all five signs, with I, you, we and they." },
              { level: "Stretch", task: "Add a contrast and a follow-up question: 'My phone was old last year, but it is new now. Were you happy with your old one?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My thoughtful person",
        prompt: "Tell us about a thoughtful person you know. Say who they are, what they do, and how you feel about it. Give at least two reasons or examples, and say what you can learn from them.",
        length: "90-120 seconds",
        steps: [
          "Think of a thoughtful person. Write three key words for each part (who they are, what they do, what I learn), not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read word for word.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason and an example for why this person is thoughtful?",
        ],
        maxSeconds: 180,
        kidSummary: "Say who is thoughtful, what they do, and what you learn from them, with reasons and examples.",
        words: ["thoughtful", "generous", "respect", "polite", "although", "appreciate"],
        grammar: ["My thoughtful person is ___.", "She is ___. She ___s ___.", "Although ___, ___.", "For example, ___."],
        rubric: [
          { label: "Who and what", description: "Says who the person is and what they do that is thoughtful.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, so or for example.", weight: 3 },
          { label: "Right form of be", description: "Says is / are / was / were correctly (She is kind. They were kind.).", weight: 2 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["My thoughtful person is ___.", "He / She ___ when ___.", "I feel ___ because ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["My thoughtful person is ___. She is ___.", "She ___ when ___. For example, ___.", "That is thoughtful because ___."], tips: ["Give one reason and one example, with the -s on the verb."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Yesterday she was ___, although ___.", "I want to be thoughtful too because ___. For example, ___."], tips: ["Tell a time they were thoughtful, give a contrast, and say what you can learn."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u10-l5": {
      objectives: [
        "I can retell what Layla did and how to fix it, with reasons, faster each time.",
        "I can join sentences with because, although, when, so and if.",
      ],
      drop: ["Rules rap and freeze"],
      trim: { "Act it out in groups of nine": 10, "Make the poster, then tell the class one rule (SB 105 B, C)": 10, "Gallery walk: say one thing about each poster (SB 105 D)": 6 },
      add: [
        {
          after: "How would you fix it? Layla's chart",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change a sentence about Layla's day fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about real situations.",
            chunks: [
              "Layla was rude because she didn't wait for her turn.",
              "Did Layla follow the rule? No, she didn't, so her friends were upset.",
              "She should ask first, and she can apologize when she makes a mistake.",
              "Although Layla was embarrassed, she said sorry and asked, 'May I try again?'",
              "Can everyone follow the rules? Yes, they can, if they think about others.",
              "If people are polite, they get along better because everyone feels respected.",
            ],
            recycle: ["Can I borrow your pen? Yes, you can.", "My friends are always polite."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about Layla and shows a sign card, B changes it. Swap at the clap. Change the person too: Layla, I, we, my friends." },
              { seconds: 90, say: "Real talk: ask your partner about a time they were embarrassed and how they fixed it. Answer in full, give a reason and ask a follow-up question." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = a question with Did, Can or Should, X = didn't, can't or shouldn't, + = join with because, although, so or if, T = now or yesterday, P = a new person.",
              "Say the WHOLE new sentence, with the plain verb after did, can and should.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: tell your partner about a real mistake and how you fixed it, and remember one answer to tell the class.",
            ],
            prompts: ["Layla waited for her turn. (X)", "Layla was rude. (+ because)", "Layla should ask first. (?)", "She said sorry. (P: we)", "She apologizes. (T: yesterday)"],
            feedback: drillFeedbackStory,
            teacherNote:
              "This lesson has no grammar slide, so the drill takes the unit's structures together: Can I / May I, be in the past, did / didn't and should. The story is the source of the sentences, but the thinking is in the joining: if, although, because and so. Round 3 is the point: a real mistake and how it was fixed. Keep the drill short and brisk because the retell that follows needs the students' energy.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Did Layla ___?", "Layla didn't ___."] },
              { level: "Core", task: "Change every sentence with all five signs and a new person each time." },
              { level: "Stretch", task: "Add a contrast and advice: 'Although Layla was embarrassed, she apologized. What should you do when you make a mistake?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Layla's day: retell and fix it",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Retell what Layla did, what she should do, and what you think about it. Each telling is shorter.",
            chunks: [
              "Layla was rude because she didn't follow the rule, and her friends were upset.",
              "She should say sorry, and she can ask first next time.",
              "Although she was embarrassed, she asked, 'May I try again?'",
              "It is important to be polite because it helps people get along and feel respected.",
              "I think Layla learned something because she changed her behavior at the end.",
            ],
            recycle: ["May I use it, please? Yes, you may.", "Always say please. Don't push."],
            rounds: [
              { seconds: 90, say: "Tell your partner what Layla did, how to fix it and what you think. Use the chart." },
              { seconds: 70, say: "New partner. Tell it again in less time, with the same reasons." },
              { seconds: 50, say: "New partner. Tell it fast and smooth! The listener gives one thing that was clear." },
            ],
            steps: [
              "Look at Layla's chart. Choose one thing she did that was rude.",
              "Say: what she did, what she should do, what she can do next time, and what you think.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "The listener says one thing that was clear and one thing to improve.",
            ],
            prompts: ["(chart: what Layla did in picture 1)", "(chart: what Layla did in picture 3)", "(chart: what Layla did in picture 5)"],
            feedback: feedbackRetell,
            teacherNote:
              "Retelling the same events three times, shorter each time, frees the student from searching for words, so speech gets faster and smoother. The one-minute fix between round 1 and 2 is what carries accuracy: without it students get faster at their mistakes. Listen for the third-person -s on 'helps' and for 'was' (students say 'Layla rude'). Push for the opinion at the end: it is what makes this a talk and not a list.",
            tiers: [
              { level: "Support", task: "Use the chart and the frames to say three sentences.", frames: ["Layla ___ because ___.", "She should ___.", "It is important to ___ because ___."] },
              { level: "Core", task: "Retell all three parts and give your opinion without the frames." },
              { level: "Stretch", task: "Add a contrast and a personal example: 'Although mistakes are normal, ... Last week I ...'", frames: ["Although ___, ___.", "Last week I ___, so ___."] },
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
            minutes: 6,
            steps: [
              "Read the short sentences.",
              "Make ONE sentence with the joining word or words in brackets. Say it first, then write it.",
              "Read your sentence to your partner. Is the comma in the right place?",
            ],
            items: [
              { q: "People feel respected. They are polite to each other. (when)", answer: "People feel respected when they are polite to each other." },
              { q: "Layla was embarrassed. She apologized to her friends. (although)", answer: "Although Layla was embarrassed, she apologized to her friends." },
              { q: "I wanted to use my friend's laptop. I asked first. I said thank you. (so, and)", answer: "I wanted to use my friend's laptop, so I asked first and said thank you." },
              { q: "Our class rules are simple. Some students forget them. They are in a hurry. (but, because)", answer: "Our class rules are simple, but some students forget them because they are in a hurry." },
              { q: "Be polite to everyone. You will get along better. (if)", answer: "If you are polite to everyone, you will get along better." },
            ],
            checklist: ["One sentence, not two or three", "The joining word is there (when, although, so, and, but, because, if)", "The comma is in the right place and there is a full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking, then say it once more, faster.",
            teacherNote:
              "Sentence combining teaches joining words through use, not rules. Model the first item aloud, crossing out the repeated words. Check the comma after an opening 'although' or 'if' clause, and the plain verb in 'when they are polite' (students sometimes write 'when they polite'). Use students' own rule poster ideas where you can: 'because' gives the reason for a rule.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the teacher." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write one sentence of your own with three clauses about class rules, for your partner to check." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u10-l6": {
      objectives: [
        "I can ask for permission with 'Can I ...?' and 'May I ...?' and answer with 'you', fast and right, with a reason.",
        "I can find and fix mistakes in notes about asking.",
      ],
      drop: ["Remember it!", "The Gatekeeper's steps: ask and move", "Knock, freeze and ask"],
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 8,
            goal: "Change a permission sentence fast and right: ask it, say yes or no with YOU, give a reason, say it about last week. Then ask about real things.",
            chunks: [
              "Can I use your phone to call my mother? Yes, you can, but please keep it short.",
              "May I speak to you after class? Of course you may. Come to my office at noon.",
              "No, you can't copy my homework because you won't learn anything.",
              "Last week I asked my teacher, 'May I hand in my project tomorrow?', and she said yes because I was ill.",
              "Can you ask first? Yes, I can, although I sometimes forget when I'm excited.",
              "My friends and I may use the gym at lunch, but we may not stay after five.",
            ],
            recycle: ["Whose bag is this? It's mine.", "She was kind. They were kind."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, my sister." },
              { seconds: 90, say: "Real talk: ask your partner for permission to do something real (a break, a seat, a minute to talk), and say yes or no with a reason. Then swap." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it with Can or May, X = say no with a reason, + = join with because, although, so or but, T = say what happened last week, P = a new person.",
              "Say the WHOLE new sentence. The answer to 'Can I ...?' starts with YOU, but the answer to 'Can you ...?' starts with I.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 3 the drill becomes real: ask for something you really want, and remember one answer to tell the class.",
            ],
            prompts: ["I can use your phone. (?)", "You can copy my homework. (X + because)", "May I speak to you? (T: last week)", "I can ask first. (P: they)", "We may use the gym. (X)"],
            feedback: drillFeedbackCanMay,
            teacherNote:
              "The drill puts the whole unit's grammar in one place and finishes with real talk. The answer is the trap: 'Can I ...?' gets 'you', and 'Can you ...?' gets 'I', so ask a few of both. Grades 6-7 already know can; the new thing is the polite may and the habit of giving a reason. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with Can I and May I, with the frames on the board.", frames: ["Can I ___, please?", "Yes, you can. / No, you can't because ___."] },
              { level: "Core", task: "Change every sentence with all five signs, with I, you, we and my sister." },
              { level: "Stretch", task: "Add a second clause or a follow-up question: 'May I leave early? No, you may not, because we have a test, but you may leave after. Is that fair?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Can I? May I?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right, with a reason: this unit's and last unit's.",
            chunks: [
              "May I have a few more minutes, please? I'm not finished yet.",
              "Can I sit next to you? Yes, you can, but please don't talk during the test.",
              "Can I open the window, please? No, you may not. It is cold today.",
              "May I borrow your dictionary? Yes, you may. Please give it back after class.",
            ],
            recycle: ["Whose bag is this? It's mine.", "She was kind. They were kind."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card, the class says the sentence with its reason." },
              { seconds: 90, say: "Half the class asks, the other half answers with YOU and a reason. Then swap." },
              { seconds: 90, say: "Champion round: one student at a time, as fast as you can, with a new reason each time!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on to round 2.",
            ],
            feedback: feedbackCanMay,
            teacherNote:
              "A quick, high-energy recall of Unit 9 and Unit 10 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. The answer is 'you': point at the asker each time. Ask for a new reason every round so the sentences do not become a recited list.",
            tiers: [
              { level: "Support", task: "Say the sentence with the card in your hand.", frames: ["May I ___, please?", "Yes, you may, but ___."] },
              { level: "Core", task: "Say the sentence when the card flips, with a reason, without help." },
              { level: "Stretch", task: "Say no politely with a reason and an offer: 'No, you may not. It is cold today, but you can open the door.'" },
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
            minutes: 6,
            steps: [
              "A student wrote notes about asking, but made mistakes!",
              "Read each note with your partner and find the mistakes. Some notes have two.",
              "Write it the right way and read it to the teacher.",
            ],
            items: [
              { q: "I can use your pen? I forgot mine at home.", answer: "Can I use your pen? I forgot mine at home." },
              { q: "May I borrows your dictionary, please?", answer: "May I borrow your dictionary, please?" },
              { q: "Can I leave early? Yes, I can. (answer to Can I leave early?)", answer: "Yes, you can." },
              { q: "No, you mayn't use the computer room because it is closed.", answer: "No, you may not use the computer room because it is closed." },
              { q: "Yesterday I asked my teacher, 'Can I going home early?' and she said, 'No, I can't.'", answer: "Yesterday I asked my teacher, 'Can I go home early?' and she said, 'No, you can't.'" },
            ],
            checklist: ["The question starts with Can or May", "After Can I / May I the action word has no ending", "The answer says YOU", "May not, not mayn't"],
            sayIt: "Say all five fixed notes to your partner, fast.",
            teacherNote:
              "Four error types, each with a one-line rule. The 'Yes, I can' mistake is the hardest for this class: it is correct English in another question ('Can you swim?'), so explain that the answer turns the 'I' into 'you'. The last item has two mistakes, so students have to read the whole sentence.",
            tiers: [
              { level: "Support", task: "Fix notes 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all five notes." },
              { level: "Stretch", task: "Write a new note with two mistakes for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Why I ask first",
        prompt: "Describe three situations where you ask for permission, at school, at home or with friends. Say who you ask, how you ask (Can I or May I), what the answer is, and why asking first matters. Give at least two reasons or examples.",
        length: "90-120 seconds",
        steps: [
          "Choose three situations: a school one, a home one and one with friends. Write three key words for each, not full sentences.",
          "Practice twice with a timer. Aim for 90 to 120 seconds, and do not read word for word.",
          "Record it once. Look at the camera and speak clearly.",
          "Before you send it, check: did you give a reason for why you ask first, and an example?",
        ],
        maxSeconds: 180,
        kidSummary: "Ask with 'May I' or 'Can I', answer with 'you', and explain why asking first matters with reasons and examples.",
        words: ["please", "thank you", "borrow", "permission", "respect", "polite"],
        grammar: ["Can I ___? / May I ___?", "Yes, you can / may. No, you can't / may not.", "I ask first because ___.", "For example, ___."],
        rubric: [
          { label: "Questions", description: "Asks 'Can I ___?' or 'May I ___?' with a plain action word (not 'Can I plays').", weight: 3 },
          { label: "Answers with you", description: "Says 'Yes, you can.' or 'No, you may not.' (not 'Yes, I can.').", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples for why asking first matters, with because, so or for example.", weight: 3 },
          { label: "Keeps going", description: "Talks for 90-120 seconds without long stops, in whole sentences.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["May I ___, please?", "Yes, you may. Thank you!", "I ask first because ___."], tips: ["Keep your key words in front of you and look at them, not at a script."] },
          { level: "Core", who: "Most students", frames: ["Can I ___? Yes, you can, but ___.", "May I ___, please? No, you may not. It is ___.", "For example, ___."], tips: ["Give one reason and one example for why you ask first."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["At school I say 'May I ___?' but with my friends I say 'Can I ___?'", "Although ___, I ask first because ___."], tips: ["Compare who you say 'may' to and who you say 'can' to, and give a reason with an example."] },
        ],
      },
    },
  },
};
