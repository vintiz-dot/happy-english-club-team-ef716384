// Oxford Discover 2nd edition, Level 3, Unit 7 (Time and the Earth):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: there are 60 seconds in a minute,
// 60 minutes in an hour, 24 hours in a day, 7 days in a week, 12 months in a year;
// the Earth spins once a day on its axis and orbits the sun once a year; Tokyo is
// two hours ahead of Hanoi all year. This unit's test sits after Lesson 5 (Grammar Champions); the Wrap
// Up lesson belongs to Unit 8.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U7Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ future facts with will
  {
    id: "od2e-l3-u07-ws-will",
    title: "Future facts with will",
    grammar: "will / won't for future facts",
    deckId: "od2e-l3-u07-l3",
    slide: "Future facts with will",
    intro:
      "Now we say is. Later we say will. After will, use the plain verb: no -s, no -ing, no to. A clock time needs be: 'In two hours, it will be six o'clock.' For no, say won't. For a question, put Will first.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "In one hour, it ___ be noon.  (will / is)  ->  will",
        items: [
          { q: "In one hour, it ___ be noon.", options: ["will", "is"], answer: "will" },
          { q: "The sun ___ rise tomorrow.", options: ["will", "wills"], answer: "will" },
          { q: "It ___ be dark at noon.", options: ["won't", "doesn't"], answer: "won't" },
          { q: "In two hours, it will ___ four o'clock.", options: ["be", "is", "to be"], answer: "be" },
          { q: "The sun will ___ tomorrow.", options: ["rise", "rises", "rising"], answer: "rise" },
          { q: "___ it be night in Tokyo?", options: ["Will", "Do"], answer: "Will" },
          { q: "Will the sun rise tomorrow? Yes, it ___.", options: ["will", "does"], answer: "will" },
          { q: "Which sentence is correct?", options: ["In one hour, it will be seven o'clock.", "In one hour, it will seven o'clock."], answer: "In one hour, it will be seven o'clock." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words, or write the whole sentence where it asks.",
        example: "It is ten o'clock now. In one hour, it ___ ___ eleven o'clock.  ->  will be",
        items: [
          { q: "It is eleven o'clock now. In one hour, it ___ ___ noon.", answer: "will be" },
          { q: "It is Monday today. Tomorrow ___ ___ Tuesday.", answer: "it will be" },
          { q: "Make it negative: It will be dark at noon.", answer: "It won't be dark at noon." },
          { q: "Make it a question: It will be night in Tokyo.", answer: "Will it be night in Tokyo?" },
          { q: "Write the short answer: Will the sun rise tomorrow? Yes, ___ ___.", answer: "it will" },
          { q: "Correct the mistake: The sun will rises at six.", answer: "The sun will rise at six." },
          { q: "Correct the mistake: In two hours, it will two o'clock.", answer: "In two hours, it will be two o'clock." },
          { q: "It is three o'clock in the afternoon now. Write what time it will be in two hours.", answer: "It will be five o'clock." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the verb after will, and check that be is there when it is needed.",
        example: "Write a future fact about the clock.  ->  In one hour, it will be ten o'clock.",
        items: [
          { q: "Write three future facts about the school day tomorrow. Use will or won't.", answer: "e.g. The first lesson will start at eight o'clock. We will have lunch at noon. We won't have school on Sunday." },
          {
            q: "Find and fix three mistakes: 'In one hour it is noon. The sun will rises tomorrow. It will to be dark at six.'",
            answer: "In one hour, it will be noon. / The sun will rise tomorrow. / It will be dark at six.",
          },
          { q: "Write a question with Will about tomorrow and give a short negative answer.", answer: "e.g. Will the sun rise at midnight? No, it won't." },
          { q: "Why do we say 'In two hours, it will be six' and not 'In two hours, it will six'?", answer: "e.g. After will we need a verb. Six is not a verb, so we need be: it will be six." },
          { q: "Rewrite with won't: The sun will rise at midnight.", answer: "The sun won't rise at midnight." },
          { q: "Write two sentences with the short form it'll or we'll about what will happen after school.", answer: "e.g. It'll be four o'clock soon. We'll go home and have a snack." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ the with country names
  {
    id: "od2e-l3-u07-ws-the",
    title: "Using the with country names",
    grammar: "the (definite article) with country names",
    deckId: "od2e-l3-u07-l4",
    slide: "Using the with country names",
    intro:
      "Most countries have no the: Vietnam, Japan, Chile. Use the with plural names (the Philippines, the Netherlands) and with names that have Kingdom, Republic, States or Emirates in them (the United Kingdom). We also say the sun and the moon, because there is only one.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "My cousin lives in ___ Philippines.  (the / no word)  ->  the",
        items: [
          { q: "Dubai is in ___ United Arab Emirates.", options: ["the", "no word"], answer: "the" },
          { q: "My aunt lives in ___ Vietnam.", options: ["the", "no word"], answer: "no word" },
          { q: "Look at ___ moon tonight!", options: ["the", "no word"], answer: "the" },
          { q: "He wants to visit ___ Netherlands.", options: ["the", "no word"], answer: "the" },
          { q: "She flew to ___ Chile.", options: ["the", "no word"], answer: "no word" },
          { q: "I would like to go to ___ United States.", options: ["the", "no word"], answer: "the" },
          { q: "Which sentence is correct?", options: ["We will fly to the United Kingdom.", "We will fly to United Kingdom."], answer: "We will fly to the United Kingdom." },
          { q: "Which sentence is correct?", options: ["I live in Turkey.", "I live in the Turkey."], answer: "I live in Turkey." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or write the whole sentence where it asks.",
        example: "My cousin lives in ___ Netherlands.  ->  the",
        items: [
          { q: "My cousin lives in ___ Netherlands. (write the or nothing)", answer: "the" },
          { q: "We flew to ___ Italy. (write the or nothing)", answer: "nothing" },
          { q: "Add the where it is needed: I will visit Republic of Ireland.", answer: "I will visit the Republic of Ireland." },
          { q: "Correct the mistake: Sun is very bright today.", answer: "The sun is very bright today." },
          { q: "Correct the mistake: My uncle lives in the Japan.", answer: "My uncle lives in Japan." },
          { q: "Why does 'the Philippines' have the? Answer in one sentence.", answer: "e.g. It is a plural name (many islands)." },
          { q: "Write one sentence with 'the United Kingdom'.", answer: "e.g. My friend will travel to the United Kingdom next year." },
          { q: "Write one sentence with 'Vietnam'. Do you need the?", answer: "e.g. I live in Vietnam. No, I do not need the." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check every country name and every capital letter.",
        example: "We will fly to the Bahamas.  (plural name, so the)",
        items: [
          {
            q: "Find and fix three mistakes: 'We will fly to the Thailand. Then we will go to Philippines. We will watch sun rise.'",
            answer: "We will fly to Thailand. / Then we will go to the Philippines. / We will watch the sun rise.",
          },
          { q: "Why does 'the Netherlands' need the but 'Sweden' does not?", answer: "e.g. The Netherlands is a plural name, but Sweden is not." },
          { q: "Fill the gaps with a, an or the: 'I have ___ watch. ___ watch is red.'", answer: "a / The" },
          { q: "Write two sentences about a trip: one with a country that needs the and one with a country that does not.", answer: "e.g. We will visit the United States. Then we will go to Canada." },
          { q: "Write with capital letters and the: 'my cousin lives in the united arab emirates.'", answer: "My cousin lives in the United Arab Emirates." },
          { q: "Write the ones that need the: Peru, the Maldives, Brazil, the United States.", answer: "the Maldives, the United States" },
        ],
      },
    ],
  },
];

export const odL3U7Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u07-check",
    title: "Quick check: time words, will and the",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 7 time words", "future facts with will", "the with country names"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "60 seconds. Which word?", answer: "minute" },
          { q: "To turn around and around, like the Earth. Which word?", answer: "spin" },
          { q: "An area of the world where everyone uses the same time. Which words?", answer: "time zone" },
          { q: "12 o'clock in the middle of the day. Which word?", answer: "noon" },
        ],
      },
      {
        title: "Grammar: will and the",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one word where it does not.",
        marksEach: 1,
        items: [
          { q: "In one hour, it ___ be noon. (will / is)", answer: "will" },
          { q: "It ___ be dark at noon. (will / won't)", answer: "won't" },
          { q: "Correct the mistake: In two hours, it will six o'clock.", answer: "In two hours, it will be six o'clock." },
          { q: "We will visit ___ United Kingdom. (the / no word)", answer: "the" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u07-test",
    title: "Unit 7 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 time words and the four article words",
      "Using diagrams to understand a text",
      "Future facts with will and won't",
      "The with country names",
      "Reading: a short text about a call across time zones",
      "Writing: a trip to a different time zone",
      "Speaking: time, weather and trips",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A(n) ___ is 60 minutes.", options: ["second", "hour", "month", "year"], answer: "hour" },
          { q: "The Earth takes one ___ to go once around the sun.", options: ["day", "hour", "year", "week"], answer: "year" },
          { q: "The Earth ___ on its axis once a day.", options: ["spins", "orbits", "multiplies", "measures"], answer: "spins" },
          { q: "The Earth ___ the sun once a year.", options: ["spins", "multiplies", "measures", "orbits"], answer: "orbits" },
          { q: "12 o'clock in the middle of the day is ___.", options: ["midnight", "a month", "a second", "noon"], answer: "noon" },
          { q: "Hanoi and Tokyo have different times because they are in different ___.", options: ["planets", "time zones", "minutes", "axes"], answer: "time zones" },
          { q: "To find the seconds in 5 minutes, you ___ 5 by 60.", options: ["orbit", "spin", "multiply", "cut"], answer: "multiply" },
          { q: "A very big round object that goes around a star is a ___.", options: ["diagram", "planet", "second", "month"], answer: "planet" },
          { q: "A clock that shows exactly the right time is ___.", options: ["short", "opposite", "accurate", "dark"], answer: "accurate" },
        ],
      },
      {
        title: "Grammar: future facts with will",
        skill: "Grammar",
        instructions: "Choose or write the answer. Remember: after will we use the plain verb, and a clock time needs be.",
        marksEach: 1,
        items: [
          { q: "In two hours, it ___ be four o'clock.", options: ["is", "does", "will"], answer: "will" },
          { q: "The sun ___ be up at midnight in Hanoi.", options: ["doesn't", "won't", "isn't"], answer: "won't" },
          { q: "Correct the mistake: The sun will rises at six.", answer: "The sun will rise at six." },
          { q: "Correct the mistake: In one hour, it will noon.", answer: "In one hour, it will be noon." },
          { q: "Make it a question: It will be noon in one hour.", answer: "Will it be noon in one hour?" },
          { q: "It is nine o'clock in the morning now. Write what time it will be in three hours.", answer: "It will be twelve o'clock (noon)." },
        ],
      },
      {
        title: "Grammar: the with country names",
        skill: "Grammar",
        instructions: "Choose the right answer, or write the sentence. Check the name: is it plural? Does it have Kingdom, Republic or States?",
        marksEach: 1,
        items: [
          { q: "My cousin lives in ___ Netherlands.", options: ["the", "no word"], answer: "the" },
          { q: "We will fly to ___ Japan.", options: ["the", "no word"], answer: "no word" },
          { q: "She wants to visit ___ United Kingdom.", options: ["no word", "the"], answer: "the" },
          { q: "Correct the mistake: Dubai is in United Arab Emirates.", answer: "Dubai is in the United Arab Emirates." },
          { q: "Correct the mistake: Look at moon!", answer: "Look at the moon!" },
          { q: "Which country name needs the?", options: ["Spain", "Peru", "the Philippines"], answer: "the Philippines" },
        ],
      },
      {
        title: "Reading: a call to Tokyo",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "My cousin lives in Tokyo, in Japan. Tokyo is two hours ahead of Hanoi, where I live. On Sunday, I will call my cousin on the computer. We will talk at six o'clock in the evening in Hanoi. My mom says, 'It will be eight o'clock in Tokyo, so your cousin will be at the dinner table.' She is right! My cousin always goes to bed at nine o'clock Tokyo time, so I won't talk for long. After the call, I will make a poster. It will have a drawing of the Earth with two small flags, one for Hanoi and one for Tokyo. I think the poster will help my class understand time zones.",
        marksEach: 1,
        items: [
          { q: "Tokyo is two hours behind Hanoi.", options: ["True", "False"], answer: "False" },
          { q: "When will the writer call the cousin?", options: ["On Saturday morning", "On Sunday evening", "On Monday afternoon"], answer: "On Sunday evening" },
          { q: "What time will it be in Tokyo during the call?", options: ["four o'clock", "six o'clock", "eight o'clock"], answer: "eight o'clock" },
          { q: "What time is it in Hanoi when the cousin goes to bed?", options: ["nine o'clock", "eleven o'clock", "seven o'clock"], answer: "seven o'clock" },
          { q: "Why won't the writer talk for long?", options: ["The cousin goes to bed at nine o'clock, Tokyo time.", "The computer will stop.", "It will be dark in Hanoi."], answer: "The cousin goes to bed at nine o'clock, Tokyo time." },
          { q: "What will the writer make after the call?", options: ["a clock", "a cake", "a poster"], answer: "a poster" },
          {
            q: "Why will the poster help the class? Give one reason from the text.",
            answer: "e.g. It will show the Earth with a flag for Hanoi and a flag for Tokyo, so the class can see two time zones.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a journey from Hanoi to somewhere in another time zone. Say where you will go, how long the trip will take and what time it will be there when it is a certain time in Hanoi. Use will or won't at least twice and the with a country name that needs it. Marks (5): a clear first sentence, how long it will take, a correct will sentence, a correct the with a country name, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe a trip to a different time zone.",
            answer:
              "e.g. I live in Hanoi, in Vietnam. Next year, I will fly to the United Kingdom with my family. The trip will take about thirteen hours. London is seven hours behind Hanoi in winter, so when it is noon in Hanoi, it will be five o'clock in the morning there. I won't sleep much, but I will see a new city. I think the trip will be great.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose a city in a different time zone. Talk for about one minute: say where it is, what time it is there when it is noon in Hanoi, what the weather will be like tomorrow and what you will do if you go there. Then answer two questions from the teacher.",
      prompts: [
        "What time is it in your city when it is noon in Hanoi?",
        "What will the weather be like tomorrow?",
        "How long will the trip take?",
        "How do we measure time? Give one example.",
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
            "Uses unit words correctly and naturally (time zone, hour, noon, orbit, spin, accurate).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the city only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: will and the",
          bands: [
            "Uses will and won't correctly more than once, with the plain verb and be where needed, and the with country names correctly.",
            "Uses will correctly at least once; one small slip, such as a missing be, an -s after will or a missing the.",
            "Tries will but often forgets be or adds -s; the is often missing or wrong.",
            "No will or the; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains the time, the weather and the trip clearly, with a reason and an example.",
            "Gives the time and one other idea with a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
