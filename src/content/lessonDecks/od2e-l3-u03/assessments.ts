// Oxford Discover 2nd edition, Level 3, Unit 3 (Why do people move to new places?):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. This unit teaches can / could and but; its test
// sits after Lesson 5, the Grammar Champions lesson, the unit's last (the Wrap Up lesson belongs to Unit 4).
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U3Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ can / could
  {
    id: "od2e-l3-u03-ws-can-could",
    title: "Can for now, could for before",
    grammar: "can / could / couldn't",
    deckId: "od2e-l3-u03-l3",
    slide: "Can for now, could for before",
    intro:
      "Can is for NOW. Could is for BEFORE. Couldn't means you were not able to do it before. After can or could, use the plain verb: can swim, could swim (never can swims, could swam).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "Now I ___ ice skate.  (can / could)  ->  can",
        items: [
          { q: "Now I ___ ice skate. I learned last winter.", options: ["could", "can"], answer: "can" },
          { q: "When I was a baby, I ___ walk.", options: ["couldn't", "could"], answer: "couldn't" },
          { q: "Yesterday I ___ ride my bike to school.", options: ["can", "could"], answer: "could" },
          { q: "Now my little cousin ___ read long books.", options: ["can", "could"], answer: "can" },
          { q: "My grandfather ___ run very fast when he was young.", options: ["can", "could"], answer: "could" },
          { q: "Last year I ___ speak much English, but now I can.", options: ["can't", "couldn't", "could"], answer: "couldn't" },
          { q: "Which sentence is about now?", options: ["I can sing.", "I could sing."], answer: "I can sing." },
          { q: "Which sentence is correct?", options: ["She can swims.", "She can swim."], answer: "She can swim." },
        ],
      },
      {
        level: "Core",
        instructions: "Write can, could, couldn't or can't. For the last four questions, write the whole sentence.",
        example: "When I was two, I ___ read.  ->  couldn't",
        items: [
          { q: "When I was two, I ___ read.", answer: "couldn't" },
          { q: "Now I ___ read long stories.", answer: "can" },
          { q: "Last year my cousin ___ swim, but now she ___.", answer: "couldn't, can" },
          { q: "Correct the mistake: Yesterday I can ride my bike.", answer: "Yesterday I could ride my bike." },
          { q: "Correct the mistake: She can swims very well.", answer: "She can swim very well." },
          { q: "Correct the mistake: I didn't could go to the party.", answer: "I couldn't go to the party." },
          { q: "Write the question: (you / swim / when you were five)", answer: "Could you swim when you were five?" },
          { q: "Answer with a short answer (no): 'Could you ride a bike when you were three?'", answer: "No, I couldn't." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the time (now or before) and the verb after can or could every time.",
        example: "Last year I couldn't dive. Now I can.  ->  Last year I couldn't dive, but now I can.",
        items: [
          { q: "Write two sentences about you: one with couldn't (before) and one with can (now).", answer: "e.g. When I was five, I couldn't read English. Now I can read short stories." },
          { q: "Join with but: 'Last year I couldn't dive. Now I can dive.'", answer: "Last year I couldn't dive, but now I can dive." },
          {
            q: "Find and fix three mistakes: 'When I was young, I can't ride a bike. Now I could ride it. My brother can runs fast.'",
            answer: "I couldn't ride a bike. / Now I can ride it. / My brother can run fast.",
          },
          { q: "Why do we say 'I could swim yesterday' and not 'I can swim yesterday'?", answer: "e.g. Yesterday is before now, so we use could. Can is only for now." },
          { q: "Write a polite question that asks a teacher for help. Use could.", answer: "e.g. Could you help me with this word, please?" },
          { q: "Write three sentences about a grandparent when he or she was young. Use could and couldn't.", answer: "e.g. My grandmother could climb trees. She couldn't use a computer. She could cook for ten people." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ but
  {
    id: "od2e-l3-u03-ws-but",
    title: "Joining different ideas with but",
    grammar: "but",
    deckId: "od2e-l3-u03-l4",
    slide: "Joining different ideas with but",
    intro:
      "But joins two ideas that are DIFFERENT. Put a comma before but: I could swim, but I couldn't dive. Each part has its own subject and verb. Use and when the two ideas are the same kind.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the whole sentence aloud.",
        example: "I like sledding, ___ I don't like cold hands.  (but / and)  ->  but",
        items: [
          { q: "I like sledding, ___ I don't like cold hands.", options: ["but", "and"], answer: "but" },
          { q: "I like ice cream ___ I like chocolate, too.", options: ["but", "and"], answer: "and" },
          { q: "I couldn't ride a bike last year, ___ now I can.", options: ["but", "and"], answer: "but" },
          { q: "My brother likes fishing, ___ my sister likes dancing.", options: ["and", "but"], answer: "but" },
          { q: "The red box is heavy, ___ the blue box is light.", options: ["but", "and"], answer: "but" },
          { q: "We packed the books ___ we packed the toys.", options: ["but", "and"], answer: "and" },
          { q: "Which sentence is correct?", options: ["I like apples, but I don't like pears.", "I like apples but, I don't like pears."], answer: "I like apples, but I don't like pears." },
          { q: "I have a bike, ___ I don't have a helmet.", options: ["and", "but"], answer: "but" },
        ],
      },
      {
        level: "Core",
        instructions: "Join the two sentences with but, or correct the mistake. Remember the comma.",
        example: "I like winter. I don't like raking leaves.  ->  I like winter, but I don't like raking leaves.",
        items: [
          { q: "Join with but: I like winter. I don't like raking leaves.", answer: "I like winter, but I don't like raking leaves." },
          { q: "Join with but: I could swim last year. I couldn't dive.", answer: "I could swim last year, but I couldn't dive." },
          { q: "Join with but: Now I can ice skate. Last year I couldn't.", answer: "Now I can ice skate, but last year I couldn't." },
          { q: "Correct the mistake: I like tea but, I don't like coffee.", answer: "I like tea, but I don't like coffee." },
          { q: "Correct the mistake: I like fishing. But I don't like worms.", answer: "I like fishing, but I don't like worms." },
          { q: "Finish the sentence: The park is big, but ___.", answer: "e.g. The park is big, but it is very quiet." },
          { q: "Write a sentence with but about two things you can do now.", answer: "e.g. I can play the guitar, but I can't play the piano." },
          { q: "Write a sentence with but about your classroom.", answer: "e.g. Our classroom is small, but it is bright." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check whether the two ideas are different, and look at the comma every time.",
        example: "My old town was big. My new town is small.  ->  My old town was big, but my new town is small.",
        items: [
          { q: "Write one sentence with but about moving to a new town: one good thing and one hard thing.", answer: "e.g. I like my new town, but I miss my old friends." },
          {
            q: "Find and fix two mistakes: 'My old town was big but, my new town is small. I like it but I miss my friends.'",
            answer: "My old town was big, but my new town is small. / I like it, but I miss my friends.",
          },
          { q: "Why is 'I like pizza, but I like pasta' a strange sentence? Fix it.", answer: "e.g. Both ideas are the same kind (I like), so use and: I like pizza, and I like pasta. / I like pizza, but I don't like pasta." },
          { q: "Write one sentence with but that has can and could in it.", answer: "e.g. When I was small, I could climb trees, but now I can't climb very high." },
          { q: "Join with but and add a reason with because: 'I like my new town. I miss my old school.'", answer: "e.g. I like my new town, but I miss my old school because my best friends are there." },
          { q: "Write three sentences about two towns. Use but in at least two of them.", answer: "e.g. The old town is hot, but the new town is cold. The old town has a beach. The new town doesn't have a beach, but it has a big hill." },
        ],
      },
    ],
  },
];

export const odL3U3Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u03-check",
    title: "Quick check: moving words, can and could",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 3 moving and activity words", "can and could", "but"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "Going to live in a new home. Which word?", answer: "moving" },
          { q: "Putting your things into boxes and bags. Which word?", answer: "packing" },
          { q: "Sliding down a snowy hill on a sled. Which word?", answer: "sledding" },
          { q: "Not tied. Which word?", answer: "untied" },
        ],
      },
      {
        title: "Grammar: can, could and but",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one word where it does not.",
        marksEach: 1,
        items: [
          { q: "When I was a baby, I ___ walk. (could / couldn't)", answer: "couldn't" },
          { q: "Now I ___ write in English. (can / could)", answer: "can" },
          { q: "Correct the mistake: Yesterday I can ride my bike.", answer: "Yesterday I could ride my bike." },
          { q: "I like snow, ___ I don't like cold hands. (but / because)", answer: "but" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u03-test",
    title: "Unit 3 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 moving and activity words, the un- words and the four words from the letters",
      "Sequence of events",
      "can and could",
      "but",
      "Reading: a short text about a move",
      "Writing: why people move to my town",
      "Speaking: why people move and how feelings change",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "We are ___ all our books into boxes today.", options: ["dancing", "fishing", "packing", "sledding"], answer: "packing" },
          { q: "In fall, we use a rake for ___ in the yard.", options: ["raking leaves", "throwing snowballs", "ice skating", "shopping"], answer: "raking leaves" },
          { q: "You can go ___ down a snowy hill on a sled.", options: ["fishing", "dancing", "packing", "sledding"], answer: "sledding" },
          { q: "We say hello to the people who live near us. We are ___.", options: ["ice skating", "meeting neighbors", "moving boxes", "shopping"], answer: "meeting neighbors" },
          { q: "A ___ is a child in the same class as you.", options: ["surgeon", "monsoon", "classmate", "curry"], answer: "classmate" },
          { q: "The ___ is the rainy season with heavy rain and strong winds.", options: ["monsoon", "curry", "surgeon", "classmate"], answer: "monsoon" },
          { q: "My plug is not in the wall. The lamp is ___.", options: ["untied", "uncovered", "unwrapped", "unplugged"], answer: "unplugged" },
          { q: "Her shoelace came ___, so she stopped to tie it again.", options: ["unplugged", "untied", "unwrapped", "uncovered"], answer: "untied" },
          { q: "The prefix un- at the start of a word gives it the ___ meaning.", options: ["same", "past", "opposite", "plural"], answer: "opposite" },
        ],
      },
      {
        title: "Grammar: can and could",
        skill: "Grammar",
        instructions: "Choose or write the answer. Ask yourself: is it about now, or about before?",
        marksEach: 1,
        items: [
          { q: "When I was one, I ___ walk. I was too small.", options: ["can", "could", "couldn't"], answer: "couldn't" },
          { q: "Now I ___ ride a bike to school.", options: ["can", "could", "couldn't"], answer: "can" },
          { q: "Last summer my cousin ___ swim, but now she swims every day.", options: ["can't", "couldn't", "can"], answer: "couldn't" },
          { q: "Correct the mistake: He can plays the guitar.", answer: "He can play the guitar." },
          { q: "Finish the sentence with a short answer: 'I couldn't ice skate last year, but now ___.'", answer: "I can" },
          { q: "Write one sentence about you now with can and one about you before with could or couldn't.", answer: "e.g. I can read long stories now. When I was five, I couldn't read in English." },
        ],
      },
      {
        title: "Grammar: but",
        skill: "Grammar",
        instructions: "Choose the right word, join the sentences or correct the mistake. Remember the comma before but.",
        marksEach: 1,
        items: [
          { q: "I like winter, ___ I don't like the cold wind.", options: ["but", "and"], answer: "but" },
          { q: "We packed the plates ___ we packed the cups.", options: ["but", "and"], answer: "and" },
          { q: "Join with but: Our old street was noisy. Our new street is quiet.", answer: "Our old street was noisy, but our new street is quiet." },
          { q: "Correct the mistake: I like fishing but, I don't like worms.", answer: "I like fishing, but I don't like worms." },
          { q: "Join with but: I could skate last winter. I couldn't skate backwards.", answer: "I could skate last winter, but I couldn't skate backwards." },
          { q: "Write one sentence about a new place. Use but.", answer: "e.g. The new town is big, but it has many parks." },
        ],
      },
      {
        title: "Reading: a family moves",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "My cousin lives in a small town by the sea now. Last spring, her parents got new jobs at the hospital there, so the family packed their boxes and moved. First, they sold their old sofa. Then they put everything into a big truck. The drive took two days. At first, my cousin could not make friends, because the school was new and she did not know anyone. But she joined the swimming club. After one month, she could swim fifty meters, and she had five new friends. Now she loves her new town, but she still misses her old street. Last week she sent me a letter. 'Come and visit in the summer,' she wrote. 'We can swim in the sea every day!'",
        marksEach: 1,
        items: [
          { q: "Why did the family move?", options: ["to be near the sea", "to find a bigger school", "for new jobs at the hospital"], answer: "for new jobs at the hospital" },
          { q: "What did the family do FIRST?", options: ["They sold their old sofa.", "They put everything into a truck.", "They drove for two days."], answer: "They sold their old sofa." },
          { q: "At first, my cousin could not make friends.", options: ["True", "False"], answer: "True" },
          { q: "What did she do to make friends?", options: ["She wrote a letter.", "She joined the swimming club.", "She sold her sofa."], answer: "She joined the swimming club." },
          { q: "Which sentence is true about NOW?", options: ["She has no friends.", "She hates the school.", "She loves the town but misses her old street."], answer: "She loves the town but misses her old street." },
          {
            q: "How did her feelings change from the beginning to now? Answer in one or two sentences.",
            answer: "e.g. At first she could not make friends because she did not know anyone. Now she has friends and loves the town, but she still misses her old street.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about why people move to your town (or a town you know well). Say two reasons, one thing people can do there, and one sentence about what was different before, with could or couldn't. Use but once. Marks (5): a clear first sentence, two reasons, a correct can sentence, a correct could / couldn't sentence with but, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about why people move to a town.",
            answer:
              "e.g. Many people move to Lakeside because it has good schools and a big hospital. Some move for jobs in the new factory. You can skate on the lake in winter. When I lived in the village, I couldn't walk to a library, but now I can walk to three.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about one minute about a move: a move you know or an invented one. Say why people move, what happens first, second and third, and how the feelings change. Then answer two questions from the teacher.",
      prompts: [
        "Why do people move to new places? Give two reasons.",
        "What could you do in your old place that you can't do in a new one? What can you do now that you couldn't before?",
        "Would you like to move to a new place? Why, or why not?",
        "Could you help me? Ask the teacher politely for help with a word.",
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
            "Uses unit words correctly and naturally (moving, packing, neighbors, jobs, classmate, un- words).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the topic only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: can / could and but",
          bands: [
            "Uses can, could and couldn't correctly for now and before, and joins ideas with but, more than once.",
            "Uses can or could correctly at least once; one small slip, such as can in a sentence about before.",
            "Tries can and could but often mixes them up; but is missing or used for ideas that are the same.",
            "No can or could; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains why people move, tells events in order and shows how feelings change, with a reason and an example.",
            "Gives a reason for moving and tells some events in order; one simple idea about feelings.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
