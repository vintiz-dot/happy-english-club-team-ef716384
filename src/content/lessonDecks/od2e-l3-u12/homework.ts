import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 12
// "Instruments Around the World": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U12Creative: Record<string, Creative> = {
  // Lesson 1: compare and contrast with both / but
  "od2e-l3-u12-l1": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["flute", "violin", "djembe", "tuba", "didgeridoo", "snare drum", "clarinet"],
      grammar: ["both ... and ...", "but", "compare and contrast two instruments"],
    },
    base: {
      title: "Which one for our school band?",
      task: "Pick two instruments and compare them. Then choose the one you would put in your school band and say why.",
      steps: [
        "Choose two instruments, for example the flute and the violin.",
        "Write two sentences about how they are the same, with both.",
        "Write two sentences about how they are different, with but.",
        "Choose one for the school band and give a reason.",
      ],
      frames: [
        "Both the ___ and the ___ are ___.",
        "You ___ the ___, but you ___ the ___.",
        "The ___ sounds ___, but the ___ sounds ___.",
        "Both of them can ___.",
        "I would choose the ___ because ___.",
      ],
      success: [
        "My writing uses both at least twice and but at least twice.",
        "My writing says how the instruments are played (blow, hit, pluck or bow).",
        "My writing gives a reason for my choice with because.",
      ],
      challenge:
        "Give a second reason that is about the other children, not about you (for example, which one is easier for beginners), and say one thing the other instrument is better at.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Drum or clarinet on match day?",
          task: "Compare two instruments that fans could bring to a football match. Then choose the one you would play at the Emirates Stadium and say why.",
          steps: [
            "Choose two instruments for match day, for example a snare drum and a clarinet, or a djembe and a tuba.",
            "Write two sentences about how they are the same, with both.",
            "Write two sentences about how they are different, with but.",
            "Choose one for the Arsenal fans and give a reason.",
          ],
          frames: [
            "Both the ___ and the ___ are ___.",
            "You ___ the ___, but you ___ the ___.",
            "In a big crowd, the ___ sounds ___, but the ___ sounds ___.",
            "Both of them can help the fans ___.",
            "I would bring the ___ to the Emirates Stadium because ___.",
          ],
          success: [
            "My writing uses both at least twice and but at least twice.",
            "My writing says how each instrument is played (blow, hit, pluck or bow).",
            "My writing gives a reason for my choice with because.",
          ],
          challenge:
            "Think about the whole stadium. Give a second reason that is about the other fans, and say one problem with your choice and how you would solve it.",
        },
      },
    ],
  },

  // Lesson 2: facts from a nonfiction text, present simple
  "od2e-l3-u12-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["zummara", "panpipes", "erhu", "didgeridoo", "vibrate", "pipe", "string", "bow"],
      grammar: ["present simple for facts", "it is / it has / it makes", "because"],
    },
    base: {
      title: "A riddle book page",
      task: "Make one page for a riddle book about an instrument. Write three clues in the present simple, and hide the answer on the back.",
      steps: [
        "Choose an instrument from the unit.",
        "Find three facts: where it comes from, how you play it, and what it sounds like.",
        "Write each fact as a clue without saying the name.",
        "Write the answer upside down at the bottom and draw a small picture.",
      ],
      frames: [
        "I come from ___.",
        "You ___ me with your ___.",
        "I have ___ strings / pipes / skins.",
        "I make a ___ sound because ___.",
        "What am I?",
      ],
      success: [
        "My writing has three clues and each one is a true fact.",
        "My writing uses the present simple (I have, you blow, it makes).",
        "My writing does not say the name of the instrument until the answer.",
      ],
      challenge:
        "Write a fourth clue that is a surprising fact most people do not know, and check it in a book or with a grown-up so you are sure it is true.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The mystery match-day instrument",
          task: "Make a riddle page about an instrument that could be played by fans on match day. Write three clues in the present simple and hide the answer.",
          steps: [
            "Choose an instrument from the unit that would work in a stadium.",
            "Find three facts: where it comes from, how you play it, and what it sounds like.",
            "Write each fact as a clue, with one clue about a football match, without saying the name.",
            "Write the answer upside down at the bottom and draw the instrument in Arsenal colours.",
          ],
          frames: [
            "I come from ___.",
            "You ___ me with your ___.",
            "I have ___ skins / strings / pipes.",
            "On match day, I make a ___ sound because ___.",
            "What am I?",
          ],
          success: [
            "My writing has three clues and each one is a true fact.",
            "My writing uses the present simple (I have, you hit, it makes).",
            "My writing does not say the name of the instrument until the answer.",
          ],
          challenge:
            "Write a fourth clue about why a crowd of thousands would hear me, and explain it with because. Make sure every fact about the instrument is true.",
        },
      },
    ],
  },

  // Lesson 3: as + adj + as / not as + adj + as
  "od2e-l3-u12-l3": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["tuba", "flute", "snare drum", "violin", "loud", "quiet", "heavy", "high", "deep"],
      grammar: ["as + adjective + as", "not as + adjective + as"],
    },
    base: {
      title: "Rank the instruments for our school trip",
      task: "Our class is going on a trip by bus and can bring three instruments. Rank five instruments and explain your choices.",
      steps: [
        "Choose five instruments and write them in a list.",
        "Pick three things that matter, for example loud, easy to carry and nice to listen to.",
        "Compare the instruments with as ... as and not as ... as.",
        "Choose your top three and write one sentence to explain each choice.",
      ],
      frames: [
        "The ___ is as ___ as the ___.",
        "The ___ is not as ___ as the ___.",
        "For a bus trip, the ___ is better because ___.",
        "The ___ is not as ___ as the ___, so ___.",
        "My top three are ___, ___ and ___.",
      ],
      success: [
        "My writing uses as ... as at least twice and not as ... as at least twice.",
        "My writing uses my three ideas (criteria) to judge the instruments.",
        "My writing gives a reason for each of my top three.",
      ],
      challenge:
        "Choose one instrument that you ranked last and write a short, fair paragraph about when it would be the best choice after all.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Rank the instruments for the away end",
          task: "Arsenal fans are travelling to an away match and can bring three instruments. Rank five instruments and explain your choices.",
          steps: [
            "Choose five instruments and write them in a list.",
            "Pick three things that matter for a match, for example loud, easy to carry and good for singing along to.",
            "Compare the instruments with as ... as and not as ... as.",
            "Choose your top three for the Gunners' fans and write one sentence to explain each choice.",
          ],
          frames: [
            "The ___ is as ___ as the ___.",
            "The ___ is not as ___ as the ___.",
            "For the away end, the ___ is better because ___.",
            "The ___ is not as ___ as the ___, so ___.",
            "My top three for the fans are ___, ___ and ___.",
          ],
          success: [
            "My writing uses as ... as at least twice and not as ... as at least twice.",
            "My writing uses my three ideas (criteria) to judge the instruments.",
            "My writing gives a reason for each of my top three.",
          ],
          challenge:
            "Write a short, fair paragraph for a fan who disagrees with your ranking. Say what is right about their idea and why you still keep your order.",
        },
      },
    ],
  },

  // Lesson 4: its / it's, describing adjectives, -dge words
  "od2e-l3-u12-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["bridge", "edge", "judge", "badge", "shiny", "wooden", "hollow", "smooth", "strings"],
      grammar: ["its (belonging) and it's (it is / it has)", "describing adjectives", "-dge words"],
    },
    base: {
      title: "A letter to the head teacher",
      task: "Write a short letter to persuade the head teacher to buy one instrument for the school. Describe it so well that the head teacher wants to hear it.",
      steps: [
        "Choose the instrument you want the school to buy.",
        "Write what it looks like and sounds like, using describing adjectives and its.",
        "Write two reasons why it is a good idea, using it's.",
        "End with a polite question and check that every its and it's is correct.",
      ],
      frames: [
        "Dear Head Teacher, I think the school should buy a ___.",
        "Its ___ is ___ and its sound is ___.",
        "It's a good idea because ___.",
        "It's ___ enough for ___, but it isn't too ___.",
        "Could we please ___?",
      ],
      success: [
        "My writing uses its and it's correctly at least three times.",
        "My writing has at least four describing adjectives.",
        "My writing gives two clear reasons, and ends with a polite question.",
      ],
      challenge:
        "Add a counter-argument. Say what someone might worry about (for example, the cost or the noise), and answer it politely.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A letter to the Arsenal club shop",
          task: "Write a short letter to persuade the club to sell one instrument in the shop for fans to play on match day. Describe it so well that the manager of the shop wants to stock it.",
          steps: [
            "Choose the instrument you want fans to bring to the Emirates Stadium.",
            "Write what it looks like and sounds like, using describing adjectives and its.",
            "Write two reasons why it is a good idea for match day, using it's.",
            "End with a polite question and check that every its and it's is correct.",
          ],
          frames: [
            "Dear Manager, I think the shop should sell a ___.",
            "Its ___ is ___ and its sound is ___.",
            "It's a good idea because ___.",
            "It's ___ enough for a big crowd, but it isn't too ___.",
            "Could the club please ___?",
          ],
          success: [
            "My writing uses its and it's correctly at least three times.",
            "My writing has at least four describing adjectives.",
            "My writing gives two clear reasons, and ends with a polite question.",
          ],
          challenge:
            "Add a counter-argument. Say what other fans or the neighbours near the stadium might worry about, and answer them politely.",
        },
      },
    ],
  },

  // Lesson 5: descriptive paragraph using as ... as and its / it's
  "od2e-l3-u12-l5": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["instrument", "strings", "pipes", "drum", "vibrate", "deep", "high", "wooden", "shiny"],
      grammar: ["as + adjective + as", "not as + adjective + as", "its / it's", "descriptive paragraph"],
    },
    base: {
      title: "An instrument for a new planet",
      task: "Design an instrument for a planet where the wind never stops blowing, or for a rainforest band. Write a paragraph that describes it and how it sounds.",
      steps: [
        "Choose where the instrument will be played and who will play it.",
        "Draw it and label three parts (what it is made of, how you play it).",
        "Write a paragraph of 6 to 8 sentences about it.",
        "Include one as ... as, one not as ... as, its and it's, then read it aloud to someone at home.",
      ],
      frames: [
        "My instrument is called the ___. It's made of ___.",
        "Its ___ is as ___ as ___.",
        "You play it by ___.",
        "It's not as ___ as a ___, but it's ___.",
        "It sounds like ___ and it makes people feel ___.",
      ],
      success: [
        "My writing has 6 to 8 sentences and a name for my instrument.",
        "My writing uses as ... as, not as ... as, its and it's correctly.",
        "My writing helps the reader to imagine the sound.",
      ],
      challenge:
        "Explain why you designed it that way. Give three reasons that link the instrument to its place, for example the materials or the animals that live there.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Emirates Stadium crowd instrument",
          task: "Design an instrument for the Arsenal fans to play together at the Emirates Stadium. Write a paragraph that describes it and the sound of the crowd.",
          steps: [
            "Decide when the instrument will be played, for example when the Gunners score a goal.",
            "Draw it and label three parts (what it is made of, how you play it).",
            "Write a paragraph of 6 to 8 sentences about it.",
            "Include one as ... as, one not as ... as, its and it's, then read it aloud to someone at home.",
          ],
          frames: [
            "My instrument is called the ___. It's made of ___.",
            "Its sound is as ___ as ___.",
            "The fans play it by ___.",
            "It's not as ___ as a ___, but it's ___.",
            "On match day, the stadium sounds as ___ as ___.",
          ],
          success: [
            "My writing has 6 to 8 sentences and a name for my instrument.",
            "My writing uses as ... as, not as ... as, its and it's correctly.",
            "My writing helps the reader to hear the crowd.",
          ],
          challenge:
            "Explain why you designed it that way. Give three reasons that link the instrument to the stadium and the fans, for example how it is carried in, how it is played together and why everybody can join in.",
        },
      },
    ],
  },
};
