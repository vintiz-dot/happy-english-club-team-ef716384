// Oxford Discover 2nd edition, Level 3, Unit 6 (Seeing Like a Poet): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, poem, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used: a haiku has three lines of 5, 7 and 5
// syllables; a cinquain has five lines; an acrostic spells a word down the first
// letters; television, thermometer, secretary and automobile have four syllables,
// calendar and understand have three.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U6Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ past continuous
  {
    id: "od2e-l3-u06-ws-past-continuous",
    title: "Past continuous and simple past",
    grammar: "was / were + -ing + when + simple past",
    deckId: "od2e-l3-u06-l3",
    slide: "Past continuous and simple past",
    intro:
      "Use was / were + -ing for an action that was in progress, and the simple past for the shorter action that happened in the middle: 'I was drawing when the bell rang.' Use was with I / he / she / it and were with you / we / they. Join the two parts with when.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "I ___ a book when the lights went out.  (was reading / were reading)  ->  was reading",
        items: [
          { q: "I ___ a book when the lights went out.", options: ["was reading", "were reading"], answer: "was reading" },
          { q: "We ___ football when it started to rain.", options: ["was playing", "were playing"], answer: "were playing" },
          { q: "My sister was cooking when the phone ___.", options: ["rang", "ringing"], answer: "rang" },
          { q: "What ___ you doing when the bell rang?", options: ["was", "were"], answer: "were" },
          { q: "The children were singing ___ the teacher walked in.", options: ["what", "when"], answer: "when" },
          { q: "He ___ sleeping when I called him.", options: ["wasn't", "weren't"], answer: "wasn't" },
          { q: "Which sentence is correct?", options: ["I was walk home when I saw a rainbow.", "I was walking home when I saw a rainbow."], answer: "I was walking home when I saw a rainbow." },
          { q: "They ___ a picture when the pencil broke.", options: ["were drawing", "was drawing"], answer: "were drawing" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words. Use the verb in brackets. For the rewrite and correct questions, write the whole sentence.",
        example: "I ___ (walk) to the shop when it began to rain.  ->  was walking",
        items: [
          { q: "I ___ (walk) to the shop when it began to rain.", answer: "was walking" },
          { q: "My cousins ___ (play) chess when the lights went out.", answer: "were playing" },
          { q: "It was raining when we ___ (get) to the park.", answer: "got" },
          { q: "She ___ (not / listen) when the teacher called her name.", answer: "wasn't listening" },
          { q: "Write the question: (you / do / when the rain started)", answer: "What were you doing when the rain started?" },
          { q: "Correct the mistake: We was playing when the ball hit the window.", answer: "We were playing when the ball hit the window." },
          { q: "Correct the mistake: I was eat lunch when my friend called.", answer: "I was eating lunch when my friend called." },
          { q: "Join with when: I was drawing. My pencil broke.", answer: "I was drawing when my pencil broke." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every was, were, -ing and when.",
        example: "I was riding my bike when I saw a dog.",
        items: [
          {
            q: "Write one sentence about a long action and a short action in the middle of it, for example during a lesson.",
            answer: "e.g. We were reading quietly when the fire alarm rang.",
          },
          {
            q: "Find and fix four mistakes: 'I was walk in the park when I was seeing a rainbow. My friends was playing football when it start to rain.'",
            answer: "was walking; saw; were playing; started.",
          },
          { q: "Explain in one sentence why we say 'I was reading when the lights went out' and not 'I read when the lights went out'.", answer: "e.g. Because the reading was already in progress, so we use was + -ing for the longer action, and the short event is the simple past." },
          { q: "Rewrite with while: My mother was cooking. My father was reading.", answer: "While my mother was cooking, my father was reading." },
          { q: "Write an alibi: it is 4 o'clock and a cake has disappeared. Say what you were doing, in two sentences.", answer: "e.g. At four o'clock I was doing my homework in my room. My brother was helping me when we heard a noise." },
          { q: "Write a true sentence about what you were doing when something happened yesterday. Use when.", answer: "e.g. I was eating dinner when my uncle called." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ action verbs
  {
    id: "od2e-l3-u06-ws-action-verbs",
    title: "Action verbs",
    grammar: "action verbs (the wind dances, the waves crash)",
    deckId: "od2e-l3-u06-l4",
    slide: "Action verbs",
    intro:
      "An action verb tells what someone or something does. In poems, action verbs bring things to life: 'The rain taps on the roof.' With he, she, it or one thing, add -s in the present: the moon smiles. With plural nouns, no -s: the waves crash.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "The rain ___ on the roof.  (taps / tap)  ->  taps",
        items: [
          { q: "Which word is the action verb? The wind dances on the lake.", options: ["wind", "lake", "dances"], answer: "dances" },
          { q: "The rain ___ on the roof.", options: ["tap", "taps"], answer: "taps" },
          { q: "The moon ___ at the sleeping town.", options: ["smiles", "smile"], answer: "smiles" },
          { q: "Waves ___ onto the sand.", options: ["crashes", "crash"], answer: "crash" },
          { q: "Which is NOT an action verb?", options: ["soft", "run", "splash"], answer: "soft" },
          { q: "Which sentence brings the picture to life?", options: ["The flowers dance in the wind.", "The flowers are in the wind."], answer: "The flowers dance in the wind." },
          { q: "The sun ___ over the mountain.", options: ["rise", "rises"], answer: "rises" },
          { q: "Which sentence is correct?", options: ["The robin sings in the tree.", "The robin sing in the tree."], answer: "The robin sings in the tree." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the verb in the right form, or write the sentence as asked.",
        example: "The wind ___ (whisper) in the trees.  ->  whispers",
        items: [
          { q: "The wind ___ (whisper) in the trees.", answer: "whispers" },
          { q: "The snowflakes ___ (fall) slowly to the ground.", answer: "fall" },
          { q: "My little brother ___ (jump) over every puddle.", answer: "jumps" },
          { q: "Correct the mistake: The sun is shine in the morning.", answer: "The sun shines in the morning." },
          { q: "Correct the mistake: The waves crashes on the sand.", answer: "The waves crash on the sand." },
          { q: "Add an action verb: The river ___ through the quiet town.", answer: "e.g. flows" },
          { q: "Write a sentence with the noun 'moon' and an action verb with -s.", answer: "e.g. The moon smiles over the river." },
          { q: "Write a sentence with the plural noun 'birds' and an action verb.", answer: "e.g. Birds sing in the garden." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think like a poet. Some answers need a sentence of your own.",
        example: "The wind whispers in the trees.  (A wind cannot really whisper, but we can hear soft air.)",
        items: [
          { q: "Write a poet line with a surprising verb for the rain.", answer: "e.g. The rain taps on the roof." },
          { q: "Find and fix three mistakes: 'The wind dance on the lake. The waves crashes on the sand. The moon it smiles.'", answer: "dances; crash; the moon smiles." },
          { q: "Explain in one sentence why a surprising verb can make a better picture.", answer: "e.g. Because the reader sees the thing move like a person, so the picture is clearer and more interesting." },
          { q: "Write two sentences about the same thing: one with 'is' and one with an action verb. Which is better?", answer: "e.g. The sea is blue. The sea sparkles under the sun. The second is better because it moves." },
          { q: "Write three lines of a poem about a market in the morning. Use three different action verbs.", answer: "e.g. Baskets bounce on bikes. Sellers shout hello. The fish shine in the sun." },
          { q: "Choose one thing in nature and write a poem line, then write how many syllables it has.", answer: "e.g. Soft snowflakes fall (4 syllables)." },
        ],
      },
    ],
  },
];

export const odL3U6Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u06-check",
    title: "Quick check: poet words and was / were",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 6 poet words", "past continuous and simple past"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A word that tells what someone or something does. Which word?", answer: "verb" },
          { q: "One beat of sound in a word. Which word?", answer: "syllable" },
          { q: "Words that end with the same sound. Which words?", answer: "rhyming words" },
          { q: "A small bird with an orange-red chest. Which word?", answer: "robin" },
        ],
      },
      {
        title: "Grammar: was / were",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: I ___ (read) when the lights went out.", answer: "was reading" },
          { q: "Complete: We ___ (play) football when it started to rain.", answer: "were playing" },
          { q: "Correct the mistake: She was walk to school when she saw a dog.", answer: "She was walking to school when she saw a dog." },
          { q: "'I was cooking when the phone rang' means the phone rang before I started cooking.", options: ["True", "False"], answer: "False" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u06-test",
    title: "Unit 6 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "The poet words: noun, verb, adjective, sentence, syllable, letter, rhyming words, robin, angelfish, snowflakes",
      "Words in context: observe, imagine, describe, exact",
      "Syllables in long words",
      "Past continuous and simple past",
      "Action verbs",
      "Reading: a girl and a rainy-day haiku",
      "Writing: describing a picture in my mind",
      "Speaking: talking about a poem and giving an opinion",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "A group of words that tells one complete idea.", answer: "sentence" },
          { q: "A word that tells what someone or something does.", answer: "verb" },
          { q: "A word for a person, a place or a thing.", options: ["noun", "verb", "adjective", "sentence"], answer: "noun" },
          { q: "A word that tells more about a noun.", options: ["syllable", "sentence", "letter", "adjective"], answer: "adjective" },
          { q: "One beat of sound in a word.", answer: "syllable" },
          { q: "Words that end with the same sound.", answer: "rhyming words" },
          { q: "A flat, colorful fish with long, thin fins.", options: ["robin", "snowflakes", "angelfish", "syllable"], answer: "angelfish" },
          { q: "To look closely and notice.", options: ["imagine", "observe", "describe", "exact"], answer: "observe" },
          { q: "To make a picture in your mind of something that is not in front of you.", options: ["exact", "imagine", "describe", "observe"], answer: "imagine" },
          { q: "Just right, with no mistakes. Which word?", options: ["exact", "observe", "robin", "describe"], answer: "exact" },
        ],
      },
      {
        title: "Word study: syllables",
        skill: "Vocabulary",
        instructions: "Clap the word in your head. Write how many syllables it has, or choose.",
        marksEach: 1,
        items: [
          { q: "How many syllables are in television?", options: ["3", "5", "6", "4"], answer: "4" },
          { q: "How many syllables are in calendar?", options: ["2", "4", "3", "5"], answer: "3" },
          { q: "How many syllables are in thermometer?", options: ["3", "5", "4", "6"], answer: "4" },
          { q: "How many syllables are in understand?", options: ["2", "3", "4", "5"], answer: "3" },
          { q: "Which two words rhyme?", options: ["day and play", "day and dog", "day and sun"], answer: "day and play" },
          { q: "A haiku has three lines of how many syllables?", options: ["2, 4, 6", "7, 5, 7", "4, 6, 4", "5, 7, 5"], answer: "5, 7, 5" },
        ],
      },
      {
        title: "Grammar: past continuous and simple past",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "I ___ a book when the lights went out.", options: ["were reading", "was reading"], answer: "was reading" },
          { q: "My friends ___ football when it started to rain.", options: ["were playing", "was playing"], answer: "were playing" },
          { q: "She was drawing when the bell ___.", options: ["ringing", "rang"], answer: "rang" },
          { q: "Correct the mistake: We was walking home when we saw a rainbow.", answer: "We were walking home when we saw a rainbow." },
          { q: "Correct the mistake: I was have breakfast when my friend called.", answer: "I was having breakfast when my friend called." },
          { q: "Write a question with 'What' and 'when' about the lights going out.", answer: "e.g. What were you doing when the lights went out?" },
        ],
      },
      {
        title: "Grammar: action verbs",
        skill: "Grammar",
        instructions: "Choose the right verb, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "The wind ___ in the trees.", options: ["whispers", "whisper"], answer: "whispers" },
          { q: "The waves ___ on the sand.", options: ["crash", "crashes"], answer: "crash" },
          { q: "Which word is an action verb?", options: ["soft", "robin", "dance"], answer: "dance" },
          { q: "Correct the mistake: The moon smile at the town.", answer: "The moon smiles at the town." },
          { q: "Correct the mistake: The sun is shine in the morning.", answer: "The sun shines in the morning." },
          { q: "Write one poet sentence with a noun and an action verb about nature.", answer: "e.g. The river sparkles in the morning light." },
        ],
      },
      {
        title: "Reading: a rainy-day haiku",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "On Friday, Nora's class was writing poems when a storm started. The windows shook and the rain drummed on the roof. Nora put down her pencil and observed the playground. She saw puddles shining like mirrors and a small robin sitting under a bench. She closed her eyes and imagined that the robin was a tiny king on a wooden throne. Then she began to write a haiku, because her teacher said that a haiku has three lines of five, seven and five syllables. Nora counted the syllables on her fingers again and again, because the number had to be exact. Her first line had six syllables, so she changed one word. At the end of the lesson, Nora read her poem to the class. Everyone clapped, and her friend asked, 'What were you thinking about when you wrote it?' Nora smiled and said, 'I was thinking about how the rain makes everything sound like music.'",
        marksEach: 1,
        items: [
          { q: "The storm started while the class was writing poems.", options: ["True", "False"], answer: "True" },
          { q: "Nora's first line had five syllables.", options: ["True", "False"], answer: "False" },
          { q: "What did Nora see in the playground?", options: ["Snow and an angelfish.", "Kites and clouds.", "Puddles and a robin.", "A storm and a bench."], answer: "Puddles and a robin." },
          { q: "Why did Nora count the syllables again and again?", options: ["She did not like the poem.", "The number had to be exact.", "Her friend asked her to.", "The teacher was watching her."], answer: "The number had to be exact." },
          { q: "Which word in the text means 'looked closely and noticed'?", options: ["imagined", "observed", "counted", "described"], answer: "observed" },
          { q: "What was Nora thinking about when she wrote the poem? Answer in your own words.", answer: "e.g. She was thinking about how the rain makes everything sound like music." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about something in nature that you can see in your mind. Use at least two action verbs (with -s where needed), one adjective, and one sentence with was / were + -ing and when. Marks (5): a clear first sentence, action verbs used correctly, an adjective, a correct was / were + -ing + when sentence, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about something in nature you can picture.",
            answer:
              "e.g. In my mind I can see a small robin on a green branch. The robin sings a happy song and the leaves dance in the wind. I was walking home when I saw it fly into a tall tree. The sky was blue and the sun smiled over the garden.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose a poem you know or wrote. Talk for about one minute: say what the poem is about, what you see in your mind when you read it, what kind of poem it is, and what you think of it. Then answer two questions from the teacher.",
      prompts: [
        "What picture do you see in your mind? Describe it.",
        "Why do you think the poet wrote this poem?",
        "What do you think of the poem? Do you like it? Why?",
        "What were you doing when you first read or heard it?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks smoothly for about a minute; short pauses only to think; easy to follow.",
            "Mostly smooth; a few pauses or restarts but keeps going without help.",
            "Many pauses; speaks in short pieces; needs a prompt once or twice.",
            "Very hesitant; single words or very short phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses unit words correctly and naturally (verb, adjective, syllable, observe, imagine, describe).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the poem only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: was / were + -ing, action verbs",
          bands: [
            "Uses was / were + -ing with a simple past event and action verbs with -s correctly, more than once.",
            "Uses at least two of these correctly; one small slip, such as 'we was' or a missing -s.",
            "Tries them but with errors (was walk, the wind dance); only one is used.",
            "None of them; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and opinions",
          bands: [
            "Describes a clear picture, gives an opinion of the poem with a reason and an example.",
            "Describes a picture and gives a simple reason for an opinion.",
            "Gives one point only, or an opinion without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
