import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 1 "Happy to Help" (src/lib/lessonDecks/lab.ts
// puts it into the deck). The unit is one wrap-up lesson, so it carries one retell routine that says
// the unit's agreement and sequence language many times, one fix-it writing routine on the exam
// grammar point (subject-verb agreement, complete sentences), and one recorded talk for home.
// Time comes from games and repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names), most likely a missing -s on he / she / it verbs ('She help me'), 'The volunteers is', or a sentence with no subject. Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them: children who then tell it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('My neighbor ...?'), point to the frame, hold up a finger for the missing -s, or repeat the error with a rising voice ('Henry write books?'). For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

export const rhL3U1Lab: UnitLab = {
  decks: {
    "rh-l3-u1-l1": {
      objectives: ["I can retell how someone helped another person, faster each time, and write complete sentences that agree."],
      trim: {
        "Story relay: retell it in order": 8,
        "Key word challenge: define, sort, build": 7,
        "Case files: who helped whom?": 10,
        "Video case: Saving Stranded Whales": 7,
        "Pattern hunt: complete or not?": 4,
      },
      add: [
        {
          after: "Story relay: retell it in order",
          slide: {
            kind: "fluency",
            title: "Helping story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same helping story three times. Each time it is shorter, smoother and faster.",
            chunks: [
              "First, my neighbor needed help with her heavy bags.",
              "Next, she asked me, and I carried them upstairs.",
              "Then she smiled and said thank you.",
              "Finally, we both felt happy, because everyone in our building helps each other.",
              "Before, she felt tired. Now, she feels glad.",
      "The volunteers are cleaning the beach, and each child has a job.",
            ],
            recycle: ["___ needed ___.", "___ was helped by ___.", "People help each other by ___."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells a helping story with First, Next, Then, Finally. Use your key-word cards. Then Partner B tells theirs. Then change partners." },
              { seconds: 45, say: "Round 2: New partner. Partner A tells the same story again in less time and adds Before / Now. Then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: New partner. Partner A tells it fast and smooth, with no long stops! Then Partner B." },
            ],
            steps: [
              "Choose one helping story from the unit or your own life. Put four key-word cards in order: First, Next, Then, Finally.",
              "Round 1: Partner A tells it, then Partner B tells theirs. The listener counts the four sequence words on their fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, change partners. Partner A tells the story again, shorter, then Partner B. Do this in rounds 2 and 3.",
            ],
            prompts: ["(card: First)", "(card: Next)", "(card: Then)", "(card: Finally)", "(card: Before / Now)"],
            feedback: correct,
            teacherNote: "The same story told three times is the point: rounds 2 and 3 free the children to speak faster because they are no longer searching for ideas. Retelling builds fluency but not accuracy by itself, which is why the one-minute fix sits between rounds 1 and 2. Listen for the agreement slips that are common at this level (she help, the volunteers is), a missing final -s or -ed, and sentences with no subject.",
            tiers: [
              { level: "Support", task: "Use the frames and the cards: one sentence for each sequence word.", frames: ["First, ___ needed ___.", "Next, ___ helped ___.", "Then, ___.", "Finally, ___."] },
              { level: "Core", task: "Tell all four parts without the frames, and add a Before / Now sentence." },
              { level: "Stretch", task: "Add what it shows: 'This shows that one person can make a difference.'", frames: ["Before, ___. Now, ___.", "This shows that ___."] },
            ],
          },
        },
        {
          after: "Subjects and verbs that agree",
          slide: {
            kind: "writing",
            title: "Fix the helping notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 8,
            steps: [
              "Read each note with your partner. Something is wrong!",
              "Find the mistake: no subject, no capital letter or end mark, or a verb that does not agree.",
              "Write the sentence the right way. Say it aloud together.",
              "Plan, write, check: plan three things (who helps, how, what changes). Write a short paragraph of three or four sentences about someone who helps you. Check it with the checklist.",
            ],
            items: [
              { q: "carried the heavy boxes to the car.", answer: "My uncle carried the heavy boxes to the car." },
              { q: "The volunteers is cleaning the beach.", answer: "The volunteers are cleaning the beach." },
              { q: "my neighbor help me every morning", answer: "My neighbor helps me every morning." },
              { q: "Everyone in our class have a reading buddy.", answer: "Everyone in our class has a reading buddy." },
            ],
            frames: ["___ helps ___ by ___.", "The volunteers are ___.", "Everyone in ___ has ___."],
            checklist: [
              "Every sentence has a subject (who?) and a predicate (what?)",
              "A capital letter first and an end mark last",
              "he / she / it / everyone: the verb ends in -s; more than one person: no -s, and use are",
            ],
            sayIt: "Read your four fixed sentences to your partner, then say them again without looking.",
            teacherNote: "Two or three error types only: a missing subject, a missing capital or end mark, and agreement. The same slips appear in the exam's find-and-correct format, so work item 3 together first and let the children explain the fix in their own words ('she needs -s'). Say the final -s of helps and the full 'are' clearly when you read the answers.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the checklist on the board." },
              { level: "Core", task: "Fix all four items." },
              { level: "Stretch", task: "Write two more helping sentences with a mistake for your partner to fix, one with 'Everyone' or 'Each'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My helping story",
        prompt: "Tell a short story about a time you helped someone, or someone helped you. Say what happened First, Next, Then and Finally, and how things are different now.",
        length: "60-90 seconds",
        steps: [
          "Choose your story and write four key words: First, Next, Then, Finally.",
          "Say the story three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep talking without long stops.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự kể, đừng nhắc từng chữ.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your helping story in order, use full sentences with the right verb endings, and keep talking without long stops.",
        words: ["help", "need", "volunteer", "neighborhood", "kindness", "difference", "problem", "solution"],
        grammar: ["First, Next, Then, Finally", "Before, ___. Now, ___.", "He / she / it helps (verb + s); they help"],
        rubric: [
          { label: "Story in order", description: "Tells the story with First, Next, Then and Finally, and says how things changed (Before / Now).", weight: 3 },
          { label: "Agreement", description: "Verbs agree with the subject: she helps, he needs, they help, the volunteers are.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in complete sentences, not single words.", weight: 2 },
          { label: "Unit words", description: "Uses words from the unit such as need, volunteer, neighborhood, difference.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___ needed ___.", "Next, ___ helped ___.", "Finally, ___."], tips: ["Point to your four key words as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, ___ needed help with ___.", "Then, ___ helped by ___.", "Before, ___. Now, ___."], tips: ["Check the -s on helps, needs and says."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["This shows that ___.", "Everyone in ___ helps each other by ___."], tips: ["End with what the story shows about helping."] },
        ],
      },
    },
  },
};
