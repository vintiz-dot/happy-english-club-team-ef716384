import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 11 "Natural
// Resources" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the lesson's sentences said again and again as
// whole phrases, a little faster each round, with Unit 10's phrases mixed back in) and one
// writing routine (say it, write it, read it back). Two lessons end with a recorded talk
// for home, built on the routine the class just did. Time comes from games and warm-ups,
// never from the book pages or the grammar. All text is original.

const correctPlace =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('Where ... the bin?'), hold up a finger for the missing 'is', or repeat the error with a rising voice ('behind of?'). Example: a child says 'The bin behind the tree.' Point to the frame and say 'The bin ... ?' and wait. For a sound, just say it right and let them echo it. Say every final -s clearly yourself (trees, bottles, resources): children copy what they hear.";

const correctNeed =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('Plants ... water.'), hold up a finger for a missing -s, or repeat the error with a rising voice ('Two tree?'). Example: a child says 'We reduce trash with box.' Hold up a finger and say 'With ... box?' For a sound, just say it right and let them echo it. Say every final -s clearly yourself (resources, bottles, boxes): children copy what they hear.";

export const odL2U11Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u11-l1": {
      objectives: ["I can say what we need to live, fast and without stopping."],
      add: [
        {
          after: "What do we need? (SB 109 Think)",
          slide: {
            kind: "fluency",
            title: "Need sprint: we need it to live",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["We need water to live.", "Plants need sunlight to grow.", "A plant needs water, too.", "I want a toy, but I don't need it.", "I put the trash in the trash can."],
            recycle: ["Can I play, please?", "Yes, you can. Thank you!"],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 50, say: "Pairs: one shows a card, the other says the sentence. Swap at the clap." },
              { seconds: 40, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'We need water to live.'",
              "Listen for the clap: it means swap.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3, count your sentences on your fingers.",
            ],
            prompts: ["(card: water)", "(card: sun and plant)", "(card: a toy)", "(card: a trash can)", "(card: a girl asking to play)"],
            feedback: correctNeed,
            teacherNote: "Whole sentences only, never single words: 'We need water to live' should come out as one smooth piece. Listen for 'needs' with plural plants and for a missing 'to'. Mix in Unit 10's 'Can I ...?' cards every few turns so last unit's polite words stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["We need ___ to live.", "Plants need ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a because: 'We need water because we drink it every day.'", frames: ["We need ___ because ___."] },
            ],
          },
        },
        {
          after: "Main idea umbrella (SB 109 C)",
          slide: {
            kind: "writing",
            title: "Grow my resource sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add the extra words in the brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "We need water. (add: to live)", answer: "We need water to live." },
              { q: "Plants need sunlight. (add: to grow)", answer: "Plants need sunlight to grow." },
              { q: "I need food. (add: every day)", answer: "I need food every day." },
              { q: "I want a toy. (add: but I don't need it)", answer: "I want a toy, but I don't need it." },
            ],
            frames: ["We need ___ to ___.", "I want ___, but I don't need it."],
            checklist: ["A capital letter at the start", "A full stop at the end", "Plants need (many things): the verb has no -s"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese has no verb ending, so 'Plants needs' and 'A plant need' both appear. Say the pair aloud together first: 'Plants need, a plant needs.' Keep the explanation to one sentence.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'We need water and food to live.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u11-l2": {
      objectives: ["I can tell about resources three times, faster each time."],
      trim: { "Word slap": 4, "Earth says": 3 },
      add: [
        {
          after: "Expert groups: four parts (SB 110-111)",
          slide: {
            kind: "fluency",
            title: "Resources: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same ideas three times. Each time is shorter, smoother and faster.",
            chunks: ["Wood comes from trees.", "People make paper and tables from wood.", "Trash goes to the landfill.", "Smoke makes the air dirty.", "We can reduce trash and reuse boxes."],
            recycle: ["May I have a turn, please?", "Yes, you may."],
            rounds: [
              { seconds: 60, say: "Tell your partner about the resources. Use the four key-word cards: wood, landfill, smoke, reuse." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put the four key-word cards on the board: wood, landfill, smoke, reuse.",
              "Tell your partner what you know about each card, in your own words.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s or 'Trash go') and fix them together; then go on.",
              "When the bell rings, find a new partner. The listener says 'Wow!' at the end.",
            ],
            prompts: ["(card: wood)", "(card: landfill)", "(card: smoke)", "(card: reuse)"],
            feedback: correctNeed,
            teacherNote: "The same ideas three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Use what the expert groups found, not the book's sentences. Listen for 'Trash goes' (third person -s) and for the -s of trees, tables and boxes.",
            tiers: [
              { level: "Support", task: "Point to each card and say one sentence for it.", frames: ["Wood comes from ___.", "Trash goes to ___.", "We can ___."] },
              { level: "Core", task: "Tell all four ideas without the frames." },
              { level: "Stretch", task: "Add why: 'Smoke is bad because we breathe it.'", frames: ["___ is bad / good because ___."] },
            ],
          },
        },
        {
          after: "Hurts or helps? Chart it",
          slide: {
            kind: "writing",
            title: "Listen and rebuild: the clean Earth",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again. Write key words only: wood, landfill, smoke, reduce, reuse.",
              "With your group, rebuild the text. It does not need the same words, but it needs the same ideas.",
              "Read your text. Compare it with the real one.",
            ],
            text: {
              title: "Help the Earth",
              text: "People use wood to make tables and paper. Trash goes to the landfill, and smoke goes into the air. But we can help. We reduce trash, and we reuse boxes and bottles. Then the Earth stays clean.",
            },
            frames: ["People use ___ to make ___.", "We reduce ___, and we reuse ___."],
            checklist: ["Many things? The -s is there: tables, boxes, bottles", "A capital letter and a full stop in every sentence"],
            sayIt: "Read your group's text aloud, then say it again without looking.",
            teacherNote: "Read it at normal speed twice, with a short pause between sentences. Before reading, remind the class in one sentence: more than one thing, add -s. Then compare the group texts with the model by ideas first, spelling second.",
            tiers: [
              { level: "Support", task: "Write the key words and one sentence with the frames." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it and add one more sentence about what you can reuse." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My Earth helper talk",
        prompt: "Tell what you can do every day to take care of the Earth. Show something you can reuse, like a box or a bottle!",
        length: "45-90 seconds",
        steps: [
          "Think of three things you can do: reduce trash, reuse something and keep a place clean.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say three things you can do for the Earth, with a because, and keep talking without long stops.",
        words: ["reduce", "reuse", "trash", "resources", "landfill", "wood"],
        grammar: ["I can ___ every day.", "We reduce / reuse ___ because ___."],
        rubric: [
          { label: "Three things", description: "Says three things they can do for the Earth.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: reduce, reuse, trash, resources, landfill.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of boxes, bottles and resources can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I can ___ every day.", "I reuse ___."], tips: ["Hold up one finger for each thing."] },
          { level: "Core", who: "Most children", frames: ["I can reduce ___ every day.", "I reuse ___ because ___."], tips: ["Say what you do and why."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think it is important to ___ because ___.", "If we ___, the Earth ___."], tips: ["Give a reason for each thing."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u11-l3": {
      objectives: ["I can ask and say where things are, round the circle, without stopping."],
      trim: { "Teddy says: place game": 5 },
      add: [
        {
          after: "Park picture talk (SB 113 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: where is it?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Where is the bin?", "It is behind the tree.", "Is it above the pond?", "No, it isn't. It is in front of the bench.", "Where are the bottles? They are across from the park."],
            recycle: ["Can I sit here, please?", "Yes, you can."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a park picture card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your picture card so only you can see it.",
              "Ask the friend on your left: 'Where is the ___?' They answer with a place word.",
              "Then ask 'Is it ___ the ___?' They say 'Yes, it is.' or 'No, it isn't.'",
              "They turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Where is the ___?", "Is it ___ the ___?", "Where are the ___?"],
            feedback: correctPlace,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Where is ...?' and 'Is it ...?' automatic. Time the whole circle and tell them: children love beating their own time. Listen for 'Where the bin is?', 'behind of' and 'Yes, it behind.'",
            tiers: [
              { level: "Support", task: "Answer with the frame on the board and pass the question on.", frames: ["It is ___ the ___.", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add the pair: 'It is behind the tree, so the tree is in front of it.'" },
            ],
          },
        },
        {
          after: "Look around the classroom (SB 113 F)",
          slide: {
            kind: "writing",
            title: "Fix the park sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: a missing is / are, an extra word, or a word in the wrong place.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "The bird above the tree.", answer: "The bird is above the tree." },
              { q: "The trash can is behind of the tree.", answer: "The trash can is behind the tree." },
              { q: "The tree is in front the bin.", answer: "The tree is in front of the bin." },
              { q: "Where the bin is?", answer: "Where is the bin?" },
              { q: "The bottles is across from the park.", answer: "The bottles are across from the park." },
            ],
            checklist: ["Every place sentence has is or are", "No extra 'of' after behind or above", "A question starts with Where is / Is"],
            sayIt: "Read your fixed sentences to your partner, then say one without looking.",
            teacherNote: "These are common mistakes for children who speak Vietnamese: leaving out 'is' / 'are', 'behind of' (copied from 'in front of'), and the question order 'Where the bin is?'. Fix the first one together, and say why in one short sentence. Do not correct more than three error types.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 2 and 4." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u11-l4": {
      objectives: ["I can talk about three resources I see every day, three times, faster each time."],
      add: [
        {
          after: "Rehearse: three resources I see every day",
          slide: {
            kind: "fluency",
            title: "Resource talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same talk about three resources to three friends. Each talk is shorter and smoother.",
            chunks: ["I see trees in the park.", "We need water because we drink it every day.", "All living things need sunlight.", "I can take care of the park if I put trash in the bin."],
            recycle: ["May I go first, please?", "Yes, you may. Thank you!"],
            rounds: [
              { seconds: 60, say: "Give your talk to your first listener. The listener counts the resources on their fingers." },
              { seconds: 45, say: "Move to a new listener. Give the same talk in less time." },
              { seconds: 30, say: "Move to a third listener. The same talk again, as smooth as you can." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (often a missing -s or a forgotten 'because') and fix them together; then go on.",
              "The listener has a job: count the resources on your fingers, then ask one question, 'Why?'",
              "Line B talks next with the same three rounds.",
            ],
            prompts: ["(picture: tree)", "(picture: water)", "(picture: sunlight)"],
            feedback: correctNeed,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for seven-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently, and the one-minute fix is where accuracy comes from.",
            tiers: [
              { level: "Support", task: "Say three short sentences, with a friend's help if you need it.", frames: ["I see ___ in ___.", "We need ___."] },
              { level: "Core", task: "Say all four sentences without looking at the board." },
              { level: "Stretch", task: "Add a because to every resource.", frames: ["We need ___ because ___."] },
            ],
          },
        },
        {
          after: "Word sort: verb, noun, adjective, pronoun (SB 115 F)",
          slide: {
            kind: "writing",
            title: "Read the model, write my park",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find a noun, an adjective and the pronoun They.",
              "Write three sentences about a place you like. Use one adjective and one pronoun.",
              "Read your sentences to your partner.",
            ],
            text: {
              title: "My green park",
              text: "I see trees and a pond in my park. They are tall and green. We need them because they give us shade. I keep my park clean.",
            },
            frames: ["I see ___ in my ___.", "They are ___ and ___.", "We need them because ___."],
            checklist: ["An adjective before the noun: a green park", "They takes the place of more than one thing", "A capital letter and a full stop"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            teacherNote: "This is a short model to copy the pattern from, not a text to learn. Point out how They saves saying 'the trees and the pond' again. A child who says 'park green' needs the adjective-before-noun pattern shown on the model.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them in with words from the model." },
              { level: "Core", task: "Write three sentences about a place you like." },
              { level: "Stretch", task: "Write four sentences and use 'because' and 'and'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u11-l5": {
      objectives: ["I can say where things are in my park, again and again, faster each time."],
      trim: { "Trash hunt: ask, find, say": 8, "Remember it!": 4 },
      add: [
        {
          after: "Two parks, five differences",
          slide: {
            kind: "fluency",
            title: "Two parks again: new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same difference game again with a new partner. Say it faster and with no stops.",
            chunks: ["Where is the bin in your park?", "In my park, the bin is behind the tree.", "Is it across from the pond? No, it isn't.", "The bench is in front of the bin, so the bin is behind the bench."],
            recycle: ["We need water to live.", "Can I have a turn, please?"],
            rounds: [
              { seconds: 60, say: "Plan for a minute with your first partner. Then play the difference game." },
              { seconds: 50, say: "New partner. The same game, with no planning. Say it faster." },
              { seconds: 40, say: "New partner again. Find all the differences before the bell!" },
            ],
            steps: [
              "Look at your park picture. Plan three sentences in your head.",
              "Play the difference game: ask 'Where is the ___ in your park?' and answer with a place word.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "The listener has a job: tick each difference you hear.",
            ],
            prompts: ["Where is the ___ in your park?", "Is the ___ ___ the ___?"],
            feedback: correctPlace,
            teacherNote: "The same task with new partners, as in the book game: the repetition frees attention for speed. Do not change the picture between rounds. Listen for the pair: the bin is behind the tree, so the tree is in front of the bin.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and point to the picture.", frames: ["In my park, the ___ is ___ the ___.", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Ask and answer without looking at the frames." },
              { level: "Stretch", task: "Give the pair for every answer: 'The bin is behind the tree, so the tree is in front of the bin.'" },
            ],
          },
        },
        {
          after: "Say it, then write: my clean park map",
          slide: {
            kind: "writing",
            title: "Join my park sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences aloud.",
              "Join them with the word in the brackets. Write one long sentence.",
              "Read it aloud, and say it again without looking.",
            ],
            items: [
              { q: "The bin is behind the tree. The bench is in front of the pond. (and)", answer: "The bin is behind the tree, and the bench is in front of the pond." },
              { q: "The bottle is in front of the bin. It is not in the bin. (but)", answer: "The bottle is in front of the bin, but it is not in the bin." },
              { q: "I put the bin in front of the bench. People can reach it. (because)", answer: "I put the bin in front of the bench because people can reach it." },
              { q: "The bird flies above the pond. It sits behind the tree. (and then)", answer: "The bird flies above the pond, and then it sits behind the tree." },
            ],
            frames: ["The ___ is ___ the ___, and ___.", "The ___ is ___ the ___, but ___.", "I put the ___ ___ the ___ because ___."],
            checklist: ["is / are in every part", "A comma before and or but", "A capital letter at the start and a full stop at the end"],
            sayIt: "Read your long sentences to your partner, then say one without looking.",
            teacherNote: "Combining makes the children hold two place sentences together, which is the same skill as saying them fluently. Do the first one together. Keep to and / but / because; do not correct anything else.",
            tiers: [
              { level: "Support", task: "Join sentences 1 and 2 with the frames." },
              { level: "Core", task: "Join all four sentences." },
              { level: "Stretch", task: "Write two of your own pairs and join them." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My clean park talk",
        prompt: "Show your clean park map at home and say where the bin and the other things are. Say why you put the recycling bin there.",
        length: "45-90 seconds",
        steps: [
          "Look at your clean park map from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say where four things are in your park, with a because, and keep talking without long stops.",
        words: ["behind", "in front of", "above", "across from", "recycling bin", "trash"],
        grammar: ["The ___ is behind / in front of / above / across from the ___.", "Where is the ___? Is it ___ the ___?"],
        rubric: [
          { label: "Four places", description: "Says where four things are in the park.", weight: 3 },
          { label: "Place words", description: "Uses behind, in front of, above or across from correctly, with is / are.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Because", description: "Gives a reason for where the bin goes.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is ___ the ___.", "Yes, it is. / No, it isn't."], tips: ["Point to each thing on your map."] },
          { level: "Core", who: "Most children", frames: ["The ___ is ___ the ___, and the ___ is ___ the ___.", "I put the bin ___ the ___ because ___."], tips: ["Say two things in one sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The bin is behind the tree, so the tree is in front of the bin.", "Is the ___ ___ the ___? No, it isn't."], tips: ["Give the pair, and ask a question too."] },
        ],
      },
    },
  },
};
