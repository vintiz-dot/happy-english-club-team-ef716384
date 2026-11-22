// Oxford Discover 2nd edition, Level 3, Unit 18 (Exploring the Ocean): the unit's
// printable grammar worksheets (three levels each, with answer keys), the quick
// check given in Lesson 4, and the end-of-unit test with its speaking task.
// Everything here is the school's own writing: no text, song or audio from the
// Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: kelp is a tall brown sea plant,
// coral is built by tiny animals, a penguin is a bird that cannot fly, an octopus
// has eight arms and sea otters wrap themselves in kelp so that they do not drift.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U18Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ want to / need to / have to
  {
    id: "od2e-l3-u18-ws-want-need",
    title: "want to, need to, have to",
    grammar: "want to / need to / have to",
    deckId: "od2e-l3-u18-l3",
    slide: "want to, need to, have to",
    intro:
      "want to = I choose it. need to = it is necessary. have to = a rule or no choice. After to, use the plain verb: wants to go, needs to eat, has to wear. In questions and negatives, do / does takes the -s: Does she have to wear goggles?",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "I ___ swim with a dolphin. It is my wish.  (want to / have to)  ->  want to",
        items: [
          { q: "I ___ swim with a dolphin. It is my wish.", options: ["want to", "have to"], answer: "want to" },
          { q: "A diver ___ check her air. It is not safe if she does not.", options: ["needs to", "want to"], answer: "needs to" },
          { q: "We ___ be quiet in the library. It is a rule.", options: ["have to", "want to"], answer: "have to" },
          { q: "She ___ to see a whale.", options: ["wants", "want"], answer: "wants" },
          { q: "He needs to ___ goggles.", options: ["wear", "wears"], answer: "wear" },
          { q: "___ she have to wear goggles?", options: ["Does", "Do"], answer: "Does" },
          { q: "Which sentence is correct?", options: ["I want to go to the beach.", "I want go to the beach."], answer: "I want to go to the beach." },
          { q: "It is hot today. You ___ wear a coat.", options: ["don't have to", "have to"], answer: "don't have to" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing words, or change the sentence as it asks.",
        example: "A diver ___ ___ check the air. (it is necessary)  ->  needs to",
        items: [
          { q: "A diver ___ ___ check the air. (it is necessary)", answer: "needs to" },
          { q: "I ___ ___ see an octopus. (it is my wish)", answer: "want to" },
          { q: "We ___ ___ be quiet in the library. (it is a rule)", answer: "have to" },
          { q: "Make it negative: She wants to swim today.", answer: "She doesn't want to swim today." },
          { q: "Make it a question: Divers have to wear goggles.", answer: "Do divers have to wear goggles?" },
          { q: "Make it a question: He needs to bring a hat.", answer: "Does he need to bring a hat?" },
          { q: "Correct the mistake: She want to see a whale.", answer: "She wants to see a whale." },
          { q: "Correct the mistake: He needs to goes up.", answer: "He needs to go up." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every to, every -s and every do / does.",
        example: "I want to sleep late, but I have to get up early.",
        items: [
          {
            q: "Write the correct forms: 'The explorer (want) to find a new animal, but she (need) to check her air first.'",
            answer: "The explorer wants to find a new animal, but she needs to check her air first.",
          },
          {
            q: "A friend says: 'I don't have to wear a coat' means 'I must not wear a coat.' Is your friend right? Explain.",
            answer: "e.g. No. don't have to means it is not necessary, so you can choose. It does not mean it is forbidden.",
          },
          {
            q: "Find and fix three mistakes: 'My brother want to be a diver. He need to learn to swim. Does he has to wear goggles?'",
            answer: "My brother wants to be a diver. He needs to learn to swim. Does he have to wear goggles?",
          },
          { q: "Write one sentence with want to and one with have to about school. Add a reason with because to one of them.", answer: "e.g. I want to read a new book because I love adventures. We have to wear uniform at school." },
          { q: "Write one sentence that has a wish and a must in it (use but).", answer: "e.g. I don't want to get up early, but I have to." },
          { q: "Write two questions for a partner: one with Do and one with Does, using want to, need to or have to.", answer: "e.g. Do you want to explore the ocean? Does your sister have to go to bed early?" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ although
  {
    id: "od2e-l3-u18-ws-although",
    title: "Joining ideas with although",
    grammar: "although",
    deckId: "od2e-l3-u18-l4",
    slide: "Joining ideas with although",
    intro:
      "although joins two ideas that do not match what we expect: Although the water was freezing, the diver jumped in. and joins ideas that agree. Use although OR but, never both. Put a comma when although begins the sentence.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "___ it was freezing, the diver jumped in.  (Although / And)  ->  Although",
        items: [
          { q: "___ it was freezing, the diver jumped in.", options: ["Although", "And"], answer: "Although" },
          { q: "The water was freezing ___ the diver wore a warm suit. (the two ideas agree)", options: ["and", "although"], answer: "and" },
          { q: "I have never seen a whale ___ I live near the sea.", options: ["although", "and"], answer: "although" },
          { q: "Which sentence is correct?", options: ["Although it was cold, we swam.", "Although it was cold, but we swam."], answer: "Although it was cold, we swam." },
          { q: "Where does the comma go? 'Although it was dark the diver went down.'", options: ["after dark", "after diver"], answer: "after dark" },
          { q: "Which pair of ideas needs although?", options: ["He was hungry. He ate lunch.", "He was hungry. He did not eat."], answer: "He was hungry. He did not eat." },
          { q: "The explorer was tired ___ she kept walking.", options: ["although", "because"], answer: "although" },
          { q: "Which one is NOT a whole sentence by itself?", options: ["Although it was cold.", "It was cold."], answer: "Although it was cold." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the whole sentence. Check the commas.",
        example: "Join with although: It was dark. The diver went down.  ->  Although it was dark, the diver went down.",
        items: [
          { q: "Join with although: It was freezing. The diver jumped in.", answer: "Although it was freezing, the diver jumped in." },
          { q: "Join with although in the middle: The explorer kept going. She was tired.", answer: "The explorer kept going although she was tired." },
          { q: "Finish the sentence with an idea that does not match: Although it was a sunny day, ...", answer: "e.g. Although it was a sunny day, we stayed inside." },
          { q: "Join with and or although: The water was warm. The dolphins were happy.", answer: "The water was warm and the dolphins were happy." },
          { q: "Join with although: It was dark. The diver went down.", answer: "Although it was dark, the diver went down." },
          { q: "Correct the mistake: Although it was cold, but we swam.", answer: "Although it was cold, we swam." },
          { q: "Correct the mistake: We swam. Although it was cold.", answer: "We swam although it was cold." },
          { q: "Correct the comma: Although the diver was nervous she jumped in.", answer: "Although the diver was nervous, she jumped in." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a sentence of your own, so check every although, every comma and every capital letter.",
        example: "Although I like cold weather, I do not like freezing water.",
        items: [
          { q: "Swap the order and keep the meaning: Although I was tired, I kept swimming.", answer: "I kept swimming although I was tired." },
          { q: "Join with although: Penguins are birds. They cannot fly.", answer: "Although penguins are birds, they cannot fly." },
          {
            q: "Find and fix two mistakes: 'Although it was dark but the diver went down. He was not afraid. Although he had never dived.'",
            answer: "Delete but and add a comma: 'Although it was dark, the diver went down.' Join the last part: 'He was not afraid although he had never dived.'",
          },
          { q: "Write one sentence with although about a sea animal.", answer: "e.g. Although the octopus is soft, it is very clever." },
          {
            q: "Write one sentence with and and one with although about the same two ideas: the water is freezing / the diver is happy. Say why the two sentences are different.",
            answer: "e.g. The water is freezing and the diver is happy. (the ideas just go together) Although the water is freezing, the diver is happy. (the happiness is a surprise)",
          },
          {
            q: "A friend writes: 'Although I love the ocean, but I am afraid of sharks.' Rewrite it and say what was wrong.",
            answer: "Although I love the ocean, I am afraid of sharks. (although and but do the same job, so use only one)",
          },
        ],
      },
    ],
  },
];

export const odL3U18Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u18-check",
    title: "Quick check: words and want to / need to / have to",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 18 sea and diving words", "want to / need to / have to"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A person who goes under the water to look, work or explore. Which word?", answer: "diver" },
          { q: "Glasses that keep water out of your eyes. Which word?", answer: "goggles" },
          { q: "A very tall brown sea plant that grows in thick underwater forests. Which word?", answer: "kelp" },
          { q: "Tied to something so you cannot go far. Which word?", answer: "tethered" },
        ],
      },
      {
        title: "Grammar: want to / need to / have to",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, short answer where it does not.",
        marksEach: 1,
        items: [
          { q: "The diver ___ check the air. It is not safe if she does not. (want to / needs to)", options: ["want to", "needs to"], answer: "needs to" },
          { q: "Correct the mistake: She want to see a whale.", answer: "She wants to see a whale." },
          { q: "Make it a question: Divers have to wear goggles.", answer: "Do divers have to wear goggles?" },
          { q: "'I don't have to wear a coat today' means I must not wear one.", options: ["True", "False"], answer: "False" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u18-test",
    title: "Unit 18 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 sea words and words in context: diver, hose, tethered, freezing",
      "Compound nouns",
      "want to / need to / have to",
      "although",
      "Reading: monitor and clarify, an explorer in a kelp forest",
      "Writing: what an explorer wants and needs to do",
      "Speaking: plan an exploration",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each question and write it.",
        marksEach: 1,
        items: [
          { q: "A hard, colourful home built by tiny sea animals.", options: ["coral", "kelp", "squid", "otter"], answer: "coral" },
          { q: "A furry animal that swims and floats on its back.", options: ["otter", "dolphin", "penguin", "octopus"], answer: "otter" },
          { q: "A soft sea animal with eight arms.", options: ["octopus", "humpback whale", "penguin", "kelp"], answer: "octopus" },
          { q: "A black and white bird that swims but cannot fly.", options: ["penguin", "dolphin", "squid", "kelp"], answer: "penguin" },
          { q: "A huge whale that sings and jumps out of the water.", options: ["humpback whale", "leafy sea dragon", "otter", "coral"], answer: "humpback whale" },
          { q: "A person who goes under the water to look, work or explore.", options: ["diver", "hose", "goggles", "kelp"], answer: "diver" },
          { q: "A long bendy tube that carries air or water.", options: ["hose", "goggles", "kelp", "coral"], answer: "hose" },
          { q: "The boat is ___ to the dock with a rope, so it cannot float away.", options: ["tethered", "freezing", "floating", "tall"], answer: "tethered" },
          { q: "The water in the far south is so cold that it can turn to ice. It is ___.", options: ["freezing", "tethered", "soft", "tiny"], answer: "freezing" },
          { q: "sea + weed = ?", options: ["seaweed", "weedsea", "sea weed", "seawed"], answer: "seaweed" },
          { q: "Which word is a compound noun?", options: ["shipwreck", "swim", "freezing", "quickly"], answer: "shipwreck" },
          { q: "A sandcastle is a castle made of ___.", options: ["sand", "stone", "wood", "shells"], answer: "sand" },
        ],
      },
      {
        title: "Grammar: want to / need to / have to",
        skill: "Grammar",
        instructions: "Do what each question asks. Write full sentences when you are asked to write.",
        marksEach: 1,
        items: [
          { q: "I ___ ride a dolphin one day. It is my dream.", options: ["want to", "have to"], answer: "want to" },
          { q: "In the library, we ___ be quiet. It is a rule.", options: ["have to", "want to"], answer: "have to" },
          { q: "A diver ___ check her air before she goes down.", options: ["need to", "needs to"], answer: "needs to" },
          { q: "Rewrite as a question: She has to wear goggles.", answer: "Does she have to wear goggles?" },
          { q: "Correct the mistake: He wants to goes to the beach.", answer: "He wants to go to the beach." },
          { q: "Write one sentence with want to and one with have to about your weekend.", answer: "e.g. I want to play football with my friends. I have to finish my homework." },
        ],
      },
      {
        title: "Grammar: although",
        skill: "Grammar",
        instructions: "Do what each question asks. Check your commas.",
        marksEach: 1,
        items: [
          { q: "___ the water was freezing, the diver jumped in.", options: ["Although", "Because"], answer: "Although" },
          { q: "The water was freezing, ___ the diver wore a warm suit. (the ideas agree)", options: ["and", "although"], answer: "and" },
          { q: "Join with although: It was dark. The explorer went down.", answer: "Although it was dark, the explorer went down." },
          { q: "Correct the mistake: Although it was cold, but we swam.", answer: "Although it was cold, we swam." },
          { q: "Rewrite with although in the middle: Although I was nervous, I jumped in.", answer: "I jumped in although I was nervous." },
          { q: "Write your own sentence with although about an explorer.", answer: "e.g. Although the explorer was afraid, she went down to the coral reef." },
        ],
      },
      {
        title: "Reading: a kelp forest",
        skill: "Reading",
        instructions: "Read the text. If a word is confusing, stop and use the sentence to help you. Then answer the questions.",
        passage:
          "Today a young explorer wants to explore a kelp forest. Kelp is a tall brown sea plant that grows in cold, clear water, and in a thick kelp forest the light is green and gold. The explorer needs to wear a warm suit because the water is freezing, and she has to stay with her partner because that is the diving rule. Although the kelp looks beautiful, it is not easy to swim through. Long leaves touch her arms and she cannot see very far. Then she sees an otter. The otter is floating on its back, wrapped in a long piece of kelp so that it does not drift away. The explorer smiles, although she is very cold. She has never seen an otter in the wild before. Back on the boat, she writes everything in her notebook, because explorers need to remember what they find.",
        marksEach: 1,
        items: [
          { q: "The kelp forest is in warm water.", options: ["True", "False"], answer: "False" },
          { q: "Why does the explorer have to stay with her partner?", options: ["It is the diving rule.", "She is afraid of kelp.", "She wants a friend.", "The water is warm."], answer: "It is the diving rule." },
          { q: "Why does she need to wear a warm suit?", options: ["The water is freezing.", "The kelp is tall.", "The boat is small.", "The otter is cold."], answer: "The water is freezing." },
          { q: "What does the explorer see?", options: ["An otter", "A penguin", "A squid", "A dolphin"], answer: "An otter" },
          { q: "The explorer has seen an otter in the wild many times.", options: ["True", "False"], answer: "False" },
          { q: "Why does the explorer write in her notebook? Answer in one sentence.", answer: "e.g. She writes in her notebook because explorers need to remember what they find." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about an explorer who goes to a place you choose. Say what the explorer wants to do and what he or she needs to take or do. Use want to, need to and one although sentence. Marks (5): a clear first sentence, want to used correctly, need to or have to used correctly, a correct although sentence with a comma, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about an explorer.",
            answer:
              "e.g. An explorer wants to find a leafy sea dragon in the sea near Australia. She needs to take goggles, a camera and a warm suit. She has to dive with a partner because it is the rule. Although the water is cold, she is not afraid. She hopes to write about it in her notebook.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Plan an exploration. Choose a place you want to explore. Talk for about one minute: say where it is, why you want to go there, what you need to take and one thing that is difficult, with although. Then answer two questions from the teacher.",
      prompts: [
        "Where do you want to explore, and why?",
        "What do you need to take with you? Why?",
        "What do you have to do to stay safe?",
        "What is the most exciting thing you hope to find?",
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
            "Uses unit words correctly and naturally (sea life, diver, freezing, tethered, explorer).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the place only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: want to / need to / have to and although",
          bands: [
            "Uses want to, need to or have to correctly more than once and an although sentence that makes sense.",
            "Uses want to and need to correctly at least once; one small slip, such as wants to go or needs to goes.",
            "Tries the structures but with errors (want go, although ... but); needs help to say a full sentence.",
            "No want to, need to or although; uses only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Says where the place is, gives a clear reason for going and explains what is needed, with an example.",
            "Names the place and gives a simple reason and at least one thing to take.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
