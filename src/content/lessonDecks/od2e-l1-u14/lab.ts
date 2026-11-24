import type { UnitLab } from "@/lib/lessonDecks/lab";

// Speaking & Writing Lab for Oxford Discover 2nd edition, Level 1, Unit 14 "City and Country"
// (src/lib/lessonDecks/lab.ts puts it into the decks). Children are 6-7.
// Every lesson gets one fluency routine (the unit's phrases - new / old places, "The city is
// noisy", "Is your street quiet?", "His / Her home is ...", "There is a ___" - said again and
// again as whole sentences, a little faster each round, with Unit 13's phrases mixed back in)
// and one short writing routine (say it, write it, read it back). Three lessons end with a
// recorded talk for home that repeats the class routine. Time comes from games and repeats,
// never from the book pages or the grammar. All text is original.

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
      objectives: ["I can say 'The ___ is new.' and 'The ___ is old.' fast, without stopping."],
      trim: { "What's missing?": 4, "Build a town": 7 },
      add: [
        {
          after: "New or old?",
          slide: {
            kind: "fluency",
            title: "New, old, city, country sprint",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 7,
            goal: "Say the whole sentence about a place, fast and smooth, with no stops.",
            chunks: [
              "The hotel is new.",
              "The cornfield is old.",
              "I see a restaurant in the city.",
              "I see an orchard in the country.",
              "Is the movie theater new? Yes, it is.",
            ],
            recycle: ["I live in a house.", "This is a street."],
            rounds: [
              { seconds: 60, say: "Everyone together: the teacher shows a place card, the class says the whole sentence." },
              { seconds: 60, say: "Pairs: one shows a card, the other says the sentence. Swap when you hear the clap." },
              { seconds: 45, say: "Faster! New partner. How many sentences can you say?" },
            ],
            steps: [
              "Look at the place card. Say a WHOLE sentence: 'The hotel is new.' or 'I see a hotel in the city.'",
              "Listen for the clap: it means change.",
              "In round 3, count your sentences on your fingers.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'I see orchard' with no 'an') and let the class fix them; then go on.",
            ],
            prompts: ["(card: hotel)", "(card: orchard)", "(card: cornfield)", "(card: restaurant)", "(card: department store)", "(card: movie theater)"],
            feedback: "Prompt, do not tell. If a child says 'I see orchard', point to the frame 'I see a/an ___' and pause, or hold up a finger for the missing word. For 'The hotel new' (the missing 'is'), say 'The hotel ...?' and wait. For a sound such as 'cornfield', say it right and let them echo it. Say the ending of 'restaurant' and 'theater' clearly yourself.",
            teacherNote: "Whole sentences only, never single words: 'The hotel is new' should come out as one smooth piece. Vietnamese has no 'is' before an adjective, so 'The hotel new' is the slip to listen for; 'an orchard' (a vowel sound) is the other. Mix Unit 13's 'I live in a ...' cards in every few turns so the old phrases stay fast.",
            tiers: [
              { level: "Support", task: "Point to the frame on the board and say it with a friend.", frames: ["The ___ is new.", "The ___ is old."] },
              { level: "Core", task: "Say the sentence alone, without looking at the board." },
              { level: "Stretch", task: "Join two places: 'The hotel is new and the barn is old.'", frames: ["The ___ is new and the ___ is old."] },
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
            minutes: 5,
            steps: [
              "Read the small sentence with the teacher.",
              "Make it bigger: add 'new' or 'old', or say where it is.",
              "Write your big sentence. Read it to your partner.",
            ],
            items: [
              { q: "I see a hotel. (add: new)", answer: "I see a new hotel." },
              { q: "I see an orchard. (add: in the country)", answer: "I see an orchard in the country." },
              { q: "I see a restaurant. (add: in the city)", answer: "I see a restaurant in the city." },
            ],
            frames: ["I see a ___ ___.", "I see a ___ in the ___."],
            checklist: ["A capital letter at the start", "A full stop at the end", "'a' or 'an' before the place word"],
            sayIt: "Read your sentence to your partner, then say it again without looking.",
            teacherNote: "Vietnamese learners often leave out 'a' and 'an' ('I see hotel'). Point to the checklist item when a child forgets, rather than correcting every sentence yourself. 'an orchard' is a bonus for children who notice the vowel sound: praise it but do not teach the whole rule today.",
            tiers: [
              { level: "Support", task: "Copy a big sentence from the board and draw it." },
              { level: "Core", task: "Write one big sentence of your own." },
              { level: "Stretch", task: "Write two big sentences with 'and': 'I see a new hotel and an old barn.'" },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 2
    "od2e-l1-u14-l2": {
      objectives: ["I can tell about the two mice in three parts, faster each time."],
      add: [
        {
          after: "Story pictures in order",
          slide: {
            kind: "fluency",
            title: "Two mice: tell it again, faster",
            routine: "retell",
            mode: "pairs",
            minutes: 7,
            goal: "Tell the same story three times. Each time is shorter, smoother and faster.",
            chunks: [
              "First, the country mouse is at home.",
              "Then, the city mouse comes to the country.",
              "The country is quiet. The city is noisy.",
              "In the end, the mice go home.",
            ],
            recycle: ["I live in a house.", "It's quiet."],
            rounds: [
              { seconds: 60, say: "Tell your partner the story. Use the picture cards in order." },
              { seconds: 45, say: "New partner. Tell it again in less time." },
              { seconds: 30, say: "New partner. Tell it fast! Thumbs up if you didn't stop." },
            ],
            steps: [
              "Hold up one finger for First, two for Then, three for In the end.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board and let the class fix them; then go on.",
              "When the bell rings, find a new partner.",
              "The listener says 'Wow!' at the end and gives a thumbs up.",
            ],
            prompts: ["(picture: the country mouse at home)", "(picture: the city mouse visits)", "(picture: the mice go home)"],
            feedback: correctStory,
            teacherNote: "This is the same story three times on purpose: the second and third tellings free the children to speak faster because they are not searching for words. The retelling builds speed; the one-minute fix in the middle is what also makes it more accurate. Keep the picture cards on the board for Support children and accept short tellings; the shrinking time does the work. Listen for 'The city noisy' (missing 'is').",
            tiers: [
              { level: "Support", task: "Point to each picture and say one sentence for it.", frames: ["First, ___.", "Then, ___.", "In the end, ___."] },
              { level: "Core", task: "Tell all three parts without the frames." },
              { level: "Stretch", task: "Add how the mice feel: 'The city mouse is happy in the city.'" },
            ],
          },
        },
        {
          after: "City and country chart",
          slide: {
            kind: "writing",
            title: "Dictogloss: city and country",
            routine: "dictogloss",
            mode: "groups",
            minutes: 5,
            steps: [
              "Rule reminder (one minute): a describing word comes after 'is': 'The city is noisy.' Say it out loud together.",
              "Listen to the text twice. The first time, just listen. The second time, write key words only.",
              "In your group, rebuild the text. Then compare with the text on the screen.",
            ],
            text: {
              title: "Two homes",
              text: "The city is big and noisy. The country is small and quiet. I like the city. I like the country, too.",
            },
            checklist: ["'is' between the place and the describing word", "A capital letter and a full stop in each sentence", "'the' before city and country"],
            sayIt: "Read your group's text aloud. Then one child says the first two sentences without looking.",
            teacherNote: "Read the text twice at natural speed; do not slow down for single words. Children rebuild the grammar from meaning, so listen for the missing 'is' ('The city noisy'), which is the common Vietnamese-learner slip. Compare with the original together, not child by child. The sentences are original and not from the Student Book.",
            tiers: [
              { level: "Support", task: "Write key words with the teacher; the group adds 'is' and 'the'." },
              { level: "Core", task: "Rebuild the text with your group, then compare." },
              { level: "Stretch", task: "Rebuild it and add one more sentence about a place you like." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "My two mice story",
        prompt: "Tell the story of the city mouse and the country mouse at home in three parts: First, Then, In the end. Show a drawing of the city and the country if you like!",
        length: "30-60 seconds",
        steps: [
          "Look at your story picture cards or your drawing from class.",
          "Say the story three times to a toy or a grown-up. Each time a little faster.",
          "Record it once. Smile and look at the camera.",
          grownUp,
        ],
        maxSeconds: 120,
        kidSummary: "Tell the story in three parts and say how the city and the country are different. Keep talking without long stops.",
        words: ["city", "country", "noisy", "quiet", "new", "old"],
        grammar: ["First / Then / In the end", "The city is ___. The country is ___."],
        rubric: [
          { label: "Three parts", description: "Tells First, Then and In the end in order.", weight: 3 },
          { label: "City and country", description: "Says how the city and the country are different, with 'is'.", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops; whole sentences, not single words.", weight: 3 },
          { label: "Little words", description: "The little word 'is' can be heard in 'The city is noisy.'", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["First, ___.", "Then, ___.", "In the end, ___."], tips: ["Point to your picture as you speak."] },
          { level: "Core", who: "Most children", frames: ["First, the country mouse ___.", "The country is ___. The city is ___.", "In the end, the mice ___."], tips: ["Say who and where in every part."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["I like the ___ because ___.", "I am a city mouse. / I am a country mouse."], tips: ["Say which mouse you are and why."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 3
    "od2e-l1-u14-l3": {
      objectives: ["I can ask 'Is your ___ ___?' and say 'His' or 'Her' about a friend, fast."],
      trim: { "Boy Bear and Girl Bear": 6, "Sing: Our Grandma (SB 141 D)": 5, "Write about the bears": 5, "Ask about your partner's home (SB 141 E)": 7 },
      add: [
        {
          after: "Ask about your partner's home (SB 141 E)",
          slide: {
            kind: "fluency",
            title: "Question chain: Is your ___ ___?",
            routine: "question chain",
            mode: "whole",
            minutes: 7,
            goal: "Ask, answer, then tell the circle with 'His' or 'Her'. Keep the chain going with no stops!",
            chunks: [
              "Is your street quiet?",
              "Yes, it is. My street is quiet.",
              "No, it isn't. My street is noisy.",
              "Is your house big?",
              "Her house is big. His street is quiet.",
            ],
            recycle: ["I live in a house.", "Is this {s1}'s bag? Yes, it is."],
            rounds: [
              { seconds: 60, say: "Slow chain round the circle. Ask the friend on your left, then say 'His ...' or 'Her ...' to the circle." },
              { seconds: 60, say: "Change the thing: house, street, home. Go faster!" },
              { seconds: 45, say: "Can the chain go all the way round before the bell?" },
            ],
            steps: [
              "Sit in a circle. Ask the friend on your left: 'Is your street quiet?'",
              "They answer 'Yes, it is.' or 'No, it isn't.' Then you tell the circle: 'His street is quiet.' or 'Her street is noisy.'",
              "Then they turn and ask the next friend.",
              "Teacher: after round 1, stop for one minute. Put two mistakes on the board (no names), such as 'Is you street quiet?' or 'His' for a girl, and fix them together; then go on.",
            ],
            prompts: ["Is your ___ ___?", "His / Her ___ is ___."],
            feedback: correctHisHer,
            teacherNote: "The chain makes every child ask AND answer many times in a few minutes, so 'Is your ...?' and 'His / Her' become automatic. The children have to choose his or her for a real friend, which is why this works better than a drill. Time the whole circle and tell them; children love beating their own time. Listen for 'Is you street' and 'She house'.",
            tiers: [
              { level: "Support", task: "Ask with the frame on the board and say 'His' or 'Her' with a friend.", frames: ["Is your ___ ___?", "His / Her ___ is ___."] },
              { level: "Core", task: "Ask and answer without looking at the board." },
              { level: "Stretch", task: "Add a second thing: 'Her street is quiet and her house is big.'" },
            ],
          },
        },
        {
          after: "Tell the class (SB 141 F)",
          slide: {
            kind: "writing",
            title: "Fix the bears' sentences",
            routine: "fix it",
            mode: "pairs",
            minutes: 5,
            steps: [
              "Read each sentence with your partner. Something is wrong!",
              "Find it: his or her, your, a capital letter, a full stop.",
              "Write the sentence the right way. Read it aloud together.",
            ],
            items: [
              { q: "Girl Bear has a bike. His bike is red.", answer: "Girl Bear has a bike. Her bike is red." },
              { q: "Boy Bear lives in the country. He house is old.", answer: "Boy Bear lives in the country. His house is old." },
              { q: "Is you street quiet?", answer: "Is your street quiet?" },
              { q: "the house her is big", answer: "Her house is big." },
            ],
            checklist: ["A boy: his. A girl: her.", "Asking a friend: your", "Owner word first, then the thing: her house"],
            sayIt: "Read your fixed sentences to the class in a bear voice.",
            teacherNote: "The sentences are the mistakes Vietnamese learners typically make (his and her mixed up, 'He house', 'you' for 'your', the owner word after the noun). Fix item 1 together first, pointing to the picture of the bear. Focus on these three types only; do not correct everything else on the page.",
            tiers: [
              { level: "Support", task: "Fix sentences 1 and 3 with the frames on the board." },
              { level: "Core", task: "Fix all four sentences." },
              { level: "Stretch", task: "Write one more bear sentence with a mistake for your partner to fix." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 4
    "od2e-l1-u14-l4": {
      objectives: ["I can talk about my neighborhood three times, faster each time."],
      trim: { "Shop or not? Run and sort": 4, "Neighborhood corners": 7 },
      add: [
        {
          after: "Neighborhood corners",
          slide: {
            kind: "fluency",
            title: "My neighborhood 3-2-1: three partners",
            routine: "4-3-2",
            mode: "pairs",
            minutes: 7,
            goal: "Give the same neighborhood talk to three friends. Each talk is shorter and smoother.",
            chunks: [
              "I live in a house in the city.",
              "There is a park in my neighborhood.",
              "There are two shops and a restaurant.",
              "My neighborhood is quiet.",
            ],
            recycle: ["I like my house.", "The city is noisy."],
            rounds: [
              { seconds: 60, say: "Partner 1: tell your neighborhood talk. The listener counts the places on their fingers." },
              { seconds: 45, say: "Partner 2: the same talk in less time." },
              { seconds: 30, say: "Partner 3: fast and smooth! The listener says 'Nice!' at the end." },
            ],
            steps: [
              "Stand in two lines facing each other. Line A talks first.",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'There have a park') and fix them together; then go on.",
              "When the bell rings, line B moves one step to the left: a new partner.",
              "Line B talks next with the same three rounds.",
            ],
            feedback: "Prompt, do not tell. For 'There have a park', point to the frame 'There is a ___' and pause, or hold up a finger and say 'There ...?'. For a missing -s in 'two shops', hold up two fingers and rise on the end of 'shop?'. For a sound, say it right and let them echo it. Say 'There is' and 'There are' with a clear difference yourself.",
            teacherNote: "Same talk, less time, new listener: the 4/3/2 activity scaled for six-year-olds. The new partner keeps the repetition real. Do not add new language between rounds; the gain comes from saying the same thing more fluently. The one-minute fix after round 1 is what also improves accuracy. Listen for 'There have' (Vietnamese 'có' becomes 'have') and the missing -s on plural places.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames.", frames: ["I live in a ___.", "There is a ___ in my neighborhood."] },
              { level: "Core", task: "Say three or four sentences without the board." },
              { level: "Stretch", task: "Add a describing sentence: 'The park is big and green. The street is noisy.'" },
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
            minutes: 5,
            steps: [
              "Read the two short sentences.",
              "Make ONE sentence with 'and'. Say it first, then write it.",
              "Read your sentence to your partner.",
            ],
            items: [
              { q: "There is a park. There is a shop. (and)", answer: "There is a park and a shop." },
              { q: "My street is quiet. My street is old. (and)", answer: "My street is quiet and old." },
              { q: "I like the park. I like the restaurant. (and)", answer: "I like the park and the restaurant." },
            ],
            checklist: ["Only one 'There is', 'My street is' or 'I like' in my sentence", "'and' joins the two things", "A full stop at the end"],
            sayIt: "Say your 'and' sentence to your partner without looking.",
            teacherNote: "Sentence combining is a well-studied way to grow children's writing: it teaches joining words through use, not rules. Model the first one aloud, crossing out the second 'There is'. This is exactly the skill the project sentences need.",
            tiers: [
              { level: "Support", task: "Do item 1 with the teacher, then item 2." },
              { level: "Core", task: "Do all three." },
              { level: "Stretch", task: "Join three: 'There is a park, a shop and a restaurant.'" },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "A walk down my street",
        prompt: "Walk down your street or show a drawing of it. Tell us what there is, how many, and what your neighborhood is like.",
        length: "30-60 seconds",
        steps: [
          "Draw your street or look around your neighborhood with a grown-up.",
          "Say your talk three times: each time a little faster, like in class.",
          "Record it once. Use 'There is' for one thing and 'There are' for more than one.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say where you live, what there is in your neighborhood, and how it is. Keep talking without long stops.",
        words: ["house", "street", "park", "shop", "restaurant", "quiet", "noisy"],
        grammar: ["There is a ___ in my neighborhood.", "My neighborhood is ___."],
        rubric: [
          { label: "What there is", description: "Names two or more places with 'There is' or 'There are'.", weight: 3 },
          { label: "My neighborhood", description: "Says how the neighborhood is, with 'is' (quiet, noisy, new, old).", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops in whole sentences.", weight: 3 },
          { label: "Clear endings", description: "The -s at the end of 'shops' and 'parks' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["I live in a ___.", "There is a ___."], tips: ["Point to each place on your drawing."] },
          { level: "Core", who: "Most children", frames: ["I live in a ___ in the ___.", "There is a ___ and a ___.", "My neighborhood is ___."], tips: ["Say two places and how it feels."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["There are two ___ and a ___.", "I like the ___ because ___."], tips: ["Say how many, and your favorite place."] },
        ],
      },
    },

    // ------------------------------------------------------------------ Lesson 5
    "od2e-l1-u14-l5": {
      objectives: ["I can tell my friends about my map twice, smoother the second time."],
      trim: { "Mime the place": 4, "Act out the story": 7, "Gallery walk (SB 145 D)": 6, "Draw my map (SB 145 B)": 13 },
      add: [
        {
          after: "Tell the class about my map (SB 145 C)",
          slide: {
            kind: "fluency",
            title: "Map talk: say it again, new partner",
            routine: "task repeat",
            mode: "pairs",
            minutes: 7,
            goal: "Tell your map talk to one friend, think for a minute, then tell it again to a new friend. Smoother!",
            chunks: [
              "I live in a house.",
              "My neighborhood is quiet.",
              "There is a park and a shop.",
              "His neighborhood is new.",
            ],
            recycle: ["Is your street quiet? Yes, it is.", "The city is noisy."],
            rounds: [
              { seconds: 60, say: "Tell your map to your first partner. Point to each place." },
              { seconds: 45, say: "Planning minute: look at the board and whisper your talk to yourself." },
              { seconds: 60, say: "New partner. Tell the same map again, smoother and with no long stops." },
            ],
            steps: [
              "Hold up your map. Tell your partner: 'I live in a ___. There is a ___.'",
              "Teacher: after round 1, stop for one minute. Put two mistakes you heard on the board (for example 'There is two shops') and fix them together; then go on.",
              "The listener has a job: ask one question, 'Is there a ___ on your map?'",
              "Change partners when you hear the bell and tell your map again.",
            ],
            feedback: correctMap,
            teacherNote: "Task repetition builds fluency; the planning minute in the middle lets children use the board mistakes they have just fixed, so the second telling is better in both speed and accuracy. The listener's one question gives the listener a real job. Listen for 'There is' with plural places and a missing -s.",
            tiers: [
              { level: "Support", task: "Say two sentences with the frames and point to your map.", frames: ["I live in a ___.", "There is a ___ on my map."] },
              { level: "Core", task: "Tell three or four sentences without the frames." },
              { level: "Stretch", task: "Add how the places are: 'The park is big. The shop is new.'" },
            ],
          },
        },
        {
          after: "Gallery walk (SB 145 D)",
          slide: {
            kind: "writing",
            title: "Write about my friend's map",
            routine: "model, then write",
            mode: "solo",
            minutes: 5,
            steps: [
              "Listen to the model. Find 'His' or 'Her' in it.",
              "Look at a friend's map. Write two sentences about it with the frames.",
              "Read them to your friend. Is it the right map?",
            ],
            text: { title: "A map I like", text: "This is Mai's map. Her neighborhood is quiet. There is a park and a shop on her map. I like her park." },
            frames: ["This is ___'s map.", "His / Her neighborhood is ___.", "There is a ___ on his / her map."],
            checklist: ["His for a boy, her for a girl", "'is' after the neighborhood", "A capital letter and a full stop in each sentence"],
            sayIt: "Show the map to the friend and say your sentences without reading.",
            teacherNote: "This brings Unit 13's 's together with this unit's His and Her: the model uses a name with 's (Mai, a girl) and then 'Her'. The writer has to choose his or her for a real friend, so every child makes the decision, not only copies the model. Praise any correct sentence, even a short one.",
            tiers: [
              { level: "Support", task: "Copy the first frame and fill in your friend's name." },
              { level: "Core", task: "Write two sentences about the map." },
              { level: "Stretch", task: "Write three sentences, with 'and' to join two places." },
            ],
          },
        },
      ],
    },

    // ------------------------------------------------------------------ Lesson 6
    "od2e-l1-u14-l6": {
      objectives: ["I can say 'His', 'Her' and 'Your' sentences fast, without looking."],
      trim: { "Run to the corner: whose is it?": 7, "Two bears, two homes": 10 },
      add: [
        {
          after: "Champion talk: 3 rounds",
          slide: {
            kind: "fluency",
            title: "Champion sprint: His, her, your",
            routine: "chunk sprint",
            mode: "whole",
            minutes: 6,
            goal: "Say every champion sentence fast and right: this unit's and last unit's.",
            chunks: [
              "His house is old.",
              "Her orchard is big.",
              "Is your street quiet? Yes, it is.",
              "There is a park in my neighborhood.",
            ],
            recycle: ["This is {s1}'s bag.", "I live in an apartment."],
            rounds: [
              { seconds: 45, say: "Together: the teacher flashes a picture of a boy or a girl with a thing, the class says the sentence." },
              { seconds: 45, say: "Half the class says the 'His ...' sentences and half says the 'Her ...' sentences as the teacher flashes boy and girl pictures. Then swap." },
              { seconds: 30, say: "Champion round: one child at a time, as fast as you can!" },
            ],
            steps: [
              "Watch the card. Say the whole sentence when it flips.",
              "If you hear a mistake, show a thumbs down and say it the right way.",
              "Teacher: finish with one minute: the two mistakes you heard most, fixed on the board.",
            ],
            feedback: correctGrammar,
            teacherNote: "A quick, high-energy recall of this unit and Unit 13 together: mixing old and new phrases (spaced retrieval) keeps last unit's grammar from fading. Say 'His' and 'Her' with a clear h at the start yourself; children often drop it.",
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
              { level: "Stretch", task: "Rebuild the text and write one more sentence about a third bear." },
            ],
          },
        },
      ],
      talk: {
        kind: "vlog",
        title: "Whose home is it?",
        prompt: "Show a photo or a drawing of two homes (your family's and a friend's, or two toy homes). Tell us whose it is: 'His home ...', 'Her home ...' and ask a question with 'your'.",
        length: "30-60 seconds",
        steps: [
          "Choose two homes: a photo, a drawing or two toys.",
          "Practise your sentences three times, a little faster each time.",
          "Record it once. Point to each home as you talk.",
          grownUp,
        ],
        maxSeconds: 90,
        kidSummary: "Say 'His' or 'Her' about two homes, ask a question with 'your', and keep talking without long stops.",
        words: ["house", "home", "street", "city", "country", "quiet", "big"],
        grammar: ["His / Her ___ is ___.", "Is your ___ ___? Yes, it is."],
        rubric: [
          { label: "His and her", description: "Uses 'his' for a boy and 'her' for a girl correctly.", weight: 3 },
          { label: "Question with your", description: "Asks 'Is your ___ ___?' correctly and answers 'Yes, it is.' or 'No, it isn't.'", weight: 2 },
          { label: "Keeps going", description: "Talks without long stops about both homes.", weight: 3 },
          { label: "Clear sounds", description: "The h in his and her and the final sounds in 'is' and 'isn't' can be heard.", weight: 1 },
        ],
        tiers: [
          { level: "Support", who: "Children who need the frames", frames: ["His home is ___.", "Her home is ___."], tips: ["Point to each home."] },
          { level: "Core", who: "Most children", frames: ["His house is ___ and her house is ___.", "Is your street quiet? Yes, it is."], tips: ["Ask the camera one question."] },
          { level: "Stretch", who: "Children who are ready for more", frames: ["His street is noisy but her street is quiet.", "Is your neighborhood quiet or noisy?"], tips: ["Compare the two homes and ask the viewer."] },
        ],
      },
    },
  },
};
