// Sun Class: the two-year IELTS Speaking + Listening programme with debate at its
// core (HEC's own course, curriculum "hec-ielts-sl"). One 120-minute lesson a week,
// 100 lessons in 8 terms. This file is the pacing guide every term's decks follow;
// the decks themselves live in ../hec-ielts-y<year>-t<term>.ts.
//
// Imports nothing (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
//
// Honesty rule for anything shown to families: targets are TARGETS, never promises.
// No programme can guarantee an IELTS band (see `HONEST_NOTE`).

export type ListeningType =
  | "form completion" | "note completion" | "table completion" | "flow-chart completion" | "summary completion"
  | "sentence completion" | "short answer" | "multiple choice (one answer)" | "multiple choice (two or more answers)"
  | "matching" | "map / plan labelling" | "diagram labelling";

export type DebateStage =
  | "1 Opinion + reason" // say a view and one reason, agree / disagree politely
  | "2 PREP and simple rebuttal" // Point-Reason-Example-Point; "That's true, but..."
  | "3 2v2 mini-debate" // two short speeches a side, rebuttal, a chair and judges
  | "4 3v3 class debate" // roles, weighing, summary speech
  | "5 World Schools (prepared)" // 3v3, reply speeches, points of information
  | "6 World Schools (impromptu)"; // short preparation time, as in competition

export type ProgrammeLesson = {
  n: number; // 1..100
  year: 1 | 2;
  term: number; // 1..8
  theme: string; // the IELTS topic area of the lesson
  speaking: string; // which Speaking part is practised, and how
  listening: { section: 1 | 2 | 3 | 4; types: ListeningType[]; strategy: string };
  language: string; // the lexical / grammar focus for range
  pron: string; // the pronunciation micro-focus
  debate: DebateStage;
  motion?: string; // the motion or opinion question of the debate block
  mock?: "diagnostic" | "mini" | "full"; // mini = speaking mock + 2 listening sections; full = whole speaking + 40-question listening
};

export type Term = {
  term: number;
  year: 1 | 2;
  title: string;
  from: number; // first lesson number
  to: number; // last lesson number
  aim: string;
  // Honest band targets at the END of the term for a student who starts at 5.0
  // (each student's own targets move with their Lesson 1 baseline). "expected" is
  // what most students doing the Core homework should reach: about +0.5 in Year 1
  // and +1.0-1.5 over two years, in line with the research brief's estimate for
  // 200 class hours plus regular home practice. "stretch" is for students who start
  // higher or do the full Stretch load. Targets, not promises.
  expected: string;
  stretch: string;
};

export const HONEST_NOTE = [
  "No teaching method can guarantee an IELTS band. The test measures what a student can do on the day, and progress depends above all on how much English they hear, say and get feedback on outside class.",
  "5.0 to 8.5 is a rise of 3.5 bands. Cambridge plans about 200 guided learning hours per CEFR level, and 5.0 (B1) to 8.5 (C2) is three levels: roughly 600-800 hours. Sun Class gives about 200 hours of lessons in two years, so most of the climb has to happen at home.",
  "Above 7.0 every half band gets harder: 8.5 means near-expert, flexible, precise English on abstract topics. For students aged 12-15 the ideas in Speaking Part 3 also have to mature, which takes time as well as English.",
  "What we can promise: every lesson is built on what research says works (repeated fluency tasks, explicit feedback, listening strategy plus decoding, spaced vocabulary retrieval, debate for Part 3 thinking), every student is measured every 6 weeks against the public band descriptors, and each family sees an honest target and the gap.",
];

export const TERMS: Term[] = [
  { term: 1, year: 1, title: "Talk about my world", from: 1, to: 12, aim: "Part 1 answers that keep going; a Part 2 that lasts two minutes; Listening Part 1 (forms, numbers, spelling); opinion + reason.", expected: "5.0-5.5", stretch: "5.5-6.0" },
  { term: 2, year: 1, title: "People, places, stories", from: 13, to: 25, aim: "Part 2 stories with past tenses and detail; Listening Part 2 (maps, plans, matching); PREP and rebuttal.", expected: "5.5", stretch: "6.0" },
  { term: 3, year: 1, title: "Choices and changes", from: 26, to: 37, aim: "Part 3: compare, explain causes, speculate; Listening Part 3 (discussions, opinions, distractors); 2v2 mini-debates.", expected: "5.5", stretch: "6.0-6.5" },
  { term: 4, year: 1, title: "Science, cities, the planet", from: 38, to: 50, aim: "Part 3 at length; Listening Part 4 (lectures: notes, summaries, flow-charts); 3v3 class debates; Year 1 full mock.", expected: "5.5-6.0", stretch: "6.5" },
  { term: 5, year: 2, title: "Learning and work", from: 51, to: 62, aim: "Band 7 features: less common words, natural collocation, complex sentences without strain; full tests under time; World Schools debating.", expected: "6.0", stretch: "6.5-7.0" },
  { term: 6, year: 2, title: "Media, culture, the world", from: 63, to: 75, aim: "Hedging, speculating, conceding; fast and accented listening; points of information.", expected: "6.0", stretch: "7.0" },
  { term: 7, year: 2, title: "Ethics, the future, policy", from: 76, to: 87, aim: "Band 8 features: precise, idiomatic, flexible; abstract Part 3; impromptu debate; mocks every 4 weeks.", expected: "6.0-6.5", stretch: "7.0-7.5" },
  { term: 8, year: 2, title: "Test season", from: 88, to: 100, aim: "Test conditions, each student's weakest criterion, timing and nerves; final mock; showcase debate.", expected: "6.0-6.5", stretch: "7.5 (8.0 only from a 6.5+ start)" },
];

