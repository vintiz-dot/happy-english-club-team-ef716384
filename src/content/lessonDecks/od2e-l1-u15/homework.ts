import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 15 "Shake, Strike
// and Play": one task per lesson, keyed by deck id. Children are 6-7: draw, label, then
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

export const odL1U15Creative: Record<string, Creative> = {
  "od2e-l1-u15-l1": make("Design", ["drum", "tambourine", "triangle", "cymbals", "xylophone", "instruments"], ["I want a ___.", "You can shake it.", "You can strike it."],
    task("My music box", "Draw a music box with three instruments in it. Choose the one you want to play.",
      ["Draw a box and open the lid.", "Draw three instruments inside, for example a drum, a tambourine and a triangle.", "Write the name under each instrument.", "Copy: I want a ___. Circle that instrument."],
      ["I want a ___.", "You shake it.", "You strike it."],
      ["I drew three instruments.", "I wrote three names.", "I wrote one sentence about the one I want."],
      "Write under each one: You shake it. or You strike it."),
    task("A music box for match day", "Draw a music box for Arsenal fans with three instruments in it. Choose the one you want to play at the Emirates Stadium.",
      ["Draw a red box and open the lid.", "Draw three instruments inside, for example a drum, a tambourine and cymbals.", "Write the name under each instrument.", "Copy: I want a ___. Circle that instrument."],
      ["I want a ___.", "You shake it.", "You strike it."],
      ["I drew three instruments.", "I wrote three names.", "I wrote one sentence about the one I want."],
      "Write under each one: You shake it. or You strike it.")),

  "od2e-l1-u15-l2": make("Create", ["drum", "shake", "strike", "instruments", "triangle", "tambourine"], ["You shake it.", "You strike it.", "My favorite instrument is the ___."],
    task("An instrument I invent", "Invent an instrument from a box, a bottle or a pot. Draw it, name it and say how you play it.",
      ["Choose a box, a bottle or a pot.", "Draw your new instrument and give it a name.", "Write: You shake it. or You strike it.", "Show a grown-up how you play it."],
      ["My instrument is a ___.", "You shake it.", "You strike it."],
      ["I drew and named my instrument.", "I wrote how you play it.", "I showed a grown-up the sound."],
      "Write: It is loud. or It is soft."),
    task("A football fan instrument", "Invent an instrument for football fans from a box, a bottle or a pot. Draw it, name it and say how you play it.",
      ["Choose a box, a bottle or a pot.", "Draw your instrument in Arsenal red and white.", "Write: You shake it. or You strike it.", "Show a grown-up how a fan plays it on match day."],
      ["My instrument is a ___.", "You shake it.", "You strike it."],
      ["I drew and named my instrument.", "I wrote how you play it.", "I showed a grown-up the sound."],
      "Write: It is loud. or It is soft.")),

  "od2e-l1-u15-l3": make("Compare and justify", ["drum", "tambourine", "xylophone", "triangle", "cymbals"], ["I'm playing the ___.", "She's playing the ___.", "We're making music."],
    task("My make-believe band", "Draw a band with three players. Say what each one is playing. Choose the player you want to be.",
      ["Draw you and two toys in a band.", "Give each player an instrument.", "Write: I'm playing the ___. My toy is playing the ___.", "Circle the instrument you like best."],
      ["I'm playing the ___.", "Ollie is playing the ___.", "Rosie is playing the ___."],
      ["I drew three players in a band.", "I wrote two sentences with playing.", "I circled the instrument I like best."],
      "Write: We're making music. It is ___."),
    task("A band at the match", "Draw a band of three Arsenal fans at a football match. Say what each one is playing. Choose the player you want to be.",
      ["Draw you and two toys in red scarves.", "Give each player an instrument.", "Write: I'm playing the ___. My toy is playing the ___.", "Circle the instrument you like best."],
      ["I'm playing the ___.", "Ollie is playing the ___.", "Rosie is playing the ___."],
      ["I drew three players in a band.", "I wrote two sentences with playing.", "I circled the instrument I like best."],
      "Write: We're making music. We're ___.")),

  "od2e-l1-u15-l4": make("Evaluate", ["loud", "soft", "fast", "slow", "drum", "xylophone"], ["It's loud.", "It's soft.", "I like it."],
    task("Loud or soft?", "Draw four instruments. Write loud or soft under each one. Choose your favourite.",
      ["Draw four instruments.", "Write the name under each one.", "Write It's loud. or It's soft. under each name.", "Put a star on your favourite and say why."],
      ["It's loud.", "It's soft.", "I like the ___."],
      ["I drew four instruments.", "I wrote loud or soft under each.", "I put a star on my favourite."],
      "Write: I like the ___ because it is ___."),
    task("Loud or soft at the stadium?", "Draw four instruments for a football match. Write loud or soft under each one. Choose the best one for the fans.",
      ["Draw four instruments for Arsenal fans.", "Write the name under each one.", "Write It's loud. or It's soft. under each name.", "Put a star on the best one for the stadium and say why."],
      ["It's loud.", "It's soft.", "I like the ___."],
      ["I drew four instruments.", "I wrote loud or soft under each.", "I put a star on the best one."],
      "Write: The ___ is best because it is ___.")),
};
