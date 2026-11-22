// Sun Class, Year 1 Term 2: the full mock in Lesson 13 (programme lesson 25).
// Listening Parts 1, 2 and 3 (30 questions, scored out of 30 and converted to an
// approximate band), and a full Speaking test (Parts 1-3) in trios, scored on HEC's
// own rubric (ieltsRubric.ts). Every script and question is HEC's own.
import type { Assessment } from "@/lib/lessonDecks/types";
import { RUBRIC, type Criterion } from "@/lib/lessonDecks/ieltsRubric";

/** One criterion's HEC wording as [8+, 7, 6, 5]. */
const bands = (c: Criterion): [string, string, string, string] => {
  const row = RUBRIC.find((r) => r.criterion === c)!;
  const at = (b: "5" | "6" | "7" | "8+") => row.bands.find((x) => x.band === b)!.sounds;
  return [at("8+"), at("7"), at("6"), at("5")];
};

const CAMP = [
  "next to the main gate",
  "at the top of the hill",
  "beside the lake",
  "behind the dining hall",
  "opposite the sports field",
  "between the cabins and the forest",
  "across the bridge",
];

const WHO = ["Mai", "Oliver", "both Mai and Oliver"];

export const fullMock: Assessment = {
  id: "hec-ielts-y1-t2-full-mock",
  title: "Term 2 full mock: Listening Parts 1-3 (30 questions) and Speaking Parts 1-3",
  kind: "formative",
  afterLesson: 13,
  minutes: 35,
  covers: [
    "Listening Part 1: table and note completion (a spelled name, prices, a phone number, self-corrections)",
    "Listening Part 2: multiple choice (one answer) and plan labelling in words",
    "Listening Part 3: multiple choice and matching opinions in a discussion between two students and a tutor",
    "Speaking Parts 1-3 in trios, scored on the HEC rubric",
  ],
  sections: [
    {
      title: "Listening Part 1: booking a student walking tour",
      skill: "Listening",
      instructions: "You will hear a student phoning a company that runs walking tours for teenagers. You have 30 seconds to look at questions 1-10. Complete the table and the notes. Write ONE WORD AND/OR A NUMBER for each answer. You will hear the recording ONCE.",
      script: [
        { speaker: "Organiser", text: "Good afternoon, Old Town Walks, Hana speaking." },
        { speaker: "Caller", text: "Hi. I'm calling about the walking tours for students in the holidays." },
        { speaker: "Organiser", text: "Of course. We have three tours for teenagers: the Food Walk, the History Walk and the Photo Walk." },
        { speaker: "Caller", text: "How long is each one?" },
        { speaker: "Organiser", text: "The History Walk is the longest, about three hours. The Food Walk is two hours, and the Photo Walk is two and a half." },
        { speaker: "Caller", text: "And the prices?" },
        { speaker: "Organiser", text: "The Food Walk is a hundred and fifty thousand, because the tasting's included. The History Walk is ninety thousand. And the Photo Walk is a hundred and twenty. Oh, sorry, it went up last month: it's a hundred and thirty thousand now." },
        { speaker: "Caller", text: "I'd like to book the Photo Walk, please. When does it start?" },
        { speaker: "Organiser", text: "Every Saturday. Not in the morning, though: it starts at four in the afternoon, so you get the evening light." },
        { speaker: "Caller", text: "Where do we meet?" },
        { speaker: "Organiser", text: "Outside the old library on River Street. People sometimes go to the new library by mistake, so be careful." },
        { speaker: "Organiser", text: "Can I take your name?" },
        { speaker: "Caller", text: "Marcus Delaney. D-E-L-A-N-E-Y." },
        { speaker: "Organiser", text: "Thanks, Marcus. And how old are you? The tour is for twelve to sixteen." },
        { speaker: "Caller", text: "I'm fifteen. My phone number is 0912 448 370. No, sorry, the end is 307." },
        { speaker: "Organiser", text: "0912 448 307. What should you bring? A phone or a camera with a full battery, and an umbrella: we go ahead even if it rains." },
        { speaker: "Caller", text: "OK. Oh, one more thing, how did I hear about you? You'll probably ask. It wasn't my teacher, actually; I saw a poster on the school noticeboard." },
        { speaker: "Organiser", text: "Lovely. See you on Saturday, Marcus." },
      ],
      items: [
        { q: "1. Food Walk, length: ________ hours", answer: "2" },
        { q: "2. History Walk, price: ________ dong", answer: "90,000" },
        { q: "3. Photo Walk, price: ________ dong", answer: "130,000" },
        { q: "4. Photo Walk starts at ________ p.m. on Saturdays", answer: "4" },
        { q: "5. Meeting point: outside the old ________ on River Street", answer: "library" },
        { q: "6. Name: Marcus ________", answer: "Delaney" },
        { q: "7. Age: ________", answer: "15" },
        { q: "8. Phone: ________", answer: "0912 448 307" },
        { q: "9. Bring: a phone or camera and an ________", answer: "umbrella" },
        { q: "10. Heard about the tours on the school ________", answer: "noticeboard" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: welcome to Green Valley Camp",
      skill: "Listening",
      instructions: "You will hear a camp leader welcoming students on their first day. You are standing at the main gate. You have 30 seconds to look at questions 11-20. Questions 11-15: choose the correct answer. Questions 16-20: where is each place? Choose the correct position from the list; there are two positions you do not need. You will hear the recording ONCE.",
      script: [
        { speaker: "Camp leader", text: "Morning, everyone, and welcome to Green Valley Camp. I'm Tuan, and I'll be in charge this week. The camp has been running for ten years now; we celebrated our fifth birthday with a much smaller group." },
        { speaker: "Camp leader", text: "First, phones. We won't take them away, but you can only use them for an hour in the evening, after dinner. The rest of the day they stay in your cabin." },
        { speaker: "Camp leader", text: "Tonight we were going to have a barbecue, but rain is forecast for the end of the week, so we've swapped things around: tonight it's the night walk, and the barbecue is on the last night." },
        { speaker: "Camp leader", text: "Everyone expects kayaking to be the favourite, but last year the activity people chose most was archery. So sign up early." },
        { speaker: "Camp leader", text: "If you feel ill, don't phone home first, and don't walk to the nurse on your own. Tell your group leader, and they'll take you." },
        { speaker: "Camp leader", text: "Now, where things are. You're standing at the main gate. The nurse's hut is right here, next to the gate, the small white building." },
        { speaker: "Camp leader", text: "Walk straight up the path and the sports field is on your left. The dining hall is opposite it, on your right; you'll smell breakfast before you see it." },
        { speaker: "Camp leader", text: "Your cabins are past the dining hall. The climbing wall is just beyond them, between the cabins and the forest, so you can't miss it." },
        { speaker: "Camp leader", text: "The kayak store is down by the water, beside the lake. Please don't take a kayak out without an instructor." },
        { speaker: "Camp leader", text: "And the campfire circle: some of you came last year, when it was across the bridge. It's moved. It's now at the top of the hill, where the view is better." },
        { speaker: "Camp leader", text: "Behind the dining hall there's only the kitchen and the bins, so you won't need to go there." },
        { speaker: "Camp leader", text: "Right. Drop your bags in your cabins and meet back here in twenty minutes." },
      ],
      items: [
        { q: "11. The camp has been running for", options: ["five years", "ten years", "fifteen years"], answer: "ten years" },
        { q: "12. Campers can use their phones", options: ["only on the first day", "for an hour in the evening", "at any time"], answer: "for an hour in the evening" },
        { q: "13. On the first night, campers will", options: ["have a barbecue", "go on a night walk", "watch a film"], answer: "go on a night walk" },
        { q: "14. Last year's most popular activity was", options: ["kayaking", "rock climbing", "archery"], answer: "archery" },
        { q: "15. A camper who feels ill should first", options: ["go to the nurse's hut", "tell their group leader", "phone their parents"], answer: "tell their group leader" },
        { q: "16. Nurse's hut", options: CAMP, answer: "next to the main gate" },
        { q: "17. Dining hall", options: CAMP, answer: "opposite the sports field" },
        { q: "18. Climbing wall", options: CAMP, answer: "between the cabins and the forest" },
        { q: "19. Kayak store", options: CAMP, answer: "beside the lake" },
        { q: "20. Campfire circle", options: CAMP, answer: "at the top of the hill" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 3: an oral history project",
      skill: "Listening",
      instructions: "You will hear two students, Mai and Oliver, talking to their tutor about a school project. You have 30 seconds to look at questions 21-30. Questions 21-25: choose the correct answer. Questions 26-30: who holds each opinion? Choose Mai, Oliver, or both Mai and Oliver. You will hear the recording ONCE.",
      script: [
        { speaker: "Tutor", text: "So, Mai and Oliver, tell me about your oral history project. I thought you were doing something on transport?" },
        { speaker: "Oliver", text: "We were, but then Mai's grandmother told us about the market stall she ran in the eighties, and we thought: that's a much better story. So we switched to interviewing older people about their working lives." },
        { speaker: "Tutor", text: "How many people did you talk to?" },
        { speaker: "Mai", text: "We planned twelve, but four of them couldn't do it in the end, so eight." },
        { speaker: "Tutor", text: "And how did the recordings go?" },
        { speaker: "Oliver", text: "The phone worked fine, and the length was OK. The real problem was background noise: motorbikes, a television, once a very loud bird." },
        { speaker: "Tutor", text: "That happens. Were people happy to talk?" },
        { speaker: "Mai", text: "Very. Most of them said nobody had asked them about the past for years." },
        { speaker: "Oliver", text: "Yes, I noticed that too. My neighbour talked for nearly an hour. Which is also why I think we should have kept the interviews shorter; some of them are really hard to listen to all the way through." },
        { speaker: "Mai", text: "I don't mind the length. What I'd change is that we only recorded audio. With video you'd see their faces and their hands when they explain things." },
        { speaker: "Oliver", text: "I'm not sure. I think people relaxed because there was no camera." },
        { speaker: "Tutor", text: "Both fair points. Any worries about the content?" },
        { speaker: "Oliver", text: "For me, it's hard to know if every story is accurate. People remember things differently after forty years." },
        { speaker: "Mai", text: "But that's part of what makes it interesting, isn't it? It's how they remember it." },
        { speaker: "Tutor", text: "Good discussion for your report. One suggestion: don't cut the recordings down. Write a short transcript for each one instead, so listeners can follow through the noise." },
        { speaker: "Mai", text: "That makes sense. And we're presenting it at the school open day, not just in class, so the transcripts will help visitors too." },
        { speaker: "Tutor", text: "And after that?" },
        { speaker: "Mai", text: "I'd love to carry on next year and interview more people." },
        { speaker: "Oliver", text: "I'd like to, but with exams next year, I honestly don't think I'll have time." },
      ],
      items: [
        { q: "21. Why did they choose this topic?", options: ["Their tutor suggested it.", "Mai's grandmother had an interesting story.", "The transport topic was too difficult."], answer: "Mai's grandmother had an interesting story." },
        { q: "22. How many people did they interview?", options: ["four", "eight", "twelve"], answer: "eight" },
        { q: "23. What was the main problem with the recordings?", options: ["background noise", "the length", "the phone"], answer: "background noise" },
        { q: "24. The tutor suggests that they", options: ["shorten the recordings", "write a transcript for each one", "record the interviews again"], answer: "write a transcript for each one" },
        { q: "25. They will present the project", options: ["only in class", "at the school open day", "at a community centre"], answer: "at the school open day" },
        { q: "26. Older people were pleased to be asked about the past.", options: WHO, answer: "both Mai and Oliver" },
        { q: "27. The interviews should have been shorter.", options: WHO, answer: "Oliver" },
        { q: "28. Video would have been better than audio.", options: WHO, answer: "Mai" },
        { q: "29. It is difficult to check whether the stories are accurate.", options: WHO, answer: "Oliver" },
        { q: "30. They would like to continue the project next year.", options: WHO, answer: "Mai" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "Full Speaking test in trios (speaker, examiner, scorer), about 12 minutes each: Part 1 (four questions, about 4 minutes), Part 2 (1 minute to prepare, up to 2 minutes to speak), Part 3 (three questions linked to Part 2, about 4 minutes). The scorer gives one band per criterion on the HEC rubric and averages them; the teacher fully scores 2-3 students not yet teacher-scored this term, rotating, so every student has a teacher score across the mocks.",
    prompts: [
      "Part 1: Do you like wearing the same kind of clothes as your friends?",
      "Part 1: How do you usually get to school?",
      "Part 1: Are you more of a morning person or an evening person?",
      "Part 1: What kind of gifts do you like to receive?",
      "Part 2: Describe a time when you worked hard to achieve something. You should say: what you wanted to achieve, what you did, how long it took, and explain how you felt when you achieved it.",
      "Part 3: Are exam results a good way to judge what a student can do?",
      "Part 3: Should schools reward effort as well as results?",
      "Part 3: Do young people today face more pressure to succeed than their parents did?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
