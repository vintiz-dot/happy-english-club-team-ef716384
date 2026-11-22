// Reach Higher 3A, Unit 4 (Let's Work Together): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test, and the full
// end-of-unit test. The mid-unit quiz runs in Lesson 4, the mock (about 30 minutes,
// a short paragraph at the end) in Lesson 8, and the unit test on the class date
// after Lesson 8. Every item and every reading passage are the school's own;
// nothing from the Student Book, the publisher's unit test or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U4Assessments: Assessment[] = [
  {
    id: "rh-l3-u4-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["verb patterns", "present simple / continuous", "suggestions and replies", "phrasal verbs", "word stress"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "We enjoy ___ in the school garden.", options: ["work", "to work", "working", "worked"], answer: "working" },
          { q: "Listen! The children ___ in the next room.", options: ["are singing", "sing", "sings", "singing"], answer: "are singing" },
          { q: "'How about making a poster?' - '___'", options: ["Yes, I do.", "You're welcome.", "That's all right.", "Good idea!"], answer: "Good idea!" },
          { q: "The maths problem was hard, but we ___ it out.", options: ["gave", "worked", "set", "looked"], answer: "worked" },
          { q: "Which word has the stress on the second syllable?", options: ["market", "reward", "money", "farmer"], answer: "reward" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the verb in brackets.",
        marksEach: 1,
        items: [
          { q: "My father (not drink) ___ coffee in the evening.", answer: "doesn't drink" },
          { q: "Would you like (join) ___ our club?", answer: "to join" },
          { q: "Our teacher made us (write) ___ the story again.", answer: "write" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Why don't we going to the park?", answer: "going → go" },
          { q: "She is knowing all the answers.", answer: "is knowing → knows" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u4-mock",
    title: "Unit mock test (selective-school format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "verb patterns", "agreement", "modals", "conditionals", "dialogue replies", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "vowel sound (al / aw / au)", options: ["draw", "small", "hawk", "cake"], answer: "cake" },
          { q: "stress", options: ["conserve", "harvest", "farmer", "method"], answer: "conserve" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "You ___ bring a dictionary. I have one for you.", options: ["mustn't", "can't", "don't have to", "shouldn't to"], answer: "don't have to" },
          { q: "Everyone in my class ___ a library card.", options: ["have", "are having", "having", "has"], answer: "has" },
          { q: "If I ___ a bird, I would fly over Hạ Long Bay.", options: ["am", "were", "was being", "will be"], answer: "were" },
          { q: "She is good at ___ problems.", options: ["solve", "to solve", "solving", "solved"], answer: "solving" },
          { q: "'Thank you for your help.' - '___'", options: ["It was my pleasure.", "Good idea.", "Yes, please.", "I'd love to."], answer: "It was my pleasure." },
          { q: "If we work together, we ___ the job by noon.", options: ["finish", "would finish", "will finish", "finished"], answer: "will finish" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "If it will rain tomorrow, we will stay at home.", answer: "will rain → rains" },
          { q: "My mother let me to stay up late at Tết.", answer: "to stay → stay" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the notice and the text. Choose the best answer or write a short answer.",
        passage:
          "GREEN SATURDAY - Volunteers needed! Meet at the school gate at 7:00 a.m. Bring gloves and a water bottle. You don't have to bring bags; we will give you some.\n\nLast month, forty students from our school cleaned the beach at Cửa Lò. They worked in teams of five. One person counted the rubbish, two collected plastic and two collected glass. By lunchtime they had filled sixty bags. 'If we hadn't worked in teams, we wouldn't have finished,' said Minh, one of the leaders.",
        marksEach: 1,
        items: [
          { q: "1. What must volunteers bring?", options: ["gloves and a water bottle", "bags and gloves", "only a water bottle", "nothing"], answer: "gloves and a water bottle" },
          { q: "2. How many students were in each team?", answer: "Five." },
          { q: "3. How many bags did they fill?", answer: "Sixty." },
          { q: "4. Why, according to Minh, did they finish?", answer: "Because they worked in teams." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "It isn't necessary for you to wear a tie. → You don't ...", answer: "You don't have to wear a tie." },
          { q: "I don't know her number, so I can't call her. → If I ...", answer: "If I knew her number, I could / would call her." },
          { q: "\"I am very busy,\" said my aunt. → My aunt said ...", answer: "My aunt said (that) she was very busy." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a time you worked with other people to get something done. Say what you did, who helped, and what you learned.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u4-test",
    title: "Unit 4 test: Let's Work Together",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "Unit 4 key words (Parts 1 and 2)",
      "present-tense action verbs and subject-verb agreement",
      "forms of be and have",
      "helping verbs: can, could, should, may, must, have to; mustn't vs don't have to",
      "verb patterns, suggestions, second conditional (exam strand)",
      "error correction, sentence rewrites, word formation",
      "reading an original text",
      "a 70-100 word opinion paragraph on the Big Question",
      "speaking: a 2-minute talk on the Big Question",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the word that best completes each sentence.",
        marksEach: 1,
        items: [
          { q: "1. The fruit ___ shouted, 'Fresh mangoes, only 20,000 đồng a kilo!'", options: ["buyer", "purpose", "reward", "seller"], answer: "seller" },
          { q: "2. We saw an ___ for the new phone on a big screen in the street.", options: ["harvest", "advertisement", "alternative", "reward"], answer: "advertisement" },
          { q: "3. Moving the piano upstairs needed the ___ of six people.", options: ["purpose", "cooperation", "method", "market"], answer: "cooperation" },
          { q: "4. Don't hurry. We have ___ of time before the bus comes.", options: ["reward", "future", "field", "plenty"], answer: "plenty" },
          { q: "5. The ___ of the meeting is to choose a class captain.", options: ["purpose", "buyer", "crop", "plow"], answer: "purpose" },
          { q: "6. {s1} got a ___ for finding the lost dog: a big box of cakes!", options: ["market", "method", "reward", "conservation"], answer: "reward" },
          { q: "7. In autumn the farmers ___ the golden rice.", options: ["pay", "sustain", "accomplish", "harvest"], answer: "harvest" },
          { q: "8. Before planting, the farmer had to ___ the field with a buffalo.", options: ["harvest", "plow", "pay", "sell"], answer: "plow" },
          { q: "9. There was no rice left, so we cooked noodles as an ___.", options: ["agriculture", "seller", "alternative", "reward"], answer: "alternative" },
          { q: "10. Turning off the tap while you brush your teeth helps water ___.", options: ["conservation", "cooperation", "advertisement", "method"], answer: "conservation" },
        ],
      },
      {
        title: "Part B. Grammar A: the unit's grammar",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "1. My grandmother ___ tea every morning.", options: ["drink", "is drink", "drinks", "drinking"], answer: "drinks" },
          { q: "2. Look! The children ___ the classroom together.", options: ["are cleaning", "cleans", "is cleaning", "clean"], answer: "are cleaning" },
          { q: "3. Everyone in the team ___ a different job.", options: ["have", "are having", "having", "has"], answer: "has" },
          { q: "4. Both of my sisters ___ good at maths.", options: ["is", "are", "am", "has"], answer: "are" },
          { q: "5. My uncle ___ a small farm near Hà Nội.", options: ["have", "has", "is", "are"], answer: "has" },
          { q: "6. You ___ bring lunch tomorrow. The school will give us food.", options: ["mustn't", "doesn't have to", "has to", "don't have to"], answer: "don't have to" },
          { q: "7. You ___ swim in this river. It is too dangerous.", options: ["mustn't", "don't have to", "could", "may"], answer: "mustn't" },
          { q: "8. My little brother ___ ride a bike when he was four.", options: ["can", "must", "could", "should"], answer: "could" },
          { q: "9. It's cold outside. You ___ wear a coat.", options: ["mustn't", "don't have to", "are", "should"], answer: "should" },
        ],
      },
      {
        title: "Part C. Grammar B: correct, rewrite, form",
        skill: "Grammar",
        instructions: "1-3: each sentence has one mistake; write the wrong word and the correction. 4-6: rewrite the sentence so that it means the same, starting with the words given. 7-9: write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "1. Nobody in my class want to give up.", answer: "want → wants" },
          { q: "2. We enjoyed to work in teams.", answer: "to work → working" },
          { q: "3. If I am you, I would ask the teacher for help.", answer: "am → were" },
          { q: "4. It isn't necessary to bring an umbrella. → You don't ...", answer: "You don't have to bring an umbrella." },
          { q: "5. How about planting a tree for Tết? → Why don't ...?", answer: "Why don't we plant a tree for Tết?" },
          { q: "6. I don't have a ladder, so I can't help you. → If I ...", answer: "If I had a ladder, I could / would help you." },
          { q: "7. Our team won because of good ___. (cooperate)", answer: "cooperation" },
          { q: "8. There were a lot of ___ at the night market. (sell)", answer: "sellers" },
          { q: "9. Thank you! You were very ___ today. (help)", answer: "helpful" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Questions 1-2: choose the best answer. Questions 3-4: write True or False. Questions 5-6: answer in a few words.",
        passage:
          "Every October, Lan's family goes back to Grandpa's village in Thái Bình to help with the rice harvest. This year Grandpa was ill, so he could not work in the fields. \"The rain is coming in a week,\" he said. \"How can we finish in time?\"\n\nLan had an idea. She made a poster and put it up at the village shop: \"Harvest Day on Saturday! Free lunch for every helper!\" On Saturday morning, twenty neighbours arrived. The adults cut the rice, the teenagers carried it to the road, and the younger children brought water and counted the bags. Lan's mother and aunts cooked lunch for everyone.\n\nBy four o'clock, the whole field was finished. \"Alone, I would need ten days,\" Grandpa laughed. \"Together, you did it in one!\" Next month, Lan's family is going to help the neighbours with their harvest too.",
        marksEach: 2,
        items: [
          { q: "1. Why couldn't Grandpa work in the fields this year?", options: ["It was raining.", "He was ill.", "He was in Hà Nội.", "He was cooking lunch."], answer: "He was ill." },
          { q: "2. What did Lan do to get help?", options: ["She paid the neighbours.", "She cut the rice alone.", "She made a poster for the village shop.", "She phoned her teacher."], answer: "She made a poster for the village shop." },
          { q: "3. Twenty neighbours came to help on Saturday.", options: ["True", "False"], answer: "True" },
          { q: "4. The younger children cut the rice.", options: ["False", "True"], answer: "False" },
          { q: "5. How long did the work take with everyone's help?", answer: "One day (they finished by four o'clock)." },
          { q: "6. How is Lan's family going to thank the neighbours?", answer: "They are going to help the neighbours with their harvest next month." },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions: "Write 70-100 words: What's the best way to get things done? Give your opinion, two reasons, one example from your own life or from a story in this unit, and a conclusion.",
        marksEach: 10,
        items: [
          {
            q: "Your paragraph (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each: (1) content: a clear opinion, two reasons and an example, on the question; (2) organisation: opening opinion, linkers (firstly, also, for example, in conclusion), a conclusion; (3) grammar: present tenses and agreement, helping verbs, one conditional, few errors; (4) vocabulary: at least three unit key words used correctly, spelling.",
          },
        ],
      },
    ],
    speaking: {
      task: "Talk for 2 minutes: What's the best way to get things done? Give your opinion with reasons and examples (from your family, school, or a story in this unit). Then answer the teacher's follow-up questions.",
      prompts: [
        "Tell me about a time you worked in a team. What was the goal, and who did what?",
        "When is it better to work alone? Give an example.",
        "In \"I've Got This\", why did Manuel change his mind? What would you have done?",
        "If you were a farmer, would you change to a new method? Why or why not?",
        "How do people in your neighbourhood work together at Tết?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Speaks for the full 2 minutes with few pauses; ideas follow on naturally.",
            "Speaks for most of the time; some pauses to find words, but keeps going.",
            "Speaks for about a minute; frequent pauses and restarts.",
            "Gives short answers only; needs many prompts.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses present tenses, helping verbs and a conditional correctly; agreement nearly always right.",
            "Uses present tenses and helping verbs with some errors that do not block meaning.",
            "Mostly simple sentences; agreement and verb-form errors are frequent.",
            "Single words or fragments; errors often block meaning.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses four or more unit key words naturally and precisely (cooperation, accomplish, method ...).",
            "Uses two or three unit key words correctly; some repetition.",
            "Uses one key word or very general words (good, help, do).",
            "Vocabulary too limited to express the ideas.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear sounds and word stress; answers follow-up questions fully and asks or adds ideas.",
            "Mostly clear; answers follow-up questions with some detail.",
            "Sometimes hard to understand; answers follow-ups briefly.",
            "Often hard to understand; does not respond to follow-up questions.",
          ],
        },
      ],
    },
  },
];
