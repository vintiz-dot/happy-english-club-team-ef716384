// Reach Higher 3B, Unit 5 (Mysteries of Matter): the football edition of each
// lesson's creative homework. Same words, same grammar, same demand as the class
// task; built around football and supporting Arsenal. No players' names, logos or
// chants. The school's own writing.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const f = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U5Football: Record<string, Football> = {
  "rh-l3-u5-l1": f({
    title: "My Match Day Mystery Book",
    task: "Make a mini-book of four 'What am I?' riddles about things at a football match that change (ice in a drink, a pie, a wet pitch, a hot cup of tea).",
    steps: [
      "Think about match day at the Emirates Stadium and choose four substances that can change.",
      "Write three clues for each: what it looks like (adjectives in order), what happens to it and why, how fans feel about it.",
      "Put the answer on the back of each page and test the book on someone at home.",
    ],
    frames: ["I am a small cold ___ substance.", "When the sun comes out, I ___.", "Fans are always ___ when ___. What am I?"],
    success: ["Four riddles with three clues each.", "Adjectives in the right order and -ed / -ing used correctly.", "Every riddle says what causes the change."],
    challenge: "Add a fifth riddle about a change that cannot go back (a burnt pie), and a sentence explaining why it cannot.",
  }),
  "rh-l3-u5-l2": f({
    title: "Match Day Cold Drink Test",
    task: "Test how fast three ice cubes melt in three places on a pretend match day, then write a report that compares the results and explains them.",
    steps: [
      "Choose three places (a sunny window, the table, inside a cool bag). Predict the order.",
      "Time each cube until it has melted. Write the times in a table.",
      "Write the report for the Arsenal fans' drink stall: the results from fastest to slowest, and why.",
    ],
    frames: ["The cube on the window melted faster than ___.", "The cool bag trapped ___, so ___.", "It was such a hot match day that ___."],
    success: ["Real times in a table.", "Three correct comparative adverbs and one so / such ... that.", "A reason for the order, using a Part 1 word."],
    challenge: "Design a fourth test that you think will keep a cold drink cold for the whole match. Explain why it will work.",
  }),
  "rh-l3-u5-l3": f({
    title: "Comic: The Melted Ice Mystery at the Stadium",
    task: "Make a six-panel comic about a mystery: the ice for the fans' drinks was left out and melted before the match. Who did it?",
    steps: [
      "Plan: the discovery, three suspects, their alibis, the clue, the answer.",
      "Each suspect says what they were doing when it happened (past continuous), for example in the Gunners' stadium shop.",
      "Show the clue that solves it with a when or while sentence.",
    ],
    frames: ["\"I was ___ when the ice melted!\"", "\"While you were ___, I was ___.\"", "\"But the melted ice shows that ___!\""],
    success: ["Three alibis with correct past continuous verbs.", "One when and one while sentence.", "A clue that uses what we know about melting."],
    challenge: "Make one alibi sound true but contain a science mistake that gives the suspect away (for example, ice that melted in two seconds).",
  }),
  "rh-l3-u5-l4": f({
    title: "Exam-topic paragraph: food on match day",
    task: "Write 60-80 words about a food your family made for a football match at home (a pizza, a pie, popcorn, a big pot of soup). Say what was used, how it was made, and how the food changed.",
    steps: [
      "Name the food and the match you watched, perhaps an Arsenal game.",
      "Say how it was made, with at least three past passives (was washed, were mixed, was baked).",
      "Say how the food changed and what caused it, linked with because and so.",
    ],
    frames: ["For the match, my family made ___.", "First the ___ was ___, then it was ___.", "The heat altered ___, so ___."],
    success: ["60-80 words, three clear parts.", "Three correct past passives.", "The cause of the change is explained."],
    challenge: "Add one sentence about a change that cannot go back, and one about a change that can.",
  }),
  "rh-l3-u5-l5": f({
    title: "Brochure: A Day Out at the Stadium",
    task: "Design a two-page brochure for a day trip to watch Arsenal at the Emirates Stadium, with a plan for the day and advice for visitors.",
    steps: [
      "Draw or stick a picture of a stadium on the front.",
      "Plan the day: how long it takes to get there and to walk to the gate, what visitors spend time doing.",
      "Add a 'Be careful!' box with three prefix words (unsafe, impossible, invisible ...).",
    ],
    frames: ["It takes about ___ to get there by ___.", "Before the match, you can spend an hour ___ -ing.", "It is unsafe to ___ because the ground ___."],
    success: ["A clear plan with times.", "Both It takes ... to and spend ... -ing used correctly.", "Three prefix words and three Part 2 words."],
    challenge: "Add a short review from an unhappy visitor (a wet, muddy surface outside the gate), and your polite reply that answers each complaint.",
  }),
  "rh-l3-u5-l6": f({
    title: "Save Our Pitch: A Campaign Poster",
    task: "Make a campaign poster that argues for or against turning the grass pitch of a local football ground into a hard sand-and-concrete court.",
    steps: [
      "Choose your side and write a slogan.",
      "Write two science facts with the zero conditional and two predictions with the first conditional.",
      "Add a picture or diagram that shows what will happen to the ground.",
    ],
    frames: ["If you combine sand and water, ___.", "If the club changes the pitch, ___ will ___.", "As soon as the rainy season comes, ___."],
    success: ["Two zero and two first conditionals, all correct.", "No will after if or as soon as.", "At least three Part 2 words."],
    challenge: "Write the other side's best argument in one sentence, then answer it.",
  }),
  "rh-l3-u5-l7": f({
    title: "Interview: Football Before Fridges",
    task: "Interview a grandparent or an older neighbour about how fans kept food and drink cold or fresh at a match when they were young, then report it and judge which old way was best.",
    steps: [
      "Write five questions (How did you keep ...? Did your family have ...?).",
      "Ask them and note the answers; use possessives (my grandfather's flask, the fans' cool box).",
      "Write a report of 100-120 words with two reported questions, and say which old method you think worked best and why.",
    ],
    frames: ["I asked my grandfather how ___.", "I asked him if ___.", "The fans' way of ___ was ___.", "I think the best method was ___ because ___."],
    success: ["Five real questions and answers.", "Two correct reported questions and three possessives.", "A clear judgement with a reason."],
    challenge: "Compare one old method with a cool bag: what does each one do to the temperature of the drink, and which is better for the environment?",
  }),
  "rh-l3-u5-l8": f({
    title: "Exam-topic paragraph: a Gunners match day, raised",
    task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences about a football match.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one present perfect sentence with ever, never or already, for example about a match you have seen.",
      "Add one past passive or one conditional sentence about a change, such as the pitch after the rain.",
    ],
    frames: ["I have never seen ___ before.", "The ___ was altered by ___.", "If you heat ___, it ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
    challenge: "Write a 3B start-of-book reflection: the two most useful things Unit 5 taught you for the entrance test, and how you will practise them.",
  }),
};
