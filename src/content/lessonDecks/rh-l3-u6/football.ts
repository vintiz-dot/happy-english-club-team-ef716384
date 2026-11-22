// Reach Higher 3B, Unit 6 (Heritage and Tradition): the football edition of each
// lesson's creative homework. Same words, same grammar, same demand as the class
// task; built around football and supporting Arsenal. No players' names, logos or
// chants. The school's own writing.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const f = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U6Football: Record<string, Football> = {
  "rh-l3-u6-l1": f({
    title: "A Football Family Tradition Museum",
    task: "Make a mini 'museum label' display of three football objects from your home that carry a family tradition (a scarf, a ticket, a ball, a kit), and write a label for each.",
    steps: [
      "Choose three objects, perhaps something red and white for the Gunners, and ask an older relative the story of each.",
      "Write a label for each object: what it is, who gave it to whom, and what it means to your family.",
      "Use at least six pronouns, including one reflexive, and check that 'he', 'she' and 'they' are always clear.",
    ],
    frames: ["This ___ belonged to my uncle. He ___.", "My father gave it to me when ___.", "We watched the match ourselves for ___."],
    success: ["Three objects, each with a clear story.", "Six correct pronouns, one of them reflexive.", "Each label says why the object matters."],
    challenge: "Add a fourth label for an object that does NOT carry a tradition yet, and explain what would have to happen for it to become one.",
  }),
  "rh-l3-u6-l2": f({
    title: "Design a Match Day Fan Festival",
    task: "Design a fan festival outside the Emirates Stadium that shows the football and music traditions of three regions or countries, and write the visitor's question-and-answer page.",
    steps: [
      "Choose three styles of music or fan games from three regions and decide who performs, when and where.",
      "Write a timetable for the day with a short line about each style.",
      "Write a 'Visitors ask' page: six polite indirect questions with answers, and two question tags a guide might use.",
    ],
    frames: ["Can you tell me when the ___ performance starts?", "Do you know if ___?", "This style is popular with the fans, isn't it?"],
    success: ["Three styles from three different regions.", "Six correct indirect questions (statement order).", "Two correct question tags."],
    challenge: "Add one performance that mixes an old style with a modern one, and write two questions a worried grandparent might ask about it, with your answers.",
  }),
  "rh-l3-u6-l3": f({
    title: "Match Day in 1990 and Match Day Today",
    task: "Interview an older relative about watching football when they were your age, and make a two-column 'Then and now' poster with a judgment at the bottom.",
    steps: [
      "Ask five questions about how they watched matches, what they wore, what they ate, who they played with and how they felt; take short notes.",
      "Write the poster: THEN with used to and the past simple, NOW with the present perfect and present simple.",
      "At the bottom, judge: which change made football better for fans, and which made it weaker? Give a reason for each.",
    ],
    frames: ["In 1990, children used to ___.", "Since then, fans have ___.", "The best change is ___ because ___, but we have lost ___."],
    success: ["Five clear contrasts between then and now.", "Correct used to, past simple and present perfect.", "A two-sided judgment with reasons."],
    challenge: "Add a third column, 2060: predict two things that will change in football and one that never will, and say why.",
  }),
  "rh-l3-u6-l4": f({
    title: "Exam-topic paragraph: a coach who keeps the game alive",
    task: "Write 60-80 words about a coach or a club volunteer you know or have read about who keeps a football tradition alive. Say who they are, how they learned it, and why their work matters.",
    steps: [
      "Introduce the person and the tradition in one sentence.",
      "Say how they learned it, with two past passives (was born, was taught ...).",
      "Give two reasons why their work matters, linked with because and so.",
    ],
    frames: ["___, who ___, keeps ___ alive.", "He was taught by ___ when he was ___.", "His work matters because ___, so ___."],
    success: ["60-80 words, three clear parts.", "Two correct past passives and one clause with commas.", "Two linked reasons."],
    challenge: "Add one sentence about what would be lost if nobody learned from this person.",
  }),
  "rh-l3-u6-l5": f({
    title: "A How-to Card for the Next Generation of Fans",
    task: "Make an illustrated how-to card that teaches a child in 2050 how to get ready for a match day with a family tradition (making the match snack, preparing the scarf and kit, getting to the stadium).",
    steps: [
      "Choose the tradition and ask someone at home how it is done.",
      "Write the card: a 'You will need' list, eight numbered steps with order words, and two warnings.",
      "Draw one picture for the hardest step and add a line on what the tradition represents for Arsenal fans.",
    ],
    frames: ["First, ___. Then ___.", "Make sure you ___. Don't ___, or ___.", "Finally, ___. This represents ___."],
    success: ["Eight clear steps, each starting with an imperative or an order word.", "Two warnings.", "Two words with un-, re-, mis- or dis-, used correctly."],
    challenge: "Test your card on a family member and write two changes you made after they misunderstood a step.",
  }),
  "rh-l3-u6-l6": f({
    title: "Carve Our Football Family's Story",
    task: "Design a totem-style column of four symbols that tells your family's football story, and write the guide's talk that explains it.",
    steps: [
      "Choose four symbols (a ball, a scarf, a stadium, a cup) and decide what each represents about your family and the Gunners.",
      "Draw the column from bottom to top and label each symbol.",
      "Write a 100-word guide's talk, using this / these, two possessive pronouns, one so ... that and one such ... that.",
    ],
    frames: ["This ball represents ___.", "These two scarves are ours; that old shirt is my grandfather's.", "Our first match was so ___ that ___.", "It was such a ___ day that ___."],
    success: ["Four symbols, each with a clear meaning.", "Correct demonstratives and possessive pronouns.", "One so ... that and one such ... that."],
    challenge: "Write a short legend that one of the symbols could tell, ending with 'And that is why ...'.",
  }),
  "rh-l3-u6-l7": f({
    title: "The Fan Interview Report",
    task: "Hold a real five-minute interview with an older person about a football tradition, then write a report of it for the class newsletter.",
    steps: [
      "Use your question plan; ask at least five questions and note key words.",
      "Write 100-120 words: who you spoke to, what you asked, what they told you, all in reported speech.",
      "End with your judgment: what is the best way to preserve this football tradition?",
    ],
    frames: ["I asked my uncle where he ___.", "He told me to ___.", "When I asked if ___, he said that ___.", "The best way to preserve it is ___."],
    success: ["At least four correct reported questions or commands.", "A clear picture of the person and the tradition.", "A judgment with a reason."],
    challenge: "Add one direct quotation, correctly punctuated, that you think is the most important thing the person said, and explain why.",
  }),
  "rh-l3-u6-l8": f({
    title: "Exam-topic paragraph: a club tradition, raised",
    task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences about a football tradition.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one sentence with an -ing subject (Teaching children to play fairly is ...).",
      "Add one sentence with It's worth -ing or It's important to.",
    ],
    frames: ["Keeping this tradition alive ___.", "It's important to ___ because ___.", "It's worth ___, so ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
    challenge: "Write a short reply to someone who says 'Old football traditions don't matter any more'. Give two reasons and one example from this unit.",
  }),
};
