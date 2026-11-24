import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 5 "Animal Homes"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4 (ages 7-10).
// Every lesson gets a grammar drill (a cue sentence changed fast: asked, made negative,
// joined to another idea, said about another person, then used for real), one more fluency
// routine (the unit's phrases said again and again as longer sentences, a little faster
// each round, with Unit 4's phrases mixed back in) and one writing routine (say it, write
// it, read it back). Two lessons end with a recorded talk for home, built on the routine
// the class just did. Time comes from games and repeats, never from the book pages or the
// grammar. All text is original.

const GROWN_UP = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

// Lessons 1-2: "lives" (third person -s) and "a / in a".
const fixLives =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). The most likely one is a missing -s: 'The eagle live in a nest.' In a retell, write them on the board between rounds 1 and 2 (in a sprint, after the last round) and let the class fix them in one minute; children then say it again with the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('The eagle live...?'), hold up one finger for the missing -s, or point to the frame. Do not say it for them. For a sound (hive, with the /v/), just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

// Lessons 3 and 5: Where's / Where are, It's / They're.
const fixWhere =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Look for 'Where the frog?' (no is), 'Where's the frogs?' (Where's with many) and 'They is in the pond.' Between rounds, write them on the board and let the class fix them in one minute; children then say the same thing again with the fixed form. Prompt, do not tell: start the phrase and pause ('Where ... the frogs?'), hold up one finger for ONE thing or two fingers for MANY, or point to the frame on the board. For a sound, just say it right and let the child echo it. Say every 's, 're and final -s clearly yourself.";

// Lesson 4: plurals.
const fixPlural =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names). Look for 'two frog' (no -s), 'two mouses', 'three fishes' and 'one mice'. Between rounds 1 and 2, write them on the board and let the class fix them in one minute; children then say the same thing again with the fixed form. Prompt the child to fix it: hold up the right number of fingers and wait, start the phrase and pause ('two frog...?'), or point to the plural box on the board. Do not say it for them. For a sound, just say it right and let them echo it. Say every final -s and -es clearly yourself: children copy what they hear.";

