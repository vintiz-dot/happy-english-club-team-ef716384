import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 2 "Friends":
// one task per lesson, keyed by deck id. Children are 6-7: draw, then write a
// few words or one short sentence. Every task has the class version (`base`) and
// one football edition, chosen per class in the app. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL1U2Creative: Record<string, Creative> = {
  // Lesson 1: animals, feelings, things we do
  "od2e-l1-u02-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["elephant", "tortoise", "lonely", "sad", "play", "eat", "sleep"],
      grammar: ["This is a ___.", "They play."],
    },
    base: {
      title: "A friend for a lonely animal",
      task: "A little animal is lonely. Invent a friend for it and draw them playing together.",
      steps: [
        "Draw a lonely animal. Make its face sad.",
        "Draw a new animal friend next to it.",
        "Change the first face. Now it is happy!",
        "Write: This is a ___. Then write: They play.",
      ],
      frames: ["This is a ___.", "They play.", "The ___ is lonely."],
      success: ["I can write the name of my animal.", "I can write They play."],
      challenge: "Add one more word to your picture (eat or sleep) and write a sentence: They eat.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A friend for a lonely goalkeeper",
          task: "An animal goalkeeper is lonely at the Emirates Stadium. Invent a friend for it and draw them playing football together.",
          steps: [
            "Draw a lonely animal in gloves. Make its face sad.",
            "Draw a new animal friend with a ball.",
            "Change the first face. Now it is happy!",
            "Write: This is a ___. Then write: They play.",
          ],
          frames: ["This is a ___.", "They play.", "The ___ is lonely."],
          success: ["I can write the name of my animal.", "I can write They play."],
          challenge: "Add one more word to your picture (eat or sleep) and write a sentence: They eat.",
        },
      },
    ],
  },

  // Lesson 2: story animals and friends
  "od2e-l1-u02-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["zebra", "lion", "elephant", "friend", "family"],
      grammar: ["This is a ___.", "They are friends."],
    },
    base: {
      title: "Two animal friends",
      task: "Choose two story animals that become friends. Draw them together and write a sentence.",
      steps: [
        "Choose two animals, for example a zebra and a lion.",
        "Draw them side by side.",
        "Write the name of each animal: This is a ___.",
        "Write: They are friends.",
      ],
      frames: ["This is a ___.", "This is a ___.", "They are friends."],
      success: ["I can write two animal names.", "I can write They are friends."],
      challenge: "Draw a new page for the story and write one sentence about it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two animal team mates",
          task: "Choose two animals who play on the same football team. Draw them together at the Emirates Stadium and write a sentence.",
          steps: [
            "Choose two animals, for example a zebra and a lion.",
            "Draw them side by side in red and white shirts.",
            "Write the name of each animal: This is a ___.",
            "Write: They are friends.",
          ],
          frames: ["This is a ___.", "This is a ___.", "They are friends."],
          success: ["I can write two animal names.", "I can write They are friends."],
          challenge: "Draw the two friends after the match and write one sentence about them.",
        },
      },
    ],
  },

  // Lesson 3: this, that, these, those
  "od2e-l1-u02-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["elephant", "zebra", "lion", "tortoise"],
      grammar: ["This is / That is", "These are / Those are", "near and far"],
    },
    base: {
      title: "Near and far",
      task: "Draw your favourite part of the story. Put things near you and things far away, then write about them.",
      steps: [
        "Draw one animal close to you (near) and one animal far away.",
        "Write about the near animal: This is a ___.",
        "Write about the far animal: That is a ___.",
        "Draw two more animals near and far, and write These are ___. Those are ___.",
      ],
      frames: ["This is a ___.", "That is a ___.", "These are ___.", "Those are ___."],
      success: ["I can use this or that for one animal.", "I can use these or those for more than one."],
      challenge: "Say why you put an animal far away: I think it is shy.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Near and far at the match",
          task: "Draw what you can see at the Emirates Stadium. Put things near you and things far away, then write about them.",
          steps: [
            "Draw one ball near you and one ball far away on the pitch.",
            "Write about the near ball: This is a ___.",
            "Write about the far ball: That is a ___.",
            "Draw two more things near and far, and write These are ___. Those are ___.",
          ],
          frames: ["This is a ___.", "That is a ___.", "These are ___.", "Those are ___."],
          success: ["I can use this or that for one thing.", "I can use these or those for more than one."],
          challenge: "Say why you put something far away: I think it is the goal.",
        },
      },
    ],
  },

  // Lesson 4: pets and describing a friend
  "od2e-l1-u02-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["hamster", "goldfish", "bird", "rabbit", "lizard", "kitten"],
      grammar: ["It is a ___.", "He / She has ___.", "I think a ___ because ___."],
    },
    base: {
      title: "The best pet for my friend",
      task: "Choose a pet for a friend. Draw it, give it a name and say why it is the best pet.",
      steps: [
        "Choose a pet: hamster, goldfish, bird, rabbit, lizard or kitten.",
        "Draw the pet and give it a name with a capital letter.",
        "Write: This is ___. It is a ___.",
        "Say why: I think a ___ is good for my friend because ___.",
      ],
      frames: ["This is ___.", "It is a ___.", "I think a ___ because ___.", "It has ___."],
      success: ["I can write a pet word and a name with a capital letter.", "I can say because."],
      challenge: "Write three more sentences about your friend and the pet.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match day pet",
          task: "Choose a pet that brings luck to an Arsenal fan. Draw it, give it a name and say why it is the best pet.",
          steps: [
            "Choose a pet: hamster, goldfish, bird, rabbit, lizard or kitten.",
            "Draw the pet in a red and white scarf and give it a name with a capital letter.",
            "Write: This is ___. It is a ___.",
            "Say why: I think a ___ is good for match day because ___.",
          ],
          frames: ["This is ___.", "It is a ___.", "I think a ___ because ___.", "It has ___."],
          success: ["I can write a pet word and a name with a capital letter.", "I can say because."],
          challenge: "Write three more sentences about the pet and the match.",
        },
      },
    ],
  },

  // Lesson 5: wrap up
  "od2e-l1-u02-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["friend", "family", "elephant", "lion", "bird"],
      grammar: ["This is ___.", "He / She is a ___.", "We play."],
    },
    base: {
      title: "A new friend",
      task: "Invent a new friend for Elliot or for a pet you like. Draw them and write about them.",
      steps: [
        "Think of a new friend. It can be a person or an animal.",
        "Draw your new friend with Elliot or with a pet.",
        "Write: This is ___. He / She is a ___.",
        "Write what you do together: We play.",
      ],
      frames: ["This is ___.", "He / She is a ___.", "We ___.", "I like my friend because ___."],
      success: ["I can write This is ___.", "I can say what we do together."],
      challenge: "Choose one person on your picture and write three sentences about them.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A new team mate",
          task: "Invent a new team mate for an Arsenal fan or a pet you like. Draw them at the Emirates Stadium and write about them.",
          steps: [
            "Think of a new friend. It can be a person or an animal.",
            "Draw your new friend with a ball at the Emirates Stadium.",
            "Write: This is ___. He / She is a ___.",
            "Write what you do together: We play.",
          ],
          frames: ["This is ___.", "He / She is a ___.", "We ___.", "I like my friend because ___."],
          success: ["I can write This is ___.", "I can say what we do together."],
          challenge: "Choose one friend on your picture and write three sentences about them.",
        },
      },
    ],
  },

  // Lesson 6: Grammar Champions, this, that, these, those
  "od2e-l1-u02-l6": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["friend", "family", "rabbit", "kitten", "bird"],
      grammar: ["This is ___. That is ___.", "These are ___s. Those are ___s."],
    },
    base: {
      title: "My near and far picnic",
      task: "Draw a picnic with your friends and pets. Put some things near you and some far away. Write about them and choose your favorite part.",
      steps: [
        "Draw yourself in the middle of a picnic. Draw friends and pets around you.",
        "Put one friend or pet near you and one far away. Write: This is ___. That is ___.",
        "Put two pets near you and two far away. Write: These are ___. Those are ___.",
        "Choose your favorite part and tell someone why.",
      ],
      frames: ["This is ___.", "That is ___.", "These are ___s.", "Those are ___s."],
      success: [
        "I can write this or that for one thing.",
        "I can write these or those with -s for more than one.",
        "I can say why I like one part.",
      ],
      challenge: "Move yourself to the far side of the picnic. Write what changes: That is my ___ now becomes This is my ___.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "My near and far match day",
          task: "Draw a match day at the Emirates Stadium with your friends and pets. Put some things near you and some far away. Write about them and choose your favorite part.",
          steps: [
            "Draw yourself in the stand in a red and white scarf. Draw friends and pets around you.",
            "Put one friend or pet near you and one far away. Write: This is ___. That is ___.",
            "Put two balls near you and two on the pitch far away. Write: These are ___. Those are ___.",
            "Choose your favorite part of the match day and tell someone why.",
          ],
          frames: ["This is ___.", "That is ___.", "These are ___s.", "Those are ___s."],
          success: [
            "I can write this or that for one thing.",
            "I can write these or those with -s for more than one.",
            "I can say why I like one part.",
          ],
          challenge: "Run to the pitch. Write what changes: That is the ball now becomes This is the ball.",
        },
      },
    ],
  },
};
