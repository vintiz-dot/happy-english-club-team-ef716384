// Reach Higher 3A, Unit 2 (Nature's Balance): Jupiter's two checkpoints, in the
// format of the Hanoi public selective schools' grade-6 English test (Cầu Giấy:
// multiple choice plus written items). The mid-unit quiz runs in Lesson 4, the
// mock test in Lesson 8. Every item and the reading passage are the school's own;
// nothing is taken from the Student Book or from a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U2Assessments: Assessment[] = [
  {
    id: "rh-l3-u2-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["Wh- and How questions", "kinds of sentence, What a / How", "because / so", "quantifiers", "u_e sound", "offers and apologies"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "Which word has a different vowel sound?", options: ["flute", "tune", "rude", "sun"], answer: "sun" },
          { q: "How ___ does it rain in Hanoi in July? Almost every day.", options: ["much", "often", "long", "many"], answer: "often" },
          { q: "There were ___ fish in the river after the factory opened.", options: ["less", "fewer", "little", "much"], answer: "fewer" },
          { q: "___ terrible storm it was!", options: ["How", "What", "What a", "So"], answer: "What a" },
          { q: "'I'm sorry I broke your pencil.' - '___'", options: ["You're welcome.", "That's all right.", "Yes, please.", "Me too."], answer: "That's all right." },
        ],
      },
      {
        title: "Part B. Rewrite the sentences",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same. Start with the words given.",
        marksEach: 1,
        items: [
          { q: "The river is very dirty. → What ...", answer: "What a dirty river (it is)!" },
          { q: "The farmers sprayed the fields, so the bees died. → The bees died ...", answer: "The bees died because the farmers sprayed the fields." },
          { q: "Lan feeds the birds EVERY MORNING. Write a question for the words in capitals.", answer: "How often does Lan feed the birds?" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Vocabulary",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "There isn't many rice left in the bag.", answer: "many → much" },
          { q: "Where did the villagers planted the new bushes?", answer: "planted → plant" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u2-mock",
    title: "End-of-unit mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and -ed endings", "quantifiers", "used to", "first conditional", "present perfect for / since", "comparatives", "linking words", "too / enough / so ... that", "reading", "a 50-60 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds",
        skill: "Vocabulary",
        instructions: "Choose the word whose underlined part (the -ed ending or the vowel) sounds different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["visited", "needed", "played", "wanted"], answer: "played" },
          { q: "vowel sound", options: ["book", "good", "food", "foot"], answer: "food" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "There isn't ___ rain in the dry season.", options: ["many", "much", "few", "a few"], answer: "much" },
          { q: "My uncle ___ in a factory, but now he is a farmer.", options: ["use to work", "used to work", "used to working", "uses to work"], answer: "used to work" },
          { q: "If we ___ the forest, many animals will lose their homes.", options: ["cut down", "will cut down", "cutting down", "cuts down"], answer: "cut down" },
          { q: "Minh has lived in Hanoi ___ 2019.", options: ["for", "since", "in", "from"], answer: "since" },
          { q: "The Mekong is ___ river in Southeast Asia.", options: ["long", "longer", "the longest", "most long"], answer: "the longest" },
          { q: "'Would you like to come to the zoo with us?' - '___'", options: ["Yes, I do.", "I'd love to!", "You're welcome.", "No, thanks, I'm fine."], answer: "I'd love to!" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Although the water was cold, but we swam in the lake.", answer: "but → (delete)" },
          { q: "How many homework do you have tonight?", answer: "many → much" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write T (true) or F (false), then answer question 4.",
        passage:
          "The Sarus crane is the tallest flying bird in the world. Sarus cranes used to live in many rice fields in southern Vietnam, but now only a few hundred visit the Tràm Chim wetlands each dry season. When farmers drained the wetlands to grow more rice, the cranes lost the grass roots they eat. Since 2020, the park has kept more water in the wetlands, and the number of cranes has started to grow again. Scientists say that if the water stays clean, more cranes will come back.",
        marksEach: 1,
        items: [
          { q: "1. Sarus cranes are the tallest flying birds in the world.", answer: "T" },
          { q: "2. There are more Sarus cranes in Vietnam now than in the past.", answer: "F" },
          { q: "3. The cranes lost their food when the wetlands became dry.", answer: "T" },
          { q: "4. What will happen if the water stays clean?", answer: "More cranes will come back." },
        ],
      },
      {
        title: "Part E. Rewrite the sentences",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "The tea is very hot. I can't drink it. → The tea is too ...", answer: "The tea is too hot for me to drink." },
          { q: "Phong started learning the piano two years ago. → Phong has ...", answer: "Phong has learned the piano for two years." },
          { q: "The forest is very beautiful. Everyone wants to visit it. → The forest is so ...", answer: "The forest is so beautiful that everyone wants to visit it." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-60 words about a place in Vietnam where nature needs help. Say where it is, what has gone wrong, and what will happen if people help.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-60 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
];
