import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 16
// "Gardens in Our Community": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U16Creative: Record<string, Creative> = {
  // Lesson 1: argue a point with because
  "od2e-l3-u16-l1": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["community", "garden", "gardener", "crowd", "teenagers", "haze", "vines"],
      grammar: ["because", "In my opinion ...", "giving a reason"],
    },
    base: {
      title: "Does every neighbourhood need a garden?",
      task: "Decide: should every neighbourhood have a garden? Write a short speech that tries to persuade your classmates, with three different reasons.",
      steps: [
        "Write your opinion in one sentence: I think every neighbourhood needs / does not need a garden.",
        "Think of three reasons, for example about food, air, children, neighbours or the city.",
        "Write each reason in a sentence with because, and add a small example from a place you know.",
        "Think of one reason someone might disagree and write a sentence that answers it.",
      ],
      frames: [
        "In my opinion, every neighbourhood needs a garden because ___.",
        "The first reason is that ___.",
        "For example, in my community there is ___.",
        "Some people say ___, but I think ___ because ___.",
        "That is why I believe ___.",
      ],
      success: [
        "My speech has an opinion and three reasons, each with because.",
        "My speech uses at least four of the garden words from the lesson.",
        "My speech answers one different opinion politely.",
      ],
      challenge:
        "Put your three reasons in order, from the least to the most important, and explain in one sentence why the last one matters most.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A garden beside the stadium?",
          task: "Imagine a small garden beside the Emirates Stadium. Should the club build one for the crowd on match day? Write a short speech to persuade the Arsenal fans, with three different reasons.",
          steps: [
            "Write your opinion in one sentence: I think the club should / should not build a garden beside the stadium.",
            "Think of three reasons, for example about the crowd, the neighbours, healthy food, fresh air or a calm place before the match.",
            "Write each reason in a sentence with because, and add a small match-day example.",
            "Think of one reason someone might disagree (for example, the Gunners need the space for more seats) and answer it.",
          ],
          frames: [
            "In my opinion, the club should build a garden because ___.",
            "The first reason is that the crowd ___.",
            "For example, on match day ___.",
            "Some fans say ___, but I think ___ because ___.",
            "That is why I believe ___.",
          ],
          success: [
            "My speech has an opinion and three reasons, each with because.",
            "My speech uses at least four of the garden words from the lesson.",
            "My speech answers one different opinion politely.",
          ],
          challenge:
            "Put your three reasons in order, from the least to the most important, and explain in one sentence why the last one matters most to the fans and to the neighbours.",
        },
      },
    ],
  },

  // Lesson 2: create a plot, beginning / middle / end
  "od2e-l3-u16-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["gardener", "garden", "vines", "beans", "community", "teenagers", "bloom"],
      grammar: ["past simple for events", "At the beginning / After that / At the end", "because"],
    },
    base: {
      title: "The plot of my garden story",
      task: "Invent a new story about a garden. Write only its plot: what happens at the beginning, in the middle and at the end, with a feeling at the end.",
      steps: [
        "Choose a character, a place and a plant for your story.",
        "Write one important event for the beginning, one for the middle (a problem) and one for the end (how it is solved).",
        "Join the three events with At the beginning, After that and At the end.",
        "Add a sentence that says how your character felt at the end and why.",
      ],
      frames: [
        "At the beginning, ___ planted ___ in ___.",
        "After that, a problem happened: ___.",
        "At the end, ___ because ___.",
        "In the end, ___ felt ___ because ___.",
        "The most important thing in my story is ___.",
      ],
      success: [
        "My plot has a beginning, a middle (with a problem) and an end (with a solution).",
        "My events are in order and use the past simple.",
        "I left out small details and kept only the important events.",
      ],
      challenge:
        "Write one small detail you left out and explain in one sentence why it is only a detail and not part of the plot.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The garden on match day",
          task: "Invent a new story about a garden near a football stadium on match day, with Arsenal fans. Write only its plot: the beginning, the middle and the end, with a feeling at the end.",
          steps: [
            "Choose a character (a fan, a gardener or a teenager), a place near the Emirates Stadium and a plant.",
            "Write one important event for the beginning, one for the middle (a problem) and one for the end (how it is solved).",
            "Join the three events with At the beginning, After that and At the end.",
            "Add a sentence that says how your character felt at the end and why.",
          ],
          frames: [
            "At the beginning, ___ planted ___ near the stadium.",
            "After that, a problem happened: ___.",
            "At the end, the Gunners' fans ___ because ___.",
            "In the end, ___ felt ___ because ___.",
            "The most important thing in my story is ___.",
          ],
          success: [
            "My plot has a beginning, a middle (with a problem) and an end (with a solution).",
            "My events are in order and use the past simple.",
            "I left out small details and kept only the important events.",
          ],
          challenge:
            "Write one small detail you left out (the score, the weather, a song) and explain in one sentence why it is only a detail and not part of the plot.",
        },
      },
    ],
  },

  // Lesson 3: evaluate with adjective + preposition
  "od2e-l3-u16-l3": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["curious", "bloom", "water", "empty", "garden", "community"],
      grammar: ["curious about", "happy with", "surprised at", "because"],
    },
    base: {
      title: "A review of a garden visit",
      task: "Write a review of a garden you have visited (or one you imagine), saying what you were curious about, what you were happy with and what surprised you. Then give it a score out of five and say why.",
      steps: [
        "Choose a garden: a park, a school garden, a garden at home or a garden you imagine.",
        "Write one sentence with curious about, one with happy with and one with surprised at.",
        "Add a reason with because to each sentence.",
        "Give the garden a score out of five and write one thing that could be better.",
      ],
      frames: [
        "I was curious about ___ because ___.",
        "I was happy with ___ because ___.",
        "I was surprised at ___ because ___.",
        "I give this garden ___ out of five because ___.",
        "It would be even better if ___.",
      ],
      success: [
        "My review uses curious about, happy with and surprised at correctly.",
        "Every feeling has a reason with because.",
        "My score matches what I wrote, and I say one thing that could be better.",
      ],
      challenge:
        "Write a second review of the same garden as a different person (a grandmother or a small child) who feels differently, and show how their opinions are different.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A review of match day",
          task: "Write a review of a match day at a football stadium such as the Emirates Stadium (a real visit or one you imagine), saying what you were curious about, what you were happy with and what surprised you. Then give it a score out of five and say why.",
          steps: [
            "Think about the day: the walk to the stadium, the crowd, the food, the match and the noise.",
            "Write one sentence with curious about, one with happy with and one with surprised at.",
            "Add a reason with because to each sentence.",
            "Give the day a score out of five and write one thing the club could do better.",
          ],
          frames: [
            "I was curious about ___ because ___.",
            "I was happy with ___ because ___.",
            "I was surprised at ___ because ___.",
            "I give this match day ___ out of five because ___.",
            "It would be even better if the Gunners ___.",
          ],
          success: [
            "My review uses curious about, happy with and surprised at correctly.",
            "Every feeling has a reason with because.",
            "My score matches what I wrote, and I say one thing that could be better.",
          ],
          challenge:
            "Write a second review of the same day as a different person (a grandmother in the crowd or a small child at her first match) who feels differently, and show how their opinions are different.",
        },
      },
    ],
  },

  // Lesson 4: compare and justify, reasons and place phrases
  "od2e-l3-u16-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["ripe", "raw", "mature", "brave", "uncooked", "unafraid"],
      grammar: ["because", "place phrases: in, on, off", "synonyms"],
    },
    base: {
      title: "Which plant matters more?",
      task: "Choose two plants that are important to people (for example rice and cotton). Compare them, say where each one grows, and decide which one matters more and why.",
      steps: [
        "Choose two plants and write what people get from each one (food, clothes, furniture, medicine).",
        "Write where each plant grows with a place phrase (in a field, on a hill, in water).",
        "Write one way they are the same and one way they are different.",
        "Decide which plant matters more and give two reasons with because.",
      ],
      frames: [
        "Both ___ and ___ are important because ___.",
        "___ grows in ___, but ___ grows on ___.",
        "People use ___ to make ___, but they use ___ for ___.",
        "I think ___ matters more because ___.",
        "Another reason is that ___.",
      ],
      success: [
        "My writing compares two plants with one likeness and one difference.",
        "My writing uses at least two place phrases and two reasons with because.",
        "My writing uses one pair of synonyms from the lesson (for example ripe and mature).",
      ],
      challenge:
        "Think about a world without your winning plant. Write two sentences about what would happen, and say whether you still think it matters more.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Grass or garden at the stadium?",
          task: "Compare two kinds of plants at a football stadium such as the Emirates Stadium: the grass on the pitch and a vegetable garden outside. Say where each one grows, and decide which one matters more for match day and why.",
          steps: [
            "Write what each one gives the fans and the players (a place to play, healthy food, a calm place, shade).",
            "Write where each plant grows with a place phrase (on the pitch, in a box, off the ground on a wall).",
            "Write one way they are the same and one way they are different.",
            "Decide which one matters more on match day and give two reasons with because.",
          ],
          frames: [
            "Both the grass and the garden are important because ___.",
            "The grass grows on ___, but the vegetables grow in ___.",
            "The Gunners use the grass to ___, but the fans use the garden to ___.",
            "I think the ___ matters more because ___.",
            "Another reason is that ___.",
          ],
          success: [
            "My writing compares two kinds of plants with one likeness and one difference.",
            "My writing uses at least two place phrases and two reasons with because.",
            "My writing uses one pair of synonyms from the lesson (for example ripe and mature).",
          ],
          challenge:
            "Think about match day with no grass, or with no garden. Write two sentences about what would happen, and say whether you still think your choice matters more.",
        },
      },
    ],
  },

  // Lesson 5: design a steps leaflet
  "od2e-l3-u16-l5": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["garden", "community", "beans", "sweet potato", "gardener", "vines"],
      grammar: ["First, Second, Next, Finally", "place phrases: in, on, off", "happy with"],
    },
    base: {
      title: "A leaflet: start a community garden",
      task: "Design a leaflet that tells your neighbours how to start a community garden in five steps. Every step needs a sequence word, a place phrase and a reason.",
      steps: [
        "Choose a place and a name for your garden and write them at the top of the leaflet.",
        "Write five steps in order with First, Second, Next, Then and Finally.",
        "Add a place phrase to at least three steps (in the yard, on the wall, in boxes).",
        "Draw one small picture for each step and add a sentence with happy with at the end.",
      ],
      frames: [
        "Here is how to start the ___ garden.",
        "First, find a place ___.",
        "Next, put the soil ___ and plant ___ because ___.",
        "Finally, ask the community to ___.",
        "We will be happy with the garden because ___.",
      ],
      success: [
        "My steps are in the right order and each one has a sequence word.",
        "My leaflet has at least three place phrases and one sentence with happy with.",
        "A neighbour could follow my steps without asking me a question.",
      ],
      challenge:
        "Add a sixth step called 'If something goes wrong' that says what to do when the plants do not grow, and explain why this step is useful.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A leaflet: a garden for the fans",
          task: "Design a leaflet that tells the Arsenal fans how to start a small fan garden near the Emirates Stadium in five steps. Every step needs a sequence word, a place phrase and a reason.",
          steps: [
            "Choose a place near the stadium and a name for the fan garden and write them at the top of the leaflet.",
            "Write five steps in order with First, Second, Next, Then and Finally.",
            "Add a place phrase to at least three steps (by the gate, on the wall, in boxes).",
            "Draw one small picture for each step and add a sentence with happy with at the end.",
          ],
          frames: [
            "Here is how to start the ___ fan garden.",
            "First, find a place ___.",
            "Next, put the soil ___ and plant ___ because ___.",
            "Finally, ask the Gunners' fans to ___.",
            "We will be happy with the garden because ___.",
          ],
          success: [
            "My steps are in the right order and each one has a sequence word.",
            "My leaflet has at least three place phrases and one sentence with happy with.",
            "A fan could follow my steps without asking me a question.",
          ],
          challenge:
            "Add a sixth step called 'On match day' that says how the garden helps the crowd, and explain why this step is useful.",
        },
      },
    ],
  },
};
