// Oxford Discover 2nd edition, Level 3, Unit 2 (Games, Friends and Fun): the
// unit's printable grammar worksheets (three levels each, with answer keys), the
// quick check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U2Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ gerunds
  {
    id: "od2e-l3-u02-ws-gerunds",
    title: "Gerunds: verb + -ing",
    grammar: "Swimming is fun. / I enjoy skipping. / She is good at dancing.",
    deckId: "od2e-l3-u02-l3",
    slide: "Gerunds: verb + -ing",
    intro:
      "A gerund is a verb with -ing that names an activity: Swimming is fun. Use it as the subject, after like, love, enjoy and hate, and after at. A gerund is singular (Running IS good for you). Spelling: dance, dancing (drop the e); skip, skipping (double the last letter); play, playing (just add -ing).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "___ is fun.  (Swimming / Swim)  ->  Swimming",
        items: [
          { q: "___ is fun.", options: ["Swim", "Swimming"], answer: "Swimming" },
          { q: "I like ___ with my friends.", options: ["dancing", "dance"], answer: "dancing" },
          { q: "Running ___ good for you.", options: ["are", "is"], answer: "is" },
          { q: "She enjoys ___ the ball.", options: ["kicking", "kick"], answer: "kicking" },
          { q: "Which spelling is correct?", options: ["skiping", "skipping"], answer: "skipping" },
          { q: "Which spelling is correct?", options: ["dancing", "danceing"], answer: "dancing" },
          { q: "He is good at ___ the ball.", options: ["bouncing", "bounce"], answer: "bouncing" },
          { q: "Which sentence is correct?", options: ["I like to skip.", "I like skip."], answer: "I like to skip." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the gerund of the verb in brackets. For the rewrite and correct questions, write the whole sentence.",
        example: "___ is good for you. (swim)  ->  Swimming",
        items: [
          { q: "___ is fun with friends. (skip)", answer: "Skipping" },
          { q: "My brother enjoys ___ at the weekend. (run)", answer: "running" },
          { q: "___ makes me happy. (dance)", answer: "Dancing" },
          { q: "We love ___ in the lake. (swim)", answer: "swimming" },
          { q: "Rewrite with a gerund as the subject: It is fun to play tag.", answer: "Playing tag is fun." },
          { q: "Correct the mistake: Swim is good for you.", answer: "Swimming is good for you." },
          { q: "Correct the mistake: Running are fun.", answer: "Running is fun." },
          { q: "Correct the mistake: She likes danceing.", answer: "She likes dancing." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every ending and every is or are.",
        example: "I like to play football.  ->  I like playing football.",
        items: [
          { q: "Make one sentence from these words: kick / is / the ball / fun.", answer: "Kicking the ball is fun." },
          {
            q: "Find and fix three mistakes: 'Skiping are fun. I enjoy to swim. She is good at danceing.'",
            answer: "Skipping is fun. I enjoy swimming. She is good at dancing.",
          },
          { q: "Explain the difference: 'He is skipping now' and 'Skipping is fun'.", answer: "e.g. In the first sentence skipping is what he is doing now (with is). In the second it names the activity and is the subject of the sentence." },
          { q: "Write two sentences about a friend or family member, one with enjoy and one with good at, both with a gerund.", answer: "e.g. My cousin enjoys fishing. My sister is good at swimming." },
          { q: "Why do we write skipping and not skiping? Answer in one sentence.", answer: "e.g. The verb is short, with one vowel and one consonant, so we double the last letter before -ing." },
          { q: "Write a true sentence with a gerund as the subject and a reason with because.", answer: "e.g. Reading is good for me because it helps me learn new words." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ question words
  {
    id: "od2e-l3-u02-ws-questions",
    title: "Question words",
    grammar: "who, what, where, when, why, how + do / does / did",
    deckId: "od2e-l3-u02-l4",
    slide: "Question words",
    intro:
      "A question starts with a question word: who (person), what (thing), where (place), when (time), why (reason), how (way). Then comes do, does or did, then the person, then the plain verb: Where do you play? What does she like? What did you play? With who as the subject there is no helper: Who taught you?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole question aloud.",
        example: "___ do you play tag?  (Where / Who)  ->  Where",
        items: [
          { q: "___ do you play tag?  (a place)", options: ["Where", "Who"], answer: "Where" },
          { q: "___ do you like it?  (a reason)", options: ["Why", "When"], answer: "Why" },
          { q: "What ___ she like?", options: ["does", "do"], answer: "does" },
          { q: "___ taught you the game?  (a person)", options: ["Who", "Where"], answer: "Who" },
          { q: "Which question is correct?", options: ["Where you play?", "Where do you play?"], answer: "Where do you play?" },
          { q: "Which question is correct?", options: ["Why does he like it?", "Why does he likes it?"], answer: "Why does he like it?" },
          { q: "___ do we play?  (a time)", options: ["When", "Why"], answer: "When" },
          { q: "How ___ I win?", options: ["can", "does"], answer: "can" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words. For the rewrite and correct questions, write the whole sentence.",
        example: "___ ___ you play at the weekend? (where)  ->  Where do",
        items: [
          { q: "___ ___ you play at the weekend? (where)", answer: "Where do" },
          { q: "___ ___ your brother like football? (why)", answer: "Why does" },
          { q: "___ ___ you play yesterday? (what)", answer: "What did" },
          { q: "Write the question for the answer: 'My grandfather taught me chess.'", answer: "Who taught you chess?" },
          { q: "Write the question for the answer: 'We play at the lake.'", answer: "Where do you play?" },
          { q: "Correct the mistake: What he likes?", answer: "What does he like?" },
          { q: "Correct the mistake: Where you play tag?", answer: "Where do you play tag?" },
          { q: "Correct the mistake: Who did teach you?", answer: "Who taught you?" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a question of your own, so check the order of the words.",
        example: "You play football where.  ->  Where do you play football?",
        items: [
          {
            q: "Find and fix three mistakes: 'Where you go for fun? Why she likes it? When do you plays?'",
            answer: "Where do you go for fun? Why does she like it? When do you play?",
          },
          { q: "Write three questions for a partner, each with a different question word, about their favorite game.", answer: "e.g. What is your favorite game? Who do you play it with? Why do you like it?" },
          { q: "Explain in one sentence why we say 'Who plays tag?' but 'Where do you play tag?'", answer: "e.g. Who is the subject in the first question, so there is no helper; where is not the subject, so we need do." },
          { q: "Write the question that asks for a reason: 'I like skipping because it is fast.'", answer: "Why do you like skipping?" },
          { q: "Write two questions to find out what a nervous friend is worried about.", answer: "e.g. What are you worried about? Why don't you want to play?" },
          { q: "Write a short question-and-answer pair about when someone plays a game, with a full-sentence answer.", answer: "e.g. When do you play tag? I play tag at break time." },
        ],
      },
    ],
  },
];

export const odL3U2Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u02-check",
    title: "Quick check: game words and gerunds",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 2 words for games, land and water", "gerunds"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A deep valley with very steep sides. Which word?", answer: "canyon" },
          { q: "A small, narrow river. Which word?", answer: "stream" },
          { q: "To hit the ground and jump back up. Which word?", answer: "bounce" },
          { q: "A very high, steep wall of rock. Which word?", answer: "cliff" },
        ],
      },
      {
        title: "Grammar: gerunds",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: ___ is fun. (skip)", answer: "Skipping" },
          { q: "Complete: I enjoy ___ in the lake. (swim)", answer: "swimming" },
          { q: "Correct the mistake: Swim is good for you.", answer: "Swimming is good for you." },
          { q: "'Running is good for you' is correct.", options: ["True", "False"], answer: "True" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u02-test",
    title: "Unit 2 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "Ten words for games, land and water (kick to stream)",
      "Four words from the reading: boa constrictor, toss, landing, balance",
      "Verb phrases with get",
      "Gerunds",
      "Question words",
      "Reading: a day at the lake",
      "Writing: how I have fun",
      "Speaking: how people have fun",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "To hit something with your foot.", answer: "kick" },
          { q: "A chasing game where one player touches the others.", answer: "tag" },
          { q: "To let something fall.", options: ["toss", "skip", "drop"], answer: "drop" },
          { q: "A large, flat area of land.", options: ["canyon", "plain", "cliff"], answer: "plain" },
          { q: "A large area of water with land all around it.", options: ["stream", "plain", "lake"], answer: "lake" },
          { q: "A deep valley with very steep sides.", answer: "canyon" },
          { q: "A very high, steep wall of rock.", answer: "cliff" },
          { q: "A small, narrow river.", options: ["lake", "stream", "cliff"], answer: "stream" },
          { q: "To stay steady and not fall.", options: ["toss", "bounce", "balance"], answer: "balance" },
          { q: "To throw something gently.", options: ["drop", "toss", "kick"], answer: "toss" },
        ],
      },
      {
        title: "Word study: verb phrases with get",
        skill: "Vocabulary",
        instructions: "Choose the right word to complete each verb phrase.",
        marksEach: 1,
        items: [
          { q: "My brother and I always get ___ well. (be friends)", options: ["down", "along"], answer: "along" },
          { q: "She was ill, but now she has got ___ it. (feel better)", options: ["around", "over"], answer: "over" },
          { q: "The cat climbed up the tree. Now it cannot get ___.", options: ["down", "by"], answer: "down" },
          { q: "We have no car, so we get ___ town by bus. (travel)", options: ["along", "around"], answer: "around" },
          { q: "The thief tried to get ___ from the police. (escape)", options: ["away", "over"], answer: "away" },
          { q: "Explain in your own words what get by means.", answer: "e.g. Get by means to manage with just enough of something, for example money or time." },
        ],
      },
      {
        title: "Grammar: gerunds",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "___ is fun with friends.", options: ["Skipping", "Skip"], answer: "Skipping" },
          { q: "My sister enjoys ___ in the lake.", options: ["swim", "swimming"], answer: "swimming" },
          { q: "Dancing ___ good for you.", options: ["are", "is"], answer: "is" },
          { q: "Correct the mistake: She likes danceing.", answer: "She likes dancing." },
          { q: "Correct the mistake: He is good at runing.", answer: "He is good at running." },
          { q: "Write a sentence with a gerund as the subject about a game you know.", answer: "e.g. Playing tag is fun." },
        ],
      },
      {
        title: "Grammar: question words",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "___ do you play after school?  (a place)", options: ["Why", "Where"], answer: "Where" },
          { q: "What ___ she like to play?", options: ["do", "does"], answer: "does" },
          { q: "___ taught you to play the game?  (a person)", options: ["Who", "When"], answer: "Who" },
          { q: "Correct the mistake: Where you play tag?", answer: "Where do you play tag?" },
          { q: "Correct the mistake: Why does he likes the game?", answer: "Why does he like the game?" },
          { q: "Write a question with how to ask a friend about a game's rules.", answer: "e.g. How do you win the game?" },
        ],
      },
      {
        title: "Reading: a day at the lake",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Every summer Nora visits her grandparents, who live in a small house beside a lake. The weather is warm, and there is a lot to do. In the morning, Nora and her cousins go swimming. After that, they play tag on the grass, and they bounce a red ball against the old wall. Nora's grandfather teaches them a game with stones, and it is hard at first. Nora's cousin, Pablo, keeps dropping his stones. 'Don't worry,' says Nora. 'Try again. You can do it!' At last, Pablo wins one round and everybody cheers. In the afternoon they sit by a stream and eat fruit. Nora thinks the lake is the best place in the world, because it is full of friends, games and laughing. At night she looks at the stars and thinks, 'Tomorrow will be a great day, too.'",
        marksEach: 1,
        items: [
          { q: "Nora's grandparents live beside a lake.", options: ["True", "False"], answer: "True" },
          { q: "The children play tag on the grass.", options: ["False", "True"], answer: "True" },
          { q: "Nora's grandfather teaches the children a ball game.", options: ["True", "False"], answer: "False" },
          { q: "What does Nora say to Pablo when he keeps dropping his stones?", options: ["Go home.", "Play tag instead.", "Don't worry. Try again."], answer: "Don't worry. Try again." },
          { q: "What is the main idea of the text?", options: ["Pablo drops his stones.", "Nora has a lot of fun with her family at the lake.", "The lake is cold in the morning."], answer: "Nora has a lot of fun with her family at the lake." },
          { q: "Why does Nora think the lake is the best place in the world? Answer in your own words.", answer: "e.g. It is full of friends, games and laughing, so she has a lot of fun there." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about how you have fun. Say what you do, where you go and why you like it. Use a gerund and one question word question. Marks (5): a clear first sentence with the main idea, details that support it, a correct gerund, a correct question with a question word, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about how you have fun.",
            answer:
              "e.g. My favorite way to have fun is playing football with my friends. We go to the park near my house on Saturday. Kicking the ball is exciting, and I enjoy running fast. Why do I like it? Because we laugh together and nobody is left out.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose one game or activity you enjoy. Talk for about one minute: say what it is, who you play it with and where, how you play it, and why it is fun. Then answer two questions from the teacher.",
      prompts: [
        "What are the rules? How do you win?",
        "Who taught you this game? How did you feel when you learned it?",
        "What do you say to a friend who is nervous about trying it?",
        "How do other people have fun in other countries? Name one thing.",
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
            "Uses unit words correctly and naturally (game words, land and water words, verb phrases with get).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the game only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: gerunds and question words",
          bands: [
            "Uses gerunds and at least one correct question with a question word, more than once.",
            "Uses at least one of these correctly; one small slip, such as I like skip or Where you play.",
            "Tries them but with errors (swim is fun, he likes runing); only one is used.",
            "None of them; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Describes the game clearly, gives a reason why it is fun and adds an example or encouragement.",
            "Describes the game and gives a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
