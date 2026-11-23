// Oxford Discover 2nd edition, Level 3, Unit 11 (Orchestras and Mystery Sounds):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: a cello is a string instrument
// played with a bow, timpani are large drums, a trombone is a brass instrument with
// a slide, a bassoon is a low woodwind, a conductor leads the orchestra with a
// baton, and the five singing voices run from high to low: soprano, alto, tenor,
// baritone, bass. Comparatives compare two things and superlatives pick one from
// three or more. This unit's test sits after Lesson 4; Unit 12 has the second half
// of the Big Question and its own Wrap Up.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U11Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ comparatives and superlatives
  {
    id: "od2e-l3-u11-ws-comparatives",
    title: "Comparing things: -er / -est and more / most",
    grammar: "comparative and superlative adjectives",
    deckId: "od2e-l3-u11-l3",
    slide: "Comparing things: -er / -est and more / most",
    intro:
      "Two things: comparative + than (louder than, more beautiful than). Three or more things: the + superlative (the loudest, the most beautiful). Short adjectives take -er / -est. Long adjectives take more / most. Never both!",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "A trombone is ___ than a flute.  (louder / the loudest)  ->  louder",
        items: [
          { q: "A trombone is ___ than a flute.", options: ["louder", "the loudest", "more loud"], answer: "louder" },
          { q: "Of the three drums, the big one is ___.", options: ["bigger", "the biggest", "the most big"], answer: "the biggest" },
          { q: "A cello is ___ than a bassoon to carry in a bus.", options: ["difficulter", "the most difficult", "more difficult"], answer: "more difficult" },
          { q: "This is ___ song in our book.", options: ["more beautiful", "the most beautiful", "the beautifulest"], answer: "the most beautiful" },
          { q: "My brother's drum is ___ than my drum.", options: ["more noisy", "the noisiest", "noisier"], answer: "noisier" },
          { q: "The timpani are ___ instruments in the orchestra.", options: ["the loudest", "louder", "more louder"], answer: "the loudest" },
          { q: "Which sentence is correct?", options: ["The bassoon is more deeper than the flute.", "The bassoon is deeper than the flute."], answer: "The bassoon is deeper than the flute." },
          { q: "Which sentence is correct?", options: ["Today's concert was the best of the year.", "Today's concert was the goodest of the year."], answer: "Today's concert was the best of the year." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the comparative or the superlative form of the word in brackets. For the last four questions, write the whole sentence.",
        example: "A cello is ___ than a violin. (big)  ->  bigger",
        items: [
          { q: "A drum is ___ than a recorder. (loud)", answer: "louder" },
          { q: "The conductor's baton is ___ than a pencil. (thin)", answer: "thinner" },
          { q: "This song is ___ than that one. (interesting)", answer: "more interesting" },
          { q: "Of the four instruments, the timpani are ___. (heavy)", answer: "the heaviest" },
          { q: "Of all the singers, the soprano has ___ voice. (high)", answer: "the highest" },
          { q: "Correct the mistake: A trombone is more louder than a flute.", answer: "A trombone is louder than a flute." },
          { q: "Correct the mistake: This is the most funniest story.", answer: "This is the funniest story." },
          { q: "Correct the mistake: Our school band is more good than last year.", answer: "Our school band is better than last year." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the number of things, the spelling and the word than or the.",
        example: "(good) Today's concert was ___ than yesterday's.  ->  better",
        items: [
          { q: "Write one sentence that compares two instruments with a comparative and than.", answer: "e.g. A trombone is louder than a violin." },
          { q: "Write one sentence about the most unusual instrument you know. Use the most + a long adjective.", answer: "e.g. The didgeridoo is the most unusual instrument I know." },
          {
            q: "Find and fix three mistakes: 'The cello is more big than the violin. The bassoon is the deepest of two. This is the most good concert.'",
            answer: "The cello is bigger than the violin. / The bassoon is deeper than the other one. (or 'the deepest of the three') / This is the best concert.",
          },
          { q: "Write the comparative and superlative of: bad, funny, famous.", answer: "worse, the worst / funnier, the funniest / more famous, the most famous" },
          { q: "Why do we say 'bigger' but 'more beautiful'? Explain in one or two sentences.", answer: "e.g. Big is a short adjective, so we add -er (and double the g). Beautiful is a long adjective, so we put more before it." },
          { q: "Write three sentences about three things in our classroom, from the smallest to the biggest. Use a comparative and a superlative.", answer: "e.g. The pencil is shorter than the ruler. The ruler is shorter than the desk. The desk is the longest of the three." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ possessive nouns
  {
    id: "od2e-l3-u11-ws-possessive",
    title: "Possessive nouns: 's and s'",
    grammar: "possessive nouns",
    deckId: "od2e-l3-u11-l4",
    slide: "Possessive nouns: 's and s'",
    intro:
      "One owner: add 's (the conductor's baton). Many owners that end in s: add only an apostrophe (the teachers' room). Many owners that do not end in s: add 's (the children's songs).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Ask: how many owners are there?",
        example: "The ___ baton is white.  (conductor's / conductors')  ->  conductor's",
        items: [
          { q: "The ___ baton is white. (one conductor)", options: ["conductor's", "conductors'"], answer: "conductor's" },
          { q: "The ___ instruments are in the hall. (three musicians)", options: ["musician's", "musicians'"], answer: "musicians'" },
          { q: "The ___ songs are very happy. (many children)", options: ["childrens'", "children's"], answer: "children's" },
          { q: "I can hear the ___ voice. (one teacher)", options: ["teacher's", "teachers'"], answer: "teacher's" },
          { q: "The two ___ notebooks are on the desk. (two astronauts)", options: ["astronaut's", "astronauts'"], answer: "astronauts'" },
          { q: "The ___ tail is long. (one monkey)", options: ["monkey's", "monkeys'"], answer: "monkey's" },
          { q: "Which is correct?", options: ["The cello's strings are thin.", "The cello's string's are thin."], answer: "The cello's strings are thin." },
          { q: "Which is correct?", options: ["The womens' choir sang well.", "The women's choir sang well."], answer: "The women's choir sang well." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the possessive form of the noun in brackets. For the last four questions, write the whole sentence.",
        example: "The ___ drum is loud. (girl)  ->  girl's",
        items: [
          { q: "The ___ bow is in the case. (cellist)", answer: "cellist's" },
          { q: "The ___ chairs are in a circle. (players)", answer: "players'" },
          { q: "The ___ playground is big. (children)", answer: "children's" },
          { q: "The ___ voices were amazing. (singers)", answer: "singers'" },
          { q: "Write one sentence about the owner of this thing: one conductor, one baton.", answer: "e.g. The conductor's baton is white." },
          { q: "Correct the mistake: The musician's chairs (three musicians) are in the hall.", answer: "The musicians' chairs are in the hall." },
          { q: "Correct the mistake: The childrens' concert is on Friday.", answer: "The children's concert is on Friday." },
          { q: "Correct the mistake: My teachers car is blue. (one teacher)", answer: "My teacher's car is blue." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Count the owners and check where the apostrophe goes.",
        example: "the voice of the girl  ->  the girl's voice",
        items: [
          { q: "Rewrite with a possessive noun: the sound of the trombone.", answer: "the trombone's sound" },
          { q: "Rewrite with a possessive noun: the rooms of the teachers (more than one).", answer: "the teachers' rooms" },
          {
            q: "Find and fix three mistakes: 'The orchestras' conductor is kind. The childrens song is loud. My sisters' guitar is old.' (There is one orchestra and one sister.)",
            answer: "The orchestra's conductor is kind. / The children's song is loud. / My sister's guitar is old.",
          },
          { q: "Explain the difference: 'the student's books' and 'the students' books'.", answer: "e.g. In the first one there is one student. In the second one there are many students." },
          { q: "Write one sentence about two instruments in an orchestra. Use a possessive noun that ends in s'.", answer: "e.g. The musicians' instruments are in the hall." },
          { q: "Write one sentence about something that belongs to a friend, and one about something that belongs to two friends together.", answer: "e.g. My friend's cello is old. My friends' band is very loud." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ suffix -ing
  {
    id: "od2e-l3-u11-ws-ing",
    title: "Suffix -ing: from verb to adjective",
    grammar: "-ing adjectives",
    deckId: "od2e-l3-u11-l4",
    slide: "From verb to adjective: suffix -ing (SB 115 D)",
    intro:
      "An -ing adjective describes the thing that makes the feeling: an amazing show (the show amazes us). Drop the silent e before -ing: amaze -> amazing, relax -> relaxing, challenge -> challenging.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the sentence aloud.",
        example: "The music is very ___.  (relax / relaxing)  ->  relaxing",
        items: [
          { q: "The music is very ___.", options: ["relax", "relaxing"], answer: "relaxing" },
          { q: "The magic show was ___.", options: ["amazing", "amaze"], answer: "amazing" },
          { q: "This new piece is hard. It is ___.", options: ["challenge", "challenging"], answer: "challenging" },
          { q: "The football match was ___.", options: ["exciting", "excite"], answer: "exciting" },
          { q: "Which is the adjective from 'surprise'?", options: ["surprise", "surprising", "surprised"], answer: "surprising" },
          { q: "Which spelling is correct?", options: ["amazeing", "amazing"], answer: "amazing" },
          { q: "Which spelling is correct?", options: ["relaxing", "relaxeing"], answer: "relaxing" },
          { q: "A story that makes you laugh is ___.", options: ["amuse", "amusing"], answer: "amusing" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the -ing adjective made from the verb in brackets. For the last four questions, write the whole sentence.",
        example: "That was an ___ concert. (amaze)  ->  amazing",
        items: [
          { q: "A warm bath is very ___. (relax)", answer: "relaxing" },
          { q: "The mystery story was ___. (excite)", answer: "exciting" },
          { q: "The math puzzle was ___. (challenge)", answer: "challenging" },
          { q: "The news was ___. (surprise)", answer: "surprising" },
          { q: "Write a sentence with 'amazing' about an instrument.", answer: "e.g. The cello has an amazing deep sound." },
          { q: "Write a sentence with 'relaxing' about music.", answer: "e.g. Slow music is very relaxing." },
          { q: "Correct the mistake: It was a challengeing game.", answer: "It was a challenging game." },
          { q: "Correct the mistake: The beach is a relax place.", answer: "The beach is a relaxing place." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the spelling and who or what has the feeling.",
        example: "The show amazes me. -> It is an ___ show.  ->  amazing",
        items: [
          { q: "Rewrite with an -ing adjective: The film bores me. It is a ___ film.", answer: "boring" },
          { q: "Write one sentence with an -ing adjective about a school subject.", answer: "e.g. Science is exciting because we do experiments." },
          {
            q: "Find and fix two mistakes: 'The concert was amazeing. The game was challange.'",
            answer: "The concert was amazing. / The game was challenging.",
          },
          { q: "Explain how an -ing adjective is made from a verb that ends in e (for example challenge).", answer: "e.g. Drop the silent e and add -ing: challenge -> challenging." },
          { q: "Write two sentences about a piece of music: one with 'relaxing' and one with 'exciting'. Use a comparative in one of them.", answer: "e.g. This piece is relaxing. That piece is more exciting than this one." },
          { q: "Write one sentence with a possessive noun and an -ing adjective.", answer: "e.g. The conductor's last piece was amazing." },
        ],
      },
    ],
  },
];

export const odL3U11Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u11-check",
    title: "Quick check: orchestra words and comparing",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 11 orchestra words", "comparative and superlative adjectives", "making inferences"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A thin stick that a conductor holds. Which word?", answer: "baton" },
          { q: "A large group of musicians who play together. Which word?", answer: "orchestra" },
          { q: "Large drums in an orchestra, hit with sticks. Which word?", answer: "timpani" },
          { q: "A big string instrument that you play sitting down with a bow. Which word?", answer: "cello" },
        ],
      },
      {
        title: "Grammar: comparing things",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one or two words where it does not.",
        marksEach: 1,
        items: [
          { q: "A drum is ___ than a recorder. (loud)", answer: "louder" },
          { q: "This is the ___ song in the book. (beautiful)", answer: "most beautiful" },
          { q: "Correct the mistake: A trombone is more louder than a flute.", answer: "A trombone is louder than a flute." },
          { q: "Complete: The bassoon is ___ than the flute. (deep)  ... and the tuba is ___ of all. (deep)", answer: "deeper, the deepest" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u11-test",
    title: "Unit 11 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 orchestra and job words and the four story words",
      "Making inferences",
      "Comparative and superlative adjectives",
      "Possessive nouns and the suffix -ing",
      "Reading: a short mystery text",
      "Writing: instruments in an orchestra",
      "Speaking: comparing instruments and sounds",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "The ___ stands in front of the orchestra and shows the players how fast to play.", options: ["scientist", "conductor", "astronaut", "beekeeper"], answer: "conductor" },
          { q: "A ___ is a thin white stick that the conductor holds.", options: ["bassoon", "cello", "baton", "timpani"], answer: "baton" },
          { q: "A big group of musicians who play together is an ___.", options: ["orchestra", "astronaut", "gym", "mystery"], answer: "orchestra" },
          { q: "A ___ is a large brass instrument with a slide that you push in and out.", options: ["cello", "trombone", "bassoon", "timpani"], answer: "trombone" },
          { q: "You play a ___ with a bow, and you sit down to play it.", options: ["trombone", "baton", "cello", "gym"], answer: "cello" },
          { q: "The ___ are big drums that make a deep sound.", options: ["timpani", "bassoons", "batons", "scientists"], answer: "timpani" },
          { q: "An ___ travels into space in a rocket.", options: ["circus trainer", "astronaut", "conductor", "beekeeper"], answer: "astronaut" },
          { q: "A ___ looks after animals and teaches them tricks in a show.", options: ["scientist", "beekeeper", "conductor", "circus trainer"], answer: "circus trainer" },
          { q: "A noise that is so loud that you can hardly hear anything else is ___.", options: ["deafening", "relaxing", "amazing", "challenging"], answer: "deafening" },
        ],
      },
      {
        title: "Grammar: comparing things",
        skill: "Grammar",
        instructions: "Choose or write the answer. Count the things first: two things or three or more?",
        marksEach: 1,
        items: [
          { q: "A trombone is ___ than a flute.", options: ["more loud", "louder", "the loudest"], answer: "louder" },
          { q: "Of the three drums, the red one is ___.", options: ["the biggest", "bigger", "the most big"], answer: "the biggest" },
          { q: "This song is ___ than that one. (interesting)", options: ["the most interesting", "interestinger", "more interesting"], answer: "more interesting" },
          { q: "Today's concert was ___ than yesterday's. (good)  Write the word.", answer: "better" },
          { q: "Correct the mistake: This is the most funniest joke in the book.", answer: "This is the funniest joke in the book." },
          { q: "Correct the mistake: A cello is more big than a violin.", answer: "A cello is bigger than a violin." },
          { q: "Write one sentence that compares a cello and a bassoon with a comparative and than.", answer: "e.g. A bassoon is longer than a cello. / A cello is bigger than a bassoon." },
        ],
      },
      {
        title: "Grammar: possessive nouns and the suffix -ing",
        skill: "Grammar",
        instructions: "Choose the right form or write the answer. Ask: how many owners are there?",
        marksEach: 1,
        items: [
          { q: "The ___ baton is white. (one conductor)", options: ["conductor's", "conductors'", "conductors"], answer: "conductor's" },
          { q: "The ___ chairs are in a circle. (many musicians)", options: ["musicians'", "musician's", "musicians"], answer: "musicians'" },
          { q: "The ___ choir sings every Friday. (the choir of the children)", options: ["childrens'", "childrens", "children's"], answer: "children's" },
          { q: "Correct the mistake: The cellos strings are very thin. (one cello)", answer: "The cello's strings are very thin." },
          { q: "The music is very ___. It makes me feel calm. (relax)", options: ["relaxing", "relax", "relaxeing"], answer: "relaxing" },
          { q: "Write the -ing adjective from the verb: amaze", answer: "amazing" },
        ],
      },
      {
        title: "Reading: a strange sound",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions. Use the clues, not only the words.",
        passage:
          "On Saturday morning, Ben and his cousin Tara walked past the school hall. The doors were shut, but a strange sound came from inside: a deep, slow BOOM, BOOM, BOOM. Then they heard a thin, high sound that went up and down like a bird. 'It must be a storm,' said Ben. Tara looked up. The sky was blue and the sun was shining. 'There are no clouds,' she said. 'So it is not thunder.' She put her ear to the door. Under the BOOM she could hear a voice counting, 'One, two, three, four,' and a lot of chairs moving. Tara smiled. 'I think I know,' she said. 'Some people are practicing for the school concert, and those big drums are the loudest instruments in the room!' Ben pushed the door open. She was right.",
        marksEach: 1,
        items: [
          { q: "Ben thought the deep sound was a storm.", options: ["True", "False"], answer: "True" },
          { q: "Why did Tara say it was not thunder?", options: ["It was raining outside.", "The sky was blue and sunny.", "The sound was too high."], answer: "The sky was blue and sunny." },
          { q: "Which clue showed Tara that people were practicing?", options: ["A bird singing in a tree.", "Doors that were open.", "A voice counting and chairs moving."], answer: "A voice counting and chairs moving." },
          { q: "What do you think made the deep BOOM?", options: ["a bird", "big drums", "a door"], answer: "big drums" },
          { q: "The thin, high sound was like a ...", options: ["storm", "car", "bird"], answer: "bird" },
          {
            q: "Tara made an inference. Write one clue she used and what she decided.",
            answer: "e.g. Clue: the sky was blue, so she decided it was not thunder. / Clue: a voice was counting and chairs were moving, so she decided people were practicing.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about two instruments in an orchestra. Say how they sound and which one you like more and why. Use one comparative with than, one possessive noun and one -ing adjective. Marks (5): a clear first sentence, a correct comparative, a correct possessive noun, a correct -ing adjective, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe two instruments in an orchestra.",
            answer:
              "e.g. A cello and a trombone are two instruments in an orchestra. The trombone is louder than the cello. The cello's sound is deep and relaxing. The conductor's baton tells the players when to start. I like the cello more because its music is amazing.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose two instruments or two sounds that you know well. Talk for about one minute: say what each one is, how it sounds, how they are different and which one you like more. Then answer two questions from the teacher.",
      prompts: [
        "Which instrument in the orchestra is the loudest, in your opinion? Why?",
        "Is a cello bigger than a trombone? How do you know?",
        "What is the most relaxing sound you know?",
        "If you were the conductor, which instrument would you put at the front? Why?",
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
            "Uses unit words correctly and naturally (instrument names, conductor, orchestra, exact adjectives).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names an instrument only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: comparing and possession",
          bands: [
            "Uses comparatives with than and superlatives with the correctly, including more / most, and a possessive noun, more than once.",
            "Uses a comparative or superlative correctly at least once; one small slip, such as more louder or a missing than.",
            "Tries comparing but often mixes up the forms (more big, the most loud); no possessive nouns.",
            "No comparing; uses only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains what each one is, how it sounds and which is better, with a reason and an example.",
            "Says what each one is and gives one simple reason; some comparison.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
