import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 7
// "Time and the Earth": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U7Creative: Record<string, Creative> = {
  // Lesson 1: design a new way to measure time
  "od2e-l3-u07-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["second", "minute", "hour", "noon", "time zone", "spin", "orbit"],
      grammar: ["It measures + time word", "because", "It takes ___ to ..."],
    },
    base: {
      title: "A clock nobody has seen before",
      task: "Invent a new way to measure time. It can use sand, water, a plant, a shadow, a candle or anything you can imagine. Draw it, label it and explain how it works.",
      steps: [
        "Choose what your clock uses: sand, water, light, a shadow, a plant or something of your own.",
        "Draw your clock and label two or three parts.",
        "Decide what it measures: seconds, minutes or hours. Write how long it takes for one 'tick' or one 'turn'.",
        "Write three sentences to explain how it works and why it is a good way to measure time.",
      ],
      frames: [
        "My clock uses ___ to measure ___.",
        "It has a ___ and a ___.",
        "It takes ___ for the ___ to ___.",
        "It is accurate because ___.",
        "People could use it when they ___.",
      ],
      success: [
        "My drawing has labels, and at least one label is a word from our unit.",
        "My writing says what my clock measures and how long one turn takes.",
        "My writing explains why it works, with because.",
      ],
      challenge:
        "Say one problem with your clock (for example, it does not work in the dark or when it rains) and add a second part that fixes it. Explain how the new part helps.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match clock for the stadium",
          task: "Invent a new kind of clock for the Emirates Stadium that shows how many minutes are left in a match. Draw it, label it and explain how it works so that every Arsenal fan can read it.",
          steps: [
            "Choose what your match clock uses: a giant sand timer, a glowing screen, a line of lights or something of your own.",
            "Draw your clock and label two or three parts.",
            "Decide what it shows: minutes, seconds or both. Write how long a match lasts and how your clock shows it.",
            "Write three sentences to explain how it works and why fans and players can trust it.",
          ],
          frames: [
            "My clock uses ___ to show ___.",
            "It has a ___ and a ___.",
            "A match lasts ___ minutes, so ___.",
            "It is accurate because ___.",
            "Fans at the back of the stadium can ___.",
          ],
          success: [
            "My drawing has labels, and at least one label is a word from our unit.",
            "My writing says what the clock shows and how it counts the match time.",
            "My writing explains why it works, with because.",
          ],
          challenge:
            "Say one problem with your clock on a big match day (for example, fans cannot see it from far away) and add a second part that fixes it. Explain how the new part helps.",
        },
      },
    ],
  },

  // Lesson 2: evaluate ways of telling time
  "od2e-l3-u07-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["hour", "minute", "year", "noon", "axis", "accurate", "opposite", "time zone"],
      grammar: ["present simple to explain how it works", "because", "more ___ than"],
    },
    base: {
      title: "The best way to tell the time",
      task: "There are many ways to tell the time: a clock, a phone, a sundial, an hourglass and a calendar. Judge two of them and decide which is better for people today. Write your decision and defend it with evidence.",
      steps: [
        "Choose two ways of telling time. Write one thing each one does well.",
        "Write one problem for each. Think about night, rain, a power cut and being very small to carry.",
        "Decide which is better for people today and give two reasons.",
        "Think of one person for whom the other way is better, and say why.",
      ],
      frames: [
        "A ___ tells the time by ___.",
        "It is good because ___.",
        "The problem with it is ___.",
        "I think a ___ is better for people today because ___ and ___.",
        "But a ___ is better for ___ because ___.",
      ],
      success: [
        "My writing names two ways of telling time and says how each works.",
        "My writing gives at least two reasons for my decision, joined with because or so.",
        "My writing shows that I can see a good point about the other way.",
      ],
      challenge:
        "Add a third way and give all three a score out of 10 for being accurate, easy to read and easy to carry. Explain the lowest score and say who might disagree with you.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which timekeeper should the referee use?",
          task: "A referee at the Emirates Stadium must know exactly how many minutes have been played. Judge two timekeepers, for example a sports watch and the big stadium clock, and decide which one the referee should trust. Defend your decision with evidence.",
          steps: [
            "Choose two timekeepers: a sports watch, a stadium clock, a stopwatch or a phone.",
            "Write one thing each one does well on a busy match day.",
            "Write one problem for each. Think about noise, rain and the need to stop and start the time.",
            "Decide which one the referee should trust and give two reasons.",
          ],
          frames: [
            "A ___ shows the time by ___.",
            "It is good because ___.",
            "The problem with it is ___.",
            "I think the referee should use the ___ because ___ and ___.",
            "But a ___ is better for ___ because ___.",
          ],
          success: [
            "My writing names two timekeepers and says how each works.",
            "My writing gives at least two reasons for my decision, joined with because or so.",
            "My writing shows that I can see a good point about the other timekeeper.",
          ],
          challenge:
            "Add a third timekeeper and give all three a score out of 10 for being accurate, easy to see and easy to stop and start. Explain the lowest score and say who might disagree with you.",
        },
      },
    ],
  },

  // Lesson 3: create future facts and guesses with will
  "od2e-l3-u07-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["hour", "minute", "month", "year", "noon", "multiply", "time zone"],
      grammar: ["will + base verb", "won't", "In ___ hours, it will be ...", "I think it will ..."],
    },
    base: {
      title: "A time capsule note",
      task: "Write a note for a time capsule that people will open in one year. Tell the readers what will happen, what you are sure about and what you only think.",
      steps: [
        "Write three future facts you are sure about (use will or won't), for example about the calendar or the clock.",
        "Write three guesses about your life in one year (use 'I think ... will ...').",
        "Add one sentence that says what the world will be like for the person who opens the capsule.",
        "Read your note to a partner. Can your partner tell which sentences are facts and which are guesses?",
      ],
      frames: [
        "In one year, it will be ___.",
        "The sun will rise at ___ and set at ___.",
        "I think I will ___ because ___.",
        "I won't ___ any more because ___.",
        "When you read this, you will ___.",
      ],
      success: [
        "My writing has at least three future facts with will or won't.",
        "My writing has will + the plain verb every time, with be where it is needed.",
        "My writing shows the difference between a sure fact and a guess.",
      ],
      challenge:
        "Add a short question for the reader to answer in a year: 'Will you still ...?' Then write the answer you think they will give, with Yes, I will or No, I won't.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A matchday time capsule",
          task: "Write a note for a time capsule that the Emirates Stadium will open in one year. Tell the readers what will happen on match day, what you are sure about and what you only think.",
          steps: [
            "Write three future facts you are sure about (use will or won't), for example about kick-off time or the length of a match.",
            "Write three guesses about Arsenal in one year (use 'I think ... will ...').",
            "Add one sentence that says what the stadium will be like for the person who opens the capsule.",
            "Read your note to a partner. Can your partner tell which sentences are facts and which are guesses?",
          ],
          frames: [
            "In one hour, the match will ___.",
            "The match will start at ___ and end at ___.",
            "I think Arsenal will ___ because ___.",
            "The fans won't ___ because ___.",
            "When you read this, the stadium will ___.",
          ],
          success: [
            "My writing has at least three future facts with will or won't.",
            "My writing has will + the plain verb every time, with be where it is needed.",
            "My writing shows the difference between a sure fact and a guess.",
          ],
          challenge:
            "Add a short question for the reader to answer in a year: 'Will you still ...?' Then write the answer you think they will give, with Yes, I will or No, I won't.",
        },
      },
    ],
  },

  // Lesson 4: compare two trips and justify a choice
  "od2e-l3-u07-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["time zone", "noon", "hour", "preparation", "celebration", "suggestion"],
      grammar: ["will / won't for future facts", "the with country names", "because"],
    },
    base: {
      title: "Which trip should we take?",
      task: "Your family can take one trip next year, to a country in a different time zone. Compare two trips, then choose one and justify your choice to your family.",
      steps: [
        "Choose two countries or cities. With a grown-up, find the time difference and how long each trip will take.",
        "Write two sentences about how the trips are the same and two about how they are different (time, weather, daylight).",
        "Choose one trip and give two reasons. Use will at least twice.",
        "Say what the other trip is better for, and for whom.",
      ],
      frames: [
        "___ is ___ hours ahead of / behind Hanoi.",
        "The trip to ___ will take ___, but the trip to ___ will take ___.",
        "In ___, it will be ___ when it is ___ in Hanoi.",
        "I suggest the trip to ___ because ___ and ___.",
        "The trip to ___ is better for ___ because ___.",
      ],
      success: [
        "My writing uses will or won't at least twice and the with a country name that needs it.",
        "My writing says how the two trips are the same and how they are different.",
        "My writing gives two reasons for the choice and thinks about another person.",
      ],
      challenge:
        "Add a third trip and say which of the three is best for someone who gets tired on a long journey. Explain how the time difference will change what they do on the first day.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which friendly match should Arsenal play?",
          task: "Arsenal can play one friendly match abroad next summer, in a country in a different time zone. Compare two trips, then choose one and justify your suggestion to the club.",
          steps: [
            "Choose two countries or cities. With a grown-up, find the time difference and how long each trip will take from London.",
            "Write two sentences about how the trips are the same and two about how they are different (time, weather, daylight).",
            "Choose one trip and give two reasons. Use will at least twice.",
            "Say what the other trip is better for, and for whom.",
          ],
          frames: [
            "___ is ___ hours ahead of London.",
            "The trip to ___ will take ___, but the trip to ___ will take ___.",
            "In ___, kick-off will be at ___ when it is ___ in London.",
            "I suggest the trip to ___ because ___ and ___.",
            "The trip to ___ is better for ___ because ___.",
          ],
          success: [
            "My writing uses will or won't at least twice and the with a country name that needs it.",
            "My writing says how the two trips are the same and how they are different.",
            "My writing gives two reasons for the choice and thinks about the players or the fans.",
          ],
          challenge:
            "Add a third trip and say which of the three is best for the players after a long journey. Explain how the time difference will change what the team does on the first day.",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): a made-up planet with a short day
  "od2e-l3-u07-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["hour", "minute", "noon", "spin", "orbit", "time zone"],
      grammar: ["will / won't for future facts", "In ___ hours, it will be ...", "because and so"],
    },
    base: {
      title: "Tomorrow on Planet Tick",
      task: "Invent a planet where one day lasts only ten hours. Make a poster for the people who live there that tells what will happen tomorrow, hour by hour, and explains how the planet's clock works.",
      steps: [
        "Draw your planet and its clock. Label the clock, and decide when it is noon on your planet.",
        "Write a timetable for tomorrow with four times, for example: In two hours, it will be ___ o'clock.",
        "Write what the people will do at each time, and one thing that won't happen.",
        "Write two sentences that say why: one with because and one with so.",
      ],
      frames: [
        "On Planet Tick, one day is only ___ hours long.",
        "In ___ hours, it will be ___ o'clock.",
        "At noon, the people will ___.",
        "It won't be ___ until ___.",
        "The clock works like this because the planet will ___.",
      ],
      success: [
        "I use will and won't with the plain verb, and be after a time.",
        "My poster has at least four times, with one sentence for each.",
        "My writing explains why with because and what happens next with so.",
      ],
      challenge:
        "Add a second planet in a different time zone. Write what time it will be there when it is noon on Planet Tick, and one thing the people on the two planets will do together.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match Day on Planet Tick",
          task: "Invent a planet where one day lasts only ten hours, and plan a football match there. Make a poster for the fans that tells what will happen on match day, hour by hour, and says when the whistle will blow.",
          steps: [
            "Draw your stadium and its giant clock. Label the clock, and decide when it is noon on your planet.",
            "Write a timetable for match day with four times, for example: In two hours, it will be ___ o'clock.",
            "Write what the fans and the players will do at each time, and one thing that won't happen.",
            "Write two sentences that say why: one with because and one with so.",
          ],
          frames: [
            "On Planet Tick, one day is only ___ hours long.",
            "In ___ hours, it will be ___ o'clock.",
            "At kick-off, the fans will ___.",
            "The players won't ___ until ___.",
            "The match will finish early because the day will ___.",
          ],
          success: [
            "I use will and won't with the plain verb, and be after a time.",
            "My poster has at least four times, with one sentence for each.",
            "My writing explains why with because and what happens next with so.",
          ],
          challenge:
            "Add a second stadium in a different time zone. Write what time it will be there when the whistle blows on Planet Tick, and what the fans in both places will do after the match.",
        },
      },
    ],
  },
};
