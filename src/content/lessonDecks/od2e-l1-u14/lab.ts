import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 14 "City and Country"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Venus is in grades 2-4 (ages 7-10).
// Every lesson gets a grammar drill (the unit's sentences - "The ___ is new.", "Is your street
// quiet?", "His / Her home is ...", "There is / There are" - asked, said in the negative, joined
// with and / but / because, said about other people, and then used for real talk about the
// children), one more fluency routine with longer phrases, and a writing routine that joins
// ideas. Three lessons end with a recorded talk for home. Time comes from games and repeats
// pitched at younger children, never from the book pages or the grammar. All text is original.

const correctGrammar =
  "During a round, listen and do not stop the talk. Note two or three mistakes you hear (no names), for example 'His house' said about a girl, 'Is you street quiet?', 'There have a park' or a missing -s. Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the sentence again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: point to the frame, start the phrase and pause ('Girl Bear has a bike. ___ bike is red.'), hold up a finger for the missing word, or repeat the error with a rising voice ('His bike?'). For a sound, just say it right and let them echo it. Say every final -s and the th in 'the' clearly yourself: children copy what they hear.";

const correctStory =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names), for example 'The city noisy.' (no 'is'), 'The country mouse come to the city.' or 'In the end the mice go house.' Between rounds 1 and 2, write them on the board and fix them together in one minute: children who then tell the story again use the fixed form. For grammar, prompt the child to fix it: point to the frame 'The city ___ noisy.' and pause, or hold up a finger for the missing little word. For a sound, just say it right and let them echo it. Say 'is' clearly yourself every time.";

const correctHisHer =
  "During a round, listen and do not stop the chain. Note two or three mistakes (no names), for example 'Is you street quiet?', 'His house' said about a girl or 'Her street' said about a boy. Fix them at the end of the round on the board together. For grammar, prompt the child to fix it: point to the picture of the boy or the girl, start 'Is ___ street quiet?' and pause, or hold up a finger for the missing word. For a sound, just say it right and let them echo it. Say the h in 'his' and 'her' clearly yourself.";

const correctMap =
  "During a round, listen and do not stop the talk. Note two or three mistakes (no names), for example 'There is two shops', 'There have a park' or a missing 'is' ('My neighborhood quiet'). Between rounds 1 and 2, write them on the board and fix them together in one minute: children who then tell the map again use the fixed form. For grammar, prompt the child to fix it: point to the frame 'There is a ___' and pause, or hold up two fingers for 'There are two ___s'. For a sound, just say it right and let them echo it. Say every -s on a place word clearly yourself.";

