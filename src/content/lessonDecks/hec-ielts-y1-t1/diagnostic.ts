// Sun Class, Year 1 Term 1: the Lesson 1 diagnostic. Listening Parts 1 and 2
// (20 questions, scored out of 20 and converted to an approximate band) from the
// Lesson 1 check slide, and the speaking task recorded in pairs in Lesson 1
// (Parts 1 and 2) plus the Part 3 video homework. Scored on HEC's own rubric
// (ieltsRubric.ts); every script and question is HEC's own.
import type { Assessment } from "@/lib/lessonDecks/types";
import { RUBRIC, type Criterion } from "@/lib/lessonDecks/ieltsRubric";

/** One criterion's HEC wording as [8+, 7, 6, 5]. */
const bands = (c: Criterion): [string, string, string, string] => {
  const row = RUBRIC.find((r) => r.criterion === c)!;
  const at = (b: "5" | "6" | "7" | "8+") => row.bands.find((x) => x.band === b)!.sounds;
  return [at("8+"), at("7"), at("6"), at("5")];
};

const MAP_OPTIONS = ["A", "B", "C", "D", "E", "F", "G"];

export const diagnostic: Assessment = {
  id: "hec-ielts-y1-t1-diagnostic",
  title: "Term 1 diagnostic: Listening Parts 1-2 and Speaking",
  kind: "formative",
  afterLesson: 1,
  minutes: 22,
  covers: [
    "Listening Part 1: form completion (names spelled aloud, numbers, dates, self-corrections)",
    "Listening Part 2: multiple choice (one answer) and plan labelling",
    "Speaking Parts 1 and 2 (recorded in pairs in Lesson 1) and Part 3 (video homework)",
  ],
  sections: [
    {
      title: "Listening Part 1: booking a birthday party",
      skill: "Listening",
      instructions: "You will hear a woman phoning a bowling centre to book a birthday party. You have 30 seconds to look at questions 1-10. Complete the form. Write ONE WORD AND/OR A NUMBER for each answer. You will hear the recording ONCE.",
      script: [
        { speaker: "Staff", text: "Good afternoon, Starlight Bowling, Kevin speaking. How can I help?" },
        { speaker: "Caller", text: "Hi. I'd like to book a birthday party for my daughter, please." },
        { speaker: "Staff", text: "Of course. Can I take your name first?" },
        { speaker: "Caller", text: "It's Helen Marsh. That's M-A-R-S-H." },
        { speaker: "Staff", text: "Thank you. And a contact number?" },
        { speaker: "Caller", text: "It's oh nine one two, four four seven, three oh eight." },
        { speaker: "Staff", text: "Lovely. What date were you thinking of?" },
        { speaker: "Caller", text: "Saturday the twelfth of April. Oh, wait, that's the day of her swimming test. Could we do the nineteenth instead?" },
        { speaker: "Staff", text: "The nineteenth is fine. We have a slot at two or at four in the afternoon." },
        { speaker: "Caller", text: "Four o'clock would be better. Two is too close to lunch." },
        { speaker: "Staff", text: "And how many children will there be?" },
        { speaker: "Caller", text: "About ten. Actually, her cousins are coming too, so let's say fourteen." },
        { speaker: "Staff", text: "For fourteen you'll need three lanes. Each child gets two games, and shoes are included. For food there are two menus: the Classic has pizza and juice, and the Super adds ice cream. Most people go for the Classic." },
        { speaker: "Caller", text: "We'll have the Super, I think. She loves ice cream. How much is that?" },
        { speaker: "Staff", text: "The Super is one hundred and twenty thousand dong per child. You're welcome to bring your own cake, and you'll have the Galaxy Room for an hour after bowling." },
        { speaker: "Caller", text: "The Galaxy Room. Do I need to pay anything now?" },
        { speaker: "Staff", text: "Just a deposit of two hundred thousand, which you can pay at the desk any time this week. The rest on the day." },
        { speaker: "Caller", text: "Great. Is there parking?" },
        { speaker: "Staff", text: "Yes, free parking behind the building. Use the entrance on Lake Road, not the one on the main road." },
      ],
      items: [
        { q: "1. Customer's surname: ________", answer: "Marsh" },
        { q: "2. Phone number: ________", answer: "0912 447 308" },
        { q: "3. Date of party: ________ April", answer: "19 (the nineteenth)" },
        { q: "4. Start time: ________ p.m.", answer: "4 (four o'clock)" },
        { q: "5. Number of children: ________", answer: "14" },
        { q: "6. Menu chosen: the ________", answer: "Super" },
        { q: "7. Price per child: ________ dong", answer: "120,000" },
        { q: "8. Party room: the ________ Room", answer: "Galaxy" },
        { q: "9. Deposit: ________ dong", answer: "200,000" },
        { q: "10. Car park entrance: on ________ Road", answer: "Lake" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: a visit to the science museum",
      skill: "Listening",
      instructions: "You will hear a museum guide talking to a school group. You have 30 seconds to look at questions 11-20. Questions 11-15: choose the correct answer. Questions 16-20: label the plan of the ground floor with a letter A-G. The plan: the main entrance is in the middle of the bottom edge. A is just to the left of the entrance and F just to the right of it. B is in the centre of the floor. G is halfway up the left-hand wall. C is the top left corner, D the middle of the top edge and E the top right corner. You will not use every letter. You will hear the recording ONCE.",
      script: [
        { speaker: "Guide", text: "Good morning, everyone, and welcome to the City Science Museum. My name's Rachel, and I'll be looking after your group today." },
        { speaker: "Guide", text: "We're quite a new museum: we opened in 2019. The building itself is much older, though. People often think it was a factory, but for over a hundred years it was the city's railway station." },
        { speaker: "Guide", text: "You'll be with us until half past twelve. We used to give school groups the whole day, but teachers told us half a day was easier to organise, so that's what we do now." },
        { speaker: "Guide", text: "Photos are fine everywhere, but please don't use flash in the Insect Hall, because it disturbs the live insects." },
        { speaker: "Guide", text: "Most visitors guess that the Space Gallery is our most popular area. In fact, it's the Robot Workshop, where you can build and program a simple robot." },
        { speaker: "Guide", text: "You'll each get a worksheet. Don't worry about finishing it today: take it back to school and give it to your teacher next week." },
        { speaker: "Guide", text: "Now, let me tell you where everything is. Look at the plan of the ground floor. We're standing at the main entrance, at the bottom of the plan." },
        { speaker: "Guide", text: "The cloakroom is immediately on your left as you come in, so please leave your bags there first." },
        { speaker: "Guide", text: "Straight ahead of you, right in the middle of the floor, is the Space Gallery. You can't miss the rocket." },
        { speaker: "Guide", text: "The Robot Workshop is in the top left-hand corner. Walk past the Space Gallery and turn left at the far wall." },
        { speaker: "Guide", text: "The café isn't where it used to be, next to the entrance. It's moved to the top right-hand corner, beside the garden doors." },
        { speaker: "Guide", text: "The gift shop has taken the café's old place, on your right as you come in." },
        { speaker: "Guide", text: "The Insect Hall is along the left-hand wall, halfway between the cloakroom and the Robot Workshop." },
        { speaker: "Guide", text: "And the toilets are in the middle of the top wall, between the Robot Workshop and the café. Right, bags in the cloakroom, and let's start with the rocket." },
      ],
      items: [
        { q: "11. What was the museum building before?", options: ["a factory", "a railway station", "a school"], answer: "a railway station" },
        { q: "12. Why do school groups now stay for half a day?", options: ["The museum is too small.", "Teachers found it easier to organise.", "The museum closes at lunchtime."], answer: "Teachers found it easier to organise." },
        { q: "13. Where must visitors not use flash?", options: ["the Space Gallery", "the Insect Hall", "the Robot Workshop"], answer: "the Insect Hall" },
        { q: "14. The most popular area of the museum is", options: ["the Space Gallery", "the Robot Workshop", "the café"], answer: "the Robot Workshop" },
        { q: "15. What should students do with the worksheet?", options: ["finish it before they leave", "give it to the guide", "give it to their teacher next week"], answer: "give it to their teacher next week" },
        { q: "16. Space Gallery", options: MAP_OPTIONS, answer: "B" },
        { q: "17. Robot Workshop", options: MAP_OPTIONS, answer: "C" },
        { q: "18. Café", options: MAP_OPTIONS, answer: "E" },
        { q: "19. Gift shop", options: MAP_OPTIONS, answer: "F" },
        { q: "20. Insect Hall", options: MAP_OPTIONS, answer: "G" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "Lesson 1, recorded in pairs: Part 1 (four questions, 2-4 sentences each) and Part 2 (1 minute to prepare, up to 2 minutes to speak). Part 3 is the week's video homework, recorded in one take. The teacher scores every recording on the four criteria; the four bands are averaged for an estimated starting Speaking band.",
    prompts: [
      "Part 1: Where do you live? Do you like it there? Why?",
      "Part 1: Do you prefer studying in the morning or the evening?",
      "Part 1: What do you usually do after school?",
      "Part 1: Do you like your name? Why or why not?",
      "Part 2: Describe a place where you like to spend time. You should say: where it is, how often you go there, what you do there, and explain why you like spending time there.",
      "Part 3: Why do some people prefer to live in the countryside?",
      "Part 3: How have cities in Vietnam changed in the last 10 years?",
      "Part 3: Do you think young people spend enough time in nature? Why or why not?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