// --------------------------------------------------------------- motion bank
// Original motions and opinion questions, sized for students aged 12-15. Stages
// 1-2 use opinion questions; 3-6 use formal motions ("This House would ...").
export const MOTIONS: Record<DebateStage, string[]> = {
  "1 Opinion + reason": [
    "Is it better to live in a city or in the countryside?",
    "Should students wear a school uniform?",
    "Is breakfast the most important meal of the day?",
    "Are video games good for teenagers?",
    "Should every child learn to cook?",
    "Is it better to have one close friend or many friends?",
    "Should homework be banned at weekends?",
    "Is Tet better spent at home or travelling?",
    "Should phones be allowed in the classroom?",
    "Are pets good for children?",
    "Is reading books more useful than watching videos?",
    "Should students choose their own school subjects?",
  ],
  "2 PREP and simple rebuttal": [
    "Should schools start at 9 a.m. instead of 7 a.m.?",
    "Should the city ban motorbikes from the Old Quarter?",
    "Is online learning as good as learning in a classroom?",
    "Should tourists pay more than local people to visit famous places?",
    "Is it better to be good at many things or excellent at one?",
    "Should children be paid for doing housework?",
    "Should every street food stall have a licence?",
    "Are celebrities good role models?",
    "Should students do community service to graduate?",
    "Is it fair to judge people by their exam results?",
    "Should zoos be closed?",
    "Should parents check their children's phones?",
  ],
  "3 2v2 mini-debate": [
    "This House would ban single-use plastic bags in Vietnam.",
    "This House believes that team sports teach more than individual sports.",
    "This House would make learning a musical instrument compulsory at school.",
    "This House believes that social media does more harm than good to teenagers.",
    "This House would replace school exams with projects.",
    "This House believes that it is better to grow up in a big family.",
    "This House would give every student a free bicycle.",
    "This House believes that advertising to children should be banned.",
    "This House would let 16-year-olds vote.",
    "This House believes that famous people deserve privacy.",
    "This House would make museums free for everyone.",
    "This House believes that robots will make life better for most people.",
  ],
  "4 3v3 class debate": [
    "This House would tax sugary drinks.",
    "This House believes that space exploration is a waste of money.",
    "This House would ban cars from city centres.",
    "This House believes that tourism does more harm than good to beautiful places.",
    "This House would require all students to learn coding.",
    "This House believes that cities should build up, not out.",
    "This House would make every company report its carbon emissions.",
    "This House believes that animal testing should be banned.",
    "This House would pay students for good grades.",
    "This House believes that nuclear power is the best answer to climate change.",
    "This House would ban fast food advertising.",
    "This House believes that scientists, not politicians, should decide health policy.",
  ],
  "5 World Schools (prepared)": [
    "This House believes that university should be free for everyone.",
    "This House would replace teachers with AI tutors for core subjects.",
    "This House believes that working from home is better for society.",
    "This House would require a gap year of national or community service.",
    "This House believes that news organisations should never publish anonymous sources.",
    "This House regrets the rise of short-form video.",
    "This House would protect local languages by law.",
    "This House believes that globalisation has made the world more equal.",
    "This House would ban influencer marketing aimed at under-18s.",
    "This House believes that museums should return objects to their countries of origin.",
    "This House would put a limit on the number of tourists in Ha Long Bay.",
    "This House believes that the arts deserve as much public money as science.",
  ],
  "6 World Schools (impromptu)": [
    "This House would give future generations a voice in parliament.",
    "This House believes that privacy is dead and we should accept it.",
    "This House would ban the use of AI to create art for sale.",
    "This House believes that wealthy countries should accept all climate refugees.",
    "This House regrets the culture of constant self-improvement.",
    "This House would make voting compulsory.",
    "This House believes that genetic editing of humans should be allowed to prevent disease.",
    "This House would abolish homework in secondary schools.",
    "This House believes that it is acceptable to break the law to protect the environment.",
    "This House would require social media companies to verify every user's identity.",
    "This House believes that cities should be designed for children first.",
    "This House prefers a world without national borders.",
  ],
};

// --------------------------------------------------------------- 100 lessons
type Row = [theme: string, speaking: string, section: 1 | 2 | 3 | 4, types: ListeningType[], strategy: string, language: string, pron: string, motion?: string, mock?: ProgrammeLesson["mock"]];

