// Reach Higher 3A, Unit 3: printable grammar worksheets for Jupiter, in three
// tiers with an answer key. The school's own items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U3Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u3-ws-place",
    title: "Prepositions of place",
    grammar: "prepositions of place",
    deckId: "rh-l3-u3-l1",
    slide: "Prepositions of place",
    intro:
      "Prepositions of place say where something is: in the pot, on the table, at the gate, under the leaf, behind the shed, between the two trees, next to the pond, opposite the school.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best word.",
        example: "The seed is ___ the soil. (in / between)  ->  in",
        items: [
          { q: "The bench is ___ the pond. It is right beside it.", options: ["next to", "under"], answer: "next to" },
          { q: "The cat is asleep ___ the tree. It is below the branches.", options: ["under", "on"], answer: "under" },
          { q: "The shed is ___ the garden. You cannot see it from the gate.", options: ["behind", "between"], answer: "behind" },
          { q: "The path goes ___ the two flower beds.", options: ["between", "at"], answer: "between" },
          { q: "Wait for me ___ the gate.", options: ["at", "in"], answer: "at" },
          { q: "The bird is ___ the branch.", options: ["on", "opposite"], answer: "on" },
          { q: "The school is ___ the park. They face each other across the road.", options: ["opposite", "behind"], answer: "opposite" },
          { q: "The lamp is ___ the roof.", options: ["on", "between"], answer: "on" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing preposition of place.",
        example: "The key is ___ the mat. (below it, hidden)  ->  under",
        items: [
          { q: "The seeds are ___ the packet ___ the drawer. (inside / inside)", answer: "in / in" },
          { q: "The pond is ___ the old mango tree and the gate.", answer: "between" },
          { q: "The garden is ___ the house. You go out of the back door to get to it.", answer: "behind" },
          { q: "Meet me ___ the bus stop at four.", answer: "at" },
          { q: "Rewrite so it means the same: The tree is beside the pond. (next to)", answer: "The tree is next to the pond." },
          { q: "Correct the mistake: The frog sits in the leaf.", answer: "The frog sits on the leaf." },
          { q: "Correct the mistake: The shop is opposite to the park.", answer: "The shop is opposite the park." },
          { q: "Correct the mistake: The path is in the two trees.", answer: "The path is between the two trees." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one direction using the preposition in brackets. Make it lead to the treasure plant.",
        example: "(behind) The treasure is behind the shed.",
        items: [
          { q: "Start at the gate. (opposite)", answer: "Any clear direction, e.g. Start at the gate opposite the old well." },
          { q: "Go past the pond. (next to)", answer: "Any clear direction, e.g. Walk next to the pond." },
          { q: "Cross the garden. (between)", answer: "Any clear direction, e.g. Walk between the roses and the bench." },
          { q: "Look near the wall. (under)", answer: "Any clear direction, e.g. Look under the big green leaf." },
          { q: "Say where the treasure is. (behind)", answer: "Any clear sentence, e.g. The treasure is behind the shed." },
          { q: "Write one false clue and say why it is false. (in)", answer: "Any logical answer, e.g. The treasure is in the pond, but a paper box would get wet." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u3-ws-articles",
    title: "Articles: a, an, the, or nothing",
    grammar: "a / an / the / no article",
    deckId: "rh-l3-u3-l2",
    slide: "Articles: a, an, the, or nothing",
    intro:
      "Use a / an for one thing that is new or any one: a seed, an orange. Use the when both people know which one, or there is only one: the sun, the seed on the table. Use nothing for plurals and uncountable nouns in general: Plants need water.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "She planted ___ seed. (a / the)  ->  a",
        items: [
          { q: "I ate ___ apple.", options: ["a", "an"], answer: "an" },
          { q: "___ sun gives plants energy.", options: ["The", "A"], answer: "The" },
          { q: "I have a seed. ___ seed is very small.", options: ["The", "A"], answer: "The" },
          { q: "Plants need ___ water.", options: ["the", "(no article)"], answer: "(no article)" },
          { q: "She is ___ gardener.", options: ["a", "an"], answer: "a" },
          { q: "We saw ___ umbrella plant.", options: ["an", "a"], answer: "an" },
          { q: "Which is correct?", options: ["Bees like the flowers.", "Bees like flowers."], answer: "Bees like flowers." },
          { q: "Close ___ gate, please. (we both know which gate)", options: ["the", "a"], answer: "the" },
        ],
      },
      {
        level: "Core",
        instructions: "Write a, an, the or - (no article).",
        example: "I saw ___ lotus in ___ pond. (first time / the pond we both know)  ->  a / the",
        items: [
          { q: "There is ___ old tree in our garden.", answer: "an" },
          { q: "___ tree in our garden is very old. (we both know which)", answer: "The" },
          { q: "___ roots take in water from the soil. (roots in general)", answer: "- (no article)" },
          { q: "___ moon went behind the cloud.", answer: "The" },
          { q: "Mai is ___ student in my class. (she is one of several)", answer: "a" },
          { q: "Correct the mistake: I like the mangoes. (in general)", answer: "I like mangoes." },
          { q: "Correct the mistake: She planted a seed. A seed grew fast.", answer: "She planted a seed. The seed grew fast." },
          { q: "Correct the mistake: He bought a umbrella.", answer: "He bought an umbrella." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write the sentence correctly with articles where they are needed.",
        example: "plant sat on table  ->  A plant sat on the table.",
        items: [
          { q: "gardener planted seed in pot", answer: "A gardener planted a seed in a pot. (also: the pot / the seed, if known)" },
          { q: "seed became sprout and sprout became plant", answer: "The seed became a sprout and the sprout became a plant. (also: A seed became a sprout ...)" },
          { q: "sun and rain help plants", answer: "The sun and the rain help plants. (also: Sun and rain help plants.)" },
          { q: "Write one sentence about rice that uses the.", answer: "Any correct sentence, e.g. The rice in our field grows fast." },
          { q: "Write one sentence about flowers in general (no article).", answer: "Any correct sentence, e.g. Flowers need sunlight." },
          { q: "Write two sentences about a mango: the first with a, the second with the.", answer: "Any correct pair, e.g. I found a mango. The mango was ripe." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u3-ws-passive",
    title: "The present passive",
    grammar: "present passive (am / is / are + past participle)",
    deckId: "rh-l3-u3-l6",
    slide: "The present passive",
    intro:
      "Use the passive when the action matters more than who does it: Tea leaves are picked by hand. Form: is / are + past participle. Add by + person only if it is important.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "Rice ___ in water. (is grown / are grown)  ->  is grown",
        items: [
          { q: "Tea leaves ___ in the morning.", options: ["are picked", "is picked"], answer: "are picked" },
          { q: "Paper ___ from wood.", options: ["is made", "are made"], answer: "is made" },
          { q: "The seeds ___ in spring.", options: ["are planted", "is planted"], answer: "are planted" },
          { q: "Coffee beans ___ before they are sold.", options: ["are dried", "dried"], answer: "are dried" },
          { q: "Which is passive?", options: ["Farmers grow rice.", "Rice is grown by farmers."], answer: "Rice is grown by farmers." },
          { q: "The rice ___ in big bags.", options: ["is sold", "sells"], answer: "is sold" },
          { q: "Fruit ___ every day in our market.", options: ["is sold", "are sold"], answer: "is sold" },
          { q: "Which is correct?", options: ["Tea is drinked.", "Tea is drunk."], answer: "Tea is drunk." },
        ],
      },
      {
        level: "Core",
        instructions: "Rewrite each sentence in the passive. Keep the tense the same.",
        example: "Farmers pick the tea.  ->  The tea is picked by farmers.",
        items: [
          { q: "Workers wash the beans.", answer: "The beans are washed (by workers)." },
          { q: "People eat rice every day.", answer: "Rice is eaten (by people) every day." },
          { q: "Farmers grow mangoes in the south.", answer: "Mangoes are grown (by farmers) in the south." },
          { q: "A machine cuts the paper.", answer: "The paper is cut (by a machine)." },
          { q: "They sell the tea in packets.", answer: "The tea is sold in packets." },
          { q: "People use leaves to make medicine.", answer: "Leaves are used to make medicine." },
          { q: "Correct the mistake: Rice are grown in Vietnam.", answer: "Rice is grown in Vietnam." },
          { q: "Correct the mistake: The beans is dried in the sun.", answer: "The beans are dried in the sun." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write each step of how tea is made, in order, in the present passive.",
        example: "Rice: the seeds / plant  ->  The seeds are planted.",
        items: [
          { q: "the leaves / pick", answer: "The leaves are picked." },
          { q: "the leaves / dry", answer: "The leaves are dried." },
          { q: "the tea / put in packets", answer: "The tea is put in packets." },
          { q: "the packets / send to shops", answer: "The packets are sent to shops." },
          { q: "Write one step where the environment can be harmed, in the passive.", answer: "Any correct sentence, e.g. Too much water is used in this step." },
          { q: "Write one solution in the passive.", answer: "Any correct sentence, e.g. The water is reused in the next step." },
        ],
      },
    ],
  },
];
