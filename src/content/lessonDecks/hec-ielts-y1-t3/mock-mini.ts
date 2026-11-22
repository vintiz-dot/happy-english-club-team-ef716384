// Sun Class, Year 1 Term 3: the mini-mock, run inside Lesson 7 (programme lesson 32,
// Mini-mock: society). Listening Parts 2 and 3 (20 questions, heard once): a youth
// officer introducing a new youth centre (multiple choice and matching rooms to uses,
// in words), and two students with their tutor discussing a project on cycling to
// school (multiple choice with a choose-TWO pair, and matching opinions to speakers).
// Speaking Part 2 and four Part 3 questions, scored in trios on the HEC rubric
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

const USES = ["dance and drama", "first aid and advice", "studying", "music", "cooking classes", "a café", "an office", "a vegetable garden"];
const SOLUTIONS = ["free bicycles for students", "a bike lane outside the school", "a later start time", "secure bike parking", "cycling lessons in PE"];
const WHO = ["Nga", "Phong", "both students"];

export const miniMock: Assessment = {
  id: "hec-ielts-y1-t3-mini-mock",
  title: "Term 3 mini-mock: Listening Parts 2-3 and Speaking Parts 2-3",
  kind: "formative",
  afterLesson: 7,
  minutes: 28,
  covers: [
    "IELTS Listening Part 2: multiple choice (one answer) and matching places in a building to their uses",
    "IELTS Listening Part 3: a discussion between two students and a tutor; multiple choice (one answer and choose TWO) and matching opinions to speakers",
    "IELTS Speaking Part 2 on a change in society, and four linked Part 3 questions",
    "Recycled language: concession (although, while it's true that) and cause and effect (because of, has led to)",
  ],
  sections: [
    {
      title: "Listening Part 2: a new youth centre",
      skill: "Listening",
      instructions: "You will hear a district youth officer talking to local families about a new youth centre. Questions 1-5: choose the correct answer. Questions 6-10: what will each part of the building be used for? Choose the correct option from the list; there are three options you do not need. You hear the recording ONCE.",
      script: [
        { speaker: "Youth officer", text: "Good evening, everyone. I'm Phuong, and I coordinate youth projects for the district. Thank you for coming to hear about the new youth centre on Lake Road." },
        { speaker: "Youth officer", text: "Some of you have asked why we chose the old post office. It wasn't the cheapest option: the market hall would have cost less. And it isn't the biggest building we looked at." },
        { speaker: "Youth officer", text: "We chose it because three bus routes stop right outside, so young people can get there safely on their own." },
        { speaker: "Youth officer", text: "The centre opens on the first of March. We had hoped to open in January, but all the electrics had to be replaced." },
        { speaker: "Youth officer", text: "Who can use it? Many people assume it's only for secondary school students, but in fact anyone aged eleven to eighteen can join. University students are welcome too, but as volunteers, not as members." },
        { speaker: "Youth officer", text: "Membership costs nothing at all. We did consider a monthly fee, but in our survey young people told us that even a small fee would keep many of them away. Some courses will have a small charge for materials." },
        { speaker: "Youth officer", text: "In that survey, we expected the top request to be sports facilities, or perhaps more computers. In fact, what young people asked for most was simply a quiet place to study after school, because many homes are crowded." },
        { speaker: "Youth officer", text: "So, the building. On the ground floor, the large hall will be used for dance and drama, and on Saturdays for a repair session, where volunteers fix bikes." },
        { speaker: "Youth officer", text: "The small room by the entrance was going to be an office, but we've turned it into a first-aid and advice room. A counsellor will be there every Tuesday." },
        { speaker: "Youth officer", text: "Upstairs, the room facing the lake will be the study room. It's the quietest part of the building, well away from the road." },
        { speaker: "Youth officer", text: "The old storeroom at the back becomes the music room. It has no windows, so the sound won't disturb the neighbours." },
        { speaker: "Youth officer", text: "And the kitchen. We first planned to open a café there, but it's going to be used for cooking classes instead, where members learn to make cheap, healthy meals." },
        { speaker: "Youth officer", text: "The roof is too small for sport, so the environment club will turn it into a vegetable garden." },
        { speaker: "Youth officer", text: "If you'd like to volunteer, please speak to me at the end, or leave your name at the reception desk." },
      ],
      items: [
        { q: "1. Why was the old post office chosen?", options: ["it was the cheapest", "it is near public transport", "it is the largest building available"], answer: "it is near public transport" },
        { q: "2. When will the centre open?", options: ["in January", "in March", "in May"], answer: "in March" },
        { q: "3. Who can become a member?", options: ["anyone aged 11 to 18", "secondary school students only", "university students"], answer: "anyone aged 11 to 18" },
        { q: "4. How much does membership cost?", options: ["nothing", "a small monthly fee", "a charge for each visit"], answer: "nothing" },
        { q: "5. What did young people ask for most in the survey?", options: ["sports facilities", "more computers", "a quiet place to study"], answer: "a quiet place to study" },
        { q: "6. The large hall", options: USES, answer: "dance and drama" },
        { q: "7. The small room by the entrance", options: USES, answer: "first aid and advice" },
        { q: "8. The room facing the lake", options: USES, answer: "studying" },
        { q: "9. The old storeroom", options: USES, answer: "music" },
        { q: "10. The kitchen", options: USES, answer: "cooking classes" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 3: a project on cycling to school",
      skill: "Listening",
      instructions: "You will hear two students, Nga and Phong, discussing their project on cycling to school with their tutor, Dr Lam. Questions 11-12 and 15: choose the correct answer. Questions 13-14: choose TWO answers, in either order. Questions 16-20: who gives each opinion? Choose Nga, Phong or both students. You hear the recording ONCE.",
      script: [
        { speaker: "Dr Lam", text: "Come in, both of you. Your project is on why so few students cycle to school. What did your survey show?" },
        { speaker: "Nga", text: "We expected most students to say they live too far away, but only about a fifth said that. Most said they would cycle if the roads near school were safer." },
        { speaker: "Phong", text: "A lot of them also worry about how they'd look, arriving hot and sweaty in their uniform. I think that matters more than people admit." },
        { speaker: "Nga", text: "I'm not so sure. Only a few people mentioned it in the comments. For me, the bigger issue is parents: they're terrified of the traffic." },
        { speaker: "Phong", text: "Well, on that we agree. Nearly every parent we spoke to mentioned the traffic first." },
        { speaker: "Dr Lam", text: "A hundred and twenty replies is a decent number. My concern is that they're all from your school, which is in the busiest part of the city." },
        { speaker: "Phong", text: "That's fair. So before we write anything up, we're going to run the same survey at a school in the suburbs and compare the two." },
        { speaker: "Dr Lam", text: "Good. Now, what will you recommend?" },
        { speaker: "Phong", text: "My first idea was free bicycles for everyone, but Nga pointed out that most students already own one. It's just sitting at home." },
        { speaker: "Nga", text: "A bike lane outside school would be ideal, but that's for the city to decide, not the school. So we're sticking to things the school can actually do." },
        { speaker: "Phong", text: "Which means safe places to lock bikes. At the moment there's nowhere, and three bikes were stolen last term." },
        { speaker: "Nga", text: "And cycling lessons in PE. Many students never learnt to ride in traffic, and lessons would give them, and their parents, more confidence." },
        { speaker: "Dr Lam", text: "What about rewards? Some schools give points to classes for cycling." },
        { speaker: "Nga", text: "I'd like that, actually: points for the class with the most cyclists. Phong thinks it's unfair on people who live far away, but I think it would get people talking." },
        { speaker: "Dr Lam", text: "And looking back, would you change anything about the survey?" },
        { speaker: "Phong", text: "The questions. Some were far too long, and people gave up halfway. Nga said the same when she saw that the last page was almost empty." },
        { speaker: "Phong", text: "One more thing: I'm convinced that students who cycle concentrate better in the first lesson. My own marks went up when I started." },
        { speaker: "Nga", text: "We have no evidence for that, though, so we've left it out of the report." },
      ],
      items: [
        { q: "11. What was the main finding of the survey?", options: ["most students live too far away to cycle", "most students would cycle if the roads were safer", "most parents prefer to drive their children"], answer: "most students would cycle if the roads were safer" },
        { q: "12. What is Dr Lam's concern about the survey?", options: ["too few students replied", "the students are all from one school", "it includes too many parents"], answer: "the students are all from one school" },
        { q: "13. Which TWO things will the students recommend? (first answer)", options: SOLUTIONS, answer: "secure bike parking" },
        { q: "14. Which TWO things will the students recommend? (second answer)", options: SOLUTIONS, answer: "cycling lessons in PE" },
        { q: "15. What will the students do next?", options: ["interview the head teacher", "survey a second school", "write the final report"], answer: "survey a second school" },
        { q: "16. Parents worry most about the traffic.", options: WHO, answer: "both students" },
        { q: "17. Students care about how they look when they arrive.", options: WHO, answer: "Phong" },
        { q: "18. The school should reward classes for cycling.", options: WHO, answer: "Nga" },
        { q: "19. Some survey questions were too long.", options: WHO, answer: "both students" },
        { q: "20. Cycling helps students to concentrate.", options: WHO, answer: "Phong" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "IELTS Speaking in trios (speaker, examiner, scorer), about 7 minutes a turn: Part 2 (1 minute to prepare, up to 2 minutes to speak; the examiner stops the speaker at 2 minutes), then the four Part 3 questions linked to the cue card (about 4 minutes, the examiner reads each question word for word). The scorer gives one band per criterion on the HEC rubric. The teacher fully scores two or three students who were not teacher-scored in the Term 1 and Term 2 mocks, and rotates.",
    prompts: [
      "Part 2 cue card: Describe a change in your town or neighbourhood that has made life better for people. You should say: what the change was, when it happened, who it has helped, and explain why you think it was a good change.",
      "Part 3: What are the biggest changes in Vietnamese cities in the last twenty years?",
      "Part 3: Why do some older people dislike changes to their neighbourhood?",
      "Part 3: Should young people have a say in how their town is planned?",
      "Part 3: Do you think life in cities will be better or worse in twenty years' time? Why?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
