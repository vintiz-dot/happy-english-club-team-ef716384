// Reach Higher 3B, Unit 6 (From Past to Present): Jupiter's creative homework, one
// per lesson: a higher-order task on that lesson's words and grammar, with a
// challenge. Lessons 4 and 8 carry the exam-topic paragraph (gap H). The school's
// own writing; nothing here quotes or retells the unit's song.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U6Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["tradition", "heritage", "generation"], grammar: ["subject, object and reflexive pronouns"] },
    base: {
      title: "A Family Tradition Museum",
      task: "Make a mini 'museum label' display of three objects from your home that carry a family tradition, and write a label for each.",
      steps: [
        "Choose three objects (a photo, a dish, a piece of clothing, a toy, a tool) and ask an older relative the story of each.",
        "Write a label for each object: what it is, who gave it to whom, and what it means to your family.",
        "Use at least six pronouns, including one reflexive, and check that 'he', 'she' and 'they' are always clear.",
      ],
      frames: ["This ___ belonged to my grandfather. He ___.", "My mother gave it to me when ___.", "We made it ourselves for ___."],
      success: ["Three objects, each with a clear story.", "Six correct pronouns, one of them reflexive.", "Each label says why the object matters."],
      challenge: "Add a fourth label for an object that does NOT carry a tradition yet, and explain what would have to happen for it to become one.",
    },
  },
  2: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["music", "style", "region", "perform", "popular"], grammar: ["question tags", "indirect questions"] },
    base: {
      title: "Design a Regional Music Festival",
      task: "Design a one-day music festival in Hanoi that shows the music of three regions of Vietnam, and write the visitor's question-and-answer page.",
      steps: [
        "Choose three styles from three regions and decide who performs, when and where.",
        "Write a timetable for the day with a short line about each style.",
        "Write a 'Visitors ask' page: six polite indirect questions with answers, and two question tags a guide might use.",
      ],
      frames: ["Can you tell me when the ___ performance starts?", "Do you know if ___?", "This style comes from ___, doesn't it?"],
      success: ["Three styles from three different regions.", "Six correct indirect questions (statement order).", "Two correct question tags."],
      challenge: "Add one performance that mixes an old style with a modern one, and write two questions a worried grandparent might ask about it, with your answers.",
    },
  },
  3: {
    kind: "creative",
    thinking: "Compare and justify",
    uses: { words: ["heritage", "vary", "express", "feelings"], grammar: ["used to", "present perfect vs past simple"] },
    base: {
      title: "Tết in 1990 and Tết Today",
      task: "Interview an older relative about Tết when they were your age, and make a two-column 'Then and now' poster with a judgment at the bottom.",
      steps: [
        "Ask five questions about food, clothes, games, gifts and visits; take short notes.",
        "Write the poster: THEN with used to and the past simple, NOW with the present perfect and present simple.",
        "At the bottom, judge: which change made Tết better, and which made it weaker? Give a reason for each.",
      ],
      frames: ["In 1990, children used to ___.", "Since then, families have ___.", "The best change is ___ because ___, but we have lost ___."],
      success: ["Five clear contrasts between then and now.", "Correct used to, past simple and present perfect.", "A two-sided judgment with reasons."],
      challenge: "Add a third column, 2060: predict two things that will change and one that never will, and say why.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["heritage", "perform", "popular"], grammar: ["past passive", "non-defining relative clauses"] },
    base: {
      title: "Exam-topic paragraph: a person who keeps a tradition alive",
      task: "Write 60-80 words about a person you know or have read about who keeps a tradition alive. Say who they are, how they learned it, and why their work matters.",
      steps: [
        "Introduce the person and the tradition in one sentence.",
        "Say how they learned it, with two past passives (was born, was taught ...).",
        "Give two reasons why their work matters, linked with because and so.",
      ],
      frames: ["___, who ___, keeps ___ alive.", "She was taught by ___ when she was ___.", "Her work matters because ___, so ___."],
      success: ["60-80 words, three clear parts.", "Two correct past passives and one clause with commas.", "Two linked reasons."],
      challenge: "Add one sentence about what would be lost if nobody learned from this person.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["process", "tradition", "represent", "generation"], grammar: ["imperatives and sequencing", "prefixes un- / re- / mis- / dis-"] },
    base: {
      title: "A How-to Card for the Next Generation",
      task: "Make an illustrated how-to card for a traditional Vietnamese food or craft, so a child in 2050 could make it without help.",
      steps: [
        "Choose the food or craft and watch or ask someone at home how it is done.",
        "Write the card: a 'You will need' list, eight numbered steps with order words, and two warnings.",
        "Draw one picture for the hardest step and add a line on what the food or craft represents.",
      ],
      frames: ["First, ___. Then ___.", "Make sure you ___. Don't ___, or ___.", "Finally, ___. This represents ___."],
      success: ["Eight clear steps, each starting with an imperative or an order word.", "Two warnings.", "Two words with un-, re-, mis- or dis-, used correctly."],
      challenge: "Test your card on a family member and write two changes you made after they misunderstood a step.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["carve", "represent", "tale", "storyteller"], grammar: ["demonstratives and possessive pronouns", "so / such ... that"] },
    base: {
      title: "Carve Our Family's Story",
      task: "Design a totem-style column of four symbols that tells your family's story, and write the guide's talk that explains it.",
      steps: [
        "Choose four symbols (an animal, a plant, an object, a place) and decide what each represents about your family.",
        "Draw the column from bottom to top and label each symbol.",
        "Write a 100-word guide's talk, using this / these, two possessive pronouns, one so ... that and one such ... that.",
      ],
      frames: ["This lotus represents ___.", "These two birds are ours; that dragon is my grandfather's.", "Our family's first home was so ___ that ___.", "It was such a ___ journey that ___."],
      success: ["Four symbols, each with a clear meaning.", "Correct demonstratives and possessive pronouns.", "One so ... that and one such ... that."],
      challenge: "Write a short legend that one of the symbols could tell, ending with 'And that is why ...'.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["storyteller", "preservation", "communicate", "generation"], grammar: ["reported questions and commands"] },
    base: {
      title: "The Interview Report",
      task: "Hold a real five-minute interview with an older person about a tradition, then write a report of it for the class newsletter.",
      steps: [
        "Use your question plan; ask at least five questions and note key words.",
        "Write 100-120 words: who you spoke to, what you asked, what they told you, all in reported speech.",
        "End with your judgment: what is the best way to preserve this tradition?",
      ],
      frames: ["I asked my grandmother where she ___.", "She told me to ___.", "When I asked if ___, she said that ___.", "The best way to preserve it is ___."],
      success: ["At least four correct reported questions or commands.", "A clear picture of the person and the tradition.", "A judgment with a reason."],
      challenge: "Add one direct quotation, correctly punctuated, that you think is the most important thing the person said, and explain why.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["tradition", "preservation", "heritage"], grammar: ["-ing as subject", "It's important to / It's worth -ing"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one sentence with an -ing subject (Teaching children ... is ...).",
        "Add one sentence with It's worth -ing or It's important to.",
      ],
      frames: ["Keeping this tradition alive ___.", "It's important to ___ because ___.", "It's worth ___, so ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
      challenge: "Write a short reply to someone who says 'Old traditions don't matter any more'. Give two reasons and one example from this unit.",
    },
  },
};
