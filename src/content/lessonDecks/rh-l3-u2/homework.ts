// Reach Higher 3A, Unit 2 (Nature's Balance): Jupiter's creative homework, one
// per lesson, each a higher-order task built on that lesson's words and grammar
// with a challenge for the children who want more. Lessons 4 and 8 carry the
// exam-topic paragraph (owner's gap H: the paragraph topics the Hanoi tests use).
// The school's own writing; nothing from the Student Book.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U2Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["balance", "amount", "scarce", "supply", "react"], grammar: ["Wh- and How questions"] },
    base: {
      title: "The Balance Quiz Show",
      task: "Write a quiz of eight questions about animals and their homes for your family, with the answers on the back.",
      steps: [
        "Choose one place: a pond, a forest, a rice field or a city park.",
        "Write eight questions, each starting with a different question word (Who, What, Where, When, Why, How many, How much, How often).",
        "Write the answers on the back, then test someone at home and note their score.",
      ],
      frames: ["How many ___ live in ___?", "Why do ___ need ___?", "What happens to ___ when ___ is scarce?"],
      success: ["Eight correct questions (helper verb before the subject).", "At least three of the unit's words.", "Answers that are true facts."],
      challenge: "Add a bonus question that has two possible answers, and explain which one you think is better.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["balance", "control", "react", "interact"], grammar: ["four kinds of sentence", "because / so"] },
    base: {
      title: "The Chain Reaction Comic",
      task: "Draw a six-box comic in which one small change in nature causes a chain of surprises.",
      steps: [
        "Plan the chain: box 1 is the small change, boxes 2-5 are the effects, box 6 is the ending.",
        "Write one caption and one speech bubble in each box.",
        "Use a statement, a question, a command and an exclamation somewhere in the comic.",
      ],
      frames: ["___ happened, so ___.", "What a ___!", "Don't ___!", "Why did ___?"],
      success: ["Each box is caused by the box before it.", "All four kinds of sentence, correctly punctuated.", "At least two because and two so."],
      challenge: "Make the ending a twist: the people try to fix the problem and make it worse. Explain the twist in one sentence under the comic.",
    },
  },
  3: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["amount", "increase", "decrease", "supply", "scarce"], grammar: ["much / many / a few / a little / fewer / less"] },
    base: {
      title: "Design a Balanced Fish Tank",
      task: "Design a fish tank that stays in balance, and write the instructions for looking after it.",
      steps: [
        "Draw the tank and label everything in it: fish, snails, plants, stones, water.",
        "Write how many or how much of each thing you need, and why.",
        "Write three warnings: what happens if there is too much or too little of something.",
      ],
      frames: ["You need a few ___ because ___.", "Don't put in too much ___, or ___.", "If there are fewer ___, there will be more ___."],
      success: ["Countable and uncountable words used correctly.", "Every number has a reason.", "The warnings show cause and effect."],
      challenge: "Your little cousin wants to add ten more fish. Write a polite reply explaining why that would break the balance.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["balance", "resources", "control", "behavior"], grammar: ["first conditional", "unless"] },
    base: {
      title: "Exam-topic paragraph: a place out of balance",
      task: "Write 60-80 words about a place you know where nature is out of balance, and what will happen if nobody helps.",
      steps: [
        "Choose the place and say where it is (a river, a park, a beach, your street).",
        "Say what went wrong and why (one because, one so).",
        "Predict with two if-sentences: one if people do nothing, one if people help.",
      ],
      frames: ["___ is a ___ near my home.", "It has become ___ because ___.", "If nobody ___, ___ will ___.", "If we ___, ___ will ___."],
      success: ["60-80 words, three clear parts.", "Two correct first-conditional sentences.", "Linking words between the ideas."],
      challenge: "Add one sentence with unless and one exclamation that would make a reader want to help.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Compare and justify",
    uses: { words: ["ecosystem", "nature", "resources", "level"], grammar: ["past simple", "used to"] },
    base: {
      title: "Then and Now: interview a grandparent",
      task: "Interview an older person about how a place in Vietnam used to be, then write what has changed and whether it is better or worse.",
      steps: [
        "Ask four questions with Did you use to ...? and What was ... like?",
        "Write their answers in the past simple and with used to.",
        "Write your opinion: is the place better or worse now for nature? Give two reasons.",
      ],
      frames: ["When my grandmother was young, there used to be ___.", "People didn't use to ___.", "I think it is better / worse now because ___."],
      success: ["At least three used to and four past simple verbs, correctly formed.", "A clear opinion with two reasons.", "The -ed endings said correctly when you read it aloud."],
      challenge: "Compare their answer with the wolves story: write two ways the two places are alike and one way they are different.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["ecosystem", "food chain", "competition", "positive", "negative"], grammar: ["present perfect with for / since", "comparatives"] },
    base: {
      title: "Hero of the Ecosystem",
      task: "Choose one animal that keeps its ecosystem in balance and write a short speech nominating it for a 'Hero of the Ecosystem' award.",
      steps: [
        "Choose your animal (a wolf, a bee, a giant catfish, a frog, an elephant ...).",
        "Explain what it does for the other living things, with one comparison.",
        "Say what has changed in a place since this animal came back or left.",
      ],
      frames: ["I nominate the ___ because ___.", "Since ___, ___ has / have ___.", "The ___ is more important than ___ because ___."],
      success: ["One correct present perfect with for or since.", "One comparative or as ... as.", "Evidence for every reason."],
      challenge: "Add a rival nominee and explain fairly why your animal should still win.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["balance", "ecosystem", "positive", "negative"], grammar: ["and / but / or / so", "although / however"] },
    base: {
      title: "The 25-Word Challenge",
      task: "Summarise a film, cartoon or book you love in exactly 25 words, then in exactly 50 words.",
      steps: [
        "Write the main idea in one sentence.",
        "Add only the events that change the story; leave out the small details.",
        "Count the words. Cut or add until it is exactly 25, then write the 50-word version.",
      ],
      frames: ["This story is about ___.", "Although ___, ___.", "___, so ___. In the end, ___."],
      success: ["Exactly 25 and exactly 50 words.", "Only main events.", "At least one although or however."],
      challenge: "Ask someone at home which version is better and why. Write their answer and say whether you agree.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["balance", "ecosystem", "resources", "positive"], grammar: ["the more ..., the more ...", "too / enough / so ... that"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one sentence with so ... that or too ... to.",
        "Add one sentence with the more ..., the more ... (or the fewer / the less).",
      ],
      frames: ["The river is so ___ that ___.", "It is too ___ for ___ to ___.", "The more ___, the ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this lesson's grammar.", "Still 50-70 words."],
      challenge: "Write a second paragraph that argues the opposite side, as a person who thinks the change was good.",
    },
  },
};