const T1: Row[] = [
  ["Getting to know you; how IELTS works", "Diagnostic: full Speaking test (Parts 1-3), recorded", 1, ["form completion"], "Read the questions first and predict the kind of answer (a number? a name?)", "Extending a Part 1 answer: answer + reason + example (because, especially, for example)", "Final consonants /t/ /d/ /k/: don't drop the end of the word", "Is it better to live in a city or in the countryside?", "diagnostic"],
  ["Hometown and home", "Part 1: hometown, home, neighbourhood", 1, ["form completion", "note completion"], "Numbers, dates and spelling: write what you hear, check the letter names", "Describing places: adjective + noun collocations (bustling street, quiet suburb); there is / there are", "Spelling aloud: letter names A-Z, double letters, 'oh' vs zero", "Is it better to live in a city or in the countryside?"],
  ["Study, school and free time", "Part 1: study, subjects, weekends; 4/3/2 on 'my week'", 1, ["form completion", "multiple choice (one answer)"], "Listen for the answer AFTER the corrections ('Oh no, sorry, it's Thursday')", "Habits: tend to, usually, used to, these days; frequency adverbs in the right place", "-s endings /s/ /z/ /ɪz/ (likes, plays, watches)", "Should students choose their own school subjects?"],
  ["Food and eating", "Part 1: food, cooking, eating out", 1, ["table completion"], "Tables: read across and down, see which cell is missing, predict a word class", "Food collocations (a balanced diet, home-cooked, grab a snack); preference: I'd rather, I prefer X to Y", "Word stress in 2- and 3-syllable words (VEGetable, deLICious)", "Should every child learn to cook?"],
  ["Hobbies, music and sport", "Part 2 introduced: the cue card, 1 minute of notes, talking for 2 minutes", 1, ["note completion"], "Signposts tell you a new answer is coming ('Right, next...', 'And what about...')", "Present perfect for experience (I've been playing since...), for / since; enjoyment verbs + -ing", "Consonant clusters: no added vowel (sport, played, texts)", "Are video games good for teenagers?"],
  ["Friends and family", "Mini-mock: Parts 1 and 2 with peer and teacher scoring", 1, ["form completion", "note completion"], "Mini-mock: Listening Part 1 and Part 2 under test conditions", "Describing people: personality adjectives, get on (well) with, take after, look up to", "Sentence stress: stress the words that carry meaning", "Is it better to have one close friend or many friends?", "mini"],
  ["Technology in my life", "Part 1: phones, apps, the internet; Part 2 'a useful app'", 2, ["multiple choice (one answer)"], "MCQ: underline the key idea in each option; the words you hear will be paraphrased", "Giving reasons and results: so, which means, that's why, as a result", "Weak forms: to, for, of, and, can (/tə/ /fə/ /əv/)", "Should phones be allowed in the classroom?"],
  ["Weather, seasons and Tet", "Part 1: weather, festivals; Part 2 'a festival you enjoy'", 2, ["note completion", "matching"], "Matching: the options are in order of the recording? No: the questions are. Follow the questions.", "Describing events: take place, look forward to, get together; past simple and past continuous", "-ed endings /t/ /d/ /ɪd/ (cooked, cleaned, decorated)", "Is Tet better spent at home or travelling?"],
  ["Shopping and money", "Part 2: 'something you bought and were happy with'; 4/3/2", 2, ["map / plan labelling"], "Maps: find where you start, learn the direction words before you listen", "Prepositions of place and direction (opposite, next to, at the end of, go past); comparatives", "Linking consonant to vowel (pick_it_up, a lot_of)", "Should children be paid for doing housework?"],
  ["Books, films and stories", "Part 2: 'a book or film you remember'; story structure", 2, ["multiple choice (one answer)", "matching"], "Distractors: the speaker often mentions a wrong option first", "Narrative: past simple, past continuous, past perfect; sequencing (at first, after a while, in the end)", "/θ/ and /ð/: think, three, the, that", "Is reading books more useful than watching videos?"],
  ["Animals and nature", "Part 1 + Part 2: 'an animal or a place in nature'; Part 3 first taste", 2, ["note completion", "short answer"], "Short answers: keep to the word limit; check spelling and plurals", "Comparing: much / far / slightly + comparative; not as ... as; the most ...", "Long and short vowels /iː/ /ɪ/ (sheep, ship; leave, live)", "Are pets good for children?"],
  ["Term 1 review and mock", "Full mock: Speaking Parts 1-3 (teacher scores 2-3 students; pairs score the rest)", 1, ["form completion", "note completion", "multiple choice (one answer)", "map / plan labelling"], "Full mock: Listening Parts 1 and 2 (20 questions) plus a Part 3 sample", "Review: recycle the term's chunks in new answers", "Self-check: record and listen for your own final sounds", "Should homework be banned at weekends?", "full"],
];

