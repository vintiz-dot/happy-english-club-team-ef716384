// Sun Class, Year 1 Term 3: the full mock in Lesson 12 (programme lesson 37).
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

const MUSEUM = [
  "to the left of the entrance",
  "to the right of the entrance",
  "straight ahead, past the ticket desk",
  "next to the main stairs",
  "behind the café",
  "at the end of the long corridor",
  "opposite the toilets",
];

const FINDINGS = [
  "Students who left their phone outside the bedroom fell asleep faster.",
  "Students who did sport after school slept longer.",
  "Students who drank coffee slept less.",
  "Girls slept more than boys.",
  "Most students slept longer at weekends.",
];

const WHO = ["Ha", "Jack", "both Ha and Jack"];

export const fullMock: Assessment = {
  id: "hec-ielts-y1-t3-full-mock",
  title: "Term 3 full mock: Listening Parts 1-3 (30 questions) and Speaking Parts 1-3",
  kind: "formative",
  afterLesson: 12,
  minutes: 35,
  covers: [
    "Listening Part 1: form completion (a spelled surname, a time, a price, a date, a phone number, self-corrections)",
    "Listening Part 2: multiple choice (one answer) and plan labelling in a museum talk",
    "Listening Part 3: multiple choice, a 'choose TWO' pair and matching opinions in a discussion between two students and a tutor",
    "Speaking Parts 1-3 in trios, scored on the HEC rubric",
  ],
  sections: [
    {
      title: "Listening Part 1: booking a holiday swimming course",
      skill: "Listening",
      instructions: "You will hear a student phoning a sports centre to book a swimming course. You have 30 seconds to look at questions 1-10. Complete the form. Write ONE WORD AND/OR A NUMBER for each answer. You will hear the recording ONCE.",
      script: [
        { speaker: "Receptionist", text: "Good morning, Riverside Sports Centre, Thu speaking." },
        { speaker: "Caller", text: "Hi. I'd like to sign up for one of the holiday swimming courses, please." },
        { speaker: "Receptionist", text: "Of course. We have three levels: beginners, intermediate and advanced." },
        { speaker: "Caller", text: "I can swim, but not very well. So intermediate, I think." },
        { speaker: "Receptionist", text: "Fine. Intermediate runs for two weeks, Monday to Friday, every morning from half past seven. Oh, sorry, that's the advanced group. Intermediate is from nine until half past ten." },
        { speaker: "Caller", text: "And how much does it cost?" },
        { speaker: "Receptionist", text: "It's eight hundred thousand dong for the two weeks. But if you have a centre card, you get ten per cent off, so it's seven hundred and twenty thousand." },
        { speaker: "Caller", text: "I've got a card, yes." },
        { speaker: "Receptionist", text: "Great. Can I have your name?" },
        { speaker: "Caller", text: "Daniel Okafor. That's O-K-A-F-O-R." },
        { speaker: "Receptionist", text: "And your date of birth?" },
        { speaker: "Caller", text: "The fourteenth of March, 2012." },
        { speaker: "Receptionist", text: "A contact number?" },
        { speaker: "Caller", text: "0987 215 664. Oh, no, sorry, the end is 646. 0987 215 646." },
        { speaker: "Receptionist", text: "Got it. Anything we should know about your health?" },
        { speaker: "Caller", text: "Just mild asthma. I always have my inhaler with me." },
        { speaker: "Receptionist", text: "That's fine; tell the instructor on the first day. Bring a swimming cap, and a padlock for the locker. Goggles are up to you. The course is in the indoor pool; the outdoor one is closed for repairs. And on the last day there's a short test, so you'll get a certificate." },
        { speaker: "Caller", text: "Perfect. Thanks very much." },
      ],
      items: [
        { q: "1. Level: ________", answer: "intermediate" },
        { q: "2. Lessons start at ________ a.m.", answer: "9" },
        { q: "3. Price with a centre card: ________ dong", answer: "720,000" },
        { q: "4. Name: Daniel ________", answer: "Okafor" },
        { q: "5. Date of birth: ________ March 2012", answer: "14" },
        { q: "6. Phone: ________", answer: "0987 215 646" },
        { q: "7. Health: mild ________", answer: "asthma" },
        { q: "8. Bring: a swimming cap and a ________ for the locker", answer: "padlock" },
        { q: "9. Place: the ________ pool", answer: "indoor" },
        { q: "10. Last day: a short ________", answer: "test" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: the reopened City History Museum",
      skill: "Listening",
      instructions: "You will hear a guide welcoming visitors to a museum that has just reopened. You are standing in the entrance hall. You have 30 seconds to look at questions 11-20. Questions 11-15: choose the correct answer. Questions 16-20: where is each place? Choose the correct position from the list; there are two positions you do not need. You will hear the recording ONCE.",
      script: [
        { speaker: "Guide", text: "Hello, everyone, and welcome to the City History Museum. I'm Vy, and I'm one of the guides here. As you may know, we've just reopened after building work. It was meant to take one year, but problems with the roof meant we were closed for two in the end." },
        { speaker: "Guide", text: "First, tickets. Students normally pay twenty thousand dong. There was a lot of talk about making the museum free all the time, but the city decided against it. What we do have is free entry for everyone on the first Sunday of each month." },
        { speaker: "Guide", text: "We have three new features. Everyone expected the virtual reality room to be the favourite, but in our first month the place most visitors went to was actually the rooftop garden. The old tram, which you'll see in a moment, came third." },
        { speaker: "Guide", text: "You're welcome to take photos anywhere. The one thing we ask is no flash in the textiles gallery, because strong light damages old silk." },
        { speaker: "Guide", text: "If you're a teacher bringing a school group, please book at least a week ahead online. We used to take bookings at the desk on the day, but the galleries got too crowded." },
        { speaker: "Guide", text: "Now, finding your way. You're standing in the entrance hall. The gift shop is right here, to the right of the entrance, so you can't miss it on the way out." },
        { speaker: "Guide", text: "The café is on the other side, to the left of the entrance. It looks out onto the street." },
        { speaker: "Guide", text: "If you walk straight ahead, past the ticket desk, you come to the tram gallery. The tram is so big that we had to build the room around it." },
        { speaker: "Guide", text: "The textiles gallery is quieter. Take the long corridor on your left and keep going; it's right at the end of the long corridor." },
        { speaker: "Guide", text: "For the rooftop garden, take the lift. Some people look for it near the café, but it's next to the main stairs, behind the ticket desk." },
        { speaker: "Guide", text: "And the virtual reality room is upstairs, opposite the toilets on the first floor. Sessions last fifteen minutes." },
        { speaker: "Guide", text: "Behind the café there's only the staff office, so you won't need to go there. Enjoy your visit." },
      ],
      items: [
        { q: "11. The museum was closed for", options: ["one year", "eighteen months", "two years"], answer: "two years" },
        { q: "12. Entry is free for everyone", options: ["every weekday", "on the first Sunday of each month", "for school groups only"], answer: "on the first Sunday of each month" },
        { q: "13. In the first month, the most visited new feature was", options: ["the virtual reality room", "the rooftop garden", "the old tram"], answer: "the rooftop garden" },
        { q: "14. In the textiles gallery, visitors must not", options: ["take any photos", "use flash", "touch the glass cases"], answer: "use flash" },
        { q: "15. Teachers with school groups should", options: ["book at the desk on the day", "book at least a week ahead", "arrive before ten o'clock"], answer: "book at least a week ahead" },
        { q: "16. Gift shop", options: MUSEUM, answer: "to the right of the entrance" },
        { q: "17. Café", options: MUSEUM, answer: "to the left of the entrance" },
        { q: "18. Tram gallery", options: MUSEUM, answer: "straight ahead, past the ticket desk" },
        { q: "19. Textiles gallery", options: MUSEUM, answer: "at the end of the long corridor" },
        { q: "20. Lift to the rooftop garden", options: MUSEUM, answer: "next to the main stairs" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 3: a science-fair project on sleep",
      skill: "Listening",
      instructions: "You will hear two students, Ha and Jack, talking to their tutor about a science-fair project. You have 30 seconds to look at questions 21-30. Questions 21 and 24-25: choose the correct answer. Questions 22-23: choose TWO answers (in either order). Questions 26-30: who holds each opinion? Choose Ha, Jack, or both Ha and Jack. You will hear the recording ONCE.",
      script: [
        { speaker: "Tutor", text: "So, Ha and Jack, your project on sleep and phones. Where are you up to?" },
        { speaker: "Jack", text: "We've collected sleep diaries for two weeks. We'd hoped for sixty students, but a lot of people stopped filling them in after a few days, so we've got forty." },
        { speaker: "Tutor", text: "That's still useful. What did the diaries show?" },
        { speaker: "Ha", text: "The average was just under seven hours on school nights. That surprised me, actually; I thought it would be much less." },
        { speaker: "Jack", text: "It didn't surprise me at all. Most people I know go to bed late, but they sleep in at the weekend." },
        { speaker: "Tutor", text: "Anything that stood out?" },
        { speaker: "Ha", text: "Two things. Students who left their phone outside the bedroom fell asleep faster. And the ones who did sport after school slept longer." },
        { speaker: "Jack", text: "We wanted to look at coffee as well, but hardly anyone in our school drinks it, so there wasn't enough data. And we didn't compare boys and girls in the end." },
        { speaker: "Tutor", text: "How will you present it at the fair?" },
        { speaker: "Jack", text: "We were going to make a poster, but the judges like things visitors can try, so we're doing an interactive quiz on a tablet instead." },
        { speaker: "Tutor", text: "Good. What's the weakest part of the project?" },
        { speaker: "Ha", text: "For me, it's that the diaries are self-reported. People might round their hours up." },
        { speaker: "Jack", text: "I agree, that's a real problem. And I think forty is too small a group to say anything about the whole school." },
        { speaker: "Ha", text: "I'm not so sure. It's small, but it covers every year group." },
        { speaker: "Tutor", text: "What would you do differently next time?" },
        { speaker: "Ha", text: "I'd use sleep-tracking watches. The PE department has a few we could borrow." },
        { speaker: "Jack", text: "They'd be more accurate, but people sleep differently when they know they're being tracked. I'd rather just run the study for longer." },
        { speaker: "Tutor", text: "Both fair points. One suggestion: add a short tip sheet for students, on what they could change tonight. Visitors like something to take away." },
        { speaker: "Ha", text: "On balance, that's probably more useful than another page of charts. Let's do it." },
      ],
      items: [
        { q: "21. How many students' diaries did they collect?", options: ["fourteen", "forty", "sixty"], answer: "forty" },
        { q: "22. One finding of the project (one of TWO)", options: FINDINGS, answer: "Students who left their phone outside the bedroom fell asleep faster." },
        { q: "23. One finding of the project (the other one)", options: FINDINGS, answer: "Students who did sport after school slept longer." },
        { q: "24. At the fair, they will present their project with", options: ["a poster", "an interactive quiz", "a short video"], answer: "an interactive quiz" },
        { q: "25. The tutor suggests adding", options: ["a tip sheet for students", "more year groups", "interviews with parents"], answer: "a tip sheet for students" },
        { q: "26. Students sleep more than expected on school nights.", options: WHO, answer: "Ha" },
        { q: "27. Self-reported diaries may not be accurate.", options: WHO, answer: "both Ha and Jack" },
        { q: "28. The group is too small for conclusions about the whole school.", options: WHO, answer: "Jack" },
        { q: "29. Next time the project should use sleep-tracking watches.", options: WHO, answer: "Ha" },
        { q: "30. Next time the study should run for longer.", options: WHO, answer: "Jack" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "Full Speaking test in trios (speaker, examiner, scorer), about 12 minutes each: Part 1 (four questions, about 4 minutes), Part 2 (1 minute to prepare, up to 2 minutes to speak), Part 3 (three questions linked to Part 2, about 4 minutes). The scorer gives one band per criterion on the HEC rubric and averages them; the teacher fully scores 2-3 students not yet teacher-scored this term, rotating, so every student has a teacher score across the mocks.",
    prompts: [
      "Part 1: Do you prefer spending your free time indoors or outdoors?",
      "Part 1: What do you usually do on Sunday evenings?",
      "Part 1: Is there a subject at school you'd like more time for?",
      "Part 1: How often do you use public transport?",
      "Part 2: Describe a place in your town or city that has changed. You should say: what the place is, what it was like before, how it has changed, and explain how you feel about the change.",
      "Part 3: Should old buildings be protected, or replaced with modern ones?",
      "Part 3: How has the way young people spend their free time in cities changed?",
      "Part 3: Who should decide how a city changes: the government or the people who live there?",
    ],
    rubric: [
      { criterion: "Fluency & Coherence", bands: bands("Fluency & Coherence") },
      { criterion: "Lexical Resource", bands: bands("Lexical Resource") },
      { criterion: "Grammar Range & Accuracy", bands: bands("Grammar Range & Accuracy") },
      { criterion: "Pronunciation", bands: bands("Pronunciation") },
    ],
  },
};
