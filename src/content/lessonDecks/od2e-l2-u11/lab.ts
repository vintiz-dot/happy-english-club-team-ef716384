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
      trim: { "The mystery bag": 4 },
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
            title: "What we need to live: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and to the joining words.",
              "Plan: use the four boxes. Draw or write a few words in each box.",
              "Write: one sentence for each box, in order. Join the ideas with and, but and then.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and the verb -s (Plants need, a plant needs). Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: What we need",
              text: "We need many things to live. First, we need water and food every day. Plants need sunlight and water, too. I want a new toy, but I don't need it. Then I say thank you to the Earth!",
            },
            organiser: [
              {
                "label": "We need",
                "prompt": "Draw water and food. What do you need every day?"
              },
              {
                "label": "Plants need",
                "prompt": "Draw a plant. What does it need to grow?"
              },
              {
                "label": "I want",
                "prompt": "Draw a toy you want, but do not need."
              },
              {
                "label": "Thank you",
                "prompt": "Draw the Earth. Who do you thank?"
              }
            ],
            frames: ["We need many things to live.","First, we need ___ and ___ every day.","Plants need ___ and ___, too.","I want ___, but I don't need it.","Then I say thank you to the ___!"],
            checklist: [
              "A capital letter at the start and a full stop at the end of every sentence",
              "Plants need, a plant needs: check the verb ending",
              "At least one joining word: and, but or then"
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for seven-year-olds: four or five sentences, planned in four boxes with drawings or a few words. It replaces the one-sentence 'grow my sentence' task, and the best sentence from that task ('I want a toy, but I don't need it') is now the fourth sentence. Mark only two things (capital letters, the verb -s) and let the child find the mistake from your dot.",
            tiers: [
              {
                "level": "Support",
                "task": "Copy two frames and fill in one word in each. Use the drawings to help.",
                "frames": [
                  "We need ___ to live.",
                  "I want ___, but I don't need it."
                ]
              },
              {
                "level": "Core",
                "task": "Write four sentences, one for each box, with one joining word."
              },
              {
                "level": "Stretch",
                "task": "Write five sentences and use and, but and because: 'We need water because we drink it every day.'"
              }
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
      trim: { "Teddy says: place game": 5, "Where is the bear? Chant": 4 },
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
            title: "My park: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and to the joining words.",
              "Plan: use the four boxes. Draw or write a few words in each box.",
              "Write: one sentence for each box. Say where each thing is. Use and and because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and is / are in every place sentence. Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: My park",
              text: "This is my park. The pond is in front of the big tree, and the bench is behind the tree. Two birds are above the pond. The bin is across from the bench because people eat lunch there. I like my park!",
            },
            organiser: [
              {
                "label": "My park",
                "prompt": "Draw your park. What do you like in it?"
              },
              {
                "label": "Pond, tree, bench",
                "prompt": "Draw the pond, the tree and the bench. Where is each one?"
              },
              {
                "label": "Birds",
                "prompt": "Draw the birds. Where are they?"
              },
              {
                "label": "Bin",
                "prompt": "Draw the bin. Where is it? Why is it there?"
              }
            ],
            frames: ["This is my park.","The ___ is in front of the ___, and the ___ is behind the ___.","Two ___ are above the ___.","The bin is across from the ___ because ___.","I like my park!"],
            checklist: [
              "Every place sentence has is or are",
              "No extra 'of' after behind or above",
              "A capital letter at the start and a full stop at the end of every sentence"
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking at the page.",
            teacherNote: "The park paragraph uses the place words of the lesson in real sentences. It replaces the 'fix the park sentences' task: the common mistakes (a missing is / are, 'behind of', 'Where the bin is?') are now the checklist, so the child checks for them in their own writing. Mark only is / are and capital letters, with a dot beside the line.",
            tiers: [
              {
                "level": "Support",
                "task": "Copy two frames and fill in one word in each. Point to your drawing.",
                "frames": [
                  "The ___ is behind the ___.",
                  "Two ___ are above the ___."
                ]
              },
              {
                "level": "Core",
                "task": "Write four sentences, one for each box."
              },
              {
                "level": "Stretch",
                "task": "Write five sentences with and, but and because. Write two sentences about the same two things: 'The bin is behind the tree. The tree is in front of the bin.'"
              }
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
      trim: { "Trash hunt: ask, find, say": 8, "Remember it!": 4, "Grammar mystery: Pip and the trash": 4 },
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
            title: "My clean park plan: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to each sentence and to the joining words.",
              "Plan: use the four boxes. Draw or write a few words in each box.",
              "Write: one sentence for each box. Use First, Then and At the end, and one because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at capital letters and is / are and the place words. Put a dot next to a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model: My clean park",
              text: "I put the recycling bin in front of the bench because people can see it. First, people sit on the bench and drink water. Then they put the bottles in the bin. The trash can is behind the tree, but the bin is easy to see. At the end, our park is clean!",
            },
            organiser: [
              {
                "label": "Where",
                "prompt": "Draw the bin on your map. Where is it? Why?"
              },
              {
                "label": "First",
                "prompt": "Draw the people. What do they do first?"
              },
              {
                "label": "Then",
                "prompt": "Draw the bottles going in the bin. Where is the trash can?"
              },
              {
                "label": "At the end",
                "prompt": "Draw the clean park. How is it?"
              }
            ],
            frames: ["I put the recycling bin ___ the ___ because ___.","First, people ___.","Then they put the ___ in the bin.","The trash can is ___ the ___, but the bin is ___.","At the end, our park is ___!"],
            checklist: [
              "Every place sentence has is or are",
              "A comma after First and after At the end",
              "A capital letter at the start and a full stop at the end of every sentence"
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again, pointing to your map.",
            teacherNote: "This paragraph turns the clean park map the children just made and talked about into writing; the map is the plan. It replaces the sentence-combining task, whose and / but / because are now used inside the paragraph. If the class records the clean park talk at home, this paragraph is its script. Mark only is / are and capital letters.",
            tiers: [
              {
                "level": "Support",
                "task": "Copy two frames and fill in one word in each. Use your map.",
                "frames": [
                  "I put the bin ___ the ___.",
                  "At the end, our park is ___!"
                ]
              },
              {
                "level": "Core",
                "task": "Write four sentences, one for each box."
              },
              {
                "level": "Stretch",
                "task": "Write five sentences and write two sentences about the same two things: 'The bin is behind the tree. The tree is in front of the bin.'"
              }
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
