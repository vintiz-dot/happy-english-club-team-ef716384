// Sun Class, Year 1 Term 1: the full mock in Lesson 12. Listening Parts 1 and 2
// (20 questions) plus a short Part 3 sample (6 questions), scored out of 26 and
// converted to an approximate band; and a full Speaking test (Parts 1-3) in trios,
// scored on HEC's own rubric (ieltsRubric.ts). Every script and question is HEC's own.
import type { Assessment } from "@/lib/lessonDecks/types";
import { RUBRIC, type Criterion } from "@/lib/lessonDecks/ieltsRubric";

/** One criterion's HEC wording as [8+, 7, 6, 5]. */
const bands = (c: Criterion): [string, string, string, string] => {
  const row = RUBRIC.find((r) => r.criterion === c)!;
  const at = (b: "5" | "6" | "7" | "8+") => row.bands.find((x) => x.band === b)!.sounds;
  return [at("8+"), at("7"), at("6"), at("5")];
};

const AREAS = ["have a picnic", "play football", "watch birds", "rent a boat", "see sculptures", "hire a bike", "listen to live music"];

export const fullMock: Assessment = {
  id: "hec-ielts-y1-t1-full-mock",
  title: "Term 1 full mock: Listening Parts 1-2, a Part 3 sample and Speaking Parts 1-3",
  kind: "formative",
  afterLesson: 12,
  minutes: 30,
  covers: [
    "Listening Part 1: note completion (names spelled aloud, numbers, self-corrections)",
    "Listening Part 2: multiple choice (one answer) and matching",
    "Listening Part 3 sample: multiple choice in a discussion between two students and a tutor",
    "Speaking Parts 1-3 in trios, scored on the HEC rubric",
  ],
  sections: [
    {
      title: "Listening Part 1: a beach clean-up weekend",
      skill: "Listening",
      instructions: "You will hear a teenager phoning a volunteer group about a beach clean-up. You have 30 seconds to look at questions 1-10. Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer. You will hear the recording ONCE.",
      script: [
        { speaker: "Coordinator", text: "Hello, Clean Coast Volunteers, Sam speaking." },
        { speaker: "Caller", text: "Hi. I saw a poster at school about the beach clean-up weekend, and I'd like to sign up." },
        { speaker: "Coordinator", text: "Great. First of all, how old are you? Volunteers have to be at least thirteen." },
        { speaker: "Caller", text: "I'm fourteen, so that's fine." },
        { speaker: "Coordinator", text: "Perfect. Can I have your full name?" },
        { speaker: "Caller", text: "Yes, it's Daniel Ferrow. That's F-E-double R-O-W." },
        { speaker: "Coordinator", text: "Thanks, Daniel. The clean-up is on the eighth and ninth of June. Which day would you like?" },
        { speaker: "Caller", text: "The Saturday, please. Actually, no, I've got a football match on Saturday. Sunday, then." },
        { speaker: "Coordinator", text: "Sunday it is. We meet by the lighthouse at the north end of Long Sand Beach, at seven. It says half past seven on the poster, but we've changed it: it gets too hot later." },
        { speaker: "Caller", text: "Seven, OK. What should I bring?" },
        { speaker: "Coordinator", text: "We provide gloves and bags. You just need a hat and something to drink, in a bottle you can use again, not a plastic one, please." },
        { speaker: "Caller", text: "Is there any training?" },
        { speaker: "Coordinator", text: "A short safety talk at the start, about twenty minutes. And anyone under eighteen needs a form signed by a parent." },
        { speaker: "Caller", text: "How do I get the form to you?" },
        { speaker: "Coordinator", text: "Bring it on the day, or drop it at our office. We're at number forty-two, Harbour Street." },
        { speaker: "Caller", text: "Forty-two. Will there be any lunch?" },
        { speaker: "Coordinator", text: "Yes, sandwiches and fruit. And at the end everyone gets a certificate, which is useful for school applications." },
        { speaker: "Caller", text: "Brilliant. Who should I ask for on the day?" },
        { speaker: "Coordinator", text: "Ask for me: Sam Okafor. O-K-A-F-O-R." },
      ],
      items: [
        { q: "1. Minimum age of volunteers: ________", answer: "13" },
        { q: "2. Name: Daniel ________", answer: "Ferrow" },
        { q: "3. Day chosen: ________", answer: "Sunday" },
        { q: "4. Meeting point: the ________ at the north end of Long Sand Beach", answer: "lighthouse" },
        { q: "5. Meeting time: ________ a.m.", answer: "7 (seven o'clock)" },
        { q: "6. Bring: a ________ and a reusable bottle", answer: "hat" },
        { q: "7. Under-18s: form signed by a ________", answer: "parent" },
        { q: "8. Office address: ________ Harbour Street", answer: "42" },
        { q: "9. At the end everyone receives a ________", answer: "certificate" },
        { q: "10. Coordinator: Sam ________", answer: "Okafor" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: the new Riverside Park",
      skill: "Listening",
      instructions: "You will hear a radio presenter talking about a new park. You have 30 seconds to look at questions 11-20. Questions 11-15: choose the correct answer. Questions 16-20: what can visitors do in each area of the park? Choose from the list; you will not use every option. You will hear the recording ONCE.",
      script: [
        { speaker: "Presenter", text: "Good morning, and welcome to What's On. Today I'm talking about the new Riverside Park, which opens to the public this Saturday." },
        { speaker: "Presenter", text: "The park is built on land that used to be a car factory. The factory closed in 2015, and for years people argued about building flats there, but in the end the city chose a park." },
        { speaker: "Presenter", text: "Entry is free. There was talk of a small charge at weekends, but the council decided against it, so it's free every day." },
        { speaker: "Presenter", text: "There's a small car park, but it fills up very quickly, so the organisers are asking everyone to come by bus. Route 22 now stops right at the main gate." },
        { speaker: "Presenter", text: "The opening on Saturday was going to be led by the mayor, but she'll be abroad, so instead children from the local primary school will lead a parade through the park at ten." },
        { speaker: "Presenter", text: "Now, the different areas. Coming in through the main gate, the first area is the Meadow. It's a huge open field and the place to have a picnic. Ball games aren't allowed there, I'm afraid." },
        { speaker: "Presenter", text: "If you want to play football, head for the Sports Ground, beside the old factory chimney, which has been kept as a landmark." },
        { speaker: "Presenter", text: "The Lake Garden was supposed to have boats for hire, but the water turned out to be too shallow. Instead there's a wooden platform where you can watch the birds." },
        { speaker: "Presenter", text: "The Factory Yard is my favourite. Local artists have made sculptures out of old machine parts, and there are fifteen of them to find." },
        { speaker: "Presenter", text: "Then there's the River Path, which runs the whole length of the park. Bikes can be hired at the start of the path, near the bridge." },
        { speaker: "Presenter", text: "There won't be any concerts in the first month, by the way; the stage isn't finished yet." },
        { speaker: "Presenter", text: "My advice for Saturday: get there early. You don't need to book, but the best picnic spots will go quickly. Enjoy the park!" },
      ],
      items: [
        { q: "11. What was on the site before the park?", options: ["flats", "a car factory", "a market"], answer: "a car factory" },
        { q: "12. At weekends, entry to the park", options: ["is free", "costs a little", "is for local people only"], answer: "is free" },
        { q: "13. Visitors are asked to", options: ["park at the main gate", "come by bus", "cycle along the river"], answer: "come by bus" },
        { q: "14. On Saturday the opening will be", options: ["led by the mayor", "a concert", "a children's parade"], answer: "a children's parade" },
        { q: "15. The presenter recommends that visitors", options: ["arrive early", "book a picnic spot", "bring an umbrella"], answer: "arrive early" },
        { q: "16. The Meadow", options: AREAS, answer: "have a picnic" },
        { q: "17. The Sports Ground", options: AREAS, answer: "play football" },
        { q: "18. The Lake Garden", options: AREAS, answer: "watch birds" },
        { q: "19. The Factory Yard", options: AREAS, answer: "see sculptures" },
        { q: "20. The River Path", options: AREAS, answer: "hire a bike" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 3 sample: a project on canteen plastic",
      skill: "Listening",
      instructions: "You will hear two students, Jack and Priya, talking to their tutor about a school project. You have 30 seconds to look at questions 21-26. Choose the correct answer. You will hear the recording ONCE.",
      script: [
        { speaker: "Tutor", text: "So, Jack and Priya, how's your project on plastic waste in the school canteen coming along?" },
        { speaker: "Jack", text: "Quite well. We started by counting what gets thrown away in one day. We expected plastic bottles to be the biggest problem." },
        { speaker: "Priya", text: "But actually it was straws and spoons. There were nearly four hundred of them after a single lunchtime." },
        { speaker: "Tutor", text: "That's surprising. How did you collect the data?" },
        { speaker: "Jack", text: "We wanted to interview the canteen staff, but they were far too busy, so in the end we sorted the bins ourselves after lunch, wearing gloves." },
        { speaker: "Tutor", text: "Good. And the questionnaire you were planning?" },
        { speaker: "Priya", text: "We gave it to two classes. The answers were useful, but only about half the students filled it in, so we can't really say it speaks for the whole school." },
        { speaker: "Tutor", text: "That's an honest point to put in your report. So what are you going to recommend?" },
        { speaker: "Jack", text: "I think the school should just ban plastic straws completely." },
        { speaker: "Priya", text: "I'm not so sure. A ban might make people annoyed. I'd rather start with a reward, like a small discount for anyone who brings their own spoon." },
        { speaker: "Tutor", text: "Both ideas are reasonable. What have you agreed?" },
        { speaker: "Jack", text: "Well, Priya persuaded me. We'll suggest the reward first, and a ban only if it hasn't worked after a term." },
        { speaker: "Tutor", text: "Sensible. And the presentation: who's doing what?" },
        { speaker: "Priya", text: "I'm better with numbers, so I'll present the results, and Jack will explain the recommendation." },
        { speaker: "Tutor", text: "One piece of advice: your charts are rather crowded. Use fewer colours and give each one a clear title." },
        { speaker: "Jack", text: "Fair enough. We'll make them simpler before Friday." },
      ],
      items: [
        { q: "21. What did the students find was the biggest source of plastic waste?", options: ["plastic bottles", "straws and spoons", "food packaging"], answer: "straws and spoons" },
        { q: "22. How did they collect their data?", options: ["They interviewed the canteen staff.", "They sorted the bins themselves.", "They asked the cleaners."], answer: "They sorted the bins themselves." },
        { q: "23. What was the problem with the questionnaire?", options: ["The questions were too difficult.", "Not enough students answered it.", "The teachers did not allow it."], answer: "Not enough students answered it." },
        { q: "24. What will they recommend first?", options: ["a ban on plastic straws", "a reward for bringing your own spoon", "a poster campaign"], answer: "a reward for bringing your own spoon" },
        { q: "25. In the presentation, Priya will talk about", options: ["the method", "the results", "the recommendation"], answer: "the results" },
        { q: "26. The tutor says the charts should be", options: ["simpler", "larger", "more detailed"], answer: "simpler" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "Full Speaking test in trios (speaker, examiner, scorer), about 12 minutes each: Part 1 (four questions, about 4 minutes), Part 2 (1 minute to prepare, up to 2 minutes to speak), Part 3 (three questions linked to Part 2, about 4 minutes). The scorer gives one band per criterion on the HEC rubric and averages them; the teacher fully scores 2-3 students each mock and rotates, so every student has a teacher score across the mocks.",
    prompts: [
      "Part 1: Where do you live, and what do you like about it?",
      "Part 1: What do you usually do at weekends?",
      "Part 1: What kind of food do you enjoy most?",
      "Part 1: Do you prefer reading books or watching films?",
      "Part 2: Describe a day out that you enjoyed. You should say: where you went, who you went with, what you did, and explain why you enjoyed it.",
      "Part 3: Why do families enjoy spending days out together?",
      "Part 3: Do young people today spend less time outdoors than their parents did?",
      "Part 3: Is it better to plan a day out carefully or to decide on the day?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
