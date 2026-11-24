import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 13 "Where Do We
// Live?" (src/lib/lessonDecks/lab.ts puts it into the decks). Children are in grades 2-4
// (ages 7-10).
// Every lesson gets a grammar drill (the unit's sentence changed fast: asked, answered,
// said in the negative, joined with and/but/because, then used for real talk about the
// children), one harder fluency routine (the unit's phrases said again and again as longer
// sentences, a little faster each round, with Unit 12's phrases mixed back in) and one
// writing routine (say it, write it, read it back). Lessons 1, 3 and 5 write a planned
// paragraph; lessons 2 and 5 end with a recorded talk for home (lesson 4 already has its
// own vlog). Time comes from games and repeats, never from the book pages or the grammar.
// All text is original.

const fix =
  "Listen and do not stop the talk. Note two or three mistakes you hear (no names). Between rounds 1 and 2, stop for one minute: write them on the board and let the class fix them, then go on, so the children who speak again use the fixed form. For grammar, prompt the child to fix it rather than saying it for them: start the phrase and pause, point to the frame, or hold up a finger for the missing sound. For a sound, just say it right and let them echo it. Say every final sound (-s, town, world) clearly yourself: children copy what they hear.";

const drillSigns =
  "Whole class: the teacher says a sentence and shows a sign (? = ask it, X = say it in the negative, + = add 'but', 'and' or 'because'). The class says the new sentence together.";

