// Reach Higher 3B, Unit 8 (Journeys and Goals): printable grammar worksheets in
// three levels with answer keys. The school's own writing. Each follows the exact
// title of the grammar slide it belongs to.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U8Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u8-ws-advice",
    title: "Giving advice: should, ought to, had better, If I were you",
    grammar: "should / ought to / had better / If I were you",
    deckId: "rh-l3-u8-l1",
    slide: "Giving advice: should, ought to, had better, If I were you",
    intro:
      "Should and ought to give advice: You should practise every day. You ought to ask for help. Had better is a strong warning: You'd better start now, or you will miss the deadline. If I were you, I'd + verb is a friendly way to advise: If I were you, I'd train with a friend.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "You ___ practise every day. (should / should to)  ->  should",
        items: [
          { q: "You ___ drink more water.", options: ["should", "should to"], answer: "should" },
          { q: "You ought ___ ask your coach.", options: ["to", "-"], answer: "to" },
          { q: "You'd better ___ now.", options: ["start", "to start"], answer: "start" },
          { q: "If I ___ you, I'd train every morning.", options: ["were", "am"], answer: "were" },
          { q: "If I were you, I ___ ask for help.", options: ["would", "will"], answer: "would" },
          { q: "Which is the strongest warning?", options: ["You'd better finish today.", "You could finish today."], answer: "You'd better finish today." },
          { q: "You ___ not give up so soon.", options: ["should", "ought"], answer: "should" },
          { q: "I think you ___ to set a smaller goal first.", options: ["ought", "should"], answer: "ought" },
        ],
      },
      {
        level: "Core",
        instructions: "Complete with the verb in brackets and the advice form shown, or rewrite with If I were you.",
        example: "(should) You ___ (sleep) early.  ->  should sleep",
        items: [
          { q: "(should) You ___ (practise) a little every day.", answer: "should practise" },
          { q: "(ought to) You ___ (ask) a teacher about the problem.", answer: "ought to ask" },
          { q: "(had better) You ___ (hurry), or you will miss the bus.", answer: "had better hurry / 'd better hurry" },
          { q: "(should not) You ___ (compare) yourself with everyone.", answer: "should not compare" },
          { q: "Rewrite with If I were you: You should join a club.", answer: "If I were you, I'd join a club." },
          { q: "Rewrite with If I were you: You should not wait.", answer: "If I were you, I wouldn't wait." },
          { q: "Rewrite with If I were you: You ought to ask your coach.", answer: "If I were you, I'd ask my coach. / I'd ask your coach." },
          { q: "(had better not) You ___ (forget) your homework.", answer: "had better not forget" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Give advice with a reason.",
        example: "If I was you, I'd go.  ->  If I were you, I'd go.",
        items: [
          { q: "Correct the mistake: You had better to start early.", answer: "You had better start early." },
          { q: "Correct the mistake: If I am you, I would ask my teacher.", answer: "If I were you, I would ask my teacher." },
          { q: "Correct the mistake: You ought practise more.", answer: "You ought to practise more." },
          { q: "A friend wants to run a 5 km race. Write advice with should.", answer: "e.g. You should train three times a week." },
          { q: "A friend is afraid of an exam. Write advice with If I were you.", answer: "e.g. If I were you, I'd make a plan and revise a little every day." },
          { q: "Write one strong warning with had better and the bad result.", answer: "e.g. You'd better prepare tonight, or you will be tired tomorrow." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u8-ws-perfect-past",
    title: "Present perfect or past simple?",
    grammar: "present perfect vs past simple",
    deckId: "rh-l3-u8-l2",
    slide: "Present perfect or past simple? Achievements",
    intro:
      "Use the present perfect (have / has + past participle) for something that connects to now, with no finished time: I have learned to swim. Use the past simple for a finished time: I learned to swim in 2022. Time words: ever, never, already, yet, just, since, for go with the present perfect; yesterday, last year, in 2022, ago go with the past simple.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "I ___ my homework. Now I can play.  (have finished / finished yesterday)  ->  have finished",
        items: [
          { q: "She ___ a marathon last year.", options: ["ran", "has run"], answer: "ran" },
          { q: "I ___ never climbed a mountain.", options: ["have", "did"], answer: "have" },
          { q: "We ___ the project yesterday.", options: ["finished", "have finished"], answer: "finished" },
          { q: "He has already ___ his goal.", options: ["reached", "reach"], answer: "reached" },
          { q: "They ___ in Da Nang in 2019.", options: ["lived", "have lived"], answer: "lived" },
          { q: "Have you ___ seen the sea?", options: ["ever", "ago"], answer: "ever" },
          { q: "She has played the piano ___ she was six.", options: ["since", "for"], answer: "since" },
          { q: "I have not finished ___.", options: ["yet", "last week"], answer: "yet" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the present perfect or the past simple.",
        example: "I (win) ___ a prize in 2021.  ->  won",
        items: [
          { q: "I (learn) ___ to ride a bike when I was six.", answer: "learned / learnt" },
          { q: "She (already / read) ___ thirty books this year.", answer: "has already read" },
          { q: "We (not / finish) ___ the climb yet.", answer: "have not finished" },
          { q: "He (score) ___ a goal in the match yesterday.", answer: "scored" },
          { q: "(you / ever / win) ___ a prize?", answer: "Have you ever won" },
          { q: "My sister (live) ___ in Hanoi for ten years.", answer: "has lived" },
          { q: "They (reach) ___ the top two hours ago.", answer: "reached" },
          { q: "I (never / be) ___ on a plane.", answer: "have never been" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Check the time words.",
        example: "I have seen him yesterday.  ->  I saw him yesterday.",
        items: [
          { q: "Correct the mistake: I have finished the race in 2023.", answer: "I finished the race in 2023." },
          { q: "Correct the mistake: Did you ever try this food?", answer: "Have you ever tried this food?" },
          { q: "Correct the mistake: She lives here since 2020.", answer: "She has lived here since 2020." },
          { q: "Write one sentence about something you have achieved, with no finished time.", answer: "e.g. I have learned to swim." },
          { q: "Now write a second sentence giving the finished time and how it happened.", answer: "e.g. I learned in 2022 at the city pool." },
          { q: "Explain in one sentence why 'I have read it last week' is wrong.", answer: "Last week is a finished time, so the past simple is needed: I read it last week." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u8-ws-wishes",
    title: "Wishes, imagined situations and unless",
    grammar: "wish + past simple; second conditional; unless",
    deckId: "rh-l3-u8-l6",
    slide: "Wishes, imagined situations and unless",
    intro:
      "Wish + past simple talks about something we would like to be different now: I wish I had more time. Second conditional: if + past simple, would + verb for an unreal situation: If I had a bike, I would ride to school. Unless means if not: Unless you train, you won't finish (= If you don't train, you won't finish).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "I wish I ___ taller.  (were / am)  ->  were",
        items: [
          { q: "I wish I ___ more free time.", options: ["had", "have"], answer: "had" },
          { q: "If I had a bike, I ___ ride to school.", options: ["would", "will"], answer: "would" },
          { q: "If she ___ harder, she would pass.", options: ["studied", "studies"], answer: "studied" },
          { q: "Unless you hurry, you ___ miss the start.", options: ["will", "would"], answer: "will" },
          { q: "I wish I ___ swim faster.", options: ["could", "can"], answer: "could" },
          { q: "Unless it rains means ___.", options: ["if it does not rain", "if it rains"], answer: "if it does not rain" },
          { q: "If I ___ you, I would stay.", options: ["were", "am"], answer: "were" },
          { q: "He wishes he ___ a car.", options: ["had", "has"], answer: "had" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the correct form, or rewrite with unless.",
        example: "If I (have) ___ a million dong, I would buy a bike.  ->  had",
        items: [
          { q: "I wish I (be) ___ better at maths.", answer: "were / was" },
          { q: "If I (win) ___ the race, I would be very happy.", answer: "won" },
          { q: "If we (have) ___ more time, we would visit the cave.", answer: "had" },
          { q: "She would be fitter if she (exercise) ___ more.", answer: "exercised" },
          { q: "Rewrite with unless: If you don't practise, you won't improve.", answer: "Unless you practise, you won't improve." },
          { q: "Rewrite with unless: If it doesn't rain, we'll go to the park.", answer: "Unless it rains, we'll go to the park." },
          { q: "I wish I (can) ___ speak three languages.", answer: "could" },
          { q: "What (you / do) ___ if you could go anywhere in the world?", answer: "would you do" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Check the tenses after if, wish and unless.",
        example: "If I will have time, I would help.  ->  If I had time, I would help.",
        items: [
          { q: "Correct the mistake: If I would have a dog, I would walk it every day.", answer: "If I had a dog, I would walk it every day." },
          { q: "Correct the mistake: Unless you don't hurry, you will be late.", answer: "Unless you hurry, you will be late." },
          { q: "Correct the mistake: I wish I have a bigger garden.", answer: "I wish I had a bigger garden." },
          { q: "Write one wish about your training or studying.", answer: "e.g. I wish I could run for an hour without stopping." },
          { q: "Write a second conditional sentence about an imagined journey.", answer: "e.g. If I could travel anywhere, I would climb Fansipan." },
          { q: "Write a sentence with unless about reaching a goal.", answer: "e.g. Unless I practise every day, I won't reach my goal." },
        ],
      },
    ],
  },
];
