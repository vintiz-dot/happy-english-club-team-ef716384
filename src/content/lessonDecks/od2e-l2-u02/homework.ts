import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 2 "Animal Adventures":
// one task per lesson, keyed by deck id, for children of about 7-8 (draw first, then write
// two to four short sentences). Every task has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app, never
// written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U02Creative: Record<string, Creative> = {
  // Lesson 1: animal action words
  "od2e-l2-u02-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["worm", "berries", "hunt", "escape", "creep", "peck", "squawk"],
      grammar: ["It + verb (It creeps.)", "It eats ...", "because"],
    },
    base: {
      title: "My animal in the garden",
      task: "Make up an animal and draw it in a garden. Write what it does and what it eats.",
      steps: [
        "Draw your animal in a garden.",
        "Give your animal a name.",
        "Draw one thing it eats, for example berries or a worm.",
        "Write two or three sentences under your picture.",
      ],
      frames: ["My animal is called ___.", "It ___ in the garden.", "It eats ___.", "I chose ___ because ___."],
      success: [
        "I can draw my animal and its food.",
        "I can use one new word from today, for example creep or peck.",
        "I can write what it eats.",
      ],
      challenge: "Add a sentence about how your animal escapes when it is in danger.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The pitch visitor",
          task: "Make up an animal that visits the football pitch at the Emirates Stadium. Draw it and write what it does and what it eats.",
          steps: [
            "Draw your animal on a football pitch with the Arsenal goal behind it.",
            "Give your animal a name.",
            "Draw one thing it eats, for example berries or a worm.",
            "Write two or three sentences under your picture.",
          ],
          frames: ["My animal is called ___.", "It ___ on the pitch.", "It eats ___.", "I chose ___ because ___."],
          success: [
            "I can draw my animal and its food.",
            "I can use one new word from today, for example creep or peck.",
            "I can write what it eats.",
          ],
          challenge: "Add a sentence about how your animal escapes when the Gunners' fans start to shout.",
        },
      },
    ],
  },

  // Lesson 2: Leo and Lily's adventure (reading)
  "od2e-l2-u02-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["hunt", "escape", "creep", "fight", "peck", "squawk"],
      grammar: ["First, then, at the end", "because", "It / They + verb"],
    },
    base: {
      title: "A new adventure for Leo and Lily",
      task: "Plan a new adventure for two animal friends. Draw three pictures and write one sentence for each.",
      steps: [
        "Choose a new place for the two friends to go.",
        "Draw three pictures: the start, the middle and the end.",
        "Write one sentence under each picture with First, Then and At the end.",
        "Say why you chose that place.",
      ],
      frames: ["First, they ___.", "Then they ___.", "At the end, they ___.", "I chose this place because ___."],
      success: [
        "I can draw three pictures in order.",
        "I can use First, Then and At the end.",
        "I can say why I chose the place.",
      ],
      challenge: "Add a problem in the middle, for example a fox, and say how the friends solve it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Adventure at the Emirates",
          task: "Plan a match-day adventure for two animal friends. Draw three pictures and write one sentence for each.",
          steps: [
            "Choose where the two friends go at the Emirates Stadium, for example the pitch or the fans' gate.",
            "Draw three pictures: the start, the middle and the end.",
            "Write one sentence under each picture with First, Then and At the end.",
            "Say why you chose that place.",
          ],
          frames: ["First, they ___.", "Then they ___.", "At the end, they ___.", "I chose this place because ___."],
          success: [
            "I can draw three pictures in order.",
            "I can use First, Then and At the end.",
            "I can say why I chose the place.",
          ],
          challenge: "Add a problem in the middle, for example a loud crowd, and say how the friends solve it.",
        },
      },
    ],
  },

  // Lesson 3: adverbs of frequency
  "od2e-l2-u02-l3": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["hunt", "creep", "peck", "squawk", "berries", "worm"],
      grammar: ["always, usually, sometimes, hardly ever, never", "He usually eats ..."],
    },
    base: {
      title: "The week of my pet",
      task: "Invent a pet and draw its week. Write five sentences with always, usually, sometimes, hardly ever and never.",
      steps: [
        "Invent a pet and draw it.",
        "Draw three things it does in a week.",
        "Write five sentences, one with each frequency word.",
        "Underline the most surprising sentence and say why.",
      ],
      frames: ["My pet always ___.", "It usually ___.", "It sometimes ___.", "It hardly ever ___.", "It never ___."],
      success: [
        "I can use all five frequency words.",
        "I can put the word before the verb.",
        "I can say which sentence is the most surprising.",
      ],
      challenge: "Add one sentence with but, for example My pet usually eats berries, but it sometimes eats a worm.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The week of a match-day pet",
          task: "Invent a pet that loves football and draw its week. Write five sentences with always, usually, sometimes, hardly ever and never.",
          steps: [
            "Invent a pet that likes the Gunners and draw it.",
            "Draw three things it does in a week, for example watching a match.",
            "Write five sentences, one with each frequency word.",
            "Underline the most surprising sentence and say why.",
          ],
          frames: ["My pet always ___ on match day.", "It usually ___.", "It sometimes ___.", "It hardly ever ___.", "It never ___."],
          success: [
            "I can use all five frequency words.",
            "I can put the word before the verb.",
            "I can say which sentence is the most surprising.",
          ],
          challenge: "Add one sentence with but, for example My pet usually watches the match, but it sometimes sleeps.",
        },
      },
    ],
  },

  // Lesson 4: describing animals, it / they / we
  "od2e-l2-u02-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["strong", "gentle", "patient", "smart", "calm", "fierce"],
      grammar: ["It is ... / They are ...", "It / they / we"],
    },
    base: {
      title: "Two words for one animal",
      task: "Choose an animal and two describing words. Draw the animal and explain why those words fit.",
      steps: [
        "Choose an animal and two words from today, for example strong and gentle.",
        "Draw the animal.",
        "Write three sentences with It or They.",
        "Say why you chose those two words.",
      ],
      frames: ["The ___ is ___ and ___.", "It can ___.", "They ___ when ___.", "I chose these words because ___."],
      success: [
        "I can use two describing words for one animal.",
        "I can use It or They correctly.",
        "I can give a reason with because.",
      ],
      challenge: "Choose two words that sound different, like fierce and calm, and show how one animal can be both.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best words for a team",
          task: "Choose an animal and two describing words that fit a football team. Draw the animal in an Arsenal shirt and explain why those words fit.",
          steps: [
            "Choose an animal and two words from today, for example strong and smart.",
            "Draw the animal in a red and white shirt.",
            "Write three sentences with It or They.",
            "Say why a team needs those two words.",
          ],
          frames: ["The ___ is ___ and ___.", "It can ___.", "A team needs ___ players because ___.", "We are ___ when ___."],
          success: [
            "I can use two describing words for one animal.",
            "I can use It, They or We correctly.",
            "I can give a reason with because.",
          ],
          challenge: "Choose two words that sound different, like fierce and calm, and show why a team needs both.",
        },
      },
    ],
  },

  // Lesson 5: wrap up Units 1 and 2
  "od2e-l2-u02-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["fur", "feathers", "scales", "hunt", "gentle", "strong", "calm"],
      grammar: ["It has ...", "It can ...", "always, usually, sometimes, hardly ever, never"],
    },
    base: {
      title: "A card for a new animal",
      task: "Make a picture card for a new animal. Write its group, what it can do and what it is like on the back.",
      steps: [
        "Draw a new animal on the front of a card.",
        "On the back, write its group.",
        "Write what it can do and what it is like.",
        "Add one sentence with a frequency word.",
      ],
      frames: ["It is a ___.", "It has ___ and it can ___.", "It is ___.", "It usually ___."],
      success: [
        "I can say which group the animal is in.",
        "I can write what it can do and what it is like.",
        "I can use one frequency word.",
      ],
      challenge: "Say why your animal is different from every other animal in your class.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A collector card for an animal player",
          task: "Make a football-style collector card for a new animal player on the Gunners' team. Write its group, what it can do and what it is like on the back.",
          steps: [
            "Draw an animal player in an Arsenal shirt on the front of a card.",
            "On the back, write its group.",
            "Write what it can do and what it is like.",
            "Add one sentence with a frequency word.",
          ],
          frames: ["It is a ___.", "It has ___ and it can ___.", "It is ___.", "It usually ___ on match day."],
          success: [
            "I can say which group the animal is in.",
            "I can write what it can do and what it is like.",
            "I can use one frequency word.",
          ],
          challenge: "Say why your animal player is different from every other player on the team.",
        },
      },
    ],
  },
};
