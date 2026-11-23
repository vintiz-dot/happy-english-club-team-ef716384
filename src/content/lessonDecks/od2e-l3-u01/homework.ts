import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 1
// "Festivals and Fun": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U1Creative: Record<string, Creative> = {
  // Lesson 1: design a festival with the unit's words
  "od2e-l3-u01-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["festival", "fair", "folk dance", "team", "race", "winner", "score"],
      grammar: ["fact and opinion", "I think ... because ...", "There will be ..."],
    },
    base: {
      title: "A festival for our school",
      task: "Imagine your school is going to have its own festival. Design it: give it a name, say when it is, and plan three things that people can do there. Draw a poster for it.",
      steps: [
        "Choose a name and a day for your festival, for example the Spring Fun Fair or the Moon and Lantern Festival.",
        "Plan three things to do there, for example a race, a folk dance show or a team game with a score.",
        "Draw your poster with pictures, the name, the day and the three things.",
        "Write four sentences about it. Write two facts people can check (the day, the place) and two opinions (why it is fun).",
      ],
      frames: [
        "Our festival is called ___. It is on ___.",
        "At the festival, you can ___, ___ and ___.",
        "This is a fact: ___. This is my opinion: I think ___ because ___.",
        "Come with your family and friends, because ___.",
        "The best part will be the ___.",
      ],
      success: [
        "My poster has a name, a day and three things to do.",
        "My writing has two facts and two opinions, and I know which is which.",
        "My writing uses at least three words from our unit.",
      ],
      challenge:
        "Add a team game with rules. Write three rules, say how the winner is chosen and how the score is counted, and explain why you think your game will be fun for children who are not good at sports.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A fan festival for match day",
          task: "Imagine Arsenal is going to have a fan festival outside the Emirates Stadium before a big match. Design it: give it a name, say when it is, and plan three things that fans can do there. Draw a poster for it.",
          steps: [
            "Choose a name and a day for your fan festival, for example the Gunners Family Day.",
            "Plan three things to do there, for example a penalty race, a folk dance show or a team game with a score.",
            "Draw your poster with pictures, the name, the day and the three things.",
            "Write four sentences about it. Write two facts people can check (the day, the place) and two opinions (why it is fun).",
          ],
          frames: [
            "Our fan festival is called ___. It is on ___.",
            "At the festival, fans can ___, ___ and ___.",
            "This is a fact: ___. This is my opinion: I think ___ because ___.",
            "Come with your family and friends, because ___.",
            "The best part will be the ___.",
          ],
          success: [
            "My poster has a name, a day and three things to do.",
            "My writing has two facts and two opinions, and I know which is which.",
            "My writing uses at least three words from our unit.",
          ],
          challenge:
            "Add a team game for fans with rules. Write three rules, say how the winner is chosen and how the score is counted, and explain why you think your game will be fun for fans of every age.",
        },
      },
    ],
  },

  // Lesson 2: evaluate which event is the most fun
  "od2e-l3-u01-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["festival", "fair", "folk dance", "wedding", "family reunion", "race", "team"],
      grammar: ["fact and opinion", "agreeing and disagreeing", "because"],
    },
    base: {
      title: "Which event is the most fun?",
      task: "Judge two events from our reading or from your own life. Decide which one is more fun for children your age, and defend your decision with facts and reasons.",
      steps: [
        "Choose two events, for example a fair and a family reunion.",
        "For each event, write two facts about it (what people do, where, when) and one opinion about it.",
        "Decide which event is more fun and write two reasons. Remember that a reason is not the same as a fact.",
        "Say one thing the other event does better. A fair judge is honest.",
      ],
      frames: [
        "A ___ is an event where people ___.",
        "One fact about it is that ___. In my opinion, it is ___.",
        "I think the ___ is more fun than the ___ because ___ and ___.",
        "The ___ is great, too, but ___.",
        "Some people may disagree, because ___.",
      ],
      success: [
        "My writing names two events and gives two facts about each.",
        "My writing says what is an opinion and gives two reasons for my decision.",
        "My writing says one good thing about the other event.",
      ],
      challenge:
        "Interview three people (family or friends) and ask which of your two events they think is more fun. Write the numbers, then say if your decision matches theirs and why people might choose differently.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which match-day event is the most fun?",
          task: "Judge two events around a match at the Emirates Stadium, for example the fan parade and the match itself. Decide which one is more fun for children your age, and defend your decision with facts and reasons.",
          steps: [
            "Choose two match-day events, for example the fan parade and the match.",
            "For each event, write two facts about it (what fans do, where, when) and one opinion about it.",
            "Decide which event is more fun and write two reasons. Remember that a reason is not the same as a fact.",
            "Say one thing the other event does better. A fair judge is honest.",
          ],
          frames: [
            "A ___ is an event where fans ___.",
            "One fact about it is that ___. In my opinion, it is ___.",
            "I think the ___ is more fun than the ___ because ___ and ___.",
            "The ___ is great, too, but ___.",
            "Some fans may disagree, because ___.",
          ],
          success: [
            "My writing names two events and gives two facts about each.",
            "My writing says what is an opinion and gives two reasons for my decision.",
            "My writing says one good thing about the other event.",
          ],
          challenge:
            "Ask three people (family or friends) which of your two events they think is more fun. Write the numbers, then say if your decision matches theirs and why fans might choose differently.",
        },
      },
    ],
  },

  // Lesson 3: create a comic with -ed and -ing adjectives
  "od2e-l3-u01-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["fair", "race", "team", "player", "winner", "score"],
      grammar: ["adjectives with -ed (how I feel)", "adjectives with -ing (what it is like)", "because"],
    },
    base: {
      title: "A day at the fair: my feelings comic",
      task: "Make a four-box comic about a day at a fair or a sports day. In every box, one character says how they feel with an -ed adjective, and the narrator says what the thing is like with an -ing adjective.",
      steps: [
        "Plan four moments in your day, for example arriving, a game, a race and going home.",
        "Draw each moment in one box and give the character a face that shows the feeling.",
        "Under each box write two sentences: one with an -ed adjective and one with an -ing adjective, for example I felt ___. The ___ was ___.",
        "Add a because in at least two boxes to say why you felt that way.",
      ],
      frames: [
        "I was ___ because the ___ was ___.",
        "The race / game / show was ___, so I felt ___.",
        "My friend was ___ about the ___.",
        "In the end, I felt ___. It was a ___ day.",
        "Everybody was ___ when the ___ began.",
      ],
      success: [
        "My comic has four boxes, and each box shows a feeling.",
        "My writing uses -ed adjectives for how a person feels and -ing adjectives for what a thing is like.",
        "My writing uses because to give at least two reasons.",
      ],
      challenge:
        "Write a fifth box with a surprise. Use one pair of adjectives from the same word (for example bored and boring, or tired and tiring) and explain the difference in two sentences.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match day: my feelings comic",
          task: "Make a four-box comic about a day at a football match, for example a match at the Emirates Stadium. In every box, one character says how they feel with an -ed adjective, and the narrator says what the thing is like with an -ing adjective.",
          steps: [
            "Plan four moments in your match day, for example arriving, the kick-off, a goal and going home.",
            "Draw each moment in one box and give the character a face that shows the feeling.",
            "Under each box write two sentences: one with an -ed adjective and one with an -ing adjective, for example I felt ___. The ___ was ___.",
            "Add a because in at least two boxes to say why you felt that way.",
          ],
          frames: [
            "I was ___ because the ___ was ___.",
            "The match / game / show was ___, so I felt ___.",
            "My friend was ___ about the ___.",
            "In the end, I felt ___. It was a ___ day.",
            "Every fan was ___ when the ___ began.",
          ],
          success: [
            "My comic has four boxes, and each box shows a feeling.",
            "My writing uses -ed adjectives for how a person feels and -ing adjectives for what a thing is like.",
            "My writing uses because to give at least two reasons.",
          ],
          challenge:
            "Write a fifth box with a surprise, for example the score changes at the end. Use one pair of adjectives from the same word (for example bored and boring, or tired and tiring) and explain the difference in two sentences.",
        },
      },
    ],
  },

  // Lesson 4: compare two events and justify, with time words and the past simple
  "od2e-l3-u01-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["festival", "wedding", "family reunion", "fair", "race", "team"],
      grammar: ["time words with the past simple", "the same / different", "-ed and -ing adjectives"],
    },
    base: {
      title: "Two special days",
      task: "Remember two special days in your life, for example a family party and a school sports day. Compare them, then say which one you would like to repeat and why.",
      steps: [
        "Draw a timeline for each day with three times (for example in the morning, after lunch, last night) and one thing you did at each time.",
        "Write three sentences about how the two days were the same and three about how they were different. Use time words and the past simple.",
        "Say how you felt on each day with one -ed adjective, and what each day was like with one -ing adjective.",
        "Choose the day you would like to repeat and give two reasons.",
      ],
      frames: [
        "Last ___, I went to ___. In the morning, I ___.",
        "On both days, I ___, but on the first day I ___.",
        "The first day was ___, and I felt ___.",
        "The second day was different because ___.",
        "I would like to have the ___ day again because ___ and ___.",
      ],
      success: [
        "My writing uses at least four time words with past simple verbs.",
        "My writing says how the days were the same and how they were different.",
        "My writing gives two reasons for my choice and uses an -ed and an -ing adjective correctly.",
      ],
      challenge:
        "Add a third day from the future: write what you will do on your dream special day. Use will, and then compare it with one of the days from the past.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two match days",
          task: "Remember (or imagine) two football days, for example one sunny day at a match and one day when you played football with friends. Compare them, then say which one you would like to repeat and why.",
          steps: [
            "Draw a timeline for each day with three times (for example in the morning, after lunch, last night) and one thing you did at each time.",
            "Write three sentences about how the two days were the same and three about how they were different. Use time words and the past simple.",
            "Say how you felt on each day with one -ed adjective, and what each day was like with one -ing adjective.",
            "Choose the day you would like to repeat and give two reasons.",
          ],
          frames: [
            "Last ___, I went to ___. In the morning, I ___.",
            "On both days, I ___, but on the first day I ___.",
            "The first match day was ___, and I felt ___.",
            "The second day was different because ___.",
            "I would like to have the ___ day again because ___ and ___.",
          ],
          success: [
            "My writing uses at least four time words with past simple verbs.",
            "My writing says how the days were the same and how they were different.",
            "My writing gives two reasons for my choice and uses an -ed and an -ing adjective correctly.",
          ],
          challenge:
            "Add a third day from the future: write what you will do on your dream match day at the Emirates Stadium. Use will, and then compare it with one of the days from the past.",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): review an event with -ed and -ing, and say why people feel differently
  "od2e-l3-u01-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["festival", "fair", "race", "team", "winner", "score", "player"],
      grammar: ["-ed adjectives", "-ing adjectives", "because / so"],
    },
    base: {
      title: "The fun review",
      task: "Write a review of a fun event, real or imagined, for a class newspaper. Say what it was like, how you felt, give it a score out of five and say who else would enjoy it.",
      steps: [
        "Choose an event: a festival, a fair, a race, a family party or a match. Draw a small picture of it.",
        "Write three sentences about what the event was like. Use an -ing adjective in each one.",
        "Write two sentences about how you felt. Use an -ed adjective in each one, and join one with because and one with so.",
        "Give the event a score out of five and say why. Then say who would enjoy it more than you, and who might not, with a reason.",
      ],
      frames: [
        "The ___ was ___ and ___.",
        "I felt ___ because the ___ was ___.",
        "The ___ was ___, so I felt ___.",
        "I give it ___ out of five because ___.",
        "My ___ would enjoy it, but my ___ might not, because ___.",
      ],
      success: [
        "My writing uses -ing words for the event and -ed words for how I felt.",
        "My writing uses because and so correctly.",
        "My writing says that different people might feel differently, and why.",
      ],
      challenge:
        "Write a second review of the same event from another person's point of view. Use a different score, change the -ed words, and explain why the two reviews are different.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The match day review",
          task: "Write a review of a football match day at the Emirates Stadium, real or imagined, for a class newspaper. Say what it was like, how you felt, give it a score out of five and say who else would enjoy it.",
          steps: [
            "Choose a match day: a big match, a training day or a school game. Draw a small picture of it.",
            "Write three sentences about what the match day was like. Use an -ing adjective in each one.",
            "Write two sentences about how you felt. Use an -ed adjective in each one, and join one with because and one with so.",
            "Give the match day a score out of five and say why. Then say who would enjoy it more than you, and who might not, with a reason.",
          ],
          frames: [
            "The match was ___ and ___.",
            "I felt ___ because the ___ was ___.",
            "The ___ was ___, so I felt ___.",
            "I give it ___ out of five because ___.",
            "My ___ would enjoy it, but my ___ might not, because ___.",
          ],
          success: [
            "My writing uses -ing words for the match day and -ed words for how I felt.",
            "My writing uses because and so correctly.",
            "My writing says that different fans might feel differently, and why.",
          ],
          challenge:
            "Write a second review of the same match day from another fan's point of view. Use a different score, change the -ed words, and explain why the two reviews are different.",
        },
      },
    ],
  },
};
