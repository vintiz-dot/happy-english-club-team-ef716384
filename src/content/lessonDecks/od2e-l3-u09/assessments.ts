// Oxford Discover 2nd edition, Level 3, Unit 9 (Sources of Energy):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: coal, oil and natural gas are
// fossil fuels made from living things that died millions of years ago; they are
// nonrenewable and burning them makes pollution; wind, sun and moving water are
// renewable; a power plant makes electricity; electricity, oil, coal, pollution and
// energy are noncount nouns and take a singular verb. This unit's test sits after
// Lesson 5 (Grammar Champions); the Wrap Up lesson belongs to Unit 10.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U9Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ may / might
  {
    id: "od2e-l3-u09-ws-may-might",
    title: "May and might: not sure yet",
    grammar: "may / might",
    deckId: "od2e-l3-u09-l3",
    slide: "May and might: not sure yet",
    intro:
      "Sure about the future? Use will: It will be dark at night. Not sure? Use may or might + the plain verb: It may rain. We might go. No -s after may or might, and no to.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "It ___ rain tomorrow, but I am not sure.  (will / might)  ->  might",
        items: [
          { q: "The sun ___ rise tomorrow. I am sure.", options: ["will", "might", "may"], answer: "will" },
          { q: "It ___ rain this weekend. I am not sure.", options: ["will", "may", "is"], answer: "may" },
          { q: "My friend might ___ to the park.", options: ["go", "goes", "to go"], answer: "go" },
          { q: "We ___ see a rainbow. Maybe!", options: ["might", "will", "are"], answer: "might" },
          { q: "She may ___ a bike to school.", options: ["rides", "ride", "riding"], answer: "ride" },
          { q: "Which sentence is correct?", options: ["He mights come.", "He might come."], answer: "He might come." },
          { q: "Which sentence is correct?", options: ["It may to rain.", "It may rain."], answer: "It may rain." },
          { q: "Wind power ___ help the Earth in the future. It is possible.", options: ["might", "does", "is"], answer: "might" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, change the sentence to show you are not sure, or correct the mistake.",
        example: "I will see my friend tomorrow. (not sure, use might)  ->  I might see my friend tomorrow.",
        items: [
          { q: "It ___ be sunny on Saturday. (not sure: may)", answer: "may" },
          { q: "We ___ go to the beach. (not sure: might)", answer: "might" },
          { q: "Change to not sure with may: I will visit my cousin.", answer: "I may visit my cousin." },
          { q: "Change to not sure with might: We will see a wind farm.", answer: "We might see a wind farm." },
          { q: "Correct the mistake: She mights go to the library.", answer: "She might go to the library." },
          { q: "Correct the mistake: It may to rain tomorrow.", answer: "It may rain tomorrow." },
          { q: "Correct the mistake: He might goes home early.", answer: "He might go home early." },
          { q: "Write one sentence about tomorrow. You are not sure. Use may or might.", answer: "e.g. I might play football tomorrow." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Decide if the speaker is sure or not sure, and write whole sentences.",
        example: "Solar panels / make / more electricity / on a sunny day (might)  ->  Solar panels might make more electricity on a sunny day.",
        items: [
          { q: "Write a sentence about the future of energy. You are sure. Use will.", answer: "e.g. The sun will shine tomorrow." },
          { q: "Write a sentence about the future of energy. You are not sure. Use might and a reason.", answer: "e.g. People might use more solar panels because the sun never runs out." },
          {
            q: "Find and fix two mistakes: 'The wind farm mights make more electricity. We may to see it next week.'",
            answer: "The wind farm might make more electricity. We may see it next week.",
          },
          { q: "Make this sentence negative and not sure: 'The power plant will make a lot of pollution.'", answer: "The power plant may not make a lot of pollution. / might not" },
          { q: "Why do we say 'The sun will rise tomorrow' but 'It might rain tomorrow'? Explain in one or two sentences.", answer: "e.g. We are sure the sun will rise, so we use will. We are not sure about rain, so we use might." },
          { q: "Write three sentences about your own weekend plans that are not certain. Use may twice and might once.", answer: "e.g. I may visit my grandmother. I may play football. I might read a book." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ count / noncount verbs
  {
    id: "od2e-l3-u09-ws-count-noncount",
    title: "Count and noncount nouns: choose the verb",
    grammar: "verbs with count and noncount nouns",
    deckId: "od2e-l3-u09-l4",
    slide: "Count and noncount nouns: choose the verb",
    intro:
      "Can you count it? One windmill: is. Many windmills: are. Things we do not count, like electricity, oil and pollution, take is (or a verb with -s). Check the subject before you choose the verb.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right verb. Ask yourself: can I count it?",
        example: "Electricity ___ useful.  (is / are)  ->  is",
        items: [
          { q: "Electricity ___ very useful at home.", options: ["is", "are"], answer: "is" },
          { q: "The windmills ___ on the hill.", options: ["is", "are"], answer: "are" },
          { q: "Pollution ___ bad for the air.", options: ["is", "are"], answer: "is" },
          { q: "Oil ___ a fossil fuel.", options: ["is", "are"], answer: "is" },
          { q: "The wind turbines ___ very tall.", options: ["was", "were"], answer: "were" },
          { q: "Coal and oil ___ fossil fuels.", options: ["is", "are"], answer: "are" },
          { q: "A power plant ___ a big building.", options: ["is", "are"], answer: "is" },
          { q: "Which sentence is correct?", options: ["Electricity are expensive.", "Electricity is expensive."], answer: "Electricity is expensive." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing verb, or correct the mistake. Underline the subject first.",
        example: "Pollution ___ a big problem. (be)  ->  is",
        items: [
          { q: "Energy from the sun ___ renewable. (be)", answer: "is" },
          { q: "The solar panels ___ on the roof. (be)", answer: "are" },
          { q: "Long ago, windmills ___ very common on farms. (be)", answer: "were" },
          { q: "Electricity ___ along wires to our houses. (travel, present)", answer: "travels" },
          { q: "Correct the mistake: Pollution are bad for the Earth.", answer: "Pollution is bad for the Earth." },
          { q: "Correct the mistake: The wind farm are near the sea.", answer: "The wind farm is near the sea." },
          { q: "Correct the mistake: Wind turbines is very tall.", answer: "Wind turbines are very tall." },
          { q: "Write one sentence about electricity with is.", answer: "e.g. Electricity is made in a power plant." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Find the subject first and decide if it is one thing, many things or something we cannot count.",
        example: "The smoke from the power plants ___ dangerous. (be)  ->  is",
        items: [
          { q: "Write a sentence about coal. Use is.", answer: "e.g. Coal is a fossil fuel." },
          { q: "Write a sentence about wind turbines. Use are.", answer: "e.g. Wind turbines are tall machines." },
          {
            q: "Find and fix two mistakes: 'Oil are a fossil fuel. The windmills was old.'",
            answer: "Oil is a fossil fuel. The windmills were old.",
          },
          { q: "Why do we say 'Electricity is useful' but 'Wind turbines are useful'? Explain in one or two sentences.", answer: "e.g. We cannot count electricity, so we use a singular verb. We can count wind turbines, and there is more than one, so we use are." },
          { q: "Write one sentence with a count noun and one with a noncount noun. Each needs the correct verb.", answer: "e.g. A power plant is a big building. Pollution is bad for the air." },
          { q: "Write a sentence that has electricity and solar panels in it, with is for one and are for the other.", answer: "e.g. Solar panels are on the roof, and electricity is made from the sun." },
        ],
      },
    ],
  },
];

export const odL3U9Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u09-check",
    title: "Quick check: energy words, may and might",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 9 energy words", "may and might", "renewable and nonrenewable"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A big building where electricity is made. Which word?", answer: "power plant" },
          { q: "A tall machine with long blades that turns wind into electricity. Which word?", answer: "wind turbine" },
          { q: "Dirty or harmful things in the air, water or ground. Which word?", answer: "pollution" },
          { q: "Coal, oil and natural gas are all this kind of fuel. Which two words?", answer: "fossil fuels" },
        ],
      },
      {
        title: "Grammar: may and might",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one word where it does not.",
        marksEach: 1,
        items: [
          { q: "I am sure the sun ___ rise tomorrow. (will / might)", answer: "will" },
          { q: "It ___ rain this weekend. I am not sure. (may / will)", answer: "may" },
          { q: "Correct the mistake: She mights go to the park.", answer: "She might go to the park." },
          { q: "Change to not sure with might: We will see a wind farm.", answer: "We might see a wind farm." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u09-test",
    title: "Unit 9 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 energy and power words and renewable and nonrenewable",
      "Paraphrasing",
      "may and might",
      "Verbs with count and noncount nouns",
      "Opposites (antonyms)",
      "Reading: a short text about solar panels at a school",
      "Writing: a source of energy",
      "Speaking: which source of energy is best",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A ___ is a place with many wind turbines.", options: ["windmill", "sailboat", "power plant", "wind farm"], answer: "wind farm" },
          { q: "A big building where electricity is made is a ___.", options: ["windmill", "power plant", "sailboat", "wind farm"], answer: "power plant" },
          { q: "Oil, coal and natural gas are ___.", options: ["wind turbines", "windmills", "fossil fuels", "pollution"], answer: "fossil fuels" },
          { q: "Wind is ___ because there will always be more.", options: ["nonrenewable", "dirty", "dangerous", "renewable"], answer: "renewable" },
          { q: "Oil can run out, so it is ___.", options: ["green", "nonrenewable", "renewable", "natural"], answer: "nonrenewable" },
          { q: "Smoke from old cars makes ___.", options: ["electricity", "a windmill", "pollution", "a sailboat"], answer: "pollution" },
          { q: "The sun is a ___ of light and heat.", options: ["plant", "source", "waste", "harm"], answer: "source" },
          { q: "The opposite of waste is ___.", options: ["harm", "plant", "harvest", "conserve"], answer: "conserve" },
          { q: "The opposite of harvest is ___.", options: ["shield", "plant", "waste", "conserve"], answer: "plant" },
        ],
      },
      {
        title: "Grammar: may and might",
        skill: "Grammar",
        instructions: "Choose or write the answer. Decide first if the speaker is sure or not sure.",
        marksEach: 1,
        items: [
          { q: "I am sure the Earth ___ go round the sun tomorrow.", options: ["might", "will"], answer: "will" },
          { q: "I am not sure about the weather. It ___ rain tomorrow.", options: ["may", "will"], answer: "may" },
          { q: "We might ___ a new kind of green energy one day.", options: ["finds", "to find", "find"], answer: "find" },
          { q: "Correct the mistake: My friend mights come to the party.", answer: "My friend might come to the party." },
          { q: "Change to not sure with may: People will use more wind power.", answer: "People may use more wind power." },
          { q: "Write one sentence about the future of energy. Use might and a reason.", answer: "e.g. We might use more solar panels because the sun never runs out." },
        ],
      },
      {
        title: "Grammar: verbs with count and noncount nouns",
        skill: "Grammar",
        instructions: "Choose the right verb, or write the sentence. Find the subject first.",
        marksEach: 1,
        items: [
          { q: "Electricity ___ very useful.", options: ["are", "is"], answer: "is" },
          { q: "The wind turbines ___ on the hill.", options: ["are", "is"], answer: "are" },
          { q: "Pollution ___ bad for our health.", options: ["are", "is"], answer: "is" },
          { q: "Long ago, windmills ___ common on farms.", options: ["were", "was"], answer: "were" },
          { q: "Correct the mistake: Oil are a fossil fuel.", answer: "Oil is a fossil fuel." },
          { q: "Correct the mistake: Coal and oil is nonrenewable.", answer: "Coal and oil are nonrenewable." },
        ],
      },
      {
        title: "Reading: solar panels at school",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Last year, the students at Hillside School asked their head teacher a question: Where does our electricity come from? The answer was a big power plant that burns coal. Coal is a fossil fuel, and burning it makes pollution. The students did not like that. They had an idea: put solar panels on the roof. The panels collect sunlight and turn it into electricity. It took the students three months to plan, and the school paid for the panels with the money from a school fair. On sunny days, the panels now make enough electricity for all the classrooms. On cloudy days, they might not make enough, so the school still uses some power from the plant. The students also switched off lights, and the school is now saving a lot of energy. In other words, they made the school cleaner and cheaper. Next year, they may add a small wind turbine, too.",
        marksEach: 1,
        items: [
          { q: "The school's electricity first came from solar panels.", options: ["True", "False"], answer: "False" },
          { q: "What do the solar panels turn into electricity?", options: ["wind", "sunlight", "coal"], answer: "sunlight" },
          { q: "Why did the students dislike the power plant?", options: ["It was too small.", "Burning coal makes pollution.", "It was too far away."], answer: "Burning coal makes pollution." },
          { q: "On cloudy days, the panels ...", options: ["will break", "might not make enough electricity", "make more electricity"], answer: "might not make enough electricity" },
          { q: "Which sentence says the same as 'In other words, they made the school cleaner and cheaper'?", options: ["The school got bigger.", "The students changed schools.", "The school became better for the air and cost less."], answer: "The school became better for the air and cost less." },
          {
            q: "What may the students do next year? Answer in your own words.",
            answer: "e.g. They may put a small wind turbine at the school. / They might add a wind turbine to make more green energy.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about one source of energy. Say where it comes from, if it is renewable and what it makes. Use is or are correctly, and one sentence with may or might. Marks (5): a clear first sentence, where it comes from and if it is renewable, correct is or are, a correct may or might sentence, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe one source of energy.",
            answer:
              "e.g. Wind power is a renewable energy resource. Wind turbines turn the wind into electricity. The wind is a good source because it never runs out. Wind turbines do not make pollution. On a still day, the turbines might not make enough electricity.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose one source of energy (the sun, wind, water or a fossil fuel). Talk for about one minute: say where it comes from, whether it is renewable, what it makes and whether it is good for the Earth. Say what may or might happen in the future. Then answer two questions from the teacher.",
      prompts: [
        "Where does the electricity at your home come from?",
        "Which source of energy is best for our town? Why?",
        "Do you agree with your partner's choice? Say why or why not.",
        "What might happen if people waste energy?",
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
            "Uses unit words correctly and naturally (renewable, source, power plant, pollution, fossil fuels).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the source only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: may / might and is / are",
          bands: [
            "Uses may or might correctly with a plain verb more than once, and chooses is and are correctly with count and noncount nouns.",
            "Uses may or might correctly at least once; one small slip, such as -s or to after may, or the wrong is / are.",
            "Tries may or might but often adds -s or to; is and are are usually wrong.",
            "No may or might; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains where the energy comes from, if it is renewable and what it makes, with a reason and an example.",
            "Says what the source is and gives one simple reason; some explanation of how it works.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
