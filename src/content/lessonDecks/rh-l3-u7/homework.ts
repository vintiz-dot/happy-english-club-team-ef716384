// Reach Higher 3B, Unit 7 (Blast! Crash! Splash!): Jupiter's creative homework, one
// per lesson: a higher-order task on that lesson's words and grammar, with a
// challenge. Lessons 4 and 8 carry the exam-topic paragraph (gap H). The school's
// own writing.
import type { Slide } from "@/lib/lessonDecks/types";

type Creative = Extract<Slide, { kind: "creative" }>;

export const rhL3U7Creative: Record<number, Creative> = {
  1: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["force", "flow", "rock", "create"], grammar: ["adverbs of manner, degree and frequency"] },
    base: {
      title: "One-Minute Story: The Night the River Changed",
      task: "Write and tell an original one-minute story in which a force of nature changes a place near your home.",
      steps: [
        "Choose the place (a river bank, a hill, a beach) and the force (a flood, a strong wind, a landslide, a storm wave).",
        "Write 8-10 sentences with at least six adverbs: two of manner, one of degree, one of frequency and two at the start of a sentence.",
        "Tell it aloud to your family without reading; record it if you can.",
      ],
      frames: ["Every evening, the river usually flowed ___.", "Suddenly, ___.", "The water rose extremely ___, so ___.", "Luckily, ___."],
      success: ["Six adverbs, each in the right position.", "The force and the change are easy to picture.", "It sounds like a story, not a list."],
      challenge: "Tell the same story twice: once as a frightening story and once as a funny one. Which adverbs did you change?",
    },
  },
  2: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["volcano", "erupt", "magma", "island", "ocean"], grammar: ["past simple vs past continuous", "sequence words"] },
    base: {
      title: "Front Page: An Island Is Born!",
      task: "Make the front page of a newspaper on the day a new volcanic island appears in the sea.",
      steps: [
        "Write a headline and a one-line summary.",
        "Write the main story (80-100 words): what people were doing when the eruption began, and what happened, in order.",
        "Add a short quote from an eyewitness and a labelled drawing.",
      ],
      frames: ["Fishers were ___ when ___.", "First, ___. After that, ___.", "\"We were watching from the boat when ___,\" said one fisher.", "In the end, ___."],
      success: ["Past continuous for the background, past simple for events.", "Four sequence words.", "At least four Part 1 words."],
      challenge: "Add a second, smaller article from one year later: what has changed on the island since the eruption?",
    },
  },
  3: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["develop", "create", "rock", "island"], grammar: ["past perfect (stretch)", "by the time / before / after"] },
    base: {
      title: "A Thousand Years of One Island",
      task: "Draw a timeline of an island's first 1,000 years and write the story of the day the first people arrived.",
      steps: [
        "Draw a timeline with six stages: eruption, cooling, first plants, birds, animals, people.",
        "Write 80-100 words about the day the first people landed: what they found, and what had happened before they came.",
        "Use at least three past perfect sentences with by the time, before or after.",
      ],
      frames: ["By the time the first boat landed, ___ had already ___.", "Before people came, birds had ___.", "After the rock had cooled, ___."],
      success: ["Six stages in a clear order.", "Three correct past perfect sentences.", "The story matches the timeline."],
      challenge: "Write one paragraph from the point of view of the oldest tree on the island: what it had seen before the people arrived, and what it thinks of them now.",
    },
  },
  4: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["volcano", "rock", "island", "eruption", "famous"], grammar: ["adverbs of time and sequence", "-tion / -sion / -ous"] },
    base: {
      title: "Exam-topic paragraph: a natural wonder of Vietnam",
      task: "Write 60-80 words about a natural place in Vietnam you would like to visit. Say where it is, how nature made it, and why people should see it.",
      steps: [
        "Name the place and where it is.",
        "Explain how it was made, with two time or sequence adverbs (millions of years ago, slowly, eventually).",
        "Give two reasons to visit, with one -ous adjective and one -tion or -sion noun.",
      ],
      frames: ["I would like to visit ___, which is in ___.", "Millions of years ago, ___. Eventually, ___.", "People should see it because ___, and it is famous for ___."],
      success: ["60-80 words, three clear parts.", "Two time or sequence adverbs used correctly.", "Two correct word-formation words."],
      challenge: "Add one sentence about a danger visitors should know about, and one about how the place is still changing today.",
    },
  },
  5: {
    kind: "creative",
    thinking: "Design",
    uses: { words: ["warn", "signal", "rescue", "earthquake", "shore"], grammar: ["should / ought to / had better", "despite (stretch)"] },
    base: {
      title: "Our Family Safety Plan",
      task: "Design a one-page safety plan your family could put on the fridge for the typhoon and flood season.",
      steps: [
        "With your family, choose a safe meeting place and list the important phone numbers (use made-up numbers on the copy you bring to class).",
        "Write six pieces of advice: two with should, two with ought to, two with had better, each with a reason.",
        "Add a box: 'Signals we listen for' (radio, siren, loudspeaker, phone message).",
      ],
      frames: ["We should ___ because ___.", "Everyone ought to ___ before ___.", "When we hear the signal, we'd better ___.", "Despite ___, we will ___."],
      success: ["Six pieces of advice, each with a reason.", "should, ought to and had better all used correctly.", "At least three Part 2 words."],
      challenge: "Add a short 'opinion corner': one thing your family disagreed about when you made the plan, and how you decided.",
    },
  },
  6: {
    kind: "creative",
    thinking: "Evaluate",
    uses: { words: ["sense", "signal", "shore", "warn", "tsunami"], grammar: ["reported commands and requests", "as soon as / until"] },
    base: {
      title: "Five Signs Worth Listening To",
      task: "Make a guide for children that ranks five warning signs of danger from nature, from most to least useful, and explains your ranking.",
      steps: [
        "Choose five signs (the sea pulling back, the ground shaking, a siren, animals acting strangely, a dark sky and a strong wind ...).",
        "Rank them and give a reason for each place in the ranking.",
        "For each sign, report what an expert or grandparent told you to do, with as soon as or until.",
      ],
      frames: ["Number one is ___ because ___.", "My grandmother told me to ___ as soon as ___.", "Scientists ask people not to ___ until ___."],
      success: ["Five signs in a ranked order, each with a reason.", "Three correct reported commands or requests.", "as soon as and until used correctly."],
      challenge: "Ask one adult in your family what warning signs they learned as a child, and add their advice to your guide in reported speech.",
    },
  },
  7: {
    kind: "creative",
    thinking: "Create",
    uses: { words: ["plate", "pressure", "earthquake", "magma", "power"], grammar: ["present and past passive", "prepositional phrases"] },
    base: {
      title: "Kids' Science Page: How It Works",
      task: "Make a science page for younger children that explains one force with a labelled diagram and a short fact file.",
      steps: [
        "Choose the force (an earthquake, a volcano, a tsunami, a typhoon) and draw a diagram with five labels.",
        "Write a fact file of six facts: three in the present passive and one in the past passive.",
        "Add four prepositional phrases that tell where and when (under the sea, along the coast, in 2004 ...).",
      ],
      frames: ["___ is caused by ___.", "Under the ground, ___.", "In ___, ___ was ___.", "Warnings are sent by ___."],
      success: ["Four correct passive sentences.", "Four prepositional phrases.", "A younger child could understand it."],
      challenge: "Add a 'Did you know?' box with one fact from a second source, and say where you found it.",
    },
  },
  8: {
    kind: "creative",
    thinking: "Argue",
    uses: { words: ["force", "power", "warn", "create"], grammar: ["cause and effect", "the passive"] },
    base: {
      title: "Exam-topic paragraph: rewrite and raise it",
      task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences.",
      steps: [
        "Fix every mistake the teacher marked; write the rule next to it in your error log.",
        "Add one cause-and-effect sentence with lead to, result in or because of.",
        "Add one sentence of advice with should or had better.",
      ],
      frames: ["___ can lead to ___.", "Because of ___, ___.", "To stay safe, people should ___."],
      success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
      challenge: "Write a Units 5-7 reflection: the three most useful grammar points for the entrance test so far in 3B, and how you will practise each one.",
    },
  },
};
