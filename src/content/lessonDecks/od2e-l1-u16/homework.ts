import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 16 "Let's Make
// Music!": one task per lesson, keyed by deck id. Children are 6-7: draw, label, then
// copy or finish a very short sentence. A grown-up may read the steps aloud. Every task
// has the class version (`base`) and one football edition; which children get it is
// chosen per class in the app, never written here. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const task = (title: string, what: string, steps: string[], frames: string[], success: string[], challenge: string): CreativeTask => ({
  title, task: what, steps, frames, success, challenge,
});
const make = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative", thinking, uses: { words, grammar }, base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL1U16Creative: Record<string, Creative> = {
  "od2e-l1-u16-l1": make("Design", ["dance", "sing", "clap", "buy tickets", "take pictures", "practice an instrument"], ["Can you ___?", "I can ___.", "I like to ___."],
    task("A poster for our show", "Make a poster for a show. Draw what you do in the show and write one sentence.",
      ["Draw a big picture of you in a show.", "Choose one: dance, sing or clap.", "Write: I can ___.", "Write SHOW at the top of your poster."],
      ["I can ___.", "Can you ___?", "I like to ___."],
      ["I drew myself in a show.", "I wrote one sentence with I can.", "I wrote a title on my poster."],
      "Write a question for a friend: Can you ___?"),
    task("A poster for a match-day show", "Make a poster for a show before a football match. Draw what the fans do and write one sentence.",
      ["Draw fans at the Emirates Stadium.", "Choose one thing they do: sing, clap or dance.", "Write: I can ___.", "Write SHOW at the top of your poster."],
      ["I can ___.", "Can you ___?", "I like to ___."],
      ["I drew fans at a show.", "I wrote one sentence with I can.", "I wrote a title on my poster."],
      "Write a question for a friend: Can you ___?")),

  "od2e-l1-u16-l2": make("Create", ["problem", "solution", "drum", "shake", "cymbals"], ["The problem is ___.", "The solution is ___.", "I can make a ___."],
    task("A problem and a solution", "Think of a small problem. Draw it. Then draw a solution that uses an instrument you make.",
      ["Draw a small problem, for example: no drum for the band.", "Draw your solution: a drum from a pot.", "Write: The problem is ___.", "Write: The solution is ___."],
      ["The problem is ___.", "The solution is ___.", "I can make a ___."],
      ["I drew a problem and a solution.", "I wrote two sentences.", "I told a grown-up my idea."],
      "Draw a second solution and write: Another solution is ___."),
    task("A football problem", "Think of a football problem, for example: no ball for the game. Draw it, then draw a solution.",
      ["Draw a football problem, for example: the Gunners have no ball.", "Draw your solution: a ball made from paper.", "Write: The problem is ___.", "Write: The solution is ___."],
      ["The problem is ___.", "The solution is ___.", "I can make a ___."],
      ["I drew a problem and a solution.", "I wrote two sentences.", "I told a grown-up my idea."],
      "Draw a second solution and write: Another solution is ___.")),

  "od2e-l1-u16-l3": make("Evaluate", ["sing", "dance", "clap", "play"], ["Is she dancing?", "Are they singing?", "Yes, she is. / No, she isn't."],
    task("Guess what they are doing", "Draw three people doing three actions. Write a question and an answer for one of them.",
      ["Draw three people: one dancing, one singing and one clapping.", "Write a question: Is she dancing?", "Write the answer: Yes, she is.", "Ask a grown-up one more question about your picture."],
      ["Is she ___?", "Are they ___?", "Yes, she is. / No, she isn't."],
      ["I drew three people doing three actions.", "I wrote one question and one answer.", "I asked a grown-up a question."],
      "Write a question with Are: Are they singing? Write the answer."),
    task("Fans at the match", "Draw three Arsenal fans doing three actions at a football match. Write a question and an answer for one of them.",
      ["Draw three fans: one singing, one clapping and one dancing.", "Write a question: Is he singing?", "Write the answer: Yes, he is.", "Ask a grown-up one more question about your picture."],
      ["Is she ___?", "Are they ___?", "Yes, she is. / No, she isn't."],
      ["I drew three fans doing three actions.", "I wrote one question and one answer.", "I asked a grown-up a question."],
      "Write a question with Are: Are they singing? Write the answer.")),

  "od2e-l1-u16-l4": make("Argue", ["parade", "concert", "circus", "puppet show", "play", "ballet"], ["I'm watching a ___.", "It's ___.", "I like it because ___."],
    task("The best show", "Draw the show you like best. Tell a grown-up why it is the best show.",
      ["Choose one: parade, concert, circus, play or puppet show.", "Draw yourself watching it.", "Write: I'm watching a ___.", "Write: It's ___. Use big, loud, funny or happy."],
      ["I'm watching a ___.", "It's ___.", "I like it because ___."],
      ["I drew myself at a show.", "I wrote two sentences with contractions.", "I told a grown-up why my show is best."],
      "Underline the contractions in your sentences."),
    task("Match day is the best show", "Draw a football match like a big show. Tell a grown-up why it is the best show.",
      ["Draw yourself at a football match with Arsenal fans.", "Add things in the show, for example a parade, a concert or a circus before the game.", "Write: I'm watching a ___.", "Write: It's ___. Use big, loud, funny or happy."],
      ["I'm watching a ___.", "It's ___.", "I like it because ___."],
      ["I drew myself at a match.", "I wrote two sentences with contractions.", "I told a grown-up why it is a good show."],
      "Underline the contractions in your sentences.")),

  "od2e-l1-u16-l5": make("Create", ["drum", "shake", "cymbals", "problem", "solution"], ["It's a ___.", "It sounds ___.", "I can make a ___."],
    task("My own instrument", "Make an instrument from things at home. Draw it, name it and say how it sounds.",
      ["Choose things at home, for example a box and rice.", "Draw your instrument and give it a name.", "Write: It's a ___.", "Write: It sounds ___. Use loud, soft, fast or slow."],
      ["It's a ___.", "It sounds ___.", "You shake it. / You strike it."],
      ["I drew and named my instrument.", "I wrote two sentences.", "I played it for a grown-up."],
      "Write one more sentence: I made it from ___."),
    task("A football instrument", "Make an instrument for football fans from things at home. Draw it, name it and say how it sounds.",
      ["Choose things at home, for example a box and rice.", "Draw your instrument in Arsenal red and white and give it a name.", "Write: It's a ___.", "Write: It sounds ___. Use loud, soft, fast or slow."],
      ["It's a ___.", "It sounds ___.", "You shake it. / You strike it."],
      ["I drew and named my instrument.", "I wrote two sentences.", "I played it for a grown-up."],
      "Write one more sentence: I made it from ___.")),
};
