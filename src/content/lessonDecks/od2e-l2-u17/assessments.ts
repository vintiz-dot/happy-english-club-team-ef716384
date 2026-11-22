import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 17 (Shapes in Art): the printable grammar
// worksheet (three levels, with an answer key). The school's own writing; nothing from
// the Student Book or Workbook is reproduced.

export const odL2U17Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u17-ws-lot-any",
    title: "a lot of and any",
    grammar: "There is / There are a lot of ...; There isn't / aren't any ...",
    deckId: "od2e-l2-u17-l3",
    slide: "A lot of / any",
    intro:
      "Use a lot of when there is plenty: There are a lot of stars. There is a lot of glue. Use any when there is none: There aren't any ovals. There isn't any paint. Use are with many things and is with glue, paint and paper.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "There ___ a lot of stars.  (are / is)  ->  are",
        items: [
          { q: "There ___ a lot of glue on the table.", options: ["is", "are"], answer: "is" },
          { q: "There are a lot of ___ in the picture.", options: ["stars", "star"], answer: "stars" },
          { q: "There aren't ___ ovals in my collage.", options: ["any", "a lot"], answer: "any" },
          { q: "There isn't ___ paint.", options: ["any", "some"], answer: "any" },
          { q: "There ___ a lot of paper.", options: ["is", "are"], answer: "is" },
          { q: "There ___ a lot of spirals.", options: ["are", "is"], answer: "are" },
          { q: "Which is right?", options: ["There aren't any stars.", "There aren't a stars."], answer: "There aren't any stars." },
          { q: "Which is right?", options: ["There is a lot of water.", "There are a lot of water."], answer: "There is a lot of water." },
        ],
      },
      {
        level: "Core",
        instructions: "Write is, are, any or a lot of in the gap.",
        example: "There ___ a lot of stars.  ->  are",
        items: [
          { q: "There ___ a lot of glue.", answer: "is" },
          { q: "There ___ a lot of circles.", answer: "are" },
          { q: "There aren't ___ squares in my picture.", answer: "any" },
          { q: "There isn't ___ paper on my desk.", answer: "any" },
          { q: "There are ___ ___ colours in the collage. (plenty)", answer: "a lot of" },
          { q: "Make it negative: There are stars.", answer: "There aren't any stars." },
          { q: "Correct the mistake: There are a lot of glue.", answer: "There is a lot of glue." },
          { q: "Correct the mistake: There isn't any stars.", answer: "There aren't any stars." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence. Use the words in brackets.",
        example: "(paper / a lot of)  ->  There is a lot of paper on the table.",
        items: [
          { q: "(stars / a lot of / my collage)", answer: "There are a lot of stars in my collage." },
          { q: "(glue / a lot of / the table)", answer: "There is a lot of glue on the table." },
          { q: "(ovals / any / my picture)", answer: "There aren't any ovals in my picture." },
          { q: "(paint / any / the pot)", answer: "There isn't any paint in the pot." },
          { q: "Write a question with any. (spirals / the collage)", answer: "Are there any spirals in the collage?" },
          { q: "Write two sentences about your bedroom: one with a lot of and one with any.", answer: "There are a lot of books in my bedroom. There aren't any cats in my bedroom." },
        ],
      },
    ],
  },
];
