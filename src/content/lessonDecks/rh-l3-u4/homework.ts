// Reach Higher 3A, Unit 4 (Let's Work Together): Jupiter's creative homework, one
// per lesson: a higher-order task on that lesson's words and grammar, with a
// challenge. Lessons 4 and 8 carry the exam-topic paragraph (gap H). The school's
// own writing.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U4Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["cooperation", "accomplish", "purpose"], grammar: ["verb patterns: to / -ing"] },
    base: {
      title: "Design a Family Challenge",
      task: "Design a 30-minute challenge your whole family can only complete by working together, and write the instructions.",
      steps: [
        "Choose the challenge (cook a meal, build a blanket fort, clean the balcony, make a card for someone).",
        "Write the goal and a job for each person, using at least five verb patterns.",
        "Do it at home if you can, and write two sentences about what happened.",
      ],
      frames: ["The purpose of the challenge is to ___.", "Mum agrees to ___, and I enjoy ___.", "We decided to ___ because ___."],
      success: ["A clear shared goal and a job for everyone.", "Five correct verb patterns.", "A short report of what happened."],
      challenge: "Add one rule that makes the challenge harder, and explain how it forces the family to cooperate more.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["market", "buyer", "seller", "advertisement", "plenty"], grammar: ["present simple vs continuous"] },
    base: {
      title: "Market Radio Report",
      task: "Write and record a one-minute radio report from a market, describing what usually happens and what is happening right now.",
      steps: [
        "Choose a real or imagined market and a special day (Tết, a festival, a storm coming).",
        "Write the report: the normal routine (present simple), then the scene now (present continuous).",
        "Read it aloud like a reporter; record it if you can.",
      ],
      frames: ["Every morning, sellers here ___.", "But today, ___ is happening!", "Right now, a buyer is ___ while ___."],
      success: ["The right tense every time.", "At least four Part 1 words.", "It sounds lively and clear."],
      challenge: "Interview an imaginary seller in the report: two questions and two answers, all with the right tense.",
    },
  },
  3: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["cooperation", "reward", "accomplish"], grammar: ["suggestions", "phrasal verbs"] },
    base: {
      title: "Comic: The Team That Almost Gave Up",
      task: "Make a six-panel comic about a team that almost gives up but works it out together.",
      steps: [
        "Plan: the goal, the problem, the moment they nearly give up, the suggestion that saves them, the result.",
        "Write speech bubbles with at least three suggestions and three phrasal verbs.",
        "End with a reward.",
      ],
      frames: ["\"Let's give up,\" said ___.", "\"Why don't we ___?\" asked ___.", "\"We worked it out!\""],
      success: ["Three suggestions with the right verb form.", "Three phrasal verbs used correctly.", "A clear turning point."],
      challenge: "Give one character a good reason to want to work alone, and show how the team respects it.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["cooperation", "purpose", "accomplish"], grammar: ["subject-verb agreement", "linking words"] },
    base: {
      title: "Exam-topic paragraph: a team I belong to",
      task: "Write 60-80 words about a team or group you belong to (a class, a club, a family). Say what it does, how everyone helps, and why it works.",
      steps: [
        "Name the team and its purpose.",
        "Say how members help, with everyone / each / both.",
        "Give two reasons why it works, linked with because and so.",
      ],
      frames: ["I belong to ___, which ___.", "Everyone ___, and each member ___.", "It works well because ___, so ___."],
      success: ["60-80 words, three clear parts.", "Correct agreement with everyone / each / both.", "Two linked reasons."],
      challenge: "Add one sentence about a problem the team had and how they worked it out.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["agriculture", "crop", "harvest", "method", "conservation"], grammar: ["modal verbs"] },
    base: {
      title: "Rules for the Perfect Balcony Garden",
      task: "Write a poster of rules and advice for a family starting a vegetable garden on a city balcony.",
      steps: [
        "List what the family must, mustn't, should and doesn't have to do.",
        "Give a reason for each rule.",
        "Add one 'could' idea that saves water (conservation).",
      ],
      frames: ["You must ___ because ___.", "You mustn't ___, or ___.", "You don't have to ___, but you could ___."],
      success: ["Six different modals, used with the right meaning.", "A reason for every rule.", "At least three Part 2 words."],
      challenge: "Add a 'Myth or fact?' box: two things people think they must do but don't have to, and why.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["alternative", "method", "future", "sustain"], grammar: ["second conditional"] },
    base: {
      title: "If I Were the Minister of Food",
      task: "Imagine you are in charge of food for all of Vietnam for one year. Write five things you would do and why.",
      steps: [
        "Think about farmers, cities, schools and the environment.",
        "Write five second-conditional sentences, each with a reason.",
        "Choose the most important one and explain it in three more sentences.",
      ],
      frames: ["If I were the minister, I would ___.", "If farmers had ___, they would ___.", "The most important change would be ___ because ___."],
      success: ["Five correct second conditionals.", "Every idea has a reason.", "At least three Part 2 words."],
      challenge: "Write the speech a farmer would give in reply: what they would like, and what would worry them.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["future", "plenty", "harvest"], grammar: ["should have", "third conditional (stretch)"] },
    base: {
      title: "A New Fable",
      task: "Write a short fable with two animals from Vietnam that teaches a lesson about working together or planning ahead.",
      steps: [
        "Choose two animals and a problem (a flood, a dry season, a festival to prepare).",
        "Tell the story in 120-150 words, with dialogue.",
        "End with a character who looks back: 'I should have ...' and the moral in one line.",
      ],
      frames: ["Once, by the Red River, there lived a ___ and a ___.", "\"Why don't we ___?\" asked ___.", "\"I should have ___,\" said ___.", "Moral: ___."],
      success: ["A clear problem, turning point and ending.", "Dialogue punctuated correctly.", "One correct should have, and a moral in your own words."],
      challenge: "Add one third-conditional sentence that shows how the ending could have been different.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["cooperation", "accomplish", "future"], grammar: ["reported statements", "second conditional"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one reported statement (what someone in the team said).",
        "Add one second-conditional sentence about doing it again.",
      ],
      frames: ["My friend said that ___.", "If we did it again, we would ___.", "Working together taught me that ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
      challenge: "Write a 3A reflection: the three most useful things you learned in Units 2-4 for the entrance test, and how you will practise them.",
    },
  },
};
