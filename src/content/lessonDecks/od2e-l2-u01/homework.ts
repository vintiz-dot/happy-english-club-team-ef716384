import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 1 "Amazing Animals":
// one task per lesson, keyed by deck id, for children of about 7-8 (draw first, then write
// two to four short sentences). Every task has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app, never
// written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U01Creative: Record<string, Creative> = {
  // Lesson 1: body coverings
  "od2e-l2-u01-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["skin", "fur", "feathers", "scales", "wings", "gills", "eggs"],
      grammar: ["It has ...", "They have ...", "It lives in ..."],
    },
    base: {
      title: "My made-up animal",
      task: "Make up an animal that does not exist. Draw it, then write what it has and where it lives.",
      steps: [
        "Draw your animal on a big piece of paper.",
        "Give it two body parts from today, for example fur and wings.",
        "Write a name for it.",
        "Write two or three sentences under your picture.",
        "Show your picture and read your sentences aloud.",
      ],
      frames: ["My animal is called ___.", "It has ___ and ___.", "It lives in ___.", "I chose ___ because ___."],
      success: [
        "I can draw an animal with two body parts from this lesson.",
        "I can write what it has with It has ... .",
        "I can say where it lives.",
      ],
      challenge: "Add one more sentence: how is your animal the same as a real animal, and how is it different? Use but.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The match-day animal",
          task: "Make up a new animal that is a good-luck friend for the Gunners on match day. Draw it, then write what it has and where it lives.",
          steps: [
            "Draw your match-day animal. Colour it red and white like the Arsenal fans' scarves.",
            "Give it two body parts from today, for example wings and feathers.",
            "Write a name for it.",
            "Write two or three sentences under your picture.",
            "Show your picture and read your sentences aloud.",
          ],
          frames: ["My match-day animal is called ___.", "It has ___ and ___.", "It lives near the Emirates Stadium in ___.", "I chose ___ because ___."],
          success: [
            "I can draw an animal with two body parts from this lesson.",
            "I can write what it has with It has ... .",
            "I can say where it lives.",
          ],
          challenge: "Add one more sentence: how is your animal the same as a real animal, and how is it different? Use but.",
        },
      },
    ],
  },

  // Lesson 2: read about animal groups, find the proof
  "od2e-l2-u01-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["breathe", "warm", "safe", "swim", "jump", "wet", "babies"],
      grammar: ["It can ...", "because", "They need ..."],
    },
    base: {
      title: "A safe home for animal babies",
      task: "Design a safe home for the babies of one animal. Draw it, label it and say why it is good for them.",
      steps: [
        "Choose one animal, for example a frog, a bird or a fish.",
        "Draw its home and put the babies inside.",
        "Label two or three parts of the home.",
        "Write two or three sentences: who lives there and why it is safe.",
      ],
      frames: ["This is a home for ___.", "The babies can ___ here.", "It is safe because ___.", "They need ___ to stay warm."],
      success: [
        "I can draw a home with labels.",
        "I can say what the babies can do there.",
        "I can give a reason with because.",
      ],
      challenge: "Say what would be a problem if the home was too cold, too wet or too dry, and how you would fix it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A safe garden by the stadium",
          task: "Design a safe home for animal babies in a garden next to a big football stadium. Draw it, label it and say why it is good for them.",
          steps: [
            "Choose one animal, for example a frog, a bird or a fish.",
            "Draw its garden home next to the Emirates Stadium and put the babies inside.",
            "Label two or three parts of the home.",
            "Write two or three sentences: who lives there and why it is safe on match day.",
          ],
          frames: ["This is a home for ___.", "The babies can ___ here.", "It is safe on match day because ___.", "They need ___ to stay warm."],
          success: [
            "I can draw a home with labels.",
            "I can say what the babies can do there.",
            "I can give a reason with because.",
          ],
          challenge: "Say what would be a problem for the babies when the fans are loud, and how you would fix it.",
        },
      },
    ],
  },

  // Lesson 3: they, it and them
  "od2e-l2-u01-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["wings", "fur", "scales", "feathers", "gills", "mammals"],
      grammar: ["They have ...", "It has ...", "... help them ..."],
    },
    base: {
      title: "Two animals, one choice",
      task: "Draw two animals from different groups. Write how they are the same and different, then choose the one you would like to be.",
      steps: [
        "Draw two animals from two different groups, for example a fish and a bird.",
        "Write one sentence about each animal with It or They.",
        "Write one sentence about how they are the same with both.",
        "Choose one animal and say why.",
      ],
      frames: ["Fish have ___. They ___.", "A bird has ___. It ___.", "___ help them ___.", "Both ___ and ___ ___.", "I would like to be a ___ because ___."],
      success: [
        "I can use They and It in my sentences.",
        "I can write one sentence with Them, for example Wings help them fly.",
        "I can give a reason for my choice.",
      ],
      challenge: "Write one thing the animal you did not choose can do better than the one you chose.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which animal for the team?",
          task: "Draw two animals from different groups. Write how they are the same and different, then choose the one you would put on the Gunners' team and say why.",
          steps: [
            "Draw two animals from two different groups, for example a frog and a bird.",
            "Write one sentence about each animal with It or They.",
            "Write one sentence about how they are the same with both.",
            "Choose one animal for the Arsenal team and say why.",
          ],
          frames: ["Frogs have ___. They ___.", "A bird has ___. It ___.", "___ help them ___.", "Both ___ and ___ ___.", "I would pick the ___ for the Gunners because ___."],
          success: [
            "I can use They and It in my sentences.",
            "I can write one sentence with Them, for example Legs help them jump.",
            "I can give a reason for my choice.",
          ],
          challenge: "Write one thing the animal you did not choose can do better than the one you chose.",
        },
      },
    ],
  },

  // Lesson 4: my favourite animal group
  "od2e-l2-u01-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["fur", "feathers", "scales", "gills", "wings", "swim", "jump"],
      grammar: ["They have ...", "They can ...", "because"],
    },
    base: {
      title: "Why my group is the best",
      task: "Choose your favourite animal group and make a poster to show why it is the best one.",
      steps: [
        "Choose one group: birds, fish, amphibians or mammals.",
        "Draw one animal from the group in the middle of your poster.",
        "Label two body parts.",
        "Write three short sentences that say why your group is the best.",
      ],
      frames: ["My favourite group is ___.", "They have ___.", "They can ___.", "I think they are the best because ___."],
      success: [
        "I can draw an animal and label two body parts.",
        "I can write three sentences about the group.",
        "I can give a reason with because.",
      ],
      challenge: "Say what a friend who loves a different group might say, and answer with one sentence of your own.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Gunners' animal team",
          task: "Choose one animal group to be the Gunners' team for a day and make a poster to show why they would win.",
          steps: [
            "Choose one group: birds, fish, amphibians or mammals.",
            "Draw one animal from the group wearing a red and white Arsenal shirt.",
            "Label two body parts.",
            "Write three short sentences that say why this group would be best at football.",
          ],
          frames: ["My team is ___.", "They have ___.", "They can ___.", "They would win because ___."],
          success: [
            "I can draw an animal and label two body parts.",
            "I can write three sentences about the group.",
            "I can give a reason with because.",
          ],
          challenge: "Say what a fan of a different group might say, and answer with one sentence of your own.",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions, they, it and them
  "od2e-l2-u01-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["wings", "fur", "scales", "feathers", "gills", "legs"],
      grammar: ["They have ...", "... help them ...", "It has ..."],
    },
    base: {
      title: "The most helpful body part",
      task: "Choose the body part that you think helps animals the most. Draw two animals that have it and write why you chose it.",
      steps: [
        "Think about wings, fur, scales, feathers, gills and legs. Choose the one you think helps the most.",
        "Draw two animals that have it, one animal on each side.",
        "Write one sentence about each animal. Use It or They, and say the animal name only once.",
        "Write one sentence with them to say how the body part helps.",
        "Write why you chose it. Tell your family and ask: do you agree?",
      ],
      frames: ["I think ___ help animals the most.", "A ___ has ___. It ___.", "Ducks have ___. They ___.", "___ help them ___.", "I chose ___ because ___."],
      success: [
        "I can use It for one animal and They for many.",
        "I can write one sentence with them after a verb.",
        "I can give a reason with because.",
      ],
      challenge: "Say what an animal without this body part would find hard, and how it could still live. Use them or it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best body part for a football team",
          task: "Choose the animal body part that would help a football team the most. Draw two animals that have it and write why you chose it.",
          steps: [
            "Think about wings, fur, scales, feathers, gills and legs. Choose the one you think would help a football team the most.",
            "Draw two animals that have it, one animal on each side.",
            "Write one sentence about each animal. Use It or They, and say the animal name only once.",
            "Write one sentence with them to say how the body part helps on the football field.",
            "Write why you chose it. Tell your family and ask: do you agree?",
          ],
          frames: ["I think ___ would help a team the most.", "A ___ has ___. It ___.", "Frogs have ___. They ___.", "___ help them ___.", "I chose ___ because ___."],
          success: [
            "I can use It for one animal and They for many.",
            "I can write one sentence with them after a verb.",
            "I can give a reason with because.",
          ],
          challenge: "Say what an animal without this body part would find hard on the field, and how it could still play. Use them or it.",
        },
      },
    ],
  },
};
