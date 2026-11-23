// Oxford Discover 2nd edition, Level 3, Unit 15 (Plants and People): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: a bean plant grows from a seed
// with a root first, bees carry pollen between flowers, and green plants make
// oxygen.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U15Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ measure words
  {
    id: "od2e-l3-u15-ws-measure",
    title: "Measure words: a jar of, a bag of, a box of",
    grammar: "measure word + of + food",
    deckId: "od2e-l3-u15-l3",
    slide: "Measure words: a jar of, a bag of, a box of",
    intro:
      "We cannot count rice or milk one by one, so we count the container: a bag of rice, two bottles of water. The pattern is measure word + of + food. The number counts the container (two jars), and of must stay in the middle.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "She has a bag ___ rice.  (of / with)  ->  of",
        items: [
          { q: "She has a bag ___ rice.", options: ["of", "with"], answer: "of" },
          { q: "Two ___ of water, please.", options: ["bottle", "bottles"], answer: "bottles" },
          { q: "Which one is right?", options: ["two rices", "two bags of rice"], answer: "two bags of rice" },
          { q: "There is a ___ of jam on the table. (one)", options: ["jar", "jars"], answer: "jar" },
          { q: "We bought three ___ of cookies.", options: ["box", "boxes"], answer: "boxes" },
          { q: "Which food can you count one by one?", options: ["milk", "banana"], answer: "banana" },
          { q: "Which sentence is correct?", options: ["He has a loaf bread.", "He has a loaf of bread."], answer: "He has a loaf of bread." },
          { q: "In a carton of milk, what does the word of do?", options: ["It joins the container to the food.", "It makes the food plural."], answer: "It joins the container to the food." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or rewrite the sentence as asked.",
        example: "I have two ___ of juice. (a drink in a bottle: bottle)  ->  bottles",
        items: [
          { q: "A ___ of honey. (a small glass container with a lid)", answer: "jar" },
          { q: "Three ___ of bananas. (a group of bananas joined together)", answer: "bunches" },
          { q: "Two ___ of bread. (bread in one long piece, from the baker)", answer: "loaves" },
          { q: "Fill in the gap: We need a bag ___ soil for the plant.", answer: "of" },
          { q: "Correct the mistake: I have two rices.", answer: "I have two bags of rice." },
          { q: "Correct the mistake: She has a box cookies.", answer: "She has a box of cookies." },
          { q: "Correct the mistake: He bought three bottle of water.", answer: "He bought three bottles of water." },
          { q: "Rewrite with a measure word: There is some milk in the fridge. (a carton)", answer: "There is a carton of milk in the fridge." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a full sentence for each one. Check every of and every plural.",
        example: "(Soil) Plants grow in soil.  ->  We put a bag of soil in the pot.",
        items: [
          { q: "Write a sentence about your kitchen with a jar of.", answer: "e.g. There is a jar of jam in my kitchen." },
          { q: "Write a sentence with two measure words and two foods.", answer: "e.g. I bought a bag of rice and two bottles of water." },
          { q: "Why do we say a bag of rice and not a rice? Explain in one sentence.", answer: "e.g. Because we cannot count rice one by one, so we count the bag." },
          { q: "Rewrite with a measure word: I need forty cookies for the party. (boxes)", answer: "e.g. I need four boxes of cookies for the party." },
          { q: "Find and correct two mistakes: We bought a bottles of water and two bag rice.", answer: "We bought a bottle of water and two bags of rice." },
          { q: "Write a short shopping list of three things with measure words for planting a vegetable garden.", answer: "e.g. a bag of soil, a packet of seeds, a bottle of water." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ sequence adverbs
  {
    id: "od2e-l3-u15-ws-sequence",
    title: "Sequence adverbs: First, Second, Finally",
    grammar: "First, Second, Third, Next, Then, Finally",
    deckId: "od2e-l3-u15-l4",
    slide: "Sequence adverbs: First, Second, Finally",
    intro:
      "Sequence adverbs show the order of the steps: First, Second, Third, Next, Then, Finally. Put a comma after each one, then write a short step: First, put soil in the pot. Use First once at the start and Finally once at the end.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "___, put soil in the pot. (the first step)  (First / Finally)  ->  First",
        items: [
          { q: "___, put soil in the pot. (the first step)", options: ["First", "Finally"], answer: "First" },
          { q: "___, put the pot near a sunny window. (the last step)", options: ["First", "Finally"], answer: "Finally" },
          { q: "Which one is correct?", options: ["First put soil in the pot.", "First, put soil in the pot."], answer: "First, put soil in the pot." },
          { q: "First, put soil in the pot. ___, push a seed into the soil.", options: ["Second", "Finally"], answer: "Second" },
          { q: "Which step comes first? Water the seed. / Put soil in the pot.", options: ["Water the seed.", "Put soil in the pot."], answer: "Put soil in the pot." },
          { q: "Which word can go in the middle of the steps?", options: ["Then", "Goodbye"], answer: "Then" },
          { q: "After a sequence adverb, we write a ___.", options: ["comma", "question mark"], answer: "comma" },
          { q: "Which is a good last step?", options: ["Finally, put the pot in the sun.", "First, put the pot in the sun."], answer: "Finally, put the pot in the sun." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or put the steps in order with sequence adverbs.",
        example: "___, fill a pot with soil. (the first step)  ->  First",
        items: [
          { q: "___, fill a pot with soil. (the first step)", answer: "First" },
          { q: "First, fill the pot. ___, push a seed into the soil. (the second step)", answer: "Second" },
          { q: "___, give the seed some water every day. (the third step)", answer: "Third" },
          { q: "___, put the pot in a sunny place. (the last step)", answer: "Finally" },
          { q: "Put in order with First and Finally: put the pot in the sun / fill the pot with soil", answer: "First, fill the pot with soil. Finally, put the pot in the sun." },
          { q: "Correct the mistake: First put the seed in the soil.", answer: "First, put the seed in the soil." },
          { q: "Correct the mistake: Finally, finally, water the plant.", answer: "Finally, water the plant." },
          { q: "Rewrite with Then: Water the seed after you plant it.", answer: "Then, water the seed." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write full sentences with commas. Think about the right order.",
        example: "(Make a sandwich)  ->  First, take two slices of bread. Finally, close the sandwich.",
        items: [
          { q: "Write four steps for growing a bean seed with First, Second, Third and Finally.", answer: "e.g. First, put a bean seed in a pot of soil. Second, water it. Third, put the pot in a sunny place. Finally, wait for the plant to sprout." },
          { q: "Write two steps for making a glass of juice. Use First and Finally.", answer: "e.g. First, cut some fruit. Finally, press it and pour the juice." },
          { q: "Find the mistake: Finally, put soil in the pot. First, water the seed.", answer: "The order is wrong: First, put soil in the pot. Finally, water the seed (or: Second, water the seed)." },
          { q: "Write a step with a measure word: First, ...", answer: "e.g. First, put a bag of soil in the pot." },
          { q: "Write one step with because to say why we do it: Second, water the seed ...", answer: "e.g. Second, water the seed because it needs water to sprout." },
          { q: "Write your own three-step instruction for looking after a plant.", answer: "e.g. First, give the plant some water. Next, turn the pot to the sun. Finally, take away the dry leaves." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Grammar Champions
  {
    id: "od2e-l3-u15-ws-champions",
    title: "Measure words: Grammar Champions",
    grammar: "number + measure word + of + food",
    deckId: "od2e-l3-u15-l5",
    slide: "Writing: A shopping paragraph",
    intro:
      "Grammar champions count the container when they cannot count the food: a bag of rice, two bottles of water. Check three things: of is always in the middle, the container gets the -s (boxes, bottles), and the food stays the same.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole phrase or sentence aloud.",
        example: "I have two ___ of rice.  (bag / bags)  ->  bags",
        items: [
          { q: "I have two ___ of rice.", options: ["bag", "bags"], answer: "bags" },
          { q: "She has a jar ___ honey.", options: ["of", "with"], answer: "of" },
          { q: "Which one is right?", options: ["two rices", "two bags of rice"], answer: "two bags of rice" },
          { q: "He bought a bunch ___ bananas.", options: ["for", "of"], answer: "of" },
          { q: "There are three ___ of cookies on the table.", options: ["box", "boxes"], answer: "boxes" },
          { q: "Which one is right?", options: ["a bag rice", "a bag of rice"], answer: "a bag of rice" },
          { q: "Which food can you NOT count one by one?", options: ["rice", "egg"], answer: "rice" },
          { q: "I need a ___ of bread for the sandwiches.", options: ["loaf", "bunch"], answer: "loaf" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word or fix the sentence.",
        example: "We bought a loaf ___ bread.  ->  of",
        items: [
          { q: "We bought a loaf ___ bread.", answer: "of" },
          { q: "The cook needs two ___ of juice. (bottle)", answer: "bottles" },
          { q: "Correct the mistake: I need three rices for the soup.", answer: "I need three bags of rice for the soup." },
          { q: "Correct the mistake: There are two box of cookies on the shelf.", answer: "There are two boxes of cookies on the shelf." },
          { q: "Join with because: We buy a bag of soil. We want to plant seeds.", answer: "We buy a bag of soil because we want to plant seeds." },
          { q: "Join with so: We have a carton of milk. We can make pancakes.", answer: "We have a carton of milk, so we can make pancakes." },
          { q: "Write the question: ___ bags of rice do we need?", answer: "How many" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write full sentences. Check of, the plural container and the food.",
        example: "(a jar)  ->  There is a jar of honey on the shelf.",
        items: [
          { q: "Write two sentences about a kitchen. Use a different measure word in each.", answer: "e.g. There is a bottle of oil on the shelf. There are two bags of rice under the table." },
          { q: "Find and fix two mistakes: I bought a bags rice and two bottle of waters.", answer: "I bought a bag of rice and two bottles of water." },
          { q: "Write a sentence with because about a shopping list for a class garden.", answer: "e.g. We need a bag of soil because the seeds need a home to grow in." },
          { q: "Write a sentence with so and a measure word.", answer: "e.g. We have two cartons of milk, so we can make pancakes for everyone." },
          { q: "Explain the rule in your own words: Why do we say two bags of rice and not two rices?", answer: "e.g. Because we cannot count rice one by one, so we count the bag, and of joins the bag to the rice." },
          { q: "Write three sentences about the shopping for a plant party, with a measure word, because and so.", answer: "e.g. For our plant party, we need three bags of soil because we have many seeds. We will buy a bottle of water, so every plant can drink. Plants give us food, so we want to say thank you." },
        ],
      },
    ],
  },
];

export const odL3U15Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u15-check",
    title: "Quick check: plant words and measure words",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["The plant words: soil, seeds, roots, stem, leaves, petals, nectar, pollen, oxygen", "Measure words: a jar of, a bag of, a box of"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write your answer on the whiteboard. One word is enough.",
        marksEach: 1,
        items: [
          { q: "The part of a plant under the ground that takes in water. Which word?", answer: "roots" },
          { q: "The sweet liquid inside a flower that bees drink. Which word?", answer: "nectar" },
          { q: "The gas in the air that we need to breathe. Which word?", answer: "oxygen" },
          { q: "The flat green parts of a plant that use sunlight. Which word?", answer: "leaves" },
        ],
      },
      {
        title: "Grammar: measure words",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: I have a bag ___ rice.", answer: "of" },
          { q: "Correct the mistake: She has two rices.", answer: "She has two bags of rice." },
          { q: "Complete with the right form: We need three ___ of water. (bottle)", answer: "bottles" },
          { q: "'A jar of jam' means we count the jam one by one.", options: ["True", "False"], answer: "False" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u15-test",
    title: "Unit 15 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 plant words and the parts of a plant",
      "Words in context: sprout, round, flat, important",
      "Cause and effect",
      "Measure words: a jar of, a bag of, a box of",
      "Sequence adverbs: First, Second, Finally",
      "Word families: strong / strength, wide / width, long / length",
      "Reading: the steps of a process",
      "Writing: how to grow a plant",
      "Speaking: explain how a plant grows and why we need it",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A sunflower grows in the brown ___.", options: ["soil", "nectar", "petals", "oxygen"], answer: "soil" },
          { q: "The ___ are under the ground and hold the plant in place.", options: ["roots", "petals", "leaves", "seeds"], answer: "roots" },
          { q: "The long part that holds up the leaves and the flower is the ___.", options: ["pollen", "stem", "soil", "nectar"], answer: "stem" },
          { q: "Bees drink the sweet ___ inside a flower.", options: ["nectar", "oxygen", "soil", "stem"], answer: "nectar" },
          { q: "Yellow ___ sticks to a bee and helps the flower make seeds.", options: ["pollen", "humans", "oxygen", "roots"], answer: "pollen" },
          { q: "Plants give us ___, the gas we breathe.", options: ["oxygen", "nectar", "pollen", "soil"], answer: "oxygen" },
          { q: "A seed starts to ___ when a tiny plant comes out of it.", options: ["sprout", "round", "flat", "pollen"], answer: "sprout" },
          { q: "A leaf is thin and ___, not round like a ball.", options: ["flat", "important", "sprout", "pollen"], answer: "flat" },
          { q: "Plants are ___ because people need food and oxygen.", options: ["important", "flat", "round", "tiny"], answer: "important" },
          { q: "Which word means people?", options: ["humans", "petals", "seeds", "leaves"], answer: "humans" },
        ],
      },
      {
        title: "Grammar: measure words",
        skill: "Grammar",
        instructions: "Do what each question asks. Write full sentences when you are asked to rewrite or correct.",
        marksEach: 1,
        items: [
          { q: "We cannot count rice, so we say a ___ of rice.", options: ["bag", "rice", "count"], answer: "bag" },
          { q: "I bought two ___ of water.", options: ["bottle", "bottles"], answer: "bottles" },
          { q: "Correct the mistake: He has a box cookies.", answer: "He has a box of cookies." },
          { q: "Correct the mistake: There are three jar of jam on the shelf.", answer: "There are three jars of jam on the shelf." },
          { q: "Rewrite with a measure word (carton): There is some milk in the fridge.", answer: "There is a carton of milk in the fridge." },
          { q: "Write your own sentence with a measure word and a food.", answer: "e.g. My mum buys a loaf of bread every day." },
        ],
      },
      {
        title: "Grammar: sequence adverbs",
        skill: "Grammar",
        instructions: "Choose or write the best answer. Remember the comma after a sequence adverb.",
        marksEach: 1,
        items: [
          { q: "___, put soil in the pot. (the first step)", options: ["First", "Finally", "Second"], answer: "First" },
          { q: "___, put the pot in the sun. (the last step)", options: ["First", "Finally", "Second"], answer: "Finally" },
          { q: "Correct the mistake: Second put a seed in the soil.", answer: "Second, put a seed in the soil." },
          { q: "Which is right? ___", options: ["Water the seed. First, put it in the soil.", "First, put it in the soil. Second, water the seed."], answer: "First, put it in the soil. Second, water the seed." },
          { q: "Write the sentence with Then: You water the plant after you plant the seed.", answer: "Then, water the plant." },
          { q: "Write two steps for looking after a plant with First and Finally.", answer: "e.g. First, give the plant some water. Finally, put it in a sunny place." },
        ],
      },
      {
        title: "Reading: how a bean plant grows",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "A bean plant begins as a seed. First, the seed sits in the soil and takes in water. It gets bigger, and the skin breaks open. Next, a small root grows down into the soil, and a stem grows up towards the light. Then two leaves open, and the young plant can use sunlight to make its own food. After a few weeks, the plant makes flowers. Bees visit the flowers to drink nectar, and they carry pollen from one flower to another. Because of this, long green pods begin to grow. Finally, the pods get dry, and the seeds inside are ready to grow into new plants. People eat beans from many plants. Like all green plants, a bean plant also makes oxygen, so it helps us in two ways: it gives us food and oxygen.",
        marksEach: 1,
        items: [
          { q: "The first thing the seed does is take in water.", options: ["True", "False"], answer: "True" },
          { q: "The stem grows down into the soil.", options: ["True", "False"], answer: "False" },
          { q: "Bees carry pollen from one flower to another.", options: ["True", "False"], answer: "True" },
          { q: "What grows after the flowers, because of the bees?", options: ["Long green pods", "A new root"], answer: "Long green pods" },
          { q: "What are the seeds inside the dry pods ready to do?", options: ["Grow into new plants", "Be thrown away"], answer: "Grow into new plants" },
          { q: "In what two ways does the bean plant help us? Answer in one sentence.", answer: "It gives us food (beans) and it makes oxygen for us to breathe." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences that tell a friend how to grow a plant or vegetable. Use First, Second and Finally with commas, and one measure word. Marks (5): the steps are in the right order, sequence adverbs with commas, a correct measure word with of, clear short sentences, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "How do you grow a plant?",
            answer:
              "e.g. First, fill a small pot with a bag of soil. Second, push two seeds into the soil. Third, give the seeds some water every day. Finally, put the pot near a sunny window. The seeds sprout in a few days because they get water and sun.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose one plant. Talk for about one minute: say what its parts are, how it grows in steps, and why we need it. Then answer two questions from the teacher.",
      prompts: [
        "What does your plant need to grow? What happens if it gets no water?",
        "Tell me the steps from a seed to a new plant, using First, Then and Finally.",
        "Why do we need plants?",
        "May I ask what the most interesting part of the plant is for you?",
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
            "Uses unit words correctly and naturally (parts of the plant, soil, nectar, pollen, oxygen).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the plant only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: sequence adverbs and measure words",
          bands: [
            "Tells the steps in the right order with First, Then and Finally, and uses a measure word with of correctly.",
            "Uses at least two sequence adverbs correctly; one small slip with order or a measure word.",
            "Tries sequence adverbs but with the wrong order or missing steps; measure words often wrong.",
            "No sequence adverbs; uses single words or one short sentence.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Says what the plant needs, explains a cause and its effect, and gives a clear reason why we need plants.",
            "Gives what the plant needs and a simple reason why we need plants.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
