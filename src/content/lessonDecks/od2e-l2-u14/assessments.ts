import type { Worksheet } from "@/lib/lessonDecks/types";

// Oxford Discover 2nd edition, Level 2, Unit 14 (Music and Feelings, Olga's Flute): the
// printable grammar worksheets (three levels each, with answer keys). The school's own
// writing; nothing from the Student Book or Workbook is reproduced.

export const odL2U14Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ time words
  {
    id: "od2e-l2-u14-ws-time",
    title: "Time words: yesterday, last night, this morning",
    grammar: "time words with a verb ending -ed",
    deckId: "od2e-l2-u14-l3",
    slide: "Time words: when did it happen?",
    intro:
      "Yesterday and last night are in the past, so the verb ends in -ed: I played the drum yesterday. This morning can be past too. Ask: Did you practise? Answer: Yes, I did. / No, I didn't.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "Yesterday, I ___ the drum.  (played / play)  ->  played",
        items: [
          { q: "Last night, I ___ to music.", options: ["listened", "listen"], answer: "listened" },
          { q: "Yesterday, we ___ a song.", options: ["sang", "sing"], answer: "sang" },
          { q: "She ___ the piano yesterday morning.", options: ["played", "plays"], answer: "played" },
          { q: "Which time word is past?", options: ["yesterday", "tomorrow"], answer: "yesterday" },
          { q: "___ you practise last night?", options: ["Did", "Do"], answer: "Did" },
          { q: "Did you play yesterday? Yes, I ___.", options: ["did", "do"], answer: "did" },
          { q: "He ___ his flute last night.", options: ["practised", "practise"], answer: "practised" },
          { q: "Which is right?", options: ["Yesterday, I played the drum.", "Yesterday, I play the drum."], answer: "Yesterday, I played the drum." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the verb in the past. Use the verb in brackets.",
        example: "Yesterday, I ___ the drum. (play)  ->  played",
        items: [
          { q: "Last night, she ___ to a song. (listen)", answer: "listened" },
          { q: "Yesterday morning, we ___ the piano. (play)", answer: "played" },
          { q: "He ___ the trumpet yesterday afternoon. (practise)", answer: "practised" },
          { q: "Yesterday, I ___ my friends. (call)", answer: "called" },
          { q: "___ you play the flute yesterday? (Do / Did)", answer: "Did" },
          { q: "Answer the question: Did you listen to music last night? (Yes)", answer: "Yes, I did." },
          { q: "Correct the mistake: Yesterday, I play the drum.", answer: "Yesterday, I played the drum." },
          { q: "Correct the mistake: Last night, he listen to a song.", answer: "Last night, he listened to a song." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence. Use the time word in brackets and a verb in the past.",
        example: "(last night)  ->  Last night, I listened to my favourite song.",
        items: [
          { q: "Write about your morning. (this morning)", answer: "This morning, I played with my brother." },
          { q: "Write about music. (yesterday afternoon)", answer: "Yesterday afternoon, I listened to a song." },
          { q: "Write about your friend. (last night)", answer: "Last night, my friend practised the piano." },
          { q: "Write a question with Did. (you / play)", answer: "Did you play the drum yesterday?" },
          { q: "Write a short answer with No. (Did you practise last night?)", answer: "No, I didn't." },
          { q: "Write two sentences about yesterday: one with yesterday morning and one with last night.", answer: "Yesterday morning, I played football. Last night, I listened to music." },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ and / but
  {
    id: "od2e-l2-u14-ws-and-but",
    title: "and and but",
    grammar: "and (the same) / but (different)",
    deckId: "od2e-l2-u14-l4",
    slide: "And and but: put two ideas together",
    intro:
      "Use and to join two ideas that go together: I play the drum and I sing. Use but when the second idea is different: I like the drum, but I don't like the trumpet.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle and or but. Then read the sentence aloud.",
        example: "I like cats ___ I like dogs.  (and / but)  ->  and",
        items: [
          { q: "I sing ___ I dance.", options: ["and", "but"], answer: "and" },
          { q: "I like the drum, ___ I don't like the trumpet.", options: ["but", "and"], answer: "but" },
          { q: "She plays the piano ___ the flute.", options: ["and", "but"], answer: "and" },
          { q: "He is happy, ___ she is sleepy.", options: ["but", "and"], answer: "but" },
          { q: "We clap ___ we sing.", options: ["and", "but"], answer: "and" },
          { q: "The song is fast, ___ the dance is slow.", options: ["but", "and"], answer: "but" },
          { q: "I have a drum ___ a flute.", options: ["and", "but"], answer: "and" },
          { q: "Which is right?", options: ["I like music, but I don't like loud songs.", "I like music, and I don't like loud songs."], answer: "I like music, but I don't like loud songs." },
        ],
      },
      {
        level: "Core",
        instructions: "Write and or but in the gap.",
        example: "I like pizza, ___ I don't like fish.  ->  but",
        items: [
          { q: "The singer smiles ___ waves to the fans.", answer: "and" },
          { q: "I like the piano, ___ I don't like the violin.", answer: "but" },
          { q: "He plays the drum ___ she plays the flute.", answer: "and" },
          { q: "I am nervous, ___ I play my solo.", answer: "but" },
          { q: "She is proud ___ happy.", answer: "and" },
          { q: "Join the two sentences with and: I sing. I clap.", answer: "I sing and I clap." },
          { q: "Join the two sentences with but: I like football. I don't like tennis.", answer: "I like football, but I don't like tennis." },
          { q: "Correct the mistake: I like tea, and I don't like milk.", answer: "I like tea, but I don't like milk." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a whole sentence with the word in brackets.",
        example: "(but)  ->  I like the drum, but I don't like the trumpet.",
        items: [
          { q: "Write about a popstar. (and)", answer: "The popstar gives a concert and signs an autograph." },
          { q: "Write about music you like and dislike. (but)", answer: "I like slow music, but I don't like loud music." },
          { q: "Write about two friends. (and)", answer: "Anna sings and Ben plays the piano." },
          { q: "Write about two feelings. (but)", answer: "I am nervous, but I am also excited." },
          { q: "Write about what you do after school. (and)", answer: "I do my homework and I play the drum." },
          { q: "Write two sentences about two kinds of music: one with and and one with but.", answer: "Pop and rock are loud. Pop is fast, but classical music is slow." },
        ],
      },
    ],
  },
];
