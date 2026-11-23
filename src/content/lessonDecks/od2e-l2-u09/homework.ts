import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 9: one task per
// lesson, keyed by deck id. Each has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app,
// never written here. Children are 7-9, so a task is a drawing plus two to four short
// sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U9Creative: Record<string, Creative> = {
  "od2e-l2-u09-l1": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "take turns",
        "polite",
        "clean up",
        "litter",
        "traffic light",
        "crossing guard",
        "lifeguard"
      ],
      "grammar": [
        "We ___. / We can't ___.",
        "because for a reason"
      ]
    },
    "base": {
      "title": "A sign for a good rule",
      "task": "Make a sign for a rule at home or at school. Write the rule and say why it is a good idea.",
      "steps": [
        "Choose a rule you know, for example take turns or clean up.",
        "Draw a big sign with a picture of the rule.",
        "Write the rule under the picture: We ___. or We can't ___.",
        "Write why it is a good idea. Is there a rule you would change? Say why."
      ],
      "frames": [
        "We ___.",
        "We can't ___.",
        "This rule is good because ___.",
        "I would change the rule about ___ because ___."
      ],
      "success": [
        "My sign has a picture and a clear rule.",
        "I can use We or We can't in my rule.",
        "I can give a reason with because."
      ],
      "challenge": "Find one more person who helps keep people safe where you live. Draw them. Write three sentences: who they are, where they work and how they help."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A rule sign for the Gunners' stadium",
          "task": "Make a sign for a rule at the Emirates Stadium on match day. Write the rule and say why it is a good idea.",
          "steps": [
            "Choose a rule for fans, for example take turns at the snack shop or no litter.",
            "Draw a big sign with a picture of the rule and some red Arsenal colours.",
            "Write the rule under the picture: We ___. or We can't ___.",
            "Write why it is a good idea. Is there a match-day rule you would change? Say why."
          ],
          "frames": [
            "At the match, we ___.",
            "We can't ___ at the stadium.",
            "This rule is good because ___.",
            "I would change the rule about ___ because ___."
          ],
          "success": [
            "My sign has a picture and a clear rule.",
            "I can use We or We can't in my rule.",
            "I can give a reason with because."
          ],
          "challenge": "Find one more person who helps keep fans safe on match day. Draw them. Write three sentences: who they are, where they work and how they help."
        }
      }
    ]
  },
  "od2e-l2-u09-l2": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "polite",
        "litter",
        "take turns",
        "lifeguard",
        "crossing guard",
        "principal"
      ],
      "grammar": [
        "We ___ / We can't ___",
        "What would happen if there were no rules?"
      ]
    },
    "base": {
      "title": "A safety poster for a fun place",
      "task": "Design a safety poster for a fun place you know, such as the park, the pool or the zoo. Write two rules and why they help.",
      "steps": [
        "Choose a fun place: the park, the pool, the zoo or a playground.",
        "Draw a big poster with a picture and a title.",
        "Write two rules and one reason for each.",
        "Say what would happen if there were no rules there."
      ],
      "frames": [
        "At the ___, we ___.",
        "We can't ___ because ___.",
        "This rule helps because ___.",
        "If there were no rules, ___."
      ],
      "success": [
        "My poster has a title, a picture and two rules.",
        "Each rule has a reason with because.",
        "I can say what would happen without rules."
      ],
      "challenge": "Invent a new fun place, such as a robot park or a space pool. Write three rules for it, and say why each one is a good idea."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A match-day safety poster",
          "task": "Design a safety poster for fans at the Emirates Stadium. Write two rules and why they help.",
          "steps": [
            "Choose a part of the stadium: the gate, the stairs or the seats.",
            "Draw a big poster with a picture and a title for Arsenal fans.",
            "Write two rules and one reason for each.",
            "Say what would happen if there were no rules at a match."
          ],
          "frames": [
            "At the stadium, we ___.",
            "We can't ___ because ___.",
            "This rule helps the fans because ___.",
            "If there were no rules, ___."
          ],
          "success": [
            "My poster has a title, a picture and two rules.",
            "Each rule has a reason with because.",
            "I can say what would happen without rules."
          ],
          "challenge": "Invent a new Gunners stadium on the moon. Write three rules for it, and say why each one is a good idea."
        }
      }
    ]
  },
  "od2e-l2-u09-l3": {
    "kind": "creative",
    "thinking": "Evaluate",
    "uses": {
      "words": [
        "mine",
        "yours",
        "hers",
        "his",
        "ours",
        "theirs"
      ],
      "grammar": [
        "Whose ___ is this? It's mine / yours / hers / his / ours / theirs.",
        "This is my ___. This ___ is mine."
      ]
    },
    "base": {
      "title": "A Lost and Found poster",
      "task": "Make a Lost and Found poster for a made-up classroom. Draw four things in a box and write whose they are. Choose the most special thing.",
      "steps": [
        "Draw a big box with four things in it, for example a bag, a hat, a ball and a book.",
        "Make up an owner for each thing: me, you, her, him, us or them.",
        "Write four sentences: Whose ___ is this? It's ___.",
        "Choose the most special thing and say why."
      ],
      "frames": [
        "Whose ___ is this?",
        "It's mine. / It's hers. / It's his.",
        "The ___ is ours. The ___ is theirs.",
        "The most special thing is the ___ because ___."
      ],
      "success": [
        "I use four different owner words correctly.",
        "I can ask and answer a Whose question.",
        "I can say why one thing is special."
      ],
      "challenge": "Write a four-line chant about 'Whose is this?' with mine, yours, ours and theirs. Say it with actions to your family."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Lost and Found at the Emirates Stadium",
          "task": "Make a Lost and Found poster for the Emirates Stadium after a match. Draw four things fans left and write whose they are. Choose the most special thing.",
          "steps": [
            "Draw a big box with four things in it, for example a red scarf, a flag, a cap and a ball.",
            "Make up an owner for each thing: me, you, her, him, us or them.",
            "Write four sentences: Whose ___ is this? It's ___.",
            "Choose the most special thing and say why a Gunners fan would want it back."
          ],
          "frames": [
            "Whose ___ is this?",
            "It's mine. / It's hers. / It's his.",
            "The ___ is ours. The ___ is theirs.",
            "The most special thing is the ___ because ___."
          ],
          "success": [
            "I use four different owner words correctly.",
            "I can ask and answer a Whose question.",
            "I can say why one thing is special."
          ],
          "challenge": "Write a four-line chant about 'Whose is this?' for the fans, with mine, yours, ours and theirs. Say it with actions to your family."
        }
      }
    ]
  },
  "od2e-l2-u09-l4": {
    "kind": "creative",
    "thinking": "Compare and justify",
    "uses": {
      "words": [
        "kitchen",
        "living room",
        "cafeteria",
        "classroom",
        "swimming pool",
        "crosswalk"
      ],
      "grammar": [
        "We ___. / We can't ___.",
        "Sorry. / That's OK.",
        "because for a reason"
      ]
    },
    "base": {
      "title": "Rules for a new place",
      "task": "Invent a new place, such as a robot kitchen or a cloud school. Draw it and write three rules. Say if the rules would work in a different place.",
      "steps": [
        "Invent a new place and give it a name.",
        "Draw the place and the people in it.",
        "Write three rules with a reason for each.",
        "Choose one rule and say if it would work in another place, such as the cafeteria or the swimming pool."
      ],
      "frames": [
        "In the ___, we ___.",
        "We can't ___ because ___.",
        "This rule would work in the ___ because ___.",
        "This rule would not work in the ___ because ___."
      ],
      "success": [
        "I write three rules with reasons.",
        "I use a place word from the lesson.",
        "I say why a rule works or does not work in another place."
      ],
      "challenge": "Write a short conversation between two people in a home or school place: one says sorry, the other answers. Use two phrasal verbs, like clean up and put away. Act it out with someone at home."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Rules for a new football place",
          "task": "Invent a new place for Arsenal fans, such as a cafeteria at the Emirates Stadium or a football pool. Draw it and write three rules. Say if the rules would work in a different place.",
          "steps": [
            "Invent a new place for the Gunners' fans and give it a name.",
            "Draw the place and the fans in it.",
            "Write three rules with a reason for each.",
            "Choose one rule and say if it would work in another place, such as the classroom or the swimming pool."
          ],
          "frames": [
            "In the ___, the fans ___.",
            "We can't ___ because ___.",
            "This rule would work in the ___ because ___.",
            "This rule would not work in the ___ because ___."
          ],
          "success": [
            "I write three rules with reasons.",
            "I use a place word from the lesson.",
            "I say why a rule works or does not work in another place."
          ],
          "challenge": "Write a short conversation between two fans at the stadium: one says sorry, the other answers. Use two phrasal verbs, like clean up and put away. Act it out with someone at home."
        }
      }
    ]
  },

  // Lesson 5: Grammar Champions, my / mine and Whose
  "od2e-l2-u09-l5": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "take turns",
        "polite",
        "clean up",
        "classroom",
        "crosswalk"
      ],
      "grammar": [
        "my + thing / mine alone",
        "Whose ___ is this?"
      ]
    },
    "base": {
      "title": "Design a Sharing Corner",
      "task": "Design a Sharing Corner for your classroom. Draw four things in it. Say what belongs to everybody and what stays yours.",
      "steps": [
        "Draw your Sharing Corner and four things in it.",
        "Write one sentence for each thing: The ___ is ours.",
        "Draw one thing that stays yours only. Write: This is my ___. It's mine.",
        "Write one rule for the corner and say why it helps people get along."
      ],
      "frames": [
        "The ___ is ours.",
        "This is my ___. It's mine.",
        "Whose ___ is this?",
        "The rule is ___ because ___."
      ],
      "success": [
        "I used ours for the things we share.",
        "I used my + thing and mine alone in the right places.",
        "I gave a reason for my rule with because."
      ],
      "challenge": "Add a Whose question and answer for a thing in your corner. Say who the owner is with hers, his or theirs."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Design a team kit room",
          "task": "Design a kit room for a football team. Draw four things in it. Say what belongs to the whole team and what belongs to one player.",
          "steps": [
            "Draw the kit room and four things in it, like balls, cones and water bottles.",
            "Write one sentence for each team thing: The ___ is ours.",
            "Draw one thing that belongs to one player. Write: This is my ___. It's mine.",
            "Write one rule for the kit room and say why it helps the team get along."
          ],
          "frames": [
            "The ___ is ours.",
            "This is my ___. It's mine.",
            "Whose ___ is this?",
            "The rule is ___ because ___."
          ],
          "success": [
            "I used ours for the things the team shares.",
            "I used my + thing and mine alone in the right places.",
            "I gave a reason for my rule with because."
          ],
          "challenge": "Add a Whose question and answer for a thing in the kit room. Say who the owner is with hers, his or theirs."
        }
      }
    ]
  },
};
