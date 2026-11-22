// Reach Higher 3B, Unit 6 (From Past to Present): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test, and the full
// end-of-unit test. The mid-unit quiz runs in Lesson 4, the mock (Thanh Xuân format:
// about 30 minutes, true / false and short answers on a reading text, a short
// paragraph at the end) in Lesson 8, and the unit test takes the class after Lesson 8.
// Every item and every reading passage are the school's own; nothing from the
// Student Book, its song, the publisher's unit test or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U6Assessments: Assessment[] = [
  {
    id: "rh-l3-u6-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["subject / object / reflexive pronouns", "question tags", "indirect questions", "used to", "past simple vs present perfect", "prefixes un- / re-"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "My grandmother taught ___ how to make lanterns.", options: ["we", "us", "our", "ourselves"], answer: "us" },
          { q: "The children made the costumes by ___.", options: ["themselves", "theirselves", "them", "their"], answer: "themselves" },
          { q: "Your father plays the drum, ___?", options: ["isn't he", "doesn't he", "does he", "didn't he"], answer: "doesn't he" },
          { q: "Can you tell me where ___?", options: ["is the market", "the market is", "does the market", "the market"], answer: "the market is" },
          { q: "People ___ wear áo dài every day, but now they wear it on special days.", options: ["use to", "used to", "are used", "have used"], answer: "used to" },
          { q: "We ___ the Hùng Kings' Temple in 2023.", options: ["have visited", "visited", "visit", "were visited"], answer: "visited" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "My uncle (sing) ___ in the village quan họ club since 2005.", answer: "has sung" },
          { q: "The box was (lock) ___, so we could open it easily.", answer: "unlocked" },
          { q: "I made a mistake, so I had to (write) ___ the card.", answer: "rewrite" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Me and my sister watched the dragon dance.", answer: "Me → I (My sister and I watched ...)" },
          { q: "Do you know what time does the show start?", answer: "does the show start → the show starts" },
          { q: "She didn't used to like spicy food.", answer: "used → use" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u6-mock",
    title: "End-of-unit mock test (Thanh Xuân format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "pronouns", "question tags", "past passive", "prefixes", "so / such ... that", "reported questions", "-ing subjects and It's worth -ing", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["carved", "performed", "played", "expressed"], answer: "expressed" },
          { q: "stress", options: ["heritage", "popular", "tradition", "region"], answer: "tradition" },
          { q: "stress", options: ["generation", "preservation", "represent", "communicate"], answer: "communicate" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "This kite isn't ___. Mine is the red one.", options: ["my", "mine", "me", "myself"], answer: "mine" },
          { q: "The famous singer ___ in a small village in 1950.", options: ["born", "was born", "is born", "has been born"], answer: "was born" },
          { q: "It was ___ beautiful show that we watched it twice.", options: ["so", "such", "such a", "so a"], answer: "such a" },
          { q: "I'm sorry, I ___ your question. Could you say it again?", options: ["misunderstood", "disunderstood", "ununderstood", "reunderstood"], answer: "misunderstood" },
          { q: "___ traditional games with friends is great fun.", options: ["Play", "Playing", "To playing", "Played"], answer: "Playing" },
          { q: "'Excuse me, do you know where the puppet theatre is?' - '___'", options: ["Yes, I know where.", "It's by Hoàn Kiếm Lake.", "No, it isn't.", "Yes, it is."], answer: "It's by Hoàn Kiếm Lake." },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "These masks were carved by hand, wasn't they?", answer: "wasn't → weren't" },
          { q: "Hạ Long Bay, that is in Quảng Ninh, is famous for its islands.", answer: "that → which" },
          { q: "It's worth to visit the Temple of Literature.", answer: "to visit → visiting" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-3, then answer 4-5 in a few words.",
        passage:
          "Mr. Tâm is seventy-two. He has made water puppets in his village near Hanoi for more than fifty years. He was taught by his father, who learned from his own grandfather. Each puppet is carved from light wood and painted by hand, so making one can take a whole week.\n\nTen years ago, Mr. Tâm was worried. Young people used to watch the shows, but many of them moved to the city. So he started a free summer class for children. Now twenty children come every year, and some of them perform at the village festival. 'Teaching them is the only way to keep our tradition alive,' he says.",
        marksEach: 1,
        items: [
          { q: "1. Mr. Tâm learned to make puppets from his father.", options: ["True", "False"], answer: "True" },
          { q: "2. A puppet can be made in one afternoon.", options: ["True", "False"], answer: "False" },
          { q: "3. The summer class costs a lot of money.", options: ["True", "False"], answer: "False" },
          { q: "4. Why was Mr. Tâm worried ten years ago?", answer: "Because many young people moved to the city (and stopped watching the shows)." },
          { q: "5. How many children come to the class every year?", answer: "Twenty." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same. Begin with the words given.",
        marksEach: 1,
        items: [
          { q: "The story was very funny. Everyone laughed. → It was such ...", answer: "It was such a funny story that everyone laughed." },
          { q: "\"Where do you live?\" the visitor asked me. → The visitor asked me ...", answer: "The visitor asked me where I lived." },
          { q: "It is important to learn about our heritage. → Learning ...", answer: "Learning about our heritage is important." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a tradition in your family or your town. Say what it is, who keeps it alive, and why it is worth preserving.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ unit test
  {
    id: "rh-l3-u6-test",
    title: "Unit 6 test: From Past to Present",
    kind: "summative",
    afterLesson: 8,
    minutes: 65,
    covers: [
      "Part 1 and Part 2 Key Words in context (heritage, rhythm, vary, perform, represent, preservation, generation, carve, process, storyteller ...)",
      "The book's grammar: subject and object pronouns, demonstrative pronouns, possessive pronouns",
      "The exam strand: past passive, so / such ... that, -ing subjects, reported questions, used to, indirect questions, question tags, prefixes mis- / dis-",
      "Reading: an original article about keeping a kind of music alive (multiple choice, true / false, short answers)",
      "Writing: 70-100 words on the Big Question",
      "Speaking: a 2-minute talk on the Big Question with follow-up questions",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap.",
        marksEach: 1,
        items: [
          { q: "The drummer keeps a steady ___, so the lion dancers know when to jump.", options: ["rhythm", "region", "heritage", "style"], answer: "rhythm" },
          { q: "Tết cakes ___ from place to place: bánh chưng is square, but bánh tét is long and round.", options: ["vary", "perform", "carve", "express"], answer: "vary" },
          { q: "Every spring, quan họ singers ___ for hundreds of visitors at the festival.", options: ["represent", "perform", "vary", "communicate"], answer: "perform" },
          { q: "The old citadel in Huế is an important part of Vietnam's ___.", options: ["process", "feelings", "heritage", "rhythm"], answer: "heritage" },
          { q: "At Tết, a red envelope ___ good luck for the new year.", options: ["represents", "performs", "varies", "carves"], answer: "represents" },
          { q: "The ___ of old songs matters, so the club records its oldest singers.", options: ["generation", "preservation", "tradition", "storyteller"], answer: "preservation" },
          { q: "My grandparents belong to an older ___ than my parents.", options: ["generation", "region", "process", "artist"], answer: "generation" },
          { q: "Puppet makers ___ each water puppet from a block of light wood.", options: ["perform", "express", "carve", "vary"], answer: "carve" },
          { q: "Making silk is a long ___ with many steps, from feeding the silkworms to weaving the cloth.", options: ["style", "process", "tale", "feelings"], answer: "process" },
          { q: "Grandpa is the best ___ in our family; every night he tells us a tale about the Red River.", options: ["artist", "tradition", "storyteller", "generation"], answer: "storyteller" },
        ],
      },
      {
        title: "Part B. Grammar: pronouns",
        skill: "Grammar",
        instructions: "Choose the correct pronoun.",
        marksEach: 1,
        items: [
          { q: "Grandma showed ___ how to fold the dong leaves.", options: ["we", "us", "our", "ours"], answer: "us" },
          { q: "My brother and ___ went to the water puppet show last night.", options: ["me", "I", "mine", "myself"], answer: "I" },
          { q: "The storyteller is coming! The children love listening to ___.", options: ["she", "her", "hers", "herself"], answer: "her" },
          { q: "Look at ___ boats far away on the lake.", options: ["this", "these", "that", "those"], answer: "those" },
          { q: "___ is my new drum, here in my hands.", options: ["This", "These", "Those", "Them"], answer: "This" },
          { q: "This lantern is ___. I made it for the Mid-Autumn Festival.", options: ["my", "mine", "me", "I"], answer: "mine" },
          { q: "'Whose kites are those?' - 'They're ___. My sister and I made them.'", options: ["our", "us", "ours", "we"], answer: "ours" },
          { q: "{s1}'s aunt painted that picture, so it is ___.", options: ["her", "hers", "her's", "she"], answer: "hers" },
        ],
      },
      {
        title: "Part C. Grammar: rewrite, correct and form",
        skill: "Grammar",
        instructions: "Items 1-5: rewrite each sentence so that it means the same, beginning with the words given or using the word in brackets. Items 6-7: find and correct the mistake. Items 8-9: write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "1. Someone carved this puppet in 1990. → This puppet ...", answer: "This puppet was carved in 1990." },
          { q: "2. The legend was very old. Nobody knew who first told it. (so)", answer: "The legend was so old that nobody knew who first told it." },
          { q: "3. The festival was very exciting. We stayed until midnight. (such)", answer: "It was such an exciting festival that we stayed until midnight." },
          { q: "4. It is important to learn our grandparents' songs. → Learning ...", answer: "Learning our grandparents' songs is important." },
          { q: "5. \"Where did you learn this song?\" I asked my aunt. → I asked my aunt ...", answer: "I asked my aunt where she had learned that song. (Also accept: where she learned the song.)" },
          { q: "6. Long ago, people use to wear áo dài every day.", answer: "use → used (people used to wear ...)" },
          { q: "7. Excuse me, can you tell me where is the museum?", answer: "where is the museum → where the museum is" },
          { q: "8. I (spell) ___ the word 'tradition', so the teacher marked it wrong.", answer: "misspelled (also misspelt)" },
          { q: "9. My little brother is very (obey) ___: he never listens to our parents.", answer: "disobedient" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Choose the best answer for 1, write True or False for 2-4, and answer 5-6 in a few words.",
        passage:
          "Every Saturday morning, a small group of children meets in an old house in Hanoi. They are learning ca trù, one of Vietnam's oldest kinds of music. Their teacher, Mrs. Hoa, is seventy-five. She was taught by her mother when she was only seven.\n\nCa trù is not easy. The singer keeps the rhythm by hitting a small wooden box with two sticks, while a man plays a long lute called the đàn đáy. Mrs. Hoa says the hardest part is the voice: \"You must sing from deep inside, and that takes years.\"\n\nFifty years ago, very few young people wanted to learn it. Today the club has twelve students, and some of them already perform for visitors from other countries. \"If the children stop, the music stops,\" Mrs. Hoa says. \"So every lesson matters.\"",
        marksEach: 1,
        items: [
          { q: "1. What is the text mainly about?", options: ["how to make a đàn đáy", "a club that keeps an old kind of music alive", "the life of a famous pop singer", "a music festival in Huế"], answer: "a club that keeps an old kind of music alive" },
          { q: "2. Mrs. Hoa learned ca trù from her mother.", options: ["True", "False"], answer: "True" },
          { q: "3. The singer plays the đàn đáy.", options: ["True", "False"], answer: "False" },
          { q: "4. Fifty years ago, many young people wanted to learn ca trù.", options: ["True", "False"], answer: "False" },
          { q: "5. What does the singer use to keep the rhythm?", answer: "A small wooden box and two sticks (she hits the box with the sticks)." },
          { q: "6. Why does Mrs. Hoa say that every lesson matters?", answer: "Because if the children stop learning, the music will stop (disappear)." },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions:
          "How can we preserve our traditions? Write 70-100 words about ONE Vietnamese tradition (a festival, a food, a song, a craft or a game). Say what it is and who keeps it alive, what could make it disappear, and two ways young people can help to preserve it. Use at least one -ing subject or It's worth -ing, and one past passive.",
        marksEach: 10,
        items: [
          {
            q: "Your answer to the Big Question (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each. Content: the tradition and who keeps it, a threat, two clear ways to help. Organisation: a topic sentence, linking words (First, Also, because, so, However), a closing sentence. Grammar: the two required structures used correctly, and mostly accurate tenses and pronouns. Vocabulary: at least four unit words (tradition, heritage, generation, preserve / preservation, perform, carve, represent ...) used correctly, with careful spelling. Sample: Water puppetry is a tradition from the Red River Delta. The puppets are carved from light wood, and old artists still perform in villages near Hanoi. However, many young people prefer phones and games, so the shows could disappear. First, schools can invite puppeteers to perform for every new generation. Also, children can learn to make simple puppets themselves. Watching a show with your family is a wonderful way to start, and it's worth visiting a craft village at least once.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about 2 minutes on the Big Question: How can we preserve our traditions? Choose one tradition from your family or from Vietnam. Say what it is, who taught it to whom, how it has changed since your grandparents were young, and what young people can do to keep it alive. Then answer the teacher's follow-up questions.",
      prompts: [
        "Who taught you this tradition, and how did they teach it?",
        "How has it changed since your grandparents were children? Is the change good or bad for it?",
        "Which part of this unit helped you think about it most: the song, the biography, the totem pole, the legend or the storyteller? Why?",
        "Is it worth learning an old tradition if your friends don't do it? Why or why not?",
        "If you could interview one keeper of a tradition, who would it be, and what would you ask?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks for about 2 minutes with only short pauses to think; ideas are linked and easy to follow; answers follow-up questions at length.",
            "Keeps going for most of the time with some pauses or restarts; ideas mostly linked; answers follow-ups with a reason.",
            "Often stops; speaks in short pieces; needs one or two prompts to continue; short follow-up answers.",
            "Says very little without help; long silences; single words or phrases.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses the unit's grammar well (past passive, used to, -ing subjects, It's worth -ing, so / such ... that, pronouns) with few errors.",
            "Uses some unit grammar; errors (tenses, pronouns) do not stop meaning.",
            "Mostly simple present and past sentences; frequent errors that sometimes confuse.",
            "Very limited grammar; errors make most sentences hard to follow.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses many unit words naturally (tradition, heritage, generation, preserve, perform, represent, carve, storyteller) and some precise words of their own.",
            "Uses several unit words correctly; sometimes repeats words or searches for one.",
            "Uses only a few unit words; often says 'thing' or uses Vietnamese for a word.",
            "Very few English words beyond the most basic; cannot describe the tradition.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear sounds and word stress (heritage, tradition, generation); good intonation; listens to the question and answers it directly.",
            "Mostly clear; a few words mispronounced; answers the questions asked.",
            "Some words hard to understand; flat delivery; sometimes answers a different question.",
            "Often hard to understand; does not respond to the questions without a lot of help.",
          ],
        },
      ],
    },
  },
];
