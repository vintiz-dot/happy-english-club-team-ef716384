import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 9
// "Sources of Energy": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U9Creative: Record<string, Creative> = {
  // Lesson 1: design an energy plan for an island with the unit's words
  "od2e-l3-u09-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["wind turbine", "wind farm", "windmill", "power plant", "electricity", "coal", "oil", "natural gas", "pollution"],
      grammar: ["classify: renewable or nonrenewable", "It makes ... / It comes from ...", "because"],
    },
    base: {
      title: "An energy plan for Sunny Island",
      task: "Imagine a small island with no electricity yet. Design a plan so that the people on the island can have light, heat and power. Draw a map of the island and write about your plan.",
      steps: [
        "Draw a map of the island with at least three places where energy is made or used (for example a wind farm, a power plant, a school, a house).",
        "Label each place with a word from our unit and say whether its energy is renewable or nonrenewable.",
        "Write three sentences to explain where the electricity comes from and how it gets to the houses.",
        "Choose the best idea for the island and say why it is better than another idea.",
      ],
      frames: [
        "On Sunny Island, the electricity comes from ___.",
        "The ___ is a source of ___ energy, so it is renewable / nonrenewable.",
        "The wires carry the electricity from the ___ to the ___.",
        "I chose ___ because it makes less pollution / does not run out.",
        "Another idea is to ___, but I think it is not as good because ___.",
      ],
      success: [
        "My map has labels, and at least two labels are words from our unit.",
        "My writing says where the electricity comes from and how it gets to the houses.",
        "My writing gives a reason for my choice with because.",
      ],
      challenge:
        "Add a problem: one day there is no wind and no sun. Write what the island people could do (for example, use a different source, keep energy in a battery, or save energy) and how you would make your plan better.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "An energy plan for a stadium",
          task: "Imagine you are planning how the Emirates Stadium will get light, heat and power on match day. Draw a map of the stadium and write about your plan for the Gunners and their fans.",
          steps: [
            "Draw a map of the stadium with at least three places that need energy or make it (for example the floodlights, the big screen, a wind turbine outside, a kitchen).",
            "Label each place with a word from our unit and say whether its energy is renewable or nonrenewable.",
            "Write three sentences to explain where the electricity comes from and how it gets to the floodlights.",
            "Choose the best idea for the stadium and say why it is better than another idea.",
          ],
          frames: [
            "At the stadium, the electricity comes from ___.",
            "The ___ is a source of ___ energy, so it is renewable / nonrenewable.",
            "The wires carry the electricity from the ___ to the ___.",
            "I chose ___ because it makes less pollution / does not run out.",
            "Another idea is to ___, but I think it is not as good because ___.",
          ],
          success: [
            "My map has labels, and at least two labels are words from our unit.",
            "My writing says where the electricity comes from and how it reaches the floodlights.",
            "My writing gives a reason for my choice with because.",
          ],
          challenge:
            "Add a problem: it is a cloudy, still evening and there is a night match. Write what the stadium could do (use a different source, store energy in a battery, or save energy) and how you would make your plan better.",
        },
      },
    ],
  },

  // Lesson 2: evaluate which source of energy is best for a town
  "od2e-l3-u09-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["renewable", "nonrenewable", "source", "fossil fuels", "solar panel", "wind turbine", "power plant", "pollution"],
      grammar: ["paraphrasing: in other words", "because / so", "present simple to explain how it works"],
    },
    base: {
      title: "The best source for our town",
      task: "A town needs a new source of energy. Judge two sources from our reading and decide which one is better for the town. Write your decision and defend it with evidence.",
      steps: [
        "Choose two sources, for example the sun and the wind, or water and a fossil fuel. Write one fact about each, in your own words.",
        "Think about this question: what are the good things and the bad things about each one?",
        "Decide which source is better for the town and write why, with two reasons.",
        "Write one good thing about the other source. A fair judge is honest.",
      ],
      frames: [
        "A ___ makes electricity from ___. In other words, ___.",
        "It is renewable / nonrenewable, so ___.",
        "The good thing about ___ is ___, but the bad thing is ___.",
        "I think ___ is better for our town because ___ and ___.",
        "___ is useful, too, but it is not as good because ___.",
      ],
      success: [
        "My writing names two sources and gives a fact about each, in my own words.",
        "My writing gives at least two reasons for my decision, joined with because or so.",
        "My writing says if each source is renewable and if it makes pollution.",
      ],
      challenge:
        "Make a top-three list of the best sources for your town and give each a score out of 10. Explain the score of the source you put last, and say who might disagree with you and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best power for the stadium floodlights",
          task: "The Emirates Stadium needs power for its floodlights. Judge two sources of energy and decide which one is better for the stadium. Write your decision and defend it with evidence.",
          steps: [
            "Choose two sources, for example solar panels on the roof and a power plant that burns gas. Write one fact about each, in your own words.",
            "Think about this question: what are the good things and the bad things about each one for a night match?",
            "Decide which source is better for the stadium and write why, with two reasons.",
            "Write one good thing about the other source. A fair judge is honest.",
          ],
          frames: [
            "A ___ makes electricity from ___. In other words, ___.",
            "It is renewable / nonrenewable, so ___.",
            "The good thing about ___ for the stadium is ___, but the bad thing is ___.",
            "I think ___ is better for the Gunners' stadium because ___ and ___.",
            "___ is useful, too, but it is not as good because ___.",
          ],
          success: [
            "My writing names two sources and gives a fact about each, in my own words.",
            "My writing gives at least two reasons for my decision, joined with because or so.",
            "My writing says if each source is renewable and if it makes pollution.",
          ],
          challenge:
            "Make a top-three list of the best sources for a stadium and give each a score out of 10. Explain the score of the source you put last, and say which person at the stadium might disagree with you and why.",
        },
      },
    ],
  },

  // Lesson 3: create a postcard from the future with may and might
  "od2e-l3-u09-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["wind farm", "solar panel", "electricity", "pollution", "renewable", "power plant"],
      grammar: ["may + plain verb", "might + plain verb", "will for sure things"],
    },
    base: {
      title: "A postcard from 2060",
      task: "Imagine it is the year 2060. Write a postcard to someone today about what the world may or might be like. Think about how people get energy in the future.",
      steps: [
        "Draw the front of your postcard: a place in 2060 with a new way to make or use energy.",
        "Write a greeting and one sentence about the place.",
        "Write two sentences with may and two with might about energy in the future. Say why for at least one.",
        "Write one sentence with will about something you are sure about, and finish with a question for the reader.",
      ],
      frames: [
        "Dear ___, greetings from the year 2060!",
        "People may use ___ to make electricity.",
        "We might not need ___ any more because ___.",
        "The air may be cleaner because ___.",
        "I am sure that the sun will ___. What do you think will change?",
      ],
      success: [
        "My postcard has a picture, a greeting and a question at the end.",
        "My writing uses may and might correctly (plain verb, no -s, no to) at least four times.",
        "My writing uses will for one sure thing and gives a reason with because.",
      ],
      challenge:
        "Write a second postcard from a different place in 2060, one where things have gone wrong (for example the oil ran out). Use may not and might not, and say what people might do to fix the problem.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A postcard from a match in 2060",
          task: "Imagine it is the year 2060 and you are at an Arsenal match at the Emirates Stadium. Write a postcard to someone today about what the stadium may or might be like and how it gets its energy.",
          steps: [
            "Draw the front of your postcard: the stadium in 2060 with a new way to make or use energy.",
            "Write a greeting and one sentence about the match day.",
            "Write two sentences with may and two with might about the stadium's energy in the future. Say why for at least one.",
            "Write one sentence with will about something you are sure about, and finish with a question for the reader.",
          ],
          frames: [
            "Dear ___, greetings from the Emirates in the year 2060!",
            "The stadium may use ___ to make electricity.",
            "The fans might not need ___ any more because ___.",
            "The air outside may be cleaner because ___.",
            "I am sure that the Gunners will ___. What do you think will change?",
          ],
          success: [
            "My postcard has a picture, a greeting and a question at the end.",
            "My writing uses may and might correctly (plain verb, no -s, no to) at least four times.",
            "My writing uses will for one sure thing and gives a reason with because.",
          ],
          challenge:
            "Write a second postcard from a night match when the floodlights do not work. Use may not and might not, and say what the staff might do to fix the problem.",
        },
      },
    ],
  },

  // Lesson 4: compare two sources and justify, with count / noncount verbs
  "od2e-l3-u09-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["solar panel", "wind turbine", "electricity", "pollution", "renewable", "conserve", "waste"],
      grammar: ["is / are with count and noncount nouns", "may / might", "because"],
    },
    base: {
      title: "Solar or wind for our school?",
      task: "Your school wants to make some of its own electricity. Compare solar panels with a wind turbine, then choose which one to build and justify your choice.",
      steps: [
        "Write two sentences about how solar panels and a wind turbine are the same. Use is or are correctly.",
        "Write two sentences about how they are different (what they need, where they work best).",
        "Choose one for your school and give two reasons.",
        "Say one problem with your choice, using may or might, and how the school could solve it.",
      ],
      frames: [
        "Solar panels and a wind turbine are both ___.",
        "Solar panels need ___, but a wind turbine needs ___.",
        "Electricity is ___ and pollution is ___.",
        "I would choose ___ because ___ and ___.",
        "The ___ might not work when ___, so the school could ___.",
      ],
      success: [
        "My writing uses is or are correctly with count and noncount nouns at least four times.",
        "My writing says how the two things are the same and how they are different.",
        "My writing gives two reasons for the choice and thinks about a problem with may or might.",
      ],
      challenge:
        "Compare a third choice (water power or saving energy) with the first two. Say which of the three is best for your school and why, and write one sentence with waste and one with conserve.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Solar or wind for the stadium?",
          task: "The Emirates Stadium wants to make some of its own electricity. Compare solar panels with a wind turbine, then choose which one to build and justify your choice.",
          steps: [
            "Write two sentences about how solar panels and a wind turbine are the same. Use is or are correctly.",
            "Write two sentences about how they are different (what they need, where they work best).",
            "Choose one for the stadium and give two reasons.",
            "Say one problem with your choice, using may or might, and how the stadium could solve it.",
          ],
          frames: [
            "Solar panels and a wind turbine are both ___.",
            "Solar panels need ___, but a wind turbine needs ___.",
            "Electricity is ___ and pollution is ___.",
            "I would choose ___ because ___ and ___.",
            "The ___ might not work when ___, so the stadium could ___.",
          ],
          success: [
            "My writing uses is or are correctly with count and noncount nouns at least four times.",
            "My writing says how the two things are the same and how they are different.",
            "My writing gives two reasons for the choice and thinks about a problem with may or might.",
          ],
          challenge:
            "Compare a third choice (water power or saving energy) with the first two. Say which of the three is best for a stadium and why, and write one sentence with waste and one with conserve.",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): a weather forecast for a made-up island with will, may and might
  "od2e-l3-u09-l5": {
    kind: "creative",
    thinking: "Imagine and justify",
    uses: {
      words: ["wind turbine", "solar panel", "electricity", "renewable", "pollution", "power plant"],
      grammar: ["will for sure things", "may / might + plain verb", "because and so"],
    },
    base: {
      title: "The energy forecast for Breeze Island",
      task: "Breeze Island is a made-up island that gets its energy from the sun and the wind. Imagine you are the island's weather and energy reporter. Write the forecast for tomorrow and tell the islanders what they can be sure of and what they cannot be sure of yet.",
      steps: [
        "Draw the island with its wind turbines, solar panels and a battery house, and label six things.",
        "Write two sentences about what you are sure of tomorrow, with will.",
        "Write three sentences about what is not sure, with may or might. Give a reason with because for at least one.",
        "Write one sentence with so that tells the islanders what to do, and finish with a question for them.",
      ],
      frames: [
        "Good morning, Breeze Island! Here is the forecast.",
        "The sun will ___, so the solar panels will ___.",
        "The wind may ___ because ___.",
        "The batteries might ___ if ___.",
        "What do you think the island will do if the wind stops?",
      ],
      success: [
        "My forecast has a picture, a greeting and a question at the end.",
        "My writing uses will for sure things and may or might for not sure things, with a plain verb after may and might.",
        "My writing gives a reason with because and a result with so.",
      ],
      challenge:
        "Write a second forecast for a stormy week. Use may not and might not, and say how the island could keep its power with a different source of energy.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The energy forecast for Match Day",
          task: "A big football match is on tomorrow at a stadium that makes its own electricity from the sun and the wind. Imagine you are the stadium's weather and energy reporter. Write the forecast for match day and tell the fans what is sure and what is not sure yet.",
          steps: [
            "Draw the stadium with its solar panels and wind turbines, and label six things.",
            "Write two sentences about what you are sure of on match day, with will.",
            "Write three sentences about what is not sure, with may or might. Give a reason with because for at least one.",
            "Write one sentence with so that tells the fans what to do, and finish with a question for them.",
          ],
          frames: [
            "Good morning, football fans! Here is the match-day forecast.",
            "The sun will ___, so the solar panels will ___.",
            "The wind may ___ because ___.",
            "The floodlights might ___ if ___.",
            "What do you think the stadium will do if the wind stops?",
          ],
          success: [
            "My forecast has a picture, a greeting and a question at the end.",
            "My writing uses will for sure things and may or might for not sure things, with a plain verb after may and might.",
            "My writing gives a reason with because and a result with so.",
          ],
          challenge:
            "Write a second forecast for a stormy night match. Use may not and might not, and say how the stadium could keep its floodlights on with a different source of energy.",
        },
      },
    ],
  },
};
