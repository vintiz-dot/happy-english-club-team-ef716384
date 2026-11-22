// Reach Higher 3A, Unit 3: the football edition of each lesson's creative
// homework, same words and grammar as the class version and equally demanding.
// Built around Arsenal (the Gunners, the Emirates Stadium, match day); no real
// players' names, logos or chants. Keyed by deck id.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const fb = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U3Football: Record<string, Football> = {
  "rh-l3-u3-l1": fb({
    title: "Design a Secret Garden at the Stadium",
    task: "Draw a map of a secret garden behind a football stadium and write a treasure-hunt guide that leads a fan to a hidden plant.",
    steps: [
      "Draw the garden from above with at least eight things (a pond, a shed for the kit, a bench, three kinds of plants, a gate, a goal).",
      "Write six directions with prepositions of place that lead to the treasure plant.",
      "Test it: can someone at home find the treasure from your words only?",
    ],
    frames: ["Start at the gate opposite the ___.", "Walk between the ___ and the ___.", "The treasure is under / behind / next to ___."],
    success: ["Six correct prepositions of place.", "The directions really lead to the treasure.", "A clear, labelled map with words like plant, soil, root or seed."],
    challenge: "Add one false clue that sounds right, and explain in a note how a careful reader would spot it.",
  }),
  "rh-l3-u3-l2": fb({
    title: "The Life Cycle of a Pitch Plant Comic",
    task: "Make a six-panel comic of the life cycle of the grass or a flower that grows beside a football pitch, ending where it began.",
    steps: [
      "Choose a plant you can see near a pitch (grass, clover, a daisy, a sunflower).",
      "Draw six panels: seed, sprout, young plant, blossom, fruit or seed head, new seed.",
      "Write a caption for each with at least one article, used correctly.",
    ],
    frames: ["A tiny seed fell into the soil by the pitch.", "The seed became a sprout ___.", "In the end, the plant dropped a new seed, and ___."],
    success: ["The cycle is complete and in the right order.", "Articles correct in every caption.", "At least four unit words (seed, sprout, blossom, cycle, growth)."],
    challenge: "Add a seventh panel where match day breaks the cycle, and an eighth where the groundskeeper helps it start again.",
  }),
  "rh-l3-u3-l3": fb({
    title: "Pitch Calendar for a Busy Groundskeeper",
    task: "Make a one-year calendar that tells a groundskeeper exactly when to sow, water and cut the grass and plant flowers around a stadium in Hanoi.",
    steps: [
      "Choose three jobs for the pitch and its edges (sowing seed, watering, planting flowers).",
      "Write when to do each job, with exact time prepositions.",
      "Add one warning for the hottest month and one for the coldest.",
    ],
    frames: ["Sow the grass seed in ___.", "Water the pitch every morning during ___.", "Finish the planting by ___."],
    success: ["Every job has a correct time expression (in, on, at, for, during, until, by).", "The advice fits Hanoi's seasons.", "Clear for a busy groundskeeper to follow, with words like condition, depend or growth."],
    challenge: "Explain which of the three jobs is the most important before a big match and justify your choice with two reasons.",
  }),
  "rh-l3-u3-l4": fb({
    title: "Exam-topic paragraph: a green place at the match",
    task: "Write 60-80 words about a park, pitch or green place near a football ground that you love. Say where it is, what grows there, and why it matters to you.",
    steps: [
      "Say where it is with two prepositions of place.",
      "Describe what grows there with at least three plural nouns.",
      "Give two reasons why it matters, linked with because and so.",
    ],
    frames: ["My favourite green place is ___, next to ___.", "There are many ___ and a few ___.", "It matters to me because ___, so ___."],
    success: ["60-80 words, three clear parts.", "Correct plurals and articles.", "Two linked reasons, with words like environment, growth or protect."],
    challenge: "Add one sentence about what will happen to the place if people stop looking after it after matches.",
  }),
  "rh-l3-u3-l5": fb({
    title: "Invent a Stadium Plant",
    task: "Invent a new plant that could grow on the roof or walls of a football stadium, and write its encyclopedia entry.",
    steps: [
      "Choose its environment (a roof, a wall, a car park) and draw the plant.",
      "Write five sentences with who / which / where explaining what makes it unique.",
      "Explain how it protects itself and which organisms depend on it.",
    ],
    frames: ["The ___ is a plant which ___.", "It grows in places where ___.", "Birds and insects which ___ depend on it."],
    success: ["Five correct relative clauses.", "The plant suits its environment.", "At least three Part 2 words (organism, environment, unique, diversity)."],
    challenge: "Add a short entry for an animal whose life depends on your plant, using whose.",
  }),
  "rh-l3-u3-l6": fb({
    title: "How Is It Made? The Pitch Behind the Match",
    task: "Explain in steps how something from plants reaches a football match (a grass pitch, paper tickets, cotton shirts or a bamboo flag stick), using the passive.",
    steps: [
      "Choose the product and find out the main steps.",
      "Write six steps, each in the present passive.",
      "Add one step where the environment can be harmed, and how it can be protected.",
    ],
    frames: ["First, the ___ is grown.", "Then it is ___ and ___.", "Finally, the ___ is sent to the ___."],
    success: ["Six correct passive sentences in order.", "One harm and one solution (protect, environment).", "A clear flow diagram."],
    challenge: "Compare your process with a classmate's: which product is kinder to the environment? Write three sentences.",
  }),
  "rh-l3-u3-l7": fb({
    title: "Review a Stadium Park Like a Critic",
    task: "Review a park or green space beside a football ground you have visited, giving it stars for nature, cleanliness and fun on match day.",
    steps: [
      "Visit or remember the place. Note what you saw, heard and did.",
      "Write a review of 80-100 words with three adjectives and three adverbs.",
      "Give stars for each part and justify every score.",
    ],
    frames: ["___ is a beautifully kept space near ___.", "The paths are ___, but the bins are ___.", "I give it ___ stars because ___."],
    success: ["Adjectives and adverbs used correctly.", "Every score has a reason.", "At least two word-formation words (-ful, -less, -ness, -tion), and words like diversity, protection or environment."],
    challenge: "Write one sentence of advice to the manager that would raise its score, using if ... will.",
  }),
  "rh-l3-u3-l8": fb({
    title: "Exam-topic paragraph: the Emirates Stadium, rewritten and raised",
    task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences about a green place near a football stadium.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one sentence with a superlative.",
      "Add one sentence about your plan with going to.",
    ],
    frames: ["It is the most ___ stadium I have ever seen.", "Next match day I'm going to ___.", "If we protect it, ___ will ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this lesson's grammar.", "Still 50-70 words, with words like unique, diversity or protect."],
    challenge: "Write a second paragraph from the point of view of a plant that grows beside the pitch.",
  }),
};
