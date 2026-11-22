// Sun Class, Year 1 Term 3, Lesson 5 (programme lesson 30): Family and generations.
// Part 3 on changing family roles, answered with generalising language (tend to, on
// the whole, by and large, in many cases) so that one family's story becomes a claim
// about families. Listening Part 3: two students and their tutor planning an interview
// project, where one speaker suggests and the other rejects (the distractor). Schwa in
// unstressed syllables, and a 2v2 mini-debate with a student chair and two judges on
// big families. All scripts and questions are HEC's own.
import type { Deck } from "@/lib/lessonDecks/types";

const WHY_STOP = ["it took too long to write", "too few people answered it", "the tutor did not approve it"];
const FAMILIES = ["six", "nine", "ten"];
const FOCUS = ["who makes decisions about money", "who does the housework", "how grandparents spend their free time"];
const SURPRISE = ["men in his grandmother's village sometimes cooked", "his grandmother did all the childcare", "his parents shared the cleaning equally"];

export const l05: Deck = {
  id: "hec-ielts-y1-t3-l5",
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 3,
  lesson: 5,
  title: "Family and generations",
  minutes: 120,
  inquiryPhases: ["Engage", "Investigate", "Generalize", "Reflect"],
  book: [],
  slides: [
    {
      kind: "title",
      title: "Sun Class: Speaking, Listening, Debate",
      subtitle: "Lesson 30 · Family and generations",
      bigQuestion: "Are families today really so different from our grandparents' families?",
    },
    {
      kind: "objectives",
      items: [
        "Answer Part 3 questions on changing family roles, turning one family's story into a general claim.",
        "Generalise carefully: tend to, on the whole, by and large, in many cases, and how to admit exceptions.",
        "Use the schwa /ə/ in unstressed syllables (parent, family, about) so stressed words stand out.",
        "Listening Part 3: follow two students and a tutor, and catch what one suggests and the other rejects.",
        "Run a 2v2 mini-debate: opening speaker, second speaker with rebuttal and extension, 1-minute summaries, a chair and two judges.",
      ],
    },
    {
      kind: "activity",
      title: "Warm-up: 4/3/2 'Then and now in my family'",
      tag: "Warm-up",
      mode: "pairs",
      minutes: 10,
      steps: [
        "Two lines facing a partner. Topic: 'One thing my grandparents did differently from my parents when they were my age (a job, a chore, a free-time habit)'.",
        "Speaker A talks for 4 minutes; B listens and asks one question at the end. Swap.",
        "Move one seat. Same topic, new partner, 3 minutes. Swap.",
        "Move again. 2 minutes, and this time finish with ONE general sentence about families then and now. Swap.",
        "Whole class: collect the general sentences on the board; they are the raw material for Part 3.",
      ],
      frames: ["When my grandmother was my age, she had to ...", "These days, my parents ... instead.", "Compared with my grandparents, ...", "I think most families now ..."],
      fluencyTip: "By the 2-minute round, the story is ready; spend your thinking on the general sentence at the end.",
      tiers: [
        { level: "Support", task: "Write three keywords (who, then, now) and look at them only in the 4-minute round. Bạn có thể nghĩ trước bằng tiếng Việt, nhưng nói bằng tiếng Anh.", frames: ["My grandmother used to ...", "Now my mum ..."] },
        { level: "Core", task: "No notes. Use 'used to' for the past, the present simple for now, and 'whereas' once to join them." },
        { level: "Stretch", task: "No notes. In the 2-minute round give a cause for the change (money, cities, school) and say whether it is a change for the better.", frames: ["The main reason for this is probably ...", "On balance, I'd say it's a change for the better because ..."] },
      ],
      teacherNote: "Family is personal: let students choose a family they know (a friend's, a neighbour's) if they prefer. Recycle 'whereas' and 'compared with' from Lesson 26.",
    },
    {
      kind: "activity",
      title: "Homework check: music logs and degree words",
      tag: "Review",
      mode: "whole",
      minutes: 5,
      steps: [
        "Two students from the record sheet talk for 60 seconds each about one episode in their log. The teacher plays one of their timestamps, stops it, and asks: 'What did the speaker say next?'",
        "Two minutes of spoken retrieval on last week's phrases for music and the arts: the teacher reads a back-of-card sentence with the degree word left out ('The concert was ___ amazing') and the class says a word that fits (absolutely, not very).",
        "One voice note is played; its owner answers one follow-up question from the class.",
      ],
      tiers: [
        { level: "Support", task: "Read the timestamp line from your log, then add one sentence of your own about the episode." },
        { level: "Core", task: "Log face down. Say what followed your timestamp and use one degree word from last week (fairly, rather, absolutely) about it." },
        { level: "Stretch", task: "Log face down. Give the speaker's opinion and your own, and say how strongly you hold it with a precise degree word." },
      ],
      teacherNote: "Tick today's two on the record sheet; pick unticked names next week so everyone is checked twice this term. Talk privately to any student who cannot speak about their own log.",
    },
    {
      kind: "vocab",
      title: "Words for families and generations",
      words: [
        { word: "the older generation", meaning: "people who are now grandparents or older", example: "The older generation often finds it hard to understand why teenagers are always online." },
        { word: "extended family", meaning: "grandparents, aunts, uncles and cousins, not only parents and children", example: "In many Vietnamese homes, the extended family lives under one roof." },
        { word: "bring up (a child)", meaning: "look after and teach a child until they are an adult", example: "{s3} was brought up by her grandparents while her parents worked in the city." },
        { word: "share the chores", meaning: "divide the housework between people", example: "In my family, we share the chores: I wash up and my brother does the laundry." },
        { word: "generation gap", meaning: "the difference in ideas between young and old people", example: "The generation gap is clearest when we talk about jobs and marriage." },
        { word: "rely on (someone)", meaning: "need someone's help and trust them to give it", example: "Working parents often rely on grandparents to collect the children from school." },
      ],
    },
    {
      kind: "grammar",
      title: "Generalising: tend to, on the whole, by and large",
      hook: "'All families in Vietnam live with their grandparents' is easy to attack in a debate; 'Families in Vietnam tend to live close to their grandparents' is hard to argue with.",
      form: [
        { label: "Tendency (verb)", pattern: "subject + tend to / don't tend to + verb: Teenagers tend to spend more time with friends than with family." },
        { label: "Whole picture (adverbial)", pattern: "On the whole, / By and large, + clause: On the whole, fathers do more at home than they used to." },
        { label: "Part of the picture", pattern: "In many cases, / In most families, / For a lot of people, + clause" },
        { label: "Exception", pattern: "..., although there are exceptions. / That isn't true of every family, of course, but ..." },
      ],
      explanation: [
        "Part 3 asks about people in general, not about you. Generalising language lets you use your family as an example without pretending it is everyone's.",
        "'Tend to' is followed by the base verb and changes for he / she: 'Grandparents tend to ...', 'A grandmother tends to ...'. The negative is 'don't tend to'.",
        "'On the whole' and 'by and large' go at the start of the sentence, followed by a comma (a short pause when you speak). 'In many cases' is weaker: it admits that some cases are different.",
        "A strong Part 3 answer often generalises, gives an example, then admits an exception: claim, example, 'although ...'.",
      ],
      examples: [
        { text: "By and large, children in cities tend to see their grandparents less often than children in the countryside.", note: "two generalisers together" },
        { text: "In many cases, both parents work full-time, so grandparents bring up the youngest children.", note: "in many cases + a cause" },
        { text: "{s2} thinks that, on the whole, teenagers today have more freedom, although that isn't true of every family.", note: "claim + exception" },
        { text: "Older people don't tend to change their habits quickly.", note: "negative: don't tend to" },
      ],
      pitfalls: [
        { wrong: "Young people tend to using their phones at dinner.", right: "Young people tend to use their phones at dinner.", why: "'Tend to' is followed by the base verb, not -ing." },
        { wrong: "In the whole, families are smaller now.", right: "On the whole, families are smaller now.", why: "The phrase is 'on the whole'." },
        { wrong: "All families in Vietnam respect old people.", right: "On the whole, families in Vietnam show great respect to older people.", why: "In Part 3 and in debate, 'all' invites an easy counter-example; generalise instead." },
      ],
    },
    {
      kind: "activity",
      title: "Story to claim: from one family to many",
      tag: "Grammar",
      mode: "pairs",
      minutes: 8,
      steps: [
        "The teacher reads a single-family fact: 'My grandfather never cooked.' A turns it into a general claim with a generaliser; B adds an example and an exception.",
        "Example: 'Men of my grandfather's generation tended not to cook. My grandfather never did. Although some men did on special occasions.'",
        "Four facts, swapping who starts. Then each pair writes ONE claim from their warm-up on the board.",
        "The class votes: which claim is easiest to defend in a debate, and why?",
      ],
      prompts: ["My grandfather never cooked.", "My cousin moved to Ho Chi Minh City for work and lives alone.", "My grandmother looks after my little sister every afternoon.", "My parents ask my opinion before they buy something big."],
      frames: ["On the whole, ...", "People of my grandparents' generation tended to ...", "In many cases, ...", "That isn't true of every family, of course, but ..."],
      tiers: [
        { level: "Support", task: "Turn each fact into one claim with 'tend to' or 'on the whole'. Your partner gives the example.", frames: ["Grandparents tend to ...", "On the whole, ..."] },
        { level: "Core", task: "All three steps for each fact: claim, example, exception, with a different generaliser each time." },
        { level: "Stretch", task: "Add a cause to each claim ('..., mainly because ...') and say whether the trend will continue in twenty years.", frames: ["..., mainly because ...", "I suspect this will ... as ..."] },
      ],
      teacherNote: "Push back on any 'all' or 'never' about people in general: 'Every family?' is the prompt. This is the move the debate needs.",
    },
    {
      kind: "activity",
      title: "Pronunciation: the schwa in unstressed syllables",
      tag: "Pronunciation",
      mode: "whole",
      minutes: 8,
      steps: [
        "The most common sound in English is the schwa /ə/: short, relaxed, like a quiet 'uh'. It sits in unstressed syllables: PAR-ənt, FAM-ə-ly, ə-BOUT, gen-ə-RA-tion.",
        "Vietnamese speakers often give every vowel its full sound ('pa-rent', 'fa-mi-ly'). This makes every syllable equally strong, so the listener cannot hear which one matters.",
        "Say each word: tap the table on the stressed syllable, and let the schwa syllables go quiet and short.",
        "Then say the sentences, hearing the schwa in small words too: 'a', 'to', 'of', 'than'.",
      ],
      prompts: ["parent, parents, family, about, together", "generation, relationship, tradition", "My PARents tend to WORK LATE.", "Most FAMilies are SMALLer than they USED to be.", "ə LOT of GRANDparents look AFter the CHILDren.", "It's a PROBlem for the OLDer generAtion."],
      tiers: [
        { level: "Support", task: "Say the first two lines of words with the group, tapping the stressed syllable and keeping the others short." },
        { level: "Core", task: "Say all four sentences with a partner, who listens for full vowels where a schwa should be, then one Part 3 sentence of your own." },
        { level: "Stretch", task: "Find the schwas in your own 30-second Part 3 answer before you say it (mark them on paper), then say it and let your partner check each one." },
      ],
      teacherNote: "Keep it short and model it a lot. In the Part 3 round, the cue is a finger to the lips for a vowel that should be a schwa.",
    },
    {
      kind: "speaking",
      title: "IELTS Part 3: changing family roles",
      mode: "groups",
      minutes: 20,
      steps: [
        "Trios: an examiner, a speaker and a scorer. The examiner reads a question; the speaker has 10 seconds to think, then about a minute. The scorer uses the HEC rubric card (one band per criterion) and writes ONE thing to keep and ONE to fix.",
        "Every answer generalises (tend to, on the whole), gives an example, and admits an exception or the other side.",
        "Rotate after two questions so everyone is speaker, examiner and scorer.",
        "Round 2: new trios. Answer ONE of the same questions again, fixing your one thing. A new scorer scores you on a fresh card: did a band move?",
      ],
      frames: ["On the whole, families today ..., whereas in the past ...", "By and large, I'd say ..., mainly because ...", "In many cases, ..., although that isn't true of every family.", "Take my own family, for example: ...", "Compared with my grandparents' generation, ..."],
      prompts: [
        "How have the roles of mothers and fathers changed in the last fifty years?",
        "Do grandparents play a bigger or smaller part in family life now than in the past?",
        "Why do some young people choose to live far from their families?",
        "What can older people learn from younger people?",
        "Do you think the generation gap is getting bigger?",
        "Should teenagers have to help with the housework?",
      ],
      ielts: { part: 3, prepSeconds: 10, speakSeconds: 60, peerScore: true },
      tiers: [
        { level: "Support", task: "Answer in four sentences: a general claim with 'tend to', a reason, an example from a family you know, a final point.", frames: ["Families tend to ... now.", "This is because ...", "For example, in my family ...", "So I think ..."] },
        { level: "Core", task: "Speak for 45-60 seconds: a generalised claim, a reason, an example, a comparison with the past and one exception." },
        { level: "Stretch", task: "Compare two groups (city and countryside families, or two generations) and speculate about the next twenty years; keep every claim generalised, not absolute.", frames: ["This is far more common in ... than in ...", "If this trend continues, families will probably ..."] },
      ],
      fluencyTip: "If you are stuck, compare: 'In my grandparents' time ... whereas now ...' always gives you a second half.",
      teacherNote: "Circulate and prompt ('Every family?', 'Then or now?'). After round 2, three anonymous lines on the delayed-feedback board, one of them about the schwa.",
    },
    {
      kind: "listening",
      title: "Listening Part 3: planning a family interview project",
      section: 3,
      mode: "solo",
      minutes: 22,
      context: "You will hear two students, Mai and Tuan, talking to their tutor, Ms Hoa, about a project on how family roles have changed. First you have 30 seconds to look at questions 1-4, then 30 seconds for questions 5-8.",
      strategy: {
        name: "Distractors in discussions: one speaker suggests, the other rejects",
        steps: [
          "Before you listen, write the three voices at the top of your page (M, T, Ms H). Part 3 questions follow the discussion in order.",
          "When a speaker suggests something ('I wanted to ...', 'At first we ...'), wait: listen for the reply. 'But', 'too many', 'pointed out' often reject it.",
          "Choose the answer only when the speakers AGREE ('So we've agreed on ...', 'we're switching to ...'). The first idea mentioned is often the wrong one.",
          "After the first listening, compare with a partner, then listen again for the questions you disagree on and underline the words of agreement in the script.",
        ],
      },
      script: [
        { speaker: "Ms Hoa", text: "So, Mai and Tuan, your project is on how family roles have changed. Where have you got to?" },
        { speaker: "Mai", text: "We're interviewing three generations in each family: a grandparent, a parent and a teenager. At first we wanted an online questionnaire, but older people didn't really answer it." },
        { speaker: "Tuan", text: "Only eleven people filled it in, and nine of them were our classmates. So we're switching to face-to-face interviews." },
        { speaker: "Ms Hoa", text: "Sensible. How many families will you talk to?" },
        { speaker: "Tuan", text: "I suggested ten, but Mai thinks that's too many in six weeks." },
        { speaker: "Mai", text: "Each interview takes about forty minutes, and then we have to type it up. So we've agreed on six families." },
        { speaker: "Ms Hoa", text: "And what will you ask about? Family roles is a big topic." },
        { speaker: "Mai", text: "I wanted to look at who makes the big decisions, like money. But Tuan pointed out that people might not want to talk about money with two teenagers." },
        { speaker: "Tuan", text: "Right. So we're focusing on the housework: who cooks, who cleans, who looks after the little ones. Everyone's happy to talk about that." },
        { speaker: "Ms Hoa", text: "Good. Did you try a practice interview first? With your own family, Tuan?" },
        { speaker: "Tuan", text: "Yes, with my grandmother. The surprise was that men in her village did cook, on special occasions anyway. I'd always assumed it was only the women." },
        { speaker: "Mai", text: "And my mum said that, on the whole, grandparents do more childcare now than they used to, because both parents tend to work." },
        { speaker: "Ms Hoa", text: "That's an interesting finding. How will you present it all? A written report?" },
        { speaker: "Mai", text: "We thought about a poster, but we'd lose all the quotes. So it'll be a short video with clips from the interviews." },
        { speaker: "Ms Hoa", text: "Then you need written permission from everyone you film. Bring me the permission forms by the end of next week, please, not the end of the month." },
        { speaker: "Tuan", text: "We will. And we'll need a quiet room for the interviews; the library's far too noisy." },
        { speaker: "Ms Hoa", text: "Book the meeting room on the third floor. It's free on Thursday afternoons." },
      ],
      questions: {
        type: "Multiple choice (one answer) and note completion",
        instructions: "Questions 1-4: choose the correct answer. Questions 5-8: complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.",
        items: [
          { q: "1. Why did the students stop using the online questionnaire?", options: WHY_STOP, answer: "too few people answered it" },
          { q: "2. How many families will they interview?", options: FAMILIES, answer: "six" },
          { q: "3. What will the project focus on?", options: FOCUS, answer: "who does the housework" },
          { q: "4. What surprised Tuan in the practice interview?", options: SURPRISE, answer: "men in his grandmother's village sometimes cooked" },
          { q: "5. Length of each interview: about ________ minutes", answer: "40" },
          { q: "6. Final format: a short ________ with clips from the interviews", answer: "video" },
          { q: "7. Permission forms due: end of next ________", answer: "week" },
          { q: "8. Interview room: the meeting room on the ________ floor", answer: "third" },
        ],
      },
      decoding: [
        { phrase: "I suggested ten, but", sounds: "'ai-sə-JES-tid-TEN-bət': 'but' is a weak /bət/, yet it carries the rejection" },
        { phrase: "So we've agreed on six", sounds: "'so-wiv-ə-GREE-don-SIKS': the d of 'agreed' links to 'on'; this is the agreement to listen for" },
        { phrase: "Tuan pointed out that", sounds: "'TWAN-POIN-ti-DOWT-thət': 'pointed out' links into one word and signals a problem with the idea" },
        { phrase: "both parents tend to work", sounds: "'BOHTH-PAIR-ənts-TEN-tə-WERK': schwa in 'parents' and 'to'" },
      ],
      tiers: [
        { level: "Support", task: "First listening a little slower. Before it starts, circle the word in each question that tells you what to listen for (why, how many, focus, surprised), and write S (suggested) or A (agreed) next to options as you hear them." },
        { level: "Core", task: "One listening at normal speed. Compare with a partner, listen again for the ones you disagree on, and write the exact words that showed the speakers agreed." },
        { level: "Stretch", task: "One listening. Then, for each of questions 1-4, name the wrong option that was mentioned and quote the words that rejected it." },
      ],
    },
    {
      kind: "debate",
      title: "2v2 mini-debate: big families",
      mode: "groups",
      minutes: 30,
      stage: "3 2v2 mini-debate",
      motion: "This House believes that it is better to grow up in a big family.",
      speeches: [
        { role: "Proposition, opening speaker", seconds: 90, job: "Say what 'a big family' means today (four or more children, or many relatives at home), give the team's two points in one sentence each, then argue the first with an example." },
        { role: "Opposition, opening speaker", seconds: 90, job: "Accept or challenge the definition, give the team's two points in one sentence each, then argue the first with an example." },
        { role: "Proposition, second speaker", seconds: 90, job: "Rebuttal: answer the Opposition's strongest point ('That's true in some cases, but on the whole ...'). Extension: argue your team's second point with a new example." },
        { role: "Opposition, second speaker", seconds: 90, job: "Rebuttal of the Proposition's strongest point, then the extension: your team's second point with a new example." },
        { role: "Opposition summary (opening speaker)", seconds: 60, job: "One minute: the main clash and why your team won it. No new points." },
        { role: "Proposition summary (opening speaker)", seconds: 60, job: "One minute: the main clash and why your team won it. No new points." },
        { role: "Chair and two judges", seconds: 90, job: "The chair keeps time and calls each speaker; each judge gives the result with one reason from the judging card, and one band on Fluency & Coherence for every speaker." },
      ],
      steps: [
        "Roles from the rotation list: four debaters (sides by lot), one chair and two judges. Nobody keeps the same role as last week; next week's chair is one of today's judges.",
        "Seven minutes of team prep: agree your two points and who argues which; the second speaker plans a rebuttal of the other side's most likely point. Generalise: no 'all' and no 'never'.",
        "The chair opens ('Welcome to today's debate. The motion is ...'), calls each speaker, gives a 15-second warning and stops speakers at the time.",
        "Judges fill in the judging card during the debate: the best sentence from each team and the clash they think matters most.",
        "Judges decide and explain in two sentences each. Then the whole class: does the answer change in a city flat compared with a village house?",
      ],
      frames: ["Our team believes that ...", "By 'a big family', we mean ...", "On the whole, children in big families tend to ...", "Our opponents said ..., and that's true in some cases, but ...", "As my partner explained, ..., and on top of that ...", "The main clash today was ..., and we won it because ...", "{s1} argued that ..., but that isn't true of every family."],
      tiers: [
        { level: "Support", task: "Be an opening speaker or a judge. As a speaker, read your team's two points, then argue one with PREP and an example your partner helped you choose.", frames: ["Our team believes that ...", "Our first point is ..., and our second point is ...", "For example, ...", "So ..."] },
        { level: "Core", task: "Be a second speaker: rebut the strongest point in one sentence with a generaliser, then extend with a new point and a new example, without repeating your partner." },
        { level: "Stretch", task: "Be the chair or give a summary. As the summary speaker, weigh the clash ('Even if they are right about ..., what matters more is ...') and add nothing new.", frames: ["The real question today was ...", "Even if we accept their point about ..., ..."] },
      ],
      judging: ["Did the opening speaker give a clear definition and both team points?", "Did the second speaker rebut the other team's STRONGEST point, then extend with something new?", "Did the summaries name the main clash and add nothing new?", "Were claims generalised fairly (tend to, on the whole) rather than 'all' or 'never'?", "Fluency & Coherence for each speaker: one band on the HEC rubric."],
    },
    {
      kind: "activity",
      title: "Reflection: then, now and next",
      tag: "Cool-down",
      mode: "solo",
      minutes: 6,
      steps: [
        "Write three sentences on your card.",
        "Read the first one to a partner, letting the schwas go quiet.",
      ],
      frames: ["On the whole, families today ...", "In the listening, I nearly chose ... because the speaker suggested it first.", "As a debater / chair / judge today, I learnt that ..."],
      tiers: [
        { level: "Support", task: "Finish the three sentences. Bạn có thể viết câu cuối bằng tiếng Việt nếu cần." },
        { level: "Core", task: "Finish the three sentences and add one generalised claim with an exception." },
        { level: "Stretch", task: "Answer today's big question in two sentences: one thing that has changed, one that has not, each with a generaliser." },
      ],
    },
    {
      kind: "reflect",
      prompts: [
        "Are families today really so different from our grandparents' families? Give one change and one thing that has stayed the same.",
        "In the listening, which first idea nearly tricked you, and which words showed the speakers had rejected it?",
        "What did the chair and judges notice that the debaters did not?",
      ],
    },
    {
      kind: "vlog",
      title: "Video homework: a Part 3 on families",
      prompt: "Wednesday, in the app's video homework, one take with no cuts. Start with the date and this week's code word (given out at the end of class, written in no file). Then three Part 3 answers of about a minute each, every one using a generaliser and an exception: 1) 'How have the roles of mothers and fathers changed in the last fifty years?' 2) 'Do grandparents play a bigger or smaller part in family life now?' 3) 'Is it better to grow up in a big family?' End, in the same take, with the surprise question the teacher posts in the class Zalo group on Wednesday morning.",
      length: "3-4 minutes",
      tiers: [
        { level: "Support", who: "If long answers feel hard", frames: ["Families tend to ... now.", "For example, in my family ...", "But not every family ..."], tips: ["Keep one keyword per question next to the camera.", "Four sentences for each answer is enough."] },
        { level: "Core", who: "Most students", frames: ["On the whole, ..., whereas in the past ...", "In many cases, ...", "That isn't true of every family, of course, but ..."], tips: ["Compare then and now in every answer.", "Listen back for schwas in 'parents' and 'family'."] },
        { level: "Stretch", who: "If you are already fluent", frames: ["By and large, ...", "This is far more common in ... than in ...", "If this trend continues, ..."], tips: ["Add a cause and a prediction to each answer.", "Use a different generaliser in each answer."] },
      ],
    },
    {
      kind: "homework",
      title: "This week, day by day (about 20 minutes a day)",
      // Anti-AI by design: what counts is spoken by the student at a set moment and
      // checked live on Sunday. A chatbot can write a generalisation; it cannot say
      // what a grandparent told you or what was said at 04:12 in Tuesday's episode.
      items: [
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "8 minutes: one VOA Learning English story about families, old age or growing up, slow level, with the transcript on the second listen. Log: date, title, ONE timestamp (for example 04:12) and the exact 5-8 words spoken there, and one general sentence with 'tend to' about the story. Then a 20-second voice note, no script: is it the same in Vietnam?", minutes: 40, tier: "Support", check: "Sunday: the teacher plays your story at the timestamp and asks what came just before; one voice note is opened at random." },
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "12 minutes: a BBC Learning English '6 Minute English' episode on family, ageing or young people, first without the transcript, then with it. Log: date, title, TWO timestamps with the exact words there, three phrases, and the moment one presenter disagreed with the other. Then a 30-second voice note in one take: which presenter was closer to your view?", minutes: 60, tier: "Core", check: "Sunday: two logs are chosen; the teacher plays a timestamp and asks who said it and what the other presenter answered. One voice note per student is played." },
        { label: "Daily listening + log", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "18 minutes: a TED-Ed video or a podcast for young people about generations, families or how society changes, normal speed, no transcript at first. Log: two timestamps with the exact words, the main claim, and one place where the speaker generalised too much. Then a 45-second voice note: rewrite that claim aloud so it is fair.", minutes: 90, tier: "Stretch", check: "Sunday: 60 seconds live on the claim you thought went too far, then one question from the class." },
        { label: "Shadowing", days: ["Mon", "Tue", "Thu", "Fri", "Sat"], detail: "5 minutes: 30 seconds of the day's listening. Mark the schwas you hear on the transcript (in the Stretch tier, from memory), then speak WITH the speaker 3 times, keeping the unstressed syllables short. On Saturday, record your best try as audio.", minutes: 25, check: "Your Saturday audio is played beside the original; the teacher listens for full vowels where a schwa should be and writes one target on your card." },
        { label: "Recorded speaking (video homework)", days: ["Wed"], detail: "The three family answers on the previous slide, in the app: one take, no cuts, the date and code word first, Wednesday's surprise question last.", minutes: 15, check: "The teacher scores it on the HEC rubric; without the code word or the surprise question it is not counted." },
        { label: "Vocabulary retrieval", days: ["Mon", "Tue", "Wed", "Thu", "Sat"], detail: "5 minutes: the 6 family phrases on cards (phrase on the front; on the back, a sentence about a real family you know, with the phrase left as a gap), kept in the pile with last week's degree words and five cards from Lessons 26-28. Say the phrase before you turn over; cards you miss come back the next day.", minutes: 25, check: "Next Sunday's Homework check: the teacher reads your back-of-card sentence with the gap and you say the phrase." },
        { label: "Debate prep", days: ["Wed", "Fri"], detail: "Next week's motion: 'This House believes that advertising to children should be banned.' Wednesday, 10 minutes: five keyword cards, 6 words a card at most, no sentences: two points for each side with a real example (an advert you remember, a toy you wanted) and one rebuttal line. Friday, 10 minutes: speak 45 seconds for each side from the cards, timed. AI rule: you may ask an AI for ONE argument for the side you disagree with; write the question on the back of a card and one reason the answer is weak. Nothing else from an AI.", minutes: 20, check: "In the debate you speak from your cards only and the teacher asks one follow-up; if you used the AI argument, you show the class why it is weak." },
      ],
    },
  ],
};
