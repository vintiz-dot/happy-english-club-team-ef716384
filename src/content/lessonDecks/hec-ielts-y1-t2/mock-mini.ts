// Sun Class, Year 1 Term 2: the mini-mock, run inside Lesson 7 (programme lesson 19,
// Mini-mock: people and places). Listening Parts 1 and 2 (20 questions, heard once):
// a homestay booking with form completion, and a guide at a discovery centre with
// multiple choice (including a choose-TWO pair) and a plan described in words.
// Speaking Parts 1 and 2 plus one Part 3 question, scored in trios on the HEC rubric
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

const FREE = ["use the lockers", "join a guided tour", "borrow a tablet guide", "take photos with flash", "use the rooftop telescope"];
const SPOTS = [
  "straight ahead of the entrance",
  "on the left as you come in",
  "upstairs, above the shop",
  "at the end of the right-hand corridor",
  "opposite the café",
  "next to the lifts",
  "behind the ticket desk",
];

export const miniMock: Assessment = {
  id: "hec-ielts-y1-t2-mini-mock",
  title: "Term 2 mini-mock: Listening Parts 1-2 and Speaking Parts 1-2 with a Part 3 question",
  kind: "formative",
  afterLesson: 7,
  minutes: 25,
  covers: [
    "IELTS Listening Part 1: form completion, ONE WORD AND/OR A NUMBER (a spelled name, numbers, self-corrections)",
    "IELTS Listening Part 2: multiple choice (one answer and choose TWO) and plan labelling described in words",
    "IELTS Speaking Parts 1 and 2 on people and places, with one Part 3 question",
    "Recycled language: describing people and places, relative clauses (who, which, where, whose)",
  ],
  sections: [
    {
      title: "Listening Part 1: booking a homestay for a family trip",
      skill: "Listening",
      instructions: "You will hear a boy phoning a homestay in the mountains to book a weekend for his family. Complete the form. Write ONE WORD AND/OR A NUMBER for each answer. You hear the recording ONCE.",
      script: [
        { speaker: "Owner", text: "Good morning, Pine Hill Homestay. Mrs Sen speaking." },
        { speaker: "Caller", text: "Hello. I'd like to book a weekend for my family, please. My mum asked me to call because her English is a bit rusty." },
        { speaker: "Owner", text: "No problem at all. Can I have your family name?" },
        { speaker: "Caller", text: "It's Luong. L-U-O-N-G." },
        { speaker: "Owner", text: "Thank you. And how many guests will there be?" },
        { speaker: "Caller", text: "Seven. Oh, no, sorry: my aunt has to work that weekend, so six of us." },
        { speaker: "Owner", text: "Six. Which day would you arrive?" },
        { speaker: "Caller", text: "Friday the fifteenth, in the evening, and we'd stay for two nights." },
        { speaker: "Owner", text: "Lovely. We have a small room by the garden, which is cheaper, or the large family room with a balcony that looks over the valley." },
        { speaker: "Caller", text: "The garden room sounds nice, but it's too small for six. The one with the balcony, please." },
        { speaker: "Owner", text: "Good choice. That's three hundred and fifty thousand dong per person per night. It was three hundred last year, but we've added a new bathroom." },
        { speaker: "Caller", text: "That's fine. Are meals included?" },
        { speaker: "Owner", text: "Breakfast and dinner are. Lunch you can order, but it's extra." },
        { speaker: "Caller", text: "OK. And my brother wanted to go trekking. Is that possible?" },
        { speaker: "Owner", text: "I'm afraid the trekking path is closed after the heavy rain. But we can book you a bicycle tour round the villages instead." },
        { speaker: "Caller", text: "Great, he'll like that. Can someone meet us when we arrive? We're coming by bus, not by train." },
        { speaker: "Owner", text: "Of course. My son will pick you up at the bus station. Is there anything else we should know?" },
        { speaker: "Caller", text: "Yes, my grandmother finds stairs difficult, so she'll need a room on the ground floor." },
      ],
      items: [
        { q: "1. Family name: ________", answer: "Luong" },
        { q: "2. Number of guests: ________", answer: "6" },
        { q: "3. Arrival: Friday the ________", answer: "15th (the fifteenth)" },
        { q: "4. Length of stay: ________ nights", answer: "2" },
        { q: "5. Room: the large family room with a ________", answer: "balcony" },
        { q: "6. Price: ________ dong per person per night", answer: "350,000" },
        { q: "7. Meals included: breakfast and ________", answer: "dinner" },
        { q: "8. Activity booked: a ________ tour", answer: "bicycle" },
        { q: "9. Pick-up point: the ________ station", answer: "bus" },
        { q: "10. Grandmother needs a room on the ________ floor", answer: "ground" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: welcome to a discovery centre",
      skill: "Listening",
      instructions: "You will hear a guide welcoming visitors to a science and history discovery centre. Questions 11-13: choose the correct answer. Questions 14-15: choose TWO answers, in either order. Questions 16-20: where is each place? Choose the correct position from the list; there are two positions you do not need. You are standing at the main entrance. You hear the recording ONCE.",
      script: [
        { speaker: "Guide", text: "Hello, everyone, and welcome to Riverside Discovery Centre. I'm Duy, and I'll give you a quick introduction before you start exploring." },
        { speaker: "Guide", text: "Many visitors guess this building was a factory, because of that tall chimney. In fact it was a rice warehouse for fifty years. The chimney belonged to a bakery next door, which closed long ago." },
        { speaker: "Guide", text: "We expected the planetarium to be our most popular exhibit, and children under ten do love it. But among teenagers, it's the robot workshop that gets booked out every weekend. The earthquake room would be a favourite too, but it's closed for repairs until next month." },
        { speaker: "Guide", text: "A word about tickets. Students with a card pay half price on any day. We used to have free entry on Tuesdays, but that ended in September. And online tickets cost exactly the same as tickets at the door, so don't worry about booking ahead." },
        { speaker: "Guide", text: "Some things here cost nothing. The lockers are free to use, so you don't need to carry your bags around. Guided tours, though, are twenty thousand dong extra." },
        { speaker: "Guide", text: "The tablet guides used to be free, but too many got broken, so there's now a small charge. You're welcome to take photos, but never with the flash, please: it damages the old maps." },
        { speaker: "Guide", text: "And after five o'clock, anyone can go up and use the rooftop telescope for free. On a clear evening you can see the bridges all along the river." },
        { speaker: "Guide", text: "Now, where is everything? As you come in, the café is straight ahead of you, and on the left as you come in is the gift shop." },
        { speaker: "Guide", text: "The planetarium is upstairs. Take the stairs by the shop, and it's directly above it." },
        { speaker: "Guide", text: "For the robot workshop, turn right into the corridor and keep going: it's right at the end of the right-hand corridor, behind the glass doors." },
        { speaker: "Guide", text: "Our gallery of old maps of the city is opposite the café, so you can look at it while you wait for a drink." },
        { speaker: "Guide", text: "If anyone feels unwell, the first-aid room is behind the ticket desk. It used to be next to the lifts, so ignore the old sign there; we haven't taken it down yet." },
        { speaker: "Guide", text: "Right, the robot workshop starts in ten minutes, so if you've booked a place, follow me." },
      ],
      items: [
        { q: "11. Before it was a discovery centre, the building was", options: ["a factory", "a rice warehouse", "a bakery"], answer: "a rice warehouse" },
        { q: "12. The exhibit most popular with teenagers is", options: ["the planetarium", "the robot workshop", "the earthquake room"], answer: "the robot workshop" },
        { q: "13. Students with a card", options: ["get in free on Tuesdays", "pay half price on any day", "pay less if they book online"], answer: "pay half price on any day" },
        { q: "14. Which TWO things can visitors do for free? (first answer)", options: FREE, answer: "use the lockers" },
        { q: "15. Which TWO things can visitors do for free? (second answer)", options: FREE, answer: "use the rooftop telescope" },
        { q: "16. Gift shop", options: SPOTS, answer: "on the left as you come in" },
        { q: "17. Planetarium", options: SPOTS, answer: "upstairs, above the shop" },
        { q: "18. Robot workshop", options: SPOTS, answer: "at the end of the right-hand corridor" },
        { q: "19. Gallery of old maps", options: SPOTS, answer: "opposite the café" },
        { q: "20. First-aid room", options: SPOTS, answer: "behind the ticket desk" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "IELTS Speaking in trios (speaker, examiner, scorer), about 8 minutes a turn: Part 1 (about 4 minutes, the examiner reads the questions word for word), Part 2 (1 minute to prepare, up to 2 minutes to speak), then ONE Part 3 question linked to the cue card (about 1 minute). The scorer gives one band per criterion on the HEC rubric. The teacher fully scores two or three students who were not teacher-scored in the Term 1 mocks, and rotates.",
    prompts: [
      "Part 1: Who do you usually spend your weekends with?",
      "Part 1: Is there a place in your area where young people like to meet?",
      "Part 1: Do you enjoy visiting places you have never been to before? Why or why not?",
      "Part 1: Do you prefer travelling with your family or with friends?",
      "Part 2 cue card: Describe a person who showed you around a place you had never visited before. You should say: who the person was, where the place was, what they showed you, and explain how you felt about the visit.",
      "Part 3: Why do some people enjoy showing visitors around their hometown?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
