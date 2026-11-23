// Oxford Discover 2nd edition, Level 3, Unit 13 (Simple Machines and Inventions):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given in Lesson 4, and the end-of-unit test with its speaking
// task. Everything here is the school's own writing: no text, song or audio from
// the Student Book or Workbook is reproduced, and the reading passage is original.
// Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts are checked: a lever turns on one point, a
// ramp is a slope, a wedge is thick at one end and thin at the other, a screw is
// a ramp wound round a rod, a wheel and axle turns together, and a wheelbarrow
// combines a wheel and axle with a lever. This unit's test sits after Lesson 5 (Grammar Champions);
// the Wrap Up lesson belongs to Unit 14.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U13Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ too / either
  {
    id: "od2e-l3-u13-ws-too-either",
    title: "Agreeing with too and either",
    grammar: "too / either",
    deckId: "od2e-l3-u13-l3",
    slide: "Agreeing with too and either",
    intro:
      "Look at the FIRST sentence. Positive? Agree with too: I do, too. Negative? Agree with either: I don't, either. Use the same helper verb as the first sentence (am, is, do, does, did, can, was).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "My friend likes ramps, and I do, ___.  (too / either)  ->  too",
        items: [
          { q: "My friend likes ramps, and I do, ___.", options: ["too", "either"], answer: "too" },
          { q: "My friend doesn't like loud noises, and I don't, ___.", options: ["too", "either"], answer: "either" },
          { q: "My friend is tired, and I am, ___.", options: ["too", "either"], answer: "too" },
          { q: "My friend can't swim, and I can't, ___.", options: ["too", "either"], answer: "either" },
          { q: "My friend uses a lever, and I ___, too.", options: ["do", "am", "can"], answer: "do" },
          { q: "My friend didn't go to school yesterday, and I ___, either.", options: ["didn't", "don't", "wasn't"], answer: "didn't" },
          { q: "Which sentence is correct?", options: ["I don't like spiders, either.", "I don't like spiders, too."], answer: "I don't like spiders, either." },
          { q: "My friend was happy, and I ___, too.", options: ["was", "did", "am"], answer: "was" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the two missing words. For the last four questions, write the whole sentence.",
        example: "My friend uses a ramp, and I ___ ___.  ->  do, too",
        items: [
          { q: "My friend uses a ramp, and I ___ ___.", answer: "do, too" },
          { q: "My brother can't ride a unicycle, and I ___ ___.", answer: "can't, either" },
          { q: "Mum was tired, and I ___ ___.", answer: "was, too" },
          { q: "My friends didn't go out, and we ___ ___.", answer: "didn't, either" },
          { q: "Agree with this sentence: 'I'm hungry.'", answer: "I am, too." },
          { q: "Agree with this sentence: 'I don't have a screwdriver.'", answer: "I don't, either." },
          { q: "Correct the mistake: I don't like spiders, too.", answer: "I don't like spiders, either." },
          { q: "Correct the mistake: My sister is tall, and I do, too.", answer: "My sister is tall, and I am, too." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Check the first sentence, the helper verb and the last word every time.",
        example: "My dad has a bike, and I ___ ___.  ->  My dad has a bike, and I do, too.",
        items: [
          { q: "Write one whole sentence that agrees with 'My dad has a hammer.' Start with the same words.", answer: "My dad has a hammer, and I do, too." },
          {
            q: "Find and fix three mistakes: 'My friend doesn't like heights, and I don't, too. He is brave, and I do, too. He can climb, and I can't, either.'",
            answer: "I don't, either. / I am, too. / I can, too.",
          },
          { q: "Write two sentences about you and a friend. One uses too and one uses either.", answer: "e.g. My friend likes football, and I do, too. My friend doesn't like spiders, and I don't, either." },
          { q: "Rewrite with also instead of too: 'My friend likes ramps, and I do, too.'", answer: "e.g. My friend likes ramps, and I also like them." },
          { q: "Why can't we say 'I don't, too'? Explain in one or two sentences.", answer: "e.g. The first sentence is negative, so we use either. Too goes with a positive sentence." },
          { q: "Your friend says 'I can't swim.' You can't swim, either. Agree, then add a reason in a second sentence.", answer: "e.g. I can't, either. I am afraid of deep water." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ plural verb after and
  {
    id: "od2e-l3-u13-ws-plural",
    title: "Two subjects with and: use a plural verb",
    grammar: "compound subjects with and",
    deckId: "od2e-l3-u13-l4",
    slide: "Two subjects with and: use a plural verb",
    intro:
      "One subject: one verb (A lever helps us). Two subjects joined by and: a plural verb (A lever and a ramp help us; are; were). Count the subjects before you choose the verb.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right verb. Count the subjects first.",
        example: "A lever and a ramp ___ simple machines.  (is / are)  ->  are",
        items: [
          { q: "A lever and a ramp ___ simple machines.", options: ["is", "are"], answer: "are" },
          { q: "My brother and I ___ at the science fair yesterday.", options: ["was", "were"], answer: "were" },
          { q: "A screw and a wedge ___ people join and cut things.", options: ["help", "helps"], answer: "help" },
          { q: "A pen, a pencil and a ruler ___ on my desk.", options: ["is", "are"], answer: "are" },
          { q: "The seesaw ___ in the playground.", options: ["is", "are"], answer: "is" },
          { q: "The wheel and axle ___ one simple machine.", options: ["is", "are"], answer: "is" },
          { q: "My mum and dad ___ in the kitchen.", options: ["is", "are"], answer: "are" },
          { q: "Which sentence is correct?", options: ["A hammer and a nail is useful.", "A hammer and a nail are useful."], answer: "A hammer and a nail are useful." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing verb, join the sentences or correct the mistake.",
        example: "A knife and a fork ___ tools for eating. (be)  ->  are",
        items: [
          { q: "The slide and the seesaw ___ in the park. (be)", answer: "are" },
          { q: "My friend and I ___ late for school yesterday. (be)", answer: "were" },
          { q: "A saw and an axe ___ wood. (cut)", answer: "cut" },
          { q: "Join the sentences with and: A lever is a simple machine. A ramp is a simple machine.", answer: "A lever and a ramp are simple machines." },
          { q: "Join the sentences with and: Edison was an inventor. Bell was an inventor.", answer: "Edison and Bell were inventors." },
          { q: "Correct the mistake: My dad and my uncle is builders.", answer: "My dad and my uncle are builders." },
          { q: "Correct the mistake: A saw, a hammer and a drill is tools.", answer: "A saw, a hammer and a drill are tools." },
          { q: "Correct the mistake: A screw and a lever helps us.", answer: "A screw and a lever help us." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need a whole sentence of your own.",
        example: "The stairs and the ramp are new.  ->  (past)  The stairs and the ramp were new.",
        items: [
          { q: "Write a sentence about two simple machines. Use and and a plural verb in the present simple.", answer: "e.g. A lever and a wedge help people lift and cut things." },
          { q: "Rewrite in the past: The stairs and the ramp are in the school.", answer: "The stairs and the ramp were in the school." },
          {
            q: "Find and fix two mistakes: 'My brother and I is inventors. A bike and a car is useful.'",
            answer: "My brother and I are inventors. A bike and a car are useful.",
          },
          { q: "Why do we say 'The wheel and axle is one simple machine' but 'A lever and a ramp are simple machines'?", answer: "e.g. A wheel and axle is one machine with a two-part name, so the verb is singular. A lever and a ramp are two different machines, so the verb is plural." },
          { q: "Write one sentence with three subjects and a plural verb.", answer: "e.g. A hammer, a saw and a drill are tools." },
          { q: "Write one sentence with two subjects joined by and, and add too or either at the end of a second sentence that agrees.", answer: "e.g. A slide and a seesaw are fun. A swing and a roundabout are fun, too." },
        ],
      },
    ],
  },
];

export const odL3U13Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check
  {
    id: "od2e-l3-u13-check",
    title: "Quick check: machine words, too and either",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 13 simple machine words", "too and either", "two subjects with and"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "A flat slope that helps you move things up or down. Which word?", answer: "ramp" },
          { q: "A piece that is thick at one end and thin at the other, for cutting or splitting. Which word?", answer: "wedge" },
          { q: "A wheel fixed to a rod so that both turn together. Which word?", answer: "wheel and axle" },
          { q: "A stick or board that turns on one point to lift something. A seesaw is one. Which word?", answer: "lever" },
        ],
      },
      {
        title: "Grammar: too, either and plural verbs",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one word where it does not.",
        marksEach: 1,
        items: [
          { q: "I like machines, and my friend does, ___. (too / either)", answer: "too" },
          { q: "I don't have a bike, and my brother doesn't, ___. (too / either)", answer: "either" },
          { q: "Correct the mistake: A lever and a ramp is simple machines.", answer: "A lever and a ramp are simple machines." },
          { q: "My friend can't swim, and I ___, either. (write the helper)", answer: "can't" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u13-test",
    title: "Unit 13 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 machine and invention words and the five simple machines",
      "Classify and categorize",
      "too and either",
      "Two subjects joined by and: plural verbs",
      "Reading: a short text about a machine",
      "Writing: an invention you use every day",
      "Speaking: how an invention helps us",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "A ___ is a flat slope that helps you move things up.", options: ["lever", "ramp", "wedge", "screw"], answer: "ramp" },
          { q: "You turn a ___ round and round to hold two pieces of wood together.", options: ["screw", "wedge", "ramp", "light bulb"], answer: "screw" },
          { q: "The sharp head of an axe is a ___.", options: ["lever", "ramp", "wedge", "screw"], answer: "wedge" },
          { q: "A seesaw is a kind of ___.", options: ["lever", "ramp", "screw", "wedge"], answer: "lever" },
          { q: "A bicycle has a ___ at the front and at the back.", options: ["wheel and axle", "wedge", "ramp", "screw"], answer: "wheel and axle" },
          { q: "You turn a ___ to open a door.", options: ["doorknob", "light bulb", "axe", "slide"], answer: "doorknob" },
          { q: "A ___ gives light in a room.", options: ["light bulb", "doorknob", "seesaw", "axe"], answer: "light bulb" },
          { q: "In the playground, you go down a ___, a smooth slope.", options: ["slide", "seesaw", "wedge", "screw"], answer: "slide" },
          { q: "Which word means 'to put things into groups that share something'?", options: ["classify", "invent", "repeat", "measure"], answer: "classify" },
        ],
      },
      {
        title: "Grammar: too and either",
        skill: "Grammar",
        instructions: "Choose or write the answer. Look at the first sentence before you decide.",
        marksEach: 1,
        items: [
          { q: "My friend likes pizza, and I do, ___.", options: ["too", "either"], answer: "too" },
          { q: "My friend doesn't like loud noises, and I don't, ___.", options: ["too", "either"], answer: "either" },
          { q: "My friend was late, and I ___, too.", options: ["was", "did", "am"], answer: "was" },
          { q: "Correct the mistake: I don't have a screwdriver, too.", answer: "I don't have a screwdriver, either." },
          { q: "Agree with this sentence. Write a short answer: 'I can't ride a unicycle.'", answer: "I can't, either." },
          { q: "Write one sentence about yourself and a friend. Use too.", answer: "e.g. My friend likes football, and I do, too." },
        ],
      },
      {
        title: "Grammar: two subjects with and",
        skill: "Grammar",
        instructions: "Choose the right verb, or write the sentence. Count the subjects first.",
        marksEach: 1,
        items: [
          { q: "A lever and a wedge ___ simple machines.", options: ["is", "are"], answer: "are" },
          { q: "My mum and my dad ___ at the shops yesterday.", options: ["was", "were"], answer: "were" },
          { q: "Correct the mistake: The slide and the seesaw is in the park.", answer: "The slide and the seesaw are in the park." },
          { q: "Join the sentences with and: A hammer is a tool. A saw is a tool.", answer: "A hammer and a saw are tools." },
          { q: "A screw and a ramp ___ people. (help)", answer: "help" },
          { q: "True or false? 'The wheel and axle is one simple machine' is correct.", options: ["True", "False"], answer: "True" },
        ],
      },
      {
        title: "Reading: a wheelbarrow",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Last Saturday, my grandfather and I worked in the garden. We had to move forty heavy bags of soil from the gate to the back of the garden. My grandfather said, 'Don't carry them. Use the wheelbarrow.' A wheelbarrow is a clever machine because it uses two simple machines. The wheel and axle at the front turns easily, so the load rolls along the ground. The long handles are a lever. When I lift the handles, the wheel is the turning point, and the heavy bags go up without much effort. At first, I did not believe it would help. Then I pushed it, and the job was easy! My grandfather did not carry any bags, and I did not carry any, either. We finished everything in one hour, and then we had a cold drink.",
        marksEach: 1,
        items: [
          { q: "The writer and his grandfather carried the bags by hand.", options: ["True", "False"], answer: "False" },
          { q: "How many simple machines does the wheelbarrow use in this text?", options: ["one", "two", "three"], answer: "two" },
          { q: "Which part of the wheelbarrow is a lever?", options: ["the wheel", "the long handles", "the bags"], answer: "the long handles" },
          { q: "At first, the writer thought the wheelbarrow ...", options: ["would not help", "was broken", "was too heavy"], answer: "would not help" },
          { q: "How long did the job take?", options: ["ten minutes", "one hour", "a whole day"], answer: "one hour" },
          {
            q: "Why was the job easy? Give one reason from the text.",
            answer: "e.g. The wheel and axle turns easily, so the bags roll along the ground. / The handles are a lever, so the bags go up without much effort.",
          },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about an invention you use every day. Say what it is, how it helps you and which simple machine is inside it. Use one sentence with two subjects joined by and and a plural verb, and one sentence with too or either. Marks (5): a clear first sentence, how it helps, a correct and + plural verb sentence, a correct too or either sentence, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Describe an invention you use every day.",
            answer:
              "e.g. The bicycle is an important invention for me. I ride it to school every day. It has a wheel and axle, so it rolls easily. The pedals and the chain work together to move the wheels. My brother rides to school, and I do, too.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Choose an invention that you use or know well. Talk for about one minute: say what it is, how it works, how it helps people and what life would be like without it. Then answer two questions from the teacher.",
      prompts: [
        "Which invention in your home could you not live without? Why?",
        "Which simple machine is inside the invention you chose, and how does it work?",
        "Is your invention necessary or just for fun? Do you agree with your partner?",
        "What would people have to do if it was never invented?",
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
            "Uses unit words correctly and naturally (simple machine names, invention, useful, necessary).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names the invention only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: too / either and plural verbs",
          bands: [
            "Uses too and either correctly, and plural verbs after and, more than once, with the right helper.",
            "Uses too or either correctly at least once; one small slip, such as the wrong helper or a singular verb after and.",
            "Tries too or either but often mixes them up; plural verbs after and are usually wrong.",
            "No too or either; uses only simple present sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Explains what it is, how it works and why it matters, with a reason and an example.",
            "Says what it is and gives one simple reason; some explanation of how it works.",
            "Gives one point only, or a point without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
