import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 8
// "Travel and Time Zones": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U8Creative: Record<string, Creative> = {
  // Lesson 1: design a pack for a trip (travel and sickness words)
  "od2e-l3-u08-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["airport", "passenger", "passport", "destination", "medicine", "fever", "headache", "doctor"],
      grammar: ["problem and solution", "because and so"],
    },
    base: {
      title: "The Just-in-Case Travel Pack",
      task: "Design a small pack for a passenger on a long trip. It must hold five things that solve five different problems on the way to the destination.",
      steps: [
        "Draw your pack and the five things inside. Label each one.",
        "For each thing, write the problem it solves, for example 'a headache' or 'a lost passport'.",
        "Write three sentences about the journey: where the passenger starts, the airport and the destination.",
        "Finish with one sentence that says which of the five things is the most important and why.",
      ],
      frames: [
        "My pack is for a passenger who is going to ___.",
        "The ___ solves the problem of ___.",
        "If the passenger gets a fever or a headache, the ___ will help because ___.",
        "At the airport, the passenger must show the ___.",
        "The most important thing is the ___ because ___.",
      ],
      success: [
        "I name five things and the problem each one solves.",
        "I use at least five of our travel and sickness words correctly.",
        "My last sentence gives a reason with because.",
      ],
      challenge:
        "Add a second pack for a passenger who is going to a place with a very different climate, and explain which two things you would change and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Away-Match Travel Pack",
          task: "Design a small pack for an Arsenal fan who is traveling to an away match in another country. It must hold five things that solve five different problems on the way to the stadium.",
          steps: [
            "Draw your pack and the five things inside. Label each one.",
            "For each thing, write the problem it solves, for example 'a headache' or 'a lost passport'.",
            "Write three sentences about the journey: where the fan starts, the airport and the destination.",
            "Finish with one sentence that says which of the five things is the most important and why.",
          ],
          frames: [
            "My pack is for a Gunners fan who is going to ___.",
            "The ___ solves the problem of ___.",
            "If the fan gets a fever or a headache, the ___ will help because ___.",
            "At the airport, the fan must show the ___.",
            "The most important thing is the ___ because ___.",
          ],
          success: [
            "I name five things and the problem each one solves.",
            "I use at least five of our travel and sickness words correctly.",
            "My last sentence gives a reason with because.",
          ],
          challenge:
            "Add a second pack for a fan who is going to a match in a very cold place, and explain which two things you would change and why.",
        },
      },
    ],
  },

  // Lesson 2: evaluate Molly's solutions
  "od2e-l3-u08-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["problem", "solution", "sick", "medicine", "earache", "washcloth", "tissues", "forehead"],
      grammar: ["past simple to retell", "because and so", "first, next, then"],
    },
    base: {
      title: "Was Molly a good doctor?",
      task: "Judge how well Molly solved the problems in the story. Give her a score out of 5 and explain it with reasons from the story and from your own life.",
      steps: [
        "Write your score out of 5 for how good Molly was at solving problems.",
        "Retell two problems and the solutions, in the past tense, with first, next and then.",
        "Give two reasons for your score. One reason must come from the story.",
        "Say one more thing Molly could have done to help.",
      ],
      frames: [
        "I give Molly ___ out of 5.",
        "First, there was a problem: ___. Then Molly ___.",
        "It was a good solution because ___.",
        "In real life, when someone at home is sick, we can ___, so ___.",
        "It would be even better if Molly had ___.",
      ],
      success: [
        "My score is clear and I give at least two reasons.",
        "My retelling uses the past tense and time words.",
        "I name the problem and the solution each time.",
      ],
      challenge:
        "Write the other side too: one reason someone could give a lower score. Answer it with a sentence that begins 'However, ...'.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Was the team doctor right?",
          task: "Imagine a Gunners player feels sick before a big match at the Emirates Stadium and the team doctor makes a plan. Judge the plan, then compare it with how Molly solved her problems.",
          steps: [
            "Write your score out of 5 for the team doctor's plan.",
            "Retell the problem and the solution, in the past tense, with first, next and then.",
            "Give two reasons for your score. One reason must be about Molly's story.",
            "Say one more thing the team doctor could have done.",
          ],
          frames: [
            "I give the team doctor's plan ___ out of 5.",
            "First, the player had a problem: ___. Then the doctor ___.",
            "It was a good solution because ___.",
            "Molly also ___, so ___.",
            "It would be even better if the doctor had ___.",
          ],
          success: [
            "My score is clear and I give at least two reasons.",
            "My retelling uses the past tense and time words.",
            "I name the problem and the solution each time.",
          ],
          challenge:
            "Write the other side too: one reason someone could give a lower score. Answer it with a sentence that begins 'However, ...'.",
        },
      },
    ],
  },

  // Lesson 3: compare two plans with going to and justify the choice
  "od2e-l3-u08-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["destination", "airport", "passenger", "doctor", "medicine"],
      grammar: ["going to for plans", "will for quick decisions", "first, next, then"],
    },
    base: {
      title: "Two Weekend Plans",
      task: "Write two different plans for a weekend and decide which one you are going to do. Use going to for the plans and explain your choice.",
      steps: [
        "Write Plan A and Plan B. Each has three things you are going to do, in order.",
        "Write one sentence that compares the two plans, for example which one is quieter or busier.",
        "Say which plan you are going to choose and give two reasons.",
        "Add one quick decision with will, for example if the weather changes.",
      ],
      frames: [
        "Plan A: First, I'm going to ___. Next, I'm going to ___. Then I'm going to ___.",
        "Plan B: On Saturday, I'm going to ___, and on Sunday I'm going to ___.",
        "Plan A is more ___ than Plan B.",
        "I'm going to choose Plan ___ because ___ and ___.",
        "If it rains, I'll ___.",
      ],
      success: [
        "I use going to correctly with am, is or are and a base verb.",
        "I give two reasons for my choice with because.",
        "I use will for one quick decision.",
      ],
      challenge:
        "Write the plan for a friend or family member too, with he's going to or she's going to, and say how it is different from your plan.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two Match-Day Plans",
          task: "Write two different plans for a match day at the Emirates Stadium and decide which one you are going to do. Use going to for the plans and explain your choice.",
          steps: [
            "Write Plan A and Plan B. Each has three things you are going to do, in order.",
            "Write one sentence that compares the two plans, for example which one is quieter or busier.",
            "Say which plan you are going to choose and give two reasons.",
            "Add one quick decision with will, for example if the weather changes.",
          ],
          frames: [
            "Plan A: First, I'm going to ___. Next, I'm going to ___. Then I'm going to ___.",
            "Plan B: Before the match, I'm going to ___, and after the match I'm going to ___.",
            "Plan A is more ___ than Plan B.",
            "I'm going to choose Plan ___ because ___ and ___.",
            "If it rains, I'll ___.",
          ],
          success: [
            "I use going to correctly with am, is or are and a base verb.",
            "I give two reasons for my choice with because.",
            "I use will for one quick decision.",
          ],
          challenge:
            "Write the plan for a friend who is going to the match with you, with he's going to or she's going to, and say how it is different from your plan.",
        },
      },
    ],
  },

  // Lesson 4: argue for the best way to travel
  "od2e-l3-u08-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["airport", "passenger", "destination", "passport"],
      grammar: ["contractions (I'm, she's, we'll)", "capital letters for cities and countries", "going to"],
    },
    base: {
      title: "The Best Way to Travel",
      task: "Argue which is the best way to travel from your city to a place far away: by plane, by bus or by train. Say how long the trip will take and answer one person who disagrees.",
      steps: [
        "Choose a destination in another city or country and one way to travel. Write its name with capital letters.",
        "Write when you are going to leave and how long the trip will take.",
        "Write two reasons why this way is best. Use contractions, as if you are talking to a friend.",
        "Write what someone who disagrees might say, and answer them.",
      ],
      frames: [
        "I'm going to travel from ___ to ___ by ___.",
        "The trip will take about ___ hours.",
        "It's the best way because ___ and ___.",
        "Some people say it's ___, but I think ___.",
        "That's why we'll ___.",
      ],
      success: [
        "My writing uses capital letters for cities and countries.",
        "I use at least four contractions correctly, with the apostrophe in the right place.",
        "I answer a different view with a reason.",
      ],
      challenge:
        "Compare two ways to travel to the same place with a superlative, for example 'the fastest', and add one thing a passenger can do on each trip.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "How should the Gunners travel?",
          task: "Argue which is the best way for the Arsenal team to travel to an away match in another city or country: by plane, by bus or by train. Say how long the trip will take and answer one person who disagrees.",
          steps: [
            "Choose a destination for the away match and one way to travel. Write its name with capital letters.",
            "Write when the team is going to leave and how long the trip will take.",
            "Write two reasons why this way is best. Use contractions, as if you are talking to a friend.",
            "Write what someone who disagrees might say, and answer them.",
          ],
          frames: [
            "The team is going to travel from ___ to ___ by ___.",
            "The trip will take about ___ hours.",
            "It's the best way because ___ and ___.",
            "Some people say it's ___, but I think ___.",
            "That's why they'll ___.",
          ],
          success: [
            "My writing uses capital letters for cities and countries.",
            "I use at least four contractions correctly, with the apostrophe in the right place.",
            "I answer a different view with a reason.",
          ],
          challenge:
            "Compare two ways to travel to the same match with a superlative, for example 'the fastest', and say what the players can do on each trip.",
        },
      },
    ],
  },

  // Lesson 5: create a travel ad
  "od2e-l3-u08-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["destination", "passenger", "airport", "passport"],
      grammar: ["going to for plans", "time zones and time differences", "capital letters for places"],
    },
    base: {
      title: "My Dream Trip Ad",
      task: "Create a travel ad that makes people want to join your trip to a far-away destination. Show how the time is different there.",
      steps: [
        "Choose a destination and draw a small map. Mark your city and the destination.",
        "Write three exciting things people are going to do there.",
        "Write the time difference: when it is 8:00 a.m. in your city, what time is it there? Is it day or night?",
        "Finish with a slogan and one sentence that tells people what to pack.",
      ],
      frames: [
        "Come with us to ___! Our flight is going to leave at ___.",
        "You're going to ___, ___ and ___.",
        "When it's 8:00 a.m. in ___, it's ___ in ___. It's day / night there.",
        "Don't forget your ___!",
        "Our slogan: ___!",
      ],
      success: [
        "My ad uses going to for the plans.",
        "I write the names of places with capital letters.",
        "I give a time difference and say if it is day or night there.",
      ],
      challenge:
        "Add a problem a traveler could have on this trip, for example feeling tired after a long flight, and write a solution in your ad.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Gunners' Fan Trip Ad",
          task: "Create a travel ad that makes Arsenal fans want to join a trip to a match in a far-away city. Show how the time is different there.",
          steps: [
            "Choose a destination city and draw a small map. Mark London and the destination.",
            "Write three exciting things fans are going to do there.",
            "Write the time difference: when it is 8:00 a.m. in your city, what time is it there? Is it day or night?",
            "Finish with a slogan and one sentence that tells fans what to pack.",
          ],
          frames: [
            "Come with us to ___! Our flight is going to leave at ___.",
            "You're going to ___, ___ and ___.",
            "When it's 8:00 a.m. in ___, it's ___ in ___. It's day / night there.",
            "Don't forget your ___!",
            "Our slogan: ___!",
          ],
          success: [
            "My ad uses going to for the plans.",
            "I write the names of places with capital letters.",
            "I give a time difference and say if it is day or night there.",
          ],
          challenge:
            "Add a problem a fan could have on this trip, for example feeling tired after a long flight, and write a solution in your ad.",
        },
      },
    ],
  },

  // Lesson 6 (Grammar Champions): design a timetable for two friends in two time zones
  "od2e-l3-u08-l6": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["airport", "passenger", "passport", "destination", "medicine", "doctor"],
      grammar: ["am / is / are + going to", "because and so"],
    },
    base: {
      title: "The Two-Clock Timetable",
      task: "Two made-up friends live in two cities with different times. Design a timetable for the day one of them is going to fly to visit the other, with the time in both cities.",
      steps: [
        "Draw two clocks, one for each city, and write the city names with capital letters.",
        "Write six plans on the timetable, three for each friend, each with a time.",
        "Under the timetable write five sentences with going to about what each friend is going to do and when.",
        "Finish with one sentence that says which plan is the most important and why, with because or so.",
      ],
      frames: [
        "My friends live in ___ and ___.",
        "At ___ in ___, ___ is going to ___.",
        "At the same moment in ___ it will be ___.",
        "The passenger is going to take a ___ because ___.",
        "The most important plan is ___, so ___.",
      ],
      success: [
        "Every going to has am, is or are before it and a plain verb after it.",
        "I give two times for the same moment, one for each city.",
        "My last sentence has a reason with because or a result with so.",
      ],
      challenge:
        "Add a problem that could spoil the plan, for example a very late plane, and write the solution with a quick decision using will.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Two-Clock Match Timetable",
          task: "A made-up football team is going to fly to play a match in another city with a different time. Design the timetable for the match day, with the time in both cities.",
          steps: [
            "Draw two clocks, one for each city, and write the city names with capital letters.",
            "Write six plans on the timetable (take off, land, train, lunch, warm-up, kick-off), each with a time.",
            "Under the timetable write five sentences with going to about what the players and the coach are going to do and when.",
            "Finish with one sentence that says which plan is the most important on match day and why, with because or so.",
          ],
          frames: [
            "The team lives in ___ and the match is in ___.",
            "At ___ in ___, the players are going to ___.",
            "At the same moment in ___ it will be ___.",
            "The coach is going to ___ because ___.",
            "The most important plan is ___, so ___.",
          ],
          success: [
            "Every going to has am, is or are before it and a plain verb after it.",
            "I give two times for the same moment, one for each city.",
            "My last sentence has a reason with because or a result with so.",
          ],
          challenge:
            "Add a problem that could spoil the plan, for example a very late plane, and write the solution with a quick decision using will.",
        },
      },
    ],
  },
};
