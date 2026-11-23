// Oxford Discover 2nd edition, Level 3, Unit 10 (Energy Savers on the Move): the
// unit's printable grammar worksheets (three levels each, with answer keys), the
// quick check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used: solar panels turn sunlight into
// electricity, wind turbines turn the wind's energy into electricity, and coal,
// oil and gas are fossil fuels.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U10Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ quantifiers
  {
    id: "od2e-l3-u10-ws-quantifiers",
    title: "Quantifiers: a lot of, lots of, a few, a little",
    grammar: "a lot of / lots of / a few / a little",
    deckId: "od2e-l3-u10-l3",
    slide: "Quantifiers: a lot of, lots of, a few, a little",
    intro:
      "Quantifiers tell us how much or how many. A lot of and lots of mean a big amount, with count and noncount nouns: a lot of apples, lots of energy. For a small amount, use a few with things you can count (a few apples) and a little with things you cannot count (a little water). Always put of after a lot and lots.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "There are ___ books on the shelf.  (a few / a little)  ->  a few",
        items: [
          { q: "There are ___ books on the shelf.", options: ["a little", "a few", "a lot"], answer: "a few" },
          { q: "We need ___ water for the plants.", options: ["a little", "a few"], answer: "a little" },
          { q: "The sun gives us ___ energy.", options: ["a lot", "a few", "a little", "a lot of"], answer: "a lot of" },
          { q: "There are ___ cars in a traffic jam.", options: ["a little", "lots of"], answer: "lots of" },
          { q: "I have ___ stickers, so I can share two with you.", options: ["a few", "a little"], answer: "a few" },
          { q: "Please put ___ sugar in my tea.", options: ["a few", "a lot", "a little"], answer: "a little" },
          { q: "Which sentence is correct?", options: ["We use lots electricity.", "We use lots of electricity."], answer: "We use lots of electricity." },
          { q: "Which sentence is correct?", options: ["She has a few friends.", "She has a few friend."], answer: "She has a few friends." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words: a lot of, lots of, a few or a little. For the correct questions, write the whole sentence.",
        example: "We drank ___ juice, but there was still some left. (a little)  ->  a little",
        items: [
          { q: "We drank ___ juice, but there was still some left.", answer: "a little" },
          { q: "There are ___ solar panels on our school roof. I can count three.", answer: "a few" },
          { q: "My town has ___ buses, so there is always one to take.", answer: "a lot of / lots of" },
          { q: "We need ___ rice for lunch, only one cup.", answer: "a little" },
          { q: "Correct the mistake: We need a few water.", answer: "We need a little water." },
          { q: "Correct the mistake: There are a little apples in the bowl.", answer: "There are a few apples in the bowl." },
          { q: "Correct the mistake: Cars use a lot fuel.", answer: "Cars use a lot of fuel." },
          { q: "Write a true sentence about your bag with a few.", answer: "e.g. I have a few pens in my bag." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every of, every a few and every a little.",
        example: "wood / nails: We have a little wood but a few nails.  (wood = noncount, nails = count)",
        items: [
          {
            q: "Write a sentence about a classroom with lots of, a few and a little. Use three different nouns.",
            answer: "e.g. Our classroom has lots of lights, a few fans and a little dust under the cupboard.",
          },
          {
            q: "Find and fix three mistakes: 'We use a lot energy at school. There is a few paper left. I put a little cookies in my bag.'",
            answer: "a lot of energy; There is a little paper left (or There are a few papers); a few cookies.",
          },
          { q: "Explain the difference: 'a few friends' and 'a little time'.", answer: "e.g. Friends are count nouns, so we use a few. Time is a noncount noun, so we use a little." },
          { q: "Write two sentences about saving energy at home. The first uses a lot of. The second uses a little.", answer: "e.g. We use a lot of electricity in the evening. If we turn off the TV, we save a little energy every day." },
          { q: "Why can we not say 'two energies' or 'a few energy'? Answer in one sentence.", answer: "e.g. Energy is a noncount noun: we do not count it one by one, so we use a little energy." },
          { q: "Write a true sentence about you and a family member. Use lots of and a reason with because.", answer: "e.g. My grandfather has lots of plants because he loves gardening." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ a, an, the
  {
    id: "od2e-l3-u10-ws-articles",
    title: "a, an and the",
    grammar: "a / an / the",
    deckId: "od2e-l3-u10-l4",
    slide: "a, an and the",
    intro:
      "Use a or an the first time you name one thing: a bird. Use an before a vowel SOUND (an apple) and a before a consonant sound (a bicycle). Use the when the reader already knows which one: The bird was blue. Also use the for something that is the only one: the sun, the wind.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "I saw ___ bird in the garden.  (a / an / the)  ->  a",
        items: [
          { q: "I saw ___ bird in the garden.", options: ["a", "an", "the"], answer: "a" },
          { q: "She ate ___ apple for breakfast.", options: ["a", "the", "an"], answer: "an" },
          { q: "___ sun gives us light and heat.", options: ["A", "An", "Some", "The"], answer: "The" },
          { q: "I have a bicycle. ___ bicycle is red.", options: ["The", "A", "An"], answer: "The" },
          { q: "He has ___ energy bar in his bag.", options: ["a", "an", "some"], answer: "an" },
          { q: "We saw ___ wind turbine on the hill. The turbine was very tall.", options: ["an", "a", "some"], answer: "a" },
          { q: "Which sentence is correct?", options: ["I ride bicycle to school.", "I ride a bicycle to school."], answer: "I ride a bicycle to school." },
          { q: "Which sentence is correct?", options: ["An hour is sixty minutes.", "A hour is sixty minutes."], answer: "An hour is sixty minutes." },
        ],
      },
      {
        level: "Core",
        instructions: "Write a, an or the in each gap. For the correct questions, write the whole sentence.",
        example: "We saw ___ elephant at the zoo.  ->  an",
        items: [
          { q: "We saw ___ elephant at the zoo.", answer: "an" },
          { q: "There is ___ solar panel on our roof. ___ panel makes electricity.", answer: "a; The" },
          { q: "___ wind is strong today, so the turbines are turning fast.", answer: "The" },
          { q: "I want ___ orange and ___ banana for lunch.", answer: "an; a" },
          { q: "Correct the mistake: She has a energy drink.", answer: "She has an energy drink." },
          { q: "Correct the mistake: I saw a taxi. A taxi was yellow.", answer: "I saw a taxi. The taxi was yellow." },
          { q: "Correct the mistake: A sun is a star.", answer: "The sun is a star." },
          { q: "Write two sentences about a vehicle. The first uses a or an. The second uses the.", answer: "e.g. I saw a helicopter. The helicopter was very loud." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Read carefully. Some answers need a sentence of your own.",
        example: "I saw a fire engine. The fire engine had a loud siren.  (a the first time, the next time)",
        items: [
          {
            q: "Fill the gaps: 'My uncle has ___ small farm. On ___ farm there is ___ wind turbine. ___ turbine makes electricity for ___ house.' (a, an, the)",
            answer: "a; the; a; The; the",
          },
          {
            q: "Find and fix three mistakes: 'I took a bus to town. A bus was very full. I had a idea: next time I will ride bicycle.'",
            answer: "The bus was very full; an idea; ride a bicycle.",
          },
          { q: "Explain why we say 'the sun' but 'a star'.", answer: "e.g. There is only one sun in our sky, so we say the sun. There are many stars, and a star is one of many." },
          { q: "Why do we say 'an hour' but 'a university'? Answer in one sentence.", answer: "e.g. We use an before a vowel sound: hour starts with the sound 'ow', and university starts with the sound 'yoo'." },
          { q: "Write three sentences about energy: one with a, one with an and one with the.", answer: "e.g. A wind turbine makes electricity. An engine needs fuel. The sun gives us energy." },
          { q: "Write a short paragraph (3 sentences) about a bicycle. Use a the first time and the after that.", answer: "e.g. I have a bicycle. The bicycle is blue. I ride the bicycle to school every day." },
        ],
      },
    ],
  },
];

export const odL3U10Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u10-check",
    title: "Quick check: transportation words and quantifiers",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 10 transportation words", "quantifiers: a lot of, lots of, a few, a little"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "Stairs that move up or down by themselves. Which word?", answer: "escalator" },
          { q: "A vehicle that takes sick or hurt people to the hospital. Which word?", answer: "ambulance" },
          { q: "A group of people who share one car for the same trip. Which word?", answer: "carpool" },
          { q: "A lot of cars stuck on the road, moving very slowly. Which two words?", answer: "traffic jam" },
        ],
      },
      {
        title: "Grammar: quantifiers",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: We need ___ water. Only one cup. (a few / a little)", answer: "a little" },
          { q: "Complete: There are ___ apples in the bag. I can count three. (a few / a little)", answer: "a few" },
          { q: "Correct the mistake: We use a lot energy every day.", answer: "We use a lot of energy every day." },
          { q: "'There are a little books on the table' is correct.", options: ["True", "False"], answer: "False" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u10-test",
    title: "Unit 10 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "The 10 transportation words: subway, fire engine, carpool, ambulance, escalator, train, taxi, elevator, helicopter, traffic jam",
      "Words in context: mask, button, pedal, blades",
      "Quantifiers: a lot of, lots of, a few, a little",
      "a, an and the",
      "The prefix re-",
      "Reading: a school that saves energy",
      "Writing: a short paragraph about energy",
      "Speaking: how to save energy",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "A train that runs under the ground in a city.", answer: "subway" },
          { q: "A big red truck that carries firefighters and water.", answer: "fire engine" },
          { q: "A vehicle that takes sick or hurt people to the hospital.", answer: "ambulance" },
          { q: "Stairs that move up or down by themselves.", options: ["elevator", "escalator", "taxi"], answer: "escalator" },
          { q: "A small room that carries people up and down a building.", options: ["escalator", "train", "elevator"], answer: "elevator" },
          { q: "A car with a driver that you pay to take you somewhere.", options: ["helicopter", "subway", "train", "taxi"], answer: "taxi" },
          { q: "An aircraft with blades on top that spin round.", answer: "helicopter" },
          { q: "A lot of cars stuck on the road, moving very slowly.", answer: "traffic jam" },
          { q: "The part of a bicycle that you push with your foot to make it go.", options: ["pedal", "button", "mask"], answer: "pedal" },
          { q: "A small part that you press to make a machine work.", options: ["blades", "button", "mask"], answer: "button" },
        ],
      },
      {
        title: "Grammar: quantifiers",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "We use ___ energy at school every day.", options: ["a lot", "a lot of"], answer: "a lot of" },
          { q: "There are ___ eggs in the fridge. I can count two.", options: ["a little", "a lot", "a few"], answer: "a few" },
          { q: "I put ___ salt in the soup, only a pinch.", options: ["a few", "a little"], answer: "a little" },
          { q: "Correct the mistake: There are lots cars in a traffic jam.", answer: "There are lots of cars in a traffic jam." },
          { q: "Correct the mistake: We need a few water for the plants.", answer: "We need a little water for the plants." },
          { q: "Write a sentence about your classroom with a few.", answer: "e.g. There are a few plants in our classroom." },
        ],
      },
      {
        title: "Grammar: a, an and the",
        skill: "Grammar",
        instructions: "Choose a, an or the, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "Yesterday I saw ___ solar panel for the first time.", options: ["an", "a", "some"], answer: "a" },
          { q: "She ate ___ apple and a sandwich.", options: ["a", "some", "an"], answer: "an" },
          { q: "___ sun is a source of energy.", options: ["A", "An", "Some", "The"], answer: "The" },
          { q: "We saw a wind turbine. ___ turbine was turning fast.", options: ["The", "A", "An"], answer: "The" },
          { q: "Correct the mistake: He has a energy bar in his bag.", answer: "He has an energy bar in his bag." },
          { q: "Write two sentences about a helicopter. Use a the first time and the the second time.", answer: "e.g. I saw a helicopter. The helicopter was very loud." },
        ],
      },
      {
        title: "Grammar: the prefix re-",
        skill: "Grammar",
        instructions: "Write the word with re-, or answer the question.",
        marksEach: 1,
        items: [
          { q: "Add re-: to write something again is to ___write.", answer: "rewrite" },
          { q: "Add re-: to build something again is to ___build.", answer: "rebuild" },
          { q: "Add re-: She ___charged her phone because the battery was empty.", answer: "recharged" },
          { q: "What does the prefix re- mean?", options: ["not", "before", "again"], answer: "again" },
          { q: "'The workers replanted the trees.' What did they do?", options: ["They cut the trees down.", "They planted the trees again.", "They planted the trees for the first time."], answer: "They planted the trees again." },
          { q: "Write a sentence with the word retake or rewrite.", answer: "e.g. I had to retake the quiz because I was ill." },
        ],
      },
      {
        title: "Reading: a school that saves energy",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Nora's school used to waste a lot of energy. The lights stayed on all day, even when the sun was shining through the windows, and the fans ran at lunch time when nobody was in the room. One day, Nora's class made a plan. They put a sticker by every light switch, and each week a different student became the 'energy helper' who turned off the lights when the class left. They also moved a few desks near the windows, so they needed a little less electric light. Then the school put some solar panels on the roof. Solar panels collect sunlight and turn it into electricity. After one term, the school's electricity bill was lower, and the teachers were very pleased. Nora's favorite idea is the new bike rack. Now a lot of children ride to school instead of coming by car, and the traffic jam at the gate is shorter. Nora says, 'We did not need a superhero. We needed lots of small helpers!'",
        marksEach: 1,
        items: [
          { q: "The lights used to stay on all day.", options: ["True", "False"], answer: "True" },
          { q: "The energy helper changes every week.", options: ["True", "False"], answer: "True" },
          { q: "The solar panels are on the playground.", options: ["True", "False"], answer: "False" },
          { q: "What do solar panels do?", options: ["They make the wind blow.", "They keep the classroom cool.", "They turn sunlight into electricity."], answer: "They turn sunlight into electricity." },
          { q: "Why is the traffic jam at the gate shorter now?", options: ["The school moved.", "More children ride bicycles to school.", "There are no cars in the town."], answer: "More children ride bicycles to school." },
          { q: "What does Nora mean when she says 'We needed lots of small helpers'? Answer in your own words.", answer: "e.g. She means that many people doing small things, like turning off lights, can save a lot of energy together." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a way to save energy at school or at home. Use a or an the first time you name something and the after that. Use at least one quantifier (a lot of, a few or a little) and one word with re-. Marks (5): a clear first sentence, a and the used correctly, a correct quantifier, a re- word, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about a way to save energy.",
            answer:
              "e.g. A good way to save energy is to use a bicycle. The bicycle does not need any fuel. If a lot of children ride bicycles to school, there are a few cars on the road and less traffic. We can also recharge our batteries with a solar charger, so we do not waste energy every day.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose one way to save energy, or one kind of transportation that saves energy. Talk for about one minute: say what it is, where the energy comes from, why it is a good idea and who can do it. Then answer two questions from the teacher.",
      prompts: [
        "How much energy do you think it saves, a lot or a little? Why?",
        "Is it easy or hard for your family to do this? What could you do?",
        "What is one other source of energy, and how is it different?",
        "What would you say to convince a friend to try it?",
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
            "Uses unit words correctly and naturally (transportation words, energy, wind, sun, fossil fuels, re- words).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the idea only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: quantifiers, a / an / the",
          bands: [
            "Uses a lot of, a few or a little and a, an and the correctly, more than once.",
            "Uses at least two of these correctly; one small slip, such as a few water or a missing the.",
            "Tries them but with errors (a lot energy, I ride bicycle); only one is used.",
            "None of them; uses only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains the idea clearly and gives a reason and an example; says where the energy comes from.",
            "Explains the idea and gives a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
