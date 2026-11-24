import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 7 "Time and the
// Earth" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases and the future with will said
// again and again as whole sentences, with Unit 6's phrases mixed back in) and one writing
// routine (plan, write, check, then say it aloud). Lessons 3 and 5 end with a recorded
// talk for home that repeats the class routine days later (Lesson 4 already has its vlog).
// Time comes from games and repeats, never from the book pages or the grammar. All text
// is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('In two hours, it will ...'), point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice ('It will rains?'). Typical slips here: 'it will five o'clock' (be is missing), 'will rises' (no -s after will), 'it will don't', and a dropped final -s on minutes, hours and seconds. For a sound, just say it right and let the child echo it. Say every final -s and -t clearly yourself (minutes, hours, won't): children copy what they hear.";

const drillFeedback =
  "Prompt, do not tell: for 'It will rains' hold up one finger and say 'It will ...?' and let the child fix it; for 'It going to rain' point to your wrist and say 'It ... going to?' (be is missing); for 'When the sun will rise' repeat it with a rising voice and point to the present-tense card. For a sound, just say it right and let the child echo it. Say every final -s, -t and the 'll in 'it'll' clearly yourself. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
  minutes?: number;
}): Slide {
  const six = o.minutes === 6;
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: o.minutes ?? 7,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or the tense, P = change the person). The class says the new sentence together." },
      { seconds: six ? 75 : 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Try two signs together when you can: X + or T P." },
      { seconds: six ? 75 : 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: say something true about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. Ages 8-10 can take the full set of signs, but teach them one at a time in the first lesson and keep it brisk; a drill that drags loses its point. The T sign and the last round push the grammar one step toward Level 4 (will or going to, and when / as soon as with the present). Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, add a reason with + because or so, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U7Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u07-l1": {
      objectives: ["I can say how long things take, fast and smooth, without stopping."],
      trim: { "Time tools table": 3, "Word and meaning pairs": 4 },
      drop: ["Day and night with a flashlight"],
      add: [
        {
          after: "How much time does it take? (SB 68 B)",
          slide: {
            kind: "fluency",
            title: "Time sprint: it takes me ...",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "It takes me five minutes to brush my teeth.",
              "It takes me one hour to do my homework.",
              "It takes about sixty seconds to run around the yard.",
              "That's true. It takes me an hour, too.",
              "I'm not so sure. It takes me ten minutes.",
            ],
            recycle: ["I was reading when the lights went out.", "What were you doing when the bell rang?"],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows an action card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without stopping?" },
            ],
            steps: [
              "Look at the action card. Say a WHOLE sentence: 'It takes me ___ to ...'",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (a missing 'to', a dropped -s on minutes or hours) and let the class fix them, then go on.",
            ],
            prompts: ["(card: brush my teeth)", "(card: do my homework)", "(card: eat lunch)", "(card: walk to school)", "(card: read a book)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'It takes me ten minutes to walk to school' should come out as one smooth piece. Listen for the dropped final -s in 'minutes' and 'hours' and for the missing 'to'. Mix in Unit 6's 'was ... when' cards every few turns so those phrases stay quick. The times on the cards are the children's own, so the answers are never wrong; only the sentence is checked.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["It takes me ___ to ...", "It takes about ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Agree or disagree with your partner: 'That's true. It takes me ___, too.' or 'I'm not so sure. It takes me ___.'", frames: ["That's true. It takes me ___, too.", "I'm not so sure. It takes me ___."] },
            ],
          },
        },
        {
          after: "Time sprint: it takes me ...",
          slide: drill({
            title: "Grammar drill: it takes, it will take",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time. Then say how long things will take tomorrow.",
            chunks: [
              "It takes me ten minutes to walk to school.",
              "Does it take you an hour to do your homework? No, it doesn't.",
              "It will take me ten minutes to walk to school tomorrow.",
              "It won't take long, because the school is near.",
              "It will take longer when it rains, so I will leave early.",
              "I think it will take about twenty minutes, so I will leave at seven.",
            ],
            recycle: ["I was reading when the lights went out.", "The poet who wrote it is famous.", "If it rains, I will take an umbrella."],
            prompts: ["It takes me five minutes to eat. (?)", "It takes an hour to cook. (X)", "It takes me ten minutes. (+ because)", "It takes me ten minutes. (T: tomorrow)", "It takes me ten minutes. (P: it takes her)"],
            real: "Real talk: tell your partner how long three things will take you tomorrow. Then guess one thing that will take longer than usual, and say why. Your partner asks one question.",
            slips: "'It will takes' or 'It take me'",
            support: ["Does it take you ___? Yes, it does.", "It will take me ___."],
            stretch: "Use two signs at once and add 'when': 'When it rains, it will take me longer, so I will ...'",
            stretchFrames: ["When ___, it will take me ___.", "I think it will take ___, but I am not sure."],
          }),
        },
        {
          after: "Match the sentence to the word (SB 69 C)",
          slide: {
            kind: "writing",
            title: "How long does it take? Plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of things you do before school.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use First, Then and After that.",
              "Check: tick the checklist. Swap with a partner: they underline one 'It takes me ...' sentence and one time word with -s, and tell you one thing they liked.",
              "Teacher: while they write, look only at 'It takes me ___ to + verb' and the -s on minutes and hours. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: My morning",
              text: "My morning takes about one hour. First, it takes me ten minutes to brush my teeth and get dressed. Then it takes me twenty minutes to eat breakfast with my family. After that, it takes me about thirty minutes to walk to school. Some things take only sixty seconds, but other things take a long time. I like my morning because I am never late!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which part of your day? About how long does it take all together?" },
              { label: "Detail 1: First, ...", prompt: "What do you do first? How many minutes does it take?" },
              { label: "Detail 2: Then, ... After that, ...", prompt: "What do you do next? How long does it take? Use 'to' and a verb." },
              { label: "Closing", prompt: "How do you feel about this part of your day? Say why." },
            ],
            frames: ["My ___ takes about ___.","First, it takes me ___ minutes to ...","Then it takes me ___ to ... After that, ...","I like my ___ because ..."],
            checklist: [
              "My first sentence says which part of the day and about how long",
              "'It takes me ___ to + a verb' at least twice",
              "Minutes, hours, seconds: the -s is there when there is more than one",
              "First, Then and After that join my details",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. Mark only two targets ('It takes me ___ to + verb' and the -s on time words) with a dot on the line; the child finds and fixes the mistake. This replaces 'Grow my time sentence': the grown-up sentences now sit inside the model. Model the final -s aloud when you read the paragraph.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["My ___ takes about ___.","First, it takes me ___ minutes to ..."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence about how long something takes the Earth: 'It takes the Earth one year to go around the sun.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u07-l2": {
      objectives: ["I can explain how the Earth makes day and night, again and again, a little faster each time."],
      trim: { "Multiplying time: a challenge": 5 },
      drop: ["Time zone quiz", "Human time ladder"],
      add: [
        {
          after: "Explain a diagram",
          slide: {
            kind: "fluency",
            title: "Day and night: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Explain the same diagram three times. Each time is shorter, smoother and faster.",
            chunks: [
              "The Earth spins once every day.",
              "When our side faces the sun, it is day.",
              "When our side turns away from the sun, it is night.",
              "The Earth orbits the sun once a year.",
              "This diagram shows that the Earth never stops moving.",
            ],
            recycle: ["The rain taps on the roof.", "The wind whispers in the trees."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A explains the diagram, then Partner B. Use the key-word cards: spin, day, night, orbit, year. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A explains it again in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A explains it fast, then Partner B. Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the diagram and the five key-word cards. Point as you speak.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'The Earth spin' or 'it is night' said as 'it night') and let the class fix them, then go on.",
              "Each round, both partners talk: Partner A talks, then Partner B talks. When the bell rings, find a new partner. The listener has a job: count how many of the five key words you used, then tell you.",
              "In round 3, try to use all five key words.",
            ],
            prompts: ["spin", "day", "night", "orbit", "year"],
            feedback: correct,
            teacherNote: "This is the same explanation three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what turns the extra speed into more accurate speech. Listen for 'spins' (the -s after the Earth) and 'is' in 'it is day'. Keep the key-word cards on the board for Support children.",
            tiers: [
              { level: "Support", task: "Point to the diagram and say one sentence for each key word.", frames: ["The Earth spins ...", "It is day when ...", "It is night when ..."] },
              { level: "Core", task: "Explain all of it using the key words, without the frames." },
              { level: "Stretch", task: "Add a reason or an example: 'It is important because ...', or say what it is like in Tokyo at the same time.", frames: ["It is important because ...", "At the same time in Tokyo, ..."] },
            ],
          },
        },
        {
          after: "Day and night: tell it again, faster",
          slide: drill({
            title: "Grammar drill: the Earth will keep spinning",
            goal: "Change the sentence about the Earth fast and right: ask it, say no, join it with a reason, change the time. Then guess what will happen tonight and tomorrow.",
            chunks: [
              "The Earth spins once every day.",
              "In twelve hours, our side of the Earth will face away from the sun.",
              "Will it be night in Tokyo? No, it won't. It will be afternoon there.",
              "It will be dark soon, because the Earth will keep spinning.",
              "I think it will be cold tonight, so I will wear a jacket.",
              "Tomorrow the Earth will spin again, and the sun will rise.",
            ],
            recycle: ["I have never seen a lion dance.", "While the bee was flying, it saw a flower.", "This is the place where we sat."],
            prompts: ["The Earth spins every day. (T: tomorrow)", "The sun will rise at six. (?)", "It will be dark at noon. (X)", "It will be night here. (+ because)", "We will see the sun. (P: she)"],
            real: "Real talk: tell your partner what the sky will look like tonight and tomorrow morning where you live. Say what you think will happen and why. Your partner asks one question.",
            slips: "'The Earth spin' or 'it will night'",
            support: ["Will it be ___? Yes, it will.", "It won't be ___."],
            stretch: "Use two signs at once and add 'when' with a present verb: 'When the Earth turns away from the sun, it will be night here.'",
            stretchFrames: ["When the Earth ___, it will be ___.", "I think it will be ___ because ___."],
          }),
        },
        {
          after: "Read the diagram: close to the sun, far from the sun",
          slide: {
            kind: "writing",
            title: "How the Earth makes day and night: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Use the diagram on SB 70-71 to help.",
              "Write: turn your notes into one paragraph that explains day and night. Start with your topic sentence and use First, When and Then.",
              "Check: tick the checklist. Swap with a partner: they underline one 'When ..., it is ...' sentence and tell you one thing that was clear.",
              "Teacher: while they write, look only at the -s after 'the Earth' (spins, faces, turns, travels) and 'it is day / it is night'. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Day and night",
              text: "The Earth makes day and night by spinning. First, the Earth spins like a top, and one spin takes about twenty-four hours. When our part of the Earth faces the sun, it is day, so we can see the light. Then our part turns away from the sun, and it is night. The Earth also travels around the sun, and that takes one year. So the Earth spins and travels at the same time.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What does the Earth do to make day and night?" },
              { label: "Step 1: First, ...", prompt: "How does the Earth move? How long does one spin take?" },
              { label: "Step 2: When ..., it is ... Then ...", prompt: "What happens when our part faces the sun? And when it turns away?" },
              { label: "Closing", prompt: "What else does the Earth do? How long does it take?" },
            ],
            frames: ["The Earth makes ___ by ...","First, the Earth spins and one spin takes ...","When our part ..., it is ... Then ...","The Earth also ..."],
            checklist: [
              "My first sentence says what the Earth does to make day and night",
              "'spins', 'faces', 'turns', 'travels': the -s is there after the Earth",
              "'it is day' and 'it is night': is is there",
              "First, When and Then show the order",
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, with a drawing of the Earth and the sun.",
            teacherNote: "This replaces the dictogloss: the same facts, now as a paragraph the child plans and writes. Plan, write, check: the boxes take words, so the time goes into the explanation. Mark only two targets (the -s after 'the Earth' and 'it is day / night') with a dot on the line; the child finds and fixes the mistake. Read the model aloud with clear final sounds.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["The Earth makes ___ by ...","When our part ..., it is ..."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence about why we need clocks: 'We need clocks because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u07-l3": {
      objectives: ["I can say what will happen tomorrow, in one smooth talk, three times."],
      drop: ["Will and won't ping-pong", "True or false time facts"],
      add: [
        {
          after: "Future facts with will",
          slide: {
            kind: "grammar",
            title: "Level 4 step: will or going to",
            hook: "Will is what we think. Going to is what we can see.",
            form: [
              { label: "will: what we know or think", pattern: "I think / I'm sure + it will + plain verb (I think it will be cold tonight.)" },
              { label: "going to: what we can see now", pattern: "am / is / are + going to + plain verb (Look at the clouds! It is going to rain.)" },
              { label: "Questions and no", pattern: "Will it ...? No, it won't.  /  Is it going to ...? No, it isn't." },
              { label: "when / as soon as + present", pattern: "When / As soon as + present verb, ... will + plain verb (When the sun rises, it will be day.)" },
            ],
            explanation: [
              "Two small words help us talk about the future. We use 'will' for an idea or a guess: we know something or we think something, but we cannot see it yet. We use 'going to' for something we can see right now: dark clouds, a red sky, a clock that is nearly at twelve. The sentence says what comes next.",
              "You already know the first part. In this unit you said 'it will be noon' and 'it won't be dark'. 'Going to' grows out of it: we put am, is or are before it, and the verb after 'to' stays plain, just like after will. There is one more small step. After 'when' and 'as soon as' we use the present verb, even when we talk about the future: 'When the sun rises, it will be day.' Only the second part has 'will'.",
              "This is grammar you will meet again in Oxford Discover 4. If you say it fast and smooth now, it will feel easy there.",
            ],
            examples: [
              { text: "I think the Earth will spin for a very long time.", note: "will: an idea, nothing to see now" },
              { text: "Look! The sun is going to set. The sky is red.", note: "going to: we can see it now" },
              { text: "I think it will be cold at night, but I am not sure.", note: "will after 'I think'" },
              { text: "When the sun rises, it will be day in Hanoi.", note: "when + present verb, then will" },
              { text: "As soon as the clock strikes twelve, we will eat lunch.", note: "as soon as + present verb" },
              { text: "Is it going to be dark soon? Yes, it is. The sun is very low.", note: "question and short answer with going to" },
            ],
            pitfalls: [
              { wrong: "When the sun will rise, it will be day.", right: "When the sun rises, it will be day.", why: "After 'when' and 'as soon as' we use the present verb. Only the second part has 'will'." },
              { wrong: "It is going to rains.", right: "It is going to rain.", why: "After 'going to' the verb stays plain, with no -s." },
              { wrong: "Look at the clouds! It going to rain.", right: "Look at the clouds! It is going to rain.", why: "We need am, is or are before 'going to'." },
            ],
          },
        },
        {
          after: "Level 4 step: will or going to",
          slide: drill({
            title: "Grammar drill: will, going to, when",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time. Then use 'going to' for what you can see and 'when' with the present.",
            chunks: [
              "In one hour, it will be noon, so we will eat lunch.",
              "Will it be dark at noon? No, it won't.",
              "I think it will rain tomorrow, but I am not sure.",
              "Look at those black clouds! It is going to rain.",
              "Is the sun going to rise soon? Yes, it is, because the sky is getting light.",
              "When the bell rings, we will go home.",
              "As soon as I get home, I will do my homework.",
            ],
            recycle: ["If we move to the city, I will go to a new school.", "I was reading when a beetle landed on my book.", "I enjoy swimming, and I want to learn to dive."],
            prompts: ["It will be noon in an hour. (?)", "It will be dark at noon. (X)", "I will take an umbrella. (+ because)", "The sky is dark. (T: it is going to rain)", "I will eat lunch. (P: she)"],
            real: "Real talk, the Level 4 step: look out of the window and say one thing that is going to happen (what you can see). Then guess what will happen tomorrow, and say what you will do as soon as school finishes. Your partner asks one question.",
            slips: "'it will rains', 'it going to rain' or 'when it will rain'",
            support: ["Will it ___? Yes, it will.", "Look! It is going to ___."],
            stretch: "Use two signs at once and a follow-up question: 'When the bell rings, I will ... because ... Is it going to rain?'",
            stretchFrames: ["When / As soon as ___ (present), I will ___.", "Is it going to ___? I think it will ___."],
          }),
        },
        {
          after: "Now and later chart (SB 73 G)",
          slide: {
            kind: "fluency",
            title: "4-3-2: my plan for tomorrow",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Tell your plan for tomorrow to three partners. The same talk, a little shorter and smoother each time.",
            chunks: [
              "Tomorrow, I will get up at six o'clock.",
              "In one hour, it will be seven o'clock, so I will go to school.",
              "At noon, I will eat lunch with my friends.",
              "I won't play games until I finish my homework.",
              "Tomorrow night, I will go to bed at nine o'clock.",
            ],
            recycle: ["I was reading when the lights went out.", "It takes me ten minutes to walk to school."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the plan for tomorrow for one minute and a quarter, then Partner B. The listener only listens. Then change partners." },
              { seconds: 60, say: "Round 2: Tell the same plan in one minute. Partner A, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Tell it in 45 seconds. Partner A, then Partner B. Keep going, and use your best sentences." },
            ],
            steps: [
              "Plan: think of four things you will do tomorrow and the time for each. Draw four small clocks, not words.",
              "Talk: tell your plan. Use 'will' for later and 'won't' for no. In each round Partner A talks, then Partner B talks.",
              "Listen: the listener's job is to count how many times you said 'will' and tell you at the end.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'it will five o'clock' or 'I will goes') and let the class fix them. Then start round 2.",
            ],
            prompts: ["(small clock: six o'clock)", "(small clock: seven o'clock)", "(small clock: noon)", "(small clock: nine o'clock)"],
            feedback: correct,
            teacherNote: "The 4-3-2 works because the same ideas come out faster each round; it builds speed but not accuracy by itself. The one-minute fix between round 1 and round 2 is what makes the second telling more correct, not just quicker. Listen for 'will be' with a clock time and for the plain verb after will. Say 'won't' and 'minutes' with a clear final sound yourself.",
            tiers: [
              { level: "Support", task: "Use the four clocks and the frames. Say a short sentence for each clock.", frames: ["Tomorrow, I will ... at ___ o'clock.", "At noon, I will ..."] },
              { level: "Core", task: "Talk from the four clocks only, without reading." },
              { level: "Stretch", task: "Add 'so' and 'because' and a thing you won't do: 'It will be six, so ...', 'I won't ... because ...'", frames: ["In ___ hours, it will be ___, so I will ...", "I won't ... because ..."] },
            ],
          },
        },
        {
          after: "Complete the future facts (SB 73 F)",
          slide: {
            kind: "writing",
            title: "My plan for tomorrow: plan, write, check",
            routine: "paragraph",
            genre: "plan",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Think of four clocks and a time for each.",
              "Write: turn your notes into one paragraph. Join two ideas with so or because, and use 'will' and 'won't'.",
              "Check: tick the checklist. Swap with a partner: they underline one 'will' and one 'won't' and tell you one thing they liked.",
              "Teacher: while they write, look only at the plain verb after will and 'will be' before a clock time. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: A busy day",
              text: "Tomorrow will be a busy day. At seven o'clock, I will get up and eat breakfast. In one hour, it will be eight o'clock, so I will walk to school with my friend. At noon, we will have lunch, and then we won't play outside because it will be very hot. After school, I will do my homework. I won't go to bed late, because I want to be ready for the next day!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What kind of day will tomorrow be?" },
              { label: "Detail 1: At ___ o'clock, ...", prompt: "What will you do in the morning? At what time?" },
              { label: "Detail 2: At noon / After school, ...", prompt: "What will you do later? Join two ideas with so or because." },
              { label: "Closing: I won't ...", prompt: "What won't you do? Why not?" },
            ],
            frames: ["Tomorrow will be a ___ day.","At ___ o'clock, I will ...","In ___ hours, it will be ___, so I will ...","I won't ... because ..."],
            checklist: [
              "My first sentence says what kind of day tomorrow will be",
              "After will: the plain verb, no -s ('will eat', not 'will eats')",
              "'will be' before a time on the clock",
              "so and because join two ideas, and I wrote one 'won't'",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your plan again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences. Mark only two targets (the plain verb after will, and 'will be' before a time) with a dot on the line; the child finds and fixes the mistake. This replaces sentence combining: the so / because joining now happens inside the paragraph. The paragraph is also the script for this lesson's recorded talk 'Tomorrow, at ___ o'clock'.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["At ___ o'clock, I will ...","I won't ... because ..."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence about a friend in another time zone: 'When it is noon in Hanoi, it will be ___ in Tokyo.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tomorrow, at ___ o'clock",
        prompt: "Tell a grown-up your plan for tomorrow, like in class. Say four things you will do, and the time for each. Say one thing you won't do.",
        length: "60-90 seconds",
        steps: [
          "Look at the four little clocks you drew in class. Say your plan out loud.",
          "Say it three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Add one sentence with 'when' or 'as soon as' and a present verb: 'As soon as I get up, I will ...'",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what you will do tomorrow, with the time for each, and keep talking without long stops.",
        words: ["tomorrow", "noon", "hour", "minute", "will", "won't"],
        grammar: ["Tomorrow, I will ___ at ___ o'clock.", "In ___ hours, it will be ___.", "I won't ___ because ___.", "When / As soon as ___ (present), I will ___."],
        rubric: [
          { label: "Four plans", description: "Says four things for tomorrow, each with a time.", weight: 2 },
          { label: "Will and won't", description: "Uses 'will' with the plain verb and 'it will be' before a time, and says at least one 'won't'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The final sounds in 'minutes', 'hours' and 'won't' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Tomorrow, I will ___ at ___ o'clock.", "At noon, I will ___.", "I won't ___."], tips: ["Point to your four clocks as you speak."] },
          { level: "Core", who: "Most children", frames: ["Tomorrow, I will ___ at ___ o'clock, and then I will ___.", "In ___ hours, it will be ___, so I will ___.", "I won't ___ until ___."], tips: ["Say the time for every thing you will do."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["When I ___, my friend in Tokyo will ___.", "I won't ___ because ___."], tips: ["Add what it will be in another time zone, and a reason with 'because'."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u07-l4": {
      objectives: ["I can ask and answer about tomorrow's weather and time, round the circle, without stopping."],
      trim: { "Plan and practice your call": 3, "Word families with -tion (SB 75 D)": 4 },
      drop: ["Weather forecast show"],
      add: [
        {
          after: "Using the with country names",
          slide: drill({
            title: "Grammar drill: the or no the? Where will we go?",
            goal: "Change the sentence about places fast and right: ask it, say no, join it with a reason, change the time. Then say what is going to happen on a trip.",
            chunks: [
              "My aunt lives in the United States, and she will visit Japan next year.",
              "Will you visit the Netherlands? No, I won't. I will visit Turkey.",
              "The sun will rise at six in the United Kingdom.",
              "Look at the sky over Japan! It is going to rain.",
              "When we arrive in the Philippines, we will swim in the sea.",
              "My cousin lives in Chile, but he is going to visit the United Arab Emirates.",
            ],
            recycle: ["Have you ever been to a festival?", "While the bee was flying, it saw a flower.", "She is the girl who sits next to me."],
            prompts: ["My aunt lives in the Netherlands. (?)", "We will fly to the Japan. (fix it, then X)", "We will go to Turkey. (+ because)", "We will visit Chile. (T: we are going to)", "I will visit the Philippines. (P: she)"],
            real: "Real talk, going one step further: tell your partner about a place you will visit one day, or a place you can see on the map now. Say where it is and what is going to happen when you get there. Your partner asks one question.",
            slips: "'in the Japan', 'in Philippines' or 'it will to be'",
            support: ["Will you visit ___? Yes, I will.", "I won't go to ___."],
            stretch: "Use two signs at once and 'when': 'When we arrive in the United Kingdom, we will ... because ... Are you going to visit the Netherlands?'",
            stretchFrames: ["When we arrive in ___, we will ___.", "Are you going to visit ___? I think I will."],
          }),
        },
        {
          after: "Pick a city and talk about tomorrow (SB 75 C)",
          slide: {
            kind: "fluency",
            title: "Question chain: what will it be like tomorrow?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going all the way round with no stops!",
            chunks: [
              "What will the weather be like in Tokyo tomorrow?",
              "It will be sunny, and the high will be thirty degrees.",
              "Will it rain in Singapore tomorrow? No, it won't.",
              "What time will the sun rise tomorrow?",
              "It will rise at six in the morning, and it will set at six in the evening.",
            ],
            recycle: ["It takes me ten minutes to walk to school.", "The wind whispers in the tall trees."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a city card with a weather picture." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Hold your city card. Ask the child next to you: 'What will the weather be like in ___ tomorrow?'",
              "Answer with a whole sentence, then turn and ask the next friend a new question.",
              "The listener has a job: tick the card if the answer used 'will' and a weather word.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (for example 'It will rains' or 'It will sunny') and let the class fix them. Then go on.",
            ],
            prompts: ["(card: Tokyo, sunny)", "(card: Singapore, rainy)", "(card: Beijing, cloudy)", "(card: Dubai, hot)", "(card: Hanoi, windy)"],
            feedback: correct,
            teacherNote: "A chain gives every child a turn at both the question and the answer, and the whole class hears many models of the same sentences. Keep the question and the answer as whole sentences, not words. Listen for 'will be' before a weather word and for the plain verb after will. If a child stops, point to the frame and let them start again: the chain is more important than perfect words.",
            tiers: [
              { level: "Support", task: "Read the question frame and answer with the frame.", frames: ["What will the weather be like in ___ tomorrow?", "It will be ___."] },
              { level: "Core", task: "Ask and answer without reading, and add the high temperature." },
              { level: "Stretch", task: "Add a second sentence with 'but' or 'so': 'It won't rain, but it will be cloudy.'", frames: ["It won't ___, but it will be ___.", "It will be ___, so I will ..."] },
            ],
          },
        },
        {
          after: "Put in the where needed (SB 75 E)",
          slide: {
            kind: "writing",
            title: "Fix it: will, be and the",
            routine: "fix it",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: is 'the' missing or too many? Is 'be' missing after will? Is there an extra -s?",
              "Write the sentence the right way. Check, then read it aloud together.",
            ],
            items: [
              { q: "My aunt lives in United States.", answer: "My aunt lives in the United States." },
              { q: "We will fly to the Japan next year.", answer: "We will fly to Japan next year." },
              { q: "Sun will rise at six tomorrow.", answer: "The sun will rise at six tomorrow." },
              { q: "Our friends live in Philippines.", answer: "Our friends live in the Philippines." },
              { q: "Tomorrow it will to be cloudy in Turkey.", answer: "Tomorrow it will be cloudy in Turkey." },
            ],
            checklist: ["'the' with the sun, the moon, the Earth and names like the United States", "No 'the' with most countries (Vietnam, Japan, Turkey)", "After will: the plain verb, no 'to'"],
            sayIt: "Read your fixed sentences aloud, then say each one again without looking.",
            teacherNote: "Focus on two or three error types only: 'the' with country names, 'the sun', and 'will be'. Vietnamese has no articles, so 'the' is often dropped; children may also add 'the' to a name like Japan after learning the rule, so praise the child who notices it. Explain each correction in one sentence.",
            tiers: [
              { level: "Support", task: "Fix sentences 2, 3 and 5 (the board has the rule cards)." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two more sentences with mistakes about countries for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u07-l5": {
      objectives: ["I can talk about the day camp and the time zones with 'will', again and again, without stopping."],
      trim: { "Grammar mystery: The Clock Keeper of Sun Hill": 6 },
      drop: ["Clock hop"],
      add: [
        {
          after: "Grammar: future facts with will and won't",
          slide: drill({
            title: "Grammar drill: will, going to, when, as soon as",
            goal: "Change the sentence fast and right with will and with the Level 4 step: ask it, say no, join it with a reason, change the time. Then say what is going to happen and what will happen when it does.",
            chunks: [
              "In two hours, it will be five o'clock, so we will go home.",
              "Look! The clock keeper is running. He is going to be late.",
              "It won't be dark at noon, because the sun will be high.",
              "Is it going to be sunny? Yes, I think it will be.",
              "When it is noon in Hanoi, it will be two o'clock in Tokyo.",
              "As soon as the bell rings, we are going to run to the yard.",
              "I will call my friend as soon as I get home.",
            ],
            recycle: ["The poet who wrote it is famous.", "It must be solar power.", "If I lived under the sea, I would ride a dolphin to school."],
            prompts: ["It will be five o'clock soon. (?)", "It will be dark at noon. (X)", "I will go to bed. (+ as soon as I finish my homework)", "It is noon in Hanoi. (+ when: it will be two o'clock in Tokyo)", "I am going to run. (P: they)"],
            real: "Real talk, both parts of the lesson: say what you can see that is going to happen (going to). Then say two things you will do tomorrow with 'when' or 'as soon as' and the present. Your partner asks one question and then gives you their best sentence.",
            slips: "'will rises', 'it will five o'clock' or 'when it will be noon'",
            support: ["Will it be ___? Yes, it will.", "Look! It is going to ___.", "As soon as ___, I will ___."],
            stretch: "Use two signs at once and a reason: 'When it is noon in Hanoi, it will be two o'clock in Tokyo, so my friend is going to eat lunch.'",
            stretchFrames: ["When it is ___ in Hanoi, it will be ___ in ___.", "As soon as ___, I will ___ because ___."],
          }),
        },
        {
          after: "The Moon Bay day camp: ask and fill in",
          slide: {
            kind: "fluency",
            title: "Day camp again: ask, answer, swap",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the day camp task again with a new partner, with the same sentences and fewer mistakes.",
            chunks: [
              "What will the campers do at nine o'clock?",
              "At nine o'clock, they will make a sundial.",
              "Will they swim at noon? No, they won't. They will eat lunch.",
              "When it is noon in Hanoi, it will be two o'clock in Tokyo.",
              "In three hours, it will be four o'clock, so they will go home.",
            ],
            recycle: ["It takes me ten minutes to walk to school.", "The Earth spins once every day."],
            rounds: [
              { seconds: 90, say: "Round 1: Partner A asks and Partner B answers about the camp plan, then they swap. Then change partners." },
              { seconds: 75, say: "Round 2, after the one-minute fix: same task, Partner A then Partner B, smoother and faster. Use different times!" },
            ],
            steps: [
              "Plan: look at the day camp plan, choose five questions and say the answers in a whisper before round 1.",
              "Do the task: ask 'What will the campers do at ___ o'clock?' and answer with a whole sentence.",
              "Teacher: after the first task, stop for one minute. Write two mistakes you heard on the board and let the class fix them. Then change partners and do the task again.",
              "The listener has a job: ask one follow-up question ('Why not?' or 'What time will it be in Tokyo?').",
            ],
            prompts: ["(camp plan: nine o'clock)", "(camp plan: noon)", "(camp plan: three o'clock)", "(time zone card: Tokyo, +2)"],
            feedback: correct,
            teacherNote: "Task repeat works because the second time the children already know what to say, so they can spend attention on how they say it. The planning minute makes the first telling better; the one-minute fix makes the second more accurate. Listen for the plain verb after will, 'will be' before a time, and the answer shape 'No, they won't. They will ...'.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and read the questions.", frames: ["What will the campers do at ___ o'clock?", "They will ___."] },
              { level: "Core", task: "Ask and answer without reading." },
              { level: "Stretch", task: "Add a time zone sentence and a reason: 'When it is ___ in Hanoi, it will be ___ in Tokyo, so ...'", frames: ["When it is ___ in Hanoi, it will be ___ in ...", "They will ___ because ___."] },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Read a model, then write: a day in two cities",
            routine: "model, then write",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the model. Notice: it has a first sentence about tomorrow, a time in each city, and a last sentence with a plan.",
              "Plan: draw two small clocks, one for Hanoi and one for Tokyo, and write the times.",
              "Write a short paragraph: a first sentence, three or four middle sentences, and a last sentence. Use the frames, then check with the checklist.",
            ],
            text: {
              title: "A day in two cities",
              text: "Tomorrow, I will wake up at six o'clock in Hanoi. In one hour, it will be seven o'clock, so I will eat breakfast. At that time in Tokyo, it will be nine o'clock. My friend will be at school! I won't call her then, because she will be busy. As soon as it is noon in Hanoi, I will call her. Then it will be two o'clock in Tokyo, and she will eat lunch.",
            },
            frames: ["Tomorrow, I will ___ at ___ o'clock in Hanoi.", "At that time in ___, it will be ___.", "I won't ___ because ___.", "I will ___ at ___.", "So tomorrow will be a ___ day!"],
            checklist: ["A first sentence that says what the paragraph is about, and a last sentence that ends it", "'will be' before a clock time", "The plain verb after will and won't", "A capital letter at the start and a full stop at the end of each sentence", "One sentence with 'when' or 'as soon as' and a present verb, and one with 'going to' for something I can see"],
            sayIt: "Read your sentences aloud to a partner, then tell them again without looking.",
            teacherNote: "Reading a short model first, then writing a text like it, helps children see how a paragraph is built. Read the model aloud together once, then let the children underline the 'will' phrases. It is the lead-in to the longer message later in the lesson, so keep it to one short paragraph.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill them with your two clocks." },
              { level: "Core", task: "Write the paragraph in your own words with the frames: five or six sentences." },
              { level: "Stretch", task: "Write seven sentences and add 'so' and 'because'.", frames: ["It will be ___, so ...", "I won't ___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "When it is noon in Hanoi",
        prompt: "Tell a grown-up what time it will be in two other cities when it is noon in Hanoi, and what people there will do. Explain why the time is different.",
        length: "60-90 seconds",
        steps: [
          "Look at your time zone card from class: Tokyo is two hours ahead, Dubai is three hours behind.",
          "Add one sentence with 'as soon as' or 'when' and a present verb ('As soon as it is noon, I will call ...') and one with 'going to' about what you can see.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Record it once. Look at the camera and keep going, even if you make a small mistake.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what time it will be in two cities when it is noon in Hanoi, with a reason, and keep going without long stops.",
        words: ["noon", "time zone", "spin", "orbit", "hour", "will"],
        grammar: ["When it is ___ in Hanoi, it will be ___ in ___.", "They will ___ because ___.", "It won't be ___ .", "As soon as / When ___ (present), I will ___."],
        rubric: [
          { label: "Two cities", description: "Gives the time for two cities, correct for the time zone card.", weight: 2 },
          { label: "Will and be", description: "Uses 'it will be' before a time and the plain verb after will, and says one 'won't'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "A reason", description: "Gives a reason with 'because' or 'so', for example that the Earth spins.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["When it is noon in Hanoi, it will be ___ in Tokyo.", "In Dubai, it will be ___.", "They will ___."], tips: ["Look at your time zone card as you speak."] },
          { level: "Core", who: "Most children", frames: ["When it is noon in Hanoi, it will be ___ in Tokyo, so they will ___.", "In Dubai, it will be ___, so people will ___."], tips: ["Say what people will do in each city."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["The time is different because the Earth ___.", "It won't be ___ in ___ because ___."], tips: ["Explain why the time is different, and use 'won't' with a reason."] },
        ],
      },
    },
  },
};
