import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 7 "Seasons All
// Year" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10). Every lesson gets a grammar drill (change the sentence fast: ask it, say
// no, join it, then use it for real) and a fluency routine (weather and season sentences
// joined with and, but and because, said again and again a little faster each round, with
// Unit 6's phrases mixed back in). Sentence writing has four or five items; lessons 2, 3
// and 5 have a planned paragraph. Lessons 2 and 5 end with a recorded talk for home
// (Lesson 4 already has its season vlog). Time comes from dropping games for younger
// children and from repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('It snow...?'), point to the frame, or hold up a finger for the missing -s ('It gets hot' / 'It snows'); for 'It doesn't snows', hold up a finger and say 'doesn't plus...?' so the child takes the s off. For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('gets', 'snows', 'rains'): children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u07-l1": {
      objectives: ["I can say 'It's hot, and I like it!' and 'Is it cold? No, it isn't, but it's cool.' fast, without stopping."],
      trim: { "Watch and wow (SB 67 A)": 5, "Time words and weather words (SB 68 C)": 5 },
      drop: ["Freeze and show", "Whisper chant"],
      add: [
        {
          after: "Mime and guess",
          slide: {
            kind: "fluency",
            title: "Grammar drill: is it, it isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the weather sentence fast and right: say it, ask it, say no, join it. Then talk about real weather.",
            chunks: [
              "It's hot today.",
              "Is it hot today? Yes, it is.",
              "No, it isn't. It's cold.",
              "It isn't snowy, but it's cold.",
              "It's sunny and warm, so I like it.",
              "Is it rainy and cold? No, it isn't.",
            ],
            recycle: ["I take care of the orangutan.", "What's this? It's a ball."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher shows a weather card and a sign (? = ask it, X = say it with isn't, + = join it with and or but). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A shows a weather card and a sign card, B says the new sentence. Swap at the clap. Change the time too: today, in summer, in winter." },
              { seconds: 90, say: "Real talk: look out of the window and ask your partner about the weather today and about their favorite season. Answer with the short answer and one more sentence." },
            ],
            steps: [
              "Look at the card and the sign. Change the sentence: ? = ask it ('Is it hot?'), X = say no ('It isn't hot.'), + = join it ('It's hot, and I like it.').",
              "Say the WHOLE new sentence. Keep the little words 'it's', 'is' and 'isn't'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'It hot' or 'Yes, it's'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about the real weather and about your partner's favorite season, and remember one answer to tell the class.",
            ],
            prompts: ["It's hot. (?)", "It's rainy. (X)", "It's cold. (+ but it's sunny)", "Is it warm? (answer: Yes + because)", "It's snowy. (X + but)"],
            feedback: "Prompt, do not tell: for 'It hot.' hold up one finger and say 'It...?'; for 'Yes, it's.' repeat it with a rising voice and let the child fix it to 'Yes, it is.'; for 'It no hot' point to the X card and say 'isn't...?'. Say the 'is' and the n't clearly yourself.",
            teacherNote: "The drill only helps when the last step is real: in round 3 the children talk about the weather they can see and the season they like, so the forms carry meaning. Grades 2-4 can take the full set: statements, questions, short answers, 'isn't', and a joined sentence with 'and' or 'but'. Vietnamese has no 'be' verb here, so 'It hot' is the most common slip. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use ? and X with 'it', with the frames on the board.", frames: ["Is it ___? Yes, it is.", "It isn't ___. It's ___."] },
              { level: "Core", task: "Change every sentence, and join two ideas with 'and' or 'but'." },
              { level: "Stretch", task: "Add 'because' and ask a question back: 'I like summer because it's hot. Do you like summer?'" },
            ],
          },
        },
        {
          after: "My favorite season (Think, SB 69)",
          slide: {
            kind: "fluency",
            title: "Weather sprint: Is it hot?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole joined sentence, fast and smooth, with no stops. Then ask your friend a question.",
            chunks: [
              "It's hot, and I like it!",
              "Is it cold? No, it isn't, but it's cool.",
              "Is it rainy? Yes, it is, so I take an umbrella.",
              "My favorite season is summer because it's hot.",
            ],
            recycle: ["I take care of the orangutan.", "What's this? It's a ball."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a weather card, the class says the whole joined sentence." },
              { seconds: 60, say: "Pairs: one shows a card and asks 'Is it ___?', the other answers and adds one more sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many joined sentences can you say?" },
            ],
            steps: [
              "Look at the weather card. Make the face and say a WHOLE sentence with 'and', 'but' or 'because'.",
              "Listen for the clap: it means change.",
              "In round 3, count your joined sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often 'Yes, it's' or 'It hot') and let the class fix them; then go on.",
            ],
            prompts: ["(card: hot)", "(card: cold)", "(card: rainy)", "(card: snowy)", "(card: warm)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'It's hot, and I like it!' is one smooth piece. Listen for 'It hot' (the be verb is missing, as in Vietnamese) and for 'Yes, it's': the short answer is 'Yes, it is.' Point to the frame on the board rather than saying it for the child. Mix in a Unit 6 card ('I take care of the orangutan.') every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, with the frame on the board.", frames: ["It's ___, and I like it!", "Is it ___? Yes, it is."] },
              { level: "Core", task: "Say a joined sentence alone, without looking at the board: 'It's cold, but I like it!'", frames: ["It's ___, but ___."] },
              { level: "Stretch", task: "Say it with 'because' and ask your friend: 'I like winter because it's cold. Do you like winter?'", frames: ["I like ___ because it's ___. Do you like ___?"] },
            ],
          },
        },
        {
          after: "What will we read? (SB 69 E)",
          slide: {
            kind: "writing",
            title: "Grow my weather sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the word in the brackets, then join the second idea with the joining word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see snow. (add: white; and: it's cold)", answer: "I see white snow, and it's cold." },
              { q: "It's cold. (add: in winter; and: I wear a coat)", answer: "It's cold in winter, and I wear a coat." },
              { q: "The sun is hot. (add: big; but: the wind is cool)", answer: "The big sun is hot, but the wind is cool." },
              { q: "I like summer. (because: it's sunny)", answer: "I like summer because it's sunny." },
              { q: "It's sunny. (then: it's rainy)", answer: "It's sunny, and then it's rainy." },
            ],
            frames: ["I see ___ snow, and ___.", "It's ___ in ___, but ___.", "I like ___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "It's: I can hear the little 's'", "I joined two ideas with and, but or because"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board for the first three items.", frames: ["I see ___ snow, and ___."] },
              { level: "Core", task: "Write all five big sentences, with one joining word in each." },
              { level: "Stretch", task: "Write two sentences of your own with 'because' and 'but': 'I like summer because it's hot, but I don't like rain.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u07-l2": {
      objectives: ["I can tell about the four seasons with joined sentences, faster each time."],
      drop: ["Four corners", "Whisper chant", "Slap the season"],
      add: [
        {
          after: "Reading detectives",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, join it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the season sentence fast and right: ask it, say no, join it with 'and', 'but' or 'because'. Then ask about real seasons.",
            chunks: [
              "In spring, it gets warm.",
              "What's the weather like in spring? It gets warm.",
              "It isn't hot in winter. It's cold.",
              "In summer it's hot, but in winter it's cold.",
              "It gets cool in fall, and I wear a jacket.",
              "I like fall because I see red leaves.",
            ],
            recycle: ["Is it cold? No, it isn't.", "I put out food for the baby."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a season sentence and shows a sign (? = ask 'What's the weather like in ___?', X = say it with isn't, + = add 'and', 'but' or 'because'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the season too: spring, summer, fall, winter." },
              { seconds: 90, say: "Real talk: ask your partner about their favorite season: the weather, what they see and why they like it. Answer with a full sentence and one more." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask the question, X = say it with isn't, + = add 'but', 'and' or 'because'.",
              "Say the WHOLE new sentence. Keep the little 's' in 'gets' and 'it's'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'It get cool' or 'In summer hot') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's favorite season and remember one answer to tell the class.",
            ],
            prompts: ["In spring, it gets warm. (?)", "It's hot in summer. (X: winter)", "It gets cool in fall. (+ and I wear a jacket)", "In winter, it gets cold. (+ but I like it)", "I like summer. (+ because)"],
            feedback: "Prompt, do not tell: for 'It get cool' hold up a finger and say 'It get...?' with the -s long; for 'In summer hot' point to the frame and say 'In summer, it...?'; for a missing joining word tap your wrist and wait. Say every final -s clearly yourself.",
            teacherNote: "The story's sentences become the drill: statements with 'gets', a question, 'isn't', and a joined sentence with 'and', 'but' or 'because'. Round 3 has children tell what they really see and like, so the forms are used for meaning. Grades 2-4 can take the full set. The 'does it get...?' question comes in the next lesson; this lesson stays with 'What's the weather like?'.",
            tiers: [
              { level: "Support", task: "Use ? and X with 'it', with the frames on the board.", frames: ["In ___, it gets ___.", "It isn't ___ in ___. It's ___."] },
              { level: "Core", task: "Change every sentence and join two ideas with 'and' or 'but'.", frames: ["In ___ it's ___, but in ___ it's ___."] },
              { level: "Stretch", task: "Add 'because' and ask a question back: 'I like fall because I see red leaves. Do you like fall?'" },
            ],
          },
        },
        {
          after: "My favorite season: tell a friend",
          slide: {
            kind: "fluency",
            title: "Four seasons: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell about the four seasons three times with joined sentences. Each time is smoother and faster. Then ask your partner a question.",
            chunks: [
              "In spring, it gets warm, and I see flowers.",
              "In summer, it's hot and sunny, but I like it.",
              "In fall, it gets cool, so I wear a jacket.",
              "In winter, it gets cold, and I wear a big coat.",
              "What's your favorite season? Why?",
            ],
            recycle: ["I put out food for the baby.", "I teach the baby to climb."],
            rounds: [
              { seconds: 70, say: "Tell your partner about the four seasons. Use the four picture cards and join each season's sentence with 'and', 'but' or 'so'." },
              { seconds: 60, say: "New partner. Tell it again in less time. End with a question: 'What's your favorite season?'" },
              { seconds: 50, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the four cards in a row: spring, summer, fall, winter. Point and talk.",
              "Teacher: after round 1, stop for one minute. Put two sentences you heard with a mistake on the board; the class fixes them; then go on.",
              "When the bell rings, find a new partner. Both partners tell it in every round.",
              "The listener answers the question at the end and gives a thumbs up.",
            ],
            prompts: ["(card: spring flowers)", "(card: summer sun)", "(card: fall leaves)", "(card: winter snow)"],
            feedback: correct,
            teacherNote: "The same four joined sentences three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Both partners talk in every round. Listen for 'it get warm' (the -s on gets) and for a missing 'it's' in 'In summer hot'. Keep the four cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one joined sentence for it.", frames: ["In spring, it gets ___, and I ___.", "In summer, it's ___, but ___.", "In fall, it gets ___, so I ___.", "In winter, it gets ___, and I ___."] },
              { level: "Core", task: "Add what you see: 'In spring, it gets warm, and I see flowers.' Tell all four seasons without the frames." },
              { level: "Stretch", task: "Add why and ask a question: 'I like fall because I can jump in the leaves. What about you?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, join it",
          slide: {
            kind: "writing",
            title: "My favorite season: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to each sentence and find the joining words (and, because, but).",
              "Plan: write a key word in each of the four boxes (a drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences. Start with My favorite season is ___. Join two ideas with and, but or because.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, full stops and the -s in gets. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Fall",
              text: "My favorite season is fall. It gets cool in fall, and I wear a jacket. I see red and yellow leaves on the ground. I like to jump in the leaves because it is fun. In winter it gets cold, but fall is my favorite!",
            },
            organiser: [
              { label: "Season", prompt: "Write the name of your favorite season. Draw it if you like." },
              { label: "Weather", prompt: "Is it hot, cold, warm or cool? Write two key words and what you wear." },
              { label: "I see", prompt: "Write or draw two things you see in that season." },
              { label: "I like and why", prompt: "Write what you like to do and one key word for why." },
            ],
            frames: ["My favorite season is ___.", "It gets ___ in ___, and I ___.", "I see ___.", "I like to ___ because ___.", "In ___ it gets ___, but ___."],
            checklist: ["Four to six sentences: season, weather, what I see, what I like and why", "A capital letter at the start and a full stop or ! at the end of each sentence", "It gets: I can hear the little 's'", "I joined two ideas with and, but or because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A paragraph for grades 2-4: a first sentence that names the season, then weather, what I see and what I like, planned with key words (a drawing is a good extra). It replaces the caption slide, so the lesson's reading words feed straight into it. The paragraph can be the script for the recorded talk at home (My season at home). Mark only capital letters, full stops and the -s on gets; the child finds the mistake from your dot, and a joined sentence is the stretch.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each, then add 'I see ___.'", frames: ["My favorite season is ___.", "It gets ___ in ___.", "I like to ___ because ___."] },
              { level: "Core", task: "Write four or five sentences with at least one 'and' or 'but'." },
              { level: "Stretch", task: "Write six sentences and use 'because' twice: 'I like fall because I can jump in the leaves.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My season at home",
        prompt: "Show a picture or a real thing from one season. Tell us what the weather is like, what you see, and why you like it.",
        length: "60-90 seconds",
        steps: [
          "Choose one season. Draw a picture or find something from it.",
          "Say your season talk three times to a grown-up or a toy. Each time a little faster, like in class. Use 'and', 'but' or 'because'.",
          "Record it once. Smile and look at the camera. End with a question for your friends: 'What's your favorite season?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what the weather is like in your season, say what you see and why you like it, join your ideas, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "hot", "cold", "warm", "cool"],
        grammar: ["In ___, it gets ___.", "In ___, it's ___, but ___.", "I like ___ because ___."],
        rubric: [
          { label: "Season and weather", description: "Names a season and says what the weather is like.", weight: 3 },
          { label: "Season words", description: "Uses words from the unit: spring, summer, fall, winter, hot, cold, warm, cool.", weight: 2 },
          { label: "Joins ideas", description: "Joins ideas with and, but or because, or asks a question at the end.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Gets and it's", description: "Says 'it gets' or 'it's' correctly; the -s in 'gets' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In ___, it's ___, and I see ___.", "I like ___."], tips: ["Hold up your picture and point to it."] },
          { level: "Core", who: "Most children", frames: ["In ___, it gets ___, and I ___.", "It's ___, but ___.", "I like ___ because ___."], tips: ["Say five or six sentences and join two of them."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In ___ it gets ___, but in ___ it gets ___.", "My favorite season is ___ because ___. What about you?"], tips: ["Compare two seasons, say why, and ask a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u07-l3": {
      objectives: ["I can say what happens in a season: 'It snows in the winter, but it doesn't snow in the summer.'"],
      drop: ["Yes or no walk", "Which season am I?"],
      add: [
        {
          after: "Build a sentence",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: say it with -s, ask it with Does, say no with doesn't, join it with 'but'. Then ask about real seasons.",
            chunks: [
              "It snows in the winter.",
              "Does it snow in the winter? Yes, it does.",
              "It doesn't snow in the summer.",
              "Does it get hot in the winter? No, it doesn't.",
              "It gets hot in the summer, but it doesn't snow.",
              "It rains in the spring, and it gets warm.",
            ],
            recycle: ["Is it cold? No, it isn't.", "I take care of the orangutan."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Does, X = say it with doesn't, + = add 'but' or 'because'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the season or the weather too: rain, snow, hot, cool." },
              { seconds: 90, say: "Real talk: ask your partner about your city and about their favorite season: 'Does it snow in your favorite season? Do you like it? Why?' Answer with the short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, + = add 'but I ...' or 'because ...'.",
              "Say the WHOLE new sentence. Put the -s on gets and snows, and take it off after doesn't and Does.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does it snows?' or 'It doesn't snows'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about the real seasons and the real weather, and remember one answer to tell the class.",
            ],
            prompts: ["It snows in the winter. (?)", "It gets hot in the summer. (X)", "It rains in the spring. (? then X)", "It gets cool in the fall. (+ because I wear a jacket)", "It rains in the summer. (X + but it gets hot)"],
            feedback: "Prompt, do not tell: for 'Does it snows?' hold up one finger and say 'Does it...?' and wait for the bare word; for 'It doesn't snows' hold up a finger and say 'doesn't plus...?'; for 'It snow' hold up a finger for the -s. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about the seasons they really know, so the form is used for meaning. Grades 2-4 can take the full set: statements with -s, questions with Does, short answers, doesn't, and 'but' or 'because'. The Stretch children try he and she (She likes ...; She doesn't like ...). Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'it', with the frames on the board.", frames: ["Does it ___ in the ___? Yes, it does.", "It doesn't ___ in the ___."] },
              { level: "Core", task: "Change every sentence, with it, and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she with -s, and add 'because': 'She doesn't like the winter because it gets cold.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "writing",
            title: "Winter and summer: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to what happens in the winter, what doesn't happen in the summer, and the joining words (and, because, but).",
              "Plan: write a key word in each of the four boxes (a drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences with the frames. Join two ideas with and, but or because.",
              "Check: tick the checklist. Your partner looks at every -s on gets and snows, and at every joining word.",
              "Teacher: look only at the -s after it and the bare word after doesn't. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Winter and summer",
              text: "In the winter it gets cold, and it snows. I wear a big coat because I don't like to be cold. In the summer it doesn't snow, but it gets very hot. I like to swim in the sea, and I eat ice cream. Which season do you like?",
            },
            organiser: [
              { label: "Winter", prompt: "Write two key words for winter. What happens? Draw it if you like." },
              { label: "What I wear", prompt: "Write what you wear in the winter and one key word for why." },
              { label: "Not in summer", prompt: "Write one thing that does not happen in the summer. Say: It doesn't ___." },
              { label: "Summer", prompt: "Write two key words for summer: the weather and what you like to do." },
            ],
            frames: ["In the winter it gets ___, and it ___s.", "I wear ___ because ___.", "In the summer it doesn't ___, but it gets ___.", "I like to ___, and I ___."],
            checklist: ["Four to six sentences: winter, what I wear, not in summer, summer", "A capital letter at the start and a full stop or ? at the end of each sentence", "It gets, it snows: the -s is there. After doesn't: no -s", "I joined two ideas with and, but or because"],
            sayIt: "Read your paragraph like a weather reporter. Then tell it again without looking.",
            teacherNote: "Vietnamese verbs have no endings, so the -s on gets and snows is this class's most common slip, and the bare word after doesn't is the other side of the same rule. This paragraph replaces the fix-it slide; the checklist line on -s does the same job inside the child's own writing. Mark only those two targets with a dot; a sentence joined with 'but' or 'because' is the stretch.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each, then add a sentence with 'and'.", frames: ["In the winter it gets ___.", "In the summer it doesn't ___."] },
              { level: "Core", task: "Write four or five sentences: winter, then summer, with 'but' once." },
              { level: "Stretch", task: "Add a sentence about another season and use 'because': 'In the spring it rains and it gets warm, so I like the spring because I see flowers.'" },
            ],
          },
        },
        {
          after: "Now tell your partner (SB 73 E)",
          slide: {
            kind: "fluency",
            title: "Season chain: what about the winter?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Say a joined sentence, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "It gets hot in the summer, but it doesn't snow.",
              "It snows in the winter, and I wear a big coat.",
              "It doesn't snow in the summer because it gets hot.",
              "What about the winter? What do you do?",
            ],
            recycle: ["What's this? It's a ___.", "I miss my friend."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a season card." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your season card so only you can see it.",
              "Say a joined sentence about your card: 'It snows in the winter, and I wear a big coat.' Then ask the friend on your left: 'What about the summer?'",
              "They say what happens, or what doesn't, and join it: 'It doesn't snow in the summer, but it gets hot.' Then they ask the next friend.",
              "Teacher: after the first time round the circle, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["It ___s in the ___, and ___.", "It doesn't ___ in the ___, but ___.", "What about the ___?"],
            feedback: correct,
            teacherNote: "The chain makes every child say a 'does' sentence and a 'doesn't' sentence many times in a few minutes, which is what makes the -s and the bare word after 'doesn't' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'It snow' (hold up a finger and say 'It snow...?') and 'It doesn't snows' (say 'doesn't plus...?' and wait).",
            tiers: [
              { level: "Support", task: "Say the sentence from your card with the frame on the board.", frames: ["It ___s in the ___.", "It doesn't ___ in the ___."] },
              { level: "Core", task: "Say a joined sentence and ask the next friend, without looking at the board: 'It gets hot in the summer, but it doesn't snow.'" },
              { level: "Stretch", task: "Say both together, add why, and ask a new question: 'It doesn't snow in the summer because it gets hot. What about the spring?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u07-l4": {
      objectives: ["I can tell about my favorite season three times, with joined sentences, faster each time."],
      trim: { "Look out the window": 3 },
      drop: ["Weather charades", "Add a y", "Whisper chant"],
      add: [
        {
          after: "Do you want to play? (SB 75 E, Track 1•53)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: invite, accept, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the invitation fast and right: ask it, say yes, say no with a reason. Then invite your partner for real.",
            chunks: [
              "Do you want to play in the park with me?",
              "Sure! Let's go!",
              "No, thanks. It's rainy today.",
              "It's sunny, so I want to play in the park.",
              "I don't want to play outside because it's cold.",
              "Do you want to play in the snow? It's fun!",
            ],
            recycle: ["In winter, it gets cold.", "It doesn't snow in the summer."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher shows a weather card and a sign (? = invite with 'Do you want to play in the ___ with me?', X = say no with a reason, + = add 'because' or 'so'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A shows a weather card and a sign card, B says the new sentence. Swap at the clap. Change the place too: park, garden, snow, rain." },
              { seconds: 90, say: "Real talk: invite your partner to do something this weekend. Look at the weather and say yes or no with a real reason. Answer with a full sentence and one more." },
            ],
            steps: [
              "Look at the weather card and the sign. Change it: ? = invite ('Do you want to play in the park with me?'), X = say no ('No, thanks. It's rainy.'), + = add 'so' or 'because'.",
              "Say the WHOLE new sentence. Keep 'do you want to' smooth and fast.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'You want play?' or 'Yes, I want'), fix them together, then go on.",
              "In round 3 the drill becomes real: invite your partner for real and remember the answer to tell the class.",
            ],
            prompts: ["(card: sunny, park) ?", "(card: rainy) X", "(card: snowy) ? then Sure!", "(card: cold) X + because", "(card: warm) + so I want to play"],
            feedback: "Prompt, do not tell: for 'You want play?' hold up one finger and say 'Do...?'; for 'Yes, I want' say 'Sure!' with a nod and let the child echo it; for a missing 'to' tap your wrist. Say 'do you want to' clearly and a little fast yourself.",
            teacherNote: "The lesson's invitation becomes the drill: ask, accept, say no with a reason, and join it with 'so' or 'because'. Round 3 has children invite each other for real, so the form is used for meaning. Grades 2-4 can take the full set. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use ? and the answers 'Sure!' and 'No, thanks.' with the frames on the board.", frames: ["Do you want to play in the ___ with me?", "Sure! / No, thanks. It's ___."] },
              { level: "Core", task: "Say no with a reason and join it with 'because' or 'so'." },
              { level: "Stretch", task: "Say no and suggest something else: 'No, thanks. It's rainy, but I want to play inside. Do you want to play a game?'" },
            ],
          },
        },
        {
          after: "Put two words together (SB 75 F)",
          slide: {
            kind: "writing",
            title: "Listen, then write: my summer",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Teacher: say the short rule first: 'It doesn't snow.' Say it, point to 'snow' with no -s. Then read the text at normal speed. Children only listen.",
              "Read it again. Children write the words they remember, or draw and label.",
              "Pairs put their words together to build the text, then check it against the board. Look for the joining words (so, but, because).",
            ],
            text: {
              title: "My summer",
              text: "In summer it is hot and sunny, so I swim in the sea with my family. It doesn't snow in summer, but it rains a lot in the afternoon. I love summer because I can play outside with my friends!",
            },
            frames: ["My favorite season is ___.", "It's ___ and ___, so I ___.", "I like to ___ because ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end of each sentence", "It doesn't snow: no -s after doesn't", "so, but, because: I put them in the right place"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "The text is ours, not the book's; keep it folded until the pairs have tried. It has three sentences and three joining words, which is a good length for grades 2-4: children remember sentences by sound and rhythm, and the joining words are what they listen for. Do not mind spelling at first; check words against the board together, then look at capital letters and full stops.",
            tiers: [
              { level: "Support", task: "Write or draw five words you hear, then copy the text from the board." },
              { level: "Core", task: "Build the text with your partner, then check it." },
              { level: "Stretch", task: "Write your own season text with three sentences and the words so, but and because." },
            ],
          },
        },
        {
          after: "Say it before you write it",
          slide: {
            kind: "fluency",
            title: "Favorite season talk: three partners, faster each time",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same season talk to three friends with joined sentences. Each time you talk, it is shorter and smoother. Then ask a question.",
            chunks: [
              "My favorite season is summer because it's hot and sunny.",
              "I see the sun, and I like to swim in the sea.",
              "It doesn't snow in the summer, but it rains in the afternoon.",
              "What's your favorite season? Why?",
            ],
            recycle: ["In winter, it gets cold.", "Do you want to play in the park with me?"],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A tells the season talk, then Partner B. The listener holds up a finger for each joined sentence. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 3: new partner. Partner A tells it fast and smooth, then Partner B. The listener answers the question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) talks first, then Partner B (line B) talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do three rounds. Each round is shorter than the one before. End each talk with the question.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for grades 2-4 (70, 60 and 50 seconds each, both partners talk in every round). The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and from the one-minute fix between round 1 and round 2.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite season is ___.", "It's ___, and I ___.", "I like to ___."] },
              { level: "Core", task: "Say four sentences and join two with 'and' or 'because', without the board." },
              { level: "Stretch", task: "Add what does not happen and ask a question: 'It doesn't snow in the summer, but it gets very hot. What about you?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u07-l5": {
      objectives: ["I can say 'It gets hot in the summer, but it doesn't snow.' fast and right, and ask 'Does it snow?'"],
      drop: ["Sunny Hill season hop", "Sun and snow shake"],
      add: [
        {
          after: "Grammar: It gets, it snows, it doesn't",
          slide: {
            kind: "fluency",
            title: "Grammar drill: gets, snows, doesn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: say it, ask it, say no, join it. Then talk about real seasons and real people.",
            chunks: [
              "It gets cool in the fall.",
              "Does it get cool in the fall? Yes, it does.",
              "It doesn't get hot in the fall.",
              "It rains in the spring, but it doesn't snow.",
              "My sister likes the winter, but she doesn't like the rain.",
              "Does she like the snow? Yes, she does, because it's fun.",
            ],
            recycle: ["It snows in the winter.", "I take care of the orangutan."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with Does, X = say it with doesn't, + = add 'but' or 'because', or change the person: he, she, I). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, we, he, she." },
              { seconds: 90, say: "Real talk: ask your partner about their family and the seasons: 'Does your mom like the winter? Does your brother like the rain?' Answer with the short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask with Does, X = say it with doesn't, + = add 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Put -s on gets, snows and likes after he, she and it; take it off after doesn't and Does.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'She like the snow' or 'Does she likes'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about real people and real seasons, and remember one answer to tell the class.",
            ],
            prompts: ["It gets cool in the fall. (?)", "It snows in the winter. (X)", "It rains in the spring. (+ but it doesn't snow)", "I like the snow. (she)", "He likes the summer. (X + because)"],
            feedback: "Prompt, do not tell: for 'She like the snow' hold up a finger for the -s; for 'Does she likes' hold up a finger and say 'Does she...?' and wait for the bare word; for 'It doesn't gets' say 'doesn't plus...?'. Say the -s and the n't clearly yourself.",
            teacherNote: "This is the grammar of the whole unit in one fast routine, with people as well as weather: it, he and she all take the -s, and Does and doesn't take it away. Round 3 is real: children ask about their own family and the seasons they know. Grades 2-4 can take the full set. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'it', with the frames on the board.", frames: ["Does it ___ in the ___? Yes, it does.", "It doesn't ___ in the ___."] },
              { level: "Core", task: "Change every sentence with it, I and we, and join two ideas with 'but'." },
              { level: "Stretch", task: "Use he and she with -s, and add 'because': 'My brother likes the winter, but he doesn't like the cold because he gets sick.'" },
            ],
          },
        },
        {
          after: "Pine Hill: ask and tell",
          slide: {
            kind: "fluency",
            title: "Sunny Hill: tell it again with a new friend",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about the summer and the winter on Sunny Hill with joined sentences. Same job, new friend, smoother each time. Then ask a question.",
            chunks: [
              "It gets hot in the summer, but it doesn't snow.",
              "It snows in the winter, and it gets cold.",
              "It snows in the winter because it gets cold.",
              "Which season do you like? Why?",
            ],
            recycle: ["I take care of the orangutan.", "Is it cold? No, it isn't."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about summer and winter on Sunny Hill, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again, smoother, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Last time: Partner A, then Partner B. Fast and clear! End with the question." },
            ],
            steps: [
              "Look at the Sunny Hill pictures for summer and winter. Think for one minute: what happens in each season, and what doesn't?",
              "Tell your partner. In each round, Partner A talks first, then Partner B. The listener nods for every joined sentence.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partners when you hear the bell.",
            ],
            prompts: ["(picture: Sunny Hill in summer)", "(picture: Sunny Hill in winter)"],
            feedback: correct,
            teacherNote: "Task repetition with a planning minute: children get one chance to prepare, then do the same job again with a new friend, so the second and third tellings run on ready-made phrases. Both partners talk in every round. Listen for the s on 'gets' and 'snows', and for 'doesn't gets'. Prompt with a finger and wait; do not say the sentence for the child.",
            tiers: [
              { level: "Support", task: "Say two joined sentences, one for each season, with the frames.", frames: ["It gets ___ in the ___, but ___.", "It ___s in the ___, and ___."] },
              { level: "Core", task: "Join them: 'It gets hot in the summer, but it doesn't get hot in the winter.' Say it without the frames." },
              { level: "Stretch", task: "Add 'because' and ask a question: 'It doesn't snow in the summer because it gets hot. Which season do you like?'" },
            ],
          },
        },
        {
          after: "Write it like a champion",
          slide: {
            kind: "writing",
            title: "Two seasons on Sunny Hill: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to what happens, what doesn't happen, what I like and the joining words (but, and, because).",
              "Plan: write a key word in each of the four boxes (a drawing is fine too). Say one sentence for each box to your partner.",
              "Write: four to six sentences with the frames. Join two ideas with and, but or because.",
              "Check: tick the checklist. Your partner points to every -s on gets and snows, and to every joining word.",
              "Teacher: look only at the -s and at doesn't. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Sunny Hill",
              text: "On Sunny Hill, it gets hot in the summer, but it doesn't snow. The children play in the park, and they eat ice cream. In the winter it snows and it gets very cold. They wear big coats because the wind is cold. I like the summer because I love ice cream!",
            },
            organiser: [
              { label: "Summer", prompt: "Write two key words for Sunny Hill in the summer. Draw it if you like." },
              { label: "Not in summer", prompt: "Write what doesn't happen in the summer. Say: It doesn't ___." },
              { label: "Winter", prompt: "Write two key words for Sunny Hill in the winter: what happens and what people wear." },
              { label: "I like", prompt: "Write the season you like best and one key word for why." },
            ],
            frames: ["On Sunny Hill, it gets ___ in the ___, but it doesn't ___.", "The children ___, and they ___.", "In the ___ it ___s and it gets ___.", "I like the ___ because ___."],
            checklist: ["Four to six sentences: summer, not in summer, winter, what I like", "A capital letter at the start and a full stop or ! at the end of each sentence", "It gets, it snows: the -s is there. After doesn't: no -s", "I joined two ideas with and, but or because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "The paragraph replaces the sentence-combining slide, and it is the script for the recorded talk at home (Two seasons talk): the child says it three times to a grown-up. The -s rules from this lesson all live in these sentences. Mark only the -s and doesn't; the child finds the mistake from your dot. A sentence joined with 'but' or 'because' is the stretch.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each, then add 'I like the ___.'", frames: ["It gets ___ in the ___.", "It doesn't ___ in the ___.", "I like the ___."] },
              { level: "Core", task: "Write four or five sentences about two seasons, with 'but' or 'and' at least once." },
              { level: "Stretch", task: "Write six sentences and use 'because': 'I like the summer because it gets hot, but it doesn't snow.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Two seasons talk",
        prompt: "Pick two seasons. Tell us what happens in one, what does not happen in the other, and which one you like. Show your drawing!",
        length: "60-90 seconds",
        steps: [
          "Draw two seasons, side by side, or find two things from home.",
          "Practise your two-season talk three times. Each time a little faster, like in class. Join your ideas with 'but', 'and' or 'because'.",
          "Record it once. Say what gets and what doesn't, and end with a question: 'Which season do you like?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what happens in one season and what doesn't happen in another, join your ideas, and keep talking without long stops.",
        words: ["spring", "summer", "fall", "winter", "snow", "rain", "hot", "cold"],
        grammar: ["It gets ___ in the ___.", "It ___s in the ___.", "It doesn't ___ in the ___."],
        rubric: [
          { label: "Does and doesn't", description: "Says one thing that happens and one thing that doesn't.", weight: 3 },
          { label: "The -s", description: "Says 'it gets' and 'it snows' with the -s, and 'it doesn't snow' with no -s.", weight: 3 },
          { label: "Joins ideas", description: "Joins ideas with and, but or because, or asks a question at the end.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Season words", description: "Uses season and weather words from the unit.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It gets ___ in the ___.", "It doesn't ___ in the ___."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["It gets ___ in the ___, but it doesn't ___.", "It ___s in the ___, and ___."], tips: ["Use two or three sentences for each season."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In the ___ it gets ___, but in the ___ it doesn't.", "I like the ___ because ___. Which season do you like?"], tips: ["Say why you like it, and ask a question at the end."] },
        ],
      },
    },
  },
};
