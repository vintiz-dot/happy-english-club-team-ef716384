// Oxford Discover 2nd edition, Level 3, Unit 4 (Why People Move): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. The test sits after Lesson 6 (the Grammar Champions
// lesson, which follows the Wrap Up for Units 3 and 4); the quick check is run from the check slide in Lesson 4.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U4Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ if / when
  {
    id: "od2e-l3-u04-ws-if-when",
    title: "Present real conditional: if and when",
    grammar: "If + present, + present",
    deckId: "od2e-l3-u04-l3",
    slide: "Present real conditional: if and when",
    intro:
      "Use if or when to say what happens after something else happens. Both parts use the present tense: 'If I'm hungry, I eat a snack.' When the sentence starts with if or when, put a comma after the first part. The parts can swap places, and then there is no comma: 'I eat a snack if I'm hungry.'",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "If I'm hungry, I ___ a snack.  (eat / eating)  ->  eat",
        items: [
          { q: "If I'm hungry, I ___ a snack.", options: ["eat", "eating"], answer: "eat" },
          { q: "If she is tired, she ___ to bed early.", options: ["go", "goes"], answer: "goes" },
          { q: "___ it rains, we stay inside.", options: ["If", "Because"], answer: "If" },
          { q: "If water gets very cold, it ___ into ice.", options: ["turn", "turns"], answer: "turns" },
          { q: "Which sentence is correct?", options: ["When I'm thirsty, I drink water.", "When I'm thirsty I drink water."], answer: "When I'm thirsty, I drink water." },
          { q: "If you ___ in a rural area, you can see farms.", options: ["lives", "live"], answer: "live" },
          { q: "If my brother is sleepy, he ___.", options: ["yawns", "yawn"], answer: "yawns" },
          { q: "If the sun comes out, ___.", options: ["it warm", "it gets warm"], answer: "it gets warm" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or write the whole sentence as asked.",
        example: "If I ___ sleepy, I go to bed early. (be)  ->  am",
        items: [
          { q: "If I ___ sleepy, I go to bed early. (be)", answer: "am" },
          { q: "When my sister ___ nervous, she takes a deep breath. (feel)", answer: "feels" },
          { q: "Join the ideas, starting with If: I'm thirsty. I drink water.", answer: "If I'm thirsty, I drink water." },
          { q: "Join the ideas, starting with When: It's very hot. We go swimming.", answer: "When it's very hot, we go swimming." },
          { q: "Correct the mistake: If he hungry, he eats a snack.", answer: "If he is hungry, he eats a snack." },
          { q: "Correct the mistake: If it rains I take an umbrella.", answer: "If it rains, I take an umbrella." },
          { q: "Correct the mistake: When she is tired, she sleep.", answer: "When she is tired, she sleeps." },
          { q: "Finish the sentence: If a family needs a doctor, they go to ...", answer: "e.g. a clinic or a hospital." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Read carefully. Some answers need a sentence of your own, so check every comma and every verb ending.",
        example: "I wear a coat if it is cold.  ->  If it is cold, I wear a coat.",
        items: [
          { q: "Write two sentences about what you do when you are excited. One uses if, the other uses when.", answer: "e.g. If I am excited, I talk very fast. When I am excited, I jump up and down." },
          {
            q: "Find and fix three mistakes: 'If my brother is hungry he eats noodles. When it will rain, we stay home. If I am tired, I sleeps.'",
            answer: "a comma after hungry; When it rains; I sleep.",
          },
          { q: "Reverse the sentence without changing its meaning: I wear a coat if it is cold.", answer: "If it is cold, I wear a coat." },
          { q: "Why do we not write 'will' in 'If it rains, I take an umbrella' when it is always true?", answer: "e.g. Because it is always true, so both parts use the present tense." },
          { q: "Write a sentence with if about why people move. Use a town and a new factory.", answer: "e.g. If a town has a new factory, people move there for jobs." },
          { q: "Write a true sentence about you and a place near you. Use when and a comma.", answer: "e.g. When it is the weekend, I go to the park with my cousins." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ why / because
  {
    id: "od2e-l3-u04-ws-because",
    title: "Why and because",
    grammar: "Why ...? Because ...",
    deckId: "od2e-l3-u04-l4",
    slide: "Why and because: giving reasons",
    intro:
      "Why asks for a reason. Because gives it. When we talk, a short answer is fine: 'Because it's quiet.' When we write, we use a complete sentence with a subject and a verb: 'I like the suburb because it is quiet.' In English use because OR so in one sentence, never both.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "___ did they move? Because there was a new job.  (Why / What)  ->  Why",
        items: [
          { q: "___ did they move? Because there was a new job.", options: ["Why", "What"], answer: "Why" },
          { q: "They moved ___ the father got a new job.", options: ["so", "because"], answer: "because" },
          { q: "Which is a complete sentence?", options: ["We moved because the school is better.", "Because the school is better."], answer: "We moved because the school is better." },
          { q: "Why do you like the suburb? ___ it is quiet.", options: ["But", "Because"], answer: "Because" },
          { q: "Which sentence is correct?", options: ["She likes the zoo because she loves animals.", "She likes the zoo because loves animals."], answer: "She likes the zoo because she loves animals." },
          { q: "I like living in the city ___ there are many shops.", options: ["why", "because"], answer: "because" },
          { q: "Why ___ you move last year?", options: ["did", "are"], answer: "did" },
          { q: "Which sentence is wrong?", options: ["Because it rains, I stay home.", "Because it rains, so I stay home."], answer: "Because it rains, so I stay home." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or write the whole sentence as asked.",
        example: "My uncle moved to the city ___ he wanted a new job.  ->  because",
        items: [
          { q: "My uncle moved to the city ___ he wanted a new job.", answer: "because" },
          { q: "Answer in a full sentence: Why do people go to a hospital? (They are ill.)", answer: "People go to a hospital because they are ill." },
          { q: "Join the ideas with because: We went to the zoo. We love animals.", answer: "We went to the zoo because we love animals." },
          { q: "Correct the mistake: Because it is quiet, so I like the suburb.", answer: "I like the suburb because it is quiet. (or: Because it is quiet, I like the suburb.)" },
          { q: "Correct the mistake: They moved because a new job.", answer: "They moved because they got a new job." },
          { q: "Correct the mistake: Why you like rural areas?", answer: "Why do you like rural areas?" },
          { q: "Make a question with why: She studies at a university.", answer: "Why does she study at a university?" },
          { q: "Write a reason: I like my neighborhood because ...", answer: "e.g. I like my neighborhood because there is a big park." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own.",
        example: "Because the school is better.  ->  We moved because the school is better.",
        items: [
          { q: "Write two sentences about the same reason: one with because in the middle, one that starts with Because and has a comma.", answer: "e.g. We moved to the suburb because it is quiet. Because it is quiet, we moved to the suburb." },
          {
            q: "Fix this: 'My cousin moved to Australia. Because she wanted to study.' Why is the second part a mistake in writing?",
            answer: "My cousin moved to Australia because she wanted to study. The second part is not a complete sentence.",
          },
          { q: "Write a question with why about a person who moved, and answer it in a full sentence.", answer: "e.g. Why did Omar's family move to a suburb? Omar's family moved to a suburb because his mother got a job in the city." },
          { q: "Write three reasons why a family might choose a suburb. Use because once.", answer: "e.g. Families like suburbs because they have space. Houses can have gardens. Schools and parks are close." },
          { q: "When is it okay to answer with only 'Because it is quiet.' and when is it not?", answer: "e.g. It is okay when we speak and answer a why question. In writing we need a complete sentence." },
          { q: "Write a complete sentence with because about the kind of place you like the most.", answer: "e.g. I like urban areas the most because there is always something to do." },
        ],
      },
    ],
  },
];

export const odL3U4Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u04-check",
    title: "Quick check: place words and if sentences",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 4 place words", "present real conditional (if and when)"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A big building with many shops. Which word?", answer: "shopping mall" },
          { q: "A place where machines make things such as clothes or cars. Which word?", answer: "factory" },
          { q: "A small place where you see a doctor for a simple problem. Which word?", answer: "clinic" },
          { q: "The area at the edge of a city with many family homes. Which word?", answer: "suburb" },
        ],
      },
      {
        title: "Grammar: if and when",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: If she ___ thirsty, she drinks water. (be)", answer: "is" },
          { q: "Complete: When it rains, I ___ an umbrella. (take)", answer: "take" },
          { q: "Correct the mistake: If I am tired I go to bed.", answer: "If I am tired, I go to bed." },
          { q: "'When I'm hungry, I eat a snack' tells us what happens every time.", options: ["True", "False"], answer: "True" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u04-test",
    title: "Unit 4 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "The 10 place words: country and suburb; rural area and urban area; shopping mall and university; hospital, factory, clinic and zoo",
      "Words from the reading: belongings, immigrant, move abroad and experiences",
      "Present real conditional: if and when",
      "Why and because, and complete sentences",
      "Suffixes for countries: -ese, -ian, -ish",
      "Reading: a family that moves for a job",
      "Writing: a short letter about moving",
      "Speaking: why people move",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "A land with its own government and people, such as Japan or Brazil.", answer: "country" },
          { q: "The area at the edge of a city with many family homes.", options: ["factory", "suburb", "zoo"], answer: "suburb" },
          { q: "A place in the countryside with farms and few people.", answer: "rural area" },
          { q: "A busy place with many buildings and people, like a big city.", answer: "urban area" },
          { q: "A big building with many shops.", options: ["clinic", "university", "shopping mall"], answer: "shopping mall" },
          { q: "A place where adults study after school.", answer: "university" },
          { q: "A big place where very ill people get care and can stay the night.", options: ["hospital", "clinic", "factory"], answer: "hospital" },
          { q: "A place where machines make things.", answer: "factory" },
          { q: "A small place where you see a doctor for a simple problem.", options: ["hospital", "clinic", "zoo"], answer: "clinic" },
          { q: "A place where animals live and people visit to see them.", answer: "zoo" },
          { q: "Everything a person owns and takes with them when they move.", options: ["experiences", "immigrant", "belongings"], answer: "belongings" },
          { q: "A person who moves to live in a different country.", options: ["immigrant", "belongings", "suburb"], answer: "immigrant" },
        ],
      },
      {
        title: "Grammar: present real conditional",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "If I'm sleepy, I ___ to bed early.", options: ["go", "going"], answer: "go" },
          { q: "When my brother feels nervous, he ___ a deep breath.", options: ["take", "takes"], answer: "takes" },
          { q: "Which sentence is correct?", options: ["If it rains, we stay inside.", "If it rains we stays inside."], answer: "If it rains, we stay inside." },
          { q: "Correct the mistake: If she hungry, she eats a snack.", answer: "If she is hungry, she eats a snack." },
          { q: "Correct the mistake: When water gets very hot it boils.", answer: "When water gets very hot, it boils." },
          { q: "Write a sentence with if about what you do when you are thirsty.", answer: "e.g. If I am thirsty, I drink water." },
        ],
      },
      {
        title: "Grammar: why and because",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "___ did the family move? Because the mother has a new job.", options: ["Where", "Why"], answer: "Why" },
          { q: "They moved to a suburb ___ it is quiet.", options: ["because", "so"], answer: "because" },
          { q: "Which is a complete sentence for writing?", options: ["Because I love animals.", "I like the zoo because I love animals."], answer: "I like the zoo because I love animals." },
          { q: "Correct the mistake: Because it is cold, so I wear a coat.", answer: "Because it is cold, I wear a coat. (or: I wear a coat because it is cold.)" },
          { q: "Correct the mistake: Why you like the city?", answer: "Why do you like the city?" },
          { q: "Write a complete sentence with because about the kind of place you like.", answer: "e.g. I like the suburb because it is quiet and it has a park." },
        ],
      },
      {
        title: "Word study: suffixes for countries",
        skill: "Grammar",
        instructions: "Write the word for a person from each country. Use -ese, -ian or -ish.",
        marksEach: 1,
        items: [
          { q: "Brazil: a person from Brazil is ___.", answer: "Brazilian" },
          { q: "Japan: a person from Japan is ___.", answer: "Japanese" },
          { q: "Ireland: a person from Ireland is ___.", answer: "Irish" },
          { q: "Australia: a person from Australia is ___.", answer: "Australian" },
          { q: "Sweden: a person from Sweden is ___.", answer: "Swedish" },
          { q: "China: a person from China is ___.", answer: "Chinese" },
        ],
      },
      {
        title: "Reading: a family that moves",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Omar lived in a small village in a rural area with his parents and his grandmother. Most people there worked on farms, and the nearest hospital was two hours away by bus. Last year, Omar's mother got a job at a big hospital in a city. The trip from the village took three hours every day, so the family moved to a suburb near the city. Omar missed the quiet fields at first, but his new home has a library, a park and a clinic only five minutes away. He also found two new friends at school, and now they play football in the park every weekend. If he feels homesick, he looks at the photographs of the village on his wall and then writes a letter to his cousin.",
        marksEach: 1,
        items: [
          { q: "Omar lived in a village in a rural area.", options: ["True", "False"], answer: "True" },
          { q: "Omar's father got a new job at a hospital.", options: ["True", "False"], answer: "False" },
          { q: "The new home has a clinic five minutes away.", options: ["True", "False"], answer: "True" },
          { q: "Why did the family move to a suburb?", options: ["Omar wanted a bigger garden.", "Omar's mother got a job at a hospital in the city.", "The village school closed."], answer: "Omar's mother got a job at a hospital in the city." },
          { q: "What is the main idea of the text?", options: ["Omar plays football every day.", "Villages have no hospitals.", "A family moves because of a job."], answer: "A family moves because of a job." },
          { q: "Name two details that show the suburb is a good place for Omar. Answer in your own words.", answer: "e.g. There is a library, a park and a clinic close by, and he made two new friends." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a person or a family who moved to a new place (real or invented). Say where they lived, where they moved and why. Use because, and one if or when sentence. Marks (5): a clear first sentence, where from and where to, a complete because sentence, an if or when sentence with a comma, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about a person or family who moved to a new place.",
            answer:
              "e.g. Lena's family lived in a small village. They moved to the city because her father got a job at a university. Lena was nervous at first, but she made friends quickly. If she feels homesick, she calls her grandmother. The new school is bigger than the old one, and Lena likes it.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about one minute about why people move to new places. Choose one reason (a job, a service such as a hospital, or a new experience), explain it, and tell what you would do if you moved. Then answer two questions from the teacher.",
      prompts: [
        "Why do some families move from a rural area to an urban area?",
        "Why do some families like a suburb? What can children do there?",
        "What do you do when you feel nervous about something new?",
        "Which place would you like to live in? Why? Give two reasons.",
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
            "Uses unit words correctly and naturally (place words, move abroad, immigrant, experiences).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the place only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: if / when and because",
          bands: [
            "Uses an if or when sentence and a because sentence correctly, more than once.",
            "Uses both correctly at least once; one small slip, such as a missing is or -s.",
            "Tries them but with errors (because ... so, if he hungry); only one is used.",
            "Neither; uses only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Gives a clear reason for moving, with an example and a personal opinion.",
            "Gives a reason with a simple example.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
