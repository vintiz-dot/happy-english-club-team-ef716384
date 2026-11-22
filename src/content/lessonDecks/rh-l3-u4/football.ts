// Reach Higher 3A, Unit 4: the football edition of each lesson's creative
// homework, same words and grammar as the class version and equally demanding.
// Built around Arsenal (the Gunners, the Emirates Stadium, match day); no real
// players' names, logos or chants. Keyed by deck id.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const fb = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U4Football: Record<string, Football> = {
  "rh-l3-u4-l1": fb({
    title: "Design a Match Day Family Challenge",
    task: "Design a 30-minute challenge your whole family can only complete by working together, to get ready for watching a Gunners match, and write the instructions.",
    steps: [
      "Choose the challenge (make match snacks, build a goal in the living room, make a banner, tidy for the guests).",
      "Write the goal and a job for each person, using at least five verb patterns.",
      "Do it at home if you can, and write two sentences about what happened.",
    ],
    frames: ["The purpose of the challenge is to ___.", "Dad agrees to ___, and I enjoy ___.", "We decided to ___ because ___."],
    success: ["A clear shared goal and a job for everyone (cooperation, accomplish, purpose).", "Five correct verb patterns.", "A short report of what happened."],
    challenge: "Add one rule that makes the challenge harder, and explain how it forces the family to cooperate more.",
  }),
  "rh-l3-u4-l2": fb({
    title: "Matchday Market Radio Report",
    task: "Write and record a one-minute radio report from the market stalls outside a football ground, describing what usually happens and what is happening right now.",
    steps: [
      "Choose a real or imagined stadium market and a special day (a big match, a derby, heavy rain coming).",
      "Write the report: the normal routine (present simple), then the scene now (present continuous).",
      "Read it aloud like a reporter; record it if you can.",
    ],
    frames: ["Every match day, sellers here ___.", "But today, ___ is happening!", "Right now, a buyer is ___ while ___."],
    success: ["The right tense every time.", "At least four Part 1 words (market, buyer, seller, advertisement, plenty).", "It sounds lively and clear."],
    challenge: "Interview an imaginary seller in the report: two questions and two answers, all with the right tense.",
  }),
  "rh-l3-u4-l3": fb({
    title: "Comic: The Team That Almost Gave Up",
    task: "Make a six-panel comic about a football team that almost gives up at half time but works it out together.",
    steps: [
      "Plan: the goal, the problem, the moment they nearly give up, the suggestion that saves them, the result.",
      "Write speech bubbles with at least three suggestions and three phrasal verbs.",
      "End with a reward.",
    ],
    frames: ["\"Let's give up,\" said ___.", "\"Why don't we ___?\" asked ___.", "\"We worked it out!\""],
    success: ["Three suggestions with the right verb form.", "Three phrasal verbs used correctly.", "A clear turning point, with words like cooperation, reward or accomplish."],
    challenge: "Give one player a good reason to want to play alone, and show how the team respects it.",
  }),
  "rh-l3-u4-l4": fb({
    title: "Exam-topic paragraph: a team I belong to",
    task: "Write 60-80 words about a football team or club you belong to or support. Say what it does, how everyone helps, and why it works.",
    steps: [
      "Name the team and its purpose.",
      "Say how members help, with everyone / each / both.",
      "Give two reasons why it works, linked with because and so.",
    ],
    frames: ["I support ___, which ___.", "Everyone ___, and each player ___.", "It works well because ___, so ___."],
    success: ["60-80 words, three clear parts.", "Correct agreement with everyone / each / both.", "Two linked reasons, with words like cooperation, purpose or accomplish."],
    challenge: "Add one sentence about a problem the team had and how they worked it out.",
  }),
  "rh-l3-u4-l5": fb({
    title: "Rules for the Perfect Stadium Garden",
    task: "Write a poster of rules and advice for a club starting a vegetable garden beside its training ground, to feed the team's canteen.",
    steps: [
      "List what the volunteers must, mustn't, should and don't have to do.",
      "Give a reason for each rule.",
      "Add one 'could' idea that saves water (conservation).",
    ],
    frames: ["You must ___ because ___.", "You mustn't ___, or ___.", "You don't have to ___, but you could ___."],
    success: ["Six different modals, used with the right meaning.", "A reason for every rule.", "At least three Part 2 words (agriculture, crop, harvest, method, conservation)."],
    challenge: "Add a 'Myth or fact?' box: two things people think they must do but don't have to, and why.",
  }),
  "rh-l3-u4-l6": fb({
    title: "If I Were the Manager of the Gunners' Canteen",
    task: "Imagine you are in charge of food for a big football club's players and fans for one year. Write five things you would do and why.",
    steps: [
      "Think about farmers, the club, the fans and the environment.",
      "Write five second-conditional sentences, each with a reason.",
      "Choose the most important one and explain it in three more sentences.",
    ],
    frames: ["If I were the manager, I would ___.", "If farmers had ___, they would ___.", "The most important change would be ___ because ___."],
    success: ["Five correct second conditionals.", "Every idea has a reason.", "At least three Part 2 words (alternative, method, future, sustain)."],
    challenge: "Write the speech a farmer would give in reply: what they would like, and what would worry them.",
  }),
  "rh-l3-u4-l7": fb({
    title: "A New Fable: The Two Goalkeepers",
    task: "Write a short fable about two animal goalkeepers on a village pitch in Vietnam that teaches a lesson about working together or planning ahead.",
    steps: [
      "Choose two animals and a problem (a flooded pitch, a dry season, a big match to prepare for).",
      "Tell the story in 120-150 words, with dialogue.",
      "End with a character who looks back: 'I should have ...' and the moral in one line.",
    ],
    frames: ["Once, by the Red River, there lived a ___ and a ___.", "\"Why don't we ___?\" asked ___.", "\"I should have ___,\" said ___.", "Moral: ___."],
    success: ["A clear problem, turning point and ending.", "Dialogue punctuated correctly.", "One correct should have, and a moral in your own words (future, plenty, harvest)."],
    challenge: "Add one third-conditional sentence that shows how the ending could have been different.",
  }),
  "rh-l3-u4-l8": fb({
    title: "Exam-topic paragraph: the team, rewritten and raised",
    task: "Rewrite your mock-test paragraph about a team using the teacher's feedback, then raise it with two stronger sentences, with a football team as your example.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one reported statement (what a captain or a coach said).",
      "Add one second-conditional sentence about doing it again.",
    ],
    frames: ["The coach said that ___.", "If we played again, we would ___.", "Working together taught the team that ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words, with words like cooperation, accomplish or future."],
    challenge: "Write a 3A reflection: the three most useful things you learned in Units 2-4 for the entrance test, and how you will practise them.",
  }),
};
