import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 3 "Solids, Liquids and
// Gases": one task per lesson, keyed by deck id, for children of about 7-8 (draw first,
// then write two to four short sentences). Every task has the class version (`base`) and
// one football edition; which children get the football edition is chosen per class in the
// app, never written here. Nothing asks a child to touch anything hot. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U03Creative: Record<string, Creative> = {
  // Lesson 1: solid, liquid, gas
  "od2e-l2-u03-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["solid", "liquid", "gas", "ice", "freeze", "melt", "flow"],
      grammar: ["It is a ...", "It is ... now", "When it is ..., it ..."],
    },
    base: {
      title: "My magic drink",
      task: "Invent a magic drink that changes from a liquid to a solid. Draw the two pictures and write what happens.",
      steps: [
        "Draw your drink as a liquid in a glass.",
        "Draw your drink again as a solid, for example ice.",
        "Write one sentence under each picture.",
        "Write what makes it change.",
      ],
      frames: ["This is a ___. It is a liquid.", "When it is cold, it ___.", "Now it is a ___.", "I made it change because ___."],
      success: [
        "I can draw a liquid and a solid.",
        "I can use the words liquid and solid.",
        "I can write what makes it change.",
      ],
      challenge: "Add a third picture: what happens when the drink gets hot? Use melt or steam.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The match-day water bottle",
          task: "Invent a magic water bottle for a football player that changes from a liquid to a solid. Draw the two pictures and write what happens.",
          steps: [
            "Draw the water in a bottle as a liquid on the pitch.",
            "Draw the water again as a solid, for example ice.",
            "Write one sentence under each picture.",
            "Write what makes it change.",
          ],
          frames: ["This is ___. It is a liquid.", "When it is cold, it ___.", "Now it is a ___.", "The Gunners need it because ___."],
          success: [
            "I can draw a liquid and a solid.",
            "I can use the words liquid and solid.",
            "I can write what makes it change.",
          ],
          challenge: "Add a third picture: what happens when the sun is hot at the Emirates Stadium? Use melt or steam.",
        },
      },
    ],
  },

  // Lesson 2: reading about what the world is made of
  "od2e-l2-u03-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["freeze", "melt", "ice", "steam", "heat", "liquid", "solid"],
      grammar: ["When it is ..., the ... ...", "because"],
    },
    base: {
      title: "A very cold place and a very hot place",
      task: "Invent two places, one that is always cold and one that is always hot. Draw them and say what happens to water.",
      steps: [
        "Draw your cold place on the left and your hot place on the right.",
        "Draw water in each place.",
        "Write one sentence for each place with When it is ... .",
        "Say which place you would like to visit and why.",
      ],
      frames: ["In my cold place, the water ___.", "When it is cold, the ___ ___.", "In my hot place, the water ___.", "I would like to visit ___ because ___."],
      success: [
        "I can draw two places that are different.",
        "I can say what happens to the water in each place.",
        "I can give a reason with because.",
      ],
      challenge: "Say what would happen if the two places swapped for one day.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two match days, two kinds of weather",
          task: "Invent two match days, one very cold and one very hot, at a football stadium. Draw them and say what happens to the water on the pitch.",
          steps: [
            "Draw the cold match day on the left and the hot match day on the right.",
            "Draw water or ice on the pitch in each picture.",
            "Write one sentence for each day with When it is ... .",
            "Say which match day you would like to watch the Gunners play and why.",
          ],
          frames: ["On the cold day, the water ___.", "When it is cold, the ___ ___.", "On the hot day, the water ___.", "I would like to watch on the ___ day because ___."],
          success: [
            "I can draw two match days that are different.",
            "I can say what happens to the water on each day.",
            "I can give a reason with because.",
          ],
          challenge: "Say what the players could do on each day to keep safe.",
        },
      },
    ],
  },

  // Lesson 3: was and were
  "od2e-l2-u03-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["ice", "water", "melt", "freeze", "steam", "solid", "liquid"],
      grammar: ["was / were", "It was ... Now it is ...", "They were ... Now they are ..."],
    },
    base: {
      title: "Then and now",
      task: "Find something that changed today. Draw how it was and how it is now, and say if the change was good.",
      steps: [
        "Choose one thing that changed, for example ice in a cup. Never touch anything hot.",
        "Draw it in two pictures: Then and Now.",
        "Write two sentences, one with was or were and one with is or are.",
        "Say if the change was good or not so good, and why.",
      ],
      frames: ["Then, the ___ was ___.", "Now it is ___.", "The ice cubes were ___. Now they are ___.", "The change was good because ___."],
      success: [
        "I can draw Then and Now.",
        "I can use was or were correctly.",
        "I can say if the change was good and why.",
      ],
      challenge: "Add a third picture: what will it be like later? Write one sentence with will be.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Before the match and after it",
          task: "Think about something that changed on match day. Draw how it was before and how it is after, and say if the change was good.",
          steps: [
            "Choose one thing that changed, for example the ice in the players' drinks. Never touch anything hot.",
            "Draw it in two pictures: Then and Now.",
            "Write two sentences, one with was or were and one with is or are.",
            "Say if the change was good for the Gunners or not, and why.",
          ],
          frames: ["Then, the ___ was ___.", "Now it is ___.", "The ice cubes were ___. Now they are ___.", "The change was good because ___."],
          success: [
            "I can draw Then and Now.",
            "I can use was or were correctly.",
            "I can say if the change was good and why.",
          ],
          challenge: "Add a third picture: what will it be like after the final whistle? Write one sentence with will be.",
        },
      },
    ],
  },

  // Lesson 4: things that change
  "od2e-l2-u03-l4": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["ice pop", "popcorn", "melt", "freeze", "heat", "solid", "liquid"],
      grammar: ["It was ... Now it is ...", "I would rather ... because ..."],
    },
    base: {
      title: "Ice pop or popcorn?",
      task: "Invent a new ice pop or popcorn snack. Draw and label it, then say which snack you like more.",
      steps: [
        "Draw your new ice pop or popcorn snack.",
        "Label the flavours or the parts.",
        "Write three sentences: what it is, what makes it change, and what it becomes.",
        "Say if you would rather have an ice pop or popcorn, and why.",
      ],
      frames: ["My snack is called ___.", "It was a ___. Now it is ___.", "Heat makes it ___. Cold makes it ___.", "I would rather have ___ because ___."],
      success: [
        "I can draw and label my snack.",
        "I can say what makes it change.",
        "I can give a reason for my choice.",
      ],
      challenge: "Say which snack is better to bring to a picnic and give two reasons.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best snack for match day",
          task: "Invent a new ice pop or popcorn snack to sell at the Emirates Stadium. Draw and label it, then say which snack the fans would like more.",
          steps: [
            "Draw your new ice pop or popcorn snack in red and white.",
            "Label the flavours or the parts.",
            "Write three sentences: what it is, what makes it change, and what it becomes.",
            "Say if the fans would rather have an ice pop or popcorn, and why.",
          ],
          frames: ["My match-day snack is called ___.", "It was a ___. Now it is ___.", "Heat makes it ___. Cold makes it ___.", "The fans would rather have ___ because ___."],
          success: [
            "I can draw and label my snack.",
            "I can say what makes it change.",
            "I can give a reason for my choice.",
          ],
          challenge: "Say which snack is better on a hot match day and give two reasons.",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions, was and were
  "od2e-l2-u03-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["ice cube", "puddle", "freeze", "melt", "solid", "liquid", "water"],
      grammar: ["was / were", "wasn't / weren't", "It was ... but now it is ..."],
    },
    base: {
      title: "A letter from an ice cube",
      task: "Imagine you are a thing that changed, like an ice cube or a snowman. Write a short letter that says what you were, what you weren't and what you are now. Draw yourself then and now.",
      steps: [
        "Choose a thing that changed, for example an ice cube. Never touch anything hot.",
        "Draw it in two boxes: Then and Now.",
        "Write your letter. Start with: Hello! I was a ...",
        "Say what was not true about you before, and what you are now. Say what made you change.",
      ],
      frames: ["Hello! I was a ___.", "I wasn't ___. / We weren't ___.", "Now I am ___.", "I changed because ___."],
      success: [
        "I used was or were, and wasn't or weren't.",
        "I used am, is or are for now.",
        "I said what made the change.",
      ],
      challenge: "Write a reply from a friend of the thing, with we were and they weren't, and say who changed more.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A letter from a match-day ice pop",
          task: "Imagine you are an ice pop in a fan's hand on a hot match day. Write a short letter that says what you were, what you weren't and what you are now. Draw yourself then and now.",
          steps: [
            "Draw the ice pop in a red and white cup holder, then draw the sticky puddle after the match. Never touch anything hot.",
            "Write your letter. Start with: Hello! I was an ice pop at the match.",
            "Say what you were and what was not true about you before the sun came out.",
            "Say what you are now and who helped you change.",
          ],
          frames: ["Hello! I was a ___.", "I wasn't ___. / We weren't ___.", "Now I am ___.", "The match was ___ and I changed because ___."],
          success: [
            "I used was or were, and wasn't or weren't.",
            "I used am, is or are for now.",
            "I said what made the change.",
          ],
          challenge: "Write a reply from a friend of the ice pop, with we were and they weren't, and say who changed more.",
        },
      },
    ],
  },
};
