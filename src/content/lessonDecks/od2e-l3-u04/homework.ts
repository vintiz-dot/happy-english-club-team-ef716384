import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 4
// "Why People Move": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original. Moving is a
// sensitive topic for some families, so every task works with an invented
// family or an invented place: nobody has to write about their own home.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U4Creative: Record<string, Creative> = {
  // Lesson 1: design a neighborhood, say its main idea, support it with details
  "od2e-l3-u04-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["suburb", "rural area", "urban area", "shopping mall", "hospital", "clinic", "factory", "zoo"],
      grammar: ["main idea and details", "People can + verb"],
    },
    base: {
      title: "A neighborhood for a new family",
      task: "Design a map of a neighborhood for an invented family who is about to move in. Put six places on the map and explain why each one is there.",
      steps: [
        "Decide: is your neighborhood in a rural area, a suburb or an urban area? Draw the map and put six places on it, for example a clinic, a university or a shopping mall.",
        "Write ONE sentence that tells the main idea of your map: why it is a good place for the family.",
        "Write three detail sentences. Each one says what people can do or find at one of your places.",
        "Read your writing to someone at home. Can they tell what your main idea is?",
      ],
      frames: [
        "My neighborhood is in a(n) ___ area.",
        "Main idea: This is a good place for a family because ...",
        "Detail 1: People can ___ at the ___.",
        "Detail 2: There is a ___ near the houses, so ...",
        "Detail 3: A person who works at the ___ can ...",
      ],
      success: [
        "My first sentence tells the main idea of my map.",
        "I write at least three details that match my main idea.",
        "I use at least four place words from our list correctly.",
      ],
      challenge:
        "Give your neighborhood one problem (for example, it is far from a hospital) and write two sentences that say how the people there could fix it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The neighborhood around a new stadium",
          task: "Imagine Arsenal are building a new stadium and training center. Design a map of the neighborhood around it. Put six places on the map and explain why each one is there.",
          steps: [
            "Decide: is the stadium in a rural area, a suburb or an urban area? Draw the map and put six places on it, for example a clinic, a shopping mall or a university.",
            "Write ONE sentence that tells the main idea of your map: why it is a good place for fans and players.",
            "Write three detail sentences. Each one says what fans or players can do or find at one of your places.",
            "Read your writing to someone at home. Can they tell what your main idea is?",
          ],
          frames: [
            "Our stadium is in a(n) ___ area.",
            "Main idea: This is a good place for fans because ...",
            "Detail 1: Fans can ___ at the ___ before a match.",
            "Detail 2: There is a ___ near the stadium, so ...",
            "Detail 3: A player who needs a doctor can go to the ...",
          ],
          success: [
            "My first sentence tells the main idea of my map.",
            "I write at least three details that match my main idea.",
            "I use at least four place words from our list correctly.",
          ],
          challenge:
            "Match days are noisy and crowded. Give your neighborhood one problem and write two sentences that say how people living nearby could be helped.",
        },
      },
    ],
  },

  // Lesson 2: evaluate and rank the reasons to move
  "od2e-l3-u04-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["country", "move abroad", "immigrant", "experiences", "belongings", "hospital", "university"],
      grammar: ["because", "main idea and details"],
    },
    base: {
      title: "The strongest reason to move",
      task: "The article gives three kinds of reasons for moving: jobs, services and new experiences. Invent a family and decide which reason is the strongest for them.",
      steps: [
        "Invent a family in two sentences: who they are and where they live now.",
        "Put the three reasons in order from strongest to weakest FOR THIS FAMILY.",
        "Write one sentence with because for each place in your list.",
        "Say one thing that could change your order (for example, a new job that pays more).",
      ],
      frames: [
        "This family lives in a(n) ___ area. They need ___.",
        "I put ___ first because ...",
        "I put ___ last because ...",
        "Some people think ___ is the strongest reason, but I think ...",
        "If the family ___, they do not need to move.",
      ],
      success: [
        "My family is clear and my ranking has three places.",
        "I give a reason with because for each place.",
        "I use at least three words from the unit, such as services, experiences or move abroad.",
      ],
      challenge:
        "Add a fourth reason that is not in the article. Say where it goes in your list and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Why a young player moves to a new club",
          task: "A young player from a small club in a rural area gets a chance to join a big club in a city. Decide which reason to move is the strongest: a job, services or new experiences.",
          steps: [
            "Invent the player in two sentences (use a position, not a real name): where he or she lives now and what he or she loves.",
            "Put the three reasons in order from strongest to weakest FOR THIS PLAYER.",
            "Write one sentence with because for each place in your list.",
            "Say one thing that could change your order (for example, the family cannot move too).",
          ],
          frames: [
            "The striker / goalkeeper lives in a(n) ___ area. He / She needs ___.",
            "I put ___ first because ...",
            "I put ___ last because ...",
            "Some fans think ___ is the strongest reason, but I think ...",
            "If the club ___, the player does not need to move.",
          ],
          success: [
            "My player is clear and my ranking has three places.",
            "I give a reason with because for each place.",
            "I use at least three words from the unit, such as services, experiences or move abroad.",
          ],
          challenge:
            "Add a fourth reason that is not in the article. Say where it goes in your list and why.",
        },
      },
    ],
  },

  // Lesson 3: create a guide of if and when sentences for a new neighbor
  "od2e-l3-u04-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["clinic", "hospital", "shopping mall", "zoo", "university", "suburb"],
      grammar: ["present real conditional (if / when)", "a comma after the first part"],
    },
    base: {
      title: "The If-and-When guide for a new neighbor",
      task: "A new family has just moved into your neighborhood and does not know the place. Make a short guide with five sentences that begin with if or when and tell them what to do or what happens.",
      steps: [
        "List five things a new family needs to know, for example where to buy food or who to see if you are ill.",
        "Write each one as a sentence with if or when. Use the present tense in BOTH parts.",
        "Check every sentence: is there a comma after the first part?",
        "Draw a small picture for two of your sentences and read your guide to someone at home.",
      ],
      frames: [
        "If you need a doctor, you ...",
        "When you want to buy ___, you go to ...",
        "If it rains very hard, the streets ...",
        "When the weekend comes, many families ...",
        "If you feel ___, you can ...",
      ],
      success: [
        "I write five if or when sentences with the present tense in both parts.",
        "I put a comma after the first part each time.",
        "My guide helps a real person: the sentences are useful and true.",
      ],
      challenge:
        "Write one more sentence where you start with the result and put if in the middle (no comma), then say which way sounds better to you and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The If-and-When guide for a first match day",
          task: "A family is going to the Emirates Stadium for the first time. Make a short guide with five sentences that begin with if or when and tell them what to do or what happens.",
          steps: [
            "List five things a first-time fan needs to know, for example when to arrive or what to bring.",
            "Write each one as a sentence with if or when. Use the present tense in BOTH parts.",
            "Check every sentence: is there a comma after the first part?",
            "Draw a small picture for two of your sentences and read your guide to someone at home.",
          ],
          frames: [
            "If you want a good seat, you ...",
            "When the players walk out, the fans ...",
            "If it rains, you ...",
            "When the Gunners score, everybody ...",
            "If you feel hungry, you can ...",
          ],
          success: [
            "I write five if or when sentences with the present tense in both parts.",
            "I put a comma after the first part each time.",
            "My guide helps a real person: the sentences are useful and true.",
          ],
          challenge:
            "Write one more sentence where you start with the result and put if in the middle (no comma), then say which way sounds better to you and why.",
        },
      },
    ],
  },

  // Lesson 4: argue which place is best, using because and answering another view
  "od2e-l3-u04-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["rural area", "suburb", "urban area", "immigrant", "Brazilian", "Japanese", "Irish"],
      grammar: ["because in complete sentences", "if / when", "suffixes -ese, -ian, -ish"],
    },
    base: {
      title: "Which place is best for a family?",
      task: "An invented family from another country (for example a Brazilian, Japanese or Irish family) is moving to your country. Argue which kind of place is best for them: a rural area, a suburb or an urban area.",
      steps: [
        "Choose a family and write one sentence: 'A(n) ___ family is moving to ...'",
        "Choose the best kind of place and write two reasons. Each one is a complete sentence with because.",
        "Write what someone who disagrees might say, and answer them.",
        "Finish with a closing sentence. Read it aloud to check that every because sentence is complete.",
      ],
      frames: [
        "A(n) ___ family is moving to ___.",
        "I think a(n) ___ is the best place for them because ...",
        "Another reason is that ...",
        "Some people say ___, but ...",
        "If they live there, they can ... That is why I think ...",
      ],
      success: [
        "I choose one place and give two reasons with because.",
        "Every because sentence is complete: it has a subject and a verb.",
        "I use the right word for the family (Brazilian, Japanese, Irish) and I answer a different view.",
      ],
      challenge:
        "Write a second paragraph that argues for the place you did NOT choose, and then say which paragraph is stronger and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Where should the new striker's family live?",
          task: "A young Brazilian player has joined Arsenal and his family is moving too. Argue where the family should live: in the busy city near the Emirates Stadium, in a suburb or in a rural area.",
          steps: [
            "Write one sentence about the family: 'A Brazilian family is moving to ...'",
            "Choose the best kind of place and write two reasons. Each one is a complete sentence with because.",
            "Write what someone who disagrees might say, and answer them.",
            "Finish with a closing sentence. Read it aloud to check that every because sentence is complete.",
          ],
          frames: [
            "A Brazilian family is moving to ___.",
            "I think a(n) ___ is the best place for them because ...",
            "Another reason is that ...",
            "Some fans say ___, but ...",
            "If they live there, they can ... That is why I think ...",
          ],
          success: [
            "I choose one place and give two reasons with because.",
            "Every because sentence is complete: it has a subject and a verb.",
            "I use the word Brazilian correctly and I answer a different view.",
          ],
          challenge:
            "Write a second paragraph that argues for the place you did NOT choose, and then say which paragraph is stronger and why.",
        },
      },
    ],
  },

  // Lesson 5: compare two places and justify a choice in a letter
  "od2e-l3-u04-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["rural area", "urban area", "suburb", "country", "university", "hospital", "belongings"],
      grammar: ["letter parts: date, greeting, body, closing", "because", "if / when"],
    },
    base: {
      title: "Two places, one choice",
      task: "An invented family has to choose between two places to live. Compare the two places and then write a letter from a child in the family to a best friend that says where they are moving and why.",
      steps: [
        "Choose two places (real or invented). Make a chart: what is good about each, what is not so good.",
        "Decide where the family moves. Write down your two best reasons.",
        "Write the letter: date, greeting, a paragraph with the news and the reasons, a paragraph about what the child will miss and look forward to, a closing and a name.",
        "Check each because sentence is complete and that there is a comma after each if part.",
      ],
      frames: [
        "Dear ___,",
        "I have news! We are moving from ___ to ___ because ...",
        "___ is bigger / quieter than ___, but ...",
        "If we live there, we can ... When I visit you, ...",
        "I will miss ___, but I am looking forward to ...  Your friend, ___",
      ],
      success: [
        "My letter has a date, a greeting, two paragraphs, a closing and a name.",
        "I compare the two places and give two reasons for the choice.",
        "I use because, and at least one if or when sentence, correctly.",
      ],
      challenge:
        "Add a second, shorter letter: the friend answers, and says one thing they will do to stay in touch.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Two clubs, one choice",
          task: "A young player has two offers: a small club in a rural area, or the Gunners in a big city. Compare the two places and then write a letter from the player to a best friend that says where he or she is moving and why.",
          steps: [
            "Make a chart for the two clubs: what is good about each, what is not so good.",
            "Decide where the player moves. Write down your two best reasons.",
            "Write the letter: date, greeting, a paragraph with the news and the reasons, a paragraph about what the player will miss and look forward to, a closing and a name.",
            "Check each because sentence is complete and that there is a comma after each if part.",
          ],
          frames: [
            "Dear ___,",
            "I have news! I am moving from ___ to ___ because ...",
            "The city is bigger / busier than ___, but ...",
            "If I play there, I can ... When you visit, we can ...",
            "I will miss ___, but I am looking forward to ...  Your friend, ___",
          ],
          success: [
            "My letter has a date, a greeting, two paragraphs, a closing and a name.",
            "I compare the two places and give two reasons for the choice.",
            "I use because, and at least one if or when sentence, correctly.",
          ],
          challenge:
            "Add a second, shorter letter: the friend answers, and says one thing they will do to stay in touch.",
        },
      },
    ],
  },

  // Lesson 6: Grammar Champions, if and when with the comma
  "od2e-l3-u04-l6": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["suburb", "rural area", "urban area", "hospital", "clinic", "university", "factory"],
      grammar: ["if and when with the plain present", "the comma after the first part", "because and so"],
    },
    base: {
      title: "The rule book of my town",
      task: "Invent a town where families would like to live. Write its Rule Book: five if or when sentences that show how one thing causes another in your town. Then write a short paragraph about why families move there.",
      steps: [
        "Draw your town and label four places on it, for example a clinic, a factory or a university. Decide if it is in a rural area, a suburb or an urban area.",
        "Write five if or when sentences that show a cause and a result in your town. Use the plain present and a comma after the first part.",
        "Turn two of your sentences around, so the result comes first and there is no comma.",
        "Write a short paragraph of four sentences: a main idea, two details and one reason with because or so.",
        "Check every comma and every verb, then read your Rule Book to someone at home.",
      ],
      frames: [
        "If our town has ___, ___.",
        "When a new family arrives, ___.",
        "___ if / when ___.",
        "Families move to our town because ___.",
        "Our town has ___, so ___.",
      ],
      success: [
        "I write five if or when sentences with the plain present, and no will.",
        "I put a comma after the first part when if or when comes first.",
        "My paragraph begins with a main idea and has details that match it.",
      ],
      challenge:
        "Add a problem to your town (for example, the road floods when it rains) and write two if or when sentences that say how the town can solve it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The rule book of a football town",
          task: "Invent a town where a new football club has its stadium. Write its Rule Book: five if or when sentences that show how one thing causes another in a town with a club. Then write a short paragraph about why fans move there.",
          steps: [
            "Draw your town and label four places on it, for example the stadium, a clinic, a shopping mall or a university. Decide if it is in a rural area, a suburb or an urban area.",
            "Write five if or when sentences that show a cause and a result in your town. Use the plain present and a comma after the first part.",
            "Turn two of your sentences around, so the result comes first and there is no comma.",
            "Write a short paragraph of four sentences: a main idea, two details and one reason with because or so.",
            "Check every comma and every verb, then read your Rule Book to someone at home.",
          ],
          frames: [
            "If our club wins, ___.",
            "When there is a match, ___.",
            "___ if / when ___.",
            "Fans move to our town because ___.",
            "Our town has a stadium, so ___.",
          ],
          success: [
            "I write five if or when sentences with the plain present, and no will.",
            "I put a comma after the first part when if or when comes first.",
            "My paragraph begins with a main idea and has details that match it.",
          ],
          challenge:
            "Match days are busy. Give your town one problem (for example, the bus is crowded) and write two if or when sentences that say how the town can solve it.",
        },
      },
    ],
  },
};
