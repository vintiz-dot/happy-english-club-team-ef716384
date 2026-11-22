// Reach Higher 3B, Unit 8 (Journeys and Goals): the football edition of each
// lesson's creative homework. Same words, same grammar, same demand as the class
// task; built around football and supporting Arsenal. No players' names, logos or
// chants. The school's own writing.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const f = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U8Football: Record<string, Football> = {
  "rh-l3-u8-l1": f({
    title: "The Football Advice Survey",
    task: "Ask three people at home for advice about one of your football goals, then judge which advice is best and why.",
    steps: [
      "Choose a football goal (a skill, a place in the school team, getting fitter, the grade-6 test while you train).",
      "Ask three family members 'What should I do?' and write each piece of advice in English with should, ought to, had better or If I were you.",
      "Rank the three pieces of advice and explain your ranking in three sentences.",
    ],
    frames: ["My goal is to ___.", "Dad said I should ___. Grandpa thinks I ought to ___.", "The best advice is ___'s, because ___.", "If I were my own coach, I'd ___."],
    success: ["Three pieces of advice, each with the right form.", "A ranking with a reason for every place.", "Each piece of advice names a tool."],
    challenge: "Add the advice you would give a younger child with the same goal, and explain why it is different.",
  }),
  "rh-l3-u8-l2": f({
    title: "My Football Wall of Achievements",
    task: "Make a poster of five football things you have achieved so far (as a player or a fan), each with the story of when and how.",
    steps: [
      "List five achievements, big and small (I've scored in a match; I've learned to juggle; I've watched the Gunners at the Emirates Stadium).",
      "For each one, write the news in the present perfect and two story sentences in the past simple.",
      "Add the tool that helped most for each achievement.",
    ],
    frames: ["I've ___.", "I started when I was ___. It took me ___.", "The tool that helped most was ___.", "I haven't ___ yet, but I'm going to!"],
    success: ["Five achievements with the right tense every time.", "Time words that match the tense.", "A tool named for each one."],
    challenge: "Add one achievement of a family member and compare it with yours: which needed more endurance, and why?",
  }),
  "rh-l3-u8-l3": f({
    title: "The Great Football Journey Quiz",
    task: "Design a 10-question quiz about distances, times and sizes in football, with an answer key, and test your family.",
    steps: [
      "Research ten figures with an adult (the length of a pitch, the distance of a penalty spot from the goal, how long a match lasts, the time to fly to London for the Emirates Stadium ...).",
      "Write ten questions with How far / How long / How high, and a multiple-choice answer for each.",
      "Test your family and write two sentences comparing their estimates with the real figures.",
    ],
    frames: ["How far is it from ___ to ___?", "How long does it take to get to ___ by ___?", "It takes about ___ to ___.", "___ is about twice as far as ___."],
    success: ["Ten correct questions of three kinds.", "Real figures with the right units.", "Two comparison sentences."],
    challenge: "Add a bonus question that needs a calculation (If you run 5 km an hour, how long does it take to run round ...?) and show the working.",
  }),
  "rh-l3-u8-l4": f({
    title: "Exam-topic paragraph: a football goal for this year",
    task: "Write 60-80 words about a football goal you want to achieve this year. Say what it is, what you will do to reach it, and why it matters to you.",
    steps: [
      "Name the goal and when you want to reach it.",
      "Give two steps or tools, each with to, in order to or so that.",
      "Say why it matters, linked with because and so.",
    ],
    frames: ["This year, I want to ___.", "I'm going to ___ in order to ___.", "I will ask my coach to help me so that ___.", "It matters to me because ___, so ___."],
    success: ["60-80 words, three clear parts.", "Two correct purpose clauses.", "A reason linked with because and so."],
    challenge: "Add one sentence about a problem that could stop you and how you would deal with it, using unless or if.",
  }),
  "rh-l3-u8-l5": f({
    title: "Plan a Family Trip to the Emirates Stadium",
    task: "Plan a three-day family trip to London to watch the Gunners at the Emirates Stadium, including one real challenge (a long journey, a first flight, finding your way in a big city), and write the plan.",
    steps: [
      "Choose the challenge and what the family must do to prepare for it.",
      "Write a day-by-day plan: arrangements already fixed (present continuous), plans (going to), predictions (will).",
      "Add a packing list, each item with a purpose (to / so that).",
    ],
    frames: ["On day one, we're taking the ___ to ___.", "We're going to explore ___.", "When we reach ___, we'll ___.", "I think the hardest part will be ___."],
    success: ["The right future form for each purpose.", "Two time clauses with the present.", "At least four Part 2 words."],
    challenge: "Write a short 'what if' card for the guide: two things that could go wrong and what the family will do (If it rains, ... / Unless the train is on time, ...).",
  }),
  "rh-l3-u8-l6": f({
    title: "Halfway There: a Footballer's Diary Page",
    task: "Write the diary page of a young football player halfway through a long season towards a goal (a place in the team, a cup final, a first trial).",
    steps: [
      "Choose the player, the goal and the hardest moment so far (a loss, an injury, a hard training week).",
      "Write 100-120 words: what the player wishes, what they would do if things were different, and a warning to themselves with unless.",
      "End with the one tool that keeps them going.",
    ],
    frames: ["Day ___. I wish I ___.", "If I had ___, I would ___.", "Unless I ___, I won't reach ___.", "What keeps me going is ___."],
    success: ["Two correct wishes, one second conditional and one unless.", "Feelings shown, not only told.", "Three Part 2 words."],
    challenge: "Write a second, very short diary page from the last day of the season: compare it with the first and show how the player has changed.",
  }),
  "rh-l3-u8-l7": f({
    title: "The Scene Before the Final Whistle",
    task: "Write one extra scene for your story: the moment just before the turning point of a football match, told mostly in dialogue.",
    steps: [
      "Choose two characters and where they are (the tunnel, the touchline, the dressing room at half time).",
      "Write 8-10 lines of dialogue, each new speaker on a new line, with actions between the lines.",
      "Use one -ing opening and two -ant / -ent words.",
    ],
    frames: ["\"I can't ___,\" said ___.", "\"Yes, you can,\" ___ replied. \"Remember ___.\"", "Taking a deep breath, ___ ___.", "It was the most important ___ of the season."],
    success: ["Speech punctuated correctly every time.", "The scene builds tension towards the turning point.", "One correct -ing opening and two -ant / -ent words."],
    challenge: "Rewrite the scene from the other character's point of view and show something the reader did not know before.",
  }),
  "rh-l3-u8-l8": f({
    title: "Exam-topic paragraph: a football goal, raised",
    task: "Rewrite your end-of-3B mock paragraph using the teacher's feedback, then raise it with two stronger sentences about a football goal.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one present perfect sentence about what you have already done towards the goal.",
      "Add one purpose clause or time clause about what you will do next.",
    ],
    frames: ["I have already ___.", "I'm going to ___ so that ___.", "When I ___, I'll ___.", "This goal matters to me because ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
    challenge: "Write a Level 3 reflection: the three most useful things you learned in 3A and 3B for the entrance test, the tool you will use to practise each, and one goal for Level 4.",
  }),
};
