import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 1
// "Families and Friends": one task per lesson, keyed by deck id. Children are
// 6-7, so each task is draw-and-say or draw-and-label with a few words. Every
// task has the class version (`base`) and one football edition; which children
// get it is chosen per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U1Creative: Record<string, Creative> = {
  // Lesson 1: family words
  "od2e-l1-u01-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["mother", "father", "brother", "sister", "family", "friend"],
      grammar: ["This is my ___.", "family words"],
    },
    base: {
      title: "My made-up family",
      task: "Draw a funny made-up family (monsters, robots or animals). Write a family word under each one.",
      steps: [
        "Draw two or three made-up people or animals.",
        "Write a family word under each one: mother, father, brother or sister.",
        "Colour your picture.",
        "Show it to someone at home and say: This is my family.",
      ],
      frames: ["This is my ___.", "This is my monster family.", "I like my ___."],
      success: ["I can write a family word under each picture.", "I can say This is my ___."],
      challenge: "Add a friend to your picture and write: My friend is ___.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football family",
          task: "Draw a family on match day, all cheering for Arsenal at the Emirates Stadium. Write a family word under each one.",
          steps: [
            "Draw two or three people in red and white, ready for the match.",
            "Write a family word under each one: mother, father, brother or sister.",
            "Colour your picture and draw the Emirates Stadium behind them.",
            "Show it to someone at home and say: This is my family.",
          ],
          frames: ["This is my ___.", "My ___ likes the Gunners.", "I like my ___."],
          success: ["I can write a family word under each picture.", "I can say This is my ___."],
          challenge: "Add a friend who sits next to you at the match and write: My friend is ___.",
        },
      },
    ],
  },

  // Lesson 2: story words, big and small families
  "od2e-l1-u01-l2": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["live with", "together", "help", "love", "big family", "small family"],
      grammar: ["This family is big / small.", "is for one thing"],
    },
    base: {
      title: "A big family and a small family",
      task: "Draw a big family and a small family. Write a sentence under each one and choose which you would like to visit.",
      steps: [
        "Draw a big family on one side of the page.",
        "Draw a small family on the other side.",
        "Write a sentence under each: This family is big. This family is small.",
        "Point to the family you would like to visit and say why.",
      ],
      frames: ["This family is ___.", "I want to visit this family.", "They ___ together."],
      success: ["I can write big and small under the right family.", "I can say which family I like."],
      challenge: "Write one more sentence: They play together. Or: They help ___.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A big team and a small team",
          task: "Draw a big group of Arsenal fans and a small group of fans. Write a sentence under each and choose which group you would like to sit with.",
          steps: [
            "Draw a big group of fans in red and white.",
            "Draw a small group of fans on the other side.",
            "Write a sentence under each: This family is big. This family is small.",
            "Point to the group you would like to sit with and say why.",
          ],
          frames: ["This family is ___.", "I want to sit with this family.", "They cheer together."],
          success: ["I can write big and small under the right group.", "I can say which group I like."],
          challenge: "Write one more sentence: They play together. Or: They love the Gunners.",
        },
      },
    ],
  },

  // Lesson 3: I'm, he's, she's, is and are
  "od2e-l1-u01-l3": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["family", "friend", "big", "small"],
      grammar: ["I'm / he's / she's", "is and are", "My family is ___."],
    },
    base: {
      title: "Meet my character",
      task: "Make a character (a robot, an animal or a superhero). Draw it and write how old it is.",
      steps: [
        "Draw your character. Give it a name.",
        "Write: This is ___.",
        "Write how old it is: He's ___ years old. Or: She's ___ years old.",
        "Say if its family is big or small: Its family is big.",
      ],
      frames: ["This is ___.", "He's / She's ___ years old.", "My family is ___."],
      success: ["I can write He's or She's and an age.", "I can say is for one family."],
      challenge: "Write: My friends are ___. Use are because there is more than one friend.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Meet my team mascot",
          task: "Make a mascot for a football team (an animal or a robot). Draw it in red and white and write how old it is.",
          steps: [
            "Draw your mascot at the Emirates Stadium. Give it a name.",
            "Write: This is ___.",
            "Write how old it is: He's ___ years old. Or: She's ___ years old.",
            "Say if its team is big or small: Its team is big.",
          ],
          frames: ["This is ___.", "He's / She's ___ years old.", "My team is ___."],
          success: ["I can write He's or She's and an age.", "I can say is for one team."],
          challenge: "Write: The fans are ___. Use are because there is more than one fan.",
        },
      },
    ],
  },

  // Lesson 4: uncle, aunt, cousin and more
  "od2e-l1-u01-l4": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["uncle", "aunt", "cousin", "parents", "son", "daughter"],
      grammar: ["I like ___ because ___.", "This is my ___."],
    },
    base: {
      title: "My favourite family member",
      task: "Draw an animal family or a space family. Label each one with a family word, then choose your favourite.",
      steps: [
        "Draw three animals or aliens in one family.",
        "Write a family word under each: uncle, aunt, cousin, son or daughter.",
        "Colour your picture.",
        "Choose your favourite and say: I like ___ because ___.",
      ],
      frames: ["This is my ___.", "I like ___.", "I like ___ because ___."],
      success: ["I can label each picture with a family word.", "I can say I like ___ because ___."],
      challenge: "Write one sentence about your favourite: My ___ is ___ (kind, funny or big).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football fan family",
          task: "Draw a family of Arsenal fans (people, animals or aliens). Label each one with a family word, then choose your favourite fan.",
          steps: [
            "Draw three fans in red and white at the Emirates Stadium.",
            "Write a family word under each: uncle, aunt, cousin, son or daughter.",
            "Colour your picture.",
            "Choose your favourite fan and say: I like ___ because ___.",
          ],
          frames: ["This is my ___.", "I like ___.", "I like ___ because ___."],
          success: ["I can label each picture with a family word.", "I can say I like ___ because ___."],
          challenge: "Write one sentence about your favourite fan: My ___ is ___ (kind, funny or loud).",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions (I'm, he's, she's, is and are)
  "od2e-l1-u01-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["family", "friend", "brother", "sister", "big", "small"],
      grammar: ["I'm / he's / she's", "is and are", "This family is ___."],
    },
    base: {
      title: "My made-up family",
      task: "Draw an animal family or a space family. Tell who they are and how old they are, then choose your favorite one and say why.",
      steps: [
        "Draw three or four animals or aliens in one family.",
        "Write: This is ___. He's / She's ___ years old.",
        "Write about the whole family: This family is big. Or: This family is small.",
        "Choose your favorite one and say why: I like ___ because ___.",
      ],
      frames: ["This is ___.", "He's / She's ___ years old.", "This family is ___.", "I like ___ because ___."],
      success: ["I can write He's or She's and an age.", "I can write is for one family.", "I can say why I like one of them."],
      challenge: "Add two friends to your picture and write: ___ and ___ are friends.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My football team family",
          task: "Draw a team of animal footballers who are also a family. Tell who they are and how old they are, then choose your favorite player and say why.",
          steps: [
            "Draw three or four animal footballers in team shirts.",
            "Write: This is ___. He's / She's ___ years old.",
            "Write about the team: This family is big. Or: This family is small.",
            "Choose your favorite player and say why: I like ___ because ___.",
          ],
          frames: ["This is ___.", "He's / She's ___ years old.", "This team is ___.", "I like ___ because ___."],
          success: ["I can write He's or She's and an age.", "I can write is for one team.", "I can say why I like one player."],
          challenge: "Add two fans in the stands and write: ___ and ___ are fans.",
        },
      },
    ],
  },
};
