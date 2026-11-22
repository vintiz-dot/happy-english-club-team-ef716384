// Reach Higher 3A, Unit 2 (Nature's Balance): printable grammar worksheets for
// Jupiter, in three tiers with an answer key. The school's own items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U2Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u2-ws-questions",
    title: "Wh- and How questions",
    grammar: "Wh- and How questions",
    deckId: "rh-l3-u2-l1",
    slide: "Wh- and How questions",
    intro:
      "A question word comes first, then the helper verb, then the subject: Where do frogs live? How many eggs did the frog lay? With who or what as the subject there is no helper: Who lives here?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer. Then read the whole question aloud.",
        example: "___ does the river start? (Where / Who)  ->  Where",
        items: [
          { q: "___ do bees live? In a hive.", options: ["Where", "Who"], answer: "Where" },
          { q: "___ many frogs are in the pond?", options: ["How", "What"], answer: "How" },
          { q: "Why ___ the fish die?", options: ["did", "does"], answer: "did" },
          { q: "How ___ does it rain in July?", options: ["often", "many"], answer: "often" },
          { q: "___ do wolves eat? Deer and rabbits.", options: ["What", "Where"], answer: "What" },
          { q: "How ___ water is in the bottle?", options: ["much", "many"], answer: "much" },
          { q: "Where ___ the birds fly in winter?", options: ["do", "does"], answer: "do" },
          { q: "Which question is correct?", options: ["Why the river is dirty?", "Why is the river dirty?"], answer: "Why is the river dirty?" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words or the whole question.",
        example: "___ do owls hunt? At night.  ->  When",
        items: [
          { q: "___ do elephants drink water? At the river. (one word)", answer: "Where" },
          { q: "How ___ does a frog sleep in winter? (ask about the length of time; one word)", answer: "long" },
          { q: "___ are there so few fish now? (ask for the reason; one word)", answer: "Why" },
          { q: "Write a question for the words in capitals: The farmer sprays the fields EVERY WEEK.", answer: "How often does the farmer spray the fields?" },
          { q: "Write a question for the words in capitals: The villagers planted THIRTY TREES.", answer: "How many trees did the villagers plant?" },
          { q: "Write a question for the words in capitals: The wolves live IN THE FOREST.", answer: "Where do the wolves live?" },
          { q: "Correct the mistake: What did the bees found?", answer: "What did the bees find?" },
          { q: "Correct the mistake: How much frogs live here?", answer: "How many frogs live here?" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full question for each situation. Use a different question word each time.",
        example: "You want to know the reason: Why did the river dry up?",
        items: [
          { q: "Ask how many fish were in the lake last year.", answer: "How many fish were in the lake last year?" },
          { q: "Ask the name of the person who saved the pond.", answer: "Who saved the pond? (no helper verb after who)" },
          { q: "Ask how much rain fell in June.", answer: "How much rain fell in June?" },
          { q: "Ask the reason the bees left the garden.", answer: "Why did the bees leave the garden?" },
          { q: "Ask how often the farmers water the rice.", answer: "How often do the farmers water the rice?" },
          { q: "Ask the time when the frogs sing. Use When.", answer: "When do the frogs sing?" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u2-ws-quantifiers",
    title: "Quantifiers: much, many, a few, a little, fewer, less",
    grammar: "much / many / a few / a little / fewer / less",
    deckId: "rh-l3-u2-l3",
    slide: "Quantifiers: countable and uncountable",
    intro:
      "Countable nouns (fish, trees) take many, a few, fewer. Uncountable nouns (water, rice) take much, a little, less. In questions and negatives use many / much: There aren't many fish. There isn't much water.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "There are ___ fish in the pond. (many / much)  ->  many",
        items: [
          { q: "There isn't ___ water in the well.", options: ["many", "much"], answer: "much" },
          { q: "We saw a ___ birds in the tree.", options: ["few", "little"], answer: "few" },
          { q: "Add a ___ salt to the soil.", options: ["little", "few"], answer: "little" },
          { q: "There are ___ frogs than last year. (not as many)", options: ["fewer", "less"], answer: "fewer" },
          { q: "There is ___ rain than last year. (not as much)", options: ["less", "fewer"], answer: "less" },
          { q: "How ___ bees are in the hive?", options: ["many", "much"], answer: "many" },
          { q: "Which noun is uncountable?", options: ["tree", "rice"], answer: "rice" },
          { q: "Which sentence is correct?", options: ["There are less trees.", "There are fewer trees."], answer: "There are fewer trees." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word: much, many, a few, a little, fewer or less.",
        example: "We need ___ water, not a lot.  ->  a little",
        items: [
          { q: "There aren't ___ tigers left in the forest.", answer: "many" },
          { q: "The farmer used ___ fertiliser this year, so the soil is cleaner. (not as much)", answer: "less" },
          { q: "___ children came to plant trees: only four.", answer: "A few" },
          { q: "How ___ sugar do bees need?", answer: "much" },
          { q: "There are ___ birds now than in 2010. (the number is smaller)", answer: "fewer" },
          { q: "Correct the mistake: There is too many rubbish on the beach.", answer: "There is too much rubbish on the beach." },
          { q: "Correct the mistake: We caught less fish this month.", answer: "We caught fewer fish this month." },
          { q: "Correct the mistake: She gave the plant a few water.", answer: "She gave the plant a little water." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence. Use the quantity word in brackets and make it true for your own town.",
        example: "(fewer) There are fewer trees on my street than in the park.",
        items: [
          { q: "Write about rubbish in the street. (much)", answer: "Any true sentence, e.g. There isn't much rubbish in my street." },
          { q: "Write about birds near your home. (a few)", answer: "Any true sentence, e.g. There are a few birds in the tree near my home." },
          { q: "Compare cars now and long ago. (fewer)", answer: "Any true sentence, e.g. There were fewer cars when my mother was young." },
          { q: "Compare noise now and long ago. (less)", answer: "Any true sentence, e.g. There was less noise in the past." },
          { q: "Ask about water in the lake. (How much)", answer: "How much water is there in the lake?" },
          { q: "Ask about fish in the lake. (How many)", answer: "How many fish are there in the lake?" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u2-ws-first-conditional",
    title: "The first conditional",
    grammar: "first conditional (if + present, will + verb)",
    deckId: "rh-l3-u2-l4",
    slide: "The first conditional",
    intro:
      "Use if + present simple for a real possibility, and will + verb for its result: If it rains, the river will rise. Never put will after if. unless means if not: Unless we help, the pond will dry up.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "If it rains, the pond ___ full. (will be / is being)  ->  will be",
        items: [
          { q: "If we plant trees, the air ___ cleaner.", options: ["will be", "would be"], answer: "will be" },
          { q: "If the frogs ___, the insects will increase.", options: ["disappear", "will disappear"], answer: "disappear" },
          { q: "If you ___ the plant, it will die.", options: ["don't water", "won't water"], answer: "don't water" },
          { q: "The bees will die if the farmer ___ chemicals.", options: ["sprays", "will spray"], answer: "sprays" },
          { q: "If it ___ tomorrow, we will not go.", options: ["rains", "will rain"], answer: "rains" },
          { q: "___ we help, the pond will dry up. (If we do not help)", options: ["Unless", "If"], answer: "Unless" },
          { q: "Which sentence is correct?", options: ["If I will see a snake, I will run.", "If I see a snake, I will run."], answer: "If I see a snake, I will run." },
          { q: "If there is no food, the birds ___ away.", options: ["will fly", "flew"], answer: "will fly" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the right form.",
        example: "If we (cut) the trees, the soil (wash) away.  ->  cut / will wash",
        items: [
          { q: "If the farmers (use) less water, the river (stay) full.", answer: "use / will stay" },
          { q: "If it (not rain), the rice (not grow).", answer: "doesn't rain / won't grow" },
          { q: "The fish (die) if the water (get) too warm.", answer: "will die / gets" },
          { q: "Rewrite with unless: If we do not stop the rubbish, the beach will be dirty.", answer: "Unless we stop the rubbish, the beach will be dirty." },
          { q: "Rewrite with if: Unless you feed the birds, they will leave.", answer: "If you do not feed the birds, they will leave." },
          { q: "Join the ideas: We plant trees. The air gets cleaner. (first conditional)", answer: "If we plant trees, the air will get cleaner." },
          { q: "Correct the mistake: If the river will flood, the village will be wet.", answer: "If the river floods, the village will be wet." },
          { q: "Correct the mistake: If you will help, we finish faster.", answer: "If you help, we will finish faster." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one first-conditional sentence for each situation.",
        example: "Wolves return to a forest.  ->  If wolves return, the deer will become fewer.",
        items: [
          { q: "A factory puts dirty water in a river.", answer: "Any correct sentence, e.g. If the factory puts dirty water in the river, the fish will die." },
          { q: "Children plant a school garden.", answer: "Any correct sentence, e.g. If the children plant a garden, more bees will come." },
          { q: "People stop using plastic bags. Use unless or if.", answer: "Any correct sentence, e.g. If people stop using plastic bags, the sea will be cleaner." },
          { q: "A drought arrives in the north.", answer: "Any correct sentence, e.g. If a drought arrives, the farmers will lose their crops." },
          { q: "Write a warning with unless about a pond.", answer: "Any correct sentence, e.g. Unless we clean the pond, the frogs will leave." },
          { q: "Write one if-sentence that gives a promise to your teacher.", answer: "Any correct sentence, e.g. If I finish my homework, I will check it twice." },
        ],
      },
    ],
  },
];
