// Oxford Discover 2nd edition, Level 1, Unit 3 (Colors All Around): the
// printable grammar worksheet for There is / There are. Three levels with an
// answer key. Everything here is the school's own writing. Answers marked "e.g."
// are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U3Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u03-ws-there",
    title: "There is / There are",
    grammar: "There is / There are",
    deckId: "od2e-l1-u03-l3",
    slide: "There is / There are",
    intro: "One thing? There is. There's a red ball. More than one thing? There are, and the thing gets -s. There are two red balls.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word.",
        example: "There ___ a red hat. (is / are)  ->  is",
        items: [
          { q: "There ___ a blue bag.", options: ["is", "are"], answer: "is" },
          { q: "There ___ two green frogs.", options: ["is", "are"], answer: "are" },
          { q: "There is a yellow ___.", options: ["bird", "birds"], answer: "bird" },
          { q: "There are three black ___.", options: ["cat", "cats"], answer: "cats" },
          { q: "There ___ a white cat. (one)", options: ["is", "are"], answer: "is" },
          { q: "There ___ four pink pencils.", options: ["is", "are"], answer: "are" },
          { q: "There's means:", options: ["There is", "There are"], answer: "There is" },
          { q: "There are two brown ___.", options: ["dog", "dogs"], answer: "dogs" },
        ],
      },
      {
        level: "Core",
        instructions: "Write is or are. Then write the thing the right way.",
        example: "There ___ two red ___. (hat)  ->  are, hats",
        items: [
          { q: "There ___ a purple ball.", answer: "is" },
          { q: "There ___ three orange fish.", answer: "are" },
          { q: "There ___ one brown bear.", answer: "is" },
          { q: "There are two blue ___. (bag)", answer: "bags" },
          { q: "There are five green ___. (pen)", answer: "pens" },
          { q: "Write the short form: There is", answer: "There's" },
          { q: "Fix it: There is two red balls.", answer: "There are two red balls." },
          { q: "Fix it: There are a yellow bird.", answer: "There is a yellow bird. (There's a yellow bird.)" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "One red apple: There is a red apple.",
        items: [
          { q: "Write about one thing in your room. Use There is and a colour.", answer: "e.g. There is a blue bed." },
          { q: "Write about two things in your room. Use There are and a colour.", answer: "e.g. There are two white pillows." },
          { q: "Write one sentence with There's.", answer: "e.g. There's a red bag." },
          { q: "Write about three things with the same colour.", answer: "e.g. There are three green pencils." },
          { q: "Fix the mistake: There are two blue bag.", answer: "There are two blue bags." },
          { q: "Write one sentence about a rainbow.", answer: "e.g. There are seven colours. / There is a red line." },
        ],
      },
    ],
  },
];
