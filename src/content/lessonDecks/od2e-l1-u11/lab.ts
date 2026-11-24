import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 11 "Needs and
// Wants" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10). Every lesson gets a grammar drill (the unit's sentences changed again and
// again: asked, answered, said with "don't", joined with but / because, and finally used
// for real), one more fluency routine (longer chunks, joined ideas, a little faster each
// round, with Unit 10's phrases mixed back in) and one writing routine (sentences with
// two clauses, or a planned paragraph). Two lessons end with a recorded talk for home,
// built on the routine the class just did. Time comes from games and repeats, never from
// the book pages or the grammar. All text is original.

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

const fixPlural =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names), often a missing -s on 'cows' or 'hats', or 'Yes, I have' for 'Yes, I do'. Between rounds 1 and 2, fix them in one minute at the board; children then say the same thing again with the fixed form. For grammar, prompt the child to fix it: start the phrase and pause ('I sell three ...?'), point to the frame, or hold up a finger for the missing -s. For a sound, say it right and let the child echo it. Say every final -s clearly yourself: children copy what they hear.";

const fixHeSheS =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes (no names): 'He have', 'She want', 'He doesn't has'. Between rounds, write them on the board and fix them in one minute. Prompt the child to fix it: start the phrase and pause ('He ...?'), point to the frame, hold up a finger for the missing -s, or repeat the error with a rising voice ('She want?'). Children who then say it again use the fixed form. For a sound, say it right and let the child echo. Say every final -s ('has', 'wants', 'needs') clearly yourself.";

