import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 1, Unit 15 (Shake, Strike and Play): the printable
// grammar worksheet for the present continuous (I'm playing, she's shaking). Level 1
// children are 6-7, so items are very short: circle the word, finish one word, write
// one sentence. Everything is the school's own writing. Answers marked "e.g." are model
// answers for open items.

export const odL1U15Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u15-ws-playing",
    title: "What are you playing?",
    grammar: "am / is / are + verb-ing",
    deckId: "od2e-l1-u15-l3",
    slide: "I'm playing, you're playing, he's playing",
    intro: "We use am, is or are and a verb ending in -ing to say what is happening now: I'm playing. She's shaking it. They're clapping. For no, add not: I'm not striking.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "I ___ playing the drum.  (am / is)  ->  am",
        items: [
          { q: "I ___ shaking the tambourine.", options: ["am", "is"], answer: "am" },
          { q: "She ___ playing the drum.", options: ["is", "are"], answer: "is" },
          { q: "They ___ clapping.", options: ["is", "are"], answer: "are" },
          { q: "You ___ striking the triangle.", options: ["are", "am"], answer: "are" },
          { q: "He's ___ the xylophone.", options: ["playing", "play"], answer: "playing" },
          { q: "We're ___ the cymbals.", options: ["striking", "strike"], answer: "striking" },
          { q: "Ollie is ___ the tambourine.", options: ["shaking", "shake"], answer: "shaking" },
          { q: "Which sentence is right?", options: ["Rosie is playing.", "Rosie playing."], answer: "Rosie is playing." },
        ],
      },
      {
        level: "Core",
        instructions: "Write am, is or are.",
        example: "She ___ shaking it.  ->  is",
        items: [
          { q: "I ___ playing the drum.", answer: "am" },
          { q: "Ollie ___ striking the triangle.", answer: "is" },
          { q: "We ___ shaking the tambourines.", answer: "are" },
          { q: "You ___ clapping.", answer: "are" },
          { q: "They ___ playing the cymbals.", answer: "are" },
          { q: "Rosie ___ shaking the tambourine.", answer: "is" },
          { q: "I ___ not striking the drum. (I shake it.)", answer: "am" },
          { q: "He ___ not clapping. (He plays.)", answer: "is" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "Ollie / drum  ->  Ollie is playing the drum.",
        items: [
          { q: "Write what you are playing in a band.", answer: "e.g. I'm playing the drum." },
          { q: "Write what Rosie is shaking.", answer: "e.g. Rosie is shaking the tambourine." },
          { q: "Write what we are doing. Use clapping.", answer: "e.g. We're clapping." },
          { q: "Write what they are striking.", answer: "e.g. They're striking the cymbals." },
          { q: "Write one sentence with not.", answer: "e.g. I'm not playing the triangle." },
          { q: "Write what your friend is playing.", answer: "e.g. My friend is playing the xylophone." },
        ],
      },
    ],
  },
];
