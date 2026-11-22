import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 18 (Origami and Art Tools): the printable
// grammar worksheets (three levels each, with answer keys). The school's own writing;
// nothing from the Student Book or Workbook is reproduced.

export const odL2U18Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ how many / how much
  {
    id: "od2e-l2-u18-ws-quantity",
    title: "How many? How much? some, any, a few, a lot of",
    grammar: "How many / How much; some, any, a few, a lot of",
    deckId: "od2e-l2-u18-l3",
    slide: "How many? How much? Some, any, a few, a lot of",
    intro:
      "Use How many with things you can count: How many crayons are there? Use How much with things you can not count: How much glue is there? Use some in a yes sentence and any in a no sentence or a question. A few is a small number. A lot of is plenty.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "How ___ crayons are there?  (many / much)  ->  many",
        items: [
          { q: "How ___ glue is there?", options: ["much", "many"], answer: "much" },
          { q: "How ___ paintbrushes are there?", options: ["many", "much"], answer: "many" },
          { q: "I have ___ paper.", options: ["some", "any"], answer: "some" },
          { q: "I don't have ___ chalk.", options: ["any", "some"], answer: "any" },
          { q: "There are ___ crayons: one, two, three.", options: ["a few", "a lot of"], answer: "a few" },
          { q: "There is ___ water in the sea.", options: ["a lot of", "a few"], answer: "a lot of" },
          { q: "Which is right?", options: ["How many markers are there?", "How much markers are there?"], answer: "How many markers are there?" },
          { q: "Which is right?", options: ["Do you have any glue?", "Do you have a glue?"], answer: "Do you have any glue?" },
        ],
      },
      {
        level: "Core",
        instructions: "Write How many, How much, some, any, a few or a lot of in the gap.",
        example: "___ water is there?  ->  How much",
        items: [
          { q: "___ crayons are there?", answer: "How many" },
          { q: "___ paper is there?", answer: "How much" },
          { q: "There is ___ paint on the table. (yes)", answer: "some" },
          { q: "There isn't ___ glue. (no)", answer: "any" },
          { q: "I have two paintbrushes. I have ___ paintbrushes.", answer: "a few" },
          { q: "Answer the question: Do you have any scissors? (No)", answer: "No, I don't have any scissors." },
          { q: "Correct the mistake: How much crayons are there?", answer: "How many crayons are there?" },
          { q: "Correct the mistake: I don't have some paper.", answer: "I don't have any paper." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence. Use the words in brackets.",
        example: "(How many / chairs / the classroom)  ->  How many chairs are there in the classroom?",
        items: [
          { q: "(How much / water / the bottle)", answer: "How much water is there in the bottle?" },
          { q: "(How many / pencils / your bag)", answer: "How many pencils are there in your bag?" },
          { q: "(some / paper / my desk)", answer: "There is some paper on my desk." },
          { q: "(any / glue / the box)", answer: "There isn't any glue in the box." },
          { q: "(a lot of / markers / the art room)", answer: "There are a lot of markers in the art room." },
          { q: "Write two sentences about your desk: one with a few and one with a lot of.", answer: "There are a few pencils on my desk. There is a lot of paper on my desk." },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ commas in lists
  {
    id: "od2e-l2-u18-ws-commas",
    title: "Commas in lists",
    grammar: "commas in a list of three or more things",
    deckId: "od2e-l2-u18-l4",
    slide: "Commas in lists",
    intro:
      "When we list three or more things, we put a comma after each one and and before the last one: I have glue, chalk and markers. We do not need a comma for only two things: I have glue and chalk.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right sentence. Then read it aloud.",
        example: "Which is right?  (I have glue, chalk and markers. / I have glue chalk and markers.)  ->  I have glue, chalk and markers.",
        items: [
          { q: "Which is right?", options: ["I use glue, scissors and chalk.", "I use glue scissors and chalk."], answer: "I use glue, scissors and chalk." },
          { q: "Which is right?", options: ["She has markers and glue.", "She has, markers and glue."], answer: "She has markers and glue." },
          { q: "Which is right?", options: ["We made a sun, a boat and a crane.", "We made a sun a boat and a crane."], answer: "We made a sun, a boat and a crane." },
          { q: "Where is the comma? I have scissors ___ glue and chalk.", options: ["after scissors", "after chalk"], answer: "after scissors" },
          { q: "Which word goes before the last thing in a list?", options: ["and", "but"], answer: "and" },
          { q: "How many commas? I have glue, chalk, markers and scissors.", options: ["2", "1"], answer: "2" },
          { q: "Which is right?", options: ["He uses markers, watercolours and coloured pencils.", "He uses markers, watercolours, coloured pencils and."], answer: "He uses markers, watercolours and coloured pencils." },
          { q: "Which list needs no comma?", options: ["glue and chalk", "glue, chalk and paint"], answer: "glue and chalk" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the sentence again with commas in the right places.",
        example: "I have glue chalk and markers.  ->  I have glue, chalk and markers.",
        items: [
          { q: "I use scissors glue and paper.", answer: "I use scissors, glue and paper." },
          { q: "She has markers chalk and watercolours.", answer: "She has markers, chalk and watercolours." },
          { q: "We made a collage a mosaic and a mobile.", answer: "We made a collage, a mosaic and a mobile." },
          { q: "My bag has a book a pencil and a ruler.", answer: "My bag has a book, a pencil and a ruler." },
          { q: "He likes red blue and yellow.", answer: "He likes red, blue and yellow." },
          { q: "Join the things in a list: glue / chalk / markers (I have ...)", answer: "I have glue, chalk and markers." },
          { q: "Correct the mistake: I have glue chalk, and markers.", answer: "I have glue, chalk and markers." },
          { q: "Correct the mistake: She has, scissors and glue.", answer: "She has scissors and glue." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence with a list. Use commas and and.",
        example: "(my bag)  ->  My bag has a pencil, a book and a lunch box.",
        items: [
          { q: "Write about art tools. (three tools)", answer: "I use scissors, glue and markers." },
          { q: "Write about your favourite colours. (three colours)", answer: "My favourite colours are red, blue and green." },
          { q: "Write about what you did at school. (three things)", answer: "I painted, I sang and I played at school." },
          { q: "Write about kinds of art. (four kinds)", answer: "We made a collage, a mosaic, a mobile and a sculpture." },
          { q: "Write about your desk. (three things)", answer: "My desk has paper, pencils and glue." },
          { q: "Write two sentences: one list of two things and one list of three things.", answer: "I have glue and chalk. I also have markers, scissors and paper." },
        ],
      },
    ],
  },
];
