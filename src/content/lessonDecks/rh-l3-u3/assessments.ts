// Reach Higher 3A, Unit 3 (Life in the Soil): Jupiter's two checkpoints in the
// format of the Hanoi public selective schools' grade-6 English test. The mid-unit
// quiz runs in Lesson 4, the mock (Thanh Xuân format: 40 minutes there, 30 here,
// multiple choice plus written) in Lesson 8. Every item and the reading passage
// are the school's own; nothing from the Student Book or a past paper.
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
        skill: "Vocabulary",
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
    covers: ["plural and -ed sounds", "articles", "prepositions", "relative clauses", "present passive", "word formation", "reading", "a 50-60 word paragraph"],
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
          { q: "Coffee ___ in Đắk Lắk.", options: ["grows", "is grown", "is grew", "growing"], answer: "is grown" },
          { q: "A gardener is a person ___ looks after plants.", options: ["which", "where", "who", "whose"], answer: "who" },
          { q: "This is the park ___ we fly kites.", options: ["which", "where", "who", "what"], answer: "where" },
          { q: "Phong Nha has ___ caves in the world.", options: ["the biggest", "the bigger", "biggest", "the most big"], answer: "the biggest" },
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
        instructions: "Write 50-60 words about a plant or a place in nature you would like to visit. Say what it is, where it is, and why you want to see it.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-60 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
];
