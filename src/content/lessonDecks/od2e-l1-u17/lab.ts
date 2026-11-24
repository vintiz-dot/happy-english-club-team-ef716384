import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 17 "Living and
// Nonliving Things" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in
// grades 2-4 (Venus, ages 7-10). Every lesson gets a grammar drill (the unit's grammar changed
// fast: asked, said in the negative, joined, then used for real talk about the children), one
// more fluency routine (whole sentences joined with and, but, because, a little faster each
// round, with Unit 16's phrases mixed back in) and one writing routine (sentences with two
// clauses, or a planned paragraph). Lessons 2 and 5 end with a recorded talk for home
// (Lesson 4 already has its own). Time comes from games and repeats, never from the book pages
// or the grammar. All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, or hold up a finger for the missing -s) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u17-l1": {
      objectives: ["I can say what living things do and what nonliving things don't do, ask about them, and join my ideas with and, but and because."],
      drop: ["Simon says: breathe, move, change", "Run and touch: living or nonliving?", "Whisper breathing"],
      add: [
        {
          after: "Does it move? Does it grow?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Does, answer it, say it with doesn't, join it with but. Then ask about real things.",
            chunks: [
              "A cat breathes.",
              "Does a cat breathe? Yes, it does.",
              "A toy cat doesn't breathe.",
              "A cat breathes, but a toy cat doesn't.",
              "Cats breathe. Do cats breathe? Yes, they do.",
              "A plant grows because it is living.",
            ],
            recycle: ["Can you clap? Yes, I can.", "I like to sing."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add but, and or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing too: a cat, cats, a plant, plants." },
              { seconds: 85, say: "Real talk: ask your partner about themselves and their pet or a plant at home: 'Do you have a pet? Does your pet sleep a lot?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Does or Do, X = say it with doesn't or don't, + = add 'but', 'and' or 'because' and a new idea.",
              "Say the WHOLE new sentence, with -s on breathes, grows and moves when it is one thing, and no -s after does and doesn't.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does a cat breathes?' or 'Yes, it breathes') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about you and your pet or plant, and remember one answer to tell the class.",
            ],
            prompts: ["A cat breathes. (?)", "A toy cat breathes. (X)", "A plant grows. (+ because it is living)", "Birds fly. (?)", "A robot moves. (X +)", "A fish swims. (+ but)"],
            feedback:
              "Prompt, do not tell: for 'Does a cat breathes?' hold up one finger and say 'Does a cat breathe...?' with no -s; for 'Yes, it breathes' repeat it with a rising voice and let the child fix it to 'Yes, it does'; for a missing -s on 'A cat breathe', tap your wrist. For X, children make the sentence true: 'A toy cat breathes' becomes 'A toy cat doesn't breathe'. Say the -s and the n't clearly yourself.",
            teacherNote:
              "A drill only helps when the last step is real: in round 3 the children ask about themselves and their own pets, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, plurals and a joined sentence. Vietnamese children often drop the final -s on breathes, grows and moves, and say 'Does it moves?': hold up a finger and let them find it. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one thing (a cat, a plant), with the frames on the board.", frames: ["Does a ___ ___?", "A toy ___ doesn't ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change the thing too: cats, plants, birds." },
              { level: "Stretch", task: "Join two ideas and ask back: 'A robot moves, but it doesn't breathe because it is nonliving. Does a plant move?'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Living sprint: does it breathe?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, with a joining word, fast and smooth, with no stops.",
            chunks: [
              "A cat breathes, and it grows.",
              "A toy cat doesn't breathe, but it looks like a cat.",
              "Does it move? Yes, it does. Does it grow? No, it doesn't.",
              "A plant grows because it is living.",
              "A robot moves, but it doesn't breathe. Is it living?",
            ],
            recycle: ["Can you clap? Yes, I can.", "I like to sing."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence and does the action." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence with a joining word. Swap when you hear the clap." },
              { seconds: 75, say: "Faster! New partner. How many long sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence with a joining word: 'A cat breathes, and it grows.' or 'A toy cat doesn't breathe, but it looks like a cat.'",
              "Do the action too: breathe in and out, wiggle, stand still like a toy.",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'A cat breathe, and it grow.') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: cat)", "(card: toy cat)", "(card: plant)", "(card: robot)", "(card: bird)", "(card: doll)"],
            feedback:
              "Grammar: point to the end of the word and hold up a finger for the missing -s: 'A cat breathe...?' (child: 'breathes!'). If a child says 'A toy cat don't breathe', start the phrase and pause: 'A toy cat does...?' If the joining word is missing, tap the board where 'and, but, because' are written. Pronunciation: if breathes comes out as 'breed', say it right ('breathes') and let them echo. " + fix,
            teacherNote:
              "Whole sentences only, never single words: 'A cat breathes, and it grows' is one smooth piece. Vietnamese children often drop the final -s on breathes, grows and moves, so say every one of them clearly and let the children feel the s on their lips. Mix in Unit 16's 'Can you ...?' cards every few turns so those phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ breathes.", "A toy ___ doesn't breathe, but ___."] },
              { level: "Core", task: "Say a pair: 'A cat breathes, but a toy cat doesn't breathe.'", frames: ["A ___ breathes, but a toy ___ doesn't."] },
              { level: "Stretch", task: "Add because and a question: 'A cat breathes because it is living. Does a robot breathe?'" },
            ],
          },
        },
        {
          after: "Cat and toy cat (SB 169 E)",
          slide: {
            kind: "writing",
            title: "Grow my living sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the describing word and the second idea, with the joining word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "A cat breathes. (add: small + and it grows)", answer: "A small cat breathes, and it grows." },
              { q: "A toy doesn't breathe. (add: red + but it looks like a cat)", answer: "A red toy doesn't breathe, but it looks like a cat." },
              { q: "A plant grows. (add: green + because it is living)", answer: "A green plant grows because it is living." },
              { q: "A robot moves. (add: big + but it doesn't breathe)", answer: "A big robot moves, but it doesn't breathe." },
              { q: "A bird breathes. (add: blue + and then it sleeps)", answer: "A blue bird breathes, and then it sleeps." },
            ],
            frames: ["A ___ plant grows because ___.", "A ___ toy doesn't breathe, but ___.", "A ___ breathes, and then ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "breathes, grows, moves: the -s is there; after doesn't no -s", "A joining word: and, but, because or then"],
            sayIt: "Read your sentences to your partner, then say one again without looking.",
            teacherNote: "Expanding a sentence shows children that a sentence is a frame they can fill, and the second clause is where grades 2-4 practise 'and', 'but' and 'because'. Watch for 'A toy doesn't breathes': after doesn't the verb has no -s. Fix one together first.",
            tiers: [
              { level: "Support", task: "Do items 1 to 3: add the describing word and copy the joining word from the board." },
              { level: "Core", task: "Write all five big sentences, each with a joining word." },
              { level: "Stretch", task: "Write one sentence with two joining words: 'A small cat breathes and grows, but a toy cat doesn't.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u17-l2": {
      objectives: ["I can tell my friend about living and nonliving things three times, faster each time, with because and but.", "I can write a paragraph about a living and a nonliving thing."],
      trim: { "Act it out": 5 },
      drop: ["Freeze: living or robot?", "Whisper chant"],
      add: [
        {
          after: "Team Living and Team Nonliving",
          slide: {
            kind: "fluency",
            title: "Grammar drill: living things say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say it with doesn't, make it plural, join it with but. Then ask about real things.",
            chunks: [
              "A plant grows and needs water.",
              "Does a plant need water? Yes, it does.",
              "A rock doesn't need water.",
              "A plant needs water, but a rock doesn't.",
              "Living things breathe. Do living things breathe? Yes, they do.",
              "Nonliving things don't grow, and they don't breathe.",
            ],
            recycle: ["What do you see?", "Can you clap? Yes, I can."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add but, and or because, 'many' = say it for many things). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use the story's things: a plant, a cat, a rock, a robot." },
              { seconds: 85, say: "Real talk: ask your partner about their home: 'Do you have a plant? Does your pet need food?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Does or Do, X = say it with doesn't or don't, + = add 'but', 'and' or 'because' and a new idea.",
              "Say the WHOLE new sentence. One thing: grows, needs (-s). Many things: grow, need (no -s). After does and doesn't no -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does a plant needs water?' or 'Living thing breathe') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about plants and pets at home, and remember one answer to tell the class.",
            ],
            prompts: ["A plant grows. (?)", "A rock needs water. (X)", "A cat breathes. (+ but a toy cat doesn't)", "A living thing grows. (many)", "A robot moves. (? X)", "A plant needs sun. (+ because it is living)"],
            feedback:
              "Prompt, do not tell: for 'Does a plant needs water?' hold up one finger and say 'Does a plant need...?'; for 'Living thing breathe' point to 'things' on the board and hold up two fingers; for 'Yes, it needs' repeat it with a rising voice and let the child fix it to 'Yes, it does'. For X, children make the sentence true: 'A rock needs water' becomes 'A rock doesn't need water'. Say the -s and the n't clearly yourself.",
            teacherNote:
              "This lesson has no grammar slide, so the drill uses the lesson's key sentences: living things grow, breathe and need things, nonliving things don't. Grades 2-4 can take the full set: questions, short answers, negatives, one and many, and a joined sentence. Round 3 is the point: the children use the form to ask each other about their real homes. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one thing (a plant, a rock), with the frames on the board.", frames: ["Does a ___ ___?", "A ___ doesn't ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and say it for one thing and for many things." },
              { level: "Stretch", task: "Join two ideas and ask back: 'Plants are living because they grow, but rocks don't grow. Do robots grow?'" },
            ],
          },
        },
        {
          after: "Grammar drill: living things say it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Living or nonliving: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same thing three times, with joining words. Each time is shorter, smoother and faster.",
            chunks: [
              "Living things grow, breathe and need food and water.",
              "Nonliving things don't grow, and they don't breathe.",
              "A plant is living because it grows. A rock is nonliving because it doesn't breathe.",
              "A cat breathes, but a toy cat doesn't. Why not?",
              "Do you have a living thing at home? What does it need?",
            ],
            recycle: ["What do you see?", "Can you clap? Yes, I can."],
            rounds: [
              { seconds: 65, say: "Round 1: Partner A tells about living and nonliving things, then Partner B. Use the picture cards on the board. Then change partners." },
              { seconds: 60, say: "Round 2: New partner. A tells it again in less time, then B. Then change partners." },
              { seconds: 50, say: "Round 3: New partner. A tells it fast, then B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the cards: a plant, a cat, a rock, a robot.",
              "Tell your partner: which are living? What do they do? Which are nonliving? What don't they do? Use 'because' and 'but'.",
              "The listener has a job: count the joining words your partner says, ask one question at the end, and say 'Wow!'.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Living things grow.' said as 'Living thing grow') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(picture: plant)", "(picture: cat)", "(picture: rock)", "(picture: robot)"],
            feedback:
              "Grammar: for 'Living thing grow' point to the word 'things' on the board and hold up two fingers: 'Living thing...?' (child: 'things!'). For 'Nonliving things not grow', start the phrase and pause: 'Nonliving things don't...?' If a child tells only short sentences, point to 'because' or 'but' on the board. Pronunciation: say the final s in things and plants clearly and let the child echo. " + fix,
            teacherNote:
              "This is the same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words, and the one-minute fix between round 1 and round 2 is what makes it more correct as well as faster. Both partners tell each round, so the time is for two tellings. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["Living things ___.", "Nonliving things don't ___."] },
              { level: "Core", task: "Tell all of it, and add your own example: 'A fish is a living thing. It breathes in water.'" },
              { level: "Stretch", task: "Join ideas with because and ask your partner a question: 'A fish is living because it breathes in water. Is a robot fish living?'" },
            ],
          },
        },
        {
          after: "Living and Nonliving chart (SB 171 Think)",
          slide: {
            kind: "writing",
            title: "Living and nonliving: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the joining words: and, but, because.",
              "Plan: draw if you like, then write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with 'A ___ is a living thing', then 'A ___ is a nonliving thing', then compare with 'but'.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, the verb after doesn't and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: A plant and a rock",
              text: "A plant is a living thing. It grows, and it needs water and sun. A rock is a nonliving thing because it doesn't grow or breathe. A cat is living too, but a toy cat is not. Living things are amazing, and I love them!",
            },
            organiser: [
              { label: "Living", prompt: "Key words: a living thing, and two things it does (grow? need water?)." },
              { label: "Nonliving", prompt: "Key words: a nonliving thing, and what it doesn't do." },
              { label: "Compare", prompt: "Key words: a living thing and a toy of it (cat and toy cat?)." },
              { label: "The end", prompt: "Key words: how you feel about living things (amazing? beautiful?)." },
            ],
            frames: [
              "A ___ is a living thing. It ___, and it ___.",
              "A ___ is a nonliving thing because it doesn't ___.",
              "A ___ is living, but a toy ___ is not.",
              "Living things are ___, and I ___ them!",
            ],
            checklist: [
              "Four to six sentences: living, nonliving, compare, an ending",
              "At least two joining words: and, but or because",
              "A capital letter at the start and a full stop or ! at the end",
              "grows, breathes: the -s is there; after doesn't no -s",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, with the joining words.",
            teacherNote: "A paragraph about the unit's big idea, planned with key words (and a drawing if the child likes). The frames are the sentences; children may copy and complete them, and the joining words carry the second idea. Mark only three things (capital letters, the verb after doesn't, joining words). It can be the script for the home talk 'Living things breathe and grow': the child reads it, then tells it without looking.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the blanks; use 'because' once.", frames: ["A ___ is a living thing. It ___.", "A ___ is a nonliving thing because it doesn't ___."] },
              { level: "Core", task: "Write four or five sentences with 'and', 'because' and 'but'." },
              { level: "Stretch", task: "Write six sentences, add a fact of your own, and end with a question: 'Do you have a living thing at home?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Living things breathe and grow",
        prompt: "Show a plant, a pet or a picture, and a toy. Tell what the living thing does and what the toy doesn't do. Use 'and', 'but' or 'because' to join your ideas, and end with a question for the viewer.",
        length: "60-90 seconds",
        steps: [
          "Pick one living thing and one nonliving thing at home.",
          "Tell about them three times to a grown-up or a toy. Each time a little faster, with your joining words.",
          "Record it once. Smile and look at the camera. End with a question: 'Do you have a plant at home?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell about one living thing and one nonliving thing, join your ideas with 'and', 'but' or 'because', and ask a question at the end.",
        words: ["living", "nonliving", "breathe", "grow", "move", "plant"],
        grammar: ["A ___ breathes / grows.", "A ___ doesn't breathe / grow.", "and / but / because"],
        rubric: [
          { label: "Two things", description: "Tells about one living thing and one nonliving thing.", weight: 3 },
          { label: "Joining ideas", description: "Joins two ideas in a sentence with 'and', 'but' or 'because', at least twice.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: living, nonliving, breathe, grow, move.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Breathes and doesn't", description: "Says 'A cat breathes' with the -s, and 'A toy doesn't breathe' with doesn't.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ is living. It ___ and ___.", "A ___ is nonliving. It doesn't ___."], tips: ["Hold up the thing as you speak.", "Use 'and' at least once."] },
          { level: "Core", who: "Most children", frames: ["A ___ is a living thing because it ___.", "A ___ is a nonliving thing, but it ___."], tips: ["Use 'because' and 'but' once each."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["A ___ breathes, but a toy ___ doesn't.", "I take care of my ___ because ___. Do you have a ___?"], tips: ["Add how you take care of it, and end with a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u17-l3": {
      objectives: ["I can ask 'Can it ...?', answer 'Yes, it can.' or 'No, it can't.' and join my ideas with and, but and because, fast."],
      trim: { "Can it? Cards in the hoops": 6 },
      drop: ["Freeze dance: can and can't", "Whisper chant: breathe and rest"],
      add: [
        {
          after: "Can it move, grow or change? (SB 173 D practice)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say can't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Can, answer it, say it with can't, join it with but. Then ask about real things.",
            chunks: [
              "A fish can swim.",
              "Can a fish swim? Yes, it can.",
              "A rock can't swim.",
              "A fish can swim, but it can't fly.",
              "I can jump, and I can run. Can you jump? Yes, I can. / No, I can't.",
              "A plant can grow, but it can't walk because it has no legs.",
            ],
            recycle: ["A cat breathes.", "I like to dance."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with can't, + = add but, and or because, or a new person: I, you, we, they). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 85, say: "Real talk: ask your partner about themselves: 'Can you swim? Can you ride a bike?' Answer: 'Yes, I can.' or 'No, I can't, but I can ___.'" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Can, X = say it with can't, + = add 'but', 'and' or 'because' and a new idea.",
              "Say the WHOLE new sentence. After can and can't the next word never has -s: 'She can swim', not 'She can swims'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Can a fish swims?' or 'Yes, it is') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner can and can't do, and remember one answer to tell the class.",
            ],
            prompts: ["A bird can fly. (?)", "A rock can fly. (X)", "A fish can swim. (+ but it can't fly)", "I can jump. (you ?)", "We can sing. (they ?)", "A puppy can run. (? +)"],
            feedback:
              "Prompt, do not tell: for 'Can a fish swims?' point to the word can on the frame and say 'Can a fish sw...?' and pause; for 'Yes, it is' hold up a finger and start the answer: 'Yes, it c...?'; for 'She cans swim' repeat it with a rising voice and let the child fix it. For X, children make the sentence true: 'A rock can fly' becomes 'A rock can't fly'. Make the final t of can't clear yourself.",
            teacherNote:
              "A drill only helps when the last step is real: in round 3 the children ask each other what they can and can't do. Grades 2-4 can take the full set: questions, short answers, negatives, a joined sentence and a change of person. Can is the same for every person: nothing to add for he and she, which children often forget after learning -s with other verbs. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Can you ___?", "Yes, I can. / No, I can't."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change the person: I, you, we, they." },
              { level: "Stretch", task: "Use he and she too, and join ideas: 'She can swim, but she can't dive because the water is deep.'" },
            ],
          },
        },
        {
          after: "Grammar drill: say it, ask it, say can't",
          slide: {
            kind: "fluency",
            title: "Question chain: Can it ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a longer sentence, ask a question back, then turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Can a bird fly? Yes, it can. Can a fish fly too?",
              "Can a rock swim? No, it can't, but a fish can.",
              "Can a plant grow? Yes, it can, but it can't walk.",
              "Can a puppy jump? Yes, it can, and it can run too.",
              "Can a ball move by itself? No, it can't. Can you kick it?",
            ],
            recycle: ["Can you sing? Yes, I can.", "I like to dance."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a picture card. Answer with a longer sentence." },
              { seconds: 75, say: "Swap cards. Go faster! Ask a question back before you turn." },
              { seconds: 75, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left about their card: 'Can a ___ fly?'",
              "They answer: 'Yes, it can.' or 'No, it can't.' and add one more sentence with 'and' or 'but': 'No, it can't, but a bird can.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
            ],
            prompts: ["(card: fish)", "(card: bird)", "(card: rock)", "(card: ball)", "(card: puppy)", "(card: chair)"],
            feedback:
              "Grammar: if a child says 'Yes, it is', hold up a finger and start the answer: 'Yes, it c...?' If a child says 'Can a fish swims?', point to the word can on the frame and say 'Can a fish sw...?' and pause. If the answer has no second sentence, tap 'and' or 'but' on the board. Pronunciation: can't should end with a clear t sound; say it right and let the child echo. " + fix,
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Can it ...?' automatic, and the extra sentence makes it a real conversation. Time the whole circle and tell them; children love beating their own time. After can and can't the verb never takes -s: listen for 'A bird can flies'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, it can.' or 'No, it can't.' and pass the question on with the frame on the board.", frames: ["Can a ___ ___?", "Yes, it can. / No, it can't."] },
              { level: "Core", task: "Answer and add a sentence: 'No, it can't. A rock can't swim, but a fish can.'" },
              { level: "Stretch", task: "Answer with because and ask back: 'No, it can't, because it's nonliving. Can a robot move?'" },
            ],
          },
        },
        {
          after: "Guess my thing (SB 173 E)",
          slide: {
            kind: "writing",
            title: "Fix the can and can't sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a capital letter, a full stop, an extra -s or the wrong word.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "a fish can swim, but it can't fly", answer: "A fish can swim, but it can't fly." },
              { q: "A plant cans grow, but it can't walk.", answer: "A plant can grow, but it can't walk." },
              { q: "The cat can runs and it can jumps.", answer: "The cat can run, and it can jump." },
              { q: "Can a fish swim? Yes, it is.", answer: "Can a fish swim? Yes, it can." },
              { q: "A rock not can move because it is nonliving.", answer: "A rock can't move because it is nonliving." },
            ],
            checklist: ["Every sentence starts with a capital letter", "A full stop or a question mark at the end", "After can there is no -s on the next word", "The joining word is there: and, but or because"],
            sayIt: "Read your fixed sentences to the class in a loud, clear voice.",
            teacherNote: "After can the verb stays the same for every thing and person: 'can runs' and 'cans grow' are common because plain action words take -s elsewhere in this unit (breathes, grows). Fix one together first and say the corrected sentence aloud. Sentences 1, 2, 3 and 5 have two clauses: read them together to hear where the joining word goes.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 4." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix, one with 'but' and one with 'because'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u17-l4": {
      objectives: ["I can say what I can see in my park, ask about it, and tell which things are living, with because and but, without stopping."],
      drop: ["What's missing?", "Park walk", "Describing word mime", "Calm close: breathe and thank"],
      add: [
        {
          after: "My favorite park (SB 174 Think)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: can see, is there, there isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, join it with but. Then ask about a real park.",
            chunks: [
              "In my park I can see a bench and two trees.",
              "Can you see a fountain? Yes, I can.",
              "Is there a lake? No, there isn't, but there is a pond.",
              "There isn't a statue, but there is a big bush.",
              "There are two trees. Are there any flowers? Yes, there are.",
              "A bush is a living thing because it grows.",
            ],
            recycle: ["Can you sing? Yes, I can.", "A plant grows."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with isn't or can't, + = add but, and or because). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use the park cards: bench, bush, statue, rose, fountain." },
              { seconds: 85, say: "Real talk: ask your partner about a park near home or school: 'Is there a ___ in your park? Can you see ___ there?' Answer with the full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is there or Can you see, X = say it with there isn't or can't, + = add 'but', 'and' or 'because' and a new idea.",
              "Say the WHOLE new sentence, with 'a' before one thing: 'a bench'. Say 'There is' for one thing and 'There are' for many.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have a bench' or 'Is there have a fountain?') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a park your partner really knows, and remember one answer to tell the class.",
            ],
            prompts: ["There is a bench. (?)", "There is a lake. (X)", "I can see a bush. (+ it is living)", "There are two trees. (?)", "There is a fountain. (X +)", "I can see a statue. (you ?)"],
            feedback:
              "Prompt, do not tell: for 'There have a bench' point to the frame 'There is a ___' and start it: 'There i...?'; for 'Is there have a fountain?' hold up a finger and say 'Is there a...?'; for a missing a or an, say 'I can see ... bench?' (child: 'a bench'). For X, children make the sentence true for the park cards: 'There is a lake' becomes 'There isn't a lake'. Pronunciation: if bush sounds like 'bus', say it right and let them echo.",
            teacherNote:
              "This lesson has no grammar slide, so the drill uses the lesson's key structures: I can see, there is, there isn't, is there. Grades 2-4 can take the full set: questions, short answers, negatives, one and many, and a joined sentence. Vietnamese children often say 'There have a bench' for 'There is a bench': listen for it and let them find it themselves. Round 3 is real: park talk about places the children know. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one thing (a bench, a lake), with the frames on the board.", frames: ["Is there a ___?", "There isn't a ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and use 'Can you see ...?' too." },
              { level: "Stretch", task: "Use many things and join ideas: 'There are two trees, but there aren't any flowers. Are there any ducks?'" },
            ],
          },
        },
        {
          after: "Grammar drill: can see, is there, there isn't",
          slide: {
            kind: "fluency",
            title: "My park: say it three times",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell your partner about the park three times, with joining words. Each time is shorter and smoother.",
            chunks: [
              "In my park I can see a bench, a bush and two trees.",
              "A bush is a living thing because it grows.",
              "A statue is a nonliving thing, but it looks like a person.",
              "There is a fountain, and the water goes up.",
              "Is there a fountain in your park? What can you see in your park?",
            ],
            recycle: ["Can you sing? Yes, I can.", "A plant grows."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about the park, then Partner B. Use the park cards. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: New partner. Partner A tells it fast, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Pick three park cards. Say: 'In my park I can see a ___, a ___ and a ___.' Say if each is living or nonliving, with 'because' or 'but'.",
              "The listener has a job: tick the living things on the board chart and ask one question at the end.",
              "Partner A tells it, then Partner B tells it. When the bell rings, find a new partner and tell it again, faster.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Is there have a fountain?') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: bench)", "(card: bush)", "(card: statue)", "(card: tree)", "(card: rose)", "(card: fountain)"],
            feedback:
              "Grammar: Vietnamese children often say 'There have a bench' for 'There is a bench'. Point to the frame 'Is there a ___?' and start the answer: 'Yes, there i...?' If a child drops a or an, hold up a finger and say 'In my park I can see ... bench?' (child: 'a bench'). If the joining word is missing, tap 'because' or 'but' on the board. Pronunciation: if bush sounds like 'bus', say it right and let them echo. " + fix,
            teacherNote:
              "Telling the same message three times, to new partners, with less time each time, is the 4-3-2 idea scaled to a 90-minute lesson for children in grades 2-4: the second and third tellings are faster because the words are already ready. Both partners tell in each round. The minute between round 1 and round 2 is what keeps it accurate. Let children keep the cards in hand.",
            tiers: [
              { level: "Support", task: "Point to the cards and say one sentence for each.", frames: ["In my park I can see a ___.", "It's a living thing."] },
              { level: "Core", task: "Tell all of it, living and nonliving, and add a question: 'Is there a fountain in your park?' 'Yes, there is.'" },
              { level: "Stretch", task: "Use because and but, and ask two questions: 'A tree is living because it grows, but a bench is nonliving. Is there a lake in your park? What can you see there?'" },
            ],
          },
        },
        {
          after: "Circle the describing words (SB 175 F)",
          slide: {
            kind: "writing",
            title: "My park: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the joining words: and, but, because.",
              "Plan: draw if you like, then write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with 'In my park I can see', then living, nonliving and an ending with 'because'.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, 'a' before the thing and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My park",
              text: "In my park I can see a big tree, a bench and a fountain. The tree is a living thing because it grows. The bench is a nonliving thing, but I like to sit on it. There is a lake too, and I can see ducks. I love my park because it is beautiful!",
            },
            organiser: [
              { label: "I can see", prompt: "Key words: three things in your park. Draw them if you like." },
              { label: "Living", prompt: "Key words: a living thing, and why it is living (grows? breathes?)." },
              { label: "Nonliving", prompt: "Key words: a nonliving thing, and what you do with it (sit? look?)." },
              { label: "The end", prompt: "Key words: what else is there, and how you feel about your park." },
            ],
            frames: [
              "In my park I can see ___, ___ and ___.",
              "The ___ is a living thing because ___.",
              "The ___ is a nonliving thing, but ___.",
              "There is a ___ too, and ___.",
              "I love my park because ___!",
            ],
            checklist: [
              "Four to six sentences: what I see, living, nonliving, an ending",
              "At least two joining words: and, but or because",
              "A capital letter at the start and a full stop or ! at the end",
              "a before the thing: a tree, a bench",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, with the joining words.",
            teacherNote: "A paragraph on the lesson's own words, planned with key words (and a drawing if the child likes). Children copy the shape and change the words, which is what you want, and the joining words carry the second idea. Mark only three things (capital letters, a before the thing, joining words). It can be the script for the home talk 'My living and nonliving things'.",
            tiers: [
              { level: "Support", task: "Copy the frames and change one word in each.", frames: ["In my park I can see a ___.", "The ___ is a living thing because ___."] },
              { level: "Core", task: "Write four or five sentences from the frames, with 'because' and 'but'." },
              { level: "Stretch", task: "Write six sentences, add a describing word ('The tree is big and green.') and end with a question: 'Do you have a park near your home?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u17-l5": {
      objectives: ["I can say what things can and can't do, again and again, smooth and fast, with because and but."],
      drop: ["Garden path game", "Move or freeze"],
      add: [
        {
          after: "Grammar: can and can't",
          slide: {
            kind: "fluency",
            title: "Grammar drill: can, can't and because",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with can't, join it with but and because. Then ask about real things.",
            chunks: [
              "A puppy can run.",
              "Can a puppy run? Yes, it can.",
              "A rock can't run.",
              "A puppy can run, but it can't read.",
              "A plant is living because it can grow.",
              "I can ride a bike, but I can't drive a car.",
            ],
            recycle: ["A cat breathes.", "In my park I can see a bush."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with can't, + = add but, and or because, or a new person: I, you, we, they). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing or person too." },
              { seconds: 85, say: "Real talk: ask your partner what they can and can't do: 'Can you ___?' Answer 'Yes, I can.' or 'No, I can't, but I can ___.' Then tell the class one thing your partner can do." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Can, X = say it with can't, + = add 'but', 'and' or 'because' and a new idea.",
              "Say the WHOLE new sentence. After can and can't the next word never has -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'A puppy cans run' or 'Yes, it is') and fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner can and can't do, and remember one answer to tell the class.",
            ],
            prompts: ["A puppy can jump. (?)", "A rock can jump. (X)", "A fish can swim. (+ but it can't fly)", "A plant can grow. (+ because it is living)", "I can sing. (you ?)", "A toy car can move. (X +)"],
            feedback:
              "Prompt, do not tell: for 'A puppy cans run' repeat it with a rising voice and let the child fix it; for 'Yes, it is' hold up a finger and start the answer: 'Yes, it c...?'; for 'A rock not can run' point to the frame and say 'A rock c...?' with a finger up for can't. For X, children make the sentence true: 'A rock can jump' becomes 'A rock can't jump'. Make the final t of can't clear yourself.",
            teacherNote:
              "The grammar slide has just shown the rule; the drill makes it automatic and the last round makes it real. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and 'because', and a change of person. Listen for three slips: an extra -s after can, 'Yes, it is' for 'Yes, it can', and a missing a or an. Pick two for the board; do not correct everything. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Can you ___?", "Yes, I can. / No, I can't."] },
              { level: "Core", task: "Change every sentence with ?, X and +, with I, you, we and they." },
              { level: "Stretch", task: "Use he and she too, and give a reason: 'He can swim, but he can't dive. A fish is living because it can grow and breathe.'" },
            ],
          },
        },
        {
          after: "What can it do? Find the missing answers",
          slide: {
            kind: "fluency",
            title: "Champion sprint: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same task three times with new partners. Each time, say it smoother and faster, with a joining word.",
            chunks: [
              "A fish can swim, but it can't walk.",
              "Can a puppy jump? Yes, it can, and it can run fast.",
              "Can a ball move by itself? No, it can't, because it's nonliving.",
              "It's living because it can grow and breathe.",
              "A rock can't move, but a puppy can.",
            ],
            recycle: ["A cat breathes.", "In my park I can see a bush."],
            rounds: [
              { seconds: 55, say: "Round 1: Partner A picks a card and asks 'Can a ___ ___?' Partner B answers with a joining word. Then swap: Partner B asks. Then change partners." },
              { seconds: 50, say: "Round 2: New partner. Same task, A then B. Go faster! Then change partners." },
              { seconds: 40, say: "Round 3: New partner. Same task, A then B. Keep going: can you say ten long sentences?" },
            ],
            steps: [
              "Partner A picks a card and asks: 'Can a ___ ___?' Then Partner B asks.",
              "Your partner answers: 'Yes, it can.' or 'No, it can't.' and adds a sentence with 'and', 'but' or 'because': 'A ___ can ___, but it can't ___.'",
              "When the bell rings, new partner: same task again.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: fish)", "(card: puppy)", "(card: ball)", "(card: rock)", "(card: plant)", "(card: toy car)"],
            feedback:
              "Grammar: if a child says 'A rock not can swim', point to the frame and say 'A rock c...?' with a finger up for can't. If a child says 'A fish can swims', repeat the error with rising voice: 'A fish can swims?' and let the child hear and fix it. If the joining word is missing, tap 'and, but, because' on the board. Pronunciation: make the final t of can't clear; say it right and let the child echo. " + fix,
            teacherNote:
              "Task repetition: the task does not change, the partner does, so the language is the same and the speed grows. Both partners ask and answer each round. This is the week's last practice of can and can't, so listen for three slips that are common in this unit: the missing -s (breathes, grows), 'Yes, it is' for 'Yes, it can', and a or an missing. Do not correct everything: pick two for the board.",
            tiers: [
              { level: "Support", task: "Use the frames on the board with a friend.", frames: ["Can a ___ ___?", "Yes, it can. / No, it can't."] },
              { level: "Core", task: "Ask, answer and add why: 'A plant is living because it can grow.'" },
              { level: "Stretch", task: "Add why and ask back: 'A plant is living because it can grow. Can a robot grow?'" },
            ],
          },
        },
        {
          after: "Write like a champion: can and can't",
          slide: {
            kind: "writing",
            title: "What it can do: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the joining words: and, but, because. Point to what the puppy can do and can't do.",
              "Plan: draw if you like, then write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with 'My ___ is a living thing', then can, can't and an ending with 'because'.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, the verb after can or can't and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My puppy",
              text: "My little puppy is a living thing because it can grow. It can run fast, and it can jump high. It can't read a book, but it can learn tricks. I love my puppy because it is my best friend!",
            },
            organiser: [
              { label: "My pet", prompt: "Key words: your pet or a favorite animal, and why it is living (grow? breathe?)." },
              { label: "It can", prompt: "Key words: two things it can do. Draw them if you like." },
              { label: "It can't", prompt: "Key words: one thing it can't do, and one thing it can do instead." },
              { label: "The end", prompt: "Key words: how you feel about it, and why." },
            ],
            frames: [
              "My ___ is a living thing because ___.",
              "It can ___, and it can ___.",
              "It can't ___, but it can ___.",
              "I love my ___ because ___!",
            ],
            checklist: [
              "Four to six sentences: my pet, it can, it can't, an ending",
              "At least two joining words: and, but or because",
              "A capital letter at the start and a full stop or ! at the end",
              "After can and can't the next word has no -s",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, with the joining words.",
            teacherNote: "The paragraph that uses the unit's grammar, planned with key words (and a drawing if the child likes). Joining with 'and' (it can run, and it can jump), 'but' and 'because' happens inside the frames; say the joining word clearly. Mark only three things (capital letters, no -s after can, joining words). It can be the script for the home talk 'What can it do?'.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each.", frames: ["My ___ is a living thing.", "It can ___, and it can ___."] },
              { level: "Core", task: "Write four or five sentences from the frames, with 'and', 'but' and 'because'." },
              { level: "Stretch", task: "Write six sentences and add a 'but' fact: 'A fish can swim, but it can't walk.' End with a question to the reader." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What can it do?",
        prompt: "Show or draw three things. Tell what each one can do and what it can't do. Use 'and', 'but' or 'because' to join your ideas, and end with a question for the viewer.",
        length: "60-90 seconds",
        steps: [
          "Pick three things at home: a pet or a plant, a toy and something else.",
          "Say what each can do and can't do three times to a grown-up or a toy. Each time a little faster, with your joining words.",
          "Record it once. Smile and look at the camera. End with a question: 'Can you swim?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell what three things can do and can't do, join your ideas with 'and', 'but' or 'because', and ask a question at the end.",
        words: ["can", "can't", "swim", "fly", "run", "grow"],
        grammar: ["A ___ can ___.", "A ___ can't ___.", "Can a ___ ___? Yes, it can. / No, it can't.", "and / but / because"],
        rubric: [
          { label: "Three things", description: "Tells about three things, with at least one can and one can't.", weight: 3 },
          { label: "Joining ideas", description: "Joins two ideas in a sentence with 'and', 'but' or 'because', at least twice, and ends with a question for the viewer.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: living, nonliving, can, can't, grow, move.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Can and can't", description: "Says 'A bird can fly' and 'A rock can't fly', with no extra -s after can.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ can ___ and ___.", "A ___ can't ___."], tips: ["Hold up each thing as you speak.", "Use 'and' at least once."] },
          { level: "Core", who: "Most children", frames: ["A ___ can ___, but it can't ___.", "It's living because it can ___."], tips: ["Say can and can't for every thing.", "Use 'but' and 'because' once each."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Can a ___ ___? Yes, it can, and it can ___.", "A ___ is nonliving because it can't ___, but ___."], tips: ["Ask a toy a Can question and answer it yourself, then end with a question for the viewer."] },
        ],
      },
    },
  },
};
