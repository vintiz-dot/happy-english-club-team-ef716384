// Oxford Discover 2nd edition, Level 3, Unit 16 (Gardens in Our Community):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used: sweet potatoes grow under the ground,
// beans grow on climbing vines, a sunflower is a plant that blooms in summer,
// and ripe / mature, raw / uncooked and brave / unafraid are pairs of synonyms.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U16Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ adjective + preposition
  {
    id: "od2e-l3-u16-ws-adj-prep",
    title: "curious about / happy with / surprised at",
    grammar: "adjectives with prepositions",
    deckId: "od2e-l3-u16-l3",
    slide: "Adjectives with prepositions",
    intro:
      "Some feeling words have a small partner word: curious about, happy with, surprised at. Learn each pair as one chunk. After the small word we say a thing, an -ing word, or how / what and a clause (I'm curious about how it grows).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right small word. Then read the whole sentence aloud.",
        example: "I'm curious ___ bees.  (about / at)  ->  about",
        items: [
          { q: "I'm curious ___ how seeds grow.", options: ["about", "at"], answer: "about" },
          { q: "She is happy ___ her new garden.", options: ["with", "about"], answer: "with" },
          { q: "We were surprised ___ the giant pumpkin.", options: ["at", "with"], answer: "at" },
          { q: "Which sentence is correct?", options: ["He is curious about the bees.", "He is curious with the bees."], answer: "He is curious about the bees." },
          { q: "They aren't happy ___ the empty pots.", options: ["with", "of"], answer: "with" },
          { q: "Are you surprised ___ how tall it is?", options: ["at", "for"], answer: "at" },
          { q: "What are you curious ___?", options: ["about", "for"], answer: "about" },
          { q: "Which pair is right?", options: ["surprised at", "surprised on"], answer: "surprised at" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing small word, or write the whole sentence where it asks you to rewrite or correct.",
        example: "We are happy ___ our beans.  ->  with",
        items: [
          { q: "My sister is curious ___ worms.", answer: "about" },
          { q: "We are happy ___ our tomato plants.", answer: "with" },
          { q: "The gardener was surprised ___ the size of the carrots.", answer: "at" },
          { q: "Make it negative: I am happy with the soil.", answer: "I am not happy with the soil. (or: I'm not happy with the soil.)" },
          { q: "Make it a question: You are curious about the new garden.", answer: "Are you curious about the new garden?" },
          { q: "Correct the mistake: I'm curious for the seeds.", answer: "I'm curious about the seeds." },
          { q: "Correct the mistake: She is surprised on the big flower.", answer: "She is surprised at the big flower." },
          { q: "Correct the mistake: We are happy of our garden.", answer: "We are happy with our garden." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every small word.",
        example: "I'm surprised. The plant grew so fast.  ->  I'm surprised at how fast the plant grew.",
        items: [
          { q: "Join the two sentences with how: I'm curious. The sunflower grows so tall.", answer: "I'm curious about how the sunflower grows so tall." },
          { q: "Correct the mistake: I'm curious about it grows.", answer: "I'm curious about how it grows." },
          {
            q: "Find and fix three mistakes: 'The class is curious for the new beans. They are happy of the green leaves, but they are surprised on how slowly the vines grow.'",
            answer: "curious about; happy with; surprised at.",
          },
          { q: "Write two sentences about a garden. One uses curious about, the other uses surprised at. Add a reason with because to each.", answer: "e.g. I'm curious about the sweet potatoes because they grow under the ground. I was surprised at the haze over the garden because the morning was so clear yesterday." },
          { q: "Write a question for your partner with happy with.", answer: "e.g. What are you happy with in our school garden?" },
          {
            q: "A friend writes: 'I'm curious about to see the garden.' Explain what is wrong and fix it.",
            answer: "e.g. After about we need a noun, an -ing word or how / what and a clause, not to + verb. Fix: I'm curious about the garden. (or: I'm curious about seeing the garden.)",
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ place words
  {
    id: "od2e-l3-u16-ws-place",
    title: "Place words: in, on, off",
    grammar: "place words: in, on, off",
    deckId: "od2e-l3-u16-l4",
    slide: "Place words: in, on, off ...",
    intro:
      "A place phrase answers WHERE. in = inside a place or space (in a box, in the garden). on = touching the top of a surface (on the shelf). off = away from a surface (off the floor).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle in, on or off. Picture the place in your head first.",
        example: "The seeds are ___ a box.  (in / on)  ->  in",
        items: [
          { q: "The seeds are ___ the garden.", options: ["in", "on"], answer: "in" },
          { q: "The pot is ___ the table.", options: ["in", "on"], answer: "on" },
          { q: "The boy lifted the pot ___ the floor.", options: ["off", "in"], answer: "off" },
          { q: "The watering cans are ___ the shed.", options: ["in", "on"], answer: "in" },
          { q: "The flowers are ___ the window sill.", options: ["on", "in"], answer: "on" },
          { q: "We eat lunch ___ the schoolyard.", options: ["in", "on"], answer: "in" },
          { q: "Which sentence is correct?", options: ["The plant is in the shelf.", "The plant is on the shelf."], answer: "The plant is on the shelf." },
          { q: "The apples fell ___ the tree. (They were on the tree, and now they are on the ground.)", options: ["off", "in"], answer: "off" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words, or write the whole sentence where it asks you to rewrite or correct.",
        example: "Beans grow ___ boxes.  ->  in",
        items: [
          { q: "Beans grow ___ boxes ___ the balcony.", answer: "in ... on" },
          { q: "Add a place phrase (in a pot): I planted a flower.", answer: "I planted a flower in a pot." },
          { q: "The leaves fell ___ the tree.", answer: "off" },
          { q: "Correct the mistake: The plants are on the garden.", answer: "The plants are in the garden." },
          { q: "Correct the mistake: The pot is in the table.", answer: "The pot is on the table." },
          { q: "Please take the pot ___ the floor and put it ___ the shelf.", answer: "off ... on" },
          { q: "Where are the seeds? (a box / the table) Write one sentence with two place phrases.", answer: "The seeds are in a box on the table." },
          { q: "Write a sentence about where our school garden could be. Use in.", answer: "e.g. Our school garden could be in the yard behind the classroom." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every place word.",
        example: "The pot is on the shelf. The shelf is in the classroom.  ->  The pot is on the shelf in the classroom.",
        items: [
          { q: "Join into one sentence: The seeds are in a box. The box is on the window sill.", answer: "The seeds are in a box on the window sill." },
          {
            q: "Find and fix three mistakes: 'I planted beans on a box. I put the box in the window sill. Then I lifted the cat in the table.'",
            answer: "in a box; on the window sill; off the table.",
          },
          { q: "Write three sentences about a garden. Use in in one, on in one and off in one.", answer: "e.g. The beans are in a long box. The box is on the fence. A snail fell off a leaf." },
          { q: "Explain the difference between 'on the garden' and 'in the garden'. Which one is correct for a place with plants?", answer: "e.g. In the garden is correct: in means inside a place or space. On means touching the top of a surface, such as a table or a shelf." },
          { q: "Write two sentences that tell a reader exactly where to find the vegetable boxes. Use two place phrases in each sentence.", answer: "e.g. The vegetable boxes are in the yard behind the school. They are on the grass near the gate." },
          { q: "Why is 'I planted beans in a box on the window sill' clearer than 'I planted beans'?", answer: "e.g. The place phrases tell the reader where, so the reader can picture it." },
        ],
      },
    ],
  },
];

export const odL3U16Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check (Lesson 4)
  {
    id: "od2e-l3-u16-check",
    title: "Quick check: garden words and curious about / happy with / surprised at",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["The garden words from Lesson 1", "Adjectives with prepositions"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the right word and write it on your whiteboard.",
        marksEach: 1,
        items: [
          { q: "A person whose job is looking after gardens is a ___.", options: ["gardener", "teenager", "crowd", "vine"], answer: "gardener" },
          { q: "The people who live in the same place are a ___.", options: ["haze", "community", "vine", "shopping cart"], answer: "community" },
          { q: "Beans climb up long, thin plants called ___.", options: ["vines", "teenagers", "crowds", "carts"], answer: "vines" },
          { q: "A thin cloud of dust or smoke in the air is a ___.", options: ["haze", "garden", "crowd", "bean"], answer: "haze" },
        ],
      },
      {
        title: "Grammar: adjectives with prepositions",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "I'm curious ___ how plants grow.", options: ["about", "at", "with"], answer: "about" },
          { q: "We are happy ___ our new garden.", options: ["about", "with", "at"], answer: "with" },
          { q: "Correct the mistake: I was surprised on the big flower.", answer: "I was surprised at the big flower." },
          { q: "Make it a question: You are curious about seeds.", answer: "Are you curious about seeds?" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u16-test",
    title: "Unit 16 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 garden words and words in context: water, curious, bloom, empty",
      "Synonyms: unafraid / brave, raw / uncooked, mature / ripe",
      "Adjectives with prepositions: curious about, happy with, surprised at",
      "Place words: in, on, off",
      "Reading: the plot of a story",
      "Writing: planting a garden",
      "Speaking: giving reasons about gardens and plants",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A person whose job is looking after gardens is a ___.", options: ["gardener", "teenager", "crowd", "vine"], answer: "gardener" },
          { q: "An orange vegetable that grows under the ground is a ___.", options: ["sweet potato", "shopping cart", "haze", "bean"], answer: "sweet potato" },
          { q: "Beans grow in long green pods on climbing ___.", options: ["vines", "crowds", "teenagers", "carts"], answer: "vines" },
          { q: "A thin cloud of dust or smoke in the air is a ___.", options: ["haze", "garden", "community", "crowd"], answer: "haze" },
          { q: "Young people between 13 and 19 years old are ___.", options: ["teenagers", "gardeners", "vines", "beans"], answer: "teenagers" },
          { q: "A lot of people together in one place are a ___.", options: ["haze", "crowd", "vine", "garden"], answer: "crowd" },
          { q: "You push a ___ around a shop to carry what you buy.", options: ["shopping cart", "sweet potato", "community", "vine"], answer: "shopping cart" },
          { q: "In summer, a sunflower will ___ and open its yellow petals.", options: ["bloom", "empty", "water", "curious"], answer: "bloom" },
          { q: "The pot has no soil in it. It is ___.", options: ["empty", "curious", "ripe", "raw"], answer: "empty" },
          { q: "Which word means the same as 'brave'?", options: ["unafraid", "uncooked", "ripe", "empty"], answer: "unafraid" },
          { q: "Which word means the same as 'raw'?", options: ["mature", "uncooked", "unafraid", "empty"], answer: "uncooked" },
          { q: "Which word means the same as 'ripe'?", options: ["mature", "raw", "brave", "empty"], answer: "mature" },
        ],
      },
      {
        title: "Grammar: curious about / happy with / surprised at",
        skill: "Grammar",
        instructions: "Do what each question asks. Write full sentences when you are asked to rewrite or correct.",
        marksEach: 1,
        items: [
          { q: "I'm curious ___ how a seed becomes a plant.", options: ["about", "with", "at"], answer: "about" },
          { q: "The teacher is happy ___ our work.", options: ["at", "with", "about"], answer: "with" },
          { q: "We were surprised ___ how fast the beans grew.", options: ["with", "about", "at"], answer: "at" },
          { q: "Correct the mistake: She is happy of her garden.", answer: "She is happy with her garden." },
          { q: "Make it a question: They are surprised at the haze.", answer: "Are they surprised at the haze?" },
          { q: "Write your own sentence about a plant. Use curious about, and add a reason with because.", answer: "e.g. I'm curious about sweet potatoes because they grow under the ground." },
        ],
      },
      {
        title: "Grammar: place words in, on, off",
        skill: "Grammar",
        instructions: "Choose in, on or off, or correct the mistake. Remember: in = inside a space, on = on top of a surface, off = away from a surface.",
        marksEach: 1,
        items: [
          { q: "The seeds are ___ a small box.", options: ["in", "on", "off"], answer: "in" },
          { q: "The pot is ___ the shelf.", options: ["in", "on", "off"], answer: "on" },
          { q: "A leaf fell ___ the tree.", options: ["in", "on", "off"], answer: "off" },
          { q: "Correct the mistake: The plants are on the garden.", answer: "The plants are in the garden." },
          { q: "Add two place phrases to the sentence (a box, the window sill): I planted beans.", answer: "I planted beans in a box on the window sill." },
          { q: "Write your own sentence about where a plant is in your home or school. Use a place word.", answer: "e.g. There is a green plant on the table in our classroom." },
        ],
      },
      {
        title: "Reading: a community garden",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Last spring, the families in our street turned an empty yard behind the market into a community garden. At first the ground was hard and covered with rubbish, so the teenagers in the street spent two weekends cleaning it. Then everyone helped to fill long wooden boxes with soil. In the first box they planted beans, and the vines climbed up sticks along the fence. In the second box they planted sweet potatoes, which grow under the ground, so nobody could see them for months. Every morning an old gardener came to water the plants before the sun was hot. By summer the garden was full of green leaves and yellow flowers. The families were happy with the vegetables, but the teenagers were most surprised at the beans, because they grew longer than a ruler. Now a crowd of neighbours comes on Sundays to pick vegetables, talk and drink tea.",
        marksEach: 1,
        items: [
          { q: "The garden was made in an empty yard behind the market.", options: ["True", "False"], answer: "True" },
          { q: "The teenagers cleaned the ground in one afternoon.", options: ["True", "False"], answer: "False" },
          { q: "Sweet potatoes grow under the ground.", options: ["True", "False"], answer: "True" },
          { q: "Who was surprised at the beans?", options: ["The teenagers", "The gardener", "The market sellers"], answer: "The teenagers" },
          { q: "What is the most important event in the middle of the plot?", options: ["The families clean the ground and plant the boxes.", "An old gardener drinks tea.", "The beans are longer than a ruler."], answer: "The families clean the ground and plant the boxes." },
          {
            q: "Tell the plot in three sentences: the beginning, the middle and the end.",
            answer:
              "e.g. At the beginning, the families had an empty yard. In the middle, the teenagers cleaned it and everyone planted beans and sweet potatoes in boxes. At the end, the garden was full of vegetables and the neighbours came to pick them.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about planting a garden (a real one or one you imagine). Say where you planted it, what you did after planting and how you felt. Use one place word (in, on or off) and one of curious about, happy with or surprised at. Marks (5): a clear first sentence, where you planted it, what happened after planting, a correct place word and a correct adjective with its small word, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about planting a garden.",
            answer:
              "e.g. I planted a vegetable garden in a box on our balcony. After planting, I gave the seeds some water every morning. Two weeks later, I was surprised at the small green leaves. I'm happy with my garden, and I'm curious about how tall the beans will grow.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about one minute about a plant or a garden that is important to you. Say what it is and where it is, how you feel about it, and why it is important. Then answer two questions from the teacher.",
      prompts: [
        "Why do we need plants? Give two reasons.",
        "What are you curious about in a garden?",
        "Where would you plant a community garden in our neighbourhood? Why there?",
        "What are you happy with in your garden, or in a garden you know?",
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
            "Uses unit words correctly and naturally (garden words, synonyms, plant words).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names things only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: adjective + preposition and place words",
          bands: [
            "Uses curious about, happy with or surprised at correctly more than once, with place words in, on, off right every time.",
            "Uses one adjective with its small word correctly at least once; one small slip with a place word.",
            "Tries the pattern but with errors (curious for, happy of); place words often confused.",
            "No adjective with a preposition; only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Gives clear reasons with because and an example for why the plant or garden matters.",
            "Gives at least one reason with because and a simple example.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
