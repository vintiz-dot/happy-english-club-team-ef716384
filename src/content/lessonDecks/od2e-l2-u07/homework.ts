import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 7 "Subtraction":
// one task per lesson, keyed by deck id. Each has the class version (`base`) and one
// football edition; which children get the football edition is chosen per class in
// the app, never written here. Children are 7-9, so a task is a drawing plus two to
// four short sentences. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U7Creative: Record<string, Creative> = {
  // Lesson 1: take away, left, row and column
  "od2e-l2-u07-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["take away", "subtraction", "left", "row", "column", "minus sign"],
      grammar: ["There were ___. I took away ___. There are ___ left."],
    },
    base: {
      title: "My take-away plate",
      task: "Draw a plate with up to ten things you like. Cross some out. Write a short subtraction story about it.",
      steps: [
        "Draw a plate with some things you like, in a row or in a column.",
        "Cross out some of them. Those are the ones you take away.",
        "Write the subtraction with a minus sign, for example 9 - 4 = 5.",
        "Write your story under the picture and read it aloud to someone at home.",
      ],
      frames: [
        "There were ___ ___ on my plate.",
        "I took away ___.",
        "There are ___ left.",
        "I like ___ because ___.",
      ],
      success: [
        "I can draw the things in a row or a column.",
        "I can write a subtraction with a minus sign.",
        "I can say how many are left.",
      ],
      challenge: "Make a second plate with a double-digit number, for example 12 or 15, and write a new story. Is it harder or easier? Say why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Scarves at the Emirates Stadium",
          task: "Draw a row of red scarves for Arsenal fans on match day. Take some away and write a subtraction story about the Gunners.",
          steps: [
            "Draw up to ten red scarves for the fans, in a row or in a column.",
            "Cross out some. Those are the ones you take away.",
            "Write the subtraction with a minus sign, for example 10 - 3 = 7.",
            "Write your story under the picture and read it aloud to someone at home.",
          ],
          frames: [
            "There were ___ scarves in a row.",
            "I took away ___.",
            "There are ___ left for the fans.",
            "I like the Gunners because ___.",
          ],
          success: [
            "I can draw the scarves in a row or a column.",
            "I can write a subtraction with a minus sign.",
            "I can say how many are left.",
          ],
          challenge: "Make a second picture with a double-digit number, for example 12 or 15 scarves, and write a new story. Is it harder or easier? Say why.",
        },
      },
    ],
  },

  // Lesson 2: invent a word problem
  "od2e-l2-u07-l2": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["subtraction", "take away", "left", "row", "single-digit number", "double-digit number"],
      grammar: ["There were ___. I took away ___. There are ___ left.", "How many are left?"],
    },
    base: {
      title: "A word problem for a friend",
      task: "Design your own subtraction word problem about something you would share with a friend. Draw it and give the answer.",
      steps: [
        "Choose something to share: fruit, toys or stickers.",
        "Pick two numbers. Choose small ones for an easy problem or bigger ones for a hard problem.",
        "Draw the things and cross some out.",
        "Write the problem as two or three sentences, then write the answer.",
      ],
      frames: [
        "There were ___ ___.",
        "I gave ___ to my friend.",
        "How many are left?",
        "There are ___ left. ___ - ___ = ___.",
      ],
      success: [
        "My problem has a question that ends with a question mark.",
        "My answer is right.",
        "I can say why I chose my numbers.",
      ],
      challenge: "Write your problem again as a plus problem: the answer plus the number you took away. What do you notice? Write one sentence.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match-day problem for a friend",
          task: "Design a subtraction word problem about match day at the Emirates Stadium. Draw it and give the answer.",
          steps: [
            "Choose what the Gunners have: footballs, flags or tickets.",
            "Pick two numbers. Choose small ones for an easy problem or bigger ones for a hard problem.",
            "Draw them in a row and cross some out.",
            "Write the problem as two or three sentences, then write the answer.",
          ],
          frames: [
            "There were ___ ___ at the match.",
            "The fans took away ___.",
            "How many are left?",
            "There are ___ left. ___ - ___ = ___.",
          ],
          success: [
            "My problem has a question that ends with a question mark.",
            "My answer is right.",
            "I can say why I chose my numbers.",
          ],
          challenge: "Write your problem again as a plus problem: the answer plus the number taken away. What do you notice? Write one sentence.",
        },
      },
    ],
  },

  // Lesson 3: yesterday words (ate, saw, bought, gave, didn't)
  "od2e-l2-u07-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["ate", "saw", "bought", "gave", "didn't", "took"],
      grammar: ["yesterday words: ate, saw, bought, gave", "didn't + plain verb"],
    },
    base: {
      title: "A real yesterday and a magic yesterday",
      task: "Draw three things you did yesterday. Then draw one magic thing you did not do, and say which day you like better.",
      steps: [
        "Draw three things you really did yesterday.",
        "Under each picture write a sentence with ate, saw, bought or gave.",
        "Draw one magic thing you did NOT do and write a sentence with didn't.",
        "Choose: which yesterday do you like better, the real one or the magic one? Say why.",
      ],
      frames: [
        "Yesterday I ate ___.",
        "I saw ___.",
        "I didn't ___ ___.",
        "I like the ___ yesterday better because ___.",
      ],
      success: [
        "I can use ate, saw, bought or gave correctly.",
        "I can write one sentence with didn't and a plain verb.",
        "I can give a reason with because.",
      ],
      challenge: "Write three more sentences with went, had or took. Use didn't in one of them. Ask someone at home to listen and tell you if it is right.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A real match day and a magic match day",
          task: "Draw three things you did on a football day, real or imagined. Then draw one magic thing you did not do at the Emirates Stadium, and say which day you like better.",
          steps: [
            "Draw three things you did on a football day, for example watching or playing.",
            "Under each picture write a sentence with ate, saw, bought or gave.",
            "Draw one magic thing you did NOT do and write a sentence with didn't.",
            "Choose: which day do you like better, the real one or the magic one? Say why.",
          ],
          frames: [
            "On match day I ate ___.",
            "I saw ___ at the Emirates Stadium.",
            "I didn't ___ ___.",
            "I like the ___ day better because ___.",
          ],
          success: [
            "I can use ate, saw, bought or gave correctly.",
            "I can write one sentence with didn't and a plain verb.",
            "I can give a reason with because.",
          ],
          challenge: "Write three more sentences with went, had or took about the Gunners' match day. Use didn't in one of them. Ask someone at home to listen and tell you if it is right.",
        },
      },
    ],
  },

  // Lesson 4: feeling words
  "od2e-l2-u07-l4": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["hungry", "tired", "full", "thirsty", "dirty", "clean"],
      grammar: ["take away and left", "yesterday words: ate", "I'm + feeling word"],
    },
    base: {
      title: "The hungry dragon",
      task: "Imagine a hungry dragon ate some treasure. Draw the treasure and write the story. Choose how the dragon felt at the end.",
      steps: [
        "Draw the dragon and a pile of treasure.",
        "Cross out the treasure the dragon ate.",
        "Write how many there were, how many it ate and how many are left.",
        "Choose a feeling word for the dragon at the end and say why.",
      ],
      frames: [
        "There were ___ pieces of treasure.",
        "The dragon ate ___.",
        "There are ___ left.",
        "The dragon felt ___ because ___.",
      ],
      success: [
        "My three numbers fit the subtraction.",
        "I can use a feeling word correctly.",
        "I can say why the dragon felt that way.",
      ],
      challenge: "Record the vlog at home. Tell one subtraction story from your day, with one yesterday word and one feeling word. Count the syllables in your favourite word and clap them.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The hungry Gunners fan",
          task: "Imagine an Arsenal fan who is very hungry on match day and eats some snacks. Draw the snacks and write the story. Choose how the fan felt at the end.",
          steps: [
            "Draw a fan in a red shirt and a pile of snacks at the Emirates Stadium.",
            "Cross out the snacks the fan ate.",
            "Write how many there were, how many the fan ate and how many are left.",
            "Choose a feeling word for the fan at the end and say why.",
          ],
          frames: [
            "There were ___ snacks.",
            "The fan ate ___.",
            "There are ___ left.",
            "The fan felt ___ because ___.",
          ],
          success: [
            "My three numbers fit the subtraction.",
            "I can use a feeling word correctly.",
            "I can say why the fan felt that way.",
          ],
          challenge: "Record the vlog at home. Tell one subtraction story about a match day, with one yesterday word and one feeling word. Count the syllables in your favourite word and clap them.",
        },
      },
    ],
  },

  // Lesson 5: Grammar Champions, yesterday words and didn't
  "od2e-l2-u07-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["take away", "left", "subtraction", "row", "column", "hungry"],
      grammar: ["ate / gave / bought", "didn't + plain verb", "___ take away ___ is ___"],
    },
    base: {
      title: "The plate I would share",
      task: "Draw a plate with twelve treats. Choose how many to give away and how many to keep, then write what you gave, what you didn't give, and why you chose that.",
      steps: [
        "Draw a plate with twelve treats and give each treat a name.",
        "Cross out the treats you gave away. Write the subtraction.",
        "Write one sentence with gave and one sentence with didn't.",
        "Write why you chose to give those ones away and keep the others.",
      ],
      frames: [
        "There were twelve ___ on my plate.",
        "I gave ___ to a friend.",
        "I didn't give ___.",
        "Twelve take away ___ is ___.",
        "I chose that because ___.",
      ],
      success: [
        "My subtraction is right and I can read it aloud.",
        "I used gave and didn't + the plain verb correctly.",
        "I gave a reason with because.",
      ],
      challenge: "Tell a family member the rule for yes and no about yesterday. Then say what a champion would fix in this sentence: \"Yesterday I didn't ate my soup.\"",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The half-time snack box",
          task: "Imagine a football team has twelve oranges at half time. Draw the box, choose how many the team eats and how many it saves for the fans, then write what happened and why you chose that.",
          steps: [
            "Draw a snack box with twelve oranges and a football pitch behind it.",
            "Cross out the oranges the team ate. Write the subtraction.",
            "Write one sentence with ate and one sentence with didn't.",
            "Write why you chose to share them this way.",
          ],
          frames: [
            "There were twelve oranges in the box.",
            "The team ate ___ and gave ___ to the fans.",
            "The team didn't eat ___.",
            "Twelve take away ___ is ___.",
            "I chose that because ___.",
          ],
          success: [
            "My subtraction is right and I can read it aloud.",
            "I used ate, gave and didn't + the plain verb correctly.",
            "I gave a reason with because.",
          ],
          challenge: "Tell a family member the rule for yes and no about yesterday. Then say what a champion would fix in this sentence: \"Yesterday the team didn't ate the oranges.\"",
        },
      },
    ],
  },
};
