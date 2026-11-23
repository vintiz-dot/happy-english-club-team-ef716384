import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 10: one task per
// lesson, keyed by deck id. Each has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app,
// never written here. Children are 7-9, so a task is a drawing plus two to four short
// sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U10Creative: Record<string, Creative> = {
  "od2e-l2-u10-l1": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "rude",
        "thoughtful",
        "grab",
        "pass",
        "share",
        "put away",
        "wash",
        "knock",
        "invite"
      ],
      "grammar": [
        "present simple actions: My monster grabs. It is rude.",
        "should for what to do instead"
      ]
    },
    "base": {
      "title": "My kind or rude monster",
      "task": "Invent a kind or a rude monster. Draw it and write two sentences. Say what the monster should do instead.",
      "steps": [
        "Invent a monster and give it a funny name.",
        "Draw your monster doing something kind or something rude.",
        "Write two sentences with the new words, for example: My monster grabs. It is rude.",
        "Write what it should do instead and why."
      ],
      "frames": [
        "My monster ___.",
        "It is ___.",
        "It should ___ instead.",
        "That is better because ___."
      ],
      "success": [
        "I use two words from the lesson.",
        "I can say if my monster is kind or rude.",
        "I can say what it should do instead."
      ],
      "challenge": "Make a 'Good manners' mind map in your notebook with six actions. Add one more rude action that is not in the book, and say what a polite person does instead."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "The kind or rude Gunners monster",
          "task": "Invent a kind or a rude monster fan at the Emirates Stadium. Draw it and write two sentences. Say what the monster should do instead.",
          "steps": [
            "Invent a monster who loves the Gunners and give it a funny name.",
            "Draw your monster at the stadium doing something kind or something rude.",
            "Write two sentences with the new words, for example: My monster grabs the scarf. It is rude.",
            "Write what it should do instead and why."
          ],
          "frames": [
            "My monster ___ at the match.",
            "It is ___.",
            "It should ___ instead.",
            "That is better because ___."
          ],
          "success": [
            "I use two words from the lesson.",
            "I can say if my monster is kind or rude.",
            "I can say what it should do instead."
          ],
          "challenge": "Make a 'Good manners at the match' mind map in your notebook with six actions. Add one more rude action that is not in the book, and say what a polite fan does instead."
        }
      }
    ]
  },
  "od2e-l2-u10-l2": {
    "kind": "creative",
    "thinking": "Evaluate",
    "uses": {
      "words": [
        "rude",
        "thoughtful",
        "share",
        "pass",
        "grab",
        "invite"
      ],
      "grammar": [
        "present simple with he / she / it: shares, grabs, passes",
        "polite or rude, with because"
      ]
    },
    "base": {
      "title": "A fifth animal for the poem book",
      "task": "Make up a fifth animal for the poem book. Draw it and write four short lines about what it does at a friend's house. Decide if it is polite or rude.",
      "steps": [
        "Choose a new animal.",
        "Draw it at a friend's house.",
        "Write four short lines about what it does.",
        "Decide: is it polite or rude? Write what the theme of your poem is."
      ],
      "frames": [
        "The ___ ___ at my house.",
        "It ___ the ___.",
        "It is ___ because ___.",
        "The theme of my poem is ___."
      ],
      "success": [
        "My poem has four short lines about one animal.",
        "I use he / she / it verbs correctly, for example shares or grabs.",
        "I can say if the animal is polite or rude and why."
      ],
      "challenge": "Choose one rude animal behaviour and write what the animal should say or do instead. Act it out at home with a family member and tell us what they thought."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A fifth animal at the football match",
          "task": "Make up a fifth animal who goes to a football match with a friend. Draw it and write four short lines about what it does. Decide if it is polite or rude.",
          "steps": [
            "Choose a new animal who is a Gunners fan.",
            "Draw it at the Emirates Stadium with a friend.",
            "Write four short lines about what it does.",
            "Decide: is it polite or rude? Write what the theme of your poem is."
          ],
          "frames": [
            "The ___ ___ at the match.",
            "It ___ the ___.",
            "It is ___ because ___.",
            "The theme of my poem is ___."
          ],
          "success": [
            "My poem has four short lines about one animal.",
            "I use he / she / it verbs correctly, for example shares or grabs.",
            "I can say if the animal is polite or rude and why."
          ],
          "challenge": "Choose one rude fan behaviour and write what the animal should say or do instead. Act it out at home with a family member and tell us what they thought."
        }
      }
    ]
  },
  "od2e-l2-u10-l3": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "please",
        "thoughtful",
        "share",
        "pass",
        "invite",
        "put away"
      ],
      "grammar": [
        "Can I + action? Yes, you can. / No, you can't.",
        "May I + action? Yes, you may."
      ]
    },
    "base": {
      "title": "The polite robot",
      "task": "Design a polite robot that always asks first. Draw it and write two things it asks with Can I or May I.",
      "steps": [
        "Draw your robot and give it a name.",
        "Write two things it asks, one with Can I and one with May I.",
        "Write who the robot asks.",
        "Write why the robot always asks first."
      ],
      "frames": [
        "My robot is called ___.",
        "Can I ___, please?",
        "May I ___, please?",
        "The robot asks first because ___."
      ],
      "success": [
        "I use Can I and May I correctly.",
        "I say please.",
        "I can say who the robot asks and why."
      ],
      "challenge": "Write a short dialogue between a child and a grown-up with three questions using Can I and May I, with different answers (yes, no, and a reason). Act it out at home."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "The polite match-day robot",
          "task": "Design a polite robot fan that always asks first at the Emirates Stadium. Draw it and write two things it asks with Can I or May I.",
          "steps": [
            "Draw your robot in an Arsenal shirt and give it a name.",
            "Write two things it asks, one with Can I and one with May I.",
            "Write who the robot asks, for example another fan or a steward.",
            "Write why the robot always asks first."
          ],
          "frames": [
            "My robot is called ___.",
            "Can I ___, please?",
            "May I ___, please?",
            "The robot asks first because ___."
          ],
          "success": [
            "I use Can I and May I correctly.",
            "I say please.",
            "I can say who the robot asks and why."
          ],
          "challenge": "Write a short dialogue between a fan and a steward at the stadium with three questions using Can I and May I, with different answers (yes, no, and a reason). Act it out at home."
        }
      }
    ]
  },
  "od2e-l2-u10-l4": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "computer",
        "laptop",
        "camera",
        "headphones",
        "tablet",
        "cell phone"
      ],
      "grammar": [
        "subject-verb agreement: I am / he is / they are",
        "was / were for before"
      ]
    },
    "base": {
      "title": "My thoughtful gadget",
      "task": "Create a thoughtful gadget that helps people get along. Draw it and write three sentences about it.",
      "steps": [
        "Choose a gadget idea: a robot, a phone or a backpack.",
        "Draw it and label two parts.",
        "Write three sentences: what it is, what it does and why people like it.",
        "Check your is and are."
      ],
      "frames": [
        "My gadget is a ___.",
        "It ___ for people.",
        "People like it because ___.",
        "The ___ and the ___ are ___."
      ],
      "success": [
        "I write three sentences about my gadget.",
        "I use is and are correctly.",
        "I can say why people like it."
      ],
      "challenge": "Make a little book with four 'Please and Thank You' tips for using other people's things. Use may and can, and check your verbs."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A gadget for Gunners fans",
          "task": "Create a thoughtful gadget that helps Arsenal fans get along at the Emirates Stadium. Draw it and write three sentences about it.",
          "steps": [
            "Choose a gadget idea for match day: a talking scarf, a phone app or a backpack.",
            "Draw it and label two parts.",
            "Write three sentences: what it is, what it does and why fans like it.",
            "Check your is and are."
          ],
          "frames": [
            "My gadget is a ___.",
            "It ___ for the fans.",
            "Fans like it because ___.",
            "The ___ and the ___ are ___."
          ],
          "success": [
            "I write three sentences about my gadget.",
            "I use is and are correctly.",
            "I can say why people like it."
          ],
          "challenge": "Make a little book with four 'Please and Thank You' tips for fans using other people's things at the stadium. Use may and can, and check your verbs."
        }
      }
    ]
  },
  "od2e-l2-u10-l5": {
    "kind": "creative",
    "thinking": "Argue",
    "uses": {
      "words": [
        "share",
        "pass",
        "thoughtful",
        "rude",
        "invite",
        "put away",
        "knock"
      ],
      "grammar": [
        "We ___. / We can't ___.",
        "because for a reason",
        "Can I / May I"
      ]
    },
    "base": {
      "title": "A new rule to help people get along",
      "task": "Invent a new rule for a place you love, such as the park, the zoo or the pool. Draw it and argue why the rule helps people get along.",
      "steps": [
        "Choose a place you love.",
        "Make up a new rule and draw a sign for it.",
        "Write two reasons why the rule helps people get along.",
        "Tell a family member and ask: do you agree?"
      ],
      "frames": [
        "At the ___, we ___.",
        "This rule helps because ___.",
        "It is also good because ___.",
        "I think everyone should follow it because ___."
      ],
      "success": [
        "My rule is clear and has a sign.",
        "I give two reasons.",
        "I use polite words, for example please or may."
      ],
      "challenge": "Write a short play with two characters, one rude and one thoughtful, in a place of your choice. Include at least three polite words and how the rude one changes."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A new rule for match day",
          "task": "Invent a new rule for Arsenal fans at the Emirates Stadium. Draw it and argue why the rule helps fans get along.",
          "steps": [
            "Choose a place in the stadium, for example the gate or the snack shop.",
            "Make up a new rule and draw a sign for it.",
            "Write two reasons why the rule helps fans get along.",
            "Tell a family member and ask: do you agree?"
          ],
          "frames": [
            "At the stadium, we ___.",
            "This rule helps the fans because ___.",
            "It is also good because ___.",
            "I think every Gunners fan should follow it because ___."
          ],
          "success": [
            "My rule is clear and has a sign.",
            "I give two reasons.",
            "I use polite words, for example please or may."
          ],
          "challenge": "Write a short play with two fans, one rude and one thoughtful, at the stadium. Include at least three polite words and how the rude one changes."
        }
      }
    ]
  },
  "od2e-l2-u10-l6": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["knock", "invite", "share", "pass", "thoughtful", "rude"],
      grammar: ["Can I + action word? / May I + action word?", "Yes, you can / may. No, you can't / may not.", "because for a reason"],
    },
    base: {
      title: "The magic door with a rule sign",
      task: "Invent a magic door. Draw it with a sign. Write the questions people ask to come through and the answers they get. Then choose which door you would like to open, and say why.",
      steps: [
        "Invent a magic door and give it a funny name.",
        "Draw the door and a sign that says who may come in.",
        "Write four questions with Can I or May I, and an answer for each one with you.",
        "Make one answer a no, and give a reason with because.",
        "Say which door you would like to open and why.",
      ],
      frames: ["May I come in, please?", "Yes, you ___. / No, you ___ not.", "No, you may not because ___.", "I would like to open the ___ door because ___."],
      success: [
        "I wrote four questions that start with Can I or May I.",
        "Every answer says you.",
        "I gave a reason for one no.",
      ],
      challenge: "Add a sign that is kind but firm, and say how a thoughtful person knocks and asks before the door opens.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The magic door to the dressing room",
          task: "Invent a magic door to a football team's dressing room. Draw it with a sign. Write the questions a young fan asks to come in and the answers. Then say which team room you would like to visit, and why.",
          steps: [
            "Invent a magic door to a dressing room and give it a team name.",
            "Draw the door and a sign that says who may come in.",
            "Write four questions with Can I or May I (for a photo, a ball, a visit), and an answer for each one with you.",
            "Make one answer a no, and give a reason with because.",
            "Say which dressing room you would like to visit and why.",
          ],
          frames: ["May I have a photo, please?", "Yes, you ___. / No, you ___ not.", "No, you may not because ___.", "I would like to visit the ___ room because ___."],
          success: [
            "I wrote four questions that start with Can I or May I.",
            "Every answer says you.",
            "I gave a reason for one no.",
          ],
          challenge: "Add a sign that is kind but firm, and say how a thoughtful fan asks and waits.",
        },
      },
    ],
  },
};
