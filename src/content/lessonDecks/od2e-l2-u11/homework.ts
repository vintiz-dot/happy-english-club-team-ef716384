import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 11: one task per
// lesson, keyed by deck id. Each has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app,
// never written here. Children are 7-9, so a task is a drawing plus two to four short
// sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U11Creative: Record<string, Creative> = {
  "od2e-l2-u11-l1": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "trash",
        "land",
        "landfill",
        "smoke",
        "reduce",
        "reuse",
        "resources"
      ],
      "grammar": [
        "Before, this place was ___. Now it is ___.",
        "was / is for before and now"
      ]
    },
    "base": {
      "title": "Before and after: a clean place",
      "task": "Draw one place with a little trash in it, and the same place after someone cleans it. Write a before and after sentence.",
      "steps": [
        "Choose a place, for example a park, a beach or a street.",
        "Draw it with some trash in it. This is the picture for before.",
        "Draw the same place after it is clean. This is the picture for now.",
        "Write the two sentences under the pictures."
      ],
      "frames": [
        "Before, this place was ___.",
        "Now it is ___.",
        "The magic cleaner changed the ___ first because ___.",
        "We can reduce / reuse ___."
      ],
      "success": [
        "My two pictures show the same place.",
        "I use was for before and is for now.",
        "I can say what to change first and why."
      ],
      "challenge": "Write five of today's words and say for each one: can people make it? Write three sentences: 'People can't make ___ because ___.' Ask someone at home to guess your reason."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Before and after: the stadium clean-up",
          "task": "Draw the area outside the Emirates Stadium with a little trash after a match, and the same place after the clean-up. Write a before and after sentence.",
          "steps": [
            "Draw the street outside the Gunners' stadium with some trash in it. This is the picture for before.",
            "Draw the same place after the helpers clean it. This is the picture for now.",
            "Add a red Arsenal flag or scarf to both pictures.",
            "Write the two sentences under the pictures."
          ],
          "frames": [
            "Before, the stadium was ___.",
            "Now it is ___.",
            "The magic cleaner changed the ___ first because ___.",
            "Fans can reduce / reuse ___."
          ],
          "success": [
            "My two pictures show the same place.",
            "I use was for before and is for now.",
            "I can say what to change first and why."
          ],
          "challenge": "Write five of today's words and say for each one: can people make it? Write three sentences about match day: 'People can't make ___ because ___.' Ask someone at home to guess your reason."
        }
      }
    ]
  },
  "od2e-l2-u11-l2": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "reuse",
        "reduce",
        "trash",
        "wood",
        "resources",
        "landfill"
      ],
      "grammar": [
        "Before, it was a ___. Now it is a ___.",
        "because for a reason"
      ]
    },
    "base": {
      "title": "My new thing from an old thing",
      "task": "With a grown-up's OK, make something new from something old at home, or draw your invention. Write before and now.",
      "steps": [
        "Find an old thing at home, for example a box, a bottle or a jar. Ask a grown-up first.",
        "Make something new from it, or draw your invention.",
        "Write: Before, it was a ___. Now it is a ___.",
        "Write why it is a good idea."
      ],
      "frames": [
        "Before, it was a ___.",
        "Now it is a ___.",
        "It is a good idea because ___.",
        "This helps the Earth because ___."
      ],
      "success": [
        "My invention uses an old thing.",
        "I use Before ... was and Now ... is correctly.",
        "I can say why it helps the Earth."
      ],
      "challenge": "Write a short text with a main idea and two details about one way to take care of the Earth. Use one colour for the main idea and another colour for the details."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A football invention from an old thing",
          "task": "With a grown-up's OK, make something football-themed from something old, or draw your invention. Write before and now.",
          "steps": [
            "Find an old thing at home, for example a box, a sock or a bottle. Ask a grown-up first.",
            "Make or draw something for an Arsenal fan, for example a goal, a trophy or a scarf holder.",
            "Write: Before, it was a ___. Now it is a ___.",
            "Write why it is a good idea."
          ],
          "frames": [
            "Before, it was a ___.",
            "Now it is a ___ for a Gunners fan.",
            "It is a good idea because ___.",
            "This helps the Earth because ___."
          ],
          "success": [
            "My invention uses an old thing.",
            "I use Before ... was and Now ... is correctly.",
            "I can say why it helps the Earth."
          ],
          "challenge": "Write a short text with a main idea and two details about one way fans can take care of the Earth on match day. Use one colour for the main idea and another colour for the details."
        }
      }
    ]
  },
  "od2e-l2-u11-l3": {
    "kind": "creative",
    "thinking": "Evaluate",
    "uses": {
      "words": [
        "above",
        "behind",
        "in front of",
        "across from",
        "land",
        "sunlight"
      ],
      "grammar": [
        "Where is it? It is above / behind / in front of / across from the ___.",
        "There is / There are"
      ]
    },
    "base": {
      "title": "My dream park",
      "task": "Draw your dream park with six things in it. Write four sentences with place words. Decide one thing that must NOT be in your park.",
      "steps": [
        "Draw your dream park with six things in it, for example a tree, a lake, a bench, a bin, a slide and a shop.",
        "Write four sentences with above, behind, in front of and across from.",
        "Choose one thing that must NOT be in your park.",
        "Say why it must not be there."
      ],
      "frames": [
        "The ___ is above the ___.",
        "The ___ is behind the ___.",
        "The ___ is in front of / across from the ___.",
        "There must not be a ___ because ___."
      ],
      "success": [
        "I use all four place words.",
        "My sentences match my picture.",
        "I can say why one thing must not be in my park."
      ],
      "challenge": "Write six sentences about your bedroom with place words. Add two questions starting 'Where is ___?'. Ask someone at home to answer."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "My dream football park",
          "task": "Draw your dream football park for Gunners fans with six things in it. Write four sentences with place words. Decide one thing that must NOT be in your park.",
          "steps": [
            "Draw a park with a pitch and five more things, for example a goal, a flag, a bench, a bin and a snack shop.",
            "Write four sentences with above, behind, in front of and across from.",
            "Choose one thing that must NOT be in your football park.",
            "Say why it must not be there."
          ],
          "frames": [
            "The ___ is above the ___.",
            "The ___ is behind the ___.",
            "The ___ is in front of / across from the ___.",
            "There must not be a ___ because ___."
          ],
          "success": [
            "I use all four place words.",
            "My sentences match my picture.",
            "I can say why one thing must not be in my park."
          ],
          "challenge": "Write six sentences about the Emirates Stadium or your football pitch with place words. Add two questions starting 'Where is ___?'. Ask someone at home to answer."
        }
      }
    ]
  },
  "od2e-l2-u11-l4": {
    "kind": "creative",
    "thinking": "Argue",
    "uses": {
      "words": [
        "camp",
        "hike",
        "ride a horse",
        "surf",
        "fish",
        "ski"
      ],
      "grammar": [
        "four kinds of words: verb, noun, adjective, pronoun",
        "We need ___ because ___. Please ___."
      ]
    },
    "base": {
      "title": "Earth helper poster: the most important rule",
      "task": "Choose one natural resource. Draw it on a poster and argue which rule matters most for it.",
      "steps": [
        "Choose a resource: water, wood, land or sunlight.",
        "Draw it on a poster.",
        "Write: We need ___ because ___. Please ___.",
        "Choose the most important rule for this resource and say why you chose it."
      ],
      "frames": [
        "We need ___ because ___.",
        "Please ___.",
        "The most important rule is ___ because ___.",
        "We can ___ the ___ together."
      ],
      "success": [
        "My poster has a picture, a need and a rule.",
        "I use at least one verb, one noun, one adjective and one pronoun.",
        "I can say why my rule is the most important."
      ],
      "challenge": "Write a four-line dialogue: one child gives a polite reminder, another says sorry and asks where something is, and the first answers with a place word. Underline one verb, one noun, one adjective and one pronoun."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A poster for fans: the most important rule",
          "task": "Choose one natural resource that Arsenal fans use on match day. Draw it on a poster and argue which rule matters most for it.",
          "steps": [
            "Choose a resource: water, wood or sunlight. Think about the Emirates Stadium.",
            "Draw it on a poster with a red Gunners border.",
            "Write: We need ___ because ___. Please ___.",
            "Choose the most important rule for fans and say why you chose it."
          ],
          "frames": [
            "At the match, we need ___ because ___.",
            "Please ___.",
            "The most important rule is ___ because ___.",
            "Fans can ___ the ___ together."
          ],
          "success": [
            "My poster has a picture, a need and a rule.",
            "I use at least one verb, one noun, one adjective and one pronoun.",
            "I can say why my rule is the most important."
          ],
          "challenge": "Write a four-line dialogue between two fans: one gives a polite reminder, another says sorry and asks where something is, and the first answers with a place word. Underline one verb, one noun, one adjective and one pronoun."
        }
      }
    ]
  },
  "od2e-l2-u11-l5": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": ["trash", "reuse", "reduce", "land", "wood", "resources"],
      "grammar": ["Where is the ___? It is above / behind / in front of / across from the ___.", "Is the ___ behind the ___? Yes, it is."]
    },
    "base": {
      "title": "Plan a clean park: where does everything go?",
      "task": "Design a clean park on paper. Put a recycling bin in the best place, and say why. Write a question and an answer about your map.",
      "steps": [
        "Draw a park with six things: a tree, a bench, a pond, a trash can, a recycling bin and one thing you choose.",
        "Decide the best place for the recycling bin. Put it there.",
        "Write three sentences that say where things are, with two different place words.",
        "Write one question and its answer, and one sentence that says why the bin is in that place."
      ],
      "frames": [
        "The ___ is above / behind / in front of / across from the ___.",
        "Is the ___ behind the ___? Yes, it is. / No, it isn't.",
        "I put the recycling bin ___ the ___ because ___.",
        "A clean park helps the Earth because ___."
      ],
      "success": [
        "My map has six things and a recycling bin.",
        "Each place sentence has two things and is or are.",
        "My question starts with Is, Are or Where, and I can say why the bin is there."
      ],
      "challenge": "Write the opposite of each place sentence: if the bin is behind the tree, the tree is in front of the bin. Then explain to someone at home why we need two things for a place word."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Plan a clean football park: where does everything go?",
          "task": "Design a clean football park on paper. Put a recycling bin in the best place, and say why. Write a question and an answer about your map.",
          "steps": [
            "Draw a football park with six things: a pitch, a goal, a bench, a trash can, a recycling bin and one thing you choose.",
            "Decide the best place for the recycling bin so fans use it. Put it there.",
            "Write three sentences that say where things are, with two different place words.",
            "Write one question and its answer, and one sentence that says why the bin is in that place."
          ],
          "frames": [
            "The ___ is above / behind / in front of / across from the ___.",
            "Is the ___ behind the ___? Yes, it is. / No, it isn't.",
            "I put the recycling bin ___ the ___ because ___.",
            "A clean football park helps the Earth because ___."
          ],
          "success": [
            "My map has six things and a recycling bin.",
            "Each place sentence has two things and is or are.",
            "My question starts with Is, Are or Where, and I can say why the bin is there."
          ],
          "challenge": "Write the opposite of each place sentence: if the goal is behind the bench, the bench is in front of the goal. Then explain to someone at home why we need two things for a place word."
        }
      }
    ]
  },
};
