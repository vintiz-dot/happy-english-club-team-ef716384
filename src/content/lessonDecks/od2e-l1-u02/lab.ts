import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 2 "Friends"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases said again and again as whole
// sentences, a little faster each round, with Unit 1's phrases mixed back in) and one short
// writing routine (say it, write it, read it back). Every other lesson ends with a recorded
// talk for home, built on the routine the class just did. Time comes from games and
// repeats, never from the book pages or the grammar. All text is original.

const correct =
  "During a round, listen and do not stop the talk. Note two or three grammar mistakes you hear (no names). Between rounds 1 and 2, write them on the board and let the class fix them in one minute: children who then say the same thing again use the fixed form. For grammar, prompt the child to fix it (point to the frame, start the phrase and pause: 'These are zebra...?', hold up a finger for the missing -s, or say it again with a rising voice) rather than saying it for them; for a sound, just say it right and let them echo it. Say every final -s clearly yourself ('zebras', 'lions', 'likes'): children copy what they hear. Watch for 'This are' and 'He have'.";

const grownUp = "Grown-up: hold the phone and let your child speak; do not say the words for them. Bố mẹ: hãy giữ điện thoại và để con tự nói, đừng nhắc từng chữ.";

export const odL1U2Lab: UnitLab = {
  decks: {
    // ------------------------------------------------------------------ Lesson 1
    "od2e-l1-u02-l1": {
      objectives: ["I can say 'I like ___.' and 'Do you like ___?' fast, without stopping."],
      trim: { "Animal walks and action words": 5, "Slap it! and What's missing?": 6 },
      add: [
        {
          after: "Do you like animals?",
          slide: {
            kind: "fluency",
            title: "Animal sprint: do you like it?",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["I like elephants.", "I like to play.", "Do you like tortoises?", "Yes, I do.", "No, I don't."],
            recycle: ["This is my family.", "My family is big."],
            rounds: [
              { seconds: 45, say: "Everyone together: the teacher shows an animal card, the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 30, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the animal card. Say a WHOLE sentence: 'I like elephants.'",
              "Ask your partner: 'Do you like elephants?' They answer 'Yes, I do.' or 'No, I don't.'",
              "Listen for the clap: it means change.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["(card: elephant)", "(card: tortoise)", "(card: zebra)", "(card: lion)", "(card: this is my family)"],
            feedback: correct,
            teacherNote: "Whole sentences only, never single words: 'I like elephants' is one smooth piece. Say the -s on 'elephants' and 'tortoises' loudly yourself, because many Vietnamese children leave plural endings off. Mix in Unit 1's 'This is my ___.' cards every few turns so last unit's phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["I like ___.", "Do you like ___?"] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Add a reason: 'I like elephants. They are big!'", frames: ["I like ___. They are ___!"] },
            ],
          },
        },
        {
          after: "What is the story about? (SB 17 D)",
          slide: {
            kind: "writing",
            title: "Grow my animal sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 4,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a color or a size word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I like elephants. (add: big)", answer: "I like big elephants." },
              { q: "I like zebras. (add: black and white)", answer: "I like black and white zebras." },
              { q: "I like lions. (add: yellow)", answer: "I like yellow lions." },
            ],
            frames: ["I like ___ ___.", "I like to ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "Elephants, zebras, lions: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy the big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences and join them with 'and': 'I like big elephants and small tortoises.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u02-l2": {
      objectives: ["I can tell a friend story in three parts, faster each time."],
      trim: { "Zebra, lion, run!": 4, "Act out the story": 9 },
      add: [
        {
          after: "First, then, at last",
          slide: {
            kind: "fluency",
            title: "Two friends: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 6,
            goal: "Tell the same short story three times. Each time is shorter, smoother and faster.",
            chunks: ["First, the elephant is lonely.", "Then, a friend says hello.", "At last, they play together.", "Now they are happy!"],
            recycle: ["We play together.", "Friends help each other."],
            rounds: [
              { seconds: 45, say: "Tell your partner the story. Use the three picture cards." },
              { seconds: 35, say: "New partner. Tell it again in less time." },
              { seconds: 25, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Then, three for At last.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: a lonely elephant)", "(picture: two animals say hello)", "(picture: two friends play)"],
            feedback: correct,
            teacherNote: "This is the same short story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The story is the school's own and short, so it works for the whole class; the book story is not retold word for word. Listen for 'is' ('The elephant lonely') and for 'they play'. Accept short tellings: the shrinking time does the work.",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, ___.", "Then, ___.", "At last, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add a feeling for each part: 'First, the elephant is lonely and sad.'" },
            ],
          },
        },
        {
          after: "Real or pretend?",
          slide: {
            kind: "writing",
            title: "Listen and write: two friends",
            routine: "dictogloss",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Listen to the short text. Do not write yet.",
              "Listen again. Write words you hear: 'lion', 'lonely', 'play', 'friends'.",
              "With your partner, write the text again. It does not need to be the same words, but the same story.",
              "Read your text. Is there a capital letter at the start? Is the full stop there?",
            ],
            text: { title: "The lonely lion", text: "A lion is lonely. A zebra says hello. They play together. Now they are friends!" },
            frames: ["A ___ is lonely.", "They play ___.", "Now they are ___."],
            checklist: ["A capital letter at the start of each sentence", "A full stop or an exclamation point at the end", "They play, they are: I wrote both words"],
            sayIt: "Read your text to the class, then say it again without looking.",
            teacherNote: "Read the text twice at a natural speed, then once slowly if needed. Dictogloss makes children listen for small words like 'is' and 'are' that they often drop. Children's versions will differ: praise any version that keeps the story.",
            tiers: [
              { level: "Support", task: "Write the key words and copy the frames, then say the story." },
              { level: "Core", task: "Write the story in your own words with your partner." },
              { level: "Stretch", task: "Write the story and add what the lion and the zebra say." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My two friends story",
        prompt: "Tell a short story about two animal friends: first, then, at last. Use toys or a drawing to show it.",
        length: "30-60 seconds",
        steps: [
          "Look at your picture or choose two toys.",
          "Say the story three times to a grown-up or a toy. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Tell First, Then, At last about two friends, and keep talking without long stops.",
        words: ["elephant", "tortoise", "lonely", "sad", "friends", "play"],
        grammar: ["First / Then / At last", "They play together.", "He / She is ___."],
        rubric: [
          { label: "Three parts", description: "Tells First, Then and At last.", weight: 3 },
          { label: "Story words", description: "Uses words from the unit: lonely, sad, friends, play.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Is and are", description: "Says 'is' or 'are' in sentences: The elephant is lonely.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Then, ___.", "At last, ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the ___ is lonely.", "Then, a ___ says hello.", "At last, they play together."], tips: ["Say who and what in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["Now they are happy because ___.", "My favorite part is ___."], tips: ["Add why they are happy, and your favorite part."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u02-l3": {
      objectives: ["I can say 'This is a ___. These are ___s.' fast, near and far."],
      add: [
        {
          after: "Song with actions (SB 21 C)",
          slide: {
            kind: "fluency",
            title: "Near and far: say it three times",
            routine: "task repeat",
            mode: "pairs",
            minutes: 6,
            goal: "Do the same near-and-far game again and again. Each time you say it better.",
            chunks: ["This is a zebra.", "That is a lion.", "These are zebras.", "Those are lions."],
            recycle: ["I like elephants.", "This is my family."],
            rounds: [
              { seconds: 45, say: "Touch things near you. Point to things far away. Say the sentence for each one." },
              { seconds: 40, say: "Same game, new partner. Say it faster." },
              { seconds: 35, say: "Same game, third partner. Smooth and fast, no stops!" },
            ],
            steps: [
              "Touch it and say 'This is a ___.' Point and say 'That is a ___.'",
              "One thing: 'a'. More than one: 'These are' or 'Those are' and the -s.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Change partner when you hear the clap and play the same game again.",
            ],
            prompts: ["(picture cards: zebra, lion, elephant, tortoise, one and two of each)"],
            feedback: correct,
            teacherNote: "Task repetition: the same task done again and again with a new partner. The meaning is the same, so the children can concentrate on saying it fast and right. Listen for 'This are zebras' and 'Those are lion'. Prompt with a raised finger for the missing -s. Keep the cards the same so nobody searches for new words.",
            tiers: [
              { level: "Support", task: "Use the frames on the board and say one sentence for each card.", frames: ["This is a ___.", "These are ___s."] },
              { level: "Core", task: "Say all four sentences without the board." },
              { level: "Stretch", task: "Ask and answer: 'What is that?' 'That is a lion.'" },
            ],
          },
        },
        {
          after: "Write it and say it (SB 21 Write)",
          slide: {
            kind: "writing",
            title: "Fix the near and far sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: This or These? a missing -s? a capital letter?",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "this are zebras.", answer: "These are zebras." },
              { q: "Those are lion.", answer: "Those are lions." },
              { q: "That are a lion.", answer: "That is a lion." },
              { q: "These is a zebra", answer: "This is a zebra." },
            ],
            checklist: ["One thing: This is / That is a ___", "More than one: These are / Those are ___s", "A capital letter and a full stop"],
            sayIt: "Read your fixed sentences to a partner and point near or far as you say them.",
            teacherNote: "These are the unit's main errors: 'This are', and plural nouns with no -s. Do item 1 together first. Fixing sentences with a partner makes children look at the ending of the word, which they usually do not hear in Vietnamese.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 4 with the frame on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write two more sentences with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u02-l4": {
      objectives: ["I can ask and say 'This is ___. He has a ___.' about a friend and a pet."],
      trim: { "Pass the bag": 4, "Pet shop role play": 7, "Listening detectives (SB 22 C-D)": 8 },
      add: [
        {
          after: "Pet shop role play",
          slide: {
            kind: "fluency",
            title: "Pet question chain: who has a pet?",
            routine: "question chain",
            mode: "whole",
            minutes: 6,
            goal: "Ask, answer, turn and ask the next friend. Keep the chain going with no stops!",
            chunks: ["Do you have a rabbit?", "Yes, I do. I have a rabbit.", "No, I don't.", "She has a bird.", "He has a hamster."],
            recycle: ["I like animals.", "This is my friend."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Everyone holds a pet card." },
              { seconds: 45, say: "Swap cards. Go faster!" },
              { seconds: 35, say: "Swap again. Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Hold your pet card so only you can see it.",
              "Ask the friend on your left: 'Do you have a ___?'",
              "They answer: 'Yes, I do.' or 'No, I don't.' Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
            ],
            prompts: ["Do you have a ___?", "(card: hamster, goldfish, bird, rabbit, lizard, kitten)"],
            feedback: correct,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, which is what makes 'Do you have ...?' automatic. After the chain, point at a child and say about them: 'He has a bird. She has a kitten.' Say the -s of 'has' clearly: many children say 'He have'. Prompt with a raised finger.",
            tiers: [
              { level: "Support", task: "Answer with 'Yes, I do.' or 'No, I don't.' and pass the question on with the frame on the board." },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Tell about a friend too: 'He has a rabbit. She has a kitten.'" },
            ],
          },
        },
        {
          after: "Capital letters for names (SB 23 F)",
          slide: {
            kind: "writing",
            title: "Join my friend sentences",
            routine: "sentence combining",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner. Check the capital letters on the names.",
            ],
            items: [
              { q: "{s1} has a rabbit. {s1} has a bird. (and)", answer: "{s1} has a rabbit and a bird." },
              { q: "{s2} is kind. {s2} is happy. (and)", answer: "{s2} is kind and happy." },
              { q: "We play. We sing. (and)", answer: "We play and sing." },
            ],
            checklist: ["Names start with a capital letter", "'and' joins the two things", "He has, she has: the -s is there"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining teaches joining words through use, not rules. Model the first one aloud, crossing out the second name. Use he or she to match the child whose name appears on screen when you say the sentences aloud.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 3." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three things: 'My friend has a rabbit, a bird and a kitten.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My friend and a pet talk",
        prompt: "Show a picture of a friend and a pet. Tell us who they are and what the pet is.",
        length: "30-60 seconds",
        steps: [
          "Find a photo or draw a friend and a pet.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use 'and' to join your sentences.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say who your friend is and what pet he or she has, and keep talking without long stops.",
        words: ["friend", "hamster", "goldfish", "bird", "rabbit", "lizard", "kitten"],
        grammar: ["This is ___.", "He / She has a ___.", "We play together."],
        rubric: [
          { label: "Friend and pet", description: "Says who the friend is and names a pet.", weight: 3 },
          { label: "Has", description: "Says 'He has' or 'She has' clearly, with the -s.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Names", description: "Says the friend's name and says 'We play together.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is ___.", "He / She has a ___."], tips: ["Point to the picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["This is my friend ___.", "He / She has a ___.", "We play together."], tips: ["Say the name and the pet."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["He / She has a ___ and a ___.", "I like the ___ because it is ___."], tips: ["Say two pets and why you like one."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u02-l5": {
      objectives: ["I can talk about my friend three times, shorter and smoother each time."],
      trim: { "Family and friends chant": 3, "Review Bingo": 5, "Mime the story": 5, "Gallery walk (SB 25 D)": 6 },
      add: [
        {
          after: "Guess my friend",
          slide: {
            kind: "fluency",
            title: "My friend talk 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 5,
            goal: "Give the same friend talk to three friends. Each talk is shorter and smoother.",
            chunks: ["This is my friend.", "He has a rabbit.", "We play together.", "We are happy."],
            recycle: ["My family is big.", "I like elephants."],
            rounds: [
              { seconds: 40, say: "Partner 1: tell your friend talk. The listener counts the sentences on their fingers." },
              { seconds: 30, say: "Partner 2: the same talk in less time." },
              { seconds: 20, say: "Partner 3: fast and smooth! The listener says 'Wow!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: correct,
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. Listen for 'He has' / 'She has' and for the plural -s.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["This is my friend ___.", "We play together."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a feeling: 'We are happy because we play together.'" },
            ],
          },
        },
        {
          after: "Make the collage",
          slide: {
            kind: "writing",
            title: "Write about my collage",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the model with the teacher. Find the capital letters.",
              "Write two sentences about your collage with the frames.",
              "Read them to your partner. Do they match your collage?",
            ],
            text: { title: "My friends", text: "This is my friend. He has a goldfish. These are my friends. We play together!" },
            frames: ["This is my ___.", "He / She has a ___.", "We ___ together."],
            checklist: ["Capital letters at the start", "A full stop at the end", "He has, she has: the -s is there"],
            sayIt: "Show your collage to a partner and say your sentences without reading.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill in a word." },
              { level: "Core", task: "Write two sentences about your collage." },
              { level: "Stretch", task: "Write three sentences about your family and friends." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u02-l6": {
      objectives: ["I can say 'This is, that is, these are, those are' fast and right."],
      trim: { "Pet shop shout": 6 },
      add: [
        {
          after: "Shelf secrets",
          slide: {
            kind: "fluency",
            title: "Champion sprint: this, that, these, those",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say the whole sentence, fast and smooth, with no stops.",
            chunks: ["This is my pet.", "That is a rabbit.", "These are my pets.", "Those are my friends.", "What are those?"],
            recycle: ["He has a bird.", "Do you like animals?"],
            rounds: [
              { seconds: 45, say: "Everyone together: the teacher touches or points, the class says the whole sentence." },
              { seconds: 45, say: "Pairs: one points, the other says the sentence. Swap when you hear the clap." },
              { seconds: 30, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Touch it or point at it. Say a WHOLE sentence.",
              "One thing: 'This is' or 'That is'. More than one: 'These are' or 'Those are' and the -s.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and fix them together; then go on.",
              "Listen for the clap: it means change.",
            ],
            prompts: ["(a bag, two pencils, a far chair, two far books)"],
            feedback: correct,
            teacherNote: "Whole sentences only. This is the last practice of the unit, so keep the pace. Mix the spaced phrases ('He has a bird', 'Do you like animals?') in every few turns so they stay fast. Listen for 'These are pet' and 'Those is'.",
            tiers: [
              { level: "Support", task: "Point to the frames on the board and say them with a friend.", frames: ["This is my ___.", "These are my ___s."] },
              { level: "Core", task: "Say the sentences alone, without looking at the board." },
              { level: "Stretch", task: "Ask and answer: 'What are those?' 'Those are my friends.'" },
            ],
          },
        },
        {
          after: "Write it, near and far",
          slide: {
            kind: "writing",
            title: "Grow my near and far sentence",
            routine: "expand it",
            mode: "solo",
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add a color, a size or a feeling word.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "This is a rabbit. (add: little)", answer: "This is a little rabbit." },
              { q: "That is a lion. (add: big)", answer: "That is a big lion." },
              { q: "These are zebras. (add: two)", answer: "These are two zebras." },
              { q: "Those are my friends. (add: happy)", answer: "Those are my happy friends." },
            ],
            frames: ["This is a ___ ___.", "These are ___ ___s."],
            checklist: ["A capital letter at the start", "A full stop at the end", "These are, those are: the -s is there"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            tiers: [
              { level: "Support", task: "Copy one big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences, one near and one far." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Near and far talk",
        prompt: "Find things near you and far from you. Touch and point as you say what they are.",
        length: "30-60 seconds",
        steps: [
          "Pick two things near you and two things far away.",
          "Say your talk three times: touch for 'this', point for 'that'. Each time a little faster.",
          "Record it once. Use the right word: this, that, these, those.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say this, that, these and those about things near and far, and keep talking without long stops.",
        words: ["this", "that", "these", "those", "pet", "friends"],
        grammar: ["This is / That is a ___.", "These are / Those are ___s."],
        rubric: [
          { label: "Near and far", description: "Uses this and that for one thing and these and those for more than one.", weight: 3 },
          { label: "Plural -s", description: "Says the -s on things that are more than one.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Touch and point", description: "Touches or points to match this and that.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["This is a ___.", "That is a ___."], tips: ["Touch and point as you say it."] },
          { level: "Core", who: "Most children", frames: ["This is a ___. That is a ___.", "These are ___s. Those are ___s."], tips: ["Say all four, near and far."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["What is that? That is a ___.", "These are my ___. I like them!"], tips: ["Ask a question and add what you like."] },
        ],
      },
    },
  },
};
