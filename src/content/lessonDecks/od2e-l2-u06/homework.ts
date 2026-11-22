import type { Slide } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 6 "Travel Long Ago and
// Now": one task per lesson, keyed by deck id, for children of about 7-9 (draw first, then
// write two to four short sentences). Every task has the class version (`base`) and one
// football edition; which children get the football edition is chosen per class in the app,
// never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL2U06Creative: Record<string, Creative> = {
  // Lesson 1: travel words and the order of events
  "od2e-l2-u06-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["arrive", "visit", "ask", "check", "enter", "crowded"],
      grammar: ["First, Next, Last", "I will ...", "because"],
    },
    base: {
      title: "A trip I would like to take",
      task: "Plan a trip you would like to take. Draw three pictures in order and write one short sentence under each.",
      steps: [
        "Choose a place to visit.",
        "Draw three pictures and number them 1, 2 and 3.",
        "Write one sentence under each with First, Next and Last.",
        "Say why you chose that trip.",
      ],
      frames: ["First, we ___.", "Next, we ___.", "Last, we ___.", "I chose this trip because ___."],
      success: [
        "I can draw three pictures in order.",
        "I can use First, Next and Last.",
        "I can say why I chose the trip.",
      ],
      challenge: "Add a problem on the trip, for example a crowded bus, and say how you solve it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A trip to see the Gunners",
          task: "Plan a trip to watch Arsenal at the Emirates Stadium. Draw three pictures in order and write one short sentence under each.",
          steps: [
            "Choose how you travel to the stadium.",
            "Draw three pictures and number them 1, 2 and 3.",
            "Write one sentence under each with First, Next and Last.",
            "Say why you chose that trip.",
          ],
          frames: ["First, we ___.", "Next, we ___.", "Last, we ___.", "I chose this trip because ___."],
          success: [
            "I can draw three pictures in order.",
            "I can use First, Next and Last.",
            "I can say why I chose the trip.",
          ],
          challenge: "Add a problem on match day, for example a crowded street, and say how you solve it.",
        },
      },
    ],
  },

  // Lesson 2: Tell Me a Story, Grandpa (reading)
  "od2e-l2-u06-l2": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["arrive", "poor", "sick", "crowded", "visit", "ask"],
      grammar: ["He / she + verb-ed", "It was ...", "because"],
    },
    base: {
      title: "A postcard to cheer someone up",
      task: "Write a postcard from a traveller on a long ship journey. Draw the picture side and write the message.",
      steps: [
        "Draw the picture side of the postcard: the ship and the sea.",
        "Write three sentences on the message side: what you see, what it is like and how you feel.",
        "Write one kind thing to cheer up the person who gets it.",
      ],
      frames: ["I see ___.", "It is ___ here.", "I feel ___ because ___.", "Please don't be ___."],
      success: [
        "I can draw a postcard picture.",
        "I can write what I see and how I feel.",
        "I can write one kind sentence.",
      ],
      challenge: "Write a reply from the person who gets the postcard, with two sentences.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A postcard from an away match",
          task: "Write a postcard from a Gunners fan on a long trip to an away match. Draw the picture side and write the message.",
          steps: [
            "Draw the picture side of the postcard: the coach or the train and the Arsenal scarf.",
            "Write three sentences on the message side: what you see, what it is like and how you feel.",
            "Write one kind thing to cheer up the person at home.",
          ],
          frames: ["I see ___.", "It is ___ here.", "I feel ___ because ___.", "Please don't be ___."],
          success: [
            "I can draw a postcard picture.",
            "I can write what I see and how I feel.",
            "I can write one kind sentence.",
          ],
          challenge: "Write a reply from the person at home, with two sentences.",
        },
      },
    ],
  },

  // Lesson 3: Did you travel by ship?
  "od2e-l2-u06-l3": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["visit", "arrive", "ask", "enter", "check", "travel"],
      grammar: ["Did you ...? Yes, I did. / No, I didn't.", "verb + -ed", "Where / How did you ...?"],
    },
    base: {
      title: "The best part of my day",
      task: "Draw three things you did yesterday. Write a sentence for each and choose the best part.",
      steps: [
        "Draw three pictures of yesterday.",
        "Write one sentence under each with -ed, for example I walked to school.",
        "Choose the best part of your day.",
        "Write one question you could ask a friend with Did you ...?",
      ],
      frames: ["I ___ed to ___.", "I ___ed my ___.", "The best part was ___ because ___.", "Did you ___?"],
      success: [
        "I can use three -ed verbs.",
        "I can write a question with Did you ...?",
        "I can say what was the best part and why.",
      ],
      challenge: "Ask someone at home your question and write their answer in a full sentence.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A match day I watched",
          task: "Draw three things you did on a day you watched or played football. Write a sentence for each and choose the best part.",
          steps: [
            "Draw three pictures of the day, for example watching the Gunners on TV.",
            "Write one sentence under each with -ed, for example I watched the match.",
            "Choose the best part of the day.",
            "Write one question you could ask a friend with Did you ...?",
          ],
          frames: ["I ___ed to ___.", "I ___ed the ___.", "The best part was ___ because ___.", "Did you ___?"],
          success: [
            "I can use three -ed verbs.",
            "I can write a question with Did you ...?",
            "I can say what was the best part and why.",
          ],
          challenge: "Ask someone at home your question and write their answer in a full sentence.",
        },
      },
    ],
  },

  // Lesson 4: things in a home, then and now
  "od2e-l2-u06-l4": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["couch", "chair", "lamp", "clock", "bathtub", "sink", "visit"],
      grammar: ["verb + -ed (visited, played)", "Long ago, ... Now, ...", "because"],
    },
    base: {
      title: "A room, then and now",
      task: "Imagine a time machine takes you to a room a hundred years ago. Draw the room long ago and now, and say which you like more.",
      steps: [
        "Draw the room long ago on the left and the room now on the right.",
        "Put two things from today in each room, for example a lamp and a clock.",
        "Write three sentences with -ed: what you visited, saw and did.",
        "Say which room you like more and why.",
      ],
      frames: ["I visited a ___.", "I saw a ___.", "Long ago, the ___ was ___. Now it is ___.", "I like the ___ room more because ___."],
      success: [
        "I can draw a room then and now.",
        "I can use -ed verbs correctly.",
        "I can say which I like more and why.",
      ],
      challenge: "Say one thing in the old room that was better than now.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A fan's room, then and now",
          task: "Imagine a time machine takes you to a football fan's room a hundred years ago. Draw the room long ago and now, and say which you like more.",
          steps: [
            "Draw the fan's room long ago on the left and an Arsenal fan's room now on the right.",
            "Put two things from today in each room, for example a lamp and a clock.",
            "Write three sentences with -ed: what you visited, saw and did.",
            "Say which room you like more and why.",
          ],
          frames: ["I visited a ___.", "I saw a ___.", "Long ago, the ___ was ___. Now it is ___.", "I like the ___ room more because ___."],
          success: [
            "I can draw a room then and now.",
            "I can use -ed verbs correctly.",
            "I can say which I like more and why.",
          ],
          challenge: "Say one thing in the old room that was better than now.",
        },
      },
    ],
  },

  // Lesson 5: wrap up Units 5 and 6
  "od2e-l2-u06-l5": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["travel", "news", "clock", "lamp", "arrive", "poor", "crowded"],
      grammar: ["It will ...", "Long ago, ... Now ...", "because"],
    },
    base: {
      title: "A machine for a hundred years from now",
      task: "Design a machine that will make life easier a hundred years from now. Draw it and write what it does.",
      steps: [
        "Draw your machine and give it a name.",
        "Label two parts.",
        "Write three sentences: what it is called, what it does and how it is different from today.",
        "Say why people will like it.",
      ],
      frames: ["My machine is called ___.", "It helps people ___.", "Long ago, people ___ed. Now we ___.", "People will like it because ___."],
      success: [
        "I can draw and label my machine.",
        "I can say what it does.",
        "I can say how it is different from today.",
      ],
      challenge: "Say one problem your machine might cause and how you would fix it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A machine for a match day",
          task: "Design a machine that will make match day easier for fans a hundred years from now. Draw it and write what it does.",
          steps: [
            "Draw your machine and give it a name.",
            "Label two parts.",
            "Write three sentences: what it is called, what it does and how it is different from today.",
            "Say why Gunners fans will like it.",
          ],
          frames: ["My machine is called ___.", "It helps fans ___.", "Long ago, fans ___ed. Now we ___.", "Fans will like it because ___."],
          success: [
            "I can draw and label my machine.",
            "I can say what it does.",
            "I can say how it is different from today.",
          ],
          challenge: "Say one problem your machine might cause at the stadium and how you would fix it.",
        },
      },
    ],
  },
};
