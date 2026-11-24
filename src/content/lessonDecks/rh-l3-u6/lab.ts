import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Reach Higher Level 3, Unit 6 "From Past to Present"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 9-10 and preparing
// for the Hanoi grade-6 entrance exam. Every lesson gets one fluency routine (the
// lesson's exam grammar said again and again as whole sentences, with Unit 5's phrases
// mixed back in) and one writing routine (sentence combining, fix it, dictogloss and
// so on, in the formats of the papers, ending with a spoken step). Every other lesson
// ends with a recorded talk for home. Time comes from the speaking slides' repeats and
// the shorter interview slots, never from the book pages, grammar or exam slides.
// All text is original.

const tail =
  " Say every final -s and -ed clearly yourself: Vietnamese learners often drop them, and children copy what they hear. Never stop a child in the middle of a turn; note the mistakes and fix them in the one-minute stop.";

const fixMove =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them (start the phrase and pause, point to the frame, hold up a finger for the missing word, or repeat the error with a rising voice). For a sound, just say it right and let them echo it.";

const homeNote =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const rhL3U6Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "rh-l3-u6-l1": {
      objectives: ["I can use I / me / myself and he / him / himself correctly, fast, in whole sentences."],
      add: [
        {
          after: "Subject, object and reflexive pronouns",
          slide: {
            kind: "writing",
            title: "Fix the pronoun slips",
            routine: "fix it",
            mode: "pairs",
            minutes: 7,
            steps: [
              "Read each sentence with your partner. There is one pronoun mistake in each.",
              "Underline the wrong word and write the right one.",
              "Check the two sentences with 'and': which pronoun goes before the verb, and which goes after for or to?",
              "Read your fixed sentences aloud together.",
              "Plan for 30 seconds, then write 3 sentences about something your family made or did together. Use me, us, him or her once, and by + himself, herself or ourselves once. Check with the list.",
            ],
            items: [
              { q: "Me and my cousin visited Hội An.", answer: "My cousin and I visited Hội An." },
              { q: "Grandpa gave the old drum to my brother and I.", answer: "Grandpa gave the old drum to my brother and me." },
              { q: "He made the kite by hisself.", answer: "He made the kite by himself." },
              { q: "We cooked the sticky rice ourself.", answer: "We cooked the sticky rice ourselves." },
            ],
            frames: ["___ and I + verb", "for / to ___ and me", "by + himself / herself / ourselves / themselves"],
            checklist: [
              "Before the verb: 'My cousin and I'. After for or to: 'my cousin and me'.",
              "One person: -self. More than one person: -selves.",
              "A capital letter at the start and a full stop at the end",
            ],
            sayIt: "Read each fixed sentence aloud, then close the page and say it again without looking.",
            teacherNote:
              "'Me and my cousin' and 'by hisself' are common slips for Vietnamese learners and good material for error-correction items. Two to three error types at a time is plenty: here it is 'and I / and me' and -self / -selves. Fix item 1 together first and say the rule in one line. The four fixes take about three minutes; the rest is the short plan-write-check paragraph.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the frames, then say them to a friend." },
              { level: "Core", task: "Fix all four sentences, say them without looking, then write your 3 sentences." },
              { level: "Stretch", task: "Write two sentences of your own with a mistake in each for your partner to fix." },
            ],
          },
        },
        {
          after: "Exam practice: pronouns",
          slide: {
            kind: "fluency",
            title: "Pronoun sprint: who did what to whom?",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say each whole sentence fast and smooth with the right pronoun.",
            chunks: [
              "My cousin and I made lanterns, and we gave one to her.",
              "She taught us the song, and we sang it for her.",
              "He made the kite by himself.",
              "Listen to him! He learned it from his father.",
              "We cooked the sticky rice ourselves.",
            ],
            recycle: ["It was so cold that the water froze.", "While I was cooking, Dad was washing up.", "The bone was found by a young girl."],
            rounds: [
              { seconds: 60, say: "Together: the teacher shows a card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences can you say without a stop?" },
            ],
            steps: [
              "Look at the card (who, what, to whom). Say a WHOLE sentence with the right pronoun.",
              "Listen for the clap: it means swap or change partner.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: between rounds 1 and 2, stop for one minute. Write two pronoun mistakes you heard on the board (no names) and the class fixes them. Then go on with round 2 using the fixed sentences.",
            ],
            prompts: [
              "(card: my cousin and I / make lanterns / give one to Grandma)",
              "(card: Grandma / teach / us a song)",
              "(card: he / make a kite / alone)",
              "(card: we / cook rice / with no help)",
            ],
            feedback:
              fixMove +
              " Example: a child says 'me and my cousin made lanterns'. Hold up two fingers, say 'My cousin and ...?' and pause. For 'by hisself', point to himself on the board and let the child say it again. Mix in one recycle sentence every few turns." +
              tail,
            teacherNote:
              "Whole sentences, never single words: 'my cousin and I made lanterns, and we gave one to her' is one smooth piece. Pronoun choice becomes automatic only when children say these sentences many times in a short time. Listen for 'me and my cousin', 'by hisself' and a dropped -s on 'lanterns'.",
            tiers: [
              { level: "Support", task: "Point to the pronoun chart and say the sentence with a friend.", frames: ["She taught ___ the song.", "He made it by ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the chart." },
              { level: "Stretch", task: "Add a because: 'She taught us the song because she wanted us to keep it.'", frames: ["___ because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "rh-l3-u6-l2": {
      objectives: ["I can check facts with a tag question and ask politely: 'Can you tell me where it is?'"],
      add: [
        {
          after: "Question tags and indirect questions",
          slide: {
            kind: "writing",
            title: "Join them politely",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two parts. Make ONE polite question.",
              "Say it first, then write it. Watch the word order after where, what time and if.",
              "Read your question aloud, then close the page and say it again.",
            ],
            items: [
              { q: "Where is the market? Can you tell me ...", answer: "Can you tell me where the market is?" },
              { q: "What time does the show start? Do you know ...", answer: "Do you know what time the show starts?" },
              { q: "Is the museum open today? Could you tell me ... (if)", answer: "Could you tell me if the museum is open today?" },
              { q: "She plays the drum. (add a tag)", answer: "She plays the drum, doesn't she?" },
            ],
            frames: ["Can you tell me where ___ is?", "Do you know what time ___ starts?", "___ is old, isn't it?"],
            checklist: [
              "After 'tell me' or 'know' the order is a statement: where the market IS, not where IS the market",
              "No do / does after the question word: what time it starts",
              "A question mark at the end",
            ],
            sayIt: "Read each question aloud to your partner, who answers it. Then ask it again without looking.",
            teacherNote:
              "Sentence combining is a well-studied routine for children's writing: it teaches the new word order through use. Vietnamese learners keep the direct-question order ('where is the museum'), so the checklist names it. Do item 1 together and show how 'is' moves to the end.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two new polite questions about your town for a visitor, one with 'if'." },
            ],
          },
        },
        {
          after: "Interview a musician from a region",
          slide: {
            kind: "fluency",
            title: "Question chain: check it, then ask it",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Check a fact with a tag, then ask a polite question, round the circle with no stops.",
            chunks: [
              "Water puppetry is very old, isn't it?",
              "She plays the drum, doesn't she?",
              "You weren't there, were you?",
              "Can you tell me where the market is?",
              "Do you know if it is open?",
            ],
            recycle: ["It took us an hour to clean up.", "The bone was found by a young girl.", "If you heat ice, it melts."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Each child holds a place or heritage card." },
              { seconds: 75, say: "Swap cards. Go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle with your card. Say a tag question about your friend's card: 'It's a very old song, isn't it?'",
              "Your friend answers 'Yes, it is.' or 'No, it isn't.' Then your friend asks the next friend: 'Can you tell me where ___ is?'",
              "Listen: the tag must match the verb (is / isn't, does / doesn't).",
              "Teacher: between rounds 1 and 2, stop for one minute. Fix two mistakes you heard on the board (no names). Then go on with round 2.",
            ],
            prompts: ["(card: ca trù)", "(card: the water puppet theater)", "(card: a nón lá)", "(card: the old market)"],
            feedback:
              fixMove +
              " Example: a child says 'She likes music, isn't she?' Say 'She likes music, ...?' and stop, then show two fingers for does + n't. For 'where is the museum' point to the frame and say 'where the museum ...?'" +
              tail,
            teacherNote:
              "The chain makes every child ask and answer many times in a few minutes, which is what makes the tag and the indirect word order automatic. Time the whole circle and tell them: children love beating their own time. Watch for the tag that copies the wrong auxiliary and for 'where is the museum'.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and ask one question each turn.", frames: ["___ is old, isn't it?", "Can you tell me where ___ is?"] },
              { level: "Core", task: "Ask a tag and a polite question without the board." },
              { level: "Stretch", task: "Use a negative sentence with a positive tag, and a question with 'whether'.", frames: ["You haven't ___, have you?", "Do you know whether ___?"] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A polite visitor",
        prompt:
          "You are a visitor in a Vietnamese town with a famous tradition. Talk to a guide (a grown-up or a toy): check three facts with tag questions and ask three polite questions.",
        length: "60-120 seconds",
        steps: [
          "Choose a tradition or place you know: a festival, a market, a type of music.",
          "Say your questions three times to a grown-up or a toy, each time a little faster and smoother, like in class.",
          "Record it once. Look at the camera and ask like a polite visitor.",
          homeNote,
        ],
        maxSeconds: 180,
        kidSummary: "Check facts with tag questions, ask polite questions with the right word order, and keep talking without long stops.",
        words: ["tradition", "festival", "perform", "heritage", "musician", "region"],
        grammar: ["Tag questions: It's old, isn't it?", "Can you tell me where ___ is?", "Do you know if ___?"],
        rubric: [
          { label: "Tag questions", description: "Checks facts with tags that match the verb: It's old, isn't it? She plays, doesn't she?", weight: 3 },
          { label: "Polite questions", description: "Uses 'Can you tell me ...' and 'Do you know ...' with the statement word order.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 2 },
          { label: "Clear endings", description: "The final -s and the n't can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ is old, isn't it?", "Can you tell me where ___ is?"], tips: ["Say two questions, slowly and clearly."] },
          { level: "Core", who: "Most children", frames: ["___ plays ___, doesn't she?", "Can you tell me how ___?", "Do you know if ___?"], tips: ["Ask three tags and three polite questions."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["You haven't ___ before, have you?", "Could you tell me whether ___?", "I am ___, aren't I?"], tips: ["Add a negative tag, and thank the guide at the end."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "rh-l3-u6-l3": {
      objectives: ["I can tell how a tradition changed with 'used to', the past and 'has / have'."],
      add: [
        {
          after: "used to, past simple and present perfect for traditions",
          slide: {
            kind: "writing",
            title: "Dictogloss: the river and the rice",
            routine: "dictogloss",
            mode: "groups",
            minutes: 7,
            steps: [
              "Rule reminder (30 seconds): used to = a habit in the past; past simple = a finished time (in 1998); has / have + for / since = it continues now.",
              "Listen to the text once. Just listen.",
              "Listen again and write key words: used to, didn't use to, 1998, since, still.",
              "In your group, rebuild the text. It does not have to be word for word, but the grammar must be right.",
              "Open the text and compare. Circle every verb you got right.",
              "Plan and write 3 sentences about a family tradition that changed: one with used to, one with a year, one with since. Check with the list.",
            ],
            text: {
              title: "The river and the rice",
              text: "When my grandmother was a girl, she used to walk to the river every morning to wash rice. She didn't use to have a machine. In 1998 her village built a well, so the long walk stopped. She has lived in the same house since then, and she still washes the rice by hand because she likes the cool water.",
            },
            frames: ["When ___ was young, ___ used to ___.", "She didn't use to ___.", "In ___, ___. She has ___ since then."],
            checklist: [
              "didn't use to + the BASE verb (use, not used, after didn't)",
              "A finished time (in 1998) = past simple, not 'has built'",
              "has / have + past participle with since or for",
            ],
            sayIt: "Read your group's text aloud, then tell it to another group without looking at the page.",
            teacherNote:
              "Dictogloss (after a short rule reminder) is a recognised routine for children: they notice the grammar in a whole text and then rebuild it. Read at natural speed, twice, with clear final -s and -ed. Watch for 'didn't used to' and 'has built in 1998', two very common slips in exam error-correction items.",
            tiers: [
              { level: "Support", task: "Write the key words and use the frames to rebuild two sentences." },
              { level: "Core", task: "Rebuild all of the text with your group." },
              { level: "Stretch", task: "Rebuild it, then add one more sentence about what has changed since then." },
            ],
          },
        },
        {
          after: "Then and now: an interview with a grandparent",
          slide: {
            kind: "fluency",
            title: "Retell: then and now, three times",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same then-and-now story three times. Each time it is shorter, smoother and faster.",
            chunks: [
              "My grandfather used to fly kites every evening.",
              "He didn't use to have a phone.",
              "He learned to make kites in 1965.",
              "He has made kites since he was ten.",
              "He still makes one every Tết.",
            ],
            recycle: ["The bone was found by a young girl.", "While I was cooking, Dad was washing up.", "It was so hot that the butter melted."],
            rounds: [
              { seconds: 90, say: "Tell your partner the story of a grandparent's tradition. Use the picture ladder (then, 1965, since then, now)." },
              { seconds: 75, say: "New partner. Tell it again in less time." },
              { seconds: 60, say: "New partner. Tell it fast and smooth! Thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the picture ladder: then (used to), a year (past simple), since then (has / have), now (still).",
              "The listener has a job: tick each tense on the ladder when you hear it, then ask ONE follow-up question: 'Did he use to ...?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on with rounds 2 and 3.",
              "In round 3, finish with the sentence 'He still ...'.",
            ],
            prompts: ["(picture: boy with a kite, long ago)", "(picture: 1965, a first handmade kite)", "(picture: many kites, years later)", "(picture: Tết today)"],
            feedback:
              fixMove +
              " Example: a child says 'He used to flying kites' or 'He has made kites in 1965'. Say 'He used to ...?' and wait, or hold up one finger and ask 'Finished time or since?' so the child chooses the past simple." +
              tail,
            teacherNote:
              "Retelling the same story is classic fluency work: the second and third tellings free the child to speak faster because they are not searching for words. Retelling by itself may not make it more accurate, so the one-minute fix between rounds 1 and 2 matters most. Listen for 'used to + base verb', the finished-time past and since.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["He used to ___.", "In ___, he ___.", "He has ___ since ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add why it changed and what stayed: 'It changed because ___, but he has always ___.'", frames: ["It changed because ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "rh-l3-u6-l4": {
      objectives: ["I can say who made it and where it was born with 'was / were + made by'."],
      add: [
        {
          after: "The past passive and non-defining relative clauses",
          slide: {
            kind: "writing",
            title: "Model: a keeper of tradition",
            routine: "model, then write",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Find every was / were + past participle.",
              "Plan in 30 seconds: who, born where and when, taught by whom, what was made.",
              "Write 4 sentences about your keeper with the frames, as one short paragraph.",
              "Check with the list, then read it aloud.",
            ],
            text: {
              title: "Aunt Thu, the singer",
              text: "Aunt Thu was born in a small village near Huế in 1950. She was taught to sing by her grandmother. Her songs, which are very old, were recorded in 1985. Today they are played on the radio, and young people love them too.",
            },
            frames: ["___ was born in ___ in ___.", "He / She was taught ___ by ___.", "The ___, which ___, were / was ___ in ___."],
            checklist: [
              "was / were + past participle (was born, were recorded). Never 'She born'.",
              "One thing: was. More than one thing: were (the songs were recorded)",
              "A comma before and after the 'which' part",
            ],
            sayIt: "Read your sentences aloud, then tell your keeper's story to a partner without looking.",
            teacherNote:
              "Modelled writing works because children see the whole shape first. 'Was born' is always passive and Vietnamese learners often say 'born' alone, so point at it in the model. Keep the keeper made up or from the class's own project, never a real child.",
            tiers: [
              { level: "Support", task: "Copy the first two sentences and change the place and the year." },
              { level: "Core", task: "Write four sentences about your own keeper." },
              { level: "Stretch", task: "Write five sentences and add a 'which' clause with commas." },
            ],
          },
        },
        {
          after: "Generalize: how traditions survive",
          slide: {
            kind: "fluency",
            title: "Museum label: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same museum label three times to new partners. Each time it is smoother.",
            chunks: [
              "The drum was made by hand.",
              "The masks were painted by the villagers.",
              "She was born in a small village.",
              "The festival, which is very old, was started by farmers.",
              "Was it recorded in Hanoi? Yes, it was.",
            ],
            recycle: ["The baby mammoth was kept in ice for a very long time.", "It was such a hot day that the road felt soft.", "If you heat ice, it melts."],
            rounds: [
              { seconds: 90, say: "Choose an object card. Tell your partner 3 label sentences about it." },
              { seconds: 75, say: "New partner. The same label, with the same card." },
              { seconds: 60, say: "New partner. The same label, fast and smooth! Do not stop." },
            ],
            steps: [
              "Take an object card (a drum, a mask, a lantern). Say 3 label sentences with was / were + a past participle.",
              "The listener has a job: count the was / were sentences and give a thumbs up for each good one.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on with rounds 2 and 3.",
              "In round 3, add one 'which' sentence if you can.",
            ],
            prompts: ["(card: a drum / made by hand)", "(card: masks / painted by villagers)", "(card: a singer / born in a village)", "(card: a festival / started by farmers)"],
            feedback:
              fixMove +
              " Example: a child says 'The drums was made by hand' or 'My father born in 1985'. Hold up two fingers for 'drums ... were?' and pause, or say 'He was ...?' and wait for 'born'." +
              tail,
            teacherNote:
              "Task repetition is a well-researched way to build speed: the same task, a new listener, less time. Watch for was / were agreement, a missing 'was' before born, and a dropped -ed on the participle (paint, start). The fix between rounds 1 and 2 is where accuracy improves.",
            tiers: [
              { level: "Support", task: "Say two label sentences with the frames.", frames: ["The ___ was made by ___.", "The ___ were ___ by ___."] },
              { level: "Core", task: "Say three label sentences without the board." },
              { level: "Stretch", task: "Add a 'which' clause: 'The drum, which is very old, was made by hand.'", frames: ["The ___, which ___, was ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A keeper of tradition",
        prompt:
          "Tell us about a person, a place or an object that keeps a Vietnamese tradition alive. Say where it was born or made, who it was made by, and why it matters.",
        length: "60-120 seconds",
        steps: [
          "Choose a person, a place or an object (a grandparent, a village, a drum or a lantern).",
          "Say your talk three times to a grown-up or a toy, each time a little faster and smoother.",
          "Record it once. Use was / were in your sentences.",
          homeNote,
        ],
        maxSeconds: 180,
        kidSummary: "Say who or what it is, where it was born or made and by whom, and keep talking without long stops.",
        words: ["tradition", "heritage", "craft", "village", "recorded", "taught"],
        grammar: ["was / were + past participle", "She was born in ___.", "The ___, which ___, was ___."],
        rubric: [
          { label: "Past passive", description: "Uses was / were + past participle correctly: was born, were made by hand.", weight: 3 },
          { label: "Facts in order", description: "Says where, when and by whom, in an order the listener can follow.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -s and -ed (made, painted, started) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ was born in ___.", "It was made by ___."], tips: ["Hold the object or a picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ was born in ___ in ___.", "He / She was taught ___ by ___.", "It was ___ in ___."], tips: ["Say three facts about the same person or object."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___, which ___, was ___.", "This tradition has survived because ___."], tips: ["Add a 'which' clause and say why it survives."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "rh-l3-u6-l5": {
      objectives: ["I can teach a craft with First, Next, Don't and Finally, in a clear, steady voice."],
      add: [
        {
          after: "Imperatives, sequencing and word-building prefixes",
          slide: {
            kind: "writing",
            title: "Grow the instruction",
            routine: "expand it",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the short instruction. Add the words in the brackets.",
              "Put the sequence word at the start, with a comma.",
              "Write the bigger instruction, then read it aloud.",
              "Plan and write your own 4-step instruction for a craft or a food you know (First, Next, Don't, Finally). Check with the list.",
            ],
            items: [
              { q: "Fold the paper. (add: First, carefully)", answer: "First, fold the paper carefully." },
              { q: "Cut the wood. (add: Then, slowly)", answer: "Then, cut the wood slowly." },
              { q: "Tie the string. (add: After that, tightly)", answer: "After that, tie the string tightly." },
              { q: "Wash your hands. (add: Before you start, with soap)", answer: "Before you start, wash your hands with soap." },
            ],
            frames: ["First, ___ the ___.", "Make sure you ___.", "Don't ___, or ___."],
            checklist: [
              "Start with the verb: Cut, not You cut",
              "Don't + verb (not You don't + verb)",
              "A sequence word and a comma at the start: First, ... Finally, ...",
            ],
            sayIt: "Read your instructions aloud like a teacher, then say them to a partner who does the actions.",
            teacherNote:
              "Expanding a bare sentence teaches children to add detail without losing control of grammar. The two slips to listen for are 'You don't touch ...' for a warning and a sequence word used twice (First ... First ...) when the order is muddled. Do item 1 together and let the partner mime the actions: they know at once whether it is clear.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all four items, then write your own 3 steps." },
              { level: "Stretch", task: "Write a 3-step instruction for a craft of your own with First, Next, Finally and one Don't." },
            ],
          },
        },
        {
          after: "How to make bánh chưng: teach the class",
          slide: {
            kind: "fluency",
            title: "Teach it 4-3-2: first, next, finally",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 6,
            goal: "Teach the same craft to three partners. Each time it is shorter, smoother and faster.",
            chunks: [
              "First, wash the leaves.",
              "Next, put the rice in the middle.",
              "Make sure you wrap it tightly.",
              "Don't forget to tie it.",
              "Finally, cook it for ten hours.",
            ],
            recycle: ["It took us an hour to clean up.", "If you heat ice, it melts.", "Salt water freezes more slowly than fresh water."],
            rounds: [
              { seconds: 90, say: "Partner 1: teach your craft. The listener mimes each step and counts the sequence words." },
              { seconds: 75, say: "New partner: the same lesson in less time." },
              { seconds: 60, say: "New partner: fast and smooth! The listener says 'Well done!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A teaches first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B teaches next with the same three rounds.",
            ],
            feedback:
              fixMove +
              " Example: a child says 'You don't touch the pot!' Say 'Don't ...?' and pause, or point to the frame. For a muddled order ('Finally, first ...'), hold up one finger and say 'Which step is this?'" +
              tail,
            teacherNote:
              "Same lesson, less time, new listener: the 4/3/2 activity for ten-year-olds. The new partner keeps the repetition real, and the shorter time frees them to speak faster. The talk improves in fluency but not in accuracy on its own, so the one-minute fix after round 1 is the key step. Listen for sequence words, 'Make sure you ...' and the imperative without a subject.",
            tiers: [
              { level: "Support", task: "Teach three steps with the sequence words.", frames: ["First, ___.", "Next, ___.", "Finally, ___."] },
              { level: "Core", task: "Teach four or five steps and add 'Make sure you ...'." },
              { level: "Stretch", task: "Add a warning and a reason: 'Don't rush, or the leaves will tear.'", frames: ["Don't ___, or ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "rh-l3-u6-l6": {
      objectives: ["I can say 'These are mine, those are hers' and 'It was so tall that ...' fast and right."],
      add: [
        {
          after: "Demonstratives, possessive pronouns and so / such ... that",
          slide: {
            kind: "writing",
            title: "So or such? Join them",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences. Join them with so ... that or such ... that. (For the last item, use the word in brackets instead.)",
              "Say it first, then write it. Check: so + adjective, such + a / an + adjective + noun.",
              "Read your sentence aloud, then say it again without looking.",
            ],
            items: [
              { q: "The pole was tall. We looked straight up. (so ... that)", answer: "The pole was so tall that we looked straight up." },
              { q: "It was a loud drum. We covered our ears. (such ... that)", answer: "It was such a loud drum that we covered our ears." },
              { q: "The story was long. I fell asleep. (so ... that)", answer: "The story was so long that I fell asleep." },
              { q: "The carving belongs to my sister. (hers)", answer: "The carving is hers." },
            ],
            frames: ["It was so ___ that ___.", "It was such a ___ ___ that ___.", "This ___ is mine; that ___ is hers."],
            checklist: [
              "so + adjective (so tall); such + a / an + adjective + noun (such a tall pole)",
              "this / that for one, these / those for more than one",
              "mine, yours, hers, ours, theirs have no noun after them, and no apostrophe",
            ],
            sayIt: "Say each joined sentence aloud to your partner with strong feeling, then say it again without looking.",
            teacherNote:
              "Sentence combining makes the result clause feel natural before the rule is named. 'It was so a long story' and 'her's' are the two slips to catch. Do item 1 together and cross out the second sentence's subject as you join.",
            tiers: [
              { level: "Support", task: "Do items 1 and 4 with the frames." },
              { level: "Core", task: "Do all four items." },
              { level: "Stretch", task: "Write two of your own: one with so, one with such, about a place in Vietnam." },
            ],
          },
        },
        {
          after: "Museum guides: our class totem",
          slide: {
            kind: "fluency",
            title: "Pole sprint: this, that, mine, so tall",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 5,
            goal: "Say each whole sentence fast and smooth, with the right this / that and mine / hers.",
            chunks: [
              "These carvings are theirs; those are ours.",
              "Whose drum is this? It's hers.",
              "That idea is mine, and this one is yours.",
              "The pole was so tall that we looked straight up.",
              "It was such a tall pole that we looked straight up.",
            ],
            recycle: ["It was so hot that the butter melted.", "The bone was found by a young girl.", "Salt water freezes more slowly than fresh water."],
            rounds: [
              { seconds: 60, say: "Together: the teacher points near or far, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one points to an object card, the other says the sentence. Swap at the clap." },
              { seconds: 60, say: "New partner. Faster! How many sentences without a stop?" },
            ],
            steps: [
              "Look at the card: near or far, one or many, whose? Say a WHOLE sentence.",
              "Listen for the clap: it means swap or change partner.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: between rounds 1 and 2, stop for one minute. Write two mistakes you heard on the board (no names) and the class fixes them. Then go on with round 2 using the fixed sentences.",
            ],
            prompts: ["(card: two masks, near, ours)", "(card: three drums, far, theirs)", "(card: a lantern, near, hers)", "(card: a very tall pole)"],
            feedback:
              fixMove +
              " Example: a child says 'This books are mine' or 'That pen is her's'. Hold up two fingers and say 'These ...?' and pause, or point to the chart and say 'hers' with a clear final -s." +
              tail,
            teacherNote:
              "This sprint mixes four small grammar points in whole sentences, so the choice of this / these and mine / hers becomes automatic. Watch for a dropped -s in 'these carvings' and 'theirs', and for 'so a' where the child needs 'such a'.",
            tiers: [
              { level: "Support", task: "Point to the chart and say the sentence with a friend.", frames: ["This is ___.", "These are ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the chart." },
              { level: "Stretch", task: "Add a result: 'This pole is so tall that we need a ladder!'", frames: ["___ is so ___ that ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Whose is it? A tour of my room",
        prompt:
          "Give a tour of three things at home. Say which are yours and which belong to someone else. Say one thing that is so big, so old or so special that you remember it.",
        length: "60-120 seconds",
        steps: [
          "Choose three or four things at home and put them near and far.",
          "Practise your tour three times, each time a little faster and smoother, like in class.",
          "Record it once. Point to each thing as you say this, that, these or those.",
          homeNote,
        ],
        maxSeconds: 180,
        kidSummary: "Say this / that / these / those, say whose it is (mine, hers, ours), and use so ... that once. Keep going without long stops.",
        words: ["carving", "lantern", "drum", "belong", "tall", "special"],
        grammar: ["this / these, that / those", "mine, yours, his, hers, ours, theirs", "so + adjective + that"],
        rubric: [
          { label: "Possessive pronouns", description: "Says whose it is with mine, yours, hers, ours or theirs, with no apostrophe or noun after.", weight: 3 },
          { label: "This, that, these, those", description: "Matches one or many, near or far.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "so ... that", description: "Uses so or such with a result at least once.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is mine.", "That is hers."], tips: ["Touch each thing as you speak."] },
          { level: "Core", who: "Most children", frames: ["These ___ are mine, and those ___ are ___.", "Whose ___ is this? It's ___."], tips: ["Say something about three things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It's so ___ that ___.", "It's such a ___ ___ that ___."], tips: ["Add a so ... that and a such ... that sentence."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 7
    "rh-l3-u6-l7": {
      objectives: ["I can report what someone asked or told me: 'She asked me where I lived.'"],
      trim: { "Hold the interview": 8, "Draft and edit the interview": 23 },
      add: [
        {
          after: "Reported questions and commands (stretch)",
          slide: {
            kind: "writing",
            title: "Fix the reported sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 4,
            steps: [
              "Read each reported sentence with your partner. Something is wrong.",
              "Find it: word order, if, or to / not to.",
              "Write the right sentence. Read it aloud together.",
            ],
            items: [
              { q: "She asked me where did I live.", answer: "She asked me where I lived." },
              { q: "He asked me do I like music.", answer: "He asked me if I liked music." },
              { q: "The teacher told us don't talk.", answer: "The teacher told us not to talk." },
            ],
            frames: ["She asked me where I ___ (past).", "He asked me if I ___.", "told us not to ___"],
            checklist: [
              "After asked, the word order is a statement: where I lived, not where did I live",
              "Yes / no question: asked + if, with the verb one tense back",
              "told + person + (not) to + verb",
            ],
            sayIt: "Say each fixed sentence aloud, then close the page and say it again without looking.",
            teacherNote:
              "Reported speech is a stretch point, so keep it short: two to three error types only. Vietnamese learners keep the direct-question word order and often drop 'if' ('asked me do I like'). Fix item 1 together and show the tense stepping back.",
            tiers: [
              { level: "Support", task: "Fix items 1 and 3 with the frames." },
              { level: "Core", task: "Fix all three sentences." },
              { level: "Stretch", task: "Report two questions you were asked in the interview today." },
            ],
          },
        },
        {
          after: "Hold the interview",
          slide: {
            kind: "fluency",
            title: "Report chain: she asked me ...",
            routine: "question chain",
            mode: "groups",
            minutes: 5,
            goal: "Ask, answer and then report what was asked, round the group with no stops.",
            chunks: [
              "She asked me where I lived.",
              "He asked if I liked ca trù.",
              "She told us not to touch the puppets.",
              "She asked us to listen.",
              "I asked her when she had first heard the tale.",
            ],
            recycle: ["Can you tell me where the market is?", "Water puppetry is very old, isn't it?", "He still makes one every Tết."],
            rounds: [
              { seconds: 75, say: "In threes: A asks B a question, B answers, C reports what A asked." },
              { seconds: 60, say: "Swap jobs. Faster!" },
              { seconds: 60, say: "Swap again. How many reports can your group say without a stop?" },
            ],
            steps: [
              "In threes. A asks B one question from the card. B answers. C says: 'A asked B ...'.",
              "Check: the verb steps back one tense (live → lived), with no do / did after the question word.",
              "Teacher: after round 1, stop for one minute. Fix two mistakes you heard on the board (no names), then go on.",
            ],
            prompts: ["(card: where / live)", "(card: if / like ca trù)", "(card: tell / not touch)", "(card: ask / listen)"],
            feedback:
              fixMove +
              " Example: a child says 'She asked me where did I live'. Say 'She asked me where I ...?' and pause, or point to the frame. For a dropped if, hold up a finger and say 'He asked ...?'" +
              tail,
            teacherNote:
              "Reporting what someone asked is hard to make automatic with writing alone; saying it in a chain, three roles, many turns, builds the order fast. Watch for the direct-question order and the missing -ed on lived and liked.",
            tiers: [
              { level: "Support", task: "Report with the frames on the board.", frames: ["___ asked ___ where ___ lived.", "___ told ___ to ___."] },
              { level: "Core", task: "Report without the board." },
              { level: "Stretch", task: "Report a request and a command in one turn.", frames: ["She asked us to ___, and told us not to ___."] },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 8
    "rh-l3-u6-l8": {
      objectives: ["I can say why a tradition is worth keeping, with 'It's important to ...' and '-ing' as a subject."],
      add: [
        {
          after: "-ing as a subject, It's important to ..., It's worth -ing",
          slide: {
            kind: "writing",
            title: "Grow the opinion",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the short sentence. Add the words in brackets.",
              "Keep the -ing part as the subject, and use a singular verb.",
              "Write the bigger sentence, then read it aloud.",
            ],
            items: [
              { q: "Cooking takes time. (add: traditional food, a long)", answer: "Cooking traditional food takes a long time." },
              { q: "It's important to listen. (add: to our grandparents' stories)", answer: "It's important to listen to our grandparents' stories." },
              { q: "It's worth visiting. (add: the old town, once)", answer: "It's worth visiting the old town once." },
            ],
            frames: ["___-ing ___ takes ___.", "It's important to ___.", "It's worth ___-ing."],
            checklist: [
              "-ing as a subject: Making lanterns IS fun, not 'Make lanterns is' or 'are'",
              "It's important to + verb; It's worth + verb-ing (not worth to)",
              "A capital letter and a full stop",
            ],
            sayIt: "Read your sentences aloud like an opinion, then say them to a partner without looking.",
            teacherNote:
              "Expanding is a gentle route to longer, more accurate opinion sentences. The slips to catch are 'Make bánh chưng takes' (missing -ing), 'are' after an -ing subject and 'worth to visit'. Do item 1 together.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the frames." },
              { level: "Core", task: "Do all three items." },
              { level: "Stretch", task: "Write two opinion sentences about a tradition you want to keep, one with -ing as the subject and one with worth." },
            ],
          },
        },
        {
          after: "Transfer: test our big idea",
          slide: {
            kind: "fluency",
            title: "Worth keeping 4-3-2",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 5,
            goal: "Give the same opinion talk to three partners. Each time it is shorter and smoother.",
            chunks: [
              "Telling stories keeps a family close.",
              "It's important to write things down.",
              "It's worth visiting a museum once.",
              "Learning a craft takes patience.",
              "I used to think old songs were boring, but now I love them.",
            ],
            recycle: ["First, wash the leaves.", "She asked me where I lived.", "The festival, which is very old, was started by farmers."],
            rounds: [
              { seconds: 75, say: "Partner 1: say why a tradition is worth keeping. The listener counts your -ing subjects." },
              { seconds: 65, say: "New partner: the same talk in less time." },
              { seconds: 60, say: "New partner: fast and smooth! The listener asks one follow-up question." },
            ],
            steps: [
              "Choose one tradition and three reasons. Use It's important to ..., ___-ing takes ... and It's worth ___-ing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "In round 3, end with 'I used to think ..., but now ...'.",
            ],
            feedback:
              fixMove +
              " Example: a child says 'Make lanterns takes time' or 'It's worth to visit'. Say 'Making ...?' and pause, or point to the frame for worth + -ing." +
              tail,
            teacherNote:
              "Same opinion, less time, new listener: 4/3/2 builds speed, and one minute of correction after round 1 builds accuracy as well. Children keep what they say most often, so listen for the gerund subject, 'is' not 'are' after it, and 'worth' + -ing.",
            tiers: [
              { level: "Support", task: "Say two reasons with the frames.", frames: ["It's important to ___.", "It's worth ___-ing."] },
              { level: "Core", task: "Say three reasons without the board." },
              { level: "Stretch", task: "Add a counter-view and your answer.", frames: ["Some people say ___, but I think ___."] },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Worth keeping: my view",
        prompt:
          "Choose a tradition you think is worth keeping. Tell us why, how to keep it alive, and what you used to think about it.",
        length: "60-120 seconds",
        steps: [
          "Choose one tradition (a festival, a song, a craft, a food).",
          "Say your talk three times to a grown-up or a toy, each time a little faster and smoother.",
          "Record it once. Use It's important to ... and It's worth ... in your talk.",
          homeNote,
        ],
        maxSeconds: 180,
        kidSummary: "Say why a tradition is worth keeping with three clear reasons, and keep talking without long stops.",
        words: ["tradition", "preserve", "important", "worth", "patience", "family"],
        grammar: ["-ing as a subject: Telling stories keeps a family close.", "It's important to + verb", "It's worth + verb-ing"],
        rubric: [
          { label: "Reasons", description: "Gives at least two clear reasons for keeping the tradition.", weight: 2 },
          { label: "Unit grammar", description: "Uses an -ing subject, It's important to ..., and It's worth -ing correctly.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops, in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The final -s and -ed (keeps, learned) can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["It's important to ___.", "It's worth ___-ing."], tips: ["Say one tradition and two reasons."] },
          { level: "Core", who: "Most children", frames: ["___-ing ___ keeps ___.", "It's important to ___ because ___.", "It's worth ___-ing."], tips: ["Give three reasons in a clear order."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I used to think ___, but now ___.", "Some people say ___, but I think ___."], tips: ["Add what you used to think and a counter-view."] },
        ],
      },
    },
  },
};
