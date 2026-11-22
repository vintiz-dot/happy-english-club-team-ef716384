import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 7 "Seasons All Year":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U7Creative: Record<string, Creative> = {
  "od2e-l1-u07-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "warm",
        "hot",
        "cool",
        "cold",
        "rain",
        "snow"
      ],
      grammar: [
        "It's ___ and ___."
      ]
    },
    base: {
      title: "My new season",
      task: "Invent a fifth season. Draw it and give it a name. Write one short sentence about it.",
      steps: [
        "Think of a new season with its own weather.",
        "Draw the season on a big piece of paper.",
        "Write a name for it, for example Sunny-Snow.",
        "Copy the sentence and finish it: It's ___ and ___.",
        "Show your picture and say your sentence to someone at home."
      ],
      frames: [
        "It's ___ and ___.",
        "This is ___ season.",
        "It's hot and ___.",
        "I like it because it's ___."
      ],
      success: [
        "I can draw my new season.",
        "I can write: It's ___ and ___.",
        "I can say my sentence out loud."
      ],
      challenge: "Draw a second new season that is the opposite of the first one. Write: It's ___ and ___ in this season."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Weather at the Emirates Stadium",
          task: "Draw the Emirates Stadium on match day in the weather you choose. Write one short sentence about it.",
          steps: [
            "Think of match day for the Gunners. What is the weather?",
            "Draw the stadium and the weather: rain, snow, sun or cold wind.",
            "Write a name for your match day, for example Snow Day.",
            "Copy the sentence and finish it: It's ___ and ___.",
            "Show your picture and say your sentence to someone at home."
          ],
          frames: [
            "It's ___ and ___.",
            "This is a ___ match day.",
            "It's cold and ___.",
            "I like it because it's ___."
          ],
          success: [
            "I can draw the stadium and the weather.",
            "I can write: It's ___ and ___.",
            "I can say my sentence out loud."
          ],
          challenge: "Draw a second match day with the opposite weather. Write: It's ___ and ___ on this match day."
        }
      }
    ]
  },
  "od2e-l1-u07-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: [
        "spring",
        "summer",
        "fall",
        "winter",
        "flower",
        "leaf"
      ],
      grammar: [
        "It's ___ in the ___.",
        "I like ___."
      ]
    },
    base: {
      title: "My tree in four seasons",
      task: "Draw one tree four times, once in each season. Write a short caption under each picture. Then choose the tree you like best.",
      steps: [
        "Fold a paper into four squares.",
        "Draw the same tree in each square: spring, summer, fall and winter.",
        "Write a caption under each one: spring, summer, fall, winter.",
        "Put a star on the tree you like best.",
        "Say to someone at home: I like ___."
      ],
      frames: [
        "It's ___.",
        "The tree has ___.",
        "I see ___ in the ___.",
        "I like the ___ tree."
      ],
      success: [
        "I can draw a tree in four seasons.",
        "I can write a caption for each picture.",
        "I can say which tree I like best."
      ],
      challenge: "Write why you like it: I like the ___ tree because it has ___."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The pitch in four seasons",
          task: "Draw a football pitch four times, once in each season. Write a short caption under each picture. Then choose the season you like best for a match.",
          steps: [
            "Fold a paper into four squares.",
            "Draw the pitch in each square: spring, summer, fall and winter. Add leaves, flowers or snow.",
            "Write a caption under each one: spring, summer, fall, winter.",
            "Put a star on the pitch you like best for an Arsenal match.",
            "Say to someone at home: I like ___."
          ],
          frames: [
            "It's ___.",
            "The pitch has ___.",
            "I see ___ in the ___.",
            "I like the ___ match."
          ],
          success: [
            "I can draw a pitch in four seasons.",
            "I can write a caption for each picture.",
            "I can say which season I like best."
          ],
          challenge: "Write why you like it: I like the ___ match because it's ___."
        }
      }
    ]
  },
  "od2e-l1-u07-l3": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "hot",
        "cold",
        "rain",
        "snow",
        "summer",
        "winter"
      ],
      grammar: [
        "It + verb with -s",
        "It doesn't + short verb"
      ]
    },
    base: {
      title: "A place with its own weather",
      task: "Make up a planet or an island. Draw it. Write two sentences about its weather.",
      steps: [
        "Choose a made-up place: a planet or an island.",
        "Decide: what does it do there, and what does it not do?",
        "Draw the place and its weather.",
        "Copy and finish two sentences.",
        "Read your sentences to someone at home."
      ],
      frames: [
        "It doesn't ___ there.",
        "It ___s all year.",
        "It gets ___ in the ___.",
        "It snows in the ___."
      ],
      success: [
        "I can draw my place and its weather.",
        "I can write: It doesn't ___ there.",
        "I can write: It ___s all year."
      ],
      challenge: "Add a third sentence: It gets ___ in the ___. Check the s on the action word."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A stadium with its own weather",
          task: "Make up a football stadium on a faraway planet. Draw it. Write two sentences about its weather.",
          steps: [
            "Choose a made-up stadium on a planet.",
            "Decide: what does it do there, and what does it not do?",
            "Draw the stadium and its weather.",
            "Copy and finish two sentences.",
            "Read your sentences to someone at home."
          ],
          frames: [
            "It doesn't ___ at the stadium.",
            "It ___s all year.",
            "It gets ___ in the ___.",
            "It snows on match day."
          ],
          success: [
            "I can draw my stadium and its weather.",
            "I can write: It doesn't ___ there.",
            "I can write: It ___s all year."
          ],
          challenge: "Add a third sentence: It gets ___ in the ___. Check the s on the action word."
        }
      }
    ]
  },
  "od2e-l1-u07-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: [
        "sunny",
        "cloudy",
        "windy",
        "snowy",
        "rainy",
        "weather"
      ],
      grammar: [
        "Do you want to play ___ with me?",
        "It's ___."
      ]
    },
    base: {
      title: "The best weather for my game",
      task: "Make an invitation card for a friend. Draw the weather you like best and the game you want to play. Say why it is the best weather.",
      steps: [
        "Choose your best weather: sunny, windy, snowy or rainy.",
        "Choose a game to play in it.",
        "Draw the weather and the game on a card.",
        "Copy the question: Do you want to play ___ with me?",
        "Give the card to someone at home and say why it is the best weather."
      ],
      frames: [
        "Do you want to play ___ with me?",
        "It's ___.",
        "I like ___ weather.",
        "It's the best because ___."
      ],
      success: [
        "I can draw the weather and a game.",
        "I can write: Do you want to play ___ with me?",
        "I can say why I like this weather."
      ],
      challenge: "Make a second card for a different weather. Say which weather is better for your game, and why."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best weather for a match",
          task: "Make an invitation card for a friend to play football. Draw the weather you like best for a match. Say why it is the best weather.",
          steps: [
            "Choose your best weather for football: sunny, windy, snowy or rainy.",
            "Draw the pitch and the weather on a card.",
            "Add a ball and the Gunners' red and white colours.",
            "Copy the question: Do you want to play football with me?",
            "Give the card to someone at home and say why it is the best weather."
          ],
          frames: [
            "Do you want to play football with me?",
            "It's ___.",
            "I like ___ weather for a match.",
            "It's the best because ___."
          ],
          success: [
            "I can draw the weather and a match.",
            "I can write: Do you want to play football with me?",
            "I can say why I like this weather."
          ],
          challenge: "Make a second card for a different weather. Say which weather is better for a match, and why."
        }
      }
    ]
  }
};
