// Oxford Discover 2nd edition, Level 3, Unit 1 (Festivals and Fun): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: -ed adjectives tell how a
// person feels, -ing adjectives tell what a thing, place or event is like; a
// fact can be checked and an opinion tells what someone thinks; time words go
// with the past simple (yesterday, last night, on Saturday, at 10:00). This
// unit's test sits after Lesson 5 (Grammar Champions); Unit 1 is the first of the pair 1-2.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U1Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ -ed / -ing
  {
    id: "od2e-l3-u01-ws-ed-ing",
    title: "Excited or exciting? Adjectives with -ed and -ing",
    grammar: "adjectives with -ed and -ing",
    deckId: "od2e-l3-u01-l3",
    slide: "Excited or exciting? Adjectives with -ed and -ing",
    intro:
      "-ED tells how a person feels (I am excited). -ING tells what a thing, a place or an event is like (The race is exciting). Ask yourself: is the word about a feeling, or about the thing that gives the feeling?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the whole sentence aloud.",
        example: "The fair is ___. (excited / exciting)  ->  exciting",
        items: [
          { q: "The fair is ___.", options: ["excited", "exciting"], answer: "exciting" },
          { q: "I am ___ about the race.", options: ["excited", "exciting"], answer: "excited" },
          { q: "The long speech was ___.", options: ["bored", "boring"], answer: "boring" },
          { q: "My cousin felt ___ after the big party.", options: ["tired", "tiring"], answer: "tired" },
          { q: "The folk dance is very ___.", options: ["interested", "interesting"], answer: "interesting" },
          { q: "We were ___ when our team won.", options: ["amazed", "amazing"], answer: "amazed" },
          { q: "Which sentence is correct?", options: ["I am boring at the fair.", "I am bored at the fair."], answer: "I am bored at the fair." },
          { q: "Which sentence is correct?", options: ["The match was excited.", "The match was exciting."], answer: "The match was exciting." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the correct form of the word in brackets. For the last four questions, write the whole sentence.",
        example: "The festival was ___. (amaze)  ->  amazing",
        items: [
          { q: "The festival was ___. (amaze)", answer: "amazing" },
          { q: "I was ___ in the folk dance. (interest)", answer: "interested" },
          { q: "The race made everybody ___. (tire)", answer: "tired" },
          { q: "A day at the fair is never ___. (bore)", answer: "boring" },
          { q: "Write one sentence about a wedding with an -ing adjective.", answer: "e.g. The wedding was amazing." },
          { q: "Make one sentence about how you feel after a party: tire (-ed).", answer: "e.g. I felt tired after the party." },
          { q: "Correct the mistake: I am interesting in football.", answer: "I am interested in football." },
          { q: "Correct the mistake: The game was very excited.", answer: "The game was very exciting." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Is the word about a feeling or about a thing? Check every ending.",
        example: "The film is bore, so I am bored.  ->  The film is boring, so I am bored.",
        items: [
          { q: "Write one sentence with both excited and exciting about a day at a fair.", answer: "e.g. The fair was exciting, so I was excited all day." },
          {
            q: "Find and fix three mistakes: 'The match was amazed. We were exciting about it. My little brother was boring in the car.'",
            answer: "The match was amazing. We were excited about it. My little brother was bored in the car.",
          },
          { q: "Explain the difference: 'My brother is boring.' and 'My brother is bored.'", answer: "e.g. The first means my brother makes other people bored. The second means he feels bored." },
          { q: "Write two sentences about a family reunion: one with an -ed adjective and one with an -ing adjective.", answer: "e.g. I was excited when my cousins arrived. The reunion was exciting." },
          { q: "Name one pair of -ed and -ing adjectives that are not in this worksheet and use both in a sentence.", answer: "e.g. The story was surprising, so I was surprised. / The music was relaxing, so I felt relaxed." },
          { q: "Ask a friend how they felt at the last festival. Write the question and an answer with an -ed adjective.", answer: "e.g. How did you feel at the festival? I felt amazed." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ time words
  {
    id: "od2e-l3-u01-ws-time-words",
    title: "Time words and the past simple",
    grammar: "time words with the past simple",
    deckId: "od2e-l3-u01-l4",
    slide: "Time words and the past simple",
    intro:
      "A time word tells WHEN something happened (yesterday, last night, on Saturday, at 10:00). When the action is finished, the verb must be in the past too (went, ate, cleaned). Use on with a day, at with a clock time, in with a part of the day; there is no preposition before yesterday or last.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the whole sentence aloud.",
        example: "I ___ to the fair yesterday. (go / went)  ->  went",
        items: [
          { q: "I ___ to the fair yesterday.", options: ["go", "went"], answer: "went" },
          { q: "We played football ___ Saturday.", options: ["on", "at", "in"], answer: "on" },
          { q: "She called her grandmother ___ 8:00 last night.", options: ["on", "at", "in"], answer: "at" },
          { q: "They cleaned the room ___ the morning.", options: ["on", "at", "in"], answer: "in" },
          { q: "He ___ a big cake at the wedding.", options: ["eats", "ate", "eating"], answer: "ate" },
          { q: "My family had a party ___.", options: ["last weekend", "in last weekend"], answer: "last weekend" },
          { q: "Which sentence is correct?", options: ["I watch the race yesterday.", "I watched the race yesterday."], answer: "I watched the race yesterday." },
          { q: "Which sentence is correct?", options: ["We danced on Sunday afternoon.", "We dance on Sunday afternoon."], answer: "We danced on Sunday afternoon." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the verb in the past simple. For the last four questions, write the whole sentence.",
        example: "We ___ the festival last night. (enjoy)  ->  enjoyed",
        items: [
          { q: "We ___ the festival last night. (enjoy)", answer: "enjoyed" },
          { q: "My cousin ___ to my house on Saturday. (come)", answer: "came" },
          { q: "They ___ for the test at 10:00 last night. (study)", answer: "studied" },
          { q: "I ___ my grandparents this morning. (call)", answer: "called" },
          { q: "Put the words in order: yesterday / We / the / fair / visited", answer: "We visited the fair yesterday." },
          { q: "Put the words in order: Saturday / my team / won / on / the race", answer: "My team won the race on Saturday." },
          { q: "Correct the mistake: I go to the park last Sunday.", answer: "I went to the park last Sunday." },
          { q: "Correct the mistake: We played football in yesterday.", answer: "We played football yesterday." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the time word, the preposition and the verb every time.",
        example: "I (watch) the race at 3:00.  ->  I watched the race at 3:00.",
        items: [
          { q: "Write three sentences about your last weekend. Use a different time word in each.", answer: "e.g. On Saturday, I played football. In the afternoon, I watched a film. Last night, I read a book." },
          {
            q: "Find and fix three mistakes: 'We have a family reunion on last Sunday. My uncle come at 9:00. We eated a lot.'",
            answer: "We had a family reunion last Sunday. My uncle came at 9:00. We ate a lot.",
          },
          { q: "Rewrite with a time word at the start: 'We ate noodles at the fair.' (use yesterday)", answer: "Yesterday, we ate noodles at the fair." },
          { q: "Explain why 'on yesterday' and 'in last night' are wrong.", answer: "e.g. Yesterday and last night are already time words by themselves, so we do not add on or in." },
          { q: "Write a short timeline paragraph (3 sentences) about an event you enjoyed, with time words.", answer: "e.g. Last Saturday, I went to a fair. At 10:00, I played a game and won a prize. After lunch, my family and I watched a dance show." },
          { q: "Ask a friend three questions about a past event. Write the questions.", answer: "e.g. What did you do on Saturday? Who did you go with? How did you feel at the end?" },
        ],
      },
    ],
  },
];

export const odL3U1Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u01-check",
    title: "Quick check: festival words, -ed and -ing, time words",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 1 festival and sports words", "adjectives with -ed and -ing", "time words with the past simple"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A party when many people from one family meet again. Which two words?", answer: "family reunion" },
          { q: "An outdoor event with games, rides and food stalls. Which word?", answer: "fair" },
          { q: "The number of points in a game. Which word?", answer: "score" },
          { q: "A contest to see who is the fastest. Which word?", answer: "race" },
        ],
      },
      {
        title: "Grammar: -ed, -ing and time words",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. One word where it does not ask for a sentence.",
        marksEach: 1,
        items: [
          { q: "The race was ___ . (excited / exciting)", answer: "exciting" },
          { q: "I felt ___ after the long walk. (tired / tiring)", answer: "tired" },
          { q: "Correct the mistake: I am interesting in folk dances.", answer: "I am interested in folk dances." },
          { q: "Write the verb in the past: 'We (go) to the fair on Saturday.'", answer: "went" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u01-test",
    title: "Unit 1 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 festival and sports words",
      "Identify facts and opinions",
      "Adjectives with -ed and -ing",
      "Time words with the past simple",
      "Reading: a short text about a kite fair",
      "Writing: an event I enjoyed",
      "Speaking: how people have fun",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A ___ is a special time when many people celebrate together with music and food.", options: ["winner", "score", "festival", "player"], answer: "festival" },
          { q: "My whole family came to the ___, and I met my cousins again.", options: ["family reunion", "race", "score", "team"], answer: "family reunion" },
          { q: "The two people got married at a ___.", options: ["score", "race", "fair", "wedding"], answer: "wedding" },
          { q: "At the ___, we played games and ate noodles from the stalls.", options: ["wedding", "fair", "team", "winner"], answer: "fair" },
          { q: "A ___ is a traditional dance from a place.", options: ["score", "race", "folk dance", "team"], answer: "folk dance" },
          { q: "Our ___ has eleven players.", options: ["team", "festival", "wedding", "race"], answer: "team" },
          { q: "The ___ ran faster than everybody and got the gold medal.", options: ["wedding", "winner", "fair", "score"], answer: "winner" },
          { q: "The ___ is three to two, so our team is winning.", options: ["wedding", "festival", "race", "score"], answer: "score" },
          { q: "Every ___ on the team practices on Tuesdays.", options: ["fair", "festival", "player", "wedding"], answer: "player" },
          { q: "Which word means 'something you can check to see if it is true'?", options: ["opinion", "fact", "guess", "wish"], answer: "fact" },
        ],
      },
      {
        title: "Grammar: adjectives with -ed and -ing",
        skill: "Grammar",
        instructions: "Choose or write the answer. Is the word about a feeling or about a thing?",
        marksEach: 1,
        items: [
          { q: "The folk dance show was ___.", options: ["amazed", "amazing"], answer: "amazing" },
          { q: "My cousin was ___ when she saw the big cake.", options: ["surprised", "surprising"], answer: "surprised" },
          { q: "I felt ___ at the fair because there was nothing to do.", options: ["boring", "bored"], answer: "bored" },
          { q: "Correct the mistake: The race was very excited.", answer: "The race was very exciting." },
          { q: "Correct the mistake: We were interesting in the team game.", answer: "We were interested in the team game." },
          { q: "Write one sentence about a festival with an -ed adjective.", answer: "e.g. I was excited at the festival." },
        ],
      },
      {
        title: "Grammar: time words and the past simple",
        skill: "Grammar",
        instructions: "Choose the right word or write the sentence. Check the verb and the time word.",
        marksEach: 1,
        items: [
          { q: "We ___ a family reunion last Sunday.", options: ["have", "had", "having"], answer: "had" },
          { q: "She called her grandmother ___ Saturday afternoon.", options: ["on", "at", "in"], answer: "on" },
          { q: "They finished the race ___ 10:00.", options: ["on", "at", "in"], answer: "at" },
          { q: "Correct the mistake: We visit the fair yesterday.", answer: "We visited the fair yesterday." },
          { q: "Put the words in order: last night / ate / I / noodles", answer: "I ate noodles last night." },
          { q: "Write one sentence about last weekend. Use a time word and a past verb.", answer: "e.g. On Saturday, I played football with my friends." },
        ],
      },
      {
        title: "Reading: a kite fair",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Last Sunday, my town had a kite fair by the river. About two hundred people came. Some kites were small and some were as long as a bus. The fair started at nine o'clock in the morning, and the first kite race began at ten. My school team won the race, and I was so excited that I jumped up and down! After the race, the players rested and ate noodles from the stalls. My little sister thinks the noodles were the best part, but I think the kites were better. At noon the wind stopped, and everybody was a bit tired, so we went home. It was an amazing day.",
        marksEach: 1,
        items: [
          { q: "Where was the kite fair?", options: ["by the river", "at a school", "in a park"], answer: "by the river" },
          { q: "What time did the first kite race begin?", options: ["at nine o'clock", "at ten o'clock", "at noon"], answer: "at ten o'clock" },
          { q: "Which team won the race?", options: ["a team from another city", "the town team", "the writer's school team"], answer: "the writer's school team" },
          { q: "Which sentence is a FACT?", options: ["It was an amazing day.", "The noodles were the best part.", "The fair started at nine o'clock in the morning."], answer: "The fair started at nine o'clock in the morning." },
          { q: "Which sentence is an OPINION?", options: ["About two hundred people came.", "It was an amazing day.", "The first kite race began at ten."], answer: "It was an amazing day." },
          {
            q: "Why did everybody go home at noon? Give one reason from the text.",
            answer: "e.g. The wind stopped, and everybody was a bit tired.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about an event you enjoyed (a festival, a fair, a family party or a game). Say what the event was, when it happened and how you felt. Use at least two time words with the past simple, and one -ed adjective and one -ing adjective. Marks (5): a clear first sentence, time words with the past simple, a correct -ed adjective, a correct -ing adjective, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about an event you enjoyed.",
            answer:
              "e.g. Last Saturday, I went to the school fair. In the morning, I played a team game, and my team won a small prize. I was very excited. At lunchtime, I ate noodles with my friends. It was an amazing day.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose an event you enjoyed (a festival, a fair, a family party or a sports day). Talk for about one minute: say what it was, when it happened, what you did and how you felt. Then answer two questions from the teacher.",
      prompts: [
        "What was the event? When did it happen?",
        "What did you do first, and what did you do after that?",
        "How did you feel? What was the most exciting part?",
        "Why do you think people like to have fun together?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks smoothly for about a minute; short pauses only to think; easy to follow.",
            "Mostly smooth; a few pauses or restarts but keeps going without help.",
            "Many pauses; speaks in short pieces; needs a prompt once or twice.",
            "Very hesitant; single words or very short phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses unit words correctly and naturally (festival, fair, race, team, score, winner and others).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the event only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: -ed / -ing and the past simple",
          bands: [
            "Uses -ed and -ing adjectives correctly, and time words with past verbs, more than once.",
            "Uses -ed or -ing correctly at least once and mostly correct past verbs; one small slip.",
            "Tries -ed or -ing but often mixes them up; past verbs are often missing after time words.",
            "No -ed or -ing adjectives; uses only present or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains what the event was, when it happened and how they felt, with a reason and an example.",
            "Says what the event was and gives one simple reason; some detail about what happened.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
