import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 6
// "Seeing Like a Poet": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U6Creative: Record<string, Creative> = {
  // Lesson 1: design a poster that labels a thing in nature with poet words
  "od2e-l3-u06-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["noun", "verb", "adjective", "syllable", "sentence", "letter", "robin", "snowflakes"],
      grammar: ["noun + verb + adjective in a short line", "visualize with I can see ..."],
    },
    base: {
      title: "A poet's word poster",
      task: "Design a poster about one thing in nature. Show it, label its parts with poet words and write one line that makes your reader see a picture.",
      steps: [
        "Choose one thing in nature, for example a robin, a rain cloud or a banana tree. Draw it in the middle of a page.",
        "Label it with one noun, one adjective and one verb. Draw a line from each word to the part of the picture it describes.",
        "Write one sentence that tells what you visualize. Count the syllables in your favorite word.",
        "Finish with a poet line: adjective + noun + verb, for example 'Soft snowflakes fall.'",
      ],
      frames: [
        "My poster is about a ___.",
        "The noun is ___, the verb is ___ and the adjective is ___.",
        "When I look at it, I can see ___.",
        "My favorite word is ___. It has ___ syllables.",
        "My poet line is: ___ ___ ___.",
      ],
      success: [
        "My poster has a noun, a verb and an adjective, all labeled.",
        "My sentence tells what I see in my mind, with details.",
        "I count the syllables of one word correctly.",
      ],
      challenge:
        "Add a second poster for a thing that is not in nature (a bridge, a bike, a school bell) and say how the poet words change for it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poet's word poster for the stadium",
          task: "Design a poster about one thing you can see at the Emirates Stadium on match day. Show it, label its parts with poet words and write one line that makes your reader see a picture.",
          steps: [
            "Choose one thing at the stadium, for example the grass, a floodlight or a goal net. Draw it in the middle of a page.",
            "Label it with one noun, one adjective and one verb. Draw a line from each word to the part of the picture it describes.",
            "Write one sentence that tells what you visualize on a match day. Count the syllables in your favorite word.",
            "Finish with a poet line: adjective + noun + verb, for example 'Bright floodlights shine.'",
          ],
          frames: [
            "My poster is about the ___ at the Emirates Stadium.",
            "The noun is ___, the verb is ___ and the adjective is ___.",
            "When I look at it, I can see ___.",
            "My favorite word is ___. It has ___ syllables.",
            "My poet line is: ___ ___ ___.",
          ],
          success: [
            "My poster has a noun, a verb and an adjective, all labeled.",
            "My sentence tells what I see in my mind, with details.",
            "I count the syllables of one word correctly.",
          ],
          challenge:
            "Add a second poster for something that is not at the stadium (a bridge, a bike, a school bell) and say how the poet words change for it.",
        },
      },
    ],
  },

  // Lesson 2: evaluate the three poem forms
  "od2e-l3-u06-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["observe", "imagine", "describe", "exact", "syllable", "rhyming words", "letter"],
      grammar: ["opinion with because", "the rule is ...", "comparing forms with but and so"],
    },
    base: {
      title: "Which poem form is best?",
      task: "Judge the three poem forms from the reading (acrostic, cinquain, haiku). Choose the best form for one topic and give reasons.",
      steps: [
        "Choose a topic, for example the rainy season, a pet or your school day.",
        "For each form write one sentence: what its rule is and what it would be like for your topic.",
        "Choose the best form for your topic. Give two reasons from the rules of the poem.",
        "Write one reason why someone else might choose a different form, and answer it.",
      ],
      frames: [
        "My topic is ___.",
        "An acrostic uses ___. A cinquain has ___. A haiku has ___.",
        "I think the ___ is best for this topic because ___.",
        "Another reason is that ___.",
        "Some people may choose a ___, but I think ___.",
      ],
      success: [
        "I name the rule of each form correctly.",
        "I give two reasons for my choice.",
        "I answer one different opinion with 'but' or 'however'.",
      ],
      challenge:
        "Write one line of the poem in your chosen form so that the reader can see that your choice works.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poem form for match day",
          task: "Judge the three poem forms from the reading (acrostic, cinquain, haiku). Choose the best form for a poem about an Arsenal match at the Emirates Stadium and give reasons.",
          steps: [
            "Choose your match-day topic, for example a goal, the crowd or the final whistle.",
            "For each form write one sentence: what its rule is and what it would be like for your topic.",
            "Choose the best form for your topic. Give two reasons from the rules of the poem.",
            "Write one reason why a Gunners fan might choose a different form, and answer it.",
          ],
          frames: [
            "My match-day topic is ___.",
            "An acrostic uses ___. A cinquain has ___. A haiku has ___.",
            "I think the ___ is best for this topic because ___.",
            "Another reason is that ___.",
            "Some fans may choose a ___, but I think ___.",
          ],
          success: [
            "I name the rule of each form correctly.",
            "I give two reasons for my choice.",
            "I answer one different opinion with 'but' or 'however'.",
          ],
          challenge:
            "Write one line of the poem in your chosen form so that the reader can feel the match day.",
        },
      },
    ],
  },

  // Lesson 3: compare alibis and decide who is telling the truth
  "od2e-l3-u06-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["observe", "describe", "exact", "imagine", "sentence"],
      grammar: ["past continuous (was / were + -ing)", "simple past with when", "while with two long actions"],
    },
    base: {
      title: "The case of the missing cake",
      task: "A cake has disappeared from the kitchen at four o'clock. Three people each say what they were doing. Compare their alibis and decide who is not telling the truth.",
      steps: [
        "Invent three people and write each person's alibi in two sentences: what they were doing when the cake disappeared.",
        "Make one alibi match another person's story (they were together) and make one story that does not fit.",
        "Write who you think is not telling the truth and say how you know.",
        "Write the ending: what happened when the cake was found?",
      ],
      frames: [
        "At four o'clock, ___ was ___ when ___.",
        "___ and ___ were ___ together.",
        "___'s story does not fit because ___ was ___ at the same time.",
        "I think ___ is not telling the truth because ...",
        "In the end, the cake was ___ when ___.",
      ],
      success: [
        "I use was / were + -ing for what people were doing, and the simple past for what happened.",
        "I use when correctly in at least three sentences.",
        "I explain who is not telling the truth with because.",
      ],
      challenge:
        "Add a fourth person and use while in one sentence: 'While ___ was ___, ___ was ___.'",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The case of the missing trophy",
          task: "A trophy has disappeared from the Emirates Stadium at four o'clock. Three people each say what they were doing. Compare their alibis and decide who is not telling the truth.",
          steps: [
            "Invent three people by their jobs (the groundskeeper, the coach, the mascot) and write each alibi in two sentences: what they were doing when the trophy disappeared.",
            "Make one alibi match another person's story (they were together) and make one story that does not fit.",
            "Write who you think is not telling the truth and say how you know.",
            "Write the ending: what happened when the trophy was found?",
          ],
          frames: [
            "At four o'clock, the ___ was ___ when ___.",
            "The ___ and the ___ were ___ together.",
            "The ___'s story does not fit because ___ was ___ at the same time.",
            "I think the ___ is not telling the truth because ...",
            "In the end, the trophy was ___ when ___.",
          ],
          success: [
            "I use was / were + -ing for what people were doing, and the simple past for what happened.",
            "I use when correctly in at least three sentences.",
            "I explain who is not telling the truth with because.",
          ],
          challenge:
            "Add a fourth person and use while in one sentence: 'While the ___ was ___, the ___ was ___.'",
        },
      },
    ],
  },

  // Lesson 4: argue that something in nature deserves a poem
  "od2e-l3-u06-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["adjective", "verb", "syllable", "rhyming words", "describe", "imagine"],
      grammar: ["asking for and giving opinions", "action verbs with -s", "because"],
    },
    base: {
      title: "This deserves a poem!",
      task: "Argue that one thing in nature deserves a poem. Write a short speech that gives your opinion, three reasons and one line that shows it.",
      steps: [
        "Choose one thing in nature that deserves a poem, for example the moon, a river or a cricket.",
        "Write your opinion in one sentence, then give three reasons. Use at least two action verbs.",
        "Write what someone who disagrees might say ('Nobody writes poems about crickets!') and answer them.",
        "Finish with one poem line using an action verb, for example 'The moon smiles.' Count the syllables.",
      ],
      frames: [
        "In my opinion, the ___ deserves a poem.",
        "First, it ___s ...  Second, it is ___ ...  Third, ...",
        "Some people think ___, but I think ___ because ...",
        "My poem line is: ___ ___s ___ (___ syllables).",
        "That is why the ___ deserves a poem.",
      ],
      success: [
        "I give my opinion and three reasons.",
        "I use at least two action verbs, with -s where it is needed.",
        "I answer one different view and end with a poem line.",
      ],
      challenge:
        "Write the speech for a class that does not like poems. Use a rhyme in your closing line to win them over.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poem for the stadium campaign",
          task: "Argue that something at the Emirates Stadium deserves a poem. Write a short speech that gives your opinion, three reasons and one line that shows it.",
          steps: [
            "Choose one thing at the stadium that deserves a poem, for example the crowd, the grass or the floodlights.",
            "Write your opinion in one sentence, then give three reasons. Use at least two action verbs.",
            "Write what someone who disagrees might say ('Nobody writes poems about a football pitch!') and answer them.",
            "Finish with one poem line using an action verb, for example 'The crowd roars.' Count the syllables.",
          ],
          frames: [
            "In my opinion, the ___ deserves a poem.",
            "First, it ___s ...  Second, it is ___ ...  Third, ...",
            "Some people think ___, but I think ___ because ...",
            "My poem line is: ___ ___s ___ (___ syllables).",
            "That is why the ___ deserves a poem.",
          ],
          success: [
            "I give my opinion and three reasons.",
            "I use at least two action verbs, with -s where it is needed.",
            "I answer one different view and end with a poem line.",
          ],
          challenge:
            "Write the speech for the Gunners' fans who do not like poems. Use a rhyme in your closing line to win them over.",
        },
      },
    ],
  },

  // Lesson 5: create a poem as a gift and explain the choices
  "od2e-l3-u06-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["syllable", "rhyming words", "describe", "imagine", "observe", "adjective", "verb"],
      grammar: ["acrostic, cinquain or haiku rules", "action verbs", "because"],
    },
    base: {
      title: "A poem as a gift",
      task: "Write a poem as a gift for someone you care about. Choose a poem form, write the poem and write a card that says why you chose it.",
      steps: [
        "Choose the person and one thing they love. Choose a poem form: acrostic, cinquain or haiku.",
        "Write the poem. Use at least two action verbs and one adjective.",
        "Write a card that says why you wrote the poem and why you chose that form.",
        "Draw a picture for the gift and read the poem aloud to someone.",
      ],
      frames: [
        "I wrote this poem for ___ because ___.",
        "I chose a ___ because the rule ___.",
        "In my poem, the ___ ___s, so you can see ___.",
        "I hope this poem makes you feel ___.",
        "Thank you for ___.",
      ],
      success: [
        "My poem follows the rule of the form I chose.",
        "My card gives two reasons: why I wrote it and why I chose the form.",
        "I use action verbs correctly and my poem makes a picture.",
      ],
      challenge:
        "Write a second poem about the same person in a different form, and tell which one shares your feelings better and why.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A poem for the Gunners",
          task: "Write a poem as a gift for the Arsenal fans or players at the Emirates Stadium. Choose a poem form, write the poem and write a card that says why you chose it.",
          steps: [
            "Choose who the poem is for (the fans, the team or the goalkeeper) and one thing they love. Choose a poem form: acrostic, cinquain or haiku.",
            "Write the poem. Use at least two action verbs and one adjective.",
            "Write a card that says why you wrote the poem and why you chose that form.",
            "Draw a picture for the gift and read the poem aloud to someone.",
          ],
          frames: [
            "I wrote this poem for ___ because ___.",
            "I chose a ___ because the rule ___.",
            "In my poem, the ___ ___s, so you can see ___.",
            "I hope this poem makes the Gunners' fans feel ___.",
            "Thank you for ___.",
          ],
          success: [
            "My poem follows the rule of the form I chose.",
            "My card gives two reasons: why I wrote it and why I chose the form.",
            "I use action verbs correctly and my poem makes a picture.",
          ],
          challenge:
            "Write a second poem for the same fans in a different form, and tell which one shares your feelings better and why.",
        },
      },
    ],
  },
  // Lesson 6 (Grammar Champions): catch a moment in a short poem and explain why it is worth keeping
  "od2e-l3-u06-l6": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["observe", "imagine", "describe", "exact", "robin", "snowflakes", "adjective", "verb"],
      grammar: ["was / were + -ing", "when + simple past", "because / so"],
    },
    base: {
      title: "A moment worth keeping",
      task: "Choose one moment, real or imagined, that would make a good poem. Write two lines that freeze the moment, then write a short paragraph that tells what was happening and why you want to keep it.",
      steps: [
        "Choose your moment, for example a walk in the rain, a picnic or the first snow. Close your eyes and visualize it. What do you see?",
        "Write two lines of a moment poem. Line 1: what was in progress, with was / were + -ing. Line 2: the surprise, with the simple past.",
        "Write a paragraph of four or more sentences. Tell what you were doing, what happened (use when), and what you did next (use so).",
        "Finish with the reason: say why you chose this moment, with because. Draw a small picture to go with your poem.",
      ],
      frames: [
        "I was ___ when ___.",
        "The ___ was ___ing, and then ___.",
        "It was ___, so I ___.",
        "I chose this moment because ___.",
        "In my mind I can see ___.",
      ],
      success: [
        "My two lines use was / were + -ing for the long action and the simple past for the surprise.",
        "My paragraph says what happened, what I did next, and why I chose the moment, with when, so and because.",
        "My words describe the moment so that a reader can see a picture.",
      ],
      challenge:
        "Write a second moment poem about the same scene from another person's point of view (a bird, a friend or a teacher), and say how the picture changes when the person changes.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match-day moment worth keeping",
          task: "Choose one moment from a football match at the Emirates Stadium, real or imagined, that would make a good poem. Write two lines that freeze the moment, then write a short paragraph that tells what was happening and why you want to keep it.",
          steps: [
            "Choose your moment, for example the players walking out, the crowd singing or a goal. Close your eyes and visualize it. What do you see and hear?",
            "Write two lines of a moment poem. Line 1: what was in progress, with was / were + -ing. Line 2: the surprise, with the simple past.",
            "Write a paragraph of four or more sentences. Tell what you or the fans were doing, what happened (use when), and what you did next (use so).",
            "Finish with the reason: say why you chose this moment, with because. Draw a small picture of the stadium to go with your poem.",
          ],
          frames: [
            "The fans were ___ when ___.",
            "The ball was ___ing, and then ___.",
            "It was ___, so we ___.",
            "I chose this moment because ___.",
            "In my mind I can see ___.",
          ],
          success: [
            "My two lines use was / were + -ing for the long action and the simple past for the surprise.",
            "My paragraph says what happened, what the fans did next, and why I chose the moment, with when, so and because.",
            "My words describe the moment so that a reader can see a picture.",
          ],
          challenge:
            "Write a second moment poem about the same match from another person's point of view (the goalkeeper, a ball boy or a commentator), and say how the picture changes when the person changes.",
        },
      },
    ],
  },
};
