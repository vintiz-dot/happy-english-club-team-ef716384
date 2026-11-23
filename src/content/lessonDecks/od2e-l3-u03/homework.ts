import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 3
// "Why do people move to new places?": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original, and every
// person in a task is invented.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U3Creative: Record<string, Creative> = {
  // Lesson 1: design a moving-day plan in time order
  "od2e-l3-u03-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["packing", "moving", "meeting neighbors", "shopping", "dancing", "ice skating", "sledding"],
      grammar: ["first, second, third", "before and after", "sequence of events"],
    },
    base: {
      title: "A perfect moving day",
      task: "An invented family is moving to a new town. Design a plan for their moving day, from the first job to the last, so that everything goes well.",
      steps: [
        "Invent the family: who is moving, and where to? Give them a made-up name.",
        "Draw a timeline with three events. Label them 1st, 2nd and 3rd, and add a time to each one.",
        "Write one sentence for each event with a word from our unit (packing, moving, meeting neighbors, shopping ...).",
        "Think of one thing that could go wrong and write how the family solves the problem.",
      ],
      frames: [
        "The ___ family is moving to ___.",
        "First, they are ___. Second, they ___. Third, they ___.",
        "Before they leave, they ___. After they arrive, they ___.",
        "A problem is ___, so they ___.",
        "At the end of the day, they feel ___ because ___.",
      ],
      success: [
        "My timeline has three events in the right order, with first, second and third.",
        "My writing uses at least three words from our unit.",
        "My writing says what the problem is and how the family solves it.",
      ],
      challenge:
        "Write a second plan for the family's first weekend in the new town. Use before and after at least twice, and say which event is the most important for making the family feel at home, and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A young player's moving week",
          task: "An invented young footballer is moving to London to join the Arsenal academy. Design a plan for the first week, from the first job to the last, so that the move goes well.",
          steps: [
            "Invent the player: where does he or she come from? Give a made-up name.",
            "Draw a timeline with three events. Label them 1st, 2nd and 3rd, and add a day or a time to each one.",
            "Write one sentence for each event with a word from our unit (packing, moving, meeting neighbors, shopping ...).",
            "Think of one thing that could go wrong, for example a lost boot bag, and write how the player solves the problem.",
          ],
          frames: [
            "The young player is moving to ___ to play for Arsenal.",
            "First, the player is ___. Second, the player ___. Third, the player ___.",
            "Before the first training, the player ___. After the first training, the player ___.",
            "A problem is ___, so the player ___.",
            "At the end of the week, the player feels ___ because ___.",
          ],
          success: [
            "My timeline has three events in the right order, with first, second and third.",
            "My writing uses at least three words from our unit.",
            "My writing says what the problem is and how the player solves it.",
          ],
          challenge:
            "Write a second plan for the player's first match day at the Emirates Stadium. Use before and after at least twice, and say which event is the most important for making the player feel at home, and why.",
        },
      },
    ],
  },

  // Lesson 2: create two letters that show feelings changing over time
  "od2e-l3-u03-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["moving", "packing", "meeting neighbors", "classmate", "ice skating", "shopping", "dancing"],
      grammar: ["sequence of events", "letter parts: date, Dear ..., closing", "because"],
    },
    base: {
      title: "Two letters, two feelings",
      task: "Invent a child who has moved to a new place. Write two short letters to a friend: one from the first week, and one from three months later. Let the reader see how the feelings changed.",
      steps: [
        "Invent the child and the new place. Where did he or she live before?",
        "Write the first letter. Put the date at the top, begin with Dear ___ and end with Your friend, ___.",
        "In the first letter, say what is new and how the child feels, with a reason.",
        "Write the second letter three months later. Say what the child has done since then, and how the feelings are now.",
      ],
      frames: [
        "Dear ___, I'm writing to tell you about my new home.",
        "At first, I felt ___ because ___.",
        "Last week, I met a classmate. We ___.",
        "Now I feel ___ because I can ___.",
        "I hope you can visit me. Your friend, ___",
      ],
      success: [
        "My letters have a date, Dear ___ and a closing.",
        "My two letters show that the feelings changed, and say why.",
        "My writing puts the events in the right order, with time words such as at first, last week, now.",
      ],
      challenge:
        "Write a third letter, from the friend who stayed behind. The friend answers two things the first letter said, tells one thing that has changed in the old town, and gives the traveler one piece of advice.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two letters from the academy",
          task: "Invent a young player who has moved to London to join the Arsenal academy. Write two short letters to a friend back home: one from the first week, and one from three months later. Let the reader see how the feelings changed.",
          steps: [
            "Invent the player and where he or she lived before.",
            "Write the first letter. Put the date at the top, begin with Dear ___ and end with Your friend, ___.",
            "In the first letter, say what is new (the training ground, the weather, the neighbors) and how the player feels, with a reason.",
            "Write the second letter three months later. Say what the player has done since then, and how the feelings are now.",
          ],
          frames: [
            "Dear ___, I'm writing to tell you about my new home in London.",
            "At first, I felt ___ because ___.",
            "Last week, I met a teammate. We ___.",
            "Now I feel ___ because I can ___.",
            "I hope you can visit me at the Emirates Stadium. Your friend, ___",
          ],
          success: [
            "My letters have a date, Dear ___ and a closing.",
            "My two letters show that the feelings changed, and say why.",
            "My writing puts the events in the right order, with time words such as at first, last week, now.",
          ],
          challenge:
            "Write a third letter, from the friend who stayed behind. The friend answers two things the first letter said, tells one thing that has changed in the old town, and gives the player one piece of advice.",
        },
      },
    ],
  },

  // Lesson 3: compare then and now with can / could and justify
  "od2e-l3-u03-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["sledding", "ice skating", "fishing", "dancing", "shopping", "raking leaves", "throwing snowballs"],
      grammar: ["can (now)", "could / couldn't (before)", "but", "because"],
    },
    base: {
      title: "Then and now: which place is better?",
      task: "Invent a child who moved from a hot place to a snowy place. Compare what the child could do in the old place with what the child can do now, then decide which place is better and justify your choice.",
      steps: [
        "Invent the child and the two places.",
        "Write two sentences with could about the old place and two sentences with can about the new place.",
        "Join two of your sentences with but, for example: In my old town I could ___, but now I can ___.",
        "Decide which place is better for this child. Give two reasons with because, and say what you would miss.",
      ],
      frames: [
        "In the old town, the child could ___ and ___.",
        "In the new town, the child can ___, but the child can't ___ yet.",
        "In the old town I couldn't ___, but now I can ___.",
        "I think the ___ is better for this child because ___ and ___.",
        "The child will miss ___, but ___.",
      ],
      success: [
        "My writing uses could / couldn't for before and can for now, correctly.",
        "My writing has at least two sentences joined with but.",
        "My writing gives two reasons with because and thinks about what the child would miss.",
      ],
      challenge:
        "Add a second child who moved the other way, from the snowy place to the hot place. Compare the two children and decide who has the bigger change, and give two reasons.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Then and now at the club",
          task: "Invent a young player who moved from a small village pitch to the Arsenal academy. Compare what the player could do before with what the player can do now, then decide which place is better for learning and justify your choice.",
          steps: [
            "Invent the player and the two places.",
            "Write two sentences with could about the village pitch and two sentences with can about the academy.",
            "Join two of your sentences with but, for example: At the village pitch I could ___, but now I can ___.",
            "Decide which place is better for learning football. Give two reasons with because, and say what the player would miss.",
          ],
          frames: [
            "At the village pitch, the player could ___ and ___.",
            "At the academy, the player can ___, but the player can't ___ yet.",
            "At the village pitch I couldn't ___, but now I can ___.",
            "I think the ___ is better for learning because ___ and ___.",
            "The player will miss ___, but ___.",
          ],
          success: [
            "My writing uses could / couldn't for before and can for now, correctly.",
            "My writing has at least two sentences joined with but.",
            "My writing gives two reasons with because and thinks about what the player would miss.",
          ],
          challenge:
            "Add a second player who moved the other way, from the academy to a small village club. Compare the two players and decide who has the bigger change, and give two reasons.",
        },
      },
    ],
  },

  // Lesson 4: argue both sides of a move with but and because
  "od2e-l3-u03-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["moving", "packing", "meeting neighbors", "classmate", "shopping", "unplugged", "untied"],
      grammar: ["but", "because", "can / could", "asking for help"],
    },
    base: {
      title: "Move or stay?",
      task: "Two invented cousins talk about a family's plan to move to a new town. One says the family should move. The other says the family should stay. Write their talk, and end with something they both agree on.",
      steps: [
        "Choose the reason for the move (a new job, a good school, a hospital, more space or a chance to try new things).",
        "Cousin A gives two reasons to move. Cousin B gives two reasons to stay. Use because each time.",
        "Use but at least three times to answer what the other cousin says, for example: That's true, but ___.",
        "Finish with one thing the cousins agree on, and one polite sentence that asks for help (Could you help me, please?).",
      ],
      frames: [
        "I think the family should move because ___.",
        "That's true, but ___.",
        "I think the family should stay because ___.",
        "I can see your point, but ___.",
        "We both agree that ___. Could you help me ___?",
      ],
      success: [
        "My writing has two clear sides, and each side gives reasons with because.",
        "My writing uses but at least three times, with a comma before it.",
        "My writing ends with something both cousins agree on and a polite request for help.",
      ],
      challenge:
        "Add a third speaker, a neighbor who has lived in the street for a long time. Write what the neighbor says, and use could or couldn't at least twice to say what the street was like before.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Move to London or stay at home?",
          task: "Two invented cousins who love Arsenal talk about a family's plan to move to London, close to the Emirates Stadium. One says the family should move. The other says the family should stay. Write their talk, and end with something they both agree on.",
          steps: [
            "Choose the reason for the move (a new job, a good school, a hospital, more space or being close to the stadium).",
            "Cousin A gives two reasons to move. Cousin B gives two reasons to stay. Use because each time.",
            "Use but at least three times to answer what the other cousin says, for example: That's true, but ___.",
            "Finish with one thing the cousins agree on, and one polite sentence that asks for help (Could you help me, please?).",
          ],
          frames: [
            "I think the family should move because ___.",
            "That's true, but ___.",
            "I think the family should stay because ___.",
            "I can see your point, but ___.",
            "We both agree that ___. Could you help me ___?",
          ],
          success: [
            "My writing has two clear sides, and each side gives reasons with because.",
            "My writing uses but at least three times, with a comma before it.",
            "My writing ends with something both cousins agree on and a polite request for help.",
          ],
          challenge:
            "Add a third speaker, a neighbor who has lived near the stadium for a long time. Write what the neighbor says, and use could or couldn't at least twice to say what match days were like before.",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): a then-and-now postcard, and a judgment about the move
  "od2e-l3-u03-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["moving", "packing", "meeting neighbors", "shopping", "dancing", "sledding", "ice skating"],
      grammar: ["can and can't", "could and couldn't", "but, because and so"],
    },
    base: {
      title: "A then-and-now postcard",
      task: "An invented child has moved to a new place. Write the postcard the child sends to a friend in the old place: what was different before, what is better now, what the child misses, and whether the move was a good idea.",
      steps: [
        "Invent the child: a made-up name, the old place and the new place, and one reason why the family moved.",
        "Write two sentences about the old place with could or couldn't.",
        "Write two sentences about the new place with can, and join one pair of ideas with but.",
        "Say what the child misses and what the child likes best. Use because for the reason and so for the result.",
        "Finish with your opinion: was moving a good idea for this child? Say why.",
      ],
      frames: [
        "Dear ___, we moved to ___ because ...",
        "In the old place I could ..., but I couldn't ...",
        "Here I can ..., so ...",
        "I miss ___ because ___, but ...",
        "I think moving was a good idea because ...",
      ],
      success: [
        "I used could or couldn't for before and can or can't for now, with a plain verb after each.",
        "I used but, because and so, with a comma before but and so.",
        "I gave my opinion about the move and a reason.",
      ],
      challenge:
        "Write a second postcard from the friend in the old place. Say what the friend can do now that the child has gone, and what the friend couldn't do before. Then decide which postcard shows the bigger change, and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A young player's then-and-now postcard",
          task: "An invented young footballer has moved to a new city to join a football academy. Write the postcard the player sends to a friend at the old team: what was different before, what is better now, what the player misses, and whether the move was a good idea.",
          steps: [
            "Invent the player: a made-up name, the old town and the new city, and one reason for the move (a better pitch, a coach, a school).",
            "Write two sentences about the old team with could or couldn't, for example about the pitch or the training.",
            "Write two sentences about the new academy with can, and join one pair of ideas with but.",
            "Say what the player misses and what the player likes best. Use because for the reason and so for the result.",
            "Finish with your opinion: was moving a good idea for this player? Say why.",
          ],
          frames: [
            "Dear ___, I moved to ___ because ...",
            "At my old team I could ..., but I couldn't ...",
            "Here I can ..., so ...",
            "I miss ___ because ___, but ...",
            "I think moving was a good idea because ...",
          ],
          success: [
            "I used could or couldn't for before and can or can't for now, with a plain verb after each.",
            "I used but, because and so, with a comma before but and so.",
            "I gave my opinion about the move and a reason.",
          ],
          challenge:
            "Write a second postcard from the friend at the old team. Say what the team can do now that the player has gone, and what it couldn't do before. Then decide which postcard shows the bigger change, and why.",
        },
      },
    ],
  },
};