const grownUp =
  "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U14Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u14-l1": {
      objectives: ["I can say 'The ___ is new.' and ask 'Is the ___ new?' fast, and join two ideas with and, but and because."],
      trim: { "What's missing?": 4, "Build a town": 7 },
      drop: ["Freeze dance with the places", "Quiet country whisper chant"],
      add: [
        {
          after: "New or old?",
          slide: {
            kind: "fluency",
            title: "Grammar drill: new, old, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: say it, ask it, say it in the negative, and join it with and, but or because. Then talk about real places.",
            chunks: [
              "The hotel is new.",
              "Is the hotel new? Yes, it is. / No, it isn't.",
              "The hotel isn't old. It is new.",
              "The hotel is new, but the barn is old.",
              "I see a restaurant in the city, and I see an orchard in the country.",
              "I like the country because it is quiet.",
            ],
            recycle: ["I live in a house.", "This is a street."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about a place card and shows a sign (? = ask it, X = say it in the negative, + = add 'but ___' or 'because ___', a picture = change the place). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the place too: city or country." },
              { seconds: 90, say: "Real talk: ask your partner about real places: our school, our classroom, the street near your home. Answer with the full short answer and one more sentence with 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is the hotel new?', X = 'The hotel isn't new.', + = add 'but the barn is old' or 'because ___'.",
              "Say the WHOLE new sentence, with 'is' in the middle, and 'a' or 'an' in 'I see a / an ___'.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The hotel new' or 'I see orchard'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about places you both know. Is our school new or old? Remember one answer to tell the class.",
            ],
            prompts: ["The hotel is new. (?)", "The barn is old. (X)", "The city is noisy. (+ but the country ___)", "The orchard is old. (X +)", "I see a hotel in the city. (change: country)", "I like the country. (+ because)"],
            feedback: "Prompt, do not tell: for 'The hotel new' say 'The hotel ...?' and wait for the missing 'is'; for 'Is the hotel new? Yes, it new.' point to the frame 'Yes, it is.'; for 'I see orchard' point to the frame 'I see a/an ___' and hold up a finger. For a sound such as 'cornfield', say it right and let them echo it. Say the n't in 'isn't' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about places they really know, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, negative and a joined sentence. Vietnamese has no 'is' before an adjective, so 'The hotel new' is the slip to listen for. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'The ___ is new / old', with the frames on the board.", frames: ["The ___ is new.", "Is the ___ new? Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change the place, without looking at the board." },
              { level: "Stretch", task: "Join with 'because' and ask a choice question: 'Is the hotel new or old? It is new, because ___.'" },
            ],
          },
        },
        {
          after: "Grammar drill: new, old, ask it, say no",
          slide: {
            kind: "fluency",
            title: "New, old, city, country sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole long sentence about a place, fast and smooth, with no stops.",
            chunks: [
              "The hotel is new, but the barn is old.",
              "The cornfield is old, and the orchard is big.",
              "I see a restaurant in the city, and I see an orchard in the country.",
              "Is the movie theater new? Yes, it is. Is the department store new too?",
            ],
            recycle: ["I live in a house.", "This is a street."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows two place cards, the class says one long sentence about both." },
              { seconds: 75, say: "Pairs: one shows two cards, the other says the long sentence. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many long sentences can you say?" },
            ],
            steps: [
              "Look at the place cards. Say a WHOLE long sentence: 'The hotel is new, but the barn is old.' or 'I see a hotel in the city and a barn in the country.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I see orchard' with no 'an') and let the class fix them; then go on.",
            ],
            prompts: ["(cards: hotel + barn)", "(cards: orchard + restaurant)", "(cards: cornfield + department store)", "(cards: movie theater + hotel)"],
            feedback: "Prompt, do not tell. If a child says 'I see orchard', point to the frame 'I see a/an ___' and pause, or hold up a finger for the missing word. For 'The hotel new, but the barn old' (the missing 'is'), say 'The hotel ...?' and wait. For a sound such as 'cornfield', say it right and let them echo it. Say the ending of 'restaurant' and 'theater' clearly yourself.",
            teacherNote: "Whole sentences only, never single words, and now two ideas in one breath with 'but' or 'and'. Vietnamese has no 'is' before an adjective, so 'The hotel new' is the slip to listen for; 'an orchard' (a vowel sound) is the other. Mix Unit 13's 'I live in a ...' cards in every few turns so the old phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ is new.", "The ___ is old, but the ___ is new."] },
              { level: "Core", task: "Say the long sentence alone, without looking at the board: 'The hotel is new, but the barn is old.'" },
              { level: "Stretch", task: "Add a reason and a question: 'I like the new hotel because it is big. Do you like it?'", frames: ["I like the ___ because it is ___."] },
            ],
          },
        },
        {
          after: "How is the city different? (SB 137 Think)",
          slide: {
            kind: "writing",
            title: "Grow my place sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 6,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add 'new' or 'old', say where it is, or join two ideas with and, but or because.",
              "Say your big sentence to your partner. Then write it and read it again.",
            ],
            items: [
              { q: "I see a hotel. (add: new, in the city)", answer: "I see a new hotel in the city." },
              { q: "I see an orchard. (add: old, in the country)", answer: "I see an old orchard in the country." },
              { q: "The city is noisy. The country is quiet. (join with but)", answer: "The city is noisy, but the country is quiet." },
              { q: "The hotel is new. It is big. (join with and)", answer: "The hotel is new and big." },
              { q: "I like the country. It is quiet. (join with because)", answer: "I like the country because it is quiet." },
            ],
            frames: ["I see a ___ ___ in the ___.", "The ___ is ___, but the ___ is ___.", "I like the ___ because it is ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'a' or 'an' before the place word", "A comma before 'but', and the joining word is there (and, but or because)"],
            sayIt: "Read your sentences to your partner, then say one again without looking.",
            teacherNote: "Vietnamese learners often leave out 'a' and 'an' ('I see hotel'). Point to the checklist item when a child forgets, rather than correcting every sentence yourself. The last three items are two-clause sentences with a joining word: say the two short sentences aloud, then say the joined one, so children hear what the joining word does. 'an orchard' is a bonus for children who notice the vowel sound: praise it but do not teach the whole rule today.",
            tiers: [
              { level: "Support", task: "Do items 1 to 3 with the frames, then draw one place." },
              { level: "Core", task: "Do all five items." },
              { level: "Stretch", task: "Write two long sentences of your own: 'The hotel is new and big, but the barn is old because nobody lives in it.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u14-l2": {
      objectives: ["I can tell about the two mice in three parts with and, but and because, faster each time."],
      drop: ["City or country? Run and touch", "Run, mice, run!", "Sleepy mice whisper chant"],
      trim: { "Mice on stage": 8 },
      add: [
        {
          after: "Story pictures in order",
          slide: {
            kind: "fluency",
            title: "Grammar drill: mice, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence about the mice fast and right: ask it, say it in the negative, change the person, and join it with but or because. Then talk about yourself.",
            chunks: [
              "The country mouse is at home.",
              "Is the country mouse at home? Yes, he is. / No, he isn't.",
              "The city isn't quiet, but the country is quiet.",
              "I am a city mouse, but my friend is a country mouse.",
              "The city mouse isn't happy because the country is too quiet.",
              "Are you a city mouse or a country mouse? I am a ___ mouse because ___.",
            ],
            recycle: ["I live in a house.", "It's quiet."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about a mouse picture and shows a sign (? = ask it, X = say it in the negative, + = add 'but ___' or 'because ___', I / you / he = change the person). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence about the story and shows a sign card, B changes it. Swap at the clap. Change the person too: I am, you are, he is." },
              { seconds: 90, say: "Real talk: ask your partner: Are you a city mouse or a country mouse? Is your street quiet or noisy? Answer with a full sentence and 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is the city mouse at home?', X = 'The city mouse isn't at home.', + = add 'but the country mouse is'.",
              "Say the WHOLE new sentence, and say 'is', 'isn't' or 'are' every time.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'The city noisy' or 'Yes, he are'), fix them together, then go on.",
              "In round 3 the drill becomes real: say what YOU are like. Remember one answer to tell the class.",
            ],
            prompts: ["The city is noisy. (?)", "The country mouse is at home. (X)", "The country is quiet. (+ but the city ___)", "I am a city mouse. (he)", "The city mouse is happy. (X + because)", "You are a country mouse. (?)"],
            feedback: "Prompt, do not tell: for 'The city noisy' point to the frame 'The city ___ noisy' and pause; for 'Yes, he are' hold up one finger and say 'Yes, he ...?'; for 'Are you a city mouse? Yes, I am a.' let the child try again from the frame 'Yes, I am.' Say the n't in 'isn't' and the -s in 'is' clearly yourself.",
            teacherNote: "The sentences come from the story, so children drill the grammar on meaning they already know. Round 3 makes it real: they say what they are like. Grades 2-4 can take the full set: question, short answers, negative, a change of person and a joined sentence. Listen for the missing 'is' ('The city noisy'): it is the slip that matters most here.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Is the ___ ___? Yes, it is. / No, it isn't.", "The ___ isn't ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change the person: I, you, he." },
              { level: "Stretch", task: "Use 'because' and give your opinion: 'I think the country is better because it is quiet. Do you think so?'" },
            ],
          },
        },
        {
          after: "Grammar drill: mice, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Two mice: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same story three times with joining words. Each time is shorter, smoother and faster. Both partners tell it in every round.",
            chunks: [
              "First, the country mouse is at home, and the country is quiet.",
              "Then, the city mouse comes to the country, but he thinks it is too quiet.",
              "The mice go to the city, and the city is noisy.",
              "In the end, the mice go home because they like their own homes.",
            ],
            recycle: ["I live in a house.", "It's quiet."],
            rounds: [
              { seconds: 75, say: "Partner A tells the story from the picture cards in order, then Partner B tells it." },
              { seconds: 60, say: "New partner. Both tell it again in less time." },
              { seconds: 45, say: "New partner. Both tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Then, three for The mice go, four for In the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and let the class fix them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener asks one question at the end: 'Which mouse do you like?' and gives a thumbs up.",
            ],
            prompts: ["(picture: the country mouse at home)", "(picture: the city mouse visits)", "(picture: the mice in the city)", "(picture: the mice go home)"],
            feedback: correctStory,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. Each sentence now holds two ideas joined with 'and', 'but' or 'because'. The retelling builds speed; the one-minute fix in the middle is what also makes it more accurate. Keep the picture cards on the board for Support children and accept short tellings; the shrinking time does the work. Listen for 'The city noisy' (missing 'is').",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, ___.", "Then, ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all four parts and say how the mice feel: 'The city mouse is happy at home because ___.'" },
              { level: "Stretch", task: "Add your opinion and a question: 'I think the country is better because ___. Which mouse do you like?'" },
            ],
          },
        },
        {
          after: "City and country chart",
          slide: {
            kind: "writing",
            title: "Two mice paragraph: plan, write, check",
            routine: "paragraph",
            genre: "story retell",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to First, Then and In the end, and find the joining words: and, but, because.",
              "Plan: draw three boxes: the country mouse at home, the city mouse visits, the mice go home. Write two key words in each box. Say one sentence for each box to your partner.",
              "Write: four to six sentences. One sentence for each box, then one or two sentences about the country or the city. Use and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at 'is', full stops and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Two mice",
              text: "First, the country mouse is at home, and the country is quiet. Then, the city mouse visits the country, but he thinks it is too quiet. The mice go to the city, and the city is noisy. In the end, the mice go home, and they are happy.",
            },
            organiser: [
              { label: "First", prompt: "Key words: the mouse, the place, quiet or noisy. Draw the country mouse at home. Say: First, the country mouse is ___, and ___." },
              { label: "Then", prompt: "Key words: visits, thinks, too quiet. Draw the city mouse in the country. Say: Then, the city mouse visits the ___, but ___." },
              { label: "In the end", prompt: "Key words: the mice, go home, happy. Draw the mice going home. Say: In the end, the mice ___ because ___." },
            ],
            frames: ["First, the country mouse is ___, and ___.", "Then, the city mouse visits the ___, but ___.", "The country is ___, but the city is ___.", "In the end, the mice ___ because ___."],
            checklist: ["First, Then and In the end, with a comma", "At least two joining words: and, but or because", "'is' in The country is quiet.", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your story to your partner. Then tell it again without looking, like a storyteller.",
            teacherNote: "A paragraph of four to six sentences, planned with key words and a drawing of the story in three boxes. The model has 48 words and four sentences, each with two clauses joined by 'and' or 'but'. Mark only three things ('is', full stops and the joining words) and let the child find the mistake from your dot. Children may copy the model and change the words. This paragraph is the script for the recorded talk at home: the child tells it three times, a little faster each time.",
            tiers: [
              { level: "Support", task: "Copy the four frames and fill in two words in each; write four sentences." },
              { level: "Core", task: "Write five sentences: First, Then, The mice go, In the end and one about the city or the country, with two joining words." },
              { level: "Stretch", task: "Write six sentences and add how a mouse feels with 'because': 'The city mouse is happy in the city because he likes it noisy.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My two mice story",
        prompt: "Tell the story of the city mouse and the country mouse in three or four parts: First, Then, In the end. Join your ideas with and, but or because, and ask the viewer a question at the end. Show a drawing of the city and the country if you like!",
        length: "60-90 seconds",
        steps: [
          "Look at your story picture cards or your drawing from class.",
          "Say the story three times to a toy or a grown-up. Each time a little faster. Use 'and', 'but' and 'because'.",
          "Finish with a question for the viewer: 'Which mouse do you like?'",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Tell the story in parts, join your ideas with and, but or because, and ask the viewer a question. Keep talking without long stops.",
        words: ["city", "country", "noisy", "quiet", "new", "old"],
        grammar: ["First / Then / In the end", "The city is ___, but the country is ___.", "I like ___ because ___."],
        rubric: [
          { label: "Story parts", description: "Tells First, Then and In the end in order.", weight: 3 },
          { label: "City and country", description: "Says how the city and the country are different, with 'is'.", weight: 2 },
          { label: "Joining ideas", description: "Joins ideas with 'and', 'but' or 'because' at least twice, and asks the viewer one question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Little words", description: "The little word 'is' can be heard in 'The city is noisy.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Then, ___.", "In the end, ___."], tips: ["Point to your picture as you speak.", "Use 'and' once."] },
          { level: "Core", who: "Most children", frames: ["First, the country mouse is ___, and ___.", "The country is ___, but the city is ___.", "In the end, the mice ___ because ___."], tips: ["Say who and where in every part.", "Ask the viewer one question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like the ___ because ___.", "I am a city mouse, but my friend is a country mouse.", "Which mouse do you like?"], tips: ["Say which mouse you are and why, and ask the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u14-l3": {
      objectives: ["I can ask 'Is your ___ ___?' and say 'His' or 'Her' about a friend in longer sentences, fast."],
      trim: { "Sing: Our Grandma (SB 141 D)": 5, "Write about the bears": 5, "Ask about your partner's home (SB 141 E)": 7 },
      drop: ["Freeze and point", "Quiet grandma whisper", "Boy Bear and Girl Bear"],
      add: [
        {
          after: "Say the pattern (SB 141 E)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: his, her, your, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with 'your', say it with 'isn't', change his or her, and join it. Then ask about real homes.",
            chunks: [
              "Boy Bear has a bike. His bike is red.",
              "Is your street quiet? Yes, it is. / No, it isn't.",
              "His house isn't new, but her house is new.",
              "Her garden is big because she likes flowers.",
              "Her street is quiet, and his street is noisy.",
              "Is your neighborhood quiet or noisy? My neighborhood is ___ because ___.",
            ],
            recycle: ["I live in a house.", "Is this {s1}'s bag? Yes, it is."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it with 'your', X = say it in the negative, + = add 'but ___' or 'because ___', a boy or girl picture = change his / her). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: his, her, your." },
              { seconds: 90, say: "Real talk: ask your partner about their home: Is your street quiet? Is your house big? Then tell the class: 'His / Her street is ___.' with one 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is your street quiet?', X = 'His street isn't quiet.', + = add 'but her street is' or 'because ___'.",
              "Say the WHOLE new sentence, with the h in his and her, and 'is' in the middle.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Is you street quiet?' or 'His' for a girl), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's home, then tell the class with 'His' or 'Her'.",
            ],
            prompts: ["Girl Bear has a house. (her)", "His bike is red. (?)", "Her street is noisy. (X)", "His house is old. (+ but her house ___)", "Is your street quiet? (yes, + because)", "Her garden is big. (X +)"],
            feedback: "Prompt, do not tell: for 'Is you street quiet?' point to yourself and then to the child and say 'Is ... street?'; for 'His' about a girl, point to the girl picture and pause; for 'Her street noisy' hold up one finger for the missing 'is'. Say the h in his and her, and the n't in 'isn't', clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about their own homes and then choose his or her for a real friend, so the form is used for meaning. Grades 2-4 can take the full set: question with your, short answers, negative, a change between his and her, and joined sentences. Keep it brisk. Listen for 'Is you street' and 'She house'.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with his or her and the frames on the board.", frames: ["Is your ___ ___? Yes, it is. / No, it isn't.", "His / Her ___ is ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change his, her and your, without looking at the board." },
              { level: "Stretch", task: "Join with 'because' and compare two homes: 'Her house is big, but his house is small because ___.'" },
            ],
          },
        },
        {
          after: "Ask about your partner's home (SB 141 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is your ___ ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 8,
            goal: "Ask, answer with a longer sentence, then tell the circle with 'His' or 'Her'. Keep the chain going with no stops!",
            chunks: [
              "Is your street quiet? Yes, it is, and my house is big too.",
              "Is your house big? No, it isn't, but my street is quiet.",
              "His street is noisy, and her street is quiet.",
              "What is your neighborhood like? It is quiet because it is small. Is yours quiet too?",
            ],
            recycle: ["I live in a house.", "Is this {s1}'s bag? Yes, it is."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Ask the friend on your left, answer with a longer sentence, then say 'His ...' or 'Her ...' to the circle." },
              { seconds: 75, say: "Change the thing: house, street, home, neighborhood. Go faster!" },
              { seconds: 60, say: "Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Ask the friend on your left: 'Is your street quiet?'",
              "They answer 'Yes, it is, and ___.' or 'No, it isn't, but ___.' Then you tell the circle: 'His street is quiet.' or 'Her street is noisy.'",
              "Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes on the board (no names), such as 'Is you street quiet?' or 'His' for a girl, and fix them together; then go on.",
            ],
            prompts: ["Is your ___ ___?", "What is your ___ like?", "His / Her ___ is ___."],
            feedback: correctHisHer,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, so 'Is your ...?' and 'His / Her' become automatic. The answers are longer now: a short answer plus a second idea with 'and', 'but' or 'because'. The children have to choose his or her for a real friend, which is why this works better than a drill. Time the whole circle and tell them; children love beating their own time. Listen for 'Is you street' and 'She house'.",
            tiers: [
              { level: "Support", task: "Ask with the frame on the board, answer with 'Yes, it is.' or 'No, it isn't.' and say 'His' or 'Her' with a friend.", frames: ["Is your ___ ___?", "His / Her ___ is ___."] },
              { level: "Core", task: "Ask, answer with 'and' or 'but' and tell the circle, without looking at the board: 'Her street is quiet, and her house is big.'" },
              { level: "Stretch", task: "Ask a choice question and give a reason: 'Is your street quiet or noisy? It's quiet because ___.'" },
            ],
          },
        },
        {
          after: "Tell the class (SB 141 F)",
          slide: {
            kind: "writing",
            title: "My bear's home: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to every Her and her, and find the joining words: and, because, but.",
              "Plan: choose a bear from the story, or make a new bear. Draw three boxes: the bear, the house, the street. Write two key words in each box.",
              "Write: four to six sentences. One sentence for each box, a question for a friend, then 'I like ...!'. Use his for a boy bear and her for a girl bear. Use and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every his or her and every joining word.",
              "Teacher: look only at his / her, 'is' and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Honey Bear",
              text: "This is Honey Bear, and she is a girl. Her house is in the country, and her street is quiet. Her garden is big because she likes flowers. Is your street quiet, or is it noisy? I like her house, but I like my home too!",
            },
            organiser: [
              { label: "The bear", prompt: "Key words: boy or girl, the name. Draw your bear. Say: This is ___, and he / she is ___." },
              { label: "The house", prompt: "Key words: city or country, big or small. Draw the house. Say: His / Her house is in the ___, and ___." },
              { label: "The street", prompt: "Key words: quiet or noisy, a reason. Draw the street. Say: His / Her street is ___ because ___." },
            ],
            frames: ["This is ___, and he / she is ___.", "His / Her house is in the ___, and ___.", "His / Her street is ___ because ___.", "Is your ___ ___?", "I like his / her ___, but ___!"],
            checklist: ["A boy bear: his. A girl bear: her.", "At least two joining words: and, but or because", "'is' in Her street is quiet.", "A capital letter at the start and a full stop or question mark at the end of each sentence"],
            sayIt: "Read your paragraph to your partner in a bear voice. Your partner answers your question. Then tell it again without looking.",
            teacherNote: "A paragraph of four to six sentences, planned with key words and drawings, that uses the unit's grammar on its own bear: his / her, 'is', and the question 'Is your ___ ___?' near the end, so the partner's spoken answer closes the task. The model has 46 words. Mark only three things (his / her, capital letters, the joining words) and let the child find the mistake from your dot. Children may copy the model and change the words. This replaces the fix-it sheet: the common slips (he house, you street) are caught in the check.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in two words in each; write four sentences." },
              { level: "Core", task: "Write five sentences, one for each box, a question for a friend, and one for 'I like', with two joining words." },
              { level: "Stretch", task: "Write six sentences: add 'because' to say why, and compare two bears: 'His house is old, but her house is new.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u14-l4": {
      objectives: ["I can talk about my neighborhood with 'There is' and 'There are', in longer sentences, three times, faster each time."],
      trim: { "Neighborhood corners": 6 },
      drop: ["Quiet map whisper", "Shop or not? Run and sort"],
      add: [
        {
          after: "Add the places to the chart (SB 142 B)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: there is, there are, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: one or two, ask it, say it in the negative, and join it with and, but or because. Then talk about the real neighborhood.",
            chunks: [
              "There is a park in my neighborhood.",
              "Is there a park? Yes, there is. / No, there isn't.",
              "There are two shops, but there isn't a hotel.",
              "There is a restaurant and a movie theater near my house.",
              "My neighborhood is quiet because there aren't many cars.",
              "What is there near your home? There is a ___ and there are two ___s.",
            ],
            recycle: ["I live in a house.", "His house is old."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about a place card and shows a sign (? = ask it, X = say it in the negative, + = add 'but ___' or 'because ___', 2 = change to two: There are two ___s). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the place and the number too." },
              { seconds: 90, say: "Real talk: ask your partner about the real neighborhood: Is there a park near your home? What is there? Answer with a full short answer and one more sentence." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is there a park?', X = 'There isn't a park.', + = add 'but there is a shop', 2 = 'There are two parks.'",
              "Say the WHOLE new sentence, with 'There is' for one and 'There are' for more than one, and the -s on the place.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have a park' or 'There is two shops'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about the real neighborhood. Remember one answer to tell the class.",
            ],
            prompts: ["There is a shop. (?)", "There is a park. (X)", "There is a hotel. (2)", "There are two shops. (+ but there isn't a ___)", "There is a restaurant. (X + because)", "There are two parks. (?)"],
            feedback: "Prompt, do not tell: for 'There have a park' point to the frame 'There is a ___' and pause; for 'There is two shops' hold up two fingers and say 'There ...?'; for a missing -s on 'shops' rise on 'shop?'. Say 'There is', 'There are' and the n't in 'isn't' clearly and differently yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about places they really have near home, so the form is used for meaning. Grades 2-4 can take the full set: statement, question, short answers, negative, a change of number and a joined sentence. Vietnamese 'có' becomes 'have' ('There have a park'): that is the slip to listen for. Keep it brisk.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'There is a ___', with the frames on the board.", frames: ["There is a ___.", "Is there a ___? Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Change every sentence with ?, X, + and 2, without looking at the board." },
              { level: "Stretch", task: "Join with 'because' and ask 'How many?': 'There are two shops because ___. How many parks are there?'" },
            ],
          },
        },
        {
          after: "Neighborhood corners",
          slide: {
            kind: "fluency",
            title: "My neighborhood 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same neighborhood talk to three friends. Each talk is shorter and smoother. Both partners talk in every round.",
            chunks: [
              "I live in a house in the city, and my neighborhood is quiet.",
              "There is a park near my house, and there are two shops.",
              "There is a restaurant, but there isn't a hotel.",
              "I like my neighborhood because it is quiet. Is your neighborhood quiet?",
            ],
            recycle: ["I like my house.", "The city is noisy."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your neighborhood talk, then your friend tells theirs. The listener counts the places on their fingers." },
              { seconds: 45, say: "Partner 2: both tell the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Nice!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first, then line B.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'There have a park') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "At the end of each talk the listener answers your question: 'Is your neighborhood quiet?'",
            ],
            feedback: "Prompt, do not tell. For 'There have a park', point to the frame 'There is a ___' and pause, or hold up a finger and say 'There ...?'. For a missing -s in 'two shops', hold up two fingers and rise on the end of 'shop?'. For a sound, say it right and let them echo it. Say 'There is' and 'There are' with a clear difference yourself.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity for grades 2-4. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. Each sentence now holds two ideas joined with 'and', 'but' or 'because'. The one-minute fix after round 1 is what also improves accuracy. Listen for 'There have' (Vietnamese 'có' becomes 'have') and the missing -s on plural places.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames.", frames: ["I live in a ___.", "There is a ___ in my neighborhood.", "My neighborhood is ___."] },
              { level: "Core", task: "Say four sentences with 'and' and 'but', without the board." },
              { level: "Stretch", task: "Add a reason and a question: 'I like my neighborhood because ___. Is yours quiet?'" },
            ],
          },
        },
        {
          after: "Is it a complete sentence? (SB 143 F)",
          slide: {
            kind: "writing",
            title: "Join my neighborhood sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 6,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with the joining word in brackets. Say it first, then write it.",
              "Read your sentence to your partner. Check the comma before 'but'.",
            ],
            items: [
              { q: "There is a park. There is a shop. (and)", answer: "There is a park and a shop." },
              { q: "My street is quiet. My street is old. (and)", answer: "My street is quiet and old." },
              { q: "The park is big. The shop is small. (but)", answer: "The park is big, but the shop is small." },
              { q: "I like the park. It is quiet. (because)", answer: "I like the park because it is quiet." },
              { q: "I go to the shop. I go to the park. (then)", answer: "I go to the shop, and then I go to the park." },
            ],
            checklist: ["Only one 'There is', 'My street is' or 'I like' in my sentence", "The joining word is there (and, but, because or then)", "A comma before 'but'", "A full stop at the end"],
            sayIt: "Say your joined sentences to your partner without looking.",
            teacherNote: "Sentence combining is a well-studied way to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'There is'. Items 3 to 5 have two clauses: say the short sentences, then the joined one, so children hear the difference. This is exactly the skill the project sentences need.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 4." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Join three ideas: 'There is a park, a shop and a restaurant, but there isn't a hotel.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A walk down my street",
        prompt: "Walk down your street or show a drawing of it. Tell us what there is, how many, and what your neighborhood is like. Join your ideas with and, but or because, and ask the viewer a question at the end.",
        length: "60-90 seconds",
        steps: [
          "Draw your street or look around your neighborhood with a grown-up.",
          "Say your talk three times: each time a little faster, like in class. Use 'and', 'but' and 'because'.",
          "Finish with a question for the viewer: 'Is your neighborhood quiet?'",
          "Record it once. Use 'There is' for one thing and 'There are' for more than one.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say where you live, what there is in your neighborhood, and how it is. Join your ideas and ask the viewer a question. Keep talking without long stops.",
        words: ["house", "street", "park", "shop", "restaurant", "quiet", "noisy"],
        grammar: ["There is a ___ in my neighborhood.", "My neighborhood is ___ because ___.", "Is your neighborhood ___?"],
        rubric: [
          { label: "What there is", description: "Names two or more places with 'There is' or 'There are'.", weight: 3 },
          { label: "My neighborhood", description: "Says how the neighborhood is, with 'is' (quiet, noisy, new, old).", weight: 2 },
          { label: "Joining ideas", description: "Joins ideas with 'and', 'but' or 'because' at least twice, and asks the viewer one question.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of 'shops' and 'parks' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I live in a ___.", "There is a ___ and a ___."], tips: ["Point to each place on your drawing.", "Use 'and' once."] },
          { level: "Core", who: "Most children", frames: ["I live in a ___ in the ___, and ___.", "There is a ___, but there isn't a ___.", "My neighborhood is ___."], tips: ["Say two places and how it feels.", "Ask the viewer one question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["There are two ___ and a ___.", "I like the ___ because ___.", "Is your neighborhood ___ or ___?"], tips: ["Say how many, your favorite place and why, and ask the viewer."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u14-l5": {
      objectives: ["I can tell my friends about my map with longer sentences, twice, smoother the second time."],
      trim: { "Act out the story": 7, "Gallery walk (SB 145 D)": 6, "Draw my map (SB 145 B)": 13 },
      drop: ["Mime the place", "Map lullaby", "Train to the farm"],
      add: [
        {
          after: "Tell the class about my map (SB 145 C)",
          slide: {
            kind: "fluency",
            title: "Grammar drill: my map, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence about a map fast and right: ask it, say it in the negative, change my, his or her, and join it. Then talk about real neighborhoods.",
            chunks: [
              "There is a park on my map.",
              "Is there a hotel on your map? No, there isn't, but there is a restaurant.",
              "His neighborhood is new, but her neighborhood is old.",
              "There are two shops on her map, and there is a park on his map.",
              "My map is big because I live in the city.",
              "Is her neighborhood quiet? Yes, it is, and it is small too.",
            ],
            recycle: ["Is your street quiet? Yes, it is.", "The city is noisy."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence about a map card and shows a sign (? = ask it, X = say it in the negative, + = add 'but ___' or 'because ___', a boy or girl picture = change my / his / her). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence about a map and shows a sign card, B changes it. Swap at the clap. Change the person too: my, his, her, your." },
              { seconds: 90, say: "Real talk: ask your partner about their real neighborhood: Is your street quiet? Is there a park near your home? Then tell the class with 'His' or 'Her' and one 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is there a park on your map?', X = 'There isn't a park on my map.', + = add 'but there is a shop' or 'because ___'.",
              "Say the WHOLE new sentence, with 'There is' or 'There are', and with his or her for the right person.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have a park' or 'His' for a girl), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's neighborhood and tell the class one thing.",
            ],
            prompts: ["There is a park on my map. (?)", "There is a hotel on her map. (X)", "His neighborhood is new. (+ but her neighborhood ___)", "There are two shops on my map. (his)", "My map is big. (+ because)", "Is your neighborhood quiet? (yes, + and)"],
            feedback: "Prompt, do not tell: for 'There have a park' point to the frame 'There is a ___' and pause; for 'His' about a girl, point to the girl picture and wait; for a missing -s on 'shops', hold up two fingers and rise on 'shop?'. Say 'There is', 'There are', the h in his and her, and the n't in 'isn't' clearly yourself.",
            teacherNote: "This drill mixes the whole unit: there is / there are, his / her / your and 'is'. A drill only helps when the last step is real, so round 3 has children ask about neighborhoods they really know. Grades 2-4 can take the full set: question, short answers, negative, a change of person and a joined sentence. Keep it brisk; the map talk that follows uses the same sentences.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'There is a ___ on my map', with the frames on the board.", frames: ["There is a ___ on my map.", "Is there a ___ on your map? Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change my, his, her and your, without looking at the board." },
              { level: "Stretch", task: "Compare two maps with 'but' and 'because': 'His map is big, but her map is small because ___.'" },
            ],
          },
        },
        {
          after: "Grammar drill: my map, ask it, say no",
          slide: {
            kind: "fluency",
            title: "Map talk: say it again, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell your map talk to one friend, think for a minute, then tell it again to a new friend. Each time, both friends tell. Smoother, with longer sentences!",
            chunks: [
              "I live in a house in the city, and my neighborhood is quiet.",
              "There is a park and a shop on my map, but there isn't a hotel.",
              "His neighborhood is new, but her neighborhood is old.",
              "I like my map because it is big and green. Do you like it?",
            ],
            recycle: ["Is your street quiet? Yes, it is.", "The city is noisy."],
            rounds: [
              { seconds: 75, say: "Round 1: Partner A tells the map, then Partner B tells it. Point to each place." },
              { seconds: 60, say: "Round 2: Change partners. Partner A tells the same map again, then Partner B. Smoother, with no long stops." },
            ],
            steps: [
              "Round 1 (75 seconds each): Partner A holds up the map and tells it: 'I live in a ___, and ___. There is a ___, but there isn't a ___.' Then Partner B tells it.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'There is two shops') and fix them together; then go on.",
              "The listener has a job: ask one question, 'Is there a ___ on your map?'",
              "Round 2 (60 seconds each): change partners when you hear the bell. Partner A tells the map again, then Partner B.",
            ],
            feedback: correctMap,
            teacherNote: "Task repetition builds fluency; the planning minute in the middle lets children use the board mistakes they have just fixed, so the second telling is better in both speed and accuracy. The sentences are longer now: two ideas joined with 'and', 'but' or 'because'. The listener's one question gives the listener a real job. Listen for 'There is' with plural places and a missing -s.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and point to your map.", frames: ["I live in a ___.", "There is a ___ on my map.", "My neighborhood is ___."] },
              { level: "Core", task: "Tell four sentences with 'and' or 'but', without the frames." },
              { level: "Stretch", task: "Add a reason and a question: 'The park is big because ___. Is there a park on your map?'" },
            ],
          },
        },
        {
          after: "Gallery walk (SB 145 D)",
          slide: {
            kind: "writing",
            title: "My friend's map: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to 'His' or 'Her' and to the places, and find the joining words: and, but, because.",
              "Plan: look at your friend's map. Draw three boxes: whose map, what is there, what I like. Write two key words in each box.",
              "Write: four to six sentences. One sentence for each box, then one more about what is not on the map. Use and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every full stop and every joining word.",
              "Teacher: look only at his / her, full stops and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Tiny Mouse's map",
              text: "This is Tiny Mouse's map, and her neighborhood is quiet. There is a park and a shop on her map. Her park is big because it has a lot of trees, but her shop is small. I like her map, and I like her park!",
            },
            organiser: [
              { label: "Whose map", prompt: "Key words: boy or girl, quiet or noisy. Draw your friend. Say: This is ___'s map, and his / her neighborhood is ___." },
              { label: "What is there", prompt: "Key words: two places and what they are like. Say: There is a ___ and a ___ on his / her map. His / Her ___ is big, but ___." },
              { label: "What I like", prompt: "Key words: your favorite place, a reason. Say: I like his / her ___ because ___!" },
            ],
            frames: ["This is ___'s map, and his / her neighborhood is ___.", "There is a ___ and a ___ on his / her map.", "His / Her ___ is ___ because ___, but ___.", "I like his / her ___, and ___!"],
            checklist: ["His for a boy, her for a girl", "At least two joining words: and, but or because", "'is' in Her neighborhood is quiet.", "A capital letter at the start and a full stop at the end of each sentence"],
            sayIt: "Read your paragraph to your friend. Then tell it again without looking. Is it the right map?",
            teacherNote: "A paragraph of four to six sentences, planned with key words and drawings. The writer must choose his or her for a real friend, so every child decides and does not only copy. The model has 45 words and joins ideas four times with 'and', 'because' and 'but'. Mark only three things (his / her, full stops, joining words) and let the child find the mistake from your dot. Children may copy the model and change the words. The model uses a made-up character, not a child.",
            tiers: [
              { level: "Support", task: "Copy the first two frames and fill in two words in each; write four sentences." },
              { level: "Core", task: "Write five sentences, one for each box and two more, with two joining words." },
              { level: "Stretch", task: "Write six sentences: compare two maps with 'but' and give a reason with 'because'." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u14-l6": {
      objectives: ["I can say 'His', 'Her' and 'Your' sentences in longer sentences, fast, without looking."],
      trim: { "Two bears, two homes": 10 },
      drop: ["Run to the corner: whose is it?", "Touch and say"],
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: his, her, your, all the forms",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 7,
            goal: "Change the sentence fast and right: ask it with 'your', say it in the negative, change his or her, and join it. Then talk about real homes.",
            chunks: [
              "His house is old, and her house is new.",
              "Is your neighborhood quiet? Yes, it is, and my street is quiet too.",
              "Her street isn't noisy, but his street is noisy.",
              "Girl Bear likes her home because her garden is big.",
              "I live in the city, but my friend lives in the country.",
              "Is his house big or small? His house is small, but his garden is big.",
            ],
            recycle: ["This is {s1}'s bag.", "I live in an apartment."],
            rounds: [
              { seconds: 60, say: "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'but ___' or 'because ___', a boy or girl picture = change his / her / your). The class says the new sentence together." },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, he, she." },
              { seconds: 90, say: "Real talk: ask your partner about their home and street, then tell the class: 'His / Her home is ___, but ___.' with one 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = 'Is your house old?', X = 'His house isn't old.', + = add 'but her house is' or 'because ___'.",
              "Say the WHOLE new sentence, with the h in his and her, and the -s on 'likes' and 'lives' for he and she.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Is you house old?' or 'His' for a girl), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's home and tell the class with 'His' or 'Her'.",
            ],
            prompts: ["Boy Bear has a house. (his)", "Her house is new. (?)", "His street is noisy. (X)", "Her garden is big. (+ but his garden ___)", "She likes her home. (+ because)", "He is in the city. (?)"],
            feedback: "Prompt, do not tell: for 'Is you house old?' point to yourself and then to the child and say 'Is ... house?'; for 'His' about a girl, point to the girl picture and pause; for 'She like her home' tap your wrist for the missing -s. Say the h in his and her, the -s in 'likes' and the n't in 'isn't' clearly yourself.",
            teacherNote: "The last lesson of the unit drills the whole set: his, her and your, with questions, short answers, negatives and joined sentences, and with he and she taking -s. A drill only helps when the last step is real, so round 3 has children talk about real homes. Grades 2-4 can take all of it. Keep it brisk; the Champion sprint and the champion talk that follow use the same sentences.",
            tiers: [
              { level: "Support", task: "Use only ? and X with his and her, with the frames on the board.", frames: ["Is your ___ ___? Yes, it is. / No, it isn't.", "His / Her ___ is ___."] },
              { level: "Core", task: "Change every sentence with ?, X and +, and change his, her and your, without looking at the board." },
              { level: "Stretch", task: "Use he and she with -s and 'because': 'She likes her home because her garden is big. Is his garden big too?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: His, her, your",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say every champion sentence fast and right, with two ideas in one sentence: this unit's and last unit's.",
            chunks: [
              "His house is old, but her orchard is big.",
              "Is your street quiet? Yes, it is, and my house is small.",
              "There is a park in my neighborhood, and there are two shops.",
              "Her garden is green because she likes flowers.",
            ],
            recycle: ["This is {s1}'s bag.", "I live in an apartment."],
            rounds: [
              { seconds: 60, say: "Together: the teacher flashes a picture of a boy or a girl with two things, the class says one long sentence." },
              { seconds: 60, say: "Half the class says the 'His ...' sentences and half says the 'Her ...' sentences as the teacher flashes boy and girl pictures. Then swap." },
              { seconds: 45, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole long sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: finish with one minute: the two mistakes you heard most, fixed on the board.",
            ],
            feedback: correctGrammar,
            teacherNote: "A quick, high-energy recall of this unit and Unit 13 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. The sentences now hold two ideas joined with 'but', 'and' or 'because'. Say 'His' and 'Her' with a clear h at the start yourself; children often drop it.",
          },
        },
        {
          after: "Write about the bear's home",
          slide: {
            kind: "writing",
            title: "Dictogloss: two bears' homes",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Rule reminder (one minute): a boy: his. A girl: her. A friend I talk to: your.",
              "Listen to the text twice. The first time, just listen. The second time, write key words only.",
              "In your group, rebuild the text. Then compare with the text on the screen.",
            ],
            text: {
              title: "Two bears",
              text: "Baker Bear is a boy. His house is in the city. Honey Bear is a girl. Her house is in the country. Is your street quiet, Honey Bear? Yes, it is!",
            },
            checklist: ["His for the boy, her for the girl", "Your in the question", "A capital letter at the start and a full stop, question mark or ! at the end of each sentence"],
            sayIt: "Read your group's text aloud. Then one child says the last two sentences without looking.",
            teacherNote: "Read the text twice at natural speed; do not slow down for single words. Children rebuild the grammar from meaning. Listen for 'his' and 'her' mixed up and for 'Is you street'. Compare with the original together, not child by child. The text is original, not from the Student Book.",
            tiers: [
              { level: "Support", task: "Write key words with the teacher; the group adds 'his', 'her' and 'your'." },
              { level: "Core", task: "Rebuild the text with your group, then compare." },
              { level: "Stretch", task: "Rebuild the text and write two more sentences about a third bear, with 'but' or 'because'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Whose home is it?",
        prompt: "Show a photo or a drawing of two homes (your family's and a friend's, or two toy homes). Tell us whose it is: 'His home ...', 'Her home ...', join your ideas with and, but or because, and ask a question with 'your'.",
        length: "60-90 seconds",
        steps: [
          "Choose two homes: a photo, a drawing or two toys.",
          "Practise your sentences three times, a little faster each time. Use 'and', 'but' and 'because'.",
          "Finish with a question for the viewer: 'Is your street quiet?'",
          "Record it once. Point to each home as you talk.",
          grownUp,
        ],
        maxSeconds: 150,
        kidSummary: "Say 'His' or 'Her' about two homes, join your ideas, ask a question with 'your', and keep talking without long stops.",
        words: ["house", "home", "street", "city", "country", "quiet", "big"],
        grammar: ["His / Her ___ is ___.", "Is your ___ ___? Yes, it is.", "His ___ is ___, but her ___ is ___."],
        rubric: [
          { label: "His and her", description: "Uses 'his' for a boy and 'her' for a girl correctly.", weight: 3 },
          { label: "Question with your", description: "Asks 'Is your ___ ___?' correctly and answers 'Yes, it is.' or 'No, it isn't.'", weight: 2 },
          { label: "Joining ideas", description: "Joins ideas with 'and', 'but' or 'because' at least twice.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about both homes.", weight: 3 },
          { label: "Clear sounds", description: "The h in his and her and the final sounds in 'is' and 'isn't' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["His home is ___.", "Her home is ___."], tips: ["Point to each home.", "Use 'and' once."] },
          { level: "Core", who: "Most children", frames: ["His house is ___, and her house is ___.", "Is your street quiet? Yes, it is."], tips: ["Ask the camera one question.", "Use 'but' or 'because' once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["His street is noisy, but her street is quiet because ___.", "Is your neighborhood quiet or noisy?"], tips: ["Compare the two homes, give a reason and ask the viewer."] },
        ],
      },
    },
  },
};
