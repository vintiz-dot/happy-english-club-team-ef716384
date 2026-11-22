import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 17
// "Journeys and Explorers": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U17Creative: Record<string, Creative> = {
  // Lesson 1: design a map with weather and landform words
  "od2e-l3-u17-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["island", "waterfall", "coast", "river", "storm", "fog", "windy", "clouds"],
      grammar: ["It is + weather adjective", "There is / There are", "because"],
    },
    base: {
      title: "Map of Explorer Island",
      task: "Design a map of an island that nobody has explored yet. Label six places and write a weather note for the explorers.",
      steps: [
        "Draw the island and the sea around it. Add at least four landforms (for example a coast, a river, a waterfall, a mountain).",
        "Label six places with names you invent, and write what each one is.",
        "Write a weather note: what is the weather like on the island, and where is it worst?",
        "Choose the safest place for explorers to start, and say why.",
      ],
      frames: [
        "On the north coast there is a ___.",
        "The ___ river runs from the ___ to the ___.",
        "Here it is often ___ and ___.",
        "Explorers should start at the ___ because ___.",
        "Be careful near the ___ because of the ___.",
      ],
      success: [
        "My map has six labelled places and at least four landform words from the lesson.",
        "My weather note uses at least two weather words and one reason with because.",
        "My writing says where the explorers should start and why.",
      ],
      challenge:
        "Add a second map key with a warning sign for the two most dangerous places, and explain in two sentences how the weather could change the route.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Match-day map of Explorer Island",
          task: "Design a map of an island with a new football stadium for the Gunners. Label six places and write a weather note for the fans who travel there.",
          steps: [
            "Draw the island and the sea. Add the stadium and at least four landforms (a coast, a river, a waterfall, a mountain).",
            "Label six places with names you invent, and write what each one is.",
            "Write a match-day weather note: what is the weather like, and where is it worst for fans?",
            "Choose the best place for the fans to meet before the match, and say why.",
          ],
          frames: [
            "On the north coast there is a ___.",
            "The ___ river runs from the ___ to the stadium.",
            "On match day it is often ___ and ___.",
            "Fans should meet at the ___ because ___.",
            "Be careful near the ___ because of the ___.",
          ],
          success: [
            "My map has six labelled places, the stadium and at least four landform words from the lesson.",
            "My weather note uses at least two weather words and one reason with because.",
            "My writing says where the fans should meet and why.",
          ],
          challenge:
            "Add a second map key with a warning sign for the two most dangerous places for fans, and explain in two sentences how bad weather could change the way they travel to the match.",
        },
      },
    ],
  },

  // Lesson 2: evaluate which weather is most dangerous for a ship
  "od2e-l3-u17-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["storm", "fog", "lightning", "hail", "windy", "sail", "journey", "coast"],
      grammar: ["past simple (was / were / sailed)", "because", "the most dangerous"],
    },
    base: {
      title: "The most dangerous weather for a ship",
      task: "Judge which weather would be the most dangerous for a ship on a long journey. Write a journal entry from the ship that proves your point.",
      steps: [
        "Choose three kinds of weather from the lesson, for example a storm, fog and hail.",
        "For each one, write one sentence about what it does to a ship and the people on it.",
        "Decide which is the most dangerous and which is the least dangerous. Give a reason for each.",
        "Write a short journal entry (with a date) from a ship in the worst weather you chose.",
      ],
      frames: [
        "In a ___, a ship can ___.",
        "I think the most dangerous weather is ___ because ___.",
        "___ is not as dangerous as ___ because ___.",
        "On the ___ of ___, the sky was ___ and the sailors ___.",
        "At last the weather ___ and we ___.",
      ],
      success: [
        "My writing compares three kinds of weather and picks one as the most dangerous.",
        "My journal entry has a date and uses the past simple (was, were, sailed).",
        "My writing gives a reason with because for each choice.",
      ],
      challenge:
        "Write what a sailor could do to stay safe in the weather you chose, and say what the captain should decide before the ship leaves the coast.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Should the match go on?",
          task: "Judge which weather is the most dangerous for a football match at the Emirates Stadium. Write a journal entry from a fan caught in the worst weather.",
          steps: [
            "Choose three kinds of weather from the lesson, for example a storm, fog and hail.",
            "For each one, write one sentence about what it does to the players and the fans on match day.",
            "Decide which is the most dangerous and which is the least dangerous. Give a reason for each.",
            "Write a short journal entry (with a date) from a fan at the match in the worst weather you chose.",
          ],
          frames: [
            "In a ___, the players can ___.",
            "I think the most dangerous weather is ___ because ___.",
            "___ is not as dangerous as ___ because ___.",
            "On the ___ of ___, the sky was ___ and the fans ___.",
            "At last the weather ___ and the Gunners ___.",
          ],
          success: [
            "My writing compares three kinds of weather and picks one as the most dangerous.",
            "My journal entry has a date and uses the past simple (was, were, played).",
            "My writing gives a reason with because for each choice.",
          ],
          challenge:
            "Write what the referee should decide before the match starts in the weather you chose, and say what the fans could do to stay safe.",
        },
      },
    ],
  },

  // Lesson 3: create a route with movement words
  "od2e-l3-u17-l3": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["down", "through", "around", "across", "along", "past", "under", "river"],
      grammar: ["prepositions of movement", "imperatives (Go / Walk / Don't)", "First, then, finally"],
    },
    base: {
      title: "The secret route",
      task: "Create a secret route through a place you know (your school, your street or a park) and write the directions so that a friend can follow it to a hidden treasure.",
      steps: [
        "Draw a simple map and mark where the route starts and where the treasure is.",
        "Plan a route with at least five steps. Use at least four different movement words.",
        "Write the directions, starting each step with First, Then, Next or Finally.",
        "Add one warning with Don't, for example a place not to go.",
      ],
      frames: [
        "First, go down the ___.",
        "Then walk through the ___ and around the ___.",
        "Next, go across the ___ and along the ___.",
        "Don't go ___ the ___ because ___.",
        "Finally, look under the ___. The treasure is there!",
      ],
      success: [
        "My directions have at least five steps and four different movement words.",
        "My directions are in the right order and use First, Then, Next or Finally.",
        "My writing has one warning with Don't and a reason with because.",
      ],
      challenge:
        "Write a second, longer route to the same place that avoids the dangerous spot, and explain why you think it is the better route.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "From the station to the match",
          task: "Create a match-day route that takes fans from the train station to their seats at the Emirates Stadium, and write the directions so that a new fan can follow them.",
          steps: [
            "Draw a simple map and mark the station, the stadium gate and the seats.",
            "Plan a route with at least five steps. Use at least four different movement words.",
            "Write the directions, starting each step with First, Then, Next or Finally.",
            "Add one warning with Don't, for example a busy place to avoid before the match.",
          ],
          frames: [
            "First, go down the ___.",
            "Then walk through the ___ and around the ___.",
            "Next, go across the ___ and along the ___.",
            "Don't go ___ the ___ because ___.",
            "Finally, go through the gate. Your seat is there!",
          ],
          success: [
            "My directions have at least five steps and four different movement words.",
            "My directions are in the right order and use First, Then, Next or Finally.",
            "My writing has one warning with Don't and a reason with because.",
          ],
          challenge:
            "Write a second, longer route for fans who want to avoid the biggest crowd, and explain why you think it is the better route on a busy match day.",
        },
      },
    ],
  },

  // Lesson 4: argue why we explore, with before and after
  "od2e-l3-u17-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["journey", "explore", "look for", "look after", "look out", "look around", "coast", "sail"],
      grammar: ["before / after + clause", "because", "ordinal numbers for dates"],
    },
    base: {
      title: "Why every child should explore",
      task: "Argue that every child should explore somewhere new this year. Write a short speech with two reasons, a plan and a closing sentence that answers the Big Question.",
      steps: [
        "Write your opinion in one sentence: Every child should explore ...",
        "Give two reasons. Support each reason with an example.",
        "Plan an exploration. Say what you will do before you go and after you arrive, with a date.",
        "Finish with a sentence that answers: Why do we explore?",
      ],
      frames: [
        "I think every child should explore ___ because ___.",
        "My first reason is that ___. For example, ___.",
        "Before we go, we will ___. After we arrive, we will ___.",
        "On the ___ of ___, we will ___.",
        "In the end, people explore because ___.",
      ],
      success: [
        "My speech has an opinion, two reasons and an example for each.",
        "My plan uses before and after correctly, with a comma when the time word starts the sentence.",
        "My last sentence answers the Big Question and uses a date with an ordinal number.",
      ],
      challenge:
        "Answer a friend who says 'Staying at home is safer', with a polite reply that uses look out and look after, and give one thing you would do to keep safe.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Why fans should go to an away match",
          task: "Argue that Arsenal fans should travel to see the Gunners play in a new city this season. Write a short speech with two reasons, a plan and a closing sentence that answers the Big Question.",
          steps: [
            "Write your opinion in one sentence: Fans should travel to ...",
            "Give two reasons. Support each reason with an example from match day.",
            "Plan the trip. Say what you will do before you leave and after you arrive, with a date.",
            "Finish with a sentence that answers: Why do we explore?",
          ],
          frames: [
            "I think fans should travel to ___ because ___.",
            "My first reason is that ___. For example, ___.",
            "Before we leave, we will ___. After we arrive, we will ___.",
            "On the ___ of ___, we will ___.",
            "In the end, people explore because ___.",
          ],
          success: [
            "My speech has an opinion, two reasons and an example for each.",
            "My plan uses before and after correctly, with a comma when the time word starts the sentence.",
            "My last sentence answers the Big Question and uses a date with an ordinal number.",
          ],
          challenge:
            "Answer a friend who says 'It is better to watch the match at home on TV', with a polite reply that uses look out and look after, and give one thing you would do to keep safe on the trip.",
        },
      },
    ],
  },
};