const T2: Row[] = [
  ["Places I have visited", "Part 2: 'a place you visited'; setting, people, feelings", 2, ["map / plan labelling"], "Plan labelling: move with the speaker; note each landmark you pass", "Describing places precisely: picturesque, crowded, off the beaten track; relative clauses (where, which)", "Word stress in compound nouns (BUS stop, SHOPping mall)", "Should tourists pay more than local people to visit famous places?"],
  ["A person I admire", "Part 2: 'a person you admire'; Part 3: role models", 2, ["multiple choice (one answer)", "matching"], "Matching speakers' views: listen for opinion words (I reckon, to be honest)", "Character and achievement: determined, generous; relative clauses (who, whose)", "/ʃ/ and /tʃ/: she, cheap; wash, watch", "Are celebrities good role models?"],
  ["Transport and getting around", "Part 1: transport; Part 3: traffic in cities", 2, ["note completion", "table completion"], "Note completion: the notes paraphrase the audio; listen for meaning, not the same words", "Problems and solutions: cause, lead to, result in; should / could / ought to", "Linking vowel to vowel with /j/ and /w/ (go_w_out, I_y_am)", "Should the city ban motorbikes from the Old Quarter?"],
  ["Daily routines and time", "Part 1 + 4/3/2: 'my perfect day'", 1, ["form completion", "short answer"], "Times and prices: 'quarter past', 'half price', '15 or 50?'", "Time expressions; first conditional for plans (If I get up early, I'll ...)", "Numbers: 13 vs 30, 15 vs 50 (stress moves)", "Should schools start at 9 a.m. instead of 7 a.m.?"],
  ["Gifts and celebrations", "Part 2: 'a gift you gave or received'", 2, ["multiple choice (two or more answers)"], "Choose TWO: eliminate options as the speaker rules them out", "Feelings: thrilled, touched, disappointed; -ed / -ing adjectives", "Intonation: falling for statements, rising for yes/no questions", "Is it better to give experiences than things as gifts?"],
  ["Childhood memories", "Part 2: 'a happy memory from childhood'; used to / would", 2, ["sentence completion"], "Sentence completion: the sentence is given before you hear it; predict grammar (a noun? a verb?)", "Past habits: used to, would, didn't use to; I remember + -ing", "Thought groups: pause at sense breaks, not in the middle of a chunk", "Is it better to grow up in a big or small family?"],
  ["Mini-mock: people and places", "Mini-mock: Parts 1-2, a Part 3 sample", 2, ["map / plan labelling", "matching"], "Mini-mock: Listening Parts 1 and 2", "Recycle: describing people and places", "Peer check: final consonants and -ed", "Is online learning as good as learning in a classroom?", "mini"],
  ["Health and exercise", "Part 1: sport, sleep, health; Part 3: healthy lifestyles", 2, ["multiple choice (one answer)", "note completion"], "Listen for the speaker changing their mind ('Actually, I've decided...')", "Health collocations (get enough sleep, work out, cut down on); advice structures", "Weak forms of auxiliaries (do you, have you, was, were)", "Should every street food stall have a licence?"],
  ["Clothes and fashion", "Part 1 + Part 2: 'a piece of clothing you like'", 1, ["form completion", "table completion"], "Form completion with mixed answers: names, postcodes, emails", "Describing objects: order of adjectives, made of, it's the kind of ... that ...", "Email addresses and symbols aloud (dot, at, underscore, hyphen)", "Should students wear a school uniform?"],
  ["Art, photos and creativity", "Part 2: 'a photo you like'; Part 3: art in schools", 2, ["matching", "multiple choice (one answer)"], "Matching features to places/people: list the options in your own short code", "Speculating about a picture: it looks like, it might be, it seems as if", "Contrastive stress: I said the RED one, not the blue one", "Is it better to be good at many things or excellent at one?"],
  ["Helping others and community", "Part 2: 'a time you helped someone'; Part 3: volunteering", 2, ["sentence completion", "short answer"], "Hearing the answer once: keep moving if you miss one", "Narrative with reasons: so that, in order to; past perfect for background", "Sentence stress on new information", "Should students do community service to graduate?"],
  ["Rules and fairness", "Part 3: rules at school and at home; agree / partly agree / disagree", 2, ["multiple choice (two or more answers)", "note completion"], "Paraphrase spotting: build a list of synonyms each week", "Obligation and permission: must, have to, be allowed to, be supposed to", "Rhythm: stressed syllables at even beats", "Should parents check their children's phones?"],
  ["Term 2 review and full mock", "Full mock: Speaking Parts 1-3", 2, ["form completion", "map / plan labelling", "matching", "multiple choice (one answer)"], "Full mock: Listening Parts 1-2 + one Part 3 (30 questions)", "Review: the term's Part 2 frames", "Self-check recording against the term's pronunciation list", "Is it fair to judge people by their exam results?", "full"],
];

const T3: Row[] = [
  ["Education then and now", "Part 3: comparing past and present", 3, ["multiple choice (one answer)"], "Part 3 discussions: who is speaking? Track the two or three voices", "Comparing time periods: nowadays, in the past, compared with, whereas", "Weak forms in fast speech (was, were, have, has)", "This House would replace school exams with projects."],
  ["Teenagers and technology", "Part 3: effects of technology; cause and effect", 3, ["matching", "multiple choice (two or more answers)"], "Agreement and disagreement between speakers: 'I'm not so sure', 'Exactly'", "Cause and effect: due to, because of, has led to, one reason why", "Linking and elision (next day -> nex' day; last time)", "This House believes that social media does more harm than good to teenagers."],
  ["Sport and competition", "Part 2 -> Part 3 links: 'a sports event' -> competition in society", 3, ["multiple choice (one answer)", "note completion"], "Predicting from the Part 2 card to the Part 3 questions", "Concession: although, even though, despite, while it's true that ...", "Stress shift in word families (comPETE, comPETitive, compeTItion)", "This House believes that team sports teach more than individual sports."],
  ["Music and the arts", "Part 3: should the arts be compulsory?", 3, ["matching", "sentence completion"], "Listening for attitude: tone and stance words (surprisingly, frankly)", "Expressing degree: fairly, rather, quite, extremely, absolutely + gradable / extreme adjectives", "Intonation for attitude: surprise, doubt, certainty", "This House would make learning a musical instrument compulsory at school."],
  ["Family and generations", "Part 3: changing family roles", 3, ["multiple choice (one answer)", "note completion"], "Distractors in discussions: one speaker suggests, the other rejects", "Generalising: tend to, on the whole, by and large, in many cases", "Schwa in unstressed syllables (parent, family, about)", "This House believes that it is better to grow up in a big family."],
  ["Advertising and shopping", "Part 3: advertising and persuasion", 3, ["multiple choice (two or more answers)"], "Choose TWO from five: listen for both, then check", "Passive for impersonal statements (It is often said that ..., Products are marketed as ...)", "Sentence stress in passive sentences", "This House believes that advertising to children should be banned."],
  ["Mini-mock: society", "Mini-mock: Part 2 + Part 3", 3, ["multiple choice (one answer)", "matching"], "Mini-mock: Listening Parts 2 and 3", "Recycle: concession and cause-effect", "Peer check: weak forms", "This House would give every student a free bicycle.", "mini"],
  ["Cities and housing", "Part 3: city life, housing problems, solutions", 3, ["table completion", "note completion"], "Following a project discussion: the stages of a plan", "Speculating about the future: will probably, is likely to, might well, could", "Contractions in natural speech (it'll, they'd, we've)", "This House would ban cars from city centres."],
  ["Work and jobs", "Part 2 'a job you would like'; Part 3 the future of work", 3, ["matching", "multiple choice (one answer)"], "Matching people to opinions in a tutorial", "Second conditional for hypotheses (If I could choose any job, I would ...)", "Intonation in lists and choices", "This House believes that robots will make life better for most people."],
  ["Celebrities and privacy", "Part 3: fame, privacy, the media", 3, ["multiple choice (two or more answers)", "sentence completion"], "Listening for the reason, not just the opinion", "Opinion and stance: from my point of view, I'd argue that, it depends on", "Tonic stress for contrast in debate ('YOU might think so, but...')", "This House believes that famous people deserve privacy."],
  ["Voting, rules and citizenship", "Part 3: decisions in society", 3, ["matching", "note completion"], "Note-taking in symbols and abbreviations", "Weighing arguments: on balance, the main advantage outweighs, more importantly", "Pausing for emphasis", "This House would let 16-year-olds vote."],
  ["Term 3 review and full mock", "Full mock: Speaking Parts 1-3", 3, ["multiple choice (one answer)", "multiple choice (two or more answers)", "matching", "map / plan labelling"], "Full mock: Listening Parts 1-3 (30 questions)", "Review: Part 3 moves", "Record and compare with your Term 1 diagnostic", "This House would make museums free for everyone.", "full"],
];

