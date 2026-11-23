import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 3 "Colors
// All Around": one task per lesson, keyed by deck id. Children are 6-7: draw
// and colour, then write a few words or one short sentence. Every task has the
// class version (`base`) and one football edition, chosen per class in the app.
// All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U3Creative: Record<string, Creative> = {
  // Lesson 1: eight colours
  "od2e-l1-u03-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["yellow", "red", "blue", "green", "purple", "black", "brown", "white"],
      grammar: ["I see a ___ ___.", "colour words"],
    },
    base: {
      title: "My colour hunt",
      task: "Find five things at home. Draw them, colour them and write the colour word under each one.",
      steps: [
        "Walk around your home and find five things with a colour.",
        "Draw each thing on your page.",
        "Colour each one carefully.",
        "Write the colour word under each one, then show your favourite to someone.",
      ],
      frames: ["I see a ___ ___.", "It is ___.", "My favourite is the ___ ___."],
      success: ["I can write a colour word under each picture.", "I can say I see a ___ ___."],
      challenge: "Write three sentences: I see a ___ ___.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My match day colour hunt",
          task: "Draw five things you could see at an Arsenal match at the Emirates Stadium. Colour them and write the colour word under each one.",
          steps: [
            "Think of five things at a match: a shirt, a ball, a scarf, the grass, a flag.",
            "Draw each thing on your page.",
            "Colour each one carefully.",
            "Write the colour word under each one, then show your favourite to someone.",
          ],
          frames: ["I see a ___ ___.", "It is ___.", "My favourite is the ___ ___."],
          success: ["I can write a colour word under each picture.", "I can say I see a ___ ___."],
          challenge: "Write three sentences: I see a ___ ___.",
        },
      },
    ],
  },

  // Lesson 2: poems about colours
  "od2e-l1-u03-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["red", "blue", "green", "yellow", "brown", "black"],
      grammar: ["a ___ ___", "colour before the thing"],
    },
    base: {
      title: "A tree of colours",
      task: "Draw a tree with three animals. Choose real or silly colours and label each animal.",
      steps: [
        "Draw a big tree.",
        "Draw three animals in or under the tree.",
        "Colour them. Real or silly colours are both fine!",
        "Write a label for each animal, for example: a blue cat.",
      ],
      frames: ["a ___ ___", "This is a ___ ___.", "I like the ___ ___."],
      success: ["I can write a colour word and an animal word together.", "I can say why I chose my colours."],
      challenge: "Write two lines that end with a rhyming word, like cat and hat.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Colours of the Gunners",
          task: "Draw a football team of three animals in their kit. Choose the colours and label each animal.",
          steps: [
            "Draw three animals ready to play at the Emirates Stadium.",
            "Colour their shirts. Real Arsenal colours or silly colours are both fine!",
            "Write a label for each animal, for example: a red cat.",
            "Tell someone why you chose the colours.",
          ],
          frames: ["a ___ ___", "This is a ___ ___.", "I like the ___ ___."],
          success: ["I can write a colour word and an animal word together.", "I can say why I chose my colours."],
          challenge: "Write two lines that end with a rhyming word, like ball and wall.",
        },
      },
    ],
  },

  // Lesson 3: there is, there are
  "od2e-l1-u03-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["red", "blue", "yellow", "green", "brown", "white"],
      grammar: ["There is a ___.", "There are ___.", "one and more than one"],
    },
    base: {
      title: "My crazy room",
      task: "Draw a silly room. Put one silly thing and two silly things in it, then write about them.",
      steps: [
        "Draw the walls and the floor of a room.",
        "Put one silly thing in it, for example a green chair.",
        "Put two silly things in it, for example two blue cats.",
        "Write one sentence with There is and one with There are.",
      ],
      frames: ["There is a ___ ___.", "There are two ___ ___s.", "I like the ___."],
      success: ["I can write There is for one thing.", "I can write There are and add -s for more than one."],
      challenge: "Write two more sentences and say which colour you like best in the room.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My crazy football pitch",
          task: "Draw a silly football pitch. Put one silly thing and two silly things on it, then write about them.",
          steps: [
            "Draw a pitch with a goal at each end.",
            "Put one silly thing on it, for example a purple ball.",
            "Put two silly things on it, for example two brown dogs.",
            "Write one sentence with There is and one with There are.",
          ],
          frames: ["There is a ___ ___.", "There are two ___ ___s.", "I like the ___."],
          success: ["I can write There is for one thing.", "I can write There are and add -s for more than one."],
          challenge: "Write two more sentences and say which colour you like best on the pitch.",
        },
      },
    ],
  },

  // Lesson 4: fireworks, dark and light colours
  "od2e-l1-u03-l4": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["fireworks", "dark", "light", "orange", "pink", "gray"],
      grammar: ["There are ___ fireworks.", "I like ___ because ___."],
    },
    base: {
      title: "My best firework",
      task: "Invent a firework. Draw it, name it and say why it is special.",
      steps: [
        "Draw a dark sky.",
        "Draw your new firework with light colours.",
        "Give it a name and write it under the picture.",
        "Write: There are ___ colours. Say why it is special.",
      ],
      frames: ["It is ___ and ___.", "There are ___ colours.", "I like it because ___."],
      success: ["I can write colour words for my firework.", "I can say why I like it."],
      challenge: "Write a four-line poem about one colour. Make two lines end with the same sound.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Fireworks over the Emirates Stadium",
          task: "Invent a firework to celebrate an Arsenal win. Draw it over the Emirates Stadium, name it and say why it is special.",
          steps: [
            "Draw the Emirates Stadium under a dark sky.",
            "Draw your new firework with light colours above it.",
            "Give it a name and write it under the picture.",
            "Write: There are ___ colours. Say why it is special.",
          ],
          frames: ["It is ___ and ___.", "There are ___ colours.", "I like it because ___."],
          success: ["I can write colour words for my firework.", "I can say why I like it."],
          challenge: "Write a four-line poem about a red firework. Make two lines end with the same sound.",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions, There is / There are
  "od2e-l1-u03-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["red", "blue", "yellow", "green", "orange", "pink"],
      grammar: ["There is a ___ ___.", "There are ___ ___s.", "one and more than one"],
    },
    base: {
      title: "My magic garden",
      task: "Invent a magic garden. Draw it with one special thing and many of another thing. Write what is there.",
      steps: [
        "Draw a garden with a path and a pond.",
        "Add one magic thing, for example a pink tree.",
        "Add many of another thing, for example three blue butterflies.",
        "Write one sentence with There is and one with There are. Choose your favorite part and say why.",
      ],
      frames: ["There is a ___ ___.", "There are ___ ___s.", "My favorite part is ___ because ___."],
      success: ["I can write There is for one thing.", "I can write There are and add -s for more than one.", "I can say why I like one part."],
      challenge: "Write two more sentences about the sky above your garden. Use There's once.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My magic football stadium",
          task: "Invent a magic stadium. Draw it with one special thing and many of another thing. Write what is there.",
          steps: [
            "Draw a stadium with a pitch and the stands.",
            "Add one magic thing, for example a gold ball.",
            "Add many of another thing, for example five green flags.",
            "Write one sentence with There is and one with There are. Choose your favorite part and say why.",
          ],
          frames: ["There is a ___ ___.", "There are ___ ___s.", "My favorite part is ___ because ___."],
          success: ["I can write There is for one thing.", "I can write There are and add -s for more than one.", "I can say why I like one part."],
          challenge: "Write two more sentences about the fans in the stands. Use There's once.",
        },
      },
    ],
  },
};
