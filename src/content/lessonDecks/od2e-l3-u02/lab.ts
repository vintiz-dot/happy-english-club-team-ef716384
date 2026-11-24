import type { UnitLab } from "@/lib/lessonDecks/lab";
import type { Slide } from "@/lib/lessonDecks/types";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 3, Unit 2 "Games, Friends
// and Fun" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 8-10 (Sky 1).
// Lessons 1, 3 and 4 write a whole paragraph (description, opinion, recount).
// Every lesson gets one fluency routine (the unit's grammar, gerunds and question words,
// said again and again as whole sentences with Unit 1's phrases mixed back in) and one
// writing routine (plan, write, check, then say it). Lessons 2, 4 and 6 end with a recorded
// talk for home that repeats the class routine days later. Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute, write them on the board and let the class fix them; children who then say the same thing again use the fixed form. For grammar, make the child fix it rather than telling them: start the phrase and pause ('Swimming ...?'), point to the frame on the board, hold up a finger for the missing -ing or -s, or repeat the error with a rising voice ('She is good at dance?'). For example, 'Running and jumping is fun' gets two raised fingers and 'Two things, so ... are?'. For a sound, just say it right and let the child echo it. Say every final -ing, -s and -ed clearly yourself: children copy what they hear.";

const askFix =
  "Listen and do not stop the chain. Note two or three question mistakes (no names). After round 1, stop for one minute and put them on the board for the class to fix; then go on, and children who ask again use the fixed form. Make the child self-correct: start the question and pause ('Where ...?'), point to the do / does card, or hold up a finger for the missing word. 'Where you play?' gets 'Where ... you play?' with a raised finger for 'do'. 'Why does she likes it?' gets a rising voice on 'likes?'. For a sound, say it right and let the child echo. Say do / does and the final -s of verbs clearly yourself.";

const drillFeedback =
  "Prompt, do not tell: for 'I enjoy to swim' hold up one finger and say 'I enjoy ...?' and point to the -ing card; for 'I want swimming' say 'I want ... to?' and point to the to card; for 'She enjoy swimming' or 'She wants to learns' tap your wrist for the -s and say it clearly yourself. For a question, point to the do / does card and let the child start again. Watch for Vietnamese habits: no -s on the verb, no -ing after enjoy and good at, no to after want. In round 3 do not correct every slip: note the two that matter and use them in the one-minute fix next lesson.";

// One grammar drill: a sentence changed fast by a sign, in chorus, then pairs, then real talk.
function drill(o: {
  title: string;
  goal: string;
  chunks: string[];
  recycle: string[];
  prompts: string[];
  real: string;
  slips: string;
  note: string;
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
      { seconds: 60, say: "Chorus: the teacher says a sentence and shows a sign card (? = ask it, X = say no, + = join with because / so / but / when, T = change the time or tense, P = change the person). The class says the new sentence together." },
      { seconds: 90, say: "Pairs: A holds up a sign card and says a sentence, B changes it. Swap at the clap. Use two signs together if you can: X + or T P." },
      { seconds: 90, say: o.real },
    ],
    steps: [
      "Listen to the sentence. Look at the sign. Change the sentence and say the WHOLE new sentence, with the -ing, the to and the -s where they belong.",
      `Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names, often ${o.slips}), fix them together, then go on.`,
      "In round 2 swap roles at the clap: the child with the sign card checks that the new sentence is right.",
      "In round 3 the drill becomes real talk: talk about your own life, and remember one thing your partner said to tell the class.",
    ],
    prompts: o.prompts,
    feedback: drillFeedback,
    teacherNote:
      "A drill only helps when the last step is real: in round 3 the children talk about their own lives, so the form carries a meaning. Keep it brisk, about two seconds a sentence; a drill that drags loses its point. Show the sign cards one at a time and keep them on the board all unit. Mark nothing in writing: this is about speed and accuracy in speech. " +
      o.note,
    tiers: [
      { level: "Support", task: "Use only the ? and X signs with the frames on the board, and say each new sentence once.", frames: o.support },
      { level: "Core", task: "Change every sentence, join it with because or so, and change the person too." },
      { level: "Stretch", task: o.stretch, frames: o.stretchFrames },
    ],
  };
}

