import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 4 "Mix It Up": one task
// per lesson, keyed by deck id, for children of about 7-8 (draw first, then write two to
// four short sentences). Every task has the class version (`base`) and one football edition;
// which children get the football edition is chosen per class in the app, never written
// here. Nothing asks a child to use a stove, a kettle or anything hot. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U04Creative: Record<string, Creative> = {
  // Lesson 1: foods and mixtures
  "od2e-l2-u04-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["cream", "sugar", "salt", "pour", "mixture", "freezer"],
      grammar: ["It has ... and ...", "I think it is ... because ..."],
    },
    base: {
      title: "My own mixture",
      task: "Invent a mixture. Draw it and write what is in it and what it is like.",
      steps: [
        "Think of two or three things to mix, for example cream and sugar.",
        "Draw your mixture in a bowl or a cup.",
        "Label what is in it.",
        "Write two sentences about it.",
      ],
      frames: ["My mixture is called ___.", "It has ___ and ___.", "I think it is ___ because ___.", "You can put it in the ___."],
      success: [
        "I can draw and label my mixture.",
        "I can write what is in it with It has ... and ... .",
        "I can say what it is like and why.",
      ],
      challenge: "Write one thing that is NOT in your mixture and say why you left it out.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Gunners' team drink",
          task: "Invent a mixture for the Arsenal players to drink after a match. Draw it and write what is in it and what it is like.",
          steps: [
            "Think of two or three things to mix, for example cream and sugar, or fruit.",
            "Draw your mixture in a cup in red and white.",
            "Label what is in it.",
            "Write two sentences about it.",
          ],
          frames: ["The team drink is called ___.", "It has ___ and ___.", "I think the players will like it because ___.", "You can keep it in the ___."],
          success: [
            "I can draw and label my mixture.",
            "I can write what is in it with It has ... and ... .",
            "I can say what it is like and why.",
          ],
          challenge: "Write one thing that is NOT in the drink and say why you left it out.",
        },
      },
    ],
  },

  // Lesson 2: Let's Make Ice Cream! (reading a play)
  "od2e-l2-u04-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["cream", "sugar", "pour", "plastic bags", "freezer", "mixture"],
      grammar: ["First, then", "because", "It was ... / They were ..."],
    },
    base: {
      title: "A recipe card for a cold treat",
      task: "Design a recipe card for a cold treat. Draw each step and write one short sentence for it.",
      steps: [
        "Choose a cold treat, for example ice cream.",
        "Draw three steps in order, for example pour, mix and freeze.",
        "Write one sentence under each picture with First, Then and At the end.",
        "Add a title and a picture of the finished treat.",
      ],
      frames: ["First, we pour ___.", "Then we ___.", "At the end, we put it in the ___.", "It is cold because ___."],
      success: [
        "I can draw three steps in order.",
        "I can write a sentence for each step.",
        "I can use words from today, for example pour or freezer.",
      ],
      challenge: "Write a warning for a friend, for example what to do first with a grown-up.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A recipe card for fans",
          task: "Design a recipe card for a cold treat that fans can make for a Gunners match day at home. Draw each step and write one short sentence for it.",
          steps: [
            "Choose a cold treat, for example ice cream.",
            "Draw three steps in order, for example pour, mix and freeze.",
            "Write one sentence under each picture with First, Then and At the end.",
            "Add a title and a picture of the finished treat with an Arsenal flag.",
          ],
          frames: ["First, we pour ___.", "Then we ___.", "At the end, we put it in the ___.", "The fans will like it because ___."],
          success: [
            "I can draw three steps in order.",
            "I can write a sentence for each step.",
            "I can use words from today, for example pour or freezer.",
          ],
          challenge: "Write a warning for a friend, for example what to do first with a grown-up.",
        },
      },
    ],
  },

  // Lesson 3: was and were, yesterday
  "od2e-l2-u04-l3": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["cream", "sugar", "mixture", "open", "closed", "freezer"],
      grammar: ["was / were", "Was it ...? Yes, it was.", "Where were ...?"],
    },
    base: {
      title: "The best part of the party",
      task: "Draw a party you went to yesterday or one you make up. Write what was fun and what changed.",
      steps: [
        "Draw the party and the people, the food and the games.",
        "Write three sentences with was or were.",
        "Choose the best part of the party.",
        "Say why it was the best part.",
      ],
      frames: ["The food was ___.", "The children were ___.", "The best part was ___.", "It was the best because ___."],
      success: [
        "I can draw a party with food and people.",
        "I can use was and were correctly.",
        "I can say what was the best part and why.",
      ],
      challenge: "Write two questions about your picture with Was or Were, and give the answers.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best part of the match",
          task: "Draw a match day at the Emirates Stadium, real or made up. Write what was fun and what changed.",
          steps: [
            "Draw the stadium, the fans and the food.",
            "Write three sentences with was or were.",
            "Choose the best part of the match day.",
            "Say why it was the best part.",
          ],
          frames: ["The food was ___.", "The fans were ___.", "The best part was ___.", "It was the best because ___."],
          success: [
            "I can draw a match day with food and people.",
            "I can use was and were correctly.",
            "I can say what was the best part and why.",
          ],
          challenge: "Write two questions about your picture with Was or Were, and give the answers.",
        },
      },
    ],
  },

  // Lesson 4: food words, contractions
  "od2e-l2-u04-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["salad", "fruit", "vegetables", "pasta", "tea", "mixture"],
      grammar: ["wasn't / weren't / isn't / aren't", "It has ... and ...", "because"],
    },
    base: {
      title: "Why you will like my mixture",
      task: "Invent a food mixture and make a poster to show why people will like it.",
      steps: [
        "Name your mixture, for example a fruit salad or a pasta mix.",
        "Draw it and label what is in it.",
        "Write three sentences: what is in it, what it is like and who would like it.",
        "Write one sentence with isn't, aren't, wasn't or weren't.",
      ],
      frames: ["My mixture is called ___.", "It has ___ and ___.", "It isn't ___. It is ___.", "___ will like it because ___."],
      success: [
        "I can draw and label my mixture.",
        "I can write three sentences about it.",
        "I can use one short form with n't.",
      ],
      challenge: "Write four sentences with wasn't, weren't, isn't and aren't about your mixture. Circle each apostrophe.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A mixture for the team bus",
          task: "Invent a food mixture for the Arsenal players to eat on the team bus and make a poster to show why they will like it.",
          steps: [
            "Name your mixture, for example a fruit salad or a pasta mix.",
            "Draw it and label what is in it.",
            "Write three sentences: what is in it, what it is like and which players would like it.",
            "Write one sentence with isn't, aren't, wasn't or weren't.",
          ],
          frames: ["The team mixture is called ___.", "It has ___ and ___.", "It isn't ___. It is ___.", "The Gunners will like it because ___."],
          success: [
            "I can draw and label my mixture.",
            "I can write three sentences about it.",
            "I can use one short form with n't.",
          ],
          challenge: "Write four sentences with wasn't, weren't, isn't and aren't about your mixture. Circle each apostrophe.",
        },
      },
    ],
  },

  // Lesson 5: wrap up, my mixture book
  "od2e-l2-u04-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["cream", "sugar", "salt", "mixture", "freezer", "fruit"],
      grammar: ["It has ... and ...", "It was ... Now it is ...", "because"],
    },
    base: {
      title: "Two mixtures, one page",
      task: "Add a new page to your Mixture Book with two mixtures. Say which one is better and why.",
      steps: [
        "Draw two mixtures side by side, one cold and one not cold.",
        "Label what is in each one.",
        "Write one sentence about each mixture.",
        "Choose the better one and say why.",
      ],
      frames: ["The first mixture has ___ and ___.", "The second mixture has ___.", "It was ___. Now it is ___.", "I think ___ is better because ___."],
      success: [
        "I can draw and label two mixtures.",
        "I can write a sentence about each one.",
        "I can choose one and give a reason.",
      ],
      challenge: "Say what would change in each mixture if you left it in the freezer overnight.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match-day menu page",
          task: "Add a match-day menu page to your Mixture Book with two mixtures for Gunners fans. Say which one is better and why.",
          steps: [
            "Draw two mixtures side by side, one cold and one not cold.",
            "Label what is in each one.",
            "Write one sentence about each mixture.",
            "Choose the better one for the Emirates Stadium and say why.",
          ],
          frames: ["The first mixture has ___ and ___.", "The second mixture has ___.", "It was ___. Now it is ___.", "The fans would choose ___ because ___."],
          success: [
            "I can draw and label two mixtures.",
            "I can write a sentence about each one.",
            "I can choose one and give a reason.",
          ],
          challenge: "Say what would change in each mixture if you left it in the freezer overnight.",
        },
      },
    ],
  },

  // Lesson 6: Grammar Champions, was and were
  "od2e-l2-u04-l6": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["freezer", "open", "closed", "cream", "mixture", "pour"],
      grammar: ["was / were", "Was ...? Yes, it was.", "but"],
    },
    base: {
      title: "The kitchen mystery",
      task: "Draw a kitchen from yesterday and a kitchen from today. Make three changes. Write clue sentences so a friend can find them.",
      steps: [
        "Draw the kitchen yesterday: the door, the window, the cups and something cold.",
        "Draw the kitchen today and change three things.",
        "Write three clue sentences about yesterday with was and were.",
        "Give your friend your clues. Can they find the three changes?",
      ],
      frames: ["Yesterday the ___ was ___.", "The ___ were ___.", "The ___ was ___, but now it is ___.", "Was the ___ ___? Yes, it was."],
      success: [
        "I drew two pictures with three changes.",
        "I used was with one thing and were with more than one.",
        "I used but in one clue.",
      ],
      challenge: "Write one sentence that says why a thing changed, with because or so.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The kit room mystery",
          task: "Draw a football kit room yesterday and today. Make three changes. Write clue sentences so a friend can find them.",
          steps: [
            "Draw the kit room yesterday: the door, the boots, the shirts and the water bottles.",
            "Draw the kit room today and change three things.",
            "Write three clue sentences about yesterday with was and were.",
            "Give your friend your clues. Can they find the three changes?",
          ],
          frames: ["Yesterday the ___ was ___.", "The boots were ___.", "The ___ was ___, but now it is ___.", "Were the ___ ___? Yes, they were."],
          success: [
            "I drew two pictures with three changes.",
            "I used was with one thing and were with more than one.",
            "I used but in one clue.",
          ],
          challenge: "Write one sentence that says why a thing changed, with because or so.",
        },
      },
    ],
  },
};
