// Reach Higher 3B, Unit 6 (From Past to Present): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test. The mid-unit quiz
// runs in Lesson 4, the mock (Thanh Xuân format: about 30 minutes, true / false and
// short answers on a reading text, a short paragraph at the end) in Lesson 8. Every
// item and the reading passage are the school's own; nothing from the Student Book,
// its song or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U6Assessments: Assessment[] = [
  {
    id: "rh-l3-u6-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["subject / object / reflexive pronouns", "question tags", "indirect questions", "used to", "past simple vs present perfect", "prefixes un- / re-"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "My grandmother taught ___ how to make lanterns.", options: ["we", "us", "our", "ourselves"], answer: "us" },
          { q: "The children made the costumes by ___.", options: ["themselves", "theirselves", "them", "their"], answer: "themselves" },
          { q: "Your father plays the drum, ___?", options: ["isn't he", "doesn't he", "does he", "didn't he"], answer: "doesn't he" },
          { q: "Can you tell me where ___?", options: ["is the market", "the market is", "does the market", "the market"], answer: "the market is" },
          { q: "People ___ wear áo dài every day, but now they wear it on special days.", options: ["use to", "used to", "are used", "have used"], answer: "used to" },
          { q: "We ___ the Hùng Kings' Temple in 2023.", options: ["have visited", "visited", "visit", "were visited"], answer: "visited" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "My uncle (sing) ___ in the village quan họ club since 2005.", answer: "has sung" },
          { q: "The box was (lock) ___, so we could open it easily.", answer: "unlocked" },
          { q: "I made a mistake, so I had to (write) ___ the card.", answer: "rewrite" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Vocabulary",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Me and my sister watched the dragon dance.", answer: "Me → I (My sister and I watched ...)" },
          { q: "Do you know what time does the show start?", answer: "does the show start → the show starts" },
          { q: "She didn't used to like spicy food.", answer: "used → use" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u6-mock",
    title: "End-of-unit mock test (Thanh Xuân format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "pronouns", "question tags", "past passive", "prefixes", "so / such ... that", "reported questions", "-ing subjects and It's worth -ing", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["carved", "performed", "played", "expressed"], answer: "expressed" },
          { q: "stress", options: ["heritage", "popular", "tradition", "region"], answer: "tradition" },
          { q: "stress", options: ["generation", "preservation", "represent", "communicate"], answer: "communicate" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "This kite isn't ___. Mine is the red one.", options: ["my", "mine", "me", "myself"], answer: "mine" },
          { q: "The famous singer ___ in a small village in 1950.", options: ["born", "was born", "is born", "has been born"], answer: "was born" },
          { q: "It was ___ beautiful show that we watched it twice.", options: ["so", "such", "such a", "so a"], answer: "such a" },
          { q: "I'm sorry, I ___ your question. Could you say it again?", options: ["misunderstood", "disunderstood", "ununderstood", "reunderstood"], answer: "misunderstood" },
          { q: "___ traditional games with friends is great fun.", options: ["Play", "Playing", "To playing", "Played"], answer: "Playing" },
          { q: "'Excuse me, do you know where the puppet theatre is?' - '___'", options: ["Yes, I know where.", "It's by Hoàn Kiếm Lake.", "No, it isn't.", "Yes, it is."], answer: "It's by Hoàn Kiếm Lake." },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "These masks were carved by hand, wasn't they?", answer: "wasn't → weren't" },
          { q: "Hạ Long Bay, that is in Quảng Ninh, is famous for its islands.", answer: "that → which" },
          { q: "It's worth to visit the Temple of Literature.", answer: "to visit → visiting" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-3, then answer 4-5 in a few words.",
        passage:
          "Mr. Tâm is seventy-two. He has made water puppets in his village near Hanoi for more than fifty years. He was taught by his father, who learned from his own grandfather. Each puppet is carved from light wood and painted by hand, so making one can take a whole week.\n\nTen years ago, Mr. Tâm was worried. Young people used to watch the shows, but many of them moved to the city. So he started a free summer class for children. Now twenty children come every year, and some of them perform at the village festival. 'Teaching them is the only way to keep our tradition alive,' he says.",
        marksEach: 1,
        items: [
          { q: "1. Mr. Tâm learned to make puppets from his father.", options: ["True", "False"], answer: "True" },
          { q: "2. A puppet can be made in one afternoon.", options: ["True", "False"], answer: "False" },
          { q: "3. The summer class costs a lot of money.", options: ["True", "False"], answer: "False" },
          { q: "4. Why was Mr. Tâm worried ten years ago?", answer: "Because many young people moved to the city (and stopped watching the shows)." },
          { q: "5. How many children come to the class every year?", answer: "Twenty." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same. Begin with the words given.",
        marksEach: 1,
        items: [
          { q: "The story was very funny. Everyone laughed. → It was such ...", answer: "It was such a funny story that everyone laughed." },
          { q: "\"Where do you live?\" the visitor asked me. → The visitor asked me ...", answer: "The visitor asked me where I lived." },
          { q: "It is important to learn about our heritage. → Learning ...", answer: "Learning about our heritage is important." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a tradition in your family or your town. Say what it is, who keeps it alive, and why it is worth preserving.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
];
