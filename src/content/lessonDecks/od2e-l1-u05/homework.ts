import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 5 "Animal
// Homes": one task per lesson, keyed by deck id. Children are 6-7: draw, then
// write a few words or one short sentence. Every task has the class version
// (`base`) and one football edition, chosen per class in the app. All text is
// original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U5Creative: Record<string, Creative> = {
  // Lesson 1: animals and their homes
  "od2e-l1-u05-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["eagle", "nest", "hive", "honeybee", "crab", "opossum", "tree hollow"],
      grammar: ["This is a ___.", "It lives in a ___."],
    },
    base: {
      title: "A new animal and its home",
      task: "Invent a new animal and draw its home. Write where it lives.",
      steps: [
        "Draw your new animal. Give it a name.",
        "Draw its home: a nest, a hive, a tree hollow or a shell.",
        "Write: This is a ___.",
        "Write: It lives in a ___. Tell someone why the home is good.",
      ],
      frames: ["This is a ___.", "It lives in a ___.", "The home is good because ___."],
      success: ["I can write This is a ___.", "I can write It lives in a ___."],
      challenge: "Find an animal home near your house or school. Draw it and label it with two words.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A home near the stadium",
          task: "Invent a new animal that lives near the Emirates Stadium. Draw its home and write where it lives.",
          steps: [
            "Draw your new animal in red and white. Give it a name.",
            "Draw its home near the stadium: a nest, a hive or a tree hollow.",
            "Write: This is a ___.",
            "Write: It lives in a ___. Tell someone why the home is good.",
          ],
          frames: ["This is a ___.", "It lives in a ___.", "The home is good because ___."],
          success: ["I can write This is a ___.", "I can write It lives in a ___."],
          challenge: "Find an animal home near your house or school. Draw it and label it with two words.",
        },
      },
    ],
  },

  // Lesson 2: reading about animal homes
  "od2e-l1-u05-l2": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["nest", "hive", "eagle", "honeybee", "crab", "chick"],
      grammar: ["This is a ___.", "It is high / safe / dry."],
    },
    base: {
      title: "Two different homes",
      task: "Draw two different animal homes. Say which one you would like to visit and why.",
      steps: [
        "Draw a nest on one side of the page.",
        "Draw a different home on the other side, for example a hive.",
        "Write under each: This is a ___.",
        "Point to the one you would like to visit and say why.",
      ],
      frames: ["This is a ___.", "It is ___ (high, safe or dry).", "I would like to visit the ___ because ___."],
      success: ["I can write the name of each home.", "I can say which home I like and why."],
      challenge: "Write one more sentence about one home: where it is and one thing about it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two homes by the pitch",
          task: "Draw two different animal homes at a football pitch. Say which one you would like to visit and why.",
          steps: [
            "Draw a nest high in a tree by the pitch.",
            "Draw a different home on the other side, for example a hive near the goal.",
            "Write under each: This is a ___.",
            "Point to the one you would like to visit and say why.",
          ],
          frames: ["This is a ___.", "It is ___ (high, safe or dry).", "I would like to visit the ___ because ___."],
          success: ["I can write the name of each home.", "I can say which home I like and why."],
          challenge: "Write one more sentence about one home: where it is and one thing about it.",
        },
      },
    ],
  },

  // Lesson 3: where is it, where are they
  "od2e-l1-u05-l3": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["nest", "hive", "tree hollow", "crab", "squirrel", "mouse"],
      grammar: ["Where's the ___? It's in / on / under / next to ...", "Where are ...? They're ..."],
    },
    base: {
      title: "Hide and ask",
      task: "Hide a toy at home. Draw where it is, write the question and the answer, and ask someone to find it.",
      steps: [
        "Hide a small toy somewhere at home.",
        "Draw the place and the toy.",
        "Write: Where's the ___? It's under the ___.",
        "Ask someone at home to find it. Did they find it?",
      ],
      frames: ["Where's the ___?", "It's in / on / under / next to the ___.", "Where are the ___?", "They're ___."],
      success: ["I can ask Where's the ___?", "I can answer with in, on, under or next to."],
      challenge: "Write three questions about your room: one with Where's and two with Where are. Write the answers too.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Hide the football",
          task: "Hide a ball or a toy football at home. Draw where it is, write the question and the answer, and ask someone to find it.",
          steps: [
            "Hide a small ball or a toy football somewhere at home.",
            "Draw the place and the ball.",
            "Write: Where's the ball? It's under the ___.",
            "Ask someone at home to find it. Did they find it?",
          ],
          frames: ["Where's the ___?", "It's in / on / under / next to the ___.", "Where are the ___?", "They're ___."],
          success: ["I can ask Where's the ___?", "I can answer with in, on, under or next to."],
          challenge: "Write three questions about your football things: one with Where's and two with Where are. Write the answers too.",
        },
      },
    ],
  },

  // Lesson 4: more than one, listen, warn
  "od2e-l1-u05-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["woods", "field", "pond", "squirrel", "mouse", "frog"],
      grammar: ["more than one: -s, -es, mice, fish", "I would like to live in ___ because ___."],
    },
    base: {
      title: "One day in an animal home",
      task: "Choose an animal home you would like to live in for one day. Draw it and say why.",
      steps: [
        "Choose a home: a pond, a nest, a tree hollow or a hive.",
        "Draw the home and draw yourself in it.",
        "Write: I would like to live in a ___ because ___.",
        "Draw two animals next to you and write: Two ___.",
      ],
      frames: ["I would like to live in a ___ because ___.", "Two ___ live in the ___.", "Watch out! The ___!"],
      success: ["I can write a home word and say because.", "I can write more than one animal correctly (frogs, mice)."],
      challenge: "Write two sentences with mice, foxes or fish. Add a Watch out! warning.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Live near the Emirates Stadium",
          task: "Choose an animal home near a football stadium you would like to live in for one day. Draw it and say why.",
          steps: [
            "Choose a home near the stadium: a pond, a nest or a tree hollow.",
            "Draw the home and draw yourself in it, with a ball.",
            "Write: I would like to live in a ___ because ___.",
            "Draw two animals next to you and write: Two ___.",
          ],
          frames: ["I would like to live in a ___ because ___.", "Two ___ live in the ___.", "Watch out! The ball!"],
          success: ["I can write a home word and say because.", "I can write more than one animal correctly (frogs, mice)."],
          challenge: "Write two sentences with mice, foxes or fish. Add a Watch out! warning about the ball.",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions, Where's / Where are
  "od2e-l1-u05-l5": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["frog", "pond", "squirrel", "mouse", "nest", "hive", "woods"],
      grammar: ["Where's the ___?", "It's in / on / under the ___.", "Where are the ___?", "They're ___."],
    },
    base: {
      title: "My hide-and-find page",
      task: "Design a hide-and-find page. Hide one animal and two of another animal. Write a question and an answer for each.",
      steps: [
        "Draw a garden or a room with a tree, a pond, a log and a box.",
        "Hide one animal in one place and two animals of another kind in a second place.",
        "Write: Where's the ___? It's ___ the ___.",
        "Write: Where are the ___? They're ___ the ___. Say which hiding place is best.",
      ],
      frames: ["Where's the ___?", "It's in / on / under the ___.", "Where are the ___?", "They're next to the ___."],
      success: ["I can write one question for one animal and one for two animals.", "I can write the right answer: It's or They're."],
      challenge: "Hide a third animal and give your friend a clue: \"It's next to the pond. Where is it?\"",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Hide-and-find on the football pitch",
          task: "Design a hide-and-find page on a football pitch. Hide a ball and two boots. Write a question and an answer for each.",
          steps: [
            "Draw a football pitch with a goal, a bench, a bag and a flag.",
            "Hide one ball in one place and two boots in another place.",
            "Write: Where's the ball? It's ___ the ___.",
            "Write: Where are the boots? They're ___ the ___. Say which place is best.",
          ],
          frames: ["Where's the ___?", "It's in / on / under the ___.", "Where are the ___?", "They're next to the ___."],
          success: ["I can write one question for one thing and one for two things.", "I can write the right answer: It's or They're."],
          challenge: "Hide a third thing and give your friend a clue: \"It's next to the goal. Where is it?\"",
        },
      },
    ],
  },
};
