// Reach Higher 3A, Unit 4 (Let's Work Together): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test. The mid-unit quiz
// runs in Lesson 4, the mock (Nguyễn Tất Thành format: about 30 minutes, a short
// paragraph at the end) in Lesson 8. Every item and the reading passage are the
// school's own; nothing from the Student Book or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U4Assessments: Assessment[] = [
  {
    id: "rh-l3-u4-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["verb patterns", "present simple / continuous", "suggestions and replies", "phrasal verbs", "word stress"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "We enjoy ___ in the school garden.", options: ["work", "to work", "working", "worked"], answer: "working" },
          { q: "Listen! The children ___ in the next room.", options: ["sing", "sings", "are singing", "singing"], answer: "are singing" },
          { q: "'How about making a poster?' - '___'", options: ["Good idea!", "Yes, I do.", "You're welcome.", "That's all right."], answer: "Good idea!" },
          { q: "The maths problem was hard, but we ___ it out.", options: ["gave", "worked", "set", "looked"], answer: "worked" },
          { q: "Which word has the stress on the second syllable?", options: ["market", "money", "reward", "farmer"], answer: "reward" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the verb in brackets.",
        marksEach: 1,
        items: [
          { q: "My father (not drink) ___ coffee in the evening.", answer: "doesn't drink" },
          { q: "Would you like (join) ___ our club?", answer: "to join" },
          { q: "Our teacher made us (write) ___ the story again.", answer: "write" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Vocabulary",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Why don't we going to the park?", answer: "going → go" },
          { q: "She is knowing all the answers.", answer: "is knowing → knows" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u4-mock",
    title: "End-of-unit mock test (Nguyễn Tất Thành format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "verb patterns", "agreement", "modals", "conditionals", "dialogue replies", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "vowel sound (al / aw / au)", options: ["draw", "small", "hawk", "cake"], answer: "cake" },
          { q: "stress", options: ["harvest", "farmer", "method", "conserve"], answer: "conserve" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "You ___ bring a dictionary. I have one for you.", options: ["mustn't", "don't have to", "can't", "shouldn't to"], answer: "don't have to" },
          { q: "Everyone in my class ___ a library card.", options: ["have", "has", "are having", "having"], answer: "has" },
          { q: "If I ___ a bird, I would fly over Hạ Long Bay.", options: ["am", "was being", "were", "will be"], answer: "were" },
          { q: "She is good at ___ problems.", options: ["solve", "to solve", "solving", "solved"], answer: "solving" },
          { q: "'Thank you for your help.' - '___'", options: ["Good idea.", "It was my pleasure.", "Yes, please.", "I'd love to."], answer: "It was my pleasure." },
          { q: "If we work together, we ___ the job by noon.", options: ["finish", "will finish", "would finish", "finished"], answer: "will finish" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "If it will rain tomorrow, we will stay at home.", answer: "will rain → rains" },
          { q: "My mother let me to stay up late at Tết.", answer: "to stay → stay" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the notice and the text. Choose the best answer or write a short answer.",
        passage:
          "GREEN SATURDAY - Volunteers needed! Meet at the school gate at 7:00 a.m. Bring gloves and a water bottle. You don't have to bring bags; we will give you some.\n\nLast month, forty students from our school cleaned the beach at Cửa Lò. They worked in teams of five. One person counted the rubbish, two collected plastic and two collected glass. By lunchtime they had filled sixty bags. 'If we hadn't worked in teams, we wouldn't have finished,' said Minh, one of the leaders.",
        marksEach: 1,
        items: [
          { q: "1. What must volunteers bring?", options: ["bags and gloves", "gloves and a water bottle", "only a water bottle", "nothing"], answer: "gloves and a water bottle" },
          { q: "2. How many students were in each team?", answer: "Five." },
          { q: "3. How many bags did they fill?", answer: "Sixty." },
          { q: "4. Why, according to Minh, did they finish?", answer: "Because they worked in teams." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "It isn't necessary for you to wear a tie. → You don't ...", answer: "You don't have to wear a tie." },
          { q: "I don't know her number, so I can't call her. → If I ...", answer: "If I knew her number, I could / would call her." },
          { q: "\"I am very busy,\" said my aunt. → My aunt said ...", answer: "My aunt said (that) she was very busy." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a time you worked with other people to get something done. Say what you did, who helped, and what you learned.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
];
