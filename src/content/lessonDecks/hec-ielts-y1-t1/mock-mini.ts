// Sun Class, Year 1 Term 1: the mini-mock, run inside Lesson 6 (Friends and family).
// Listening Parts 1 and 2 (20 questions, heard once) and Speaking Parts 1 and 2,
// scored in trios on the HEC rubric. Scripts, questions and rubric wording are
// HEC's own; the rubric paraphrases the shape of the public descriptors and gives
// an ESTIMATE, never an official band.
import type { Assessment } from "@/lib/lessonDecks/types";

const ROOMS = ["homework help", "music", "table tennis", "cooking", "board games", "drama", "computers"];

export const miniMock: Assessment = {
  id: "hec-ielts-y1-t1-mini-mock",
  title: "Term 1 mini-mock: Listening Parts 1-2 and Speaking Parts 1-2",
  kind: "formative",
  afterLesson: 6,
  minutes: 25,
  covers: [
    "IELTS Listening Part 1: form completion, ONE WORD AND/OR A NUMBER",
    "IELTS Listening Part 2: multiple choice and matching (a plan described in words)",
    "IELTS Speaking Parts 1 and 2 on friends and family",
    "Describing people: personality adjectives, get on (well) with, take after, look up to",
  ],
  sections: [
    {
      title: "Listening Part 1: registering for a family fun run",
      skill: "Listening",
      instructions: "You will hear a girl phoning to register her family for a charity run. Complete the form. Write ONE WORD AND/OR A NUMBER for each answer. You hear the recording ONCE.",
      script: [
        { speaker: "Organiser", text: "Hello, West Lake Family Fun Run, Tuan speaking." },
        { speaker: "Caller", text: "Hi, I'd like to register my family for the run next month." },
        { speaker: "Organiser", text: "Great. Can I take your surname first?" },
        { speaker: "Caller", text: "It's Pham. P-H-A-M." },
        { speaker: "Organiser", text: "And how many people will be taking part?" },
        { speaker: "Caller", text: "Four: me, my parents and my little brother. Actually, my grandad wants to walk it too, so put five." },
        { speaker: "Organiser", text: "Five. Walkers are very welcome. Which distance would you like: three kilometres or eight?" },
        { speaker: "Caller", text: "The shorter one, please, because of my brother." },
        { speaker: "Organiser", text: "Fine. Registration closes on the twelfth, and the run itself is on Sunday the twentieth." },
        { speaker: "Caller", text: "My friend said it starts at seven. Is that right?" },
        { speaker: "Organiser", text: "That was last year. This year we start at six fifteen, before it gets too hot." },
        { speaker: "Caller", text: "Early! And how much does it cost?" },
        { speaker: "Organiser", text: "Adults pay eighty thousand dong each, and children under twelve run for free." },
        { speaker: "Caller", text: "Good. Where should we meet on the day?" },
        { speaker: "Organiser", text: "At the north gate of the park, next to the flower market. Everyone gets a free T-shirt there, but please bring a water bottle, because we don't hand out plastic ones." },
        { speaker: "Caller", text: "OK. For T-shirts, my dad needs large, and my brother small. No, sorry, he's grown a lot this year. Medium for him." },
        { speaker: "Organiser", text: "Got it. And just for our records, how did you hear about the run?" },
        { speaker: "Caller", text: "From a poster at my school." },
      ],
      items: [
        { q: "1. Family surname: ________", answer: "Pham" },
        { q: "2. Number of people taking part: ________", answer: "5" },
        { q: "3. Distance chosen: ________ km", answer: "3" },
        { q: "4. Date of the run: Sunday ________", answer: "20th (the twentieth)" },
        { q: "5. Start time: ________ a.m.", answer: "6.15 (six fifteen)" },
        { q: "6. Cost for each adult: ________ dong", answer: "80,000" },
        { q: "7. Meeting point: the north ________ of the park", answer: "gate" },
        { q: "8. Each runner must bring a water ________", answer: "bottle" },
        { q: "9. Brother's T-shirt size: ________", answer: "medium" },
        { q: "10. Heard about the run from a ________ at school", answer: "poster" },
      ],
      marksEach: 1,
    },
    {
      title: "Listening Part 2: an open day at a youth club",
      skill: "Listening",
      instructions: "You will hear a youth leader showing visitors around a youth club. Questions 11-15: choose the correct answer. Questions 16-20: where is each activity? Choose the correct activity for each place. You hear the recording ONCE.",
      script: [
        { speaker: "Guide", text: "Hello everyone, and welcome to the open day at Bamboo Bridge Youth Club. My name's Kate, and I'm one of the youth leaders here." },
        { speaker: "Guide", text: "Many visitors think this building was a school, because of the playground at the back. In fact it was a bank for forty years, and the club moved in four years ago." },
        { speaker: "Guide", text: "Membership is for young people aged eleven to sixteen. We did try opening every evening to eighteen-year-olds, but the older ones preferred a night of their own, so they now come on Fridays only." },
        { speaker: "Guide", text: "Joining doesn't cost anything, and parents don't need to come with you. What we do ask is that every member helps with one job a month, like tidying the kitchen or welcoming new members." },
        { speaker: "Guide", text: "We're open on weekdays from four until eight. On Saturday mornings we're open too, and that time is mostly used for trips. People often expect competitions then, but those happen on weekday evenings." },
        { speaker: "Guide", text: "This year we planned to buy new computers, but what members asked for most was more table tennis, so we bought a second table instead. The computers will have to wait until next year." },
        { speaker: "Guide", text: "Now, let me tell you where everything is. As you come in through the main door, the room straight ahead of you is where we do homework help. It's our quietest room, because it's away from the street." },
        { speaker: "Guide", text: "On your left is the big hall. You might expect sport in there, but it's actually our music room, because the sound is so good." },
        { speaker: "Guide", text: "The table tennis is next to the hall, in the room with the green door." },
        { speaker: "Guide", text: "Upstairs, right at the top of the stairs, is the kitchen. Every Thursday the members cook dinner there together." },
        { speaker: "Guide", text: "And the small room beside the kitchen, the one with the big window, is for board games. We used to keep the games downstairs, but pieces kept going missing." },
        { speaker: "Guide", text: "There's no drama group at the moment, I'm afraid, but we hope to start one in the spring." },
        { speaker: "Guide", text: "One last thing: every member signs in at the desk on the right of the main door each time they arrive." },
        { speaker: "Guide", text: "Right, if you'd like to follow me, we'll start upstairs in the kitchen." },
      ],
      items: [
        { q: "11. Before the club moved in, the building was", options: ["a school", "a bank", "a library"], answer: "a bank" },
        { q: "12. Most evenings, the club is for young people aged", options: ["11 to 16", "11 to 18", "16 to 18"], answer: "11 to 16" },
        { q: "13. Every member has to", options: ["pay a small monthly fee", "help with one job each month", "come with a parent the first time"], answer: "help with one job each month" },
        { q: "14. On Saturday mornings the club mainly", options: ["runs trips", "holds competitions", "is closed"], answer: "runs trips" },
        { q: "15. This year the club bought", options: ["new computers", "a second table-tennis table", "new kitchen equipment"], answer: "a second table-tennis table" },
        { q: "16. The room straight ahead of the main door", options: ROOMS, answer: "homework help" },
        { q: "17. The big hall on the left", options: ROOMS, answer: "music" },
        { q: "18. The room with the green door, next to the hall", options: ROOMS, answer: "table tennis" },
        { q: "19. The room at the top of the stairs", options: ROOMS, answer: "cooking" },
        { q: "20. The small room with the big window, beside the kitchen", options: ROOMS, answer: "board games" },
      ],
      marksEach: 1,
    },
  ],
  speaking: {
    task: "IELTS Speaking Parts 1 and 2 in trios: the Speaker answers, the Examiner reads the questions word for word and keeps time, the Scorer gives one band per criterion on the HEC rubric. Part 1 about 4 minutes; Part 2: 1 minute to prepare, up to 2 minutes to speak. The teacher fully scores two or three students and rotates.",
    prompts: [
      "Part 1: Do you have a big or a small family?",
      "Part 1: Who are you closest to in your family? Why?",
      "Part 1: Do you prefer to spend free time with friends or with family?",
      "Part 1: How often do you see your friends outside school?",
      "Part 1: Is it easy to make new friends at your age? Why or why not?",
      "Part 2 cue card: Describe a friend or family member you enjoy spending time with. You should say: who this person is, how long you have known them, what you do together, and explain why you enjoy spending time with them.",
    ],
    rubric: [
      {
        criterion: "Fluency & Coherence",
        bands: [
          "Fluent and relaxed; only rare hesitation; ideas are developed fully and logically, with links you hardly notice.",
          "Long answers without effort; pauses are for thinking about ideas, not words; a range of linking words used naturally.",
          "Talks at length and is easy to follow, but sometimes loses the thread or repeats; linkers are there but not always the right one.",
          "Keeps going but slowly, with many pauses, repeats and restarts; the same few linkers (and, but, so) again and again.",
        ],
      },
      {
        criterion: "Lexical Resource",
        bands: [
          "A wide range used precisely and flexibly; idioms and collocations sound natural; very few slips.",
          "Less common words and some idiomatic language, with good collocations; small errors; paraphrases well.",
          "Enough words to talk about the topic at length; some less common words, not always correct; can usually paraphrase.",
          "Enough words for familiar topics but struggles on new ones; paraphrase is hard; mistakes in word choice.",
        ],
      },
      {
        criterion: "Grammar Range & Accuracy",
        bands: [
          "A wide range of structures; most sentences are error-free; only occasional, non-systematic slips.",
          "A range of complex structures used flexibly; most sentences have no mistakes, though some errors remain.",
          "A mix of simple and complex sentences; frequent mistakes in the complex ones, but they rarely stop you understanding.",
          "Short simple sentences mostly correct; longer complex ones are tried but often break down.",
        ],
      },
      {
        criterion: "Pronunciation",
        bands: [
          "Easy to understand throughout; stress, intonation and linking add meaning; an accent is fine.",
          "Easy to understand all the time; good control of stress, rhythm and chunking; the accent does not get in the way.",
          "Generally clear; some stress and intonation used well, but some words are hard to catch.",
          "Mostly understood, but dropped final sounds or wrong word stress make the listener work hard at times.",
        ],
      },
    ],
  },
};
