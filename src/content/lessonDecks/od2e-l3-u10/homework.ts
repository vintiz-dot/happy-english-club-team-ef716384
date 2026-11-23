import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 10
// "Energy Savers on the Move": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U10Creative: Record<string, Creative> = {
  // Lesson 1: design a vehicle that beats a traffic jam
  "od2e-l3-u10-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["traffic jam", "carpool", "helicopter", "subway", "escalator", "elevator", "ambulance", "taxi"],
      grammar: ["questions with who, what, when, where, why"],
    },
    base: {
      title: "The Traffic Jam Beater",
      task: "Design a new way to travel that helps people escape a traffic jam and also saves energy. Draw it, name it and explain how it works.",
      steps: [
        "Draw your invention and label two or three parts.",
        "Write three sentences: what it is called, who it carries and where it goes.",
        "Write two sentences about how it helps in a traffic jam and how it saves energy.",
        "Write three questions a reporter could ask you about it, with who, what, when, where or why.",
      ],
      frames: [
        "My invention is called the ___.",
        "It carries ___ people from ___ to ___.",
        "In a traffic jam, it can ___ so nobody has to wait.",
        "It saves energy because ___.",
        "Reporter: Why / How / Where ___?",
      ],
      success: [
        "My design says who it carries and where it goes.",
        "My writing uses at least four of our transportation words correctly.",
        "My three questions start with question words and end with a question mark.",
      ],
      challenge:
        "Add a second invention that works together with the first one, for example a carpool app, and explain why the two ideas are stronger together.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Match-Day Traffic Beater",
          task: "Imagine thousands of Arsenal fans trying to reach the Emirates Stadium on match day. Design a new way to travel that beats the traffic jam and saves energy. Draw it, name it and explain how it works.",
          steps: [
            "Draw your invention and label two or three parts.",
            "Write three sentences: what it is called, which fans it carries and where it goes.",
            "Write two sentences about how it helps on match day and how it saves energy.",
            "Write three questions a reporter could ask you about it, with who, what, when, where or why.",
          ],
          frames: [
            "My invention is called the ___.",
            "It carries ___ fans from ___ to the stadium.",
            "On match day, it can ___ so nobody misses the kick-off.",
            "It saves energy because ___.",
            "Reporter: Why / How / Where ___?",
          ],
          success: [
            "My design says who it carries and where it goes.",
            "My writing uses at least four of our transportation words correctly.",
            "My three questions start with question words and end with a question mark.",
          ],
          challenge:
            "Add a second idea that works together with the first one, for example a fan carpool club, and explain why the two ideas are stronger together.",
        },
      },
    ],
  },

  // Lesson 2: judge a superhero and ask questions about the story
  "od2e-l3-u10-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["mask", "button", "pedal", "blades", "ambulance", "traffic jam"],
      grammar: ["asking questions as you read", "because and so", "past simple to retell"],
    },
    base: {
      title: "How good a superhero is Hector?",
      task: "Judge Hector as an energy-saving superhero. Give him a score out of 5, explain it with evidence from the story and ask three questions you still have.",
      steps: [
        "Write your score out of 5 for how good Hector is at saving energy.",
        "Retell what Hector did in three sentences, in the past tense.",
        "Give two reasons for your score, one from the story and one from real life.",
        "Write three questions you still want answered about Hector, his bicycle or Mr. Big.",
      ],
      frames: [
        "I give Hector ___ out of 5.",
        "First, ___. Then, ___. In the end, ___.",
        "He is a good superhero because ___.",
        "In real life, a bicycle saves energy because ___.",
        "I still wonder: Why / How / Who ___?",
      ],
      success: [
        "My score is clear and I give at least two reasons for it.",
        "My retelling uses the past tense and time words.",
        "My three questions are real questions that the story does not answer.",
      ],
      challenge:
        "Write a short answer that Hector could give to one of your questions, in his own superhero voice, with one exclamation mark.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Could Hector captain the Gunners?",
          task: "Imagine Hector comes to the Emirates Stadium to help the Arsenal team save energy. Judge whether he would make a good team captain. Give him a score out of 5, explain it with evidence from the story and ask three questions.",
          steps: [
            "Write your score out of 5 for how good a captain Hector would be.",
            "Retell what Hector did in the story in three sentences, in the past tense.",
            "Give two reasons for your score, one from the story and one about football.",
            "Write three questions you would ask Hector before you let him lead the team.",
          ],
          frames: [
            "I give Hector ___ out of 5 as a captain.",
            "First, ___. Then, ___. In the end, ___.",
            "He would be a good captain because ___.",
            "In football, a captain must ___, so ___.",
            "I would ask him: Why / How / Who ___?",
          ],
          success: [
            "My score is clear and I give at least two reasons for it.",
            "My retelling uses the past tense and time words.",
            "My three questions are real questions that the story does not answer.",
          ],
          challenge:
            "Write a short team talk that Hector could give in the changing room about saving energy, with one exclamation mark.",
        },
      },
    ],
  },

  // Lesson 3: compare and justify with quantifiers (an energy check of a place)
  "od2e-l3-u10-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["a lot of", "lots of", "a few", "a little", "energy", "electricity", "lights", "fans"],
      grammar: ["quantifiers: a lot of, lots of, a few, a little", "count and noncount nouns"],
    },
    base: {
      title: "The Energy Check",
      task: "Do an energy check of one room at school or at home. Say what uses energy, how much of it there is, and which thing you would switch off first. Justify your choice.",
      steps: [
        "Choose one room and list six things in it that use energy.",
        "Write four sentences with a lot of, lots of, a few and a little about those things.",
        "Choose the ONE thing you would switch off first. Say why.",
        "Write a rule for the room that would save energy, with a reason.",
      ],
      frames: [
        "In our ___ there are a lot of ___ and a few ___.",
        "There is a little ___ near the window.",
        "We use lots of energy for ___.",
        "I would switch off the ___ first because ___.",
        "Our rule is: ___, so we save ___.",
      ],
      success: [
        "I use a few with things I can count and a little with things I cannot count.",
        "I use at least three different quantifiers correctly.",
        "My choice has a reason with because.",
      ],
      challenge:
        "Compare two rooms (for example the classroom and the school hall) with two quantifier sentences each, then say which room could save more energy and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Stadium Energy Check",
          task: "Imagine you are the energy manager at the Emirates Stadium. Check one part of the stadium on match day. Say what uses energy, how much of it there is, and which thing you would switch off first. Justify your choice.",
          steps: [
            "Choose one part of the stadium (for example the pitch lights, the food stands or the big screens) and list six things in it that use energy.",
            "Write four sentences with a lot of, lots of, a few and a little about those things.",
            "Choose the ONE thing you would switch off first when no match is on. Say why.",
            "Write a rule for the stadium that would save energy, with a reason.",
          ],
          frames: [
            "In the ___ there are a lot of ___ and a few ___.",
            "There is a little ___ in the corridor.",
            "On match day we use lots of energy for ___.",
            "I would switch off the ___ first because ___.",
            "Our rule is: ___, so we save ___.",
          ],
          success: [
            "I use a few with things I can count and a little with things I cannot count.",
            "I use at least three different quantifiers correctly.",
            "My choice has a reason with because.",
          ],
          challenge:
            "Compare match day and a quiet Tuesday with two quantifier sentences each, then say when the stadium could save more energy and why.",
        },
      },
    ],
  },

  // Lesson 4: argue which way of travelling saves most energy
  "od2e-l3-u10-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["carpool", "subway", "taxi", "train", "helicopter", "rebuilt", "recharged", "replanted"],
      grammar: ["a, an and the", "prefix re-", "quantifiers"],
    },
    base: {
      title: "The best way to get to school",
      task: "Argue that one way of getting to school is the best for saving energy. Compare it with another way, answer someone who disagrees and finish with a clear conclusion.",
      steps: [
        "Choose one way to travel (walking, cycling, the bus, the subway or a carpool) as your winner.",
        "Write two reasons why it saves energy. Use a or an the first time you name something and the after that.",
        "Compare it with a different way of travelling that uses a lot of energy.",
        "Write what someone who disagrees might say and answer them. Finish with a conclusion.",
      ],
      frames: [
        "I believe that ___ is the best way to get to school.",
        "First, it uses a little / a lot of ___. The ___ saves energy because ___.",
        "A ___ uses lots of energy because ___.",
        "Some people say ___, but ___.",
        "That is why I think ___.",
      ],
      success: [
        "My argument has two reasons and a comparison.",
        "I use a, an and the correctly, and at least one quantifier.",
        "I answer a different view and finish with a conclusion.",
      ],
      challenge:
        "Use at least one word with re- (for example recharged, rebuilt or replanted) in a sentence about a way of travelling that is being made greener.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best way to get to the stadium",
          task: "Argue that one way of getting to the Emirates Stadium on match day is the best for saving energy. Compare it with another way, answer someone who disagrees and finish with a clear conclusion.",
          steps: [
            "Choose one way for fans to travel (walking, cycling, a bus, a train or a carpool) as your winner.",
            "Write two reasons why it saves energy. Use a or an the first time you name something and the after that.",
            "Compare it with a different way of travelling that uses a lot of energy.",
            "Write what someone who disagrees might say and answer them. Finish with a conclusion.",
          ],
          frames: [
            "I believe that ___ is the best way to get to the stadium.",
            "First, it uses a little / a lot of ___. The ___ saves energy because ___.",
            "A ___ uses lots of energy because ___.",
            "Some fans say ___, but ___.",
            "That is why I think ___.",
          ],
          success: [
            "My argument has two reasons and a comparison.",
            "I use a, an and the correctly, and at least one quantifier.",
            "I answer a different view and finish with a conclusion.",
          ],
          challenge:
            "Use at least one word with re- (for example recharged or rebuilt) in a sentence about how a club could make match-day travel greener.",
        },
      },
    ],
  },

  // Lesson 5: create and deliver a speech
  "od2e-l3-u10-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["energy", "wind", "sun", "fossil fuels", "carpool", "electricity", "recharged", "rebuilt"],
      grammar: ["a, an and the", "quantifiers", "sequence words: first, next, finally"],
    },
    base: {
      title: "A speech to save energy",
      task: "Write a short speech to persuade your school to save energy. Begin with a question, give three reasons, and end with a closing summary and a wish for the future.",
      steps: [
        "Choose your topic: one type of energy, or one way to save energy.",
        "Write an opening question or surprising statement.",
        "Write three reasons with first, next and finally.",
        "Write a closing summary and one wish for the future.",
      ],
      frames: [
        "Did you know that ___?",
        "First, ___. Next, ___. Finally, ___.",
        "If we all ___, we will save a lot of ___.",
        "To sum up, ___.",
        "I hope that one day ___.",
      ],
      success: [
        "My speech starts with a question or an interesting statement.",
        "My speech has three reasons joined with sequence words.",
        "My speech ends with a summary and a wish, and I use a, an and the correctly.",
      ],
      challenge:
        "Add a fact you found out yourself about the sun, the wind or fossil fuels, and read your speech aloud to someone at home without looking at it too often.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A speech to the Gunners' fans",
          task: "Write a short speech for the stadium speakers that persuades Arsenal fans to save energy on match day. Begin with a question, give three reasons, and end with a closing summary and a wish for the future.",
          steps: [
            "Choose your topic: one type of energy, or one way for fans to save energy.",
            "Write an opening question or surprising statement for the crowd.",
            "Write three reasons with first, next and finally.",
            "Write a closing summary and one wish for the future of football.",
          ],
          frames: [
            "Gunners fans, did you know that ___?",
            "First, ___. Next, ___. Finally, ___.",
            "If we all ___, we will save a lot of ___.",
            "To sum up, ___.",
            "I hope that one day ___.",
          ],
          success: [
            "My speech starts with a question or an interesting statement.",
            "My speech has three reasons joined with sequence words.",
            "My speech ends with a summary and a wish, and I use a, an and the correctly.",
          ],
          challenge:
            "Add a fact you found out yourself about the sun, the wind or fossil fuels, and read your speech aloud to someone at home without looking at it too often.",
        },
      },
    ],
  },

  // Lesson 6 (Grammar Champions): choose the best energy for a place and justify it
  "od2e-l3-u10-l6": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["solar panels", "wind turbines", "electricity", "sunshine", "oil", "energy"],
      grammar: ["a lot of / lots of / a few / a little", "How many and How much", "because and so"],
    },
    base: {
      title: "The Best Energy for My Town",
      task: "Imagine a made-up town with sunshine, wind and a little oil. Compare two sources of energy for the town, choose the best one and tell the mayor why.",
      steps: [
        "Draw your town and label six things, some you can count and some you cannot.",
        "Write two sentences about each energy source with a lot of, a few or a little.",
        "Choose the ONE source you would use most. Say why with because.",
        "Write what the town should do next, with so.",
      ],
      frames: [
        "My town has a lot of ___ and a few ___.",
        "There is only a little ___, so ___.",
        "I would choose ___ energy because ___.",
        "How many ___ do we need? How much ___ is there?",
        "If we use ___, we will save lots of ___.",
      ],
      success: [
        "I use a few with things I can count and a little with things I cannot count.",
        "Every a lot of and lots of has of.",
        "My choice has a reason with because and a result with so.",
      ],
      challenge:
        "Write a short answer to someone who says 'Oil is the best, because there is a lot of it.' Use because and one quantifier, and say politely why you agree or disagree.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Best Energy for the Stadium",
          task: "Imagine a made-up football stadium that wants to use less oil. Compare two sources of energy for it, choose the best one and tell the stadium manager why.",
          steps: [
            "Draw your stadium and label six things, some you can count (floodlights, seats) and some you cannot (sunshine, wind).",
            "Write two sentences about each energy source with a lot of, a few or a little.",
            "Choose the ONE source you would use most on match day. Say why with because.",
            "Write what the stadium should do next, with so.",
          ],
          frames: [
            "My stadium has a lot of ___ and a few ___.",
            "There is only a little ___, so ___.",
            "I would choose ___ energy because ___.",
            "How many ___ do we need? How much ___ is there?",
            "If we use ___, we will save lots of ___.",
          ],
          success: [
            "I use a few with things I can count and a little with things I cannot count.",
            "Every a lot of and lots of has of.",
            "My choice has a reason with because and a result with so.",
          ],
          challenge:
            "Write a short answer to a fan who says 'Floodlights need a lot of energy, so we cannot save any.' Use because and one quantifier, and say politely why you agree or disagree.",
        },
      },
    ],
  },
};
