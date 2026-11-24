import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 11 "Needs and
// Wants" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's language said again and again as
// whole sentences, a little faster each round, with Unit 10's phrases mixed back in) and
// one short writing routine (say it, write it, read it back). Two lessons end with a
// recorded talk for home, built on the routine the class just did. Time comes from games
// and repeats, never from the book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixPlural =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names), often a missing -s on 'cows' or 'hats'. Between rounds 1 and 2, fix them in one minute at the board; children then say the same thing again with the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('I sell three ...?'), point to the frame, or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const fixHeSheS =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes (no names): 'He have', 'She want', 'He doesn't has'. Between rounds, write them on the board and fix them in one minute. Prompt the child to fix it: start the phrase and pause ('He ...?'), point to the frame, hold up a finger for the missing -s, or repeat the error with a rising voice ('She want?'). Children who then say it again use the fixed form. For a sound, say it right and let the child echo. Say every final -s ('has', 'wants', 'needs') clearly yourself.";

export const odL1U11Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u11-l1": {
      objectives: ["I can say 'I sell ___.' and 'I want to buy ___.' fast, without stopping."],
      trim: { "Need hoop, want hoop": 5, "Plain and fancy parade": 4, "Good morning, farm!": 4, "Sleepy cow": 3 },
      add: [
        {
          after: "At our market",
          slide: {
            kind: "fluency",
            title: "Market sprint: sell and buy",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say the whole market sentence, fast and smooth, with no stops.",
            chunks: ["I sell milk.", "I want to buy a hat.", "It's plain.", "It's fancy!", "Thank you!"],
            recycle: ["Do you have a pot? Yes, I do.", "I like soup."],
            rounds: [
              { seconds: 45, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 30, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I sell milk.' or 'I want to buy a hat.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them.",
            ],
            prompts: ["(card: milk)", "(card: a plain hat)", "(card: a fancy hat)", "(card: a cow)", "(card: a dress)"],
            feedback: fixPlural,
            teacherNote: "Whole sentences only, never single words: 'I want to buy a hat' should come out as one smooth piece. Mix in Unit 10's 'Do you have ___?' cards every few turns so last unit's question stays fast. Listen for the missing -s in 'I sell hats' and the dropped 'to' in 'I want to buy'.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I sell ___.", "I want to buy ___."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I want to buy a fancy hat. It's pretty!'", frames: ["I want to buy ___. It's ___!"] },
            ],
          },
        },
        {
          after: "Look and write the words (SB 108 B)",
          slide: {
            kind: "writing",
            title: "Grow my market sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a number or a color word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I sell hats. (add: three)", answer: "I sell three hats." },
              { q: "I want a hat. (add: fancy)", answer: "I want a fancy hat." },
              { q: "I have a cow. (add: big)", answer: "I have a big cow." },
            ],
            frames: ["I sell ___ hats.", "I want a ___ hat."],
            checklist: ["A capital letter at the start", "A full stop at the end", "Hats, cows: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I sell milk and three hats.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u11-l2": {
      objectives: ["I can tell the farmer's story in four parts, faster each time."],
      trim: { "Run and touch": 4, "Mime the farm day": 4, "Act out the story": 8, "Cow cuddle": 3 },
      add: [
        {
          after: "Retell it to a partner",
          slide: {
            kind: "fluency",
            title: "Farmer story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: ["First, the farmer has a cow.", "Next, he sells the cow.", "Then he buys a fancy hat.", "Last, he buys the cow back."],
            recycle: ["I have ___.", "I sell milk."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the picture cards." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Next, three for Then, four for Last.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board (often 'he sell' or 'he buy'); the class fixes them. Then go on to round 2.",
            ],
            prompts: ["(picture: the farmer and the cow)", "(picture: the farmer at the market)", "(picture: the fancy hat)", "(picture: the farmer and the cow again)"],
            feedback: fixHeSheS,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Retelling builds fluency more than accuracy, so the one-minute fix between round 1 and round 2 matters. Listen for 'he sells' and 'he buys': the final -s is the point. Keep the picture cards up for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Then he buys ___.", "Last, he ___."] },
              { level: "Core", task: "Tell all four parts without the frames." },
              { level: "Stretch", task: "Add how his wife feels: 'Then he buys a fancy hat. His wife is angry!'" },
            ],
          },
        },
        {
          after: "Story order: beginning, middle, end",
          slide: {
            kind: "writing",
            title: "Listen and write the market story",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again. Write words you hear: 'farmer', 'cow', 'sells', 'buys', 'wife', 'angry'.",
              "With your partner, write the text again. It does not need to be the same words, but the same story.",
              "Read your text. Is the -s on 'sells' and 'buys'?",
            ],
            text: { title: "The market day", text: "A farmer has a cow. He sells the cow. Then he buys a fancy hat. His wife is angry, so he buys the cow back." },
            frames: ["The farmer has ___.", "He sells ___.", "He buys ___."],
            checklist: ["Capital letters at the start", "A full stop at the end of each sentence", "He sells, he buys: the -s is there"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "Dictogloss: read the text twice at a natural pace, with the children listening first and writing second. After a short reminder that 'he' goes with 'sells' and 'buys', the children rebuild the text together, and the talk about 'sells or sell?' helps the children notice the -s. Accept different words if the story matches.",
            tiers: [
              { level: "Support", task: "Write the key words the teacher gives you and add the frames." },
              { level: "Core", task: "Write the text again with your partner." },
              { level: "Stretch", task: "Add one more sentence: 'His wife is angry because ___.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My farmer story",
        prompt: "Tell the farmer story at home in four parts: First, Next, Then, Last. Show a toy cow or a hat if you have one!",
        length: "30-60 seconds",
        steps: [
          "Look at your picture cards from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell First, Next, Then and Last, and keep talking without long stops.",
        words: ["farmer", "cow", "milk", "market", "sell", "buy", "fancy"],
        grammar: ["First, Next, Then, Last", "He sells ___. He buys ___."],
        rubric: [
          { label: "Four parts", description: "Tells First, Next, Then and Last in order.", weight: 3 },
          { label: "He sells, he buys", description: "Says 'he sells' and 'he buys' with the -s on the end.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: farmer, cow, market, hat.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Last, he ___."], tips: ["Point to your pictures as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Then he buys ___.", "Last, he ___."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["He is ___ because ___.", "My favorite part is when ___."], tips: ["Add how he feels and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u11-l3": {
      objectives: ["I can ask 'Do you have ___?' and then say what he or she has."],
      trim: { "Ollie and Rosie's bags": 6, "Has, needs, wants chart": 7, "Pass the sentence": 6, "Ollie and Rosie": 4, "Sleepy Ollie": 3 },
      add: [
        {
          after: "Tell the class about my partner (SB 113 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: I have, she has",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, then tell the circle what your friend has. Keep the chain going with no stops!",
            chunks: ["Do you have a doll?", "Yes, I do. I have a doll.", "She has a doll.", "He wants a kite.", "He doesn't want a drum."],
            recycle: ["Do you have a pot? Yes, I do.", "I don't have a stone."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a toy card." },
              { seconds: 60, say: "Swap cards. Go faster!" },
              { seconds: 45, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your toy card so only you can see it.",
              "Ask the friend on your left: 'Do you have a ___?' They answer: 'Yes, I do. I have a ___.'",
              "Turn to the circle and say: 'He has a ___.' or 'She has a ___.'",
              "Then your friend turns and asks the next friend.",
              "Teacher: after the last round, put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Do you have ___?", "He has ___. / She has ___."],
            feedback: fixHeSheS,
            teacherNote: "The chain turns 'I have' into 'he has / she has' again and again: every child hears and says the -s form many times in a few minutes, which is what makes it automatic. Time the whole circle and tell them; children love beating their own time. Watch for 'He have' and prompt with a raised finger and 'He h...?'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board, then say 'She has ___.'", frames: ["Do you have a ___?", "Yes, I do. I have ___.", "He / She has ___."] },
              { level: "Core", task: "Ask, answer and tell the circle without looking at the board." },
              { level: "Stretch", task: "Add what the friend does not want: 'She has a doll. She doesn't want a drum.'" },
            ],
          },
        },
        {
          after: "About me (SB 113 D)",
          slide: {
            kind: "writing",
            title: "Fix the has, wants, needs notes",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each note with your partner. Something is wrong!",
              "Find it: has, wants, needs or doesn't. Then fix it.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "He have a cow.", answer: "He has a cow." },
              { q: "She want a kite.", answer: "She wants a kite." },
              { q: "Rosie doesn't wants a drum.", answer: "Rosie doesn't want a drum." },
              { q: "The cow need water.", answer: "The cow needs water." },
            ],
            checklist: ["He / she / a name: has, wants, needs", "After doesn't: have, want, need (no -s)", "A capital letter and a full stop"],
            sayIt: "Say all four fixed notes to your partner, fast.",
            teacherNote: "Vietnamese verbs do not change for he or she, so the missing -s is this class's most common slip; 'doesn't wants' (an -s added after doesn't) is the next. Fix one together first and say the final sounds clearly. Keep the checklist to the three things children can actually check.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 2 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u11-l4": {
      objectives: ["I can ask to borrow something and say thank you, three times, faster each time."],
      trim: { "Swap shop": 5, "What's missing?": 3, "Ollie, Rosie and the toys": 3, "Verb charades (SB 115 F)": 5 },
      add: [
        {
          after: "Borrow and lend (SB 115 E)",
          slide: {
            kind: "fluency",
            title: "Borrow and lend: do it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same borrow and lend talk with three friends. Each talk is smoother.",
            chunks: ["I have a doll. I want a comic book.", "Can I borrow your comic book, please?", "Sure! Here you are.", "Thank you!", "Bring it back, please."],
            recycle: ["He has a kite.", "I sell milk."],
            rounds: [
              { seconds: 60, say: "Partner 1: ask to borrow a toy from your card. Say thank you." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 40, say: "Partner 3: fast and smooth! The listener gives a thumbs up at the end." },
            ],
            steps: [
              "Hold a toy card and a want card. Say what you have and what you want.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, move to a new partner. Swap who asks and who lends.",
              "Say 'Thank you!' with a big smile every time.",
            ],
            feedback: fixPlural,
            teacherNote: "Task repetition: the same talk with a new partner means children do not need to plan again, so they can speak more smoothly. Do not add new language between rounds. Listen for the missing -s in 'comic books' and for 'Can I borrow ... please?' with the question rising. Praise polite voices.",
            tiers: [
              { level: "Support", task: "Say the talk with the frames on the board.", frames: ["I have a ___. I want a ___.", "Can I borrow your ___, please?", "Thank you!"] },
              { level: "Core", task: "Say the talk without looking at the board." },
              { level: "Stretch", task: "Tell the class about your partner: 'She has a doll. She wants a comic book.'" },
            ],
          },
        },
        {
          after: "Say it first (SB 115 Write)",
          slide: {
            kind: "writing",
            title: "Join my things with 'and'",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "I have a doll. I have a ball. (and)", answer: "I have a doll and a ball." },
              { q: "I want a comic book. I want stickers. (and)", answer: "I want a comic book and stickers." },
              { q: "She has pins. She has games. (and)", answer: "She has pins and games." },
              { q: "I need milk. I need a hat. (and)", answer: "I need milk and a hat." },
            ],
            checklist: ["Only one 'I have' or 'she has' in my sentence", "'and' joins the two things", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I have'. This helps the children's own writing on the next page.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all four." },
              { level: "Stretch", task: "Join three: 'I have a doll, a ball and stickers.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u11-l5": {
      objectives: ["I can talk about a friend with 'has', 'wants' and 'needs', faster each time."],
      trim: { "Puppet pile race": 8 },
      add: [
        {
          after: "Over the wall: Ollie and Rosie's cards",
          slide: {
            kind: "fluency",
            title: "Make-believe friend 3-2-1",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 5,
            goal: "Tell the same friend talk to three partners. Each talk is shorter and smoother.",
            chunks: ["Meet my friend.", "She has a green bag.", "She wants a big kite.", "She needs water.", "She doesn't want a drum."],
            recycle: ["Do you have a doll? Yes, I do.", "He sells milk."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your friend talk. The listener counts the sentences on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: fixHeSheS,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 is what makes the second telling more accurate too. Listen for 'she wants' and 'doesn't want'.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["Meet my friend. She has ___.", "She wants ___."] },
              { level: "Core", task: "Say four sentences without the board." },
              { level: "Stretch", task: "Add a 'because' idea: 'She needs water because it is hot.'" },
            ],
          },
        },
        {
          after: "Write like a champion: my make-believe friend",
          slide: {
            kind: "writing",
            title: "Make the champion sentence bigger",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a color or size word.",
              "Write your big sentence. Say it to your partner, then without looking.",
            ],
            items: [
              { q: "He has a bag. (add: green)", answer: "He has a green bag." },
              { q: "She wants a kite. (add: big)", answer: "She wants a big kite." },
              { q: "He needs water. (add: cold)", answer: "He needs cold water." },
              { q: "She doesn't want a drum. (add: loud)", answer: "She doesn't want a loud drum." },
            ],
            frames: ["He / She has a ___ ___.", "He / She wants a ___ ___."],
            checklist: ["has, wants, needs: the -s is there", "After doesn't: no -s", "A capital letter and a full stop"],
            sayIt: "Say your big sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences about your make-believe friend." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My make-believe friend",
        prompt: "Tell us about a make-believe friend. Say what he or she has, wants, needs and does not want. Show a drawing or a toy!",
        length: "30-60 seconds",
        steps: [
          "Draw your make-believe friend or choose a toy.",
          "Say your friend talk three times: each time a little faster, like in class.",
          "Record it once. Use 'has', 'wants' and 'needs'.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say what your friend has, wants and needs, and keep talking without long stops.",
        words: ["farmer", "market", "hat", "dress", "doll", "kite", "water"],
        grammar: ["He / She has ___.", "He / She wants ___.", "He / She needs ___.", "He / She doesn't want ___."],
        rubric: [
          { label: "Has, wants, needs", description: "Says what the friend has, wants and needs.", weight: 3 },
          { label: "The -s and doesn't", description: "Says 'has', 'wants', 'needs', and 'doesn't want' without the -s after doesn't.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Meet my friend", description: "Starts with 'Meet my friend.' and speaks clearly to the camera.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Meet my friend. He / She has ___.", "He / She wants ___."], tips: ["Hold up your drawing."] },
          { level: "Core", who: "Most children", frames: ["Meet my friend. She has ___.", "She wants ___. She needs ___.", "She doesn't want ___."], tips: ["Say one thing she does NOT want."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["He needs ___ because ___.", "My friend is ___."], tips: ["Add a because idea and how your friend feels."] },
        ],
      },
    },
  },
};
