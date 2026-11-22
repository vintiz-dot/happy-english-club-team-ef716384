// Reach Higher 3A, Unit 4: printable grammar worksheets for Jupiter, in three
// tiers with an answer key. The school's own items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const rhL3U4Worksheets: Worksheet[] = [
  {
    id: "rh-l3-u4-ws-verb-patterns",
    title: "Verb patterns: to + verb, verb-ing, bare verb",
    grammar: "verb patterns: to + verb / verb-ing / bare verb",
    deckId: "rh-l3-u4-l1",
    slide: "Verb patterns: to + verb, verb-ing, bare verb",
    intro:
      "Some verbs take to + verb (decide to, agree to, want to). Some take verb-ing (enjoy, finish, mind). Some take the bare verb (let, make, can). Learn each verb with its pattern.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "We decided ___ together. (to work / working)  ->  to work",
        items: [
          { q: "I enjoy ___ with my team.", options: ["working", "to work"], answer: "working" },
          { q: "She agreed ___ us.", options: ["to help", "helping"], answer: "to help" },
          { q: "They finished ___ the poster.", options: ["making", "to make"], answer: "making" },
          { q: "I want ___ the winning team.", options: ["to join", "joining"], answer: "to join" },
          { q: "Our teacher let us ___ the game.", options: ["choose", "to choose"], answer: "choose" },
          { q: "Do you mind ___ the table?", options: ["moving", "to move"], answer: "moving" },
          { q: "We hope ___ the prize.", options: ["to win", "winning"], answer: "to win" },
          { q: "Which is correct?", options: ["He enjoys to cook.", "He enjoys cooking."], answer: "He enjoys cooking." },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the right form.",
        example: "We decided (cook) a meal.  ->  to cook",
        items: [
          { q: "The team practised (pass) the ball.", answer: "passing" },
          { q: "Mum agreed (take) us to the market.", answer: "to take" },
          { q: "My brother can't stand (wait).", answer: "waiting" },
          { q: "The coach made us (run) twice.", answer: "run" },
          { q: "We managed (finish) before dark.", answer: "to finish" },
          { q: "Correct the mistake: She suggested to go home.", answer: "She suggested going home." },
          { q: "Correct the mistake: I look forward to see you.", answer: "I look forward to seeing you." },
          { q: "Correct the mistake: He let me to borrow his pen.", answer: "He let me borrow his pen." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one sentence about teamwork using the verb in brackets with the right pattern.",
        example: "(decide) We decided to cook for Grandma.",
        items: [
          { q: "(enjoy) working in a group", answer: "Any correct sentence, e.g. I enjoy working in a group." },
          { q: "(agree) a plan", answer: "Any correct sentence, e.g. We agreed to meet at six." },
          { q: "(finish) a job", answer: "Any correct sentence, e.g. We finished cleaning the balcony." },
          { q: "(let) a family rule", answer: "Any correct sentence, e.g. My parents let me stay up at Tet." },
          { q: "(hope) a challenge", answer: "Any correct sentence, e.g. I hope to win the challenge." },
          { q: "Write one sentence with both an -ing verb and a to-verb.", answer: "Any correct sentence, e.g. I enjoy cooking, so I decided to join the cooking club." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u4-ws-modals",
    title: "Helping (modal) verbs",
    grammar: "modal verbs: must, mustn't, should, don't have to, could",
    deckId: "rh-l3-u4-l5",
    slide: "Helping (modal) verbs",
    intro:
      "must = a strong rule or need. mustn't = it is forbidden. don't have to = it is not necessary. should = good advice. could = a possible idea. A modal is followed by the bare verb: You must water the plants.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "You ___ run in the lab. It is forbidden. (mustn't / don't have to)  ->  mustn't",
        items: [
          { q: "You ___ wear a helmet. It is the law.", options: ["must", "could"], answer: "must" },
          { q: "You ___ bring lunch. The school gives it to you.", options: ["don't have to", "mustn't"], answer: "don't have to" },
          { q: "You ___ drink more water. It is good advice.", options: ["should", "mustn't"], answer: "should" },
          { q: "You ___ pick the flowers. It is not allowed.", options: ["mustn't", "don't have to"], answer: "mustn't" },
          { q: "We ___ save water by using a bucket. (an idea)", options: ["could", "must"], answer: "could" },
          { q: "She must ___ early.", options: ["get up", "to get up"], answer: "get up" },
          { q: "He ___ water the plants every day. It is not necessary.", options: ["doesn't have to", "mustn't"], answer: "doesn't have to" },
          { q: "Which is correct?", options: ["You should to rest.", "You should rest."], answer: "You should rest." },
        ],
      },
      {
        level: "Core",
        instructions: "Write must, mustn't, should, don't have to or could.",
        example: "You ___ walk on the seedlings. They will break.  ->  mustn't",
        items: [
          { q: "Plants ___ get light, or they die. (necessary)", answer: "must" },
          { q: "You ___ buy expensive pots. Old bottles work. (not necessary)", answer: "don't have to" },
          { q: "You ___ use too much water. It is a waste. (advice not to)", answer: "shouldn't" },
          { q: "We ___ collect rain in a bucket. (a possible idea)", answer: "could" },
          { q: "You ___ touch the chemicals. They are dangerous.", answer: "mustn't" },
          { q: "Rewrite with a modal: It is necessary to water the seedlings daily.", answer: "You must water the seedlings daily." },
          { q: "Correct the mistake: You mustn't to pick the fruit yet.", answer: "You mustn't pick the fruit yet." },
          { q: "Correct the mistake: She musts water the plants.", answer: "She must water the plants." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write a rule or piece of advice for a balcony garden using the modal in brackets. Give a reason with because.",
        example: "(must) You must give the plants light because they cannot grow in the dark.",
        items: [
          { q: "(must)", answer: "Any correct sentence with a reason, e.g. You must water the soil because it dries quickly." },
          { q: "(mustn't)", answer: "Any correct sentence with a reason, e.g. You mustn't overwater because the roots will rot." },
          { q: "(should)", answer: "Any correct sentence with a reason, e.g. You should use small pots because the balcony is narrow." },
          { q: "(don't have to)", answer: "Any correct sentence with a reason, e.g. You don't have to buy compost because you can use old leaves." },
          { q: "(could)", answer: "Any correct sentence with a reason, e.g. You could collect rain because it saves water." },
          { q: "Write a myth: something people think they must do but don't have to.", answer: "Any correct sentence, e.g. You don't have to water every day when it rains." },
        ],
      },
    ],
  },
  {
    id: "rh-l3-u4-ws-second-conditional",
    title: "The second conditional",
    grammar: "second conditional (if + past simple, would + verb)",
    deckId: "rh-l3-u4-l6",
    slide: "The second conditional",
    intro:
      "Use if + past simple, would + verb for an unreal or unlikely situation: If I were the minister, I would build more farms. After if, use were for I, he, she and it.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the best answer.",
        example: "If I ___ rich, I would help farmers. (were / am)  ->  were",
        items: [
          { q: "If farmers had more water, they ___ more rice.", options: ["would grow", "will grow"], answer: "would grow" },
          { q: "If I ___ the minister, I would plant trees.", options: ["were", "am"], answer: "were" },
          { q: "If we ___ a bigger garden, we would grow vegetables.", options: ["had", "have"], answer: "had" },
          { q: "She would be happy if she ___ a pet.", options: ["had", "has"], answer: "had" },
          { q: "What ___ you do if you saw a lost child?", options: ["would", "will"], answer: "would" },
          { q: "If it rained less, the crops ___ dry.", options: ["would be", "will be"], answer: "would be" },
          { q: "Which is a real, likely situation?", options: ["If it rains tomorrow, we will stay in.", "If I were a bird, I would fly."], answer: "If it rains tomorrow, we will stay in." },
          { q: "Which is correct?", options: ["If I would have a robot, I would clean.", "If I had a robot, I would clean."], answer: "If I had a robot, I would clean." },
        ],
      },
      {
        level: "Core",
        instructions: "Put the verb in brackets in the right form.",
        example: "If I (have) a boat, I (visit) the island.  ->  had / would visit",
        items: [
          { q: "If the school (have) a farm, the children (learn) about crops.", answer: "had / would learn" },
          { q: "If I (be) the minister, I (build) cold stores.", answer: "were / would build" },
          { q: "She (not waste) food if she (be) a farmer.", answer: "wouldn't waste / were" },
          { q: "What (you do) if you (find) a seed bank?", answer: "would you do / found" },
          { q: "If farmers (use) drones, they (save) time.", answer: "used / would save" },
          { q: "Rewrite as a second conditional: I am not a farmer, so I don't grow rice.", answer: "If I were a farmer, I would grow rice." },
          { q: "Correct the mistake: If I was rich, I will build a farm.", answer: "If I were rich, I would build a farm." },
          { q: "Correct the mistake: If we had more land, we would grew more.", answer: "If we had more land, we would grow more." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one second-conditional sentence for each idea, with a reason.",
        example: "Food for Vietnam  ->  If I were the minister, I would teach children to grow food because they would value it.",
        items: [
          { q: "Farmers get free water.", answer: "Any correct sentence, e.g. If farmers had free water, they would grow more rice because crops would not dry out." },
          { q: "Every school has a garden.", answer: "Any correct sentence, e.g. If every school had a garden, children would eat more vegetables." },
          { q: "People waste no food.", answer: "Any correct sentence, e.g. If people wasted no food, there would be less rubbish." },
          { q: "Cities grow vegetables on roofs.", answer: "Any correct sentence, e.g. If cities grew vegetables on roofs, food would travel less." },
          { q: "You are a farmer for a day.", answer: "Any correct sentence, e.g. If I were a farmer for a day, I would get up at five." },
          { q: "Write a question to ask a farmer.", answer: "Any correct question, e.g. What would you change if you had more money?" },
        ],
      },
    ],
  },
];
