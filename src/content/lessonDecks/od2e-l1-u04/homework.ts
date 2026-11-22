import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 4 "Let's
// Make Colors!": one task per lesson, keyed by deck id. Children are 6-7: draw,
// colour, then write a few words or one short sentence. Every task has the class
// version (`base`) and one football edition, chosen per class in the app. All
// text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U4Creative: Record<string, Creative> = {
  // Lesson 1: art and the ocean
  "od2e-l1-u04-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["ocean", "sand", "seaweed", "seashell", "jellyfish", "starfish", "mural"],
      grammar: ["It's a ___ ___ in the ocean.", "colour words"],
    },
    base: {
      title: "A new ocean animal",
      task: "Invent an ocean animal that nobody has seen. Draw it, colour it and write about it.",
      steps: [
        "Draw the ocean with some sand and seaweed.",
        "Draw your new animal in the ocean.",
        "Colour it with colours you like.",
        "Write: It's a ___ ___ in the ocean.",
      ],
      frames: ["It's a ___ ___ in the ocean.", "It has ___.", "I chose ___ because ___."],
      success: ["I can write a colour word and an ocean word.", "I can start my sentence with a capital letter."],
      challenge: "Write three sentences about your animal. End each one with a full stop.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The ocean team",
          task: "Invent an ocean animal that loves football. Draw it in an Arsenal kit under the sea and write about it.",
          steps: [
            "Draw the ocean with some sand and seaweed.",
            "Draw your new animal in a red and white shirt.",
            "Add a ball. It is a seashell ball!",
            "Write: It's a ___ ___ in the ocean.",
          ],
          frames: ["It's a ___ ___ in the ocean.", "It has ___.", "I chose ___ because ___."],
          success: ["I can write a colour word and an ocean word.", "I can start my sentence with a capital letter."],
          challenge: "Write three sentences about your animal. End each one with a full stop.",
        },
      },
    ],
  },

  // Lesson 2: mixing colours
  "od2e-l1-u04-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["paint", "primary colors", "secondary colors", "color wheel", "mix"],
      grammar: ["___ and ___ make ___.", "colour words"],
    },
    base: {
      title: "Mix a new colour",
      task: "Mix two colours with paint or crayons. Show your new colour and write what you mixed.",
      steps: [
        "Choose two colours that nobody mixed in class.",
        "Mix them with paint, or colour one on top of the other.",
        "Paint a big patch of your new colour.",
        "Write: ___ and ___ make ___.",
      ],
      frames: ["___ and ___ make ___.", "My new colour is ___.", "I like my colour because ___."],
      success: ["I can write two colours and the new colour.", "I can say my new colour."],
      challenge: "Find three things at home with a mixed colour. Draw them and say which two colours were mixed.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Mix a new kit colour",
          task: "Mix two colours to make a new colour for a football shirt. Show a shirt in your new colour and write what you mixed.",
          steps: [
            "Choose two colours, for example red and white.",
            "Mix them with paint, or colour one on top of the other.",
            "Draw a football shirt and paint it with your new colour.",
            "Write: ___ and ___ make ___.",
          ],
          frames: ["___ and ___ make ___.", "My new colour is ___.", "I like my shirt because ___."],
          success: ["I can write two colours and the new colour.", "I can say my new colour."],
          challenge: "Find three things at home with a mixed colour. Draw them and say which two colours were mixed.",
        },
      },
    ],
  },

  // Lesson 3: in, on, under, next to
  "od2e-l1-u04-l3": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["ocean", "sand", "seashell", "starfish", "jellyfish"],
      grammar: ["in / on / under / next to", "The ___ is ___ the ___."],
    },
    base: {
      title: "A good hiding place",
      task: "Draw a room or a beach. Hide a small animal in it and say why it is a good hiding place.",
      steps: [
        "Draw a room or a beach.",
        "Draw a small animal and hide it in, on, under or next to something.",
        "Write: The ___ is ___ the ___.",
        "Say why it is a good place for it to hide.",
      ],
      frames: ["The ___ is in the ___.", "The ___ is under the ___.", "The ___ is next to the ___.", "It is a good place because ___."],
      success: ["I can write in, on, under or next to in a sentence.", "I can say because."],
      challenge: "Write four sentences about your picture: one with in, on, under and next to.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Hide the ball at the stadium",
          task: "Draw the Emirates Stadium. Hide a small ball in it and say why it is a good hiding place.",
          steps: [
            "Draw a stadium with a goal, a bench and a pitch.",
            "Hide a ball in, on, under or next to something.",
            "Write: The ___ is ___ the ___.",
            "Say why it is a good place to hide the ball.",
          ],
          frames: ["The ball is in the ___.", "The ball is under the ___.", "The ball is next to the ___.", "It is a good place because ___."],
          success: ["I can write in, on, under or next to in a sentence.", "I can say because."],
          challenge: "Write four sentences about your picture: one with in, on, under and next to.",
        },
      },
    ],
  },

  // Lesson 4: clothes and colours
  "od2e-l1-u04-l4": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["jacket", "shorts", "sneakers", "T-shirt", "hat", "pants"],
      grammar: ["The superhero has a ___ ___.", "I have ___.", "It's ___."],
    },
    base: {
      title: "My superhero's clothes",
      task: "Invent a superhero. Draw its clothes, colour them and write about them.",
      steps: [
        "Draw your superhero from head to feet.",
        "Choose the clothes: a hat, a jacket, a T-shirt, shorts or sneakers.",
        "Colour each piece.",
        "Write: The superhero has a ___ ___.",
      ],
      frames: ["The superhero has a ___ ___.", "I have a ___ ___.", "It's a ___ ___."],
      success: ["I can write a colour word and a clothes word.", "I can say why I chose the colours."],
      challenge: "Write three sentences with I have, There's and It's. Check each capital letter and full stop.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football superhero",
          task: "Invent a superhero who plays for Arsenal. Draw its kit, colour it and write about it.",
          steps: [
            "Draw your superhero on the pitch at the Emirates Stadium.",
            "Choose the kit: a T-shirt, shorts and sneakers.",
            "Colour each piece.",
            "Write: The superhero has a ___ ___.",
          ],
          frames: ["The superhero has a ___ ___.", "I have a ___ ___.", "It's a ___ ___."],
          success: ["I can write a colour word and a clothes word.", "I can say why I chose the colours."],
          challenge: "Write three sentences with I have, There's and It's. Check each capital letter and full stop.",
        },
      },
    ],
  },

  // Lesson 5: wrap up
  "od2e-l1-u04-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["mix", "paint", "ocean", "hat", "jacket", "T-shirt"],
      grammar: ["___ and ___ make ___.", "I like ___.", "It's ___."],
    },
    base: {
      title: "My favourite colour mix",
      task: "Choose your favourite colour mix. Draw it and say why you like it best.",
      steps: [
        "Look back at the colours you mixed in Units 3 and 4.",
        "Choose your favourite mix and paint it.",
        "Write: ___ and ___ make ___.",
        "Write: I like ___. Tell someone why.",
      ],
      frames: ["___ and ___ make ___.", "I like ___.", "I like it because ___."],
      success: ["I can write the two colours and the new one.", "I can say why I like it."],
      challenge: "Find three things in the same colour. Draw them and write three sentences.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My favourite match day colours",
          task: "Choose your favourite colour mix for a football flag. Draw the flag and say why you like it best.",
          steps: [
            "Think of the colours at the Emirates Stadium on match day.",
            "Choose your favourite mix and paint a flag with it.",
            "Write: ___ and ___ make ___.",
            "Write: I like ___. Tell someone why.",
          ],
          frames: ["___ and ___ make ___.", "I like ___.", "I like it because ___."],
          success: ["I can write the two colours and the new one.", "I can say why I like it."],
          challenge: "Find three things in the same colour as your flag. Draw them and write three sentences.",
        },
      },
    ],
  },
};
