import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 8: one task per
// lesson, keyed by deck id. Each has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app,
// never written here. Children are 7-9, so a task is a drawing plus two to four short
// sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U8Creative: Record<string, Creative> = {
  "od2e-l2-u08-l1": {
    "kind": "creative",
    "thinking": "Create",
    "uses": {
      "words": [
        "baker",
        "cook",
        "hide",
        "jar",
        "greedy",
        "steal",
        "dig up",
        "bored",
        "let go"
      ],
      "grammar": [
        "story parts: At the beginning, in the middle, at the end",
        "simple sentences about what a character did"
      ]
    },
    "base": {
      "title": "My three-part town story",
      "task": "Make up a short story about an animal in a town. Draw three pictures: the beginning, the middle and the end.",
      "steps": [
        "Choose an animal and a place in a town, for example a bakery or a kitchen.",
        "Draw three pictures in a row: the beginning, the middle and the end.",
        "Write one short sentence under each picture.",
        "Say which part you like best and why."
      ],
      "frames": [
        "At the beginning, the ___ was ___.",
        "In the middle, it ___ the ___.",
        "At the end, it ___.",
        "I like the ___ part best because ___."
      ],
      "success": [
        "I can draw and write a beginning, a middle and an end.",
        "I can use two new words from the lesson.",
        "I can say why I like one part best."
      ],
      "challenge": "Write a story with exactly six sentences about a baker or a cook. Cut the sentences up and ask someone at home to put them in order. Does the end happen because of the middle?"
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A three-part match-day story",
          "task": "Make up a short story about an animal at the Emirates Stadium on match day. Draw three pictures: the beginning, the middle and the end.",
          "steps": [
            "Choose an animal that visits the Gunners' stadium and a place in it, for example the snack shop.",
            "Draw three pictures in a row: the beginning, the middle and the end.",
            "Write one short sentence under each picture.",
            "Say which part you like best and why."
          ],
          "frames": [
            "At the beginning, the ___ was at the Emirates Stadium.",
            "In the middle, it ___ the ___.",
            "At the end, it ___.",
            "I like the ___ part best because ___."
          ],
          "success": [
            "I can draw and write a beginning, a middle and an end.",
            "I can use two new words from the lesson.",
            "I can say why I like one part best."
          ],
          "challenge": "Write a story with exactly six sentences about a baker or a cook who makes food for the Arsenal fans. Cut the sentences up and ask someone at home to put them in order. Does the end happen because of the middle?"
        }
      }
    ]
  },
  "od2e-l2-u08-l2": {
    "kind": "creative",
    "thinking": "Evaluate",
    "uses": {
      "words": [
        "greedy",
        "let go",
        "steal",
        "hide",
        "jar",
        "baker",
        "cook"
      ],
      "grammar": [
        "story parts: beginning, middle, end",
        "should + let go, with a reason using because"
      ]
    },
    "base": {
      "title": "Bandar goes to a new shop",
      "task": "Imagine Bandar the monkey goes to a different shop. Draw the shop and what he sees. Decide: should he let go? Say why.",
      "steps": [
        "Choose a shop for Bandar, for example a toy shop or a fruit shop.",
        "Draw the shop and the thing Bandar wants.",
        "Write three sentences: where he goes, what he wants and what he does at the end.",
        "Choose: should Bandar let go? Write your reason."
      ],
      "frames": [
        "Bandar goes to the ___.",
        "He wants the ___ because ___.",
        "At the end, he ___.",
        "I think Bandar should ___ because ___."
      ],
      "success": [
        "I can write where Bandar goes, what he wants and what he does.",
        "I can use the word greedy or let go.",
        "I can give a reason with because."
      ],
      "challenge": "Write a different ending for the story. What does Bandar do? What does the candy maker say? Read your ending to someone at home and ask: 'Do you like my ending?'"
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Bandar at the stadium shop",
          "task": "Imagine Bandar the monkey goes to the Arsenal shop at the Emirates Stadium on match day. Draw the shop and what he sees. Decide: should he let go? Say why.",
          "steps": [
            "Draw the club shop at the Gunners' stadium and the thing Bandar wants, for example a red scarf.",
            "Write three sentences: where he goes, what he wants and what he does at the end.",
            "Choose: should Bandar let go? Write your reason.",
            "Read your story aloud to someone at home."
          ],
          "frames": [
            "Bandar goes to the ___.",
            "He wants the ___ because ___.",
            "At the end, he ___.",
            "I think Bandar should ___ because ___."
          ],
          "success": [
            "I can write where Bandar goes, what he wants and what he does.",
            "I can use the word greedy or let go.",
            "I can give a reason with because."
          ],
          "challenge": "Write a different ending for the story. What does Bandar do? What does the shop worker say? Read your ending to someone at home and ask: 'Do you like my ending?'"
        }
      }
    ]
  },
  "od2e-l2-u08-l3": {
    "kind": "creative",
    "thinking": "Compare and justify",
    "uses": {
      "words": [
        "went",
        "ate",
        "took",
        "made",
        "bought",
        "sold",
        "hid",
        "stole"
      ],
      "grammar": [
        "Did + person + plain verb ...?",
        "yesterday words: went, ate, took, made, bought"
      ]
    },
    "base": {
      "title": "Three things at the weekend",
      "task": "Draw three things you did at the weekend. Write what you did with yesterday words. Say which one was your best part.",
      "steps": [
        "Draw three things you did at the weekend.",
        "Under each picture write: I ___ (went, ate, took, made or bought) ...",
        "Write one question about a friend's weekend with Did.",
        "Choose your best part and say why it was better than the other two."
      ],
      "frames": [
        "At the weekend I went to ___.",
        "I ate ___ and I made ___.",
        "Did you ___ at the weekend?",
        "My best part was ___ because ___."
      ],
      "success": [
        "I can use three yesterday words correctly.",
        "I can write a question with Did and a plain verb.",
        "I can say why one part was my best."
      ],
      "challenge": "Make a take-away story about a market or a shop with two numbers. Write the problem in words and in numbers, then give it to someone at home to solve."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "Three things on a football weekend",
          "task": "Draw three things you did on a football weekend with the Gunners, real or imagined. Write what you did with yesterday words. Say which one was your best part.",
          "steps": [
            "Draw three things you did, for example went to the Emirates Stadium, ate a snack, made a banner.",
            "Under each picture write: I ___ (went, ate, took, made or bought) ...",
            "Write one question about a friend's football weekend with Did.",
            "Choose your best part and say why it was better than the other two."
          ],
          "frames": [
            "On match day I went to ___.",
            "I ate ___ and I made ___.",
            "Did you ___ on match day?",
            "My best part was ___ because ___."
          ],
          "success": [
            "I can use three yesterday words correctly.",
            "I can write a question with Did and a plain verb.",
            "I can say why one part was my best."
          ],
          "challenge": "Make a take-away story about a match-day shop with two numbers. Write the problem in words and in numbers, then give it to someone at home to solve."
        }
      }
    ]
  },
  "od2e-l2-u08-l4": {
    "kind": "creative",
    "thinking": "Design",
    "uses": {
      "words": [
        "face",
        "nose",
        "arm",
        "hand",
        "foot",
        "knee"
      ],
      "grammar": [
        "contractions: didn't, doesn't, don't, can't",
        "number problems in words and numbers"
      ]
    },
    "base": {
      "title": "My funny subtraction poem",
      "task": "Design a funny subtraction poem with animals, numbers and a place. Draw the animals and write the poem and the answer.",
      "steps": [
        "Choose two animals and a place, for example a farm or a beach.",
        "Draw the animals. Count their noses, hands or feet.",
        "Write a short poem of two to four lines with a take-away problem in it.",
        "Write the answer and say which line is the funniest."
      ],
      "frames": [
        "Ten ___ in the ___.",
        "Some ___ went away.",
        "The ___ didn't ___. / It can't ___.",
        "There are ___ left!"
      ],
      "success": [
        "My poem has a number problem and the right answer.",
        "I use a body word, for example nose, foot or knee.",
        "I use one contraction, for example didn't or can't."
      ],
      "challenge": "Write six sentences with a contraction in each: didn't, doesn't, don't, can't, shouldn't. Underline the contractions and say what two words each one is."
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "A funny Gunners poem",
          "task": "Design a funny subtraction poem about the Arsenal fans at the Emirates Stadium. Draw the fans and write the poem and the answer.",
          "steps": [
            "Choose a group of fans or mascots and say where they are, for example in the stadium.",
            "Draw them. Count their noses, hands or feet.",
            "Write a short poem of two to four lines with a take-away problem in it.",
            "Write the answer and say which line is the funniest."
          ],
          "frames": [
            "Ten fans at the ___.",
            "Some ___ went away.",
            "The fans didn't ___. / They can't ___.",
            "There are ___ left!"
          ],
          "success": [
            "My poem has a number problem and the right answer.",
            "I use a body word, for example nose, foot or knee.",
            "I use one contraction, for example didn't or can't."
          ],
          "challenge": "Write six sentences about match day with a contraction in each: didn't, doesn't, don't, can't, shouldn't. Underline the contractions and say what two words each one is."
        }
      }
    ]
  },
  "od2e-l2-u08-l5": {
    "kind": "creative",
    "thinking": "Argue",
    "uses": {
      "words": [
        "take away",
        "left",
        "subtraction",
        "minus sign",
        "column",
        "row",
        "baker"
      ],
      "grammar": [
        "take-away problems in words and in numbers",
        "because for a reason"
      ]
    },
    "base": {
      "title": "The best game square",
      "task": "Draw your favourite square from the board game. Write the take-away problem in words and in numbers. Say why it is the best square.",
      "steps": [
        "Draw your favourite square from the board game, or a new one.",
        "Write the problem in words, for example: There were 9. I took away 4.",
        "Write the problem in numbers and the answer.",
        "Write why your square is the best one and who would be happy to solve it."
      ],
      "frames": [
        "There were ___ ___.",
        "I took away ___. There are ___ left.",
        "___ - ___ = ___.",
        "This is the best square because ___."
      ],
      "success": [
        "My problem is right in words and in numbers.",
        "I use take away and left.",
        "I give a reason with because."
      ],
      "challenge": "Make a new game square for a class picnic or a market. Write three take-away problems with different numbers and ask someone at home to solve them. Which problem was the hardest? Why?"
    },
    "variants": [
      {
        "interest": "football",
        "label": "Football edition",
        "task": {
          "title": "The best Gunners game square",
          "task": "Draw a board-game square about match day at the Emirates Stadium. Write the take-away problem in words and in numbers. Say why it is the best square.",
          "steps": [
            "Draw a square about the Gunners, for example footballs or red scarves.",
            "Write the problem in words, for example: There were 9. The fans took away 4.",
            "Write the problem in numbers and the answer.",
            "Write why your square is the best one and who would be happy to solve it."
          ],
          "frames": [
            "There were ___ ___ at the match.",
            "The fans took away ___. There are ___ left.",
            "___ - ___ = ___.",
            "This is the best square because ___."
          ],
          "success": [
            "My problem is right in words and in numbers.",
            "I use take away and left.",
            "I give a reason with because."
          ],
          "challenge": "Make a new match-day game square. Write three take-away problems with different numbers and ask someone at home to solve them. Which problem was the hardest? Why?"
        }
      }
    ]
  }
};
