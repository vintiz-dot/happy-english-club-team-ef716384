// Reach Higher 3A, Unit 2 (Nature's Balance): the football edition of each
// lesson's creative homework, same words and grammar as the class version and
// equally demanding. Built around Arsenal (the Gunners, the Emirates Stadium, match
// day); no real players' names, logos or chants. Keyed by deck id.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const fb = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U2Football: Record<string, Football> = {
  "rh-l3-u2-l1": fb({
    title: "The Match Day Quiz Show",
    task: "Write a quiz of eight questions about the pitch, the stadium and the animals and plants around it, for your family, with the answers on the back.",
    steps: [
      "Choose one place: a football pitch, a park pitch, or the grass outside the Emirates Stadium.",
      "Write eight questions, each starting with a different question word (Who, What, Where, When, Why, How many, How much, How often).",
      "Write the answers on the back, then test someone at home and note their score.",
    ],
    frames: ["How many ___ come to the stadium on match day?", "Why does the grass need ___?", "What happens to the pitch when water is scarce?"],
    success: ["Eight correct questions (helper verb before the subject).", "At least three of the unit's words (balance, amount, supply, react).", "Answers that are true facts."],
    challenge: "Add a bonus question that has two possible answers, and explain which one you think is better.",
  }),
  "rh-l3-u2-l2": fb({
    title: "The Match Day Chain Reaction Comic",
    task: "Draw a six-box comic in which one small change on match day causes a chain of surprises for the Gunners and their fans.",
    steps: [
      "Plan the chain: box 1 is the small change (heavy rain, a blocked drain, a late train), boxes 2-5 are the effects, box 6 is the ending.",
      "Write one caption and one speech bubble in each box.",
      "Use a statement, a question, a command and an exclamation somewhere in the comic.",
    ],
    frames: ["The rain came, so ___.", "What a ___ match day!", "Don't ___!", "Why did ___?"],
    success: ["Each box is caused by the box before it.", "All four kinds of sentence, correctly punctuated.", "At least two because and two so, and words like balance, control or react."],
    challenge: "Make the ending a twist: the team tries to fix the problem and makes it worse. Explain the twist in one sentence under the comic.",
  }),
  "rh-l3-u2-l3": fb({
    title: "Design a Balanced Pitch",
    task: "Design a football pitch that stays healthy all year, and write the instructions for the groundskeeper.",
    steps: [
      "Draw the pitch from above and label everything: grass, lines, water pipes, shade, bins, flowers at the edge.",
      "Write how many or how much of each thing you need, and why.",
      "Write three warnings: what happens if there is too much or too little of something.",
    ],
    frames: ["You need a few ___ because ___.", "Don't use too much ___, or ___.", "If there are fewer ___, there will be more ___."],
    success: ["Countable and uncountable words used correctly.", "Every number has a reason.", "The warnings show cause and effect, with words like amount, supply, increase or scarce."],
    challenge: "A fan wants to add ten more rows of seats on the grass. Write a polite reply explaining why that would break the balance.",
  }),
  "rh-l3-u2-l4": fb({
    title: "Exam-topic paragraph: a pitch out of balance",
    task: "Write 60-80 words about a football pitch or park you know where nature is out of balance, and what will happen if nobody helps.",
    steps: [
      "Choose the pitch and say where it is (your school, a park, a stadium like the Emirates Stadium).",
      "Say what went wrong and why (one because, one so).",
      "Predict with two if-sentences: one if people do nothing, one if people help.",
    ],
    frames: ["___ is a pitch near my home.", "It has become ___ because ___.", "If nobody ___, ___ will ___.", "If the fans ___, the pitch will ___."],
    success: ["60-80 words, three clear parts.", "Two correct first-conditional sentences.", "Linking words between the ideas, and words like balance, resources or control."],
    challenge: "Add one sentence with unless and one exclamation that would make a fan want to help.",
  }),
  "rh-l3-u2-l5": fb({
    title: "Then and Now: the stadium neighbourhood",
    task: "Interview an older football fan about how the streets around a stadium used to be, then write what has changed and whether it is better or worse for nature.",
    steps: [
      "Ask four questions with Did you use to ...? and What was ... like?",
      "Write their answers in the past simple and with used to.",
      "Write your opinion: is the place better or worse now for nature? Give two reasons.",
    ],
    frames: ["When my grandfather went to matches, there used to be ___.", "People didn't use to ___.", "I think it is better / worse now because ___."],
    success: ["At least three used to and four past simple verbs, correctly formed.", "A clear opinion with two reasons.", "The -ed endings said correctly when you read it aloud, with words like ecosystem, nature or resources."],
    challenge: "Compare their answer with the wolves story: write two ways the two places are alike and one way they are different.",
  }),
  "rh-l3-u2-l6": fb({
    title: "Hero of the Stadium Ecosystem",
    task: "Choose one animal that keeps the grass and soil around a stadium in balance and write a short speech nominating it for a 'Hero of the Ecosystem' award.",
    steps: [
      "Choose your animal (an earthworm, a bee, a bird, a ladybird, a frog ...).",
      "Explain what it does for the other living things, with one comparison.",
      "Say what has changed in the grass since this animal came back or left.",
    ],
    frames: ["I nominate the ___ because ___.", "Since ___, ___ has / have ___.", "The ___ is more important than ___ because ___."],
    success: ["One correct present perfect with for or since.", "One comparative or as ... as.", "Evidence for every reason, and words like ecosystem, food chain or competition."],
    challenge: "Add a rival nominee and explain fairly why your animal should still win.",
  }),
  "rh-l3-u2-l7": fb({
    title: "The 25-Word Match Report",
    task: "Summarise a football match you watched, or a Gunners match on TV, in exactly 25 words, then in exactly 50 words.",
    steps: [
      "Write the main idea of the match in one sentence.",
      "Add only the events that change the result; leave out the small details.",
      "Count the words. Cut or add until it is exactly 25, then write the 50-word version.",
    ],
    frames: ["This match was about ___.", "Although ___, ___.", "___, so ___. In the end, ___."],
    success: ["Exactly 25 and exactly 50 words.", "Only main events.", "At least one although or however, and a word like balance, positive or negative."],
    challenge: "Ask someone at home which version is better and why. Write their answer and say whether you agree.",
  }),
  "rh-l3-u2-l8": fb({
    title: "Exam-topic paragraph: the pitch, rewritten and raised",
    task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences about a football pitch and nature.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one sentence with so ... that or too ... to.",
      "Add one sentence with the more ..., the more ... (or the fewer / the less).",
    ],
    frames: ["The grass is so ___ that ___.", "It is too ___ for ___ to ___.", "The more fans ___, the ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this lesson's grammar.", "Still 50-70 words."],
    challenge: "Write a second paragraph that argues the opposite side, as a person who thinks the change on match day was good.",
  }),
};
