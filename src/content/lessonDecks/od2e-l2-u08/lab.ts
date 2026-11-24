import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 8 "Take Away and
// Let Go" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio Grade 6:
// students in grades 6-7 (ages 11-13) working on a book written for younger children, so
// the Lab raises the language, the topics and the length. Every lesson gets a grammar drill
// (the lesson's structure changed fast: asked, said in the negative, joined with because,
// although, so and when, moved to another time or person, then used for real talk about the
// students' own lives), one more fluency routine with longer phrases, and a writing routine:
// a planned paragraph in half the lessons, harder sentence work in the others. Three lessons
// end with a recorded talk of 90-120 seconds that students record on their own. Time comes
// from games pitched at younger children and from repeats, never from the book pages or the
// grammar. All text is original.

const fixPast =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Students who then say it again use the fixed form. For grammar, prompt the student to fix it: start the phrase and pause ('Did he ...?' and wait for the plain verb), point to the frame, or hold up a finger for the missing word. Do not say it for them. Typical slips: 'He eated', 'Did he went?', 'He didn't stole', 'Yesterday I go'. For a sound, say it right and let them echo it. Say the final sounds of took, hid, sold and didn't clearly yourself: students copy what they hear.";

const fixPlace =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Between rounds 1 and 2, stop for one minute and fix them on the board together. For grammar, prompt the student to fix it: point to the frame, or start the sentence and pause ('Where is the monkey? He ...'), or hold up a finger for the missing word. Do not say it for them. Typical slips: 'He hiding' (the is is missing: 'He is hiding'), 'Does she bakes?' and a dropped final -s in 'bakes' and 'stirs'. For a sound, say it right and let them echo it. Say every final -s clearly yourself.";

const fixRetell =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them. Students who then tell it again use the fixed form. For grammar, prompt the student to fix it: start the sentence and pause ('He ...'), point to the frame ('In the beginning, ...'), or hold up a finger for the missing -s or the missing 'is'. Do not say it for them. Typical slips: 'He want one more', 'He greedy', 'He cannot let go because he want', and a telling that jumps between the present and the past. For a sound, say it right and let them echo it. Say every final -s clearly yourself: students copy what they hear.";

const drillRounds = (a: string, b: string, c: string) => [
  { seconds: 60, say: a },
  { seconds: 90, say: b },
  { seconds: 90, say: c },
];

