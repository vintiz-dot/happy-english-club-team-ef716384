import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 14 "Music and
// Feelings" (the Olga's Flute unit): one task per lesson, keyed by deck id. The children
// are 7-8, so every task is draw-then-write: a picture first, then two to four short
// sentences. Every task has the class version (`base`) and one football edition; which
// children get the football edition is chosen per class in the app, never written here.
// All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const creative = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative",
  thinking,
  uses: { words, grammar },
  base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL2U14Creative: Record<string, Creative> = {
  // Lesson 1: music words, main and secondary characters
  "od2e-l2-u14-l1": creative(
    "Create",
    ["musician", "notes", "solo", "worried", "record", "hummingbird"],
    ["main character and secondary character", "She / He plays ___.", "She / He feels ___."],
    {
      title: "My musician and a friend",
      task: "Invent a musician and a second character. Draw them, then write short sentences. Say who is the main character.",
      steps: [
        "Invent a musician. Draw them with an instrument.",
        "Invent a second character, for example a friend or a bird.",
        "Write what the musician plays and how the musician feels.",
        "Say which one is the main character and which one is the secondary character.",
      ],
      frames: [
        "My musician plays the ___.",
        "He / She feels ___.",
        "The main character is ___.",
        "The secondary character is ___.",
      ],
      success: [
        "My picture has two characters.",
        "I said what the musician plays and how he or she feels.",
        "I said who is the main character.",
      ],
      challenge: "Add one more sentence: what does the second character say to the musician? Use because.",
    },
    {
      title: "The band at the stadium",
      task: "Invent a musician who plays before a match at the Emirates Stadium. Invent a second character, for example a fan. Draw them, then write short sentences.",
      steps: [
        "Invent a musician for match day at the Emirates Stadium. Draw them with an instrument.",
        "Invent a second character: a young Gunners fan.",
        "Write what the musician plays and how the musician feels.",
        "Say which one is the main character and which one is the secondary character.",
      ],
      frames: [
        "The musician plays the ___.",
        "He / She feels ___.",
        "The main character is ___.",
        "The secondary character is ___.",
      ],
      success: [
        "My picture has two characters and the stadium.",
        "I said what the musician plays and how he or she feels.",
        "I said who is the main character.",
      ],
      challenge: "Add one more sentence: what does the fan say to the musician? Use because.",
    },
  ),

  // Lesson 2: Olga's Flute, feelings of a character
  "od2e-l2-u14-l2": creative(
    "Evaluate",
    ["worried", "solo", "notes", "tears", "record", "musician"],
    ["She feels ___ because ___.", "I think ___ is the best idea because ___."],
    {
      title: "How can we help Olga?",
      task: "Olga is worried before her solo. Think of three ways to help her. Choose the best one and say why.",
      steps: [
        "Draw Olga with her flute. Show how she feels.",
        "Think of three ways to help her feel better, for example a hug, a kind word or a deep breath.",
        "Choose the best idea.",
        "Write two or three sentences to say why it is the best.",
      ],
      frames: [
        "Olga feels ___ because ___.",
        "We can ___.",
        "I think ___ is the best idea.",
        "It helps because ___.",
      ],
      success: [
        "I said how Olga feels.",
        "I wrote three ideas and chose one.",
        "I gave a reason with because.",
      ],
      challenge: "Write what Mr. Perez could say to Olga. Use a kind sentence and a reason.",
    },
    {
      title: "How can we help a young fan?",
      task: "An invented young fan is worried before she sings a solo at the Emirates Stadium. Think of three ways to help. Choose the best one and say why.",
      steps: [
        "Draw the young fan with a microphone. Show how she feels.",
        "Think of three ways to help her feel better, for example a smile, a kind word or a deep breath.",
        "Choose the best idea.",
        "Write two or three sentences to say why it is the best.",
      ],
      frames: [
        "The fan feels ___ because ___.",
        "We can ___.",
        "I think ___ is the best idea.",
        "It helps because ___.",
      ],
      success: [
        "I said how the fan feels.",
        "I wrote three ideas and chose one.",
        "I gave a reason with because.",
      ],
      challenge: "Write what the Gunners fans could shout to help her. Use a kind sentence and a reason.",
    },
  ),

  // Lesson 3: time words, yesterday and last night
  "od2e-l2-u14-l3": creative(
    "Design",
    ["yesterday", "last night", "this morning", "played", "listened", "practiced"],
    ["yesterday morning / last night / this morning", "verb + -ed", "Did you ...? Yes, I did."],
    {
      title: "My yesterday map",
      task: "Make a map of your yesterday with three stops. Draw each stop and write one sentence with a time word.",
      steps: [
        "Draw a path with three stops: morning, afternoon and night.",
        "Draw what you did at each stop.",
        "Write one sentence for each stop with a time word.",
        "Use a verb with -ed, for example played, listened or practiced.",
      ],
      frames: [
        "Yesterday morning, I ___.",
        "Yesterday afternoon, I played ___.",
        "Last night, I listened to ___.",
        "Did you ___ yesterday? Yes, I did.",
      ],
      success: [
        "My map has three stops.",
        "I used three different time words.",
        "I used verbs with -ed.",
      ],
      challenge: "Add a fourth stop: this morning. Then write a question for a friend with Did you ...?",
    },
    {
      title: "My match day yesterday",
      task: "Make a map of a match day yesterday with three stops. Draw each stop and write one sentence with a time word.",
      steps: [
        "Draw a path with three stops: the walk to the Emirates Stadium, the match and the walk home.",
        "Draw what you did at each stop.",
        "Write one sentence for each stop with a time word.",
        "Use a verb with -ed, for example played, listened or cheered.",
      ],
      frames: [
        "Yesterday morning, I ___.",
        "Yesterday afternoon, the Gunners played ___.",
        "Last night, I listened to ___.",
        "Did you ___ yesterday? Yes, I did.",
      ],
      success: [
        "My map has three stops.",
        "I used three different time words.",
        "I used verbs with -ed.",
      ],
      challenge: "Add a fourth stop: this morning. Then write a question for a friend with Did you ...?",
    },
  ),

  // Lesson 4: a popstar's day, and / but
  "od2e-l2-u14-l4": creative(
    "Compare and justify",
    ["have lunch", "give a concert", "make a mistake", "sign an autograph", "talk to fans", "do an interview"],
    ["and", "but", "a day for a popstar and a day for me"],
    {
      title: "A popstar's day and my day",
      task: "Draw a popstar's day and your day side by side. Write what is the same with and and what is different with but. Say whose day you like more.",
      steps: [
        "Fold your paper in two. Draw a popstar's day on one side and your day on the other.",
        "Use the phrases, for example have lunch and give a concert.",
        "Write one sentence with and and one with but.",
        "Say whose day you like more and why.",
      ],
      frames: [
        "The popstar and I both ___.",
        "The popstar gives a concert, but I ___.",
        "The popstar ___ and ___.",
        "I like ___ day more because ___.",
      ],
      success: [
        "I used and for what is the same.",
        "I used but for what is different.",
        "I gave a reason with because.",
      ],
      challenge: "Write one more but sentence about a mistake the popstar can make, and what the popstar does next.",
    },
    {
      title: "A football star's day and my day",
      task: "Invent a football star who plays for the Gunners. Draw their day and your day side by side. Write what is the same with and and what is different with but.",
      steps: [
        "Fold your paper in two. Draw the star's match day on one side and your day on the other.",
        "Use the phrases, for example have lunch, talk to fans and do an interview.",
        "Write one sentence with and and one with but.",
        "Say whose day you like more and why.",
      ],
      frames: [
        "The star and I both ___.",
        "The star signs an autograph, but I ___.",
        "The star ___ and ___.",
        "I like ___ day more because ___.",
      ],
      success: [
        "I used and for what is the same.",
        "I used but for what is different.",
        "I gave a reason with because.",
      ],
      challenge: "Write one more but sentence about a mistake the star can make, and what the star does next.",
    },
  ),

  // Lesson 5: Wrap Up, the music mobile
  "od2e-l2-u14-l5": creative(
    "Argue",
    ["musician", "solo", "worried", "notes", "record", "hummingbird"],
    ["and / but", "The music makes me feel ___ because ___."],
    {
      title: "The best picture for our mobile",
      task: "Our class music mobile needs one more picture. Draw your idea and convince the class that it is the best one.",
      steps: [
        "Think of a picture for the mobile, for example a musician, notes or a hummingbird.",
        "Draw it big and clear.",
        "Write two sentences about it with and or but.",
        "Write one reason why the class should choose it.",
      ],
      frames: [
        "My picture shows ___ and ___.",
        "The music makes me feel ___.",
        "It is happy, but it is also ___.",
        "You should choose my picture because ___.",
      ],
      success: [
        "My picture is big and clear.",
        "I used and or but.",
        "I gave a reason with because.",
      ],
      challenge: "Say why someone else's picture could also be good, then say why yours is better.",
    },
    {
      title: "The best picture for the stadium mobile",
      task: "The Gunners fans want a music mobile for the Emirates Stadium. Draw your idea and convince them that it is the best picture.",
      steps: [
        "Think of a picture for the mobile, for example a musician, a drum or notes.",
        "Draw it big and clear in red and white.",
        "Write two sentences about it with and or but.",
        "Write one reason why the fans should choose it.",
      ],
      frames: [
        "My picture shows ___ and ___.",
        "The music makes the fans feel ___.",
        "It is loud, but it is also ___.",
        "You should choose my picture because ___.",
      ],
      success: [
        "My picture is big and clear.",
        "I used and or but.",
        "I gave a reason with because.",
      ],
      challenge: "Say why someone else's picture could also be good, then say why yours is better.",
    },
  ),
};
