import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 2, Unit 9 "Following
// Rules" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 7-8.
// Every lesson gets one fluency routine (the unit's rule talk and my / mine / ours
// said again and again as whole sentences, a little faster each round, with Unit 8's
// phrases mixed back in) and one short writing routine (say it, write it, read it
// back). Two lessons end with a recorded talk for home that repeats the class routine.
// Time comes from warm-ups, games and repeats, never from the book pages or grammar.
// All text is original.

const fixRules =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause ('At school I can't r...?'), point to the frame, or hold up a finger for the missing -s or 'to' ('I have clean up' - finger up: 'I have ___ clean up?'). Say it back with a rising voice ('We take turn?') so the child hears the gap. For a sound, just say it right and let them echo it. Say every final -s and -ed clearly yourself: children copy what they hear.";

const fixMine =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say it again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame and ask 'Is the thing after it? Or alone?' ('This is mine book' - point to 'my ___'), repeat the error with a rising voice ('The scarf is her?'), or hold up a finger for the missing -s in hers, ours, theirs. Vietnamese has one word, 'của', for both my and mine, so expect 'This book is my.' For a sound, just say it right and let them echo it. Say every final -s clearly yourself ('hers', 'ours', 'yours'): children copy what they hear.";

export const odL2U9Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l2-u09-l1": {
      objectives: ["I can say what I can do at home and what I can't do at school, smoothly, without stopping."],
      trim: { "Traffic light freeze": 3, "Slap it, say it": 3, "Who am I? Little scenes": 5 },
      add: [
        {
          after: "Cross out the wrong word (SB 88 B)",
          slide: {
            kind: "writing",
            title: "My school helper: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the helper, what she does first, what happens then, and why.",
              "Plan: choose a helper (crossing guard, librarian, lifeguard or principal). Draw or write a few words in each of the four boxes.",
              "Write: one sentence for each box. Use First, Then and because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at the -s after he or she and at full stops. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: The crossing guard",
              text: "The crossing guard is a helper at my school. First, she holds up a STOP sign. Then the cars wait, and the children cross the road. She helps us because the road is not safe. At the end, I say thank you!",
            },
            organiser: [
              { label: "Who", prompt: "Draw the helper. Who is it?" },
              { label: "First", prompt: "Draw what the helper does first." },
              { label: "Then", prompt: "Draw what happens then. Who waits? Who goes?" },
              { label: "Why", prompt: "Why does the helper help us? A few words." },
            ],
            frames: ["The ___ is a helper at my school.", "First, he / she ___.", "Then ___, and ___.", "He / She helps us because ___."],
            checklist: ["Four or five sentences: who, first, then, why", "A capital letter at the start and a full stop at the end", "helps, holds: the -s is there after he or she"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A first paragraph for seven-year-olds: four short sentences planned in four boxes, with First, Then, and and because as the joining words. Say the final -s in 'helps' and 'holds' clearly when you read the model; many Vietnamese learners drop it. Mark only two targets and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in one word in each. Draw the helper.", frames: ["The ___ is a helper at my school.", "First, he / she ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence about what you can't do without the helper: 'I can't cross the road alone.'", frames: ["I can't ___ because ___."] },
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
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: [
              "At home I can run.",
              "At school I can't run.",
              "At school we take turns.",
              "The crossing guard helps us.",
              "Please don't litter.",
            ],
            recycle: ["He took a carrot.", "Did he go to the bakery? Yes, he did."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'At home I can sing.' or 'At school I can't sing.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, take one minute. Put two mistakes you heard on the board (no names) and the class fixes them; then go on with rounds 2 and 3.",
            ],
            prompts: ["(card: run)", "(card: take turns)", "(card: crossing guard)", "(card: litter)", "(card: sing)", "(card: eat in class)"],
            feedback: fixRules,
            teacherNote: "Whole sentences only, never single words: 'At school I can't run' should come out as one smooth piece. Mix in a card from Unit 8 every few turns ('He took ...', 'Did he ...?') so last unit's past tense stays fast. Listen for 'can't' without the t sound, 'take turn' without the -s and 'At school we takes turns'.",
            tiers: [
              { level: "Support", task: "Say it with a friend and point to the frames on the board.", frames: ["At home I can ___.", "At school I can't ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'At school I can't run because I can slip.'", frames: ["At school I can't ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l2-u09-l2": {
      objectives: ["I can tell a partner a rule and why it is a good rule, faster each time."],
      trim: { "Rules chant": 3, "Is it a rule? Green or red card": 3, "Stand on the line: which rule is the most important?": 5 },
      add: [
        {
          after: "Think boxes: how do rules help? (SB 91)",
          slide: {
            kind: "writing",
            title: "Rules in my place: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to the place, the two rules and the reason.",
              "Plan: choose your school, your home or the pool. Draw or write a few words in each of the four boxes.",
              "Write: one sentence for each box. Use First, Then, and and because.",
              "Check: tick the checklist. Your partner points to every capital letter and every full stop.",
              "Teacher: look only at because and at the -s in rules and turns. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Rules in my places",
              text: "At my school we have good rules. First, we take turns, and everyone can play. Then we don't run in the classroom because we can slip. Rules help us because they keep us safe.",
            },
            organiser: [
              { label: "Place", prompt: "Draw your place. Where is it?" },
              { label: "Rule 1", prompt: "Draw the first rule. What do we do?" },
              { label: "Rule 2", prompt: "Draw the second rule. What can't we do?" },
              { label: "Why", prompt: "Why do rules help? A few words." },
            ],
            frames: ["At my ___ we have good rules.", "First, we ___.", "Then we don't ___ because ___.", "Rules help us because ___."],
            checklist: ["Four or five sentences: place, rule, rule, why", "A capital letter at the start and a full stop at the end", "The joining word is there: and, because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This paragraph is the script for the recorded rule talk at home: the child reads it, then tells it faster each time. It builds on the 'because' sentences from the speaking tasks. Do the first box together on the board. Mark only two targets and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each. Draw the rule.", frames: ["At my school we ___.", "Rules help us because ___."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence about a rule at home: 'At home I have to ___.'", frames: ["At home I have to ___."] },
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
            minutes: 8,
            goal: "Give the same rule talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "At my school we take turns.",
              "At the pool you can't run.",
              "At home I have to clean up.",
              "Rules help us because they keep us safe.",
            ],
            recycle: ["I think Bandar was not smart because he was greedy.", "He took the candy."],
            rounds: [
              { seconds: 75, say: "Partner 1: tell your rule talk. The listener counts the rules on their fingers." },
              { seconds: 60, say: "Partner 2: the same talk in less time." },
              { seconds: 45, say: "Partner 3: fast and smooth! The listener says 'Good rule!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fixRules,
            teacherNote: "Same talk, less time, new listener: Nation's 4/3/2 shrunk for seven-year-olds. The new partner keeps the repetition real. The one-minute fix between round 1 and round 2 is what adds accuracy; repeating alone builds speed but not correctness. Do not add new language between rounds. Listen for 'can' and 'can't' (children often make them sound alike), 'have to' without 'to' and the missing -s in 'rules' and 'turns'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["At my school we ___.", "At the ___ you can't ___."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a reason to every rule: 'At the pool you can't run because you can slip.'", frames: ["___ because ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My rule talk: rules help us",
        prompt: "Tell us about three rules in places you know: school, home and one more place. Say why one rule is good.",
        length: "45-90 seconds",
        steps: [
          "Choose three places and one rule for each. Draw them in three boxes if you like.",
          "Say your rule talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Look at the camera and keep going.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say three rules for three places and say why a rule is good, without long stops.",
        words: ["rule", "take turns", "polite", "clean up", "litter", "swimming pool", "classroom"],
        grammar: ["At ___ we ___. / At ___ you can't ___.", "I have to ___.", "Rules help us because ___."],
        rubric: [
          { label: "Three rules", description: "Says rules for three places, in whole sentences.", weight: 3 },
          { label: "Can't and have to", description: "Uses can't and have to correctly: 'You can't run.' 'I have to clean up.'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Because", description: "Gives a reason with 'because' for at least one rule.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["At school we ___.", "At home I ___.", "It is a good rule."], tips: ["Point to your drawing as you speak."] },
          { level: "Core", who: "Most children", frames: ["At the ___ you can't ___.", "At home I have to ___.", "Rules help us because ___."], tips: ["Say where and what in every rule."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["If there were no rules, ___ could happen.", "My favorite rule is ___ because ___."], tips: ["Say what could happen with no rule, and your favorite rule."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l2-u09-l3": {
      objectives: ["I can ask 'Whose is it?' and answer with mine, yours, hers, his, ours or theirs, fast."],
      trim: { "Run and touch: helpers and places": 3, "Listen and sing (SB 93 D)": 6, "Walk, point and ask (SB 93 F)": 8 },
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
              "Read each sentence with your partner. Something is wrong!",
              "Find it: my or mine, her or hers, It's or They're, or the word order of the question.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "This is mine book.", answer: "This is my book." },
              { q: "The red bag is her.", answer: "The red bag is hers." },
              { q: "Whose this pencil is?", answer: "Whose pencil is this?" },
              { q: "Whose pencils are these? It's mine.", answer: "Whose pencils are these? They're mine." },
            ],
            checklist: ["my, your, her, our go BEFORE a thing: my book", "mine, yours, hers, ours go ALONE at the end: The book is mine.", "Whose pencils are these? They're ..."],
            sayIt: "Say all four fixed sentences to your partner, fast.",
            teacherNote: "Vietnamese uses one word, 'của', for both my and mine, so 'This book is my' is this class's most common slip. Fix item 1 together first, pointing at the word after 'my'. Keep the focus on two or three error types only: my / mine, her / hers, and They're for more than one.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write a new sentence with a mistake for your partner to fix.", frames: ["The ___ is mine / hers / ours."] },
            ],
          },
        },
        {
          after: "Walk, point and ask (SB 93 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: Whose is it?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "Whose bag is this?",
              "It's {s1}'s.",
              "It's mine. / It's yours.",
              "Whose pencils are these?",
              "They're ours!",
            ],
            recycle: ["At school we take turns.", "He took a carrot."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds one classroom thing." },
              { seconds: 60, say: "Swap things. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold a thing from the classroom.",
              "Ask the friend on your left: 'Whose ___ is this?' (or 'Whose ___ are these?').",
              "They answer: 'It's mine.' or 'It's yours.' or 'It's ___'s.' Then they turn and ask the next friend.",
              "Use 'They're' for more than one thing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Whose ___ is this?", "Whose ___ are these?"],
            feedback: fixMine,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Whose ___ is this?' automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'This is whose?' (prompt with a rising voice: 'Whose ___ is this?') and 'It's mine pencils'. Use only classroom things that nobody minds sharing.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["Whose ___ is this?", "It's mine / yours."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Answer with a name and then the stand-alone word: 'It's {s2}'s. It's hers / his.'", frames: ["It's ___'s. It's hers / his."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l2-u09-l4": {
      objectives: ["I can say sorry and answer 'That's OK' smoothly, and tell a rule at my house."],
      trim: { "Oops and OK": 3, "Simon says: phrasal verbs": 4 },
      add: [
        {
          after: "Sorry and That's OK (SB 95 E)",
          slide: {
            kind: "fluency",
            title: "Sorry and OK: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say the same short talk three times, each time smoother and faster. Both partners talk in every round.",
            chunks: [
              "Is it my turn?",
              "No, it's {s1}'s turn.",
              "Oh! My mistake. I'm sorry.",
              "That's OK. Don't worry about it.",
            ],
            recycle: ["Whose bag is this? It's mine.", "Did he take the candy? Yes, he did."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A does the talk (ask about the turn, say sorry), Partner B says 'That's OK.' Then swap, so Partner B does the talk too. Use the frames if you need them. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. The same talk: Partner A, then Partner B. Try it without the frames. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Fast and kind! Partner A, then Partner B. Smile when you say sorry." },
            ],
            steps: [
              "Hold a game card or a ball. One child holds it; the other asks, 'Is it my turn?'",
              "Act it out: the answer is 'No', so say sorry and the other says 'That's OK.' In each round Partner A does the talk, then Partner B does the talk.",
              "When the bell rings, change partners.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            feedback: fixRules,
            teacherNote: "Task repetition (Bygate): the same task with a new partner makes the speaking smoother because the meaning is already clear and the children's attention can go to the words. The voice matters here: say 'I'm sorry' warmly. Listen for 'It's {s1} turn' without the 's, 'I sorry' (missing am) and 'Is my turn?' (missing it).",
            tiers: [
              { level: "Support", task: "Say the talk with the four frames on the board.", frames: ["Is it my turn?", "I'm sorry.", "That's OK."] },
              { level: "Core", task: "Say the talk without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'No, it's {s2}'s turn because {s2} was first.'", frames: ["No, it's ___'s turn because ___."] },
            ],
          },
        },
        {
          after: "Three rules at my house (SB 95 Write)",
          slide: {
            kind: "writing",
            title: "Grow my house rule",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add where, when or why.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I can't run. (add where: in the living room)", answer: "I can't run in the living room." },
              { q: "We clean up. (add when: every day)", answer: "We clean up every day." },
              { q: "I have to wash my hands. (add why: because I help in the kitchen)", answer: "I have to wash my hands because I help in the kitchen." },
              { q: "We take turns. (add where: in the classroom)", answer: "We take turns in the classroom." },
            ],
            frames: ["I can't ___ in the ___.", "I have to ___ every day.", "___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "can't, have to: the little word is there"],
            sayIt: "Read your big sentence to your partner, then say it again without looking.",
            teacherNote: "Expanding a bare sentence with where, when and why gives children a way to make writing longer without a new rule. Doing it just before the Workbook writing means they already have four real sentences to start from. Focus on 'have to' (not 'have clean up') and the final -s in 'turns' and 'hands'.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw the place." },
              { level: "Core", task: "Write one big sentence of your own about your house." },
              { level: "Stretch", task: "Write two big sentences and use 'because' in one.", frames: ["I can't ___ in the ___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l2-u09-l5": {
      objectives: ["I can retell the lost-and-found story with mine, hers, theirs and ours, faster each time."],
      trim: { "Remember it!": 3 },
      drop: ["Movement break: freeze and point"],
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Lost-and-found retell: faster each time",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "Pip opens the lost-and-found basket.",
              "'Whose hat is this?' 'It's mine!'",
              "The scarf is hers. The pencils are theirs.",
              "The yellow ball is ours. We take turns!",
            ],
            recycle: ["He took a carrot.", "At school we take turns."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the story, then Partner B tells it. Use the four picture cards. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 30, say: "Round 3: new partner. Tell it fast, Partner A then Partner B! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the four picture cards: basket, hat, scarf and pencils, ball.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round Partner A tells the story, then Partner B tells it. When the bell rings, change partners.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: Pip and the basket)", "(picture: hat, 'Whose is this?')", "(picture: scarf and pencils)", "(picture: the yellow ball, everyone)"],
            feedback: fixMine,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The one-minute fix between round 1 and round 2 is what keeps the speed from costing accuracy. Keep the four picture cards on the board for Support children. Accept short tellings; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["Pip opens the basket.", "The ___ is mine / hers.", "The ball is ours."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add what people say and why sharing is good: 'We share the ball because it is ours.'", frames: ["Sharing helps because ___."] },
            ],
          },
        },
        {
          after: "Grammar Champion check",
          slide: {
            kind: "writing",
            title: "Mine and ours: plan, write, check",
            routine: "paragraph",
            genre: "all about me",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the thing that is mine, the thing that is hers, and the thing that is ours.",
              "Plan: draw or write a few words in each of the four boxes: my thing, her or his thing, our thing, sharing.",
              "Write: one sentence for each box. Use my before a thing and mine, hers, his or ours alone.",
              "Check: tick the checklist. Your partner points to every my or mine and every full stop.",
              "Teacher: look only at my / mine and hers / ours. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Mine and ours",
              text: "At home I have a red scooter. It is mine. My sister has a blue book, and the book is hers. The TV is ours, but we take turns. Sharing is good because everyone is happy.",
            },
            organiser: [
              { label: "Mine", prompt: "Draw one thing that is yours. What is it?" },
              { label: "Hers / his", prompt: "Draw a thing that is your friend's or sister's." },
              { label: "Ours", prompt: "Draw a thing your family shares." },
              { label: "Sharing", prompt: "Why is sharing good? A few words." },
            ],
            frames: ["At home I have a ___. It is mine.", "My ___ has a ___, and the ___ is hers / his.", "The ___ is ours, but we take turns.", "Sharing is good because ___."],
            checklist: ["Four or five sentences: mine, hers or his, ours, sharing", "my goes before a thing, mine goes alone: my book, The book is mine.", "A capital letter at the start and a full stop at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "This paragraph is the script for the recorded talk at home, 'Mine and ours'. It replaces the dictogloss, so say the short rule first: 'my hat' and 'The hat is mine'. Vietnamese has one word, 'của', for both my and mine, so expect 'The book is my'. Say the final -s in 'hers' and 'ours' clearly. Mark only two targets and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the first and third frames and fill in one word in each. Draw the things.", frames: ["At home I have a ___. It is mine.", "The ___ is ours."] },
              { level: "Core", task: "Write four sentences, one for each box." },
              { level: "Stretch", task: "Add a fifth sentence with a question and answer: 'Whose ball is this? It is his.'", frames: ["Whose ___ is this? It is hers / his."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Mine and ours: my talk",
        prompt: "Show one thing that is yours and one thing your family shares. Say whose other things are, and how you share.",
        length: "45-90 seconds",
        steps: [
          "Choose two things that are yours and two things that are ours at home.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Record it once. Hold up each thing as you say it.",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say what is mine, what is ours and whose other things are, and keep talking without long stops.",
        words: ["mine", "yours", "hers", "his", "ours", "theirs", "take turns", "share"],
        grammar: ["This is my ___. It's mine.", "The ___ is hers / his / ours / theirs.", "Whose ___ is this? It's ___'s."],
        rubric: [
          { label: "My and mine", description: "Uses my before a thing and mine alone: 'This is my hat. The hat is mine.'", weight: 3 },
          { label: "Ours and others", description: "Uses ours, hers, his or theirs correctly for other owners.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Sharing", description: "Says how the family shares or takes turns.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___. It's mine.", "The ___ is ours."], tips: ["Hold up each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["This is my ___. The ___ is mine.", "The ___ is hers / his.", "The ___ is ours. We take turns."], tips: ["Say two things that are yours and one that is ours."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Whose ___ is this? It's ___'s.", "We share the ___ because ___."], tips: ["Ask your grown-up a 'Whose' question and say why sharing helps."] },
        ],
      },
    },
  },
};
