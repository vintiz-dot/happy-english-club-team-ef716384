// Reach Higher 3A, Unit 3 (Life in the Soil): Jupiter's creative homework, one per
// lesson: a higher-order task on that lesson's words and grammar, with a challenge.
// Lessons 4 and 8 carry the exam-topic paragraph (gap H). The school's own writing.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U3Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["plant", "soil", "root", "seed"], grammar: ["prepositions of place"] },
    base: {
      title: "Design a Secret Garden",
      task: "Draw a map of a secret garden and write a treasure-hunt guide that leads a friend to a hidden plant.",
      steps: [
        "Draw the garden from above with at least eight things (pond, shed, bench, three kinds of plants, a gate).",
        "Write six directions with prepositions of place that lead to the treasure plant.",
        "Test it: can someone at home find the treasure from your words only?",
      ],
      frames: ["Start at the gate opposite the ___.", "Walk between the ___ and the ___.", "The treasure is under / behind / next to ___."],
      success: ["Six correct prepositions of place.", "The directions really lead to the treasure.", "A clear, labelled map."],
      challenge: "Add one false clue that sounds right, and explain in a note how a careful reader would spot it.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["seed", "sprout", "blossom", "cycle", "growth"], grammar: ["a / an / the"] },
    base: {
      title: "The Life Cycle Comic",
      task: "Make a six-panel comic of a plant's life cycle that ends where it began.",
      steps: [
        "Choose a plant you can see in Vietnam (rice, mango, lotus, dragon fruit).",
        "Draw six panels: seed, sprout, young plant, blossom, fruit, new seed.",
        "Write a caption for each with at least one article, used correctly.",
      ],
      frames: ["A tiny seed fell into the soil.", "The seed became a sprout ___.", "In the end, the fruit dropped a new seed, and ___."],
      success: ["The cycle is complete and in the right order.", "Articles correct in every caption.", "At least four unit words."],
      challenge: "Add a seventh panel where something breaks the cycle, and an eighth where people help it start again.",
    },
  },
  3: {
    kind: "creative",
    thinking: "Compare and justify",
    uses: { words: ["condition", "depend", "growth", "produce"], grammar: ["in / on / at", "for / during / until / by"] },
    base: {
      title: "Plant Calendar for a Busy Family",
      task: "Make a one-year calendar that tells a family exactly when to plant, water and harvest three plants on their balcony.",
      steps: [
        "Choose three plants that grow well in Hanoi (herbs, chilli, tomatoes, a small lemon tree).",
        "Write when to do each job, with exact time prepositions.",
        "Add one warning for the hottest month and one for the coldest.",
      ],
      frames: ["Plant the ___ in ___.", "Water it every morning during ___.", "Harvest it by ___."],
      success: ["Every job has a correct time expression.", "The advice fits Hanoi's seasons.", "Clear for a busy family to follow."],
      challenge: "Explain which of the three plants is easiest for beginners and justify your choice with two reasons.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["environment", "growth", "protect"], grammar: ["plural nouns", "linking words"] },
    base: {
      title: "Exam-topic paragraph: a green place I love",
      task: "Write 60-80 words about a park, garden or green place you love. Say where it is, what grows there, and why it matters to you.",
      steps: [
        "Say where it is with two prepositions of place.",
        "Describe what grows there with at least three plural nouns.",
        "Give two reasons why it matters, linked with because and so.",
      ],
      frames: ["My favourite green place is ___, next to ___.", "There are many ___ and a few ___.", "It matters to me because ___, so ___."],
      success: ["60-80 words, three clear parts.", "Correct plurals and articles.", "Two linked reasons."],
      challenge: "Add one sentence about what will happen to the place if people stop looking after it.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["organism", "environment", "unique", "diversity"], grammar: ["who / which / where"] },
    base: {
      title: "Invent a Plant",
      task: "Invent a new plant for a desert, a rainforest or a city, and write its encyclopedia entry.",
      steps: [
        "Choose its environment and draw the plant.",
        "Write five sentences with who / which / where explaining what makes it unique.",
        "Explain how it protects itself and which organisms depend on it.",
      ],
      frames: ["The ___ is a plant which ___.", "It grows in places where ___.", "Animals who ___ depend on it."],
      success: ["Five correct relative clauses.", "The plant suits its environment.", "At least three Part 2 words."],
      challenge: "Add a short entry for an animal whose life depends on your plant, using whose.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["protect", "diversity", "organism", "environment"], grammar: ["present passive"] },
    base: {
      title: "How Is It Made? A Factory of Nature",
      task: "Explain in steps how something from plants reaches your home (paper, rice, tea, coffee or chocolate), using the passive.",
      steps: [
        "Choose the product and find out the main steps.",
        "Write six steps, each in the present passive.",
        "Add one step where the environment can be harmed, and how it can be protected.",
      ],
      frames: ["First, the ___ are picked.", "Then they are ___ and ___.", "Finally, the ___ is sold in ___."],
      success: ["Six correct passive sentences in order.", "One harm and one solution.", "A clear flow diagram."],
      challenge: "Compare your process with a classmate's: which product is kinder to the environment? Write three sentences.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["diversity", "protection", "environment"], grammar: ["adjective vs adverb", "word formation"] },
    base: {
      title: "Review a Park Like a Critic",
      task: "Review a park or garden you have visited, giving it stars for nature, cleanliness and fun.",
      steps: [
        "Visit or remember the place. Note what you saw, heard and did.",
        "Write a review of 80-100 words with three adjectives and three adverbs.",
        "Give stars for each part and justify every score.",
      ],
      frames: ["___ is a beautifully kept park in ___.", "The paths are ___, but the bins are ___.", "I give it ___ stars because ___."],
      success: ["Adjectives and adverbs used correctly.", "Every score has a reason.", "At least two word-formation words (-ful, -less, -ness, -tion)."],
      challenge: "Write one sentence of advice to the park's manager that would raise its score, using if ... will.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["unique", "diversity", "protect"], grammar: ["superlatives", "will / going to"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one sentence with a superlative.",
        "Add one sentence about your plan with going to.",
      ],
      frames: ["It is the most ___ place I have ever seen.", "Next summer I'm going to ___.", "If we protect it, ___ will ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this lesson's grammar.", "Still 50-70 words."],
      challenge: "Write a second paragraph from the point of view of a plant that lives there.",
    },
  },
};
