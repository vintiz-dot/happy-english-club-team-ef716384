import type { Slide } from "@/lib/lessonDecks/types";

// Creative-writing homework for Oxford Discover 2nd edition, Level 3, Unit 2
// "Games, Friends and Fun": one task per lesson, keyed by deck id.
// Every task has the class version (`base`) and one football edition. Which
// children get the football edition is chosen per class in the app (from the
// roster's interests), never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

export const odL3U2Creative: Record<string, Creative> = {
  // Lesson 1: invent a new game and write its rules
  "od2e-l3-u02-l1": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["kick", "tag", "skip", "bounce", "drop", "plain", "lake", "stream"],
      grammar: ["imperatives for rules", "because"],
    },
    base: {
      title: "A brand new game",
      task: "Invent a new game that can be played in a special place (by a lake, on a plain or beside a stream). Draw the place, name the game and write the rules.",
      steps: [
        "Draw the place and the people playing. Label two things.",
        "Give your game a name and say how many players it needs.",
        "Write four or five rules with action words: First, ... Then ... You win when ...",
        "Finish with one sentence that says why your game is fun.",
      ],
      frames: [
        "My game is called ___. It is for ___ players.",
        "First, you ___. Then you ___.",
        "You must not ___.",
        "You win when ___.",
        "It is fun because ___.",
      ],
      success: [
        "My game has a name, a place and four or five clear rules.",
        "I use at least four of our words (for example kick, bounce, lake, plain).",
        "My last sentence says why it is fun, with because.",
      ],
      challenge:
        "Think about safety. Add one rule that keeps the players safe near the water or the cliff, and say in a sentence why it is a good rule.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "A new game for the Gunners' training day",
          task: "Invent a new training game for Arsenal's young players to play on the pitch at the Emirates Stadium. Draw the pitch, name the game and write the rules.",
          steps: [
            "Draw the pitch and the players. Label two things.",
            "Give your game a name and say how many players it needs.",
            "Write four or five rules with action words: First, ... Then ... You win when ...",
            "Finish with one sentence that says why your game is fun for the team.",
          ],
          frames: [
            "My game is called ___. It is for ___ players.",
            "First, you ___ the ball. Then you ___.",
            "You must not ___.",
            "You win when ___.",
            "It is fun because ___.",
          ],
          success: [
            "My game has a name, a place and four or five clear rules.",
            "I use at least four of our words (for example kick, bounce, drop, tag).",
            "My last sentence says why it is fun, with because.",
          ],
          challenge:
            "Think about safety. Add one rule that keeps the players safe on the pitch, and say in a sentence why it is a good rule.",
        },
      },
    ],
  },

  // Lesson 2: evaluate the story and a game
  "od2e-l3-u02-l2": {
    kind: "creative",
    thinking: "Evaluate",
    uses: {
      words: ["toss", "landing", "balance", "boa constrictor", "bounce", "kick"],
      grammar: ["past simple to retell", "first, then, next, in the end", "because"],
    },
    base: {
      title: "Which game is the best?",
      task: "Choose the game from the story that you think is the best. Give it a score out of 10 and explain why. Say how you would make it even better.",
      steps: [
        "Write the name of the game and your score out of 10.",
        "Retell what happens in that part of the story in three sentences, in the past tense.",
        "Give two reasons for your score, one from the story and one from your own life.",
        "Say one way to make the game even better.",
      ],
      frames: [
        "I give ___ ___ out of 10.",
        "First, ___. Then, ___. In the end, ___.",
        "It is a great game because ___.",
        "In real life, I like it because ___.",
        "It would be even better if ___.",
      ],
      success: [
        "My score is clear and I give at least two reasons for it.",
        "My retelling uses the past tense and time words.",
        "My writing uses at least two words from the story (such as toss, landing or balance).",
      ],
      challenge:
        "Write the other side too: give one reason someone else could give a lower score, and answer it with a sentence that begins 'However, ...'.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Which game would the Gunners choose?",
          task: "Imagine the Arsenal players finding the red ball in the training ground at the Emirates Stadium. Choose the game from the story they would like best, give it a score out of 10 and explain why.",
          steps: [
            "Write the name of the game and your score out of 10.",
            "Retell what happens in that part of the story in three sentences, in the past tense.",
            "Give two reasons for your score, one from the story and one about football.",
            "Say one way to make the game even better for footballers.",
          ],
          frames: [
            "I give ___ ___ out of 10.",
            "First, ___. Then, ___. In the end, ___.",
            "The Gunners would like it because ___.",
            "It is like football because ___.",
            "It would be even better if ___.",
          ],
          success: [
            "My score is clear and I give at least two reasons for it.",
            "My retelling uses the past tense and time words.",
            "My writing uses at least two words from the story (such as toss, landing or balance).",
          ],
          challenge:
            "Write the other side too: give one reason someone else could give a lower score, and answer it with a sentence that begins 'However, ...'.",
        },
      },
    ],
  },

  // Lesson 3: compare and justify two ways of having fun (gerunds)
  "od2e-l3-u02-l3": {
    kind: "creative",
    thinking: "Compare and justify",
    uses: {
      words: ["skipping", "swimming", "dancing", "kicking", "running", "bouncing"],
      grammar: ["gerunds as the subject", "gerunds after like and enjoy", "because"],
    },
    base: {
      title: "Which is more fun?",
      task: "Compare two ways of having fun, for example swimming and dancing, or playing alone and playing with friends. Decide which is more fun for you and justify your choice with gerunds.",
      steps: [
        "Choose two ways of having fun and write them as gerunds.",
        "Write two sentences about each one with a gerund as the subject, for example 'Swimming is cool.'",
        "Write one sentence that says which one you enjoy more and why.",
        "Write a closing line that invites a friend to try your favorite.",
      ],
      frames: [
        "___ is fun because ___.",
        "___ is good for you, but ___ is better for ___.",
        "I enjoy ___ more than ___ because ___.",
        "I am good at ___, but I am not good at ___.",
        "Would you like to try ___ with me?",
      ],
      success: [
        "I use at least three gerunds correctly, with the right spelling.",
        "I use a gerund as the subject at least once and after like or enjoy at least once.",
        "My choice has a reason with because.",
      ],
      challenge:
        "Write a short argument for the other side: one sentence that a friend might say, and a sentence that begins 'However, ...' to answer it.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Training or match day?",
          task: "Compare two football activities, for example kicking a ball in the park and watching a match at the Emirates Stadium. Decide which is more fun for you and justify your choice with gerunds.",
          steps: [
            "Choose two football activities and write them as gerunds.",
            "Write two sentences about each one with a gerund as the subject, for example 'Kicking is fun.'",
            "Write one sentence that says which one you enjoy more and why.",
            "Write a closing line that invites a friend to join you.",
          ],
          frames: [
            "___ is fun because ___.",
            "___ is good for you, but ___ is better for ___.",
            "I enjoy ___ more than ___ because ___.",
            "I am good at ___, but I am not good at ___.",
            "Would you like to try ___ with me?",
          ],
          success: [
            "I use at least three gerunds correctly, with the right spelling.",
            "I use a gerund as the subject at least once and after like or enjoy at least once.",
            "My choice has a reason with because.",
          ],
          challenge:
            "Write a short argument for the other side: one sentence that a fan might say, and a sentence that begins 'However, ...' to answer it.",
        },
      },
    ],
  },

  // Lesson 4: argue and persuade a friend, with kind encouragement
  "od2e-l3-u02-l4": {
    kind: "creative",
    thinking: "Argue",
    uses: {
      words: ["get along", "get over", "get by", "get around", "who", "what", "where", "why", "how"],
      grammar: ["question words", "giving encouragement", "verb phrases with get"],
    },
    base: {
      title: "Come and play with us!",
      task: "Write a short conversation in which you persuade a nervous friend to join your game. Use questions to find out what worries them, and use kind words to give them courage.",
      steps: [
        "Choose a game and a friend who is nervous about trying it (an invented friend is fine).",
        "Write at least three questions with question words that find out why they are nervous.",
        "Write two or three sentences of encouragement that answer the worry.",
        "End the conversation with the friend joining and one sentence about why the game is fun.",
      ],
      frames: [
        "Why don't you want to play?",
        "What are you worried about?",
        "Don't worry! You can do it. I'll help you.",
        "At first it's hard, but you will get better.",
        "We all get along, so it will be fun!",
      ],
      success: [
        "My questions use a question word and do / does / did correctly.",
        "My encouragement is kind and gives a reason.",
        "I use at least one verb phrase with get.",
      ],
      challenge:
        "Write a second round: the friend says another worry, and you answer it with a different reason. Use because or so in your answer.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Join our football team!",
          task: "Write a short conversation in which you persuade a nervous friend to join your football game at the park. Use questions to find out what worries them, and use kind words to give them courage.",
          steps: [
            "Choose a football game and a friend who is nervous about trying it (an invented friend is fine).",
            "Write at least three questions with question words that find out why they are nervous.",
            "Write two or three sentences of encouragement that answer the worry.",
            "End the conversation with the friend joining and one sentence about why football is fun.",
          ],
          frames: [
            "Why don't you want to play?",
            "What are you worried about?",
            "Don't worry! You can do it. I'll pass you the ball.",
            "At first it's hard, but you will get better.",
            "We all get along, so it will be fun!",
          ],
          success: [
            "My questions use a question word and do / does / did correctly.",
            "My encouragement is kind and gives a reason.",
            "I use at least one verb phrase with get.",
          ],
          challenge:
            "Write a second round: the friend says another worry, and you answer it with a different reason. Use because or so in your answer.",
        },
      },
    ],
  },

  // Lesson 5: create a short play about fun
  "od2e-l3-u02-l5": {
    kind: "creative",
    thinking: "Create",
    uses: {
      words: ["festival", "fair", "lake", "canyon", "kick", "tag", "skip", "bounce"],
      grammar: ["gerunds", "question words", "giving encouragement"],
    },
    base: {
      title: "The Great Fun Day",
      task: "Write a short play about a day when three friends try something new that turns out to be very fun. Show the places, what the characters say and do, and why the day was fun.",
      steps: [
        "Name three characters and the place where the play happens.",
        "Write the speech: each line starts with the name and a colon. Put actions in brackets.",
        "Use at least two gerunds, one question with a question word and one line of encouragement.",
        "End with a line that tells why it was the most fun day.",
      ],
      frames: [
        "(Tara runs in.) Hi! What are we doing today?",
        "I'd like to go ___. ___ is my favorite thing to do.",
        "Why don't we ___? / Don't worry, you can do it!",
        "(They ___ and laugh.)",
        "That was the most fun day because ___.",
      ],
      success: [
        "My play has a title, a list of characters and speech with brackets for actions.",
        "I use at least two gerunds and a question with a question word.",
        "The ending says why the day was fun.",
      ],
      challenge:
        "Add a surprise: something goes wrong (rain, a lost ball) and the characters fix it with kindness and a clever idea.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "The Great Match Day",
          task: "Write a short play about three friends who go to a match day at the Emirates Stadium and discover something new that makes it very fun. Show what the characters say and do, and why the day was fun.",
          steps: [
            "Name three characters and the place where the play happens.",
            "Write the speech: each line starts with the name and a colon. Put actions in brackets.",
            "Use at least two gerunds, one question with a question word and one line of encouragement.",
            "End with a line that tells why it was the most fun day.",
          ],
          frames: [
            "(Tara runs in.) Hi! What are we doing today?",
            "I'd like to go to ___. ___ is my favorite thing to do.",
            "Why don't we ___? / Don't worry, you can do it!",
            "(They ___ and cheer.)",
            "That was the most fun day because ___.",
          ],
          success: [
            "My play has a title, a list of characters and speech with brackets for actions.",
            "I use at least two gerunds and a question with a question word.",
            "The ending says why the day was fun.",
          ],
          challenge:
            "Add a surprise: something goes wrong (rain, a lost ticket) and the characters fix it with kindness and a clever idea.",
        },
      },
    ],
  },

  // Lesson 6 (Grammar Champions): design a new game and explain why people would have fun
  "od2e-l3-u02-l6": {
    kind: "creative",
    thinking: "Design",
    uses: {
      words: ["skipping", "swimming", "dancing", "bouncing", "kicking", "lake", "plain", "cliff"],
      grammar: ["gerunds as the subject", "gerunds after enjoy and good at", "because and so"],
    },
    base: {
      title: "Our new game",
      task: "Design a new game for children to play at a lake, on a plain or in a park. Name it, draw it, write its rules and explain why people will have fun playing it.",
      steps: [
        "Give your game a name and draw a picture of children playing it.",
        "Write three rules. Start two of them with a gerund, for example 'Hopping is not allowed.'",
        "Write one sentence about what players enjoy doing in your game, and one about what players need to be good at.",
        "Add because to say why your game is fun and so to say what the players do next.",
        "Finish with a sentence that invites a friend to play.",
      ],
      frames: [
        "___ing is the best part of my game because ___.",
        "Players enjoy ___ing, so ___.",
        "You need to be good at ___ing to ___.",
        "___ing and ___ing are both important, so ___ ___.",
        "Would you like to play my game with me?",
      ],
      success: [
        "I used at least four gerunds with the right spelling.",
        "I used a gerund as the subject, after enjoy, and after good at.",
        "I used are after two gerunds joined with and.",
        "I gave a reason with because and a result with so.",
      ],
      challenge:
        "Write a second version of your game for children who do not want to run, and say one thing that is the same and one that is different.",
    },
    variants: [
      {
        interest: "football",
        label: "Football edition",
        task: {
          title: "Our new football game",
          task: "Design a new football game for children to play on a plain or in a park. Name it, draw it, write its rules and explain why people will have fun playing it.",
          steps: [
            "Give your football game a name and draw a picture of the players.",
            "Write three rules. Start two of them with a gerund, for example 'Kicking the ball with your hands is not allowed.'",
            "Write one sentence about what players enjoy doing in your game, and one about what players need to be good at.",
            "Add because to say why your game is fun and so to say what the players do next.",
            "Finish with a sentence that invites a teammate to play.",
          ],
          frames: [
            "___ing is the best part of my game because ___.",
            "Players enjoy ___ing, so ___.",
            "You need to be good at ___ing to ___.",
            "___ing and ___ing are both important, so ___ ___.",
            "Would you like to play my game with me?",
          ],
          success: [
            "I used at least four gerunds with the right spelling.",
            "I used a gerund as the subject, after enjoy, and after good at.",
            "I used are after two gerunds joined with and.",
            "I gave a reason with because and a result with so.",
          ],
          challenge:
            "Write a second version of your game for a rainy day indoors, and say one thing that is the same and one that is different.",
        },
      },
    ],
  },
};
