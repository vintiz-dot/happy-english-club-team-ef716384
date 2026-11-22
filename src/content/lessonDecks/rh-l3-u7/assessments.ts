// Reach Higher 3B, Unit 7 (Blast! Crash! Splash!): Jupiter's checkpoints and unit test in the
// format of the Hanoi selective schools' grade-6 English test. The mid-unit quiz
// runs in Lesson 4, the mock (ULIS style: 30 multiple-choice items on paper, then a
// 50-70 word paragraph, about 30 minutes) in Lesson 8, and the full end-of-unit test
// after Lesson 8 (rh-l3-u7-test). Every item and the reading
// passage are the school's own; nothing from the Student Book or a past paper.
import type { Assessment } from "@/lib/lessonDecks/types";

export const rhL3U7Assessments: Assessment[] = [
  {
    id: "rh-l3-u7-check",
    title: "Mid-unit checkpoint quiz",
    kind: "formative",
    afterLesson: 4,
    minutes: 15,
    covers: ["adverbs: form and position", "past simple / past continuous", "past perfect (stretch)", "-tion / -sion / -ous", "sounds"],
    sections: [
      {
        title: "Part A. Choose A, B, C or D",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "The scientist spoke ___ about the volcano.", options: ["calm", "calmly", "calmness", "calmer"], answer: "calmly" },
          { q: "We ___ along the beach when we saw smoke over the island.", options: ["walked", "were walking", "walk", "are walking"], answer: "were walking" },
          { q: "By the time we arrived, the lava ___.", options: ["cooled", "had cooled", "has cooled", "cools"], answer: "had cooled" },
          { q: "Which sentence is correct?", options: ["We go often to the beach.", "We often go to the beach.", "We go to often the beach.", "Often we goes to the beach."], answer: "We often go to the beach." },
          { q: "Which word has a different sound in its ending?", options: ["action", "nation", "explosion", "station"], answer: "explosion" },
        ],
      },
      {
        title: "Part B. Give the correct form",
        skill: "Vocabulary",
        instructions: "Write the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "The (erupt) ___ lasted for three days.", answer: "eruption" },
          { q: "Lava is extremely (danger) ___.", answer: "dangerous" },
          { q: "(Sudden) ___, the ground began to shake.", answer: "Suddenly" },
        ],
      },
      {
        title: "Part C. Find and correct the mistake",
        skill: "Grammar",
        instructions: "Each sentence has one mistake. Write the wrong words and the correction.",
        marksEach: 1,
        items: [
          { q: "At the end, a new island appeared in the sea.", answer: "At the end → In the end" },
          { q: "When we got to the port, the last boat already left.", answer: "already left → had already left" },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u7-mock",
    title: "End-of-unit mock test (ULIS style)",
    kind: "formative",
    afterLesson: 8,
    minutes: 30,
    covers: ["sounds and stress", "adverbs", "narrative tenses", "past perfect", "had better / despite", "reported commands", "prepositions and the passive", "cause and effect", "reading", "a 50-70 word paragraph"],
    sections: [
      {
        title: "Part A. Sounds and stress (1-4)",
        skill: "Vocabulary",
        instructions: "Choose the word that is different from the other three.",
        marksEach: 1,
        items: [
          { q: "1. the sound of -sion", options: ["explosion", "erosion", "decision", "mansion"], answer: "mansion" },
          { q: "2. the sound of -ed", options: ["warned", "rescued", "crashed", "signalled"], answer: "crashed" },
          { q: "3. stress", options: ["volcano", "pressure", "island", "magma"], answer: "volcano" },
          { q: "4. stress", options: ["signal", "tunnel", "hotel", "little"], answer: "hotel" },
        ],
      },
      {
        title: "Part B. Choose A, B, C or D (5-16)",
        skill: "Grammar",
        instructions: "Circle the best answer.",
        marksEach: 1,
        items: [
          { q: "5. The lava moved ___ towards the sea.", options: ["slow", "slowly", "slowness", "slower"], answer: "slowly" },
          { q: "6. We ___ on the beach when the sky turned dark.", options: ["walked", "were walking", "walk", "have walked"], answer: "were walking" },
          { q: "7. By the time the boats came back, the storm ___.", options: ["passes", "had passed", "has passed", "was pass"], answer: "had passed" },
          { q: "8. Which sentence is correct?", options: ["She always is late.", "She is always late.", "Always she is late.", "She is late always."], answer: "She is always late." },
          { q: "9. You'd better ___ the beach now.", options: ["leave", "to leave", "leaving", "left"], answer: "leave" },
          { q: "10. ___ the strong wind, the fishers came home safely.", options: ["Although", "Despite", "Because", "Unless"], answer: "Despite" },
          { q: "11. The guard told us ___ near the water.", options: ["not go", "don't go", "not to go", "to not going"], answer: "not to go" },
          { q: "12. Stay inside ___ the storm is over.", options: ["until", "by", "during", "since"], answer: "until" },
          { q: "13. Tsunamis are usually caused ___ earthquakes under the sea.", options: ["from", "with", "by", "of"], answer: "by" },
          { q: "14. The earthquake happened ___ 26 December.", options: ["in", "on", "at", "by"], answer: "on" },
          { q: "15. Heavy rain can lead ___ landslides in the mountains.", options: ["to", "in", "for", "on"], answer: "to" },
          { q: "16. The school was closed ___ the typhoon.", options: ["because", "because of", "so", "although"], answer: "because of" },
        ],
      },
      {
        title: "Part C. Find the mistake (17-20)",
        skill: "Grammar",
        instructions: "Choose the part of the sentence that is wrong. Then write the correction next to it.",
        marksEach: 1,
        items: [
          { q: "17. The eruption was very danger for the villages near the mountain.", options: ["eruption", "very", "danger", "villages"], answer: "danger" },
          { q: "18. We stayed on the hill by the water went down.", options: ["stayed", "on", "by", "went"], answer: "by" },
          { q: "19. As soon as the siren will sound, everyone will leave the beach.", options: ["As soon as", "will sound", "everyone", "will leave"], answer: "will sound" },
          { q: "20. The old bridge over the river was build in 1902.", options: ["old", "over", "build", "in"], answer: "build" },
        ],
      },
      {
        title: "Part D. Reading (21-26 and two short answers)",
        skill: "Reading",
        instructions: "Read the text. Choose True or False, choose the best answer, or write a short answer.",
        passage:
          "Lý Sơn is a small island about 30 kilometres off the coast of Quảng Ngãi province. Millions of years ago, volcanoes erupted there again and again. The lava cooled and hardened, and slowly an island grew above the waves. Today visitors can still see the old craters and the black volcanic rock along the shore.\n\nLife on the island is not easy, because there is little fresh water. However, the farmers have found a clever method. They cover their fields with white sand carried from the beach, which keeps the soil wet. Thanks to this, Lý Sơn garlic is famous all over Vietnam. Every day, fast boats bring visitors who want to walk along the cliffs and explore the caves.",
        marksEach: 1,
        items: [
          { q: "21. Lý Sơn was made by volcanoes.", options: ["True", "False"], answer: "True" },
          { q: "22. The island appeared very quickly, in a few years.", options: ["True", "False"], answer: "False" },
          { q: "23. There is plenty of fresh water on the island.", options: ["True", "False"], answer: "False" },
          { q: "24. The farmers put sand from the beach on their fields.", options: ["True", "False"], answer: "True" },
          { q: "25. In 'Thanks to this', 'this' means ___.", options: ["the black rock", "covering the fields with sand", "the fast boats", "the old craters"], answer: "covering the fields with sand" },
          { q: "26. The best title for the text is ___.", options: ["How to Cook with Garlic", "A Dangerous Boat Trip", "A Volcano Island and Its Farmers", "The Biggest City in Vietnam"], answer: "A Volcano Island and Its Farmers" },
          { q: "How far is Lý Sơn from the coast?", answer: "About 30 kilometres." },
          { q: "How do visitors travel to the island?", answer: "By fast boat." },
        ],
      },
      {
        title: "Part E. Closest in meaning (27-30)",
        skill: "Grammar",
        instructions: "Choose the sentence that is closest in meaning to the first one.",
        marksEach: 1,
        items: [
          {
            q: "27. 'Don't swim today,' the lifeguard said to us.",
            options: ["The lifeguard told us to swim that day.", "The lifeguard said us not swim that day.", "The lifeguard told us not to swim that day.", "The lifeguard asked if we swam that day."],
            answer: "The lifeguard told us not to swim that day.",
          },
          {
            q: "28. Although the sea was rough, the boat arrived safely.",
            options: ["Because the sea was rough, the boat arrived safely.", "Despite the rough sea, the boat arrived safely.", "The sea was rough, so the boat didn't arrive.", "In spite the rough sea, the boat arrived safely."],
            answer: "Despite the rough sea, the boat arrived safely.",
          },
          {
            q: "29. Earthquakes under the sea cause most tsunamis.",
            options: ["Most earthquakes are caused by tsunamis.", "Most tsunamis cause earthquakes under the sea.", "Earthquakes are caused under the sea by tsunamis.", "Most tsunamis are caused by earthquakes under the sea."],
            answer: "Most tsunamis are caused by earthquakes under the sea.",
          },
          {
            q: "30. It's a good idea for you to pack a torch.",
            options: ["You had better not pack a torch.", "You mustn't pack a torch.", "You should pack a torch.", "You didn't pack a torch."],
            answer: "You should pack a torch.",
          },
        ],
      },
      {
        title: "Part F. Writing",
        skill: "Writing",
        instructions: "Write 50-70 words about a powerful force of nature (a typhoon, a flood, an earthquake or a volcano). Say what causes it, what it can do to a place, and how people can stay safe.",
        marksEach: 10,
        items: [
          { q: "Your paragraph (50-70 words).", answer: "Mark on four parts, 2.5 each: content (the three points), organisation (linking and cause-and-effect words), grammar, vocabulary." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "rh-l3-u7-test",
    title: "Unit 7 test: Blast! Crash! Splash!",
    kind: "summative",
    afterLesson: 8,
    minutes: 70,
    covers: [
      "Key words: volcano, erupt, magma, lava, flow, core, develop, earthquake, plate, sense, signal, warn, rescue",
      "Adverbs: how, where, when; adverbs that compare (book)",
      "Prepositional phrases: where, direction, time (book)",
      "Exam strand: past perfect, reported commands, despite, the passive, cause and effect, word formation",
      "Reading: an original article about a new volcanic island",
      "Writing: a 70-100 word paragraph on the Big Question",
      "Speaking: a 2-minute talk on the Big Question",
    ],
    sections: [
      {
        title: "Part A. Vocabulary (1-10)",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap.",
        marksEach: 1,
        items: [
          { q: "1. When the pressure under the mountain gets too strong, the volcano will ___.", options: ["erupt", "rescue", "develop", "warn"], answer: "erupt" },
          { q: "2. Melted rock deep under the ground is called ___.", options: ["magma", "shore", "plate", "signal"], answer: "magma" },
          { q: "3. Red-hot ___ poured down the mountain and into the sea.", options: ["lava", "core", "power", "sense"], answer: "lava" },
          { q: "4. The Earth's ___ is its very hot centre.", options: ["core", "ocean", "island", "wave"], answer: "core" },
          { q: "5. Over hundreds of years, the bare black rock ___ into a green island.", options: ["developed", "warned", "erupted", "rescued"], answer: "developed" },
          { q: "6. Some animals can ___ an earthquake before people feel it.", options: ["sense", "flow", "create", "erupt"], answer: "sense" },
          { q: "7. A siren is a ___ that tells people to move to higher ground.", options: ["signal", "plate", "rock", "force"], answer: "signal" },
          { q: "8. The radio ___ families on the coast that a typhoon was coming.", options: ["warned", "created", "flowed", "developed"], answer: "warned" },
          { q: "9. A boat went out to ___ the fishers whose engine had stopped.", options: ["rescue", "erupt", "sense", "flow"], answer: "rescue" },
          { q: "10. The ground shakes when two ___ of the Earth's outer layer suddenly move.", options: ["plates", "shores", "oceans", "islands"], answer: "plates" },
        ],
      },
      {
        title: "Part B. Grammar: adverbs and prepositional phrases (11-18)",
        skill: "Grammar",
        instructions: "Choose the best answer, or do what the question asks.",
        marksEach: 1,
        items: [
          { q: "11. The scientist walked ___ towards the edge of the crater.", options: ["careful", "carefully", "care", "more careful"], answer: "carefully" },
          { q: "12. The second wave reached the beach ___ than the first one.", options: ["fast", "faster", "fastest", "more fast"], answer: "faster" },
          { q: "13. Of the three teams, ours worked ___.", options: ["hardest", "the hardest", "more hard", "the most hard"], answer: "the hardest" },
          { q: "14. My sister reads English ___ than I do.", options: ["more fluently", "fluentlier", "most fluently", "more fluent"], answer: "more fluently" },
          { q: "15. Find the adverb and say whether it tells how, where or when: 'The fishing boats will come back soon.'", answer: "soon: when" },
          { q: "16. We ran ___ the hill to get away from the water.", options: ["up", "on", "at", "of"], answer: "up" },
          { q: "17. Find the prepositional phrase and say whether it shows where, direction or time: 'After the storm, the villagers repaired the roofs.'", answer: "After the storm: time" },
          { q: "18. Correct the mistake: 'The earthquake happened in Monday morning.'", answer: "in → on (on Monday morning)" },
        ],
      },
      {
        title: "Part C. Exam practice: rewrite, correct, word form (19-28)",
        skill: "Grammar",
        instructions: "19-23: rewrite each sentence so that it means the same, using the word in brackets. 24-25: find the mistake and correct it. 26-28: give the correct form of the word in brackets.",
        marksEach: 1,
        items: [
          { q: "19. The ferry left. Then we arrived at the port. (By the time)", answer: "By the time we arrived at the port, the ferry had left." },
          { q: "20. 'Don't go near the water,' the guard said to us. (told)", answer: "The guard told us not to go near the water." },
          { q: "21. Although the wind was strong, the fishers went out to sea. (Despite)", answer: "Despite the strong wind, the fishers went out to sea." },
          { q: "22. An earthquake under the sea caused the tsunami. (was caused)", answer: "The tsunami was caused by an earthquake under the sea." },
          { q: "23. The school closed because the flood was serious. (because of)", answer: "The school closed because of the serious flood." },
          { q: "24. You had better to stay inside until the storm is over.", answer: "had better to stay → had better stay" },
          { q: "25. The rescue team was arrived at the village at midnight.", answer: "was arrived → arrived" },
          { q: "26. There was a loud (explode) ___ and the windows shook.", answer: "explosion" },
          { q: "27. Many people felt (nerve) ___ when the ground began to shake.", answer: "nervous" },
          { q: "28. Scientists cannot always (prediction) ___ when a volcano will erupt.", answer: "predict" },
        ],
      },
      {
        title: "Part D. Reading (29-34)",
        skill: "Reading",
        instructions: "Read the text. Choose the best answer, choose True or False, or write a short answer.",
        passage:
          "In November 1963, some fishermen near the south coast of Iceland saw smoke rising from the sea. A volcano was erupting under the water. Day after day, ash and lava piled up, until a black island appeared above the waves. People named it Surtsey. The eruptions went on for about three and a half years, and by the time they stopped, the island was more than a kilometre wide.\n\nScientists quickly understood that Surtsey was a perfect natural laboratory. It was decided that only scientists could visit, so that they could watch how life arrives on new land. Seeds came first, carried by the wind and the waves, and the first plants grew within two years. Later, seabirds built their nests there. However, the sea and the wind have slowly worn away part of the rock, so the island is smaller today than it was in 1967.",
        marksEach: 1,
        items: [
          { q: "29. What did the fishermen see first?", options: ["smoke rising from the sea", "a black island", "lava on a beach", "seabirds' nests"], answer: "smoke rising from the sea" },
          { q: "30. The volcano that made Surtsey was under the sea.", options: ["True", "False"], answer: "True" },
          { q: "31. Families can go to Surtsey for a holiday.", options: ["True", "False"], answer: "False" },
          { q: "32. Why do scientists study Surtsey?", options: ["to see how life arrives on new land", "to find gold in the rock", "to build a new town", "to stop the next eruption"], answer: "to see how life arrives on new land" },
          { q: "33. In the last sentence, 'worn away' means ___.", options: ["slowly broken off and carried away", "built up higher", "covered with plants", "made hotter"], answer: "slowly broken off and carried away" },
          { q: "34. Name TWO forces that are changing Surtsey today.", answer: "the sea (the waves) and the wind" },
        ],
      },
      {
        title: "Part E. Writing",
        skill: "Writing",
        instructions:
          "Write 70-100 words. Which force of nature do you think changes Earth the most? Explain how it changes the land or the sea, give an example of a place (in Vietnam or anywhere in the world), and say how people can stay safe from it. Use at least one cause-and-effect phrase (cause, lead to, result in, because of) and one adverb.",
        marksEach: 10,
        items: [
          {
            q: "Your paragraph (70-100 words).",
            answer:
              "Mark on four parts, 2.5 each: content (the force, how it changes Earth, an example place, how to stay safe); organisation (a topic sentence, ideas in order, linking words); grammar (cause-and-effect phrases, adverbs, past and present tenses or the passive used correctly); vocabulary and spelling (unit key words used correctly). e.g. In my opinion, water changes Earth the most. Rivers and the sea work slowly, but they never stop. Over millions of years, rain and sea water carved the limestone islands and caves of Hạ Long Bay. Water can also change a place very quickly: heavy rain often leads to floods and landslides in the mountains of northern Vietnam. To stay safe, families should listen carefully to warnings on the radio and move to higher ground as soon as they hear a signal.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about two minutes on the Big Question: What forces can change Earth? Choose two forces from the unit (a volcano, an earthquake, a tsunami, or wind and water). For each one say how it changes the land or the sea, whether it works quickly or slowly, and one place where it has happened. End with your opinion: which force matters most for people in Vietnam, and why? Then answer the teacher's follow-up questions.",
      prompts: [
        "Can a force that destroys land also create new land? Give an example.",
        "How did Selvakumar know about the danger before his family did?",
        "How do scientists find out that a tsunami is coming?",
        "What should a family on the coast do when they hear a typhoon warning?",
        "Which selection in this unit taught you the most, and why?",
      ],
      rubric: [
        {
          criterion: "Fluency",
          bands: [
            "Talks for about two minutes with only short pauses to think; ideas follow in a clear order.",
            "Keeps going for most of the time; some pauses or restarts but needs no help.",
            "Many pauses; speaks in short pieces; needs a prompt once or twice to continue.",
            "Very hesitant; single words or short phrases; needs help throughout.",
          ],
        },
        {
          criterion: "Grammar range and accuracy",
          bands: [
            "Uses adverbs (including one that compares), cause-and-effect phrases and past tenses or the passive, nearly always correctly.",
            "Uses some of these structures correctly; a few slips that do not stop understanding.",
            "Mostly simple present sentences; frequent errors in tenses or word order.",
            "Very little control of grammar; errors often stop understanding.",
          ],
        },
        {
          criterion: "Vocabulary",
          bands: [
            "Uses many unit key words (erupt, magma, plate, tsunami, warn, signal ...) correctly and naturally.",
            "Uses several key words correctly; one or two wrong or missing.",
            "Uses only a few key words; often repeats the same simple words.",
            "Very few key words; names things only or uses Vietnamese.",
          ],
        },
        {
          criterion: "Pronunciation and interaction",
          bands: [
            "Clear words and word stress (vol-CA-no, e-RUP-tion); answers follow-up questions fully and with reasons.",
            "Mostly clear; a few words hard to catch; answers questions with a short reason.",
            "Often hard to follow; answers questions in a few words without reasons.",
            "Very hard to understand; does not answer the questions or answers off topic.",
          ],
        },
      ],
    },
  },
];
