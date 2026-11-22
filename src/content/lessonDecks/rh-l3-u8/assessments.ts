// Reach Higher 3B, Unit 8 (Getting There): Jupiter's two checkpoints in the format
// of the Hanoi selective schools' grade-6 English test, and the end-of-unit test.
// The mid-unit quiz runs in Lesson 4; the mock in Lesson 8 is the end-of-3B mock
// (Cầu Giấy format: about 30 minutes, a short paragraph at the end) and reaches back
// over the whole of 3B. The end-of-unit test takes the class after Lesson 8: the
// unit's key words, the book's grammar (past tense; future with will and going to),
// the school's exam strand, an original reading, writing and speaking on the Big
// Question. Every item and the reading passages are the school's own; nothing from
// the Student Book, the publisher's tests or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U8Assessments: Assessment[] = [
  {
    id: "rh-l3-u8-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["advice: should / ought to / had better", "present perfect vs past simple", "regular and irregular past-tense verbs", "How far / How long / It takes", "-ant / -ent spelling", "dialogue replies"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "You look tired. You'd better ___ a rest.", options: ["take", "to take", "taking", "took"], answer: "take" },
          { q: "My sister ___ two half marathons so far.", options: ["ran", "has run", "runs", "is running"], answer: "has run" },
          { q: "How long does it take you ___ to school?", options: ["walk", "walking", "to walk", "walked"], answer: "to walk" },
          { q: "Which spelling is correct?", options: ["diffrent", "different", "differant", "diferent"], answer: "different" },
          { q: "'What should I do? I can't sleep.' - '___'", options: ["If I were you, I'd read a book.", "Yes, you should.", "Good night!", "I'm sleeping."], answer: "If I were you, I'd read a book." },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Grammar",
        instructions: "Write the correct form of the verb in brackets.",
        marksEach: 1,
        items: [
          { q: "We (climb) ___ Ba Vì mountain two years ago.", answer: "climbed" },
          { q: "Last summer my family (go) ___ to Sa Pa by train.", answer: "went" },
          { q: "___ you ever (be) ___ to Phú Quốc?", answer: "Have · been" },
          { q: "You ought (wear) ___ a hat in the sun.", answer: "to wear" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "How far it is from Hanoi to Hải Phòng?", answer: "it is → is it" },
          { q: "I have finished the book last night.", answer: "have finished → finished" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u8-mock",
    title: "End-of-3B mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "advice", "present perfect vs past simple", "purpose clauses", "future forms and time clauses", "wish and unless", "dialogue replies", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress",
        skill: "Vocabulary",
        instructions: "Choose the word that is different.",
        marksEach: 1,
        items: [
          { q: "Which word has its stress on a different syllable?", options: ["journey", "prepare", "challenge", "distance"], answer: "prepare" },
          { q: "Which word has its stress on a different syllable?", options: ["achieve", "explore", "succeed", "meter"], answer: "meter" },
          { q: "Which word has a different vowel sound?", options: ["goal", "globe", "road", "bought"], answer: "bought" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "It's raining hard. You'd better ___ an umbrella.", options: ["take", "to take", "taking", "took"], answer: "take" },
          { q: "Have you ___ finished your project?", options: ["yet", "already", "ago", "since"], answer: "already" },
          { q: "She practised every day so that she ___ win the competition.", options: ["can", "could", "will", "must"], answer: "could" },
          { q: "When I ___ home, I'll phone you.", options: ["get", "will get", "got", "am getting"], answer: "get" },
          { q: "I wish I ___ a little taller.", options: ["am", "were", "will be", "have been"], answer: "were" },
          { q: "'Good luck in the race tomorrow!' - '___'", options: ["Thanks. I'll do my best.", "Yes, I am.", "Never mind.", "You're welcome."], answer: "Thanks. I'll do my best." },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Unless you don't hurry, you'll miss the train.", answer: "don't hurry → hurry" },
          { q: "It takes me half an hour go to my grandmother's house.", answer: "go → to go" },
          { q: "\"I'm nearly there\" she shouted.", answer: "there\" → there,\" (comma inside the speech marks)" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write True or False for 1-2, then answer 3-5 in a few words.",
        passage:
          "Last spring, Mai and her grandfather decided to climb Fansipan, the highest mountain in Vietnam. It is 3,143 meters high. Many visitors take the cable car, but Mai wanted to walk all the way. To prepare, they walked five kilometers round a lake near their home every weekend for two months. They also studied a map so that they would know the route. The climb took them two days. On the first night they slept at a camp at 2,200 meters. 'I wish I had brought warmer socks!' Mai laughed. When they reached the top, they were tired but very proud. Next year they are going to climb Pu Ta Leng, another high mountain in Lai Châu.",
        marksEach: 1,
        items: [
          { q: "1. Mai and her grandfather went up by cable car.", options: ["True", "False"], answer: "False" },
          { q: "2. They trained for two months before the climb.", options: ["True", "False"], answer: "True" },
          { q: "3. Why did they study a map?", answer: "So that they would know the route." },
          { q: "4. How long did the climb take?", answer: "Two days." },
          { q: "5. What are they going to do next year?", answer: "Climb Pu Ta Leng (another high mountain)." },
        ],
      },
      {
        title: "Part E. Rewrite",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "My advice is to see a doctor. → If I ...", answer: "If I were you, I would see a doctor." },
          { q: "She started running three years ago. → She has ...", answer: "She has run for three years. / She has been running for three years. (Accept either.)" },
          { q: "The walk to school takes me 15 minutes. → It takes ...", answer: "It takes me 15 minutes to walk to school." },
          { q: "I'm sorry I can't speak French. → I wish ...", answer: "I wish I could speak French." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a goal you have achieved or want to achieve. Say what the goal is, what tools or help you used or will use, and how you felt or will feel.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar (tenses chosen to fit time), vocabulary." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u8-test",
    title: "Unit 8 test: Getting There",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "Unit 8 key words: measurement (distance, unit, kilometer), goals (goal, strategy, estimate, direction) and journeys (destination, continent, challenge, endurance, discover)",
      "Book grammar: past tense, regular and irregular verbs; present vs past; the future with will and going to",
      "Exam strand: advice, purpose clauses (so that), unless, wish, present perfect vs past simple, -ant / -ent word formation",
      "Reading: an original story about a goal (multiple choice, true / false, short answers)",
      "Writing: the Big Question in 70-100 words",
      "Speaking: a 2-minute talk on the Big Question with follow-up questions",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap.",
        marksEach: 1,
        items: [
          { q: "A marathon is more than 40 kilometers long, so runners need great ___.", options: ["direction", "endurance", "location", "measurement"], answer: "endurance" },
          { q: "Look at the compass. In which ___ is the river: north or south?", options: ["distance", "destination", "direction", "continent"], answer: "direction" },
          { q: "I can't count everyone in the stadium, but I ___ that there are about 5,000 people.", options: ["estimate", "explore", "discover", "prepare"], answer: "estimate" },
          { q: "Our ___ is Đà Lạt. We will arrive there at six in the evening.", options: ["journey", "globe", "destination", "unit"], answer: "destination" },
          { q: "A kilometer is a ___ of distance.", options: ["goal", "unit", "strategy", "challenge"], answer: "unit" },
          { q: "Asia and Africa are two of the seven ___.", options: ["locations", "globes", "distances", "continents"], answer: "continents" },
          { q: "Before the test, Lan made a ___: she studied one topic every evening for two weeks.", options: ["strategy", "measurement", "location", "meter"], answer: "strategy" },
          { q: "The ___ from my house to school is three kilometers.", options: ["direction", "distance", "continent", "endurance"], answer: "distance" },
          { q: "Maybe one day you will ___ a cave that nobody has ever seen before.", options: ["estimate", "achieve", "discover", "prepare"], answer: "discover" },
          { q: "Climbing a 3,000-meter mountain is a real ___ for a nine-year-old.", options: ["challenge", "location", "unit", "globe"], answer: "challenge" },
        ],
      },
      {
        title: "Part B. Grammar A: past and future",
        skill: "Grammar",
        instructions: "Choose the correct verb form (1-7). Then write the verb in brackets in the correct form (8-10).",
        marksEach: 1,
        items: [
          { q: "My brother usually ___ to school, but today he is going by bus.", options: ["walks", "walked", "walking", "is walk"], answer: "walks" },
          { q: "Last week we ___ a map of our village for the class.", options: ["drawed", "draw", "drew", "drawn"], answer: "drew" },
          { q: "The rain ___ at five o'clock, so we went out to play.", options: ["stoped", "stopped", "stops", "stopping"], answer: "stopped" },
          { q: "Last night my grandmother ___ me a story about the Hùng Kings.", options: ["telled", "tells", "tell", "told"], answer: "told" },
          { q: "Look at the time! We ___ late for the bus.", options: ["are going to be", "will to be", "goes to be", "be"], answer: "are going to be" },
          { q: "'I can't open this jar.' - 'Give it to me. I ___ open it for you.'", options: ["am going", "will", "going to", "would to"], answer: "will" },
          { q: "Next summer my family ___ visit Huế. We have already booked the hotel.", options: ["will to", "going", "is going to", "are going"], answer: "is going to" },
          { q: "Two years ago my aunt (study) ___ English in Singapore.", answer: "studied" },
          { q: "In February 2009, Erden Eruç (reach) ___ Papua New Guinea in his rowing boat.", answer: "reached" },
          { q: "Tomorrow our class (go) ___ to the museum. (Use going to.)", answer: "is going to go" },
        ],
      },
      {
        title: "Part C. Grammar B: rewrite, correct, form",
        skill: "Grammar",
        instructions: "Rewrite 1-4 so that they mean the same, starting with the words given. Correct the mistake in 5-6. Write the correct form of the word in brackets in 7-10.",
        marksEach: 1,
        items: [
          { q: "My advice is to take a map. → You should ...", answer: "You should take a map." },
          { q: "If we don't leave now, we will miss the cable car. → Unless ...", answer: "Unless we leave now, we will miss the cable car." },
          { q: "I'm sorry I can't swim. → I wish ...", answer: "I wish I could swim." },
          { q: "She got up early because she wanted to catch the first bus. → She got up early so that ...", answer: "She got up early so that she could catch the first bus." },
          { q: "You had better to leave now, or you'll miss the train.", answer: "to leave → leave" },
          { q: "I have visited Hạ Long Bay last year.", answer: "have visited → visited" },
          { q: "Learning to swim well takes time and (patient) ___.", answer: "patience" },
          { q: "It is (importance) ___ to drink water on a long walk.", answer: "important" },
          { q: "Minh felt (confidence) ___ at the start line because he had trained for months.", answer: "confident" },
          { q: "My new school is very (differ) ___ from my old one.", answer: "different" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Choose the answer for 1 and 4, write True or False for 2-3, and answer 5-6 in a few words.",
        passage:
          "Khoa lives in a village near Hội An. Last year he decided to swim across the river near his house. The river is about 300 meters wide, but Khoa could only swim 50 meters. His uncle, a fisherman, gave him some advice: 'Swim a little farther every week, and never swim alone.' So Khoa made a plan. Every Saturday he swam with his uncle in a safe, quiet part of the river. He wrote each distance in a notebook: 50 meters, 80 meters, 120 meters. At first he felt tired and wanted to give up, but the notebook showed him that he was getting better. After six months, he swam 300 meters without stopping. Last Sunday, with his uncle's boat beside him, Khoa finally crossed the river. Now he is going to teach his little sister to swim.",
        marksEach: 2,
        items: [
          { q: "1. How wide is the river?", options: ["about 50 meters", "about 120 meters", "about 300 meters", "about 6 kilometers"], answer: "about 300 meters" },
          { q: "2. Khoa's uncle told him to swim alone every day.", options: ["True", "False"], answer: "False" },
          { q: "3. Khoa wrote down how far he swam each time.", options: ["True", "False"], answer: "True" },
          { q: "4. Why did Khoa keep going when he felt tired?", options: ["His sister swam with him.", "His notebook showed he was getting better.", "The river was very quiet.", "His uncle gave him a new boat."], answer: "His notebook showed he was getting better." },
          { q: "5. How long did it take Khoa to swim 300 meters without stopping?", answer: "Six months." },
          { q: "6. Name two tools that helped Khoa reach his goal.", answer: "Any two: his uncle (his advice), his plan (swimming every Saturday), his notebook, the boat beside him." },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions: "Write 70-100 words to answer the Big Question: What tools can we use to achieve our goals? Choose one goal (yours, or a person's from this unit). Name at least two tools (a thing, a plan, a habit or a person), say how each one helped or will help, and say which tool matters most and why.",
        marksEach: 10,
        items: [
          {
            q: "Your paragraph (70-100 words).",
            answer: "Mark on four parts, 2.5 each. Content: a clear goal, at least two tools with how they help, and which matters most with a reason. Organisation: an opening sentence that names the goal, linking words (First, Also, because, so, In the end) and a closing sentence. Grammar: tenses that fit the time (past for what happened, present perfect for an achievement, will / going to for a plan) and one purpose clause (to / so that). Vocabulary: at least four Unit 8 words used correctly.",
          },
        ],
      },
    ],
    speaking: {
      task: "A 2-minute talk on the Big Question: What tools can we use to achieve our goals? Talk about one goal you have achieved or want to achieve: the goal, the tools that help (things, plans, habits, people) and the one that matters most. Then answer the teacher's follow-up questions.",
      prompts: [
        "Tell me about a goal you have already achieved. What helped you most?",
        "Which selection in this unit shows the best tool for reaching a goal: \"Running Shoes\", \"Three Golden Apples\", \"Turtle and His Four Cousins\", \"One Man's Goal\" or \"Climbing Toward Her Goal\"? Why?",
        "Is a clever trick a fair tool? Give an example from the unit.",
        "What are you going to do this year to get ready for the grade-6 test?",
        "If you could ask Erden Eruç or Constanza Ceruti one question, what would it be?",
        "What advice would you give a friend who wants to give up on a goal?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Speaks for the full two minutes with few pauses; ideas follow on with linking words (first, also, because, so).",
            "Speaks for most of the time; some pauses to find words, but the talk keeps going.",
            "Short turns with long pauses; needs the teacher's prompts to continue.",
            "A few words or single sentences; stops after each one.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses past, present perfect and future forms correctly, plus advice or purpose (should, so that); few errors.",
            "Uses past and future forms mostly correctly; some errors that do not block meaning.",
            "Mostly present tense; frequent errors in past and future forms.",
            "Very simple sentences with many errors that make meaning hard to follow.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses five or more Unit 8 words naturally (goal, strategy, endurance, challenge, achieve ...) and some precise extra words.",
            "Uses three or four Unit 8 words correctly; some repetition.",
            "Uses one or two Unit 8 words; relies on very general words.",
            "Not enough words to talk about goals and tools.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear throughout with correct stress on two-syllable words; answers follow-up questions fully and asks or adds something.",
            "Clear most of the time; answers follow-up questions with a reason.",
            "Sometimes hard to understand; answers follow-up questions in a word or two.",
            "Often hard to understand; does not answer most follow-up questions.",
          ],
        },
      ],
    },
  },
];
