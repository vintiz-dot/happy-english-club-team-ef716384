import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 13 "Music and
// Feelings": one task per lesson, keyed by deck id. The children are 7-8, so every
// task is draw-then-write: a picture first, then two to four short sentences. Every
// task has the class version (`base`) and one football edition; which children get
// the football edition is chosen per class in the app, never written here. Feelings
// that are not cheerful are given to invented characters. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const creative = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative",
  thinking,
  uses: { words, grammar },
  base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL2U13Creative: Record<string, Creative> = {
  // Lesson 1: high / low, excited / sleepy
  "od2e-l2-u13-l1": creative(
    "Create",
    ["high", "low", "excited", "sleepy", "feelings", "trumpet", "wolf"],
    ["It is high / low.", "It makes me feel ___."],
    {
      title: "A picture of my song",
      task: "Make a picture of a song. Show if it is high or low and how it makes you feel. Then write two or three short sentences.",
      steps: [
        "Think of a song you like. Is it high or low?",
        "Draw the song as a picture. Use big shapes for loud parts and small shapes for quiet parts.",
        "Write one sentence about the sound: high or low.",
        "Write one sentence about the feeling: excited or sleepy.",
      ],
      frames: ["My song is ___.", "It is high / low.", "It makes me feel ___.", "I can hear a ___."],
      success: ["I can say if my song is high or low.", "I can say how my song makes me feel.", "My picture shows my feeling."],
      challenge: "Add one more sentence: if your song were an animal, which animal would it be? Why? Use because.",
    },
    {
      title: "Match day sounds",
      task: "Draw the Emirates Stadium on match day. Show a high sound and a low sound you can hear, and how the Arsenal fans feel. Then write two or three short sentences.",
      steps: [
        "Think about match day at the Emirates Stadium. The Gunners are playing!",
        "Draw the stadium and the fans in red and white.",
        "Draw one high sound and one low sound, for example a whistle and a big drum.",
        "Write one sentence about the sound and one about the feeling.",
      ],
      frames: ["The whistle is ___.", "The drum is high / low.", "The fans feel ___.", "I can hear a ___."],
      success: ["I can say if a sound is high or low.", "I can say how the fans feel.", "My picture shows the stadium and the sounds."],
      challenge: "Add one more sentence: when is the stadium quiet and sleepy, and when is it loud and excited? Use because.",
    },
  ),

  // Lesson 2: fast / slow music and what we imagine
  "od2e-l2-u13-l2": creative(
    "Evaluate",
    ["fast", "slow", "high", "low", "sleepy", "excited", "imagine"],
    ["Slow music makes me feel ___.", "I like ___ because ___."],
    {
      title: "Music for school mornings",
      task: "Choose the best music for a school morning: fast or slow. Draw what you imagine when you hear it, then say why it is the best.",
      steps: [
        "Think about the morning at school. Do you want to feel sleepy or excited?",
        "Choose fast or slow music for the morning.",
        "Draw what you imagine when you hear it.",
        "Write two or three sentences. Say why your music is the best.",
      ],
      frames: ["I think fast / slow music is the best.", "It makes me feel ___.", "I imagine ___.", "I like it because ___."],
      success: ["I chose fast or slow music.", "I said how it makes me feel.", "I gave a reason with because."],
      challenge: "Ask someone at home to choose. Write what they chose and how it is the same as or different from your choice.",
    },
    {
      title: "Music for the walk to the stadium",
      task: "Choose the best music for walking to the Emirates Stadium with the Arsenal fans: fast or slow. Draw what you imagine, then say why it is the best.",
      steps: [
        "Think about match day. The fans walk to the Emirates Stadium to see the Gunners.",
        "Choose fast or slow music for the walk.",
        "Draw what you imagine when you hear it.",
        "Write two or three sentences. Say why your music is the best.",
      ],
      frames: ["I think fast / slow music is the best for match day.", "It makes the fans feel ___.", "I imagine ___.", "I like it because ___."],
      success: ["I chose fast or slow music.", "I said how the fans feel.", "I gave a reason with because."],
      challenge: "Ask someone at home to choose. Write what they chose and how it is the same as or different from your choice.",
    },
  ),

  // Lesson 3: when? in the morning / at night / on Saturday
  "od2e-l2-u13-l3": creative(
    "Design",
    ["morning", "afternoon", "evening", "night", "Saturday", "sleepy", "excited"],
    ["in the morning / afternoon / evening", "at night", "on Saturday"],
    {
      title: "A music day for a new friend",
      task: "Invent a character and make a music day for them. Draw three boxes and write the music for the morning, the afternoon and the evening.",
      steps: [
        "Invent a character. Draw them at the top of your paper.",
        "Draw three boxes: morning, afternoon and evening.",
        "In each box, draw the music your character listens to.",
        "Write one sentence under each box.",
      ],
      frames: ["In the morning, my character listens to ___.", "In the afternoon, he / she plays ___.", "In the evening, ___.", "At night, he / she feels ___."],
      success: [
        "I used in the morning, in the afternoon and in the evening.",
        "I chose music that matches the time of day.",
        "My drawing has three boxes with a picture in each.",
      ],
      challenge: "Add a fourth box for Saturday and write one sentence with on Saturday. How is Saturday different from a school day?",
    },
    {
      title: "A match day music plan",
      task: "Make a music plan for an Arsenal fan on match day. Draw three boxes and write the music for the morning, the afternoon and the evening.",
      steps: [
        "Invent a fan of the Gunners. Draw them at the top of your paper.",
        "Draw three boxes: morning, afternoon and evening.",
        "In each box, draw the music for that time of match day.",
        "Write one sentence under each box.",
      ],
      frames: ["In the morning, the fan listens to ___.", "In the afternoon, he / she sings ___.", "In the evening, ___.", "At night, he / she feels ___."],
      success: [
        "I used in the morning, in the afternoon and in the evening.",
        "I chose music that matches the time of day.",
        "My drawing has three boxes with a picture in each.",
      ],
      challenge: "Add a fourth box for the next Saturday and write one sentence with on Saturday. What does your fan do at the Emirates Stadium?",
    },
  ),

  // Lesson 4: feelings and actions, because
  "od2e-l2-u13-l4": creative(
    "Argue",
    ["proud", "smile", "nervous", "yawn", "unhappy", "cry", "excited"],
    ["Because I feel ___, I ___.", "I love ___ because ___."],
    {
      title: "The best music for a feeling",
      task: "Choose a feeling: proud, excited or sleepy. Make a poster that says which music is best for it. Convince a friend with a reason.",
      steps: [
        "Choose one feeling.",
        "Draw a face that shows the feeling.",
        "Draw the music: fast or slow, high or low.",
        "Write two or three sentences to convince a friend.",
      ],
      frames: ["When I feel ___, I listen to ___ music.", "Because I feel ___, I ___.", "This music is the best because ___.", "You should try it!"],
      success: [
        "My poster has a face, a picture of the music and my sentences.",
        "I used because to give a reason.",
        "I said what I do when I feel this way, for example smile or yawn.",
      ],
      challenge: "Write a second poster for a different feeling. Say why the same music would not work for it.",
    },
    {
      title: "The best music for the Gunners",
      task: "Choose a feeling: proud, excited or nervous. Make a poster that says which music is best for the Arsenal fans to feel this way. Convince a friend with a reason.",
      steps: [
        "Choose one feeling for the fans at the Emirates Stadium.",
        "Draw a face that shows the feeling.",
        "Draw the music: fast or slow, high or low.",
        "Write two or three sentences to convince a friend.",
      ],
      frames: ["When the Gunners play, I feel ___.", "Because I feel ___, I ___.", "This music is the best because ___.", "You should try it!"],
      success: [
        "My poster has a face, a picture of the music and my sentences.",
        "I used because to give a reason.",
        "I said what I do when I feel this way, for example smile or clap.",
      ],
      challenge: "Write a second poster for a different feeling. Say why the same music would not work for it.",
    },
  ),
};