export const odL1U11Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u11-l1": {
      objectives: ["I can say 'I sell ___.' and 'I want to buy ___.' fast, ask about them and join them with 'but' and 'because'."],
      trim: { "Good morning, farm!": 4 },
      drop: ["Need hoop, want hoop", "Plain and fancy parade", "Sleepy cow"],
      add: [
        {
          after: "At our market",
          slide: {
            kind: "fluency",
            title: "Market sprint: sell and buy",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 5,
            goal: "Say the whole market sentence, fast and smooth, with no stops. Join two ideas in one breath.",
            chunks: [
              "I sell milk, and I sell three plain hats.",
              "I want to buy a fancy hat, but it's too big.",
              "Do you want to buy a plain dress? No, I want a fancy dress!",
              "It's plain, but it's pretty. Thank you!",
            ],
            recycle: ["Do you have a pot? Yes, I do.", "I like soup, but I don't like onions."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence and then the follow-up question." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 50, say: "Faster! New partner. How many sentences can you say with 'and' or 'but'?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I sell milk, and I sell three hats.'",
              "Join two ideas with 'and' or 'but'. Then ask your partner one question.",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 3, stop for one minute. Put two mistakes you heard on the board (no names) and the class fixes them.",
            ],
            prompts: ["(card: milk and hats)", "(card: a plain hat, a fancy hat)", "(card: a fancy dress)", "(card: a cow)", "(card: a dress that is too big)"],
            feedback: fixPlural,
            teacherNote: "Whole sentences only, never single words: 'I want to buy a fancy hat, but it's too big' should come out as one smooth piece with a small pause at the comma. Mix in Unit 10's 'Do you have ___?' cards every few turns so last unit's question stays fast. Listen for the missing -s in 'I sell hats' and the dropped 'to' in 'I want to buy'.",
            tiers: [
              { level: "Support", task: "Say the short sentence alone, with the frame on the board.", frames: ["I sell ___.", "I want to buy ___, but ___."] },
              { level: "Core", task: "Join two ideas with 'and' or 'but' without looking at the board, and ask your partner a question." },
              { level: "Stretch", task: "Add a reason: 'I want to buy a fancy hat because it's pretty, but it's too big.'", frames: ["I want to buy ___ because ___."] },
            ],
          },
        },
        {
          after: "Market sprint: sell and buy",
          slide: {
            kind: "fluency",
            title: "Grammar drill: sell it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, then join it with but. Then ask about real things.",
            chunks: [
              "I sell milk.",
              "Do you sell milk?",
              "Yes, I do. / No, I don't.",
              "I don't sell milk, but I sell three hats.",
              "I want to buy a fancy hat, and I want to buy a plain dress.",
              "Does he want to buy a cow? No, he doesn't.",
            ],
            recycle: ["Do you have a pot? Yes, I do.", "I like soup, but I don't like onions."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't, + = add 'but ...' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 90, say: "Real talk: ask your partner what they really want to buy and what their family really needs. Answer with the full short answer and one more sentence with 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence, with -s on things when there are more than one.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you sells' or 'Yes, I sell'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really wants to buy, and remember one answer to tell the class.",
            ],
            prompts: ["I sell hats. (?)", "You want to buy a dress. (X)", "We sell milk. (X +)", "They want to buy a cow. (?)", "I want to buy a plain hat. (+ because)"],
            feedback: "Prompt, do not tell: for 'You sell milk?' hold up one finger and say 'D...?'; for 'Yes, I sell.' repeat it with a rising voice and let the child fix it; for 'I want buy' point to the 'to' in the frame; for a missing -s, tap your wrist. Say the -s and the n't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children say what they really want to buy, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and 'because' and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you want to buy a ___?", "No, I don't. I want to buy a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he and she with the -s, and add a reason: 'She wants to buy a hat, but she doesn't want to buy a dress because it's too big.'" },
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
            minutes: 5,
            steps: [
              "Read the small sentences with the teacher.",
              "Make them bigger: add a number or a color word, or join two ideas with the joining word in brackets.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I sell hats. (add: three, plain)", answer: "I sell three plain hats." },
              { q: "I sell milk. I sell hats. (and)", answer: "I sell milk, and I sell hats." },
              { q: "I want a hat. It is too big. (but)", answer: "I want a hat, but it is too big." },
              { q: "I want to buy a dress. It is fancy. (because)", answer: "I want to buy a dress because it is fancy." },
              { q: "The farmer sells milk. He buys a hat. (then)", answer: "The farmer sells milk, then he buys a hat." },
            ],
            frames: ["I sell ___, and I sell ___.", "I want ___, but ___.", "I want to buy ___ because ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "Hats, cows: the -s is there", "A joining word (and, but, because, then) between the two ideas"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the frames on the board." },
              { level: "Core", task: "Do all five items, with the joining word each time." },
              { level: "Stretch", task: "Write two sentences of your own with 'because' and 'but': 'I want to buy a hat because it is fancy, but I don't have money.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u11-l2": {
      objectives: ["I can tell the farmer's story in four parts, join the parts with 'and', 'but' and 'because', and tell it faster each time."],
      trim: { "Act out the story": 6 },
      drop: ["Run and touch", "Mime the farm day", "Cow cuddle"],
      add: [
        {
          after: "Retell it to a partner",
          slide: {
            kind: "fluency",
            title: "Grammar drill: the farmer says it, asks it, says no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the story sentence fast and right: ask it, answer it, say no, join it with but. Then ask about real things.",
            chunks: [
              "The farmer sells the cow.",
              "Does he sell the cow?",
              "Yes, he does. / No, he doesn't.",
              "He doesn't sell the hat, but he sells the cow.",
              "He sells the cow, and he buys a fancy hat.",
              "I sell milk, but I don't sell cows.",
            ],
            recycle: ["I sell milk, and I sell hats.", "Do you have a pot? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a story sentence and shows a sign (? = ask it, X = say it with doesn't, + = add 'but ...' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a story sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, they." },
              { seconds: 90, say: "Real talk: ask your partner what they really sell, buy or swap, and what their family really needs. Answer with the full short answer and one more sentence with 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = add 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence, with -s after he and she.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does he sells' or 'Yes, he sells'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really needs, and remember one answer to tell the class.",
            ],
            prompts: ["The farmer has a cow. (?)", "He buys a fancy hat. (X)", "He sells the cow. (X +)", "His wife is angry. (+ because)", "I sell milk. (?)"],
            feedback: "Prompt, do not tell: for 'Does he sells?' tap your wrist and say 'Does he s...?'; for 'Yes, he sells.' repeat it with a rising voice and let the child fix it; for 'He no sell' point to doesn't in the frame. Say the -s, doesn't and does clearly yourself.",
            teacherNote: "The story's sentences are the drill, so the children use the grammar for the farmer first and for themselves in round 3. The children first meet does and doesn't as whole chunks here; the grammar page comes in the next lesson, so model each form and do not stop to explain. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you sell ___?", "No, I don't. I sell ___."] },
              { level: "Core", task: "Change every sentence, with I, you, he, she and they." },
              { level: "Stretch", task: "Use he and she with the -s, and add a reason: 'He sells the cow because he wants a hat, but his wife doesn't want a hat.'" },
            ],
          },
        },
        {
          after: "Grammar drill: the farmer says it, asks it, says no",
          slide: {
            kind: "fluency",
            title: "Farmer story: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Partner A tells it, then Partner B. Each round is shorter, smoother and faster. Join the parts with and, but and because.",
            chunks: [
              "First, the farmer has a cow, and he sells milk at the market.",
              "Next, he sells the cow because he wants a fancy hat.",
              "Then he buys the hat, but his wife is angry.",
              "Last, he buys the cow back, and everybody is happy!",
              "What does the farmer want? He wants a fancy hat.",
            ],
            recycle: ["I have ___.", "I sell milk, and I sell hats."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the story, then Partner B. Use the picture cards. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: Partner A tells it fast, then Partner B. The listener asks one question at the end. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Next, three for Then, four for Last.",
              "In each round, Partner A tells the story first. Then Partner B tells it. When the bell rings, change partners.",
              "The listener asks one question at the end ('What does the farmer want?') and gives a thumbs up.",
              "Teacher: after round 1, stop for one minute. Write two sentences you heard with a mistake on the board (often 'he sell' or 'he buy'); the class fixes them. Then go on to round 2.",
            ],
            prompts: ["(picture: the farmer and the cow)", "(picture: the farmer at the market)", "(picture: the fancy hat)", "(picture: the farmer and the cow again)"],
            feedback: fixHeSheS,
            teacherNote: "The same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. This time each part is a longer sentence with a joining word, and the listener asks a real question. Retelling builds fluency more than accuracy, so the one-minute fix between round 1 and round 2 matters. Listen for 'he sells' and 'he buys': the final -s is the point. Keep the picture cards up for Support children.",
            tiers: [
              { level: "Support", task: "Tell the four parts with the frames on the board.", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Then he buys ___.", "Last, he ___."] },
              { level: "Core", task: "Tell all four parts with a joining word in each: and, because, but.", frames: ["Next, he sells ___ because ___.", "Then he buys ___, but ___."] },
              { level: "Stretch", task: "Add how the wife feels and why, and answer the listener's question: 'His wife is angry because the cow is gone. She needs milk, but he wants a hat.'" },
            ],
          },
        },
        {
          after: "Story order: beginning, middle, end",
          slide: {
            kind: "writing",
            title: "My farmer story: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to First, Next, Then and Last, and to and, because and but.",
              "Plan: write two or three key words for each box. A little drawing helps, but you do not need one.",
              "Write: four to six sentences. Start with First, Next, Then and Last, and use and, because or but at least twice.",
              "Check: tick the checklist. Your partner points to every 'he sells' and 'he buys' and every joining word.",
              "Teacher: look only at capital letters, the -s on sells and buys, and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: The farmer's day",
              text: "First, a farmer has a cow, and he sells milk. Next, he sells the cow because he wants a fancy hat. Then he buys the hat, but his wife is angry. Last, he buys the cow back, and everybody is happy!",
            },
            organiser: [
              { label: "Beginning", prompt: "Key words: farmer, cow, milk. Who has what? What does he sell?" },
              { label: "Middle", prompt: "Key words: sells, buys, fancy hat, wife. What does he sell and why? What does he buy? (two or three sentences)" },
              { label: "End", prompt: "Key words: angry, cow, happy. How does his wife feel? What does he do last?" },
            ],
            frames: ["First, the farmer has ___, and ___.", "Next, he sells ___ because ___.", "Then he buys ___, but ___.", "Last, he ___, and ___!"],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "He sells, he buys: the -s is there", "First, Next, Then, Last: the words are in order", "At least two joining words: and, because, but"],
            sayIt: "Read your story to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "A paragraph for grades 2-4: four to six sentences, planned with key words in three boxes (the middle box holds two or three sentences). A drawing is optional. The joining words are the new step: model one with 'and', one with 'because' and one with 'but' before the children write. This paragraph is also the script for the recorded talk at home, so the child tells it again for the camera. Mark only three things (capital letters, -s on sells and buys, the joining words) and let the child find the mistake from your dot. The model is the school's own, not the book's text.",
            tiers: [
              { level: "Support", task: "Write four sentences with the frames, and one joining word.", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Then he buys ___.", "Last, he ___."] },
              { level: "Core", task: "Write four to five sentences: First, Next, Then and Last, with 'and', 'because' or 'but' at least twice." },
              { level: "Stretch", task: "Write five to six sentences and give a reason for each part: 'His wife is angry because the cow is gone, and she needs the milk.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My farmer story",
        prompt: "Tell the farmer story at home in four parts: First, Next, Then, Last. Join the parts with and, but and because. Show a toy cow or a hat if you have one!",
        length: "60-90 seconds",
        steps: [
          "Look at your key words and pictures from class.",
          "Say the story three times to a grown-up or a toy. Each time a little faster and smoother.",
          "Use 'and', 'but' or 'because' at least two times. End with a question for the listener: 'What do you think the farmer wants?'",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell First, Next, Then and Last, join your ideas with and, but and because, and keep talking without long stops.",
        words: ["farmer", "cow", "milk", "market", "sell", "buy", "fancy"],
        grammar: ["First, Next, Then, Last", "He sells ___. He buys ___.", "and, but, because"],
        rubric: [
          { label: "Four parts", description: "Tells First, Next, Then and Last in order.", weight: 3 },
          { label: "He sells, he buys", description: "Says 'he sells' and 'he buys' with the -s on the end.", weight: 3 },
          { label: "Joins ideas", description: "Joins ideas with and, but or because at least twice, or asks the listener a question at the end.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: farmer, cow, market, hat.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, the farmer has ___.", "Next, he sells ___.", "Then he buys ___.", "Last, he ___."], tips: ["Point to your key words as you speak.", "Say who and what in every part."] },
          { level: "Core", who: "Most children", frames: ["First, the farmer has ___, and ___.", "Next, he sells ___ because ___.", "Then he buys ___, but ___.", "Last, he ___."], tips: ["Use and, because and but at least two times."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["His wife is ___ because ___.", "My favorite part is when ___ because ___.", "What do you think ___?"], tips: ["Add how he feels and why, and ask the listener a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u11-l3": {
      objectives: ["I can ask 'Do you have ___?' and 'Does she have ___?', answer, and say what he or she has, wants and needs."],
      trim: { "Has, needs, wants chart": 5, "Pass the sentence": 5, "Ollie and Rosie": 4 },
      drop: ["Ollie and Rosie's bags", "Sleepy Ollie"],
      add: [
        {
          after: "He has, she has, he doesn't have",
          slide: {
            kind: "fluency",
            title: "Grammar drill: she has it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do or Does, answer it, say it with don't or doesn't, join it with but. Then ask about real things.",
            chunks: [
              "She has a doll.",
              "Does she have a doll?",
              "Yes, she does. / No, she doesn't.",
              "She doesn't have a doll, but she has a kite.",
              "I have a ball, and you have a drum.",
              "Do they have a kite? No, they don't.",
            ],
            recycle: ["The farmer sells the cow, but he doesn't sell the hat.", "Do you have a pot? Yes, I do."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't or doesn't, + = add 'but ...' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 90, say: "Real talk: ask your partner what they really have, want and need. Then tell the class one thing: 'He has ___, but he doesn't have ___.'" },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = add 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. After he and she: has, wants, needs. After doesn't: no -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does she has' or 'She doesn't has'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really has and wants, and remember one answer to tell the class.",
            ],
            prompts: ["I have a doll. (?)", "She has a kite. (X)", "He wants a drum. (?)", "We have a ball. (X +)", "She needs water. (+ because)"],
            feedback: "Prompt, do not tell: for 'Does she has a doll?' hold up one finger and say 'Does she h...?'; for 'She doesn't has' repeat it with a rising voice and let the child fix it; for a missing -s tap your wrist. Say the -s, does and doesn't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about what they really have, so has / have and doesn't are used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and a change of person. The classic mistakes are 'does' plus -s, and 'doesn't has': say the plain form of the verb clearly yourself. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you have a ___?", "No, I don't. I have a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he and she with the -s, and add a reason: 'She needs a hat because it's sunny, but she doesn't have a hat.'" },
            ],
          },
        },
        {
          after: "About me (SB 113 D)",
          slide: {
            kind: "writing",
            title: "My friend: plan, write, check",
            routine: "paragraph",
            genre: "all about my friend",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to has, wants, needs and doesn't want, and to but, because and and.",
              "Plan: write two or three key words for each box. A little drawing helps, but you do not need one.",
              "Write: This is my friend. Then what he or she has, wants, needs and does not want. Use but, because or and at least twice.",
              "Check: tick the checklist. Your partner points to every has and wants and every joining word.",
              "Teacher: look only at the -s on has and wants, 'doesn't want', and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My friend",
              text: "This is my friend. She has a blue bag and a doll. She wants a big kite, but she doesn't want a drum. She needs a hat because it is sunny, and she needs water too.",
            },
            organiser: [
              { label: "My friend", prompt: "Key words: my friend, boy or girl. Who is it?" },
              { label: "Has", prompt: "Key words: two things your friend has. Join them with 'and'." },
              { label: "Wants and needs", prompt: "Key words: wants, doesn't want, needs. What does your friend want? What does he or she not want? What does he or she need, and why?" },
            ],
            frames: ["This is my friend.", "He / She has ___ and ___.", "He / She wants ___, but he / she doesn't want ___.", "He / She needs ___ because ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "He has, she wants: the -s is there", "After doesn't: want, no -s", "At least two joining words: and, but, because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A short paragraph about a real friend in the room, using the unit's grammar: four to six sentences, one idea each, joined with and, but and because. Key words are the plan; a drawing is optional. Say the final -s of has and wants clearly yourself. Mark only three things (the -s on has and wants, doesn't want with no -s, and the joining words) and let the child find the mistake from your dot. Children may use the friend they just talked about in Tell the class about my partner.",
            tiers: [
              { level: "Support", task: "Write four sentences with the frames, and one joining word.", frames: ["This is my friend.", "He / She has ___.", "He / She wants ___.", "He / She needs ___."] },
              { level: "Core", task: "Write four to five sentences about your friend, with 'and', 'but' or 'because' at least twice." },
              { level: "Stretch", task: "Write five to six sentences and give a reason: 'He needs a coat because it is cold, but he doesn't have a coat.'" },
            ],
          },
        },
        {
          after: "Tell the class about my partner (SB 113 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: I have, she has",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, then tell the circle what your friend has and wants. Join your ideas. Keep the chain going with no stops!",
            chunks: [
              "Do you have a doll? Yes, I do. I have a doll and a ball.",
              "She has a doll, and she wants a kite.",
              "He wants a kite, but he doesn't want a drum.",
              "Does he need water? Yes, he does, because it is hot.",
              "What does she want? She wants a big kite.",
            ],
            recycle: ["Do you have a pot? Yes, I do.", "I don't have a stone."],
            rounds: [
              { seconds: 75, say: "Slow chain round the circle. Everyone holds a toy card." },
              { seconds: 75, say: "Swap cards. Go faster, and add 'and' or 'but' to your answer!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your toy card so only you can see it.",
              "Ask the friend on your left: 'Do you have a ___?' They answer: 'Yes, I do. I have a ___ and a ___.'",
              "Turn to the circle and say: 'He has a ___, but he doesn't have a ___.' or 'She has a ___, and she wants a ___.'",
              "Then your friend turns and asks the next friend.",
              "Teacher: after the last round, put two mistakes you heard on the board (no names) and fix them together.",
            ],
            prompts: ["Do you have ___?", "He has ___, but he doesn't have ___.", "What does she want?"],
            feedback: fixHeSheS,
            teacherNote: "The chain turns 'I have' into 'he has / she has' again and again: every child hears and says the -s form many times in a few minutes, which is what makes it automatic. This time the answer is longer, with 'and' or 'but', and the chain adds a 'What does she want?' question. Time the whole circle and tell them; children love beating their own time. Watch for 'He have' and prompt with a raised finger and 'He h...?'.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board, then say 'She has ___.'", frames: ["Do you have a ___?", "Yes, I do. I have ___.", "He / She has ___."] },
              { level: "Core", task: "Ask, answer and tell the circle with 'and' or 'but', without looking at the board.", frames: ["She has ___, and she wants ___.", "He wants ___, but he doesn't want ___."] },
              { level: "Stretch", task: "Add a reason and a question: 'She needs a hat because it is sunny. What does he need?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u11-l4": {
      objectives: ["I can ask to borrow something, say what I have and want, and say thank you, three times, faster each time."],
      trim: { "Ollie, Rosie and the toys": 3, "Verb charades (SB 115 F)": 5 },
      drop: ["Swap shop", "What's missing?", "Thank-you whisper"],
      add: [
        {
          after: "Borrow and lend (SB 115 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: have it, want it, borrow it",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say no, join it with but or because. Then borrow something real.",
            chunks: [
              "I have a doll, but I don't have a comic book.",
              "Do you have a comic book?",
              "Yes, I do. / No, I don't.",
              "Can I borrow your comic book, please?",
              "Sure! Here you are. / Sorry, I need it.",
              "I want a comic book because I like stories.",
            ],
            recycle: ["She has a doll, and she wants a kite.", "I sell milk, but I don't sell hats."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't, + = add 'but ...' or 'because ...', B = ask to borrow it). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she." },
              { seconds: 90, say: "Real talk: ask your partner what they really have in their bag and what they want. Borrow one thing, say thank you and give it back." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = add 'but ...' or 'because ...', B = ask 'Can I borrow your ___, please?'.",
              "Say the WHOLE new sentence. Use please and thank you.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Can I borrowing' or 'Yes, I have'), fix them together, then go on.",
              "In round 3 the drill becomes real: really borrow one thing from your partner and say thank you.",
            ],
            prompts: ["I have a doll. (?)", "You have a comic book. (X)", "I want stickers. (+ because)", "We have pins. (X +)", "She has a game. (?)"],
            feedback: "Prompt, do not tell: for 'Can I borrowing?' hold up one finger and say 'Can I b...?'; for 'Yes, I have.' repeat it with a rising voice and let the child fix it; for a missing -s on 'comic books' tap your wrist. Say please and thank you clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children really borrow and return one thing, so the question is used for meaning. Grades 2-4 can take the full set. Keep it brisk, and keep the polite voices: the question rises, and please comes at the end.",
            tiers: [
              { level: "Support", task: "Use only ? and B with I and you, with the frames on the board.", frames: ["Do you have a ___?", "Can I borrow your ___, please?"] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he and she with the -s, and add a reason: 'He wants a comic book because he likes stories, but he doesn't have one.'" },
            ],
          },
        },
        {
          after: "Grammar drill: have it, want it, borrow it",
          slide: {
            kind: "fluency",
            title: "Borrow and lend: do it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Do the same borrow and lend talk with three friends. In each round, both partners talk. Each talk is smoother.",
            chunks: [
              "I have a doll, but I want a comic book.",
              "Can I borrow your comic book, please? I want to read it.",
              "Sure! Here you are. Bring it back, please.",
              "Thank you! You are a good friend.",
              "What do you want? Do you have a game?",
            ],
            recycle: ["He has a kite, and he wants a drum.", "I sell milk, but I don't sell hats."],
            rounds: [
              { seconds: 55, say: "Round 1: Partner A asks to borrow a toy from the card, says what they have and want, and says thank you, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A does the same talk in less time, then Partner B. Then change partners." },
              { seconds: 45, say: "Round 3: fast and smooth! Partner A, then Partner B. The listener asks one question at the end and gives a thumbs up." },
            ],
            steps: [
              "Hold a toy card and a want card. Say what you have and what you want, with 'but'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "In each round, Partner A talks, then Partner B talks. Swap who asks and who lends. When the bell rings, change partners.",
              "Say 'Thank you!' with a big smile every time.",
            ],
            feedback: fixPlural,
            teacherNote: "Task repetition: the same talk with a new partner means children do not need to plan again, so they can speak more smoothly. The talk is longer now: a 'but' sentence, a reason and a follow-up question. Do not add new language between rounds. Listen for the missing -s in 'comic books' and for 'Can I borrow ... please?' with the question rising. Praise polite voices.",
            tiers: [
              { level: "Support", task: "Say the talk with the frames on the board, and ask for the thing politely.", frames: ["I have a ___. I want a ___.", "Can I borrow your ___, please?", "Thank you!"] },
              { level: "Core", task: "Say the talk with 'but' and a reason, without looking at the board.", frames: ["I have a ___, but I want a ___.", "Can I borrow your ___, please? I want to ___."] },
              { level: "Stretch", task: "Tell the class about your partner and ask a question: 'She has a doll, but she wants a comic book. Does she have a game?'" },
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
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "I have a doll. I have a ball. (and)", answer: "I have a doll and a ball." },
              { q: "I want a comic book. I don't have one. (because)", answer: "I want a comic book because I don't have one." },
              { q: "She has pins. She doesn't have games. (but)", answer: "She has pins, but she doesn't have games." },
              { q: "He wants a kite. He has a drum. (but)", answer: "He wants a kite, but he has a drum." },
              { q: "I borrow a toy. I say thank you. (then)", answer: "I borrow a toy, then I say thank you." },
            ],
            checklist: ["Only one 'I have' or 'she has' where I can join the things with 'and'", "The joining word (and, but, because, then) is there", "A comma before 'but' and 'then'", "A full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'I have', then do one with 'because' and one with 'but' together. This helps the children's own writing on the next page.",
            tiers: [
              { level: "Support", task: "Do items 1, 2 and 3 with the teacher." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two more joined sentences of your own, one with 'because' and one with 'but': 'I have a doll, but I want a game because I like games.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u11-l5": {
      objectives: ["I can talk about a friend with 'has', 'wants' and 'needs', ask about them, say 'doesn't', and join my ideas, faster each time."],
      trim: { "Remember it!": 5 },
      drop: ["Puppet pile race", "He, she, doesn't freeze"],
      add: [
        {
          after: "Grammar: has, wants, needs and doesn't",
          slide: {
            kind: "fluency",
            title: "Grammar drill: has, wants, needs, doesn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with doesn't, join it with but. Then ask about real things.",
            chunks: [
              "He needs water.",
              "Does he need water?",
              "Yes, he does. / No, he doesn't.",
              "He doesn't need a coat, but he needs an umbrella.",
              "I have a doll, and you want a kite.",
              "Do they want a drum? No, they don't.",
            ],
            recycle: ["She has a doll, but she doesn't have a kite.", "Can I borrow your pen, please?"],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it with don't or doesn't, + = add 'but ...' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they, he, she, or a name." },
              { seconds: 90, say: "Real talk: ask your partner what they really have, want and need today. Answer with the full short answer and one more sentence with 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Does, X = say it with don't or doesn't, + = add 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. After he and she: has, wants, needs. After does and doesn't: no -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Does he needs' or 'He doesn't wants'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what your partner really needs, and remember one answer to tell the class.",
            ],
            prompts: ["He needs water. (?)", "She wants a kite. (X)", "I have a doll. (X +)", "They want a game. (?)", "Ollie needs an umbrella. (+ because)"],
            feedback: "Prompt, do not tell: for 'Does he needs water?' hold up one finger and say 'Does he n...?'; for 'He doesn't wants' repeat it with a rising voice and let the child fix it; for a missing -s tap your wrist. Say the -s, does and doesn't clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children say what they really have, want and need, so the forms are used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, 'but' and a change of person. The classic mistakes are -s after does or doesn't: say the plain verb clearly yourself. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you need ___?", "No, I don't. I need ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they, he and she." },
              { level: "Stretch", task: "Use he, she and names with the -s, and add a reason: 'Rosie wants a puddle because it is rainy, but she doesn't want a hat.'" },
            ],
          },
        },
        {
          after: "Over the wall: Ollie and Rosie's cards",
          slide: {
            kind: "fluency",
            title: "Make-believe friend 3-2-1",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same friend talk to three partners. In each round, both partners talk. Each talk is shorter and smoother. Join your ideas.",
            chunks: [
              "Meet my friend. She is a big green dragon, and she has a red hat.",
              "She wants a big kite, but she doesn't want a drum.",
              "She needs water because she is hot.",
              "Does she have a bag? No, she doesn't, but she has a boat.",
            ],
            recycle: ["Do you have a doll? Yes, I do.", "He sells milk, and he buys hats."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells the friend talk, then Partner B. The listener counts the joining words on their fingers. Then change partners." },
              { seconds: 50, say: "Round 2: Partner A tells it in less time, then Partner B. Then change partners." },
              { seconds: 40, say: "Round 3: fast and smooth! Partner A, then Partner B. The listener asks one question at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Line A talks first, then Line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Do the same in round 2 and round 3, each time a little faster. The listener asks one question at the end.",
            ],
            feedback: fixHeSheS,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity. Do not add new language between rounds; the gain comes from saying the same thing more fluently. This time each sentence has a joining word, and the listener asks a real question at the end. The one-minute fix after round 1 is what makes the second telling more accurate too. Listen for 'she wants' and 'doesn't want'.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, and one joining word.", frames: ["Meet my friend. She has ___.", "She wants ___.", "She needs ___."] },
              { level: "Core", task: "Say four sentences with 'and', 'but' and 'because' without the board.", frames: ["She wants ___, but she doesn't want ___.", "She needs ___ because ___."] },
              { level: "Stretch", task: "Add how your friend feels and why, and answer the listener's question: 'She is happy because she has a kite. She doesn't need a bag.'" },
            ],
          },
        },
        {
          after: "Write like a champion: my make-believe friend",
          slide: {
            kind: "writing",
            title: "My make-believe friend: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 9,
            steps: [
              "Read the model with the teacher. Point to the sentence that says who it is, and to and, but and because.",
              "Plan: write two or three key words for each box. A little drawing helps, but you do not need one.",
              "Write: Meet my make-believe friend. Then what he or she is, has, wants and needs. Use and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every capital letter and every joining word.",
              "Teacher: look only at capital letters, the -s on has, wants and needs, and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My make-believe friend",
              text: "Meet my make-believe friend. He is a big green dragon. He has a red hat and a drum, but he doesn't have a bag. He needs water because he is hot, and he wants a cold drink.",
            },
            organiser: [
              { label: "Who", prompt: "Key words: meet, big, green, dragon. What is he or she? (two sentences: Meet, and He / She is a ___)" },
              { label: "Has", prompt: "Key words: has, doesn't have. What does your friend have? What does he or she not have?" },
              { label: "Needs and wants", prompt: "Key words: needs, wants, because. What does your friend need or want, and why?" },
            ],
            frames: ["Meet my make-believe friend.", "He / She is a ___.", "He / She has ___, but he / she doesn't have ___.", "He / She needs ___ because ___."],
            checklist: ["A capital letter at the start and a full stop at the end of every sentence", "has, wants, needs: the -s is there", "After doesn't: no -s", "At least two joining words: and, but, because"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A short paragraph that is also the script for the recorded talk at home: the child tells the same sentences to the camera. Four to six sentences planned with key words in three boxes; a drawing is optional. Mark only three things (capital letters, the -s on has, wants and needs, and the joining words) and let the child find the mistake from your dot. Make-believe friends can be animals, robots or dragons; the grammar is the same.",
            tiers: [
              { level: "Support", task: "Write four sentences with the frames, and one joining word.", frames: ["Meet my make-believe friend.", "He / She is a ___.", "He / She has a ___.", "He / She wants a ___."] },
              { level: "Core", task: "Write four to five sentences about your make-believe friend, with 'and', 'but' or 'because' at least twice." },
              { level: "Stretch", task: "Write five to six sentences and add how he or she feels and why: 'She is happy because she has a kite, but she needs a bag.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My make-believe friend",
        prompt: "Tell us about a make-believe friend. Say what he or she has, wants, needs and does not want, and join your ideas with and, but and because. Show a drawing or a toy!",
        length: "60-90 seconds",
        steps: [
          "Choose a toy or draw your make-believe friend. Write a few key words.",
          "Say your friend talk three times: each time a little faster, like in class.",
          "Use 'has', 'wants' and 'needs', and use 'and', 'but' or 'because' at least two times. End with a question for the listener: 'What does your friend need?'",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what your friend has, wants and needs, join your ideas with and, but and because, and keep talking without long stops.",
        words: ["farmer", "market", "hat", "dress", "doll", "kite", "water"],
        grammar: ["He / She has ___.", "He / She wants ___.", "He / She needs ___.", "He / She doesn't want ___.", "and, but, because"],
        rubric: [
          { label: "Has, wants, needs", description: "Says what the friend has, wants and needs.", weight: 3 },
          { label: "The -s and doesn't", description: "Says 'has', 'wants', 'needs', and 'doesn't want' without the -s after doesn't.", weight: 3 },
          { label: "Joins ideas", description: "Joins ideas with and, but or because at least twice, or asks the listener a question at the end.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Meet my friend", description: "Starts with 'Meet my friend.' and speaks clearly to the camera.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["Meet my friend. She has ___.", "She wants ___.", "She needs ___."], tips: ["Hold up your drawing or key words."] },
          { level: "Core", who: "Most children", frames: ["Meet my friend. She has ___, and ___.", "She wants ___, but she doesn't want ___.", "She needs ___ because ___."], tips: ["Say one thing she does NOT want, and use because once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["She is ___ because ___.", "What do you think she needs?"], tips: ["Add how your friend feels and why, and ask the listener a question."] },
        ],
      },
    },
  },
};