const T4: Row[] = [
  ["The environment", "Part 3: environmental problems and responsibility", 4, ["note completion"], "Lectures: listen for the structure (first, the second point, to sum up)", "Environment collocations (carbon footprint, renewable energy, endangered species)", "Stress in long academic words (environMENtal, sustainaBIlity)", "This House would make every company report its carbon emissions."],
  ["Plastic and waste", "Part 2 'something you recycle'; Part 3 solutions", 4, ["summary completion"], "Summary completion: the summary is a shorter paraphrase; predict missing word classes", "Problem-solution language; modal passives (should be banned, could be reduced)", "Chunking long sentences into thought groups", "This House would ban single-use plastic bags in Vietnam."],
  ["Food, health and science", "Part 3: food policy and science", 4, ["sentence completion", "note completion"], "Lecture signposts for examples and definitions ('what I mean by that is...')", "Defining and non-defining relative clauses for precision", "Pausing around non-defining clauses", "This House would tax sugary drinks."],
  ["Space and exploration", "Part 3: is exploration worth it?", 4, ["flow-chart completion", "diagram labelling"], "Flow-charts and diagrams: follow a process or a machine part by part; listen for sequence and position words", "Describing processes: first, then, once, after being + past participle", "Linking in fast lectures", "This House believes that space exploration is a waste of money."],
  ["Animals and ethics", "Part 3: animals in research and zoos", 4, ["note completion", "multiple choice (one answer)"], "Spelling under speed: plurals and word endings", "Hedging: it could be argued that, there is some evidence that, to some extent", "Intonation for hedging (falling-rising)", "This House believes that animal testing should be banned."],
  ["Mini-mock: science", "Mini-mock: Part 2 + Part 3", 4, ["note completion", "summary completion"], "Mini-mock: Listening Parts 3 and 4", "Recycle: hedging and processes", "Peer check: word stress in long words", "This House believes that nuclear power is the best answer to climate change.", "mini"],
  ["Cities of the future", "Part 3: planning and design", 4, ["note completion", "table completion"], "Listening for numbers in lectures (percentages, dates, approximations)", "Describing trends: rose sharply, fell slightly, remained stable; approximately, roughly", "Stress on numbers and contrasts", "This House believes that cities should build up, not out."],
  ["Tourism and heritage", "Part 2 'a historic place'; Part 3 tourism", 4, ["sentence completion", "summary completion"], "Paraphrase at the lecture level: the question uses general words, the speaker uses specific ones", "Advantages / disadvantages with a nuanced conclusion", "Rhythm in longer turns", "This House believes that tourism does more harm than good to beautiful places."],
  ["Coding, AI and the future", "Part 3: technology and the future", 4, ["flow-chart completion", "note completion"], "Predicting the lecture's organisation from the title", "Future forms: will have, will be -ing, is set to, is expected to", "Weak forms in future perfect", "This House would require all students to learn coding."],
  ["Money and motivation", "Part 3: rewards and motivation", 4, ["summary completion", "multiple choice (one answer)"], "Monitoring: notice when you're lost and re-join at the next signpost", "Cleft sentences for emphasis (What really matters is ..., It is ... that ...)", "Stress in cleft sentences", "This House would pay students for good grades."],
  ["Media and health", "Part 3: advertising, health, responsibility", 4, ["note completion", "sentence completion"], "Note completion from a full lecture", "Mixed conditionals (If we had acted earlier, we wouldn't be ...)", "Intonation in conditionals", "This House would ban fast food advertising."],
  ["Who decides? Experts and leaders", "Part 3: trust, expertise, decisions", 4, ["multiple choice (one answer)", "summary completion"], "Distractors in lectures: 'it was once thought that ... but'", "Contrasting views: whereas, on the other hand, conversely, by contrast", "Pace control: slowing for key points", "This House believes that scientists, not politicians, should decide health policy."],
  ["Year 1 full mock and review", "Full mock: full Speaking test, teacher-scored", 4, ["form completion", "map / plan labelling", "multiple choice (two or more answers)", "note completion"], "Full mock: Listening Parts 1-4 (40 questions), raw score to band", "Year 1 review: each student's own top 3 targets", "Compare recordings: diagnostic vs now", "Year 1 showcase debate: the class chooses from Term 4 motions", "full"],
];

