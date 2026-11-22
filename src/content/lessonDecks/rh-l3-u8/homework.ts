// Reach Higher 3B, Unit 8 (Getting There): Jupiter's creative homework, one per
// lesson: a higher-order task on that lesson's words and grammar, with a challenge.
// Lessons 4 and 8 carry the exam-topic paragraph (gap H); Lesson 8's closes Level 3.
// The school's own writing.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U8Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["goal", "achieve", "tool"], grammar: ["advice: should / ought to / had better / If I were you"] },
    base: {
      title: "The Family Advice Survey",
      task: "Ask three people at home for advice about one of your goals, then judge which advice is best and why.",
      steps: [
        "Choose a goal (a sport, a skill, the grade-6 test, a habit you want to change).",
        "Ask three family members 'What should I do?' and write each piece of advice in English with should, ought to, had better or If I were you.",
        "Rank the three pieces of advice and explain your ranking in three sentences.",
      ],
      frames: ["My goal is to ___.", "Mum said I should ___. Grandpa thinks I ought to ___.", "The best advice is ___'s, because ___.", "If I were my own coach, I'd ___."],
      success: ["Three pieces of advice, each with the right form.", "A ranking with a reason for every place.", "Each piece of advice names a tool."],
      challenge: "Add the advice you would give a younger child with the same goal, and explain why it is different.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["achieve", "goal", "distance", "measurement"], grammar: ["present perfect vs past simple"] },
    base: {
      title: "My Wall of Achievements",
      task: "Make a poster of five things you have achieved in your life so far, each with the story of when and how.",
      steps: [
        "List five achievements, big and small (I've learned to swim; I've read 30 books; I've grown 10 cm this year).",
        "For each one, write the news in the present perfect and two story sentences in the past simple.",
        "Add the tool that helped most for each achievement.",
      ],
      frames: ["I've ___.", "I started when I was ___. It took me ___.", "The tool that helped most was ___.", "I haven't ___ yet, but I'm going to!"],
      success: ["Five achievements with the right tense every time.", "Time words that match the tense.", "A tool named for each one."],
      challenge: "Add one achievement of a family member and compare it with yours: which needed more endurance, and why?",
    },
  },
  3: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["distance", "direction", "estimate", "kilometer", "meter"], grammar: ["How far / How long / It takes ... to", "twice as ... as"] },
    base: {
      title: "The Great Journey Quiz",
      task: "Design a 10-question quiz about distances, times and sizes in Vietnam, with an answer key, and test your family.",
      steps: [
        "Research ten figures with an adult (Hanoi to Huế, the height of Fansipan, the length of the Red River, the time by train to Đà Nẵng ...).",
        "Write ten questions with How far / How long / How high, and a multiple-choice answer for each.",
        "Test your family and write two sentences comparing their estimates with the real figures.",
      ],
      frames: ["How far is it from ___ to ___?", "How long does it take to get to ___ by ___?", "It takes about ___ to ___.", "___ is about twice as far as ___."],
      success: ["Ten correct questions of three kinds.", "Real figures with the right units.", "Two comparison sentences."],
      challenge: "Add a bonus question that needs a calculation (If you walk 5 km an hour, how long does it take to walk round ...?) and show the working.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["goal", "achieve", "estimate", "direction"], grammar: ["purpose clauses: to / in order to / so that", "linking words"] },
    base: {
      title: "Exam-topic paragraph: a goal I want to achieve",
      task: "Write 60-80 words about a goal you want to achieve this year. Say what it is, what you will do to reach it, and why it matters to you.",
      steps: [
        "Name the goal and when you want to reach it.",
        "Give two steps or tools, each with to, in order to or so that.",
        "Say why it matters, linked with because and so.",
      ],
      frames: ["This year, I want to ___.", "I'm going to ___ in order to ___.", "I will ask ___ to help me so that ___.", "It matters to me because ___, so ___."],
      success: ["60-80 words, three clear parts.", "Two correct purpose clauses.", "A reason linked with because and so."],
      challenge: "Add one sentence about a problem that could stop you and how you would deal with it, using unless or if.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["journey", "destination", "prepare", "explore", "challenge"], grammar: ["future: will / going to / present continuous", "time clauses with the present"] },
    base: {
      title: "Plan a Family Expedition",
      task: "Plan a three-day family trip to a destination in Vietnam that includes one real challenge (a climb, a long walk, a cave), and write the plan.",
      steps: [
        "Choose the destination and the challenge (Fansipan, Phong Nha caves, cycling round Ninh Bình, a trek in Hà Giang).",
        "Write a day-by-day plan: arrangements already fixed (present continuous), plans (going to), predictions (will).",
        "Add a packing list, each item with a purpose (to / so that).",
      ],
      frames: ["On day one, we're taking the ___ to ___.", "We're going to explore ___.", "When we reach ___, we'll ___.", "I think the hardest part will be ___."],
      success: ["The right future form for each purpose.", "Two time clauses with the present.", "At least four Part 2 words."],
      challenge: "Write a short 'what if' card for the guide: two things that could go wrong and what the family will do (If it rains, ... / Unless the path is dry, ...).",
    },
  },
  6: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["endurance", "journey", "challenge", "destination"], grammar: ["wish + past simple / could", "second conditional", "unless"] },
    base: {
      title: "Halfway There: a Diary Page",
      task: "Write the diary page of a person halfway through a long journey towards a goal (a runner in a Hanoi marathon, a cyclist crossing Vietnam, a climber on Fansipan).",
      steps: [
        "Choose the person, the goal and the hardest moment so far.",
        "Write 100-120 words: what they wish, what they would do if things were different, and a warning to themselves with unless.",
        "End with the one tool that keeps them going.",
      ],
      frames: ["Day ___. I wish I ___.", "If I had ___, I would ___.", "Unless I ___, I won't reach ___.", "What keeps me going is ___."],
      success: ["Two correct wishes, one second conditional and one unless.", "Feelings shown, not only told.", "Three Part 2 words."],
      challenge: "Write a second, very short diary page from the last day: compare it with the first and show how the person has changed.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["goal", "challenge", "endurance", "important", "confident"], grammar: ["direct speech punctuation", "-ing participle clauses (stretch)", "-ant / -ent word formation"] },
    base: {
      title: "The Scene That Matters",
      task: "Write one extra scene for your story: the moment just before the turning point, told mostly in dialogue.",
      steps: [
        "Choose two characters and where they are (a mountain path, a starting line, the evening before the test).",
        "Write 8-10 lines of dialogue, each new speaker on a new line, with actions between the lines.",
        "Use one -ing opening and two -ant / -ent words.",
      ],
      frames: ["\"I can't ___,\" said ___.", "\"Yes, you can,\" ___ replied. \"Remember ___.\"", "Taking a deep breath, ___ ___.", "It was the most important ___ of her life."],
      success: ["Speech punctuated correctly every time.", "The scene builds tension towards the turning point.", "One correct -ing opening and two -ant / -ent words."],
      challenge: "Rewrite the scene from the other character's point of view and show something the reader did not know before.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["goal", "achieve", "prepare", "challenge"], grammar: ["all tenses in context", "purpose clauses", "future forms"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your end-of-3B mock paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one present perfect sentence about what you have already done towards the goal.",
        "Add one purpose clause or time clause about what you will do next.",
      ],
      frames: ["I have already ___.", "I'm going to ___ so that ___.", "When I ___, I'll ___.", "This goal matters to me because ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
      challenge: "Write a Level 3 reflection: the three most useful things you learned in 3A and 3B for the entrance test, the tool you will use to practise each, and one goal for Level 4.",
    },
  },
};
