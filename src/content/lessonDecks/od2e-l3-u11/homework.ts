import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 11
// "Orchestras and Mystery Sounds": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U11Creative: Record<string, Creative> = {
  // Lesson 1: create a mystery that the reader solves by making inferences
  "od2e-l3-u11-l1": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["orchestra", "conductor", "baton", "cello", "timpani", "trombone", "bassoon", "mystery", "deafening"],
      grammar: ["making inferences (clue + what I know)", "past simple story", "It sounded like ... so they thought ..."],
    },
    base: {
      title: "The mystery sound",
      task: "Write the start of a short mystery. Two characters hear strange sounds and guess what is making them. Give the reader clues so that the reader can make an inference too, then show the surprise at the end.",
      steps: [
        "Invent two characters and a place, for example a school hall, a garden shed or a bus.",
        "Choose three sounds and describe each one with an exact word (deafening, soft, deep, high, buzzing).",
        "For each sound, write what the characters heard, what they guessed and which clue helped them.",
        "Finish with the surprise: what was making the sounds? Use at least one instrument or person from our unit words.",
      ],
      frames: [
        "___ and ___ were in the ___ when they heard a ___ sound.",
        "It sounded like a ___, so they thought ___.",
        "The clue was ___.",
        "But it was really a ___!",
        "Now the reader can see why ___.",
      ],
      success: [
        "My story has three sounds, and each sound has an exact describing word.",
        "My story gives a clue for each guess, so the reader can make an inference.",
        "My story ends with a surprise that uses a word from our unit.",
      ],
      challenge:
        "Add a clue that tricks the characters into a wrong guess. Write how they find out the guess was wrong and what new clue helps them, so the reader sees that a good inference can change.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The mystery in the tunnel",
          task: "Write the start of a short mystery set before a match at the Emirates Stadium. Two young Arsenal fans hear strange sounds under the stands and guess what is making them. Give the reader clues, then show the surprise at the end.",
          steps: [
            "Invent two young fans and a place at the stadium, for example the tunnel, the fan shop or the stairs to the seats.",
            "Choose three sounds and describe each one with an exact word (deafening, soft, deep, high, buzzing).",
            "For each sound, write what the fans heard, what they guessed and which clue helped them.",
            "Finish with the surprise: what was making the sounds? Use at least one instrument from our unit words, for example the match-day band's timpani and trombones.",
          ],
          frames: [
            "___ and ___ were in the ___ at the Emirates when they heard a ___ sound.",
            "It sounded like a ___, so they thought ___.",
            "The clue was ___.",
            "But it was really the band!",
            "Now the reader can see why ___.",
          ],
          success: [
            "My story has three sounds, and each sound has an exact describing word.",
            "My story gives a clue for each guess, so the reader can make an inference.",
            "My story ends with a surprise that uses a word from our unit.",
          ],
          challenge:
            "Add a clue that tricks the fans into a wrong guess (for example, they think a team bus has arrived). Write how they find out the guess was wrong and what new clue helps them.",
        },
      },
    ],
  },

  // Lesson 2: evaluate two instruments and choose one
  "od2e-l3-u11-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["cello", "trombone", "bassoon", "timpani", "orchestra", "conductor", "deafening"],
      grammar: ["comparatives (-er / more ... than)", "superlatives (the -est / the most)", "because and so"],
    },
    base: {
      title: "The best instrument for our school concert",
      task: "Your school is planning a concert and has room for one new instrument. Judge two instruments from our unit and decide which one the school should choose. Defend your decision with evidence.",
      steps: [
        "Choose two instruments, for example a cello and a trombone, and write how each one sounds.",
        "Compare them: which is louder, deeper or easier to carry? Write at least two comparisons.",
        "Decide which one the school should choose and write why, with two reasons.",
        "Write one thing the other instrument does better. A fair judge is honest.",
      ],
      frames: [
        "A ___ sounds ___, and a ___ sounds ___.",
        "The ___ is ___er than the ___. / The ___ is more ___ than the ___.",
        "I think the school should choose the ___ because ___ and ___.",
        "The ___ is the most ___ instrument for a hall because ___.",
        "The ___ is good, too, but ___.",
      ],
      success: [
        "My writing names two instruments and describes the sound of each one.",
        "My writing uses at least two comparative adjectives with than and one superlative with the.",
        "My writing gives two reasons for the decision, joined with because or so.",
      ],
      challenge:
        "Rank all four instruments (cello, trombone, bassoon, timpani) from 1 to 4 for a small hall and give each a score out of 10. Explain why you put the last one last, and say who might disagree with you and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The best instrument for the Gunners' band",
          task: "The match-day band at the Emirates Stadium has room for one new instrument. Judge two instruments from our unit and decide which one the Gunners' band should add. Defend your decision with evidence.",
          steps: [
            "Choose two instruments, for example timpani and a trombone, and write how each one sounds in a big stadium.",
            "Compare them: which is louder, easier to hear or easier to carry? Write at least two comparisons.",
            "Decide which one the band should add and write why, with two reasons.",
            "Write one thing the other instrument does better. A fair judge is honest.",
          ],
          frames: [
            "A ___ sounds ___, and a ___ sounds ___.",
            "The ___ is ___er than the ___. / The ___ is more ___ than the ___.",
            "I think the band should add the ___ because ___ and ___.",
            "The ___ is the most ___ instrument for a stadium because ___.",
            "The ___ is good, too, but ___.",
          ],
          success: [
            "My writing names two instruments and describes the sound of each one.",
            "My writing uses at least two comparative adjectives with than and one superlative with the.",
            "My writing gives two reasons for the decision, joined with because or so.",
          ],
          challenge:
            "Rank all four instruments (cello, trombone, bassoon, timpani) from 1 to 4 for a stadium band and give each a score out of 10. Explain why you put the last one last, and say which fan might disagree with you and why.",
        },
      },
    ],
  },

  // Lesson 3: argue a position using comparatives and superlatives
  "od2e-l3-u11-l3": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["orchestra", "conductor", "trombone", "timpani", "deafening", "scientist"],
      grammar: ["comparative adjectives with than", "superlative adjectives with the", "I think ... because ..."],
    },
    base: {
      title: "Is louder always better?",
      task: "Write a short talk between two friends. One says that louder music is always better. The other says that quiet music can be better. They disagree at first and at the end they agree on something.",
      steps: [
        "Give the friends names that you invent (not names from our class).",
        "Friend A gives a reason why louder music is better. Friend B gives a reason why quiet music can be better.",
        "Write at least three turns for each friend. Use a comparative with than at least three times and a superlative with the at least twice.",
        "Finish with something they both agree on, for example the most important thing about a good concert.",
      ],
      frames: [
        "I think louder music is better because ___.",
        "I don't agree. Quiet music is ___er / more ___ than loud music because ___.",
        "The most ___ part of a concert is ___.",
        "That's true, but ___.",
        "We both agree that ___.",
      ],
      success: [
        "My writing has two clear sides, and each side gives a reason with because.",
        "My writing uses comparatives with than and superlatives with the correctly, including more / most for long adjectives.",
        "My writing ends with something both friends agree on.",
      ],
      challenge:
        "Add a third friend who changes the question (for example: is the best music the music that makes you feel the most?). Write what each friend says and make sure every comparative is spelled correctly (bigger, funnier, better, worse).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Is a louder crowd always better?",
          task: "Write a short talk between two Arsenal fans at the Emirates Stadium. One says that a louder crowd is always better for the Gunners. The other says that a quiet crowd can be better at some moments. They disagree at first and at the end they agree on something.",
          steps: [
            "Give the fans names that you invent (not names from our class).",
            "Fan A gives a reason why a louder crowd is better. Fan B gives a reason why quiet can be better, for example when a player is concentrating.",
            "Write at least three turns for each fan. Use a comparative with than at least three times and a superlative with the at least twice.",
            "Finish with something they both agree on, for example the most important thing about match-day music.",
          ],
          frames: [
            "I think a louder crowd is better because ___.",
            "I don't agree. A quiet crowd is ___er / more ___ than a loud crowd when ___.",
            "The most ___ moment of a match is ___.",
            "That's true, but ___.",
            "We both agree that ___.",
          ],
          success: [
            "My writing has two clear sides, and each side gives a reason with because.",
            "My writing uses comparatives with than and superlatives with the correctly, including more / most for long adjectives.",
            "My writing ends with something both fans agree on.",
          ],
          challenge:
            "Add a third fan who changes the question (for example: is the best atmosphere the one that makes the players feel the most welcome?). Write what each fan says and make sure every comparative is spelled correctly (bigger, funnier, better, worse).",
        },
      },
    ],
  },

  // Lesson 4: compare and justify, with possessive nouns
  "od2e-l3-u11-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["cello", "trombone", "bassoon", "timpani", "orchestra", "conductor", "baton", "amazing", "relaxing"],
      grammar: ["possessive nouns ('s and s')", "comparative adjectives with than", "-ing adjectives (amazing, relaxing)"],
    },
    base: {
      title: "The conductor's choice",
      task: "You are the conductor of a new orchestra. You must choose which instrument sits at the front for the first concert. Compare two instruments, then choose one and justify your choice.",
      steps: [
        "Choose two instruments. Write two sentences that compare their sounds. Use a possessive noun in each (for example: the cello's sound is deeper than the flute's sound).",
        "Write two sentences about how the instruments are different in size, material or the way a player makes the sound.",
        "Choose one for the front of the orchestra and give two reasons.",
        "Write one -ing adjective (amazing, relaxing, challenging) to describe how the music will feel to the audience.",
      ],
      frames: [
        "The ___'s sound is ___er / more ___ than the ___'s sound.",
        "The ___'s player ___, but the ___'s player ___.",
        "I would put the ___ at the front because ___ and ___.",
        "The audience will find the music ___ing because ___.",
        "The other musicians' ___ will ___.",
      ],
      success: [
        "My writing uses a possessive noun correctly at least three times (the cello's, the players', the children's).",
        "My writing says how the two instruments are the same and how they are different.",
        "My writing gives two reasons for the choice and uses an -ing adjective.",
      ],
      challenge:
        "Add a third instrument and make a list of all three from the most to the least relaxing. Write one sentence with a plural possessive noun that ends in s (the musicians') and one with an irregular plural (the children's).",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The band leader's choice at the stadium",
          task: "You lead the match-day band at the Emirates Stadium. You must choose which instrument stands at the front before kick-off. Compare two instruments, then choose one and justify your choice.",
          steps: [
            "Choose two instruments. Write two sentences that compare their sounds in a stadium. Use a possessive noun in each (for example: the drum's beat is deeper than the trumpet's call).",
            "Write two sentences about how the instruments are different in size or in the way a player makes the sound.",
            "Choose one for the front of the band and give two reasons.",
            "Write one -ing adjective (amazing, exciting, challenging) to describe how the music will feel to the fans.",
          ],
          frames: [
            "The ___'s sound is ___er / more ___ than the ___'s sound.",
            "The ___'s player ___, but the ___'s player ___.",
            "I would put the ___ at the front because ___ and ___.",
            "The fans will find the music ___ing because ___.",
            "The other musicians' ___ will ___.",
          ],
          success: [
            "My writing uses a possessive noun correctly at least three times (the drum's, the players', the fans').",
            "My writing says how the two instruments are the same and how they are different.",
            "My writing gives two reasons for the choice and uses an -ing adjective.",
          ],
          challenge:
            "Add a third instrument and make a list of all three from the most to the least exciting. Write one sentence with a plural possessive noun that ends in s (the fans') and one with an irregular plural (the children's).",
        },
      },
    ],
  },

  // Lesson 5 (Grammar Champions): rank three sounds with comparatives and superlatives, and justify the winner
  "od2e-l3-u11-l5": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["orchestra", "conductor", "cello", "timpani", "trombone", "bassoon", "deafening"],
      grammar: ["comparative adjectives with than", "superlative adjectives with the", "because / so"],
    },
    base: {
      title: "The Sound Awards",
      task: "You are the host of the Sound Awards at a school concert. Choose three instruments or sounds and give out three prizes. Compare them, name the winner of each prize, and explain each choice.",
      steps: [
        "Choose three instruments or sounds, for example the timpani, the bassoon and a triangle, or rain, a drum and a whistle.",
        "Write three sentences that compare two of them, one sentence each, with a comparative and than (louder than, more relaxing than, deeper than).",
        "Name three prize winners with a superlative: the loudest, the most relaxing, the deepest, or your own prize.",
        "Add because or so to at least two of your choices, then read your speech to someone at home.",
      ],
      frames: [
        "The ___ is ___er than the ___ because ___.",
        "The ___ is more ___ than the ___, so ___.",
        "The prize for the loudest sound goes to the ___!",
        "The ___ is the most ___ of the three because ___.",
        "Everyone at the concert will remember the ___ because ___.",
      ],
      success: [
        "My writing uses a comparative with than and a superlative with the, and the forms are spelled correctly (louder, the most relaxing).",
        "My writing gives a reason with because or so for at least two choices.",
        "My writing names a winner for every prize and says why it won.",
      ],
      challenge:
        "Add a fourth prize for a surprising winner. Write why it beats the other three, using one irregular form (better, the best, worse or the worst) and one long adjective with more or the most.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Match-Day Sound Awards",
          task: "You are the host of the Match-Day Sound Awards at the stadium. Choose three sounds from a football match (the drum, the whistle, the crowd singing) and give out three prizes. Compare them, name the winner of each prize, and explain each choice.",
          steps: [
            "Choose three sounds from a match day, for example the referee's whistle, the fans' drum and the crowd singing.",
            "Write three sentences that compare two of them, one sentence each, with a comparative and than (louder than, more exciting than, higher than).",
            "Name three prize winners with a superlative: the loudest, the most exciting, the highest, or your own prize.",
            "Add because or so to at least two of your choices, then read your speech to someone at home.",
          ],
          frames: [
            "The ___ is ___er than the ___ because ___.",
            "The ___ is more ___ than the ___, so ___.",
            "The prize for the loudest sound goes to the ___!",
            "The ___ is the most ___ of the three because ___.",
            "Every fan will remember the ___ because ___.",
          ],
          success: [
            "My writing uses a comparative with than and a superlative with the, and the forms are spelled correctly (louder, the most exciting).",
            "My writing gives a reason with because or so for at least two choices.",
            "My writing names a winner for every prize and says why it won.",
          ],
          challenge:
            "Add a fourth prize for a surprising winner. Write why it beats the other three, using one irregular form (better, the best, worse or the worst) and one long adjective with more or the most.",
        },
      },
    ],
  },
};
