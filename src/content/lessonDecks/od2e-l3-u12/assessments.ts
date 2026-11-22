// Oxford Discover 2nd edition, Level 3, Unit 12 (Instruments Around the World):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given at the start of Lesson 4, and the end-of-unit test with
// its speaking task. Everything here is the school's own writing: no text, song
// or audio from the Student Book or Workbook is reproduced, and the reading
// passage is original. Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts about the instruments are checked: the erhu
// has two strings, the tuba is the largest and lowest brass instrument, the
// didgeridoo is from Australia, the djembe is from West Africa and the zummara
// is an Egyptian double-reed pipe.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U12Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ as ... as
  {
    id: "od2e-l3-u12-ws-as-as",
    title: "as ... as / not as ... as",
    grammar: "as ... as / not as ... as",
    deckId: "od2e-l3-u12-l3",
    slide: "Comparing with as ... as",
    intro:
      "as + adjective + as means the same: The drum is as loud as the tuba. not as + adjective + as means less: The flute is not as loud as the tuba. Keep the plain adjective in the middle (loud, never louder).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "The drum is as loud ___ the tuba.  (as / than)  ->  as",
        items: [
          { q: "The djembe is as loud ___ the snare drum.", options: ["as", "than"], answer: "as" },
          { q: "The flute is ___ as long as the didgeridoo. (The didgeridoo is longer.)", options: ["not", "very"], answer: "not" },
          { q: "The tuba is as ___ as the drum.", options: ["big", "bigger"], answer: "big" },
          { q: "The erhu is as light as the flute. Which is true?", options: ["They are the same weight.", "The flute is lighter."], answer: "They are the same weight." },
          { q: "The panpipes ___ as small as the flute.", options: ["are", "is"], answer: "are" },
          { q: "The zummara is not as ___ as the tuba.", options: ["loud", "louder"], answer: "loud" },
          { q: "Which sentence is correct?", options: ["The drum is as loud as the tuba.", "The drum is as louder as the tuba."], answer: "The drum is as loud as the tuba." },
          { q: "The tuba is very big. The flute is small. The flute is ___ big as the tuba.", options: ["as", "not as"], answer: "not as" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words. Use the adjective in brackets. For the rewrite questions, keep the same meaning.",
        example: "The clarinet is ___ ___ ___ the flute. (long) They are the same length.  ->  as long as",
        items: [
          { q: "The djembe is ___ ___ ___ the snare drum. (big) They are the same size.", answer: "as big as" },
          { q: "The violin is ___ ___ ___ ___ the tuba. (heavy) The tuba is much heavier.", answer: "not as heavy as" },
          { q: "A flute is ___ ___ ___ a pencil. (thin) Both are very thin.", answer: "as thin as" },
          { q: "Rewrite with not as ... as: The tuba is bigger than the flute.", answer: "The flute is not as big as the tuba." },
          { q: "Rewrite with not as ... as: The snare drum is louder than the panpipes.", answer: "The panpipes are not as loud as the snare drum." },
          { q: "Correct the mistake: The clarinet is as longer as the flute.", answer: "The clarinet is as long as the flute." },
          { q: "Correct the mistake: The flute is as small than the clarinet.", answer: "The flute is as small as the clarinet." },
          { q: "Correct the mistake: The violin is as heavy the flute.", answer: "The violin is as heavy as the flute." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every as, every adjective and every verb.",
        example: "The cello is bigger than the violin.  ->  The violin is not as big as the cello.",
        items: [
          { q: "Rewrite so that the two instruments swap places and the meaning stays the same: The didgeridoo is longer than the flute.", answer: "The flute is not as long as the didgeridoo." },
          { q: "Do the same: The djembe is more expensive than the recorder.", answer: "The recorder is not as expensive as the djembe. (The adjective stays plain: expensive, not more expensive.)" },
          {
            q: "Find and fix three mistakes: 'The violin is not as bigger as the cello. It is not as heavy the cello, too. But the violin is as beautiful than the cello. I like both!'",
            answer: "not as big as; not as heavy as the cello; as beautiful as.",
          },
          { q: "Write two sentences about instruments. One uses as ... as, the other uses not as ... as. Use a different adjective in each.", answer: "e.g. The panpipes are as old as the flute. The erhu is not as loud as the drum." },
          { q: "Write one sentence with not as ... as about two things that are not instruments (animals, food, school things). Add a reason with because.", answer: "e.g. A mouse is not as heavy as an elephant because it is much smaller." },
          {
            q: "A friend says: 'The flute is not as loud as the tuba' and 'The tuba is louder than the flute' mean the same thing. Is your friend right? Explain in one or two sentences.",
            answer: "e.g. Yes. Both sentences say the tuba is louder. In the not as ... as sentence the two instruments swap places and the adjective goes back to its plain form.",
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ its / it's
  {
    id: "od2e-l3-u12-ws-its",
    title: "its / it's",
    grammar: "its / it's",
    deckId: "od2e-l3-u12-l4",
    slide: "its or it's?",
    intro:
      "it's = it is (or it has): It's a flute. its = belongs to it: The flute has its own sound. Test: say 'it is'. If it fits, use it's.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle its or it's. Say 'it is' in your head to test.",
        example: "___ a flute.  (its / it's)  ->  It's",
        items: [
          { q: "___ a drum.", options: ["Its", "It's"], answer: "It's" },
          { q: "The drum has ___ own sound.", options: ["its", "it's"], answer: "its" },
          { q: "___ very loud!", options: ["Its", "It's"], answer: "It's" },
          { q: "The violin has four strings. ___ strings are thin.", options: ["Its", "It's"], answer: "Its" },
          { q: "Look at the tuba! ___ very big.", options: ["Its", "It's"], answer: "It's" },
          { q: "The erhu has two strings. ___ sound is sweet.", options: ["Its", "It's"], answer: "Its" },
          { q: "This is a djembe. ___ from West Africa.", options: ["Its", "It's"], answer: "It's" },
          { q: "The didgeridoo is long. ___ end is wide.", options: ["Its", "It's"], answer: "Its" },
        ],
      },
      {
        level: "Core",
        instructions: "Write its or it's in each gap. For the rewrite and correct questions, write the whole sentence.",
        example: "The clarinet is on the table. ___ made of wood.  ->  It's",
        items: [
          { q: "I love my violin. ___ sound is so sweet.", answer: "Its" },
          { q: "The clarinet is on the table. ___ made of wood.", answer: "It's" },
          { q: "Write the short form: It is a very old instrument.", answer: "It's a very old instrument." },
          { q: "Write the short form: It is not a drum.", answer: "It's not a drum. (or: It isn't a drum.)" },
          { q: "The tuba is a brass instrument. ___ shape is round and ___ very heavy.", answer: "Its ... it's" },
          { q: "Correct the mistake: The djembe has it's own rhythm.", answer: "The djembe has its own rhythm." },
          { q: "Correct the mistake: Its a traditional instrument.", answer: "It's a traditional instrument." },
          { q: "Correct the mistake: The erhu is great. Its played in China.", answer: "It's played in China." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Read carefully. When you explain, use the words 'it is' to prove your answer.",
        example: "It's a drum and its skin is tight.",
        items: [
          {
            q: "Find and fix four mistakes: 'My favourite instrument is the didgeridoo. Its from Australia, and it's sound is deep. Its made of wood. The player blows into it's end.'",
            answer: "It's from Australia; its sound is deep; It's made of wood; blows into its end.",
          },
          { q: "Write two sentences about one instrument. The first uses it's and the second uses its.", answer: "e.g. It's a flute. Its sound is high and clear." },
          { q: "Write one sentence that uses both its and it's.", answer: "e.g. It's a violin and its strings are very thin." },
          {
            q: "Explain why 'The drum has it's skin' is wrong. Use the words 'it is'.",
            answer: "e.g. 'The drum has it is skin' makes no sense. The skin belongs to the drum, so we need its with no apostrophe.",
          },
          { q: "Join the two sentences with and, using its for the second part: The tuba is big. The tuba's sound is deep.", answer: "The tuba is big and its sound is deep." },
          {
            q: "Write a three-sentence riddle about an instrument for a friend to guess. Use it's twice and its once.",
            answer: "e.g. It's made of wood and it's not very long. Its sound is high and bright. You blow across the top. (a flute)",
          },
        ],
      },
    ],
  },
];

export const odL3U12Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u12-check",
    title: "Quick check: words and as ... as",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 12 instrument words and words in context", "as ... as / not as ... as"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "Two strings, a bow, a long neck, from China. Which instrument?", answer: "erhu" },
          { q: "The largest and lowest brass instrument. Which instrument?", answer: "tuba" },
          { q: "A very long wooden tube from Australia. Which instrument?", answer: "didgeridoo" },
          { q: "Which word means 'handed down from the past, the old way'?", answer: "traditional" },
        ],
      },
      {
        title: "Grammar: as ... as",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: My flute and your flute are both 30 cm long. My flute is ___ long ___ your flute.", answer: "as ... as (as long as)" },
          { q: "Rewrite with not as ... as: The tuba is bigger than the violin.", answer: "The violin is not as big as the tuba." },
          { q: "Correct the mistake: The snare drum is as louder as the panpipes.", answer: "The snare drum is as loud as the panpipes." },
          { q: "'The flute is not as loud as the tuba' means the flute is louder.", options: ["True", "False"], answer: "False" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u12-test",
    title: "Unit 12 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 instrument words and how instruments make sound: blow, hit, pluck, bow",
      "Words in context: traditional, vibrate, material, pitch",
      "as ... as / not as ... as",
      "its / it's",
      "Reading: compare and contrast",
      "Writing: describe an instrument",
      "Speaking: compare two instruments",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "You ___ a flute. You send air across the top.", options: ["blow", "hit", "pluck", "bow"], answer: "blow" },
          { q: "You ___ a snare drum with sticks.", options: ["blow", "hit", "pluck", "bow"], answer: "hit" },
          { q: "To play a guitar, you can ___ the strings with your fingers.", options: ["blow", "hit", "pluck", "bow"], answer: "pluck" },
          { q: "You ___ a violin by pulling a bow across the strings.", options: ["blow", "hit", "pluck", "bow"], answer: "bow" },
          { q: "Wood is a ___ that many instruments are made from.", options: ["pitch", "material", "traditional", "vibrate"], answer: "material" },
          { q: "When you hit a drum, its skin starts to ___ and makes the sound.", options: ["pitch", "material", "traditional", "vibrate"], answer: "vibrate" },
          { q: "A flute has a high ___ and a tuba has a low one.", options: ["pitch", "material", "traditional", "vibrate"], answer: "pitch" },
          { q: "The erhu is a ___ instrument: people have played it for a very long time.", options: ["pitch", "material", "traditional", "vibrate"], answer: "traditional" },
          { q: "Which instrument is a long wooden pipe from Australia with a deep hum?", options: ["didgeridoo", "zummara", "clarinet", "panpipes"], answer: "didgeridoo" },
          { q: "Which instrument from West Africa do you play with your hands?", options: ["tuba", "djembe", "erhu", "flute"], answer: "djembe" },
          { q: "Which instrument is a set of pipes of different lengths tied together?", options: ["panpipes", "snare drum", "violin", "tuba"], answer: "panpipes" },
          { q: "Which instrument from China has two strings and a bow?", options: ["clarinet", "zummara", "erhu", "djembe"], answer: "erhu" },
        ],
      },
      {
        title: "Grammar: as ... as",
        skill: "Grammar",
        instructions: "Do what each question asks. Write full sentences when you are asked to rewrite or correct.",
        marksEach: 1,
        items: [
          { q: "My pipe and your pipe are both 30 cm long. My pipe is ___ long ___ your pipe.", answer: "as ... as (as long as)" },
          { q: "The violin is ___ the tuba. (The tuba is much heavier.)", options: ["as heavy as", "not as heavy as"], answer: "not as heavy as" },
          { q: "Rewrite with not as ... as: The didgeridoo is longer than the flute.", answer: "The flute is not as long as the didgeridoo." },
          { q: "Correct the mistake: The snare drum is as loud than the panpipes.", answer: "The snare drum is as loud as the panpipes." },
          { q: "A violin is ___ ___ ___ a guitar. (not / big)", answer: "not as big as" },
          { q: "Write your own sentence with as ... as about two things in your classroom.", answer: "e.g. My pencil case is as heavy as my water bottle." },
        ],
      },
      {
        title: "Grammar: its / it's",
        skill: "Grammar",
        instructions: "Choose its or it's, or correct the mistake. Remember: it's = it is.",
        marksEach: 1,
        items: [
          { q: "___ a very old drum.", options: ["Its", "It's"], answer: "It's" },
          { q: "The violin has four strings. ___ strings are thin.", options: ["Its", "It's"], answer: "Its" },
          { q: "The erhu is from China. ___ played with a bow.", options: ["Its", "It's"], answer: "It's" },
          { q: "Correct the mistake: The djembe has it's own sound.", answer: "The djembe has its own sound." },
          { q: "Correct the mistake: Its a traditional instrument from Egypt.", answer: "It's a traditional instrument from Egypt." },
          { q: "Write the sentence with a short form: The tuba is big and it is heavy.", answer: "The tuba is big and it's heavy." },
        ],
      },
      {
        title: "Reading: compare and contrast",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "The djembe and the snare drum are both drums, and people play both of them by hitting. Each one has a skin stretched over the top, and the skin vibrates to make the sound. But they are quite different, too. The djembe comes from West Africa. Its body is carved from wood and shaped like a cup, wide at the top and narrow at the bottom. Players usually hit it with their bare hands, and they can make a deep bass note, a medium tone and a sharp slap. The snare drum is flat and round, and its body is made of metal or wood. Players hit it with two sticks, and you can hear it in marching bands and school bands. Underneath it, thin wires called snares touch the skin, so the snare drum has a short, crisp, rattling sound. The djembe is not as crisp as the snare drum, but its sound is warmer and deeper.",
        marksEach: 1,
        items: [
          { q: "Both drums have a skin that vibrates.", options: ["True", "False"], answer: "True" },
          { q: "The snare drum comes from West Africa.", options: ["True", "False"], answer: "False" },
          { q: "A djembe player usually uses two sticks.", options: ["True", "False"], answer: "False" },
          { q: "Which instrument has thin wires underneath?", options: ["The djembe", "The snare drum"], answer: "The snare drum" },
          { q: "Which instrument has a warmer, deeper sound?", options: ["The djembe", "The snare drum"], answer: "The djembe" },
          {
            q: "How are they the same? How are they different? Write one way for each.",
            answer:
              "e.g. Same: both are drums that you hit, and both have a skin that vibrates. Different: the djembe is played with bare hands and has a deep, warm sound, but the snare drum is played with sticks and has a crisp, rattling sound.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about an instrument you know. Say what it looks like, how you play it and what it sounds like. Use one as ... as or not as ... as sentence and one its or it's. Marks (5): a clear first sentence, what it looks like, how it is played, a correct as ... as or its / it's sentence, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe an instrument.",
            answer:
              "e.g. The erhu is a traditional Chinese instrument. It has two strings and a long neck, and its body is small. You play it with a bow, and the sound is sweet and a little sad. It's not as loud as a trumpet, but it is as beautiful as a violin to me.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose two instruments from the unit. Talk for about one minute: say what each one is like, how they are the same and how they are different, and which you prefer and why. Then answer two questions from the teacher.",
      prompts: [
        "Which instrument is easier to play, in your opinion? Why?",
        "Is a flute as loud as a tuba? How do you know?",
        "How does the instrument you chose make its sound?",
        "Which instrument would you like to learn, and what would you play?",
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
            "Uses unit words correctly and naturally (instrument names, how it makes sound, material, pitch).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the instruments only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: as ... as and its/it's",
          bands: [
            "Uses as ... as and not as ... as correctly more than once, with its / it's right every time.",
            "Uses as ... as or not as ... as correctly at least once; one small slip, such as it's for its.",
            "Tries as ... as but with errors (as louder as, only one as); its / it's often confused.",
            "No as ... as; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Names clear likenesses and differences and gives a reason for a preference with an example.",
            "Names at least one likeness and one difference; gives a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
