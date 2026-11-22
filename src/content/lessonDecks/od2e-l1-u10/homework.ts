import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 10 "Soup, Fruit and Adding Up":
// one task per lesson, keyed by deck id. Every task has the class version (base) and one
// football edition. Which children get the football edition is chosen per class in the
// app, never written here. The children are 6-7: draw, say, then copy or finish a very
// short sentence. A grown-up may read the steps aloud. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U10Creative: Record<string, Creative> = {
  "od2e-l1-u10-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "pot",
        "stone",
        "food",
        "carrots",
        "onions",
        "potatoes",
        "soup"
      ],
      grammar: [
        "I put ___ in my soup."
      ]
    },
    base: {
      title: "My soup pot",
      task: "Draw your own soup pot. Put three foods in it. Write one short sentence.",
      steps: [
        "Draw a big pot.",
        "Draw three foods in the pot: carrots, onions, potatoes or sausages.",
        "Give your soup a name.",
        "Copy and finish: I put ___, ___ and ___ in my soup.",
        "Say to someone at home why you chose them."
      ],
      frames: [
        "I put ___ in my soup.",
        "My soup has ___.",
        "I like ___.",
        "I chose ___ because ___."
      ],
      success: [
        "I can draw a pot with three foods.",
        "I can write: I put ___ in my soup.",
        "I can say why I chose them."
      ],
      challenge: "Draw one thing we don't eat next to your pot. Write: We don't eat ___."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A soup for the Gunners",
          task: "Draw a soup pot for the Arsenal players after a match. Put three foods in it. Write one short sentence.",
          steps: [
            "Draw a big pot.",
            "Draw three foods in the pot: carrots, onions, potatoes or sausages.",
            "Give your soup a name, for example Match Day Soup.",
            "Copy and finish: I put ___, ___ and ___ in my soup.",
            "Say to someone at home why you chose them."
          ],
          frames: [
            "I put ___ in my soup.",
            "My soup has ___.",
            "The Gunners like ___.",
            "I chose ___ because ___."
          ],
          success: [
            "I can draw a pot with three foods.",
            "I can write: I put ___ in my soup.",
            "I can say why I chose them."
          ],
          challenge: "Draw one thing we don't eat before a match next to your pot. Write: We don't eat ___."
        }
      }
    ]
  },
  "od2e-l1-u10-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "pot",
        "stone",
        "soup",
        "add",
        "food",
        "potatoes"
      ],
      grammar: [
        "I add ___.",
        "Beginning, middle, end"
      ]
    },
    base: {
      title: "Add to the pot",
      task: "Draw your own soup pot. Add two foods. Write one short sentence.",
      steps: [
        "Draw a pot with a stone in it.",
        "Choose two foods to add.",
        "Draw them going in the pot.",
        "Copy and finish: I add ___ and ___.",
        "Say to someone at home why you chose them."
      ],
      frames: [
        "I add ___.",
        "I add ___ and ___.",
        "The soup is ___.",
        "I chose ___ because ___."
      ],
      success: [
        "I can draw a pot with two foods.",
        "I can write: I add ___ and ___.",
        "I can say why I chose them."
      ],
      challenge: "Tell a grown-up the story in three parts: beginning, middle, end. Ask: What do you think the story says?"
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Add to the pot for the fans",
          task: "Draw a big soup pot outside the Emirates Stadium. Add two foods for the hungry fans. Write one short sentence.",
          steps: [
            "Draw a pot with a stone in it near the stadium.",
            "Choose two foods to add for the fans.",
            "Draw them going in the pot.",
            "Copy and finish: I add ___ and ___.",
            "Say to someone at home why you chose them."
          ],
          frames: [
            "I add ___.",
            "I add ___ and ___ for the fans.",
            "The soup is ___.",
            "I chose ___ because ___."
          ],
          success: [
            "I can draw a pot with two foods.",
            "I can write: I add ___ and ___.",
            "I can say why I chose them."
          ],
          challenge: "Tell a grown-up the story in three parts: beginning, middle, end. Ask: What do you think the story says?"
        }
      }
    ]
  },
  "od2e-l1-u10-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: [
        "pot",
        "ruler",
        "carrots",
        "onions",
        "basket",
        "soup"
      ],
      grammar: [
        "Do you have ___? Yes, I do. No, I don't.",
        "I have ___."
      ]
    },
    base: {
      title: "My basket",
      task: "Draw a basket. Put three things in it. Write what you have. Then ask someone a question.",
      steps: [
        "Draw a big basket.",
        "Draw three things in it.",
        "Copy and finish: I have ___, ___ and ___.",
        "Ask someone at home: Do you have ___?",
        "Write their answer: Yes, I do. or No, I don't."
      ],
      frames: [
        "I have ___.",
        "Do you have ___?",
        "Yes, I do.",
        "No, I don't."
      ],
      success: [
        "I can draw a basket with three things.",
        "I can write: I have ___.",
        "I can ask: Do you have ___?"
      ],
      challenge: "Make a mini song: Do you have ___? Yes, I do. I have ___. Sing it to a grown-up."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My match-day basket",
          task: "Draw a basket for a football match. Put three things in it. Write what you have. Then ask someone a question.",
          steps: [
            "Draw a big basket.",
            "Draw three things in it, for example a scarf, a ball and an apple.",
            "Copy and finish: I have ___, ___ and ___.",
            "Ask someone at home: Do you have ___?",
            "Write their answer: Yes, I do. or No, I don't."
          ],
          frames: [
            "I have ___.",
            "Do you have ___?",
            "Yes, I do.",
            "No, I don't."
          ],
          success: [
            "I can draw a basket with three things.",
            "I can write: I have ___.",
            "I can ask: Do you have ___?"
          ],
          challenge: "Make a mini song: Do you have ___? Yes, I do. I have ___. Sing it to a grown-up."
        }
      }
    ]
  },
  "od2e-l1-u10-l4": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: [
        "avocado",
        "orange",
        "tomato",
        "salad",
        "seeds",
        "plus",
        "equals"
      ],
      grammar: [
        "My soup has ___ and ___.",
        "___ plus ___ equals ___."
      ]
    },
    base: {
      title: "My new soup",
      task: "Invent a new soup: a monster soup, a rainbow soup or your own idea. Draw it. Write what is in it.",
      steps: [
        "Choose a new soup: monster, rainbow or your own idea.",
        "Draw the soup in a pot.",
        "Put two foods in it and draw them.",
        "Copy and finish: My soup has ___ and ___.",
        "Say to someone at home why you chose them."
      ],
      frames: [
        "My soup has ___ and ___.",
        "It's ___!",
        "I put ___ in it.",
        "I chose ___ because ___."
      ],
      success: [
        "I can draw a new soup.",
        "I can write: My soup has ___ and ___.",
        "I can say why I chose them."
      ],
      challenge: "Write an adding sentence about your soup, like: Two plus three equals five. Add an exclamation mark!"
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My team-colour soup",
          task: "Invent a new soup in Gunners red and white. Draw it. Write what is in it.",
          steps: [
            "Choose red and white foods for a soup, for example tomato and potato.",
            "Draw the soup in a pot.",
            "Put two foods in it and draw them.",
            "Copy and finish: My soup has ___ and ___.",
            "Say to someone at home why you chose them."
          ],
          frames: [
            "My soup has ___ and ___.",
            "It's ___!",
            "I put ___ in it.",
            "I chose ___ because ___."
          ],
          success: [
            "I can draw a red and white soup.",
            "I can write: My soup has ___ and ___.",
            "I can say why I chose them."
          ],
          challenge: "Write an adding sentence about your soup, like: Two plus three equals five. Add an exclamation mark!"
        }
      }
    ]
  },
  "od2e-l1-u10-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: [
        "soup",
        "graph",
        "bar",
        "children",
        "like",
        "plus"
      ],
      grammar: [
        "___ people like ___.",
        "___ plus ___ equals ___."
      ]
    },
    base: {
      title: "A soup bar graph",
      task: "Ask three people at home which soup they like. Draw a small bar graph of their answers. Write one sentence.",
      steps: [
        "Ask three people: Which soup do you like?",
        "Draw a bar for each soup. Make the bar as tall as the number of people.",
        "Count the bars.",
        "Copy and finish: ___ people like ___.",
        "Say which soup is the most popular and why you think so."
      ],
      frames: [
        "___ people like ___.",
        "The tall bar is ___.",
        "The short bar is ___.",
        "I think ___ is popular because ___."
      ],
      success: [
        "I can ask three people and draw a bar graph.",
        "I can write: ___ people like ___.",
        "I can say which bar is the tallest."
      ],
      challenge: "Add your answers to a friend's graph. Write: ___ plus ___ equals ___. Say which answer is the most popular and why."
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match-day food bar graph",
          task: "Ask three people at home which match-day food they like. Draw a small bar graph of their answers. Write one sentence.",
          steps: [
            "Ask three people: Which food do you like at a match?",
            "Draw a bar for each food. Make the bar as tall as the number of people.",
            "Count the bars.",
            "Copy and finish: ___ people like ___.",
            "Say which food is the most popular and why you think so."
          ],
          frames: [
            "___ people like ___.",
            "The tall bar is ___.",
            "The short bar is ___.",
            "I think ___ is popular because ___."
          ],
          success: [
            "I can ask three people and draw a bar graph.",
            "I can write: ___ people like ___.",
            "I can say which bar is the tallest."
          ],
          challenge: "Add your answers to a friend's graph. Write: ___ plus ___ equals ___. Say which answer is the most popular and why."
        }
      }
    ]
  }
};
