// Oxford Discover 2nd edition, Level 3, Unit 17 (Journeys and Explorers):
// the unit's printable grammar worksheets (three levels each, with answer keys),
// the quick check given early in Lesson 4, and the end-of-unit test with its
// speaking task. Everything here is the school's own writing: no text, song or
// audio from the Student Book or Workbook is reproduced, and the reading
// passage is original. Answers marked "e.g." are model answers for open items.
//
// The worksheets point at a deck and the title of the slide they follow, so the
// player can offer them there. Facts used are plain ones: an island is land with
// water all around it, a strait is a narrow stretch of sea between two pieces of
// land, hail is small balls of ice, and before / after show which event came first.
import type { Assessment, Worksheet } from "@/lib/lessonDecks/types";

export const odL3U17Worksheets: Worksheet[] = [
  // ------------------------------------------------------------------ movement
  {
    id: "od2e-l3-u17-ws-movement",
    title: "down, through, around",
    grammar: "prepositions of movement: down, through, around",
    deckId: "od2e-l3-u17-l3",
    slide: "Prepositions of movement: down, through, around",
    intro:
      "A preposition of movement is a small route word: down the stairs, through the tunnel, around the island, across the bridge, along the river. It comes BEFORE the place, and there is no to in front of it: Go across the road (not Go to across the road).",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "Go ___ the stairs to the ground floor.  (down / through)  ->  down",
        items: [
          { q: "Walk ___ the stairs to the ground floor.", options: ["down", "through"], answer: "down" },
          { q: "The ship sailed ___ the island. It did not stop.", options: ["around", "through"], answer: "around" },
          { q: "We walked ___ the tunnel and came out on the other side.", options: ["through", "around"], answer: "through" },
          { q: "Swim ___ the river, from one bank to the other.", options: ["across", "down"], answer: "across" },
          { q: "Which sentence is correct?", options: ["Walk through the park.", "Walk the park through."], answer: "Walk through the park." },
          { q: "Which sentence is correct?", options: ["Go to across the road.", "Go across the road."], answer: "Go across the road." },
          { q: "The path goes ___ the river for a kilometre, beside the water.", options: ["along", "through"], answer: "along" },
          { q: "A boat cannot go ___ an island, so it goes around it.", options: ["through", "along"], answer: "through" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing movement word. For the rewrite and correct questions, write the whole sentence.",
        example: "Walk ___ the bridge to get to the other side.  ->  across",
        items: [
          { q: "Walk ___ the bridge to get to the other side of the river.", answer: "across" },
          { q: "Go ___ the long corridor to the library.", answer: "down (along is also correct)" },
          { q: "The ship sailed ___ the island because it could not go through it.", answer: "around" },
          { q: "The train goes ___ the mountain in a tunnel and comes out the other side.", answer: "through" },
          { q: "Rewrite as a command: You should walk through the forest.", answer: "Walk through the forest." },
          { q: "Correct the mistake: Go to across the street.", answer: "Go across the street." },
          { q: "Correct the mistake: The ship sailed the coast around.", answer: "The ship sailed around the coast." },
          { q: "Correct the mistake: Walk in the tunnel to the other end.", answer: "Walk through the tunnel to the other end." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully. Some answers need sentences of your own, so check every movement word.",
        example: "Walk down the hall, then go through the door.",
        items: [
          { q: "Write directions from the classroom door to your desk. Use three different movement words.", answer: "e.g. Go down the aisle, walk around the big table and go along the wall to my desk." },
          {
            q: "Explain the difference: 'Walk in the park' and 'Walk through the park'.",
            answer: "e.g. In the park tells where you are. Through the park shows movement: you go in at one side and out at the other.",
          },
          {
            q: "Find and fix three mistakes: 'Go to across the bridge. Then walk the river along. Finally, sail through the island.'",
            answer: "Go across the bridge. Then walk along the river. Finally, sail around the island.",
          },
          { q: "Write a question and an answer: someone asks the way to the library. Your answer has two steps.", answer: "e.g. How do I get to the library? Go down the stairs, then walk along the corridor." },
          { q: "Why can a boat sail around an island but not through it?", answer: "e.g. Through means going in one side and out of the other. An island is solid land, so the boat has to go around it." },
          { q: "Write two-step directions with one Don't. Use a reason with because.", answer: "e.g. Go across the field, then walk through the gate. Don't go through the mud because your shoes will get dirty." },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ before / after
  {
    id: "od2e-l3-u17-ws-before-after",
    title: "before and after",
    grammar: "complex sentences with before and after",
    deckId: "od2e-l3-u17-l4",
    slide: "Complex sentences with before and after",
    intro:
      "before and after join two events and show the order. The event after the word BEFORE happens second: We ate before we left (ate, then left). The event after the word AFTER happens first: We left after we ate (ate, then left). Each part has its own subject and verb. Start with the time word? Put a comma: After we arrived, we unpacked.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the whole sentence aloud.",
        example: "We had lunch ___ we sailed. (Lunch was first.)  (before / after)  ->  before",
        items: [
          { q: "We had lunch ___ we sailed. (Lunch was first.)", options: ["before", "after"], answer: "before" },
          { q: "___ the storm ended, the ship sailed on. (The storm ended first.)", options: ["Before", "After"], answer: "After" },
          { q: "Which happened first? 'We saw the waterfall after we walked along the river.'", options: ["We walked along the river.", "We saw the waterfall."], answer: "We walked along the river." },
          { q: "Which sentence needs a comma?", options: ["After we arrived we unpacked.", "We unpacked after we arrived."], answer: "After we arrived we unpacked." },
          { q: "Which sentence is correct?", options: ["Before arrive at the coast, we packed.", "Before we arrived at the coast, we packed."], answer: "Before we arrived at the coast, we packed." },
          { q: "Before we left, we ___ the map.", options: ["looked at", "look at"], answer: "looked at" },
          { q: "'We ate before we left' means we ...", options: ["ate first, then left", "left first, then ate"], answer: "ate first, then left" },
          { q: "We took a photo ___ we left the island. (The photo was first.)", options: ["before", "after"], answer: "before" },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word, or write the whole sentence where it asks.",
        example: "We checked the weather. We sailed. (before)  ->  We checked the weather before we sailed.",
        items: [
          { q: "___ we got to the hotel, we put our bags in the room. (The bags came second.)", answer: "After" },
          { q: "We took photos ___ we left the island. (The photos came first.)", answer: "before" },
          { q: "Join with before: We checked the weather. We sailed.", answer: "We checked the weather before we sailed." },
          { q: "Join with after: We crossed the river. We had a picnic.", answer: "We had a picnic after we crossed the river." },
          { q: "Start with After: We ate lunch before we went to the beach.", answer: "After we ate lunch, we went to the beach." },
          { q: "Correct the mistake: After we arrived we unpacked.", answer: "After we arrived, we unpacked." },
          { q: "Correct the mistake: We walked to the beach, after we saw the waterfall.", answer: "We walked to the beach after we saw the waterfall." },
          { q: "Correct the mistake: Before leave the island, we took a photo.", answer: "Before we left the island, we took a photo." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Think carefully about the order of events. Check every comma, every subject and every verb.",
        example: "We packed our bags before we left.  ->  We left after we packed our bags.",
        items: [
          { q: "Rewrite so that the meaning stays the same: We packed our bags before we left.", answer: "After we packed our bags, we left. (or: We left after we packed our bags.)" },
          { q: "Rewrite so that the meaning stays the same: After the fog cleared, the ship sailed on.", answer: "The ship sailed on after the fog cleared. (or: Before the ship sailed on, the fog cleared.)" },
          {
            q: "Find and fix three mistakes: 'Before we sailed we checked the map. We saw the island, after we looked around. After arrive, we wrote in the journal.'",
            answer: "Before we sailed, we checked the map. We saw the island after we looked around. After we arrived, we wrote in the journal.",
          },
          { q: "Write two sentences about your day: one with before and one with after.", answer: "e.g. I brushed my teeth before I left home. After I got to school, I put my bag in my locker." },
          { q: "Do these mean the same? 'We swam before we ate.' and 'We ate after we swam.' Explain.", answer: "e.g. Yes. In both sentences we swam first and ate second. The order of the events is the same; only the time word changes places." },
          { q: "Write one sentence with before, one movement word and a date.", answer: "e.g. On the fifth of May, before we sailed around the island, we checked the weather." },
        ],
      },
    ],
  },
];

export const odL3U17Assessments: Assessment[] = [
  // ------------------------------------------------------------ quick check (Lesson 4)
  {
    id: "od2e-l3-u17-check",
    title: "Unit 17 quick check",
    kind: "formative",
    afterLesson: 3,
    minutes: 8,
    covers: ["Unit 17 weather and landform words", "prepositions of movement: down, through, around"],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "On your mini-whiteboard, write the word. Hold it up when the teacher says 'show me'.",
        marksEach: 1,
        items: [
          { q: "Thick cloud near the ground that makes it hard to see. Which word?", answer: "fog" },
          { q: "Water that falls down from a high rock. Which word?", answer: "waterfall" },
          { q: "The land next to the sea. Which word?", answer: "coast" },
          { q: "Very bad weather with strong wind and rain. Which word?", answer: "storm" },
        ],
      },
      {
        title: "Grammar: down, through, around",
        skill: "Grammar",
        instructions: "Write your answer on the whiteboard. Whole sentence where it asks, one word where it does not.",
        marksEach: 1,
        items: [
          { q: "Complete: We walked ___ the tunnel and came out on the other side.", answer: "through" },
          { q: "Complete: The ship sailed ___ the island. It could not go through land.", answer: "around" },
          { q: "Correct the mistake: Go to across the road.", answer: "Go across the road." },
          { q: "'Walk through the park' means you go in at one side and out at the other.", options: ["True", "False"], answer: "True" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ unit test
  {
    id: "od2e-l3-u17-test",
    title: "Unit 17 test",
    kind: "summative",
    afterLesson: 5,
    minutes: 45,
    covers: [
      "The 10 weather and landform words",
      "Words in context: healthy, strait, journey, sail",
      "Phrasal verbs with look",
      "Prepositions of movement: down, through, around",
      "Complex sentences with before and after",
      "Reading: a journey",
      "Writing: a trip journal",
      "Speaking: talk about a trip",
    ],
    sections: [
      {
        title: "Vocabulary",
        skill: "Vocabulary",
        instructions: "Choose the best word for each gap and write it.",
        marksEach: 1,
        items: [
          { q: "An ___ is land with water all around it.", options: ["island", "coast", "river", "waterfall"], answer: "island" },
          { q: "Small balls of ice that fall from the sky are called ___.", options: ["fog", "hail", "lightning", "clouds"], answer: "hail" },
          { q: "In the ___, we could not see the road.", options: ["fog", "river", "coast", "island"], answer: "fog" },
          { q: "The ___ came before the thunder: a bright flash in the sky.", options: ["hail", "lightning", "fog", "coast"], answer: "lightning" },
          { q: "A ___ is a narrow part of the sea between two pieces of land.", options: ["strait", "waterfall", "river", "storm"], answer: "strait" },
          { q: "The ___ to the coast took all day. It was a long trip.", options: ["journey", "storm", "island", "cloud"], answer: "journey" },
          { q: "My cousin eats fruit and vegetables to stay ___.", options: ["healthy", "windy", "foggy", "tired"], answer: "healthy" },
          { q: "They plan to ___ across the sea in a small boat.", options: ["sail", "hail", "climb", "mime"], answer: "sail" },
          { q: "Please ___ the word 'strait' in a dictionary.", options: ["look up", "look after", "look out", "look around"], answer: "look up" },
          { q: "___! The floor is wet.", options: ["Look out", "Look after", "Look for", "Look through"], answer: "Look out" },
          { q: "Our teacher ___ the class plant every week and gives it water.", options: ["looks after", "looks up", "looks around", "looks out"], answer: "looks after" },
          { q: "I'm ___ my map. I can't find it.", options: ["looking for", "looking after", "looking up", "looking out"], answer: "looking for" },
        ],
      },
      {
        title: "Grammar: down, through, around",
        skill: "Grammar",
        instructions: "Do what each question asks. Write full sentences when you are asked to rewrite or correct.",
        marksEach: 1,
        items: [
          { q: "Walk ___ the stairs to the ground floor.", options: ["down", "through", "across"], answer: "down" },
          { q: "Don't run ___ the puddle!", options: ["through", "around", "along"], answer: "through" },
          { q: "The boat sailed ___ the island because it could not go through land.", options: ["around", "through", "down"], answer: "around" },
          { q: "Correct the mistake: Go to across the bridge.", answer: "Go across the bridge." },
          { q: "Rewrite as a command: You walk along the river to the bridge.", answer: "Walk along the river to the bridge." },
          { q: "Write two-step directions from your classroom door to the library. Use two different movement words.", answer: "e.g. Go down the corridor, then walk through the big door." },
        ],
      },
      {
        title: "Grammar: before and after",
        skill: "Grammar",
        instructions: "Choose before or after, or join and correct the sentences. Remember the comma when the time word starts the sentence.",
        marksEach: 1,
        items: [
          { q: "We packed our bags ___ we left. (Packing came first.)", options: ["before", "after"], answer: "before" },
          { q: "___ we arrived, we unpacked. (Arriving came first.)", options: ["Before", "After"], answer: "After" },
          { q: "Join with before: We checked the weather. We sailed.", answer: "We checked the weather before we sailed." },
          { q: "Start with After: We left the harbour before the fog came down.", answer: "After we left the harbour, the fog came down." },
          { q: "Correct the mistake: After we arrived we unpacked.", answer: "After we arrived, we unpacked." },
          { q: "Write your own sentence with before about your morning.", answer: "e.g. I had breakfast before I walked to school." },
        ],
      },
      {
        title: "Reading: a journey",
        skill: "Reading",
        instructions: "Read the text. Then answer the questions.",
        passage:
          "Last August, a girl and her family took a long journey to an island. Before they left, her father studied the map and checked the weather. The sky was full of white clouds, but there was no storm, so the ferry left on time. After it left the harbour, it sailed around a small rock and then through a narrow strait between two islands. The girl stood on the deck and looked around. She saw dolphins in the water and a high waterfall on the coast. In the afternoon, fog came down, and the captain slowed the ferry. Everyone was quiet for an hour. After the fog cleared, the sun came out again. When they arrived, the family walked along the river to a small village. That night the girl wrote three journal entries. 'It was a long journey,' she wrote, 'but I felt healthy and brave.'",
        marksEach: 1,
        items: [
          { q: "The father checked the map and the weather before they left.", options: ["True", "False"], answer: "True" },
          { q: "There was a bad storm at the start of the trip.", options: ["True", "False"], answer: "False" },
          { q: "What did the ferry go through?", options: ["a strait", "a waterfall", "a river"], answer: "a strait" },
          { q: "When did the fog come down?", options: ["in the morning", "in the afternoon", "at night"], answer: "in the afternoon" },
          { q: "What did the family do after they arrived?", options: ["They sailed around a rock.", "They walked along the river to a village.", "They waited for the fog."], answer: "They walked along the river to a village." },
          { q: "Why did the captain slow the ferry? Answer in one sentence.", answer: "e.g. Because the fog came down and it was hard to see." },
        ],
      },
      {
        title: "Writing",
        skill: "Writing",
        instructions:
          "Write 4 or 5 sentences about a trip you took, or a trip you imagine. Say where you went, what the weather was like and how you travelled. Use before or after at least once and one movement word (down, through, around, across or along). Marks (5): a clear first sentence, weather or place words from the unit, a correct before / after sentence with its comma, a movement word used correctly, and spelling and capital letters.",
        marksEach: 5,
        items: [
          {
            q: "Write about a trip.",
            answer:
              "e.g. Last summer we went to an island near the coast. Before we left, we checked the weather and it was sunny. After we arrived, we walked along a river and through a small forest. We saw a big waterfall and I felt very happy. It was a great journey.",
          },
        ],
      },
    ],
    speaking: {
      task:
        "Talk for about one minute about a trip you took, or a place you would like to explore. Say where it is, how you get there, what the weather is like and why you want to go. Then answer two questions from the teacher.",
      prompts: [
        "What did you do before you left, or what will you do before you go?",
        "How do you get there? Use two movement words.",
        "What is the weather like there, and does it matter?",
        "Why do people explore new places?",
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
            "Uses unit words correctly and naturally (weather, landforms, journey, look phrasal verbs).",
            "Uses several unit words correctly; one or two are wrong or missing.",
            "Uses only a few unit words; often says 'thing' or repeats the same words.",
            "Very few unit words; names places only, or uses the first language.",
          ],
        },
        {
          criterion: "Grammar: movement words and before / after",
          bands: [
            "Uses down, through, around (or similar) and before / after correctly more than once.",
            "Uses movement words or before / after correctly at least once; one small slip.",
            "Tries them but with errors (go to across, before arrive); the order of events is unclear.",
            "No movement words or before / after; uses only simple sentences or single words.",
          ],
        },
        {
          criterion: "Ideas and reasons",
          bands: [
            "Describes the trip clearly in order and gives a reason why people explore, with an example.",
            "Describes the trip in order; gives a simple reason.",
            "Gives one or two points without a reason; stays on topic.",
            "Little or no content; answers do not match the questions.",
          ],
        },
      ],
    },
  },
];
