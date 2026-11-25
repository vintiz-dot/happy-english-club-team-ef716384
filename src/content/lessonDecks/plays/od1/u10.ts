// Oxford Discover 1, Unit 10 (Soup, Fruit and Adding Up): class plays for Venus
// (grades 2-4). Original scripts by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const od1U10Plays: Play[] = [
  {
    id: "od2e-l1-u10-p1",
    course: "oxford-discover-2e",
    level: 1,
    unit: 10,
    afterLesson: 3,
    title: "The Empty Pot",
    minutes: 20,
    band: "7-9",
    summary: "A hungry Cook has only a pot and a stone. Friends come one by one: \"Do you have carrots?\" \"Yes, I do!\" They add food and count it, and the soup is ready for everyone.",
    targets: {
      words: ["pot", "stone", "food", "sausages", "carrots", "onions", "potatoes", "soup"],
      grammar: ["Do you have ...? Yes, I do. / No, I don't.", "I have + food"],
    },
    roles: [
      { id: "cook", name: "Cook", who: "a confident child: the most lines" },
      { id: "narrator", name: "Narrator", who: "a good reader; the teacher can take this part" },
      { id: "carrot", name: "Carrot Friend", who: "a short, funny part", optional: { give: "friends" } },
      { id: "onion", name: "Onion Friend", optional: { give: "friends" } },
      { id: "potato", name: "Potato Friend", optional: { give: "friends" } },
      { id: "sausage", name: "Sausage Friend", optional: { give: "friends" } },
      { id: "friends", name: "Hungry Friend", who: "children who like to act; short lines", group: { max: 6 } },
    ],
    scenes: [
      {
        title: "Scene 1: Only a stone",
        lines: [
          { stage: "The Cook sits beside a big pot. The Hungry Friends sit in a line, holding their tummies." },
          { role: "narrator", text: "This is the Cook. The Cook is hungry." },
          { role: "cook", text: "I have a pot. I have a stone.", do: "Hold up the pot, then the stone." },
          { role: "cook", text: "I don't have food!", do: "Shake your head, hands open." },
          { everyone: "Soup, soup, stone soup! Stir, stir, stir!", do: "Stir a big spoon in the air three times." },
          { role: "friends", text: "We are hungry!", do: "Rub your tummy.", all: true },
          { role: "cook", text: "Can you help me?", do: "Hands together, please." },
          { role: "friends", text: "A stone? You can't eat a stone!", do: "Point at the stone and laugh." },
          { role: "friends", text: "I have food at home. Wait!", do: "Run on the spot." },
        ],
      },
      {
        title: "Scene 2: Do you have ...?",
        lines: [
          { role: "narrator", text: "A friend comes to the pot." },
          { role: "cook", text: "{@carrot}, do you have carrots?", do: "Point at the friend." },
          { role: "carrot", text: "Yes, I do! I have two carrots.", do: "Hold up two fingers, then drop them in the pot." },
          { role: "cook", text: "{@onion}, do you have onions?" },
          { role: "onion", text: "Yes, I do! I have one onion. Oh, my eyes!", do: "Rub your eyes and pretend to cry." },
          { role: "cook", text: "{@potato}, do you have potatoes?" },
          { role: "potato", text: "Yes, I do! I have three potatoes.", do: "Roll three potatoes into the pot." },
          { role: "cook", text: "{@sausage}, do you have sausages?" },
          { role: "sausage", text: "No, I don't. Sorry!", do: "Shake your head and show empty hands." },
          { role: "friends", text: "I have sausages! Here you are!", do: "Run to the pot and drop them in." },
          { everyone: "Soup, soup, stone soup! Stir, stir, stir!", do: "Stir a big spoon in the air three times." },
        ],
      },
      {
        title: "Scene 3: Count the food",
        lines: [
          { role: "narrator", text: "How much food is in the pot? Let's count!" },
          { role: "cook", text: "Two carrots and one onion. That's three!", do: "Count on your fingers." },
          { role: "friends", text: "Three potatoes and three. That's six!", do: "Show six fingers." },
          { role: "friends", text: "And the sausages. Yum!" },
          { role: "cook", text: "Do you have bowls?" },
          { role: "friends", text: "Yes, we do!", do: "Hold out a bowl.", all: true },
          { role: "narrator", text: "The soup is hot. Everyone eats." },
          { role: "friends", text: "Mmm! I like this soup!", do: "Eat with a spoon, then smile." },
          { role: "cook", text: "One stone, and lots of friends. Thank you!", do: "Bow." },
          { everyone: "Soup, soup, stone soup! Yum, yum, yum!", do: "Rub your tummy and bow." },
        ],
      },
    ],
    rehearsal: [
      { round: "Listen and do", minutes: 4, how: "Read the whole play aloud. The class only does the actions: stir, count, rub tummies. Nobody speaks yet except the refrain." },
      { round: "Echo the lines", minutes: 5, how: "Say each line; the child with that part echoes it with its action. Everyone says the refrain." },
      { round: "Perform with scripts", minutes: 5, how: "Perform once with scripts in hand, then give the one-minute fix." },
      { round: "Perform with picture cards", minutes: 5, how: "Perform again with only the food picture cards. Children may change the number of carrots or potatoes and add them up again." },
    ],
    focusOnForm: [
      "Questions start with Do: \"Do you have carrots?\", not \"You have carrots?\" Ask \"How do we start?\" and let the child fix it.",
      "Short answers: \"Yes, I do. / No, I don't.\", not \"Yes, I have.\"",
      "Plural -s at the end of carrots, onions, potatoes, sausages: tap the table on the -s.",
    ],
    props: ["a big pot or box", "a grey stone or a ball of paper", "food picture cards", "paper bowls (optional)"],
    teacherNote: "Children who are shy can play Hungry Friends: they speak together first, then alone. If the class is small, the Hungry Friends take the food parts and keep every line.",
    encore: "Next lesson, perform it once with no scripts as the warm-up, with new food (fruit from Lesson 4: \"Do you have bananas?\").",
  },
];
