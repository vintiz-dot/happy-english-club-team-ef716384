// Reach Higher 3B, Unit 7 (Blast! Crash! Splash!): Jupiter's two checkpoints in the
// format of the Hanoi selective schools' grade-6 English test. The mid-unit quiz
// runs in Lesson 4, the mock (ULIS style: 30 multiple-choice items on paper, then a
// 50-70 word paragraph, about 30 minutes) in Lesson 8. Every item and the reading
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
          "Lý Sơn is a small island about 30 kilometres off the coast of Quảng Ngãi province. Millions of years ago, volcanoes under the sea erupted again and again. The lava cooled and hardened, and slowly an island grew above the waves. Today visitors can still see the old craters and the black volcanic rock along the shore.\n\nLife on the island is not easy, because there is little fresh water. However, the farmers have found a clever method. They cover their fields with white sand carried from the beach, which keeps the soil wet. Thanks to this, Lý Sơn garlic is famous all over Vietnam. Every day, fast boats bring visitors who want to walk along the cliffs and explore the caves.",
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
];