export const odL2U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u08-l1": {
      objectives: ["I can ask for things politely and say where someone is, in longer sentences with because and although, without stopping."],
      trim: { "Mystery bag: what do you notice?": 5 },
      drop: ["Bandar says: act the words", "Chant: Monkey in the town"],
      add: [
        {
          after: "Role play: the bakery and the kitchen",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say no, join it with because or although, move it to another time or person. Then talk about your own life.",
            chunks: [
              "The cook stirs the soup every morning.",
              "Does the cook stir the soup? Yes, she does. / No, she doesn't.",
              "She doesn't burn the soup, although the pot is very hot.",
              "She is baking a cake today because it is her friend's birthday.",
              "Where is the monkey hiding? He is hiding behind the market stall.",
              "I bake with my cousin at weekends, so our kitchen always smells great.",
            ],
            recycle: ["Can I have a muffin, please?", "Ten take away three is seven."],
            rounds: drillRounds(
              "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use two signs together, for example X + (no, and add a reason).",
              "Real talk: ask your partner about their own kitchen, cooking and weekends. Answer with a short answer and one more sentence with because or although.",
            ),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it with Does or Do, X = say it with doesn't or don't, + = join with because, although, so or when, T = change the time (every day or right now), P = change the person (I, she, they).",
              "Say the WHOLE new sentence, with the -s on he / she verbs (stirs, bakes) and the is before -ing.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does she stirs?' or 'He hiding'), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner cooks, eats or does at the weekend, and remember one thing to tell the class.",
            ],
            prompts: ["The baker bakes bread. (?)", "She stirs the soup. (X)", "He is hiding. (+ because he is afraid)", "I bake a cake. (T: right now)", "She bakes a cake. (P: they + X)"],
            feedback: "Prompt, do not tell: for 'Does she stirs?' hold up one finger and say 'Does she st...?'; for 'He hiding' point to the frame 'He is ___ing'; for a missing -s on bakes or stirs, tap your wrist; for 'Yes, she is' after a Does question, repeat it with a rising voice and let the student fix it. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has students talk about their own kitchens and weekends, so the form is used for meaning. This lesson has no grammar slide, so the drill uses the structures the lesson already practised: present simple with -s, present continuous (He is hiding) and requests. Students in grades 6-7 can take the full set at speed, with two signs at once. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one sign at a time, with the frames on the board.", frames: ["Does she ___? Yes, she does. / No, she doesn't.", "She doesn't ___ because ___."] },
              { level: "Core", task: "Use every sign, change the person and the time, and join two ideas with because or although." },
              { level: "Stretch", task: "Use two signs together and add a follow-up question: 'She doesn't bake at night, although she likes it. Does your mother bake? What does she make?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Bakery sprint: ask, give, find",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole long sentence, fast and smooth, with no stops, and ask a question back.",
            chunks: [
              "Can I have a muffin and a glass of milk, please? I'm starving.",
              "Here you are. That's six dollars, although the muffins are quite small.",
              "Where is the monkey? He is hiding behind the stall because he took a cake.",
              "The cook stirs the soup while her brother bakes bread for the market.",
              "She bakes a big cake every Friday because her whole class loves it.",
            ],
            recycle: ["I'd like three, please.", "Ten take away four is six."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole long sentence." },
              { seconds: 90, say: "Pairs: one shows a card, the other says the sentence and adds a reason with because or although. Swap when you hear the clap." },
              { seconds: 90, say: "Faster! New partner. Say the sentence, then ask one question back: 'What about you?'" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence with a reason, not one word.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers and try to beat your own number.",
              "Teacher: after round 3, put two mistakes you heard on the board (no names) and the class fixes them in one minute.",
            ],
            prompts: ["(card: a muffin and milk)", "(card: the monkey behind a tree)", "(card: a baker with a cake)", "(card: a cook with a pot)", "(card: a customer and a baker)"],
            feedback: fixPlace,
            teacherNote: "Whole sentences only, never single words: 'He is hiding' must come out as one smooth piece, now with a reason attached. Every few turns, show a Unit 7 card (a take-away picture) so last unit's phrases stay fast. Listen for the missing 'is' ('He hiding') and the dropped -s in 'bakes' and 'stirs'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["Can I have a ___, please?", "He is hiding because ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board, with a reason." },
              { level: "Stretch", task: "Add a reply and a contrast: 'Can I have a muffin, please?' 'Here you are. Be careful, because they are still warm.'" },
            ],
          },
        },
        {
          after: "Story strips: the burned cake",
          slide: {
            kind: "writing",
            title: "Listen, remember, write: the cake",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Rule reminder: one person, one -s. 'The baker makes.' 'The cake burns.' Also watch the joining words: while, so, although.",
              "Listen to the text. Do not write yet.",
              "Listen again. Write the words you remember. Say the beginning, the middle and the end to your partner.",
              "Write the text together. Check it with the teacher's text.",
            ],
            text: { title: "The new cake", text: "On Saturday morning, a baker makes a big chocolate cake for a party. While she is waiting, she checks her phone, so the cake burns. Although she feels terrible, she bakes another one, and everybody eats it." },
            frames: ["On Saturday morning, ___.", "While she ___, ___, so ___.", "Although ___, ___."],
            checklist: ["Three parts: beginning, middle, end", "One person: the -s on makes, checks and burns", "The joining words: while, so, although", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your text to your partner, then tell the story again without looking.",
            teacherNote: "Dictogloss: read at normal speed, twice, and never write it on the board first. The students rebuild the text from memory and meaning, so they notice the -s on 'makes' and 'burns' and the joining words themselves; Vietnamese has no ending on the verb, so this is the slip to watch for. Read the final -s clearly both times.",
            tiers: [
              { level: "Support", task: "Fill in the frames with the words you remember.", frames: ["On Saturday morning, a baker ___ a cake."] },
              { level: "Core", task: "Write the whole story in three sentences with the joining words." },
              { level: "Stretch", task: "Add one more sentence with a contrast: 'The party was fun, although the first cake was a disaster.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u08-l2": {
      objectives: ["I can tell Bandar's story and give my opinion with reasons, faster each time."],
      trim: { "Read around the circle": 10, "Story map: beginning, middle, end": 9 },
      drop: ["Freeze frames: four places", "Chant and freeze: Monkey in the town"],
      add: [
        {
          after: "Story map: beginning, middle, end",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the story sentences fast and right: ask it, say no, join with because or although, change the time or the person. Then give your own opinion.",
            chunks: [
              "Bandar wants one more piece of candy.",
              "Does Bandar want to share? No, he doesn't.",
              "He doesn't share his candy, although his friends are hungry.",
              "He is hiding the candy because he is afraid of losing it.",
              "He took a lot of candy because he was bored, so he got into trouble.",
              "He cannot let go of the candy, so he stays in the trap.",
            ],
            recycle: ["In the beginning, Bandar is bored.", "Can I have a muffin, please?"],
            rounds: drillRounds(
              "Whole class: the teacher says a story sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: Bandar, his friends, I, you.",
              "Real talk: do you share your things easily? Ask your partner, answer with a short answer and one more sentence with because or although.",
            ),
            steps: [
              "Listen to the sentence from the story. Look at the sign. Change it: ? = ask it with Does or Do, X = say it with doesn't or don't, + = join with because, although, so or when, T = move it to the past or the present, P = change the person.",
              "Say the WHOLE new sentence, with the -s on he / she verbs (wants, shares) and the is before -ing.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'He want' or 'Does he shares?'), fix them together, then go on.",
              "In round 3 the story becomes your own life: when did you want something so much that you could not stop? Remember one answer to tell the class.",
            ],
            prompts: ["Bandar wants more candy. (?)", "He shares his food. (X)", "He cannot let go. (+ because he is greedy)", "He steals the candy. (T: past)", "Bandar takes the candy. (P: I + X)"],
            feedback: "Prompt, do not tell: for 'Does he wants?' hold up one finger and say 'Does he w...?'; for 'He greedy' point to the frame 'He is ___'; for a missing -s on wants or shares, tap your wrist; for a present sentence that jumps into the past, say 'Now or then?' and let the student choose. Say the -s and the n't clearly yourself.",
            teacherNote: "The fable's own sentences are the drill, so students hear the new form in words they already know. Round 3 makes it real: they talk about wanting more, sharing and letting go in their own lives. Students in grades 6-7 can take the full set: questions, short answers, negatives, a joined sentence, a change of time and a change of person. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with Bandar and he, with the frames on the board.", frames: ["Does he ___? Yes, he does. / No, he doesn't.", "He doesn't ___."] },
              { level: "Core", task: "Change every sentence, with every sign and every person, and join two ideas with because or although." },
              { level: "Stretch", task: "Use two signs together and add a second clause or a follow-up question: 'He doesn't share, although he has plenty, so his friends stay hungry. Would you share? Why?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Bandar retell: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times (about 70, 55 and 40 seconds). Each time is shorter, smoother and faster.",
            chunks: [
              "In the beginning, Bandar is bored, so he wants something exciting to do.",
              "He wants one more piece of candy, although he already has plenty.",
              "In the middle, he goes to town and steals things because nobody is watching.",
              "At the end, he cannot let go of the candy, and that is why he gets into trouble.",
              "He is greedy, so in my opinion he learns his lesson too late.",
            ],
            recycle: ["Ten take away three is seven.", "There are four left."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A tells the story with the story map, then Partner B. Then change partners." },
              { seconds: 55, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "In every round, Partner A tells the story, then Partner B tells it. Point to the beginning, the middle and the end on your story map as you speak.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings at the end of a round, find a new partner.",
              "The listener has a job: ask one question at the end: 'Why can't he let go?' or 'What would you do?'",
            ],
            prompts: ["(map: the beginning)", "(map: the middle)", "(map: the end)"],
            feedback: fixRetell,
            teacherNote: "The same story three times on purpose: the second and third tellings free students to speak faster because they are not searching for words. Retelling builds fluency but not accuracy on its own, so the one-minute fix between rounds 1 and 2 matters most. Listen for the missing 'is' ('He greedy') and the missing -s on 'goes', 'wants' and 'steals'. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture on your map and say one sentence for it.", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames, with a reason for each." },
              { level: "Stretch", task: "Add your opinion and a contrast: 'Bandar is greedy, although he has plenty. In my opinion, he should share because he has friends.'" },
            ],
          },
        },
        {
          after: "Why couldn't he let go?",
          slide: {
            kind: "writing",
            title: "Bandar's story: plan, write, check",
            routine: "paragraph",
            genre: "story summary with opinion",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the example and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use the linking words from the list.",
              "Check: tick the checklist. Swap with a partner: they underline one -s on a he-verb and one linking word, and tell you one thing they agree with.",
              "Teacher: while they write, look only at the -s on he-verbs and the linking words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Bandar",
              text: "In the story, Bandar the monkey wants one more piece of candy and cannot let go. First, he is bored, so he goes to town and takes a lot of sweets. Also, he never shares with anyone, although his friends are hungry. However, he still wants more, and that is why he gets into trouble. For example, he could drop one piece and walk away, but he refuses. In my opinion, he is not smart because greed leaves him with nothing. In conclusion, the story teaches us to share.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who is Bandar and what is his problem? Write it in one sentence." },
              { label: "Detail 1", prompt: "What does he do first? Why does he do it? Use First, ... because ..." },
              { label: "Detail 2", prompt: "What else does he do or not do? Add a contrast with although or however." },
              { label: "Example and opinion", prompt: "Give one example of what he could do instead. What do you think of him, and why?" },
              { label: "Closing", prompt: "What is the lesson? Start with In conclusion, ..." },
            ],
            frames: ["In the story, Bandar ___ and cannot ___.", "First, he ___, so he ___.", "Also, he ___, although ___.", "For example, he could ___, but he ___.", "In my opinion, ___ because ___. In conclusion, ___."],
            checklist: [
              "A topic sentence, details with reasons, an example and a closing sentence",
              "He wants, he goes, he steals: the -s is there",
              "Linking words: first, also, however, because, for example, in conclusion",
              "A capital letter at the start and a full stop at the end of every sentence",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute, and add one more reason.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Model the plan aloud first. Mark only two things: the -s on he-verbs (wants, goes, steals; Vietnamese has no ending on the verb) and the linking words. Let the student find the mistake from your dot. The paragraph is also the script for the recorded talk 'Bandar's story and what I think': students can read it three times, then tell it without looking.",
            tiers: [
              { level: "Support", task: "Use the five frames: one sentence for each box, with a word or two of your own.", frames: ["In the story, Bandar ___ and cannot ___.", "In conclusion, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences with three linking words." },
              { level: "Stretch", task: "Write eight sentences and add a counter-argument: 'Some people say he is just hungry. However, ...'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Bandar's story and what I think",
        prompt: "Tell the story of Bandar the monkey in three parts: the beginning, the middle and the end. Then say what you think about his choice and give two reasons or examples.",
        length: "90-120 seconds",
        steps: [
          "Look at your paragraph and story map from class. Underline the linking words you want to use.",
          "Say your talk three times to your phone, a mirror or a friend. Each time say it a little faster and with fewer stops.",
          "Record it once. Look at the camera and speak clearly, with the three parts and your opinion.",
          "Watch it once. Write down one thing you did well and one thing to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the beginning, the middle and the end, say what you think of Bandar, and give reasons and examples. Keep talking without long stops.",
        words: ["greedy", "candy", "let go", "share", "however", "for example", "in my opinion"],
        grammar: ["In the beginning / In the middle / At the end", "He wants ___, although ___. He cannot ___ because ___.", "In my opinion, ___ because ___."],
        rubric: [
          { label: "Three parts", description: "Tells the beginning, the middle and the end of the story.", weight: 3 },
          { label: "Reasons and examples", description: "Gives an opinion with at least two reasons or examples (because, for example).", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s on 'wants', 'goes' and 'steals' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["In the beginning, ___.", "In the middle, ___.", "At the end, ___. In my opinion, ___ because ___."], tips: ["Look at your paragraph for the first read-through, then say it from memory."] },
          { level: "Core", who: "Most students", frames: ["In the beginning, Bandar is ___, so ___.", "In the middle, he goes to ___ and ___.", "At the end, he cannot ___ because ___. For example, ___."], tips: ["Say who, what and why in every part."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Some people say ___. However, I think ___ because ___.", "In conclusion, the lesson is ___."], tips: ["Give a counter-argument and end with the lesson."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u08-l3": {
      objectives: ["I can ask and answer about yesterday in longer sentences: 'Did you ___ yesterday? Yes, I did. I ___ because ___.'"],
      trim: { "Which go together? Sort the verbs": 6 },
      drop: ["Yesterday chant", "Circle game: what did he do with the cookies?"],
      add: [
        {
          after: "Follow the lines: ask your partner (SB 81 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with Did, say no with didn't, join it with because or although, change the person or the time. Then talk about your real yesterday.",
            chunks: [
              "Yesterday evening I went to the shop because we needed milk.",
              "Did you go to the shop yesterday? Yes, I did. / No, I didn't.",
              "I didn't do my homework before dinner, although I had plenty of time.",
              "What did you do after school? I met my friends and we played football.",
              "How many cookies did he take? He took six, so there were only four left.",
              "My sister didn't eat breakfast, so she was hungry before lunch.",
            ],
            recycle: ["Ten take away three is seven.", "He is hiding behind the stall."],
            rounds: drillRounds(
              "Whole class: the teacher says a sentence about yesterday and shows a sign (? = ask it with Did, X = say no with didn't, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person: I, you, he, she, we, they. Use two signs together.",
              "Real talk: ask your partner about their real yesterday: school, friends, food, phones, sport. Answer with a short answer and one more sentence with because or although.",
            ),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Did + person + plain verb, X = didn't + plain verb, + = join with because, although, so or when, T = now or yesterday, P = change the person.",
              "Say the WHOLE new sentence. After Did and didn't the verb is plain (go, eat, take); without them use the yesterday word (went, ate, took).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Did you went?' or 'He didn't took'), fix them together, then go on.",
              "In round 3 ask about real things: what did you do yesterday and why? Remember one answer to tell the class.",
            ],
            prompts: ["I went to the park. (?)", "She ate lunch. (X)", "They played football. (+ although it was raining)", "We buy bread. (T: yesterday)", "I took a book. (P: he + X)"],
            feedback: "Prompt, do not tell: for 'Did you went?' hold up one finger and say 'Did you ...?' and wait for the plain verb; for 'He didn't took' say 'After didn't, plain or yesterday?'; for 'I eated' repeat it with a rising voice and let the student fix it; for 'Yes, I do' point to the frame 'Yes, I did'. Say the final sounds of took, ate and didn't clearly yourself.",
            teacherNote: "This is the unit's main grammar (SB 81), so the drill follows the practice slide. A drill only helps when the last step is real: round 3 has students tell each other what they really did yesterday, so Did and didn't are used for meaning. Students in grades 6-7 can take the full set at speed: questions, short answers, negatives, joined sentences, a change of time and of person.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I, you and he, with the frames on the board.", frames: ["Did you ___? Yes, I did. / No, I didn't.", "I didn't ___ because ___."] },
              { level: "Core", task: "Use every sign and every person, and join two ideas with because, although or so." },
              { level: "Stretch", task: "Use two signs together and add a follow-up question: 'I didn't call him, although I had time, so he was worried. Did you talk to your friend? What did you say?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Question chain: Did you ___ yesterday?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Did you go to the park after school? Yes, I did. I went there because it was sunny.",
              "No, I didn't. I stayed at home because I had a lot of homework.",
              "What did you eat for dinner? I ate noodles with my cousin.",
              "Did you see your friends, or did you play online?",
              "Why didn't you call me? I didn't call you because my phone was dead.",
            ],
            recycle: ["I saw a cat, but I didn't see a dog.", "I bought some bread."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a card (park, shop, noodles, homework, friends)." },
              { seconds: 90, say: "Swap cards. Go faster, and give a reason with because every time!" },
              { seconds: 90, say: "Swap again. Can the chain go all the way round before the bell? Add a follow-up question." },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Did you ___ yesterday?'",
              "They answer with a short answer and a reason: 'Yes, I did. I ___ because ___.' or 'No, I didn't. I ___.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Did you ___ yesterday?", "What did you ___?", "Why didn't you ___?"],
            feedback: fixPast,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Did you + plain verb' automatic. Time the whole circle and tell them; students like to beat their own time. Watch for 'Did you went?' and 'Yes, I do': prompt with a raised finger and 'Did you ...?' and wait.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I did.' or 'No, I didn't.' and pass the question on with the frame on the board.", frames: ["Did you ___?", "Yes, I did. / No, I didn't."] },
              { level: "Core", task: "Ask and answer without looking at the board, and give a reason with because." },
              { level: "Stretch", task: "Add a second thing and a contrast: 'I went to the park and I ate an ice cream, although it was cold.'" },
            ],
          },
        },
        {
          after: "Mini-quiz: your yesterday",
          slide: {
            kind: "writing",
            title: "My yesterday: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the example and the closing sentence.",
              "Plan: fill the boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use the linking words from the list.",
              "Check: tick the checklist. Swap with a partner: they underline one yesterday word and one didn't, and tell you one thing they want to ask you.",
              "Teacher: while they write, look only at the verb after didn't and the yesterday words. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Yesterday",
              text: "Yesterday was a busy but enjoyable day. First, I went to school and took a maths test, although I didn't study much. Also, I met my friends after school because we wanted to play football. For example, we played for an hour in the park, and I scored two goals. However, I didn't do my homework until nine o'clock, so I was tired. In conclusion, it was a good day, but next time I will study first.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "How was yesterday? Use Yesterday was ... and a word that says why." },
              { label: "Detail 1: First, ...", prompt: "What did you do first? Add a reason with because or a contrast with although." },
              { label: "Detail 2: Also, ...", prompt: "What else did you do? Give an example (For example, ...)." },
              { label: "Something you didn't do", prompt: "What didn't you do, and what happened because of it? Use However, ... didn't ..." },
              { label: "Closing", prompt: "How do you feel about the day? Start with In conclusion, ..." },
            ],
            frames: ["Yesterday was ___ because ___.", "First, I ___, although I didn't ___.", "Also, I ___ because ___. For example, ___.", "However, I didn't ___, so ___.", "In conclusion, ___."],
            checklist: [
              "A topic sentence, details with reasons, an example and a closing sentence",
              "Yesterday words are right: went, took, met, scored",
              "After didn't the verb is plain: didn't study, didn't do",
              "Linking words: first, also, however, because, for example, in conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Your partner asks 'Did you ...?' and you answer with a reason. Then tell it again without looking.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The linking words (because, although, however) now work inside a real paragraph about the student's own day, so the yesterday words get used again and again. Mark only two things: the plain verb after didn't ('didn't studied') and the yesterday words. Let the student find the mistake from your dot. Watch for 'eated' and 'goed'.",
            tiers: [
              { level: "Support", task: "Use the five frames: one sentence for each box, with a word or two of your own.", frames: ["Yesterday was ___ because ___.", "However, I didn't ___, so ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences with three linking words." },
              { level: "Stretch", task: "Write eight sentences and add a question to the reader at the end: 'Did you have a day like this, too?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u08-l4": {
      objectives: ["I can tell my partner about last night in detail three times, faster each time."],
      trim: { "Think: count the noses": 3, "Thirteen or thirty? Listen for the end": 3, "Crazy subtraction poem (SB 83 E)": 9 },
      drop: ["Chant: Move your body", "Ball game: say the contraction"],
      add: [
        {
          after: "Contractions: Learn and write (SB 83 F)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, say it with didn't, join it with because, although or when, change the person or the time. Then talk about your real evening.",
            chunks: [
              "Last night I stayed up late because I was watching a series.",
              "Did you stay up late? Yes, I did. / No, I didn't.",
              "I didn't do my homework when I got home, although it was due today.",
              "When my brother came home, we made noodles and ate them in front of the TV.",
              "What did your friend say? She didn't say anything, so I went to bed.",
              "My friend didn't answer my message because she was asleep.",
            ],
            recycle: ["I gave a friend two pens.", "We didn't see a dog."],
            rounds: drillRounds(
              "Whole class: the teacher says a sentence about last night and shows a sign (? = ask it, X = say it with didn't, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too, and use two signs together.",
              "Real talk: ask your partner about last night: dinner, homework, phones, sleep. Answer with a short answer and one more sentence with because or although.",
            ),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Did + person + plain verb, X = didn't + plain verb, + = join with because, although, so or when, T = last night or tonight, P = change the person.",
              "Say the WHOLE new sentence. After Did and didn't the verb is plain; with 'when' or 'because' the other part of the sentence still needs its own yesterday word.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I didn't watched' or 'When I come home yesterday'), fix them together, then go on.",
              "In round 3 ask about real things and remember one answer to tell the class.",
            ],
            prompts: ["I ate noodles. (?)", "She watched TV. (X)", "We went to bed late. (+ because we were talking)", "I stay up late. (T: last night)", "He made a card. (P: they + X)"],
            feedback: "Prompt, do not tell: for 'I didn't watched' hold up one finger and say 'I didn't ...?' and wait for the plain verb; for 'When I come home yesterday' say 'Now or then?' and let the student fix it; for 'eated' repeat it with a rising voice. Say the final sounds of made, ate and didn't clearly yourself.",
            teacherNote: "The drill follows the contractions practice (SB 83 F) so didn't has just been learned and is now used fast. Round 3 makes it real: students talk about their real evenings, so the form carries meaning. Students in grades 6-7 can take the full set; the 'when' joining adds a second yesterday word, which is where the next slip appears.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Did you ___ last night? Yes, I did. / No, I didn't.", "I didn't ___ because ___."] },
              { level: "Core", task: "Use every sign, change the person and join two ideas with because, although or when." },
              { level: "Stretch", task: "Use two signs together and add a follow-up: 'I didn't sleep well, although I was exhausted, so I felt terrible in class. What about you? Did you sleep well?'" },
            ],
          },
        },
        {
          after: "Tell your partner: last night (SB 83 Write)",
          slide: {
            kind: "fluency",
            title: "Last night talk: three partners, shorter each time",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk about last night to three partners (about 70, 55 and 40 seconds). Each talk is shorter and smoother.",
            chunks: [
              "Last night I ate noodles with my family, and then I did a little homework.",
              "Although I was tired, I didn't go to bed early because I was watching a series.",
              "I didn't use my phone after ten o'clock, so I fell asleep quickly.",
              "I made a card for my friend because it was her birthday.",
              "Did you eat noodles too, or did you eat something different?",
            ],
            recycle: ["I gave a friend two pens.", "We didn't see a dog."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A tells the talk about last night, then Partner B. The listener counts the reasons on their fingers. Then change partners." },
              { seconds: 55, say: "Round 2: new partner. Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A tells it fast and smooth, then Partner B. The listener asks one question: 'Did you ...?'" },
            ],
            steps: [
              "Stand in two lines facing each other. In every round, Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings at the end of a round, line B moves one step to the left: a new partner.",
              "Do three rounds, each a little shorter: about 70 seconds, then 55, then 40.",
            ],
            feedback: fixPast,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity made shorter for the classroom. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix is where accuracy comes in. Listen for the past forms (ate, went, made) and for 'didn't' with the plain verb.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Last night I ___.", "Then I ___ because ___.", "I didn't ___."] },
              { level: "Core", task: "Say four or five sentences without the board, with two reasons." },
              { level: "Stretch", task: "Add a contrast and a feeling: 'I didn't play games because I was tired, although I really wanted to. In the end I felt much better.'" },
            ],
          },
        },
        {
          after: "Contractions: Learn and write (SB 83 F)",
          slide: {
            kind: "writing",
            title: "Fix it: didn't and the plain verb",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong, maybe more than one thing!",
              "Find it: the apostrophe, a yesterday word, the verb after didn't, or a joining word.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "I dont eat fish last night, because I didn't liked it.", answer: "I didn't eat fish last night because I didn't like it." },
              { q: "She didn't went to school although she feeled fine.", answer: "She didn't go to school although she felt fine." },
              { q: "Last night I eated rice, then I didn't did my homework.", answer: "Last night I ate rice, and then I didn't do my homework." },
              { q: "We did'nt buy milk because the shop was close.", answer: "We didn't buy milk because the shop was closed." },
              { q: "When he comes home last night, he didn't say nothing.", answer: "When he came home last night, he didn't say anything." },
            ],
            checklist: ["The apostrophe is in the right place: didn't", "After didn't the verb is plain: go, eat, buy", "Yesterday words: ate, went, bought, felt, came"],
            sayIt: "Read your fixed sentences to the class in a clear voice, and stress the final sounds.",
            teacherNote: "Each sentence has at least two mistakes, so students must look at the whole sentence, not just the first slip. Focus on the verb after didn't and the ate / eated slip; the apostrophe and the double negative are a bonus. Fix item 1 together first and explain in one sentence: 'Did and didn't already tell us it was yesterday, so the verb stays plain.'",
            tiers: [
              { level: "Support", task: "Fix sentences 3 and 4 with the word list on the board." },
              { level: "Core", task: "Fix all five sentences, both mistakes in each." },
              { level: "Stretch", task: "Write two more sentences with two mistakes each for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My last night talk",
        prompt: "Tell us what you did last night, one thing you didn't do, and why. Give at least two reasons or examples, and say it in order: first, then, after that.",
        length: "90-120 seconds",
        steps: [
          "Think about last night: what did you eat, make or do, and what didn't you do? Note a reason for each.",
          "Say your talk three times to your phone or a mirror: each time a little faster, like in class.",
          "Record it once. Use ate, went or made, one thing with didn't, and at least two reasons with because or although.",
          "Watch it once. Write down one thing you did well and one thing to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you did last night with yesterday words, one thing you didn't do, and give reasons and examples. Keep talking without long stops.",
        words: ["last night", "ate", "went", "made", "didn't", "although", "because"],
        grammar: ["Last night I ___ (yesterday word) ___ because ___.", "I didn't ___ (plain verb) ___, although ___."],
        rubric: [
          { label: "Yesterday words", description: "Uses ate, went, made or took correctly, not 'eated' or 'goed'.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, although or for example.", weight: 3 },
          { label: "Didn't + plain verb", description: "Says one thing with 'didn't' and the plain verb: I didn't watch TV.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["Last night I ___.", "Then I ___ because ___.", "I didn't ___."], tips: ["Write three notes first and look at them as you speak."] },
          { level: "Core", who: "Most students", frames: ["Last night I ate ___ and I went to ___.", "Then I ___ because ___.", "I didn't ___, although ___."], tips: ["Say First, then, after that, and give a reason for each part."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Although ___, I ___ because ___.", "For example, ___. In the end, ___."], tips: ["Use a contrast and an example, and end with how you felt."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u08-l5": {
      objectives: ["I can tell a take-away story fast and explain it: 'They had nine. They ate four, so now there are five.'"],
      trim: { "Make the game (SB 85 B)": 16, "Switch and play (SB 85 C)": 8 },
      drop: ["Gone! The counters game", "Act it out: the picnic play"],
      add: [
        {
          after: "What did they do? Retell the picnic",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the take-away sentence fast and right: ask it, say no, join it with because or so, change the number or the person. Then talk about real numbers in your life.",
            chunks: [
              "Yesterday they bought twenty sandwiches, and they ate eight of them.",
              "Did they eat them all? No, they didn't. Twelve were left.",
              "They didn't eat the apples because everyone was full.",
              "How many sandwiches did they take? They took six, so there were fourteen left.",
              "She gave two sandwiches to a friend, although she was hungry herself.",
              "When the bird took one sandwich, nobody noticed.",
            ],
            recycle: ["Ten take away three is seven.", "There are four left."],
            rounds: drillRounds(
              "Whole class: the teacher says a take-away sentence and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person or the number). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the numbers and the things too, and use two signs together.",
              "Real talk: ask your partner about real numbers: money, phone battery, minutes, messages. 'What did you spend? How many are left?' Answer with a short answer and one more sentence.",
            ),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Did + person + plain verb, X = didn't + plain verb, + = join with because, although, so or when, T = now or yesterday, P = change the person or the number.",
              "Say the WHOLE new sentence. Say the numbers clearly: thirteen or thirty, fourteen or forty.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'ated', 'There is five' or 'Did they ate?'), fix them together, then go on.",
              "In round 3 the numbers are real: what did you have, what went away, how many are left? Remember one answer to tell the class.",
            ],
            prompts: ["They ate four. (?)", "He took two. (X)", "She gave six away. (+ so there were nine left)", "We have twelve. (T: yesterday)", "I spent five dollars. (P: they + X)"],
            feedback: "Prompt, do not tell: for 'Did they ate?' hold up one finger and say 'Did they ...?' and wait for the plain verb; for 'There is five' point to the frame 'There are ___'; for 'thirty' said for thirteen, say both numbers and let the student choose; for 'ated' repeat it with a rising voice. Say the final sounds clearly yourself.",
            teacherNote: "The take-away story gives the drill its content. Round 3 uses real numbers (money, battery, minutes), so Did, didn't and the yesterday words carry meaning. Students in grades 6-7 can take the full set at speed: questions, short answers, negatives, joined sentences, a change of time and of person or number.",
            tiers: [
              { level: "Support", task: "Use only ? and X with numbers up to twenty, with the frames on the board.", frames: ["Did they ___? Yes, they did. / No, they didn't.", "They ate ___. Now there are ___ left."] },
              { level: "Core", task: "Use every sign, change the numbers and the person, and join two ideas with because, although or so." },
              { level: "Stretch", task: "Use two signs together and add a second clause or a question: 'They didn't eat everything because they were full, so there were six left. Did they take them home?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Picnic story, again and again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same take-away story three times, a little faster each time, and explain what happened.",
            chunks: [
              "They had nine sandwiches at the picnic, but they ate four of them.",
              "Nine take away four is five, so there were five left.",
              "Then a bird took one sandwich, although nobody saw it.",
              "Did they eat them all? No, they didn't, because they were full.",
              "In the end, they gave two to a friend, and now there are two left.",
            ],
            recycle: ["There were ten stars.", "I gave two to a friend."],
            rounds: [
              { seconds: 70, say: "Tell the take-away story with counters: nine, then four go away. Give a reason for each step." },
              { seconds: 55, say: "Same story, new numbers (twenty and seven). Faster!" },
              { seconds: 55, say: "New partner. Same story, your own numbers and your own things. Say it smoothly." },
            ],
            steps: [
              "Put out the counters. Tell the story: at first, what happened and why, how many are left.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "Your partner puts the counters away as they listen. Do the counters match?",
              "Swap jobs and do it again.",
            ],
            prompts: ["(counters: 9 and 4)", "(counters: 20 and 7)", "(your own numbers)"],
            feedback: fixPast,
            teacherNote: "Task repeat: the same story with new numbers, so the language stays the same and only the content changes. Students say 'They had / They ate / So there were' as one smooth chain, now with reasons. Listen for 'ated', 'There is five' and the missing final -s. The partner who moves the counters has a real listening job.",
            tiers: [
              { level: "Support", task: "Use numbers up to twenty and the frames on the board.", frames: ["They had ___.", "They ate ___, so ___.", "Now there are ___ left."] },
              { level: "Core", task: "Use numbers up to fifty without the board, with a reason for each step." },
              { level: "Stretch", task: "Add a question, a contrast and a result: 'Did they eat them all? No, they didn't. Although they were hungry, they saved five, so they had lunch the next day.'" },
            ],
          },
        },
        {
          after: "Solve the picnic problems",
          slide: {
            kind: "writing",
            title: "The picnic story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the supporting details, the example and the closing sentence.",
              "Plan: fill the boxes with a few words and numbers each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use the linking words from the list.",
              "Check: tick the checklist. Swap with a partner: they check your numbers with counters and underline one plural -s.",
              "Teacher: while they write, look only at the plural -s (sandwiches) and the plain verb after didn't. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: The picnic",
              text: "The class picnic was a good example of how food disappears fast. At first, the students had twenty sandwiches, but they ate twelve, so there were only eight left. Also, a bird took one sandwich, although nobody saw it. However, the students didn't eat the rest because they were full. For example, they gave two sandwiches to a friend and saved five for later. In conclusion, twenty take away fifteen is five, and the picnic was a success.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What happened at the picnic? Write it in one sentence." },
              { label: "Detail 1: At first", prompt: "How many things were there? How many went away? How many were left? Why?" },
              { label: "Detail 2: Also / However", prompt: "What else happened? What did they not do? Use although or because." },
              { label: "Example", prompt: "Give one example with numbers: who got what, and how many are left?" },
              { label: "Closing", prompt: "How many are left at the end? What did you learn? Start with In conclusion, ..." },
            ],
            frames: ["The picnic was a good example of ___.", "At first, ___ had ___, but they ate ___, so there were ___ left.", "Also, ___ took ___, although ___.", "However, they didn't ___ because ___.", "In conclusion, ___."],
            checklist: [
              "A topic sentence, details with reasons, an example and a closing sentence",
              "The numbers are right: twenty take away twelve is eight",
              "Yesterday words and plain verbs: ate, took, didn't take",
              "Linking words: at first, also, however, because, for example, in conclusion",
            ],
            sayIt: "Read your story to your partner. Your partner checks the numbers with counters. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the number words and yesterday words now live in a six-sentence take-away story that the pairs retell in the speaking slide. Let students check the numbers with counters (20 - 12 = 8, 8 - 1 = 7, 7 - 2 = 5). Mark only two things: the plural -s (sandwiches) and the plain verb after didn't. Let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the five frames: one sentence for each box, with the numbers filled in.", frames: ["At first, ___ had ___, but they ate ___, so there were ___ left.", "In conclusion, ___."] },
              { level: "Core", task: "Write the whole paragraph: six or seven sentences with three linking words." },
              { level: "Stretch", task: "Write eight sentences and add a question and answer: 'Did they eat them all? No, they didn't, because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l2-u08-l6": {
      objectives: ["I can say 'Did he take it? Yes, he did.' and 'He didn't take it, although ...' fast, in longer sentences."],
      trim: { "Remember it!": 4 },
      drop: ["Muffin stall: eyes shut, eyes open", "Plain side, yesterday side: the jump"],
      add: [
        {
          after: "Before and after: the market stalls",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right with every form of the unit's grammar: ask it, say no, join it, change the time or the person. Then talk about your own market, shop or school.",
            chunks: [
              "Yesterday the baker made twenty muffins and sold twelve of them.",
              "Did she sell them all? No, she didn't. She ate one herself.",
              "She didn't sell the rest because the market closed early.",
              "What did the raccoon do with the muffin? He ate it, so there were seven left.",
              "How many muffins did the baker have? She had twenty, although she planned to make more.",
              "Did you buy anything at the market? Yes, I did. I bought a roll because I was hungry.",
            ],
            recycle: ["Ten take away three is seven.", "Did he take a muffin? Yes, he did."],
            rounds: drillRounds(
              "Whole class: the teacher says a sentence about the market and shows a sign (? = ask it, X = say no, + = join with because, although, so or when, T = change the time, P = change the person). The class says the new sentence together.",
              "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person and the number, and use two signs together.",
              "Real talk: ask your partner about a real shop, market or canteen: what did you buy, how much did you spend, what did you not buy? Answer with a short answer and one more sentence with because or although.",
            ),
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = Did + person + plain verb, X = didn't + plain verb, + = join with because, although, so or when, T = now or yesterday, P = change the person.",
              "Say the WHOLE new sentence. After Did and didn't the verb is plain (sell, eat, take); without them use the yesterday word (sold, ate, took).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Did she sold?', 'He didn't took' or 'She selled'), fix them together, then go on.",
              "In round 3 the drill is real: what did you buy this week, and why? Remember one answer to tell the class.",
            ],
            prompts: ["She sold twelve muffins. (?)", "He took a muffin. (X)", "They bought three rolls. (+ because they were hungry)", "I buy a snack. (T: yesterday)", "She made twenty. (P: they + X)"],
            feedback: "Prompt, do not tell: for 'Did she sold?' hold up one finger and say 'Did she ...?' and wait for the plain verb; for 'He didn't took' say 'After didn't, plain or yesterday?'; for 'selled' repeat it with a rising voice and let the student fix it. Say the final sounds of sold, took and didn't clearly yourself.",
            teacherNote: "This is the grammar champion drill: it follows the grammar slide, so the whole unit's forms (yesterday words, Did + plain verb, didn't, question words) are used at speed. Round 3 uses a real shop or market, so the forms carry meaning. Students in grades 6-7 can take the full set and two signs at once; keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with she, he and I, with the frames on the board.", frames: ["Did she ___? Yes, she did. / No, she didn't.", "She didn't ___ because ___."] },
              { level: "Core", task: "Use every sign and every person, and join two ideas with because, although or so." },
              { level: "Stretch", task: "Use two signs together and add a follow-up: 'She didn't sell everything, although it was a busy day, so she gave the rest away. Did you ever sell anything? What was it?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Did and didn't",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right: this unit's and last unit's, now with reasons.",
            chunks: [
              "Did he take a muffin? Yes, he did, because he was hungry.",
              "Did she sell a roll? No, she didn't, although the customer wanted one.",
              "What did he eat? He ate a muffin and a banana.",
              "How many did she sell? She sold twelve, so eight were left.",
              "He didn't go to the market because it was raining.",
            ],
            recycle: ["I saw a cat, but I didn't see a dog.", "Ten take away three is seven."],
            rounds: [
              { seconds: 90, say: "Together: the teacher flashes a card, the class says the sentence with its reason." },
              { seconds: 90, say: "Left side asks, right side answers with a reason. Then swap." },
              { seconds: 90, say: "Champion round: one student at a time, as fast as you can, with a reason every time!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Fix the two mistakes you heard most on the board; then go on.",
            ],
            feedback: fixPast,
            teacherNote: "A quick, high-energy recall of Units 7 and 8 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. This is the sprint that checks 'Did + plain verb': prompt with 'Did he ...?' and wait; do not give the verb.",
            tiers: [
              { level: "Support", task: "Use the frames on the board.", frames: ["Did he ___? Yes, he did.", "He didn't ___ because ___."] },
              { level: "Core", task: "Say the sentences without the board, with a reason." },
              { level: "Stretch", task: "Answer with extra information and a contrast: 'Yes, he did. He took two, although he said he wasn't hungry.'" },
            ],
          },
        },
        {
          after: "@grammar",
          slide: {
            kind: "writing",
            title: "Listen, remember, write: the muffins",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Rule reminder: after Did or didn't, the verb is plain. Without them, use the yesterday word: made, sold, ate. Watch the joining words: so, although, because.",
              "Listen to the text. Do not write yet.",
              "Listen again. Write the words you remember. Say the numbers to your partner.",
              "Write the text together. Check it with the teacher's text.",
            ],
            text: { title: "The muffin stall", text: "Early yesterday morning, a baker made twenty muffins before the market opened. Soon she sold twelve of them, so she felt pleased. Then she ate one, although she didn't plan to, and she didn't sell the rest because the stall closed early. Now she has seven muffins and a good story." },
            frames: ["Yesterday the ___ made ___ before ___.", "She sold ___, so ___.", "She ate ___, although ___, and she didn't ___ because ___."],
            checklist: ["Yesterday words: made, sold, ate", "After didn't the verb is plain: didn't plan, didn't sell", "The numbers are right: twenty, twelve, seven", "The joining words: so, although, because"],
            sayIt: "Read your text to your partner, then tell the take-away story again without looking.",
            teacherNote: "Read at normal speed, twice, and keep the text hidden. The students rebuild it from memory, so they have to choose between 'sold' and 'sell' themselves, which is exactly the rule from the grammar slide. Say the final -d and -s clearly: 'sold', 'has'. Check: 20 - 12 = 8, and 8 - 1 = 7, so seven are left.",
            tiers: [
              { level: "Support", task: "Fill in the frames with the words you remember." },
              { level: "Core", task: "Write the whole text in four sentences with the joining words." },
              { level: "Stretch", task: "Add a question, an answer and a reason: 'Did she sell them all? No, she didn't, because the stall closed early.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Take-away in my life",
        prompt: "Choose something real from your life that you had, used or lost: money, phone battery, minutes, messages or things at home. Say how many there were, what went away and why, and how many are left. Give two reasons or examples.",
        length: "90-120 seconds",
        steps: [
          "Choose one real example, for instance money, battery or time. Write down the numbers: at first, what went away, how many are left.",
          "Practise your take-away story three times: at first, what happened and why, how many are left.",
          "Record it once. Show the things or a screenshot as you talk, and say the numbers slowly and clearly.",
          "Watch it once. Write down one thing you did well and one thing to do better next time.",
        ],
        maxSeconds: 180,
        kidSummary: "Say how many there were, what went away with a yesterday word and why, and how many are left. Give reasons and examples, and keep talking without long stops.",
        words: ["took", "ate", "spent", "left", "take away", "didn't", "because", "although"],
        grammar: ["There were ___. I took / ate / spent ___ because ___.", "Now there are ___ left.", "I didn't ___ (plain verb) ___, although ___."],
        rubric: [
          { label: "The story", description: "Says how many at first, what went away, and how many are left.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons or examples with because, although or for example.", weight: 3 },
          { label: "Yesterday words", description: "Uses took, ate, spent or gave correctly, and the plain verb after didn't.", weight: 2 },
          { label: "Clear numbers", description: "Says the numbers clearly: thirteen or thirty, with the right ending, and keeps talking without long stops.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["There were ___.", "I took ___ because ___.", "Now there are ___ left."], tips: ["Write the numbers down first and say them slowly."] },
          { level: "Core", who: "Most students", frames: ["There were ___ ___ at first.", "I took / ate / spent ___ because ___.", "___ take away ___ is ___, so ___."], tips: ["Say the numbers slowly and clearly, and give a reason for each step."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["I didn't ___ because ___, although ___.", "For example, ___. In the end, ___."], tips: ["Add a contrast, an example and what you learned."] },
        ],
      },
    },
  },
};
