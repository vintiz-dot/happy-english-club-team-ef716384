import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 6 "Animal
// Reserves": one task per lesson, keyed by deck id. Children are 6-7: draw,
// then write a few words or one short sentence. Every task has the class version
// (`base`) and one football edition, chosen per class in the app. All text is
// original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U6Creative: Record<string, Creative> = {
  // Lesson 1: animal reserve words
  "od2e-l1-u06-l1": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["orangutan", "rainforest", "reserve", "teach", "take care of", "put out"],
      grammar: ["This is a ___.", "It lives in a ___."],
    },
    base: {
      title: "My animal reserve",
      task: "Draw a reserve with one animal and one keeper. Choose which animal you would look after and say why.",
      steps: [
        "Draw a reserve with trees and a pond.",
        "Draw one animal and one keeper.",
        "Write: This is a ___. It lives in a ___.",
        "Write which animal you would look after and say why.",
      ],
      frames: ["This is a ___.", "It lives in a ___.", "I would take care of the ___ because ___."],
      success: ["I can write This is a ___.", "I can say which animal I would look after and why."],
      challenge: "Write three sentences with take care of, teach and put out.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A reserve beside the stadium",
          task: "Draw a reserve beside the Emirates Stadium with one animal and one keeper. Choose which animal you would look after and say why.",
          steps: [
            "Draw a reserve with trees, a pond and the stadium behind it.",
            "Draw one animal and one keeper in a red and white cap.",
            "Write: This is a ___. It lives in a ___.",
            "Write which animal you would look after and say why.",
          ],
          frames: ["This is a ___.", "It lives in a ___.", "I would take care of the ___ because ___."],
          success: ["I can write This is a ___.", "I can say which animal I would look after and why."],
          challenge: "Write three sentences with take care of, teach and put out.",
        },
      },
    ],
  },

  // Lesson 2: reading a story about a friend
  "od2e-l1-u06-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["orangutan", "rainforest", "reserve", "take care of", "miss", "teach"],
      grammar: ["___ is ___.", "First, Then, At the end"],
    },
    base: {
      title: "A new page for the story",
      task: "Draw Anak and Dian, then think of a surprise for the story and draw it.",
      steps: [
        "Draw Anak and Dian together.",
        "Write one sentence about each: Anak is ___. Dian is ___.",
        "Think of a surprise, for example a new friend arrives.",
        "Draw the surprise and tell the story: First, Then, At the end.",
      ],
      frames: ["Anak is ___.", "Dian is ___.", "First, ___.", "Then, ___.", "At the end, ___."],
      success: ["I can write one sentence about each character.", "I can tell my story in the right order."],
      challenge: "Write one sentence for each part of your story: First, Then and At the end.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match day surprise",
          task: "Draw Anak and Dian at a football match, then think of a surprise for the story and draw it.",
          steps: [
            "Draw Anak and Dian at the Emirates Stadium.",
            "Write one sentence about each: Anak is ___. Dian is ___.",
            "Think of a surprise, for example a goal!",
            "Draw the surprise and tell the story: First, Then, At the end.",
          ],
          frames: ["Anak is ___.", "Dian is ___.", "First, ___.", "Then, ___.", "At the end, ___."],
          success: ["I can write one sentence about each character.", "I can tell my story in the right order."],
          challenge: "Write one sentence for each part of your story: First, Then and At the end.",
        },
      },
    ],
  },

  // Lesson 3: What's this? Who's that?
  "od2e-l1-u06-l3": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["orangutan", "reserve", "rainforest", "take care of"],
      grammar: ["What's this? It's a ___.", "Who's that? It's ___.", "What and who"],
    },
    base: {
      title: "What's this? Who's that?",
      task: "Draw four things and one toy friend. Write a question and an answer for each.",
      steps: [
        "Draw four things from your room or garden.",
        "Write for each: What's this? It's a ___.",
        "Draw a toy friend and give it a funny name.",
        "Write: Who's this? It's ___.",
      ],
      frames: ["What's this?", "It's a ___.", "Who's that?", "It's ___."],
      success: ["I can ask What's this? and answer It's a ___.", "I can ask Who's that? about a friend."],
      challenge: "Write a short talk of four lines with What's that? and Who's that? Act it out with someone.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "What's this at the match?",
          task: "Draw four football things and one toy fan. Write a question and an answer for each.",
          steps: [
            "Draw four things from match day: a ball, a scarf, a goal, a flag.",
            "Write for each: What's this? It's a ___.",
            "Draw a toy fan and give it a funny name.",
            "Write: Who's this? It's ___.",
          ],
          frames: ["What's this?", "It's a ___.", "Who's that?", "It's ___."],
          success: ["I can ask What's this? and answer It's a ___.", "I can ask Who's that? about a fan."],
          challenge: "Write a short talk of four lines with What's that? and Who's that? Act it out with someone.",
        },
      },
    ],
  },

  // Lesson 4: times of day and clues
  "od2e-l1-u06-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["day", "night", "morning", "afternoon", "evening", "take a nap"],
      grammar: ["It sleeps in the ___.", "What does it do in the morning?"],
    },
    base: {
      title: "A mystery animal",
      task: "Draw a mystery animal in its home at night. Write clues so someone can guess it.",
      steps: [
        "Draw an animal in its home at night.",
        "Write where it sleeps: It sleeps in a ___.",
        "Write two more clues about the animal.",
        "Ask someone at home: What is it?",
      ],
      frames: ["It sleeps in a ___.", "In the morning it ___.", "At night it ___.", "What is it?"],
      success: ["I can write a clue with a time of day.", "I can ask What is it?"],
      challenge: "Write three clues and one question. Ask someone to guess your animal.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The stadium mystery",
          task: "Draw a mystery animal near the Emirates Stadium at night. Write clues so someone can guess it.",
          steps: [
            "Draw an animal near the stadium at night.",
            "Write where it sleeps: It sleeps in a ___.",
            "Write two more clues about the animal, for example what it does on match day.",
            "Ask someone at home: What is it?",
          ],
          frames: ["It sleeps in a ___.", "In the morning it ___.", "At night it ___.", "What is it?"],
          success: ["I can write a clue with a time of day.", "I can ask What is it?"],
          challenge: "Write three clues and one question. Ask someone to guess your animal.",
        },
      },
    ],
  },

  // Lesson 5: wrap up
  "od2e-l1-u06-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["reserve", "rainforest", "take care of", "day", "night", "orangutan"],
      grammar: ["This is a ___.", "It lives in ___.", "What's this? Who's that?"],
    },
    base: {
      title: "A new home for my animal",
      task: "Invent an animal and draw a new home for it. Name it and say why it is a good home.",
      steps: [
        "Invent an animal and give it a name.",
        "Draw a new home for it in a reserve.",
        "Write: This is a ___. It lives in ___.",
        "Say why it is a good home.",
      ],
      frames: ["This is a ___.", "It lives in ___.", "It is a good home because ___."],
      success: ["I can write This is a ___.", "I can say why it is a good home."],
      challenge: "Write three clues about your animal. Ask someone to guess it, then swap.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A home for the stadium animal",
          task: "Invent an animal that cheers for Arsenal and draw a new home for it. Name it and say why it is a good home.",
          steps: [
            "Invent a football-loving animal and give it a name.",
            "Draw a new home for it near the Emirates Stadium.",
            "Write: This is a ___. It lives in ___.",
            "Say why it is a good home.",
          ],
          frames: ["This is a ___.", "It lives in ___.", "It is a good home because ___."],
          success: ["I can write This is a ___.", "I can say why it is a good home."],
          challenge: "Write three clues about your animal. Ask someone to guess it, then swap.",
        },
      },
    ],
  },
};
