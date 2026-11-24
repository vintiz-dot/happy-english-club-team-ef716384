import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 3 "Colors All
// Around" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10), so every lesson has a grammar drill, the fluency chunks are longer (joined
// with and, but, because, with a follow-up question) and the writing is fuller.
// Every lesson gets one grammar drill (the unit's key structure changed, asked, answered,
// said in the negative and joined, ending in real talk), one fluency routine (the unit's
// phrases said again and again as whole sentences, a little faster each round, with Unit 2's
// phrases mixed back in) and one writing routine (say it, write it, read it back). Lessons 2
// and 5 end with a recorded talk for home (Lesson 4 already has its own "My colors" video).
// Time comes from games and repeats pitched at younger children, never from the book pages or
// the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('There ... ?'), or hold up a finger for the missing -s. For a sound, just say it right and let them echo it. Say every final -s clearly yourself (birds, frogs, butterflies): children copy what they hear.";

export const odL1U3Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u03-l1": {
      objectives: [
        "I can ask 'What color is it?' and answer fast: 'It's red.'",
        "I can ask 'Is it blue?', say 'No, it isn't', and join two ideas with 'but'.",
      ],
      drop: ["Simon says: colors", "Run and touch", "Rainbow whisper"],
      add: [
        {
          after: "What color is it?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: ask it, say no, join it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, join two ideas with 'but'. Then ask about real things.",
            chunks: [
              "It's a red kite.",
              "Is it a red kite?",
              "Yes, it is. / No, it isn't.",
              "It isn't red, but it's pink.",
              "What color is it? It's blue and green.",
              "They're red balloons. Are they red? Yes, they are.",
            ],
            recycle: ["This is a zebra.", "Do you like animals? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher holds up a picture and says a sentence with a sign (? = ask it, X = say no, + = add 'but it's ___'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing too: kite, ball, bag, balloons (It's / They're)." },
              { seconds: 90, say: "Real talk: ask your partner about real things in the room: 'Is your bag blue? Is your pencil case red?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question ('Is it a red kite?'), X = say no ('It isn't red.'), + = add 'but it's ___'.",
              "Say the WHOLE new sentence. With more than one thing, use 'They're' and 'Are they ...?'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'It red?' or 'No, it not'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has, and remember one answer to tell the class.",
            ],
            prompts: ["It's a red kite. (?)", "It's a blue bag. (X)", "It's a green frog. (X +)", "They're yellow balloons. (?)", "It's a pink hat. (? then answer)"],
            feedback: "Prompt, do not tell: for 'It red?' tap the word 'Is' on the board and say 'Is ... it?'; for 'No, it not' say 'No, it ...?' and wait for 'isn't'; for 'Yes, it's' repeat it with a rising voice and let the child fix it. Say the -s, the 'isn't' and the 'aren't' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about things in the room, so the form is used for meaning. Grades 2-4 can take the full set: question, short answers, negative, 'but' and a change from 'it' to 'they'. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'it', with the frames on the board.", frames: ["Is it a ___ ___?", "No, it isn't. It's ___."] },
              { level: "Core", task: "Change every sentence, with 'it' and 'they': ask, answer, say no and join with 'but'." },
              { level: "Stretch", task: "Join three ideas: 'It isn't red, but it's pink, and I like it because it's pretty.'", frames: ["It isn't ___, but it's ___ because ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: ask it, say no, join it",
          slide: {
            kind: "fluency",
            title: "Color sprint: what color is it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops. Join your ideas with 'and' and 'but'.",
            chunks: [
              "What color is it? It's a red kite.",
              "Is it blue? No, it isn't. It's green.",
              "Is it a blue bird? Yes, it is, and it's big!",
              "It isn't red, but it's orange.",
            ],
            recycle: ["This is a zebra.", "Do you like animals? Yes, I do."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher holds up a crayon, the class asks and answers with a whole sentence." },
              { seconds: 75, say: "Pairs: one holds a crayon behind their back, the other guesses and asks a follow-up question. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many colors can you say in a joined sentence?" },
            ],
            steps: [
              "Look at the crayon. Say the WHOLE sentence: 'It's a red crayon.'",
              "Guess like a detective: 'Is it blue?' 'No, it isn't.' 'Is it green?' 'Yes, it is, and it's long!'",
              "Listen for the clap: it means change.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and the class fixes them; then go on.",
            ],
            prompts: ["(crayon: red)", "(crayon: yellow)", "(crayon: purple)", "(crayon: brown)", "(crayon: black)"],
            feedback: correct + " For example: if a child says 'No, it not', say 'No, it ...?' and wait for 'isn't'.",
            teacherNote: "Whole sentences only, never single words: the aim is 'Is it blue? No, it isn't. It's green.' as one smooth piece. Say the final 't' of 'isn't' and the -s of 'It's' clearly. Mix in a Unit 2 card now and then so last unit's phrases stay fast. Grades 2-4 should join ideas ('and', 'but') and ask a follow-up question without help.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["What color is it?", "It's a ___ ___.", "No, it isn't. It's ___."] },
              { level: "Core", task: "Guess, then say a color thing without the board: 'Is it green? No, it isn't. It's a purple kite!'" },
              { level: "Stretch", task: "Join two ideas and ask a follow-up: 'It isn't red, but it's orange, and it's big. What color is yours?'", frames: ["It isn't ___, but it's ___.", "What color is yours?"] },
            ],
          },
        },
        {
          after: "Which picture? (SB 28 B)",
          slide: {
            kind: "writing",
            title: "My red things: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the color word in every sentence and circle 'and', 'but' and 'because'.",
              "Plan: pick your favorite color. Write key words in the boxes: your color, two things you see, one thing you do not see, one thing you like. A small drawing is fine.",
              "Write: four sentences from the frames. Put the color word BEFORE the thing: a red kite.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, full stops and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: my favorite color",
              text: "My favorite color is red. I see a red kite and a red bird, but I don't see a red cat. I like the red apple because it is sweet. Red is the best color!",
            },
            organiser: [
              { label: "My color", prompt: "Write or draw your favorite color. Say: My favorite color is ___." },
              { label: "I see", prompt: "Key words: two things in that color. Say: I see a ___ ___ and a ___ ___." },
              { label: "I don't see", prompt: "Key word: one thing that is NOT that color. Say: but I don't see a ___ ___." },
              { label: "I like", prompt: "Key words: a thing you like and why. Say: I like the ___ ___ because ___." },
            ],
            frames: ["My favorite color is ___.", "I see a ___ ___ and a ___ ___, but I don't see a ___ ___.", "I like the ___ ___ because ___.", "___ is the best color!"],
            checklist: ["Four sentences: my color, I see, I like, the end", "I joined ideas with 'and', 'but' or 'because'", "The color word comes BEFORE the thing", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then say it again without looking.",
            teacherNote: "A first paragraph for grades 2-4: four sentences, planned with key words (a drawing is optional), joined with 'and', 'but' and 'because'. Children may copy the frames and complete them. This is where 'Grow my color sentence' leads: the same big sentences, now four in a row. In Vietnamese the color comes after the thing, so say 'red kite' with a clap on each word before writing. Mark only capital letters, full stops and the joining words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks, with 'and' in sentence 2.", frames: ["My favorite color is ___.", "I see a ___ ___ and a ___ ___."] },
              { level: "Core", task: "Write four sentences with the frames, using 'and', 'but' and 'because' once each." },
              { level: "Stretch", task: "Add a fifth sentence with 'then' or 'because': 'Then I draw a red heart for my friend!'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u03-l2": {
      objectives: [
        "I can say my favorite color three times, faster each time.",
        "I can say 'I like ___', ask 'Do you like ___?' and say 'I don't like ___, but I like ___'.",
      ],
      drop: ["Freeze and point", "Draw a tree", "Whisper poem"],
      add: [
        {
          after: "My favorite color",
          slide: {
            kind: "fluency",
            title: "Grammar drill: like it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, join two ideas. Then ask about real things.",
            chunks: [
              "I like the blue sky.",
              "Do you like the blue sky?",
              "Yes, I do. / No, I don't.",
              "I don't like the blue sky, but I like the blue sea.",
              "We like red apples because they are sweet.",
              "Do they like green frogs? No, they don't.",
            ],
            recycle: ["That is a lion.", "I like animals."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but I like ___' or 'because ___'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about colors and things they really like. Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'but I like ___'.",
              "Say the WHOLE new sentence. The color comes BEFORE the thing: the blue sky.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you likes' or 'Yes, I like'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really likes, and remember one answer to tell the class.",
            ],
            prompts: ["I like the red kite. (?)", "You like the yellow sun. (X)", "We like green frogs. (+ because)", "They like the blue sea. (X +)", "I like pink flowers. (? then answer)"],
            feedback: "Prompt, do not tell: for 'You like the sky?' hold up one finger and say 'D...?'; for 'Yes, I like.' repeat it with a rising voice and let the child fix it; for 'the sky blue' clap the three words in order and let them reorder. Say the -s on things and the n't of 'don't' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about colors and things they really like, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and 'because', and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you like the ___ ___?", "No, I don't like the ___ ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join with 'but'." },
              { level: "Stretch", task: "Use he and she too, and 'because': 'She likes blue because it's the sea. Does she like gray? No, she doesn't.'", frames: ["She likes ___ because ___.", "Does she like ___? No, she doesn't."] },
            ],
          },
        },
        {
          after: "Grammar drill: like it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Color talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same color talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "My favorite color is blue.",
              "I like the blue sky and the blue sea because they are big.",
              "I don't like gray, but I like my gray cat.",
              "Do you like blue? What's your favorite color?",
            ],
            recycle: ["That is a lion.", "I like animals."],
            rounds: [
              { seconds: 70, say: "Partner 1: tell your color talk with your own color. The listener holds up a finger for each thing you like." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 50, say: "Partner 3: fast and smooth! The listener says 'Nice!' at the end and asks one question." },
            ],
            steps: [
              "Pick your color, two things you like in that color and one thing you do not like. Think of a reason with 'because'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing 'the' or the color after the thing) and fix them together; then go on.",
              "When the bell rings, one line moves one step to the left: a new partner.",
              "Say the same talk again, faster. Do not add new things: say it smoother.",
            ],
            feedback: correct + " For example: if a child says 'I like fish blue', say 'I like the blue ...?' with a pause and let them find 'fish'.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity at the right size for grades 2-4. The new partner keeps the repetition real. The gain comes from saying the same thing more smoothly, so do not add new language between rounds. Listen for the color word going before the thing and for 'and', 'but' and 'because' joining the ideas.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___.", "Do you like ___?"] },
              { level: "Core", task: "Say four or five sentences without the board, with one 'and' or 'but' and a question." },
              { level: "Stretch", task: "Join with 'because' and ask two questions: 'I like the blue sky because it is big. Do you like blue? What do you like?'", frames: ["I like ___ because ___.", "I don't like ___, but I like ___."] },
            ],
          },
        },
        {
          after: "More poems (SB 31)",
          slide: {
            kind: "writing",
            title: "All about my color: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the color before the thing in every sentence and circle 'and', 'because' and 'but'.",
              "Plan: write key words in the boxes: your color, two things you can see outside, one thing you have, one thing you do not have. A small drawing is fine.",
              "Write: five sentences from the frames. The last one is a question for your reader.",
              "Check: tick the checklist. Your partner points to every capital letter and every joining word.",
              "Teacher: look only at the color word before the thing and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: all about blue",
              text: "My favorite color is blue. I like the blue sky and the blue sea because they are big. I have a blue bag, but I don't have a blue hat. Do you like blue? Blue makes me happy!",
            },
            organiser: [
              { label: "My color", prompt: "Write your favorite color. Say: My favorite color is ___." },
              { label: "Outside", prompt: "Key words: two things outside in that color, and why you like them. Say: I like the ___ ___ and the ___ ___ because ___." },
              { label: "My things", prompt: "Key words: one thing you have and one thing you do not have. Say: I have a ___ ___, but I don't have a ___ ___." },
              { label: "My question", prompt: "Key word: ask your reader. Say: Do you like ___?" },
            ],
            frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___ because ___.", "I have a ___ ___, but I don't have a ___ ___.", "Do you like ___?", "___ makes me happy!"],
            checklist: ["Five sentences: my color, outside, my things, a question, the end", "I joined ideas with 'and', 'but' or 'because'", "The color word comes BEFORE the thing", "A capital letter at the start and a full stop, ? or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking. This is also your script for the color video at home.",
            teacherNote: "The paragraph can be the script for this lesson's recorded talk 'My color video'. Five sentences for grades 2-4, planned with key words, joined with 'and', 'but' and 'because'. Children may copy and complete the frames. It follows the poems, the grammar drill and the spoken 'My favorite color' talk, so the words are already in their mouths. Mark only the color before the thing and the joining words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks, with 'and' in sentence 2.", frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___."] },
              { level: "Core", task: "Write five sentences with the frames, using 'because' and 'but' once each." },
              { level: "Stretch", task: "Add a sixth sentence about a friend: 'My friend likes green, but I like blue.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My color video",
        prompt: "Show two things in your favorite color. Say what the color is, what you like and why, one thing you don't like, and ask the watcher a question.",
        length: "60-90 seconds",
        steps: [
          "Find two things at home in your favorite color.",
          "Write three key words on a paper to help you: color, a thing, a reason.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Hold up each thing as you talk.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say your favorite color, say what you like and why, join your ideas with 'and', 'but' or 'because', and ask a question.",
        words: ["red", "blue", "green", "yellow", "purple", "black", "brown", "white"],
        grammar: ["My favorite color is ___.", "I like the + color + thing", "I don't like ___, but I like ___.", "Do you like ___?"],
        rubric: [
          { label: "Favorite color", description: "Says 'My favorite color is ___.' and names at least two things.", weight: 2 },
          { label: "Color before thing", description: "Says 'the blue sky', not 'the sky blue'.", weight: 2 },
          { label: "Joins ideas", description: "Joins two ideas with 'and', 'but' or 'because', or asks the watcher a question like 'Do you like blue?'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear sounds", description: "The sounds at the end of words can be heard: black, red, birds.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite color is ___.", "I like the ___ ___ and the ___ ___.", "Do you like ___?"], tips: ["Hold up your thing as you speak."] },
          { level: "Core", who: "Most children", frames: ["I like the ___ ___ because ___.", "I don't like ___, but I like ___.", "Do you like ___?"], tips: ["Say a reason with 'because' and ask a question at the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I can see ___ in the ___, and I have a ___ ___.", "My friend likes ___, but I like ___ because ___."], tips: ["Say where you see your color and compare it with a friend's."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u03-l3": {
      objectives: [
        "I can say 'There is a ___' and 'There are ___s' fast, round the circle.",
        "I can ask 'Is there a ___?' and 'Are there ___s?', answer, and say 'There isn't a ___, but there are ___s.'",
      ],
      drop: ["What's in the bush?", "One or many? Freeze!"],
      add: [
        {
          after: "Practice with a partner (SB 33 D)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: is there, are there, there isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it in the negative, change one to many. Then ask about the real classroom.",
            chunks: [
              "There's a green frog in the bush.",
              "Is there a green frog? Yes, there is. / No, there isn't.",
              "There are two green frogs.",
              "Are there two green frogs? Yes, there are. / No, there aren't.",
              "There isn't a frog, but there are two birds.",
              "There is a spider and there are three flies.",
            ],
            recycle: ["What color is it? It's red.", "These are zebras."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'but there are ___', 1/2 = change one to two). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use the animal cards for new things." },
              { seconds: 90, say: "Real talk: ask your partner about the classroom: 'Is there a clock? Are there two windows?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = start with Is there or Are there, X = say 'There isn't' or 'There aren't', + = add 'but there are ___', 1/2 = change one thing to two things.",
              "Say the WHOLE new sentence, with -s on things when there is more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have', 'There is two frogs' or 'Yes, there have'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what is really in the room, and remember one answer to tell the class.",
            ],
            prompts: ["There's a black spider. (?)", "There are two green frogs. (X)", "There is a brown hamster. (X +)", "There are three red birds. (? then answer)", "There's a pink flower. (1 -> 2)"],
            feedback: "Prompt, do not tell: for 'There have a frog' say 'There ... ?' and wait for 'is'; for 'There is two frogs' hold up two fingers and say 'There ... ?'; for 'Yes, there have' repeat it with a rising voice and let the child fix it; for a missing -s tap your wrist. Say the 'isn't', the 'aren't' and every -s clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about things really in the room, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, negative and a joined sentence. The question forms are the next step after the book's statements. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'There is', with the frames on the board.", frames: ["Is there a ___ ___?", "No, there isn't."] },
              { level: "Core", task: "Change every sentence, with one thing and many things, and join with 'but'." },
              { level: "Stretch", task: "Ask 'How many' and join with 'and': 'How many windows are there? There are two, and there's a big door.'", frames: ["How many ___s are there?", "There are ___, and there's a ___."] },
            ],
          },
        },
        {
          after: "Grammar drill: is there, are there, there isn't",
          slide: {
            kind: "writing",
            title: "My class zoo: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find 'There is' for one and 'There are' for more, and circle 'and', 'but' and the question.",
              "Plan: write key words in the boxes: one animal with its color, two animals, one animal that is NOT in your zoo, and a question. A small drawing is fine.",
              "Write: four sentences from the frames. Add -s when there is more than one.",
              "Check: tick the checklist. Your partner points to every -s on the animals and every joining word.",
              "Teacher: look only at is/are, the plural -s and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it ('There have' is the classic slip).",
            ],
            text: {
              title: "Model: my zoo",
              text: "In my zoo there is a black spider and there are two green frogs by the door. There are three brown hamsters, but there isn't a pink hamster. Is there a red butterfly? Yes, there is, and it is very big!",
            },
            organiser: [
              { label: "One and two", prompt: "Key words: one animal and two animals with colors. Say: There is a ___ ___ and there are two ___ ___s." },
              { label: "Three", prompt: "Key words: three animals. Say: There are three ___ ___s." },
              { label: "Not here", prompt: "Key words: one animal that is NOT in your zoo. Say: but there isn't a ___ ___." },
              { label: "Question", prompt: "Key words: an animal to ask about. Say: Is there a ___ ___? Yes, there is." },
            ],
            frames: ["In my zoo there is a ___ ___ and there are two ___ ___s by the door.", "There are three ___ ___s, but there isn't a ___ ___.", "Is there a ___ ___?", "Yes, there is, and it is ___!"],
            checklist: ["One thing: There is. More than one: There are", "More than one animal: add -s (frogs, hamsters)", "I joined ideas with 'and' or 'but' and asked a question", "A capital letter at the start and a full stop, ? or ! at the end"],
            sayIt: "Read your zoo to your partner. Then tell it again without looking, pointing to your key words.",
            teacherNote: "This replaces the sentence-fixing slide: children met the same mistakes (There have, There is two, a missing -s) and now use the rule in a paragraph of their own. Four sentences for grades 2-4, planned with key words, with frames: children may copy and complete. It follows the grammar drill, so the question and the negative are fresh. Say every final -s clearly yourself. Mark only is/are, the plural -s and the joining words.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks, leaving out the question.", frames: ["In my zoo there is a ___ ___ and there are two ___ ___s.", "There are three ___ ___s."] },
              { level: "Core", task: "Write four sentences with the frames, using 'and', 'but' and the question." },
              { level: "Stretch", task: "Add a fifth sentence with 'because': 'I love my zoo because it is so colorful.'" },
            ],
          },
        },
        {
          after: "Look around (SB 33 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: what can you see?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What can you see? Look! There's a green frog.",
              "Look! There are two green frogs and a black spider.",
              "Is there a red butterfly? No, there isn't.",
              "There are three blue birds, but there isn't a pink bird.",
            ],
            recycle: ["What color is it? It's red.", "These are zebras."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds an animal card with a number and a color." },
              { seconds: 75, say: "Swap cards. Go faster, and add a follow-up question: 'Is there a ...?'" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left: 'What can you see?'",
              "They look at their card and answer: 'Look! There's a ...' or 'Look! There are two ...' Then they ask a follow-up ('Is there a ...?') and turn to the next friend.",
              "Teacher: after the first round, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["(card: one black spider)", "(card: two green frogs)", "(card: three brown birds)", "(card: one red butterfly)", "(card: four yellow flowers)"],
            feedback: correct + " For example: if a child says 'There is two frogs', hold up two fingers, say 'There ... ?' and wait for 'are'.",
            teacherNote: "The chain makes every child say 'There is' and 'There are' many times in a few minutes, which is what makes the choice automatic. One thing: 'There is' for one, 'There are' for more than one. Vietnamese learners often say 'There have', so say 'There is / There are' yourself, clearly, again and again. Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Answer with the frames on the board and pass the question on.", frames: ["Look! There's a ___ ___.", "Look! There are ___ ___s.", "Is there a ___?"] },
              { level: "Core", task: "Say two things without looking at the board: 'There's a red kite and there are two blue birds.'" },
              { level: "Stretch", task: "Join with 'but' and ask a follow-up: 'There are three blue birds, but there isn't a pink bird. Is there a green one?'", frames: ["There are ___, but there isn't ___.", "Is there a ___ one?"] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u03-l4": {
      objectives: [
        "I can invite a friend and answer: 'Sure! Let's play!'",
        "I can say 'I want to ___', ask 'Do you want to ___?' and say 'I don't want to ___, but I want to ___.'",
      ],
      drop: ["Dark and light", "Catch and say"],
      add: [
        {
          after: "Do you want to play with me? (SB 35 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: want to, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, join two ideas. Then invite your partner for real.",
            chunks: [
              "I want to play with the ball.",
              "Do you want to play with the ball?",
              "Yes, I do. Let's play! / No, I don't.",
              "I don't want to play with the ball, but I want to play with the kite.",
              "We want to see the fireworks because they are pretty.",
              "Do they want to play with us? Yes, they do.",
            ],
            recycle: ["There's a green frog.", "What color is it? It's red."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'but I want to ___' or 'because ___'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: invite your partner for real, 'Do you want to play ___ at break?', and answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'but I want to ___'.",
              "Say the WHOLE new sentence. Keep 'to' in 'want to': I want to play.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'I want play', 'Do you wants to' or 'Yes, I want'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask what your partner really wants to play at break, and remember one answer to tell the class.",
            ],
            prompts: ["I want to play with the ball. (?)", "You want to play with the kite. (X)", "We want to play with cards. (+ because)", "They want to see the fireworks. (X +)", "I want to draw a picture. (? then answer)"],
            feedback: "Prompt, do not tell: for 'I want play' point to the board and say 'I want ... play?' and wait for 'to'; for 'Yes, I want' repeat it with a rising voice and let the child fix it with 'Yes, I d...'; for 'Do you wants' tap the word 'you'. Say the 'to', the 'don't' and the final -s of 'Let's' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children invite each other to something they really want to do, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and 'because', and a change of person. It drills the book's invitation, 'Do you want to play with me?', as a whole pattern. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you want to play with ___?", "No, I don't. I want to play with ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join with 'but'." },
              { level: "Stretch", task: "Use he and she too, and 'because': 'She wants to play with the ball. Does she want to play with us? Yes, she does.'", frames: ["She wants to ___ because ___.", "Does she want to ___? Yes, she does."] },
            ],
          },
        },
        {
          after: "Invite three friends",
          slide: {
            kind: "fluency",
            title: "Invite again: new friend, same talk",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same invitation talk with new friends. Each time it is smoother.",
            chunks: [
              "Do you want to play with me? Sure! Let's play with the ball.",
              "OK. Good idea! What do you want to play?",
              "I don't want to play with the ball, but I want to play with the kite.",
              "Look! There are pink fireworks, and there is a big yellow one!",
            ],
            recycle: ["There's a green frog.", "What color is it? It's red."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A says the invitation, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A says the same talk, smoother, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 3: new partner. Same talk again: Partner A, then Partner B. Can you say it without looking?" },
            ],
            steps: [
              "Choose a game: ball, kite or cards. In each round Partner A says the invitation, then Partner B says it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and the class fixes them; then go on.",
              "When the bell rings, change partners and do it again: Partner A, then Partner B.",
              "The one who answers says 'Sure!' with a big smile and asks a follow-up question.",
            ],
            feedback: correct + " For example: if a child says 'Do you want play with me?', point to the frame and say 'Do you want to ...?' and wait for 'to play'.",
            teacherNote: "Task repeat: the same task with new partners after a short planning minute. The repeat lets children free their attention from finding words to saying them smoothly. Keep the language the same on purpose. Listen for 'to' in 'want to', the sound at the end of 'Let's' and the joining words 'but' and 'and'.",
            tiers: [
              { level: "Support", task: "Say the invitation and answer with the frames.", frames: ["Do you want to play with me?", "Sure! Let's play ___.", "What do you want to play?"] },
              { level: "Core", task: "Say the whole talk without the board and add what you see: 'Look! There are two pink fireworks!'" },
              { level: "Stretch", task: "Say no politely and give a reason: 'No, I don't. I want to see the fireworks because they are pretty. Do you want to see them?'", frames: ["No, I don't, but I want to ___.", "I want to ___ because ___."] },
            ],
          },
        },
        {
          after: "Rhyme and write (SB 35 Write)",
          slide: {
            kind: "writing",
            title: "Join them with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Read your sentence to your partner. Does it sound smooth?",
            ],
            items: [
              { q: "There is a pink cat. There is a pink hat. (and)", answer: "There is a pink cat and a pink hat." },
              { q: "The sky is dark. The sky is gray. (and)", answer: "The sky is dark and gray." },
              { q: "I want to play. I don't have a ball. (but)", answer: "I want to play, but I don't have a ball." },
              { q: "I like fireworks. They are colorful. (because)", answer: "I like fireworks because they are colorful." },
              { q: "We watch the fireworks. We eat cake. (then)", answer: "We watch the fireworks and then we eat cake." },
            ],
            checklist: ["Only one 'There is' or 'There are' in my sentence", "The joining word (and, but, because, then) is in the right place", "A comma before 'but', and a full stop at the end"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'There is'. Accept 'dark and gray' for item 2 and 'red and orange fireworks' style shortcuts. Items 3 to 5 have two clauses: let children say them first. Link it to the class poem: a rhyming pair like 'cat and hat' is just two things joined with 'and'.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Join three: 'There is a pink cat, a pink hat and a pink bag.' Then make your own 'because' sentence.", frames: ["I like ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u03-l5": {
      objectives: [
        "I can tell about my garden: 'There is a ___. There are ___s.'",
        "I can ask 'How many ___s are there?', say 'There isn't a ___, but there are ___s' and join ideas with 'because'.",
      ],
      trim: { "Rainbow path game": 4 },
      drop: ["Seeds and flowers"],
      add: [
        {
          after: "Grammar: There is / There are",
          slide: {
            kind: "fluency",
            title: "Grammar drill: where is it, how many?",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it in the negative, join two ideas, ask 'How many?'. Then ask about the real room.",
            chunks: [
              "There's a red kite in the sky.",
              "Is there a red kite in the sky? Yes, there is.",
              "There are two red kites by the tree.",
              "Are there two red kites? No, there aren't. There are three!",
              "There isn't a frog in the pond, but there are fish.",
              "How many fish are there? There are four, and they are orange.",
            ],
            recycle: ["Do you want to play with me? Sure!", "These are zebras."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'but there are ___' or 'because ___', # = ask 'How many?'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the place too: in the sky, on the desk, by the door, in the pond." },
              { seconds: 90, say: "Real talk: ask your partner about the room: 'Is there a pen on your desk? How many windows are there?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = start with Is there or Are there, X = say 'There isn't' or 'There aren't', + = add 'but there are ___', # = ask 'How many ___ are there?'.",
              "Say the WHOLE new sentence, with -s on things when there is more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have', 'Are there a' or a missing -s), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what is really in the room, and remember one answer to tell the class.",
            ],
            prompts: ["There's a green frog in the pond. (?)", "There are three pink flowers by the door. (X)", "There is a rainbow. (X +)", "There are four orange fish. (#)", "There's a yellow bird on the tree. (? then answer)"],
            feedback: "Prompt, do not tell: for 'Are there a frog?' hold up one finger and say 'Is ... ?'; for 'There are two bird' tap your wrist and say 'two bir...?' and wait for the -s; for 'How many fish there are?' point to the board and let them swap 'there are' and 'are there'. Say the 'isn't', the 'aren't' and every -s clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about the room they are sitting in, so the form is used for meaning. This drill adds places and 'How many?' to the forms the class drilled in Lesson 3. Grades 2-4 can take the full set. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Is there a ___ ___ in the ___?", "No, there isn't. There's a ___ ___."] },
              { level: "Core", task: "Change every sentence, with one thing and many things and with places, and join with 'but'." },
              { level: "Stretch", task: "Ask 'How many?' and give a reason: 'How many fish are there? There are four, and I like them because they are orange.'", frames: ["How many ___s are there?", "I like them because ___."] },
            ],
          },
        },
        {
          after: "Two gardens",
          slide: {
            kind: "fluency",
            title: "Garden retell: shorter each time",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell about your garden three times. Each time is shorter, smoother and faster.",
            chunks: [
              "In my garden there is a red flower and there are three yellow butterflies.",
              "There are two brown birds in the tree, but there isn't a frog.",
              "Is there a pond? Yes, there is, and there are orange fish in it!",
              "Look! Colors everywhere!",
            ],
            recycle: ["Do you want to play with me? Sure!", "These are zebras."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about the garden picture with the key-word cards, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at your garden picture. Pick four key-word cards: one thing, two things, three things, and one thing that is NOT there.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s) and the class fixes them; then go on.",
              "When the bell rings, change partners. Partner A tells it, then Partner B.",
              "The listener says 'Wow!' at the end, gives a thumbs up and asks one question.",
            ],
            prompts: ["(card: one red flower)", "(card: three yellow butterflies)", "(card: two brown birds)", "(card: no frog)"],
            feedback: correct + " For example: if a child says 'There are two bird', hold up two fingers and say 'two bir...?' and wait for the -s.",
            teacherNote: "Same garden three times on purpose: the second and third tellings free children to speak faster because they are not searching for words. Keep the key-word cards on the board for Support children. Accept short tellings; the shrinking time does the work. Listen for 'is' with one and 'are' with more than one, and for 'and' and 'but' joining the parts.",
            tiers: [
              { level: "Support", task: "Tell all three parts with the frames.", frames: ["There is a ___ ___.", "There are three ___ ___.", "There are two ___ ___."] },
              { level: "Core", task: "Tell all four parts without the frames, with one 'but' and a question at the end." },
              { level: "Stretch", task: "Join with 'because' and ask a question: 'There are orange fish in my pond because I love orange. Is there a pond in your garden?'", frames: ["Is there a ___ in your garden?", "I like ___ because ___."] },
            ],
          },
        },
        {
          after: "Garden retell: shorter each time",
          slide: {
            kind: "writing",
            title: "Write my garden",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model. Find 'There is', 'There are', 'but' and 'because'.",
              "Write four sentences about your garden with the frames. Join two of them.",
              "Read them to your partner. Do they match your picture?",
            ],
            text: { title: "My garden", text: "In my garden there is a red flower. There are three yellow butterflies and two brown birds. There isn't a blue flower, but there is a blue pond. I like my garden because it is colorful!" },
            frames: ["In my garden there is a ___ ___.", "There are three ___ ___ and two ___ ___.", "There isn't a ___ ___, but there is a ___ ___.", "I like my garden because ___."],
            checklist: ["One thing: There is", "More than one: There are + -s", "I joined ideas with 'and', 'but' or 'because'", "A capital letter and a full stop"],
            sayIt: "Show your picture to a partner and say your sentences without reading.",
            teacherNote: "Notice with the class first: one flower, 'There is'; three butterflies, 'There are'; and the joining words 'and', 'but' and 'because'. Then children write their own four sentences with the frames. The spoken step at the end keeps the writing tied to the talk from the garden retell.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in your colors and things." },
              { level: "Core", task: "Write four sentences about your garden, joining two with 'and', 'but' or 'because'." },
              { level: "Stretch", task: "Write five sentences, ask a question ('Is there a pond in your garden?') and finish with 'Look! Colors everywhere!'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My colorful garden",
        prompt: "Show your garden, a park or your room. Say what there is and what there are, what there isn't, what colors you can see, and ask the watcher a question.",
        length: "60-90 seconds",
        steps: [
          "Draw a garden or look around your home or a park.",
          "Write four key words on a paper to help you: one thing, many things, a color, a place.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Point to each thing as you say it.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say 'There is' for one thing and 'There are' for many things, join your ideas with 'and', 'but' or 'because', and ask a question.",
        words: ["flower", "butterflies", "birds", "frogs", "spider", "red", "yellow", "green"],
        grammar: ["There is a + color + thing", "There are + number + color + things-s", "There isn't a ___, but there are ___.", "Is there a ___?"],
        rubric: [
          { label: "There is / There are", description: "Uses 'There is' for one and 'There are' for more than one.", weight: 3 },
          { label: "Colors and -s", description: "Says a color before the thing and the -s on more than one: yellow butterflies.", weight: 2 },
          { label: "Joins ideas", description: "Joins two ideas with 'and', 'but' or 'because', or asks the watcher a question like 'Is there a pond in your garden?'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Numbers", description: "Says how many: two, three, four.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["In my garden there is a ___ ___.", "There are two ___ ___.", "I like my garden!"], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["There is a ___ ___ and there are two ___ ___.", "There isn't a ___, but there are ___.", "Is there a ___ in your garden?"], tips: ["Say one thing, many things, one thing that is not there, and ask a question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["How many ___s are there? There are ___.", "I like my garden because ___, and there are ___."], tips: ["Give a reason with 'because' and ask the watcher 'How many?'"] },
        ],
      },
    },
  },
};
