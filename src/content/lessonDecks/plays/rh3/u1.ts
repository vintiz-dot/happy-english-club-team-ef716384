// Reach Higher 3, Unit 1 (Happy to Help): class play for Jupiter (grades 5-6).
// Original script by the school; no book text.
import type { Play } from "@/lib/lessonDecks/plays";

export const rh3U1Plays: Play[] = [
  {
    id: "rh-l3-u1-p1",
    course: "reach-higher",
    level: 3,
    unit: 1,
    afterLesson: 1,
    title: "The Alley Meeting",
    minutes: 22,
    band: "8-12",
    summary: "The neighborhood meets about a dirty alley behind the market. Every neighbor offers a different solution, the Chair must choose one, and the class improvises the last vote.",
    targets: {
      words: ["problem", "solution", "volunteer", "neighborhood", "kindness", "improve", "offer", "need"],
      grammar: ["Complete sentences: subject + predicate", "Subject-verb agreement: everyone / each + verb-s; There is / There are", "First, Next, Then, Finally"],
    },
    roles: [
      { id: "chair", name: "Chair", who: "a confident reader: runs the meeting, the most lines" },
      { id: "reporter", name: "Reporter", who: "a clear speaker; the teacher can take this part" },
      { id: "baker", name: "Baker", who: "a funny part", optional: { give: "neighbors" } },
      { id: "grandma", name: "Grandmother", who: "a wise, slow voice", optional: { give: "chair" } },
      { id: "guard", name: "School Guard", optional: { give: "neighbors" } },
      { id: "cleaner", name: "Street Cleaner", optional: { give: "reporter" } },
      { id: "neighbors", name: "Neighbor", who: "children who like to act; short lines", group: { max: 6 } },
    ],
    scenes: [
      {
        title: "Scene 1: The problem",
        lines: [
          { stage: "Chairs in a half circle. The {@chair} stands at the front with a paper. The {@reporter} holds a pretend microphone." },
          { role: "reporter", text: "Good evening! This is the neighborhood news. Tonight, the people of Market Lane have a problem.", do: "Hold out the microphone to the audience." },
          { role: "chair", text: "Welcome, everyone. There is rubbish in the alley, and there are broken bottles by the school gate.", do: "Point to the floor, then to the gate." },
          { role: "neighbors", text: "Every morning, the smell gets worse. Nobody wants to walk there.", do: "Hold your nose." },
          { role: "neighbors", text: "Each child must walk past it to school. This is not safe!", do: "Step carefully, as if between bottles." },
          { role: "chair", text: "Does anyone have an idea? We need a solution before the rainy season.", do: "Put your hand behind your ear." },
          { everyone: "One small action can make a big difference!", do: "Raise one finger, then open both hands wide." },
        ],
      },
      {
        title: "Scene 2: Four offers",
        lines: [
          { role: "baker", text: "I offer free bread to every volunteer. Everyone works better with a full stomach!", do: "Pass out pretend rolls." },
          { role: "grandma", text: "Each shop should have its own bin. My mother always said that small kindness keeps a street clean.", do: "Nod slowly and smile." },
          { role: "guard", text: "I can watch the gate. If I see a bottle, I will pick it up. There are twenty children who need me.", do: "Stand tall like a guard." },
          { role: "cleaner", text: "I can show you how. First we wear gloves, next we collect the glass, then we sweep.", do: "Pretend to put on gloves and sweep." },
          { role: "neighbors", text: "I will make signs. Nobody throws rubbish when everybody is watching.", do: "Draw a big sign in the air." },
          { role: "neighbors", text: "My cousin has paint. We can paint flowers on the old wall and improve the whole alley.", do: "Paint a flower with a big brush." },
          { role: "reporter", text: "The Chair has four offers, and every offer is good. But which solution comes first?", do: "Look at the Chair with wide eyes." },
        ],
      },
      {
        title: "Scene 3: The vote",
        lines: [
          { role: "chair", text: "Let us decide. First, we count the volunteers. Next, we choose one job each. Finally, we set a date.", do: "Count off three steps on your fingers." },
          { role: "neighbors", text: "Everyone who wants to help, raise your hand!", do: "Raise your hand high." },
          { role: "neighbors", text: "There are fourteen hands! The neighborhood is ready.", do: "Look around and count the hands." },
          { role: "neighbors", text: "I will bring the gloves. My brother brings a big cart.", do: "Pull an imaginary cart." },
          { role: "neighbors", text: "Each of us has a job, so nobody works alone.", do: "Link arms with a neighbor." },
          { stage: "IMPROVISE: the Chair asks one more question, for example 'What if it rains on the day?' The neighbors answer in complete sentences with their own idea." },
          { role: "chair", text: "Then it is decided. One problem, many hands, one solution. Thank you, everyone.", do: "Bow to the audience." },
          { everyone: "One small action can make a big difference!", do: "Raise one finger, then open both hands wide." },
        ],
      },
    ],
    rehearsal: [
      { round: "Read with scripts", minutes: 6, how: "Read the whole play with scripts and the stage directions. Everyone does the actions. Stop after Scene 1 for the one-minute fix." },
      { round: "Key-word cards", minutes: 5, how: "Put six cards on the board: problem, solution, offer, volunteer, improve, kindness. Perform with only the cards. Each child says the line in their own words but keeps the card word." },
      { round: "Own words and a new problem", minutes: 6, how: "The class picks a new problem (a noisy corridor, a broken swing). The Chair asks for offers, the neighbors make them, the vote is improvised. Use the cards only if stuck." },
      { round: "Give one fix, then perform", minutes: 3, how: "Give the last one-minute fix, then perform the improvised version once for the other half of the room." },
    ],
    focusOnForm: [
      "Complete sentences: children say \"Because it is dirty.\" or \"In the alley.\" Ask \"Who or what? What happens?\" until the sentence has a subject and a predicate.",
      "Everyone, each and nobody take the -s verb: \"Everyone helps\", not \"Everyone help\". Tap the table on the -s.",
      "There is / There are: \"There is rubbish\" but \"There are bottles\". Children often use \"There have\"; say \"There ARE\" with them and let them repeat.",
      "Sound: -tion in solution and -ness in kindness. Say each word three times, chorus then alone.",
    ],
    props: ["a paper or board for the Chair", "a pretend microphone", "six key-word cards", "chairs in a half circle"],
    teacherNote: "This Unit has one lesson, so the play is a review. If the class is small, the Neighbors can take the Baker's and Guard's offers and keep every line. The improvised vote is the point: accept any idea, but ask for a full sentence and one reason.",
    encore: "Next lesson, perform it as a two-minute warm-up with a new problem on the board (a dirty river, a lost dog). Swap the roles: whoever was a Neighbor is now the Chair.",
  },
];
