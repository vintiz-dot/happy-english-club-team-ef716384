import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 8 "The Four
// Seasons" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades
// 2-4 (ages 7-10). Every lesson gets a grammar drill (change the sentence, ask it, say it
// with don't, join it, then say real things about yourself), one more fluency routine (the
// unit's "I do / you do / I don't / Do you?" language said again and again as longer
// sentences joined with and, but and because, a little faster each round, with Unit 7's
// season phrases mixed back in) and one writing routine (say it, write it, read it back).
// Every other lesson also ends with a recorded talk for home. Time comes from warm-ups,
// games and repeats, never from the book pages or the grammar. All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds, give one minute: write them on the board and let the class fix them, then children say it again with the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, or hold up a finger for the missing word) rather than saying it for them. For a sound, just say it right and let them echo it. Say every final sound clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u08-l1": {
      objectives: ["I can say what I do in the seasons in a long sentence with and, but or because, fast."],
      drop: ["Seasons Simon Says", "Make-believe tree corner"],
      trim: { "Four seasons chant": 3, "Seasons whisper chant": 3 },
      add: [
        {
          after: "Mime and say",
          slide: {
            kind: "fluency",
            title: "Season sprint: I build, I make, I grow",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the long sentence, fast and smooth, with no stops. Join your ideas with and, but or because.",
            chunks: [
              "I build a snowman and I make a swing.",
              "I grow flowers, but I watch birds.",
              "You bring a book, and I bring a pencil.",
              "I grow flowers because I like flowers.",
              "I watch birds. What do you watch?",
            ],
            recycle: ["It gets hot in the summer.", "It snows in the winter."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows two picture cards and does the actions. The class says one long sentence with and." },
              { seconds: 75, say: "Pairs: one shows two cards, the other says a long sentence with and or but and does the actions. Swap when you hear the clap." },
              { seconds: 75, say: "Faster! New partner. Say your sentence and ask your partner a question: What do you ___?" },
            ],
            steps: [
              "Look at the picture cards. Do the actions and say a LONG sentence: 'I build a snowman and I make a swing.'",
              "Listen for the clap: it means change.",
              "In round 3, add a question at the end and count your sentences on your fingers.",
              "Teacher: after round 2, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(cards: snowman + swing)", "(cards: flowers + birds)", "(cards: book + pencil)", "(card: flowers) because...", "(card: birds) What do you ...?"],
            feedback:
              fix + " Example: a child says 'I build snowman and make swing.' Point to the board frame 'I build a ___ and I make a ___.' and pause at 'a'. For 'I watch birds' with a missing /ch/ or final /d/ in 'build', say it right once and let the child echo.",
            teacherNote:
              "Long sentences, never single words: the point is to say 'I build a snowman and I make a swing' as one smooth piece, with the joining word in the right place. Use big actions so meaning is clear. Mix in Unit 7's 'It gets hot / It snows' cards every few turns so last unit's phrases stay fast. Listen for a missing 'a', the second 'I' after and, and final sounds (build, grow, watch).",
            tiers: [
              { level: "Support", task: "Say the sentence with the frames on the board, with a friend.", frames: ["I ___ a ___ and I ___ a ___.", "I ___ ___, but I ___ ___."] },
              { level: "Core", task: "Join two ideas with and, but or because, without looking at the board: 'I grow flowers because I like flowers.'", frames: ["I ___, but I ___.", "I ___ because ___."] },
              { level: "Stretch", task: "Say it about two friends, with -s: 'She builds a snowman, but he makes a swing.' Then ask a question.", frames: ["She ___s a ___, but he ___s a ___."] },
            ],
          },
        },
        {
          after: "Mime and say",
          slide: {
            kind: "fluency",
            title: "Grammar drill: change it, join it, say it about us",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: change the person, join it with and, but or because, or ask about it. Then say real things about you.",
            chunks: [
              "I build a snowman.",
              "You build a snowman.",
              "We build a snowman in the winter.",
              "I make a swing in the summer, but I build a snowman in the winter.",
              "I grow flowers because I like flowers.",
              "What do you make? I make a swing.",
            ],
            recycle: ["It gets hot in the summer.", "It snows in the winter."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (P = change the person: you, we, they; + = join with and, but or because; ? = ask 'What do you ___?'). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 75, say: "Real talk: tell your partner what you really do in your favorite season. Join two ideas with and, but or because. Your partner asks one question: What do you ___?" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: P = a new person, + = join it with and, but or because, ? = ask 'What do you ___?'",
              "Say the WHOLE new sentence. After you, they, we, the action word stays short: we build, not we builds.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'We builds' or 'I build snowman'), fix them together, then go on.",
              "In round 3 the drill becomes real: say what you really do, and remember one thing your partner does to tell the class.",
            ],
            prompts: ["I build a snowman. (P: we)", "I make a swing. (+ and I grow flowers)", "I watch birds. (?)", "We grow flowers. (+ because)", "I bring a book. (+ but you bring a kite)"],
            feedback:
              "Prompt, do not tell: for 'We builds a snowman' hold up a finger for the extra -s and say 'We ...?'; for 'I build snowman' point to the word a on the board; for a missing joining word, hold up two fingers and pause after the first sentence. Say the final sounds in build, grow and watch clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children say what they really do, so the form is used for meaning. Grades 2-4 can take longer sentences and a change of person right away. This lesson drills the key structure of the unit, 'I + action + thing', with the joining words; the negative and Do you? come in Lesson 3. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only P and + (and) with I and you, with the frames on the board.", frames: ["I ___ a ___ and I ___ a ___.", "You ___ a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join with and, but or because." },
              { level: "Stretch", task: "Use he and she too, with -s: 'She builds a snowman, but he makes a swing.'" },
            ],
          },
        },
        {
          after: "Look at the captions (SB 77 C)",
          slide: {
            kind: "writing",
            title: "My summer paragraph: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the season, the two things I do, and the joining words and and because.",
              "Plan: write three key words in the boxes (a quick drawing is fine). Say one sentence for each box to your partner.",
              "Write: four or five sentences. Use the frames. Join two ideas with and or because in at least two sentences.",
              "Check: tick the checklist. Your partner points to every capital letter and every joining word.",
              "Teacher: look only at capital letters and I make / I build with no -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my summer",
              text: "I like the summer because it is hot. I make a swing and I build a tree house. I watch birds in the tree and I bring a book. Summer is fun because I play every day.",
            },
            organiser: [
              { label: "My season", prompt: "Write your season and one key word: hot, sunny or rainy. Say: I like the ___ because it is ___." },
              { label: "What I do", prompt: "Write two key words for things you do (swing, tree house, birds). Say: I make ... and I build ..." },
              { label: "My ending", prompt: "Write one more key word. Say: ___ is fun because ___." },
            ],
            frames: ["I like the ___ because it is ___.", "I make a ___ and I build a ___.", "I watch ___ in the ___ and I ___.", "___ is fun because ___."],
            checklist: ["Four or five sentences: season, two things I do, my ending", "At least two joining words: and, because", "A capital letter at the start and a full stop or ! at the end", "I make, I build, I grow: no -s after I"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for grades 2-4: four or five sentences planned with three key words (a drawing is optional), with two joining words used on purpose. Children may copy the frames and finish them. Mark only two things (capital letters, no -s after I) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["I like the ___ because it is ___.", "I ___ a ___ and I ___ a ___.", "___ is fun!"] },
              { level: "Core", task: "Write four or five sentences with and and because: season, two things I do, my ending." },
              { level: "Stretch", task: "Add a sentence with but: 'I build a snowman in winter, but I make a swing in summer.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u08-l2": {
      objectives: ["I can tell what happens to a tree in the four seasons, faster each time, with and, but and because.", "I can write a paragraph about a tree in the four seasons."],
      drop: ["Movement break: Be the tree", "Quiet tree time"],
      trim: { "Tree song": 4 },
      add: [
        {
          after: "Class chart: what do we see?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it for every season",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: change the season, ask it, say no, join it. Then say what you really see where you live.",
            chunks: [
              "In spring, I see flowers on the tree.",
              "What do you see in spring? I see flowers.",
              "In summer, I don't see flowers, but I see green leaves.",
              "In fall, I see apples and I see red leaves.",
              "In winter, the tree has no leaves because it is cold.",
              "Do you see apples in fall? Yes, I do. / No, I don't.",
            ],
            recycle: ["It rains in the spring.", "It gets cold in the winter."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (S = change the season, ? = ask it, X = say it with don't, + = join with and, but or because). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the season and the thing you see." },
              { seconds: 75, say: "Real talk: tell your partner what you really see in each season in your street or at school. Your partner asks one question: What do you see in ___?" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: S = a new season, ? = ask 'What do you see in ___?', X = say it with 'don't see', + = join it.",
              "Say the WHOLE new sentence, with -s on things when there are more than one: flowers, apples, leaves.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I see flower' or 'I no see'), fix them together, then go on.",
              "In round 3 the drill becomes real: say what you really see, and remember one thing your partner sees.",
            ],
            prompts: ["In spring, I see flowers. (S: fall)", "In summer, I see leaves. (?)", "In winter, I see snow. (X)", "In fall, I see apples. (+ and red leaves)", "In summer, the tree is green. (+ because)"],
            feedback:
              "Prompt, do not tell: for 'I see flower' tap your wrist for the missing -s; for 'I no see snow' point to the frame 'I don't see ___.' and pause; for a question without 'do', hold up one finger and say 'What d...?'. Say the -s and the n't clearly yourself.",
            teacherNote:
              "This drills the sentences of today's story ('In spring, I see ___') in the full set: statement, question, answer, negative and a joined sentence. Round 3 asks about the real seasons the children know, so the sentences carry meaning. Keep it brisk and let the one-minute fix do the teaching.",
            tiers: [
              { level: "Support", task: "Use only S and ? with the frames on the board.", frames: ["In ___, I see ___.", "What do you see in ___?"] },
              { level: "Core", task: "Change every sentence with all the signs: S, ?, X and +." },
              { level: "Stretch", task: "Use he and she too, with -s: 'She sees apples in fall, and he sees snow in winter.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it for every season",
          slide: {
            kind: "fluency",
            title: "Tree seasons: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same four seasons three times. Each time is shorter, smoother and faster, with and, but or because.",
            chunks: [
              "In spring, the tree has pink flowers, and birds come to the tree.",
              "In summer, I make a swing because the tree is big.",
              "In fall, apples fall from the tree, and I make apple pie.",
              "In winter, the tree has no leaves, but I build a snowman under it.",
              "Which season do you like?",
            ],
            recycle: ["It gets cold in the winter.", "It rains in the spring."],
            rounds: [
              { seconds: 70, say: "Tell your partner the four seasons. Use the four picture cards and join two ideas with and, but or because." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 50, say: "New partner. Tell it fast, then ask: Which season do you like? Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for spring, two for summer, three for fall, four for winter.",
              "When the bell rings, find a new partner. Both partners tell it in every round.",
              "The listener says 'Wow!' at the end and answers the question.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(picture: spring flowers)", "(picture: summer swing)", "(picture: fall apples)", "(picture: winter snowman)"],
            feedback:
              fix + " Example: a child says 'In fall, apple fall.' Hold up a finger for the missing -s and say 'Apples ...?' with rising voice. If the joining word is missing, hold up two fingers after the first part.",
            teacherNote:
              "This is the same telling three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what makes the second telling more accurate too. Keep the four picture cards on the board for Support children. Listen for the plural -s in flowers and apples and for the joining words.",
            tiers: [
              { level: "Support", task: "Tell all four seasons, one sentence each, with the frames.", frames: ["In spring, ___.", "In summer, I ___ because ___.", "In fall, ___ and ___.", "In winter, ___, but ___."] },
              { level: "Core", task: "Tell all four seasons with and, but or because in at least two sentences, without the frames." },
              { level: "Stretch", task: "Tell it as a story with because and a question: 'I like fall because I make apple pie. Which season do you like?'" },
            ],
          },
        },
        {
          after: "Which season? Picture hunt",
          slide: {
            kind: "writing",
            title: "My tree paragraph: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the tree sentence, then to each season and to the joining words.",
              "Plan: write one key word in each of the four boxes (a quick drawing is fine). Say one sentence for each box to your partner.",
              "Write: one sentence for each box, and join two ideas with and, because or but. Start with In spring, In summer, In winter.",
              "Check: tick the checklist. Your partner points to every capital letter and every joining word.",
              "Teacher: look only at capital letters and I make / I build with no -s. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my tree",
              text: "I have a tree. In spring, it has pink flowers and I watch the birds. In summer, I make a swing because the tree is big. In fall, apples fall and I make apple pie. In winter, I build a snowman under the tree, but the tree has no leaves.",
            },
            organiser: [
              { label: "Spring", prompt: "Write one key word for spring (flowers, birds, rain). Say: In spring, ___ and I ___." },
              { label: "Summer", prompt: "Write one key word for summer (swing, shade, hot). Say: In summer, I ___ because ___." },
              { label: "Fall", prompt: "Write one key word for fall (apples, leaves). Say: In fall, ___ and I ___." },
              { label: "Winter", prompt: "Write one key word for winter (snowman, cold, no leaves). Say: In winter, I ___, but ___." },
            ],
            frames: ["I have a ___.", "In spring, it has ___ and I ___.", "In summer, I ___ because ___.", "In winter, I ___, but ___."],
            checklist: ["Four to six sentences: my tree, then the seasons", "At least two joining words: and, because, but", "A capital letter at the start and a full stop at the end", "I make, I grow, I build: no -s after I"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Four to six sentences, one for each box, so the key words are the plan. This paragraph is the script for the recorded talk at home, My tree in four seasons. Mark only two things (capital letters, no -s after I) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["In spring, I ___ ___.", "In winter, I ___ a ___."] },
              { level: "Core", task: "Write five sentences: tree, spring, summer, winter, with and and because." },
              { level: "Stretch", task: "Add fall and a sentence with but: 'In fall, I bring a book to my tree, but I don't make a swing.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My tree in four seasons",
        prompt: "Show your picture of a tree. Tell what you do by the tree in spring, summer, fall and winter. Join your ideas with and, but or because.",
        length: "60-90 seconds",
        steps: [
          "Look at your tree picture and your key words from class.",
          "Say your four seasons three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera. Try to say and, but or because at least twice.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell what you do in each season, join your ideas, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "build", "make", "grow", "watch"],
        grammar: ["In spring, I ___ and I ___.", "I build / make / grow / watch ___ because ___."],
        rubric: [
          { label: "Four seasons", description: "Says something about spring, summer, fall and winter.", weight: 3 },
          { label: "I do it", description: "Uses 'I' with the action word: I build, I make, I grow. No -s after I.", weight: 2 },
          { label: "Joins ideas", description: "Uses and, but or because to make a longer sentence, or asks the viewer a question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of flowers and apples can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In spring, I ___ and I ___.", "In summer, I ___ because ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["In spring, I grow ___ and I watch ___.", "In summer, I make ___ because ___.", "In fall, I ___, but I ___."], tips: ["Say one long sentence for every season."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In winter, I build a ___, but I don't ___.", "My favorite season is ___ because ___. Which season do you like?"], tips: ["Say something you don't do, your favorite season and why, and ask a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u08-l3": {
      objectives: ["I can ask 'Do you ___?' and answer 'Yes, I do.' or 'No, I don't.' and add one more sentence, fast."],
      drop: ["Tree time whisper"],
      trim: { "Find someone who...": 6, "Arnold's tree chant": 4, "Our own song (SB 81 D)": 6 },
      add: [
        {
          after: "Imagine you have a tree (SB 81 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, join it with but. Then ask about real things.",
            chunks: [
              "I build a tree house.",
              "Do you build a tree house?",
              "Yes, I do. / No, I don't.",
              "I don't build a snowman in the summer, but I build a snowman in the winter.",
              "You grow flowers and you watch birds.",
              "Do they grow flowers in the spring? Yes, they do.",
            ],
            recycle: ["It snows in the winter.", "It gets hot in the summer."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't, + = join with but, and or because, P = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 75, say: "Real talk: ask your partner about what they really do in each season. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = join it with but, and or because.",
              "Say the WHOLE new sentence. After Do and don't, the action word is short: Do you build? I don't build.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you watching' or 'Yes, I like'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really does, and remember one answer to tell the class.",
            ],
            prompts: ["I build a tree house. (?)", "You grow flowers. (X)", "We make apple pie. (?)", "They watch birds. (X +)", "I bring a book. (+ and a kite)"],
            feedback:
              "Prompt, do not tell: for 'Do you watching birds?' hold up one finger and say 'Do you w...?'; for 'Yes, I like.' repeat it with a rising voice and say 'Yes, I d...?' so the child finishes it; for 'I no build' point to the frame 'I don't ___.' Say the /t/ in don't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about things they really do, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and a change of person. Vietnamese questions do not use 'do', so the question is the part to repeat most. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you ___?", "No, I don't ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join with but." },
              { level: "Stretch", task: "Use he and she too, with does: 'She builds a tree house. Does she build a tree house? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "What I like and don't like: plan, write, check",
            routine: "paragraph",
            genre: "likes and dislikes",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the season I like, what I do, what I don't do, and the joining words because, and and but.",
              "Plan: write key words in three boxes (a quick drawing is fine). Say one sentence for each box to your partner.",
              "Write: four or five sentences. Use the frames. Join two ideas with because, and or but.",
              "Check: tick the checklist. Your partner points to every capital letter, every don't and every joining word.",
              "Teacher: look only at capital letters and don't + a short action word. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my winter",
              text: "I like the winter because it is cold. I build a big snowman and I drink hot chocolate. I don't make a swing in the winter, but I make a swing in the summer. I watch the snow and I read a book. Winter is fun!",
            },
            organiser: [
              { label: "I like", prompt: "Write your favorite season and one key word. Say: I like the ___ because ___." },
              { label: "I do", prompt: "Write two key words for things you do. Say: I build a ___ and I ___." },
              { label: "I don't", prompt: "Write one thing you don't do (cross it out) and one thing you do instead. Say: I don't ___, but I ___." },
            ],
            frames: ["I like the ___ because ___.", "I ___ a ___ and I ___.", "I don't ___ in the ___, but I ___ in the ___.", "___ is fun!"],
            checklist: ["Four or five sentences: I like, I do, I don't, my ending", "At least two joining words: because, and, but", "After don't, the action word is short: I don't make", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This puts today's grammar, I do and I don't, into a paragraph with joining words. The crossed-out key word helps children see the I don't sentence, and 'but' shows why we say it. Mark only two things (capital letters, don't + short action word) and let the child find the mistake from your dot. If a child writes 'I don't makes' or 'I no make', point to the frame.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["I like the ___.", "I ___ a ___.", "I don't ___ a ___."] },
              { level: "Core", task: "Write four or five sentences with because, and and but: I like, I do, I don't, my ending." },
              { level: "Stretch", task: "Add two more sentences: 'I watch birds in the winter because they are pretty. Do you like winter?'" },
            ],
          },
        },
        {
          after: "Now ask and answer (SB 81 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Do you ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with one more sentence, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Do you build a snowman in the winter?",
              "Yes, I do. I build a big snowman.",
              "No, I don't. I make a swing in the summer.",
              "I don't build a snowman in the summer, but I eat ice cream.",
              "Do you fly a kite in the fall? What do you do in the summer?",
            ],
            recycle: ["It snows in the winter.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds an action card. Answer with Yes, I do. or No, I don't. and one more sentence." },
              { seconds: 75, say: "Swap cards. Go faster! Join your answer with and or but." },
              { seconds: 60, say: "Swap again. Add because to your answer. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'Do you ___?' Use the action on your card.",
              "They answer: 'Yes, I do.' or 'No, I don't.' and one more sentence. Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["Do you ___?", "Yes, I do. + one more sentence", "No, I don't, but I ___.", "No, I don't, because ___."],
            feedback:
              fix + " Example: a child says 'Do you watching birds?' or 'Yes, I like.' Prompt with a finger and 'Do you ...?' and pause, then 'Yes, I d...?' so the child finishes the answer. A recast is fine for the sound in 'don't'.",
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Do you ...?' automatic; the extra sentence keeps the answer from stopping at 'Yes, I do.' Time the whole circle and tell them: children love beating their own time. Watch for 'Yes, I like' and for 'Do you watching': both are common because Vietnamese questions do not use 'do'. Listen for the /t/ in 'don't'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I do.' or 'No, I don't.' and one more sentence, with the frames on the board.", frames: ["Do you ___?", "Yes, I do. I ___.", "No, I don't. I ___."] },
              { level: "Core", task: "Ask and answer without looking at the board, and join the answer with but: 'No, I don't, but I make a swing.'" },
              { level: "Stretch", task: "Add because: 'No, I don't, because it is hot in the summer.' Then ask a new question." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u08-l4": {
      objectives: ["I can talk about what I do in a season, with and, but and because, three times, faster each time."],
      drop: ["Run and touch", "Season actions chant", "Seasons whisper chant"],
      add: [
        {
          after: "What do you do in the spring? (SB 83 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: what do you do in ___?",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: change the season, ask it, say it with don't, join it. Then talk about what you really do.",
            chunks: [
              "In summer, I go to the beach.",
              "What do you do in the summer? I go to the beach.",
              "Do you go to the beach? Yes, I do. / No, I don't.",
              "I don't go to the beach in winter, but I drink hot chocolate.",
              "In spring, I plant flowers and I fly a kite.",
              "We eat ice cream because it is hot.",
            ],
            recycle: ["I build a snowman.", "I grow flowers."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (S = change the season, ? = ask it, X = say it with don't, + = join with and, but or because). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the season and the person: I, you, we." },
              { seconds: 75, say: "Real talk: ask your partner what they really do in each season. Answer with the full short answer and one more sentence with and, but or because." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: S = a new season, ? = ask 'What do you do in ___?' or 'Do you ___?', X = say it with 'don't', + = join it.",
              "Say the WHOLE new sentence. After I, you, we and don't, the action word is short: I go, I don't go.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I goes' or 'Do you going'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask what your partner really does, and remember one answer to tell the class.",
            ],
            prompts: ["In summer, I go to the beach. (S: winter)", "In spring, I fly a kite. (?)", "In winter, I drink hot chocolate. (X)", "In fall, I ride a bicycle. (+ and I eat apples)", "In summer, I eat ice cream. (+ because)"],
            feedback:
              "Prompt, do not tell: for 'I goes to the beach' hold up a finger and say 'I ...?' and pause so the child says 'go'; for 'In summer I am go' point to the frame 'In ___, I ___.'; for a question without 'do', hold up one finger and say 'What d...?'. Say the final sounds in beach and don't clearly yourself.",
            teacherNote:
              "This drills the key structure of today's lesson, 'What do you do in the ___? I ___ in the ___', in the full set: question, answer, negative and a joined sentence. Round 3 is the lesson's talk in miniature, so it feeds the 4-3-2 that follows. Grades 2-4 can switch season and person quickly. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only S and ? with I and you, with the frames on the board.", frames: ["In ___, I ___.", "What do you do in ___?"] },
              { level: "Core", task: "Change every sentence with S, ?, X and +, with I, you and we." },
              { level: "Stretch", task: "Use he and she too, with -s: 'She goes to the beach, but he doesn't go to the beach.'" },
            ],
          },
        },
        {
          after: "Grammar drill: what do you do in ___?",
          slide: {
            kind: "fluency",
            title: "Season talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same season talk to three friends. Each talk is shorter and smoother, with and, but and because.",
            chunks: [
              "In summer, I go to the beach and I swim.",
              "I eat ice cream because it is hot.",
              "I don't drink hot chocolate in summer, but I drink it in winter.",
              "Do you go to the beach? What do you do in the summer?",
            ],
            recycle: ["I build a snowman.", "I grow flowers."],
            rounds: [
              { seconds: 70, say: "Partner 1: tell your season talk. The listener counts the things you do on their fingers, then both swap." },
              { seconds: 60, say: "Partner 2: the same talk in less time. Swap." },
              { seconds: 50, say: "Partner 3: fast and smooth! The listener says 'Me too!' if they do it too and asks one question." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first, then line B talks to the same partner.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Everyone gives the same three rounds, and everyone talks in every round.",
            ],
            feedback:
              fix + " Example: a child says 'In summer, I goes to the beach.' Hold up a finger and say 'I ...?' and pause so the child says 'go'. If 'ice cream' sounds like 'ice clean', say it right and let the child echo.",
            teacherNote:
              "Same talk, less time, new listener: the 4/3/2 activity adapted for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The one-minute fix after round 1 is what turns fluency into more accurate fluency. Listen for no -s after I, the joining words, and the final sounds in 'beach' and 'don't'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, with and in one of them.", frames: ["In summer, I ___ and I ___.", "I don't ___."] },
              { level: "Core", task: "Say four or five sentences without the board, and join two with and, but or because." },
              { level: "Stretch", task: "Use because and ask the listener two questions: 'Do you ride a bicycle in summer? What do you do in winter?'" },
            ],
          },
        },
        {
          after: "Commas jump (SB 83 F)",
          slide: {
            kind: "writing",
            title: "Join them: and, but, because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the short sentences and the joining word in the brackets.",
              "Make ONE sentence. Say it first, then write it.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "I ride a bicycle. I fly a kite. (and)", answer: "I ride a bicycle and fly a kite." },
              { q: "I drink hot chocolate. I build a snowman. (and)", answer: "I drink hot chocolate and build a snowman." },
              { q: "In summer, I eat ice cream. I don't drink hot chocolate. (but)", answer: "In summer, I eat ice cream, but I don't drink hot chocolate." },
              { q: "I like summer. It is hot. (because)", answer: "I like summer because it is hot." },
              { q: "I plant flowers. I fly a kite. I ride a bicycle. (commas and and)", answer: "I plant flowers, fly a kite, and ride a bicycle." },
            ],
            checklist: ["Only one 'I' when 'and' joins the things I do", "'and', 'but' or 'because' joins my ideas", "A comma before 'but'", "A full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I'. After 'and', the action word has no -s (I ride and fly). For 'because', check that the second part is a whole idea (it is hot).",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 4." },
              { level: "Core", task: "Do items 1 to 4." },
              { level: "Stretch", task: "Do all five, then write two joined sentences of your own, one with but and one with because." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What I do and what I don't do",
        prompt: "Pick a season. Tell us two things you do and one thing you don't do, and say why. Show a picture if you can!",
        length: "60-90 seconds",
        steps: [
          "Draw your season or find a picture at home.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use 'I', 'I don't', and at least one of and, but or because.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what you do and what you don't do in a season, join your ideas, and keep talking without long stops.",
        words: ["summer", "winter", "beach", "ice cream", "hot chocolate", "kite", "bicycle"],
        grammar: ["In ___, I ___ and I ___.", "I don't ___, but I ___.", "Do you ___?"],
        rubric: [
          { label: "Do and don't", description: "Says two things he or she does and one thing he or she does not do.", weight: 3 },
          { label: "I don't + action", description: "Uses 'I don't' with a short action word: I don't ride, not 'I no ride'.", weight: 2 },
          { label: "Joins ideas", description: "Uses and, but or because to join ideas, or asks the viewer a question with 'Do you ...?'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Season words", description: "Uses words from the unit: beach, kite, hot chocolate, ice cream.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In ___, I ___ and I ___.", "I don't ___."], tips: ["Point to each picture as you say it."] },
          { level: "Core", who: "Most children", frames: ["In ___, I ___ and I ___.", "I don't ___ in ___, but I ___."], tips: ["Say the season in every sentence, and say but once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In ___, I ___, ___, and ___ because ___.", "Do you ___? What do you do in ___?"], tips: ["Say three things you do and why, and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u08-l5": {
      objectives: ["I can say what I do in my favorite season and why, then say it again better.", "I can write four or five sentences about my favorite season with because and but."],
      drop: ["Thank-you circle"],
      trim: { "Seasons song and dance": 4, "Journal gallery walk (SB 85 D)": 6 },
      add: [
        {
          after: "Show your journal (SB 85 C)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: my favorite season",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with don't, join it. Then talk about your own favorite season.",
            chunks: [
              "My favorite season is fall.",
              "What is your favorite season? My favorite season is fall.",
              "Do you like fall? Yes, I do. / No, I don't.",
              "I watch the leaves fall and I make apple pie.",
              "I don't like winter because it is cold, but I like the snow.",
              "You build a snowman in winter, and she builds a snowman too.",
            ],
            recycle: ["In spring, I grow flowers.", "It snows in the winter."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't, + = join with and, but or because, P = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the season and the person too." },
              { seconds: 75, say: "Real talk: ask your partner about their favorite season and their journal page. Answer with the full short answer and one more sentence with because." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question, X = say it with don't, + = join it, P = a new person.",
              "Say the WHOLE new sentence. After don't, the action word is short; after he and she, add -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I not like' or 'Do you likes'), fix them together, then go on.",
              "In round 3 the drill becomes real: it is the talk about your journal, so use your own pictures. Remember one answer to tell the class.",
            ],
            prompts: ["My favorite season is fall. (?)", "I like winter. (X)", "I make apple pie. (+ because I like apples)", "I watch the leaves. (P: she)", "I fly a kite. (X +)"],
            feedback:
              "Prompt, do not tell: for 'I not like winter' point to the frame 'I don't ___.' and pause; for 'Do you likes fall?' hold up one finger and say 'Do you l...?'; for a missing 'because', hold up a finger after the first part. Say the -s and the n't clearly yourself.",
            teacherNote:
              "This drills the whole unit's grammar one more time in the language of the journal: 'My favorite season is ___', 'I ___ and I ___', 'I don't ___, but I ___', 'Do you like ___?' Round 3 is the journal talk itself, so the drill leads straight into the task repeat that follows. Grades 2-4 can keep up a quick pace and change person without help. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you like ___?", "I don't like ___, but I like ___."] },
              { level: "Core", task: "Change every sentence with all the signs, and join with because or but." },
              { level: "Stretch", task: "Use he and she with -s: 'She likes fall because she makes apple pie. Does she like winter?'" },
            ],
          },
        },
        {
          after: "Grammar drill: my favorite season",
          slide: {
            kind: "fluency",
            title: "Journal talk: say it again, better",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say your journal talk, plan for one minute, then say it again to a new partner with more detail.",
            chunks: [
              "My favorite season is summer because it is hot.",
              "I go to the beach and I swim, but I don't build a snowman.",
              "I draw the sun and I write about the beach.",
              "Do you like summer? What is your favorite season?",
            ],
            recycle: ["In spring, I grow flowers.", "It snows in the winter."],
            rounds: [
              { seconds: 75, say: "Say your journal talk to your partner. Point to your pictures. Then your partner says theirs." },
              { seconds: 70, say: "New partner. The same talk, with one more sentence with because or but. Both partners talk." },
            ],
            steps: [
              "Look at your seasons journal. Pick the page you like best.",
              "Say your talk to your partner. The listener asks one question: 'Do you ___?' or 'Why?'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "Find a new partner and say the same talk again, a little faster and with more detail.",
            ],
            feedback:
              fix + " Example: a child says 'I not build a snowman.' Point to the frame 'I don't ___.' and pause. A child who says 'I like beach' gets a quick recast 'the beach' and echoes. If there is no 'because', ask 'Why?' and wait.",
            teacherNote:
              "Task repetition: the same task a second time with a new partner is easier, so the child's attention moves to speed, accuracy and a longer answer. The planning minute is the correction. The listener's job (one question) keeps the partner active. Listen for I / I don't, the joining words, and the missing 'the' before beach (accept it today).",
            tiers: [
              { level: "Support", task: "Say three sentences from your journal, with the frames.", frames: ["My favorite season is ___ because ___.", "I ___ and I ___.", "I don't ___."] },
              { level: "Core", task: "Say four sentences, one with 'I don't' and one with 'because' or 'but'." },
              { level: "Stretch", task: "Say five sentences, answer the listener's question with a full answer, and ask your own question: 'Do you like summer?'" },
            ],
          },
        },
        {
          after: "Make a seasons journal (SB 85 B)",
          slide: {
            kind: "writing",
            title: "Model, then my journal page",
            routine: "model, then write",
            mode: "solo",
            minutes: 7,
            steps: [
              "Listen to the model. Find the words 'because', 'but' and 'don't'.",
              "Write four or five sentences about your favorite season with the frames.",
              "Read them to your partner. Do they match your picture?",
            ],
            text: {
              title: "My favorite season",
              text: "My favorite season is fall because it is pretty. I watch the leaves fall and I make apple pie. I don't build a snowman in fall, but I fly a kite. I like fall because I eat apples with my friends. Fall is fun!",
            },
            frames: ["My favorite season is ___ because ___.", "I ___ and I ___.", "I don't ___, but I ___.", "I like ___ because ___."],
            checklist: ["Every sentence starts with a capital letter", "Every sentence ends with a full stop", "At least two joining words: because, and, but", "After 'I don't', a short action word"],
            sayIt: "Read your page to a partner, then say it again without looking.",
            teacherNote: "Children write a model-shaped text of their own, so the frames carry the grammar. Point out that the model uses 'because', 'and' and 'but' and that the action word stays short after 'I don't'. Accept a picture with labels from Support children.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and draw your season with labels." },
              { level: "Core", task: "Write four sentences with the frames, with because and but." },
              { level: "Stretch", task: "Write five sentences and ask your reader a question: 'Do you like fall?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u08-l6": {
      objectives: ["I can ask and answer 'Do you ___?' and add one more sentence quickly, without looking."],
      drop: ["Jump the line"],
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no, join it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, join it. Then ask about real things.",
            chunks: [
              "In spring, I plant flowers.",
              "Do you plant flowers in spring? Yes, I do. / No, I don't.",
              "In winter, I don't go to the beach, but I drink hot chocolate.",
              "We ride bicycles and we fly kites because we love the fall.",
              "Do they fly kites in the fall? Yes, they do.",
              "You eat ice cream in the summer, but I don't.",
            ],
            recycle: ["It gets hot in the summer.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't, + = join with and, but or because, P = change the person). The class says the new sentence together." },
              { seconds: 75, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 75, say: "Real talk: ask your partner about their seasons: what they do, and what they don't. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = join it with and, but or because.",
              "Say the WHOLE new sentence, with the short action word after Do and don't.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Yes, I am' or 'Do you plants'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really does, and remember one answer to tell the class.",
            ],
            prompts: ["I ride a bicycle. (?)", "You fly a kite. (X)", "We plant flowers. (?)", "They go to the beach. (X +)", "I eat ice cream. (+ because it is hot)"],
            feedback:
              "Prompt, do not tell: for 'Yes, I am.' hold up a finger and start 'Yes, I d...' and pause; for 'Do you plants flowers?' tap your wrist for the extra -s and say 'Do you p...?'; for 'I don't goes' point to the frame 'I don't ___.' Say the /t/ in don't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: round 3 has children ask about things they really do, so the form is used for meaning. The Grammar Champions rule in one drill: the yes sentence, the no sentence, the question and the short answers, joined with and, but or because. Grades 2-4 can take all four persons. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you ___?", "No, I don't ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join with but or because." },
              { level: "Stretch", task: "Use he and she too: 'She plants flowers, but he doesn't plant flowers. Does she fly a kite?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: Units 7 and 8",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right: this unit's and last unit's, with a joining word and a question.",
            chunks: [
              "In spring, I plant flowers, and I fly a kite.",
              "Do you fly a kite? Yes, I do. I fly a kite in the fall.",
              "Do you ride a bicycle? No, I don't, but I ride a scooter.",
              "I don't go to the beach in winter because it is cold.",
            ],
            recycle: ["It gets hot in the summer.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a card, the class says the sentence." },
              { seconds: 75, say: "Side A asks, side B answers and adds one more sentence. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can, with because or but!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 2, stop for one minute. Fix the two mistakes you heard most on the board, then go on.",
            ],
            feedback:
              fix + " Example: a child says 'Yes, I am.' for 'Do you fly a kite?' Hold up a finger and start 'Yes, I d...' and pause. For 'I don't' with a missing 't', say it right and let the child echo.",
            teacherNote:
              "A quick, high-energy recall of Units 7 and 8 together: mixing old and new phrases (spaced retrieval) is what keeps last unit's grammar from fading. The sentences are longer now, with and, but and because, and every answer has one more sentence. Listen for 'Yes, I am' (it comes from 'Are you?') and for a missing 'do' in questions.",
            tiers: [
              { level: "Support", task: "Say the sentences when the card flips, with the card in your hand." },
              { level: "Core", task: "Make your own sentence with 'but': 'I fly a kite, but I don't ride a bicycle.'", frames: ["I ___, but I don't ___."] },
              { level: "Stretch", task: "Use 'because' and ask a question: 'I don't go to the beach in winter because it is cold. Do you go to the beach in winter?'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "Grow my champion sentence",
            routine: "expand it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the small sentence with your partner.",
              "Make it bigger: add the words in the brackets, including the joining word.",
              "Write your big sentence. Say it to your partner.",
            ],
            items: [
              { q: "I plant flowers. (add: in the spring, because they are pretty)", answer: "I plant flowers in the spring because they are pretty." },
              { q: "I don't go to the beach. (add: in the winter, but I drink hot chocolate)", answer: "I don't go to the beach in the winter, but I drink hot chocolate." },
              { q: "Do you fly a kite? (add: in the fall)", answer: "Do you fly a kite in the fall?" },
              { q: "I eat ice cream. (add: in the summer, and I swim)", answer: "I eat ice cream in the summer, and I swim." },
              { q: "I ride a bicycle. (add: in the spring, but I don't ride it in the rain)", answer: "I ride a bicycle in the spring, but I don't ride it in the rain." },
            ],
            frames: ["I ___ in the ___ because ___.", "I don't ___ in the ___, but I ___.", "Do you ___ in the ___?"],
            checklist: ["A capital letter at the start", "A full stop or a question mark at the end", "A comma before 'but'", "After 'I don't', a short action word"],
            sayIt: "Say all five big sentences to your partner, fast.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two new small sentences for your partner to grow, one with because and one with but." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My season clues video",
        prompt: "Tell us two things you do and one thing you don't do in a season, and say why. Do not say the season! Can your grown-up guess it?",
        length: "60-90 seconds",
        steps: [
          "Choose a season and think of two things you do and one thing you don't do.",
          "Practise your clues three times, a little faster each time, and join your ideas with and, but or because.",
          "Record it once. At the end, ask: 'Do you know my season?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Give clues with 'I' and 'I don't', join your ideas, ask a question at the end, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "kite", "beach", "snowman"],
        grammar: ["I ___ and I ___.", "I don't ___, but I ___.", "Do you know my season?"],
        rubric: [
          { label: "Clues", description: "Gives two things he or she does and one thing he or she does not do.", weight: 3 },
          { label: "I and I don't", description: "Says 'I ___' and 'I don't ___' with a short action word.", weight: 3 },
          { label: "Joins ideas", description: "Uses and, but or because to make longer sentences, and asks the viewer a question with 'Do you ...?'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I ___ and I ___.", "I don't ___.", "Do you know my season?"], tips: ["Hold up a picture for each clue."] },
          { level: "Core", who: "Most children", frames: ["I ___ and I ___, but I don't ___.", "I ___ because ___.", "Do you know my season?"], tips: ["Do not say the season until the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In my season, I ___ and I ___, but I don't ___ because ___.", "Do you ___ in my season?"], tips: ["Give three clues with a reason, and ask your grown-up a question about their season."] },
        ],
      },
    },
  },
};
