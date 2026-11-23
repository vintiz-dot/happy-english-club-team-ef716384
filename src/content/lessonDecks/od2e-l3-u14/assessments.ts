// Oxford Discover 2nd edition, Level 3, Unit 14 (Glass and Clever Ideas): the
// unit's printable grammar worksheets (three levels each, with answer keys), the
// quick check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used: glassblowers shape hot glass that has
// been melted in a furnace, and Murano is an island near Venice in Italy.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U14Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ adverbs
  {
    id: "od2e-l3-u14-ws-adverbs",
    title: "Comparative and superlative adverbs",
    grammar: "faster than / the fastest / more carefully than / the most carefully",
    deckId: "od2e-l3-u14-l3",
    slide: "Comparative and superlative adverbs",
    intro:
      "An adverb tells HOW someone does something. Short adverbs take -er / -est: runs faster than, runs the fastest. Adverbs that end in -ly use more / the most: writes more carefully than, writes the most carefully. Remember: than for two, the for the best. Irregular: well, better, the best.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "A cheetah runs ___ a horse.  (faster than / more fast than)  ->  faster than",
        items: [
          { q: "A cheetah runs ___ a horse.", options: ["faster than", "more fast than"], answer: "faster than" },
          { q: "My sister writes ___ my brother.", options: ["more carefully than", "carefullier than"], answer: "more carefully than" },
          { q: "Of all the drivers, my uncle drives ___.", options: ["the most carefully", "the carefullest"], answer: "the most carefully" },
          { q: "Who gets up ___, you or your brother?", options: ["earlier", "more early"], answer: "earlier" },
          { q: "My grandmother cooks ___ in our family.", options: ["the best", "the goodest"], answer: "the best" },
          { q: "An eagle flies ___ a pigeon.", options: ["higher than", "more high than"], answer: "higher than" },
          { q: "Which sentence is correct?", options: ["She sings more beautifully than me.", "She sings beautifullier than me."], answer: "She sings more beautifully than me." },
          { q: "He plays the piano ___ I do. (I play badly.)", options: ["better than", "gooder than"], answer: "better than" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words. Use the adverb in brackets. For the rewrite and correct questions, write the whole sentence.",
        example: "The tortoise walks ___ the rabbit. (slowly)  ->  more slowly than",
        items: [
          { q: "The tortoise walks ___ ___ ___ the rabbit. (slowly)", answer: "more slowly than" },
          { q: "Of all my cousins, the oldest one works ___ ___. (hard)", answer: "the hardest" },
          { q: "Our teacher speaks ___ ___ ___ our headteacher. (quietly)", answer: "more quietly than" },
          { q: "My mother gets up ___ ___ in our family. (early)", answer: "the earliest" },
          { q: "Rewrite with an adverb: My dad is a better cook than my uncle.", answer: "My dad cooks better than my uncle." },
          { q: "Correct the mistake: My brother runs more fast than me.", answer: "My brother runs faster than me." },
          { q: "Correct the mistake: She writes carefullier than he does.", answer: "She writes more carefully than he does." },
          { q: "Correct the mistake: Our team plays best in the school.", answer: "Our team plays the best in the school." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every more, every the and every ending.",
        example: "A cheetah runs fast. A lion runs fast, but a cheetah runs faster.  ->  A cheetah runs faster than a lion.",
        items: [
          {
            q: "A cheetah runs very fast, a lion runs fast and a hen runs slowly. Write one sentence with a comparative adverb and one with a superlative adverb.",
            answer: "e.g. A lion runs faster than a hen. A cheetah runs the fastest of the three.",
          },
          {
            q: "Find and fix three mistakes: 'My father drives more careful than my mother. My uncle drives most slowly of all. My aunt drives the goodest.'",
            answer: "more carefully than; the most slowly of all; the best.",
          },
          { q: "Explain the difference: 'He is faster than me' and 'He runs faster than me'.", answer: "e.g. The first compares what he is (an adjective, fast). The second compares what he does (the action of running, an adverb)." },
          { q: "Write two sentences about people at home. One uses an -ly adverb with more. The other uses an irregular adverb (better or worse).", answer: "e.g. My brother cooks more carefully than my father. My mother sings better than I do." },
          { q: "Why do we say 'more carefully' and not 'carefullier'? Answer in one sentence.", answer: "e.g. Adverbs that end in -ly are long, so we put more before them and do not change the word." },
          { q: "Write a true sentence about you, a friend and a family member. Use the + a superlative adverb and a reason with because.", answer: "e.g. In my family, my grandfather walks the most slowly because his knees hurt." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ before and after
  {
    id: "od2e-l3-u14-ws-before-after",
    title: "before and after",
    grammar: "before / after",
    deckId: "od2e-l3-u14-l4",
    slide: "before and after",
    intro:
      "before = earlier than another thing; after = later. At the start of a sentence, put a comma after the opening part: 'Before the phone was invented, people wrote letters.' Use the past tense for the past, and used to for a habit that has stopped.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle before or after, or the right form. Then read the whole sentence aloud.",
        example: "___ the light bulb was invented, people used candles.  (Before / After)  ->  Before",
        items: [
          { q: "___ the light bulb was invented, people used candles.", options: ["Before", "After"], answer: "Before" },
          { q: "___ cars were invented, people could travel far in a day.", options: ["Before", "After"], answer: "After" },
          { q: "___ I eat dinner, I wash my hands.", options: ["Before", "After"], answer: "Before" },
          { q: "___ school, I go home and play.", options: ["Before", "After"], answer: "After" },
          { q: "Which sentence is correct?", options: ["Before the phone was invented, people wrote letters.", "Before the phone was invented people wrote letters."], answer: "Before the phone was invented, people wrote letters." },
          { q: "___ I brushed my teeth, I went to bed. (I brushed my teeth first.)", options: ["Before", "After"], answer: "After" },
          { q: "Before the clock was invented, people ___ the sun to tell the time.", options: ["used", "use"], answer: "used" },
          { q: "'After lunch, we played football.' Which happened first?", options: ["Lunch", "Football"], answer: "Lunch" },
        ],
      },
      {
        level: "Core",
        instructions: "Write before or after in each gap, or write the sentence as asked.",
        example: "___ the car was invented, people travelled by horse.  ->  Before",
        items: [
          { q: "___ the car was invented, people travelled by horse.", answer: "Before" },
          { q: "___ electric lights were invented, we could read in the evening.", answer: "After" },
          { q: "___ I cleaned my teeth, I put on my pyjamas. (Teeth first.)", answer: "After" },
          { q: "Join the ideas, starting with Before: I do my homework. Then I play.", answer: "Before I play, I do my homework." },
          { q: "Join the ideas, starting with After: We ate lunch. Then we played outside.", answer: "After we ate lunch, we played outside." },
          { q: "Correct the mistake: Before phones were invented people wrote letters.", answer: "Before phones were invented, people wrote letters." },
          { q: "Correct the mistake: Before the clock was invented, people use the sun to tell the time.", answer: "Before the clock was invented, people used the sun to tell the time." },
          { q: "Finish the sentence with a habit that has stopped: Before the light bulb was invented, people used to ...", answer: "e.g. Before the light bulb was invented, people used to use candles in the evening." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Read carefully. Some answers need a sentence of your own.",
        example: "Before the phone, people wrote letters.  ->  After the phone, people could talk at once.",
        items: [
          {
            q: "Find and fix three mistakes: 'Before the fridge was invented people used to keep food in cold cellars. After the fridge is invented, food stays fresh longer. People use to buy food every day, but now they shop once a week.'",
            answer: "a comma after invented; was invented; used to buy.",
          },
          { q: "Write two sentences about the phone. The first starts with Before and uses used to. The second starts with After.", answer: "e.g. Before the phone was invented, people used to write letters. After it was invented, people could talk at once." },
          { q: "Why is 'After I went home before I ate' confusing? Explain in one sentence.", answer: "e.g. It has two time words and no comma, so we cannot tell which thing happened first." },
          { q: "Write a sentence with before about your day, not about an invention.", answer: "e.g. Before I leave for school, I pack my bag." },
          { q: "Write about a change in your own life: one sentence with used to and one with after.", answer: "e.g. I used to be afraid of dogs. After we got a puppy, I loved them." },
          { q: "Rewrite so it starts with After and keeps the same meaning: Before the glassblower opened the furnace, he put on gloves.", answer: "After the glassblower put on gloves, he opened the furnace." },
        ],
      },
    ],
  },
];

export const odL3U14Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u14-check",
    title: "Quick check: glass words and adverbs",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 14 glass and glassmaking words", "comparative and superlative adverbs"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A person who makes things from hot glass. Which word?", answer: "glassblower" },
          { q: "A very hot oven that melts glass or metal. Which word?", answer: "furnace" },
          { q: "Glasses that help you see better. Which word?", answer: "eyeglasses" },
          { q: "A room where people make or fix things. Which word?", answer: "workshop" },
        ],
      },
      {
        title: "Grammar: adverbs",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: A cheetah runs ___ a dog. (fast)", answer: "faster than" },
          { q: "Complete: My mother cooks ___ in our family. (well)", answer: "the best" },
          { q: "Correct the mistake: She writes carefullier than me.", answer: "She writes more carefully than me." },
          { q: "'My brother runs the fastest' means he is first of three or more people.", options: ["True", "False"], answer: "True" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u14-test",
    title: "Unit 14 test",
    kind: "summative",
    afterLesson: 6,
    minutes: 45,
    covers: [
      "The 10 glass words: glass, glassblower, workshop, furnace, vase, pitcher, glassware, eyeglasses, frames, wire",
      "Words in context: delicate, bumped, pounded, footsteps",
      "Comparative and superlative adverbs",
      "before and after",
      "Suffixes -ful and -less",
      "Reading: a glassblower's workshop",
      "Writing: an invention that changed life",
      "Speaking: how an invention changed life",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Write the word for each meaning. Choose from the options where they are given.",
        marksEach: 1,
        items: [
          { q: "A person who makes things from hot glass.", answer: "glassblower" },
          { q: "A very hot oven that melts glass or metal.", answer: "furnace" },
          { q: "A room where people make or fix things.", answer: "workshop" },
          { q: "A pot for holding flowers.", options: ["vase", "pitcher", "frames"], answer: "vase" },
          { q: "A jug for pouring water or juice.", options: ["vase", "pitcher", "wire"], answer: "pitcher" },
          { q: "Glasses that help you see better.", answer: "eyeglasses" },
          { q: "The parts of eyeglasses that hold the glass in place.", options: ["frames", "furnace", "glassware"], answer: "frames" },
          { q: "A thin piece of metal that bends easily.", options: ["wire", "glass", "vase"], answer: "wire" },
          { q: "Things made of glass, like cups and bowls.", answer: "glassware" },
          { q: "Which word means 'easy to break, so you must be gentle'?", options: ["delicate", "pounded", "bumped"], answer: "delicate" },
        ],
      },
      {
        title: "Grammar: comparative and superlative adverbs",
        skill: "Grammar",
        instructions: "Choose the right words, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "A cheetah runs ___ a horse.", options: ["faster than", "more fast than"], answer: "faster than" },
          { q: "My sister draws ___ my brother.", options: ["more carefully than", "carefullier than"], answer: "more carefully than" },
          { q: "In our class, my cousin jumps ___.", options: ["the highest", "highest"], answer: "the highest" },
          { q: "Correct the mistake: He sings gooder than me.", answer: "He sings better than me." },
          { q: "Correct the mistake: My grandfather walks more slow than my father.", answer: "My grandfather walks more slowly than my father." },
          { q: "Write a sentence with the most + an -ly adverb about a person in your family.", answer: "e.g. My aunt speaks the most quietly in our family." },
        ],
      },
      {
        title: "Grammar: before and after",
        skill: "Grammar",
        instructions: "Choose before or after, or correct the mistake.",
        marksEach: 1,
        items: [
          { q: "___ the light bulb was invented, people used candles.", options: ["Before", "After"], answer: "Before" },
          { q: "___ phones were invented, people could talk to each other at once.", options: ["Before", "After"], answer: "After" },
          { q: "___ I had breakfast, I brushed my teeth. (Teeth first.)", options: ["Before", "After"], answer: "After" },
          { q: "Correct the mistake: Before the clock was invented people used the sun.", answer: "Before the clock was invented, people used the sun." },
          { q: "Correct the mistake: After the car was invented, people travel faster.", answer: "After the car was invented, people travelled faster." },
          { q: "Write a sentence with Before and used to about life long ago.", answer: "e.g. Before cars were invented, people used to travel by horse." },
        ],
      },
      {
        title: "Grammar: -ful and -less",
        skill: "Grammar",
        instructions: "Choose the right word, or write the word with -ful or -less.",
        marksEach: 1,
        items: [
          { q: "A person who has no fear is ___.", options: ["fearless", "fearful"], answer: "fearless" },
          { q: "Something that can hurt you is ___.", options: ["harmful", "harmless"], answer: "harmful" },
          { q: "Add -ful or -less: A pen with no use is use___.", answer: "useless" },
          { q: "Add -ful or -less: Be care___ with the hot glass! (full of care)", answer: "careful" },
          { q: "Add -ful or -less: A care___ driver does not look at the road. (without care)", answer: "careless" },
          { q: "Explain in your own words what -less means.", answer: "e.g. -less means without something, for example harmless means without harm." },
        ],
      },
      {
        title: "Reading: a glassblower's workshop",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Sofia's grandfather is a glassblower. His workshop is at the back of a small shop in Murano, an island near Venice in Italy. Every morning he lights the furnace, and by ten o'clock it is hot enough to melt the glass. Before he starts, he always puts on thick gloves and safety glasses, because hot glass can burn him. He works very carefully, because a vase can break if he blows too hard. Sofia loves to watch him. He turns the pipe slowly, and the glass grows into a round, shining shape. Long ago, glassblowers worked without electric lights, so they used to work only in the daytime. Now the workshop has bright lamps and a fan, and the work is safer. After he finishes a vase, the grandfather leaves it to cool overnight. Sofia thinks this is the hardest part, because she wants to hold it at once!",
        marksEach: 1,
        items: [
          { q: "The workshop is in Murano.", options: ["True", "False"], answer: "True" },
          { q: "The grandfather puts on thick gloves before he starts.", options: ["True", "False"], answer: "True" },
          { q: "Long ago, glassblowers worked at night.", options: ["True", "False"], answer: "False" },
          { q: "Why does he work very carefully?", options: ["A vase can break if he blows too hard.", "The furnace is cold.", "Sofia is asleep."], answer: "A vase can break if he blows too hard." },
          { q: "What happens after he finishes a vase?", options: ["He leaves it to cool overnight.", "He sells it at once.", "He puts it in the furnace again."], answer: "He leaves it to cool overnight." },
          { q: "Why does Sofia think waiting is the hardest part? Answer in your own words.", answer: "e.g. She wants to hold the vase at once, but it is too hot and has to cool first." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about an invention that changed life. Say what life was like before it and after it. Use before or after, one comparative or superlative adverb, and one word with -ful or -less. Marks (5): a clear first sentence, life before and after with the right tense and comma, a correct adverb sentence, a -ful or -less word, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about an invention that changed life.",
            answer:
              "e.g. The light bulb is a very useful invention. Before it was invented, people used candles and went to bed early. After it was invented, they could read and work in the evening. A light bulb shines more brightly than a candle, and it is not as harmful to the eyes.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose one invention. Talk for about one minute: say what it is, what life was like before it and after it, who or what does something better with it, and whether you think it is a useful invention. Then answer two questions from the teacher.",
      prompts: [
        "How did people do this before the invention? What did they use to do?",
        "Does the invention work faster or more carefully than the old way? How do you know?",
        "Is there a problem with the invention? What is a good solution?",
        "Would you choose this invention for a commercial? Why or why not?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks smoothly for about a minute; short pauses only to think; easy to follow.",
            "Mostly smooth; a few pauses or restarts but keeps going without help.",
            "Many pauses; speaks in short pieces; needs a prompt once or twice.",
            "Very hesitant; single words or very short phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses unit words correctly and naturally (invention, glass words, -ful and -less words).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the invention only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: adverbs, before / after, used to",
          bands: [
            "Uses a comparative or superlative adverb, before or after and used to correctly, more than once.",
            "Uses at least two of these correctly; one small slip, such as more fast or a missing the.",
            "Tries them but with errors (carefullier, before without a past tense); only one is used.",
            "None of them; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Shows clearly how life changed and gives an opinion with a reason and an example.",
            "Shows one change and gives a simple reason.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
