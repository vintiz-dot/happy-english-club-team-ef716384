// Reach Higher 3B, Unit 8 (Getting There): Jupiter's two checkpoints in the format
// of the Hanoi selective schools' grade-6 English test. The mid-unit quiz runs in
// Lesson 4; the mock in Lesson 8 is the end-of-3B mock (Cầu Giấy format: about 30
// minutes, a short paragraph at the end) and reaches back over the whole of 3B.
// Every item and the reading passage are the school's own; nothing from the Student
// Book or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U8Assessments: Assessment[] = [
  {
    id: "rh-l3-u8-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["advice: should / ought to / had better", "present perfect vs past simple", "How far / How long / It takes", "-ant / -ent spelling", "dialogue replies"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "You look tired. You'd better ___ a rest.", options: ["take", "to take", "taking", "took"], answer: "take" },
          { q: "My sister ___ two half marathons so far.", options: ["ran", "has run", "runs", "is running"], answer: "has run" },
          { q: "How long does it take you ___ to school?", options: ["walk", "walking", "to walk", "walked"], answer: "to walk" },
          { q: "Which spelling is correct?", options: ["diffrent", "different", "differant", "diferent"], answer: "different" },
          { q: "'What should I do? I can't sleep.' - '___'", options: ["If I were you, I'd read a book.", "Yes, you should.", "Good night!", "I'm sleeping."], answer: "If I were you, I'd read a book." },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the verb in brackets.",
        marksEach: 1,
        items: [
          { q: "We (climb) ___ Ba Vì mountain two years ago.", answer: "climbed" },
          { q: "___ you ever (be) ___ to Phú Quốc?", answer: "Have · been" },
          { q: "You ought (wear) ___ a hat in the sun.", answer: "to wear" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Vocabulary",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "How far it is from Hanoi to Hải Phòng?", answer: "it is → is it" },
          { q: "I have finished the book last night.", answer: "have finished → finished" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u8-mock",
    title: "End-of-3B mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "advice", "present perfect vs past simple", "purpose clauses", "future forms and time clauses", "wish and unless", "dialogue replies", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "stress", options: ["journey", "prepare", "challenge", "distance"], answer: "prepare" },
          { q: "stress", options: ["achieve", "explore", "succeed", "meter"], answer: "meter" },
          { q: "vowel sound", options: ["goal", "globe", "road", "bought"], answer: "bought" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "It's raining hard. You'd better ___ an umbrella.", options: ["take", "to take", "taking", "took"], answer: "take" },
          { q: "Have you ___ finished your project?", options: ["yet", "already", "ago", "since"], answer: "already" },
          { q: "She practised every day so that she ___ win the competition.", options: ["can", "could", "will", "must"], answer: "could" },
          { q: "When I ___ home, I'll phone you.", options: ["get", "will get", "got", "am getting"], answer: "get" },
          { q: "I wish I ___ a little taller.", options: ["am", "were", "will be", "have been"], answer: "were" },
          { q: "'Good luck in the race tomorrow!' - '___'", options: ["Thanks. I'll do my best.", "Yes, I am.", "Never mind.", "You're welcome."], answer: "Thanks. I'll do my best." },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Unless you don't hurry, you'll miss the train.", answer: "don't hurry → hurry" },
          { q: "It takes me half an hour go to my grandmother's house.", answer: "go → to go" },
          { q: "\"I'm nearly there\" she shouted.", answer: "there\" → there,\" (comma inside the speech marks)" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-2, then answer 3-5 in a few words.",
        passage:
          "Last spring, Mai and her grandfather decided to climb Fansipan, the highest mountain in Vietnam. It is 3,143 meters high. Many visitors take the cable car, but Mai wanted to walk all the way. To prepare, they climbed the stairs of their apartment building every evening for two months. They also studied a map so that they would know the route. The climb took them two days. On the first night they slept at a camp at 2,200 meters. 'I wish I had brought warmer socks!' Mai laughed. When they reached the top, they were tired but very proud. Next year they are going to climb Pu Ta Leng, the second highest mountain.",
        marksEach: 1,
        items: [
          { q: "1. Mai and her grandfather went up by cable car.", options: ["True", "False"], answer: "False" },
          { q: "2. They trained for two months before the climb.", options: ["True", "False"], answer: "True" },
          { q: "3. Why did they study a map?", answer: "So that they would know the route." },
          { q: "4. How long did the climb take?", answer: "Two days." },
          { q: "5. What are they going to do next year?", answer: "Climb Pu Ta Leng (the second highest mountain)." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "My advice is to see a doctor. → If I ...", answer: "If I were you, I would see a doctor." },
          { q: "She started running three years ago. → She has ...", answer: "She has run / been running for three years." },
          { q: "The walk to school takes me 15 minutes. → It takes ...", answer: "It takes me 15 minutes to walk to school." },
          { q: "I'm sorry I can't speak French. → I wish ...", answer: "I wish I could speak French." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a goal you have achieved or want to achieve. Say what the goal is, what tools or help you used or will use, and how you felt or will feel.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar (tenses chosen to fit time), vocabulary." },
        ],
      },
    ],
  },
];
