import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 9 "Following
// Rules" (src/lib/lessonDecks/lab.ts puts it into the decks). The class is Sanrio
// Grade 6: students in grades 6-7 (ages 11-13) working on a book written for younger
// children, so the Lab raises the demand: longer chunks with two clauses and reasons,
// topics they care about (school, phones and technology, friends, sport, fairness at
// home), a grammar drill in every lesson, full paragraphs in three lessons, harder
// sentence work in the other two, and talks that give reasons and examples. Every
// lesson has a fluency routine on the unit's rule talk (can / can't / have to / should
// and because) and my / mine / ours, said again and again as whole phrases, a little
// faster each round, with Unit 8's phrases mixed back in. Time comes from dropping the
// book's games for little ones, never from the book pages or the grammar. All text is
// original.

const fixRules =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say the same thing again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: start the phrase and pause ('At school we can't r...?'), point to the frame, or hold up a finger for the missing -s or 'to' ('I have clean up' - finger up: 'I have ___ clean up?'). Say it back with a rising voice ('We take turn?') so the student hears the gap. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: students copy what they hear.";

const fixMine =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: students who then say it again use the fixed form. For grammar, prompt the student to fix it rather than saying it for them: point to the frame and ask 'Is the thing after it? Or alone?' ('This is mine book' - point to 'my ___'), repeat the error with a rising voice ('The jacket is her?'), or hold up a finger for the missing -s in hers, ours, theirs. Vietnamese has one word, 'của', for both my and mine, so expect 'This book is my.' For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('hers', 'ours', 'yours'): students copy what they hear.";

const drillFeedback =
  "Prompt, do not tell: start the sentence and pause, point to the sign card, or repeat the mistake with a rising voice and let the student fix it. For a missing -s, tap your wrist. Say every final -s and every -n't clearly yourself, and ask for the whole new sentence each time, not a single word. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

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
}): Slide {
  return {
    kind: "fluency",
    title: o.title,
    routine: "grammar drill",
    mode: "pairs",
    minutes: 7,
    goal: o.goal,
    chunks: o.chunks,
    recycle: o.recycle,
    rounds: [
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = join with because / although / so / when, T = change the tense or time, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together when you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with the -s where it belongs.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the person with the card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: give your own opinion or experience, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: round 3 has students talk about their own lives and opinions, so the form is used for meaning. Grades 6-7 can take the full set: a question, a short answer, a negative, a join with because / although / so / when, a change of time and a change of person. Keep it brisk; a drill that drags loses its point. Mark nothing in writing: this is about speed and accuracy in speech.",
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say the new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, with the + sign and a reason, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL2U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u09-l1": {
      objectives: ["I can say what I can do at home and what I can't do at school, with a reason, smoothly and without stopping."],
      drop: ["Traffic light freeze", "Slap it, say it", "Who am I? Little scenes"],
      add: [
        {
          after: "Cross out the wrong word (SB 88 B)",
          slide: {
            kind: "writing",
            title: "A person who keeps us safe: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details with a reason and an example, and the closing sentence.",
              "Plan: choose a person who helps your school or your city (a crossing guard, a security guard, a lifeguard, a librarian or a coach). Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every linking word and every can, can't or have to, and tells you one thing they liked.",
              "Teacher: look only at the -s after he or she and at the verb after can, can't and have to. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: The security guard",
              text: "The security guard is one of the most important people at my school because he keeps everyone safe. First, he checks every student's card at the gate each morning, so strangers can't walk in. He also helps younger children cross the busy road. For example, last week he stopped a bus when a little boy dropped his bag. However, some students ignore him and run through the gate, which can be dangerous. In conclusion, I think we should thank him more often, and we have to follow his rules.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who is the person, and why are they important? Use because." },
              { label: "Detail 1: First, ...", prompt: "What do they do first or every day? What can't people do because of it? Use so." },
              { label: "Example: For example, ...", prompt: "Give one real example of how they help." },
              { label: "Problem: However, ...", prompt: "What is difficult, or what do some people forget to do?" },
              { label: "Closing: In conclusion, ...", prompt: "What do you think we should do or have to do? Use should or have to." },
            ],
            frames: ["___ is one of the most important people at ___ because ___.", "First, he / she ___, so we can't ___.", "For example, ___.", "However, some people ___, which can be ___.", "In conclusion, I think we should ___."],
            checklist: [
              "Six to eight sentences: topic sentence, details with an example, closing",
              "Linking words: first, also, however, because, for example, in conclusion",
              "can, can't, have to and should are followed by the plain verb, with no -s or to after can",
              "The -s is there after he or she (checks, helps, keeps)",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "A full paragraph for grades 6-7: six to eight sentences about one person, planned in five boxes with a few words in each. The linking words (because, for example, however, in conclusion) are the new step. Say the final -s in 'checks', 'helps' and 'keeps' clearly when you read the model; many Vietnamese learners drop it. Mark only two targets and let the student find the mistake from your dot. The model is not a script: students choose their own person and use what they really know about them.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["___ is one of the most important people at ___ because ___.", "First, he / she ___, so we can't ___.", "For example, ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences, with a contrast using although or however, and a second example.", frames: ["Although ___, ___.", "However, ___."] },
            ],
          },
        },
        {
          after: "At home I can, at school I can't (SB 89 Think)",
          slide: {
            kind: "fluency",
            title: "Rule sprint: at home and at school",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 7,
            goal: "Say the whole sentence with its reason, fast and smooth, with no stops.",
            chunks: [
              "At home I can stay up late, but at school I can't, because lessons start early.",
              "At school we have to take turns, so everyone gets a chance to speak.",
              "Students can't use their phones in class, although they often want to.",
              "You shouldn't litter in the park, because it hurts the animals and spoils the view.",
              "The crossing guard helps us every morning, so the road is safe.",
            ],
            recycle: ["I think he was wrong because he was greedy.", "Did he take the money? Yes, he did, but he gave it back."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a photo card, the class says the whole sentence with the reason." },
              { seconds: 75, say: "Pairs: one shows a card, the other says a sentence and adds a reason. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many different sentences with a reason can you say?" },
            ],
            steps: [
              "Look at the photo card. Say a WHOLE sentence with a reason: 'At school I can't use my phone, because it distracts me.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers and beat your own number from round 2.",
              "Teacher: after round 1, take one minute. Put two mistakes you heard on the board (no names) and the class fixes them; then go on with rounds 2 and 3.",
            ],
            prompts: ["(photo: a phone in class)", "(photo: a student taking turns)", "(photo: a crossing guard)", "(photo: litter in a park)", "(photo: a student asleep at a desk)", "(photo: a library sign: Silence)"],
            feedback: fixRules,
            teacherNote: "Whole sentences with a reason, never single words: 'At school I can't use my phone, because it distracts me' should come out as one smooth piece. Mix in a card from Unit 8 every few turns ('I think he was ... because ...', 'Did he ...?') so last unit's past tense stays fast. Listen for 'can't' without the t sound, 'have to' without the 'to', 'take turn' without the -s and 'because' with no reason after it.",
            tiers: [
              { level: "Support", task: "Say it with a friend and point to the frames on the board.", frames: ["At home I can ___.", "At school I can't ___ because ___."] },
              { level: "Core", task: "Say the sentence with a reason, alone, without looking at the board." },
              { level: "Stretch", task: "Add a contrast: 'At school I can't use my phone, although I'd like to, because it distracts everyone.'", frames: ["At school I can't ___, although ___, because ___."] },
            ],
          },
        },
        {
          after: "Rule sprint: at home and at school",
          slide: drill({
            title: "Grammar drill: can, can't and have to",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about the real rules in your own life.",
            chunks: [
              "At home I can stay up late, but at school I can't leave the room without asking.",
              "Can you use your phone at school? No, we can't, because it distracts us in class.",
              "We have to wear a uniform, although I'd prefer my own clothes.",
              "You shouldn't run in the hallway because someone could get hurt.",
              "At my old school students could eat in the classroom, but now they can't.",
              "My sister has to be home by six, so she can't stay out late with her friends.",
            ],
            recycle: ["I think he was wrong because he was greedy.", "Did he take the money? Yes, he did."],
            prompts: ["I can use my phone in class. (X)", "We have to wear a uniform. (?)", "Students can eat in the library. (X +)", "I can stay up late. (T)", "She has to wear a helmet. (P ?)", "You shouldn't run. (+ because)"],
            real: "Real talk: tell your partner two rules you really have at home or at school, and say whether you think each one is fair, with a reason. Your partner asks one question back.",
            slips: "'She have to', 'Can you to use', 'We can not to run' or 'because' with no reason",
            support: ["I can ___ at home.", "I can't ___ at school because ___."],
            stretch: "Use a second clause and a follow-up question: 'We have to wear a uniform, although it is hot. Do you think it is fair?'",
            stretchFrames: ["___, although ___.", "Do you think it is fair?"],
          }),
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u09-l2": {
      objectives: ["I can explain a rule and why it is a good rule, with a reason and an example, faster each time."],
      drop: ["Rules chant", "Is it a rule? Green or red card", "Stand on the line: which rule is the most important?"],
      add: [
        {
          after: "Think boxes: how do rules help? (SB 91)",
          slide: {
            kind: "writing",
            title: "Rules in my place: plan, write, check",
            routine: "paragraph",
            genre: "explanation",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the two rules with reasons, the example and the closing sentence.",
              "Plan: choose your school, your home, your sports club or a public place. Fill the five boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion.",
              "Check: tick the checklist. Your partner underlines every reason and every have to or can't, and tells you one thing they liked.",
              "Teacher: look only at because (a reason must follow it) and at have to / can't. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Rules at the swimming pool",
              text: "The rules at our local swimming pool are strict, but I think they are fair because they keep everyone safe. First, we have to shower before we swim, so the water stays clean. Also, we can't run on the wet floor because someone could slip and get hurt. For example, last summer a boy fell near the deep end, and the lifeguard helped him quickly. However, some teenagers ignore the signs when they are with friends. In conclusion, rules are not there to spoil our fun, and they help us enjoy the pool together.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which place is it? Are the rules fair? Use because." },
              { label: "Rule 1: First, ...", prompt: "What do you have to do? What is the reason? Use so." },
              { label: "Rule 2: Also, ...", prompt: "What can't you do? What is the reason? Use because." },
              { label: "Example and problem: For example, ... However, ...", prompt: "Give one real example. What do some people forget?" },
              { label: "Closing: In conclusion, ...", prompt: "How do rules help people in this place?" },
            ],
            frames: ["The rules at ___ are ___, but I think they are fair because ___.", "First, we have to ___, so ___.", "Also, we can't ___ because ___.", "For example, ___. However, some people ___.", "In conclusion, rules ___."],
            checklist: [
              "Six to eight sentences: topic sentence, two rules with reasons, example, closing",
              "Linking words: first, also, however, because, for example, in conclusion",
              "have to and can't are followed by the plain verb; every because has a reason after it",
              "The -s is there on rules, signs and turns (more than one), and after he or she",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "This paragraph is the script for the recorded rule talk at home: the student reads it, then tells it faster each time. It builds on the 'because' sentences from the speaking tasks. Do the first box together on the board. The topic sentence takes a small opinion ('strict, but fair'), which is the step up from a list of rules. Mark only two targets and let the student find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["The rules at ___ are ___, but I think they are fair because ___.", "First, we have to ___, so ___.", "Also, we can't ___ because ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences, and add a rule you think is NOT fair, with a reason.", frames: ["I don't think ___ is fair because ___."] },
            ],
          },
        },
        {
          after: "Talk about it: rules in my place",
          slide: {
            kind: "fluency",
            title: "Rule talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 10,
            goal: "Give the same rule talk to three classmates. Each talk is shorter and smoother. Both partners talk in every round.",
            chunks: [
              "At my school we have to take turns, so everyone gets a chance to speak.",
              "At the pool you can't run, because the floor is wet and someone could slip.",
              "At home I have to clean up my room, although I'd rather be online.",
              "Rules help us because they keep us safe, and they make life fairer for everyone.",
            ],
            recycle: ["I think he was wrong because he was greedy.", "Did he keep the money? No, he didn't."],
            rounds: [
              { seconds: 90, say: "Partner 1: tell your rule talk. The listener counts the reasons on their fingers. Then swap, so Partner 2 gives the talk too." },
              { seconds: 70, say: "Partner 2 (a new listener): the same talk in less time. Then swap." },
              { seconds: 60, say: "Partner 3 (a new listener): fast and smooth, and add one new example. The listener says one thing they agree or disagree with. Then swap." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Both partners give the talk in every round: Partner A, then Partner B.",
            ],
            feedback: fixRules,
            teacherNote: "Same talk, less time, new listener: Nation's 4/3/2. The new partner keeps the repetition real. The one-minute fix between round 1 and round 2 is what adds accuracy; repeating alone builds speed but not correctness. Do not add new language between rounds. Listen for 'can' and 'can't' (students often make them sound alike), 'have to' without 'to', the missing -s in 'rules' and 'turns', and 'because' followed by nothing.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and give one reason.", frames: ["At my school we ___.", "At the ___ you can't ___ because ___."] },
              { level: "Core", task: "Say four or five sentences with reasons, without the board." },
              { level: "Stretch", task: "Add a reason to every rule and an opinion: 'I think it is fair, although some students disagree.'", frames: ["I think it is fair / unfair because ___.", "___, although ___."] },
            ],
          },
        },
        {
          after: "Rule talk 4-3-2: three partners",
          slide: drill({
            title: "Grammar drill: rules with because",
            goal: "Change the sentence fast and right: ask it, say no, give a reason, change the time or the person. Then give your real opinion about rules.",
            chunks: [
              "At my school we have to wear a uniform, although some students don't like it.",
              "You can't run at the pool because the floor is wet and someone could slip.",
              "Do students have to ask before they leave the room? Yes, they do, so the teacher knows where they are.",
              "If there were no rules, the hallways would be chaotic.",
              "My parents don't let me stay out late, but I understand why.",
              "At the library you shouldn't talk loudly because people are studying.",
            ],
            recycle: ["I think he was wrong because he was greedy.", "Did he keep the money? No, he didn't."],
            prompts: ["We have to wear a uniform. (?)", "You can run at the pool. (X)", "Students have to ask first. (+ so)", "I have to clean my room. (T)", "He has to help at home. (P ?)", "People talk loudly. (X + because)"],
            real: "Real talk: choose one rule from your school or home. Say what it is, whether you think it is fair, and why. Your partner agrees or disagrees with a reason.",
            slips: "'Do students has to', 'You can't to run', 'because' with no reason or 'If there was no rules'",
            support: ["We have to ___.", "You can't ___ because ___."],
            stretch: "Use a second clause and a follow-up question: 'If there were no rules, school would be chaotic, although some students would enjoy it. What do you think?'",
            stretchFrames: ["If there were no rules, ___.", "What do you think?"],
          }),
        },
      ],
      talk: {
        kind: "vlog",
        title: "My rule talk: rules help us",
        prompt: "Tell us about the rules in a place you know well: your school, your home or a club. Say what two rules are, whether you think they are fair, and why. Give an example of what could happen if people ignored a rule.",
        length: "90-120 seconds",
        steps: [
          "Choose your place and read your paragraph from class. Underline the reasons and the example.",
          "Practice your talk out loud three times, a little faster and smoother each time, like in class. Do not read it word for word.",
          "Record it once. Look at the camera and give at least two reasons and one example.",
          "Watch it once. Listen for 'have to' and 'can't', and for the reason after every 'because'. Tell someone what you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Tell us about the rules in one place, say if they are fair, and give reasons and an example. Keep talking without long stops.",
        words: ["rule", "take turns", "polite", "clean up", "litter", "swimming pool", "classroom", "fair", "safe"],
        grammar: ["At ___ we have to ___, so ___.", "At ___ you can't ___ because ___.", "For example, ___.", "If there were no rules, ___."],
        rubric: [
          { label: "Rules and opinion", description: "Describes at least two rules for one place and says whether they are fair.", weight: 3 },
          { label: "Reasons and examples", description: "Gives at least two reasons with 'because' or 'so' and an example with 'for example'.", weight: 3 },
          { label: "Can't and have to", description: "Uses can't, have to and should correctly: 'You can't run.' 'We have to clean up.'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time, without reading word for word.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["At ___ we have to ___.", "You can't ___ because ___.", "I think it is fair because ___."], tips: ["Point to your notes or a photo as you speak."] },
          { level: "Core", who: "Most students", frames: ["At ___ we have to ___, so ___.", "For example, ___.", "Rules help us because ___."], tips: ["Say two rules, two reasons and one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["If there were no rules, ___ could happen.", "I think ___ is unfair, although ___."], tips: ["Say what could happen with no rule, and give a rule you would change."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u09-l3": {
      objectives: ["I can ask 'Whose is it?' and answer with mine, yours, hers, his, ours or theirs, with a reason, fast."],
      drop: ["Run and touch: helpers and places"],
      trim: { "Listen and sing (SB 93 D)": 6, "Ask about your group's things (SB 93 E)": 8, "Walk, point and ask (SB 93 F)": 8 },
      add: [
        {
          after: "Match my to mine (SB 93 E)",
          slide: {
            kind: "writing",
            title: "Fix the owner words",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Each one has one or two mistakes!",
              "Find them: my or mine, her or hers, It's or They're, a verb that does not agree, or the word order of the question.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "This backpack is mine, but the umbrella in it are hers.", answer: "This backpack is mine, but the umbrella in it is hers." },
              { q: "Whose tickets are these? It's theirs, because Sam and Lee bought them.", answer: "Whose tickets are these? They're theirs, because Sam and Lee bought them." },
              { q: "Our team has won, so the trophy is our.", answer: "Our team has won, so the trophy is ours." },
              { q: "I like your idea, but mine idea is better.", answer: "I like your idea, but my idea is better." },
              { q: "Whose phone this is? I think it's Kim.", answer: "Whose phone is this? I think it's Kim's." },
            ],
            checklist: ["my, your, her, our, their go BEFORE a thing: my idea", "mine, yours, hers, ours, theirs go ALONE: The idea is mine.", "Whose pencils are these? They're ...", "The verb agrees with the thing: the umbrella is, the tickets are"],
            sayIt: "Say all five fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese uses one word, 'của', for both my and mine, so 'This book is my' is this class's most common slip. Fix item 1 together first, pointing at the verb that does not agree. Each sentence has one or two mistakes: keep the focus on two or three error types only: my / mine, her / hers, and They're for more than one.",
            tiers: [
              { level: "Support", task: "Fix sentences 1, 3 and 4 with the frames on the board." },
              { level: "Core", task: "Fix all five sentences." },
              { level: "Stretch", task: "Write two new sentences with a mistake for your partner to fix, using although or because.", frames: ["The ___ is mine, although ___."] },
            ],
          },
        },
        {
          after: "Fix the owner words",
          slide: drill({
            title: "Grammar drill: mine, yours, hers, theirs",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about things that really are yours and ours.",
            chunks: [
              "This is my bag, and that one on the chair is yours.",
              "Whose headphones are these? They're hers, because she left them here yesterday.",
              "These notebooks aren't mine, although they look like mine.",
              "My idea is good, but theirs is better because it's simpler.",
              "Is this charger yours? No, it's his; mine is at home.",
              "This locker is mine, but the school library belongs to everyone.",
            ],
            recycle: ["At school we have to take turns.", "Did he keep the money? No, he didn't."],
            prompts: ["This phone is mine. (?)", "That jacket is hers. (X)", "These books are ours. (+ because)", "The seat was his. (T)", "My bag is red. (P: their)", "Whose bike is this? (answer: theirs)"],
            real: "Real talk: tell your partner about two things you own and two things you share, and say how you feel about sharing, with a reason. Your partner asks 'Whose is it?' about one thing.",
            slips: "'The bag is my', 'Whose this is?', 'It's mine bag' or 'They're hers'",
            support: ["This is my ___. It's mine.", "Whose ___ is this? It's ___'s."],
            stretch: "Use a second clause and a follow-up question: 'The laptop is ours, although I use it more than my brother. Whose is the charger?'",
            stretchFrames: ["The ___ is ours, although ___.", "Whose ___ is it?"],
          }),
        },
        {
          after: "Walk, point and ask (SB 93 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Whose is it?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer with a reason, turn and ask the next classmate. Keep the chain going with no stops!",
            chunks: [
              "Whose phone is this? I think it's {s1}'s, because it has a blue case.",
              "It isn't mine, but it might be yours.",
              "Whose headphones are these? They're hers, because her name is on the case.",
              "These notebooks are ours, so we have to take care of them.",
            ],
            recycle: ["At school we have to take turns.", "I think he was wrong because he was greedy."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds one thing they can share. Answer with a reason and ask the next question." },
              { seconds: 75, say: "Swap things. Go faster, and use a different reason each time!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold a thing from your bag that you do not mind sharing.",
              "Ask the classmate on your left: 'Whose ___ is this?' (or 'Whose ___ are these?').",
              "They answer with a reason: 'It's mine, because my name is on it.' or 'It's ___'s, because ___.' Then they turn and ask the next classmate.",
              "Use 'They're' for more than one thing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Whose ___ is this?", "Whose ___ are these?", "How do you know?"],
            feedback: fixMine,
            teacherNote: "The chain makes every student ask AND answer many times in a few minutes, which is what makes 'Whose ___ is this?' automatic. The reason in every answer is the step up: students have to say how they know. Time the whole circle and tell them; students like beating their own time. Watch for 'This is whose?' (prompt with a rising voice: 'Whose ___ is this?') and 'It's mine pencils'. Use only things that nobody minds sharing.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["Whose ___ is this?", "It's mine / yours, because ___."] },
              { level: "Core", task: "Ask and answer with a reason, without looking at the board." },
              { level: "Stretch", task: "Answer with a name and a doubt, then ask a follow-up question: 'It might be {s2}'s, although I'm not sure. Is it yours?'", frames: ["It might be ___'s, although ___.", "Is it yours?"] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u09-l4": {
      objectives: ["I can say sorry and answer 'That's OK' with a reason, smoothly, and explain a rule at my house."],
      drop: ["Oops and OK", "Simon says: phrasal verbs"],
      add: [
        {
          after: "Sorry and That's OK (SB 95 E)",
          slide: {
            kind: "fluency",
            title: "Sorry and OK: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 9,
            goal: "Say the same short talk three times with a new partner, each time smoother and faster. Both partners talk in every round.",
            chunks: [
              "Is it my turn, or is it {s1}'s turn?",
              "I'm really sorry. I didn't realize it was yours, so I took it by mistake.",
              "That's all right. Don't worry about it, but please ask next time.",
              "Thanks for understanding. I'll be more careful in the future.",
            ],
            recycle: ["Whose bag is this? It's mine, because my name is on it.", "I think he was wrong because he was greedy."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A does the talk (ask about the turn, say sorry with a reason), Partner B says 'That's OK' and gives advice. Then swap, so Partner B does the talk too. Use the frames if you need them. Then change partners." },
              { seconds: 65, say: "Round 2: new partner. The same talk: Partner A, then Partner B. Try it without the frames. Then change partners." },
              { seconds: 60, say: "Round 3: new partner. Fast and sincere! Partner A, then Partner B. Use a different reason for the mistake." },
            ],
            steps: [
              "Hold a game card or a ball. One student holds it; the other asks, 'Is it my turn?'",
              "Act it out: the answer is 'No', so say sorry with a reason and the other says 'That's OK' and gives advice. In each round Partner A does the talk, then Partner B does the talk.",
              "When the bell rings, change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            feedback: fixRules,
            teacherNote: "Task repetition (Bygate): the same task with a new partner makes the speaking smoother because the meaning is already clear and the students' attention can go to the words. The voice matters here: an apology has to sound sincere, so ask students to say 'I'm really sorry' as they would to a friend. Listen for 'It's {s1} turn' without the 's, 'I sorry' (missing am) and 'Is my turn?' (missing it).",
            tiers: [
              { level: "Support", task: "Say the talk with the four frames on the board.", frames: ["Is it my turn?", "I'm sorry. I ___.", "That's OK."] },
              { level: "Core", task: "Say the talk without looking at the board, and give a reason for the mistake." },
              { level: "Stretch", task: "Add a promise and a follow-up: 'I'm really sorry, I should have asked first. I'll be more careful. Can I make it up to you?'", frames: ["I should have ___.", "Can I make it up to you?"] },
            ],
          },
        },
        {
          after: "Three rules at my house (SB 95 Write)",
          slide: drill({
            title: "Grammar drill: rules at home and sorry",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about the real rules at your house.",
            chunks: [
              "At home I have to clean my room every week, or my mom reminds me.",
              "You shouldn't talk on the phone in the library because people are studying.",
              "We can't eat in the lab, although I'm often hungry at that time.",
              "If I forget my homework, I have to stay after class.",
              "Do you have to help at home? Yes, I do, but I don't mind, because it's fair.",
              "I'm sorry I forgot, so I'll do it again tonight.",
            ],
            recycle: ["Whose bag is this? It's mine.", "Did he keep the money? No, he didn't."],
            prompts: ["I have to help at home. (?)", "You should talk in the library. (X)", "We can't use phones in class. (+ although)", "I have to cook dinner. (T)", "My brother has to wash up. (P ?)", "She is sorry. (+ because)"],
            real: "Real talk: tell your partner about two rules at your house, one you agree with and one you don't, and why. Your partner says sorry for a made-up mistake, and you answer.",
            slips: "'He have to', 'You should to talk', 'I sorry' or 'Do you has to'",
            support: ["I have to ___ at home.", "I should always ___ because ___."],
            stretch: "Use a second clause and a follow-up question: 'I have to help at home, although I'm tired, because it's fair. Do you think that's fair?'",
            stretchFrames: ["I have to ___, although ___.", "Do you think that's fair?"],
          }),
        },
        {
          after: "Grammar drill: rules at home and sorry",
          slide: {
            kind: "writing",
            title: "Grow my house rule",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the short sentence with your partner.",
              "Make it bigger: add what is in the brackets (where, when, why or a contrast).",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "Students can't use phones. (add where and why: in the library, because it's a quiet place)", answer: "Students can't use phones in the library because it's a quiet place." },
              { q: "I have to help at home. (add when and a contrast: every evening, although I'm tired)", answer: "I have to help at home every evening, although I'm tired." },
              { q: "We should say sorry. (add when and why: when we make a mistake, so people feel respected)", answer: "We should say sorry when we make a mistake, so people feel respected." },
              { q: "My brother can't play games. (add when and why: before he finishes his homework, so he can focus)", answer: "My brother can't play games before he finishes his homework, so he can focus." },
              { q: "Rules are important. (add for whom and why: for everyone, because they keep us safe)", answer: "Rules are important for everyone because they keep us safe." },
            ],
            frames: ["I can't ___ in the ___ because ___.", "I have to ___ every day, although ___.", "We should ___ when ___, so ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "can't, have to, should: the plain verb follows", "A comma before although, so and but"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence with where, when, why and a contrast gives students a way to make writing longer without a new rule. Doing it just before the Workbook writing means they already have five good sentences to start from. Focus on 'have to' (not 'have clean up'), the comma before although, so and but, and the final -s in 'rules' and 'phones'.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 5 with the frames on the board." },
              { level: "Core", task: "Do all five items, then write one big sentence of your own about your house." },
              { level: "Stretch", task: "Write two big sentences of your own, one with although and one with because, plus a should sentence.", frames: ["I can't ___ in the ___ because ___, although ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u09-l5": {
      objectives: ["I can retell the lost-and-found story with mine, hers, theirs and ours, with reasons, faster each time."],
      trim: { "Remember it!": 3 },
      drop: ["Movement break: freeze and point", "Point and say: mine, yours, ours!"],
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Lost-and-found retell: faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 9,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster. Both partners tell it in every round.",
            chunks: [
              "Someone leaves a jacket in the hallway, so we ask, 'Whose is it?'",
              "The jacket isn't mine, and it isn't yours, but it might be his.",
              "The sports bag is theirs, because their team practices here every day.",
              "In the end, we return everything, because the owner might need it.",
            ],
            recycle: ["At school we have to take turns.", "I think he was wrong because he was greedy."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the story, then Partner B tells it. Use the four picture cards. Then change partners." },
              { seconds: 65, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 60, say: "Round 3: new partner. Tell it fast, Partner A then Partner B! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the four picture cards: the jacket in the hallway, the question, the sports bag and the return.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round Partner A tells the story, then Partner B tells it. When the bell rings, change partners.",
              "The listener gives a thumbs up and says one thing the story needed (a reason, an example) if it was missing.",
            ],
            prompts: ["(picture: a jacket in a hallway)", "(picture: students asking 'Whose is it?')", "(picture: a sports bag and a team)", "(picture: a lost-and-found desk)"],
            feedback: fixMine,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free students to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what keeps the speed from costing accuracy. Keep the four picture cards on the board for Support students. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["Someone leaves a ___, so ___.", "The ___ is mine / his / hers.", "The ___ is theirs because ___."] },
              { level: "Core", task: "Tell all four parts without the frames, with a reason in each." },
              { level: "Stretch", task: "Add what people say and why returning lost things matters: 'We should return it because the owner might feel stressed, although it is only a jacket.'", frames: ["We should ___ because ___, although ___."] },
            ],
          },
        },
        {
          after: "Say it, then write: mine and ours",
          slide: drill({
            title: "Grammar drill: my or mine?",
            goal: "Change the sentence fast and right: ask it, say no, join it with a reason, change the time or the person. Then talk about what is yours and what is ours.",
            chunks: [
              "This is my phone, so it's mine, and that one is yours.",
              "Whose jacket is this? It's his, because his name is inside.",
              "Their project is better than ours, although we worked longer.",
              "I like your idea, but I prefer mine because it's simpler.",
              "Is that notebook hers? No, it isn't hers, it's mine.",
              "The class library is ours, so we have to look after it.",
            ],
            recycle: ["At school we have to take turns.", "Did he keep the money? No, he didn't."],
            prompts: ["This is my phone. (it's ...)", "Whose jacket is this? (X: not mine)", "That pen is hers. (+ because)", "The bag was theirs. (T)", "My idea is good. (P: our)", "The room is ours. (?)"],
            real: "Real talk: tell your partner what is truly yours, what is shared with your family or class, and one rule about sharing. Use my before a thing and mine, ours or theirs alone.",
            slips: "'The bag is my', 'It's mine bag', 'They're hers' or 'Whose this is?'",
            support: ["This is my ___. It's mine.", "The ___ is ours."],
            stretch: "Use a contrast and a follow-up question: 'My idea is good, although theirs is more creative. Whose idea do you prefer?'",
            stretchFrames: ["My ___ is ___, although theirs is ___.", "Whose ___ do you prefer?"],
          }),
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "Mine and ours: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the things that are mine and ours, the example and the closing sentence.",
              "Plan: fill the five boxes with a few words each: my things, our things, a problem with sharing, an example, your opinion.",
              "Write: turn your notes into one paragraph of six to eight sentences. Use first, also, however, because, for example and in conclusion. Use my before a thing and mine, hers, his or ours alone.",
              "Check: tick the checklist. Your partner underlines every my or mine and every linking word, and tells you one thing they liked.",
              "Teacher: look only at my / mine and hers / ours. Put a dot next to a line with a mistake; the student finds it and fixes it.",
            ],
            text: {
              title: "Model: Mine and ours",
              text: "In my family some things are mine and some are ours, and I think both kinds are important. First, my phone and my headphones are mine, so I decide who uses them. However, the TV in the living room is ours, which means we have to agree on a show. For example, my sister loves comedies, so on Fridays the remote is hers. Also, my class has a shared shelf, and the books on it are ours. Sharing is not always easy, although it teaches us respect. In conclusion, I like what is mine, but I enjoy what is ours more.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Which things are yours and which are shared? What do you think about them? Use and." },
              { label: "Mine: First, ...", prompt: "What is yours, and who decides? Use so." },
              { label: "Ours: However, ... For example, ... Also, ...", prompt: "What is shared? What has to be agreed? Give one example and one more shared thing." },
              { label: "Problem: Sharing is not always easy, ...", prompt: "What is difficult about sharing? Use although." },
              { label: "Closing: In conclusion, ...", prompt: "What is your opinion about mine and ours?" },
            ],
            frames: ["In my family some things are mine and some are ours, and I think ___.", "First, my ___ is mine, so ___.", "However, the ___ is ours, which means ___.", "For example, ___. Also, ___.", "Sharing is not always easy, although ___. In conclusion, I ___."],
            checklist: [
              "Six to eight sentences: topic sentence, mine, ours, example, closing",
              "my goes before a thing, mine goes alone: my phone, The phone is mine.",
              "hers, his, ours and theirs have their -s, and the verb agrees: the books are ours",
              "Linking words: first, also, however, because, for example, in conclusion",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "This paragraph is the script for the recorded talk at home, 'Mine and ours'. It replaces the dictogloss, so say the short rule first: 'my hat' and 'The hat is mine'. Vietnamese has one word, 'của', for both my and mine, so expect 'The book is my'. Say the final -s in 'hers' and 'ours' clearly. Mark only two targets and let the student find the mistake from your dot. Students write about their own lives, so do not ask for anything private.",
            tiers: [
              { level: "Support", task: "Use the first three frames and write six sentences with the frames on the board.", frames: ["In my family some things are mine and some are ours, and I think ___.", "First, my ___ is mine, so ___.", "However, the ___ is ours, which means ___."] },
              { level: "Core", task: "Write six or seven sentences, one or two for each box." },
              { level: "Stretch", task: "Write eight sentences with a contrast using although or however, and a question and answer: 'Whose idea was it? It was theirs.'", frames: ["Whose ___ is this? It's ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Mine and ours: my talk",
        prompt: "Tell us about the things in your life that are yours and the things that are shared with your family, friends or class. Say how you feel about sharing, and give a reason and an example.",
        length: "90-120 seconds",
        steps: [
          "Choose two things that are yours and two things that are ours. Read your paragraph from class and underline the reasons and the example.",
          "Practice your talk out loud three times, a little faster and smoother each time, like in class. Do not read it word for word.",
          "Record it once. Look at the camera and give at least two reasons and one example.",
          "Watch it once. Listen for my and mine, and for the reason after every 'because'. Tell someone what you did well.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what is mine, what is ours and how you feel about sharing, with reasons and an example, and keep talking without long stops.",
        words: ["mine", "yours", "hers", "his", "ours", "theirs", "take turns", "share", "belong"],
        grammar: ["This is my ___. It's mine.", "The ___ is hers / his / ours / theirs.", "Whose ___ is this? It's ___'s.", "Sharing is ___ because ___."],
        rubric: [
          { label: "My and mine", description: "Uses my before a thing and mine alone: 'This is my hat. The hat is mine.'", weight: 3 },
          { label: "Ours and others", description: "Uses ours, hers, his or theirs correctly for other owners.", weight: 2 },
          { label: "Reasons and examples", description: "Gives at least two reasons with 'because', 'so' or 'although' and an example with 'for example'.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences, for most of the time, without reading word for word.", weight: 2 },
        ],
        tiers: [
          { level: "Support", who: "Students who need the frames", frames: ["This is my ___. It's mine.", "The ___ is ours.", "I think sharing is ___ because ___."], tips: ["Hold up or point to each thing as you say it."] },
          { level: "Core", who: "Most students", frames: ["This is my ___. The ___ is mine.", "The ___ is ours, so we have to ___.", "For example, ___."], tips: ["Say two things that are yours, two that are ours, one reason and one example."] },
          { level: "Stretch", who: "Students who are ready for more", frames: ["Sharing is not always easy, although ___.", "Whose ___ is it? It's ___'s because ___."], tips: ["Talk about a problem with sharing and how you solve it, and ask a 'Whose' question."] },
        ],
      },
    },
  },
};
