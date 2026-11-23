import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 14
// "Glass and Clever Ideas": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U14Creative: Record<string, Creative> = {
  // Lesson 1: design something made of glass, describe it, summarize it
  "od2e-l3-u14-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["glass", "glassblower", "workshop", "furnace", "vase", "pitcher", "glassware", "frames"],
      grammar: ["made of / used for", "summarize in one sentence"],
    },
    base: {
      title: "A new piece of glassware",
      task: "Design a new object made of glass for your home or school. Describe it, say how a glassblower would make it and why it is useful.",
      steps: [
        "Draw your object and label two or three parts.",
        "Write three sentences: what it is made of, what it is used for and who will use it.",
        "Write two sentences about how the glassblower makes it in the workshop.",
        "Finish with ONE sentence that summarizes your design for a shop catalogue.",
      ],
      frames: [
        "My new ___ is made of ___ and ___.",
        "People use it to ___.",
        "In the workshop, the glassblower puts the glass in the furnace and then ___.",
        "It is better than a plastic ___ because ___.",
        "In one sentence: it is a ___ that helps people ___.",
      ],
      success: [
        "My design says what the object is made of and what it is used for.",
        "My writing uses at least four of our glass words correctly.",
        "My last sentence is a short summary in my own words.",
      ],
      challenge:
        "Think about the problem with glass: it breaks. Add one change that makes your design safer or stronger, and explain in a sentence why it works.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A glass trophy for the Gunners",
          task: "Design a glass trophy or match-day gift for Arsenal fans to buy at the Emirates Stadium. Describe it, say how a glassblower makes it and why fans would want it.",
          steps: [
            "Draw your trophy or gift and label two or three parts.",
            "Write three sentences: what it is made of, what it is used for and who will buy it.",
            "Write two sentences about how the glassblower makes it in the workshop.",
            "Finish with ONE sentence that summarizes your design for the club shop.",
          ],
          frames: [
            "My new ___ is made of ___ and ___.",
            "Fans can use it to ___ on match day.",
            "In the workshop, the glassblower puts the glass in the furnace and then ___.",
            "It is better than a plastic ___ because ___.",
            "In one sentence: it is a ___ that helps the Gunners' fans ___.",
          ],
          success: [
            "My design says what the object is made of and what it is used for.",
            "My writing uses at least four of our glass words correctly.",
            "My last sentence is a short summary in my own words.",
          ],
          challenge:
            "Glass breaks, and a stadium is crowded. Add one change that keeps your design safe in a crowd, and explain in a sentence why it works.",
        },
      },
    ],
  },

  // Lesson 2: evaluate Clara's idea
  "od2e-l3-u14-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["delicate", "bumped", "pounded", "footsteps", "vase", "eyeglasses", "workshop"],
      grammar: ["past simple to retell", "because and so", "first, then, after that, in the end"],
    },
    base: {
      title: "How clever was Clara's idea?",
      task: "Judge Clara's invention. Give it a score out of 5 and explain your score with reasons from the story and from your own life.",
      steps: [
        "Write your score out of 5 for how clever the idea was.",
        "Retell the problem and what Clara did, in three sentences, in the past tense.",
        "Give two reasons for your score, one from the story and one from your own life.",
        "Say one way the idea could be even better.",
      ],
      frames: [
        "I give Clara's idea ___ out of 5.",
        "First, ___. Then, ___. In the end, ___.",
        "It was clever because ___.",
        "In real life, eyeglasses help people ___, so ___.",
        "It would be even better if ___.",
      ],
      success: [
        "My score is clear and I give at least two reasons for it.",
        "My retelling uses the past tense and time words.",
        "My writing uses at least three words from the story, such as delicate, bumped or pounded.",
      ],
      challenge:
        "Write the other side too: give one reason someone else could give a lower score, and answer it with a sentence that begins 'However, ...'.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A clever idea for match day",
          task: "Judge Clara's invention, then imagine a Gunners fan sitting far from the pitch at the Emirates Stadium. Give Clara's idea a score for helping that fan and explain it.",
          steps: [
            "Write your score out of 5 for how clever the idea was.",
            "Retell the problem and what Clara did, in three sentences, in the past tense.",
            "Give two reasons for your score, one from the story and one about a fan at a match.",
            "Say one way the idea could be even better for match day.",
          ],
          frames: [
            "I give Clara's idea ___ out of 5.",
            "First, ___. Then, ___. In the end, ___.",
            "It was clever because ___.",
            "At the Emirates Stadium, eyeglasses would help a fan ___, so ___.",
            "It would be even better if ___.",
          ],
          success: [
            "My score is clear and I give at least two reasons for it.",
            "My retelling uses the past tense and time words.",
            "My writing uses at least three words from the story, such as delicate, bumped or pounded.",
          ],
          challenge:
            "Write the other side too: give one reason someone else could give a lower score, and answer it with a sentence that begins 'However, ...'.",
        },
      },
    ],
  },

  // Lesson 3: compare and justify with comparative and superlative adverbs
  "od2e-l3-u14-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["carefully", "quickly", "quietly", "delicate", "bumped", "pounded", "footsteps"],
      grammar: ["comparative adverbs (faster than, more carefully than)", "superlative adverbs (the fastest, the most carefully)"],
    },
    base: {
      title: "The Class Awards",
      task: "Choose three people you know (family, friends or famous people) and compare how they do one action. Decide who wins an award and justify your choice.",
      steps: [
        "Choose one action, for example run, cook, draw, sing or write, and three people.",
        "Write two sentences that compare two of them with a comparative adverb.",
        "Write one sentence that says who is the best of the three, with a superlative adverb.",
        "Write the award speech: why does the winner deserve it? Give two reasons.",
      ],
      frames: [
        "___ draws more carefully than ___.",
        "___ runs faster than ___, but ___ runs the most quietly.",
        "The winner of the ___ award is ___ because ___ does it the ___.",
        "I think ___ deserves it because ___.",
        "Some people may say ___, but I think ___.",
      ],
      success: [
        "I use at least two comparative adverbs and one superlative adverb correctly.",
        "I write 'more' or '-er' correctly and 'the most' or 'the -est' correctly.",
        "My award speech gives two reasons with because.",
      ],
      challenge:
        "Add a second award with a different action and a different winner, and use one irregular adverb (better, the best, worse or the worst).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Gunners' Match-Day Awards",
          task: "Imagine three Arsenal players in a match at the Emirates Stadium (use positions like the goalkeeper, the striker, the midfielder, not real names). Compare how they play and decide who wins the match-day award.",
          steps: [
            "Choose one action, for example run, pass, defend or shoot, and three players by position.",
            "Write two sentences that compare two of them with a comparative adverb.",
            "Write one sentence that says who is the best of the three, with a superlative adverb.",
            "Write the award speech: why does the winner deserve it? Give two reasons.",
          ],
          frames: [
            "The striker runs faster than the midfielder.",
            "The goalkeeper catches the ball more carefully than ___.",
            "The winner of the match-day award is ___ because ___ plays the ___.",
            "I think ___ deserves it because ___.",
            "Some fans may say ___, but I think ___.",
          ],
          success: [
            "I use at least two comparative adverbs and one superlative adverb correctly.",
            "I write 'more' or '-er' correctly and 'the most' or 'the -est' correctly.",
            "My award speech gives two reasons with because.",
          ],
          challenge:
            "Add a second award with a different action and a different winner, and use one irregular adverb (better, the best, worse or the worst).",
        },
      },
    ],
  },

  // Lesson 4: argue which invention changed life the most (before and after, used to)
  "od2e-l3-u14-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["useful", "useless", "careful", "careless", "harmful", "harmless", "fearless"],
      grammar: ["before and after", "used to", "suffixes -ful and -less"],
    },
    base: {
      title: "The invention that changed life the most",
      task: "Argue that one invention has changed life more than any other. Show life before it, life after it, and answer one person who disagrees.",
      steps: [
        "Choose one invention, for example the light bulb, the phone, the car, the clock or eyeglasses.",
        "Write two sentences about life before it, with used to.",
        "Write two sentences about life after it, with after.",
        "Write what someone who disagrees might say, and answer them.",
      ],
      frames: [
        "I believe the ___ changed life the most.",
        "Before the ___ was invented, people used to ___.",
        "After it was invented, people could ___.",
        "Some people say it is ___ (harmful / useless), but I think it is ___ because ___.",
        "That is why I think ___.",
      ],
      success: [
        "My argument says what life was like before and after the invention.",
        "I use used to and before / after correctly, with a comma after the opening phrase.",
        "I use at least one -ful or -less word and answer a different view.",
      ],
      challenge:
        "Compare TWO inventions and argue which one changed life more. Give a different reason for each one before you decide.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The invention that changed match day",
          task: "Argue that one invention has changed football and match days at the Emirates Stadium more than any other. Show match days before it, after it, and answer one person who disagrees.",
          steps: [
            "Choose one invention, for example floodlights, the television, the goal-line camera or a ticket app.",
            "Write two sentences about match days before it, with used to.",
            "Write two sentences about match days after it, with after.",
            "Write what someone who disagrees might say, and answer them.",
          ],
          frames: [
            "I believe ___ changed football the most.",
            "Before ___ was invented, fans used to ___.",
            "After it was invented, fans could ___.",
            "Some people say it is ___ (harmful / useless), but I think it is ___ because ___.",
            "That is why I think ___.",
          ],
          success: [
            "My argument says what match days were like before and after the invention.",
            "I use used to and before / after correctly, with a comma after the opening phrase.",
            "I use at least one -ful or -less word and answer a different view.",
          ],
          challenge:
            "Compare TWO inventions and argue which one changed football more. Give a different reason for each one before you decide.",
        },
      },
    ],
  },

  // Lesson 5: create a new invention and pitch it (opinion, solution, conclusion)
  "od2e-l3-u14-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["opinion", "solution", "conclusion", "commercial", "useful", "helpful", "carefully"],
      grammar: ["opinion with reasons", "comparative and superlative adverbs", "before and after"],
    },
    base: {
      title: "My own invention",
      task: "Invent something that solves a problem in your home or school. Write a short pitch for a commercial that persuades people to want it.",
      steps: [
        "Name the problem and your invention. Draw it and label two parts.",
        "Write your opinion: why this invention is the most useful one for the problem.",
        "Write two reasons, one with a comparative or superlative adverb.",
        "Say what people think is wrong with it and give a solution. Finish with a conclusion.",
      ],
      frames: [
        "Many people have a problem with ___.",
        "My invention, the ___, helps people ___.",
        "Before the ___, people used to ___. After it, they can ___.",
        "It works faster / more carefully than ___ because ___.",
        "Some people worry that ___, so we should ___. In conclusion, ___.",
      ],
      success: [
        "My writing states a clear opinion and gives two reasons.",
        "My writing includes a different view, a solution and a conclusion.",
        "I use one comparative or superlative adverb and before or after correctly.",
      ],
      challenge:
        "Write a one-minute commercial script for two voices, with a catchy slogan, and add one surprising fact about the real thing your invention improves.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A gadget for the Gunners' fans",
          task: "Invent a gadget that solves a problem for Arsenal fans on match day at the Emirates Stadium. Write a short pitch for a commercial that persuades people to want it.",
          steps: [
            "Name the match-day problem and your invention. Draw it and label two parts.",
            "Write your opinion: why this invention is the most useful one for the problem.",
            "Write two reasons, one with a comparative or superlative adverb.",
            "Say what people think is wrong with it and give a solution. Finish with a conclusion.",
          ],
          frames: [
            "Many fans have a problem with ___ on match day.",
            "My invention, the ___, helps fans ___.",
            "Before the ___, fans used to ___. After it, they can ___.",
            "It works faster / more carefully than ___ because ___.",
            "Some people worry that ___, so we should ___. In conclusion, ___.",
          ],
          success: [
            "My writing states a clear opinion and gives two reasons.",
            "My writing includes a different view, a solution and a conclusion.",
            "I use one comparative or superlative adverb and before or after correctly.",
          ],
          challenge:
            "Write a one-minute commercial script for two voices, with a catchy slogan for the Gunners' fans, and say how your gadget helps a fan who sits far from the pitch.",
        },
      },
    ],
  },

  // Lesson 6: Grammar Champions, comparative and superlative adverbs
  "od2e-l3-u14-l6": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["invention", "faster", "carefully", "quietly", "delicate", "useful"],
      grammar: ["comparative adverbs with than", "superlative adverbs with the", "because and so"],
    },
    base: {
      title: "Which invention helps the most?",
      task: "Choose three inventions that do the same job in different ways, such as ways to travel, ways to send a message or ways to make light. Compare them, decide which one helps people the most and explain why.",
      steps: [
        "Draw your three inventions in a row and label each one.",
        "Write two sentences that compare two of them with an adverb and than.",
        "Write one sentence that names the top one with the + a superlative adverb.",
        "Add because to give a reason and so to say what the result is for people.",
        "Finish with your opinion: which invention changed life the most, and why?",
      ],
      frames: [
        "A ___ works faster / more ___ly than a ___ because ___.",
        "The ___ works the fastest / the most ___ly of the three, so ___.",
        "Before the ___, people used to ___.",
        "In my opinion, the ___ helps people the most because ___.",
      ],
      success: [
        "I used than after a comparative adverb at least twice.",
        "I used the before a superlative adverb.",
        "I used because for a reason and so for a result.",
        "I gave my own opinion with a reason.",
      ],
      challenge:
        "Add a fourth, older invention and tell one thing it does better than the newer ones, so the ranking is not so simple.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which match-day invention helps fans the most?",
          task: "Choose three inventions that help fans follow a match, such as a stadium scoreboard, a radio and a phone app. Compare them, decide which one helps the Gunners' fans the most and explain why.",
          steps: [
            "Draw your three inventions in a row and label each one.",
            "Write two sentences that compare two of them with an adverb and than.",
            "Write one sentence that names the top one with the + a superlative adverb.",
            "Add because to give a reason and so to say what the result is for the fans.",
            "Finish with your opinion: which invention helps the fans the most, and why?",
          ],
          frames: [
            "A ___ tells fans the score faster / more ___ly than a ___ because ___.",
            "The ___ works the fastest / the most ___ly of the three, so fans can ___.",
            "Before the ___, fans used to ___.",
            "In my opinion, the ___ helps the Gunners' fans the most because ___.",
          ],
          success: [
            "I used than after a comparative adverb at least twice.",
            "I used the before a superlative adverb.",
            "I used because for a reason and so for a result.",
            "I gave my own opinion with a reason.",
          ],
          challenge:
            "Add a fourth, older way to follow a match, such as a newspaper, and tell one thing it does better than the newer ones.",
        },
      },
    ],
  },
};
