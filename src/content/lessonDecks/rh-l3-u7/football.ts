// Reach Higher 3B, Unit 7 (Forces of Nature): the football edition of each
// lesson's creative homework. Same words, same grammar, same demand as the class
// task; built around football and supporting Arsenal. No players' names, logos or
// chants. The school's own writing.
import type { CreativeTask } from "@/lib/lessonDecks/types";

type Football = { interest: "football"; label: "Football edition"; task: CreativeTask };
const f = (task: CreativeTask): Football => ({ interest: "football", label: "Football edition", task });

export const rhL3U7Football: Record<string, Football> = {
  "rh-l3-u7-l1": f({
    title: "One-Minute Story: The Night the Pitch Flooded",
    task: "Write and tell an original one-minute story in which a force of nature (a flood, a storm, strong wind) changes a football pitch near your home.",
    steps: [
      "Choose the pitch (a school field, a park, the grass at the Emirates Stadium) and the force (a flood, a strong wind, a storm).",
      "Write 8-10 sentences with at least six adverbs: two of manner, one of degree, one of frequency and two at the start of a sentence.",
      "Tell it aloud to your family without reading; record it if you can.",
    ],
    frames: ["Every Saturday, the water usually flowed ___.", "Suddenly, ___.", "The rain fell extremely ___, so ___.", "Luckily, ___."],
    success: ["Six adverbs, each in the right position.", "The force and the change are easy to picture.", "It sounds like a story, not a list."],
    challenge: "Tell the same story twice: once as a frightening story and once as a funny one. Which adverbs did you change?",
  }),
  "rh-l3-u7-l2": f({
    title: "Sports Page: A Volcano Stops the Match!",
    task: "Make the sports page of a newspaper on the day a volcano erupted near a football stadium and the match was stopped.",
    steps: [
      "Write a headline and a one-line summary.",
      "Write the main story (80-100 words): what the fans were doing when the eruption began, and what happened, in order.",
      "Add a short quote from a supporter and a labelled drawing of the volcano and the stadium.",
    ],
    frames: ["Fans were ___ when ___.", "First, ___. After that, ___.", "\"We were cheering for the Gunners when ___,\" said one fan.", "In the end, ___."],
    success: ["Past continuous for the background, past simple for events.", "Four sequence words.", "At least four Part 1 words."],
    challenge: "Add a second, smaller article from one year later: what has changed on the island since the eruption?",
  }),
  "rh-l3-u7-l3": f({
    title: "A Thousand Years of One Football Island",
    task: "Draw a timeline of an island's first 1,000 years and write the story of the day the first football match was played there.",
    steps: [
      "Draw a timeline with six stages: eruption, cooling, first plants, birds, animals, people.",
      "Write 80-100 words about the day the first people kicked a ball on the island: what they found, and what had happened before they came.",
      "Use at least three past perfect sentences with by the time, before or after.",
    ],
    frames: ["By the time the first match started, ___ had already ___.", "Before people came, birds had ___.", "After the rock had cooled, ___."],
    success: ["Six stages in a clear order.", "Three correct past perfect sentences.", "The story matches the timeline."],
    challenge: "Write one paragraph from the point of view of the oldest tree on the island: what it had seen before the football began, and what it thinks of the game now.",
  }),
  "rh-l3-u7-l4": f({
    title: "Exam-topic paragraph: a natural wonder near a stadium",
    task: "Write 60-80 words about a natural place in Vietnam you would like to visit before or after a football trip. Say where it is, how nature made it, and why people should see it.",
    steps: [
      "Name the place and where it is.",
      "Explain how it was made, with two time or sequence adverbs (millions of years ago, slowly, eventually).",
      "Give two reasons to visit, with one -ous adjective and one -tion or -sion noun.",
    ],
    frames: ["I would like to visit ___, which is in ___.", "Millions of years ago, ___. Eventually, ___.", "People should see it because ___, and it is famous for ___."],
    success: ["60-80 words, three clear parts.", "Two time or sequence adverbs used correctly.", "Two correct word-formation words."],
    challenge: "Add one sentence about a danger visitors should know about, and one about how the place is still changing today.",
  }),
  "rh-l3-u7-l5": f({
    title: "Our Match Day Safety Plan",
    task: "Design a one-page safety plan your family could use on a stormy football match day, at a stadium or at home watching an Arsenal game.",
    steps: [
      "With your family, choose a safe meeting place and list the important phone numbers (use made-up numbers on the copy you bring to class).",
      "Write six pieces of advice: two with should, two with ought to, two with had better, each with a reason.",
      "Add a box: 'Signals we listen for' (stadium announcement, siren, loudspeaker, phone message).",
    ],
    frames: ["We should ___ because ___.", "Everyone ought to ___ before ___.", "When we hear the signal, we'd better ___.", "Despite ___, we will ___."],
    success: ["Six pieces of advice, each with a reason.", "should, ought to and had better all used correctly.", "At least three Part 2 words."],
    challenge: "Add a short 'opinion corner': one thing your family disagreed about when you made the plan, and how you decided.",
  }),
  "rh-l3-u7-l6": f({
    title: "Five Signs Worth Listening To at a Match",
    task: "Make a guide for young football fans that ranks five warning signs of danger from nature at a match, from most to least useful, and explains your ranking.",
    steps: [
      "Choose five signs (thunder and lightning, the ground shaking, a siren, a dark sky and a strong wind, the referee stopping the game ...).",
      "Rank them and give a reason for each place in the ranking.",
      "For each sign, report what a coach or grandparent told you to do, with as soon as or until.",
    ],
    frames: ["Number one is ___ because ___.", "My coach told me to ___ as soon as ___.", "The stewards ask fans not to ___ until ___."],
    success: ["Five signs in a ranked order, each with a reason.", "Three correct reported commands or requests.", "as soon as and until used correctly."],
    challenge: "Ask one adult in your family what warning signs they learned as a child, and add their advice to your guide in reported speech.",
  }),
  "rh-l3-u7-l7": f({
    title: "Kids' Science Page: The Force Behind the Pitch",
    task: "Make a science page for younger football fans that explains one force of nature with a labelled diagram and a short fact file.",
    steps: [
      "Choose the force (an earthquake, a volcano, a tsunami, a typhoon) and draw a diagram with five labels, with a stadium near it.",
      "Write a fact file of six facts: three in the present passive and one in the past passive.",
      "Add four prepositional phrases that tell where and when (under the sea, along the coast, in 2004 ...).",
    ],
    frames: ["___ is caused by ___.", "Under the ground, ___.", "In ___, ___ was ___.", "Warnings are sent by ___."],
    success: ["Four correct passive sentences.", "Four prepositional phrases.", "A younger child could understand it."],
    challenge: "Add a 'Did you know?' box with one fact from a second source, and say where you found it.",
  }),
  "rh-l3-u7-l8": f({
    title: "Exam-topic paragraph: a stormy match, raised",
    task: "Rewrite your mock-test paragraph using the teacher's feedback, then raise it with two stronger sentences about a force of nature and a football match.",
    steps: [
      "Fix every mistake the teacher marked; write the rule next to it in your error log.",
      "Add one cause-and-effect sentence with lead to, result in or because of, for example about a storm and a match.",
      "Add one sentence of advice with should or had better.",
    ],
    frames: ["___ can lead to ___.", "Because of ___, ___.", "To stay safe, fans should ___."],
    success: ["Every marked mistake corrected.", "Two new sentences with this unit's grammar.", "Still 50-70 words."],
    challenge: "Write a Units 5-7 reflection: the three most useful grammar points for the entrance test so far in 3B, and how you will practise each one.",
  }),
};
