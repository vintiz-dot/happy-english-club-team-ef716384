import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 15 "Shake, Strike
// and Play" (src/lib/lessonDecks/lab.ts puts it into the decks). Venus is in grades 2-4
// (ages 7-10). Every lesson gets a grammar drill (the unit's grammar and key sentences
// changed fast: asked, said in the negative, joined with and/but/because, said about other
// people, then used for real talk about the children), one more fluency routine with longer
// phrases ("I'm shaking the tambourine, and she's striking the drum"), and a writing routine
// that joins ideas. Two lessons end with a recorded talk for home. Time comes from games and
// repeats pitched at younger children, never from the book pages or the grammar. All text
// is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, or start the phrase and pause ('I'm ... ?', 'She's shak... ?'), or hold up a finger for the missing 'am / is / are' or the missing -ing. Example: a child says 'He play the drum.' Say 'He's ...?' with rising voice and wait; the child says 'He's playing the drum.' For a sound, just say it right and let them echo it (strike, not 'srike'). Say every -ing, -s and final sound clearly yourself: children copy what they hear.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U15Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u15-l1": {
      objectives: ["I can say 'I want a ___, please.' and 'You can strike it, but you can't shake it.' in longer sentences, without stopping."],
      trim: { "The mystery music bag": 3, "Guess the instrument": 4 },
      drop: ["Shake it, strike it (Simon says)", "Quiet drum"],
      add: [
        {
          after: "At the music shop",
          slide: {
            kind: "fluency",
            title: "Grammar drill: want it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas. Then talk about the instruments you really want.",
            chunks: [
              "I want a drum, please.",
              "Do you want a drum? Yes, I do. / No, I don't.",
              "I don't want a drum, but I want a tambourine.",
              "Can you strike it? Yes, I can. / No, I can't.",
              "You can shake a bell, but you can't strike it.",
              "We want cymbals because they are loud.",
            ],
            recycle: ["His house is old, but it is big.", "Is your street quiet? Yes, it is."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner which instruments they really want and which they don't. Answer with the short answer and one more sentence with 'because' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do or Can, X = say it with don't or can't, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Say the a before the instrument (a drum) and the -s when there is more than one (cymbals, maracas).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you want drum?' or 'Yes, I want'), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner wants, and remember one thing to tell the class.",
            ],
            prompts: ["I want a drum. (?)", "You can strike it. (X)", "We want a bell. (+ because it is small)", "They want cymbals. (X +)", "You can shake it. (? with Can)"],
            feedback: "Prompt, do not tell: for 'You want a drum?' hold up one finger and say 'D...?'; for 'Yes, I want.' repeat it with a rising voice and let the child fix it; for 'I no want' or 'I can't to strike' point to the frame; for 'I want drum' tap the board where the a goes; for a missing -s on cymbals, tap your wrist. Say the final sounds in 'strike it' and 'can't' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children say which instruments they really want, so the forms are used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, a joined sentence and a change of person. In this first lesson the sentences come from the music shop role-play, so the children already know the words. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you want a ___?", "Yes, I do. / No, I don't.", "I don't want a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she with -s, and say why: 'She wants a drum because it is loud. Does she want a bell? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Grammar drill: want it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Instrument shop sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole long sentence, fast and smooth, with no stops, and ask a question back.",
            chunks: [
              "I want a drum, please, because it is loud.",
              "Here you are. You can strike it, but you can't shake it.",
              "Do you want a tambourine, too? Yes, I do. You can shake it!",
              "Thank you! Can you strike the triangle, and can I shake the maracas?",
            ],
            recycle: ["His house is old.", "Is your street quiet?"],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows two instrument cards, the class says the whole sentence with 'because', 'but' or 'and'." },
              { seconds: 75, say: "Pairs: one is the shopper and one is the shopkeeper. The shopper asks a question back. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many long sentences can you say? Count them on your fingers." },
            ],
            steps: [
              "Look at the cards. Say a WHOLE sentence: 'I want a drum, please, because it is loud.'",
              "The shopkeeper answers 'Here you are. You can strike it, but you can't shake it.' and the shopper says 'Thank you!' and asks a question back.",
              "Teacher: after round 2, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In round 3, count your long sentences on your fingers.",
            ],
            prompts: ["(cards: drum + bell)", "(cards: tambourine + triangle)", "(cards: cymbals + maracas)", "(cards: drum + cymbals)", "(cards: bell + tambourine)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'I want a drum, please, because it is loud' should come out as one smooth piece, then a question back. Listen for a missing 'a' (I want drum), a dropped final sound in 'strike it' and 'shake it', and 'can't' said like 'can'. Mix in a Unit 14 card every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Say two sentences alone, with the frames.", frames: ["I want a ___ because it is ___.", "You can ___ it, but you can't ___ it."] },
              { level: "Core", task: "Join two ideas with 'because' or 'but' and ask a question back, without looking at the board.", frames: ["I want a ___ because ___.", "Do you want a ___, too?"] },
              { level: "Stretch", task: "Say it about two people and give a reason: 'I want a drum because it is loud, but my friend wants a bell because it is small.'" },
            ],
          },
        },
        {
          after: "What will we read? (SB 149 D)",
          slide: {
            kind: "writing",
            title: "Grow my instrument sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the small sentences with the teacher. Find the joining word in brackets.",
              "Join the small sentences into one bigger sentence with the joining word. Add a describing word if you can.",
              "Write your big sentence. Read it to your partner.",
              "Check: capital letter, full stop, and the joining word is there.",
            ],
            items: [
              { q: "I have a drum. I have a bell. (join with and; add: big, small)", answer: "I have a big drum and a small bell." },
              { q: "I want a tambourine. It is loud. (join with because)", answer: "I want a tambourine because it is loud." },
              { q: "You can strike the triangle. You can't shake it. (join with but)", answer: "You can strike the triangle, but you can't shake it." },
              { q: "I strike the drum. Then I shake the maracas. (join with and then)", answer: "I strike the drum, and then I shake the maracas." },
              { q: "I like the cymbals. They are loud. They are fun. (join with because and and)", answer: "I like the cymbals because they are loud and fun." },
            ],
            frames: ["I have a ___ and a ___.", "I want a ___ because ___.", "You can ___ it, but you can't ___ it."],
            checklist: ["A capital letter at the start and a full stop at the end", "A joining word: and, but, because or then", "a before the instrument: a drum", "-s for more than one: cymbals, maracas"],
            sayIt: "Read your sentences to your partner, then say them again without looking.",
            tiers: [
              { level: "Support", task: "Do the first three with the frames, then draw your favorite instrument.", frames: ["I have a ___ and a ___.", "I want a ___ because ___."] },
              { level: "Core", task: "Join all five sentences, then write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences of your own, each with two joining words: 'I have a big drum, and I strike it because it is loud.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u15-l2": {
      objectives: ["I can talk about my favorite instrument three times, with longer sentences, faster each time.", "I can write four to six sentences about it with and, but and because."],
      trim: { "Word hunt: the yellow words": 4 },
      drop: ["Percussion band", "Beat leader", "Sleepy shaker"],
      add: [
        {
          after: "My favorite instrument",
          slide: {
            kind: "fluency",
            title: "Grammar drill: strike it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas. Then talk about the instruments you really like.",
            chunks: [
              "You strike a drum, and you shake a tambourine.",
              "Do you strike a tambourine? No, I don't. I shake it.",
              "A triangle has three sides, but it doesn't have a big top.",
              "My favorite instrument is the drum because it is loud.",
              "I like drums, and my friend likes bells.",
              "Does your friend like loud music? Yes, she does.",
            ],
            recycle: ["I want a drum, please.", "You can strike it, but you can't shake it."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence about an instrument and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner which instruments they really like and how you play them. Answer with the short answer and one more sentence with 'because' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Say -s on more than one (drums, bells) and the sound at the end of 'strike it'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you strikes' or 'It have two sticks'), fix them together, then go on.",
              "In round 3 the drill becomes real: find out what your partner likes, and remember one thing to tell the class.",
            ],
            prompts: ["You strike a drum. (?)", "A drum has a small top. (X)", "I like the drum. (+ because it is loud)", "You shake a bell. (X +)", "My friend likes cymbals. (? with Does)"],
            feedback: "Prompt, do not tell: for 'Do you strikes a drum?' hold up one finger and say 'Do you str...?'; for 'No, I not.' repeat it with a rising voice and let the child fix it; for 'It have' or 'It haves' point to the frame; for 'My friend like' tap your wrist for the -s. Say the final sounds in 'strike it' and 'likes' clearly yourself.",
            teacherNote: "The reading-lesson sentences about how you play each instrument are the drill, so the children hear the new forms in words they already know. Round 3 makes it real: they say which instruments they like. Grades 2-4 can take the full set: questions, short answers, negatives, a joined sentence and a change of person. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you ___ a ___?", "Yes, I do. / No, I don't.", "I don't ___ it."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she with -s, and say why: 'She likes the drum because it is loud. Does she like the bell? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Grammar drill: strike it, ask it, say no",
          slide: {
            kind: "fluency",
            title: "My instrument 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same instrument talk to three friends. Each talk is shorter and smoother, and it has joining words.",
            chunks: [
              "My favorite instrument is the drum because it is loud and big.",
              "You strike it with two sticks, but you don't shake it.",
              "It has a big, round top, and it makes a deep sound.",
              "What is your favorite instrument? I like it a lot!",
            ],
            recycle: ["Her house is big, but it is old.", "Is your home in the city? No, it isn't."],
            rounds: [
              { seconds: 75, say: "First partner: tell your instrument talk. The listener counts the sentences on their fingers and asks one question at the end." },
              { seconds: 60, say: "New partner: the same talk in less time." },
              { seconds: 45, say: "Another new partner: fast and smooth! The listener says 'Boom!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "After each round, when the bell rings, line B moves one step to the left: a new partner.",
              "Then swap jobs: line B talks and line A listens, with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly, now with 'because', 'but' and 'and' inside the sentences. Listen for 'You strike it' with the final sound of 'strike' clear, and 'the' before the instrument.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, with 'because' once.", frames: ["My favorite instrument is the ___ because ___.", "You ___ it, but you don't ___ it."] },
              { level: "Core", task: "Say four sentences with 'because', 'but' and 'and', without the board." },
              { level: "Stretch", task: "Add a detail and a question: 'It has two sticks, and it's very loud! Do you like loud music?'" },
            ],
          },
        },
        {
          after: "Draw and label my instrument",
          slide: {
            kind: "writing",
            title: "My favorite instrument: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the first sentence, the details and the ending, and find the joining words: because, but, and, then.",
              "Plan: look at your drawing. Write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with My favorite instrument is the, You strike it, It is, Then.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, the word the before the instrument and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My drum",
              text: "My favorite instrument is the drum because it is loud. You strike it with two sticks, but you don't shake it. It is big and round, and it has a deep sound. Then I play it with my friends. I like the drum a lot!",
            },
            organiser: [
              { label: "My instrument", prompt: "Key words: the name of your favorite instrument, and why you like it (loud? fun?). Draw it if you like." },
              { label: "How you play it", prompt: "Key words: strike or shake, and what you use (sticks? hands?)." },
              { label: "What it is like", prompt: "Key words: its shape, color or sound (big, round, soft, deep)." },
              { label: "Then / the end", prompt: "Key words: who you play with, and a happy ending." },
            ],
            frames: ["My favorite instrument is the ___ because ___.", "You strike it / shake it ___, but you don't ___ it.", "It is ___ and ___, and it has ___.", "Then I ___.", "I like the ___ a lot!"],
            checklist: ["Four to six sentences: what it is, how you play it, what it is like, an ending", "At least two joining words: and, but, because or then", "A capital letter at the start and a full stop or ! at the end", "the before the instrument: the drum"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking, with the joining words.",
            teacherNote: "A paragraph about the child's own instrument, planned with key words (and a drawing if the child likes), so no full sentences are written before the real writing. The frames are the sentences; children may copy and complete them, and the joining words carry the second clause. Mark only three things (capital letters, the before the instrument, joining words) and let the child find the mistake from your dot. The child's paragraph can be the script for the recorded talk 'My favorite instrument talk'. The 3-2-1 fluency slide earlier in the lesson is the oral rehearsal for this text.",
            tiers: [
              { level: "Support", task: "Copy three frames and fill in the blanks; use 'because' once.", frames: ["My favorite instrument is the ___ because ___.", "You ___ it."] },
              { level: "Core", task: "Write four or five sentences with 'because' and 'but', and a happy ending." },
              { level: "Stretch", task: "Write six sentences, add 'Then', and end with a question to the reader: 'Do you like drums?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My favorite instrument talk",
        prompt: "Show an instrument or a drawing of one. Tell us its name, how you play it and why you like it. Join your ideas with 'and', 'but' or 'because', and end with a question for the viewer.",
        length: "60-90 seconds",
        steps: [
          "Find an instrument or a pot and a spoon to be your drum. Or look at your paragraph and your drawing from class.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, with your joining words.",
          "Record it once. Smile and show your instrument to the camera. End with a question: 'Do you like drums?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say your favorite instrument, how you play it and why you like it, join your ideas with 'and', 'but' or 'because', and ask a question at the end.",
        words: ["drum", "tambourine", "triangle", "cymbals", "strike", "shake"],
        grammar: ["My favorite instrument is the ___ because ___.", "You strike it, but you don't shake it.", "and / but / because"],
        rubric: [
          { label: "Instrument and how to play", description: "Says the name and 'You strike it.' or 'You shake it.'", weight: 3 },
          { label: "Joining ideas", description: "Joins two ideas in a sentence with 'and', 'but' or 'because', at least twice, and asks the viewer a question at the end.", weight: 3 },
          { label: "Unit words", description: "Uses words from the unit: drum, tambourine, strike, shake.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Clear endings", description: "The sound at the end of 'strike it' and 'shake it' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["My favorite instrument is the ___ because ___.", "You ___ it."], tips: ["Hold up your instrument as you speak.", "Use 'because' once."] },
          { level: "Core", who: "Most children", frames: ["My favorite instrument is the ___ because ___.", "You ___ it, but you don't ___ it.", "It is ___ and ___."], tips: ["Use 'because' and 'but' once each."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["It has ___, and it makes a ___ sound.", "Do you like ___? I like it because ___."], tips: ["Add a detail and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u15-l3": {
      objectives: ["I can say what people are doing, ask about it and say no: 'I'm shaking it. Is she striking it? No, she isn't.'"],
      trim: { "Mime and guess (SB 153 E)": 7 },
      drop: ["Freeze and mime", "Rosie's quiet time"],
      add: [
        {
          after: "Am, is, are walk",
          slide: {
            kind: "fluency",
            title: "Grammar drill: I'm playing, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas. Then say what your friends are really doing now.",
            chunks: [
              "I'm shaking the tambourine.",
              "Are you shaking the tambourine? Yes, I am. / No, I'm not.",
              "She isn't striking the drum, but she's shaking the tambourine.",
              "We're making music because it's fun.",
              "Is he playing the cymbals? Yes, he is. / No, he isn't.",
              "They're clapping, and I'm singing.",
            ],
            recycle: ["You can strike it, but you can't shake it.", "A drum is loud, and a triangle is soft."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we, they." },
              { seconds: 90, say: "Real talk: look around the room. Ask your partner what a friend is really doing now, and answer with the short answer and one more sentence with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it (Are you ...? Is he ...?), X = say it with not, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Say the be word (am, is, are) before every -ing word.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'You shaking?' or 'He playing'), fix them together, then go on.",
              "In round 3 the drill becomes real: look at a friend, say what they are doing, and ask your partner if you are right.",
            ],
            prompts: ["I'm striking the drum. (?)", "You're shaking the bell. (X)", "He's clapping. (+ and she's singing)", "They're playing the drums. (X +)", "We're listening. (? she)"],
            feedback: "Prompt, do not tell: for 'You shaking the bell?' hold up one finger and say 'Are y...?'; for 'Yes, I shaking.' repeat it with a rising voice and let the child fix it; for 'He playing' start 'He's ...?' and wait; for 'I'm no clapping' point to the not in the frame. Say the be words and the -ing clearly yourself.",
            teacherNote: "The grammar of the lesson is the drill: the same sentence is asked, said with not, joined and said about someone else, so the be word becomes automatic. Vietnamese does not put a be word before an action word, so listen for the missing am / is / are. Round 3 makes it real: the children look at friends in the room and say what they are doing. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Are you ___ing the ___?", "Yes, I am. / No, I'm not.", "I'm not ___ing."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she, and say why: 'She's shaking the bell because it's soft. Is he striking it? No, he isn't. He's clapping.'" },
            ],
          },
        },
        {
          after: "Tell the class what my partner is doing (SB 153 F)",
          slide: {
            kind: "fluency",
            title: "Question chain: What are you doing?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Use longer answers and keep the chain going with no stops!",
            chunks: [
              "What are you doing? I'm shaking the tambourine, and I'm singing.",
              "What is he doing? He's striking the drum, but he isn't clapping.",
              "Are you playing the cymbals? No, I'm not. I'm playing the triangle.",
              "What are they doing? They're making music because it's fun.",
              "Why are you shaking it? I'm shaking it because it's loud!",
            ],
            recycle: ["His bakery is in the city.", "Her home is in the orchard."],
            rounds: [
              { seconds: 80, say: "Slow chain round the circle. Everyone mimes an instrument and gives a long answer." },
              { seconds: 70, say: "Swap instruments. Ask a follow-up question and go faster!" },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Mime an instrument so only your friends can see.",
              "Ask the friend on your left: 'What are you doing?'",
              "They answer with a long sentence: 'I'm shaking the tambourine, and I'm singing.' Then they turn and ask the next friend.",
              "Sometimes ask about someone else ('What is she doing?') or ask 'Why?' and answer with 'because'.",
              "Teacher: after round 2, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["What are you doing?", "What is he / she doing?", "Are you ___ing the ___?", "Why are you ___ing it?"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'I'm + -ing' automatic, and now the answers are longer, with 'and', 'but' and 'because'. Vietnamese does not put a be word before an action word, so children often say 'I playing' or 'He play': listen for the missing be and the missing -ing, and prompt with a raised finger and 'I'm ...?' Time the whole circle and tell them; children love beating their own time.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board, and join two ideas with 'and'.", frames: ["I'm ___ing the ___, and I'm ___ing.", "He's / She's ___ing the ___."] },
              { level: "Core", task: "Ask and answer without looking at the board, and add a negative: 'I'm not striking it. I'm shaking it.'" },
              { level: "Stretch", task: "Ask a follow-up question and answer with 'because': 'Why are you shaking it? I'm shaking it because it's loud!'" },
            ],
          },
        },
        {
          after: "Write what I'm doing (WB 131-133 prep)",
          slide: {
            kind: "writing",
            title: "Our class band: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 7,
            steps: [
              "Read the model with the teacher. Point to every be word (I'm, is, isn't, we're) and find the joining words: because, and, but.",
              "Plan: look at your drawing of the band. Write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with This is, I'm, My friend is, They are.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, the be word (am, is, are) before the -ing word and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Our band",
              text: "This is our class band. I'm shaking the red tambourine because I like the sound. My friend is striking the drum, and she isn't clapping. The drum is loud, but I like it. We're making music, and it's fun!",
            },
            organiser: [
              { label: "Our band", prompt: "Key words: where the band is and who is in it. Draw it if you like." },
              { label: "Me", prompt: "Key words: your instrument, what you are doing and why (because ...)." },
              { label: "My friend", prompt: "Key words: a friend, an instrument, and one thing he or she is not doing." },
              { label: "The end", prompt: "Key words: what you are all doing, and how it feels." },
            ],
            frames: ["This is our class band.", "I'm ___ing the ___ because ___.", "My friend is ___ing the ___, and he / she isn't ___ing.", "We're ___ing, and it's ___!"],
            checklist: ["Four to six sentences: our band, me, my friend, the end", "At least two joining words: and, but or because", "am / is / are before the -ing word: I'm shaking, my friend is striking", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your band paragraph to your partner in a band-leader voice. Then tell it again without looking.",
            teacherNote: "A present-continuous paragraph: the child looks at a picture or at the band in the room and says what is happening now, then joins ideas with 'and', 'but' and 'because'. Vietnamese does not put a be word before an action word, so the dot is for a missing am / is / are or a missing -ing. The frames are the sentences; children may copy and complete them. The question chain earlier in the lesson is the oral rehearsal.",
            tiers: [
              { level: "Support", task: "Copy three frames and fill in the blanks; use 'because' once.", frames: ["I'm ___ing the ___ because ___.", "My friend is ___ing the ___."] },
              { level: "Core", task: "Write four or five sentences: our band, me, my friend, the end, with 'and' and 'because'." },
              { level: "Stretch", task: "Write six sentences, add a sentence with 'but' and 'not': 'I'm not clapping, but I'm singing.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u15-l4": {
      objectives: ["I can say how an instrument sounds and why I like it: 'A drum is loud, but a triangle is soft.'"],
      trim: { "Fast, slow, loud, soft": 3, "Line up A to Z (SB 155 F)": 6 },
      drop: ["The conductor says", "Thank-you drum"],
      add: [
        {
          after: "How does a drum sound? (SB 154 Think)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: loud or soft, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas. Then talk about the sounds you really like.",
            chunks: [
              "A drum is loud, and a triangle is soft.",
              "Is a drum loud? Yes, it is. / No, it isn't.",
              "Cymbals aren't soft, but they're fun.",
              "Are cymbals loud? Yes, they are. / No, they aren't.",
              "I like the drum because it's loud.",
              "My friend likes loud music, but she doesn't like cymbals.",
            ],
            recycle: ["I'm shaking the tambourine.", "Is she striking the drum? No, she isn't."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence about an instrument and shows a sign card, B changes it. Swap at the clap. Change the thing too: a drum, drums, it, they." },
              { seconds: 90, say: "Real talk: ask your partner which sounds they really like (loud? soft? fast? slow?) and which they don't. Answer with the short answer and one more sentence with 'because' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it (Is a drum loud? Are drums loud?), X = say it with isn't / aren't, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Say is with one thing (a drum is) and are with more than one (drums are).",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'A drum loud' or 'Drums is loud'), fix them together, then go on.",
              "In round 3 the drill becomes real: find out which sounds your partner likes, and remember one thing to tell the class.",
            ],
            prompts: ["A drum is loud. (?)", "A triangle is loud. (X)", "I like the bell. (+ because it's soft)", "Drums are loud. (X +)", "A tambourine is soft. (? are: tambourines)"],
            feedback: "Prompt, do not tell: for 'A drum loud' hold up one finger and say 'A drum i...?'; for 'Yes, it loud.' repeat it with a rising voice and let the child fix it; for 'Drums is loud' tap two fingers for are; for a lost -d in 'loud' or -t in 'soft', say it right and let them echo. Say the final sounds in 'loud' and 'soft' clearly yourself.",
            teacherNote: "The sound words are the drill: the same sentence is asked, said with not, joined and said about more than one thing, so is / are and the end sounds become automatic. Round 3 makes it real: they say which sounds they really like. Grades 2-4 can take the full set: questions, short answers, negatives, a joined sentence and a change of person. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one thing (a drum), with the frames on the board.", frames: ["Is a ___ loud / soft?", "Yes, it is. / No, it isn't.", "A ___ isn't ___."] },
              { level: "Core", task: "Change every sentence, with one thing and more than one (drums, bells), and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she with -s, and say why: 'She likes the triangle because it is soft. Does she like cymbals? No, she doesn't.'" },
            ],
          },
        },
        {
          after: "Tell your partner about an instrument (SB 155 Write)",
          slide: {
            kind: "fluency",
            title: "Sound talk: say it again",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Say the same sound talk again with a new partner. It gets smoother each time, and it has joining words.",
            chunks: [
              "A drum is loud, but a triangle is soft.",
              "I like the drum because it's loud, and you strike it with two sticks.",
              "Is a tambourine loud? No, it isn't, but it's fun!",
              "What is your favorite instrument, and why?",
              "My favorite instrument is the ___ because it's ___.",
            ],
            recycle: ["I'm shaking the tambourine, and she's striking the drum.", "Is he playing the cymbals? No, he isn't."],
            rounds: [
              { seconds: 60, say: "Round 1: Partner A tells about two instruments (how you play them and how they sound), then Partner B does the same. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells the same two instruments again, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner again. Same talk, smooth and fast! Partner A, then Partner B." },
            ],
            steps: [
              "Pick two instruments. Say what each one is, how it sounds and which one you like, with 'but' or 'because'.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round, Partner A talks first, then Partner B. When the bell rings, find a new partner and say the same talk again.",
              "The listener asks one question at the end ('What is your favorite instrument, and why?') and holds up one finger for each sentence they hear.",
            ],
            feedback: correct,
            teacherNote: "Task repetition: same talk, new listener. The children know what to say, so they can spend their attention on saying it smoothly, now with 'but' and 'because' inside the sentences. Listen for 'A drum loud' (missing is) and a lost -d or -t at the end of 'loud' and 'soft'. Do not add new language between rounds.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames, with 'but' or 'because' once.", frames: ["A ___ is ___, but a ___ is ___.", "I like the ___ because it's ___."] },
              { level: "Core", task: "Say four or five sentences about two instruments with 'but', 'because' and 'and', without the board." },
              { level: "Stretch", task: "Add a question and an opinion: 'I like the drum because it's loud, but my friend likes the triangle. What is your favorite, and why?'" },
            ],
          },
        },
        {
          after: "Write about my instrument (SB 155 Write, WB 135)",
          slide: {
            kind: "writing",
            title: "Dictogloss: the loud drum",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Remember: 'A drum is loud.' We say is after the thing, and are after more than one.",
              "Listen to the teacher read the text. Do not write yet.",
              "Listen again and write the key words you hear: drum, striking, tambourine, loud, soft, because.",
              "In your group, build the text. Check the joining words: and, but, because. Then check it with the teacher.",
            ],
            text: {
              title: "The band",
              text: "Ollie has a drum, and he is striking it. Rosie is shaking a tambourine, but she isn't striking it. The drum is loud because it is big. The tambourine is soft, and it is pretty. They are making music together.",
            },
            frames: ["___ has a ___, and he / she is ___ing it.", "The ___ is loud / soft because ___.", "___ is ___ing, but he / she isn't ___ing."],
            checklist: ["Every sentence starts with a capital letter", "is is there: The drum is loud", "-ing at the end: striking, shaking", "The joining words are there: and, but, because"],
            sayIt: "Read your group's text aloud, then say it again without looking.",
            teacherNote: "Dictogloss: read the text twice at a natural speed, then let the groups rebuild it from their key words. The text has four joining words, so the groups must hear how the sentences are put together. The talk inside the group is the learning. Keep the text folded on the screen until the groups have finished, then compare. Praise a good version that is not word for word.",
            tiers: [
              { level: "Support", task: "Write the key words and use the frames to make three sentences." },
              { level: "Core", task: "Rebuild the text with your group, with the joining words." },
              { level: "Stretch", task: "Rebuild it, then add two more sentences about a new instrument, with 'because' and 'but'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u15-l5": {
      objectives: ["I can tell what the band is doing, three times, with longer sentences, faster each time.", "I can write four to six sentences about the band with and, but and because."],
      trim: {},
      drop: ["Freeze band", "Freeze dance with the words"],
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: what is happening now?",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, say no, join two ideas. Then say what your friends are really doing now.",
            chunks: [
              "Ollie is striking the drum.",
              "Is Rosie shaking the tambourine? Yes, she is. / No, she isn't.",
              "Rosie isn't striking the drum, but she's shaking the tambourine.",
              "We're making music, and they're listening.",
              "Are you clapping? No, I'm not. I'm listening because the music is soft.",
              "What is he doing? He's playing the cymbals!",
            ],
            recycle: ["A drum is loud, but a triangle is soft.", "I want a drum, please, because it is loud."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say no, + = add 'and', 'but' or 'because ...'). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she, we, they, a name." },
              { seconds: 90, say: "Real talk: look at your friends. Ask your partner what someone is really doing now, and answer with the short answer and one more sentence with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = ask it (Is Rosie ...? Are you ...?), X = say it with not, + = add 'and ...', 'but ...' or 'because ...'.",
              "Say the WHOLE new sentence. Say the be word (am, is, are) before every -ing word, and use the right one for the person.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Rosie shaking' or 'We is clapping'), fix them together, then go on.",
              "In round 3 the drill becomes real: look at a friend, say what they are doing, and ask your partner if you are right.",
            ],
            prompts: ["Ollie is striking the drum. (?)", "Rosie is shaking the bell. (X)", "We're clapping. (+ because it's fun)", "They're playing the cymbals. (X +)", "I'm listening. (? he)"],
            feedback: "Prompt, do not tell: for 'Rosie shaking?' hold up one finger and say 'Is R...?'; for 'Yes, she shaking.' repeat it with a rising voice and let the child fix it; for 'We is clapping' hold up three fingers for are; for 'isn't' said like 'is' say it right and let them echo. Say the be words and the -ing clearly yourself.",
            teacherNote: "This is the lesson's grammar, drilled fast: the same sentence is asked, said with not, joined and said about a different person, so the be word is chosen for the person without thinking. Vietnamese does not put a be word before an action word, so listen for the missing am / is / are. Round 3 makes it real: the children look at friends and say what they are doing. Grades 2-4 can take the full set. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I, you and a name, with the frames on the board.", frames: ["Is ___ ___ing the ___?", "Yes, he / she is. / No, he / she isn't.", "___ isn't ___ing."] },
              { level: "Core", task: "Change every sentence, with I, you, we, they and a name, and join two ideas with 'but' or 'and'." },
              { level: "Stretch", task: "Use he and she, and say why: 'Rosie is shaking the bell because it's soft. Is she striking it? No, she isn't. She's listening.'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Band in the park: tell it again",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell what the band is doing three times. Each time is shorter, smoother and faster, and it has joining words.",
            chunks: [
              "In the park, Ollie is striking the drum, and Rosie is shaking the tambourine.",
              "Rosie isn't striking the drum because she has a tambourine.",
              "They are making music, but they aren't singing.",
              "I'm not clapping, but I'm listening. What are you doing?",
            ],
            recycle: ["Her home is in the orchard, and it is big.", "I want a drum, please, because it is loud."],
            rounds: [
              { seconds: 55, say: "Round 1: Partner A tells what the band is doing, then Partner B. Use the picture to help you. Then change partners." },
              { seconds: 45, say: "Round 2: new partner. Partner A tells it again in less time, then Partner B. Then change partners." },
              { seconds: 35, say: "Round 3: new partner. Tell it fast! Partner A, then Partner B. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Look at the picture of the band. Say what each person is doing, and what they are not doing.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "In each round, Partner A tells it first, then Partner B. When the bell rings, find a new partner.",
              "The listener asks one question at the end ('What are you doing?') and gives a thumbs up.",
            ],
            prompts: ["(picture: the band in the park)"],
            feedback: correct,
            teacherNote: "This is the same telling three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The sentences are longer now, with 'and', 'but' and 'because' inside them. Listen for the missing be ('Ollie striking') and a dropped -ing; prompt with a pause: 'Ollie is ...?' Accept short tellings from Support children; the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Tell the whole band with the frames, with 'and' once.", frames: ["___ is ___ing the ___, and ___ is ___ing the ___.", "They are making music!"] },
              { level: "Core", task: "Tell the whole band with 'and', 'but' and 'because', without the frames." },
              { level: "Stretch", task: "Add a negative, a reason and a question: 'Rosie isn't striking it because she has a tambourine. It's fun! What are you doing?'" },
            ],
          },
        },
        {
          after: "Write like a champion",
          slide: {
            kind: "writing",
            title: "The band in the park: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to what each person is doing, and find the joining words: and, because, but.",
              "Plan: look at the picture of the band in the park. Write two key words in each box (not whole sentences). Say your sentences to your partner.",
              "Write: four to six sentences. Start with the name, then is, then the -ing word, then a joining word.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters, the be word (am, is, are) before the -ing word and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: The band in the park",
              text: "The band is in the park, and it is a sunny day. Ollie is striking the drum because he likes loud music. Rosie is shaking the tambourine, but she isn't clapping. They are making music, and I'm listening!",
            },
            organiser: [
              { label: "The band", prompt: "Key words: where the band is, and what the day is like. Draw it if you like." },
              { label: "Ollie", prompt: "Key words: his instrument, what he is doing, and why (because ...)." },
              { label: "Rosie", prompt: "Key words: her instrument, what she is doing, and one thing she is not doing." },
              { label: "The end", prompt: "Key words: what they are all doing, and what you are doing." },
            ],
            frames: ["The band is in the park, and ___.", "Ollie is ___ing the ___ because ___.", "Rosie is ___ing the ___, but she isn't ___ing.", "They are ___ing, and I'm ___ing!"],
            checklist: ["Four to six sentences: the band, Ollie, Rosie, the end", "At least two joining words: and, but or because", "is / are before the -ing word: Ollie is striking, they are making", "A capital letter at the start and a full stop or ! at the end"],
            sayIt: "Read your band paragraph to your partner. Then tell it again without looking, like a news reporter.",
            teacherNote: "The children tell the 'Band in the park' picture in four parts, the same retelling they just did aloud in the fluency slide, now in writing and with joining words. Mark only three things (capital letters, the be word before the -ing word, joining words) and let the child find the mistake from your dot. The paragraph can also be the script for the recorded talk 'My band at home'.",
            tiers: [
              { level: "Support", task: "Copy three frames and fill in the blanks; use 'because' once.", frames: ["Ollie is ___ing the ___ because ___.", "Rosie is ___ing the ___."] },
              { level: "Core", task: "Write four or five sentences: the band, Ollie, Rosie, the end, with 'and', 'but' or 'because'." },
              { level: "Stretch", task: "Write six sentences, add what you are doing and a question: 'I'm not clapping, but I'm listening. What are you doing?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My band at home",
        prompt: "Make a band with things at home (a pot, a box, a spoon). Show the camera what you are doing and what a friend or toy is doing. Join your ideas with 'and', 'but' or 'because', and end with a question for the viewer.",
        length: "60-90 seconds",
        steps: [
          "Find things to play: a pot, a box, a spoon, a bottle with rice.",
          "Practise your sentences three times: what you are doing, what a friend or toy is doing, and what you are not doing. Use 'and', 'but' or 'because'.",
          "Record it once. Play while you talk! End with a question: 'What are you doing?'",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say what you are doing and what someone else is doing, join your ideas with 'and', 'but' or 'because', and ask a question at the end.",
        words: ["drum", "tambourine", "shaking", "striking", "clapping", "making music"],
        grammar: ["I'm ___ing the ___.", "He's / She's ___ing the ___.", "I'm not ___ing, but ___.", "and / but / because"],
        rubric: [
          { label: "Am / is / are + -ing", description: "Says 'I'm shaking it.' and 'She's striking it.' with the be word and -ing.", weight: 3 },
          { label: "Joining ideas", description: "Joins two ideas in a sentence with 'and', 'but' or 'because', at least twice, and asks the viewer a question at the end.", weight: 3 },
          { label: "Me and a friend", description: "Says what they are doing and what someone else is doing.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Not", description: "Adds a sentence with 'not': I'm not clapping.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I'm ___ing the ___, and ___.", "It's ___!"], tips: ["Do the action as you say it.", "Use 'and' once."] },
          { level: "Core", who: "Most children", frames: ["I'm ___ing the ___ because ___.", "My friend is ___ing the ___, but he / she isn't ___ing.", "We're making music!"], tips: ["Say what two people are doing.", "Use 'because' and 'but' once each."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I'm not ___ing. I'm ___ing the ___ because ___.", "What are you doing?"], tips: ["Add a sentence with 'not', a reason and a question for the viewer."] },
        ],
      },
    },
  },
};