const T5: Row[] = [
  ["Learning for life", "Part 3: lifelong learning; band 7 lexis", 3, ["multiple choice (one answer)", "matching"], "Year 2 starts at full test speed; review the four-part strategy cycle", "Less common vocabulary used precisely (acquire, a steep learning curve, self-motivated)", "Word stress review in academic words", "This House believes that university should be free for everyone."],
  ["AI and teaching", "Part 3: AI in education", 4, ["note completion", "summary completion"], "Lectures with two viewpoints: label each view", "Nuanced hedging (arguably, it is debatable whether, there is a case for)", "Sentence stress in hedged statements", "This House would replace teachers with AI tutors for core subjects."],
  ["Work, life and balance", "Part 2 'a time you worked hard'; Part 3 working life", 3, ["matching", "multiple choice (two or more answers)"], "Tutorial discussions with three speakers", "Idiomatic but natural (burn the midnight oil, a work-life balance) and when not to use idioms", "Intonation in idioms and fixed phrases", "This House believes that working from home is better for society."],
  ["Service and responsibility", "Part 3: citizens and service", 3, ["multiple choice (one answer)", "note completion"], "Following a disagreement to its resolution", "Concession at band 7 (Granted, ...; Admittedly, ...; That said, ...)", "Contrastive stress in concessions", "This House would require a gap year of national or community service."],
  ["News and truth", "Part 3: news, trust, fake news", 4, ["sentence completion", "flow-chart completion"], "Note-taking for an argument's logic: claim, evidence, limit", "Reporting verbs (claim, argue, suggest, deny, acknowledge) + patterns", "Weak forms in reported speech", "This House believes that news organisations should never publish anonymous sources."],
  ["Short video and attention", "Mini-mock: full Speaking test", 4, ["note completion", "multiple choice (one answer)"], "Mini-mock: Listening Parts 3 and 4", "Recycle: reporting verbs and hedging", "Peer check: pace and pausing", "This House regrets the rise of short-form video.", "mini"],
  ["Languages and identity", "Part 3: languages, culture, identity", 3, ["matching", "sentence completion"], "Accents: British, American, Australian and other speakers", "Abstract nouns and nominalisation (the loss of, the preservation of)", "Stress in nominalised phrases", "This House would protect local languages by law."],
  ["Globalisation", "Part 3: global and local", 4, ["summary completion", "note completion"], "Listening for implied meaning", "Inversion for emphasis (Not only ... but also ...; Never before has ...)", "Intonation in emphatic structures", "This House believes that globalisation has made the world more equal."],
  ["Influencers and marketing", "Part 2 'an advert you remember'; Part 3 persuasion", 3, ["multiple choice (two or more answers)", "matching"], "Spotting attitude shifts in a fast conversation", "Persuasive language and its critique (manipulative, misleading, glamorise)", "Tone: neutral, persuasive, ironic", "This House would ban influencer marketing aimed at under-18s."],
  ["Museums and history", "Part 3: history and heritage", 4, ["note completion", "sentence completion"], "Lecture on a debate: map the two sides", "Speculating about the past (must have, might have, can't have)", "Weak 'have' in past modals", "This House believes that museums should return objects to their countries of origin."],
  ["Tourism limits", "Part 3: managing tourism", 4, ["table completion", "summary completion"], "Numbers, rates and trends at speed", "Evaluating policy: viable, feasible, short-sighted, a trade-off", "Thought groups in long Part 3 answers", "This House would put a limit on the number of tourists in Ha Long Bay."],
  ["Term 5 full mock", "Full mock: full Speaking test", 1, ["form completion", "map / plan labelling", "matching", "note completion"], "Full mock: Listening Parts 1-4 (40 questions)", "Review: band 7 features checklist", "Recording comparison: Year 1 vs now", "This House believes that the arts deserve as much public money as science.", "full"],
];

