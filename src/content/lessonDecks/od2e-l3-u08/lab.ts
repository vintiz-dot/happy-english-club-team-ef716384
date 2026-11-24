import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 8 "Travel and Time
// Zones" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Every lesson gets one fluency routine (the unit's phrases and the going to plan said
// again and again as whole sentences, with Unit 7's will phrases mixed back in) and one
// short writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a
// recorded talk for home that repeats the class routine. Time comes from games and
// warm-ups, never from the book pages, the grammar or the checks. All text is original.

const goingTo =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between round 1 and round 2, stop for one minute: write them on the board and let the class fix them; children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('I am ...?'), point to the frame on the board, hold up a finger for the missing word, or repeat the error with a rising voice ('She is going to buys?'). Typical slips: 'I going to fly' (missing am), 'She is going to buys' (verb after to must stay plain), 'Yes, I going' (the short answer is 'Yes, I am.'). For a sound, just say it right and let the child echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

// ---- Level 4 raise: a grammar drill in every lesson and one Level 4 step -------------------
// The step (present continuous for fixed plans, present simple for timetables) is taught in
// lesson 3, where the unit's going to grammar is taught; every later drill uses it again.

const drillBase =
  "Prompt, do not tell: hold up one finger for a missing word, start the phrase and pause, or repeat the slip with a rising voice and let the child fix it. Say every final -s and the contractions clearly yourself. For a sound, recast: say it right once and let the child echo it. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson. Vietnamese verbs do not change with the person or the time, so ";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  fix: string;
  support: string[];
  stretch: string;
  stretchFrames: string[];
}): Slide {
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: 6,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / so / when / although, T = change the time or the way we say it, P = change the person). The class says the new sentence together." },
      { seconds: 75, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: 75, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk about your own life. Remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillBase + o.fix,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has the children talk about their own lives, so the form is used for meaning. Ages 8-10 can take the full set of signs, one at a time at first (show the ? card, practise, then add X, then +). Keep it brisk: six minutes, no more. Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

const STEP = "Level 4 step: Fixed plans and timetables";

// Oxford Discover 4 grammar, B1: a plan we have fixed is the present continuous; a timetable is the present simple.
const level4Step: Slide = {
  kind: "grammar",
  title: STEP,
  hook: "Going to says what we plan. When a plan is fixed, with tickets and a time, we say it with -ing: We are flying on Monday.",
  form: [
    { label: "Fixed plan (+)", pattern: "I am (I'm) / He, She, It is / We, You, They are + verb-ing + a time   (We are flying to Tokyo on Monday.)" },
    { label: "Fixed plan (-) and question", pattern: "We aren't flying on Tuesday.   Are you flying on Monday?   Yes, I am. / No, I'm not." },
    { label: "Timetable", pattern: "present simple: it, he, she + -s   (The plane leaves at six. The shop opens at eight.)" },
    { label: "Timetable question", pattern: "What time does the plane leave?   Does it leave at six?   Yes, it does. / No, it doesn't." },
    { label: "Time words", pattern: "tomorrow, tonight, on Monday, next week, at six o'clock" },
  ],
  explanation: [
    "In this unit you learned going to for plans: I'm going to visit my aunt. Now there is a second way to talk about the future. When a plan is fixed (we have the tickets, we told our aunt, we know the day), we can use am / is / are + a verb with -ing and a time word: We are flying to Tokyo on Monday. It sounds more sure than going to. It is the same be verb (am, is, are) that you already use with going to, so the shape is easy.",
    "Trains, planes, buses and shops follow a timetable, and a timetable is not our own plan: it is the same every week. For a timetable we use the simple present, with the -s for it, he and she: The plane leaves at six. The shop opens at eight. We use it for times that are printed on a ticket or a sign.",
    "These two ways of talking about the future are a big step in your English. Many sentences use both together: The plane leaves at six, so we are leaving home at four. Next time you plan a trip, say what is fixed (with -ing) and what is on the timetable (the simple present).",
  ],
  examples: [
    { text: "We are flying to Tokyo on Monday.", note: "A fixed plan: the tickets are bought." },
    { text: "My aunt is meeting us at the airport at nine.", note: "A fixed plan with another person." },
    { text: "I'm not taking a taxi; we're taking the bus tomorrow.", note: "A fixed plan, with a negative." },
    { text: "The plane leaves at six, and it arrives at noon.", note: "A timetable: present simple." },
    { text: "What time does the train to Hai Phong leave?", note: "A timetable question: does + plain verb." },
    { text: "The plane leaves at six, so we are leaving home at four.", note: "Both together: the timetable and our fixed plan." },
  ],
  pitfalls: [
    { wrong: "We are fly to Tokyo on Monday.", right: "We are flying to Tokyo on Monday.", why: "After am / is / are the verb needs -ing. (After going to it stays plain: We are going to fly.)" },
    { wrong: "The plane leave at six.", right: "The plane leaves at six.", why: "A timetable uses the simple present, and it, he and she need the -s. Vietnamese verbs never change, so say the -s out loud." },
    { wrong: "What time does the plane leaves?", right: "What time does the plane leave?", why: "After does, the verb stays plain: the -s is already in does." },
  ],
};

export const odL3U8Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u08-l1": {
      objectives: ["I can say doctor and patient sentences fast, without stopping.", "I can write a long, clear sentence about a health problem."],
      trim: { "Airport or doctor? Four corners": 4, "What is a problem? Is / Is not sort": 6, "Dictionary duo": 3 },
      drop: ["Ache charades"],
      add: [
        {
          after: "Doctor, doctor! Role-play",
          slide: drill({
            title: "Grammar drill: I'm going to see the doctor",
            goal: "Change the going to sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about your own plans.",
            chunks: [
              "I have a headache, so I'm going to see the doctor.",
              "Is she going to take some medicine? Yes, she is.",
              "We aren't going to fly today because my brother is sick.",
              "He's going to feel better when he rests.",
              "What are you going to do after school?",
              "I'm going to ask the doctor what to do.",
            ],
            recycle: ["The doctor who helped me was very kind.", "If I have a fever, I will stay in bed.", "I was reading when my head started to hurt."],
            prompts: ["My sister is going to see a doctor. (?)", "We are going to fly today. (X)", "I'm going to rest. (+ because I'm tired)", "She is going to eat lunch. (T: tomorrow)", "He is going to buy medicine. (P: they)"],
            real: "Real talk: tell your partner what you are going to do the next time you feel sick, and one plan for this weekend. Say why. Your partner asks one question with going to.",
            slips: "'I going to see the doctor' or 'She is going to sees'",
            fix: "a missing am / is / are and an extra -s after to are the usual slips. For 'I going to rest' hold up a finger and say 'I ... going to rest?'; for 'She is going to sees' repeat it with a rising voice ('going to sees?'); for 'Yes, she going' say 'Yes, she ...?' and wait for is.",
            support: ["Is she going to ___? Yes, she is.", "I'm going to ___ because ___."],
            stretch: "Use two signs at once, then look ahead to Level 4: a plan we have fixed: 'We're flying to Tokyo on Monday, so I'm not going to school.'",
            stretchFrames: ["We're ___ing to ___ on ___.", "I'm going to ___ because ___."],
          }),
        },
        {
          after: "Doctor, doctor! Role-play",
          slide: {
            kind: "fluency",
            title: "Doctor sprint: say it in one breath",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole doctor and patient sentence, fast and smooth, with no stops.",
            chunks: [
              "What's the matter? I have a headache.",
              "I have a fever and an earache.",
              "Where does it hurt? It hurts here.",
              "You should take some medicine and rest.",
              "Thank you, doctor. I'll go home and sleep.",
            ],
            recycle: ["In two hours, it will be six o'clock.", "It won't be dark at noon."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture (a sick patient), the class says the whole sentence." },
              { seconds: 90, say: "Pairs: Doctor and Patient. The Doctor shows a picture, the Patient answers with a whole sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say before the bell?" },
            ],
            steps: [
              "Look at the picture card. Say the whole sentence, not one word.",
              "Say it again at the clap, a little faster.",
              "Listener's job: count the sentences on your fingers and tick the ones with no long stop.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them with the class, then go on to round 2.",
            ],
            prompts: ["(card: headache)", "(card: fever)", "(card: earache)", "(card: sneezing)", "(card: sick, in bed)"],
            feedback:
              "Listen for 'I have a headache' (not 'I headache'), the a / an before the word (a fever, an earache), and 'should take' with a plain verb. Prompt it: point to the frame and say 'I ... ?' and wait; hold up a finger for the missing 'a'. A pronunciation slip, such as the final -s in 'headaches' or the th in 'thank you', gets a quick recast: say it right once and the child echoes. Say the endings clearly yourself.",
            teacherNote:
              "The chunks are whole sentences, so the child practices saying 'You should take some medicine' as one smooth piece. The three rounds are the same sentences with less time, so the second and third are easier and faster. Mix in last unit's will phrases every few turns so they stay quick.",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, looking at the frame.", frames: ["I have a ___.", "You should take some ___."] },
              { level: "Core", task: "Say each whole sentence alone, without looking." },
              { level: "Stretch", task: "Add a reason: 'I have a fever, so I should rest.'", frames: ["I have a ___, so I should ___."] },
            ],
          },
        },
        {
          after: "Helping at home (SB 77 F)",
          slide: {
            kind: "writing",
            title: "Grow the doctor sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Think: what do I want to add? Who, when, how bad, or why?",
              "Read the short sentence. Write it bigger with the words in the brackets.",
              "Check your sentence with the checklist. Then say it to your partner.",
            ],
            items: [
              { q: "I have a fever. (add: bad, today)", answer: "I have a bad fever today." },
              { q: "The doctor gives me medicine. (add: kind, some)", answer: "The kind doctor gives me some medicine." },
              { q: "My sister has an earache. (add: little, after the flight)", answer: "My little sister has an earache after the flight." },
              { q: "The passenger shows a passport. (add: tired, at the airport)", answer: "The tired passenger shows a passport at the airport." },
            ],
            frames: ["The ___ doctor gives me ___.", "I have a ___ headache because ___."],
            checklist: ["A capital letter and a full stop", "a or an before the word (an earache)", "The -s on words like has and gives"],
            sayIt: "Read your long sentence to your partner, then say it again without looking.",
            teacherNote:
              "Expanding a bare sentence trains children to add detail before they write. Vietnamese learners often leave out a / an and the -s on has, so make these two items of the checklist the focus.",
            tiers: [
              { level: "Support", task: "Expand items 1 and 2 with the teacher and copy the big sentence." },
              { level: "Core", task: "Expand all four sentences." },
              { level: "Stretch", task: "Write one more bare sentence and expand it three times, adding a new detail each time." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u08-l2": {
      objectives: ["I can retell Molly's story three times, faster each time.", "I can plan and write a short paragraph that explains why a message is better than a call."],
      trim: { "Gist check": 3, "Text-message detectives": 6, "The story in fives": 11, "Look first, then predict": 7 },
      drop: ["Pass the passport", "Who looks after the home?"],
      add: [
        {
          after: "Day here, night there",
          slide: drill({
            title: "Grammar drill: day here, night there, going to",
            goal: "Change the going to sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about someone who lives far away.",
            chunks: [
              "It's night in Tokyo, so Molly is going to send a message.",
              "Is her aunt going to be awake? No, she isn't, because it's late there.",
              "My cousin isn't going to answer now, so I'm going to write to him.",
              "When it's noon here, it's two o'clock there.",
              "What are you going to say in your message?",
              "Molly is going to call her father when it's morning there.",
            ],
            recycle: ["If it is night there, I will send a message.", "I was talking to my friend when the phone rang.", "My aunt, who lives in Tokyo, is two hours ahead."],
            prompts: ["My aunt is going to call us. (?)", "I am going to phone her now. (X)", "I'm going to send a message. (+ because it's night there)", "My uncle is going to wake up. (T: tomorrow morning)", "My cousin is going to send a photo. (P: we)"],
            real: "Real talk: tell your partner about one person who lives far away. Say what time it is there, what you are going to say, and why. Your partner asks one question.",
            slips: "'It night there' (missing is) or 'She going to calls'",
            fix: "the be verb is often missing ('It night there', 'She going to call') and an -s sneaks in after to ('going to calls'). For 'It night there' point to the board and say 'It ... night there?'; for 'going to calls' repeat it with a rising voice and let the child fix it.",
            support: ["Is she going to ___? Yes, she is.", "It's ___ there, so I'm going to ___."],
            stretch: "Use two signs at once, then look ahead to Level 4: a plan that is fixed: 'My aunt is flying to Hanoi on Friday, so we're meeting her at the airport.'",
            stretchFrames: ["My ___ is ___ing to ___ on ___.", "We're ___ing her at ___."],
          }),
        },
        {
          after: "The story in fives",
          slide: {
            kind: "fluency",
            title: "Molly's story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times (about 60, 50 and 40 seconds each). Each time is shorter, smoother and faster.",
            chunks: [
              "Molly's mother is going to travel, and she is worried.",
              "Molly's father is sick, so Molly has a problem.",
              "It's day here, but it's night there, so Molly sends a message.",
              "Molly sends a text, and that is a good solution.",
            ],
            recycle: ["It's noon here, so it's two o'clock there.", "I'll call you tomorrow."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the story with the four key-word cards: mother, father, time, solution. Then Partner B tells it. Then change partners." },
              { seconds: 50, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: new partner. Partner A, then Partner B: tell it fast and smooth! The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Put the four key-word cards in order. In each round, Partner A tells the story in their own words, then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "When both partners have told the story, find a new partner.",
              "Listener's job: ask one follow-up question at the end, for example 'Why was she worried?'",
            ],
            prompts: ["(card: mother)", "(card: father)", "(card: time)", "(card: solution)"],
            feedback: goingTo,
            teacherNote:
              "The same story three times with a shrinking time limit is the evidence-based way to get fluency: the second and third tellings are faster because children are no longer searching for ideas. The one-minute fix between round 1 and round 2 is what adds accuracy, so do not skip it. Listen for 'is going to travel' (not 'is going to travels'), 'is sick', and the -s on messages.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["Molly's mother is ___.", "Molly's father is ___.", "It's ___ there, so ___."] },
              { level: "Core", task: "Tell all four parts in your own words, without the frames." },
              { level: "Stretch", task: "Add why Molly's idea works and what you would do.", frames: ["I think ___ because ___.", "I would ___ too."] },
            ],
          },
        },
        {
          after: "Problem and solution map",
          slide: {
            kind: "writing",
            title: "Why send a message? Plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Use your own friend or cousin and a city far away.",
              "Write: turn your notes into one paragraph. Use so and because to join the reasons.",
              "Check: tick the checklist. Swap with a partner: they underline one is / are + going to and tell you one thing they understood.",
              "Teacher: while they write, look only at is / are before going to and a plain verb after it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: Why Kim sends a message",
              text: "Time zones can make a call hard. Kim lives in Hanoi, and her aunt lives in Tokyo. Tokyo is two hours ahead, so it is already late there when it is evening here. Kim is going to send a message, because her aunt is going to sleep. In the morning, her aunt is going to read it and call back. That is why a message is often better than a call.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is hard about talking to someone in a different time zone?" },
              { label: "Who and where", prompt: "Who lives far away? Which city? How many hours ahead or behind?" },
              { label: "Reasons: so, because", prompt: "What is the time there? What is the person going to do? (going to)" },
              { label: "Closing: That is why ...", prompt: "What is better, a message or a call? Say why." },
            ],
            frames: ["___ lives in ___, and I live in ___.","___ is ___ hours ahead, so it is ___ there.","I am going to ___, because ___.","That is why ___."],
            checklist: [
              "A topic sentence at the start and a closing sentence at the end",
              "am / is / are before going to",
              "A plain verb after going to (send, sleep, read)",
              "Capital letters for names and cities"
            ],
            sayIt: "Read your paragraph to your partner. Then explain it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. An explanation paragraph states a point, gives reasons with so and because, and closes with the point again. Mark only two targets (is / are before going to, and a plain verb after it) with a dot on the line; the child finds and fixes the mistake. Tokyo is two hours ahead of Hanoi, so check that children's times are possible. This paragraph replaces the dictogloss, so the story work earlier in the lesson carries the listening.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["___ lives in ___, and I live in ___.","That is why ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a sentence with a time in two cities: 'When it is noon here, it is two o'clock there.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Tell Molly's story again",
        prompt: "Tell Molly's story at home to a grown-up or a toy. Use four parts: her mother, her father, the time difference and the solution. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Look at your four key-word cards from class (mother, father, time, solution).",
          "Tell the story three times: each time a little faster and smoother, like in class.",
          "Think about what you want to say in each part before you press record.",
          "Record it once. Look at the camera and keep talking, without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell the four parts of Molly's story in your own words and keep talking without long stops.",
        words: ["doctor", "sick", "fever", "passport", "airport", "problem", "solution"],
        grammar: ["is / are + going to + plain verb", "It's ___ here, so it's ___ there.", "because / so"],
        rubric: [
          { label: "Four parts", description: "Tells the mother, the father, the time difference and the solution in order.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Going to", description: "Uses is / are + going to + plain verb correctly at least twice.", weight: 2 },
          { label: "Linking words", description: "Joins ideas with because or so.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Molly's mother is ___.", "Molly's father is ___.", "It's ___ there, so ___."], tips: ["Point to your key-word cards as you speak.", "Say each sentence slowly and clearly."] },
          { level: "Core", who: "Most children", frames: ["Molly's mother is going to ___, and she is worried.", "Molly's father is ___, so ___.", "Molly sends a text because ___."], tips: ["Use because or so at least twice.", "Look at the camera, not at your cards."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I think Molly is smart because ___.", "I would do the same because ___.", "What would you do?"], tips: ["No cards: tell it naturally.", "Add your opinion and a question for the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u08-l3": {
      objectives: ["I can ask and answer 'What are you going to do?' quickly, without looking.", "I can join two ideas with because or so in a sentence."],
      trim: { "Guess my plan": 3, "Our big idea": 3, "How have you helped? (SB 80 Think)": 3, "Plan detectives": 6 },
      drop: ["Mime my plan"],
      add: [
        { after: "Future plans with going to", slide: level4Step },
        {
          after: STEP,
          slide: drill({
            title: "Grammar drill: plans, then fixed plans",
            goal: "Change the going to sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then, in round 3, say a fixed plan with -ing and a time from a timetable.",
            chunks: [
              "I'm going to visit my cousin next summer.",
              "Are you going to take the train? Yes, I am.",
              "We aren't going to fly because the tickets are expensive.",
              "She's going to stay with her aunt when she gets there.",
              "We're flying to Tokyo on Monday.",
              "The plane leaves at six, so we're leaving home at four.",
              "What time does the bus leave?",
            ],
            recycle: ["I think it will be sunny tomorrow.", "If we miss the bus, we will walk.", "The airport where we meet is very big."],
            prompts: ["My family is going to travel. (?)", "I am going to take a taxi. (X)", "We are going to take the bus. (+ because it is cheap)", "She is going to visit her aunt. (T: next summer)", "He is going to meet us. (P: they)"],
            real: "Real talk, Level 4 step: tell your partner about a plan you have really fixed (a trip, a visit, a party) with -ing and a time: 'We are visiting my aunt on Sunday.' Then say one time from a timetable you know: 'My bus leaves at ...'. Your partner asks one question.",
            slips: "'I going to visit' or 'She is going to visits' and, in round 3, 'We are fly' or 'The plane leave'",
            fix: "round 3 brings two new slips: 'We are fly to Tokyo' (after am / is / are the verb needs -ing) and 'The plane leave at six' (a timetable needs the -s). For 'We are fly' hold up a finger and say 'We are fly...ing?'; for 'The plane leave' tap your wrist for the missing -s. In rounds 1 and 2 the usual slips are a missing be verb ('I going to') and 'going to visits'.",
            support: ["Are you going to ___? Yes, I am.", "I'm going to ___ because ___."],
            stretch: "Use two signs at once, then use the Level 4 step: 'The plane leaves at six, so we're leaving home at four. Are you coming with us?'",
            stretchFrames: ["The ___ leaves at ___, so we're ___ing at ___.", "We're ___ing on ___."],
          }),
        },
        {
          after: "Guess my plan",
          slide: {
            kind: "fluency",
            title: "Plan chain: What are you going to do?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What are you going to do on Saturday?",
              "I'm going to visit my cousin.",
              "Are you going to travel by train? Yes, I am. / No, I'm not.",
              "Where is she going to stay?",
              "We aren't going to take a taxi; we're going to take the bus.",
            ],
            recycle: ["In one hour, it will be noon.", "Will it be night in Tokyo? No, it won't."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a plan card: a place and a way to travel." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your plan card so only you can see it.",
              "Ask the friend on your left: 'What are you going to do on Saturday?' Your friend answers with a whole sentence.",
              "Then your friend turns and asks the next question to the friend on their left.",
              "Listener's job: ask one yes / no question to the friend, such as 'Are you going to travel by train?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
            ],
            prompts: ["(card: Tokyo, plane)", "(card: grandma's house, bus)", "(card: the beach, car)", "(card: the airport, taxi)", "What are you going to ___?", "Where are you going to ___?"],
            feedback: goingTo,
            teacherNote:
              "A chain makes every child ask AND answer many times in a few minutes, which is what makes 'am / is / are + going to' automatic. Time the whole circle and tell the class, so they try to beat their own time. Listen especially for the missing 'am / are' ('I going to ...') and the short answer ('Yes, I am', not 'Yes, I going'). Prompt it with a finger and 'Yes, I a...?'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frame on the board.", frames: ["What are you going to ___?", "I'm going to ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a reason or a second plan: 'I'm going to take the bus because it's cheap. Then I'm going to visit my cousin.'" },
            ],
          },
        },
        {
          after: "My plans chart (SB 81 G)",
          slide: {
            kind: "writing",
            title: "My plans for Saturday: plan, write, check",
            routine: "paragraph",
            genre: "plan",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the plans and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences. Use your own plans for next Saturday.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use First, Then and At the end.",
              "Check: tick the checklist. Swap with a partner: they underline one going to phrase and one because or so, and tell you one plan they liked.",
              "Teacher: while they write, look only at am / is / are before going to and a plain verb after it. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: A busy Saturday",
              text: "Next Saturday is going to be a great day. First, my family is going to drive to Hai Phong, because I want to see my grandmother. Then my sister and I are going to play cards in the car, and my dad is going to listen to music. In the afternoon, we're going to cook dinner together. At the end of the day, I'm going to be tired, but I'm going to be very happy!",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which day? What do you think it is going to be like?" },
              { label: "First, ...", prompt: "What are you going to do first? Why? (because)" },
              { label: "Then, ...", prompt: "What are you going to do next? Who is going with you?" },
              { label: "Closing: At the end, ...", prompt: "How are you going to feel at the end of the day?" },
            ],
            frames: ["Next ___ is going to be ___.","First, I'm going to ___ because ___.","Then ___ is going to ___.","At the end of the day, I'm going to ___."],
            checklist: [
              "A topic sentence that names the day",
              "am / is / are before going to",
              "A plain verb after going to (drive, play, cook)",
              "First, and At the end of the day, with a comma after them"
            ],
            sayIt: "Read your paragraph to your partner. Then tell your plans again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph. It joins the sentence work from earlier (because and so) into a whole text. Mark only two targets (am / is / are before going to, and a plain verb after it) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Next ___ is going to be ___.","First, I'm going to ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a plan that changes: 'We aren't going to take the bus, so we're going to walk.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u08-l4": {
      objectives: ["I can tell my trip plan three times, faster each time.", "I can find and fix mistakes with capital letters and contractions."],
      trim: { "Announcements everywhere (SB 82 Think)": 3 },
      drop: ["Contraction chain"],
      add: [
        {
          after: "Contractions: I'm, she's, we'll",
          slide: drill({
            title: "Grammar drill: short forms in plans",
            goal: "Change the plan sentence fast and right with short forms (I'm, we're, she'll): ask it, say no, join it with a reason, change the time or the person. Then use the Level 4 step in real talk.",
            chunks: [
              "I'm going to visit my aunt, and she'll meet us at the airport.",
              "We're going to fly on Saturday, so we'll leave home early.",
              "She isn't going to take a taxi; she's going to take the bus.",
              "They aren't coming to the airport because they're busy.",
              "You're going to love it, and it'll be a great trip.",
              "We're flying to Singapore on Friday. The plane leaves at nine.",
              "What time does the plane leave? It leaves at nine o'clock.",
            ],
            recycle: ["I was reading when a beetle landed on my book.", "I have never been to Tokyo.", "The man who works at the airport is kind."],
            prompts: ["I am going to fly tomorrow. (say it with I'm)", "They are going to come. (X: they aren't)", "We will leave early. (+ because it's far; say we'll)", "She is going to travel. (P: we, with a short form)", "Are you going to take a taxi? (answer: Yes, I am. or No, I'm not.)"],
            real: "Real talk, Level 4 step: tell your partner two plans for next week with short forms. Make one a fixed plan with -ing and a time ('I'm visiting my cousin on Sunday') and one about a timetable ('My bus leaves at seven'). Your partner asks one question.",
            slips: "'Im going' (no apostrophe in writing), 'Your going to love it', 'She'll goes', 'The plane leave'",
            fix: "children say 'I going' for I'm, and 'she'll goes' with an extra -s. For 'I going' point to the board and say 'I'... going?'; say the short forms very clearly yourself (I'm, we're, she'll, it'll). In round 3 listen for 'We're fly' and 'The plane leave': the -ing after we're and the -s on leaves.",
            support: ["I'm going to ___. She'll ___.", "We're going to ___, so we'll ___."],
            stretch: "Use two signs at once, then use the Level 4 step with short forms: 'We're flying on Monday, and the plane leaves at six, so we'll be at the airport at four.'",
            stretchFrames: ["We're ___ing on ___, and the ___ leaves at ___.", "We'll ___ at ___."],
          }),
        },
        {
          after: "Say your trip first",
          slide: {
            kind: "fluency",
            title: "Trip talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same trip talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "Next summer I'm going to visit Tokyo.",
              "I'll travel by plane, and it'll take about five hours.",
              "I'm going to see a museum when I get there.",
              "When it's noon here, it's two o'clock there.",
              "You're going to love it!",
            ],
            recycle: ["It won't be dark at noon.", "Will it be afternoon in Tokyo?"],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A gives the whole trip talk, then Partner B gives theirs. The listener counts the plans on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: new partner. Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: new partner. Partner A, then Partner B: fast and smooth! The listener asks one follow-up question." },
            ],
            steps: [
              "Choose a real or an imaginary city. Plan four sentences: where, how, how long, what to do.",
              "Stand in two lines facing each other. In each round, line A talks first, then line B talks.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names), fix them together, then go on.",
              "When both partners have talked, line B moves one step to the left: a new partner each round. Next lesson, line B talks first.",
            ],
            feedback: goingTo,
            teacherNote:
              "This is the 4/3/2 activity (Nation) in a short form: the same talk, less time, new listener. The new partner keeps the repetition meaningful. Fluency improves without new language, but accuracy improves only with the one-minute fix between rounds, so keep it. Listen for the contractions I'm / it'll / you're: say them clearly so children can copy them.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["Next summer I'm going to ___.", "I'll go by ___.", "It'll take ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a problem and a solution: 'It's night there, so I'll send a message.'" },
            ],
          },
        },
        {
          after: "Capital letters for places",
          slide: {
            kind: "writing",
            title: "Fix the postcard",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find the mistake: a capital letter, a contraction or a plain verb.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "i live in hanoi, vietnam.", answer: "I live in Hanoi, Vietnam." },
              { q: "Im going to fly to tokyo on friday.", answer: "I'm going to fly to Tokyo on Friday." },
              { q: "Your going to love the airport in singapore.", answer: "You're going to love the airport in Singapore." },
              { q: "Shell meet us at the airport.", answer: "She'll meet us at the airport." },
              { q: "They going to take the train.", answer: "They are going to take the train." },
            ],
            checklist: ["Capital letters for cities, countries, days and I", "The apostrophe in I'm, you're and she'll", "am / is / are before going to"],
            sayIt: "Read your fixed postcard sentences to the class in a happy travel voice.",
            teacherNote:
              "Written correction works best on two or three error types at a time, so this page asks for only three: capital letters, apostrophes and the be verb. Fix item 1 together first and say why. The your / you're and their / they're mix-up is common and good to point out aloud.",
            tiers: [
              { level: "Support", task: "Fix items 1, 2 and 4 with the checklist." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "How do I get there?",
        prompt: "Pick a place in your town: a park, a shop or a school. Tell a friend how to get there, where it is, and what you are going to do there. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Choose your place. Draw a very small map with two or three things on the way.",
          "Say your directions three times: each time a little faster, like in class.",
          "Record it once. Point to your map as you talk.",
          "Say one fixed plan with -ing and one timetable time with the present simple: 'We are visiting my aunt on Sunday. The bus leaves at eight.'",
          "Look at the camera and keep going, without long stops.",
        ],
        maxSeconds: 180,
        kidSummary: "Say where the place is, how to get there and what you're going to do there, without long stops.",
        words: ["next to", "across from", "near", "far", "airport", "bus", "train"],
        grammar: ["Excuse me, where's the ___?", "It's next to / across from the ___.", "I'm going to ___ when I get there.", "We're ___ing on ___. The ___ leaves at ___."],
        rubric: [
          { label: "Clear directions", description: "Says where the place is using next to, across from, near or far.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Going to and contractions", description: "Uses I'm going to and contractions such as it's, you're and I'll correctly.", weight: 2 },
          { label: "Clear endings", description: "The ending sounds (-s, -ed) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["The ___ is next to the ___.", "It's near / far.", "I'm going to ___."], tips: ["Point to your map.", "Say each place name slowly."] },
          { level: "Core", who: "Most children", frames: ["Excuse me, where's the ___? It's across from the ___.", "You'll go by ___ and it'll take ___.", "I'm going to ___ when I get there."], tips: ["Use two directions words.", "Say how long it takes."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["First go ___, then ___.", "I'm going to ___ because ___.", "Are you going to come with me?"], tips: ["No map: talk naturally.", "End with a question for the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u08-l5": {
      objectives: ["I can sell a trip in a short ad and say it again with a new partner.", "I can write a short travel ad with a plan, a check and a say-it step."],
      trim: { "Ad showtime": 9 },
      drop: ["Sixty-second recall", "Test our big ideas"],
      add: [
        {
          after: "Ad showtime",
          slide: drill({
            title: "Grammar drill: ad plans and timetables",
            goal: "Change the plan sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then sell your trip with fixed plans and a timetable.",
            chunks: [
              "Come with us! We're flying to Tokyo on Monday.",
              "The plane leaves at six, and it arrives at noon.",
              "We're going to see a big museum, so bring your camera.",
              "When it's noon here, it's two o'clock there.",
              "Are you coming with us? What time does the bus leave?",
              "We aren't staying in a hotel; we're staying with my aunt.",
              "My cousin is meeting us at the airport at one o'clock.",
            ],
            recycle: ["I enjoy travelling, and I want to learn some Japanese.", "If you come with us, you will love it.", "I think it will be a great trip."],
            prompts: ["We are going to fly on Monday. (?)", "We are going to take a taxi. (X)", "We are going to see a museum. (+ because it's famous)", "My aunt is going to meet us. (T: at one o'clock, a fixed plan with -ing)", "He is going to come. (P: they)"],
            real: "Real talk, Level 4 step: sell your trip to your partner! Say two fixed plans with -ing and a time, and one time from the timetable. Your partner says yes or no and gives a reason.",
            slips: "'We are fly on Monday', 'The plane leave at six' or 'What time does the plane leaves?'",
            fix: "the new slips are 'We are fly' (needs -ing after am / is / are), 'The plane leave' (a timetable needs the -s) and 'does the plane leaves' (after does the verb stays plain). For the last one hold up a finger on does and say 'Does ... leave?'. Say 'leaves' with a clear -s yourself.",
            support: ["We're ___ing to ___ on ___.", "The ___ leaves at ___."],
            stretch: "Use two signs at once, then add a fixed plan, a timetable and a reason in one go: 'The plane leaves at six, so we're leaving home at four because the airport is far.'",
            stretchFrames: ["The ___ leaves at ___, so we're ___ing at ___.", "We're ___ing on ___ because ___."],
          }),
        },
        {
          after: "Ad showtime",
          slide: {
            kind: "fluency",
            title: "Ad showtime: say it again, better",
            routine: "task repeat",
            mode: "groups",
            minutes: 7,
            goal: "Give your travel ad again with a new group. Say it more smoothly and with more feeling.",
            chunks: [
              "Come with us to Tokyo!",
              "We're going to fly there in five hours.",
              "It's two o'clock there when it's noon here.",
              "You'll see big buildings and eat great food.",
              "Would you like to join us?",
            ],
            recycle: ["It's noon here, so it's two o'clock there.", "She is going to take the bus."],
            rounds: [
              { seconds: 75, say: "Plan one minute. Round 1: Group A gives the ad, then Group B gives theirs. Then change groups." },
              { seconds: 60, say: "Round 2: new group. Same ad, say it again, smoother and with more voice and without looking at your notes. Group A gives the ad, then Group B. Then change groups." },
            ],
            steps: [
              "Use your ad from the project. Choose the best four sentences.",
              "Give your ad to a new group, then listen to theirs. The listeners each have a job: one counts the 'going to' sentences, one tells you one good thing.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then go on.",
              "In round 2, say your ad again to the next group, then listen to theirs. Try to look up, not down.",
            ],
            feedback: goingTo,
            teacherNote:
              "Task repetition (Bygate): the second telling of the same task is freer and more accurate because the child already has the language. Give the planning minute before round 1 only. The listener jobs keep the audience active, which matters in a talk to a group. Listen for 'We are going to fly' and for 'when it's noon here, it's two o'clock there' (the present, not will).",
            tiers: [
              { level: "Support", task: "Give your ad with the frames on the card.", frames: ["Come with us to ___!", "We're going to ___.", "Would you like to join us?"] },
              { level: "Core", task: "Give your ad with only a few key words." },
              { level: "Stretch", task: "Give your ad, then answer one question from the group about the trip." },
            ],
          },
        },
        {
          after: "Make the travel ad (SB 85 Project)",
          slide: {
            kind: "writing",
            title: "Write my ad: model, then plan, write, check",
            routine: "paragraph",
            genre: "advertisement",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the invitation at the start, the plans and the closing question.",
              "Plan: fill the four boxes with a few words each, not whole sentences: the place, how you go, the time there and what you'll do.",
              "Write: turn your notes into one ad paragraph with the frames. Make the reader want to come!",
              "Check: tick the checklist. Swap with a partner: they underline one going to phrase and tell you one thing that made them want to come.",
              "Teacher: while they write, look only at am / is / are before going to and capital letters for places. Put a dot in the margin of a line with a mistake; the child finds it and fixes it."
            ],
            text: {
              title: "Model paragraph: Come to Tokyo!",
              text: "Come with us to Tokyo! We are going to fly there next summer, and the flight is going to take about five hours. When it is noon in Hanoi, it is two o'clock in Tokyo. We are going to visit a big museum and eat noodles. You are going to love the food and the tall buildings! Would you like to join us?",
            },
            organiser: [
              { label: "Invitation", prompt: "Which place? Who do you want to come?" },
              { label: "How and when", prompt: "How are you going to travel? When? How long is it going to take?" },
              { label: "Time there", prompt: "When it is ___ here, what time is it there?" },
              { label: "Plans and question", prompt: "What are you going to do? End with a question to the reader." },
            ],
            frames: ["Come with us to ___!","We are going to ___ next ___.","When it is ___ here, it is ___ there.","Would you like to join us?"],
            checklist: [
              "Capital letters for places and days",
              "am / is / are before going to",
              "A question mark and an exclamation mark in the right places",
              "The time difference is possible for the place"
            ],
            sayIt: "Read your ad to your partner, then say it without looking at the page.",
            teacherNote: "Plan, write, check (strategy instruction) is one of the best-evidenced ways to improve young writers: the organiser is the plan, the checklist is the check. The model is original and not from the book. The paragraph is the script for the ad showtime later in the lesson. Children may use a different place; check that the time difference is possible for it. Mark only two targets (am / is / are before going to, and capital letters for places) with a dot in the margin.",
            tiers: [
              { level: "Support", task: "Fill the organiser, then write the first and last sentence with the frames.", frames: ["Come with us to ___!","Would you like to join us?"] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a problem and a solution, and one 'because' sentence." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u08-l6": {
      objectives: ["I can say am, is and are with going to fast and right.", "I can join plans with because and so and say them out loud."],
      trim: { "Gates game: am, is or are?": 3, "Remember it!": 3 },
      add: [
        {
          after: "Grammar: plans with going to",
          slide: drill({
            title: "Grammar drill: going to and fixed plans together",
            goal: "Change the sentence fast and right with both ways to talk about the future: going to for plans, -ing for fixed plans and the simple present for timetables. Then talk about your own next holiday.",
            chunks: [
              "I am going to wake up at six tomorrow.",
              "Is she going to take the train? Yes, she is.",
              "They aren't going to stay at home because it's a holiday.",
              "We're flying to Seoul on Friday; we have the tickets.",
              "The plane leaves at eight, so we're leaving home at six.",
              "What time does the train leave? Are you leaving early?",
              "I'm going to take a jacket because it will be cold there.",
            ],
            recycle: ["Look at the clouds! It is going to rain.", "While we were waiting, the plane landed.", "If it rains, we will stay in."],
            prompts: ["She is going to take the train. (?)", "We are flying on Friday. (X)", "They are going to stay at home. (+ because it's a holiday)", "We are going to fly. (T: on Friday, a fixed plan with -ing)", "The plane leaves at eight. (?: What time ...?)"],
            real: "Real talk: tell your partner about your next holiday. Say what you are going to do, one fixed plan with -ing and a time, one time from a timetable, and why. Your partner asks one question.",
            slips: "'I going to wake up', 'She is going to takes', 'We are fly on Friday' or 'The plane leave'",
            fix: "going to keeps the plain verb ('We are going to fly'), the fixed plan needs -ing ('We are flying'), and a timetable needs the -s ('The plane leaves'). Children mix these up, so write the three shapes on the board in three colours and point to the one they need: be + going to + plain verb, be + verb-ing, it + verb-s. For 'The plane leave' tap your wrist for the missing -s.",
            support: ["I'm going to ___ because ___.", "We're ___ing on ___."],
            stretch: "Use two signs at once, then use all three: 'We're flying on Friday, the plane leaves at eight, and I'm going to take a jacket because it will be cold.'",
            stretchFrames: ["We're ___ing on ___, the ___ leaves at ___.", "I'm going to ___ because ___."],
          }),
        },
        {
          after: "Gates game: am, is or are?",
          slide: {
            kind: "fluency",
            title: "Champion sprint: going to",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every going to sentence fast and right: with I, he, she, we and they.",
            chunks: [
              "I am going to wake up at six tomorrow.",
              "She is going to take the train.",
              "They are going to stay at home.",
              "We aren't going to fly; we're going to drive.",
              "Are you going to leave at seven? Yes, I am.",
            ],
            recycle: ["In two hours, it will be six o'clock.", "I'm going to take a taxi because I'm late."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a picture and a name; the class says the whole sentence." },
              { seconds: 75, say: "Pairs: one shows the card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! One sentence for each card. How many can you say?" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: after round 1, stop for one minute. Write two mistakes you heard on the board (no names), fix them together, then do round 2.",
            ],
            prompts: ["(card: I, six o'clock)", "(card: she, train)", "(card: they, home)", "(card: we, drive)", "(card: you?, seven)"],
            feedback: goingTo,
            teacherNote:
              "This is a high-energy recall of the unit's one grammar rule in many persons: am / is / are + going to + plain verb. Mixing the old will phrases in every few turns spaces the retrieval, so last unit's grammar does not fade. Listen for the missing be verb and the extra -s on the verb after going to.",
            tiers: [
              { level: "Support", task: "Say the sentence with the frame on the board.", frames: ["I am going to ___.", "She is going to ___."] },
              { level: "Core", task: "Say the whole sentence without looking at the board." },
              { level: "Stretch", task: "Add 'because' and a reason to every sentence." },
            ],
          },
        },
        {
          after: "Write it: my trip plan",
          slide: {
            kind: "writing",
            title: "Join my trip plan",
            routine: "sentence combining",
            mode: "solo",
            minutes: 6,
            steps: [
              "Look at your trip plan. Find two short sentences that can be joined.",
              "Join them with because, so or and. Say it first, then write it.",
              "Check with the checklist and say your best sentence to your partner.",
            ],
            items: [
              { q: "I'm going to take a jacket. It will be cold. (because)", answer: "I'm going to take a jacket because it will be cold." },
              { q: "We're going to take the bus. It's cheap. (because)", answer: "We're going to take the bus because it's cheap." },
              { q: "He's going to go to the airport. He's going to meet his aunt. (and)", answer: "He's going to go to the airport and he's going to meet his aunt." },
              { q: "It's night there. I'll send a message. (so)", answer: "It's night there, so I'll send a message." },
            ],
            frames: ["I'm going to ___ because ___.", "___, so I'm going to ___."],
            checklist: ["A comma before so", "am / is / are before going to", "A plain verb after going to (take, not takes)"],
            sayIt: "Read your best joined sentence to your partner, then say it without looking.",
            teacherNote:
              "Item 3 joins two going to clauses with and: both are correct as written, and it shows that the be verb repeats. Children may combine in other correct ways: accept any joined sentence that is correct and clear. Model item 1 aloud before they start.",
            tiers: [
              { level: "Support", task: "Join items 1 and 2 with the teacher, using because." },
              { level: "Core", task: "Join all four pairs." },
              { level: "Stretch", task: "Join three sentences from your trip plan into one paragraph of five sentences." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My plan for next weekend",
        prompt: "Tell us your plan for next weekend. Say where you are going to go, who is going to come, how you are going to get there and why. Say it three times, then record it once.",
        length: "60-90 seconds",
        steps: [
          "Plan four sentences on paper: where, who, how and why.",
          "Say your plan three times: each time a little faster and smoother, like in class.",
          "Record it once. Look at the camera, not at the paper.",
          "Say one fixed plan with -ing and a time, and one time from a timetable: 'We are flying on Friday. The plane leaves at eight.'",
          "Keep going, even if you make a small mistake. Do not stop to start again.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell your weekend plan with going to, say why with because or so, and keep talking without long stops.",
        words: ["airport", "passenger", "passport", "destination", "doctor", "medicine"],
        grammar: ["am / is / are + going to + plain verb", "because / so", "First, next, then", "We are flying on ___. The plane leaves at ___."],
        rubric: [
          { label: "Going to plan", description: "Says at least three plans with am / is / are + going to + a plain verb.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences and not single words.", weight: 3 },
          { label: "Reasons", description: "Gives a reason with because or joins ideas with so.", weight: 2 },
          { label: "Clear sounds", description: "The ending sounds and the contractions (I'm, we're, she's) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["On Saturday, I'm going to ___.", "I'm going to go by ___.", "I'm going to ___."], tips: ["Look at your paper if you need to.", "Say each sentence slowly and clearly."] },
          { level: "Core", who: "Most children", frames: ["First I'm going to ___, next I'm going to ___, then I'm going to ___.", "I'm going to ___ because ___.", "We're going to go by ___, so ___."], tips: ["Use because at least once.", "Look at the camera."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["If it rains, I'll ___ instead.", "My family isn't going to ___ because ___.", "What are you going to do?"], tips: ["No paper: talk naturally.", "Add a second plan and a question for the viewer."] },
        ],
      },
    },
  },
};
