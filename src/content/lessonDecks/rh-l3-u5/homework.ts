// Reach Higher 3B, Unit 5 (Mysteries of Matter): Jupiter's creative homework, one
// per lesson: a higher-order task on that lesson's words and grammar, with a
// challenge. Lessons 4 and 8 carry the exam-topic paragraph (gap H). The school's
// own writing.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U5Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["solid", "liquid", "melt", "substance"], grammar: ["-ed / -ing adjectives", "adjective order"] },
    base: {
      title: "My Kitchen Mystery Book",
      task: "Make a mini-book of four 'What am I?' riddles about things in your kitchen that change (ice, rice, butter, sugar, an egg).",
      steps: [
        "Look around your kitchen and choose four substances that can change.",
        "Write three clues for each: what it looks like (adjectives in order), what happens to it and why, how people feel about it.",
        "Put the answer on the back of each page and test the book on someone at home.",
      ],
      frames: ["I am a small white ___ substance.", "When I get hot, I ___.", "People are always ___ when ___. What am I?"],
      success: ["Four riddles with three clues each.", "Adjectives in the right order and -ed / -ing used correctly.", "Every riddle says what causes the change."],
      challenge: "Add a fifth riddle about a change that cannot go back, and a sentence explaining why it cannot.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Compare and justify",
    uses: { words: ["melt", "temperature", "thermometer", "trap", "liquid"], grammar: ["comparative adverbs", "so / such ... that"] },
    base: {
      title: "Home Melting Race",
      task: "Test how fast three ice cubes melt in three places at home, then write a report that compares the results and explains them.",
      steps: [
        "Choose three places (a sunny window, the table, inside a lunch box). Predict the order.",
        "Time each cube until it has melted. Write the times in a table.",
        "Write the report: what you tested, the results from fastest to slowest, and why.",
      ],
      frames: ["The cube on the window melted faster than ___.", "The lunch box trapped ___, so ___.", "It was such a warm afternoon that ___."],
      success: ["Real times in a table.", "Three correct comparative adverbs and one so / such ... that.", "A reason for the order, using a Part 1 word."],
      challenge: "Design a fourth test that you think will make an ice cube last the longest. Explain why it will work.",
    },
  },
  3: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["melt", "freeze", "occur", "trap"], grammar: ["past continuous", "when / while"] },
    base: {
      title: "Comic: The Great Freezer Mystery",
      task: "Make a six-panel comic about a mystery: someone left the freezer open and everything melted. Who did it?",
      steps: [
        "Plan: the discovery, three suspects, their alibis, the clue, the answer.",
        "Each suspect says what they were doing when it happened (past continuous).",
        "Show the clue that solves it with a when or while sentence.",
      ],
      frames: ["\"I was ___ when the ice cream melted!\"", "\"While you were ___, I was ___.\"", "\"But the melted ice shows that ___!\""],
      success: ["Three alibis with correct past continuous verbs.", "One when and one while sentence.", "A clue that uses what we know about melting."],
      challenge: "Make one alibi sound true but contain a science mistake that gives the suspect away (for example, ice that melted in two seconds).",
    },
  },
  4: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["substance", "form", "alter", "temperature"], grammar: ["past passive", "linking words"] },
    base: {
      title: "Exam-topic paragraph: a dish my family made",
      task: "Write 60-80 words about a dish your family made for a special day (bánh chưng, xôi, nem, a birthday cake). Say what was used, how it was made, and how the food changed.",
      steps: [
        "Name the dish and the occasion.",
        "Say how it was made, with at least three past passives (was washed, were wrapped, was boiled).",
        "Say how the food changed and what caused it, linked with because and so.",
      ],
      frames: ["For Tết, my family made ___.", "First the ___ was ___, then it was ___.", "The heat altered ___, so ___."],
      success: ["60-80 words, three clear parts.", "Three correct past passives.", "The cause of the change is explained."],
      challenge: "Add one sentence about a change that cannot go back, and one about a change that can.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["wetland", "ground", "surface", "mixture", "area"], grammar: ["prefixes un- / in- / im- / dis-", "It takes ... to / spend -ing"] },
    base: {
      title: "Brochure: A Day in the Wetland",
      task: "Design a two-page brochure for a day trip to a Vietnamese wetland, with a plan for the day and advice for visitors.",
      steps: [
        "Choose the wetland and draw or stick a picture on the front.",
        "Plan the day: how long it takes to get there and to walk each trail, what visitors spend time doing.",
        "Add a 'Be careful!' box with three prefix words (unsafe, impossible, invisible ...).",
      ],
      frames: ["It takes about ___ to get there by ___.", "In the afternoon, you can spend an hour ___ -ing.", "It is unsafe to ___ because the ground ___."],
      success: ["A clear plan with times.", "Both It takes ... to and spend ... -ing used correctly.", "Three prefix words and three Part 2 words."],
      challenge: "Add a short review from an unhappy visitor, and your polite reply that answers each complaint.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["combine", "mixture", "firm", "ground", "sand"], grammar: ["zero conditional", "first conditional"] },
    base: {
      title: "Save Our Lake: A Campaign Poster",
      task: "Make a campaign poster that argues for or against filling in a lake in your city to build on it.",
      steps: [
        "Choose your side and write a slogan.",
        "Write two science facts with the zero conditional and two predictions with the first conditional.",
        "Add a picture or diagram that shows what will happen to the ground.",
      ],
      frames: ["If you combine sand and water, ___.", "If the city fills in the lake, ___ will ___.", "As soon as the rainy season comes, ___."],
      success: ["Two zero and two first conditionals, all correct.", "No will after if or as soon as.", "At least three Part 2 words."],
      challenge: "Write the other side's best argument in one sentence, then answer it.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["temperature", "substance", "freeze", "water"], grammar: ["possessives", "reported questions (stretch)"] },
    base: {
      title: "Interview: Before Fridges",
      task: "Interview a grandparent or an older neighbour about how their family kept food cold or fresh when they were young, then report it and judge which old way was best.",
      steps: [
        "Write five questions (How did you keep ...? Did your family have ...?).",
        "Ask them and note the answers; use possessives (my grandmother's kitchen, the family's rice).",
        "Write a report of 100-120 words with two reported questions, and say which old method you think worked best and why.",
      ],
      frames: ["I asked my grandmother how ___.", "I asked her if ___.", "Her family's way of ___ was ___.", "I think the best method was ___ because ___."],
      success: ["Five real questions and answers.", "Two correct reported questions and three possessives.", "A clear judgement with a reason."],
      challenge: "Compare one old method with a fridge: what does each one do to the temperature of the food, and which is better for the environment?",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["melt", "alter", "mixture", "temperature"], grammar: ["present perfect with ever / already / yet / just", "past passive"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one present perfect sentence with ever, never or already.",
        "Add one past passive or one conditional sentence about the change.",
      ],
      frames: ["I have never seen ___ before.", "The ___ was altered by ___.", "If you heat ___, it ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
      challenge: "Write a 3B start-of-book reflection: the two most useful things Unit 5 taught you for the entrance test, and how you will practise them.",
    },
  },
};