const T6: Row[] = [
  ["The media we use", "Part 3: media habits and influence", 3, ["multiple choice (one answer)", "matching"], "Fast natural conversation: reduced forms (gonna, wanna, kinda) - recognise, don't copy in the test", "Precise verbs for change (erode, boost, reshape, undermine)", "Reduced forms in fast speech (recognition)", "This House regrets the rise of short-form video."],
  ["Culture and tradition", "Part 2 'a tradition in your family'; Part 3 change", 3, ["sentence completion", "matching"], "Listening for contrast between old and new", "Talking about change over time (has gradually, is increasingly, no longer)", "Intonation for contrast", "This House would protect local languages by law."],
  ["Privacy and technology", "Part 3: privacy and surveillance", 4, ["note completion", "summary completion"], "Dense lectures: keep the outline, fill in detail", "Hedging and boosting (undeniably, it is far from clear, to a large extent)", "Stress and pitch for emphasis", "This House would require social media companies to verify every user's identity."],
  ["Equality and opportunity", "Part 3: fairness in society", 4, ["flow-chart completion", "note completion"], "Cause-effect chains in lectures", "Complex noun phrases (the growing gap between rich and poor)", "Pausing in long noun phrases", "This House believes that globalisation has made the world more equal."],
  ["Points of information", "Debate skill: offering and taking POIs; Part 3 follow-ups", 3, ["multiple choice (two or more answers)", "matching"], "Listening while planning: keep one ear on the speaker", "Interrupting and responding politely (On that point, ...; I'll take that; No thank you)", "Fast, clear short turns", "This House would ban influencer marketing aimed at under-18s."],
  ["Mini-mock: media and culture", "Mini-mock: full Speaking test", 4, ["summary completion", "sentence completion"], "Mini-mock: Listening Parts 3 and 4", "Recycle: change and hedging", "Peer check: emphasis and pitch", "This House believes that museums should return objects to their countries of origin.", "mini"],
  ["Science and society", "Part 3: trust in science", 4, ["note completion", "multiple choice (one answer)"], "Lecture questions out of the expected order? No: always in order; re-join quickly", "Academic collocations (conduct research, draw conclusions, pose a risk)", "Stress in academic collocations", "This House believes that genetic editing of humans should be allowed to prevent disease."],
  ["Climate and justice", "Part 3: global responsibility", 4, ["summary completion", "table completion"], "Summaries with a word box (no word box): choosing word class", "Weighing values (fairness vs freedom; short-term vs long-term)", "Intonation for weighing", "This House believes that wealthy countries should accept all climate refugees."],
  ["The future of cities", "Part 3: planning for people", 3, ["map / plan labelling", "matching"], "Plans at speed: labels in a lecture-style talk", "Speculating about the future at band 8 (is bound to, is unlikely to, may well)", "Weak forms in speculation", "This House believes that cities should be designed for children first."],
  ["Art and AI", "Part 3: creativity, ownership", 4, ["note completion", "sentence completion"], "Inferring the speaker's conclusion before they state it", "Idiom and metaphor used sparingly and accurately", "Natural stress in idioms", "This House would ban the use of AI to create art for sale."],
  ["Self-improvement", "Part 2 'a skill you want to learn'; Part 3 pressure", 3, ["multiple choice (one answer)", "matching"], "Attitude and irony", "Expressing reservations (I'm in two minds, I have mixed feelings, up to a point)", "Intonation of reservation", "This House regrets the culture of constant self-improvement."],
  ["Voting and democracy", "Part 3: participation", 4, ["note completion", "flow-chart completion"], "Note-taking for a debate case", "Conditionals for policy consequences (Were this to happen, ...)", "Pace in persuasive speech", "This House would make voting compulsory."],
  ["Term 6 full mock", "Full mock: full Speaking test", 2, ["map / plan labelling", "multiple choice (two or more answers)", "summary completion", "form completion"], "Full mock: Listening Parts 1-4", "Review: each student's weakest criterion", "Recording comparison", "This House prefers a world without national borders.", "full"],
];

const T7: Row[] = [
  ["Future generations", "Part 3: duty to the future; band 8 precision", 4, ["note completion", "summary completion"], "Full-speed lectures with academic vocabulary", "Precise abstract vocabulary (intergenerational, accountability, unprecedented)", "Stress in long abstract words", "This House would give future generations a voice in parliament."],
  ["Privacy now", "Part 3: is privacy dead?", 3, ["multiple choice (two or more answers)", "matching"], "Three-speaker tutorials at speed", "Sophisticated concession (While I take the point that ..., it does not follow that ...)", "Tonic stress for argument", "This House believes that privacy is dead and we should accept it."],
  ["Laws and protest", "Part 3: rights and responsibilities", 4, ["sentence completion", "note completion"], "Inferring stance from evidence choices", "Hypothetical past and present (Had they not ..., ...; If it weren't for ...)", "Intonation in complex conditionals", "This House believes that it is acceptable to break the law to protect the environment."],
  ["Homework and childhood", "Part 2 + Part 3 at band 8", 3, ["matching", "multiple choice (one answer)"], "Matching with many options", "Flexible paraphrase: say the same idea three ways", "Fluency at band 8: pausing only for ideas", "This House would abolish homework in secondary schools."],
  ["Mock: impromptu", "Speaking mock (full) + impromptu debate", 4, ["note completion", "summary completion"], "Listening mock: Parts 3 and 4", "Recycle: concession and hypotheticals", "Self-scoring against the descriptors", "This House would make voting compulsory.", "mini"],
  ["Borders and belonging", "Part 3: migration and identity", 4, ["flow-chart completion", "note completion"], "Lecture on a process of change", "Cohesion at band 8: reference (this, such, the former, the latter), ellipsis", "Linking and rhythm in long turns", "This House prefers a world without national borders."],
  ["Genetics and ethics", "Part 3: science and ethics", 4, ["summary completion", "sentence completion"], "Technical lectures: define unknown words from context", "Expressing certainty and doubt precisely", "Pitch range for certainty and doubt", "This House believes that genetic editing of humans should be allowed to prevent disease."],
  ["Children and cities", "Part 3: design and fairness", 3, ["map / plan labelling", "multiple choice (two or more answers)"], "Plans and discussion combined", "Evaluative adjectives (compelling, flawed, persuasive, tenuous)", "Stress on evaluative words", "This House believes that cities should be designed for children first."],
  ["AI and work", "Part 3: the economy of the future", 4, ["note completion", "table completion"], "Numbers and trends at speed", "Speculation and prediction at band 8", "Weak forms at speed", "This House would ban the use of AI to create art for sale."],
  ["Full mock 1 of 3", "Full mock: full Speaking test, teacher-scored", 1, ["form completion", "map / plan labelling", "matching", "note completion"], "Full mock: Listening Parts 1-4", "Each student's own error log", "Recording comparison", "This House believes that wealthy countries should accept all climate refugees.", "full"],
  ["Identity online", "Part 3: online identity", 3, ["multiple choice (one answer)", "matching"], "Inference and attitude", "Idiomatic flexibility (natural, not memorised)", "Natural rhythm", "This House would require social media companies to verify every user's identity."],
  ["Term 7 review", "Part 2 + Part 3 under test conditions", 4, ["summary completion", "note completion"], "Timed Part 4 practice", "Review: band 8 features checklist", "Recording comparison", "This House regrets the culture of constant self-improvement.", "full"],
];

