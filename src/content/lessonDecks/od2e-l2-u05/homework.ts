import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 5 "Then and Now": one
// task per lesson, keyed by deck id, for children of about 7-9 (draw first, then write two
// to four short sentences). Every task has the class version (`base`) and one football
// edition; which children get the football edition is chosen per class in the app, never
// written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U05Creative: Record<string, Creative> = {
  // Lesson 1: travel, communication and news
  "od2e-l2-u05-l1": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["letter", "text message", "e-mail", "radio", "news", "Internet", "communication"],
      grammar: ["I think ... is better because ...", "Now we can ...", "Long ago, people ..."],
    },
    base: {
      title: "The best way to send news",
      task: "Choose the best way to send news to a friend. Draw two ways and say which one is better.",
      steps: [
        "Choose two ways to send news, for example a letter and a text message.",
        "Draw each way in a box.",
        "Write one sentence about each way.",
        "Choose the better one and say why.",
      ],
      frames: ["A letter is ___.", "A text message is ___.", "I think ___ is better because ___.", "Now we can ___."],
      success: [
        "I can draw two ways to send news.",
        "I can write one sentence about each one.",
        "I can say which is better and why.",
      ],
      challenge: "Say when the other way would be better, for example for a birthday.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The fastest way to hear the score",
          task: "Choose the best way to hear the score of an Arsenal match. Draw two ways and say which one is better.",
          steps: [
            "Choose two ways to hear the score, for example the radio and a text message.",
            "Draw each way in a box.",
            "Write one sentence about each way.",
            "Choose the better one and say why.",
          ],
          frames: ["The radio is ___.", "A text message is ___.", "I think ___ is better because ___.", "Now we can ___."],
          success: [
            "I can draw two ways to hear the score.",
            "I can write one sentence about each one.",
            "I can say which is better and why.",
          ],
          challenge: "Say when the other way would be better, for example in a car.",
        },
      },
    ],
  },

  // Lesson 2: reading, a letter that takes a long time
  "od2e-l2-u05-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["letter", "news", "travel", "airplane", "communication", "e-mail"],
      grammar: ["Long ago, ...", "Now ...", "because"],
    },
    base: {
      title: "A letter from long ago",
      task: "Write a short letter to a friend as if you lived long ago. Draw the envelope and say what you tell your friend.",
      steps: [
        "Draw an envelope with a stamp.",
        "Write Dear ___ at the top of a small paper.",
        "Write two or three sentences of news.",
        "Say why the news is important.",
      ],
      frames: ["Dear ___,", "I have news. ___.", "It is important because ___.", "Please write back soon."],
      success: [
        "I can draw an envelope.",
        "I can write two or three sentences of news.",
        "I can say why the news is important.",
      ],
      challenge: "Add a sentence about how long your letter will take to arrive, and what you will do while you wait.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A letter about the match",
          task: "Write a short letter to a friend as if you lived long ago and saw the Gunners play. Draw the envelope and say what you tell your friend.",
          steps: [
            "Draw an envelope with a stamp.",
            "Write Dear ___ at the top of a small paper.",
            "Write two or three sentences of news about the match.",
            "Say why the match was exciting.",
          ],
          frames: ["Dear ___,", "I have news. The Gunners ___.", "It was exciting because ___.", "Please write back soon."],
          success: [
            "I can draw an envelope.",
            "I can write two or three sentences of news.",
            "I can say why the match was exciting.",
          ],
          challenge: "Add a sentence about how long your letter will take to arrive, and what the news will be by then.",
        },
      },
    ],
  },

  // Lesson 3: simple past with -ed and didn't
  "od2e-l2-u05-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["travel", "letter", "radio", "news", "airplane", "communication"],
      grammar: ["verb + -ed (listened, travelled)", "didn't + plain verb", "long ago, yesterday"],
    },
    base: {
      title: "A day long ago",
      task: "Make up a person from long ago, for example a sailor or a letter carrier. Draw them and write what they did and did not do.",
      steps: [
        "Choose a job from long ago and draw the person.",
        "Write two sentences with -ed: what they did.",
        "Write one sentence with didn't: what they did not do.",
        "Say if you would like their job and why.",
      ],
      frames: ["Long ago, the ___ ___ed.", "They ___ed to the ___.", "They didn't ___.", "I would like this job because ___."],
      success: [
        "I can use two -ed verbs correctly.",
        "I can use didn't with a plain verb, for example didn't watch.",
        "I can say what I think and why.",
      ],
      challenge: "Add two more sentences that say what is different now.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match day long ago",
          task: "Make up a football fan from long ago. Draw them and write what they did and did not do on a match day.",
          steps: [
            "Draw a fan from long ago going to watch the Gunners.",
            "Write two sentences with -ed: what they did.",
            "Write one sentence with didn't: what they did not do.",
            "Say if you would like to be that fan and why.",
          ],
          frames: ["Long ago, the fan ___ed.", "They ___ed to the ___.", "They didn't ___.", "I would like to be that fan because ___."],
          success: [
            "I can use two -ed verbs correctly.",
            "I can use didn't with a plain verb, for example didn't watch.",
            "I can say what I think and why.",
          ],
          challenge: "Add two more sentences that say what is different for fans now.",
        },
      },
    ],
  },

  // Lesson 4: transport, asking to repeat
  "od2e-l2-u05-l4": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["boat", "bus", "motorcycle", "cable car", "truck", "horse", "travel"],
      grammar: ["Long ago, people ...ed", "People didn't ...", "Now we ..."],
    },
    base: {
      title: "A new way to travel",
      task: "Design a new way to travel for the future. Draw it, label it and say how it is different from long ago.",
      steps: [
        "Draw your new way to travel.",
        "Label two parts.",
        "Write three sentences: what it is, what people did long ago, and why yours is better.",
        "Say which you like more, an old way or a new way.",
      ],
      frames: ["My new way to travel is called ___.", "Long ago, people ___ed.", "They didn't ___.", "Mine is better because ___."],
      success: [
        "I can draw and label my idea.",
        "I can say what people did long ago.",
        "I can give a reason with because.",
      ],
      challenge: "Say one thing that is not so good about your idea, and how you would fix it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A new way to the stadium",
          task: "Design a new way to travel to the Emirates Stadium. Draw it, label it and say how it is different from long ago.",
          steps: [
            "Draw your new way to travel to the match.",
            "Label two parts.",
            "Write three sentences: what it is, what fans did long ago, and why yours is better.",
            "Say which you like more, an old way or a new way.",
          ],
          frames: ["My new way to the match is called ___.", "Long ago, fans ___ed.", "They didn't ___.", "Mine is better because ___."],
          success: [
            "I can draw and label my idea.",
            "I can say what fans did long ago.",
            "I can give a reason with because.",
          ],
          challenge: "Say one thing that is not so good about your idea, and how you would fix it.",
        },
      },
    ],
  },
};
