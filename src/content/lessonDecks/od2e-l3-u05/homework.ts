import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 5
// "Poems and Insects": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U5Creative: Record<string, Creative> = {
  // Lesson 1: create a short poem about a favorite thing
  "od2e-l3-u05-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["ladybug", "cricket", "grasshopper", "beetle", "butterfly", "bee", "thicket"],
      grammar: ["theme", "describing words", "I think ... because ..."],
    },
    base: {
      title: "A poem about something I love",
      task: "Write a short poem of four lines about something you love, such as a toy, a place, an animal or an insect. Then write one sentence that says the theme of your poem.",
      steps: [
        "Choose one thing you love. Write three describing words for it and one word that rhymes with it.",
        "Write four short lines. Try to make the end of two lines rhyme.",
        "Draw a small picture next to your poem.",
        "Write one sentence at the bottom: what do you want your reader to understand?",
      ],
      frames: [
        "I love my ___ because it is ___ and ___.",
        "It is a ___ ___ thing.",
        "When I see it, I feel ___.",
        "The theme of my poem is that ___.",
        "I want you to understand that ___.",
      ],
      success: [
        "My poem has four short lines and at least one pair of rhyming words.",
        "My poem uses at least two describing words that paint a picture.",
        "My last sentence says the theme in my own words.",
      ],
      challenge:
        "Write a second verse that shows a different feeling about the same thing (for example: surprise or worry). Then explain in two sentences why you chose that feeling and how the theme changed.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poem about match day",
          task: "Write a short poem of four lines about match day at the Emirates Stadium: the fans, the noise, the pitch or the Gunners. Then write one sentence that says the theme of your poem.",
          steps: [
            "Choose one thing about match day. Write three describing words for it and one word that rhymes with it.",
            "Write four short lines. Try to make the end of two lines rhyme.",
            "Draw a small picture next to your poem.",
            "Write one sentence at the bottom: what do you want your reader to understand?",
          ],
          frames: [
            "I love match day because it is ___ and ___.",
            "The stadium is a ___ ___ place.",
            "When the Gunners score, I feel ___.",
            "The theme of my poem is that ___.",
            "I want you to understand that ___.",
          ],
          success: [
            "My poem has four short lines and at least one pair of rhyming words.",
            "My poem uses at least two describing words that paint a picture.",
            "My last sentence says the theme in my own words.",
          ],
          challenge:
            "Write a second verse that shows a different feeling on match day (for example: worry before the game). Then explain in two sentences why you chose that feeling and how the theme changed.",
        },
      },
    ],
  },

  // Lesson 2: evaluate which poem to share
  "od2e-l3-u05-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["poem", "poet", "rhyme", "rhythm", "verse", "line"],
      grammar: ["topic and theme", "because", "I would choose ... because ..."],
    },
    base: {
      title: "The best poem to learn by heart",
      task: "Imagine your class can learn only one of the four poems from SB 50-51 for the school show. Judge two of the poems and decide which one is better to learn by heart. Defend your decision with evidence.",
      steps: [
        "Choose two poems. For each one, write the topic and the theme.",
        "Think about this: which poem is easier to remember? Which one makes the audience feel something? Which has a better rhyme or rhythm?",
        "Decide which poem is better for the show and write why, with two reasons. Use a line or an idea from the poem as evidence.",
        "Think of one thing the other poem does better and write it. A fair judge is honest.",
      ],
      frames: [
        "The topic of this poem is ___ and the theme is that ___.",
        "This poem is easy to remember because ___ and ___.",
        "I would choose ___ because ___.",
        "The other poem is good, too, but ___.",
        "The audience would feel ___ when they hear it.",
      ],
      success: [
        "My writing names two poems and says the topic and theme of each.",
        "My writing gives at least two reasons for my decision, joined with because or so.",
        "My writing uses evidence from the poem and is fair to the other poem.",
      ],
      challenge:
        "Make a top-four list of the poems and give each one a score out of 10 for the show. Explain the score of the poem you put last, and say who might disagree with you and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best poem for the stadium",
          task: "Imagine Arsenal fans want to read one of the four poems from SB 50-51 aloud before a match at the Emirates Stadium. Judge two of the poems and decide which one is better for the fans. Defend your decision with evidence.",
          steps: [
            "Choose two poems. For each one, write the topic and the theme.",
            "Think about this: which poem is easier for a crowd to say together? Which one makes fans feel something? Which has a better rhyme or rhythm?",
            "Decide which poem is better for match day and write why, with two reasons. Use a line or an idea from the poem as evidence.",
            "Think of one thing the other poem does better and write it. A fair judge is honest.",
          ],
          frames: [
            "The topic of this poem is ___ and the theme is that ___.",
            "This poem is easy for a crowd to say because ___ and ___.",
            "I would choose ___ for the stadium because ___.",
            "The other poem is good, too, but ___.",
            "The fans would feel ___ when they hear it.",
          ],
          success: [
            "My writing names two poems and says the topic and theme of each.",
            "My writing gives at least two reasons for my decision, joined with because or so.",
            "My writing uses evidence from the poem and is fair to the other poem.",
          ],
          challenge:
            "Make a top-four list of the poems and give each one a score out of 10 for match day. Explain the score of the poem you put last, and say which fan might disagree with you and why.",
        },
      },
    ],
  },

  // Lesson 3: argue with the past continuous
  "od2e-l3-u05-l3": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["ladybug", "grasshopper", "cricket", "bee", "thicket", "raisin"],
      grammar: ["past continuous (was / were + -ing)", "wasn't / weren't", "because"],
    },
    base: {
      title: "The alibi in the garden",
      task: "Someone knocked over the jar of raisins in the garden at four o'clock. The suspect is an insect. Write a short court scene: the insect says what it was doing, a witness disagrees and the judge decides.",
      steps: [
        "Choose an insect for the suspect and a different insect or animal for the witness.",
        "Write what the suspect says it was doing at four o'clock and give a reason.",
        "Write what the witness says it saw, with was or were + -ing. The two stories must be a little different.",
        "Write the judge's decision and give a reason. Use the past continuous at least five times.",
      ],
      frames: [
        "At four o'clock I was ___ing in the ___.",
        "I wasn't ___ing near the jar. I was ___ing.",
        "I saw the ___. It was ___ing under the ___.",
        "The ___ and the ___ were ___ing together.",
        "I think the ___ is telling the truth because ___.",
      ],
      success: [
        "My writing has a suspect, a witness and a judge, and each one speaks.",
        "My writing uses was or were + -ing at least five times, and the helper matches the person.",
        "My writing gives a reason for the judge's decision with because.",
      ],
      challenge:
        "Add a second witness who tells a different story. Write what each witness says and explain which one the judge believes and why. Use one question in the past continuous and one negative sentence.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The mystery of the missing ball",
          task: "Someone took the match ball from the training ground at four o'clock. The suspect is an invented mascot. Write a short court scene: the mascot says what it was doing, a witness disagrees and the referee decides.",
          steps: [
            "Choose a mascot for the suspect and a different character, such as a fan or a player, for the witness.",
            "Write what the suspect says it was doing at four o'clock and give a reason.",
            "Write what the witness says it saw, with was or were + -ing. The two stories must be a little different.",
            "Write the referee's decision and give a reason. Use the past continuous at least five times.",
          ],
          frames: [
            "At four o'clock I was ___ing on the ___.",
            "I wasn't ___ing near the ball. I was ___ing.",
            "I saw the ___. It was ___ing behind the goal.",
            "The ___ and the ___ were ___ing together.",
            "I think the ___ is telling the truth because ___.",
          ],
          success: [
            "My writing has a suspect, a witness and a referee, and each one speaks.",
            "My writing uses was or were + -ing at least five times, and the helper matches the person.",
            "My writing gives a reason for the referee's decision with because.",
          ],
          challenge:
            "Add a second witness who tells a different story. Write what each witness says and explain which one the referee believes and why. Use one question in the past continuous and one negative sentence.",
        },
      },
    ],
  },

  // Lesson 4: compare and justify, with describing words in order
  "od2e-l3-u05-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["butterfly", "beetle", "grasshopper", "ladybug", "katydid", "bee"],
      grammar: ["size before color", "past continuous", "because"],
    },
    base: {
      title: "Which creature should be our class mascot?",
      task: "Your class needs a mascot. Compare two small creatures from the unit, choose one for the class and justify your choice. Use describing words in the right order.",
      steps: [
        "Write two sentences that describe each creature, with a size word before a color word.",
        "Write two sentences about how the creatures are the same and how they are different.",
        "Choose one creature for the class mascot and give two reasons.",
        "Write a short sentence in the past continuous about the mascot in action, for example what it was doing in the garden.",
      ],
      frames: [
        "A ___ is a small / big ___ creature. It has ___ ___ wings / legs.",
        "Both of them are ___, but the ___ is more ___ than the ___.",
        "I would choose the ___ because ___ and ___.",
        "The ___ was ___ing in the garden at four o'clock.",
        "Our class is ___, too, so the ___ is a good mascot.",
      ],
      success: [
        "My writing uses a size word before a color word at least three times.",
        "My writing says how the two creatures are the same and how they are different.",
        "My writing gives two reasons for the choice and uses a past continuous sentence.",
      ],
      challenge:
        "Compare a third creature with the first two. Say which of the three is the best for a school mascot and which is the worst, and write one sentence with an opinion word, a size word and a color word before the noun (for example: a beautiful little red bee).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which creature should be the Gunners' mascot?",
          task: "Arsenal wants a new small mascot for the Emirates Stadium. Compare two small creatures from the unit, choose one for the club and justify your choice. Use describing words in the right order.",
          steps: [
            "Write two sentences that describe each creature, with a size word before a color word.",
            "Write two sentences about how the creatures are the same and how they are different.",
            "Choose one creature for the club mascot and give two reasons.",
            "Write a short sentence in the past continuous about the mascot in action, for example what it was doing at the stadium.",
          ],
          frames: [
            "A ___ is a small / big ___ creature. It has ___ ___ wings / legs.",
            "Both of them are ___, but the ___ is more ___ than the ___.",
            "I would choose the ___ for the Gunners because ___ and ___.",
            "The ___ was ___ing at the stadium at four o'clock.",
            "The fans are ___, too, so the ___ is a good mascot.",
          ],
          success: [
            "My writing uses a size word before a color word at least three times.",
            "My writing says how the two creatures are the same and how they are different.",
            "My writing gives two reasons for the choice and uses a past continuous sentence.",
          ],
          challenge:
            "Compare a third creature with the first two. Say which of the three is the best for a football mascot and which is the worst, and write one sentence with an opinion word, a size word and a color word before the noun (for example: a beautiful little red bee).",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): evaluate two ways of telling one moment
  "od2e-l3-u05-l5": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["cricket", "grasshopper", "thicket", "beetle", "butterfly", "shooting star"],
      grammar: ["past continuous (was / were + -ing)", "wasn't / weren't", "because / so"],
    },
    base: {
      title: "Which line paints the better picture?",
      task: "Choose one moment in a garden at a certain time. Write it two ways: once with the past continuous (was / were + -ing) and once with a simple past verb (sang, jumped). Read both aloud, choose the one that paints the better picture and say why, like a poet.",
      steps: [
        "Choose a time and a place, and three creatures. Draw a quick picture of the moment.",
        "Version A: write four lines with was or were + -ing, for example 'A cricket was singing in the thicket.'",
        "Version B: write the same four lines with a simple past verb, for example 'A cricket sang in the thicket.'",
        "Read both versions aloud. Choose the one that puts you more inside the moment, and write two sentences to say why.",
      ],
      frames: [
        "At ___ o'clock, a ___ ___ was ___ing in the ___.",
        "The ___ were ___ing, and the ___ wasn't ___ing.",
        "Version A makes me see ___ because ___.",
        "I choose version ___ because ___, so the reader can ___.",
        "A poet might choose it because ___.",
      ],
      success: [
        "My version A has four lines with was or were + -ing, and every helper matches the person or thing.",
        "My version B tells the same four moments in a different way.",
        "I chose one version and gave a reason with because or so.",
      ],
      challenge:
        "Turn your best version into a four-line poem with one pair of rhyming words and at least one size word before a color word. Then write one sentence that says what you want the reader to understand (the theme).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which line paints the better match?",
          task: "Choose one moment on match day at the stadium at a certain time. Write it two ways: once with the past continuous (was / were + -ing) and once with a simple past verb (scored, ran). Read both aloud, choose the one that paints the better picture and say why, like a match-day poet.",
          steps: [
            "Choose a time, and three people or things at the stadium (fans, the keeper, the ball). Draw a quick picture of the moment.",
            "Version A: write four lines with was or were + -ing, for example 'The fans were singing behind the goal.'",
            "Version B: write the same four lines with a simple past verb, for example 'The fans sang behind the goal.'",
            "Read both versions aloud. Choose the one that puts you more inside the stadium, and write two sentences to say why.",
          ],
          frames: [
            "At ___ o'clock, the ___ was ___ing near the ___.",
            "The fans were ___ing, and the keeper wasn't ___ing.",
            "Version A makes me hear ___ because ___.",
            "I choose version ___ because ___, so the reader can ___.",
            "A match-day poet might choose it because ___.",
          ],
          success: [
            "My version A has four lines with was or were + -ing, and every helper matches the person or thing.",
            "My version B tells the same four moments in a different way.",
            "I chose one version and gave a reason with because or so.",
          ],
          challenge:
            "Turn your best version into a four-line poem with one pair of rhyming words and at least one size word before a color word (a huge red flag). Then write one sentence that says what you want the reader to understand (the theme).",
        },
      },
    ],
  },
};
