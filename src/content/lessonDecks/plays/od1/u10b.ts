// Oxford Discover 1, Unit 10 (Soup, Fruit and Adding Up): the second class play for Venus
// (grades 2-4). Original script by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const od1U10bPlays: Play[] = [
  {
    id: "od2e-l1-u10-p2",
    course: "oxford-discover-2e",
    level: 1,
    unit: 10,
    afterLesson: 5,
    title: "Fruit Bag Show: Add It Up!",
    minutes: 18,
    band: "7-9",
    summary: "A game show where players pull fruit from a bag and add it up: \"Three plus two equals five!\" But a sneaky Mouse keeps eating the peaches, so the numbers keep changing.",
    targets: {
      words: ["tomato", "cucumber", "avocado", "orange", "mango", "peach"],
      grammar: ["How many ... do we have?", "Two plus three equals five.", "I have + number + fruit"],
    },
    roles: [
      { id: "host", name: "Host", who: "a loud, funny child: the most lines" },
      { id: "counter", name: "Counter", who: "a child who likes numbers; the teacher can take this part" },
      { id: "judge", name: "Sleepy Judge", who: "a short, funny part", optional: { give: "host" } },
      { id: "mouse", name: "Mouse", who: "a sneaky, funny part", optional: { give: "players" } },
      { id: "grandma", name: "Fruit Lady", optional: { give: "players" } },
      { id: "players", name: "Player", who: "children who like games; short lines", group: { max: 8 } },
    ],
    scenes: [
      {
        title: "Scene 1: Welcome to the show",
        lines: [
          { stage: "The Host stands behind a table with a big bag. The Players sit in a row. The Mouse hides under the table." },
          { role: "host", text: "Welcome to the Fruit Bag Show!", do: "Open your arms wide." },
          { everyone: "Plus, plus, add it up! Count, count, count!", do: "Clap three times, then count on your fingers." },
          { role: "host", text: "Players, what do you have in the bag?", do: "Lift the bag high." },
          { role: "players", text: "I have two oranges!", do: "Hold up two fingers and make a big round shape." },
          { role: "players", text: "I have one mango. It's big!", do: "Hold one finger up, then make your hands big." },
          { role: "players", text: "I have three tomatoes. Red, red, red!", do: "Hold up three fingers and point at your red shirt." },
          { role: "players", text: "I have one cucumber. It's long and green.", do: "Stretch your arms out long." },
          { role: "judge", text: "Zzz... Is it lunch time?", do: "Fall asleep, then wake up with a jump." },
        ],
      },
      {
        title: "Scene 2: Add it up",
        lines: [
          { role: "host", text: "Round one! How many oranges do we have?", do: "Point at the Players." },
          { role: "players", text: "Two oranges and one orange. That's three!", do: "Count on your fingers." },
          { role: "counter", text: "Two plus one equals three. Correct!", do: "Write a big 3 in the air." },
          { role: "host", text: "Round two! How many tomatoes and cucumbers do we have?", do: "Hold two pictures up." },
          { role: "players", text: "Three tomatoes plus one cucumber equals four!", do: "Show four fingers and cheer." },
          { role: "players", text: "I have an avocado. Is it a fruit?", do: "Hold it up and look puzzled." },
          { role: "grandma", text: "Yes, it is! Green and soft inside.", do: "Squeeze the avocado gently." },
          { role: "players", text: "I have one peach. It's soft and yellow.", do: "Rub the peach on your cheek and smile." },
          { everyone: "Plus, plus, add it up! Count, count, count!", do: "Clap three times, then count on your fingers." },
        ],
      },
      {
        title: "Scene 3: The sneaky Mouse",
        lines: [
          { role: "host", text: "Final round! How many peaches do we have?", do: "Look in the bag." },
          { role: "counter", text: "Four peaches plus two peaches equals six!", do: "Hold up six fingers." },
          { role: "host", text: "Count them. One, two, three... Oh no!", do: "Look inside the bag with big eyes." },
          { role: "mouse", text: "Burp! Sorry! I like peaches.", do: "Rub your tummy and hide your face." },
          { role: "players", text: "How many peaches do we have now? Zero!", do: "Make a zero with your hands and laugh." },
          { role: "players", text: "Mouse, you have six peaches in your tummy!", do: "Point at the Mouse's tummy." },
          { role: "players", text: "Mango plus orange plus tomato equals a salad!", do: "Pretend to mix a big bowl." },
          { role: "judge", text: "Hooray! Everybody wins. Now, lunch!", do: "Clap and wake up happy." },
          { role: "host", text: "Thank you for playing. Bye-bye!", do: "Wave with both hands." },
          { everyone: "Plus, plus, add it up! Yum, yum, yum!", do: "Clap three times, then rub your tummy." },
        ],
      },
    ],
    rehearsal: [
      { round: "Listen and do", minutes: 4, how: "Read the show aloud. The class only does the actions: count on fingers, clap the refrain, rub tummies. Everyone says the refrain." },
      { round: "Script round", minutes: 5, how: "Say each line; its part echoes it with the action. Players add up with real fruit cards or fingers. Then the one-minute fix." },
      { round: "Key words round", minutes: 5, how: "Perform with only six fruit cards and number cards on the board. Children say the lines from the pictures, not the paper." },
      { round: "Own numbers round", minutes: 4, how: "Players choose their own fruit and numbers. The Counter adds them. The Mouse eats a new fruit." },
    ],
    focusOnForm: [
      "Plural -s after a number: \"two oranges\", \"three tomatoes\", not \"two orange\". Tap the table on the -s.",
      "\"How many peaches do we have?\" Keep \"do\" in the question, not \"How many peaches we have?\"",
      "Say the end sound of \"equals\" and \"plus\": a clear /z/ and /s/, not \"equal\" and \"plu\".",
    ],
    props: ["a big bag", "fruit and vegetable picture cards (tomato, cucumber, avocado, orange, mango, peach)", "number cards 1-10", "a mouse puppet"],
    teacherNote: "For a shy class, the Players speak together first, then alone. The Mouse can eat any fruit in the encore, so every child hears a new number.",
    encore: "Next lesson, perform it as a quick warm-up with new fruit and bigger numbers (up to 10), and a new Mouse who eats a different fruit.",
  },
];
