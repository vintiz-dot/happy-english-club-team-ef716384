import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 18 (The Gingerbread Man): the printable
// grammar worksheet for should and shouldn't. Level 1 children are 6-7, so items are
// very short: circle the word, finish one word, write one sentence. Everything is the
// school's own writing. Answers marked "e.g." are model answers for open items.

export const odL1U18Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u18-ws-should",
    title: "should and shouldn't",
    grammar: "should / shouldn't",
    deckId: "od2e-l1-u18-l3",
    slide: "Should and shouldn't",
    intro: "Use should for good advice: You should go to bed early. Use shouldn't for advice not to do something: He shouldn't talk to the fox. After should, use the plain verb: should run, never should runs.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "You ___ go to bed early.  (should / shouldn't)  ->  should",
        items: [
          { q: "You ___ eat healthy food.", options: ["should", "shouldn't"], answer: "should" },
          { q: "He ___ talk to the fox.", options: ["should", "shouldn't"], answer: "shouldn't" },
          { q: "We ___ play outside.", options: ["should", "shouldn't"], answer: "should" },
          { q: "You ___ eat junk food every day.", options: ["should", "shouldn't"], answer: "shouldn't" },
          { q: "She should ___ the door.", options: ["close", "closes"], answer: "close" },
          { q: "He shouldn't ___ away from the fox.", options: ["stay", "stays"], answer: "stay" },
          { q: "It is late. I ___ go to bed.", options: ["should", "shouldn't"], answer: "should" },
          { q: "Which sentence is right?", options: ["He should stop.", "He should stops."], answer: "He should stop." },
        ],
      },
      {
        level: "Core",
        instructions: "Write should or shouldn't.",
        example: "You ___ eat junk food every day.  ->  shouldn't",
        items: [
          { q: "We ___ take care of our pets.", answer: "should" },
          { q: "He ___ cross the river alone.", answer: "shouldn't" },
          { q: "You ___ go to bed late.", answer: "shouldn't" },
          { q: "She ___ drink water.", answer: "should" },
          { q: "They ___ play outside.", answer: "should" },
          { q: "I ___ eat junk food every day.", answer: "shouldn't" },
          { q: "A plant ___ have water.", answer: "should" },
          { q: "The cookie ___ run to the fox.", answer: "shouldn't" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence with should or shouldn't.",
        example: "Advice for a friend: go to bed early  ->  You should go to bed early.",
        items: [
          { q: "Write advice for the gingerbread man. Use should.", answer: "e.g. He should run home." },
          { q: "Write advice for the gingerbread man. Use shouldn't.", answer: "e.g. He shouldn't talk to the fox." },
          { q: "Write one thing you should do every day.", answer: "e.g. I should eat healthy food." },
          { q: "Write one thing you shouldn't do.", answer: "e.g. I shouldn't eat junk food every day." },
          { q: "Write advice for a friend with a pet.", answer: "e.g. You should give your pet water." },
          { q: "Write advice for a friend at school.", answer: "e.g. You shouldn't run in the classroom." },
        ],
      },
    ],
  },
];
