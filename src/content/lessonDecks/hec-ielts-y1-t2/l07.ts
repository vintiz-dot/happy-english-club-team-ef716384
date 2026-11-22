// Sun Class, Year 1 Term 2, Lesson 7 (programme lesson 19): Mini-mock: people and places.
// The term's mini-mock: Speaking Parts 1 and 2 plus one Part 3 question in trios
// (speaker, examiner, scorer), with the teacher fully scoring two or three students
// who were not teacher-scored in Term 1; and Listening Parts 1 and 2 under test
// conditions (hec-ielts-y1-t2-mini-mock). The usual blocks stay, shorter: recycled
// language for people and places, a peer check on final consonants and -ed, a short
// matching practice, a lighter PREP round and a reflection against the Term 1 full mock.
// All scripts, questions and model answers are HEC's own.
import type { Deck } from "@/lib/lessonDecks/types";

const HELPS = ["cooking lessons", "the bike hire", "first aid", "the boat trip", "evening music", "fishing", "the weaving workshop"];

export const l07: Deck = {
  id: "hec-ielts-y1-t2-l7",
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 2,
  lesson: 7,
  title: "Mini-mock: people and places",
  minutes: 120,
  inquiryPhases: ["Focus", "Transfer", "Reflect"],
  book: [],
  slides: [
    {
      kind: "title",
      title: "Sun Class: Speaking, Listening, Debate",
      subtitle: "Lesson 19 · Mini-mock: how far have we come since the Term 1 full mock?",
      bigQuestion: "How do you bring a person or a place to life for someone who has never seen them?",
    },
    {
      kind: "objectives",
      items: [
        "Recycle the language of people and places: precise adjectives and relative clauses with who, which, where and whose.",
        "Check a partner's final consonants and -ed endings, and fix your own.",
        "Take a mini-mock: Speaking Parts 1 and 2 and one Part 3 question in trios, scored on the HEC rubric.",
        "Take Listening Parts 1 and 2 under test conditions and compare with your Term 1 full mock score.",
        "Give a short PREP speech on online learning and rebut one point in one sentence.",
      ],
    },
    {
      kind: "activity",
      title: "Warm-up: 3/2/1 'Someone who knows a place well'",
      tag: "Warm-up",
      mode: "pairs",
      minutes: 10,
      steps: [
        "Two lines facing a partner. Topic: 'A person I know and a place they know well (a grandparent's village, a cousin's city, a coach's training ground)'. Choose now: you can use them again in the mock.",
        "Speaker A talks for 3 minutes; B listens without asking anything. Swap.",
        "Move one seat. Same person and place, new partner, 2 minutes. Swap.",
        "Move again. Same talk in 1 minute: only the best details survive. Swap.",
        "Whole class: what did you keep in the 1-minute version? That is the core of your Part 2 plan.",
      ],
      frames: ["The person I'm thinking of is my ..., who ...", "He / She knows ... really well, because ...", "It's a place where ...", "The first time I went there with them, ..."],
      fluencyTip: "This warm-up is also mock preparation: by the third telling the words are ready, so in the mock you can think about the story instead.",
      tiers: [
        { level: "Support", task: "Write three keywords (who, where, one thing you did) and look at them only in the 3-minute round.", frames: ["This is my ...", "He / She lives in ...", "We went to ..."] },
        { level: "Core", task: "No notes. Use one relative clause for the person and one for the place, and tell one past event." },
        { level: "Stretch", task: "No notes. In the 1-minute round, make both the person and the place vivid with one precise adjective each and one sensory detail.", frames: ["She's the kind of person whose ...", "It's the sort of place where ..."] },
      ],
      teacherNote: "Keep the rounds tight: the mock needs the time. Note one good description you hear (no names) to praise after the mock.",
    },
    {
      kind: "activity",
      title: "Homework check: memories in the log, before the mock",
      tag: "Review",
      mode: "whole",
      minutes: 5,
      steps: [
        "Before the mock: two students from the record sheet each talk for 60 seconds about one episode in their log and the memory it brought back.",
        "The teacher plays one timestamp from that log, stops it, and asks: 'What came next?'",
        "2-minute spoken phrase quiz: memory phrases (bring back memories, look back on, used to ...) from the backs of the cards with a gap; the class answers aloud.",
        "One voice note is played; the class points out one place where the speaker paused at a thought group.",
      ],
      tiers: [
        { level: "Support", task: "Read the timestamp and words from your log, then one 'used to' sentence about the episode." },
        { level: "Core", task: "From memory: what came after the timestamp, and one memory of your own it reminded you of." },
        { level: "Stretch", task: "No log: argue with your speaker's claim about childhood and answer one question from the class." },
      ],
      teacherNote: "Keep this to 5 minutes; the mock needs the time. Tick today's two students on the record sheet and pick unticked names next week, so each student is checked twice this term.",
    },
    {
      kind: "vocab",
      title: "Recycled words for people and places",
      words: [
        { word: "picturesque", meaning: "very pretty, like a painting", example: "The village was picturesque: wooden houses, rice terraces and a small stream." },
        { word: "off the beaten track", meaning: "far from the places most tourists visit", example: "My uncle took us to a beach off the beaten track, where there were no hotels at all." },
        { word: "packed with", meaning: "very full of people or things", example: "The old quarter was packed with visitors on the last night of the holiday." },
        { word: "determined", meaning: "not giving up, even when it is hard", example: "{s1} is so determined that she practised the same song every day for a month." },
        { word: "generous", meaning: "happy to give time, help or things to others", example: "Our host was incredibly generous: she cooked for twelve people and wouldn't take any money." },
        { word: "show someone around", meaning: "take someone to see the interesting parts of a place", example: "My cousin showed me around Hue and knew a story about every street." },
      ],
    },
    {
      kind: "grammar",
      title: "Who, which, where, whose: one sentence, more detail",
      hook: "A relative clause lets you add a detail without starting a new sentence: that is what makes a description sound fluent instead of a list.",
      form: [
        { label: "People", pattern: "a person who + verb: my aunt, who runs a café, ... / a man who taught me ..." },
        { label: "Things and places as things", pattern: "a ... which / that + verb: a market which opens at dawn / the bridge that crosses the river" },
        { label: "Places where things happen", pattern: "a place / town / room where + subject + verb: the beach where we learnt to swim" },
        { label: "Belonging", pattern: "a person whose + noun: a friend whose dad is a pilot / a village whose name I can't pronounce" },
      ],
      explanation: [
        "'Who' is for people and 'which' or 'that' for things. 'Where' replaces a whole phrase of place: 'the beach where we swam' means 'the beach; we swam at it'.",
        "Use 'where' only when a full subject and verb follow it: 'the café where we met'. If the place itself does something, use 'which': 'a café which is always quiet'.",
        "'Whose' is the relative word for his, her, its or their: 'a friend whose mother is a doctor'.",
        "Commas around the clause mean extra information ('My grandad, who is 80, still swims'); no commas means it tells you WHICH one ('the cousin who lives in Hue', not the other one). In speech, the commas are short pauses.",
      ],
      examples: [
        { text: "My uncle, who used to be a tour guide, showed me around Da Lat for a whole weekend.", note: "extra information about a person, with pauses" },
        { text: "We stayed in a village where nobody had a car, so we walked everywhere.", note: "where + subject + verb" },
        { text: "{s2} has a cousin whose house is right next to the sea.", note: "whose + noun" },
        { text: "The market which surprised me most was a floating one, on the Mekong.", note: "which: the place is the subject of 'surprised'" },
      ],
      pitfalls: [
        { wrong: "It's a café where is very quiet.", right: "It's a café which is very quiet. / It's a café where it's always quiet.", why: "After 'where' you need a subject and a verb; if the café is the subject, use 'which'." },
        { wrong: "I have a friend who his dad is a pilot.", right: "I have a friend whose dad is a pilot.", why: "'Whose' already means 'his': don't add another possessive." },
        { wrong: "The town which I grew up is small.", right: "The town where I grew up is small. / The town which I grew up in is small.", why: "With 'which', keep the preposition at the end; or use 'where' and drop it." },
      ],
    },
    {
      kind: "activity",
      title: "Review: one sentence, three details",
      tag: "Review",
      mode: "pairs",
      minutes: 8,
      steps: [
        "Pairs. The teacher shows a short, plain sentence: 'I visited a town.' 'I met a woman.' 'We ate at a restaurant.'",
        "A adds ONE detail with a relative clause; B adds a second; A adds a third, without the sentence breaking: 'I visited a town where my mum grew up, which is famous for its pottery, and whose market opens at four in the morning.'",
        "Say the final sentence aloud with short pauses at the commas. Then swap who starts.",
        "Last round: build one sentence about the person and place from your warm-up. Keep it: it can be the first line of your Part 2.",
      ],
      frames: ["..., who ...", "..., which ...", "... where ...", "... whose ..."],
      tiers: [
        { level: "Support", task: "Add one clause at a time with the frames on the board, and say only two-detail sentences.", frames: ["I met a woman who ...", "We went to a place where ..."] },
        { level: "Core", task: "Build three-detail sentences using at least three different relative words, and say them with pauses at the commas." },
        { level: "Stretch", task: "Use one recycled word from the vocab slide in every sentence, and make one sentence where the clause changes the meaning (the cousin who lives in Hue, not the other one)." },
      ],
      teacherNote: "Listen for 'where is' and 'who his'; prompt with 'Subject and verb after where?'. Keep it brisk: this is retrieval before the mock.",
    },
    {
      kind: "activity",
      title: "Pronunciation: peer check on final consonants and -ed",
      tag: "Pronunciation",
      mode: "pairs",
      minutes: 6,
      steps: [
        "Recall from Term 1: end sounds carry meaning. 'I walk there' is now; 'I walked there' is the past, and the only difference is a quiet /t/.",
        "-ed has three sounds: /t/ after p, k, s, sh, ch (walked, stopped); /d/ after most voiced sounds (stayed, showed); /ɪd/ only after t and d (visited, decided).",
        "In pairs: A reads the prompts; B holds up one finger for /t/, two for /d/, three for /ɪd/, and taps the table if A drops a final consonant. Swap.",
        "Choose your scorer job for the mock: listen for these endings under Pronunciation.",
      ],
      prompts: ["We stayed in a picturesque village.", "She showed me around the old market.", "We visited a temple and walked back.", "He looked after us and cooked every night.", "I decided to go back the next summer.", "It was packed with people."],
      tiers: [
        { level: "Support", task: "Read the first three prompts slowly, making each final sound clearly, then once at normal speed with your partner checking." },
        { level: "Core", task: "Say three past sentences about your mock person and place; your partner checks every -ed and every final consonant." },
        { level: "Stretch", task: "Read the last three prompts at speed, keeping the endings while linking them to the next vowel (looked_after, packed_with), and explain why the ending is still heard when it links." },
      ],
      teacherNote: "Short on purpose. Scorers in the mock will listen for exactly these endings, so the peer check doubles as their briefing.",
    },
    {
      kind: "speaking",
      title: "Mini-mock speaking: Parts 1, 2 and a Part 3 question in trios",
      mode: "groups",
      minutes: 25,
      steps: [
        "Trios: Speaker, Examiner, Scorer. The Examiner reads the questions word for word and keeps time; the Scorer has the HEC rubric card and does not speak.",
        "Part 1 (about 3 minutes): the four questions in order. Part 2: the Examiner hands over the cue card, gives exactly 1 minute to prepare, says 'Please start' and stops the speaker at 2 minutes. Part 3: the Examiner asks the one Part 3 question; the speaker answers for about a minute.",
        "The Scorer gives one band for each criterion and writes one thing to keep and one to fix, with words they actually heard. Feedback is a prompt, not a correction: 'Can you add a turning point?'",
        "Rotate roles twice so everyone is the speaker once (about 7 minutes a turn).",
        "Repeat and rescore: each speaker gives the Part 2 talk once more, fixing their ONE thing. The same Scorer scores again. Did a criterion move?",
        "The teacher sits with a different trio each turn and fully scores 2-3 students who were NOT teacher-scored in the Term 1 mocks (Lessons 6 and 12); the rest are peer-scored today and teacher-scored from their vlog this week.",
      ],
      frames: ["The person I'd like to talk about is ..., who ...", "It was the first time I'd been to ...", "They took me to a place where ...", "What I remember most is ...", "I felt ..., because ..."],
      prompts: [
        "Part 1: Who do you usually spend your weekends with?",
        "Part 1: Is there a place in your area where young people like to meet?",
        "Part 1: Do you enjoy visiting places you have never been to before? Why or why not?",
        "Part 1: Do you prefer travelling with your family or with friends?",
        "Part 3: Why do some people enjoy showing visitors around their hometown?",
      ],
      ielts: {
        part: 2,
        cueCard: { topic: "Describe a person who showed you around a place you had never visited before.", points: ["who the person was", "where the place was", "what they showed you", "and explain how you felt about the visit."] },
        prepSeconds: 60,
        speakSeconds: 120,
        peerScore: true,
      },
      tiers: [
        { level: "Support", task: "Use the person and place from the warm-up. In the minute of preparation write one keyword per bullet; if you stop, read the next bullet and carry on. In Part 3, give one reason and one example.", frames: ["The person was my ...", "The place was ...", "He / She showed me ...", "I felt ... because ..."] },
        { level: "Core", task: "Test conditions: the full 2 minutes with a setting, a turning point and a feeling, two relative clauses and two recycled words. In Part 3, answer, give a reason, then an example." },
        { level: "Stretch", task: "Two minutes without repeating an adjective; describe the person through what they did, not only what they were. In Part 3, give two reasons and say which one matters more.", frames: ["What struck me about him was the way he ...", "I'd say the main reason is ..., although ..."] },
      ],
      fluencyTip: "Short of ideas at 90 seconds? Go back to the place and add one sense: what did it sound or smell like?",
      teacherNote: "Mock rules: no teaching during the turns. Check last term's mock record before class and list the 2-3 students to score today. Note three anonymous lines (one good, two to fix) for a delayed-feedback board after the second telling. Collect every rubric card.",
    },
    {
      kind: "listening",
      title: "Listening Part 2 reminder: matching people to jobs",
      section: 2,
      mode: "solo",
      minutes: 10,
      context: "A short practice before the mock. You will hear a tour leader introducing the people who will help a school group at a village homestay. Match each person with what they will help with. There are two options you do not need. Look at questions 1-5 for 30 seconds.",
      strategy: {
        name: "Mini-mock warm-up: code the options, follow the questions",
        steps: [
          "Give each option a short code (CK for cooking, BK for bikes) so you can write fast.",
          "The people are heard in the order of the questions; the options are not in order.",
          "Expect a wrong job to be mentioned for most people ('Many people think he ..., but ...'). Write only after you hear what they WILL do.",
          "If you miss one, leave it and follow the next name. Guess at the end: never leave a blank.",
        ],
      },
      script: [
        { speaker: "Tour leader", text: "OK, everyone, before we unpack, let me introduce the people who'll be helping us this weekend." },
        { speaker: "Tour leader", text: "First, Mr Thanh, who owns the homestay. A lot of guests think he does the cooking, but that's his wife. Mr Thanh looks after the bikes, so if a tyre goes flat, he's the one to find." },
        { speaker: "Tour leader", text: "His wife, Mrs Hien, is the cook, and on Saturday afternoon she'll teach anyone who wants to learn how to make her famous sticky rice." },
        { speaker: "Tour leader", text: "Next, Kim, who works as a nurse at the village clinic. She'll walk with us everywhere, so she's in charge of first aid." },
        { speaker: "Tour leader", text: "Kim also plays the flute beautifully, but she won't be doing the music this time. The evening music on Saturday is by a group from the next village." },
        { speaker: "Tour leader", text: "Then there's Mr Bao. He was a fisherman for thirty years, so you might expect him to take you fishing." },
        { speaker: "Tour leader", text: "But his knees aren't what they were, so these days he drives the boat instead. He'll be taking us on the boat trip on Sunday morning." },
        { speaker: "Tour leader", text: "And last, Ngoc, who's studying at the art college in town. She grew up here, and she'll run the weaving workshop, where you'll make a small bag to take home." },
        { speaker: "Tour leader", text: "There's no fishing on this trip, I'm afraid: the river's too high after the rain." },
        { speaker: "Tour leader", text: "Right, rooms are on the list by the door. Let's meet back here in twenty minutes." },
      ],
      questions: {
        type: "Matching",
        instructions: "What will each person help with? Choose the correct option. There are two options you do not need.",
        items: [
          { q: "1. Mr Thanh", options: HELPS, answer: "the bike hire" },
          { q: "2. Mrs Hien", options: HELPS, answer: "cooking lessons" },
          { q: "3. Kim", options: HELPS, answer: "first aid" },
          { q: "4. Mr Bao", options: HELPS, answer: "the boat trip" },
          { q: "5. Ngoc", options: HELPS, answer: "the weaving workshop" },
        ],
      },
      decoding: [
        { phrase: "he's the one to find", sounds: "'heez-thə-wun-tə-find': 'the' and 'to' both shrink to /ə/" },
        { phrase: "his knees aren't what they were", sounds: "'iz-neez-ahnt-wot-thay-wer': the h of 'his' drops after 'But'" },
        { phrase: "there's no fishing", sounds: "'thairz-noh-fishin': listen for 'no' at the start; it rules the option out" },
      ],
      tiers: [
        { level: "Support", task: "First listening a little slower. Before it starts, write a two-letter code next to each option with the teacher's help." },
        { level: "Core", task: "One listening at normal speed, as in the test. Check with a partner only after the mock, not now." },
        { level: "Stretch", task: "One listening. Then name the wrong job suggested for three of the people, and say which words ('but', 'instead', 'won't') told you it was wrong." },
      ],
    },
    {
      kind: "check",
      title: "Mini-mock listening: Parts 1 and 2",
      assessment: "hec-ielts-y1-t2-mini-mock",
      mode: "solo",
      minutes: 25,
      steps: [
        "Test conditions: no talking, phones away. You hear each recording ONCE.",
        "You have 30 seconds to read the questions before each part, and 30 seconds at the end of each part to check.",
        "Part 1: ONE WORD AND/OR A NUMBER for each answer; spelling counts. Part 2: choose the correct option; for 14-15 choose TWO; for 16-20 choose a position from the list.",
        "Mark with the answer key as a class. Write your score out of 20 next to your Term 1 full mock score (Listening Parts 1-2 only). The teacher converts both to an approximate band.",
      ],
    },
    {
      kind: "debate",
      title: "Quick PREP round: online or in the classroom?",
      mode: "groups",
      minutes: 15,
      stage: "2 PREP and simple rebuttal",
      motion: "Is online learning as good as learning in a classroom?",
      speeches: [
        { role: "Yes side, speaker 1", seconds: 45, job: "A short PREP speech: online learning is as good." },
        { role: "No side, speaker 1", seconds: 45, job: "A short PREP speech: the classroom is better." },
        { role: "Yes side, speaker 2", seconds: 45, job: "ONE sentence of rebuttal ('Even if that's true, ...'), then a short new point." },
        { role: "No side, speaker 2", seconds: 45, job: "ONE sentence of rebuttal, then a short new point." },
        { role: "Judge (the teacher)", seconds: 60, job: "Name the clearest example and the best rebuttal, with one reason each." },
      ],
      steps: [
        "Lighter today: the mock was the main event. Two teams of three, sides by lot. Use the PREP point you prepared for homework.",
        "Three minutes of team prep: agree two points and who says them; write one rebuttal sentence for the other side's most likely point.",
        "Run the speeches in order. Listeners note one thing the other side said.",
        "The teacher judges; then a quick vote on the class's real opinion.",
      ],
      frames: ["My point is that ...", "For example, when I had online classes, ...", "That's true, but ...", "Even if that's true, ...", "{s1} said ..., but they forgot that ..."],
      tiers: [
        { level: "Support", task: "Speak first on your team and read your homework PREP point, looking up at the end of each line.", frames: ["My point is that ...", "This is because ...", "For example, ...", "So ..."] },
        { level: "Core", task: "Keywords only. As speaker 2, repeat the other side's point in your own words before you rebut it." },
        { level: "Stretch", task: "Rebut by splitting the motion: say for WHICH kind of learning online is as good, and for which it is not, in one sentence, then defend your side.", frames: ["For ..., maybe; but for ..., ...", "It depends on what you are learning."] },
      ],
      judging: ["Did each speech have a point, a reason and a real example?", "Did the rebuttal answer what was actually said?", "Did speakers keep to 45 seconds?"],
    },
    {
      kind: "activity",
      title: "Reflection: Term 1 full mock and today",
      tag: "Cool-down",
      mode: "solo",
      minutes: 7,
      steps: [
        "The teacher hands back your Term 1 full mock card (Lesson 12) and today's rubric cards.",
        "Compare: your Listening Parts 1-2 score then and now, and your four speaking bands. Which part of the listening lost you most marks today: the form, the choose-TWO, or the plan?",
        "Write your target for the Term 2 full mock and ONE habit that will get you there.",
      ],
      frames: ["Since the Term 1 mock, I've got better at ...", "My lowest criterion today was ..., because ...", "Before the Term 2 full mock, I will ... every day."],
      tiers: [
        { level: "Support", task: "Finish the three sentences. Bạn có thể viết bằng tiếng Việt nếu cần." },
        { level: "Core", task: "Finish the three sentences and quote one line from your Scorer's card that you agree with, and one you don't." },
        { level: "Stretch", task: "Compare your Part 2 today with your Term 1 mock Part 2: name one thing that is now automatic and one that still costs effort, and plan two habits, one for listening and one for speaking." },
      ],
    },
    {
      kind: "reflect",
      prompts: [
        "How do you bring a person or a place to life for a listener? Give the best example you heard today.",
        "Which criterion moved between your first and second Part 2 talk, and what did you change?",
        "In the listening mock, where did you lose marks: spelling, a correction you missed, an option that was ruled out, or a direction word?",
      ],
    },
    {
      kind: "vlog",
      title: "Video homework: the mock Part 2 and Part 3, one week later",
      prompt: "Record the mock again on Wednesday, one take, no cuts, in the app. Open with the date and this week's code word (said in class today, written nowhere). Then: 'Describe a person who showed you around a place you had never visited before.' Take exactly 1 minute to prepare, talk for 2 minutes, then in the same take answer the Part 3 question 'Why do some people enjoy showing visitors around their hometown?' and the surprise question the teacher posts in the class Zalo group on Wednesday morning. Before you record, read your Scorer's card and fix the ONE thing it asked you to change. The teacher scores this recording on the full rubric.",
      length: "3 minutes (plus 1 minute of preparation, not recorded)",
      tiers: [
        { level: "Support", who: "If long answers feel hard", frames: ["The person was my ..., who ...", "We went to ...", "He / She showed me ...", "I think people enjoy it because ..."], tips: ["Keep your four keywords on paper next to the camera.", "If you stop, look at the next bullet and keep going."] },
        { level: "Core", who: "Most students", frames: ["It was the first time I'd been to ...", "They took me to a place where ...", "One reason is that ..., and another is ..."], tips: ["Speak for the full 2 minutes with a turning point.", "Listen back for every -ed ending."] },
        { level: "Stretch", who: "If you are already fluent", frames: ["What struck me about her was the way she ...", "I'd say it comes down to ...", "That said, not everyone ..."], tips: ["No repeated adjectives.", "In Part 3, give two reasons and say which matters more."] },
      ],
    },
    {
      kind: "homework",
      title: "This week, day by day (about 20 minutes a day)",
      // Anti-AI by design: what counts is said in the student's own voice, at a set
      // moment, and checked live on Sunday. A chatbot can write a log; it cannot
      // tell the teacher what the speaker said at a timestamp or answer a follow-up.
      items: [
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "8 minutes: one VOA Learning English (slow) story about travel or a place, transcript on the second listen. Log: date, title, ONE timestamp and the exact 5-8 words said there, one sentence about a person or place in it with who, which or where. Then a 20-second voice note, no script.", minutes: 40, tier: "Support", check: "Sunday: the teacher plays your story from the timestamp and asks who or what was being described; one voice note is opened at random." },
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "12 minutes: a BBC Learning English '6 Minute English' episode about travel, cities or people, once without the transcript, once with. Log: date, title, TWO timestamps with the exact words, three phrases. Then a 30-second voice note in one take, no script: describe the person or place with who, which or where.", minutes: 60, tier: "Core", check: "Sunday: the teacher plays one timestamp from your log and asks what came next; one voice note per student is played to the class." },
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "18 minutes: a travel or culture podcast or TED-Ed video at normal speed, no transcript first. Log: two timestamps with the exact words, the main point, and one moment you had to listen twice and why. Then a 45-second voice note arguing with one claim.", minutes: 90, tier: "Stretch", check: "Sunday: replay your listen-twice moment for the class and explain it, then argue for 60 seconds with the speaker's claim." },
        { label: "Shadowing", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "5 minutes: 30 seconds of that day's listening with past tenses in it. Underline every -ed ending, then speak WITH the speaker 3 times, keeping each ending. Saturday: record your best try as audio and keep it.", minutes: 25, check: "Your Saturday audio is played beside the original; the teacher listens for /t/, /d/ and /ɪd/ endings and writes one target on your card." },
        { label: "Recorded speaking (video homework)", days: ["Wed"], detail: "The mock Part 2 + Part 3 recording on the previous slide, fixing your Scorer's one point: one take, no cuts, in the app, date and code word first, the surprise question last.", minutes: 15, check: "The teacher scores it on the full rubric against your mock card; without the code word or the surprise question it does not count." },
        { label: "Vocabulary retrieval", days: ["Mon", "Tue", "Wed", "Thu", "Sat"], detail: "5 minutes: put today's 6 recycled words with last week's memory phrases (bring back memories, look back on) and the gift and feeling words from two weeks ago. Back of each card: a sentence about a real person or place YOU know. Say the phrase in a sentence before you turn over; missed cards come back tomorrow.", minutes: 25, check: "Sunday's Homework check: the teacher reads your back-of-card sentence with the phrase left out and you say it." },
        { label: "Debate prep", days: ["Wed", "Fri"], detail: "Next week: 'Should every street food stall have a licence?' Wednesday, 10 minutes: five keyword cards, no full sentences, 6 words at most: one PREP point for each side, a real example (a stall you know, a news story) and a 'That's true, but ...' reply. Friday, 10 minutes: speak each side for 45 seconds from the cards with a timer. AI rule: you may ask an AI for ONE argument for the side you disagree with; record the question on the back of a card and one reason the answer is weak. Nothing else from an AI.", minutes: 20, check: "In the debate you speak from the cards only and answer one follow-up; if you used the AI argument, explain to the class why it is weak." },
      ],
    },
  ],
};
