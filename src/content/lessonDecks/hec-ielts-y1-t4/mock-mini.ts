// Sun Class, Year 1 Term 4: the mini-mock, run inside Lesson 6 (programme lesson 43,
// Mini-mock: science). Listening Parts 3 and 4 (20 questions, heard once): two students
// and their tutor discussing a project on air quality in classrooms (multiple choice
// with a choose-TWO pair, and matching parts of a report to decisions), and a lecture
// on turning food waste into energy (note completion and a flow-chart, ONE OR TWO
// WORDS). Speaking Part 2 and four Part 3 questions, scored in trios on the HEC rubric
// (ieltsRubric.ts). Every script and question is HEC's own; the rubric gives an
// ESTIMATE, never an official band.
import type { Assessment } from "@/lib/lessonDecks/types";
import { RUBRIC, type Criterion } from "@/lib/lessonDecks/ieltsRubric";

/** One criterion's HEC wording as [8+, 7, 6, 5]. */
const bands = (c: Criterion): [string, string, string, string] => {
  const row = RUBRIC.find((r) => r.criterion === c)!;
  const at = (b: "5" | "6" | "7" | "8+") => row.bands.find((x) => x.band === b)!.sounds;
  return [at("8+"), at("7"), at("6"), at("5")];
};

const RECOMMEND = ["buying air purifiers", "opening windows between lessons", "repairing the top-floor windows", "moving a class to a bigger room", "putting plants in classrooms"];
const DECISIONS = ["keep it as it is", "cut it down", "add more detail", "leave it out"];

