import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 15
// "Plants and People": one task per lesson, keyed by deck id. Every task has the
// class version (`base`) and one football edition. Which children get the
// football edition is chosen per class in the app (from the roster's interests),
// never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U15Creative: Record<string, Creative> = {
  // Lesson 1: plant parts and what they do
  "od2e-l3-u15-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["soil", "seeds", "roots", "stem", "leaves", "petals", "oxygen"],
      grammar: ["present simple for facts", "can see / cannot see", "because"],
    },
    base: {
      title: "A poster for the little ones",
      task: "Design a poster that teaches younger children the parts of a plant. Label the parts and say what each part does.",
      steps: [
        "Choose a plant, such as a sunflower or a tomato plant, and draw it big. Show the roots under the soil.",
        "Label at least five parts with the unit words.",
        "Write one sentence for each label to say what the part does.",
        "Add a title and one question for the little ones to answer, with a hint.",
      ],
      frames: [
        "This is the ___. You can see it / You cannot see it.",
        "The ___ holds the plant in the soil.",
        "The ___ takes in water.",
        "The leaves use sunlight, so the plant can ___.",
        "Can you find the ___?",
      ],
      success: [
        "My poster names at least five parts correctly.",
        "My sentences say what each part does, in the present simple.",
        "My poster says which parts we can see and which we cannot see, with a reason.",
      ],
      challenge:
        "Add a sentence about why people need this plant, using because, and explain one thing that would happen to the plant if the roots were cut.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poster for the match-day pitch team",
          task: "Design a poster for the people who look after the grass at a football stadium such as the Emirates Stadium. Show the parts of a grass plant and say what each part does.",
          steps: [
            "Draw a piece of grass from the pitch, big, with its roots under the soil.",
            "Label at least five parts with the unit words, for example roots, stem, leaves, soil and seeds.",
            "Write one sentence for each label to say what the part does.",
            "Add a title for the Gunners' pitch team and one question for them to answer, with a hint.",
          ],
          frames: [
            "This is the ___. You can see it / You cannot see it.",
            "The ___ holds the grass in the soil.",
            "The ___ takes in water, so the pitch stays ___.",
            "The leaves use sunlight, so the grass can ___.",
            "On match day, the players run on the ___.",
          ],
          success: [
            "My poster names at least five parts correctly.",
            "My sentences say what each part does, in the present simple.",
            "My poster says which parts we can see and which we cannot see, with a reason.",
          ],
          challenge:
            "Explain why strong roots matter when the players run and slide on the pitch, using because, and say one thing the team can do to look after the grass.",
        },
      },
    ],
  },

  // Lesson 2: the life of a sunflower, cause and effect
  "od2e-l3-u15-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["seeds", "sprout", "roots", "stem", "leaves", "nectar", "pollen", "important"],
      grammar: ["cause and effect with because / so", "time words: first, then, after that"],
    },
    base: {
      title: "The diary of a seed",
      task: "Write a short diary for a sunflower seed. Write four or five entries that show how it grows, and say what causes each change.",
      steps: [
        "Write the day or week at the top of each entry: Day 1, Day 5, Week 3 ...",
        "In each entry say what the seed or plant does and what it feels, as if you are the seed.",
        "Give one cause and its effect in each entry, with because or so.",
        "Finish with an entry that says why you, the sunflower, are important.",
      ],
      frames: [
        "Day ___: I am under the soil. It is dark and ___.",
        "I got some water, so I ___.",
        "My roots grow down because ___.",
        "Now I am tall, so the bees ___.",
        "I am important because ___.",
      ],
      success: [
        "My diary has four or five entries in a sensible order.",
        "My diary uses because or so to link a cause and an effect at least three times.",
        "My diary uses at least five unit words correctly.",
      ],
      challenge:
        "Add an entry where something goes wrong, such as no rain for a week. Say what the effect is and what happens next.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The diary of a grass seed",
          task: "Write a short diary for a grass seed that grows into part of a football pitch. Write four or five entries, and say what causes each change, from the first day to a match day with Arsenal.",
          steps: [
            "Write the day or week at the top of each entry: Day 1, Day 5, Week 3 ...",
            "In each entry say what the seed or grass does, as if you are the seed.",
            "Give one cause and its effect in each entry, with because or so.",
            "Finish with a match-day entry at the Emirates Stadium that says why the grass is important.",
          ],
          frames: [
            "Day ___: I am a seed in the soil. It is dark and ___.",
            "The groundskeeper gave me water, so I ___.",
            "My roots grow down because ___.",
            "Now I am green, so the players ___.",
            "On match day I am important because ___.",
          ],
          success: [
            "My diary has four or five entries in a sensible order.",
            "My diary uses because or so to link a cause and an effect at least three times.",
            "My diary uses at least five unit words correctly.",
          ],
          challenge:
            "Add an entry where something goes wrong, such as a week with no sun before a big match. Say what the effect is and how the team fixes it.",
        },
      },
    ],
  },

  // Lesson 3: measure words
  "od2e-l3-u15-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["a bag of", "a jar of", "a box of", "a bottle of", "a carton of", "a bunch of", "a loaf of"],
      grammar: ["measure words + of", "both ... and ...", "because"],
    },
    base: {
      title: "Two baskets for the school garden party",
      task: "A garden party is coming. Write a shopping list for two different baskets with measure words, compare them, and choose the better one.",
      steps: [
        "Write a shopping list for Basket A with at least five items, each with a measure word.",
        "Write a different list for Basket B with at least five items.",
        "Write two sentences that compare them, for example what both baskets have and what is different.",
        "Choose the better basket for the party and give a reason.",
      ],
      frames: [
        "Basket A has a ___ of ___ and two ___ of ___.",
        "Basket B has a ___ of ___ and three ___ of ___.",
        "Both baskets have a ___ of ___.",
        "Basket A has ___, but Basket B has ___.",
        "I would choose Basket ___ because ___.",
      ],
      success: [
        "My lists use of after every measure word, and the measure word is plural when there is more than one.",
        "My writing compares the baskets with both and but.",
        "My writing gives a reason for my choice with because.",
      ],
      challenge:
        "Say which basket has more food that comes from plants, and count how many things in each basket come from plants and how many do not.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two picnic bags for match day",
          task: "Your family is going to watch Arsenal at the Emirates Stadium. Write a shopping list for two different picnic bags with measure words, compare them, and choose the better one.",
          steps: [
            "Write a shopping list for Bag A with at least five items, each with a measure word.",
            "Write a different list for Bag B with at least five items.",
            "Write two sentences that compare them, for example what both bags have and what is different.",
            "Choose the better bag for a long match day and give a reason.",
          ],
          frames: [
            "Bag A has a ___ of ___ and two ___ of ___.",
            "Bag B has a ___ of ___ and three ___ of ___.",
            "Both bags have a ___ of ___.",
            "Bag A has ___, but Bag B has ___.",
            "I would choose Bag ___ for the Gunners' match because ___.",
          ],
          success: [
            "My lists use of after every measure word, and the measure word is plural when there is more than one.",
            "My writing compares the bags with both and but.",
            "My writing gives a reason for my choice with because.",
          ],
          challenge:
            "Say which bag has more food that comes from plants, and count how many things in each bag come from plants and how many do not.",
        },
      },
    ],
  },

  // Lesson 4: sequence adverbs, strength / width / length, asking permission
  "od2e-l3-u15-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["soil", "seeds", "water", "sunlight", "strength", "length", "width"],
      grammar: ["First, Second, Third, Finally", "because", "May we ...?"],
    },
    base: {
      title: "A garden for our school",
      task: "Write a short speech to persuade your head teacher to let the class grow a garden. Give two reasons, then say the steps you would follow.",
      steps: [
        "Start politely, for example: May we talk about a school garden, please?",
        "Give two reasons why a school garden is a good idea, each with because.",
        "Explain the steps for starting it with First, Second, Third and Finally.",
        "End with a polite request and thank the head teacher.",
      ],
      frames: [
        "May we ___, please?",
        "A school garden is a good idea because ___.",
        "Also, plants give us ___, so ___.",
        "First, we ___. Second, we ___. Finally, we ___.",
        "Thank you for listening. May we start next week?",
      ],
      success: [
        "My speech has two clear reasons with because.",
        "My steps are in the right order with First, Second and Finally, each followed by a comma.",
        "My speech asks politely and uses at least four unit words.",
      ],
      challenge:
        "Answer a worry the head teacher might have, for example that it will cost too much or take too much space, and explain how the class will solve it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A garden near the stadium",
          task: "Write a short speech to persuade a football club such as Arsenal to grow a small garden near the Emirates Stadium for the fans. Give two reasons, then say the steps you would follow.",
          steps: [
            "Start politely, for example: May we talk about a match-day garden, please?",
            "Give two reasons why a garden near the stadium is a good idea, each with because.",
            "Explain the steps for starting it with First, Second, Third and Finally.",
            "End with a polite request and thank the club.",
          ],
          frames: [
            "May we ___, please?",
            "A garden near the Emirates Stadium is a good idea because ___.",
            "Also, plants give fans ___, so ___.",
            "First, we ___. Second, we ___. Finally, we ___.",
            "Thank you for listening. May we start before the next match?",
          ],
          success: [
            "My speech has two clear reasons with because.",
            "My steps are in the right order with First, Second and Finally, each followed by a comma.",
            "My speech asks politely and uses at least four unit words.",
          ],
          challenge:
            "Answer a worry the club might have, for example that match-day crowds could damage the plants, and explain how the fans and the team will solve it.",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): measure words
  "od2e-l3-u15-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["bag", "jar", "box", "bottle", "carton", "bunch", "loaf"],
      grammar: ["measure word + of + food", "because", "so"],
    },
    base: {
      title: "The plant-power lunch box",
      task: "Plan a lunch box for a hungry gardener. All six foods must come from plants. Write the list with measure words and say why you chose each one.",
      steps: [
        "Choose six foods or drinks that come from plants.",
        "Write each one with a number and a measure word, for example two bunches of grapes.",
        "For each food write one sentence with because or so to say why it is a good choice for a gardener.",
        "Tell which food gives the gardener the most energy, and say why you think so.",
      ],
      frames: [
        "In the lunch box there is a ___ of ___ and two ___ of ___.",
        "I chose ___ because it ...",
        "The gardener is hungry, so ...",
        "This comes from a plant. The plant gives us ...",
        "I think the best choice is ___ because ...",
      ],
      success: [
        "Every measure word has of after it, and the container is plural when there is more than one.",
        "My writing gives a reason for each choice with because or so.",
        "All six foods come from plants, and I say which part of the plant they come from if I can.",
      ],
      challenge:
        "Add a seventh food that does NOT come from plants, and explain how you can tell the difference between the foods that come from plants and the foods that do not.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The training-day lunch box",
          task: "Plan a lunch box for a football team on a training day. All six foods must come from plants. Write the list with measure words and say why you chose each one.",
          steps: [
            "Choose six foods or drinks from plants that give players energy.",
            "Write each one with a number and a measure word, for example two bunches of grapes.",
            "For each food write one sentence with because or so to say why it is good for a player.",
            "Tell which food you would give the team before a big match, and say why.",
          ],
          frames: [
            "In the team lunch box there is a ___ of ___ and two ___ of ___.",
            "I chose ___ because it ...",
            "The players are hungry, so ...",
            "This comes from a plant. The plant gives us ...",
            "Before a big match I would give the team ___ because ...",
          ],
          success: [
            "Every measure word has of after it, and the container is plural when there is more than one.",
            "My writing gives a reason for each choice with because or so.",
            "All six foods come from plants, and I say which part of the plant they come from if I can.",
          ],
          challenge:
            "Add a seventh food that does NOT come from plants, and explain how you can tell the difference between the foods that come from plants and the foods that do not.",
        },
      },
    ],
  },
};
