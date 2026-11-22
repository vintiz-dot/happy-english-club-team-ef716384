import type { CreativeTask, Slide, Thinking } from "@/lib/lessonDecks/types";

// Creative homework for Oxford Discover 2nd edition, Level 1, Unit 13 "Where Do We
// Live?": one task per lesson, keyed by deck id. Children are 6-7: draw, label, then
// copy or finish a very short sentence. A grown-up may read the steps aloud. Every task
// has the class version (`base`) and one football edition; which children get it is
// chosen per class in the app, never written here. Children never write a real address:
// every address is a toy's or a pretend one. All text is original.

type Creative = Extract<Slide, { kind: "creative" }>;

const task = (title: string, what: string, steps: string[], frames: string[], success: string[], challenge: string): CreativeTask => ({
  title, task: what, steps, frames, success, challenge,
});
const make = (thinking: Thinking, words: string[], grammar: string[], base: CreativeTask, football: CreativeTask): Creative => ({
  kind: "creative", thinking, uses: { words, grammar }, base,
  variants: [{ interest: "football", label: "Football edition", task: football }],
});

export const odL1U13Creative: Record<string, Creative> = {
  "od2e-l1-u13-l1": make("Design", ["street", "neighborhood", "town", "city", "building", "apartment"], ["I live in a ___.", "This is a ___.", "I like my ___."],
    task("My happy street", "Draw a street you would like to live on. Put one building on it and label three things.",
      ["Draw a long street on your paper.", "Draw one building. Is it a house or an apartment building?", "Write three labels, for example door, tree, street.", "Copy: This is a ___. Say it to a grown-up."],
      ["This is a ___.", "I like my ___.", "I live in a ___."],
      ["I drew a street and a building.", "I wrote three labels.", "I wrote one sentence about my picture."],
      "Add a second building and write: I like the ___ because ___."),
    task("A street for the Gunners", "Draw a pretend street in a city with a big football stadium. Label what you see.",
      ["Draw a long street in a city.", "Draw a big stadium building at the end, like the Emirates Stadium.", "Write three labels, for example stadium, street, ball.", "Copy: This is a ___. Say it to a grown-up."],
      ["This is a ___.", "I like the ___.", "I see a ___ in the city."],
      ["I drew a street and a stadium.", "I wrote three labels.", "I wrote one sentence about my picture."],
      "Add a second building near the stadium and write: I like the ___ because ___.")),

  "od2e-l1-u13-l2": make("Create", ["address", "house number", "street", "town", "city", "country"], ["The house number is ___.", "The street name is ___.", "I live in a ___."],
    task("A pretend address for my toy", "Pick a toy. Make up an address for it and draw its house. Do not use your real address.",
      ["Choose a toy and draw its house.", "Make up a house number and write it on the door.", "Make up a street name and a town name.", "Copy: The house number is ___. The street name is ___."],
      ["The house number is ___.", "The street name is ___.", "The town name is ___."],
      ["I drew a house for my toy.", "I wrote a pretend house number and street name.", "I did not use my real address."],
      "Draw an envelope and copy the pretend address on it."),
    task("A home for a toy football fan", "Pick a toy that loves football. Make up an address near a stadium and draw its home. Do not use your real address.",
      ["Choose a toy and draw its house near a big football stadium.", "Make up a house number and write it on the door.", "Make up a street name and a town name.", "Copy: The house number is ___. The street name is ___."],
      ["The house number is ___.", "The street name is ___.", "The toy lives in a ___."],
      ["I drew a home for my toy football fan.", "I wrote a pretend house number and street name.", "I did not use my real address."],
      "Draw an envelope and copy the pretend address on it.")),

  "od2e-l1-u13-l3": make("Compare and justify", ["house", "city", "country", "address", "neighborhood"], ["This is ___'s house.", "___'s house is ___.", "Is this ___'s ___?"],
    task("Whose house is best?", "Draw two toy houses and say whose they are. Choose the one you like best.",
      ["Draw two houses. Give each toy a name, for example Teddy and Dino.", "Write under each: This is Teddy's house.", "Colour them. Make one big and one small.", "Say which you like best: I like ___'s house."],
      ["This is ___'s house.", "___'s house is ___.", "I like ___'s house because ___."],
      ["I wrote two sentences with 's.", "My two houses are different.", "I said which house I like and why."],
      "Write one more sentence: ___'s house is in the city. ___'s house is in the country."),
    task("Whose ball is best?", "Draw two toys with a football each. Say whose ball is whose. Choose the one you like best.",
      ["Draw two toys, for example Teddy and Dino. Give each one a football.", "Write under each: This is Teddy's ball.", "Colour them. Make one ball big and one small.", "Say which you like best: I like ___'s ball."],
      ["This is ___'s ball.", "___'s ball is ___.", "I like ___'s ball because ___."],
      ["I wrote two sentences with 's.", "My two balls are different.", "I said which ball I like and why."],
      "Draw a goal. Write: ___'s ball is in the goal.")),

  "od2e-l1-u13-l4": make("Evaluate", ["noisy", "quiet", "safe", "interesting", "boring", "dangerous"], ["It's ___.", "It's ___ and ___.", "I like it because ___."],
    task("Noisy or quiet?", "Draw one noisy place and one quiet place. Choose which you like best.",
      ["Draw a noisy place on one side of your paper.", "Draw a quiet place on the other side.", "Write It's noisy. and It's quiet. under the pictures.", "Circle the place you like best. Say why."],
      ["It's ___.", "It's ___ and ___.", "I like the ___ place."],
      ["I drew a noisy place and a quiet place.", "I wrote two sentences with It's.", "I circled my favourite place."],
      "Write: I like it because ___. Use safe, interesting or boring."),
    task("Match day: noisy or quiet?", "Draw a football match and a quiet place for after the match. Choose which you like best.",
      ["Draw a noisy football match with Arsenal fans.", "Draw a quiet place for after the match, for example your bed.", "Write It's noisy. and It's quiet. under the pictures.", "Circle the place you like best. Say why."],
      ["It's ___.", "It's ___ and ___.", "I like the ___ place."],
      ["I drew a noisy place and a quiet place.", "I wrote two sentences with It's.", "I circled my favourite place."],
      "Write: I like it because ___. Use safe, interesting or boring.")),
};