export const miniMock: Assessment = {
  id: "hec-ielts-y1-t4-mini-mock",
  title: "Term 4 mini-mock: Listening Parts 3-4 and Speaking Parts 2-3",
  kind: "formative",
  afterLesson: 6,
  minutes: 28,
  covers: [
    "IELTS Listening Part 3: two students and a tutor discussing a science project; multiple choice (one answer and choose TWO) and matching parts of a report to decisions",
    "IELTS Listening Part 4: a lecture on turning food waste into energy; note completion and flow-chart completion, ONE OR TWO WORDS",
    "IELTS Speaking Part 2 on science or technology in daily life, and four linked Part 3 questions",
    "Recycled language: hedging (it could be argued that, there is some evidence that, to some extent) and describing processes (once, after being + past participle)",
  ],
  sections: [
    {
      title: "Listening Part 3: air quality in classrooms",
      skill: "Listening",
      instructions: "You will hear two students, Lien and Tuan, discussing their science project on air quality with their tutor, Dr Hoa. Questions 1-3: choose the correct answer. Questions 4-5: choose TWO answers, in either order. Questions 6-10: what do the students decide to do with each part of their report? Choose the correct option; you may use an option more than once. You hear the recording ONCE.",
      script: [
        { speaker: "Dr Hoa", text: "Lien, Tuan, come in. How's the air quality project going?" },
        { speaker: "Lien", text: "Quite well. We put carbon dioxide sensors in four classrooms for two weeks. We'd expected the science lab to be the worst, because of all the equipment, but in fact it was the Year 7 classroom on the top floor." },
        { speaker: "Tuan", text: "It's the smallest room, with thirty-eight students in it, and the windows don't open properly." },
        { speaker: "Dr Hoa", text: "And what effect did the poor air have?" },
        { speaker: "Tuan", text: "We gave students a short memory test at the start and end of lessons, and in the stuffy rooms the scores dropped. We thought they'd complain of headaches, but hardly anyone did. Mostly they said they felt sleepy." },
        { speaker: "Dr Hoa", text: "How reliable are your sensors? They look rather cheap." },
        { speaker: "Lien", text: "That was our worry too. So we borrowed the professional sensor from the university for a day and put them side by side. Ours were within about five percent, which is good enough for a school project." },
        { speaker: "Dr Hoa", text: "Good. So what will you recommend to the school?" },
        { speaker: "Tuan", text: "My first idea was air purifiers, but Lien found out that they don't remove carbon dioxide at all. They only filter dust." },
        { speaker: "Lien", text: "So the simplest thing is to open the windows and the door for five minutes between lessons. It costs nothing. And we'll ask for the top-floor windows to be repaired, because at the moment you can't open them." },
        { speaker: "Dr Hoa", text: "What about plants? People often say they clean the air." },
        { speaker: "Tuan", text: "We read about that. You'd need hundreds of plants in one room to make any real difference. And we did think about moving Year 7 to a bigger room, but there isn't one free." },
        { speaker: "Dr Hoa", text: "Fine. Now, the report itself. Your introduction is very long." },
        { speaker: "Lien", text: "We know. We'll cut it to half a page." },
        { speaker: "Dr Hoa", text: "The memory test results are the heart of it, though." },
        { speaker: "Tuan", text: "We'd only given the averages, but we'll add a table for each room, so readers can see the details." },
        { speaker: "Dr Hoa", text: "And the section on checking the sensors?" },
        { speaker: "Tuan", text: "I wanted to drop it, but Lien says it's what makes the figures believable, so it stays exactly as it is." },
        { speaker: "Lien", text: "The interviews with teachers, though, we're taking out completely. Only three teachers answered, so they don't tell us much. And there are twelve photos of the sensors, which is far too many. We'll choose the best four." },
      ],
      items: [
        { q: "1. Which room had the worst air?", options: ["the science lab", "the Year 7 classroom", "the library"], answer: "the Year 7 classroom" },
        { q: "2. What did most students say about the stuffy rooms?", options: ["they had headaches", "they felt sleepy", "they felt cold"], answer: "they felt sleepy" },
        { q: "3. How did the students check their sensors?", options: ["they compared them with a professional sensor", "they bought more expensive ones", "they asked the company that made them"], answer: "they compared them with a professional sensor" },
        { q: "4. Which TWO things will the students recommend? (first answer)", options: RECOMMEND, answer: "opening windows between lessons" },
        { q: "5. Which TWO things will the students recommend? (second answer)", options: RECOMMEND, answer: "repairing the top-floor windows" },
        { q: "6. The introduction", options: DECISIONS, answer: "cut it down" },
        { q: "7. The memory test results", options: DECISIONS, answer: "add more detail" },
        { q: "8. The section on checking the sensors", options: DECISIONS, answer: "keep it as it is" },
        { q: "9. The interviews with teachers", options: DECISIONS, answer: "leave it out" },
        { q: "10. The photographs", options: DECISIONS, answer: "cut it down" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 4: energy from food waste",
      skill: "Listening",
      instructions: "You will hear part of a lecture on turning food waste into energy. Questions 11-14 and 20: complete the notes. Questions 15-19: complete the flow-chart of the process, which is printed as five boxes joined by arrows (arrival at the plant, preparing the waste, the digester, using the gas, the solid left over). Write ONE OR TWO WORDS for each answer. You hear the recording ONCE.",
      script: [
        { speaker: "Lecturer", text: "Good morning. In today's lecture I want to look at one way cities can cut both their waste and their use of fossil fuels: turning food waste into energy, by a process called anaerobic digestion. I'll start with the problem, then go through the process step by step, and finish with its limits." },
        { speaker: "Lecturer", text: "First, the problem. When food waste goes to an ordinary landfill, it rots without air and gives off methane, a gas that traps far more heat than carbon dioxide does." },
        { speaker: "Lecturer", text: "And the amounts are large. In a city like Hanoi, food makes up more than half of all household rubbish." },
        { speaker: "Lecturer", text: "The idea behind digestion is simple: instead of letting that gas escape into the air, we capture it and burn it as a fuel." },
        { speaker: "Lecturer", text: "There is one condition, though, and it's an important one: the waste has to be separated at home. What I mean by that is that families keep their food waste in a bin of its own." },
        { speaker: "Lecturer", text: "There is some evidence that this is the hardest part. In the first trial schemes, roughly a third of the food bins also contained plastic bags or packaging." },
        { speaker: "Lecturer", text: "Now, the process itself. Once the lorries arrive at the plant, the waste is checked, and any plastic that is left is taken out by machines." },
        { speaker: "Lecturer", text: "Next, the food is shredded and mixed with water to make a thick liquid, rather like soup." },
        { speaker: "Lecturer", text: "This liquid is then pumped into a sealed tank called a digester, where there is no oxygen at all. Inside it, bacteria slowly break the food down, over a period of about three weeks." },
        { speaker: "Lecturer", text: "The gas that collects at the top of the tank, which we call biogas, is drawn off and cleaned." },
        { speaker: "Lecturer", text: "After being cleaned, it can be burned to make electricity, or compressed and used as fuel for city buses." },
        { speaker: "Lecturer", text: "And what's left at the bottom of the tank? That solid material is dried and sold to farmers as fertiliser, so even the leftovers are used." },
        { speaker: "Lecturer", text: "To finish, the limits. These plants are expensive to build, and to some extent they only make sense in cities, where a lot of waste can be collected cheaply from a small area." },
        { speaker: "Lecturer", text: "And no plant solves the problem of wasted food in the first place. To sum up, digestion turns a source of pollution into a source of energy, but buying and cooking less food than we throw away is still the better answer." },
      ],
      items: [
        { q: "11. In landfill, rotting food gives off ________", answer: "methane" },
        { q: "12. Food = more than ________ of household rubbish in Hanoi", answer: "half" },
        { q: "13. Condition: food waste must be ________ at home", answer: "separated" },
        { q: "14. Trial schemes: about a ________ of food bins contained plastic", answer: "third" },
        { q: "15. Flow-chart, arrival: remaining plastic taken out by ________", answer: "machines" },
        { q: "16. Flow-chart, preparing: food shredded and mixed with ________", answer: "water" },
        { q: "17. Flow-chart, digester (no oxygen): ________ break the food down", answer: "bacteria" },
        { q: "18. Flow-chart, using the gas: electricity, or fuel for ________", answer: "city buses" },
        { q: "19. Flow-chart, the solid left over: dried and sold as ________", answer: "fertiliser" },
        { q: "20. Limits: plants only make sense in ________", answer: "cities" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "IELTS Speaking in trios (speaker, examiner, scorer), about 7 minutes a turn: Part 2 (1 minute to prepare, up to 2 minutes to speak; the examiner stops the speaker at 2 minutes), then the four Part 3 questions linked to the cue card (about 4 minutes, the examiner reads each question word for word, and each answer should be a developed minute). The scorer gives one band per criterion on the HEC rubric. The teacher fully scores two or three students who have not yet been teacher-scored in one of this year's mini-mocks, and rotates.",
    prompts: [
      "Part 2 cue card: Describe a piece of science or technology that makes your daily life easier. You should say: what it is, how it works (as far as you know), how often you use it, and explain how your life would be different without it.",
      "Part 3: Why do some young people find science subjects difficult at school?",
      "Part 3: Should governments spend more money on science research than on other things? Why?",
      "Part 3: Can ordinary people always trust what scientists tell them?",
      "Part 3: What scientific problem do you think will be most important in the next fifty years?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