export const odL1U13Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u13-l1": {
      objectives: ["I can say where I live and ask a friend, with and, but or because, without stopping."],
      trim: { "Hello, neighbor!": 4, "Small to big (SB 128 C)": 6 },
      drop: ["Run to the picture", "Sleepy street"],
      add: [
        {
          after: "Show me, tell me",
          slide: {
            kind: "fluency",
            title: "Place sprint: I live in a ___",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence, fast and smooth, with no stops, and join two ideas.",
            chunks: [
              "I live in a house, and I like it.",
              "I live in an apartment, but my friend lives in a house.",
              "I live in a big city because my mom works there.",
              "Do you live in a small town or a big city?",
              "This is my street, and it is quiet.",
            ],
            recycle: ["A helper helps me, and I say thank you.", "I need water because I am thirsty."],
            rounds: [
              { seconds: 75, say: "Everyone together: the teacher shows a picture card, the class says the whole sentence and adds 'and', 'but' or 'because'." },
              { seconds: 75, say: "Pairs: one shows a card, the other says the sentence and asks a question back. Swap when you hear the clap." },
              { seconds: 60, say: "Faster! New partner. How many joined sentences can you say?" },
            ],
            steps: [
              "Look at the picture card. Say a WHOLE sentence: 'I live in a house, and I like it.'",
              "Listen for the clap: it means change.",
              "In round 3, count your joined sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I live house' or 'I live in apartment') and fix them together; then go on.",
            ],
            prompts: ["(card: house)", "(card: apartment, + but)", "(card: city, + because)", "(card: town)", "(card: a street, + and)"],
            feedback: fix + " In this unit, the usual slips are a missing 'in' ('I live house'), a missing a/an ('I live in apartment') and a dropped end sound ('tow', 'worl'). Example: the child says 'I live in apartment.' You say 'I live in ... ?' and hold up one finger for the small word: the child says 'I live in an apartment.' If the child joins two ideas with no word between them ('I live in a city I like it'), hold up a finger and say 'I live in a city ... and ...?'",
            teacherNote: "Whole sentences only, never single words: 'I live in an apartment, but my friend lives in a house' should come out as one smooth piece. Pictures on the cards stop children translating in their heads, and the clap keeps the pressure gentle. Grades 2-4 can hold two ideas in one sentence, so push for and, but and because every round. Mix in Unit 12's 'I need ___' cards every few turns so last unit's phrases stay fast. Listen for the end sounds of 'town', 'city' and 'world'.",
            tiers: [
              { level: "Support", task: "Say the whole sentence with a friend, and add a feeling: 'I like it!'", frames: ["I live in a ___, and I like it.", "I live in an ___."] },
              { level: "Core", task: "Say the sentence alone and join it with 'and' or 'but'.", frames: ["I live in a ___, but my friend lives in a ___."] },
              { level: "Stretch", task: "Join it with 'because' and ask a question back: 'I live in a city because my mom works there. Where do you live?'", frames: ["I live in a ___ because ___. Where do you live?"] },
            ],
          },
        },
        {
          after: "Place sprint: I live in a ___",
          slide: {
            kind: "fluency",
            title: "Grammar drill: say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it with Do, answer it, say it with don't, then join it. Then ask about where you really live.",
            chunks: [
              "I live in a house.",
              "Do you live in a house?",
              "Yes, I do. / No, I don't.",
              "I don't live in a house, but I live in an apartment.",
              "We live in a big city because our parents work there.",
              "She lives in a small town, and she likes it.",
            ],
            recycle: ["I need water because I am thirsty.", "A helper helps me."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the person too: I, you, we, they." },
              { seconds: 90, say: "Real talk: ask your partner about their home and street. Answer with the full short answer and one more sentence with 'and', 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Do, X = say it with don't, + = add 'and', 'but' or 'because ___'.",
              "Say the WHOLE new sentence, with the little words: in, a, an.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Do you live house?' or 'Yes, I live'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about where your partner really lives, and remember one answer to tell the class.",
            ],
            prompts: ["I live in a city. (?)", "You live in a house. (X)", "We live in a town. (+ because)", "They live in an apartment. (X +)", "She lives in a city. (?)"],
            feedback: "Prompt, do not tell: for 'You live in a house?' hold up one finger and say 'D...?'; for 'Yes, I live.' repeat it with a rising voice and let the child fix it; for 'I live apartment' point to the small word and wait. For 'she live', tap your wrist for the -s. Say the -s, the n't and the end of 'town' and 'city' clearly yourself.",
            teacherNote: "A drill only helps when the last step is real: round 3 has children ask about where they really live, so the form is used for meaning. Grades 2-4 can take the full set: questions, short answers, negatives, a joined sentence and a change of person. Keep it brisk; a drill that drags loses its point.",
            tiers: [
              { level: "Support", task: "Use only ? and X with I and you, with the frames on the board.", frames: ["Do you live in a ___?", "No, I don't. I live in a ___."] },
              { level: "Core", task: "Change every sentence, with I, you, we and they, and join two ideas.", frames: ["I don't live in a ___, but I live in a ___."] },
              { level: "Stretch", task: "Use he and she too, with -s, and 'because': 'He lives in a town because he likes it. Does he live in a city? No, he doesn't.'" },
            ],
          },
        },
        {
          after: "What is the text about? (SB 129 E)",
          slide: {
            kind: "writing",
            title: "My place: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Point to the sentence about where I live, the details, the joining words and the ending.",
              "Plan: look at your four boxes. Write two or three key words in each box, or draw a small picture. Say one sentence for each box to your partner.",
              "Write: five sentences, one for each box. Start with I live in a ___. Join two ideas with and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every capital letter, every full stop and every joining word.",
              "Teacher: look only at capital letters and the joining words. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: My place",
              text: "I live in a small town. There is a big park near my house, and I play there with my friends. There is a shop on my street, but it is small. My town is quiet because there are not many cars. I like my town!",
            },
            organiser: [
              { label: "Where I live", prompt: "Key words: a house, an apartment, a town or a city. Say: I live in a ___." },
              { label: "What is near", prompt: "Key words: two things near your home (a park, a shop, a street). Say: There is a ___ near my house, and ___." },
              { label: "A but idea", prompt: "Key words: something small, big or far. Say: There is a ___ on my street, but it is ___." },
              { label: "Why I like it", prompt: "Key words: quiet, noisy, big, fun. Say: My ___ is ___ because ___." },
            ],
            frames: ["I live in a ___ ___.", "There is a ___ near my house, and ___.", "There is a ___ on my street, but ___.", "My ___ is ___ because ___.", "I like my ___!"],
            checklist: ["A capital letter at the start and a full stop or ! at the end", "At least two joining words: and, but or because", "'a' before the describing word: a small town", "'There is' for one thing, 'There are' for more than one"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "A planned paragraph for grades 2-4: five short sentences with joining words, planned with key words in four boxes (a small drawing is optional). It grows the single describing-word sentence the class made earlier in the unit. Mark only capital letters and the joining words, and let the child find the mistake from your dot.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in one word in each. Write four sentences.", frames: ["I live in a ___.", "There is a ___ near my house.", "I like my ___!"] },
              { level: "Core", task: "Write five sentences, one for each frame, with 'and' or 'but' at least twice." },
              { level: "Stretch", task: "Write six sentences with 'and', 'but' and 'because', and end with a question: 'Where do you live?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u13-l2": {
      objectives: ["I can tell my partner about the country, a town and a city with there is and there are, faster each time."],
      trim: { "What's missing?": 4, "Post a letter": 5, "Town, country, city corners": 5 },
      drop: ["Up and down the street", "Sleepy neighborhood"],
      add: [
        {
          after: "Town, country, city corners",
          slide: {
            kind: "fluency",
            title: "Grammar drill: there is, there are, there aren't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it in the negative, then join it. Then talk about your own neighborhood.",
            chunks: [
              "There is a farm in the country.",
              "Is there a farm in the city?",
              "Yes, there is. / No, there isn't.",
              "There are tall buildings in a city.",
              "Are there any farms in a city? No, there aren't.",
              "There aren't any shops in the country, but there are farms.",
            ],
            recycle: ["I live in a city, and I like it.", "A helper helps me."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a place and shows a sign card, B changes it. Swap at the clap. Use there is for one thing and there are for more." },
              { seconds: 90, say: "Real talk: ask your partner about their neighborhood. Answer with the full short answer and one more sentence with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is there / Are there, X = say it with isn't / aren't, + = add 'and' or 'but ___'.",
              "Say the WHOLE new sentence. Check: one thing is 'there is', more things are 'there are' and the -s.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'There have' or 'Are there a park?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about what is near your partner's home, and remember one answer to tell the class.",
            ],
            prompts: ["There is a park. (?)", "There are farms in a city. (X)", "There are shops. (+ but ...)", "There is a bus stop. (X +)", "There are tall buildings. (?)"],
            feedback: "Prompt, do not tell: for 'There have a park' point to the frame and say 'There ... ?' with your voice up; for 'Are there a park?' show one finger and then two fingers and let the child hear 'Is' for one and 'Are' for more; for 'Yes, there are' to a one-thing question, hold up one finger. Say the -s in 'farms' and the n't in 'isn't' clearly yourself.",
            teacherNote: "Vietnamese uses one word for 'have' and 'there is', so 'There have' is the slip to expect; the question and the short answers are where children lose the singular and plural again. Grades 2-4 can take the full set, so keep the pace high and make round 3 real: they know their own neighborhoods.",
            tiers: [
              { level: "Support", task: "Use only ? and X with one thing, with the frames on the board.", frames: ["Is there a ___ in ___?", "Yes, there is. / No, there isn't."] },
              { level: "Core", task: "Change every sentence with one thing and with more than one, and join two ideas.", frames: ["There aren't any ___ in ___, but there are ___."] },
              { level: "Stretch", task: "Add 'because' or a number: 'There are many cars in the city because a lot of people live there.'" },
            ],
          },
        },
        {
          after: "Meet the children",
          slide: {
            kind: "fluency",
            title: "Three places: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 8,
            goal: "Tell the same three-place story three times. Each time is shorter, smoother and faster, and each time you add a joining word.",
            chunks: [
              "In the country, there are farms and animals.",
              "In a town, there are shops, but there are not many tall buildings.",
              "In a city, there are tall buildings and many cars.",
              "I live in a city because my mom works there. Where do you live?",
            ],
            recycle: ["I live in a house, and I like it.", "A helper helps me."],
            rounds: [
              { seconds: 75, say: "Tell your partner about the three places, then your partner tells you. Use the three picture cards." },
              { seconds: 60, say: "New partner. Tell it again in less time, then your partner tells you." },
              { seconds: 45, say: "New partner. Tell it fast! Both of you. Thumbs up if you didn't stop." },
            ],
            steps: [
              "Put three cards in a row: the country, a town, a city.",
              "Say one or two sentences for each card. In every round, both partners talk. When the bell rings, find a new partner.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'In the city, have buildings') and fix them together; then go on.",
              "The listener asks one question at the end: 'Where do you live?' and says 'Wow!'",
            ],
            prompts: ["(picture: a farm)", "(picture: a small town street)", "(picture: tall buildings)"],
            feedback: fix + " The grammar here is 'there are' and the plural -s. Example: the child says 'In the city, have buildings.' Point to the frame on the board, say 'In the city, there ... ?' and pause: the child says 'In the city, there are tall buildings.' For 'farm' and 'farms', hold up one finger, then two fingers, and let the child hear the difference. If the child says 'In a town there are shops there are not tall buildings' with no joining word, hold up a finger and say 'shops, ... ?' for 'but'.",
            teacherNote: "The same three places three times on purpose: the second and third tellings free the children to speak faster because they are no longer searching for words. Both partners tell it in every round, so everyone speaks six times. Many Vietnamese learners say 'There have' because Vietnamese uses one word for 'have' and 'there is'; model 'There are' slowly and let them see it on the frame. Keep the picture cards up for Support children.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it, with 'and'.", frames: ["In the country, there are ___ and ___.", "In a town, there are ___.", "In a city, there are ___ and ___."] },
              { level: "Core", task: "Tell all three places and join the town sentence with 'but'.", frames: ["In a town, there are ___, but there are not many ___."] },
              { level: "Stretch", task: "Add where you live and why, then ask a question: 'I live in a city because ___. In my city, there are ___. Where do you live?'" },
            ],
          },
        },
        {
          after: "My pretend address (SB 131)",
          slide: {
            kind: "writing",
            title: "Listen and build: Pip's town",
            routine: "dictogloss",
            mode: "groups",
            minutes: 6,
            steps: [
              "Remember: 'There is' for one thing, 'There are' for more than one. Listen for joining words: and, but, because.",
              "Listen to the short text. Do not write yet.",
              "Listen again and write key words: town, red house, two shops, park, cars, quiet.",
              "In your group, build the text back. Read it to the class. Does it match?",
              "Last, find the joining words (and, but, because) in the original and in your text.",
            ],
            text: { title: "Pip's town", text: "Pip lives in a small town. There is a red house on the street, and there are two shops. There is a big park, but there are not many cars. Pip likes the town because it is quiet!" },
            frames: ["Pip lives in a ___.", "There is a ___, and there are ___.", "There is a ___, but ___.", "Pip likes the town because ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation mark at the end", "'There is' for one, 'There are' for more than one", "The joining words and, but and because are in the right place"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "A dictogloss works because children must listen for meaning AND for the small grammar words and joining words to rebuild the text. Read it at normal speed twice, with clear final sounds in 'lives', 'shops' and 'likes'; do not slow down so much that it sounds like single words. Accept a text that is not word for word if it keeps the meaning, then compare with the original and notice the -s and the joining words together.",
            tiers: [
              { level: "Support", task: "Use the key words and the frames; build three sentences." },
              { level: "Core", task: "Build the whole text with your group, with the joining words." },
              { level: "Stretch", task: "Build the text, then write two more sentences about the town with 'and' and 'but'." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My home and my street",
        prompt: "Show us where you live: your door, your window or your street. Say what kind of place it is, what is near your home and what you like about it. Join your ideas with 'and', 'but' or 'because'. There is no need to say your address.",
        length: "60-90 seconds",
        steps: [
          "Look at your home or your street with a grown-up. Find three things near it.",
          "Say your talk three times to a grown-up or a toy. Each time a little faster, like in class. Use 'and', 'but' and 'because' at least once.",
          "Record it once. Show each thing as you talk. End with a question for the people who watch: 'Where do you live?'",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say where you live and what is near your home, join your ideas with and, but or because, and keep talking without long stops.",
        words: ["street", "neighborhood", "town", "city", "the country", "apartment", "building", "world"],
        grammar: ["I live in a ___.", "There is a ___. / There are ___.", "___, and ___. / ___, but ___. / ___ because ___."],
        rubric: [
          { label: "Where I live", description: "Says what kind of place the home is in: 'I live in a ___.'", weight: 2 },
          { label: "There is / There are", description: "Says what is near home with 'There is' or 'There are', not 'There have'.", weight: 2 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because at least twice ('There is a park, but it is small.'), or asks the viewer a question.", weight: 3 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 2 },
          { label: "Clear endings", description: "The end sound of town, city and the -s in shops can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I live in a ___, and I like it.", "There is a ___ near my home."], tips: ["Point to each thing as you say it."] },
          { level: "Core", who: "Most children", frames: ["I live in a ___, but ___.", "There is a ___ and there are ___."], tips: ["Say one thing and then more than one thing, and use 'but' once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["In my neighborhood, there are ___ and ___, but there aren't any ___.", "I like my neighborhood because ___. Where do you live?"], tips: ["Add your favorite place, say why, and ask the viewer a question."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u13-l3": {
      objectives: ["I can ask and answer 'Is this Pip's hat?' fast, and say whose things are where, round the circle."],
      trim: { "Whose is it? Mystery bag": 6, "Whose is it? Group game": 6 },
      drop: ["City and country chant", "Sleepy bag"],
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: whose is it? say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, then join it. Then ask about things that really belong to your classmates.",
            chunks: [
              "It's Nina's hat.",
              "Is this Nina's hat?",
              "Yes, it is. / No, it isn't.",
              "It isn't Nina's hat, but it's Max's hat.",
              "Nina's hat is red, and Max's hat is blue.",
              "Whose bag is this? It's my friend's bag because it has her name.",
            ],
            recycle: ["There are tall buildings in a city.", "I live in a house, and I like it."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Use different owners: Nina's, Max's, my teacher's." },
              { seconds: 90, say: "Real talk: pick up a real thing from the table or a classmate's desk. Ask whose it is. Answer with the full short answer and one more sentence with 'and' or 'but'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is this, X = say it with isn't, + = add 'and', 'but' or 'because ___'.",
              "Say the WHOLE new sentence. Check: 's after the owner, and the thing after it.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Pip hat' or 'Yes, it's'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about things that really belong to the people in the room, and remember one answer to tell the class.",
            ],
            prompts: ["It's Pip's bag. (?)", "This is Max's pencil. (X)", "It's Nina's hat. (+ but ...)", "That is the teacher's book. (?)", "It's Bo's house. (X +)"],
            feedback: "Prompt, do not tell: for 'It's Pip hat' point to the 's on the board and say 'It's Pip ... ?' with your voice up; for 'Yes, it's' hold up a finger and say 'Yes, it ... ?'; for 'Is this the hat Pip?' point to the frame and wait. Say the 's and the n't in 'isn't' clearly yourself.",
            teacherNote: "Vietnamese has no ending like 's, so children miss it unless they hear it again and again; write it in a different color and say it with a clear /s/ or /z/. Grades 2-4 can take the full set: questions, short answers, negatives and a joined sentence, so keep the pace high. Round 3 uses real things, so the form is used for meaning.",
            tiers: [
              { level: "Support", task: "Use only ? and X, with the frames on the board.", frames: ["Is this ___'s ___?", "No, it isn't. It's ___'s."] },
              { level: "Core", task: "Change every sentence with different owners, and join two ideas.", frames: ["It isn't ___'s ___, but it's ___'s ___."] },
              { level: "Stretch", task: "Compare two owners and say why: 'Nina's hat is red, and Max's hat is blue. I think the red hat is Nina's because her bag is red.'" },
            ],
          },
        },
        {
          after: "Practice with a partner (SB 133 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is this Pip's hat?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops, and make your answer longer!",
            chunks: [
              "Whose hat is this?",
              "Is this Max's hat? Yes, it is. It's red.",
              "No, it isn't. It's Nina's hat, and it's new.",
              "Whose bag is that? It's Bo's, but it isn't big.",
            ],
            recycle: ["Does she have a red pencil? Yes, she does.", "What does he want? He wants a game."],
            rounds: [
              { seconds: 90, say: "Slow chain round the circle. Everyone holds a thing with a name card." },
              { seconds: 75, say: "Swap things. Go faster, and add a joined sentence." },
              { seconds: 60, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Each thing has a name card: Pip, Max, Nina, Bo.",
              "Ask the friend on your left: 'Is this Max's hat?'",
              "They answer: 'Yes, it is.' or 'No, it isn't. It's Nina's hat, and it's new.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
            ],
            prompts: ["Is this ___'s ___?", "Whose ___ is this?"],
            feedback: fix + " The usual slips here are 'Pip hat' (no 's), 'The hat Pip' and 'Yes, it's'. Example: the child says 'It's Pip hat.' You point to the 's on the board, say 'It's Pip ... ?' and pause with your voice going up: the child says 'It's Pip's hat.' For 'Yes, it's', hold up a finger and say 'Yes, it ... ?'",
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Is this ___'s ___?' automatic. Time the whole circle and tell them; children love beating their own time. Write the 's on the board in a different color and say it with a clear /s/ or /z/ sound: Vietnamese has no ending like it, so children miss it unless they hear it again and again.",
            tiers: [
              { level: "Support", task: "Ask and answer with the frames on the board.", frames: ["Is this ___'s ___?", "Yes, it is. / No, it isn't."] },
              { level: "Core", task: "Answer 'No' and say whose it is: 'No, it isn't. It's Nina's hat.'", frames: ["No, it isn't. It's ___'s ___."] },
              { level: "Stretch", task: "Answer, say whose it is and add a joined sentence: 'No, it isn't. It's Nina's hat, and it's new. Is this Bo's bag?'" },
            ],
          },
        },
        {
          after: "Label the houses",
          slide: {
            kind: "writing",
            title: "Nina's room: plan, write, check",
            routine: "paragraph",
            genre: "description",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model with the teacher. Find every 's. Point to the first sentence, the details, the joining words and the ending.",
              "Plan: choose a friend's room. Write key words in your four boxes (or draw a small picture) and say one sentence for each box to your partner.",
              "Write: five sentences, one for each box. Say whose it is every time: Nina's bag. Join two ideas with and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every 's and every joining word.",
              "Teacher: look only at 's and capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: Nina's room",
              text: "This is Nina's room. Nina's bag is on the bed, and Nina's hat is on the chair. The room is small, but it is quiet. There is a big window because Nina likes the sun. I like Nina's room!",
            },
            organiser: [
              { label: "Whose room", prompt: "Key words: the friend's name, room. Say: This is ___'s room." },
              { label: "Their things", prompt: "Key words: two things and where they are. Say: ___'s bag is on the ___, and ___'s hat is on the ___." },
              { label: "A but idea", prompt: "Key words: small, big, quiet, noisy. Say: The room is ___, but it is ___." },
              { label: "Why I like it", prompt: "Key words: window, sun, books, bed. Say: There is a ___ because ___ likes ___." },
            ],
            frames: ["This is ___'s room.", "___'s bag is on the ___, and ___'s hat is on the ___.", "The room is ___, but it is ___.", "There is a ___ because ___ likes ___.", "I like ___'s room!"],
            checklist: ["The owner has 's: Nina's bag", "At least two joining words: and, but or because", "A capital letter at the start of each sentence", "A full stop or ! at the end"],
            sayIt: "Read your paragraph to your partner. Then tell it again without looking.",
            teacherNote: "Whose-is-it practice as a planned paragraph: five sentences with joining words, planned with key words in four boxes. Children often write 'Nina bag'; the checklist asks them to point to every 's and your dot sends them back to the one they missed. Listen for the common slip 'Yes, it's' in the question chain instead.",
            tiers: [
              { level: "Support", task: "Copy the frames and fill in the name and one word in each. Write four sentences." },
              { level: "Core", task: "Write five sentences, one for each frame, with 'and' or 'but' at least twice." },
              { level: "Stretch", task: "Write six sentences with 'and', 'but' and 'because', and end with a question: 'Whose room do you like?'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u13-l4": {
      objectives: ["I can describe my place with joining words and talk about it three times, faster each time."],
      trim: { "Listen for the details (SB 134 Think, C, D)": 8, "Do-it word or thing word? (SB 135 F)": 7 },
      drop: ["Noisy, quiet chant", "Noisy or quiet? Sort and move", "Quiet street goodnight"],
      add: [
        {
          after: "Tell me about where you live",
          slide: {
            kind: "fluency",
            title: "My place talk 70-60-50: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 8,
            goal: "Give the same place talk to three friends. In each round you talk, then your partner talks. Each talk is shorter and smoother, and you add a question at the end.",
            chunks: [
              "I live in a big city, and my neighborhood is noisy but interesting.",
              "My room is quiet because it is small.",
              "My street is long, but it isn't safe for bikes.",
              "Do you like your room? I like my room and my bed!",
            ],
            recycle: ["It's Pip's hat, and it's red.", "In a town, there are shops."],
            rounds: [
              { seconds: 70, say: "Round 1: Partner A tells the place talk, then Partner B. The listener counts the joining words on their fingers. Then change partners." },
              { seconds: 60, say: "Round 2: Partner A tells the same talk in less time, then Partner B. Then change partners." },
              { seconds: 50, say: "Round 3: Partner A, then Partner B. Fast and smooth! The listener asks one question and says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. In each round, Partner A (line A) talks first, then Partner B (line B).",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When both partners have talked, the bell rings. Line B moves one step to the left: a new partner.",
              "Do the same in rounds 2 and 3: A talks, then B, then change partners. End with a question for your partner.",
            ],
            feedback: fix + " Here the usual slips are 'My room quiet' (no 'is'), 'I live in big city' and 'noisy' said as 'noi'. Example: the child says 'My room quiet.' You say 'My room ... ?' and hold up a finger for the missing little word: the child says 'My room is quiet.' If two ideas run together with no joining word, hold up a finger and say 'My room is quiet ... ?' for 'because'.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for grades 2-4. Both partners talk in every round, so each child speaks six times. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more smoothly. The 'is' is the word to listen for: Vietnamese does not need a word for 'be' before a describing word, so 'She happy' and 'My room quiet' are very common.",
            tiers: [
              { level: "Support", task: "Say three sentences with the frames and one joining word.", frames: ["I live in a ___, and my neighborhood is ___.", "My room is ___."] },
              { level: "Core", task: "Say four sentences, join two of them, and end with a question.", frames: ["My room is ___ because ___.", "Do you like your ___?"] },
              { level: "Stretch", task: "Compare two places and say why: 'My neighborhood is noisy, but my room is quiet because it is small. Which place do you like?'" },
            ],
          },
        },
        {
          after: "What are these places like? (SB 134 B)",
          slide: {
            kind: "writing",
            title: "Join the place sentences: and, but, because",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences and the joining word in brackets.",
              "Make ONE sentence with the joining word. Say it first, then write it.",
              "Check: a comma before 'but' and 'and' with two ideas, a capital letter and a full stop.",
              "Read your sentence to your partner with feeling!",
            ],
            items: [
              { q: "The market is noisy. The market is interesting. (and)", answer: "The market is noisy and interesting." },
              { q: "The city is noisy. I like the city. (but)", answer: "The city is noisy, but I like it." },
              { q: "There is a park near my house. I play there. (and)", answer: "There is a park near my house, and I play there." },
              { q: "My street is quiet. There are not many cars. (because)", answer: "My street is quiet because there are not many cars." },
              { q: "I like my room. It is safe and quiet. (because)", answer: "I like my room because it is safe and quiet." },
            ],
            checklist: ["I say the repeated words only once: 'is noisy AND interesting'", "'and', 'but' or 'because' joins the two ideas", "A comma before 'but' and before 'and' with two whole ideas", "A capital letter at the start and a full stop at the end"],
            sayIt: "Say your joined sentence to your partner without looking.",
            teacherNote: "Sentence combining is one of the best-evidenced ways to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'The market is'. Notice with the children that the repeated words stay only once, and that 'but' and 'because' join two whole ideas. Grades 2-4 can do five items with all three joining words.",
            tiers: [
              { level: "Support", task: "Do items 1 and 2 with the teacher, then item 3." },
              { level: "Core", task: "Do all five." },
              { level: "Stretch", task: "Join three ideas: 'My street is long, quiet and safe, and I like it.' Then write two of your own." },
            ],
          },
        },
        {
          after: "Join the place sentences: and, but, because",
          slide: {
            kind: "fluency",
            title: "Grammar drill: my room is, is it? it isn't",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, then join it. Then talk about your own room and street.",
            chunks: [
              "My room is quiet.",
              "Is your room quiet?",
              "Yes, it is. / No, it isn't.",
              "My room isn't noisy, but my street is noisy.",
              "My street is long and noisy because it has many cars.",
              "Her room is small, and his room is big.",
            ],
            recycle: ["It's Nina's hat, and it's new.", "There is a park, but there aren't any farms."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence and shows a sign card, B changes it. Swap at the clap. Change the thing too: room, street, neighborhood, city." },
              { seconds: 90, say: "Real talk: ask your partner about their room and their street. Answer with the full short answer and one more sentence with 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is, X = say it with isn't, + = add 'and', 'but' or 'because ___'.",
              "Say the WHOLE new sentence, with the little word 'is' every time.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'My room quiet' or 'Is quiet your room?'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about your partner's real room and street, and remember one answer to tell the class.",
            ],
            prompts: ["My street is quiet. (?)", "The market is noisy. (X)", "My room is small. (+ because)", "The city is big. (X +)", "Her room is quiet. (?)"],
            feedback: "Prompt, do not tell: for 'My room quiet' hold up one finger and say 'My room ... ?'; for 'Is quiet your room?' point to the frame and wait; for 'No, it's' hold up a finger and say 'No, it ... ?'. Say the 'is' and the n't in 'isn't' clearly yourself.",
            teacherNote: "The little word 'is' is the grammar here: Vietnamese does not need it before a describing word. Grades 2-4 can take the full set: questions, short answers, negatives and a joined sentence, and a change from my to her and his. Round 3 is real talk about their own room.",
            tiers: [
              { level: "Support", task: "Use only ? and X with 'my', with the frames on the board.", frames: ["Is your ___ ___?", "No, it isn't. It's ___."] },
              { level: "Core", task: "Change every sentence with my, your, and a new thing, and join two ideas.", frames: ["My ___ isn't ___, but my ___ is ___."] },
              { level: "Stretch", task: "Use her and his and 'because': 'Her room is quiet because it is small. Is his room noisy? No, it isn't.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u13-l5": {
      objectives: ["I can say whose house it is, three times, without stopping, and join my ideas: 'It's Nina's house, and it's big.'"],
      trim: { "Remember it!": 5, "Over the fence: Whose house?": 10 },
      drop: ["Owner freeze", "Send it home!"],
      add: [
        {
          after: "@grammar",
          slide: {
            kind: "fluency",
            title: "Grammar drill: Whose house? say it, ask it, say no",
            routine: "grammar drill",
            mode: "pairs",
            minutes: 6,
            goal: "Change the sentence fast and right: ask it, answer it, say it with isn't, then join it. Then talk about real homes and neighbors.",
            chunks: [
              "It's Max's house.",
              "Is this Bo's house?",
              "Yes, it is. / No, it isn't.",
              "It isn't Bo's house, but it's Pip's house.",
              "Max's house is in the country, and Nina's house is in the city.",
              "My friend's house is big because her family is big.",
            ],
            recycle: ["My room is quiet because it is small.", "There are tall buildings in a city."],
            rounds: [
              { seconds: 60, say: drillSigns },
              { seconds: 90, say: "Pairs: A says a sentence about a house card and shows a sign card, B changes it. Swap at the clap. Change the owner and the place." },
              { seconds: 90, say: "Real talk: ask your partner about a friend's house or a neighbor's house. Answer with the full short answer and one more sentence with 'and', 'but' or 'because'." },
            ],
            steps: [
              "Listen to the sentence. Look at the sign. Change it: ? = make a question with Is this, X = say it with isn't, + = add 'and', 'but' or 'because ___'.",
              "Say the WHOLE new sentence. Check the 's after the owner and the place.",
              "Teacher: after round 1, stop for one minute: put two mistakes you heard on the board (often 'Max house' or 'It's Max.'), fix them together, then go on.",
              "In round 3 the drill becomes real: ask about a real friend's home, and remember one answer to tell the class.",
            ],
            prompts: ["It's Nina's house. (?)", "This is Max's farm. (X)", "It's Bo's house. (+ because)", "That is the teacher's house. (?)", "It's Pip's apartment. (X +)"],
            feedback: "Prompt, do not tell: for 'Max house' point to the 's on the board and say 'It's Max ... ?'; for 'It's Max.' when the question was 'Whose house?', say 'Yes! It's Max ... ?' and wait; for 'Yes, it's' hold up one finger and say 'Yes, it ... ?'. Say the 's, the 'in' and the n't in 'isn't' clearly yourself.",
            teacherNote: "This is the unit's last grammar drill, so listen especially for the 's, the hardest ending for Vietnamese speakers. Grades 2-4 can take the full set: questions, short answers, negatives and a joined sentence. Round 3 is real: they talk about the homes of people they know, without addresses.",
            tiers: [
              { level: "Support", task: "Use only ? and X with the house cards, with the frames on the board.", frames: ["Is this ___'s house?", "No, it isn't. It's ___'s."] },
              { level: "Core", task: "Change every sentence with different owners and places, and join two ideas.", frames: ["It isn't ___'s house, but it's ___'s house."] },
              { level: "Stretch", task: "Join with 'because' and ask a follow-up question: 'My friend's house is big because her family is big. Whose house do you like?'" },
            ],
          },
        },
        {
          after: "Over the fence: Whose house?",
          slide: {
            kind: "fluency",
            title: "Whose house? Do it again, faster",
            routine: "task repeat",
            mode: "pairs",
            minutes: 8,
            goal: "Do the same house game three times with new partners. Each time, say it faster and smoother, with longer answers.",
            chunks: [
              "Whose house is this? It's Nina's house.",
              "Nina's house is in the city, and it is tall.",
              "Max's farm is in the country, but it isn't far from the town.",
              "Is this Bo's house? No, it isn't. It's Pip's apartment because it has a blue door.",
            ],
            recycle: ["I live in an apartment.", "Is this Pip's hat? Yes, it is."],
            rounds: [
              { seconds: 70, say: "Partner A points to a house card and asks 'Whose house is this?' Partner B answers and says where it is, then you swap. Both of you ask and answer." },
              { seconds: 60, say: "New partner. Same game, a little faster. Both of you." },
              { seconds: 50, say: "New partner. Same game, as smooth as you can! Both of you." },
            ],
            steps: [
              "Each pair has four house cards: Nina, Max, Bo and Pip, each with a place and a describing word.",
              "Ask 'Whose house is this?' and answer with a whole sentence, then say where it is and join one more idea.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (no names) and fix them together; then go on.",
              "When the bell rings, find a new partner and do it again.",
            ],
            prompts: ["(card: Nina, the city, tall)", "(card: Max, the country, a farm)", "(card: Bo, a small town, quiet)", "(card: Pip, an apartment, a blue door)"],
            feedback: fix + " The slips to listen for are 'Nina house' and 'It's Max.' for 'It's Max's.' Example: the child says 'It's Max.' You say 'Yes! It's Max ... ?' and point to the 's on the board: the child says 'It's Max's house.' A quick recast is fine for sounds: if 'farm' comes out as 'far', say 'farm' and let the child echo it. If two ideas run together with no joining word, hold up a finger and say 'in the city ... ?' for 'and'.",
            teacherNote: "Task repetition (the same task again with a new partner) is one of the best ways to build fluency, and the second and third times children also fix their own grammar because they are not planning what to say. Both partners ask and answer in every round, so each child speaks six times. Do not change the cards between rounds. This is the last lesson of the unit, so listen especially for the 's, which is the hardest ending for Vietnamese speakers.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and point to the card.", frames: ["Whose house is this?", "It's ___'s house, and it is ___."] },
              { level: "Core", task: "Ask and answer, say where the house is and join one more idea.", frames: ["___'s house is in ___, and ___. / ___'s house is ___, but ___."] },
              { level: "Stretch", task: "Answer 'No', say whose it is and why: 'No, it isn't. It's Pip's apartment because it has a blue door. Is this Bo's house?'" },
            ],
          },
        },
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "writing",
            title: "A postcard from a friend's house: plan, write, check",
            routine: "paragraph",
            genre: "letter",
            mode: "solo",
            minutes: 8,
            steps: [
              "Read the model postcard with the teacher. Find the 's words, the joining words and the ending.",
              "Plan: choose a friend's house. Write key words in your four boxes (or draw a small picture). Say one sentence for each box to your partner.",
              "Write: five sentences, one for each box. Use the frames if you need them. Join two ideas with and, but or because at least twice.",
              "Check: tick the checklist. Your partner points to every 's and every joining word.",
              "Teacher: look only at 's and capital letters. Put a dot next to a line with a mistake; the child finds it and fixes it.",
            ],
            text: {
              title: "Model: A postcard from Bo's house",
              text: "This is Bo's house. Bo's house is in a small town, and it has a big tree. Max's house is in the city, but it is not big. I like Bo's house because it is quiet! I want to visit again!",
            },
            organiser: [
              { label: "Whose house", prompt: "Key words: the friend's name, house. Say: This is ___'s house." },
              { label: "Where it is", prompt: "Key words: a town, a city, the country, and one thing it has. Say: ___'s house is in ___, and it has a ___." },
              { label: "A but idea", prompt: "Key words: another house, big, small, far. Say: ___'s house is in ___, but it is ___." },
              { label: "Why I like it", prompt: "Key words: quiet, fun, big, tree. Say: I like ___'s house because ___." },
            ],
            frames: ["This is ___'s house.", "___'s house is in ___, and it has a ___.", "___'s house is in ___, but it is ___.", "I like ___'s house because ___!", "I want to visit again!"],
            checklist: ["The owner has 's: Bo's house", "At least two joining words: and, but or because", "A capital letter at the start of each sentence", "A full stop or an exclamation mark at the end"],
            sayIt: "Read your postcard to your partner. Then tell it again without looking.",
            teacherNote: "Plan with key words, write one sentence for each box, check with the list. Keep it to five short sentences and mark only the 's, the joining words and the capital letters. Praise every 's you find, and read one postcard aloud as a model for the class. The postcard is also a good script for the recorded home talk about the child's own home.",
            tiers: [
              { level: "Support", task: "Copy the model and change the name and the place. Write four sentences." },
              { level: "Core", task: "Write five sentences, one for each frame, with 'and' or 'but' at least twice." },
              { level: "Stretch", task: "Write six sentences with 'and', 'but' and 'because', and end with a question: 'Whose house do you like?'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Whose is it? A tour of my home",
        prompt: "Find three things at home. Show each one to the camera and say whose it is and one more thing about it: 'This is my mom's bag, and it is red. It's my brother's ball, but it is old.'",
        length: "60-90 seconds",
        steps: [
          "Choose three things at home that belong to different people.",
          "Practise saying whose each thing is and one more idea (use 'and', 'but' or 'because'), three times, a little faster each time.",
          "Record it once. Show each thing as you say it. End with a question for the people who watch: 'Whose is this?'",
          "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.",
        ],
        maxSeconds: 150,
        kidSummary: "Say whose each thing is with 's, join your ideas with and, but or because, and keep talking without long stops.",
        words: ["house", "apartment", "street", "city", "town", "the country"],
        grammar: ["This is my ___'s ___.", "It's ___'s.", "Whose ___ is this?", "___, and ___. / ___, but ___. / ___ because ___."],
        rubric: [
          { label: "Owner + 's", description: "Says whose each thing is with 's: 'my mom's bag', not 'my mom bag'.", weight: 3 },
          { label: "Joins ideas", description: "Joins two ideas with and, but or because at least twice ('This is my dad's cup, and it is blue.'), or asks the viewer a question.", weight: 3 },
          { label: "Whole sentences", description: "Says whole sentences ('This is my dad's cup.'), not single words.", weight: 2 },
          { label: "Keeps going", description: "Talks about three things without long stops.", weight: 2 },
          { label: "Clear endings", description: "The 's at the end of the owner's name can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is my ___'s ___, and it is ___.", "It's ___'s."], tips: ["Hold up each thing."] },
          { level: "Core", who: "Most children", frames: ["This is my ___'s ___, but it is ___.", "Whose ___ is this? It's ___'s."], tips: ["Ask 'Whose is it?' and answer it yourself, and use 'but' once."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Is this my ___'s ___? No, it isn't. It's my ___'s because ___.", "My ___'s ___ is ___, but my ___'s ___ is ___."], tips: ["Ask a question and answer it, compare two things and say why."] },
        ],
      },
    },
  },
};
