// Oxford Discover 2nd edition, Level 2, Unit 2 (Animal Adventures): the printable grammar
// worksheet for adverbs of frequency, in three levels with an answer key. Everything here
// is the school's own writing; nothing from the Student Book or Workbook is reproduced.
// Answers marked "e.g." are model answers for open items.
import type { Worksheet } from "@/lib/lessonDecks/types";

export const odL2U02Worksheets: Worksheet[] = [
  {
    id: "od2e-l2-u02-ws-often",
    title: "How often? always, usually, sometimes, hardly ever, never",
    grammar: "adverbs of frequency",
    deckId: "od2e-l2-u02-l3",
    slide: "Adverbs of frequency: how often?",
    intro:
      "These words say how often something happens: always (every time), usually (most times), sometimes (some times), hardly ever (almost never), never (no times). They go before the verb: The cat usually sleeps. They go after is / are: The dog is always happy.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right answer. Then read the sentence aloud.",
        example: "The sun ___ shines in the day. (always / never)  ->  always",
        items: [
          { q: "A fish ___ swims. It swims every day.", options: ["always", "never"], answer: "always" },
          { q: "A bird ___ flies at night. It sleeps then.", options: ["usually", "never"], answer: "never" },
          { q: "My dog ___ barks. It barks one or two times a week.", options: ["sometimes", "always"], answer: "sometimes" },
          { q: "The cat ___ eats fish. It eats fish most days.", options: ["usually", "never"], answer: "usually" },
          { q: "The frog is ___ wet. It lives in water.", options: ["always", "never"], answer: "always" },
          { q: "A snail ___ runs. It is very slow.", options: ["hardly ever", "always"], answer: "hardly ever" },
          { q: "Which sentence is correct?", options: ["The bird usually sings.", "The bird sings usually."], answer: "The bird usually sings." },
          { q: "Which sentence is correct?", options: ["The lion is sometimes calm.", "The lion sometimes is calm."], answer: "The lion is sometimes calm." },
        ],
      },
      {
        level: "Core",
        instructions: "Write the missing word: always, usually, sometimes, hardly ever or never. Use the clue in brackets.",
        example: "A bird ___ lays eggs. (every bird, every time)  ->  always",
        items: [
          { q: "A fish ___ lives in water. (every fish, every time)", answer: "always" },
          { q: "A dog ___ flies. (no times)", answer: "never" },
          { q: "My cat ___ catches a bird. (almost never)", answer: "hardly ever" },
          { q: "The rabbit ___ eats carrots. (most days)", answer: "usually" },
          { q: "A duck ___ swims in the pond. (some days)", answer: "sometimes" },
          { q: "Put the word in the right place: The bear sleeps in winter. (usually)", answer: "The bear usually sleeps in winter." },
          { q: "Put the word in the right place: The lion is gentle. (hardly ever)", answer: "The lion is hardly ever gentle." },
          { q: "Correct the mistake: The cat eats always fish.", answer: "The cat always eats fish." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write one full sentence for each. Check where the frequency word goes.",
        example: "(owl, sleep, day, usually)  ->  The owl usually sleeps in the day.",
        items: [
          { q: "(parrot, squawk, always)", answer: "e.g. The parrot always squawks." },
          { q: "(snake, run, never)", answer: "e.g. The snake never runs." },
          { q: "(fox, hunt, at night, usually)", answer: "e.g. The fox usually hunts at night." },
          { q: "(rabbit, is, fierce, hardly ever)", answer: "e.g. The rabbit is hardly ever fierce." },
          { q: "Write one true sentence about YOUR pet or an animal you know, with sometimes.", answer: "e.g. My cat sometimes sleeps on the couch." },
          { q: "Make a sentence with but: (dog, usually, eat rice) (sometimes, eat chicken)", answer: "e.g. The dog usually eats rice, but it sometimes eats chicken." },
        ],
      },
    ],
  },
  {
    id: "od2e-l2-u02-ws-pronouns",
    title: "it, they, we",
    grammar: "subject pronouns it, they, we",
    deckId: "od2e-l2-u02-l4",
    slide: "Pronouns: it, they, we",
    intro:
      "A pronoun takes the place of a noun, so we do not say the same noun again. Use it for one animal or thing, they for more than one, and we when you are one of the people. Then the verb: it is, they are, we are.",
    tiers: [
      {
        level: "Support",
        instructions: "Circle the right word. Then read the two sentences aloud.",
        example: "The lion is strong. ___ is fierce. (It / They)  ->  It",
        items: [
          { q: "The lion is strong. ___ is fierce.", options: ["It", "They"], answer: "It" },
          { q: "The frogs are green. ___ jump high.", options: ["It", "They"], answer: "They" },
          { q: "My friends and I like animals. ___ go to the zoo.", options: ["We", "It"], answer: "We" },
          { q: "The turtle is slow. ___ is patient.", options: ["It", "We"], answer: "It" },
          { q: "The elephants are big. ___ are gentle.", options: ["They", "It"], answer: "They" },
          { q: "My class and I have a fish. ___ feed it every day.", options: ["We", "They"], answer: "We" },
          { q: "The owl is smart. It ___ at night.", options: ["hunts", "hunt"], answer: "hunts" },
          { q: "The monkeys are funny. They ___ happy.", options: ["are", "is"], answer: "are" },
        ],
      },
      {
        level: "Core",
        instructions: "Write it, they or we. Then finish the sentence.",
        example: "The snake is long. ___ is thin.  ->  It",
        items: [
          { q: "The tiger is fierce. ___ has stripes.", answer: "It" },
          { q: "The bees are busy. ___ make honey.", answer: "They" },
          { q: "My sister and I are calm. ___ sit quietly.", answer: "We" },
          { q: "The horse is strong. ___ runs fast.", answer: "It" },
          { q: "The ducks are in the pond. ___ swim.", answer: "They" },
          { q: "My brother and I love cats. ___ have two cats.", answer: "We" },
          { q: "Change the noun to a pronoun: The dog is gentle. The dog likes children.", answer: "The dog is gentle. It likes children." },
          { q: "Change the noun to a pronoun: The parrots are smart. The parrots can talk.", answer: "The parrots are smart. They can talk." },
        ],
      },
      {
        level: "Challenge",
        instructions: "Write about animals. Use it, they and we so you do not say the same noun twice.",
        items: [
          { q: "Write two sentences about one animal. Use it in the second sentence.", answer: "e.g. The bear is strong. It eats fish." },
          { q: "Write two sentences about a group of animals. Use they in the second sentence.", answer: "e.g. The penguins are black and white. They swim fast." },
          { q: "Write one sentence about you and your friends at the zoo. Use we.", answer: "e.g. We look at the lions." },
          { q: "Find and fix the mistake: The cats are calm. It sleep all day.", answer: "The cats are calm. They sleep all day." },
          { q: "Find and fix the mistake: The rabbit is gentle. They is soft.", answer: "The rabbit is gentle. It is soft." },
          { q: "Write three sentences about your favourite animal. Use it two times.", answer: "e.g. My favourite animal is the dolphin. It is smart. It can jump high." },
        ],
      },
    ],
  },
];
