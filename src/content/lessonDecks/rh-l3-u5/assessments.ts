// Reach Higher 3B, Unit 5 (Mysteries of Matter): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test. The mid-unit quiz
// runs in Lesson 4, the mock (Cầu Giấy format: about 30 minutes, a short paragraph
// at the end) in Lesson 8. Every item and the reading passage are the school's
// own; nothing from the Student Book or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U5Assessments: Assessment[] = [
  {
    id: "rh-l3-u5-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["-ed / -ing adjectives", "adjective order", "so / such ... that", "comparative adverbs", "past continuous with when / while", "-ed endings"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The magic show was really ___.", options: ["amazed", "amazing", "amaze", "amazes"], answer: "amazing" },
          { q: "She has ___.", options: ["a black long beautiful dress", "a long beautiful black dress", "a beautiful long black dress", "a black beautiful long dress"], answer: "a beautiful long black dress" },
          { q: "It was ___ a hot day that the chocolate melted in my bag.", options: ["so", "such", "too", "very"], answer: "such" },
          { q: "Ice melts ___ in the sun than in the fridge.", options: ["more quick", "quicker than", "more quickly", "most quickly"], answer: "more quickly" },
          { q: "We ___ dinner when the lights went out.", options: ["had", "were having", "are having", "was having"], answer: "were having" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "I was very (interest) ___ in the experiment.", answer: "interested" },
          { q: "While my brother (play) ___ football, I was reading.", answer: "was playing" },
          { q: "The ice melted (quick) ___ than we expected.", answer: "more quickly" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Vocabulary",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "The snow was such deep that we couldn't open the door.", answer: "such → so" },
          { q: "The film was so bored that I fell asleep.", answer: "bored → boring" },
        ],
      },
      {
        title: "Part D. Sounds",
        skill: "Vocabulary",
        instructions: "Choose the word whose -ed ending sounds different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["melted", "wanted", "trapped", "needed"], answer: "trapped" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u5-mock",
    title: "End-of-unit mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "adjectives", "so / such ... that", "past continuous", "past passive", "prefixes", "conditionals", "possessives", "present perfect", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["formed", "cleaned", "melted", "filled"], answer: "melted" },
          { q: "stress", options: ["liquid", "solid", "substance", "occur"], answer: "occur" },
          { q: "stress", options: ["impossible", "incorrect", "invisible", "important"], answer: "incorrect" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The old bridge ___ in 1902.", options: ["built", "was built", "is built", "was build"], answer: "was built" },
          { q: "If you heat butter, it ___.", options: ["melts", "will melting", "melted", "would melt"], answer: "melts" },
          { q: "I ___ my bike when I saw the accident.", options: ["rode", "was riding", "am riding", "ride"], answer: "was riding" },
          { q: "Have you ___ tried Huế's famous bún bò?", options: ["ever", "yet", "since", "for"], answer: "ever" },
          { q: "These are my parents' books. They are ___.", options: ["their", "theirs", "they", "them"], answer: "theirs" },
          { q: "It took me two hours ___ the model.", options: ["make", "making", "to make", "made"], answer: "to make" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "As soon as the ice will melt, we will measure the water.", answer: "will melt → melts" },
          { q: "The bird hurt it's wing.", answer: "it's → its" },
          { q: "I have seen a snowman in Sa Pa last winter.", answer: "have seen → saw" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-3, then answer 4-5 in a few words.",
        passage:
          "On the coast of Bạc Liêu, many families are salt farmers. In the dry season, sea water is let into wide, flat fields. The water is only a few centimetres deep, so the hot sun and the strong wind can work on it quickly. After about a week, the water has disappeared into the air and a thin white layer of salt is left on the ground. The farmers rake the salt into small white hills and carry it away in baskets. It is hard work, but it is impossible to do in the rainy season: if rain falls on the fields, the salt dissolves and turns back into salty water.",
        marksEach: 1,
        items: [
          { q: "1. Salt farmers work mostly in the rainy season.", options: ["True", "False"], answer: "False" },
          { q: "2. The water in the salt fields is very deep.", options: ["True", "False"], answer: "False" },
          { q: "3. The sun and the wind help the water to disappear.", options: ["True", "False"], answer: "True" },
          { q: "4. How long does it take for the water to disappear?", answer: "About a week." },
          { q: "5. What happens to the salt if rain falls on the fields?", answer: "It dissolves / turns back into salty water." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "The tea was very hot. I couldn't drink it. → The tea was so ...", answer: "The tea was so hot that I couldn't drink it." },
          { q: "Scientists found the frozen animal in 2007. → The frozen animal ...", answer: "The frozen animal was found (by scientists) in 2007." },
          { q: "I spent three hours cleaning the kitchen. → It took ...", answer: "It took me three hours to clean the kitchen." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a change of matter you have seen at home (cooking, ice, a candle, rain on the ground). Say what it was like before, what caused the change, and what it was like after.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
];
