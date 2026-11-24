import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 17 "Living and
// Nonliving Things" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's grammar said again and again as whole
// sentences, a little faster each round, with Unit 16's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Lessons 2 and 5 end with a recorded talk
// for home (Lesson 4 already has its own). Time comes from games and repeats, never from the
// book pages or the grammar. All text is original.

const fix =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause, or hold up a finger for the missing -s) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U17Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u17-l1": {
      objectives: ["I can say what living things do and what nonliving things don't do, fast and smooth."],
      drop: ["Simon says: breathe, move, change"],
      trim: { "Run and touch: living or nonliving?": 5 },
      add: [
        {
          after: "Does it move? Does it grow?",
          slide: {
            kind: "fluency",
            title: "Living sprint: does it breathe?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["A cat breathes.", "A toy cat doesn't breathe.", "Does it move? Yes, it does.", "Does it grow? No, it doesn't.", "A plant grows."],
            recycle: ["Can you clap? Yes, I can.", "I like to sing."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence and does the action." },
              { seconds: 45, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'A cat breathes.' or 'A toy cat doesn't breathe.'",
              "Do the action too: breathe in and out, wiggle, stand still like a toy.",
              "Listen for the clap: it means change partners.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'A cat breathe.') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: cat)", "(card: toy cat)", "(card: plant)", "(card: robot)", "(card: bird)", "(card: doll)"],
            feedback:
              "Grammar: point to the end of the word and hold up a finger for the missing -s: 'A cat breathe...?' (child: 'breathes!'). If a child says 'A toy cat don't breathe', start the phrase and pause: 'A toy cat does...?' Pronunciation: if breathes comes out as 'breed', say it right ('breathes') and let them echo. " + fix,
            teacherNote:
              "Whole sentences only, never single words: 'A cat breathes' is one smooth piece. Vietnamese children often drop the final -s on breathes, grows and moves, so say every one of them clearly and let the children feel the s on their lips. Mix in Unit 16's 'Can you ...?' cards every few turns so those phrases stay fast too.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["A ___ breathes.", "A toy ___ doesn't breathe."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Say a pair: 'A cat breathes, but a toy cat doesn't breathe.'", frames: ["A ___ breathes, but a toy ___ doesn't."] },
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
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the describing word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "A cat breathes. (add: small)", answer: "A small cat breathes." },
              { q: "A toy doesn't breathe. (add: red)", answer: "A red toy doesn't breathe." },
              { q: "A plant grows. (add: green)", answer: "A green plant grows." },
            ],
            frames: ["A ___ plant grows.", "A ___ toy doesn't breathe."],
            checklist: ["A capital letter at the start", "A full stop at the end", "breathes, grows, moves: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a sentence shows children that a sentence is a frame they can fill. Watch for 'A toy doesn't breathes': after doesn't the verb has no -s. Fix one together first.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write one sentence with 'and': 'A small cat breathes and moves.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u17-l2": {
      objectives: ["I can tell my friend about living and nonliving things three times, faster each time."],
      add: [
        {
          after: "Team Living and Team Nonliving",
          slide: {
            kind: "fluency",
            title: "Living or nonliving: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same thing three times. Each time is shorter, smoother and faster.",
            chunks: ["Living things grow.", "Living things breathe.", "Nonliving things don't grow.", "Nonliving things don't breathe.", "A plant is living. A rock is nonliving."],
            recycle: ["What do you see?", "Can you clap? Yes, I can."],
            rounds: [
              { seconds: 60, say: "Tell your partner about living and nonliving things. Use the picture cards on the board." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the cards: a plant, a cat, a rock, a robot.",
              "Tell your partner: which are living? What do they do? Which are nonliving? What don't they do?",
              "The listener has a job: count how many living things your partner says, and say 'Wow!' at the end.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Living things grow.' said as 'Living thing grow') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(picture: plant)", "(picture: cat)", "(picture: rock)", "(picture: robot)"],
            feedback:
              "Grammar: for 'Living thing grow' point to the word 'things' on the board and hold up two fingers: 'Living thing...?' (child: 'things!'). For 'Nonliving things not grow', start the phrase and pause: 'Nonliving things don't...?' Pronunciation: say the final s in things and plants clearly and let the child echo. " + fix,
            teacherNote:
              "This is the same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words, and the one-minute fix between round 1 and round 2 is what makes it more correct as well as faster. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["Living things ___.", "Nonliving things don't ___."] },
              { level: "Core", task: "Tell all of it without the frames." },
              { level: "Stretch", task: "Add your own example: 'A fish is a living thing. It breathes in water.'" },
            ],
          },
        },
        {
          after: "Living and Nonliving chart (SB 171 Think)",
          slide: {
            kind: "writing",
            title: "Listen and build: plant and rock",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Listen to the teacher read the short text. Do not write yet.",
              "Listen again. Write the words you hear: plant, grows, rock, doesn't.",
              "Work together to build the text. Read it aloud.",
              "Teacher: remind the class first: living things grow and breathe; nonliving things don't.",
            ],
            text: {
              title: "A plant and a rock",
              text: "A plant is a living thing. It grows and it changes. A rock is a nonliving thing. It doesn't grow, and it doesn't breathe.",
            },
            frames: ["A ___ is a living thing.", "It ___.", "A ___ is a nonliving thing.", "It doesn't ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop at the end", "grows: the -s is there"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "Read at a natural speed, twice, and say the final s in grows clearly. Children rebuild the meaning, not the exact words: accept 'A plant is living. It grows.' as a good try and compare with the model afterwards. Good listening, not copying, is the point.",
            tiers: [
              { level: "Support", task: "Fill in the frames from the board.", frames: ["A plant is a ___ thing.", "It ___."] },
              { level: "Core", task: "Build the whole text with your group." },
              { level: "Stretch", task: "Build the text, then write one more sentence about a cat or a toy." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Living things breathe and grow",
        prompt: "Show a plant, a pet or a picture, and a toy. Tell what the living thing does and what the toy doesn't do.",
        length: "30-60 seconds",
        steps: [
          "Pick one living thing and one nonliving thing at home.",
          "Say about them three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell about one living thing and one nonliving thing, and keep talking without long stops.",
        words: ["living", "nonliving", "breathe", "grow", "move", "plant"],
        grammar: ["A ___ breathes / grows.", "A ___ doesn't breathe / grow."],
        rubric: [
          { label: "Two things", description: "Tells about one living thing and one nonliving thing.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: living, nonliving, breathe, grow, move.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Breathes and doesn't", description: "Says 'A cat breathes' with the -s, and 'A toy doesn't breathe' with doesn't.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ is living. It ___.", "A ___ is nonliving. It doesn't ___."], tips: ["Hold up the thing as you speak."] },
          { level: "Core", who: "Most children", frames: ["A ___ is a living thing. It breathes and ___.", "A ___ is a nonliving thing. It doesn't ___."], tips: ["Say two things for each one."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["A ___ breathes, but a toy ___ doesn't.", "I take care of my ___."], tips: ["Add how you take care of it."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u17-l3": {
      objectives: ["I can ask 'Can it ...?' and answer 'Yes, it can.' or 'No, it can't.' fast, round the circle."],
      trim: { "Freeze dance: can and can't": 3, "Can it? Cards in the hoops": 6 },
      add: [
        {
          after: "Can it move, grow or change? (SB 173 D practice)",
          slide: {
            kind: "fluency",
            title: "Question chain: Can it ...?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Can a fish swim?", "Yes, it can.", "No, it can't.", "A bird can fly.", "A rock can't fly."],
            recycle: ["Can you sing? Yes, I can.", "I like to dance."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a picture card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your card so only you can see it.",
              "Ask the friend on your left about their card: 'Can a ___ fly?'",
              "They answer: 'Yes, it can.' or 'No, it can't.' Then they turn and ask the next friend.",
              "A 'No, it can't' answer adds: 'A ___ can ___.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
            ],
            prompts: ["(card: fish)", "(card: bird)", "(card: rock)", "(card: ball)", "(card: puppy)", "(card: chair)"],
            feedback:
              "Grammar: if a child says 'Yes, it is', hold up a finger and start the answer: 'Yes, it c...?' If a child says 'Can a fish swims?', point to the word can on the frame and say 'Can a fish sw...?' and pause. Pronunciation: can't should end with a clear t sound; say it right and let the child echo. " + fix,
            teacherNote:
              "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Can it ...?' automatic. Time the whole circle and tell them; children love beating their own time. After can and can't the verb never takes -s: listen for 'A bird can flies'.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, it can.' or 'No, it can't.' and pass the question on with the frame on the board.", frames: ["Can a ___ ___?", "Yes, it can. / No, it can't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a sentence: 'No, it can't. A rock can't swim, but a fish can.'" },
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
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a capital letter, a full stop, an extra -s or the wrong word.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "a fish can swim", answer: "A fish can swim." },
              { q: "A plant cans grow.", answer: "A plant can grow." },
              { q: "The cat can runs.", answer: "The cat can run." },
              { q: "Can a fish swim? Yes, it is.", answer: "Can a fish swim? Yes, it can." },
            ],
            checklist: ["Every sentence starts with a capital letter", "A full stop or a question mark at the end", "After can there is no -s on the next word"],
            sayIt: "Read your fixed sentences to the class in a loud, clear voice.",
            teacherNote: "After can the verb stays the same for every thing and person: 'can runs' and 'cans grow' are common because plain action words take -s elsewhere in this unit (breathes, grows). Fix one together first and say the corrected sentence aloud.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u17-l4": {
      objectives: ["I can say what I can see in my park, and which things are living, without stopping."],
      trim: { "Park walk": 3, "What's missing?": 3, "Describing word mime": 3 },
      add: [
        {
          after: "My favorite park (SB 174 Think)",
          slide: {
            kind: "fluency",
            title: "My park: say it three times",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Tell your partner about the park three times. Each time is shorter and smoother.",
            chunks: ["In my park I can see a bench.", "A bush is a living thing.", "A statue is a nonliving thing.", "A rose can grow.", "Is there a fountain? Yes, there is."],
            recycle: ["Can you sing? Yes, I can.", "A plant grows."],
            rounds: [
              { seconds: 60, say: "Tell your partner about your park. Use the park cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Pick three park cards. Say: 'In my park I can see a ___.' Say if each is living or nonliving.",
              "The listener has a job: tick the living things on the board chart.",
              "When the bell rings, find a new partner and tell it again, faster.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'Is there have a fountain?') and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: bench)", "(card: bush)", "(card: statue)", "(card: grass)", "(card: rose)", "(card: fountain)"],
            feedback:
              "Grammar: Vietnamese children often say 'There have a bench' for 'There is a bench'. Point to the frame 'Is there a ___?' and start the answer: 'Yes, there i...?' If a child drops a or an, hold up a finger and say 'In my park I can see ... bench?' (child: 'a bench'). Pronunciation: if bush sounds like 'bus', say it right and let them echo. " + fix,
            teacherNote:
              "Telling the same message three times, to new partners, with less time each time, is the 4-3-2 idea scaled down for six-year-olds: the second and third tellings are faster because the words are already ready. The minute between round 1 and round 2 is what keeps it accurate. Let children keep the cards in hand.",
            tiers: [
              { level: "Support", task: "Point to the cards and say one sentence for each.", frames: ["In my park I can see a ___.", "It's a living thing."] },
              { level: "Core", task: "Tell all of it, living and nonliving, without the frames." },
              { level: "Stretch", task: "Add a question: 'Is there a fountain in your park?' 'Yes, there is.'" },
            ],
          },
        },
        {
          after: "Circle the describing words (SB 175 F)",
          slide: {
            kind: "writing",
            title: "Write like the park model",
            routine: "model, then write",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the model with the teacher. Say it once together.",
              "Look: which sentence tells living or nonliving? Which tells a describing word?",
              "Write your own sentences about a thing in the park. Use the frames.",
            ],
            text: {
              title: "A bush and a statue",
              text: "A bush is a living thing. It is green. It can grow. A statue is a nonliving thing. It is big. It can't move.",
            },
            frames: ["A ___ is a living thing. It is ___. It can ___.", "A ___ is a nonliving thing. It is ___. It can't ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "a before the thing: a bush"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "Children copy the shape of a model, then change the words: that is exactly what you want. Say the final t of can't clearly.",
            tiers: [
              { level: "Support", task: "Copy the model and change one word." },
              { level: "Core", task: "Write two sentences about a living thing in the park." },
              { level: "Stretch", task: "Write three sentences, then join two with 'and': 'It is green and big.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u17-l5": {
      objectives: ["I can say what things can and can't do, again and again, smooth and fast."],
      trim: { "Garden path game": 7 },
      add: [
        {
          after: "What can it do? Find the missing answers",
          slide: {
            kind: "fluency",
            title: "Champion sprint: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same task three times with new partners. Each time, say it smoother and faster.",
            chunks: ["A fish can swim.", "A rock can't swim.", "Can a puppy jump? Yes, it can.", "Can a ball move? No, it can't.", "It's living because it can grow."],
            recycle: ["A cat breathes.", "In my park I can see a bush."],
            rounds: [
              { seconds: 60, say: "Pick a card. Ask your partner: 'Can a ___ ___?' Answer, then swap." },
              { seconds: 45, say: "New partner. Same task. Go faster!" },
              { seconds: 45, say: "New partner. Same task. Keep going: can you say ten sentences?" },
            ],
            steps: [
              "Pick a card. Ask: 'Can a ___ ___?'",
              "Your partner answers: 'Yes, it can.' or 'No, it can't.' and adds 'A ___ can ___.' or 'A ___ can't ___.'",
              "When the bell rings, new partner: same task again.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: fish)", "(card: puppy)", "(card: ball)", "(card: rock)", "(card: plant)", "(card: toy car)"],
            feedback:
              "Grammar: if a child says 'A rock not can swim', point to the frame and say 'A rock c...?' with a finger up for can't. If a child says 'A fish can swims', repeat the error with rising voice: 'A fish can swims?' and let the child hear and fix it. Pronunciation: make the final t of can't clear; say it right and let the child echo. " + fix,
            teacherNote:
              "Task repetition: the task does not change, the partner does, so the language is the same and the speed grows. This is the week's last practice of can and can't, so listen for three slips that are common in this unit: the missing -s (breathes, grows), 'Yes, it is' for 'Yes, it can', and a or an missing. Do not correct everything: pick two for the board.",
            tiers: [
              { level: "Support", task: "Use the frames on the board with a friend.", frames: ["Can a ___ ___?", "Yes, it can. / No, it can't."] },
              { level: "Core", task: "Ask, answer and add a sentence without the board." },
              { level: "Stretch", task: "Add why: 'A plant can grow, so it's living.'" },
            ],
          },
        },
        {
          after: "Write like a champion: can and can't",
          slide: {
            kind: "writing",
            title: "Join the can sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read the two short sentences with your partner.",
              "Join them into one sentence with 'and' or 'but'.",
              "Write the new sentence. Read it aloud together.",
            ],
            items: [
              { q: "A bird can fly. A bird can sing.", answer: "A bird can fly and sing." },
              { q: "I can jump. I can clap.", answer: "I can jump and clap." },
              { q: "A fish can swim. A fish can't walk.", answer: "A fish can swim, but it can't walk." },
              { q: "A plant can grow. A plant can't run.", answer: "A plant can grow, but it can't run." },
            ],
            frames: ["A ___ can ___ and ___.", "A ___ can ___, but it can't ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "and joins two things it can do; but joins can and can't"],
            sayIt: "Read your joined sentences to your partner, then say them again without looking.",
            teacherNote: "Joining short sentences is a well-researched way to help young writers write longer sentences. Say the joined sentence with a clear 'and' or 'but' and a tiny pause before 'but'. Watch for 'can runs' and 'cans fly': after can the verb stays plain.",
            tiers: [
              { level: "Support", task: "Join sentences 1 and 2 with 'and'." },
              { level: "Core", task: "Join all four sentences." },
              { level: "Stretch", task: "Write your own pair of sentences and join them." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "What can it do?",
        prompt: "Show or draw three things. Tell what each one can do and what it can't do.",
        length: "30-60 seconds",
        steps: [
          "Pick three things at home: a pet or a plant, a toy and something else.",
          "Say what each can do and can't do three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell what three things can do and can't do, and keep talking without long stops.",
        words: ["can", "can't", "swim", "fly", "run", "grow"],
        grammar: ["A ___ can ___.", "A ___ can't ___.", "Can a ___ ___? Yes, it can. / No, it can't."],
        rubric: [
          { label: "Three things", description: "Tells about three things, with at least one can and one can't.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: living, nonliving, can, can't, grow, move.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Can and can't", description: "Says 'A bird can fly' and 'A rock can't fly', with no extra -s after can.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["A ___ can ___.", "A ___ can't ___."], tips: ["Hold up each thing as you speak."] },
          { level: "Core", who: "Most children", frames: ["A ___ can ___, but it can't ___.", "It's living because it can ___."], tips: ["Say can and can't for every thing."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Can a ___ ___? Yes, it can.", "A ___ can ___ and ___."], tips: ["Ask a toy a Can question and answer it yourself."] },
        ],
      },
    },
  },
};
