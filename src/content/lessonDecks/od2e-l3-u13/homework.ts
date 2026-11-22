import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 13
// "Simple Machines and Inventions": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U13Creative: Record<string, Creative> = {
  // Lesson 1: design a helper machine with the unit's words
  "od2e-l3-u13-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["lever", "ramp", "wheel and axle", "wedge", "screw", "slide", "seesaw"],
      grammar: ["classify and categorize", "It helps us + verb", "agreeing and disagreeing"],
    },
    base: {
      title: "A helper for a hard job",
      task: "Think of a hard job at home or at school. Design a machine that makes the job easier, draw it and label the simple machine inside it.",
      steps: [
        "Choose a hard job, for example carrying heavy bags upstairs, opening a tight jar or lifting a box.",
        "Draw your machine and label two or three parts.",
        "Write which simple machine is inside it (lever, ramp, wheel and axle, wedge or screw) and which group it belongs to.",
        "Write three sentences to explain how it works and how it helps people.",
      ],
      frames: [
        "My machine helps people to ___.",
        "It has a ___ and a ___.",
        "The ___ is a kind of ___, so it makes the job easier because ___.",
        "First you ___. Then the ___ ___.",
        "Without it, people would have to ___.",
      ],
      success: [
        "My drawing has labels, and at least one label is a word from our unit.",
        "My writing says which simple machine is inside and which group it belongs to.",
        "My writing explains why the job is easier, with because.",
      ],
      challenge:
        "Put two simple machines together in one design (for example a ramp and a wheel and axle). Explain how they work together, and say one problem your machine might have and how you would fix it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A helper for match day",
          task: "Think of a hard job on match day at the Emirates Stadium. Design a machine that helps the Gunners' team and fans, draw it and label the simple machine inside it.",
          steps: [
            "Choose a hard match-day job, for example moving heavy kit bags, carrying the goals onto the pitch or helping fans reach their seats.",
            "Draw your machine and label two or three parts.",
            "Write which simple machine is inside it (lever, ramp, wheel and axle, wedge or screw) and which group it belongs to.",
            "Write three sentences to explain how it works and how it helps the people at the stadium.",
          ],
          frames: [
            "My machine helps the Arsenal team to ___.",
            "It has a ___ and a ___.",
            "The ___ is a kind of ___, so it makes the job easier because ___.",
            "First you ___. Then the ___ ___.",
            "Without it, the staff would have to ___.",
          ],
          success: [
            "My drawing has labels, and at least one label is a word from our unit.",
            "My writing says which simple machine is inside and which group it belongs to.",
            "My writing explains why the job is easier, with because.",
          ],
          challenge:
            "Put two simple machines together in one design (for example a ramp and a wheel and axle). Explain how they work together, and say one problem your machine might have on a busy match day and how you would fix it.",
        },
      },
    ],
  },

  // Lesson 2: evaluate which simple machine matters most
  "od2e-l3-u13-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["lever", "wheel and axle", "ramp", "wedge", "screw", "scissors", "doorknob", "axe"],
      grammar: ["present simple to explain how it works", "first, next, so", "because"],
    },
    base: {
      title: "The most important simple machine",
      task: "There are five simple machines. Judge them and decide which one is the most important for people today. Write your decision and defend it with evidence.",
      steps: [
        "Choose two simple machines to judge. Write one thing each machine does and one everyday example of it.",
        "Think about this question: what would life be like without each one?",
        "Decide which machine is more important and write why, with two reasons.",
        "Think of one thing the other machine does better and write it. A fair judge is honest.",
      ],
      frames: [
        "A ___ is a simple machine. It helps us ___.",
        "We use it in a ___ and in a ___.",
        "Without a ___, people would have to ___.",
        "I think the ___ is more important because ___ and ___.",
        "The ___ is useful, too, but it is not as important because ___.",
      ],
      success: [
        "My writing names two simple machines and gives an everyday example of each.",
        "My writing gives at least two reasons for my decision, joined with because or so.",
        "My writing uses present simple verbs to say how the machines work.",
      ],
      challenge:
        "Make a top-three list of the most important simple machines and give each one a score out of 10 for usefulness. Explain the score of the machine you put last, and say who might disagree with you and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best simple machine at the stadium",
          task: "Think of a match day at the Emirates Stadium. Judge two simple machines that the stadium needs and decide which one matters more for the Gunners and their fans. Defend your decision with evidence.",
          steps: [
            "Choose two simple machines you can find on match day, for example a ramp for wheelchairs and a wheel and axle on a kit trolley.",
            "Write one thing each machine does and say where in the stadium you find it.",
            "Decide which machine matters more and write why, with two reasons.",
            "Think of one thing the other machine does better and write it. A fair judge is honest.",
          ],
          frames: [
            "A ___ is a simple machine. It helps the fans / the team ___.",
            "You can find it at the ___ and near the ___.",
            "Without a ___, people would have to ___.",
            "I think the ___ is more important on match day because ___ and ___.",
            "The ___ is useful, too, but it is not as important because ___.",
          ],
          success: [
            "My writing names two simple machines and says where each one is at the stadium.",
            "My writing gives at least two reasons for my decision, joined with because or so.",
            "My writing uses present simple verbs to say how the machines work.",
          ],
          challenge:
            "Make a top-three list of the simple machines a stadium needs most and give each one a score out of 10. Explain the score of the machine you put last, and say which person at the stadium might disagree and why.",
        },
      },
    ],
  },

  // Lesson 3: argue a position with too / either
  "od2e-l3-u13-l3": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["light bulb", "doorknob", "slide", "seesaw", "ramp", "axe"],
      grammar: ["too (agree with a positive)", "either (agree with a negative)", "I think ... because ..."],
    },
    base: {
      title: "Necessary or just for fun?",
      task: "Write a short argument between two friends. They talk about one invention: is it necessary or just for fun? They disagree at first and at the end they agree on something.",
      steps: [
        "Choose one invention from the unit, for example a slide, a seesaw or a light bulb.",
        "Friend A says it is necessary and gives a reason. Friend B says it is just for fun and gives a reason.",
        "Write at least three turns for each friend. Use too after a positive idea and either after a negative idea at least three times in total.",
        "Finish with something they both agree on, for example a sentence with too or either.",
      ],
      frames: [
        "I think the ___ is necessary because ___.",
        "I don't agree. I think it's just for fun because ___.",
        "I like it, and my friend does, too.",
        "I don't use one every day, and my friend doesn't, either.",
        "We both agree that ___.",
      ],
      success: [
        "My writing has two clear sides, and each side gives a reason with because.",
        "My writing uses too correctly after positive sentences and either correctly after negative ones.",
        "My writing ends with something both friends agree on.",
      ],
      challenge:
        "Add a third friend who changes the question (for example: can an invention be necessary and fun?). Write what each friend says, and make sure each one uses the correct helper verb in a short answer (do, does, did, is, am, can).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match day: necessary or just for fun?",
          task: "Write a short argument between two Arsenal fans on the way to the Emirates Stadium. They talk about one invention at the match: is it necessary or just for fun? They disagree at first and at the end they agree on something.",
          steps: [
            "Choose one invention you can find on match day, for example the floodlights (light bulbs), the ramps, the big screen or a football itself.",
            "Fan A says it is necessary and gives a reason. Fan B says it is just for fun and gives a reason.",
            "Write at least three turns for each fan. Use too after a positive idea and either after a negative idea at least three times in total.",
            "Finish with something they both agree on, for example a sentence with too or either.",
          ],
          frames: [
            "I think the ___ is necessary because ___.",
            "I don't agree. I think it's just for fun because ___.",
            "I love match day, and my friend does, too.",
            "I can't see the game without it, and my friend can't, either.",
            "We both agree that ___.",
          ],
          success: [
            "My writing has two clear sides, and each side gives a reason with because.",
            "My writing uses too correctly after positive sentences and either correctly after negative ones.",
            "My writing ends with something both fans agree on.",
          ],
          challenge:
            "Add a third fan who changes the question (for example: can an invention be necessary and fun?). Write what each fan says, and make sure each one uses the correct helper verb in a short answer (do, does, did, is, am, can).",
        },
      },
    ],
  },

  // Lesson 4: compare two inventions and justify a choice, with plural verbs
  "od2e-l3-u13-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["stairs", "ramp", "wagon", "wheel and axle", "lever", "crowbar", "nails"],
      grammar: ["two subjects joined by and + plural verb", "too / either", "because"],
    },
    base: {
      title: "Stairs or a ramp?",
      task: "Imagine you are building a new tree house, school library or playground. Compare stairs with a ramp, then choose which one to build and justify your choice.",
      steps: [
        "Write two sentences about how stairs and a ramp are the same. Use two subjects joined by and and a plural verb.",
        "Write two sentences about how they are different.",
        "Choose one for your building and give two reasons.",
        "Say who would find the other one more useful, and why.",
      ],
      frames: [
        "Stairs and a ramp are both ___.",
        "You ___ stairs, but you ___ a ramp.",
        "A ramp and a wagon work well together because ___.",
        "I would build the ___ because ___ and ___.",
        "People who ___ would prefer the ___, and so would ___.",
      ],
      success: [
        "My writing uses and with a plural verb (are, were or a plain verb) at least twice.",
        "My writing says how the two things are the same and how they are different.",
        "My writing gives two reasons for the choice and thinks about another group of people.",
      ],
      challenge:
        "Compare a third choice (a lever, a wheel and axle, or a lift) with the first two. Say which of the three is best for a heavy load and why, and write one sentence with too and one with either.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Stairs or a ramp at the stadium?",
          task: "Imagine you are helping to plan a new entrance at the Emirates Stadium for Arsenal fans. Compare stairs with a ramp, then choose which one to build and justify your choice.",
          steps: [
            "Write two sentences about how stairs and a ramp are the same. Use two subjects joined by and and a plural verb.",
            "Write two sentences about how they are different.",
            "Choose one for the new entrance and give two reasons.",
            "Say which fans would find the other one more useful, and why.",
          ],
          frames: [
            "Stairs and a ramp are both ___.",
            "You ___ stairs, but you ___ a ramp.",
            "A ramp and a trolley work well together on match day because ___.",
            "I would build the ___ because ___ and ___.",
            "Fans who ___ would prefer the ___, and so would ___.",
          ],
          success: [
            "My writing uses and with a plural verb (are, were or a plain verb) at least twice.",
            "My writing says how the two things are the same and how they are different.",
            "My writing gives two reasons for the choice and thinks about another group of fans.",
          ],
          challenge:
            "Compare a third choice (a lever, a wheel and axle, or a lift) with the first two. Say which of the three is best for a heavy load of kit bags and why, and write one sentence with too and one with either.",
        },
      },
    ],
  },
};
