// Oxford Discover 2nd edition, Level 3, Unit 5 (Poems and Insects):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, poem, song or audio
// from the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: a ladybug is a beetle, a kangaroo is
// not an insect, a raisin is a dried grape, the past continuous is was / were + -ing,
// and when size and color words are used together, size comes before color. This
// unit's test sits after Lesson 5; the Wrap Up lesson belongs to Unit 6.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U5Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ past continuous
  {
    id: "od2e-l3-u05-ws-past-continuous",
    title: "Past continuous: what was happening then",
    grammar: "past continuous",
    deckId: "od2e-l3-u05-l3",
    slide: "Past continuous: what was happening then",
    intro:
      "Say what was in progress at a time in the past: was or were + a verb ending in -ing. I, he, she, it = was. You, we, they = were. Negative: wasn't / weren't. Question: Was / Were + subject + verb-ing?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "At seven o'clock, I ___ eating breakfast.  (was / were)  ->  was",
        items: [
          { q: "At seven o'clock, I ___ eating breakfast.", options: ["was", "were"], answer: "was" },
          { q: "The bees ___ buzzing around the flowers.", options: ["was", "were"], answer: "were" },
          { q: "She was ___ a book at eight o'clock.", options: ["read", "reading", "reads"], answer: "reading" },
          { q: "We ___ singing at the party.", options: ["was", "were"], answer: "were" },
          { q: "He ___ sleeping at nine. He was brushing his teeth.", options: ["wasn't", "weren't", "isn't"], answer: "wasn't" },
          { q: "___ you reading at six o'clock?", options: ["Was", "Were"], answer: "Were" },
          { q: "Which sentence is correct?", options: ["I was play football.", "I was playing football."], answer: "I was playing football." },
          { q: "The grasshopper was ___ across the path.", options: ["leap", "leaping", "leaps"], answer: "leaping" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the verb in the past continuous. For the last three questions, write the whole sentence.",
        example: "At seven o'clock, I ___ (eat) breakfast.  ->  was eating",
        items: [
          { q: "At seven o'clock, I ___ (eat) breakfast.", answer: "was eating" },
          { q: "The ladybugs ___ (walk) on the leaf.", answer: "were walking" },
          { q: "My friends ___ (not play) football. They were reading.", answer: "weren't playing" },
          { q: "___ (you / swim) at five o'clock?", answer: "Were you swimming" },
          { q: "What ___ (he / do) at lunchtime?", answer: "was he doing" },
          { q: "Correct the mistake: They was singing.", answer: "They were singing." },
          { q: "Correct the mistake: I playing at eight.", answer: "I was playing at eight." },
          { q: "Correct the mistake: She was runing.", answer: "She was running." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the helper (was / were), the -ing ending and the spelling every time.",
        example: "The bee flies.  ->  (at four o'clock yesterday)  The bee was flying.",
        items: [
          { q: "Write a sentence about what you were doing at seven o'clock this morning.", answer: "e.g. I was brushing my teeth at seven o'clock this morning." },
          { q: "Write a question for a friend about eight o'clock last night. Then write a short answer: No.", answer: "e.g. Were you watching TV at eight o'clock? No, I wasn't." },
          {
            q: "Find and fix three mistakes: 'At noon, my brother and I was swiming in the lake. We wasn't wearing hats. The sun were shining.'",
            answer: "were swimming / weren't wearing / was shining",
          },
          { q: "Rewrite for yesterday at four o'clock: 'The butterfly flies over the flowers and the bees buzz.'", answer: "The butterfly was flying over the flowers and the bees were buzzing." },
          { q: "Why is 'I playing at eight yesterday' wrong? Explain in one or two sentences.", answer: "e.g. The helper was is missing. In the past continuous we need was or were before the -ing verb." },
          { q: "Write two sentences about two insects in a garden at four o'clock. One must be negative.", answer: "e.g. A ladybug was walking on a leaf. The bees weren't flying." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ adjective order
  {
    id: "od2e-l3-u05-ws-adjective-order",
    title: "Describing words in order: size before color",
    grammar: "adjective order (size, color)",
    deckId: "od2e-l3-u05-l4",
    slide: "Describing words in order: size before color",
    intro:
      "When you use a size word and a color word before a noun, the size word comes first: a big green beetle. Describing words never take -s. Use an before a vowel sound (an orange butterfly).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole phrase aloud.",
        example: "a ___ beetle  (green big / big green)  ->  big green",
        items: [
          { q: "a ___ beetle", options: ["green big", "big green"], answer: "big green" },
          { q: "a ___ butterfly", options: ["tiny yellow", "yellow tiny"], answer: "tiny yellow" },
          { q: "two ___ ladybugs", options: ["red little", "little red"], answer: "little red" },
          { q: "Which is correct?", options: ["a tiny black cricket", "a black tiny cricket"], answer: "a tiny black cricket" },
          { q: "I saw ___ orange butterfly.", options: ["a", "an"], answer: "an" },
          { q: "Which one is a SIZE word?", options: ["green", "huge", "yellow"], answer: "huge" },
          { q: "Which one is a COLOR word?", options: ["brown", "tiny", "large"], answer: "brown" },
          { q: "two ___ bees", options: ["small black", "blacks small", "black small"], answer: "small black" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the words in the right order. For the last three questions, write the whole phrase or sentence.",
        example: "a ___ ___ grasshopper (green / big)  ->  big green",
        items: [
          { q: "a ___ ___ grasshopper (green / big)", answer: "big green" },
          { q: "a ___ ___ ladybug (red / tiny)", answer: "tiny red" },
          { q: "a ___ ___ kangaroo (brown / large)", answer: "large brown" },
          { q: "Write the phrase: size = huge, color = blue, noun = butterfly.", answer: "a huge blue butterfly" },
          { q: "Write a or an: ___ enormous black beetle", answer: "an" },
          { q: "Correct the mistake: two greens grasshoppers", answer: "two green grasshoppers" },
          { q: "Correct the mistake: a red small bee", answer: "a small red bee" },
          { q: "Write a sentence about a beetle. Use a size word and a color word.", answer: "e.g. I found a big black beetle under a leaf." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the order, the plural and a / an every time.",
        example: "a (tiny / red) ladybug  ->  a tiny red ladybug",
        items: [
          { q: "Put in the right order: a (yellow / lovely / tiny) bee", answer: "a lovely tiny yellow bee" },
          {
            q: "Find and fix three mistakes: 'I saw a green big grasshopper on a orange leaf. Two greens crickets were singing.'",
            answer: "a big green grasshopper / an orange leaf / two green crickets",
          },
          { q: "Write one sentence with a size word, a color word and a past continuous verb.", answer: "e.g. A tiny red ladybug was crawling up my arm." },
          { q: "Why do we say 'a small red bee' and not 'a red small bee'? Explain in one or two sentences.", answer: "e.g. When English uses a size word and a color word together, the size word comes first and the color word comes next." },
          { q: "Describe an imaginary creature with three describing words in the right order.", answer: "e.g. a beautiful tiny silver butterfly" },
          { q: "Write two sentences about two creatures. In one, put the describing words after is and join them with and.", answer: "e.g. The beetle is big and black. A tiny green cricket was singing." },
        ],
      },
    ],
  },
];

export const odL3U5Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u05-check",
    title: "Quick check: insect words and the past continuous",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 5 insect and animal words", "past continuous", "size before color"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "An insect with four big, colorful wings. Which word?", answer: "butterfly" },
          { q: "A small round beetle, often red with black spots. Which word?", answer: "ladybug" },
          { q: "A dried grape. Which word?", answer: "raisin" },
          { q: "A lot of small trees or bushes growing close together. Which word?", answer: "thicket" },
        ],
      },
      {
        title: "Grammar: past continuous and describing words",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one or two words where it does not.",
        marksEach: 1,
        items: [
          { q: "At seven o'clock, I ___ eating breakfast. (was / were)", answer: "was" },
          { q: "The bees ___ buzzing around the flowers. (was / were)", answer: "were" },
          { q: "Correct the mistake: She was runing.", answer: "She was running." },
          { q: "Put the words in the right order: a (green / big) ___ ___ beetle", answer: "big green" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u05-test",
    title: "Unit 5 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 insect and animal words and the poem words",
      "Theme: what the poet wants the reader to understand",
      "The past continuous: was / were + -ing",
      "Describing words in order: size before color",
      "Reading: a short text about a garden",
      "Writing: a small creature in a garden",
      "Speaking: describing a creature and telling what it was doing",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A ___ is a green or brown insect with long back legs for leaping.", options: ["ladybug", "bee", "kangaroo", "grasshopper"], answer: "grasshopper" },
          { q: "A ___ is a flying insect that visits flowers and makes honey.", options: ["bee", "beetle", "cricket", "raisin"], answer: "bee" },
          { q: "A ___ is a big animal from Australia that hops on strong back legs.", options: ["katydid", "thicket", "beetle", "kangaroo"], answer: "kangaroo" },
          { q: "A ___ is a small insect that makes a chirping sound at night.", options: ["butterfly", "raisin", "cricket", "thicket"], answer: "cricket" },
          { q: "A ___ is a dried grape, small, brown and sweet.", options: ["thicket", "raisin", "beetle", "ladybug"], answer: "raisin" },
          { q: "A ___ is an insect with a hard shell on its back.", options: ["beetle", "butterfly", "bee", "kangaroo"], answer: "beetle" },
          { q: "A ___ is a lot of small trees or bushes growing close together.", options: ["cricket", "raisin", "katydid", "thicket"], answer: "thicket" },
          { q: "Which one is NOT an insect?", options: ["ladybug", "katydid", "kangaroo", "butterfly"], answer: "kangaroo" },
          { q: "Which word means 'the beat you can clap when you say a poem'?", options: ["rhyme", "rhythm", "verse", "theme"], answer: "rhythm" },
        ],
      },
      {
        title: "Grammar: the past continuous",
        skill: "Grammar",
        instructions: "Choose or write the answer. Check the helper (was / were) and the -ing ending.",
        marksEach: 1,
        items: [
          { q: "At eight o'clock, my sister ___ reading a poem.", options: ["was", "were"], answer: "was" },
          { q: "The butterflies ___ flying over the flowers.", options: ["was", "were"], answer: "were" },
          { q: "We ___ playing football at noon. We were eating lunch.", options: ["weren't", "wasn't", "aren't"], answer: "weren't" },
          { q: "Correct the mistake: They was singing a song.", answer: "They were singing a song." },
          { q: "Write the question: (you / sleep) at nine o'clock?", answer: "Were you sleeping at nine o'clock?" },
          { q: "Write a short answer: 'Was he swimming?' (No)", answer: "No, he wasn't." },
          { q: "Write one sentence about what you were doing at seven o'clock this morning.", answer: "e.g. I was brushing my teeth at seven o'clock." },
        ],
      },
      {
        title: "Grammar: describing words in order",
        skill: "Grammar",
        instructions: "Choose the right phrase, or write the phrase. Size comes before color.",
        marksEach: 1,
        items: [
          { q: "a ___ butterfly", options: ["yellow big", "big yellow"], answer: "big yellow" },
          { q: "two ___ ladybugs", options: ["red tiny", "tiny red"], answer: "tiny red" },
          { q: "Correct the mistake: a green huge grasshopper", answer: "a huge green grasshopper" },
          { q: "Correct the mistake: two blacks beetles", answer: "two black beetles" },
          { q: "Write the phrase in the right order: a ___ ___ cricket (brown / small)", answer: "small brown" },
          { q: "Write one sentence about an insect. Use a size word and a color word.", answer: "e.g. A tiny red ladybug was walking on my hand." },
        ],
      },
      {
        title: "Reading: the garden at seven",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "On Saturday morning at seven o'clock, I was sitting by the window with my notebook. It was a sunny day, and the garden was very busy. A tiny red ladybug was walking up a green leaf. Two big yellow bees were buzzing around the flowers, and a grasshopper was leaping across the path. My little brother was not watching the insects. He was eating a cookie. I was writing a poem about the garden because I wanted to remember the morning. In my poem, the ladybug was a small red lamp and the bees were two golden helicopters. When I read my poem aloud at breakfast, everyone smiled. My mom said, 'Now I can see the garden, too!'",
        marksEach: 1,
        items: [
          { q: "What was the writer doing at seven o'clock?", options: ["eating breakfast", "sitting by the window with a notebook", "leaping across the path"], answer: "sitting by the window with a notebook" },
          { q: "What color was the ladybug?", options: ["red", "yellow", "green"], answer: "red" },
          { q: "How many bees were buzzing around the flowers?", options: ["one", "two", "three"], answer: "two" },
          { q: "What was the grasshopper doing?", options: ["sleeping", "sitting on a leaf", "leaping across the path"], answer: "leaping across the path" },
          { q: "The writer's brother was watching the insects.", options: ["True", "False"], answer: "False" },
          { q: "Why did the writer write a poem?", options: ["because the teacher asked", "because the writer wanted to remember the morning", "because it was raining"], answer: "because the writer wanted to remember the morning" },
          {
            q: "In one sentence, what do you think the poet wants the reader to understand? (the theme)",
            answer: "e.g. A small garden can be full of beautiful things. / Poems can help us remember special moments.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a small creature in a garden. Say what it looked like, where it was and what it was doing. Use a size word before a color word at least twice and one sentence in the past continuous. Marks (5): a clear first sentence, describing words in the right order, a correct past continuous sentence, a closing sentence about how you feel, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe a small creature in a garden.",
            answer:
              "e.g. Yesterday afternoon, a tiny green grasshopper was leaping across our garden. It had long back legs and two thin brown antennae. It landed on a big yellow flower and stayed still for a minute. I was watching it from the window. I love grasshoppers because they are quick and brave.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose a small creature you like (an insect or an animal). Talk for about one minute: say what it looks like (use a size word and a color word), where it lives and what it was doing the last time you saw it. Then answer two questions from the teacher.",
      prompts: [
        "What creature did you choose? What does it look like?",
        "What was it doing the last time you saw it?",
        "Why do you like it? Do you think a poet would write about it? Why?",
        "What is one thing that is different between this creature and another one?",
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
            "Uses unit words and describing words correctly and naturally (insect names, colors, sizes).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the creature only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: past continuous and describing words",
          bands: [
            "Uses was / were + -ing correctly more than once, and puts size before color every time.",
            "Uses the past continuous correctly at least once; one small slip, such as a missing helper or the wrong order of describing words.",
            "Tries the past continuous but often leaves out was / were or the -ing ending; the order of describing words is often wrong.",
            "No past continuous; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Describes the creature, says what it was doing and gives a clear reason for liking it, with an example.",
            "Describes the creature and gives one simple reason; some detail about what it was doing.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