const T8: Row[] = [
  ["Test strategy review", "Full Speaking test; timing Part 2 to 2 minutes exactly", 1, ["form completion", "note completion"], "Test day routine: reading ahead, checking, transfer", "Personal phrase bank: each student's own best 30 chunks", "Each student's pronunciation priority", "This House would abolish homework in secondary schools."],
  ["Weakest criterion 1", "Targeted practice by criterion (groups by need)", 2, ["map / plan labelling", "matching"], "Part 2 traps: plans and matching", "Targeted: lexical resource or grammar range (per student)", "Targeted: per student", "This House believes that cities should be designed for children first."],
  ["Weakest criterion 2", "Targeted practice by criterion", 3, ["multiple choice (two or more answers)", "matching"], "Part 3 traps: distractors and changes of mind", "Targeted per student", "Targeted per student", "This House would give future generations a voice in parliament."],
  ["Lectures at speed", "Part 3 extended discussion", 4, ["note completion", "summary completion"], "Part 4 under pressure", "Abstract topics: precise lexis", "Pace and clarity", "This House believes that privacy is dead and we should accept it."],
  ["Full mock 2 of 3", "Full mock: full Speaking test", 1, ["form completion", "map / plan labelling", "multiple choice (one answer)", "note completion"], "Full mock: Listening Parts 1-4", "Error log review", "Recording comparison", "This House prefers a world without national borders.", "full"],
  ["Nerves and recovery", "Handling difficult questions: buying time, recovering", 3, ["matching", "multiple choice (one answer)"], "When you miss an answer: let it go, keep the next one", "Recovery language (Let me put that another way; What I mean is)", "Steady pace under pressure", "This House would make voting compulsory."],
  ["Unfamiliar topics", "Part 3 on unfamiliar abstract topics", 4, ["sentence completion", "flow-chart completion"], "Unfamiliar lecture topics", "Building an answer on a topic you know little about", "Clarity over speed", "This House would ban the use of AI to create art for sale."],
  ["Part 2 polish", "Part 2: twelve cue cards rotated", 2, ["table completion", "matching"], "Mixed Part 2", "Range without strain", "Natural intonation in stories", "This House believes that genetic editing of humans should be allowed to prevent disease."],
  ["Part 3 polish", "Part 3: deep follow-ups", 3, ["multiple choice (two or more answers)", "sentence completion"], "Mixed Part 3", "Flexibility and nuance", "Emphasis for argument", "This House believes that it is acceptable to break the law to protect the environment."],
  ["Full mock 3 of 3", "Final full mock: full Speaking test", 1, ["form completion", "map / plan labelling", "matching", "summary completion"], "Final full mock: Listening Parts 1-4", "Final targets for test day", "Final recording comparison", "This House believes that wealthy countries should accept all climate refugees.", "full"],
  ["Review of the final mock", "Individual feedback and last targets", 4, ["note completion", "summary completion"], "Review the mock's mistakes by type", "Each student's last 10 chunks", "Each student's last priority", "This House regrets the culture of constant self-improvement."],
  ["Showcase debate", "World Schools showcase for families", 3, ["matching", "multiple choice (one answer)"], "Light listening: a celebration", "Celebration: what we can now say", "Confidence and projection", "Chosen by the class from the Year 2 bank"],
  ["Test week: calm practice", "Short Part 1 warm-up routine for test day", 1, ["form completion", "note completion"], "Test-day routine", "Light review", "Warm-up routine for the voice", "No debate: rest and confidence", undefined],
];

const stageFor = (n: number): DebateStage =>
  n <= 6 ? "1 Opinion + reason" : n <= 25 ? "2 PREP and simple rebuttal" : n <= 37 ? "3 2v2 mini-debate" : n <= 50 ? "4 3v3 class debate" : n <= 75 ? "5 World Schools (prepared)" : "6 World Schools (impromptu)";

export const LESSONS: ProgrammeLesson[] = [T1, T2, T3, T4, T5, T6, T7, T8].flatMap((rows, ti) => {
  const term = TERMS[ti];
  return rows.map(([theme, speaking, section, types, strategy, language, pron, motion, mock], i) => ({
    n: term.from + i,
    year: term.year,
    term: term.term,
    theme, speaking, listening: { section, types, strategy }, language, pron,
    debate: stageFor(term.from + i),
    ...(motion ? { motion } : {}),
    ...(mock ? { mock } : {}),
  }));
});
