import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 14 "City and
// Country": one task per lesson, keyed by deck id. Children are 6-7: draw, label, then
// copy or finish a very short sentence. A grown-up may read the steps aloud. Every task
// has the class version (`base`) and one football edition; which children get it is
// chosen per class in the app, never written here. The his / her examples use made-up
// characters. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const task = (title: string, what: string, steps: string[], frames: string[], success: string[], challenge: string): CreativeTask => ({
  title, task: what, steps, frames, success, challenge,
});
const make = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative", thinking, uses: { words, grammar }, base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL1U14Creative: Record<string, Creative> = {
  "od2e-l1-u14-l1": make("Design", ["restaurant", "hotel", "cornfield", "orchard", "new", "old"], ["The ___ is new.", "The ___ is old.", "I see a ___ in the city."],
    task("My town picture", "Draw a town with one city place and one country place. Say which is new and which is old.",
      ["Draw a city place, for example a hotel or a restaurant.", "Draw a country place, for example a cornfield or an orchard.", "Write The ___ is new. under one place.", "Write The ___ is old. under the other place."],
      ["The ___ is new.", "The ___ is old.", "I see a ___ in the country."],
      ["I drew a city place and a country place.", "I wrote two sentences with new and old.", "I can say my picture to a grown-up."],
      "Write: I like the ___ because ___."),
    task("A town with a football pitch", "Draw a town with a new football stadium in the city and an old pitch in the country.",
      ["Draw a new stadium in the city, like the Emirates Stadium.", "Draw an old football pitch next to a cornfield or an orchard.", "Write The stadium is new. under one picture.", "Write The pitch is old. under the other picture."],
      ["The ___ is new.", "The ___ is old.", "I see a ___ in the country."],
      ["I drew a city place and a country place.", "I wrote two sentences with new and old.", "I can say my picture to a grown-up."],
      "Write: I like the ___ because ___.")),

  "od2e-l1-u14-l2": make("Create", ["city", "country", "mouse", "restaurant", "cornfield", "new"], ["The ___ lives in a ___.", "It is ___.", "In the end, ___."],
    task("A new mouse friend", "Make up a third mouse for the story. Draw where it lives. Say if it is a city mouse or a country mouse.",
      ["Draw your new mouse. Give it a funny colour.", "Draw its home in the city or in the country.", "Write: The mouse lives in a ___.", "Write: It is ___. Use big, small, old or new."],
      ["The mouse lives in a ___.", "It is ___.", "I like the ___."],
      ["I drew a mouse and its home.", "I wrote two short sentences.", "I told a grown-up where my mouse lives."],
      "Write: In the end, my mouse ___."),
    task("A mouse who loves football", "Make up a mouse that loves football. Draw where it lives and where it plays.",
      ["Draw your mouse in an Arsenal scarf.", "Draw its home in the city or in the country.", "Write: The mouse lives in a ___.", "Write: It plays football in the ___."],
      ["The mouse lives in a ___.", "It is ___.", "It plays in the ___."],
      ["I drew a mouse and its home.", "I wrote two short sentences.", "I told a grown-up where my mouse lives."],
      "Write: In the end, my mouse ___.")),

  "od2e-l1-u14-l3": make("Compare and justify", ["city", "country", "old", "new", "house", "cornfield"], ["His house is ___.", "Her house is ___.", "Is your home in the ___?"],
    task("Boy Bear and Girl Bear", "Draw Boy Bear's home and Girl Bear's home. Say which home you like and why.",
      ["Draw Boy Bear's home in the country.", "Draw Girl Bear's home in the city.", "Write: His house is ___. Her house is ___.", "Circle the home you like best."],
      ["His house is ___.", "Her house is ___.", "I like the ___ home."],
      ["I wrote one sentence with his and one with her.", "My two homes are different.", "I circled a home and said why."],
      "Write: I like her house because ___. Or: I like his house because ___."),
    task("Two bear fans", "Draw Boy Bear and Girl Bear at a football match. Say what each one has and which you like best.",
      ["Draw Boy Bear with an Arsenal scarf.", "Draw Girl Bear with a football.", "Write: His scarf is ___. Her ball is ___.", "Circle the bear you like best."],
      ["His scarf is ___.", "Her ball is ___.", "I like the ___ bear."],
      ["I wrote one sentence with his and one with her.", "My two bears are different.", "I circled a bear and said why."],
      "Write: I like her ball because ___. Or: I like his scarf because ___.")),

  "od2e-l1-u14-l4": make("Create", ["park", "library", "supermarket", "bakery", "museum", "drugstore"], ["There is a ___.", "It is ___.", "Is there a ___ in your neighborhood?"],
    task("A new place for my neighborhood", "Make up a new place for a neighborhood and draw it.",
      ["Choose a place: a bakery, a park, a library or a museum.", "Draw it and make it magic or funny.", "Write: There is a ___.", "Write: It is ___."],
      ["There is a ___.", "It is ___.", "I like the ___."],
      ["I drew a new place.", "I wrote two sentences with There is and It is.", "I told a grown-up why people go there."],
      "Write: People go there to ___."),
    task("A football place for my neighborhood", "Make up a new football place for a neighborhood and draw it.",
      ["Draw a football park or a football museum.", "Add things Arsenal fans like, for example a ball, a scarf and a goal.", "Write: There is a ___.", "Write: It is ___."],
      ["There is a ___.", "It is ___.", "I like the ___."],
      ["I drew a new football place.", "I wrote two sentences with There is and It is.", "I told a grown-up why fans go there."],
      "Write: People go there to ___.")),

  "od2e-l1-u14-l5": make("Argue", ["park", "museum", "bakery", "library", "city", "country"], ["There is a ___.", "My neighborhood is ___.", "I like the ___."],
    task("The best place on my map", "Draw a small map with three places. Choose the best one and tell a visitor why.",
      ["Draw a map with three places, for example a park, a bakery and a museum.", "Write a label on each place.", "Draw a star on the best place.", "Write: I like the ___. Say why a visitor will like it."],
      ["There is a ___.", "I like the ___.", "A visitor will like it because ___."],
      ["My map has three places with labels.", "I wrote one sentence about my best place.", "I told a grown-up why it is best."],
      "Write: There is a ___ and a ___. It is ___."),
    task("My map with a football place", "Draw a small map with a football stadium and two other places. Choose the best place and tell a visitor why.",
      ["Draw a map with a stadium like the Emirates Stadium and two other places.", "Write a label on each place.", "Draw a star on the best place.", "Write: I like the ___. Say why a visitor will like it."],
      ["There is a ___.", "I like the ___.", "A visitor will like it because ___."],
      ["My map has three places with labels.", "I wrote one sentence about my best place.", "I told a grown-up why it is best."],
      "Write: There is a ___ and a ___. It is ___.")),
};
