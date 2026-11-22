// Reach Higher 3A, Unit 2 (Nature's Balance): Jupiter's two checkpoints and the
// end-of-unit test, in the format of the Hanoi public selective schools' grade-6 English test (Cầu Giấy:
// multiple choice plus written items). The mid-unit quiz runs in Lesson 4, the
// mock test in Lesson 8, the full test on the class date after Lesson 8. Every item and passage are the school's own;
// nothing is taken from the Student Book or from a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U2Assessments: Assessment[] = [
  {
    id: "rh-l3-u2-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["Wh- and How questions", "kinds of sentence, What a / How", "because / so", "quantifiers", "u_e sound", "offers and apologies"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "Which word has a different vowel sound?", options: ["flute", "tune", "sun", "rude"], answer: "sun" },
          { q: "How ___ does it rain in Hanoi in July? Three or four times a week.", options: ["often", "much", "long", "many"], answer: "often" },
          { q: "There were ___ fish in the river after the factory opened.", options: ["less", "little", "much", "fewer"], answer: "fewer" },
          { q: "___ terrible storm it was!", options: ["How", "What a", "What", "So"], answer: "What a" },
          { q: "'I'm sorry I broke your pencil.' - '___'", options: ["You're welcome.", "That's all right.", "Yes, please.", "Me too."], answer: "That's all right." },
        ],
      },
      {
        title: "Part B. Rewrite the sentences",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same. Start with the words given.",
        marksEach: 1,
        items: [
          { q: "The river is very dirty. → What ...", answer: "What a dirty river (it is)!" },
          { q: "The farmers sprayed the fields, so the bees died. → The bees died ...", answer: "The bees died because the farmers sprayed the fields." },
          { q: "My aunt feeds the birds TWICE A DAY. Write a question for the words in capitals.", answer: "How often does your aunt feed the birds?" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "There isn't many rice left in the bag.", answer: "many → much" },
          { q: "Where did the villagers planted the new bushes?", answer: "planted → plant" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u2-mock",
    title: "End-of-unit mock test (Cầu Giấy format)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and -ed endings", "quantifiers", "used to", "first conditional", "present perfect for / since", "comparatives", "linking words", "too / enough / so ... that", "reading", "a 50-60 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds",
        skill: "Vocabulary",
        instructions: "Choose the word whose underlined part (the -ed ending or the vowel) sounds different.",
        marksEach: 1,
        items: [
          { q: "-ed ending", options: ["visited", "needed", "wanted", "played"], answer: "played" },
          { q: "vowel sound", options: ["food", "book", "good", "foot"], answer: "food" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "There isn't ___ rain in the dry season.", options: ["many", "few", "much", "a few"], answer: "much" },
          { q: "My uncle ___ in a factory, but now he is a farmer.", options: ["use to work", "used to working", "uses to work", "used to work"], answer: "used to work" },
          { q: "If we ___ the forest, many animals will lose their homes.", options: ["will cut down", "cut down", "cutting down", "cuts down"], answer: "cut down" },
          { q: "My cousin has lived in Hanoi ___ 2019.", options: ["for", "in", "since", "from"], answer: "since" },
          { q: "The Mekong is ___ river in Southeast Asia.", options: ["the longest", "long", "longer", "most long"], answer: "the longest" },
          { q: "'Would you like to come to the zoo with us?' - '___'", options: ["Yes, I do.", "You're welcome.", "I'd love to!", "Here you are."], answer: "I'd love to!" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong word and the correction.",
        marksEach: 1,
        items: [
          { q: "Although the water was cold, but we swam in the lake.", answer: "but → (delete)" },
          { q: "How many homework do you have tonight?", answer: "many → much" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the text. Write T (true) or F (false), then answer question 4.",
        passage:
          "The Sarus crane is the tallest flying bird in the world. Many years ago, large groups of Sarus cranes used to visit the wetlands of southern Vietnam every dry season. When people turned many of the wetlands into rice fields, the cranes lost the plants they eat, so fewer and fewer of them came back. Today, people at parks such as Tràm Chim are working to make the wetlands healthy so that the plants can grow again. Scientists say that if the wetlands become healthy again, more cranes will come back.",
        marksEach: 1,
        items: [
          { q: "1. Sarus cranes are the tallest flying birds in the world.", answer: "T" },
          { q: "2. There are more Sarus cranes in Vietnam now than in the past.", answer: "F" },
          { q: "3. The cranes lost their food when wetlands were turned into rice fields.", answer: "T" },
          { q: "4. What will happen if the wetlands become healthy again?", answer: "More cranes will come back." },
        ],
      },
      {
        title: "Part E. Rewrite the sentences",
        skill: "Grammar",
        instructions: "Rewrite each sentence so that it means the same.",
        marksEach: 1,
        items: [
          { q: "The tea is very hot. I can't drink it. → The tea is too ...", answer: "The tea is too hot for me to drink." },
          { q: "My brother started learning the piano two years ago. → My brother has ...", answer: "My brother has learned the piano for two years. / My brother has been learning the piano for two years." },
          { q: "The forest is very beautiful. Everyone wants to visit it. → The forest is so ...", answer: "The forest is so beautiful that everyone wants to visit it." },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-60 words about a place in Vietnam where nature needs help. Say where it is, what has gone wrong, and what will happen if people help.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-60 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking words), grammar, vocabulary." },
        ],
      },
    ],
  },
  {
    // The full end-of-unit test, the class date after Lesson 8. Written for Jupiter
    // at A2 with some B1 items (Hanoi grade-6 selective papers); the reading passage
    // is the school's own story, not a real village.
    id: "rh-l3-u2-test",
    title: "Unit 2 test: Nature's Balance",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "Part 1 and Part 2 key words",
      "kinds of sentences: statements, questions, commands, exclamations (book, p. 109)",
      "Wh- and How questions",
      "compound sentences with and, but, or (book, p. 143)",
      "first conditional and unless",
      "used to; present perfect with for / since",
      "fewer / less; although / but",
      "the more ..., the more ...; too ... to; so ... that",
      "word formation",
      "reading: cause and effect, reference, details",
      "writing on the Big Question",
      "speaking on the Big Question",
    ],
    sections: [
      {
        title: "Part A. Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the word that best completes each sentence.",
        marksEach: 1,
        items: [
          { q: "1. In the dry season, clean water becomes ___ in some villages, so people must save every drop.", options: ["scarce", "positive", "level", "nature"], answer: "scarce" },
          { q: "2. After the storm, the shop's ___ of rice was very small, so the price went up.", options: ["behavior", "competition", "drought", "supply"], answer: "supply" },
          { q: "3. When people cut down the forest, the number of birds ___.", options: ["interacts", "decreases", "controls", "reacts"], answer: "decreases" },
          { q: "4. A seesaw is in ___ when both sides weigh the same.", options: ["amount", "balance", "drought", "resources"], answer: "balance" },
          { q: "5. A hedgehog ___ to danger by rolling into a ball.", options: ["increases", "supplies", "controls", "reacts"], answer: "reacts" },
          { q: "6. Building a new nest every spring is part of this bird's ___.", options: ["behavior", "amount", "level", "drought"], answer: "behavior" },
          { q: "7. There was no rain for six months. It was the worst ___ in years.", options: ["ecosystem", "food chain", "drought", "level"], answer: "drought" },
          { q: "8. Grass → rabbit → fox is an example of a ___.", options: ["competition", "resource", "behavior", "food chain"], answer: "food chain" },
          { q: "9. Two tigers want the same piece of forest, so there is ___ between them.", options: ["nature", "competition", "balance", "supply"], answer: "competition" },
          { q: "10. A pond where frogs, fish, insects and plants live together is a small ___.", options: ["amount", "level", "ecosystem", "supply"], answer: "ecosystem" },
        ],
      },
      {
        title: "Part B. Grammar from the book",
        skill: "Grammar",
        instructions: "Questions 1-4: choose the best answer. Questions 5-8: write the sentence as asked.",
        marksEach: 1,
        items: [
          { q: "1. Which sentence is a command?", options: ["Close the gate, please.", "The bees are busy.", "What a busy bee!", "Are the bees busy?"], answer: "Close the gate, please." },
          { q: "2. Which sentence is an exclamation?", options: ["How tall is that tree?", "Tell me how tall the tree is.", "How tall that tree is!", "The tree is very tall."], answer: "How tall that tree is!" },
          { q: "3. '___ do you water the plants?' - 'Twice a week.'", options: ["How often", "How long", "How much", "When"], answer: "How often" },
          { q: "4. 'Do you want to plant a tree, ___ do you want to feed the fish?'", options: ["and", "but", "so", "or"], answer: "or" },
          { q: "5. Write it with the correct capital letter and end mark: what a beautiful garden", answer: "What a beautiful garden!" },
          { q: "6. Join with but: The boy warned the villagers. They did not listen.", answer: "The boy warned the villagers, but they did not listen." },
          { q: "7. Join with or: We can protect the river. We can lose the giant fish.", answer: "We can protect the river, or we can lose the giant fish." },
          { q: "8. Write a question for the words in CAPITALS: The villagers dug out THE BUTTERFLY BUSHES.", answer: "What did the villagers dig out?" },
        ],
      },
      {
        title: "Part C. Rewrite, correct and build words",
        skill: "Grammar",
        instructions: "Questions 1-5: rewrite so the meaning stays the same, starting with the words given. Questions 6-7: find the mistake and correct it. Questions 8-9: write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "1. If you don't water the plants, they will die. → Unless ...", answer: "Unless you water the plants, they will die." },
          { q: "2. There were many frogs in this field before, but there aren't any now. → There used ...", answer: "There used to be many frogs in this field." },
          { q: "3. We started cleaning the beach three months ago. → We have ...", answer: "We have cleaned the beach for three months. / We have been cleaning the beach for three months." },
          { q: "4. The river is so dirty that fish can't live in it. → The river is too ...", answer: "The river is too dirty for fish to live in." },
          { q: "5. When we plant more trees, the air becomes cleaner. → The more ...", answer: "The more trees we plant, the cleaner the air becomes." },
          { q: "6. There were less birds in the garden after the flowers were dug out.", answer: "less → fewer" },
          { q: "7. Although wolves are dangerous, but they help the park.", answer: "but → (delete)" },
          { q: "8. The villagers' ___ surprised the visitor. (BEHAVE)", answer: "behavior" },
          { q: "9. The dog's ___ to the loud noise was to hide under the bed. (REACT)", answer: "reaction" },
        ],
      },
      {
        title: "Part D. Reading",
        skill: "Reading",
        instructions: "Read the story 'Trees by the Sea'. Questions 1 and 4: choose the best answer. Questions 2-3: write T (true) or F (false). Questions 5-6: answer in a few words.",
        passage:
          "Ten years ago, the people of a small fishing village in northern Vietnam cut down many of the mangrove trees along their coast. They wanted more space for shrimp ponds, and at first the plan worked well. However, the village soon had problems. Without the trees' strong roots, storms washed away the mud, and the waves came closer to the houses every year. The crabs and young fish that used to hide among the roots disappeared, so the fishermen caught less and less. Five years ago, the children at the village school started a project. Every Sunday they planted young mangrove trees in the mud, and their parents helped them build fences against the waves. Today the new trees are taller than the children. Birds have come back, and the fishermen say their nets are fuller. 'The more trees we plant, the safer our village becomes,' says one teacher.",
        marksEach: 1,
        items: [
          { q: "1. Why did the villagers cut down the mangrove trees?", options: ["to build new houses", "to make space for shrimp ponds", "to sell the wood", "to stop the storms"], answer: "to make space for shrimp ponds" },
          { q: "2. The plan caused problems straight away.", answer: "F" },
          { q: "3. Crabs and young fish used to live among the roots of the trees.", answer: "T" },
          { q: "4. In 'Every Sunday they planted', the word 'they' means ___.", options: ["the fishermen", "the children", "the parents", "the birds"], answer: "the children" },
          { q: "5. How did the parents help?", answer: "They built fences against the waves." },
          { q: "6. Give ONE sign that the coast is coming back into balance.", answer: "Any one: the birds have come back / the fishermen's nets are fuller / the new trees are taller than the children." },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions: "Write 70-100 words. What happens when nature loses its balance? Choose ONE place, from the unit or from Vietnam. Say what was in balance, what changed and why, what happened next, and what people can do now.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (70-100 words).", answer: "Mark on four parts, 2.5 each. Content: all four points, with a clear chain of cause and effect. Organisation: a topic sentence, ideas in order, linking words (because, so, but, although, however). Grammar: correct sentences, including at least one if-sentence or compound sentence. Vocabulary: at least four of the unit's key words used correctly." },
        ],
      },
    ],
    speaking: {
      task: "Talk for 2 minutes: What happens when nature loses its balance? Use one case from the unit (the garden, Yellowstone or the Mekong) and one place you know in Vietnam. Then answer the teacher's follow-up questions.",
      prompts: [
        "What was the place like when it was in balance?",
        "What changed, and why did it change?",
        "What happened next? Tell me the chain of effects.",
        "What will happen if people do nothing? And if they help?",
        "Which do you think matters more: one animal, or the whole ecosystem? Why?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Speaks for the full 2 minutes with few pauses; ideas flow and are joined with linking words.",
            "Speaks for most of the time; some pauses, but keeps going and joins most ideas.",
            "Speaks for about a minute; frequent pauses; ideas mostly in short separate sentences.",
            "Says only a few sentences, with long pauses; needs the teacher's help to continue.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses several structures (if ... will, used to, present perfect, compound sentences) with very few mistakes.",
            "Uses some of these structures; mistakes do not stop the meaning.",
            "Mostly simple present and past sentences; mistakes sometimes make the meaning unclear.",
            "Single words or memorised phrases; many mistakes.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses five or more unit key words correctly and explains ideas in their own words.",
            "Uses three or four key words correctly; some repetition.",
            "Uses one or two key words; often repeats the same simple words.",
            "Very few topic words; cannot explain the idea without help.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear sounds and word stress (-ed endings correct); answers follow-up questions fully, with reasons.",
            "Mostly clear; answers follow-up questions with a reason or an example.",
            "Sometimes hard to understand; short answers to follow-up questions.",
            "Often hard to understand; cannot answer follow-up questions without help.",
          ],
        },
      ],
    },
  },
];
