// Reach Higher 3B, Unit 7 (Forces of Nature): printable grammar worksheets in three
// levels with answer keys. The school's own writing. Each follows the exact title
// of the grammar slide it belongs to.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U7Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u7-ws-story-tenses",
    title: "Past simple, past continuous and sequence words",
    grammar: "past simple vs past continuous; sequence words",
    deckId: "rh-l3-u7-l2",
    slide: "Telling a story: past simple, past continuous and sequence words",
    intro:
      "In a story, the past continuous sets the scene (The sea was shining) and the past simple tells the events (Suddenly the ground shook). Sequence words keep events in order: first, then, after that, next, finally.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "The fishers ___ when the volcano erupted. (were sleeping / slept)  ->  were sleeping",
        items: [
          { q: "The sun ___ when the ground began to shake.", options: ["was shining", "shone"], answer: "was shining" },
          { q: "Suddenly, the volcano ___.", options: ["erupted", "was erupting"], answer: "erupted" },
          { q: "The birds ___ in the trees when the noise started.", options: ["were singing", "sang"], answer: "were singing" },
          { q: "___ we ran to the boat. Then we left.", options: ["First", "Finally"], answer: "First" },
          { q: "The lava flowed down the hill. ___, it reached the sea.", options: ["After that", "At first"], answer: "After that" },
          { q: "While the children ___, the smoke rose.", options: ["were playing", "played"], answer: "were playing" },
          { q: "Which sentence tells an event?", options: ["The lava hit the water.", "The lava was hitting the water."], answer: "The lava hit the water." },
          { q: "___, everyone was safe. The story had a happy end.", options: ["Finally", "First"], answer: "Finally" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the past simple or the past continuous.",
        example: "We (sail) ___ when the sea began to boil.  ->  were sailing",
        items: [
          { q: "The fishers (mend) ___ their nets when they heard a loud bang.", answer: "were mending" },
          { q: "Suddenly, a cloud of ash (rise) ___ from the sea.", answer: "rose" },
          { q: "While the men (watch) ___, a new island appeared.", answer: "were watching" },
          { q: "The water (not / move) ___ until the explosion.", answer: "was not moving / did not move" },
          { q: "What (you / do) ___ when the eruption started?", answer: "were you doing" },
          { q: "First, we (pull) ___ in the nets. Then we raced for the shore.", answer: "pulled" },
          { q: "The sky (turn) ___ dark, and ash began to fall.", answer: "turned" },
          { q: "A few minutes later, the rocks (stop) ___ falling.", answer: "stopped" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct, join or write. Use the right tense and a sequence word.",
        example: "I was walking. I heard a noise. (when)  ->  I was walking when I heard a noise.",
        items: [
          { q: "Correct the mistake: While the volcano erupted, we were running to the boat.", answer: "While the volcano was erupting, we were running to the boat." },
          { q: "Correct the mistake: We were reaching the shore, and then the ash was stopping.", answer: "We reached the shore, and then the ash stopped." },
          { q: "Correct the mistake: Then the ground was shaking, and we fell over.", answer: "Then the ground shook, and we fell over." },
          { q: "Join the two sentences: The boat was crossing the bay. The sea began to rise. (when)", answer: "The boat was crossing the bay when the sea began to rise." },
          { q: "Write two sentences about a storm: one to set the scene and one for the event.", answer: "e.g. The wind was blowing hard. Suddenly, a tree fell across the road." },
          { q: "Write three sentences about an event, using first, then and finally.", answer: "e.g. First, the rain started. Then the river rose. Finally, the water covered the road." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u7-ws-advice",
    title: "should, ought to and had better",
    grammar: "should / ought to / had better",
    deckId: "rh-l3-u7-l5",
    slide: "Opinions and advice: I believe, should, ought to, had better; despite (stretch)",
    intro:
      "Should and ought to give advice: You should leave early. You ought to listen to the warning. Had better is stronger: it warns of a bad result. You'd better go now, or the road will be flooded. After all three, use the base verb with no to after should and had better, but to after ought.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "You ___ stay away from the river. (should / should to)  ->  should",
        items: [
          { q: "You ___ listen to the weather report.", options: ["should", "should to"], answer: "should" },
          { q: "We ought ___ leave before the storm.", options: ["to", "-"], answer: "to" },
          { q: "You'd better ___ now, or you will be late.", options: ["go", "to go"], answer: "go" },
          { q: "Which gives the strongest warning?", options: ["You'd better move to high ground.", "You may move to high ground."], answer: "You'd better move to high ground." },
          { q: "People ___ not swim in the sea during a storm.", options: ["should", "ought"], answer: "should" },
          { q: "I believe we ___ practise the safety plan.", options: ["should", "must to"], answer: "should" },
          { q: "You ___ to take a torch.", options: ["ought", "should"], answer: "ought" },
          { q: "We ___ better close the windows.", options: ["had", "have"], answer: "had" },
        ],
      },
      {
        level: "Core",
        instructions: "Complete with should, ought to or had better and the verb in brackets. Use each of the three at least once.",
        example: "You ___ (take) a coat. It is cold.  ->  should take / ought to take",
        items: [
          { q: "We ___ (leave) now, or we will miss the boat.", answer: "had better leave" },
          { q: "Children ___ (stay) away from the cliff edge.", answer: "should stay / ought to stay" },
          { q: "You ___ (not / go) out in the typhoon.", answer: "should not go / ought not to go / had better not go" },
          { q: "I think everyone ___ (learn) first aid.", answer: "should learn / ought to learn" },
          { q: "You ___ (listen) to the siren, or it could be dangerous.", answer: "had better listen" },
          { q: "Families ___ (keep) a torch and a radio at home.", answer: "should keep / ought to keep" },
          { q: "I believe people ___ (not / ignore) a warning.", answer: "should not ignore / ought not to ignore" },
          { q: "He ___ (take) the advice, or he will be in trouble.", answer: "had better take" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Correct the mistake or write. Check the form after should, ought and had better.",
        example: "You should to wear a helmet.  ->  You should wear a helmet.",
        items: [
          { q: "Correct the mistake: You ought leave when the siren sounds.", answer: "You ought to leave when the siren sounds." },
          { q: "Correct the mistake: We had better to hurry.", answer: "We had better hurry." },
          { q: "Correct the mistake: She shoulds check the radio.", answer: "She should check the radio." },
          { q: "Write one piece of advice for a family before a typhoon, with a reason, using should.", answer: "e.g. We should charge the phones because the power may go out." },
          { q: "Write one strong warning with had better and what will happen if you ignore it.", answer: "e.g. You'd better leave now, or the road will be under water." },
          { q: "Write a sentence with 'Despite' about a safety plan.", answer: "e.g. Despite the heavy rain, we followed the plan and stayed safe." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u7-ws-passive-report",
    title: "The passive in a report",
    grammar: "present and past passive",
    deckId: "rh-l3-u7-l7",
    slide: "The passive in a report (present and past)",
    intro:
      "Use the passive when the action matters more than the doer. Present passive: am / is / are + past participle (Earthquakes are caused by moving plates). Past passive: was / were + past participle (The warning was sent at noon). Add by + the doer only if it is important.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer.",
        example: "Earthquakes ___ by moving plates. (are caused / cause)  ->  are caused",
        items: [
          { q: "Warnings ___ to phones.", options: ["are sent", "is sent"], answer: "are sent" },
          { q: "The village ___ by the wave in 2004.", options: ["was destroyed", "were destroyed"], answer: "was destroyed" },
          { q: "Volcanoes ___ near the edges of plates.", options: ["are found", "is found"], answer: "are found" },
          { q: "Many houses ___ by the typhoon last year.", options: ["were damaged", "was damaged"], answer: "were damaged" },
          { q: "Magma ___ from deep under the ground.", options: ["is pushed up", "are pushed up"], answer: "is pushed up" },
          { q: "The tsunami ___ by an earthquake under the sea.", options: ["was caused", "caused"], answer: "was caused" },
          { q: "Which sentence is passive?", options: ["The rescue team was called.", "The rescue team called."], answer: "The rescue team was called." },
          { q: "The sirens ___ every month to check them.", options: ["are tested", "tests"], answer: "are tested" },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the present or past passive.",
        example: "The report (write) ___ yesterday.  ->  was written",
        items: [
          { q: "Hot rock (call) ___ magma when it is under the ground.", answer: "is called" },
          { q: "The island (form) ___ by an eruption long ago.", answer: "was formed" },
          { q: "Earthquakes (measure) ___ with special machines.", answer: "are measured" },
          { q: "Many people (rescue) ___ from the flood yesterday.", answer: "were rescued" },
          { q: "The beach (close) ___ when the storm comes.", answer: "is closed" },
          { q: "The warning (not / hear) ___ by everyone last night.", answer: "was not heard" },
          { q: "Rain (bring) ___ by typhoons every year.", answer: "is brought" },
          { q: "The bridge (build) ___ in 1998.", answer: "was built" },
        ],
      },
      {
        level: "Challenge",
        instructions: "Rewrite in the passive, correct, or write. Use by only when it is useful.",
        example: "A scientist measured the earthquake.  ->  The earthquake was measured by a scientist.",
        items: [
          { q: "Rewrite in the passive: People send warnings by radio.", answer: "Warnings are sent by radio." },
          { q: "Rewrite in the passive: The wave destroyed the harbour.", answer: "The harbour was destroyed by the wave." },
          { q: "Rewrite in the passive: Rescuers found three families on the roof.", answer: "Three families were found on the roof (by rescuers)." },
          { q: "Correct the mistake: The volcano was erupt in 1980.", answer: "The volcano erupted in 1980. (or: The eruption was recorded in 1980.)" },
          { q: "Correct the mistake: Storms is predicted by computers.", answer: "Storms are predicted by computers." },
          { q: "Write two passive sentences for a fact file about a natural force: one present, one past.", answer: "e.g. Tsunamis are caused by earthquakes under the sea. In 2004 many coasts were hit by a tsunami." },
        ],
      },
    ],
  },
];
