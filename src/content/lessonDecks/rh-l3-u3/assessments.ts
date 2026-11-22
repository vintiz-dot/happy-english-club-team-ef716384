// Reach Higher 3A, Unit 3 (Life in the Soil): Jupiter's two checkpoints in the
// format of the Hanoi public selective schools' grade-6 English test, and the full
// end-of-unit test. The mid-unit quiz runs in Lesson 4, the mock (Thanh Xuân format:
// 40 minutes there, 30 here, multiple choice plus written) in Lesson 8, and the
// end-of-unit test takes the class date after Lesson 8. Every item and every
// reading passage are the school's own; nothing from the Student Book, the
// publisher's unit test or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U3Assessments: Assessment[] = [
  {
    id: "rh-l3-u3-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["prepositions of place and time", "articles", "Unit 2 review", "plural sounds"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The cat is hiding ___ the bed.", options: ["under", "between", "among", "at"], answer: "under" },
          { q: "My birthday is ___ 12 May.", options: ["in", "at", "on", "by"], answer: "on" },
          { q: "She wants to be ___ artist.", options: ["a", "an", "the", "-"], answer: "an" },
          { q: "We have lived here ___ 2020.", options: ["for", "since", "in", "from"], answer: "since" },
          { q: "Which word's ending sounds different?", options: ["roots", "seeds", "plants", "lakes"], answer: "seeds" },
        ],
      },
      {
        title: "Part B. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "The flowers open in the morning and close on night.", answer: "on night → at night" },
          { q: "Hanoi is the capital of the Vietnam.", answer: "the Vietnam → Vietnam" },
          { q: "I'll wait here by you come back.", answer: "by → until" },
        ],
      },
      {
        title: "Part C. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "The library is next to the gym, and the gym is next to the canteen. → The gym is ...", answer: "The gym is between the library and the canteen." },
          { q: "There were more trees here before. → There used ...", answer: "There used to be more trees here." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u3-mock",
    title: "End-of-unit mock test (Thanh Xuân format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["plural and -ed sounds", "articles", "prepositions", "relative clauses", "present passive", "word formation", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds",
        skill: "Vocabulary",
        instructions: "Choose the word whose ending is pronounced differently.",
        marksEach: 1,
        items: [
          { q: "plural ending", options: ["boxes", "bushes", "leaves", "roses"], answer: "leaves" },
          { q: "-ed ending", options: ["planted", "watered", "needed", "visited"], answer: "watered" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "Coffee ___ by farmers in Đắk Lắk.", options: ["grows", "is grown", "is grew", "growing"], answer: "is grown" },
          { q: "A gardener is a person ___ looks after plants.", options: ["which", "where", "who", "whose"], answer: "who" },
          { q: "This is the park ___ we fly kites.", options: ["which", "where", "who", "what"], answer: "where" },
          { q: "Sơn Đoòng, in Phong Nha, is ___ cave in the world.", options: ["the biggest", "the bigger", "biggest", "the most big"], answer: "the biggest" },
          { q: "'Could you help me carry this?' - '___'", options: ["Sure, no problem.", "Yes, I could.", "You're welcome.", "Here you are."], answer: "Sure, no problem." },
        ],
      },
      {
        title: "Part C. Word formation",
        skill: "Vocabulary",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "The rangers work ___ to protect the forest. (hard)", answer: "hard" },
          { q: "Cúc Phương is famous for its ___. (diverse)", answer: "diversity" },
          { q: "Please hold the baby bird ___. (gentle)", answer: "gently" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write T (true) or F (false), then answer question 4.",
        passage:
          "Mangrove trees grow in salty water along the coast of Cà Mau. Their roots stand above the mud like long legs, and small fish hide among them. Mangroves are sometimes called 'the walls of the sea' because they protect villages from big waves. In the past, many mangrove forests were cut down to make shrimp farms. Now new mangroves are planted every year by local people and students, and the forests are slowly growing again.",
        marksEach: 1,
        items: [
          { q: "1. Mangrove trees grow in fresh water in the mountains.", answer: "F" },
          { q: "2. Small fish hide among the roots.", answer: "T" },
          { q: "3. Mangroves can protect villages from waves.", answer: "T" },
          { q: "4. Who plants new mangroves every year?", answer: "Local people and students." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "People make paper from trees. → Paper ...", answer: "Paper is made from trees." },
          { q: "I know a girl. She grows orchids on her balcony. → I know a girl who ...", answer: "I know a girl who grows orchids on her balcony." },
          { q: "She is a careful painter. → She paints ...", answer: "She paints carefully." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a plant or a place in nature you would like to visit. Say what it is, where it is, and why you want to see it.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u3-test",
    title: "End-of-unit test: Life in the Soil",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "The Unit 3 key words, Part 1 (how plants grow) and Part 2 (habitats and diversity), in context",
      "The book's grammar: plural nouns (-s, -es, -ies, special plurals), count and noncount nouns, articles a / an / the, proper nouns",
      "The exam strand: prepositions of place and time, defining relative clauses, the present passive, word formation, superlatives and going to",
      "Reading: an original article about the lotus (main idea, details, inference)",
      "Writing: a 70-100 word article on the Big Question",
      "Speaking: a 2-minute talk on the Big Question and follow-up questions",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap.",
        marksEach: 1,
        items: [
          { q: "After three days of rain, a tiny green ___ pushed up through the soil.", options: ["sprout", "desert", "city", "cycle"], answer: "sprout" },
          { q: "Seed, sprout, plant, flower, fruit, and then a new seed: this is a plant's life ___.", options: ["root", "cycle", "growth", "weed"], answer: "cycle" },
          { q: "Plants grow well when the ___ are right: enough light, enough water and warm soil.", options: ["organisms", "cities", "conditions", "blossoms"], answer: "conditions" },
          { q: "Baby birds ___ on their parents for food until they can fly.", options: ["produce", "protect", "sprout", "depend"], answer: "depend" },
          { q: "A healthy mango tree can ___ hundreds of mangoes every year.", options: ["produce", "depend", "protect", "measure"], answer: "produce" },
          { q: "Cúc Phương has a great ___ of plants and animals: hundreds of different kinds live there.", options: ["desert", "diversity", "root", "characteristic"], answer: "diversity" },
          { q: "It hardly ever rains in the ___, so only a few tough plants can grow there.", options: ["rainforest", "city", "desert", "soil"], answer: "desert" },
          { q: "Every living thing, from a tiny insect to a tall tree, is an ___.", options: ["environment", "organism", "vine", "weed"], answer: "organism" },
          { q: "Mangrove forests ___ villages on the coast from big waves.", options: ["protect", "produce", "depend", "sprout"], answer: "protect" },
          { q: "No other plant in the world looks like this one. It is ___.", options: ["common", "weedy", "unique", "careful"], answer: "unique" },
        ],
      },
      {
        title: "Part B. Grammar A: nouns and articles",
        skill: "Grammar",
        instructions: "Questions 1-8: choose the best answer. Question 9: correct the mistake.",
        marksEach: 1,
        items: [
          { q: "1. We planted tomatoes in three wooden ___.", options: ["boxs", "boxes", "boxies", "box"], answer: "boxes" },
          { q: "2. Two ___ are playing near the pond.", options: ["puppys", "puppyes", "puppies", "puppy"], answer: "puppies" },
          { q: "3. My little sister has six new ___.", options: ["tooths", "teeth", "teeths", "toothes"], answer: "teeth" },
          { q: "4. Plants need water and ___ to grow.", options: ["sunlight", "sunlights", "a sunlight", "the sunlights"], answer: "sunlight" },
          { q: "5. How ___ rice do we need for the party?", options: ["many", "few", "much", "a few"], answer: "much" },
          { q: "6. {s1} has ___ orange tree and a lemon tree on her balcony.", options: ["a", "an", "the", "-"], answer: "an" },
          { q: "7. I planted a seed last week. Today ___ seed has a little sprout.", options: ["a", "an", "the", "-"], answer: "the" },
          {
            q: "8. Which sentence uses capital letters correctly?",
            options: ["We visited the okapi reserve in congo.", "We visited the Okapi Reserve in Congo.", "we visited the Okapi reserve in Congo.", "We visited The okapi Reserve in congo."],
            answer: "We visited the Okapi Reserve in Congo.",
          },
          { q: "9. Correct the mistake: There are many childs in the school garden.", answer: "childs → children" },
        ],
      },
      {
        title: "Part C. Grammar B: exam practice",
        skill: "Grammar",
        instructions: "Do what each question asks. Write the whole sentence when you rewrite or combine.",
        marksEach: 1,
        items: [
          { q: "1. Rewrite in the passive: People grow coffee in the Central Highlands. → Coffee ...", answer: "Coffee is grown in the Central Highlands." },
          { q: "2. Combine with who: This is the botanist. He saved thousands of plant samples.", answer: "This is the botanist who saved thousands of plant samples." },
          { q: "3. Combine with where: That is the forest. Okapis live there.", answer: "That is the forest where okapis live." },
          { q: "4. Correct the mistake: My grandmother was born at 1958.", answer: "at → in (in 1958)" },
          { q: "5. Correct the mistake: I'll finish my article until Friday.", answer: "until → by (by Friday)" },
          { q: "6. Word form: The ___ of the bamboo was amazing: it grew 30 centimetres in one day. (grow)", answer: "growth" },
          { q: "7. Word form: The workers cut the leaves ___ so they don't hurt the young branches. (careful)", answer: "carefully" },
          { q: "8. Word form: After months without rain, the field was dry and ___. (life)", answer: "lifeless" },
          { q: "9. Rewrite: No tree in our village is older than this banyan. → This banyan is ...", answer: "This banyan is the oldest tree in our village." },
          { q: "10. Rewrite: We have a plan to plant sunflowers next week. → We are going ...", answer: "We are going to plant sunflowers next week." },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the article. Questions 1, 4 and 5: choose the best answer. Questions 2 and 3: True or False. Question 6: answer in one or two sentences.",
        passage:
          "Every summer, the ponds around Hanoi turn pink and white. The lotus is a plant that grows in water, but its roots are hidden in the thick mud at the bottom of the pond. Its big, round leaves float on the surface or stand above it, and rain runs off them like little silver balls.\n\nA lotus flower opens early in the morning and closes again in the afternoon. When the petals fall, a seed pod is left. The seeds are amazing: scientists once grew a new plant from a lotus seed found in China that was more than a thousand years old!\n\nPeople use almost every part of the lotus. The seeds are cooked in sweet soups, the roots are eaten as a vegetable, and around West Lake the flowers are used to make a famous tea. Many people see the lotus as a symbol of Vietnam because it grows clean and beautiful out of the mud.",
        marksEach: 2,
        items: [
          { q: "1. Where are the roots of the lotus?", options: ["in the mud at the bottom of the pond", "on the surface of the water", "above the leaves", "in the air"], answer: "in the mud at the bottom of the pond" },
          { q: "2. A lotus flower stays open all day and all night.", options: ["True", "False"], answer: "False" },
          { q: "3. Scientists grew a lotus plant from a very old seed.", options: ["True", "False"], answer: "True" },
          { q: "4. Which part of the lotus is used to make the famous West Lake tea?", options: ["the roots", "the seeds", "the flowers", "the leaves"], answer: "the flowers" },
          {
            q: "5. What is the main idea of the last paragraph?",
            options: ["Lotus roots are hidden in the mud.", "People use almost every part of the lotus.", "Lotus seeds can live for a very long time.", "Ponds turn pink in summer."],
            answer: "People use almost every part of the lotus.",
          },
          {
            q: "6. Rain runs off the leaves \"like little silver balls\". What can you infer about lotus leaves?",
            answer: "e.g. The leaves do not get wet: the water cannot soak in, so it rolls off in drops (the leaves are waterproof).",
          },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions:
          "What is so amazing about plants? Choose one plant you know (at home, at school or anywhere in Vietnam) and write a short article of 70-100 words for a class science magazine. Begin with a topic sentence that tells your main idea, give at least three facts or details, and finish with a conclusion. Use at least one present passive and one relative clause. Marks (10), 2.5 for each part: content (a clear answer to the Big Question with three facts or details); organisation (topic sentence, details in a sensible order, conclusion, linking words); grammar (plurals, articles, a correct passive and relative clause); vocabulary and spelling (unit words used correctly).",
        marksEach: 10,
        items: [
          {
            q: "Your article (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each: content, organisation, grammar, vocabulary and spelling. e.g. Bamboo is one of the most amazing plants in Vietnam. Some kinds can grow almost a metre in a single day, which makes bamboo one of the fastest-growing plants in the world. Its strong stems are used to build houses, bridges and furniture, and its young shoots are cooked as food. Bamboo also protects villages, because its roots hold the soil together when heavy rain falls. That is why bamboo is a plant that people in Vietnam depend on every day.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about 2 minutes on the Big Question: What is so amazing about plants? Choose one or two plants from the unit (Hoa's passion fruit vine, the foods in the haiku, the plants of the Okapi Reserve) or from Vietnam. Give at least three reasons, each with an example or a fact. Then answer the teacher's follow-up questions.",
      prompts: [
        "Which selection in this unit taught you the most about plants? Why?",
        "What conditions does your plant need to grow? What would happen without them?",
        "Why do people protect places like the Okapi Reserve or Cúc Phương?",
        "If you could grow one plant on your balcony, like Hoa, what would it be, and why?",
        "Is a seed alive? Explain your answer.",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks for the full 2 minutes with only short pauses to think; ideas link smoothly (first, also, because, so).",
            "Talks for most of the 2 minutes; a few pauses or restarts but keeps going without help.",
            "Talks for about a minute; many pauses; speaks in short pieces and needs a prompt once or twice.",
            "Says only a few sentences; long silences; needs help throughout.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses a range of the unit's grammar correctly (plurals, articles, a passive, a relative clause, a superlative); slips are rare and do not confuse.",
            "Uses some of the unit's grammar correctly; several small errors (a / the, plural -s) but the meaning is clear.",
            "Mostly simple present sentences; frequent errors with plurals and articles; tries a passive or relative clause with mistakes.",
            "Single words or memorised phrases; errors often stop the meaning.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses many unit words naturally and correctly (conditions, depend, produce, diversity, protect, unique) and precise plant words.",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; uses the first language for missing words.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear throughout, with plural and -ed endings heard; answers follow-up questions fully and adds a reason or an example.",
            "Mostly clear; some endings dropped; answers follow-up questions with a short reason.",
            "Sometimes hard to follow; many endings dropped; answers questions with a word or two.",
            "Often hard to understand; cannot answer the follow-up questions without help.",
          ],
        },
      ],
    },
  },
];
