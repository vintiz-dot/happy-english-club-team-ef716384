import type { Slide, CreativeTask, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 2, Unit 15 "Forces and
// Movement": one task per lesson, keyed by deck id. The children are 7-8, so every task
// is draw-then-write: a picture first, then two to four short sentences. Every task has
// the class version (`base`) and one football edition; which children get the football
// edition is chosen per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const creative = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative",
  thinking,
  uses: { words, grammar },
  base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL2U15Creative: Record<string, Creative> = {
  // Lesson 1: push and pull, heavy and light
  "od2e-l2-u15-l1": creative(
    "Design",
    ["push", "pull", "heavy", "light", "easy", "throw", "ground"],
    ["I push / pull ___.", "It is heavy / light.", "because"],
    {
      title: "My helper robot",
      task: "Design a robot that pushes or pulls something for you. Draw it, label it and write what it does.",
      steps: [
        "Think of a job that is hard for you, for example moving a heavy box.",
        "Draw your robot and label two parts.",
        "Write what your robot pushes or pulls.",
        "Say why the job is easy for the robot.",
      ],
      frames: [
        "My robot pushes / pulls ___.",
        "The ___ is heavy / light.",
        "It is easy for the robot because ___.",
        "I can throw ___, but the robot can ___.",
      ],
      success: [
        "My robot has a drawing and two labels.",
        "I used push or pull in a sentence.",
        "I gave a reason with because.",
      ],
      challenge: "Add one more sentence: what is one job the robot can not do? Say why.",
    },
    {
      title: "The stadium helper robot",
      task: "Design a robot that helps at the Emirates Stadium on match day. It pushes or pulls something for the Gunners. Draw it, label it and write what it does.",
      steps: [
        "Think of a job at the stadium that is hard, for example moving a heavy bag of footballs.",
        "Draw your robot and label two parts.",
        "Write what your robot pushes or pulls.",
        "Say why the job is easy for the robot.",
      ],
      frames: [
        "My robot pushes / pulls ___.",
        "The ___ is heavy / light.",
        "It is easy for the robot because ___.",
        "I can throw a ball, but the robot can ___.",
      ],
      success: [
        "My robot has a drawing and two labels.",
        "I used push or pull in a sentence.",
        "I gave a reason with because.",
      ],
      challenge: "Add one more sentence: what is one job at the stadium the robot can not do? Say why.",
    },
  ),

  // Lesson 2: small force and big force, cause and effect
  "od2e-l2-u15-l2": creative(
    "Evaluate",
    ["push", "pull", "force", "ground", "speed", "heavy", "light"],
    ["I pushed ___ with a small force. It ___.", "Cause and effect", "because"],
    {
      title: "Small force or big force?",
      task: "Test a small force and a big force on a toy or a ball. Draw what happens, then decide which force is better for the job.",
      steps: [
        "Choose a light thing at home, for example a toy car or a ball.",
        "Push it with a small force. Look at what happens. Push it with a big force. Look again.",
        "Draw both pushes.",
        "Write what happened, then say which force is better for a job.",
      ],
      frames: [
        "I pushed the ___ with a small force. It ___.",
        "I pushed it with a big force. It ___.",
        "A big force is better for ___ because ___.",
        "A small force is better for ___ because ___.",
      ],
      success: [
        "I wrote one sentence about the small force and one about the big force.",
        "I said which force is better for a job.",
        "I gave a reason with because.",
      ],
      challenge: "Imagine a super force. What would you move with it? Write what happens to the ground and to the speed.",
    },
    {
      title: "A pass or a shot?",
      task: "Think about a football. A pass uses a small force and a shot uses a big force. Draw both and decide which force is better for the job.",
      steps: [
        "Think about the Gunners on the pitch at the Emirates Stadium.",
        "Draw a pass with a small force. Draw a shot with a big force.",
        "Write what happens to the ball in each picture.",
        "Say which force is better for a job and why.",
      ],
      frames: [
        "A player pushes the ball with a small force. It ___.",
        "A player pushes it with a big force. It ___.",
        "A big force is better for ___ because ___.",
        "A small force is better for ___ because ___.",
      ],
      success: [
        "I wrote one sentence about the small force and one about the big force.",
        "I said which force is better for a job.",
        "I gave a reason with because.",
      ],
      challenge: "Imagine a super force. What would happen to the ball and the speed? Write one sentence about the ground too.",
    },
  ),

  // Lesson 3: comparatives
  "od2e-l2-u15-l3": creative(
    "Compare and justify",
    ["bigger", "smaller", "faster", "slower", "heavier", "lighter"],
    ["-er than", "-ier than", "Which is ___er, a ___ or a ___?"],
    {
      title: "Which one wins the race?",
      task: "Draw three animals or vehicles. Compare them with -er words and choose the winner of a race. Say why.",
      steps: [
        "Choose three animals or vehicles. Draw them in a row.",
        "Write two sentences that compare them.",
        "Choose the winner of a race.",
        "Say why it wins.",
      ],
      frames: [
        "A ___ is faster than a ___.",
        "A ___ is heavier / lighter than a ___.",
        "The winner is the ___.",
        "It wins because ___.",
      ],
      success: [
        "I used -er than at least twice.",
        "I chose a winner.",
        "I gave a reason with because.",
      ],
      challenge: "Invent a new animal with a super speed. Say what it is faster than and what it is slower than.",
    },
    {
      title: "Which ball is best for match day?",
      task: "Draw a football and two other balls. Compare them with -er words and choose the best one for the Gunners to play with. Say why.",
      steps: [
        "Draw a football, a tennis ball and a basketball.",
        "Write two sentences that compare them.",
        "Choose the best ball for a match at the Emirates Stadium.",
        "Say why.",
      ],
      frames: [
        "A football is bigger than a ___.",
        "A ___ is heavier / lighter than a ___.",
        "The best ball is the ___.",
        "It is the best because ___.",
      ],
      success: [
        "I used -er than at least twice.",
        "I chose the best ball.",
        "I gave a reason with because.",
      ],
      challenge: "Write one more sentence about which ball is easier to throw and which is easier to kick.",
    },
  ),

  // Lesson 4: push, pull and help
  "od2e-l2-u15-l4": creative(
    "Create",
    ["suitcase", "door", "broom", "desk drawer", "computer mouse", "stapler", "heavy"],
    ["My machine pushes / pulls ___.", "It is ___er than ___.", "Can I help you?"],
    {
      title: "A helping machine",
      task: "Invent a machine that pushes or pulls a heavy thing for you. Draw it, name it and write what it does.",
      steps: [
        "Choose a heavy thing, for example a suitcase or a door.",
        "Draw a machine that helps. Give it a name.",
        "Write what your machine pushes or pulls.",
        "Write what you say when you offer to help someone.",
      ],
      frames: [
        "My machine is called ___.",
        "It pushes / pulls ___.",
        "It is stronger than ___.",
        "Can I help you? Yes, please!",
      ],
      success: [
        "My machine has a name and a picture.",
        "I said what it pushes or pulls.",
        "I wrote one helping sentence.",
      ],
      challenge: "Write a four-line talk between two people: one has a heavy suitcase and the other offers to help.",
    },
    {
      title: "A machine for the groundsman",
      task: "Invent a machine that helps the person who looks after the Emirates Stadium pitch. It pushes or pulls a heavy thing. Draw it, name it and write what it does.",
      steps: [
        "Choose a heavy thing at the stadium, for example a big bag or a gate.",
        "Draw a machine that helps. Give it a name.",
        "Write what your machine pushes or pulls.",
        "Write what you say when you offer to help someone.",
      ],
      frames: [
        "My machine is called ___.",
        "It pushes / pulls ___.",
        "It is stronger than ___.",
        "Can I help you? Yes, please!",
      ],
      success: [
        "My machine has a name and a picture.",
        "I said what it pushes or pulls.",
        "I wrote one helping sentence.",
      ],
      challenge: "Write a four-line talk between two people at the stadium: one has a heavy bag and the other offers to help.",
    },
  ),
};
