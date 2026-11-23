import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 18
// "Exploring the Ocean": one task per lesson, keyed by deck id. Every task has
// the class version (`base`) and one football edition. Which children get the
// football edition is chosen per class in the app (from the roster's interests),
// never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U18Creative: Record<string, Creative> = {
  // Lesson 1: sea words, have seen / have never seen
  "od2e-l3-u18-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["dolphin", "octopus", "kelp", "coral", "penguin", "squid", "otter"],
      grammar: ["I have seen / I have never seen", "because"],
    },
    base: {
      title: "A sea-life zone for our school",
      task: "Design a small sea-life zone for the school hall. Choose five sea animals or plants, say what each one needs, and explain why you chose them.",
      steps: [
        "Choose five words from the unit, for example the otter, the octopus, the coral, the kelp and the dolphin.",
        "Draw a simple plan of the zone and label where each one goes.",
        "Write one sentence for each choice with because (for example, the kelp goes near the wall because it needs to grow tall).",
        "Write two sentences about sea life you have seen and sea life you have never seen, and say which one you would put in the zone first.",
      ],
      frames: [
        "I chose the ___ because ___.",
        "The ___ goes next to the ___ because ___.",
        "I have seen a ___, but I have never seen a ___.",
        "Visitors can ___ at the ___.",
        "The most important animal in my zone is the ___ because ___.",
      ],
      success: [
        "My writing names five sea words from the unit and spells them correctly.",
        "My writing gives a reason with because for every choice.",
        "My writing uses I have seen or I have never seen at least once.",
      ],
      challenge:
        "Think about problems. Say one thing that could go wrong in your zone (for example, two animals that should not live together) and how you would solve it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A sea-life mascot for match day",
          task: "The Gunners want a sea animal as a special mascot for match day at the Emirates Stadium. Design the mascot zone, choose five sea animals and explain which one is best for the team.",
          steps: [
            "Choose five sea words from the unit, for example the dolphin, the octopus, the squid, the otter and the penguin.",
            "Draw a simple plan of a mascot corner outside the stadium and label where each animal goes.",
            "Write one sentence for each choice with because (for example, the octopus is good for a team because it has eight arms to help).",
            "Write two sentences about sea life you have seen and sea life you have never seen, and say which animal you would choose as the Gunners' mascot.",
          ],
          frames: [
            "I chose the ___ because ___.",
            "The ___ would be a good mascot because ___.",
            "I have seen a ___, but I have never seen a ___.",
            "On match day, fans can ___ at the ___.",
            "The best mascot for the Gunners is the ___ because ___.",
          ],
          success: [
            "My writing names five sea words from the unit and spells them correctly.",
            "My writing gives a reason with because for every choice.",
            "My writing uses I have seen or I have never seen at least once.",
          ],
          challenge:
            "Think about problems. Say one thing that could go wrong on a busy match day (for example, a mascot that is too shy for a crowd) and how you would solve it.",
        },
      },
    ],
  },

  // Lesson 2: evaluate an explorer's invention, past simple and so that
  "od2e-l3-u18-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["diver", "hose", "tethered", "freezing", "squid", "coral"],
      grammar: ["past simple (invented, wanted, stayed)", "so that", "better than"],
    },
    base: {
      title: "Which diver had the better plan?",
      task: "Two divers go down to a coral reef. Diver A is tethered to a boat and gets air through a hose. Diver B carries air on his or her back and is free to swim. Decide which diver had the better plan and say why.",
      steps: [
        "Read the problem again and draw both divers. Label the hose, the boat and the air.",
        "Write two sentences about what Diver A could do and could not do.",
        "Write two sentences about what Diver B could do and could not do.",
        "Choose the better plan and give two reasons. Say what the diver could see or find because of it.",
      ],
      frames: [
        "Diver A was tethered to ___, so he could not ___.",
        "Diver B wanted to ___, so he ___.",
        "The hose was long, but ___.",
        "Diver ___ stayed under the water longer so that he could ___.",
        "In my opinion, Diver ___ had the better plan because ___.",
      ],
      success: [
        "My writing uses the past simple for what the divers did.",
        "My writing uses so that or because to give a reason.",
        "My writing uses better than or not as good as to compare the two plans.",
      ],
      challenge:
        "Say one danger of the plan you chose and how a good explorer could make it safer. Then say whether your answer would change if the water was freezing.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Rescue the red scarf",
          task: "After a match at the Emirates Stadium, a Gunners fan drops a red-and-white scarf into a freezing lake. Two divers try to get it. Diver A is tethered to a boat and gets air through a hose. Diver B carries air on his or her back. Decide which diver had the better plan and say why.",
          steps: [
            "Read the problem again and draw both divers and the scarf. Label the hose, the boat and the air.",
            "Write two sentences about what Diver A could do and could not do.",
            "Write two sentences about what Diver B could do and could not do.",
            "Choose the better plan and give two reasons. Say how the fan felt at the end.",
          ],
          frames: [
            "Diver A was tethered to ___, so he could not ___.",
            "Diver B wanted to ___, so he ___.",
            "The water was freezing, but ___.",
            "Diver ___ stayed under the water longer so that he could ___.",
            "In my opinion, Diver ___ had the better plan because ___.",
          ],
          success: [
            "My writing uses the past simple for what the divers did.",
            "My writing uses so that or because to give a reason.",
            "My writing uses better than or not as good as to compare the two plans.",
          ],
          challenge:
            "Say one danger of the plan you chose and how a good diver could make it safer. Then say whether the fan should have just bought a new scarf, and why.",
        },
      },
    ],
  },

  // Lesson 3: argue a case with want to / need to / have to
  "od2e-l3-u18-l3": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["goggles", "hose", "diver", "freezing", "squid", "kelp"],
      grammar: ["want to / need to / have to", "because", "don't need to / don't have to"],
    },
    base: {
      title: "What must go on the boat?",
      task: "Your team is going to explore the sea for a week, but the boat is small and only five things fit. Write a short speech to the captain. Argue which three things your team needs to take, which one thing the team has to take, and which one thing you want to take but do not need.",
      steps: [
        "Make a list of eight things an ocean explorer could take (for example, goggles, a map, a camera, a pillow, extra food).",
        "Choose the three things you need to take and write one sentence with because for each.",
        "Choose the one thing you have to take (because of a rule or for safety) and say why.",
        "Choose one thing you want to take but do not need, and say why it should stay in the boat only if there is room.",
      ],
      frames: [
        "We need to take ___ because ___.",
        "We have to take ___ because ___.",
        "I want to take ___, but we don't need to because ___.",
        "Without ___, the divers could not ___.",
        "Captain, please let us take ___ because ___.",
      ],
      success: [
        "My writing uses need to, have to and want to correctly and in the right place.",
        "My writing gives a reason with because for each choice.",
        "My writing uses the plain verb after to (need to take, not need to takes) and adds -s for he and she.",
      ],
      challenge:
        "Argue against a friend who says the camera is not important. Use a strong sentence with although to answer them.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "What must go in the match-day bag?",
          task: "A family is going to the Emirates Stadium to see the Gunners, but the bag is small and only five things fit. Write a short speech to the family. Argue which three things they need to take, which one thing they have to take, and which one thing you want to take but do not need.",
          steps: [
            "Make a list of eight things a fan could take on match day (for example, a ticket, a scarf, a raincoat, a drink, a football for after the match).",
            "Choose the three things the family needs to take and write one sentence with because for each.",
            "Choose the one thing they have to take (because of a stadium rule) and say why.",
            "Choose one thing you want to take but do not need, and say why it should only go in if there is room.",
          ],
          frames: [
            "We need to take ___ because ___.",
            "We have to take ___ because ___.",
            "I want to take ___, but we don't need to because ___.",
            "Without ___, the fans could not ___.",
            "Please let us take ___ because ___.",
          ],
          success: [
            "My writing uses need to, have to and want to correctly and in the right place.",
            "My writing gives a reason with because for each choice.",
            "My writing uses the plain verb after to (need to take, not need to takes) and adds -s for he and she.",
          ],
          challenge:
            "Argue against a friend who says a raincoat is not important. Use a strong sentence with although to answer them.",
        },
      },
    ],
  },

  // Lesson 4: create an adventure story with although and compound nouns
  "od2e-l3-u18-l4": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["seaweed", "seagull", "sandcastle", "shipwreck", "clownfish", "seafloor"],
      grammar: ["although", "first / then / next / finally", "compound nouns"],
    },
    base: {
      title: "The shipwreck adventure",
      task: "Write a short adventure story about a young explorer who finds a shipwreck on the seafloor. Your story needs a beginning, a problem and an ending.",
      steps: [
        "Plan your story with four boxes: first, then, next, finally.",
        "Choose three compound nouns for your story (for example, seaweed, seagull, sandcastle, shipwreck, clownfish, seafloor).",
        "Write the story. Use first, then, next and finally to show the order.",
        "Add at least two sentences with although and one with want to or need to. Check your commas.",
      ],
      frames: [
        "First, the explorer ___.",
        "Then she / he found a ___ on the ___.",
        "Although it was ___, she / he wanted to ___.",
        "Next, she / he needed to ___ because ___.",
        "Finally, ___.",
      ],
      success: [
        "My writing has a beginning, a problem and an ending.",
        "My writing uses at least three compound nouns and spells them as one word.",
        "My writing uses although at least twice, with a comma when it begins the sentence.",
      ],
      challenge:
        "Add a surprise in the middle of the story and a sentence that tells the reader how the explorer felt. Use one although sentence that begins in the middle: She kept swimming although ___.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The lost football adventure",
          task: "Write a short adventure story about a young fan who sets off for a match day at the Emirates Stadium and finds a lost football on a beach. Your story needs a beginning, a problem and an ending.",
          steps: [
            "Plan your story with four boxes: first, then, next, finally.",
            "Choose three compound nouns for your story (for example, football, seaweed, seagull, sandcastle, shipwreck, seafloor).",
            "Write the story. Use first, then, next and finally to show the order.",
            "Add at least two sentences with although and one with want to or need to. Check your commas.",
          ],
          frames: [
            "First, the fan ___.",
            "Then she / he found a ___ on the ___.",
            "Although it was ___, she / he wanted to ___.",
            "Next, she / he needed to ___ because ___.",
            "Finally, ___ and the Gunners ___.",
          ],
          success: [
            "My writing has a beginning, a problem and an ending.",
            "My writing uses at least three compound nouns and spells them as one word.",
            "My writing uses although at least twice, with a comma when it begins the sentence.",
          ],
          challenge:
            "Add a surprise in the middle of the story and a sentence that tells the reader how the fan felt. Use one although sentence that begins in the middle: She kept walking although ___.",
        },
      },
    ],
  },

  // Lesson 5: compare and justify reasons for exploring
  "od2e-l3-u18-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["explorer", "ocean", "adventure", "route", "interview"],
      grammar: ["want to / need to", "although", "because"],
    },
    base: {
      title: "The best reason to explore",
      task: "People explore to see new places, to find new plants and animals, and to have adventures. Compare two of these reasons and decide which is the stronger one. Write it as a short answer to the Big Question: Why do we explore?",
      steps: [
        "Choose two reasons from the three above.",
        "For each reason, write one sentence with an example from the unit (an explorer, a place or an animal).",
        "Write one sentence that compares them with although or but.",
        "Choose the stronger reason and write two sentences to justify your choice with because.",
      ],
      frames: [
        "One reason people explore is to ___.",
        "For example, an explorer wanted to ___.",
        "Another reason is to ___, although ___.",
        "I think the stronger reason is ___ because ___.",
        "Explorers need to ___ because ___.",
      ],
      success: [
        "My writing compares two reasons and says which one is stronger.",
        "My writing gives an example for each reason and a reason with because.",
        "My writing uses want to or need to and although correctly.",
      ],
      challenge:
        "Answer a friend who disagrees and says exploring is too dangerous. Give one strong reply and say what an explorer needs to do to stay safe.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Why do fans travel to explore?",
          task: "Gunners fans sometimes travel to a new city for an away match. Compare two reasons why they go: to see the team play, and to explore the new city and have an adventure. Decide which reason is stronger and answer: Why do we explore?",
          steps: [
            "Think of an example for each reason (a match, a new street, a museum, some new food).",
            "For each reason, write one sentence with an example.",
            "Write one sentence that compares them with although or but.",
            "Choose the stronger reason and write two sentences to justify your choice with because.",
          ],
          frames: [
            "One reason fans travel is to ___.",
            "For example, they want to ___.",
            "Another reason is to ___, although ___.",
            "I think the stronger reason is ___ because ___.",
            "Travelling fans need to ___ because ___.",
          ],
          success: [
            "My writing compares two reasons and says which one is stronger.",
            "My writing gives an example for each reason and a reason with because.",
            "My writing uses want to or need to and although correctly.",
          ],
          challenge:
            "Answer a friend who says that fans should stay at home and watch on television. Give one strong reply and say what a travelling fan needs to do to stay safe.",
        },
      },
    ],
  },
  // Lesson 6: Grammar Champions (want to / need to / have to, with because and so)
  "od2e-l3-u18-l6": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["kelp", "coral", "diver", "goggles", "squid", "octopus", "freezing"],
      grammar: ["want to / need to / have to", "because and so", "don't need to / don't have to"],
    },
    base: {
      title: "A plan for a secret exploration",
      task: "Invent a secret exploration to a place nobody has visited, for example a cave under a frozen lake or a forest at the bottom of the sea. Draw a map, then write a plan for your team: what you want to find, what you need to take, and what you have to do before you go.",
      steps: [
        "Choose your place and draw a small map with three things to find. Give the place a name.",
        "Write one sentence with want to to say what you hope to find, and add because.",
        "Write two sentences with need to or have to to say what to take and what to do first. Use so in one of them.",
        "Write one sentence with don't have to to say what the team can leave at home, then read your plan aloud to someone at home.",
      ],
      frames: [
        "We want to explore ___ because ___.",
        "We need to take ___, so ___.",
        "Before we go, we have to ___ because ___.",
        "We don't have to take ___ because ___.",
        "If we find ___, we will ___.",
      ],
      success: [
        "My plan uses want to, need to and have to in the right places, with a plain verb after to.",
        "My plan uses because and so at least once each, with a comma before so.",
        "My plan uses wants, needs or has when it talks about one person (she, he or the captain).",
      ],
      challenge:
        "Add a paragraph that answers a visitor who says 'Nobody needs to explore, because we already know everything!' Give two reasons that answer them politely.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A secret training camp",
          task: "Invent a secret training camp for a football team, for example in a cave under a frozen lake or on an island with a coral reef. Draw a map, then write a plan for the team: what you want to find, what you need to take, and what you have to do before you go.",
          steps: [
            "Choose your place and draw a small map with three things the team can find, such as a new pitch or a hidden beach. Give the place a name.",
            "Write one sentence with want to to say what the team hopes to find, and add because.",
            "Write two sentences with need to or have to to say what to take and what to do first. Use so in one of them.",
            "Write one sentence with don't have to to say what the team can leave at home, then read your plan aloud to someone at home.",
          ],
          frames: [
            "The team wants to explore ___ because ___.",
            "We need to take ___, so ___.",
            "Before we go, we have to ___ because ___.",
            "We don't have to take ___ because ___.",
            "If we find ___, we will ___.",
          ],
          success: [
            "My plan uses want to, need to and have to in the right places, with a plain verb after to.",
            "My plan uses because and so at least once each, with a comma before so.",
            "My plan uses wants, needs or has when it talks about one person (she, he or the coach).",
          ],
          challenge:
            "Add a paragraph that answers a visitor who says 'Football players only need to train on a pitch!' Give two reasons that answer them politely.",
        },
      },
    ],
  },
};
