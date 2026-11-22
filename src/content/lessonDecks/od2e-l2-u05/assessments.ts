// Oxford Discover 2nd edition, Level 2, Unit 5 (Then and Now): the printable grammar
// worksheet for the simple past with regular verbs, in three levels with an answer key.
// Everything here is the school's own writing; nothing from the Student Book or Workbook
// is reproduced. Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U05Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u05-ws-past-ed",
    title: "What happened? verb + -ed and didn't",
    grammar: "simple past: regular verbs, didn't",
    deckId: "od2e-l2-u05-l3",
    slide: "Simple past with regular verbs: what happened",
    intro:
      "For things that finished, add -ed to most verbs: listen -> listened, play -> played. If the verb ends in e, add only d: live -> lived. For no, use didn't and the plain verb: I didn't watch TV. Not: I didn't watched.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the sentence aloud.",
        example: "Yesterday I ___ to the radio. (listen / listened)  ->  listened",
        items: [
          { q: "Long ago, people ___ by horse.", options: ["travel", "travelled"], answer: "travelled" },
          { q: "Yesterday I ___ with my friend.", options: ["played", "play"], answer: "played" },
          { q: "She ___ a letter to her friend.", options: ["wanted", "want"], answer: "wanted" },
          { q: "They ___ in a small house long ago.", options: ["lived", "liveed"], answer: "lived" },
          { q: "He didn't ___ the radio.", options: ["listen", "listened"], answer: "listen" },
          { q: "We didn't ___ by airplane.", options: ["travel", "travelled"], answer: "travel" },
          { q: "Which sentence is correct?", options: ["I didn't watch TV.", "I didn't watched TV."], answer: "I didn't watch TV." },
          { q: "Which word means a finished time?", options: ["yesterday", "tomorrow"], answer: "yesterday" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the verb in the past. For the didn't sentences, write the plain verb.",
        example: "Yesterday we (walk) ___ to school.  ->  walked",
        items: [
          { q: "Long ago, people (listen) ___ to the radio.", answer: "listened" },
          { q: "My grandpa (live) ___ in a small town.", answer: "lived" },
          { q: "We (visit) ___ my aunt last night.", answer: "visited" },
          { q: "They (travel) ___ by boat.", answer: "travelled" },
          { q: "She didn't (watch) ___ TV.", answer: "watch" },
          { q: "I didn't (text) ___ my friend.", answer: "text" },
          { q: "Make it no: They travelled by plane. (Use didn't.)", answer: "They didn't travel by plane." },
          { q: "Correct the mistake: He didn't called me.", answer: "He didn't call me." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Use -ed or didn't, and check the verb.",
        example: "(my grandpa, listen, radio)  ->  My grandpa listened to the radio.",
        items: [
          { q: "(long ago, people, travel, horse)", answer: "e.g. Long ago, people travelled by horse." },
          { q: "(yesterday, I, play, my friend)", answer: "e.g. Yesterday I played with my friend." },
          { q: "(long ago, people, not use, e-mail) with didn't", answer: "e.g. Long ago, people didn't use e-mail." },
          { q: "(my family, not watch, TV, last night) with didn't", answer: "e.g. My family didn't watch TV last night." },
          { q: "Write one true sentence about yesterday with -ed.", answer: "e.g. I walked to school yesterday." },
          { q: "Write one sentence with but: (long ago, people, walk) (now, people, drive)", answer: "e.g. Long ago, people walked, but now they drive." },
        ],
      },
    ],
  },
];
