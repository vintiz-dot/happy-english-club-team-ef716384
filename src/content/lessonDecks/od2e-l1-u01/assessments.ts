// Oxford Discover 2nd edition, Level 1, Unit 1 (Families and Friends): the
// printable grammar worksheet for I'm / he's / she's and is / are. Three levels
// with an answer key. Everything here is the school's own writing. Answers marked
// "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL1U1Worksheets: Worksheet[] = [
  {
    id: "od2e-l1-u01-ws-be",
    title: "I'm, he's, she's, is and are",
    grammar: "I'm / he's / she's, is / are",
    deckId: "od2e-l1-u01-l3",
    slide: "Be: I'm, he's, she's, is, are (SB 13 D)",
    intro: "I'm = I am. He's = he is. She's = she is. One thing: is. More than one: are. My family is big. My friends are kind.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Read the sentence aloud.",
        example: "I ___ six.  (am / is)  ->  am",
        items: [
          { q: "I'm ___ years old. (six / sixes)", options: ["six", "sixes"], answer: "six" },
          { q: "She ___ my sister.", options: ["is", "are"], answer: "is" },
          { q: "My friends ___ kind.", options: ["is", "are"], answer: "are" },
          { q: "___ my brother. He's seven.", options: ["This is", "These is"], answer: "This is" },
          { q: "My family ___ big.", options: ["is", "are"], answer: "is" },
          { q: "___ a boy. He's my cousin.", options: ["He's", "She's"], answer: "He's" },
          { q: "___ a girl. She's my aunt.", options: ["He's", "She's"], answer: "She's" },
          { q: "I ___ happy.", options: ["am", "are"], answer: "am" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word: am, is or are.",
        example: "My friends ___ funny.  ->  are",
        items: [
          { q: "I ___ seven.", answer: "am" },
          { q: "My mother ___ kind.", answer: "is" },
          { q: "My brothers ___ big.", answer: "are" },
          { q: "She ___ my aunt.", answer: "is" },
          { q: "My family ___ small.", answer: "is" },
          { q: "Write the short form: I am", answer: "I'm" },
          { q: "Write the short form: she is", answer: "she's" },
          { q: "Write the short form: he is", answer: "he's" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence.",
        example: "Say who he is: He's my father.",
        items: [
          { q: "Write how old you are.", answer: "e.g. I'm seven." },
          { q: "Write about your mother or father. Use She's or He's.", answer: "e.g. She's kind." },
          { q: "Write about your family. Use is.", answer: "e.g. My family is big." },
          { q: "Write about your friends. Use are.", answer: "e.g. My friends are funny." },
          { q: "Fix the mistake: My friends is kind.", answer: "My friends are kind." },
          { q: "Fix the mistake: She are my sister.", answer: "She is my sister. (She's my sister.)" },
        ],
      },
    ],
  },
];