export const odL1U5Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u05-l1": {
      objectives: ["I can say 'The eagle lives in a nest, and the nest is in a tree.' fast, without stopping."],
      trim: { "Chant: Home, home, home!": 3, "Animals and places (SB 48 B)": 5, "Look and guess: title and picture (SB 49 C-D)": 8 },
      drop: ["Flashcard slap and What's missing?", "Whisper chant and thumbs"],
      add: [
        {
          after: "Who lives here? (home match)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with Does, say no with doesn't, join it with and or but. Then talk about real animals.",
            chunks: [
              "The eagle lives in a nest.",
              "Does the eagle live in a nest? Yes, it does.",
              "Does the eagle live in a hive? No, it doesn't.",
              "The eagle doesn't live in a hive, but the honeybee does.",
              "Eagles live in nests, and honeybees live in hives.",
              "Where does the crab live? It lives in a shell.",
            ],
            recycle: ["The ball is on the desk.", "It's under the chair, next to the bag."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'but' or 'and' and one more fact). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the animal too: one animal (lives), many animals (live)." },
              { seconds: 90, say: "Real talk: ask your partner about a real pet or an animal they know. Where does it live? Answer with the short answer and one more sentence with 'and' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, + = add 'but ___' or 'and ___'.",
              "Say the WHOLE new sentence. One animal: lives. Many animals: live.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The eagle live' or 'Does the eagle lives'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a real pet or animal, and remember one answer to tell the class.",
            ],
            prompts: ["The crab lives in a shell. (?)", "The honeybee lives in a hive. (X)", "The eagles live in a nest. (+ the chicks)", "The opossum lives in a tree hollow. (? then X)", "The fish live in a pond. (change to: one fish)"],
            feedback: "Prompt, do not tell: for 'Does the eagle lives?' touch your ear and say 'Does the eagle l...?'; for 'The eagle live in a nest.' hold up one finger for ONE animal and wait for -s; for 'No, it don't.' repeat it with a rising voice and let the child fix it. Say every -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children talk about animals they really know, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, negative and a joined sentence. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? with one animal, with the frames on the board.", frames: ["Does the ___ live in a ___?", "Yes, it does. / No, it doesn't."] },
              { level: "Core", task: "Change every sentence, for one animal and for many animals." },
              { level: "Stretch", task: "Add a reason or a second fact: 'The honeybee lives in a hive because it is warm and safe.'", frames: ["The ___ lives in a ___ because ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Home sprint: who lives where?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 8,
            goal: "Say the whole sentence, with a joining word, fast and smooth, with no stops.",
            chunks: [
              "The eagle lives in a nest, and the nest is in a tall tree.",
              "The honeybee lives in a hive because it is warm and safe.",
              "The crab lives in a shell, but the opossum lives in a tree hollow.",
              "Where does the chick live? It lives in a nest. Is it safe?",
              "Does the crab live in a hive? No, it doesn't. It lives in a shell.",
            ],
            recycle: ["The ball is on the desk, and the pencil is under the chair.", "It's next to the bag."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows an animal card, the class says the whole sentence with its joining word." },
              { seconds: 70, say: "Pairs: one shows a card, the other says the sentence and asks a follow-up question. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the animal card. Say a WHOLE sentence with 'and', 'but' or 'because': 'The eagle lives in a nest, and the nest is high.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, play 'Fix the home': two mistakes from the rounds go on the board and the class fixes them in one minute.",
            ],
            prompts: ["(card: eagle)", "(card: honeybee)", "(card: crab)", "(card: opossum)", "(card: chick)"],
            feedback: fixLives,
            teacherNote: "Whole sentences only, never single words: the point is to say 'The crab lives in a shell, but the opossum lives in a tree hollow' as one smooth piece. Listen for the -s on 'lives' and for the /v/ in 'hive' and 'lives'. Every few turns slip in a Unit 4 card ('The ball is on the desk') so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Say the sentence alone with the frame on the board, and join it with 'and'.", frames: ["The ___ lives in a ___, and ___."] },
              { level: "Core", task: "Join two ideas with and, but or because, without looking at the board.", frames: ["The ___ lives in a ___ because ___."] },
              { level: "Stretch", task: "Compare two animals and ask a follow-up question: 'The eagle lives in a nest, but the crab lives in a shell. Where does the honeybee live?'", frames: ["The ___ lives in a ___, but the ___ lives in a ___. Where does ___?"] },
            ],
          },
        },
        {
          after: "Draw and label",
          slide: {
            kind: "writing",
            title: "My animal home: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the animal, the home, the reason and the last sentence. Circle 'and', 'because' and 'but'.",
              "Plan: write four key words in the boxes (animal, home, why it is safe, a question). A drawing is a good help but you do not need one. Say one sentence for each box to your partner.",
              "Write: four to six sentences, with the frames. Use 'and' or 'because' in at least two sentences.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every 'lives'.",
              "Teacher: look only at capital letters, the -s on 'lives' and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The eagle", text: "I like the eagle because it is big and strong. The eagle lives in a big nest, and the nest is high in a tree. It is a safe home. The chicks sleep in the nest, but the mother eagle flies. Do you like eagles too?" },
            organiser: [
              { label: "Animal", prompt: "Write the animal and one word about it (big, small, fast). Draw it if you like." },
              { label: "Home", prompt: "Write where it lives. Is the home in a tree, a pond or a shell?" },
              { label: "Why safe", prompt: "Write why the home is good: high, warm, safe, near food." },
              { label: "Question", prompt: "Write a question for your reader: Do you like ___?" },
            ],
            frames: ["I like the ___ because ___.", "The ___ lives in a ___, and the ___ is ___.", "It is a ___ home.", "The ___ ___, but the ___ ___.", "Do you like ___?"],
            checklist: ["Four to six sentences about one animal", "A capital letter at the start and a full stop, ? or ! at the end", "'lives' has an -s", "At least two joining words: and, because or but"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph about one animal: an opening sentence, what it is about, a reason and a question for the reader, planned with key words (a drawing is a choice, not a rule, in grades 2-4). Mark only three things (capital letters, the -s on 'lives' and the joining words) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the first three frames and fill in one word in each, then add 'and' to one sentence.", frames: ["I like the ___ because ___.", "The ___ lives in a ___."] },
              { level: "Core", task: "Write four or five sentences about your animal and its home, with 'and' and 'because'." },
              { level: "Stretch", task: "Write five or six sentences and compare two animals' homes with 'but': 'The eagle lives in a nest, but the crab lives in a shell.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u05-l2": {
      objectives: ["I can tell my partner about an animal home with 'and' and 'because', faster each time."],
      drop: ["TPR: Show me the home", "Fact hunt: touch it!", "Calm chant: Everyone is safe"],
      add: [
        {
          after: "Home experts",
          slide: {
            kind: "fluency",
            title: "Grammar drill: facts, questions, no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change a fact from the story fast and right: ask it, say no, join it with 'and' or 'but', or change the animal. Then talk about real homes.",
            chunks: [
              "The eagle lives in a nest.",
              "Does the eagle live in a nest? Yes, it does.",
              "The honeybees don't live in a nest. They live in a hive.",
              "The crab has a shell, and the shell is its home.",
              "Do the honeybees live in a hive? Yes, they do.",
              "Animals live in different homes because they need different things.",
            ],
            recycle: ["The blue pencil is in the bag.", "Where's the starfish? It's under the seaweed."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a fact and shows a sign (? = ask it, X = say it in the negative, + = add 'and' or 'but', change = another animal or 'they'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a fact from the story and shows a sign card, B changes it. Swap at the clap. Use he / she / it and they: 'lives' and 'live'." },
              { seconds: 90, say: "Real talk: ask your partner about their home or a friend's home. Answer with the short answer and one more sentence with 'and' or 'because'." },
            ],
            steps: [
              "Listen to the fact. Look at the sign. Change it: ? = ask with Does or Do, X = say it with doesn't or don't, + = add 'and ___' or 'but ___'.",
              "Say the WHOLE new sentence. One animal: lives. Many animals: live.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The honeybees lives' or 'Do the eagle live'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a real home. Where do you live? What do you have in your home?",
            ],
            prompts: ["The eagle lives in a nest. (?)", "The honeybees live in a hive. (X)", "The crab has a shell. (+ it is a safe home)", "Do the honeybees live in a hive? (change: the eagle)", "The eagle lives in a nest. (X + but)"],
            feedback: "Prompt, do not tell: for 'The honeybees lives in a hive.' hold up two fingers for MANY and wait for 'live'; for 'Do the eagle live?' hold up one finger and say 'D...?'; for 'No, it don't.' repeat it with a rising voice and let the child fix it. Say every -s and n't clearly yourself.",
            teacherNote: "The drill uses the story's own facts, so the grammar carries meaning. Grades 2-4 can take the full set: statement, question, short answers, negative and a joined sentence. The -s on 'lives' and the change to 'live' for many animals is the target. Keep it brisk and end with real talk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one animal, with the frames on the board.", frames: ["Does the ___ live in a ___?", "Yes, it does. / No, it doesn't."] },
              { level: "Core", task: "Change every fact, for one animal and for many animals (lives and live)." },
              { level: "Stretch", task: "Join a fact, a negative and a reason: 'The honeybees don't live in a nest because they need a warm hive.'", frames: ["The ___ don't live in a ___ because ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: facts, questions, no",
          slide: {
            kind: "fluency",
            title: "Home facts: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell what you learned about animal homes three times, with 'and', 'but' and 'because'. Each time is shorter, smoother and faster.",
            chunks: [
              "The eagle lives in a nest, and the nest is high in a tree.",
              "The honeybees live in a hive because it is warm and safe.",
              "The crab has a shell, but the opossum lives in a tree hollow.",
              "Animals live in different homes, and each home is safe for its animal.",
              "Which home do you like best? Why?",
            ],
            recycle: ["The blue pencil is in the bag, and the ruler is on the desk.", "Where is the starfish? It's under the seaweed."],
            rounds: [
              { seconds: 75, say: "Tell your partner about two animals and their homes. Use your picture cards. The listener asks one follow-up question." },
              { seconds: 60, say: "New partner. Tell it again in less time." },
              { seconds: 45, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Choose two animal cards. Say each name, where it lives and one more fact. Join them with 'and' or 'but'.",
              "The listener has a job: count the facts on their fingers, then ask one question: 'Why is the home safe?'",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When the bell rings, find a new partner for rounds 2 and 3. Both partners tell it in every round.",
            ],
            prompts: ["(card: eagle)", "(card: honeybee)", "(card: crab)", "(card: opossum)"],
            feedback: fixLives,
            teacherNote: "Same facts three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Both partners tell it in every round, so each child speaks three times. Retelling builds fluency but not accuracy on its own, which is why the one-minute fix sits between round 1 and round 2. Listen for 'lives' with its -s and for 'honeybees live' (no -s on live).",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and join two with 'and'.", frames: ["The ___ lives in a ___, and ___.", "It is ___."] },
              { level: "Core", task: "Say four facts with 'and', 'but' or 'because', without the frames.", frames: ["The ___ lives in a ___ because ___."] },
              { level: "Stretch", task: "Compare two homes and answer the question 'Which home do you like best? Why?': 'The nest is high, but the hive is warm. I like the hive because ___.'" },
            ],
          },
        },
        {
          after: "Home facts: tell it again, faster",
          slide: {
            kind: "writing",
            title: "Listen and build the home facts",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 8,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again and write the key words: hive, warm, nest, high, chicks, shell, because.",
              "With your partner, build the text back. It does not have to be the same, but it must make sense and have 'and', 'but' or 'because' in it.",
              "Compare with the teacher's text. Fix your capital letters and full stops, and find the three joining words.",
            ],
            text: { title: "Safe homes", text: "The honeybees live in a hive. The hive is warm, and it is safe. The eagle lives in a nest. The nest is high in a tree, but the chicks are not afraid. The crab has a shell because it needs a safe home. Every animal has a home." },
            checklist: ["Capital letter at the start of each sentence", "A full stop at the end", "'lives' / 'live' and 'chicks' with the -s", "The joining words: and, but, because"],
            sayIt: "Read your text to the class. Then say it again without looking.",
            teacherNote: "Dictogloss works best after a short reminder of the rule: one animal 'lives', many animals 'live'. Read the text twice at normal speed, not slowed down. Children rebuild meaning in pairs, then compare. Accept any sensible version, and give credit for each joining word they keep.",
            tiers: [
              { level: "Support", task: "Write the key words and the first three sentences with a partner." },
              { level: "Core", task: "Build all six sentences with a partner." },
              { level: "Stretch", task: "Build the text, then add two sentences about the opossum with 'and' or 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My animal's home",
        prompt: "Choose an animal. Tell us its name, where it lives and why that home is good. Join your ideas with 'and', 'but' or 'because', and ask us a question at the end. Show a picture or a toy animal!",
        length: "60-90 seconds",
        steps: [
          "Choose your animal and look at the key words you wrote in class.",
          "Say your facts three times to a grown-up or a toy. Each time a little faster. Use 'and' and 'because'.",
          "Record it once. Smile and look at the camera. End with a question for us.",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the name of your animal, where it lives, and why the home is good. Join your ideas with and, but or because, and ask a question at the end. Keep talking without long stops.",
        words: ["eagle", "chick", "nest", "honeybee", "hive", "crab", "shell"],
        grammar: ["The ___ lives in a ___, and ___.", "The ___ is ___ because ___."],
        rubric: [
          { label: "Animal and home", description: "Says the animal and where it lives in a whole sentence.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: nest, hive, shell, tree hollow.", weight: 2 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because, or asks a question at the end.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear 'lives'", description: "The -s at the end of 'lives' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is a ___.", "It lives in a ___, and ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["The ___ lives in a ___, and the home is ___.", "It is safe because ___."], tips: ["Say where the home is and why it is good."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The ___ lives in a ___, but the ___ lives in a ___.", "I like the ___ because ___. Do you like ___?"], tips: ["Compare two homes, say which you like, and ask a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u05-l3": {
      objectives: ["I can ask 'Where's the ___?' and 'Where are the ___?' and answer with a joined sentence, fast."],
      trim: { "Hide it! Where is the toy?": 5 },
      drop: ["TPR: Freeze and point", "Ball toss: ask and throw"],
      add: [
        {
          after: "Where is ... ? Where are ... ?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with Where, say no with isn't or aren't, join it with and, but or because. Then ask about real things.",
            chunks: [
              "The frog is in the pond.",
              "Where's the frog? It's in the pond.",
              "Where are the frogs? They're in the pond.",
              "The frog isn't on the log. It's in the pond.",
              "The frogs aren't on the log, but the fish are in the pond.",
              "Is the frog in the pond? Yes, it is. / No, it isn't.",
            ],
            recycle: ["The eagle lives in a nest.", "Does the crab live in a shell? Yes, it does."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'and' or 'but', change = one thing or many things). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. One thing: is. Many things: are." },
              { seconds: 90, say: "Real talk: ask your partner where their things are (bag, pencil case, shoes, books). Answer with the full short answer and one more sentence with 'and' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Where's or Where are, X = say it with isn't or aren't, + = add 'and ___' or 'but ___'.",
              "Say the WHOLE new sentence. One thing: Where's / It's. Many things: Where are / They're.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Where's the frogs?' or 'They is in the pond'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has in the bag, and remember one answer to tell the class.",
            ],
            prompts: ["The frog is on the log. (?)", "The frogs are in the pond. (X)", "The squirrel is next to the tree. (+ the mice)", "The chicks are in the nest. (? then X)", "The mouse is under the leaves. (change to: many mice)"],
            feedback: fixWhere,
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about the things they really have, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, negative and a joined sentence. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and the answer with one thing, with the frames on the board.", frames: ["Where's the ___?", "It's in / on / under / next to the ___."] },
              { level: "Core", task: "Change every sentence, for one thing and for many things." },
              { level: "Stretch", task: "Add a reason or the next question: 'The frogs aren't on the log because they like the water. Where are the fish?'", frames: ["The ___ aren't ___ because ___."] },
            ],
          },
        },
        {
          after: "Look at the picture, ask your partner (SB 53 D)",
          slide: {
            kind: "fluency",
            title: "Question chain: Where's it? Where are they?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, add a second fact, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Where's the eagle? It's in the sky, and it's near the cloud.",
              "Where are the chicks? They're in the nest, and the nest is in the tree.",
              "Where's the fox? It's under the tree, but the mice are in the field.",
              "Where are the frogs? They're on the log because the pond is cold.",
              "What's next to the nest? A branch is next to the nest.",
            ],
            recycle: ["The eagle lives in a nest, and the nest is high.", "Does the honeybee live in a hive? Yes, it does."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds an animal card. Add a second fact." },
              { seconds: 65, say: "Swap cards. Go faster!" },
              { seconds: 55, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Put your animal card on the floor in a place: in, on, under or next to something.",
              "Look at the card in front of the friend on your left. Ask: 'Where's the ___?' (one) or 'Where are the ___?' (many).",
              "They answer with 'It's ...' or 'They're ...' and add a second fact with 'and', 'but' or 'because'. Then they turn and ask the next friend.",
              "Teacher: after the last round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Where's the ___?", "Where are the ___?", "What's next to the ___?"],
            feedback: fixWhere,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Where's ...?' automatic. The second fact (and, but, because) makes the answers longer than 'It's in the nest.' Time the whole circle and tell them; children love beating their own time. Use one card and two cards so the children must choose between 'Where's' and 'Where are'. Listen for 'It' without the 's.",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and add 'and' with one more place.", frames: ["It's in / on / under the ___, and ___.", "They're in / on / under the ___, and ___."] },
              { level: "Core", task: "Answer and add a second fact with and, but or because, without looking at the board.", frames: ["It's ___ the ___ because ___."] },
              { level: "Stretch", task: "Add a second place and a new question: 'It's in the nest, and the nest is in the tree. Where are the chicks?'" },
            ],
          },
        },
        {
          after: "Our classroom (SB 53 E)",
          slide: {
            kind: "writing",
            title: "My animal map: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to each animal on the map. Circle 'and', 'because' and 'but'.",
              "Plan: write four key words in the boxes (the animals and their places). A drawing is optional. Say where each one is.",
              "Write: start with Look at my animal map. Then one sentence for each box, and a question at the end. One animal: is. More than one: are.",
              "Check: tick the checklist. Your partner points to every is and every are.",
              "Teacher: look only at is / are, the -s on more than one animal and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: The pond map", text: "Look at my animal map. The frogs are in the pond, and the fox is under the tree. The chicks are in the nest because it is safe. Then I see a mouse. It is next to the log, but the fox can't see it. Where are the fish?" },
            organiser: [
              { label: "Animal 1", prompt: "Write one or more animals and the place. Draw them if you like." },
              { label: "Animal 2", prompt: "Write another animal and its place. In, on, under or next to?" },
              { label: "Why", prompt: "Write one reason with 'because' or one idea with 'but'." },
              { label: "Question", prompt: "Write a 'Where' question for your reader." },
            ],
            frames: ["Look at my animal map.", "The ___ is / are ___ the ___, and the ___ is ___.", "The ___ is / are ___ the ___ because ___.", "Then I see a ___. It is ___ the ___, but ___.", "Where is / are the ___?"],
            checklist: ["One thing: is. More than one: are", "The -s on more than one animal", "A capital letter at the start and a full stop or ? at the end", "At least two joining words: and, because, but or then"],
            sayIt: "Show your map to your partner and read your paragraph. Your partner answers your last question. Then tell it again without looking.",
            teacherNote: "Vietnamese learners often drop 'be' ('The frog in the pond'), so listen for is / are. Planning with key words (a drawing is optional) frees the children to write longer sentences with joining words. Mark only three things (is / are, the plural -s and the joining words) and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the animal and the place; join two sentences with 'and'." },
              { level: "Core", task: "Write four or five sentences about your map, with 'and' or 'because', and end with a question." },
              { level: "Stretch", task: "Write five or six sentences and add 'then' or 'but': 'Then I see a mouse. It is next to the log, but the fox can't see it.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u05-l4": {
      objectives: ["I can say 'I see two frogs and three foxes, and they live in the woods.' with the -s sounds."],
      trim: { "Chant: Who lives here?": 3, "Many animals: plurals game (SB 55 F)": 6 },
      drop: ["Freeze dance: one and many", "Calm close: sleepy animals"],
      add: [
        {
          after: "More than one: -s, -es, and special words",
          slide: {
            kind: "fluency",
            title: "Grammar drill: one, many, ask, no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: one or many, ask it with Do, say no with don't, join it with and or but. Then count real things.",
            chunks: [
              "I see a frog in the pond.",
              "I see two frogs in the pond.",
              "Do you see two frogs? Yes, I do. / No, I don't.",
              "I don't see three mice, but I see two foxes.",
              "There are five fish in the pond, and there is one frog on the log.",
              "Three foxes sleep in the woods, and two mice sleep in the field.",
            ],
            recycle: ["Where are the chicks? They're in the nest.", "The eagle lives in a nest, and the nest is high."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'and' or 'but', change = one or many). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. One: a frog. Many: -s, -es, mice, fish." },
              { seconds: 90, say: "Real talk: count real things in the room (pencils, books, bags, windows). Ask your partner and answer with the short answer and one more sentence with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Do you see, X = say it with don't, + = add 'and ___' or 'but ___', change = one or many.",
              "Say the WHOLE new sentence. Many things: -s, -es, mice or fish.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'two mouses' or 'three fishes'), fix them together, then go on.",
              "In round 3 the drill becomes real: count what is really in the room, and remember one answer to tell the class.",
            ],
            prompts: ["I see a fox. (many: three)", "I see two mice. (X)", "I see five fish. (?)", "I see a frog. (+ two mice)", "I see two foxes. (X + but)"],
            feedback: fixPlural,
            teacherNote: "A drill only helps when the last step is real: round 3 has children count real things in the room, so the plural is used for meaning. Grades 2-4 can take the full set: one and many, a question, a negative and a joined sentence. Keep it brisk; this lesson is already full, so six minutes is the limit.",
            tiers: [
              { level: "Support", task: "Use only one and many with -s, with the frames on the board.", frames: ["I see a ___.", "I see two ___s."] },
              { level: "Core", task: "Change every sentence: one or many, ask it, say it in the negative." },
              { level: "Stretch", task: "Use the special plurals and join the ideas: 'I see two mice, but I don't see three foxes because they are in the woods.'", frames: ["I see two ___, but I don't see ___ because ___."] },
            ],
          },
        },
        {
          after: "Tell your partner about an animal home",
          slide: {
            kind: "fluency",
            title: "Pond talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same animal talk to three friends, with joined sentences. Each talk is shorter and smoother.",
            chunks: [
              "I see two frogs in the pond, and three foxes sleep in the woods.",
              "There are five fish in the pond, but there are no mice.",
              "The mice live in the field because it is quiet and safe.",
              "Do you see the eagles? They live in big nests.",
            ],
            recycle: ["Where are the chicks? They're in the nest, and the nest is in the tree.", "Where's the eagle? It's in the sky."],
            rounds: [
              { seconds: 75, say: "Partner 1: tell your animal talk. The listener counts the animals on their fingers and asks one question." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 45, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "After each round, line B moves one step to the left: a new partner for every round.",
              "Then line B talks, with the same three rounds.",
            ],
            feedback: fixPlural,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity for children in grades 2-4. The new partner keeps the repetition real, and both lines talk, so every child speaks in six rounds. 4-3-2 builds fluency, not accuracy, so the one-minute fix between round 1 and 2 is where the plural -s gets better. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and join two with 'and'.", frames: ["I see two ___, and ___.", "They live in the ___."] },
              { level: "Core", task: "Say four or five joined sentences without the board.", frames: ["There are ___ ___, but ___.", "The ___ live in the ___ because ___."] },
              { level: "Stretch", task: "Add a question and a reason: 'There are five fish in the pond because it is cool. Do you see the foxes?'" },
            ],
          },
        },
        {
          after: "Many animals: plurals game (SB 55 F)",
          slide: {
            kind: "writing",
            title: "Join the animals with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences and the joining word in brackets.",
              "Make ONE sentence with that word. Say it first, then write it.",
              "Read your sentence to your partner. Is the -s there? Is the joining word there?",
            ],
            items: [
              { q: "I see a frog. I see a fish. (and)", answer: "I see a frog and a fish." },
              { q: "Frogs live in a pond. Fish live in a pond. (and)", answer: "Frogs and fish live in a pond." },
              { q: "The mouse is small. The mouse is fast. (but)", answer: "The mouse is small, but it is fast." },
              { q: "Foxes sleep in the woods. They eat mice at night. (and)", answer: "Foxes sleep in the woods, and they eat mice at night." },
              { q: "The fish stay in the pond. The pond is safe. (because)", answer: "The fish stay in the pond because it is safe." },
            ],
            checklist: ["Only one 'I see' or 'live' in my sentence", "'and', 'but' or 'because' joins the two ideas", "Many things: -s, -es, mice or fish", "A comma before 'but' and 'and' when the sentence has two parts"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining has good research support as a way to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I see'. Items 3 to 5 join two whole ideas, which is the step up for grades 2-4. Foxes also practises the -es ending.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the teacher." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Do all five, then join three animals and add a reason: 'I see frogs, fish and mice because the pond is full.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u05-l5": {
      objectives: ["I can ask and answer 'Where's the ___? Where are the ___?' three times, with joined sentences, faster."],
      trim: { "Remember it!": 5 },
      drop: ["Hide and find the animals", "Hands, feet and heads"],
      add: [
        {
          after: "Grammar: Where's ... ? Where are ... ?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: ask it, answer it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it, answer with It's or They're, say no, and join it with and, but or because. Then ask about real things.",
            chunks: [
              "The squirrel is next to the tree.",
              "Where's the squirrel? It's next to the tree.",
              "Where are the squirrels? They're next to the tree.",
              "The squirrel isn't under the tree. It's next to it.",
              "The mice aren't in the nest, but the chicks are.",
              "Where's my pencil, and where are my erasers? My pencil is on the desk, and my erasers are in my bag.",
              "Where are you? I'm next to the window, and we're near the door.",
            ],
            recycle: ["I see two frogs in the pond.", "Where's the eagle? It's in the sky."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'and', 'but' or 'because', change = one or many). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we and he / she." },
              { seconds: 90, say: "Real talk: ask your partner where their things are (shoes, hat, books, friends). Answer with the full short answer and one more sentence with 'and' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Where's or Where are, X = say it with isn't or aren't, + = add 'and ___', 'but ___' or 'because ___'.",
              "Say the WHOLE new sentence. One thing: Where's / It's. Many things: Where are / They're.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Where's the mice?' or 'It are next to the tree'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask where your partner's things really are, and remember one answer to tell the class.",
            ],
            prompts: ["The fox is under the tree. (?)", "The mice are in the field. (X)", "The chicks are in the nest. (+ the eagle)", "She is next to the window. (? then X)", "The squirrel is on the log. (change to: many squirrels)"],
            feedback: "Prompt, do not tell: for 'Where's the mice?' hold up two fingers and say 'Where ...?'; for 'They is next to the tree.' hold up two fingers and wait for 'are'; for 'It are in the nest.' repeat it with a rising voice and let the child fix it. Say every 's, 're, isn't and aren't clearly yourself.",
            teacherNote: "This is the lesson's second look at one grammar point, so the drill goes faster and further than in Lesson 3: more persons, negatives and joining words. Round 3 has children talk about where their own things are, so the form is used for meaning. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and answers with I and one thing, with the frames on the board.", frames: ["Where's the ___?", "It's next to / in / on / under the ___."] },
              { level: "Core", task: "Change every sentence: one or many, ask it, say it in the negative, with I, you and we." },
              { level: "Stretch", task: "Use he / she, join the ideas and give a reason: 'Where's {s1}? She's next to the window because she likes the sun.'", frames: ["She's / He's ___ because ___."] },
            ],
          },
        },
        {
          after: "Animal map: where are they?",
          slide: {
            kind: "fluency",
            title: "Animal map again: three tries",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same animal map talk three times with new partners, with joined sentences. Each time, say it more smoothly.",
            chunks: [
              "Where's the frog? It's on a log, and the log is in the pond.",
              "Where are the frogs? They're in the pond because it is wet.",
              "Where's the squirrel? It's next to the tree, but the mice are under the leaves.",
              "Where are the mice? They're under the leaves. Is the fox near them?",
            ],
            recycle: ["Watch out! It's a hive, and it is full of bees.", "Three foxes sleep in the woods, but two mice sleep in the field."],
            rounds: [
              { seconds: 75, say: "Partner 1: use the animal map. Ask and answer about every animal, and add a second fact." },
              { seconds: 60, say: "New partner. The same map, a little faster." },
              { seconds: 45, say: "New partner. Can you do it without stopping?" },
            ],
            steps: [
              "Look at the animal map. Ask 'Where's the ...?' for one animal and 'Where are the ...?' for two or more.",
              "Answer with 'It's ...' or 'They're ...' and add a second fact with 'and', 'but' or 'because'.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes on the board, then go on.",
              "Change partners when you hear the bell. Both partners ask and answer in every round. The listener ticks each question and answer they hear.",
            ],
            feedback: fixWhere,
            teacherNote: "Task repetition: the same task with new partners makes the grammar automatic without making it boring. Both partners ask and answer in every round. Spacing matters, so mix in one old phrase from Unit 4 or the warning phrases from Lesson 4. Listen for 'Where's' versus 'Where are', for the final -s and for the joining words.",
            tiers: [
              { level: "Support", task: "Use the frames, point to the map and join two sentences with 'and'.", frames: ["Where's the ___? It's ___, and ___.", "Where are the ___? They're ___."] },
              { level: "Core", task: "Ask and answer with a second fact, without looking at the frames.", frames: ["It's ___ because ___.", "They're ___, but ___."] },
              { level: "Stretch", task: "Add a comment and a new question: 'Where's the frog? It's on a log. Be careful! Is the fox near it?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Find my animals: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to each animal and its place. Circle 'and', 'because' and 'but'.",
              "Plan: write four key words in the boxes (three animals and a hidden animal). A drawing is optional. Say a sentence for each box.",
              "Write: four to six sentences, with the frames. The last box is a question and its answer.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop or question mark.",
              "Teacher: look only at Where's / Where are, the plural -s and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: { title: "Model: Find my animals", text: "The squirrel is next to the big tree, and the mice are under the leaves. The frogs are in the pond because they like water. Where's the fox? It's on the rock, but the mice don't see it! Where are the chicks?" },
            organiser: [
              { label: "Squirrel", prompt: "Write one animal and its place. Say where it is." },
              { label: "Mice", prompt: "Write two or more animals and their place." },
              { label: "Why", prompt: "Write one reason with 'because'." },
              { label: "Question", prompt: "Write a hidden animal and a question: where is it?" },
            ],
            frames: ["The ___ is ___ the ___, and the ___ are ___ the ___.", "The ___ are ___ the ___ because ___.", "Where's the ___?", "It's ___ the ___, but ___!"],
            checklist: ["One thing: Where's / is. More than one: Where are / are", "The -s on more than one animal", "A capital letter at the start and a full stop, ? or ! at the end", "At least two joining words: and, because or but"],
            sayIt: "Read your paragraph to your partner. Your partner says where the hidden animal is.",
            teacherNote: "Mark only three things (Where's / Where are, the plural -s and the joining words) and let the child find the mistake from your dot. The paragraph can be the script for the recorded talk at home.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in one animal each; join them with 'and'.", frames: ["The ___ is ___ the ___, and the ___ are ___ the ___."] },
              { level: "Core", task: "Write four or five sentences, with 'and' or 'because' and a question at the end." },
              { level: "Stretch", task: "Write five or six sentences and add a fourth animal with 'next to' or 'on', and a sentence with 'but'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Where are the toys?",
        prompt: "Hide one toy animal and two more toy animals at home. Ask 'Where's the ___?' and 'Where are the ___?', answer with a joined sentence, and show the answers to the camera.",
        length: "60-90 seconds",
        steps: [
          "Hide one toy and two other toys in a place at home.",
          "Practise your questions and answers three times, a little faster each time. Add 'and', 'but' or 'because' to your answers.",
          "Record it once. Show each place as you talk. End with a question for the viewer.",
          GROWN_UP,
        ],
        maxSeconds: 150,
        kidSummary: "Ask where one thing is and where many things are, and answer with in, on, under or next to. Join your ideas with and, but or because, and ask a question at the end.",
        words: ["in", "on", "under", "next to", "nest", "pond", "tree"],
        grammar: ["Where's the ___? It's ___ the ___, and ___.", "Where are the ___? They're ___ the ___ because ___."],
        rubric: [
          { label: "Where's / Where are", description: "Asks about one and about many things correctly.", weight: 3 },
          { label: "Place words", description: "Uses in, on, under or next to in the answers.", weight: 2 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because, or asks a question to the viewer.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops about two or three things.", weight: 3 },
          { label: "Clear endings", description: "The 's, 're and the final -s can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Where's the ___?", "It's ___ the ___, and ___."], tips: ["Point to each place."] },
          { level: "Core", who: "Most children", frames: ["Where's the ___? It's ___ the ___, and ___.", "Where are the ___? They're ___ the ___ because ___."], tips: ["Ask about one thing and about two things, and add a second fact."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Where's the ___? It's ___ the ___, but ___.", "Watch out! Be careful! Where are the ___?"], tips: ["Ask your grown-up a question, add a warning and say why."] },
        ],
      },
    },
  },
};
