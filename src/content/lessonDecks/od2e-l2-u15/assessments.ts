import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 15 (Forces and Movement): the printable
// grammar worksheet (three levels, with an answer key). The school's own writing;
// nothing from the Student Book or Workbook is reproduced.

export const odL2U15Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u15-ws-comparatives",
    title: "Comparing: -er and -ier than",
    grammar: "comparative adjectives with -er / -ier than",
    deckId: "od2e-l2-u15-l3",
    slide: "Comparative adjectives: -er and -ier",
    intro:
      "To compare two things, add -er and than: A jet is faster than a train. If the word ends in y, change y to ier: heavy, heavier. If it is short with one vowel and one letter, double the letter: big, bigger.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "A jet is ___ than a train.  (fast / faster)  ->  faster",
        items: [
          { q: "A truck is ___ than a bike.", options: ["heavier", "heavy"], answer: "heavier" },
          { q: "An elephant is ___ than a mouse.", options: ["bigger", "big"], answer: "bigger" },
          { q: "A feather is ___ than a stone.", options: ["lighter", "light"], answer: "lighter" },
          { q: "A snail is ___ than a rabbit.", options: ["slower", "slow"], answer: "slower" },
          { q: "A cheetah is faster ___ a horse.", options: ["than", "then"], answer: "than" },
          { q: "A mouse is ___ than a cat.", options: ["smaller", "small"], answer: "smaller" },
          { q: "Which is right?", options: ["A car is faster than a bike.", "A car is more fast than a bike."], answer: "A car is faster than a bike." },
          { q: "Which is right?", options: ["Is a bus heavier than a car? Yes, it is.", "Is a bus heavy than a car? Yes, it is."], answer: "Is a bus heavier than a car? Yes, it is." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the comparing word. Use the word in brackets.",
        example: "A bus is ___ than a bike. (big)  ->  bigger",
        items: [
          { q: "A plane is ___ than a car. (fast)", answer: "faster" },
          { q: "A stone is ___ than a leaf. (heavy)", answer: "heavier" },
          { q: "A mouse is ___ than a dog. (small)", answer: "smaller" },
          { q: "A turtle is ___ than a rabbit. (slow)", answer: "slower" },
          { q: "A balloon is ___ than a book. (light)", answer: "lighter" },
          { q: "Answer the question: Is a snail faster than a rabbit? (No)", answer: "No, it isn't." },
          { q: "Correct the mistake: A truck is heavy than a bike.", answer: "A truck is heavier than a bike." },
          { q: "Correct the mistake: A mouse is small then a cat.", answer: "A mouse is smaller than a cat." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence with -er or -ier and than.",
        example: "(a cheetah / a snail, fast)  ->  A cheetah is faster than a snail.",
        items: [
          { q: "(an elephant / a dog, big)", answer: "An elephant is bigger than a dog." },
          { q: "(a rock / a feather, heavy)", answer: "A rock is heavier than a feather." },
          { q: "(a bike / a car, slow)", answer: "A bike is slower than a car." },
          { q: "Write a question about two animals. (Is ... -er than ...?)", answer: "Is a horse faster than a cat?" },
          { q: "Write a true sentence about you and a friend. (taller / shorter)", answer: "I am taller than my friend." },
          { q: "Write two sentences that compare three things: a bike, a car and a plane.", answer: "A car is faster than a bike. A plane is faster than a car." },
        ],
      },
    ],
  },
];