export const odL3U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l3-u02-l1": {
      objectives: ["I can say 'My favorite game is ___. I play it with ___ at ___.' fast, and write a short paragraph about it."],
      trim: { "Mystery mime": 4, "Describe it, don't say it": 4 },
      drop: ["Do it and guess"],
      add: [
        {
          after: "What's your favorite game? (SB 16 C)",
          slide: {
            kind: "fluency",
            title: "Game sprint: my favorite game",
            routine: "chunk sprint",
            mode: "pairs",
            minutes: 6,
            goal: "Say the whole game sentence fast and smooth, with no stops.",
            chunks: [
              "My favorite game is tag.",
              "I play it with my friends at the park.",
              "It is fun because we run and laugh.",
              "Yes, I agree. Tag is fun.",
              "Actually, I disagree. I think football is more fun.",
            ],
            recycle: ["I think it is fun because we play together.", "The fair is exciting."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a game picture and the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says a whole sentence. Swap when you hear the clap." },
              { seconds: 60, say: "New partner. Faster! How many whole sentences can you say?" },
            ],
            steps: [
              "Look at the game card. Say a WHOLE sentence about it, not one word.",
              "Say it with the class first, then with your partner, then alone.",
              "Listen for the clap: it means change partners.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on to round 2.",
            ],
            prompts: ["(card: tag)", "(card: hide and seek)", "(card: football)", "(card: skipping rope)", "(card: swimming)"],
            feedback: correct,
            teacherNote: "Whole sentences only: 'I play it with my friends at the park' as one smooth piece, never a list of words. This is the first sprint of the unit, so the children hear the unit's opinion phrases (agree / disagree) said many times before Lesson 3 adds -ing. Listen for 'My favorite game is' (is is often dropped) and the final -s on 'friends'. Mix in Unit 1's phrases every few turns so they stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["My favorite game is ___.", "I play it with ___ at ___."] },
              { level: "Core", task: "Say the sentences alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason and disagree politely: 'It is fun because ___. Actually, I think ___ is more fun.'", frames: ["It is fun because ___.", "Actually, I disagree. I think ___ is more fun."] },
            ],
          },
        },
        {
          after: "Game sprint: my favorite game",
          slide: drill({
            title: "Grammar drill: enjoy, like and good at + -ing",
            goal: "Change the sentence fast and right: ask it, say no, join it with because, change the time or the person. Then talk about what you really enjoy.",
            chunks: [
              "Skipping is fun, and I enjoy it every day.",
              "Do you enjoy swimming? Yes, I do, and I swim in the lake.",
              "I don't like running because it makes me tired.",
              "My brother is good at climbing, so he climbs the cliff.",
              "Last summer we enjoyed playing on the beach.",
              "What are you good at, and why do you like it?",
            ],
            recycle: ["Have you ever been to a festival?", "I have never seen a lion dance."],
            prompts: ["I enjoy swimming. (?)", "She likes skipping. (X)", "I enjoy running. (+ because it makes me strong)", "He enjoys diving. (T: last summer)", "I am good at climbing. (P: she)"],
            real: "Real talk: tell your partner two things you enjoy doing and one thing you are not good at. Say why. Your partner asks one question: 'Do you enjoy ...ing?'",
            slips: "'I enjoy to swim', 'She enjoy swimming' (no -s) or 'Swim is fun'",
            note: "The unit's grammar is -ing after enjoy, like and good at, so the children hear it many times before Lesson 3 names the rule. Stretch gives a first taste of 'want to' (the Level 4 step you meet in Lesson 3): do not explain it now, just let the children say it.",
            support: ["Do you enjoy ___ing? Yes, I do.", "I don't like ___ing."],
            stretch: "Use two signs at once and add a wish: 'Last summer I enjoyed swimming, but now I want to learn diving.'",
            stretchFrames: ["I enjoy ___ing, but I want to ___.", "Do you enjoy ___ing, or do you want to ___?"],
          }),
        },
        {
          after: "Our games chart (SB 17 Think)",
          slide: {
            kind: "writing",
            title: "My favorite game: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 10,
            steps: [
              "Read the model with the teacher. Find the topic sentence, how to play, why it is fun and the closing question.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with your topic sentence and use First, Then and because.",
              "Check: tick the checklist. Swap with a partner: they underline one -s ending and one because, and tell you one thing they liked.",
              "Teacher: while they write, look only at 'is' in 'My favorite game is ...' and plural -s (friends, cousins). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Tag",
              text: "My favorite game is tag, and it is the most exciting game at our school. I play it with my friends at the park after class. First, one player is the chaser and counts to ten. Then everybody runs away, so the chaser cannot touch us. Tag is fun because we enjoy running and laughing, and it is good exercise, too. Do you like tag?",
            },
            organiser: [
              { label: "Topic sentence", prompt: "What is your favorite game? What is it like? (fun, exciting, hard)" },
              { label: "Who and where", prompt: "Who do you play it with? Where do you play it?" },
              { label: "How to play: First, ... Then, ...", prompt: "What do you do first? What happens next?" },
              { label: "Why it is fun: because ...", prompt: "Why do you like it? End with a question for the reader." },
            ],
            frames: ["My favorite game is ___.", "I play it with ___ at ___.", "First, ___. Then ___.", "It is fun because ___."],
            checklist: [
              "My first sentence says the game and what it is like",
              "'is' in 'My favorite game is ...'",
              "friends, cousins: the -s is there",
              "First, Then and because join my ideas",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This replaces the one-sentence 'grow it' task: the same check on 'is' and the plural -s now sits in the checklist. Mark only two targets ('is' and plural -s) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. Keep the model on the board while the children write.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["My favorite game is ___.", "I play it with ___ at ___.", "It is fun because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a disagreement or a comparison: 'Some people like football, but I think tag is more fun because ...'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l3-u02-l2": {
      objectives: ["I can tell the story of the ball again, shorter and faster each time."],
      trim: { "Pass the ball chant": 3, "Culture note: games from far away": 3, "Four readers, four games": 5 },
      add: [
        {
          after: "The ball's journey",
          slide: {
            kind: "fluency",
            title: "Retell the ball's journey",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times to three partners. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the ball was with one child.",
              "Then it traveled to a new place.",
              "People there played a different game with it.",
              "Finally, the ball came back.",
            ],
            recycle: ["The fair was exciting.", "I felt excited."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the whole story, then Partner B. Use the key-word cards on the board. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells it again in less time, then Partner B. Cover the cards if you can. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A tells it fast and smooth, then Partner B. The listener gives a thumbs up if you did not stop." },
            ],
            steps: [
              "Look at the key-word cards for the journey: first, then, a different game, finally.",
              "Tell the story to your partner: A tells it, then B tells it. The listener has a job: count the places on their fingers.",
              "Teacher: after round 1, stop for one minute. Put two sentences you heard with a mistake on the board (no names) and the class fixes them. Then go on to round 2.",
              "When the bell rings, find a new partner. Each round gets shorter: 75, 60, then 45 seconds each.",
            ],
            prompts: ["(card: first)", "(card: then)", "(card: a different game)", "(card: finally)"],
            feedback: correct,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for what to say. Make the key-word cards from the story as the class read it; do not add new events between rounds. Listen for past tense (-ed and irregular verbs) and for 'the ball' with its article. Accept shorter tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each key-word card and say one sentence for it.", frames: ["First, ___.", "Then ___.", "Finally, ___."] },
              { level: "Core", task: "Tell all four parts with the cards, then with the cards turned over." },
              { level: "Stretch", task: "Add how people felt and why: 'Everyone was excited because the game was new.'" },
            ],
          },
        },
        {
          after: "Retell the ball's journey",
          slide: drill({
            title: "Grammar drill: tossing, catching, winning",
            goal: "Change the ball-game sentence fast and right: ask it, say no, join it with because or so, change the time or the person. Then talk about games you really play.",
            chunks: [
              "Catching the ball with two hands is hard.",
              "The children enjoy throwing the ball to a new place.",
              "Do you enjoy playing with a ball? Yes, I do, and I am good at catching.",
              "They don't like losing, but they keep playing.",
              "Yesterday we played until the bell rang, so we enjoyed the game.",
              "I am good at tossing, so I toss the ball first.",
            ],
            recycle: ["Have you ever played a game with a rubber ball?", "I went to the lake last year."],
            prompts: ["Tossing is easy. (?)", "They enjoy catching the ball. (X)", "She is good at throwing. (+ so she throws first)", "We enjoy playing with a ball. (T: yesterday)", "I enjoy winning. (P: he)"],
            real: "Real talk: tell your partner about a game with a ball that you enjoy and one part of it that is hard for you. Say why. Your partner asks one question: 'Are you good at ...ing?'",
            slips: "'Catch the ball is hard', 'He enjoy throwing' (no -s) or 'They enjoy to play'",
            note: "This lesson is about the story and the rules, so the drill borrows the ball and its game for the -ing patterns the children will name in Lesson 3. Say the final -ing and -s clearly yourself. Stretch previews 'want to' before the Level 4 step in Lesson 3: let the children say it, do not explain it.",
            support: ["Do you enjoy ___ing? Yes, I do.", "___ing the ball is ___."],
            stretch: "Use two signs at once and add a wish: 'I enjoy catching the ball, but I want to learn a new game.'",
            stretchFrames: ["I enjoy ___ing, but I want to ___.", "___ing is ___, so I ___."],
          }),
        },
        {
          after: "Write the rules",
          slide: {
            kind: "writing",
            title: "Dictogloss: a game with a ball",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Plan: look at the board. Remember: First, Then, If, until are joining words for rules.",
              "Listen: the teacher reads the text once. Just listen.",
              "Listen again and write key words. Then work in your group to rebuild the text.",
              "Check: compare with the real text on the screen and fix your capital letters, full stops and -s endings.",
            ],
            text: {
              title: "A game with a ball",
              text: "Four children play a game with a ball. First, they stand in a circle. Then one child tosses the ball to a friend. The friend must catch it with two hands. If the ball falls, everybody laughs and starts again. They play until the bell rings. It is a simple game, but everybody has fun.",
            },
            frames: ["First, they ___.", "Then one child ___.", "If the ball falls, ___."],
            checklist: ["Every sentence starts with a capital letter and ends with a full stop", "children, friends: the -s is there", "First, Then, If: joining words are in the right place"],
            sayIt: "Read your group's text to another group, then say it again without looking.",
            teacherNote: "Dictogloss works best after a short reminder of the rule or pattern; here it is the sequence words from the rules the class just wrote. Read at natural speed, twice, without repeating a third time. Groups do not need the exact words, only the meaning in good English. Praise 'must' and 'until' when children use them.",
            tiers: [
              { level: "Support", task: "Write the key words you hear and put the three frames in order." },
              { level: "Core", task: "Rebuild the whole text with your group." },
              { level: "Stretch", task: "Rebuild it, then add a last sentence: how do you win?" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Teach me a ball game",
        prompt: "Teach a game you can play with a ball, or with something at home. Say how to play it, step by step, and say why it is fun.",
        length: "60-90 seconds",
        steps: [
          "Look at the rules you wrote in class.",
          "Say the rules three times to a grown-up or a toy. Each time a little faster, like in class.",
          "Use First, Then and You win when.",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Teach a game step by step, say why it is fun, and keep talking without long stops.",
        words: ["ball", "toss", "catch", "circle", "rules", "win"],
        grammar: ["First, ___. Then ___.", "You win when ___.", "You must / must not ___."],
        rubric: [
          { label: "Steps in order", description: "Says how to play in order with First, Then and a way to win.", weight: 3 },
          { label: "Game words", description: "Uses words from the unit: ball, toss, catch, circle, win.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Final -s and -ed can be heard: tosses, children, played.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, you ___.", "Then ___.", "You win when ___."], tips: ["Hold up a finger for each step."] },
          { level: "Core", who: "Most children", frames: ["First, you ___. Then you ___.", "You must ___. You must not ___.", "It is fun because ___."], tips: ["Say why it is fun at the end."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I learned it when I was ___ years old.", "If ___, you ___. You win when ___."], tips: ["Add who taught you and one tricky rule."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l3-u02-l3": {
      objectives: ["I can say 'Swimming is fun.' and 'I enjoy dancing.' fast and without mistakes."],
      trim: { "Rule riddles": 3, "Our big idea: what does -ing do?": 3, "Sort the sentence cards": 7 },
      drop: ["Gerund charades"],
      add: [
        {
          after: "Gerunds: verb + -ing",
          slide: {
            kind: "grammar",
            title: "Level 4 step: enjoy + -ing, want + to",
            hook: "Two small families of verbs: enjoy likes -ing, and want likes to.",
            form: [
              { label: "enjoy / finish / stop / be good at + verb + -ing", pattern: "She enjoys skipping. We finished playing. They stopped running. I am good at swimming." },
              { label: "want / hope / decide / learn / need + to + verb", pattern: "I want to swim. She hopes to win. We decided to play. I need to practise." },
              { label: "No: not 'enjoy to' and not 'want -ing'", pattern: "I enjoy swimming. (not: I enjoy to swim.)   I want to swim. (not: I want swimming.)" },
              { label: "Questions and answers", pattern: "Do you enjoy swimming? Yes, I do.   Do you want to learn diving? No, I don't." },
            ],
            explanation: [
              "In this unit you learned that after enjoy and good at, we use a verb with -ing: 'I enjoy swimming.' Two more verbs work the same way: finish and stop. 'We finished playing at five.'",
              "Some verbs like a different friend: to + verb. We use it for wishes and plans: want, hope, decide, learn and need. 'I want to learn skipping.' The verb after to is the simple verb, with no -ing and no -s.",
              "Think of two doors. Enjoy opens the -ing door, and want opens the to door. Each of these verbs keeps to one door, so we learn them in two small families. You will meet many more of these verbs in Oxford Discover 4, so learning the two families now will make that book easier.",
            ],
            examples: [
              { text: "I enjoy skipping, but I want to learn diving.", note: "Both doors in one sentence" },
              { text: "She finished playing tag and decided to go home." },
              { text: "We hope to win the game, and we need to practise." },
              { text: "He is good at climbing, so he wants to try the big cliff.", note: "good at + -ing, then wants + to" },
              { text: "We stopped playing when the rain began." },
              { text: "Do you enjoy swimming? Do you want to learn diving?" },
            ],
            pitfalls: [
              { wrong: "I enjoy to swim.", right: "I enjoy swimming.", why: "Enjoy opens the -ing door, not the to door." },
              { wrong: "I want swimming.", right: "I want to swim.", why: "Want needs to + the simple verb." },
              { wrong: "She wants to learns skipping.", right: "She wants to learn skipping.", why: "The -s goes on wants. After to, the verb stays simple." },
            ],
          },
        },
        {
          after: "Level 4 step: enjoy + -ing, want + to",
          slide: drill({
            title: "Grammar drill: enjoy -ing and want to",
            goal: "Change the sentence fast and right. Rounds 1 and 2: -ing after enjoy, like and good at. Round 3: use enjoy + -ing and want + to in your own sentences.",
            chunks: [
              "Swimming is fun, and I enjoy swimming with my cousins.",
              "She is good at dancing, but she wants to learn skipping.",
              "We finished playing at five, and we decided to go home.",
              "Do you enjoy skipping? Do you want to learn diving?",
              "I don't enjoy running, but I need to practise.",
              "I hope to win, and I enjoy playing even when I lose.",
            ],
            recycle: ["Have you ever tried diving? No, I have never tried it.", "I went to the beach last year."],
            prompts: ["She enjoys dancing. (?)", "He is good at skipping. (X)", "I enjoy running. (+ but I want to ___)", "We enjoy swimming. (T: last year)", "I want to learn diving. (P: she)"],
            real: "Real talk (the Level 4 step): tell your partner one thing you enjoy doing and one thing you want to learn or hope to do. Your partner asks 'Why do you want to learn it?' and tells the class one thing.",
            slips: "'I enjoy to swim', 'I want swimming' or 'She wants to learns'",
            note: "Rounds 1 and 2 are the unit's -ing grammar; round 3 is the new Level 4 step. Hold up two cards, -ing and to, and ask 'Which door?' before each round 3 sentence. Do not explain more than the step slide did.",
            support: ["I enjoy ___ing.", "I want to ___.", "Do you enjoy ___ing?"],
            stretch: "Use enjoy / finish / be good at + -ing AND want / hope / decide / need + to in one sentence: 'I finished skipping, and I decided to try swimming.'",
            stretchFrames: ["I finished ___ing, and I decided to ___.", "I am good at ___ing, but I need to ___."],
          }),
        },
        {
          after: "Fill in the gerund (SB 21 F)",
          slide: {
            kind: "writing",
            title: "The best way to have fun: plan, write, check",
            routine: "paragraph",
            genre: "opinion",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the opinion, the two reasons and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Start with 'In my opinion' and use -ing words as the subject and after enjoy or good at.",
              "Check: tick the checklist. Swap with a partner: they underline one -ing word and tell you if they agree.",
              "Teacher: while they write, look only at is / are with -ing subjects and at -ing after enjoy and good at. Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Swimming",
              text: "In my opinion, swimming is the best way to have fun on a hot day. First, swimming is exciting because we jump into the cool water. Also, I enjoy swimming with my cousins, and my brother is good at diving. Running and jumping are fun, too, but they make me very tired. That is why I think swimming is better. What do you think?",
            },
            organiser: [
              { label: "Opinion: In my opinion, ...", prompt: "What is the best way to have fun? Use an -ing word as the subject." },
              { label: "Reason 1: First, ... because ...", prompt: "Why is it fun or exciting?" },
              { label: "Reason 2: Also, I enjoy ...ing / I am good at ...ing", prompt: "Who do you do it with? What are you good at?" },
              { label: "Closing: That is why ...", prompt: "Say your opinion again. Ask the reader a question." },
            ],
            frames: ["In my opinion, ___ing is the best way to ___.", "___ing is ___ because ___.", "I enjoy ___ing with ___.", "That is why I think ___."],
            checklist: [
              "My opinion is in the first sentence",
              "-ing as the subject: one thing is, two things are",
              "After enjoy and good at, the verb has -ing, and the spelling is right (swimming, dancing)",
              "I gave a reason with because",
            ],
            sayIt: "Read your paragraph to your partner. Then tell your opinion again without looking, in thirty seconds.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. The opinion paragraph lets the children use the unit's gerunds in a real argument, and the joined sentences from the combining task and the fun chart feed its reasons. Mark only two targets (is / are with -ing subjects and -ing after enjoy / good at) with a dot on the line; the child finds and fixes the mistake. Vietnamese learners often write 'Running and jumping is' or 'I enjoy to swim': hold up fingers for these rather than telling them.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["In my opinion, ___ing is the best way to ___.", "___ing is ___ because ___."] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a different view: 'Some people like ___ing, but I think ___ing is better because ...'" },
            ],
          },
        },
        {
          after: "My fun chart: six gerunds (SB 21 G)",
          slide: {
            kind: "fluency",
            title: "Fun talk again: -ing sentences",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Say the same fun talk twice, with a new partner each time: better, smoother and without stops.",
            chunks: [
              "Skipping is fun.",
              "I enjoy swimming with my friends.",
              "My sister is good at dancing.",
              "Running and jumping are good for you.",
            ],
            recycle: ["The fair is exciting.", "I feel tired after a race."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells about the fun chart (three -ing sentences), then Partner B. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A says it again, smoother, and adds one reason with because. Then Partner B. Do not look at the chart." },
            ],
            steps: [
              "Take one minute to plan: choose your three -ing sentences from your fun chart.",
              "Say them to your partner: A talks, then B talks. The listener has a job: tick each -ing word they hear.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them. Then go on.",
              "Change partners for round 2. Say the same ideas again, with the corrections.",
            ],
            feedback: correct,
            teacherNote: "Task repeat: the same task with a new listener after a planning minute. The children already did the chart in the book, so the language is ready; the repeats make it fast. Listen for 'Swim is fun' (no -ing), 'I enjoy to skip' (to instead of -ing) and 'Running and jumping is'. Do not add new vocabulary between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences from your chart with the frames.", frames: ["___ing is fun.", "I enjoy ___ing.", "I am good at ___ing."] },
              { level: "Core", task: "Say three or four sentences, with one reason, without reading." },
              { level: "Stretch", task: "Compare with your partner: 'We both enjoy ___ing, but I am good at ___ing.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l3-u02-l4": {
      objectives: ["I can ask and answer 'What, Where, Who and Why' questions about fun, fast."],
      trim: {
        "Hot seat: guess my game (SB 23 E)": 4,
        "Verb phrases with get (SB 23 D)": 8,
        "Build the question": 4,
        "Ask and answer: how do you have fun?": 3,
        "Writing practice: how I have fun (Workbook)": 10,
      },
      drop: ["Cheer squad"],
      add: [
        {
          after: "Question words",
          slide: drill({
            title: "Grammar drill: asking about fun",
            goal: "Change the sentence into a question fast and right, with do, does or did. Then ask real questions about fun, with enjoy and want to.",
            chunks: [
              "Where do you play, and who do you play with?",
              "What did you play last weekend, and why did you like it?",
              "Why are you happy when you win?",
              "How can we win this game?",
              "Who taught you to skip?",
              "What do you enjoy doing, and what do you want to learn?",
            ],
            recycle: ["Have you ever been to a festival?", "I went there last year."],
            prompts: ["You play tag at school. (? where)", "She likes the game. (? why)", "He taught you the game. (? who)", "We can win. (? how)", "You want to learn diving. (? why)"],
            real: "Real talk: ask your partner four questions about fun with What, Where, Who and Why. One question must be 'What do you enjoy doing?' and one 'What do you want to learn?' Your partner answers in whole sentences, then you swap.",
            slips: "'Where you play?', 'What he likes?' or 'Why does she likes it?'",
            note: "Rounds 1 and 2 are this lesson's question words; round 3 brings back the Level 4 step from Lesson 3 (enjoy + -ing, want + to) inside real questions. Say do / does and the final -s clearly yourself.",
            support: ["Where do you ___?", "Who do you ___ with?", "What do you enjoy ___ing?"],
            stretch: "Ask and answer with the step: 'Why do you want to learn diving? Because I enjoy swimming.'",
            stretchFrames: ["Why do you want to ___?", "Because I enjoy ___ing, and I need to ___."],
          }),
        },
        {
          after: "Ask and answer: how do you have fun?",
          slide: {
            kind: "fluency",
            title: "Question chain: how do you have fun?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: [
              "What do you do for fun?",
              "Where do you play?",
              "Who do you play with?",
              "Why do you like it?",
              "I play at the lake because it is fun.",
            ],
            recycle: ["Skipping is fun.", "I enjoy swimming."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle: ask your friend one question, they answer and ask the next friend." },
              { seconds: 75, say: "Change the question word each time. Go faster!" },
              { seconds: 60, say: "Last chain. Can it go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Ask the friend on your left a question with What, Where, Who or Why.",
              "They answer in a whole sentence, then turn and ask the next friend a new question.",
              "The question words are on cards: use a different one each time.",
              "Teacher: after round 1, stop for one minute. Put two question mistakes on the board and the class fixes them. Then go on to round 2.",
            ],
            prompts: ["What do you do for fun?", "Where do you play?", "Who do you play with?", "Why do you like it?"],
            feedback: askFix,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which makes 'Where do you ...?' automatic. Time the whole circle and tell them: children love beating their own time. Watch for the missing do / does, 'Why does she likes it?' and answers that are one word: ask for a whole sentence with because.",
            tiers: [
              { level: "Support", task: "Ask with the question cards and answer with the frame on the board.", frames: ["I play at ___.", "I play with ___.", "I like it because ___."] },
              { level: "Core", task: "Ask and answer without looking at the cards." },
              { level: "Stretch", task: "Ask a follow-up question: 'How often do you play?' or 'Who taught you?'" },
            ],
          },
        },
        {
          after: "Build the question",
          slide: {
            kind: "writing",
            title: "A game someone taught me: plan, write, check",
            routine: "paragraph",
            genre: "personal recount",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find the topic sentence, the details and the closing sentence.",
              "Plan: fill the four boxes with a few words each, not whole sentences.",
              "Write: turn your notes into one paragraph. Use First, Then and At the end, and put one question and its answer inside it.",
              "Check: tick the checklist. Swap with a partner: they underline the question and one past verb and tell you one thing they liked.",
              "Teacher: while they write, look only at question word order (do / did) and past verbs (taught, learned). Put a dot in the margin of a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model paragraph: Hide and seek",
              text: "Last summer, my cousin taught me a game called hide and seek at the lake. First, I asked him, \"How do we play?\" He said, \"One player counts to twenty while the others hide.\" Then I hid behind a big tree, but he found me quickly. It was hard to learn because I laughed too much! At the end he said, \"Good try! You can do it!\" Now I play it with my friends every weekend.",
            },
            organiser: [
              { label: "Topic sentence", prompt: "Who taught you a game? What game? When and where?" },
              { label: "Detail 1: First, ...", prompt: "What question did you ask? What was the answer?" },
              { label: "Detail 2: Then, ...", prompt: "What happened when you tried it? Was it easy or hard?" },
              { label: "Closing: At the end, ...", prompt: "What did your cousin, friend or teacher say to you? Do you play it now?" },
            ],
            frames: ["Last ___, my ___ taught me a game called ___.", "First, I asked, \"How do we play?\"", "Then I ___. It was hard / easy because ___.", "At the end, ___ said, \"Good try!\""],
            checklist: [
              "My first sentence says who taught me, what game and where",
              "My question has do or did: 'How do we play?' 'What did you play?'",
              "Past verbs: taught, learned, asked, hid, was",
              "First, Then and At the end join my ideas",
            ],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, in one minute.",
            teacherNote: "Plan, write, check: the boxes take words, not sentences, so the time goes into the paragraph itself. This replaces the question-fixing task: the question words now work inside a real recount, with a question and its answer in the text, and the do / did check sits in the checklist. Mark only two targets (do / did in the question and past verbs) with a dot on the line; the child finds and fixes the mistake. Correcting a few things with a reason works better than marking everything. The paragraph can also be the script for this lesson's recorded fun talk.",
            tiers: [
              { level: "Support", task: "Use the four frames: one sentence for each box.", frames: ["Last ___, my ___ taught me ___.", "First, I asked, \"How do we play?\""] },
              { level: "Core", task: "Write the whole paragraph: five or six sentences." },
              { level: "Stretch", task: "Add a second question and answer: 'I asked, \"Who taught you?\" He said, \"My grandfather did.\"'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My fun talk: what, where, who and why",
        prompt: "Tell us how you have fun. Say what you do, where you do it, who you do it with and why you like it.",
        length: "60-90 seconds",
        steps: [
          "Think of one thing you do for fun. Answer What, Where, Who and Why.",
          "Say your answers three times to a grown-up or a toy: each time smoother, like the question chain.",
          "Ask the camera one question: 'What do you do for fun?'",
          "Say one thing you enjoy (enjoy + -ing) and one thing you want to learn (want + to + verb).",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Say what, where, who and why in whole sentences, and keep talking without long stops.",
        words: ["fun", "play", "lake", "friends", "because"],
        grammar: ["What / Where / Who / Why do you ___?", "I ___ because ___.", "I enjoy ___ing, and I want to ___."],
        rubric: [
          { label: "What, where, who, why", description: "Answers all four questions in whole sentences.", weight: 3 },
          { label: "Questions with do", description: "Asks a question with do or does and the right word order.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; no long pauses to look for words.", weight: 3 },
          { label: "Clear endings", description: "Final -s, -ing and -ed can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I play ___.", "I play at ___.", "I play with ___.", "I like it because ___."], tips: ["Point to a picture for each answer."] },
          { level: "Core", who: "Most children", frames: ["I enjoy ___ing at ___ with ___.", "I like it because ___.", "What do you do for fun?"], tips: ["Say why in a whole sentence."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["___ taught me when I was ___ years old.", "I am good at ___ing, but ___ is hard for me.", "Why don't you try it?"], tips: ["Add who taught you and say what is hard."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l3-u02-l5": {
      objectives: ["I can talk about my fun place for two minutes, shorter and faster each time."],
      trim: {
        "60-second recall": 3,
        "Rehearse your play": 8,
        "Fun places and friends": 4,
        "Showtime: our plays": 9,
        "Big Question video and chart (SB 25 Review A-C)": 7,
      },
      drop: ["Test our big ideas"],
      add: [
        {
          after: "Fun places and friends",
          slide: {
            kind: "fluency",
            title: "Fun place talk 4-3-2: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same talk about a fun place to three friends. Each talk is shorter and smoother: 75, 60, then 45 seconds.",
            chunks: [
              "My friend and I go to the lake.",
              "We play there because it is fun.",
              "Swimming is my favorite thing to do.",
              "The park is my favorite place to play.",
            ],
            recycle: ["Where do you play?", "I think it is fun because we play together."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the fun place talk, then Partner B. The listener counts the things you do on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A gives the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: Partner A, then Partner B: fast and smooth! The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, line A talks first, then line B talks. The listener has the other job.",
              "The listener has a job: count the things, then ask one question: 'Why do you like it?'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together. Then go on.",
              "When the bell rings, line B moves one step to the left: a new partner. Then line A talks first again.",
            ],
            feedback: correct,
            teacherNote: "This is the classic 4/3/2 activity, scaled for ten-year-olds: the same talk, less time, a new listener each time. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The one-minute fix after round 1 is what makes it accurate as well as fast: the second telling uses the fixed form.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I go to ___ with ___.", "We ___ there.", "It is fun because ___."] },
              { level: "Core", task: "Say four or five sentences without the board." },
              { level: "Stretch", task: "Add a comparison: '___ is fun, but ___ is more exciting because ___.'" },
            ],
          },
        },
        {
          after: "Fun place talk 4-3-2: three partners",
          slide: drill({
            title: "Grammar drill: lines for our play",
            goal: "Change the sentence fast and right, then say real lines about what you enjoy, what you decided and what you want to do next.",
            chunks: [
              "I enjoy skipping, and I am good at running.",
              "Playing games with friends is the best part of my day.",
              "My friend wants to win, but I hope to have fun.",
              "We decided to put on a play, and we finished writing it today.",
              "Do you enjoy acting? Do you need to practise?",
              "Why did the characters want to play together?",
            ],
            recycle: ["Have you ever been in a play?", "I have never been in one."],
            prompts: ["I enjoy acting. (?)", "She is good at singing. (X)", "We decided to act. (+ because it is fun)", "He hopes to win. (T: last week)", "I need to practise. (P: they)"],
            real: "Real talk: tell your partner one thing you enjoy doing, one thing you finished doing this week and one thing you want to do next. Your partner asks one question and tells the class one thing.",
            slips: "'I enjoy to act', 'We decided playing' or 'He hope to win'",
            note: "This is the Wrap Up lesson, so the drill sounds like lines the children might say in their play. The Level 4 step (enjoy / finish + -ing, want / hope / decide / need + to) comes back in rounds 2 and 3 and in the Stretch tier.",
            support: ["I enjoy ___ing.", "I want to ___.", "We decided to ___."],
            stretch: "Say two ideas about your play with the step: 'We finished writing the play, and we decided to act it on Friday.'",
            stretchFrames: ["We finished ___ing, and we decided to ___.", "I enjoy ___ing, but I need to ___."],
          }),
        },
        {
          after: "How to write a play (SB 24 Learn)",
          slide: {
            kind: "writing",
            title: "Model scene: write two lines",
            routine: "model, then write",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Plan: read the model scene. Find who is speaking and the question marks.",
              "Write: write two new lines for the scene, one for each speaker.",
              "Check: use the checklist, then read your lines aloud like actors.",
            ],
            text: {
              title: "At the park",
              text: "Scene: A park on Saturday. Two friends meet.\nA: What do you enjoy doing on Saturdays?\nB: I enjoy skipping. What about you?\nA: I am good at swimming, so I go to the lake.\nB: Swimming is fun! Let's go together.",
            },
            frames: ["A: What do you ___?", "B: I enjoy ___ing. What about you?", "A: ___ing is ___ because ___."],
            checklist: ["Each line starts with who is speaking (A: or B:)", "After enjoy and good at, the verb has -ing", "A question mark after a question"],
            sayIt: "Act your two lines with your partner, then say them again without looking.",
            teacherNote: "Modelled writing: the children notice what a short scene does before writing their own, so their lines can go straight into the class play. Point out that each speaker's lines are short and that the question gets an answer. Check enjoy + -ing again: this is where 'I enjoy to skip' comes back.",
            tiers: [
              { level: "Support", task: "Copy the model and change one thing, then act it." },
              { level: "Core", task: "Write two new lines for the scene." },
              { level: "Stretch", task: "Write four lines, with a reason and a polite disagreement." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l3-u02-l6": {
      objectives: ["I can say -ing sentences fast and write a short paragraph about how people have fun."],
      trim: {
        "Grammar mystery: sports day at Blue Lake": 6,
        "Cliff, lake and plain: run and say": 8,
        "Remember it!": 3,
        "Find the match: who enjoys what?": 8,
      },
      add: [
        {
          after: "Grammar: swimming, dancing, skipping: verb + -ing as a thing",
          slide: drill({
            title: "Grammar drill: -ing and to + verb, both",
            goal: "Change the sentence fast and right, with the -ing after enjoy, finish and good at, and the to after want, hope, decide and need. Then talk about your own life with both.",
            chunks: [
              "Climbing is exciting, but I need to wear a helmet.",
              "She enjoys diving, and she hopes to win the race.",
              "We finished playing at five, so we decided to swim.",
              "Running and jumping are fun, and I want to learn more games.",
              "Are you good at skipping? Do you want to learn it?",
              "He stopped running because he needed to rest.",
            ],
            recycle: ["Have you ever been to a festival?", "I have never seen a lion dance.", "I went there last year."],
            prompts: ["She enjoys climbing. (?)", "We want to swim. (X)", "I finished dancing. (+ so I decided to ___)", "He hopes to win. (T: last year)", "I am good at diving. (P: they)"],
            real: "Real talk: tell your partner what you enjoy, what you finished doing this week, what you hope to do and what you need to practise. Use -ing for the first two and to + verb for the last two. Your partner checks which door each verb uses.",
            slips: "'I enjoy to swim', 'We decided swimming' or 'She want to win'",
            note: "This is the last lesson of the unit, so the drill covers both the unit's -ing grammar and the Level 4 step: ask 'Which door, -ing or to?' for every new verb. The step comes back in Level 4 of Oxford Discover, so use it for real talk, not only for changes.",
            support: ["I enjoy ___ing.", "I want to ___.", "Do you enjoy ___ing?"],
            stretch: "Say two sentences with both doors and a reason: 'I enjoy dancing, so I want to join the school show, and I need to practise every day.'",
            stretchFrames: ["I enjoy ___ing, so I want to ___.", "I finished ___ing, and I need to ___."],
          }),
        },
        {
          after: "Cliff, lake and plain: run and say",
          slide: {
            kind: "fluency",
            title: "Champion sprint: -ing sentences",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right, with the -ing and the is or are.",
            chunks: [
              "Climbing is exciting.",
              "We love dancing in the park.",
              "She is good at diving.",
              "Running and jumping are fun.",
              "What do you enjoy doing?",
            ],
            recycle: ["Where do you play?", "Why do you like it?"],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a word card (climb, dance, dive ...) and the class says a whole sentence." },
              { seconds: 60, say: "Side A asks, side B answers. Then swap." },
              { seconds: 60, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. When it flips, say the whole sentence with the -ing word.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "In the last round, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put the two mistakes you heard most on the board and fix them together. Then go on to round 2.",
            ],
            prompts: ["(card: climb)", "(card: dance)", "(card: dive)", "(card: run and jump)", "(card: skip)"],
            feedback: correct,
            teacherNote: "A quick, high-energy recall of this unit's grammar mixed with last lesson's questions (spaced retrieval keeps the question words from fading). The cards make the children build -ing sentences from a cue every time. Watch for 'is' with two things, a missing -ing after good at, and spelling slips when they hold the cards (runing).",
            tiers: [
              { level: "Support", task: "Say the sentence with a friend, with the frames on the board.", frames: ["___ing is ___.", "I enjoy ___ing.", "She is good at ___ing."] },
              { level: "Core", task: "Say a whole sentence alone for every card." },
              { level: "Stretch", task: "Say two sentences for each card: one with is or are, one with enjoy or good at." },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "Dictogloss: how people have fun",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Plan: remember the rule: -ing names the activity. One thing is, two things are.",
              "Listen: the teacher reads the paragraph once. Just listen.",
              "Listen again and write key words. Then rebuild the paragraph in your group.",
              "Check: compare with the text on the screen. Fix the -ing words, is or are, and the spelling.",
            ],
            text: {
              title: "People have fun in many ways",
              text: "People have fun in many ways. Swimming is fun because the water is cool. My cousin enjoys skipping, and she is good at it. Running and jumping are good for you, so we play tag after school. I love dancing with my friends because the music makes me happy, and I want to learn a new game. Everybody needs fun, so find a game you enjoy!",
            },
            frames: ["People have fun in many ways.", "___ing is ___ because ___.", "Everybody needs fun, so ___."],
            checklist: ["The paragraph starts with a main idea and ends with a closing sentence", "After enjoy, love and good at, the verb has -ing", "One thing is, two things are", "One sentence has enjoy or finish + -ing, and one has want, hope or need + to + verb"],
            sayIt: "Read your group's paragraph aloud to another group, then say the main idea without looking.",
            teacherNote: "This paragraph is a model for the paragraph the children write next in 'Write it': a topic sentence, supporting sentences with because and so, and a closing sentence. Read it at natural speed, twice. When groups compare, ask which sentence is the topic sentence and which is the closing one, so they use the same shape in their own writing.",
            tiers: [
              { level: "Support", task: "Write the key words and the three frames, then rebuild two sentences." },
              { level: "Core", task: "Rebuild the whole paragraph with your group." },
              { level: "Stretch", task: "Rebuild it, then change two sentences to be about you." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Champion talk: how I have fun",
        prompt: "Tell us how you and your family or friends have fun. Use -ing words, and say why each thing is fun.",
        length: "60-90 seconds",
        steps: [
          "Look at the paragraph you wrote in class.",
          "Say it three times to a grown-up or a toy. Each time a little faster, like in the champion talk.",
          "Use at least three -ing words: ___ing is fun, I enjoy ___ing, I am good at ___ing.",
          "Say one thing you want to do or hope to do: I want to ___, I hope to ___.",
          "Record it once. Look at the camera and keep going.",
        ],
        maxSeconds: 180,
        kidSummary: "Use -ing words to say how people have fun, say why, and keep talking without long stops.",
        words: ["swimming", "dancing", "skipping", "running", "climbing", "fun"],
        grammar: ["___ing is ___.", "I enjoy / love ___ing.", "I am good at ___ing.", "Running and jumping are ___.", "I want to ___. / I hope to ___."],
        rubric: [
          { label: "-ing sentences", description: "Uses three or more -ing words correctly: -ing is, enjoy + -ing, good at + -ing.", weight: 3 },
          { label: "Reasons", description: "Says why with because or so.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "Says is with one thing and are with two things, and the -ing and -s endings can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["___ing is fun.", "I enjoy ___ing.", "I am good at ___ing."], tips: ["Point to your paragraph as you speak."] },
          { level: "Core", who: "Most children", frames: ["___ing is ___ because ___.", "I enjoy ___ing with my ___.", "___ing and ___ing are ___."], tips: ["Say one thing and then two things."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Everybody needs fun because ___.", "In my opinion, the best way to have fun is ___ because ___."], tips: ["End with your opinion and a reason."] },
        ],
      },
    },
  },
};
