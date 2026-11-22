// Reach Higher 3B, Unit 5 (Mysteries of Matter): printable grammar worksheets in
// three levels with answer keys. The school's own writing. Each follows the exact
// title of the grammar slide it belongs to.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U5Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u5-ws-adjectives",
    title: "-ed / -ing adjectives and adjective order",
    grammar: "-ed / -ing adjectives; adjective order",
    deckId: "rh-l3-u5-l1",
    slide: "-ed / -ing adjectives and adjective order",
    intro:
      "-ing describes the thing that causes a feeling (a boring film); -ed describes the person who has the feeling (I am bored). With several adjectives the usual order is opinion, size, age, shape, colour, material, then the noun: a beautiful small old round white wooden box.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "The experiment was (interesting / interested).  ->  interesting",
        items: [
          { q: "The science show was very ___.", options: ["amazing", "amazed"], answer: "amazing" },
          { q: "I am ___ in melting and freezing.", options: ["interesting", "interested"], answer: "interested" },
          { q: "The children were ___ by the magic trick.", options: ["surprised", "surprising"], answer: "surprised" },
          { q: "It was a ___ lesson. Everyone fell asleep.", options: ["bored", "boring"], answer: "boring" },
          { q: "She has a ___ bag.", options: ["small red leather", "leather red small"], answer: "small red leather" },
          { q: "He gave me a ___ box.", options: ["wooden big old", "big old wooden"], answer: "big old wooden" },
          { q: "I felt ___ when the ice melted so fast.", options: ["excited", "exciting"], answer: "excited" },
          { q: "We saw a ___ cat.", options: ["lovely little grey", "grey little lovely"], answer: "lovely little grey" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the correct form of the adjective in brackets, or put the adjectives in the right order.",
        example: "The film was (frighten) ___.  ->  frightening",
        items: [
          { q: "The result of the test was (surprise) ___.", answer: "surprising" },
          { q: "I was (confuse) ___ by the instructions.", answer: "confused" },
          { q: "It was a (tiring) day, so we were all (tire) ___.", answer: "tired" },
          { q: "The (shock) ___ news made everyone quiet.", answer: "shocking" },
          { q: "Put in order: a / round / glass / small / bottle", answer: "a small round glass bottle" },
          { q: "Put in order: wooden / a / table / old / big", answer: "a big old wooden table" },
          { q: "Put in order: white / lovely / a / cup / plastic", answer: "a lovely white plastic cup" },
          { q: "Put in order: metal / new / a / long / spoon", answer: "a long new metal spoon" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Find and correct the mistake, or write a sentence of your own.",
        example: "I am boring in this lesson.  ->  I am bored in this lesson.",
        items: [
          { q: "Correct the mistake: The results were disappointed, so the students felt disappointing.", answer: "The results were disappointing, so the students felt disappointed." },
          { q: "Correct the mistake: She wore a silk red beautiful scarf.", answer: "She wore a beautiful red silk scarf." },
          { q: "Correct the mistake: My grandfather told an amazed story about the ice.", answer: "My grandfather told an amazing story about the ice." },
          { q: "Write a sentence about a science lesson with one -ed adjective and one -ing adjective.", answer: "e.g. I was excited because the experiment was amazing." },
          { q: "Write a sentence with three adjectives in the right order describing something in your kitchen.", answer: "e.g. I have a small round steel pan." },
          { q: "Explain in one sentence why we say 'I am tired' but 'a tiring day'.", answer: "-ed describes how a person feels; -ing describes the thing that causes the feeling." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u5-ws-past-continuous",
    title: "Past continuous with when and while",
    grammar: "past continuous; when / while",
    deckId: "rh-l3-u5-l3",
    slide: "Past continuous with when and while",
    intro:
      "Use was / were + verb-ing for an action in progress in the past: I was reading. When a short action interrupts it, use the past simple for the short action: I was reading when the lights went out. While joins two long actions or starts the long one: While I was reading, my brother was cooking.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "At eight o'clock I ___ (was reading / read).  ->  was reading",
        items: [
          { q: "At six o'clock, we ___ dinner.", options: ["were having", "had"], answer: "were having" },
          { q: "She ___ TV when the phone rang.", options: ["was watching", "watched"], answer: "was watching" },
          { q: "They ___ football when it started to rain.", options: ["were playing", "was playing"], answer: "were playing" },
          { q: "I was cooking ___ my sister was studying.", options: ["while", "when"], answer: "while" },
          { q: "He was walking home ___ he saw a rainbow.", options: ["when", "while"], answer: "when" },
          { q: "The ice cream ___ when I took it out.", options: ["was melting", "were melting"], answer: "was melting" },
          { q: "What ___ you doing at nine o'clock?", options: ["were", "was"], answer: "were" },
          { q: "While we ___ lunch, the lights went out.", options: ["were eating", "ate"], answer: "were eating" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the correct form.",
        example: "I (read) ___ when the phone rang.  ->  was reading",
        items: [
          { q: "My dad (cook) ___ when I got home.", answer: "was cooking" },
          { q: "They (not / watch) ___ TV; they were doing homework.", answer: "were not watching" },
          { q: "While she (draw) ___, her brother was singing.", answer: "was drawing" },
          { q: "The water (boil) ___ when I added the rice.", answer: "was boiling" },
          { q: "I was walking to school when I (see) ___ a lost puppy.", answer: "saw" },
          { q: "What (you / do) ___ when the storm started?", answer: "were you doing" },
          { q: "The students (do) ___ the experiment when the teacher came in.", answer: "were doing" },
          { q: "I (not / listen) ___ when she told me the answer.", answer: "was not listening" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Join, correct or write. Check every verb form.",
        example: "I was cooking. The lights went out. (when)  ->  I was cooking when the lights went out.",
        items: [
          { q: "Join with while: My mum was cooking. My dad was washing the car.", answer: "While my mum was cooking, my dad was washing the car." },
          { q: "Join with when: I was crossing the road. A bike nearly hit me.", answer: "I was crossing the road when a bike nearly hit me." },
          { q: "Correct the mistake: When I was seeing the ice, it was melting already.", answer: "When I saw the ice, it was melting already." },
          { q: "Correct the mistake: While I was cooked, the milk boiled over.", answer: "While I was cooking, the milk boiled over." },
          { q: "Write one alibi sentence: where you were and what you were doing at 7 p.m. yesterday.", answer: "e.g. At 7 p.m. yesterday I was doing my homework in my bedroom." },
          { q: "Write two sentences about one evening: one long action in progress and one short action that interrupted it.", answer: "e.g. I was reading in bed. Suddenly the lights went out." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u5-ws-conditionals",
    title: "Zero and first conditional; when and as soon as",
    grammar: "zero and first conditional; when / as soon as",
    deckId: "rh-l3-u5-l6",
    slide: "Zero and first conditional; when and as soon as",
    intro:
      "Zero conditional: if + present, present. It states a fact: If you heat ice, it melts. First conditional: if + present, will + verb. It predicts a real possibility: If it rains, the ground will become soft. After if, when and as soon as we use the present, never will.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "If you freeze water, it ___ (turns / will turns) into ice.  ->  turns",
        items: [
          { q: "If you heat ice, it ___.", options: ["melts", "will melting"], answer: "melts" },
          { q: "If it rains tomorrow, we ___ at home.", options: ["will stay", "stay will"], answer: "will stay" },
          { q: "If you mix sand and water, you ___ mud.", options: ["get", "will gets"], answer: "get" },
          { q: "I will call you as soon as I ___ home.", options: ["get", "will get"], answer: "get" },
          { q: "If the lake dries up, the fish ___.", options: ["will die", "dies will"], answer: "will die" },
          { q: "Water boils when you ___ it to 100 degrees.", options: ["heat", "will heat"], answer: "heat" },
          { q: "Which sentence is a fact?", options: ["If you cool water enough, it freezes.", "If you cool water, it will be fun."], answer: "If you cool water enough, it freezes." },
          { q: "If you ___ hard, you will pass the test.", options: ["study", "will study"], answer: "study" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the correct form.",
        example: "If you (heat) ___ butter, it melts.  ->  heat",
        items: [
          { q: "If you (cool) ___ water to 0 degrees, it freezes.", answer: "cool" },
          { q: "If the sun (come) ___ out, the ice will melt.", answer: "comes" },
          { q: "As soon as the water (boil) ___, I will add the noodles.", answer: "boils" },
          { q: "If you (not / keep) ___ milk in the fridge, it goes bad.", answer: "do not keep" },
          { q: "When the rainy season (start) ___, the lake will fill up.", answer: "starts" },
          { q: "If they (fill) ___ in the lake, the birds will leave.", answer: "fill" },
          { q: "If you (add) ___ salt to ice, it melts faster.", answer: "add" },
          { q: "I (tell) ___ you as soon as I find out the result.", answer: "will tell" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Rewrite, correct or write. Check the tenses after if, when and as soon as.",
        example: "Heat ice. It melts. (If)  ->  If you heat ice, it melts.",
        items: [
          { q: "Correct the mistake: If it will rain tomorrow, we will stay at home.", answer: "If it rains tomorrow, we will stay at home." },
          { q: "Correct the mistake: As soon as I will finish, I will call you.", answer: "As soon as I finish, I will call you." },
          { q: "Make it a first conditional: The city fills in the lake. The birds leave.", answer: "If the city fills in the lake, the birds will leave." },
          { q: "Make it a zero conditional: Water reaches 100 degrees. It boils.", answer: "If water reaches 100 degrees, it boils." },
          { q: "Write one zero conditional about ice or water.", answer: "e.g. If you leave ice in the sun, it melts." },
          { q: "Write one first conditional about a real plan for this weekend.", answer: "e.g. If it is sunny on Saturday, we will go to the lake." },
        ],
      },
    ],
  },
];
