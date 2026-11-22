// Oxford Discover 2nd edition, Level 1, Unit 5 (Animal Homes): the printable
// grammar worksheets for Where is / Where are (Lesson 3) and for more than one
// (Lesson 4). Three levels each, with an answer key. Everything here is the
// school's own writing. Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U5Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u05-ws-where",
    title: "Where is ... ? Where are ... ?",
    grammar: "Where is ... ? Where are ... ?",
    deckId: "od2e-l1-u05-l3",
    slide: "Where is ... ? Where are ... ?",
    intro: "One thing? Where is the nest? It's in the tree. More than one? Where are the frogs? They're in the pond.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "Where ___ the nest? (is / are)  ->  is",
        items: [
          { q: "Where ___ the bird? (one)", options: ["is", "are"], answer: "is" },
          { q: "Where ___ the frogs? (two)", options: ["is", "are"], answer: "are" },
          { q: "Where is the hive? ___ in the tree.", options: ["It's", "They're"], answer: "It's" },
          { q: "Where are the mice? ___ in the field.", options: ["It's", "They're"], answer: "They're" },
          { q: "Where ___ the squirrel? (one)", options: ["is", "are"], answer: "is" },
          { q: "Where ___ the crabs? (more than one)", options: ["is", "are"], answer: "are" },
          { q: "Where's means:", options: ["Where is", "Where are"], answer: "Where is" },
          { q: "They're means:", options: ["They are", "It is"], answer: "They are" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words.",
        example: "Where ___ the eagle? ___ in the nest.  ->  is, It's",
        items: [
          { q: "Where ___ the opossum?", answer: "is" },
          { q: "Where ___ the honeybees?", answer: "are" },
          { q: "Where is the chick? ___ in the nest.", answer: "It's" },
          { q: "Where are the frogs? ___ in the pond.", answer: "They're" },
          { q: "Write the short form: Where is", answer: "Where's" },
          { q: "Write the answer: Where's the squirrel? (in the tree)", answer: "It's in the tree." },
          { q: "Write the answer: Where are the mice? (under the wood)", answer: "They're under the wood." },
          { q: "Fix it: Where are the nest?", answer: "Where is the nest? (Where's the nest?)" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence or one question.",
        example: "Where's the cat? It's under the bed.",
        items: [
          { q: "Write a question about one animal. Use Where's.", answer: "e.g. Where's the frog?" },
          { q: "Write a question about two animals. Use Where are.", answer: "e.g. Where are the birds?" },
          { q: "Answer: Where's your bag? Use in, on, under or next to.", answer: "e.g. It's next to my desk." },
          { q: "Answer: Where are your shoes?", answer: "e.g. They're under my bed." },
          { q: "Fix the mistake: Where's the frogs?", answer: "Where are the frogs?" },
          { q: "Write one question and its answer about an animal home.", answer: "e.g. Where's the bee? It's in the hive." },
        ],
      },
    ],
  },
  {
    id: "od2e-l1-u05-ws-plurals",
    title: "More than one: -s, -es, mice, fish",
    grammar: "plural nouns: -s, -es, special words",
    deckId: "od2e-l1-u05-l4",
    slide: "More than one: -s, -es, and special words",
    intro: "Most animals add -s: frog, frogs. Fox adds -es: foxes. Mouse changes: mice. Fish stays the same: one fish, two fish.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "two ___ (frog)  (frogs / frogses)  ->  frogs",
        items: [
          { q: "two ___ (frog)", options: ["frogs", "froges"], answer: "frogs" },
          { q: "two ___ (fox)", options: ["foxs", "foxes"], answer: "foxes" },
          { q: "two ___ (mouse)", options: ["mouses", "mice"], answer: "mice" },
          { q: "two ___ (fish)", options: ["fish", "fishes"], answer: "fish" },
          { q: "three ___ (nest)", options: ["nests", "nest"], answer: "nests" },
          { q: "one ___ (squirrel)", options: ["squirrel", "squirrels"], answer: "squirrel" },
          { q: "four ___ (eagle)", options: ["eagles", "eagle"], answer: "eagles" },
          { q: "one mouse, two ___", options: ["mice", "mouses"], answer: "mice" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the word for more than one.",
        example: "pond -> ponds",
        items: [
          { q: "bird", answer: "birds" },
          { q: "crab", answer: "crabs" },
          { q: "fox", answer: "foxes" },
          { q: "mouse", answer: "mice" },
          { q: "fish", answer: "fish" },
          { q: "hive", answer: "hives" },
          { q: "Fix it: Two mouses live in the field.", answer: "Two mice live in the field." },
          { q: "Fix it: Three foxs live in the woods.", answer: "Three foxes live in the woods." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "Two frogs live in the pond.",
        items: [
          { q: "Write a sentence with two mice.", answer: "e.g. Two mice live in the field." },
          { q: "Write a sentence with two foxes.", answer: "e.g. Two foxes live in the woods." },
          { q: "Write a sentence with three fish.", answer: "e.g. Three fish live in the pond." },
          { q: "Write a warning with Watch out!", answer: "e.g. Watch out! The fox!" },
          { q: "Fix the mistake: Two fishes live in the pond. (Which word does not change?)", answer: "Two fish live in the pond." },
          { q: "Write a sentence with an animal that adds -s.", answer: "e.g. Three frogs live in the pond." },
        ],
      },
    ],
  },
];
